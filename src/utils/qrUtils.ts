import QRCode from 'qrcode';
import { VerificationCodePattern } from '../types';

// Caches to prevent duplicate generation and rapid re-render loop crashes
const codeCache = new Map<string, string>();
const qrDataUrlCache = new Map<string, string>();

/**
 * Sanitizes input verification codes:
 * 1. Converts Eastern and Persian Arabic digits (٠١٢٣٤٥٦٧٨٩ / ۰۱۲۳۴۵۶۷۸۹) to standard English numbers (0-9).
 * 2. Uppercases all text.
 * 3. Strips non-English characters (keeps strictly A-Z, 0-9, and hyphen -).
 */
export function sanitizeVerificationCode(input: string): string {
  if (!input) return '';

  const arabicDigitsMap: Record<string, string> = {
    '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
    '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
    '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
    '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9'
  };

  let sanitized = input;
  for (const [arabic, english] of Object.entries(arabicDigitsMap)) {
    sanitized = sanitized.split(arabic).join(english);
  }

  return sanitized
    .toUpperCase()
    .replace(/[^A-Z0-9\-]/g, '')
    .replace(/\-+/g, '-');
}

/**
 * Generates random strictly English uppercase letters and digits (A-Z0-9)
 */
function getRandomEnglishString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generates random strictly English digits (0-9)
 */
function getRandomNumericString(length: number): string {
  const chars = '0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generates a Data URL (PNG image) for a given verification payload or code string
 */
export async function generateQRCodeDataUrl(text: string, options?: QRCode.QRCodeToDataURLOptions): Promise<string> {
  if (!text) return '';
  const cacheKey = `${text}_${options?.width || 250}_${options?.color?.dark || '#0f172a'}`;
  if (qrDataUrlCache.has(cacheKey)) {
    return qrDataUrlCache.get(cacheKey)!;
  }

  try {
    const dataUrl = await QRCode.toDataURL(text, {
      width: 250,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
      ...options,
    });
    if (dataUrl) {
      qrDataUrlCache.set(cacheKey, dataUrl);
    }
    return dataUrl;
  } catch (err) {
    console.error('Error generating QR code:', err);
    return '';
  }
}

/**
 * Generates an SVG string representation of a QR code
 */
export async function generateQRCodeSVG(text: string): Promise<string> {
  try {
    const svg = await QRCode.toString(text, {
      type: 'svg',
      width: 150,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });
    return svg;
  } catch (err) {
    console.error('Error generating QR SVG:', err);
    return '';
  }
}

export interface VerificationCodeOptions {
  prefix?: string;
  pattern?: VerificationCodePattern;
  forceNew?: boolean;
}

/**
 * Formats a unique serial verification code for a certificate using strictly English letters (A-Z) & numbers (0-9).
 * Supports customizable prefixes and generation patterns.
 */
export function generateVerificationCode(
  existingCodeOrId?: string,
  options?: VerificationCodeOptions
): string {
  const prefix = options?.prefix
    ? sanitizeVerificationCode(options.prefix).replace(/[^A-Z0-9]/g, '') || 'TAQDEER'
    : 'TAQDEER';

  const pattern = options?.pattern || 'prefix-year-random';

  // Return existing formatted code if not forceNew
  if (!options?.forceNew && existingCodeOrId) {
    const sanitizedExisting = sanitizeVerificationCode(existingCodeOrId);
    
    // Check if existing string is already a formatted code with hyphens/letters/digits
    if (
      sanitizedExisting.length > 5 &&
      existingCodeOrId.includes('-') &&
      !existingCodeOrId.startsWith('cert-') &&
      !existingCodeOrId.startsWith('id-')
    ) {
      return sanitizedExisting;
    }

    // Check cache for this certificate ID
    if (codeCache.has(existingCodeOrId) && !options?.prefix && !options?.pattern) {
      return codeCache.get(existingCodeOrId)!;
    }
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const yyyymmdd = `${year}${month}${day}`;

  let newCode = '';

  switch (pattern) {
    case 'prefix-random':
      newCode = `${prefix}-${getRandomEnglishString(8)}`;
      break;

    case 'prefix-date-serial':
      newCode = `${prefix}-${yyyymmdd}-${getRandomNumericString(4)}`;
      break;

    case 'numbers-only':
      newCode = `${year}-${getRandomNumericString(4)}-${getRandomNumericString(4)}`;
      break;

    case 'prefix-seq':
      newCode = `${prefix}-${getRandomNumericString(6)}`;
      break;

    case 'prefix-year-random':
    default:
      newCode = `${prefix}-${year}-${getRandomEnglishString(6)}`;
      break;
  }

  if (existingCodeOrId && !options?.forceNew) {
    codeCache.set(existingCodeOrId, newCode);
  }

  return newCode;
}


