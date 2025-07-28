@echo off
echo Testing Simple Server API...
echo.

REM Check if server is running
echo Checking if server is running on port 8000...
netstat -an | findstr :8000 >nul 2>&1
if errorlevel 1 (
    echo ERROR: Server is not running on port 8000
    echo Please start the server first with: start_server.bat
    pause
    exit /b 1
)

echo Server is running. Testing endpoints...
echo.

REM Test with PowerShell if available
powershell -Command "& {if (Get-Command Invoke-WebRequest -ErrorAction SilentlyContinue) {echo 'Testing with PowerShell...'; $response = try {Invoke-WebRequest -Uri 'http://localhost:8000/printers' -Method GET -UseBasicParsing} catch {$_.Exception.Response}; if ($response.StatusCode -eq 200) {echo 'GET /printers: SUCCESS'; echo $response.Content} else {echo 'GET /printers: FAILED'}} else {echo 'PowerShell Invoke-WebRequest not available'}}"

echo.
echo For full testing, see WINDOWS_7_SETUP.md
echo.
pause
