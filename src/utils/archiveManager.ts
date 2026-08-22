import { CertificateData, BatchRecord } from '../types';
import { generateVerificationCode } from './qrUtils';
import { generateCertificateChecksum } from './verificationService';
import { getSavedBatches } from './batchManager';

export interface AutoArchiveConfig {
  enabled: boolean;
  archiveOnPdfExport: boolean;
  archiveOnPngExport: boolean;
  archiveOnPrint: boolean;
  archiveOnBatchGenerate: boolean;
  archiveOnDriveUpload: boolean;
  autoGenerateCodeIfMissing: boolean;
  notifyOnAutoArchive: boolean;
}

export interface ArchiveRecordMetadata {
  certId: string;
  studentName: string;
  schoolName: string;
  grade: string;
  subject: string;
  verificationCode: string;
  archivedAt: string; // ISO String
  archiveDate: string; // YYYY-MM-DD
  academicYear: string;
  sourceEvent: 'export_pdf' | 'export_png' | 'print' | 'batch_generation' | 'manual_save' | 'cloud_sync';
  driveFileUrl?: string;
  checksum: string;
}

const CONFIG_KEY = 'taqdeer_auto_archive_config_v1';
const CERTS_KEY = 'taqdeer_saved_certs';
const METADATA_KEY = 'taqdeer_archive_metadata_v1';

export const DEFAULT_AUTO_ARCHIVE_CONFIG: AutoArchiveConfig = {
  enabled: true,
  archiveOnPdfExport: true,
  archiveOnPngExport: true,
  archiveOnPrint: true,
  archiveOnBatchGenerate: true,
  archiveOnDriveUpload: true,
  autoGenerateCodeIfMissing: true,
  notifyOnAutoArchive: true,
};

// In-memory subscribers
const archiveListeners: Array<() => void> = [];

export function subscribeToArchiveChanges(callback: () => void): () => void {
  archiveListeners.push(callback);
  return () => {
    const idx = archiveListeners.indexOf(callback);
    if (idx !== -1) {
      archiveListeners.splice(idx, 1);
    }
  };
}

export function notifyArchiveChanged() {
  archiveListeners.forEach(cb => {
    try {
      cb();
    } catch (e) {
      console.warn('Archive listener error:', e);
    }
  });

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('taqdeer_archive_updated'));
  }
}

/**
 * Get current Auto-Archive settings
 */
export function getAutoArchiveConfig(): AutoArchiveConfig {
  if (typeof window === 'undefined') return DEFAULT_AUTO_ARCHIVE_CONFIG;
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) {
      return { ...DEFAULT_AUTO_ARCHIVE_CONFIG, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.error('Error loading auto-archive config:', e);
  }
  return DEFAULT_AUTO_ARCHIVE_CONFIG;
}

/**
 * Save Auto-Archive settings
 */
export function saveAutoArchiveConfig(config: Partial<AutoArchiveConfig>): AutoArchiveConfig {
  const updated = { ...getAutoArchiveConfig(), ...config };
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(CONFIG_KEY, JSON.stringify(updated));
      notifyArchiveChanged();
    } catch (e) {
      console.error('Error saving auto-archive config:', e);
    }
  }
  return updated;
}

/**
 * Derives the academic year based on date (e.g. "1447-1448هـ / 2025-2026م")
 */
export function deriveAcademicYear(dateStr?: string): string {
  const d = dateStr ? new Date(dateStr) : new Date();
  const year = isNaN(d.getFullYear()) ? new Date().getFullYear() : d.getFullYear();
  const month = isNaN(d.getMonth()) ? new Date().getMonth() + 1 : d.getMonth() + 1;

  // In Saudi/Gulf school system, school year starts in August/September
  if (month >= 8) {
    return `${year} - ${year + 1}م`;
  } else {
    return `${year - 1} - ${year}م`;
  }
}

/**
 * Formats a clean date key (YYYY-MM-DD)
 */
export function formatArchiveDateKey(dateInput?: string): string {
  if (!dateInput) return new Date().toISOString().slice(0, 10);
  try {
    const d = new Date(dateInput);
    if (!isNaN(d.getTime())) {
      return d.toISOString().slice(0, 10);
    }
  } catch {}
  return new Date().toISOString().slice(0, 10);
}

/**
 * Normalizes school name for classification
 */
export function normalizeSchoolName(schoolName?: string): string {
  if (!schoolName || !schoolName.trim()) {
    return 'مدرسة عامة / غير محدد';
  }
  return schoolName.trim();
}

/**
 * Load raw saved certificates from LocalStorage
 */
export function getStoredCloudCertificates(): CertificateData[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CERTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error reading stored cloud certs:', e);
  }
  return [];
}

/**
 * Automatically archives a completed certificate into the Cloud Library
 */
export function autoArchiveCertificate(
  cert: CertificateData,
  options: {
    event?: 'export_pdf' | 'export_png' | 'print' | 'batch_generation' | 'manual_save' | 'cloud_sync';
    silent?: boolean;
    force?: boolean;
  } = {}
): { success: boolean; archivedCert: CertificateData; isNew: boolean } {
  if (!cert) {
    return { success: false, archivedCert: cert, isNew: false };
  }

  const config = getAutoArchiveConfig();
  if (!config.enabled && !options.force) {
    return { success: false, archivedCert: cert, isNew: false };
  }

  // Check event-specific triggers
  if (!options.force) {
    if (options.event === 'export_pdf' && !config.archiveOnPdfExport) return { success: false, archivedCert: cert, isNew: false };
    if (options.event === 'export_png' && !config.archiveOnPngExport) return { success: false, archivedCert: cert, isNew: false };
    if (options.event === 'print' && !config.archiveOnPrint) return { success: false, archivedCert: cert, isNew: false };
    if (options.event === 'batch_generation' && !config.archiveOnBatchGenerate) return { success: false, archivedCert: cert, isNew: false };
  }

  // Ensure verification code exists for reliable archival tracking
  const vCode = cert.verificationCode || (config.autoGenerateCodeIfMissing ? generateVerificationCode(cert.id) : `TQ-${Date.now().toString(36).toUpperCase()}`);
  const nowIso = new Date().toISOString();
  const dateKey = formatArchiveDateKey(cert.issueDate || cert.issueDateGregorian || nowIso);
  const schoolName = normalizeSchoolName(cert.schoolName);
  const acadYear = deriveAcademicYear(cert.issueDate || nowIso);

  const enrichedCert: CertificateData = {
    ...cert,
    verificationCode: vCode,
    isSavedCloud: true,
    archivedAt: nowIso,
    archiveDate: dateKey,
    academicYear: acadYear,
    schoolName: cert.schoolName || schoolName,
    archiveStatus: 'completed',
    qrCodeData: cert.qrCodeData || `${typeof window !== 'undefined' ? window.location.origin : ''}/verify?code=${vCode}`,
    updatedAt: nowIso,
  };

  try {
    const list = getStoredCloudCertificates();
    const existingIndex = list.findIndex(c => c.id === cert.id || (c.verificationCode && c.verificationCode === vCode));
    let isNew = false;

    let updatedList: CertificateData[];
    if (existingIndex >= 0) {
      updatedList = [...list];
      updatedList[existingIndex] = {
        ...list[existingIndex],
        ...enrichedCert,
        updatedAt: nowIso,
      };
    } else {
      isNew = true;
      updatedList = [enrichedCert, ...list];
    }

    // Limit single list storage safely
    if (updatedList.length > 500) {
      updatedList = updatedList.slice(0, 500);
    }

    localStorage.setItem(CERTS_KEY, JSON.stringify(updatedList));

    // Also update archive metadata registry
    recordArchiveMetadata({
      certId: enrichedCert.id,
      studentName: enrichedCert.studentName || 'طالب متميز',
      schoolName: enrichedCert.schoolName || schoolName,
      grade: enrichedCert.grade || '',
      subject: enrichedCert.subject || '',
      verificationCode: vCode,
      archivedAt: nowIso,
      archiveDate: dateKey,
      academicYear: acadYear,
      sourceEvent: options.event || 'manual_save',
      driveFileUrl: enrichedCert.driveFileWebViewLink || enrichedCert.driveFileUrl,
      checksum: generateCertificateChecksum(enrichedCert),
    });

    notifyArchiveChanged();
    return { success: true, archivedCert: enrichedCert, isNew };
  } catch (e) {
    console.error('Error auto-archiving certificate:', e);
    return { success: false, archivedCert: cert, isNew: false };
  }
}

/**
 * Automatically archives an entire batch of completed certificates
 */
export function autoArchiveBatchCertificates(
  certs: CertificateData[],
  batchTitle: string,
  schoolNameFallback?: string
): { success: boolean; count: number } {
  if (!certs || certs.length === 0) return { success: false, count: 0 };

  const config = getAutoArchiveConfig();
  if (!config.enabled && !config.archiveOnBatchGenerate) {
    return { success: false, count: 0 };
  }

  let count = 0;
  certs.forEach(cert => {
    const certWithSchool = {
      ...cert,
      schoolName: cert.schoolName || schoolNameFallback || 'مدارس رواد التميز'
    };
    const res = autoArchiveCertificate(certWithSchool, {
      event: 'batch_generation',
      silent: true,
      force: true
    });
    if (res.success) count++;
  });

  return { success: true, count };
}

/**
 * Save metadata record to local registry
 */
function recordArchiveMetadata(meta: ArchiveRecordMetadata) {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(METADATA_KEY);
    const list: ArchiveRecordMetadata[] = raw ? JSON.parse(raw) : [];
    const idx = list.findIndex(m => m.certId === meta.certId || m.verificationCode === meta.verificationCode);
    if (idx >= 0) {
      list[idx] = meta;
    } else {
      list.unshift(meta);
    }
    localStorage.setItem(METADATA_KEY, JSON.stringify(list.slice(0, 1000)));
  } catch (e) {
    console.warn('Error recording archive metadata:', e);
  }
}

/**
 * Group certificates by School Name
 */
export interface SchoolGroupArchive {
  schoolName: string;
  totalCertificates: number;
  latestArchivedAt: string;
  grades: string[];
  certificates: any[];
}

export function groupCertificatesBySchool(certificates: any[]): SchoolGroupArchive[] {
  const map = new Map<string, { certs: any[]; latest: string; grades: Set<string> }>();

  certificates.forEach(cert => {
    const school = normalizeSchoolName(cert.schoolName);
    if (!map.has(school)) {
      map.set(school, { certs: [], latest: '', grades: new Set<string>() });
    }
    const group = map.get(school)!;
    group.certs.push(cert);

    const dateVal = cert.archivedAt || cert.updatedAt || cert.createdAt || '';
    if (!group.latest || dateVal > group.latest) {
      group.latest = dateVal;
    }

    if (cert.grade && cert.grade.trim()) {
      group.grades.add(cert.grade.trim());
    }
  });

  const result: SchoolGroupArchive[] = [];
  map.forEach((value, schoolName) => {
    result.push({
      schoolName,
      totalCertificates: value.certs.length,
      latestArchivedAt: value.latest,
      grades: Array.from(value.grades),
      certificates: value.certs,
    });
  });

  // Sort descending by total certificates count then alphabetically
  return result.sort((a, b) => b.totalCertificates - a.totalCertificates || a.schoolName.localeCompare(b.schoolName));
}

/**
 * Group certificates by Date (Month / Academic Year)
 */
export interface DateGroupArchive {
  periodKey: string; // e.g. "2026-08" or "2026"
  periodLabel: string; // e.g. "أغسطس 2026"
  academicYear?: string;
  totalCertificates: number;
  latestDate: string;
  schoolsCount: number;
  certificates: any[];
}

const ARABIC_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

export function groupCertificatesByDate(
  certificates: any[],
  groupBy: 'month' | 'year' | 'day' = 'month'
): DateGroupArchive[] {
  const map = new Map<string, { label: string; certs: any[]; latest: string; schools: Set<string>; academicYear: string }>();

  certificates.forEach(cert => {
    const rawDate = cert.archiveDate || cert.issueDate || cert.updatedAt || cert.createdAt || new Date().toISOString();
    let d = new Date(rawDate);
    if (isNaN(d.getTime())) d = new Date();

    const year = d.getFullYear();
    const month = d.getMonth(); // 0-11
    const day = d.getDate();

    let key = '';
    let label = '';
    const academicYear = deriveAcademicYear(rawDate);

    if (groupBy === 'month') {
      key = `${year}-${String(month + 1).padStart(2, '0')}`;
      label = `${ARABIC_MONTHS[month]} ${year}م`;
    } else if (groupBy === 'year') {
      key = `${year}`;
      label = `عام ${year}م`;
    } else {
      key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      label = `${day} ${ARABIC_MONTHS[month]} ${year}م`;
    }

    if (!map.has(key)) {
      map.set(key, { label, certs: [], latest: '', schools: new Set<string>(), academicYear });
    }

    const group = map.get(key)!;
    group.certs.push(cert);

    const dateVal = cert.archivedAt || cert.updatedAt || cert.createdAt || '';
    if (!group.latest || dateVal > group.latest) {
      group.latest = dateVal;
    }

    const school = normalizeSchoolName(cert.schoolName);
    group.schools.add(school);
  });

  const result: DateGroupArchive[] = [];
  map.forEach((value, periodKey) => {
    result.push({
      periodKey,
      periodLabel: value.label,
      academicYear: value.academicYear,
      totalCertificates: value.certs.length,
      latestDate: value.latest,
      schoolsCount: value.schools.size,
      certificates: value.certs,
    });
  });

  // Sort descending by periodKey (newest dates first)
  return result.sort((a, b) => b.periodKey.localeCompare(a.periodKey));
}

/**
 * Archive summary statistics
 */
export function getArchiveOverviewStats(certificates: any[]) {
  const total = certificates.length;
  const schools = new Set<string>();
  const driveVerified = certificates.filter(c => !!(c.driveFileWebViewLink || c.driveFileUrl || c.driveFileId)).length;
  const singleCerts = certificates.filter(c => c._sourceType === 'single').length;
  const batchCerts = certificates.filter(c => c._sourceType === 'batch').length;

  certificates.forEach(c => {
    schools.add(normalizeSchoolName(c.schoolName));
  });

  return {
    total,
    schoolsCount: schools.size,
    driveVerified,
    drivePending: total - driveVerified,
    singleCerts,
    batchCerts,
  };
}
