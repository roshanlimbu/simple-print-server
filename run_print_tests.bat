@echo off
echo Running PowerShell API Test...
echo.

REM Check if PowerShell is available
powershell -Command "Write-Host 'PowerShell is available'" >nul 2>&1
if errorlevel 1 (
    echo ERROR: PowerShell is not available
    echo Please use test_page.html or VBScript alternatives
    pause
    exit /b 1
)

REM Check if server is running
echo Checking if server is running...
netstat -an | findstr :8000 >nul 2>&1
if errorlevel 1 (
    echo ERROR: Server is not running on port 8000
    echo Please start the server first with: start_server.bat
    pause
    exit /b 1
)

echo Server detected. Running API tests...
echo.

REM Run the PowerShell test script
powershell -ExecutionPolicy Bypass -File "test_print_api.ps1"

if errorlevel 1 (
    echo.
    echo Some tests may have failed. Check the output above.
) else (
    echo.
    echo All tests completed successfully!
)

echo.
pause
