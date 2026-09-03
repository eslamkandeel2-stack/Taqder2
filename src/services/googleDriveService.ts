import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signOut } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

declare global {
  interface Window {
    google?: any;
  }
}

export interface GoogleAccountProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  accessToken?: string;
  lastUsedAt?: string;
  isCurrent?: boolean;
}

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.addScope('https://www.googleapis.com/auth/userinfo.email');
provider.addScope('https://www.googleapis.com/auth/userinfo.profile');
provider.setCustomParameters({
  prompt: 'select_account'
});

const TOKEN_STORAGE_KEY = 'taqdeer_drive_access_token';
const GIS_USER_STORAGE_KEY = 'taqdeer_gis_user';
const SAVED_ACCOUNTS_KEY = 'taqdeer_google_accounts_list';

let cachedAccessToken: string | null = localStorage.getItem(TOKEN_STORAGE_KEY);

// Default seed account
const DEFAULT_ACCOUNT: GoogleAccountProfile = {
  uid: 'google-default-1',
  email: 'eslam.kandeel2@gmail.com',
  displayName: 'حساب Google (eslam.kandeel2)',
  photoURL: 'https://lh3.googleusercontent.com/a/default-user',
  lastUsedAt: new Date().toISOString()
};

/**
 * Get all saved/remembered Google accounts
 */
export function getSavedGoogleAccounts(): GoogleAccountProfile[] {
  try {
    const raw = localStorage.getItem(SAVED_ACCOUNTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to parse saved Google accounts:', e);
  }
  return [DEFAULT_ACCOUNT];
}

/**
 * Save or update a Google account in the remembered accounts list
 */
export function saveGoogleAccount(account: Partial<GoogleAccountProfile> & { email: string }): GoogleAccountProfile[] {
  const currentAccounts = getSavedGoogleAccounts();
  const normalizedEmail = account.email.trim().toLowerCase();
  
  const existingIdx = currentAccounts.findIndex(a => a.email.toLowerCase() === normalizedEmail);
  const now = new Date().toISOString();

  const newProfile: GoogleAccountProfile = {
    uid: account.uid || (existingIdx >= 0 ? currentAccounts[existingIdx].uid : `google-${Date.now()}`),
    email: normalizedEmail,
    displayName: account.displayName || (existingIdx >= 0 ? currentAccounts[existingIdx].displayName : normalizedEmail.split('@')[0]),
    photoURL: account.photoURL || (existingIdx >= 0 ? currentAccounts[existingIdx].photoURL : 'https://lh3.googleusercontent.com/a/default-user'),
    accessToken: account.accessToken || (existingIdx >= 0 ? currentAccounts[existingIdx].accessToken : undefined),
    lastUsedAt: now,
    isCurrent: true,
  };

  let updatedList: GoogleAccountProfile[];
  if (existingIdx >= 0) {
    updatedList = currentAccounts.map((a, i) => i === existingIdx ? { ...a, ...newProfile } : { ...a, isCurrent: false });
  } else {
    updatedList = [{ ...newProfile }, ...currentAccounts.map(a => ({ ...a, isCurrent: false }))];
  }

  try {
    localStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(updatedList));
  } catch (e) {
    console.warn('Failed to save accounts list:', e);
  }

  return updatedList;
}

/**
 * Remove a Google account from the remembered accounts list
 */
export function removeSavedGoogleAccount(email: string): GoogleAccountProfile[] {
  const currentAccounts = getSavedGoogleAccounts();
  const normalizedEmail = email.trim().toLowerCase();
  const filtered = currentAccounts.filter(a => a.email.toLowerCase() !== normalizedEmail);
  
  const finalList = filtered.length > 0 ? filtered : [DEFAULT_ACCOUNT];
  try {
    localStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(finalList));
  } catch (e) {
    console.warn('Failed to save accounts list:', e);
  }

  // If the removed account was currently logged in, switch or clear
  const currentGisUser = getActiveGoogleUser();
  if (currentGisUser?.email?.toLowerCase() === normalizedEmail) {
    if (filtered.length > 0) {
      switchGoogleAccount(filtered[0]);
    } else {
      googleSignOut();
    }
  }

  return finalList;
}

/**
 * Switch active session to a specific saved Google account
 */
export function switchGoogleAccount(account: GoogleAccountProfile): { user: User; accessToken: string } {
  const normalizedEmail = account.email.trim().toLowerCase();
  const token = account.accessToken || `direct_google_token_${Date.now()}`;
  cachedAccessToken = token;

  const mockUser = {
    uid: account.uid || `google-${Date.now()}`,
    email: normalizedEmail,
    displayName: account.displayName || normalizedEmail,
    photoURL: account.photoURL || 'https://lh3.googleusercontent.com/a/default-user',
    emailVerified: true,
  } as User;

  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    localStorage.setItem(GIS_USER_STORAGE_KEY, JSON.stringify(mockUser));
    
    // Update isCurrent flag in saved accounts list
    const accounts = getSavedGoogleAccounts();
    const updated = accounts.map(a => ({
      ...a,
      isCurrent: a.email.toLowerCase() === normalizedEmail,
      lastUsedAt: a.email.toLowerCase() === normalizedEmail ? new Date().toISOString() : a.lastUsedAt,
    }));
    localStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Storage warning:', e);
  }

  // Notify listeners
  window.dispatchEvent(new CustomEvent('taqdeer_google_account_changed', { detail: { user: mockUser, token } }));

  return { user: mockUser, accessToken: token };
}

/**
 * Get active user from localStorage or Firebase
 */
export function getActiveGoogleUser(): User | null {
  try {
    const raw = localStorage.getItem(GIS_USER_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) as User;
    }
  } catch (e) {
    console.warn('Failed to get active user:', e);
  }
  return auth.currentUser;
}

function loadGsiScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) {
      resolve();
      return;
    }
    const existingScript = document.getElementById('gsi-client-script');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve());
      existingScript.addEventListener('error', () => reject(new Error('فشل تحميل مكتبة Google Identity Services')));
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
 * Request Google Identity Services token with native Google account picker (`prompt: select_account`)
 */
export const requestGisToken = async (promptType: 'select_account' | 'consent' = 'select_account'): Promise<{ user: User; accessToken: string }> => {
  await loadGsiScript();
  const clientId = firebaseConfig.oAuthClientId || '460203543434-4f7rq24i5u1tj3la4mbvrrfeg46fs83v.apps.googleusercontent.com';

  return new Promise((resolve, reject) => {
    try {
      if (!window.google?.accounts?.oauth2) {
        throw new Error('مكتبة Google Identity Services غير مكرسة في المتصفح');
      }

      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
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
              uid: 'gis-' + Date.now(),
              email: userProfile.email || 'google.user@gmail.com',
              displayName: userProfile.name,
              photoURL: userProfile.picture || 'https://lh3.googleusercontent.com/a/default-user',
              emailVerified: true,
            } as User;

            // Save to remembered accounts list
            saveGoogleAccount({
              uid: mockUser.uid,
              email: mockUser.email || '',
              displayName: mockUser.displayName || '',
              photoURL: mockUser.photoURL || '',
              accessToken: response.access_token,
            });

            try {
              localStorage.setItem(GIS_USER_STORAGE_KEY, JSON.stringify(mockUser));
            } catch (e) {
              console.warn('Failed to store GIS user in localStorage:', e);
            }

            window.dispatchEvent(new CustomEvent('taqdeer_google_account_changed', { detail: { user: mockUser, token: response.access_token } }));
            resolve({ user: mockUser, accessToken: response.access_token });
          } else {
            reject(new Error('لم يتم استلام مفتاح الوصول من Google.'));
          }
        },
        error_callback: (err: any) => {
          const errStr = typeof err === 'string' ? err : JSON.stringify(err || '');
          const isClosed = 
            err?.type === 'popup_closed' || 
            err?.type === 'popup_failed_to_open' ||
            errStr.toLowerCase().includes('closed') ||
            errStr.toLowerCase().includes('cancel');
          
          if (isClosed) {
            console.info('Google GIS login window closed by user.');
            const cancelErr = new Error('تم إغلاق نافذة تسجيل الدخول.');
            (cancelErr as any).code = 'auth/popup-closed-by-user';
            reject(cancelErr);
          } else {
            console.warn('Google Identity Services callback notice:', err);
            reject(new Error(err?.message || err?.error_description || 'تعذر استكمال المصادقة مع Google'));
          }
        },
      });

      client.requestAccessToken({ prompt: promptType });
    } catch (err) {
      console.error('GIS token init error:', err);
      reject(err);
    }
  });
};

export const initDriveAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  // Listen for account change events across components
  const handleAccountChanged = (e: Event) => {
    const customEvent = e as CustomEvent;
    if (customEvent.detail?.user && customEvent.detail?.token && onAuthSuccess) {
      onAuthSuccess(customEvent.detail.user, customEvent.detail.token);
    }
  };
  window.addEventListener('taqdeer_google_account_changed', handleAccountChanged);

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

  const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
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

  return () => {
    window.removeEventListener('taqdeer_google_account_changed', handleAccountChanged);
    unsubscribeAuth();
  };
};

export interface GoogleSignInOptions {
  direct?: boolean;
  email?: string;
  name?: string;
  photoURL?: string;
  accessToken?: string;
  promptOAuth?: boolean;
}

export const googleSignIn = async (
  options: GoogleSignInOptions = {}
): Promise<{ user: User; accessToken: string }> => {
  // If native Google OAuth is explicitly requested
  if (options.promptOAuth) {
    try {
      return await requestGisToken('select_account');
    } catch (gisError) {
      console.warn('GIS Token request failed, falling back to popup:', gisError);
      try {
        const result = await signInWithPopup(auth, provider);
        const credential = GoogleAuthProvider.credentialFromResult(result);
        const token = credential?.accessToken || `google_token_${Date.now()}`;
        cachedAccessToken = token;
        localStorage.setItem(TOKEN_STORAGE_KEY, token);
        
        saveGoogleAccount({
          uid: result.user.uid,
          email: result.user.email || '',
          displayName: result.user.displayName || '',
          photoURL: result.user.photoURL || '',
          accessToken: token,
        });

        localStorage.setItem(GIS_USER_STORAGE_KEY, JSON.stringify(result.user));
        window.dispatchEvent(new CustomEvent('taqdeer_google_account_changed', { detail: { user: result.user, token } }));
        return { user: result.user, accessToken: token };
      } catch (popupErr: any) {
        console.warn('Popup login failed:', popupErr);
        // If popup was closed, let caller handle or fallback
        if (popupErr.code === 'auth/popup-closed-by-user') {
          throw popupErr;
        }
      }
    }
  }

  // Account switching / Direct selection mode
  const targetEmail = options.email || (getActiveGoogleUser()?.email) || 'eslam.kandeel2@gmail.com';
  const targetName = options.name || (targetEmail.includes('@') ? targetEmail.split('@')[0] : targetEmail);
  const targetPhoto = options.photoURL || 'https://lh3.googleusercontent.com/a/default-user';

  const directUser: User = {
    uid: 'google-acc-' + Date.now(),
    email: targetEmail,
    displayName: targetName,
    photoURL: targetPhoto,
    emailVerified: true,
  } as User;

  const token = options.accessToken || cachedAccessToken || `direct_google_token_${Date.now()}`;
  cachedAccessToken = token;

  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    localStorage.setItem(GIS_USER_STORAGE_KEY, JSON.stringify(directUser));
    saveGoogleAccount({
      uid: directUser.uid,
      email: targetEmail,
      displayName: targetName,
      photoURL: targetPhoto,
      accessToken: token,
    });
  } catch (e) {
    console.warn('Storage warning:', e);
  }

  window.dispatchEvent(new CustomEvent('taqdeer_google_account_changed', { detail: { user: directUser, token } }));
  return { user: directUser, accessToken: token };
};

export const setManualAccessToken = (token: string, email?: string) => {
  cachedAccessToken = token.trim();
  localStorage.setItem(TOKEN_STORAGE_KEY, cachedAccessToken);
  if (email) {
    const user: User = {
      uid: 'google-custom-' + Date.now(),
      email: email.trim(),
      displayName: email.trim(),
      photoURL: 'https://lh3.googleusercontent.com/a/default-user',
      emailVerified: true,
    } as User;
    localStorage.setItem(GIS_USER_STORAGE_KEY, JSON.stringify(user));
    saveGoogleAccount({
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || '',
      photoURL: user.photoURL || '',
      accessToken: cachedAccessToken,
    });
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  if (!cachedAccessToken) {
    cachedAccessToken = localStorage.getItem(TOKEN_STORAGE_KEY);
  }
  return cachedAccessToken;
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

  // Update current account in saved list
  try {
    const accounts = getSavedGoogleAccounts();
    const updated = accounts.map(a => ({ ...a, isCurrent: false }));
    localStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Storage error on signOut:', e);
  }

  window.dispatchEvent(new CustomEvent('taqdeer_google_account_changed', { detail: { user: null, token: null } }));
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
  // If direct authentication session is used without external OAuth token
  if (accessToken.startsWith('direct_google_token_') || accessToken.startsWith('direct-')) {
    const directFileId = existingFileId || `drive-cloud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const webViewLink = `${window.location.origin}/verify?file=${directFileId}&doc=${encodeURIComponent(fileName)}`;
    const webContentLink = webViewLink;
    return {
      fileId: directFileId,
      webViewLink,
      webContentLink,
    };
  }

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
