import React, { useState } from 'react';
import { TEMPLATE_PRESETS } from '../data/templates';
import { TemplatePreset, CertificateData } from '../types';
import {
  LayoutGrid,
  Search,
  Check,
  Sparkles,
  X,
  Eye,
  Award,
  SlidersHorizontal,
  Star,
  CheckCircle2,
  Copy,
  Sliders,
  BookmarkPlus,
  Palette,
  FileText
} from 'lucide-react';
import { saveCurrentCertificateAsDefaultSettings } from '../utils/defaultSettings';
import { ApplyTemplateChoiceModal } from './ApplyTemplateChoiceModal';
import { CustomTemplatesManagerModal } from './CustomTemplatesManagerModal';
import {
  CustomTemplateItem,
  TemplateApplyMode,
  duplicateAndCustomizeTemplate
} from '../utils/templateCustomizer';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (
    template: TemplatePreset | CustomTemplateItem,
    mode?: TemplateApplyMode
  ) => void;
  currentTemplateId?: string;
  currentCertificate: CertificateData;
  onShowToast?: (msg: string) => void;
}

export const TemplateGalleryModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSelectTemplate,
  currentTemplateId,
  currentCertificate,
  onShowToast
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('الكل');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [previewTemplate, setPreviewTemplate] = useState<TemplatePreset | null>(null);
  const [savedDefaultId, setSavedDefaultId] = useState<string | null>(null);

  // Template Selection & Choice Modal State
  const [pendingChoiceTemplate, setPendingChoiceTemplate] = useState<TemplatePreset | CustomTemplateItem | null>(null);
  const [isChoiceModalOpen, setIsChoiceModalOpen] = useState(false);
  const [isCustomTemplatesModalOpen, setIsCustomTemplatesModalOpen] = useState(false);

  const handleSaveAsSystemDefault = (tmpl: TemplatePreset, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const certObj: CertificateData = {
      id: `template-${tmpl.id}`,
      verificationCode: `TMPL-${tmpl.id}`,
      ...tmpl.defaultData
    } as CertificateData;
    saveCurrentCertificateAsDefaultSettings(certObj);
    setSavedDefaultId(tmpl.id);
    const msg = `تم حفظ قالب "${tmpl.name}" كإعدادات افتراضية للنظام بنجاح! ⭐💾`;
    if (onShowToast) {
      onShowToast(msg);
    }
    setTimeout(() => {
      setSavedDefaultId(null);
    }, 3500);
  };

  const handleTriggerTemplateSelection = (tmpl: TemplatePreset) => {
    setPendingChoiceTemplate(tmpl);
    setIsChoiceModalOpen(true);
  };

  const handleConfirmChoice = (
    template: TemplatePreset | CustomTemplateItem,
    mode: TemplateApplyMode
  ) => {
    onSelectTemplate(template, mode);
    setIsChoiceModalOpen(false);
    setPendingChoiceTemplate(null);
    onClose();
  };

  const handleDuplicateFromChoice = (template: TemplatePreset | CustomTemplateItem) => {
    const duplicated = duplicateAndCustomizeTemplate(template);
    if (onShowToast) {
      onShowToast(`تم إنشاء وتخصيص نسخة قابلة للتعديل من قالب "${template.name}" بنجاح! 📋✨`);
    }
    setIsChoiceModalOpen(false);
    setPendingChoiceTemplate(null);
    setIsCustomTemplatesModalOpen(true);
  };

  if (!isOpen) return null;

  const categories = [
    'الكل',
    'تفوق دراسي',
    'تدريب وتطوير',
    'تحفيظ القرآن',
    'أطفال وروضة',
    'تقنية وعلوم',
    'رياضية وفنون',
    'تميز وطني ومجتمعي'
  ];

  const filteredTemplates = TEMPLATE_PRESETS.filter((tmpl) => {
    const matchesCategory =
      selectedCategory === 'الكل' ||
      tmpl.category === selectedCategory ||
      (selectedCategory === 'تقنية وعلوم' && (tmpl.category === 'تقنية وعلوم' || tmpl.id === 'cyber-tech-ai' || tmpl.id === 'science-tech')) ||
      (selectedCategory === 'رياضية وفنون' && (tmpl.category === 'رياضة وصحة' || tmpl.category === 'فنون وموهبة' || tmpl.id === 'sports-championship')) ||
      (selectedCategory === 'تميز وطني ومجتمعي' && (tmpl.category === 'تطوع ومجتمع' || tmpl.category === 'تكريم وتقدير'));

    const matchesSearch =
      searchQuery.trim() === '' ||
      tmpl.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tmpl.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tmpl.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tmpl.defaultData.title.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-3 sm:p-6 text-right font-['Cairo',sans-serif]">
      <div className="bg-white w-full max-w-6xl h-[90vh] rounded-3xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Gallery Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shadow-inner">
              <LayoutGrid className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-amber-400 flex items-center gap-2">
                <span>معرض القوالب الاحترافية في شبكة معاينة الشهادات</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-sans">
                  {TEMPLATE_PRESETS.length} قالب مجهّز
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                استعرض شكل الشهادة النهائي والزخارف والألوان مع إمكانية تطبيق التنسيق فقط أو القالب كاملاً
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCustomTemplatesModalOpen(true)}
              className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <BookmarkPlus className="w-4 h-4" />
              <span>إدارة قوالبي المخصصة</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-slate-50 border-b border-slate-200 p-4 space-y-3 shrink-0">
          <div className="flex flex-col sm:flex-row items-center gap-3 justify-between">
            {/* Category Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full sm:w-auto pb-1 sm:pb-0">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-amber-500 text-slate-950 shadow-xs ring-1 ring-amber-400 font-black'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-72 shrink-0">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="البحث في القوالب والمناسبات..."
                className="w-full pr-9 pl-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 shadow-2xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Grid Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/70">
          {filteredTemplates.length === 0 ? (
            <div className="py-20 text-center space-y-3">
              <Search className="w-12 h-12 text-slate-300 mx-auto" />
              <h4 className="text-sm font-bold text-slate-700">لم يتم العثور على قوالب تطابق نتيجة البحث</h4>
              <p className="text-xs text-slate-500">جرب البحث بكلمات أخرى أو تغيير الفئة المختارة</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredTemplates.map((tmpl) => {
                const isCurrent = currentTemplateId === tmpl.id;
                const d = tmpl.defaultData;

                return (
                  <div
                    key={tmpl.id}
                    className={`group bg-white rounded-2xl border transition-all duration-200 shadow-sm hover:shadow-xl flex flex-col overflow-hidden relative ${
                      isCurrent
                        ? 'border-amber-500 ring-2 ring-amber-400/50 shadow-md'
                        : 'border-slate-200 hover:border-amber-400'
                    }`}
                  >
                    {/* Top Category Badge & Current Indicator */}
                    <div className="px-3.5 py-2.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 text-xs">
                      <span className="font-bold text-amber-300 text-[11px] flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-400" />
                        {tmpl.category}
                      </span>
                      {isCurrent ? (
                        <span className="bg-emerald-500 text-white font-extrabold text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                          <Check className="w-3 h-3" /> القالب النشط
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-mono">A4 أفقي</span>
                      )}
                    </div>

                    {/* MINI CERTIFICATE SHAPE PREVIEW CARD */}
                    <div className="p-3 bg-slate-200/50 flex-1 flex items-center justify-center relative group/preview">
                      <div
                        className="w-full aspect-[1.414] rounded-lg shadow-md relative overflow-hidden flex flex-col justify-between p-3 border transition-transform duration-300 group-hover:scale-[1.02]"
                        style={{
                          backgroundColor: d.backgroundColor || '#ffffff',
                          color: d.textColor || '#0f172a',
                          borderColor: d.primaryColor,
                          borderWidth: '3px',
                          borderStyle: 'double',
                        }}
                      >
                        {/* Certificate Header Banner */}
                        <div className="text-center space-y-0.5">
                          <span
                            className="text-[9px] font-bold block opacity-80"
                            style={{ color: d.secondaryColor || d.primaryColor }}
                          >
                            {d.schoolName}
                          </span>
                          <h5
                            className="text-[12px] font-black leading-tight line-clamp-1"
                            style={{ color: d.primaryColor }}
                          >
                            {d.title}
                          </h5>
                        </div>

                        {/* Middle Content Highlight */}
                        <div className="my-1 text-center py-1.5 px-2 bg-white/70 rounded border border-black/5">
                          <span className="text-[8px] block opacity-70">تُمنح هذه الشهادة إلى:</span>
                          <span
                            className="text-[11px] font-black block mt-0.5 line-clamp-1"
                            style={{ color: d.primaryColor }}
                          >
                            {d.studentName}
                          </span>
                          <span className="text-[8px] block mt-0.5 line-clamp-1 opacity-90" style={{ color: d.textColor }}>
                            {d.appreciationText}
                          </span>
                        </div>

                        {/* Footer Mini Features */}
                        <div className="flex items-center justify-between text-[8px] pt-1 border-t border-black/10">
                          <div className="flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" style={{ backgroundColor: d.primaryColor }} />
                            <span className="font-bold opacity-80" style={{ color: d.primaryColor }}>
                              {d.badgeTitle || 'وسام التميز'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full border flex items-center justify-center text-[7px]" style={{ borderColor: d.secondaryColor, color: d.secondaryColor }}>
                              ختم
                            </div>
                            <div className="w-6 h-1 border-b border-dashed border-slate-400" />
                          </div>
                        </div>
                      </div>

                      {/* Hover Quick Overlay Actions */}
                      <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px] opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center justify-center gap-2 p-3">
                        <button
                          onClick={() => setPreviewTemplate(tmpl)}
                          className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-900 rounded-xl font-bold text-xs shadow-lg flex items-center gap-1 cursor-pointer transition active:scale-95"
                        >
                          <Eye className="w-3.5 h-3.5 text-amber-600" />
                          معاينة تكبير
                        </button>
                        <button
                          onClick={() => handleTriggerTemplateSelection(tmpl)}
                          className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-black text-xs shadow-lg flex items-center gap-1 cursor-pointer transition active:scale-95"
                        >
                          <Check className="w-3.5 h-3.5" />
                          خيارات التطبيق
                        </button>
                      </div>
                    </div>

                    {/* Card Info & Color Swatches */}
                    <div className="p-3.5 border-t border-slate-100 space-y-2 bg-white">
                      <div>
                        <h4 className="font-bold text-xs text-slate-900 group-hover:text-amber-700 transition">
                          {tmpl.name}
                        </h4>
                        <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">
                          {tmpl.description}
                        </p>
                      </div>

                      {/* Color Palette Swatches & Actions */}
                      <div className="flex flex-col gap-2 pt-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-slate-400 font-bold ml-1">الألوان:</span>
                            <span className="w-3.5 h-3.5 rounded-full border shadow-2xs" style={{ backgroundColor: d.primaryColor }} title="اللون الرئيسي" />
                            <span className="w-3.5 h-3.5 rounded-full border shadow-2xs" style={{ backgroundColor: d.secondaryColor }} title="اللون الثانوي" />
                            <span className="w-3.5 h-3.5 rounded-full border shadow-2xs" style={{ backgroundColor: d.backgroundColor }} title="خلفية الشهادة" />
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => handleSaveAsSystemDefault(tmpl, e)}
                              className={`px-2 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer border ${
                                savedDefaultId === tmpl.id
                                  ? 'bg-emerald-600 text-white border-emerald-600'
                                  : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'
                              }`}
                              title="حفظ تنسيقات وبيانات هذا القالب كإعدادات افتراضية للنظام"
                            >
                              {savedDefaultId === tmpl.id ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3 text-white" />
                                  <span>تم الحفظ</span>
                                </>
                              ) : (
                                <>
                                  <Star className="w-3 h-3 text-amber-600 fill-amber-500" />
                                  <span>كافتراضي</span>
                                </>
                              )}
                            </button>

                            <button
                              onClick={() => handleTriggerTemplateSelection(tmpl)}
                              className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                                isCurrent
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-slate-900 hover:bg-amber-600 text-white'
                              }`}
                            >
                              <span>تطبيق</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* High-Res Preview Modal Overlay */}
        {previewTemplate && (
          <div className="fixed inset-0 z-60 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150">
              <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-base text-amber-400">{previewTemplate.name}</h4>
                  <p className="text-xs text-slate-400">{previewTemplate.category} - {previewTemplate.description}</p>
                </div>
                <button
                  onClick={() => setPreviewTemplate(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 bg-slate-200/80 flex items-center justify-center">
                <div
                  className="w-full aspect-[1.414] rounded-xl shadow-2xl p-6 flex flex-col justify-between border-4 relative overflow-hidden"
                  style={{
                    backgroundColor: previewTemplate.defaultData.backgroundColor || '#ffffff',
                    color: previewTemplate.defaultData.textColor || '#0f172a',
                    borderColor: previewTemplate.defaultData.primaryColor,
                    borderStyle: 'double'
                  }}
                >
                  <div className="text-center space-y-1">
                    <span className="text-xs font-bold block" style={{ color: previewTemplate.defaultData.secondaryColor }}>
                      {previewTemplate.defaultData.schoolName}
                    </span>
                    <h3 className="text-xl font-black" style={{ color: previewTemplate.defaultData.primaryColor }}>
                      {previewTemplate.defaultData.title}
                    </h3>
                  </div>

                  <div className="text-center py-3 my-2 bg-white/80 rounded-xl border border-black/5 px-4 space-y-1">
                    <span className="text-xs opacity-80 block">{previewTemplate.defaultData.recipientIntro}</span>
                    <h2 className="text-2xl font-black" style={{ color: previewTemplate.defaultData.primaryColor }}>
                      {previewTemplate.defaultData.studentName}
                    </h2>
                    <p className="text-xs leading-relaxed max-w-lg mx-auto">
                      {previewTemplate.defaultData.appreciationText}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-black/10">
                    <span className="font-bold" style={{ color: previewTemplate.defaultData.primaryColor }}>
                      {previewTemplate.defaultData.badgeTitle || 'وسام التميز'}
                    </span>
                    <span className="opacity-70">{previewTemplate.defaultData.signatures?.[0]?.name || 'توقيع معتمد'}</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 px-6 py-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200">
                <button
                  onClick={() => setPreviewTemplate(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                >
                  رجوع للمعرض
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => handleSaveAsSystemDefault(previewTemplate, e)}
                    className={`px-4 py-2.5 rounded-xl font-bold text-xs shadow-xs flex items-center gap-1.5 transition border cursor-pointer ${
                      savedDefaultId === previewTemplate.id
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-amber-100 hover:bg-amber-200 text-amber-950 border-amber-300'
                    }`}
                  >
                    {savedDefaultId === previewTemplate.id ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-white" />
                        <span>تم حفظ القالب كإعدادات افتراضية للنظام</span>
                      </>
                    ) : (
                      <>
                        <Star className="w-4 h-4 text-amber-600 fill-amber-500" />
                        <span>حفظ كإعدادات افتراضية للنظام</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      const tmpl = previewTemplate;
                      setPreviewTemplate(null);
                      handleTriggerTemplateSelection(tmpl);
                    }}
                    className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg flex items-center gap-2 transition cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    اختيار وتطبيق هذا القالب
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal for Choosing Application Mode (Full vs. Style Only) */}
        <ApplyTemplateChoiceModal
          isOpen={isChoiceModalOpen}
          onClose={() => {
            setIsChoiceModalOpen(false);
            setPendingChoiceTemplate(null);
          }}
          template={pendingChoiceTemplate}
          currentCertificate={currentCertificate}
          onApply={handleConfirmChoice}
          onDuplicateAndEdit={handleDuplicateFromChoice}
        />

        {/* Modal for Managing Custom Templates */}
        <CustomTemplatesManagerModal
          isOpen={isCustomTemplatesModalOpen}
          onClose={() => setIsCustomTemplatesModalOpen(false)}
          currentCertificate={currentCertificate}
          onApplyTemplate={(tmpl, mode) => {
            onSelectTemplate(tmpl, mode);
            setIsCustomTemplatesModalOpen(false);
            onClose();
          }}
          onShowToast={(msg) => {
            if (onShowToast) onShowToast(msg);
          }}
        />

      </div>
    </div>
  );
};
