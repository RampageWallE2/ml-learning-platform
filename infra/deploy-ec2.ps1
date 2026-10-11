# Windows entry point. No AWS resource creation, credentials in arguments or local DB uploads.
[CmdletBinding(SupportsShouldProcess)]
param(
    [Parameter(Mandatory)][ValidatePattern('^\d{1,3}(\.\d{1,3}){3}$')][string]$InstanceIp,
    [Parameter(Mandatory)][string]$KeyPath,
    [Parameter(Mandatory)][ValidatePattern('^[0-9a-f]{40}$')][string]$ReleaseCommit,
    [Parameter(Mandatory)][ValidatePattern('^ghcr\.io/rampagewalle2/ml-learning-platform-api@sha256:[0-9a-f]{64}$')][string]$ApiImage,
    [Parameter(Mandatory)][ValidatePattern('^ghcr\.io/rampagewalle2/ml-learning-platform-web@sha256:[0-9a-f]{64}$')][string]$WebImage,
    [ValidatePattern('^[A-Za-z0-9][A-Za-z0-9-]{0,38}$')][string]$GhcrUsername,
    [switch]$HttpDemo
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Invoke-Checked {
    param([string]$Program, [string[]]$Arguments)
    & $Program @Arguments
    if ($LASTEXITCODE -ne 0) { throw "$Program failed (exit $LASTEXITCODE); deployment stopped." }
}

function Quote-Remote {
    param([string]$Value)
    # Values containing a single quote are rejected, never interpolated into a remote shell.
    if ($Value.Contains("'")) { throw 'Unsupported quote in a remote argument.' }
    return "'$Value'"
}

if (-not $HttpDemo) { throw 'Use -HttpDemo explicitly. This installer does not configure HTTPS.' }
$address = [System.Net.IPAddress]::Parse($InstanceIp)
if ($address.AddressFamily -ne [System.Net.Sockets.AddressFamily]::InterNetwork) { throw 'IPv4 required.' }
foreach ($program in @('git', 'ssh', 'scp')) { Get-Command $program -ErrorAction Stop | Out-Null }
$key = (Resolve-Path -LiteralPath $KeyPath).Path
if (-not (Test-Path -LiteralPath $key -PathType Leaf)) { throw 'SSH key not found.' }
$repository = Split-Path -Parent $PSScriptRoot
$bootstrap = Join-Path $PSScriptRoot 'ec2_bootstrap.py'
$bundleFiles = @('compose.production.yml', 'compose.ec2-http-test.yml', 'compose.ghcr.yml',
    'infra/nginx.ec2-http-test.conf.template', 'infra/ec2_preflight.py')
Invoke-Checked 'git' @('-C', $repository, 'cat-file', '-e', "$ReleaseCommit`^{commit}")
if (-not $PSCmdlet.ShouldProcess("ubuntu@$InstanceIp", 'Install Docker and deploy pinned GHCR images as an HTTP demo')) { return }

$localDirectory = Join-Path $repository ('infra/.local/ec2-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $localDirectory -Force | Out-Null
$bundle = Join-Path $localDirectory 'release.tar'
Invoke-Checked 'git' (@('-C', $repository, 'archive', '--format=tar', "--output=$bundle", $ReleaseCommit, '--') + $bundleFiles)
$bundleHash = (Get-FileHash -LiteralPath $bundle -Algorithm SHA256).Hash.ToLowerInvariant()
$bootstrapHash = (Get-FileHash -LiteralPath $bootstrap -Algorithm SHA256).Hash.ToLowerInvariant()
$knownHosts = Join-Path $repository 'infra/.local/ec2-known-hosts'
$sshOptions = @('-i', $key, '-o', 'IdentitiesOnly=yes', '-o', 'ConnectTimeout=10',
    '-o', 'StrictHostKeyChecking=accept-new', '-o', "UserKnownHostsFile=$knownHosts")
$target = "ubuntu@$InstanceIp"
Write-Host '1/3: Sending only pinned deployment files; no local passwords or database.'
$stageOutput = @(Invoke-Checked 'ssh' ($sshOptions + @('-o', 'BatchMode=yes', $target,
    'mktemp -d /tmp/exploralab-upload.XXXXXXXXXX')))
$remoteDirectory = ($stageOutput -join "`n").Trim()
if ($remoteDirectory -notmatch '^/tmp/exploralab-upload\.[A-Za-z0-9]{10}$') { throw 'Unexpected staging directory.' }
Invoke-Checked 'scp' ($sshOptions + @($bundle, "${target}:$remoteDirectory/release.tar"))
Invoke-Checked 'scp' ($sshOptions + @($bootstrap, "${target}:$remoteDirectory/bootstrap.py"))

Write-Host '2/3: Verifying transfer integrity before running the installer.'
$checksums = @(Invoke-Checked 'ssh' ($sshOptions + @('-o', 'BatchMode=yes', $target,
    "sha256sum $remoteDirectory/release.tar $remoteDirectory/bootstrap.py")))
if ($checksums.Count -ne 2 -or $checksums[0] -notmatch "^$bundleHash\s" -or $checksums[1] -notmatch "^$bootstrapHash\s") {
    throw 'Remote checksum mismatch; installer was not run.'
}
$remoteArguments = @('sudo', '-n', 'python3', '-B', "$remoteDirectory/bootstrap.py",
    '--bundle', "$remoteDirectory/release.tar", '--bundle-sha256', $bundleHash,
    '--commit', $ReleaseCommit, '--api-image', $ApiImage, '--web-image', $WebImage,
    '--origin', "http://$InstanceIp", '--http-demo')
if ($GhcrUsername) { $remoteArguments += @('--ghcr-user', $GhcrUsername) }
$remoteCommand = ($remoteArguments | ForEach-Object { Quote-Remote $_ }) -join ' '
Write-Host '3/3: Installing and starting services. A private GHCR token is entered only in the hidden remote prompt.'
Invoke-Checked 'ssh' ($sshOptions + @('-t', '-o', 'BatchMode=yes', $target, $remoteCommand))

Write-Host 'Checking HTTP access from this computer...'
try {
    $result = Invoke-RestMethod -Uri "http://$InstanceIp/api/v1/ready" -TimeoutSec 15
    if ($result.version -ne "ec2-$ReleaseCommit") { throw 'Unexpected remote version.' }
    Write-Host "Demo available: http://$InstanceIp"
} catch {
    Write-Warning 'Server installation finished, but external HTTP/version validation failed. Check TCP 80 in the Security Group and proxy/network settings.'
    throw
}
