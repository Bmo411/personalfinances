$ErrorActionPreference = 'Stop'
$key = [Environment]::GetEnvironmentVariable('LIFE_GUIDE_API_KEY', 'User')
if (-not $key) { throw 'Configura LIFE_GUIDE_API_KEY en el entorno de usuario.' }
@{ Authorization = ('Bearer ' + $key) } | ConvertTo-Json -Compress
