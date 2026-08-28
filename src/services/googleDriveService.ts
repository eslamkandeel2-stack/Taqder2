import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithRedirect, 
  getRedirectResult, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User, 
  signOut 
} from 'firebase/auth';
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

let cachedAccessToken: string | null = localStorage.getItem(TOKEN_STORAGE_KEY);

export const initDriveAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  // Check for redirect result when returning from Google Auth page
  getRedirectResult(auth)
    .then((result) => {
      if (result) {
        const credential = GoogleAuthProvider.credentialFromResult(result);
        if (credential?.accessToken) {
          cachedAccessToken = credential.accessToken;
          localStorage.setItem(TOKEN_STORAGE_KEY, cachedAccessToken);
        }
        if (onAuthSuccess) {
          onAuthSuccess(result.user, cachedAccessToken || '');
        }
      }
    })
    .catch((error) => {
      console.error('Error during redirect result handling:', error);
    });

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

/**
 * Initiates direct redirect authentication to prevent popup-blocker issues on mobile browsers
 */
export const googleSignIn = async (): Promise<{ user: User; accessToken: string }> => {
  try {
    await signInWithRedirect(auth, provider);
    // Returning dummy promise as page will redirect immediately
    return new Promise(() => {});
  } catch (error: any) {
    console.error('Google direct redirect error:', error);
    throw new Error('تعذر إعادة التوجيه إلى Google لتسجيل الدخول.');
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
