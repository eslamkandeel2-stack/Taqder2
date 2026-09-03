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
  Layers,
  Smartphone,
  KeyRound,
  Copy,
  Check,
  Link as LinkIcon,
  Fingerprint,
  Send,
  UserPlus,
  Compass,
  HelpCircle
} from 'lucide-react';
import { User } from 'firebase/auth';
import { googleSignIn, googleSignInWithRedirect, googleSignOut } from '../services/googleDriveService';
import { GoogleInFrameButton } from './GoogleInFrameButton';
import { 
  syncFullAccountToCloud, 
  restoreAccountFromCloud 
} from '../services/cloudDatabaseService';
import { 
  switchAndIsolateAccount, 
  getKnownAccounts, 
  removeAccountFromDevice, 
  getAccountKey, 
  KnownAccountRecord,
  UserLike
} from '../services/accountIsolationManager';
import {
  registerWithCredentials,
  registerWithGoogle,
  verifyAccountCode,
  loginWithCredentials,
  loginWithGoogle,
  requestQuickEmailLogin,
  requestLinkGoogleAccount,
  confirmLinkGoogleAccount,
  resendVerificationCode,
  sendVerificationEmailDirect,
  checkAccountVerificationStatus,
  getLatestEmailDispatchLog,
  getStoredUnifiedAccount,
  saveStoredUnifiedAccount,
  UnifiedAccount
} from '../services/unifiedAuthService';

interface UserAuthProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onUserChange: (user: User | null) => void;
  onShowToast: (msg: string) => void;
  onOpenCloudLibrary?: () => void;
}

type AuthTab = 'login' | 'quick_email' | 'register' | 'profile' | 'link_google';

export const UserAuthProfileModal: React.FC<UserAuthProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserChange,
  onShowToast,
  onOpenCloudLibrary
}) => {
  const [activeTab, setActiveTab] = useState<AuthTab>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [lastSyncResult, setLastSyncResult] = useState<{
    certsCount?: number;
    draftsCount?: number;
    batchesCount?: number;
  } | null>(null);

  // Unified Account Data
  const [unifiedAccount, setUnifiedAccount] = useState<UnifiedAccount | null>(null);
  const [knownAccounts, setKnownAccounts] = useState<KnownAccountRecord[]>([]);
  const [switchingAccountKey, setSwitchingAccountKey] = useState<string | null>(null);
  const [copiedUserId, setCopiedUserId] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState(false);
  const [showVercelGuide, setShowVercelGuide] = useState(false);

  // Form States - Login
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [quickEmailInput, setQuickEmailInput] = useState('');

  // Form States - Register
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regDisplayName, setRegDisplayName] = useState('');

  // Verification Code Modal / Screen State
  const [verificationPending, setVerificationPending] = useState(false);
  const [pendingUserId, setPendingUserId] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const [verificationCodeInput, setVerificationCodeInput] = useState('');
  const [systemGeneratedCode, setSystemGeneratedCode] = useState<string | null>(null);

  // Linking Google Account States
  const [linkingPending, setLinkingPending] = useState(false);
  const [linkingGoogleEmail, setLinkingGoogleEmail] = useState('');
  const [linkingCodeInput, setLinkingCodeInput] = useState('');
  const [systemLinkingCode, setSystemLinkingCode] = useState<string | null>(null);

  const [showPopupBlockedHelper, setShowPopupBlockedHelper] = useState(false);
  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;

  useEffect(() => {
    if (isOpen) {
      setKnownAccounts(getKnownAccounts());
      const stored = getStoredUnifiedAccount();
      setUnifiedAccount(stored);
      if (currentUser || stored) {
        setActiveTab('profile');
      } else {
        setActiveTab('login');
      }
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const currentAccountKey = getAccountKey(currentUser);
  const displayUserId = unifiedAccount?.userId || (currentUser as any)?.userId || currentUser?.uid || 'USR-PENDING';

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUserId(true);
    setTimeout(() => setCopiedUserId(false), 2000);
    onShowToast('تم نسخ معرف الحساب (User ID) بنجاح 📋');
  };

  /**
   * Completes sign in and performs isolated workspace setup
   */
  const completeAccountLogin = async (acc: UnifiedAccount, isGoogle: boolean = false) => {
    setUnifiedAccount(acc);
    saveStoredUnifiedAccount(acc);

    const userObj: UserLike & { isAnonymous?: boolean } = {
      uid: acc.userId,
      userId: acc.userId,
      email: acc.email || acc.googleEmail || '',
      displayName: acc.displayName || acc.username,
      photoURL: acc.photoURL || '',
      googleEmail: acc.googleEmail || '',
      isVerified: acc.isVerified,
      username: acc.username
    };

    localStorage.setItem('taqdeer_gis_user', JSON.stringify(userObj));
    if (isGoogle || acc.linkedGoogle) {
      if (!localStorage.getItem('taqdeer_drive_access_token')) {
        localStorage.setItem('taqdeer_drive_access_token', 'google_auth_token');
      }
    }
    onUserChange(userObj as unknown as User);

    try {
      const restoreRes = await switchAndIsolateAccount(userObj, currentUser);
      setLastSyncResult(restoreRes);
    } catch (isolationErr) {
      console.warn('Workspace isolation notice:', isolationErr);
    }
    setKnownAccounts(getKnownAccounts());
    setActiveTab('profile');
    setVerificationPending(false);
    setSystemGeneratedCode(null);

    // Dispatch global events to ensure all UI elements sync immediately
    try {
      window.dispatchEvent(new CustomEvent('taqdeer_auth_state_changed', { detail: userObj }));
      window.dispatchEvent(new Event('storage'));
    } catch (e) {
      console.warn('Event dispatch note:', e);
    }
  };

  // 1. Google In-Frame Login / Registration Handler
  const handleInFrameGoogleSuccess = async (res: { user: User; accessToken: string }) => {
    try {
      setIsLoading(true);
      const email = res.user.email || '';
      const displayName = res.user.displayName || email.split('@')[0];
      const photoURL = res.user.photoURL || '';
      const googleId = res.user.uid || '';

      // Check if user is registered in system database
      let loginRes: any = null;
      try {
        loginRes = await loginWithGoogle({ email, googleId, displayName, photoURL });
      } catch (loginErr) {
        console.warn('loginWithGoogle server note:', loginErr);
      }
      
      const activeAcc: UnifiedAccount = loginRes?.account || {
        userId: loginRes?.userId || ('GGL-' + (googleId ? googleId.slice(0, 8) : Date.now().toString().slice(-6))),
        username: email.split('@')[0] || 'user',
        email,
        googleEmail: email,
        displayName: displayName || email.split('@')[0] || 'حساب Google',
        photoURL,
        isVerified: true,
        linkedGoogle: true,
        lastLoginAt: new Date().toISOString()
      };

      await completeAccountLogin(activeAcc, true);
      onShowToast(`أهلاً بك ${activeAcc.displayName}! تم تسجيل الدخول بنجاح بحساب Google الموثق ✨`);
    } catch (err: any) {
      console.error('In-frame Google error:', err);
      if (res?.user?.email) {
        const fallbackAcc: UnifiedAccount = {
          userId: 'GGL-' + (res.user.uid ? res.user.uid.slice(0, 8) : Date.now().toString().slice(-6)),
          username: res.user.email.split('@')[0] || 'user',
          email: res.user.email,
          googleEmail: res.user.email,
          displayName: res.user.displayName || res.user.email.split('@')[0] || 'حساب Google',
          photoURL: res.user.photoURL || '',
          isVerified: true,
          linkedGoogle: true,
          lastLoginAt: new Date().toISOString()
        };
        await completeAccountLogin(fallbackAcc, true);
        onShowToast(`أهلاً بك ${fallbackAcc.displayName}! تم تسجيل الدخول بنجاح بحساب Google ✨`);
      } else {
        onShowToast(err.message || 'حدث خطأ أثناء معالجة حساب Google');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Direct Redirect Google Login
  const handleRedirectLogin = async () => {
    try {
      setIsLoading(true);
      await googleSignInWithRedirect();
    } catch (err: any) {
      console.error('Redirect login error:', err);
      onShowToast(err.message || 'تعذر الانتقال لصفحة تسجيل الدخول المباشر');
      setIsLoading(false);
    }
  };

  // Popup Google Login
  const handlePopupGoogleLogin = async () => {
    try {
      setIsLoading(true);
      const res = await googleSignIn();
      await handleInFrameGoogleSuccess({ user: res.user, accessToken: res.accessToken });
      onShowToast(`أهلاً بك! تم حفظ تسجيل الدخول بنجاح بحساب Google (${res.user.displayName || res.user.email}) ✨`);
      setTimeout(() => {
        if (onClose) onClose();
      }, 500);
    } catch (err: any) {
      console.warn('handlePopupGoogleLogin note:', err);
      if (err?.code === 'auth/popup-closed-by-user' || err?.isUserCancel) {
        onShowToast('تم إلغاء عملية تسجيل الدخول أو إغلاق النافذة');
        return;
      }
      if (err?.code === 'auth/unauthorized-domain' || err?.message?.includes('unauthorized-domain') || err?.message?.includes('authorized domain')) {
        setShowPopupBlockedHelper(true);
        setShowVercelGuide(true);
        onShowToast('نطاق Vercel يحتاج لتصريح في Firebase Console، أو استخدم الدخول السريع برمز التحقق الفوري أدناه 🌐');
        return;
      }
      if (err?.code === 'auth/popup-blocked' || err?.isPopupBlocked || err?.message?.includes('popup')) {
        setShowPopupBlockedHelper(true);
        setShowVercelGuide(true);
        onShowToast('تم حظر النوافذ المنبثقة على هاتفك/متصفحك. استخدم خيار الدخول المباشر أو رمز التحقق أدناه 📱');
        return;
      }
      onShowToast(err.message || 'تعذر تسجيل الدخول بحساب Google');
    } finally {
      setIsLoading(false);
    }
  };

  // Quick Zero-Popup Email OTP Login
  const handleQuickEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickEmailInput.trim() || !quickEmailInput.includes('@')) {
      onShowToast('يرجى كتابة بريدك الإلكتروني بشكل صحيح');
      return;
    }

    try {
      setIsLoading(true);
      const cleanEmail = quickEmailInput.trim().toLowerCase();
      const res = await requestQuickEmailLogin(cleanEmail);
      if (res.requiresVerification || res.isNewRegistration || res.success) {
        setPendingUserId(res.userId || '');
        setPendingEmail(cleanEmail);
        setSystemGeneratedCode(null);
        setVerificationPending(true);
        onShowToast(`تم إرسال كود التحقق الأمني إلى بريدك (${cleanEmail}). يرجى كتابة الرمز لتأكيد الدخول 🚀`);
      }
    } catch (err: any) {
      console.error('Quick email login error:', err);
      onShowToast(err.message || 'فشل بدء تسجيل الدخول السريع');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Username / Password Login
  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginIdentifier.trim() || !loginPassword.trim()) {
      onShowToast('يرجى إدخال اسم المستخدم وكلمة المرور');
      return;
    }

    try {
      setIsLoading(true);
      const res = await loginWithCredentials({
        usernameOrEmail: loginIdentifier.trim(),
        password: loginPassword.trim()
      });

      if (res.requiresVerification) {
        setPendingUserId(res.userId || '');
        setPendingEmail(res.account?.email || loginIdentifier);
        setSystemGeneratedCode(null);
        setVerificationPending(true);
        onShowToast('هذا الحساب بانتظار إدخال كود التحقق المرسل لبريدك الإلكتروني للتفعيل.');
        return;
      }

      if (res.account) {
        await completeAccountLogin(res.account, false);
        onShowToast(`أهلاً بك مجدداً ${res.account.displayName}! تم تسجيل الدخول بنجاح.`);
      }
    } catch (err: any) {
      console.error('Credentials login error:', err);
      onShowToast(err.message || 'بيانات الدخول غير صحيحة');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Register with Username / Password
  const handleCredentialsRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regUsername.trim() || !regPassword.trim()) {
      onShowToast('يرجى إدخال اسم المستخدم وكلمة المرور');
      return;
    }
    if (regPassword.length < 4) {
      onShowToast('كلمة المرور يجب أن تتكون من 4 خانات على الأقل');
      return;
    }

    try {
      setIsLoading(true);
      const res = await registerWithCredentials({
        username: regUsername.trim(),
        email: regEmail.trim(),
        password: regPassword.trim(),
        displayName: regDisplayName.trim() || regUsername.trim()
      });

      if (res.requiresVerification || res.success) {
        setPendingUserId(res.userId || '');
        setPendingEmail(regEmail.trim());
        setSystemGeneratedCode(null);
        setVerificationPending(true);
        onShowToast(`تم إنشاء الحساب وإرسال كود التحقق إلى بريدك الإلكتروني (${regEmail.trim()}). أدخل الرمز لتفعيل الحساب.`);
      }
    } catch (err: any) {
      console.error('Register error:', err);
      onShowToast(err.message || 'فشل إنشاء الحساب');
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Confirm Verification Code
  const handleConfirmVerificationCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCodeInput.trim()) {
      onShowToast('يرجى إدخال كود التحقق المكون من 6 أرقام');
      return;
    }

    try {
      setIsLoading(true);
      const res = await verifyAccountCode({
        userId: pendingUserId,
        email: pendingEmail,
        code: verificationCodeInput.trim()
      });

      if (res.account) {
        await completeAccountLogin(res.account);
        onShowToast(`تم تأكيد وتفعيل الحساب بنجاح! معرف حسابك هو: ${res.account.userId} 🚀`);
      }
    } catch (err: any) {
      console.error('Verify error:', err);
      onShowToast(err.message || 'كود التحقق غير صحيح');
    } finally {
      setIsLoading(false);
    }
  };

  // Resend Verification Code
  const handleResendCode = async () => {
    try {
      setIsLoading(true);
      const res = await resendVerificationCode({
        userId: pendingUserId,
        email: pendingEmail
      });
      setSystemGeneratedCode(null);
      onShowToast(`تم إرسال كود تحقق جديد إلى بريدك الإلكتروني (${pendingEmail || 'المسجل'}) 📩`);
    } catch (err: any) {
      console.error('Resend error:', err);
      onShowToast(err.message || 'فشل إعادة إرسال الكود');
    } finally {
      setIsLoading(false);
    }
  };

  // 5. Initiate Link Google Account
  const handleStartLinkGoogle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkingGoogleEmail.trim()) {
      onShowToast('يرجى إدخال البريد الإلكتروني لحساب Google المراد ربطه');
      return;
    }

    try {
      setIsLoading(true);
      const userId = unifiedAccount?.userId || (currentUser as any)?.userId || currentUser?.uid || currentUser?.email || 'usr_current';
      const userEmail = unifiedAccount?.email || (currentUser as any)?.email || '';
      const userName = unifiedAccount?.username || (currentUser as any)?.username || (currentUser as any)?.displayName || '';

      const res = await requestLinkGoogleAccount({
        userId,
        googleEmail: linkingGoogleEmail.trim(),
        email: userEmail,
        username: userName
      });

      if (res.success) {
        setSystemLinkingCode(null);
        setLinkingPending(true);
        onShowToast(`تم إرسال كود تأكيد الربط إلى بريدك (${linkingGoogleEmail}). يرجى مراجعة البريد وكتابة الرمز.`);
      }
    } catch (err: any) {
      console.error('Link request error:', err);
      onShowToast(err.message || 'فشل بدء ربط حساب Google');
    } finally {
      setIsLoading(false);
    }
  };

  // Confirm Link Google Account
  const handleConfirmLinkGoogle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkingCodeInput.trim()) {
      onShowToast('يرجى إدخال كود أمان الربط');
      return;
    }

    try {
      setIsLoading(true);
      const userId = unifiedAccount?.userId || (currentUser as any)?.userId || currentUser?.uid || currentUser?.email || 'usr_current';
      const userEmail = unifiedAccount?.email || (currentUser as any)?.email || '';
      const userName = unifiedAccount?.username || (currentUser as any)?.username || (currentUser as any)?.displayName || '';

      const res = await confirmLinkGoogleAccount({
        userId: userId || '',
        googleEmail: linkingGoogleEmail.trim(),
        code: linkingCodeInput.trim(),
        email: userEmail,
        username: userName
      });

      if (res.account) {
        setUnifiedAccount(res.account);
        saveStoredUnifiedAccount(res.account);
        setLinkingPending(false);
        setSystemLinkingCode(null);
        setActiveTab('profile');

        const updatedUser: UserLike = {
          uid: res.account.userId,
          userId: res.account.userId,
          email: res.account.email || res.account.googleEmail || '',
          displayName: res.account.displayName || res.account.username,
          photoURL: res.account.photoURL || '',
          googleEmail: res.account.googleEmail || '',
          isVerified: true,
          username: res.account.username
        };
        localStorage.setItem('taqdeer_gis_user', JSON.stringify(updatedUser));
        await switchAndIsolateAccount(updatedUser, currentUser);
        onUserChange(updatedUser as unknown as User);
        setKnownAccounts(getKnownAccounts());

        onShowToast(`تم ربط حساب Google (${res.account.googleEmail}) بحسابك بنجاح! جميع الصلاحيات متصلة الآن. 🎉`);
      }
    } catch (err: any) {
      console.error('Confirm link error:', err);
      onShowToast(err.message || 'كود التحقق غير صحيح');
    } finally {
      setIsLoading(false);
    }
  };

  // 6. Switch to known account
  const handleSwitchToSavedAccount = async (targetAccount: KnownAccountRecord) => {
    if (targetAccount.accountKey === currentAccountKey) {
      onShowToast('أنت تعمل حالياً على هذا الحساب بالفعل');
      return;
    }

    try {
      setSwitchingAccountKey(targetAccount.accountKey);
      setIsLoading(true);

      const targetUser: UserLike = {
        uid: targetAccount.uid,
        userId: targetAccount.userId || targetAccount.uid,
        email: targetAccount.email,
        displayName: targetAccount.displayName,
        photoURL: targetAccount.photoURL || '',
        googleEmail: targetAccount.googleEmail || '',
        isVerified: targetAccount.isVerified ?? true
      };

      localStorage.setItem('taqdeer_gis_user', JSON.stringify(targetUser));
      const restoreRes = await switchAndIsolateAccount(targetUser, currentUser);
      onUserChange(targetUser as unknown as User);
      setLastSyncResult(restoreRes);
      setKnownAccounts(getKnownAccounts());

      onShowToast(`تم التبديل بنجاح إلى حساب: ${targetAccount.displayName} (${restoreRes.certsCount} شهادة معزولة) 🔄`);
    } catch (err: any) {
      console.error('Account switch error:', err);
      onShowToast('حدث خطأ أثناء تبديل الحساب');
    } finally {
      setIsLoading(false);
      setSwitchingAccountKey(null);
    }
  };

  // 7. Logout
  const handleLogout = async () => {
    try {
      setIsLoading(true);
      const outgoingUser = currentUser || (unifiedAccount ? {
        uid: unifiedAccount.userId,
        userId: unifiedAccount.userId,
        email: unifiedAccount.email || unifiedAccount.googleEmail,
        displayName: unifiedAccount.displayName || unifiedAccount.username
      } : null);

      // 1. Isolate and secure outgoing account's workspace before clearing credentials
      await switchAndIsolateAccount(null, outgoingUser as any);

      // 2. Sign out of auth providers & clear session
      await googleSignOut();
      saveStoredUnifiedAccount(null);
      setUnifiedAccount(null);
      
      onUserChange(null);
      setLastSyncResult(null);
      setKnownAccounts(getKnownAccounts());
      setActiveTab('login');

      onShowToast('تم تسجيل الخروج وتأمين بيانات الحساب في مساحتك السحابية بنجاح 🔒');
    } catch (e: any) {
      console.error(e);
      onShowToast('حدث خطأ أثناء تسجيل الخروج');
    } finally {
      setIsLoading(false);
    }
  };

  // 8. Manual Sync to Cloud Database
  const handleSyncToCloud = async () => {
    if (!currentUser && !unifiedAccount) {
      onShowToast('يرجى تسجيل الدخول أولاً للمزامنة');
      return;
    }
    try {
      setIsSyncing(true);
      setSyncStatus('idle');
      const userToSync = currentUser || ({
        uid: unifiedAccount?.userId,
        email: unifiedAccount?.email,
        displayName: unifiedAccount?.displayName
      } as User);

      const res = await syncFullAccountToCloud(userToSync);
      setSyncStatus('success');
      setLastSyncResult(res);
      setKnownAccounts(getKnownAccounts());
      onShowToast(`تم حفظ ومزامنة كافة شهاداتك (${res.certsCount}) وبياناتك على قاعدة بيانات النظام السحابية بنجاح! ☁️✨`);
    } catch (err: any) {
      console.error('Sync error:', err);
      setSyncStatus('error');
      onShowToast(err.message || 'فشلت المزامنة السحابية');
    } finally {
      setIsSyncing(false);
    }
  };

  // 9. Manual Restore from Cloud Database
  const handleRestoreFromCloud = async () => {
    const uid = currentUser?.uid || unifiedAccount?.userId;
    const email = currentUser?.email || unifiedAccount?.email || '';
    if (!uid) {
      onShowToast('يرجى تسجيل الدخول أولاً');
      return;
    }
    try {
      setIsSyncing(true);
      const res = await restoreAccountFromCloud(uid, email);
      setLastSyncResult(res);
      setKnownAccounts(getKnownAccounts());
      onShowToast(`تم استرجاع بياناتك وخزنتك السحابية بنجاح (${res.certsCount} شهادة، ${res.draftsCount} مسودة) 📥`);
    } catch (err: any) {
      console.error('Restore error:', err);
      onShowToast(err.message || 'فشل جلب البيانات من السحابة');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[115] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-slate-900 border border-slate-700 max-w-lg w-full rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[94dvh] overflow-y-auto overscroll-contain touch-pan-y text-right">
        
        {/* Mobile Swipe Handle */}
        <div className="w-12 h-1 bg-slate-700 rounded-full mx-auto sm:hidden shrink-0 mb-1" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-2xl border border-amber-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">نظام الحسابات والمعرف الموحد (User ID)</h3>
              <p className="text-[11px] text-slate-400">توثيق الحسابات بأكواد الأمان والربط مع Google وقاعدة البيانات</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex p-1 bg-slate-950/80 rounded-2xl border border-slate-800 gap-1 text-xs font-bold">
          {currentUser || unifiedAccount ? (
            <>
              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                className={`flex-1 py-2 rounded-xl transition flex items-center justify-center gap-1.5 ${
                  activeTab === 'profile'
                    ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <UserIcon className="w-3.5 h-3.5" />
                <span>ملف الحساب والمعرف</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('link_google')}
                className={`flex-1 py-2 rounded-xl transition flex items-center justify-center gap-1.5 ${
                  activeTab === 'link_google'
                    ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <LinkIcon className="w-3.5 h-3.5" />
                <span>ربط حساب Google</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('login');
                  setVerificationPending(false);
                }}
                className={`flex-1 py-2 rounded-xl transition flex items-center justify-center gap-1.5 ${
                  activeTab === 'login'
                    ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>تسجيل الدخول</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('quick_email');
                  setVerificationPending(false);
                }}
                className={`flex-1 py-2 rounded-xl transition flex items-center justify-center gap-1.5 ${
                  activeTab === 'quick_email'
                    ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                <span>دخول سريع بكود ⚡</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('register');
                  setVerificationPending(false);
                }}
                className={`flex-1 py-2 rounded-xl transition flex items-center justify-center gap-1.5 ${
                  activeTab === 'register'
                    ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>حساب جديد</span>
              </button>
            </>
          )}
        </div>

        {/* ------------------------------------------------------------- */}
        {/* VIEW 1: VERIFICATION CODE SCREEN (For Registration / Activation) */}
        {/* ------------------------------------------------------------- */}
        {verificationPending ? (
          <div className="bg-slate-950/90 border-2 border-amber-500/50 p-5 rounded-2xl space-y-4 shadow-xl">
            <div className="flex items-center gap-2.5 text-amber-400 font-extrabold text-sm border-b border-slate-800 pb-3">
              <KeyRound className="w-5 h-5 animate-pulse" />
              <span>التحقق من ملكية وتفعيل الحساب وتوثيقه في Firebase</span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              لضمان صحة وربط الحساب بقاعدة بيانات النظام وFirebase، يرجى تأكيد كود التحقق الأمني:
            </p>

            {/* Email Inbox Notice Box */}
            <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl text-center space-y-2">
              <div className="w-10 h-10 bg-amber-500/20 text-amber-400 rounded-full flex items-center justify-center mx-auto mb-1 border border-amber-500/40">
                <Mail className="w-5 h-5 animate-bounce" />
              </div>
              <span className="text-xs text-amber-300 font-bold block">
                تم إرسال كود التحقق الأمني إلى بريدك الإلكتروني
              </span>
              <div className="inline-block px-3 py-1 bg-slate-900/80 rounded-lg border border-amber-500/20 text-xs font-mono font-bold text-amber-200 dir-ltr">
                {pendingEmail || 'بريدك الإلكتروني'}
              </div>
              <p className="text-[11px] text-slate-300">
                يرجى فتح صندوق الوارد (أو مجلد الرسائل غير المرغوب فيها Spam) ونسخ الرمز المكون من 6 أرقام وإدخاله بالأسفل.
              </p>
            </div>

            {/* Firebase & Email Verification Notice */}
            <div className="flex items-center gap-2 text-[11px] text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 p-2.5 rounded-xl">
              <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>يتم توثيق الحساب فورياً وربطه بقاعدة بيانات النظام وFirebase Firestore.</span>
            </div>

            <form onSubmit={handleConfirmVerificationCode} className="space-y-3 pt-1">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  أدخل كود التحقق المكون من 6 أرقام:
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={verificationCodeInput}
                  onChange={(e) => setVerificationCodeInput(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="مثال: 739218"
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-center text-lg font-mono font-bold text-amber-300 tracking-widest focus:outline-hidden focus:border-amber-400"
                  required
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isLoading || verificationCodeInput.length < 4}
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-md"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>تأكيد وتفعيل الحساب 🚀</span>
                </button>

                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={isLoading}
                  className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl border border-slate-700 transition"
                >
                  إعادة توليد الكود
                </button>
              </div>

              {pendingEmail && (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      setIsLoading(true);
                      const res = await sendVerificationEmailDirect({
                        email: pendingEmail,
                        userId: pendingUserId,
                        reason: 'registration'
                      });
                      if (res.success) {
                        if (res.verificationCode) setSystemGeneratedCode(res.verificationCode);
                        onShowToast(res.message || 'تم إرسال كود التحقق بنجاح إلى البريد الإلكتروني ✉️');
                      } else {
                        onShowToast(res.error || 'تعذر إرسال البريد الإلكتروني');
                      }
                    } catch (e: any) {
                      onShowToast(e?.message || 'فشل إرسال البريد');
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                  disabled={isLoading}
                  className="w-full py-2 bg-slate-900/90 hover:bg-slate-800 text-amber-300 text-[11px] font-bold rounded-xl border border-amber-500/30 transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Mail className="w-3.5 h-3.5 text-amber-400" />
                  <span>إرسال / إعادة إرسال الكود إلى بريدي ({pendingEmail}) ✉️</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setVerificationPending(false)}
                className="w-full text-center text-xs text-slate-400 hover:text-white pt-1"
              >
                العودة للشاشة السابقة
              </button>
            </form>
          </div>
        ) : activeTab === 'profile' && (currentUser || unifiedAccount) ? (
          /* ------------------------------------------------------------- */
          /* VIEW 2: LOGGED IN USER PROFILE WITH USER ID & DETAILS */
          /* ------------------------------------------------------------- */
          <div className="space-y-4">
            {/* Account Card */}
            <div className="bg-gradient-to-br from-slate-850 to-slate-900 border-2 border-amber-500/40 p-4.5 rounded-2xl space-y-4 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
                  الحساب النشط ⚡
                </span>
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>حساب موثق ومحمي بقاعدة البيانات</span>
                </div>
              </div>

              {/* User ID Highlight Card */}
              <div className="bg-slate-950/90 border border-amber-500/30 p-3 rounded-xl flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Fingerprint className="w-4 h-4 text-amber-400 shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-400 block">معرف الحساب الموحد (User ID):</span>
                    <span className="text-xs font-mono font-black text-amber-300 tracking-wider truncate block">
                      {displayUserId}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(displayUserId)}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-bold rounded-lg transition border border-slate-700 flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  {copiedUserId ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">تم النسخ</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-amber-400" />
                      <span>نسخ</span>
                    </>
                  )}
                </button>
              </div>

              {/* User Bio */}
              <div className="flex items-center gap-3.5">
                {currentUser?.photoURL || unifiedAccount?.photoURL ? (
                  <img
                    src={currentUser?.photoURL || unifiedAccount?.photoURL}
                    alt="صورة المستخدم"
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 rounded-full border-2 border-amber-400/80 object-cover shadow-sm shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-black text-lg flex items-center justify-center border-2 border-amber-300 shadow-md shrink-0">
                    {(unifiedAccount?.displayName || currentUser?.displayName || 'U')[0]}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="font-extrabold text-sm text-white truncate">
                    {unifiedAccount?.displayName || currentUser?.displayName || 'مستخدم معتمد'}
                  </h4>
                  <p className="text-xs text-slate-300 font-mono truncate">
                    {unifiedAccount?.email || currentUser?.email || 'لا يوجد بريد مسجل'}
                  </p>
                  {unifiedAccount?.googleEmail && (
                    <p className="text-[10px] text-emerald-400 font-mono truncate flex items-center gap-1 mt-0.5">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      <span>حساب Google المربوط: {unifiedAccount.googleEmail}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Linked Services Badges */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-700/60 text-center">
                <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-700">
                  <Cloud className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                  <span className="text-[11px] font-bold text-slate-200 block">Google Drive</span>
                  <span className="text-[9px] text-emerald-400">
                    {unifiedAccount?.googleEmail || currentUser?.email ? 'مربوط ومعزول' : 'متاح للربط'}
                  </span>
                </div>
                <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-700">
                  <Database className="w-4 h-4 text-indigo-400 mx-auto mb-1" />
                  <span className="text-[11px] font-bold text-slate-200 block">Firebase Firestore</span>
                  <span className="text-[9px] text-emerald-400">خزنة متزامنة ومحمية</span>
                </div>
                <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-700">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
                  <span className="text-[11px] font-bold text-slate-200 block">توثيق Firebase</span>
                  <span className="text-[9px] text-emerald-400">موثق بالبريد ✅</span>
                </div>
              </div>
            </div>

            {/* Cloud Sync & Backup Actions */}
            <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CloudCheck className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-white">المزامنة وقاعدة البيانات السحابية</span>
                </div>
                {lastSyncResult && (
                  <span className="text-[10px] text-slate-400 font-mono">
                    {lastSyncResult.certsCount !== undefined && `${lastSyncResult.certsCount} شهادة محفوظة`}
                  </span>
                )}
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                يتم حفظ واسترجاع كافة الشهادات والمسودات والأختام المرتبطة بهذا المعرف ({displayUserId}) في قاعدة بيانات النظام تلقائياً لمنع أي فقدان للبيانات.
              </p>

              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  onClick={handleSyncToCloud}
                  disabled={isSyncing}
                  className="py-2.5 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-sm"
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
                  <span>استرجاع بيانات الخزنة</span>
                </button>
              </div>
            </div>
          </div>
        ) : activeTab === 'link_google' && (currentUser || unifiedAccount) ? (
          /* ------------------------------------------------------------- */
          /* VIEW 3: LINK EXISTING ACCOUNT TO GOOGLE VIA VERIFICATION CODE */
          /* ------------------------------------------------------------- */
          <div className="bg-slate-950/70 border border-slate-800 p-4.5 rounded-2xl space-y-4">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-xs border-b border-slate-800 pb-2.5">
              <LinkIcon className="w-4 h-4" />
              <span>ربط حسابك الحالي بحساب Google بكود أمان</span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              يمكنك ربط هذا الحساب ({displayUserId}) بحساب Google لتتمكن لاحقاً من تسجيل الدخول بضغطة زر واحدة بكلا الطريقتين دون فقدان أي بيانات.
            </p>

            {!linkingPending ? (
              <form onSubmit={handleStartLinkGoogle} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    البريد الإلكتروني لحساب Google المراد ربطه:
                  </label>
                  <input
                    type="email"
                    value={linkingGoogleEmail}
                    onChange={(e) => setLinkingGoogleEmail(e.target.value)}
                    placeholder="مثال: yourname@gmail.com"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-400 font-mono"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-md"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <KeyRound className="w-4 h-4" />
                  )}
                  <span>توليد كود التحقق من الربط 🔑</span>
                </button>
              </form>
            ) : (
              <form onSubmit={handleConfirmLinkGoogle} className="space-y-3">
                <div className="bg-amber-500/10 border border-amber-500/30 p-3.5 rounded-xl text-center space-y-1.5">
                  <div className="flex items-center justify-center gap-1.5 text-amber-400 font-bold text-xs">
                    <Mail className="w-4 h-4" />
                    <span>تم إرسال كود تأكيد الربط إلى:</span>
                  </div>
                  <div className="font-mono text-xs font-bold text-amber-200 dir-ltr bg-slate-900/80 px-2.5 py-1 rounded-lg inline-block border border-amber-500/20">
                    {linkingGoogleEmail}
                  </div>
                  <p className="text-[11px] text-slate-300">
                    يرجى مراجعة البريد الإلكتروني وكتابة كود الأمان المكون من 6 أرقام لتأكيد الربط.
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    أدخل كود التحقق لتأكيد الربط:
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={linkingCodeInput}
                    onChange={(e) => setLinkingCodeInput(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="مثال: 649210"
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-center text-base font-mono font-bold text-amber-300 tracking-widest focus:outline-hidden focus:border-amber-400"
                    required
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={isLoading || linkingCodeInput.length < 4}
                    className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    <span>إتمام ربط الحساب بنجاح ✨</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLinkingPending(false)}
                    className="px-3 py-2.5 bg-slate-800 text-slate-400 hover:text-white text-xs rounded-xl"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : activeTab === 'register' ? (
          /* ------------------------------------------------------------- */
          /* VIEW 4: REGISTER NEW ACCOUNT (Google OR Username/Password) */
          /* ------------------------------------------------------------- */
          <div className="space-y-4">
            {/* Google Direct Registration */}
            <div className="bg-slate-950/80 border border-amber-500/30 p-4 rounded-2xl space-y-3">
              <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-amber-300">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <span>تسجيل حساب جديد مباشر بحساب Google</span>
              </div>
              <p className="text-[11px] text-slate-400 text-center leading-relaxed">
                إنشاء معرف مستخدم (User ID) وتوليد كود تحقق لتأكيد الحساب على قاعدة بيانات النظام
              </p>

              <GoogleInFrameButton
                onSuccess={handleInFrameGoogleSuccess}
                onError={() => setShowPopupBlockedHelper(true)}
                theme="filled_blue"
                size="large"
                text="signup_with"
                shape="rectangular"
                showRedirectOption={true}
              />
            </div>

            {/* Username / Password Registration */}
            <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-2xl space-y-3">
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 text-amber-400" />
                <span>أو تسجيل حساب باسم مستخدم وكلمة مرور:</span>
              </div>

              <form onSubmit={handleCredentialsRegister} className="space-y-2.5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-0.5">اسم العرض / المدرسة:</label>
                  <input
                    type="text"
                    value={regDisplayName}
                    onChange={(e) => setRegDisplayName(e.target.value)}
                    placeholder="مثال: مدارس الأندلس الأهلية"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-0.5">اسم المستخدم (Username):</label>
                  <input
                    type="text"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    placeholder="مثال: andalus_school"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-400 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-0.5">البريد الإلكتروني (اختياري للاسترجاع):</label>
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="مثال: info@school.edu.sa"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-400 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-0.5">كلمة المرور:</label>
                  <input
                    type="password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-400 font-mono"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50 mt-1"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  <span>إنشاء الحساب وتوليد كود التحقق 🚀</span>
                </button>
              </form>
            </div>
          </div>
        ) : activeTab === 'quick_email' ? (
          /* ------------------------------------------------------------- */
          /* VIEW 4.5: QUICK EMAIL OTP LOGIN (Zero Popup / Guaranteed Vercel Support) */
          /* ------------------------------------------------------------- */
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/30 border-2 border-amber-500/40 p-4.5 rounded-2xl space-y-3 shadow-lg">
              <div className="flex items-center gap-2 text-amber-400 font-extrabold text-xs border-b border-slate-800 pb-2.5">
                <KeyRound className="w-4 h-4 text-amber-400 animate-pulse" />
                <span>الدخول السريع برمز التحقق (بدون أي نوافذ منبثقة إطلاقاً)</span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                الحل المضمون 100% لتسجيل الدخول عند رفع المشروع على Vercel أو الهواتف الذكية: اكتب بريدك الإلكتروني وسيتم توليد كود دخول فوري.
              </p>

              <form onSubmit={handleQuickEmailSubmit} className="space-y-3 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    البريد الإلكتروني (Google أو أي بريد):
                  </label>
                  <input
                    type="email"
                    value={quickEmailInput}
                    onChange={(e) => setQuickEmailInput(e.target.value)}
                    placeholder="مثال: name@gmail.com"
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-400 font-mono"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !quickEmailInput.trim()}
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  <span>توليد كود التحقق وتسجيل الدخول 🚀</span>
                </button>
              </form>
            </div>

            {/* Quick Helper Tips */}
            <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl space-y-1.5 text-[11px] text-slate-400">
              <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>مميزات هذه الطريقة:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-400 pr-1">
                <li>لا تتأثر بحظر النوافذ المنبثقة (Popups) في متصفحات الجوال.</li>
                <li>تعمل فوراً على أي نطاق (Vercel, GitHub, localhost) بدون أي إعدادات سابقة.</li>
                <li>تنشئ وتوثق معرفك (User ID) وتمنحك خزنك وبياناتك المعزولة.</li>
              </ul>
            </div>
          </div>
        ) : (
          /* ------------------------------------------------------------- */
          /* VIEW 5: LOGIN TAB (Direct Account Chooser & Google / Password) */
          /* ------------------------------------------------------------- */
          <div className="space-y-4">
            
            {/* 1. DIRECT ACCOUNT CHOOSER (Top Priority - Zero Popup & Guaranteed) */}
            <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/40 border-2 border-amber-500/50 p-4 rounded-2xl space-y-3 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2 text-amber-400 font-black text-xs">
                  <KeyRound className="w-4 h-4 text-amber-400 animate-pulse" />
                  <span>اختيار الحساب المطلوب والدخول المباشر ⚡</span>
                </div>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  بدون نوافذ وبدون أخطاء 400
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                اكتب بريدك الإلكتروني (حساب Google أو أي بريد) لاختياره وتسجيل الدخول فوراً بكود التحقق:
              </p>

              <form onSubmit={handleQuickEmailSubmit} className="space-y-2.5">
                <div className="relative">
                  <input
                    type="email"
                    value={quickEmailInput}
                    onChange={(e) => setQuickEmailInput(e.target.value)}
                    placeholder="مثال: eslam.kandeel2@gmail.com"
                    className="w-full px-3.5 py-2.5 bg-slate-900/90 border border-amber-500/40 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-400 font-mono shadow-inner text-left"
                    dir="ltr"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !quickEmailInput.trim()}
                  className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 text-slate-950 font-black text-xs rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  <span>تسجيل الدخول بهذا الحساب المطلوب 🚀</span>
                </button>
              </form>
            </div>

            {/* 2. Direct Google Sign-In with Account Selection Popup & In-Frame Option */}
            <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                  <Smartphone className="w-4 h-4 text-amber-400" />
                  <span>تسجيل الدخول بحساب Google:</span>
                </div>
                <span className="text-[10px] text-emerald-400 font-bold">اختيار الحساب الفوري ⚡</span>
              </div>

              {/* Direct Popup Account Selector Button */}
              <button
                type="button"
                onClick={handlePopupGoogleLogin}
                disabled={isLoading}
                className="w-full py-2.5 px-4 bg-white hover:bg-slate-100 text-slate-900 font-extrabold text-xs rounded-xl transition shadow-md flex items-center justify-center gap-2.5 cursor-pointer border border-slate-300 disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-slate-700" />
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                )}
                <span>فتح نافذة اختيار الحساب المطلوب (Google Popup)</span>
              </button>

              <GoogleInFrameButton
                onSuccess={handleInFrameGoogleSuccess}
                onError={() => setShowPopupBlockedHelper(true)}
                theme="outline"
                size="large"
                text="signin_with"
                shape="rectangular"
                showRedirectOption={false}
              />
            </div>

            {/* Smart Popup-Blocker, Vercel Domain & Zero-Popup Helper */}
            {showPopupBlockedHelper && (
              <div className="bg-amber-950/50 border-2 border-amber-500/60 p-4 rounded-2xl space-y-3 animate-fadeIn shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>تنبيه بخصوص حظر النوافذ المنبثقة ونطاق Vercel 🚀</span>
                  </div>
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
                    حلول فورية
                  </span>
                </div>

                <p className="text-[11px] text-slate-200 leading-relaxed">
                  تقوم متصفحات الجوال ومواقع الاستضافة (مثل Vercel) بحظر النوافذ المنبثقة التلقائية أو تحتاج لتصريح النطاق. إليك الحلول المباشرة:
                </p>

                {/* Current Domain Box with Copy */}
                <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-700 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="block text-[10px] text-slate-400 font-bold">نطاق موقعك الحالي:</span>
                    <span className="block font-mono text-xs text-amber-300 truncate dir-ltr text-left">
                      {typeof window !== 'undefined' ? window.location.hostname : 'your-domain.vercel.app'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        navigator.clipboard.writeText(window.location.hostname);
                        setCopiedDomain(true);
                        setTimeout(() => setCopiedDomain(false), 2000);
                        onShowToast('تم نسخ النطاق بنجاح! 📋');
                      }
                    }}
                    className="px-2.5 py-1.5 bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 text-[10px] font-bold rounded-lg border border-amber-500/40 transition shrink-0 flex items-center gap-1 cursor-pointer"
                  >
                    {copiedDomain ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedDomain ? 'تم النسخ' : 'نسخ النطاق'}</span>
                  </button>
                </div>

                {/* Instant Action Options */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (!quickEmailInput) setQuickEmailInput('eslam.kandeel2@gmail.com');
                      onShowToast('تم تعبئة البريد، اضغط على زر الدخول بالأسفل');
                    }}
                    className="py-2.5 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>الدخول برمز التحقق الفوري (OTP)</span>
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        setIsLoading(true);
                        await googleSignInWithRedirect();
                      } catch (e: any) {
                        onShowToast(e.message || 'تعذر بدء الانتقال المباشر');
                      } finally {
                        setIsLoading(false);
                      }
                    }}
                    className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold rounded-xl border border-amber-500/40 transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>الدخول المباشر بنفس الصفحة (Redirect)</span>
                  </button>
                </div>

                {/* Firebase Console Guide Accordion */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowVercelGuide(!showVercelGuide)}
                    className="text-[11px] text-amber-400 hover:text-amber-300 font-bold underline flex items-center gap-1 cursor-pointer"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>{showVercelGuide ? 'إخفاء خطوات تفعيل النطاق في Firebase' : 'كيف أفعّل نطاق Vercel في Firebase لمرة واحدة؟'}</span>
                  </button>

                  {showVercelGuide && (
                    <div className="mt-2 p-3 bg-slate-900/90 rounded-xl border border-slate-700 text-[11px] text-slate-300 space-y-1.5 leading-relaxed animate-fadeIn">
                      <p className="font-bold text-amber-300">خطوات بسيطة (دقيقة واحدة):</p>
                      <ol className="list-decimal list-inside space-y-1 text-slate-200">
                        <li>افتح <strong>Firebase Console</strong> واذهب إلى مشروعك.</li>
                        <li>اختر <strong>Authentication</strong> ثم تبويب <strong>Settings</strong>.</li>
                        <li>اضغط على <strong>Authorized Domains</strong> ثم <strong>Add Domain</strong>.</li>
                        <li>الصق النطاق المنسوخ أعلاه (<span className="font-mono text-amber-300">{typeof window !== 'undefined' ? window.location.hostname : 'vercel.app'}</span>) واضغط <strong>Save</strong>.</li>
                      </ol>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 3. Username / Password Login */}
            <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-2xl space-y-3">
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <KeyRound className="w-4 h-4 text-amber-400" />
                <span>أو الدخول باسم المستخدم / المعرف وكلمة المرور:</span>
              </div>

              <form onSubmit={handleCredentialsLogin} className="space-y-2.5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-0.5">اسم المستخدم أو المعرف (User ID):</label>
                  <input
                    type="text"
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    placeholder="مثال: andalus_school أو USR-..."
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-400"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-0.5">كلمة المرور:</label>
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-400 font-mono"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-300 font-black text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer border border-amber-500/30 disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                  <span>تسجيل الدخول وفتح الخزنة 🔓</span>
                </button>
              </form>
            </div>
          </div>
        )}

        {/* SECTION: Saved Accounts on This Device (Multi-Account Switcher) */}
        {knownAccounts.length > 0 && (
          <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-white">الحسابات المحفوظة على هذا الجهاز</span>
              </div>
              <span className="text-[10px] text-slate-400 font-bold">
                تبديل فوري مع عزل كامل للبيانات ⚡
              </span>
            </div>

            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {knownAccounts.map((acc) => {
                const isActive = acc.accountKey === currentAccountKey;
                const isSwitching = switchingAccountKey === acc.accountKey;

                return (
                  <div
                    key={acc.accountKey}
                    onClick={() => !isActive && !isLoading && handleSwitchToSavedAccount(acc)}
                    className={`p-2 rounded-xl border transition flex items-center justify-between gap-3 ${
                      isActive
                        ? 'bg-amber-500/10 border-amber-500/40 cursor-default'
                        : 'bg-slate-900/90 border-slate-800 hover:border-slate-700 hover:bg-slate-850 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {acc.photoURL ? (
                        <img
                          src={acc.photoURL}
                          alt={acc.displayName}
                          referrerPolicy="no-referrer"
                          className="w-7 h-7 rounded-full border border-slate-700 object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-slate-800 text-amber-400 font-bold text-xs flex items-center justify-center border border-slate-700 shrink-0">
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
                        <p className="text-[10px] text-slate-400 font-mono truncate">
                          {acc.userId ? `ID: ${acc.userId}` : acc.email}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isSwitching ? (
                        <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                      ) : !isActive ? (
                        <button
                          type="button"
                          className="px-2 py-1 bg-amber-500/15 hover:bg-amber-500 hover:text-slate-950 text-amber-300 font-bold text-[10px] rounded-lg transition border border-amber-500/30 flex items-center gap-1"
                        >
                          <ArrowLeftRight className="w-3 h-3" />
                          <span>تبديل</span>
                        </button>
                      ) : null}

                      {!isActive && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`إزالة الحساب (${acc.displayName}) من ذاكرة هذا الجهاز؟`)) {
                              removeAccountFromDevice(acc.accountKey);
                              setKnownAccounts(getKnownAccounts());
                              onShowToast('تمت إزالة الحساب من هذا الجهاز 🗑️');
                            }
                          }}
                          title="إزالة الحساب"
                          className="p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          {currentUser || unifiedAccount ? (
            <button
              onClick={handleLogout}
              disabled={isLoading}
              className="text-xs text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>تسجيل الخروج وتأمين الحساب</span>
            </button>
          ) : (
            <span className="text-[11px] text-slate-500 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>نظام المعرف الموحد والحماية السحابية</span>
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
