import { CertificateData } from '../types';

export interface SystemLockedElements {
  schoolName: boolean;
  headerLines: boolean;
  logo: boolean;
  signatures: boolean;
  stamp: boolean;
  badge: boolean;
  frame: boolean;
  watermark: boolean;
  verificationBox: boolean;
  colors: boolean;
  poemOrQuote: boolean;
  aspectRatio: boolean;
  title: boolean;
}

export interface SystemFeatureToggles {
  enableAutoArchive: boolean;
  enableAutoGenderInflection: boolean;
  enableAiFeatures: boolean;
  enableQrVerification: boolean;
  enableWatermark: boolean;
  enableBatchReviewModal: boolean;
  enableCrispVectorPdf: boolean;
  enableSoundEffects: boolean;
  enableAutoSaveDrafts: boolean;
  enablePrintCropMarks: boolean;
  enableStrictQrSecurity: boolean;
  enableCloudAutoSync: boolean;
  enableSpellcheck: boolean; // التدقيق اللغوي والإملائي
  enablePraiseBank: boolean; // بنك صياغات التقدير والثناء
  [key: string]: boolean;
}

export interface PlatformDriveSettings {
  enabled: boolean;
  isDefaultForAllUsers: boolean;
  accountEmail: string;
  accountDisplayName: string;
  folderName: string;
  folderId?: string;
  accessToken?: string;
  refreshToken?: string;
  clientId?: string;
  clientSecret?: string;
  autoPublicPermission: boolean;
  targetBarcodeType: 'drive' | 'portal';
  fallbackToLocalArchive?: boolean;
  lastSyncAt?: string;
  lastTestStatus?: 'success' | 'error' | 'none';
  lastTestMessage?: string;
}

export interface SystemSettingsConfig {
  version: string;
  updatedAt: string;
  barcodeLinkTarget: 'portal' | 'drive'; // 'portal': بوابة التحقق المعتمدة على النظام, 'drive': ملف الشهادة على Google Drive مباشرة
  features: SystemFeatureToggles;
  lockedElements: SystemLockedElements;
  platformDrive?: PlatformDriveSettings;
}

export const DEFAULT_PLATFORM_DRIVE_CONFIG: PlatformDriveSettings = {
  enabled: true,
  isDefaultForAllUsers: true,
  accountEmail: 'eslam.kandeel2@gmail.com',
  accountDisplayName: 'حساب المنظومة المعتمد (Google Drive)',
  folderName: 'منصة تقدير - شهادات التقدير والتوثيق',
  folderId: '',
  accessToken: '',
  refreshToken: '',
  clientId: '',
  clientSecret: '',
  autoPublicPermission: true,
  targetBarcodeType: 'portal',
  fallbackToLocalArchive: true,
  lastSyncAt: new Date().toISOString(),
  lastTestStatus: 'none',
};

export const DEFAULT_SYSTEM_CONFIG: SystemSettingsConfig = {
  version: '2026.2',
  updatedAt: new Date().toISOString(),
  barcodeLinkTarget: 'portal',
  platformDrive: DEFAULT_PLATFORM_DRIVE_CONFIG,
  features: {
    enableAutoArchive: true,
    enableAutoGenderInflection: true,
    enableAiFeatures: true,
    enableQrVerification: true,
    enableWatermark: true,
    enableBatchReviewModal: true,
    enableCrispVectorPdf: true,
    enableSoundEffects: true,
    enableAutoSaveDrafts: true,
    enablePrintCropMarks: false,
    enableStrictQrSecurity: true,
    enableCloudAutoSync: true,
    enableSpellcheck: true,
    enablePraiseBank: true,
  },
  lockedElements: {
    schoolName: false,
    headerLines: false,
    logo: false,
    signatures: false,
    stamp: false,
    badge: false,
    frame: false,
    watermark: false,
    verificationBox: false,
    colors: false,
    poemOrQuote: false,
    aspectRatio: false,
    title: false,
  }
};

const SYSTEM_CONFIG_STORAGE_KEY = 'taqdeer_system_config_v2';

/**
 * Loads system configuration from localStorage
 */
export function getSavedSystemConfig(): SystemSettingsConfig {
  try {
    const saved = localStorage.getItem(SYSTEM_CONFIG_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...DEFAULT_SYSTEM_CONFIG,
        ...parsed,
        barcodeLinkTarget: parsed.barcodeLinkTarget || DEFAULT_SYSTEM_CONFIG.barcodeLinkTarget,
        features: {
          ...DEFAULT_SYSTEM_CONFIG.features,
          ...(parsed.features || {})
        },
        lockedElements: {
          ...DEFAULT_SYSTEM_CONFIG.lockedElements,
          ...(parsed.lockedElements || {})
        },
        platformDrive: {
          ...DEFAULT_PLATFORM_DRIVE_CONFIG,
          ...(parsed.platformDrive || {})
        }
      };
    }
  } catch (e) {
    console.warn('Failed to load system config from storage:', e);
  }
  return DEFAULT_SYSTEM_CONFIG;
}

/**
 * Gets the current platform Google Drive configuration
 */
export function getPlatformDriveSettings(): PlatformDriveSettings {
  const config = getSavedSystemConfig();
  return config.platformDrive || DEFAULT_PLATFORM_DRIVE_CONFIG;
}

/**
 * Updates and saves platform Google Drive settings
 */
export function savePlatformDriveSettings(settings: Partial<PlatformDriveSettings>): SystemSettingsConfig {
  const current = getSavedSystemConfig();
  const updated: SystemSettingsConfig = {
    ...current,
    platformDrive: {
      ...(current.platformDrive || DEFAULT_PLATFORM_DRIVE_CONFIG),
      ...settings,
      lastSyncAt: new Date().toISOString()
    }
  };
  saveSystemConfig(updated);
  return updated;
}

/**
 * Saves system configuration to storage and dispatches global event
 */
export function saveSystemConfig(config: SystemSettingsConfig): void {
  try {
    const updated = {
      ...config,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(SYSTEM_CONFIG_STORAGE_KEY, JSON.stringify(updated));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('taqdeer_system_config_changed', { detail: updated }));
    }
  } catch (e) {
    console.error('Failed to save system config:', e);
  }
}

/**
 * Toggles a single feature flag (normalizes keys like 'spellcheck' and 'enableSpellcheck')
 */
export function toggleSystemFeature(rawKey: string, value?: boolean): SystemSettingsConfig {
  const current = getSavedSystemConfig();
  
  // Normalize key to 'enableX' if passed without 'enable'
  let normalizedKey = rawKey;
  if (!normalizedKey.startsWith('enable')) {
    normalizedKey = `enable${rawKey.charAt(0).toUpperCase()}${rawKey.slice(1)}`;
  }

  const currentVal = isFeatureEnabled(current, normalizedKey);
  const newValue = value !== undefined ? value : !currentVal;

  const updated: SystemSettingsConfig = {
    ...current,
    features: {
      ...current.features,
      [normalizedKey]: newValue,
      [rawKey]: newValue
    }
  };
  saveSystemConfig(updated);
  return updated;
}

/**
 * Updates barcode link destination setting
 */
export function setBarcodeLinkTarget(target: 'portal' | 'drive'): SystemSettingsConfig {
  const current = getSavedSystemConfig();
  const updated: SystemSettingsConfig = {
    ...current,
    barcodeLinkTarget: target
  };
  saveSystemConfig(updated);
  return updated;
}

/**
 * Gets the resolved barcode / QR code URL for a certificate based on system settings and certificate state
 */
export function getCertificateBarcodeUrl(
  certOrCode: CertificateData | string,
  driveLinkOrTarget?: string | null | 'portal' | 'drive',
  overrideTarget?: 'portal' | 'drive'
): string {
  const config = getSavedSystemConfig();
  
  if (typeof certOrCode === 'object' && certOrCode !== null) {
    const cert = certOrCode as CertificateData;
    const target = (typeof driveLinkOrTarget === 'string' && (driveLinkOrTarget === 'portal' || driveLinkOrTarget === 'drive')
      ? driveLinkOrTarget
      : overrideTarget || cert.barcodeLinkTarget || config.barcodeLinkTarget || 'portal');
    const code = cert.verificationCode || cert.id || 'TAQDEER';
    if (target === 'drive' && (cert.driveFileWebViewLink || cert.driveFileUrl)) {
      return cert.driveFileWebViewLink || cert.driveFileUrl!;
    }
    const origin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'https://taqdeer.app';
    return `${origin}/verify?code=${encodeURIComponent(code)}`;
  } else {
    const code = typeof certOrCode === 'string' && certOrCode ? certOrCode : 'TAQDEER';
    const driveLink = typeof driveLinkOrTarget === 'string' && (driveLinkOrTarget.startsWith('http') || driveLinkOrTarget.startsWith('//'))
      ? driveLinkOrTarget
      : null;
    const target = overrideTarget || (driveLinkOrTarget === 'portal' || driveLinkOrTarget === 'drive' ? driveLinkOrTarget : config.barcodeLinkTarget || 'portal');
    if (target === 'drive' && driveLink) {
      return driveLink;
    }
    const origin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'https://taqdeer.app';
    return `${origin}/verify?code=${encodeURIComponent(code)}`;
  }
}

/**
 * Toggles a single locked element
 */
export function toggleSystemLockedElement(key: keyof SystemLockedElements, value?: boolean): SystemSettingsConfig {
  const current = getSavedSystemConfig();
  const newValue = value !== undefined ? value : !current.lockedElements[key];
  const updated: SystemSettingsConfig = {
    ...current,
    lockedElements: {
      ...current.lockedElements,
      [key]: newValue
    }
  };
  saveSystemConfig(updated);
  return updated;
}

/**
 * Resets system configuration to defaults
 */
export function resetSystemConfig(): SystemSettingsConfig {
  saveSystemConfig(DEFAULT_SYSTEM_CONFIG);
  return DEFAULT_SYSTEM_CONFIG;
}

/**
 * Checks if a specific element is locked (supports either (key, config) or (config, key))
 */
export function isElementLocked(
  arg1: keyof SystemLockedElements | SystemSettingsConfig,
  arg2?: keyof SystemLockedElements | SystemSettingsConfig
): boolean {
  if (typeof arg1 === 'string') {
    const config = (typeof arg2 === 'object' && arg2 ? arg2 : getSavedSystemConfig()) as SystemSettingsConfig;
    return !!config?.lockedElements?.[arg1 as keyof SystemLockedElements];
  } else if (typeof arg1 === 'object' && arg1 && typeof arg2 === 'string') {
    return !!arg1?.lockedElements?.[arg2 as keyof SystemLockedElements];
  }
  return false;
}

/**
 * Checks if a specific feature is enabled (supports either (key, config) or (config, key))
 * Normalizes keys with or without 'enable' prefix.
 */
export function isFeatureEnabled(
  arg1: string | SystemSettingsConfig,
  arg2?: string | SystemSettingsConfig
): boolean {
  let key: string;
  let config: SystemSettingsConfig;

  if (typeof arg1 === 'string') {
    key = arg1;
    config = (typeof arg2 === 'object' && arg2 ? arg2 : getSavedSystemConfig()) as SystemSettingsConfig;
  } else if (typeof arg1 === 'object' && arg1 && typeof arg2 === 'string') {
    config = arg1;
    key = arg2;
  } else {
    return true;
  }

  const features = config?.features as any;
  if (!features) return true;

  // Direct match
  if (key in features && features[key] !== undefined) {
    return Boolean(features[key]);
  }

  // Normalized with 'enable'
  const withEnable = key.startsWith('enable') ? key : `enable${key.charAt(0).toUpperCase()}${key.slice(1)}`;
  if (withEnable in features && features[withEnable] !== undefined) {
    return Boolean(features[withEnable]);
  }

  // Normalized without 'enable'
  const withoutEnable = key.startsWith('enable') ? key.slice(6, 7).toLowerCase() + key.slice(7) : key;
  if (withoutEnable in features && features[withoutEnable] !== undefined) {
    return Boolean(features[withoutEnable]);
  }

  return true;
}
