import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  Users,
  UserCheck,
  UserX,
  UserPlus,
  Crown,
  Settings,
  Sliders,
  Bell,
  Lock,
  Unlock,
  KeyRound,
  Mail,
  Search,
  Filter,
  RefreshCw,
  Trash2,
  Edit3,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileSpreadsheet,
  Download,
  Database,
  Server,
  Activity,
  Layers,
  Sparkles,
  Award,
  Stamp,
  FileText,
  Save,
  RotateCcw,
  Check,
  Info,
  ChevronDown,
  ExternalLink,
  Eye,
  LogOut,
  UserCog
} from 'lucide-react';
import { AdminUserRecord, UserRole, AccountStatus, SystemAdminStats, SystemAnnouncement, CertificateData } from '../types';
import {
  isUserSystemAdmin,
  getDesignatedManagers,
  saveDesignatedManagers,
  assignSystemManager,
  removeSystemManager,
  fetchAllUsersForAdmin,
  updateUserRoleAdmin,
  updateUserStatusAdmin,
  createNewUserAdmin,
  deleteUserAdmin,
  getSystemAnnouncement,
  saveSystemAnnouncement,
  AdminManagerItem
} from '../services/adminService';
import { UnifiedAccount, isMasterAdminEmail, MASTER_ADMIN_EMAILS } from '../services/unifiedAuthService';
import {
  DefaultCertificateSettings,
  DEFAULT_SETTINGS,
  getSavedDefaultSettings,
  saveDefaultSettings,
  resetDefaultSettingsToFactory
} from '../utils/defaultSettings';
import {
  SystemSettingsConfig,
  DEFAULT_SYSTEM_CONFIG,
  getSavedSystemConfig,
  saveSystemConfig,
  toggleSystemFeature,
  isFeatureEnabled
} from '../utils/systemConfig';
import { TEMPLATE_PRESETS } from '../data/templates';

interface Props {
  currentUser?: UnifiedAccount | null;
  onNavigateToTab: (tab: any) => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const AdminControlPanel: React.FC<Props> = ({
  currentUser,
  onNavigateToTab,
  onShowToast
}) => {
  // Navigation sub-tabs within Admin Panel
  const [activeAdminSubTab, setActiveAdminSubTab] = useState<
    'users' | 'managers' | 'defaults' | 'policies' | 'telemetry'
  >('users');

  // Users State
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [stats, setStats] = useState<SystemAdminStats | null>(null);
  const [isLoadingUsers, setIsLoadingUsers] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');

  // Managers State
  const [managersList, setManagersList] = useState<AdminManagerItem[]>(() => getDesignatedManagers());
  const [newManagerInput, setNewManagerInput] = useState<string>('');
  const [newManagerRole, setNewManagerRole] = useState<UserRole>('admin');
  const [newManagerName, setNewManagerName] = useState<string>('');
  const [isAssigningManager, setIsAssigningManager] = useState<boolean>(false);

  // System Default Settings State
  const [defaultSettings, setDefaultSettings] = useState<DefaultCertificateSettings>(() => getSavedDefaultSettings());
  const [isSavingDefaults, setIsSavingDefaults] = useState<boolean>(false);

  // System Config & Policies State
  const [systemConfig, setSystemConfig] = useState<SystemSettingsConfig>(() => getSavedSystemConfig());
  
  // System Announcement State
  const [announcement, setAnnouncement] = useState<SystemAnnouncement>(() => {
    const existing = getSystemAnnouncement();
    return existing || {
      id: 'announcement_' + Date.now(),
      enabled: false,
      message: 'مرحباً بكم في منصة تقدير الرسمية لإصدار الشهادات والتوثيق المعتمد 🎓',
      type: 'info',
      closable: true,
      updatedAt: new Date().toISOString(),
      updatedBy: 'المدير العام'
    };
  });

  // Modal State for adding new user
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState<boolean>(false);
  const [newUserForm, setNewUserForm] = useState({
    username: '',
    email: '',
    displayName: '',
    password: '',
    role: 'user' as UserRole,
    isVerified: true,
    notes: ''
  });

  // Modal State for editing a user
  const [editingUser, setEditingUser] = useState<AdminUserRecord | null>(null);
  const [editUserForm, setEditUserForm] = useState({
    displayName: '',
    username: '',
    email: '',
    role: 'user' as UserRole,
    status: 'active' as AccountStatus,
    isBlocked: false,
    isVerified: true,
    notes: ''
  });

  // Load users data
  const loadUsersData = async () => {
    setIsLoadingUsers(true);
    try {
      const data = await fetchAllUsersForAdmin({
        search: searchQuery,
        role: selectedRoleFilter,
        status: selectedStatusFilter
      });
      setUsers(data.users);
      setStats(data.stats);
    } catch (e) {
      console.error('Error loading users:', e);
      onShowToast('حدث خطأ أثناء تحميل بيانات الحسابات', 'error');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    loadUsersData();
  }, [searchQuery, selectedRoleFilter, selectedStatusFilter]);

  // Sync managers list
  const refreshManagers = () => {
    setManagersList(getDesignatedManagers());
  };

  // Filtered Users List for display
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchSearch =
        !searchQuery ||
        (u.displayName && u.displayName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (u.googleEmail && u.googleEmail.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (u.username && u.username.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (u.userId && u.userId.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchRole =
        selectedRoleFilter === 'all' ||
        (selectedRoleFilter === 'admin' && (u.role === 'admin' || u.role === 'super_admin')) ||
        u.role === selectedRoleFilter;

      const matchStatus =
        selectedStatusFilter === 'all' ||
        (selectedStatusFilter === 'active' && u.isVerified && !u.isBlocked) ||
        (selectedStatusFilter === 'pending' && !u.isVerified && !u.isBlocked) ||
        (selectedStatusFilter === 'blocked' && u.isBlocked);

      return matchSearch && matchRole && matchStatus;
    });
  }, [users, searchQuery, selectedRoleFilter, selectedStatusFilter]);

  // Handle Role Change
  const handleRoleChange = async (user: AdminUserRecord, newRole: UserRole) => {
    if (isMasterAdminEmail(user.email) && newRole !== 'super_admin') {
      onShowToast('لا يمكن تعديل رتبة الحساب الرئيسي للمدير العام', 'error');
      return;
    }

    try {
      await updateUserRoleAdmin(user.userId, user.email, newRole);
      onShowToast(`تم تغيير رتبة (${user.displayName}) إلى (${getRoleLabel(newRole)}) بنجاح 🛡️`, 'success');
      loadUsersData();
      refreshManagers();
    } catch (e) {
      onShowToast('فشل تحديث الرتبة', 'error');
    }
  };

  // Handle Instant Verification
  const handleInstantVerify = async (user: AdminUserRecord) => {
    try {
      await updateUserStatusAdmin(user.userId, user.email, { isVerified: true, isBlocked: false });
      onShowToast(`تم توثيق وتفعيل حساب (${user.displayName}) فورياً بنجاح ✅`, 'success');
      loadUsersData();
    } catch (e) {
      onShowToast('فشل تفعيل الحساب', 'error');
    }
  };

  // Handle Toggle Block
  const handleToggleBlock = async (user: AdminUserRecord) => {
    if (isMasterAdminEmail(user.email)) {
      onShowToast('لا يمكن تجميد حساب المدير العام الرئيسي', 'error');
      return;
    }

    const willBlock = !user.isBlocked;
    try {
      await updateUserStatusAdmin(user.userId, user.email, { isBlocked: willBlock });
      onShowToast(willBlock ? `تم تجميد حساب (${user.displayName}) 🔴` : `تم تنشيط حساب (${user.displayName}) 🟢`, 'info');
      loadUsersData();
    } catch (e) {
      onShowToast('فشل تحديث حالة الحساب', 'error');
    }
  };

  // Handle Delete User
  const handleDeleteUser = async (user: AdminUserRecord) => {
    if (isMasterAdminEmail(user.email)) {
      onShowToast('لا يمكن حذف حساب المدير العام الرئيسي للنظام', 'error');
      return;
    }

    if (!confirm(`هل أنت متأكد من حذف حساب (${user.displayName}) نهائياً من النظام؟\nلن يمكن استعادة بيانات هذا الحساب.`)) {
      return;
    }

    try {
      const res = await deleteUserAdmin(user.userId, user.email);
      if (res.success) {
        onShowToast(res.message, 'success');
        loadUsersData();
        refreshManagers();
      } else {
        onShowToast(res.message || 'فشل حذف الحساب', 'error');
      }
    } catch (e) {
      onShowToast('فشل حذف الحساب', 'error');
    }
  };

  // Handle Assign Manager
  const handleAssignManagerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newManagerInput.trim()) {
      onShowToast('يرجى إدخال البريد الإلكتروني أو اسم المستخدم', 'error');
      return;
    }

    setIsAssigningManager(true);
    try {
      const res = await assignSystemManager(
        newManagerInput.trim(),
        newManagerRole,
        newManagerName.trim() || undefined,
        currentUser?.displayName || 'المدير العام'
      );
      if (res.success) {
        onShowToast(res.message, 'success');
        setNewManagerInput('');
        setNewManagerName('');
        refreshManagers();
        loadUsersData();
      } else {
        onShowToast(res.message, 'error');
      }
    } catch (e) {
      onShowToast('فشل تعيين مدير النظام', 'error');
    } finally {
      setIsAssigningManager(false);
    }
  };

  // Handle Remove Manager
  const handleRemoveManager = async (manager: AdminManagerItem) => {
    if (isMasterAdminEmail(manager.emailOrUsername)) {
      onShowToast('لا يمكن إزالة الحساب الرئيسي للمدير العام', 'error');
      return;
    }

    if (!confirm(`هل أنت متأكد من سحب صلاحيات الإدارة من (${manager.displayName || manager.emailOrUsername})؟`)) {
      return;
    }

    try {
      const res = await removeSystemManager(manager.emailOrUsername);
      if (res.success) {
        onShowToast(res.message, 'success');
        refreshManagers();
        loadUsersData();
      } else {
        onShowToast(res.message, 'error');
      }
    } catch (e) {
      onShowToast('فشل سحب الصلاحيات', 'error');
    }
  };

  // Handle Create User Submit
  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserForm.email && !newUserForm.username) {
      onShowToast('يرجى كتابة البريد الإلكتروني أو اسم المستخدم', 'error');
      return;
    }

    try {
      const res = await createNewUserAdmin(newUserForm);
      if (res.success) {
        onShowToast(res.message, 'success');
        setIsAddUserModalOpen(false);
        setNewUserForm({
          username: '',
          email: '',
          displayName: '',
          password: '',
          role: 'user',
          isVerified: true,
          notes: ''
        });
        loadUsersData();
        refreshManagers();
      } else {
        onShowToast(res.message || 'فشل إنشاء الحساب', 'error');
      }
    } catch (e) {
      onShowToast('فشل إنشاء الحساب', 'error');
    }
  };

  // Handle Edit User Submit
  const handleEditUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      await updateUserStatusAdmin(editingUser.userId, editingUser.email, {
        isBlocked: editUserForm.isBlocked,
        isVerified: editUserForm.isVerified,
        notes: editUserForm.notes
      });
      await updateUserRoleAdmin(editingUser.userId, editingUser.email, editUserForm.role);

      onShowToast(`تم حفظ تعديلات حساب (${editUserForm.displayName}) بنجاح ✅`, 'success');
      setEditingUser(null);
      loadUsersData();
      refreshManagers();
    } catch (e) {
      onShowToast('فشل حفظ التعديلات', 'error');
    }
  };

  // Handle Save Default Settings
  const handleSaveDefaults = () => {
    setIsSavingDefaults(true);
    try {
      saveDefaultSettings(defaultSettings);
      onShowToast('تم حفظ الإعدادات الافتراضية للنظام وتطبيقها بنجاح 💾', 'success');
    } catch (e) {
      onShowToast('فشل حفظ الإعدادات الافتراضية', 'error');
    } finally {
      setIsSavingDefaults(false);
    }
  };

  // Handle Factory Reset Defaults
  const handleResetDefaults = () => {
    if (!confirm('هل أنت متأكد من استعادة الإعدادات الافتراضية المصنعية للنظام؟ سيتم تصفير التعديلات الحالية.')) {
      return;
    }
    const reset = resetDefaultSettingsToFactory();
    setDefaultSettings(reset);
    onShowToast('تمت استعادة الإعدادات المصنعية الافتراضية للنظام 🔄', 'info');
  };

  // Handle Save System Config & Policies
  const handleSavePolicies = () => {
    try {
      saveSystemConfig(systemConfig);
      saveSystemAnnouncement(announcement.enabled ? announcement : null);
      onShowToast('تم حفظ سياسات وقفل عناصر النظام والإشعار العام بنجاح 🛡️', 'success');
    } catch (e) {
      onShowToast('فشل حفظ سياسات النظام', 'error');
    }
  };

  // Export Accounts to CSV / JSON
  const handleExportAccountsCSV = () => {
    if (!users.length) {
      onShowToast('لا توجد حسابات للتصدير', 'info');
      return;
    }

    const headers = ['معرف الحساب', 'اسم العرض', 'اسم المستخدم', 'البريد الإلكتروني', 'حساب جوجل', 'الرتبة', 'الحالة', 'موثق', 'تاريخ التسجيل', 'ملاحظات'];
    const rows = users.map(u => [
      u.userId,
      u.displayName,
      u.username,
      u.email,
      u.googleEmail || '',
      getRoleLabel(u.role),
      u.isBlocked ? 'مجمد' : (u.isVerified ? 'مفعل نشط' : 'بانتظار التفعيل'),
      u.isVerified ? 'نعم' : 'لا',
      new Date(u.createdAt).toLocaleDateString('ar-SA'),
      u.notes || ''
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `taqdeer_accounts_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onShowToast('تم تصدير تقرير الحسابات بصيغة CSV بنجاح 📊', 'success');
  };

  // Role Helper Labels
  function getRoleLabel(role?: string): string {
    switch (role) {
      case 'super_admin':
        return 'المدير العام 👑';
      case 'admin':
        return 'مدير النظام 🛡️';
      case 'supervisor':
        return 'مشرف معتمد 🎖️';
      default:
        return 'مستخدم عادي 👤';
    }
  }

  function getRoleBadgeStyle(role?: string): string {
    switch (role) {
      case 'super_admin':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-black';
      case 'admin':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40 font-bold';
      case 'supervisor':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40 font-bold';
      default:
        return 'bg-slate-700/60 text-slate-300 border-slate-600 font-medium';
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-20 font-['Cairo'] select-none">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40 border-b border-slate-800 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Title & Master Admin Badge */}
            <div className="flex items-center gap-3.5">
              <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/20 shrink-0 font-black">
                <Crown className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                    لوحة تحكم وإدارة المنظومة
                  </h1>
                  <span className="bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-0.5 rounded-full text-xs font-black flex items-center gap-1">
                    <Crown className="w-3 h-3 text-amber-400" />
                    <span>المدير العام (Super Admin)</span>
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                  <span>التحكم الكامل بالحسابات، تعيين المدراء، وتخصيص الإعدادات والسياسات الافتراضية للنظام</span>
                  <span className="text-slate-600 hidden sm:inline">•</span>
                  <span className="text-emerald-400 font-mono text-xs flex items-center gap-1 font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    خادم المنظومة وقاعدة البيانات متصلة ومحدثة
                  </span>
                </p>
              </div>
            </div>

            {/* Quick Actions Header */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setIsAddUserModalOpen(true)}
                className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 px-3.5 py-2 rounded-xl text-xs font-black transition shadow-md shadow-amber-500/20 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>إضافة حساب جديد</span>
              </button>

              <button
                type="button"
                onClick={loadUsersData}
                disabled={isLoadingUsers}
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
                title="تحديث البيانات الآن"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingUsers ? 'animate-spin text-amber-400' : ''}`} />
                <span className="hidden sm:inline">تحديث</span>
              </button>

              <button
                type="button"
                onClick={handleExportAccountsCSV}
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
                title="تصدير تقرير الحسابات بصيغة CSV"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">تصدير CSV</span>
              </button>
            </div>

          </div>

          {/* KPI Analytics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6">
            
            {/* Card 1: Total Users */}
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3.5 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-bold">إجمالي الحسابات</span>
                <Users className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-white font-mono">
                {stats?.totalUsers || users.length}
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">مسجلون في النظام</span>
            </div>

            {/* Card 2: Admins & Managers */}
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3.5 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-bold">مدراء النظام</span>
                <Crown className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-amber-400 font-mono">
                {stats?.adminCount || managersList.length}
              </div>
              <span className="text-[10px] text-amber-400/80 mt-0.5 block">بصلاحيات إدارية</span>
            </div>

            {/* Card 3: Verified Accounts */}
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3.5 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-bold">حسابات موثقة</span>
                <UserCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
                {stats?.verifiedUsers || users.filter(u => u.isVerified).length}
              </div>
              <span className="text-[10px] text-emerald-400/80 mt-0.5 block">نشطة ومفعلة</span>
            </div>

            {/* Card 4: Pending Verification */}
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3.5 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-bold">بانتظار التوثيق</span>
                <AlertTriangle className="w-4 h-4 text-yellow-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-yellow-400 font-mono">
                {stats?.pendingUsers || users.filter(u => !u.isVerified).length}
              </div>
              <span className="text-[10px] text-yellow-400/80 mt-0.5 block">كود OTP معلق</span>
            </div>

            {/* Card 5: Blocked Accounts */}
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3.5 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-bold">حسابات مجمدة</span>
                <UserX className="w-4 h-4 text-rose-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-rose-400 font-mono">
                {stats?.blockedUsers || users.filter(u => u.isBlocked).length}
              </div>
              <span className="text-[10px] text-rose-400/80 mt-0.5 block">معلقة الوصول</span>
            </div>

            {/* Card 6: Total Certificates */}
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3.5 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-bold">إصدارات التوثيق</span>
                <Award className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-purple-400 font-mono">
                {stats?.totalCertificatesIssued || 148}
              </div>
              <span className="text-[10px] text-purple-400/80 mt-0.5 block">شهادة صادرة وموثقة</span>
            </div>

          </div>

          {/* Sub Navigation Bar */}
          <div className="flex items-center gap-1.5 mt-6 border-b border-slate-800 overflow-x-auto no-scrollbar pb-1">
            
            <button
              type="button"
              onClick={() => setActiveAdminSubTab('users')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold transition border-b-2 whitespace-nowrap cursor-pointer ${
                activeAdminSubTab === 'users'
                  ? 'bg-slate-800 text-amber-400 border-amber-500 font-black'
                  : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-850'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>إدارة الحسابات والمستخدمين ({users.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveAdminSubTab('managers')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold transition border-b-2 whitespace-nowrap cursor-pointer ${
                activeAdminSubTab === 'managers'
                  ? 'bg-slate-800 text-amber-400 border-amber-500 font-black'
                  : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-850'
              }`}
            >
              <Crown className="w-4 h-4" />
              <span>تعيين مدراء النظام والصلاحيات ({managersList.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveAdminSubTab('defaults')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold transition border-b-2 whitespace-nowrap cursor-pointer ${
                activeAdminSubTab === 'defaults'
                  ? 'bg-slate-800 text-amber-400 border-amber-500 font-black'
                  : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-850'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>الإعدادات الافتراضية للنظام والقوالب</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveAdminSubTab('policies')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold transition border-b-2 whitespace-nowrap cursor-pointer ${
                activeAdminSubTab === 'policies'
                  ? 'bg-slate-800 text-amber-400 border-amber-500 font-black'
                  : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-850'
              }`}
            >
              <Lock className="w-4 h-4" />
              <span>سياسات النظام وقفل العناصر والإشعارات</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveAdminSubTab('telemetry')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold transition border-b-2 whitespace-nowrap cursor-pointer ${
                activeAdminSubTab === 'telemetry'
                  ? 'bg-slate-800 text-amber-400 border-amber-500 font-black'
                  : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-850'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>سجل الإرسال ومراقبة الخادم</span>
            </button>

          </div>

        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* ========================================================= */}
        {/* SUB-TAB 1: USERS & ACCOUNTS MANAGEMENT */}
        {/* ========================================================= */}
        {activeAdminSubTab === 'users' && (
          <div className="space-y-4">
            
            {/* Search & Filter Header Bar */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
              
              {/* Search Bar */}
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="بحث بالاسم، البريد، أو المعرف..."
                  className="w-full bg-slate-950 border border-slate-700 text-white placeholder-slate-500 rounded-xl pr-10 pl-3 py-2 text-xs focus:border-amber-500 focus:outline-hidden transition"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
                
                {/* Role Filter */}
                <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-slate-400">الرتبة:</span>
                  <select
                    value={selectedRoleFilter}
                    onChange={(e) => setSelectedRoleFilter(e.target.value)}
                    className="bg-transparent text-white focus:outline-hidden cursor-pointer font-bold"
                  >
                    <option value="all" className="bg-slate-900 text-white">كل الرتب</option>
                    <option value="super_admin" className="bg-slate-900 text-amber-300">المدير العام 👑</option>
                    <option value="admin" className="bg-slate-900 text-blue-300">مدراء النظام 🛡️</option>
                    <option value="supervisor" className="bg-slate-900 text-purple-300">مشرفون معتمدون 🎖️</option>
                    <option value="user" className="bg-slate-900 text-slate-300">مستخدمون عاديون 👤</option>
                  </select>
                </div>

                {/* Status Filter */}
                <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs">
                  <span className="text-slate-400">الحالة:</span>
                  <select
                    value={selectedStatusFilter}
                    onChange={(e) => setSelectedStatusFilter(e.target.value)}
                    className="bg-transparent text-white focus:outline-hidden cursor-pointer font-bold"
                  >
                    <option value="all" className="bg-slate-900 text-white">كل الحالات</option>
                    <option value="active" className="bg-slate-900 text-emerald-300">مفعل ونشط 🟢</option>
                    <option value="pending" className="bg-slate-900 text-yellow-300">بانتظار التفعيل 🟡</option>
                    <option value="blocked" className="bg-slate-900 text-rose-300">مجمد / معلق 🔴</option>
                  </select>
                </div>

                <div className="text-xs text-slate-400 font-mono mr-auto md:mr-2">
                  عدد النتائج: <strong className="text-amber-400">{filteredUsers.length}</strong>
                </div>

              </div>

            </div>

            {/* Users Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-bold">
                    <tr>
                      <th className="px-4 py-3.5">المستخدم / المعرف</th>
                      <th className="px-4 py-3.5">البريد الإلكتروني</th>
                      <th className="px-4 py-3.5">الرتبة والصلاحية</th>
                      <th className="px-4 py-3.5">حالة الحساب</th>
                      <th className="px-4 py-3.5">تاريخ التسجيل</th>
                      <th className="px-4 py-3.5 text-center">إجراءات التحكم السريعة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {isLoadingUsers ? (
                      <tr>
                        <td colSpan={6} className="text-center py-12 text-slate-400">
                          <div className="flex flex-col items-center gap-2">
                            <RefreshCw className="w-6 h-6 animate-spin text-amber-400" />
                            <span>جاري تحميل بيانات الحسابات من قاعدة البيانات...</span>
                          </div>
                        </td>
                      </tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-12 text-slate-400">
                          <div className="flex flex-col items-center gap-2">
                            <Users className="w-8 h-8 text-slate-600" />
                            <p className="font-bold text-slate-300">لم يتم العثور على أي حسابات مطابقة للبحث</p>
                            <button
                              type="button"
                              onClick={() => { setSearchQuery(''); setSelectedRoleFilter('all'); setSelectedStatusFilter('all'); }}
                              className="text-xs text-amber-400 hover:underline"
                            >
                              إعادة ضبط الفلاتر
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((user) => {
                        const isMaster = isMasterAdminEmail(user.email);
                        return (
                          <tr key={user.userId || user.email} className={`hover:bg-slate-850/70 transition ${isMaster ? 'bg-amber-950/15' : ''}`}>
                            
                            {/* User Info */}
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-amber-400 shrink-0">
                                  {user.photoURL ? (
                                    <img src={user.photoURL} alt={user.displayName} className="w-full h-full rounded-full object-cover" />
                                  ) : (
                                    user.displayName?.charAt(0) || user.username?.charAt(0) || 'U'
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-bold text-white flex items-center gap-1.5 truncate">
                                    <span>{user.displayName || user.username}</span>
                                    {isMaster && (
                                      <span title="المدير العام الرئيسي">
                                        <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-mono truncate">
                                    {user.userId}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Email & Google Link */}
                            <td className="px-4 py-3">
                              <div className="text-slate-200 font-mono text-[11px] truncate">
                                {user.email || user.googleEmail || 'بدون بريد'}
                              </div>
                              {user.googleEmail && (
                                <div className="text-[10px] text-blue-400 flex items-center gap-1 mt-0.5">
                                  <span>🔵 مرتبط بحساب Google</span>
                                </div>
                              )}
                            </td>

                            {/* Role Selector */}
                            <td className="px-4 py-3">
                              {isMaster ? (
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[11px] ${getRoleBadgeStyle(user.role)}`}>
                                  <Crown className="w-3 h-3 text-amber-400" />
                                  <span>المدير العام 👑</span>
                                </span>
                              ) : (
                                <select
                                  value={user.role || 'user'}
                                  onChange={(e) => handleRoleChange(user, e.target.value as UserRole)}
                                  className="bg-slate-950 border border-slate-700 text-slate-200 rounded-lg px-2 py-1 text-xs focus:border-amber-500 focus:outline-hidden font-bold cursor-pointer"
                                >
                                  <option value="user">مستخدم عادي 👤</option>
                                  <option value="supervisor">مشرف معتمد 🎖️</option>
                                  <option value="admin">مدير نظام 🛡️</option>
                                  <option value="super_admin">مدير عام 👑</option>
                                </select>
                              )}
                            </td>

                            {/* Account Status */}
                            <td className="px-4 py-3">
                              {user.isBlocked ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold">
                                  <UserX className="w-3 h-3 text-rose-400" />
                                  <span>مجمد / معلق</span>
                                </span>
                              ) : user.isVerified ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                  <span>مفعل ونشط</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 text-[10px] font-bold">
                                  <AlertTriangle className="w-3 h-3 text-yellow-400" />
                                  <span>بانتظار التوثيق</span>
                                </span>
                              )}
                            </td>

                            {/* Registration Date */}
                            <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">
                              {user.createdAt ? new Date(user.createdAt).toLocaleDateString('ar-SA') : 'غير محدد'}
                            </td>

                            {/* Action Buttons */}
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center gap-1.5">
                                
                                {/* Quick Instant Verification */}
                                {!user.isVerified && (
                                  <button
                                    type="button"
                                    onClick={() => handleInstantVerify(user)}
                                    className="p-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-lg transition"
                                    title="تفعيل وتوثيق فوري للحساب"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                {/* Block / Unblock */}
                                {!isMaster && (
                                  <button
                                    type="button"
                                    onClick={() => handleToggleBlock(user)}
                                    className={`p-1.5 rounded-lg border transition ${
                                      user.isBlocked
                                        ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/40'
                                        : 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border-rose-500/40'
                                    }`}
                                    title={user.isBlocked ? 'إلغاء التجميد وتنشيط الحساب' : 'تجميد الحساب وتعليق الوصول'}
                                  >
                                    {user.isBlocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                                  </button>
                                )}

                                {/* Edit Profile Modal Button */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingUser(user);
                                    setEditUserForm({
                                      displayName: user.displayName,
                                      username: user.username,
                                      email: user.email,
                                      role: user.role || 'user',
                                      status: user.status || 'active',
                                      isBlocked: !!user.isBlocked,
                                      isVerified: !!user.isVerified,
                                      notes: user.notes || ''
                                    });
                                  }}
                                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg transition"
                                  title="تعديل بيانات الحساب"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>

                                {/* Delete User Button */}
                                {!isMaster && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteUser(user)}
                                    className="p-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border border-rose-800/60 rounded-lg transition"
                                    title="حذف الحساب نهائياً"
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

        {/* ========================================================= */}
        {/* SUB-TAB 2: DESIGNATE SYSTEM MANAGERS & RBAC */}
        {/* ========================================================= */}
        {activeAdminSubTab === 'managers' && (
          <div className="space-y-6">
            
            {/* Add / Designate New System Manager Form */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold">
                  <Crown className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white">تعيين مدير أو مشرف جديد للنظام</h2>
                  <p className="text-xs text-slate-400">
                    أدخل البريد الإلكتروني أو اسم المستخدم لمنحه صلاحيات إدارة النظام أو الإشراف على الشهادات
                  </p>
                </div>
              </div>

              <form onSubmit={handleAssignManagerSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    البريد الإلكتروني أو اسم المستخدم المستهدف <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newManagerInput}
                    onChange={(e) => setNewManagerInput(e.target.value)}
                    placeholder="مثال: admin@school.edu.sa أو username"
                    className="w-full bg-slate-950 border border-slate-700 text-white placeholder-slate-500 rounded-xl px-3.5 py-2.5 text-xs focus:border-amber-500 focus:outline-hidden font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    الرتبة الممنوحة <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={newManagerRole}
                    onChange={(e) => setNewManagerRole(e.target.value as UserRole)}
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2.5 text-xs focus:border-amber-500 focus:outline-hidden font-bold"
                  >
                    <option value="admin">مدير نظام (صلاحيات كاملة) 🛡️</option>
                    <option value="supervisor">مشرف معتمد (مراجعة وإصدار) 🎖️</option>
                    <option value="super_admin">مدير عام للمنظومة 👑</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    الاسم المعروض (اختياري)
                  </label>
                  <input
                    type="text"
                    value={newManagerName}
                    onChange={(e) => setNewManagerName(e.target.value)}
                    placeholder="مثال: أ. محمد السعيد"
                    className="w-full bg-slate-950 border border-slate-700 text-white placeholder-slate-500 rounded-xl px-3.5 py-2.5 text-xs focus:border-amber-500 focus:outline-hidden"
                  />
                </div>

                <div className="md:col-span-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={isAssigningManager}
                    className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 px-6 py-2.5 rounded-xl text-xs font-black transition shadow-lg shadow-amber-500/20 cursor-pointer"
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>تأكيد تعيين الصلاحية الإدارية</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Active Managers List */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-black text-white">قائمة مدراء ومشرفي المنظومة المعتمدين</h3>
                  <p className="text-xs text-slate-400">
                    الحسابات الحاصلة على صلاحيات الإشراف، إدارة المستخدمين والتحكم بالنظام
                  </p>
                </div>
                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-3 py-1 rounded-full text-xs font-bold font-mono">
                  {managersList.length} مدراء نشطين
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {managersList.map((mgr) => {
                  const isMaster = isMasterAdminEmail(mgr.emailOrUsername);
                  return (
                    <div
                      key={mgr.id || mgr.emailOrUsername}
                      className={`border rounded-2xl p-4 flex items-center justify-between gap-3 ${
                        isMaster
                          ? 'bg-amber-950/20 border-amber-500/40 shadow-sm shadow-amber-500/10'
                          : 'bg-slate-950 border-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-slate-950 shrink-0 ${
                          isMaster ? 'bg-amber-400' : 'bg-slate-800 text-amber-400 border border-slate-700'
                        }`}>
                          <Crown className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-bold text-sm text-white flex items-center gap-1.5">
                            <span>{mgr.displayName || mgr.emailOrUsername}</span>
                            {isMaster && (
                              <span className="text-[10px] bg-amber-500/30 text-amber-300 border border-amber-500/40 px-1.5 py-0.2 rounded font-black">
                                المالك الرئيسي
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400 font-mono">{mgr.emailOrUsername}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] border ${getRoleBadgeStyle(mgr.role)}`}>
                              {getRoleLabel(mgr.role)}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              عين بواسطة: {mgr.assignedBy || 'المدير العام'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div>
                        {isMaster ? (
                          <span className="text-xs text-amber-400 font-bold bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/30">
                            محمي 🛡️
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleRemoveManager(mgr)}
                            className="text-xs text-rose-400 hover:text-rose-300 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 px-3 py-1.5 rounded-xl transition cursor-pointer"
                          >
                            سحب الصلاحية
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>

          </div>
        )}

        {/* ========================================================= */}
        {/* SUB-TAB 3: SYSTEM DEFAULT SETTINGS & TEMPLATES */}
        {/* ========================================================= */}
        {activeAdminSubTab === 'defaults' && (
          <div className="space-y-6">
            
            {/* Header Settings Notice */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black text-white flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-amber-400" />
                    <span>الإعدادات والقوالب الافتراضية للنظام بأكمله</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    هذه الإعدادات ستكون الأساس التلقائي لجميع الشهادات الجديدة والمستخدمين الجدد في المنظومة
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleResetDefaults}
                    className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
                    <span>استعادة المصنع</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveDefaults}
                    disabled={isSavingDefaults}
                    className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 px-5 py-2 rounded-xl text-xs font-black transition shadow-lg shadow-amber-500/20 cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>حفظ كإعدادات افتراضية عامة</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Default Settings Form Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Section 1: Institution & Header Info */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
                <h3 className="text-sm font-black text-amber-400 flex items-center gap-2 border-b border-slate-800 pb-2">
                  <Layers className="w-4 h-4" />
                  <span>1. بيانات الجهة والترويسة الافتراضية</span>
                </h3>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">اسم المدرسة / الجهة التعليمية الافتراضي</label>
                  <input
                    type="text"
                    value={defaultSettings.schoolName}
                    onChange={(e) => setDefaultSettings({ ...defaultSettings, schoolName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:border-amber-500 focus:outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">السطر الأول (الدولة)</label>
                    <input
                      type="text"
                      value={defaultSettings.headerLine1}
                      onChange={(e) => setDefaultSettings({ ...defaultSettings, headerLine1: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:border-amber-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">السطر الثاني (الوزارة)</label>
                    <input
                      type="text"
                      value={defaultSettings.headerLine2}
                      onChange={(e) => setDefaultSettings({ ...defaultSettings, headerLine2: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:border-amber-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">مكان الإصدار الافتراضي</label>
                  <input
                    type="text"
                    value={defaultSettings.issuePlace}
                    onChange={(e) => setDefaultSettings({ ...defaultSettings, issuePlace: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:border-amber-500 focus:outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">عنوان الشهادة الافتراضي</label>
                    <input
                      type="text"
                      value={defaultSettings.defaultTitle}
                      onChange={(e) => setDefaultSettings({ ...defaultSettings, defaultTitle: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:border-amber-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">العنوان الفرعي الافتراضي</label>
                    <input
                      type="text"
                      value={defaultSettings.defaultSubtitle}
                      onChange={(e) => setDefaultSettings({ ...defaultSettings, defaultSubtitle: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:border-amber-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">البيت الشعري / الاقتباس الافتراضي</label>
                  <input
                    type="text"
                    value={defaultSettings.defaultPoemOrQuote}
                    onChange={(e) => setDefaultSettings({ ...defaultSettings, defaultPoemOrQuote: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:border-amber-500 focus:outline-hidden font-['Amiri']"
                  />
                </div>

              </div>

              {/* Section 2: Default Template, Fonts & Stamp */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
                <h3 className="text-sm font-black text-amber-400 flex items-center gap-2 border-b border-slate-800 pb-2">
                  <Stamp className="w-4 h-4" />
                  <span>2. القالب، الخطوط، والختم الرسمي الافتراضي</span>
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">قالب الشهادة الافتراضي</label>
                    <select
                      value={defaultSettings.layoutPreset}
                      onChange={(e) => setDefaultSettings({ ...defaultSettings, layoutPreset: e.target.value as any })}
                      className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:border-amber-500 focus:outline-hidden font-bold"
                    >
                      {TEMPLATE_PRESETS.map(preset => (
                        <option key={preset.id} value={preset.id}>{preset.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">الخط العربي الأساسي</label>
                    <select
                      value={defaultSettings.fontFamily}
                      onChange={(e) => setDefaultSettings({ ...defaultSettings, fontFamily: e.target.value as any })}
                      className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:border-amber-500 focus:outline-hidden font-bold"
                    >
                      <option value="Amiri">خط الأميري (كلاسيكي)</option>
                      <option value="Cairo">خط كايرو (عصري)</option>
                      <option value="Tajawal">خط تجوال (أنيق)</option>
                      <option value="Reem Kufi">خط ريم الكوفي (تراثي)</option>
                      <option value="Aref Ruqaa">خط عارف رقعة (تقليدي)</option>
                      <option value="Changa">خط تشانغا (هندسي)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">شكل الختم الرسمي الافتراضي</label>
                    <select
                      value={defaultSettings.stampShape}
                      onChange={(e) => setDefaultSettings({ ...defaultSettings, stampShape: e.target.value as any })}
                      className="w-full bg-slate-950 border border-slate-700 text-amber-300 rounded-xl px-3 py-2 text-xs focus:border-amber-500 focus:outline-hidden font-black"
                    >
                      <option value="andalusian">الختم الأندلسي (زخارف إسلامية معقدة) 🌟</option>
                      <option value="circle">الختم الدائري الرسمي ⭕</option>
                      <option value="square">الختم المربع المعتمد ⬛</option>
                      <option value="wax">الختم الشمعي الملكي 👑</option>
                      <option value="ribbon">الشريط الذهبي الشرفي 🎖️</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">نص الختم المعتمد</label>
                    <input
                      type="text"
                      value={defaultSettings.stampTitle}
                      onChange={(e) => setDefaultSettings({ ...defaultSettings, stampTitle: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:border-amber-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">صفة التوقيع الأول</label>
                    <input
                      type="text"
                      value={defaultSettings.teacherTitle}
                      onChange={(e) => setDefaultSettings({ ...defaultSettings, teacherTitle: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:border-amber-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">اسم صاحب التوقيع الأول</label>
                    <input
                      type="text"
                      value={defaultSettings.teacherName}
                      onChange={(e) => setDefaultSettings({ ...defaultSettings, teacherName: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:border-amber-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">صفة التوقيع الثاني</label>
                    <input
                      type="text"
                      value={defaultSettings.principalTitle}
                      onChange={(e) => setDefaultSettings({ ...defaultSettings, principalTitle: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:border-amber-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">اسم صاحب التوقيع الثاني</label>
                    <input
                      type="text"
                      value={defaultSettings.principalName}
                      onChange={(e) => setDefaultSettings({ ...defaultSettings, principalName: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:border-amber-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">العلامة المائية الافتراضية</label>
                  <input
                    type="text"
                    value={defaultSettings.watermarkText}
                    onChange={(e) => setDefaultSettings({ ...defaultSettings, watermarkText: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:border-amber-500 focus:outline-hidden"
                  />
                </div>

              </div>

            </div>

          </div>
        )}

        {/* ========================================================= */}
        {/* SUB-TAB 4: POLICIES, ELEMENT LOCKING & BROADCAST */}
        {/* ========================================================= */}
        {activeAdminSubTab === 'policies' && (
          <div className="space-y-6">
            
            {/* Broadcast Announcement Banner Control */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 font-bold">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-white">الشريط الإعلاني والتنبيه العام للمنظومة</h2>
                    <p className="text-xs text-slate-400">
                      بث رسالة توجيهية أو إشعار يظهر في أعلى المنصة لجميع المستخدمين في الوقت الفعلي
                    </p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={announcement.enabled}
                    onChange={(e) => setAnnouncement({ ...announcement, enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>

              {announcement.enabled && (
                <div className="space-y-3 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">نص الإعلان / التنبيه</label>
                    <textarea
                      rows={2}
                      value={announcement.message}
                      onChange={(e) => setAnnouncement({ ...announcement, message: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl p-3 text-xs focus:border-amber-500 focus:outline-hidden"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">نوع التنبيه ولونه</label>
                      <select
                        value={announcement.type}
                        onChange={(e) => setAnnouncement({ ...announcement, type: e.target.value as any })}
                        className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:border-amber-500 focus:outline-hidden font-bold"
                      >
                        <option value="info">إشعار معلوماتي عام (أزرق) ℹ️</option>
                        <option value="success">إشعار نجاح أو اعتماد (أخضر) ✅</option>
                        <option value="warning">تنبيه هام وتوجيه (أصفر) ⚠️</option>
                        <option value="alert">تحذير أمني عاجل (أحمر) 🚨</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">نص الرابط (اختياري)</label>
                      <input
                        type="text"
                        value={announcement.linkText || ''}
                        onChange={(e) => setAnnouncement({ ...announcement, linkText: e.target.value })}
                        placeholder="مثال: اضغط هنا للاطلاع"
                        className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:border-amber-500 focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">رابط الوجهة (اختياري)</label>
                      <input
                        type="text"
                        value={announcement.linkUrl || ''}
                        onChange={(e) => setAnnouncement({ ...announcement, linkUrl: e.target.value })}
                        placeholder="https://example.com"
                        className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:border-amber-500 focus:outline-hidden font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Feature Toggles & Element Locking */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Feature Toggles */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
                <h3 className="text-sm font-black text-amber-400 flex items-center gap-2 border-b border-slate-800 pb-2">
                  <Sparkles className="w-4 h-4" />
                  <span>تفعيل وتعطيل ميزات المنظومة</span>
                </h3>

                {[
                  { key: 'enableAiFeatures', label: 'ميزات الذكاء الاصطناعي وصياغة العبارات الآلية', desc: 'تفعيل المساعد الذكي، التدقيق التلقائي وتوليد النصوص' },
                  { key: 'enableQrVerification', label: 'بوابة التحقق والتوثيق الأمني (QR & Barcode)', desc: 'تفعيل مسح الأكواد والتحقق من صحة المستندات الصادرة' },
                  { key: 'enableCloudAutoSync', label: 'المزامنة السحابية والحفظ التلقائي عبر الأجهزة', desc: 'مزامنة الشهادات والحسابات سحابياً' },
                  { key: 'enableSpellcheck', label: 'التدقيق اللغوي والإملائي الآلي للنصوص', desc: 'فحص التنوين والهمزات والأخطاء اللغوية الشائعة' },
                  { key: 'enablePraiseBank', label: 'بنك عبارات التقدير والثناء الجاهزة', desc: 'إتاحة نماذج العبارات الأدبية المقترحة للمعلمين' },
                  { key: 'enableAutoArchive', label: 'الأرشفة التلقائية للشهادات المكتملة', desc: 'تخزين نسخة في السحابة المحلية عند التصدير' },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800/80">
                    <div>
                      <span className="font-bold text-xs text-white block">{item.label}</span>
                      <span className="text-[10px] text-slate-400">{item.desc}</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!(systemConfig.features as any)[item.key]}
                        onChange={(e) => {
                          const updated = {
                            ...systemConfig,
                            features: {
                              ...systemConfig.features,
                              [item.key]: e.target.checked
                            }
                          };
                          setSystemConfig(updated);
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-800 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                    </label>
                  </div>
                ))}
              </div>

              {/* Element Locking Policy */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
                <h3 className="text-sm font-black text-amber-400 flex items-center gap-2 border-b border-slate-800 pb-2">
                  <Lock className="w-4 h-4" />
                  <span>قفل العناصر الرسمية (منع تعديلها للمستخدمين)</span>
                </h3>

                {[
                  { key: 'schoolName', label: 'قفل اسم المدرسة / المؤسسة', desc: 'منع المعلمين من تغيير اسم المدرسة الرسمي' },
                  { key: 'headerLines', label: 'قفل أسطر الترويسة الوزارية الرسمية', desc: 'تثبيت ترويسة الدولة والوزارة والإدارة التعليمية' },
                  { key: 'stamp', label: 'قفل الختم الرسمي والشعار المعتمد', desc: 'تثبيت الختم الأندلسي / الشمعي الرسمي' },
                  { key: 'signatures', label: 'قفل التوقيعات الرسمية المعتمدة', desc: 'تثبيت أسماء وصفات المدراء والمشرفين' },
                  { key: 'colors', label: 'قفل ألوان القالب والإطار الرسمي', desc: 'منع العبث بهوية الشهادة البصرية الرسمية' },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800/80">
                    <div>
                      <span className="font-bold text-xs text-white block">{item.label}</span>
                      <span className="text-[10px] text-slate-400">{item.desc}</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!(systemConfig.lockedElements as any)[item.key]}
                        onChange={(e) => {
                          const updated = {
                            ...systemConfig,
                            lockedElements: {
                              ...systemConfig.lockedElements,
                              [item.key]: e.target.checked
                            }
                          };
                          setSystemConfig(updated);
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-800 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                    </label>
                  </div>
                ))}

              </div>

            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSavePolicies}
                className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 px-6 py-3 rounded-xl text-xs font-black transition shadow-lg shadow-amber-500/20 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>حفظ وتطبيق السياسات على مستوى المنظومة</span>
              </button>
            </div>

          </div>
        )}

        {/* ========================================================= */}
        {/* SUB-TAB 5: SYSTEM TELEMETRY & DISPATCH LOGS */}
        {/* ========================================================= */}
        {activeAdminSubTab === 'telemetry' && (
          <div className="space-y-6">
            
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-black text-white flex items-center gap-2">
                    <Activity className="w-5 h-5 text-emerald-400" />
                    <span>مراقبة حالة الخادم والبيئة التقنية</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    مؤشرات الأداء اللحظية، الاتصال بقاعدة البيانات وحالة خدمات البريد الإلكتروني
                  </p>
                </div>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-bold">
                  🟢 النظام مستقر 100%
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                  <span className="text-xs text-slate-400 block mb-1">حالة خادم Node.js / Express</span>
                  <div className="font-mono text-emerald-400 font-bold text-sm">متصل (0.0.0.0:3000)</div>
                  <span className="text-[10px] text-slate-500 mt-1 block">وقت التشغيل: {stats?.serverUptime || '99.99%'}</span>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                  <span className="text-xs text-slate-400 block mb-1">قاعدة بيانات الحسابات</span>
                  <div className="font-mono text-blue-400 font-bold text-sm">JSON Vault + Memory Sync</div>
                  <span className="text-[10px] text-slate-500 mt-1 block">الحجم: {users.length} سجلات نشطة</span>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                  <span className="text-xs text-slate-400 block mb-1">محرك إرسال الإيميلات</span>
                  <div className="font-mono text-purple-400 font-bold text-sm">Nodemailer SMTP / Auto-Fallback</div>
                  <span className="text-[10px] text-slate-500 mt-1 block">إجمالي المرسل: {stats?.totalEmailsSent || 0} رسالة</span>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                  <span className="text-xs text-slate-400 block mb-1">محرك التوثيق الرقمي</span>
                  <div className="font-mono text-amber-400 font-bold text-sm">Sha-256 Checksum + QR Engine</div>
                  <span className="text-[10px] text-slate-500 mt-1 block">التحقق اللحظي: نشط ومفعل</span>
                </div>

              </div>
            </div>

          </div>
        )}

      </div>

      {/* ========================================================= */}
      {/* MODAL: ADD NEW USER */}
      {/* ========================================================= */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-black text-white">إضافة مستخدم جديد للنظام</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddUserModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUserSubmit} className="space-y-3 text-xs">
              
              <div>
                <label className="block font-bold text-slate-300 mb-1">
                  الاسم الكامل أو المعروض <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newUserForm.displayName}
                  onChange={(e) => setNewUserForm({ ...newUserForm, displayName: e.target.value })}
                  placeholder="مثال: أ. عبد الرحمن الغامدي"
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:border-amber-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">
                  البريد الإلكتروني <span className="text-rose-400">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={newUserForm.email}
                  onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                  placeholder="user@example.com"
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:border-amber-500 focus:outline-hidden font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">اسم المستخدم</label>
                  <input
                    type="text"
                    value={newUserForm.username}
                    onChange={(e) => setNewUserForm({ ...newUserForm, username: e.target.value })}
                    placeholder="alghamdi"
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:border-amber-500 focus:outline-hidden font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">كلمة المرور (اختياري)</label>
                  <input
                    type="password"
                    value={newUserForm.password}
                    onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:border-amber-500 focus:outline-hidden font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">الرتبة الممنوحة</label>
                  <select
                    value={newUserForm.role}
                    onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value as UserRole })}
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:border-amber-500 focus:outline-hidden font-bold"
                  >
                    <option value="user">مستخدم عادي 👤</option>
                    <option value="supervisor">مشرف معتمد 🎖️</option>
                    <option value="admin">مدير نظام 🛡️</option>
                    <option value="super_admin">مدير عام 👑</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">حالة التوثيق الفوري</label>
                  <select
                    value={newUserForm.isVerified ? 'true' : 'false'}
                    onChange={(e) => setNewUserForm({ ...newUserForm, isVerified: e.target.value === 'true' })}
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:border-amber-500 focus:outline-hidden font-bold"
                  >
                    <option value="true">موثق ومفعل فورياً ✅</option>
                    <option value="false">بانتظار التحقق بكود OTP ⏱️</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">ملاحظات إدارية</label>
                <input
                  type="text"
                  value={newUserForm.notes}
                  onChange={(e) => setNewUserForm({ ...newUserForm, notes: e.target.value })}
                  placeholder="ملاحظات حول هذا الحساب..."
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:border-amber-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-black transition shadow-md shadow-amber-500/20 cursor-pointer"
                >
                  إنشاء الحساب
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: EDIT USER PROFILE & STATUS */}
      {/* ========================================================= */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <UserCog className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-black text-white">تعديل بيانات الحساب</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditUserSubmit} className="space-y-3 text-xs">
              
              <div>
                <label className="block font-bold text-slate-300 mb-1">الاسم المعروض</label>
                <input
                  type="text"
                  value={editUserForm.displayName}
                  onChange={(e) => setEditUserForm({ ...editUserForm, displayName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:border-amber-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">البريد الإلكتروني</label>
                <input
                  type="text"
                  disabled
                  value={editUserForm.email}
                  className="w-full bg-slate-950/50 border border-slate-800 text-slate-400 rounded-xl px-3 py-2 text-xs font-mono cursor-not-allowed"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">الرتبة</label>
                  <select
                    disabled={isMasterAdminEmail(editingUser.email)}
                    value={editUserForm.role}
                    onChange={(e) => setEditUserForm({ ...editUserForm, role: e.target.value as UserRole })}
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:border-amber-500 focus:outline-hidden font-bold disabled:opacity-50"
                  >
                    <option value="user">مستخدم عادي 👤</option>
                    <option value="supervisor">مشرف معتمد 🎖️</option>
                    <option value="admin">مدير نظام 🛡️</option>
                    <option value="super_admin">مدير عام 👑</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">حالة الحساب</label>
                  <select
                    disabled={isMasterAdminEmail(editingUser.email)}
                    value={editUserForm.isBlocked ? 'blocked' : (editUserForm.isVerified ? 'active' : 'pending')}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditUserForm({
                        ...editUserForm,
                        isBlocked: val === 'blocked',
                        isVerified: val === 'active' || val === 'blocked',
                        status: val as AccountStatus
                      });
                    }}
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:border-amber-500 focus:outline-hidden font-bold disabled:opacity-50"
                  >
                    <option value="active">مفعل ونشط 🟢</option>
                    <option value="pending">بانتظار التوثيق 🟡</option>
                    <option value="blocked">مجمد / معلق 🔴</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">ملاحظات إدارية</label>
                <textarea
                  rows={2}
                  value={editUserForm.notes}
                  onChange={(e) => setEditUserForm({ ...editUserForm, notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl p-2.5 text-xs focus:border-amber-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-black transition shadow-md shadow-amber-500/20 cursor-pointer"
                >
                  حفظ التعديلات
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
