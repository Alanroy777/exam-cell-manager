/**
 * Official Institutional Document Styles
 * College of Engineering Poonjar (CEP)
 * Matching exact college reference documents
 */

export const PRINT_STYLES = `
  @page {
    size: A4 portrait;
    margin: 10mm 12mm;
  }
  @page landscape {
    size: A4 landscape;
    margin: 8mm 10mm;
  }

  * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  body {
    font-family: "Times New Roman", Times, Georgia, serif;
    color: #000000;
    background: #ffffff;
    margin: 0;
    padding: 0;
    font-size: 11pt;
    line-height: 1.35;
  }

  .page {
    width: 100%;
    page-break-after: always;
    position: relative;
    padding: 0;
    margin: 0;
  }
  .page:last-child {
    page-break-after: avoid;
  }

  /* Attendance Sheet Outer Box Border */
  .attendance-box {
    border: 2px solid #000000;
    padding: 22px 26px;
    min-height: 980px;
  }

  .header {
    text-align: center;
    margin-bottom: 10px;
  }
  .header h1 {
    font-size: 14pt;
    font-weight: 800;
    letter-spacing: 0.3px;
    margin: 0 0 2px 0;
    text-transform: uppercase;
  }
  .header h2 {
    font-size: 10.5pt;
    font-weight: 700;
    margin: 0 0 3px 0;
    text-transform: uppercase;
  }
  .header h3 {
    font-size: 11.5pt;
    font-weight: 800;
    margin: 4px 0 2px 0;
    text-transform: uppercase;
  }

  table.doc-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 6px;
    margin-bottom: 10px;
    font-size: 10.5pt;
  }
  table.doc-table th, table.doc-table td {
    border: 1.5px solid #000000;
    padding: 5px 6px;
    vertical-align: middle;
  }
  table.doc-table th {
    background-color: #ffffff !important;
    font-weight: 700;
    text-align: center;
    font-size: 10pt;
  }
  table.doc-table td.center {
    text-align: center;
  }
  table.doc-table td.numeric {
    font-variant-numeric: tabular-nums;
  }

  /* Vertical date column header for Duty List (matching photo) */
  .vertical-date-th {
    height: 85px;
    vertical-align: bottom !important;
    padding: 4px 2px !important;
    text-align: center;
    border: 1.5px solid #000000 !important;
  }
  .vertical-date-text {
    writing-mode: vertical-rl;
    transform: rotate(180deg);
    white-space: nowrap;
    font-size: 9pt;
    font-weight: 700;
    margin: 0 auto;
    display: inline-block;
  }

  /* Seating Grid Specifics (Portrait Format: 2 Halls per Page) */
  table.seating-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 4px;
    margin-bottom: 8px;
    font-size: 9.5pt;
  }
  table.seating-table th, table.seating-table td {
    border: 1.5px solid #000000;
    padding: 4px 3px;
    text-align: center;
    font-weight: 700;
  }
  table.seating-table th {
    background-color: #ffffff !important;
    font-weight: 700;
  }
  .seat-cell {
    font-weight: 700;
    font-size: 9.5pt;
    white-space: nowrap;
  }
`;



