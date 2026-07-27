import ExcelJS from 'exceljs';
import Papa from 'papaparse';

/**
 * Builds a safe "artistname-YYYY-MM-DD.ext" filename for exports so repeated
 * downloads don't collide (e.g. avoids "app.xlsx", "app(1).xlsx", etc).
 */
function buildExportFilename(artistName, ext) {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const safeArtist = String(artistName || 'export')
    .trim()
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'export';

  return `${safeArtist}-${today}.${ext}`;
}

/**
 * Controller for generating and downloading CSV or Excel exports.
 */
export async function exportResults(req, res) {
  const { results, buckets, format, artistName } = req.body;

  if (!results) {
    return res.status(400).json({ error: 'Results object is required.' });
  }

  if (!buckets || typeof buckets !== 'object') {
    return res.status(400).json({ error: 'Selected buckets object is required.' });
  }

  const exportFormat = (format || 'csv').toLowerCase();

  try {
    // 1. Gather all data rows based on selected buckets
    const dataRows = [];
    const bucketNames = ['missing', 'matched', 'uncertain'];

    for (const bucket of bucketNames) {
      if (buckets[bucket] && results[bucket] && Array.isArray(results[bucket])) {
        results[bucket].forEach(item => {
          dataRows.push({
            'Title': item.title,
            'YouTube URL': item.youtubeUrl,
            'View Count': item.viewCount,
            'Published Date': item.publishedAt ? new Date(item.publishedAt).toISOString().split('T')[0] : 'N/A',
            'Match Status': item.status,
            'Matched Catalog Title': item.matchedCatalogTitle || 'N/A',
            'Match Confidence %': item.confidence ? `${Math.round(item.confidence * 100)}%` : '0%'
          });
        });
      }
    }

    if (dataRows.length === 0) {
      return res.status(400).json({ error: 'No data matches the selected export configuration.' });
    }

    // 2. Export based on format
    if (exportFormat === 'excel' || exportFormat === 'xlsx') {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Catalog Gap Finder Results');

      // Define columns and widths
      worksheet.columns = [
        { header: 'Title', key: 'Title', width: 40 },
        { header: 'YouTube URL', key: 'YouTube URL', width: 35 },
        { header: 'View Count', key: 'View Count', width: 15 },
        { header: 'Published Date', key: 'Published Date', width: 15 },
        { header: 'Match Status', key: 'Match Status', width: 15 },
        { header: 'Matched Catalog Title', key: 'Matched Catalog Title', width: 40 },
        { header: 'Match Confidence %', key: 'Match Confidence %', width: 20 }
      ];

      // Style header row
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF6B46C1' } // Purple theme brand color
      };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
      headerRow.height = 25;

      // Add data rows
      worksheet.addRows(dataRows);

      // Add borders and cell styles
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
          row.alignment = { vertical: 'middle' };
          
          // Color code Match Status column
          const statusCell = row.getCell('Match Status');
          if (statusCell.value === 'Matched') {
            statusCell.font = { color: { argb: 'FF15803D' }, bold: true }; // Green
          } else if (statusCell.value === 'Uncertain') {
            statusCell.font = { color: { argb: 'FFB45309' }, bold: true }; // Amber
          } else {
            statusCell.font = { color: { argb: 'FFB91C1C' }, bold: true }; // Red
          }
        }
        
        row.eachCell(cell => {
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
          };
        });
      });

      // Write workbook to buffer and send
      const excelFilename = buildExportFilename(artistName, 'xlsx');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${excelFilename}"`);

      await workbook.xlsx.write(res);
      res.end();

    } else {
      // Default: CSV format
      const csvString = Papa.unparse(dataRows);
      const csvFilename = buildExportFilename(artistName, 'csv');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${csvFilename}"`);
      res.send(csvString);
    }

  } catch (error) {
    console.error('Error generating export file:', error);
    res.status(500).json({ error: 'Failed to generate export file.', details: error.message });
  }
}
