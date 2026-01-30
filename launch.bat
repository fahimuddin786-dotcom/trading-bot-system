@echo off
TITLE Trading Bot System Launcher
echo ============================================================
echo 🚀 TRADING BOT SYSTEM - WINDOWS LAUNCHER
echo ============================================================
echo.

:: Check for node_modules
if not exist "backend\node_modules" (
    echo 📦 Installing Backend Dependencies...
    cd backend && npm install && cd ..
)

if not exist "frontend\node_modules" (
    echo 📦 Installing Frontend Dependencies...
    cd frontend && npm install && cd ..
)

echo 🟢 Starting Backend Server (Port 8080)...
cd backend
start "Trading Bot Backend" cmd /c "node server.js"
cd ..

echo ⏳ Waiting for backend to warm up...
timeout /t 5 /nobreak > nul

echo 🔵 Starting Frontend Dashboard (Port 3000)...
cd frontend
start "Trading Bot Frontend" cmd /c "npm start"
cd ..

echo ⏳ Finalizing launch...
timeout /t 10 /nobreak > nul

echo 🌐 Opening Admin Dashboard in your browser...
start http://localhost:3000/admin

echo.
echo ============================================================
echo ✅ SYSTEM LAUNCHED SUCCESSFULLY!
echo ------------------------------------------------------------
echo 🖥️  Admin: http://localhost:3000/admin
echo 👤 User:  http://localhost:3000
echo 📡 API:   http://localhost:8080/health
echo ============================================================
echo.
pause
