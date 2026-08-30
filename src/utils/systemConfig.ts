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
}

export interface SystemSettingsConfig {
  version: string;
  updatedAt: string;
  features: SystemFeatureToggles;
  lockedElements: SystemLockedElements;
}

export const DEFAULT_SYSTEM_CONFIG: SystemSettingsConfig = {
  version: '2026.2',
  updatedAt: new Date().toISOString(),
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
        features: {
          ...DEFAULT_SYSTEM_CONFIG.features,
          ...(parsed.features || {})
        },
        lockedElements: {
          ...DEFAULT_SYSTEM_CONFIG.lockedElements,
          ...(parsed.lockedElements || {})
        }
      };
    }
  } catch (e) {
    console.warn('Failed to load system config from storage:', e);
  }
  return DEFAULT_SYSTEM_CONFIG;
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
 * Toggles a single feature flag
 */
export function toggleSystemFeature(key: keyof SystemFeatureToggles, value?: boolean): SystemSettingsConfig {
  const current = getSavedSystemConfig();
  const newValue = value !== undefined ? value : !current.features[key];
  const updated: SystemSettingsConfig = {
    ...current,
    features: {
      ...current.features,
      [key]: newValue
    }
  };
  saveSystemConfig(updated);
  return updated;
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
 */
export function isFeatureEnabled(
  arg1: keyof SystemFeatureToggles | SystemSettingsConfig,
  arg2?: keyof SystemFeatureToggles | SystemSettingsConfig
): boolean {
  if (typeof arg1 === 'string') {
    const config = (typeof arg2 === 'object' && arg2 ? arg2 : getSavedSystemConfig()) as SystemSettingsConfig;
    return !!config?.features?.[arg1 as keyof SystemFeatureToggles];
  } else if (typeof arg1 === 'object' && arg1 && typeof arg2 === 'string') {
    return !!arg1?.features?.[arg2 as keyof SystemFeatureToggles];
  }
  return false;
}
