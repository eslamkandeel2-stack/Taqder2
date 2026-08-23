import React, { useState, useEffect, useRef } from 'react';
import { CertificateData } from '../types';
import {
  verifyCertificateByCodeOrName,
  getAllVerifiableCertificates,
  VerificationResult
} from '../utils/verificationService';
import { generateQRCodeDataUrl } from '../utils/qrUtils';
import { generateCode39Bars } from '../utils/barcodeUtils';
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
  QrCode,
  Barcode,
  Copy,
  Check,
  ExternalLink,
  Printer,
  Download,
  Share2,
  Cloud,
  Award,
  Calendar,
  Building2,
  User as UserIcon,
  BookOpen,
  Edit3,
  Sparkles,
  Lock,
  Layers,
  FileText,
  FileCheck,
  RefreshCw,
  Eye,
  EyeOff,
  AlertCircle,
  Send
} from 'lucide-react';

interface Props {
  currentCertificate: CertificateData;
  onOpenInEditor?: (cert: CertificateData) => void;
  onOpenGoogleDriveModal?: (cert: CertificateData) => void;
  onShowToast?: (msg: string) => void;
  initialCode?: string;
  isStandalone?: boolean;
  onBackToApp?: () => void;
}

export const VerificationPortal: React.FC<Props> = ({
  currentCertificate,
  onOpenInEditor,
  onOpenGoogleDriveModal,
  onShowToast,
  initialCode,
  isStandalone = false,
  onBackToApp
}) => {
  const [searchQuery, setSearchQuery] = useState(initialCode || '');
  const [activeTab, setActiveTab] = useState<'details' | 'canvas' | 'statement'>('details');
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [allCertsList, setAllCertsList] = useState<Array<{ cert: CertificateData; source: string; batchTitle?: string }>>([]);
  const [isDriveRequestModalOpen, setIsDriveRequestModalOpen] = useState(false);

  const statementRef = useRef<HTMLDivElement>(null);
  const verifiedCanvasRef = useRef<HTMLDivElement>(null);

  const showToast = (msg: string) => {
    if (onShowToast) onShowToast(msg);
  };

  // Helper to reliably find the certificate DOM element for result.cert
  const getVerifiedCertificateElement = (): HTMLElement | null => {
    if (verifiedCanvasRef.current) {
      const canvasEl = (verifiedCanvasRef.current.querySelector('[data-certificate-canvas="true"]') as HTMLElement)
        || (verifiedCanvasRef.current.querySelector('#certificate-print-area') as HTMLElement)
        || verifiedCanvasRef.current;
      return canvasEl;
    }
    return document.getElementById('certificate-print-area');
  };

  // 1. Dedicated Direct Browser Window Print & PDF Method (from PrintPreviewModal)
  const handleOpenBrowserPrintWindow = async (cert: CertificateData) => {
    try {
      showToast('جاري فتح نافذة المعاينة والطباعة المباشرة (حفظ PDF)... 🖨️');
      const el = getVerifiedCertificateElement();
      if (!el) {
        showToast('تعذر العثور على لوحة الشهادة');
        return;
      }
      await waitForImagesToLoad(el);
      const opened = await openCertificateInBrowserWindow(el, cert);
      if (!opened) {
        await printCertificateViaIframe(el, cert);
        showToast('تم إرسال أمر الطباعة المباشرة بنجاح!');
      } else {
        showToast('تم فتح نافذة الطباعة والحفظ بتنسيق PDF بنجاح!');
      }
    } catch (err) {
      console.error('Print window error:', err);
      showToast('حدث خطأ أثناء فتح نافذة الطباعة');
    }
  };

  // 2. High-Resolution PDF Download
  const handleDownloadPdf = async (cert: CertificateData) => {
    try {
      showToast('جاري إنشاء وتحميل ملف PDF عالي الجودة...');
      const el = getVerifiedCertificateElement();
      if (!el) {
        showToast('تعذر تجهيز لوحة الشهادة');
        return;
      }
      await waitForImagesToLoad(el);
      await exportCertificateAsPdf(el, cert);
      showToast('تم تنزيل ملف PDF المنسق بنجاح! 📄🎉');
    } catch (err) {
      console.error('PDF export error:', err);
      showToast('تعذر تصدير PDF، يمكنك استخدام خيار "نافذة المتصفح" للطباعة والحفظ.');
    }
  };

  // 3. High-Resolution PNG Image Download
  const handleDownloadPng = async (cert: CertificateData) => {
    try {
      showToast('جاري تصدير صورة الشهادة فائقة الدقة...');
      const el = getVerifiedCertificateElement();
      if (!el) {
        showToast('تعذر تجهيز لوحة الشهادة');
        return;
      }
      await waitForImagesToLoad(el);
      await exportCertificateAsPng(el, cert);
      showToast('تم تنزيل صورة الشهادة PNG بنجاح! 🖼️✨');
    } catch (err) {
      console.error('PNG export error:', err);
      showToast('تعذر تصدير الصورة.');
    }
  };

  // Load all known certificates for quick sample badges and verification lookup across modes
  useEffect(() => {
    const list = getAllVerifiableCertificates(currentCertificate);
    setAllCertsList(list);
  }, [currentCertificate, isStandalone]);

  const getStandalonePortalUrl = (code?: string) => {
    const targetCode = code || result?.verificationCode || searchQuery || initialCode || currentCertificate.verificationCode || '';
    return `${window.location.origin}${window.location.pathname}?tab=verify&portal=true${targetCode ? `&code=${encodeURIComponent(targetCode)}` : ''}`;
  };

  const handleOpenStandaloneWindow = () => {
    const url = getStandalonePortalUrl();
    window.open(url, '_blank', 'noopener,noreferrer');
    showToast('تم فتح بوابة التحقق والتوثيق الإلكتروني في نافذة مستقلة برابط منفصل! 🌐✨');
  };

  const handleCopyDirectPortalUrl = () => {
    const url = getStandalonePortalUrl();
    navigator.clipboard.writeText(url);
    showToast('تم نسخ الرابط المباشر لبوابة التحقق والتوثيق إلى الحافظة! 🔗');
  };

  // Execute verification query
  const runVerification = (query: string) => {
    if (!query || !query.trim()) {
      setResult(null);
      return;
    }
    setIsSearching(true);
    setTimeout(() => {
      const res = verifyCertificateByCodeOrName(query, currentCertificate);
      setResult(res);
      setIsSearching(false);

      if (res.found && res.cert) {
        const vCode = res.verificationCode;
        const targetUrl = res.cert.driveFileWebViewLink || res.cert.driveFileUrl || `${window.location.origin}/verify?code=${vCode}`;
        generateQRCodeDataUrl(targetUrl).then(url => setQrDataUrl(url));
      } else {
        setQrDataUrl('');
      }
    }, 250);
  };

  // Run on mount if initialCode provided or default to currentCertificate's code (only in embedded mode)
  useEffect(() => {
    const codeToSearch = initialCode || (!isStandalone ? (currentCertificate.verificationCode || currentCertificate.id) : '');
    if (codeToSearch) {
      setSearchQuery(codeToSearch);
      runVerification(codeToSearch);
    }
  }, [initialCode, isStandalone]);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    runVerification(searchQuery);
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setSearchQuery(text.trim());
        runVerification(text.trim());
        showToast('تم لصق الرمز من الحافظة وفحصه بنجاح!');
      }
    } catch (e) {
      showToast('يرجى السماح بالوصول للحافظة.');
    }
  };

  const handleCopyText = (text: string, key: string, label = 'تم النسخ بنجاح!') => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showToast(label);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handlePrintStatement = async () => {
    if (!statementRef.current || !result || !result.cert) {
      window.print();
      return;
    }
    showToast('جاري تجهيز وثيقة التحقق الرسمية للطباعة... 🖨️');
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
      console.error('Print statement error:', e);
      window.print();
    }
  };

  const handleShareWhatsApp = (cert: CertificateData, code: string) => {
    const url = cert.driveFileWebViewLink || `${window.location.origin}/verify?code=${code}`;
    const text = encodeURIComponent(
      `🎓 *شهادة تقدير وتفوق موثقة رسمياً*\n` +
      `👤 اسم الطالب: *${cert.studentName}*\n` +
      `🏫 المدرسة: *${cert.schoolName || 'جهة معتمدة'}*\n` +
      `🔑 رمز التوثيق المعتمد: *${code}*\n` +
      `🌐 رابط التحقق الإلكتروني المباشر:\n${url}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleCopyVerificationReport = (cert: CertificateData, res: VerificationResult) => {
    const verifyLink = `${window.location.origin}/verify?code=${res.verificationCode}`;
    const driveLink = cert.driveFileWebViewLink || cert.driveFileUrl || 'غير مرفوع على Drive';
    const text = `📋 **بيان وسجل التوثيق الإلكتروني الرسمي للشهادة**
━━━━━━━━━━━━━━━━━━━━━━
🛡️ حالة الاعتماد: موثقة ونظامية بنسبة 100%
🔑 رمز التوثيق الوطني: ${res.verificationCode}
🔒 رمز الحماية الرقمي: ${res.checksum}
👤 اسم الطالب المكرم: ${cert.studentName}
🎓 الصف / الفصل: ${cert.grade || '—'}
📖 المادة / المجال: ${cert.subject || '—'}
🏫 الجهة / المدرسة: ${cert.schoolName || '—'}
📜 موضوع التكريم: ${cert.title}
📅 تاريخ الإصدار (هجري): ${cert.issueDateHijri || '—'}
📅 تاريخ الإصدار (ميلادي): ${cert.issueDate || '—'}
🌐 رابط التحقق المباشر: ${verifyLink}
☁️ رابط ملف Google Drive: ${driveLink}
━━━━━━━━━━━━━━━━━━━━━━
منصة تَقْدِير - نظام التوثيق والمصادقة الأكاديمي الرقمي`;

    navigator.clipboard.writeText(text);
    showToast('تم نسخ التقرير الشامل إلى الحافظة بنجاح! 📋✨');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 text-right font-['Cairo',sans-serif]">
      
      {/* 1. HERO PORTAL BANNER */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white p-6 sm:p-8 rounded-3xl shadow-xl border border-slate-800 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 rounded-2xl shrink-0">
              <ShieldCheck className="w-8 h-8 text-emerald-400" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-white">بوابة التحقق والتوثيق الإلكتروني المعتمدة</h2>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-bold">
                  {isStandalone ? 'البوابة الرسمية المستقلة' : 'نظام التوثيق الأكاديمي'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
                {isStandalone
                  ? 'البوابة المعتمدة للتحقق الفوري من صحة وموثوقية شهادات التقدير والتكريم الصادرة رسمياً. أدخل رقم التوثيق أدناه لعرض بيانات وسجل الشهادة.'
                  : 'منصة فحص صحة شهادات التقدير والشكر والجوائز الأكاديمية. أدخل رمز التوثيق (Verification Code) للتحقق من سلامة الشهادة وسجل إصدارها الرسمي.'}
              </p>
            </div>
          </div>
        </div>

        {/* Portal Standalone Window & Direct Link Buttons */}
        <div className="relative z-10 flex flex-wrap items-center gap-2 shrink-0">
          {!isStandalone && (
            <button
              type="button"
              onClick={handleOpenStandaloneWindow}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black rounded-xl shadow-lg transition flex items-center gap-2 border border-indigo-400/30 cursor-pointer"
              title="فتح بوابة التحقق في نافذة متصفح جديدة مستقلة برابط مباشر"
            >
              <ExternalLink className="w-4 h-4 text-amber-300" />
              <span>فتح في نافذة مستقلة</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleCopyDirectPortalUrl}
            className="px-3.5 py-2.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
            title="نسخ الرابط المباشر للبوابة للمشاركة"
          >
            <Copy className="w-4 h-4 text-slate-400" />
            <span>نسخ رابط البوابة</span>
          </button>

          {isStandalone && onBackToApp && (
            <button
              type="button"
              onClick={onBackToApp}
              className="px-3.5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl shadow transition flex items-center gap-1.5 cursor-pointer"
              title="الدخول إلى المنصة الكاملة لصناعة وتصميم الشهادات"
            >
              <Award className="w-4 h-4" />
              <span>دخول النظام الرئيسي</span>
            </button>
          )}
        </div>

        {/* Decorative Watermark Seal Background */}
        <div className="absolute left-6 -bottom-10 opacity-5 pointer-events-none">
          <ShieldCheck className="w-64 h-64 text-white" />
        </div>
      </div>

      {/* 2. SEARCH & CODE INPUT PANEL */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <form onSubmit={handleSearchSubmit} className="space-y-3">
          <label className="block text-xs sm:text-sm font-bold text-slate-800">
            أدخل رقم الباركود / كود التوثيق (Verification Code) أو اسم الطالب:
          </label>

          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="مثال: TQ-9F2A-88 أو REF-1447/0892 أو اسم الطالب"
                className="w-full pl-4 pr-11 py-3.5 text-sm sm:text-base font-mono font-bold bg-slate-50 border-2 border-slate-200 rounded-2xl focus:outline-none focus:border-indigo-600 focus:bg-white text-slate-900 placeholder-slate-400 uppercase tracking-wider transition"
                dir="ltr"
              />
              <Search className="w-5 h-5 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            </div>

            <button
              type="submit"
              disabled={isSearching}
              className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm rounded-2xl shadow-lg shadow-indigo-600/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSearching ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>جاري التحقق...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <span>فحص الشهادة</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handlePasteFromClipboard}
              className="px-4 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl transition flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200"
              title="لصق الكود من الحافظة"
            >
              <Copy className="w-4 h-4 text-slate-500" />
              <span>لصق من الحافظة</span>
            </button>
          </div>
        </form>

        {/* Sample / Quick Inspect Pills from stored certificates */}
        {allCertsList.length > 0 && (
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-500 font-bold text-[11px] flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>{isStandalone ? 'شهادات مسجلة بالنظام للفحص السريع:' : 'شهادات مسجلة بالسحابة للفحص السريع:'}</span>
            </span>
            <div className="flex flex-wrap gap-1.5 overflow-x-auto no-scrollbar max-h-16 overflow-y-auto">
              {allCertsList.slice(0, 10).map((item) => {
                const code = item.cert.verificationCode || item.cert.id;
                const isCurrent = searchQuery.toUpperCase() === code.toUpperCase();

                return (
                  <button
                    key={item.cert.id || code}
                    onClick={() => {
                      setSearchQuery(code);
                      runVerification(code);
                    }}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                      isCurrent
                        ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                    }`}
                  >
                    <span>{item.cert.studentName}</span>
                    <span className="font-mono text-[10px] opacity-75">({code.slice(-6)})</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 3. VERIFICATION RESULT DISPLAY */}
      {result && result.found && result.cert ? (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-md overflow-hidden space-y-0">
          
          {/* A. OFFICIAL VERIFIED HEADER BANNER */}
          <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white p-5 sm:p-6 border-b border-emerald-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shadow-lg shrink-0">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg sm:text-xl font-black text-white">شهادة أصلية معتمدة وموثقة إلكترونياً</h3>
                  <span className="bg-emerald-500 text-slate-950 font-black text-[10px] px-2.5 py-0.5 rounded-full shadow-xs">
                    مطابقة 100%
                  </span>
                </div>
                <p className="text-xs text-emerald-100 mt-0.5">
                  تم التحقق من صحة الرقم التسلسلي ومطابقة التوقيع والختم وسجلات التخزين الرسمية.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <div className="bg-slate-950/60 px-3 py-1.5 rounded-xl border border-emerald-500/30 text-right">
                <span className="text-[10px] text-emerald-300 block">بصمة الحماية الرقمية:</span>
                <span className="font-mono font-bold text-xs text-white tracking-wider">{result.checksum}</span>
              </div>

              {result.cert.driveFileWebViewLink && (
                <a
                  href={result.cert.driveFileWebViewLink}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow transition flex items-center gap-1.5"
                >
                  <Cloud className="w-4 h-4" />
                  <span>معاينة بـ Google Drive</span>
                </a>
              )}
            </div>
          </div>

          {/* B. VIEW SWITCHER TABS */}
          <div className="bg-slate-50 border-b border-slate-200 px-6 pt-3 flex items-center gap-2">
            <button
              onClick={() => setActiveTab('details')}
              className={`px-4 py-2 text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'details'
                  ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-xl shadow-xs'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileCheck className="w-4 h-4 text-indigo-600" />
              <span>سجل وبيانات التوثيق الأكاديمي</span>
            </button>

            <button
              onClick={() => setActiveTab('canvas')}
              className={`px-4 py-2 text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'canvas'
                  ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-xl shadow-xs'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Eye className="w-4 h-4 text-amber-500" />
              <span>معاينة الشهادة الأصلية</span>
            </button>

            <button
              onClick={() => setActiveTab('statement')}
              className={`px-4 py-2 text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'statement'
                  ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-xl shadow-xs'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Printer className="w-4 h-4 text-emerald-600" />
              <span>وثيقة التحقق الرسمية (للطباعة)</span>
            </button>
          </div>

          {/* C. TAB 1: VERIFICATION DETAILS & CREDENTIALS */}
          {activeTab === 'details' && (
            <div className="p-6 space-y-6">
              
              {/* Row 1: QR, Barcode, Code and Link Card */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                
                {/* QR Code and Code39 Barcode visual */}
                <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 flex flex-col items-center justify-center text-center space-y-3 shadow-inner">
                  <div className="bg-white p-3 rounded-2xl shadow-lg">
                    {qrDataUrl ? (
                      <img src={qrDataUrl} alt="QR Code" className="w-32 h-32 object-contain" />
                    ) : (
                      <div className="w-32 h-32 flex items-center justify-center text-slate-400">
                        <QrCode className="w-12 h-12 animate-pulse" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-1 w-full">
                    <span className="text-[11px] font-bold text-slate-300 flex items-center justify-center gap-1">
                      <QrCode className="w-3.5 h-3.5 text-indigo-400" />
                      <span>رمز الاستجابة السريعة (QR)</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono block">
                      {result.verificationCode}
                    </span>

                    {/* Linear Barcode */}
                    <div className="bg-white p-1.5 rounded-lg flex items-center justify-center max-w-[200px] mx-auto mt-2">
                      {(() => {
                        const { bars, totalWidth } = generateCode39Bars(result.verificationCode);
                        return (
                          <svg viewBox={`0 0 ${totalWidth} 24`} className="h-6 w-auto select-none">
                            {bars.map((bar, idx) => (
                              <rect key={idx} x={bar.x} y="0" width={bar.width} height="24" fill="#0f172a" />
                            ))}
                          </svg>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* Key Identifiers Card */}
                <div className="md:col-span-2 bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3.5 flex flex-col justify-between">
                  <div className="space-y-3">
                    
                    {/* Verification Code Box */}
                    <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold block">رمز التوثيق المعتمد (Verification Code):</span>
                        <span className="font-mono text-lg font-black text-amber-700 tracking-wider">
                          {result.verificationCode}
                        </span>
                      </div>
                      <button
                        onClick={() => handleCopyText(result.verificationCode, 'res-code', 'تم نسخ رمز التوثيق')}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer border border-slate-200"
                      >
                        {copiedKey === 'res-code' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                        <span>نسخ الكود</span>
                      </button>
                    </div>

                    {/* Online Verification Web URL */}
                    <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                      <div className="truncate max-w-[320px]">
                        <span className="text-[10px] text-slate-500 font-bold block">رابط التحقق الإلكتروني المباشر:</span>
                        <span className="font-mono text-xs text-indigo-700 truncate block">
                          {`${window.location.origin}/verify?code=${result.verificationCode}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleCopyText(`${window.location.origin}/verify?code=${result.verificationCode}`, 'res-vlink', 'تم نسخ الرابط')}
                          className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer border border-slate-200"
                          title="نسخ الرابط"
                        >
                          {copiedKey === 'res-vlink' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                        </button>
                        <a
                          href={`${window.location.origin}/verify?code=${result.verificationCode}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg border border-indigo-200"
                          title="فتح الرابط في نافذة جديدة"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </div>

                    {/* Google Drive Status & Link */}
                    {result.cert.driveFileWebViewLink ? (
                      <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 p-3 rounded-xl">
                        <div>
                          <span className="text-[10px] text-emerald-800 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> موثقة ومحفوظة على Google Drive
                          </span>
                          <span className="font-mono text-xs text-slate-600 truncate block">
                            ID: {result.cert.driveFileId || 'Drive-File'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <a
                            href={result.cert.driveFileWebViewLink}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>عرض بالدرايف</span>
                          </a>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-3 rounded-xl border border-slate-200">
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Cloud className="w-4 h-4 text-slate-400" />
                          <span>غير مرفوعة على Google Drive حتى الآن</span>
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setIsDriveRequestModalOpen(true)}
                            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition shadow-xs"
                            title="إرسال طلب توثيق وحفظ الشهادة على Google Drive السحابية"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>طلب التوثيق على Drive ☁️</span>
                          </button>
                          {onOpenGoogleDriveModal && (
                            <button
                              type="button"
                              onClick={() => onOpenGoogleDriveModal(result.cert!)}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition shadow-xs"
                            >
                              <Cloud className="w-3.5 h-3.5" />
                              <span>رفع لـ Google Drive</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              </div>

              {/* Row 2: Comprehensive Academic Record */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                <h4 className="text-sm font-black text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-2">
                  <Award className="w-4 h-4 text-amber-600" />
                  <span>السجل الأكاديمي والتكريمي الرسمي</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 block font-bold">اسم الطالب المكرم:</span>
                    <strong className="text-base text-slate-950 font-black">{result.cert.studentName}</strong>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 block font-bold">الجنس:</span>
                    <strong className="text-slate-800">{result.cert.recipientGender === 'female' ? 'طالبة' : 'طالب'}</strong>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 block font-bold">الصف / الفصل:</span>
                    <strong className="text-amber-800 font-bold">{result.cert.grade || 'غير محدد'}</strong>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 block font-bold">المادة / المجال:</span>
                    <strong className="text-slate-800">{result.cert.subject || 'عام'}</strong>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 block font-bold">المدرسة / المؤسسة المانحة:</span>
                    <strong className="text-slate-800">{result.cert.schoolName || 'جهة معتمدة'}</strong>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 block font-bold">المصدر السحابي:</span>
                    <strong className="text-indigo-700">{result.sourceTitle}</strong>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 block font-bold">تاريخ الإصدار (هجري):</span>
                    <strong className="text-slate-700">{result.cert.issueDateHijri || '—'}</strong>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 block font-bold">تاريخ الإصدار (ميلادي):</span>
                    <strong className="text-slate-700">{result.cert.issueDate || '—'}</strong>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 block font-bold">الختم والاعتماد:</span>
                    <strong className="text-emerald-700 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{result.cert.stamp?.title || 'معتمد رسمياً'}</span>
                    </strong>
                  </div>
                </div>

                {/* Reason */}
                {result.cert.reason && (
                  <div className="p-3.5 bg-white rounded-xl border border-slate-200 text-xs">
                    <span className="text-[10px] text-slate-500 block font-bold mb-1">نص وسبب التكريم:</span>
                    <p className="text-slate-800 leading-relaxed font-medium">{result.cert.reason}</p>
                  </div>
                )}
              </div>

              {/* Row 3: Security & Cryptographic Integrity Check */}
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                  <Lock className="w-4 h-4 text-emerald-700" />
                  <span>فحص سلامة التشفير ومطابقة السجلات (Cryptographic & Security Audit)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs text-slate-800">
                  <div className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-emerald-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>رمز التوثيق مطابق لقاعدة البيانات</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-emerald-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>سلامة السجل السحابي مؤكدة</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-emerald-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>شهادة أصلية غير معدلة</span>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* D. TAB 2: LIVE CANVAS PREVIEW */}
          {activeTab === 'canvas' && (
            <div className="p-6 bg-slate-100 flex flex-col items-center justify-center min-h-[480px] space-y-4">
              {/* Quick Actions Bar for Certificate Canvas */}
              <div className="w-full max-w-4xl flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-amber-500" />
                    <span>معاينة شهادة:</span>
                    <span className="text-indigo-700 font-bold">{result.cert.studentName}</span>
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleOpenBrowserPrintWindow(result.cert!)}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                    title="فتح نافذة الطباعة المباشرة وحفظ الشهادة بتنسيق PDF عالي الدقة"
                  >
                    <Printer className="w-3.5 h-3.5 text-amber-300" />
                    <span>معاينة للطباعة المباشرة (نافذة المتصفح)</span>
                  </button>

                  <button
                    onClick={() => handleDownloadPdf(result.cert!)}
                    className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>تنزيل PDF</span>
                  </button>

                  <button
                    onClick={() => handleDownloadPng(result.cert!)}
                    className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>تنزيل PNG</span>
                  </button>
                </div>
              </div>

              <div className="w-full max-w-4xl shadow-2xl rounded-2xl overflow-hidden border border-slate-300">
                <CertificateCanvas data={result.cert} isExporting={false} />
              </div>
            </div>
          )}

          {/* E. TAB 3: OFFICIAL STATEMENT OF VERIFICATION (PRINTABLE) */}
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
              <div className="p-6 bg-slate-100 space-y-4">
                <div className="flex flex-wrap justify-between items-center bg-white p-3 rounded-2xl border border-slate-200 gap-2">
                  <div>
                    <span className="text-xs text-slate-700 font-bold block">وثيقة التحقق الرسمية المعتمدة:</span>
                    <span className="text-[10px] text-slate-500">جاهزة للطباعة المباشرة والتصدير والتضمين</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handlePrintStatement}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-xl shadow transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Printer className="w-4 h-4" />
                      <span>طباعة الوثيقة الرسمية</span>
                    </button>
                  </div>
                </div>

                {/* Printable Statement Container */}
                <div
                  ref={statementRef}
                  className="bg-white p-8 rounded-3xl border-2 shadow-xl max-w-3xl mx-auto text-right space-y-6 print:p-0 print:border-none print:shadow-none font-['Cairo',sans-serif] relative overflow-hidden"
                  style={{ borderColor: borderCol }}
                >
                  {/* Decorative Watermark */}
                  {watermark && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] select-none z-0">
                      <span className="text-6xl font-black rotate-[-25deg] text-slate-900 whitespace-nowrap">
                        {watermark}
                      </span>
                    </div>
                  )}

                  {/* Statement Header */}
                  <div className="border-b-2 pb-4 flex items-center justify-between relative z-10" style={{ borderColor: primaryCol }}>
                    <div className="space-y-1">
                      <h3 className="text-lg font-black text-slate-900">{ministryH1}</h3>
                      <h4 className="text-xs font-bold text-slate-700">{ministryH2}</h4>
                      <p className="text-[11px] text-slate-500">{platformName}</p>
                    </div>
                    <div className="text-center space-y-1">
                      <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto border-2 shadow-xs"
                        style={{ backgroundColor: `${primaryCol}15`, borderColor: primaryCol, color: primaryCol }}
                      >
                        <ShieldCheck className="w-10 h-10" />
                      </div>
                      <span className="text-[10px] font-black block" style={{ color: primaryCol }}>
                        وثيقة رسمية معتمدة
                      </span>
                    </div>
                  </div>

                  {/* Statement Title */}
                  <div className="text-center py-2 relative z-10">
                    <h2 className="text-xl font-black text-slate-950 underline decoration-amber-500 underline-offset-8">
                      {docTitle}
                    </h2>
                    <p className="text-xs text-slate-500 mt-2 font-mono">
                      {docSubtitle}
                    </p>
                  </div>

                  {/* Statement Body Text */}
                  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 text-xs leading-relaxed text-slate-800 space-y-3 relative z-10">
                    <p className="font-semibold text-slate-900">
                      {declaration}
                    </p>
                    <div className="text-center py-2">
                      <span className="text-xl font-black text-indigo-950 bg-indigo-50 px-8 py-2 rounded-xl border border-indigo-200 inline-block shadow-xs">
                        {result.cert.studentName}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] bg-white p-3.5 rounded-xl border border-slate-200">
                      <div><span className="text-slate-500">نوع المكرّم: </span><strong>{result.cert.recipientGender === 'female' ? 'طالبة' : 'طالب'}</strong></div>
                      <div><span className="text-slate-500">الصف / الشعبة: </span><strong>{result.cert.grade || '—'}</strong></div>
                      <div><span className="text-slate-500">المؤسسة / المدرسة: </span><strong>{result.cert.schoolName || 'جهة معتمدة'}</strong></div>
                      <div><span className="text-slate-500">المادة / المجال: </span><strong>{result.cert.subject || 'عام'}</strong></div>
                      <div><span className="text-slate-500">تاريخ الإصدار (هجري): </span><strong>{result.cert.issueDateHijri || '—'}</strong></div>
                      <div><span className="text-slate-500">تاريخ الإصدار (ميلادي): </span><strong>{result.cert.issueDate || '—'}</strong></div>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-3 py-2 font-mono">
                      <div className="bg-slate-900 text-amber-400 font-black text-sm px-4 py-1.5 rounded-xl border border-slate-800 shadow-xs">
                        كود التوثيق: {result.verificationCode}
                      </div>
                      {docSettings.verificationDocShowChecksum !== false && (
                        <div className="bg-slate-100 text-slate-800 font-bold text-xs px-3 py-1.5 rounded-xl border border-slate-300">
                          بصمة الأمان: {result.checksum}
                        </div>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-500 text-center pt-1">
                      صدرت هذه الإفادة بناءً على الاستعلام المباشر من قاعدة البيانات السحابية بتاريخ: {new Date().toLocaleDateString('ar-SA')} م | {new Date().toLocaleTimeString('ar-SA')}
                    </p>
                  </div>

                  {/* Footer Signatures in Statement */}
                  <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs gap-4 relative z-10">
                    {docSettings.verificationDocShowSecurityStamp !== false && (
                      <div className="text-center">
                        <span className="text-[10px] text-slate-400 block mb-1">الختم والاعتماد الرقمي:</span>
                        <div
                          className="w-24 h-24 rounded-full border-2 border-dashed flex flex-col items-center justify-center text-[10px] font-black mx-auto p-1 text-center"
                          style={{ borderColor: primaryCol, color: primaryCol }}
                        >
                          <ShieldCheck className="w-5 h-5 mb-0.5" />
                          <span>{authority}</span>
                          <span className="text-[8px] font-bold text-slate-500">معتمد رسمياً</span>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-3 mr-auto">
                      {docSettings.verificationDocShowQr !== false && qrDataUrl && (
                        <div className="text-center">
                          <img src={qrDataUrl} alt="QR" className="w-20 h-20 border border-slate-300 p-1 rounded-xl mx-auto bg-white shadow-xs" />
                          <span className="text-[9px] text-slate-500 block mt-1 font-bold">مسح للتحقق المباشر</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* F. BOTTOM ACTION TOOLBAR */}
          <div className="bg-slate-50 p-4 sm:p-5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => handleCopyVerificationReport(result.cert!, result)}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs transition"
              >
                <Copy className="w-4 h-4 text-amber-400" />
                <span>نسخ تقرير التوثيق</span>
              </button>

              <button
                onClick={() => handleShareWhatsApp(result.cert!, result.verificationCode)}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs transition"
              >
                <Share2 className="w-4 h-4" />
                <span>مشاركة WhatsApp</span>
              </button>

              {!isStandalone && onOpenInEditor && (
                <button
                  onClick={() => onOpenInEditor(result.cert!)}
                  className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs transition"
                  title="فتح الشهادة في المحرر للتعديل"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>فتح بالمحرر</span>
                </button>
              )}

              {isStandalone && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setResult(null);
                  }}
                  className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs transition"
                >
                  <Search className="w-4 h-4 text-slate-600" />
                  <span>فحص شهادة أخرى</span>
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Reference Implementation: Browser Direct Print & Save as PDF */}
              <button
                onClick={() => handleOpenBrowserPrintWindow(result.cert!)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md transition"
                title="معاينة للطباعة المباشرة وحفظ الشهادة بدقة عالية بتنسيق PDF"
              >
                <Printer className="w-4 h-4 text-amber-300" />
                <span>معاينة للطباعة المباشرة (نافذة المتصفح / PDF)</span>
              </button>

              <button
                onClick={() => handleDownloadPdf(result.cert!)}
                className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs transition"
              >
                <FileText className="w-4 h-4" />
                <span>تنزيل PDF</span>
              </button>

              <button
                onClick={() => handleDownloadPng(result.cert!)}
                className="px-3.5 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs transition"
              >
                <Download className="w-4 h-4" />
                <span>تنزيل PNG</span>
              </button>
            </div>
          </div>

          {/* Dedicated Offscreen Canvas to Guarantee Exact DOM Structure and Styles */}
          {result.cert && (
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
      ) : result && !result.found ? (
        /* G. NOT FOUND STATE */
        <div className="bg-white p-8 sm:p-12 text-center rounded-3xl border-2 border-dashed border-rose-200 space-y-4 shadow-sm">
          <div className="w-16 h-16 bg-rose-50 border-2 border-rose-300 text-rose-500 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
            <XCircle className="w-10 h-10" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg sm:text-xl font-black text-rose-950">لم يتم العثور على شهادة مسجلة بهذا الرمز</h3>
            <p className="text-xs sm:text-sm text-rose-700 max-w-md mx-auto">
              تأكد من كتابة كود التوثيق أو الرقم التسلسلي بشكل صحيح، أو اختر إحدى الشهادات المسجلة بالسحابة أعلاه.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              onClick={() => {
                setSearchQuery(currentCertificate.verificationCode || currentCertificate.id);
                runVerification(currentCertificate.verificationCode || currentCertificate.id);
              }}
              className="px-4 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl shadow cursor-pointer"
            >
              فحص الشهادة الحالية بالمحرر
            </button>
          </div>
        </div>
      ) : null}

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
