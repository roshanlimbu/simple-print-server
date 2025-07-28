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

app.use(express.json());

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
  const { data } = req.body;

  if (!Array.isArray(data) || data.length === 0) {
    return res
      .status(400)
      .send('Data is required and must be a non-empty array');
  }

  const content = buildSlip(data);
  console.log(`Content to print:\n${content}`);

  try {
    const result = await printer.print(content, {
      printer: process.env.PRINTER_NAME,
      method: process.env.PRINT_METHOD || 'auto', // 'auto', 'cups', 'file', 'mock' | 'auto' will auto-detect the platform
    });

    console.log(`Print job completed: ${result.jobId}`);
    res.status(200).json({
      success: true,
      jobId: result.jobId,
      message: result.message || 'Print job sent successfully',
    });
  } catch (error) {
    console.error('Print error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
