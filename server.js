const express = require('express');
const app = express();
const dotenv = require('dotenv');
dotenv.config();
const dayjs = require('dayjs');
const CustomPrinter = require('./printer');

const port = process.env.PORT || 8000;

const printer = new CustomPrinter({
  defaultPrinter: process.env.PRINTER_NAME,
  encoding: 'utf8',
});

const ORG_NAME = process.env.ORG_NAME || 'Your Organization';
const PRINTER_NAME = process.env.PRINTER_NAME;
const PAGE_WIDTH = parseInt(process.env.PAGE_WIDTH) || 32;

// Add CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json({ limit: '10mb' }));

// Add request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

function getVisualLength(str) {
  let length = 0;
  for (const char of str) {
    if (char.match(/[\u0900-\u097F]/)) {
      length += 2;
    } else {
      length += 1;
    }
  }
  return length;
}

function formatLine(sn, title, qty) {
  const snStr = sn.toString().padEnd(3, ' ');
  const qtyStr = qty.toString().padStart(4, ' ');
  const maxTitleLength = PAGE_WIDTH - snStr.length - qtyStr.length - 2;
  const titleStr =
    title.length > maxTitleLength
      ? title.substring(0, maxTitleLength - 1) + '…'
      : title.padEnd(maxTitleLength, ' ');

  return `${snStr} ${titleStr} ${qtyStr}`;
}
function buildSlip(data) {
  const header = ORG_NAME + '\n' + dayjs().format('YYYY-MM-DD HH:mm:ss') + '\n';
  const separator = '-'.repeat(PAGE_WIDTH) + '\n';

  const headerSN = 'SN';
  const headerTitle = '  शीर्षक';
  const headerQty = 'सं';

  const snLength = headerSN.length;
  const titleLength = getVisualLength(headerTitle);
  const qtyLength = getVisualLength(headerQty);

  const usedSpace = snLength + titleLength + qtyLength;
  const spacesNeeded = Math.max(0, PAGE_WIDTH - usedSpace);

  const columns =
    headerSN + headerTitle + ' '.repeat(spacesNeeded) + headerQty + '\n';

  const lines = data
    .map((row) => formatLine(row[0], row[1], row[2]))
    .join('\n');

  return header + separator + columns + lines + '\n' + separator;
}

app.get('/printers', async (req, res) => {
  try {
    const printers = await printer.getAvailablePrinters();
    res.status(200).json({
      success: true,
      printers: printers,
      count: printers.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.post('/print', async (req, res) => {
  try {
    console.log('Received print request:', req.body);

    const { data } = req.body;

    if (!data) {
      return res.status(400).json({
        success: false,
        error: 'Missing data field in request body',
      });
    }

    if (!Array.isArray(data)) {
      return res.status(400).json({
        success: false,
        error: 'Data must be an array',
      });
    }

    if (data.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Data array cannot be empty',
      });
    }

    const content = buildSlip(data);
    console.log(`Content to print:\n${content}`);

    const result = await printer.print(content, {
      printer: process.env.PRINTER_NAME,
      method: process.env.PRINT_METHOD || 'auto',
    });

    console.log(`Print job completed: ${result.jobId}`);
    res.status(200).json({
      success: true,
      jobId: result.jobId,
      message: result.message || 'Print job sent successfully',
    });
  } catch (error) {
    console.error('Print error:', error.message);
    console.error('Print error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

app.get('/payload-test', (req, res) => {
  const testPayload = {
    data: [
      [1, 'Test Item 1', 5],
      [2, 'Test Item 2', 3],
      [3, 'Sample Product', 10],
      [4, 'चिया पत्ती', 2],
      [5, 'दूध पाउडर', 1],
    ],
  };
  console.log(`Test Payload:\n${JSON.stringify(testPayload, null, 2)}`);
  res.status(200).json({
    success: true,
    message: 'Payload test endpoint hit successfully',
    payload: testPayload,
  });
});

app.listen(port, () => {
  console.log(`=================================`);
  console.log(`Simple Print Server Started`);
  console.log(`=================================`);
  console.log(`Server: http://localhost:${port}`);
  console.log(`Health: http://localhost:${port}/health`);
  console.log(`Printers: http://localhost:${port}/printers`);
  console.log(`Print: POST http://localhost:${port}/print`);
  console.log(`Test Page: Open test_page.html in browser`);
  console.log(`Organization: ${ORG_NAME}`);
  console.log(`Default Printer: ${PRINTER_NAME || 'Auto-detect'}`);
  console.log(`Page Width: ${PAGE_WIDTH}`);
  console.log(`Print Method: ${process.env.PRINT_METHOD || 'auto'}`);
  console.log(`=================================`);
});
