import React, { useState } from 'react';
import {
  Sparkles,
  Bot,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Zap,
  BookOpen,
  ArrowRight,
  ExternalLink,
  RotateCcw,
  Check,
  ChevronDown,
  ChevronUp,
  Cpu,
  Mail,
  HardDrive,
  Database,
  Terminal
} from 'lucide-react';
import {
  KnowledgeBaseEntry,
  ActionableFix,
  findKnowledgeBaseMatchForError,
  KNOWLEDGE_BASE_ENTRIES
} from '../../data/knowledgeBaseData';
import {
  CloudAiDiagnostic,
  diagnoseCloudError
} from '../../services/adminService';

interface AiDiagnosticAndKnowledgeHubProps {
  onShowToast?: (msg: string) => void;
  onApplyActionableFix?: (fix: ActionableFix) => void;
  initialService?: 'drive' | 'database' | 'email' | 'ai';
  initialError?: string;
  initialErrorCode?: string;
}

export const AiDiagnosticAndKnowledgeHub: React.FC<AiDiagnosticAndKnowledgeHubProps> = ({
  onShowToast,
  onApplyActionableFix,
  initialService = 'ai',
  initialError = '',
  initialErrorCode = ''
}) => {
  const [selectedService, setSelectedService] = useState<'drive' | 'database' | 'email' | 'ai'>(initialService);
  const [errorInput, setErrorInput] = useState<string>(initialError);
  const [errorCodeInput, setErrorCodeInput] = useState<string>(initialErrorCode);
  
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState<CloudAiDiagnostic | null>(null);
  const [matchedKb, setMatchedKb] = useState<KnowledgeBaseEntry | null>(null);
  const [executedSteps, setExecutedSteps] = useState<number[]>([]);
  const [expandedKbDetails, setExpandedKbDetails] = useState(true);

  // Trigger AI Diagnosis + Knowledge Base linkage
  const handleRunDiagnosis = async (
    service: 'drive' | 'database' | 'email' | 'ai',
    msg: string,
    code?: string
  ) => {
    if (!msg.trim() && !code?.trim()) {
      if (onShowToast) onShowToast('يرجى كتابة رسالة الخطأ أو كوده للتشخيص ⚠️');
      return;
    }

    setIsDiagnosing(true);
    setExecutedSteps([]);

    // 1. Instant Knowledge Base lookup
    const kbMatch = findKnowledgeBaseMatchForError(service, msg, code);
    setMatchedKb(kbMatch);

    try {
      if (onShowToast) onShowToast('جاري تشخيص الخطأ واستدعاء الذكاء الاصطناعي... 🤖✨');
      const res = await diagnoseCloudError({
        service,
        errorMessage: msg,
        errorCode: code
      });

      if (res.success && res.diagnosis) {
        setDiagnosticResult(res.diagnosis);
        if (onShowToast) {
          onShowToast(res.isFallback 
            ? 'تم إعداد التشخيص الذكي وخطوات الإصلاح الفورية بنجاح! 💡'
            : 'اكتمل تشخيص Gemini AI الذكي وعرض الخطوات التنفيذية! 🤖✅');
        }
      }
    } catch (err: any) {
      console.warn('Diagnosis fallback triggered:', err);
      // If endpoint had any network hiccup, provide immediate smart diagnosis from Knowledge Base
      if (kbMatch) {
        const fallbackDiag: CloudAiDiagnostic = {
          summary: kbMatch.summary,
          rootCause: kbMatch.rootCause,
          severity: kbMatch.severity,
          steps: kbMatch.steps.map((s, idx) => ({
            step: s.step,
            title: s.title,
            action: s.action,
            tip: s.tip,
            actionableFix: idx === 0 && kbMatch.actionableFix ? kbMatch.actionableFix : undefined
          })),
          quickTip: 'تم ربط هذا التشخيص بقاعدة المعرفة المعتمدة (Knowledge Base).'
        };
        setDiagnosticResult(fallbackDiag);
        if (onShowToast) onShowToast('تم استخراج خطوات الحل من مكتبة التعليمات المعتمدة 💡');
      } else {
        if (onShowToast) onShowToast(err.message || 'تعذر تشخيص الخطأ');
      }
    } finally {
      setIsDiagnosing(false);
    }
  };

  const handleExecuteFix = (fix: ActionableFix, stepIndex: number) => {
    if (onApplyActionableFix) {
      onApplyActionableFix(fix);
    }
    setExecutedSteps(prev => [...prev, stepIndex]);
    if (onShowToast) {
      onShowToast(`تم تطبيق الإصلاح التنفيذي "${fix.label}" بنجاح! ⚡`);
    }
  };

  const quickErrorPresets: Array<{
    service: 'drive' | 'database' | 'email' | 'ai';
    label: string;
    msg: string;
    code: string;
  }> = [
    {
      service: 'email',
      label: 'خطأ كلمة مرور SMTP (Gmail 535)',
      msg: '535-5.7.8 Username and Password not accepted. Learn more at https://support.google.com/mail/?p=BadCredentials',
      code: '535-5.7.8'
    },
    {
      service: 'email',
      label: 'خطأ حظر المنفذ (Port 25 Closed)',
      msg: 'connect ETIMEDOUT 142.250.185.108:25 (Cloud platform port 25 block)',
      code: 'ETIMEDOUT_25'
    },
    {
      service: 'drive',
      label: 'انتهاء رمز Google Drive (OAuth Expired)',
      msg: 'invalid_grant: Bad Request / Token has been expired or revoked',
      code: 'TOKEN_EXPIRED'
    },
    {
      service: 'ai',
      label: 'نموذج ذكاء اصطناعي قديم أو غير متاح',
      msg: 'Model gemini-1.5-pro is deprecated or not available in this tier. Use gemini-3.8-flash.',
      code: 'MODEL_NOT_FOUND'
    },
    {
      service: 'database',
      label: 'انقطاع الاتصال بقاعدة البيانات السحابية',
      msg: 'Firestore unavailable or missing index/credentials',
      code: 'FIRESTORE_UNAVAILABLE'
    }
  ];

  return (
    <div className="space-y-5">
      {/* HEADER */}
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 text-white p-5 rounded-2xl border border-indigo-500/30 shadow-md flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-sm">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-black text-sm text-white flex items-center gap-2">
              تشخيص الأخطاء بالذكاء الاصطناعي ومكتبة التعليمات (Knowledge Base)
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400 text-slate-950">
                إصلاح تلقائي بنقرة ⚡
              </span>
            </h3>
            <p className="text-xs text-indigo-200/80 mt-0.5">
              تحليل فني عميق للأخطاء السحابية مع اقتراح خطوات تنفيذية قابلة للضغط لتصحيح إعدادات التطبيق فورياً
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] font-bold bg-white/10 px-3 py-1.5 rounded-xl border border-white/10">
          <BookOpen className="w-3.5 h-3.5 text-amber-300" />
          <span>{KNOWLEDGE_BASE_ENTRIES.length} تعليمات برمجية معتمدة</span>
        </div>
      </div>

      {/* QUICK ERROR PRESETS */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            أخطاء شائعة جاهزة للتشخيص السريع:
          </span>
          <span className="text-[10px] text-slate-500">اختر لتجربة التشخيص المباشر</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {quickErrorPresets.map((preset, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setSelectedService(preset.service);
                setErrorInput(preset.msg);
                setErrorCodeInput(preset.code);
                handleRunDiagnosis(preset.service, preset.msg, preset.code);
              }}
              className="px-3 py-1.5 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-xl text-[11px] font-bold text-slate-700 hover:text-indigo-900 transition flex items-center gap-1.5 cursor-pointer"
            >
              {preset.service === 'email' && <Mail className="w-3 h-3 text-indigo-600" />}
              {preset.service === 'drive' && <HardDrive className="w-3 h-3 text-sky-600" />}
              {preset.service === 'ai' && <Cpu className="w-3 h-3 text-amber-600" />}
              {preset.service === 'database' && <Database className="w-3 h-3 text-emerald-600" />}
              <span>{preset.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* DIAGNOSIS INPUT FORM */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">الخدمة المستهدفة</label>
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value as any)}
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-bold bg-white text-slate-800 focus:border-indigo-500 focus:outline-hidden"
            >
              <option value="ai">Gemini AI / الـ API</option>
              <option value="email">البريد الإلكتروني (SMTP)</option>
              <option value="drive">Google Drive</option>
              <option value="database">قواعد البيانات (Firestore)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">كود الخطأ (اختياري)</label>
            <input
              type="text"
              value={errorCodeInput}
              onChange={(e) => setErrorCodeInput(e.target.value)}
              placeholder="مثال: 535, ETIMEDOUT, 401"
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-mono text-slate-800 focus:border-indigo-500 focus:outline-hidden"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1">نص رسالة الخطأ أو الاستجابة</label>
            <input
              type="text"
              value={errorInput}
              onChange={(e) => setErrorInput(e.target.value)}
              placeholder="الصق رسالة الخطأ التي ظهرت لك أثناء الفحص أو العمل..."
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:outline-hidden"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-100 flex-wrap gap-2">
          <span className="text-[11px] text-slate-500">
            💡 يتم استدعاء Gemini AI لتحليل الخطأ وربطه بمكتبة التعليمات البرمجية لتوليد خطوات قابلة للتطبيق فورياً.
          </span>

          <button
            type="button"
            disabled={isDiagnosing}
            onClick={() => handleRunDiagnosis(selectedService, errorInput, errorCodeInput)}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl transition shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Sparkles className={`w-4 h-4 text-amber-300 ${isDiagnosing ? 'animate-spin' : ''}`} />
            <span>{isDiagnosing ? 'جاري التشخيص والتحليل بالذكاء...' : 'تشخيص الخطأ بالذكاء الاصطناعي ⚡'}</span>
          </button>
        </div>
      </div>

      {/* DIAGNOSTIC RESULTS DISPLAY */}
      {diagnosticResult && (
        <div className="bg-white rounded-2xl border-2 border-indigo-500/40 shadow-md overflow-hidden space-y-0">
          {/* Diagnostic Header */}
          <div className="p-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-600 text-white">
                <Sparkles className="w-4 h-4 text-amber-300" />
              </div>
              <div>
                <h4 className="font-black text-sm text-white">
                  نتيجة تشخيص الذكاء الاصطناعي لخدمة: {selectedService.toUpperCase()}
                </h4>
                <p className="text-[11px] text-slate-300">
                  تم تحليل السجلات واقتراح الخطوات التصحيحية القابلة للتنفيذ المباشر
                </p>
              </div>
            </div>

            {matchedKb && (
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <BookOpen className="w-3 h-3" />
                مرتبط بمكتبة التعليمات: {matchedKb.title.slice(0, 35)}...
              </span>
            )}
          </div>

          <div className="p-5 space-y-4">
            {/* Summary & Root Cause */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-xs font-black text-slate-800 block">ملخص المشكلة الفنية:</span>
                <p className="text-xs text-slate-700 leading-relaxed font-medium">
                  {diagnosticResult.summary}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 space-y-1">
                <span className="text-xs font-black text-rose-900 block flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                  السبب الجذري الفني (Root Cause):
                </span>
                <p className="text-xs text-rose-800 leading-relaxed font-medium">
                  {diagnosticResult.rootCause}
                </p>
              </div>
            </div>

            {/* ACTIONABLE STEPS */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h5 className="font-black text-xs text-slate-900 flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-500" />
                  خطوات الحل التنفيذية الموصى بها (اضغط لتصحيح الإعدادات تلقائياً):
                </h5>
                <span className="text-[10px] font-bold text-slate-500">
                  {executedSteps.length} من {diagnosticResult.steps.length} تم تطبيقها
                </span>
              </div>

              <div className="space-y-2.5">
                {diagnosticResult.steps.map((step, idx) => {
                  const isExecuted = executedSteps.includes(step.step);
                  return (
                    <div
                      key={idx}
                      className={`p-4 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isExecuted
                          ? 'bg-emerald-50/80 border-emerald-300'
                          : 'bg-white border-slate-200 hover:border-indigo-300'
                      }`}
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                            isExecuted
                              ? 'bg-emerald-600 text-white'
                              : 'bg-indigo-100 text-indigo-800'
                          }`}>
                            {isExecuted ? <Check className="w-3 h-3" /> : step.step}
                          </span>
                          <h6 className="font-extrabold text-xs text-slate-900">
                            {step.title}
                          </h6>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed pr-7">
                          {step.action}
                        </p>
                        {step.tip && (
                          <div className="pr-7 text-[11px] text-amber-700 font-medium">
                            💡 {step.tip}
                          </div>
                        )}
                      </div>

                      {/* ACTIONABLE FIX BUTTON */}
                      {step.actionableFix && (
                        <div className="shrink-0 sm:self-center pr-7 sm:pr-0">
                          <button
                            type="button"
                            disabled={isExecuted}
                            onClick={() => handleExecuteFix(step.actionableFix!, step.step)}
                            className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-xs cursor-pointer ${
                              isExecuted
                                ? 'bg-emerald-600 text-white cursor-default'
                                : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black'
                            }`}
                          >
                            {isExecuted ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>تم تطبيق الإصلاح بنجاح ✅</span>
                              </>
                            ) : (
                              <>
                                <Zap className="w-3.5 h-3.5 fill-current" />
                                <span>{step.actionableFix.label}</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* LINKED KNOWLEDGE BASE ENTRY DETAILS */}
            {matchedKb && (
              <div className="pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setExpandedKbDetails(prev => !prev)}
                  className="w-full p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-between text-xs font-bold text-slate-800 transition cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-indigo-600" />
                    <span>توثيق مكتبة التعليمات البرمجية المرتبطة: {matchedKb.title}</span>
                  </div>
                  {expandedKbDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {expandedKbDetails && (
                  <div className="p-4 bg-slate-50/50 rounded-b-xl border-x border-b border-slate-200 space-y-3 text-xs">
                    {/* Code Snippets */}
                    {matchedKb.codeSnippets && matchedKb.codeSnippets.length > 0 && (
                      <div className="space-y-2">
                        <span className="font-bold text-slate-700 flex items-center gap-1.5 text-xs">
                          <Terminal className="w-3.5 h-3.5 text-indigo-600" />
                          أكواد وتعليمات برمجية موصى بها من المكتبة:
                        </span>
                        {matchedKb.codeSnippets.map((snippet, sIdx) => (
                          <div key={sIdx} className="rounded-xl overflow-hidden border border-slate-300">
                            <div className="bg-slate-800 text-slate-200 px-3 py-1.5 font-mono text-[10px] flex items-center justify-between">
                              <span>{snippet.title} ({snippet.language})</span>
                            </div>
                            <pre className="p-3 bg-slate-900 text-emerald-400 font-mono text-[11px] overflow-x-auto text-left dir-ltr select-all">
                              {snippet.code}
                            </pre>
                          </div>
                        ))}
                      </div>
                    )}

                    {matchedKb.officialDocsUrl && (
                      <div className="pt-1 flex items-center justify-end">
                        <a
                          href={matchedKb.officialDocsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1"
                        >
                          <span>فتح التوثيق الرسمي لـ {matchedKb.categoryLabel}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
