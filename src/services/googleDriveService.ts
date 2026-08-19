import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signOut } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

declare global {
  interface Window {
    google?: any;
  }
}

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.setCustomParameters({
  prompt: 'select_account'
});

const TOKEN_STORAGE_KEY = 'taqdeer_drive_access_token';
const GIS_USER_STORAGE_KEY = 'taqdeer_gis_user';

let isSigningIn = false;
let cachedAccessToken: string | null = localStorage.getItem(TOKEN_STORAGE_KEY);

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

export const requestGisToken = async (): Promise<{ user: User; accessToken: string }> => {
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
              email: userProfile.email,
              displayName: userProfile.name,
              photoURL: userProfile.picture,
            } as User;

            try {
              localStorage.setItem(GIS_USER_STORAGE_KEY, JSON.stringify(mockUser));
            } catch (e) {
              console.warn('Failed to store GIS user in localStorage:', e);
            }

            resolve({ user: mockUser, accessToken: response.access_token });
          } else {
            reject(new Error('لم يتم استلام مفتاح الوصول من Google.'));
          }
        },
        error_callback: (err: any) => {
          console.error('GIS Error callback:', err);
          reject(new Error('تعذر فتح نافذة تسجيل الدخول من Google'));
        },
      });

      client.requestAccessToken({ prompt: 'select_account' });
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

export const googleSignIn = async (): Promise<{ user: User; accessToken: string }> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('لم نتمكن من الحصول على مفتاح الوصول لحساب Google.');
    }

    cachedAccessToken = credential.accessToken;
    localStorage.setItem(TOKEN_STORAGE_KEY, cachedAccessToken);
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.warn('Firebase signInWithPopup threw error, attempting Google Identity Services (GIS) token fallback:', error);

    try {
      const gisResult = await requestGisToken();
      return gisResult;
    } catch (gisErr: any) {
      console.error('Google Identity Services login also failed:', gisErr);

      if (gisErr?.message?.includes('closed') || gisErr?.message?.includes('إلغاء') || error?.code === 'auth/popup-closed-by-user') {
        const err = new Error('تم إلغاء عملية تسجيل الدخول.');
        (err as any).code = 'auth/popup-closed-by-user';
        throw err;
      }

      if (error?.code === 'auth/popup-blocked' || gisErr?.message?.includes('popup')) {
        const err = new Error('تعذر فتح نافذة تسجيل الدخول. يرجى السماح بالنوافذ المنبثقة (Popups) من إعدادات المتصفح.');
        (err as any).code = 'auth/popup-blocked';
        throw err;
      }

      throw new Error('تعذر الاتصال بـ Google لربط الحساب. يمكنك تجربة "حفظ بالمكتبة السحابية" مباشرة دون الحاجة لـ Google Drive.');
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
