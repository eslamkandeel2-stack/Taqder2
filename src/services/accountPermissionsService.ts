import { UnifiedAccount, isUserAdmin } from './unifiedAuthService';
import { DefaultCertificateSettings, saveDefaultSettings, getSavedDefaultSettings } from '../utils/defaultSettings';

/**
 * System Feature Flags per User Account
 */
export interface UserFeatureFlags {
  canIssueCertificates: boolean;      // إصدار وتعديل الشهادات الفردية
  canBatchGenerate: boolean;          // التوليد الجماعي واستيراد Excel / CSV
  canExportPdf: boolean;              // تصدير وتحميل PDF عالي الدقة
  canExportImage: boolean;            // تصدير وحفظ الصور (PNG / JPG)
  canUseAi: boolean;                  // المساعد الذكي وصياغة الذكاء الاصطناعي (Gemini)
  canUseCloudDrive: boolean;          // ربط Google Drive والتخزين السحابي
  canUseEmailDispatch: boolean;       // إرسال الشهادات عبر البريد الإلكتروني
  canUseSignatures: boolean;          // إدارة وحفظ الأختام والتواقيع الرقمية
  canVerifyCertificates: boolean;     // فحص وتوثيق الشهادات برمز QR
  canAccessVault: boolean;            // الوصول للنسخ الاحتياطي ومزامنة الخزنة
  canCustomizeTemplates: boolean;     // تخصيص مقاسات وهوامش وتصميم القوالب
  isAccountActive: boolean;           // تفعيل أو تجميد الحساب
  maxCertificatesQuota?: number;      // حد أقصى لعدد الشهادات (0 = غير محدود)
}

/**
 * Default Certificate & Design Settings per User Account
 */
export interface UserDefaultSettings {
  issuerTitle?: string;               // اسم الجهة المصدرة الافتراضية
  signatureTitle1?: string;           // مسمى الموقع الأول
  signatureName1?: string;            // اسم الموقع الأول
  signatureTitle2?: string;           // مسمى الموقع الثاني
  signatureName2?: string;            // اسم الموقع الثاني
  defaultCertificateType?: string;    // نوع الشهادة الافتراضي (تقدير، شكر، حضور...)
  defaultPaperSize?: 'a4' | 'a3' | 'letter'; // قياس الورق الافتراضي
  defaultOrientation?: 'landscape' | 'portrait'; // الاتجاه الافتراضي
  showQrCode?: boolean;               // إظهار الباركود الذكي QR
  showIssueDate?: boolean;            // إظهار تاريخ الإصدار
  defaultNotes?: string;              // ملاحظات أو نصوص مخصصة
  customThemeColor?: string;          // اللون أو السمة المفضلة
}

export const DEFAULT_USER_FEATURE_FLAGS: UserFeatureFlags = {
  canIssueCertificates: true,
  canBatchGenerate: false, // Default off for basic users until enabled by admin
  canExportPdf: true,
  canExportImage: true,
  canUseAi: true,
  canUseCloudDrive: true,
  canUseEmailDispatch: true,
  canUseSignatures: true,
  canVerifyCertificates: true,
  canAccessVault: true,
  canCustomizeTemplates: true,
  isAccountActive: true,
  maxCertificatesQuota: 0,
};

export const ADMIN_FEATURE_FLAGS: UserFeatureFlags = {
  canIssueCertificates: true,
  canBatchGenerate: true,
  canExportPdf: true,
  canExportImage: true,
  canUseAi: true,
  canUseCloudDrive: true,
  canUseEmailDispatch: true,
  canUseSignatures: true,
  canVerifyCertificates: true,
  canAccessVault: true,
  canCustomizeTemplates: true,
  isAccountActive: true,
  maxCertificatesQuota: 0,
};

export interface FeatureDefinition {
  key: keyof UserFeatureFlags;
  title: string;
  description: string;
  category: 'core' | 'ai_batch' | 'export' | 'storage' | 'security';
  iconName: string;
  badge: string;
}

export const SYSTEM_FEATURES_CATALOG: FeatureDefinition[] = [
  {
    key: 'canIssueCertificates',
    title: 'إصدار وتعديل الشهادات',
    description: 'تمكين المستخدم من إنشاء وتصميم وتحرير شهادات التقدير الفردية وحفظها في المنظومة.',
    category: 'core',
    iconName: 'Award',
    badge: 'أساسي',
  },
  {
    key: 'canBatchGenerate',
    title: 'التوليد الجماعي واستيراد Excel',
    description: 'استيراد قوائم الأسماء من جداول Excel و CSV وتوليد مئات الشهادات دفعة واحدة.',
    category: 'ai_batch',
    iconName: 'Layers',
    badge: 'متقدم',
  },
  {
    key: 'canExportPdf',
    title: 'تصدير وتحميل PDF عالي الدقة',
    description: 'تصدير الشهادات بصيغة PDF قابلة للطباعة بدقة طباعة 300 DPI.',
    category: 'export',
    iconName: 'FileText',
    badge: 'طباعة',
  },
  {
    key: 'canExportImage',
    title: 'تصدير الصور PNG و JPG',
    description: 'حفظ وتصدير الشهادات كصور رقمية عالية النقاء للمشاركة على الهواتف والشبكات.',
    category: 'export',
    iconName: 'Sparkles',
    badge: 'وسائط',
  },
  {
    key: 'canUseAi',
    title: 'المساعد الذكي AI (Gemini)',
    description: 'استخدام صياغة الذكاء الاصطناعي لتوليد عبارات الشكر والثناء الأكاديمي والمهني تلقائياً.',
    category: 'ai_batch',
    iconName: 'Zap',
    badge: 'ذكاء اصطناعي',
  },
  {
    key: 'canUseCloudDrive',
    title: 'Google Drive والتخزين السحابي',
    description: 'حفظ وأرشفة الشهادات مباشرة في مجلدات Google Drive الخاصة بالمستخدم.',
    category: 'storage',
    iconName: 'Cloud',
    badge: 'سحابة',
  },
  {
    key: 'canUseEmailDispatch',
    title: 'الإرسال المباشر بالبريد الإلكتروني',
    description: 'إرسال الشهادات مباشرة للمكرمين والطلاب عبر البريد الإلكتروني مع إرفاق PDF.',
    category: 'storage',
    iconName: 'ExternalLink',
    badge: 'إرسال',
  },
  {
    key: 'canUseSignatures',
    title: 'الأختام والتواقيع الرقمية',
    description: 'رفع واستخدام وحفظ التواقيع الخطية والأختام الرسمية المعتمدة على الشهادات.',
    category: 'core',
    iconName: 'CheckCircle2',
    badge: 'توثيق',
  },
  {
    key: 'canVerifyCertificates',
    title: 'التوثيق والتحقق برمز QR',
    description: 'تضمين رمز QR ذكي لفحص وتأكيد صحة الشهادة والبيانات من صفحة التحقق.',
    category: 'security',
    iconName: 'ShieldCheck',
    badge: 'أمان',
  },
  {
    key: 'canAccessVault',
    title: 'مزامنة الخزنة السحابية والنسخ الاحتياطي',
    description: 'مزامنة المسودات والشهادات مع قاعدة بيانات Firestore وخزنة الخادم المركزية.',
    category: 'storage',
    iconName: 'Database',
    badge: 'حماية',
  },
  {
    key: 'canCustomizeTemplates',
    title: 'تخصيص القوالب والمقاسات والهوامش',
    description: 'تعديل هوامش الطباعة المتقدمة ومقاسات الورق (A3, A4, Letter) والإطارات المخصصة.',
    category: 'core',
    iconName: 'Sliders',
    badge: 'تصميم',
  },
  {
    key: 'isAccountActive',
    title: 'حالة الحساب (نشط / مجمّد)',
    description: 'تفعيل الحساب للاستخدام أو تجميده مؤقتاً لتعليق كافة عملياته بالمنظومة.',
    category: 'security',
    iconName: 'Lock',
    badge: 'إدارة',
  },
];

/**
 * Returns effective feature flags for a user.
 * System Admins always have all features enabled.
 */
export function getUserEffectiveFeatures(user?: UnifiedAccount | null): UserFeatureFlags {
  if (!user) {
    return { ...DEFAULT_USER_FEATURE_FLAGS };
  }

  if (isUserAdmin(user)) {
    return { ...ADMIN_FEATURE_FLAGS };
  }

  // Check user record's features
  const userFeatures = (user as any).features;
  if (userFeatures && typeof userFeatures === 'object') {
    return {
      ...DEFAULT_USER_FEATURE_FLAGS,
      ...userFeatures,
    };
  }

  // Check local cache
  if (user.userId) {
    const cached = getAccountFeaturesFromCache(user.userId);
    if (cached) {
      return {
        ...DEFAULT_USER_FEATURE_FLAGS,
        ...cached,
      };
    }
  }

  return { ...DEFAULT_USER_FEATURE_FLAGS };
}

/**
 * Checks if a specific feature is enabled for the user
 */
export function isFeatureAllowed(
  feature: keyof UserFeatureFlags,
  user?: UnifiedAccount | null
): { allowed: boolean; reason?: string } {
  // Admins always have everything allowed
  if (isUserAdmin(user)) {
    return { allowed: true };
  }

  const features = getUserEffectiveFeatures(user);

  // Check general active status
  if (!features.isAccountActive) {
    return {
      allowed: false,
      reason: 'تم تجميد هذا الحساب مؤقتاً من قبل مدير النظام. يرجى مراجعة إدارة المنظومة للتفعيل.',
    };
  }

  const featureDef = SYSTEM_FEATURES_CATALOG.find((f) => f.key === feature);
  const featureTitle = featureDef ? featureDef.title : feature;

  if (features[feature] === false) {
    return {
      allowed: false,
      reason: `عذراً، ميزة (${featureTitle}) غير مفعلة لحسابك من قِبل مدير النظام 🔒. يمكنك التواصل مع الإدارة لترقية الصلاحيات.`,
    };
  }

  return { allowed: true };
}

/**
 * Applies account default settings to the active certificate settings
 */
export function applyAccountDefaultSettings(defaults: UserDefaultSettings): void {
  if (!defaults) return;
  try {
    const current = getSavedDefaultSettings();
    const updated: DefaultCertificateSettings = {
      ...current,
      ...(defaults.issuerTitle ? { schoolName: defaults.issuerTitle } : {}),
      ...(defaults.signatureTitle1 ? { principalTitle: defaults.signatureTitle1 } : {}),
      ...(defaults.signatureName1 ? { principalName: defaults.signatureName1 } : {}),
      ...(defaults.signatureTitle2 ? { supervisorTitle: defaults.signatureTitle2 } : {}),
      ...(defaults.signatureName2 ? { supervisorName: defaults.signatureName2 } : {}),
      ...(defaults.defaultCertificateType ? { certificateType: defaults.defaultCertificateType } : {}),
      ...(defaults.defaultOrientation ? { orientation: defaults.defaultOrientation } : {}),
      ...(defaults.defaultPaperSize ? { paperSize: defaults.defaultPaperSize } : {}),
      ...(defaults.showQrCode !== undefined ? { showQrCode: defaults.showQrCode } : {}),
      ...(defaults.showIssueDate !== undefined ? { showIssueDate: defaults.showIssueDate } : {}),
    };
    saveDefaultSettings(updated);
  } catch (e) {
    console.warn('applyAccountDefaultSettings error:', e);
  }
}

// Local cache storage helpers
const USER_FEATURES_PREFIX = 'taqdeer_user_features_';
const USER_DEFAULTS_PREFIX = 'taqdeer_user_defaults_';

export function saveAccountFeaturesLocally(userId: string, features: UserFeatureFlags): void {
  try {
    localStorage.setItem(`${USER_FEATURES_PREFIX}${userId}`, JSON.stringify(features));
  } catch (e) {
    console.warn(e);
  }
}

export function getAccountFeaturesFromCache(userId: string): UserFeatureFlags | null {
  try {
    const raw = localStorage.getItem(`${USER_FEATURES_PREFIX}${userId}`);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function saveAccountDefaultsLocally(userId: string, defaults: UserDefaultSettings): void {
  try {
    localStorage.setItem(`${USER_DEFAULTS_PREFIX}${userId}`, JSON.stringify(defaults));
  } catch (e) {
    console.warn(e);
  }
}

export function getAccountDefaultsFromCache(userId: string): UserDefaultSettings | null {
  try {
    const raw = localStorage.getItem(`${USER_DEFAULTS_PREFIX}${userId}`);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}
