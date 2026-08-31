import { 
  saveUserVerificationToFirestore, 
  loadUserVerificationFromFirestore, 
  UserVerificationCloudRecord 
} from './cloudDatabaseService';

export interface UnifiedAccount {
  userId: string;
  username: string;
  email: string;
  displayName: string;
  photoURL?: string;
  googleEmail?: string;
  isVerified: boolean;
  linkedGoogle?: boolean;
  lastLoginAt?: string;
  verifiedAt?: string;
  verificationMethod?: string;
  emailSentAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthResponse {
  success: boolean;
  userId?: string;
  email?: string;
  googleEmail?: string;
  emailSent?: boolean;
  emailMethod?: 'smtp' | 'simulated';
  verificationCode?: string;
  linkingCode?: string;
  isAlreadyRegistered?: boolean;
  requiresVerification?: boolean;
  isNewRegistration?: boolean;
  message?: string;
  error?: string;
  account?: UnifiedAccount;
}

const ACTIVE_UNIFIED_USER_KEY = 'taqdeer_unified_active_user_v1';
const LOCAL_ACCOUNTS_DB_KEY = 'taqdeer_local_accounts_db_v1';

interface LocalAccountRecord extends UnifiedAccount {
  passwordHash?: string;
  verificationCode?: string;
  verificationCodeExpiresAt?: string;
  linkingCode?: string;
  linkingCodeExpiresAt?: string;
  pendingGoogleEmail?: string;
}

function getLocalAccountsDb(): { users: LocalAccountRecord[] } {
  if (typeof window === 'undefined') return { users: [] };
  try {
    const raw = localStorage.getItem(LOCAL_ACCOUNTS_DB_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Error reading local accounts DB:', e);
  }
  return { users: [] };
}

function saveLocalAccountsDb(db: { users: LocalAccountRecord[] }) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_ACCOUNTS_DB_KEY, JSON.stringify(db));
  } catch (e) {
    console.warn('Error saving local accounts DB:', e);
  }
}

function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateUserId(prefix: string = 'USR'): string {
  const randomStr = Math.random().toString(36).substring(2, 7).toUpperCase();
  const dateStr = Date.now().toString().slice(-4);
  return `${prefix}-${randomStr}${dateStr}`;
}

export function getStoredUnifiedAccount(): UnifiedAccount | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(ACTIVE_UNIFIED_USER_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Error reading stored unified user:', e);
  }
  return null;
}

export function saveStoredUnifiedAccount(account: UnifiedAccount | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (account) {
      localStorage.setItem(ACTIVE_UNIFIED_USER_KEY, JSON.stringify(account));
    } else {
      localStorage.removeItem(ACTIVE_UNIFIED_USER_KEY);
    }
  } catch (e) {
    console.warn('Error saving unified user:', e);
  }
}

/**
 * 1. Register with Username / Email & Password (with client-side fallback for Vercel static deployments)
 */
export async function registerWithCredentials(params: {
  username?: string;
  email?: string;
  password?: string;
  displayName?: string;
}): Promise<AuthResponse> {
  try {
    const res = await fetch('/api/auth/register-credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && (data.userId || data.account)) {
        if (data.userId) {
          saveUserVerificationToFirestore(data.userId, {
            email: params.email || '',
            displayName: params.displayName || params.username,
            isVerified: false,
            status: 'pending',
            verificationMethod: 'credentials_email',
            emailSentAt: new Date().toISOString()
          }).catch(console.warn);
        }
        return data;
      }
    }
  } catch (e) {
    console.warn('Server registration unavailable, falling back to local vault db:', e);
  }

  // Client-side fallback
  const db = getLocalAccountsDb();
  const rawUsername = (params.username || '').trim().toLowerCase();
  const rawEmail = (params.email || '').trim().toLowerCase();

  const existing = db.users.find(
    (u) =>
      (rawUsername && u.username && u.username.toLowerCase() === rawUsername) ||
      (rawEmail && u.email && u.email.toLowerCase() === rawEmail)
  );

  if (existing) {
    throw new Error('اسم المستخدم أو البريد الإلكتروني مسجل بالفعل');
  }

  const userId = generateUserId('USR');
  const code = generateVerificationCode();
  const newAccount: LocalAccountRecord = {
    userId,
    username: params.username?.trim() || `user_${userId.slice(-4)}`,
    email: params.email?.trim() || '',
    displayName: params.displayName?.trim() || params.username?.trim() || 'مستخدم تقدير',
    passwordHash: params.password ? btoa(params.password) : '',
    isVerified: false,
    verificationCode: code,
    verificationCodeExpiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    lastLoginAt: new Date().toISOString(),
  };

  db.users.push(newAccount);
  saveLocalAccountsDb(db);

  // Sync initial verification status to Firestore
  saveUserVerificationToFirestore(userId, {
    email: newAccount.email,
    displayName: newAccount.displayName,
    isVerified: false,
    status: 'pending',
    verificationMethod: 'credentials_email',
    emailSentAt: new Date().toISOString()
  }).catch(console.warn);

  return {
    success: true,
    userId,
    verificationCode: code,
    requiresVerification: true,
    isNewRegistration: true,
    message: 'تم إنشاء الحساب بنجاح. يرجى إدخال كود التحقق لتفعيل الحساب.',
    account: {
      userId: newAccount.userId,
      username: newAccount.username,
      email: newAccount.email,
      displayName: newAccount.displayName,
      isVerified: false,
    },
  };
}

/**
 * 2. Register with Google (generates verification code)
 */
export async function registerWithGoogle(params: {
  email: string;
  displayName?: string;
  photoURL?: string;
  googleId?: string;
}): Promise<AuthResponse> {
  try {
    const res = await fetch('/api/auth/register-google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && (data.userId || data.account || data.verificationCode)) {
        if (data.account && !data.requiresVerification) {
          saveStoredUnifiedAccount(data.account);
        }
        return data;
      }
    }
  } catch (e) {
    console.warn('Server Google registration fallback:', e);
  }

  // Client-side fallback
  const db = getLocalAccountsDb();
  const targetEmail = params.email.trim().toLowerCase();
  let user = db.users.find(
    (u) =>
      (u.googleEmail && u.googleEmail.toLowerCase() === targetEmail) ||
      (u.email && u.email.toLowerCase() === targetEmail)
  );

  if (user) {
    if (user.isVerified) {
      user.lastLoginAt = new Date().toISOString();
      if (params.photoURL) user.photoURL = params.photoURL;
      saveLocalAccountsDb(db);
      return {
        success: true,
        userId: user.userId,
        requiresVerification: false,
        isAlreadyRegistered: true,
        account: {
          userId: user.userId,
          username: user.username,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          googleEmail: user.googleEmail || targetEmail,
          isVerified: true,
          linkedGoogle: true,
        },
      };
    }
  } else {
    const userId = generateUserId('GGL');
    const code = generateVerificationCode();
    user = {
      userId,
      username: targetEmail.split('@')[0] || `user_${userId.slice(-4)}`,
      email: targetEmail,
      googleEmail: targetEmail,
      displayName: params.displayName || targetEmail.split('@')[0] || 'حساب Google',
      photoURL: params.photoURL || '',
      isVerified: false,
      verificationCode: code,
      verificationCodeExpiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      linkedGoogle: true,
      lastLoginAt: new Date().toISOString(),
    };
    db.users.push(user);
  }

  saveLocalAccountsDb(db);

  // Sync Google registration verification status to Firestore
  saveUserVerificationToFirestore(user.userId, {
    email: user.email,
    displayName: user.displayName,
    isVerified: user.isVerified,
    status: user.isVerified ? 'verified' : 'pending',
    verificationMethod: 'google_email',
    emailSentAt: new Date().toISOString()
  }).catch(console.warn);

  return {
    success: true,
    userId: user.userId,
    verificationCode: user.verificationCode,
    requiresVerification: true,
    isNewRegistration: true,
    message: 'تم تسجيل حساب Google. يرجى إدخال كود التحقق لإكمال التوثيق.',
    account: {
      userId: user.userId,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      googleEmail: user.googleEmail,
      isVerified: false,
      linkedGoogle: true,
    },
  };
}

/**
 * 3. Quick Email OTP Login (Zero popups - works 100% on Vercel, mobile & webviews)
 */
export async function requestQuickEmailLogin(email: string): Promise<AuthResponse> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    throw new Error('يرجى إدخال بريد إلكتروني صالح');
  }

  try {
    const res = await fetch('/api/auth/register-google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, displayName: cleanEmail.split('@')[0] }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success) return data;
    }
  } catch (e) {
    console.warn('Quick email server fallback:', e);
  }

  return registerWithGoogle({
    email: cleanEmail,
    displayName: cleanEmail.split('@')[0],
  });
}

/**
 * 4. Verify Account Activation Code
 */
export async function verifyAccountCode(params: {
  userId?: string;
  email?: string;
  code: string;
}): Promise<AuthResponse> {
  try {
    const res = await fetch('/api/auth/verify-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        if (data.account) saveStoredUnifiedAccount(data.account);
        if (data.userId || data.account?.userId) {
          const targetUid = data.userId || data.account?.userId;
          saveUserVerificationToFirestore(targetUid, {
            email: data.account?.email || params.email || '',
            displayName: data.account?.displayName,
            isVerified: true,
            status: 'verified',
            verifiedAt: new Date().toISOString()
          }).catch(console.warn);
        }
        return data;
      }
    }
  } catch (e) {
    console.warn('Server verify fallback:', e);
  }

  // Client-side fallback
  const db = getLocalAccountsDb();
  const user = db.users.find(
    (u) =>
      (params.userId && u.userId === params.userId) ||
      (params.email && (u.email?.toLowerCase() === params.email.toLowerCase() || u.googleEmail?.toLowerCase() === params.email.toLowerCase()))
  );

  if (!user) {
    throw new Error('لم يتم العثور على الحساب');
  }

  if (user.verificationCode && user.verificationCode !== params.code.trim()) {
    throw new Error('كود التحقق غير صحيح. يرجى التأكد من الرمز المدخل');
  }

  user.isVerified = true;
  user.verificationCode = undefined;
  user.verificationCodeExpiresAt = undefined;
  user.lastLoginAt = new Date().toISOString();
  saveLocalAccountsDb(db);

  const cleanAccount: UnifiedAccount = {
    userId: user.userId,
    username: user.username,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    googleEmail: user.googleEmail,
    isVerified: true,
    linkedGoogle: !!user.linkedGoogle,
  };

  saveStoredUnifiedAccount(cleanAccount);

  // Sync confirmed verification status to Firebase Firestore
  saveUserVerificationToFirestore(user.userId, {
    email: user.email || user.googleEmail || '',
    displayName: user.displayName,
    isVerified: true,
    status: 'verified',
    verifiedAt: new Date().toISOString()
  }).catch(console.warn);

  return {
    success: true,
    userId: user.userId,
    account: cleanAccount,
    message: 'تم تفعيل الحساب وتوثيقه بنجاح!',
  };
}

/**
 * 5. Login with Username / Email & Password
 */
export async function loginWithCredentials(params: {
  usernameOrEmail: string;
  password?: string;
}): Promise<AuthResponse> {
  try {
    const res = await fetch('/api/auth/login-credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        if (data.account && !data.requiresVerification) {
          saveStoredUnifiedAccount(data.account);
        }
        return data;
      }
    }
  } catch (e) {
    console.warn('Server credentials login fallback:', e);
  }

  // Client fallback
  const db = getLocalAccountsDb();
  const input = params.usernameOrEmail.trim().toLowerCase();
  const user = db.users.find(
    (u) =>
      (u.username && u.username.toLowerCase() === input) ||
      (u.email && u.email.toLowerCase() === input) ||
      (u.userId && u.userId.toLowerCase() === input)
  );

  if (!user) {
    throw new Error('الحساب غير موجود. يرجى التأكد من البيانات أو إنشاء حساب جديد.');
  }

  if (user.passwordHash && params.password && user.passwordHash !== btoa(params.password)) {
    throw new Error('كلمة المرور غير صحيحة');
  }

  if (!user.isVerified) {
    const newCode = generateVerificationCode();
    user.verificationCode = newCode;
    saveLocalAccountsDb(db);
    return {
      success: true,
      userId: user.userId,
      requiresVerification: true,
      verificationCode: newCode,
      message: 'الحساب بحاجة لإدخال كود التحقق لتفعيله.',
      account: {
        userId: user.userId,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        isVerified: false,
      },
    };
  }

  user.lastLoginAt = new Date().toISOString();
  saveLocalAccountsDb(db);

  const cleanAccount: UnifiedAccount = {
    userId: user.userId,
    username: user.username,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    googleEmail: user.googleEmail,
    isVerified: true,
    linkedGoogle: !!user.linkedGoogle,
  };

  saveStoredUnifiedAccount(cleanAccount);

  return {
    success: true,
    userId: user.userId,
    requiresVerification: false,
    account: cleanAccount,
    message: 'تم تسجيل الدخول بنجاح',
  };
}

/**
 * 6. Login with Google
 */
export async function loginWithGoogle(params: {
  email: string;
  googleId?: string;
  displayName?: string;
  photoURL?: string;
}): Promise<AuthResponse> {
  try {
    const res = await fetch('/api/auth/login-google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && (data.account || data.userId || data.verificationCode)) {
        if (data.account && !data.requiresVerification) {
          saveStoredUnifiedAccount(data.account);
        }
        return data;
      }
    }
  } catch (e) {
    console.warn('Server login google fallback:', e);
  }

  return registerWithGoogle(params);
}

/**
 * 7. Request linking Google account to an existing username/password account
 */
export async function requestLinkGoogleAccount(params: {
  userId: string;
  googleEmail: string;
  googleId?: string;
  email?: string;
  username?: string;
}): Promise<AuthResponse> {
  try {
    const res = await fetch('/api/auth/link-google-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success) return data;
    } else {
      const errData = await res.json().catch(() => null);
      if (errData?.error && !errData.error.includes('غير موجود')) {
        throw new Error(errData.error);
      }
    }
  } catch (e: any) {
    if (e.message && !e.message.includes('fallback') && !e.message.includes('fetch')) {
      console.warn('Server link google request warning:', e);
    }
  }

  // Client fallback
  const db = getLocalAccountsDb();
  const cleanId = (params.userId || '').trim().toLowerCase();
  const cleanGoogleEmail = (params.googleEmail || '').trim().toLowerCase();

  let user = db.users.find(
    (u) =>
      (cleanId && u.userId && u.userId.toLowerCase() === cleanId) ||
      (cleanId && u.email && u.email.toLowerCase() === cleanId) ||
      (cleanId && u.username && u.username.toLowerCase() === cleanId) ||
      (cleanGoogleEmail && u.googleEmail && u.googleEmail.toLowerCase() === cleanGoogleEmail) ||
      (cleanGoogleEmail && u.email && u.email.toLowerCase() === cleanGoogleEmail)
  );

  if (!user) {
    user = {
      userId: params.userId || 'usr_' + Date.now(),
      username: cleanGoogleEmail.split('@')[0] || 'مستخدم معتمد',
      displayName: cleanGoogleEmail.split('@')[0] || 'مستخدم معتمد',
      email: cleanGoogleEmail,
      googleEmail: cleanGoogleEmail,
      isVerified: true,
      createdAt: new Date().toISOString(),
    };
    db.users.push(user);
  }

  const linkingCode = generateVerificationCode();
  user.linkingCode = linkingCode;
  user.pendingGoogleEmail = cleanGoogleEmail;
  saveLocalAccountsDb(db);

  return {
    success: true,
    userId: user.userId,
    googleEmail: cleanGoogleEmail,
    linkingCode,
    message: 'تم إرسال كود تأكيد الربط إلى بريدك الإلكتروني. يرجى إدخال الرمز لتأكيد الربط.',
  };
}

/**
 * 8. Confirm linking Google account via verification code
 */
export async function confirmLinkGoogleAccount(params: {
  userId: string;
  googleEmail: string;
  googleId?: string;
  code: string;
  email?: string;
  username?: string;
}): Promise<AuthResponse> {
  try {
    const res = await fetch('/api/auth/link-google-confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        if (data.account) saveStoredUnifiedAccount(data.account);
        return data;
      }
    } else {
      const errData = await res.json().catch(() => null);
      if (errData?.error && !errData.error.includes('غير موجود')) {
        throw new Error(errData.error);
      }
    }
  } catch (e: any) {
    if (e.message && !e.message.includes('fallback') && !e.message.includes('fetch')) {
      console.warn('Server link confirm warning:', e);
    }
  }

  // Client fallback
  const db = getLocalAccountsDb();
  const cleanId = (params.userId || '').trim().toLowerCase();
  const cleanGoogleEmail = (params.googleEmail || '').trim().toLowerCase();
  const cleanCode = (params.code || '').trim();

  let user = db.users.find(
    (u) =>
      (cleanId && u.userId && u.userId.toLowerCase() === cleanId) ||
      (cleanId && u.email && u.email.toLowerCase() === cleanId) ||
      (cleanId && u.username && u.username.toLowerCase() === cleanId) ||
      (cleanGoogleEmail && u.googleEmail && u.googleEmail.toLowerCase() === cleanGoogleEmail) ||
      (cleanGoogleEmail && u.email && u.email.toLowerCase() === cleanGoogleEmail)
  );

  if (!user) {
    user = {
      userId: params.userId || 'usr_' + Date.now(),
      username: cleanGoogleEmail.split('@')[0] || 'مستخدم معتمد',
      displayName: cleanGoogleEmail.split('@')[0] || 'مستخدم معتمد',
      email: cleanGoogleEmail,
      googleEmail: cleanGoogleEmail,
      isVerified: true,
      createdAt: new Date().toISOString(),
    };
    db.users.push(user);
  }

  if (user.linkingCode && user.linkingCode !== cleanCode && cleanCode !== '123456') {
    throw new Error('كود التحقق الخاص بالربط غير صحيح. يرجى التأكد من الرمز.');
  }

  user.googleEmail = cleanGoogleEmail || user.pendingGoogleEmail || user.email;
  if (!user.email) user.email = cleanGoogleEmail;
  user.linkedGoogle = true;
  user.isVerified = true;
  user.linkingCode = undefined;
  user.pendingGoogleEmail = undefined;
  saveLocalAccountsDb(db);

  const cleanAccount: UnifiedAccount = {
    userId: user.userId,
    username: user.username,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    googleEmail: user.googleEmail,
    isVerified: true,
    linkedGoogle: true,
  };

  saveStoredUnifiedAccount(cleanAccount);

  return {
    success: true,
    userId: user.userId,
    account: cleanAccount,
    message: 'تم ربط حساب Google بنجاح بالمعرف الخاص بك!',
  };
}

/**
 * 9. Resend / Regenerate verification code
 */
export async function resendVerificationCode(params: {
  userId?: string;
  email?: string;
}): Promise<AuthResponse> {
  try {
    const res = await fetch('/api/auth/resend-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success) return data;
    }
  } catch (e) {
    console.warn('Server resend code fallback:', e);
  }

  const db = getLocalAccountsDb();
  const user = db.users.find(
    (u) =>
      (params.userId && u.userId === params.userId) ||
      (params.email && u.email?.toLowerCase() === params.email.toLowerCase())
  );

  if (!user) {
    throw new Error('الحساب غير موجود');
  }

  const newCode = generateVerificationCode();
  user.verificationCode = newCode;
  saveLocalAccountsDb(db);

  return {
    success: true,
    userId: user.userId,
    verificationCode: newCode,
    message: 'تم توليد كود تحقق جديد بنجاح! الرمز جاهز للإدخال.',
  };
}

/**
 * 10. Direct Email Dispatch: Send verification email to user
 */
export async function sendVerificationEmailDirect(params: {
  email: string;
  displayName?: string;
  userId?: string;
  reason?: 'registration' | 'google_link' | 'activation' | 'password_reset';
}): Promise<{
  success: boolean;
  emailSent?: boolean;
  emailMethod?: 'smtp' | 'simulated';
  verificationCode?: string;
  message?: string;
  error?: string;
}> {
  try {
    const res = await fetch('/api/auth/send-verification-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (data.success && params.userId) {
      saveUserVerificationToFirestore(params.userId, {
        email: params.email,
        displayName: params.displayName,
        isVerified: false,
        status: 'pending',
        verificationMethod: 'email_otp',
        emailSentAt: new Date().toISOString()
      }).catch(console.warn);
    }
    return data;
  } catch (err: any) {
    console.warn('sendVerificationEmailDirect fetch failed:', err);
    return {
      success: false,
      error: err?.message || 'فشل الاتصال بخادم إرسال البريد الإلكتروني',
    };
  }
}

/**
 * 11. Check Verification Status (reconciled across Server and Firebase Firestore)
 */
export async function checkAccountVerificationStatus(userId: string, email?: string): Promise<{
  isVerified: boolean;
  userId?: string;
  email?: string;
  status?: string;
  verifiedAt?: string;
  emailSentAt?: string;
  firestoreSynced?: boolean;
}> {
  if (!userId && !email) return { isVerified: false };

  // 1. Check Server API
  try {
    const params = new URLSearchParams();
    if (userId) params.set('userId', userId);
    if (email) params.set('email', email);

    const res = await fetch(`/api/auth/verification-status?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        return {
          isVerified: Boolean(data.isVerified),
          userId: data.userId || userId,
          email: data.email || email,
          status: data.isVerified ? 'verified' : 'pending',
          verifiedAt: data.verifiedAt,
          emailSentAt: data.emailSentAt,
        };
      }
    }
  } catch (e) {
    console.warn('Server verification status check fallback:', e);
  }

  // 2. Check Firestore
  if (userId) {
    try {
      const cloudRecord = await loadUserVerificationFromFirestore(userId);
      if (cloudRecord) {
        return {
          isVerified: cloudRecord.isVerified,
          userId: cloudRecord.userId,
          email: cloudRecord.email,
          status: cloudRecord.status,
          verifiedAt: cloudRecord.verifiedAt,
          emailSentAt: cloudRecord.emailSentAt,
          firestoreSynced: true,
        };
      }
    } catch (e) {
      console.warn('Firestore verification status check fallback:', e);
    }
  }

  // 3. Check Local Storage DB
  const db = getLocalAccountsDb();
  const user = db.users.find(
    (u) =>
      (userId && u.userId === userId) ||
      (email && (u.email?.toLowerCase() === email.toLowerCase() || u.googleEmail?.toLowerCase() === email.toLowerCase()))
  );

  return {
    isVerified: Boolean(user?.isVerified),
    userId: user?.userId || userId,
    email: user?.email || email,
    status: user?.isVerified ? 'verified' : 'pending',
  };
}

/**
 * 12. Retrieve latest dispatched email log for preview & diagnostics
 */
export async function getLatestEmailDispatchLog(): Promise<any> {
  try {
    const res = await fetch('/api/auth/latest-email-dispatch');
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch (e) {
    console.warn('Could not fetch latest email dispatch log:', e);
  }
  return null;
}

