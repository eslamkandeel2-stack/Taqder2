import React, { useState, useEffect, useRef } from 'react';
import { CertificateData } from '../types';
import { generateQRCodeDataUrl } from '../utils/qrUtils';
import { generateCode39Bars } from '../utils/barcodeUtils';
import { verifyCertificateByCodeOrName, VerificationResult } from '../utils/verificationService';
import { exportCertificateAsPdf, exportCertificateAsPng, waitForImagesToLoad } from '../utils/exportUtils';
import {
  openCertificateInBrowserWindow,
  printCertificateViaIframe,
  openVerificationStatementInBrowserWindow,
  printVerificationStatementViaIframe
} from '../utils/printUtils';
import { getSavedDefaultSettings } from '../utils/defaultSettings';
import { DriveVerificationRequestModal } from './DriveVerificationRequestModal';
import { CertificateCanvas } from './CertificateCanvas';
import {
  ShieldCheck,
  Search,
  CheckCircle2,
  XCircle,
  X,
  Printer,
  Download,
  Share2,
  Award,
  Calendar,
  Building2,
  User,
  BookOpen,
  QrCode,
  Copy,
  Check,
  Cloud,
  ExternalLink,
  Lock,
  FileCheck,
  Eye,
  FileText,
  Edit3,
  Send
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentCertificate: CertificateData;
  onOpenGoogleDriveModal?: () => void;
  onOpenInEditor?: (cert: CertificateData) => void;
  onShowToast?: (msg: string) => void;
}

export const VerificationModal: React.FC<Props> = ({
  isOpen,
  onClose,
  currentCertificate,
  onOpenGoogleDriveModal,
  onOpenInEditor,
  onShowToast
}) => {
  const [searchCode, setSearchCode] = useState('');
  const [activeTab, setActiveTab] = useState<'details' | 'preview' | 'statement'>('details');
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isDriveRequestModalOpen, setIsDriveRequestModalOpen] = useState(false);

  const statementRef = useRef<HTMLDivElement>(null);
  const verifiedCanvasRef = useRef<HTMLDivElement>(null);

  const showToast = (msg: string) => {
    if (onShowToast) onShowToast(msg);
  };

  const handlePrintStatement = async () => {
    if (!statementRef.current || !result || !result.cert) {
      window.print();
      return;
    }
    showToast('جاري فتح وثيقة التحقق للطباعة الرسمية... 🖨️');
    try {
      const opened = await openVerificationStatementInBrowserWindow(
        statementRef.current,
        result.cert.studentName,
        result.verificationCode
      );
      if (!opened) {
        await printVerificationStatementViaIframe(
          statementRef.current,
          result.cert.studentName,
          result.verificationCode
        );
        showToast('تم إرسال أمر طباعة الوثيقة بنجاح!');
      } else {
        showToast('تم فتح وثيقة التحقق في نافذة الطباعة بنجاح!');
      }
    } catch (e) {
      console.error('Print statement failed:', e);
      window.print();
    }
  };

  const getVerifiedCertificateElement = (): HTMLElement | null => {
    if (verifiedCanvasRef.current) {
      const canvasEl = (verifiedCanvasRef.current.querySelector('[data-certificate-canvas="true"]') as HTMLElement)
        || (verifiedCanvasRef.current.querySelector('#certificate-print-area') as HTMLElement)
        || verifiedCanvasRef.current;
      return canvasEl;
    }
    return document.getElementById('certificate-print-area');
  };

  const handleOpenBrowserPrintWindow = async (cert: CertificateData) => {
    try {
      showToast('جاري فتح نافذة المعاينة والطباعة المباشرة (حفظ PDF)...');
      const el = getVerifiedCertificateElement();
      if (!el) {
        showToast('تعذر العثور على لوحة الشهادة');
        return;
      }
      await waitForImagesToLoad(el);
      const opened = await openCertificateInBrowserWindow(el, cert);
      if (!opened) {
        await printCertificateViaIframe(el, cert);
        showToast('تم إرسال أمر الطباعة المباشرة');
      } else {
        showToast('تم فتح نافذة الطباعة والحفظ بتنسيق PDF بنجاح!');
      }
    } catch (err) {
      console.error('Print window error:', err);
      showToast('حدث خطأ أثناء فتح نافذة الطباعة');
    }
  };

  const handleDownloadPdf = async (cert: CertificateData) => {
    try {
      showToast('جاري تجهيز وتحميل ملف PDF...');
      const el = getVerifiedCertificateElement();
      if (!el) {
        showToast('تعذر تجهيز لوحة الشهادة');
        return;
      }
      await waitForImagesToLoad(el);
      await exportCertificateAsPdf(el, cert);
      showToast('تم تنزيل ملف PDF المنسق بنجاح!');
    } catch (err) {
      console.error('PDF error:', err);
      showToast('تعذر تصدير PDF.');
    }
  };

  const handleDownloadPng = async (cert: CertificateData) => {
    try {
      showToast('جاري تصدير صورة PNG...');
      const el = getVerifiedCertificateElement();
      if (!el) {
        showToast('تعذر تجهيز لوحة الشهادة');
        return;
      }
      await waitForImagesToLoad(el);
      await exportCertificateAsPng(el, cert);
      showToast('تم تحميل صورة الشهادة بنجاح!');
    } catch (err) {
      console.error('PNG error:', err);
      showToast('تعذر تصدير الصورة.');
    }
  };

  const initialCode = currentCertificate.verificationCode || currentCertificate.id;

  useEffect(() => {
    if (isOpen) {
      setSearchCode(initialCode);
      const initialRes = verifyCertificateByCodeOrName(initialCode, currentCertificate);
      setResult(initialRes);

      if (initialRes.found && initialRes.cert) {
        const vUrl = initialRes.cert.driveFileWebViewLink || initialRes.cert.driveFileUrl || `${window.location.origin}/verify?code=${initialRes.verificationCode}`;
        generateQRCodeDataUrl(vUrl).then(url => setQrDataUrl(url));
      }
    }
  }, [isOpen, currentCertificate, initialCode]);

  if (!isOpen) return null;

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchCode.trim()) return;

    setIsSearching(true);
    setTimeout(() => {
      const res = verifyCertificateByCodeOrName(searchCode, currentCertificate);
      setResult(res);
      setIsSearching(false);

      if (res.found && res.cert) {
        const vUrl = res.cert.driveFileWebViewLink || res.cert.driveFileUrl || `${window.location.origin}/verify?code=${res.verificationCode}`;
        generateQRCodeDataUrl(vUrl).then(url => setQrDataUrl(url));
      } else {
        setQrDataUrl('');
      }
    }, 200);
  };

  const handleCopyText = (text: string, key: string, label = 'تم النسخ بنجاح!') => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showToast(label);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleCopyVerificationReport = (cert: CertificateData, res: VerificationResult) => {
    const verifyLink = `${window.location.origin}/verify?code=${res.verificationCode}`;
    const driveLink = cert.driveFileWebViewLink || cert.driveFileUrl || 'غير مرفوع على Drive';
    const text = `📋 **سجل وبيان التوثيق الإلكتروني المعتمد**
━━━━━━━━━━━━━━━━━━━━━━
🛡️ حالة الاعتماد: موثقة ونظامية 100%
🔑 كود التوثيق الوطني: ${res.verificationCode}
🔒 رمز الحماية الرقمي: ${res.checksum}
👤 اسم الطالب: ${cert.studentName}
🎓 الصف / الفصل: ${cert.grade || '—'}
📖 المادة / المجال: ${cert.subject || '—'}
🏫 المؤسسة / المدرسة: ${cert.schoolName || '—'}
📅 تاريخ الإصدار: ${cert.issueDate || '—'}
🌐 رابط التحقق: ${verifyLink}
☁️ ملف Drive: ${driveLink}
━━━━━━━━━━━━━━━━━━━━━━
منصة تَقْدِير لتوثيق الشهادات`;

    navigator.clipboard.writeText(text);
    showToast('تم نسخ التقرير الشامل بنجاح! 📋✨');
  };

  const handleShareWhatsApp = (cert: CertificateData, code: string) => {
    const url = cert.driveFileWebViewLink || `${window.location.origin}/verify?code=${code}`;
    const text = encodeURIComponent(
      `🎓 *شهادة تقدير وتفوق موثقة رسمياً*\n` +
      `👤 اسم الطالب: *${cert.studentName}*\n` +
      `🏫 المدرسة: *${cert.schoolName || 'جهة معتمدة'}*\n` +
      `🔑 رمز التوثيق: *${code}*\n` +
      `🌐 رابط التحقق:\n${url}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/80 backdrop-blur-xs p-0 sm:p-4 font-['Cairo',sans-serif]">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[92dvh] sm:max-h-[90vh] flex flex-col overflow-hidden text-right animate-in fade-in zoom-in-95 duration-200">
        
        {/* Mobile Swipe / Drag Indicator Bar */}
        <div className="pt-2.5 pb-1 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 sm:hidden shrink-0">
          <div className="w-12 h-1 bg-emerald-300/50 rounded-full mx-auto" />
        </div>

        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white p-4 sm:p-6 relative border-b border-slate-800 shrink-0">
          <button
            onClick={onClose}
            className="absolute top-3.5 left-3.5 sm:top-4 sm:left-4 p-2 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-full transition cursor-pointer"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-1 sm:pr-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-slate-950 shadow-md shrink-0">
                <ShieldCheck className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <h3 className="text-base sm:text-xl font-black">منصة التحقق والتوثيق الرقمي</h3>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold">
                    سجل التوثيق الرسمي
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5 leading-tight">
                  تأكد من صحة الشهادة والاعتماد الرسمي ومطابقة الرمز التسلسلي والبصمة الرقمية
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                const code = result?.verificationCode || searchCode || initialCode || '';
                const url = `${window.location.origin}${window.location.pathname}?tab=verify${code ? `&code=${encodeURIComponent(code)}` : ''}`;
                window.open(url, '_blank', 'noopener,noreferrer');
                showToast('تم فتح بوابة التحقق والتوثيق في نافذة مستقلة برابط منفصل! 🌐✨');
              }}
              className="px-3 py-1.5 bg-indigo-600/80 hover:bg-indigo-600 text-white text-[11px] sm:text-xs font-bold rounded-xl border border-indigo-400/40 transition flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
              title="فتح بوابة التحقق في نافذة مستقلة برابط منفصل"
            >
              <ExternalLink className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span>فتح بنافذة مستقلة</span>
            </button>
          </div>
        </div>

        {/* Search Bar & Nav Tabs */}
        <div className="p-3.5 sm:p-5 bg-slate-50 border-b border-slate-200 space-y-3 shrink-0">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value)}
                placeholder="أدخل كود التوثيق أو اسم الطالب..."
                className="w-full pl-4 pr-10 py-2 sm:py-2.5 text-xs sm:text-sm font-mono font-bold bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 uppercase tracking-wider"
                dir="ltr"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className="px-3.5 sm:px-4 py-2 sm:py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSearching ? 'جاري الفحص...' : 'فحص'}
            </button>
          </form>

          {/* Sub Navigation Tabs */}
          {result && result.found && (
            <div className="flex items-center gap-1.5 pt-1 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setActiveTab('details')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  activeTab === 'details'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                <FileCheck className="w-3.5 h-3.5" />
                <span>بيانات التوثيق</span>
              </button>

              <button
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  activeTab === 'preview'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                <Eye className="w-3.5 h-3.5 text-amber-500" />
                <span>معاينة الشهادة</span>
              </button>

              <button
                onClick={() => setActiveTab('statement')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  activeTab === 'statement'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                <Printer className="w-3.5 h-3.5 text-emerald-600" />
                <span>بيان التحقق (للطباعة)</span>
              </button>
            </div>
          )}
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto overscroll-contain touch-pan-y flex-1 space-y-4 sm:space-y-5">
          {result && result.found && result.cert ? (
            <>
              {/* TAB 1: DETAILS */}
              {activeTab === 'details' && (
                <div className="space-y-4">
                  {/* Verified Banner */}
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-emerald-950">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-7 h-7 text-emerald-600 shrink-0" />
                      <div>
                        <h4 className="text-sm font-black flex items-center gap-1.5">
                          <span>شهادة رسمية موثقة ومعتمدة</span>
                          <span className="bg-emerald-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
                            مطابقة 100%
                          </span>
                        </h4>
                        <p className="text-xs text-emerald-800 mt-0.5">
                          تم التحقق من سلامة البصمة الرقمية وتطابق الرمز بسجلات النظام.
                        </p>
                      </div>
                    </div>
                    <div className="bg-emerald-100 px-2.5 py-1 rounded-xl border border-emerald-300 font-mono text-xs font-bold text-emerald-900">
                      {result.checksum}
                    </div>
                  </div>

                  {/* QR & Barcode Section */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {qrDataUrl && (
                        <img src={qrDataUrl} alt="QR Code" className="w-20 h-20 bg-white border p-1 rounded-xl shadow-xs" />
                      )}
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-500 font-bold block">رمز التوثيق الوطني الفريد:</span>
                        <div className="font-mono text-sm font-black text-amber-800 bg-white px-3 py-1 rounded-lg border border-slate-200 tracking-wider inline-block">
                          {result.verificationCode}
                        </div>
                        {/* Code 39 Barcode */}
                        <div className="bg-white p-1 rounded border border-slate-200 flex items-center justify-center max-w-[170px]">
                          {(() => {
                            const { bars, totalWidth } = generateCode39Bars(result.verificationCode);
                            return (
                              <svg viewBox={`0 0 ${totalWidth} 22`} className="h-5 w-auto select-none">
                                {bars.map((bar, idx) => (
                                  <rect key={idx} x={bar.x} y="0" width={bar.width} height="22" fill="#0f172a" />
                                ))}
                              </svg>
                            );
                          })()}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5 w-full sm:w-auto">
                      <button
                        onClick={() => handleCopyText(result.verificationCode, 'modal-code', 'تم نسخ رمز التوثيق')}
                        className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        {copiedKey === 'modal-code' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>نسخ كود التوثيق</span>
                      </button>

                      <button
                        onClick={() => handleCopyText(`${window.location.origin}/verify?code=${result.verificationCode}`, 'modal-link', 'تم نسخ الرابط')}
                        className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        {copiedKey === 'modal-link' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <ExternalLink className="w-3.5 h-3.5" />}
                        <span>نسخ رابط التحقق</span>
                      </button>
                    </div>
                  </div>

                  {/* Academic Record Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                    <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-start gap-2.5">
                      <User className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
                      <div>
                        <span className="text-[10px] text-slate-500 block font-bold">اسم الطالب المكرم</span>
                        <strong className="text-sm text-slate-900 font-extrabold">{result.cert.studentName}</strong>
                      </div>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-start gap-2.5">
                      <Building2 className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                      <div>
                        <span className="text-[10px] text-slate-500 block font-bold">المدرسة / الجهة المانحة</span>
                        <strong className="text-slate-900">{result.cert.schoolName || 'جهة معتمدة'}</strong>
                      </div>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-start gap-2.5">
                      <Award className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                      <div>
                        <span className="text-[10px] text-slate-500 block font-bold">الصف والمادة</span>
                        <strong className="text-slate-900">{result.cert.grade || '—'} - {result.cert.subject || 'عام'}</strong>
                      </div>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-start gap-2.5">
                      <Calendar className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                      <div>
                        <span className="text-[10px] text-slate-500 block font-bold">تاريخ الإصدار</span>
                        <strong className="text-slate-900">{result.cert.issueDate || '—'}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Google Drive File Status */}
                  {result.cert.driveFileWebViewLink ? (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-emerald-900 font-bold">
                        <Cloud className="w-4 h-4 text-emerald-600" />
                        <span>موثقة بملف عالي الدقة على Google Drive</span>
                      </div>
                      <a
                        href={result.cert.driveFileWebViewLink}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-[11px] flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>عرض بالدرايف</span>
                      </a>
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl flex flex-wrap items-center justify-between text-xs gap-2">
                      <span className="text-slate-600 font-bold flex items-center gap-1.5">
                        <Cloud className="w-4 h-4 text-slate-400" />
                        <span>غير مرفوعة على Google Drive</span>
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setIsDriveRequestModalOpen(true)}
                          className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 cursor-pointer transition shadow-xs"
                          title="إرسال طلب توثيق وحفظ الشهادة على Google Drive السحابية"
                        >
                          <Send className="w-3 h-3" />
                          <span>طلب التوثيق على Drive ☁️</span>
                        </button>
                        {onOpenGoogleDriveModal && (
                          <button
                            type="button"
                            onClick={onOpenGoogleDriveModal}
                            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-[11px] cursor-pointer"
                          >
                            رفع للـ Drive
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: LIVE CANVAS PREVIEW */}
              {activeTab === 'preview' && (
                <div className="p-4 bg-slate-100 rounded-2xl flex flex-col items-center justify-center space-y-3">
                  <div className="w-full max-w-xl flex flex-wrap items-center justify-between gap-2 bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                      <Award className="w-3.5 h-3.5 text-amber-500" />
                      <span>{result.cert.studentName}</span>
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenBrowserPrintWindow(result.cert!)}
                        className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] rounded-lg flex items-center gap-1 cursor-pointer"
                      >
                        <Printer className="w-3 h-3 text-amber-300" />
                        <span>طباعة / PDF المتصفح</span>
                      </button>
                      <button
                        onClick={() => handleDownloadPdf(result.cert!)}
                        className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-[11px] rounded-lg flex items-center gap-1 cursor-pointer"
                      >
                        <FileText className="w-3 h-3" />
                        <span>PDF</span>
                      </button>
                      <button
                        onClick={() => handleDownloadPng(result.cert!)}
                        className="px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white font-bold text-[11px] rounded-lg flex items-center gap-1 cursor-pointer"
                      >
                        <Download className="w-3 h-3" />
                        <span>PNG</span>
                      </button>
                    </div>
                  </div>

                  <div className="w-full max-w-xl shadow-xl rounded-xl overflow-hidden border border-slate-300">
                    <CertificateCanvas data={result.cert} isExporting={false} />
                  </div>
                </div>
              )}

              {/* TAB 3: PRINTABLE STATEMENT */}
              {activeTab === 'statement' && (() => {
                const docSettings = getSavedDefaultSettings();
                const ministryH1 = docSettings.verificationDocMinistryHeader1 || 'المملكة العربية السعودية';
                const ministryH2 = docSettings.verificationDocMinistryHeader2 || 'وزارة التعليم / منصة تَقْدِير';
                const platformName = docSettings.verificationDocPlatformName || 'منصة تَقْدِير الوطنية لتوثيق الشهادات والجوائز التعليمية';
                const docTitle = docSettings.verificationDocTitle || 'إفادة وتحقق إلكتروني رسمي من صحة شهادة تقدير';
                const docSubtitle = docSettings.verificationDocSubtitle || 'Official Certificate Verification & Authentication Statement';
                const declaration = docSettings.verificationDocDeclaration || 'تشهد منصة تَقْدِير ومطابقة السجلات الرقمية بأن شهادة التقدير والتفوق الصادرة بالبيانات أدناه هي شهادة أصلية، نظامية، وموثقة إلكترونياً بقواعد البيانات المركزية:';
                const authority = docSettings.verificationDocAuthority || 'إدارة التوثيق والاعتماد الأكاديمي الرقمي';
                const watermark = docSettings.verificationDocWatermark || 'معتمد رسمياً - VERIFIED';
                const primaryCol = docSettings.verificationDocPrimaryColor || '#047857';
                const borderCol = docSettings.verificationDocBorderColor || '#10b981';

                return (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <span className="text-xs text-slate-700 font-bold">وثيقة التحقق الرسمية الجاهزة للطباعة:</span>
                      <button
                        type="button"
                        onClick={handlePrintStatement}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>طباعة الوثيقة الرسمية</span>
                      </button>
                    </div>

                    <div
                      ref={statementRef}
                      className="p-6 bg-white border-2 rounded-2xl space-y-4 text-xs font-['Cairo',sans-serif] relative overflow-hidden shadow-xs"
                      style={{ borderColor: borderCol }}
                    >
                      {watermark && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] select-none z-0">
                          <span className="text-4xl font-black rotate-[-20deg] text-slate-900 whitespace-nowrap">
                            {watermark}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between border-b pb-3 relative z-10" style={{ borderColor: primaryCol }}>
                        <div>
                          <h4 className="font-black text-slate-900 text-sm">{ministryH1}</h4>
                          <p className="text-[11px] font-bold text-slate-700">{ministryH2}</p>
                          <p className="text-[10px] text-slate-500">{platformName}</p>
                        </div>
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center border shadow-xs"
                          style={{ backgroundColor: `${primaryCol}15`, borderColor: primaryCol, color: primaryCol }}
                        >
                          <ShieldCheck className="w-7 h-7" />
                        </div>
                      </div>

                      <div className="text-center py-1 relative z-10">
                        <h5 className="font-black text-slate-950 text-sm">{docTitle}</h5>
                        <p className="text-[10px] text-slate-500 font-mono">{docSubtitle}</p>
                      </div>

                      <div className="space-y-2 relative z-10 bg-slate-50 p-3.5 rounded-xl border border-slate-200 leading-relaxed text-slate-800">
                        <p className="font-semibold text-slate-900">{declaration}</p>
                        <div className="text-center py-1">
                          <span className="text-base font-black text-indigo-950 bg-indigo-50 px-6 py-1 rounded-lg border border-indigo-200 inline-block">
                            {result.cert.studentName}
                          </span>
                        </div>
                        <p>
                          المسجل بالصف: <strong>{result.cert.grade || '—'}</strong> بمدرسة: <strong>{result.cert.schoolName || 'جهة معتمدة'}</strong>، في مادة/مجال: <strong>{result.cert.subject || 'عام'}</strong>، هي شهادة موثقة ورسمية.
                        </p>

                        <div className="bg-white p-2.5 rounded-lg border text-center font-mono font-bold text-amber-900 text-xs shadow-xs">
                          كود التوثيق: {result.verificationCode} {docSettings.verificationDocShowChecksum !== false ? `| بصمة الأمان: ${result.checksum}` : ''}
                        </div>
                      </div>

                      <div className="pt-2 flex flex-wrap justify-between items-center text-[10px] text-slate-500 border-t border-slate-200 relative z-10 gap-2">
                        {docSettings.verificationDocShowSecurityStamp !== false && (
                          <div className="flex items-center gap-1 font-bold" style={{ color: primaryCol }}>
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>{authority} (معتمد رسمياً)</span>
                          </div>
                        )}
                        {docSettings.verificationDocShowQr !== false && qrDataUrl && (
                          <img src={qrDataUrl} alt="QR" className="w-12 h-12 border p-0.5 rounded-lg bg-white shadow-xs" />
                        )}
                        <span>تاريخ الاستعلام: {new Date().toLocaleDateString('ar-SA')}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </>
          ) : result && !result.found ? (
            <div className="p-8 bg-rose-50 border border-rose-200 rounded-2xl text-center space-y-2">
              <XCircle className="w-10 h-10 text-rose-500 mx-auto" />
              <h4 className="text-sm font-bold text-rose-900">لم يتم العثور على شهادة بهذا الرمز</h4>
              <p className="text-xs text-rose-700">تأكد من كتابة الكود بشكل صحيح.</p>
            </div>
          ) : null}
        </div>

        {/* Modal Footer Actions */}
        <div className="bg-slate-50 p-3 sm:p-4 border-t border-slate-200 flex flex-wrap justify-between items-center gap-2 text-xs shrink-0">
          <div className="flex flex-wrap items-center gap-1.5">
            {result && result.found && result.cert && (
              <>
                <button
                  onClick={() => handleOpenBrowserPrintWindow(result.cert!)}
                  className="px-2.5 sm:px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl flex items-center gap-1 cursor-pointer shadow-xs text-[11px] sm:text-xs"
                  title="معاينة للطباعة المباشرة وحفظ بصيغة PDF من نافذة المتصفح"
                >
                  <Printer className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                  <span className="truncate">معاينة للطباعة المباشرة</span>
                </button>

                <button
                  onClick={() => handleDownloadPdf(result.cert!)}
                  className="px-2.5 sm:px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-xl flex items-center gap-1 cursor-pointer shadow-xs text-[11px] sm:text-xs"
                >
                  <FileText className="w-3.5 h-3.5 shrink-0" />
                  <span>PDF</span>
                </button>

                <button
                  onClick={() => handleCopyVerificationReport(result.cert!, result)}
                  className="px-2.5 sm:px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl flex items-center gap-1 cursor-pointer text-[11px] sm:text-xs"
                >
                  <Copy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>نسخ</span>
                </button>

                <button
                  onClick={() => handleShareWhatsApp(result.cert!, result.verificationCode)}
                  className="px-2.5 sm:px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center gap-1 cursor-pointer text-[11px] sm:text-xs"
                >
                  <Share2 className="w-3.5 h-3.5 shrink-0" />
                  <span>واتساب</span>
                </button>

                {onOpenInEditor && (
                  <button
                    onClick={() => {
                      onOpenInEditor(result.cert!);
                      onClose();
                    }}
                    className="px-2.5 sm:px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl flex items-center gap-1 cursor-pointer text-[11px] sm:text-xs"
                  >
                    <Edit3 className="w-3.5 h-3.5 shrink-0" />
                    <span>المحرر</span>
                  </button>
                )}
              </>
            )}
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl transition cursor-pointer text-xs"
          >
            إغلاق
          </button>
        </div>

        {/* Dedicated Offscreen Canvas to Guarantee Exact DOM Structure and Styles */}
        {result && result.cert && (
          <div
            className="fixed -left-[10000px] top-0 pointer-events-none z-[-9999]"
            style={{
              width: '1050px',
              height: '742px',
              opacity: 1,
              visibility: 'visible',
              overflow: 'visible'
            }}
            aria-hidden="true"
          >
            <div ref={verifiedCanvasRef}>
              <CertificateCanvas data={result.cert} isExporting={true} />
            </div>
          </div>
        )}

      </div>

      {isDriveRequestModalOpen && result && result.cert && (
        <DriveVerificationRequestModal
          isOpen={isDriveRequestModalOpen}
          certificate={result.cert}
          onClose={() => setIsDriveRequestModalOpen(false)}
          onSuccess={showToast}
        />
      )}
    </div>
  );
};
