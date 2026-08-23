import { CertificateData, BatchRecord } from '../types';
import { getSavedBatches } from './batchManager';
import { getSavedDrafts } from './draftsManager';
import { getDriveVerificationRequests } from './driveVerificationRequests';
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
 * Normalizes verification code string for comparison (removes punctuation, zero-width spaces, Arabic digits)
 */
export function normalizeCode(str: string): string {
  if (!str) return '';
  return str
    .trim()
    .toUpperCase()
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // remove zero-width characters
    .replace(/[٠١٢٣٤٥٦٧٨٩]/g, d => '0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(d)])
    .replace(/[۰۱۲۳۴۵۶۷۸۹]/g, d => '0123456789'['۰۱۲۳۴۵۶۷۸۹'.indexOf(d)])
    .replace(/[\s\-_/:.#\\*@!=+&?()[\]{}"'`~]/g, ''); // strip all punctuation, spaces, dashes, slashes, colons
}

/**
 * Normalizes Arabic text for flexible matching (removes accents, unifies alifs, taa-marbuta, yaa)
 */
export function normalizeArabicText(str: string): string {
  if (!str) return '';
  return str
    .trim()
    .toLowerCase()
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/[يى]/g, 'ي')
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '') // remove tashkeel and tatweel
    .replace(/[\s\-_]+/g, ' ');
}

/**
 * Extracts verification code or ID from query string, full URL, or WhatsApp share message
 */
export function extractCodeFromInput(input: string): string {
  if (!input) return '';
  let trimmed = input.trim();
  try {
    trimmed = decodeURIComponent(trimmed);
  } catch {
    // ignore decode error
  }

  // 1. Check for standard code patterns in text (e.g. TAQDEER-2026-X89F2A or TQ-9F2A-88 or REF-1447/0892)
  const codeRegexMatch = trimmed.match(/\b(TAQDEER-[A-Z0-9-]+|TQ-[A-Z0-9-]+|VER-[A-Z0-9-]+|SEC-[A-Z0-9-]+|REF-[A-Z0-9-/]+|CERT-[A-Z0-9-]+)\b/i);
  if (codeRegexMatch && codeRegexMatch[1]) {
    return codeRegexMatch[1];
  }

  // 2. Check if user pasted a full URL
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.includes('?') || trimmed.includes('/')) {
    try {
      const url = new URL(trimmed.startsWith('http') ? trimmed : `https://example.com/${trimmed.startsWith('/') ? trimmed.slice(1) : trimmed}`);
      
      // Look for query parameter keys
      const code =
        url.searchParams.get('code') ||
        url.searchParams.get('verify') ||
        url.searchParams.get('id') ||
        url.searchParams.get('cert') ||
        url.searchParams.get('ref') ||
        url.searchParams.get('serial') ||
        url.searchParams.get('v');
      if (code) return code.trim();

      // Check Google Drive file link: /file/d/FILE_ID/view
      const driveMatch = url.pathname.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      if (driveMatch && driveMatch[1]) {
        return driveMatch[1];
      }

      // Check path parts
      const pathParts = url.pathname.split('/').filter(Boolean);
      if (pathParts.length >= 1) {
        const lastPart = pathParts[pathParts.length - 1];
        if (lastPart && !['verify', 'cert', 'd', 'portal', 'index.html', 'view'].includes(lastPart.toLowerCase())) {
          return lastPart.trim();
        }
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
 * Collects all known certificates across the entire local storage & active session & system drafts & templates & archive
 */
export function getAllVerifiableCertificates(activeCert?: CertificateData): VerifiableItem[] {
  const items: VerifiableItem[] = [];
  const seenUniqueKeys = new Set<string>();

  const registerCert = (
    cert: CertificateData | null | undefined,
    source: VerifiableItem['source'],
    batchTitle?: string
  ) => {
    if (!cert || typeof cert !== 'object') return;
    
    // Generate a unique fingerprint
    const cId = cert.id ? cert.id.trim() : '';
    const vCode = cert.verificationCode ? normalizeCode(cert.verificationCode) : '';
    const uniqueKey = vCode ? `code:${vCode}` : (cId ? `id:${cId}` : `name:${cert.studentName}_${cert.title}`);

    if (uniqueKey && seenUniqueKeys.has(uniqueKey)) {
      // Enrich existing record with any missing Drive links if present
      const existing = items.find(it => {
        const itCode = it.cert.verificationCode ? normalizeCode(it.cert.verificationCode) : '';
        const itId = it.cert.id ? it.cert.id.trim() : '';
        return (vCode && itCode === vCode) || (cId && itId === cId);
      });
      if (existing) {
        if (!existing.cert.driveFileWebViewLink && cert.driveFileWebViewLink) {
          existing.cert.driveFileWebViewLink = cert.driveFileWebViewLink;
        }
        if (!existing.cert.driveFileUrl && cert.driveFileUrl) {
          existing.cert.driveFileUrl = cert.driveFileUrl;
        }
      }
      return;
    }

    if (uniqueKey) seenUniqueKeys.add(uniqueKey);
    if (cId) seenUniqueKeys.add(`id:${cId}`);
    if (vCode) seenUniqueKeys.add(`code:${vCode}`);

    items.push({
      cert,
      source,
      batchTitle: batchTitle || (source === 'cloud' ? 'المكتبة السحابية' : source === 'batch' ? 'دفعة مجمعة' : 'النظام المعتمد')
    });
  };

  // 1. Active Editor Certificate
  if (activeCert && (activeCert.id || activeCert.studentName || activeCert.verificationCode)) {
    registerCert(activeCert, 'active', 'الشهادة الحالية بالمحرر');
  }

  // 2. Autosaved Active Certificate from LocalStorage
  try {
    const autosaved = localStorage.getItem('taqdeer_autosave_certificate');
    if (autosaved) {
      const parsed: CertificateData = JSON.parse(autosaved);
      if (parsed && typeof parsed === 'object' && parsed.studentName) {
        registerCert(parsed, 'active', 'شهادة قيد التحرير (المسودة التلقائية)');
      }
    }
  } catch (e) {
    console.error('Error reading taqdeer_autosave_certificate:', e);
  }

  // 3. Saved Cloud Certificates (taqdeer_saved_certs)
  try {
    const localSingle = localStorage.getItem('taqdeer_saved_certs');
    if (localSingle) {
      const parsed: CertificateData[] = JSON.parse(localSingle);
      if (Array.isArray(parsed)) {
        parsed.forEach(c => registerCert(c, 'cloud', 'المكتبة السحابية'));
      }
    }
  } catch (e) {
    console.error('Error reading taqdeer_saved_certs:', e);
  }

  // 4. Archived Certificates (taqdeer_archived_certificates_v1)
  try {
    const archived = localStorage.getItem('taqdeer_archived_certificates_v1');
    if (archived) {
      const parsed: CertificateData[] = JSON.parse(archived);
      if (Array.isArray(parsed)) {
        parsed.forEach(c => registerCert(c, 'cloud', 'الأرشيف السحابي المعتمد'));
      }
    }
  } catch (e) {
    console.error('Error reading taqdeer_archived_certificates_v1:', e);
  }

  // 5. Batches Certificates (taqdeer_batch_history_v1)
  try {
    const batches = getSavedBatches();
    batches.forEach((b: BatchRecord) => {
      if (b.certificates && Array.isArray(b.certificates)) {
        b.certificates.forEach(c => {
          registerCert(c, 'batch', b.title || `دفعة ${b.grade || 'فصل'}`);
        });
      }
    });
  } catch (e) {
    console.error('Error reading batches for verification:', e);
  }

  // 6. Drafts & Custom Saved Templates (taqdeer_saved_drafts_and_templates)
  try {
    const drafts = getSavedDrafts();
    drafts.forEach(d => {
      if (d && d.data) {
        registerCert(d.data, 'draft', d.type === 'template' ? `قالب محفوظ: ${d.name}` : `مسودة: ${d.name}`);
      }
    });
  } catch (e) {
    console.error('Error reading drafts for verification:', e);
  }

  // 7. Drive Verification Requests (taqdeer_drive_verification_requests_v1)
  try {
    const requests = getDriveVerificationRequests();
    requests.forEach(r => {
      if (r && (r.verificationCode || r.certificateId)) {
        const synthCert: Partial<CertificateData> = {
          id: r.certificateId || r.id,
          verificationCode: r.verificationCode,
          studentName: r.studentName,
          schoolName: r.schoolName,
          grade: r.grade,
          subject: r.subject,
          title: r.title || 'شهادة شكر وتقدير رسمية',
          recipientGender: r.recipientGender || 'male',
          driveFileUrl: r.driveFileUrl,
          driveFileWebViewLink: r.driveFileWebViewLink,
          issueDate: r.requestedAt ? r.requestedAt.split('T')[0] : new Date().toISOString().split('T')[0],
          isSavedCloud: true,
        };
        registerCert(synthCert as CertificateData, 'cloud', 'توثيق معتمد على Google Drive');
      }
    });
  } catch (e) {
    console.error('Error reading drive requests for verification:', e);
  }

  // 8. Archive Metadata Registry (taqdeer_archive_metadata_v1)
  try {
    const rawMeta = localStorage.getItem('taqdeer_archive_metadata_v1');
    if (rawMeta) {
      const metaList = JSON.parse(rawMeta);
      if (Array.isArray(metaList)) {
        metaList.forEach((m: any) => {
          if (m && (m.verificationCode || m.certId)) {
            const synthCert: Partial<CertificateData> = {
              id: m.certId || `arch-${m.verificationCode}`,
              verificationCode: m.verificationCode,
              studentName: m.studentName,
              schoolName: m.schoolName,
              grade: m.grade,
              subject: m.subject,
              title: 'شهادة شكر وتقدير رسمية',
              issueDate: m.archiveDate || (m.archivedAt ? m.archivedAt.split('T')[0] : new Date().toISOString().split('T')[0]),
              driveFileUrl: m.driveFileUrl,
              driveFileWebViewLink: m.driveFileUrl,
              isSavedCloud: true,
            };
            registerCert(synthCert as CertificateData, 'cloud', `سجل الأرشيف المعتمد (${m.academicYear || 'رسمي'})`);
          }
        });
      }
    }
  } catch (e) {
    console.error('Error reading archive metadata for verification:', e);
  }

  // 9. Built-in Template Presets
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
        registerCert(cert, 'template', `قالب رسمي: ${tmpl.name}`);
      }
    });
  } catch (e) {
    console.error('Error reading template presets for verification:', e);
  }

  return items;
}

/**
 * Searches for a certificate by code, ID, URL, Drive link, student name, or school name across all sources
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

  // 1. Exact Verification Code Match (normalized comparison)
  if (normalizedQuery) {
    match = allCerts.find(item => {
      const vCode = item.cert.verificationCode || '';
      return normalizeCode(vCode) === normalizedQuery;
    });
  }

  // 2. Exact or Normalized ID / certificateId Match
  if (!match && normalizedQuery) {
    match = allCerts.find(item => {
      const cId = item.cert.id || '';
      const cCertId = (item.cert as any).certificateId || '';
      return (
        normalizeCode(cId) === normalizedQuery ||
        normalizeCode(cCertId) === normalizedQuery ||
        cId.toLowerCase() === extractedCode.toLowerCase()
      );
    });
  }

  // 3. Certificate Reference Number Match (e.g. certNumber / REF-...)
  if (!match && normalizedQuery) {
    match = allCerts.find(item => {
      const cNum = item.cert.certNumber || '';
      return normalizeCode(cNum) === normalizedQuery;
    });
  }

  // 4. Google Drive URL or File ID Match
  if (!match) {
    const isDriveLink = cleanInput.includes('drive.google.com') || cleanInput.includes('docs.google.com');
    match = allCerts.find(item => {
      const dUrl = item.cert.driveFileUrl || '';
      const dView = item.cert.driveFileWebViewLink || '';
      const dId = item.cert.driveFileId || '';
      if (dId && extractedCode && dId === extractedCode) return true;
      if (isDriveLink) {
        return (dUrl && cleanInput.includes(dUrl)) || (dView && cleanInput.includes(dView)) ||
               (dUrl && dUrl.includes(cleanInput)) || (dView && dView.includes(cleanInput));
      }
      return false;
    });
  }

  // 5. Substring / Suffix Code Match (e.g. searching with partial code like last 4-8 digits)
  if (!match && normalizedQuery.length >= 4) {
    match = allCerts.find(item => {
      const vCodeNorm = normalizeCode(item.cert.verificationCode || '');
      const idNorm = normalizeCode(item.cert.id || '');
      const numNorm = normalizeCode(item.cert.certNumber || '');
      return (
        (vCodeNorm && (vCodeNorm.includes(normalizedQuery) || normalizedQuery.includes(vCodeNorm))) ||
        (idNorm && (idNorm.includes(normalizedQuery) || normalizedQuery.includes(idNorm))) ||
        (numNorm && (numNorm.includes(normalizedQuery) || normalizedQuery.includes(numNorm)))
      );
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
  const vUrl = foundCert.driveFileWebViewLink || foundCert.driveFileUrl || `${typeof window !== 'undefined' ? window.location.origin : ''}/?tab=verify&portal=true&code=${encodeURIComponent(vCode)}`;
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
