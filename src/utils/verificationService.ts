import { CertificateData, BatchRecord } from '../types';
import { getSavedBatches } from './batchManager';
import { generateVerificationCode } from './qrUtils';

export interface VerificationResult {
  found: boolean;
  cert: CertificateData | null;
  sourceType: 'cloud' | 'batch' | 'active' | 'draft' | 'sample';
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

/**
 * Collects all known certificates across the entire local storage & active session
 */
export function getAllVerifiableCertificates(activeCert?: CertificateData): Array<{ cert: CertificateData; source: 'cloud' | 'batch' | 'active' | 'draft'; batchTitle?: string }> {
  const map = new Map<string, { cert: CertificateData; source: 'cloud' | 'batch' | 'active' | 'draft'; batchTitle?: string }>();

  // 1. Active Editor Certificate
  if (activeCert) {
    map.set(activeCert.id, {
      cert: activeCert,
      source: 'active',
      batchTitle: 'الشهادة المفتوحة بالمحرر'
    });
  }

  // 2. Saved Cloud Certificates
  try {
    const localSingle = localStorage.getItem('taqdeer_saved_certs');
    if (localSingle) {
      const parsed: CertificateData[] = JSON.parse(localSingle);
      if (Array.isArray(parsed)) {
        parsed.forEach(c => {
          if (!map.has(c.id)) {
            map.set(c.id, { cert: c, source: 'cloud', batchTitle: 'المكتبة السحابية' });
          }
        });
      }
    }
  } catch (e) {
    console.error('Error reading taqdeer_saved_certs:', e);
  }

  // 3. Batches Certificates
  try {
    const batches = getSavedBatches();
    batches.forEach((b: BatchRecord) => {
      if (b.certificates && Array.isArray(b.certificates)) {
        b.certificates.forEach(c => {
          if (!map.has(c.id)) {
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

  return Array.from(map.values());
}

/**
 * Searches for a certificate by code, ID, or student name across all sources
 */
export function verifyCertificateByCodeOrName(
  query: string,
  activeCert?: CertificateData
): VerificationResult {
  const cleanQuery = query ? query.trim() : '';
  const normalizedQuery = normalizeCode(cleanQuery);

  if (!cleanQuery) {
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

  let match: { cert: CertificateData; source: 'cloud' | 'batch' | 'active' | 'draft'; batchTitle?: string } | undefined;

  // 1. Exact Verification Code Match
  match = allCerts.find(item => {
    const vCode = item.cert.verificationCode || '';
    return normalizeCode(vCode) === normalizedQuery;
  });

  // 2. Exact or Normalized ID Match
  if (!match) {
    match = allCerts.find(item => {
      const cId = item.cert.id || '';
      return normalizeCode(cId) === normalizedQuery || cId.toLowerCase() === cleanQuery.toLowerCase();
    });
  }

  // 3. Certificate Number (e.g. certNumber / REF-...)
  if (!match) {
    match = allCerts.find(item => {
      const cNum = item.cert.certNumber || '';
      return normalizeCode(cNum) === normalizedQuery;
    });
  }

  // 4. Partial Code Match (e.g. last 6 digits)
  if (!match && normalizedQuery.length >= 4) {
    match = allCerts.find(item => {
      const vCodeNorm = normalizeCode(item.cert.verificationCode || '');
      return vCodeNorm.includes(normalizedQuery) || normalizedQuery.includes(vCodeNorm);
    });
  }

  // 5. Student Name Match (if query contains Arabic or Latin letters)
  if (!match && cleanQuery.length >= 3) {
    const qLower = cleanQuery.toLowerCase();
    match = allCerts.find(item => {
      const sName = (item.cert.studentName || '').toLowerCase();
      return sName.includes(qLower);
    });
  }

  if (!match) {
    return {
      found: false,
      cert: null,
      sourceType: 'sample',
      sourceTitle: '',
      verificationCode: cleanQuery,
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
  const vUrl = foundCert.driveFileWebViewLink || foundCert.driveFileUrl || `${window.location.origin}/verify?code=${vCode}`;
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
