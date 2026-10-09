#!/bin/sh
# Install explicitly on EC2. Fixed demo paths; never run this on development.
set -eu
[ "$(id -u)" -eq 0 ] || exit 1
release_root=/opt/exploralab
certificate_source=/etc/letsencrypt/live/exploralab-ec2
certificate_target=/srv/exploralab/tls
python_binary="$release_root/.venv-deploy/bin/python"
env_file="$release_root/.env.ec2"

# Compose shell variables must not override the private file used by preflight.
unset APP_VERSION PUBLIC_ORIGIN BIND_ADDRESS HTTP_PORT HTTPS_PORT TLS_DIR
unset POSTGRES_DB POSTGRES_USER POSTGRES_PASSWORD GOOGLE_CLIENT_ID WEB_CONCURRENCY

compose() {
  docker compose --env-file "$env_file" -p exploralab-ec2 \
    -f "$release_root/compose.production.yml" "$@"
}

case "${1:-}" in
  pre)
    "$python_binary" -B "$release_root/infra/ec2_preflight.py" \
      --env-file "$env_file" --configuration-only
    compose stop frontend
    ;;
  deploy)
    # Certbot uses this name for this installation only, not another certificate.
    [ "${RENEWED_LINEAGE:-$certificate_source}" = "$certificate_source" ] || exit 1
    "$python_binary" -B "$release_root/infra/ec2_preflight.py" \
      --env-file "$env_file" --certificate-source "$certificate_source"
    install -d -o root -g root -m 700 "$certificate_target"
    # Do not overwrite an unrelated TLS installation. Both stable paths point
    # through one symlink so switching current publishes the complete pair.
    for filename in privkey.pem fullchain.pem; do
      target="$certificate_target/$filename"
      if [ -L "$target" ]; then
        [ "$(readlink "$target")" = "current/$filename" ] || exit 1
      else
        [ ! -e "$target" ] || exit 1
        ln -s "current/$filename" "$target"
      fi
    done
    bundle=$(mktemp -d "$certificate_target/bundle.XXXXXX")
    install -m 600 "$certificate_source/privkey.pem" "$bundle/privkey.pem"
    install -m 644 "$certificate_source/fullchain.pem" "$bundle/fullchain.pem"
    ln -s "${bundle##*/}" "$bundle/current.next"
    mv -Tf "$bundle/current.next" "$certificate_target/current"
    # Retain previous bundles for recovery; no broad deletion in a root hook.
    ;;
  post)
    # Executed also after failed renewal; the last published pair is retained.
    compose start frontend
    ;;
  *)
    printf '%s\n' 'Usage: ec2_certbot_hook.sh pre|deploy|post' >&2
    exit 2
    ;;
esac
