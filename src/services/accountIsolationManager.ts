import { CertificateData, BatchRecord, StudentGroup } from '../types';
import { DraftCertificateItem, getSavedDrafts } from '../utils/draftsManager';
import { SystemSettingsConfig, getSavedSystemConfig, DEFAULT_SYSTEM_CONFIG } from '../utils/systemConfig';
import { DefaultCertificateSettings, getSavedDefaultSettings, FALLBACK_DEFAULT_SETTINGS } from '../utils/defaultSettings';
import { AISettings, getSavedAISettings, DEFAULT_AI_SETTINGS } from '../utils/aiConfig';
import { CustomTemplateItem, getSavedCustomTemplates } from '../utils/templateCustomizer';
import { getSavedBatches } from '../utils/batchManager';
import { getSavedStudentGroups } from '../utils/studentGroupsManager';
import { getAutoArchiveConfig, AutoArchiveConfig, DEFAULT_AUTO_ARCHIVE_CONFIG } from '../utils/archiveManager';
import { syncFullAccountToCloud, restoreAccountFromCloud, FullAccountSyncPackage } from './cloudDatabaseService';

export interface UserLike {
  uid: string;
  userId?: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  googleEmail?: string | null;
  isVerified?: boolean;
  username?: string;
}

export const WORKSPACE_STORAGE_KEYS = {
  CERTS: 'taqdeer_saved_certs',
  BATCHES: 'taqdeer_batch_history_v1',
  DRAFTS: 'taqdeer_saved_drafts_and_templates',
  GROUPS: 'taqdeer_student_groups_v1',
  SYSTEM_CONFIG: 'taqdeer_system_config_v2',
  DEFAULT_SETTINGS: 'taqdeer_default_settings',
  DEFAULT_MARGINS: 'taqdeer_default_margins',
  AI_SETTINGS: 'taqdeer_ai_settings_v1',
  CUSTOM_TEMPLATES: 'taqdeer_custom_user_templates_v1',
  SIGNATURE_PRESETS: 'taqdeer_saved_signature_presets',
  ARCHIVE_METADATA: 'taqdeer_archive_metadata_v1',
  AUTO_ARCHIVE_CONFIG: 'taqdeer_auto_archive_config_v1',
  AUTOSAVE_CERT: 'taqdeer_autosave_certificate',
  ACTIVE_ACCOUNT_KEY: 'taqdeer_active_account_key'
} as const;

export interface AccountVaultSnapshot {
  accountKey: string;
  userId?: string;
  userEmail?: string;
  displayName?: string;
  photoURL?: string;
  lastUpdated: string;
  systemConfig: SystemSettingsConfig;
  defaultSettings: DefaultCertificateSettings;
  defaultMargins?: any;
  aiSettings: AISettings;
  autoArchiveConfig: AutoArchiveConfig;
  certificates: CertificateData[];
  batches: BatchRecord[];
  drafts: DraftCertificateItem[];
  studentGroups: StudentGroup[];
  customTemplates: CustomTemplateItem[];
  signaturePresets: any[];
  archiveMetadata: any[];
  autosaveCert?: CertificateData | null;
}

let isSwitchingAccountLock = false;

export function isAccountSwitching(): boolean {
  return isSwitchingAccountLock;
}

/**
 * Calculates a unique, sanitized storage key for any user account (or guest)
 */
export function getAccountKey(user?: UserLike | null): string {
  if (!user) return 'guest';
  const cleanEmail = (user.googleEmail || user.email || '').trim().toLowerCase();
  const rawKey = cleanEmail || user.userId || user.uid || 'anonymous';
  return 'acc_' + rawKey.replace(/[^a-zA-Z0-9_\-@.]/g, '_').toLowerCase();
}

/**
 * Gets the account key of the currently active workspace on this device
 */
export function getActiveAccountKey(): string {
  if (typeof window === 'undefined') return 'guest';
  try {
    return localStorage.getItem(WORKSPACE_STORAGE_KEYS.ACTIVE_ACCOUNT_KEY) || 'guest';
  } catch {
    return 'guest';
  }
}

/**
 * Reads all active workspace keys and creates an isolated snapshot
 */
export function createWorkspaceSnapshot(user?: UserLike | null): AccountVaultSnapshot {
  const accountKey = getAccountKey(user);

  let certs: CertificateData[] = [];
  try {
    const raw = localStorage.getItem(WORKSPACE_STORAGE_KEYS.CERTS);
    if (raw) certs = JSON.parse(raw);
  } catch (e) {
    console.warn(e);
  }

  let sigPresets: any[] = [];
  try {
    const raw = localStorage.getItem(WORKSPACE_STORAGE_KEYS.SIGNATURE_PRESETS);
    if (raw) sigPresets = JSON.parse(raw);
  } catch (e) {
    console.warn(e);
  }

  let autosave: CertificateData | null = null;
  try {
    const raw = localStorage.getItem(WORKSPACE_STORAGE_KEYS.AUTOSAVE_CERT);
    if (raw) autosave = JSON.parse(raw);
  } catch (e) {
    console.warn(e);
  }

  let archiveMeta: any[] = [];
  try {
    const raw = localStorage.getItem(WORKSPACE_STORAGE_KEYS.ARCHIVE_METADATA);
    if (raw) archiveMeta = JSON.parse(raw);
  } catch (e) {
    console.warn(e);
  }

  let defaultMargins: any = null;
  try {
    const raw = localStorage.getItem(WORKSPACE_STORAGE_KEYS.DEFAULT_MARGINS);
    if (raw) defaultMargins = JSON.parse(raw);
  } catch (e) {
    console.warn(e);
  }

  return {
    accountKey,
    userId: user?.uid,
    userEmail: user?.email || undefined,
    displayName: user?.displayName || undefined,
    photoURL: user?.photoURL || undefined,
    lastUpdated: new Date().toISOString(),
    systemConfig: getSavedSystemConfig(),
    defaultSettings: getSavedDefaultSettings(),
    defaultMargins: defaultMargins,
    aiSettings: getSavedAISettings(),
    autoArchiveConfig: getAutoArchiveConfig(),
    certificates: certs,
    batches: getSavedBatches(),
    drafts: getSavedDrafts(),
    studentGroups: getSavedStudentGroups(),
    customTemplates: getSavedCustomTemplates(),
    signaturePresets: sigPresets,
    archiveMetadata: archiveMeta,
    autosaveCert: autosave
  };
}

/**
 * Saves the current workspace state to the user's isolated local vault
 */
export function saveActiveWorkspaceVault(user?: UserLike | null): void {
  if (typeof window === 'undefined' || isSwitchingAccountLock) return;
  try {
    const activeKey = getActiveAccountKey();
    const userSpecificKey = getAccountKey(user);

    // Prevent saving wrong user's data into another account's vault
    if (user && activeKey !== 'guest' && activeKey !== userSpecificKey) {
      console.warn(`[Vault] Skipped saving: activeKey (${activeKey}) mismatch with userKey (${userSpecificKey})`);
      return;
    }

    const targetKey = user ? userSpecificKey : activeKey;
    const snapshot = createWorkspaceSnapshot(user);
    localStorage.setItem(`taqdeer_vault_${targetKey}`, JSON.stringify(snapshot));
  } catch (err) {
    console.warn('Failed to save active workspace vault:', err);
  }
}

/**
 * Applies a snapshot to the active workspace in LocalStorage
 */
export function applyVaultSnapshotToWorkspace(snapshot: AccountVaultSnapshot): void {
  if (typeof window === 'undefined') return;
  try {
    // 1. Settings & Config
    if (snapshot.systemConfig) {
      localStorage.setItem(WORKSPACE_STORAGE_KEYS.SYSTEM_CONFIG, JSON.stringify(snapshot.systemConfig));
    } else {
      localStorage.setItem(WORKSPACE_STORAGE_KEYS.SYSTEM_CONFIG, JSON.stringify(DEFAULT_SYSTEM_CONFIG));
    }

    if (snapshot.defaultSettings) {
      localStorage.setItem(WORKSPACE_STORAGE_KEYS.DEFAULT_SETTINGS, JSON.stringify(snapshot.defaultSettings));
    } else {
      localStorage.setItem(WORKSPACE_STORAGE_KEYS.DEFAULT_SETTINGS, JSON.stringify(FALLBACK_DEFAULT_SETTINGS));
    }

    if (snapshot.defaultMargins) {
      localStorage.setItem(WORKSPACE_STORAGE_KEYS.DEFAULT_MARGINS, JSON.stringify(snapshot.defaultMargins));
    } else {
      localStorage.removeItem(WORKSPACE_STORAGE_KEYS.DEFAULT_MARGINS);
    }

    if (snapshot.aiSettings) {
      localStorage.setItem(WORKSPACE_STORAGE_KEYS.AI_SETTINGS, JSON.stringify(snapshot.aiSettings));
    } else {
      localStorage.setItem(WORKSPACE_STORAGE_KEYS.AI_SETTINGS, JSON.stringify(DEFAULT_AI_SETTINGS));
    }

    if (snapshot.autoArchiveConfig) {
      localStorage.setItem(WORKSPACE_STORAGE_KEYS.AUTO_ARCHIVE_CONFIG, JSON.stringify(snapshot.autoArchiveConfig));
    } else {
      localStorage.setItem(WORKSPACE_STORAGE_KEYS.AUTO_ARCHIVE_CONFIG, JSON.stringify(DEFAULT_AUTO_ARCHIVE_CONFIG));
    }

    // 2. Data Arrays - ALWAYS overwritten with current snapshot (or empty array)
    localStorage.setItem(WORKSPACE_STORAGE_KEYS.CERTS, JSON.stringify(snapshot.certificates || []));
    localStorage.setItem(WORKSPACE_STORAGE_KEYS.BATCHES, JSON.stringify(snapshot.batches || []));
    localStorage.setItem(WORKSPACE_STORAGE_KEYS.DRAFTS, JSON.stringify(snapshot.drafts || []));
    localStorage.setItem(WORKSPACE_STORAGE_KEYS.GROUPS, JSON.stringify(snapshot.studentGroups || []));
    localStorage.setItem(WORKSPACE_STORAGE_KEYS.CUSTOM_TEMPLATES, JSON.stringify(snapshot.customTemplates || []));
    localStorage.setItem(WORKSPACE_STORAGE_KEYS.SIGNATURE_PRESETS, JSON.stringify(snapshot.signaturePresets || []));
    localStorage.setItem(WORKSPACE_STORAGE_KEYS.ARCHIVE_METADATA, JSON.stringify(snapshot.archiveMetadata || []));

    if (snapshot.autosaveCert) {
      localStorage.setItem(WORKSPACE_STORAGE_KEYS.AUTOSAVE_CERT, JSON.stringify(snapshot.autosaveCert));
    } else {
      localStorage.removeItem(WORKSPACE_STORAGE_KEYS.AUTOSAVE_CERT);
    }
  } catch (err) {
    console.warn('Failed to apply vault snapshot:', err);
  }
}

/**
 * Clears active workspace to clean initial defaults (for new users or guests)
 */
export function resetWorkspaceToDefaults(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(WORKSPACE_STORAGE_KEYS.SYSTEM_CONFIG, JSON.stringify(DEFAULT_SYSTEM_CONFIG));
    localStorage.setItem(WORKSPACE_STORAGE_KEYS.DEFAULT_SETTINGS, JSON.stringify(FALLBACK_DEFAULT_SETTINGS));
    localStorage.removeItem(WORKSPACE_STORAGE_KEYS.DEFAULT_MARGINS);
    localStorage.removeItem(WORKSPACE_STORAGE_KEYS.AUTOSAVE_CERT);
    localStorage.setItem(WORKSPACE_STORAGE_KEYS.AI_SETTINGS, JSON.stringify(DEFAULT_AI_SETTINGS));
    localStorage.setItem(WORKSPACE_STORAGE_KEYS.AUTO_ARCHIVE_CONFIG, JSON.stringify(DEFAULT_AUTO_ARCHIVE_CONFIG));

    localStorage.setItem(WORKSPACE_STORAGE_KEYS.CERTS, JSON.stringify([]));
    localStorage.setItem(WORKSPACE_STORAGE_KEYS.BATCHES, JSON.stringify([]));
    localStorage.setItem(WORKSPACE_STORAGE_KEYS.DRAFTS, JSON.stringify([]));
    localStorage.setItem(WORKSPACE_STORAGE_KEYS.GROUPS, JSON.stringify([]));
    localStorage.setItem(WORKSPACE_STORAGE_KEYS.CUSTOM_TEMPLATES, JSON.stringify([]));
    localStorage.setItem(WORKSPACE_STORAGE_KEYS.SIGNATURE_PRESETS, JSON.stringify([]));
    localStorage.setItem(WORKSPACE_STORAGE_KEYS.ARCHIVE_METADATA, JSON.stringify([]));
  } catch (err) {
    console.warn('Failed to reset workspace:', err);
  }
}

/**
 * Dispatches all DOM and custom events to reload UI components live
 */
export function dispatchWorkspaceReloadEvents(user?: UserLike | null): void {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent('taqdeer_account_switched', { detail: { user, accountKey: getAccountKey(user) } }));
    window.dispatchEvent(new CustomEvent('taqdeer_system_config_changed', { detail: getSavedSystemConfig() }));
    window.dispatchEvent(new CustomEvent('taqdeer_default_settings_changed', { detail: getSavedDefaultSettings() }));
    window.dispatchEvent(new CustomEvent('taqdeer_ai_settings_changed', { detail: getSavedAISettings() }));
    window.dispatchEvent(new CustomEvent('taqdeer_student_groups_changed', { detail: getSavedStudentGroups() }));
    window.dispatchEvent(new CustomEvent('taqdeer_drafts_changed', { detail: getSavedDrafts() }));
    window.dispatchEvent(new CustomEvent('taqdeer_custom_templates_changed', { detail: getSavedCustomTemplates() }));
    window.dispatchEvent(new CustomEvent('taqdeer_archive_changed'));
    const autosaveRaw = localStorage.getItem(WORKSPACE_STORAGE_KEYS.AUTOSAVE_CERT);
    if (autosaveRaw) {
      try {
        const cert = JSON.parse(autosaveRaw);
        window.dispatchEvent(new CustomEvent('taqdeer_autosave_cert_updated', { detail: cert }));
      } catch {}
    } else {
      window.dispatchEvent(new CustomEvent('taqdeer_autosave_cert_updated', { detail: null }));
    }
    window.dispatchEvent(new Event('storage'));
  } catch (e) {
    console.warn('Dispatch event note:', e);
  }
}

/**
 * COMPLETE ACCOUNT ISOLATION SWITCHER:
 * 1. Locks workspace from background auto-sync during transition.
 * 2. Takes a full snapshot of the outgoing account and saves to its local vault + cloud.
 * 3. Clears workspace data so no leakage occurs between accounts.
 * 4. Restores the incoming account's isolated local vault (or clean defaults).
 * 5. Pulls isolated cloud data for this account from Firestore/Server.
 * 6. Notifies all UI components in real time and releases lock.
 */
export async function switchAndIsolateAccount(
  newUser: UserLike | null,
  previousUser?: UserLike | null
): Promise<{
  certsCount: number;
  draftsCount: number;
  batchesCount: number;
}> {
  isSwitchingAccountLock = true;
  let result = {
    certsCount: 0,
    draftsCount: 0,
    batchesCount: 0
  };

  try {
    const prevActiveKey = getActiveAccountKey();
    const nextActiveKey = getAccountKey(newUser);

    // 1. Snapshot previous active account's workspace if active
    if (prevActiveKey && prevActiveKey !== nextActiveKey) {
      try {
        const prevSnapshot = createWorkspaceSnapshot(previousUser);
        localStorage.setItem(`taqdeer_vault_${prevActiveKey}`, JSON.stringify(prevSnapshot));

        // Background cloud push for previous user if authenticated
        if (previousUser && (previousUser.uid || previousUser.email || previousUser.userId)) {
          syncFullAccountToCloud(previousUser).catch(err => {
            console.warn('Background sync for previous user notice:', err);
          });
        }
      } catch (e) {
        console.warn('Snapshot error for previous user:', e);
      }
    }

    // 2. Wipe active workspace first to guarantee ZERO data leakage
    resetWorkspaceToDefaults();

    // 3. Load incoming user's local vault if present
    let hasLocalVault = false;
    try {
      const rawVault = localStorage.getItem(`taqdeer_vault_${nextActiveKey}`);
      if (rawVault) {
        const snapshot: AccountVaultSnapshot = JSON.parse(rawVault);
        applyVaultSnapshotToWorkspace(snapshot);
        hasLocalVault = true;
      }
    } catch (e) {
      console.warn('Failed to load local vault:', e);
      resetWorkspaceToDefaults();
    }

    // 4. Set active account marker
    localStorage.setItem(WORKSPACE_STORAGE_KEYS.ACTIVE_ACCOUNT_KEY, nextActiveKey);

    // 5. If new user is logged in, pull their isolated cloud data
    if (newUser && (newUser.uid || newUser.email || newUser.userId)) {
      const uidOrId = newUser.uid || newUser.userId || '';
      try {
        const cloudRes = await restoreAccountFromCloud(uidOrId, newUser.email || '');
        result = cloudRes;

        // Update local vault with the freshly merged cloud state
        const updatedSnapshot = createWorkspaceSnapshot(newUser);
        localStorage.setItem(`taqdeer_vault_${nextActiveKey}`, JSON.stringify(updatedSnapshot));
      } catch (cloudErr) {
        console.warn('Cloud restore on switch notice:', cloudErr);
      }
    }

    // 6. Register in Known Accounts Registry if user is valid
    if (newUser && (newUser.uid || newUser.email || newUser.userId)) {
      registerAccountInRegistry(newUser);
    }

    // 7. Notify all components to re-render with isolated data
    dispatchWorkspaceReloadEvents(newUser);
  } finally {
    // Release switching lock
    setTimeout(() => {
      isSwitchingAccountLock = false;
    }, 300);
  }

  return result;
}

export interface KnownAccountRecord {
  accountKey: string;
  uid: string;
  userId?: string;
  email: string;
  displayName: string;
  photoURL?: string;
  googleEmail?: string;
  isVerified?: boolean;
  lastActive: string;
  certsCount: number;
}

const REGISTRY_STORAGE_KEY = 'taqdeer_saved_accounts_registry_v1';

function deduplicateKnownAccounts(registry: KnownAccountRecord[]): KnownAccountRecord[] {
  const seenEmails = new Set<string>();
  const seenKeys = new Set<string>();
  const clean: KnownAccountRecord[] = [];

  for (const item of registry) {
    const email = (item.googleEmail || item.email || '').trim().toLowerCase();
    const key = item.accountKey;

    if (email && seenEmails.has(email)) continue;
    if (key && seenKeys.has(key)) continue;

    if (email) seenEmails.add(email);
    if (key) seenKeys.add(key);
    clean.push(item);
  }

  return clean;
}

/**
 * Registers an active account in the device registry for quick isolated switching
 */
export function registerAccountInRegistry(user: UserLike): void {
  if (typeof window === 'undefined' || !user) return;
  try {
    const key = getAccountKey(user);
    const registry = getKnownAccounts();
    const cleanEmail = (user.googleEmail || user.email || '').trim().toLowerCase();

    const existingIdx = registry.findIndex(a => {
      const aEmail = (a.googleEmail || a.email || '').trim().toLowerCase();
      if (cleanEmail && aEmail && cleanEmail === aEmail) return true;
      if (a.accountKey === key) return true;
      if (user.uid && a.uid === user.uid) return true;
      if (user.userId && a.userId === user.userId) return true;
      return false;
    });

    let certsCount = 0;
    try {
      const raw = localStorage.getItem(WORKSPACE_STORAGE_KEYS.CERTS);
      if (raw) certsCount = JSON.parse(raw).length;
    } catch {}

    const prevRecord = existingIdx >= 0 ? registry[existingIdx] : undefined;

    const record: KnownAccountRecord = {
      accountKey: key,
      uid: user.uid || prevRecord?.uid || 'usr_' + Date.now(),
      userId: user.userId || prevRecord?.userId || user.uid,
      email: cleanEmail || user.email || prevRecord?.email || '',
      displayName: user.displayName || prevRecord?.displayName || 'مستخدم معتمد',
      photoURL: user.photoURL || prevRecord?.photoURL || undefined,
      googleEmail: user.googleEmail || prevRecord?.googleEmail || cleanEmail || undefined,
      isVerified: user.isVerified ?? prevRecord?.isVerified ?? true,
      lastActive: new Date().toISOString(),
      certsCount: Math.max(certsCount, prevRecord?.certsCount || 0)
    };

    if (existingIdx >= 0) {
      registry[existingIdx] = record;
    } else {
      registry.unshift(record);
    }

    const deduplicated = deduplicateKnownAccounts(registry);
    localStorage.setItem(REGISTRY_STORAGE_KEY, JSON.stringify(deduplicated.slice(0, 10)));
  } catch (err) {
    console.warn('Failed to register account in registry:', err);
  }
}

/**
 * Gets all saved accounts registered on this device
 */
export function getKnownAccounts(): KnownAccountRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(REGISTRY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return deduplicateKnownAccounts(parsed);
      }
    }
  } catch (err) {
    console.warn(err);
  }
  return [];
}

/**
 * Removes an account from this device registry and wipes its local vault
 */
export function removeAccountFromDevice(accountKey: string): void {
  if (typeof window === 'undefined') return;
  try {
    const registry = getKnownAccounts().filter(a => a.accountKey !== accountKey);
    localStorage.setItem(REGISTRY_STORAGE_KEY, JSON.stringify(registry));
    localStorage.removeItem(`taqdeer_vault_${accountKey}`);
  } catch (err) {
    console.warn('Failed to remove account vault:', err);
  }
}

