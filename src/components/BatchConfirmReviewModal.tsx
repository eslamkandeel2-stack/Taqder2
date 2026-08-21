import React, { useState, useMemo } from 'react';
import { CertificateData } from '../types';
import { detectGenderFromName, convertArabicTextGender } from '../utils/genderConverter';
import {
  Sparkles,
  Users,
  Check,
  X,
  UserCheck,
  UserX,
  Edit3,
  Trash2,
  Plus,
  RefreshCw,
  BookOpen,
  Award,
  Heart,
  Flame,
  Star,
  CheckCircle2,
  AlertCircle,
  Wand2,
  Layers,
  ChevronDown,
  ChevronUp,
  Sliders,
  Eye,
  Info,
  ShieldCheck,
  Zap,
  ArrowRight,
  BookMarked
} from 'lucide-react';

export interface BatchReviewStudentItem {
  id: string;
  name: string;
  gender: 'male' | 'female';
  grade?: string;
  notes?: string;
}

interface BatchConfirmReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: BatchReviewStudentItem[];
  batchTitle: string;
  grade: string;
  subject: string;
  schoolName: string;
  templateName: string;
  initialAppreciation: string;
  onConfirmAndGenerate: (confirmedConfig: {
    students: BatchReviewStudentItem[];
    maleAppreciationText: string;
    femaleAppreciationText: string;
    maleIntroText: string;
    femaleIntroText: string;
    autoGenderAdaptPhrasing: boolean;
  }) => void;
  onShowToast: (msg: string) => void;
}

// Local library of pre-formulated appreciation phrases with guaranteed male/female perfection
interface PhrasePresetCategory {
  id: string;
  title: string;
  icon: string;
  description: string;
  maleAppreciation: string;
  femaleAppreciation: string;
  maleIntro: string;
  femaleIntro: string;
}

const LOCAL_PHRASE_PRESETS: PhrasePresetCategory[] = [
  {
    id: 'academic-excellence',
    title: 'التفوق الدراسي والأكاديمي',
    icon: '🎓',
    description: 'صياغة ممتازة لأوائل الطلاب والدرجات المرتفعة',
    maleIntro: 'يسر إدارة المدرسة ومعلموها أن تمنح هذه الشهادة للطالب المتميز:',
    femaleIntro: 'يسر إدارة المدرسة ومعلموها أن تمنح هذه الشهادة للطالبة المتميزة:',
    maleAppreciation: 'تقديراً لجهوده المتميزة وتفوقه الدراسي المشهود وحصوله على الدرجات العالية خلال العام الدراسي، متمنين له دوام التألق والنجاح في مسيرته العلمية المباركة.',
    femaleAppreciation: 'تقديراً لجهودها المتميزة وتفوقها الدراسي المشهود وحصولها على الدرجات العالية خلال العام الدراسي، متمنين لها دوام التألق والنجاح في مسيرتها العلمية المباركة.'
  },
  {
    id: 'quran-memorization',
    title: 'حفظ وتلاوة القرآن الكريم',
    icon: '📖',
    description: 'لحلقات القرآن ومسابقات التلاوة والتجويد',
    maleIntro: 'تتشرف إدارة مجمع القرآن الكريم بمنح شهادة الإتقان للطالب الحافظ:',
    femaleIntro: 'تتشرف إدارة مجمع القرآن الكريم بمنح شهادة الإتقان للطالبة الحافظة:',
    maleAppreciation: 'تقديراً لحرصه ومواظبته على حفظ وتلاوة كتاب الله الكريم وإتقان أحكام التجويد، سائلين المولى عز وجل أن يجعله من أهل القرآن وخاصته وأن ينفع به والديه ووطنه.',
    femaleAppreciation: 'تقديراً لحرصها ومواظبتها على حفظ وتلاوة كتاب الله الكريم وإتقان أحكام التجويد، سائلين المولى عز وجل أن يجعلها من أهل القرآن وخاصتها وأن ينفع بها والديها ووطنها.'
  },
  {
    id: 'good-conduct',
    title: 'السلوك والمواظبة والانضباط',
    icon: '⭐',
    description: 'للخلق الرفيع والانضباط اليومي والقدوة الحسنة',
    maleIntro: 'تمنح إدارة المدرسة شهادة وسام السلوك والانضباط للطالب الخلوق:',
    femaleIntro: 'تمنح إدارة المدرسة شهادة وسام السلوك والانضباط للطالبة الخلوقة:',
    maleAppreciation: 'نظير خلقه الرفيع وانضباطه المثالي وتعامله الراقي مع معلميه وزملائه، ليكون نموذجاً يُحتذى به وقدوة مباركة بين أقرانه طوال الفصل الدراسي.',
    femaleAppreciation: 'نظير خلقها الرفيع وانضباطها المثالي وتعاملها الراقي مع معلماتها وزميلاتها، لتكون نموذجاً يُحتذى به وقدوة مباركة بين قريناتها طوال الفصل الدراسي.'
  },
  {
    id: 'creativity-innovation',
    title: 'الموهبة والابتكار والمشاريع',
    icon: '💡',
    description: 'للمعارض العلمية، الروبوت، الموهوبين والأفكار الرائدة',
    maleIntro: 'تمنح جائزة التميز والإبداع المعرفي للمبتكر الواعد:',
    femaleIntro: 'تمنح جائزة التميز والإبداع المعرفي للمبتكرة الواعدة:',
    maleAppreciation: 'إشادة بإبداعه الفريد وشغفه المعرفي وإنجازه الملموس في المشاريع والابتكارات، متمنين له مستقبلاً زاهراً في ميادين العطاء والاختراع.',
    femaleAppreciation: 'إشادة بإبداعها الفريد وشغفها المعرفي وإنجازها الملموس في المشاريع والابتكارات، متمنين لها مستقبلاً زاهراً في ميادين العطاء والاختراع.'
  },
  {
    id: 'activity-sports',
    title: 'الأنشطة المدرسية والرياضية',
    icon: '🏆',
    description: 'للإذاعة المدرسية، المسابقات الرياضية والأنشطة الطلابية',
    maleIntro: 'تمنح هذه الشهادة التقديرية للبطل الرياضي والمشارك الفاعل:',
    femaleIntro: 'تمنح هذه الشهادة التقديرية للبطلة الرياضية والمشاركة الفاعلة:',
    maleAppreciation: 'تقديراً لمشاركته الحيوية الفاعلة وتألقه الاستثنائي في الأنشطة والبرامج المدرسية وتمتعه بالروح الرياضية العالية والمبادرة المستمرة.',
    femaleAppreciation: 'تقديراً لمشاركتها الحيوية الفاعلة وتألقها الاستثنائي في الأنشطة والبرامج المدرسية وتمتعها بالروح الرياضية العالية والمبادرة المستمرة.'
  },
  {
    id: 'general-appreciation',
    title: 'شكر وتقدير عام وتحفيز',
    icon: '✨',
    description: 'صيغة شكر شاملة مرنة تناسب جميع المجالات والمناسبات',
    maleIntro: 'تتقدم إدارة المدرسة بوافر الشكر والتقدير والاعتزاز للطالب المجتهد:',
    femaleIntro: 'تتقدم إدارة المدرسة بوافر الشكر والتقدير والاعتزاز للطالبة المجتهدة:',
    maleAppreciation: 'شكراً وعرفاناً لجهوده الطيبة ومساعيه الدؤوبة في تحقيق التميز والنجاح، سائلين الله له مستقبلاً مشرقاً مكللاً بالتوفيق والسداد.',
    femaleAppreciation: 'شكراً وعرفاناً لجهودها الطيبة ومساعيها الدؤوبة في تحقيق التميز والنجاح، سائلة الله لها مستقبلاً مشرقاً مكللاً بالتوفيق والسداد.'
  }
];

export const BatchConfirmReviewModal: React.FC<BatchConfirmReviewModalProps> = ({
  isOpen,
  onClose,
  students: initialStudents,
  batchTitle,
  grade,
  subject,
  schoolName,
  templateName,
  initialAppreciation,
  onConfirmAndGenerate,
  onShowToast
}) => {
  // Local state of students being reviewed
  const [studentList, setStudentList] = useState<BatchReviewStudentItem[]>(initialStudents);
  const [activeTab, setActiveTab] = useState<'review' | 'phrasing' | 'suggestions'>('review');
  const [newStudentNameInput, setNewStudentNameInput] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>('all');

  // Phrasing configuration
  const [maleAppreciation, setMaleAppreciation] = useState<string>(() => {
    if (initialAppreciation && initialAppreciation.trim()) {
      return convertArabicTextGender(initialAppreciation, 'male');
    }
    return LOCAL_PHRASE_PRESETS[0].maleAppreciation;
  });

  const [femaleAppreciation, setFemaleAppreciation] = useState<string>(() => {
    if (initialAppreciation && initialAppreciation.trim()) {
      return convertArabicTextGender(initialAppreciation, 'female');
    }
    return LOCAL_PHRASE_PRESETS[0].femaleAppreciation;
  });

  const [maleIntro, setMaleIntro] = useState<string>(LOCAL_PHRASE_PRESETS[0].maleIntro);
  const [femaleIntro, setFemaleIntro] = useState<string>(LOCAL_PHRASE_PRESETS[0].femaleIntro);
  const [autoGenderAdaptPhrasing, setAutoGenderAdaptPhrasing] = useState(true);

  // AI Generation state
  const [aiPromptTopic, setAiPromptTopic] = useState(subject || 'التفوق الدراسي العام');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiNotice, setAiNotice] = useState<string | null>(null);

  // Sync state if initialStudents change
  React.useEffect(() => {
    setStudentList(initialStudents);
  }, [initialStudents]);

  // Derived counts
  const totalCount = studentList.length;
  const femaleCount = useMemo(() => studentList.filter(s => s.gender === 'female').length, [studentList]);
  const maleCount = totalCount - femaleCount;

  // Filtered view of students
  const filteredStudents = useMemo(() => {
    return studentList.filter(s => {
      if (genderFilter !== 'all' && s.gender !== genderFilter) return false;
      if (searchFilter.trim()) {
        const q = searchFilter.toLowerCase().trim();
        return s.name.toLowerCase().includes(q) || (s.grade && s.grade.toLowerCase().includes(q));
      }
      return true;
    });
  }, [studentList, genderFilter, searchFilter]);

  if (!isOpen) return null;

  // Toggle gender of individual student
  const toggleStudentGender = (id: string) => {
    setStudentList(prev =>
      prev.map(s => {
        if (s.id === id) {
          const nextGender = s.gender === 'female' ? 'male' : 'female';
          return { ...s, gender: nextGender };
        }
        return s;
      })
    );
  };

  // Set all students to male or female
  const setAllGenders = (targetGender: 'male' | 'female') => {
    setStudentList(prev => prev.map(s => ({ ...s, gender: targetGender })));
    onShowToast(`تم تعيين جنس جميع الطلاب (${totalCount}) إلى: ${targetGender === 'female' ? 'طالبات 👧' : 'طلاب 👦'}`);
  };

  // Re-run automatic name detection on all students
  const autoDetectAllGenders = () => {
    setStudentList(prev =>
      prev.map(s => ({
        ...s,
        gender: detectGenderFromName(s.name)
      }))
    );
    onShowToast('تمت إعادة الكشف الذكي التلقائي عن جنس الطلاب بنجاح ✨');
  };

  // Remove a student from batch
  const removeStudent = (id: string) => {
    setStudentList(prev => prev.filter(s => s.id !== id));
  };

  // Add a quick student
  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentNameInput.trim()) return;
    const name = newStudentNameInput.trim();
    const detected = detectGenderFromName(name);
    const newStudent: BatchReviewStudentItem = {
      id: `rev-st-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name,
      gender: detected,
      grade: grade || 'الصف الدراسي'
    };
    setStudentList(prev => [...prev, newStudent]);
    setNewStudentNameInput('');
    onShowToast(`تمت إضافة "${name}" (${detected === 'female' ? 'طالبة 👧' : 'طالب 👦'}) إلى الدفعة`);
  };

  // Apply a preset from the local bank
  const handleApplyPreset = (preset: PhrasePresetCategory) => {
    setMaleAppreciation(preset.maleAppreciation);
    setFemaleAppreciation(preset.femaleAppreciation);
    setMaleIntro(preset.maleIntro);
    setFemaleIntro(preset.femaleIntro);
    onShowToast(`تم تطبيق نموذج "${preset.title}" بصيغتين متطابقتين للمذكر والمؤنث بنجاح! ✨`);
    setActiveTab('phrasing');
  };

  // Generate dual phrasing with AI or deterministic fallback
  const handleGenerateAiPhrases = async () => {
    setIsGeneratingAi(true);
    setAiNotice('جاري صياغة عبارات التقدير المتطابقة للمذكر والمؤنث بالذكاء الاصطناعي...');

    try {
      const response = await fetch('/api/adapt-gender-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `صغ عبارتين بليغتين لشهادة شكر وتقدير لمجال: ${aiPromptTopic}، واحدة مخصصة للطلاب البنين والأخرى للطالبات البنات مع المحافظة على نفس المعنى والوزن البلاغي.`,
          topic: aiPromptTopic,
          mode: 'dual-generation'
        })
      });

      if (response.ok) {
        const resData = await response.json();
        if (resData.maleText && resData.femaleText) {
          setMaleAppreciation(resData.maleText);
          setFemaleAppreciation(resData.femaleText);
          if (resData.maleIntro) setMaleIntro(resData.maleIntro);
          if (resData.femaleIntro) setFemaleIntro(resData.femaleIntro);
          setAiNotice('تم توليد الصياغات بالذكاء الاصطناعي بنجاح!');
          onShowToast('تم توليد صياغة المذكر والمؤنث بنجاح عبر AI ✨');
          setActiveTab('phrasing');
          return;
        }
      }
      throw new Error('Fallback to local intelligent generation');
    } catch (e) {
      // Local deterministic high-quality phrasing generator
      const baseCategory = LOCAL_PHRASE_PRESETS.find(p => p.id === 'academic-excellence') || LOCAL_PHRASE_PRESETS[0];
      const customTopic = aiPromptTopic.trim() || subject || 'التفوق والتميز';

      const customMale = `تقديراً لجهوده المتميزة وتفوقه المشهود في ${customTopic}، ومساعيه الدؤوبة لتحقيق أرفع الدرجات، متمنين له دوام العطاء والتألق المستمر.`;
      const customFemale = `تقديراً لجهودها المتميزة وتفوقها المشهود في ${customTopic}، ومساعيها الدؤوبة لتحقيق أرفع الدرجات، متمنين لها دوام العطاء والتألق المستمر.`;

      setMaleAppreciation(customMale);
      setFemaleAppreciation(customFemale);
      setAiNotice('تمت صياغة العبارات بالنمط البلاغي الذكي محلياً (جاهزة للاستخدام).');
      onShowToast('تم توليد صيغة التقدير محلياً بنجاح ⚡');
      setActiveTab('phrasing');
    } finally {
      setIsGeneratingAi(false);
      setTimeout(() => setAiNotice(null), 4000);
    }
  };

  const handleFinalConfirm = () => {
    if (studentList.length === 0) {
      onShowToast('لا يوجد طلاب في الدفعة لتوليد الشهادات!');
      return;
    }

    onConfirmAndGenerate({
      students: studentList,
      maleAppreciationText: maleAppreciation,
      femaleAppreciationText: femaleAppreciation,
      maleIntroText: maleIntro,
      femaleIntroText: femaleIntro,
      autoGenderAdaptPhrasing
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/90 rounded-3xl w-full max-w-5xl h-[94vh] max-h-[880px] shadow-2xl flex flex-col overflow-hidden text-slate-100 font-['Cairo',sans-serif]">
        
        {/* Top Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-white">
                  مراجعة وتأكيد الدفعة وتحديد الصياغة للمذكر والمؤنث
                </h2>
                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-0.5 rounded-full text-xs font-bold font-mono">
                  {totalCount} شهادة جاهزة
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                تأكد من دقة جنس الطلاب (طالب 👦 / طالبة 👧) وضبط نص التقدير المخصص للمذكر والمؤنث قبل التوليد النهائي.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer shrink-0"
            title="إلغاء وإغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Batch Summary Bar */}
        <div className="px-4 py-3 bg-slate-950/70 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 text-slate-300 font-bold">
              <span>الدفعة:</span>
              <strong className="text-amber-300">{batchTitle || 'دفعة بدون عنوان'}</strong>
            </div>

            <span className="text-slate-600">•</span>

            <div className="flex items-center gap-1 text-slate-300">
              <span>القالب:</span>
              <span className="text-white font-mono bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700">
                {templateName}
              </span>
            </div>

            <span className="text-slate-600">•</span>

            {/* Gender breakdown badges */}
            <div className="flex items-center gap-1.5">
              <span className="bg-sky-950/80 text-sky-300 border border-sky-500/40 px-2 py-0.5 rounded-lg font-bold flex items-center gap-1 font-mono">
                👦 بنين: {maleCount}
              </span>
              <span className="bg-rose-950/80 text-rose-300 border border-rose-500/40 px-2 py-0.5 rounded-lg font-bold flex items-center gap-1 font-mono">
                👧 بنات: {femaleCount}
              </span>
            </div>
          </div>

          {/* Tab buttons */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setActiveTab('review')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'review'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>مراجعة الطلاب ({totalCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('phrasing')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'phrasing'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>صياغة المذكر والمؤنث 👦👧</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('suggestions')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'suggestions'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              <span>نماذج جاهزة و AI ✨</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Review & Gender Toggling Table */}
        {activeTab === 'review' && (
          <div className="flex-1 flex flex-col overflow-hidden p-3 sm:p-5 space-y-3">
            
            {/* Quick Actions & Filters Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0 bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
              
              {/* Search input */}
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="ابحث عن اسم طالب في القائمة..."
                  className="w-full pl-3 pr-3 py-1.5 bg-slate-900 border border-slate-700 text-xs rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
                {searchFilter && (
                  <button
                    type="button"
                    onClick={() => setSearchFilter('')}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Gender Filter Buttons */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setGenderFilter('all')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                    genderFilter === 'all' ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  الكل ({totalCount})
                </button>
                <button
                  type="button"
                  onClick={() => setGenderFilter('male')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                    genderFilter === 'male' ? 'bg-sky-500 text-slate-950 font-black' : 'bg-slate-900 text-sky-400 hover:text-white border border-slate-800'
                  }`}
                >
                  بنين ({maleCount})
                </button>
                <button
                  type="button"
                  onClick={() => setGenderFilter('female')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                    genderFilter === 'female' ? 'bg-rose-500 text-slate-950 font-black' : 'bg-slate-900 text-rose-400 hover:text-white border border-slate-800'
                  }`}
                >
                  بنات ({femaleCount})
                </button>
              </div>

              {/* Bulk Quick Toggles */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={autoDetectAllGenders}
                  className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  title="إعادة التحديد التلقائي لكامل القائمة"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                  <span>تحديد تلقائي ذكي</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAllGenders('male')}
                  className="px-2 py-1.5 bg-slate-900 hover:bg-sky-950/60 text-sky-300 border border-slate-800 hover:border-sky-500/30 rounded-xl text-xs font-bold transition cursor-pointer"
                  title="تحويل كافة الطلاب في هذه الدفعة إلى بنين"
                >
                  الكل بنين 👦
                </button>

                <button
                  type="button"
                  onClick={() => setAllGenders('female')}
                  className="px-2 py-1.5 bg-slate-900 hover:bg-rose-950/60 text-rose-300 border border-slate-800 hover:border-rose-500/30 rounded-xl text-xs font-bold transition cursor-pointer"
                  title="تحويل كافة الطلاب في هذه الدفعة إلى بنات"
                >
                  الكل بنات 👧
                </button>
              </div>
            </div>

            {/* Students Table / Grid */}
            <div className="flex-1 overflow-y-auto border border-slate-800 rounded-2xl bg-slate-950/40 divide-y divide-slate-800/80">
              {filteredStudents.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  لا توجد نتائج مطابقة لبحثك.
                </div>
              ) : (
                filteredStudents.map((student, idx) => {
                  const isFemale = student.gender === 'female';
                  const appreciationPreview = isFemale ? femaleAppreciation : maleAppreciation;
                  const introPreview = isFemale ? femaleIntro : maleIntro;

                  return (
                    <div
                      key={student.id}
                      className="p-2.5 sm:p-3 flex items-center justify-between gap-3 hover:bg-slate-900/60 transition group"
                    >
                      {/* Left: Row Number & Name */}
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <span className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 text-xs font-mono font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>

                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs sm:text-sm font-extrabold text-white">
                              {student.name}
                            </span>
                            {student.grade && (
                              <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded border border-slate-700">
                                {student.grade}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 truncate max-w-md">
                            <span className="text-amber-400/80 font-bold">{introPreview}</span> {appreciationPreview.replace(/{الاسم}/g, student.name)}
                          </p>
                        </div>
                      </div>

                      {/* Right: Gender Badge & 1-Click Switch Button */}
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Gender Toggle Button */}
                        <button
                          type="button"
                          onClick={() => toggleStudentGender(student.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-xs border ${
                            isFemale
                              ? 'bg-rose-950/80 hover:bg-rose-900 text-rose-200 border-rose-500/50 hover:border-rose-400 ring-1 ring-rose-500/20'
                              : 'bg-sky-950/80 hover:bg-sky-900 text-sky-200 border-sky-500/50 hover:border-sky-400 ring-1 ring-sky-500/20'
                          }`}
                          title="اضغط هنا للتبديل بين طالب وطالبة بسهولة وبنقرة واحدة"
                        >
                          <span className="text-sm">{isFemale ? '👧' : '👦'}</span>
                          <span>{isFemale ? 'طالبة (مؤنث)' : 'طالب (مذكر)'}</span>
                          <span className="text-[10px] text-slate-400 mr-1 bg-slate-900/80 px-1 py-0.2 rounded">
                            تبديل ⇄
                          </span>
                        </button>

                        {/* Remove Student */}
                        <button
                          type="button"
                          onClick={() => removeStudent(student.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-900 rounded-lg transition cursor-pointer"
                          title="حذف هذا الطالب من الدفعة الحالية"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Quick Add Student Input at bottom of review */}
            <form onSubmit={handleAddStudent} className="flex items-center gap-2 pt-1 shrink-0">
              <input
                type="text"
                value={newStudentNameInput}
                onChange={(e) => setNewStudentNameInput(e.target.value)}
                placeholder="إضافة اسم طالب جديد للدفعة سريعاً (مثال: سارة محمد)..."
                className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 text-xs rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
              <button
                type="submit"
                disabled={!newStudentNameInput.trim()}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs rounded-xl transition border border-slate-700 disabled:opacity-50 cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة اسم</span>
              </button>
            </form>

          </div>
        )}

        {/* Tab 2: Phrasing Dual Editor (Male vs Female) */}
        {activeTab === 'phrasing' && (
          <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4">
            
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3 text-xs text-amber-200 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="font-extrabold text-amber-300 block mb-0.5">
                  الصياغة المستقلة للمذكر والمؤنث:
                </strong>
                سيتم طباعة نص المذكر على شهادات الطلاب البنين (👦) ونَص المؤنث على شهادات الطالبات البنات (👧) تلقائياً، لضمان عدم الخلط في الضمائر والألقاب مثل (الطالب/الطالبة، تفوقه/تفوقها، متمنين له/لها).
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Male Phrasing Box 👦 */}
              <div className="bg-slate-950/70 border border-sky-500/40 rounded-2xl p-4 space-y-3 shadow-inner">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">👦</span>
                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-sky-300">
                        صيغة الطلاب البنين (المذكر)
                      </h4>
                      <span className="text-[10px] text-slate-400">ستُطبق على ({maleCount}) طلاب</span>
                    </div>
                  </div>

                  <span className="bg-sky-950 text-sky-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-sky-500/30 font-mono">
                    صيغة المذكر
                  </span>
                </div>

                {/* Intro Line */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300 block">
                    عبارة التقديم والمقدمة (للمذكر):
                  </label>
                  <input
                    type="text"
                    value={maleIntro}
                    onChange={(e) => setMaleIntro(e.target.value)}
                    placeholder="مثال: يسر إدارة المدرسة أن تمنح هذه الشهادة للطالب المتميز:"
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 text-xs rounded-xl text-white placeholder-slate-500 focus:border-sky-400 focus:outline-none"
                  />
                </div>

                {/* Appreciation Text */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-300">
                      نص التقدير والثناء (للمذكر):
                    </label>
                    <span className="text-[10px] text-slate-500 font-mono">يمكنك استخدام {'{الاسم}'}</span>
                  </div>
                  <textarea
                    rows={4}
                    value={maleAppreciation}
                    onChange={(e) => setMaleAppreciation(e.target.value)}
                    placeholder="اكتب عبارة التقدير الخاصة بالبنين..."
                    className="w-full p-3 bg-slate-900 border border-slate-700 text-xs rounded-xl text-white placeholder-slate-500 focus:border-sky-400 focus:outline-none resize-none leading-relaxed"
                  />
                </div>

                {/* Live Sample Card for Boys */}
                <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 text-[11px] space-y-1">
                  <span className="text-[10px] font-bold text-sky-400 block">معاينة نص الشهادة للولد:</span>
                  <p className="text-slate-200 leading-relaxed font-semibold">
                    "{maleIntro} <span className="text-amber-300 font-bold">محمد عبد الله</span> {maleAppreciation.replace(/{الاسم}/g, 'محمد')}"
                  </p>
                </div>
              </div>

              {/* Female Phrasing Box 👧 */}
              <div className="bg-slate-950/70 border border-rose-500/40 rounded-2xl p-4 space-y-3 shadow-inner">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">👧</span>
                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-rose-300">
                        صيغة الطالبات البنات (المؤنث)
                      </h4>
                      <span className="text-[10px] text-slate-400">ستُطبق على ({femaleCount}) طالبات</span>
                    </div>
                  </div>

                  <span className="bg-rose-950 text-rose-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-rose-500/30 font-mono">
                    صيغة المؤنث
                  </span>
                </div>

                {/* Intro Line */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300 block">
                    عبارة التقديم والمقدمة (للمؤنث):
                  </label>
                  <input
                    type="text"
                    value={femaleIntro}
                    onChange={(e) => setFemaleIntro(e.target.value)}
                    placeholder="مثال: يسر إدارة المدرسة أن تمنح هذه الشهادة للطالبة المتميزة:"
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 text-xs rounded-xl text-white placeholder-slate-500 focus:border-rose-400 focus:outline-none"
                  />
                </div>

                {/* Appreciation Text */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-300">
                      نص التقدير والثناء (للمؤنث):
                    </label>
                    <span className="text-[10px] text-slate-500 font-mono">يمكنك استخدام {'{الاسم}'}</span>
                  </div>
                  <textarea
                    rows={4}
                    value={femaleAppreciation}
                    onChange={(e) => setFemaleAppreciation(e.target.value)}
                    placeholder="اكتب عبارة التقدير الخاصة بالبنات..."
                    className="w-full p-3 bg-slate-900 border border-slate-700 text-xs rounded-xl text-white placeholder-slate-500 focus:border-rose-400 focus:outline-none resize-none leading-relaxed"
                  />
                </div>

                {/* Live Sample Card for Girls */}
                <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 text-[11px] space-y-1">
                  <span className="text-[10px] font-bold text-rose-400 block">معاينة نص الشهادة للبنت:</span>
                  <p className="text-slate-200 leading-relaxed font-semibold">
                    "{femaleIntro} <span className="text-amber-300 font-bold">سارة أحمد</span> {femaleAppreciation.replace(/{الاسم}/g, 'سارة')}"
                  </p>
                </div>
              </div>

            </div>

            {/* Smart Gender Auto-adaptation Toggle */}
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <span className="text-xs font-black text-white block">
                    تأنيث وتذكير الأوسمة والألقاب آلياً لكل شهادة
                  </span>
                  <span className="text-[10px] text-slate-400">
                    تلقائياً (طالب متفوق 👦 / طالبة متفوقة 👧، حفظه 👦 / حفظها 👧)
                  </span>
                </div>
              </div>

              <input
                type="checkbox"
                checked={autoGenderAdaptPhrasing}
                onChange={(e) => setAutoGenderAdaptPhrasing(e.target.checked)}
                className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
              />
            </div>

          </div>
        )}

        {/* Tab 3: Local Library of Presets & AI Generator */}
        {activeTab === 'suggestions' && (
          <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4">
            
            {/* AI Generator Box */}
            <div className="p-4 bg-gradient-to-r from-amber-950/40 via-slate-900 to-amber-950/30 border border-amber-500/50 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
                  <h4 className="text-xs sm:text-sm font-black text-amber-300">
                    صياغة ذكية بالذكاء الاصطناعي (AI Dual Generator)
                  </h4>
                </div>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-bold">
                  توليد ثنائي متطابق
                </span>
              </div>

              <p className="text-xs text-slate-300">
                اكتب مجال التكريم أو المناسبة وسيقوم الذكاء الاصطناعي (أو المحرك البلاغي المحلي) بصياغة عبادتين متطابقتين للمذكر والمؤنث فوراً:
              </p>

              <div className="flex items-center gap-2 flex-col sm:flex-row">
                <input
                  type="text"
                  value={aiPromptTopic}
                  onChange={(e) => setAiPromptTopic(e.target.value)}
                  placeholder="مثال: التفوق في الرياضيات، حفظ جزء عم، أولمبياد الروبوت..."
                  className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 text-xs rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 w-full"
                />
                <button
                  type="button"
                  onClick={handleGenerateAiPhrases}
                  disabled={isGeneratingAi || !aiPromptTopic.trim()}
                  className="w-full sm:w-auto px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 active:scale-95 text-slate-950 font-black text-xs rounded-xl shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>{isGeneratingAi ? 'جاري الصياغة...' : 'توليد صياغة المذكر والمؤنث ✨'}</span>
                </button>
              </div>

              {aiNotice && (
                <div className="text-xs text-amber-300 font-bold bg-slate-950/80 p-2 rounded-xl border border-amber-500/30 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{aiNotice}</span>
                </div>
              )}
            </div>

            {/* Local Presets Bank Header */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <BookMarked className="w-4 h-4 text-sky-400" />
                <h4 className="text-xs sm:text-sm font-black text-white">
                  بنك النماذج والصياغات الجاهزة (محلية وبدون إنترنت)
                </h4>
              </div>
              <span className="text-xs text-slate-400">
                {LOCAL_PHRASE_PRESETS.length} تصنيفات متكاملة
              </span>
            </div>

            {/* Presets Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {LOCAL_PHRASE_PRESETS.map((preset) => (
                <div
                  key={preset.id}
                  className="bg-slate-950/80 border border-slate-800 hover:border-amber-500/50 rounded-2xl p-3.5 space-y-2.5 transition flex flex-col justify-between group"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{preset.icon}</span>
                        <h5 className="text-xs font-black text-white group-hover:text-amber-300 transition">
                          {preset.title}
                        </h5>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      {preset.description}
                    </p>

                    <div className="p-2 bg-slate-900/90 rounded-xl border border-slate-800 text-[10px] space-y-1">
                      <div className="text-sky-300">
                        <strong>👦 مذكر:</strong> "{preset.maleAppreciation.substring(0, 65)}..."
                      </div>
                      <div className="text-rose-300">
                        <strong>👧 مؤنث:</strong> "{preset.femaleAppreciation.substring(0, 65)}..."
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleApplyPreset(preset)}
                    className="w-full py-2 bg-slate-900 hover:bg-amber-500 hover:text-slate-950 text-slate-200 font-extrabold text-xs rounded-xl border border-slate-800 hover:border-amber-400 transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>تطبيق هذا النموذج للدفعة</span>
                  </button>
                </div>
              ))}
            </div>

          </div>
        )}

        {/* Modal Footer with Final Trigger */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>إجمالي الدفعة المراد توليدها:</span>
            <strong className="text-amber-300 font-mono font-bold text-sm">
              {totalCount} شهادة
            </strong>
            <span>({maleCount} بنين • {femaleCount} بنات)</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition cursor-pointer"
            >
              إلغاء
            </button>

            <button
              type="button"
              onClick={handleFinalConfirm}
              disabled={totalCount === 0}
              className="flex-1 sm:flex-none px-6 py-2.5 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:brightness-110 active:scale-95 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Zap className="w-4 h-4 fill-slate-950" />
              <span>تأكيد وتوليد الدفعة والطباعة 🚀</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
