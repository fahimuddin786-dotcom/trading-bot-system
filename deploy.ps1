Write-Host "--- SYSTEM BUILD & RUN START ---"
$root = "d:\trading-bot-system"

Write-Host "Step 1: Backend Setup"
cd "$root\backend"
npm install --no-audit

Write-Host "Step 2: Frontend Setup"
cd "$root\frontend"
npm install --no-audit

Write-Host "Step 3: Frontend Build"
npm run build

Write-Host "Step 4: Launching Server"
cd "$root\backend"
node server.js
