import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Search,
  Check,
  Copy,
  Sparkles,
  Zap,
  Terminal,
  ExternalLink,
  Mail,
  HardDrive,
  Database,
  Cpu,
  FileDown,
  AlertTriangle,
  Info,
  ChevronLeft,
  X,
} from 'lucide-react';
import {
  KNOWLEDGE_BASE_ENTRIES,
  KnowledgeBaseEntry,
  KnowledgeBaseCategory,
  ActionableFix,
} from '../../data/knowledgeBaseData';

interface Props {
  initialSelectedId?: string;
  onApplyActionableFix?: (fix: ActionableFix) => void;
  onNavigateToDiagnostic?: (service: string, errorCode?: string, sampleError?: string) => void;
  onShowToast?: (msg: string) => void;
}

export const KnowledgeBaseViewer: React.FC<Props> = ({
  initialSelectedId,
  onApplyActionableFix,
  onNavigateToDiagnostic,
  onShowToast,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<KnowledgeBaseCategory | 'all'>('all');
  const [selectedEntryId, setSelectedEntryId] = useState<string>(
    initialSelectedId || KNOWLEDGE_BASE_ENTRIES[0]?.id || ''
  );
  const [copiedCodeIndex, setCopiedCodeIndex] = useState<number | null>(null);
  const [executedFixId, setExecutedFixId] = useState<string | null>(null);

  const categories: Array<{ id: KnowledgeBaseCategory | 'all'; label: string; icon: any }> = [
    { id: 'all', label: 'كافة التعليمات', icon: BookOpen },
    { id: 'email', label: 'البريد (SMTP)', icon: Mail },
    { id: 'drive', label: 'Google Drive', icon: HardDrive },
    { id: 'ai', label: 'Gemini AI', icon: Cpu },
    { id: 'database', label: 'قواعد البيانات', icon: Database },
    { id: 'export', label: 'التصدير والكانفاس', icon: FileDown },
  ];

  const filteredEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return KNOWLEDGE_BASE_ENTRIES.filter((entry) => {
      if (selectedCategory !== 'all' && entry.category !== selectedCategory) {
        return false;
      }
      if (!q) return true;

      return (
        entry.title.toLowerCase().includes(q) ||
        entry.summary.toLowerCase().includes(q) ||
        entry.rootCause.toLowerCase().includes(q) ||
        entry.errorCodeMatch.some((c) => c.toLowerCase().includes(q)) ||
        entry.keywords.some((k) => k.toLowerCase().includes(q))
      );
    });
  }, [searchQuery, selectedCategory]);

  const currentEntry: KnowledgeBaseEntry | undefined = useMemo(() => {
    return (
      KNOWLEDGE_BASE_ENTRIES.find((e) => e.id === selectedEntryId) ||
      filteredEntries[0] ||
      KNOWLEDGE_BASE_ENTRIES[0]
    );
  }, [selectedEntryId, filteredEntries]);

  const handleCopyCode = async (code: string, index: number) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCodeIndex(index);
      if (onShowToast) onShowToast('تم نسخ الكود البرمجي بنجاح إلى الحافظة! 📋');
      setTimeout(() => setCopiedCodeIndex(null), 2500);
    } catch {
      // fallback
    }
  };

  const handleExecuteFix = (entry: KnowledgeBaseEntry) => {
    if (!entry.actionableFix) return;
    if (onApplyActionableFix) {
      onApplyActionableFix(entry.actionableFix);
      setExecutedFixId(entry.id);
      if (onShowToast) {
        onShowToast(`تم تطبيق الإصلاح البرمجي تلقائياً: ${entry.actionableFix.label} ⚡`);
      }
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500/10 text-red-400 border-red-500/30';
      case 'high':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'medium':
        return 'bg-sky-500/10 text-sky-400 border-sky-500/30';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    }
  };

  const getCategoryIcon = (category: KnowledgeBaseCategory) => {
    switch (category) {
      case 'email':
        return <Mail className="w-3.5 h-3.5 text-emerald-400" />;
      case 'drive':
        return <HardDrive className="w-3.5 h-3.5 text-sky-400" />;
      case 'ai':
        return <Cpu className="w-3.5 h-3.5 text-purple-400" />;
      case 'database':
        return <Database className="w-3.5 h-3.5 text-amber-400" />;
      case 'export':
        return <FileDown className="w-3.5 h-3.5 text-pink-400" />;
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-white">مكتبة التعليمات والحلول البرمجية (Knowledge Base)</h3>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                مرجع تقني تفاعلي
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              أكواد برمجية جاهزة وحلول معتمدة لأخطاء الربط السحابي مع إمكانية تصحيح الإعدادات بنقرة واحدة.
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث بكود الخطأ (مثل 535، 404، 429)..."
            className="w-full pr-9 pl-8 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-2.5 top-2.5 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isActive = selectedCategory === cat.id;
          const count =
            cat.id === 'all'
              ? KNOWLEDGE_BASE_ENTRIES.length
              : KNOWLEDGE_BASE_ENTRIES.filter((e) => e.category === cat.id).length;

          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                  : 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700/50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{cat.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-700 text-slate-300'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Grid: Entries List & Detailed View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side (5 cols): Filtered Entries List */}
        <div className="lg:col-span-5 space-y-2.5 max-h-[680px] overflow-y-auto pr-1 scrollbar-thin">
          {filteredEntries.length === 0 ? (
            <div className="p-8 text-center bg-slate-800/30 border border-dashed border-slate-800 rounded-2xl text-slate-400 text-xs">
              <Search className="w-6 h-6 mx-auto mb-2 opacity-40" />
              لم يتم العثور على أي مقالات تطابق بحثك "{searchQuery}".
            </div>
          ) : (
            filteredEntries.map((entry) => {
              const isSelected = entry.id === currentEntry?.id;
              return (
                <div
                  key={entry.id}
                  onClick={() => setSelectedEntryId(entry.id)}
                  className={`p-4 rounded-2xl border transition cursor-pointer text-right space-y-2 ${
                    isSelected
                      ? 'bg-indigo-950/40 border-indigo-500/60 shadow-lg shadow-indigo-950/30'
                      : 'bg-slate-800/40 border-slate-800/80 hover:bg-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {getCategoryIcon(entry.category)}
                      <span className="text-[11px] font-medium text-slate-400">{entry.categoryLabel}</span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getSeverityBadge(
                        entry.severity
                      )}`}
                    >
                      {entry.severity === 'critical'
                        ? 'حرج'
                        : entry.severity === 'high'
                        ? 'أولوية عالية'
                        : 'متوسط'}
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-white leading-relaxed line-clamp-2">{entry.title}</h4>

                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">{entry.summary}</p>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
                    <div className="flex items-center gap-1 overflow-hidden">
                      {entry.errorCodeMatch.slice(0, 2).map((code, cIdx) => (
                        <span
                          key={cIdx}
                          className="px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 font-mono text-[10px] border border-slate-700/50"
                        >
                          {code}
                        </span>
                      ))}
                    </div>

                    {entry.actionableFix && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400">
                        <Zap className="w-3 h-3" />
                        إصلاح تلقائي
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Side (7 cols): Selected Article Detail View */}
        {currentEntry && (
          <div className="lg:col-span-7 bg-slate-850/60 border border-slate-800 rounded-2xl p-5 space-y-5">
            {/* Title & Metadata */}
            <div className="space-y-2 pb-4 border-b border-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${getSeverityBadge(
                      currentEntry.severity
                    )}`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    مستوى التأثير: {currentEntry.severity.toUpperCase()}
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700">
                    {currentEntry.categoryLabel}
                  </span>
                </div>

                {onNavigateToDiagnostic && (
                  <button
                    onClick={() =>
                      onNavigateToDiagnostic(
                        currentEntry.category,
                        currentEntry.errorCodeMatch[0],
                        currentEntry.title
                      )
                    }
                    className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 font-bold transition"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    تشخيص مباشر بالذكاء الاصطناعي
                  </button>
                )}
              </div>

              <h2 className="text-sm sm:text-base font-black text-white leading-relaxed">{currentEntry.title}</h2>

              {/* Error codes pill row */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] text-slate-400">الأكواد المطابقة:</span>
                {currentEntry.errorCodeMatch.map((code, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-700 font-mono text-[11px] text-amber-300"
                  >
                    {code}
                  </span>
                ))}
              </div>
            </div>

            {/* Actionable Auto-Fix Callout Banner */}
            {currentEntry.actionableFix && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-slate-900 to-indigo-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                    <Zap className="w-4 h-4 text-amber-400" />
                    إصلاح برمجي فوري متاح بنقرة واحدة
                  </div>
                  <p className="text-[11px] text-slate-300">
                    {currentEntry.actionableFix.description || currentEntry.actionableFix.label}
                  </p>
                </div>

                <button
                  onClick={() => handleExecuteFix(currentEntry)}
                  className={`flex items-center justify-center gap-2 px-4 py-2.5 font-black text-xs rounded-xl shadow-lg transition whitespace-nowrap ${
                    executedFixId === currentEntry.id
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950'
                  }`}
                >
                  {executedFixId === currentEntry.id ? (
                    <>
                      <Check className="w-4 h-4" />
                      تم تطبيق الإصلاح بنجاح!
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      تطبيق هذا الإصلاح تلقائياً
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Problem Summary & Root Cause */}
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 space-y-1">
                <h5 className="text-xs font-bold text-slate-200">ملخص المشكلة:</h5>
                <p className="text-xs text-slate-300 leading-relaxed">{currentEntry.summary}</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 space-y-1">
                <h5 className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5" />
                  السبب الفني الجذري (Root Cause):
                </h5>
                <p className="text-xs text-slate-300 leading-relaxed">{currentEntry.rootCause}</p>
              </div>
            </div>

            {/* Action Plan Steps */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Terminal className="w-4 h-4 text-indigo-400" />
                خطوات المعالجة المنهجية:
              </h4>
              <div className="space-y-2">
                {currentEntry.steps.map((step) => (
                  <div key={step.step} className="p-3.5 rounded-xl bg-slate-800/30 border border-slate-800 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 text-[11px] font-mono font-bold flex items-center justify-center border border-indigo-500/30">
                        {step.step}
                      </span>
                      <h5 className="text-xs font-bold text-white">{step.title}</h5>
                    </div>
                    <p className="text-xs text-slate-300 pr-7 leading-relaxed">{step.action}</p>
                    {step.tip && (
                      <div className="pr-7 pt-1 text-[11px] text-amber-400">
                        💡 {step.tip}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Code Snippets Section */}
            {currentEntry.codeSnippets && currentEntry.codeSnippets.length > 0 && (
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  أكواد التكوين والحلول البرمجية الجاهزة:
                </h4>

                <div className="space-y-3">
                  {currentEntry.codeSnippets.map((snippet, sIdx) => (
                    <div key={sIdx} className="rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/80 border-b border-slate-800">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
                          <span className="text-[11px] font-mono font-bold text-slate-300 mr-2">
                            {snippet.title}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-slate-800 text-slate-400">
                            {snippet.language}
                          </span>
                          <button
                            onClick={() => handleCopyCode(snippet.code, sIdx)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
                          >
                            {copiedCodeIndex === sIdx ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-emerald-400">تم النسخ</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>نسخ الكود</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      <pre className="p-4 text-xs font-mono text-emerald-300/90 overflow-x-auto leading-relaxed dir-ltr text-left">
                        <code>{snippet.code}</code>
                      </pre>

                      {snippet.explanation && (
                        <div className="px-4 py-2 bg-slate-900/40 border-t border-slate-800 text-[11px] text-slate-400">
                          {snippet.explanation}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
