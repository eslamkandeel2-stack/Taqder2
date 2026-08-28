import React, { useState, useRef, useEffect, useMemo } from 'react';
import { CertificateData, BatchRecord, BatchVerificationReportItem, ExportFormat, ExportEngine } from '../types';
import { CertificateCanvas } from './CertificateCanvas';
import { ExportPreviewModal } from './ExportPreviewModal';
import {
  exportBatchCertificatesAsSinglePdf,
  exportCertificateAsPdf,
  exportCertificateAsPng,
  captureCertificateCanvasBlob,
  captureCertificateBlobUnified,
  getCertificateDimensions
} from '../utils/exportUtils';
import { printCertificateViaIframe } from '../utils/printUtils';
import {
  googleSignIn,
  initDriveAuth,
  uploadCertificateToDrive,
  getAccessToken
} from '../services/googleDriveService';
import { generateVerificationCode } from '../utils/qrUtils';
import { saveBatchRecord, deleteBatchRecord } from '../utils/batchManager';
import { getSavedDefaultSettings } from '../utils/defaultSettings';
import { User } from 'firebase/auth';
import {
  X,
  Printer,
  Download,
  HardDrive,
  CheckCircle2,
  ShieldCheck,
  Search,
  Filter,
  Eye,
  Edit3,
  Trash2,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  FileText,
  Grid,
  Table as TableIcon,
  Users,
  AlertCircle,
  Loader2,
  FileSpreadsheet,
  Image as ImageIcon,
  SlidersHorizontal,
  Zap,
  ArrowRight,
  Settings,
  ChevronDown
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  batch: BatchRecord;
  isPendingSave?: boolean;
  onConfirmSaveBatch?: (batch: BatchRecord) => void;
  onCancelBatchSave?: () => void;
  onReturnToEdit?: (batch: BatchRecord) => void;
  onUpdateBatch: (updated: BatchRecord) => void;
  onApplySingleToEditor: (cert: CertificateData) => void;
  onShowToast: (msg: string) => void;
}

export const BatchCertificateViewerModal: React.FC<Props> = ({
  isOpen,
  onClose,
  batch,
  isPendingSave = false,
  onConfirmSaveBatch,
  onCancelBatchSave,
  onReturnToEdit,
  onUpdateBatch,
  onApplySingleToEditor,
  onShowToast
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'table' | 'preview'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female' | 'verified' | 'unverified'>('all');
  const [selectedCertId, setSelectedCertId] = useState<string>(batch.certificates?.[0]?.id || '');
  const [editingCert, setEditingCert] = useState<CertificateData | null>(null);

  // Single Certificate Export Modal Integration
  const [exportModalCert, setExportModalCert] = useState<CertificateData | null>(null);
  const [exportModalFormat, setExportModalFormat] = useState<ExportFormat>('pdf');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Deletion & Cancel Confirmation States
  const [certToDelete, setCertToDelete] = useState<CertificateData | null>(null);
  const [showDeleteBatchConfirm, setShowDeleteBatchConfirm] = useState(false);
  const [showCancelPendingConfirm, setShowCancelPendingConfirm] = useState(false);

  // Exporting state
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [exportProgress, setExportProgress] = useState<{ current: number; total: number; name: string } | null>(null);
  const [batchEngine, setBatchEngine] = useState<ExportEngine>('html2canvas');
  const [batchDpi, setBatchDpi] = useState<number>(300);
  const [showBatchEngineMenu, setShowBatchEngineMenu] = useState(false);

  // Drive Batch Upload state & Configuration
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [isUploadingToDrive, setIsUploadingToDrive] = useState(false);
  const [showDriveConfigModal, setShowDriveConfigModal] = useState(false);
  const [driveEngine, setDriveEngine] = useState<ExportEngine>('html2canvas');
  const [driveFormat, setDriveFormat] = useState<'png' | 'pdf' | 'jpeg'>('png');
  const [driveDpi, setDriveDpi] = useState<number>(300);
  const [driveProgress, setDriveProgress] = useState<{ current: number; total: number; name: string } | null>(null);
  const [verificationReport, setVerificationReport] = useState<BatchVerificationReportItem[]>([]);
  const [driveUser, setDriveUser] = useState<User | null>(null);
  const [driveToken, setDriveToken] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [copiedAllLinks, setCopiedAllLinks] = useState(false);

  // Hidden rendering container for batch capture
  const hiddenRenderRef = useRef<HTMLDivElement>(null);
  const [renderCertTarget, setRenderCertTarget] = useState<CertificateData | null>(null);

  useEffect(() => {
    if (isOpen) {
      const settings = getSavedDefaultSettings();
      if (settings.batchDefaultEngine) setBatchEngine(settings.batchDefaultEngine);
      else if (settings.defaultExportEngine) setBatchEngine(settings.defaultExportEngine);
      if (settings.exportDpi) setBatchDpi(settings.exportDpi);
      if (settings.driveDefaultEngine) setDriveEngine(settings.driveDefaultEngine);
      if (settings.driveDefaultFormat) setDriveFormat(settings.driveDefaultFormat);
      if (settings.driveDefaultDpi) setDriveDpi(settings.driveDefaultDpi);

      if (batch.certificates && batch.certificates.length > 0 && !selectedCertId) {
        setSelectedCertId(batch.certificates[0].id);
      }
      // Initialize drive auth listener
      const unsub = initDriveAuth(
        (u, t) => {
          setDriveUser(u);
          setDriveToken(t);
        },
        () => {
          setDriveUser(null);
          setDriveToken(null);
        }
      );
      return () => unsub();
    }
  }, [isOpen, batch, selectedCertId]);

  const certificates = batch.certificates || [];

  const girlsCount = useMemo(() => certificates.filter(c => c.recipientGender === 'female').length, [certificates]);
  const boysCount = useMemo(() => certificates.length - girlsCount, [certificates, girlsCount]);
  const verifiedCount = useMemo(() => certificates.filter(c => Boolean(c.driveFileWebViewLink)).length, [certificates]);

  const filteredCertificates = useMemo(() => {
    return certificates.filter(cert => {
      if (genderFilter === 'male' && cert.recipientGender === 'female') return false;
      if (genderFilter === 'female' && cert.recipientGender !== 'female') return false;
      if (genderFilter === 'verified' && !cert.driveFileWebViewLink) return false;
      if (genderFilter === 'unverified' && cert.driveFileWebViewLink) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        cert.studentName.toLowerCase().includes(q) ||
        (cert.verificationCode && cert.verificationCode.toLowerCase().includes(q)) ||
        cert.grade.toLowerCase().includes(q) ||
        cert.subject.toLowerCase().includes(q)
      );
    });
  }, [certificates, genderFilter, searchQuery]);

  const selectedCertificate = certificates.find(c => c.id === selectedCertId) || certificates[0] || null;

  // Helper to render certificate to DOM for headless capture with high fidelity
  const renderCertificateToDom = async (cert: CertificateData): Promise<HTMLElement> => {
    setRenderCertTarget(cert);
    // Allow state to propagate and DOM/fonts to settle
    for (let attempt = 0; attempt < 25; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 40));
      const container = hiddenRenderRef.current;
      if (container) {
        const el = (container.querySelector('#certificate-print-area') || container.querySelector('[data-certificate-canvas="true"]')) as HTMLElement;
        if (el) return el;
      }
    }
    if (hiddenRenderRef.current) return hiddenRenderRef.current as HTMLElement;
    return (document.getElementById('certificate-print-area') || document.body) as HTMLElement;
  };

  // Launch unified high-fidelity export preview modal for single certificate
  const handleOpenSingleExportModal = (cert: CertificateData, format: ExportFormat = 'pdf') => {
    setExportModalCert(cert);
    setExportModalFormat(format);
    setIsExportModalOpen(true);
  };

  // 1. Export Batch as Combined Multi-Page PDF
  const handleExportBatchCombinedPdf = async () => {
    if (certificates.length === 0) {
      onShowToast('لا توجد شهادات في هذه الدفعة لتصديرها');
      return;
    }

    setIsExportingPdf(true);
    setExportProgress({ current: 0, total: certificates.length, name: 'بدء التجهيز...' });

    try {
      await exportBatchCertificatesAsSinglePdf(
        certificates,
        renderCertificateToDom,
        {
          batchTitle: batch.title || `شهادات_دفعة_${batch.grade || 'الفصل'}`,
          engine: batchEngine,
          dpi: batchDpi,
          onProgress: (current, total, name) => {
            setExportProgress({ current, total, name });
          }
        }
      );

      onShowToast(`تم بنجاح تصدير ملف PDF المجمع (${batchEngine}) لـ ${certificates.length} شهادة! 📄✨`);
    } catch (err: any) {
      console.error('Error exporting batch combined PDF:', err);
      onShowToast('حدث خطأ أثناء تصدير ملف PDF المجمع.');
    } finally {
      setIsExportingPdf(false);
      setExportProgress(null);
      setRenderCertTarget(null);
    }
  };

  // 2. Direct single print
  const handlePrintSingleCert = async (cert: CertificateData) => {
    try {
      onShowToast(`جاري فتح نافذة الطباعة لشهادة ${cert.studentName}...`);
      const el = await renderCertificateToDom(cert);
      printCertificateViaIframe(el, cert);
    } catch (e) {
      console.error(e);
      onShowToast('فشل فتح نافذة الطباعة.');
    } finally {
      setTimeout(() => setRenderCertTarget(null), 150);
    }
  };

  // 3. Delete single certificate from batch with confirmation
  const confirmDeleteCert = (cert: CertificateData) => {
    setCertToDelete(cert);
  };

  const executeDeleteCert = (certId: string) => {
    const updatedCerts = certificates.filter(c => c.id !== certId);
    const updatedBatch: BatchRecord = {
      ...batch,
      totalCount: updatedCerts.length,
      certificates: updatedCerts,
      updatedAt: new Date().toISOString()
    };
    saveBatchRecord(updatedBatch);
    onUpdateBatch(updatedBatch);
    if (selectedCertId === certId && updatedCerts.length > 0) {
      setSelectedCertId(updatedCerts[0].id);
    }
    setCertToDelete(null);
    onShowToast('تم حذف الشهادة من الدفعة');
  };

  // 3.b Delete entire batch
  const executeDeleteEntireBatch = () => {
    deleteBatchRecord(batch.id);
    setShowDeleteBatchConfirm(false);
    onShowToast('تم حذف الدفعة بالكامل بنجاح');
    onClose();
  };

  // 4. Save Edited Certificate in Batch
  const handleSaveCertEdit = (updatedCert: CertificateData) => {
    const idx = certificates.findIndex(c => c.id === updatedCert.id);
    if (idx < 0) return;
    const updatedCerts = [...certificates];
    updatedCerts[idx] = updatedCert;
    const updatedBatch: BatchRecord = {
      ...batch,
      certificates: updatedCerts,
      updatedAt: new Date().toISOString()
    };
    saveBatchRecord(updatedBatch);
    onUpdateBatch(updatedBatch);
    setEditingCert(null);
    onShowToast(`تم حفظ تعديل شهادة الطالب: ${updatedCert.studentName}`);
  };

  // 5. Google Drive Batch Upload & Verification
  const handleStartBatchDriveVerification = async () => {
    let token = driveToken || (await getAccessToken());

    if (!token || !driveUser) {
      try {
        onShowToast('جاري تسجيل الدخول بحساب Google Drive...');
        const res = await googleSignIn();
        setDriveUser(res.user);
        setDriveToken(res.accessToken);
        token = res.accessToken;
      } catch (err: any) {
        console.error('Google Sign in failed:', err);
        onShowToast(err.message || 'تعذر تسجيل الدخول بـ Google.');
        return;
      }
    }

    if (!token) {
      onShowToast('مفتاح الوصول غير متوفر لـ Google Drive.');
      return;
    }

    setIsUploadingToDrive(true);
    setIsDriveModalOpen(true);

    const report: BatchVerificationReportItem[] = [];
    const updatedCertificates: CertificateData[] = [];

    const total = certificates.length;

    for (let i = 0; i < total; i++) {
      const origCert = certificates[i];
      const studentName = origCert.studentName || `طالب_${i + 1}`;
      const vCode = origCert.verificationCode || generateVerificationCode();

      setDriveProgress({
        current: i + 1,
        total,
        name: studentName
      });

      const reportItem: BatchVerificationReportItem = {
        index: i + 1,
        certificateId: origCert.id,
        studentName,
        gender: origCert.recipientGender,
        grade: origCert.grade,
        subject: origCert.subject,
        verificationCode: vCode,
        status: 'uploading'
      };

      try {
        const certWithCode: CertificateData = {
          ...origCert,
          verificationCode: vCode,
          qrCodeData: `${window.location.origin}/verify?code=${vCode}`
        };

        const element = await renderCertificateToDom(certWithCode);
        await new Promise((r) => setTimeout(r, 100));

        // Use unified blob capture with the chosen engine, format, and DPI
        const { blob, ext } = await captureCertificateBlobUnified(element, certWithCode, {
          engine: driveEngine,
          format: driveFormat,
          dpi: driveDpi
        });

        const safeStudentName = studentName.replace(/[^\w\s\u0600-\u06FF-]/gi, '').trim().replace(/\s+/g, '_');
        const fileName = `شهادة_${safeStudentName}_${vCode}.${ext}`;

        const uploadRes = await uploadCertificateToDrive(
          blob,
          fileName,
          token,
          origCert.driveFileId
        );

        const finalizedCert: CertificateData = {
          ...certWithCode,
          driveFileId: uploadRes.fileId,
          driveFileWebViewLink: uploadRes.webViewLink,
          driveFileUrl: uploadRes.webContentLink,
          driveUploadedAt: new Date().toISOString(),
          isSavedCloud: true,
          qrCodeData: uploadRes.webViewLink
        };

        updatedCertificates.push(finalizedCert);

        reportItem.driveFileId = uploadRes.fileId;
        reportItem.driveFileWebViewLink = uploadRes.webViewLink;
        reportItem.driveFileUrl = uploadRes.webContentLink;
        reportItem.qrCodeData = uploadRes.webViewLink;
        reportItem.status = 'verified';
      } catch (err: any) {
        console.error(`Error uploading cert for ${studentName}:`, err);
        reportItem.status = 'failed';
        reportItem.error = err.message || 'فشل الرفع';
        updatedCertificates.push(origCert);
      }

      report.push(reportItem);
      setVerificationReport([...report]);
    }

    const fullyVerifiedBatch: BatchRecord = {
      ...batch,
      isVerifiedOnDrive: true,
      certificates: updatedCertificates,
      updatedAt: new Date().toISOString()
    };

    saveBatchRecord(fullyVerifiedBatch);
    onUpdateBatch(fullyVerifiedBatch);

    setIsUploadingToDrive(false);
    setDriveProgress(null);
    setRenderCertTarget(null);
    onShowToast(`اكتمل توثيق الدفعة بالكامل على Google Drive! ☁️🎉`);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    onShowToast('تم نسخ الرابط إلى الحافظة! 📋');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleCopyAllLinksSheet = () => {
    const lines = certificates.map((c, idx) => {
      const link = c.driveFileWebViewLink || `${window.location.origin}/verify?code=${c.verificationCode}`;
      return `${idx + 1}. ${c.studentName} | ${c.grade} | رمز التوثيق: ${c.verificationCode} | الرابط: ${link}`;
    });

    const header = `كشف روابط توثيق شهادات: ${batch.title || batch.grade} (إجمالي: ${certificates.length} شهادة)\n${'='.repeat(60)}\n`;
    const fullText = header + lines.join('\n');

    navigator.clipboard.writeText(fullText);
    setCopiedAllLinks(true);
    onShowToast('تم نسخ كشف روابط التوثيق بالكامل لجميع الطلاب! 📋✅');
    setTimeout(() => setCopiedAllLinks(false), 2500);
  };

  const handleDownloadCsv = () => {
    const headers = ['رقم', 'اسم الطالب', 'الصف', 'المادة', 'رمز التحقق/الباركود', 'رابط التوثيق درايف', 'تاريخ الإصدار'];
    const rows = certificates.map((c, idx) => [
      idx + 1,
      `"${c.studentName}"`,
      `"${c.grade}"`,
      `"${c.subject}"`,
      `"${c.verificationCode || ''}"`,
      `"${c.driveFileWebViewLink || ''}"`,
      `"${c.issueDate || ''}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `كشف_توثيق_${(batch.title || batch.grade || 'الدفعة').replace(/\s+/g, '_')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    onShowToast('تم تصدير كشف التوثيق بصيغة Excel/CSV بنجاح! 📊');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200" dir="rtl">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-7xl max-h-[96vh] flex flex-col shadow-2xl text-slate-100 overflow-hidden text-right font-['Cairo',sans-serif]">
        
        {/* Top Header */}
        <div className="px-3.5 py-2 sm:px-5 sm:py-2.5 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-black text-white">
                  {batch.title || 'دفعة شهادات تقدير مجمعة'}
                </h3>
                {batch.isVerifiedOnDrive ? (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> موثقة على Google Drive
                  </span>
                ) : (
                  <span className="text-[10px] bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded-full font-mono">
                    {certificates.length} شهادة
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5 flex-wrap">
                <span>{batch.grade}</span>
                <span>•</span>
                <span>{batch.subject}</span>
                <span>•</span>
                <span className="text-sky-300 font-mono">👦 {boysCount} بنين</span>
                <span>•</span>
                <span className="text-rose-300 font-mono">👧 {girlsCount} بنات</span>
                {verifiedCount > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-emerald-300 font-mono">🛡️ {verifiedCount} موثقة</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Top Quick Actions Bar */}
          <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto justify-end">
            
            {/* Export Multi-Page Combined PDF with Engine Selector */}
            <div className="flex items-center rounded-lg bg-emerald-600 shadow-sm">
              <button
                type="button"
                onClick={handleExportBatchCombinedPdf}
                disabled={isExportingPdf || certificates.length === 0}
                className="px-2.5 py-1.5 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-r-lg transition flex items-center gap-1.5 cursor-pointer"
                title={`تجميع كافة شهادات الدفعة في ملف PDF واحد عالي الدقة (${batchEngine})`}
              >
                {isExportingPdf ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                    <span>معالجة ({exportProgress?.current}/{exportProgress?.total})...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    <span className="whitespace-nowrap">تصدير PDF مجمع ({certificates.length})</span>
                  </>
                )}
              </button>

              <div className="relative border-r border-emerald-500/60">
                <button
                  type="button"
                  onClick={() => setShowBatchEngineMenu(!showBatchEngineMenu)}
                  disabled={isExportingPdf}
                  className="px-1.5 py-1.5 hover:bg-emerald-500 text-white text-xs rounded-l-lg transition flex items-center cursor-pointer"
                  title="تغيير محرك ودقة تصدير الـ PDF المجمع"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>

                {showBatchEngineMenu && (
                  <div className="absolute left-0 top-full mt-1 w-64 bg-slate-900 border border-slate-700 rounded-xl p-3 shadow-2xl z-50 text-right space-y-2 text-xs animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 font-bold text-slate-300">
                      <span>محرك تصدير الـ PDF المجمع</span>
                      <span className="text-[10px] text-amber-400 font-mono">{batchDpi} DPI</span>
                    </div>

                    <div className="space-y-1">
                      {[
                        { id: 'html2canvas', name: 'html2canvas 🎨', desc: 'الأكثر استقراراً للخطوط العربية' },
                        { id: 'modern-screenshot', name: 'Modern Screenshot ⚡', desc: 'فائق السرعة وخفيف' },
                        { id: 'html-to-image', name: 'html-to-image 🖼️', desc: 'دقة متناهية عبر SVG' },
                        { id: 'jspdf', name: 'jsPDF + هندسة 📐', desc: 'تطابق أبعاد ورقية 100%' },
                        { id: 'html2pdf', name: 'html2pdf.js 📄', desc: 'محرك PDF مباشر' }
                      ].map((eng) => (
                        <button
                          key={eng.id}
                          type="button"
                          onClick={() => {
                            setBatchEngine(eng.id as ExportEngine);
                            setShowBatchEngineMenu(false);
                            onShowToast(`تم ضبط محرك التصدير المجمع على: ${eng.name}`);
                          }}
                          className={`w-full text-right p-1.5 rounded-lg transition flex flex-col cursor-pointer ${
                            batchEngine === eng.id
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'hover:bg-slate-800 text-slate-300'
                          }`}
                        >
                          <span className="font-bold">{eng.name}</span>
                          <span className="text-[10px] text-slate-400">{eng.desc}</span>
                        </button>
                      ))}
                    </div>

                    <div className="pt-2 border-t border-slate-800">
                      <label className="block text-[11px] text-slate-400 mb-1">دقة التصدير (DPI):</label>
                      <select
                        value={batchDpi}
                        onChange={(e) => setBatchDpi(parseInt(e.target.value))}
                        className="w-full text-xs font-bold p-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-200 outline-none"
                      >
                        <option value={150}>150 DPI (خفيف وسريع)</option>
                        <option value={300}>300 DPI (دقة طباعة قياسية - موصى به)</option>
                        <option value={400}>400 DPI (دقة فائقة)</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Google Drive Batch Verify with Quick Config */}
            <div className="flex items-center rounded-lg bg-gradient-to-r from-amber-600 to-amber-500 shadow-sm">
              <button
                type="button"
                onClick={handleStartBatchDriveVerification}
                disabled={isUploadingToDrive || certificates.length === 0}
                className="px-2.5 py-1.5 hover:opacity-90 disabled:opacity-50 text-slate-950 font-black text-xs rounded-r-lg transition flex items-center gap-1.5 cursor-pointer"
                title={`توثيق الدفعة بالكامل على Google Drive (${driveEngine} - ${driveFormat.toUpperCase()})`}
              >
                {isUploadingToDrive ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-950" />
                    <span>رفع ({driveProgress?.current}/{driveProgress?.total})...</span>
                  </>
                ) : (
                  <>
                    <HardDrive className="w-3.5 h-3.5" />
                    <span className="whitespace-nowrap">توثيق على درايف</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowDriveConfigModal(true)}
                disabled={isUploadingToDrive}
                className="px-1.5 py-1.5 hover:bg-amber-600/30 text-slate-950 text-xs rounded-l-lg border-r border-amber-600/40 transition flex items-center cursor-pointer"
                title="تخصيص خيارات ومحرك وصيغة التوثيق على Google Drive"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* View Links Report */}
            {certificates.some(c => c.driveFileWebViewLink) && (
              <button
                type="button"
                onClick={() => setIsDriveModalOpen(true)}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-300 font-bold text-xs rounded-lg border border-slate-700 transition flex items-center gap-1 cursor-pointer"
                title="عرض جدول روابط التوثيق المباشرة"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span className="whitespace-nowrap">تقرير الروابط</span>
              </button>
            )}

            {/* Delete Batch Button (if not pending) */}
            {!isPendingSave && (
              <button
                type="button"
                onClick={() => setShowDeleteBatchConfirm(true)}
                className="p-1.5 text-rose-400 hover:text-rose-200 hover:bg-rose-950/50 rounded-lg transition cursor-pointer"
                title="حذف هذه الدفعة بالكامل"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            {/* Close Button */}
            <button
              type="button"
              onClick={isPendingSave ? () => setShowCancelPendingConfirm(true) : onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
              title="إغلاق النافذة"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* BATCH SAVE CONFIRMATION & WORKFLOW BANNER */}
        {isPendingSave ? (
          <div className="bg-gradient-to-r from-amber-950/50 via-slate-900 to-amber-950/40 border-b border-amber-500/30 px-3.5 py-2 sm:px-5 sm:py-2.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-2.5 text-right shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-amber-500/20 text-amber-300 rounded-xl shrink-0 border border-amber-500/30">
                <Sparkles className="w-4 h-4 text-amber-400" />
              </div>
              <div className="space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-xs sm:text-sm font-black text-amber-300">
                    مراجعة وتأكيد حفظ الشهادات الجماعية
                  </h4>
                  <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold px-2 py-0.2 rounded-full">
                    ⏳ مسودة قيد المعاينة ({certificates.length} شهادة)
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-normal">
                  تأكد من صحة الشهادات أدناه، ثم اختر تأكيد الحفظ في السجل، أو العودة للتعديل، أو إلغاء الحفظ.
                </p>
              </div>
            </div>

            {/* 3 Explicit Action Buttons - Compact and Balanced */}
            <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto justify-end shrink-0">
              
              {/* 1. Confirm and Save to History */}
              <button
                type="button"
                onClick={() => onConfirmSaveBatch && onConfirmSaveBatch(batch)}
                className="px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-emerald-400 hover:brightness-110 active:scale-95 text-slate-950 font-black text-xs rounded-lg shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
                title="تأكيد حفظ واعتماد الدفعة في سجل الدفعات المحفوظة والمكتبة السحابية"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-slate-950" />
                <span className="whitespace-nowrap">تأكيد حفظ الشهادات في السجل ✓</span>
              </button>

              {/* 2. Return to Edit Form to Fix Errors */}
              <button
                type="button"
                onClick={() => onReturnToEdit && onReturnToEdit(batch)}
                className="px-2.5 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-xs rounded-lg border border-amber-500/40 hover:border-amber-400 transition flex items-center justify-center gap-1.5 cursor-pointer"
                title="العودة لمحرر الدفعة لتعديل أسماء الطلاب أو الصيغ وتصحيح الأخطاء"
              >
                <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                <span className="whitespace-nowrap">العودة للتعديل</span>
              </button>

              {/* 3. Cancel and Discard */}
              <button
                type="button"
                onClick={() => setShowCancelPendingConfirm(true)}
                className="px-2.5 py-1.5 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 font-bold text-xs rounded-lg border border-rose-500/30 hover:border-rose-400 transition flex items-center justify-center gap-1.5 cursor-pointer"
                title="إلغاء الحفظ وتجاهل الشهادات المولدة بدون حفظها"
              >
                <X className="w-3.5 h-3.5 text-rose-400" />
                <span className="whitespace-nowrap">إلغاء وتجاهل</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-slate-900/95 border-b border-slate-800 px-3.5 py-1.5 sm:px-5 sm:py-2 flex flex-wrap items-center justify-between gap-2 text-right shrink-0 text-xs">
            <div className="flex items-center gap-2 text-slate-300 text-[11px] sm:text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>هذه الدفعة معتمدة ومحفوظة في <strong>سجل الدفعات والمكتبة السحابية</strong> • تاريخ الإنشاء: {new Date(batch.createdAt).toLocaleDateString('ar-SA')}</span>
            </div>
            {onReturnToEdit && (
              <button
                type="button"
                onClick={() => onReturnToEdit(batch)}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 font-bold text-xs rounded-lg border border-amber-500/30 transition flex items-center gap-1 cursor-pointer"
                title="نسخ وتحميل بيانات هذه الدفعة في محرر الدفعات للتعديل وإعادة التوليد"
              >
                <Edit3 className="w-3 h-3" />
                <span>العودة لتعديل بيانات الدفعة</span>
              </button>
            )}
          </div>
        )}

        {/* Filter, Search & View Switcher Bar */}
        <div className="px-3.5 py-1.5 sm:px-5 sm:py-2 bg-slate-800/80 border-b border-slate-700/60 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2 shrink-0">
          
          {/* Search and Filters */}
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث باسم الطالب أو رمز التوثيق..."
                className="w-full pl-2 pr-8 py-1 bg-slate-900 border border-slate-700 text-xs rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Quick Gender & Status Filter Pills */}
            <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setGenderFilter('all')}
                className={`px-2 py-0.5 rounded-md font-bold text-[11px] transition cursor-pointer ${
                  genderFilter === 'all' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                الكل ({certificates.length})
              </button>
              <button
                type="button"
                onClick={() => setGenderFilter('male')}
                className={`px-2 py-0.5 rounded-md font-bold text-[11px] transition cursor-pointer ${
                  genderFilter === 'male' ? 'bg-sky-500 text-slate-950 font-black' : 'text-sky-300 hover:text-white'
                }`}
              >
                👦 بنين ({boysCount})
              </button>
              <button
                type="button"
                onClick={() => setGenderFilter('female')}
                className={`px-2 py-0.5 rounded-md font-bold text-[11px] transition cursor-pointer ${
                  genderFilter === 'female' ? 'bg-rose-500 text-slate-950 font-black' : 'text-rose-300 hover:text-white'
                }`}
              >
                👧 بنات ({girlsCount})
              </button>
              {verifiedCount > 0 && (
                <button
                  type="button"
                  onClick={() => setGenderFilter('verified')}
                  className={`px-2 py-0.5 rounded-md font-bold text-[11px] transition cursor-pointer ${
                    genderFilter === 'verified' ? 'bg-emerald-500 text-slate-950 font-black' : 'text-emerald-300 hover:text-white'
                  }`}
                >
                  🛡️ موثقة ({verifiedCount})
                </button>
              )}
            </div>
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center gap-2 justify-between md:justify-end">
            <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
              عرض: <strong className="text-white">{filteredCertificates.length}</strong> من {certificates.length}
            </span>

            <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-700">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`px-2.5 py-1 text-xs rounded-md font-bold flex items-center gap-1 transition cursor-pointer ${
                  viewMode === 'grid' ? 'bg-amber-500 text-slate-950 shadow-xs font-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Grid className="w-3 h-3" />
                <span>بطاقات</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`px-2.5 py-1 text-xs rounded-md font-bold flex items-center gap-1 transition cursor-pointer ${
                  viewMode === 'table' ? 'bg-amber-500 text-slate-950 shadow-xs font-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                <TableIcon className="w-3 h-3" />
                <span>جدول</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('preview')}
                className={`px-2.5 py-1 text-xs rounded-md font-bold flex items-center gap-1 transition cursor-pointer ${
                  viewMode === 'preview' ? 'bg-amber-500 text-slate-950 shadow-xs font-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Eye className="w-3 h-3" />
                <span>معاينة حية</span>
              </button>
            </div>
          </div>
        </div>

        {/* Progress Banner during Multi-page PDF or Drive Upload */}
        {(isExportingPdf || isUploadingToDrive) && (
          <div className="bg-amber-500/15 border-b border-amber-500/30 py-2 px-4 flex items-center justify-between gap-4 text-xs text-amber-200 shrink-0">
            <div className="flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
              <span>
                {isExportingPdf
                  ? `جاري تجهيز الشهادة رقم (${exportProgress?.current} من ${exportProgress?.total}) - ${exportProgress?.name}...`
                  : `جاري رفع وتوثيق الشهادة رقم (${driveProgress?.current} من ${driveProgress?.total}) - ${driveProgress?.name} على Google Drive...`}
              </span>
            </div>
            <div className="w-40 bg-slate-800 rounded-full h-1.5 overflow-hidden border border-slate-700">
              <div
                className="bg-amber-400 h-full transition-all duration-300"
                style={{
                  width: `${
                    isExportingPdf
                      ? ((exportProgress?.current || 0) / (exportProgress?.total || 1)) * 100
                      : ((driveProgress?.current || 0) / (driveProgress?.total || 1)) * 100
                  }%`
                }}
              />
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
          
          {/* VIEW MODE 1: GRID CARDS */}
          {viewMode === 'grid' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredCertificates.map((cert, index) => {
                const isSelected = cert.id === selectedCertId;
                const isDriveUploaded = Boolean(cert.driveFileWebViewLink);
                const isFemale = cert.recipientGender === 'female';

                return (
                  <div
                    key={`batch-grid-${cert.id || index}-${index}`}
                    className={`bg-slate-800/90 border ${
                      isSelected ? 'border-amber-400 ring-2 ring-amber-400/30 shadow-md shadow-amber-500/10' : 'border-slate-700/80 hover:border-slate-600'
                    } rounded-xl p-3 flex flex-col justify-between gap-2.5 transition relative group`}
                  >
                    {/* Card Header */}
                    <div className="flex items-center justify-between gap-2 border-b border-slate-700/80 pb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-black bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded-md border border-amber-500/30 font-mono">
                          #{index + 1}
                        </span>
                        <span className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded border ${
                          isFemale ? 'bg-rose-950/70 text-rose-300 border-rose-500/30' : 'bg-sky-950/70 text-sky-300 border-sky-500/30'
                        }`}>
                          {isFemale ? '👧 طالبة' : '👦 طالب'}
                        </span>
                        {cert.verificationCode && (
                          <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">
                            {cert.verificationCode}
                          </span>
                        )}
                      </div>

                      {isDriveUploaded ? (
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded-full font-bold flex items-center gap-1 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3" /> موثقة
                        </span>
                      ) : (
                        <span className="text-[10px] bg-slate-700/80 text-slate-400 px-1.5 py-0.2 rounded-full font-medium">
                          جاهزة للتصدير
                        </span>
                      )}
                    </div>

                    {/* Student Info */}
                    <div className="space-y-1 py-0.5">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-black text-sm sm:text-base text-white hover:text-amber-300 transition">
                          {cert.studentName}
                        </h4>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {cert.grade} • {cert.subject}
                      </p>
                      <p className="text-[11px] text-amber-200/85 italic line-clamp-2 leading-relaxed bg-slate-900/60 p-1.5 rounded-lg border border-slate-800">
                        "{cert.appreciationText}"
                      </p>
                    </div>

                    {/* Drive Link if available */}
                    {cert.driveFileWebViewLink && (
                      <div className="bg-slate-900 p-1.5 rounded-lg border border-slate-700/60 flex items-center justify-between text-[10px] text-sky-300">
                        <span className="truncate max-w-[150px] font-mono text-[10px]">
                          {cert.driveFileWebViewLink}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => copyToClipboard(cert.driveFileWebViewLink!, cert.id)}
                            className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white cursor-pointer"
                            title="نسخ رابط درايف"
                          >
                            {copiedCode === cert.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          </button>
                          <a
                            href={cert.driveFileWebViewLink}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white"
                            title="فتح على Google Drive"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    )}

                    {/* Card Actions */}
                    <div className="pt-2 border-t border-slate-700/80 flex flex-col gap-1.5">
                      
                      {/* Primary Single Certificate Export Button linking to Export Preview Modal */}
                      <button
                        type="button"
                        onClick={() => handleOpenSingleExportModal(cert, 'pdf')}
                        className="w-full py-1.5 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs rounded-lg shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                        title="فتح نافذة المعاينة والتصدير فائق الدقة لهذه الشهادة بصيغ PDF / PNG / SVG"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                        <span>مركز تصدير الشهادة فائق الدقة 🚀</span>
                      </button>

                      {/* Secondary Quick Action Icon Buttons */}
                      <div className="flex items-center justify-between gap-1 text-xs">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCertId(cert.id);
                              setViewMode('preview');
                            }}
                            className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold rounded-md text-[11px] transition flex items-center gap-1 cursor-pointer"
                            title="معاينة الشهادة مباشرة"
                          >
                            <Eye className="w-3 h-3" />
                            <span>معاينة</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingCert(cert)}
                            className="p-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-md transition cursor-pointer"
                            title="تعديل بيانات هذه الشهادة"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handlePrintSingleCert(cert)}
                            className="p-1 bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white rounded-md transition cursor-pointer"
                            title="طباعة الشهادة مباشرة"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenSingleExportModal(cert, 'pdf')}
                            className="p-1 bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 hover:text-white rounded-md transition cursor-pointer"
                            title="تصدير PDF عبر نافذة التصدير"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenSingleExportModal(cert, 'png')}
                            className="p-1 bg-sky-600/30 hover:bg-sky-600 text-sky-300 hover:text-white rounded-md transition cursor-pointer"
                            title="تصدير صورة PNG عبر نافذة التصدير"
                          >
                            <ImageIcon className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onApplySingleToEditor(cert);
                              onClose();
                            }}
                            className="p-1 bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 rounded-md transition cursor-pointer"
                            title="فتح في محرر الشهادات الرئيسي"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => confirmDeleteCert(cert)}
                            className="p-1 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white rounded-md transition cursor-pointer"
                            title="حذف الشهادة من الدفعة"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* VIEW MODE 2: TABLE VIEW */}
          {viewMode === 'table' && (
            <div className="bg-slate-800/80 border border-slate-700 rounded-xl overflow-hidden shadow">
              <div className="p-2.5 bg-slate-900 border-b border-slate-700 flex items-center justify-between">
                <h4 className="font-extrabold text-xs text-slate-300 flex items-center gap-2">
                  <TableIcon className="w-3.5 h-3.5 text-amber-400" />
                  جدول شهادات الدفعة التفصيلي
                </h4>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleDownloadCsv}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-xs text-amber-300 font-bold rounded-lg border border-slate-700 flex items-center gap-1 transition cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    تصدير Excel/CSV
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyAllLinksSheet}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-xs text-sky-300 font-bold rounded-lg border border-slate-700 flex items-center gap-1 transition cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    نسخ كشف الروابط
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-700 font-bold">
                    <tr>
                      <th className="p-2.5 text-center w-10">#</th>
                      <th className="p-2.5">اسم الطالب / الطالبة</th>
                      <th className="p-2.5">الصف</th>
                      <th className="p-2.5">المادة / المجال</th>
                      <th className="p-2.5">رمز التحقق (الباركود)</th>
                      <th className="p-2.5">رابط التوثيق على درايف</th>
                      <th className="p-2.5 text-center">إجراءات وتصدير</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/60">
                    {filteredCertificates.map((cert, idx) => (
                      <tr key={`batch-table-row-${cert.id || idx}-${idx}`} className="hover:bg-slate-700/30 transition">
                        <td className="p-2.5 text-center font-mono font-bold text-amber-400">{idx + 1}</td>
                        <td className="p-2.5 font-extrabold text-white">
                          <div className="flex items-center gap-1.5">
                            <span>{cert.studentName}</span>
                            <span className={`text-[10px] px-1 py-0.2 rounded ${
                              cert.recipientGender === 'female' ? 'bg-rose-950 text-rose-300' : 'bg-sky-950 text-sky-300'
                            }`}>
                              {cert.recipientGender === 'female' ? '👧' : '👦'}
                            </span>
                          </div>
                        </td>
                        <td className="p-2.5 text-slate-300">{cert.grade}</td>
                        <td className="p-2.5 text-slate-300">{cert.subject}</td>
                        <td className="p-2.5 font-mono text-amber-200">{cert.verificationCode}</td>
                        <td className="p-2.5">
                          {cert.driveFileWebViewLink ? (
                            <div className="flex items-center gap-1 text-sky-300">
                              <span className="font-mono text-[11px] truncate max-w-[140px]">{cert.driveFileWebViewLink}</span>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(cert.driveFileWebViewLink!, cert.id)}
                                className="p-1 hover:bg-slate-800 rounded cursor-pointer"
                                title="نسخ"
                              >
                                {copiedCode === cert.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                              </button>
                              <a href={cert.driveFileWebViewLink} target="_blank" rel="noreferrer" className="p-1 hover:bg-slate-800 rounded">
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          ) : (
                            <span className="text-slate-500 text-[11px]">جاهز للتصدير</span>
                          )}
                        </td>
                        <td className="p-2.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {/* Open Export Preview Modal for this individual cert */}
                            <button
                              type="button"
                              onClick={() => handleOpenSingleExportModal(cert, 'pdf')}
                              className="px-2 py-0.5 bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 font-bold text-[11px] rounded-md transition flex items-center gap-1 cursor-pointer"
                              title="مركز التصدير فائق الدقة (PDF/صور)"
                            >
                              <Sparkles className="w-3 h-3" />
                              <span>تصدير</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePrintSingleCert(cert)}
                              className="p-1 hover:bg-slate-700 text-indigo-300 rounded cursor-pointer"
                              title="طباعة مباشرة"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedCertId(cert.id);
                                setViewMode('preview');
                              }}
                              className="p-1 hover:bg-slate-700 text-slate-300 hover:text-white rounded cursor-pointer"
                              title="معاينة"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingCert(cert)}
                              className="p-1 hover:bg-slate-700 text-slate-300 rounded cursor-pointer"
                              title="تعديل"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => confirmDeleteCert(cert)}
                              className="p-1 hover:bg-rose-950/50 text-rose-400 hover:text-rose-300 rounded cursor-pointer"
                              title="حذف الشهادة"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW MODE 3: FULL LIVE PREVIEW & INSPECTOR */}
          {viewMode === 'preview' && selectedCertificate && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              
              {/* Left Column: Student Selector List (4 Cols) */}
              <div className="lg:col-span-4 bg-slate-800/90 border border-slate-700 rounded-xl p-2.5 space-y-1.5 max-h-[560px] overflow-y-auto">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-700">
                  <h5 className="font-extrabold text-xs text-slate-300">
                    قائمة طلاب الدفعة ({filteredCertificates.length})
                  </h5>
                  <span className="text-[10px] text-slate-400">انقر للتبديل</span>
                </div>
                <div className="space-y-1">
                  {filteredCertificates.map((cert, idx) => {
                    const isSelected = cert.id === selectedCertId;
                    const isFemale = cert.recipientGender === 'female';
                    return (
                      <button
                        key={`batch-preview-btn-${cert.id || idx}-${idx}`}
                        type="button"
                        onClick={() => setSelectedCertId(cert.id)}
                        className={`w-full text-right p-2 rounded-lg text-xs transition flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                            : 'bg-slate-900/80 hover:bg-slate-700 text-slate-200'
                        }`}
                      >
                        <div className="truncate flex items-center gap-1.5">
                          <span className="font-mono opacity-70 text-[11px]">#{idx + 1}</span>
                          <span>{isFemale ? '👧' : '👦'}</span>
                          <span className="font-bold truncate">{cert.studentName}</span>
                        </div>
                        {cert.driveFileWebViewLink && (
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-bold shrink-0">
                            موثق
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Live Certificate Canvas Preview (8 Cols) */}
              <div className="lg:col-span-8 bg-slate-800/60 border border-slate-700 rounded-xl p-3 flex flex-col items-center justify-center min-h-[460px] relative">
                <div className="w-full flex flex-wrap items-center justify-between mb-2 pb-2 border-b border-slate-700 gap-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-sm text-amber-300">{selectedCertificate.studentName}</span>
                    <span className="text-xs text-slate-400">({selectedCertificate.grade} • {selectedCertificate.subject})</span>
                  </div>

                  {/* Inspector Action Buttons including Export Preview Modal */}
                  <div className="flex flex-wrap items-center gap-1">
                    
                    {/* Main Export Preview Trigger for Current Certificate */}
                    <button
                      type="button"
                      onClick={() => handleOpenSingleExportModal(selectedCertificate, 'pdf')}
                      className="px-2.5 py-1 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs rounded-lg shadow-xs transition flex items-center gap-1 cursor-pointer"
                      title="فتح نافذة المعاينة والتصدير فائق الدقة لهذه الشهادة"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                      <span>مركز التصدير 🚀</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handlePrintSingleCert(selectedCertificate)}
                      className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg shadow-xs transition flex items-center gap-1 cursor-pointer"
                      title="طباعة الشهادة الحالية مباشرة"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>طباعة</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setEditingCert(selectedCertificate)}
                      className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-xs rounded-lg transition flex items-center gap-1 cursor-pointer"
                      title="تعديل بيانات الشهادة"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>تعديل</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onApplySingleToEditor(selectedCertificate);
                        onClose();
                      }}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs rounded-lg border border-amber-500/30 transition flex items-center gap-1 cursor-pointer"
                      title="فتح في المحرر الرئيسي"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>بالمحرر</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => confirmDeleteCert(selectedCertificate)}
                      className="p-1 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white rounded-lg transition cursor-pointer"
                      title="حذف هذه الشهادة"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Certificate Canvas Render */}
                <div className="w-full overflow-hidden flex items-center justify-center p-1.5">
                  <CertificateCanvas
                    data={selectedCertificate}
                    isExporting={false}
                    onUpdateData={(updated) => {
                      const merged = { ...selectedCertificate, ...updated };
                      handleSaveCertEdit(merged);
                    }}
                  />
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Modal Bottom Footer */}
        <div className="px-4 py-2 sm:py-2.5 bg-slate-900 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs text-slate-400 shrink-0">
          <div>
            <span>تاريخ الإنشاء: {new Date(batch.createdAt).toLocaleDateString('ar-SA')}</span>
            {batch.updatedAt && (
              <span className="mr-3">آخر تحديث: {new Date(batch.updatedAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportBatchCombinedPdf}
              disabled={isExportingPdf}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow-xs text-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تصدير PDF مجمع ({certificates.length})</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg transition cursor-pointer text-xs"
            >
              إغلاق
            </button>
          </div>
        </div>

      </div>

      {/* ULTRA HIGH-FIDELITY EXPORT PREVIEW MODAL FOR INDIVIDUAL CERTIFICATE */}
      {exportModalCert && (
        <ExportPreviewModal
          isOpen={isExportModalOpen}
          onClose={() => {
            setIsExportModalOpen(false);
            setExportModalCert(null);
          }}
          certificateData={exportModalCert}
          initialFormat={exportModalFormat}
          onShowToast={onShowToast}
        />
      )}

      {/* QUICK EDIT MODAL FOR SINGLE STUDENT IN BATCH */}
      {editingCert && (
        <div className="fixed inset-0 z-[80] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full text-right space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <h4 className="font-extrabold text-sm text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-amber-400" />
                تعديل بيانات شهادة الطالب
              </h4>
              <button onClick={() => setEditingCert(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">اسم الطالب / الطالبة:</label>
              <input
                type="text"
                value={editingCert.studentName}
                onChange={(e) => setEditingCert({ ...editingCert, studentName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-xs rounded-xl text-white font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">الجنس:</label>
                <select
                  value={editingCert.recipientGender || 'male'}
                  onChange={(e) => setEditingCert({ ...editingCert, recipientGender: e.target.value as 'male' | 'female' })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-xs rounded-xl text-white"
                >
                  <option value="male">👦 طالب (مذكر)</option>
                  <option value="female">👧 طالبة (مؤنث)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">الصف الدراسي:</label>
                <input
                  type="text"
                  value={editingCert.grade}
                  onChange={(e) => setEditingCert({ ...editingCert, grade: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-xs rounded-xl text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">المادة / المجال:</label>
              <input
                type="text"
                value={editingCert.subject}
                onChange={(e) => setEditingCert({ ...editingCert, subject: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-xs rounded-xl text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">نص التقدير والتكريم:</label>
              <textarea
                rows={3}
                value={editingCert.appreciationText}
                onChange={(e) => setEditingCert({ ...editingCert, appreciationText: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-xs rounded-xl text-white leading-relaxed"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-700">
              <button
                type="button"
                onClick={() => setEditingCert(null)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg cursor-pointer transition"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => handleSaveCertEdit(editingCert)}
                className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-lg shadow-xs cursor-pointer transition"
              >
                حفظ التعديل
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DRIVE VERIFICATION CONFIGURATION MODAL */}
      {showDriveConfigModal && (
        <div className="fixed inset-0 z-[85] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 max-w-md w-full text-right space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2 text-amber-400">
                <Settings className="w-5 h-5" />
                <h4 className="font-extrabold text-sm sm:text-base text-white">إعدادات توثيق Google Drive</h4>
              </div>
              <button onClick={() => setShowDriveConfigModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">محرك التوثيق والالتقاط:</label>
                <select
                  value={driveEngine}
                  onChange={(e) => setDriveEngine(e.target.value as ExportEngine)}
                  className="w-full font-bold p-2.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-200 outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="html2canvas">html2canvas 🎨 (الأكثر استقراراً للخطوط)</option>
                  <option value="modern-screenshot">Modern Screenshot ⚡ (فائق السرعة)</option>
                  <option value="html-to-image">html-to-image 🖼️ (دقة متناهية SVG)</option>
                </select>
                <p className="text-[10px] text-slate-400 mt-0.5">المحرك المسؤول عن تحويل عناصر الشهادة إلى ملف رقمي موثق.</p>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">صيغة الملف المرفوع لدرايف:</label>
                <select
                  value={driveFormat}
                  onChange={(e) => setDriveFormat(e.target.value as any)}
                  className="w-full font-bold p-2.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-200 outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="png">صورة فائقة النقاء PNG (الموصى به للعرض الفوري)</option>
                  <option value="pdf">مستند إلكتروني PDF (للطباعة والأرشفة الرسمية)</option>
                  <option value="jpeg">صورة مضغوطة JPEG (حجم خفيف وتوفير المساحة)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">دقة التوثيق (DPI):</label>
                <select
                  value={driveDpi}
                  onChange={(e) => setDriveDpi(parseInt(e.target.value))}
                  className="w-full font-bold p-2.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-200 outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value={150}>150 DPI (معاينة رقمية سريعة)</option>
                  <option value={300}>300 DPI (دقة قياسية فائقة - مستحسن)</option>
                  <option value={400}>400 DPI (دقة مكثفة لأعلى نقاء)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowDriveConfigModal(false)}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg cursor-pointer transition"
              >
                إغلاق
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDriveConfigModal(false);
                  handleStartBatchDriveVerification();
                }}
                className="px-3.5 py-1.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 text-xs font-black rounded-lg shadow-sm cursor-pointer transition flex items-center gap-1"
              >
                <HardDrive className="w-3.5 h-3.5" />
                <span>حفظ وبدء التوثيق</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DRIVE VERIFICATION REPORT MODAL */}
      {isDriveModalOpen && (
        <div className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 max-w-4xl w-full text-right space-y-3 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-700 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-emerald-500/20 text-emerald-300 rounded-xl">
                  <ShieldCheck className="w-4 h-4" />
                </span>
                <div>
                  <h4 className="font-extrabold text-sm sm:text-base text-white">تقرير توثيق الدفعة على Google Drive</h4>
                  <p className="text-[11px] text-slate-400">تم إنشاء روابط وبراكودات التوثيق الفردية لكل طالب في الدفعة</p>
                </div>
              </div>
              <button onClick={() => setIsDriveModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-between gap-3 bg-slate-800/80 p-2.5 rounded-xl border border-slate-700 text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <HardDrive className="w-3.5 h-3.5 text-amber-400" />
                <span>إجمالي الشهادات الموثقة: <strong className="text-white">{certificates.filter(c => c.driveFileWebViewLink).length}</strong> من {certificates.length}</span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleCopyAllLinksSheet}
                  className="px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg flex items-center gap-1 transition cursor-pointer text-xs"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copiedAllLinks ? 'تم نسخ الكشف!' : 'نسخ كشف الروابط'}
                </button>
                <button
                  type="button"
                  onClick={handleDownloadCsv}
                  className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg flex items-center gap-1 transition cursor-pointer text-xs"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  تصدير ملف Excel
                </button>
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto border border-slate-700 rounded-xl">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-700 font-bold sticky top-0">
                  <tr>
                    <th className="p-2.5 text-center w-10">#</th>
                    <th className="p-2.5">اسم الطالب</th>
                    <th className="p-2.5">رمز التوثيق / الباركود</th>
                    <th className="p-2.5">رابط التوثيق المباشر</th>
                    <th className="p-2.5 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {certificates.map((cert, idx) => (
                    <tr key={`batch-drive-row-${cert.id || idx}-${idx}`} className="hover:bg-slate-800/40">
                      <td className="p-2.5 text-center font-mono text-amber-400 font-bold">{idx + 1}</td>
                      <td className="p-2.5 font-bold text-white">{cert.studentName}</td>
                      <td className="p-2.5 font-mono text-amber-200">{cert.verificationCode}</td>
                      <td className="p-2.5 font-mono text-sky-300 text-[11px] truncate max-w-xs">
                        {cert.driveFileWebViewLink || 'غير متوفر'}
                      </td>
                      <td className="p-2.5 text-center">
                        {cert.driveFileWebViewLink && (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => copyToClipboard(cert.driveFileWebViewLink!, cert.id)}
                              className="p-1 hover:bg-slate-800 rounded text-slate-300 cursor-pointer"
                              title="نسخ الرابط"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <a
                              href={cert.driveFileWebViewLink}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 hover:bg-slate-800 rounded text-sky-400"
                              title="فتح الرابط"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-1.5">
              <button
                type="button"
                onClick={() => setIsDriveModalOpen(false)}
                className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg cursor-pointer transition"
              >
                تم
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SINGLE CERTIFICATE DELETE CONFIRMATION MODAL */}
      {certToDelete && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 max-w-md w-full rounded-2xl p-5 shadow-2xl space-y-3 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2.5 text-rose-400">
              <div className="p-2 bg-rose-500/20 rounded-xl">
                <Trash2 className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm sm:text-base text-white">تأكيد حذف الشهادة</h4>
                <p className="text-[11px] text-slate-400">هذا الإجراء سيقوم بحذف الشهادة من هذه الدفعة</p>
              </div>
            </div>

            <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700/80 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">اسم الطالب:</span>
                <span className="font-bold text-white">{certToDelete.studentName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">الصف / الفصل:</span>
                <span className="text-slate-300">{certToDelete.grade}</span>
              </div>
              {certToDelete.verificationCode && (
                <div className="flex justify-between">
                  <span className="text-slate-400">رمز التوثيق:</span>
                  <span className="font-mono text-amber-400">{certToDelete.verificationCode}</span>
                </div>
              )}
            </div>

            <p className="text-xs text-slate-300">
              هل أنت متأكد من رغبتك في حذف شهادة الطالب <strong className="text-rose-400">{certToDelete.studentName}</strong>؟
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCertToDelete(null)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-lg transition cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => executeDeleteCert(certToDelete.id)}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>تأكيد الحذف</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CANCEL / DISCARD PENDING BATCH CONFIRMATION MODAL */}
      {showCancelPendingConfirm && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 max-w-md w-full rounded-2xl p-5 shadow-2xl space-y-3 animate-in fade-in zoom-in-95 duration-200 text-right">
            <div className="flex items-center gap-2.5 text-rose-400">
              <div className="p-2 bg-rose-500/20 rounded-xl">
                <AlertCircle className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm sm:text-base text-white">إلغاء حفظ الشهادات وتجاهل الدفعة</h4>
                <p className="text-[11px] text-slate-400">لن يتم حفظ هذه الشهادات في سجل الدفعات أو السحابة</p>
              </div>
            </div>

            <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700/80 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">عنوان الدفعة:</span>
                <span className="font-bold text-white">{batch.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">عدد الشهادات المولدة:</span>
                <span className="font-bold text-amber-400">{certificates.length} شهادة</span>
              </div>
            </div>

            <p className="text-xs text-slate-300">
              هل أنت متأكد من رغبتك في إلغاء حفظ هذه الدفعة وإغلاق المعاينة؟ يمكنك العودة للتعديل إذا كنت تريد تصحيح الأخطاء بدلاً من الإلغاء.
            </p>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCancelPendingConfirm(false)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-lg transition cursor-pointer"
              >
                تراجع والمتابعة
              </button>
              {onReturnToEdit && (
                <button
                  type="button"
                  onClick={() => {
                    setShowCancelPendingConfirm(false);
                    onReturnToEdit(batch);
                  }}
                  className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-xs rounded-lg border border-amber-500/30 transition cursor-pointer"
                >
                  العودة للتعديل
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setShowCancelPendingConfirm(false);
                  if (onCancelBatchSave) {
                    onCancelBatchSave();
                  } else {
                    onClose();
                  }
                }}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>نعم، تجاهل وإلغاء الحفظ</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ENTIRE BATCH DELETE CONFIRMATION MODAL */}
      {showDeleteBatchConfirm && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 max-w-md w-full rounded-2xl p-5 shadow-2xl space-y-3 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2.5 text-rose-400">
              <div className="p-2 bg-rose-500/20 rounded-xl">
                <AlertCircle className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm sm:text-base text-white">تأكيد حذف الدفعة بالكامل</h4>
                <p className="text-[11px] text-slate-400">تحذير: لا يمكن التراجع عن هذا الإجراء</p>
              </div>
            </div>

            <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700/80 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">عنوان الدفعة:</span>
                <span className="font-bold text-white">{batch.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">عدد الشهادات:</span>
                <span className="font-bold text-amber-400">{certificates.length} شهادة</span>
              </div>
            </div>

            <p className="text-xs text-slate-300">
              هل أنت متأكد من حذف هذه الدفعة بالكامل بما تحتويه من شهادات وسجلات؟
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteBatchConfirm(false)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-lg transition cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={executeDeleteEntireBatch}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>نعم، احذف الدفعة</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HIDDEN OFF-SCREEN RENDER CONTAINER FOR HEADLESS CERTIFICATE CAPTURE */}
      {(() => {
        const targetCert = renderCertTarget || selectedCertificate || certificates[0];
        if (!targetCert) return null;
        const dims = getCertificateDimensions(targetCert.aspectRatio);
        return (
          <div
            ref={hiddenRenderRef}
            style={{
              position: 'fixed',
              left: '-10000px',
              top: '0px',
              width: `${dims.baseWidth}px`,
              height: `${dims.baseHeight}px`,
              minWidth: `${dims.baseWidth}px`,
              minHeight: `${dims.baseHeight}px`,
              maxWidth: `${dims.baseWidth}px`,
              maxHeight: `${dims.baseHeight}px`,
              overflow: 'hidden',
              visibility: 'visible',
              opacity: 1,
              zIndex: -9999,
              pointerEvents: 'none'
            }}
          >
            <CertificateCanvas key={targetCert.id || targetCert.studentName} data={targetCert} isExporting={true} />
          </div>
        );
      })()}

    </div>
  );
};
