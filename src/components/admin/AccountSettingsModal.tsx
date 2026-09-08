import React, { useState, useEffect } from 'react';
import {
  X,
  Shield,
  Sliders,
  Award,
  CheckCircle2,
  Lock,
  Unlock,
  KeyRound,
  RotateCcw,
  Save,
  Crown,
  User,
  Zap,
  Layers,
  FileText,
  Sparkles,
  Cloud,
  ExternalLink,
  ShieldCheck,
  Database,
  Check,
  AlertTriangle,
  School,
  FileSpreadsheet,
  QrCode,
  Calendar,
  PenTool,
  Info
} from 'lucide-react';
import { AdminUserRecord, adminUpdateAccount, adminResetUserPassword } from '../../services/adminService';
import {
  UserFeatureFlags,
  UserDefaultSettings,
  DEFAULT_USER_FEATURE_FLAGS,
  ADMIN_FEATURE_FLAGS,
  SYSTEM_FEATURES_CATALOG,
  FeatureDefinition
} from '../../services/accountPermissionsService';
import { getSavedDefaultSettings } from '../../utils/defaultSettings';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  user: AdminUserRecord | null;
  onUserUpdated: (updatedUser: AdminUserRecord) => void;
  onShowToast: (msg: string) => void;
}

type ModalTab = 'features' | 'defaults' | 'profile';

export const AccountSettingsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  user,
  onUserUpdated,
  onShowToast,
}) => {
  if (!isOpen || !user) return null;

  const isPrimaryAdmin = user.userId === 'ADMIN-001';
  const [activeTab, setActiveTab] = useState<ModalTab>('features');

  // Form State - Features
  const [features, setFeatures] = useState<UserFeatureFlags>(() => {
    return {
      ...(user.role === 'admin' ? ADMIN_FEATURE_FLAGS : DEFAULT_USER_FEATURE_FLAGS),
      ...(user.features || {}),
    };
  });

  // Form State - Default Settings
  const [defaults, setDefaults] = useState<UserDefaultSettings>(() => {
    return {
      issuerTitle: user.defaultSettings?.issuerTitle || '',
      signatureTitle1: user.defaultSettings?.signatureTitle1 || '',
      signatureName1: user.defaultSettings?.signatureName1 || '',
      signatureTitle2: user.defaultSettings?.signatureTitle2 || '',
      signatureName2: user.defaultSettings?.signatureName2 || '',
      defaultCertificateType: user.defaultSettings?.defaultCertificateType || 'شهادة شكر وتقدير',
      defaultPaperSize: user.defaultSettings?.defaultPaperSize || 'a4',
      defaultOrientation: user.defaultSettings?.defaultOrientation || 'landscape',
      showQrCode: user.defaultSettings?.showQrCode !== undefined ? user.defaultSettings?.showQrCode : true,
      showIssueDate: user.defaultSettings?.showIssueDate !== undefined ? user.defaultSettings?.showIssueDate : true,
      defaultNotes: user.defaultSettings?.defaultNotes || '',
      customThemeColor: user.defaultSettings?.customThemeColor || '',
    };
  });

  // Form State - Profile
  const [displayName, setDisplayName] = useState(user.displayName || '');
  const [email, setEmail] = useState(user.email || '');
  const [role, setRole] = useState<'admin' | 'user'>(user.role || 'user');
  const [notes, setNotes] = useState(user.notes || '');

  // Reset Password State
  const [showPasswordBox, setShowPasswordBox] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [passwordResetting, setPasswordResetting] = useState(false);

  // Saving State
  const [saving, setSaving] = useState(false);

  // Sync state if user changes
  useEffect(() => {
    if (user) {
      setFeatures({
        ...(user.role === 'admin' ? ADMIN_FEATURE_FLAGS : DEFAULT_USER_FEATURE_FLAGS),
        ...(user.features || {}),
      });
      setDefaults({
        issuerTitle: user.defaultSettings?.issuerTitle || '',
        signatureTitle1: user.defaultSettings?.signatureTitle1 || '',
        signatureName1: user.defaultSettings?.signatureName1 || '',
        signatureTitle2: user.defaultSettings?.signatureTitle2 || '',
        signatureName2: user.defaultSettings?.signatureName2 || '',
        defaultCertificateType: user.defaultSettings?.defaultCertificateType || 'شهادة شكر وتقدير',
        defaultPaperSize: user.defaultSettings?.defaultPaperSize || 'a4',
        defaultOrientation: user.defaultSettings?.defaultOrientation || 'landscape',
        showQrCode: user.defaultSettings?.showQrCode !== undefined ? user.defaultSettings?.showQrCode : true,
        showIssueDate: user.defaultSettings?.showIssueDate !== undefined ? user.defaultSettings?.showIssueDate : true,
        defaultNotes: user.defaultSettings?.defaultNotes || '',
        customThemeColor: user.defaultSettings?.customThemeColor || '',
      });
      setDisplayName(user.displayName || '');
      setEmail(user.email || '');
      setRole(user.role || 'user');
      setNotes(user.notes || '');
      setShowPasswordBox(false);
      setNewPassword('');
    }
  }, [user]);

  // Toggle single feature
  const handleToggleFeature = (key: keyof UserFeatureFlags) => {
    if (isPrimaryAdmin && key === 'isAccountActive') return; // Cannot suspend primary admin
    setFeatures((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Quick Preset Handlers
  const handleApplyPreset = (preset: 'vip' | 'standard' | 'viewer' | 'frozen') => {
    if (preset === 'vip') {
      setFeatures({
        ...ADMIN_FEATURE_FLAGS,
        isAccountActive: true,
        maxCertificatesQuota: 0,
      });
      onShowToast('تم تطبيق باقة الصلاحيات الكاملة (VIP) ✨');
    } else if (preset === 'standard') {
      setFeatures({
        ...DEFAULT_USER_FEATURE_FLAGS,
        canBatchGenerate: false,
        isAccountActive: true,
      });
      onShowToast('تم تطبيق باقة الصلاحيات القياسية 📋');
    } else if (preset === 'viewer') {
      setFeatures({
        canIssueCertificates: false,
        canBatchGenerate: false,
        canExportPdf: true,
        canExportImage: true,
        canUseAi: false,
        canUseCloudDrive: false,
        canUseEmailDispatch: false,
        canUseSignatures: false,
        canVerifyCertificates: true,
        canAccessVault: false,
        canCustomizeTemplates: false,
        isAccountActive: true,
      });
      onShowToast('تم تطبيق باقة المشاهدة والتحقق فقط 👁️');
    } else if (preset === 'frozen') {
      if (isPrimaryAdmin) {
        onShowToast('محظور: لا يمكن تجميد حساب المدير الأساسي للمنظومة!');
        return;
      }
      setFeatures((prev) => ({
        ...prev,
        isAccountActive: false,
      }));
      onShowToast('تم تجميد الحساب 🔒');
    }
  };

  // Import system general defaults
  const handleImportSystemDefaults = () => {
    const sysDefaults = getSavedDefaultSettings();
    setDefaults({
      issuerTitle: sysDefaults.schoolName || '',
      signatureTitle1: sysDefaults.principalTitle || '',
      signatureName1: sysDefaults.principalName || '',
      signatureTitle2: sysDefaults.supervisorTitle || '',
      signatureName2: sysDefaults.supervisorName || '',
      defaultCertificateType: sysDefaults.certificateType || 'شهادة شكر وتقدير',
      defaultPaperSize: (sysDefaults.paperSize as any) || 'a4',
      defaultOrientation: (sysDefaults.orientation as any) || 'landscape',
      showQrCode: sysDefaults.showQrCode !== undefined ? sysDefaults.showQrCode : true,
      showIssueDate: sysDefaults.showIssueDate !== undefined ? sysDefaults.showIssueDate : true,
      defaultNotes: '',
      customThemeColor: '',
    });
    onShowToast('تم استيراد القيم الافتراضية العامة للنظام بنجاح 📥');
  };

  // Save All Changes
  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await adminUpdateAccount({
        targetUserId: user.userId,
        displayName: displayName.trim(),
        email: email.trim(),
        role: isPrimaryAdmin ? 'admin' : role,
        notes: notes.trim(),
        features,
        defaultSettings: defaults,
      });

      if (res.success && res.user) {
        const updatedRecord: AdminUserRecord = {
          ...user,
          displayName: res.user.displayName,
          email: res.user.email,
          role: res.user.role,
          features: res.user.features,
          defaultSettings: res.user.defaultSettings,
          notes: res.user.notes,
        };
        onUserUpdated(updatedRecord);
        onShowToast(`تم حفظ وتحديث إعدادات ومميزات حساب (${user.displayName}) بنجاح! 💾✨`);
        onClose();
      }
    } catch (e: any) {
      onShowToast(e.message || 'حدث خطأ أثناء حفظ الإعدادات');
    } finally {
      setSaving(false);
    }
  };

  // Reset Password Handler
  const handleResetPassword = async () => {
    if (!newPassword || newPassword.trim().length < 3) {
      onShowToast('يرجى كتابة كلمة مرور جديدة لا تقل عن 3 أحرف');
      return;
    }
    setPasswordResetting(true);
    try {
      await adminResetUserPassword({
        targetUserId: user.userId,
        newPassword: newPassword.trim(),
      });
      onShowToast(`تم تحديث كلمة المرور لحساب (${user.displayName}) بنجاح 🔑`);
      setNewPassword('');
      setShowPasswordBox(false);
    } catch (e: any) {
      onShowToast(e.message || 'فشل تحديث كلمة المرور');
    } finally {
      setPasswordResetting(false);
    }
  };

  // Icon selector helper
  const getFeatureIcon = (iconName: string) => {
    switch (iconName) {
      case 'Award': return <Award className="w-4 h-4 text-amber-400" />;
      case 'Layers': return <Layers className="w-4 h-4 text-indigo-400" />;
      case 'FileText': return <FileText className="w-4 h-4 text-rose-400" />;
      case 'Sparkles': return <Sparkles className="w-4 h-4 text-emerald-400" />;
      case 'Zap': return <Zap className="w-4 h-4 text-amber-400" />;
      case 'Cloud': return <Cloud className="w-4 h-4 text-sky-400" />;
      case 'ExternalLink': return <ExternalLink className="w-4 h-4 text-cyan-400" />;
      case 'CheckCircle2': return <CheckCircle2 className="w-4 h-4 text-teal-400" />;
      case 'ShieldCheck': return <ShieldCheck className="w-4 h-4 text-purple-400" />;
      case 'Database': return <Database className="w-4 h-4 text-blue-400" />;
      case 'Sliders': return <Sliders className="w-4 h-4 text-orange-400" />;
      case 'Lock': return <Lock className="w-4 h-4 text-rose-400" />;
      default: return <Sliders className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div
      id="account-settings-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700/80 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {/* Header */}
        <div className="bg-slate-950/80 border-b border-slate-800 p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-base sm:text-lg">
                  إدارة إعدادات ومميزات الحساب
                </h3>
                {isPrimaryAdmin && (
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">
                    المدير الأساسي
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                الحساب: <span className="font-bold text-slate-200">{user.displayName}</span> ({user.username || user.userId})
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-slate-950/50 border-b border-slate-800/80 px-4 sm:px-6 pt-2 flex items-center gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('features')}
            className={`pb-3 pt-2 px-3 text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'features'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>مميزات وصلاحيات النظام ({Object.values(features).filter((v) => v === true).length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('defaults')}
            className={`pb-3 pt-2 px-3 text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'defaults'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <School className="w-4 h-4" />
            <span>الإعدادات الافتراضية للشهادات</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`pb-3 pt-2 px-3 text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'profile'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="w-4 h-4" />
            <span>ملف الحساب والأمان</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: FEATURES & PERMISSIONS */}
          {activeTab === 'features' && (
            <div className="space-y-4 animate-fade-in">
              {/* Quick Presets Bar */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>باقات وقوالب الصلاحيات السريعة:</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('vip')}
                    className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-bold transition cursor-pointer"
                  >
                    كاملة (VIP)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('standard')}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-xs font-bold transition cursor-pointer"
                  >
                    قياسية (Standard)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('viewer')}
                    className="px-2.5 py-1 bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 rounded-lg text-xs font-bold transition cursor-pointer"
                  >
                    عرض فقط (Viewer)
                  </button>
                  {!isPrimaryAdmin && (
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('frozen')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        !features.isAccountActive
                          ? 'bg-rose-500 text-white'
                          : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      تجميد الحساب
                    </button>
                  )}
                </div>
              </div>

              {/* Status Alert if Frozen */}
              {!features.isAccountActive && (
                <div className="bg-rose-950/40 border border-rose-600/40 rounded-xl p-3 flex items-center gap-2.5 text-rose-300 text-xs">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                  <span>تنبيه: هذا الحساب مجمّد حالياً. لن يتمكن المستخدم من تسجيل الدخول أو استخدام المنظومة حتى إعادة التفعيل.</span>
                </div>
              )}

              {/* Feature Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {SYSTEM_FEATURES_CATALOG.map((feat) => {
                  const isEnabled = Boolean(features[feat.key]);
                  const isSuspensionToggle = feat.key === 'isAccountActive';

                  return (
                    <div
                      key={feat.key}
                      onClick={() => handleToggleFeature(feat.key)}
                      className={`p-3.5 rounded-xl border transition cursor-pointer select-none flex items-start justify-between gap-3 ${
                        isEnabled
                          ? isSuspensionToggle
                            ? 'bg-slate-800/60 border-slate-700 hover:border-slate-600'
                            : 'bg-amber-500/5 border-amber-500/30 hover:border-amber-500/50'
                          : 'bg-slate-900/50 border-slate-800/80 hover:border-slate-700 opacity-60'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            isEnabled ? 'bg-slate-800 border border-slate-700' : 'bg-slate-800/40'
                          }`}
                        >
                          {getFeatureIcon(feat.iconName)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold ${isEnabled ? 'text-white' : 'text-slate-400'}`}>
                              {feat.title}
                            </span>
                            <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded font-mono">
                              {feat.badge}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed line-clamp-2">
                            {feat.description}
                          </p>
                        </div>
                      </div>

                      {/* Custom Toggle Switch */}
                      <div
                        className={`w-10 h-6 rounded-full p-1 transition-colors flex-shrink-0 flex items-center ${
                          isEnabled ? 'bg-amber-500 justify-end' : 'bg-slate-700 justify-start'
                        }`}
                      >
                        <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: DEFAULT CERTIFICATE SETTINGS */}
          {activeTab === 'defaults' && (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-2">
                <div className="text-xs text-slate-300">
                  <span>تخصيص البيانات الافتراضية التي تظهر تلقائياً في مصمم الشهادات عند استخدام هذا الحساب:</span>
                </div>
                <button
                  type="button"
                  onClick={handleImportSystemDefaults}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                  <span>استيراد الإعدادات العامة</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Issuer Title / School Name */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <School className="w-3.5 h-3.5 text-amber-400" />
                    <span>الجهة المصدرة الافتراضية (المدرسة / الأكاديمية / المنشأة):</span>
                  </label>
                  <input
                    type="text"
                    value={defaults.issuerTitle || ''}
                    onChange={(e) => setDefaults((p) => ({ ...p, issuerTitle: e.target.value }))}
                    placeholder="مثال: ثانوية الأندلس النموذجية أو أكاديمية العلوم المتقدمة"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                {/* Primary Signature Title & Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <PenTool className="w-3.5 h-3.5 text-indigo-400" />
                    <span>مسمى الموقع الأول:</span>
                  </label>
                  <input
                    type="text"
                    value={defaults.signatureTitle1 || ''}
                    onChange={(e) => setDefaults((p) => ({ ...p, signatureTitle1: e.target.value }))}
                    placeholder="مثال: مدير المدرسة / المشرف الأكاديمي"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-indigo-400" />
                    <span>اسم الموقع الأول:</span>
                  </label>
                  <input
                    type="text"
                    value={defaults.signatureName1 || ''}
                    onChange={(e) => setDefaults((p) => ({ ...p, signatureName1: e.target.value }))}
                    placeholder="مثال: أ. عبدالله بن صالح"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                {/* Secondary Signature Title & Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <PenTool className="w-3.5 h-3.5 text-teal-400" />
                    <span>مسمى الموقع الثاني (اختياري):</span>
                  </label>
                  <input
                    type="text"
                    value={defaults.signatureTitle2 || ''}
                    onChange={(e) => setDefaults((p) => ({ ...p, signatureTitle2: e.target.value }))}
                    placeholder="مثال: وكيل الشؤون التعليمية"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-teal-400" />
                    <span>اسم الموقع الثاني (اختياري):</span>
                  </label>
                  <input
                    type="text"
                    value={defaults.signatureName2 || ''}
                    onChange={(e) => setDefaults((p) => ({ ...p, signatureName2: e.target.value }))}
                    placeholder="مثال: د. إبراهيم الخالد"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                {/* Certificate Type & Dimensions */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-amber-400" />
                    <span>نوع الشهادة الافتراضي:</span>
                  </label>
                  <select
                    value={defaults.defaultCertificateType || 'شهادة شكر وتقدير'}
                    onChange={(e) => setDefaults((p) => ({ ...p, defaultCertificateType: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                  >
                    <option value="شهادة شكر وتقدير">شهادة شكر وتقدير</option>
                    <option value="شهادة حضور دورة">شهادة حضور دورة تدريبية</option>
                    <option value="شهادة إتمام وتفوق">شهادة إتمام وتفوق</option>
                    <option value="شهادة تكريم وإنجاز">شهادة تكريم وإنجاز</option>
                    <option value="شهادة مشاركة فعالة">شهادة مشاركة فعالة</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-sky-400" />
                    <span>قياس الورق والاتجاه:</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={defaults.defaultPaperSize || 'a4'}
                      onChange={(e) => setDefaults((p) => ({ ...p, defaultPaperSize: e.target.value as any }))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-xs text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                    >
                      <option value="a4">A4 (قياسي)</option>
                      <option value="a3">A3 (كبير)</option>
                      <option value="letter">Letter</option>
                    </select>

                    <select
                      value={defaults.defaultOrientation || 'landscape'}
                      onChange={(e) => setDefaults((p) => ({ ...p, defaultOrientation: e.target.value as any }))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-xs text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                    >
                      <option value="landscape">أفقي (Landscape)</option>
                      <option value="portrait">رأسي (Portrait)</option>
                    </select>
                  </div>
                </div>

                {/* QR Code & Date Toggles */}
                <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <label
                    onClick={() => setDefaults((p) => ({ ...p, showQrCode: !p.showQrCode }))}
                    className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-xl cursor-pointer hover:border-slate-700 transition select-none"
                  >
                    <div className="flex items-center gap-2">
                      <QrCode className="w-4 h-4 text-purple-400" />
                      <span className="text-xs font-bold text-slate-300">إظهار رمز QR الذكي افتراضياً</span>
                    </div>
                    <div
                      className={`w-9 h-5 rounded-full p-0.5 flex items-center transition-colors ${
                        defaults.showQrCode ? 'bg-amber-500 justify-end' : 'bg-slate-700 justify-start'
                      }`}
                    >
                      <div className="w-4 h-4 rounded-full bg-white" />
                    </div>
                  </label>

                  <label
                    onClick={() => setDefaults((p) => ({ ...p, showIssueDate: !p.showIssueDate }))}
                    className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-xl cursor-pointer hover:border-slate-700 transition select-none"
                  >
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-bold text-slate-300">إظهار تاريخ الإصدار افتراضياً</span>
                    </div>
                    <div
                      className={`w-9 h-5 rounded-full p-0.5 flex items-center transition-colors ${
                        defaults.showIssueDate ? 'bg-amber-500 justify-end' : 'bg-slate-700 justify-start'
                      }`}
                    >
                      <div className="w-4 h-4 rounded-full bg-white" />
                    </div>
                  </label>
                </div>

                {/* Default Notes */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-slate-400" />
                    <span>ملاحظات ثابتة أو تذييل خاص بالشهادات الصادرة من هذا الحساب:</span>
                  </label>
                  <textarea
                    rows={2}
                    value={defaults.defaultNotes || ''}
                    onChange={(e) => setDefaults((p) => ({ ...p, defaultNotes: e.target.value }))}
                    placeholder="أي توجيهات أو رقم اعتماد أو نص يظهر في تذييل الشهادة..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PROFILE & SECURITY */}
          {activeTab === 'profile' && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* User ID (Immutable) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400">معرف الحساب الفريد (User ID):</label>
                  <input
                    type="text"
                    value={user.userId}
                    disabled
                    className="w-full bg-slate-950/50 border border-slate-800 text-slate-500 rounded-xl px-3 py-2 text-xs font-mono cursor-not-allowed"
                  />
                </div>

                {/* Username */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400">اسم المستخدم (Username):</label>
                  <input
                    type="text"
                    value={user.username || '—'}
                    disabled
                    className="w-full bg-slate-950/50 border border-slate-800 text-slate-500 rounded-xl px-3 py-2 text-xs font-mono cursor-not-allowed"
                  />
                </div>

                {/* Display Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">الاسم الظاهر الكامل:</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">البريد الإلكتروني:</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    dir="ltr"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>

                {/* Role */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">الرتبة والدور:</label>
                  <select
                    value={role}
                    disabled={isPrimaryAdmin}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="user">مستخدم عادي (User)</option>
                    <option value="admin">مدير نظام (Admin)</option>
                  </select>
                </div>

                {/* Verification status display */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">حالة التوثيق:</label>
                  <div className="p-2 bg-slate-950 border border-slate-800 rounded-xl flex items-center gap-2 text-xs">
                    {user.isVerified ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> موثق ومفعل
                      </span>
                    ) : (
                      <span className="text-rose-400 font-bold flex items-center gap-1">
                        <AlertTriangle className="w-4 h-4" /> معلق (غير مفعل)
                      </span>
                    )}
                  </div>
                </div>

                {/* Admin internal notes */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-300">ملاحظات إدارية داخلية حول هذا الحساب:</label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="سجل أي ملاحظات خاصة بالترخيص، الجهة، أو المراجعة..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Password Reset Section */}
              <div className="pt-4 border-t border-slate-800">
                {!showPasswordBox ? (
                  <button
                    type="button"
                    onClick={() => setShowPasswordBox(true)}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer"
                  >
                    <KeyRound className="w-4 h-4 text-amber-400" />
                    <span>تغيير / إعادة تعيين كلمة المرور لهذا الحساب</span>
                  </button>
                ) : (
                  <div className="p-4 bg-slate-950 border border-amber-500/30 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                        <KeyRound className="w-4 h-4" />
                        <span>تعيين كلمة مرور جديدة للحساب:</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowPasswordBox(false)}
                        className="text-slate-400 hover:text-white text-xs cursor-pointer"
                      >
                        إلغاء
                      </button>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-2">
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="أدخل كلمة المرور الجديدة (3 أحرف فأكثر)..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                      />
                      <button
                        type="button"
                        onClick={handleResetPassword}
                        disabled={passwordResetting || !newPassword}
                        className="w-full sm:w-auto px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black transition cursor-pointer disabled:opacity-50 whitespace-nowrap"
                      >
                        {passwordResetting ? 'جارٍ الحفظ...' : 'تأكيد التعيين'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-950/90 border-t border-slate-800 p-4 sm:p-5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            إلغاء
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 rounded-xl text-xs font-black shadow-lg shadow-amber-500/20 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'جارٍ حفظ الإعدادات...' : 'حفظ التغييرات وتطبيقها الآن'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
