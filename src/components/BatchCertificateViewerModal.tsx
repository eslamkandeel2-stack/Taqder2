import React, { useState, useRef, useEffect } from 'react';
import { CertificateData, BatchRecord, BatchVerificationReportItem } from '../types';
import { CertificateCanvas } from './CertificateCanvas';
import {
  exportBatchCertificatesAsSinglePdf,
  exportCertificateAsPdf,
  exportCertificateAsPng,
  captureCertificateCanvasBlob,
  findCertificateCanvasElement,
  getCertificateDimensions
} from '../utils/exportUtils';
import {
  googleSignIn,
  initDriveAuth,
  uploadCertificateToDrive,
  getAccessToken
} from '../services/googleDriveService';
import { generateVerificationCode, generateQRCodeDataUrl } from '../utils/qrUtils';
import { saveBatchRecord, deleteBatchRecord } from '../utils/batchManager';
import { User } from 'firebase/auth';
import {
  X,
  Printer,
  Download,
  Cloud,
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
  RefreshCw,
  FileText,
  Grid,
  Table as TableIcon,
  Users,
  AlertCircle,
  Loader2,
  FileSpreadsheet,
  CheckCheck,
  Share2,
  ChevronLeft,
  ChevronRight,
  Maximize2
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  batch: BatchRecord;
  onUpdateBatch: (updated: BatchRecord) => void;
  onApplySingleToEditor: (cert: CertificateData) => void;
  onShowToast: (msg: string) => void;
}

export const BatchCertificateViewerModal: React.FC<Props> = ({
  isOpen,
  onClose,
  batch,
  onUpdateBatch,
  onApplySingleToEditor,
  onShowToast
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'table' | 'preview'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCertId, setSelectedCertId] = useState<string>(batch.certificates?.[0]?.id || '');
  const [editingCert, setEditingCert] = useState<CertificateData | null>(null);

  // Deletion Confirmation States
  const [certToDelete, setCertToDelete] = useState<CertificateData | null>(null);
  const [showDeleteBatchConfirm, setShowDeleteBatchConfirm] = useState(false);

  // Exporting state
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [exportProgress, setExportProgress] = useState<{ current: number; total: number; name: string } | null>(null);

  // Drive Batch Upload state
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [isUploadingToDrive, setIsUploadingToDrive] = useState(false);
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

  if (!isOpen) return null;

  const certificates = batch.certificates || [];

  const filteredCertificates = certificates.filter(cert => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      cert.studentName.toLowerCase().includes(q) ||
      (cert.verificationCode && cert.verificationCode.toLowerCase().includes(q)) ||
      cert.grade.toLowerCase().includes(q) ||
      cert.subject.toLowerCase().includes(q)
    );
  });

  const selectedCertificate = certificates.find(c => c.id === selectedCertId) || certificates[0];

  // Helper to render certificate to DOM for headless capture
  const renderCertificateToDom = async (cert: CertificateData): Promise<HTMLElement> => {
    setRenderCertTarget(cert);
    // Allow state to propagate and DOM to render
    for (let attempt = 0; attempt < 20; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 35));
      const container = hiddenRenderRef.current;
      if (container) {
        const el = (container.querySelector('#certificate-print-area') || container.querySelector('[data-certificate-canvas="true"]')) as HTMLElement;
        if (el) return el;
      }
    }
    if (hiddenRenderRef.current) return hiddenRenderRef.current as HTMLElement;
    return (document.getElementById('certificate-print-area') || document.body) as HTMLElement;
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
          onProgress: (current, total, name) => {
            setExportProgress({ current, total, name });
          }
        }
      );

      onShowToast(`تم بنجاح تصدير ملف PDF المجمع لـ ${certificates.length} شهادة! 📄✨`);
    } catch (err: any) {
      console.error('Error exporting batch combined PDF:', err);
      onShowToast('حدث خطأ أثناء تصدير ملف PDF المجمع.');
    } finally {
      setIsExportingPdf(false);
      setExportProgress(null);
      setRenderCertTarget(null);
    }
  };

  // 2. Export Single Certificate with exact layout fidelity
  const handleExportSinglePdf = async (cert: CertificateData) => {
    try {
      onShowToast(`جاري تصدير شهادة ${cert.studentName}...`);
      const el = await renderCertificateToDom(cert);
      await exportCertificateAsPdf(el, cert);
      onShowToast(`تم تحميل شهادة ${cert.studentName} بنجاح! 📥`);
    } catch (e) {
      console.error(e);
      onShowToast('فشل تصدير الشهادة الفردية.');
    } finally {
      setTimeout(() => setRenderCertTarget(null), 150);
    }
  };

  const handleExportSinglePng = async (cert: CertificateData) => {
    try {
      onShowToast(`جاري حفظ صورة شهادة ${cert.studentName}...`);
      const el = await renderCertificateToDom(cert);
      await exportCertificateAsPng(el, cert);
      onShowToast(`تم تحميل صورة شهادة ${cert.studentName} بنجاح! 🖼️`);
    } catch (e) {
      console.error(e);
      onShowToast('فشل حفظ صورة الشهادة.');
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
        // Render certificate to capture Blob
        const certWithCode: CertificateData = {
          ...origCert,
          verificationCode: vCode,
          qrCodeData: `${window.location.origin}/verify?code=${vCode}`
        };

        const element = await renderCertificateToDom(certWithCode);
        await new Promise((r) => setTimeout(r, 100));

        const blob = await captureCertificateCanvasBlob(element, certWithCode, { scale: 2.8 });

        const safeStudentName = studentName.replace(/[^\w\s\u0600-\u06FF-]/gi, '').trim().replace(/\s+/g, '_');
        const fileName = `شهادة_${safeStudentName}_${vCode}.png`;

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

    // Update the whole batch with verified certificates
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

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-7xl max-h-[96vh] flex flex-col shadow-2xl text-slate-100 overflow-hidden text-right">
        
        {/* Modal Top Header */}
        <div className="p-4 sm:p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 border-b border-slate-700/70 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shrink-0">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="p-2 bg-amber-500/20 text-amber-300 rounded-xl border border-amber-500/30">
                <Users className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                  {batch.title || 'دفعة شهادات الفصل'}
                  {batch.isVerifiedOnDrive && (
                    <span className="text-[11px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" /> موثقة على Google Drive
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-400">
                  {batch.grade} • {batch.subject} • إجمالي: <span className="text-amber-300 font-bold">{certificates.length} شهادة</span>
                </p>
              </div>
            </div>
          </div>

          {/* Top Quick Actions Bar */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
            
            {/* Export Multi-Page Combined PDF */}
            <button
              onClick={handleExportBatchCombinedPdf}
              disabled={isExportingPdf || certificates.length === 0}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
              title="تجميع كافة شهادات الدفعة في ملف PDF واحد عالي الدقة للطباعة الفورية"
            >
              {isExportingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>جاري معالجة PDF ({exportProgress?.current}/{exportProgress?.total})...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>تصدير ملف PDF مجمع (A4)</span>
                </>
              )}
            </button>

            {/* Google Drive Batch Verify */}
            <button
              onClick={handleStartBatchDriveVerification}
              disabled={isUploadingToDrive || certificates.length === 0}
              className="px-3.5 py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 disabled:opacity-50 text-slate-950 font-black text-xs rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
              title="توثيق الدفعة بالكامل على Google Drive وإنشاء باركود ورابط منفصل لكل طالب"
            >
              {isUploadingToDrive ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>جاري الرفع ({driveProgress?.current}/{driveProgress?.total})...</span>
                </>
              ) : (
                <>
                  <HardDrive className="w-4 h-4" />
                  <span>توثيق الدفعة على درايف</span>
                </>
              )}
            </button>

            {/* View Links Report */}
            {certificates.some(c => c.driveFileWebViewLink) && (
              <button
                onClick={() => setIsDriveModalOpen(true)}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-sky-300 font-bold text-xs rounded-xl border border-slate-600 transition flex items-center gap-1 cursor-pointer"
                title="عرض جدول روابط التوثيق المباشرة"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>تقرير الروابط</span>
              </button>
            )}

            {/* Delete Batch Button */}
            <button
              onClick={() => setShowDeleteBatchConfirm(true)}
              className="p-2 text-rose-400 hover:text-rose-200 hover:bg-rose-950/50 rounded-xl transition cursor-pointer"
              title="حذف هذه الدفعة بالكامل"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
              title="إغلاق النافذة"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search & View Switcher Bar */}
        <div className="p-3 bg-slate-800/80 border-b border-slate-700/60 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث باسم الطالب أو رمز التوثيق..."
              className="w-full pl-3 pr-9 py-1.5 bg-slate-900 border border-slate-700 text-xs rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <span className="text-xs text-slate-400 font-medium">
              النتائج: <span className="text-white font-bold">{filteredCertificates.length}</span> من {certificates.length}
            </span>

            <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-700">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-2.5 py-1 text-xs rounded-lg font-bold flex items-center gap-1 transition ${
                  viewMode === 'grid' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Grid className="w-3.5 h-3.5" />
                <span>بطاقات</span>
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-2.5 py-1 text-xs rounded-lg font-bold flex items-center gap-1 transition ${
                  viewMode === 'table' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>جدول</span>
              </button>
              <button
                onClick={() => setViewMode('preview')}
                className={`px-2.5 py-1 text-xs rounded-lg font-bold flex items-center gap-1 transition ${
                  viewMode === 'preview' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>معاينة وتعديل</span>
              </button>
            </div>
          </div>
        </div>

        {/* Progress Banner during Multi-page PDF or Drive Upload */}
        {(isExportingPdf || isUploadingToDrive) && (
          <div className="bg-amber-500/10 border-b border-amber-500/30 p-3 flex items-center justify-between gap-4 px-6 text-xs text-amber-200">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
              <span>
                {isExportingPdf
                  ? `جاري تجهيز الشهادة رقم (${exportProgress?.current} من ${exportProgress?.total}) - ${exportProgress?.name}...`
                  : `جاري رفع وتوثيق الشهادة رقم (${driveProgress?.current} من ${driveProgress?.total}) - ${driveProgress?.name} على Google Drive...`}
              </span>
            </div>
            <div className="w-48 bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700">
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
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* VIEW MODE 1: GRID CARDS */}
          {viewMode === 'grid' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCertificates.map((cert, index) => {
                const isSelected = cert.id === selectedCertId;
                const isDriveUploaded = Boolean(cert.driveFileWebViewLink);

                return (
                  <div
                    key={cert.id}
                    className={`bg-slate-800/90 border ${
                      isSelected ? 'border-amber-400 ring-2 ring-amber-400/30' : 'border-slate-700 hover:border-slate-600'
                    } rounded-2xl p-4 flex flex-col justify-between gap-3 shadow-sm transition relative group`}
                  >
                    {/* Card Top */}
                    <div className="flex items-center justify-between gap-2 border-b border-slate-700/80 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black bg-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded-lg border border-amber-500/30">
                          #{index + 1}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">
                          {cert.verificationCode || 'غير موثق'}
                        </span>
                      </div>

                      {isDriveUploaded ? (
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3" /> تم التوثيق
                        </span>
                      ) : (
                        <span className="text-[10px] bg-slate-700 text-slate-400 px-2 py-0.5 rounded-full font-medium">
                          دفعة محلية
                        </span>
                      )}
                    </div>

                    {/* Student Info */}
                    <div className="space-y-1 py-1">
                      <h4 className="font-black text-base text-white hover:text-amber-300 transition">
                        {cert.studentName}
                      </h4>
                      <p className="text-xs text-slate-400">
                        {cert.grade} • {cert.subject}
                      </p>
                      <p className="text-[11px] text-amber-200/80 italic line-clamp-2 mt-1">
                        "{cert.appreciationText}"
                      </p>
                    </div>

                    {/* Drive Link if available */}
                    {cert.driveFileWebViewLink && (
                      <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-700/60 flex items-center justify-between text-[11px] text-sky-300">
                        <span className="truncate max-w-[170px] font-mono text-[10px]">
                          {cert.driveFileWebViewLink}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => copyToClipboard(cert.driveFileWebViewLink!, cert.id)}
                            className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white"
                            title="نسخ رابط درايف"
                          >
                            {copiedCode === cert.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                          <a
                            href={cert.driveFileWebViewLink}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white"
                            title="فتح على Google Drive"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    )}

                    {/* Card Actions */}
                    <div className="pt-2 border-t border-slate-700/80 flex items-center justify-between gap-1 text-xs">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setSelectedCertId(cert.id);
                            setViewMode('preview');
                          }}
                          className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold rounded-lg transition flex items-center gap-1"
                          title="معاينة حية"
                        >
                          <Eye className="w-3 h-3" /> معاينة
                        </button>
                        <button
                          onClick={() => setEditingCert(cert)}
                          className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition"
                          title="تعديل البيانات"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleExportSinglePdf(cert)}
                          className="p-1.5 bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 hover:text-white rounded-lg transition"
                          title="تصدير PDF فردي"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleExportSinglePng(cert)}
                          className="p-1.5 bg-sky-600/30 hover:bg-sky-600 text-sky-300 hover:text-white rounded-lg transition"
                          title="تصدير صورة PNG"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            onApplySingleToEditor(cert);
                            onClose();
                          }}
                          className="p-1.5 bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 rounded-lg transition"
                          title="فتح في المحرر الرئيسي"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => confirmDeleteCert(cert)}
                          className="p-1.5 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white rounded-lg transition cursor-pointer"
                          title="حذف من الدفعة"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* VIEW MODE 2: TABLE VIEW */}
          {viewMode === 'table' && (
            <div className="bg-slate-800/80 border border-slate-700 rounded-2xl overflow-hidden shadow">
              <div className="p-3 bg-slate-900 border-b border-slate-700 flex items-center justify-between">
                <h4 className="font-extrabold text-xs text-slate-300 flex items-center gap-2">
                  <TableIcon className="w-4 h-4 text-amber-400" />
                  جدول شهادات الدفعة التفصيلي
                </h4>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDownloadCsv}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-amber-300 font-bold rounded-xl border border-slate-700 flex items-center gap-1 transition"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    تصدير Excel/CSV
                  </button>
                  <button
                    onClick={handleCopyAllLinksSheet}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-sky-300 font-bold rounded-xl border border-slate-700 flex items-center gap-1 transition"
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
                      <th className="p-3 text-center w-12">#</th>
                      <th className="p-3">اسم الطالب / الطالبة</th>
                      <th className="p-3">الصف</th>
                      <th className="p-3">المادة / المجال</th>
                      <th className="p-3">رمز التحقق (الباركود)</th>
                      <th className="p-3">رابط التوثيق على درايف</th>
                      <th className="p-3 text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/60">
                    {filteredCertificates.map((cert, idx) => (
                      <tr key={cert.id} className="hover:bg-slate-700/30 transition">
                        <td className="p-3 text-center font-mono font-bold text-amber-400">{idx + 1}</td>
                        <td className="p-3 font-extrabold text-white">{cert.studentName}</td>
                        <td className="p-3 text-slate-300">{cert.grade}</td>
                        <td className="p-3 text-slate-300">{cert.subject}</td>
                        <td className="p-3 font-mono text-amber-200">{cert.verificationCode}</td>
                        <td className="p-3">
                          {cert.driveFileWebViewLink ? (
                            <div className="flex items-center gap-1 text-sky-300">
                              <span className="font-mono text-[11px] truncate max-w-[160px]">{cert.driveFileWebViewLink}</span>
                              <button
                                onClick={() => copyToClipboard(cert.driveFileWebViewLink!, cert.id)}
                                className="p-1 hover:bg-slate-800 rounded"
                                title="نسخ"
                              >
                                {copiedCode === cert.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                              <a href={cert.driveFileWebViewLink} target="_blank" rel="noreferrer" className="p-1 hover:bg-slate-800 rounded">
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          ) : (
                            <span className="text-slate-500 text-[11px]">غير مرفوع بعد</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => {
                                setSelectedCertId(cert.id);
                                setViewMode('preview');
                              }}
                              className="p-1.5 hover:bg-slate-700 text-slate-300 hover:text-white rounded"
                              title="معاينة"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleExportSinglePdf(cert)}
                              className="p-1.5 hover:bg-slate-700 text-emerald-400 rounded"
                              title="تصدير PDF"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                onApplySingleToEditor(cert);
                                onClose();
                              }}
                              className="p-1.5 hover:bg-slate-700 text-amber-400 rounded cursor-pointer"
                              title="تعديل بالمحرر"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => confirmDeleteCert(cert)}
                              className="p-1.5 hover:bg-rose-950/50 text-rose-400 hover:text-rose-300 rounded cursor-pointer"
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
          {viewMode === 'preview' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left Column: Student Selector List (4 Cols) */}
              <div className="lg:col-span-4 bg-slate-800/90 border border-slate-700 rounded-2xl p-3 space-y-2 max-h-[600px] overflow-y-auto">
                <h5 className="font-extrabold text-xs text-slate-300 pb-2 border-b border-slate-700">
                  قائمة طلاب الدفعة ({certificates.length})
                </h5>
                <div className="space-y-1.5">
                  {certificates.map((cert, idx) => {
                    const isSelected = cert.id === selectedCertId;
                    return (
                      <button
                        key={cert.id}
                        onClick={() => setSelectedCertId(cert.id)}
                        className={`w-full text-right p-2.5 rounded-xl text-xs transition flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                            : 'bg-slate-900/80 hover:bg-slate-700 text-slate-200'
                        }`}
                      >
                        <div className="truncate">
                          <span className="font-mono ml-1.5 opacity-70">#{idx + 1}</span>
                          <span>{cert.studentName}</span>
                        </div>
                        {cert.driveFileWebViewLink && (
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-bold">
                            موثق
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Live Certificate Canvas Preview (8 Cols) */}
              <div className="lg:col-span-8 bg-slate-800/60 border border-slate-700 rounded-2xl p-4 flex flex-col items-center justify-center min-h-[500px] relative">
                <div className="w-full flex items-center justify-between mb-3 pb-2 border-b border-slate-700">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-sm text-amber-300">{selectedCertificate.studentName}</span>
                    <span className="text-xs text-slate-400">({selectedCertificate.grade})</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleExportSinglePdf(selectedCertificate)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow transition flex items-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" /> PDF
                    </button>
                    <button
                      onClick={() => {
                        onApplySingleToEditor(selectedCertificate);
                        onClose();
                      }}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow transition flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> فتح بالمحرر
                    </button>
                    <button
                      onClick={() => confirmDeleteCert(selectedCertificate)}
                      className="p-1.5 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white rounded-xl transition cursor-pointer"
                      title="حذف هذه الشهادة"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="w-full overflow-hidden flex items-center justify-center">
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
        <div className="p-4 bg-slate-900 border-t border-slate-700/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 shrink-0">
          <div>
            <span>تاريخ إنشاء الدفعة: {new Date(batch.createdAt).toLocaleDateString('ar-SA')}</span>
            {batch.updatedAt && (
              <span className="mr-3">آخر تحديث: {new Date(batch.updatedAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportBatchCombinedPdf}
              disabled={isExportingPdf}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow"
            >
              <Download className="w-4 h-4" />
              تصدير ملف PDF مجمع لكافة الشهادات ({certificates.length})
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl transition cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </div>

      </div>

      {/* QUICK EDIT MODAL FOR SINGLE STUDENT IN BATCH */}
      {editingCert && (
        <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full text-right space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <h4 className="font-extrabold text-sm text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-amber-400" />
                تعديل بيانات شهادة الطالب
              </h4>
              <button onClick={() => setEditingCert(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">اسم الطالب:</label>
              <input
                type="text"
                value={editingCert.studentName}
                onChange={(e) => setEditingCert({ ...editingCert, studentName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-xs rounded-xl text-white font-bold"
              />
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
                onClick={() => setEditingCert(null)}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl"
              >
                إلغاء
              </button>
              <button
                onClick={() => handleSaveCertEdit(editingCert)}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl shadow"
              >
                حفظ التعديل
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DRIVE VERIFICATION REPORT MODAL */}
      {isDriveModalOpen && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-4xl w-full text-right space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-emerald-500/20 text-emerald-300 rounded-xl">
                  <ShieldCheck className="w-5 h-5" />
                </span>
                <div>
                  <h4 className="font-extrabold text-base text-white">تقرير توثيق الدفعة على Google Drive</h4>
                  <p className="text-xs text-slate-400">تم إنشاء روابط وبراكودات التوثيق الفردية لكل طالب في الدفعة</p>
                </div>
              </div>
              <button onClick={() => setIsDriveModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center justify-between gap-3 bg-slate-800/80 p-3 rounded-2xl border border-slate-700 text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <HardDrive className="w-4 h-4 text-amber-400" />
                <span>إجمالي الشهادات الموثقة: <strong className="text-white">{certificates.filter(c => c.driveFileWebViewLink).length}</strong> من {certificates.length}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyAllLinksSheet}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl flex items-center gap-1 transition"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copiedAllLinks ? 'تم نسخ الكشف!' : 'نسخ كشف الروابط بالكامل'}
                </button>
                <button
                  onClick={handleDownloadCsv}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center gap-1 transition"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  تصدير ملف Excel
                </button>
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto border border-slate-700 rounded-2xl">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-700 font-bold sticky top-0">
                  <tr>
                    <th className="p-3 text-center w-12">#</th>
                    <th className="p-3">اسم الطالب</th>
                    <th className="p-3">رمز التوثيق / الباركود</th>
                    <th className="p-3">رابط التوثيق المباشر</th>
                    <th className="p-3 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {certificates.map((cert, idx) => (
                    <tr key={cert.id} className="hover:bg-slate-800/40">
                      <td className="p-3 text-center font-mono text-amber-400 font-bold">{idx + 1}</td>
                      <td className="p-3 font-bold text-white">{cert.studentName}</td>
                      <td className="p-3 font-mono text-amber-200">{cert.verificationCode}</td>
                      <td className="p-3 font-mono text-sky-300 text-[11px] truncate max-w-xs">
                        {cert.driveFileWebViewLink || 'غير متوفر'}
                      </td>
                      <td className="p-3 text-center">
                        {cert.driveFileWebViewLink && (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => copyToClipboard(cert.driveFileWebViewLink!, cert.id)}
                              className="p-1 hover:bg-slate-800 rounded text-slate-300"
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

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsDriveModalOpen(false)}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl"
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
          <div className="bg-slate-900 border border-slate-700 max-w-md w-full rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-3 bg-rose-500/20 rounded-xl">
                <Trash2 className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <h4 className="font-extrabold text-base text-white">تأكيد حذف الشهادة</h4>
                <p className="text-xs text-slate-400">هذا الإجراء سيقوم بحذف الشهادة من هذه الدفعة</p>
              </div>
            </div>

            <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/80 text-xs space-y-1">
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
                onClick={() => setCertToDelete(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                إلغاء
              </button>
              <button
                onClick={() => executeDeleteCert(certToDelete.id)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-xl shadow-lg shadow-rose-600/30 transition flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>تأكيد الحذف</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ENTIRE BATCH DELETE CONFIRMATION MODAL */}
      {showDeleteBatchConfirm && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 max-w-md w-full rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-3 bg-rose-500/20 rounded-xl">
                <AlertCircle className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <h4 className="font-extrabold text-base text-white">تأكيد حذف الدفعة بالكامل</h4>
                <p className="text-xs text-slate-400">تحذير: لا يمكن التراجع عن هذا الإجراء</p>
              </div>
            </div>

            <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/80 text-xs space-y-1">
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
                onClick={() => setShowDeleteBatchConfirm(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                إلغاء
              </button>
              <button
                onClick={executeDeleteEntireBatch}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-xl shadow-lg shadow-rose-600/30 transition flex items-center gap-1.5 cursor-pointer"
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
              left: '-9999px',
              top: '-9999px',
              width: `${dims.baseWidth}px`,
              height: `${dims.baseHeight}px`,
              minWidth: `${dims.baseWidth}px`,
              minHeight: `${dims.baseHeight}px`,
              maxWidth: `${dims.baseWidth}px`,
              maxHeight: `${dims.baseHeight}px`,
              overflow: 'visible',
              visibility: 'visible',
              zIndex: -999,
              pointerEvents: 'none'
            }}
          >
            <CertificateCanvas data={targetCert} isExporting={true} />
          </div>
        );
      })()}

    </div>
  );
};
