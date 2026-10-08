/** Returns the path inside the configured API, excluding query and fragment. */
export function getApiRequestPath(
  url: string,
  apiBaseUrl: string,
  baseUri: string,
): string | null {
  try {
    const api = new URL(apiBaseUrl, baseUri);
    const target = new URL(url, baseUri);
    const root = api.pathname.replace(/\/+$/, '');

    if (
      (api.protocol !== 'http:' && api.protocol !== 'https:') ||
      api.username || api.password || target.username || target.password ||
      target.origin !== api.origin ||
      (target.pathname !== root && !target.pathname.startsWith(`${root}/`))
    ) {
      return null;
    }

    return target.pathname.slice(root.length) || '/';
  } catch {
    return null;
  }
}
