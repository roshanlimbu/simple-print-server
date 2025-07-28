# Windows 7 Setup and Testing Guide

## Prerequisites for Windows 7

1. **Node.js 12.22.3**

   - Download from: https://nodejs.org/download/release/v12.22.3/
   - Choose: `node-v12.22.3-x64.msi` (for 64-bit) or `node-v12.22.3-x86.msi` (for 32-bit)
   - This is the last Node.js version that officially supports Windows 7

2. **PowerShell 3.0 or higher** (usually pre-installed on Windows 7 SP1)

## Installation Steps

1. **Copy project files to Windows 7 machine**

   ```cmd
   # Create project directory
   mkdir C:\simpleserver
   cd C:\simpleserver
   ```

2. **Install dependencies**

   ```cmd
   npm install
   ```

3. **Create environment file** (optional)
   Create `.env` file in project root:
   ```env
   PORT=8000
   PRINTER_NAME=your_windows_printer_name
   ORG_NAME=Your Organization
   PAGE_WIDTH=32
   PRINT_METHOD=auto
   ```

## Running the Server

```cmd
# Start the server
npm start

# Or directly with node
node server.js
```

## Testing with Command Prompt (Windows 7)

Since Windows 7 doesn't have curl by default, use these alternatives:

### Option 1: Using PowerShell (Recommended)

**Test 1: Get Available Printers**

```powershell
$response = Invoke-WebRequest -Uri "http://localhost:8000/printers" -Method GET
$response.Content
```

**Test 2: Print Test Data**

```powershell
$body = @{
    data = @(
        @(1, "Test Item 1", 5),
        @(2, "Test Item 2", 3),
        @(3, "Sample Product", 10)
    )
} | ConvertTo-Json -Depth 3

$response = Invoke-WebRequest -Uri "http://localhost:8000/print" -Method POST -Body $body -ContentType "application/json"
$response.Content
```

### Option 2: Using Windows Script (VBScript)

Create `test_api.vbs`:

```vbscript
' Test GET request
Set xmlHttp = CreateObject("MSXML2.XMLHTTP")
xmlHttp.Open "GET", "http://localhost:8000/printers", False
xmlHttp.Send
WScript.Echo "Printers Response: " & xmlHttp.ResponseText

' Test POST request
Set xmlHttpPost = CreateObject("MSXML2.XMLHTTP")
xmlHttpPost.Open "POST", "http://localhost:8000/print", False
xmlHttpPost.setRequestHeader "Content-Type", "application/json"
testData = "{""data"": [[1, ""Test Item"", 5], [2, ""Another Item"", 3]]}"
xmlHttpPost.Send testData
WScript.Echo "Print Response: " & xmlHttpPost.ResponseText
```

Run with: `cscript test_api.vbs`

### Option 3: Download curl for Windows 7

1. Download curl from: https://curl.se/windows/
2. Extract to a folder (e.g., `C:\curl\`)
3. Add to PATH or use full path

Then use the curl commands:

```cmd
# Test printers endpoint
curl -X GET http://localhost:8000/printers

# Test print endpoint
curl -X POST http://localhost:8000/print -H "Content-Type: application/json" -d "{\"data\": [[1, \"Test Item\", 5], [2, \"Another Item\", 3]]}"
```

## Windows 7 Specific Printer Testing

### Check Available Printers

```cmd
# List printers via command line
wmic printer list brief

# Or via PowerShell
Get-WmiObject -Class Win32_Printer | Select-Object Name, Default
```

### Print Method Configuration

For Windows 7, set in `.env`:

```env
PRINT_METHOD=windows
```

This ensures the app uses Windows-specific printing commands.

## Troubleshooting

### Common Issues:

1. **PowerShell Execution Policy**

   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

2. **Node.js PATH Issues**

   - Restart Command Prompt after Node.js installation
   - Verify with: `node --version`

3. **Printer Access Issues**

   - Run Command Prompt as Administrator
   - Ensure printer is installed and accessible

4. **Network Testing**

   ```cmd
   # Test if server is running
   netstat -an | findstr :8000

   # Test basic connectivity
   telnet localhost 8000
   ```

## Sample Test Output

**Successful Printer List Response:**

```json
{
  "success": true,
  "printers": ["Microsoft XPS Document Writer", "Your Printer Name"],
  "count": 2
}
```

**Successful Print Response:**

```json
{
  "success": true,
  "jobId": "win_job_1640995200000",
  "message": "Printed to Your Printer Name"
}
```
