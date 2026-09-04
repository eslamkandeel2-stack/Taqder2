import React, { useState, useEffect, useMemo } from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Users,
  UserCheck,
  UserX,
  UserPlus,
  KeyRound,
  Lock,
  Unlock,
  Settings,
  Sliders,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  Trash2,
  Save,
  RotateCcw,
  Check,
  Eye,
  EyeOff,
  School,
  FileText,
  Sparkles,
  ArrowRight,
  Database,
  Crown,
  Activity,
  Layers,
  Award,
  HardDrive,
  ExternalLink,
  Copy,
  FolderOpen
} from 'lucide-react';
import {
  AdminUserRecord,
  AdminStats,
  fetchAdminUsers,
  adminChangePassword,
  adminCreateUser,
  adminUpdateUserRole,
  adminToggleUserStatus,
  adminResetUserPassword,
  adminDeleteUser,
  fetchServerSystemConfig,
  saveServerSystemConfig,
  fetchServerDriveConfig,
  saveServerDriveConfig,
  testServerDriveConnection
} from '../services/adminService';
import { isUserAdmin, loginWithCredentials, UnifiedAccount } from '../services/unifiedAuthService';
import {
  SystemSettingsConfig,
  DEFAULT_SYSTEM_CONFIG,
  getSavedSystemConfig,
  saveSystemConfig,
  PlatformDriveSettings,
  getPlatformDriveSettings,
  savePlatformDriveSettings
} from '../utils/systemConfig';
import {
  DefaultCertificateSettings,
  FALLBACK_DEFAULT_SETTINGS,
  getSavedDefaultSettings,
  saveDefaultSettings
} from '../utils/defaultSettings';

interface Props {
  currentUser?: UnifiedAccount | null;
  onUserLoginSuccess?: (user: any) => void;
  onNavigateHome: () => void;
  onShowToast?: (message: string) => void;
  systemConfig: SystemSettingsConfig;
  onUpdateSystemConfig: (newConfig: SystemSettingsConfig) => void;
}

type AdminTab = 'overview' | 'users' | 'settings' | 'security';

export const AdminDashboard: React.FC<Props> = ({
  currentUser,
  onUserLoginSuccess,
  onNavigateHome,
  onShowToast,
  systemConfig,
  onUpdateSystemConfig,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  // Admin gate login state
  const [gateUsername, setGateUsername] = useState('Admin');
  const [gatePassword, setGatePassword] = useState('Admin');
  const [gateShowPassword, setGateShowPassword] = useState(false);
  const [gateLoading, setGateLoading] = useState(false);
  const [gateError, setGateError] = useState<string | null>(null);

  // Users management state
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    adminsCount: 0,
    regularUsersCount: 0,
    verifiedCount: 0,
    unverifiedCount: 0,
  });
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'admin' | 'user'>('all');
  const [userStatusFilter, setUserStatusFilter] = useState<'all' | 'verified' | 'pending'>('all');

  // Add User modal state
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'user'>('user');
  const [addUserLoading, setAddUserLoading] = useState(false);

  // Reset user password modal
  const [resetModalUser, setResetModalUser] = useState<AdminUserRecord | null>(null);
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  // Admin Change Password state
  const [currentAdminPassword, setCurrentAdminPassword] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [confirmAdminPassword, setConfirmAdminPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordChangeLoading, setPasswordChangeLoading] = useState(false);
  const [passwordChangeSuccess, setPasswordChangeSuccess] = useState<string | null>(null);
  const [passwordChangeError, setPasswordChangeError] = useState<string | null>(null);

  // Default System Settings state
  const [certSettings, setCertSettings] = useState<DefaultCertificateSettings>(() => getSavedDefaultSettings());
  const [localSysConfig, setLocalSysConfig] = useState<SystemSettingsConfig>(() => systemConfig || getSavedSystemConfig());
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSuccessMessage, setSettingsSuccessMessage] = useState<string | null>(null);

  // Platform Google Drive State
  const [platformDrive, setPlatformDrive] = useState<PlatformDriveSettings>(() => getPlatformDriveSettings());
  const [testingDrive, setTestingDrive] = useState(false);
  const [driveTestResult, setDriveTestResult] = useState<{ success: boolean; message: string; folderId?: string; folderUrl?: string } | null>(null);
  const [savingDrive, setSavingDrive] = useState(false);
  const [driveSuccessMessage, setDriveSuccessMessage] = useState<string | null>(null);

  const isAdmin = useMemo(() => isUserAdmin(currentUser), [currentUser]);

  // Toast notification helper
  const notify = (msg: string) => {
    if (onShowToast) {
      onShowToast(msg);
    }
  };

  // Load users & stats
  const loadUsersData = async () => {
    setLoadingUsers(true);
    try {
      const res = await fetchAdminUsers();
      setUsers(res.users);
      setStats(res.stats);
    } catch (e) {
      console.warn('Load users error:', e);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Load server-stored system configuration on mount
  const loadRemoteConfig = async () => {
    try {
      const serverConfig = await fetchServerSystemConfig();
      if (serverConfig) {
        if (serverConfig.systemConfig) {
          setLocalSysConfig((prev) => ({ ...prev, ...serverConfig.systemConfig }));
          onUpdateSystemConfig({ ...localSysConfig, ...serverConfig.systemConfig });
        }
        if (serverConfig.defaultCertificateSettings) {
          setCertSettings((prev) => ({ ...prev, ...serverConfig.defaultCertificateSettings }));
        }
      }
    } catch (e) {
      console.warn('Error loading remote config:', e);
    }

    try {
      const driveRes = await fetchServerDriveConfig();
      if (driveRes && driveRes.driveConfig) {
        setPlatformDrive(driveRes.driveConfig);
        savePlatformDriveSettings(driveRes.driveConfig);
      }
    } catch (e) {
      console.warn('Error loading remote drive config:', e);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadUsersData();
      loadRemoteConfig();
    }
  }, [isAdmin]);

  // Admin gate login handler
  const handleGateLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setGateLoading(true);
    setGateError(null);

    try {
      const res = await loginWithCredentials({
        usernameOrEmail: gateUsername.trim(),
        password: gatePassword.trim(),
      });

      if (res.success && res.account) {
        if (isUserAdmin(res.account)) {
          if (onUserLoginSuccess) {
            onUserLoginSuccess(res.account);
          }
          notify(`مرحباً بك يا مدير النظام (${res.account.displayName || res.account.username})! 🛡️✨`);
          loadUsersData();
        } else {
          setGateError('هذا الحساب ليس لديه صلاحيات مدير النظام (Role: Admin)');
        }
      } else {
        setGateError(res.message || 'بيانات الدخول غير صحيحة');
      }
    } catch (err: any) {
      setGateError(err.message || 'تعذر تسجيل الدخول، تأكد من اسم المستخدم وكلمة المرور');
    } finally {
      setGateLoading(false);
    }
  };

  // Handle Admin Password Change
  const handleChangeAdminPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordChangeError(null);
    setPasswordChangeSuccess(null);

    if (!newAdminPassword || newAdminPassword.trim().length < 3) {
      setPasswordChangeError('كلمة المرور الجديدة يجب ألا تقل عن 3 أحرف');
      return;
    }

    if (newAdminPassword !== confirmAdminPassword) {
      setPasswordChangeError('كلمة المرور الجديدة وتأكيدها غير متطابقين');
      return;
    }

    setPasswordChangeLoading(true);
    try {
      const res = await adminChangePassword({
        userId: currentUser?.userId || 'ADMIN-001',
        username: currentUser?.username || 'Admin',
        currentPassword: currentAdminPassword.trim() || undefined,
        newPassword: newAdminPassword.trim(),
      });

      setPasswordChangeSuccess(res.message || 'تم تحديث كلمة مرور المدير بنجاح!');
      notify('تم تغيير كلمة مرور المدير بنجاح! 🔒✨');
      setCurrentAdminPassword('');
      setNewAdminPassword('');
      setConfirmAdminPassword('');
    } catch (err: any) {
      setPasswordChangeError(err.message || 'فشل تغيير كلمة المرور');
    } finally {
      setPasswordChangeLoading(false);
    }
  };

  // Handle create new user
  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() && !newEmail.trim()) {
      notify('يرجى كتابة اسم المستخدم أو البريد الإلكتروني');
      return;
    }

    setAddUserLoading(true);
    try {
      const res = await adminCreateUser({
        username: newUsername.trim(),
        displayName: newDisplayName.trim() || newUsername.trim(),
        email: newEmail.trim(),
        password: newPassword.trim() || '123456',
        role: newRole,
      });

      notify(res.message || 'تم إنشاء الحساب بنجاح! 👤✨');
      setShowAddUserModal(false);
      setNewUsername('');
      setNewDisplayName('');
      setNewEmail('');
      setNewPassword('');
      setNewRole('user');
      await loadUsersData();
    } catch (err: any) {
      notify(err.message || 'فشل إنشاء المستخدم');
    } finally {
      setAddUserLoading(false);
    }
  };

  // Toggle user role
  const handleToggleRole = async (user: AdminUserRecord) => {
    const nextRole = user.role === 'admin' ? 'user' : 'admin';
    const confirmMsg =
      nextRole === 'admin'
        ? `ترقية المستخدم (${user.displayName}) إلى مدير نظام (Admin)؟ سيمتلك صلاحية الوصول لهذه اللوحة.`
        : `تخفيض المستخدم (${user.displayName}) إلى مستخدم عادي؟`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await adminUpdateUserRole({
        targetUserId: user.userId,
        role: nextRole,
      });
      notify(res.message);
      await loadUsersData();
    } catch (err: any) {
      notify(err.message || 'فشل تغيير الرتبة');
    }
  };

  // Toggle user active status
  const handleToggleStatus = async (user: AdminUserRecord) => {
    const nextStatus = !user.isVerified;
    try {
      const res = await adminToggleUserStatus({
        targetUserId: user.userId,
        isVerified: nextStatus,
      });
      notify(res.message);
      await loadUsersData();
    } catch (err: any) {
      notify(err.message || 'فشل تغيير حالة الحساب');
    }
  };

  // Reset user password
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalUser || !resetNewPassword || resetNewPassword.length < 3) {
      notify('يرجى إدخال كلمة مرور جديدة من 3 خانات على الأقل');
      return;
    }

    setResetLoading(true);
    try {
      const res = await adminResetUserPassword({
        targetUserId: resetModalUser.userId,
        newPassword: resetNewPassword.trim(),
      });
      notify(res.message);
      setResetModalUser(null);
      setResetNewPassword('');
    } catch (err: any) {
      notify(err.message || 'فشل إعادة تعيين كلمة المرور');
    } finally {
      setResetLoading(false);
    }
  };

  // Delete user
  const handleDeleteUser = async (user: AdminUserRecord) => {
    if (user.userId === 'ADMIN-001') {
      notify('لا يمكن حذف حساب المدير الأساسي للمنظومة!');
      return;
    }

    if (!window.confirm(`هل أنت متأكد من حذف حساب (${user.displayName}) نهائياً؟ هذا الإجراء لا يمكن التراجع عنه.`)) {
      return;
    }

    try {
      const res = await adminDeleteUser({ targetUserId: user.userId });
      notify(res.message);
      await loadUsersData();
    } catch (err: any) {
      notify(err.message || 'فشل حذف الحساب');
    }
  };

  // Save System & Default Certificate Settings
  const handleSaveSystemSettings = async () => {
    setSavingSettings(true);
    setSettingsSuccessMessage(null);
    try {
      // 1. Save locally
      saveSystemConfig(localSysConfig);
      saveDefaultSettings(certSettings);
      onUpdateSystemConfig(localSysConfig);

      // 2. Save to server
      const res = await saveServerSystemConfig({
        systemConfig: localSysConfig,
        defaultCertificateSettings: certSettings,
      });

      setSettingsSuccessMessage(res.message || 'تم حفظ ونشر الإعدادات الافتراضية بنجاح!');
      notify('تم حفظ ونشر الإعدادات الافتراضية للمنظومة بنجاح! ⚙️✨');
    } catch (err: any) {
      setSettingsSuccessMessage('تم حفظ الإعدادات محلياً بنجاح!');
      notify('تم الحفظ في الذاكرة المحلية بنجاح');
    } finally {
      setSavingSettings(false);
    }
  };

  // Platform Google Drive Configuration Handlers
  const handleSaveDriveConfig = async () => {
    setSavingDrive(true);
    setDriveSuccessMessage(null);
    try {
      savePlatformDriveSettings(platformDrive);
      const res = await saveServerDriveConfig(platformDrive);
      setDriveSuccessMessage(res.message || 'تم حفظ ونشر إعدادات حساب Google Drive بنجاح!');
      notify('تم تفعيل وحفظ حساب Google Drive المعتمد للمنصة! 💾✅');
    } catch (err: any) {
      savePlatformDriveSettings(platformDrive);
      setDriveSuccessMessage('تم الحفظ محلياً في المتصفح!');
      notify('تم الحفظ محلياً بنجاح');
    } finally {
      setSavingDrive(false);
    }
  };

  const handleTestDriveConnection = async () => {
    setTestingDrive(true);
    setDriveTestResult(null);
    try {
      const res = await testServerDriveConnection(platformDrive);
      setDriveTestResult({
        success: res.connected,
        message: res.message,
        folderId: res.folderId,
        folderUrl: res.folderUrl
      });
      if (res.connected) {
        notify('تم اختبار الاتصال بـ Google Drive بنجاح! ☁️✅');
      } else {
        notify(res.message || 'تنبيه بشأن الاتصال بدرايف');
      }
    } catch (err: any) {
      setDriveTestResult({
        success: false,
        message: err.message || 'فشل الاتصال بالخادم'
      });
      notify('فشل اختبار الاتصال بدرايف');
    } finally {
      setTestingDrive(false);
    }
  };

  // Reset to original factory defaults
  const handleResetToDefaults = () => {
    if (window.confirm('هل تريد استعادة الإعدادات الافتراضية الأصلية للمنظومة؟')) {
      setCertSettings(FALLBACK_DEFAULT_SETTINGS);
      setLocalSysConfig(DEFAULT_SYSTEM_CONFIG);
      saveDefaultSettings(FALLBACK_DEFAULT_SETTINGS);
      saveSystemConfig(DEFAULT_SYSTEM_CONFIG);
      onUpdateSystemConfig(DEFAULT_SYSTEM_CONFIG);
      notify('تمت استعادة الإعدادات المصنعية الأصلية بنجاح');
    }
  };

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = userSearchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        u.displayName?.toLowerCase().includes(q) ||
        u.username?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.userId?.toLowerCase().includes(q);

      const matchesRole =
        userRoleFilter === 'all' ||
        (userRoleFilter === 'admin' && u.role === 'admin') ||
        (userRoleFilter === 'user' && u.role !== 'admin');

      const matchesStatus =
        userStatusFilter === 'all' ||
        (userStatusFilter === 'verified' && u.isVerified) ||
        (userStatusFilter === 'pending' && !u.isVerified);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, userSearchQuery, userRoleFilter, userStatusFilter]);

  // ==========================================
  // VIEW: GUEST / UNAUTHORIZED ADMIN GATE
  // ==========================================
  if (!isAdmin) {
    return (
      <main id="admin_access_gate_container" className="min-h-[85vh] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 mb-3 shadow-inner">
              <Shield className="w-8 h-8" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white font-['Cairo']">
              بوابة الدخول الإداري
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 font-['Cairo']">
              لوحة تحكم مدير النظام محمية وتتطلب صلاحيات الإدارة (Role: Admin)
            </p>
          </div>

          {gateError && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{gateError}</span>
            </div>
          )}

          <form onSubmit={handleGateLogin} className="space-y-4 font-['Cairo']">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                اسم المستخدم الإداري (Username)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={gateUsername}
                  onChange={(e) => setGateUsername(e.target.value)}
                  placeholder="Admin"
                  required
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400 font-mono text-left"
                  dir="ltr"
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">الافتراضي: Admin</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                كلمة المرور (Password)
              </label>
              <div className="relative">
                <input
                  type={gateShowPassword ? 'text' : 'password'}
                  value={gatePassword}
                  onChange={(e) => setGatePassword(e.target.value)}
                  placeholder="•••••"
                  required
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400 font-mono text-left pl-10"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setGateShowPassword(!gateShowPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {gateShowPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">الافتراضي: Admin</p>
            </div>

            <button
              type="submit"
              disabled={gateLoading}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-sm transition shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {gateLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>جارٍ التحقق والمصادقة...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>دخول لوحة تحكم المدير</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-800 text-center">
            <button
              type="button"
              onClick={onNavigateHome}
              className="text-xs text-slate-400 hover:text-white inline-flex items-center gap-1.5 transition cursor-pointer"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>العودة للمحرر الرئيسي</span>
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ==========================================
  // VIEW: AUTHORIZED ADMIN DASHBOARD
  // ==========================================
  return (
    <div id="admin_dashboard_root" className="min-h-screen bg-slate-950 text-slate-100 font-['Cairo'] pb-16">
      {/* Top Header Banner */}
      <header className="bg-slate-900/90 border-b border-slate-800 sticky top-0 z-30 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-slate-950 shadow-md">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-white leading-tight">
                  لوحة تحكم مدير النظام
                </h1>
                <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-amber-400" />
                  <span>Admin</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">
                إدارة شاملة لحسابات المستخدمين وضبط إعدادات المنظومة الافتراضية
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadUsersData}
              disabled={loadingUsers}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              title="تحديث البيانات"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingUsers ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">تحديث</span>
            </button>

            <button
              type="button"
              onClick={onNavigateHome}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 border border-amber-500/30 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>العودة للمحرر</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-1 overflow-x-auto no-scrollbar border-t border-slate-800/80 pt-1 pb-1">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>نظرة عامة وإحصائيات</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
              activeTab === 'users'
                ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>إدارة حسابات المستخدمين ({stats.totalUsers})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
              activeTab === 'settings'
                ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>إعدادات النظام الافتراضية</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
              activeTab === 'security'
                ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>تغيير كلمة مرور المدير</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* ==========================================
            TAB 1: OVERVIEW & STATS
           ========================================== */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-fade-in">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 relative overflow-hidden">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-400 font-medium">إجمالي المستخدمين</span>
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white font-mono">{stats.totalUsers}</div>
                <p className="text-[10px] text-slate-500 mt-1">حسابات مسجلة في قاعدة البيانات</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 relative overflow-hidden">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-400 font-medium">المدراء المصرح لهم</span>
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                    <Crown className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-amber-300 font-mono">{stats.adminsCount}</div>
                <p className="text-[10px] text-slate-500 mt-1">لديهم صلاحية الإدارة وتعديل الإعدادات</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 relative overflow-hidden">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-400 font-medium">الحسابات الموثقة والمفعلة</span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                    <UserCheck className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">{stats.verifiedCount}</div>
                <p className="text-[10px] text-slate-500 mt-1">تم توثيقها وتأكيد بريدها الإلكتروني</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 relative overflow-hidden">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-400 font-medium">حسابات قيد التفعيل</span>
                  <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
                    <UserX className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-rose-400 font-mono">{stats.unverifiedCount}</div>
                <p className="text-[10px] text-slate-500 mt-1">بانتظار إدخال رمز التحقق أو التفعيل الإداري</p>
              </div>
            </div>

            {/* Admin Info Banner */}
            <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-indigo-950/40 border border-amber-500/30 rounded-2xl p-5 sm:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 text-xl font-black shrink-0">
                    👑
                  </div>
                  <div>
                    <h2 className="text-base font-black text-white">
                      جلسة الإدارة النشطة: {currentUser?.displayName || 'مدير النظام (Admin)'}
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5 font-mono">
                      User ID: {currentUser?.userId || 'ADMIN-001'} | Username: {currentUser?.username || 'Admin'} | Role: admin
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setActiveTab('security')}
                    className="flex-1 sm:flex-initial px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>تغيير كلمة المرور</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddUserModal(true)}
                    className="flex-1 sm:flex-initial px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 cursor-pointer border border-slate-700"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-amber-400" />
                    <span>إضافة مستخدم</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Actions Shortcuts */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div
                onClick={() => setActiveTab('users')}
                className="bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 hover:border-amber-500/40 rounded-2xl p-4 cursor-pointer transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center group-hover:scale-105 transition">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white group-hover:text-amber-300 transition">
                      إدارة الحسابات والرتب
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      ترقية المستخدمين، تفعيل وتوثيق الحسابات، وإعادة تعيين كلمات المرور
                    </p>
                  </div>
                </div>
              </div>

              <div
                onClick={() => setActiveTab('settings')}
                className="bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 hover:border-amber-500/40 rounded-2xl p-4 cursor-pointer transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center group-hover:scale-105 transition">
                    <School className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white group-hover:text-amber-300 transition">
                      الترويسات والهوية المؤسسية
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      تحديد اسم المنشأة، المسؤولين، الترويسات الرسمية، وقفل العناصر الثابتة
                    </p>
                  </div>
                </div>
              </div>

              <div
                onClick={() => setActiveTab('security')}
                className="bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 hover:border-amber-500/40 rounded-2xl p-4 cursor-pointer transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-105 transition">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white group-hover:text-amber-300 transition">
                      أمان حساب المدير (Admin)
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      تغيير كلمة المرور الافتراضية (Admin) وتأمين حساب المشرف الأساسي
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            TAB 2: USERS MANAGEMENT
           ========================================== */}
        {activeTab === 'users' && (
          <div className="space-y-4 animate-fade-in">
            {/* Filter & Action Toolbar */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  placeholder="بحث بالاسم، اسم المستخدم، البريد، أو المعرف..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pr-9 pl-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value as any)}
                  className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-400 cursor-pointer"
                >
                  <option value="all">جميع الرتب</option>
                  <option value="admin">المدراء فقط (Admin)</option>
                  <option value="user">المستخدمون العاديون (User)</option>
                </select>

                <select
                  value={userStatusFilter}
                  onChange={(e) => setUserStatusFilter(e.target.value as any)}
                  className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-400 cursor-pointer"
                >
                  <option value="all">جميع الحالات</option>
                  <option value="verified">المفعلون فقط</option>
                  <option value="pending">المعلقون فقط</option>
                </select>

                <button
                  type="button"
                  onClick={() => setShowAddUserModal(true)}
                  className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>إضافة مستخدم جديد</span>
                </button>
              </div>
            </div>

            {/* Users Table / List */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-800/80 text-slate-300 border-b border-slate-700/80 text-[11px] font-bold">
                    <tr>
                      <th className="p-3.5">المستخدم</th>
                      <th className="p-3.5">اسم المستخدم / المعرف</th>
                      <th className="p-3.5">البريد الإلكتروني</th>
                      <th className="p-3.5">الرتبة والدور</th>
                      <th className="p-3.5">حالة التفعيل</th>
                      <th className="p-3.5">تاريخ التسجيل</th>
                      <th className="p-3.5 text-center">إجراءات الإدارة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-500">
                          {loadingUsers ? 'جارٍ تحميل قائمة المستخدمين...' : 'لا يوجد مستخدمون مطابقون لمعايير البحث'}
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => {
                        const isPrimaryAdmin = u.userId === 'ADMIN-001';
                        return (
                          <tr key={u.userId} className="hover:bg-slate-800/40 transition">
                            <td className="p-3.5">
                              <div className="flex items-center gap-2.5">
                                {u.photoURL ? (
                                  <img
                                    src={u.photoURL}
                                    alt={u.displayName}
                                    className="w-8 h-8 rounded-full object-cover border border-slate-700"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-bold">
                                    {u.displayName?.charAt(0) || 'U'}
                                  </div>
                                )}
                                <div>
                                  <div className="font-bold text-white flex items-center gap-1.5">
                                    <span>{u.displayName}</span>
                                    {isPrimaryAdmin && (
                                      <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded-full font-bold">
                                        الأساسي
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="p-3.5 font-mono text-slate-300">
                              <div className="font-bold">{u.username || '—'}</div>
                              <div className="text-[10px] text-slate-500">{u.userId}</div>
                            </td>

                            <td className="p-3.5 font-mono text-slate-300 text-[11px]" dir="ltr">
                              {u.email || u.googleEmail || '—'}
                            </td>

                            <td className="p-3.5">
                              {u.role === 'admin' ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full">
                                  <Crown className="w-3 h-3 text-amber-400" />
                                  <span>مدير نظام</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded-full">
                                  <span>مستخدم عادي</span>
                                </span>
                              )}
                            </td>

                            <td className="p-3.5">
                              {u.isVerified ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                  <span>مفعل وموثق</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded-full">
                                  <AlertCircle className="w-3 h-3 text-rose-400" />
                                  <span>معلق (بانتظار التحقق)</span>
                                </span>
                              )}
                            </td>

                            <td className="p-3.5 text-slate-400 text-[11px] font-mono">
                              {u.createdAt ? new Date(u.createdAt).toLocaleDateString('ar-SA') : '—'}
                            </td>

                            <td className="p-3.5 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                {/* Toggle Role Button */}
                                <button
                                  type="button"
                                  onClick={() => handleToggleRole(u)}
                                  disabled={isPrimaryAdmin}
                                  className={`p-1.5 rounded-lg border text-xs transition cursor-pointer ${
                                    u.role === 'admin'
                                      ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30'
                                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                                  } disabled:opacity-30 disabled:cursor-not-allowed`}
                                  title={u.role === 'admin' ? 'تخفيض إلى مستخدم' : 'ترقية إلى مدير'}
                                >
                                  <Crown className="w-3.5 h-3.5" />
                                </button>

                                {/* Toggle Active Status Button */}
                                <button
                                  type="button"
                                  onClick={() => handleToggleStatus(u)}
                                  className={`p-1.5 rounded-lg border text-xs transition cursor-pointer ${
                                    u.isVerified
                                      ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                      : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/30'
                                  }`}
                                  title={u.isVerified ? 'تعطيل الحساب' : 'تفعيل الحساب'}
                                >
                                  {u.isVerified ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                                </button>

                                {/* Reset Password Button */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setResetModalUser(u);
                                    setResetNewPassword('');
                                  }}
                                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-lg text-xs transition cursor-pointer"
                                  title="إعادة تعيين كلمة المرور"
                                >
                                  <KeyRound className="w-3.5 h-3.5" />
                                </button>

                                {/* Delete User Button */}
                                {!isPrimaryAdmin && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteUser(u)}
                                    className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg text-xs transition cursor-pointer"
                                    title="حذف الحساب"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            TAB 3: SYSTEM DEFAULT CONFIGURATION
           ========================================== */}
        {activeTab === 'settings' && (
          <div className="space-y-6 animate-fade-in">
            {settingsSuccessMessage && (
              <div className="p-3.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{settingsSuccessMessage}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSettingsSuccessMessage(null)}
                  className="text-slate-400 hover:text-white text-xs"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Action Bar */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-white">التحكم في إعدادات النظام الافتراضية</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  هذه الإعدادات يتم تطبيقها تلقائياً على كافة الشهادات الجديدة وتعميمها على جميع المستخدمين
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetToDefaults}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                  <span>استعادة الإعدادات المصنعية</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveSystemSettings}
                  disabled={savingSettings}
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
                >
                  {savingSettings ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>حفظ وتعميم للمنظومة</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 1. Default Institutional Data */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                  <School className="w-4 h-4 text-amber-400" />
                  <h4 className="text-xs font-black text-white">الهوية المؤسسية والترويسات الافتراضية</h4>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    اسم المدرسة / المنشأة التعليمية الافتراضي
                  </label>
                  <input
                    type="text"
                    value={certSettings.schoolName}
                    onChange={(e) => setCertSettings({ ...certSettings, schoolName: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                    placeholder="مثال: ثانوية الملك فهد / إدارة التدريب والتعليم"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">مكان الإصدار الافتراضي</label>
                  <input
                    type="text"
                    value={certSettings.issuePlace}
                    onChange={(e) => setCertSettings({ ...certSettings, issuePlace: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                    placeholder="مثال: الرياض / المملكة العربية السعودية"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-300">أسطر الترويسة الرسمية الافتراضية</label>
                  <input
                    type="text"
                    value={certSettings.headerLine1}
                    onChange={(e) => setCertSettings({ ...certSettings, headerLine1: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                    placeholder="السطر الأول: المملكة العربية السعودية"
                  />
                  <input
                    type="text"
                    value={certSettings.headerLine2}
                    onChange={(e) => setCertSettings({ ...certSettings, headerLine2: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                    placeholder="السطر الثاني: وزارة التعليم"
                  />
                  <input
                    type="text"
                    value={certSettings.headerLine3}
                    onChange={(e) => setCertSettings({ ...certSettings, headerLine3: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                    placeholder="السطر الثالث: الإدارة العامة للتعليم بمنطقة..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    شعار الرؤية الوطنية الافتراضي
                  </label>
                  <input
                    type="text"
                    value={certSettings.headerVisionText}
                    onChange={(e) => setCertSettings({ ...certSettings, headerVisionText: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                    placeholder="رؤية المملكة 2030"
                  />
                </div>
              </div>

              {/* 2. Default Signatures & Officials */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                  <Award className="w-4 h-4 text-indigo-400" />
                  <h4 className="text-xs font-black text-white">المسؤولون والاعتمادات الرسمية الافتراضية</h4>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">مسمى المسؤول الأول</label>
                    <input
                      type="text"
                      value={certSettings.teacherTitle}
                      onChange={(e) => setCertSettings({ ...certSettings, teacherTitle: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                      placeholder="معلم المادة"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">اسم المسؤول الأول</label>
                    <input
                      type="text"
                      value={certSettings.teacherName}
                      onChange={(e) => setCertSettings({ ...certSettings, teacherName: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                      placeholder="أ. ..."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">مسمى المسؤول الثاني</label>
                    <input
                      type="text"
                      value={certSettings.principalTitle}
                      onChange={(e) => setCertSettings({ ...certSettings, principalTitle: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                      placeholder="مدير المدرسة"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">اسم المسؤول الثاني</label>
                    <input
                      type="text"
                      value={certSettings.principalName}
                      onChange={(e) => setCertSettings({ ...certSettings, principalName: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                      placeholder="د. ..."
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    وجهة باركود التوثيق الافتراضية
                  </label>
                  <select
                    value={localSysConfig.barcodeLinkTarget}
                    onChange={(e) =>
                      setLocalSysConfig({
                        ...localSysConfig,
                        barcodeLinkTarget: e.target.value as 'portal' | 'drive',
                      })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                  >
                    <option value="portal">بوابة التحقق الرقمية الرسمية للمنصة (/verify)</option>
                    <option value="drive">رابط ملف الشهادة الموثقة على Google Drive</option>
                  </select>
                </div>
              </div>

              {/* 3. Locked Elements (Institutional Protection) */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                  <Lock className="w-4 h-4 text-rose-400" />
                  <h4 className="text-xs font-black text-white">
                    عناصر القفل المؤسسي (Locked Elements)
                  </h4>
                </div>
                <p className="text-[11px] text-slate-400">
                  العناصر المحددة هنا سيتم قفلها للمستخدمين لمنع تغيير الثوابت المؤسسية إلا بإذن المدير:
                </p>

                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { key: 'schoolName', label: 'قفل اسم المنشأة' },
                    { key: 'headerLines', label: 'قفل الترويسات الرسمية' },
                    { key: 'logo', label: 'قفل الشعار الرسمي' },
                    { key: 'signatures', label: 'قفل التوقيعات والمسؤولين' },
                    { key: 'stamp', label: 'قفل الختم الرسمي' },
                    { key: 'verificationBox', label: 'قفل مربع التوثيق الرقمي' },
                    { key: 'frame', label: 'قفل نمط الإطار' },
                    { key: 'watermark', label: 'قفل العلامة المائية' },
                  ].map((item) => {
                    const isLocked = localSysConfig.lockedElements[item.key as keyof typeof localSysConfig.lockedElements];
                    return (
                      <label
                        key={item.key}
                        className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition cursor-pointer ${
                          isLocked
                            ? 'bg-rose-500/10 border-rose-500/40 text-rose-200'
                            : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={Boolean(isLocked)}
                          onChange={(e) =>
                            setLocalSysConfig({
                              ...localSysConfig,
                              lockedElements: {
                                ...localSysConfig.lockedElements,
                                [item.key]: e.target.checked,
                              },
                            })
                          }
                          className="w-4 h-4 rounded text-rose-500 focus:ring-0 focus:ring-offset-0 bg-slate-700 border-slate-600 cursor-pointer"
                        />
                        <span className="text-xs font-bold">{item.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* 4. System Feature Toggles */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                  <Sliders className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-xs font-black text-white">مفاتيح ميزات المنظومة (Feature Toggles)</h4>
                </div>
                <p className="text-[11px] text-slate-400">
                  التحكم في الميزات الذكية المفعلة لجميع مستخدمي المنظومة:
                </p>

                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { key: 'enableQrVerification', label: 'التوثيق بالباركود' },
                    { key: 'enableAiFeatures', label: 'المساعد الذكي AI' },
                    { key: 'enableSpellcheck', label: 'التدقيق اللغوي والإملائي' },
                    { key: 'enablePraiseBank', label: 'بنك عبارات الثناء' },
                    { key: 'enableAutoGenderInflection', label: 'التذكير والتأنيث التلقائي' },
                    { key: 'enableCloudAutoSync', label: 'المزامنة السحابية' },
                    { key: 'enableCrispVectorPdf', label: 'تصدير PDF المتجهي العالي' },
                    { key: 'enableSoundEffects', label: 'المؤثرات الصوتية' },
                  ].map((item) => {
                    const isEnabled = localSysConfig.features[item.key as keyof typeof localSysConfig.features];
                    return (
                      <label
                        key={item.key}
                        className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition cursor-pointer ${
                          isEnabled
                            ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-200'
                            : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:bg-slate-800'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={Boolean(isEnabled)}
                          onChange={(e) =>
                            setLocalSysConfig({
                              ...localSysConfig,
                              features: {
                                ...localSysConfig.features,
                                [item.key]: e.target.checked,
                              },
                            })
                          }
                          className="w-4 h-4 rounded text-emerald-500 focus:ring-0 focus:ring-offset-0 bg-slate-700 border-slate-600 cursor-pointer"
                        />
                        <span className="text-xs font-bold">{item.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* 5. Platform Default Google Drive Integration */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 lg:col-span-2">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                      <HardDrive className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-white flex items-center gap-2">
                        <span>ربط Google Drive الثابت كافتراضي لجميع المستخدمين</span>
                        {platformDrive.enabled && platformDrive.isDefaultForAllUsers && (
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                            نشط وافتراضي للجميع ✅
                          </span>
                        )}
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        يتيح توثيق ورفع كافة الشهادات الصادرة تلقائياً إلى حساب Google Drive موحد دون إلزام المستخدمين بتسجيل الدخول.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleTestDriveConnection}
                      disabled={testingDrive}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {testingDrive ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Activity className="w-3.5 h-3.5 text-amber-400" />
                      )}
                      <span>اختبار الاتصال بدرايف</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSaveDriveConfig}
                      disabled={savingDrive}
                      className="px-4 py-1.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
                    >
                      {savingDrive ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Save className="w-3.5 h-3.5" />
                      )}
                      <span>حفظ إعدادات درايف</span>
                    </button>
                  </div>
                </div>

                {driveSuccessMessage && (
                  <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                      <span>{driveSuccessMessage}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDriveSuccessMessage(null)}
                      className="text-slate-400 hover:text-white text-xs"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {driveTestResult && (
                  <div
                    className={`p-3.5 rounded-xl text-xs border ${
                      driveTestResult.success
                        ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                        : 'bg-amber-950/60 border-amber-500/40 text-amber-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2">
                        {driveTestResult.success ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <p className="font-bold">{driveTestResult.message}</p>
                          {driveTestResult.folderUrl && (
                            <a
                              href={driveTestResult.folderUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-amber-400 hover:underline mt-1 font-bold"
                            >
                              <FolderOpen className="w-3.5 h-3.5" />
                              <span>فتح مجلد الأرشفة والشهادات المعتمدة</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setDriveTestResult(null)}
                        className="text-slate-400 hover:text-white text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )}

                {/* Toggles */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <label className={`flex items-center gap-3 p-3 rounded-xl border transition cursor-pointer ${
                    platformDrive.enabled
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-200'
                      : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:bg-slate-800'
                  }`}>
                    <input
                      type="checkbox"
                      checked={platformDrive.enabled}
                      onChange={(e) => setPlatformDrive({ ...platformDrive, enabled: e.target.checked })}
                      className="w-4 h-4 rounded text-emerald-500 focus:ring-0 bg-slate-700 border-slate-600 cursor-pointer"
                    />
                    <div className="text-right">
                      <span className="block text-xs font-black">تفعيل ربط Google Drive</span>
                      <span className="block text-[10px] text-slate-400">تشغيل ميزة الأرشفة السحابية</span>
                    </div>
                  </label>

                  <label className={`flex items-center gap-3 p-3 rounded-xl border transition cursor-pointer ${
                    platformDrive.isDefaultForAllUsers
                      ? 'bg-amber-500/10 border-amber-500/40 text-amber-200'
                      : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:bg-slate-800'
                  }`}>
                    <input
                      type="checkbox"
                      checked={platformDrive.isDefaultForAllUsers}
                      onChange={(e) => setPlatformDrive({ ...platformDrive, isDefaultForAllUsers: e.target.checked })}
                      className="w-4 h-4 rounded text-amber-500 focus:ring-0 bg-slate-700 border-slate-600 cursor-pointer"
                    />
                    <div className="text-right">
                      <span className="block text-xs font-black">افتراضي لجميع المستخدمين</span>
                      <span className="block text-[10px] text-slate-400">دون الحاجة لتسجيل دخولهم بحساب شخصي</span>
                    </div>
                  </label>

                  <label className={`flex items-center gap-3 p-3 rounded-xl border transition cursor-pointer ${
                    platformDrive.fallbackToLocalArchive
                      ? 'bg-blue-500/10 border-blue-500/40 text-blue-200'
                      : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:bg-slate-800'
                  }`}>
                    <input
                      type="checkbox"
                      checked={platformDrive.fallbackToLocalArchive}
                      onChange={(e) => setPlatformDrive({ ...platformDrive, fallbackToLocalArchive: e.target.checked })}
                      className="w-4 h-4 rounded text-blue-500 focus:ring-0 bg-slate-700 border-slate-600 cursor-pointer"
                    />
                    <div className="text-right">
                      <span className="block text-xs font-black">أرشفة احتياطية فورية على السيرفر</span>
                      <span className="block text-[10px] text-slate-400">ضمان عدم ضياع الشهادات في أي ظرف</span>
                    </div>
                  </label>
                </div>

                {/* Input Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      البريد الإلكتروني المعتمد لـ Google Drive
                    </label>
                    <input
                      type="email"
                      value={platformDrive.accountEmail}
                      onChange={(e) => setPlatformDrive({ ...platformDrive, accountEmail: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-400 dir-ltr text-right"
                      placeholder="eslam.kandeel2@gmail.com"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      البريد الذي سيظهر للمستخدمين كحساب معتمد للأرشفة والتوثيق المباشر.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      اسم الحساب المعروض للمستخدمين
                    </label>
                    <input
                      type="text"
                      value={platformDrive.accountDisplayName}
                      onChange={(e) => setPlatformDrive({ ...platformDrive, accountDisplayName: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                      placeholder="حساب التوثيق المعتمد للمنظومة"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      اسم مجلد حفظ الشهادات على Google Drive
                    </label>
                    <input
                      type="text"
                      value={platformDrive.folderName}
                      onChange={(e) => setPlatformDrive({ ...platformDrive, folderName: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                      placeholder="منصة تقدير - شهادات التقدير والتوثيق"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      معرّف المجلد في درايف (Folder ID - اختياري)
                    </label>
                    <input
                      type="text"
                      value={platformDrive.folderId || ''}
                      onChange={(e) => setPlatformDrive({ ...platformDrive, folderId: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-400 dir-ltr text-right"
                      placeholder="اتركه فارغاً ليتم إنشاؤه تلقائياً"
                    />
                  </div>
                </div>

                {/* Google OAuth & API Credentials (Optional/Advanced) */}
                <details className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5">
                  <summary className="text-xs font-bold text-amber-400 cursor-pointer select-none">
                    إعدادات متقدمة: بيانات اعتماد Google Drive API (OAuth 2.0 Client & Refresh Token)
                  </summary>
                  <p className="text-[11px] text-slate-400 mt-2 mb-3">
                    عند إدخال Refresh Token لحساب ({platformDrive.accountEmail})، يتولى السيرفر تجديد مفاتيح الرفع دورياً ورفع الشهادات مباشرة إلى مجلد الدرايف الحقيقي لحسابك على Google دون تدخل يدوي.
                  </p>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">Client ID</label>
                      <input
                        type="text"
                        value={platformDrive.clientId || ''}
                        onChange={(e) => setPlatformDrive({ ...platformDrive, clientId: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono dir-ltr text-right"
                        placeholder="Google Cloud OAuth Client ID"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">Client Secret</label>
                      <input
                        type="password"
                        value={platformDrive.clientSecret || ''}
                        onChange={(e) => setPlatformDrive({ ...platformDrive, clientSecret: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono dir-ltr text-right"
                        placeholder="••••••••••••••••••••"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">Refresh Token</label>
                      <input
                        type="password"
                        value={platformDrive.refreshToken || ''}
                        onChange={(e) => setPlatformDrive({ ...platformDrive, refreshToken: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono dir-ltr text-right"
                        placeholder="1//••••••••••••••••••••"
                      />
                    </div>
                  </div>
                </details>
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            TAB 4: ADMIN PASSWORD & SECURITY
           ========================================== */}
        {activeTab === 'security' && (
          <div className="max-w-xl mx-auto space-y-6 animate-fade-in">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
              <div className="flex items-center gap-3.5 mb-6 pb-4 border-b border-slate-800">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <KeyRound className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white">
                    تغيير كلمة مرور مدير النظام (Admin)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    حساب المدير: <span className="text-amber-300 font-mono font-bold">Admin</span> (ADMIN-001)
                  </p>
                </div>
              </div>

              {passwordChangeSuccess && (
                <div className="mb-5 p-3.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{passwordChangeSuccess}</span>
                </div>
              )}

              {passwordChangeError && (
                <div className="mb-5 p-3.5 bg-rose-500/15 border border-rose-500/30 text-rose-300 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{passwordChangeError}</span>
                </div>
              )}

              <form onSubmit={handleChangeAdminPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    كلمة المرور الحالية (Current Password)
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentAdminPassword}
                      onChange={(e) => setCurrentAdminPassword(e.target.value)}
                      placeholder="الافتراضية: Admin"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 font-mono text-left pl-10"
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    إذا كان هذا أول دخول للمنظومة، كلمة المرور الافتراضية هي: <span className="font-mono text-amber-400">Admin</span>
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    كلمة المرور الجديدة (New Password)
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newAdminPassword}
                      onChange={(e) => setNewAdminPassword(e.target.value)}
                      placeholder="أدخل كلمة المرور الجديدة"
                      required
                      minLength={3}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 font-mono text-left pl-10"
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    تأكيد كلمة المرور الجديدة (Confirm Password)
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={confirmAdminPassword}
                      onChange={(e) => setConfirmAdminPassword(e.target.value)}
                      placeholder="أعد إدخال كلمة المرور الجديدة"
                      required
                      minLength={3}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 font-mono text-left"
                      dir="ltr"
                    />
                  </div>
                </div>

                {newAdminPassword && (
                  <div className="pt-1">
                    <div className="flex items-center justify-between text-[10px] mb-1">
                      <span className="text-slate-400">مستوى قوة كلمة المرور:</span>
                      <span
                        className={`font-bold ${
                          newAdminPassword.length >= 8
                            ? 'text-emerald-400'
                            : newAdminPassword.length >= 5
                            ? 'text-amber-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {newAdminPassword.length >= 8 ? 'قوية جداً 🛡️' : newAdminPassword.length >= 5 ? 'متوسطة ⚡' : 'قصيرة'}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          newAdminPassword.length >= 8
                            ? 'w-full bg-emerald-500'
                            : newAdminPassword.length >= 5
                            ? 'w-2/3 bg-amber-500'
                            : 'w-1/3 bg-rose-500'
                        }`}
                      />
                    </div>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={passwordChangeLoading}
                    className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs sm:text-sm transition shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {passwordChangeLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>جارٍ تشفير وحفظ كلمة المرور في قاعدة البيانات...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>حفظ وتحديث كلمة المرور الجديدة</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              <div className="mt-6 p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-[11px] text-slate-400 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  يتم تشفير وحفظ كلمة المرور مباشرة في قاعدة بيانات الخادم بنظام الـ Salt التشفيري الآمن، وستصبح سارية المفعول فوراً في عمليات تسجيل الدخول المستقبلية.
                </span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ==========================================
          MODAL: ADD NEW USER
         ========================================== */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-black text-white">إضافة مستخدم جديد للنظام</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddUserModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUserSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">اسم المستخدم (Username)</label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="مثال: Ahmed99"
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 font-mono text-left"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">الاسم المعروض (Display Name)</label>
                <input
                  type="text"
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  placeholder="مثال: أ. أحمد الغامدي"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">البريد الإلكتروني</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="ahmed@example.com"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 font-mono text-left"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">كلمة المرور المبدئية</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="123456"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 font-mono text-left"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">رتبة المستخدم (الدور)</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as any)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                >
                  <option value="user">مستخدم عادي (User)</option>
                  <option value="admin">مدير نظام (Admin)</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={addUserLoading}
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {addUserLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>إنشاء وتفعيل الحساب</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs transition cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: RESET USER PASSWORD
         ========================================== */}
      {resetModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-black text-white">إعادة تعيين كلمة مرور المستخدم</h3>
              </div>
              <button
                type="button"
                onClick={() => setResetModalUser(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              تحديد كلمة مرور جديدة للمستخدم: <span className="text-white font-bold">{resetModalUser.displayName}</span> ({resetModalUser.username || resetModalUser.userId})
            </p>

            <form onSubmit={handleResetPasswordSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">كلمة المرور الجديدة</label>
                <input
                  type="text"
                  value={resetNewPassword}
                  onChange={(e) => setResetNewPassword(e.target.value)}
                  placeholder="أدخل كلمة مرور جديدة لا تقل عن 3 أحرف"
                  required
                  minLength={3}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 font-mono text-left"
                  dir="ltr"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {resetLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>حفظ كلمة المرور الجديدة</span>
                </button>
                <button
                  type="button"
                  onClick={() => setResetModalUser(null)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs transition cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
