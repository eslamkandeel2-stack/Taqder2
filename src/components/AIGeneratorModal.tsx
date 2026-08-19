import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  X,
  Bot,
  Check,
  RefreshCw,
  Sliders,
  Cpu,
  Wand2,
  BookOpen,
  Copy,
  CheckCircle2,
  Layers,
  Key,
  ShieldCheck,
  SlidersHorizontal,
  Flame,
  Crown,
  ScrollText,
  Rocket,
  Heart
} from 'lucide-react';
import { CertificateData } from '../types';
import { RecipientGender, detectGenderFromName, generateLocalCertificateFallback } from '../utils/genderConverter';
import {
  getSavedAISettings,
  saveAISettings,
  getAIRequestHeaders,
  testAIConnection,
  improveCertificateTextWithAi,
  AISettings,
  TextVariation,
  SUPPORTED_AI_MODELS
} from '../utils/aiConfig';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onApplyGeneratedContent: (data: Partial<CertificateData>) => void;
  currentData: CertificateData;
  initialTab?: 'improve' | 'full' | 'settings';
  initialTargetField?: 'appreciation' | 'title' | 'intro' | 'poem';
}

export const AIGeneratorModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onApplyGeneratedContent,
  currentData,
  initialTab = 'improve',
  initialTargetField = 'appreciation',
}) => {
  const [modalTab, setModalTab] = useState<'improve' | 'full' | 'settings'>(initialTab);
  const [aiSettings, setAiSettings] = useState<AISettings>(() => getSavedAISettings());

  // Improve Text State
  const [improveFieldType, setImproveFieldType] = useState<'appreciation' | 'title' | 'intro' | 'poem'>(initialTargetField);
  const [improveInputText, setImproveInputText] = useState('');
  const [improveStyle, setImproveStyle] = useState('مسجوع وأدبي');
  const [improveRecipientGender, setImproveRecipientGender] = useState<RecipientGender>(
    currentData.recipientGender || (detectGenderFromName(currentData.studentName) === 'female' ? 'female' : 'male')
  );
  const [isImproving, setIsImproving] = useState(false);
  const [variations, setVariations] = useState<TextVariation[]>([]);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [appliedId, setAppliedId] = useState<number | null>(null);
  const [improveSource, setImproveSource] = useState<'ai' | 'local_fallback' | null>(null);

  // Full Generator State
  const [studentName, setStudentName] = useState(currentData.studentName || '');
  const [recipientGender, setRecipientGender] = useState<RecipientGender>(
    currentData.recipientGender || (detectGenderFromName(currentData.studentName) === 'female' ? 'female' : 'male')
  );
  const [subject, setSubject] = useState(currentData.subject || '');
  const [achievement, setAchievement] = useState('');
  const [grade, setGrade] = useState(currentData.grade || '');
  const [tone, setTone] = useState<'حماسي ورائع' | 'رسمي وفخم' | 'لطيف للأطفال' | 'شاعري وأدبي'>('حماسي ورائع');
  const [isGeneratingFull, setIsGeneratingFull] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Quick Settings State
  const [tempApiKey, setTempApiKey] = useState(aiSettings.apiKey || '');
  const [tempModel, setTempModel] = useState(aiSettings.model || 'gemini-2.0-flash');
  const [showKey, setShowKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; latencyMs?: number } | null>(null);
  const [settingsSavedSuccess, setSettingsSavedSuccess] = useState(false);

  // Sync with prop changes when modal opens
  useEffect(() => {
    if (isOpen) {
      setModalTab(initialTab);
      setImproveFieldType(initialTargetField);
      const saved = getSavedAISettings();
      setAiSettings(saved);
      setTempApiKey(saved.apiKey || '');
      setTempModel(saved.model || 'gemini-2.0-flash');
      setStudentName(currentData.studentName || '');
      const gender = currentData.recipientGender || (detectGenderFromName(currentData.studentName) === 'female' ? 'female' : 'male');
      setRecipientGender(gender);
      setImproveRecipientGender(gender);
      setSubject(currentData.subject || '');
      setGrade(currentData.grade || '');
      setVariations([]);
      setAppliedId(null);
      setTestResult(null);

      // Pre-fill initial text according to selected target field
      if (initialTargetField === 'appreciation') {
        setImproveInputText(currentData.appreciationText || '');
      } else if (initialTargetField === 'title') {
        setImproveInputText(currentData.title || '');
      } else if (initialTargetField === 'intro') {
        setImproveInputText(currentData.recipientIntro || '');
      } else if (initialTargetField === 'poem') {
        setImproveInputText(currentData.poemOrQuote || '');
      }
    }
  }, [isOpen, initialTab, initialTargetField, currentData]);

  // When changing field type in Improve tab, update default text
  const handleSelectFieldType = (type: 'appreciation' | 'title' | 'intro' | 'poem') => {
    setImproveFieldType(type);
    setVariations([]);
    setAppliedId(null);
    if (type === 'appreciation') {
      setImproveInputText(currentData.appreciationText || '');
    } else if (type === 'title') {
      setImproveInputText(currentData.title || '');
    } else if (type === 'intro') {
      setImproveInputText(currentData.recipientIntro || '');
    } else if (type === 'poem') {
      setImproveInputText(currentData.poemOrQuote || '');
    }
  };

  if (!isOpen) return null;

  const currentModelOption = SUPPORTED_AI_MODELS.find(m => m.id === aiSettings.model) || SUPPORTED_AI_MODELS[0];

  const handleStudentNameChange = (val: string) => {
    setStudentName(val);
    if (val.trim().length >= 3) {
      const detected = detectGenderFromName(val);
      setRecipientGender(detected);
      setImproveRecipientGender(detected);
    }
  };

  const quickPresets = [
    { title: 'عبقري الرياضيات', achievement: 'حصوله على المركز الأول في أولمبياد الرياضيات وسرعة حل المسائل المعقدة' },
    { title: 'حفظ جزء من القرآن', achievement: 'حفظ جزأي عم وتبارك وإتقان الترتيل والتجويد وحسن الأداء' },
    { title: 'الانضباط والمواظبة', achievement: 'حضور يومي بنسبة 100% دون أي غياب والتزام كامل بالأنظمة المدرسية' },
    { title: 'الفنان المبدع', achievement: 'التميز في الرسم والأنشطة الإبداعية وتنسيق المعرض المدرسي' },
    { title: 'القيادة والروح الرياضية', achievement: 'قيادة فريق الفصل في الدوري الرياضي والتحلي بأخلاق الفرسان' },
  ];

  // 1. IMPROVE TEXT HANDLER
  const handleImproveText = async () => {
    setIsImproving(true);
    setErrorMessage('');
    setAppliedId(null);

    try {
      const result = await improveCertificateTextWithAi({
        text: improveInputText,
        type: improveFieldType,
        style: improveStyle,
        gender: improveRecipientGender,
        studentName: currentData.studentName,
        subject: currentData.subject,
        grade: currentData.grade,
        schoolName: currentData.schoolName,
        settings: aiSettings,
      });

      if (result.success && result.variations.length > 0) {
        setVariations(result.variations);
        setImproveSource(result.source);
      } else {
        setErrorMessage('تعذر تحسين النص، يرجى المحاولة مرة أخرى.');
      }
    } catch (err: any) {
      console.error('Improve text error:', err);
      setErrorMessage('حدث خطأ أثناء معالجة النص.');
    } finally {
      setIsImproving(false);
    }
  };

  // Apply single variation to the certificate
  const handleApplyVariation = (v: TextVariation) => {
    const patch: Partial<CertificateData> = {};
    if (improveFieldType === 'appreciation') {
      patch.appreciationText = v.text;
    } else if (improveFieldType === 'title') {
      patch.title = v.text;
    } else if (improveFieldType === 'intro') {
      patch.recipientIntro = v.text;
    } else if (improveFieldType === 'poem') {
      patch.poemOrQuote = v.text;
      patch.showPoemOrQuote = true;
    }
    patch.recipientGender = improveRecipientGender;

    onApplyGeneratedContent(patch);
    setAppliedId(v.id);
  };

  const handleCopyText = (text: string, id: number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // 2. FULL GENERATOR HANDLER
  const handleGenerateFull = async () => {
    setIsGeneratingFull(true);
    setErrorMessage('');

    try {
      let resultData: any = null;

      try {
        const endpoint = '/api/generate-certificate-content';
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: getAIRequestHeaders(aiSettings),
          body: JSON.stringify({
            studentName: studentName || (recipientGender === 'female' ? 'الطالبة المتميزة' : 'الطالب المتميز'),
            recipientGender,
            subject: subject || 'التميز العام والتفوق',
            achievement: achievement || 'الاجتهاد والتفوق المشهود في المواد الدراسية',
            grade: grade || 'المرحلة الدراسية',
            tone,
            schoolName: currentData.schoolName,
            teacherName: currentData.signatures?.[0]?.name,
            apiKey: aiSettings.apiKey?.trim() || undefined,
            model: aiSettings.model || 'gemini-2.0-flash',
            temperature: aiSettings.temperature,
            systemInstruction: aiSettings.systemInstruction,
          }),
        });

        const text = await response.text();
        if (text && (text.trim().startsWith('{') || text.trim().startsWith('['))) {
          const json = JSON.parse(text);
          if (json && json.success && json.result) {
            resultData = json.result;
          }
        }
      } catch (networkOrParseError) {
        console.warn('Network or AI parse error, using intelligent fallback:', networkOrParseError);
      }

      // If server or network returned non-JSON/error, use local high-quality generator
      if (!resultData) {
        resultData = generateLocalCertificateFallback({
          studentName: studentName || (recipientGender === 'female' ? 'الطالبة المتميزة' : 'الطالب المتميز'),
          recipientGender,
          subject: subject || 'التميز العام والتفوق',
          achievement: achievement || 'الاجتهاد والتفوق المشهود في المواد الدراسية',
          grade: grade || 'المرحلة الدراسية',
          tone,
          schoolName: currentData.schoolName,
          teacherName: currentData.signatures?.[0]?.name,
        });
      }

      onApplyGeneratedContent({
        recipientGender,
        studentName: studentName || currentData.studentName,
        grade: grade || currentData.grade,
        subject: subject || currentData.subject,
        title: resultData.title || currentData.title,
        recipientIntro: resultData.recipientIntro || currentData.recipientIntro,
        appreciationText: resultData.appreciationText || currentData.appreciationText,
        poemOrQuote: resultData.poemOrQuote || currentData.poemOrQuote,
        badgeTitle: resultData.badgeTitle || currentData.badgeTitle,
        primaryColor: resultData.primaryColorHex || currentData.primaryColor,
        secondaryColor: resultData.secondaryColorHex || currentData.secondaryColor,
      });

      onClose();
    } catch (err: any) {
      console.error('Final generator error:', err);
      setErrorMessage('حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى.');
    } finally {
      setIsGeneratingFull(false);
    }
  };

  // 3. QUICK SETTINGS HANDLERS
  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testAIConnection({
        ...aiSettings,
        apiKey: tempApiKey,
        model: tempModel,
      });
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: 'تعذر الاتصال بالخادم، تحقق من الاتصال بالإنترنت.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveQuickSettings = () => {
    const updated: AISettings = {
      ...aiSettings,
      apiKey: tempApiKey.trim(),
      model: tempModel,
    };
    saveAISettings(updated);
    setAiSettings(updated);
    setSettingsSavedSuccess(true);
    setTimeout(() => setSettingsSavedSuccess(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-xs p-3 sm:p-4 text-right">
      <div className="bg-white w-full max-w-2xl rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 text-white p-4 sm:p-5 flex items-center justify-between border-b border-amber-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300 shadow-inner shrink-0">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-extrabold text-white">مساعد الذكاء الاصطناعي لصياغة التكريم</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30">
                  {currentModelOption.name}
                </span>
              </div>
              <p className="text-[11px] text-amber-200/80 mt-0.5">
                صياغة بلاغية فخمة، ضبط السجع والقوافي، وتوليد نصوص تكريم استثنائية
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50/90 px-3 pt-2 gap-1.5 overflow-x-auto">
          <button
            onClick={() => setModalTab('improve')}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-extrabold transition flex items-center gap-2 border-b-2 cursor-pointer ${
              modalTab === 'improve'
                ? 'bg-white text-amber-950 border-amber-500 shadow-2xs font-black'
                : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-100'
            }`}
          >
            <Wand2 className="w-4 h-4 text-amber-600" />
            <span>تحسين وبلاغة نصوص التكريم</span>
          </button>

          <button
            onClick={() => setModalTab('full')}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-extrabold transition flex items-center gap-2 border-b-2 cursor-pointer ${
              modalTab === 'full'
                ? 'bg-white text-amber-950 border-amber-500 shadow-2xs font-black'
                : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-100'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span>توليد شهادة متكاملة جديدة</span>
          </button>

          <button
            onClick={() => setModalTab('settings')}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-extrabold transition flex items-center gap-2 border-b-2 cursor-pointer ${
              modalTab === 'settings'
                ? 'bg-white text-amber-950 border-amber-500 shadow-2xs font-black'
                : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-100'
            }`}
          >
            <Sliders className="w-4 h-4 text-amber-600" />
            <span>إعدادات الذكاء الاصطناعي (API)</span>
          </button>
        </div>

        {/* Modal Body Container */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">

          {/* ======================= TAB 1: IMPROVE TEXT ======================= */}
          {modalTab === 'improve' && (
            <div className="space-y-4">
              
              {/* Field to Improve Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  اختر الجزء المراد تحسين صياغته وبلاغته:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'appreciation', label: 'فقرة التقدير والثناء', icon: '📝' },
                    { id: 'title', label: 'عنوان الشهادة الرئيسي', icon: '📜' },
                    { id: 'intro', label: 'عبارة مقدمة التكريم', icon: '🎗️' },
                    { id: 'poem', label: 'بيت شعر أو حكمة', icon: '✨' },
                  ].map((field) => (
                    <button
                      key={field.id}
                      type="button"
                      onClick={() => handleSelectFieldType(field.id as any)}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        improveFieldType === field.id
                          ? 'border-amber-500 bg-amber-50 text-amber-950 ring-2 ring-amber-400/40 font-black'
                          : 'border-slate-200 text-slate-700 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <span>{field.icon}</span>
                      <span>{field.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Style / Tone Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  الأسلوب والنبرة البلاغية المطلوبة:
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'مسجوع وأدبي', label: '📜 مسجوع وبليغ', desc: 'سجع راقٍ وقوافٍ متناغمة' },
                    { id: 'رسمي وفخم', label: '👑 رسمي وفخم', desc: 'صياغة قيادية ملكية معتمدة' },
                    { id: 'حماسي ومحفز', label: '🚀 حماسي وملهم', desc: 'يبعث الطاقة ويعزز الهمة' },
                    { id: 'شاعري وبليغ', label: '✨ شاعري وأدبي', desc: 'ألفاظ عربية أصيلة وعذبة' },
                    { id: 'لطيف للأطفال', label: '🎈 مرح للصغار', desc: 'مبسط وجذاب للمراحل المبكرة' },
                    { id: 'موجز ومباشر', label: '⚡ موجز وقوي', desc: 'كلمات معدودة ذات أثر عميق' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setImproveStyle(s.id)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                        improveStyle === s.id
                          ? 'border-amber-500 bg-amber-500 text-slate-950 font-black shadow-xs'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Recipient Gender Toggle */}
              <div className="flex items-center justify-between p-3 bg-amber-50/60 rounded-xl border border-amber-200/70">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-amber-950 block">صيغة المخاطب للتكريم:</span>
                  <span className="text-[11px] text-amber-800 block">يضمن الذكاء الاصطناعي مطابقة الضمائر وقواعد النحو بدقة</span>
                </div>
                <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-amber-200">
                  <button
                    type="button"
                    onClick={() => setImproveRecipientGender('male')}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
                      improveRecipientGender === 'male'
                        ? 'bg-amber-600 text-white font-black'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    👨‍🎓 طالب (مذكر)
                  </button>
                  <button
                    type="button"
                    onClick={() => setImproveRecipientGender('female')}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
                      improveRecipientGender === 'female'
                        ? 'bg-pink-600 text-white font-black'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    👩‍🎓 طالبة (مؤنث)
                  </button>
                </div>
              </div>

              {/* Original Text Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">النص الأساسي المراد إعادة صياغته وتطويره:</label>
                  <span className="text-[11px] text-slate-400">يمكنك تعديله أو كتابة أفكار مبدئية</span>
                </div>
                <textarea
                  rows={3}
                  value={improveInputText}
                  onChange={(e) => setImproveInputText(e.target.value)}
                  placeholder="أدخل النص الحالي أو اترك الذكاء الاصطناعي يقترح أفضل الصياغات بناء على بيانات الشهادة..."
                  className="w-full p-3 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 font-medium leading-relaxed bg-white"
                />
              </div>

              {/* Action Button */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleImproveText}
                  disabled={isImproving}
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs rounded-xl shadow-md transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isImproving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>جاري الصياغة البلاغية بالذكاء الاصطناعي ({currentModelOption.name})...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>توليد خيارات الصياغة المحسنة ✨</span>
                    </>
                  )}
                </button>
              </div>

              {/* Generated Variations List */}
              {variations.length > 0 && (
                <div className="space-y-3 pt-3 border-t border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-800 flex items-center gap-2">
                      <Crown className="w-4 h-4 text-amber-600" />
                      الخيارات والبدائل البلاغية المقترحة:
                    </span>
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      {improveSource === 'ai' ? `⚡ تم التوليد بنموذج ${currentModelOption.name}` : '🍃 تم التوليد عبر المحرك اللغوي الفائق'}
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {variations.map((v) => (
                      <div
                        key={v.id}
                        className={`p-3.5 rounded-2xl border transition-all ${
                          appliedId === v.id
                            ? 'bg-emerald-50/90 border-emerald-300 ring-2 ring-emerald-400/40'
                            : 'bg-white border-slate-200 hover:border-amber-300 hover:shadow-sm'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                            {v.styleLabel || 'صياغة مميزة'}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleCopyText(v.text, v.id)}
                              className="px-2 py-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition flex items-center gap-1 cursor-pointer"
                            >
                              {copiedId === v.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                              <span>{copiedId === v.id ? 'تم النسخ!' : 'نسخ'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleApplyVariation(v)}
                              className={`px-3 py-1 text-xs font-extrabold rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                                appliedId === v.id
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                              }`}
                            >
                              {appliedId === v.id ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>تم التطبيق على الشهادة</span>
                                </>
                              ) : (
                                <>
                                  <Sparkles className="w-3.5 h-3.5" />
                                  <span>تطبيق هذا النص</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        <p className="text-xs text-slate-800 leading-relaxed font-medium">
                          {v.text}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

          {/* ======================= TAB 2: FULL GENERATOR ======================= */}
          {modalTab === 'full' && (
            <div className="space-y-4">
              
              {/* Quick Presets */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">مقترحات ونماذج سريعة جاهزة:</label>
                <div className="flex flex-wrap gap-1.5">
                  {quickPresets.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setSubject(preset.title);
                        setAchievement(preset.achievement);
                      }}
                      className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg text-xs font-bold transition cursor-pointer"
                    >
                      ⚡ {preset.title}
                    </button>
                  ))}
                </div>
              </div>

              {/* Recipient Gender Selector */}
              <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200/80">
                <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                  <span>🎓</span>
                  <span>نوع المكرّم (تحديد صيغة الشهادة للذكاء الاصطناعي):</span>
                </label>
                <div className="grid grid-cols-2 gap-2 bg-white p-1 rounded-xl border border-amber-200/90">
                  <button
                    type="button"
                    onClick={() => setRecipientGender('male')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                      recipientGender === 'male'
                        ? 'bg-amber-600 text-white shadow-xs font-black'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>👨‍🎓</span>
                    <span>طالب (مذكر)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecipientGender('female')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                      recipientGender === 'female'
                        ? 'bg-pink-600 text-white shadow-xs font-black'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>👩‍🎓</span>
                    <span>طالبة (مؤنث)</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">اسم الطالب / الطالبة</label>
                  <input
                    type="text"
                    value={studentName}
                    onChange={(e) => handleStudentNameChange(e.target.value)}
                    placeholder={recipientGender === 'female' ? 'سارة بنت أحمد الغامدي' : 'أحمد بن علي العتيبي'}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الصف / الفصل</label>
                  <input
                    type="text"
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    placeholder="الصف الخامس - أ"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">المادة / المجال المكرم فيه</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="مثال: الرياضيات، حفظ القرآن، الابتكار الرقمي"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">تفاصيل الإنجاز / سبب الشكر</label>
                <textarea
                  rows={2}
                  value={achievement}
                  onChange={(e) => setAchievement(e.target.value)}
                  placeholder="مثال: حصل على الدرجة الكاملة في الاختبار النهائي وساعد زملائه باجتهاد"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">أسلوب ونبرة النص:</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'حماسي ورائع', label: '🚀 حماسي ومحفز' },
                    { id: 'رسمي وفخم', label: '👑 رسمي وفخم' },
                    { id: 'لطيف للأطفال', label: '🎈 مرح ولطيف' },
                    { id: 'شاعري وأدبي', label: '📜 شاعري وبليغ' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTone(t.id as any)}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                        tone === t.id
                          ? 'border-amber-500 bg-amber-50 text-amber-950 font-black ring-2 ring-amber-400/30'
                          : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleGenerateFull}
                  disabled={isGeneratingFull}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs rounded-xl shadow-md transition disabled:opacity-50 cursor-pointer"
                >
                  {isGeneratingFull ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      جاري صياغة وبناء الشهادة المتكاملة...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      توليد وتطبيق الشهادة الآن
                    </>
                  )}
                </button>
              </div>

            </div>
          )}

          {/* ======================= TAB 3: QUICK AI SETTINGS ======================= */}
          {modalTab === 'settings' && (
            <div className="space-y-4">
              
              <div className="p-3.5 bg-slate-900 text-white rounded-2xl flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-extrabold flex items-center gap-2 text-amber-400">
                    <Cpu className="w-4 h-4" />
                    التحكم في نماذج الذكاء الاصطناعي والمفاتيح
                  </h4>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    يمكنك تغيير النموذج أو إدخال مفتاح API خاص بك للعمل على أي سيرفر خارجي دون انقطاع
                  </p>
                </div>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-400/30 font-mono">
                  {tempModel}
                </span>
              </div>

              {/* Model Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  اختر نموذج الذكاء الاصطناعي النشط:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {SUPPORTED_AI_MODELS.map((model) => (
                    <div
                      key={model.id}
                      onClick={() => setTempModel(model.id)}
                      className={`p-3 rounded-xl border transition cursor-pointer ${
                        tempModel === model.id
                          ? 'border-amber-500 bg-amber-50/70 ring-2 ring-amber-400/30'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-900">{model.name}</span>
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-full">
                          {model.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">{model.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Custom API Key Input */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  مفتاح Gemini API الخاص (اختياري عند الرفع على خادم خارجي):
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showKey ? 'text' : 'password'}
                      value={tempApiKey}
                      onChange={(e) => setTempApiKey(e.target.value)}
                      placeholder="AIzaSy... أو AQ.Ab... (اتركه فارغاً للاعتماد على مفتاح السيرفر)"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-mono text-left dir-ltr bg-white focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                  >
                    {showKey ? 'إخفاء' : 'إظهار'}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500">
                  * إذا رفعت النظام على سيرفرك الخاص، يمكنك كتابة مفتاحك هنا لضمان عمل كافة الوظائف الذكية باستمرار.
                </p>
              </div>

              {/* Test Connection Button & Status */}
              <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTesting}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />}
                  <span>فحص واختبار الاتصال بالـ API</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveQuickSettings}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>حفظ إعدادات الـ API</span>
                </button>
              </div>

              {/* Test Result Message */}
              {testResult && (
                <div
                  className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                    testResult.success
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      : 'bg-red-50 border-red-300 text-red-900'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <X className="w-4 h-4 text-red-600 shrink-0" />
                  )}
                  <div className="flex-1">
                    <span>{testResult.message}</span>
                    {testResult.latencyMs && (
                      <span className="font-mono text-[10px] mr-2">({testResult.latencyMs}ms)</span>
                    )}
                  </div>
                </div>
              )}

              {settingsSavedSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>تم حفظ الإعدادات وتطبيق النموذج بنجاح! 🟢</span>
                </div>
              )}

            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs font-medium">
              ⚠️ {errorMessage}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 p-3 sm:p-4 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:text-slate-900 font-bold text-xs cursor-pointer"
          >
            إغلاق
          </button>
          <span className="text-[11px] text-slate-500">
            نظام تقدير الذكي © 1447 هـ
          </span>
        </div>

      </div>
    </div>
  );
};
