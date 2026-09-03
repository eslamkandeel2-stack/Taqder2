import { 
  signInWithPopup, 
  signInWithRedirect, 
  getRedirectResult, 
  signInWithCredential, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  browserPopupRedirectResolver,
  User, 
  signOut 
} from 'firebase/auth';
import { auth, default as app } from './firebaseConfig';
import firebaseConfig from '../../firebase-applet-config.json';
import { syncUserSettingsToCloud, loadUserSettingsFromCloud } from './cloudDatabaseService';

declare global {
  interface Window {
    google?: any;
  }
}

export { auth };

export const getCurrentDomainInfo = () => {
  if (typeof window === 'undefined') return { hostname: '', origin: '', isVercel: false };
  const hostname = window.location.hostname || '';
  const origin = window.location.origin || '';
  const isVercel = hostname.includes('vercel.app') || hostname.includes('now.sh');
  return { hostname, origin, isVercel };
};

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.addScope('https://www.googleapis.com/auth/gmail.send');
provider.setCustomParameters({
  prompt: 'select_account'
});

const TOKEN_STORAGE_KEY = 'taqdeer_drive_access_token';
const GIS_USER_STORAGE_KEY = 'taqdeer_gis_user';

let isSigningIn = false;
let cachedAccessToken: string | null = localStorage.getItem(TOKEN_STORAGE_KEY);

export function getOAuthClientId(): string {
  return firebaseConfig.oAuthClientId || '460203543434-ubg52iibus6gua5jgp0eurv0nnotnctk.apps.googleusercontent.com';
}

export function parseJwt(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.warn('Failed to parse JWT:', e);
    return null;
  }
}

export function loadGsiScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id && window.google?.accounts?.oauth2) {
      resolve();
      return;
    }
    const existingScript = document.getElementById('gsi-client-script');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve());
      existingScript.addEventListener('error', () => reject(new Error('فشل تحميل مكتبة Google Identity Services')));
      if (window.google?.accounts) {
        resolve();
      }
      return;
    }
    const script = document.createElement('script');
    script.id = 'gsi-client-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('فشل تحميل مكتبة Google Identity Services'));
    document.head.appendChild(script);
  });
}

/**
 * Handle Google ID token from in-frame Google Sign-In Button or One-Tap
 */
export const handleGoogleIdToken = async (idToken: string): Promise<{ user: User; accessToken: string }> => {
  const payload = parseJwt(idToken) || {};
  const email = payload.email || '';
  const name = payload.name || payload.email || 'حساب Google';
  const picture = payload.picture || '';
  const sub = payload.sub || Date.now().toString();

  let finalUser: User;
  let finalToken = idToken;

  try {
    const credential = GoogleAuthProvider.credential(idToken);
    const userCredential = await signInWithCredential(auth, credential);
    finalUser = userCredential.user;
  } catch (firebaseErr) {
    console.warn('Firebase signInWithCredential note (using local GIS fallback user):', firebaseErr);
    finalUser = {
      uid: 'gis-' + (email ? email.replace(/[^a-zA-Z0-9]/g, '_') : sub),
      email: email,
      displayName: name,
      photoURL: picture,
    } as User;
  }

  try {
    localStorage.setItem(GIS_USER_STORAGE_KEY, JSON.stringify(finalUser));
    localStorage.setItem(TOKEN_STORAGE_KEY, finalToken);
    cachedAccessToken = finalToken;
  } catch (e) {
    console.warn('Failed to store GIS user in localStorage:', e);
  }

  // Sync or pull cloud settings on successful sign in
  try {
    await loadUserSettingsFromCloud(finalUser.uid);
  } catch (syncErr) {
    console.warn('Auto sync cloud settings error:', syncErr);
  }

  return { user: finalUser, accessToken: finalToken };
};

/**
 * Render Google In-Frame Sign-In button into a DOM container element
 * Completely avoids mobile popup-blockers by rendering inside the frame
 */
export const renderInFrameGoogleButton = async (
  containerElement: HTMLElement,
  onSuccess: (res: { user: User; accessToken: string }) => void,
  onError?: (err: any) => void,
  options?: {
    theme?: 'outline' | 'filled_blue' | 'filled_black';
    size?: 'large' | 'medium' | 'small';
    text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
    shape?: 'rectangular' | 'pill' | 'circle' | 'square';
    width?: number | string;
    locale?: string;
  }
): Promise<() => void> => {
  await loadGsiScript();
  const clientId = getOAuthClientId();

  if (!window.google?.accounts?.id) {
    throw new Error('Google Identity Services ID client is not available');
  }

  try {
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: async (response: any) => {
        if (response.credential) {
          try {
            const res = await handleGoogleIdToken(response.credential);
            onSuccess(res);
          } catch (e) {
            if (onError) onError(e);
          }
        } else {
          if (onError) onError(new Error('لم يتم استلام بيانات التحقق من Google'));
        }
      },
      auto_select: false,
      cancel_on_tap_outside: true,
      use_fedcm_for_prompt: false,
      context: 'signin',
      prompt_parent_id: containerElement.id || 'google-inframe-signin-container',
    });

    containerElement.innerHTML = '';
    window.google.accounts.id.renderButton(containerElement, {
      theme: options?.theme || 'filled_blue',
      size: options?.size || 'large',
      type: 'standard',
      shape: options?.shape || 'rectangular',
      text: options?.text || 'signin_with',
      logo_alignment: 'center',
      width: options?.width || (containerElement.clientWidth > 0 ? containerElement.clientWidth : 280),
      locale: options?.locale || 'ar'
    });
  } catch (err) {
    console.error('Failed to initialize and render Google In-Frame Button:', err);
    if (onError) onError(err);
  }

  return () => {
    try {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.cancel();
      }
    } catch (e) {
      // ignore cleanup error
    }
  };
};

export const requestGisToken = async (): Promise<{ user: User; accessToken: string }> => {
  await loadGsiScript();
  const clientId = getOAuthClientId();

  return new Promise((resolve, reject) => {
    try {
      if (!window.google?.accounts?.oauth2) {
        throw new Error('مكتبة Google Identity Services غير مكرسة في المتصفح');
      }

      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
        callback: async (response: any) => {
          if (response.error) {
            console.error('GIS callback error:', response);
            reject(new Error(`خطأ في مصادقة Google: ${response.error_description || response.error}`));
            return;
          }
          if (response.access_token) {
            cachedAccessToken = response.access_token;
            localStorage.setItem(TOKEN_STORAGE_KEY, cachedAccessToken);

            let userProfile = { email: '', name: 'حساب Google', picture: '' };
            try {
              const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${response.access_token}` },
              });
              if (res.ok) {
                const info = await res.json();
                userProfile = {
                  email: info.email || '',
                  name: info.name || info.email || 'حساب Google',
                  picture: info.picture || '',
                };
              }
            } catch (e) {
              console.warn('Failed to fetch userinfo from Google API:', e);
            }

            const mockUser = {
              uid: 'gis-' + (userProfile.email ? userProfile.email.replace(/[^a-zA-Z0-9]/g, '_') : Date.now()),
              email: userProfile.email,
              displayName: userProfile.name,
              photoURL: userProfile.picture,
            } as User;

            try {
              localStorage.setItem(GIS_USER_STORAGE_KEY, JSON.stringify(mockUser));
            } catch (e) {
              console.warn('Failed to store GIS user in localStorage:', e);
            }

            // Sync or pull cloud settings on successful sign in
            try {
              await loadUserSettingsFromCloud(mockUser.uid);
            } catch (syncErr) {
              console.warn('Auto sync cloud settings error:', syncErr);
            }

            resolve({ user: mockUser, accessToken: response.access_token });
          } else {
            reject(new Error('لم يتم استلام مفتاح الوصول من Google.'));
          }
        },
        error_callback: (err: any) => {
          console.warn('GIS Error callback:', err);
          const errorType = err?.type || '';
          const errorMsg = typeof err === 'string' ? err : (err?.message || '');
          
          if (errorType === 'popup_closed' || errorMsg.toLowerCase().includes('closed') || errorMsg.toLowerCase().includes('cancel') || errorMsg.includes('إلغاء')) {
            const cancelErr = new Error('تم إلغاء عملية تسجيل الدخول أو إغلاق النافذة');
            (cancelErr as any).code = 'auth/popup-closed-by-user';
            (cancelErr as any).isUserCancel = true;
            reject(cancelErr);
          } else if (errorType === 'popup_failed_to_open' || errorType === 'popup_blocked' || errorMsg.toLowerCase().includes('blocked')) {
            const blockedErr = new Error('تم حظر النافذة المنبثقة من قِبل المتصفح. يرجى السماح بالنوافذ المنبثقة أو فتح التطبيق في علامة تبويب جديدة.');
            (blockedErr as any).code = 'auth/popup-blocked';
            reject(blockedErr);
          } else {
            const generalErr = new Error(errorMsg || 'تعذر فتح نافذة تسجيل الدخول من Google');
            (generalErr as any).code = 'auth/gis-failed';
            reject(generalErr);
          }
        },
      });

      client.requestAccessToken({ prompt: 'select_account' });
    } catch (err) {
      console.warn('GIS token init exception:', err);
      reject(err);
    }
  });
};

export const initDriveAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  // Check localStorage for saved GIS user & cached token
  const savedGisUser = localStorage.getItem(GIS_USER_STORAGE_KEY);
  if (!cachedAccessToken) {
    cachedAccessToken = localStorage.getItem(TOKEN_STORAGE_KEY);
  }

  if (savedGisUser && cachedAccessToken) {
    try {
      const parsedUser = JSON.parse(savedGisUser) as User;
      if (onAuthSuccess) {
        onAuthSuccess(parsedUser, cachedAccessToken);
      }
    } catch (e) {
      console.warn('Invalid GIS user in storage:', e);
    }
  }

  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      if (!cachedAccessToken) {
        cachedAccessToken = localStorage.getItem(TOKEN_STORAGE_KEY);
      }
      if (onAuthSuccess) {
        onAuthSuccess(user, cachedAccessToken || '');
      }
    } else {
      if (!localStorage.getItem(GIS_USER_STORAGE_KEY)) {
        cachedAccessToken = null;
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        if (onAuthFailure) onAuthFailure();
      }
    }
  });
};

export const checkRedirectAuthResult = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    const result = await getRedirectResult(auth, browserPopupRedirectResolver);
    if (result && result.user) {
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken || localStorage.getItem(TOKEN_STORAGE_KEY) || '';
      if (token) {
        cachedAccessToken = token;
        localStorage.setItem(TOKEN_STORAGE_KEY, token);
      }
      try {
        await loadUserSettingsFromCloud(result.user.uid);
      } catch (e) {
        console.warn('Sync on redirect error:', e);
      }
      return { user: result.user, accessToken: token };
    }
  } catch (error: any) {
    console.warn('getRedirectResult notice:', error);
  }
  return null;
};

export const googleSignInWithRedirect = async (): Promise<void> => {
  try {
    isSigningIn = true;
    
    // In iframe contexts, top-level navigation might be needed or preferred
    const isInIframe = typeof window !== 'undefined' && window.self !== window.top;
    if (isInIframe) {
      // Open in a new top-level tab/window directly to complete authentication safely
      window.open(window.location.href, '_blank');
      return;
    }

    await signInWithRedirect(auth, provider, browserPopupRedirectResolver);
  } catch (error: any) {
    console.error('Firebase signInWithRedirect error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

// Preload Google Identity Services in advance to avoid popup blocking on user gesture
if (typeof window !== 'undefined') {
  loadGsiScript().catch((err) => console.warn('Preloading GSI script note:', err));
}

export const googleSignIn = async (): Promise<{ user: User; accessToken: string }> => {
  const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';
  const isVercel = currentHost.includes('vercel.app') || currentHost.includes('now.sh');

  try {
    isSigningIn = true;

    // Refresh provider params to always force account selection popup
    provider.setCustomParameters({
      prompt: 'select_account'
    });

    try {
      const result = await signInWithPopup(auth, provider, browserPopupRedirectResolver);
      let token = '';
      try {
        const credential = GoogleAuthProvider.credentialFromResult(result);
        if (credential?.accessToken) {
          token = credential.accessToken;
        }
      } catch (credErr) {
        console.warn('credentialFromResult note:', credErr);
      }

      if (!token && result.user) {
        try {
          token = await result.user.getIdToken();
        } catch (idTokenErr) {
          console.warn('getIdToken note:', idTokenErr);
        }
      }

      cachedAccessToken = token || 'google_auth_token';
      localStorage.setItem(TOKEN_STORAGE_KEY, cachedAccessToken);
      try {
        localStorage.setItem(GIS_USER_STORAGE_KEY, JSON.stringify(result.user));
      } catch (e) {
        console.warn('Failed to store GIS user:', e);
      }

      return { user: result.user, accessToken: cachedAccessToken };
    } catch (popupError: any) {
      console.warn('Firebase popup attempt status, trying Google Identity Services account chooser fallback:', popupError?.code || popupError?.message);

      // If user explicitly closed popup or canceled during Firebase popup
      if (popupError?.code === 'auth/popup-closed-by-user' || popupError?.code === 'auth/cancelled-popup-request') {
        const cancelErr = new Error('تم إلغاء عملية تسجيل الدخول أو إغلاق النافذة');
        (cancelErr as any).code = 'auth/popup-closed-by-user';
        (cancelErr as any).isUserCancel = true;
        throw cancelErr;
      }

      // Seamless GIS OAuth fallback with account chooser prompt
      try {
        const gisResult = await requestGisToken();
        return gisResult;
      } catch (gisErr: any) {
        console.warn('Google Identity Services fallback status:', gisErr?.code || gisErr?.message);

        if (
          gisErr?.code === 'auth/popup-closed-by-user' ||
          gisErr?.isUserCancel ||
          gisErr?.message?.includes('إغلاق') ||
          gisErr?.message?.toLowerCase()?.includes('closed') ||
          gisErr?.message?.toLowerCase()?.includes('cancel') ||
          gisErr?.message?.includes('إلغاء')
        ) {
          const err = new Error('تم إلغاء عملية تسجيل الدخول.');
          (err as any).code = 'auth/popup-closed-by-user';
          (err as any).isUserCancel = true;
          throw err;
        }

        if (
          popupError?.code === 'auth/unauthorized-domain' ||
          popupError?.message?.includes('unauthorized-domain') ||
          popupError?.message?.includes('authorized domain')
        ) {
          const domainErr = new Error(
            `نطاق الاستضافة (${currentHost}) يحتاج إلى إضافة في Firebase Console (Authentication > Settings > Authorized domains) أو استخدام الدخول السريع برمز التحقق الفوري.`
          );
          (domainErr as any).code = 'auth/unauthorized-domain';
          (domainErr as any).isUnauthorizedDomain = true;
          (domainErr as any).hostname = currentHost;
          (domainErr as any).isVercel = isVercel;
          throw domainErr;
        }

        if (
          popupError?.code === 'auth/popup-blocked' ||
          gisErr?.code === 'auth/popup-blocked' ||
          gisErr?.message?.toLowerCase()?.includes('blocked') ||
          gisErr?.message?.includes('حظر')
        ) {
          const err = new Error(
            'تم حظر النوافذ المنبثقة من قِبل المتصفح على جهازك. يمكنك استخدام "الدخول المباشر بنفس الصفحة (Redirect)" أو كتابة بريدك في "الدخول السريع برمز التحقق".'
          );
          (err as any).code = 'auth/popup-blocked';
          (err as any).isPopupBlocked = true;
          (err as any).hostname = currentHost;
          (err as any).isVercel = isVercel;
          throw err;
        }

        throw new Error(
          gisErr?.message || popupError?.message || 'تعذر الاتصال بـ Google لاختيار الحساب. يمكنك استخدام الدخول السريع برمز التحقق أو الدخول باسم المستخدم.'
        );
      }
    }
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  if (!cachedAccessToken) {
    cachedAccessToken = localStorage.getItem(TOKEN_STORAGE_KEY);
  }
  return cachedAccessToken;
};

export const getCurrentUser = (): User | null => {
  if (auth.currentUser) {
    return auth.currentUser;
  }
  const savedGisUser = localStorage.getItem(GIS_USER_STORAGE_KEY);
  if (savedGisUser) {
    try {
      const parsed = JSON.parse(savedGisUser);
      if (parsed && (parsed.uid || parsed.userId || parsed.email)) {
        return parsed as User;
      }
    } catch (e) {
      console.warn('Failed to parse GIS user:', e);
    }
  }
  const savedUnified = localStorage.getItem('taqdeer_unified_active_user_v1');
  if (savedUnified) {
    try {
      const parsed = JSON.parse(savedUnified);
      if (parsed && (parsed.userId || parsed.email)) {
        return {
          uid: parsed.userId,
          userId: parsed.userId,
          email: parsed.email || parsed.googleEmail || '',
          displayName: parsed.displayName || parsed.username || '',
          photoURL: parsed.photoURL || '',
          googleEmail: parsed.googleEmail || '',
          isVerified: parsed.isVerified,
          username: parsed.username
        } as unknown as User;
      }
    } catch (e) {
      console.warn('Failed to parse unified user:', e);
    }
  }
  return null;
};

export const initAuthListener = (onUserChanged: (user: User | null) => void) => {
  // Check if returning from redirect authentication
  checkRedirectAuthResult().then((res) => {
    if (res?.user) {
      onUserChanged(res.user);
    }
  }).catch((e) => console.warn('Redirect auth listener note:', e));

  // Check initial cached user
  const initialUser = getCurrentUser();
  if (initialUser) {
    onUserChanged(initialUser);
  }

  return onAuthStateChanged(auth, (firebaseUser) => {
    if (firebaseUser) {
      onUserChanged(firebaseUser);
    } else {
      const activeUser = getCurrentUser();
      if (activeUser) {
        onUserChanged(activeUser);
        return;
      }
      onUserChanged(null);
    }
  });
};

export const clearAccessToken = () => {
  cachedAccessToken = null;
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(GIS_USER_STORAGE_KEY);
};

export const googleSignOut = async () => {
  try {
    await signOut(auth);
  } catch (e) {
    console.warn('Firebase signOut warning:', e);
  }
  cachedAccessToken = null;
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(GIS_USER_STORAGE_KEY);
};


/**
 * Uploads a file Blob (PNG or PDF) to Google Drive and sets public link permission
 */
export async function uploadCertificateToDrive(
  blob: Blob,
  fileName: string,
  accessToken: string,
  existingFileId?: string
): Promise<{ fileId: string; webViewLink: string; webContentLink?: string }> {
  const metadata = {
    name: fileName,
    mimeType: blob.type || 'image/png',
    description: 'تم إصدار هذه الشهادة والتحقق منها عبر منصة تقدير للشهادات',
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', blob);

  let fileId = existingFileId;

  if (fileId) {
    // Update existing file
    const updateRes = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: form,
    });

    if (!updateRes.ok) {
      if (updateRes.status === 401) {
        clearAccessToken();
        throw new Error('انتهت صلاحية جلسة Google Drive. يرجى إعادة تسجيل الدخول.');
      }
      console.warn('Failed to update existing drive file, creating a new one instead...');
      fileId = undefined;
    }
  }

  if (!fileId) {
    // Create new file
    const createRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink,webContentLink', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: form,
    });

    if (!createRes.ok) {
      if (createRes.status === 401) {
        clearAccessToken();
        throw new Error('انتهت صلاحية جلسة Google Drive. يرجى إعادة تسجيل الدخول.');
      }
      const errText = await createRes.text();
      throw new Error(`فشل رفع الملف إلى Google Drive: ${errText}`);
    }

    const data = await createRes.json();
    fileId = data.id;
  }

  // Make file publicly readable for QR code verification
  try {
    await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone',
      }),
    });
  } catch (pErr) {
    console.warn('Could not set public permission on Drive file:', pErr);
  }

  const webViewLink = `https://drive.google.com/file/d/${fileId}/view`;
  const webContentLink = `https://drive.google.com/uc?export=download&id=${fileId}`;

  return {
    fileId,
    webViewLink,
    webContentLink,
  };
}
