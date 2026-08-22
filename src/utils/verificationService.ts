import { CertificateData, BatchRecord } from '../types';
import { getSavedBatches } from './batchManager';
import { getSavedDrafts } from './draftsManager';
import { TEMPLATE_PRESETS } from '../data/templates';
import { generateVerificationCode } from './qrUtils';

export interface VerificationResult {
  found: boolean;
  cert: CertificateData | null;
  sourceType: 'cloud' | 'batch' | 'active' | 'draft' | 'sample' | 'template';
  sourceTitle: string;
  verificationCode: string;
  verificationUrl: string;
  integrityStatus: 'valid' | 'warning' | 'invalid';
  checks: {
    codeMatch: boolean;
    hasDriveLink: boolean;
    hasStudentName: boolean;
    hasSchoolName: boolean;
    hasSignatures: boolean;
    hasStamp: boolean;
  };
  checksum: string;
}

/**
 * Normalizes verification code string for comparison
 */
export function normalizeCode(str: string): string {
  if (!str) return '';
  return str
    .trim()
    .toUpperCase()
    .replace(/[\s\-_]/g, '')
    .replace(/[٠١٢٣٤٥٦٧٨٩]/g, d => '0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(d)])
    .replace(/[۰۱۲۳۴۵۶۷۸۹]/g, d => '0123456789'['۰۱۲۳۴۵۶۷۸۹'.indexOf(d)]);
}

/**
 * Normalizes Arabic text for flexible matching (removes accents, unifies alifs and taa-marbuta)
 */
export function normalizeArabicText(str: string): string {
  if (!str) return '';
  return str
    .trim()
    .toLowerCase()
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/[يى]/g, 'ي')
    .replace(/[\u064B-\u065F\u0670]/g, '') // remove tashkeel/diacritics
    .replace(/[\s\-_]+/g, ' ');
}

/**
 * Extracts verification code from query string or URL if a full link is pasted
 */
export function extractCodeFromInput(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();

  // If user pasted a full URL
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.includes('?')) {
    try {
      const url = new URL(trimmed.startsWith('http') ? trimmed : `https://example.com/${trimmed}`);
      const code =
        url.searchParams.get('code') ||
        url.searchParams.get('verify') ||
        url.searchParams.get('id') ||
        url.searchParams.get('cert');
      if (code) return code;

      const pathParts = url.pathname.split('/').filter(Boolean);
      if (pathParts.length >= 2 && (pathParts[0] === 'verify' || pathParts[0] === 'cert' || pathParts[0] === 'd')) {
        return pathParts[pathParts.length - 1];
      }
    } catch {
      // not a standard URL, fallback
    }
  }

  return trimmed;
}

/**
 * Generates deterministic cryptographic-like integrity checksum for a certificate
 */
export function generateCertificateChecksum(cert: CertificateData): string {
  const seed = `${cert.id || ''}|${cert.studentName || ''}|${cert.title || ''}|${cert.schoolName || ''}|${cert.verificationCode || ''}|${cert.issueDate || ''}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).toUpperCase().padStart(8, '0');
  return `SEC-${hex.substring(0, 4)}-${hex.substring(4, 8)}`;
}

export interface VerifiableItem {
  cert: CertificateData;
  source: 'cloud' | 'batch' | 'active' | 'draft' | 'sample' | 'template';
  batchTitle?: string;
}

/**
 * Collects all known certificates across the entire local storage & active session & system drafts & templates
 */
export function getAllVerifiableCertificates(activeCert?: CertificateData): VerifiableItem[] {
  const map = new Map<string, VerifiableItem>();

  // 1. Active Editor Certificate
  if (activeCert && activeCert.id) {
    map.set(activeCert.id, {
      cert: activeCert,
      source: 'active',
      batchTitle: 'الشهادة المفتوحة بالمحرر'
    });
  }

  // 2. Autosaved Active Certificate from LocalStorage
  try {
    const autosaved = localStorage.getItem('taqdeer_autosave_certificate');
    if (autosaved) {
      const parsed: CertificateData = JSON.parse(autosaved);
      if (parsed && parsed.id && !map.has(parsed.id)) {
        map.set(parsed.id, {
          cert: parsed,
          source: 'active',
          batchTitle: 'شهادة قيد التحرير (المسودة التلقائية)'
        });
      }
    }
  } catch (e) {
    console.error('Error reading taqdeer_autosave_certificate:', e);
  }

  // 3. Saved Cloud Certificates
  try {
    const localSingle = localStorage.getItem('taqdeer_saved_certs');
    if (localSingle) {
      const parsed: CertificateData[] = JSON.parse(localSingle);
      if (Array.isArray(parsed)) {
        parsed.forEach(c => {
          if (c && c.id && !map.has(c.id)) {
            map.set(c.id, { cert: c, source: 'cloud', batchTitle: 'المكتبة السحابية' });
          }
        });
      }
    }
  } catch (e) {
    console.error('Error reading taqdeer_saved_certs:', e);
  }

  // 4. Batches Certificates
  try {
    const batches = getSavedBatches();
    batches.forEach((b: BatchRecord) => {
      if (b.certificates && Array.isArray(b.certificates)) {
        b.certificates.forEach(c => {
          if (c && c.id && !map.has(c.id)) {
            map.set(c.id, {
              cert: c,
              source: 'batch',
              batchTitle: b.title || `دفعة ${b.grade || 'فصل'}`
            });
          }
        });
      }
    });
  } catch (e) {
    console.error('Error reading batches for verification:', e);
  }

  // 5. Drafts & Custom Templates
  try {
    const drafts = getSavedDrafts();
    drafts.forEach(d => {
      if (d && d.data && d.data.id && !map.has(d.data.id)) {
        map.set(d.data.id, {
          cert: d.data,
          source: 'draft',
          batchTitle: d.type === 'template' ? `قالب محفوظ: ${d.name}` : `مسودة: ${d.name}`
        });
      }
    });
  } catch (e) {
    console.error('Error reading drafts for verification:', e);
  }

  // 6. Built-in Template Presets (for instant verification of demo/sample templates)
  try {
    TEMPLATE_PRESETS.forEach(tmpl => {
      if (tmpl && tmpl.defaultData) {
        const cert: CertificateData = {
          title: tmpl.name || 'شهادة شكر وتقدير',
          subtitle: 'شهادة إتمام وتفوق',
          studentName: 'نموذج مستلم معتمد',
          schoolName: 'نظام تقدير لإدارة الشهادات',
          ...tmpl.defaultData,
          id: tmpl.defaultData.id || `preset-${tmpl.id}`,
          verificationCode: tmpl.defaultData.verificationCode || `TAQDEER-TMPL-${tmpl.id.toUpperCase()}`
        } as CertificateData;
        if (!map.has(cert.id)) {
          map.set(cert.id, {
            cert,
            source: 'template',
            batchTitle: `قالب رسمي: ${tmpl.name}`
          });
        }
      }
    });
  } catch (e) {
    console.error('Error reading template presets for verification:', e);
  }

  return Array.from(map.values());
}

/**
 * Searches for a certificate by code, ID, URL, student name, or school name across all sources
 */
export function verifyCertificateByCodeOrName(
  query: string,
  activeCert?: CertificateData
): VerificationResult {
  const cleanInput = query ? query.trim() : '';
  const extractedCode = extractCodeFromInput(cleanInput);
  const normalizedQuery = normalizeCode(extractedCode || cleanInput);
  const normalizedArabicQuery = normalizeArabicText(cleanInput);

  if (!cleanInput) {
    return {
      found: false,
      cert: null,
      sourceType: 'sample',
      sourceTitle: '',
      verificationCode: '',
      verificationUrl: '',
      integrityStatus: 'invalid',
      checks: {
        codeMatch: false,
        hasDriveLink: false,
        hasStudentName: false,
        hasSchoolName: false,
        hasSignatures: false,
        hasStamp: false
      },
      checksum: ''
    };
  }

  const allCerts = getAllVerifiableCertificates(activeCert);
  let match: VerifiableItem | undefined;

  // 1. Exact Verification Code Match (with normalized code)
  match = allCerts.find(item => {
    const vCode = item.cert.verificationCode || '';
    return normalizeCode(vCode) === normalizedQuery;
  });

  // 2. Exact or Normalized ID Match
  if (!match) {
    match = allCerts.find(item => {
      const cId = item.cert.id || '';
      return normalizeCode(cId) === normalizedQuery || cId.toLowerCase() === extractedCode.toLowerCase();
    });
  }

  // 3. Certificate Number Match (e.g. certNumber / REF-...)
  if (!match) {
    match = allCerts.find(item => {
      const cNum = item.cert.certNumber || '';
      return normalizeCode(cNum) === normalizedQuery;
    });
  }

  // 4. Google Drive URL or Web View Link Match
  if (!match && (cleanInput.includes('drive.google.com') || cleanInput.includes('docs.google.com'))) {
    match = allCerts.find(item => {
      const dUrl = item.cert.driveFileUrl || '';
      const dView = item.cert.driveFileWebViewLink || '';
      return (dUrl && cleanInput.includes(dUrl)) || (dView && cleanInput.includes(dView)) ||
             (dUrl && dUrl.includes(cleanInput)) || (dView && dView.includes(cleanInput));
    });
  }

  // 5. Partial Code Match (e.g. last 4-8 characters)
  if (!match && normalizedQuery.length >= 4) {
    match = allCerts.find(item => {
      const vCodeNorm = normalizeCode(item.cert.verificationCode || '');
      const idNorm = normalizeCode(item.cert.id || '');
      return vCodeNorm.includes(normalizedQuery) || normalizedQuery.includes(vCodeNorm) ||
             idNorm.includes(normalizedQuery) || normalizedQuery.includes(idNorm);
    });
  }

  // 6. Student Name Match (Fuzzy Arabic and English)
  if (!match && normalizedArabicQuery.length >= 3) {
    match = allCerts.find(item => {
      const sName = normalizeArabicText(item.cert.studentName || '');
      return sName.includes(normalizedArabicQuery) || normalizedArabicQuery.includes(sName);
    });
  }

  // 7. Certificate Title or School Name Match
  if (!match && normalizedArabicQuery.length >= 4) {
    match = allCerts.find(item => {
      const sTitle = normalizeArabicText(item.cert.title || '');
      const sSchool = normalizeArabicText(item.cert.schoolName || '');
      return sTitle.includes(normalizedArabicQuery) || sSchool.includes(normalizedArabicQuery);
    });
  }

  if (!match) {
    return {
      found: false,
      cert: null,
      sourceType: 'sample',
      sourceTitle: '',
      verificationCode: extractedCode || cleanInput,
      verificationUrl: '',
      integrityStatus: 'invalid',
      checks: {
        codeMatch: false,
        hasDriveLink: false,
        hasStudentName: false,
        hasSchoolName: false,
        hasSignatures: false,
        hasStamp: false
      },
      checksum: ''
    };
  }

  const foundCert = match.cert;
  const vCode = foundCert.verificationCode || generateVerificationCode(foundCert.id);
  const vUrl = foundCert.driveFileWebViewLink || foundCert.driveFileUrl || `${window.location.origin}/?tab=verify&portal=true&code=${encodeURIComponent(vCode)}`;
  const checksum = generateCertificateChecksum(foundCert);

  const hasDrive = !!(foundCert.driveFileWebViewLink || foundCert.driveFileUrl);
  const hasStudentName = !!(foundCert.studentName && foundCert.studentName.trim());
  const hasSchoolName = !!(foundCert.schoolName && foundCert.schoolName.trim());
  const hasSignatures = !!(foundCert.signatures && foundCert.signatures.some(s => s.show && s.name));
  const hasStamp = !!(foundCert.stamp && foundCert.stamp.show);

  return {
    found: true,
    cert: foundCert,
    sourceType: match.source,
    sourceTitle: match.batchTitle || 'المكتبة السحابية',
    verificationCode: vCode,
    verificationUrl: vUrl,
    integrityStatus: 'valid',
    checks: {
      codeMatch: true,
      hasDriveLink: hasDrive,
      hasStudentName,
      hasSchoolName,
      hasSignatures,
      hasStamp
    },
    checksum
  };
}
