# PowerShell API Test Script for Simple Print Server
# Compatible with PowerShell 3.0+ (Windows 7 and above)

param(
    [string]$ServerUrl = "http://localhost:8000",
    [switch]$SkipConnectionTest,
    [switch]$TestOnly
)

# Set UTF-8 encoding for proper Nepali text handling
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "=== Simple Print Server API Test ===" -ForegroundColor Cyan
Write-Host "Server URL: $ServerUrl" -ForegroundColor Green
Write-Host ""

# Function to test if server is running
function Test-ServerConnection {
    Write-Host "Testing server connection..." -ForegroundColor Yellow
    try {
        $response = Invoke-WebRequest -Uri "$ServerUrl/printers" -Method GET -UseBasicParsing -TimeoutSec 5
        if ($response.StatusCode -eq 200) {
            Write-Host "✓ Server is running and accessible" -ForegroundColor Green
            return $true
        }
    }
    catch {
        Write-Host "✗ Server connection failed: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "  Make sure the server is running with: start_server.bat" -ForegroundColor Yellow
        return $false
    }
    return $false
}

# Function to get available printers
function Get-AvailablePrinters {
    Write-Host "Getting available printers..." -ForegroundColor Yellow
    try {
        $response = Invoke-WebRequest -Uri "$ServerUrl/printers" -Method GET -UseBasicParsing
        $data = $response.Content | ConvertFrom-Json
        
        Write-Host "✓ Found $($data.count) printer(s):" -ForegroundColor Green
        foreach ($printer in $data.printers) {
            Write-Host "  - $printer" -ForegroundColor White
        }
        Write-Host ""
        return $data.printers
    }
    catch {
        Write-Host "✗ Failed to get printers: $($_.Exception.Message)" -ForegroundColor Red
        return @()
    }
}

# Function to test print API
function Test-PrintAPI {
    param([array]$TestData, [string]$TestName)
    
    Write-Host "Testing print API: $TestName" -ForegroundColor Yellow
    
    # Prepare JSON payload
    $payload = @{
        data = $TestData
    } | ConvertTo-Json -Depth 3
    
    try {
        $response = Invoke-WebRequest -Uri "$ServerUrl/print" -Method POST -Body $payload -ContentType "application/json" -UseBasicParsing
        $result = $response.Content | ConvertFrom-Json
        
        Write-Host "✓ Print request successful!" -ForegroundColor Green
        Write-Host "  Job ID: $($result.jobId)" -ForegroundColor White
        Write-Host "  Message: $($result.message)" -ForegroundColor White
        Write-Host ""
        return $true
    }
    catch {
        Write-Host "✗ Print request failed: $($_.Exception.Message)" -ForegroundColor Red
        if ($_.Exception.Response) {
            $errorContent = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($errorContent)
            $errorText = $reader.ReadToEnd()
            Write-Host "  Error details: $errorText" -ForegroundColor Red
        }
        Write-Host ""
        return $false
    }
}

# Main execution
if (-not $SkipConnectionTest) {
    if (-not (Test-ServerConnection)) {
        Write-Host "Exiting due to connection failure." -ForegroundColor Red
        exit 1
    }
    Write-Host ""
}

# Get available printers
$printers = Get-AvailablePrinters

if ($TestOnly) {
    Write-Host "Test mode - skipping actual print tests" -ForegroundColor Yellow
    exit 0
}

# Test 1: Basic English items
Write-Host "=== Test 1: Basic English Items ===" -ForegroundColor Cyan
$testData1 = @(
    @(1, "Coffee", 2),
    @(2, "Tea", 1),
    @(3, "Biscuits", 10),
    @(4, "Sugar", 5)
)
Test-PrintAPI -TestData $testData1 -TestName "Basic English Items"

# Test 2: Mixed English and Nepali items
Write-Host "=== Test 2: Mixed English and Nepali Items ===" -ForegroundColor Cyan
$testData2 = @(
    @(1, "Test Item 1", 5),
    @(2, "Test Item 2", 3),
    @(3, "Sample Product", 10),
    @(4, "चिया पत्ती", 2),
    @(5, "दूध पाउडर", 1)
)
Test-PrintAPI -TestData $testData2 -TestName "Mixed English and Nepali"

# Test 3: All Nepali items
Write-Host "=== Test 3: Nepali Items Only ===" -ForegroundColor Cyan
$testData3 = @(
    @(1, "चिया", 3),
    @(2, "कफी", 2),
    @(3, "दूध", 1),
    @(4, "चिनी", 4),
    @(5, "बिस्कुट", 8)
)
Test-PrintAPI -TestData $testData3 -TestName "Nepali Items Only"

# Test 4: Long item names (testing truncation)
Write-Host "=== Test 4: Long Item Names ===" -ForegroundColor Cyan
$testData4 = @(
    @(1, "This is a very long item name that should be truncated properly", 1),
    @(2, "यो एक धेरै लामो नेपाली वस्तुको नाम हो जुन काटिनुपर्छ", 2),
    @(3, "Short", 99)
)
Test-PrintAPI -TestData $testData4 -TestName "Long Item Names"

# Test 5: Error test (empty data)
Write-Host "=== Test 5: Error Test (Empty Data) ===" -ForegroundColor Cyan
Write-Host "Testing error handling with empty data..." -ForegroundColor Yellow
try {
    $emptyPayload = @{ data = @() } | ConvertTo-Json
    $response = Invoke-WebRequest -Uri "$ServerUrl/print" -Method POST -Body $emptyPayload -ContentType "application/json" -UseBasicParsing
    Write-Host "✗ Expected error but got success response" -ForegroundColor Red
}
catch {
    Write-Host "✓ Correctly handled empty data error" -ForegroundColor Green
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "=== API Testing Complete ===" -ForegroundColor Cyan
Write-Host "Check your printer or print output files for results." -ForegroundColor Yellow

# Pause if running interactively
if ($Host.Name -eq "ConsoleHost") {
    Write-Host ""
    Write-Host "Press any key to exit..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}
