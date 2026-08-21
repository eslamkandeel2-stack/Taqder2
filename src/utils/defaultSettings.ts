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
  AspectRatioOption
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
  exportFormat: 'pdf' | 'png' | 'svg';
  exportDpi: 150 | 300 | 600;
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
  exportDpi: 300,
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
 * Saves default settings to localStorage
 */
export function saveDefaultSettingsToStorage(settings: DefaultCertificateSettings): void {
  try {
    localStorage.setItem('taqdeer_default_settings', JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save default settings to storage:', e);
  }
}

/**
 * Merges default settings into a given certificate object
 */
export function applyDefaultsToCertificate(
  cert: CertificateData,
  customDefaults?: DefaultCertificateSettings
): CertificateData {
  const defaults = customDefaults || getSavedDefaultSettings();

  const isFemale = cert.recipientGender === 'female';
  const introToUse = isFemale 
    ? (defaults.recipientIntroFemale || cert.recipientIntro)
    : (defaults.recipientIntroMale || cert.recipientIntro);

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

  const updatedSignatures: SignatureItem[] = count === 1 ? [sig1] : count === 2 ? [sig1, sig2] : [sig1, sig2, sig3];

  return {
    ...cert,
    schoolName: defaults.schoolName || cert.schoolName,
    issuePlace: defaults.issuePlace || cert.issuePlace,
    headerLine1: defaults.headerLine1 !== undefined ? defaults.headerLine1 : cert.headerLine1,
    headerLine2: defaults.headerLine2 !== undefined ? defaults.headerLine2 : cert.headerLine2,
    headerLine3: defaults.headerLine3 !== undefined ? defaults.headerLine3 : cert.headerLine3,
    showHeaderLine1: defaults.showHeaderLine1 !== undefined ? defaults.showHeaderLine1 : cert.showHeaderLine1,
    showHeaderLine2: defaults.showHeaderLine2 !== undefined ? defaults.showHeaderLine2 : cert.showHeaderLine2,
    showHeaderLine3: defaults.showHeaderLine3 !== undefined ? defaults.showHeaderLine3 : cert.showHeaderLine3,
    headerVisionText: defaults.headerVisionText !== undefined ? defaults.headerVisionText : cert.headerVisionText,
    showHeaderVisionText: defaults.showHeaderVisionText !== undefined ? defaults.showHeaderVisionText : cert.showHeaderVisionText,
    subject: defaults.defaultSubject || cert.subject,
    grade: defaults.defaultGrade || cert.grade,
    title: defaults.defaultTitle || cert.title,
    subtitle: defaults.defaultSubtitle || cert.subtitle,
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
    signatures: updatedSignatures,
    stamp: {
      ...cert.stamp,
      title: defaults.stampTitle || cert.stamp?.title || 'الختم الرسمي',
      subtext: defaults.stampSubtext || cert.stamp?.subtext || 'معتمد رسمياً',
      color: defaults.stampColor || cert.stamp?.color || '#b45309',
      shape: defaults.stampShape || cert.stamp?.shape || 'wax',
      opacity: defaults.stampOpacity !== undefined ? defaults.stampOpacity : (cert.stamp?.opacity ?? 0.95),
      imageUrl: defaults.stampImageUrl || cert.stamp?.imageUrl || ''
    },
    badgeTitle: defaults.badgeTitle || cert.badgeTitle || 'وسام التميز والتفوق',
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
