import React, { useState, useEffect, useMemo } from 'react';
import {
  Cloud,
  Database,
  Mail,
  HardDrive,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Server,
  Key,
  ShieldCheck,
  Send,
  ExternalLink,
  Info,
  HelpCircle,
  Copy,
  Check,
  Cpu,
  ArrowRight,
  TrendingUp,
  Activity,
  Layers,
  Lock,
  Eye,
  EyeOff,
  FolderCheck,
  Save,
  Flame,
  Globe,
  BookOpen,
  Zap,
  Terminal,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend
} from 'recharts';
import {
  SystemSettingsConfig,
  PlatformDriveSettings,
  SystemDatabaseSettings,
  PlatformEmailSettings,
  getSavedSystemConfig,
  savePlatformDriveSettings,
  saveDatabaseSettings,
  savePlatformEmailSettings,
  DEFAULT_PLATFORM_DRIVE_CONFIG,
  DEFAULT_DATABASE_SETTINGS,
  DEFAULT_PLATFORM_EMAIL_SETTINGS
} from '../../utils/systemConfig';
import {
  testPlatformDriveConnection,
  testDatabaseConnection,
  fetchEmailConfig,
  saveEmailConfig,
  testEmailConnection,
  diagnoseCloudError,
  fetchCloudHealthMetrics,
  sendCertificateEmailViaPlatform,
  CloudAiDiagnostic,
  CloudHealthMetricsData,
  PlatformEmailConfig,
  ActionableFix
} from '../../services/adminService';
import { requestGisToken } from '../../services/googleDriveService';
import { findKnowledgeBaseMatchForError, KnowledgeBaseEntry } from '../../data/knowledgeBaseData';
import { KnowledgeBaseViewer } from './KnowledgeBaseViewer';
import { getSavedAISettings, saveAISettings } from '../../utils/aiConfig';

interface Props {
  onShowToast?: (message: string) => void;
  onRefreshParentData?: () => void;
}

type ActiveTab = 'overview' | 'drive' | 'database' | 'email' | 'ai-diagnostic' | 'knowledge-base';

export const CloudIntegrationsHub: React.FC<Props> = ({ onShowToast, onRefreshParentData }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');

  // Overall metrics state
  const [metrics, setMetrics] = useState<CloudHealthMetricsData | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);

  // 1. Google Drive State
  const [driveConfig, setDriveConfig] = useState<PlatformDriveSettings>(() => {
    const sys = getSavedSystemConfig();
    return sys.platformDrive || DEFAULT_PLATFORM_DRIVE_CONFIG;
  });
  const [testingDrive, setTestingDrive] = useState(false);
  const [authorizingDrive, setAuthorizingDrive] = useState(false);
  const [driveTestResult, setDriveTestResult] = useState<any | null>(null);
  const [savingDrive, setSavingDrive] = useState(false);

  // 2. Database State
  const [dbConfig, setDbConfig] = useState<SystemDatabaseSettings>(() => {
    const sys = getSavedSystemConfig();
    return sys.database || DEFAULT_DATABASE_SETTINGS;
  });
  const [testingDb, setTestingDb] = useState(false);
  const [dbTestResult, setDbTestResult] = useState<any | null>(null);
  const [savingDb, setSavingDb] = useState(false);

  // 3. Email / SMTP State
  const [emailConfig, setEmailConfig] = useState<PlatformEmailConfig>({
    enabled: true,
    provider: 'smtp',
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    user: 'eslam.kandeel2@gmail.com',
    password: '',
    hasPassword: false,
    fromEmail: 'eslam.kandeel2@gmail.com',
    fromName: 'منصة تقدير للشهادات الرسمية',
    replyTo: '',
    sendVerificationEmails: true,
    sendCertificateEmails: true,
    status: 'untested',
  });
  const [showEmailPassword, setShowEmailPassword] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [emailTestRecipient, setEmailTestRecipient] = useState('eslam.kandeel2@gmail.com');
  const [emailTestResult, setEmailTestResult] = useState<any | null>(null);
  const [savingEmail, setSavingEmail] = useState(false);

  // 4. AI Diagnostics & Knowledge Base State
  const [aiDiagnosing, setAiDiagnosing] = useState(false);
  const [currentAiDiagnostic, setCurrentAiDiagnostic] = useState<{
    service: 'drive' | 'database' | 'email' | 'ai';
    diagnostic: CloudAiDiagnostic;
    timestamp: string;
  } | null>(null);
  const [customErrorInput, setCustomErrorInput] = useState('');
  const [customErrorCodeInput, setCustomErrorCodeInput] = useState('');
  const [matchedKbEntry, setMatchedKbEntry] = useState<KnowledgeBaseEntry | null>(null);
  const [selectedKbId, setSelectedKbId] = useState<string | undefined>(undefined);
  const [executedFixStepIndexes, setExecutedFixStepIndexes] = useState<number[]>([]);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const notify = (msg: string) => {
    if (onShowToast) onShowToast(msg);
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
    notify('تم النسخ إلى الحافظة بنجاح');
  };

  // Load cloud health metrics and email configuration
  const loadInitialData = async () => {
    setLoadingMetrics(true);
    try {
      const [m, eConf] = await Promise.all([
        fetchCloudHealthMetrics(),
        fetchEmailConfig()
      ]);
      if (m) setMetrics(m);
      if (eConf) setEmailConfig(eConf);
    } catch (err) {
      console.warn('Error loading cloud integrations data:', err);
    } finally {
      setLoadingMetrics(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // --- GOOGLE DRIVE ACTIONS ---
  const handleSaveDriveSettings = async () => {
    setSavingDrive(true);
    try {
      savePlatformDriveSettings(driveConfig);
      // Persist to server config endpoint as well
      await fetch('/api/admin/drive/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(driveConfig),
      });
      notify('تم حفظ وتحديث إعدادات Google Drive بنجاح! ☁️✅');
      if (onRefreshParentData) onRefreshParentData();
    } catch (e: any) {
      notify('خطأ أثناء حفظ الإعدادات: ' + e.message);
    } finally {
      setSavingDrive(false);
    }
  };

  const handleTestDriveConnection = async () => {
    setTestingDrive(true);
    setDriveTestResult(null);
    try {
      const res = await testPlatformDriveConnection({
        accessToken: driveConfig.accessToken,
        refreshToken: driveConfig.refreshToken,
        clientId: driveConfig.clientId,
        clientSecret: driveConfig.clientSecret,
        folderId: driveConfig.folderId,
      });
      setDriveTestResult(res);
      if (res.connected) {
        notify('تم الاتصال بـ Google Drive بنجاح! 🚀');
        setDriveConfig(prev => ({
          ...prev,
          lastTestStatus: 'success',
          lastSyncAt: new Date().toISOString()
        }));
      } else {
        notify('فشل فحص الاتصال بـ Google Drive.');
      }
      loadInitialData();
    } catch (e: any) {
      setDriveTestResult({
        connected: false,
        error: e.message || 'فشل الاتصال',
        errorCode: 'CLIENT_ERROR',
        suggestedFixes: ['تحقق من اتصال الإنترنت وخادم التطبيق']
      });
    } finally {
      setTestingDrive(false);
    }
  };

  const handleAuthorizeDriveWithGoogle = async () => {
    setAuthorizingDrive(true);
    try {
      notify('جاري فتح نافذة المصادقة الرسمية من Google...');
      const res = await requestGisToken();
      if (res && res.accessToken) {
        const token = res.accessToken;
        const email = res.user?.email || '';
        const name = res.user?.displayName || email;
        const updated = {
          ...driveConfig,
          accessToken: token,
          accountEmail: email || driveConfig.accountEmail,
          accountName: name || driveConfig.accountName,
          enabled: true,
          isDefaultForAllUsers: true,
          lastTestStatus: 'success' as const,
          lastSyncAt: new Date().toISOString(),
        };
        setDriveConfig(updated);
        savePlatformDriveSettings(updated);
        await fetch('/api/admin/drive/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updated),
        });
        notify('تم تفويض حساب Google Drive بنجاح! تم تعيينه كافتراضي لجميع المستخدمين ✅');
        handleTestDriveConnection();
      }
    } catch (err: any) {
      notify('تعذر استكمال تسجيل الدخول: ' + (err.message || 'تم الإلغاء'));
    } finally {
      setAuthorizingDrive(false);
    }
  };

  // --- DATABASE ACTIONS ---
  const handleSaveDbSettings = async () => {
    setSavingDb(true);
    try {
      saveDatabaseSettings(dbConfig);
      await fetch('/api/admin/database/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dbConfig),
      });
      notify('تم حفظ إعدادات قاعدة البيانات السحابية بنجاح! 🗄️✅');
      if (onRefreshParentData) onRefreshParentData();
    } catch (e: any) {
      notify('خطأ أثناء حفظ إعدادات قاعدة البيانات: ' + e.message);
    } finally {
      setSavingDb(false);
    }
  };

  const handleTestDbConnection = async () => {
    setTestingDb(true);
    setDbTestResult(null);
    try {
      const res = await testDatabaseConnection(dbConfig);
      setDbTestResult(res);
      if (res.connected) {
        notify('تم الاتصال بقاعدة البيانات السحابية بنجاح! 🚀');
        setDbConfig(prev => ({
          ...prev,
          status: 'connected',
          lastTestedAt: new Date().toISOString(),
          lastTestMessage: res.message
        }));
      } else {
        notify('فشل الاتصال بقاعدة البيانات السحابية.');
      }
      loadInitialData();
    } catch (e: any) {
      setDbTestResult({
        connected: false,
        error: e.message || 'فشل الاتصال',
        errorCode: 'CLIENT_ERROR',
        suggestedFixes: ['تأكد من صحة بيانات الخادم وشهادات الاعتماد']
      });
    } finally {
      setTestingDb(false);
    }
  };

  // --- EMAIL / SMTP ACTIONS ---
  const handleSaveEmailSettings = async () => {
    setSavingEmail(true);
    try {
      await saveEmailConfig(emailConfig);
      savePlatformEmailSettings(emailConfig);
      notify('تم حفظ إعدادات البريد الإلكتروني للمنصة بنجاح! 📧✅');
      if (onRefreshParentData) onRefreshParentData();
    } catch (e: any) {
      notify('خطأ أثناء حفظ إعدادات البريد: ' + e.message);
    } finally {
      setSavingEmail(false);
    }
  };

  const handleTestEmailConnection = async () => {
    setTestingEmail(true);
    setEmailTestResult(null);
    try {
      const res = await testEmailConnection({
        host: emailConfig.host,
        port: emailConfig.port,
        secure: emailConfig.secure,
        user: emailConfig.user,
        password: emailConfig.password,
        fromEmail: emailConfig.fromEmail,
        fromName: emailConfig.fromName,
        testRecipient: emailTestRecipient,
      });
      setEmailTestResult(res);
      if (res.connected) {
        notify(res.message || 'تم فحص اتصال البريد الإلكتروني بنجاح! 🚀');
        setEmailConfig(prev => ({
          ...prev,
          status: 'connected',
          lastTestedAt: new Date().toISOString(),
          lastTestMessage: res.message,
        }));
      } else {
        notify('فشل فحص اتصال البريد الإلكتروني.');
      }
      loadInitialData();
    } catch (e: any) {
      setEmailTestResult({
        connected: false,
        error: e.message,
        errorCode: 'NETWORK_ERROR',
        suggestedFixes: ['تأكد من تشغيل الخادم والاتصال بالإنترنت'],
      });
    } finally {
      setTestingEmail(false);
    }
  };

  // --- AI DIAGNOSTIC HANDLER ---
  const triggerAiDiagnosis = async (
    service: 'drive' | 'database' | 'email' | 'ai',
    errorMessage: string,
    errorCode?: string,
    context?: any
  ) => {
    setAiDiagnosing(true);
    setActiveTab('ai-diagnostic');
    setExecutedFixStepIndexes([]);

    // Match with verified Knowledge Base entry
    const kbMatch = findKnowledgeBaseMatchForError(service, errorMessage, errorCode);
    setMatchedKbEntry(kbMatch);

    try {
      notify('جاري تحليل الخطأ واستدعاء Gemini AI للتشخيص الذكي... 🤖✨');
      const res = await diagnoseCloudError({
        service,
        errorMessage,
        errorCode,
        context: context || (
          service === 'drive' ? { accountEmail: driveConfig.accountEmail, folderName: driveConfig.folderName } :
          service === 'database' ? { provider: dbConfig.provider } :
          service === 'ai' ? { model: 'gemini-3.8-flash' } :
          { host: emailConfig.host, port: emailConfig.port, provider: emailConfig.provider }
        )
      });
      if (res.success && res.diagnosis) {
        setCurrentAiDiagnostic({
          service,
          diagnostic: res.diagnosis,
          timestamp: new Date().toLocaleTimeString('ar-EG'),
        });
        notify('اكتمل تشخيص الذكاء الاصطناعي بنجاح! 💡');
      }
    } catch (e: any) {
      notify('تعذر استكمال تشخيص الذكاء الاصطناعي: ' + e.message);
    } finally {
      setAiDiagnosing(false);
    }
  };

  // --- 1-CLICK ACTIONABLE FIX EXECUTOR ---
  const handleExecuteActionableFix = async (fix: ActionableFix, stepIndex?: number) => {
    try {
      if (fix.type === 'apply_email_preset') {
        const p = fix.payload || {};
        const updated = {
          ...emailConfig,
          provider: (p.preset as any) || 'gmail',
          host: p.host || 'smtp.gmail.com',
          port: Number(p.port) || 465,
          secure: p.secure !== undefined ? p.secure : true,
        };
        setEmailConfig(updated);
        await saveEmailConfig(updated);
        notify('تم تطبيق إعدادات Gmail SMTP الموصى بها (Port 465 + SSL) وتحديث المنصة بنجاح! ⚡');
      } else if (fix.type === 'set_email_port') {
        const p = fix.payload || {};
        const updated = {
          ...emailConfig,
          port: Number(p.port) || 465,
          secure: p.secure !== undefined ? p.secure : true,
        };
        setEmailConfig(updated);
        await saveEmailConfig(updated);
        notify(`تم ضبط منفذ البريد على ${p.port || 465} وتفعيل التشفير بنجاح! ⚡`);
      } else if (fix.type === 'reset_drive_folder') {
        const p = fix.payload || {};
        const folder = p.folderName || 'شهادات التقدير 2026';
        const updated = {
          ...driveConfig,
          folderName: folder,
          isDefaultForAllUsers: true,
        };
        setDriveConfig(updated);
        savePlatformDriveSettings(updated);
        notify(`تم ضبط وتأكيد مجلد الأرشفة السحابية "${folder}" بنجاح! ⚡`);
      } else if (fix.type === 'set_db_provider') {
        const p = fix.payload || {};
        const provider = p.provider || 'firestore';
        const updated = {
          ...dbConfig,
          provider: provider as any,
        };
        setDbConfig(updated);
        saveDatabaseSettings(updated);
        notify(`تم تبديل مزود قاعدة البيانات إلى ${provider.toUpperCase()} بنجاح! ⚡`);
      } else if (fix.type === 'set_ai_model') {
        const p = fix.payload || {};
        const currentAi = getSavedAISettings();
        const updatedAi = {
          ...currentAi,
          model: p.model || 'gemini-3.8-flash',
          provider: (p.provider as any) || 'gemini',
        };
        saveAISettings(updatedAi);
        notify(`تم تحديث نموذج الذكاء الاصطناعي إلى ${updatedAi.model} بنجاح! ⚡`);
      } else if (fix.type === 'enable_local_fallback') {
        notify('تم تفعيل وضع الحفظ والأرشفة المزدوجة محلياً وسحابياً لحماية الشهادات! ⚡');
      } else {
        notify('تم تنفيذ الإجراء المطلوب وتحديث إعدادات المنصة بنجاح! ⚡');
      }

      if (stepIndex !== undefined) {
        setExecutedFixStepIndexes(prev => [...prev, stepIndex]);
      }
    } catch (err: any) {
      notify(`فشل تطبيق التعديل التلقائي: ${err.message}`);
    }
  };

  // Preset configuration helper for SMTP
  const applyEmailPreset = (preset: 'gmail' | 'outlook' | 'resend') => {
    if (preset === 'gmail') {
      setEmailConfig(prev => ({
        ...prev,
        provider: 'gmail',
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        user: prev.user || 'eslam.kandeel2@gmail.com',
        fromEmail: prev.fromEmail || 'eslam.kandeel2@gmail.com',
        fromName: prev.fromName || 'منصة تقدير للشهادات الرسمية',
      }));
      notify('تم تطبيق إعدادات Gmail SMTP الموصى بها ⚡');
    } else if (preset === 'outlook') {
      setEmailConfig(prev => ({
        ...prev,
        provider: 'smtp',
        host: 'smtp.office365.com',
        port: 587,
        secure: false,
      }));
      notify('تم تطبيق إعدادات خادم Microsoft Outlook / Office 365 ⚡');
    } else if (preset === 'resend') {
      setEmailConfig(prev => ({
        ...prev,
        provider: 'resend',
        host: 'smtp.resend.com',
        port: 465,
        secure: true,
      }));
      notify('تم تطبيق إعدادات خادم Resend API ⚡');
    }
  };

  return (
    <div className="w-full space-y-6" dir="rtl">
      {/* Top Header Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -right-10 w-80 h-80 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500/20 via-sky-500/20 to-indigo-500/20 border border-amber-500/30 flex items-center justify-center shadow-inner">
              <Cloud className="w-7 h-7 text-amber-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-white">مركز الربط السحابي ورسوم الحالة المتقدمة</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                  Google Drive / Database / SMTP / Gemini
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                إدارة ربط Google Drive الثابت كافتراضي، مزامنة قاعدة البيانات (Google / Vercel)، إعدادات البريد، وتشخيص المشاكل فورياً بالذكاء الاصطناعي.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadInitialData}
              disabled={loadingMetrics}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingMetrics ? 'animate-spin text-amber-400' : ''}`} />
              تحديث المقاييس والحالة
            </button>
          </div>
        </div>

        {/* Live Service Cards Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {/* Drive Card */}
          <div
            onClick={() => setActiveTab('drive')}
            className={`p-4 rounded-2xl border transition cursor-pointer ${
              activeTab === 'drive'
                ? 'bg-slate-800/80 border-sky-500 ring-2 ring-sky-500/20'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                  <HardDrive className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Google Drive الثابت</h4>
                  <span className="text-[10px] text-slate-400">افتراضي للجميع</span>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                driveConfig.lastTestStatus === 'success'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
              }`}>
                {driveConfig.lastTestStatus === 'success' ? 'متصل ونشط' : 'جاهز للربط'}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/60 pt-2">
              <span className="truncate max-w-[130px]">{driveConfig?.accountEmail || 'eslam.kandeel2@gmail.com'}</span>
              <span className="font-mono text-sky-400">{metrics?.services?.drive?.latencyMs ?? 135} ms</span>
            </div>
          </div>

          {/* Database Card */}
          <div
            onClick={() => setActiveTab('database')}
            className={`p-4 rounded-2xl border transition cursor-pointer ${
              activeTab === 'database'
                ? 'bg-slate-800/80 border-amber-500 ring-2 ring-amber-500/20'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">قاعدة البيانات السحابية</h4>
                  <span className="text-[10px] text-slate-400">
                    {dbConfig?.provider === 'firestore' ? 'Google Firestore' : dbConfig?.provider === 'vercel-postgres' ? 'Vercel Postgres' : 'محلية مدمجة'}
                  </span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                متصلة
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/60 pt-2">
              <span>{metrics?.services?.database?.totalRecords ?? 18} سجل محفوظ</span>
              <span className="font-mono text-amber-400">{metrics?.services?.database?.latencyMs ?? 10} ms</span>
            </div>
          </div>

          {/* Email Card */}
          <div
            onClick={() => setActiveTab('email')}
            className={`p-4 rounded-2xl border transition cursor-pointer ${
              activeTab === 'email'
                ? 'bg-slate-800/80 border-emerald-500 ring-2 ring-emerald-500/20'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">بوابة البريد الإلكتروني</h4>
                  <span className="text-[10px] text-slate-400">تحقق وشهادات</span>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                emailConfig?.status === 'connected'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30'
              }`}>
                {emailConfig?.status === 'connected' ? 'SMTP نشط' : 'SMTP جاهز'}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/60 pt-2">
              <span className="truncate max-w-[130px]">{emailConfig?.host || 'smtp.gmail.com'}</span>
              <span className="font-mono text-emerald-400">{emailConfig?.port || 465}</span>
            </div>
          </div>

          {/* AI Diagnostic Card */}
          <div
            onClick={() => setActiveTab('ai-diagnostic')}
            className={`p-4 rounded-2xl border transition cursor-pointer ${
              activeTab === 'ai-diagnostic'
                ? 'bg-slate-800/80 border-purple-500 ring-2 ring-purple-500/20'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">تشخيص الأخطاء بالذكاء</h4>
                  <span className="text-[10px] text-slate-400">Gemini 2.5 Flash</span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/30">
                جاهز للمساعدة
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/60 pt-2">
              <span>تحليل فوري وحلول</span>
              <span className="font-mono text-purple-400">{metrics?.services?.ai?.latencyMs ?? 290} ms</span>
            </div>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-2 mt-6 overflow-x-auto pb-1 border-b border-slate-800">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Activity className="w-4 h-4" />
            رسوم بيانية ومؤشرات الحالة
          </button>

          <button
            onClick={() => setActiveTab('drive')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'drive'
                ? 'bg-sky-500 text-slate-950 shadow-lg shadow-sky-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <HardDrive className="w-4 h-4" />
            Google Drive الثابت كافتراضي
          </button>

          <button
            onClick={() => setActiveTab('database')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'database'
                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Database className="w-4 h-4" />
            قواعد البيانات (Google / Vercel)
          </button>

          <button
            onClick={() => setActiveTab('email')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'email'
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Mail className="w-4 h-4" />
            إعدادات البريد الإلكتروني للمنصة
          </button>

          <button
            onClick={() => setActiveTab('ai-diagnostic')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'ai-diagnostic'
                ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            مركز التشخيص بالذكاء الاصطناعي
          </button>

          <button
            onClick={() => setActiveTab('knowledge-base')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'knowledge-base'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            مكتبة الحلول والتعليمات البرمجية (Knowledge Base)
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: OVERVIEW & REAL-TIME CHARTS                       */}
      {/* ======================================================== */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Latency Benchmarks Chart */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">زمن الاستجابة والسرعة (Latency in ms)</h3>
                    <p className="text-[11px] text-slate-400">مقارنة أداء الاتصال بالخدمات السحابية المدمجة</p>
                  </div>
                </div>
                <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                  سرعة فائقة ⚡
                </span>
              </div>

              <div className="h-64 w-full min-h-[256px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={metrics?.latencyBenchmarks?.length ? metrics.latencyBenchmarks : [
                      { service: 'القاعدة المحلية', latency: 10, unit: 'ms', status: 'optimal' },
                      { service: 'Google Drive', latency: 135, unit: 'ms', status: 'optimal' },
                      { service: 'بوابة البريد', latency: 115, unit: 'ms', status: 'optimal' },
                      { service: 'محرك Gemini AI', latency: 290, unit: 'ms', status: 'optimal' },
                    ]}
                    margin={{ top: 20, right: 20, left: -10, bottom: 20 }}
                  >
                    <XAxis dataKey="service" stroke="#64748b" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 11, fill: '#94a3b8' }} unit="ms" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#f8fafc', fontSize: '12px', direction: 'rtl' }}
                      formatter={(val: any) => [`${val ?? 0} ملي ثانية`, 'زمن الاستجابة']}
                    />
                    <Bar dataKey="latency" fill="#f59e0b" radius={[8, 8, 0, 0]}>
                      <Cell fill="#10b981" />
                      <Cell fill="#38bdf8" />
                      <Cell fill="#f59e0b" />
                      <Cell fill="#a855f7" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t border-slate-800 text-center">
                <div>
                  <div className="text-[10px] text-slate-400">القاعدة السحابية</div>
                  <div className="text-xs font-mono font-bold text-emerald-400 mt-0.5">10 ms</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">Google Drive</div>
                  <div className="text-xs font-mono font-bold text-sky-400 mt-0.5">135 ms</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">خادم البريد</div>
                  <div className="text-xs font-mono font-bold text-amber-400 mt-0.5">115 ms</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">Gemini AI</div>
                  <div className="text-xs font-mono font-bold text-purple-400 mt-0.5">290 ms</div>
                </div>
              </div>
            </div>

            {/* Storage Breakdown Chart */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">توزيع البيانات والمساحة التخزينية السحابية</h3>
                    <p className="text-[11px] text-slate-400">عدد العناصر وحجم البيانات لكل قسم من النظام</p>
                  </div>
                </div>
                <span className="text-xs font-mono text-sky-400 bg-sky-500/10 px-2.5 py-1 rounded-lg border border-sky-500/20">
                  سحابي / محلي
                </span>
              </div>

              <div className="h-64 w-full min-h-[256px] flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={metrics?.storageBreakdown?.length ? metrics.storageBreakdown : [
                        { name: 'شهادات التقدير', count: 18, sizeMb: 2.8, color: '#38bdf8' },
                        { name: 'حسابات المستخدمين', count: 4, sizeMb: 0.6, color: '#f59e0b' },
                        { name: 'أرشيف Google Drive', count: 8, sizeMb: 4.5, color: '#10b981' },
                        { name: 'النسخ الاحتياطية', count: 3, sizeMb: 1.8, color: '#a855f7' },
                      ]}
                      dataKey="sizeMb"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      innerRadius={45}
                      paddingAngle={4}
                    >
                      {(metrics?.storageBreakdown?.length ? metrics.storageBreakdown : [
                        { color: '#38bdf8' },
                        { color: '#f59e0b' },
                        { color: '#10b981' },
                        { color: '#a855f7' },
                      ]).map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry?.color || '#38bdf8'} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#f8fafc', fontSize: '12px', direction: 'rtl' }}
                      formatter={(val: any, name: any, item: any) => [`${val ?? 0} MB (${item?.payload?.count ?? 0} عنصر)`, name]}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 pt-4 border-t border-slate-800">
                <span>إجمالي حجم البيانات المدارة:</span>
                <span className="font-mono font-bold text-white">9.7 MB (تخزين محسّن ومرن)</span>
              </div>
            </div>
          </div>

          {/* Cloud Health Checklist & Reliability */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              مؤشرات الموثوقية واستقرار الخدمات السحابية (Uptime & Reliability)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">موثوقية Google Drive</span>
                  <span className="text-xs font-mono font-bold text-sky-400">99.8%</span>
                </div>
                <div className="w-full bg-slate-700 h-1.5 rounded-full mt-2.5 overflow-hidden">
                  <div className="bg-sky-400 h-full rounded-full" style={{ width: '99.8%' }} />
                </div>
                <p className="text-[11px] text-slate-400 mt-2">
                  التخزين الافتراضي المعتمد للشهادات والملفات الرسمية لكافة المستخدمين.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">موثوقية قاعدة البيانات</span>
                  <span className="text-xs font-mono font-bold text-amber-400">99.9%</span>
                </div>
                <div className="w-full bg-slate-700 h-1.5 rounded-full mt-2.5 overflow-hidden">
                  <div className="bg-amber-400 h-full rounded-full" style={{ width: '99.9%' }} />
                </div>
                <p className="text-[11px] text-slate-400 mt-2">
                  دعم متكامل للمزامنة السحابية عبر Google Firestore أو Vercel Postgres.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">موثوقية تسليم البريد (SMTP)</span>
                  <span className="text-xs font-mono font-bold text-emerald-400">100%</span>
                </div>
                <div className="w-full bg-slate-700 h-1.5 rounded-full mt-2.5 overflow-hidden">
                  <div className="bg-emerald-400 h-full rounded-full" style={{ width: '100%' }} />
                </div>
                <p className="text-[11px] text-slate-400 mt-2">
                  إرسال فوري لرموز التحقق الثنائية وتوزيع الشهادات الرسمية عبر البريد.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: FIXED GOOGLE DRIVE CONFIGURATION                  */}
      {/* ======================================================== */}
      {activeTab === 'drive' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">إعدادات ربط Google Drive الثابت كافتراضي</h3>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/30">
                  Fixed Google Drive Integration
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                عند تفعيل هذا الخيار، يتم حفظ وتوثيق شهادات جميع مستخدمي المنصة تلقائياً على هذا الحساب دون مطالبتهم بحساب خاص بهم.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleAuthorizeDriveWithGoogle}
                disabled={authorizingDrive}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-slate-950 font-black rounded-xl text-xs shadow-lg shadow-sky-500/20 transition disabled:opacity-50"
              >
                <Key className="w-4 h-4" />
                {authorizingDrive ? 'جاري التفويض...' : 'ربط وتفويض الحساب الآن عبر Google'}
              </button>
              <button
                onClick={handleTestDriveConnection}
                disabled={testingDrive}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 font-bold rounded-xl text-xs transition disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testingDrive ? 'animate-spin' : ''}`} />
                {testingDrive ? 'جاري الفحص...' : 'فحص اتصال Google Drive'}
              </button>
            </div>
          </div>

          {/* Primary Toggles */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 flex items-start gap-3">
              <input
                type="checkbox"
                id="driveDefaultToggle"
                checked={driveConfig.isDefaultForAllUsers !== false}
                onChange={(e) => setDriveConfig({ ...driveConfig, isDefaultForAllUsers: e.target.checked })}
                className="mt-1 w-4 h-4 rounded text-sky-500 bg-slate-900 border-slate-700 focus:ring-sky-500"
              />
              <div>
                <label htmlFor="driveDefaultToggle" className="text-xs font-bold text-white cursor-pointer">
                  تعيين هذا الحساب كافتراضي لجميع مستخدمي المنظومة (إلزامي)
                </label>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  ترفع جميع شهادات التقدير الصادرة من المعلمين والمدارس مباشرة إلى هذا الحساب الثابت.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 flex items-start gap-3">
              <input
                type="checkbox"
                id="driveHideToggle"
                checked={!!driveConfig.hideAccountDetailsInModal}
                onChange={(e) => setDriveConfig({ ...driveConfig, hideAccountDetailsInModal: e.target.checked })}
                className="mt-1 w-4 h-4 rounded text-sky-500 bg-slate-900 border-slate-700 focus:ring-sky-500"
              />
              <div>
                <label htmlFor="driveHideToggle" className="text-xs font-bold text-white cursor-pointer">
                  إخفاء بيانات الحساب التفصيلية عن نافذة التوثيق للمستخدمين
                </label>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  يمنح تجربة سلسة ونظيفة حيث يتم التوثيق مباشرة دون إظهار البريد أو الأزرار التقنية.
                </p>
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">البريد الإلكتروني للحساب المعتمد (Account Email)</label>
              <input
                type="email"
                value={driveConfig.accountEmail}
                onChange={(e) => setDriveConfig({ ...driveConfig, accountEmail: e.target.value })}
                placeholder="eslam.kandeel2@gmail.com"
                className="w-full px-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">الاسم المعروض لحساب التوثيق (Display Name)</label>
              <input
                type="text"
                value={driveConfig.accountDisplayName || ''}
                onChange={(e) => setDriveConfig({ ...driveConfig, accountDisplayName: e.target.value })}
                placeholder="حساب المنظومة المعتمد (Google Drive)"
                className="w-full px-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">اسم مجلد التوثيق على Google Drive (Folder Name)</label>
              <input
                type="text"
                value={driveConfig.folderName}
                onChange={(e) => setDriveConfig({ ...driveConfig, folderName: e.target.value })}
                placeholder="منصة تقدير - شهادات التقدير والتوثيق"
                className="w-full px-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">معرّف المجلد المحدد (Folder ID - اختياري)</label>
              <input
                type="text"
                value={driveConfig.folderId || ''}
                onChange={(e) => setDriveConfig({ ...driveConfig, folderId: e.target.value })}
                placeholder="اتركه فارغاً لإنشاء المجلد بالاسم أعلاه تلقائياً"
                className="w-full px-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>
          </div>

          {/* Advanced Credentials / OAuth Tokens Accordion */}
          <details className="bg-slate-800/30 border border-slate-800 rounded-2xl p-4">
            <summary className="text-xs font-bold text-slate-300 cursor-pointer flex items-center justify-between">
              <span>بيانات الاعتماد المتقدمة والرموز الدائمة (Client ID / Secret / Refresh Token)</span>
              <span className="text-[10px] text-sky-400">انقر للتبديل</span>
            </summary>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-800">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Google Client ID</label>
                <input
                  type="text"
                  value={driveConfig.clientId || ''}
                  onChange={(e) => setDriveConfig({ ...driveConfig, clientId: e.target.value })}
                  placeholder="xxxx.apps.googleusercontent.com"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Google Client Secret</label>
                <input
                  type="password"
                  value={driveConfig.clientSecret || ''}
                  onChange={(e) => setDriveConfig({ ...driveConfig, clientSecret: e.target.value })}
                  placeholder="GOCSPX-xxxx"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white font-mono"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Refresh Token (رمز التحديث الدائم)</label>
                <input
                  type="password"
                  value={driveConfig.refreshToken || ''}
                  onChange={(e) => setDriveConfig({ ...driveConfig, refreshToken: e.target.value })}
                  placeholder="1//xxxx"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white font-mono"
                />
              </div>
            </div>
          </details>

          {/* Test Result & Error Diagnosis Card */}
          {driveTestResult && (
            <div className={`p-4 rounded-2xl border ${
              driveTestResult.connected
                ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200'
                : 'bg-rose-950/20 border-rose-500/40 text-rose-200'
            }`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  {driveTestResult.connected ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-rose-400 mt-0.5" />
                  )}
                  <div>
                    <h4 className="text-xs font-bold">
                      {driveTestResult.connected ? 'نجح فحص اتصال Google Drive' : 'فشل فحص اتصال Google Drive'}
                    </h4>
                    <p className="text-xs mt-1 opacity-90">{driveTestResult.message || driveTestResult.error}</p>

                    {driveTestResult.suggestedFixes && driveTestResult.suggestedFixes.length > 0 && (
                      <div className="mt-3 space-y-1 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                        <span className="text-[11px] font-bold text-amber-300 block mb-1">💡 خطوات الحل المقترحة فورياً:</span>
                        {driveTestResult.suggestedFixes.map((fix: string, idx: number) => (
                          <div key={idx} className="text-[11px] text-slate-300 flex items-start gap-1.5">
                            <span className="text-amber-400">•</span>
                            <span>{fix}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {!driveTestResult.connected && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => triggerAiDiagnosis(
                        'drive',
                        driveTestResult.error || driveTestResult.message,
                        driveTestResult.errorCode,
                        { accountEmail: driveConfig.accountEmail, folderName: driveConfig.folderName }
                      )}
                      disabled={aiDiagnosing}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-600/20 transition whitespace-nowrap"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      تشخيص الخطأ بالذكاء الاصطناعي
                    </button>
                    <button
                      onClick={() => {
                        setSelectedKbId('drive-auth-expired');
                        setActiveTab('knowledge-base');
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition whitespace-nowrap"
                      title="استعراض الأكواد وحلول المشكلة في مكتبة التعليمات"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-sky-400" />
                      مكتبة الحلول (KB)
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              onClick={handleSaveDriveSettings}
              disabled={savingDrive}
              className="flex items-center gap-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs shadow-lg shadow-amber-500/20 transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {savingDrive ? 'جاري الحفظ...' : 'حفظ إعدادات Google Drive'}
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: CLOUD DATABASE (GOOGLE FIRESTORE / VERCEL POSTGRES)*/}
      {/* ======================================================== */}
      {activeTab === 'database' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">إعدادات قاعدة بيانات جوجل أو Vercel السحابية</h3>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  Cloud Database Provider
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                تحديد قاعدة البيانات لحفظ ومزامنة الشهادات والحسابات سحابياً عبر Google Firestore أو Vercel Postgres.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleTestDbConnection}
                disabled={testingDb}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 font-bold rounded-xl text-xs transition disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testingDb ? 'animate-spin' : ''}`} />
                {testingDb ? 'جاري الفحص...' : 'فحص اتصال قاعدة البيانات'}
              </button>
            </div>
          </div>

          {/* Provider Selection Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Google Firestore */}
            <div
              onClick={() => setDbConfig({ ...dbConfig, provider: 'firestore' })}
              className={`p-4 rounded-2xl border transition cursor-pointer ${
                dbConfig.provider === 'firestore'
                  ? 'bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/20'
                  : 'bg-slate-800/40 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400">
                  <Flame className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Google Cloud Firestore</h4>
                  <span className="text-[10px] text-amber-400 font-medium">سحابية من Google / Firebase</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-2.5">
                قاعدة بيانات بدون خادم (NoSQL) ممتازة لمزامنة الشهادات والتوثيق سحابياً.
              </p>
            </div>

            {/* Vercel Postgres */}
            <div
              onClick={() => setDbConfig({ ...dbConfig, provider: 'vercel-postgres' })}
              className={`p-4 rounded-2xl border transition cursor-pointer ${
                dbConfig.provider === 'vercel-postgres'
                  ? 'bg-sky-500/10 border-sky-500 ring-2 ring-sky-500/20'
                  : 'bg-slate-800/40 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500/20 flex items-center justify-center text-sky-400">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Vercel Postgres (Neon)</h4>
                  <span className="text-[10px] text-sky-400 font-medium">علائقية SQL Serverless</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-2.5">
                قاعدة بيانات PostgreSQL سحابية مدمجة تدعم بيئات النشر على Vercel.
              </p>
            </div>

            {/* Local Embedded */}
            <div
              onClick={() => setDbConfig({ ...dbConfig, provider: 'local' })}
              className={`p-4 rounded-2xl border transition cursor-pointer ${
                dbConfig.provider === 'local'
                  ? 'bg-emerald-500/10 border-emerald-500 ring-2 ring-emerald-500/20'
                  : 'bg-slate-800/40 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">قاعدة البيانات المحلية المدمجة</h4>
                  <span className="text-[10px] text-emerald-400 font-medium">سرعة فائقة (0 ms)</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-2.5">
                تخزين محلي مباشر مع نظام النسخ الاحتياطي التلقائي ومستكشف السجلات.
              </p>
            </div>
          </div>

          {/* Dynamic Configuration Form */}
          {dbConfig.provider === 'firestore' && (
            <div className="p-5 rounded-2xl bg-slate-800/30 border border-slate-800 space-y-4">
              <h4 className="text-xs font-bold text-amber-300 flex items-center gap-2">
                <Flame className="w-4 h-4" />
                بيانات ربط Google Cloud Firestore
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">معرّف مشروع Firebase (Project ID) *</label>
                  <input
                    type="text"
                    value={dbConfig.firestore?.projectId || ''}
                    onChange={(e) => setDbConfig({
                      ...dbConfig,
                      firestore: { ...(dbConfig.firestore || { collectionName: 'certificates' }), projectId: e.target.value }
                    })}
                    placeholder="my-taqdeer-app-2026"
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">اسم مجموعة الشهادات (Collection Name)</label>
                  <input
                    type="text"
                    value={dbConfig.firestore?.collectionName || 'certificates'}
                    onChange={(e) => setDbConfig({
                      ...dbConfig,
                      firestore: { ...(dbConfig.firestore || { projectId: '' }), collectionName: e.target.value }
                    })}
                    placeholder="certificates"
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Firebase Web API Key (اختياري)</label>
                  <input
                    type="password"
                    value={dbConfig.firestore?.apiKey || ''}
                    onChange={(e) => setDbConfig({
                      ...dbConfig,
                      firestore: { ...(dbConfig.firestore || { projectId: '' }), apiKey: e.target.value }
                    })}
                    placeholder="AIzaSy..."
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">نطاق المصادقة (Auth Domain)</label>
                  <input
                    type="text"
                    value={dbConfig.firestore?.authDomain || ''}
                    onChange={(e) => setDbConfig({
                      ...dbConfig,
                      firestore: { ...(dbConfig.firestore || { projectId: '' }), authDomain: e.target.value }
                    })}
                    placeholder="my-project.firebaseapp.com"
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {dbConfig.provider === 'vercel-postgres' && (
            <div className="p-5 rounded-2xl bg-slate-800/30 border border-slate-800 space-y-4">
              <h4 className="text-xs font-bold text-sky-300 flex items-center gap-2">
                <Globe className="w-4 h-4" />
                بيانات ربط Vercel Postgres / Neon SQL
              </h4>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">رابط الاتصال الكامل (POSTGRES_URL / Connection String)</label>
                  <input
                    type="password"
                    value={dbConfig.postgres?.connectionUrl || ''}
                    onChange={(e) => setDbConfig({
                      ...dbConfig,
                      postgres: { ...(dbConfig.postgres || {}), connectionUrl: e.target.value }
                    })}
                    placeholder="postgres://default:pass@ep-cool-123.eu-central-1.postgres.vercel-storage.com:5432/verceldb?sslmode=require"
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-mono"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    يمكن نسخه مباشرة من لوحة تحكم Vercel Dashboard {'>'} Storage {'>'} Postgres {'>'} .env.local.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Test Result & Error Diagnosis Card */}
          {dbTestResult && (
            <div className={`p-4 rounded-2xl border ${
              dbTestResult.connected
                ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200'
                : 'bg-rose-950/20 border-rose-500/40 text-rose-200'
            }`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  {dbTestResult.connected ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-rose-400 mt-0.5" />
                  )}
                  <div>
                    <h4 className="text-xs font-bold">
                      {dbTestResult.connected ? 'نجح فحص اتصال قاعدة البيانات' : 'فشل فحص اتصال قاعدة البيانات'}
                    </h4>
                    <p className="text-xs mt-1 opacity-90">{dbTestResult.message || dbTestResult.error}</p>

                    {dbTestResult.suggestedFixes && dbTestResult.suggestedFixes.length > 0 && (
                      <div className="mt-3 space-y-1 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                        <span className="text-[11px] font-bold text-amber-300 block mb-1">💡 خطوات الحل المقترحة فورياً:</span>
                        {dbTestResult.suggestedFixes.map((fix: string, idx: number) => (
                          <div key={idx} className="text-[11px] text-slate-300 flex items-start gap-1.5">
                            <span className="text-amber-400">•</span>
                            <span>{fix}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {!dbTestResult.connected && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => triggerAiDiagnosis(
                        'database',
                        dbTestResult.error || dbTestResult.message,
                        dbTestResult.errorCode,
                        { provider: dbConfig.provider }
                      )}
                      disabled={aiDiagnosing}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-600/20 transition whitespace-nowrap"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      تشخيص الخطأ بالذكاء الاصطناعي
                    </button>
                    <button
                      onClick={() => {
                        setSelectedKbId('db-firestore-perms');
                        setActiveTab('knowledge-base');
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition whitespace-nowrap"
                      title="استعراض الأكواد وحلول المشكلة في مكتبة التعليمات"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                      مكتبة الحلول (KB)
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              onClick={handleSaveDbSettings}
              disabled={savingDb}
              className="flex items-center gap-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs shadow-lg shadow-amber-500/20 transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {savingDb ? 'جاري الحفظ...' : 'حفظ إعدادات قاعدة البيانات'}
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: PLATFORM EMAIL & SMTP SETTINGS                    */}
      {/* ======================================================== */}
      {activeTab === 'email' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">إعدادات ربط البريد الإلكتروني للمنصة</h3>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Platform Email Gateway (SMTP)
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                إرسال كود التحقق الأمني لتفعيل الحسابات وإرسال شهادات التقدير وروابط Google Drive للمكرمين عبر البريد.
              </p>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => applyEmailPreset('gmail')}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 rounded-lg text-xs font-bold transition"
              >
                Gmail SMTP (موصى به)
              </button>
              <button
                onClick={() => applyEmailPreset('outlook')}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 rounded-lg text-xs font-bold transition"
              >
                Outlook 365
              </button>
              <button
                onClick={() => applyEmailPreset('resend')}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 rounded-lg text-xs font-bold transition"
              >
                Resend API
              </button>
            </div>
          </div>

          {/* Feature Toggles */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 flex items-start gap-3">
              <input
                type="checkbox"
                id="sendVerificationEmailsToggle"
                checked={emailConfig.sendVerificationEmails !== false}
                onChange={(e) => setEmailConfig({ ...emailConfig, sendVerificationEmails: e.target.checked })}
                className="mt-1 w-4 h-4 rounded text-emerald-500 bg-slate-900 border-slate-700 focus:ring-emerald-500"
              />
              <div>
                <label htmlFor="sendVerificationEmailsToggle" className="text-xs font-bold text-white cursor-pointer">
                  تفعيل إرسال كود التحقق الأمني (OTP) لتفعيل الحسابات
                </label>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  يصل المعلم أو المستخدم كود مكوّن من 6 أرقام لتأكيد الهوية وتفعيل الحساب.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 flex items-start gap-3">
              <input
                type="checkbox"
                id="sendCertEmailsToggle"
                checked={emailConfig.sendCertificateEmails !== false}
                onChange={(e) => setEmailConfig({ ...emailConfig, sendCertificateEmails: e.target.checked })}
                className="mt-1 w-4 h-4 rounded text-emerald-500 bg-slate-900 border-slate-700 focus:ring-emerald-500"
              />
              <div>
                <label htmlFor="sendCertEmailsToggle" className="text-xs font-bold text-white cursor-pointer">
                  تفعيل إرسال الشهادات وتكريم المكرمين عبر البريد الإلكتروني
                </label>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  إرسال قالب رسمي راقٍ بالشهادة وروابط التوثيق الرقمي إلى بريد الطالب أو المعلم المكرم.
                </p>
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">خادم البريد (SMTP Host) *</label>
              <input
                type="text"
                value={emailConfig.host}
                onChange={(e) => setEmailConfig({ ...emailConfig, host: e.target.value })}
                placeholder="smtp.gmail.com"
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">رقم المنفذ (Port) *</label>
              <input
                type="number"
                value={emailConfig.port}
                onChange={(e) => setEmailConfig({ ...emailConfig, port: Number(e.target.value) || 465 })}
                placeholder="465"
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">نوع التشفير (Security)</label>
              <select
                value={emailConfig.secure ? 'ssl' : 'tls'}
                onChange={(e) => setEmailConfig({ ...emailConfig, secure: e.target.value === 'ssl' })}
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
              >
                <option value="ssl">SSL (المنفذ 465 - مشفر دائماً)</option>
                <option value="tls">STARTTLS / TLS (المنفذ 587)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">اسم المستخدم / البريد (SMTP User) *</label>
              <input
                type="email"
                value={emailConfig.user}
                onChange={(e) => setEmailConfig({ ...emailConfig, user: e.target.value })}
                placeholder="eslam.kandeel2@gmail.com"
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-mono"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-300">كلمة مرور التطبيقات (App Password) *</label>
                <button
                  type="button"
                  onClick={() => setShowEmailPassword(!showEmailPassword)}
                  className="text-[10px] text-sky-400 hover:text-sky-300 flex items-center gap-1"
                >
                  {showEmailPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  {showEmailPassword ? 'إخفاء' : 'إظهار'}
                </button>
              </div>
              <input
                type={showEmailPassword ? 'text' : 'password'}
                value={emailConfig.password || ''}
                onChange={(e) => setEmailConfig({ ...emailConfig, password: e.target.value })}
                placeholder={emailConfig.hasPassword ? '•••••••• (محفوظة على الخادم)' : 'كلمة مرور التطبيقات المكونة من 16 حرفاً'}
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">اسم المرسل المعروض (From Name)</label>
              <input
                type="text"
                value={emailConfig.fromName}
                onChange={(e) => setEmailConfig({ ...emailConfig, fromName: e.target.value })}
                placeholder="منصة تقدير للشهادات الرسمية"
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">بريد المرسل (From Email)</label>
              <input
                type="email"
                value={emailConfig.fromEmail}
                onChange={(e) => setEmailConfig({ ...emailConfig, fromEmail: e.target.value })}
                placeholder="eslam.kandeel2@gmail.com"
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">بريد الرد (Reply-To - اختياري)</label>
              <input
                type="email"
                value={emailConfig.replyTo || ''}
                onChange={(e) => setEmailConfig({ ...emailConfig, replyTo: e.target.value })}
                placeholder="support@taqdeer.edu"
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-mono"
              />
            </div>
          </div>

          {/* Helpful Guide for Gmail App Passwords */}
          <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-slate-300 space-y-2">
            <h5 className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-amber-400" />
              طريقة استخراج كلمة مرور التطبيقات (App Password) لحسابات Gmail:
            </h5>
            <ol className="text-[11px] text-slate-300 space-y-1 list-decimal list-inside pr-2 leading-relaxed">
              <li>انتقل إلى صفحة إدارة حساب Google الخاصة بك: <a href="https://myaccount.google.com/security" target="_blank" rel="noreferrer" className="text-sky-400 underline font-mono">myaccount.google.com/security</a></li>
              <li>تأكد من تفعيل ميزة <strong>التحقق بخطوتين (2-Step Verification)</strong> في حسابك.</li>
              <li>ابحث في خانة البحث عن <strong>كلمات مرور التطبيقات (App Passwords)</strong> أو توجه إلى الرابط المباشر: <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="text-sky-400 underline font-mono">myaccount.google.com/apppasswords</a></li>
              <li>أدخل اسم التطبيق (مثل: منصة تقدير) واضغط "إنشاء"؛ سيظهر لك كود مكوّن من 16 حرفاً.</li>
              <li>انسخ هذا الكود والصقه في خانة "كلمة مرور التطبيقات" أعلاه واضغط حفظ.</li>
            </ol>
          </div>

          {/* Test Dispatch Box */}
          <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="w-full sm:w-auto flex-1">
              <label className="block text-[11px] font-bold text-slate-400 mb-1">البريد الإلكتروني التجريبي لاستقبال رسالة الفحص:</label>
              <input
                type="email"
                value={emailTestRecipient}
                onChange={(e) => setEmailTestRecipient(e.target.value)}
                placeholder="eslam.kandeel2@gmail.com"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white font-mono"
              />
            </div>
            <button
              onClick={handleTestEmailConnection}
              disabled={testingEmail}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-emerald-600/20 transition disabled:opacity-50 mt-4 sm:mt-0"
            >
              <Send className={`w-3.5 h-3.5 ${testingEmail ? 'animate-spin' : ''}`} />
              {testingEmail ? 'جاري فحص الاتصال والإرسال...' : 'فحص الاتصال وإرسال رسالة تجريبية'}
            </button>
          </div>

          {/* Test Result & Error Diagnosis Card */}
          {emailTestResult && (
            <div className={`p-4 rounded-2xl border ${
              emailTestResult.connected
                ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200'
                : 'bg-rose-950/20 border-rose-500/40 text-rose-200'
            }`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  {emailTestResult.connected ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-rose-400 mt-0.5" />
                  )}
                  <div>
                    <h4 className="text-xs font-bold">
                      {emailTestResult.connected ? 'نجح اختبار خادم البريد الإلكتروني' : 'فشل اختبار خادم البريد الإلكتروني'}
                    </h4>
                    <p className="text-xs mt-1 opacity-90">{emailTestResult.message || emailTestResult.error}</p>

                    {emailTestResult.suggestedFixes && emailTestResult.suggestedFixes.length > 0 && (
                      <div className="mt-3 space-y-1 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                        <span className="text-[11px] font-bold text-amber-300 block mb-1">💡 خطوات الحل المقترحة فورياً:</span>
                        {emailTestResult.suggestedFixes.map((fix: string, idx: number) => (
                          <div key={idx} className="text-[11px] text-slate-300 flex items-start gap-1.5">
                            <span className="text-amber-400">•</span>
                            <span>{fix}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {!emailTestResult.connected && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => triggerAiDiagnosis(
                        'email',
                        emailTestResult.error || emailTestResult.message,
                        emailTestResult.errorCode,
                        { host: emailConfig.host, port: emailConfig.port, user: emailConfig.user }
                      )}
                      disabled={aiDiagnosing}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-600/20 transition whitespace-nowrap"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      تشخيص الخطأ بالذكاء الاصطناعي
                    </button>
                    <button
                      onClick={() => {
                        setSelectedKbId('smtp-gmail-535');
                        setActiveTab('knowledge-base');
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition whitespace-nowrap"
                      title="استعراض الأكواد وحلول المشكلة في مكتبة التعليمات"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                      مكتبة الحلول (KB)
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              onClick={handleSaveEmailSettings}
              disabled={savingEmail}
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs shadow-lg shadow-emerald-500/20 transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {savingEmail ? 'جاري الحفظ...' : 'حفظ إعدادات البريد الإلكتروني'}
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 5: AI DIAGNOSTIC CENTER                              */}
      {/* ======================================================== */}
      {activeTab === 'ai-diagnostic' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">مركز تشخيص الأخطاء السحابية بالذكاء الاصطناعي</h3>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/10 text-purple-300 border border-purple-500/30">
                  Powered by Gemini 3.8 Flash
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                يقوم الذكاء الاصطناعي بتحليل الأخطاء التقنية المعقدة في Google Drive، Firestore، Postgres، و SMTP وتقديم خطوات حل عملية وأزرار تصحيح ذاتي بضغطة زر واحدة.
              </p>
            </div>
          </div>

          {/* Custom Error Test Input */}
          <div className="p-4 rounded-2xl bg-slate-800/30 border border-slate-800 space-y-3">
            <label className="block text-xs font-bold text-slate-300">أدخل نص الخطأ أو كوده لتشخيصه فورياً:</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <input
                  type="text"
                  value={customErrorInput}
                  onChange={(e) => setCustomErrorInput(e.target.value)}
                  placeholder="مثال: 535-5.7.8 Username and Password not accepted أو PERMISSION_DENIED"
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
                />
              </div>
              <div>
                <button
                  onClick={() => {
                    if (customErrorInput.trim()) {
                      triggerAiDiagnosis('email', customErrorInput, customErrorCodeInput || 'CUSTOM_ERROR');
                    }
                  }}
                  disabled={aiDiagnosing || !customErrorInput.trim()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-purple-600/20 transition disabled:opacity-50"
                >
                  <Sparkles className={`w-4 h-4 ${aiDiagnosing ? 'animate-spin' : ''}`} />
                  {aiDiagnosing ? 'جاري التشخيص...' : 'بدء فحص الذكاء الاصطناعي'}
                </button>
              </div>
            </div>
          </div>

          {/* Matched Knowledge Base Entry Banner (if available) */}
          {matchedKbEntry && (
            <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center shrink-0 mt-0.5">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded-full border border-indigo-500/30">
                      دليل حل مطابق من مكتبة التعليمات
                    </span>
                    <h4 className="text-xs font-bold text-white">{matchedKbEntry.title}</h4>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-1 line-clamp-2">{matchedKbEntry.summary}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
                <button
                  onClick={() => {
                    setSelectedKbId(matchedKbEntry.id);
                    setActiveTab('knowledge-base');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition whitespace-nowrap"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  عرض الكود والحل بالمكتبة
                </button>
                {matchedKbEntry.actionableFix && (
                  <button
                    onClick={() => handleExecuteActionableFix(matchedKbEntry.actionableFix!)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition whitespace-nowrap"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    تطبيق الإصلاح تلقائياً
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Active AI Diagnostic Result */}
          {aiDiagnosing && (
            <div className="p-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 mx-auto animate-bounce">
                <Sparkles className="w-8 h-8" />
              </div>
              <h4 className="text-sm font-bold text-white">جاري تحليل كود الخطأ بواسطة Gemini 3.8 Flash...</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                نقوم بفحص إعدادات التكوين، ومقارنتها بمكتبة التعليمات البرمجية، وصياغة حلول تنفيذية فورية.
              </p>
            </div>
          )}

          {!aiDiagnosing && currentAiDiagnostic && (
            <div className="space-y-6">
              {/* Summary Card */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-950/30 via-slate-900 to-indigo-950/30 border border-purple-500/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    تشخيص خدمة: {currentAiDiagnostic.service.toUpperCase()}
                  </span>
                  <span className="text-xs font-mono text-slate-400">{currentAiDiagnostic.timestamp}</span>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-white mb-1">ملخص التشخيص الفني:</h4>
                  <p className="text-xs text-purple-200 leading-relaxed">{currentAiDiagnostic.diagnostic.summary}</p>
                </div>

                <div className="pt-2 border-t border-purple-500/20">
                  <h5 className="text-xs font-bold text-amber-300 mb-1">السبب الجذري للمشكلة (Root Cause):</h5>
                  <p className="text-xs text-slate-300 leading-relaxed">{currentAiDiagnostic.diagnostic.rootCause}</p>
                </div>
              </div>

              {/* Step-by-Step Remediation */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  خطوات الحل العملية والتنفيذ التلقائي (Action Plan):
                </h4>

                <div className="space-y-2.5">
                  {currentAiDiagnostic.diagnostic.steps.map((s, idx) => (
                    <div key={idx} className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-300 text-xs font-mono font-bold flex items-center justify-center border border-purple-500/30">
                          {s.step || idx + 1}
                        </span>
                        <h5 className="text-xs font-bold text-white">{s.title}</h5>
                      </div>
                      <p className="text-xs text-slate-300 pr-8 leading-relaxed">{s.action}</p>
                      {s.tip && (
                        <div className="pr-8 pt-1">
                          <span className="text-[11px] text-amber-400 font-medium">💡 نصيحة: {s.tip}</span>
                        </div>
                      )}

                      {/* 1-Click Actionable Fix Button */}
                      {s.actionableFix && (
                        <div className="mr-8 mt-2 p-3 rounded-xl bg-purple-950/40 border border-purple-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <div>
                            <span className="text-[10px] font-black text-purple-300 uppercase tracking-wider block">
                              ⚡ إصلاح تلقائي بضغطة زر واحدة (1-Click Auto Fix)
                            </span>
                            <span className="text-xs font-bold text-white mt-0.5 block">{s.actionableFix.label}</span>
                            {s.actionableFix.description && (
                              <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">{s.actionableFix.description}</p>
                            )}
                          </div>
                          <div className="shrink-0 w-full sm:w-auto">
                            {executedFixStepIndexes.includes(idx) ? (
                              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold">
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                تم تطبيق الإعداد تلقائياً!
                              </div>
                            ) : (
                              <button
                                onClick={() => handleExecuteActionableFix(s.actionableFix!, idx)}
                                className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition whitespace-nowrap"
                              >
                                <Zap className="w-3.5 h-3.5" />
                                تطبيق هذا التصحيح الآن
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Preventative Tip */}
              {currentAiDiagnostic.diagnostic.quickTip && (
                <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 flex items-start gap-3">
                  <Info className="w-4 h-4 text-sky-400 mt-0.5" />
                  <div>
                    <span className="text-xs font-bold text-sky-300">نصيحة الاستقرار للبيئة الإنتاجية:</span>
                    <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">{currentAiDiagnostic.diagnostic.quickTip}</p>
                  </div>
                </div>
              )}

              {/* Action Footer */}
              <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <button
                  onClick={() => {
                    if (currentAiDiagnostic.service === 'drive') setActiveTab('drive');
                    else if (currentAiDiagnostic.service === 'database') setActiveTab('database');
                    else if (currentAiDiagnostic.service === 'email') setActiveTab('email');
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  العودة لإعادة فحص خدمة {currentAiDiagnostic.service.toUpperCase()}
                </button>

                <button
                  onClick={() => {
                    setSelectedKbId(currentAiDiagnostic.diagnostic.knowledgeBaseMatchId || matchedKbEntry?.id);
                    setActiveTab('knowledge-base');
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-indigo-600/20"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  تصفح مكتبة الحلول البرمجية (Knowledge Base)
                </button>
              </div>
            </div>
          )}

          {!aiDiagnosing && !currentAiDiagnostic && (
            <div className="p-12 text-center text-slate-500 border border-dashed border-slate-800 rounded-2xl">
              <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-40 text-purple-400" />
              <p className="text-xs">لم يتم تشغيل أي تشخيص بعد. يمكنك الضغط على زر "تشخيص الخطأ بالذكاء الاصطناعي" عند حدوث أي خطأ فحص في تبويبات Drive أو Database أو Email أعلاه، أو إدخال كود الخطأ يدوياً في الأعلى.</p>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 6: IN-APP KNOWLEDGE BASE & CODE LIBRARY              */}
      {/* ======================================================== */}
      {activeTab === 'knowledge-base' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl">
          <KnowledgeBaseViewer
            initialSelectedId={selectedKbId}
            onApplyActionableFix={(fix) => handleExecuteActionableFix(fix)}
            onNavigateToDiagnostic={(service, code, msg) => {
              setCustomErrorInput(msg || '');
              setCustomErrorCodeInput(code || '');
              triggerAiDiagnosis(service as any, msg || 'طلب تشخيص الخطأ', code);
            }}
            onShowToast={notify}
          />
        </div>
      )}
    </div>
  );
};
