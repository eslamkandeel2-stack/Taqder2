import React, { useState, useEffect, useRef } from 'react';
import {
  Printer,
  X,
  Sliders,
  FileText,
  RotateCw,
  Scissors,
  Check,
  Maximize2,
  Droplet,
  Info,
  Sparkles,
  Layers,
  ArrowRight,
  RefreshCw,
  Eye,
  ZoomIn,
  ZoomOut,
  Move,
  Hand,
  RotateCcw,
  Monitor,
  ExternalLink
} from 'lucide-react';
import { CertificateData } from '../types';
import { getCertificateDimensions } from '../utils/exportUtils';
import { autoArchiveCertificate } from '../utils/archiveManager';

interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  certificateData: CertificateData;
}

export type PaperSize = 'A4' | 'A3' | 'A5' | 'Letter' | 'Legal' | 'Custom';
export type Orientation = 'landscape' | 'portrait';
export type MarginPreset = 'none' | 'narrow' | 'standard' | 'wide' | 'custom';

export const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({
  isOpen,
  onClose,
  certificateData
}) => {
  // Paper & Print Settings
  const [paperSize, setPaperSize] = useState<PaperSize>('A4');
  const [customWidthMm, setCustomWidthMm] = useState<number>(297);
  const [customHeightMm, setCustomHeightMm] = useState<number>(210);
  const [orientation, setOrientation] = useState<Orientation>('landscape');
  
  // Margins (in mm)
  const [marginPreset, setMarginPreset] = useState<MarginPreset>('standard');
  const [marginTop, setMarginTop] = useState<number>(10);
  const [marginRight, setMarginRight] = useState<number>(10);
  const [marginBottom, setMarginBottom] = useState<number>(10);
  const [marginLeft, setMarginLeft] = useState<number>(10);
  
  // Certificate Scale inside Paper Sheet
  const [scale, setScale] = useState<number>(100);
  const [isFitToPage, setIsFitToPage] = useState<boolean>(true);
  const [printBackgrounds, setPrintBackgrounds] = useState<boolean>(true);
  const [colorMode, setColorMode] = useState<'color' | 'grayscale'>('color');
  const [showCropMarks, setShowCropMarks] = useState<boolean>(false);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);

  // Screen Viewport Auto-Fit & Pan/Zoom Interactive State
  const [previewZoom, setPreviewZoom] = useState<number>(1);
  const [isAutoFitScreen, setIsAutoFitScreen] = useState<boolean>(true);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanMode, setIsPanMode] = useState<boolean>(true);
  const [isDraggingPan, setIsDraggingPan] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Viewport Container Ref
  const viewportContainerRef = useRef<HTMLDivElement>(null);

  // Live Certificate snapshot state
  const [certHtml, setCertHtml] = useState<string>('');
  const [certDimensions, setCertDimensions] = useState<{ width: number; height: number }>({
    width: 1050,
    height: 742,
  });

  // Printable area sizing ref & state
  const printableAreaRef = useRef<HTMLDivElement>(null);
  const [printableSize, setPrintableSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  // Get physical paper dimensions in mm
  const getPaperDimensionsMm = () => {
    let w = 297;
    let h = 210;

    if (paperSize === 'A4') {
      w = 297;
      h = 210;
    } else if (paperSize === 'A3') {
      w = 420;
      h = 297;
    } else if (paperSize === 'A5') {
      w = 210;
      h = 148;
    } else if (paperSize === 'Letter') {
      w = 279;
      h = 216;
    } else if (paperSize === 'Legal') {
      w = 356;
      h = 216;
    } else if (paperSize === 'Custom') {
      w = customWidthMm;
      h = customHeightMm;
    }

    if (orientation === 'portrait') {
      return { width: Math.min(w, h), height: Math.max(w, h) };
    } else {
      return { width: Math.max(w, h), height: Math.min(w, h) };
    }
  };

  const paperDim = getPaperDimensionsMm();
  const paperAspectRatio = paperDim.width / paperDim.height;

  // Synchronize default paper orientation with certificate aspect ratio on modal open
  useEffect(() => {
    if (isOpen) {
      if (certificateData.aspectRatio === 'A4-portrait') {
        setOrientation('portrait');
      } else {
        setOrientation('landscape');
      }
    }
  }, [isOpen, certificateData.aspectRatio]);

  // Capture live certificate node on modal open or certificate data update
  useEffect(() => {
    if (isOpen) {
      const dims = getCertificateDimensions(certificateData.aspectRatio);
      setCertDimensions({ width: dims.baseWidth, height: dims.baseHeight });

      const origCert = document.getElementById('certificate-print-area');
      if (origCert) {
        // Clone element cleanly keeping id="certificate-print-area" so all CSS rules apply
        const clone = origCert.cloneNode(true) as HTMLElement;
        clone.style.transform = 'none';
        clone.style.margin = '0';
        clone.style.position = 'relative';
        clone.style.boxShadow = 'none';
        clone.style.width = `${dims.baseWidth}px`;
        clone.style.height = `${dims.baseHeight}px`;
        setCertHtml(clone.outerHTML);
      }
    }
  }, [isOpen, certificateData]);

  // Screen Viewport Auto-Fit Calculator
  const handleAutoFitToScreen = () => {
    if (!viewportContainerRef.current) return;
    const rect = viewportContainerRef.current.getBoundingClientRect();
    const availWidth = rect.width - 40;
    const availHeight = rect.height - 40;

    const basePaperWidth = orientation === 'landscape' ? 760 : 520;
    const basePaperHeight = basePaperWidth / paperAspectRatio;

    if (availWidth > 0 && availHeight > 0) {
      const fitRatioX = availWidth / basePaperWidth;
      const fitRatioY = availHeight / basePaperHeight;
      const calculatedFit = Math.min(fitRatioX, fitRatioY) * 0.92;
      
      setPreviewZoom(Math.min(Math.max(calculatedFit, 0.35), 2.2));
      setPanOffset({ x: 0, y: 0 });
    }
  };

  // Recalculate screen fit when modal opens, paper size changes, or window resizes
  useEffect(() => {
    if (isOpen && isAutoFitScreen) {
      const timer = setTimeout(() => {
        handleAutoFitToScreen();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, paperSize, orientation, isAutoFitScreen]);

  // ResizeObserver on preview viewport container
  useEffect(() => {
    if (!viewportContainerRef.current) return;

    const observer = new ResizeObserver(() => {
      if (isAutoFitScreen) {
        handleAutoFitToScreen();
      }
    });

    observer.observe(viewportContainerRef.current);
    return () => observer.disconnect();
  }, [isAutoFitScreen, paperSize, orientation]);

  // Handle ResizeObserver on printable area container
  useEffect(() => {
    if (!printableAreaRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect) {
          setPrintableSize({
            width: entry.contentRect.width,
            height: entry.contentRect.height,
          });
        }
      }
    });

    observer.observe(printableAreaRef.current);
    return () => observer.disconnect();
  }, [isOpen, paperSize, orientation, marginTop, marginBottom, marginLeft, marginRight]);

  // Handle Preset Margin Changes
  const handleMarginPresetChange = (preset: MarginPreset) => {
    setMarginPreset(preset);
    if (preset === 'none') {
      setMarginTop(0);
      setMarginRight(0);
      setMarginBottom(0);
      setMarginLeft(0);
    } else if (preset === 'narrow') {
      setMarginTop(5);
      setMarginRight(5);
      setMarginBottom(5);
      setMarginLeft(5);
    } else if (preset === 'standard') {
      setMarginTop(10);
      setMarginRight(10);
      setMarginBottom(10);
      setMarginLeft(10);
    } else if (preset === 'wide') {
      setMarginTop(20);
      setMarginRight(20);
      setMarginBottom(20);
      setMarginLeft(20);
    }
  };

  // Compute live certificate scale factor inside printable margin box
  const autoFitScale =
    printableSize.width > 0 && printableSize.height > 0
      ? Math.min(
          printableSize.width / certDimensions.width,
          printableSize.height / certDimensions.height
        )
      : 0.35;

  const fitScale = isFitToPage ? autoFitScale : autoFitScale * (scale / 100);

  // Viewport Pan & Drag Event Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isPanMode) return;
    setIsDraggingPan(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    panStartRef.current = { ...panOffset };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingPan) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPanOffset({
      x: panStartRef.current.x + dx,
      y: panStartRef.current.y + dy,
    });
  };

  const handleMouseUp = () => {
    setIsDraggingPan(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isPanMode) return;
    if (e.touches.length === 1) {
      setIsDraggingPan(true);
      dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      panStartRef.current = { ...panOffset };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDraggingPan && e.touches.length === 1) {
      const dx = e.touches[0].clientX - dragStartRef.current.x;
      const dy = e.touches[0].clientY - dragStartRef.current.y;
      setPanOffset({
        x: panStartRef.current.x + dx,
        y: panStartRef.current.y + dy,
      });
    }
  };

  const handleTouchEnd = () => {
    setIsDraggingPan(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey || isPanMode) {
      setIsAutoFitScreen(false);
      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
      setPreviewZoom((prev) => Math.min(Math.max(prev * zoomFactor, 0.3), 2.5));
    }
  };

  const handleResetPreview = () => {
    setIsAutoFitScreen(true);
    handleAutoFitToScreen();
  };

  // Helper to build full printable HTML with auto-scaling to prevent clipping
  const getPrintableDocumentHtml = () => {
    const origCert = document.getElementById('certificate-print-area');
    let printContent = '';

    if (origCert) {
      const clone = origCert.cloneNode(true) as HTMLElement;
      clone.style.transform = 'none';
      clone.style.margin = '0 auto';
      clone.style.boxShadow = 'none';
      clone.style.position = 'relative';
      printContent = clone.outerHTML;
    } else if (certHtml) {
      printContent = certHtml;
    }

    if (!printContent) return null;

    // Collect all stylesheets from main document
    const stylesheets = typeof document !== 'undefined' && document.querySelectorAll
      ? Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
          .map((node) => node.outerHTML)
          .join('\n')
      : '';

    const pagePaperSize = paperSize === 'Custom' 
      ? `${customWidthMm}mm ${customHeightMm}mm` 
      : `${paperSize.toLowerCase()} ${orientation}`;

    const certW = certDimensions.width || 1050;
    const certH = certDimensions.height || 742;

    // Net printable area dimensions in mm
    const netWidthMm = Math.max(10, paperDim.width - marginLeft - marginRight);
    const netHeightMm = Math.max(10, paperDim.height - marginTop - marginBottom);

    // Convert mm to px at standard 96 DPI screen resolution (1mm = 3.7795275591px)
    const printAreaPxWidth = netWidthMm * 3.7795275591;
    const printAreaPxHeight = netHeightMm * 3.7795275591;

    // Exact scale factor guaranteeing 0% clipping/cropping inside margins
    const printAutoScale = Math.min(
      printAreaPxWidth / certW,
      printAreaPxHeight / certH
    );

    const finalPrintScale = isFitToPage ? printAutoScale : printAutoScale * (scale / 100);

    return {
      pagePaperSize,
      certW,
      certH,
      finalPrintScale,
      printContent,
      html: `
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
          <meta charset="utf-8">
          <title>طباعة الشهادة - ${certificateData.studentName || 'طالب'}</title>
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
              transform: scale(${finalPrintScale}) !important;
              transform-origin: center center !important;
              display: flex !important;
              align-items: center !important;
              justify-content: center !important;
              flex-shrink: 0 !important;
              margin: auto !important;
              position: relative !important;
            }
            #certificate-print-area {
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
        </html>
      `
    };
  };

  // Execute Dynamic Print
  const handlePrintNow = () => {
    setIsPrinting(true);
    setTimeout(() => setIsPrinting(false), 3500);

    // Auto-Archive this completed certificate when printed
    try {
      autoArchiveCertificate(certificateData, { event: 'print' });
    } catch (e) {
      console.warn('Auto-archive on print error:', e);
    }

    const docData = getPrintableDocumentHtml();
    if (!docData || !docData.html) {
      alert('لم يتم العثور على محتوى الشهادة للطباعة');
      return;
    }

    // Method A: Dedicated Print Iframe (Cross-browser reliable inside iframe previews)
    try {
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
        iframeDoc.write(docData.html);
        iframeDoc.close();

        setTimeout(() => {
          try {
            if (printIframe && printIframe.contentWindow) {
              printIframe.contentWindow.focus();
              printIframe.contentWindow.print();
            } else {
              window.focus();
              window.print();
            }
          } catch (err) {
            console.warn('Iframe print error, calling window.print directly:', err);
            window.focus();
            window.print();
          }
        }, 300);

        return;
      }
    } catch (err) {
      console.warn('Print iframe creation error:', err);
    }

    // Method B: Fallback to direct window.print override
    const existingStyle = document.getElementById('dynamic-print-override');
    if (existingStyle) existingStyle.remove();

    const existingContainer = document.getElementById('direct-print-container');
    if (existingContainer) existingContainer.remove();

    const printContainer = document.createElement('div');
    printContainer.id = 'direct-print-container';
    printContainer.innerHTML = `<div class="printable-cert-scaler">${docData.printContent}</div>`;
    document.body.appendChild(printContainer);

    const styleEl = document.createElement('style');
    styleEl.id = 'dynamic-print-override';
    styleEl.textContent = `
      @media print {
        @page {
          size: ${docData.pagePaperSize} !important;
          margin: ${marginTop}mm ${marginRight}mm ${marginBottom}mm ${marginLeft}mm !important;
        }
        .no-print, [role="dialog"], .print-preview-modal-root { display: none !important; }
        body > *:not(#direct-print-container) { visibility: hidden !important; }
        #direct-print-container, #direct-print-container * { visibility: visible !important; }
        #direct-print-container {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          overflow: hidden !important;
        }
        .printable-cert-scaler {
          width: ${docData.certW}px !important;
          height: ${docData.certH}px !important;
          transform: scale(${docData.finalPrintScale}) !important;
          transform-origin: center center !important;
          margin: auto !important;
        }
      }
    `;
    document.head.appendChild(styleEl);

    setTimeout(() => {
      window.focus();
      window.print();
    }, 150);
  };

  // Open in new print tab fallback (for environments where iframe printing is strictly blocked)
  const handleOpenPrintTab = () => {
    const docData = getPrintableDocumentHtml();
    if (!docData || !docData.html) {
      alert('لم يتم العثور على محتوى الشهادة للطباعة');
      return;
    }

    const printWin = window.open('', '_blank');
    if (printWin) {
      printWin.document.write(docData.html);
      printWin.document.close();
      setTimeout(() => {
        if (printWin) {
          printWin.focus();
          printWin.print();
        }
      }, 350);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[99999] no-print print-preview-modal-root bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-5 dir-rtl overflow-hidden animate-in fade-in duration-200"
    >
      <div className="bg-white w-full max-w-6xl h-[94vh] rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <Printer className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg flex items-center gap-2 text-white">
                معاينة وإعدادات الطباعة المباشرة
                <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                  فائقة الدقة
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                عاين حجم الورق الحقيقي، الهوامش، والمقياس تلقائياً مع خيار طباعة فورية
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Main Body */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 divide-y lg:divide-y-0 lg:divide-x lg:divide-x-reverse divide-slate-200 overflow-hidden">
          
          {/* Controls Panel */}
          <div className="lg:col-span-5 xl:col-span-4 p-4 sm:p-5 overflow-y-auto space-y-4 bg-slate-50/60">
            
            {/* 1. Paper Size Selector */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2.5">
              <label className="text-xs font-bold text-slate-900 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-amber-600" />
                  حجم الورق (Paper Size):
                </span>
                <span className="text-[11px] font-bold text-slate-500">
                  {paperDim.width} × {paperDim.height} مم
                </span>
              </label>

              <div className="grid grid-cols-3 gap-1.5">
                {(['A4', 'A3', 'A5', 'Letter', 'Legal', 'Custom'] as PaperSize[]).map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => setPaperSize(sz)}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition text-center ${
                      paperSize === sz
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
                    }`}
                  >
                    {sz === 'A4' && 'A4 (القياسي)'}
                    {sz === 'A3' && 'A3 (كبير)'}
                    {sz === 'A5' && 'A5 (صغير)'}
                    {sz === 'Letter' && 'Letter'}
                    {sz === 'Legal' && 'Legal'}
                    {sz === 'Custom' && 'مخصص'}
                  </button>
                ))}
              </div>

              {paperSize === 'Custom' && (
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-1">العرض (مم)</label>
                    <input
                      type="number"
                      value={customWidthMm}
                      onChange={(e) => setCustomWidthMm(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-1">الارتفاع (مم)</label>
                    <input
                      type="number"
                      value={customHeightMm}
                      onChange={(e) => setCustomHeightMm(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 2. Orientation Selector */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2.5">
              <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <RotateCw className="w-4 h-4 text-amber-600" />
                اتجاه ورقة الطباعة (Orientation):
              </label>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setOrientation('landscape')}
                  className={`p-2.5 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-2 ${
                    orientation === 'landscape'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
                  }`}
                >
                  <div className="w-5 h-3.5 border-2 border-current rounded-xs" />
                  أفقي (Landscape)
                </button>

                <button
                  type="button"
                  onClick={() => setOrientation('portrait')}
                  className={`p-2.5 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-2 ${
                    orientation === 'portrait'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
                  }`}
                >
                  <div className="w-3.5 h-5 border-2 border-current rounded-xs" />
                  عمودي (Portrait)
                </button>
              </div>
            </div>

            {/* 3. Margins Selector (الهوامش) */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Scissors className="w-4 h-4 text-amber-600" />
                  هوامش الطباعة (Margins):
                </label>
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  {marginTop} مم
                </span>
              </div>

              {/* Presets */}
              <div className="grid grid-cols-5 gap-1">
                {[
                  { id: 'none', label: '0 مم' },
                  { id: 'narrow', label: 'ضيقة 5' },
                  { id: 'standard', label: 'قياسية 10' },
                  { id: 'wide', label: 'واسعة 20' },
                  { id: 'custom', label: 'مخصص' },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleMarginPresetChange(p.id as MarginPreset)}
                    className={`py-1.5 px-1 rounded-lg text-[10px] font-bold border transition text-center truncate ${
                      marginPreset === p.id
                        ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Custom Margin Sliders */}
              {marginPreset === 'custom' && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="flex justify-between text-[10px] font-bold text-slate-600 mb-0.5">
                        <span>أعلى (Top)</span>
                        <span>{marginTop} مم</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="50"
                        value={marginTop}
                        onChange={(e) => setMarginTop(Number(e.target.value))}
                        className="w-full accent-amber-600 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[10px] font-bold text-slate-600 mb-0.5">
                        <span>أسفل (Bottom)</span>
                        <span>{marginBottom} مم</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="50"
                        value={marginBottom}
                        onChange={(e) => setMarginBottom(Number(e.target.value))}
                        className="w-full accent-amber-600 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[10px] font-bold text-slate-600 mb-0.5">
                        <span>يمين (Right)</span>
                        <span>{marginRight} مم</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="50"
                        value={marginRight}
                        onChange={(e) => setMarginRight(Number(e.target.value))}
                        className="w-full accent-amber-600 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[10px] font-bold text-slate-600 mb-0.5">
                        <span>يسار (Left)</span>
                        <span>{marginLeft} مم</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="50"
                        value={marginLeft}
                        onChange={(e) => setMarginLeft(Number(e.target.value))}
                        className="w-full accent-amber-600 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 4. Scale & Fit Options */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
              <label className="text-xs font-bold text-slate-900 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-amber-600" />
                  مقياس الشهادة داخل الورقة:
                </span>
                <span className="text-[10px] font-bold text-slate-600">
                  {scale}%
                </span>
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsFitToPage(true)}
                  className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold border transition text-center ${
                    isFitToPage
                      ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
                  }`}
                >
                  احتواء تلقائي للورقة (Fit Paper)
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsFitToPage(false);
                    setScale(100);
                  }}
                  className={`py-1.5 px-3 rounded-xl text-xs font-bold border transition text-center ${
                    !isFitToPage && scale === 100
                      ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
                  }`}
                >
                  100% الأصلي
                </button>
              </div>

              {!isFitToPage && (
                <div>
                  <input
                    type="range"
                    min="50"
                    max="150"
                    value={scale}
                    onChange={(e) => setScale(Number(e.target.value))}
                    className="w-full accent-amber-600 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer mt-1"
                  />
                </div>
              )}
            </div>

            {/* 5. Screen Auto-Fit Option */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5 cursor-pointer">
                  <Monitor className="w-4 h-4 text-amber-600" />
                  معاينة تلقائية حسب الشاشة الحالية:
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const next = !isAutoFitScreen;
                    setIsAutoFitScreen(next);
                    if (next) handleAutoFitToScreen();
                  }}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isAutoFitScreen ? 'bg-amber-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      isAutoFitScreen ? 'translate-x-0' : '-translate-x-4'
                    }`}
                  />
                </button>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                ضبط حجم أبعاد الورقة تلقائياً لتناسب مساحة الشاشة المعروضة بشكل مريح ومقروء.
              </p>
            </div>

            {/* 6. Print Quality & Toggles */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2.5">
              <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-amber-600" />
                خيارات جودة وألوان الطباعة:
              </label>

              <div className="space-y-2 pt-1">
                <label className="flex items-center justify-between text-xs font-semibold text-slate-800 cursor-pointer p-1.5 hover:bg-slate-50 rounded-xl transition">
                  <span className="flex items-center gap-2">
                    <Droplet className="w-3.5 h-3.5 text-amber-600" />
                    طباعة الخلفيات والألوان الجميلة
                  </span>
                  <input
                    type="checkbox"
                    checked={printBackgrounds}
                    onChange={(e) => setPrintBackgrounds(e.target.checked)}
                    className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between text-xs font-semibold text-slate-800 cursor-pointer p-1.5 hover:bg-slate-50 rounded-xl transition">
                  <span className="flex items-center gap-2">
                    <Scissors className="w-3.5 h-3.5 text-amber-600" />
                    إظهار علامات القص والتحديد (Crop Marks)
                  </span>
                  <input
                    type="checkbox"
                    checked={showCropMarks}
                    onChange={(e) => setShowCropMarks(e.target.checked)}
                    className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
                  />
                </label>

                <div className="flex items-center justify-between pt-1 text-xs font-semibold text-slate-800">
                  <span>وضع الألوان:</span>
                  <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setColorMode('color')}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        colorMode === 'color' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                      }`}
                    >
                      ملون (Color)
                    </button>
                    <button
                      type="button"
                      onClick={() => setColorMode('grayscale')}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        colorMode === 'grayscale' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                      }`}
                    >
                      رمادي / أسود
                    </button>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Paper Preview Canvas Area */}
          <div className="lg:col-span-7 xl:col-span-8 p-3 sm:p-5 bg-slate-950 flex flex-col items-center justify-between relative overflow-hidden select-none">
            
            {/* Top Interactive Toolbar */}
            <div className="w-full flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300 bg-slate-900/90 px-3.5 py-2 rounded-2xl border border-slate-800/80 backdrop-blur-md shadow-xl z-30">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 font-bold text-amber-400">
                  <Eye className="w-4 h-4" />
                  معاينة الورقة
                </span>
                <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                  {paperSize} ({paperDim.width}×{paperDim.height} مم)
                </span>
              </div>

              {/* Viewport Interactive Pan, Screen Fit & Zoom Controls */}
              <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 flex-wrap">
                
                {/* Auto Screen Fit Button */}
                <button
                  type="button"
                  onClick={() => {
                    setIsAutoFitScreen(true);
                    handleAutoFitToScreen();
                  }}
                  title="ملاءمة مقاس الورقة تلقائياً حسب حجم الشاشة الحالية"
                  className={`p-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                    isAutoFitScreen
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span className="text-[11px]">معاينة الشاشة</span>
                </button>

                <div className="w-px h-4 bg-slate-800 my-auto hidden sm:block" />

                {/* Hand Pan Mode Button */}
                <button
                  type="button"
                  onClick={() => setIsPanMode(!isPanMode)}
                  title="تفعيل / إيقاف وضع سحب الورقة بالماوس"
                  className={`p-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                    isPanMode && !isAutoFitScreen
                      ? 'bg-slate-800 text-amber-400 border border-amber-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Hand className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span className="hidden sm:inline text-[11px]">سحب</span>
                </button>

                <div className="w-px h-4 bg-slate-800 my-auto" />

                <button
                  type="button"
                  onClick={() => {
                    setIsAutoFitScreen(false);
                    setPreviewZoom((z) => Math.min(z + 0.15, 2.5));
                  }}
                  title="تكبير المعاينة"
                  className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>

                <span className="text-[10px] font-mono font-bold text-amber-300 px-1">
                  {Math.round(previewZoom * 100)}%
                </span>

                <button
                  type="button"
                  onClick={() => {
                    setIsAutoFitScreen(false);
                    setPreviewZoom((z) => Math.max(z - 0.15, 0.3));
                  }}
                  title="تصغير المعاينة"
                  className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>

                <div className="w-px h-4 bg-slate-800 my-auto" />

                <button
                  type="button"
                  onClick={handleResetPreview}
                  title="إعادة ضبط المعاينة وتمركز الورقة"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden md:inline text-[10px]">تمركز</span>
                </button>
              </div>
            </div>

            {/* Paper Viewport - Interactive Dragging Canvas Container */}
            <div
              ref={viewportContainerRef}
              className={`flex-1 w-full flex items-center justify-center p-2 sm:p-4 relative overflow-hidden min-h-[360px] ${
                isPanMode ? (isDraggingPan ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'
              }`}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onWheel={handleWheel}
            >
              {/* Pan & Zoom Transformed Container */}
              <div
                className="relative transition-transform duration-75 ease-out flex items-center justify-center"
                style={{
                  transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${previewZoom})`,
                  transformOrigin: 'center center',
                }}
              >
                {/* Simulated Physical Paper Sheet Box */}
                <div
                  className="bg-white relative transition-all duration-300 flex items-center justify-center box-border overflow-hidden rounded-xs border border-slate-300 shadow-2xl"
                  style={{
                    aspectRatio: `${paperAspectRatio}`,
                    width: orientation === 'landscape' ? '760px' : '520px',
                    filter: colorMode === 'grayscale' ? 'grayscale(100%)' : 'none',
                    boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.2)'
                  }}
                >
                  {/* Printable Area Margin Box */}
                  <div
                    ref={printableAreaRef}
                    className="absolute border-2 border-dashed border-red-500/70 transition-all duration-300 z-20 overflow-hidden flex items-center justify-center"
                    style={{
                      top: `${(marginTop / paperDim.height) * 100}%`,
                      bottom: `${(marginBottom / paperDim.height) * 100}%`,
                      right: `${(marginRight / paperDim.width) * 100}%`,
                      left: `${(marginLeft / paperDim.width) * 100}%`,
                    }}
                  >
                    <span className="absolute top-1 right-2 text-[9px] font-mono font-bold text-red-600 bg-white/95 px-1.5 py-0.5 rounded shadow-2xs z-30 pointer-events-none">
                      منطقة الطباعة الآمنة ({marginTop}mm)
                    </span>

                    {/* Scaled & Centered Live Certificate Snapshot */}
                    {certHtml && fitScale > 0 ? (
                      <div
                        className="absolute top-1/2 left-1/2 pointer-events-none flex items-center justify-center transition-transform duration-150"
                        style={{
                          width: `${certDimensions.width}px`,
                          height: `${certDimensions.height}px`,
                          transform: `translate(-50%, -50%) scale(${fitScale})`,
                          transformOrigin: 'center center',
                        }}
                        dangerouslySetInnerHTML={{ __html: certHtml }}
                      />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 p-6">
                        <RefreshCw className="w-8 h-8 animate-spin text-amber-500 mb-2" />
                        <p className="text-xs font-bold">جاري تحميل المعاينة المباشرة للشهادة...</p>
                      </div>
                    )}
                  </div>

                  {/* Corner Crop Marks */}
                  {showCropMarks && (
                    <>
                      <div className="absolute top-2 left-2 w-5 h-5 border-t-2 border-l-2 border-slate-900 z-30 pointer-events-none" />
                      <div className="absolute top-2 right-2 w-5 h-5 border-t-2 border-r-2 border-slate-900 z-30 pointer-events-none" />
                      <div className="absolute bottom-2 left-2 w-5 h-5 border-b-2 border-l-2 border-slate-900 z-30 pointer-events-none" />
                      <div className="absolute bottom-2 right-2 w-5 h-5 border-b-2 border-r-2 border-slate-900 z-30 pointer-events-none" />
                    </>
                  )}
                </div>
              </div>

            </div>

            {/* Bottom Tip & Interactive Badge Bar */}
            <div className="w-full mt-2 text-[11px] text-slate-400 bg-slate-900/80 p-2.5 rounded-2xl border border-slate-800 flex items-center justify-between gap-2 z-30">
              <span className="flex items-center gap-1.5 text-slate-300">
                <Hand className="w-4 h-4 text-amber-400 shrink-0" />
                تستطيع سحب ورقة المعاينة بحرية بالماوس أو اللمس، واستخدام زر "معاينة الشاشة" للملاءمة التلقائية.
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsAutoFitScreen(true);
                  handleAutoFitToScreen();
                }}
                className="text-[10px] text-amber-300 font-bold bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1 rounded-lg border border-amber-500/20 transition cursor-pointer whitespace-nowrap"
              >
                تمركز الشاشة 🖥️
              </button>
            </div>

          </div>

        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 bg-slate-900 text-white border-t border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs transition cursor-pointer"
          >
            إلغاء
          </button>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="hidden md:flex items-center gap-2 text-xs font-bold text-slate-400 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
              <span>الورق: {paperSize} ({orientation === 'landscape' ? 'أفقي' : 'عمودي'})</span>
              <span>•</span>
              <span>الهامش: {marginTop} مم</span>
            </div>

            <button
              type="button"
              onClick={handleOpenPrintTab}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer border border-amber-500/20"
              title="فتح صفحة الشهادة في تبويب جديد مستقل للطباعة"
            >
              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
              <span>نافذة منفصلة</span>
            </button>

            <button
              type="button"
              onClick={handlePrintNow}
              disabled={isPrinting}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs sm:text-sm shadow-lg hover:shadow-amber-500/20 flex items-center gap-2 transition cursor-pointer active:scale-95 disabled:opacity-75"
            >
              {isPrinting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin stroke-[2.5]" />
                  جاري فتح الطباعة...
                </>
              ) : (
                <>
                  <Printer className="w-4 h-4 stroke-[2.5]" />
                  طباعة الآن
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
