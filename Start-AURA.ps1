$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
Write-Host 'Open http://localhost:4173 in Chrome or Edge. Keep this window open.'
node ./serve.mjs
