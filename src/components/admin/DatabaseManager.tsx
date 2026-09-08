import React, { useState, useEffect, useMemo } from 'react';
import {
  Database,
  HardDrive,
  Download,
  Upload,
  RefreshCw,
  Search,
  Trash2,
  RotateCcw,
  FileText,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Cloud,
  Layers,
  Eye,
  Copy,
  Calendar,
  Server,
  Clock,
  Sparkles,
  Check,
  X,
  Users,
  FolderArchive,
  ArrowDownToLine,
  Sliders,
  FileJson
} from 'lucide-react';
import {
  DatabaseStatsOverview,
  DatabaseBackupRecord,
  fetchDatabaseOverview,
  fetchDatabaseRecords,
  createDatabaseBackup,
  fetchDatabaseBackupsList,
  restoreDatabaseBackup,
  deleteDatabaseBackup
} from '../../services/adminService';

interface Props {
  onShowToast?: (message: string) => void;
  onRefreshParentData?: () => void;
}

type CollectionType = 'accounts' | 'cloud_sync' | 'drive_storage' | 'system_configs' | 'backups';

export const DatabaseManager: React.FC<Props> = ({ onShowToast, onRefreshParentData }) => {
  // Overview state
  const [overview, setOverview] = useState<DatabaseStatsOverview | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(true);

  // Active view: explorer vs backups
  const [activeSubTab, setActiveSubTab] = useState<'explorer' | 'backups'>('explorer');

  // Explorer state
  const [activeCollection, setActiveCollection] = useState<CollectionType>('accounts');
  const [records, setRecords] = useState<any[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Record Modal (JSON inspection)
  const [inspectRecord, setInspectRecord] = useState<{ title: string; data: any } | null>(null);
  const [copiedJson, setCopiedJson] = useState(false);

  // Backups state
  const [backups, setBackups] = useState<DatabaseBackupRecord[]>([]);
  const [loadingBackups, setLoadingBackups] = useState(false);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [restoringFilename, setRestoringFilename] = useState<string | null>(null);
  const [deletingFilename, setDeletingFilename] = useState<string | null>(null);

  // Restore Modal State
  const [confirmRestoreModal, setConfirmRestoreModal] = useState<{
    isOpen: boolean;
    filename?: string;
    payload?: any;
    title: string;
    details?: string;
  }>({ isOpen: false, title: '' });
  const [restoreProgress, setRestoreProgress] = useState(false);

  // File Upload for Restore
  const [uploadedBackupData, setUploadedBackupData] = useState<any | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');

  const notify = (msg: string) => {
    if (onShowToast) onShowToast(msg);
  };

  // Load database stats & overview
  const loadOverview = async () => {
    setLoadingOverview(true);
    try {
      const data = await fetchDatabaseOverview();
      if (data) {
        setOverview(data);
      }
    } catch (e) {
      console.warn('Error loading overview:', e);
    } finally {
      setLoadingOverview(false);
    }
  };

  // Load collection records
  const loadRecords = async (collection = activeCollection, query = searchQuery) => {
    setLoadingRecords(true);
    try {
      const res = await fetchDatabaseRecords(collection, query, 200);
      if (res && res.success) {
        setRecords(res.records || []);
        setTotalRecords(res.total || 0);
      }
    } catch (err: any) {
      console.warn('Error loading records:', err);
      notify(err.message || 'تعذر تحميل السجلات');
    } finally {
      setLoadingRecords(false);
    }
  };

  // Load backups list
  const loadBackups = async () => {
    setLoadingBackups(true);
    try {
      const list = await fetchDatabaseBackupsList();
      setBackups(list);
    } catch (err) {
      console.warn('Error loading backups:', err);
    } finally {
      setLoadingBackups(false);
    }
  };

  useEffect(() => {
    loadOverview();
    loadRecords('accounts', '');
    loadBackups();
  }, []);

  // When collection or search query changes
  useEffect(() => {
    if (activeSubTab === 'explorer') {
      loadRecords(activeCollection, searchQuery);
    }
  }, [activeCollection]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadRecords(activeCollection, searchQuery);
  };

  // Create instant backup and trigger direct download
  const handleCreateBackup = async () => {
    setCreatingBackup(true);
    try {
      const res = await createDatabaseBackup();
      if (res && res.success) {
        notify('تم إنشاء النسخة الاحتياطية بنجاح! 📦✅');

        // Automatically trigger browser download of the generated backup JSON
        if (res.backup) {
          const blob = new Blob([JSON.stringify(res.backup, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = res.filename || `taqdeer_backup_${new Date().toISOString().slice(0, 10)}.json`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }

        // Refresh overview and backups list
        await loadOverview();
        await loadBackups();
      }
    } catch (err: any) {
      notify(err.message || 'فشل إنشاء النسخة الاحتياطية');
    } finally {
      setCreatingBackup(false);
    }
  };

  // Execute restore confirmation
  const handleExecuteRestore = async () => {
    setRestoreProgress(true);
    try {
      const params = confirmRestoreModal.filename
        ? { filename: confirmRestoreModal.filename }
        : { backupPayload: confirmRestoreModal.payload };

      const res = await restoreDatabaseBackup(params);
      if (res && res.success) {
        notify(res.message || 'تمت استعادة قاعدة البيانات بنجاح! 🔄✅');
        setConfirmRestoreModal({ isOpen: false, title: '' });
        setUploadedBackupData(null);
        setUploadedFileName('');

        // Refresh all relevant states
        await loadOverview();
        await loadRecords(activeCollection, searchQuery);
        await loadBackups();
        if (onRefreshParentData) {
          onRefreshParentData();
        }
      }
    } catch (err: any) {
      notify(err.message || 'فشل استعادة النسخة الاحتياطية');
    } finally {
      setRestoreProgress(false);
    }
  };

  // Delete backup
  const handleDeleteBackup = async (filename: string) => {
    if (!window.confirm(`هل أنت متأكد من رغبتك في حذف ملف النسخة الاحتياطية (${filename})؟`)) {
      return;
    }
    setDeletingFilename(filename);
    try {
      const res = await deleteDatabaseBackup(filename);
      if (res && res.success) {
        notify('تم حذف ملف النسخة الاحتياطية بنجاح 🗑️');
        await loadOverview();
        await loadBackups();
      }
    } catch (err: any) {
      notify(err.message || 'فشل حذف النسخة الاحتياطية');
    } finally {
      setDeletingFilename(null);
    }
  };

  // Handle uploaded backup file from local PC
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed || (!parsed.database && !parsed.accounts)) {
          notify('ملف النسخة الاحتياطية غير متوافق أو لا يحتوي على بنية بيانات مقبولة');
          return;
        }
        setUploadedBackupData(parsed);
        notify(`تم فحص ملف النسخة الاحتياطية بنجاح (${file.name}) 📄✅`);
      } catch (parseErr) {
        notify('الملف المحدد ليس بصيغة JSON صالحة');
      }
    };
    reader.readAsText(file);
    // Reset file input value so user can upload again if needed
    e.target.value = '';
  };

  const copyJsonToClipboard = (data: any) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopiedJson(true);
    notify('تم نسخ بيانات السجل إلى الحافظة 📋');
    setTimeout(() => setCopiedJson(false), 2000);
  };

  return (
    <div id="admin-database-manager" className="space-y-6">
      {/* 1. Top Summary Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden backdrop-blur-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-2xl shrink-0">
              <Database className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-black text-white">إدارة قاعدة البيانات والنسخ الاحتياطي</h2>
                <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  {overview?.provider === 'firestore'
                    ? 'Google Cloud Firestore'
                    : overview?.provider === 'vercel-postgres'
                    ? 'Vercel Postgres'
                    : 'قاعدة البيانات المحلية المدمجة'}
                </span>
                <span className="px-2.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-800 rounded-md border border-slate-700">
                  {overview?.environment || 'Node.js / Cloud Run'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-3xl leading-relaxed">
                استعراض شامل لجميع جداول ومجموعات قاعدة البيانات (الحسابات، المزامنة السحابية، وأرشيف الشهادات والتوثيق)،
                مع إمكانية إنشاء نسخ احتياطية كاملة وتنزيلها واستعادتها بضغطة زر.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
            <button
              type="button"
              onClick={() => {
                loadOverview();
                if (activeSubTab === 'explorer') loadRecords(activeCollection, searchQuery);
                else loadBackups();
              }}
              disabled={loadingOverview || loadingRecords || loadingBackups}
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer border border-slate-700"
              title="تحديث البيانات"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingOverview ? 'animate-spin' : ''}`} />
              <span>تحديث</span>
            </button>

            <button
              type="button"
              onClick={handleCreateBackup}
              disabled={creatingBackup}
              className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20 active:scale-98"
            >
              {creatingBackup ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>إنشاء وتحميل نسخة احتياطية فورية</span>
            </button>
          </div>
        </div>

        {/* 2. Overview Stats Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mt-6 pt-5 border-t border-slate-800/80">
          {/* Card 1: Users Accounts */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 hover:border-slate-700 transition">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-bold">سجلات الحسابات</span>
              <Users className="w-4 h-4 text-blue-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-xl font-black text-white">{overview?.stats?.accounts?.totalUsers ?? '—'}</span>
              <span className="text-[11px] text-slate-500">حساب مسجل</span>
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400">
              <span>المشرفون: <strong className="text-amber-400">{overview?.stats?.accounts?.adminsCount ?? 0}</strong></span>
              <span>الحجم: {overview?.stats?.accounts?.size ?? '0 B'}</span>
            </div>
          </div>

          {/* Card 2: Cloud Sync Bundles */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 hover:border-slate-700 transition">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-bold">حزم المزامنة السحابية</span>
              <Cloud className="w-4 h-4 text-sky-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-xl font-black text-white">{overview?.stats?.cloudSync?.userBundlesCount ?? '—'}</span>
              <span className="text-[11px] text-slate-500">حزمة مستخدم</span>
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400">
              <span>شهادات سحابية: <strong className="text-sky-300">{overview?.stats?.cloudSync?.totalSyncedCertificates ?? 0}</strong></span>
              <span>الحجم: {overview?.stats?.cloudSync?.size ?? '0 B'}</span>
            </div>
          </div>

          {/* Card 3: Drive Storage & Archives */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 hover:border-slate-700 transition">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-bold">أرشيف الشهادات والتوثيق</span>
              <FolderArchive className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-xl font-black text-white">{overview?.stats?.driveStorage?.filesCount ?? '—'}</span>
              <span className="text-[11px] text-slate-500">سجل وملف</span>
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400">
              <span>الحالة: <strong className="text-emerald-400">نشط وموثق</strong></span>
              <span>الحجم: {overview?.stats?.driveStorage?.size ?? '0 B'}</span>
            </div>
          </div>

          {/* Card 4: Backups Count & Total Size */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 hover:border-slate-700 transition">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-bold">النسخ الاحتياطية</span>
              <HardDrive className="w-4 h-4 text-amber-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-xl font-black text-white">{overview?.stats?.backups?.count ?? '0'}</span>
              <span className="text-[11px] text-slate-500">نسخة محفوظة</span>
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400">
              <span>إجمالي الحجم: <strong className="text-amber-300">{overview?.stats?.backups?.size ?? '0 B'}</strong></span>
              <span>الإجمالي: {overview?.stats?.totalDatabaseSize ?? '0 B'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Sub-Navigation Tabs: [عرض جداول وسجلات قاعدة البيانات] vs [إدارة النسخ الاحتياطية والاستعادة] */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          type="button"
          onClick={() => setActiveSubTab('explorer')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeSubTab === 'explorer'
              ? 'bg-amber-500 text-slate-950 font-black shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>مستكشف سجلات قاعدة البيانات ({totalRecords})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveSubTab('backups');
            loadBackups();
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeSubTab === 'backups'
              ? 'bg-amber-500 text-slate-950 font-black shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <HardDrive className="w-4 h-4" />
          <span>النسخ الاحتياطية والاستعادة ({backups.length})</span>
        </button>
      </div>

      {/* ==========================================
          SUB-TAB 1: DATABASE EXPLORER & RECORDS
         ========================================== */}
      {activeSubTab === 'explorer' && (
        <div className="space-y-4">
          {/* Collection Selection Bar & Search Filter */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
            {/* Collection Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setActiveCollection('accounts')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  activeCollection === 'accounts'
                    ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40 font-black'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>حسابات المستخدمين</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300">
                  {overview?.stats?.accounts?.totalUsers ?? 0}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveCollection('cloud_sync')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  activeCollection === 'cloud_sync'
                    ? 'bg-sky-600/30 text-sky-300 border border-sky-500/40 font-black'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Cloud className="w-3.5 h-3.5" />
                <span>المزامنة وحزم المستخدمين</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300">
                  {overview?.stats?.cloudSync?.userBundlesCount ?? 0}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveCollection('drive_storage')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  activeCollection === 'drive_storage'
                    ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 font-black'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <FolderArchive className="w-3.5 h-3.5" />
                <span>أرشيف التوثيق والملفات</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300">
                  {overview?.stats?.driveStorage?.filesCount ?? 0}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveCollection('system_configs')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  activeCollection === 'system_configs'
                    ? 'bg-amber-600/30 text-amber-300 border border-amber-500/40 font-black'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>إعدادات النظام المهيأة</span>
              </button>
            </div>

            {/* Search Input */}
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="بحث في الحقول والسجلات..."
                  className="w-full pl-3 pr-9 py-1.5 bg-slate-950 border border-slate-700/80 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      loadRecords(activeCollection, '');
                    }}
                    className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              <button
                type="submit"
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition"
              >
                بحث
              </button>
            </form>
          </div>

          {/* Records Table / View */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-md">
            {loadingRecords ? (
              <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
                <RefreshCw className="w-6 h-6 animate-spin text-amber-400" />
                <p className="text-xs">جارٍ قراءة سجلات قاعدة البيانات...</p>
              </div>
            ) : records.length === 0 ? (
              <div className="py-16 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
                <Database className="w-8 h-8 text-slate-600" />
                <p className="text-sm font-bold text-slate-400">لا توجد سجلات مطابقة للبحث في هذا الجدول</p>
                <p className="text-xs text-slate-500">جرّب تغيير عبارة البحث أو اختيار مجموعة أخرى</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                {/* 1. Accounts Table View */}
                {activeCollection === 'accounts' && (
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-950/80 text-slate-400 uppercase border-b border-slate-800">
                      <tr>
                        <th className="px-4 py-3">المستخدم / الاسم</th>
                        <th className="px-4 py-3">البريد الإلكتروني</th>
                        <th className="px-4 py-3">الرتبة</th>
                        <th className="px-4 py-3">حالة التوثيق</th>
                        <th className="px-4 py-3">تاريخ الإنشاء</th>
                        <th className="px-4 py-3">آخر دخول</th>
                        <th className="px-4 py-3 text-center">الإجراء</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {records.map((user: any, idx: number) => (
                        <tr key={user.userId || idx} className="hover:bg-slate-800/40 transition">
                          <td className="px-4 py-3">
                            <div className="font-bold text-white flex items-center gap-1.5">
                              <span>{user.displayName || user.username}</span>
                              {user.role === 'admin' && (
                                <span className="px-1.5 py-0.5 text-[9px] font-black rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  مدير
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">@{user.username || user.userId}</div>
                          </td>
                          <td className="px-4 py-3 text-slate-300 font-mono text-[11px]">{user.email || '—'}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              user.role === 'admin' ? 'bg-purple-500/20 text-purple-300' : 'bg-slate-800 text-slate-300'
                            }`}>
                              {user.role === 'admin' ? 'مدير نظام' : 'مستخدم عادي'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {user.isVerified ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                موثق ({user.verificationMethod || 'email'})
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                                غير مؤكد
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-400 text-[11px]">
                            {user.createdAt ? new Date(user.createdAt).toLocaleDateString('ar-EG') : '—'}
                          </td>
                          <td className="px-4 py-3 text-slate-400 text-[11px]">
                            {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('ar-EG') : '—'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => setInspectRecord({ title: `سجل المستخدم: ${user.username}`, data: user })}
                              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition"
                              title="عرض تفاصيل السجل JSON"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {/* 2. Cloud Sync Table View */}
                {activeCollection === 'cloud_sync' && (
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-950/80 text-slate-400 uppercase border-b border-slate-800">
                      <tr>
                        <th className="px-4 py-3">المعرف / الحساب</th>
                        <th className="px-4 py-3">البريد الإلكتروني</th>
                        <th className="px-4 py-3 text-center">الشهادات المحفوظة</th>
                        <th className="px-4 py-3 text-center">المسودات والدفعات</th>
                        <th className="px-4 py-3">آخر مزامنة</th>
                        <th className="px-4 py-3 text-center">الإجراء</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {records.map((bundle: any, idx: number) => (
                        <tr key={bundle.key || idx} className="hover:bg-slate-800/40 transition">
                          <td className="px-4 py-3">
                            <div className="font-mono font-bold text-white text-[11px]">{bundle.key}</div>
                            {bundle.userId && <div className="text-[10px] text-slate-500 font-mono">UID: {bundle.userId}</div>}
                          </td>
                          <td className="px-4 py-3 text-slate-300 font-mono text-[11px]">{bundle.userEmail || '—'}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-black text-[11px]">
                              {bundle.certsCount} شهادة
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center text-slate-400 text-[11px]">
                            {bundle.batchesCount} دفعة | {bundle.draftsCount} مسودة
                          </td>
                          <td className="px-4 py-3 text-slate-400 text-[11px]">
                            {bundle.updatedAt ? new Date(bundle.updatedAt).toLocaleString('ar-EG') : '—'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => setInspectRecord({ title: `حزمة المزامنة: ${bundle.key}`, data: bundle })}
                              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition"
                              title="عرض تفاصيل الحزمة JSON"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {/* 3. Drive Storage & Archives Table View */}
                {activeCollection === 'drive_storage' && (
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-950/80 text-slate-400 uppercase border-b border-slate-800">
                      <tr>
                        <th className="px-4 py-3">اسم الطالب / الشهادة</th>
                        <th className="px-4 py-3">كود التوثيق</th>
                        <th className="px-4 py-3">اسم الملف</th>
                        <th className="px-4 py-3">تاريخ الأرشفة</th>
                        <th className="px-4 py-3">الحساب المؤرشف</th>
                        <th className="px-4 py-3 text-center">الإجراء</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {records.map((rec: any, idx: number) => (
                        <tr key={rec.fileId || idx} className="hover:bg-slate-800/40 transition">
                          <td className="px-4 py-3 font-bold text-white">{rec.studentName}</td>
                          <td className="px-4 py-3">
                            <span className="font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 text-[11px]">
                              {rec.verificationCode}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-400 text-[11px] truncate max-w-xs">{rec.fileName}</td>
                          <td className="px-4 py-3 text-slate-400 text-[11px]">
                            {rec.uploadedAt ? new Date(rec.uploadedAt).toLocaleString('ar-EG') : '—'}
                          </td>
                          <td className="px-4 py-3 text-slate-300 text-[11px]">
                            {rec.isPlatformAccount ? 'حساب المنظومة العام' : rec.accountEmail || 'مستخدم'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => setInspectRecord({ title: `سجل الأرشيف: ${rec.fileId}`, data: rec })}
                              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition"
                              title="عرض تفاصيل السجل JSON"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {/* 4. System Configs View */}
                {activeCollection === 'system_configs' && (
                  <div className="p-4 space-y-4">
                    {records.map((cfg: any, idx: number) => (
                      <div key={cfg.key || idx} className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Sliders className="w-4 h-4 text-amber-400" />
                            <h4 className="font-bold text-white text-sm">{cfg.title}</h4>
                            <span className="font-mono text-[10px] text-slate-500 bg-slate-900 px-2 py-0.5 rounded">
                              {cfg.key}.json
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => copyJsonToClipboard(cfg.data)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-bold transition flex items-center gap-1"
                          >
                            <Copy className="w-3 h-3" />
                            <span>نسخ JSON</span>
                          </button>
                        </div>
                        <pre className="bg-slate-900 p-3 rounded-lg text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-48">
                          {JSON.stringify(cfg.data, null, 2)}
                        </pre>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==========================================
          SUB-TAB 2: BACKUPS & RESTORE
         ========================================== */}
      {activeSubTab === 'backups' && (
        <div className="space-y-6">
          {/* Action Box: Instant Backup & File Upload Restore */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Box A: Create Backup */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl">
                    <ArrowDownToLine className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-white text-sm">إنشاء نسخة احتياطية شاملة فورية</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      تصدير وحفظ جميع حسابات المستخدمين، الإعدادات، حزم المزامنة السحابية، وأرشيف التوثيق.
                    </p>
                  </div>
                </div>
                <div className="text-[11px] text-slate-400 bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 my-3 leading-relaxed">
                  ✓ يتم حفظ لقطة النسخة على الخادم تلقائياً في مجلد النسخ الاحتياطية. <br />
                  ✓ يتم تنزيل ملف <code className="text-amber-300">.json</code> فورياً إلى جهازك لحفظه بأمان خارج الخادم.
                </div>
              </div>

              <button
                type="button"
                onClick={handleCreateBackup}
                disabled={creatingBackup}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                {creatingBackup ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span>{creatingBackup ? 'جارٍ توليد النسخة الاحتياطية...' : 'إنشاء وحفظ نسخة احتياطية الآن'}</span>
              </button>
            </div>

            {/* Box B: Restore from local file */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-white text-sm">استعادة قاعدة البيانات من ملف</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      رفع ملف نسخة احتياطية سابقة (<code className="text-blue-300">.json</code>) واستعادة بياناتها.
                    </p>
                  </div>
                </div>

                <div className="my-3">
                  <label className="block w-full cursor-pointer">
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <div className="border-2 border-dashed border-slate-700 hover:border-blue-500/60 bg-slate-950/60 rounded-xl p-3 text-center transition">
                      <FileJson className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                      <span className="text-xs text-slate-300 font-bold block">
                        {uploadedFileName || 'انقر هنا لاختيار ملف النسخة الاحتياطية (.json)'}
                      </span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        يدعم ملفات النسخ الاحتياطية المصدرة من منصة تقدير
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              <button
                type="button"
                disabled={!uploadedBackupData}
                onClick={() =>
                  setConfirmRestoreModal({
                    isOpen: true,
                    payload: uploadedBackupData,
                    title: `استعادة قاعدة البيانات من الملف (${uploadedFileName})`,
                    details: 'سيتم استيراد الحسابات والإعدادات السحابية من الملف المرفوع. يتم أخذ لقطة أمان تلقائية قبل التنفيذ.',
                  })
                }
                className={`w-full py-2.5 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer ${
                  uploadedBackupData
                    ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-md'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                <RotateCcw className="w-4 h-4" />
                <span>بدء الاستعادة من الملف المرفوع</span>
              </button>
            </div>
          </div>

          {/* Table: Saved Server Backups List */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="p-4 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-amber-400" />
                <h3 className="font-black text-white text-sm">سجل النسخ الاحتياطية المحفوظة على الخادم</h3>
                <span className="px-2 py-0.5 text-[10px] rounded-full bg-slate-800 text-slate-300 font-mono">
                  {backups.length} نسخة
                </span>
              </div>

              <button
                type="button"
                onClick={loadBackups}
                disabled={loadingBackups}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-bold transition flex items-center gap-1"
                title="تحديث قائمة النسخ"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingBackups ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {loadingBackups ? (
              <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-amber-400" />
                <p className="text-xs">جارٍ قراءة ملفات النسخ الاحتياطية...</p>
              </div>
            ) : backups.length === 0 ? (
              <div className="py-12 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
                <FileJson className="w-8 h-8 text-slate-600" />
                <p className="text-sm font-bold text-slate-400">لا توجد نسخ احتياطية مسجلة على الخادم بعد</p>
                <p className="text-xs text-slate-500">انقر على "إنشاء نسخة احتياطية" أعلاه لحفظ أول نسخة الآن</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 uppercase border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3">اسم الملف</th>
                      <th className="px-4 py-3">تاريخ وتوقيت الإنشاء</th>
                      <th className="px-4 py-3">حجم الملف</th>
                      <th className="px-4 py-3">إحصائيات النسخة</th>
                      <th className="px-4 py-3 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {backups.map((bk) => (
                      <tr key={bk.filename} className="hover:bg-slate-800/40 transition">
                        <td className="px-4 py-3">
                          <div className="font-mono font-bold text-white text-[11px] flex items-center gap-1.5">
                            <FileJson className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span>{bk.filename}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-300 text-[11px]">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-500" />
                            <span>{new Date(bk.createdAt).toLocaleDateString('ar-EG')}</span>
                            <span className="text-slate-500 font-mono">
                              ({new Date(bk.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })})
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-400 text-[11px]">{bk.fileSize}</td>
                        <td className="px-4 py-3 text-slate-400 text-[11px]">
                          {bk.stats ? (
                            <div className="flex items-center gap-2">
                              <span>حسابات: <strong className="text-white">{bk.stats.accountsCount ?? 0}</strong></span>
                              <span>•</span>
                              <span>حزم: <strong className="text-white">{bk.stats.cloudSyncBundlesCount ?? 0}</strong></span>
                            </div>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Download Button */}
                            <a
                              href={bk.downloadUrl}
                              download={bk.filename}
                              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-bold transition flex items-center gap-1"
                              title="تنزيل ملف النسخة"
                            >
                              <Download className="w-3.5 h-3.5 text-amber-400" />
                              <span className="hidden sm:inline">تنزيل</span>
                            </a>

                            {/* Restore Button */}
                            <button
                              type="button"
                              onClick={() =>
                                setConfirmRestoreModal({
                                  isOpen: true,
                                  filename: bk.filename,
                                  title: `استعادة قاعدة البيانات من النسخة (${bk.filename})`,
                                  details: 'سيتم استبدال الحسابات والإعدادات الحالية ببيانات هذه النسخة الاحتياطية. يتم إنشاء لقطة أمان احتياطية تلقائياً قبل الاستعادة.',
                                })
                              }
                              className="px-2.5 py-1.5 bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 border border-blue-500/30 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                              title="استعادة هذه النسخة"
                            >
                              <RotateCcw className="w-3.5 h-3.5 text-blue-400" />
                              <span className="hidden sm:inline">استعادة</span>
                            </button>

                            {/* Delete Button */}
                            <button
                              type="button"
                              disabled={deletingFilename === bk.filename}
                              onClick={() => handleDeleteBackup(bk.filename)}
                              className="p-1.5 bg-rose-500/10 hover:bg-rose-500/30 text-rose-400 rounded-lg transition cursor-pointer"
                              title="حذف ملف النسخة"
                            >
                              {deletingFilename === bk.filename ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL 1: INSPECT RECORD JSON
         ========================================== */}
      {inspectRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileJson className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-base">{inspectRecord.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectRecord(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => copyJsonToClipboard(inspectRecord.data)}
                className="absolute left-3 top-3 px-2.5 py-1 bg-slate-800/90 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition flex items-center gap-1 z-10"
              >
                {copiedJson ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedJson ? 'تم النسخ' : 'نسخ JSON'}</span>
              </button>

              <pre className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs font-mono text-emerald-300 overflow-x-auto max-h-96 leading-relaxed">
                {JSON.stringify(inspectRecord.data, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setInspectRecord(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL 2: CONFIRM RESTORE BACKUP
         ========================================== */}
      {confirmRestoreModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-amber-400">
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-white text-base">{confirmRestoreModal.title}</h3>
                <p className="text-xs text-slate-400 mt-0.5">تأكيد عملية استعادة قاعدة البيانات</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/80 p-3.5 rounded-xl border border-slate-800">
              {confirmRestoreModal.details}
            </p>

            <div className="bg-blue-500/10 border border-blue-500/20 text-blue-300 p-3 rounded-xl text-xs flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <span>
                <strong>إجراء أمان تلقائي:</strong> سيقوم النظام تلقائياً بأخذ لقطة أمان احتياطية لقاعدة البيانات الحالية
                وحفظها على الخادم قبل تطبيق عملية الاستعادة لحماية بياناتك من أي فقدان غير مقصود.
              </span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                disabled={restoreProgress}
                onClick={() => setConfirmRestoreModal({ isOpen: false, title: '' })}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={restoreProgress}
                onClick={handleExecuteRestore}
                className="px-5 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-black rounded-xl text-xs transition flex items-center gap-2 cursor-pointer shadow-lg shadow-blue-500/20"
              >
                {restoreProgress ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>جارٍ الاستعادة والتطبيق...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    <span>نعم، تأكيد الاستعادة الآن</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
