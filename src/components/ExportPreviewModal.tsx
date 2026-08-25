import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Download,
  FileText,
  Image as ImageIcon,
  Sparkles,
  Layers,
  Settings2,
  CheckCircle2,
  Copy,
  Printer,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RefreshCw,
  Cpu,
  Zap,
  Sliders,
  ShieldCheck,
  Award,
  AlertCircle,
  HelpCircle,
  FileCheck2,
  Monitor,
  Check,
  Minimize2
} from 'lucide-react';
import { CertificateData, ExportEngine, ExportFormat, ExportOptions } from '../types';
import { CertificateCanvas } from './CertificateCanvas';
import {
  EXPORT_ENGINES,
  EngineInfo,
  getCertificateDimensions,
  exportCertificateUnified,
  copyCertificateToClipboard,
  findCertificateCanvasElement,
  getCleanStudentFileName
} from '../utils/exportUtils';
import { getSavedDefaultSettings, saveDefaultSettingsToStorage } from '../utils/defaultSettings';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  certificateData: CertificateData;
  initialFormat?: ExportFormat;
  canvasRef?: React.RefObject<HTMLDivElement | null>;
  onShowToast?: (msg: string) => void;
}

export const ExportPreviewModal: React.FC<Props> = ({
  isOpen,
  onClose,
  certificateData,
  initialFormat = 'pdf',
  canvasRef,
  onShowToast
}) => {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>(initialFormat);
  const [selectedEngine, setSelectedEngine] = useState<ExportEngine>('html2canvas');
  const [selectedDpi, setSelectedDpi] = useState<number>(300);
  const [quality, setQuality] = useState<number>(0.95);
  const [transparentBg, setTransparentBg] = useState<boolean>(false);
  const [includeVerification, setIncludeVerification] = useState<boolean>(true);
  const [customFileName, setCustomFileName] = useState<string>('');
  const [saveAsDefault, setSaveAsDefault] = useState<boolean>(false);
  
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isCopying, setIsCopying] = useState<boolean>(false);
  const [copiedSuccess, setCopiedSuccess] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<string>('');
  const [previewZoom, setPreviewZoom] = useState<number>(1);
  const [renderCounter, setRenderCounter] = useState<number>(0);
  const [livePreviewHtml, setLivePreviewHtml] = useState<string>('');
  const [isFullscreenPreview, setIsFullscreenPreview] = useState<boolean>(false);

  const previewContainerRef = useRef<HTMLDivElement>(null);
  const internalOffscreenRef = useRef<HTMLDivElement>(null);

  // Load saved default export preferences
  useEffect(() => {
    if (isOpen) {
      const defaults = getSavedDefaultSettings();
      if (defaults.defaultExportEngine) {
        setSelectedEngine(defaults.defaultExportEngine);
      }
      if (defaults.exportDpi) {
        setSelectedDpi(defaults.exportDpi);
      }
      if (defaults.exportImageQuality) {
        setQuality(defaults.exportImageQuality);
      }
      if (initialFormat) {
        setSelectedFormat(initialFormat);
      } else if (defaults.exportFormat) {
        setSelectedFormat(defaults.exportFormat);
      }
      
      const defaultName = getCleanStudentFileName(
        certificateData.studentName,
        'شهادة_تقدير',
        initialFormat || defaults.exportFormat || 'pdf'
      );
      setCustomFileName(defaultName.replace(/\.[^/.]+$/, ''));
    }
  }, [isOpen, certificateData, initialFormat]);

  const dims = getCertificateDimensions(certificateData.aspectRatio);

  // Capture live certificate snapshot from the actual DOM for 100% accurate preview
  useEffect(() => {
    if (isOpen) {
      const captureSnapshot = () => {
        const origCert = 
          (canvasRef?.current ? canvasRef.current.querySelector('#certificate-print-area') || canvasRef.current.querySelector('[data-certificate-canvas="true"]') : null) ||
          internalOffscreenRef.current?.querySelector('#certificate-print-area') ||
          internalOffscreenRef.current?.querySelector('[data-certificate-canvas="true"]') ||
          document.getElementById('certificate-print-area') ||
          document.querySelector('[data-certificate-canvas="true"]');

        if (origCert) {
          const clone = origCert.cloneNode(true) as HTMLElement;
          clone.style.transform = 'none';
          clone.style.margin = '0';
          clone.style.position = 'relative';
          clone.style.boxShadow = 'none';
          clone.style.width = `${dims.baseWidth}px`;
          clone.style.height = `${dims.baseHeight}px`;
          
          // Remove active editing handles and editor control elements from clean preview
          clone.querySelectorAll('.drag-handle, [data-editor-control], .selection-box').forEach((el) => {
            el.remove();
          });
          
          setLivePreviewHtml(clone.outerHTML);
        }
      };

      captureSnapshot();
      const t1 = setTimeout(captureSnapshot, 60);
      const t2 = setTimeout(captureSnapshot, 200);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [isOpen, certificateData, renderCounter, canvasRef, dims.baseWidth, dims.baseHeight]);

  // Adjust zoom for preview container size (Auto-fit to available container space)
  const handleAutoFit = () => {
    if (previewContainerRef.current && dims.baseWidth > 0 && dims.baseHeight > 0) {
      const containerRect = previewContainerRef.current.getBoundingClientRect();
      const containerWidth = containerRect.width - 28;
      const containerHeight = containerRect.height - 28;
      if (containerWidth > 0 && containerHeight > 0) {
        const scaleX = containerWidth / dims.baseWidth;
        const scaleY = containerHeight / dims.baseHeight;
        const fitScale = Math.min(scaleX, scaleY);
        setPreviewZoom(Math.max(0.2, Math.min(1.2, fitScale)));
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(handleAutoFit, 80);
      return () => clearTimeout(timer);
    }
  }, [isOpen, certificateData.aspectRatio, renderCounter, isFullscreenPreview]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isExporting) {
        if (isFullscreenPreview) {
          setIsFullscreenPreview(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isExporting, isFullscreenPreview, onClose]);

  if (!isOpen) return null;

  const currentEngineInfo = EXPORT_ENGINES.find((e) => e.id === selectedEngine) || EXPORT_ENGINES[0];

  // Calculate pixel dimensions based on chosen DPI
  const scaleMultiplier = selectedDpi / 100;
  const exportPixelWidth = Math.round(dims.baseWidth * scaleMultiplier);
  const exportPixelHeight = Math.round(dims.baseHeight * scaleMultiplier);

  // Filter available engines for selected format
  const compatibleEngines = EXPORT_ENGINES.filter((engine) =>
    engine.formats.includes(selectedFormat)
  );

  // If currently selected engine does not support selected format, switch to first compatible
  const effectiveEngine = compatibleEngines.some((e) => e.id === selectedEngine)
    ? selectedEngine
    : compatibleEngines[0]?.id || 'html2canvas';

  const handleExecuteExport = async () => {
    setIsExporting(true);
    setExportProgress('جاري استخراج وتحضير لوحة الشهادة من المعاينة الحية...');

    try {
      await new Promise((resolve) => setTimeout(resolve, 150));
      let element: HTMLElement;
      try {
        element = await findCertificateCanvasElement(canvasRef, 12, 60);
      } catch (findErr) {
        const offscreenEl = internalOffscreenRef.current?.querySelector('#certificate-print-area') ||
          internalOffscreenRef.current?.querySelector('[data-certificate-canvas="true"]');
        if (offscreenEl) {
          element = offscreenEl as HTMLElement;
        } else {
          throw findErr;
        }
      }
      
      setExportProgress(`جاري المعالجة عبر محرك [${currentEngineInfo.name}] بدقة ${selectedDpi} DPI...`);

      const exportOptions: ExportOptions = {
        engine: effectiveEngine,
        format: selectedFormat,
        dpi: selectedDpi,
        scale: selectedDpi / 100,
        quality: quality,
        transparentBg: transparentBg,
        fileName: customFileName ? `${customFileName}.${selectedFormat}` : undefined,
        includeVerificationInExport: includeVerification
      };

      const res = await exportCertificateUnified(element, certificateData, exportOptions);

      if (saveAsDefault) {
        const defaults = getSavedDefaultSettings();
        saveDefaultSettingsToStorage({
          ...defaults,
          exportFormat: selectedFormat,
          defaultExportEngine: effectiveEngine,
          exportDpi: selectedDpi as any,
          exportImageQuality: quality
        });
      }

      if (onShowToast) {
        onShowToast(`تم تصدير وحفظ [${res.fileName}] بنجاح فائق! ✨`);
      }

      setTimeout(() => {
        onClose();
      }, 600);
    } catch (err: any) {
      console.error('Export Unified Error:', err);
      if (onShowToast) {
        onShowToast(`حدث خطأ أثناء التصدير: ${err?.message || 'يرجى تجربة محرك آخر'}`);
      }
    } finally {
      setIsExporting(false);
      setExportProgress('');
    }
  };

  const handleCopyToClipboard = async () => {
    setIsCopying(true);
    try {
      let element: HTMLElement;
      try {
        element = await findCertificateCanvasElement(canvasRef, 12, 60);
      } catch (findErr) {
        const offscreenEl = internalOffscreenRef.current?.querySelector('#certificate-print-area') ||
          internalOffscreenRef.current?.querySelector('[data-certificate-canvas="true"]');
        if (offscreenEl) {
          element = offscreenEl as HTMLElement;
        } else {
          throw findErr;
        }
      }
      await copyCertificateToClipboard(element, certificateData, {
        engine: effectiveEngine,
        dpi: selectedDpi,
        scale: selectedDpi / 100,
        transparentBg
      });
      setCopiedSuccess(true);
      if (onShowToast) {
        onShowToast('تم نسخ صورة الشهادة فائقة النقاء إلى الحافظة بنجاح! 📋');
      }
      setTimeout(() => setCopiedSuccess(false), 2500);
    } catch (err: any) {
      console.error('Clipboard copy error:', err);
      if (onShowToast) {
        onShowToast('تعذر النسخ المباشر للحافظة في هذا المتصفح');
      }
    } finally {
      setIsCopying(false);
    }
  };

  const handlePrintDirect = () => {
    window.print();
  };

  return (
    <div
      id="export-preview-modal-overlay"
      className="fixed inset-0 z-[70] flex items-center justify-center p-2 sm:p-3 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
      dir="rtl"
    >
      <div
        id="export-preview-modal-container"
        className={`bg-slate-900 border border-slate-700/80 w-full rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100 transition-all ${
          isFullscreenPreview
            ? 'fixed inset-2 z-[70] max-w-none max-h-none h-[calc(100vh-16px)]'
            : 'max-w-6xl max-h-[95vh]'
        }`}
      >
        {/* Compact Header */}
        <div className="flex items-center justify-between px-3.5 sm:px-5 py-2.5 bg-slate-900 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center text-slate-950 font-black shadow-sm">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white font-['Cairo'] leading-none">
                  مركز تصدير ومعاينة الشهادة فائق الدقة
                </h3>
                <span className="text-[9px] bg-amber-500/15 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded-md font-bold">
                  Ultra HD
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 hidden sm:block">
                معاينة حية دقيقة 100% مع تحكم كامل في صيغة ومحرك وجودة التصدير
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsFullscreenPreview((f) => !f)}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition text-xs flex items-center gap-1"
              title={isFullscreenPreview ? 'تصغير النافذة' : 'تكبير ملء الشاشة'}
            >
              {isFullscreenPreview ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              disabled={isExporting}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer disabled:opacity-50"
              title="إغلاق النافذة"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Main Body */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 min-h-0 divide-y lg:divide-y-0 lg:divide-x lg:divide-x-reverse divide-slate-800">
          
          {/* Left Column: Live Canvas Preview (Larger Area) */}
          <div className="lg:col-span-7 p-3 sm:p-4 flex flex-col bg-slate-950/70 overflow-hidden">
            {/* Compact Preview Toolbar */}
            <div className="flex items-center justify-between gap-1.5 mb-2 bg-slate-900/90 px-2.5 py-1.5 rounded-xl border border-slate-800 shrink-0">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-300">
                <Monitor className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="font-bold">المعاينة الحية المتطابقة</span>
                <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">
                  {dims.label}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPreviewZoom((z) => Math.max(0.2, Number((z - 0.08).toFixed(2))))}
                  className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition text-xs cursor-pointer"
                  title="تصغير المعاينة"
                >
                  <ZoomOut className="w-3 h-3" />
                </button>
                <span className="text-[10px] font-mono font-bold text-amber-400 px-1 min-w-9 text-center">
                  {Math.round(previewZoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setPreviewZoom((z) => Math.min(1.6, Number((z + 0.08).toFixed(2))))}
                  className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition text-xs cursor-pointer"
                  title="تكبير المعاينة"
                >
                  <ZoomIn className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={handleAutoFit}
                  className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-300 rounded-md transition text-[10px] font-bold cursor-pointer"
                  title="ملاءمة لحجم الشاشة"
                >
                  ملاءمة
                </button>
                <button
                  type="button"
                  onClick={() => setRenderCounter((c) => c + 1)}
                  className="p-1 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-md transition cursor-pointer"
                  title="تحديث المعاينة من المحرر"
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Scrollable / Zoomable Live Preview Stage */}
            <div
              ref={previewContainerRef}
              className="flex-1 min-h-[240px] sm:min-h-[350px] bg-slate-900/95 rounded-xl border border-slate-800/90 p-2 sm:p-3 flex items-center justify-center overflow-auto relative shadow-inner"
            >
              {/* Scaled Preview Frame */}
              <div
                style={{
                  transform: `scale(${previewZoom})`,
                  transformOrigin: 'center center',
                  transition: 'transform 0.1s ease-out'
                }}
                className="relative shrink-0 shadow-2xl rounded-sm overflow-hidden border border-slate-700/60 pointer-events-none select-none"
              >
                {livePreviewHtml ? (
                  <div
                    id="certificate-export-preview-live"
                    dangerouslySetInnerHTML={{ __html: livePreviewHtml }}
                    className="overflow-hidden"
                    style={{
                      width: `${dims.baseWidth}px`,
                      height: `${dims.baseHeight}px`,
                      direction: 'rtl'
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: `${dims.baseWidth}px`,
                      height: `${dims.baseHeight}px`,
                      backgroundColor: certificateData.backgroundColor || '#ffffff',
                      direction: 'rtl'
                    }}
                    className="relative overflow-hidden flex flex-col justify-between p-6"
                  >
                    <div className="flex items-center justify-between text-[11px] border-b border-amber-900/15 pb-2">
                      <span className="font-bold">{certificateData.schoolName || 'مدرسة التميز'}</span>
                      <span className="font-mono text-[9px]">{certificateData.issueDate || '1447 هـ'}</span>
                    </div>
                    <div className="text-center my-auto space-y-2 py-4">
                      <h2 className="text-2xl font-black">{certificateData.title || 'شهادة شكر وتقدير'}</h2>
                      <div className="text-xl font-bold text-amber-800">{certificateData.studentName || 'اسم الطالب'}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Compact Dimension & Paper Stats Bar */}
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-center text-xs shrink-0">
              <div className="bg-slate-900/90 py-1.5 px-2 rounded-lg border border-slate-800/80">
                <span className="text-[9px] text-slate-400 block">المقاس القياسي</span>
                <span className="font-bold text-amber-300 text-[11px]">{dims.widthMm} × {dims.heightMm} مم</span>
              </div>
              <div className="bg-slate-900/90 py-1.5 px-2 rounded-lg border border-slate-800/80">
                <span className="text-[9px] text-slate-400 block">أبعاد التصدير</span>
                <span className="font-mono font-bold text-emerald-400 text-[11px]">{exportPixelWidth} × {exportPixelHeight} px</span>
              </div>
              <div className="bg-slate-900/90 py-1.5 px-2 rounded-lg border border-slate-800/80">
                <span className="text-[9px] text-slate-400 block">كثافة النقط</span>
                <span className="font-bold text-sky-400 text-[11px]">{selectedDpi} DPI</span>
              </div>
              <div className="bg-slate-900/90 py-1.5 px-2 rounded-lg border border-slate-800/80">
                <span className="text-[9px] text-slate-400 block">نسبة الأبعاد</span>
                <span className="font-mono font-bold text-indigo-400 text-[11px]">{dims.aspectRatioValue.toFixed(2)}:1</span>
              </div>
            </div>
          </div>

          {/* Right Column: Engine & Format Configuration (Compact & Sleek Controls) */}
          <div className="lg:col-span-5 p-3 sm:p-4 space-y-3 bg-slate-900 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-3">
              
              {/* 1. Compact Format Selection */}
              <div>
                <label className="block text-[11px] font-bold text-slate-200 mb-1.5 flex items-center justify-between">
                  <span>1. صيغة ونوع الملف</span>
                  <span className="text-[9px] text-amber-400 font-normal">اختر الصيغة المناسبة</span>
                </label>
                <div className="grid grid-cols-5 gap-1">
                  {[
                    { id: 'pdf', label: 'PDF', sub: 'طباعة', icon: FileText, color: 'text-rose-400' },
                    { id: 'png', label: 'PNG', sub: 'نقية', icon: ImageIcon, color: 'text-emerald-400' },
                    { id: 'jpeg', label: 'JPEG', sub: 'مضغوطة', icon: ImageIcon, color: 'text-amber-400' },
                    { id: 'webp', label: 'WebP', sub: 'ويب', icon: Zap, color: 'text-sky-400' },
                    { id: 'svg', label: 'SVG', sub: 'فيكتور', icon: Layers, color: 'text-purple-400' }
                  ].map((fmt) => {
                    const isSelected = selectedFormat === fmt.id;
                    const Icon = fmt.icon;
                    return (
                      <button
                        key={fmt.id}
                        type="button"
                        onClick={() => setSelectedFormat(fmt.id as ExportFormat)}
                        className={`py-1.5 px-1 rounded-lg border flex flex-col items-center justify-center gap-0.5 transition cursor-pointer text-center ${
                          isSelected
                            ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-xs font-black'
                            : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800 hover:border-slate-600'
                        }`}
                      >
                        <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-slate-950' : fmt.color}`} />
                        <span className="text-[11px] font-bold leading-none">{fmt.label}</span>
                        <span className={`text-[8px] ${isSelected ? 'text-slate-900 font-bold' : 'text-slate-400'}`}>{fmt.sub}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Compact Engine Selection */}
              <div>
                <label className="block text-[11px] font-bold text-slate-200 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Cpu className="w-3.5 h-3.5 text-amber-400" />
                    <span>2. محرك ومكتبة التصدير</span>
                  </span>
                  <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">
                    {compatibleEngines.length} محركات
                  </span>
                </label>

                <div className="space-y-1.5 max-h-40 overflow-y-auto no-scrollbar pr-0.5">
                  {compatibleEngines.map((engine) => {
                    const isSelected = effectiveEngine === engine.id;
                    return (
                      <div
                        key={engine.id}
                        onClick={() => setSelectedEngine(engine.id)}
                        className={`p-2 rounded-lg border transition cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500/10 border-amber-500/70 shadow-xs'
                            : 'bg-slate-800/50 border-slate-700/70 hover:bg-slate-800/90'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <div className="flex items-center gap-1.5">
                            <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                              isSelected ? 'border-amber-400 bg-amber-500 text-slate-950' : 'border-slate-600 bg-slate-700'
                            }`}>
                              {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                            </div>
                            <span className="text-[11px] font-bold text-white leading-none">{engine.name}</span>
                          </div>
                          <span className={`text-[8px] px-1.5 py-0.2 rounded-md font-bold border ${engine.badgeColor}`}>
                            {engine.badge}
                          </span>
                        </div>

                        <p className="text-[10px] text-slate-300 mt-1 leading-tight pr-5 line-clamp-1">
                          {engine.description}
                        </p>

                        <div className="flex flex-wrap gap-1 mt-1 pr-5">
                          {engine.features.map((f, i) => (
                            <span key={i} className="text-[8px] bg-slate-900/80 text-slate-400 px-1 py-0.2 rounded font-mono">
                              ✓ {f}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 3. Compact Resolution & DPI Settings */}
              <div>
                <label className="block text-[11px] font-bold text-slate-200 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Sliders className="w-3.5 h-3.5 text-amber-400" />
                    <span>3. دقة التصدير والجودة</span>
                  </span>
                  <span className="text-[9px] text-emerald-400 font-bold">
                    {selectedDpi === 300 ? '⭐ موصى بها' : selectedDpi === 600 ? '👑 دقة قصوى' : '⚡ خفيفة'}
                  </span>
                </label>

                <div className="grid grid-cols-4 gap-1">
                  {[
                    { dpi: 72, label: '72 DPI', scale: '1x Web' },
                    { dpi: 150, label: '150 DPI', scale: '2x HD' },
                    { dpi: 300, label: '300 DPI', scale: '3x Ultra' },
                    { dpi: 600, label: '600 DPI', scale: '4x Master' }
                  ].map((d) => (
                    <button
                      key={d.dpi}
                      type="button"
                      onClick={() => setSelectedDpi(d.dpi)}
                      className={`py-1.5 px-1 rounded-lg border text-center transition cursor-pointer ${
                        selectedDpi === d.dpi
                          ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-xs'
                          : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800'
                      }`}
                    >
                      <div className="text-[11px] font-bold leading-none">{d.label}</div>
                      <div className={`text-[8px] mt-0.5 ${selectedDpi === d.dpi ? 'text-slate-950 font-bold' : 'text-slate-400'}`}>
                        {d.scale}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Quality slider for JPEG / WebP */}
                {(selectedFormat === 'jpeg' || selectedFormat === 'webp') && (
                  <div className="mt-2 bg-slate-800/60 p-2 rounded-lg border border-slate-700/80">
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="text-slate-300 font-bold">نسبة الجودة:</span>
                      <span className="font-mono font-bold text-amber-400">{Math.round(quality * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="1.0"
                      step="0.05"
                      value={quality}
                      onChange={(e) => setQuality(parseFloat(e.target.value))}
                      className="w-full accent-amber-500 h-1.5"
                    />
                  </div>
                )}

                {/* Transparent BG toggle for PNG / SVG */}
                {(selectedFormat === 'png' || selectedFormat === 'svg') && (
                  <label className="flex items-center justify-between mt-2 p-1.5 bg-slate-800/60 rounded-lg border border-slate-700/80 cursor-pointer">
                    <span className="text-[11px] text-slate-300 font-bold">خلفية شفافة (Transparent)</span>
                    <input
                      type="checkbox"
                      checked={transparentBg}
                      onChange={(e) => setTransparentBg(e.target.checked)}
                      className="w-3.5 h-3.5 accent-amber-500 rounded"
                    />
                  </label>
                )}
              </div>

              {/* 4. File Name & Save Preferences */}
              <div className="space-y-1.5 pt-1 border-t border-slate-800">
                <div>
                  <label className="block text-[10px] font-bold text-slate-300 mb-1">اسم الملف عند الحفظ:</label>
                  <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1">
                    <input
                      type="text"
                      value={customFileName}
                      onChange={(e) => setCustomFileName(e.target.value)}
                      placeholder="اسم الملف..."
                      className="bg-transparent text-[11px] font-bold text-white w-full outline-none"
                    />
                    <span className="text-[11px] font-mono font-bold text-amber-400 uppercase">.{selectedFormat}</span>
                  </div>
                </div>

                <label className="flex items-center gap-1.5 text-[10px] text-slate-400 cursor-pointer pt-0.5">
                  <input
                    type="checkbox"
                    checked={saveAsDefault}
                    onChange={(e) => setSaveAsDefault(e.target.checked)}
                    className="w-3 h-3 accent-amber-500 rounded"
                  />
                  <span>حفظ هذا المحرك والدقة كافتراضية لكافة الشهادات</span>
                </label>
              </div>

            </div>

            {/* Compact Action Buttons */}
            <div className="space-y-2 pt-2 border-t border-slate-800 shrink-0">
              {isExporting && exportProgress && (
                <div className="bg-amber-500/10 border border-amber-500/30 p-2 rounded-lg flex items-center gap-2 text-[11px] text-amber-300">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0 text-amber-400" />
                  <span className="font-bold truncate">{exportProgress}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={handleExecuteExport}
                  disabled={isExporting}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white rounded-xl font-bold text-xs shadow-md transition cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{isExporting ? 'جاري الحفظ...' : `تنزيل ${selectedFormat.toUpperCase()} الآن`}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyToClipboard}
                  disabled={isExporting || isCopying}
                  className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl font-bold text-xs border transition cursor-pointer disabled:opacity-50 ${
                    copiedSuccess
                      ? 'bg-emerald-600 text-white border-emerald-500'
                      : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-amber-500/30'
                  }`}
                >
                  {copiedSuccess ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                      <span>تم النسخ! ✓</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-amber-400" />
                      <span>{isCopying ? 'جاري النسخ...' : 'نسخ للحافظة'}</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                <button
                  type="button"
                  onClick={handlePrintDirect}
                  className="flex items-center gap-1 text-slate-300 hover:text-amber-300 transition cursor-pointer"
                >
                  <Printer className="w-3 h-3" />
                  <span>طباعة مباشرة</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="text-slate-500 hover:text-slate-300 transition cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* Standalone Offscreen Certificate Canvas fallback for perfect DOM extraction */}
      <div
        ref={internalOffscreenRef}
        className="fixed -left-[9999px] -top-[9999px] pointer-events-none opacity-0 overflow-hidden"
        style={{ width: `${dims.baseWidth}px`, height: `${dims.baseHeight}px` }}
        aria-hidden="true"
      >
        <CertificateCanvas
          data={certificateData}
          isExporting={true}
        />
      </div>
    </div>
  );
};

