import React, { useState, useEffect } from 'react';
import { 
  User as UserIcon, 
  LogIn, 
  LogOut, 
  Cloud, 
  CloudCheck, 
  RefreshCw, 
  CheckCircle2, 
  ShieldCheck, 
  Mail, 
  Sparkles, 
  HardDrive, 
  Sliders, 
  AlertCircle, 
  Database,
  ArrowUpRight,
  Loader2,
  X,
  Users,
  Trash2,
  ArrowLeftRight,
  PlusCircle,
  Lock,
  Layers
} from 'lucide-react';
import { User } from 'firebase/auth';
import { googleSignIn, googleSignOut, getAccessToken } from '../services/googleDriveService';
import { 
  syncFullAccountToCloud, 
  restoreAccountFromCloud, 
  syncUserSettingsToCloud 
} from '../services/cloudDatabaseService';
import { 
  switchAndIsolateAccount, 
  getKnownAccounts, 
  removeAccountFromDevice, 
  getAccountKey, 
  KnownAccountRecord 
} from '../services/accountIsolationManager';

interface UserAuthProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onUserChange: (user: User | null) => void;
  onShowToast: (msg: string) => void;
  onOpenCloudLibrary?: () => void;
}

export const UserAuthProfileModal: React.FC<UserAuthProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserChange,
  onShowToast,
  onOpenCloudLibrary
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [lastSyncResult, setLastSyncResult] = useState<{
    certsCount?: number;
    draftsCount?: number;
    batchesCount?: number;
  } | null>(null);

  const [institutionName, setInstitutionName] = useState('');
  const [institutionEmail, setInstitutionEmail] = useState('');
  const [showCustomLogin, setShowCustomLogin] = useState(false);
  const [knownAccounts, setKnownAccounts] = useState<KnownAccountRecord[]>([]);
  const [switchingAccountKey, setSwitchingAccountKey] = useState<string | null>(null);

  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;

  useEffect(() => {
    if (isOpen) {
      setKnownAccounts(getKnownAccounts());
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const currentAccountKey = getAccountKey(currentUser);

  // 1. Google Auth Login with Account Isolation
  const handleLogin = async () => {
    try {
      setIsLoading(true);
      const res = await googleSignIn();
      
      // Perform isolated switch & restore
      const restoreRes = await switchAndIsolateAccount(res.user, currentUser);
      onUserChange(res.user);
      setLastSyncResult(restoreRes);
      setKnownAccounts(getKnownAccounts());

      onShowToast(`أهلاً بك ${res.user.displayName || 'عزيزنا المستخدم'}! تم عزل واستعادة بيانات حسابك بنجاح ✨ (${restoreRes.certsCount} شهادة، ${restoreRes.draftsCount} مسودة)`);
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user' || err?.isUserCancel || err?.message?.includes('إلغاء') || err?.message?.includes('إغلاق')) {
        onShowToast('تم إلغاء تسجيل الدخول.');
        return;
      }
      console.warn('Login note:', err);
      onShowToast(err.message || 'تعذر تسجيل الدخول بحساب Google');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Custom School Account Login with Account Isolation
  const handleCustomProfileLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!institutionName.trim() || !institutionEmail.trim()) {
      onShowToast('يرجى إدخال اسم الجهة / المدرسة والبريد الإلكتروني');
      return;
    }

    try {
      setIsLoading(true);
      const customUser = {
        uid: 'school_' + institutionEmail.trim().replace(/[^a-zA-Z0-9]/g, '_'),
        email: institutionEmail.trim(),
        displayName: institutionName.trim(),
        photoURL: ''
      } as User;

      localStorage.setItem('taqdeer_gis_user', JSON.stringify(customUser));
      
      // Perform isolated switch & restore
      const restoreRes = await switchAndIsolateAccount(customUser, currentUser);
      onUserChange(customUser);
      setLastSyncResult(restoreRes);
      setKnownAccounts(getKnownAccounts());

      onShowToast(`مرحباً بك ${customUser.displayName}! تم ربط وعزل الحساب السحابي بنجاح ☁️ (${restoreRes.certsCount} شهادة)`);
      setShowCustomLogin(false);
    } catch (err: any) {
      console.error('Custom login error:', err);
      onShowToast('فشل تفعيل الحساب السحابي');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Switch directly to a known account saved on this device
  const handleSwitchToSavedAccount = async (targetAccount: KnownAccountRecord) => {
    if (targetAccount.accountKey === currentAccountKey) {
      onShowToast('أنت تعمل حالياً على هذا الحساب بالفعل');
      return;
    }

    try {
      setSwitchingAccountKey(targetAccount.accountKey);
      setIsLoading(true);

      const targetUser = {
        uid: targetAccount.uid,
        email: targetAccount.email,
        displayName: targetAccount.displayName,
        photoURL: targetAccount.photoURL || ''
      } as User;

      // Save custom user marker
      localStorage.setItem('taqdeer_gis_user', JSON.stringify(targetUser));

      // Perform complete account workspace swap & isolation
      const restoreRes = await switchAndIsolateAccount(targetUser, currentUser);
      onUserChange(targetUser);
      setLastSyncResult(restoreRes);
      setKnownAccounts(getKnownAccounts());

      onShowToast(`تم التبديل بنجاح إلى حساب: ${targetAccount.displayName} 🔄 (تم استعادة ${restoreRes.certsCount} شهادة، ${restoreRes.draftsCount} مسودة معزولة)`);
    } catch (err: any) {
      console.error('Account switch error:', err);
      onShowToast('حدث خطأ أثناء تبديل الحساب');
    } finally {
      setIsLoading(false);
      setSwitchingAccountKey(null);
    }
  };

  // 4. Remove account vault from this device
  const handleRemoveAccount = (e: React.MouseEvent, targetAccountKey: string, accountName: string) => {
    e.stopPropagation();
    if (confirm(`هل أنت متأكد من إزالة بيانات الحساب (${accountName}) من هذا الجهاز؟ (البيانات السحابية ستظل محفوظة ويمكن استعادتها عند تسجيل الدخول مجدداً)`)) {
      removeAccountFromDevice(targetAccountKey);
      setKnownAccounts(getKnownAccounts());
      onShowToast(`تمت إزالة الحساب من ذاكرة هذا الجهاز 🗑️`);
    }
  };

  // 5. Logout with Account Isolation (Reset to clean guest state)
  const handleLogout = async () => {
    try {
      setIsLoading(true);
      await googleSignOut();
      
      // Isolate and reset to clean guest workspace
      await switchAndIsolateAccount(null, currentUser);
      onUserChange(null);
      setLastSyncResult(null);
      setKnownAccounts(getKnownAccounts());

      onShowToast('تم تسجيل الخروج وتأمين بيانات الحساب بنجاح 🔒');
    } catch (e: any) {
      console.error(e);
      onShowToast('حدث خطأ أثناء تسجيل الخروج');
    } finally {
      setIsLoading(false);
    }
  };

  // 6. Manual Sync
  const handleSyncToCloud = async () => {
    if (!currentUser) {
      onShowToast('يرجى تسجيل الدخول أولاً للمزامنة');
      return;
    }
    try {
      setIsSyncing(true);
      setSyncStatus('idle');
      const res = await syncFullAccountToCloud(currentUser);
      setSyncStatus('success');
      setLastSyncResult(res);
      setKnownAccounts(getKnownAccounts());
      onShowToast(`تمت مزامنة وحفظ جميع إعداداتك وشهاداتك (${res.certsCount}) على السحابة بنجاح! ☁️✨`);
    } catch (err: any) {
      console.error('Sync error:', err);
      setSyncStatus('error');
      onShowToast(err.message || 'فشلت المزامنة السحابية');
    } finally {
      setIsSyncing(false);
    }
  };

  // 7. Manual Restore
  const handleRestoreFromCloud = async () => {
    if (!currentUser) {
      onShowToast('يرجى تسجيل الدخول أولاً');
      return;
    }
    try {
      setIsSyncing(true);
      const res = await restoreAccountFromCloud(currentUser.uid, currentUser.email || '');
      setLastSyncResult(res);
      setKnownAccounts(getKnownAccounts());
      onShowToast(`تم جلب واستعادة إعداداتك وبياناتك بنجاح (${res.certsCount} شهادة، ${res.draftsCount} مسودة) 📥`);
    } catch (err: any) {
      console.error('Restore error:', err);
      onShowToast(err.message || 'فشل جلب البيانات من السحابة');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[115] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-slate-900 border border-slate-700 max-w-lg w-full rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl space-y-5 max-h-[92dvh] overflow-y-auto overscroll-contain touch-pan-y text-right">
        
        {/* Mobile Swipe Handle */}
        <div className="w-12 h-1 bg-slate-700 rounded-full mx-auto sm:hidden shrink-0 mb-1" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-2xl border border-amber-500/30">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">إدارة الحسابات وعزل البيانات السحابية</h3>
              <p className="text-xs text-slate-400">عزل مستقل لشهادات وإعدادات كل حساب مع الاسترجاع التلقائي</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Active Account Card */}
        {currentUser ? (
          <div className="bg-gradient-to-br from-slate-850 to-slate-900 border-2 border-amber-500/40 p-4 rounded-2xl space-y-4 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
                الحساب النشط حالياً ⚡
              </span>
              <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-bold">
                <Lock className="w-3 h-3" />
                <span>بيانات معزولة ومحمية</span>
              </div>
            </div>

            <div className="flex items-center gap-3.5">
              {currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || 'المستخدم'}
                  referrerPolicy="no-referrer"
                  className="w-12 h-12 rounded-full border-2 border-amber-400/80 object-cover shadow-sm"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-black text-lg flex items-center justify-center border-2 border-amber-300 shadow-md">
                  {currentUser.displayName ? currentUser.displayName[0] : 'U'}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h4 className="font-extrabold text-sm text-white truncate">
                  {currentUser.displayName || 'مستخدم معتمد'}
                </h4>
                <p className="text-xs text-slate-300 font-mono truncate">{currentUser.email}</p>
              </div>
            </div>

            {/* Linked Services Badges */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-700/60 text-center">
              <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-700">
                <Cloud className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                <span className="text-[11px] font-bold text-slate-200 block">Google Drive</span>
                <span className="text-[9px] text-emerald-400">مربوط ومعزول</span>
              </div>
              <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-700">
                <Database className="w-4 h-4 text-indigo-400 mx-auto mb-1" />
                <span className="text-[11px] font-bold text-slate-200 block">قاعدة البيانات</span>
                <span className="text-[9px] text-emerald-400">خزنة سحابية</span>
              </div>
              <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-700">
                <Mail className="w-4 h-4 text-sky-400 mx-auto mb-1" />
                <span className="text-[11px] font-bold text-slate-200 block">بريد الشهادات</span>
                <span className="text-[9px] text-emerald-400">خاص بالحساب</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-slate-800/50 border border-slate-700/80 p-5 rounded-2xl text-center space-y-3">
            <div className="w-12 h-12 bg-amber-500/20 text-amber-400 rounded-full flex items-center justify-center mx-auto border border-amber-500/30">
              <UserIcon className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-white">تسجيل الدخول بالحساب الرسمي</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                سجل الدخول بحسابك لعزل واسترجاع كافة شهاداتك، مسوداتك، توقيعاتك، وإعدادات مدرستك تلقائياً على هذا الجهاز أو أي جهاز آخر.
              </p>
            </div>

            <button
              onClick={handleLogin}
              disabled={isLoading}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 text-slate-950 font-black text-xs rounded-xl transition shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري تسجيل الدخول واسترجاع البيانات...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>تسجيل الدخول بحساب Google</span>
                </>
              )}
            </button>

            {/* If in iframe or user prefers new tab */}
            {isInIframe && (
              <div className="pt-2 border-t border-slate-700/60">
                <a
                  href={window.location.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs rounded-xl transition border border-amber-500/30 flex items-center justify-center gap-1.5"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>فتح في علامة تبويب مستقلة (للسماح بالنوافذ)</span>
                </a>
              </div>
            )}

            {/* Custom School / Institutional Profile Fallback */}
            <div className="pt-2 border-t border-slate-700/60">
              {!showCustomLogin ? (
                <button
                  type="button"
                  onClick={() => setShowCustomLogin(true)}
                  className="text-xs text-slate-400 hover:text-amber-300 underline font-medium transition cursor-pointer"
                >
                  أو الدخول باسم المؤسسة / المدرسة والبريد السحابي
                </button>
              ) : (
                <form onSubmit={handleCustomProfileLogin} className="space-y-2.5 pt-2 text-right">
                  <div className="text-xs font-bold text-slate-300">تفعيل حساب المؤسسة السحابي:</div>
                  <input
                    type="text"
                    value={institutionName}
                    onChange={(e) => setInstitutionName(e.target.value)}
                    placeholder="اسم المدرسة أو الجهة (مثال: مدارس الرياض)"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-400"
                    required
                  />
                  <input
                    type="email"
                    value={institutionEmail}
                    onChange={(e) => setInstitutionEmail(e.target.value)}
                    placeholder="البريد الإلكتروني للجهة (مثال: admin@school.edu.sa)"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-400"
                    required
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="flex-1 py-2 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-amber-300 font-bold text-xs rounded-xl transition border border-amber-500/40"
                    >
                      تفعيل الحساب والمزامنة ☁️
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCustomLogin(false)}
                      className="px-3 py-2 bg-slate-800 text-slate-400 hover:text-white text-xs rounded-xl"
                    >
                      إلغاء
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* SECTION: Saved Accounts on This Device (Multi-Account Switcher) */}
        {knownAccounts.length > 0 && (
          <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-white">الحسابات المحفوظة على هذا الجهاز</span>
              </div>
              <span className="text-[10px] text-slate-400 font-bold">
                تبديل فوري مع عزل كامل للبيانات ⚡
              </span>
            </div>

            <div className="space-y-2">
              {knownAccounts.map((acc) => {
                const isActive = acc.accountKey === currentAccountKey;
                const isSwitching = switchingAccountKey === acc.accountKey;

                return (
                  <div
                    key={acc.accountKey}
                    onClick={() => !isActive && !isLoading && handleSwitchToSavedAccount(acc)}
                    className={`p-2.5 rounded-xl border transition flex items-center justify-between gap-3 ${
                      isActive
                        ? 'bg-amber-500/10 border-amber-500/40 cursor-default'
                        : 'bg-slate-900/90 border-slate-800 hover:border-slate-700 hover:bg-slate-850 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {acc.photoURL ? (
                        <img
                          src={acc.photoURL}
                          alt={acc.displayName}
                          referrerPolicy="no-referrer"
                          className="w-8 h-8 rounded-full border border-slate-700 object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-800 text-amber-400 font-bold text-xs flex items-center justify-center border border-slate-700 shrink-0">
                          {acc.displayName[0] || 'U'}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-white truncate">{acc.displayName}</p>
                          {isActive && (
                            <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-bold px-1.5 py-0.2 rounded-full border border-emerald-500/30">
                              الحالي
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 font-mono truncate">{acc.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isSwitching ? (
                        <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                      ) : !isActive ? (
                        <button
                          type="button"
                          className="px-2.5 py-1 bg-amber-500/15 hover:bg-amber-500 hover:text-slate-950 text-amber-300 font-bold text-[11px] rounded-lg transition border border-amber-500/30 flex items-center gap-1"
                        >
                          <ArrowLeftRight className="w-3 h-3" />
                          <span>تبديل</span>
                        </button>
                      ) : null}

                      {!isActive && (
                        <button
                          type="button"
                          onClick={(e) => handleRemoveAccount(e, acc.accountKey, acc.displayName)}
                          title="إزالة الحساب من هذا الجهاز"
                          className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick Add Another Account */}
            {currentUser && (
              <div className="pt-2 flex gap-2">
                <button
                  onClick={handleLogin}
                  disabled={isLoading}
                  className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-amber-300 border border-slate-700 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
                >
                  <PlusCircle className="w-3.5 h-3.5 text-amber-400" />
                  <span>تسجيل الدخول بحساب Google آخر</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Sync Operations Card */}
        {currentUser && (
          <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CloudCheck className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-white">المزامنة واسترجاع الخزنة</span>
              </div>
              {lastSyncResult && (
                <span className="text-[10px] text-slate-400 font-mono">
                  {lastSyncResult.certsCount !== undefined && `${lastSyncResult.certsCount} شهادة موثقة`}
                </span>
              )}
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              يتم حفظ واسترجاع كافة البيانات (الشهادات، المسودات، الأختام، المجموعات الطلابية) بشكل معزول ومخصص لهذا الحساب فقط.
            </p>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                onClick={handleSyncToCloud}
                disabled={isSyncing}
                className="py-2.5 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSyncing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Cloud className="w-3.5 h-3.5" />
                )}
                <span>مزامنة وحفظ للسحابة</span>
              </button>

              <button
                onClick={handleRestoreFromCloud}
                disabled={isSyncing}
                className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition border border-slate-700 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSyncing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5 text-sky-400" />
                )}
                <span>جلب واستعادة البيانات</span>
              </button>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          {currentUser ? (
            <button
              onClick={handleLogout}
              disabled={isLoading}
              className="text-xs text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>تسجيل الخروج وعزل الجلسة</span>
            </button>
          ) : (
            <span className="text-[11px] text-slate-500 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>نظام عزل وتأمين الحسابات 2026</span>
            </span>
          )}

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
};
