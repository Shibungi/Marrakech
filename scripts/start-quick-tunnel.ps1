param(
  [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$logsDir = Join-Path $repoRoot '.quick-tunnel'
$infoFile = Join-Path $logsDir 'session-info.txt'
$clientTunnelLog = Join-Path $logsDir 'client-tunnel.log'
$serverTunnelLog = Join-Path $logsDir 'server-tunnel.log'
$serverAppLog = Join-Path $logsDir 'server-app.log'
$clientAppLog = Join-Path $logsDir 'client-app.log'

function Write-Step {
  param([string]$Message)

  Write-Host ('==> ' + $Message)
}

function Get-CloudflaredPath {
  $command = Get-Command cloudflared -ErrorAction SilentlyContinue
  if ($command) {
    return $command.Source
  }

  $wingetPath = Join-Path $env:LOCALAPPDATA 'Microsoft\WinGet\Packages'
  if (Test-Path $wingetPath) {
    $candidate = Get-ChildItem $wingetPath -Recurse -Filter 'cloudflared*.exe' -ErrorAction SilentlyContinue |
      Select-Object -First 1 -ExpandProperty FullName
    if ($candidate) {
      return $candidate
    }
  }

  throw 'cloudflared.exe was not found. Run: winget install --id Cloudflare.cloudflared --accept-source-agreements --accept-package-agreements'
}

function Test-PortAvailable {
  param([int]$Port)

  $listeners = @(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
  if ($listeners.Count -eq 0) {
    return
  }

  $details = foreach ($listener in $listeners) {
    $process = Get-Process -Id $listener.OwningProcess -ErrorAction SilentlyContinue
    if ($process) {
      'Port {0} is used by PID {1} ({2})' -f $Port, $listener.OwningProcess, $process.ProcessName
    } else {
      'Port {0} is used by PID {1}' -f $Port, $listener.OwningProcess
    }
  }

  throw ('Required ports are already in use:' + [Environment]::NewLine + ($details -join [Environment]::NewLine))
}

function Remove-OldLogs {
  foreach ($path in @($infoFile, $clientTunnelLog, $serverTunnelLog, $serverAppLog, $clientAppLog)) {
    if (Test-Path $path) {
      Remove-Item $path -Force
    }
  }
}

function Clear-LogFile {
  param([string]$Path)

  if (-not (Test-Path $Path)) {
    return
  }

  for ($attempt = 0; $attempt -lt 5; $attempt++) {
    try {
      Remove-Item $Path -Force -ErrorAction Stop
      return
    } catch {
      Start-Sleep -Milliseconds 300
    }
  }

  throw ('Failed to clear log file: {0}' -f $Path)
}

function Start-LoggedWindow {
  param(
    [string]$Title,
    [string]$Command,
    [string]$LogPath
  )

  $escapedRepoRoot = $repoRoot.Replace("'", "''")
  $escapedLogPath = $LogPath.Replace("'", "''")
  $shellCommand = @(
    ('Set-Location ''{0}''' -f $escapedRepoRoot),
    '& {',
    $Command,
    ('}} *>&1 | Tee-Object -FilePath ''{0}'' -Append' -f $escapedLogPath)
  ) -join [Environment]::NewLine

  if ($DryRun) {
    Write-Host ('[dry-run] window: ' + $Title)
    Write-Host ('[dry-run] command:' + [Environment]::NewLine + $shellCommand)
    return $null
  }

  return Start-Process -FilePath 'powershell.exe' -ArgumentList @(
    '-NoExit',
    '-ExecutionPolicy',
    'Bypass',
    '-Command',
    $shellCommand
  ) -WorkingDirectory $repoRoot -WindowStyle Normal -PassThru
}

function Wait-ForTunnelUrl {
  param(
    [string]$Name,
    [string]$LogPath
  )

  if ($DryRun) {
    return ('https://{0}.example.invalid' -f $Name)
  }

  for ($attempt = 0; $attempt -lt 60; $attempt++) {
    if (Test-Path $LogPath) {
      $match = Select-String -Path $LogPath -Pattern 'https://[a-z0-9-]+\.trycloudflare\.com' -AllMatches -ErrorAction SilentlyContinue |
        ForEach-Object { $_.Matches } |
        Select-Object -First 1 -ExpandProperty Value
      if ($match) {
        return $match
      }
    }

    Start-Sleep -Seconds 1
  }

  throw ('Failed to capture Quick Tunnel URL for {0}. Check log: {1}' -f $Name, $LogPath)
}

function Test-HostnameResolvable {
  param([string]$Url)

  if ($DryRun) {
    return $true
  }

  $hostName = ([Uri]$Url).Host
  try {
    $null = Resolve-DnsName $hostName -ErrorAction Stop
    return $true
  } catch {
    return $false
  }
}

function Start-TunnelWithRetry {
  param(
    [string]$Name,
    [string]$Title,
    [string]$Command,
    [string]$LogPath
  )

  for ($attempt = 1; $attempt -le 3; $attempt++) {
    Clear-LogFile -Path $LogPath

    $process = Start-LoggedWindow -Title $Title -Command $Command -LogPath $LogPath
    $url = Wait-ForTunnelUrl -Name $Name -LogPath $LogPath

    if (Test-HostnameResolvable $url) {
      return @{
        Process = $process
        Url = $url
      }
    }

    Write-Host ('[{0}] Hostname did not resolve via the local DNS server. Retrying with a new tunnel...' -f $Name)
    if ($process) {
      Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
      Wait-Process -Id $process.Id -ErrorAction SilentlyContinue
    }
  }

  throw ('Failed to get a locally resolvable Quick Tunnel URL for {0} after 3 attempts.' -f $Name)
}

Write-Step 'Checking prerequisites'
New-Item -ItemType Directory -Path $logsDir -Force | Out-Null
$cloudflaredPath = Get-CloudflaredPath
Test-PortAvailable -Port 5173
Test-PortAvailable -Port 8000
Remove-OldLogs

Write-Step 'Starting Quick Tunnels'
$escapedCloudflaredPath = $cloudflaredPath.Replace("'", "''")
$clientTunnelCommand = '& ''{0}'' tunnel --url http://localhost:5173' -f $escapedCloudflaredPath
$serverTunnelCommand = '& ''{0}'' tunnel --url http://localhost:8000' -f $escapedCloudflaredPath
$clientTunnel = Start-TunnelWithRetry -Name 'client' -Title 'Marrakech Client Tunnel' -Command $clientTunnelCommand -LogPath $clientTunnelLog
$serverTunnel = Start-TunnelWithRetry -Name 'server' -Title 'Marrakech Server Tunnel' -Command $serverTunnelCommand -LogPath $serverTunnelLog

$clientTunnelUrl = $clientTunnel.Url
$serverTunnelUrl = $serverTunnel.Url

Write-Step 'Starting app windows'
$serverCommand = @(
  ('$env:ALLOWED_ORIGINS = ''{0}''' -f $clientTunnelUrl),
  ('$env:ALLOWED_API_ORIGINS = ''{0}''' -f $clientTunnelUrl),
  ('$env:PUBLIC_GAME_SERVER_ORIGIN = ''{0}''' -f $serverTunnelUrl),
  'npm run dev:server'
) -join [Environment]::NewLine
$clientCommand = @(
  ('$env:VITE_PUBLIC_APP_ORIGIN = ''{0}''' -f $clientTunnelUrl),
  ('$env:VITE_GAME_SERVER = ''{0}''' -f $serverTunnelUrl),
  'npm run dev:client'
) -join [Environment]::NewLine

$null = Start-LoggedWindow -Title 'Marrakech Game Server' -Command $serverCommand -LogPath $serverAppLog
$null = Start-LoggedWindow -Title 'Marrakech Client App' -Command $clientCommand -LogPath $clientAppLog

$summary = @(
  ('Client URL: {0}' -f $clientTunnelUrl),
  ('Game Server URL: {0}' -f $serverTunnelUrl),
  '',
  'Logs:',
  ('- {0}' -f $clientTunnelLog),
  ('- {0}' -f $serverTunnelLog),
  ('- {0}' -f $serverAppLog),
  ('- {0}' -f $clientAppLog)
) -join [Environment]::NewLine

Set-Content -Path $infoFile -Value $summary -Encoding ASCII

Write-Host ''
Write-Host $summary
Write-Host ''
Write-Host ('Friend-facing URL: {0}' -f $clientTunnelUrl)
Write-Host 'Open windows to stop later: tunnels x2, app x2'

if (-not $DryRun) {
  Start-Process $clientTunnelUrl | Out-Null
}