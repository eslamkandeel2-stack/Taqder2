import React, { useState, useEffect } from 'react';
import {
  Settings,
  ShieldCheck,
  Wifi,
  WifiOff,
  BookOpen,
  Headset,
  Save,
  RotateCcw,
  Sparkles,
  Building2,
  Calendar,
  PenTool,
  Stamp as StampIcon,
  Palette,
  CheckCircle2,
  Bot,
  Key,
  Cpu,
  Sliders,
  Server,
  HelpCircle,
  Eye,
  EyeOff,
  Activity,
  AlertCircle,
  Check,
  Zap,
  Code2,
  Layout,
  Type as TypeIcon,
  Award,
  QrCode,
  Printer,
  Download,
  Upload,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Layers,
  FileCheck2,
  Database,
  Cloud,
  Lock,
  Unlock,
  Shield,
  ToggleLeft,
  ToggleRight,
  SlidersHorizontal,
  Star,
  GraduationCap,
  School,
  BookMarked,
  Briefcase
} from 'lucide-react';
import { CertificateData, FontOption, FrameStyle, LayoutPreset, AspectRatioOption, BadgeIconType, BadgeBgShape, VerificationBoxPattern, VerificationCodePattern } from '../types';
import {
  DefaultCertificateSettings,
  getSavedDefaultSettings,
  saveDefaultSettingsToStorage,
  FALLBACK_DEFAULT_SETTINGS,
  applyDefaultsToCertificate,
  extractCertificateToDefaultSettings,
  INSTITUTION_DEFAULT_PRESETS,
  InstitutionPreset
} from '../utils/defaultSettings';
import {
  getDriveVerificationRequests,
  saveDriveVerificationRequests,
  approveDriveVerificationRequest,
  rejectDriveVerificationRequest,
  deleteDriveVerificationRequest,
  DriveVerificationRequest
} from '../utils/driveVerificationRequests';
import {
  AISettings,
  AIProvider,
  AI_PROVIDERS,
  SUPPORTED_AI_MODELS,
  DEFAULT_AI_SETTINGS,
  getSavedAISettings,
  saveAISettings,
  resetAISettings,
  testAIConnection,
  AITone
} from '../utils/aiConfig';
import {
  getSavedSystemConfig,
  saveSystemConfig,
  SystemSettingsConfig,
  toggleSystemFeature,
  toggleSystemLockedElement,
  resetSystemConfig,
  SystemLockedElements,
  SystemFeatureToggles
} from '../utils/systemConfig';
import { EXPORT_ENGINES } from '../utils/exportUtils';
import { useDragScroll } from '../utils/useDragScroll';
import { getAccessToken, googleSignIn, getCurrentUser } from '../services/googleDriveService';
import { syncFullAccountToCloud, restoreAccountFromCloud } from '../services/cloudDatabaseService';

interface Props {
  currentCertificate?: CertificateData;
  onUpdateCurrentCertificate?: (cert: CertificateData) => void;
  onShowToast?: (msg: string) => void;
}

type DefaultSubTab = 
  | 'basic-info'
  | 'text-format'
  | 'template-layout'
  | 'colors-fonts'
  | 'signatures'
  | 'frame-logo'
  | 'stamps-badges'
  | 'verification-box'
  | 'export-print'
  | 'verification-document'
  | 'element-locks';

const FONT_OPTIONS: FontOption[] = [
  'Cairo', 'Amiri', 'Tajawal', 'Almarai', 'Aref Ruqaa', 'Reem Kufi',
  'Changa', 'El Messiri', 'Lalezar', 'Kufam', 'Scheherazade New',
  'Vazirmatn', 'Harmattan', 'Marhey'
];

const FRAME_OPTIONS: { id: FrameStyle; label: string }[] = [
  { id: 'double-gold', label: 'إطار ذهبي مزدوج فاخر' },
  { id: 'classic-ornate', label: 'إطار كلاسيكي مزخرف' },
  { id: 'modern-geometric', label: 'إطار هندسي عصري' },
  { id: 'emerald-border', label: 'إطار زمردي ملكي' },
  { id: 'royal-ribbon', label: 'إطار أشرطة ملكية' },
  { id: 'clean-minimal', label: 'إطار بسيط ناعم' },
  { id: 'islamic-arch', label: 'إطار القوس الإسلامي' },
  { id: 'guilloche-royal', label: 'إطار الجليوش الأمني' },
  { id: 'golden-vines', label: 'إطار الأغصان الذهبية' },
  { id: 'andalusian-star', label: 'إطار النجمة الأندلسية' },
  { id: 'floral-corners', label: 'إطار الزوايا المزهرة' },
  { id: 'victorian-crest', label: 'إطار التاج الفيكتوري' },
];

const LAYOUT_PRESETS: { id: LayoutPreset; label: string; desc: string }[] = [
  { id: 'classic-standard', label: 'تقليدي متوازن', desc: 'ترويسة كاملة، عنوان بارز، متن مركزي وتواقيع سفلية' },
  { id: 'modern-split', label: 'عصري مقسم', desc: 'توزيع عصري بارز لعناصر التكريم مع شارة مميزة' },
  { id: 'sidebar-right', label: 'إطار جانبي أيمن', desc: 'شريط زخرفي عمودي على اليمين مع نصوص فسيحة' },
  { id: 'sidebar-left', label: 'إطار جانبي أيسر', desc: 'شريط زخرفي عمودي على اليسار' },
  { id: 'minimal-centered', label: 'مركز ومبسط', desc: 'تركيز فائق على اسم المكرم ونص الشكر' },
  { id: 'executive-horizontal', label: 'تنفيذي أفقي', desc: 'تصميم رسمي للشهادات المهنية العليا' },
  { id: 'diploma-grand', label: 'دبلوم أكاديمي', desc: 'نمط الشهادات الجامعية والدبلومات الرفيعة' },
];

const VERIFICATION_PATTERNS: { id: VerificationBoxPattern; label: string }[] = [
  { id: 'classic', label: 'البطاقة الكلاسيكية المعتمدة' },
  { id: 'modern-card', label: 'كارت عصري فاخر' },
  { id: 'seal-stamp', label: 'ختم التوثيق الذهبي' },
  { id: 'barcode-focus', label: 'تركيز الباركود الأفقي' },
  { id: 'minimal-pill', label: 'كبسولة مصغرة دائرية' },
  { id: 'glass-card', label: 'بطاقة زجاجية شفافة' },
  { id: 'certificate-tag', label: 'بطاقة تعريفية معلقة' },
];

const BADGE_ICONS: { id: BadgeIconType; label: string }[] = [
  { id: 'award', label: 'وسام الشرف' },
  { id: 'star', label: 'نجمة التفوق' },
  { id: 'trophy', label: 'كأس الإنجاز' },
  { id: 'crown', label: 'التاج الملكي' },
  { id: 'shield', label: 'درع التميز' },
  { id: 'sparkles', label: 'بريق الإبداع' },
  { id: 'medal', label: 'الميدالية الذهبية' },
  { id: 'book', label: 'كتاب المعرفة' },
  { id: 'target', label: 'شعار الهدف والريادة' },
];

export const AppSettingsModal: React.FC<Props> = ({
  currentCertificate,
  onUpdateCurrentCertificate,
  onShowToast
}) => {
  const [activeTab, setActiveTab] = useState<'default-cert' | 'ai-settings' | 'app-system'>('default-cert');
  const [activeSubTab, setActiveSubTab] = useState<DefaultSubTab>('basic-info');
  const [defaultSettings, setDefaultSettings] = useState<DefaultCertificateSettings>(getSavedDefaultSettings());
  const [aiSettings, setAiSettings] = useState<AISettings>(getSavedAISettings());
  const [systemConfig, setSystemConfig] = useState<SystemSettingsConfig>(getSavedSystemConfig());
  const [showApiKey, setShowApiKey] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);
  const [aiSaveSuccessMsg, setAiSaveSuccessMsg] = useState(false);

  // Drag-to-scroll horizontal navigation hooks
  const mainNavDrag = useDragScroll({ scrollStep: 220 });
  const subNavDrag = useDragScroll({ scrollStep: 200 });

  // AI Connection Test state
  const [isTestingAi, setIsTestingAi] = useState(false);
  const [aiTestResult, setAiTestResult] = useState<{
    tested: boolean;
    success: boolean;
    message: string;
    latencyMs?: number;
    modelUsed?: string;
    providerUsed?: string;
    details?: string;
  } | null>(null);

  // External deployment guide expanded accordion state
  const [showDeployGuide, setShowDeployGuide] = useState(false);

  // App System settings state
  const [activeFaq, setActiveFaq] = useState<number | null>(0);
  const [driveRequests, setDriveRequests] = useState<DriveVerificationRequest[]>([]);

  useEffect(() => {
    setDefaultSettings(getSavedDefaultSettings());
    setAiSettings(getSavedAISettings());
    setSystemConfig(getSavedSystemConfig());
    setDriveRequests(getDriveVerificationRequests());

    const handleReqChange = () => {
      setDriveRequests(getDriveVerificationRequests());
    };
    const handleDefaultsChange = (e: any) => {
      if (e?.detail) {
        setDefaultSettings(e.detail);
      } else {
        setDefaultSettings(getSavedDefaultSettings());
      }
    };
    const handleSystemConfigChange = (e: any) => {
      if (e?.detail) {
        setSystemConfig(e.detail);
      } else {
        setSystemConfig(getSavedSystemConfig());
      }
    };

    window.addEventListener('taqdeer_drive_requests_changed', handleReqChange);
    window.addEventListener('taqdeer_default_settings_changed', handleDefaultsChange);
    window.addEventListener('taqdeer_system_config_changed', handleSystemConfigChange);

    return () => {
      window.removeEventListener('taqdeer_drive_requests_changed', handleReqChange);
      window.removeEventListener('taqdeer_default_settings_changed', handleDefaultsChange);
      window.removeEventListener('taqdeer_system_config_changed', handleSystemConfigChange);
    };
  }, []);

  const handleToggleFeature = (key: keyof SystemFeatureToggles, val?: boolean) => {
    const updated = toggleSystemFeature(key, val);
    setSystemConfig(updated);
    if (onShowToast) {
      onShowToast(`تم ${updated.features[key] ? 'تفعيل' : 'إيقاف'} الخاصية بنجاح ⚙️`);
    }
  };

  const handleToggleLock = (key: keyof SystemLockedElements, val?: boolean) => {
    const updated = toggleSystemLockedElement(key, val);
    setSystemConfig(updated);
    if (onShowToast) {
      onShowToast(updated.lockedElements[key] ? 'تم قفل هذا العنصر لحمايته من التعديل في المحرر 🔒' : 'تم فك قفل العنصر للتحرير 🔓');
    }
  };

  const handleLockAllElements = (lock: boolean) => {
    const updatedLocks: SystemLockedElements = {
      schoolName: lock,
      headerLines: lock,
      logo: lock,
      signatures: lock,
      stamp: lock,
      badge: lock,
      frame: lock,
      watermark: lock,
      verificationBox: lock,
      colors: lock,
      poemOrQuote: lock,
      aspectRatio: lock,
      title: lock,
    };
    const newConfig: SystemSettingsConfig = {
      ...systemConfig,
      lockedElements: updatedLocks
    };
    saveSystemConfig(newConfig);
    setSystemConfig(newConfig);
    if (onShowToast) {
      onShowToast(lock ? 'تم قفل وحماية جميع العناصر الأساسية 🔒' : 'تم فك قفل جميع العناصر للتحرير 🔓');
    }
  };

  const handleApplyPresetInstitution = (preset: InstitutionPreset) => {
    const updated: DefaultCertificateSettings = {
      ...defaultSettings,
      ...preset.settings
    };
    setDefaultSettings(updated);
    saveDefaultSettingsToStorage(updated);
    setSaveSuccessMsg(true);
    if (onShowToast) {
      onShowToast(`تم تطبيق نموذج "${preset.name}" المؤسسي كإعدادات افتراضية كاملة بنجاح! ✨`);
    }
    setTimeout(() => setSaveSuccessMsg(false), 3500);
  };

  const handleUpdateReqStatus = (id: string, status: 'pending' | 'approved' | 'rejected') => {
    if (status === 'approved') {
      approveDriveVerificationRequest(id, {
        driveFileUrl: `https://drive.google.com/file/d/${id}/view`,
        driveFileWebViewLink: `https://drive.google.com/file/d/${id}/preview`,
        adminNotes: 'تمت المصادقة والاعتماد السحابي بنجاح'
      });
    } else if (status === 'rejected') {
      rejectDriveVerificationRequest(id, 'تم رفض الطلب');
    }
    setDriveRequests(getDriveVerificationRequests());
    if (onShowToast) {
      onShowToast(status === 'approved' ? 'تمت الموافقة على طلب التوثيق السحابي بنجاح! ☁️✅' : 'تم تحديث حالة طلب التوثيق');
    }
  };

  const handleDeleteReq = (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا الطلب؟')) {
      deleteDriveVerificationRequest(id);
      setDriveRequests(getDriveVerificationRequests());
      if (onShowToast) {
        onShowToast('تم حذف الطلب بنجاح');
      }
    }
  };

  const handleSaveDefaults = () => {
    saveDefaultSettingsToStorage(defaultSettings);
    setSaveSuccessMsg(true);
    if (onShowToast) {
      onShowToast('تم حفظ الإعدادات الافتراضية لجميع حقول الشهادات بنجاح! 💾');
    }
    setTimeout(() => setSaveSuccessMsg(false), 3000);
  };

  const handleSaveAISettings = () => {
    saveAISettings(aiSettings);
    setAiSaveSuccessMsg(true);
    if (onShowToast) {
      onShowToast(`تم حفظ إعدادات مزود (${aiSettings.provider}) ونموذج الذكاء الاصطناعي بنجاح! 🤖✨`);
    }
    setTimeout(() => setAiSaveSuccessMsg(false), 3000);
  };

  const handleResetAISettings = () => {
    if (window.confirm('هل ترغب في إعادة تعيين إعدادات الذكاء الاصطناعي للقيم الافتراضية؟')) {
      const def = resetAISettings();
      setAiSettings(def);
      setAiTestResult(null);
      if (onShowToast) {
        onShowToast('تم استعادة الإعدادات الافتراضية للذكاء الاصطناعي');
      }
    }
  };

  const handleTestConnection = async () => {
    setIsTestingAi(true);
    setAiTestResult(null);
    try {
      const res = await testAIConnection(aiSettings);
      setAiTestResult({
        tested: true,
        success: res.success,
        message: res.message,
        latencyMs: res.latencyMs,
        modelUsed: res.modelUsed,
        providerUsed: res.providerUsed,
        details: res.details,
      });
      if (onShowToast) {
        onShowToast(res.success ? 'تم الاتصال بنموذج الذكاء الاصطناعي بنجاح! 🟢' : 'فشل الاتصال: يرجى التحقق من المفتاح أو النموذج 🔴');
      }
    } catch (err: any) {
      setAiTestResult({
        tested: true,
        success: false,
        message: 'تعذر الاتصال بخادم الذكاء الاصطناعي',
        details: err?.message || String(err),
      });
    } finally {
      setIsTestingAi(false);
    }
  };

  const handleApplyDefaultsToEditor = () => {
    if (!currentCertificate || !onUpdateCurrentCertificate) return;
    const updated = applyDefaultsToCertificate(currentCertificate, defaultSettings);
    onUpdateCurrentCertificate(updated);
    if (onShowToast) {
      onShowToast('تم تطبيق الإعدادات الافتراضية الشاملة على الشهادة الحالية بنجاح! ✨');
    }
  };

  const handleImportCurrentCertToDefaults = () => {
    if (!currentCertificate) return;
    const newDefaults = extractCertificateToDefaultSettings(currentCertificate, defaultSettings);
    setDefaultSettings(newDefaults);
    saveDefaultSettingsToStorage(newDefaults);
    setSaveSuccessMsg(true);
    if (onShowToast) {
      onShowToast('تم سحب كافة بيانات وتنسيقات الشهادة الحالية وحفظها كإعدادات افتراضية للنظام بنجاح! ⭐💾');
    }
    setTimeout(() => setSaveSuccessMsg(false), 3500);
  };

  const handleResetToFactory = () => {
    if (window.confirm('هل أنت متأكد من إعادة تعيين كافة الإعدادات الافتراضية للقيم الأولية؟')) {
      setDefaultSettings(FALLBACK_DEFAULT_SETTINGS);
      saveDefaultSettingsToStorage(FALLBACK_DEFAULT_SETTINGS);
      if (onShowToast) {
        onShowToast('تم إعادة تعيين كافة الإعدادات الافتراضية للقيم المصنع الأولية');
      }
    }
  };

  const handleExportBackup = () => {
    const backupData = {
      version: '2026.1',
      date: new Date().toISOString(),
      defaultSettings,
      aiSettings: {
        ...aiSettings,
        apiKey: aiSettings.apiKey ? '***HIDDEN***' : '',
      },
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `taqdeer-settings-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    if (onShowToast) {
      onShowToast('تم تصدير ملف النسخة الاحتياطية للإعدادات بنجاح! 📦');
    }
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        if (parsed.defaultSettings) {
          setDefaultSettings(parsed.defaultSettings);
          saveDefaultSettingsToStorage(parsed.defaultSettings);
        }
        if (parsed.aiSettings) {
          const mergedAi = { ...aiSettings, ...parsed.aiSettings };
          if (mergedAi.apiKey === '***HIDDEN***') {
            mergedAi.apiKey = aiSettings.apiKey;
          }
          setAiSettings(mergedAi);
          saveAISettings(mergedAi);
        }
        if (onShowToast) {
          onShowToast('تم استيراد وتطبيق النسخة الاحتياطية للإعدادات بنجاح! 📥');
        }
      } catch (err) {
        alert('الملف المحدد غير صالح أو تالف.');
      }
    };
    reader.readAsText(file);
  };

  const handleClearCache = () => {
    if (window.confirm('هل ترغب في تنظيف الذاكرة المؤقتة لتسريع التطبيق وحل أي تداخل في التخزين المؤقت؟')) {
      const keysToKeep = ['taqdeer_default_settings', 'taqdeer_ai_settings_v1', 'taqdeer_certificate_history_v2'];
      const preserved: Record<string, string> = {};
      keysToKeep.forEach((k) => {
        const val = localStorage.getItem(k);
        if (val) preserved[k] = val;
      });
      localStorage.clear();
      Object.entries(preserved).forEach(([k, v]) => localStorage.setItem(k, v));
      if (onShowToast) {
        onShowToast('تم تنظيف الذاكرة المؤقتة بنجاح مع الحفاظ على إعداداتك! 🧹');
      }
    }
  };

  const currentProviderInfo = AI_PROVIDERS.find((p) => p.id === aiSettings.provider) || AI_PROVIDERS[0];

  const faqs = [
    {
      q: 'كيف تعمل الإعدادات الافتراضية الشاملة للشهادات؟',
      a: 'تتيح لك الإعدادات الافتراضية تخصيص كافة بيانات حقول النظام: الترويسة، النصوص وصيغ المذكر والمؤنث، القوالب، الهوامش، الخطوط، الألوان، التواقيع، الأختام، الشارات، مربع التوثيق والـ QR، وإعدادات الطباعة. تُطبق هذه الإعدادات تلقائياً عند إنشاء أي شهادة فردية أو دفعة جماعية.'
    },
    {
      q: 'كيف أستخدم مزودي ذكاء اصطناعي آخرين مثل OpenAI أو Claude أو DeepSeek أو Groq؟',
      a: 'من تبويب "مساعد الذكاء الاصطناعي والـ API"، اختر المزود المطلوب، ثم أدخل مفتاح الـ API الخاص به أو استخدم الخادم المخصص المحلي (مثل Ollama/LM Studio). يتولى التطبيق تحويل وتوجيه كافة الطلبات والتنسيقات تلقائياً.'
    },
    {
      q: 'كيف أضمن عمل الذكاء الاصطناعي عند رفع التطبيق على سيرفر خارجي (VPS/Docker/Cloud)؟',
      a: 'يمكنك وضع متغيرات البيئة مثل GEMINI_API_KEY أو OPENAI_API_KEY في ملف .env في السيرفر أو داخل إعدادات الاستضافة. كما يمكنك إدخال مفتاح الـ API مباشرة في الإعدادات ليتم تشغيله من السيرفر بأمان تام.'
    },
    {
      q: 'ماذا يحدث إذا انقطع الإنترنت أو نفدت حصة الـ API؟',
      a: 'يحتوي نظام "تقدير" على مولد ذكي لغوي محلي فائق الفصاحة (Smart Local Fallback) يقوم بتوليد 3 خيارات بلاغية متنوعة وضبط التذكير والتأنيث فوراً حتى بدون اتصال بالإنترنت أو بدون مفتاح API.'
    },
    {
      q: 'كيف أقوم بنقل وتصدير إعداداتي إلى أجهزة أو مدارس أخرى؟',
      a: 'من تبويب "المزامنة والدعم الفني"، استخدم زر "تصدير نسخة احتياطية (JSON)". يمكنك حفظ الملف ونقله لأي جهاز آخر واستيراده بنقرة واحدة.'
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6 text-right pb-10">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 text-white p-6 rounded-3xl shadow-xl border border-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Settings className="w-7 h-7 text-amber-400" />
            <h2 className="text-xl font-black">إعدادات النظام والذكاء الاصطناعي الشاملة</h2>
          </div>
          <p className="text-xs text-amber-200/80 mt-1.5 leading-relaxed">
            تخصيص البيانات الافتراضية لجميع حقول الشهادات، مزودي ونماذج الذكاء الاصطناعي (Gemini, OpenAI, Claude, DeepSeek, Groq)، وإدارة المزامنة والدعم الفني.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-amber-500/15 border border-amber-500/30 text-amber-300 px-4 py-2 rounded-2xl text-xs font-bold shrink-0">
          <ShieldCheck className="w-4 h-4" /> النسخة المؤسسية المعتمدة 2026
        </div>
      </div>

      {/* Main Tab Bar - Drag to Scroll Navigation */}
      <div className="relative flex items-center bg-slate-200/90 p-1.5 rounded-2xl border border-slate-300 shadow-xs">
        <button
          type="button"
          onClick={mainNavDrag.scrollRight}
          className="p-2 text-slate-700 hover:text-amber-700 hover:bg-slate-300/80 rounded-xl transition shrink-0 cursor-pointer"
          title="تمرير لليمين"
        >
          <ChevronRight className="w-4 h-4 stroke-[2.5]" />
        </button>

        <div
          ref={mainNavDrag.scrollRef}
          onMouseDown={mainNavDrag.onMouseDown}
          onMouseLeave={mainNavDrag.onMouseLeave}
          onMouseUp={mainNavDrag.onMouseUp}
          onMouseMove={mainNavDrag.onMouseMove}
          className="flex items-center gap-2 overflow-x-auto no-scrollbar touch-pan-x scroll-smooth w-full px-1 select-none cursor-grab active:cursor-grabbing"
        >
          <button
            onClick={() => setActiveTab('default-cert')}
            className={`py-2.5 px-4 rounded-xl font-extrabold text-xs transition flex items-center justify-center gap-2 shrink-0 whitespace-nowrap cursor-pointer ${
              activeTab === 'default-cert'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'bg-white/90 text-slate-700 hover:bg-white border border-slate-300/60'
            }`}
          >
            <Building2 className="w-4 h-4 shrink-0" />
            <span>بيانات الشهادات الافتراضية والقوالب</span>
          </button>

          <button
            onClick={() => setActiveTab('ai-settings')}
            className={`py-2.5 px-4 rounded-xl font-extrabold text-xs transition flex items-center justify-center gap-2 shrink-0 whitespace-nowrap cursor-pointer ${
              activeTab === 'ai-settings'
                ? 'bg-indigo-600 text-white shadow-md font-black'
                : 'bg-white/90 text-slate-700 hover:bg-white border border-slate-300/60'
            }`}
          >
            <Bot className="w-4 h-4 shrink-0 text-amber-300" />
            <span>مساعد الذكاء الاصطناعي والـ API</span>
          </button>

          <button
            onClick={() => setActiveTab('app-system')}
            className={`py-2.5 px-4 rounded-xl font-extrabold text-xs transition flex items-center justify-center gap-2 shrink-0 whitespace-nowrap cursor-pointer ${
              activeTab === 'app-system'
                ? 'bg-slate-900 text-white shadow-md font-black'
                : 'bg-white/90 text-slate-700 hover:bg-white border border-slate-300/60'
            }`}
          >
            <Sliders className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>إعدادات النظام والتحكم الشامل ({Object.values(systemConfig.lockedElements).filter(Boolean).length > 0 ? `🔒 ${Object.values(systemConfig.lockedElements).filter(Boolean).length} مقفل` : 'مفعل'})</span>
          </button>
        </div>

        <button
          type="button"
          onClick={mainNavDrag.scrollLeft}
          className="p-2 text-slate-700 hover:text-amber-700 hover:bg-slate-300/80 rounded-xl transition shrink-0 cursor-pointer"
          title="تمرير لليسار"
        >
          <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: DEFAULT CERTIFICATE SETTINGS (ALL 11 CORE CATEGORIES)              */}
      {/* ========================================================================= */}
      {activeTab === 'default-cert' && (
        <div className="space-y-6">
          
          {/* Institutional Presets Quick Bar */}
          <div className="bg-gradient-to-r from-slate-900 via-amber-950/90 to-slate-900 text-white p-4 rounded-2xl border border-amber-500/30 shadow-md space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-400 fill-amber-400 animate-pulse" />
                <h3 className="font-black text-xs sm:text-sm text-amber-300">
                  نماذج وقوالب المؤسسات المعتمدة الجاهزة (1-Click Presets):
                </h3>
              </div>
              <span className="text-[11px] text-slate-300 font-medium hidden sm:inline">
                اختر نموذج مؤسستك لضبط الترويسة، الصيغ، الخطوط، والتواقيع بضغطة زر
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {INSTITUTION_DEFAULT_PRESETS.map((preset) => {
                const getPresetIcon = (id: string) => {
                  switch (id) {
                    case 'ministry-school': return School;
                    case 'academic-university': return GraduationCap;
                    case 'quran-center': return BookMarked;
                    default: return Briefcase;
                  }
                };
                const PresetIcon = getPresetIcon(preset.id);
                return (
                  <div
                    key={preset.id}
                    className="p-3 bg-white/10 hover:bg-white/15 border border-white/15 hover:border-amber-400/60 rounded-xl transition flex flex-col justify-between gap-2"
                  >
                    <div>
                      <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                        <PresetIcon className="w-4 h-4 shrink-0 text-amber-400" />
                        <span>{preset.name}</span>
                      </div>
                      <p className="text-[10px] text-slate-300 mt-1 leading-relaxed line-clamp-2">
                        {preset.description}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleApplyPresetInstitution(preset)}
                      className="w-full py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[11px] rounded-lg transition shadow-2xs flex items-center justify-center gap-1 cursor-pointer active:scale-95"
                    >
                      <Sparkles className="w-3 h-3 text-slate-950" />
                      <span>تطبيق هذا النموذج ⭐</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Bar */}
          <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 flex flex-wrap items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2 text-amber-900 text-xs font-bold">
              <Sparkles className="w-5 h-5 text-amber-600 shrink-0" />
              <span>هذه الإعدادات ستُطبق تلقائياً على كل شهادة جديدة أو دفعة جماعية تنشئها في النظام.</span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleResetToFactory}
                className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                title="إعادة التعيين للقيم المصنعية"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>إعادة ضبط المصنع</span>
              </button>

              {currentCertificate && (
                <button
                  onClick={handleImportCurrentCertToDefaults}
                  className="px-3 py-2 bg-amber-100 hover:bg-amber-200 text-amber-950 font-bold text-xs rounded-xl transition shadow-xs flex items-center gap-1.5 border border-amber-300 cursor-pointer"
                  title="سحب كافة خصائص الشهادة المفتوحة وتعيينها كإعدادات افتراضية"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                  <span>سحب بيانات الشهادة كافتراضي</span>
                </button>
              )}

              {currentCertificate && onUpdateCurrentCertificate && (
                <button
                  onClick={handleApplyDefaultsToEditor}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>تطبيق على الشهادة الحالية</span>
                </button>
              )}

              <button
                onClick={handleSaveDefaults}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl transition shadow-xs flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>حفظ التغييرات الافتراضية</span>
              </button>
            </div>
          </div>

          {saveSuccessMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              تم حفظ وتحديث الإعدادات الافتراضية بنجاح! ستُعتمد تلقائياً في كل الشهادات والدفعات اللاحقة.
            </div>
          )}

          {/* Sub-Tabs Bar - Drag-to-Scroll Horizontal Navigation */}
          <div className="relative flex items-center bg-slate-100/95 p-1 rounded-2xl border border-slate-200 shadow-xs">
            <button
              type="button"
              onClick={subNavDrag.scrollRight}
              className="p-2 text-slate-600 hover:text-amber-700 hover:bg-slate-200 rounded-xl transition shrink-0 cursor-pointer"
              title="تمرير لليمين"
            >
              <ChevronRight className="w-4 h-4 stroke-[2.5]" />
            </button>

            <div
              ref={subNavDrag.scrollRef}
              onMouseDown={subNavDrag.onMouseDown}
              onMouseLeave={subNavDrag.onMouseLeave}
              onMouseUp={subNavDrag.onMouseUp}
              onMouseMove={subNavDrag.onMouseMove}
              className="flex items-center gap-1.5 overflow-x-auto no-scrollbar touch-pan-x scroll-smooth w-full px-2 py-0.5 select-none cursor-grab active:cursor-grabbing text-xs"
            >
              {[
                { id: 'basic-info', label: '1. البيانات الأساسية', icon: Building2 },
                { id: 'text-format', label: '2. تنسيق النصوص', icon: TypeIcon },
                { id: 'template-layout', label: '3. القوالب والتخطيط', icon: Layout },
                { id: 'colors-fonts', label: '4. الألوان والخطوط', icon: Palette },
                { id: 'signatures', label: '5. التوقيعات', icon: PenTool },
                { id: 'frame-logo', label: '6. الإطار والشعار', icon: Layers },
                { id: 'stamps-badges', label: '7. الأختام والرموز', icon: Award },
                { id: 'verification-box', label: '8. مربع التوثيق', icon: QrCode },
                { id: 'export-print', label: '9. التصدير والطباعة', icon: Printer },
                { id: 'verification-document', label: '10. وثيقة التحقق الرسمية', icon: FileCheck2 },
                { id: 'element-locks', label: '11. 🔒 قفل وتأمين العناصر', icon: Lock },
              ].map((st) => {
                const Icon = st.icon;
                const isSel = activeSubTab === st.id;
                const isLockTab = st.id === 'element-locks';
                const lockedCount = Object.values(systemConfig.lockedElements).filter(Boolean).length;
                return (
                  <button
                    key={st.id}
                    onClick={() => setActiveSubTab(st.id as DefaultSubTab)}
                    className={`px-3 py-2 rounded-xl font-bold transition flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer ${
                      isSel
                        ? isLockTab
                          ? 'bg-amber-600 text-white shadow-xs font-black'
                          : 'bg-amber-500 text-slate-950 shadow-xs font-black'
                        : 'text-slate-700 bg-white hover:bg-slate-200/80 border border-slate-200/90'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{st.label}</span>
                    {isLockTab && lockedCount > 0 && (
                      <span className="px-1.5 py-0.2 bg-amber-950/20 rounded-full text-[10px] font-black">
                        {lockedCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={subNavDrag.scrollLeft}
              className="p-2 text-slate-600 hover:text-amber-700 hover:bg-slate-200 rounded-xl transition shrink-0 cursor-pointer"
              title="تمرير لليسار"
            >
              <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>

          {/* SUB-TAB 1: BASIC INFO & HEADERS */}
          {activeSubTab === 'basic-info' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-900 border-b pb-2.5">
                  <Building2 className="w-5 h-5 text-amber-600" />
                  <h4 className="font-extrabold text-sm">بيانات المؤسسة والترويسة</h4>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">اسم المدرسة / الجهة الافتراضي</label>
                  <input
                    type="text"
                    value={defaultSettings.schoolName}
                    onChange={(e) => setDefaultSettings({ ...defaultSettings, schoolName: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 outline-none"
                    placeholder="مثال: مدرسة التميز النموذجية"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">السطر الأول في الترويسة</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={defaultSettings.headerLine1}
                      onChange={(e) => setDefaultSettings({ ...defaultSettings, headerLine1: e.target.value })}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-300 outline-none"
                      placeholder="المملكة العربية السعودية"
                    />
                    <input
                      type="checkbox"
                      title="إظهار السطر الأول"
                      checked={defaultSettings.showHeaderLine1}
                      onChange={(e) => setDefaultSettings({ ...defaultSettings, showHeaderLine1: e.target.checked })}
                      className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">السطر الثاني في الترويسة</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={defaultSettings.headerLine2}
                      onChange={(e) => setDefaultSettings({ ...defaultSettings, headerLine2: e.target.value })}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-300 outline-none"
                      placeholder="وزارة التعليم / الإدارة العامة"
                    />
                    <input
                      type="checkbox"
                      title="إظهار السطر الثاني"
                      checked={defaultSettings.showHeaderLine2}
                      onChange={(e) => setDefaultSettings({ ...defaultSettings, showHeaderLine2: e.target.checked })}
                      className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">السطر الثالث في الترويسة (إضافي)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={defaultSettings.headerLine3}
                      onChange={(e) => setDefaultSettings({ ...defaultSettings, headerLine3: e.target.value })}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-300 outline-none"
                      placeholder="مكتب التعليم - قسم التميز"
                    />
                    <input
                      type="checkbox"
                      title="إظهار السطر الثالث"
                      checked={defaultSettings.showHeaderLine3}
                      onChange={(e) => setDefaultSettings({ ...defaultSettings, showHeaderLine3: e.target.checked })}
                      className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">نص الرؤية أو الشعار الترويسي</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={defaultSettings.headerVisionText}
                      onChange={(e) => setDefaultSettings({ ...defaultSettings, headerVisionText: e.target.value })}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-300 outline-none"
                      placeholder="رؤية 2030"
                    />
                    <input
                      type="checkbox"
                      title="إظهار نص الرؤية"
                      checked={defaultSettings.showHeaderVisionText}
                      onChange={(e) => setDefaultSettings({ ...defaultSettings, showHeaderVisionText: e.target.checked })}
                      className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Column 2: Titles & Dates Defaults */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-900 border-b pb-2.5">
                  <Calendar className="w-5 h-5 text-amber-600" />
                  <h4 className="font-extrabold text-sm">العناوين وتواريخ الإصدار الافتراضية</h4>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">عنوان الشهادة الافتراضي</label>
                  <input
                    type="text"
                    value={defaultSettings.defaultTitle}
                    onChange={(e) => setDefaultSettings({ ...defaultSettings, defaultTitle: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 outline-none"
                    placeholder="شهادة شكر وتقدير وتفوق"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">العنوان الفرعي الافتراضي</label>
                  <input
                    type="text"
                    value={defaultSettings.defaultSubtitle}
                    onChange={(e) => setDefaultSettings({ ...defaultSettings, defaultSubtitle: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 outline-none"
                    placeholder="وسام التميز الأكاديمي"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">المادة / المجال الافتراضي</label>
                    <input
                      type="text"
                      value={defaultSettings.defaultSubject}
                      onChange={(e) => setDefaultSettings({ ...defaultSettings, defaultSubject: e.target.value })}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-300 outline-none"
                      placeholder="التفوق والتميز الدراسي"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">الصف / المرحلة الافتراضية</label>
                    <input
                      type="text"
                      value={defaultSettings.defaultGrade}
                      onChange={(e) => setDefaultSettings({ ...defaultSettings, defaultGrade: e.target.value })}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-300 outline-none"
                      placeholder="المرحلة الدراسية"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">مكان الإصدار الافتراضي</label>
                  <input
                    type="text"
                    value={defaultSettings.issuePlace}
                    onChange={(e) => setDefaultSettings({ ...defaultSettings, issuePlace: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 outline-none"
                    placeholder="الرياض، المملكة العربية السعودية"
                  />
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">تحديث تاريخ الإصدار تلقائياً لتاريخ اليوم</span>
                    <input
                      type="checkbox"
                      checked={defaultSettings.autoTodayDate}
                      onChange={(e) => setDefaultSettings({ ...defaultSettings, autoTodayDate: e.target.checked })}
                      className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">نوع التاريخ</label>
                      <select
                        value={defaultSettings.dateFormatMode}
                        onChange={(e) => setDefaultSettings({ ...defaultSettings, dateFormatMode: e.target.value as any })}
                        className="w-full text-xs p-1.5 rounded-lg border border-slate-300 bg-white"
                      >
                        <option value="both">هجري وميلادي معاً</option>
                        <option value="hijri">هجري فقط</option>
                        <option value="gregorian">ميلادي فقط</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">صيغة الأرقام</label>
                      <select
                        value={defaultSettings.dateNumeralType}
                        onChange={(e) => setDefaultSettings({ ...defaultSettings, dateNumeralType: e.target.value as any })}
                        className="w-full text-xs p-1.5 rounded-lg border border-slate-300 bg-white"
                      >
                        <option value="latin">أرقام إنجليزية (123)</option>
                        <option value="arabic">أرقام مشرقية (١٢٣)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">تخطيط العرض</label>
                      <select
                        value={defaultSettings.dateDisplayLayout}
                        onChange={(e) => setDefaultSettings({ ...defaultSettings, dateDisplayLayout: e.target.value as any })}
                        className="w-full text-xs p-1.5 rounded-lg border border-slate-300 bg-white"
                      >
                        <option value="single-line">سطر واحد</option>
                        <option value="stacked">فوق بعض</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SUB-TAB 2: TEXT FORMATTING & GENDER PHRASES */}
          {activeSubTab === 'text-format' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-900 border-b pb-2.5">
                  <TypeIcon className="w-5 h-5 text-amber-600" />
                  <h4 className="font-extrabold text-sm">صيغ التقديم للمذكر والمؤنث</h4>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">عبارة تقديم الطالب (مذكر)</label>
                  <textarea
                    rows={2}
                    value={defaultSettings.recipientIntroMale}
                    onChange={(e) => setDefaultSettings({ ...defaultSettings, recipientIntroMale: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 outline-none leading-relaxed"
                    placeholder="تسر إدارة المدرسة ومعلموها أن تمنح هذه الشهادة للطالب المتميز:"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">عبارة تقديم الطالبة (مؤنث)</label>
                  <textarea
                    rows={2}
                    value={defaultSettings.recipientIntroFemale}
                    onChange={(e) => setDefaultSettings({ ...defaultSettings, recipientIntroFemale: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 outline-none leading-relaxed"
                    placeholder="تسر إدارة المدرسة ومعلماتها أن تمنح هذه الشهادة للطالبة المتميزة:"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">بيت الشعر / الحكمة الافتراضية</label>
                  <textarea
                    rows={2}
                    value={defaultSettings.defaultPoemOrQuote}
                    onChange={(e) => setDefaultSettings({ ...defaultSettings, defaultPoemOrQuote: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 outline-none leading-relaxed"
                    placeholder="العِلْمُ يَرْفَعُ بَيْتًا لا عِمَادَ لَهُ ... وَالجَهْلُ يَهْدِمُ بَيْتَ العِزِّ وَالشَّرَفِ"
                  />
                  <div className="flex items-center gap-2 mt-1.5">
                    <input
                      type="checkbox"
                      checked={defaultSettings.showPoemOrQuote}
                      onChange={(e) => setDefaultSettings({ ...defaultSettings, showPoemOrQuote: e.target.checked })}
                      className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                    />
                    <span className="text-xs text-slate-600 font-bold">إظهار بيت الشعر افتراضياً</span>
                  </div>
                </div>
              </div>

              {/* Column 2: Typography Scale & Alignment */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-900 border-b pb-2.5">
                  <Sliders className="w-5 h-5 text-amber-600" />
                  <h4 className="font-extrabold text-sm">المحاذاة، التباعد ومربع المكرم</h4>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">المحاذاة الافتراضية للنصوص</label>
                  <div className="grid grid-cols-4 gap-2">
                    {(['center', 'right', 'justify', 'left'] as const).map((al) => (
                      <button
                        key={al}
                        type="button"
                        onClick={() => setDefaultSettings({ ...defaultSettings, textAlignment: al })}
                        className={`p-2 rounded-xl text-xs font-bold border text-center transition ${
                          defaultSettings.textAlignment === al
                            ? 'bg-amber-500 text-slate-950 border-amber-500'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {al === 'center' ? 'توسيط' : al === 'right' ? 'يمين' : al === 'justify' ? 'محاذاة تامة' : 'يسار'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>مقياس حجم الخطوط العام:</span>
                    <span className="text-amber-700 font-mono">{defaultSettings.fontSizeScale}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.8"
                    max="1.3"
                    step="0.05"
                    value={defaultSettings.fontSizeScale}
                    onChange={(e) => setDefaultSettings({ ...defaultSettings, fontSizeScale: parseFloat(e.target.value) })}
                    className="w-full accent-amber-500"
                  />
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">مربع إبراز اسم المكرم (Recipient Box)</span>
                    <input
                      type="checkbox"
                      checked={defaultSettings.showRecipientBox}
                      onChange={(e) => setDefaultSettings({ ...defaultSettings, showRecipientBox: e.target.checked })}
                      className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                    />
                  </div>
                  {defaultSettings.showRecipientBox && (
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-[11px] text-slate-600 mb-1">لون المربع</label>
                        <input
                          type="color"
                          value={defaultSettings.recipientBoxColor}
                          onChange={(e) => setDefaultSettings({ ...defaultSettings, recipientBoxColor: e.target.value })}
                          className="w-full h-8 rounded-lg cursor-pointer border border-slate-300"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-600 mb-1">الشفافية: {defaultSettings.recipientBoxOpacity}</label>
                        <input
                          type="range"
                          min="0.05"
                          max="1.0"
                          step="0.05"
                          value={defaultSettings.recipientBoxOpacity}
                          onChange={(e) => setDefaultSettings({ ...defaultSettings, recipientBoxOpacity: parseFloat(e.target.value) })}
                          className="w-full accent-amber-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* SUB-TAB 3: TEMPLATE & PAGE LAYOUT */}
          {activeSubTab === 'template-layout' && (
            <div className="space-y-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between border-b pb-2.5">
                <div className="flex items-center gap-2 text-slate-900">
                  <Layout className="w-5 h-5 text-amber-600" />
                  <h4 className="font-extrabold text-sm">القالب الافتراضي والتخطيط والهوامش</h4>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-slate-700">نسبة الأبعاد:</label>
                  <select
                    value={defaultSettings.aspectRatio}
                    onChange={(e) => setDefaultSettings({ ...defaultSettings, aspectRatio: e.target.value as AspectRatioOption })}
                    className="text-xs font-bold p-1.5 rounded-lg border border-slate-300 bg-slate-50"
                  >
                    <option value="A4-landscape">A4 أفقي (Landscape)</option>
                    <option value="A4-portrait">A4 رأسي (Portrait)</option>
                    <option value="square">مربع (Square)</option>
                  </select>
                </div>
              </div>

              {/* Presets Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {LAYOUT_PRESETS.map((lp) => {
                  const isSel = defaultSettings.layoutPreset === lp.id;
                  return (
                    <div
                      key={lp.id}
                      onClick={() => setDefaultSettings({ ...defaultSettings, layoutPreset: lp.id })}
                      className={`p-3.5 rounded-xl border cursor-pointer transition ${
                        isSel
                          ? 'bg-amber-50/80 border-amber-500 ring-2 ring-amber-500/20 shadow-xs'
                          : 'bg-slate-50/60 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-extrabold text-xs text-slate-900">{lp.label}</span>
                        {isSel && <CheckCircle2 className="w-4 h-4 text-amber-600" />}
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">{lp.desc}</p>
                    </div>
                  );
                })}
              </div>

              {/* Margins Inputs */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="text-xs font-bold text-slate-800 block">الهوامش الآمنة الافتراضية لمنطقة العمل (بكسل px):</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-0.5">الهامش العلوي (Top)</label>
                    <input
                      type="number"
                      value={defaultSettings.canvasMarginTop}
                      onChange={(e) => setDefaultSettings({ ...defaultSettings, canvasMarginTop: parseInt(e.target.value) || 0 })}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-0.5">الهامش السفلي (Bottom)</label>
                    <input
                      type="number"
                      value={defaultSettings.canvasMarginBottom}
                      onChange={(e) => setDefaultSettings({ ...defaultSettings, canvasMarginBottom: parseInt(e.target.value) || 0 })}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-0.5">الهامش الأيمن (Right)</label>
                    <input
                      type="number"
                      value={defaultSettings.canvasMarginRight}
                      onChange={(e) => setDefaultSettings({ ...defaultSettings, canvasMarginRight: parseInt(e.target.value) || 0 })}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-0.5">الهامش الأيسر (Left)</label>
                    <input
                      type="number"
                      value={defaultSettings.canvasMarginLeft}
                      onChange={(e) => setDefaultSettings({ ...defaultSettings, canvasMarginLeft: parseInt(e.target.value) || 0 })}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SUB-TAB 4: COLORS & TYPOGRAPHY */}
          {activeSubTab === 'colors-fonts' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-900 border-b pb-2.5">
                  <Palette className="w-5 h-5 text-amber-600" />
                  <h4 className="font-extrabold text-sm">لوحة الألوان الافتراضية</h4>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">اللون الرئيسي (العنوان والأوسمة)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={defaultSettings.primaryColor}
                        onChange={(e) => setDefaultSettings({ ...defaultSettings, primaryColor: e.target.value })}
                        className="w-9 h-9 rounded-lg border border-slate-300 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={defaultSettings.primaryColor}
                        onChange={(e) => setDefaultSettings({ ...defaultSettings, primaryColor: e.target.value })}
                        className="text-xs font-mono p-2 rounded-lg border border-slate-300 w-full"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">اللون الثانوي (الزخارف والتأثيرات)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={defaultSettings.secondaryColor}
                        onChange={(e) => setDefaultSettings({ ...defaultSettings, secondaryColor: e.target.value })}
                        className="w-9 h-9 rounded-lg border border-slate-300 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={defaultSettings.secondaryColor}
                        onChange={(e) => setDefaultSettings({ ...defaultSettings, secondaryColor: e.target.value })}
                        className="text-xs font-mono p-2 rounded-lg border border-slate-300 w-full"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">لون النصوص الأساسي</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={defaultSettings.textColor}
                        onChange={(e) => setDefaultSettings({ ...defaultSettings, textColor: e.target.value })}
                        className="w-9 h-9 rounded-lg border border-slate-300 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={defaultSettings.textColor}
                        onChange={(e) => setDefaultSettings({ ...defaultSettings, textColor: e.target.value })}
                        className="text-xs font-mono p-2 rounded-lg border border-slate-300 w-full"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">لون خلفية الشهادة</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={defaultSettings.backgroundColor}
                        onChange={(e) => setDefaultSettings({ ...defaultSettings, backgroundColor: e.target.value })}
                        className="w-9 h-9 rounded-lg border border-slate-300 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={defaultSettings.backgroundColor}
                        onChange={(e) => setDefaultSettings({ ...defaultSettings, backgroundColor: e.target.value })}
                        className="text-xs font-mono p-2 rounded-lg border border-slate-300 w-full"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Column 2: Typography Defaults */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-900 border-b pb-2.5">
                  <TypeIcon className="w-5 h-5 text-amber-600" />
                  <h4 className="font-extrabold text-sm">أنواع الخطوط العربية الافتراضية</h4>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">خط العنوان الرئيسي (Title Font)</label>
                  <select
                    value={defaultSettings.titleFontFamily}
                    onChange={(e) => setDefaultSettings({ ...defaultSettings, titleFontFamily: e.target.value as FontOption })}
                    className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-300 bg-white"
                  >
                    {FONT_OPTIONS.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">خط اسم الطالب / المكرم (Student Name Font)</label>
                  <select
                    value={defaultSettings.studentNameFontFamily}
                    onChange={(e) => setDefaultSettings({ ...defaultSettings, studentNameFontFamily: e.target.value as FontOption })}
                    className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-300 bg-white"
                  >
                    {FONT_OPTIONS.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">خط المتن والنصوص العامة (Body Font)</label>
                  <select
                    value={defaultSettings.fontFamily}
                    onChange={(e) => setDefaultSettings({ ...defaultSettings, fontFamily: e.target.value as FontOption })}
                    className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-300 bg-white"
                  >
                    {FONT_OPTIONS.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* SUB-TAB 5: SIGNATURES */}
          {activeSubTab === 'signatures' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b pb-2.5">
                <div className="flex items-center gap-2 text-slate-900">
                  <PenTool className="w-5 h-5 text-amber-600" />
                  <h4 className="font-extrabold text-sm">التوقيعات الرسمية الافتراضية</h4>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-slate-700">عدد التواقيع الافتراضي:</label>
                  <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                    {([1, 2, 3] as const).map((cnt) => (
                      <button
                        key={cnt}
                        type="button"
                        onClick={() => setDefaultSettings({ ...defaultSettings, signatureCount: cnt })}
                        className={`px-3 py-1 rounded-md text-xs font-bold transition ${
                          defaultSettings.signatureCount === cnt
                            ? 'bg-amber-500 text-slate-950 shadow-xs'
                            : 'text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {cnt} {cnt === 1 ? 'توقيع' : 'تواقيع'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Signature 1 */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                  <span className="text-xs font-extrabold text-slate-900 block">التوقيع الأول (المعلم / المشرف)</span>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-0.5">الصفة / المنصب</label>
                    <input
                      type="text"
                      value={defaultSettings.teacherTitle}
                      onChange={(e) => setDefaultSettings({ ...defaultSettings, teacherTitle: e.target.value })}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                      placeholder="معلم المادة"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-0.5">الاسم المعتمد</label>
                    <input
                      type="text"
                      value={defaultSettings.teacherName}
                      onChange={(e) => setDefaultSettings({ ...defaultSettings, teacherName: e.target.value })}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                      placeholder="أ. عبد الرحمن السعيد"
                    />
                  </div>
                </div>

                {/* Signature 2 */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                  <span className="text-xs font-extrabold text-slate-900 block">التوقيع الثاني (مدير المدرسة / الرئيس)</span>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-0.5">الصفة / المنصب</label>
                    <input
                      type="text"
                      value={defaultSettings.principalTitle}
                      onChange={(e) => setDefaultSettings({ ...defaultSettings, principalTitle: e.target.value })}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                      placeholder="مدير المدرسة"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-0.5">الاسم المعتمد</label>
                    <input
                      type="text"
                      value={defaultSettings.principalName}
                      onChange={(e) => setDefaultSettings({ ...defaultSettings, principalName: e.target.value })}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                      placeholder="د. خالد العصيمي"
                    />
                  </div>
                </div>

                {/* Signature 3 */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                  <span className="text-xs font-extrabold text-slate-900 block">التوقيع الثالث (الوكيل / الموجه)</span>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-0.5">الصفة / المنصب</label>
                    <input
                      type="text"
                      value={defaultSettings.signature3Title || ''}
                      onChange={(e) => setDefaultSettings({ ...defaultSettings, signature3Title: e.target.value })}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                      placeholder="الموجه الطلابي"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-0.5">الاسم المعتمد</label>
                    <input
                      type="text"
                      value={defaultSettings.signature3Name || ''}
                      onChange={(e) => setDefaultSettings({ ...defaultSettings, signature3Name: e.target.value })}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                      placeholder="أ. فهد الشمري"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">خط التوقيع اليدوي الافتراضي</label>
                  <select
                    value={defaultSettings.signatureFontFamily}
                    onChange={(e) => setDefaultSettings({ ...defaultSettings, signatureFontFamily: e.target.value })}
                    className="w-full text-xs p-2 rounded-xl border border-slate-300 bg-white"
                  >
                    <option value="Aref Ruqaa">خط الرقعة الفني (Aref Ruqaa)</option>
                    <option value="Amiri">خط النسخ الأميري (Amiri)</option>
                    <option value="Reem Kufi">خط كوفي فاخر (Reem Kufi)</option>
                    <option value="Cairo">خط القاهرة الحديث (Cairo)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">لون حبر التوقيع</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={defaultSettings.signatureInkColor}
                      onChange={(e) => setDefaultSettings({ ...defaultSettings, signatureInkColor: e.target.value })}
                      className="w-9 h-9 rounded-lg border border-slate-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={defaultSettings.signatureInkColor}
                      onChange={(e) => setDefaultSettings({ ...defaultSettings, signatureInkColor: e.target.value })}
                      className="text-xs font-mono p-2 rounded-lg border border-slate-300 w-full"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SUB-TAB 6: FRAME & LOGO */}
          {activeSubTab === 'frame-logo' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-900 border-b pb-2.5">
                  <Layers className="w-5 h-5 text-amber-600" />
                  <h4 className="font-extrabold text-sm">الإطار والنقوش الزخرفية</h4>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">نمط الإطار الافتراضي</label>
                  <select
                    value={defaultSettings.frameStyle}
                    onChange={(e) => setDefaultSettings({ ...defaultSettings, frameStyle: e.target.value as FrameStyle })}
                    className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-300 bg-white"
                  >
                    {FRAME_OPTIONS.map((fr) => (
                      <option key={fr.id} value={fr.id}>{fr.label}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">سمك الإطار (Border Width)</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={defaultSettings.borderWidth}
                      onChange={(e) => setDefaultSettings({ ...defaultSettings, borderWidth: parseInt(e.target.value) || 2 })}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">المسافة الداخلية (Padding px)</label>
                    <input
                      type="number"
                      min="4"
                      max="40"
                      value={defaultSettings.borderPadding}
                      onChange={(e) => setDefaultSettings({ ...defaultSettings, borderPadding: parseInt(e.target.value) || 12 })}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300"
                    />
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">حاوية خلفية للنصوص لزيادة الوضوح فوق الزخارف</span>
                    <input
                      type="checkbox"
                      checked={defaultSettings.bgCardBacking}
                      onChange={(e) => setDefaultSettings({ ...defaultSettings, bgCardBacking: e.target.checked })}
                      className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                    />
                  </div>
                  {defaultSettings.bgCardBacking && (
                    <div className="pt-1">
                      <div className="flex justify-between text-[11px] text-slate-600 mb-1">
                        <span>شفافية الحاوية:</span>
                        <span className="font-mono">{defaultSettings.bgCardOpacity}</span>
                      </div>
                      <input
                        type="range"
                        min="0.4"
                        max="1.0"
                        step="0.05"
                        value={defaultSettings.bgCardOpacity}
                        onChange={(e) => setDefaultSettings({ ...defaultSettings, bgCardOpacity: parseFloat(e.target.value) })}
                        className="w-full accent-amber-500"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Column 2: Logo Defaults */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-900 border-b pb-2.5">
                  <Award className="w-5 h-5 text-amber-600" />
                  <h4 className="font-extrabold text-sm">شعار المؤسسة الافتراضي</h4>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">رابط أو صورة الشعار الافتراضي (URL)</label>
                  <input
                    type="text"
                    value={defaultSettings.logoUrl || ''}
                    onChange={(e) => setDefaultSettings({ ...defaultSettings, logoUrl: e.target.value })}
                    className="w-full text-xs font-mono p-2.5 rounded-xl border border-slate-300 outline-none"
                    placeholder="https://example.com/logo.png أو اترك فارغاً"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">موضع الشعار</label>
                    <select
                      value={defaultSettings.logoPosition}
                      onChange={(e) => setDefaultSettings({ ...defaultSettings, logoPosition: e.target.value as any })}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                    >
                      <option value="right">يمين الترويسة</option>
                      <option value="center">وسط الشهادة</option>
                      <option value="left">يسار الترويسة</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">حجم الشعار</label>
                    <select
                      value={defaultSettings.logoSize}
                      onChange={(e) => setDefaultSettings({ ...defaultSettings, logoSize: e.target.value as any })}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                    >
                      <option value="sm">صغير (Compact)</option>
                      <option value="md">متوسط (Standard)</option>
                      <option value="lg">كبير (Prominent)</option>
                      <option value="xl">بارز جداً (Grand)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">شكل إطار الشعار</label>
                    <select
                      value={defaultSettings.logoShape}
                      onChange={(e) => setDefaultSettings({ ...defaultSettings, logoShape: e.target.value as any })}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                    >
                      <option value="circle">دائري</option>
                      <option value="rounded">حواف مستديرة</option>
                      <option value="square">مربع</option>
                      <option value="none">حر بدون إطار</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">خلفية الشعار</label>
                    <select
                      value={defaultSettings.logoBgMode}
                      onChange={(e) => setDefaultSettings({ ...defaultSettings, logoBgMode: e.target.value as any })}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                    >
                      <option value="transparent">شفافة (Transparent)</option>
                      <option value="white">بيضاء نقية</option>
                      <option value="dark">داكنة فخمة</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SUB-TAB 7: STAMPS & BADGES */}
          {activeSubTab === 'stamps-badges' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-900 border-b pb-2.5">
                  <StampIcon className="w-5 h-5 text-amber-600" />
                  <h4 className="font-extrabold text-sm">الختم الرسمي الافتراضي</h4>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">نص الختم الرئيسي</label>
                  <input
                    type="text"
                    value={defaultSettings.stampTitle}
                    onChange={(e) => setDefaultSettings({ ...defaultSettings, stampTitle: e.target.value })}
                    className="w-full text-xs p-2 rounded-xl border border-slate-300"
                    placeholder="الختم الرسمي"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">النص الفرعي للختم</label>
                  <input
                    type="text"
                    value={defaultSettings.stampSubtext}
                    onChange={(e) => setDefaultSettings({ ...defaultSettings, stampSubtext: e.target.value })}
                    className="w-full text-xs p-2 rounded-xl border border-slate-300"
                    placeholder="معتمد رسمياً"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">شكل الختم</label>
                    <select
                      value={defaultSettings.stampShape}
                      onChange={(e) => setDefaultSettings({ ...defaultSettings, stampShape: e.target.value as any })}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                    >
                      <option value="circle">دائري تقليدي</option>
                      <option value="wax">شمعي ملكي فاخر</option>
                      <option value="ribbon">شريطي مع وسام</option>
                      <option value="square">مربع هندسي</option>
                      <option value="rectangle">مستطيل اعتمادي</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">لون حبر الختم</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={defaultSettings.stampColor}
                        onChange={(e) => setDefaultSettings({ ...defaultSettings, stampColor: e.target.value })}
                        className="w-8 h-8 rounded-lg border border-slate-300 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={defaultSettings.stampColor}
                        onChange={(e) => setDefaultSettings({ ...defaultSettings, stampColor: e.target.value })}
                        className="text-xs font-mono p-1.5 rounded-lg border border-slate-300 w-full"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">نص العلامة المائية الشفافة (Watermark)</label>
                  <input
                    type="text"
                    value={defaultSettings.watermarkText || ''}
                    onChange={(e) => setDefaultSettings({ ...defaultSettings, watermarkText: e.target.value })}
                    className="w-full text-xs p-2 rounded-xl border border-slate-300"
                    placeholder="مثال: نسخة معتمدة أو شعار المدرسة"
                  />
                </div>
              </div>

              {/* Column 2: Badges Defaults */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-900 border-b pb-2.5">
                  <Award className="w-5 h-5 text-amber-600" />
                  <h4 className="font-extrabold text-sm">الشارة والوسام الشرفي الافتراضي</h4>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">اسم الشارة / الوسام الافتراضي</label>
                  <input
                    type="text"
                    value={defaultSettings.badgeTitle}
                    onChange={(e) => setDefaultSettings({ ...defaultSettings, badgeTitle: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300"
                    placeholder="وسام التميز والتفوق"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">رمز الوسام (Icon)</label>
                    <select
                      value={defaultSettings.badgeIcon}
                      onChange={(e) => setDefaultSettings({ ...defaultSettings, badgeIcon: e.target.value as BadgeIconType })}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                    >
                      {BADGE_ICONS.map((bi) => (
                        <option key={bi.id} value={bi.id}>{bi.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">شكل خلفية الشارة</label>
                    <select
                      value={defaultSettings.badgeBgShape}
                      onChange={(e) => setDefaultSettings({ ...defaultSettings, badgeBgShape: e.target.value as BadgeBgShape })}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                    >
                      <option value="pill">كبسولة دائرية</option>
                      <option value="banner">شريط ملكي مع أطراف</option>
                      <option value="rounded">مستطيل بحواف ناعمة</option>
                      <option value="ornate">إطار زخرفي محدد</option>
                      <option value="none">بدون خلفية</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">لون الشارة</label>
                    <input
                      type="color"
                      value={defaultSettings.badgeBgColor}
                      onChange={(e) => setDefaultSettings({ ...defaultSettings, badgeBgColor: e.target.value })}
                      className="w-full h-8 rounded-lg border border-slate-300 cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">حجم الشارة</label>
                    <select
                      value={defaultSettings.badgeSize}
                      onChange={(e) => setDefaultSettings({ ...defaultSettings, badgeSize: e.target.value as any })}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                    >
                      <option value="sm">صغير (Compact)</option>
                      <option value="md">متوسط (Standard)</option>
                      <option value="lg">كبير وبارز (Large)</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    checked={defaultSettings.badgeBgGradient}
                    onChange={(e) => setDefaultSettings({ ...defaultSettings, badgeBgGradient: e.target.checked })}
                    className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                  />
                  <span className="text-xs text-slate-700 font-bold">تطبيق تدرج لوني ملكي مذهب على الشارة</span>
                </div>
              </div>
            </div>
          )}

          {/* SUB-TAB 8: VERIFICATION BOX */}
          {activeSubTab === 'verification-box' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b pb-2.5">
                <div className="flex items-center gap-2 text-slate-900">
                  <QrCode className="w-5 h-5 text-amber-600" />
                  <h4 className="font-extrabold text-sm">مربع التوثيق والـ QR والباركود الافتراضي</h4>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-slate-700">نمط صندوق التوثيق:</label>
                  <select
                    value={defaultSettings.verificationBoxPattern}
                    onChange={(e) => setDefaultSettings({ ...defaultSettings, verificationBoxPattern: e.target.value as VerificationBoxPattern })}
                    className="text-xs font-bold p-1.5 rounded-lg border border-slate-300 bg-slate-50"
                  >
                    {VERIFICATION_PATTERNS.map((vp) => (
                      <option key={vp.id} value={vp.id}>{vp.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                  <input
                    type="checkbox"
                    checked={defaultSettings.showVerificationQr}
                    onChange={(e) => setDefaultSettings({ ...defaultSettings, showVerificationQr: e.target.checked })}
                    className="w-4 h-4 accent-amber-500 rounded"
                  />
                  <span>رمز QR التفاعلي</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                  <input
                    type="checkbox"
                    checked={defaultSettings.showVerificationBarcode}
                    onChange={(e) => setDefaultSettings({ ...defaultSettings, showVerificationBarcode: e.target.checked })}
                    className="w-4 h-4 accent-amber-500 rounded"
                  />
                  <span>الباركود الشريطي</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                  <input
                    type="checkbox"
                    checked={defaultSettings.showVerificationSerialCode}
                    onChange={(e) => setDefaultSettings({ ...defaultSettings, showVerificationSerialCode: e.target.checked })}
                    className="w-4 h-4 accent-amber-500 rounded"
                  />
                  <span>الرقم التسلسلي</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                  <input
                    type="checkbox"
                    checked={defaultSettings.showVerificationStatusText}
                    onChange={(e) => setDefaultSettings({ ...defaultSettings, showVerificationStatusText: e.target.checked })}
                    className="w-4 h-4 accent-amber-500 rounded"
                  />
                  <span>شارة الاعتماد الرسمي</span>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">بادئة التوثيق (Prefix)</label>
                  <input
                    type="text"
                    value={defaultSettings.verificationPrefix}
                    onChange={(e) => setDefaultSettings({ ...defaultSettings, verificationPrefix: e.target.value })}
                    className="w-full text-xs font-mono p-2.5 rounded-xl border border-slate-300"
                    placeholder="CERT"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">نمط تشفير الكود</label>
                  <select
                    value={defaultSettings.verificationCodePattern}
                    onChange={(e) => setDefaultSettings({ ...defaultSettings, verificationCodePattern: e.target.value as VerificationCodePattern })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white"
                  >
                    <option value="year-batch-serial">السنة + الدفعة + الرقم (CERT-2026-001)</option>
                    <option value="hash-short">رمز أمني مشفر (CERT-A9X7-K2)</option>
                    <option value="full-uuid">معرف كامل UUID</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">نص شارة الاعتماد</label>
                  <input
                    type="text"
                    value={defaultSettings.verificationBadgeText}
                    onChange={(e) => setDefaultSettings({ ...defaultSettings, verificationBadgeText: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300"
                    placeholder="وثيقة رسمية معتمدة ومؤمنة"
                  />
                </div>
              </div>
            </div>
          )}

          {/* SUB-TAB 9: EXPORT & PRINT */}
          {activeSubTab === 'export-print' && (
            <div className="space-y-6">
              {/* Header Card */}
              <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-5 rounded-2xl border border-amber-500/30 flex items-start gap-3 shadow-xs">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shrink-0 shadow-md">
                  <Printer className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-extrabold text-sm text-slate-900">
                    محركات التصدير والطباعة فائقة الدقة (Multi-Library Export Engines)
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    يدعم النظام مكتبات ومحركات تصدير متعددة تضمن تطابقاً تاماً بنسبة 100% بين نافذة المعاينة والملف المحفوظ للخطوط والتنسيقات والأبعاد والألوان.
                  </p>
                </div>
              </div>

              {/* Engine Selection Grid */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b pb-2.5">
                  <div className="flex items-center gap-2 text-slate-900">
                    <Cpu className="w-5 h-5 text-amber-600" />
                    <h5 className="font-extrabold text-sm">اختيار محرك التصدير الافتراضي</h5>
                  </div>
                  <span className="text-xs text-slate-500 font-bold">
                    المحرك النشط: {EXPORT_ENGINES.find(e => e.id === defaultSettings.defaultExportEngine)?.name || 'Modern Screenshot'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {EXPORT_ENGINES.map((engine) => {
                    const isSelected = (defaultSettings.defaultExportEngine || 'modern-screenshot') === engine.id;
                    return (
                      <div
                        key={engine.id}
                        onClick={() => setDefaultSettings({ ...defaultSettings, defaultExportEngine: engine.id })}
                        className={`p-3.5 rounded-2xl border transition cursor-pointer relative flex flex-col justify-between ${
                          isSelected
                            ? 'bg-amber-500/10 border-amber-500 shadow-sm ring-2 ring-amber-500/20'
                            : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-1.5">
                            <span className="font-extrabold text-xs text-slate-900">{engine.name}</span>
                            <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold border ${engine.badgeColor}`}>
                              {engine.badge}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 leading-snug mb-2">
                            {engine.description}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px]">
                          <span className="text-slate-500 font-bold">الصيغ المدعومة: {engine.formats.map(f => f.toUpperCase()).join(', ')}</span>
                          {isSelected && (
                            <span className="text-amber-700 font-black flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                              افتراضي
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Format, DPI, Paper Settings */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-slate-900 border-b pb-2.5">
                  <Sliders className="w-5 h-5 text-amber-600" />
                  <h5 className="font-extrabold text-sm">إعدادات الصيغة والجودة والأبعاد</h5>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">صيغة التصدير الافتراضية</label>
                    <select
                      value={defaultSettings.exportFormat}
                      onChange={(e) => setDefaultSettings({ ...defaultSettings, exportFormat: e.target.value as any })}
                      className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                    >
                      <option value="pdf">ملف مستند PDF (موصى به للطباعة الرسمية)</option>
                      <option value="png">صورة فائقة النقاء PNG (للشاشات والمشاركة)</option>
                      <option value="jpeg">صورة مضغوطة JPEG (حجم خفيف)</option>
                      <option value="webp">صورة حديثة WebP (تقنية ضغط متطورة)</option>
                      <option value="svg">رسوم متجهة SVG (قابل للتكبير اللانهائي)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">دقة التصدير الافتراضية (DPI)</label>
                    <select
                      value={defaultSettings.exportDpi}
                      onChange={(e) => setDefaultSettings({ ...defaultSettings, exportDpi: parseInt(e.target.value) as any })}
                      className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                    >
                      <option value={72}>72 DPI (مشاركة سريعة وحجم فائق الصغر)</option>
                      <option value={150}>150 DPI (شاشات عالية الوضوح HD)</option>
                      <option value={300}>300 DPI (دقة طباعة قياسية فائقة - مستحسن)</option>
                      <option value={400}>400 DPI (دقة مكثفة للشهادات الفاخرة)</option>
                      <option value={600}>600 DPI (دقة احترافية فائقة للمطابع الكبرى)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">مقاس الورق الافتراضي</label>
                    <select
                      value={defaultSettings.printPaperSize}
                      onChange={(e) => setDefaultSettings({ ...defaultSettings, printPaperSize: e.target.value as any })}
                      className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                    >
                      <option value="A4">A4 (210 × 297 مم - القياسي)</option>
                      <option value="A3">A3 (297 × 420 مم - لوحات شرف كبيرة)</option>
                      <option value="Letter">Letter (8.5 × 11 بوصة)</option>
                    </select>
                  </div>
                </div>

                {/* Batch & Google Drive Default Engine Customization */}
                <div className="pt-3 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3.5 bg-amber-500/5 rounded-xl border border-amber-500/20">
                    <label className="block text-xs font-bold text-amber-950 mb-1">محرك تصدير الشهادات المجمعة الافتراضي (PDF المجمع)</label>
                    <select
                      value={defaultSettings.batchDefaultEngine || defaultSettings.defaultExportEngine || 'html2canvas'}
                      onChange={(e) => setDefaultSettings({ ...defaultSettings, batchDefaultEngine: e.target.value as any })}
                      className="w-full text-xs font-bold p-2.5 rounded-xl border border-amber-200 bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                    >
                      <option value="html2canvas">html2canvas 🎨 (المحرك الأكثر استقراراً للخطوط العربية)</option>
                      <option value="modern-screenshot">Modern Screenshot ⚡ (فائق السرعة وخفيف الذاكرة)</option>
                      <option value="html-to-image">html-to-image 🖼️ (دقة متناهية عبر طبقات SVG)</option>
                      <option value="jspdf">jsPDF + الحسابات الهندسية 📐 (أبعاد ورقية متطابقة)</option>
                      <option value="html2pdf">html2pdf.js 📄 (محرك PDF المباشر)</option>
                    </select>
                    <p className="text-[10px] text-amber-800/80 mt-1">يُستخدم هذا المحرك عند تصدير كامل شهادات الدفعة في ملف PDF موحد.</p>
                  </div>

                  <div className="p-3.5 bg-blue-50/70 rounded-xl border border-blue-200/60">
                    <label className="block text-xs font-bold text-blue-950 mb-1">محرك وصيغة توثيق Google Drive الافتراضية</label>
                    <div className="grid grid-cols-2 gap-2 mb-1">
                      <select
                        value={defaultSettings.driveDefaultEngine || 'html2canvas'}
                        onChange={(e) => setDefaultSettings({ ...defaultSettings, driveDefaultEngine: e.target.value as any })}
                        className="w-full text-xs font-bold p-2 rounded-lg border border-blue-200 bg-white outline-none"
                      >
                        <option value="html2canvas">html2canvas 🎨</option>
                        <option value="modern-screenshot">Modern Screenshot ⚡</option>
                        <option value="html-to-image">html-to-image 🖼️</option>
                      </select>

                      <select
                        value={defaultSettings.driveDefaultFormat || 'png'}
                        onChange={(e) => setDefaultSettings({ ...defaultSettings, driveDefaultFormat: e.target.value as any })}
                        className="w-full text-xs font-bold p-2 rounded-lg border border-blue-200 bg-white outline-none"
                      >
                        <option value="png">صيغة PNG (عالية الوضوح)</option>
                        <option value="pdf">صيغة PDF (مستند موثق)</option>
                        <option value="jpeg">صيغة JPEG (حجم خفيف)</option>
                      </select>
                    </div>
                    <p className="text-[10px] text-blue-800/80">المحرك والصيغة المعتمدة لرفع الشهادات ومزامنة روابط التوثيق مع Google Drive.</p>
                  </div>
                </div>

                {/* Quality Factor */}
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1">
                    <span>جودة ضغط الصور (JPEG / WebP):</span>
                    <span className="font-mono text-amber-600 font-black">{Math.round((defaultSettings.exportImageQuality ?? 0.95) * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="1.0"
                    step="0.05"
                    value={defaultSettings.exportImageQuality ?? 0.95}
                    onChange={(e) => setDefaultSettings({ ...defaultSettings, exportImageQuality: parseFloat(e.target.value) })}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Interactive Switches */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-slate-900 border-b pb-2.5">
                  <Sliders className="w-5 h-5 text-amber-600" />
                  <h5 className="font-extrabold text-sm">خيارات تجربة التصدير والحفظ</h5>
                </div>

                <div className="space-y-3">
                  <label className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200 cursor-pointer transition">
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">إظهار نافذة المعاينة والخيارات التفاعلية قبل التصدير</span>
                      <span className="text-[11px] text-slate-500 block">تسمح لك بفحص وتكبير الشهادة واختيار المحرك والجودة المناسبة قبل بدء التحميل</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={defaultSettings.showExportPreviewModal ?? true}
                      onChange={(e) => setDefaultSettings({ ...defaultSettings, showExportPreviewModal: e.target.checked })}
                      className="w-4 h-4 accent-amber-500 rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200 cursor-pointer transition">
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">طباعة متجهة فائقة الدقة (Crisp Vector PDF)</span>
                      <span className="text-[11px] text-slate-500 block">منع تشوه الخطوط والزخارف والحدود عند تكبير الشهادة</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={defaultSettings.crispVectorPdf}
                      onChange={(e) => setDefaultSettings({ ...defaultSettings, crispVectorPdf: e.target.checked })}
                      className="w-4 h-4 accent-amber-500 rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200 cursor-pointer transition">
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">تضمين مربع ورمز التوثيق في التصدير تلقائياً</span>
                      <span className="text-[11px] text-slate-500 block">إضافة الباركود والـ QR ورقم الشهادة في ملف التصدير النهائي</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={defaultSettings.includeVerificationInExport}
                      onChange={(e) => setDefaultSettings({ ...defaultSettings, includeVerificationInExport: e.target.checked })}
                      className="w-4 h-4 accent-amber-500 rounded"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* SUB-TAB 10: OFFICIAL VERIFICATION DOCUMENT SETTINGS */}
          {activeSubTab === 'verification-document' && (
            <div className="space-y-6">
              <div className="bg-emerald-50/80 p-4 rounded-2xl border border-emerald-200 flex items-start gap-3 shadow-xs">
                <ShieldCheck className="w-6 h-6 text-emerald-700 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-extrabold text-sm text-emerald-950">
                    تخصيص وثيقة وإفادة التحقق الإلكتروني الرسمية المعتمدة
                  </h4>
                  <p className="text-xs text-emerald-800 leading-relaxed">
                    هذه الوثيقة هي الإفادة الرسمية الصادرة من بوابة التوثيق عند فحص الكود أو قراءة رمز الـ QR وتتيح للطلاب والجهات الحكومية والأكاديمية طباعة وتصديق الشهادة بشكل مستقل.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                
                {/* Column 1: Ministry Headers & Titles */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-slate-900 border-b pb-2.5">
                    <Building2 className="w-5 h-5 text-emerald-600" />
                    <h5 className="font-extrabold text-sm">ترويسة وعناوين الوثيقة</h5>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">الترويسة العليا (الجهة السيادية)</label>
                    <input
                      type="text"
                      value={defaultSettings.verificationDocMinistryHeader1 || ''}
                      onChange={(e) => setDefaultSettings({ ...defaultSettings, verificationDocMinistryHeader1: e.target.value })}
                      placeholder="المملكة العربية السعودية"
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">الترويسة الثانوية (الوزارة / الجهة)</label>
                    <input
                      type="text"
                      value={defaultSettings.verificationDocMinistryHeader2 || ''}
                      onChange={(e) => setDefaultSettings({ ...defaultSettings, verificationDocMinistryHeader2: e.target.value })}
                      placeholder="وزارة التعليم / منصة تَقْدِير"
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">اسم المنصة أو الجهة المشرفة</label>
                    <input
                      type="text"
                      value={defaultSettings.verificationDocPlatformName || ''}
                      onChange={(e) => setDefaultSettings({ ...defaultSettings, verificationDocPlatformName: e.target.value })}
                      placeholder="منصة تَقْدِير الوطنية لتوثيق الشهادات والجوائز التعليمية"
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">عنوان الوثيقة الرئيسي</label>
                    <input
                      type="text"
                      value={defaultSettings.verificationDocTitle || ''}
                      onChange={(e) => setDefaultSettings({ ...defaultSettings, verificationDocTitle: e.target.value })}
                      placeholder="إفادة وتحقق إلكتروني رسمي من صحة شهادة تقدير"
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">العنوان الفرعي الإنجليزي (Subtitle)</label>
                    <input
                      type="text"
                      value={defaultSettings.verificationDocSubtitle || ''}
                      onChange={(e) => setDefaultSettings({ ...defaultSettings, verificationDocSubtitle: e.target.value })}
                      placeholder="Official Certificate Verification & Authentication Statement"
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">نص إفادة ومطابقة السجلات الرقمية</label>
                    <textarea
                      rows={3}
                      value={defaultSettings.verificationDocDeclaration || ''}
                      onChange={(e) => setDefaultSettings({ ...defaultSettings, verificationDocDeclaration: e.target.value })}
                      placeholder="تشهد منصة تَقْدِير ومطابقة السجلات الرقمية بأن شهادة التقدير والتفوق الصادرة بالبيانات أدناه هي شهادة أصلية، نظامية، وموثقة إلكترونياً بقواعد البيانات المركزية:"
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none leading-relaxed"
                    />
                  </div>
                </div>

                {/* Column 2: Stamp, Colors, Watermark & Toggles */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-slate-900 border-b pb-2.5">
                    <Palette className="w-5 h-5 text-indigo-600" />
                    <h5 className="font-extrabold text-sm">الألوان والأختام والعلامة المائية</h5>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">إدارة الاعتماد والختم الرسمي</label>
                    <input
                      type="text"
                      value={defaultSettings.verificationDocAuthority || ''}
                      onChange={(e) => setDefaultSettings({ ...defaultSettings, verificationDocAuthority: e.target.value })}
                      placeholder="إدارة التوثيق والاعتماد الأكاديمي الرقمي"
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">نص العلامة المائية الشفافة (Watermark)</label>
                    <input
                      type="text"
                      value={defaultSettings.verificationDocWatermark || ''}
                      onChange={(e) => setDefaultSettings({ ...defaultSettings, verificationDocWatermark: e.target.value })}
                      placeholder="معتمد رسمياً - VERIFIED"
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none font-bold"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">اللون الأساسي للأختام</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={defaultSettings.verificationDocPrimaryColor || '#047857'}
                          onChange={(e) => setDefaultSettings({ ...defaultSettings, verificationDocPrimaryColor: e.target.value })}
                          className="w-8 h-8 rounded-lg cursor-pointer border border-slate-300 p-0.5"
                        />
                        <input
                          type="text"
                          value={defaultSettings.verificationDocPrimaryColor || '#047857'}
                          onChange={(e) => setDefaultSettings({ ...defaultSettings, verificationDocPrimaryColor: e.target.value })}
                          className="w-full text-xs p-2 rounded-lg border border-slate-300 font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">لون إطار الوثيقة</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={defaultSettings.verificationDocBorderColor || '#10b981'}
                          onChange={(e) => setDefaultSettings({ ...defaultSettings, verificationDocBorderColor: e.target.value })}
                          className="w-8 h-8 rounded-lg cursor-pointer border border-slate-300 p-0.5"
                        />
                        <input
                          type="text"
                          value={defaultSettings.verificationDocBorderColor || '#10b981'}
                          onChange={(e) => setDefaultSettings({ ...defaultSettings, verificationDocBorderColor: e.target.value })}
                          className="w-full text-xs p-2 rounded-lg border border-slate-300 font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Toggles */}
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5 pt-3">
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-xs font-bold text-slate-800">إظهار الختم والاعتماد الرقمي الدائري</span>
                      <input
                        type="checkbox"
                        checked={defaultSettings.verificationDocShowSecurityStamp !== false}
                        onChange={(e) => setDefaultSettings({ ...defaultSettings, verificationDocShowSecurityStamp: e.target.checked })}
                        className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                      />
                    </label>

                    <label className="flex items-center justify-between cursor-pointer pt-2 border-t">
                      <span className="text-xs font-bold text-slate-800">إظهار رمز الـ QR للتحقق السريع</span>
                      <input
                        type="checkbox"
                        checked={defaultSettings.verificationDocShowQr !== false}
                        onChange={(e) => setDefaultSettings({ ...defaultSettings, verificationDocShowQr: e.target.checked })}
                        className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                      />
                    </label>

                    <label className="flex items-center justify-between cursor-pointer pt-2 border-t">
                      <span className="text-xs font-bold text-slate-800">إظهار بصمة الأمان الرقمية (Checksum)</span>
                      <input
                        type="checkbox"
                        checked={defaultSettings.verificationDocShowChecksum !== false}
                        onChange={(e) => setDefaultSettings({ ...defaultSettings, verificationDocShowChecksum: e.target.checked })}
                        className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                      />
                    </label>
                  </div>

                </div>

              </div>

              {/* Live Mini Preview Box */}
              <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <Eye className="w-4 h-4" />
                    <span>معاينة حية لشكل وثيقة التحقق المعتمدة للطباعة</span>
                  </span>
                  <span className="text-[10px] text-slate-400">تحديث فوري مع تغيير الحقول أعلاه</span>
                </div>
                <div
                  className="bg-white text-slate-900 p-6 rounded-2xl border-2 space-y-3 text-xs max-w-2xl mx-auto shadow-inner"
                  style={{ borderColor: defaultSettings.verificationDocBorderColor || '#10b981' }}
                >
                  <div className="flex justify-between items-center border-b pb-2" style={{ borderColor: defaultSettings.verificationDocPrimaryColor || '#047857' }}>
                    <div>
                      <h6 className="font-black text-sm text-slate-900">{defaultSettings.verificationDocMinistryHeader1 || 'المملكة العربية السعودية'}</h6>
                      <p className="text-[11px] font-bold text-slate-700">{defaultSettings.verificationDocMinistryHeader2 || 'وزارة التعليم / منصة تَقْدِير'}</p>
                      <p className="text-[10px] text-slate-500">{defaultSettings.verificationDocPlatformName || 'منصة تَقْدِير الوطنية لتوثيق الشهادات والجوائز التعليمية'}</p>
                    </div>
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center border shadow-xs"
                      style={{
                        backgroundColor: `${defaultSettings.verificationDocPrimaryColor || '#047857'}15`,
                        borderColor: defaultSettings.verificationDocPrimaryColor || '#047857',
                        color: defaultSettings.verificationDocPrimaryColor || '#047857'
                      }}
                    >
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                  </div>
                  <div className="text-center py-1">
                    <h5 className="font-black text-slate-950 text-sm">{defaultSettings.verificationDocTitle || 'إفادة وتحقق إلكتروني رسمي من صحة شهادة تقدير'}</h5>
                    <p className="text-[10px] text-slate-500 font-mono">{defaultSettings.verificationDocSubtitle || 'Official Certificate Verification & Authentication Statement'}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border text-center space-y-1 text-[11px]">
                    <p className="text-slate-700 font-semibold">{defaultSettings.verificationDocDeclaration || 'تشهد منصة تَقْدِير ومطابقة السجلات الرقمية بأن شهادة التقدير...'}</p>
                    <span className="font-black text-indigo-950 text-xs inline-block bg-indigo-50 px-4 py-1 rounded-lg border border-indigo-200">
                      اسم الطالب / الطالبة (مثال تجريبي)
                    </span>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* SUB-TAB 11: ELEMENT LOCKS & SECURITY CONTROLS */}
          {activeSubTab === 'element-locks' && (
            <div className="space-y-6">
              
              {/* Header & Quick Action Banner */}
              <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-amber-950 text-white p-5 rounded-2xl border border-amber-500/30 shadow-sm space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
                      <Lock className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-amber-300">
                        نظام قفل وحماية العناصر الأساسية للشهادة (Element Protection System)
                      </h4>
                      <p className="text-xs text-slate-300 mt-0.5">
                        يمكنك إغلاق تحرير أي حقل لمنع تعديله بالخطأ أثناء إدخال أسماء الطلاب أو توليد الشهادات، مع ظهور علامة قفل 🔒 ذهبية على الحقل بالمحرر.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-xs">
                      {Object.values(systemConfig.lockedElements).filter(Boolean).length} / 13 عناصر مقفلة
                    </span>
                  </div>
                </div>

                {/* Quick Presets for Locking */}
                <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-amber-200/90 font-bold">إجراءات سريعة:</span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleLockAllElements(true)}
                      className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                      <span>قفل جميع العناصر 🔒</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const newLocks: SystemLockedElements = {
                          ...systemConfig.lockedElements,
                          signatures: true,
                          stamp: true,
                          logo: true,
                          schoolName: true,
                          headerLines: true,
                        };
                        const updatedConfig = { ...systemConfig, lockedElements: newLocks };
                        saveSystemConfig(updatedConfig);
                        setSystemConfig(updatedConfig);
                        if (onShowToast) onShowToast('تم قفل عناصر الهوية والاعتمادات الرسمية 🛡️');
                      }}
                      className="px-3 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Shield className="w-3.5 h-3.5 text-indigo-400" />
                      <span>قفل الهوية والتواقيع والأختام ✍️</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleLockAllElements(false)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Unlock className="w-3.5 h-3.5 text-slate-400" />
                      <span>إلغاء قفل كافة العناصر 🔓</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Elements Toggles Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {[
                  {
                    key: 'schoolName' as keyof SystemLockedElements,
                    label: 'اسم المدرسة / المؤسسة',
                    desc: 'قفل اسم المدرسة بالترويسة لمنع التعديل غير المقصود أثناء إدخال الشهادات',
                    icon: Building2,
                    category: 'الهوية الرسمية'
                  },
                  {
                    key: 'headerLines' as keyof SystemLockedElements,
                    label: 'أسطر الترويسة ورؤية 2030',
                    desc: 'قفل أسطر الوزارة والإدارة والعبارات العلوية المعتمدة بالشهادة',
                    icon: TypeIcon,
                    category: 'الهوية الرسمية'
                  },
                  {
                    key: 'title' as keyof SystemLockedElements,
                    label: 'عنوان الشهادة والفرعي',
                    desc: 'قفل عبارة (شهادة شكر وتقدير / تفوق) ونوع التكريم',
                    icon: Award,
                    category: 'نصوص الشهادة'
                  },
                  {
                    key: 'poemOrQuote' as keyof SystemLockedElements,
                    label: 'البيت الشعري / الحكمة',
                    desc: 'قفل البيت الشعري أو المقولة التحفيزية المختارة',
                    icon: BookOpen,
                    category: 'نصوص الشهادة'
                  },
                  {
                    key: 'logo' as keyof SystemLockedElements,
                    label: 'الشعار الرسمي وموضعه',
                    desc: 'قفل شعار الوزارة أو المدرسة وموضعه وأبعاده لمنع حذفه أو تغييره',
                    icon: Layers,
                    category: 'الهوية والتصميم'
                  },
                  {
                    key: 'signatures' as keyof SystemLockedElements,
                    label: 'التوقيعات والاعتمادات',
                    desc: 'قفل أسماء المسؤولين والمعلمين، المسميات الوظيفية وصور التواقيع',
                    icon: PenTool,
                    category: 'الاعتماد والأمان'
                  },
                  {
                    key: 'stamp' as keyof SystemLockedElements,
                    label: 'الختم الرسمي للمؤسسة',
                    desc: 'قفل نوع الختم وموضعه وحجمه وتوقيعه الرقمي',
                    icon: StampIcon,
                    category: 'الاعتماد والأمان'
                  },
                  {
                    key: 'badge' as keyof SystemLockedElements,
                    label: 'الشارة والأوسمة الذهبية',
                    desc: 'قفل شارة التميز والأوسمة وأشكالها وألوانها',
                    icon: Award,
                    category: 'الهوية والتصميم'
                  },
                  {
                    key: 'frame' as keyof SystemLockedElements,
                    label: 'الإطار والزخارف الملكية',
                    desc: 'قفل نمط الإطار وسماكته وهوامش الحدود الخارجية',
                    icon: Layout,
                    category: 'الهوية والتصميم'
                  },
                  {
                    key: 'colors' as keyof SystemLockedElements,
                    label: 'الألوان والخلفيات',
                    desc: 'قفل سمة الألوان والتدرجات والخلفيات المائية',
                    icon: Palette,
                    category: 'الهوية والتصميم'
                  },
                  {
                    key: 'watermark' as keyof SystemLockedElements,
                    label: 'العلامة المائية الأمنية',
                    desc: 'قفل نص العلامة المائية ودرجة شفافيتها',
                    icon: ShieldCheck,
                    category: 'الاعتماد والأمان'
                  },
                  {
                    key: 'verificationBox' as keyof SystemLockedElements,
                    label: 'مربع التوثيق وQR والباركود',
                    desc: 'قفل موضع ونمط مربع التحقق الإلكتروني والأكواد الرقمية',
                    icon: QrCode,
                    category: 'الاعتماد والأمان'
                  },
                  {
                    key: 'aspectRatio' as keyof SystemLockedElements,
                    label: 'مقاس وأبعاد الشهادة',
                    desc: 'قفل نسبة العرض للارتفاع والاتجاه (A4 أفقي / عمودي)',
                    icon: Printer,
                    category: 'الهوية والتصميم'
                  },
                ].map((elem) => {
                  const isLocked = Boolean(systemConfig.lockedElements[elem.key]);
                  const Icon = elem.icon;
                  return (
                    <div
                      key={elem.key}
                      onClick={() => handleToggleLock(elem.key)}
                      className={`p-4 rounded-2xl border transition cursor-pointer select-none flex flex-col justify-between ${
                        isLocked
                          ? 'bg-amber-50/90 border-amber-400 ring-2 ring-amber-400/20 shadow-xs'
                          : 'bg-white hover:bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded-lg ${isLocked ? 'bg-amber-200/80 text-amber-900' : 'bg-slate-100 text-slate-600'}`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <span className="font-extrabold text-xs text-slate-900">{elem.label}</span>
                          </div>

                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black flex items-center gap-1 ${
                            isLocked ? 'bg-amber-500 text-slate-950 shadow-2xs' : 'bg-slate-200 text-slate-600'
                          }`}>
                            {isLocked ? (
                              <>
                                <Lock className="w-3 h-3" />
                                <span>مقفل 🔒</span>
                              </>
                            ) : (
                              <>
                                <Unlock className="w-3 h-3" />
                                <span>متاح للتحرير</span>
                              </>
                            )}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          {elem.desc}
                        </p>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-200/80 flex items-center justify-between text-[10px]">
                        <span className="text-slate-400 font-medium">{elem.category}</span>
                        <span className={`font-bold ${isLocked ? 'text-amber-800' : 'text-slate-500'}`}>
                          {isLocked ? 'انقر للفتح 🔓' : 'انقر للقفل 🔒'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Informational Guidance */}
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-xs text-amber-950">
                <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-extrabold block">كيف يؤثر القفل على المحرر وتوليد الشهادات؟</span>
                  <p className="text-[11px] text-amber-900 leading-relaxed">
                    العناصر المقفلة تظهر في شريط أدوات المحرر مع علامة قفل 🔒 ذهبية وتكون في وضع القراءة فقط لحمايتها من أي تعديل عرضي أو مسح بالخطأ. يمكنك دائماً العودة إلى هنا وإلغاء قفل أي عنصر عند الحاجة.
                  </p>
                </div>
              </div>

            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: AI ASSISTANT & MULTI-PROVIDER API SETTINGS                         */}
      {/* ========================================================================= */}
      {activeTab === 'ai-settings' && (
        <div className="space-y-6">
          
          {/* Action Bar */}
          <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-200 flex flex-wrap items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2 text-indigo-950 text-xs font-bold">
              <Bot className="w-5 h-5 text-indigo-600 shrink-0" />
              <span>تحكم في مزود ونماذج الذكاء الاصطناعي (Gemini, OpenAI, Claude, DeepSeek, Groq, Custom API).</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleResetAISettings}
                className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition flex items-center gap-1.5"
                title="استعادة الإعدادات الافتراضية"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>إعادة تعيين</span>
              </button>

              <button
                onClick={handleTestConnection}
                disabled={isTestingAi}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition shadow-xs flex items-center gap-2 disabled:opacity-50"
              >
                <Activity className={`w-4 h-4 ${isTestingAi ? 'animate-spin' : ''}`} />
                <span>{isTestingAi ? 'جاري فحص الاتصال...' : 'فحص اتصال الـ API ⚡'}</span>
              </button>

              <button
                onClick={handleSaveAISettings}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl transition shadow-xs flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>حفظ إعدادات الـ AI</span>
              </button>
            </div>
          </div>

          {aiSaveSuccessMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              تم حفظ إعدادات مساعد الذكاء الاصطناعي والمزود ({aiSettings.provider}) بنجاح!
            </div>
          )}

          {/* AI Connection Test Result Banner */}
          {aiTestResult && (
            <div
              className={`p-4 rounded-2xl border text-xs leading-relaxed flex items-start gap-3 shadow-xs ${
                aiTestResult.success
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-rose-50 border-rose-300 text-rose-900'
              }`}
            >
              <div className="mt-0.5">
                {aiTestResult.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-600" />
                )}
              </div>
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="font-extrabold text-sm">{aiTestResult.message}</span>
                  {aiTestResult.latencyMs && (
                    <span className="px-2.5 py-1 bg-white rounded-full font-mono text-[11px] font-bold border border-emerald-300 text-emerald-800 shadow-2xs">
                      ⏱️ زمن الاستجابة: {aiTestResult.latencyMs}ms | المزود: {aiTestResult.providerUsed} | النموذج: {aiTestResult.modelUsed}
                    </span>
                  )}
                </div>
                {aiTestResult.details && (
                  <p className="text-[11px] font-mono bg-white/70 p-2.5 rounded-lg border border-slate-200 mt-1 select-all">
                    {aiTestResult.details}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* AI Providers Selector Grid */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <label className="block text-xs font-black text-slate-800">اختر مزود خدمة الذكاء الاصطناعي (AI Provider):</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {AI_PROVIDERS.map((p) => {
                const isSelected = aiSettings.provider === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      setAiSettings({
                        ...aiSettings,
                        provider: p.id,
                        model: p.defaultModel,
                        customApiUrl: p.id === 'custom' ? (aiSettings.customApiUrl || p.defaultBaseUrl) : undefined,
                      });
                    }}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition flex flex-col justify-between ${
                      isSelected
                        ? 'bg-indigo-50/90 border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs'
                        : 'bg-slate-50/80 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-black text-xs text-slate-900">{p.name}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-indigo-700">
                          {p.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed mt-1">{p.description}</p>
                    </div>
                    <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px]">
                      <span className="text-slate-500 font-mono">النموذج: {p.defaultModel}</span>
                      {isSelected && <span className="text-indigo-600 font-bold flex items-center gap-0.5"><Check className="w-3 h-3" /> نشط</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Column 1: Model Selection & API Key */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2 text-slate-800">
                  <Cpu className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-extrabold text-sm">نماذج ({currentProviderInfo.name})</h3>
                </div>
                <a
                  href={currentProviderInfo.keyDocsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-indigo-600 hover:underline flex items-center gap-1 font-bold"
                >
                  <span>الحصول على المفتاح</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* Supported Models for Current Provider */}
              <div className="space-y-2.5">
                {currentProviderInfo.models.map((m) => {
                  const isSelected = aiSettings.model === m.id;
                  return (
                    <div
                      key={m.id}
                      onClick={() => setAiSettings({ ...aiSettings, model: m.id })}
                      className={`p-3 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                        isSelected
                          ? 'bg-indigo-50/70 border-indigo-400 ring-2 ring-indigo-500/20 shadow-xs'
                          : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/70'
                      }`}
                    >
                      <div className="mt-1">
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            isSelected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-400'
                          }`}
                        >
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                      </div>
                      <div className="flex-1 space-y-0.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-extrabold text-xs text-slate-900">{m.name}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-indigo-700">
                            {m.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed">{m.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Custom Model Input */}
              <div className="pt-2 border-t">
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم النموذج المعتمد (Model Identifier)</label>
                <input
                  type="text"
                  value={aiSettings.model}
                  onChange={(e) => setAiSettings({ ...aiSettings, model: e.target.value })}
                  className="w-full text-xs font-mono p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder={currentProviderInfo.defaultModel}
                />
              </div>

              {/* Custom Endpoint URL (for custom / ollama / openrouter) */}
              {aiSettings.provider === 'custom' && (
                <div className="pt-2 border-t">
                  <label className="block text-xs font-bold text-slate-700 mb-1">عنوان خادم الذكاء الاصطناعي (Base URL)</label>
                  <input
                    type="text"
                    value={aiSettings.customApiUrl || ''}
                    onChange={(e) => setAiSettings({ ...aiSettings, customApiUrl: e.target.value })}
                    className="w-full text-xs font-mono p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="http://localhost:11434/v1 أو https://openrouter.ai/api/v1"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    يدعم أي سيرفر محلي أو سحابي يدعم بروتوكول OpenAI Chat Completions.
                  </span>
                </div>
              )}

              {/* API Key Section */}
              <div className="pt-3 border-t space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Key className="w-4 h-4 text-amber-600" />
                    مفتاح الـ API المخصص ({currentProviderInfo.name} API Key)
                  </label>
                  <span className="text-[10px] text-slate-500 font-medium">(اختياري)</span>
                </div>

                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={aiSettings.apiKey || ''}
                    onChange={(e) => setAiSettings({ ...aiSettings, apiKey: e.target.value })}
                    className="w-full text-xs font-mono p-2.5 pl-10 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder={currentProviderInfo.keyPlaceholder}
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition"
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 leading-relaxed">
                  {aiSettings.apiKey && aiSettings.apiKey.trim().length > 0 ? (
                    <span className="text-indigo-700 font-bold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> يتم استخدام مفتاح الـ API المخصص المُدخل أعلاه.
                    </span>
                  ) : (
                    <span className="text-slate-600">
                      ℹ️ يتم الاعتماد حالياً على مفتاح السيرفر الافتراضي المسجل في متغيرات البيئة.
                    </span>
                  )}
                </div>
              </div>

            </div>

            {/* Column 2: Tone, Creativity, System Instructions & Fallback */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-slate-800 border-b pb-3">
                <Sliders className="w-5 h-5 text-indigo-600" />
                <h3 className="font-extrabold text-sm">أسلوب الصياغة ودرجة البلاغة والإبداع</h3>
              </div>

              {/* Tone Selection */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">النبرة والأسلوب البلاغي الافتراضي</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(['رسمي وفخم', 'حماسي ومحفز', 'شاعري وبليغ', 'لطيف للأطفال', 'مسجوع وأدبي', 'موجز ومباشر', 'قرآني وإسلامي', 'أكاديمي رسمي'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setAiSettings({ ...aiSettings, tone: t as AITone })}
                      className={`p-2 rounded-xl text-xs font-bold transition border text-center ${
                        aiSettings.tone === t
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Temperature / Creativity Slider */}
              <div className="space-y-1.5 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">درجة التنوع البلاغي والإبداع (Temperature)</label>
                  <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-200">
                    {aiSettings.temperature}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.1"
                  value={aiSettings.temperature}
                  onChange={(e) => setAiSettings({ ...aiSettings, temperature: parseFloat(e.target.value) })}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
                  <span>0.1 (دقيق ومنضبط)</span>
                  <span>0.7 (متوازن وبليغ)</span>
                  <span>1.0 (إبداع مرتفع)</span>
                </div>
              </div>

              {/* Custom System Instruction */}
              <div className="space-y-1.5 pt-2 border-t">
                <label className="block text-xs font-bold text-slate-700">
                  توجيهات مخصصة ثابتة لمساعد الذكاء الاصطناعي (System Prompt)
                </label>
                <textarea
                  rows={3}
                  value={aiSettings.systemInstruction || ''}
                  onChange={(e) => setAiSettings({ ...aiSettings, systemInstruction: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none leading-relaxed"
                  placeholder="مثال: تضمين عبارة رؤية 2030 دائماً، أو مراعاة مصطلحات المرحلة الابتدائية والتحفيز الإيجابي..."
                />
              </div>

              {/* Smart Local Fallback & Gender Adaptation */}
              <div className="space-y-2 pt-2 border-t">
                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-amber-950 block">المولد الذكي اللغوي البديل (Smart Fallback)</span>
                      <span className="text-[11px] text-amber-800 block">التبديل التلقائي لمولد العبارات الفصيحة محلياً إذا كان الـ API غير متاح</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={aiSettings.autoLocalFallback}
                      onChange={(e) => setAiSettings({ ...aiSettings, autoLocalFallback: e.target.checked })}
                      className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
                    />
                  </div>
                </div>

                <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-indigo-950 block">التكيف التلقائي للمذكر والمؤنث بالذكاء الاصطناعي</span>
                      <span className="text-[11px] text-indigo-800 block">تحويل الضمائر والأفعال والصفات حسب جنس الطالب المختار</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={aiSettings.autoGenderAdaptation}
                      onChange={(e) => setAiSettings({ ...aiSettings, autoGenderAdaptation: e.target.checked })}
                      className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                    />
                  </div>
                </div>
              </div>

            </div>

          </div>

          {/* Server Deployment Guide (Accordion) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <button
              onClick={() => setShowDeployGuide(!showDeployGuide)}
              className="w-full p-4 text-right bg-slate-900 text-white font-extrabold text-xs flex items-center justify-between hover:bg-slate-800 transition"
            >
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-amber-400" />
                <span>دليل تشغيل ورفع النظام على سيرفر خارجي (VPS, Docker, Cloud Run, Vercel) لجميع المزودين</span>
              </div>
              <span className="text-amber-400 font-mono text-sm">{showDeployGuide ? '▲ إخفاء' : '▼ عرض الدليل'}</span>
            </button>

            {showDeployGuide && (
              <div className="p-5 space-y-4 text-xs text-slate-700 bg-slate-50 leading-relaxed border-t border-slate-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2">
                    <h4 className="font-extrabold text-slate-900 flex items-center gap-1.5 text-xs">
                      <Code2 className="w-4 h-4 text-indigo-600" />
                      1. إعداد متغيرات البيئة في السيرفر (.env):
                    </h4>
                    <p className="text-[11px] text-slate-600">
                      أضف مفاتيح المزودين في ملف <code className="bg-slate-100 text-indigo-800 px-1 py-0.5 rounded font-mono">.env</code>:
                    </p>
                    <div className="bg-slate-900 text-amber-300 p-2.5 rounded-lg font-mono text-[11px] select-all dir-ltr text-left">
                      GEMINI_API_KEY=AIzaSy...<br />
                      OPENAI_API_KEY=sk-...<br />
                      ANTHROPIC_API_KEY=sk-ant-...<br />
                      PORT=3000
                    </div>
                  </div>

                  <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2">
                    <h4 className="font-extrabold text-slate-900 flex items-center gap-1.5 text-xs">
                      <Zap className="w-4 h-4 text-amber-600" />
                      2. التشغيل عبر حاويات Docker:
                    </h4>
                    <p className="text-[11px] text-slate-600">
                      يمكنك تمرير المفتاح كمتغير بيئة عند بناء أو تشغيل الحاوية بسهولة:
                    </p>
                    <div className="bg-slate-900 text-emerald-400 p-2.5 rounded-lg font-mono text-[11px] select-all dir-ltr text-left">
                      docker run -d -p 3000:3000 -e GEMINI_API_KEY="AIzaSy..." taqdeer-app
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-1.5 text-amber-950">
                  <h5 className="font-bold text-xs flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-amber-600" />
                    أمان وسرية مفاتيح الـ API:
                  </h5>
                  <p className="text-[11px] text-amber-900 leading-relaxed">
                    كافة اتصالات ومفاتيح الـ API لجميع المزودين تُعالج حصراً على الخادم الخلفي (Server-side API routes) لضمان عدم تسريب المفاتيح للمتصفح إطلاقاً وبأعلى معايير الحماية.
                  </p>
                </div>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: APP SYSTEM, BACKUP & 24/7 SUPPORT                                  */}
      {/* ========================================================================= */}
      {activeTab === 'app-system' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Column 1: System Feature Toggles & Control Center */}
            <div className="space-y-5">
              
              {/* Feature Toggles Card */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-5 h-5 text-amber-600" />
                    <h3 className="font-extrabold text-sm text-slate-800">
                      إعدادات وتفعيل ميزات النظام (System Features)
                    </h3>
                  </div>
                  <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    {Object.values(systemConfig.features).filter(Boolean).length} ميزة مفعلة
                  </span>
                </div>

                <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                  {[
                    {
                      key: 'autoArchive' as keyof SystemFeatureToggles,
                      title: 'الأرشفة التلقائية في المكتبة السحابية (Cloud Library)',
                      desc: 'حفظ وتصنيف الشهادات المكتملة تلقائياً في الأرشيف السحابي حسب التاريخ والمدرسة',
                      icon: Cloud
                    },
                    {
                      key: 'autoGenderInflection' as keyof SystemFeatureToggles,
                      title: 'محرك التوافق اللغوي والتذكير والتأنيث (طالب / طالبة)',
                      desc: 'تحويل الأفعال والصفات وصيغ التكريم تلقائياً عند التوليد الفردي والجماعي',
                      icon: Sparkles
                    },
                    {
                      key: 'aiFeatures' as keyof SystemFeatureToggles,
                      title: 'مساعد الذكاء الاصطناعي وتوليد النصوص (Gemini / OpenAI)',
                      desc: 'تفعيل زر التوليد الذكي لصياغة نصوص التكريم والثناء البلاغي',
                      icon: Bot
                    },
                    {
                      key: 'qrVerification' as keyof SystemFeatureToggles,
                      title: 'نظام التحقق الرقمي ومربع الـ QR والباركود',
                      desc: 'توليد باركود وQR للتحقق الفوري من صحة ومطابقة الشهادات إلكترونياً',
                      icon: QrCode
                    },
                    {
                      key: 'crispVectorPdf' as keyof SystemFeatureToggles,
                      title: 'تصدير الطباعة فائق الدقة (Crisp Vector PDF)',
                      desc: 'ضمان نقاء الخطوط والزخارف ودقة الطباعة حتى مقاسات البوسترات الكبيرة',
                      icon: Printer
                    },
                    {
                      key: 'batchReviewModal' as keyof SystemFeatureToggles,
                      title: 'نافذة المراجعة والتحقق من الطلاب قبل التوليد الجماعي',
                      desc: 'عرض جدول الأسماء ومطابقة الصيغ قبل إنشاء وطباعة الدفعة',
                      icon: FileCheck2
                    },
                    {
                      key: 'autoSaveDrafts' as keyof SystemFeatureToggles,
                      title: 'الحفظ التلقائي للمسودات واستعادة العمل',
                      desc: 'حفظ التعديلات لحظة بلحظة لمنع فقدان البيانات عند إغلاق المتصفح',
                      icon: Save
                    },
                    {
                      key: 'watermark' as keyof SystemFeatureToggles,
                      title: 'العلامة المائية الأمنية لمنع التزوير',
                      desc: 'إظهار نص أمني شبه شفاف بخلفية الشهادة',
                      icon: ShieldCheck
                    },
                    {
                      key: 'soundEffects' as keyof SystemFeatureToggles,
                      title: 'المؤثرات الصوتية والتفاعلية',
                      desc: 'تشغيل نغمات تأكيدية خفيفة عند الحفظ، التصدير، وإنجاز الدفعات',
                      icon: Activity
                    },
                    {
                      key: 'strictQrSecurity' as keyof SystemFeatureToggles,
                      title: 'التشفير الأمني المشدد لبيانات الـ QR',
                      desc: 'تضمين رمز التوثيق المشفر وتاريخ الإصدار لمنع التلاعب',
                      icon: Lock
                    },
                    {
                      key: 'printCropMarks' as keyof SystemFeatureToggles,
                      title: 'علامات القص وهوامش المطابع (Crop Marks)',
                      desc: 'إظهار خطوط إرشادية حول الإطار لتسهيل القص الاحترافي بعد الطباعة',
                      icon: Layout
                    },
                    {
                      key: 'cloudAutoSync' as keyof SystemFeatureToggles,
                      title: 'المزامنة السحابية الفورية مع مساحة التخزين',
                      desc: 'مزامنة القوالب والشهادات مع التخزين السحابي المحلي',
                      icon: Wifi
                    }
                  ].map((feat) => {
                    const isEnabled = Boolean(systemConfig.features[feat.key]);
                    const Icon = feat.icon;
                    return (
                      <div
                        key={feat.key}
                        onClick={() => handleToggleFeature(feat.key)}
                        className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                          isEnabled
                            ? 'bg-amber-50/70 border-amber-300'
                            : 'bg-slate-50 border-slate-200 opacity-75'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <div className={`p-1.5 rounded-lg mt-0.5 shrink-0 ${isEnabled ? 'bg-amber-200/80 text-amber-900' : 'bg-slate-200 text-slate-500'}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <h5 className="font-bold text-xs text-slate-900">{feat.title}</h5>
                            <p className="text-[11px] text-slate-600 mt-0.5">{feat.desc}</p>
                          </div>
                        </div>

                        <div className="shrink-0">
                          <button
                            type="button"
                            className={`w-10 h-6 flex items-center rounded-full p-1 transition duration-300 ${
                              isEnabled ? 'bg-amber-500 justify-end' : 'bg-slate-300 justify-start'
                            }`}
                          >
                            <div className="w-4 h-4 rounded-full bg-white shadow-md transform transition" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Element Locks Status Quick Card */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b pb-3">
                  <div className="flex items-center gap-2">
                    <Lock className="w-5 h-5 text-amber-600" />
                    <h3 className="font-extrabold text-sm text-slate-800">
                      حالة قفل العناصر الأساسية بالمحرر
                    </h3>
                  </div>
                  <button
                    onClick={() => {
                      setActiveTab('default-cert');
                      setActiveSubTab('element-locks');
                    }}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                  >
                    <span>إدارة الأقفال</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(systemConfig.lockedElements).map(([key, isLocked]) => {
                    const labelsMap: Record<string, string> = {
                      schoolName: 'اسم المدرسة',
                      headerLines: 'الترويسة',
                      logo: 'الشعار',
                      signatures: 'التوقيعات',
                      stamp: 'الختم',
                      badge: 'الشارة',
                      frame: 'الإطار',
                      watermark: 'العلامة المائية',
                      verificationBox: 'مربع التوثيق',
                      colors: 'الألوان',
                      poemOrQuote: 'البيت الشعري',
                      aspectRatio: 'المقاس والاتجاه',
                      title: 'العنوان',
                    };
                    return (
                      <button
                        key={key}
                        onClick={() => handleToggleLock(key as keyof SystemLockedElements)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 border ${
                          isLocked
                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {isLocked ? <Lock className="w-3 h-3 text-amber-700" /> : <Unlock className="w-3 h-3 text-slate-400" />}
                        <span>{labelsMap[key] || key}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Google Cloud Account Unified Sync Card */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white p-5 rounded-2xl border border-amber-500/30 shadow-lg space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Cloud className="w-5 h-5 text-amber-400" />
                    <h3 className="font-extrabold text-sm text-white">
                      مزامنة الحساب السحابي الموحد (Google & Firestore)
                    </h3>
                  </div>
                  <span className="text-[11px] text-amber-300 font-bold bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                    مزامنة شاملة ☁️
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  حفظ وتخزين جميع إعدادات النظام، التوقيعات، الأختام، مكتبة الشهادات، والمسودات على السحابة وربطها بحساب Google الرسمي لفتحها بنفس الإعدادات من أي جهاز كمبيوتر أو جوال آخر:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={async () => {
                      try {
                        let token = await getAccessToken();
                        let user = getCurrentUser();
                        if (!token || !user) {
                          if (onShowToast) onShowToast('جاري تسجيل الدخول بحساب Google...');
                          const res = await googleSignIn();
                          user = res.user;
                        }
                        if (user) {
                          if (onShowToast) onShowToast('جاري مزامنة وحفظ جميع بيانات النظام على السحابة...');
                          const syncRes = await syncFullAccountToCloud(user);
                          if (onShowToast) onShowToast(`تمت المزامنة بنجاح! تم حفظ ${syncRes.certsCount} شهادة و ${syncRes.draftsCount} مسودة وجميع إعداداتك ☁️✅`);
                        }
                      } catch (err: any) {
                        if (err?.code === 'auth/popup-closed-by-user' || err?.isUserCancel || err?.message?.includes('إلغاء')) {
                          if (onShowToast) onShowToast('تم إلغاء عملية تسجيل الدخول.');
                          return;
                        }
                        console.error('Sync error:', err);
                        if (onShowToast) onShowToast(err.message || 'فشلت المزامنة السحابية');
                      }
                    }}
                    className="p-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-md cursor-pointer"
                  >
                    <Cloud className="w-4 h-4 text-slate-950" />
                    <span>مزامنة وحفظ الإعدادات بالسحابة</span>
                  </button>

                  <button
                    onClick={async () => {
                      try {
                        let token = await getAccessToken();
                        let user = getCurrentUser();
                        if (!token || !user) {
                          if (onShowToast) onShowToast('جاري تسجيل الدخول بحساب Google...');
                          const res = await googleSignIn();
                          user = res.user;
                        }
                        if (user) {
                          if (onShowToast) onShowToast('جاري جلب إعداداتك وبياناتك السحابية...');
                          const restoreRes = await restoreAccountFromCloud(user.uid, user.email || '');
                          setDefaultSettings(getSavedDefaultSettings());
                          setSystemConfig(getSavedSystemConfig());
                          setAiSettings(getSavedAISettings());
                          if (onShowToast) onShowToast(`تمت استعادة الإعدادات بنجاح (${restoreRes.certsCount} شهادة، ${restoreRes.draftsCount} مسودة) 📥`);
                        }
                      } catch (err: any) {
                        if (err?.code === 'auth/popup-closed-by-user' || err?.isUserCancel || err?.message?.includes('إلغاء')) {
                          if (onShowToast) onShowToast('تم إلغاء عملية تسجيل الدخول.');
                          return;
                        }
                        console.error('Restore error:', err);
                        if (onShowToast) onShowToast(err.message || 'فشلت استعادة البيانات السحابية');
                      }
                    }}
                    className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-xs cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4 text-sky-400" />
                    <span>جلب واستعادة البيانات من السحابة</span>
                  </button>
                </div>
              </div>

              {/* Backup & Restore Card */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                    <Database className="w-4 h-4 text-indigo-600" />
                    النسخ الاحتياطي ونقل الإعدادات
                  </h3>
                  <span className="text-[11px] text-indigo-700 font-bold bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                    ملف JSON
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  تصدير نسخة كاملة من إعدادات مدرستك وتواقيعك ونماذجك لنقلها لجهاز آخر أو استعادتها لاحقاً:
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleExportBackup}
                    className="p-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition shadow-xs"
                  >
                    <Download className="w-4 h-4 text-amber-400" />
                    <span>تصدير نسخة احتياطية</span>
                  </button>

                  <label className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition border border-slate-300 cursor-pointer shadow-xs">
                    <Upload className="w-4 h-4 text-indigo-600" />
                    <span>استيراد ملف إعدادات</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportBackup}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="pt-3 border-t flex items-center justify-between">
                  <span className="text-xs text-slate-600">تنظيف الذاكرة المؤقتة (Cache) مع الحفاظ على البيانات:</span>
                  <button
                    onClick={handleClearCache}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>تنظيف الذاكرة</span>
                  </button>
                </div>
              </div>

              {/* Cloud Drive Verification Requests Center */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <div className="flex items-center gap-2">
                    <Cloud className="w-5 h-5 text-amber-600" />
                    <h3 className="font-extrabold text-sm text-slate-800">
                      طلبات التوثيق على Google Drive السحابية ({driveRequests.length})
                    </h3>
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                    {driveRequests.filter(r => r.status === 'pending').length} معلّق
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  قائمة الطلبات الواردة من الطلاب أو أولياء الأمور أو الجهات لحفظ وتوثيق شهاداتهم على Google Drive:
                </p>

                {driveRequests.length === 0 ? (
                  <div className="p-6 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-500 space-y-1">
                    <Cloud className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="font-bold">لا توجد طلبات توثيق سحابية جديدة حالياً</p>
                    <p className="text-[11px]">أي طلب يتم إرساله من نافذة فحص الشهادات سيظهر هنا مباشرة للمراجعة والاعتماد.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                    {driveRequests.map((req) => (
                      <div
                        key={req.id}
                        className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <strong className="text-slate-900 block text-xs">{req.studentName}</strong>
                            <span className="text-[10px] text-slate-500 font-mono">كود الشهادة: {req.verificationCode}</span>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                              req.status === 'approved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : req.status === 'rejected'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {req.status === 'approved' ? 'تمت الموافقة ✅' : req.status === 'rejected' ? 'مرفوض ❌' : 'قيد الانتظار ⏳'}
                          </span>
                        </div>

                        <div className="bg-white p-2 rounded-lg border border-slate-200 text-[11px] text-slate-700 space-y-1">
                          <div><span className="text-slate-500">مقدم الطلب:</span> <strong>{req.requesterName || 'زائر / ولي أمر'}</strong> {req.requesterContact && `(${req.requesterContact})`}</div>
                          {req.requesterNotes && <div><span className="text-slate-500">ملاحظات:</span> <em>"{req.requesterNotes}"</em></div>}
                          <div className="text-[10px] text-slate-400 font-mono">تاريخ الطلب: {new Date(req.requestedAt).toLocaleString('ar-SA')}</div>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <div className="flex items-center gap-1.5">
                            {req.status !== 'approved' && (
                              <button
                                onClick={() => handleUpdateReqStatus(req.id, 'approved')}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-[10px] cursor-pointer"
                              >
                                موافقة واعتماد
                              </button>
                            )}
                            {req.status !== 'rejected' && (
                              <button
                                onClick={() => handleUpdateReqStatus(req.id, 'rejected')}
                                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-[10px] cursor-pointer"
                              >
                                رفض
                              </button>
                            )}
                          </div>
                          <button
                            onClick={() => handleDeleteReq(req.id)}
                            className="text-[10px] text-slate-400 hover:text-rose-600 font-bold cursor-pointer"
                          >
                            حذف الطلب
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* Column 2: 24/7 Support & FAQ */}
            <div className="space-y-5">
              
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                    <Headset className="w-4 h-4 text-amber-600" />
                    الدعم الفني والتعليمات (24/7)
                  </h3>
                  <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    متاح دائماً
                  </span>
                </div>

                <div className="space-y-2.5">
                  <span className="text-xs font-bold text-slate-700 block">الأسئلة الشائعة والإرشادات:</span>
                  {faqs.map((f, idx) => (
                    <div
                      key={idx}
                      className="border border-slate-200 rounded-xl overflow-hidden transition"
                    >
                      <button
                        onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                        className="w-full text-right p-3 text-xs font-bold text-slate-800 bg-slate-50 hover:bg-slate-100 flex items-center justify-between gap-2"
                      >
                        <span>{f.q}</span>
                        <ChevronDown className={`w-4 h-4 text-amber-600 transition-transform ${activeFaq === idx ? 'rotate-180' : ''}`} />
                      </button>
                      {activeFaq === idx && (
                        <div className="p-3.5 text-xs text-slate-600 bg-white border-t border-slate-100 leading-relaxed">
                          {f.a}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Training Videos and Docs */}
                <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1.5 text-amber-950">
                  <h4 className="text-xs font-bold flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-amber-700" />
                    الدليل الإرشادي والتطوير المهني
                  </h4>
                  <p className="text-[11px] text-amber-900 leading-relaxed">
                    تعلم أسرار الصياغة البلاغية المؤثرة والتصميم الجرافيكي عالي الدقة لشهادات التكريم عبر الإرشادات والنماذج المعتمدة.
                  </p>
                </div>

                {/* Contact Support */}
                <div className="p-4 bg-slate-900 text-white rounded-2xl flex items-center justify-between gap-3 shadow-md">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold block text-amber-300">فريق الدعم الفني والتربوي المباشر</span>
                    <span className="text-[11px] text-slate-400 block">نسعد بجميع استفساراتكم واقتراحاتكم لتطوير التطبيق</span>
                  </div>
                  <button
                    onClick={() => alert('تم توجيه طلبك لفريق الدعم المباشر، سنتواصل معك فوراً!')}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl transition shrink-0"
                  >
                    تواصل مع الدعم
                  </button>
                </div>

              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
};
