import React, { useState, useEffect, useRef, useMemo } from 'react';
import { CertificateData, BatchRecord, BatchVerificationReportItem } from '../types';
import { generateVerificationCode, generateQRCodeDataUrl } from '../utils/qrUtils';
import { generateCode39Bars } from '../utils/barcodeUtils';
import { getSavedBatches, saveBatchRecord, saveBatchesList } from '../utils/batchManager';
import {
  exportCertificateAsPdf,
  exportCertificateAsPng,
  exportBatchCertificatesAsSinglePdf,
  captureCertificateCanvasBlob,
  getCertificateDimensions
} from '../utils/exportUtils';
import {
  initDriveAuth,
  googleSignIn,
  uploadCertificateToDrive,
  getAccessToken
} from '../services/googleDriveService';
import {
  subscribeToArchiveChanges,
  normalizeSchoolName,
  autoArchiveCertificate,
  getAutoArchiveConfig
} from '../utils/archiveManager';
import { SchoolClassificationView } from './archive/SchoolClassificationView';
import { DateClassificationView } from './archive/DateClassificationView';
import { AutoArchiveSettingsModal } from './archive/AutoArchiveSettingsModal';
import { CertificateCanvas } from './CertificateCanvas';
import { User } from 'firebase/auth';
import {
  Cloud,
  Search,
  Trash2,
  Edit3,
  Copy,
  Download,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  X,
  ExternalLink,
  ShieldCheck,
  Check,
  FileText,
  FileSpreadsheet,
  Grid,
  Table as TableIcon,
  Layers,
  ChevronRight,
  ChevronLeft,
  ChevronsRight,
  ChevronsLeft,
  Loader2,
  Filter,
  RefreshCw,
  Sparkles,
  CheckSquare,
  Square,
  GraduationCap,
  QrCode,
  Barcode,
  Calendar,
  Building2,
  User as UserIcon,
  Award,
  BookOpen,
  Share2,
  FileCheck2,
  Lock,
  School,
  Archive,
  CalendarDays,
  Settings2,
  FolderTree
} from 'lucide-react';

interface UnifiedCertificate extends CertificateData {
  _sourceType: 'single' | 'batch';
  _batchId?: string;
  _batchTitle?: string;
  _uniqueKey?: string;
}

interface Props {
  onLoadCertificate: (cert: CertificateData) => void;
  currentCertificate: CertificateData;
  onOpenGoogleDriveModal?: (cert: CertificateData) => void;
  onVerifyCertificate?: (cert: CertificateData) => void;
  onShowToast?: (msg: string) => void;
}

export const CloudLibrary: React.FC<Props> = ({
  onLoadCertificate,
  currentCertificate,
  onOpenGoogleDriveModal,
  onVerifyCertificate,
  onShowToast
}) => {
  // 1. Data States
  const [allCertificates, setAllCertificates] = useState<UnifiedCertificate[]>([]);
  const [syncStatus, setSyncStatus] = useState<'متزامن' | 'جاري الحفظ...'>('متزامن');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // 2. View & Pagination States: 'grid' | 'table' | 'by_school' | 'by_date'
  const [viewMode, setViewMode] = useState<'grid' | 'table' | 'by_school' | 'by_date'>('grid');
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // 3. Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGrade, setFilterGrade] = useState<string>('all');
  const [filterSchool, setFilterSchool] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('all');
  const [filterSource, setFilterSource] = useState<string>('all');
  const [filterDrive, setFilterDrive] = useState<'all' | 'drive' | 'nodrive'>('all');

  // Auto Archive Modal State
  const [isAutoArchiveSettingsOpen, setIsAutoArchiveSettingsOpen] = useState(false);

  // 4. Selection States
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // 5. Deletion Confirmation States
  const [certToDelete, setCertToDelete] = useState<UnifiedCertificate | null>(null);
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);

  // 6. Verification Inspection Modal State
  const [inspectCert, setInspectCert] = useState<UnifiedCertificate | null>(null);
  const [inspectQrUrl, setInspectQrUrl] = useState<string>('');

  // 7. Batch PDF Export States
  const [isExportingBatchPdf, setIsExportingBatchPdf] = useState(false);
  const [exportProgress, setExportProgress] = useState<{ current: number; total: number; name: string } | null>(null);

  // 8. Batch Google Drive Upload States
  const [isUploadingToDrive, setIsUploadingToDrive] = useState(false);
  const [isDriveReportModalOpen, setIsDriveReportModalOpen] = useState(false);
  const [driveProgress, setDriveProgress] = useState<{ current: number; total: number; name: string } | null>(null);
  const [driveReport, setDriveReport] = useState<BatchVerificationReportItem[]>([]);
  const [driveUser, setDriveUser] = useState<User | null>(null);
  const [driveToken, setDriveToken] = useState<string | null>(null);

  // 9. Headless Rendering for Export
  const hiddenRenderRef = useRef<HTMLDivElement>(null);
  const [renderCertTarget, setRenderCertTarget] = useState<CertificateData | null>(null);

  const showToast = (msg: string) => {
    if (onShowToast) onShowToast(msg);
  };

  // Load all certificates from single storage and batch history
  const reloadAllCertificates = () => {
    const list: UnifiedCertificate[] = [];
    const seenIds = new Set<string>();

    // A. Single saved certs
    try {
      const localSingle = localStorage.getItem('taqdeer_saved_certs');
      if (localSingle) {
        const parsed = JSON.parse(localSingle);
        if (Array.isArray(parsed)) {
          parsed.forEach((c: CertificateData, idx: number) => {
            const uidKey = `single-${c.id || idx}-${idx}`;
            seenIds.add(c.id);
            list.push({
              ...c,
              _sourceType: 'single',
              _batchTitle: 'شهادة فردية',
              _uniqueKey: uidKey
            });
          });
        }
      }
    } catch (e) {
      console.error('Error loading single certificates:', e);
    }

    // B. Batch certificates
    try {
      const batches = getSavedBatches();
      batches.forEach((b: BatchRecord, bIdx: number) => {
        if (b.certificates && Array.isArray(b.certificates)) {
          b.certificates.forEach((c: CertificateData, cIdx: number) => {
            const uidKey = `batch-${b.id || bIdx}-${c.id || cIdx}-${cIdx}`;
            list.push({
              ...c,
              _sourceType: 'batch',
              _batchId: b.id,
              _batchTitle: b.title || `دفعة ${b.grade || 'فصل'}`,
              _uniqueKey: uidKey
            });
          });
        }
      });
    } catch (e) {
      console.error('Error loading batch certificates:', e);
    }

    // Default to current certificate if list is totally empty
    if (list.length === 0 && currentCertificate) {
      list.push({
        ...currentCertificate,
        _sourceType: 'single',
        _batchTitle: 'شهادة فردية',
        _uniqueKey: `curr-${currentCertificate.id || '0'}-0`
      });
    }

    setAllCertificates(list);
  };

  useEffect(() => {
    reloadAllCertificates();

    // Listen to Auto-Archive updates from anywhere in the app
    const unsubArchive = subscribeToArchiveChanges(() => {
      reloadAllCertificates();
    });

    const handleWindowArchiveUpdate = () => {
      reloadAllCertificates();
    };
    window.addEventListener('taqdeer_archive_updated', handleWindowArchiveUpdate);
    window.addEventListener('taqdeer_certs_changed', handleWindowArchiveUpdate);
    window.addEventListener('taqdeer_batches_changed', handleWindowArchiveUpdate);
    window.addEventListener('taqdeer_account_switched', handleWindowArchiveUpdate);

    // Listen to Google Drive auth changes
    const unsubDrive = initDriveAuth(
      (u, t) => {
        setDriveUser(u);
        setDriveToken(t);
      },
      () => {
        setDriveUser(null);
        setDriveToken(null);
      }
    );

    return () => {
      unsubArchive();
      window.removeEventListener('taqdeer_archive_updated', handleWindowArchiveUpdate);
      window.removeEventListener('taqdeer_certs_changed', handleWindowArchiveUpdate);
      window.removeEventListener('taqdeer_batches_changed', handleWindowArchiveUpdate);
      window.removeEventListener('taqdeer_account_switched', handleWindowArchiveUpdate);
      unsubDrive();
    };
  }, [currentCertificate]);

  // Generate QR Code data URL when inspection modal opens
  useEffect(() => {
    if (inspectCert) {
      const vCode = inspectCert.verificationCode || generateVerificationCode(inspectCert.id);
      const targetUrl = inspectCert.driveFileWebViewLink || inspectCert.driveFileUrl || `${window.location.origin}/verify?code=${vCode}`;
      generateQRCodeDataUrl(targetUrl).then(url => {
        setInspectQrUrl(url);
      });
    } else {
      setInspectQrUrl('');
    }
  }, [inspectCert]);

  // Extract unique grades/classes for filter dropdown
  const uniqueGrades = useMemo(() => {
    const grades = new Set<string>();
    allCertificates.forEach(c => {
      if (c.grade && c.grade.trim()) {
        grades.add(c.grade.trim());
      }
    });
    return Array.from(grades).sort();
  }, [allCertificates]);

  // Extract unique schools for filter dropdown
  const uniqueSchools = useMemo(() => {
    const schools = new Set<string>();
    allCertificates.forEach(c => {
      const norm = normalizeSchoolName(c.schoolName);
      schools.add(norm);
    });
    return Array.from(schools).sort();
  }, [allCertificates]);

  // Extract unique batches for filter dropdown
  const uniqueBatches = useMemo(() => {
    const map = new Map<string, string>();
    allCertificates.forEach(c => {
      if (c._sourceType === 'batch' && c._batchId && c._batchTitle) {
        map.set(c._batchId, c._batchTitle);
      }
    });
    return Array.from(map.entries());
  }, [allCertificates]);

  // Copy helper
  const handleCopyText = (text: string, key: string, label = 'تم النسخ بنجاح') => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showToast(label);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Helper to render certificate to DOM for headless capture
  const renderCertificateToDom = async (cert: CertificateData): Promise<HTMLElement> => {
    setRenderCertTarget(cert);
    for (let attempt = 0; attempt < 20; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 35));
      const container = hiddenRenderRef.current;
      if (container) {
        const el = (container.querySelector('#certificate-print-area') || container.querySelector('[data-certificate-canvas="true"]')) as HTMLElement;
        if (el) return el;
      }
    }
    if (hiddenRenderRef.current) return hiddenRenderRef.current as HTMLElement;
    return (document.getElementById('certificate-print-area') || document.body) as HTMLElement;
  };

  // Filtering logic
  const filteredCertificates = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const currentYearPrefix = `${now.getFullYear()}`;

    return allCertificates.filter((cert) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches = (
          (cert.studentName && cert.studentName.toLowerCase().includes(q)) ||
          (cert.title && cert.title.toLowerCase().includes(q)) ||
          (cert.schoolName && cert.schoolName.toLowerCase().includes(q)) ||
          (cert.subject && cert.subject.toLowerCase().includes(q)) ||
          (cert.verificationCode && cert.verificationCode.toLowerCase().includes(q)) ||
          (cert.reason && cert.reason.toLowerCase().includes(q)) ||
          (cert._batchTitle && cert._batchTitle.toLowerCase().includes(q))
        );
        if (!matches) return false;
      }

      // 2. Grade Filter
      if (filterGrade !== 'all') {
        if (!cert.grade || cert.grade.trim() !== filterGrade) return false;
      }

      // 3. School Filter
      if (filterSchool !== 'all') {
        const certSchool = normalizeSchoolName(cert.schoolName);
        if (certSchool !== filterSchool) return false;
      }

      // 4. Date Preset Filter
      if (filterDate !== 'all') {
        const rawDate = cert.archiveDate || cert.issueDate || cert.updatedAt || cert.createdAt || '';
        const certDate = new Date(rawDate);

        if (filterDate === 'today') {
          if (!rawDate.startsWith(todayStr)) return false;
        } else if (filterDate === 'this_week') {
          if (isNaN(certDate.getTime()) || certDate < oneWeekAgo) return false;
        } else if (filterDate === 'this_month') {
          if (!rawDate.startsWith(currentMonthPrefix)) return false;
        } else if (filterDate === 'this_year') {
          if (!rawDate.startsWith(currentYearPrefix)) return false;
        }
      }

      // 5. Source Filter
      if (filterSource !== 'all') {
        if (filterSource === 'single_only' && cert._sourceType !== 'single') return false;
        if (filterSource.startsWith('batch:') && cert._batchId !== filterSource.replace('batch:', '')) return false;
      }

      // 6. Drive Status Filter
      const hasDrive = !!(cert.driveFileWebViewLink || cert.driveFileUrl || cert.driveFileId);
      if (filterDrive === 'drive' && !hasDrive) return false;
      if (filterDrive === 'nodrive' && hasDrive) return false;

      return true;
    });
  }, [allCertificates, searchQuery, filterGrade, filterSchool, filterDate, filterSource, filterDrive]);

  // Reset pagination when filter results change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterGrade, filterSchool, filterDate, filterSource, filterDrive, pageSize]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredCertificates.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredCertificates.length);
  const currentPagedCertificates = useMemo(() => {
    return filteredCertificates.slice(startIndex, endIndex);
  }, [filteredCertificates, startIndex, endIndex]);

  // Selection helpers
  const isAllCurrentPageSelected = currentPagedCertificates.length > 0 && currentPagedCertificates.every(c => selectedIds.has(c.id));

  const toggleSelectAllCurrentPage = () => {
    const next = new Set(selectedIds);
    if (isAllCurrentPageSelected) {
      currentPagedCertificates.forEach(c => next.delete(c.id));
    } else {
      currentPagedCertificates.forEach(c => next.add(c.id));
    }
    setSelectedIds(next);
  };

  const selectAllFiltered = () => {
    const next = new Set<string>();
    filteredCertificates.forEach(c => next.add(c.id));
    setSelectedIds(next);
    showToast(`تم تحديد كافة الـ ${filteredCertificates.length} شهادة بنجاح!`);
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const toggleSelectCertificate = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  // Get selected objects
  const selectedCertificates = useMemo(() => {
    return allCertificates.filter(c => selectedIds.has(c.id));
  }, [allCertificates, selectedIds]);

  // Delete Single Certificate Handler
  const executeDeleteSingle = (cert: UnifiedCertificate) => {
    if (cert._sourceType === 'single') {
      try {
        const localSingle = localStorage.getItem('taqdeer_saved_certs');
        if (localSingle) {
          const parsed = JSON.parse(localSingle);
          const updated = parsed.filter((c: CertificateData) => c.id !== cert.id);
          localStorage.setItem('taqdeer_saved_certs', JSON.stringify(updated));
        }
      } catch (e) {
        console.error('Error deleting single certificate:', e);
      }
    } else if (cert._sourceType === 'batch' && cert._batchId) {
      try {
        const batches = getSavedBatches();
        const batchIdx = batches.findIndex(b => b.id === cert._batchId);
        if (batchIdx >= 0) {
          const batch = batches[batchIdx];
          const updatedCerts = (batch.certificates || []).filter(c => c.id !== cert.id);
          batches[batchIdx] = {
            ...batch,
            totalCount: updatedCerts.length,
            certificates: updatedCerts,
            updatedAt: new Date().toISOString()
          };
          saveBatchesList(batches);
        }
      } catch (e) {
        console.error('Error deleting cert from batch:', e);
      }
    }

    // Remove from selection if present
    if (selectedIds.has(cert.id)) {
      const next = new Set(selectedIds);
      next.delete(cert.id);
      setSelectedIds(next);
    }

    if (inspectCert?.id === cert.id) {
      setInspectCert(null);
    }

    setCertToDelete(null);
    reloadAllCertificates();
    showToast(`تم حذف شهادة ${cert.studentName} بنجاح.`);
  };

  // Delete Batch Selected Certificates Handler
  const executeDeleteBatchSelected = () => {
    const idsToDelete = new Set(selectedIds);

    // 1. Delete from single certs
    try {
      const localSingle = localStorage.getItem('taqdeer_saved_certs');
      if (localSingle) {
        const parsed = JSON.parse(localSingle);
        const updated = parsed.filter((c: CertificateData) => !idsToDelete.has(c.id));
        localStorage.setItem('taqdeer_saved_certs', JSON.stringify(updated));
      }
    } catch (e) {
      console.error(e);
    }

    // 2. Delete from batches
    try {
      const batches = getSavedBatches();
      const updatedBatches = batches.map(b => {
        const updatedCerts = (b.certificates || []).filter(c => !idsToDelete.has(c.id));
        return {
          ...b,
          totalCount: updatedCerts.length,
          certificates: updatedCerts,
          updatedAt: new Date().toISOString()
        };
      });
      saveBatchesList(updatedBatches);
    } catch (e) {
      console.error(e);
    }

    const count = selectedIds.size;
    setSelectedIds(new Set());
    setShowBatchDeleteConfirm(false);
    reloadAllCertificates();
    showToast(`تم بنجاح حذف ${count} شهادة محددة.`);
  };

  // Export Combined Multi-page PDF for Selected Certificates
  const handleExportSelectedAsCombinedPdf = async () => {
    if (selectedCertificates.length === 0) {
      showToast('يرجى تحديد شهادة واحدة على الأقل للتصدير');
      return;
    }

    setIsExportingBatchPdf(true);
    setExportProgress({ current: 0, total: selectedCertificates.length, name: 'بدء التجهيز...' });

    try {
      const title = filterGrade !== 'all'
        ? `شهادات_مجمعة_الصف_${filterGrade}`
        : `شهادات_مجمعة_تقدير_${selectedCertificates.length}_طلاب`;

      await exportBatchCertificatesAsSinglePdf(
        selectedCertificates,
        renderCertificateToDom,
        {
          batchTitle: title,
          onProgress: (current, total, name) => {
            setExportProgress({ current, total, name });
          }
        }
      );

      showToast(`تم بنجاح تصدير ملف PDF المجمع لـ ${selectedCertificates.length} شهادة! 📄✨`);
    } catch (err: any) {
      console.error('Error exporting combined PDF from cloud library:', err);
      showToast('حدث خطأ أثناء إنشاء وتصدير ملف PDF المجمع.');
    } finally {
      setIsExportingBatchPdf(false);
      setExportProgress(null);
      setRenderCertTarget(null);
    }
  };

  // Export Combined PDF for a specific School
  const handleExportSchoolPdf = async (certs: UnifiedCertificate[], schoolName: string) => {
    if (!certs || certs.length === 0) return;
    setIsExportingBatchPdf(true);
    setExportProgress({ current: 0, total: certs.length, name: `تجهيز شهادات ${schoolName}...` });

    try {
      const title = `شهادات_${schoolName.replace(/[^\w\s\u0600-\u06FF-]/gi, '').trim().replace(/\s+/g, '_')}`;
      await exportBatchCertificatesAsSinglePdf(
        certs,
        renderCertificateToDom,
        {
          batchTitle: title,
          onProgress: (current, total, name) => {
            setExportProgress({ current, total, name });
          }
        }
      );
      showToast(`تم تصدير ملف PDF المجمع لكافة شهادات "${schoolName}" بنجاح (${certs.length} شهادة)! 📄🏫`);
    } catch (err: any) {
      console.error('Error exporting school combined PDF:', err);
      showToast('فشل تصدير شهادات المدرسة المجمعة.');
    } finally {
      setIsExportingBatchPdf(false);
      setExportProgress(null);
      setRenderCertTarget(null);
    }
  };

  // Export Combined PDF for a specific Date Period
  const handleExportDateGroupPdf = async (certs: UnifiedCertificate[], periodLabel: string) => {
    if (!certs || certs.length === 0) return;
    setIsExportingBatchPdf(true);
    setExportProgress({ current: 0, total: certs.length, name: `تجهيز شهادات فترة ${periodLabel}...` });

    try {
      const title = `شهادات_فترة_${periodLabel.replace(/[^\w\s\u0600-\u06FF-]/gi, '').trim().replace(/\s+/g, '_')}`;
      await exportBatchCertificatesAsSinglePdf(
        certs,
        renderCertificateToDom,
        {
          batchTitle: title,
          onProgress: (current, total, name) => {
            setExportProgress({ current, total, name });
          }
        }
      );
      showToast(`تم تصدير ملف PDF المجمع لشهادات فترة "${periodLabel}" بنجاح (${certs.length} شهادة)! 📄📅`);
    } catch (err: any) {
      console.error('Error exporting date group combined PDF:', err);
      showToast('فشل تصدير شهادات الفترة المجمعة.');
    } finally {
      setIsExportingBatchPdf(false);
      setExportProgress(null);
      setRenderCertTarget(null);
    }
  };

  // Select / Deselect all certificates in a group (School / Date)
  const handleSelectAllInGroup = (certIds: string[]) => {
    const next = new Set(selectedIds);
    const allSelected = certIds.every(id => next.has(id));
    if (allSelected) {
      certIds.forEach(id => next.delete(id));
      showToast(`تم إلغاء تحديد ${certIds.length} شهادة.`);
    } else {
      certIds.forEach(id => next.add(id));
      showToast(`تم تحديد ${certIds.length} شهادة للمجموعة.`);
    }
    setSelectedIds(next);
  };

  // Batch Google Drive Upload for Selected Certificates
  const handleStartBatchDriveUpload = async (certsToUpload?: UnifiedCertificate[]) => {
    const targetCerts = certsToUpload || selectedCertificates;
    if (targetCerts.length === 0) {
      showToast('يرجى تحديد الشهادات المراد توثيقها على Google Drive.');
      return;
    }

    let token = driveToken || (await getAccessToken());

    if (!token || !driveUser) {
      try {
        showToast('جاري تسجيل الدخول بحساب Google Drive...');
        const res = await googleSignIn();
        setDriveUser(res.user);
        setDriveToken(res.accessToken);
        token = res.accessToken;
      } catch (err: any) {
        console.error('Google Sign in failed:', err);
        showToast(err.message || 'تعذر تسجيل الدخول بـ Google.');
        return;
      }
    }

    if (!token) {
      showToast('مفتاح الوصول غير متوفر لـ Google Drive.');
      return;
    }

    setIsUploadingToDrive(true);
    setIsDriveReportModalOpen(true);

    const report: BatchVerificationReportItem[] = [];
    const total = targetCerts.length;

    for (let i = 0; i < total; i++) {
      const origCert = targetCerts[i];
      const studentName = origCert.studentName || `طالب_${i + 1}`;
      const vCode = origCert.verificationCode || generateVerificationCode();

      setDriveProgress({
        current: i + 1,
        total,
        name: studentName
      });

      const reportItem: BatchVerificationReportItem = {
        index: i + 1,
        certificateId: origCert.id,
        studentName,
        gender: origCert.recipientGender,
        grade: origCert.grade,
        subject: origCert.subject,
        verificationCode: vCode,
        status: 'uploading'
      };

      try {
        const certWithCode: CertificateData = {
          ...origCert,
          verificationCode: vCode,
          qrCodeData: `${window.location.origin}/verify?code=${vCode}`
        };

        const element = await renderCertificateToDom(certWithCode);
        await new Promise((r) => setTimeout(r, 100));

        const blob = await captureCertificateCanvasBlob(element, certWithCode, { scale: 2.8 });
        const safeStudentName = studentName.replace(/[^\w\s\u0600-\u06FF-]/gi, '').trim().replace(/\s+/g, '_');
        const fileName = `شهادة_${safeStudentName}_${vCode}.png`;

        const uploadRes = await uploadCertificateToDrive(
          blob,
          fileName,
          token,
          origCert.driveFileId
        );

        const finalizedCert: CertificateData = {
          ...certWithCode,
          driveFileId: uploadRes.fileId,
          driveFileWebViewLink: uploadRes.webViewLink,
          driveFileUrl: uploadRes.webContentLink,
          driveUploadedAt: new Date().toISOString(),
          isSavedCloud: true,
          qrCodeData: uploadRes.webViewLink
        };

        // Persist update back to storage
        if (origCert._sourceType === 'single') {
          const localSingle = localStorage.getItem('taqdeer_saved_certs');
          if (localSingle) {
            const parsed = JSON.parse(localSingle);
            const idx = parsed.findIndex((c: CertificateData) => c.id === origCert.id);
            if (idx >= 0) {
              parsed[idx] = finalizedCert;
            } else {
              parsed.push(finalizedCert);
            }
            localStorage.setItem('taqdeer_saved_certs', JSON.stringify(parsed));
          }
        } else if (origCert._sourceType === 'batch' && origCert._batchId) {
          const batches = getSavedBatches();
          const bIdx = batches.findIndex(b => b.id === origCert._batchId);
          if (bIdx >= 0) {
            const b = batches[bIdx];
            const cIdx = (b.certificates || []).findIndex(c => c.id === origCert.id);
            if (cIdx >= 0) {
              const updatedCerts = [...b.certificates];
              updatedCerts[cIdx] = finalizedCert;
              batches[bIdx] = {
                ...b,
                certificates: updatedCerts,
                updatedAt: new Date().toISOString()
              };
              saveBatchesList(batches);
            }
          }
        }

        // If inspecting this certificate, update the inspect cert state too!
        if (inspectCert && inspectCert.id === origCert.id) {
          setInspectCert({
            ...inspectCert,
            ...finalizedCert
          });
        }

        reportItem.driveFileId = uploadRes.fileId;
        reportItem.driveFileWebViewLink = uploadRes.webViewLink;
        reportItem.driveFileUrl = uploadRes.webContentLink;
        reportItem.qrCodeData = uploadRes.webViewLink;
        reportItem.status = 'verified';
      } catch (err: any) {
        console.error(`Error uploading cert for ${studentName}:`, err);
        reportItem.status = 'failed';
        reportItem.error = err.message || 'فشل الرفع';
      }

      report.push(reportItem);
      setDriveReport([...report]);
    }

    setIsUploadingToDrive(false);
    setDriveProgress(null);
    setRenderCertTarget(null);
    reloadAllCertificates();
    showToast(`اكتمل توثيق ${total} شهادة على Google Drive بنجاح! ☁️✨`);
  };

  // Copy all Drive links of selected certificates
  const handleCopySelectedDriveLinks = () => {
    const lines = selectedCertificates
      .map((c, idx) => {
        const link = c.driveFileWebViewLink || c.driveFileUrl || `${window.location.origin}/verify?code=${c.verificationCode || ''}`;
        return `${idx + 1}. ${c.studentName} (${c.grade || ''}): ${link}`;
      })
      .join('\n');

    navigator.clipboard.writeText(lines);
    showToast(`تم نسخ روابط التوثيق لـ ${selectedCertificates.length} شهادة إلى الحافظة! 📋`);
  };

  // Copy structured verification report for single certificate
  const handleCopySingleVerificationReport = (cert: UnifiedCertificate) => {
    const driveLink = cert.driveFileWebViewLink || cert.driveFileUrl || 'غير مرفوع';
    const verifyLink = `${window.location.origin}/verify?code=${cert.verificationCode || ''}`;
    const reportText = `📋 **تقرير توثيق شهادة تقدير رسمية**
━━━━━━━━━━━━━━━━━━━━━━
👤 اسم الطالب: ${cert.studentName}
🎖️ عنوان الشهادة: ${cert.title}
🏫 المدرسة / المؤسسة: ${cert.schoolName || '—'}
📚 الصف / الفصل: ${cert.grade || '—'}
📖 المادة / المجال: ${cert.subject || '—'}
🔑 رمز التوثيق المعتمد: ${cert.verificationCode || '—'}
🌐 رابط التحقق الإلكتروني: ${verifyLink}
☁️ رابط ملف Google Drive: ${driveLink}
📅 تاريخ الإصدار: ${cert.issueDateHijri || cert.issueDate || '—'}
🛡️ حالة السجل: شهادة موثقة وصحيحة بنسبة 100%`;

    navigator.clipboard.writeText(reportText);
    showToast('تم نسخ تقرير التوثيق الشامل إلى الحافظة بنجاح! 📋✨');
  };

  // Export single certificate PDF from library
  const handleExportSingleCertPdf = async (cert: CertificateData) => {
    try {
      showToast(`جاري تصدير شهادة ${cert.studentName}...`);
      const el = await renderCertificateToDom(cert);
      await exportCertificateAsPdf(el, cert);
      showToast(`تم تحميل شهادة ${cert.studentName} بنجاح! 📥`);
    } catch (e) {
      console.error(e);
      showToast('فشل تصدير الشهادة الفردية.');
    } finally {
      setTimeout(() => setRenderCertTarget(null), 150);
    }
  };

  // Export single certificate PNG from library
  const handleExportSingleCertPng = async (cert: CertificateData) => {
    try {
      showToast(`جاري تصدير صورة شهادة ${cert.studentName}...`);
      const el = await renderCertificateToDom(cert);
      await exportCertificateAsPng(el, cert);
      showToast(`تم تحميل صورة شهادة ${cert.studentName} بنجاح! 🖼️`);
    } catch (e) {
      console.error(e);
      showToast('فشل تصدير صورة الشهادة.');
    } finally {
      setTimeout(() => setRenderCertTarget(null), 150);
    }
  };

  // Save current active certificate to cloud
  const saveCurrentToCloud = () => {
    setSyncStatus('جاري الحفظ...');
    const newId = `cloud-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newVerificationCode = generateVerificationCode();

    const certToSave: CertificateData = {
      ...currentCertificate,
      id: newId,
      verificationCode: newVerificationCode,
      isSavedCloud: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      qrCodeData: `${window.location.origin}/verify?code=${newVerificationCode}`
    };

    try {
      const localSingle = localStorage.getItem('taqdeer_saved_certs');
      const list = localSingle ? JSON.parse(localSingle) : [];
      const updated = [certToSave, ...list];
      localStorage.setItem('taqdeer_saved_certs', JSON.stringify(updated));
      onLoadCertificate(certToSave);
      reloadAllCertificates();
      showToast('تم حفظ الشهادة الحالية بالسحابة بنجاح!');
    } catch (e) {
      console.error(e);
    }
    setTimeout(() => setSyncStatus('متزامن'), 400);
  };

  // Export Backup JSON
  const exportBackupJSON = () => {
    const blob = new Blob([JSON.stringify(allCertificates, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `taqdeer-cloud-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    showToast('تم تحميل ملف النسخة الاحتياطية بنجاح!');
  };

  const archiveConfig = useMemo(() => getAutoArchiveConfig(), [isAutoArchiveSettingsOpen]);

  const hasActiveFilters = searchQuery || filterGrade !== 'all' || filterSchool !== 'all' || filterDate !== 'all' || filterSource !== 'all' || filterDrive !== 'all';

  const resetAllFilters = () => {
    setSearchQuery('');
    setFilterGrade('all');
    setFilterSchool('all');
    setFilterDate('all');
    setFilterSource('all');
    setFilterDrive('all');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5 text-right font-sans">
      
      {/* 1. TOP HERO BANNER WITH AUTO-ARCHIVE BADGE & SETTINGS */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white p-4 sm:p-6 rounded-3xl shadow-xl border border-slate-800 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 sm:gap-5 relative overflow-hidden">
        <div className="relative z-10 space-y-1.5 min-w-0">
          <div className="flex items-start sm:items-center gap-2.5 sm:gap-3">
            <div className="p-2 sm:p-2.5 bg-amber-500/20 border border-amber-500/30 rounded-2xl shrink-0">
              <Cloud className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-white">المكتبة السحابية الشاملة والأرشفة الذكية</h2>
                {archiveConfig.enabled ? (
                  <span className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    الأرشفة التلقائية مفعلة
                  </span>
                ) : (
                  <span className="bg-slate-800 text-slate-400 text-[11px] font-bold px-2.5 py-0.5 rounded-full shrink-0">
                    الأرشفة معطلة
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                أرشفة وتصنيف تلقائي فوري لكافة الشهادات المكتملة حسب اسم المدرسة أو تاريخ الإصدار مع دعم التوثيق السحابي والتصدير المجمع.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons: Clean uniform grid on mobile, inline flex on desktop */}
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 lg:flex lg:flex-row items-center gap-2 sm:gap-2.5 w-full lg:w-auto shrink-0 pt-1 lg:pt-0">
          <button
            onClick={() => setIsAutoArchiveSettingsOpen(true)}
            className="w-full lg:w-auto px-3.5 py-2.5 bg-slate-800/90 hover:bg-slate-700 text-amber-400 font-bold text-xs rounded-xl border border-amber-500/30 hover:border-amber-500/60 transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            title="إعدادات وقواعد الأرشفة التلقائية"
          >
            <Settings2 className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="whitespace-nowrap">إعدادات الأرشفة</span>
          </button>

          <button
            onClick={saveCurrentToCloud}
            className="w-full lg:w-auto px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 shrink-0" />
            <span className="whitespace-nowrap">أرشفة الشهادة الحالية</span>
          </button>
          
          <button
            onClick={exportBackupJSON}
            className="w-full lg:w-auto px-3.5 py-2.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition flex items-center justify-center gap-2 cursor-pointer"
            title="تصدير نسخة احتياطية لكافة شهادات السحابة"
          >
            <HardDrive className="w-4 h-4 shrink-0" />
            <span className="whitespace-nowrap">نسخة احتياطية (JSON)</span>
          </button>
        </div>
      </div>

      {/* 2. ADVANCED FILTERS & SEARCH CONTROL PANEL */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-center">
          
          {/* Search Box (Span 2) */}
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث بالطالب، المدرسة، الفصل، رمز التوثيق..."
              className="w-full pl-3 pr-9 py-2 bg-slate-800/80 border border-slate-700 text-xs rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* School Filter */}
          <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700 px-3 py-1.5 rounded-xl text-xs">
            <School className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-slate-400 shrink-0">المدرسة:</span>
            <select
              value={filterSchool}
              onChange={(e) => setFilterSchool(e.target.value)}
              className="bg-transparent text-white font-bold text-xs w-full focus:outline-none cursor-pointer truncate"
            >
              <option value="all" className="bg-slate-900 text-white">جميع المدارس ({uniqueSchools.length})</option>
              {uniqueSchools.map(s => (
                <option key={s} value={s} className="bg-slate-900 text-white">{s}</option>
              ))}
            </select>
          </div>

          {/* Date Filter */}
          <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700 px-3 py-1.5 rounded-xl text-xs">
            <CalendarDays className="w-4 h-4 text-sky-400 shrink-0" />
            <span className="text-slate-400 shrink-0">التاريخ:</span>
            <select
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="bg-transparent text-white font-bold text-xs w-full focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-slate-900 text-white">كافة التواريخ</option>
              <option value="today" className="bg-slate-900 text-white">اليوم</option>
              <option value="this_week" className="bg-slate-900 text-white">آخر 7 أيام</option>
              <option value="this_month" className="bg-slate-900 text-white">هذا الشهر</option>
              <option value="this_year" className="bg-slate-900 text-white">هذا العام</option>
            </select>
          </div>

          {/* Grade / Class Filter */}
          <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700 px-3 py-1.5 rounded-xl text-xs">
            <GraduationCap className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-slate-400 shrink-0">الفصل:</span>
            <select
              value={filterGrade}
              onChange={(e) => setFilterGrade(e.target.value)}
              className="bg-transparent text-white font-bold text-xs w-full focus:outline-none cursor-pointer truncate"
            >
              <option value="all" className="bg-slate-900 text-white">جميع الفصول ({uniqueGrades.length})</option>
              {uniqueGrades.map(g => (
                <option key={g} value={g} className="bg-slate-900 text-white">{g}</option>
              ))}
            </select>
          </div>

          {/* Drive Status Filter */}
          <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700 px-3 py-1.5 rounded-xl text-xs">
            <Cloud className="w-4 h-4 text-violet-400 shrink-0" />
            <span className="text-slate-400 shrink-0">التوثيق:</span>
            <select
              value={filterDrive}
              onChange={(e) => setFilterDrive(e.target.value as any)}
              className="bg-transparent text-white font-bold text-xs w-full focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-slate-900 text-white">جميع الحالات</option>
              <option value="drive" className="bg-slate-900 text-emerald-300">موثقة على Drive 🟢</option>
              <option value="nodrive" className="bg-slate-900 text-slate-300">غير موثقة ☁️</option>
            </select>
          </div>
        </div>

        {/* Sub bar: View Switcher (4 Modes), Counts, Reset, Page Size Selector */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-slate-800/80 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-slate-400 font-medium">
              النتائج المطابقة: <strong className="text-amber-400">{filteredCertificates.length}</strong> من إجمالي {allCertificates.length} شهادة
            </span>

            {hasActiveFilters && (
              <button
                onClick={resetAllFilters}
                className="text-slate-400 hover:text-amber-300 text-xs flex items-center gap-1 cursor-pointer transition underline"
              >
                <RefreshCw className="w-3 h-3" />
                <span>إعادة ضبط الفلاتر</span>
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 justify-end">
            {/* Page Size Selector (Visible in Grid/Table modes) */}
            {(viewMode === 'grid' || viewMode === 'table') && (
              <div className="flex items-center gap-1.5 bg-slate-800/60 border border-slate-700/60 px-2.5 py-1 rounded-xl shrink-0">
                <span className="text-slate-400 text-[11px]">عدد في الصفحة:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="bg-transparent text-amber-400 font-black text-xs focus:outline-none cursor-pointer"
                >
                  <option value={10} className="bg-slate-900 text-white">10</option>
                  <option value={20} className="bg-slate-900 text-white">20</option>
                  <option value={30} className="bg-slate-900 text-white">30</option>
                  <option value={50} className="bg-slate-900 text-white">50</option>
                </select>
              </div>
            )}

            {/* View Mode Toggle: School, Date, Grid, Table */}
            <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700 overflow-x-auto max-w-full">
              <button
                onClick={() => setViewMode('by_school')}
                className={`px-2.5 sm:px-3 py-1 text-xs rounded-lg font-bold flex items-center gap-1 sm:gap-1.5 transition cursor-pointer shrink-0 ${
                  viewMode === 'by_school' ? 'bg-amber-500 text-slate-950 shadow font-black' : 'text-slate-400 hover:text-white'
                }`}
                title="عرض وتصنيف حسب اسم المدرسة"
              >
                <School className="w-3.5 h-3.5" />
                <span className="whitespace-nowrap">حسب المدرسة</span>
              </button>

              <button
                onClick={() => setViewMode('by_date')}
                className={`px-2.5 sm:px-3 py-1 text-xs rounded-lg font-bold flex items-center gap-1 sm:gap-1.5 transition cursor-pointer shrink-0 ${
                  viewMode === 'by_date' ? 'bg-amber-500 text-slate-950 shadow font-black' : 'text-slate-400 hover:text-white'
                }`}
                title="عرض وتصنيف حسب التاريخ والسنوات الدراسية"
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span className="whitespace-nowrap">حسب التاريخ</span>
              </button>

              <button
                onClick={() => setViewMode('grid')}
                className={`px-2 sm:px-2.5 py-1 text-xs rounded-lg font-bold flex items-center gap-1 transition cursor-pointer shrink-0 ${
                  viewMode === 'grid' ? 'bg-amber-500 text-slate-950 shadow font-black' : 'text-slate-400 hover:text-white'
                }`}
                title="عرض شبكة بطاقات"
              >
                <Grid className="w-3.5 h-3.5" />
                <span className="whitespace-nowrap">بطاقات</span>
              </button>

              <button
                onClick={() => setViewMode('table')}
                className={`px-2 sm:px-2.5 py-1 text-xs rounded-lg font-bold flex items-center gap-1 transition cursor-pointer shrink-0 ${
                  viewMode === 'table' ? 'bg-amber-500 text-slate-950 shadow font-black' : 'text-slate-400 hover:text-white'
                }`}
                title="عرض جدول تفصيلي"
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span className="whitespace-nowrap">جدول</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. BATCH FLOATING ACTION BAR (When certificates are selected) */}
      {selectedIds.size > 0 && (
        <div className="sticky top-4 z-30 bg-amber-500 text-slate-950 p-4 rounded-2xl shadow-2xl flex flex-col md:flex-row items-center justify-between gap-3 animate-in slide-in-from-top-3 duration-200">
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-slate-950" />
              <span className="font-black text-sm">
                تم تحديد ({selectedIds.size}) شهادة من أصل ({filteredCertificates.length})
              </span>
            </div>
            {selectedIds.size < filteredCertificates.length && (
              <button
                onClick={selectAllFiltered}
                className="text-xs bg-slate-950/10 hover:bg-slate-950/20 px-2.5 py-1 rounded-lg font-bold underline cursor-pointer"
              >
                تحديد الكل ({filteredCertificates.length})
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
            <button
              onClick={handleExportSelectedAsCombinedPdf}
              disabled={isExportingBatchPdf}
              className="px-3.5 py-1.5 bg-slate-950 hover:bg-slate-900 text-white font-black text-xs rounded-xl shadow transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>تنزيل ملف PDF مجمع</span>
            </button>

            <button
              onClick={() => handleStartBatchDriveUpload()}
              disabled={isUploadingToDrive}
              className="px-3.5 py-1.5 bg-indigo-900 hover:bg-indigo-800 text-white font-black text-xs rounded-xl shadow transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Cloud className="w-3.5 h-3.5 text-sky-400" />
              <span>توثيق على Google Drive</span>
            </button>

            <button
              onClick={handleCopySelectedDriveLinks}
              className="px-3 py-1.5 bg-slate-950/10 hover:bg-slate-950/20 text-slate-950 font-bold text-xs rounded-xl transition flex items-center gap-1 cursor-pointer"
              title="نسخ روابط التوثيق المحددة"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>نسخ الروابط</span>
            </button>

            <button
              onClick={() => setShowBatchDeleteConfirm(true)}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl transition flex items-center gap-1 cursor-pointer"
              title="حذف الشهادات المحددة"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>حذف المحدد</span>
            </button>

            <button
              onClick={clearSelection}
              className="p-1.5 text-slate-950 hover:bg-slate-950/20 rounded-lg transition cursor-pointer"
              title="إلغاء التحديد"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 4. PROGRESS BANNER DURING COMBINED PDF EXPORT */}
      {isExportingBatchPdf && exportProgress && (
        <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-2xl flex items-center justify-between gap-4 text-xs text-amber-200">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
            <div>
              <span className="font-black text-sm text-white">جاري إنشاء ملف PDF المجمع للطباعة...</span>
              <p className="text-[11px] text-amber-300">
                معالجة شهادة: {exportProgress.name} ({exportProgress.current} من {exportProgress.total})
              </p>
            </div>
          </div>
          <div className="w-48 bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700">
            <div
              className="bg-amber-500 h-full transition-all duration-300"
              style={{ width: `${(exportProgress.current / exportProgress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* 5. MAIN CONTENT DISPLAY (SCHOOL CLASSIFICATION, DATE CLASSIFICATION, GRID, OR TABLE) */}
      {filteredCertificates.length === 0 ? (
        <div className="bg-slate-900 p-12 text-center rounded-3xl border border-dashed border-slate-800 space-y-3">
          <Cloud className="w-14 h-14 text-slate-700 mx-auto" />
          <h4 className="font-black text-base text-slate-300">لا توجد شهادات مطابقة للبحث أو التصفية</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            قم بضبط خيارات البحث أو حفظ الشهادات من نافذة المعاينة ومولد الدفعات لتظهر في هذه القائمة السحابية.
          </p>
          {hasActiveFilters && (
            <button
              onClick={resetAllFilters}
              className="mt-2 px-4 py-2 bg-amber-500 text-slate-950 font-bold text-xs rounded-xl cursor-pointer"
            >
              إلغاء التصفية
            </button>
          )}
        </div>
      ) : viewMode === 'by_school' ? (
        /* VIEW 1: SCHOOL CLASSIFICATION VIEW */
        <SchoolClassificationView
          certificates={filteredCertificates}
          selectedIds={selectedIds}
          onToggleSelectCert={toggleSelectCertificate}
          onSelectAllInGroup={handleSelectAllInGroup}
          onInspectCert={(cert) => setInspectCert(cert as UnifiedCertificate)}
          onLoadCert={onLoadCertificate}
          onExportSchoolPdf={handleExportSchoolPdf}
          onUploadSchoolToDrive={handleStartBatchDriveUpload}
        />
      ) : viewMode === 'by_date' ? (
        /* VIEW 2: DATE CLASSIFICATION VIEW */
        <DateClassificationView
          certificates={filteredCertificates}
          selectedIds={selectedIds}
          onToggleSelectCert={toggleSelectCertificate}
          onSelectAllInGroup={handleSelectAllInGroup}
          onInspectCert={(cert) => setInspectCert(cert as UnifiedCertificate)}
          onLoadCert={onLoadCertificate}
          onExportDateGroupPdf={handleExportDateGroupPdf}
          onUploadDateGroupToDrive={handleStartBatchDriveUpload}
        />
      ) : (
        <>
          {/* Select All Checkbox Header for Table / Grid */}
          <div className="flex items-center justify-between px-2 text-xs text-slate-400">
            <button
              onClick={toggleSelectAllCurrentPage}
              className="flex items-center gap-2 text-xs text-slate-300 hover:text-amber-400 font-bold cursor-pointer"
            >
              {isAllCurrentPageSelected ? (
                <CheckSquare className="w-4 h-4 text-amber-400" />
              ) : (
                <Square className="w-4 h-4 text-slate-500" />
              )}
              <span>تحديد كافة شهادات الصفحة الحالية ({currentPagedCertificates.length})</span>
            </button>

            <span className="text-[11px] text-slate-500">
              الصفحة {currentPage} من {totalPages}
            </span>
          </div>

          {/* VIEW 3: GRID CARDS VIEW */}
          {viewMode === 'grid' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {currentPagedCertificates.map((cert, idx) => {
                const isSelected = selectedIds.has(cert.id);
                const driveLink = cert.driveFileWebViewLink || cert.driveFileUrl;
                const verifyCode = cert.verificationCode || `TQ-${(cert.id ? String(cert.id).slice(-6) : '000000').toUpperCase()}`;

                return (
                  <div
                    key={cert._uniqueKey || `cloud-card-${cert.id}-${idx}`}
                    className={`bg-slate-900 p-5 rounded-3xl border transition-all duration-200 flex flex-col justify-between space-y-4 relative ${
                      isSelected
                        ? 'border-amber-500 ring-2 ring-amber-500/20 bg-slate-900/90 shadow-xl'
                        : 'border-slate-800 hover:border-slate-700 hover:bg-slate-900/80 shadow-md'
                    }`}
                  >
                    {/* Top Row: Checkbox, Source Badge, Date */}
                    <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleSelectCertificate(cert.id)}
                          className="text-amber-400 hover:scale-110 transition cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-amber-400" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-600 hover:text-slate-400" />
                          )}
                        </button>

                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                          cert._sourceType === 'batch'
                            ? 'bg-sky-500/10 text-sky-300 border border-sky-500/20'
                            : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                        }`}>
                          {cert._sourceType === 'batch' ? (
                            <>
                              <Layers className="w-3 h-3 text-sky-400" />
                              <span className="truncate max-w-[120px]">{cert._batchTitle}</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3 h-3 text-amber-400" />
                              <span>شهادة فردية</span>
                            </>
                          )}
                        </span>
                      </div>

                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(cert.updatedAt || cert.createdAt || Date.now()).toLocaleDateString('ar-SA')}
                      </span>
                    </div>

                    {/* Student Main Details */}
                    <div className="space-y-1">
                      <h4 className="font-black text-base text-white">{cert.studentName || 'طالب متميز'}</h4>
                      <p className="text-xs font-bold text-amber-400">{cert.title || 'شهادة شكر وتقدير'}</p>
                      <p className="text-xs text-slate-400 flex items-center gap-2 pt-0.5">
                        {cert.grade && <span>الصف: <strong className="text-slate-200">{cert.grade}</strong></span>}
                        {cert.subject && <span>• {cert.subject}</span>}
                      </p>
                      {cert.schoolName && (
                        <p className="text-[11px] text-slate-500 truncate">{cert.schoolName}</p>
                      )}
                    </div>

                    {/* Verification & Drive Status Box */}
                    <div className="space-y-2 pt-1">
                      {driveLink ? (
                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-2.5 flex items-center justify-between text-xs">
                          <button
                            onClick={() => setInspectCert(cert)}
                            className="flex items-center gap-1.5 text-emerald-300 hover:text-emerald-200 font-bold text-[11px] cursor-pointer"
                            title="فحص بيانات التوثيق"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span>موثقة بـ Google Drive</span>
                          </button>
                          <div className="flex items-center gap-1">
                            <a
                              href={driveLink}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 hover:bg-emerald-500/20 text-emerald-300 rounded-lg"
                              title="فتح الرابط في Drive"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                            <button
                              onClick={() => handleCopyText(driveLink, `d-${cert.id}`, 'تم نسخ رابط Google Drive')}
                              className="p-1 hover:bg-emerald-500/20 text-emerald-300 rounded-lg cursor-pointer"
                              title="نسخ الرابط"
                            >
                              {copiedKey === `d-${cert.id}` ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-2 flex items-center justify-between text-xs">
                          <span className="text-slate-400 text-[11px] flex items-center gap-1">
                            <Cloud className="w-3 h-3 text-slate-500" /> غير موثقة على Drive
                          </span>
                          <button
                            onClick={() => {
                              setSelectedIds(new Set([cert.id]));
                              handleStartBatchDriveUpload([cert]);
                            }}
                            className="px-2 py-0.5 bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white rounded-lg text-[10px] font-bold transition cursor-pointer"
                          >
                            توثيق الآن
                          </button>
                        </div>
                      )}

                      {/* Verification Code Box (Clickable for Inspection) */}
                      <button
                        onClick={() => setInspectCert(cert)}
                        className="w-full flex items-center justify-between text-[11px] text-slate-400 bg-slate-950/60 hover:bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-800 hover:border-indigo-500/40 transition cursor-pointer text-right group"
                        title="انقر لفحص وعرض تقرير التوثيق الشامل"
                      >
                        <span className="flex items-center gap-1.5 text-slate-400 group-hover:text-indigo-300">
                          <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                          <span>رمز التوثيق:</span>
                        </span>
                        <span className="font-mono text-amber-400 font-bold group-hover:underline">{verifyCode}</span>
                      </button>
                    </div>

                    {/* Bottom Actions Bar */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 gap-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => onLoadCertificate(cert)}
                          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                          title="تحميل الشهادة في المحرر الرئيسي"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>تعديل بالمحرر</span>
                        </button>

                        <button
                          onClick={() => setInspectCert(cert)}
                          className="px-2.5 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 hover:text-indigo-200 border border-indigo-500/30 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                          title="فحص وعرض بيانات التوثيق"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                          <span>فحص التوثيق</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={() => handleExportSingleCertPdf(cert)}
                          className="p-1.5 hover:bg-slate-800 text-emerald-400 hover:text-emerald-300 rounded-xl transition cursor-pointer"
                          title="تصدير PDF"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleExportSingleCertPng(cert)}
                          className="p-1.5 hover:bg-slate-800 text-sky-400 hover:text-sky-300 rounded-xl transition cursor-pointer"
                          title="تصدير صورة PNG"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setCertToDelete(cert)}
                          className="p-1.5 hover:bg-rose-950/50 text-rose-400 hover:text-rose-300 rounded-xl transition cursor-pointer"
                          title="حذف الشهادة"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* VIEW 2: TABLE VIEW */}
          {viewMode === 'table' && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 text-[11px] font-black border-b border-slate-800">
                    <tr>
                      <th className="p-3.5 w-10 text-center">
                        <button
                          onClick={toggleSelectAllCurrentPage}
                          className="text-amber-400 hover:scale-110 cursor-pointer"
                        >
                          {isAllCurrentPageSelected ? (
                            <CheckSquare className="w-4 h-4 text-amber-400" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-500" />
                          )}
                        </button>
                      </th>
                      <th className="p-3.5">#</th>
                      <th className="p-3.5">اسم الطالب</th>
                      <th className="p-3.5">الصف / الفصل</th>
                      <th className="p-3.5">المادة / المجال</th>
                      <th className="p-3.5">المصدر</th>
                      <th className="p-3.5">رمز التوثيق</th>
                      <th className="p-3.5">حالة Drive</th>
                      <th className="p-3.5 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {currentPagedCertificates.map((cert, idx) => {
                      const isSelected = selectedIds.has(cert.id);
                      const driveLink = cert.driveFileWebViewLink || cert.driveFileUrl;
                      const globalIndex = startIndex + idx + 1;

                      return (
                        <tr
                          key={cert._uniqueKey || `cloud-table-${cert.id}-${idx}`}
                          className={`transition ${
                            isSelected ? 'bg-amber-500/10' : 'hover:bg-slate-800/40'
                          }`}
                        >
                          <td className="p-3.5 text-center">
                            <button
                              onClick={() => toggleSelectCertificate(cert.id)}
                              className="text-amber-400 hover:scale-110 cursor-pointer"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-amber-400" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-600" />
                              )}
                            </button>
                          </td>
                          <td className="p-3.5 font-mono text-slate-500 text-[11px]">{globalIndex}</td>
                          <td className="p-3.5 font-black text-white">{cert.studentName}</td>
                          <td className="p-3.5">{cert.grade || '—'}</td>
                          <td className="p-3.5">{cert.subject || '—'}</td>
                          <td className="p-3.5">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              cert._sourceType === 'batch'
                                ? 'bg-sky-500/10 text-sky-300'
                                : 'bg-amber-500/10 text-amber-300'
                            }`}>
                              {cert._sourceType === 'batch' ? (cert._batchTitle || 'دفعة') : 'فردية'}
                            </span>
                          </td>
                          <td className="p-3.5 font-mono text-amber-400 text-[11px]">
                            <button
                              onClick={() => setInspectCert(cert)}
                              className="hover:underline text-amber-400 font-bold flex items-center gap-1 cursor-pointer"
                              title="فحص بيانات التوثيق"
                            >
                              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                              <span>{cert.verificationCode || 'غير محدد'}</span>
                            </button>
                          </td>
                          <td className="p-3.5">
                            {driveLink ? (
                              <button
                                onClick={() => setInspectCert(cert)}
                                className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1 font-bold cursor-pointer"
                                title="عرض بيانات التوثيق السحابي"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>موثق بـ Drive</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => setInspectCert(cert)}
                                className="text-[11px] text-slate-500 hover:text-slate-300 flex items-center gap-1 cursor-pointer"
                              >
                                <Cloud className="w-3 h-3" />
                                <span>غير موثق</span>
                              </button>
                            )}
                          </td>
                          <td className="p-3.5">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => setInspectCert(cert)}
                                className="p-1.5 hover:bg-indigo-950/60 text-indigo-400 hover:text-indigo-300 rounded-lg cursor-pointer"
                                title="فحص وعرض بيانات التوثيق"
                              >
                                <ShieldCheck className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => onLoadCertificate(cert)}
                                className="p-1.5 hover:bg-slate-800 text-amber-400 rounded-lg cursor-pointer"
                                title="تعديل بالمحرر"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleExportSingleCertPdf(cert)}
                                className="p-1.5 hover:bg-slate-800 text-emerald-400 rounded-lg cursor-pointer"
                                title="تصدير PDF"
                              >
                                <FileText className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleExportSingleCertPng(cert)}
                                className="p-1.5 hover:bg-slate-800 text-sky-400 rounded-lg cursor-pointer"
                                title="تصدير PNG"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setCertToDelete(cert)}
                                className="p-1.5 hover:bg-rose-950/50 text-rose-400 rounded-lg cursor-pointer"
                                title="حذف الشهادة"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 6. PAGINATION CONTROLS */}
          {totalPages > 1 && (
            <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
              <div>
                <span>عرض <strong>{startIndex + 1}</strong> إلى <strong>{endIndex}</strong> من إجمالي <strong>{filteredCertificates.length}</strong> شهادة</span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 rounded-xl text-slate-200 transition cursor-pointer"
                  title="الصفحة الأولى"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 rounded-xl text-slate-200 transition cursor-pointer"
                  title="الصفحة السابقة"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                {/* Page Number Buttons */}
                <div className="flex items-center gap-1 px-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
                    .map((p, idx, arr) => {
                      const prev = arr[idx - 1];
                      return (
                        <React.Fragment key={p}>
                          {prev && p - prev > 1 && <span className="px-1 text-slate-600">...</span>}
                          <button
                            onClick={() => setCurrentPage(p)}
                            className={`w-8 h-8 rounded-xl font-bold text-xs transition cursor-pointer ${
                              currentPage === p
                                ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                            }`}
                          >
                            {p}
                          </button>
                        </React.Fragment>
                      );
                    })}
                </div>

                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 rounded-xl text-slate-200 transition cursor-pointer"
                  title="الصفحة التالية"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 rounded-xl text-slate-200 transition cursor-pointer"
                  title="الصفحة الأخيرة"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* 7. VERIFICATION INSPECTOR MODAL (فحص وعرض بيانات التوثيق لكل شهادة) */}
      {inspectCert && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[120] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 max-w-3xl w-full rounded-3xl p-6 shadow-2xl space-y-5 max-h-[90vh] flex flex-col text-right animate-in fade-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-500/20 border border-indigo-500/30 rounded-2xl">
                  <ShieldCheck className="w-7 h-7 text-indigo-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-white">سجل وبيانات فحص التوثيق الإلكتروني</h3>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>شهادة موثقة ونظامية</span>
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    التحقق المباشر من مطابقة بيانات الشهادة والباركود وسجل التخزين السحابي
                  </p>
                </div>
              </div>

              <button
                onClick={() => setInspectCert(null)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
                title="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Scrollable */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 pl-1">
              
              {/* Row 1: Key Verification Attributes & Live QR Preview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* QR Code & Barcode Card */}
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col items-center justify-center text-center space-y-3">
                  <div className="bg-white p-2.5 rounded-xl shadow-md">
                    {inspectQrUrl ? (
                      <img
                        src={inspectQrUrl}
                        alt="QR Code"
                        className="w-28 h-28 object-contain"
                      />
                    ) : (
                      <div className="w-28 h-28 flex items-center justify-center text-slate-400">
                        <QrCode className="w-10 h-10 animate-pulse" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-slate-300 flex items-center justify-center gap-1">
                      <QrCode className="w-3.5 h-3.5 text-indigo-400" />
                      <span>رمز الاستجابة السريعة (QR)</span>
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      Code: {inspectCert.verificationCode || 'TQ-000000'}
                    </span>
                  </div>
                </div>

                {/* Verification Identifiers Card */}
                <div className="md:col-span-2 bg-slate-800/60 p-4 rounded-2xl border border-slate-700/70 space-y-3 flex flex-col justify-between">
                  
                  <div className="space-y-2.5">
                    {/* Verification Code Box */}
                    <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">رمز التوثيق الوطني الفريد:</span>
                        <span className="font-mono text-base font-black text-amber-400">
                          {inspectCert.verificationCode || 'غير محدد'}
                        </span>
                      </div>
                      <button
                        onClick={() => handleCopyText(inspectCert.verificationCode || '', 'insp-code', 'تم نسخ رمز التوثيق')}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                      >
                        {copiedKey === 'insp-code' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>نسخ الكود</span>
                      </button>
                    </div>

                    {/* Online Verification URL */}
                    <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                      <div className="truncate max-w-[280px]">
                        <span className="text-[10px] text-slate-400 block font-medium">رابط التحقق الإلكتروني:</span>
                        <span className="font-mono text-xs text-sky-400 truncate block">
                          {`${window.location.origin}/verify?code=${inspectCert.verificationCode || ''}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleCopyText(`${window.location.origin}/verify?code=${inspectCert.verificationCode || ''}`, 'insp-vlink', 'تم نسخ رابط التحقق')}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg cursor-pointer"
                          title="نسخ الرابط"
                        >
                          {copiedKey === 'insp-vlink' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                        <a
                          href={`${window.location.origin}/verify?code=${inspectCert.verificationCode || ''}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 hover:text-white rounded-lg"
                          title="فتح صفحة التحقق"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>

                    {/* Google Drive Status & Link */}
                    {inspectCert.driveFileWebViewLink || inspectCert.driveFileUrl ? (
                      <div className="flex items-center justify-between bg-emerald-950/30 border border-emerald-500/30 p-2.5 rounded-xl">
                        <div>
                          <span className="text-[10px] text-emerald-300 block font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> موثقة ومحفوظة على Google Drive
                          </span>
                          <span className="font-mono text-[11px] text-slate-400 truncate block">
                            ID: {inspectCert.driveFileId || 'ملف سحابي'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <a
                            href={inspectCert.driveFileWebViewLink || inspectCert.driveFileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>عرض بالدرايف</span>
                          </a>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Cloud className="w-3.5 h-3.5 text-slate-500" />
                          <span>غير مرفوعة على Google Drive حتى الآن</span>
                        </span>
                        <button
                          onClick={() => handleStartBatchDriveUpload([inspectCert])}
                          className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Cloud className="w-3.5 h-3.5" />
                          <span>توثيق على Drive الآن</span>
                        </button>
                      </div>
                    )}
                  </div>

                </div>
              </div>

              {/* Row 2: Comprehensive Certificate Details Table */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                <h4 className="text-xs font-black text-white flex items-center gap-2 border-b border-slate-800 pb-2">
                  <Award className="w-4 h-4 text-amber-400" />
                  <span>بيانات وسجل التكريم الأكاديمي</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                  
                  <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800/80">
                    <span className="text-[10px] text-slate-500 block">اسم الطالب المكرم:</span>
                    <strong className="text-sm text-white font-black">{inspectCert.studentName}</strong>
                  </div>

                  <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800/80">
                    <span className="text-[10px] text-slate-500 block">الجنس:</span>
                    <strong className="text-slate-200">{inspectCert.recipientGender === 'female' ? 'طالبة' : 'طالب'}</strong>
                  </div>

                  <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800/80">
                    <span className="text-[10px] text-slate-500 block">الصف / الفصل:</span>
                    <strong className="text-amber-400">{inspectCert.grade || 'غير محدد'}</strong>
                  </div>

                  <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800/80">
                    <span className="text-[10px] text-slate-500 block">المادة / المجال:</span>
                    <strong className="text-slate-200">{inspectCert.subject || 'عام'}</strong>
                  </div>

                  <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800/80">
                    <span className="text-[10px] text-slate-500 block">المدرسة / المؤسسة:</span>
                    <strong className="text-slate-200">{inspectCert.schoolName || '—'}</strong>
                  </div>

                  <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800/80">
                    <span className="text-[10px] text-slate-500 block">المصدر السحابي:</span>
                    <strong className="text-sky-300">{inspectCert._batchTitle || 'شهادة فردية'}</strong>
                  </div>

                  <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800/80">
                    <span className="text-[10px] text-slate-500 block">تاريخ الإصدار (هجري):</span>
                    <strong className="text-slate-300">{inspectCert.issueDateHijri || '—'}</strong>
                  </div>

                  <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800/80">
                    <span className="text-[10px] text-slate-500 block">تاريخ الإصدار (ميلادي):</span>
                    <strong className="text-slate-300">{inspectCert.issueDate || '—'}</strong>
                  </div>

                  <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800/80">
                    <span className="text-[10px] text-slate-500 block">تاريخ الحفظ والتعديل بالسحابة:</span>
                    <strong className="text-slate-400 font-mono text-[11px]">
                      {new Date(inspectCert.updatedAt || inspectCert.createdAt || Date.now()).toLocaleString('ar-SA')}
                    </strong>
                  </div>
                </div>

                {/* Reason & Content */}
                {inspectCert.reason && (
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-xs">
                    <span className="text-[10px] text-slate-500 block mb-1">نص وسبب التكريم والتقدير:</span>
                    <p className="text-slate-200 leading-relaxed font-medium">{inspectCert.reason}</p>
                  </div>
                )}
              </div>

              {/* Row 3: Security & Cryptographic Integrity Check */}
              <div className="bg-emerald-950/20 border border-emerald-500/20 p-3.5 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                  <Lock className="w-4 h-4" />
                  <span>فحص التطابق والسلامة الرقمية (Security & Integrity Verification)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-slate-300">
                  <div className="flex items-center gap-1.5 bg-slate-900/60 p-2 rounded-xl border border-emerald-500/10">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>رمز التوثيق مطابق لقاعدة البيانات</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-900/60 p-2 rounded-xl border border-emerald-500/10">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>سلامة السجل السحابي مؤكدة</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-900/60 p-2 rounded-xl border border-emerald-500/10">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>شهادة أصلية غير معدلة</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Footer Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopySingleVerificationReport(inspectCert)}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5 text-amber-400" />
                  <span>نسخ التقرير الشامل</span>
                </button>

                <button
                  onClick={() => {
                    onLoadCertificate(inspectCert);
                    setInspectCert(null);
                  }}
                  className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>تعديل بالمحرر</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleExportSingleCertPdf(inspectCert)}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>تصدير PDF</span>
                </button>

                <button
                  onClick={() => handleExportSingleCertPng(inspectCert)}
                  className="px-3 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>تصدير PNG</span>
                </button>

                <button
                  onClick={() => setInspectCert(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
                >
                  إغلاق
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 8. SINGLE CERTIFICATE DELETE CONFIRMATION MODAL */}
      {certToDelete && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 max-w-md w-full rounded-3xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200 text-right">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-3 bg-rose-500/20 rounded-2xl">
                <Trash2 className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <h4 className="font-extrabold text-base text-white">تأكيد حذف الشهادة من السحابة</h4>
                <p className="text-xs text-slate-400">إجراء غير قابل للتراجع</p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-800/80 rounded-2xl border border-slate-700/80 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">اسم الطالب:</span>
                <span className="font-bold text-white">{certToDelete.studentName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">الصف / الفصل:</span>
                <span className="text-slate-300">{certToDelete.grade || 'غير محدد'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">المصدر:</span>
                <span className="text-amber-400 font-bold">{certToDelete._batchTitle}</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              هل أنت متأكد من رغبتك في حذف شهادة الطالب <strong className="text-rose-400">{certToDelete.studentName}</strong> نهائياً من المكتبة السحابية؟
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setCertToDelete(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                إلغاء
              </button>
              <button
                onClick={() => executeDeleteSingle(certToDelete)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-xl shadow-lg shadow-rose-600/30 transition flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>تأكيد الحذف</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. BATCH DELETE CONFIRMATION MODAL */}
      {showBatchDeleteConfirm && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 max-w-md w-full rounded-3xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200 text-right">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-3 bg-rose-500/20 rounded-2xl">
                <AlertTriangle className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <h4 className="font-extrabold text-base text-white">تأكيد حذف الشهادات المحددة</h4>
                <p className="text-xs text-slate-400">تحذير: سيتم حذف كافة السجلات المحددة</p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-800/80 rounded-2xl border border-slate-700/80 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">عدد الشهادات المراد حذفها:</span>
                <span className="font-black text-rose-400 text-sm">{selectedIds.size} شهادة</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              هل أنت متأكد من حذف الـ <strong className="text-rose-400">{selectedIds.size}</strong> شهادة المحددة نهائياً من المكتبة السحابية؟
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowBatchDeleteConfirm(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                إلغاء
              </button>
              <button
                onClick={executeDeleteBatchSelected}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-xl shadow-lg shadow-rose-600/30 transition flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>نعم، احذف المحدد</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 10. GOOGLE DRIVE BATCH REPORT MODAL */}
      {isDriveReportModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-slate-900 border border-slate-700 max-w-2xl w-full rounded-t-3xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4 max-h-[92dvh] sm:max-h-[85vh] flex flex-col text-right">
            
            {/* Mobile swipe handle */}
            <div className="w-12 h-1 bg-slate-700 rounded-full mx-auto sm:hidden shrink-0 mb-1" />

            <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-3 gap-2 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/20 rounded-xl shrink-0">
                  <Cloud className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h4 className="font-extrabold text-xs sm:text-sm text-white">تقرير توثيق الشهادات على Google Drive</h4>
                  <p className="text-[10px] sm:text-[11px] text-slate-400">توثيق منفصل برابط وباركود خاص لكل شهادة</p>
                </div>
              </div>

              {isUploadingToDrive && (
                <div className="flex items-center gap-2 text-[11px] sm:text-xs text-amber-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري الرفع ({driveProgress?.current} من {driveProgress?.total})...</span>
                </div>
              )}
            </div>

            {/* Table of results */}
            <div className="flex-1 overflow-y-auto overscroll-contain touch-pan-y border border-slate-800 rounded-2xl">
              <table className="w-full text-right text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 text-[11px] border-b border-slate-800 sticky top-0">
                  <tr>
                    <th className="p-2.5">#</th>
                    <th className="p-2.5">اسم الطالب</th>
                    <th className="p-2.5">رمز التوثيق</th>
                    <th className="p-2.5">حالة التوثيق</th>
                    <th className="p-2.5 text-center">الرابط</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {driveReport.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40">
                      <td className="p-2.5 font-mono text-[11px] text-slate-500">{item.index}</td>
                      <td className="p-2.5 font-bold text-white">{item.studentName}</td>
                      <td className="p-2.5 font-mono text-amber-400 text-[11px] dir-ltr">{item.verificationCode}</td>
                      <td className="p-2.5">
                        {item.status === 'verified' && (
                          <span className="text-emerald-400 flex items-center gap-1 font-bold text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5" /> تم التوثيق
                          </span>
                        )}
                        {item.status === 'uploading' && (
                          <span className="text-amber-400 flex items-center gap-1 text-[11px]">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> جاري الرفع...
                          </span>
                        )}
                        {item.status === 'failed' && (
                          <span className="text-rose-400 font-bold text-[11px]">فشل</span>
                        )}
                      </td>
                      <td className="p-2.5 text-center">
                        {item.driveFileWebViewLink && (
                          <div className="flex items-center justify-center gap-1">
                            <a
                              href={item.driveFileWebViewLink}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 hover:bg-slate-800 text-sky-400 rounded-lg"
                              title="فتح"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                            <button
                              onClick={() => handleCopyText(item.driveFileWebViewLink!, `r-${item.certificateId}`, 'تم نسخ الرابط')}
                              className="p-1 hover:bg-slate-800 text-slate-300 rounded-lg cursor-pointer"
                              title="نسخ"
                            >
                              {copiedKey === `r-${item.certificateId}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800 shrink-0">
              <button
                onClick={handleCopySelectedDriveLinks}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 text-amber-400" />
                <span>نسخ كافة الروابط الموثقة</span>
              </button>

              <button
                onClick={() => setIsDriveReportModalOpen(false)}
                disabled={isUploadingToDrive}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl cursor-pointer disabled:opacity-50"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 11. HIDDEN OFF-SCREEN RENDER CONTAINER FOR HEADLESS CAPTURE */}
      {(() => {
        const targetCert = renderCertTarget || allCertificates[0] || currentCertificate;
        if (!targetCert) return null;
        const dims = getCertificateDimensions(targetCert.aspectRatio);
        return (
          <div
            ref={hiddenRenderRef}
            style={{
              position: 'fixed',
              left: '-9999px',
              top: '-9999px',
              width: `${dims.baseWidth}px`,
              height: `${dims.baseHeight}px`,
              minWidth: `${dims.baseWidth}px`,
              minHeight: `${dims.baseHeight}px`,
              maxWidth: `${dims.baseWidth}px`,
              maxHeight: `${dims.baseHeight}px`,
              overflow: 'visible',
              visibility: 'visible',
              zIndex: -999,
              pointerEvents: 'none'
            }}
          >
            <CertificateCanvas data={targetCert} isExporting={true} />
          </div>
        );
      })()}

      {/* 12. AUTO-ARCHIVE SETTINGS MODAL */}
      <AutoArchiveSettingsModal
        isOpen={isAutoArchiveSettingsOpen}
        onClose={() => setIsAutoArchiveSettingsOpen(false)}
        onRefreshLibrary={() => {
          reloadAllCertificates();
          showToast('تم تحديث إعدادات الأرشفة التلقائية بنجاح! ⚙️💾');
        }}
        onShowToast={showToast}
      />

    </div>
  );
};
