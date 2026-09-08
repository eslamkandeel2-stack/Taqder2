import React, { useState, useMemo } from 'react';
import {
  School,
  PenTool,
  Award,
  Sliders,
  Search,
  RotateCcw,
  Copy,
  CheckCircle2,
  FileSpreadsheet,
  QrCode,
  Calendar,
  Sparkles,
  Info,
  UserCheck
} from 'lucide-react';
import { AdminUserRecord, adminUpdateUserDefaults } from '../../services/adminService';
import { UserDefaultSettings } from '../../services/accountPermissionsService';
import { getSavedDefaultSettings } from '../../utils/defaultSettings';

interface Props {
  users: AdminUserRecord[];
  onUsersUpdated: (updatedUsers: AdminUserRecord[]) => void;
  onSelectUserForEdit: (user: AdminUserRecord) => void;
  onShowToast: (msg: string) => void;
}

export const AccountDefaultsTab: React.FC<Props> = ({
  users,
  onUsersUpdated,
  onSelectUserForEdit,
  onShowToast,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'custom' | 'default'>('all');

  const sysDefaults = useMemo(() => getSavedDefaultSettings(), []);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        u.displayName?.toLowerCase().includes(q) ||
        u.username?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.userId?.toLowerCase().includes(q) ||
        u.defaultSettings?.issuerTitle?.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      const hasCustom = Boolean(u.defaultSettings && Object.keys(u.defaultSettings).length > 0 && u.defaultSettings.issuerTitle);
      if (filterMode === 'custom') return hasCustom;
      if (filterMode === 'default') return !hasCustom;

      return true;
    });
  }, [users, searchQuery, filterMode]);

  // Reset a user's defaults to general system defaults
  const handleResetUserToSystemDefaults = async (u: AdminUserRecord) => {
    const emptyDefaults: UserDefaultSettings = {
      issuerTitle: '',
      signatureTitle1: '',
      signatureName1: '',
      signatureTitle2: '',
      signatureName2: '',
      defaultCertificateType: 'شهادة شكر وتقدير',
      defaultPaperSize: 'a4',
      defaultOrientation: 'landscape',
      showQrCode: true,
      showIssueDate: true,
      defaultNotes: '',
    };

    try {
      await adminUpdateUserDefaults({
        targetUserId: u.userId,
        defaultSettings: emptyDefaults,
      });

      const updated = users.map((user) =>
        user.userId === u.userId ? { ...user, defaultSettings: emptyDefaults } : user
      );
      onUsersUpdated(updated);
      onShowToast(`تمت استعادة الإعدادات العامة لحساب (${u.displayName}) بنجاح`);
    } catch (e: any) {
      onShowToast(e.message || 'فشل استعادة الإعدادات');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      {/* Informative Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 flex-shrink-0">
            <School className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-black text-white text-base">
              الإعدادات الافتراضية لكل حساب (Default Settings per Account)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              تحديد الجهة المصدرة، المسميات، التواقيع، ونوع الشهادة الافتراضي لكل حساب مستخدم لتبسيط عمله وضمان تناسق مخرجاته.
            </p>
          </div>
        </div>

        {/* Global default reference pill */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-xs flex items-center gap-2 text-slate-300">
          <span className="text-[11px] text-slate-500">الجهة العامة للنظام:</span>
          <span className="font-bold text-amber-300">{sysDefaults.schoolName || 'ثانوية الأندلس النموذجية'}</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث بالحساب، الجهة، أو المستخدم..."
            className="w-full bg-slate-800 border border-slate-700 rounded-xl pr-9 pl-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={filterMode}
            onChange={(e) => setFilterMode(e.target.value as any)}
            className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-400 cursor-pointer"
          >
            <option value="all">كافة الحسابات ({users.length})</option>
            <option value="custom">حسابات بإعدادات مخصصة</option>
            <option value="default">حسابات تتبع الإعدادات العامة</option>
          </select>
        </div>
      </div>

      {/* Accounts Default Settings Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredUsers.length === 0 ? (
          <div className="col-span-full p-12 text-center text-slate-500 bg-slate-900 border border-slate-800 rounded-2xl">
            لا توجد حسابات مطابقة للبحث
          </div>
        ) : (
          filteredUsers.map((u) => {
            const hasCustomDefaults = Boolean(u.defaultSettings && u.defaultSettings.issuerTitle);
            const issuer = u.defaultSettings?.issuerTitle || sysDefaults.schoolName || '— (افتراضي النظام)';
            const sig1Title = u.defaultSettings?.signatureTitle1 || sysDefaults.principalTitle || 'مدير المدرسة';
            const sig1Name = u.defaultSettings?.signatureName1 || sysDefaults.principalName || '—';
            const sig2Title = u.defaultSettings?.signatureTitle2 || sysDefaults.teacherTitle;
            const sig2Name = u.defaultSettings?.signatureName2 || sysDefaults.teacherName;
            const certType = u.defaultSettings?.defaultCertificateType || 'شهادة شكر وتقدير';
            const paperSize = (u.defaultSettings?.defaultPaperSize || 'a4').toUpperCase();
            const orientation = u.defaultSettings?.defaultOrientation === 'portrait' ? 'رأسي' : 'أفقي';

            return (
              <div
                key={u.userId}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 flex flex-col justify-between space-y-4 transition shadow-lg"
              >
                <div>
                  {/* Card Header: User identity & custom badge */}
                  <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-white text-xs">
                        {u.displayName?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <div className="font-bold text-white text-xs flex items-center gap-1.5">
                          <span>{u.displayName}</span>
                          {u.role === 'admin' && (
                            <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1 py-0.2 rounded font-bold">
                              مدير
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">{u.username || u.userId}</div>
                      </div>
                    </div>

                    {hasCustomDefaults ? (
                      <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">
                        مخصص
                      </span>
                    ) : (
                      <span className="text-[10px] bg-slate-800 text-slate-400 border border-slate-700 px-2 py-0.5 rounded-full">
                        عام
                      </span>
                    )}
                  </div>

                  {/* Settings Details */}
                  <div className="mt-3 space-y-2 text-xs">
                    {/* Issuer */}
                    <div className="flex items-start gap-2 bg-slate-950/60 p-2 rounded-xl border border-slate-800/80">
                      <School className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <div className="text-[10px] text-slate-400">الجهة المصدرة:</div>
                        <div className="font-bold text-white truncate">{issuer}</div>
                      </div>
                    </div>

                    {/* Signatures */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-slate-950/40 p-2 rounded-xl border border-slate-800/60">
                        <div className="text-[10px] text-slate-400 truncate">{sig1Title}:</div>
                        <div className="font-bold text-slate-200 text-[11px] truncate">{sig1Name}</div>
                      </div>

                      <div className="bg-slate-950/40 p-2 rounded-xl border border-slate-800/60">
                        <div className="text-[10px] text-slate-400 truncate">{sig2Title || 'الموقع الثاني'}:</div>
                        <div className="font-bold text-slate-200 text-[11px] truncate">{sig2Name || '—'}</div>
                      </div>
                    </div>

                    {/* Cert Type & Dimensions */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px] font-bold">
                        {certType}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px] font-mono">
                        {paperSize} ({orientation})
                      </span>
                      {u.defaultSettings?.showQrCode !== false && (
                        <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 text-[10px] font-bold border border-purple-500/20">
                          QR فعال
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                  {hasCustomDefaults && (
                    <button
                      type="button"
                      onClick={() => handleResetUserToSystemDefaults(u)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer"
                      title="استعادة الإعدادات العامة للنظام"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => onSelectUserForEdit(u)}
                    className="w-full px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500 hover:text-slate-950 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>تعديل الإعدادات الافتراضية</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
