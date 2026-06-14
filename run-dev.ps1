# Aurora Health Companion - Windows PowerShell Launcher
$ErrorActionPreference = "Stop"

Write-Host "=========================================" -ForegroundColor Blue
Write-Host "     Aurora Health Companion Launcher     " -ForegroundColor Blue
Write-Host "=========================================" -ForegroundColor Blue

# Load environment variables from .env if it exists
if (Test-Path .env) {
    Write-Host "Loading environment variables from .env..." -ForegroundColor Green
    Get-Content .env | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#")) {
            if ($line -match '^\s*([^=]+)\s*=\s*(.*)$') {
                $name = $Matches[1].Trim()
                $value = $Matches[2].Trim()
                # Remove surrounding quotes if present
                if ($value -match '^"(.*)"$') { $value = $Matches[1] }
                elseif ($value -match "^'(.*)'$") { $value = $Matches[1] }
                Set-Item -Path "Env:\$name" -Value $value
            }
        }
    }
} else {
    Write-Host "Tip: Create a .env file in the root directory and set GEMINI_API_KEY or OPENAI_API_KEY to connect the AI chat companion!" -ForegroundColor Yellow
}

# 1. Start database container
Write-Host "Starting PostgreSQL database container..." -ForegroundColor Green
docker compose up -d db

# Wait for DB to be ready
Write-Host "Waiting for database to initialize..." -ForegroundColor Green
Start-Sleep -Seconds 3

# 2. Push database schema
Write-Host "Initializing database schema..." -ForegroundColor Green
Get-Content schema.sql | docker exec -i aurora-db psql -U postgres -d health_companion

# 3. Set default environment variables if not already set
if (-not $env:PORT) { $env:PORT = "8080" }
if (-not $env:DATABASE_URL) { $env:DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/health_companion" }
if (-not $env:BYPASS_CLERK) { $env:BYPASS_CLERK = "true" }

# 4. Start backend and frontend concurrently
Write-Host "Starting API Server (Port 8080) and Frontend (Port 8082)..." -ForegroundColor Green
Write-Host "Keep this window open. Press Ctrl+C to stop both servers." -ForegroundColor Yellow

# Start backend server as a background process
$apiProcess = Start-Process node -ArgumentList "artifacts/api-server/dist/index.mjs" -NoNewWindow -PassThru

# Run frontend server in the foreground
try {
    # Store dynamic port for frontend serve config
    $env:PORT="8082"
    npm run serve --prefix artifacts/aurora
} finally {
    Write-Host "`nStopping background API server..." -ForegroundColor Yellow
    if ($apiProcess) {
        Stop-Process -Id $apiProcess.Id -Force -ErrorAction SilentlyContinue
    }
    Write-Host "Done! Goodbye." -ForegroundColor Green
}
