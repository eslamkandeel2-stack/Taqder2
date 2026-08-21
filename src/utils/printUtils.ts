import { CertificateData } from '../types';
import { getCertificateDimensions, waitForImagesToLoad } from './exportUtils';

export interface PrintDocumentConfig {
  paperSize?: 'A4' | 'A3' | 'A5' | 'Letter' | 'Square' | 'Custom';
  orientation?: 'landscape' | 'portrait';
  marginTop?: number;
  marginRight?: number;
  marginBottom?: number;
  marginLeft?: number;
  colorMode?: 'color' | 'grayscale';
  printBackgrounds?: boolean;
}

/**
 * Builds a standalone, self-contained HTML document containing the certificate
 * with all fonts, CSS stylesheets, and exact @page print rules for perfect fidelity.
 */
export function generateCertificatePrintHtml(
  certElement: HTMLElement,
  certificateData: CertificateData,
  config: PrintDocumentConfig = {}
): string {
  const dims = getCertificateDimensions(certificateData.aspectRatio);
  const isLandscape = dims.orientation === 'landscape';
  const isSquare = certificateData.aspectRatio === 'square';

  const defaultOrientation: 'landscape' | 'portrait' = isSquare
    ? 'portrait'
    : isLandscape
    ? 'landscape'
    : 'portrait';

  const paperSize = config.paperSize || (isSquare ? 'Square' : 'A4');
  const orientation = config.orientation || defaultOrientation;
  const marginTop = config.marginTop ?? 0;
  const marginRight = config.marginRight ?? 0;
  const marginBottom = config.marginBottom ?? 0;
  const marginLeft = config.marginLeft ?? 0;
  const colorMode = config.colorMode || 'color';
  const printBackgrounds = config.printBackgrounds ?? true;

  // Clone element cleanly
  const clone = certElement.cloneNode(true) as HTMLElement;
  clone.style.transform = 'none';
  clone.style.margin = '0 auto';
  clone.style.boxShadow = 'none';
  clone.style.position = 'relative';
  clone.style.width = `${dims.baseWidth}px`;
  clone.style.height = `${dims.baseHeight}px`;
  const printContent = clone.outerHTML;

  // Collect all active stylesheets and Google Fonts links from the document
  const stylesheets = typeof document !== 'undefined' && document.querySelectorAll
    ? Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
        .map((node) => node.outerHTML)
        .join('\n')
    : '';

  const pagePaperSize = isSquare
    ? '210mm 210mm'
    : `${paperSize.toLowerCase()} ${orientation}`;

  const certW = dims.baseWidth;
  const certH = dims.baseHeight;

  // Standard A4 dimensions in mm: 297 x 210
  const paperWidthMm = isLandscape ? 297 : 210;
  const paperHeightMm = isLandscape ? 210 : 297;
  const netWidthMm = Math.max(10, paperWidthMm - marginLeft - marginRight);
  const netHeightMm = Math.max(10, paperHeightMm - marginTop - marginBottom);

  // Convert mm to px at 96 DPI (1mm ≈ 3.7795px)
  const printAreaPxWidth = netWidthMm * 3.7795275591;
  const printAreaPxHeight = netHeightMm * 3.7795275591;

  const autoScale = Math.min(
    printAreaPxWidth / certW,
    printAreaPxHeight / certH
  );

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <title>شهادة تقدير وتفوق - ${certificateData.studentName || 'طالب'}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400;1,700&family=Aref+Ruqaa:wght@400;700&family=Aref+Ruqaa+Ink:wght@400;700&family=Cairo:wght@300;400;600;700;800;900&family=Changa:wght@400;600;700;800&family=El+Messiri:wght@400;600;700&family=Harmattan:wght@400;700&family=Kufam:wght@400;600;700&family=Lalezar&family=Lateef:wght@400;700&family=Marhey:wght@400;600;700&family=Rakkas&family=Reem+Kufi:wght@400;600;700&family=Ruwudu:wght@400;600;700&family=Scheherazade+New:wght@400;700&family=Tajawal:wght@400;500;700;800;900&family=Vazirmatn:wght@400;600;700;800&family=Alex+Brush&family=Caveat:wght@400;700&family=Dancing+Script:wght@400;700&family=Great+Vibes&family=Playfair+Display:ital,wght@0,600;0,800;1,600&family=Cinzel:wght@600;800&family=Montserrat:wght@400;600;700;800&display=swap" rel="stylesheet">
  ${stylesheets}
  <style>
    @page {
      size: ${pagePaperSize} !important;
      margin: ${marginTop}mm ${marginRight}mm ${marginBottom}mm ${marginLeft}mm !important;
    }
    *, *::before, *::after {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
      box-sizing: border-box !important;
    }
    html, body {
      background-color: #ffffff !important;
      background: #ffffff !important;
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      height: 100% !important;
      overflow: hidden !important;
      font-family: 'Cairo', 'Amiri', sans-serif;
    }
    body {
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      ${colorMode === 'grayscale' ? 'filter: grayscale(100%) !important;' : ''}
    }
    .printable-cert-page {
      width: 100vw !important;
      height: 100vh !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      overflow: hidden !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    .printable-cert-scaler {
      width: ${certW}px !important;
      height: ${certH}px !important;
      transform: scale(${autoScale}) !important;
      transform-origin: center center !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      flex-shrink: 0 !important;
      margin: auto !important;
      position: relative !important;
    }
    #certificate-print-area,
    [data-certificate-canvas="true"] {
      width: ${certW}px !important;
      height: ${certH}px !important;
      margin: 0 !important;
      position: relative !important;
      box-shadow: none !important;
      border-radius: 0 !important;
      transform: none !important;
    }
    ${!printBackgrounds ? '* { background-image: none !important; }' : ''}
  </style>
</head>
<body>
  <div class="printable-cert-page">
    <div class="printable-cert-scaler">
      ${printContent}
    </div>
  </div>
</body>
</html>`;
}

/**
 * Opens a dedicated new browser window / tab containing the certificate
 * formatted exactly for printing or saving as PDF ("نافذة المتصفح للطباعة المباشرة").
 */
export async function openCertificateInBrowserWindow(
  certElement: HTMLElement,
  certificateData: CertificateData,
  config: PrintDocumentConfig = {}
): Promise<boolean> {
  await waitForImagesToLoad(certElement);
  const html = generateCertificatePrintHtml(certElement, certificateData, config);

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    // Popup was blocked by browser
    return false;
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  setTimeout(() => {
    try {
      printWindow.focus();
      printWindow.print();
    } catch (e) {
      console.warn('Could not auto-trigger print on new window:', e);
    }
  }, 400);

  return true;
}

/**
 * Prints the certificate directly using a hidden iframe for seamless in-app printing.
 */
export async function printCertificateViaIframe(
  certElement: HTMLElement,
  certificateData: CertificateData,
  config: PrintDocumentConfig = {}
): Promise<void> {
  await waitForImagesToLoad(certElement);
  const html = generateCertificatePrintHtml(certElement, certificateData, config);

  let printIframe = document.getElementById('direct-print-iframe') as HTMLIFrameElement | null;
  if (printIframe) {
    printIframe.remove();
  }

  printIframe = document.createElement('iframe');
  printIframe.id = 'direct-print-iframe';
  printIframe.style.position = 'fixed';
  printIframe.style.right = '0';
  printIframe.style.bottom = '0';
  printIframe.style.width = '0px';
  printIframe.style.height = '0px';
  printIframe.style.border = 'none';
  printIframe.style.visibility = 'hidden';

  document.body.appendChild(printIframe);

  const iframeDoc = printIframe.contentDocument || printIframe.contentWindow?.document;
  if (iframeDoc) {
    iframeDoc.open();
    iframeDoc.write(html);
    iframeDoc.close();

    setTimeout(() => {
      try {
        if (printIframe && printIframe.contentWindow) {
          printIframe.contentWindow.focus();
          printIframe.contentWindow.print();
        } else {
          window.print();
        }
      } catch (err) {
        console.warn('Iframe print failed, falling back to window.print:', err);
        window.print();
      }
    }, 350);
  }
}

/**
 * Builds a standalone, self-contained HTML document for the Official Statement of Verification.
 */
export function generateVerificationStatementPrintHtml(
  statementElement: HTMLElement,
  studentName: string,
  verificationCode: string
): string {
  const clone = statementElement.cloneNode(true) as HTMLElement;
  clone.style.margin = '0 auto';
  clone.style.boxShadow = 'none';
  clone.style.maxWidth = '800px';
  clone.style.width = '100%';
  const printContent = clone.outerHTML;

  const stylesheets = typeof document !== 'undefined' && document.querySelectorAll
    ? Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
        .map((node) => node.outerHTML)
        .join('\n')
    : '';

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <title>وثيقة التحقق الرسمية - ${studentName || 'طالب'} (${verificationCode})</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=Amiri:ital,wght@0,400;0,700;1,400&family=Tajawal:wght@400;500;700;800&display=swap" rel="stylesheet">
  ${stylesheets}
  <style>
    @page {
      size: A4 portrait !important;
      margin: 15mm 15mm 15mm 15mm !important;
    }
    *, *::before, *::after {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
      box-sizing: border-box !important;
    }
    html, body {
      background-color: #ffffff !important;
      background: #ffffff !important;
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      height: 100% !important;
      overflow: visible !important;
      font-family: 'Cairo', 'Amiri', sans-serif;
    }
    body {
      padding: 20px !important;
      display: flex !important;
      justify-content: center !important;
      align-items: flex-start !important;
    }
    .statement-print-wrapper {
      width: 100% !important;
      max-width: 800px !important;
      margin: 0 auto !important;
    }
    button, .no-print, nav, header {
      display: none !important;
    }
  </style>
</head>
<body>
  <div class="statement-print-wrapper">
    ${printContent}
  </div>
</body>
</html>`;
}

/**
 * Opens a dedicated print window for the verification statement.
 */
export async function openVerificationStatementInBrowserWindow(
  statementElement: HTMLElement,
  studentName: string,
  verificationCode: string
): Promise<boolean> {
  await waitForImagesToLoad(statementElement);
  const html = generateVerificationStatementPrintHtml(statementElement, studentName, verificationCode);

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    return false;
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  setTimeout(() => {
    try {
      printWindow.focus();
      printWindow.print();
    } catch (e) {
      console.warn('Could not auto-trigger print on new window:', e);
    }
  }, 400);

  return true;
}

/**
 * Prints the verification statement directly via iframe.
 */
export async function printVerificationStatementViaIframe(
  statementElement: HTMLElement,
  studentName: string,
  verificationCode: string
): Promise<void> {
  await waitForImagesToLoad(statementElement);
  const html = generateVerificationStatementPrintHtml(statementElement, studentName, verificationCode);

  let printIframe = document.getElementById('statement-print-iframe') as HTMLIFrameElement | null;
  if (printIframe) {
    printIframe.remove();
  }

  printIframe = document.createElement('iframe');
  printIframe.id = 'statement-print-iframe';
  printIframe.style.position = 'fixed';
  printIframe.style.right = '0';
  printIframe.style.bottom = '0';
  printIframe.style.width = '0px';
  printIframe.style.height = '0px';
  printIframe.style.border = 'none';
  printIframe.style.visibility = 'hidden';

  document.body.appendChild(printIframe);

  const iframeDoc = printIframe.contentDocument || printIframe.contentWindow?.document;
  if (iframeDoc) {
    iframeDoc.open();
    iframeDoc.write(html);
    iframeDoc.close();

    setTimeout(() => {
      try {
        if (printIframe && printIframe.contentWindow) {
          printIframe.contentWindow.focus();
          printIframe.contentWindow.print();
        } else {
          window.print();
        }
      } catch (err) {
        console.warn('Iframe print failed, falling back to window.print:', err);
        window.print();
      }
    }, 350);
  }
}

