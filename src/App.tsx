import React, { useState, useRef, useEffect, useMemo } from 'react';
import { CertificateData } from './types';
import { TEMPLATE_PRESETS } from './data/templates';
import { applyDefaultsToCertificate, getSavedDefaultSettings, getFormattedTodayDate } from './utils/defaultSettings';
import { generateVerificationCode } from './utils/qrUtils';
import { Navbar } from './components/Navbar';
import { CertificateCanvas } from './components/CertificateCanvas';
import { EditorToolbar } from './components/EditorToolbar';
import { AIGeneratorModal } from './components/AIGeneratorModal';
import { BatchCertificateGenerator } from './components/BatchCertificateGenerator';
import { DashboardAnalytics } from './components/DashboardAnalytics';
import { CloudLibrary } from './components/CloudLibrary';
import { AIAssistantChat } from './components/AIAssistantChat';
import { AppSettingsModal } from './components/AppSettingsModal';
import { VerificationModal } from './components/VerificationModal';
import { VerificationPortal } from './components/VerificationPortal';
import { GoogleDriveSaveModal } from './components/GoogleDriveSaveModal';
import { PrintPreviewModal } from './components/PrintPreviewModal';
import { DirectShareModal } from './components/DirectShareModal';
import { DraftsManagerModal } from './components/DraftsManagerModal';
import { HistoryManagerModal } from './components/HistoryManagerModal';
import { ExportPreviewModal } from './components/ExportPreviewModal';
import { ArabicProofreaderModal } from './components/ArabicProofreaderModal';
import { AppreciationSuggestionsModal } from './components/AppreciationSuggestionsModal';
import { ExportFormat } from './types';
import {
  sanitizeOklchInDoc,
  waitForImagesToLoad,
  findCertificateCanvasElement,
  exportCertificateAsPdf,
  exportCertificateAsPng
} from './utils/exportUtils';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import {
  Download,
  Printer,
  Sparkles,
  Share2,
  Mail,
  X,
  CheckCircle,
  HelpCircle,
  Undo2,
  Redo2,
  Cloud,
  ShieldCheck,
  Award
} from 'lucide-react';

const RAW_INITIAL_CERTIFICATE_DATA: CertificateData = {
  id: `cert-${Date.now()}`,
  recipientGender: 'male',
  ...TEMPLATE_PRESETS[0].defaultData,
  studentName: 'عبد الله بن محمد العتيبي',
  grade: 'الصف الأول الثانوي - أ',
  schoolName: 'مدرسة التميز النموذجية',
  headerLine1: 'المملكة العربية السعودية',
  showHeaderLine1: true,
  headerLine2: 'وزارة التعليم / الجهة المعتمدة',
  showHeaderLine2: true,
  headerLine3: 'إدارة التعليم بمحافظة الرياض',
  showHeaderLine3: false,
  headerRightExtra: 'مكتب التعليم الخاص',
  showHeaderRightExtra: false,
  showHeaderSchoolName: true,
  headerVisionText: 'رؤية 2030',
  showHeaderVisionText: false,
  showHeaderDate: true,
  showHeaderPlace: true,
  dateLabel: 'التاريخ',
  placeLabel: 'المكان',
  certNumber: 'REF-1447/0892',
  certNumberLabel: 'الرقم',
  showHeaderCertNumber: false,
  headerLeftExtra1: 'نوع الشهادة: معتمدة',
  showHeaderLeftExtra1: false,
  headerLeftExtra2: 'الكود: AC-2026',
  showHeaderLeftExtra2: false,
  showVerificationBadge: true,
  verificationBadgeText: 'شهادة موثقة رقمياً',
  subject: 'التفوق العلمي العام والابتكار',
  title: 'شهادة تقدير وتفوق راقٍ',
  subtitle: 'وسام التميز الأكاديمي للعام الدراسي 1447 هـ',
  appreciationText: 'تقديراً لجهوده العلمية المتميزة وحصوله على الدرجات العالية بروح من الانضباط، واجتهاده في دعم زملائه والتحلي بمكارم الأخلاق.',
  poemOrQuote: '«مَن خَطا نَحوَ العُلا خُطوَةً... جَنى مِنَ الثِمارِ أحلى النِعَم»',
  showPoemOrQuote: true,
  issueDate: getFormattedTodayDate(),
  issuePlace: 'الرياض، المملكة العربية السعودية',
  badgeTitle: 'وسام التميز الأول',
  badgeIcon: 'trophy',
  showBadge: true,
  frameStyle: 'double-gold',
  primaryColor: '#854d0e',
  secondaryColor: '#d97706',
  accentColor: '#fef08a',
  backgroundColor: '#fefce8',
  textColor: '#1e293b',
  fontFamily: 'Amiri',
  fontSizeScale: 1.0,
  headerFontFamily: 'Cairo',
  headerFontSizeScale: 1.0,
  aspectRatio: 'A4-landscape',
  showQrCode: true,
  verificationCode: generateVerificationCode(),
  qrCodeData: '',
  watermarkType: 'text',
  watermarkText: 'مدرسة التميز النموذجية',
  watermarkImageUrl: '',
  watermarkRotation: -12,
  watermarkOpacity: 0.05,
  watermarkPattern: 'center',
  watermarkSize: 100,
  isSavedCloud: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  stamp: {
    id: 'stamp-1',
    title: 'الختم الرسمي',
    subtext: 'معتمد رسمياً',
    color: '#b45309',
    shape: 'wax',
    show: true
  },
  signatures: [
    { id: '1', name: 'أ. عبد الرحمن السعيد', title: 'معلم المادة', type: 'type', signatureText: 'عبد الرحمن السعيد', show: true },
    { id: '2', name: 'د. خالد العصيمي', title: 'مدير المدرسة', type: 'type', signatureText: 'د. خالد العصيمي', show: true }
  ],
  emojis: []
} as CertificateData;

const INITIAL_CERTIFICATE_DATA: CertificateData = applyDefaultsToCertificate(RAW_INITIAL_CERTIFICATE_DATA);

const getAutosavedInitialData = (): CertificateData => {
  try {
    const saved = localStorage.getItem('taqdeer_autosave_certificate');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object' && parsed.title && parsed.studentName) {
        return applyDefaultsToCertificate(parsed);
      }
    }
  } catch (e) {
    console.error('Error reading autosaved draft:', e);
  }
  return INITIAL_CERTIFICATE_DATA;
};

const getInitialUrlState = () => {
  if (typeof window === 'undefined') {
    return { isStandalone: false, code: '', tab: 'editor' as const };
  }
  try {
    const params = new URLSearchParams(window.location.search);
    const code =
      params.get('code') ||
      params.get('verify') ||
      params.get('id') ||
      params.get('cert') ||
      params.get('ref') ||
      params.get('serial') ||
      params.get('v');
    const tab = params.get('tab');
    const isPortal =
      params.get('portal') === 'true' ||
      params.get('standalone') === 'true' ||
      window.location.pathname.startsWith('/verify') ||
      window.location.pathname.startsWith('/cert');

    // Also check path parts like /verify/TAQDEER-2026-X89F2A or /cert/TAQDEER-2026-X89F2A
    let pathCode = '';
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    if (pathParts.length >= 2 && ['verify', 'cert', 'd', 'certificate'].includes(pathParts[0].toLowerCase())) {
      pathCode = pathParts[1];
    }

    const finalCode = (code || pathCode || '').trim();

    if (isPortal || window.location.pathname.startsWith('/verify')) {
      return { isStandalone: true, code: finalCode, tab: 'verify' as const };
    }
    if (tab === 'verify' || finalCode) {
      return { isStandalone: false, code: finalCode, tab: 'verify' as const };
    }
    if (tab && ['editor', 'batch', 'dashboard', 'cloud', 'verify', 'ai', 'settings'].includes(tab)) {
      return { isStandalone: false, code: finalCode, tab: tab as any };
    }
  } catch (e) {
    console.error('Error parsing initial URL state:', e);
  }
  return { isStandalone: false, code: '', tab: 'editor' as const };
};

export default function App() {
  const initialUrlState = useMemo(() => getInitialUrlState(), []);
  const [activeTab, setActiveTab] = useState<'editor' | 'batch' | 'dashboard' | 'cloud' | 'verify' | 'ai' | 'settings'>(initialUrlState.tab);
  const [urlVerifyCode, setUrlVerifyCode] = useState<string>(initialUrlState.code);
  const [isStandalonePortal, setIsStandalonePortal] = useState<boolean>(initialUrlState.isStandalone);
  
  // History State for Undo / Redo - initialized with LocalStorage autosaved draft if present
  const [history, setHistory] = useState<CertificateData[]>(() => [getAutosavedInitialData()]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const [lastAutosavedTime, setLastAutosavedTime] = useState<string | null>(null);

  // Check URL query parameters for direct verification link or standalone portal mode
  useEffect(() => {
    try {
      const state = getInitialUrlState();
      if (state.isStandalone) {
        setIsStandalonePortal(true);
        setActiveTab('verify');
        if (state.code) {
          setUrlVerifyCode(state.code);
        }
      } else if (state.tab === 'verify' || state.code) {
        if (state.code) {
          setUrlVerifyCode(state.code);
        }
        setActiveTab('verify');
      }
    } catch (e) {
      console.error('URL params check error:', e);
    }
  }, []);

  const certificateData = history[historyIndex] || INITIAL_CERTIFICATE_DATA;

  // Auto-save effect to LocalStorage
  useEffect(() => {
    if (certificateData) {
      try {
        localStorage.setItem('taqdeer_autosave_certificate', JSON.stringify(certificateData));
        const now = new Date();
        const timeStr = now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
        setLastAutosavedTime(timeStr);
      } catch (e) {
        console.error('Auto-save to localStorage failed:', e);
      }
    }
  }, [certificateData]);

  const updateCertificateData = (
    newData: Partial<CertificateData> | CertificateData | ((prev: CertificateData) => CertificateData)
  ) => {
    setHistory((prevHistory) => {
      const current = prevHistory[historyIndex] || INITIAL_CERTIFICATE_DATA;
      let nextData: CertificateData;

      if (typeof newData === 'function') {
        nextData = newData(current);
      } else if ('id' in newData && 'title' in newData) {
        nextData = newData as CertificateData;
      } else {
        nextData = { ...current, ...newData, updatedAt: new Date().toISOString() };
      }

      if (JSON.stringify(current) === JSON.stringify(nextData)) {
        return prevHistory;
      }

      const slicedHistory = prevHistory.slice(0, historyIndex + 1);
      if (slicedHistory.length >= 40) {
        slicedHistory.shift();
      }
      const updatedHistory = [...slicedHistory, nextData];
      setHistoryIndex(updatedHistory.length - 1);
      return updatedHistory;
    });
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex((prev) => prev - 1);
      showToast('تم التراجع عن الخطوة السابقة ↩️');
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex((prev) => prev + 1);
      showToast('تمت إعادة الخطوة ↪️');
    }
  };

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  // Keyboard shortcut listener for Ctrl+Z / Ctrl+Y
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          if (historyIndex < history.length - 1) {
            e.preventDefault();
            handleRedo();
          }
        } else {
          if (historyIndex > 0) {
            e.preventDefault();
            handleUndo();
          }
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
        if (historyIndex < history.length - 1) {
          e.preventDefault();
          handleRedo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, history.length]);

  const [aiModalConfig, setAiModalConfig] = useState<{
    isOpen: boolean;
    tab?: 'improve' | 'full' | 'settings';
    targetField?: 'appreciation' | 'title' | 'intro' | 'poem';
  }>({
    isOpen: false,
    tab: 'improve',
    targetField: 'appreciation',
  });

  const handleOpenAiModal = (
    tab: 'improve' | 'full' | 'settings' = 'improve',
    field: 'appreciation' | 'title' | 'intro' | 'poem' = 'appreciation'
  ) => {
    setAiModalConfig({
      isOpen: true,
      tab,
      targetField: field,
    });
  };

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareInitialMode, setShareInitialMode] = useState<'whatsapp' | 'email'>('whatsapp');
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isDraftsModalOpen, setIsDraftsModalOpen] = useState(false);
  const [isHistoryManagerOpen, setIsHistoryManagerOpen] = useState(false);
  const [isExportPreviewModalOpen, setIsExportPreviewModalOpen] = useState(false);
  const [isProofreaderModalOpen, setIsProofreaderModalOpen] = useState(false);
  const [isAppreciationModalOpen, setIsAppreciationModalOpen] = useState(false);
  const [exportPreviewFormat, setExportPreviewFormat] = useState<ExportFormat>('pdf');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);

  // Automatically switch to editor tab when opening modals that capture/export certificate canvas
  useEffect(() => {
    if (isDriveModalOpen || isShareModalOpen || isPrintModalOpen || isExportPreviewModalOpen) {
      if (activeTab !== 'editor') {
        setActiveTab('editor');
      }
    }
  }, [isDriveModalOpen, isShareModalOpen, isPrintModalOpen, isExportPreviewModalOpen, activeTab]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Open Export Preview & Configuration Modal or Direct Export
  const handleOpenExportPreview = (format: ExportFormat = 'pdf') => {
    const defaults = getSavedDefaultSettings();
    if (defaults.showExportPreviewModal !== false) {
      setExportPreviewFormat(format);
      setIsExportPreviewModalOpen(true);
      return;
    }

    if (format === 'pdf') {
      handleDirectExportPDF();
    } else {
      handleDirectExportImage();
    }
  };

  // Export Certificate to PDF (Direct fallback)
  const handleDirectExportPDF = async () => {
    setIsExporting(true);
    showToast('جاري تحضير ملف PDF عالي الدقة بحسابات النسبة المتطابقة...');

    try {
      await new Promise((resolve) => setTimeout(resolve, 250));
      const element = await findCertificateCanvasElement(canvasRef, 15, 100);
      await exportCertificateAsPdf(element, certificateData);
      showToast('تم تحميل شهادة PDF بنجاح مع تطابق كامل للأبعاد! ✨');
    } catch (err) {
      console.error('PDF Export Error:', err);
      showToast('تعذر إنشاء ملف PDF تلقائياً، جاري فتح الطباعة المباشرة...');
      window.print();
    } finally {
      setIsExporting(false);
    }
  };

  // Export Certificate to PNG Image (Direct fallback)
  const handleDirectExportImage = async () => {
    setIsExporting(true);
    showToast('جاري توليد صورة PNG فائقة الجودة بتطابق تام...');

    try {
      await new Promise((resolve) => setTimeout(resolve, 250));
      const element = await findCertificateCanvasElement(canvasRef, 15, 100);
      await exportCertificateAsPng(element, certificateData);
      showToast('تمت حفظ صورة الشهادة بنجاح بدقة متطابقة! 🖼️');
    } catch (err) {
      console.error('Image Export Error:', err);
      showToast('حدث خطأ أثناء حفظ صورة الشهادة');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = () => handleOpenExportPreview('pdf');
  const handleExportImage = () => handleOpenExportPreview('png');

  const handleApplyAiContent = (data: Partial<CertificateData>) => {
    updateCertificateData(data);
    showToast('تم تطبيق العبارات المولدة بالذكاء الاصطناعي! 🚀');
  };

  const handleOpenWhatsAppShare = () => {
    setShareInitialMode('whatsapp');
    setIsShareModalOpen(true);
  };

  const handleOpenEmailShare = () => {
    setShareInitialMode('email');
    setIsShareModalOpen(true);
  };

  const handlePrint = () => {
    setIsPrintModalOpen(true);
  };

  const handleUpdateCloudCertificate = () => {
    try {
      const local = localStorage.getItem('taqdeer_saved_certs');
      let saved: CertificateData[] = [];
      if (local) {
        try {
          saved = JSON.parse(local);
        } catch (e) {
          console.error(e);
        }
      }

      const updatedCert: CertificateData = {
        ...certificateData,
        isSavedCloud: true,
        updatedAt: new Date().toISOString()
      };

      const index = saved.findIndex(c => c.id === updatedCert.id || (c.verificationCode && c.verificationCode === updatedCert.verificationCode));
      let updatedList: CertificateData[];
      if (index >= 0) {
        updatedList = [...saved];
        updatedList[index] = updatedCert;
      } else {
        updatedList = [updatedCert, ...saved];
      }

      localStorage.setItem('taqdeer_saved_certs', JSON.stringify(updatedList));
      updateCertificateData(updatedCert);
      showToast('تم حفظ التعديلات على الشهادة بالسحابة بنجاح! ☁️✅');
    } catch (err) {
      console.error('Update Cloud Error:', err);
      showToast('حدث خطأ أثناء تحديث الشهادة بالسحابة.');
    }
  };

  const handleSaveNewToCloud = () => {
    try {
      const local = localStorage.getItem('taqdeer_saved_certs');
      let saved: CertificateData[] = [];
      if (local) {
        try {
          saved = JSON.parse(local);
        } catch (e) {
          console.error(e);
        }
      }
      const newId = `cloud-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const newVerificationCode = generateVerificationCode();

      const certToSave: CertificateData = {
        ...certificateData,
        id: newId,
        verificationCode: newVerificationCode,
        isSavedCloud: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        driveFileId: undefined,
        driveFileWebViewLink: undefined,
        driveFileUrl: undefined,
        driveUploadedAt: undefined,
        qrCodeData: `${window.location.origin}/verify?code=${newVerificationCode}`
      };

      const updatedList = [certToSave, ...saved];
      localStorage.setItem('taqdeer_saved_certs', JSON.stringify(updatedList));
      updateCertificateData(certToSave);
      showToast('تم حفظ الشهادة كنسخة جديدة في المكتبة السحابية بنجاح! ☁️✨');
    } catch (err) {
      console.error('Cloud Save Error:', err);
      showToast('حدث خطأ أثناء الحفظ بالسحابة.');
    }
  };

  if (isStandalonePortal) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 font-['Cairo',sans-serif] flex flex-col">
        {/* Toast Notification Bar */}
        {toastMessage && (
          <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-amber-300 border border-amber-500/40 px-4 py-2.5 rounded-xl shadow-2xl font-bold text-xs flex items-center gap-2 animate-bounce">
            <Sparkles className="w-4 h-4 text-amber-400" />
            {toastMessage}
          </div>
        )}

        {/* Dedicated Standalone Public Header */}
        <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40 px-4 sm:px-8 py-3.5 flex items-center justify-between text-right">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-lg shrink-0">
              <ShieldCheck className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-white">بوابة التحقق والتوثيق الإلكتروني المعتمدة</h1>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                  منظومة تَقْدِير
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                المنصة الرقمية للتحقق الفوري من صحة ومطابقة الشهادات والوثائق الأكاديمية
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const url = `${window.location.origin}${window.location.pathname}?tab=verify&portal=true${urlVerifyCode ? `&code=${encodeURIComponent(urlVerifyCode)}` : ''}`;
                navigator.clipboard.writeText(url);
                showToast('تم نسخ الرابط المباشر لبوابة التحقق 🔗');
              }}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">نسخ الرابط</span>
            </button>

            <button
              onClick={() => {
                setIsStandalonePortal(false);
                setActiveTab('editor');
                window.history.replaceState({}, '', window.location.pathname);
              }}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow transition flex items-center gap-1.5 cursor-pointer"
            >
              <Award className="w-4 h-4" />
              <span>دخول النظام الرئيسي</span>
            </button>
          </div>
        </header>

        {/* Main Standalone Body */}
        <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <VerificationPortal
            currentCertificate={certificateData}
            initialCode={urlVerifyCode}
            isStandalone={true}
            onBackToApp={() => {
              setIsStandalonePortal(false);
              setActiveTab('editor');
              window.history.replaceState({}, '', window.location.pathname);
            }}
            onShowToast={showToast}
          />
        </main>

        {/* Dedicated Standalone Footer */}
        <footer className="bg-slate-900 border-t border-slate-800 py-6 text-center text-xs text-slate-400">
          <p>© {new Date().getFullYear()} منصة تَقْدِير - نظام التوثيق والمصادقة الأكاديمي الرقمي المعتمد. جميع الحقوق محفوظة.</p>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 font-['Cairo',sans-serif] flex flex-col pb-12">
      
      {/* Toast Notification Bar */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-amber-300 border border-amber-500/40 px-4 py-2.5 rounded-xl shadow-2xl font-bold text-xs flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4 text-amber-400" />
          {toastMessage}
        </div>
      )}

      {/* Main App Navigation Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onExportPDF={handleExportPDF}
        onQuickGenerateAI={() => handleOpenAiModal('improve', 'appreciation')}
        onPrint={handlePrint}
        onOpenVerificationModal={() => setIsVerificationModalOpen(true)}
        onOpenGoogleDriveModal={() => setIsDriveModalOpen(true)}
        onOpenDraftsModal={() => setIsDraftsModalOpen(true)}
        onOpenHistoryModal={() => setIsHistoryManagerOpen(true)}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
        certificateData={certificateData}
        onUpdateCloudCertificate={handleUpdateCloudCertificate}
        onSaveNewToCloud={handleSaveNewToCloud}
        lastAutosavedTime={lastAutosavedTime}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-[1550px] w-full mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-6">
        
        {/* TAB 1: MAIN CERTIFICATE EDITOR */}
        {activeTab === 'editor' && (
          <div className="space-y-6">
            
            {/* Quick Action Top Bar */}
            <div className="bg-white p-3 sm:p-3.5 rounded-2xl shadow-xs border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-right overflow-hidden">
              <div className="flex items-center justify-between sm:justify-start gap-2 w-full sm:w-auto">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
                  <span className="text-xs font-bold text-slate-800 truncate">
                    معاينة: <span className="text-amber-700 font-extrabold">{certificateData.studentName}</span>
                  </span>
                </div>

                {/* Undo / Redo Buttons */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
                  <button
                    onClick={handleUndo}
                    disabled={!canUndo}
                    className={`px-2 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                      canUndo
                        ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-2xs cursor-pointer'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                    title="تراجع خطوة للخلف (Ctrl+Z)"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                    <span className="hidden xs:inline">تراجع</span>
                  </button>

                  <button
                    onClick={handleRedo}
                    disabled={!canRedo}
                    className={`px-2 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                      canRedo
                        ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-2xs cursor-pointer'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                    title="إعادة خطوة للأمام (Ctrl+Y)"
                  >
                    <Redo2 className="w-3.5 h-3.5" />
                    <span className="hidden xs:inline">إعادة</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto shrink-0 py-0.5">
                <button
                  onClick={() => handleOpenAiModal('improve', 'appreciation')}
                  className="px-2.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-extrabold text-xs rounded-xl shadow-2xs hover:brightness-105 transition flex items-center justify-center gap-1 text-center truncate cursor-pointer"
                  title="صياغة العبارات بالذكاء الاصطناعي"
                >
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">صياغة AI</span>
                </button>

                <button
                  onClick={handlePrint}
                  className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-2xs transition flex items-center justify-center gap-1 text-center truncate cursor-pointer"
                  title="معاينة للطباعة المباشرة"
                >
                  <Printer className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">طباعة</span>
                </button>

                {certificateData.isSavedCloud ? (
                  <>
                    <button
                      onClick={handleUpdateCloudCertificate}
                      className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-1 text-center truncate cursor-pointer animate-pulse"
                      title="حفظ التعديلات على الشهادة الحالية بالسحابة"
                    >
                      <Cloud className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">حفظ التعديلات</span>
                    </button>

                    <button
                      onClick={handleSaveNewToCloud}
                      className="px-2.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl shadow-2xs transition flex items-center justify-center gap-1 text-center truncate cursor-pointer"
                      title="حفظ كشهادة جديدة منفصلة بالسحابة"
                    >
                      <Cloud className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">نسخة جديدة</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleSaveNewToCloud}
                    className="px-2.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl shadow-2xs transition flex items-center justify-center gap-1 text-center truncate cursor-pointer"
                    title="حفظ الشهادة بالسحابة للعودة إليها وتعديلها لاحقاً"
                  >
                    <Cloud className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">حفظ بالسحابة</span>
                  </button>
                )}

                <button
                  onClick={handleExportPDF}
                  className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-2xs transition flex items-center justify-center gap-1 text-center truncate cursor-pointer"
                  title="تصدير الشهادة صيغة PDF"
                >
                  <Download className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">تصدير PDF</span>
                </button>

                <button
                  onClick={handleOpenWhatsAppShare}
                  className="p-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-xl transition flex items-center justify-center shrink-0 cursor-pointer"
                  title="مشاركة عبر WhatsApp"
                >
                  <Share2 className="w-4 h-4 text-emerald-700" />
                </button>

                <button
                  onClick={handleOpenEmailShare}
                  className="p-1.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-800 rounded-xl transition flex items-center justify-center shrink-0 cursor-pointer"
                  title="مشاركة عبر البريد الإلكتروني"
                >
                  <Mail className="w-4 h-4 text-indigo-700" />
                </button>
              </div>
            </div>

            {/* Split Screen Layout: Canvas Left/Top, Toolbar Right/Bottom */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start relative">
              
              {/* Certificate Canvas Area (7 Cols) - Sticky on Desktop View */}
              <div className="lg:col-span-7 xl:col-span-7 2xl:col-span-7 lg:sticky lg:top-20 z-10 bg-slate-200/60 p-3 sm:p-4 rounded-2xl border border-slate-300 shadow-inner flex flex-col items-center justify-center min-h-[480px] w-full overflow-hidden transition-all">
                <CertificateCanvas
                  data={certificateData}
                  canvasRef={canvasRef}
                  isExporting={isExporting}
                  onUpdateData={updateCertificateData}
                  onOpenVerificationModal={() => setIsVerificationModalOpen(true)}
                  canUndo={canUndo}
                  canRedo={canRedo}
                  onUndo={handleUndo}
                  onRedo={handleRedo}
                />
              </div>

              {/* Certificate Controls Toolbar (5 Cols) */}
              <div className="lg:col-span-5 xl:col-span-5 2xl:col-span-5">
                <EditorToolbar
                  certificateData={certificateData}
                  onChange={updateCertificateData}
                  onOpenAiModal={handleOpenAiModal}
                  onOpenProofreaderModal={() => setIsProofreaderModalOpen(true)}
                  onOpenAppreciationSuggestionsModal={() => setIsAppreciationModalOpen(true)}
                  onExportPDF={handleExportPDF}
                  onExportImage={handleExportImage}
                  onShareEmail={handleOpenEmailShare}
                  onShareWhatsApp={handleOpenWhatsAppShare}
                  onPrint={handlePrint}
                  onSaveToCloud={handleSaveNewToCloud}
                  onUpdateCloudCertificate={handleUpdateCloudCertificate}
                  onOpenGoogleDriveModal={() => setIsDriveModalOpen(true)}
                  onOpenDraftsModal={() => setIsDraftsModalOpen(true)}
                  canUndo={canUndo}
                  canRedo={canRedo}
                  onUndo={handleUndo}
                  onRedo={handleRedo}
                />
              </div>

            </div>

          </div>
        )}

        {/* TAB 2: BATCH GENERATION */}
        {activeTab === 'batch' && (
          <BatchCertificateGenerator
            baseCertificate={certificateData}
            onApplySingleToEditor={(cert) => {
              updateCertificateData(cert);
              setActiveTab('editor');
              showToast(`تم فتح شهادة الطالب: ${cert.studentName} بالمحرر`);
            }}
            onExportAllPDF={handleExportPDF}
          />
        )}

        {/* TAB 3: DASHBOARD & ANALYTICS */}
        {activeTab === 'dashboard' && (
          <DashboardAnalytics
            currentCertificate={certificateData}
            onLoadCertificate={(cert) => {
              updateCertificateData(cert);
              setActiveTab('editor');
              showToast(`تم فتح شهادة الطالب: ${cert.studentName} بالمحرر ✍️`);
            }}
            onNavigateToTab={(tab) => setActiveTab(tab)}
            onShowToast={showToast}
          />
        )}

        {/* TAB 4: CLOUD LIBRARY */}
        {activeTab === 'cloud' && (
          <CloudLibrary
            currentCertificate={certificateData}
            onLoadCertificate={(cert) => {
              updateCertificateData(cert);
              setActiveTab('editor');
              showToast('تم تحميل الشهادة المحفوظة بنجاح!');
            }}
            onOpenGoogleDriveModal={(cert) => {
              updateCertificateData(cert);
              setActiveTab('editor');
              setIsDriveModalOpen(true);
            }}
            onVerifyCertificate={(cert) => {
              updateCertificateData(cert);
              setIsVerificationModalOpen(true);
            }}
            onShowToast={showToast}
          />
        )}

        {/* TAB 5: AI ASSISTANT CHAT */}
        {activeTab === 'ai' && <AIAssistantChat />}

        {/* TAB 6: VERIFICATION PORTAL */}
        {activeTab === 'verify' && (
          <VerificationPortal
            currentCertificate={certificateData}
            onOpenInEditor={(cert) => {
              updateCertificateData(cert);
              setActiveTab('editor');
              showToast(`تم فتح شهادة الطالب: ${cert.studentName} بالمحرر ✍️`);
            }}
            onOpenGoogleDriveModal={(cert) => {
              updateCertificateData(cert);
              setActiveTab('editor');
              setIsDriveModalOpen(true);
            }}
            onShowToast={showToast}
            initialCode={urlVerifyCode}
          />
        )}

        {/* TAB 7: SETTINGS & SUPPORT */}
        {activeTab === 'settings' && (
          <AppSettingsModal
            currentCertificate={certificateData}
            onUpdateCurrentCertificate={updateCertificateData}
            onShowToast={showToast}
          />
        )}

      </main>

      {/* AI Generator & Text Improvement Modal */}
      <AIGeneratorModal
        isOpen={aiModalConfig.isOpen}
        onClose={() => setAiModalConfig(prev => ({ ...prev, isOpen: false }))}
        onApplyGeneratedContent={handleApplyAiContent}
        currentData={certificateData}
        initialTab={aiModalConfig.tab}
        initialTargetField={aiModalConfig.targetField}
      />

      {/* Verification Platform Modal */}
      <VerificationModal
        isOpen={isVerificationModalOpen}
        onClose={() => setIsVerificationModalOpen(false)}
        currentCertificate={certificateData}
        onOpenGoogleDriveModal={() => {
          setIsVerificationModalOpen(false);
          setIsDriveModalOpen(true);
        }}
        onOpenInEditor={(cert) => {
          updateCertificateData(cert);
          setIsVerificationModalOpen(false);
          setActiveTab('editor');
          showToast(`تم فتح شهادة الطالب: ${cert.studentName} بالمحرر`);
        }}
        onShowToast={showToast}
      />

      {/* Google Drive Save & Verification Modal */}
      <GoogleDriveSaveModal
        isOpen={isDriveModalOpen}
        onClose={() => setIsDriveModalOpen(false)}
        certificateData={certificateData}
        onUpdateCertificateData={updateCertificateData}
        canvasRef={canvasRef}
        onSetExporting={setIsExporting}
        onSaveCloudWithoutDrive={handleSaveNewToCloud}
      />

      {/* Direct Share Modal (WhatsApp & Direct Email) */}
      <DirectShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        initialMode={shareInitialMode}
        certificateData={certificateData}
        canvasRef={canvasRef}
        onShowToast={showToast}
        onSetExporting={setIsExporting}
      />

      {/* Print Preview & Page Settings Modal */}
      <PrintPreviewModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        certificateData={certificateData}
      />

      {/* Drafts & Templates Manager Modal */}
      <DraftsManagerModal
        isOpen={isDraftsModalOpen}
        onClose={() => setIsDraftsModalOpen(false)}
        currentCertificate={certificateData}
        onLoadCertificate={(cert) => {
          updateCertificateData(cert);
          setActiveTab('editor');
          showToast('تم استرجاع وتطبيق المسودة/القالب بنجاح! 🚀');
        }}
        onShowToast={showToast}
      />

      {/* Visual Undo/Redo History Manager Modal */}
      <HistoryManagerModal
        isOpen={isHistoryManagerOpen}
        onClose={() => setIsHistoryManagerOpen(false)}
        history={history}
        historyIndex={historyIndex}
        onJumpToHistoryIndex={(idx) => {
          setHistoryIndex(idx);
          showToast(`تم الانتقال إلى الخطوة (${idx + 1}) بنجاح! ⏱️`);
        }}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onShowToast={showToast}
      />

      {/* Ultra High-Fidelity Multi-Engine Export & Preview Modal */}
      <ExportPreviewModal
        isOpen={isExportPreviewModalOpen}
        onClose={() => setIsExportPreviewModalOpen(false)}
        certificateData={certificateData}
        initialFormat={exportPreviewFormat}
        canvasRef={canvasRef}
        onShowToast={showToast}
      />

      {/* Smart Arabic Spell-checking and Grammar Proofreading Modal */}
      <ArabicProofreaderModal
        isOpen={isProofreaderModalOpen}
        onClose={() => setIsProofreaderModalOpen(false)}
        certificateData={certificateData}
        onApplyChanges={(updated) => {
          updateCertificateData(updated);
        }}
      />

      {/* Categorized Appreciation Phrasing and Quotes Suggestions Modal */}
      <AppreciationSuggestionsModal
        isOpen={isAppreciationModalOpen}
        onClose={() => setIsAppreciationModalOpen(false)}
        certificateData={certificateData}
        onApplyAppreciation={(updates) => {
          updateCertificateData(updates);
        }}
        onOpenAiGenerator={() => {
          handleOpenAiModal('improve', 'appreciation');
        }}
      />

    </div>
  );
}
