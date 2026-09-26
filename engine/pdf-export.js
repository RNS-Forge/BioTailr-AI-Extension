/**
 * BioTailr AI - Accurate HTML to PDF Exporter
 * Ensures single-page resumes download as EXACTLY 1 page with ZERO blank pages.
 */
export async function downloadResumeAsPdf(targetElementId = 'resume-document', filename = 'BioTailr_Resume.pdf') {
  const element = document.getElementById(targetElementId);
  if (!element) {
    console.error('Target element not found:', targetElementId);
    window.print();
    return;
  }

  // Identify available engines
  const hasHtml2Canvas = typeof window.html2canvas !== 'undefined';
  const JsPdfClass = window.jsPDF || (window.jspdf && window.jspdf.jsPDF);
  const hasHtml2Pdf = typeof window.html2pdf !== 'undefined';

  // Ensure element is perfectly balanced to 1 page before snapshot
  if (typeof window.autoBalanceResumeToOnePage === 'function') {
    window.autoBalanceResumeToOnePage();
  }

  // Strategy 1: Direct Canvas & jsPDF Precision 1-Page Rendering
  if (hasHtml2Canvas && JsPdfClass) {
    try {
      const canvas = await window.html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 1200
      });

      const pdf = new JsPdfClass('p', 'mm', 'a4');
      const pageWidthMm = 210;
      const pageHeightMm = 297;

      // STRICT 1-PAGE GUARANTEE: Always fit canvas onto exactly one A4 page.
      // Zero second page, zero blank pages, 100% full single sheet.
      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      pdf.addImage(imgData, 'JPEG', 0, 0, pageWidthMm, pageHeightMm);
      pdf.save(filename);
      return;
    } catch (err) {
      console.warn('Direct canvas-to-pdf pipeline failed, falling back to html2pdf:', err);
    }
  }

  // Strategy 2: html2pdf.js Fallback with Strict 1-Page Enforcement
  if (hasHtml2Pdf) {
    const opt = {
      margin: 0,
      filename: filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      },
      jsPDF: {
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait'
      }
    };

    window.html2pdf().set(opt).from(element).toPdf().get('pdf').then(function(pdf) {
      // Delete any pages beyond page 1 to guarantee strictly 1 page
      while (pdf.internal.getNumberOfPages() > 1) {
        pdf.deletePage(pdf.internal.getNumberOfPages());
      }
    }).save();
    return;
  }

  // Strategy 3: Native browser print
  window.print();
}

export function printResumeNative() {
  window.print();
}

/**
 * Downloads the current resume rendered in targetElementId as a clean,
 * self-contained, 100% pure black ATS-compliant HTML file.
 */
export function downloadResumeAsHtml(targetElementId = 'resume-document', filename = 'BioTailr_Resume.html') {
  const element = document.getElementById(targetElementId);
  if (!element) {
    console.error('Target element not found:', targetElementId);
    return;
  }

  // Clone node and clean any live-editing attributes
  const clone = element.cloneNode(true);
  clone.classList.remove('live-editing');
  clone.querySelectorAll('[contenteditable]').forEach(el => {
    el.removeAttribute('contenteditable');
    el.removeAttribute('spellcheck');
  });

  const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${document.title || 'Sanjay N – 100% ATS Resume'}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Open+Sans:wght@400;600;700&display=swap" rel="stylesheet">
<style>
  @page { size: A4; margin: 0; }
  :root {
    --ink: #000000;
    --rule: #1c1c1c;
    --sheet: #ffffff;
    --desk: #f1f5f9;
    --body-font: 'Open Sans', 'Segoe UI', Calibri, Arial, sans-serif;
    --meta-font: 'Inter', 'Open Sans', 'Segoe UI', Arial, sans-serif;
    --name-font: 'Times New Roman', Times, 'Liberation Serif', serif;
  }
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    background: var(--desk);
    color: #000000;
    font-family: var(--body-font);
    font-size: 10pt;
    line-height: 1.36;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  body, body * {
    color: #000000 !important;
  }
  .resume-sheet {
    width: 210mm;
    min-height: 297mm;
    margin: 16px auto;
    padding: 18pt 36pt 16pt 36pt;
    background: #ffffff;
    box-shadow: 0 4px 20px rgba(0,0,0,.15);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  a { color: #000000 !important; text-decoration: none; }
  a.u, a:hover { text-decoration: underline; }
  .head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding-bottom: 5pt;
    border-bottom: 0.75pt solid #1c1c1c;
    margin-bottom: 2pt;
  }
  .name {
    margin: 0;
    font-family: var(--name-font);
    font-weight: 700;
    font-size: 21pt;
    line-height: 1.1;
    letter-spacing: 0.2pt;
  }
  .role {
    margin: 2pt 0 0;
    font-family: var(--meta-font);
    font-size: 10pt;
    font-weight: 600;
    line-height: 1.25;
  }
  .contact {
    display: grid;
    grid-template-columns: 120pt auto;
    column-gap: 0;
    margin-top: 1pt;
    font-family: var(--meta-font);
    font-size: 7.8pt;
    line-height: 1.32;
  }
  .contact b { font-weight: 700; }
  .contact .wide { grid-column: 1 / -1; }
  section {
    padding: 4.5pt 0 5pt;
    border-bottom: 0.75pt solid #1c1c1c;
  }
  section:last-of-type { border-bottom: 0; }
  h2 {
    margin: 0 0 3pt;
    font-size: 11.5pt;
    font-weight: 700;
    line-height: 1.25;
    padding-left: 2pt;
    text-transform: uppercase;
  }
  p.summary {
    margin: 0;
    padding-left: 2pt;
    font-size: 9.8pt;
    line-height: 1.38;
    text-align: justify;
  }
  ul {
    margin: 0;
    padding-left: 22pt;
    list-style: disc;
  }
  li {
    font-size: 9.6pt;
    line-height: 1.36;
    margin-bottom: 1.5pt;
  }
  li::marker { font-size: 8pt; color: #000000 !important; }
  .exp-entry { margin-top: 4pt; }
  .exp-entry:first-of-type { margin-top: 0; }
  .exp-row-primary {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    width: 100%;
    gap: 12pt;
    padding-left: 2pt;
    font-size: 9.8pt;
    line-height: 1.35;
  }
  .exp-company-role { font-weight: 700; }
  .exp-period.when {
    white-space: nowrap;
    font-weight: 700;
    text-align: right;
    margin-left: auto;
    flex-shrink: 0;
  }
  .exp-row-secondary {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    width: 100%;
    padding-left: 2pt;
    margin-top: 0.5pt;
    font-size: 9pt;
  }
  .exp-project em { font-style: italic; }
  .exp-location {
    text-align: right;
    white-space: nowrap;
    margin-left: auto;
    font-weight: 600;
  }
  .edu-entry { margin-top: 3.5pt; }
  .edu-entry:first-of-type { margin-top: 0; }
  .edu-row-primary {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    width: 100%;
    gap: 12pt;
    padding-left: 2pt;
    font-size: 9.8pt;
    line-height: 1.35;
  }
  .edu-degree { font-weight: 700; }
  .edu-year.when {
    font-weight: 700;
    white-space: nowrap;
    text-align: right;
    margin-left: auto;
    flex-shrink: 0;
  }
  .edu-row-secondary {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    width: 100%;
    padding-left: 2pt;
    margin-top: 0.5pt;
    font-size: 9.2pt;
  }
  .edu-location {
    text-align: right;
    white-space: nowrap;
    margin-left: auto;
    font-style: italic;
  }
  @media print {
    body { background: #ffffff !important; }
    .resume-sheet {
      width: 100%;
      margin: 0;
      padding: 18pt 36pt 16pt 36pt;
      box-shadow: none;
    }
  }
</style>
</head>
<body>
${clone.outerHTML}
</body>
</html>`;

  const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

