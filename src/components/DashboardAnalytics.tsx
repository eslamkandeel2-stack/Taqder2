import React, { useState, useEffect, useMemo } from 'react';
import { ReminderTask, CertificateData, BatchRecord, StudentGroup } from '../types';
import { getStoredCloudCertificates, subscribeToArchiveChanges } from '../utils/archiveManager';
import { getSavedBatches, subscribeToBatches } from '../utils/batchManager';
import { getSavedStudentGroups } from '../utils/studentGroupsManager';
import { getSavedDrafts } from '../utils/draftsManager';
import {
  LayoutDashboard,
  Award,
  Users,
  CheckCircle2,
  Clock,
  Plus,
  Bell,
  Trash2,
  TrendingUp,
  BarChart3,
  ExternalLink,
  Calendar,
  Search,
  Filter,
  Download,
  Printer,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Check,
  AlertCircle,
  FileText,
  HardDrive,
  Eye,
  Edit3,
  Bookmark,
  Share2,
  GraduationCap,
  Flame,
  ShieldCheck,
  Star,
  RefreshCw,
  FolderArchive,
  Layers,
  ArrowUpRight,
  Tag,
  CheckCircle,
  X,
  ListTodo,
  PieChart
} from 'lucide-react';

interface Props {
  currentCertificate?: CertificateData;
  onLoadCertificate?: (cert: CertificateData) => void;
  onNavigateToTab?: (tab: 'editor' | 'batch' | 'cloud' | 'verify' | 'ai' | 'settings') => void;
  onShowToast?: (message: string) => void;
}

const TASKS_STORAGE_KEY = 'taqdeer_dashboard_tasks_v2';

const INITIAL_TASKS: ReminderTask[] = [
  {
    id: 't-1',
    title: 'طباعة شهادات تفوق وتكريم أوائل الصف الأول الثانوي',
    dueDate: 'اليوم، 04:00 م',
    priority: 'عالية',
    completed: false,
    category: 'تسليم شهادات',
    notes: 'التأكد من اختيار دقة 300 DPI والورق المقوى الذهبي',
    linkTab: 'batch',
    createdAt: new Date().toISOString(),
  },
  {
    id: 't-2',
    title: 'مراجعة درجات اختبار الرياضيات وإعداد قائمة المكرمين',
    dueDate: 'غداً، 10:00 ص',
    priority: 'متوسطة',
    completed: true,
    category: 'مراجعة درجات',
    notes: 'اعتماد درجات الفصل الدراسي الأول',
    linkTab: 'editor',
    createdAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
  },
  {
    id: 't-3',
    title: 'توثيق شهادات مسابقة تحفيظ القرآن الكريم على Google Drive',
    dueDate: 'الأحد القادم',
    priority: 'عالية',
    completed: false,
    category: 'توثيق درايف',
    notes: 'إنشاء مجلد مشترك لأولياء الأمور مع باركود QR',
    linkTab: 'cloud',
    createdAt: new Date().toISOString(),
  },
  {
    id: 't-4',
    title: 'حفل تكريم المتفوقين والأنشطة في طابور الصباح',
    dueDate: 'الإثنين القادم',
    priority: 'عادية',
    completed: false,
    category: 'حفل تكريم',
    notes: 'تنسيق تسليم الشهادات مع المرشد الطلابي',
    linkTab: 'batch',
    createdAt: new Date().toISOString(),
  },
  {
    id: 't-5',
    title: 'تخصيص قوالب شهادات ختام الأنشطة الرياضية والموهبة',
    dueDate: 'الأسبوع القادم',
    priority: 'متوسطة',
    completed: false,
    category: 'إعداد قوالب',
    notes: 'استخدام الخط الكوفي واللون الملكي',
    linkTab: 'editor',
    createdAt: new Date().toISOString(),
  }
];

export const DashboardAnalytics: React.FC<Props> = ({
  currentCertificate,
  onLoadCertificate,
  onNavigateToTab,
  onShowToast
}) => {
  // Live storage data states
  const [cloudCerts, setCloudCerts] = useState<CertificateData[]>([]);
  const [batches, setBatches] = useState<BatchRecord[]>([]);
  const [studentGroups, setStudentGroups] = useState<StudentGroup[]>([]);
  const [draftsCount, setDraftsCount] = useState(0);

  // Tasks state
  const [tasks, setTasks] = useState<ReminderTask[]>(() => {
    try {
      const saved = localStorage.getItem(TASKS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Error loading dashboard tasks:', e);
    }
    return INITIAL_TASKS;
  });

  // Task creation and filter states
  const [taskFilter, setTaskFilter] = useState<'all' | 'pending' | 'completed' | 'high_priority'>('all');
  const [taskCategoryFilter, setTaskCategoryFilter] = useState<string>('all');
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('اليوم');
  const [newTaskPriority, setNewTaskPriority] = useState<ReminderTask['priority']>('متوسطة');
  const [newTaskCategory, setNewTaskCategory] = useState<string>('تسليم شهادات');
  const [newTaskNotes, setNewTaskNotes] = useState('');
  const [newTaskLinkTab, setNewTaskLinkTab] = useState<ReminderTask['linkTab']>('editor');

  // Honors records filter & search
  const [recordSearch, setRecordSearch] = useState('');
  const [recordCategoryFilter, setRecordCategoryFilter] = useState('all');
  const [recordGradeFilter, setRecordGradeFilter] = useState('all');
  const [recordPage, setRecordPage] = useState(1);
  const RECORDS_PER_PAGE = 8;

  // Active view tab in analytics
  const [analyticsView, setAnalyticsView] = useState<'overview' | 'tasks' | 'records' | 'insights'>('overview');

  // Load real data and subscribe to changes
  const refreshData = () => {
    setCloudCerts(getStoredCloudCertificates());
    setBatches(getSavedBatches());
    setStudentGroups(getSavedStudentGroups());
    setDraftsCount(getSavedDrafts().length);
  };

  useEffect(() => {
    refreshData();
    const unsubArchive = subscribeToArchiveChanges(refreshData);
    const unsubBatch = subscribeToBatches(refreshData);
    return () => {
      unsubArchive();
      unsubBatch();
    };
  }, []);

  // Save tasks to LocalStorage on update
  useEffect(() => {
    try {
      localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
    } catch (e) {
      console.error('Error saving dashboard tasks:', e);
    }
  }, [tasks]);

  // Aggregate all student records from Cloud saved certs and batches
  const allHonoredRecords = useMemo(() => {
    const list: Array<{
      id: string;
      studentName: string;
      grade: string;
      subject: string;
      awardTitle: string;
      date: string;
      schoolName: string;
      verificationCode: string;
      source: 'single' | 'batch';
      driveUrl?: string;
      certObj?: CertificateData;
    }> = [];

    // Single Cloud Certificates
    cloudCerts.forEach((cert) => {
      list.push({
        id: cert.id || `cloud-${Math.random()}`,
        studentName: cert.studentName || 'طالب متميز',
        grade: cert.grade || 'غير محدد',
        subject: cert.subject || 'التفوق العام',
        awardTitle: cert.badgeTitle || cert.title || 'وسام التميز',
        date: cert.issueDate || cert.issueDateGregorian || cert.archiveDate || cert.createdAt?.slice(0, 10) || '2026/08/01',
        schoolName: cert.schoolName || 'مدرسة التميز',
        verificationCode: cert.verificationCode || '',
        source: 'single',
        driveUrl: cert.driveFileWebViewLink || cert.driveFileUrl,
        certObj: cert,
      });
    });

    // Batches Certificates
    batches.forEach((batch) => {
      if (batch.certificates && Array.isArray(batch.certificates)) {
        batch.certificates.forEach((cert, idx) => {
          list.push({
            id: cert.id || `batch-${batch.id}-${idx}`,
            studentName: cert.studentName || 'طالب متميز',
            grade: cert.grade || batch.grade || 'غير محدد',
            subject: cert.subject || batch.subject || 'التفوق العام',
            awardTitle: cert.badgeTitle || cert.title || batch.title || 'وسام التميز',
            date: cert.issueDate || batch.createdAt?.slice(0, 10) || '2026/08/01',
            schoolName: cert.schoolName || 'مدرسة التميز',
            verificationCode: cert.verificationCode || '',
            source: 'batch',
            driveUrl: cert.driveFileWebViewLink || cert.driveFileUrl || batch.driveFolderLink,
            certObj: cert,
          });
        });
      }
    });

    // If completely empty on fresh install, provide educational default data
    if (list.length === 0) {
      return [
        { id: 'def-1', studentName: 'أحمد بن محمد العتيبي', grade: 'الأول الثانوي - أ', subject: 'الرياضيات والابتكار', awardTitle: 'وسام التميز الأول', date: '2026/08/20', schoolName: 'مدرسة التميز النموذجية', verificationCode: 'TAQDEER-2026-X89F2A', source: 'single' as const },
        { id: 'def-2', studentName: 'سارة بنت خالد الغامدي', grade: 'الثالث المتوسط - ب', subject: 'الانضباط ومكارم الأخلاق', awardTitle: 'شرف الأخلاق والريادة', date: '2026/08/19', schoolName: 'مدرسة التميز النموذجية', verificationCode: 'TAQDEER-2026-B72M9P', source: 'single' as const },
        { id: 'def-3', studentName: 'عمر بن فيصل الشمري', grade: 'الثاني الثانوي - ج', subject: 'النشاط الرياضي والقيادة', awardTitle: 'قائد الفريق المثالي', date: '2026/08/18', schoolName: 'مدرسة التميز النموذجية', verificationCode: 'TAQDEER-2026-N44K1R', source: 'batch' as const },
        { id: 'def-4', studentName: 'عبد الرحمن بن يوسف القحطاني', grade: 'القرآن الكريم', subject: 'حفظ وتجويد 5 أجزاء', awardTitle: 'خادم كتاب الله', date: '2026/08/17', schoolName: 'مدرسة التميز النموذجية', verificationCode: 'TAQDEER-2026-H88Q3V', source: 'single' as const },
        { id: 'def-5', studentName: 'ريما بنت ناصر الدوسري', grade: 'الصف الرابع الابتدائي - ب', subject: 'الإبداع الفني والرسم', awardTitle: 'نجمة الفصل المبدعة', date: '2026/08/16', schoolName: 'مدرسة التميز النموذجية', verificationCode: 'TAQDEER-2026-L55Z7T', source: 'batch' as const },
        { id: 'def-6', studentName: 'فيصل بن نواف الشمري', grade: 'المرحلة الابتدائية', subject: 'ابتكار الروبوت والذكاء الاصطناعي', awardTitle: 'وسام المخترع الصغير', date: '2026/08/15', schoolName: 'مدرسة التميز النموذجية', verificationCode: 'TAQDEER-2026-W99D2E', source: 'single' as const },
      ];
    }

    return list;
  }, [cloudCerts, batches]);

  // Overall Statistics Calculations
  const stats = useMemo(() => {
    const totalCertificates = allHonoredRecords.length;
    const uniqueStudents = new Set(allHonoredRecords.map(r => r.studentName.trim())).size;
    const driveVerifiedCount = allHonoredRecords.filter(r => !!r.driveUrl).length;
    const qrVerifiedCount = allHonoredRecords.filter(r => !!r.verificationCode).length;
    const completedTasksCount = tasks.filter(t => t.completed).length;
    const pendingTasksCount = tasks.filter(t => !t.completed).length;
    const highPriorityPendingCount = tasks.filter(t => !t.completed && t.priority === 'عالية').length;
    const totalBatchesCount = batches.length;
    const activeStudentGroupsCount = studentGroups.length;

    // Subjects frequency
    const subjectMap: { [key: string]: number } = {};
    allHonoredRecords.forEach(r => {
      const s = r.subject || 'التفوق العام';
      subjectMap[s] = (subjectMap[s] || 0) + 1;
    });
    const topSubject = Object.entries(subjectMap).sort((a, b) => b[1] - a[1])[0]?.[0] || 'الرياضيات والتفوق';

    // Grades frequency
    const gradeMap: { [key: string]: number } = {};
    allHonoredRecords.forEach(r => {
      const g = r.grade || 'غير محدد';
      gradeMap[g] = (gradeMap[g] || 0) + 1;
    });

    const completionRate = tasks.length > 0 ? Math.round((completedTasksCount / tasks.length) * 100) : 100;
    const qrRate = totalCertificates > 0 ? Math.round((qrVerifiedCount / totalCertificates) * 100) : 100;

    return {
      totalCertificates,
      uniqueStudents,
      driveVerifiedCount,
      qrVerifiedCount,
      qrRate,
      completedTasksCount,
      pendingTasksCount,
      highPriorityPendingCount,
      completionRate,
      topSubject,
      subjectBreakdown: Object.entries(subjectMap).sort((a, b) => b[1] - a[1]).slice(0, 5),
      gradeBreakdown: Object.entries(gradeMap).sort((a, b) => b[1] - a[1]).slice(0, 5),
      totalBatchesCount,
      activeStudentGroupsCount,
      draftsCount,
    };
  }, [allHonoredRecords, tasks, batches, studentGroups, draftsCount]);

  // Filtered Tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (taskFilter === 'pending' && t.completed) return false;
      if (taskFilter === 'completed' && !t.completed) return false;
      if (taskFilter === 'high_priority' && t.priority !== 'عالية') return false;
      if (taskCategoryFilter !== 'all' && t.category !== taskCategoryFilter) return false;
      return true;
    });
  }, [tasks, taskFilter, taskCategoryFilter]);

  // Filtered Honor Records
  const filteredRecords = useMemo(() => {
    return allHonoredRecords.filter((r) => {
      if (recordSearch.trim()) {
        const q = recordSearch.toLowerCase().trim();
        const match =
          r.studentName.toLowerCase().includes(q) ||
          r.grade.toLowerCase().includes(q) ||
          r.subject.toLowerCase().includes(q) ||
          r.awardTitle.toLowerCase().includes(q) ||
          r.schoolName.toLowerCase().includes(q) ||
          r.verificationCode.toLowerCase().includes(q);
        if (!match) return false;
      }

      if (recordCategoryFilter === 'drive' && !r.driveUrl) return false;
      if (recordCategoryFilter === 'single' && r.source !== 'single') return false;
      if (recordCategoryFilter === 'batch' && r.source !== 'batch') return false;

      if (recordGradeFilter !== 'all' && r.grade !== recordGradeFilter) return false;

      return true;
    });
  }, [allHonoredRecords, recordSearch, recordCategoryFilter, recordGradeFilter]);

  // Unique Grades for filtering
  const uniqueGrades = useMemo(() => {
    const grades = new Set<string>();
    allHonoredRecords.forEach(r => {
      if (r.grade && r.grade !== 'غير محدد') grades.add(r.grade);
    });
    return Array.from(grades);
  }, [allHonoredRecords]);

  // Paginated Records
  const totalRecordPages = Math.ceil(filteredRecords.length / RECORDS_PER_PAGE) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (recordPage - 1) * RECORDS_PER_PAGE;
    return filteredRecords.slice(start, start + RECORDS_PER_PAGE);
  }, [filteredRecords, recordPage]);

  // Task actions
  const handleAddTask = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const task: ReminderTask = {
      id: `task-${Date.now()}`,
      title: newTaskTitle.trim(),
      dueDate: newTaskDueDate.trim() || 'اليوم',
      priority: newTaskPriority,
      completed: false,
      category: newTaskCategory,
      notes: newTaskNotes.trim(),
      linkTab: newTaskLinkTab,
      createdAt: new Date().toISOString(),
    };

    setTasks([task, ...tasks]);
    setNewTaskTitle('');
    setNewTaskNotes('');
    setIsAddingTask(false);
    onShowToast?.('تمت إضافة المهمة بنجاح إلى جدول المتابعة 📌');
  };

  const handleToggleTask = (id: string) => {
    setTasks(tasks.map(t => {
      if (t.id === id) {
        const nextCompleted = !t.completed;
        return {
          ...t,
          completed: nextCompleted,
          completedAt: nextCompleted ? new Date().toISOString() : undefined,
        };
      }
      return t;
    }));
  };

  const handleDeleteTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
    onShowToast?.('تم حذف المهمة من القائمة 🗑️');
  };

  // Export Records as CSV
  const handleExportCsv = () => {
    try {
      const headers = ['اسم الطالب', 'الصف الدراسي', 'المادة / النشاط', 'عنوان الوسام', 'تاريخ الإصدار', 'المدرسة', 'كود التوثيق', 'المصدر', 'رابط درايف'];
      const rows = filteredRecords.map(r => [
        `"${r.studentName.replace(/"/g, '""')}"`,
        `"${r.grade.replace(/"/g, '""')}"`,
        `"${r.subject.replace(/"/g, '""')}"`,
        `"${r.awardTitle.replace(/"/g, '""')}"`,
        `"${r.date}"`,
        `"${r.schoolName.replace(/"/g, '""')}"`,
        `"${r.verificationCode}"`,
        `"${r.source === 'single' ? 'شهادة فردية' : 'دفعة جماعية'}"`,
        `"${r.driveUrl || ''}"`
      ]);

      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `سجل_المكرمين_منظومة_تقدير_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      onShowToast?.('تم تصدير سجل المكرمين بنجاح كملف CSV / Excel! 📊✨');
    } catch (e) {
      console.error('Error exporting CSV:', e);
      onShowToast?.('حدث خطأ أثناء تصدير الملف.');
    }
  };

  // Print Honor Roll Report
  const handlePrintHonorRoll = () => {
    window.print();
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 text-right pb-16 animate-in fade-in duration-200">
      
      {/* 1. TOP HERO COMMAND BAR */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/80 p-5 sm:p-6 rounded-3xl shadow-xl text-white relative overflow-hidden">
        <div className="absolute top-0 left-0 -mt-8 -ml-8 w-56 h-56 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 -mb-8 -mr-8 w-56 h-56 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="p-1.5 rounded-xl bg-amber-500 text-slate-950 font-black shadow-md">
                <LayoutDashboard className="w-5 h-5" />
              </span>
              <h2 className="text-lg sm:text-2xl font-black tracking-tight text-white font-['Cairo']">
                لوحة الإنجاز والمتابعة الأكاديمية الذكية
              </h2>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                تحديث حي ⚡
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              مركز القيادة لمتابعة إنجازات التكريم، تنظيم المهام المدرسية والمواعيد، واستعراض سجلات الطلاب المعتمدة والموثقة رقمياً.
            </p>
          </div>

          {/* Quick Action Navigation Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsAddingTask(true)}
              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>مهمة جديدة</span>
            </button>

            <button
              onClick={() => onNavigateToTab?.('batch')}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-600 transition flex items-center gap-1.5 cursor-pointer"
            >
              <Users className="w-4 h-4 text-amber-400" />
              <span>الشهادات الجماعية</span>
            </button>

            <button
              onClick={() => onNavigateToTab?.('editor')}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-600 transition flex items-center gap-1.5 cursor-pointer"
            >
              <Award className="w-4 h-4 text-amber-400" />
              <span>إصدار شهادة</span>
            </button>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1.5 mt-5 pt-4 border-t border-slate-700/60 overflow-x-auto no-scrollbar">
          {[
            { id: 'overview', label: 'نظرة عامة ومؤشرات', icon: LayoutDashboard },
            { id: 'tasks', label: `المهام والمواعيد (${stats.pendingTasksCount})`, icon: ListTodo },
            { id: 'records', label: `سجل المكرمين (${stats.totalCertificates})`, icon: Award },
            { id: 'insights', label: 'التحليلات والتوزيع', icon: PieChart },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = analyticsView === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setAnalyticsView(tab.id as any)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                    : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/40'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. REAL-TIME STATS / KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Issued Certificates */}
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 hover:border-amber-400 transition group">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 block">إجمالي الشهادات الصادرة</span>
              <span className="text-2xl sm:text-3xl font-black text-slate-900 mt-1 block">
                {stats.totalCertificates} <span className="text-xs font-bold text-slate-400">شهادة</span>
              </span>
              <div className="flex items-center gap-1 mt-2 text-[11px] font-bold text-emerald-600">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>{stats.totalBatchesCount} دفعات + {cloudCerts.length} فردية</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-xl group-hover:scale-105 transition">
              <Award className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Total Unique Honored Students */}
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 hover:border-indigo-400 transition group">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 block">إجمالي الطلاب المكرمين</span>
              <span className="text-2xl sm:text-3xl font-black text-slate-900 mt-1 block">
                {stats.uniqueStudents} <span className="text-xs font-bold text-slate-400">طالب/طالبة</span>
              </span>
              <div className="flex items-center gap-1 mt-2 text-[11px] font-bold text-indigo-600">
                <Users className="w-3.5 h-3.5" />
                <span>{stats.activeStudentGroupsCount} فصول ومجموعات مسجلة</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xl group-hover:scale-105 transition">
              <GraduationCap className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Digital Verification & QR Rate */}
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 hover:border-emerald-400 transition group">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 block">نسبة التوثيق والباركود</span>
              <span className="text-2xl sm:text-3xl font-black text-emerald-700 mt-1 block">
                {stats.qrRate}% <span className="text-xs font-bold text-slate-400">موثق رقمياً</span>
              </span>
              <div className="flex items-center gap-1 mt-2 text-[11px] font-bold text-emerald-600">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{stats.driveVerifiedCount} مرفوع على Google Drive</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xl group-hover:scale-105 transition">
              <ShieldCheck className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Task Completion Progress */}
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 hover:border-amber-400 transition group">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 block">معدل إنجاز المهام</span>
              <span className="text-2xl sm:text-3xl font-black text-slate-900 mt-1 block">
                {stats.completionRate}%
              </span>
              <div className="flex items-center gap-1.5 mt-2">
                <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                  {stats.pendingTasksCount} مهام معلقة
                </span>
                {stats.highPriorityPendingCount > 0 && (
                  <span className="text-[11px] font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <Flame className="w-3 h-3 text-rose-600 animate-pulse" /> {stats.highPriorityPendingCount} عاجل
                  </span>
                )}
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-xl group-hover:scale-105 transition">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>
        </div>

      </div>

      {/* 3. MAIN WORKSPACE GRID (TASKS & RECORD LOG) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: INTERACTIVE TASKS & MILESTONES (5 Cols) */}
        {(analyticsView === 'overview' || analyticsView === 'tasks') && (
          <div className={`${analyticsView === 'tasks' ? 'lg:col-span-12' : 'lg:col-span-5'} bg-white p-5 sm:p-6 rounded-3xl shadow-xs border border-slate-200 space-y-4`}>
            
            {/* Tasks Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-amber-100 text-amber-900 rounded-xl font-black">
                  <ListTodo className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900 font-['Cairo']">
                    تنبيهات المواعيد وتتبع الإنجاز
                  </h3>
                  <span className="text-[11px] text-slate-400">تنظيم مواعيد التكريم وتسليم الشهادات</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAddingTask(!isAddingTask)}
                className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-xs flex items-center gap-1 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة مهمة</span>
              </button>
            </div>

            {/* Task Progress Bar */}
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>نسبة إنجاز مهام التكريم</span>
                <span className="font-mono text-amber-700">{stats.completedTasksCount} من {tasks.length} منجزة ({stats.completionRate}%)</span>
              </div>
              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-l from-amber-500 to-amber-400 rounded-full transition-all duration-500"
                  style={{ width: `${stats.completionRate}%` }}
                />
              </div>
            </div>

            {/* Add Task Form (Collapsible) */}
            {isAddingTask && (
              <form onSubmit={handleAddTask} className="bg-amber-50/50 p-4 rounded-2xl border border-amber-200/80 space-y-3 animate-in fade-in duration-150">
                <div className="flex items-center justify-between text-xs font-bold text-amber-900 border-b border-amber-200/60 pb-1.5">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    تفاصيل المهمة والموعد
                  </span>
                  <button type="button" onClick={() => setIsAddingTask(false)} className="text-slate-400 hover:text-slate-700">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="مثال: طباعة شهادات تفوق الصف الأول الثانوي..."
                  className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                  autoFocus
                />

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">الموعد / التوقيت:</label>
                    <input
                      type="text"
                      value={newTaskDueDate}
                      onChange={(e) => setNewTaskDueDate(e.target.value)}
                      placeholder="اليوم، غداً، الأحد..."
                      className="w-full px-2.5 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">الأولوية:</label>
                    <select
                      value={newTaskPriority}
                      onChange={(e) => setNewTaskPriority(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 text-xs font-bold border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="عالية">🔴 عالية (عاجل)</option>
                      <option value="متوسطة">🟡 متوسطة (هام)</option>
                      <option value="عادية">🟢 عادية</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">التصنيف:</label>
                    <select
                      value={newTaskCategory}
                      onChange={(e) => setNewTaskCategory(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs font-bold border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="تسليم شهادات">تسليم شهادات</option>
                      <option value="مراجعة درجات">مراجعة درجات</option>
                      <option value="حفل تكريم">حفل تكريم</option>
                      <option value="إعداد قوالب">إعداد قوالب</option>
                      <option value="توثيق درايف">توثيق درايف</option>
                      <option value="مسابقات وإنجازات">مسابقات وإنجازات</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingTask(false)}
                    className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-lg cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-lg shadow-xs flex items-center gap-1 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    حفظ المهمة
                  </button>
                </div>
              </form>
            )}

            {/* Task Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs">
              {[
                { id: 'all', label: 'الكل' },
                { id: 'pending', label: `قيد الانتظار (${stats.pendingTasksCount})` },
                { id: 'completed', label: `المكتملة (${stats.completedTasksCount})` },
                { id: 'high_priority', label: 'عالية الأولوية 🔴' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setTaskFilter(f.id as any)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                    taskFilter === f.id
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Tasks List */}
            <div className="space-y-2 max-h-[460px] overflow-y-auto pr-0.5">
              {filteredTasks.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 space-y-2">
                  <CheckCircle className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="text-xs font-bold">لا توجد مهام تطابق التصفية الحالية</p>
                </div>
              ) : (
                filteredTasks.map((task) => {
                  const isHigh = task.priority === 'عالية';
                  const isMed = task.priority === 'متوسطة';

                  return (
                    <div
                      key={task.id}
                      className={`p-3.5 rounded-2xl border transition flex items-start justify-between gap-3 ${
                        task.completed
                          ? 'bg-slate-50/80 border-slate-200 opacity-60'
                          : isHigh
                          ? 'bg-rose-50/20 border-rose-200 hover:border-rose-300'
                          : 'bg-white border-slate-200 hover:border-amber-300'
                      }`}
                    >
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <button
                          type="button"
                          onClick={() => handleToggleTask(task.id)}
                          className={`mt-0.5 w-5 h-5 rounded-lg border flex items-center justify-center transition cursor-pointer shrink-0 ${
                            task.completed
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : 'border-slate-300 hover:border-amber-500 bg-white'
                          }`}
                          title={task.completed ? 'تعيين كغير مكتمل' : 'تعيين كمكتمل'}
                        >
                          {task.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </button>

                        <div className="min-w-0 flex-1">
                          <h4 className={`text-xs font-bold leading-snug ${task.completed ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                            {task.title}
                          </h4>

                          {task.notes && (
                            <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">{task.notes}</p>
                          )}

                          <div className="flex flex-wrap items-center gap-1.5 mt-2">
                            <span className="text-[10px] text-slate-500 flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-md font-medium">
                              <Clock className="w-3 h-3 text-slate-400" /> {task.dueDate}
                            </span>

                            <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                              isHigh
                                ? 'bg-rose-100 text-rose-800'
                                : isMed
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}>
                              {task.priority}
                            </span>

                            <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium">
                              {task.category}
                            </span>

                            {task.linkTab && (
                              <button
                                type="button"
                                onClick={() => onNavigateToTab?.(task.linkTab!)}
                                className="text-[10px] text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded-md font-bold flex items-center gap-0.5 cursor-pointer"
                              >
                                <span>انتقال للقسم</span>
                                <ArrowUpRight className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteTask(task.id)}
                        className="text-slate-300 hover:text-rose-600 p-1 rounded-lg transition cursor-pointer shrink-0"
                        title="حذف المهمة"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Productivity Integrations Footer */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-[11px] text-slate-500 font-bold">التكامل مع التقويم والمهام:</span>
              <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md text-[10px] font-bold border border-blue-200">
                  Google Tasks ✓
                </span>
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md text-[10px] font-bold border border-emerald-200">
                  مزامنة سحابية ✓
                </span>
              </div>
            </div>

          </div>
        )}

        {/* RIGHT COLUMN: LIVE RECOGNITION LOG & REPORTS (7 Cols) */}
        {(analyticsView === 'overview' || analyticsView === 'records') && (
          <div className={`${analyticsView === 'records' ? 'lg:col-span-12' : 'lg:col-span-7'} bg-white p-5 sm:p-6 rounded-3xl shadow-xs border border-slate-200 space-y-4`}>
            
            {/* Header with Search and Export */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-100 text-indigo-900 rounded-xl font-black">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900 font-['Cairo']">
                    سجل التكريم الأكاديمي والشهادات الصادرة
                  </h3>
                  <span className="text-[11px] text-slate-400">إجمالي {filteredRecords.length} سجل معتمد</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition flex items-center gap-1 cursor-pointer"
                  title="تصدير السجل كملف Excel / CSV"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>تصدير Excel</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrintHonorRoll}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition flex items-center gap-1 cursor-pointer"
                  title="طباعة كشف التكريم"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>طباعة</span>
                </button>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
              <div className="sm:col-span-6 relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={recordSearch}
                  onChange={(e) => {
                    setRecordSearch(e.target.value);
                    setRecordPage(1);
                  }}
                  placeholder="بحث باسم الطالب، الصف، المادة، أو كود التوثيق..."
                  className="w-full pr-8 pl-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none text-xs font-semibold"
                />
              </div>

              <div className="sm:col-span-3">
                <select
                  value={recordCategoryFilter}
                  onChange={(e) => {
                    setRecordCategoryFilter(e.target.value);
                    setRecordPage(1);
                  }}
                  className="w-full px-2.5 py-2 border border-slate-200 rounded-xl bg-slate-50 font-bold text-xs outline-none"
                >
                  <option value="all">كافة المصادر</option>
                  <option value="drive">موثق على درايف ☁️</option>
                  <option value="single">شهادات فردية 📄</option>
                  <option value="batch">دفعات جماعية 👥</option>
                </select>
              </div>

              <div className="sm:col-span-3">
                <select
                  value={recordGradeFilter}
                  onChange={(e) => {
                    setRecordGradeFilter(e.target.value);
                    setRecordPage(1);
                  }}
                  className="w-full px-2.5 py-2 border border-slate-200 rounded-xl bg-slate-50 font-bold text-xs outline-none"
                >
                  <option value="all">كافة الصفوف الدراسية</option>
                  {uniqueGrades.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Recognition Records Table */}
            <div className="overflow-x-auto border border-slate-100 rounded-2xl">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold">
                    <th className="p-3">اسم الطالب المكرم</th>
                    <th className="p-3">الصف / المادة</th>
                    <th className="p-3">عنوان الوسام</th>
                    <th className="p-3">التوثيق والتاريخ</th>
                    <th className="p-3 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedRecords.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400 font-bold">
                        لا توجد سجلات تكريم تطابق شروط البحث
                      </td>
                    </tr>
                  ) : (
                    paginatedRecords.map((rec) => (
                      <tr key={rec.id} className="hover:bg-amber-50/30 transition group">
                        <td className="p-3">
                          <div className="font-bold text-slate-900">{rec.studentName}</div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">{rec.verificationCode}</div>
                        </td>

                        <td className="p-3">
                          <div className="text-slate-800 font-semibold">{rec.grade}</div>
                          <div className="text-[10px] text-slate-500">{rec.subject}</div>
                        </td>

                        <td className="p-3">
                          <span className="font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md inline-block">
                            {rec.awardTitle}
                          </span>
                        </td>

                        <td className="p-3">
                          <div className="text-slate-600 font-mono text-[11px]">{rec.date}</div>
                          <div className="mt-1">
                            {rec.driveUrl ? (
                              <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold inline-flex items-center gap-0.5">
                                <HardDrive className="w-2.5 h-2.5" /> درايف معتمد
                              </span>
                            ) : (
                              <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                                {rec.source === 'single' ? 'شهادة فردية' : 'دفعة جماعية'}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1 opacity-80 group-hover:opacity-100 transition">
                            {rec.certObj && (
                              <button
                                type="button"
                                onClick={() => onLoadCertificate?.(rec.certObj!)}
                                className="p-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg transition cursor-pointer"
                                title="فتح الشهادة بالمحرر لتعديلها"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {rec.driveUrl ? (
                              <a
                                href={rec.driveUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 bg-blue-100 hover:bg-blue-200 text-blue-900 rounded-lg transition"
                                title="فتح ملف الشهادة على Google Drive"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  if (rec.certObj) onLoadCertificate?.(rec.certObj);
                                  else onNavigateToTab?.('verify');
                                }}
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition cursor-pointer"
                                title="التحقق وبوابة التوثيق"
                              >
                                <ShieldCheck className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalRecordPages > 1 && (
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
                <span>صفحة {recordPage} من {totalRecordPages}</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setRecordPage(p => Math.max(1, p - 1))}
                    disabled={recordPage === 1}
                    className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setRecordPage(p => Math.min(totalRecordPages, p + 1))}
                    disabled={recordPage === totalRecordPages}
                    className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

          </div>
        )}

        {/* INSIGHTS / DETAILED BREAKDOWN TAB */}
        {analyticsView === 'insights' && (
          <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Subject Distribution */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h4 className="font-black text-sm text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-amber-600" />
                  توزيع التكريمات حسب المواد والأنشطة
                </h4>
                <span className="text-xs font-bold text-slate-400">أكثر 5 مواد تكريماً</span>
              </div>

              <div className="space-y-3">
                {stats.subjectBreakdown.map(([subject, count]) => {
                  const percent = Math.round((count / (stats.totalCertificates || 1)) * 100);
                  return (
                    <div key={subject} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                        <span>{subject}</span>
                        <span className="font-mono text-amber-700">{count} شهادة ({percent}%)</span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-l from-amber-500 to-amber-400 rounded-full"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Grade Distribution */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h4 className="font-black text-sm text-slate-900 flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-indigo-600" />
                  توزيع التكريمات حسب الصفوف والمراحل
                </h4>
                <span className="text-xs font-bold text-slate-400">تغطية الفصول</span>
              </div>

              <div className="space-y-3">
                {stats.gradeBreakdown.map(([grade, count]) => {
                  const percent = Math.round((count / (stats.totalCertificates || 1)) * 100);
                  return (
                    <div key={grade} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                        <span>{grade}</span>
                        <span className="font-mono text-indigo-700">{count} طالب ({percent}%)</span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-l from-indigo-500 to-indigo-400 rounded-full"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}

      </div>

      {/* 4. TEACHER & SCHOOL RECOGNITION BADGES */}
      <div className="bg-gradient-to-br from-amber-500/10 via-amber-400/5 to-slate-900/5 p-6 rounded-3xl border border-amber-200/80 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-600 fill-amber-500" />
            <h3 className="font-black text-sm sm:text-base text-slate-900 font-['Cairo']">
              أوسمة الإنجاز والتميز للعام الدراسي
            </h3>
          </div>
          <span className="text-xs font-bold text-amber-900 bg-amber-200/60 px-2.5 py-0.5 rounded-full">
            شرف التميز الأكاديمي
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2">
          
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-black">
              🏆
            </div>
            <div>
              <h5 className="text-xs font-black text-slate-900">المعلم المتميز</h5>
              <p className="text-[10px] text-slate-500">إصدار أكثر من 10 شهادات معتمدة</p>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black">
              🛡️
            </div>
            <div>
              <h5 className="text-xs font-black text-slate-900">رائد التوثيق الرقمي</h5>
              <p className="text-[10px] text-slate-500">تفعيل باركود QR لكافة الشهادات</p>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-black">
              ⚡
            </div>
            <div>
              <h5 className="text-xs font-black text-slate-900">سيد السرعة والجودة</h5>
              <p className="text-[10px] text-slate-500">إصدار دفعات جماعية مجمعة</p>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-black">
              🎯
            </div>
            <div>
              <h5 className="text-xs font-black text-slate-900">منظم محترف</h5>
              <p className="text-[10px] text-slate-500">إنجاز كافة مهام التكريم المجدولة</p>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};
