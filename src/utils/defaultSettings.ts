import {
  CertificateData,
  SignatureItem,
  FontOption,
  FrameStyle,
  LayoutPreset,
  VerificationBoxPattern,
  VerificationCodePattern,
  BadgeIconType,
  BadgeBgShape,
  AspectRatioOption,
  ExportEngine,
  ExportFormat
} from '../types';

export interface DefaultCertificateSettings {
  // 1. Basic Institution & Header Info
  schoolName: string;
  issuePlace: string;
  headerLine1: string;
  headerLine2: string;
  headerLine3: string;
  showHeaderLine1: boolean;
  showHeaderLine2: boolean;
  showHeaderLine3: boolean;
  headerVisionText: string;
  showHeaderVisionText: boolean;
  defaultSubject: string;
  defaultGrade: string;
  defaultTitle: string;
  defaultSubtitle: string;
  recipientIntroMale: string;
  recipientIntroFemale: string;
  defaultPoemOrQuote: string;
  showPoemOrQuote: boolean;
  autoTodayDate: boolean;
  dateFormatMode: 'hijri' | 'gregorian' | 'both';
  dateNumeralType: 'latin' | 'arabic';
  dateDisplayLayout: 'single-line' | 'stacked';

  // 2. Text Formatting & Layout Styles
  fontSizeScale: number;
  headerFontFamily: FontOption;
  headerFontSizeScale: number;
  appreciationLineHeight: number;
  textAlignment: 'center' | 'right' | 'left' | 'justify';
  showRecipientBox: boolean;
  recipientBoxColor: string;
  recipientBoxOpacity: number;
  recipientSpacing: number;

  // 3. Template & Page Layout
  aspectRatio: AspectRatioOption;
  layoutPreset: LayoutPreset;
  canvasMarginTop: number;
  canvasMarginBottom: number;
  canvasMarginLeft: number;
  canvasMarginRight: number;

  // 4. Colors & Typography
  fontFamily: FontOption;
  titleFontFamily: FontOption;
  studentNameFontFamily: FontOption;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  borderColor: string;
  borderSecondaryColor: string;

  // 5. Signatures
  signatureCount: 1 | 2 | 3;
  teacherTitle: string;
  teacherName: string;
  teacherSignatureUrl?: string;
  principalTitle: string;
  principalName: string;
  principalSignatureUrl?: string;
  signature3Title?: string;
  signature3Name?: string;
  signature3SignatureUrl?: string;
  signatureFontFamily: string;
  signatureInkColor: string;

  // 6. Frame & Logo
  frameStyle: FrameStyle;
  borderWidth: number;
  borderPadding: number;
  logoUrl: string;
  logoPosition: 'right' | 'center' | 'left';
  logoSize: 'sm' | 'md' | 'lg' | 'xl';
  logoShape: 'circle' | 'square' | 'rounded' | 'none';
  logoBgMode: 'transparent' | 'white' | 'dark' | 'none';
  bgCardBacking: boolean;
  bgCardOpacity: number;

  // 7. Stamps & Badges
  stampTitle: string;
  stampSubtext: string;
  stampColor: string;
  stampShape: 'circle' | 'square' | 'rectangle' | 'wax' | 'ribbon';
  stampOpacity: number;
  stampImageUrl?: string;
  badgeTitle: string;
  badgeIcon: BadgeIconType;
  badgeBgShape: BadgeBgShape;
  badgeBgColor: string;
  badgeBgGradient: boolean;
  badgeSize: 'sm' | 'md' | 'lg';
  watermarkText: string;

  // 8. Verification Box Defaults
  verificationBoxPattern: VerificationBoxPattern;
  showVerificationQr: boolean;
  showVerificationBarcode: boolean;
  showVerificationSerialCode: boolean;
  showVerificationStatusText: boolean;
  showVerificationIcon: boolean;
  verificationBadgeText: string;
  verificationPrefix: string;
  verificationCodePattern: VerificationCodePattern;
  verificationBoxBgColor?: string;
  verificationBoxTextColor?: string;
  verificationBoxBorderColor?: string;
  verificationBoxBgOpacity: number;
  verificationBoxSize: 'sm' | 'md' | 'lg';

  // 8.1 Official Verification Document Customization (وثيقة التحقق الرسمية الجاهزة للطباعة)
  verificationDocMinistryHeader1: string;
  verificationDocMinistryHeader2: string;
  verificationDocPlatformName: string;
  verificationDocTitle: string;
  verificationDocSubtitle: string;
  verificationDocAuthority: string;
  verificationDocDeclaration: string;
  verificationDocShowQr: boolean;
  verificationDocShowBarcode: boolean;
  verificationDocShowSecurityStamp: boolean;
  verificationDocShowChecksum: boolean;
  verificationDocWatermark: string;
  verificationDocBorderColor: string;
  verificationDocPrimaryColor: string;

  // 9. Export & Print Settings
  exportFormat: ExportFormat;
  defaultExportEngine: ExportEngine;
  exportDpi: 72 | 150 | 300 | 400 | 600;
  exportImageQuality: number; // 0.1 to 1.0 (default: 0.95)
  showExportPreviewModal: boolean;
  printPaperSize: 'A4' | 'A3' | 'Letter';
  crispVectorPdf: boolean;
  includeVerificationInExport: boolean;
  multiBatchNumbering: boolean;
}

export const FALLBACK_DEFAULT_SETTINGS: DefaultCertificateSettings = {
  // 1. Basic Institution & Header Info
  schoolName: 'مدرسة التميز النموذجية',
  issuePlace: 'الرياض، المملكة العربية السعودية',
  headerLine1: 'المملكة العربية السعودية',
  headerLine2: 'وزارة التعليم / الإدارة العامة للتعليم',
  headerLine3: 'مكتب التعليم - قسم التميز ورعاية الموهوبين',
  showHeaderLine1: true,
  showHeaderLine2: true,
  showHeaderLine3: false,
  headerVisionText: 'رؤية 2030',
  showHeaderVisionText: false,
  defaultSubject: 'التفوق والتميز الدراسي',
  defaultGrade: 'المرحلة الدراسية',
  defaultTitle: 'شهادة شكر وتقدير وتفوق',
  defaultSubtitle: 'وسام التميز الأكاديمي',
  recipientIntroMale: 'تسر إدارة المدرسة ومعلموها أن تمنح هذه الشهادة للطالب المتميز:',
  recipientIntroFemale: 'تسر إدارة المدرسة ومعلماتها أن تمنح هذه الشهادة للطالبة المتميزة:',
  defaultPoemOrQuote: 'العِلْمُ يَرْفَعُ بَيْتًا لا عِمَادَ لَهُ ... وَالجَهْلُ يَهْدِمُ بَيْتَ العِزِّ وَالشَّرَفِ',
  showPoemOrQuote: true,
  autoTodayDate: true,
  dateFormatMode: 'both',
  dateNumeralType: 'latin',
  dateDisplayLayout: 'single-line',

  // 2. Text Formatting & Layout Styles
  fontSizeScale: 1.0,
  headerFontFamily: 'Cairo',
  headerFontSizeScale: 1.0,
  appreciationLineHeight: 1.65,
  textAlignment: 'center',
  showRecipientBox: true,
  recipientBoxColor: '#f59e0b',
  recipientBoxOpacity: 0.12,
  recipientSpacing: 4,

  // 3. Template & Page Layout
  aspectRatio: 'A4-landscape',
  layoutPreset: 'classic-standard',
  canvasMarginTop: 32,
  canvasMarginBottom: 30,
  canvasMarginLeft: 40,
  canvasMarginRight: 40,

  // 4. Colors & Typography
  fontFamily: 'Amiri',
  titleFontFamily: 'Amiri',
  studentNameFontFamily: 'Aref Ruqaa',
  primaryColor: '#854d0e',
  secondaryColor: '#d97706',
  accentColor: '#ca8a04',
  backgroundColor: '#fefce8',
  textColor: '#1e293b',
  borderColor: '#ca8a04',
  borderSecondaryColor: '#eab308',

  // 5. Signatures
  signatureCount: 2,
  teacherTitle: 'معلم المادة',
  teacherName: 'أ. عبد الرحمن السعيد',
  teacherSignatureUrl: '',
  principalTitle: 'مدير المدرسة',
  principalName: 'د. خالد العصيمي',
  principalSignatureUrl: '',
  signature3Title: 'المشرف الأكاديمي',
  signature3Name: 'أ. فهد المنصور',
  signature3SignatureUrl: '',
  signatureFontFamily: 'Aref Ruqaa',
  signatureInkColor: '#0f172a',

  // 6. Frame & Logo
  frameStyle: 'double-gold',
  borderWidth: 2,
  borderPadding: 12,
  logoUrl: '',
  logoPosition: 'right',
  logoSize: 'md',
  logoShape: 'circle',
  logoBgMode: 'transparent',
  bgCardBacking: false,
  bgCardOpacity: 0.85,

  // 7. Stamps & Badges
  stampTitle: 'الختم الرسمي',
  stampSubtext: 'معتمد رسمياً',
  stampColor: '#b45309',
  stampShape: 'wax',
  stampOpacity: 0.95,
  stampImageUrl: '',
  badgeTitle: 'وسام التميز والتفوق',
  badgeIcon: 'award',
  badgeBgShape: 'pill',
  badgeBgColor: '#854d0e',
  badgeBgGradient: true,
  badgeSize: 'md',
  watermarkText: 'مدرسة التميز النموذجية',

  // 8. Verification Box Defaults
  verificationBoxPattern: 'classic',
  showVerificationQr: true,
  showVerificationBarcode: true,
  showVerificationSerialCode: true,
  showVerificationStatusText: true,
  showVerificationIcon: true,
  verificationBadgeText: 'شهادة موثقة رقمياً',
  verificationPrefix: 'TAQDEER',
  verificationCodePattern: 'prefix-year-random',
  verificationBoxBgOpacity: 1,
  verificationBoxSize: 'md',

  // 8.1 Official Verification Document Customization (وثيقة التحقق الرسمية الجاهزة للطباعة)
  verificationDocMinistryHeader1: 'المملكة العربية السعودية',
  verificationDocMinistryHeader2: 'وزارة التعليم / الجهة المانحة للشهادة',
  verificationDocPlatformName: 'منصة تَقْدِير الوطنية لتوثيق الشهادات',
  verificationDocTitle: 'إفادة وتحقق إلكتروني من صحة شهادة تقدير',
  verificationDocSubtitle: 'Official Certificate Verification & Authentication Statement',
  verificationDocAuthority: 'معتمد رسمياً - إدارة التوثيق والمصادقة الرقمية',
  verificationDocDeclaration: 'تشهد منصة تَقْدِير ومطابقة السجلات الرقمية بأن شهادة التقدير والتفوق الصادرة هي شهادة نظامية، صادرة وموثقة إلكترونياً وتتمتع بكامل المصداقية والاعتماد الرسمي.',
  verificationDocShowQr: true,
  verificationDocShowBarcode: true,
  verificationDocShowSecurityStamp: true,
  verificationDocShowChecksum: true,
  verificationDocWatermark: 'وثيقة رسمية معتمدة ومطابقة للسجل السحابي',
  verificationDocBorderColor: '#1e293b',
  verificationDocPrimaryColor: '#0f172a',

  // 9. Export & Print Settings
  exportFormat: 'pdf',
  defaultExportEngine: 'html2canvas',
  exportDpi: 300,
  exportImageQuality: 0.95,
  showExportPreviewModal: true,
  printPaperSize: 'A4',
  crispVectorPdf: true,
  includeVerificationInExport: true,
  multiBatchNumbering: true
};

/**
 * Returns today's Hijri date string
 */
export function getTodayHijriDate(numeralType: 'latin' | 'arabic' = 'latin'): string {
  const now = new Date();
  let hYear = '';
  let hMonth = '';
  let hDay = '';

  const calendarLocales = [
    'ar-SA-u-ca-islamic-umalqura-nu-latn',
    'ar-SA-u-ca-islamic-nu-latn'
  ];

  for (const calLocale of calendarLocales) {
    try {
      const hijriFormatter = new Intl.DateTimeFormat(calLocale, {
        day: 'numeric',
        month: 'numeric',
        year: 'numeric'
      });
      const parts = hijriFormatter.formatToParts(now);
      const y = parts.find(p => p.type === 'year')?.value || '';
      const m = parts.find(p => p.type === 'month')?.value || '';
      const d = parts.find(p => p.type === 'day')?.value || '';

      const parsedY = parseInt(y, 10);
      if (parsedY > 1300 && parsedY < 1700) {
        hYear = y;
        hMonth = m;
        hDay = d;
        break;
      }
    } catch {
      // try next
    }
  }

  if (!hYear) {
    const fallback = getFallbackHijri(now);
    hYear = String(fallback.year);
    hMonth = String(fallback.month);
    hDay = String(fallback.day);
  }

  let result = `${hYear}/${hMonth.padStart(2, '0')}/${hDay.padStart(2, '0')} هـ`;
  if (numeralType === 'arabic') {
    return normalizeDateDigits(result, 'arabic');
  }
  return result;
}

/**
 * Returns today's Gregorian date string
 */
export function getTodayGregorianDate(numeralType: 'latin' | 'arabic' = 'latin'): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  let result = `${year}/${month}/${day} م`;
  if (numeralType === 'arabic') {
    return normalizeDateDigits(result, 'arabic');
  }
  return result;
}

/**
 * Returns formatted date string based on today's date (Gregorian & Hijri)
 * Uses clean Latin digits by default so '0' matches all digits uniformly without font glitches.
 */
export function getFormattedTodayDate(numeralType: 'latin' | 'arabic' = 'latin'): string {
  const hijri = getTodayHijriDate(numeralType);
  const greg = getTodayGregorianDate(numeralType);
  return `${hijri} - ${greg}`;
}

/**
 * Mathematical fallback for Hijri date calculation
 */
function getFallbackHijri(date: Date) {
  const day = date.getDate();
  const month = date.getMonth(); // 0-indexed
  const year = date.getFullYear();

  let m = month + 1;
  let y = year;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  const a = Math.floor(y / 100);
  const b = 2 - a + Math.floor(a / 4);
  const jd = Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + b - 1524.5;

  const l = Math.floor(jd - 1948440 + 10632);
  const n = Math.floor((l - 1) / 10631);
  const l2 = l - 10631 * n + 354;
  const j = (Math.floor((10985 - l2) / 5316)) * (Math.floor((50 * l2) / 17719)) + (Math.floor(l2 / 5670)) * (Math.floor((43 * l2) / 15238));
  const l3 = l2 - (Math.floor((30 - j) / 15)) * (Math.floor((17719 * j) / 50)) - (Math.floor(j / 16)) * (Math.floor((15238 * j) / 43)) + 29;
  const hMonth = Math.floor((24 * l3) / 709);
  const hDay = l3 - Math.floor((709 * hMonth) / 24);
  const hYear = 30 * n + j - 30;

  return { year: hYear, month: hMonth, day: hDay };
}

/**
 * Normalizes any date string so that all digits match the same numeral system
 * avoiding mismatched ASCII '0' prepended to Eastern digits or vice versa.
 */
export function normalizeDateDigits(dateStr: string, targetType: 'latin' | 'arabic' = 'latin'): string {
  if (!dateStr) return '';
  if (targetType === 'arabic') {
    const easternDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return dateStr.replace(/[0-9]/g, (w) => easternDigits[parseInt(w, 10)]);
  } else {
    const easternToLatin: Record<string, string> = {
      '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
      '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9'
    };
    return dateStr.replace(/[٠-٩]/g, (w) => easternToLatin[w] || w);
  }
}

/**
 * Loads default settings from localStorage
 */
export function getSavedDefaultSettings(): DefaultCertificateSettings {
  try {
    const saved = localStorage.getItem('taqdeer_default_settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...FALLBACK_DEFAULT_SETTINGS, ...parsed };
    }
  } catch (e) {
    console.warn('Failed to load default settings from storage:', e);
  }
  return FALLBACK_DEFAULT_SETTINGS;
}

/**
 * Saves default settings to localStorage and notifies all components across the app
 */
export function saveDefaultSettingsToStorage(settings: DefaultCertificateSettings): void {
  try {
    localStorage.setItem('taqdeer_default_settings', JSON.stringify(settings));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('taqdeer_default_settings_changed', { detail: settings }));
    }
  } catch (e) {
    console.error('Failed to save default settings to storage:', e);
  }
}

/**
 * Extracts complete default settings structure from an existing certificate
 */
export function extractCertificateToDefaultSettings(
  cert: CertificateData,
  existingSettings?: DefaultCertificateSettings
): DefaultCertificateSettings {
  const currentDefaults = existingSettings || getSavedDefaultSettings();

  const isFemale = cert.recipientGender === 'female';
  const sigCount = cert.signatures?.length ? (cert.signatures.length >= 3 ? 3 : cert.signatures.length === 1 ? 1 : 2) : (currentDefaults.signatureCount || 2);
  const sig1 = cert.signatures?.[0];
  const sig2 = cert.signatures?.[1];
  const sig3 = cert.signatures?.[2];

  return {
    ...currentDefaults,

    // 1. Basic Institution & Header Info
    schoolName: cert.schoolName || currentDefaults.schoolName,
    issuePlace: cert.issuePlace || currentDefaults.issuePlace,
    headerLine1: cert.headerLine1 ?? currentDefaults.headerLine1,
    headerLine2: cert.headerLine2 ?? currentDefaults.headerLine2,
    headerLine3: cert.headerLine3 ?? currentDefaults.headerLine3,
    showHeaderLine1: cert.showHeaderLine1 ?? currentDefaults.showHeaderLine1,
    showHeaderLine2: cert.showHeaderLine2 ?? currentDefaults.showHeaderLine2,
    showHeaderLine3: cert.showHeaderLine3 ?? currentDefaults.showHeaderLine3,
    headerVisionText: cert.headerVisionText ?? currentDefaults.headerVisionText,
    showHeaderVisionText: cert.showHeaderVisionText ?? currentDefaults.showHeaderVisionText,
    defaultSubject: cert.subject || currentDefaults.defaultSubject,
    defaultGrade: cert.grade || currentDefaults.defaultGrade,
    defaultTitle: cert.title || currentDefaults.defaultTitle,
    defaultSubtitle: cert.subtitle || currentDefaults.defaultSubtitle,
    recipientIntroMale: !isFemale ? (cert.recipientIntro || currentDefaults.recipientIntroMale) : currentDefaults.recipientIntroMale,
    recipientIntroFemale: isFemale ? (cert.recipientIntro || currentDefaults.recipientIntroFemale) : currentDefaults.recipientIntroFemale,
    defaultPoemOrQuote: cert.poemOrQuote ?? currentDefaults.defaultPoemOrQuote,
    showPoemOrQuote: cert.showPoemOrQuote ?? currentDefaults.showPoemOrQuote,
    dateFormatMode: cert.dateFormatMode || currentDefaults.dateFormatMode,
    dateDisplayLayout: cert.dateDisplayLayout || currentDefaults.dateDisplayLayout,

    // 2. Text Formatting & Layout Styles
    fontSizeScale: cert.fontSizeScale ?? currentDefaults.fontSizeScale,
    headerFontFamily: cert.headerFontFamily || currentDefaults.headerFontFamily,
    headerFontSizeScale: cert.headerFontSizeScale ?? currentDefaults.headerFontSizeScale,
    appreciationLineHeight: (cert as any).appreciationLineHeight ?? currentDefaults.appreciationLineHeight,
    showRecipientBox: cert.showRecipientBox ?? currentDefaults.showRecipientBox,
    recipientBoxColor: cert.recipientBoxColor || currentDefaults.recipientBoxColor,
    recipientBoxOpacity: cert.recipientBoxOpacity ?? currentDefaults.recipientBoxOpacity,
    recipientSpacing: cert.recipientSpacing ?? currentDefaults.recipientSpacing,

    // 3. Template & Page Layout
    aspectRatio: cert.aspectRatio || currentDefaults.aspectRatio,
    layoutPreset: cert.layoutPreset || currentDefaults.layoutPreset,
    canvasMarginTop: cert.canvasMarginTop ?? currentDefaults.canvasMarginTop,
    canvasMarginBottom: cert.canvasMarginBottom ?? currentDefaults.canvasMarginBottom,
    canvasMarginLeft: cert.canvasMarginLeft ?? currentDefaults.canvasMarginLeft,
    canvasMarginRight: cert.canvasMarginRight ?? currentDefaults.canvasMarginRight,

    // 4. Colors & Typography
    fontFamily: cert.fontFamily || currentDefaults.fontFamily,
    titleFontFamily: cert.elementStyles?.title?.fontFamily || (cert as any).titleFontFamily || cert.fontFamily || currentDefaults.titleFontFamily,
    studentNameFontFamily: cert.elementStyles?.studentName?.fontFamily || (cert as any).studentNameFontFamily || currentDefaults.studentNameFontFamily,
    primaryColor: cert.primaryColor || currentDefaults.primaryColor,
    secondaryColor: cert.secondaryColor || currentDefaults.secondaryColor,
    accentColor: cert.accentColor || currentDefaults.accentColor,
    backgroundColor: cert.backgroundColor || currentDefaults.backgroundColor,
    textColor: cert.textColor || currentDefaults.textColor,
    borderColor: cert.borderColor || currentDefaults.borderColor,
    borderSecondaryColor: cert.borderSecondaryColor || currentDefaults.borderSecondaryColor,

    // 5. Signatures
    signatureCount: sigCount,
    teacherTitle: sig1?.title || currentDefaults.teacherTitle,
    teacherName: sig1?.name || currentDefaults.teacherName,
    teacherSignatureUrl: sig1?.signatureUrl || currentDefaults.teacherSignatureUrl,
    principalTitle: sig2?.title || currentDefaults.principalTitle,
    principalName: sig2?.name || currentDefaults.principalName,
    principalSignatureUrl: sig2?.signatureUrl || currentDefaults.principalSignatureUrl,
    signature3Title: sig3?.title || currentDefaults.signature3Title,
    signature3Name: sig3?.name || currentDefaults.signature3Name,
    signature3SignatureUrl: sig3?.signatureUrl || currentDefaults.signature3SignatureUrl,
    signatureFontFamily: sig1?.fontFamily || currentDefaults.signatureFontFamily,
    signatureInkColor: sig1?.color || currentDefaults.signatureInkColor,

    // 6. Frame & Logo
    frameStyle: cert.frameStyle || currentDefaults.frameStyle,
    borderWidth: cert.borderWidth ?? currentDefaults.borderWidth,
    borderPadding: cert.borderPadding ?? currentDefaults.borderPadding,
    logoUrl: cert.logoUrl !== undefined ? cert.logoUrl : currentDefaults.logoUrl,
    logoPosition: cert.logoPosition || currentDefaults.logoPosition,
    logoSize: cert.logoSize || currentDefaults.logoSize,
    logoShape: cert.logoShape || currentDefaults.logoShape,
    logoBgMode: cert.logoBgMode || currentDefaults.logoBgMode,
    bgCardBacking: cert.bgCardBacking ?? currentDefaults.bgCardBacking,
    bgCardOpacity: cert.bgCardOpacity ?? currentDefaults.bgCardOpacity,

    // 7. Stamps & Badges
    stampTitle: cert.stamp?.title || currentDefaults.stampTitle,
    stampSubtext: cert.stamp?.subtext || currentDefaults.stampSubtext,
    stampColor: cert.stamp?.color || currentDefaults.stampColor,
    stampShape: (cert.stamp?.shape as any) || currentDefaults.stampShape,
    stampOpacity: cert.stamp?.opacity ?? currentDefaults.stampOpacity,
    stampImageUrl: cert.stamp?.imageUrl || currentDefaults.stampImageUrl,
    badgeTitle: cert.badgeTitle || currentDefaults.badgeTitle,
    badgeIcon: cert.badgeIcon || currentDefaults.badgeIcon,
    badgeBgShape: cert.badgeBgShape || currentDefaults.badgeBgShape,
    badgeBgColor: cert.badgeBgColor || currentDefaults.badgeBgColor,
    badgeBgGradient: cert.badgeBgGradient ?? currentDefaults.badgeBgGradient,
    badgeSize: cert.badgeSize || currentDefaults.badgeSize,
    watermarkText: cert.watermarkText || cert.schoolName || currentDefaults.watermarkText,

    // 8. Verification Box Defaults
    verificationBoxPattern: cert.verificationBoxPattern || currentDefaults.verificationBoxPattern,
    showVerificationQr: cert.showVerificationQr ?? currentDefaults.showVerificationQr,
    showVerificationBarcode: cert.showVerificationBarcode ?? currentDefaults.showVerificationBarcode,
    showVerificationSerialCode: cert.showVerificationSerialCode ?? currentDefaults.showVerificationSerialCode,
    showVerificationStatusText: cert.showVerificationStatusText ?? currentDefaults.showVerificationStatusText,
    showVerificationIcon: cert.showVerificationIcon ?? currentDefaults.showVerificationIcon,
    verificationBadgeText: cert.verificationBadgeText || currentDefaults.verificationBadgeText,
    verificationPrefix: cert.verificationPrefix || currentDefaults.verificationPrefix,
    verificationCodePattern: cert.verificationCodePattern || currentDefaults.verificationCodePattern,
    verificationBoxBgColor: cert.verificationBoxBgColor || currentDefaults.verificationBoxBgColor,
    verificationBoxTextColor: cert.verificationBoxTextColor || currentDefaults.verificationBoxTextColor,
    verificationBoxBorderColor: cert.verificationBoxBorderColor || currentDefaults.verificationBoxBorderColor,
    verificationBoxBgOpacity: cert.verificationBoxBgOpacity ?? currentDefaults.verificationBoxBgOpacity,
    verificationBoxSize: cert.verificationBoxSize || currentDefaults.verificationBoxSize,
  };
}

/**
 * Saves given certificate as system default settings and returns the newly saved defaults
 */
export function saveCurrentCertificateAsDefaultSettings(cert: CertificateData): DefaultCertificateSettings {
  const newDefaults = extractCertificateToDefaultSettings(cert);
  saveDefaultSettingsToStorage(newDefaults);
  return newDefaults;
}

export interface ApplyDefaultsOptions {
  preserveExistingSubject?: boolean;
  preserveExistingGrade?: boolean;
  preserveExistingIntro?: boolean;
  preserveExistingSchoolName?: boolean;
  preserveExistingTitle?: boolean;
  preserveExistingSubtitle?: boolean;
  preserveExistingAppreciation?: boolean;
  preserveExistingSignatures?: boolean;
  preserveExistingStamp?: boolean;
  preserveExistingBadge?: boolean;
}

export interface DefaultSettingsPreset {
  id: string;
  name: string;
  category: string;
  icon: string;
  description: string;
  settings: Partial<DefaultCertificateSettings>;
}

export type InstitutionPreset = DefaultSettingsPreset;

export const INSTITUTION_DEFAULT_PRESETS: DefaultSettingsPreset[] = [
  {
    id: 'ministry-school',
    name: 'التعليم العام والمدارس الرسمية 🇸🇦',
    category: 'تعليم',
    icon: '🏫',
    description: 'ترويسة وزارة التعليم السعودية مع رؤية 2030 وإطار ذهبي فاخر وتوقيعين رسميين',
    settings: {
      headerLine1: 'المملكة العربية السعودية',
      headerLine2: 'وزارة التعليم',
      headerLine3: 'الإدارة العامة للتعليم بمنطقة الرياض',
      showHeaderLine1: true,
      showHeaderLine2: true,
      showHeaderLine3: true,
      headerVisionText: 'رؤية 2030',
      showHeaderVisionText: true,
      schoolName: 'ثانوية الملك فهد بن عبد العزيز للموهوبين',
      defaultTitle: 'شهادة شكر وتقدير وتفوق',
      defaultSubtitle: 'تكريم الطلاب المتفوقين في الأداء الأكاديمي',
      defaultSubject: 'التفوق والتميز الدراسي العام',
      defaultGrade: 'المرحلة الثانوية',
      recipientIntroMale: 'تسر إدارة المدرسة ومعلموها أن تمنح هذه الشهادة للطالب المتميز:',
      recipientIntroFemale: 'تسر إدارة المدرسة ومعلموها أن تمنح هذه الشهادة للطالبة المتميزة:',
      frameStyle: 'double-gold',
      primaryColor: '#854d0e',
      secondaryColor: '#d97706',
      signatureCount: 2,
      teacherTitle: 'معلم المادة والنشاط',
      teacherName: 'أ. عبد الرحمن السعيد',
      principalTitle: 'مدير المدرسة',
      principalName: 'د. خالد العصيمي',
      stampTitle: 'ثانوية الملك فهد',
      stampSubtext: 'معتمد رسمياً',
      badgeTitle: 'وسام التميز والتفوق',
      badgeIcon: 'award'
    }
  },
  {
    id: 'university-academy',
    name: 'الجامعات والكليات الأكاديمية 🎓',
    category: 'جامعي',
    icon: '🏛️',
    description: 'ترويسة التعليم العالي والعمادات مع نمط الدبلوم الأكاديمي والختم الشمعي',
    settings: {
      headerLine1: 'وزارة التعليم العالي والبحث العلمي',
      headerLine2: 'جامعة الملك سعود - كلية علوم الحاسب والمعلومات',
      headerLine3: 'عمادة الشؤون الأكاديمية والبحث العلمي',
      showHeaderLine1: true,
      showHeaderLine2: true,
      showHeaderLine3: true,
      headerVisionText: 'التميز الأكاديمي',
      showHeaderVisionText: true,
      schoolName: 'جامعة الملك سعود - الرياض',
      defaultTitle: 'شهادة امتياز وتفوق أكاديمي',
      defaultSubtitle: 'Academic Excellence & Distinction Certificate',
      defaultSubject: 'هندسة البرمجيات والذكاء الاصطناعي',
      defaultGrade: 'مرحلة البكالوريوس',
      recipientIntroMale: 'يشهد عميد الكلية ومجلس القسم بأن الطالب المتميز:',
      recipientIntroFemale: 'تشهد عميدة الكلية ومجلس القسم بأن الطالبة المتميزة:',
      frameStyle: 'guilloche-royal',
      layoutPreset: 'diploma-grand',
      primaryColor: '#1e3a8a',
      secondaryColor: '#3b82f6',
      signatureCount: 3,
      teacherTitle: 'رئيس القسم الأكاديمي',
      teacherName: 'د. سعود الشمري',
      principalTitle: 'عميد الكلية',
      principalName: 'أ.د. عبد الله الراجحي',
      signature3Title: 'وكيل الجامعة للشؤون التعليمية',
      signature3Name: 'أ.د. محمد القحطاني',
      stampTitle: 'عمادة الشؤون الأكاديمية',
      stampSubtext: 'صادر وموثق رسمياً',
      badgeTitle: 'وسام مرتبة الشرف الأولى',
      badgeIcon: 'crown'
    }
  },
  {
    id: 'quran-society',
    name: 'حلقات وجمعيات تحفيظ القرآن الكريم 📖',
    category: 'قرآني',
    icon: '🕌',
    description: 'نمط القوس والزخرفة الإسلامية مع ترويسة الشؤون الإسلامية وختم الإتقان',
    settings: {
      headerLine1: 'المملكة العربية السعودية',
      headerLine2: 'وزارة الشؤون الإسلامية والدعوة والإرشاد',
      headerLine3: 'الجمعية الخيرية لتحفيظ القرآن الكريم',
      showHeaderLine1: true,
      showHeaderLine2: true,
      showHeaderLine3: true,
      headerVisionText: 'خيركم من تعلم القرآن وعلمه',
      showHeaderVisionText: true,
      schoolName: 'مجمع الفرقان لحلقات القرآن الكريم',
      defaultTitle: 'شهادة إتقان وحفظ كتاب الله الكريم',
      defaultSubtitle: 'نظير إتمام الحفظ والمواظبة على التلاوة والتجويد',
      defaultSubject: 'القرآن الكريم والتجويد المتقن',
      defaultGrade: 'حلقة الحفاظ والمجازين',
      recipientIntroMale: 'تتشرف إدارة المجمع القرآني بمنح شهادة الإتقان للطالب الحافظ:',
      recipientIntroFemale: 'تتشرف إدارة المجمع القرآني بمنح شهادة الإتقان للطالبة الحافظة:',
      frameStyle: 'islamic-arch',
      primaryColor: '#065f46',
      secondaryColor: '#10b981',
      signatureCount: 2,
      teacherTitle: 'معلم ومقرئ الحلقة',
      teacherName: 'الشيخ / إبراهيم العلي',
      principalTitle: 'المشرف العام على المجمع',
      principalName: 'د. عبد العزيز المقرن',
      stampTitle: 'جمعية تحفيظ القرآن',
      stampSubtext: 'معتمد ومجاز',
      badgeTitle: 'وسام الإتقان القرآني',
      badgeIcon: 'book'
    }
  },
  {
    id: 'corporate-training',
    name: 'مراكز التدريب والتطوير المهني 💼',
    category: 'مهني',
    icon: '🏢',
    description: 'تصميم تنفيذي عصري لشهادات الدورات الاحترافية وورش العمل والشهادات المعتمدة',
    settings: {
      headerLine1: 'المعهد الدولي لتطوير القيادات والمهارات الاحترافية',
      headerLine2: 'إدارة البرامج التنفيذية والاعتماد المهني',
      headerLine3: '',
      showHeaderLine1: true,
      showHeaderLine2: true,
      showHeaderLine3: false,
      headerVisionText: 'الاعتماد الدولي',
      showHeaderVisionText: true,
      schoolName: 'أكاديمية الرواد للتدريب والتطوير',
      defaultTitle: 'شهادة إتمام برنامج تدريبي مهني معتمد',
      defaultSubtitle: 'Professional Training & Mastery Certificate',
      defaultSubject: 'القيادة التنفيذية وإدارة المشاريع الاحترافية (PMP)',
      defaultGrade: 'المستوى الاحترافي المتقدم',
      recipientIntroMale: 'يشهد المركز الدولي للتدريب بأن المتدرب المتميز:',
      recipientIntroFemale: 'يشهد المركز الدولي للتدريب بأن المتدربة المتميزة:',
      frameStyle: 'modern-geometric',
      layoutPreset: 'executive-horizontal',
      primaryColor: '#0f172a',
      secondaryColor: '#0284c7',
      signatureCount: 2,
      teacherTitle: 'المدرب والخبير الدولي',
      teacherName: 'م. طارق العتيبي',
      principalTitle: 'المدير التنفيذي للأكاديمية',
      principalName: 'د. فيصل الغامدي',
      stampTitle: 'الاعتماد والتوثيق المهني',
      stampSubtext: 'ISO 9001 Certified',
      badgeTitle: 'Professional Certified Master',
      badgeIcon: 'target'
    }
  }
];

/**
 * Merges default settings into a given certificate object
 */
export function applyDefaultsToCertificate(
  cert: CertificateData,
  customDefaults?: DefaultCertificateSettings,
  options?: ApplyDefaultsOptions
): CertificateData {
  const defaults = customDefaults || getSavedDefaultSettings();

  const isFemale = cert.recipientGender === 'female';
  
  // Decide recipient intro
  let introToUse = cert.recipientIntro;
  if (!options?.preserveExistingIntro || !cert.recipientIntro) {
    introToUse = isFemale 
      ? (defaults.recipientIntroFemale || cert.recipientIntro)
      : (defaults.recipientIntroMale || cert.recipientIntro);
  }

  const issueDateToUse = defaults.autoTodayDate ? getFormattedTodayDate(defaults.dateNumeralType || 'latin') : (cert.issueDate || getFormattedTodayDate());

  // Signatures array generation based on signatureCount
  const count = defaults.signatureCount || 2;
  const sig1: SignatureItem = {
    id: '1',
    name: defaults.teacherName || 'أ. عبد الرحمن السعيد',
    title: defaults.teacherTitle || 'معلم المادة',
    type: defaults.teacherSignatureUrl ? 'upload' : 'type',
    signatureText: defaults.teacherName || 'أ. عبد الرحمن السعيد',
    signatureUrl: defaults.teacherSignatureUrl || '',
    fontFamily: defaults.signatureFontFamily || 'Aref Ruqaa',
    color: defaults.signatureInkColor || '#0f172a',
    show: true
  };
  const sig2: SignatureItem = {
    id: '2',
    name: defaults.principalName || 'د. خالد العصيمي',
    title: defaults.principalTitle || 'مدير المدرسة',
    type: defaults.principalSignatureUrl ? 'upload' : 'type',
    signatureText: defaults.principalName || 'د. خالد العصيمي',
    signatureUrl: defaults.principalSignatureUrl || '',
    fontFamily: defaults.signatureFontFamily || 'Aref Ruqaa',
    color: defaults.signatureInkColor || '#0f172a',
    show: count >= 2
  };
  const sig3: SignatureItem = {
    id: '3',
    name: defaults.signature3Name || 'أ. فهد المنصور',
    title: defaults.signature3Title || 'المشرف الأكاديمي',
    type: defaults.signature3SignatureUrl ? 'upload' : 'type',
    signatureText: defaults.signature3Name || 'أ. فهد المنصور',
    signatureUrl: defaults.signature3SignatureUrl || '',
    fontFamily: defaults.signatureFontFamily || 'Aref Ruqaa',
    color: defaults.signatureInkColor || '#0f172a',
    show: count >= 3
  };

  const defaultSignatures: SignatureItem[] = count === 1 ? [sig1] : count === 2 ? [sig1, sig2] : [sig1, sig2, sig3];
  const finalSignatures = (options?.preserveExistingSignatures && cert.signatures && cert.signatures.length > 0)
    ? cert.signatures
    : defaultSignatures;

  const schoolNameToUse = (options?.preserveExistingSchoolName && cert.schoolName)
    ? cert.schoolName
    : (defaults.schoolName || cert.schoolName);

  const subjectToUse = (options?.preserveExistingSubject && cert.subject)
    ? cert.subject
    : (cert.subject || defaults.defaultSubject);

  const gradeToUse = (options?.preserveExistingGrade && cert.grade)
    ? cert.grade
    : (cert.grade || defaults.defaultGrade);

  const titleToUse = (options?.preserveExistingTitle && cert.title)
    ? cert.title
    : (cert.title || defaults.defaultTitle);

  const subtitleToUse = (options?.preserveExistingSubtitle && cert.subtitle)
    ? cert.subtitle
    : (cert.subtitle || defaults.defaultSubtitle);

  return {
    ...cert,
    schoolName: schoolNameToUse,
    issuePlace: defaults.issuePlace || cert.issuePlace,
    headerLine1: defaults.headerLine1 !== undefined ? defaults.headerLine1 : cert.headerLine1,
    headerLine2: defaults.headerLine2 !== undefined ? defaults.headerLine2 : cert.headerLine2,
    headerLine3: defaults.headerLine3 !== undefined ? defaults.headerLine3 : cert.headerLine3,
    showHeaderLine1: defaults.showHeaderLine1 !== undefined ? defaults.showHeaderLine1 : cert.showHeaderLine1,
    showHeaderLine2: defaults.showHeaderLine2 !== undefined ? defaults.showHeaderLine2 : cert.showHeaderLine2,
    showHeaderLine3: defaults.showHeaderLine3 !== undefined ? defaults.showHeaderLine3 : cert.showHeaderLine3,
    headerVisionText: defaults.headerVisionText !== undefined ? defaults.headerVisionText : cert.headerVisionText,
    showHeaderVisionText: defaults.showHeaderVisionText !== undefined ? defaults.showHeaderVisionText : cert.showHeaderVisionText,
    subject: subjectToUse,
    grade: gradeToUse,
    title: titleToUse,
    subtitle: subtitleToUse,
    recipientIntro: introToUse,
    poemOrQuote: defaults.defaultPoemOrQuote || cert.poemOrQuote,
    showPoemOrQuote: defaults.showPoemOrQuote !== undefined ? defaults.showPoemOrQuote : cert.showPoemOrQuote,
    issueDate: issueDateToUse,
    dateFormatMode: defaults.dateFormatMode || cert.dateFormatMode || 'both',
    dateDisplayLayout: defaults.dateDisplayLayout || cert.dateDisplayLayout || 'single-line',
    watermarkText: defaults.watermarkText || cert.watermarkText || defaults.schoolName,
    fontSizeScale: defaults.fontSizeScale || cert.fontSizeScale || 1.0,
    headerFontFamily: defaults.headerFontFamily || cert.headerFontFamily || 'Cairo',
    headerFontSizeScale: defaults.headerFontSizeScale || cert.headerFontSizeScale || 1.0,
    showRecipientBox: defaults.showRecipientBox !== undefined ? defaults.showRecipientBox : cert.showRecipientBox,
    recipientBoxColor: defaults.recipientBoxColor || cert.recipientBoxColor || '#f59e0b',
    recipientBoxOpacity: defaults.recipientBoxOpacity !== undefined ? defaults.recipientBoxOpacity : cert.recipientBoxOpacity,
    recipientSpacing: defaults.recipientSpacing !== undefined ? defaults.recipientSpacing : cert.recipientSpacing,
    aspectRatio: defaults.aspectRatio || cert.aspectRatio || 'A4-landscape',
    layoutPreset: defaults.layoutPreset || cert.layoutPreset || 'classic-standard',
    canvasMarginTop: defaults.canvasMarginTop ?? cert.canvasMarginTop ?? 32,
    canvasMarginBottom: defaults.canvasMarginBottom ?? cert.canvasMarginBottom ?? 30,
    canvasMarginLeft: defaults.canvasMarginLeft ?? cert.canvasMarginLeft ?? 40,
    canvasMarginRight: defaults.canvasMarginRight ?? cert.canvasMarginRight ?? 40,
    fontFamily: defaults.fontFamily || cert.fontFamily || 'Amiri',
    primaryColor: defaults.primaryColor || cert.primaryColor,
    secondaryColor: defaults.secondaryColor || cert.secondaryColor,
    accentColor: defaults.accentColor || cert.accentColor,
    backgroundColor: defaults.backgroundColor || cert.backgroundColor,
    textColor: defaults.textColor || cert.textColor,
    borderColor: defaults.borderColor || cert.borderColor,
    borderSecondaryColor: defaults.borderSecondaryColor || cert.borderSecondaryColor,
    borderWidth: defaults.borderWidth ?? cert.borderWidth ?? 2,
    borderPadding: defaults.borderPadding ?? cert.borderPadding ?? 12,
    frameStyle: defaults.frameStyle || cert.frameStyle,
    logoUrl: defaults.logoUrl !== undefined && defaults.logoUrl !== '' ? defaults.logoUrl : cert.logoUrl,
    logoPosition: defaults.logoPosition || cert.logoPosition || 'right',
    logoSize: defaults.logoSize || cert.logoSize || 'md',
    logoShape: defaults.logoShape || cert.logoShape || 'circle',
    logoBgMode: defaults.logoBgMode || cert.logoBgMode || 'transparent',
    bgCardBacking: defaults.bgCardBacking !== undefined ? defaults.bgCardBacking : cert.bgCardBacking,
    bgCardOpacity: defaults.bgCardOpacity !== undefined ? defaults.bgCardOpacity : cert.bgCardOpacity,
    signatures: finalSignatures,
    stamp: {
      ...cert.stamp,
      title: defaults.stampTitle || cert.stamp?.title || 'الختم الرسمي',
      subtext: defaults.stampSubtext || cert.stamp?.subtext || 'معتمد رسمياً',
      color: defaults.stampColor || cert.stamp?.color || '#b45309',
      shape: defaults.stampShape || cert.stamp?.shape || 'wax',
      opacity: defaults.stampOpacity !== undefined ? defaults.stampOpacity : (cert.stamp?.opacity ?? 0.95),
      imageUrl: defaults.stampImageUrl || cert.stamp?.imageUrl || ''
    },
    badgeTitle: (options?.preserveExistingBadge && cert.badgeTitle) ? cert.badgeTitle : (defaults.badgeTitle || cert.badgeTitle || 'وسام التميز والتفوق'),
    badgeIcon: defaults.badgeIcon || cert.badgeIcon || 'award',
    badgeBgShape: defaults.badgeBgShape || cert.badgeBgShape || 'pill',
    badgeBgColor: defaults.badgeBgColor || cert.badgeBgColor || '#854d0e',
    badgeBgGradient: defaults.badgeBgGradient !== undefined ? defaults.badgeBgGradient : cert.badgeBgGradient,
    badgeSize: defaults.badgeSize || cert.badgeSize || 'md',
    verificationBoxPattern: defaults.verificationBoxPattern ?? cert.verificationBoxPattern ?? 'classic',
    showVerificationQr: defaults.showVerificationQr ?? cert.showVerificationQr ?? true,
    showVerificationBarcode: defaults.showVerificationBarcode ?? cert.showVerificationBarcode ?? true,
    showVerificationSerialCode: defaults.showVerificationSerialCode ?? cert.showVerificationSerialCode ?? true,
    showVerificationStatusText: defaults.showVerificationStatusText ?? cert.showVerificationStatusText ?? true,
    showVerificationIcon: defaults.showVerificationIcon ?? cert.showVerificationIcon ?? true,
    verificationBadgeText: defaults.verificationBadgeText ?? cert.verificationBadgeText ?? 'شهادة موثقة رقمياً',
    verificationPrefix: defaults.verificationPrefix ?? cert.verificationPrefix ?? 'TAQDEER',
    verificationCodePattern: defaults.verificationCodePattern ?? cert.verificationCodePattern ?? 'prefix-year-random',
    verificationBoxBgColor: defaults.verificationBoxBgColor ?? cert.verificationBoxBgColor,
    verificationBoxTextColor: defaults.verificationBoxTextColor ?? cert.verificationBoxTextColor,
    verificationBoxBorderColor: defaults.verificationBoxBorderColor ?? cert.verificationBoxBorderColor,
    verificationBoxBgOpacity: defaults.verificationBoxBgOpacity ?? cert.verificationBoxBgOpacity ?? 1,
    verificationBoxSize: defaults.verificationBoxSize ?? cert.verificationBoxSize ?? 'md',
    updatedAt: new Date().toISOString()
  };
}
