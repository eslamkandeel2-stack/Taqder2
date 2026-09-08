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
  canUploadLogos?: boolean;           // رفع وتعديل الشعارات والصور الخارجية
  canUseCustomFonts?: boolean;        // اختيار الخطوط المتنوعة (رقعة، كوفي، إلخ)
  canDirectShare?: boolean;           // مشاركة الشهادات بروابط مباشرة
  canPrintDirect?: boolean;           // الطباعة الفورية من المتصفح
  canManageDrafts?: boolean;          // حفظ وإدارة واسترجاع المسودات
  canUseProofreader?: boolean;        // المدقق اللغوي والنحوي الذكي
  canBatchDownloadZip?: boolean;      // تحميل الأرشيف المجمع كملف ZIP
  canUsePraiseBank?: boolean;         // بنك نصوص الشكر والثناء الجاهزة
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
  defaultHonorificTitle?: string;     // اللقب التكريمي الافتراضي (الطالب المتميز...)
  defaultAppreciationText?: string;   // نص الشكر والتقدير المعتمد
  defaultTemplateId?: string;         // القالب الافتراضي المختار
  defaultLogoUrl?: string;            // رابط الشعار المعتمد
  defaultStampUrl?: string;           // رابط الختم المعتمد
  defaultWatermarkText?: string;      // العلامة المائية الافتراضية
  defaultFontFamily?: string;         // الخط الافتراضي للشهادة
  defaultHeaderLine1?: string;        // الترويسة 1 (المملكة العربية السعودية)
  defaultHeaderLine2?: string;        // الترويسة 2 (وزارة التعليم)
  defaultHeaderLine3?: string;        // الترويسة 3 (إدارة التعليم)
}

/**
 * Field Locks per User Account
 * Allows the admin to lock specific fields so users cannot modify them in the certificate editor.
 */
export interface UserFieldLocks {
  lockSchoolName?: boolean;          // قفل اسم المدرسة / المنشأة المصدرة
  lockHeaderLines?: boolean;         // قفل ترويسة الوزارة والإدارة
  lockTitle?: boolean;               // قفل عنوان ونوع الشهادة
  lockStudentName?: boolean;         // قفل اسم المكرم / الطالب
  lockAppreciationText?: boolean;    // قفل نص وصيغة الشكر
  lockSignatures?: boolean;          // قفل أسماء ومسميات وتواقيع المسؤولين
  lockDate?: boolean;                // قفل تاريخ الإصدار
  lockQrVerification?: boolean;      // قفل رمز التحقق QR
  lockLogo?: boolean;                // قفل الشعار الرسمي
  lockStamp?: boolean;               // قفل الختم الرسمي
  lockBadge?: boolean;               // قفل وسام وشارة التميز
  lockFrame?: boolean;               // قفل إطار الشهادة
  lockColors?: boolean;              // قفل لوحة الألوان والسمة
  lockAspectRatio?: boolean;         // قفل أبعاد ومقاس الورق
  lockWatermark?: boolean;           // قفل العلامة المائية
  lockPoemOrQuote?: boolean;         // قفل البيت الشعري والاقتباس
}

export const DEFAULT_USER_FIELD_LOCKS: UserFieldLocks = {
  lockSchoolName: false,
  lockHeaderLines: false,
  lockTitle: false,
  lockStudentName: false,
  lockAppreciationText: false,
  lockSignatures: false,
  lockDate: false,
  lockQrVerification: false,
  lockLogo: false,
  lockStamp: false,
  lockBadge: false,
  lockFrame: false,
  lockColors: false,
  lockAspectRatio: false,
  lockWatermark: false,
  lockPoemOrQuote: false,
};

export const ADMIN_FIELD_LOCKS: UserFieldLocks = { ...DEFAULT_USER_FIELD_LOCKS };

export interface FieldLockDefinition {
  key: keyof UserFieldLocks;
  title: string;
  description: string;
  category: 'identity' | 'content' | 'signatures' | 'appearance';
  iconName: string;
  badge: string;
}

export const SYSTEM_FIELD_LOCKS_CATALOG: FieldLockDefinition[] = [
  {
    key: 'lockSchoolName',
    title: 'قفل اسم المدرسة / المنشأة المصدرة',
    description: 'منع المستخدم من تعديل اسم الجهة أو المنشأة المصدرة للشهادة وإبقاؤها رسمية وثابتة.',
    category: 'identity',
    iconName: 'Building',
    badge: 'المنشأة',
  },
  {
    key: 'lockHeaderLines',
    title: 'قفل ترويسة الوزارة والإدارة',
    description: 'منع تغيير الأسطر الرسمية الثلاثة في ترويسة الشهادة (المملكة، الوزارة، الإدارة).',
    category: 'identity',
    iconName: 'FileText',
    badge: 'الترويسة',
  },
  {
    key: 'lockLogo',
    title: 'قفل الشعار الرسمي',
    description: 'تثبيت الشعار الرسمي المعتمد ومنع استبداله أو إزالته أو تغييره.',
    category: 'identity',
    iconName: 'Image',
    badge: 'الهوية',
  },
  {
    key: 'lockTitle',
    title: 'قفل عنوان ونوع الشهادة',
    description: 'تثبيت نوع الشهادة (شكر وتقدير، تفوق، حضور) ومنع تغيير عنوان التكريم الرئيسي.',
    category: 'content',
    iconName: 'Award',
    badge: 'العنوان',
  },
  {
    key: 'lockStudentName',
    title: 'قفل اسم المكرم / الطالب',
    description: 'تثبيت اسم الطالب أو المكرم لمنع تعديله يدوياً (مفيد عند استيراد قوائم معتمدة فقط).',
    category: 'content',
    iconName: 'UserCheck',
    badge: 'المكرم',
  },
  {
    key: 'lockAppreciationText',
    title: 'قفل صيغة الشكر والثناء',
    description: 'إلزام المستخدم بالصيغة المعتمدة من الإدارة ومنع تحريف أو تعديل النص.',
    category: 'content',
    iconName: 'BookOpen',
    badge: 'الصيغة',
  },
  {
    key: 'lockSignatures',
    title: 'قفل التواقيع والمسميات الإدارية',
    description: 'تثبيت أسماء ومسميات وتواقيع المسؤولين ومنع العبث بها أو تعديلها.',
    category: 'signatures',
    iconName: 'PenTool',
    badge: 'التواقيع',
  },
  {
    key: 'lockStamp',
    title: 'قفل الختم الرسمي للمنشأة',
    description: 'حماية الختم الرقمي المعتمد وتثبيت موضعه ومنع حذفه أو تغييره.',
    category: 'signatures',
    iconName: 'ShieldCheck',
    badge: 'الأختام',
  },
  {
    key: 'lockDate',
    title: 'قفل تاريخ الإصدار (هجري / ميلادي)',
    description: 'تثبيت تاريخ اعتماد وتوثيق الشهادة ومنع التلاعب بالتاريخ الزمني.',
    category: 'content',
    iconName: 'Calendar',
    badge: 'التاريخ',
  },
  {
    key: 'lockQrVerification',
    title: 'قفل رمز التحقق الذكي QR',
    description: 'إجبار الشهادة على إبقاء باركود الفحص الأمني والتحقق نشطاً ومنع إخفائه.',
    category: 'signatures',
    iconName: 'QrCode',
    badge: 'الأمان',
  },
  {
    key: 'lockBadge',
    title: 'قفل وسام وشارة التميز',
    description: 'تثبيت وسام التميز الذهبي أو الشرفي وعدم السماح بتعديل شكله.',
    category: 'appearance',
    iconName: 'Sparkles',
    badge: 'الأوسمة',
  },
  {
    key: 'lockFrame',
    title: 'قفل الإطار الهندسي والزخارف',
    description: 'تثبيت إطار الشهادة المعتمد ومنع تغيير التصميم الجمالي الخارجي.',
    category: 'appearance',
    iconName: 'Layout',
    badge: 'الإطار',
  },
  {
    key: 'lockColors',
    title: 'قفل لوحة الألوان والسمة العامة',
    description: 'منع تغيير السمة اللونية لضمان تطابق الشهادات مع الهوية البصرية.',
    category: 'appearance',
    iconName: 'Palette',
    badge: 'الألوان',
  },
  {
    key: 'lockAspectRatio',
    title: 'قفل مقاس وحجم الورق (A4 / أفقي / عمودي)',
    description: 'تثبيت اتجاه ومقاس الورق لمنع حدوث أخطاء أثناء الطباعة الميدانية.',
    category: 'appearance',
    iconName: 'Maximize2',
    badge: 'الطباعة',
  },
  {
    key: 'lockWatermark',
    title: 'قفل العلامة المائية للشهادة',
    description: 'تثبيت نص أو صورة العلامة المائية الخلفية لحماية المستند من التزييف.',
    category: 'appearance',
    iconName: 'Shield',
    badge: 'الحماية',
  },
  {
    key: 'lockPoemOrQuote',
    title: 'قفل البيت الشعري والاقتباس',
    description: 'تثبيت الشطر الشعري أو الآية الكريمة المعتمدة في أعلى الشهادة.',
    category: 'content',
    iconName: 'Quote',
    badge: 'اقتباس',
  },
];

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
    key: 'canUploadLogos',
    title: 'رفع وتعديل الشعارات والصور',
    description: 'إمكانية رفع صور الشعار الرسمي والرموز المخصصة من الجهاز.',
    category: 'core',
    iconName: 'Image',
    badge: 'هوية',
  },
  {
    key: 'canUseCustomFonts',
    title: 'الخطوط العربية المتقدمة',
    description: 'إتاحة خطوط الرقعة والكوفي والأميري والخطوط الملكية المتنوعة.',
    category: 'core',
    iconName: 'Type',
    badge: 'خطوط',
  },
  {
    key: 'canDirectShare',
    title: 'المشاركة الفورية والواتساب',
    description: 'مشاركة بطاقات التكريم وروابط الفحص مباشرة عبر الواتساب ومنصات التواصل.',
    category: 'export',
    iconName: 'Share2',
    badge: 'مشاركة',
  },
  {
    key: 'canPrintDirect',
    title: 'الطباعة المباشرة من المتصفح',
    description: 'أمر الطباعة الفوري بجودة عالية دون الحاجة لتنزيل ملف PDF مسبقاً.',
    category: 'export',
    iconName: 'Printer',
    badge: 'طباعة',
  },
  {
    key: 'canManageDrafts',
    title: 'إدارة وحفظ المسودات',
    description: 'حفظ نماذج الشهادات ومسودات التصاميم المتعددة واستعادتها بضغطة زر.',
    category: 'storage',
    iconName: 'Archive',
    badge: 'أرشيف',
  },
  {
    key: 'canUseProofreader',
    title: 'المدقق اللغوي والنحوي الذكي',
    description: 'الفحص التلقائي للأخطاء الإملائية الشائعة وعلامات الترقيم والتشكيل.',
    category: 'ai_batch',
    iconName: 'SpellCheck',
    badge: 'تدقيق',
  },
  {
    key: 'canBatchDownloadZip',
    title: 'تنزيل الأرشيف كملف ZIP',
    description: 'ضغط كافة الشهادات المولدة في ملف مضغوط ZIP بنقرة واحدة.',
    category: 'export',
    iconName: 'DownloadCloud',
    badge: 'تنزيل',
  },
  {
    key: 'canUsePraiseBank',
    title: 'بنك نصوص الشكر والثناء',
    description: 'مكتبة متكاملة من عبارات التقدير والتكريم والثناء التربوي والمهني.',
    category: 'core',
    iconName: 'BookOpen',
    badge: 'مكتبة',
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
 * Returns effective field locks for a user.
 * System Admins are not restricted by field locks unless previewing.
 */
export function getUserEffectiveFieldLocks(user?: UnifiedAccount | null): UserFieldLocks {
  if (!user) {
    return { ...DEFAULT_USER_FIELD_LOCKS };
  }

  if (isUserAdmin(user)) {
    return { ...ADMIN_FIELD_LOCKS };
  }

  // Check user record's fieldLocks
  const userLocks = (user as any).fieldLocks;
  if (userLocks && typeof userLocks === 'object') {
    return {
      ...DEFAULT_USER_FIELD_LOCKS,
      ...userLocks,
    };
  }

  // Check local cache
  if (user.userId) {
    const cached = getAccountFieldLocksFromCache(user.userId);
    if (cached) {
      return {
        ...DEFAULT_USER_FIELD_LOCKS,
        ...cached,
      };
    }
  }

  return { ...DEFAULT_USER_FIELD_LOCKS };
}

/**
 * Checks if a specific field is locked for the user
 */
export function isFieldLockedForUser(
  lockKey: keyof UserFieldLocks,
  user?: UnifiedAccount | null
): boolean {
  if (isUserAdmin(user)) {
    return false;
  }
  const locks = getUserEffectiveFieldLocks(user);
  return !!locks[lockKey];
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
      ...(defaults.signatureTitle2 ? { teacherTitle: defaults.signatureTitle2 } : {}),
      ...(defaults.signatureName2 ? { teacherName: defaults.signatureName2 } : {}),
      ...(defaults.defaultCertificateType ? { defaultTitle: defaults.defaultCertificateType } : {}),
      ...(defaults.defaultHonorificTitle ? { recipientIntroMale: defaults.defaultHonorificTitle } : {}),
      ...(defaults.defaultAppreciationText ? { defaultSubject: defaults.defaultAppreciationText } : {}),
      ...(defaults.defaultLogoUrl ? { logoUrl: defaults.defaultLogoUrl } : {}),
      ...(defaults.defaultStampUrl ? { stampImage: defaults.defaultStampUrl } : {}),
      ...(defaults.defaultWatermarkText ? { defaultWatermarkText: defaults.defaultWatermarkText } : {}),
      ...(defaults.defaultFontFamily ? { defaultFont: defaults.defaultFontFamily as any } : {}),
      ...(defaults.defaultHeaderLine1 ? { headerLine1: defaults.defaultHeaderLine1, showHeaderLine1: true } : {}),
      ...(defaults.defaultHeaderLine2 ? { headerLine2: defaults.defaultHeaderLine2, showHeaderLine2: true } : {}),
      ...(defaults.defaultHeaderLine3 ? { headerLine3: defaults.defaultHeaderLine3, showHeaderLine3: true } : {}),
      ...(defaults.defaultOrientation
        ? {
            aspectRatio: defaults.defaultOrientation === 'portrait' ? 'A4-portrait' : 'A4-landscape',
          }
        : {}),
      ...(defaults.showQrCode !== undefined ? { showVerificationQr: defaults.showQrCode } : {}),
      ...(defaults.showIssueDate !== undefined ? { autoTodayDate: defaults.showIssueDate } : {}),
    };
    saveDefaultSettings(updated);
  } catch (e) {
    console.warn('applyAccountDefaultSettings error:', e);
  }
}

// Local cache storage helpers
const USER_FEATURES_PREFIX = 'taqdeer_user_features_';
const USER_DEFAULTS_PREFIX = 'taqdeer_user_defaults_';
const USER_FIELD_LOCKS_PREFIX = 'taqdeer_user_field_locks_';

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

export function saveAccountFieldLocksLocally(userId: string, locks: UserFieldLocks): void {
  try {
    localStorage.setItem(`${USER_FIELD_LOCKS_PREFIX}${userId}`, JSON.stringify(locks));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('taqdeer_user_locks_changed', { detail: { userId, locks } }));
    }
  } catch (e) {
    console.warn(e);
  }
}

export function getAccountFieldLocksFromCache(userId: string): UserFieldLocks | null {
  try {
    const raw = localStorage.getItem(`${USER_FIELD_LOCKS_PREFIX}${userId}`);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}
