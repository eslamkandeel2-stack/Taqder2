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
  Heart,
  Smile,
  Award,
  FileText,
  Ribbon,
  Quote,
  Eye,
  EyeOff,
  Zap,
  Feather
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
    { title: 'عبقري الرياضيات', icon: '📐', achievement: 'حصوله على المركز الأول في أولمبياد الرياضيات وسرعة حل المسائل المعقدة' },
    { title: 'حفظ جزء من القرآن', icon: '📖', achievement: 'حفظ جزأي عم وتبارك وإتقان الترتيل والتجويد وحسن الأداء' },
    { title: 'الانضباط والمواظبة', icon: '⏱️', achievement: 'حضور يومي بنسبة 100% دون أي غياب والتزام كامل بالأنظمة المدرسية' },
    { title: 'الفنان المبدع', icon: '🎨', achievement: 'التميز في الرسم والأنشطة الإبداعية وتنسيق المعرض المدرسي' },
    { title: 'القيادة والروح الرياضية', icon: '🏆', achievement: 'قيادة فريق الفصل في الدوري الرياضي والتحلي بأخلاق الفرسان' },
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-2.5 sm:p-4 text-right">
      <div className="bg-white w-full max-w-3xl rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950 text-white p-4 sm:p-5 flex items-center justify-between border-b border-amber-500/20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400/25 to-amber-600/10 border border-amber-400/40 flex items-center justify-center text-amber-300 shadow-inner shrink-0">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-black text-white tracking-tight">
                  مساعد الذكاء الاصطناعي لصياغة التكريم
                </h3>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-400/15 text-amber-300 border border-amber-400/30 flex items-center gap-1 font-mono shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                  {currentModelOption.name}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
                صياغة بلاغية رفيعة، ضبط السجع والقوافي، وتوليد نصوص تكريم استثنائية
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="إغلاق النافذة"
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/15 rounded-xl transition-all active:scale-95 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation (Segmented Pill Tabs) */}
        <div className="bg-slate-100/90 border-b border-slate-200 p-2 sm:p-2.5 shrink-0">
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2 max-w-full">
            
            {/* Tab 1 Button */}
            <button
              onClick={() => setModalTab('improve')}
              className={`relative py-2.5 px-2 sm:px-3.5 rounded-xl sm:rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer select-none text-center ${
                modalTab === 'improve'
                  ? 'bg-white text-amber-950 shadow-sm border border-amber-300 ring-1 ring-amber-400/30 font-black'
                  : 'text-slate-600 hover:text-slate-950 hover:bg-white/60 border border-transparent font-bold'
              }`}
            >
              <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                modalTab === 'improve' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'bg-slate-200/80 text-slate-600'
              }`}>
                <Wand2 className="w-3.5 h-3.5" />
              </div>
              <span className="truncate">تحسين وبلاغة الصياغة</span>
            </button>

            {/* Tab 2 Button */}
            <button
              onClick={() => setModalTab('full')}
              className={`relative py-2.5 px-2 sm:px-3.5 rounded-xl sm:rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer select-none text-center ${
                modalTab === 'full'
                  ? 'bg-white text-amber-950 shadow-sm border border-amber-300 ring-1 ring-amber-400/30 font-black'
                  : 'text-slate-600 hover:text-slate-950 hover:bg-white/60 border border-transparent font-bold'
              }`}
            >
              <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                modalTab === 'full' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'bg-slate-200/80 text-slate-600'
              }`}>
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <span className="truncate">توليد شهادة متكاملة</span>
            </button>

            {/* Tab 3 Button */}
            <button
              onClick={() => setModalTab('settings')}
              className={`relative py-2.5 px-2 sm:px-3.5 rounded-xl sm:rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer select-none text-center ${
                modalTab === 'settings'
                  ? 'bg-white text-amber-950 shadow-sm border border-amber-300 ring-1 ring-amber-400/30 font-black'
                  : 'text-slate-600 hover:text-slate-950 hover:bg-white/60 border border-transparent font-bold'
              }`}
            >
              <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                modalTab === 'settings' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'bg-slate-200/80 text-slate-600'
              }`}>
                <Sliders className="w-3.5 h-3.5" />
              </div>
              <span className="truncate">إعدادات الذكاء (API)</span>
            </button>

          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">

          {/* ======================= TAB 1: IMPROVE TEXT ======================= */}
          {modalTab === 'improve' && (
            <div className="space-y-5">
              
              {/* Field to Improve Selector */}
              <div className="bg-slate-50/80 p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-amber-600" />
                    <span>الجزء المراد تحسين صياغته وبلاغته:</span>
                  </label>
                  <span className="text-[10px] text-slate-500 font-bold bg-white px-2 py-0.5 rounded-md border border-slate-200">
                    انقر للتبديل السريع
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'appreciation', label: 'فقرة التقدير والثناء', icon: FileText },
                    { id: 'title', label: 'عنوان الشهادة الرئيسي', icon: Award },
                    { id: 'intro', label: 'عبارة مقدمة التكريم', icon: Ribbon },
                    { id: 'poem', label: 'بيت شعر أو حكمة', icon: Quote },
                  ].map((field) => {
                    const IconComp = field.icon;
                    const isSelected = improveFieldType === field.id;
                    return (
                      <button
                        key={field.id}
                        type="button"
                        onClick={() => handleSelectFieldType(field.id as any)}
                        className={`p-2.5 rounded-xl border text-xs font-black transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer relative group ${
                          isSelected
                            ? 'border-amber-500 bg-amber-500 text-slate-950 shadow-md ring-2 ring-amber-400/40 scale-[1.02]'
                            : 'border-slate-200/90 text-slate-700 bg-white hover:bg-amber-50/50 hover:border-amber-300 shadow-2xs'
                        }`}
                      >
                        {isSelected && (
                          <span className="absolute top-1.5 left-1.5 w-4 h-4 rounded-full bg-slate-950 text-amber-400 flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </span>
                        )}
                        <IconComp className={`w-4 h-4 transition-transform group-hover:scale-110 ${isSelected ? 'text-slate-950' : 'text-amber-600'}`} />
                        <span className="leading-tight text-center">{field.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Style / Tone Selector */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    <Crown className="w-4 h-4 text-amber-600" />
                    <span>الأسلوب والنبرة البلاغية المطلوبة:</span>
                  </label>
                  <span className="text-[10px] text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/80">
                    {improveStyle}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'مسجوع وأدبي', label: 'مسجوع وبليغ', icon: ScrollText, desc: 'سجع راقٍ وقوافٍ متناغمة' },
                    { id: 'رسمي وفخم', label: 'رسمي وفخم', icon: Crown, desc: 'صياغة قيادية ملكية معتمدة' },
                    { id: 'حماسي ومحفز', label: 'حماسي وملهم', icon: Rocket, desc: 'يبعث الطاقة ويعزز الهمة' },
                    { id: 'شاعري وبليغ', label: 'شاعري وأدبي', icon: Feather, desc: 'ألفاظ عربية أصيلة وعذبة' },
                    { id: 'لطيف للأطفال', label: 'مرح للصغار', icon: Smile, desc: 'مبسط وجذاب للمراحل المبكرة' },
                    { id: 'موجز ومباشر', label: 'موجز وقوي', icon: Zap, desc: 'كلمات معدودة ذات أثر عميق' },
                  ].map((s) => {
                    const IconComp = s.icon;
                    const isSelected = improveStyle === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setImproveStyle(s.id)}
                        className={`p-2.5 rounded-xl border text-right transition-all cursor-pointer flex items-start gap-2.5 relative group ${
                          isSelected
                            ? 'border-amber-500 bg-amber-50/90 text-amber-950 ring-2 ring-amber-400/40 shadow-xs'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                        }`}
                      >
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                          isSelected ? 'bg-amber-500 text-slate-950' : 'bg-slate-100 text-slate-600 group-hover:bg-amber-100 group-hover:text-amber-700'
                        }`}>
                          <IconComp className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-black truncate">{s.label}</div>
                          <div className="text-[10px] text-slate-500 truncate mt-0.5">{s.desc}</div>
                        </div>
                        {isSelected && (
                          <div className="w-3.5 h-3.5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shrink-0">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Recipient Gender Toggle Card */}
              <div className="flex items-center justify-between p-3.5 bg-gradient-to-r from-amber-50/70 to-slate-50/70 rounded-2xl border border-amber-200/80 flex-wrap gap-3">
                <div className="space-y-0.5">
                  <span className="text-xs font-black text-slate-900 block">صيغة المخاطب للتكريم:</span>
                  <span className="text-[11px] text-slate-600 block font-medium">يضمن الذكاء الاصطناعي ضبط الضمائر وقواعد النحو بدقة</span>
                </div>
                <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-xl border border-amber-200 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setImproveRecipientGender('male')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                      improveRecipientGender === 'male'
                        ? 'bg-amber-500 text-slate-950 shadow-sm ring-1 ring-amber-400'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <span>👨‍🎓</span>
                    <span>طالب (مذكر)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setImproveRecipientGender('female')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                      improveRecipientGender === 'female'
                        ? 'bg-pink-600 text-white shadow-sm ring-1 ring-pink-400'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <span>👩‍🎓</span>
                    <span>طالبة (مؤنث)</span>
                  </button>
                </div>
              </div>

              {/* Original Text Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-900">النص الأساسي المراد إعادة صياغته وتطويره:</label>
                  <span className="text-[11px] text-slate-400 font-medium">يمكنك تعديله أو تركه لاقتراح أفكار</span>
                </div>
                <textarea
                  rows={3}
                  value={improveInputText}
                  onChange={(e) => setImproveInputText(e.target.value)}
                  placeholder="أدخل النص الحالي أو اترك الذكاء الاصطناعي يقترح أفضل الصياغات بناء على بيانات الشهادة..."
                  className="w-full p-3 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 font-medium leading-relaxed bg-white shadow-2xs"
                />
              </div>

              {/* Main Action Button */}
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleImproveText}
                  disabled={isImproving}
                  className="w-full sm:w-auto px-7 py-3 bg-gradient-to-r from-amber-500 via-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-98 flex items-center justify-center gap-2.5 disabled:opacity-50 cursor-pointer"
                >
                  {isImproving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>جاري الصياغة البلاغية بالذكاء الاصطناعي ({currentModelOption.name})...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 animate-bounce" />
                      <span>توليد خيارات الصياغة المحسنة ✨</span>
                    </>
                  )}
                </button>
              </div>

              {/* Generated Variations List */}
              {variations.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900 flex items-center gap-2">
                      <Crown className="w-4 h-4 text-amber-600" />
                      الخيارات والبدائل البلاغية المقترحة:
                    </span>
                    <span className="text-[10px] font-bold text-amber-900 bg-amber-100/80 px-2.5 py-1 rounded-full border border-amber-200 shadow-2xs">
                      {improveSource === 'ai' ? `⚡ تم التوليد بنموذج ${currentModelOption.name}` : '🍃 تم التوليد عبر المحرك اللغوي الفائق'}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {variations.map((v) => (
                      <div
                        key={v.id}
                        className={`p-4 rounded-2xl border transition-all ${
                          appliedId === v.id
                            ? 'bg-emerald-50/95 border-emerald-400 ring-2 ring-emerald-400/40 shadow-sm'
                            : 'bg-white border-slate-200 hover:border-amber-400 hover:shadow-md'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2.5 gap-2">
                          <span className="text-[11px] font-black text-amber-950 bg-amber-100/80 px-2.5 py-0.5 rounded-lg border border-amber-200/80 flex items-center gap-1">
                            <span>✨</span>
                            <span>{v.styleLabel || 'صياغة مميزة'}</span>
                          </span>
                          
                          <div className="flex items-center gap-2">
                            {/* Copy Button */}
                            <button
                              type="button"
                              onClick={() => handleCopyText(v.text, v.id)}
                              className="px-2.5 py-1.5 text-[11px] font-bold text-slate-700 hover:text-slate-950 bg-slate-100 hover:bg-slate-200/80 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer border border-slate-200 active:scale-95"
                            >
                              {copiedId === v.id ? <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                              <span>{copiedId === v.id ? 'تم النسخ!' : 'نسخ'}</span>
                            </button>

                            {/* Apply Button */}
                            <button
                              type="button"
                              onClick={() => handleApplyVariation(v)}
                              className={`px-3.5 py-1.5 text-xs font-black rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 ${
                                appliedId === v.id
                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
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

                        <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-semibold bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
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
            <div className="space-y-5">
              
              {/* Quick Presets Options */}
              <div className="bg-slate-50/80 p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span>نماذج ومقترحات سريعة جاهزة:</span>
                  </label>
                  <span className="text-[10px] text-slate-500 font-bold">انقر للتعبئة الفورية</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {quickPresets.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setSubject(preset.title);
                        setAchievement(preset.achievement);
                      }}
                      className="px-3 py-1.5 bg-white hover:bg-amber-50 text-slate-800 hover:text-amber-950 border border-slate-200 hover:border-amber-400 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
                    >
                      <span>{preset.icon}</span>
                      <span>{preset.title}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Recipient Gender Selector */}
              <div className="bg-gradient-to-r from-amber-50/70 to-slate-50/70 p-3.5 rounded-2xl border border-amber-200/80 space-y-2">
                <label className="block text-xs font-black text-slate-900">
                  نوع المكرّم (تحديد صيغة الشهادة للذكاء الاصطناعي):
                </label>
                <div className="grid grid-cols-2 gap-2 bg-white p-1.5 rounded-xl border border-amber-200">
                  <button
                    type="button"
                    onClick={() => setRecipientGender('male')}
                    className={`py-2.5 px-3 rounded-lg text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      recipientGender === 'male'
                        ? 'bg-amber-500 text-slate-950 shadow-sm ring-1 ring-amber-400 font-black'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-base">👨‍🎓</span>
                    <span>طالب (مذكر)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecipientGender('female')}
                    className={`py-2.5 px-3 rounded-lg text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      recipientGender === 'female'
                        ? 'bg-pink-600 text-white shadow-sm ring-1 ring-pink-400 font-black'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-base">👩‍🎓</span>
                    <span>طالبة (مؤنث)</span>
                  </button>
                </div>
              </div>

              {/* Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-black text-slate-800">اسم الطالب / الطالبة</label>
                  <input
                    type="text"
                    value={studentName}
                    onChange={(e) => handleStudentNameChange(e.target.value)}
                    placeholder={recipientGender === 'female' ? 'سارة بنت أحمد الغامدي' : 'أحمد بن علي العتيبي'}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 font-bold bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-black text-slate-800">الصف / الفصل</label>
                  <input
                    type="text"
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    placeholder="الصف الخامس - أ"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 font-bold bg-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-black text-slate-800">المادة / المجال المكرم فيه</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="مثال: الرياضيات، حفظ القرآن، الابتكار الرقمي"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 font-bold bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-black text-slate-800">تفاصيل الإنجاز / سبب الشكر</label>
                <textarea
                  rows={2}
                  value={achievement}
                  onChange={(e) => setAchievement(e.target.value)}
                  placeholder="مثال: حصل على الدرجة الكاملة في الاختبار النهائي وساعد زملائه باجتهاد"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 leading-relaxed font-medium bg-white"
                />
              </div>

              {/* Tone Buttons */}
              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-800">أسلوب ونبرة النص المطلوبة:</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'حماسي ورائع', label: 'حماسي ومحفز', icon: Rocket },
                    { id: 'رسمي وفخم', label: 'رسمي وفخم', icon: Crown },
                    { id: 'لطيف للأطفال', label: 'مرح ولطيف', icon: Smile },
                    { id: 'شاعري وأدبي', label: 'شاعري وبليغ', icon: ScrollText },
                  ].map((t) => {
                    const IconComp = t.icon;
                    const isSelected = tone === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTone(t.id as any)}
                        className={`p-2.5 rounded-xl border text-xs font-black transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer relative group ${
                          isSelected
                            ? 'border-amber-500 bg-amber-500 text-slate-950 shadow-sm ring-2 ring-amber-400/40 scale-[1.02]'
                            : 'border-slate-200 text-slate-700 bg-white hover:bg-slate-50 hover:border-slate-300'
                        }`}
                      >
                        <IconComp className={`w-4 h-4 ${isSelected ? 'text-slate-950' : 'text-amber-600'}`} />
                        <span>{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Main Action Button */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleGenerateFull}
                  disabled={isGeneratingFull}
                  className="w-full sm:w-auto px-7 py-3 bg-gradient-to-r from-amber-500 via-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-98 flex items-center justify-center gap-2.5 disabled:opacity-50 cursor-pointer"
                >
                  {isGeneratingFull ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>جاري صياغة وبناء الشهادة المتكاملة بالذكاء الاصطناعي...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 animate-bounce" />
                      <span>توليد وتطبيق الشهادة الآن ✨</span>
                    </>
                  )}
                </button>
              </div>

            </div>
          )}

          {/* ======================= TAB 3: QUICK AI SETTINGS ======================= */}
          {modalTab === 'settings' && (
            <div className="space-y-5">
              
              <div className="p-4 bg-slate-950 text-white rounded-2xl flex items-center justify-between border border-slate-800 shadow-sm">
                <div>
                  <h4 className="text-xs sm:text-sm font-black flex items-center gap-2 text-amber-400">
                    <Cpu className="w-4 h-4" />
                    التحكم في نماذج الذكاء الاصطناعي والمفاتيح
                  </h4>
                  <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
                    يمكنك تغيير النموذج أو إدخال مفتاح API خاص بك للعمل على أي سيرفر خارجي دون انقطاع
                  </p>
                </div>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-3 py-1 rounded-full border border-amber-400/30 font-mono font-bold shrink-0">
                  {tempModel}
                </span>
              </div>

              {/* Model Selector Cards */}
              <div className="space-y-2.5">
                <label className="block text-xs font-black text-slate-900">
                  اختر نموذج الذكاء الاصطناعي النشط:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {SUPPORTED_AI_MODELS.map((model) => {
                    const isSelected = tempModel === model.id;
                    return (
                      <div
                        key={model.id}
                        onClick={() => setTempModel(model.id)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative ${
                          isSelected
                            ? 'border-amber-500 bg-amber-50/90 ring-2 ring-amber-400/40 shadow-sm'
                            : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border ${
                              isSelected ? 'border-amber-600 bg-amber-500' : 'border-slate-300 bg-white'
                            }`}>
                              {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                            </div>
                            <span className="text-xs font-black text-slate-950">{model.name}</span>
                          </div>
                          <span className="text-[10px] font-black text-amber-900 bg-amber-100/90 px-2 py-0.5 rounded-md border border-amber-200/80">
                            {model.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed font-medium pr-5.5">{model.description}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Custom API Key Input */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/90 space-y-2.5">
                <label className="block text-xs font-black text-slate-900">
                  مفتاح Gemini API الخاص (اختياري عند الرفع على خادم خارجي):
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showKey ? 'text' : 'password'}
                      value={tempApiKey}
                      onChange={(e) => setTempApiKey(e.target.value)}
                      placeholder="AIzaSy... أو AQ.Ab... (اتركه فارغاً للاعتماد على مفتاح السيرفر)"
                      className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl font-mono text-left dir-ltr bg-white focus:ring-2 focus:ring-amber-500 shadow-2xs font-bold"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="px-3.5 py-2.5 bg-white border border-slate-300 hover:border-slate-400 rounded-xl text-xs font-black text-slate-700 hover:bg-slate-100 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    {showKey ? <EyeOff className="w-3.5 h-3.5 text-slate-500" /> : <Eye className="w-3.5 h-3.5 text-slate-500" />}
                    <span>{showKey ? 'إخفاء' : 'إظهار'}</span>
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 font-medium">
                  * إذا رفعت النظام على سيرفرك الخاص، يمكنك كتابة مفتاحك هنا لضمان عمل كافة الوظائف الذكية باستمرار.
                </p>
              </div>

              {/* Test Connection Button & Status */}
              <div className="flex items-center justify-between flex-wrap gap-2.5 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTesting}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-sm active:scale-95"
                >
                  {isTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />}
                  <span>فحص واختبار الاتصال بالـ API</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveQuickSettings}
                  className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>حفظ إعدادات الـ API</span>
                </button>
              </div>

              {/* Test Result Message */}
              {testResult && (
                <div
                  className={`p-3.5 rounded-xl border text-xs font-black flex items-center gap-2.5 ${
                    testResult.success
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                      : 'bg-red-50 border-red-300 text-red-950'
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
                      <span className="font-mono text-[10px] mr-2 text-emerald-700">({testResult.latencyMs}ms)</span>
                    )}
                  </div>
                </div>
              )}

              {settingsSavedSuccess && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs font-black rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>تم حفظ الإعدادات وتطبيق النموذج بنجاح! 🟢</span>
                </div>
              )}

            </div>
          )}

          {errorMessage && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-900 rounded-xl text-xs font-bold flex items-center gap-2">
              <span>⚠️</span>
              <span>{errorMessage}</span>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 p-3.5 sm:p-4 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-slate-700 hover:text-slate-950 hover:bg-slate-200/60 rounded-xl font-bold text-xs transition cursor-pointer"
          >
            إغلاق النافذة
          </button>
          <span className="text-[11px] text-slate-500 font-bold">
            نظام تقدير الذكي © 1447 هـ
          </span>
        </div>

      </div>
    </div>
  );
};
