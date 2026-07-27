import ExcelJS from 'exceljs';
import Papa from 'papaparse';

/**
 * Handles multipart file upload (Excel/CSV), parses headers, detects mapping, returns preview.
 */
export async function uploadCatalogFile(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: 'No file was uploaded.' });
  }

  const { buffer, originalname } = req.file;
  const isExcel = originalname.endsWith('.xlsx');
  const isCsv = originalname.endsWith('.csv');

  if (!isExcel && !isCsv) {
    return res.status(400).json({ error: 'Unsupported file type. Please upload a .csv or .xlsx file.' });
  }

  try {
    let headers = [];
    let rows = [];

    if (isExcel) {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const worksheet = workbook.worksheets[0]; // use first worksheet

      if (!worksheet) {
        throw new Error('Excel workbook contains no sheets.');
      }

      // Read rows
      worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        const values = Array.isArray(row.values) ? row.values.slice(1) : []; // exceljs rows are 1-indexed, cell 0 is empty
        const cleanedValues = values.map(val => {
          if (val && typeof val === 'object' && val.text) return val.text; // hyperlink objects
          if (val && val instanceof Date) return val.toISOString().split('T')[0];
          return val === null || val === undefined ? '' : String(val);
        });

        if (rowNumber === 1) {
          headers = cleanedValues;
        } else {
          rows.push(cleanedValues);
        }
      });
    } else {
      // Parse CSV
      const csvString = buffer.toString('utf-8');
      const result = Papa.parse(csvString, { skipEmptyLines: true });
      
      if (result.data.length > 0) {
        headers = result.data[0];
        rows = result.data.slice(1);
      }
    }

    if (headers.length === 0) {
      return res.status(400).json({ error: 'File appears to be empty or contains no headers.' });
    }

    // Auto-detect columns
    const titleRegex = /^(song\s*)?title$|^track(\s*name)?$|^name$/i;
    const artistRegex = /^artist(\s*name)?$|^performer$|^singer$/i;
    const albumRegex = /^album$|^record$|^album\s*name$/i;
    const yearRegex = /^(release\s*)?year$|^year$|^date$|^(release\s*)?date$/i;

    const detectedMapping = {
      title: headers.find(h => titleRegex.test(h)) || '',
      artist: headers.find(h => artistRegex.test(h)) || '',
      album: headers.find(h => albumRegex.test(h)) || '',
      releaseYear: headers.find(h => yearRegex.test(h)) || ''
    };

    // Construct preview items (first 20 rows) mapped by headers
    const fullData = rows.map(row => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index] || '';
      });
      return obj;
    });

    const preview = fullData.slice(0, 20);

    res.json({
      fileName: originalname,
      totalRows: fullData.length,
      headers,
      detectedMapping,
      preview,
      fullData // return full data to client to hold in memory
    });

  } catch (error) {
    console.error('Error parsing catalog file:', error);
    res.status(500).json({ error: 'Failed to parse the catalog file.', details: error.message });
  }
}
