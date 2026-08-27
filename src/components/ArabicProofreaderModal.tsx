import React, { useState, useEffect, useMemo } from 'react';
import {
  SpellCheck,
  X,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  Check,
  HelpCircle,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Zap,
  Info,
  Layers,
  Award,
  Edit3,
  Copy,
  SlidersHorizontal,
  ChevronRight,
  UserCheck,
  HeartHandshake
} from 'lucide-react';
import { CertificateData } from '../types';
import {
  proofreadCertificate,
  proofreadTextField,
  applySingleProofreadFix,
  applyAllProofreadFixes,
  ProofreadIssue,
  CertificateProofreadResult,
  IssueCategory
} from '../utils/arabicProofreader';
import {
  RecipientGender,
  adaptCertificateGenderSync
} from '../utils/genderConverter';
import { getSavedAISettings, getAIRequestHeaders } from '../utils/aiConfig';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  certificateData: CertificateData;
  onApplyChanges: (newData: CertificateData) => void;
}

type ActiveTab = 'issues' | 'fields_inspector';

export const ArabicProofreaderModal: React.FC<Props> = ({
  isOpen,
  onClose,
  certificateData,
  onApplyChanges,
}) => {
  const [currentCert, setCurrentCert] = useState<CertificateData>(certificateData);
  const [activeTab, setActiveTab] = useState<ActiveTab>('issues');
  const [selectedCategory, setSelectedCategory] = useState<IssueCategory | 'all'>('all');
  const [isAiProofreading, setIsAiProofreading] = useState(false);
  const [aiLinguisticNotes, setAiLinguisticNotes] = useState<string | null>(null);
  const [appliedIssueIds, setAppliedIssueIds] = useState<Set<string>>(new Set());
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [editingFieldKey, setEditingFieldKey] = useState<string | null>(null);
  const [editingFieldText, setEditingFieldText] = useState<string>('');

  // Sync internal state with prop changes when opened
  useEffect(() => {
    if (isOpen) {
      setCurrentCert(certificateData);
      setAppliedIssueIds(new Set());
      setAiLinguisticNotes(null);
      setEditingFieldKey(null);
    }
  }, [isOpen, certificateData]);

  // Run local linguistic proofreading engine
  const proofreadResult: CertificateProofreadResult = useMemo(() => {
    return proofreadCertificate(currentCert);
  }, [currentCert]);

  // Collect all issues across all fields
  const allIssues: ProofreadIssue[] = useMemo(() => {
    const list: ProofreadIssue[] = [];
    Object.values(proofreadResult.fields).forEach((f) => {
      list.push(...f.issues);
    });
    return list;
  }, [proofreadResult]);

  // Filter issues by active category
  const filteredIssues = useMemo(() => {
    if (selectedCategory === 'all') return allIssues;
    return allIssues.filter((iss) => iss.category === selectedCategory);
  }, [allIssues, selectedCategory]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Toggle recipient gender and optionally convert whole certificate text instantly
  const handleToggleGender = (newGender: RecipientGender, autoConvertTexts: boolean = false) => {
    let updated: CertificateData = {
      ...currentCert,
      recipientGender: newGender,
      updatedAt: new Date().toISOString(),
    };

    if (autoConvertTexts) {
      updated = adaptCertificateGenderSync(updated, newGender);
    }

    setCurrentCert(updated);
    onApplyChanges(updated);
    showToast(
      autoConvertTexts
        ? `تم تحويل نصوص الشهادة كاملة ومواءمتها مع صيغة (${newGender === 'female' ? 'المؤنث 👩‍🎓' : 'المذكر 👨‍🎓'}) بنجاح!`
        : `تم ضبط فحص التدقيق لصفة (${newGender === 'female' ? 'المؤنث 👩‍🎓' : 'المذكر 👨‍🎓'}).`
    );
  };

  // 1-Click Complete Gender Synchronization
  const handleSyncGenderConcordance = () => {
    const targetGender: RecipientGender = currentCert.recipientGender || 'male';
    const adapted = adaptCertificateGenderSync(currentCert, targetGender);
    setCurrentCert(adapted);
    onApplyChanges(adapted);
    showToast(`تمت مواءمة وتطابق جميع الضمائر والأفعال والصفات مع (${targetGender === 'female' ? 'المؤنث 👩‍🎓' : 'المذكر 👨‍🎓'}) بنجاح! ✨`);
  };

  // Handle single fix application
  const handleApplyFix = (issue: ProofreadIssue) => {
    const updated = applySingleProofreadFix(currentCert, issue);
    setCurrentCert(updated);
    onApplyChanges(updated);
    setAppliedIssueIds((prev) => new Set([...prev, issue.id]));
    showToast(`تم تصحيح "${issue.originalWord}" إلى "${issue.suggestedWord}" بنجاح! ✨`);
  };

  // Handle fixing all issues in a specific field
  const handleApplyFieldFix = (fieldKey: keyof CertificateData, correctedText: string) => {
    const updated: CertificateData = {
      ...currentCert,
      [fieldKey]: correctedText,
      updatedAt: new Date().toISOString(),
    };
    setCurrentCert(updated);
    onApplyChanges(updated);
    showToast(`تم تطبيق التصحيح الكامل للحقل بنجاح! 🎯`);
  };

  // Handle manual inline save for a field
  const handleSaveInlineEdit = (fieldKey: keyof CertificateData) => {
    const updated: CertificateData = {
      ...currentCert,
      [fieldKey]: editingFieldText,
      updatedAt: new Date().toISOString(),
    };
    setCurrentCert(updated);
    onApplyChanges(updated);
    setEditingFieldKey(null);
    showToast('تم حفظ التعديل المخصص على الحقل وتحديث الشهادة! ✍️');
  };

  // Handle fixing all issues at once
  const handleApplyAllFixes = () => {
    const updated = applyAllProofreadFixes(currentCert, proofreadResult);
    setCurrentCert(updated);
    onApplyChanges(updated);
    showToast('تم تطبيق وتصحيح كافة الملاحظات الإملائية واللغوية بنجاح! 🚀');
  };

  // Copy text helper
  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`تم نسخ ${label} إلى الحافظة! 📋`);
  };

  // Deep Proofreading with AI / Server
  const handleRunAiDeepProofread = async () => {
    setIsAiProofreading(true);
    setAiLinguisticNotes(null);
    const cfg = getSavedAISettings();

    try {
      const res = await fetch('/api/ai-proofread', {
        method: 'POST',
        headers: getAIRequestHeaders(cfg),
        body: JSON.stringify({
          certificateData: currentCert,
          apiKey: cfg.apiKey?.trim() || undefined,
          model: cfg.model || 'gemini-2.5-flash',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.success && data.correctedFields) {
          const merged: CertificateData = {
            ...currentCert,
            ...data.correctedFields,
            updatedAt: new Date().toISOString(),
          };
          setCurrentCert(merged);
          onApplyChanges(merged);
          if (data.linguisticNotes) {
            setAiLinguisticNotes(data.linguisticNotes);
          }
          showToast('اكتمل التدقيق البلاغي واللغوي العميق بالذكاء الاصطناعي بنجاح! 🌟');
        } else {
          handleApplyAllFixes();
        }
      } else {
        handleApplyAllFixes();
      }
    } catch (err) {
      console.warn('AI proofread network error, applied local fix:', err);
      handleApplyAllFixes();
    } finally {
      setIsAiProofreading(false);
    }
  };

  if (!isOpen) return null;

  const score = proofreadResult.score;
  const isPerfect = allIssues.length === 0;
  const currentGender = currentCert.recipientGender || 'male';

  const fieldLabels: { key: keyof CertificateData; label: string; desc: string }[] = [
    { key: 'title', label: 'عنوان الشهادة الرئيسي', desc: 'مثل: شهادة شكر وتقدير' },
    { key: 'subtitle', label: 'العنوان الفرعي', desc: 'مثل: وسام التفوق والتميز الدراسي' },
    { key: 'recipientIntro', label: 'مقدمة التكريم', desc: 'مثل: تسر إدارة المدرسة أن تمنح...' },
    { key: 'studentName', label: 'اسم المكرم / الطالب', desc: 'اسم صاحب الشهادة' },
    { key: 'grade', label: 'الصف / المرحلة', desc: 'مثل: الصف الثالث الثانوي' },
    { key: 'subject', label: 'المادة / المجال', desc: 'مثل: الرياضيات / التفوق العام' },
    { key: 'appreciationText', label: 'نص التقدير والشكر المفصل', desc: 'الفقرة الرئيسية للتكريم والثناء' },
    { key: 'poemOrQuote', label: 'بيت الشعر أو الحكمة', desc: 'البيت الشعري أو القول المأثور' },
    { key: 'badgeTitle', label: 'مسمى الوسام والشارة', desc: 'مثل: وسام التفوق الأكاديمي' },
    { key: 'schoolName', label: 'اسم المدرسة / الجهة', desc: 'الجهة المانحة للشهادة' },
  ];

  return (
    <div
      id="arabic-proofreader-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-fade-in"
      dir="rtl"
    >
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-slate-900 border border-slate-700/80 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950/80 border-b border-slate-700/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-950/50 text-slate-950 shrink-0">
              <SpellCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white">
                  المُدقّق اللغوي والإملائي ومواءمة التذكير والتأنيث
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 border border-amber-400/40 text-amber-300">
                  فصحى وبلاغة ✨
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                فحص فوري شامل للهمزات، التاء المربوطة، التنوين، الألف المقصورة، وتطابق التذكير والتأنيث.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Gender Switcher */}
            <div className="hidden sm:flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => handleToggleGender('male')}
                className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer ${
                  currentGender !== 'female'
                    ? 'bg-amber-500 text-slate-950 font-black shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="فحص الشهادة وفق صيغة المذكر"
              >
                <span>طالب 👨‍🎓</span>
              </button>
              <button
                type="button"
                onClick={() => handleToggleGender('female')}
                className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer ${
                  currentGender === 'female'
                    ? 'bg-amber-500 text-slate-950 font-black shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="فحص الشهادة وفق صيغة المؤنث"
              >
                <span>طالبة 👩‍🎓</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toast Alert */}
        {toastMessage && (
          <div className="mx-4 sm:mx-6 mt-3 p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-xs font-bold text-emerald-300 flex items-center justify-between shadow-lg animate-fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{toastMessage}</span>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="text-emerald-300 hover:text-white text-xs font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Gender Concordance Special Alert Banner if gender issues found */}
        {proofreadResult.genderIssuesCount > 0 && (
          <div className="mx-4 sm:mx-6 mt-3 p-3.5 bg-gradient-to-r from-purple-950/60 via-indigo-950/50 to-slate-900 border border-purple-500/40 rounded-2xl text-xs text-purple-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
            <div className="flex items-start gap-2.5">
              <HeartHandshake className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
              <div>
                <strong className="font-black text-purple-300 block mb-0.5">
                  تم رصد {proofreadResult.genderIssuesCount} صيغة تحتاج مواءمة مع ({currentGender === 'female' ? 'المؤنث 👩‍🎓' : 'المذكر 👨‍🎓'}):
                </strong>
                <span className="text-slate-300 text-[11.5px]">
                  توجد ضمائر أو صفات أو أفعال غير متطابقة مع جنس المكرّم. يمكنك ضبطها وتأنيثها/تذكيرها فوراً.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
              <button
                type="button"
                onClick={handleSyncGenderConcordance}
                className="w-full sm:w-auto px-3.5 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs rounded-xl shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 text-amber-300" />
                <span>مواءمة التذكير والتأنيث كاملاً ⚡</span>
              </button>
            </div>
          </div>
        )}

        {/* AI Linguistic Notes Banner if any */}
        {aiLinguisticNotes && (
          <div className="mx-4 sm:mx-6 mt-3 p-3 bg-indigo-950/70 border border-indigo-500/30 rounded-xl text-xs text-indigo-200 flex items-start gap-2.5 shadow-md">
            <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold text-indigo-300 block mb-0.5">ملاحظة البلاغة الذكية:</strong>
              <span>{aiLinguisticNotes}</span>
            </div>
          </div>
        )}

        {/* Quality Score & Action Bar */}
        <div className="px-4 sm:px-6 py-3.5 bg-slate-950/60 border-b border-slate-800/80 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shrink-0">
          {/* Quality Score Meter */}
          <div className="flex items-center gap-3.5">
            <div className="relative w-13 h-13 rounded-2xl bg-slate-800/90 border border-slate-700 flex flex-col items-center justify-center p-1 shadow-inner shrink-0">
              <span className={`text-base font-black ${
                score >= 90 ? 'text-emerald-400' : score >= 75 ? 'text-amber-400' : 'text-rose-400'
              }`}>
                {score}%
              </span>
              <span className="text-[8.5px] text-slate-400 font-bold">الصحة</span>
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black text-white">
                  {isPerfect
                    ? 'شهادتك سليمة ومضبوطة لغوياً 100% 🌟'
                    : `تم اكتشاف ${allIssues.length} ملاحظة وتصحيح لغوي`}
                </span>
                {allIssues.length > 0 && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {proofreadResult.errorsCount} أخطاء • {proofreadResult.warningsCount} تنبيهات
                  </span>
                )}
                {proofreadResult.genderIssuesCount > 0 && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    {proofreadResult.genderIssuesCount} صيغ تذكير/تأنيث
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {isPerfect
                  ? 'لا توجد أخطاء في الهمزات أو التاء المربوطة أو التنوين أو صيغ التأنيث والتذكير.'
                  : 'يمكنك تطبيق التصحيحات دفعة واحدة بنقرة زر أو معاينة كل تصحيح وتطبيقه منفرداً.'}
              </p>
            </div>
          </div>

          {/* Quick Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleRunAiDeepProofread}
              disabled={isAiProofreading}
              className="flex-1 sm:flex-none px-3.5 py-2 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="إجراء تدقيق بلاغي ونحوي عميق بنماذج الذكاء الاصطناعي"
            >
              {isAiProofreading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                  <span>جارٍ التدقيق بالـ AI...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>تدقيق عميق بالـ AI</span>
                </>
              )}
            </button>

            {!isPerfect && (
              <button
                type="button"
                onClick={handleApplyAllFixes}
                className="flex-1 sm:flex-none px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 rounded-xl text-xs font-black shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>تصحيح الكل بنقرة واحدة ✨</span>
              </button>
            )}
          </div>
        </div>

        {/* View Tabs Selector */}
        <div className="px-4 sm:px-6 py-2 bg-slate-950/40 border-b border-slate-800/80 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('issues')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'issues'
                  ? 'bg-slate-800 text-amber-400 border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <SpellCheck className="w-3.5 h-3.5" />
              <span>الملاحظات والمفردات ({allIssues.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('fields_inspector')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'fields_inspector'
                  ? 'bg-slate-800 text-amber-400 border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>معاينة وتعديل حقول الشهادة ({fieldLabels.length})</span>
            </button>
          </div>
        </div>

        {/* Category Pills Filter (only in issues tab) */}
        {activeTab === 'issues' && allIssues.length > 0 && (
          <div className="px-4 sm:px-6 py-2 bg-slate-900/90 border-b border-slate-800/80 flex items-center gap-1.5 overflow-x-auto shrink-0 scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition shrink-0 cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-amber-500 text-slate-950 font-black'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              الكل ({allIssues.length})
            </button>
            {[
              { id: 'gender_concordance' as const, label: 'التذكير والتأنيث' },
              { id: 'hamza' as const, label: 'الهمزات والقطع' },
              { id: 'taa_marbuta' as const, label: 'التاء والهاء' },
              { id: 'alif_maqsura' as const, label: 'الألف والياء' },
              { id: 'tanween' as const, label: 'التنوين' },
              { id: 'punctuation' as const, label: 'الترقيم والمسافات' },
              { id: 'common_typo' as const, label: 'أخطاء شائعة' },
            ].map((cat) => {
              const count = allIssues.filter((i) => i.category === cat.id).length;
              if (count === 0) return null;
              return (
                <button
                  type="button"
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition shrink-0 cursor-pointer flex items-center gap-1 ${
                    selectedCategory === cat.id
                      ? 'bg-amber-500 text-slate-950 font-black'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <span>{cat.label}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20 font-bold">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {activeTab === 'issues' ? (
            /* Issues Tab */
            isPerfect ? (
              /* Perfect State */
              <div className="p-8 sm:p-12 text-center bg-slate-950/40 border border-slate-800 rounded-2xl flex flex-col items-center justify-center space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-xl">
                  <ShieldCheck className="w-9 h-9" />
                </div>
                <div className="max-w-md space-y-1.5">
                  <h4 className="text-lg font-black text-white">نصوص الشهادة ممتازة وسليمة 100%!</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    تم فحص كامل فقرات الشهادة وعناوينها ومقدماتها وفق معايير الإملاء وقواعد اللغة العربية الفصحى، وتطابق صيغ التذكير والتأنيث.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                  <span className="px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-bold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> همزات صحيحة
                  </span>
                  <span className="px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-bold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> تاء وهاء منقوطة بدقة
                  </span>
                  <span className="px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-bold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> تطابق الضمائر والتأنيث
                  </span>
                </div>
              </div>
            ) : (
              /* Issues List */
              <div className="space-y-3">
                {filteredIssues.map((issue, idx) => {
                  const isFixed = appliedIssueIds.has(issue.id);
                  const isGender = issue.category === 'gender_concordance';

                  return (
                    <div
                      key={issue.id || idx}
                      className={`p-4 rounded-2xl border transition-all ${
                        isFixed
                          ? 'bg-emerald-950/20 border-emerald-500/30 opacity-75'
                          : isGender
                          ? 'bg-purple-950/30 border-purple-500/40 hover:border-purple-400/80 shadow-md'
                          : 'bg-slate-800/70 border-slate-700 hover:border-amber-500/60 shadow-md'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        
                        {/* Words & Rule */}
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-slate-900 text-slate-300 border border-slate-700">
                              {issue.fieldLabel}
                            </span>
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                              isGender
                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                : issue.severity === 'error'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}>
                              {issue.categoryLabel}
                            </span>
                          </div>

                          {/* Words Diff Box */}
                          <div className="flex items-center gap-3 text-sm font-bold pt-0.5">
                            <div className="flex items-center gap-1.5 line-through text-rose-400 bg-rose-950/40 px-2.5 py-1 rounded-lg border border-rose-800/40">
                              <span>{issue.originalWord}</span>
                            </div>

                            <ArrowRight className="w-4 h-4 text-slate-500 shrink-0" />

                            <div className="flex items-center gap-1.5 text-emerald-300 bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-800/40 font-black">
                              <span>{issue.suggestedWord}</span>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            </div>
                          </div>

                          {/* Context & Rule Explanation */}
                          <div className="text-xs text-slate-300 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80 space-y-1">
                            <p className="text-[11px] text-slate-400">
                              <span className="font-bold text-slate-300">السياق: </span>
                              <span className="italic font-serif">"{issue.contextSentence}"</span>
                            </p>
                            <p className="text-[11px] text-amber-300/90 font-medium flex items-center gap-1">
                              <Info className="w-3 h-3 text-amber-400 shrink-0" />
                              <span>{issue.ruleExplanation}</span>
                            </p>
                          </div>
                        </div>

                        {/* Action Button */}
                        <div className="sm:self-center shrink-0">
                          {isFixed ? (
                            <div className="px-3.5 py-2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-black flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" />
                              <span>تم التصحيح</span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleApplyFix(issue)}
                              className={`w-full sm:w-auto px-4 py-2 font-black text-xs rounded-xl shadow transition flex items-center justify-center gap-1.5 cursor-pointer ${
                                isGender
                                  ? 'bg-purple-500 hover:bg-purple-400 text-white'
                                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                              }`}
                            >
                              <span>تطبيق التصحيح</span>
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            /* Fields Inspector & Direct Editor Tab */
            <div className="space-y-4">
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs text-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span>معاينة حقول الشهادة ومقارنة النص الحالي بالنص المقترح مع إمكانية التعديل الفوري:</span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-amber-400 font-bold">
                    {currentGender === 'female' ? 'صيغة المؤنث (طالبة 👩‍🎓)' : 'صيغة المذكر (طالب 👨‍🎓)'}
                  </span>
                  <button
                    type="button"
                    onClick={handleSyncGenderConcordance}
                    className="px-2.5 py-1 bg-purple-600/40 hover:bg-purple-600/60 text-purple-200 border border-purple-500/40 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Zap className="w-3 h-3 text-amber-300" />
                    <span>مواءمة الجنسين</span>
                  </button>
                </div>
              </div>

              {fieldLabels.map((fItem) => {
                const currentVal = String(currentCert[fItem.key] || '');
                const fieldDiag = proofreadResult.fields[fItem.key];
                const hasFieldIssues = fieldDiag && fieldDiag.issues.length > 0;
                const correctedVal = fieldDiag ? fieldDiag.correctedText : currentVal;
                const isEditing = editingFieldKey === fItem.key;

                return (
                  <div
                    key={fItem.key}
                    className={`p-4 rounded-2xl border transition-all ${
                      hasFieldIssues
                        ? 'bg-slate-800/80 border-amber-500/40'
                        : 'bg-slate-800/40 border-slate-700/60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-white">{fItem.label}</span>
                        <span className="text-[10px] text-slate-400">({fItem.desc})</span>
                        {hasFieldIssues ? (
                          <span className="px-2 py-0.2 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            {fieldDiag.issues.length} ملاحظات
                          </span>
                        ) : (
                          <span className="px-2 py-0.2 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-0.5">
                            <Check className="w-2.5 h-2.5" /> سليم
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            if (isEditing) {
                              setEditingFieldKey(null);
                            } else {
                              setEditingFieldKey(fItem.key);
                              setEditingFieldText(currentVal);
                            }
                          }}
                          className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                          title="تعديل يدوي للحقل"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>{isEditing ? 'إلغاء' : 'تعديل'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCopyText(currentVal, fItem.label)}
                          className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition cursor-pointer"
                          title="نسخ النص"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {isEditing ? (
                      /* Inline Editor */
                      <div className="mt-3 space-y-2">
                        <textarea
                          rows={3}
                          value={editingFieldText}
                          onChange={(e) => setEditingFieldText(e.target.value)}
                          className="w-full p-3 bg-slate-950 border border-amber-500/50 rounded-xl text-xs text-slate-100 font-serif leading-relaxed focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                        />
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingFieldKey(null)}
                            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-bold cursor-pointer"
                          >
                            إلغاء
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveInlineEdit(fItem.key)}
                            className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-black flex items-center gap-1 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>حفظ وتحديث الشهادة</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Display & Compare */
                      <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        {/* Current text */}
                        <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 block">النص الحالي:</span>
                          <p className="text-slate-200 font-serif leading-relaxed">
                            {currentVal || <span className="text-slate-500 italic">(فارغ)</span>}
                          </p>
                        </div>

                        {/* Corrected text & Apply button */}
                        <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 flex flex-col justify-between space-y-2">
                          <div>
                            <span className="text-[10px] font-bold text-emerald-400 block">النص المقترح المدقق:</span>
                            <p className="text-emerald-300 font-serif leading-relaxed font-semibold">
                              {correctedVal || <span className="text-slate-500 italic">(فارغ)</span>}
                            </p>
                          </div>

                          {hasFieldIssues && (
                            <div className="pt-1 flex justify-end">
                              <button
                                type="button"
                                onClick={() => handleApplyFieldFix(fItem.key, correctedVal)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-lg text-xs flex items-center gap-1 shadow cursor-pointer"
                              >
                                <Check className="w-3 h-3" />
                                <span>تطبيق تصحيح هذا الحقل</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 bg-slate-950/80 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <span>نوع المكرّم المعتمد في الفحص: </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleToggleGender('male')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  currentGender !== 'female'
                    ? 'bg-amber-500 text-slate-950 font-black'
                    : 'bg-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                طالب (مذكر 👨‍🎓)
              </button>
              <button
                type="button"
                onClick={() => handleToggleGender('female')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  currentGender === 'female'
                    ? 'bg-amber-500 text-slate-950 font-black'
                    : 'bg-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                طالبة (مؤنث 👩‍🎓)
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
            >
              تم وإغلاق
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
