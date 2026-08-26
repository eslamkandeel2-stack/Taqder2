import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  X,
  Search,
  Check,
  Copy,
  Crown,
  BookOpen,
  Feather,
  Cpu,
  ShieldCheck,
  Award,
  Smile,
  Heart,
  Flame,
  GraduationCap,
  Globe,
  ArrowRight,
  RefreshCw,
  SlidersHorizontal,
  Bot,
  Quote,
  CheckCircle2,
  BookmarkPlus
} from 'lucide-react';
import { CertificateData } from '../types';
import { RecipientGender } from '../utils/genderConverter';
import {
  APPRECIATION_LIBRARY,
  APPRECIATION_CATEGORIES,
  AppreciationSuggestionItem,
  SuggestionCategory,
  SuggestionTone
} from '../data/appreciationLibrary';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  certificateData: CertificateData;
  onApplyAppreciation: (updates: Partial<CertificateData>) => void;
  onOpenAiGenerator?: () => void;
}

export const AppreciationSuggestionsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  certificateData,
  onApplyAppreciation,
  onOpenAiGenerator,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<SuggestionCategory | 'all'>('all');
  const [selectedTone, setSelectedTone] = useState<SuggestionTone | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeGender, setActiveGender] = useState<RecipientGender>(
    certificateData.recipientGender || 'male'
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [appliedId, setAppliedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Helper icon renderer for categories
  const renderCategoryIcon = (catId: SuggestionCategory) => {
    switch (catId) {
      case 'academic_excellence': return <Crown className="w-4 h-4" />;
      case 'math_science': return <Cpu className="w-4 h-4" />;
      case 'arabic_literature': return <Feather className="w-4 h-4" />;
      case 'quran_islamic': return <BookOpen className="w-4 h-4" />;
      case 'discipline_behavior': return <ShieldCheck className="w-4 h-4" />;
      case 'talent_creativity': return <Sparkles className="w-4 h-4" />;
      case 'sports_activities': return <Award className="w-4 h-4" />;
      case 'kindergarten_elementary': return <Smile className="w-4 h-4" />;
      case 'graduation_honors': return <GraduationCap className="w-4 h-4" />;
      case 'english_languages': return <Globe className="w-4 h-4" />;
      case 'teachers_parents': return <Heart className="w-4 h-4" />;
      case 'leadership_volunteering': return <Flame className="w-4 h-4" />;
      default: return <Sparkles className="w-4 h-4" />;
    }
  };

  // Filter items
  const filteredItems = useMemo(() => {
    return APPRECIATION_LIBRARY.filter((item) => {
      // Category check
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }
      // Tone check
      if (selectedTone !== 'all' && item.tone !== selectedTone) {
        return false;
      }
      // Search query check
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const textToSearch = `
          ${item.name} 
          ${item.description} 
          ${item.title} 
          ${item.appreciationText.male} 
          ${item.appreciationText.female} 
          ${item.recipientIntro.male} 
          ${item.recipientIntro.female} 
          ${item.tags.join(' ')}
        `.toLowerCase();
        if (!textToSearch.includes(q)) return false;
      }
      return true;
    });
  }, [selectedCategory, selectedTone, searchQuery]);

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast('تم نسخ النص إلى الحافظة بنجاح! 📋');
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Apply complete preset to the certificate
  const handleApplyFullPreset = (item: AppreciationSuggestionItem) => {
    const isFemale = activeGender === 'female';
    const intro = isFemale ? item.recipientIntro.female : item.recipientIntro.male;
    const appreciation = isFemale ? item.appreciationText.female : item.appreciationText.male;
    const poem = item.poemOrQuote ? (isFemale ? item.poemOrQuote.female : item.poemOrQuote.male) : undefined;
    const badge = isFemale ? item.badgeTitle.female : item.badgeTitle.male;

    onApplyAppreciation({
      recipientGender: activeGender,
      title: item.title || certificateData.title,
      subtitle: item.subtitle || certificateData.subtitle,
      recipientIntro: intro,
      appreciationText: appreciation,
      ...(poem ? { poemOrQuote: poem, showPoemOrQuote: true } : {}),
      badgeTitle: badge,
      updatedAt: new Date().toISOString(),
    });

    setAppliedId(item.id);
    showToast(`تم تطبيق صياغة "${item.name}" بالكامل على الشهادة بنجاح! 🚀`);
    setTimeout(() => setAppliedId(null), 2500);
  };

  // Apply only the appreciation body text
  const handleApplyOnlyAppreciation = (item: AppreciationSuggestionItem) => {
    const isFemale = activeGender === 'female';
    const appreciation = isFemale ? item.appreciationText.female : item.appreciationText.male;

    onApplyAppreciation({
      recipientGender: activeGender,
      appreciationText: appreciation,
      updatedAt: new Date().toISOString(),
    });

    setAppliedId(item.id);
    showToast('تم تحديث وتطبيق عبارة التقدير والشكر على الشهادة! ✨');
    setTimeout(() => setAppliedId(null), 2500);
  };

  if (!isOpen) return null;

  return (
    <div
      id="appreciation-suggestions-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-fade-in"
      dir="rtl"
    >
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-slate-900 border border-slate-700/80 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950/70 border-b border-slate-700/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-950/50 text-slate-950 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white">
                  بنك الصياغات والنصوص التقديرية الراقية
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 border border-amber-400/40 text-amber-300">
                  صيغ مجهزة وبلاغة فصحى ✨
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                مكتبة نصوص شكر وتقدير متكاملة مصنفة حسب المواد والمناسبات والنبرات البلاغية.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenAiGenerator && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAiGenerator();
                }}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 rounded-xl text-xs font-bold transition cursor-pointer"
                title="توليد عبارات مخصصة بالذكاء الاصطناعي"
              >
                <Bot className="w-3.5 h-3.5 text-indigo-400" />
                <span>صياغة بالذكاء الاصطناعي 🤖</span>
              </button>
            )}

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
              className="text-emerald-300 hover:text-white text-xs font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Filter & Search Bar */}
        <div className="p-3 sm:p-4 bg-slate-950/60 border-b border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shrink-0">
          
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن مادة، مناسبة، سجع، أو كلمة مفتاحية (مثال: رياضيات، قرآن، انضباط، أطفال)..."
              className="w-full pl-3 pr-9 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Gender Switcher & Tone Selector */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Tone Selector */}
            <select
              value={selectedTone}
              onChange={(e) => setSelectedTone(e.target.value as any)}
              className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-slate-200 focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">كافة النبرات البلاغية (الكل)</option>
              <option value="royal">رسمي وفخم ملكي 👑</option>
              <option value="poetic">مسجوع وأدبي شاعري 🪶</option>
              <option value="enthusiastic">حماسي ومحفز ملهم 🚀</option>
              <option value="islamic">إسلامي وقرآني 📖</option>
              <option value="friendly">لطيف ومحبب للبراعم 🌟</option>
            </select>

            {/* Male / Female Gender Toggle */}
            <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-700">
              <button
                type="button"
                onClick={() => setActiveGender('male')}
                className={`px-3 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
                  activeGender === 'male'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                طالب (مذكر)
              </button>
              <button
                type="button"
                onClick={() => setActiveGender('female')}
                className={`px-3 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
                  activeGender === 'female'
                    ? 'bg-pink-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                طالبة (مؤنث)
              </button>
            </div>
          </div>

        </div>

        {/* Categories Bar */}
        <div className="px-3 sm:px-5 py-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center gap-1.5 overflow-x-auto shrink-0 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer flex items-center gap-1.5 ${
              selectedCategory === 'all'
                ? 'bg-amber-500 text-slate-950 font-black shadow'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>جميع المجالات ({APPRECIATION_LIBRARY.length})</span>
          </button>
          {APPRECIATION_CATEGORIES.map((cat) => {
            const count = APPRECIATION_LIBRARY.filter((i) => i.category === cat.id).length;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer flex items-center gap-1.5 ${
                  selectedCategory === cat.id
                    ? 'bg-amber-500 text-slate-950 font-black shadow'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {renderCategoryIcon(cat.id)}
                <span>{cat.label}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/25">
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* List of Suggestions */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {filteredItems.length === 0 ? (
            <div className="p-12 text-center bg-slate-950/40 border border-slate-800 rounded-2xl space-y-3">
              <Sparkles className="w-10 h-10 text-amber-500 mx-auto opacity-50" />
              <p className="text-sm font-bold text-slate-300">لم يتم العثور على صياغات مطابقة لمعايير البحث</p>
              <p className="text-xs text-slate-500">جرب اختيار تصنيف آخر أو مسح كلمة البحث.</p>
              <button
                onClick={() => {
                  setSelectedCategory('all');
                  setSelectedTone('all');
                  setSearchQuery('');
                }}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-xl text-xs font-bold transition"
              >
                عرض كافة الصياغات المتاحة
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredItems.map((item) => {
                const isFemale = activeGender === 'female';
                const introText = isFemale ? item.recipientIntro.female : item.recipientIntro.male;
                const appreciationText = isFemale ? item.appreciationText.female : item.appreciationText.male;
                const poemText = item.poemOrQuote ? (isFemale ? item.poemOrQuote.female : item.poemOrQuote.male) : null;
                const badgeTitle = isFemale ? item.badgeTitle.female : item.badgeTitle.male;
                const isApplied = appliedId === item.id;

                return (
                  <div
                    key={item.id}
                    className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col justify-between gap-4 ${
                      isApplied
                        ? 'bg-amber-950/20 border-amber-500 ring-2 ring-amber-500/50'
                        : 'bg-slate-800/80 border-slate-700 hover:border-amber-500/70 shadow-lg'
                    }`}
                  >
                    {/* Item Top Metadata */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                          {renderCategoryIcon(item.category)}
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-white">{item.name}</h4>
                          <p className="text-[11px] text-slate-400">{item.description}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          {item.toneLabel}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-900 text-slate-300 border border-slate-700">
                          {item.categoryName}
                        </span>
                      </div>
                    </div>

                    {/* Preview Content Box */}
                    <div className="p-3.5 bg-slate-950/70 border border-slate-800/90 rounded-xl space-y-2.5 font-sans">
                      
                      {/* Recipient Intro Line */}
                      <div className="text-xs font-bold text-amber-300/90 flex items-start gap-1.5">
                        <span className="shrink-0 text-amber-500">🎗️</span>
                        <span>{introText}</span>
                      </div>

                      {/* Main Appreciation Paragraph */}
                      <div className="text-xs sm:text-sm text-slate-100 font-medium leading-relaxed bg-slate-900/60 p-3 rounded-lg border border-slate-800/60">
                        {appreciationText}
                      </div>

                      {/* Poem / Quote if available */}
                      {poemText && (
                        <div className="text-xs text-amber-200/90 font-serif italic bg-amber-950/20 p-2.5 rounded-lg border border-amber-800/30 flex items-center gap-2">
                          <Quote className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>{poemText}</span>
                        </div>
                      )}

                      {/* Badge / Tag Info */}
                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
                        <span className="flex items-center gap-1 text-slate-300 font-bold">
                          <Award className="w-3.5 h-3.5 text-amber-400" />
                          <span>شارة التكريم: {badgeTitle}</span>
                        </span>
                        <div className="flex items-center gap-1">
                          {item.tags.slice(0, 3).map((tag, tIdx) => (
                            <span key={tIdx} className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>

                    </div>

                    {/* Actions Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-700/60">
                      
                      {/* Copy Buttons */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleCopyText(appreciationText, `text-${item.id}`)}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                          title="نسخ فقرة التقدير والشكر فقط"
                        >
                          {copiedId === `text-${item.id}` ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span>تم النسخ</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>نسخ النص</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Apply to Certificate Buttons */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleApplyOnlyAppreciation(item)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold transition cursor-pointer"
                          title="تطبيق فقرة التقدير والثناء فقط على الشهادة"
                        >
                          تطبيق نص التقدير فقط
                        </button>

                        <button
                          type="button"
                          onClick={() => handleApplyFullPreset(item)}
                          className="px-4 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 rounded-xl text-xs font-black shadow transition flex items-center gap-1 cursor-pointer"
                          title="تطبيق كامل الصياغة (المقدمة، النص، بيت الشعر، والوسام) على الشهادة الحالية"
                        >
                          <BookmarkPlus className="w-3.5 h-3.5" />
                          <span>تطبيق الصياغة كاملة 🚀</span>
                        </button>
                      </div>

                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-400">
            تتم مواءمة النصوص تلقائياً مع الضمائر وصيغ <strong className="text-amber-400">{activeGender === 'female' ? 'المؤنث' : 'المذكر'}</strong>.
          </span>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
};
