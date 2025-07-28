@echo off
echo Starting Simple Server...
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js 12.22.3 from https://nodejs.org/
    pause
    exit /b 1
)

echo Node.js version:
node --version
echo.

REM Check if dependencies are installed
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
    if errorlevel 1 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
    echo.
)

echo Starting server on port 3000...
echo Press Ctrl+C to stop the server
echo.
echo Test the API with:
echo   - GET  http://localhost:3000/printers
echo   - POST http://localhost:3000/print
echo   - Health: http://localhost:3000/health
echo   - Open test_page.html in browser
echo.

node server.js
