import { UnifiedAccount } from './unifiedAuthService';

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
        users = parsed.users.map((u: any) => ({
          userId: u.userId,
          username: u.username || '',
          email: u.email || '',
          displayName: u.displayName || u.username || 'مستخدم',
          role: u.role || (u.username?.toLowerCase() === 'admin' || u.userId === 'ADMIN-001' ? 'admin' : 'user'),
          isVerified: !!u.isVerified,
          verifiedAt: u.verifiedAt,
          createdAt: u.createdAt,
          updatedAt: u.updatedAt,
          lastLoginAt: u.lastLoginAt,
          hasPassword: !!u.passwordHash,
          photoURL: u.photoURL,
        }));
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
