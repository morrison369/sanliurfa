param(
  [string]$EnvFile = ".env.local"
)

$ErrorActionPreference = 'Stop'
$workspace = Resolve-Path (Join-Path $PSScriptRoot '..')
$envPath = Join-Path $workspace $EnvFile

if (-not (Test-Path $envPath)) {
  throw "Env file not found: $envPath"
}

function Read-EnvValue {
  param(
    [string]$Path,
    [string]$Name
  )

  $line = Get-Content -LiteralPath $Path |
    Where-Object { $_ -match "^\s*$([regex]::Escape($Name))=" } |
    Select-Object -First 1

  if (-not $line) {
    return $null
  }

  $value = $line.Split('=', 2)[1].Trim()
  if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
    return $value.Substring(1, $value.Length - 2)
  }

  return $value
}

$redisUrl = Read-EnvValue -Path $envPath -Name 'REDIS_URL'
$keyPrefix = Read-EnvValue -Path $envPath -Name 'REDIS_KEY_PREFIX'

if (-not $redisUrl) {
  throw 'REDIS_URL is missing in .env.local'
}

if (-not $keyPrefix) {
  $keyPrefix = 'sanliurfa:'
}

Push-Location $workspace
try {
  $nodeScript = @'
import { createClient } from 'redis';

const redisUrl = process.env.REDIS_URL;
const keyPrefix = process.env.REDIS_KEY_PREFIX || 'sanliurfa:';
if (!redisUrl) {
  throw new Error('REDIS_URL missing');
}

const client = createClient({
  url: redisUrl,
  socket: {
    connectTimeout: 1500,
    reconnectStrategy: false,
  },
});

client.on('error', () => {});

const timeout = (label) =>
  new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`${label} timeout`)), 5000),
  );

await Promise.race([client.connect(), timeout('connect')]);
const pong = await Promise.race([client.ping(), timeout('ping')]);
const key = `${keyPrefix}health:redis-check`;
await client.setEx(key, 10, 'ok');
const value = await client.get(key);
await client.del(key);
await client.quit();

console.log(JSON.stringify({
  status: 'up',
  pong,
  keyPrefix,
  writeRead: value === 'ok',
}));
'@

  $env:REDIS_URL = $redisUrl
  $env:REDIS_KEY_PREFIX = $keyPrefix
  $nodeScript | node --input-type=module
} finally {
  Pop-Location
}
