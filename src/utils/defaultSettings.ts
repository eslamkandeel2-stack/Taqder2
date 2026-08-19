import { CertificateData, SignatureItem } from '../types';

export interface DefaultCertificateSettings {
  schoolName: string;
  issuePlace: string;
  teacherName: string;
  teacherTitle: string;
  principalName: string;
  principalTitle: string;
  logoUrl: string;
  frameStyle: string;
  fontFamily: string;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  stampTitle: string;
  stampSubtext: string;
  stampColor: string;
  stampShape: 'circle' | 'square' | 'rectangle' | 'wax' | 'ribbon';
  watermarkText: string;
  autoTodayDate: boolean;
  canvasMarginTop?: number;
  canvasMarginBottom?: number;
  canvasMarginLeft?: number;
  canvasMarginRight?: number;
  // Verification Box Defaults
  verificationBoxPattern?: 'classic' | 'modern-card' | 'seal-stamp' | 'barcode-focus' | 'minimal-pill' | 'glass-card' | 'certificate-tag';
  showVerificationQr?: boolean;
  showVerificationBarcode?: boolean;
  showVerificationSerialCode?: boolean;
  showVerificationStatusText?: boolean;
  showVerificationIcon?: boolean;
  verificationBadgeText?: string;
  verificationPrefix?: string;
  verificationCodePattern?: 'prefix-year-random' | 'prefix-random' | 'prefix-date-serial' | 'numbers-only' | 'prefix-seq';
  verificationBoxBgColor?: string;
  verificationBoxTextColor?: string;
  verificationBoxBorderColor?: string;
  verificationBoxBgOpacity?: number;
  verificationBoxSize?: 'sm' | 'md' | 'lg';
}

export const FALLBACK_DEFAULT_SETTINGS: DefaultCertificateSettings = {
  schoolName: 'مدرسة التميز النموذجية',
  issuePlace: 'الرياض، المملكة العربية السعودية',
  teacherName: 'أ. عبد الرحمن السعيد',
  teacherTitle: 'معلم المادة',
  principalName: 'د. خالد العصيمي',
  principalTitle: 'مدير المدرسة',
  logoUrl: '',
  frameStyle: 'double-gold',
  fontFamily: 'Amiri',
  primaryColor: '#854d0e',
  secondaryColor: '#d97706',
  backgroundColor: '#fefce8',
  textColor: '#1e293b',
  stampTitle: 'الختم الرسمي',
  stampSubtext: 'معتمد رسمياً',
  stampColor: '#b45309',
  stampShape: 'wax',
  watermarkText: 'مدرسة التميز النموذجية',
  autoTodayDate: true,
  canvasMarginTop: 32,
  canvasMarginBottom: 30,
  canvasMarginLeft: 40,
  canvasMarginRight: 40,
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
  verificationBoxSize: 'md'
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

  const issueDateToUse = defaults.autoTodayDate ? getFormattedTodayDate() : (cert.issueDate || getFormattedTodayDate());

  const updatedSignatures: SignatureItem[] = (cert.signatures && cert.signatures.length > 0)
    ? cert.signatures.map((sig, idx) => {
        if (idx === 0) {
          return {
            ...sig,
            name: defaults.teacherName || sig.name,
            title: defaults.teacherTitle || sig.title,
            signatureText: sig.signatureText || defaults.teacherName
          };
        }
        if (idx === 1) {
          return {
            ...sig,
            name: defaults.principalName || sig.name,
            title: defaults.principalTitle || sig.title,
            signatureText: sig.signatureText || defaults.principalName
          };
        }
        return sig;
      })
    : [
        { id: '1', name: defaults.teacherName, title: defaults.teacherTitle, type: 'type' as const, signatureText: defaults.teacherName, show: true },
        { id: '2', name: defaults.principalName, title: defaults.principalTitle, type: 'type' as const, signatureText: defaults.principalName, show: true }
      ];

  return {
    ...cert,
    schoolName: defaults.schoolName || cert.schoolName,
    issuePlace: defaults.issuePlace || cert.issuePlace,
    issueDate: issueDateToUse,
    watermarkText: defaults.watermarkText || cert.watermarkText || defaults.schoolName,
    logoUrl: defaults.logoUrl !== undefined && defaults.logoUrl !== '' ? defaults.logoUrl : cert.logoUrl,
    frameStyle: (defaults.frameStyle as any) || cert.frameStyle,
    fontFamily: (defaults.fontFamily as any) || cert.fontFamily,
    primaryColor: defaults.primaryColor || cert.primaryColor,
    secondaryColor: defaults.secondaryColor || cert.secondaryColor,
    backgroundColor: defaults.backgroundColor || cert.backgroundColor,
    textColor: defaults.textColor || cert.textColor,
    stamp: {
      ...cert.stamp,
      title: defaults.stampTitle || cert.stamp?.title || 'الختم الرسمي',
      subtext: defaults.stampSubtext || cert.stamp?.subtext || 'معتمد رسمياً',
      color: defaults.stampColor || cert.stamp?.color || '#b45309',
      shape: defaults.stampShape || cert.stamp?.shape || 'wax'
    },
    signatures: updatedSignatures,
    canvasMarginTop: defaults.canvasMarginTop ?? cert.canvasMarginTop ?? 24,
    canvasMarginBottom: defaults.canvasMarginBottom ?? cert.canvasMarginBottom ?? 24,
    canvasMarginLeft: defaults.canvasMarginLeft ?? cert.canvasMarginLeft ?? 32,
    canvasMarginRight: defaults.canvasMarginRight ?? cert.canvasMarginRight ?? 32,
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
