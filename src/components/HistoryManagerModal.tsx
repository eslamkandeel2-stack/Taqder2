import React, { useState, useMemo } from 'react';
import { CertificateData } from '../types';
import { saveCertificateAsDraft } from '../utils/draftsManager';
import {
  History,
  RotateCcw,
  RotateCw,
  Undo2,
  Redo2,
  Check,
  Eye,
  Bookmark,
  Sparkles,
  X,
  Search,
  CheckCircle2,
  Calendar,
  FileText,
  Palette,
  Award,
  Layers,
  ArrowRight,
  ArrowLeft,
  Clock,
  Zap,
  Sliders,
  ChevronDown,
  ChevronUp,
  BookmarkCheck,
  User
} from 'lucide-react';

interface HistoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: CertificateData[];
  historyIndex: number;
  onJumpToHistoryIndex: (index: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onShowToast: (message: string) => void;
}

interface StepDiffInfo {
  actionTitle: string;
  category: 'content' | 'style' | 'recipient' | 'structure' | 'init';
  changes: Array<{ label: string; from: string; to: string }>;
  timeFormatted: string;
}

/**
 * Compare two certificate states and produce a human-friendly diff summary
 */
function analyzeStepDiff(curr: CertificateData, prev?: CertificateData, index?: number): StepDiffInfo {
  const timeFormatted = curr.updatedAt
    ? new Date(curr.updatedAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : 'الآن';

  if (!prev || index === 0) {
    return {
      actionTitle: 'الحالة الابتدائية / فتح التصميم',
      category: 'init',
      changes: [
        { label: 'المستلم', from: '-', to: curr.studentName || 'غير محدد' },
        { label: 'العنوان', from: '-', to: curr.title || 'شهادة شكر وتقدير' },
        { label: 'القالب والنمط', from: '-', to: curr.frameStyle || 'افتراضي' }
      ],
      timeFormatted
    };
  }

  const changes: Array<{ label: string; from: string; to: string }> = [];
  let category: StepDiffInfo['category'] = 'content';
  let primaryAction = 'تحديث بيانات التصميم';

  // 1. Recipient info check
  if (curr.studentName !== prev.studentName) {
    changes.push({ label: 'اسم الطالب/ة', from: prev.studentName || '(فارغ)', to: curr.studentName || '(فارغ)' });
    primaryAction = `تعديل اسم المستلم إلى "${curr.studentName}"`;
    category = 'recipient';
  }
  if (curr.grade !== prev.grade) {
    changes.push({ label: 'الصف الدراسي', from: prev.grade || '(فارغ)', to: curr.grade || '(فارغ)' });
    if (!primaryAction.includes('اسم')) primaryAction = `تعديل الصف إلى "${curr.grade}"`;
  }
  if (curr.schoolName !== prev.schoolName) {
    changes.push({ label: 'اسم المدرسة/الجهة', from: prev.schoolName || '(فارغ)', to: curr.schoolName || '(فارغ)' });
  }
  if (curr.recipientGender !== prev.recipientGender) {
    changes.push({
      label: 'نوع الخطاب (الجنس)',
      from: prev.recipientGender === 'female' ? 'طالبة 👧' : 'طالب 👦',
      to: curr.recipientGender === 'female' ? 'طالبة 👧' : 'طالب 👦'
    });
    primaryAction = `تأنيث/تذكير الخطاب (${curr.recipientGender === 'female' ? 'طالبة' : 'طالب'})`;
    category = 'recipient';
  }

  // 2. Main content check
  if (curr.title !== prev.title) {
    changes.push({ label: 'عنوان الشهادة', from: prev.title || '', to: curr.title || '' });
    primaryAction = `تغيير العنوان إلى "${curr.title}"`;
    category = 'content';
  }
  if (curr.appreciationText !== prev.appreciationText) {
    changes.push({
      label: 'نص التقدير والثناء',
      from: (prev.appreciationText || '').substring(0, 30) + '...',
      to: (curr.appreciationText || '').substring(0, 30) + '...'
    });
    primaryAction = 'صياغة وتعديل نص التقدير والشكر';
    category = 'content';
  }
  if (curr.subject !== prev.subject) {
    changes.push({ label: 'مجال التكريم / المادة', from: prev.subject || '', to: curr.subject || '' });
  }
  if (curr.poemOrQuote !== prev.poemOrQuote || curr.showPoemOrQuote !== prev.showPoemOrQuote) {
    changes.push({ label: 'البيت الشعري / الحكمة', from: prev.showPoemOrQuote ? 'مُفعّل' : 'مخفي', to: curr.showPoemOrQuote ? 'مُفعّل' : 'مخفي' });
    primaryAction = 'تعديل البيت الشعري والعبارات الإضافية';
  }

  // 3. Styling & visual check
  if (curr.frameStyle !== prev.frameStyle) {
    changes.push({ label: 'إطار الشهادة', from: prev.frameStyle || '', to: curr.frameStyle || '' });
    primaryAction = `تغيير إطار الشهادة إلى "${curr.frameStyle}"`;
    category = 'style';
  }
  if (curr.primaryColor !== prev.primaryColor || curr.secondaryColor !== prev.secondaryColor || curr.backgroundColor !== prev.backgroundColor) {
    changes.push({ label: 'ألوان السمة', from: `${prev.primaryColor}`, to: `${curr.primaryColor}` });
    if (category !== 'recipient') {
      primaryAction = 'تعديل الألوان وسمة التصميم';
      category = 'style';
    }
  }
  if (curr.fontFamily !== prev.fontFamily || curr.headerFontFamily !== prev.headerFontFamily) {
    changes.push({ label: 'الخطوط والطباعة', from: prev.fontFamily || '', to: curr.fontFamily || '' });
    primaryAction = `تغيير نوع الخط إلى "${curr.fontFamily}"`;
    category = 'style';
  }
  if (curr.aspectRatio !== prev.aspectRatio) {
    changes.push({ label: 'مقاس/اتجاه الشهادة', from: prev.aspectRatio || '', to: curr.aspectRatio || '' });
    primaryAction = `تعديل أبعاد الشهادة (${curr.aspectRatio})`;
    category = 'structure';
  }

  // 4. Signatures & Badges check
  if (JSON.stringify(curr.signatures) !== JSON.stringify(prev.signatures)) {
    changes.push({ label: 'بيانات التوقيعات', from: `${prev.signatures?.length || 0} توقيع`, to: `${curr.signatures?.length || 0} توقيع` });
    primaryAction = 'تعديل التوقيعات والمسميات الرسمية';
    category = 'structure';
  }
  if (curr.badgeTitle !== prev.badgeTitle || curr.badgeIcon !== prev.badgeIcon || curr.showBadge !== prev.showBadge) {
    changes.push({ label: 'وسام التميز', from: prev.showBadge ? 'ظاهر' : 'مخفي', to: curr.showBadge ? 'ظاهر' : 'مخفي' });
    primaryAction = 'تحديث وسام وشارة التميز';
  }
  if (JSON.stringify(curr.stamp) !== JSON.stringify(prev.stamp)) {
    changes.push({ label: 'الختم الرسمي', from: prev.stamp?.title || '', to: curr.stamp?.title || '' });
    primaryAction = 'تعديل الختم والشعار المعتمد';
  }

  if (changes.length === 0) {
    changes.push({ label: 'تعديل طفيف', from: 'حالة سابقة', to: 'حالة محدثة' });
  }

  return {
    actionTitle: primaryAction,
    category,
    changes,
    timeFormatted
  };
}

export const HistoryManagerModal: React.FC<HistoryManagerModalProps> = ({
  isOpen,
  onClose,
  history,
  historyIndex,
  onJumpToHistoryIndex,
  onUndo,
  onRedo,
  onShowToast
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPreviewIndex, setSelectedPreviewIndex] = useState<number | null>(null);
  const [filterCategory, setFilterCategory] = useState<'all' | 'recipient' | 'style' | 'content' | 'structure'>('all');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  // Compute detailed diff for each step in history
  const historyAnalysis = useMemo(() => {
    return history.map((snapshot, idx) => {
      const prev = idx > 0 ? history[idx - 1] : undefined;
      const diff = analyzeStepDiff(snapshot, prev, idx);
      return {
        index: idx,
        snapshot,
        ...diff,
        isCurrent: idx === historyIndex,
        isPast: idx < historyIndex,
        isFuture: idx > historyIndex
      };
    });
  }, [history, historyIndex]);

  // Filtered timeline
  const filteredHistory = useMemo(() => {
    return historyAnalysis.filter(item => {
      // Category filter
      if (filterCategory !== 'all' && item.category !== filterCategory) {
        return false;
      }
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = item.snapshot.studentName?.toLowerCase().includes(q);
        const matchesTitle = item.snapshot.title?.toLowerCase().includes(q);
        const matchesAction = item.actionTitle?.toLowerCase().includes(q);
        const matchesGrade = item.snapshot.grade?.toLowerCase().includes(q);
        const matchesSubject = item.snapshot.subject?.toLowerCase().includes(q);
        return matchesName || matchesTitle || matchesAction || matchesGrade || matchesSubject;
      }
      return true;
    });
  }, [historyAnalysis, filterCategory, searchQuery]);

  if (!isOpen) return null;

  const currentSnapshot = history[historyIndex] || history[0];
  const activePreviewData = selectedPreviewIndex !== null ? history[selectedPreviewIndex] : currentSnapshot;

  const handleJump = (idx: number) => {
    onJumpToHistoryIndex(idx);
    const item = historyAnalysis[idx];
    onShowToast(`تم القفز إلى الخطوة (${idx + 1} من ${history.length}): ${item ? item.actionTitle : 'الحالة المحددة'} ⚡`);
  };

  const handleSaveSnapshotAsDraft = (snapshot: CertificateData, stepNum: number) => {
    try {
      const name = `${snapshot.title || 'شهادة'} - نسخة الخطوة ${stepNum} (${snapshot.studentName || 'مسودة'})`;
      saveCertificateAsDraft(snapshot, {
        name,
        type: 'draft',
        tags: ['سجل_تعديلات', `خطوة_${stepNum}`, snapshot.recipientGender === 'female' ? 'طالبات' : 'طلاب'],
        notes: `تم حفظ هذه النسخة من سجل التعديلات الزمني (الخطوة ${stepNum} من ${history.length})`
      });
      onShowToast(`تم حفظ نسخة الخطوة #${stepNum} كمسودة في سجل المسودات بنجاح! 💾`);
    } catch (e) {
      console.error(e);
      onShowToast('حدث خطأ أثناء حفظ المسودة');
    }
  };

  const pastStepsCount = historyIndex;
  const futureStepsCount = history.length - 1 - historyIndex;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-5xl h-[92vh] max-h-[850px] shadow-2xl flex flex-col overflow-hidden text-slate-100 font-['Cairo',sans-serif]">
        
        {/* Modal Top Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
              <History className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-white">
                  سجل التعديلات والقفز الزمني (Undo/Redo History)
                </h2>
                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full text-xs font-bold font-mono">
                  {history.length} حالات مسجلة
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                تصفح كافة مراحل تصميم الشهادة والقفز المباشر لأي خطوة سابقة أو لاحقة مع معاينة الفروقات بدقة.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer shrink-0"
            title="إغلاق السجل"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Jump & Controls Action Bar */}
        <div className="p-3 sm:p-4 bg-slate-950/70 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          
          {/* Timeline Status Badge */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-300">موقعك الحالي:</span>
            <div className="flex items-center gap-1.5 bg-slate-900 border border-amber-500/40 px-3 py-1 rounded-xl text-xs font-extrabold text-amber-300">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>الخطوة ({historyIndex + 1} من {history.length})</span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
              ({pastStepsCount} سابقة ↩️ • {futureStepsCount} لاحقة ↪️)
            </span>
          </div>

          {/* Quick Buttons: Start, Undo, Redo, End */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => handleJump(0)}
              disabled={historyIndex === 0}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                historyIndex === 0
                  ? 'bg-slate-800/40 text-slate-500 cursor-not-allowed border border-slate-800'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
              }`}
              title="القفز إلى نقطة الصفر (أول حالة عند فتح المحرر)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">البداية (نقطة 0)</span>
            </button>

            <button
              type="button"
              onClick={onUndo}
              disabled={historyIndex === 0}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                historyIndex === 0
                  ? 'bg-slate-800/40 text-slate-500 cursor-not-allowed border border-slate-800'
                  : 'bg-amber-500 text-slate-950 font-black hover:bg-amber-400 shadow-xs'
              }`}
              title="تراجع خطوة واحدة (Ctrl+Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>تراجع</span>
            </button>

            <button
              type="button"
              onClick={onRedo}
              disabled={historyIndex >= history.length - 1}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                historyIndex >= history.length - 1
                  ? 'bg-slate-800/40 text-slate-500 cursor-not-allowed border border-slate-800'
                  : 'bg-amber-500 text-slate-950 font-black hover:bg-amber-400 shadow-xs'
              }`}
              title="إعادة خطوة واحدة (Ctrl+Y)"
            >
              <Redo2 className="w-3.5 h-3.5" />
              <span>إعادة</span>
            </button>

            <button
              type="button"
              onClick={() => handleJump(history.length - 1)}
              disabled={historyIndex === history.length - 1}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                historyIndex === history.length - 1
                  ? 'bg-slate-800/40 text-slate-500 cursor-not-allowed border border-slate-800'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
              }`}
              title="القفز إلى آخر تعديل تم إجراؤه"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">أحدث تعديل</span>
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-3 bg-slate-900 border-b border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
          
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث في سجل التعديلات (اسم الطالب، الإجراء، الصف، العنوان)..."
              className="w-full pl-3 pr-9 py-1.5 bg-slate-950 border border-slate-700 text-xs rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
            <button
              type="button"
              onClick={() => setFilterCategory('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition shrink-0 cursor-pointer ${
                filterCategory === 'all'
                  ? 'bg-amber-500 text-slate-950 font-black'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              الكل ({history.length})
            </button>

            <button
              type="button"
              onClick={() => setFilterCategory('recipient')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition shrink-0 cursor-pointer flex items-center gap-1 ${
                filterCategory === 'recipient'
                  ? 'bg-amber-500 text-slate-950 font-black'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <User className="w-3 h-3" />
              <span>المستلم والاسم</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterCategory('style')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition shrink-0 cursor-pointer flex items-center gap-1 ${
                filterCategory === 'style'
                  ? 'bg-amber-500 text-slate-950 font-black'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Palette className="w-3 h-3" />
              <span>المظهر والألوان</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterCategory('content')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition shrink-0 cursor-pointer flex items-center gap-1 ${
                filterCategory === 'content'
                  ? 'bg-amber-500 text-slate-950 font-black'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <FileText className="w-3 h-3" />
              <span>النصوص والتقدير</span>
            </button>
          </div>
        </div>

        {/* Main Body: Timeline List & Live Diff Inspector */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3">
          
          {filteredHistory.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <History className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-sm font-bold text-slate-400">لا توجد خطوات مطابقة لخيارات البحث أو الفلتر.</p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setFilterCategory('all');
                }}
                className="text-xs text-amber-400 font-bold hover:underline cursor-pointer"
              >
                إعادة ضبط الفلاتر وعرض كافة الخطوات
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredHistory.map((item) => {
                const isCurrent = item.isCurrent;
                const isExpanded = expandedIndex === item.index;

                return (
                  <div
                    key={item.index}
                    className={`rounded-2xl border transition-all duration-200 ${
                      isCurrent
                        ? 'bg-gradient-to-r from-amber-950/40 via-slate-900 to-amber-950/30 border-amber-500/80 shadow-lg shadow-amber-950/20 ring-1 ring-amber-500/30'
                        : item.isPast
                        ? 'bg-slate-950/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                        : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700 opacity-80 hover:opacity-100'
                    }`}
                  >
                    <div className="p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      
                      {/* Left: Step Info & Badges */}
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        
                        {/* Step Number Circle */}
                        <div
                          className={`w-9 h-9 rounded-2xl flex items-center justify-center font-black font-mono text-xs shrink-0 shadow-inner ${
                            isCurrent
                              ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-300 scale-105'
                              : item.isPast
                              ? 'bg-slate-800 text-slate-200 border border-slate-700'
                              : 'bg-slate-900 text-slate-400 border border-slate-800'
                          }`}
                        >
                          #{item.index + 1}
                        </div>

                        {/* Title, Action & Tags */}
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className={`text-xs sm:text-sm font-extrabold truncate ${isCurrent ? 'text-amber-300' : 'text-white'}`}>
                              {item.actionTitle}
                            </h3>

                            {isCurrent && (
                              <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-ping" />
                                📍 الحالة النشطة حالياً
                              </span>
                            )}

                            {item.isPast && (
                              <span className="bg-sky-950/80 text-sky-300 border border-sky-500/30 text-[10px] font-bold px-2 py-0.2 rounded-full">
                                ↩️ خطوة سابقة
                              </span>
                            )}

                            {item.isFuture && (
                              <span className="bg-purple-950/80 text-purple-300 border border-purple-500/30 text-[10px] font-bold px-2 py-0.2 rounded-full">
                                ↪️ خطوة لاحقة (إعادة)
                              </span>
                            )}
                          </div>

                          {/* Snapshot Meta Snapshot */}
                          <div className="flex items-center gap-2 sm:gap-3 text-[11px] text-slate-400 flex-wrap">
                            <span className="flex items-center gap-1 text-slate-300">
                              <User className="w-3 h-3 text-amber-400" />
                              <strong className="font-bold">{item.snapshot.studentName || 'بدون اسم'}</strong>
                            </span>

                            <span className="text-slate-600">•</span>

                            <span className="truncate max-w-[150px] sm:max-w-[200px]">
                              {item.snapshot.title || 'شهادة شكر وتقدير'}
                            </span>

                            <span className="text-slate-600">•</span>

                            <span className="font-mono text-slate-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {item.timeFormatted}
                            </span>

                            {/* Frame & Color dot indicators */}
                            <div className="flex items-center gap-1 mr-1">
                              <span
                                className="w-3 h-3 rounded-full border border-white/20 shadow-xs"
                                style={{ backgroundColor: item.snapshot.primaryColor || '#854d0e' }}
                                title={`اللون الرئيسي: ${item.snapshot.primaryColor}`}
                              />
                              <span
                                className="w-3 h-3 rounded-full border border-white/20 shadow-xs"
                                style={{ backgroundColor: item.snapshot.backgroundColor || '#fefce8' }}
                                title={`لون الخلفية: ${item.snapshot.backgroundColor}`}
                              />
                              <span className="text-[10px] text-slate-400 font-mono bg-slate-900 px-1.5 py-0.2 rounded border border-slate-800">
                                {item.snapshot.frameStyle || 'إطار كلاسيكي'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions (Jump, Toggle Diff, Save) */}
                      <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0 w-full sm:w-auto justify-end">
                        
                        {/* Toggle Diff Details Button */}
                        <button
                          type="button"
                          onClick={() => setExpandedIndex(isExpanded ? null : item.index)}
                          className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                          title="عرض تفاصيل التغييرات في هذه الخطوة"
                        >
                          <span>التفاصيل ({item.changes.length})</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>

                        {/* Save snapshot as draft */}
                        <button
                          type="button"
                          onClick={() => handleSaveSnapshotAsDraft(item.snapshot, item.index + 1)}
                          className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-amber-300 border border-slate-800 rounded-xl transition cursor-pointer"
                          title="حفظ هذه الحالة بالذات كمسودة مستقلة"
                        >
                          <Bookmark className="w-4 h-4" />
                        </button>

                        {/* Jump Button */}
                        {isCurrent ? (
                          <div className="px-4 py-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-black rounded-xl flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" />
                            <span>المعروضة حالياً</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleJump(item.index)}
                            className="px-4 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 active:scale-95 text-slate-950 font-black text-xs rounded-xl shadow-md transition flex items-center gap-1 cursor-pointer"
                            title={`القفز فوراً إلى هذه الحالة (الخطوة #${item.index + 1})`}
                          >
                            <Zap className="w-3.5 h-3.5 fill-slate-950" />
                            <span>القفز لهذه الحالة</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Expandable Diff Panel */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-1 border-t border-slate-800/80 bg-slate-950/60 rounded-b-2xl space-y-2 text-xs animate-fadeIn">
                        <div className="flex items-center justify-between text-slate-400 font-bold mb-1">
                          <span>ملخص الفروقات والتغييرات مقارنة بالخطوة السابقة:</span>
                          <span className="text-[11px] font-mono text-amber-400">
                            {item.changes.length} حقول معدلة
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {item.changes.map((c, cIdx) => (
                            <div
                              key={cIdx}
                              className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 space-y-1"
                            >
                              <span className="text-[11px] font-extrabold text-amber-300 block">
                                📌 {c.label}:
                              </span>
                              <div className="flex items-center gap-2 text-[11px] text-slate-300 flex-wrap">
                                {c.from && (
                                  <span className="line-through text-rose-400 bg-rose-950/40 px-1.5 py-0.5 rounded">
                                    {c.from}
                                  </span>
                                )}
                                <ArrowLeft className="w-3 h-3 text-slate-500 shrink-0" />
                                <span className="text-emerald-300 font-bold bg-emerald-950/40 px-1.5 py-0.5 rounded">
                                  {c.to}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Quick Jump Inside Diff */}
                        {!isCurrent && (
                          <div className="pt-2 flex justify-end">
                            <button
                              type="button"
                              onClick={() => handleJump(item.index)}
                              className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 underline cursor-pointer"
                            >
                              <Zap className="w-3 h-3" />
                              <span>تطبيق هذه الحالة والعودة للتصميم</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-300">💡 اختصارات لوحة المفاتيح:</span>
            <kbd className="bg-slate-900 border border-slate-700 text-amber-300 px-2 py-0.5 rounded font-mono font-bold">
              Ctrl + Z
            </kbd>
            <span>للتراجع خطوة</span>
            <span className="text-slate-600">•</span>
            <kbd className="bg-slate-900 border border-slate-700 text-amber-300 px-2 py-0.5 rounded font-mono font-bold">
              Ctrl + Y
            </kbd>
            <span>للإعادة خطوة للأمام</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition cursor-pointer"
          >
            إغلاق السجل
          </button>
        </div>

      </div>
    </div>
  );
};
