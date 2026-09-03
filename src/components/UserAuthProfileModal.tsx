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
  X
} from 'lucide-react';
import { User } from 'firebase/auth';
import { googleSignIn, googleSignOut, getAccessToken } from '../services/googleDriveService';
import { 
  syncFullAccountToCloud, 
  restoreAccountFromCloud, 
  syncUserSettingsToCloud 
} from '../services/cloudDatabaseService';

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
  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;

  if (!isOpen) return null;

  const handleLogin = async () => {
    try {
      setIsLoading(true);
      const res = await googleSignIn();
      onUserChange(res.user);
      onShowToast(`أهلاً بك ${res.user.displayName || 'عزيزنا المستخدم'}! تم تسجيل الدخول بنجاح ✨`);
      
      // Attempt auto-restore on login if available
      try {
        const restored = await restoreAccountFromCloud(res.user.uid, res.user.email || '');
        if (restored.certsCount > 0 || restored.draftsCount > 0) {
          setLastSyncResult(restored);
          onShowToast(`تمت استعادة إعداداتك وبياناتك السحابية (${restored.certsCount} شهادة، ${restored.draftsCount} مسودة) ☁️`);
        }
      } catch (rErr) {
        console.warn('Initial cloud restore note:', rErr);
      }
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
      onUserChange(customUser);
      await syncUserSettingsToCloud(customUser);
      onShowToast(`مرحباً بك ${customUser.displayName}! تم ربط الحساب السحابي بنجاح ☁️`);
      setShowCustomLogin(false);
    } catch (err: any) {
      console.error('Custom login error:', err);
      onShowToast('فشل تفعيل الحساب السحابي');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      setIsLoading(true);
      await googleSignOut();
      onUserChange(null);
      onShowToast('تم تسجيل الخروج بنجاح من حسابك');
    } catch (e: any) {
      console.error(e);
      onShowToast('حدث خطأ أثناء تسجيل الخروج');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSyncToCloud = async () => {
    if (!currentUser) {
      onShowToast('يرجى تسجيل الدخول بحساب Google أولاً');
      return;
    }
    try {
      setIsSyncing(true);
      setSyncStatus('idle');
      const res = await syncFullAccountToCloud(currentUser);
      setSyncStatus('success');
      setLastSyncResult(res);
      onShowToast(`تمت مزامنة وحفظ جميع إعداداتك وشهاداتك (${res.certsCount}) على السحابة بنجاح! ☁️✨`);
    } catch (err: any) {
      console.error('Sync error:', err);
      setSyncStatus('error');
      onShowToast(err.message || 'فشلت المزامنة السحابية');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRestoreFromCloud = async () => {
    if (!currentUser) {
      onShowToast('يرجى تسجيل الدخول بحساب Google أولاً');
      return;
    }
    try {
      setIsSyncing(true);
      const res = await restoreAccountFromCloud(currentUser.uid, currentUser.email || '');
      setLastSyncResult(res);
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
              <h3 className="text-base font-extrabold text-white">حساب Google ومزامنة السحابة الموحدة</h3>
              <p className="text-xs text-slate-400">حفظ الإعدادات وقاعدة البيانات والشهادات وإرسال الإيميلات</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Card */}
        {currentUser ? (
          <div className="bg-slate-800/80 border border-slate-700 p-4 rounded-2xl space-y-4">
            <div className="flex items-center gap-3.5">
              {currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || 'المستخدم'}
                  referrerPolicy="no-referrer"
                  className="w-12 h-12 rounded-full border-2 border-amber-400/60 object-cover shadow-sm"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-amber-500 text-slate-950 font-black text-lg flex items-center justify-center border-2 border-amber-400">
                  {currentUser.displayName ? currentUser.displayName[0] : 'U'}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h4 className="font-extrabold text-sm text-white truncate">
                    {currentUser.displayName || 'مستخدم معتمد'}
                  </h4>
                  <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-2 py-0.5 rounded-full font-bold border border-emerald-500/30">
                    متصل 🟢
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-mono truncate">{currentUser.email}</p>
              </div>
            </div>

            {/* Linked Services Badges */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-700/60 text-center">
              <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-700">
                <Cloud className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                <span className="text-[11px] font-bold text-slate-200 block">Google Drive</span>
                <span className="text-[9px] text-emerald-400">موثق ومفعل</span>
              </div>
              <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-700">
                <Database className="w-4 h-4 text-indigo-400 mx-auto mb-1" />
                <span className="text-[11px] font-bold text-slate-200 block">قاعدة البيانات</span>
                <span className="text-[9px] text-emerald-400">سحابية دائمة</span>
              </div>
              <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-700">
                <Mail className="w-4 h-4 text-sky-400 mx-auto mb-1" />
                <span className="text-[11px] font-bold text-slate-200 block">بريد Gmail</span>
                <span className="text-[9px] text-emerald-400">إرسال مباشر</span>
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
                سجل الدخول بحساب Google لحفظ واسترجاع كافة إعدادات النظام، التوقيعات، القوالب، وسحابة الشهادات عبر جميع أجهزتك.
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
                  <span>جاري تسجيل الدخول عبر Google...</span>
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

        {/* Sync Operations Card */}
        {currentUser && (
          <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CloudCheck className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-white">المزامنة عبر كافة الأجهزة</span>
              </div>
              {lastSyncResult && (
                <span className="text-[10px] text-slate-400 font-mono">
                  {lastSyncResult.certsCount !== undefined && `${lastSyncResult.certsCount} شهادة موثقة`}
                </span>
              )}
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              عند فتح حسابك على أي جهاز كمبيوتر، جوال أو جهاز لوحي آخر، سيتم جلب نفس إعدادات المدرسة والتوقيعات والأختام والمسودات تلقائياً.
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
              <span>تسجيل الخروج</span>
            </button>
          ) : (
            <span className="text-[11px] text-slate-500">حماية سحابية مشفرة 2026</span>
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
