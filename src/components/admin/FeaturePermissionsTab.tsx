import React, { useState, useMemo } from 'react';
import {
  Zap,
  Shield,
  Layers,
  FileText,
  Sparkles,
  Cloud,
  ExternalLink,
  CheckCircle2,
  ShieldCheck,
  Database,
  Sliders,
  Lock,
  Search,
  Check,
  X,
  AlertTriangle,
  RotateCcw,
  Users,
  Settings,
  Filter,
  CheckCheck,
  Ban
} from 'lucide-react';
import { AdminUserRecord, adminUpdateUserFeatures, adminBatchUpdateFeatures } from '../../services/adminService';
import {
  UserFeatureFlags,
  SYSTEM_FEATURES_CATALOG,
  FeatureDefinition,
  DEFAULT_USER_FEATURE_FLAGS,
  ADMIN_FEATURE_FLAGS,
} from '../../services/accountPermissionsService';

interface Props {
  users: AdminUserRecord[];
  onUsersUpdated: (updatedUsers: AdminUserRecord[]) => void;
  onSelectUserForEdit: (user: AdminUserRecord) => void;
  onShowToast: (msg: string) => void;
}

export const FeaturePermissionsTab: React.FC<Props> = ({
  users,
  onUsersUpdated,
  onSelectUserForEdit,
  onShowToast,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedFeatureFilter, setSelectedFeatureFilter] = useState<string>('all');
  const [batchActionLoading, setBatchActionLoading] = useState(false);

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

      if (selectedFeatureFilter !== 'all') {
        const featKey = selectedFeatureFilter as keyof UserFeatureFlags;
        const isEnabled = u.features ? Boolean(u.features[featKey]) : u.role === 'admin';
        return isEnabled;
      }

      return true;
    });
  }, [users, searchQuery, selectedFeatureFilter]);

  // Quick single feature toggle for a user
  const handleToggleUserFeature = async (user: AdminUserRecord, featureKey: keyof UserFeatureFlags) => {
    if (user.userId === 'ADMIN-001' && featureKey === 'isAccountActive') {
      onShowToast('محظور: لا يمكن تجميد حساب المدير الأساسي للمنظومة!');
      return;
    }

    const currentFeatures: UserFeatureFlags = {
      ...(user.role === 'admin' ? ADMIN_FEATURE_FLAGS : DEFAULT_USER_FEATURE_FLAGS),
      ...(user.features || {}),
    };

    const updatedFeatures: UserFeatureFlags = {
      ...currentFeatures,
      [featureKey]: !currentFeatures[featureKey],
    };

    try {
      await adminUpdateUserFeatures({
        targetUserId: user.userId,
        features: updatedFeatures,
      });

      const updatedList = users.map((u) =>
        u.userId === user.userId ? { ...u, features: updatedFeatures } : u
      );
      onUsersUpdated(updatedList);
      onShowToast(
        `تم ${updatedFeatures[featureKey] ? 'تفعيل' : 'إيقاف'} ميزة (${featureKey}) لحساب (${user.displayName}) بنجاح`
      );
    } catch (e: any) {
      onShowToast(e.message || 'فشل تعديل الميزة');
    }
  };

  // Bulk toggle a feature for all regular users
  const handleBulkToggleFeature = async (featureKey: keyof UserFeatureFlags, featureValue: boolean) => {
    const regularUserIds = users.filter((u) => u.userId !== 'ADMIN-001').map((u) => u.userId);
    if (regularUserIds.length === 0) return;

    setBatchActionLoading(true);
    try {
      await adminBatchUpdateFeatures({
        userIds: regularUserIds,
        featureKey,
        featureValue,
      });

      const updatedList = users.map((u) => {
        if (u.userId === 'ADMIN-001' && featureKey === 'isAccountActive') return u;
        return {
          ...u,
          features: {
            ...(u.features || DEFAULT_USER_FEATURE_FLAGS),
            [featureKey]: featureValue,
          },
        };
      });

      onUsersUpdated(updatedList);
      onShowToast(
        `تم ${featureValue ? 'تفعيل' : 'تعطيل'} ميزة (${featureKey}) لجميع المستخدمين (${regularUserIds.length}) بنجاح! ⚡`
      );
    } catch (e: any) {
      onShowToast(e.message || 'فشل التعديل الجماعي');
    } finally {
      setBatchActionLoading(false);
    }
  };

  // Compute stats for each feature
  const featureStats = useMemo(() => {
    const stats: Record<string, { enabled: number; disabled: number }> = {};
    SYSTEM_FEATURES_CATALOG.forEach((f) => {
      let enabled = 0;
      let disabled = 0;
      users.forEach((u) => {
        const isEn = u.features ? Boolean(u.features[f.key]) : u.role === 'admin';
        if (isEn) enabled++;
        else disabled++;
      });
      stats[f.key] = { enabled, disabled };
    });
    return stats;
  }, [users]);

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      {/* Overview Stat Cards of Core Capabilities */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {SYSTEM_FEATURES_CATALOG.slice(0, 6).map((f) => {
          const count = featureStats[f.key]?.enabled || 0;
          return (
            <div
              key={f.key}
              onClick={() => setSelectedFeatureFilter(selectedFeatureFilter === f.key ? 'all' : f.key)}
              className={`p-3 rounded-2xl border transition cursor-pointer ${
                selectedFeatureFilter === f.key
                  ? 'bg-amber-500/10 border-amber-500/50 shadow-md'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-bold truncate max-w-[80px]">{f.badge}</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
              </div>
              <div className="text-xl font-black text-white mt-1 font-mono">{count}</div>
              <div className="text-[11px] font-bold text-slate-300 truncate mt-0.5" title={f.title}>
                {f.title}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bulk Controls Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث في الحسابات المدارة..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pr-9 pl-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
            />
          </div>

          <select
            value={selectedFeatureFilter}
            onChange={(e) => setSelectedFeatureFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-400 cursor-pointer"
          >
            <option value="all">كافة المميزات</option>
            {SYSTEM_FEATURES_CATALOG.map((f) => (
              <option key={f.key} value={f.key}>
                المفعل لهم: {f.title}
              </option>
            ))}
          </select>
        </div>

        {/* Global Batch Controls */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          <button
            type="button"
            disabled={batchActionLoading}
            onClick={() => handleBulkToggleFeature('canBatchGenerate', true)}
            className="px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>تفعيل التوليد الجماعي للجميع</span>
          </button>

          <button
            type="button"
            disabled={batchActionLoading}
            onClick={() => handleBulkToggleFeature('canBatchGenerate', false)}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Ban className="w-3.5 h-3.5" />
            <span>إيقاف التوليد الجماعي للجميع</span>
          </button>

          <button
            type="button"
            disabled={batchActionLoading}
            onClick={() => handleBulkToggleFeature('canUseAi', true)}
            className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>تفعيل AI للجميع</span>
          </button>
        </div>
      </div>

      {/* Users Feature Permissions Table Matrix */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-800/90 text-slate-300 border-b border-slate-700/80 text-[11px] font-bold">
              <tr>
                <th className="p-3.5 min-w-[180px]">الحساب والمستخدم</th>
                <th className="p-3.5 text-center min-w-[70px]" title="إصدار وتعديل الشهادات">إصدار</th>
                <th className="p-3.5 text-center min-w-[80px]" title="التوليد الجماعي واستيراد Excel">توليد جماعي</th>
                <th className="p-3.5 text-center min-w-[70px]" title="تصدير PDF عالي الدقة">تصدير PDF</th>
                <th className="p-3.5 text-center min-w-[70px]" title="تصدير صور PNG/JPG">تصدير صور</th>
                <th className="p-3.5 text-center min-w-[80px]" title="المساعد الذكي AI (Gemini)">الذكاء AI</th>
                <th className="p-3.5 text-center min-w-[80px]" title="Google Drive والتخزين السحابي">Google Drive</th>
                <th className="p-3.5 text-center min-w-[80px]" title="الإرسال بالبريد الإلكتروني">إرسال بريد</th>
                <th className="p-3.5 text-center min-w-[80px]" title="التواقيع والأختام الرقمية">تواقيع وأختام</th>
                <th className="p-3.5 text-center min-w-[80px]" title="توثيق وفحص QR Code">فحص QR</th>
                <th className="p-3.5 text-center min-w-[70px]" title="حالة الحساب (نشط / مجمّد)">الحالة</th>
                <th className="p-3.5 text-center min-w-[90px]">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={12} className="p-8 text-center text-slate-500">
                    لا يوجد مستخدمون مطابقون لمعايير البحث
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isPrimaryAdmin = u.userId === 'ADMIN-001';
                  const userFeats = u.features || (u.role === 'admin' ? ADMIN_FEATURE_FLAGS : DEFAULT_USER_FEATURE_FLAGS);
                  const isFrozen = userFeats.isAccountActive === false;

                  return (
                    <tr
                      key={u.userId}
                      className={`hover:bg-slate-800/40 transition ${isFrozen ? 'bg-rose-950/10' : ''}`}
                    >
                      {/* User Column */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-300 text-xs">
                            {u.displayName?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <div className="font-bold text-white flex items-center gap-1.5">
                              <span>{u.displayName}</span>
                              {u.role === 'admin' && (
                                <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1 py-0.2 rounded font-bold">
                                  {isPrimaryAdmin ? 'أساسي' : 'مدير'}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">{u.username || u.userId}</div>
                          </div>
                        </div>
                      </td>

                      {/* canIssueCertificates */}
                      <td className="p-3.5 text-center">
                        <FeatureToggleBadge
                          enabled={userFeats.canIssueCertificates}
                          onClick={() => handleToggleUserFeature(u, 'canIssueCertificates')}
                        />
                      </td>

                      {/* canBatchGenerate */}
                      <td className="p-3.5 text-center">
                        <FeatureToggleBadge
                          enabled={userFeats.canBatchGenerate}
                          highlight="indigo"
                          onClick={() => handleToggleUserFeature(u, 'canBatchGenerate')}
                        />
                      </td>

                      {/* canExportPdf */}
                      <td className="p-3.5 text-center">
                        <FeatureToggleBadge
                          enabled={userFeats.canExportPdf}
                          onClick={() => handleToggleUserFeature(u, 'canExportPdf')}
                        />
                      </td>

                      {/* canExportImage */}
                      <td className="p-3.5 text-center">
                        <FeatureToggleBadge
                          enabled={userFeats.canExportImage}
                          onClick={() => handleToggleUserFeature(u, 'canExportImage')}
                        />
                      </td>

                      {/* canUseAi */}
                      <td className="p-3.5 text-center">
                        <FeatureToggleBadge
                          enabled={userFeats.canUseAi}
                          highlight="amber"
                          onClick={() => handleToggleUserFeature(u, 'canUseAi')}
                        />
                      </td>

                      {/* canUseCloudDrive */}
                      <td className="p-3.5 text-center">
                        <FeatureToggleBadge
                          enabled={userFeats.canUseCloudDrive}
                          highlight="sky"
                          onClick={() => handleToggleUserFeature(u, 'canUseCloudDrive')}
                        />
                      </td>

                      {/* canUseEmailDispatch */}
                      <td className="p-3.5 text-center">
                        <FeatureToggleBadge
                          enabled={userFeats.canUseEmailDispatch}
                          onClick={() => handleToggleUserFeature(u, 'canUseEmailDispatch')}
                        />
                      </td>

                      {/* canUseSignatures */}
                      <td className="p-3.5 text-center">
                        <FeatureToggleBadge
                          enabled={userFeats.canUseSignatures}
                          onClick={() => handleToggleUserFeature(u, 'canUseSignatures')}
                        />
                      </td>

                      {/* canVerifyCertificates */}
                      <td className="p-3.5 text-center">
                        <FeatureToggleBadge
                          enabled={userFeats.canVerifyCertificates}
                          onClick={() => handleToggleUserFeature(u, 'canVerifyCertificates')}
                        />
                      </td>

                      {/* isAccountActive */}
                      <td className="p-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleUserFeature(u, 'isAccountActive')}
                          disabled={isPrimaryAdmin}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition cursor-pointer ${
                            !isFrozen
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25'
                              : 'bg-rose-500/15 text-rose-400 border-rose-500/30 hover:bg-rose-500/25'
                          } disabled:opacity-40 disabled:cursor-not-allowed`}
                        >
                          {!isFrozen ? 'نشط' : 'مجمّد'}
                        </button>
                      </td>

                      {/* Action Button */}
                      <td className="p-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => onSelectUserForEdit(u)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-300 border border-slate-700 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer mx-auto"
                        >
                          <Sliders className="w-3 h-3" />
                          <span>تخصيص</span>
                        </button>
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

// Mini badge helper for clickable toggle cell
const FeatureToggleBadge: React.FC<{
  enabled: boolean;
  highlight?: 'amber' | 'indigo' | 'sky';
  onClick: () => void;
}> = ({ enabled, highlight, onClick }) => {
  let activeColors = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
  if (highlight === 'amber') activeColors = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
  if (highlight === 'indigo') activeColors = 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40';
  if (highlight === 'sky') activeColors = 'bg-sky-500/20 text-sky-300 border-sky-500/40';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-7 h-7 rounded-lg border flex items-center justify-center transition cursor-pointer mx-auto ${
        enabled
          ? `${activeColors} hover:opacity-80`
          : 'bg-slate-800/40 text-slate-600 border-slate-800 hover:bg-slate-800 hover:text-slate-400'
      }`}
      title={enabled ? 'مفعل (انقر للتعطيل)' : 'معطل (انقر للتفعيل)'}
    >
      {enabled ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <X className="w-3.5 h-3.5 stroke-[2]" />}
    </button>
  );
};
