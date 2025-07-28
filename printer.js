const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const iconv = require('iconv-lite');

class CustomPrinter {
  constructor(options = {}) {
    this.defaultPrinter = options.defaultPrinter;
    this.encoding = options.encoding || 'utf8';
    this.tempDir = options.tempDir || os.tmpdir();
    this.platform = os.platform();
  }

  // Helper method to detect Nepali text (Devanagari Unicode range)
  containsNepaliText(text) {
    return /[\u0900-\u097F]/.test(text);
  }

  // Get available printers (Windows/macOS/Linux)
  async getAvailablePrinters() {
    return new Promise((resolve, reject) => {
      let command;

      if (this.platform === 'win32') {
        // Windows: Use PowerShell to get printers
        command =
          'powershell "Get-Printer | Select-Object Name | ForEach-Object { $_.Name }"';
      } else {
        // macOS/Linux: Use CUPS
        command = 'lpstat -p';
      }

      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.warn('Could not get printer list:', error.message);
          resolve([]);
          return;
        }

        let printers = [];
        if (this.platform === 'win32') {
          // Parse Windows PowerShell output
          printers = stdout
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line && !line.includes('---') && line !== 'Name')
            .filter(Boolean);
        } else {
          // Parse CUPS output
          printers = stdout
            .split('\n')
            .filter((line) => line.startsWith('printer'))
            .map((line) => line.split(' ')[1])
            .filter(Boolean);
        }

        resolve(printers);
      });
    });
  }

  // Print using Windows (PowerShell/CMD)
  async printWithWindows(content, printerName = null) {
    return new Promise((resolve, reject) => {
      const tempFile = path.join(this.tempDir, `print_${Date.now()}.txt`);

      // Convert content to proper encoding for Windows printing
      let encodedContent;
      try {
        // For Nepali text, use UTF-8 with BOM for better Windows compatibility
        if (this.containsNepaliText(content)) {
          encodedContent = iconv.encode(content, 'utf8', { addBOM: true });
        } else {
          encodedContent = iconv.encode(content, this.encoding);
        }
      } catch (error) {
        encodedContent = content; // fallback to original content
      }

      // Write content to temporary file with proper encoding
      fs.writeFile(tempFile, encodedContent, (writeErr) => {
        if (writeErr) {
          reject(new Error(`Failed to write temp file: ${writeErr.message}`));
          return;
        }

        const printer = printerName || this.defaultPrinter;
        let command;

        if (printer) {
          // Print to specific printer using PowerShell with UTF-8 encoding
          command = `powershell -Command "& {[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Get-Content -Path '${tempFile}' -Encoding UTF8 | Out-Printer -Name '${printer}'}"`;
        } else {
          // Print to default printer using simple print command
          command = `print "${tempFile}"`;
        }

        exec(command, (error, stdout, stderr) => {
          // Clean up temp file
          fs.unlink(tempFile, () => {});

          if (error) {
            reject(new Error(`Windows print command failed: ${error.message}`));
            return;
          }

          const jobId = `win_job_${Date.now()}`;
          resolve({
            jobId,
            output: stdout.trim(),
            message: `Printed to ${printer || 'default printer'}`,
          });
        });
      });
    });
  }

  // Print using system CUPS (macOS/Linux)
  async printWithCUPS(content, printerName = null) {
    return new Promise((resolve, reject) => {
      const tempFile = path.join(this.tempDir, `print_${Date.now()}.txt`);

      // Convert content to proper encoding for CUPS printing
      let encodedContent;
      try {
        if (this.containsNepaliText(content)) {
          // For Nepali text, ensure UTF-8 encoding
          encodedContent = iconv.encode(content, 'utf8');
        } else {
          encodedContent = iconv.encode(content, this.encoding);
        }
      } catch (error) {
        encodedContent = content; // fallback to original content
      }

      // Write content to temporary file with proper encoding
      fs.writeFile(tempFile, encodedContent, (writeErr) => {
        if (writeErr) {
          reject(new Error(`Failed to write temp file: ${writeErr.message}`));
          return;
        }

        const printer = printerName || this.defaultPrinter;
        // Add charset option for better Unicode support
        const command = printer
          ? `lp -d "${printer}" -o cpi=10 -o lpi=6 "${tempFile}"`
          : `lp -o cpi=10 -o lpi=6 "${tempFile}"`;

        exec(command, (error, stdout, stderr) => {
          // Clean up temp file
          fs.unlink(tempFile, () => {});

          if (error) {
            reject(new Error(`CUPS print command failed: ${error.message}`));
            return;
          }

          // Extract job ID from output
          const jobMatch = stdout.match(/request id is (\S+)/);
          const jobId = jobMatch ? jobMatch[1] : `cups_job_${Date.now()}`;

          resolve({ jobId, output: stdout.trim() });
        });
      });
    });
  }

  // Print to file (for testing/debugging)
  async printToFile(content, filename = null) {
    return new Promise((resolve, reject) => {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const outputFile =
        filename || path.join(this.tempDir, `print_output_${timestamp}.txt`);

      // Convert content to proper encoding
      let encodedContent;
      try {
        if (this.containsNepaliText(content)) {
          // For Nepali text, use UTF-8 with BOM for better compatibility
          encodedContent = iconv.encode(content, 'utf8', { addBOM: true });
        } else {
          encodedContent = iconv.encode(content, this.encoding);
        }
      } catch (error) {
        encodedContent = content; // fallback to original content
      }

      fs.writeFile(outputFile, encodedContent, (error) => {
        if (error) {
          reject(new Error(`Failed to write to file: ${error.message}`));
          return;
        }

        resolve({
          jobId: `file_${Date.now()}`,
          filePath: outputFile,
          message: `Content saved to ${outputFile}`,
        });
      });
    });
  }

  // Mock print (for development)
  async mockPrint(content, printerName = null) {
    return new Promise((resolve) => {
      console.log('=== CUSTOM PRINTER START ===');
      console.log(
        `Printer: ${printerName || this.defaultPrinter || 'Default Printer'}`
      );
      console.log(`Encoding: ${this.encoding}`);
      console.log(`Content:\n${content}`);
      console.log('=== CUSTOM PRINTER END ===');

      setTimeout(() => {
        resolve({
          jobId: `mock_${Date.now()}`,
          message: 'Mock print completed successfully',
        });
      }, 100);
    });
  }

  // Main print method with automatic fallback
  async print(content, options = {}) {
    const {
      printer = null,
      method = 'auto', // 'auto', 'windows', 'cups', 'file', 'mock'
      filename = null,
    } = options;

    try {
      switch (method) {
        case 'windows':
          return await this.printWithWindows(content, printer);

        case 'cups':
          return await this.printWithCUPS(content, printer);

        case 'file':
          return await this.printToFile(content, filename);

        case 'mock':
          return await this.mockPrint(content, printer);

        case 'auto':
        default:
          // Auto-detect platform and use appropriate method
          if (this.platform === 'win32') {
            try {
              const printers = await this.getAvailablePrinters();
              if (printers.length > 0) {
                return await this.printWithWindows(content, printer);
              } else {
                console.warn('No Windows printers found, using mock print');
                return await this.mockPrint(content, printer);
              }
            } catch (winError) {
              console.warn(
                'Windows printing failed, using mock:',
                winError.message
              );
              return await this.mockPrint(content, printer);
            }
          } else {
            // macOS/Linux - use CUPS
            try {
              const printers = await this.getAvailablePrinters();
              if (printers.length > 0) {
                return await this.printWithCUPS(content, printer);
              } else {
                console.warn('No CUPS printers found, using mock print');
                return await this.mockPrint(content, printer);
              }
            } catch (cupsError) {
              console.warn(
                'CUPS printing failed, using mock:',
                cupsError.message
              );
              return await this.mockPrint(content, printer);
            }
          }
      }
    } catch (error) {
      throw new Error(`Print operation failed: ${error.message}`);
    }
  }
}

module.exports = CustomPrinter;
