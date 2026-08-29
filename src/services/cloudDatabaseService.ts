import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  getDocs, 
  query, 
  where, 
  deleteDoc, 
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { CertificateData, BatchRecord } from '../types';
import { DraftCertificateItem, getSavedDrafts } from '../utils/draftsManager';
import { SystemSettingsConfig, getSavedSystemConfig } from '../utils/systemConfig';
import { DefaultCertificateSettings, getSavedDefaultSettings } from '../utils/defaultSettings';
import { AISettings, getSavedAISettings } from '../utils/aiConfig';

export interface UserCloudProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  lastSyncedAt?: string;
  storageUsedBytes?: number;
}

export interface FullAccountSyncPackage {
  updatedAt: string;
  userId?: string;
  userEmail: string;
  systemConfig: SystemSettingsConfig;
  defaultSettings: DefaultCertificateSettings;
  aiSettings: AISettings;
  certificates: CertificateData[];
  batches: BatchRecord[];
  drafts: DraftCertificateItem[];
  studentGroups?: any[];
  customTemplates?: any[];
  signaturePresets?: any[];
  archiveMetadata?: any[];
  autosaveCert?: CertificateData;
  defaultMargins?: any;
}

/**
 * Timeout wrapper to prevent any network or Firestore promise from blocking UI
 */
function withTimeout<T>(promise: Promise<T>, ms = 4500, fallbackValue: T | null = null): Promise<T | null> {
  let timeoutId: any;
  const timeoutPromise = new Promise<T | null>((resolve) => {
    timeoutId = setTimeout(() => resolve(fallbackValue), ms);
  });
  return Promise.race([
    promise.then((res) => {
      clearTimeout(timeoutId);
      return res;
    }).catch((err) => {
      clearTimeout(timeoutId);
      console.warn('Async cloud operation failed gracefully:', err);
      return fallbackValue;
    }),
    timeoutPromise
  ]);
}

/**
 * Server-Side Cloud Sync API: Save package
 */
async function saveToServerCloudSync(userId: string, userEmail: string, packageData: FullAccountSyncPackage): Promise<boolean> {
  try {
    const res = await fetch('/api/cloud-sync/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        userEmail,
        packageData
      })
    });
    const data = await res.json();
    return Boolean(data?.success);
  } catch (err) {
    console.warn('Server cloud-sync save error:', err);
    return false;
  }
}

/**
 * Server-Side Cloud Sync API: Load package
 */
async function loadFromServerCloudSync(userId: string, userEmail: string): Promise<FullAccountSyncPackage | null> {
  try {
    const params = new URLSearchParams();
    if (userId) params.set('userId', userId);
    if (userEmail) params.set('userEmail', userEmail);

    const res = await fetch(`/api/cloud-sync/load?${params.toString()}`);
    const data = await res.json();
    if (data?.success && data?.exists && data?.packageData) {
      return data.packageData as FullAccountSyncPackage;
    }
  } catch (err) {
    console.warn('Server cloud-sync load error:', err);
  }
  return null;
}

/**
 * Saves all system settings, configurations and drafts for a user to Firestore and Server
 */
export async function syncUserSettingsToCloud(user: { uid: string; email?: string | null; displayName?: string | null; photoURL?: string | null }): Promise<void> {
  if (!user || !user.uid) return;

  const currentSystemConfig = getSavedSystemConfig();
  const currentDefaultSettings = getSavedDefaultSettings();
  const currentAiSettings = getSavedAISettings();
  const nowIso = new Date().toISOString();

  // Try Firestore with timeout
  await withTimeout((async () => {
    const userDocRef = doc(db, 'users', user.uid);
    const settingsDocRef = doc(db, 'user_settings', user.uid);

    await setDoc(userDocRef, {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || 'مستخدم النظام',
      photoURL: user.photoURL || '',
      lastSyncedAt: nowIso,
      updatedAt: serverTimestamp()
    }, { merge: true });

    await setDoc(settingsDocRef, {
      uid: user.uid,
      userEmail: user.email || '',
      systemConfig: currentSystemConfig,
      defaultSettings: currentDefaultSettings,
      aiSettings: currentAiSettings,
      updatedAt: serverTimestamp(),
      syncedAt: nowIso
    }, { merge: true });
  })(), 3000);
}

/**
 * Loads user settings from Firestore/Server and updates local storage
 */
export async function loadUserSettingsFromCloud(userId: string, userEmail = ''): Promise<{
  systemConfig?: SystemSettingsConfig;
  defaultSettings?: DefaultCertificateSettings;
  aiSettings?: AISettings;
} | null> {
  if (!userId && !userEmail) return null;

  // 1. Try Server API first (Fast & Reliable across all devices)
  const serverPackage = await loadFromServerCloudSync(userId, userEmail);
  if (serverPackage) {
    if (serverPackage.systemConfig) {
      localStorage.setItem('taqdeer_system_config_v2', JSON.stringify(serverPackage.systemConfig));
      window.dispatchEvent(new CustomEvent('taqdeer_system_config_changed', { detail: serverPackage.systemConfig }));
    }
    if (serverPackage.defaultSettings) {
      localStorage.setItem('taqdeer_default_settings', JSON.stringify(serverPackage.defaultSettings));
      window.dispatchEvent(new CustomEvent('taqdeer_default_settings_changed', { detail: serverPackage.defaultSettings }));
    }
    if (serverPackage.aiSettings) {
      localStorage.setItem('taqdeer_ai_settings_v1', JSON.stringify(serverPackage.aiSettings));
      window.dispatchEvent(new CustomEvent('taqdeer_ai_settings_changed', { detail: serverPackage.aiSettings }));
    }
    return {
      systemConfig: serverPackage.systemConfig,
      defaultSettings: serverPackage.defaultSettings,
      aiSettings: serverPackage.aiSettings
    };
  }

  // 2. Try Firestore fallback with timeout
  const firestoreResult = await withTimeout((async () => {
    if (!userId) return null;
    const settingsDocRef = doc(db, 'user_settings', userId);
    const snap = await getDoc(settingsDocRef);

    if (snap.exists()) {
      const data = snap.data();
      if (data.systemConfig) {
        localStorage.setItem('taqdeer_system_config_v2', JSON.stringify(data.systemConfig));
        window.dispatchEvent(new CustomEvent('taqdeer_system_config_changed', { detail: data.systemConfig }));
      }
      if (data.defaultSettings) {
        localStorage.setItem('taqdeer_default_settings', JSON.stringify(data.defaultSettings));
        window.dispatchEvent(new CustomEvent('taqdeer_default_settings_changed', { detail: data.defaultSettings }));
      }
      if (data.aiSettings) {
        localStorage.setItem('taqdeer_ai_settings_v1', JSON.stringify(data.aiSettings));
        window.dispatchEvent(new CustomEvent('taqdeer_ai_settings_changed', { detail: data.aiSettings }));
      }
      return {
        systemConfig: data.systemConfig,
        defaultSettings: data.defaultSettings,
        aiSettings: data.aiSettings
      };
    }
    return null;
  })(), 3000, null);

  return firestoreResult;
}

/**
 * Saves a single certificate to Firestore
 */
export async function saveCertificateToFirestore(
  cert: CertificateData, 
  user: { uid: string; email?: string | null }
): Promise<void> {
  if (!cert || !user?.uid) return;

  const certId = cert.id || `cert_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const certDocRef = doc(db, 'user_certificates', `${user.uid}_${certId}`);

  await withTimeout(
    setDoc(certDocRef, {
      ...cert,
      id: certId,
      userId: user.uid,
      userEmail: user.email || '',
      savedAt: new Date().toISOString(),
      updatedAt: serverTimestamp()
    }, { merge: true }),
    2500
  );
}

/**
 * Deletes a certificate from Firestore
 */
export async function deleteCertificateFromFirestore(
  certId: string, 
  userId: string
): Promise<void> {
  if (!certId || !userId) return;
  const certDocRef = doc(db, 'user_certificates', `${userId}_${certId}`);
  await withTimeout(deleteDoc(certDocRef), 2500);
}

/**
 * Loads all certificates saved by this user from Firestore
 */
export async function loadUserCertificatesFromFirestore(userId: string): Promise<CertificateData[]> {
  if (!userId) return [];

  const res = await withTimeout((async () => {
    const q = query(
      collection(db, 'user_certificates'),
      where('userId', '==', userId)
    );
    const snapshot = await getDocs(q);
    const certs: CertificateData[] = [];
    snapshot.forEach(docSnap => {
      certs.push(docSnap.data() as CertificateData);
    });
    return certs;
  })(), 3500, []);

  return res || [];
}

/**
 * Full Sync: Upload all local certificates, drafts, batches and settings to Cloud (Server + Firestore)
 */
export async function syncFullAccountToCloud(user: { uid: string; email?: string | null; displayName?: string | null; photoURL?: string | null }): Promise<{
  success: boolean;
  certsCount: number;
  draftsCount: number;
  batchesCount: number;
}> {
  if (!user?.uid && !user?.email) throw new Error('يرجى تسجيل الدخول أو إدخال بيانات الحساب أولاً.');

  const userId = user.uid || user.email || 'user';
  const userEmail = user.email || '';

  // 1. Gather all local data
  const currentSystemConfig = getSavedSystemConfig();
  const currentDefaultSettings = getSavedDefaultSettings();
  const currentAiSettings = getSavedAISettings();

  let certs: CertificateData[] = [];
  try {
    const raw = localStorage.getItem('taqdeer_saved_certs');
    if (raw) certs = JSON.parse(raw);
  } catch (e) {
    console.warn(e);
  }

  let batches: BatchRecord[] = [];
  try {
    const raw = localStorage.getItem('taqdeer_batch_history_v1');
    if (raw) batches = JSON.parse(raw);
  } catch (e) {
    console.warn(e);
  }

  let drafts = getSavedDrafts();

  let studentGroups: any[] = [];
  try {
    const raw = localStorage.getItem('taqdeer_student_groups_v1');
    if (raw) studentGroups = JSON.parse(raw);
  } catch (e) {
    console.warn(e);
  }

  let customTemplates: any[] = [];
  try {
    const raw = localStorage.getItem('taqdeer_custom_user_templates_v1');
    if (raw) customTemplates = JSON.parse(raw);
  } catch (e) {
    console.warn(e);
  }

  let signaturePresets: any[] = [];
  try {
    const raw = localStorage.getItem('taqdeer_saved_signature_presets');
    if (raw) signaturePresets = JSON.parse(raw);
  } catch (e) {
    console.warn(e);
  }

  let archiveMetadata: any[] = [];
  try {
    const raw = localStorage.getItem('taqdeer_archive_metadata_v1');
    if (raw) archiveMetadata = JSON.parse(raw);
  } catch (e) {
    console.warn(e);
  }

  let autosaveCert: CertificateData | undefined = undefined;
  try {
    const raw = localStorage.getItem('taqdeer_autosave_certificate');
    if (raw) autosaveCert = JSON.parse(raw);
  } catch (e) {
    console.warn(e);
  }

  let defaultMargins: any = undefined;
  try {
    const raw = localStorage.getItem('taqdeer_default_margins');
    if (raw) defaultMargins = JSON.parse(raw);
  } catch (e) {
    console.warn(e);
  }

  const syncPackage: FullAccountSyncPackage = {
    updatedAt: new Date().toISOString(),
    userId,
    userEmail,
    systemConfig: currentSystemConfig,
    defaultSettings: currentDefaultSettings,
    aiSettings: currentAiSettings,
    certificates: certs,
    batches: batches,
    drafts: drafts,
    studentGroups: studentGroups,
    customTemplates: customTemplates,
    signaturePresets: signaturePresets,
    archiveMetadata: archiveMetadata,
    autosaveCert: autosaveCert,
    defaultMargins: defaultMargins
  };

  // 2. High-speed Server Cloud Sync
  await saveToServerCloudSync(userId, userEmail, syncPackage);

  // 3. Firestore Sync in parallel (defensive & non-blocking)
  withTimeout((async () => {
    await syncUserSettingsToCloud(user);

    // Save individual certificates up to 50 items
    const limitedCerts = certs.slice(0, 50);
    for (const cert of limitedCerts) {
      await saveCertificateToFirestore(cert, user);
    }

    const dataBundleDocRef = doc(db, 'user_data_bundles', userId);
    await setDoc(dataBundleDocRef, {
      userId,
      userEmail,
      certsCount: certs.length,
      batchesCount: batches.length,
      draftsCount: drafts.length,
      batches: batches.slice(0, 30),
      drafts: drafts.slice(0, 30),
      customTemplates: customTemplates.slice(0, 30),
      signaturePresets: signaturePresets.slice(0, 20),
      studentGroups: studentGroups.slice(0, 30),
      archiveMetadata: archiveMetadata.slice(0, 50),
      autosaveCert: autosaveCert || null,
      defaultMargins: defaultMargins || null,
      systemConfig: currentSystemConfig,
      defaultSettings: currentDefaultSettings,
      aiSettings: currentAiSettings,
      updatedAt: serverTimestamp(),
      syncedAt: new Date().toISOString()
    }, { merge: true });
  })(), 4000);

  return {
    success: true,
    certsCount: certs.length,
    draftsCount: drafts.length,
    batchesCount: batches.length
  };
}

/**
 * Pull and merge all account data from Cloud (Server + Firestore) to local device
 */
export async function restoreAccountFromCloud(userId: string, userEmail = ''): Promise<{
  certsCount: number;
  draftsCount: number;
  batchesCount: number;
}> {
  if (!userId && !userEmail) throw new Error('معرف المستخدم أو البريد غير متاح');

  let restoredCertsCount = 0;
  let restoredDraftsCount = 0;
  let restoredBatchesCount = 0;

  // 1. Try Server Package first
  const serverPackage = await loadFromServerCloudSync(userId, userEmail);
  if (serverPackage) {
    // Restore Settings
    if (serverPackage.systemConfig) {
      localStorage.setItem('taqdeer_system_config_v2', JSON.stringify(serverPackage.systemConfig));
      window.dispatchEvent(new CustomEvent('taqdeer_system_config_changed', { detail: serverPackage.systemConfig }));
    }
    if (serverPackage.defaultSettings) {
      localStorage.setItem('taqdeer_default_settings', JSON.stringify(serverPackage.defaultSettings));
      window.dispatchEvent(new CustomEvent('taqdeer_default_settings_changed', { detail: serverPackage.defaultSettings }));
    }
    if (serverPackage.aiSettings) {
      localStorage.setItem('taqdeer_ai_settings_v1', JSON.stringify(serverPackage.aiSettings));
      window.dispatchEvent(new CustomEvent('taqdeer_ai_settings_changed', { detail: serverPackage.aiSettings }));
    }
    if (serverPackage.defaultMargins) {
      localStorage.setItem('taqdeer_default_margins', JSON.stringify(serverPackage.defaultMargins));
    }
    if (serverPackage.autosaveCert) {
      localStorage.setItem('taqdeer_autosave_certificate', JSON.stringify(serverPackage.autosaveCert));
    }

    // Merge Certificates
    if (serverPackage.certificates && Array.isArray(serverPackage.certificates)) {
      try {
        const localRaw = localStorage.getItem('taqdeer_saved_certs');
        const localCerts: CertificateData[] = localRaw ? JSON.parse(localRaw) : [];
        const map = new Map<string, CertificateData>();
        localCerts.forEach(c => map.set(c.id || c.verificationCode || Math.random().toString(), c));
        serverPackage.certificates.forEach(c => map.set(c.id || c.verificationCode || Math.random().toString(), c));
        const merged = Array.from(map.values());
        localStorage.setItem('taqdeer_saved_certs', JSON.stringify(merged));
        restoredCertsCount = merged.length;
      } catch (e) {
        console.warn(e);
      }
    }

    // Merge Drafts
    if (serverPackage.drafts && Array.isArray(serverPackage.drafts)) {
      try {
        const localDrafts = getSavedDrafts();
        const map = new Map<string, DraftCertificateItem>();
        localDrafts.forEach(d => map.set(d.id, d));
        serverPackage.drafts.forEach(d => map.set(d.id, d));
        const mergedDrafts = Array.from(map.values());
        localStorage.setItem('taqdeer_saved_drafts_and_templates', JSON.stringify(mergedDrafts));
        restoredDraftsCount = mergedDrafts.length;
      } catch (e) {
        console.warn(e);
      }
    }

    // Merge Batches
    if (serverPackage.batches && Array.isArray(serverPackage.batches)) {
      try {
        const localRaw = localStorage.getItem('taqdeer_batch_history_v1');
        const localBatches: BatchRecord[] = localRaw ? JSON.parse(localRaw) : [];
        const map = new Map<string, BatchRecord>();
        localBatches.forEach(b => map.set(b.id, b));
        serverPackage.batches.forEach(b => map.set(b.id, b));
        const mergedBatches = Array.from(map.values());
        localStorage.setItem('taqdeer_batch_history_v1', JSON.stringify(mergedBatches));
        restoredBatchesCount = mergedBatches.length;
      } catch (e) {
        console.warn(e);
      }
    }

    // Merge Student Groups
    if (serverPackage.studentGroups && Array.isArray(serverPackage.studentGroups)) {
      try {
        localStorage.setItem('taqdeer_student_groups_v1', JSON.stringify(serverPackage.studentGroups));
        window.dispatchEvent(new CustomEvent('taqdeer_student_groups_changed', { detail: serverPackage.studentGroups }));
      } catch (e) {
        console.warn(e);
      }
    }

    // Merge Custom Templates
    if (serverPackage.customTemplates && Array.isArray(serverPackage.customTemplates)) {
      try {
        localStorage.setItem('taqdeer_custom_user_templates_v1', JSON.stringify(serverPackage.customTemplates));
        window.dispatchEvent(new CustomEvent('taqdeer_custom_templates_changed', { detail: serverPackage.customTemplates }));
      } catch (e) {
        console.warn(e);
      }
    }

    // Merge Signature Presets
    if (serverPackage.signaturePresets && Array.isArray(serverPackage.signaturePresets)) {
      try {
        localStorage.setItem('taqdeer_saved_signature_presets', JSON.stringify(serverPackage.signaturePresets));
      } catch (e) {
        console.warn(e);
      }
    }

    // Merge Archive Metadata
    if (serverPackage.archiveMetadata && Array.isArray(serverPackage.archiveMetadata)) {
      try {
        localStorage.setItem('taqdeer_archive_metadata_v1', JSON.stringify(serverPackage.archiveMetadata));
        window.dispatchEvent(new CustomEvent('taqdeer_archive_changed'));
      } catch (e) {
        console.warn(e);
      }
    }

    return {
      certsCount: restoredCertsCount,
      draftsCount: restoredDraftsCount,
      batchesCount: restoredBatchesCount
    };
  }

  // 2. Firestore fallback if Server Sync was empty
  await loadUserSettingsFromCloud(userId, userEmail);
  const cloudCerts = await loadUserCertificatesFromFirestore(userId);
  if (cloudCerts.length > 0) {
    try {
      const localRaw = localStorage.getItem('taqdeer_saved_certs');
      const localCerts: CertificateData[] = localRaw ? JSON.parse(localRaw) : [];
      const map = new Map<string, CertificateData>();
      localCerts.forEach(c => map.set(c.id || c.verificationCode || Math.random().toString(), c));
      cloudCerts.forEach(c => map.set(c.id || c.verificationCode || Math.random().toString(), c));
      const merged = Array.from(map.values());
      localStorage.setItem('taqdeer_saved_certs', JSON.stringify(merged));
      restoredCertsCount = merged.length;
    } catch (e) {
      console.warn('Failed to merge cloud certs:', e);
    }
  }

  try {
    const dataBundleDocRef = doc(db, 'user_data_bundles', userId);
    const snap = await withTimeout(getDoc(dataBundleDocRef), 3000, null);
    if (snap && snap.exists()) {
      const bundle = snap.data();
      if (bundle.drafts && Array.isArray(bundle.drafts)) {
        localStorage.setItem('taqdeer_saved_drafts_and_templates', JSON.stringify(bundle.drafts));
        restoredDraftsCount = bundle.drafts.length;
      }
      if (bundle.batches && Array.isArray(bundle.batches)) {
        localStorage.setItem('taqdeer_batch_history_v1', JSON.stringify(bundle.batches));
        restoredBatchesCount = bundle.batches.length;
      }
      if (bundle.customTemplates && Array.isArray(bundle.customTemplates)) {
        localStorage.setItem('taqdeer_custom_user_templates_v1', JSON.stringify(bundle.customTemplates));
        window.dispatchEvent(new CustomEvent('taqdeer_custom_templates_changed', { detail: bundle.customTemplates }));
      }
      if (bundle.studentGroups && Array.isArray(bundle.studentGroups)) {
        localStorage.setItem('taqdeer_student_groups_v1', JSON.stringify(bundle.studentGroups));
        window.dispatchEvent(new CustomEvent('taqdeer_student_groups_changed', { detail: bundle.studentGroups }));
      }
      if (bundle.signaturePresets && Array.isArray(bundle.signaturePresets)) {
        localStorage.setItem('taqdeer_saved_signature_presets', JSON.stringify(bundle.signaturePresets));
      }
      if (bundle.autosaveCert) {
        localStorage.setItem('taqdeer_autosave_certificate', JSON.stringify(bundle.autosaveCert));
      }
      if (bundle.defaultMargins) {
        localStorage.setItem('taqdeer_default_margins', JSON.stringify(bundle.defaultMargins));
      }
      if (bundle.systemConfig) {
        localStorage.setItem('taqdeer_system_config_v2', JSON.stringify(bundle.systemConfig));
        window.dispatchEvent(new CustomEvent('taqdeer_system_config_changed', { detail: bundle.systemConfig }));
      }
      if (bundle.defaultSettings) {
        localStorage.setItem('taqdeer_default_settings', JSON.stringify(bundle.defaultSettings));
        window.dispatchEvent(new CustomEvent('taqdeer_default_settings_changed', { detail: bundle.defaultSettings }));
      }
    }
  } catch (e) {
    console.warn('Failed to restore data bundle:', e);
  }

  return {
    certsCount: restoredCertsCount,
    draftsCount: restoredDraftsCount,
    batchesCount: restoredBatchesCount
  };
}
