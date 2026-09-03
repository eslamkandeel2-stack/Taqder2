import React, { useState, useEffect } from 'react';
import {
  GoogleAccountProfile,
  getSavedGoogleAccounts,
  switchGoogleAccount,
  saveGoogleAccount,
  removeSavedGoogleAccount,
  googleSignOut,
  requestGisToken,
  getActiveGoogleUser
} from '../services/googleDriveService';
import { User } from 'firebase/auth';
import {
  X,
  Plus,
  Trash2,
  CheckCircle2,
  LogOut,
  Sparkles,
  ArrowRight,
  Mail,
  User as UserIcon,
  Loader2,
  ShieldCheck
} from 'lucide-react';

interface GoogleAccountPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccountSelected?: (user: User, token: string) => void;
  currentEmail?: string | null;
}

export const GoogleAccountPickerModal: React.FC<GoogleAccountPickerModalProps> = ({
  isOpen,
  onClose,
  onAccountSelected,
  currentEmail
}) => {
  const [accounts, setAccounts] = useState<GoogleAccountProfile[]>([]);
  const [activeUser, setActiveUser] = useState<User | null>(null);
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [isLoadingOAuth, setIsLoadingOAuth] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const refreshAccounts = () => {
    const list = getSavedGoogleAccounts();
    setAccounts(list);
    setActiveUser(getActiveGoogleUser());
  };

  useEffect(() => {
    if (isOpen) {
      refreshAccounts();
      setIsAddingCustom(false);
      setErrorMsg(null);
      setNewEmail('');
      setNewName('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectAccount = (account: GoogleAccountProfile) => {
    setErrorMsg(null);
    try {
      const res = switchGoogleAccount(account);
      refreshAccounts();
      if (onAccountSelected) {
        onAccountSelected(res.user, res.accessToken);
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل اختيار الحساب');
    }
  };

  const handleOfficialGoogleLogin = async () => {
    setIsLoadingOAuth(true);
    setErrorMsg(null);
    try {
      const res = await requestGisToken('select_account');
      refreshAccounts();
      if (onAccountSelected) {
        onAccountSelected(res.user, res.accessToken);
      }
      onClose();
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user' || err?.message?.includes('تم إغلاق') || err?.message?.includes('إلغاء')) {
        console.info('Google login window closed by user.');
        setErrorMsg('تم إغلاق نافذة Google. يمكنك اختيار حسابك من القائمة أدناه أو الضغط مجدداً لإعادة المحاولة.');
      } else {
        console.warn('Official Google OAuth notice:', err);
        setErrorMsg(err?.message || 'تعذر فتح نافذة Google الرسمية لاختيار الحساب.');
      }
    } finally {
      setIsLoadingOAuth(false);
    }
  };

  const handleAddCustomAccount = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = newEmail.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('يرجى إدخال عنوان بريد إلكتروني صالح.');
      return;
    }

    const cleanName = newName.trim() || cleanEmail.split('@')[0];
    const newProfile: GoogleAccountProfile = {
      uid: `custom-google-${Date.now()}`,
      email: cleanEmail,
      displayName: cleanName,
      photoURL: 'https://lh3.googleusercontent.com/a/default-user',
      accessToken: `direct_google_token_${Date.now()}`,
      lastUsedAt: new Date().toISOString(),
      isCurrent: true
    };

    saveGoogleAccount(newProfile);
    const res = switchGoogleAccount(newProfile);
    refreshAccounts();
    if (onAccountSelected) {
      onAccountSelected(res.user, res.accessToken);
    }
    onClose();
  };

  const handleRemoveAccount = (e: React.MouseEvent, email: string) => {
    e.stopPropagation();
    const updated = removeSavedGoogleAccount(email);
    setAccounts(updated);
    refreshAccounts();
  };

  const handleSignOutActive = async () => {
    await googleSignOut();
    refreshAccounts();
    onClose();
  };

  const currentLoggedInEmail = (currentEmail || activeUser?.email || '').toLowerCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto font-['Cairo']">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden text-right animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header with Google Colors and Title */}
        <div className="p-6 border-b border-slate-100 relative bg-gradient-to-b from-slate-50 to-white">
          <button
            onClick={onClose}
            className="absolute top-5 left-5 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-full transition cursor-pointer"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center shrink-0">
              <svg className="w-6 h-6" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">اختيار حساب Google</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                اختر الحساب المطلوب للحفظ والمزامنة مع Google Drive
              </p>
            </div>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-4">

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          {/* Saved Accounts List */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-slate-400 block pr-1">الحسابات المحفوظة على هذا الجهاز:</span>
            
            <div className="space-y-2 max-h-60 overflow-y-auto pr-0.5">
              {accounts.map((acc) => {
                const isCurrent = acc.email.toLowerCase() === currentLoggedInEmail;
                return (
                  <div
                    key={acc.email}
                    onClick={() => handleSelectAccount(acc)}
                    className={`w-full p-3 rounded-2xl border transition-all flex items-center justify-between text-right cursor-pointer group ${
                      isCurrent
                        ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-400/20 shadow-xs'
                        : 'bg-slate-50/70 border-slate-200 hover:border-amber-300 hover:bg-amber-50/40'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {acc.photoURL ? (
                        <img
                          src={acc.photoURL}
                          alt={acc.displayName}
                          className="w-10 h-10 rounded-full border border-slate-200 shrink-0 object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 text-white font-bold flex items-center justify-center text-sm shrink-0 shadow-xs">
                          {acc.email[0].toUpperCase()}
                        </div>
                      )}
                      
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 truncate block">
                            {acc.displayName || acc.email}
                          </span>
                          {isCurrent && (
                            <span className="text-[9px] bg-emerald-100 text-emerald-800 border border-emerald-300 font-extrabold px-1.5 py-0.2 rounded-full whitespace-nowrap">
                              الحالي
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-500 font-mono block truncate dir-ltr text-right">
                          {acc.email}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {isCurrent ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => handleRemoveAccount(e, acc.email)}
                          title="حذف هذا الحساب من القائمة"
                          className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition opacity-0 group-hover:opacity-100 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Add Custom Account Form */}
          {isAddingCustom ? (
            <form onSubmit={handleAddCustomAccount} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-amber-600" />
                  <span>إضافة حساب Google جديد</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsAddingCustom(false)}
                  className="text-[11px] text-slate-400 hover:text-slate-600 font-bold"
                >
                  إلغاء
                </button>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">البريد الإلكتروني (Google):</label>
                <input
                  type="email"
                  required
                  placeholder="name@gmail.com أو بريد المؤسسة"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full py-2 px-3 bg-white border border-slate-300 focus:border-amber-500 rounded-xl text-xs outline-none transition font-sans text-left dir-ltr"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">الاسم التعريفي (اختياري):</label>
                <input
                  type="text"
                  placeholder="مثال: أ. إسلام قنديل"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full py-2 px-3 bg-white border border-slate-300 focus:border-amber-500 rounded-xl text-xs outline-none transition"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>حفظ وتسجيل الدخول بهذا الحساب</span>
              </button>
            </form>
          ) : (
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={handleOfficialGoogleLogin}
                disabled={isLoadingOAuth}
                className="py-2.5 px-3 bg-white hover:bg-slate-50 border border-slate-200 hover:border-amber-400 rounded-xl text-xs font-bold text-slate-800 transition flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isLoadingOAuth ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                    <span>جاري الفتح...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 48 48">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                    </svg>
                    <span>نافذة Google الرسمية</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setIsAddingCustom(true)}
                className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Plus className="w-4 h-4 text-slate-600" />
                <span>إضافة حساب آخر</span>
              </button>
            </div>
          )}

        </div>

        {/* Footer with Sign Out & Close */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          {activeUser ? (
            <button
              type="button"
              onClick={handleSignOutActive}
              className="text-red-600 hover:text-red-700 font-bold flex items-center gap-1.5 transition cursor-pointer py-1 px-2 hover:bg-red-50 rounded-lg"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>تسجيل الخروج من الحساب الحالي</span>
            </button>
          ) : (
            <span className="text-slate-400 text-[11px] font-medium">اختر حسابك للمتابعة</span>
          )}

          <button
            type="button"
            onClick={onClose}
            className="py-1.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition cursor-pointer text-xs"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
};
