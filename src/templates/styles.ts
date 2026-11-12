/**
 * Shared Print CSS for official institutional documents
 * College of Engineering Poonjar
 */

export const PRINT_STYLES = `
  @page {
    size: A4 portrait;
    margin: 12mm 15mm;
  }
  @page landscape {
    size: A4 landscape;
    margin: 10mm 12mm;
  }

  * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
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
    padding-bottom: 20px;
  }
  .page:last-child {
    page-break-after: avoid;
  }

  .header {
    text-align: center;
    margin-bottom: 12px;
  }
  .header h1 {
    font-size: 15pt;
    font-weight: 800;
    letter-spacing: 0.5px;
    margin: 0 0 3px 0;
    text-transform: uppercase;
  }
  .header h2 {
    font-size: 11pt;
    font-weight: 700;
    margin: 0 0 4px 0;
    text-transform: uppercase;
  }
  .header h3 {
    font-size: 12pt;
    font-weight: 700;
    margin: 5px 0 3px 0;
    text-decoration: underline;
    text-transform: uppercase;
  }
  .header .meta-row {
    display: flex;
    justify-content: space-between;
    font-size: 10.5pt;
    font-weight: 600;
    margin-top: 10px;
    margin-bottom: 8px;
    border-bottom: 1px dashed #000;
    padding-bottom: 4px;
  }

  table.doc-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 8px;
    margin-bottom: 15px;
    font-size: 10pt;
  }
  table.doc-table th, table.doc-table td {
    border: 1px solid #000000;
    padding: 5px 8px;
    text-align: left;
    vertical-align: middle;
  }
  table.doc-table th {
    background-color: #f2f2f2 !important;
    font-weight: 700;
    text-align: center;
    text-transform: uppercase;
    font-size: 9.5pt;
  }
  table.doc-table td.center {
    text-align: center;
  }
  table.doc-table td.numeric {
    font-variant-numeric: tabular-nums;
  }

  .signatory-block {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-top: 40px;
    padding-top: 10px;
    page-break-inside: avoid;
  }
  .signatory-col {
    text-align: center;
    width: 220px;
  }
  .signatory-line {
    margin-top: 45px;
    border-top: 1px solid #000;
    padding-top: 4px;
    font-weight: 700;
    font-size: 10pt;
  }

  .notes-block {
    margin-top: 15px;
    font-size: 9.5pt;
    border-top: 1px dotted #666;
    padding-top: 8px;
    page-break-inside: avoid;
  }
  .notes-block p {
    margin: 3px 0;
  }

  /* Seating Grid Specifics */
  .seating-matrix {
    width: 100%;
    border-collapse: collapse;
    margin-top: 10px;
    font-size: 9.5pt;
  }
  .seating-matrix th, .seating-matrix td {
    border: 1px solid #000;
    padding: 6px 4px;
    text-align: center;
  }
  .seating-matrix th {
    background-color: #f2f2f2 !important;
    font-weight: bold;
  }
  .seat-cell {
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    font-size: 9.5pt;
    min-height: 22px;
  }
`;

