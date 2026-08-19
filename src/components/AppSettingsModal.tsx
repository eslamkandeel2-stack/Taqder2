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
  Code2
} from 'lucide-react';
import { CertificateData } from '../types';
import {
  DefaultCertificateSettings,
  getSavedDefaultSettings,
  saveDefaultSettingsToStorage,
  FALLBACK_DEFAULT_SETTINGS,
  applyDefaultsToCertificate,
  getFormattedTodayDate
} from '../utils/defaultSettings';
import {
  AISettings,
  SUPPORTED_AI_MODELS,
  DEFAULT_AI_SETTINGS,
  getSavedAISettings,
  saveAISettings,
  resetAISettings,
  testAIConnection
} from '../utils/aiConfig';

interface Props {
  currentCertificate?: CertificateData;
  onUpdateCurrentCertificate?: (cert: CertificateData) => void;
  onShowToast?: (msg: string) => void;
}

export const AppSettingsModal: React.FC<Props> = ({
  currentCertificate,
  onUpdateCurrentCertificate,
  onShowToast
}) => {
  const [activeTab, setActiveTab] = useState<'default-cert' | 'ai-settings' | 'app-system'>('default-cert');
  const [defaultSettings, setDefaultSettings] = useState<DefaultCertificateSettings>(getSavedDefaultSettings());
  const [aiSettings, setAiSettings] = useState<AISettings>(getSavedAISettings());
  const [showApiKey, setShowApiKey] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);
  const [aiSaveSuccessMsg, setAiSaveSuccessMsg] = useState(false);

  // AI Connection Test state
  const [isTestingAi, setIsTestingAi] = useState(false);
  const [aiTestResult, setAiTestResult] = useState<{
    tested: boolean;
    success: boolean;
    message: string;
    latencyMs?: number;
    modelUsed?: string;
    details?: string;
  } | null>(null);

  // External deployment guide expanded accordion state
  const [showDeployGuide, setShowDeployGuide] = useState(false);

  // App System settings state
  const [offlineMode, setOfflineMode] = useState(false);
  const [autoSync, setAutoSync] = useState(true);
  const [highQualityPdf, setHighQualityPdf] = useState(true);
  const [activeFaq, setActiveFaq] = useState<number | null>(0);

  useEffect(() => {
    setDefaultSettings(getSavedDefaultSettings());
    setAiSettings(getSavedAISettings());
  }, []);

  const handleSaveDefaults = () => {
    saveDefaultSettingsToStorage(defaultSettings);
    setSaveSuccessMsg(true);
    if (onShowToast) {
      onShowToast('تم حفظ الإعدادات الافتراضية للشهادات بنجاح! 💾');
    }
    setTimeout(() => setSaveSuccessMsg(false), 3000);
  };

  const handleSaveAISettings = () => {
    saveAISettings(aiSettings);
    setAiSaveSuccessMsg(true);
    if (onShowToast) {
      onShowToast('تم حفظ إعدادات مساعد الذكاء الاصطناعي والـ API بنجاح! 🤖✨');
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
        details: res.details,
      });
      if (onShowToast) {
        onShowToast(res.success ? 'تم الاتصال بنموذج الذكاء الاصطناعي بنجاح! 🟢' : 'فشل الاتصال: يرجى التحقق من المفتاح أو النموذج 🔴');
      }
    } catch (err: any) {
      setAiTestResult({
        tested: true,
        success: false,
        message: 'تعذر الاتصال بالخادم',
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
      onShowToast('تم تطبيق الإعدادات الافتراضية على الشهادة الحالية بنجاح! ✨');
    }
  };

  const handleResetToFactory = () => {
    if (window.confirm('هل أنت متأكد من إعادة تعيين الإعدادات الافتراضية للقيم الأولية؟')) {
      setDefaultSettings(FALLBACK_DEFAULT_SETTINGS);
      saveDefaultSettingsToStorage(FALLBACK_DEFAULT_SETTINGS);
      if (onShowToast) {
        onShowToast('تم إعادة تعيين الإعدادات الافتراضية للقيم المصنع الأولية');
      }
    }
  };

  const faqs = [
    {
      q: 'كيف تعمل الإعدادات الافتراضية للشهادات؟',
      a: 'تتيح لك الإعدادات الافتراضية تسجيل اسم مدرستك/جهتك وتوقيع المدير والمشرف والتاريخ التلقائي. عند فتح التطبيق أو إنشاء شهادات جديدة أو دفعة طلاب، يتم تطبيق بياناتك الرسمية تلقائياً دون الحاجة لإعادتها كل مرة.'
    },
    {
      q: 'كيف أضمن عمل الذكاء الاصطناعي عند رفع التطبيق على سيرفر خارجي؟',
      a: 'يمكنك وضع متغير GEMINI_API_KEY في ملف .env في السيرفر أو داخل إعدادات البيئة في الاستضافة (Vercel, Render, Cloud Run, Docker). كما يمكنك إدخال مفتاح الـ API الخاص بك مباشرة من تبويب "مساعد الذكاء الاصطناعي" هنا ليتم استخدامه في جميع العمليات.'
    },
    {
      q: 'ماذا يحدث إذا انقطع الإنترنت أو نفدت حصة الـ API؟',
      a: 'يحتوي نظام "تقدير" على مولد ذكي لغوي محلي فائق الفصاحة (Smart Local Fallback) يقوم بتوليد 3 خيارات بلاغية متنوعة فوراً حتى بدون اتصال بالإنترنت أو بدون مفتاح API.'
    },
    {
      q: 'كيف أقوم بجعل تاريخ توليد الشهادة تلقائياً حسب يوم الإصدار؟',
      a: 'تأكد من تفعيل خيار "تحديث تاريخ الإصدار تلقائياً لتاريخ اليوم" في قسم الإعدادات الافتراضية، وسيقوم النظام فوراً بحساب التاريخ التاريخي والمهجري/الميلادي ليوم الإصدار تلقائياً عند توليد أو طباعة أي شهادة.'
    },
    {
      q: 'كيف يمكنني تصدير الشهادات بصيغة PDF عالية الدقة دون تشوه الجودة؟',
      a: 'تطبيق تقدير يقدم نظام تصدير مباشر بالمتجهات مع مقاسات A4 القياسية الطباعية، انقر على زر "تصدير PDF" وسيتم تجهيز ملف جاهز للطباعة المباشرة بأعلى جودة.'
    },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 text-right">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 text-white p-6 rounded-2xl shadow-lg border border-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Settings className="w-6 h-6 text-amber-400" />
            <h2 className="text-xl font-black">إعدادات النظام والذكاء الاصطناعي</h2>
          </div>
          <p className="text-xs text-amber-200/80 mt-1">
            تحكم في بيانات مدرستك، ونماذج ومفاتيح الذكاء الاصطناعي (Gemini AI)، وإعدادات النشر على السيرفر الخارجي.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-300 px-3.5 py-1.5 rounded-full text-xs font-bold">
          <ShieldCheck className="w-4 h-4" /> النسخة المعتمدة والمحدثة 2026
        </div>
      </div>

      {/* Main Tab Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 bg-slate-200 p-1.5 rounded-2xl border border-slate-300">
        <button
          onClick={() => setActiveTab('default-cert')}
          className={`py-2.5 px-3 rounded-xl font-extrabold text-xs transition flex items-center justify-center gap-2 ${
            activeTab === 'default-cert'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-700 hover:bg-slate-300/60'
          }`}
        >
          <Building2 className="w-4 h-4 shrink-0" />
          <span>بيانات الشهادات الافتراضية</span>
        </button>

        <button
          onClick={() => setActiveTab('ai-settings')}
          className={`py-2.5 px-3 rounded-xl font-extrabold text-xs transition flex items-center justify-center gap-2 ${
            activeTab === 'ai-settings'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-700 hover:bg-slate-300/60'
          }`}
        >
          <Bot className="w-4 h-4 shrink-0 text-amber-300" />
          <span>مساعد الذكاء الاصطناعي والـ API</span>
        </button>

        <button
          onClick={() => setActiveTab('app-system')}
          className={`py-2.5 px-3 rounded-xl font-extrabold text-xs transition flex items-center justify-center gap-2 ${
            activeTab === 'app-system'
              ? 'bg-slate-900 text-white shadow-md'
              : 'text-slate-700 hover:bg-slate-300/60'
          }`}
        >
          <Wifi className="w-4 h-4 shrink-0" />
          <span>المزامنة والدعم الفني</span>
        </button>
      </div>

      {/* TAB 1: DEFAULT CERTIFICATE SETTINGS */}
      {activeTab === 'default-cert' && (
        <div className="space-y-6">
          
          {/* Action Bar */}
          <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 flex flex-wrap items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2 text-amber-900 text-xs font-bold">
              <Sparkles className="w-5 h-5 text-amber-600" />
              <span>هذه البيانات ستُطبق تلقائياً على أي شهادة جديدة أو دفعة شهادات تقوم بتوليدها.</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleResetToFactory}
                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition flex items-center gap-1"
                title="إعادة التعيين للقيم المصنعية"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>إعادة ضبط المصنع</span>
              </button>

              {currentCertificate && onUpdateCurrentCertificate && (
                <button
                  onClick={handleApplyDefaultsToEditor}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition shadow-xs flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>تطبيق على الشهادة الحالية</span>
                </button>
              )}

              <button
                onClick={handleSaveDefaults}
                className="px-5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl transition shadow-xs flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>حفظ التغييرات الافتراضية</span>
              </button>
            </div>
          </div>

          {saveSuccessMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              تم حفظ وتحديث الإعدادات الافتراضية بنجاح. ستُستخدم تلقائياً في كل الشهادات اللاحقة!
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card 1: Institution & Header Info */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-slate-800 border-b pb-3">
                <Building2 className="w-5 h-5 text-amber-600" />
                <h3 className="font-extrabold text-sm">بيانات المدرسة والترويسة الافتراضية</h3>
              </div>

              <div className="space-y-3">
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
                  <input
                    type="text"
                    value={defaultSettings.headerLine1}
                    onChange={(e) => setDefaultSettings({ ...defaultSettings, headerLine1: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 outline-none"
                    placeholder="مثال: المملكة العربية السعودية"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">السطر الثاني في الترويسة</label>
                  <input
                    type="text"
                    value={defaultSettings.headerLine2}
                    onChange={(e) => setDefaultSettings({ ...defaultSettings, headerLine2: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 outline-none"
                    placeholder="مثال: وزارة التعليم / الجهة المعتمدة"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">مكان الإصدار الافتراضي</label>
                  <input
                    type="text"
                    value={defaultSettings.issuePlace}
                    onChange={(e) => setDefaultSettings({ ...defaultSettings, issuePlace: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 outline-none"
                    placeholder="مثال: الرياض، المملكة العربية السعودية"
                  />
                </div>

                <div className="pt-2 border-t flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">تحديث تاريخ الإصدار تلقائياً</span>
                    <span className="text-[11px] text-slate-500 block">توليد تاريخ اليوم الحالي تلقائياً عند إنشاء أي شهادة</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={defaultSettings.autoUpdateDateToToday}
                    onChange={(e) => setDefaultSettings({ ...defaultSettings, autoUpdateDateToToday: e.target.checked })}
                    className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Card 2: Signatures & Seal */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-slate-800 border-b pb-3">
                <PenTool className="w-5 h-5 text-amber-600" />
                <h3 className="font-extrabold text-sm">التوقيعات والختم الرسمي الافتراضي</h3>
              </div>

              <div className="space-y-4">
                {/* Signature 1 */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <span className="text-xs font-bold text-slate-800 block">التوقيع الأول (معلم المادة / المشرف)</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-0.5">الصفة / المنصب</label>
                      <input
                        type="text"
                        value={defaultSettings.signature1Title}
                        onChange={(e) => setDefaultSettings({ ...defaultSettings, signature1Title: e.target.value })}
                        className="w-full text-xs p-2 rounded-lg border border-slate-300 outline-none"
                        placeholder="معلم المادة"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-0.5">الاسم المعتمد</label>
                      <input
                        type="text"
                        value={defaultSettings.signature1Name}
                        onChange={(e) => setDefaultSettings({ ...defaultSettings, signature1Name: e.target.value })}
                        className="w-full text-xs p-2 rounded-lg border border-slate-300 outline-none"
                        placeholder="أ. عبد الرحمن السعيد"
                      />
                    </div>
                  </div>
                </div>

                {/* Signature 2 */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <span className="text-xs font-bold text-slate-800 block">التوقيع الثاني (مدير المدرسة / الرئيس)</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-0.5">الصفة / المنصب</label>
                      <input
                        type="text"
                        value={defaultSettings.signature2Title}
                        onChange={(e) => setDefaultSettings({ ...defaultSettings, signature2Title: e.target.value })}
                        className="w-full text-xs p-2 rounded-lg border border-slate-300 outline-none"
                        placeholder="مدير المدرسة"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-0.5">الاسم المعتمد</label>
                      <input
                        type="text"
                        value={defaultSettings.signature2Name}
                        onChange={(e) => setDefaultSettings({ ...defaultSettings, signature2Name: e.target.value })}
                        className="w-full text-xs p-2 rounded-lg border border-slate-300 outline-none"
                        placeholder="د. خالد العصيمي"
                      />
                    </div>
                  </div>
                </div>

                {/* Stamp */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <span className="text-xs font-bold text-slate-800 block flex items-center gap-1.5">
                    <StampIcon className="w-3.5 h-3.5 text-amber-600" />
                    الختم الرسمي الافتراضي
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-0.5">نص الختم الرئيسي</label>
                      <input
                        type="text"
                        value={defaultSettings.stampTitle}
                        onChange={(e) => setDefaultSettings({ ...defaultSettings, stampTitle: e.target.value })}
                        className="w-full text-xs p-2 rounded-lg border border-slate-300 outline-none"
                        placeholder="الختم الرسمي"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-0.5">النص الفرعي للختم</label>
                      <input
                        type="text"
                        value={defaultSettings.stampSubtext}
                        onChange={(e) => setDefaultSettings({ ...defaultSettings, stampSubtext: e.target.value })}
                        className="w-full text-xs p-2 rounded-lg border border-slate-300 outline-none"
                        placeholder="معتمد رسمياً"
                      />
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: AI ASSISTANT & API SETTINGS */}
      {activeTab === 'ai-settings' && (
        <div className="space-y-6">
          
          {/* Action Bar */}
          <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-200 flex flex-wrap items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2 text-indigo-950 text-xs font-bold">
              <Bot className="w-5 h-5 text-indigo-600 shrink-0" />
              <span>تحكم كامل في محرك الذكاء الاصطناعي (Gemini AI)، اختيار النماذج، المفاتيح، وضمان عمل الـ API على السيرفر الخارجي.</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleResetAISettings}
                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition flex items-center gap-1"
                title="استعادة الإعدادات الافتراضية"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>إعادة تعيين</span>
              </button>

              <button
                onClick={handleTestConnection}
                disabled={isTestingAi}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition shadow-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                <Activity className={`w-3.5 h-3.5 ${isTestingAi ? 'animate-spin' : ''}`} />
                <span>{isTestingAi ? 'جاري فحص الاتصال...' : 'فحص اتصال الـ API ⚡'}</span>
              </button>

              <button
                onClick={handleSaveAISettings}
                className="px-5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl transition shadow-xs flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>حفظ إعدادات الـ AI</span>
              </button>
            </div>
          </div>

          {aiSaveSuccessMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              تم حفظ إعدادات مساعد الذكاء الاصطناعي بنجاح! سيتم تطبيقها فوراً في كافة عمليات التوليد والتحسين.
            </div>
          )}

          {/* AI Connection Test Result Banner */}
          {aiTestResult && (
            <div
              className={`p-4 rounded-2xl border text-xs leading-relaxed flex items-start gap-3 ${
                aiTestResult.success
                  ? 'bg-emerald-50/90 border-emerald-300 text-emerald-900'
                  : 'bg-rose-50/90 border-rose-300 text-rose-900'
              }`}
            >
              <div className="mt-0.5">
                {aiTestResult.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-600" />
                )}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="font-extrabold text-sm">{aiTestResult.message}</span>
                  {aiTestResult.latencyMs && (
                    <span className="px-2 py-0.5 bg-white/80 rounded-full font-mono text-[11px] font-bold border">
                      ⏱️ زمن الاستجابة: {aiTestResult.latencyMs}ms | النموذج: {aiTestResult.modelUsed}
                    </span>
                  )}
                </div>
                {aiTestResult.details && (
                  <p className="text-[11px] opacity-80 font-mono bg-white/50 p-2 rounded-lg mt-1 border">
                    {aiTestResult.details}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Column 1: Model Selection & API Key */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2 text-slate-800">
                  <Cpu className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-extrabold text-sm">اختيار نموذج الذكاء الاصطناعي (Model)</h3>
                </div>
                <span className="text-[11px] bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full font-bold border border-indigo-200">
                  Google Gemini SDK
                </span>
              </div>

              {/* Supported Models Radio Grid */}
              <div className="space-y-2.5">
                {SUPPORTED_AI_MODELS.map((m) => {
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
                <label className="block text-xs font-bold text-slate-700 mb-1">أو اسم نموذج مخصص (Custom Model)</label>
                <input
                  type="text"
                  value={aiSettings.model}
                  onChange={(e) => setAiSettings({ ...aiSettings, model: e.target.value })}
                  className="w-full text-xs font-mono p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="gemini-3.7-flash"
                />
              </div>

              {/* API Key Section */}
              <div className="pt-3 border-t space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Key className="w-4 h-4 text-amber-600" />
                    مفتاح الـ API المخصص (Custom Gemini API Key)
                  </label>
                  <span className="text-[10px] text-slate-500 font-medium">(اختياري)</span>
                </div>

                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={aiSettings.apiKey || ''}
                    onChange={(e) => setAiSettings({ ...aiSettings, apiKey: e.target.value })}
                    className="w-full text-xs font-mono p-2.5 pl-10 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="اتركه فارغاً لاستخدام المفتاح الافتراضي للسيرفر..."
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
                      <Check className="w-3.5 h-3.5" /> يتم استخدام مفتاح API المخصص المُدخل أعلاه.
                    </span>
                  ) : (
                    <span className="text-slate-600">
                      ℹ️ يتم الاعتماد حالياً على مفتاح السيرفر الافتراضي المسجل في متغير البيئة <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800 font-mono">GEMINI_API_KEY</code>.
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
                  {(['رسمي وفخم', 'حماسي ومحفز', 'شاعري وبليغ', 'لطيف للأطفال', 'مسجوع وأدبي', 'موجز ومباشر'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setAiSettings({ ...aiSettings, tone: t })}
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

              {/* Smart Local Fallback Toggle */}
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
                <span>دليل تشغيل ورفع النظام على سيرفر خارجي (VPS, Docker, Cloud Run, Vercel) دون مشاكل في الـ API</span>
              </div>
              <span className="text-amber-400 font-mono text-sm">{showDeployGuide ? '▲ إخفاء' : '▼ عرض الدليل'}</span>
            </button>

            {showDeployGuide && (
              <div className="p-5 space-y-4 text-xs text-slate-700 bg-slate-50 leading-relaxed border-t border-slate-200">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Item 1: .env configuration */}
                  <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2">
                    <h4 className="font-extrabold text-slate-900 flex items-center gap-1.5 text-xs">
                      <Code2 className="w-4 h-4 text-indigo-600" />
                      1. إعداد ملف البيئة (.env) بالسيرفر:
                    </h4>
                    <p className="text-[11px] text-slate-600">
                      عند استضافة التطبيق على سيرفر Node.js أو VPS، قم بإنشاء ملف باسم <code className="bg-slate-100 text-indigo-800 px-1 py-0.5 rounded font-mono">.env</code> في المجلد الرئيسي وأضف المفتاح:
                    </p>
                    <div className="bg-slate-900 text-amber-300 p-2.5 rounded-lg font-mono text-[11px] select-all dir-ltr text-left">
                      GEMINI_API_KEY=AIzaSyYourGeminiApiKeyHere<br />
                      PORT=3000
                    </div>
                  </div>

                  {/* Item 2: Docker command */}
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
                    أمان وسرية المفاتيح:
                  </h5>
                  <p className="text-[11px] text-amber-900 leading-relaxed">
                    كافة اتصالات ومفاتيح الـ API تُعالج على الخادم الخلفي (Server-side) عبر مسارات <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">/api/*</code> لضمان عدم تسريب المفاتيح للمتصفح إطلاقاً وبأعلى معايير الحماية.
                  </p>
                </div>

              </div>
            )}
          </div>

        </div>
      )}

      {/* TAB 3: APP SYSTEM & SUPPORT */}
      {activeTab === 'app-system' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Synchronization and Local Mode Column */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                <Wifi className="w-4 h-4 text-amber-600" />
                المزامنة والوضع المحلي
              </h3>
              <span className="text-[11px] text-amber-700 font-bold bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                مفعل تلقائياً
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <h5 className="font-bold text-xs text-slate-900">الوضع غير المتصل (Offline Mode)</h5>
                <p className="text-[11px] text-slate-500 mt-0.5">العمل بالكامل بدون إنترنت والاعتماد على الذاكرة المحلية</p>
              </div>
              <button
                onClick={() => setOfflineMode(!offlineMode)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                  offlineMode ? 'bg-amber-500 text-slate-950' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {offlineMode ? <WifiOff className="w-4 h-4" /> : <Wifi className="w-4 h-4" />}
                {offlineMode ? 'مفعل' : 'معطل'}
              </button>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <h5 className="font-bold text-xs text-slate-900">المزامنة السحابية التلقائية</h5>
                <p className="text-[11px] text-slate-500 mt-0.5">مزامنة التغييرات تلقائياً عبر الأجهزة</p>
              </div>
              <input
                type="checkbox"
                checked={autoSync}
                onChange={(e) => setAutoSync(e.target.checked)}
                className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <h5 className="font-bold text-xs text-slate-900">تصدير الطباعة فائق الدقة (Vector Print PDF)</h5>
                <p className="text-[11px] text-slate-500 mt-0.5">ضمان عدم ضبابية النصوص أو الخطوط عند الطباعة</p>
              </div>
              <input
                type="checkbox"
                checked={highQualityPdf}
                onChange={(e) => setHighQualityPdf(e.target.checked)}
                className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
              />
            </div>

            {/* Training Videos Section */}
            <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl space-y-2">
              <h4 className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-amber-700" />
                الدورات والورش التدريبية لتطوير الكفاءة
              </h4>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                تعلم أسرار الصياغة التربوية المؤثرة والتصميم الرقمي لشهادات التكريم عبر مقاطع قصيرة ودليل الإرشادات.
              </p>
            </div>
          </div>

          {/* 24/7 Support & FAQ Column */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                <Headset className="w-4 h-4 text-amber-600" />
                الدعم الفني والتعليمات (24/7)
              </h3>
              <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                الدعم مباشر
              </span>
            </div>

            <div className="space-y-2">
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
                    <span className="text-amber-600">{activeFaq === idx ? '▲' : '▼'}</span>
                  </button>
                  {activeFaq === idx && (
                    <div className="p-3 text-xs text-slate-600 bg-white border-t border-slate-100 leading-relaxed">
                      {f.a}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Contact Support */}
            <div className="p-3 bg-slate-900 text-white rounded-xl flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-xs font-bold block">فريق الدعم الفني المباشر</span>
                <span className="text-[11px] text-slate-400 block">نسعد بجميع استفساراتكم واقتراحاتكم 24/7</span>
              </div>
              <button
                onClick={() => alert('تم توجيه طلبك لفريق الدعم المباشر، سنتواصل معك فوراً!')}
                className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-lg transition"
              >
                تواصل مع الدعم
              </button>
            </div>

          </div>

        </div>
      )}

    </div>
  );
};
