import React from 'react';
import {
  Flame,
  HardDrive,
  Mail,
  Save,
  Activity,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  RefreshCw,
  FolderCheck,
  Server,
  Shield,
  Key,
  Sparkles
} from 'lucide-react';
import {
  SystemDatabaseSettings,
  PlatformDriveSettings,
  PlatformEmailSettings
} from '../../utils/systemConfig';

interface CloudIntegrationSettingsSectionProps {
  dbSettings: SystemDatabaseSettings;
  setDbSettings: React.Dispatch<React.SetStateAction<SystemDatabaseSettings>>;
  driveSettings: PlatformDriveSettings;
  setDriveSettings: React.Dispatch<React.SetStateAction<PlatformDriveSettings>>;
  emailSettings: PlatformEmailSettings;
  setEmailSettings: React.Dispatch<React.SetStateAction<PlatformEmailSettings>>;
  
  isSavingDb: boolean;
  isTestingDb: boolean;
  onSaveDb: () => void;
  onTestDb: () => void;
  
  isSavingDrive: boolean;
  isTestingDrive: boolean;
  showDriveSecrets: boolean;
  setShowDriveSecrets: (val: boolean | ((prev: boolean) => boolean)) => void;
  onSaveDrive: () => void;
  onTestDrive: () => void;

  isSavingEmail: boolean;
  isTestingEmail: boolean;
  showEmailSecrets: boolean;
  setShowEmailSecrets: (val: boolean | ((prev: boolean) => boolean)) => void;
  onSaveEmail: () => void;
  onTestEmail: () => void;
  onDiagnoseError?: (service: 'drive' | 'database' | 'email' | 'ai', msg: string, code?: string) => void;
}

export const CloudIntegrationSettingsSection: React.FC<CloudIntegrationSettingsSectionProps> = ({
  dbSettings,
  setDbSettings,
  driveSettings,
  setDriveSettings,
  emailSettings,
  setEmailSettings,
  isSavingDb,
  isTestingDb,
  onSaveDb,
  onTestDb,
  isSavingDrive,
  isTestingDrive,
  showDriveSecrets,
  setShowDriveSecrets,
  onSaveDrive,
  onTestDrive,
  isSavingEmail,
  isTestingEmail,
  showEmailSecrets,
  setShowEmailSecrets,
  onSaveEmail,
  onTestEmail,
  onDiagnoseError
}) => {
  return (
    <div className="space-y-5">
      {/* SECTION HEADER */}
      <div className="bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent p-4 rounded-2xl border border-amber-500/30 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500 text-slate-950 shadow-sm">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-black text-sm text-slate-900">
              بيانات ربط السحابة الافتراضية للنظام (Cloud Core Infrastructure)
            </h3>
            <p className="text-[11px] text-slate-600 font-medium">
              عرض وحفظ وتعديل إعدادات الربط السحابي مع Google Cloud Firestore و Drive والبريد الافتراضي
            </p>
          </div>
        </div>
        <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
          إعدادات مركزية ☁️
        </span>
      </div>

      {/* 1. GOOGLE CLOUD FIRESTORE / FIREBASE CARD */}
      <div className="bg-white p-5 rounded-2xl border border-amber-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-extrabold text-xs sm:text-sm text-slate-900">
                بيانات ربط Google Cloud Firestore (Firebase)
              </h4>
              <p className="text-[11px] text-slate-500">
                قاعدة البيانات السحابية المركزية لتخزين الحسابات والشهادات والمزامنة الموحدة
              </p>
            </div>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
            dbSettings.provider === 'firestore'
              ? 'bg-amber-50 text-amber-800 border-amber-300'
              : 'bg-slate-100 text-slate-600 border-slate-200'
          }`}>
            {dbSettings.provider === 'firestore' ? 'مفعلة (Firestore)' : dbSettings.provider}
          </span>
        </div>

        {/* Enabled & Provider */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <span className="text-xs font-black text-slate-800 block">تفعيل قاعدة البيانات السحابية</span>
              <span className="text-[10px] text-slate-500">استخدام Firestore للتخزين والمزامنة</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={dbSettings.provider === 'firestore'}
                onChange={(e) => setDbSettings(prev => ({ ...prev, provider: e.target.checked ? 'firestore' : 'local' }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
            </label>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">مزود قاعدة البيانات (Database Provider)</label>
            <select
              value={dbSettings.provider}
              onChange={(e) => setDbSettings(prev => ({ ...prev, provider: e.target.value as any }))}
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-bold bg-white text-slate-800 focus:border-amber-500 focus:outline-hidden"
            >
              <option value="firestore">Google Cloud Firestore (Firebase)</option>
              <option value="mongodb">MongoDB Atlas (مخصص)</option>
              <option value="local">تخزين محلي مؤقت (Local Storage)</option>
            </select>
          </div>
        </div>

        {/* Firestore Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">معرّف المشروع (Firebase Project ID)</label>
            <input
              type="text"
              value={dbSettings.firestore?.projectId || ''}
              onChange={(e) => setDbSettings(prev => ({
                ...prev,
                firestore: { ...prev.firestore, projectId: e.target.value }
              }))}
              placeholder="taqdeer-platform-app"
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:border-amber-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">مفتاح التطبيق (Firebase Web API Key)</label>
            <input
              type="text"
              value={dbSettings.firestore?.apiKey || ''}
              onChange={(e) => setDbSettings(prev => ({
                ...prev,
                firestore: { ...prev.firestore, apiKey: e.target.value }
              }))}
              placeholder="AIzaSy..."
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:border-amber-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">نطاق المصادقة (Auth Domain)</label>
            <input
              type="text"
              value={dbSettings.firestore?.authDomain || ''}
              onChange={(e) => setDbSettings(prev => ({
                ...prev,
                firestore: { ...prev.firestore, authDomain: e.target.value }
              }))}
              placeholder="taqdeer-platform-app.firebaseapp.com"
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:border-amber-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">مستودع التخزين (Storage Bucket)</label>
            <input
              type="text"
              value={dbSettings.firestore?.storageBucket || ''}
              onChange={(e) => setDbSettings(prev => ({
                ...prev,
                firestore: { ...prev.firestore, storageBucket: e.target.value }
              }))}
              placeholder="taqdeer-platform-app.appspot.com"
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:border-amber-500 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 flex-wrap">
          {onDiagnoseError && (
            <button
              type="button"
              onClick={() => onDiagnoseError('database', 'فحص اتصال قاعدة بيانات Google Cloud Firestore', 'FIRESTORE_CHECK')}
              className="px-3 py-2 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>تشخيص الخطأ بالذكاء الاصطناعي 🤖</span>
            </button>
          )}

          <div className="flex items-center gap-2 mr-auto">
            <button
              type="button"
              disabled={isTestingDb}
              onClick={onTestDb}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
            >
              <Activity className={`w-3.5 h-3.5 text-amber-600 ${isTestingDb ? 'animate-spin' : ''}`} />
              <span>{isTestingDb ? 'جاري الفحص...' : 'فحص اتصال Firestore'}</span>
            </button>

            <button
              type="button"
              disabled={isSavingDb}
              onClick={onSaveDb}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Save className={`w-3.5 h-3.5 ${isSavingDb ? 'animate-spin' : ''}`} />
              <span>{isSavingDb ? 'جاري الحفظ...' : 'حفظ إعدادات Firestore'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. GOOGLE DRIVE DEFAULT FOR ALL USERS CARD */}
      <div className="bg-white p-5 rounded-2xl border border-sky-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-sky-100 text-sky-700">
              <HardDrive className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-extrabold text-xs sm:text-sm text-slate-900">
                بيانات ربط Google Drive الثابت كافتراضي لجميع المستخدمين
              </h4>
              <p className="text-[11px] text-slate-500">
                الحساب المركزي ومجلد الأرشفة المشترك لحفظ وتوثيق الشهادات تلقائياً لجميع المستخدمين
              </p>
            </div>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
            driveSettings.enabled
              ? 'bg-sky-50 text-sky-800 border-sky-300'
              : 'bg-slate-100 text-slate-600 border-slate-200'
          }`}>
            {driveSettings.enabled ? 'مفعل كافتراضي' : 'معطل'}
          </span>
        </div>

        {/* Toggles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <span className="text-xs font-black text-slate-800 block">تفعيل حساب Drive الموحد للنظام</span>
              <span className="text-[10px] text-slate-500">توجيه حفظ الشهادات للحساب المركزي</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={driveSettings.enabled}
                onChange={(e) => setDriveSettings(prev => ({ ...prev, enabled: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <span className="text-xs font-black text-slate-800 block">جعله الحساب الافتراضي لكافة المستخدمين</span>
              <span className="text-[10px] text-slate-500">عدم مطالبة المستخدمين بتسجيل دخول منفصل</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={driveSettings.isDefaultForAllUsers}
                onChange={(e) => setDriveSettings(prev => ({ ...prev, isDefaultForAllUsers: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600"></div>
            </label>
          </div>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">البريد الإلكتروني لحساب Drive</label>
            <input
              type="email"
              value={driveSettings.accountEmail || ''}
              onChange={(e) => setDriveSettings(prev => ({ ...prev, accountEmail: e.target.value }))}
              placeholder="certificates-archive@domain.com"
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:border-sky-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">اسم المجلد الافتراضي (Folder Name)</label>
            <input
              type="text"
              value={driveSettings.folderName || ''}
              onChange={(e) => setDriveSettings(prev => ({ ...prev, folderName: e.target.value }))}
              placeholder="مكتبة شهادات تقدير المعتمدة"
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:border-sky-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">معرّف المجلد على Drive (Folder ID)</label>
            <input
              type="text"
              value={driveSettings.folderId || ''}
              onChange={(e) => setDriveSettings(prev => ({ ...prev, folderId: e.target.value }))}
              placeholder="1A2B3C_folder_id_from_url"
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:border-sky-500 focus:outline-hidden"
            />
          </div>
        </div>

        {/* OAuth / Service Credentials Section */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-sky-600" />
              بيانات الاعتماد السحابية (OAuth Client / Service Account)
            </span>
            <button
              type="button"
              onClick={() => setShowDriveSecrets(prev => !prev)}
              className="text-[11px] text-sky-700 font-bold hover:underline flex items-center gap-1 cursor-pointer"
            >
              {showDriveSecrets ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              <span>{showDriveSecrets ? 'إخفاء الحقول الحساسة' : 'عرض وتعديل المفاتيح'}</span>
            </button>
          </div>

          {showDriveSecrets && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">Client ID (OAuth 2.0)</label>
                <input
                  type="text"
                  value={driveSettings.clientId || ''}
                  onChange={(e) => setDriveSettings(prev => ({ ...prev, clientId: e.target.value }))}
                  placeholder="xxxx.apps.googleusercontent.com"
                  className="w-full p-2 rounded-lg border border-slate-200 text-[11px] font-mono text-slate-800 bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">Client Secret (سر العميل)</label>
                <input
                  type="password"
                  value={driveSettings.clientSecret || ''}
                  onChange={(e) => setDriveSettings(prev => ({ ...prev, clientSecret: e.target.value }))}
                  placeholder="GOCSPX-xxxx"
                  className="w-full p-2 rounded-lg border border-slate-200 text-[11px] font-mono text-slate-800 bg-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold text-slate-600 mb-1">Refresh Token (رمز التحديث الدائم لجميع المستخدمين)</label>
                <input
                  type="password"
                  value={driveSettings.refreshToken || ''}
                  onChange={(e) => setDriveSettings(prev => ({ ...prev, refreshToken: e.target.value }))}
                  placeholder="1//04xxxx..."
                  className="w-full p-2 rounded-lg border border-slate-200 text-[11px] font-mono text-slate-800 bg-white"
                />
              </div>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 flex-wrap">
          {onDiagnoseError && (
            <button
              type="button"
              onClick={() => onDiagnoseError('drive', 'فحص اتصال Google Drive الافتراضي للنظام', 'DRIVE_CHECK')}
              className="px-3 py-2 bg-sky-50 hover:bg-sky-100 border border-sky-300 text-sky-900 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-sky-600" />
              <span>تشخيص الخطأ بالذكاء الاصطناعي 🤖</span>
            </button>
          )}

          <div className="flex items-center gap-2 mr-auto">
            <button
              type="button"
              disabled={isTestingDrive}
              onClick={onTestDrive}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
            >
              <Activity className={`w-3.5 h-3.5 text-sky-600 ${isTestingDrive ? 'animate-spin' : ''}`} />
              <span>{isTestingDrive ? 'جاري الفحص...' : 'فحص اتصال Google Drive'}</span>
            </button>

            <button
              type="button"
              disabled={isSavingDrive}
              onClick={onSaveDrive}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-black rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Save className={`w-3.5 h-3.5 ${isSavingDrive ? 'animate-spin' : ''}`} />
              <span>{isSavingDrive ? 'جاري الحفظ...' : 'حفظ إعدادات Drive الافتراضي'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. PLATFORM DEFAULT EMAIL CARD */}
      <div className="bg-white p-5 rounded-2xl border border-indigo-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-extrabold text-xs sm:text-sm text-slate-900">
                بيانات البريد الإلكتروني الافتراضي للنظام (System Default Email)
              </h4>
              <p className="text-[11px] text-slate-500">
                البريد المعتمد لإرسال إشعارات التوثيق، روابط الشهادات، ورموز التحقق للمستفيدين
              </p>
            </div>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
            emailSettings.enabled
              ? 'bg-indigo-50 text-indigo-800 border-indigo-300'
              : 'bg-slate-100 text-slate-600 border-slate-200'
          }`}>
            {emailSettings.enabled ? 'مفعل' : 'معطل'}
          </span>
        </div>

        {/* Toggles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <span className="text-xs font-black text-slate-800 block">تفعيل خادم البريد للنظام</span>
              <span className="text-[10px] text-slate-500">تمكين إرسال الرسائل والشهادات عبر الإيميل</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={emailSettings.enabled}
                onChange={(e) => setEmailSettings(prev => ({ ...prev, enabled: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">مزود خدمة البريد (Email Provider)</label>
            <select
              value={emailSettings.provider}
              onChange={(e) => setEmailSettings(prev => ({ ...prev, provider: e.target.value as any }))}
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-bold bg-white text-slate-800 focus:border-indigo-500 focus:outline-hidden"
            >
              <option value="smtp">خادم SMTP مخصص</option>
              <option value="gmail">Google Workspace / Gmail</option>
              <option value="resend">Resend API</option>
              <option value="sendgrid">SendGrid API</option>
              <option value="simulated">إرسال تجريبي محاكي (Sandbox)</option>
            </select>
          </div>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">بريد المرسل (From Email)</label>
            <input
              type="email"
              value={emailSettings.fromEmail || ''}
              onChange={(e) => setEmailSettings(prev => ({ ...prev, fromEmail: e.target.value }))}
              placeholder="no-reply@taqdeer.edu.sa"
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">اسم المرسل الظاهر (From Name)</label>
            <input
              type="text"
              value={emailSettings.fromName || ''}
              onChange={(e) => setEmailSettings(prev => ({ ...prev, fromName: e.target.value }))}
              placeholder="منصة تقدير للشهادات المعتمدة"
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">خادم البريد (SMTP Host)</label>
            <input
              type="text"
              value={emailSettings.host || ''}
              onChange={(e) => setEmailSettings(prev => ({ ...prev, host: e.target.value }))}
              placeholder="smtp.gmail.com"
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Port & Credentials Section */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-indigo-600" />
              بيانات الدخول والمنفذ والتحقق (SMTP Port & Auth)
            </span>
            <button
              type="button"
              onClick={() => setShowEmailSecrets(prev => !prev)}
              className="text-[11px] text-indigo-700 font-bold hover:underline flex items-center gap-1 cursor-pointer"
            >
              {showEmailSecrets ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              <span>{showEmailSecrets ? 'إخفاء كلمة المرور' : 'عرض وتعديل كلمة المرور'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-1">المنفذ (Port)</label>
              <input
                type="number"
                value={emailSettings.port || 465}
                onChange={(e) => setEmailSettings(prev => ({ ...prev, port: parseInt(e.target.value, 10) || 465 }))}
                placeholder="465 أو 587"
                className="w-full p-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-800 bg-white"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-1">اسم المستخدم (User / Account)</label>
              <input
                type="text"
                value={emailSettings.user || ''}
                onChange={(e) => setEmailSettings(prev => ({ ...prev, user: e.target.value }))}
                placeholder="system-notifications@domain.com"
                className="w-full p-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-800 bg-white"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-1">كلمة مرور التطبيق (App Password)</label>
              <input
                type={showEmailSecrets ? "text" : "password"}
                value={emailSettings.password || ''}
                onChange={(e) => setEmailSettings(prev => ({ ...prev, password: e.target.value }))}
                placeholder="••••••••••••••••"
                className="w-full p-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-800 bg-white"
              />
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 flex-wrap">
          {onDiagnoseError && (
            <button
              type="button"
              onClick={() => onDiagnoseError('email', 'فحص اتصال خادم البريد الافتراضي للنظام', 'EMAIL_CHECK')}
              className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-300 text-indigo-900 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>تشخيص الخطأ بالذكاء الاصطناعي 🤖</span>
            </button>
          )}

          <div className="flex items-center gap-2 mr-auto">
            <button
              type="button"
              disabled={isTestingEmail}
              onClick={onTestEmail}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
            >
              <Activity className={`w-3.5 h-3.5 text-indigo-600 ${isTestingEmail ? 'animate-spin' : ''}`} />
              <span>{isTestingEmail ? 'جاري الفحص...' : 'فحص خادم البريد'}</span>
            </button>

            <button
              type="button"
              disabled={isSavingEmail}
              onClick={onSaveEmail}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Save className={`w-3.5 h-3.5 ${isSavingEmail ? 'animate-spin' : ''}`} />
              <span>{isSavingEmail ? 'جاري الحفظ...' : 'حفظ بيانات البريد الافتراضي'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
