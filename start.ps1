$ErrorActionPreference = "Stop"
Write-Host "Starting Backend..."
Start-Process node -ArgumentList "backend/server.js" -NoNewWindow
Write-Host "Starting Frontend..."
cd frontend
npm start
