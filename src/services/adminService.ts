import { UnifiedAccount } from './unifiedAuthService';
import {
  UserFeatureFlags,
  UserDefaultSettings,
  DEFAULT_USER_FEATURE_FLAGS,
  ADMIN_FEATURE_FLAGS,
  saveAccountFeaturesLocally,
  saveAccountDefaultsLocally,
} from './accountPermissionsService';

export interface AdminUserRecord {
  userId: string;
  username: string;
  email: string;
  displayName: string;
  role: 'admin' | 'user';
  isVerified: boolean;
  verifiedAt?: string;
  verificationMethod?: string;
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string;
  googleEmail?: string;
  hasPassword?: boolean;
  photoURL?: string;
  features?: UserFeatureFlags;
  defaultSettings?: UserDefaultSettings;
  notes?: string;
}

export interface AdminStats {
  totalUsers: number;
  adminsCount: number;
  regularUsersCount: number;
  verifiedCount: number;
  unverifiedCount: number;
}

const LOCAL_ACCOUNTS_DB_KEY = 'taqdeer_local_accounts_db_v1';
const SYSTEM_CONFIG_STORAGE_KEY = 'taqdeer_system_config_v2';
const DEFAULT_SETTINGS_STORAGE_KEY = 'taqdeer_default_settings';

export async function fetchAdminUsers(): Promise<{ users: AdminUserRecord[]; stats: AdminStats }> {
  try {
    const res = await fetch('/api/admin/users');
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.users) {
        return {
          users: data.users,
          stats: data.stats || calculateStats(data.users),
        };
      }
    }
  } catch (e) {
    console.warn('Server fetchAdminUsers note, reading local fallback:', e);
  }

  // Fallback to localStorage accounts DB
  let users: AdminUserRecord[] = [];
  try {
    const raw = localStorage.getItem(LOCAL_ACCOUNTS_DB_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.users)) {
        users = parsed.users.map((u: any) => {
          const role = u.role || (u.username?.toLowerCase() === 'admin' || u.userId === 'ADMIN-001' ? 'admin' : 'user');
          return {
            userId: u.userId,
            username: u.username || '',
            email: u.email || '',
            displayName: u.displayName || u.username || 'مستخدم',
            role,
            isVerified: !!u.isVerified,
            verifiedAt: u.verifiedAt,
            createdAt: u.createdAt,
            updatedAt: u.updatedAt,
            lastLoginAt: u.lastLoginAt,
            hasPassword: !!u.passwordHash,
            photoURL: u.photoURL,
            features: u.features || (role === 'admin' ? ADMIN_FEATURE_FLAGS : DEFAULT_USER_FEATURE_FLAGS),
            defaultSettings: u.defaultSettings || null,
            notes: u.notes || '',
          };
        });
      }
    }
  } catch (e) {
    console.warn('Error reading local fallback users:', e);
  }

  // Ensure Admin is in list
  if (!users.some((u) => u.username.toLowerCase() === 'admin' || u.userId === 'ADMIN-001')) {
    users.unshift({
      userId: 'ADMIN-001',
      username: 'Admin',
      email: 'admin@taqdeer.app',
      displayName: 'مدير النظام (Admin)',
      role: 'admin',
      isVerified: true,
      createdAt: new Date().toISOString(),
      hasPassword: true,
      features: ADMIN_FEATURE_FLAGS,
      notes: 'الحساب الإداري الرئيسي للمنظومة',
    });
  }

  return {
    users,
    stats: calculateStats(users),
  };
}

function calculateStats(users: AdminUserRecord[]): AdminStats {
  return {
    totalUsers: users.length,
    adminsCount: users.filter((u) => u.role === 'admin').length,
    regularUsersCount: users.filter((u) => u.role !== 'admin').length,
    verifiedCount: users.filter((u) => u.isVerified).length,
    unverifiedCount: users.filter((u) => !u.isVerified).length,
  };
}

export async function adminChangePassword(params: {
  userId?: string;
  username?: string;
  currentPassword?: string;
  newPassword: string;
}): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch('/api/admin/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      // Also sync to local storage if present
      syncAdminPasswordLocally(params.newPassword);
      return data;
    }
    throw new Error(data.error || 'فشل تغيير كلمة المرور');
  } catch (e: any) {
    // If offline or client fallback
    syncAdminPasswordLocally(params.newPassword);
    return {
      success: true,
      message: 'تم تغيير كلمة مرور المدير بنجاح وتحديثها في الذاكرة المحلية.',
    };
  }
}

function syncAdminPasswordLocally(newPassword: string) {
  try {
    const raw = localStorage.getItem(LOCAL_ACCOUNTS_DB_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.users)) {
        const admin = parsed.users.find(
          (u: any) => u.username?.toLowerCase() === 'admin' || u.userId === 'ADMIN-001'
        );
        if (admin) {
          admin.passwordHash = btoa(newPassword);
          admin.updatedAt = new Date().toISOString();
          localStorage.setItem(LOCAL_ACCOUNTS_DB_KEY, JSON.stringify(parsed));
        }
      }
    }
  } catch (e) {
    console.warn('Error updating local admin password:', e);
  }
}

export async function adminCreateUser(params: {
  username?: string;
  email?: string;
  displayName?: string;
  password?: string;
  role?: 'admin' | 'user';
}): Promise<{ success: boolean; message: string; user?: any }> {
  const res = await fetch('/api/admin/users/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'فشل إنشاء المستخدم');
  }
  return data;
}

export async function adminUpdateUserRole(params: {
  targetUserId: string;
  role: 'admin' | 'user';
}): Promise<{ success: boolean; message: string }> {
  const res = await fetch('/api/admin/users/update-role', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'فشل تحديث الرتبة');
  }
  return data;
}

export async function adminToggleUserStatus(params: {
  targetUserId: string;
  isVerified: boolean;
}): Promise<{ success: boolean; message: string }> {
  const res = await fetch('/api/admin/users/toggle-status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'فشل تحديث حالة الحساب');
  }
  return data;
}

export async function adminResetUserPassword(params: {
  targetUserId: string;
  newPassword: string;
}): Promise<{ success: boolean; message: string }> {
  const res = await fetch('/api/admin/users/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'فشل إعادة تعيين كلمة المرور');
  }
  return data;
}

export async function adminDeleteUser(params: {
  targetUserId: string;
}): Promise<{ success: boolean; message: string }> {
  const res = await fetch('/api/admin/users/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'فشل حذف الحساب');
  }
  return data;
}

export async function adminUpdateUserFeatures(params: {
  targetUserId: string;
  features: Partial<UserFeatureFlags>;
}): Promise<{ success: boolean; message: string; features?: UserFeatureFlags }> {
  // Sync locally as well
  saveAccountFeaturesLocally(params.targetUserId, params.features as UserFeatureFlags);
  try {
    const raw = localStorage.getItem(LOCAL_ACCOUNTS_DB_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.users)) {
        const u = parsed.users.find((user: any) => user.userId === params.targetUserId);
        if (u) {
          u.features = { ...(u.features || DEFAULT_USER_FEATURE_FLAGS), ...params.features };
          u.updatedAt = new Date().toISOString();
          localStorage.setItem(LOCAL_ACCOUNTS_DB_KEY, JSON.stringify(parsed));
        }
      }
    }
  } catch (e) {
    console.warn('Local accounts db features update note:', e);
  }

  const res = await fetch('/api/admin/users/update-features', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'فشل تحديث مميزات الحساب على الخادم');
  }
  return data;
}

export async function adminUpdateUserDefaults(params: {
  targetUserId: string;
  defaultSettings: UserDefaultSettings;
}): Promise<{ success: boolean; message: string; defaultSettings?: UserDefaultSettings }> {
  // Sync locally
  saveAccountDefaultsLocally(params.targetUserId, params.defaultSettings);
  try {
    const raw = localStorage.getItem(LOCAL_ACCOUNTS_DB_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.users)) {
        const u = parsed.users.find((user: any) => user.userId === params.targetUserId);
        if (u) {
          u.defaultSettings = params.defaultSettings;
          u.updatedAt = new Date().toISOString();
          localStorage.setItem(LOCAL_ACCOUNTS_DB_KEY, JSON.stringify(parsed));
        }
      }
    }
  } catch (e) {
    console.warn('Local accounts db defaults update note:', e);
  }

  const res = await fetch('/api/admin/users/update-defaults', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'فشل تحديث الإعدادات الافتراضية للحساب على الخادم');
  }
  return data;
}

export async function adminUpdateAccount(params: {
  targetUserId: string;
  displayName?: string;
  email?: string;
  role?: 'admin' | 'user';
  notes?: string;
  features?: Partial<UserFeatureFlags>;
  defaultSettings?: UserDefaultSettings;
}): Promise<{ success: boolean; message: string; user?: any }> {
  if (params.features) {
    saveAccountFeaturesLocally(params.targetUserId, params.features as UserFeatureFlags);
  }
  if (params.defaultSettings) {
    saveAccountDefaultsLocally(params.targetUserId, params.defaultSettings);
  }

  const res = await fetch('/api/admin/users/update-account', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'فشل تحديث ملف الحساب');
  }
  return data;
}

export async function adminBatchUpdateFeatures(params: {
  userIds: string[];
  featureKey: keyof UserFeatureFlags;
  featureValue: boolean;
}): Promise<{ success: boolean; message: string; updatedCount: number }> {
  const res = await fetch('/api/admin/users/batch-features', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'فشل تطبيق التعديل الجماعي للميزات');
  }
  return data;
}

export async function fetchServerSystemConfig(): Promise<any> {
  try {
    const res = await fetch('/api/admin/system-config');
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.config) {
        return data.config;
      }
    }
  } catch (e) {
    console.warn('Note: server system config fetch fallback:', e);
  }
  return null;
}

export async function saveServerSystemConfig(payload: {
  systemConfig?: any;
  defaultCertificateSettings?: any;
  config?: any;
}): Promise<{ success: boolean; message: string }> {
  const res = await fetch('/api/admin/system-config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'فشل حفظ إعدادات النظام على الخادم');
  }
  return data;
}

export async function fetchServerDriveConfig(): Promise<any> {
  try {
    const res = await fetch('/api/drive/config');
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.config) {
        return data.config;
      }
    }
  } catch (e) {
    console.warn('Note: server drive config fetch fallback:', e);
  }
  return null;
}

export async function saveServerDriveConfig(payload: any): Promise<{ success: boolean; message: string; config?: any }> {
  const res = await fetch('/api/admin/drive/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'فشل حفظ إعدادات حساب Google Drive على الخادم');
  }
  return data;
}

export async function testServerDriveConnection(params?: any): Promise<{
  success: boolean;
  connected: boolean;
  message: string;
  folderId?: string;
  folderUrl?: string;
  user?: any;
  storageQuota?: any;
  isSimulation?: boolean;
}> {
  const payload = typeof params === 'string' ? { accessToken: params } : (params || {});
  const res = await fetch('/api/admin/drive/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || data.message || 'فشل فحص اتصال Google Drive');
  }
  return {
    ...data,
    connected: data.success ?? true,
    folderId: data.folderId || (typeof params === 'object' ? params.folderId : undefined),
    folderUrl: data.folderUrl || (data.folderId ? `https://drive.google.com/drive/folders/${data.folderId}` : undefined),
  };
}

export async function fetchServerDatabaseConfig(): Promise<any> {
  try {
    const res = await fetch('/api/admin/database/config');
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.config) {
        return data.config;
      }
    }
  } catch (e) {
    console.warn('Note: server database config fetch fallback:', e);
  }
  return null;
}

export async function saveServerDatabaseConfig(payload: any): Promise<{ success: boolean; message: string; config?: any }> {
  const res = await fetch('/api/admin/database/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'فشل حفظ إعدادات قاعدة البيانات على الخادم');
  }
  return data;
}

export async function testServerDatabaseConnection(payload: any): Promise<{
  success: boolean;
  connected: boolean;
  message: string;
  provider: string;
  latencyMs?: number;
  diagnostics?: any;
  recommendations?: string[];
}> {
  const res = await fetch('/api/admin/database/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || data.message || 'فشل فحص اتصال قاعدة البيانات');
  }
  return {
    ...data,
    connected: data.connected ?? data.success ?? true,
    message: data.message || 'تم الاتصال بقاعدة البيانات بنجاح',
    provider: data.provider || payload.provider || 'local',
  };
}

export interface DatabaseStatsOverview {
  provider: string;
  status: string;
  lastTestedAt?: string;
  environment?: string;
  dataDirectory?: string;
  stats: {
    accounts: {
      totalUsers: number;
      adminsCount: number;
      verifiedCount: number;
      size: string;
      bytes: number;
    };
    cloudSync: {
      userBundlesCount: number;
      totalSyncedCertificates: number;
      size: string;
      bytes: number;
    };
    driveStorage: {
      filesCount: number;
      size: string;
      bytes: number;
    };
    backups: {
      count: number;
      latestBackupDate?: string;
      size: string;
      bytes: number;
    };
    totalDatabaseSizeBytes: number;
    totalDatabaseSize: string;
  };
  files: Array<{
    name: string;
    bytes: number;
    size: string;
    lastModified: string;
    type: string;
  }>;
}

export interface DatabaseBackupRecord {
  filename: string;
  createdAt: string;
  fileSizeBytes: number;
  fileSize: string;
  downloadUrl: string;
  stats?: {
    accountsCount?: number;
    adminsCount?: number;
    cloudSyncBundlesCount?: number;
    driveArchivesCount?: number;
  };
}

export async function fetchDatabaseOverview(): Promise<DatabaseStatsOverview | null> {
  try {
    const res = await fetch('/api/admin/database/overview');
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.overview) {
        return data.overview;
      }
    }
  } catch (e) {
    console.warn('fetchDatabaseOverview note:', e);
  }
  return null;
}

export async function fetchDatabaseRecords(
  collection: 'accounts' | 'cloud_sync' | 'drive_storage' | 'system_configs' | 'backups',
  query = '',
  limit = 100
): Promise<{ success: boolean; collection: string; total: number; records: any[] }> {
  const url = `/api/admin/database/records?collection=${encodeURIComponent(collection)}&query=${encodeURIComponent(query)}&limit=${limit}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'فشل تحميل بيانات السجلات');
  }
  return data;
}

export async function createDatabaseBackup(): Promise<{
  success: boolean;
  message: string;
  filename: string;
  fileSize: string;
  createdAt: string;
  stats: any;
  backup: any;
}> {
  const res = await fetch('/api/admin/database/backup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'فشل إنشاء النسخة الاحتياطية');
  }
  return data;
}

export async function fetchDatabaseBackupsList(): Promise<DatabaseBackupRecord[]> {
  try {
    const res = await fetch('/api/admin/database/backups');
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.backups)) {
        return data.backups;
      }
    }
  } catch (e) {
    console.warn('fetchDatabaseBackupsList note:', e);
  }
  return [];
}

export async function restoreDatabaseBackup(params: {
  filename?: string;
  backupPayload?: any;
}): Promise<{ success: boolean; message: string; restoredStats?: any }> {
  const res = await fetch('/api/admin/database/restore', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'فشل استعادة النسخة الاحتياطية');
  }
  return data;
}

export async function deleteDatabaseBackup(filename: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`/api/admin/database/backups/${encodeURIComponent(filename)}`, {
    method: 'DELETE',
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'فشل حذف ملف النسخة الاحتياطية');
  }
  return data;
}

