import React, { useState, useMemo } from 'react';
import {
  Lock,
  Unlock,
  Shield,
  Search,
  Filter,
  Users,
  Check,
  X,
  AlertTriangle,
  RotateCcw,
  CheckCheck,
  Building,
  FileText,
  Image,
  Award,
  UserCheck,
  BookOpen,
  PenTool,
  ShieldCheck,
  Calendar,
  QrCode,
  Sparkles,
  Layout,
  Palette,
  Maximize2,
  Quote,
} from 'lucide-react';
import { AdminUserRecord, adminUpdateUserFieldLocks, adminBatchUpdateFieldLocks } from '../../services/adminService';
import {
  UserFieldLocks,
  SYSTEM_FIELD_LOCKS_CATALOG,
  FieldLockDefinition,
  DEFAULT_USER_FIELD_LOCKS,
} from '../../services/accountPermissionsService';

interface Props {
  users: AdminUserRecord[];
  onUsersUpdated: (updatedUsers: AdminUserRecord[]) => void;
  onSelectUserForEdit: (user: AdminUserRecord) => void;
  onShowToast: (msg: string) => void;
}

const CATEGORY_MAP: Record<string, { label: string; icon: any }> = {
  all: { label: 'جميع الحقول', icon: Shield },
  identity: { label: 'بيانات المنشأة والهوية', icon: Building },
  content: { label: 'المحتوى والنصوص', icon: BookOpen },
  signatures: { label: 'التواقيع والأختام والأمان', icon: PenTool },
  appearance: { label: 'المظهر والسمات والإطار', icon: Palette },
};

export const FieldLocksTab: React.FC<Props> = ({
  users,
  onUsersUpdated,
  onSelectUserForEdit,
  onShowToast,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedLockFilter, setSelectedLockFilter] = useState<string>('all');
  const [batchActionLoading, setBatchActionLoading] = useState(false);

  // Filtered fields based on category
  const filteredCatalog = useMemo(() => {
    if (selectedCategory === 'all') return SYSTEM_FIELD_LOCKS_CATALOG;
    return SYSTEM_FIELD_LOCKS_CATALOG.filter((f) => f.category === selectedCategory);
  }, [selectedCategory]);

  // Filtered users list
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        u.displayName?.toLowerCase().includes(q) ||
        u.username?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.userId?.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (selectedLockFilter !== 'all') {
        const lockKey = selectedLockFilter as keyof UserFieldLocks;
        const isLocked = Boolean(u.fieldLocks && u.fieldLocks[lockKey]);
        return isLocked;
      }

      return true;
    });
  }, [users, searchQuery, selectedLockFilter]);

  // Toggle lock for a single user
  const handleToggleLock = async (user: AdminUserRecord, lockKey: keyof UserFieldLocks) => {
    if (user.role === 'admin' || user.userId === 'ADMIN-001') {
      onShowToast('تنبيه: حسابات مدراء النظام تتمتع بصلاحيات تحرير كاملة دائماً ولا تتأثر بقيود القفل.');
    }

    const currentLocks: UserFieldLocks = {
      ...DEFAULT_USER_FIELD_LOCKS,
      ...(user.fieldLocks || {}),
    };

    const updatedLocks: UserFieldLocks = {
      ...currentLocks,
      [lockKey]: !currentLocks[lockKey],
    };

    try {
      await adminUpdateUserFieldLocks({
        targetUserId: user.userId,
        fieldLocks: updatedLocks,
      });

      const updatedList = users.map((u) =>
        u.userId === user.userId ? { ...u, fieldLocks: updatedLocks } : u
      );
      onUsersUpdated(updatedList);
      onShowToast(
        updatedLocks[lockKey]
          ? `تم قفل الحقل (${lockKey}) لحساب ${user.displayName} بنجاح 🔒`
          : `تم فتح الحقل (${lockKey}) لحساب ${user.displayName} بنجاح 🔓`
      );
    } catch (err: any) {
      onShowToast(err.message || 'فشل تحديث قفل الحقل');
    }
  };

  // Lock all fields for a user
  const handleLockAllForUser = async (user: AdminUserRecord) => {
    const lockedAll: UserFieldLocks = { ...DEFAULT_USER_FIELD_LOCKS };
    SYSTEM_FIELD_LOCKS_CATALOG.forEach((f) => {
      lockedAll[f.key] = true;
    });

    try {
      await adminUpdateUserFieldLocks({
        targetUserId: user.userId,
        fieldLocks: lockedAll,
      });
      const updatedList = users.map((u) =>
        u.userId === user.userId ? { ...u, fieldLocks: lockedAll } : u
      );
      onUsersUpdated(updatedList);
      onShowToast(`تم قفل جميع حقول التحرير لحساب (${user.displayName}) بنجاح 🔒`);
    } catch (err: any) {
      onShowToast(err.message || 'فشل قفل الحقول');
    }
  };

  // Unlock all fields for a user
  const handleUnlockAllForUser = async (user: AdminUserRecord) => {
    const unlockedAll: UserFieldLocks = { ...DEFAULT_USER_FIELD_LOCKS };
    try {
      await adminUpdateUserFieldLocks({
        targetUserId: user.userId,
        fieldLocks: unlockedAll,
      });
      const updatedList = users.map((u) =>
        u.userId === user.userId ? { ...u, fieldLocks: unlockedAll } : u
      );
      onUsersUpdated(updatedList);
      onShowToast(`تم فتح جميع حقول التحرير لحساب (${user.displayName}) بنجاح 🔓`);
    } catch (err: any) {
      onShowToast(err.message || 'فشل فتح الحقول');
    }
  };

  // Batch toggle lock for all filtered non-admin users
  const handleBatchLockToggle = async (lockKey: keyof UserFieldLocks, lockValue: boolean) => {
    const targetUsers = filteredUsers.filter((u) => u.userId !== 'ADMIN-001');
    if (targetUsers.length === 0) {
      onShowToast('لا يوجد مستخدمين مستهدفين في القائمة الحالية');
      return;
    }

    const fieldDef = SYSTEM_FIELD_LOCKS_CATALOG.find((f) => f.key === lockKey);
    const title = fieldDef ? fieldDef.title : lockKey;

    if (
      !confirm(
        `هل أنت متأكد من ${lockValue ? 'قفل' : 'إتاحة وفتح'} (${title}) لجميع المستخدمين المحددين (${targetUsers.length} حساب)؟`
      )
    ) {
      return;
    }

    setBatchActionLoading(true);
    try {
      const userIds = targetUsers.map((u) => u.userId);
      await adminBatchUpdateFieldLocks({
        userIds,
        lockKey,
        lockValue,
      });

      const updatedList = users.map((u) => {
        if (userIds.includes(u.userId)) {
          const current = u.fieldLocks || { ...DEFAULT_USER_FIELD_LOCKS };
          return {
            ...u,
            fieldLocks: {
              ...current,
              [lockKey]: lockValue,
            },
          };
        }
        return u;
      });

      onUsersUpdated(updatedList);
      onShowToast(`تم تطبيق الإجراء لـ ${userIds.length} مستخدم بنجاح!`);
    } catch (err: any) {
      onShowToast(err.message || 'فشل التعديل الجماعي');
    } finally {
      setBatchActionLoading(false);
    }
  };

  // Helper to render field icon
  const renderFieldIcon = (iconName: string) => {
    switch (iconName) {
      case 'Building':
        return <Building className="w-4 h-4" />;
      case 'FileText':
        return <FileText className="w-4 h-4" />;
      case 'Image':
        return <Image className="w-4 h-4" />;
      case 'Award':
        return <Award className="w-4 h-4" />;
      case 'UserCheck':
        return <UserCheck className="w-4 h-4" />;
      case 'BookOpen':
        return <BookOpen className="w-4 h-4" />;
      case 'PenTool':
        return <PenTool className="w-4 h-4" />;
      case 'ShieldCheck':
        return <ShieldCheck className="w-4 h-4" />;
      case 'Calendar':
        return <Calendar className="w-4 h-4" />;
      case 'QrCode':
        return <QrCode className="w-4 h-4" />;
      case 'Sparkles':
        return <Sparkles className="w-4 h-4" />;
      case 'Layout':
        return <Layout className="w-4 h-4" />;
      case 'Palette':
        return <Palette className="w-4 h-4" />;
      case 'Maximize2':
        return <Maximize2 className="w-4 h-4" />;
      case 'Quote':
        return <Quote className="w-4 h-4" />;
      default:
        return <Lock className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 text-white rounded-2xl p-6 shadow-xl border border-amber-500/20 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 bg-amber-500/20 border border-amber-400/30 rounded-xl">
                  <Lock className="w-6 h-6 text-amber-400" />
                </div>
                <h2 className="text-xl font-bold">إدارة قفل وتثبيت حقول التحرير للحسابات</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  تحكم دقيق ومتقدم
                </span>
              </div>
              <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
                حدد بدقة الحقول التي يُسمح لكل حساب أو مستخدم بتعديلها في واجهة محرر الشهادات.
                يمكنك قفل اسم المدرسة، الترويسة الرسمية، التواقيع، الشعارات، أو نصوص التقدير لمنع
                التلاعب وضمان مطابقة الشهادات للهوية المؤسسية المعتمدة.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-center">
                <span className="block text-2xl font-black text-amber-400">
                  {SYSTEM_FIELD_LOCKS_CATALOG.length}
                </span>
                <span className="text-[11px] text-slate-300">حقل قابل للقفل</span>
              </div>
              <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-center">
                <span className="block text-2xl font-black text-emerald-400">
                  {users.filter((u) => u.role !== 'admin').length}
                </span>
                <span className="text-[11px] text-slate-300">حساب مستخدم</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Category Pills & Filters */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Categories */}
          <div className="flex flex-wrap items-center gap-2">
            {Object.entries(CATEGORY_MAP).map(([catKey, { label, icon: Icon }]) => (
              <button
                key={catKey}
                onClick={() => setSelectedCategory(catKey)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedCategory === catKey
                    ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>

          {/* Quick Lock Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={selectedLockFilter}
              onChange={(e) => setSelectedLockFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">تصفية حسب الحقل المقفل (الكل)</option>
              {SYSTEM_FIELD_LOCKS_CATALOG.map((f) => (
                <option key={f.key} value={f.key}>
                  مقفل لديه: {f.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search & Actions Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث بالاسم، اسم المستخدم، البريد، أو المعرف..."
              className="w-full pl-3 pr-9 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="text-xs text-slate-500 font-medium">
            عرض <span className="font-bold text-slate-800">{filteredUsers.length}</span> من أصل{' '}
            <span className="font-bold text-slate-800">{users.length}</span> حساب
          </div>
        </div>
      </div>

      {/* Field Locks Catalog Matrix / Cards */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-amber-600" />
            <h3 className="text-base font-bold text-slate-800">قائمة الحقول وخصائص القفل المتاحة</h3>
          </div>
          <span className="text-xs text-slate-500">
            انقر على أيقونة القفل لأي مستخدم لتبديل الحالة فوراً
          </span>
        </div>

        {/* Fields Catalog Overview */}
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 border-b border-slate-200 bg-slate-50/50">
          {filteredCatalog.map((field) => {
            const lockedCount = users.filter(
              (u) => u.fieldLocks && u.fieldLocks[field.key]
            ).length;

            return (
              <div
                key={field.key}
                className="bg-white p-3.5 rounded-xl border border-slate-200 hover:border-amber-300 transition-all flex flex-col justify-between space-y-2 group shadow-xs"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2 text-amber-700 font-bold text-xs">
                      <div className="p-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
                        {renderFieldIcon(field.iconName)}
                      </div>
                      <span className="leading-tight">{field.title}</span>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                      {field.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">
                    {field.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-slate-600">
                    مقفل عند: <strong className="text-amber-700">{lockedCount}</strong> مستخدم
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      disabled={batchActionLoading}
                      onClick={() => handleBatchLockToggle(field.key, true)}
                      title="قفل هذا الحقل لجميع المستخدمين في القائمة"
                      className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 font-medium text-[10px] flex items-center gap-1"
                    >
                      <Lock className="w-2.5 h-2.5" /> قفل للكل
                    </button>
                    <button
                      disabled={batchActionLoading}
                      onClick={() => handleBatchLockToggle(field.key, false)}
                      title="فتح وإتاحة هذا الحقل لجميع المستخدمين في القائمة"
                      className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-medium text-[10px] flex items-center gap-1"
                    >
                      <Unlock className="w-2.5 h-2.5" /> فتح للكل
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Users Lock Management Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3.5 min-w-[200px]">المستخدم / الحساب</th>
                <th className="p-3.5 min-w-[100px]">الدور والنوع</th>
                <th className="p-3.5 min-w-[130px]">إجمالي الحقول المقفلة</th>
                <th className="p-3.5 min-w-[320px]">حالة قفل الحقول الرئيسية</th>
                <th className="p-3.5 min-w-[180px] text-center">إجراءات سريعة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    لا يوجد حسابات مطابقة لمعايير البحث الحالية
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isAdmin = user.role === 'admin' || user.userId === 'ADMIN-001';
                  const locks = user.fieldLocks || { ...DEFAULT_USER_FIELD_LOCKS };
                  const lockedKeys = Object.keys(locks).filter((k) => (locks as any)[k]);
                  const lockedCount = lockedKeys.length;

                  return (
                    <tr key={user.userId} className="hover:bg-slate-50/80 transition-colors">
                      {/* User Info */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs border border-amber-200 shrink-0">
                            {user.displayName?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <div className="font-bold text-slate-800 flex items-center gap-1.5">
                              {user.displayName}
                              {isAdmin && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-500 text-white font-bold">
                                  مدير
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              @{user.username || user.userId}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role & Verification */}
                      <td className="p-3.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isAdmin
                              ? 'bg-purple-100 text-purple-700 border border-purple-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}
                        >
                          {isAdmin ? 'مدير نظام' : 'مستخدم عادي'}
                        </span>
                      </td>

                      {/* Locked count badge */}
                      <td className="p-3.5">
                        {isAdmin ? (
                          <span className="text-slate-400 text-[11px] italic">
                            غير مقيد (كامل الصلاحيات)
                          </span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                lockedCount > 0
                                  ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}
                            >
                              {lockedCount} من {SYSTEM_FIELD_LOCKS_CATALOG.length} حقول
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Fields quick badges */}
                      <td className="p-3.5">
                        {isAdmin ? (
                          <span className="text-slate-400 text-xs">
                            حساب المدير الأساسي يملك صلاحية تحرير كافة الحقول تلقائياً
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5 max-w-xl">
                            {filteredCatalog.map((f) => {
                              const isLocked = Boolean(locks[f.key]);
                              return (
                                <button
                                  key={f.key}
                                  onClick={() => handleToggleLock(user, f.key)}
                                  title={`${f.title} (${isLocked ? 'مقفل - انقر للفتح' : 'مفتوح - انقر للقفل'})`}
                                  className={`px-2 py-1 rounded-lg text-[10px] font-medium transition-all flex items-center gap-1 border ${
                                    isLocked
                                      ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 shadow-2xs'
                                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                  }`}
                                >
                                  {isLocked ? (
                                    <Lock className="w-2.5 h-2.5 text-rose-600" />
                                  ) : (
                                    <Unlock className="w-2.5 h-2.5 text-slate-400" />
                                  )}
                                  <span>{f.badge}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {!isAdmin && (
                            <>
                              <button
                                onClick={() => handleLockAllForUser(user)}
                                title="قفل جميع الحقول"
                                className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-bold flex items-center gap-1"
                              >
                                <Lock className="w-3 h-3" /> قفل الكل
                              </button>
                              <button
                                onClick={() => handleUnlockAllForUser(user)}
                                title="فتح وإتاحة جميع الحقول"
                                className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[11px] font-bold flex items-center gap-1"
                              >
                                <Unlock className="w-3 h-3" /> إتاحة الكل
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => onSelectUserForEdit(user)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px]"
                          >
                            تخصيص
                          </button>
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
  );
};
