import React, { useState } from 'react';
import { CertificateData, TemplatePreset } from '../types';
import { CustomTemplateItem, TemplateApplyMode } from '../utils/templateCustomizer';
import {
  Sparkles,
  Palette,
  Check,
  X,
  FileText,
  Copy,
  Layers,
  Sparkle,
  SlidersHorizontal,
  CheckCircle2,
  Brush,
  Type,
  LayoutTemplate
} from 'lucide-react';

interface ApplyTemplateChoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: TemplatePreset | CustomTemplateItem | null;
  currentCertificate: CertificateData;
  onApply: (
    template: TemplatePreset | CustomTemplateItem,
    mode: TemplateApplyMode
  ) => void;
  onDuplicateAndEdit?: (template: TemplatePreset | CustomTemplateItem) => void;
  onSaveAsCustomTemplate?: (template: TemplatePreset | CustomTemplateItem) => void;
}

export const ApplyTemplateChoiceModal: React.FC<ApplyTemplateChoiceModalProps> = ({
  isOpen,
  onClose,
  template,
  currentCertificate,
  onApply,
  onDuplicateAndEdit
}) => {
  const [selectedMode, setSelectedMode] = useState<TemplateApplyMode>('style-only');

  if (!isOpen || !template) return null;

  const tData = 'defaultData' in template ? template.defaultData : template.data;
  const isCustom = 'isCustom' in template && template.isCustom;

  const handleConfirmApply = () => {
    onApply(template, selectedMode);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-70 flex items-end sm:items-center justify-center bg-slate-950/80 backdrop-blur-sm p-2 sm:p-4 md:p-6 text-right overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white w-full max-w-lg md:max-w-2xl lg:max-w-2xl rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh] sm:max-h-[88vh] font-['Cairo',sans-serif]">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white px-4 py-3.5 sm:px-6 sm:py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0 shadow-inner">
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-sm sm:text-base text-amber-400 truncate">
                  تطبيق القالب: {template.name}
                </h3>
                {isCustom && (
                  <span className="text-[10px] sm:text-xs bg-indigo-500/30 text-indigo-200 border border-indigo-400/40 px-2 py-0.5 rounded-full font-bold">
                    قالب مخصص
                  </span>
                )}
              </div>
              <p className="text-[11px] sm:text-xs text-slate-300 truncate mt-0.5">
                حدد كيفية دمج القالب مع الشهادة الحالية بالمحرر
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800/80 transition cursor-pointer shrink-0 mr-1"
            title="إغلاق"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-3.5 sm:p-5 md:p-6 space-y-3.5 sm:space-y-4 bg-slate-50/70 flex-1 overflow-y-auto">
          
          {/* Mini Template Preview & Information Banner */}
          <div className="p-3 sm:p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {/* Mini Card Shape representation */}
              <div
                className="w-16 h-12 sm:w-20 sm:h-14 rounded-xl border-2 shadow-xs flex flex-col justify-center items-center p-1 text-[8px] font-bold overflow-hidden shrink-0 transition-transform hover:scale-105"
                style={{
                  backgroundColor: tData.backgroundColor || '#ffffff',
                  color: tData.textColor || '#0f172a',
                  borderColor: tData.primaryColor || '#854d0e',
                  borderStyle: 'double'
                }}
              >
                <span
                  className="line-clamp-1 text-[8px] sm:text-[9px] font-black"
                  style={{ color: tData.primaryColor || '#854d0e' }}
                >
                  {tData.title || 'شهادة تقدير'}
                </span>
                <div
                  className="w-8 h-0.5 my-0.5 rounded-full"
                  style={{ backgroundColor: tData.secondaryColor || '#d97706' }}
                />
                <span className="text-[6px] opacity-75 line-clamp-1">
                  {tData.badgeTitle || 'وسام التميز'}
                </span>
              </div>

              {/* Template Text Info */}
              <div className="min-w-0 flex-1">
                <h4 className="text-xs sm:text-sm font-black text-slate-900 truncate">
                  {template.name}
                </h4>
                <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                  {template.description || 'قالب مجهز بتنسيق وتصميم فاخر ومتقن'}
                </p>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="text-[10px] text-slate-400 font-bold">لوحة الألوان:</span>
                  <div className="flex items-center gap-1">
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-2xs"
                      style={{ backgroundColor: tData.primaryColor }}
                      title="اللون الرئيسي"
                    />
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-2xs"
                      style={{ backgroundColor: tData.secondaryColor }}
                      title="اللون الثانوي"
                    />
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-2xs"
                      style={{ backgroundColor: tData.backgroundColor }}
                      title="لون الخلفية"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Duplicate button if available */}
            {onDuplicateAndEdit && (
              <button
                type="button"
                onClick={() => {
                  onDuplicateAndEdit(template);
                  onClose();
                }}
                className="w-full sm:w-auto px-3 py-2 bg-indigo-50 hover:bg-indigo-100 active:bg-indigo-200 text-indigo-900 border border-indigo-200 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                title="إنشاء وتخصيص نسخة من هذا القالب"
              >
                <Copy className="w-3.5 h-3.5 text-indigo-700" />
                <span>نسخ وتخصيص القالب</span>
              </button>
            )}
          </div>

          {/* Mode Selection Heading */}
          <div className="space-y-2.5 sm:space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs sm:text-sm font-black text-slate-800 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-amber-600" />
                <span>اختر كيفية تطبيق القالب:</span>
              </label>
              <span className="text-[11px] text-slate-500 font-medium">
                اضغط على الخيار المرغوب
              </span>
            </div>

            {/* OPTION 1: STYLE ONLY (RECOMMENDED) */}
            <div
              onClick={() => setSelectedMode('style-only')}
              className={`p-3.5 sm:p-4 md:p-4.5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 sm:gap-4 select-none ${
                selectedMode === 'style-only'
                  ? 'bg-amber-50/90 border-amber-500 shadow-md ring-2 ring-amber-400/40'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
              }`}
            >
              {/* Radio Indicator */}
              <div
                className={`w-5 h-5 sm:w-5.5 sm:h-5.5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition ${
                  selectedMode === 'style-only'
                    ? 'border-amber-600 bg-amber-500 text-slate-950'
                    : 'border-slate-300 bg-white'
                }`}
              >
                {selectedMode === 'style-only' && (
                  <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[3]" />
                )}
              </div>

              <div className="flex-1 space-y-1.5 min-w-0">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <h5 className="font-extrabold text-xs sm:text-sm text-slate-900 flex items-center gap-1.5">
                    <Palette className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>تطبيق المظهر والألوان والتنسيق فقط (مع الاحتفاظ بالبيانات)</span>
                  </h5>
                  <span className="text-[10px] sm:text-[11px] bg-emerald-100 text-emerald-800 border border-emerald-300 font-black px-2.5 py-0.5 rounded-full shrink-0">
                    الخيار الموصى به ⭐
                  </span>
                </div>

                <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed">
                  تطبيق الإطار والزخرفة، خطوط العناوين، تدرجات الألوان، الهوامش وشكل الختم والوسام 
                  <strong className="text-slate-800"> مع الإبقاء الكامل على اسم الطالب، نصوص التكريم والثناء الحالية، وبيانات المدرسة</strong>.
                </p>

                <div className="pt-1 flex flex-wrap gap-1.5 text-[10px] sm:text-[11px] text-amber-950 font-bold">
                  <span className="bg-amber-100/80 border border-amber-200/80 px-2 py-0.5 rounded-lg flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-amber-700" />
                    حفظ اسم الطالب والصف
                  </span>
                  <span className="bg-amber-100/80 border border-amber-200/80 px-2 py-0.5 rounded-lg flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-amber-700" />
                    حفظ نص التقدير المكتوب
                  </span>
                  <span className="bg-amber-100/80 border border-amber-200/80 px-2 py-0.5 rounded-lg flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-amber-700" />
                    حفظ التواقيع والشعار
                  </span>
                </div>
              </div>
            </div>

            {/* OPTION 2: FULL TEMPLATE INCLUDING TEXT */}
            <div
              onClick={() => setSelectedMode('full')}
              className={`p-3.5 sm:p-4 md:p-4.5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 sm:gap-4 select-none ${
                selectedMode === 'full'
                  ? 'bg-indigo-50/90 border-indigo-500 shadow-md ring-2 ring-indigo-400/40'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
              }`}
            >
              {/* Radio Indicator */}
              <div
                className={`w-5 h-5 sm:w-5.5 sm:h-5.5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition ${
                  selectedMode === 'full'
                    ? 'border-indigo-600 bg-indigo-600 text-white'
                    : 'border-slate-300 bg-white'
                }`}
              >
                {selectedMode === 'full' && (
                  <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[3]" />
                )}
              </div>

              <div className="flex-1 space-y-1.5 min-w-0">
                <h5 className="font-extrabold text-xs sm:text-sm text-slate-900 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>تطبيق القالب كاملاً بنصوصه الأصلية وصياغته البلاغية الجاهزة</span>
                </h5>

                <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed">
                  تطبيق التصميم واستبدال نصوص التكريم والتقدير، العنوان، ومقدمة الشهادة بالصياغة البلاغية المجهزة في هذا القالب، مع الإبقاء على اسم الطالب والمدرسة إن وجدا.
                </p>

                <div className="pt-1 flex flex-wrap gap-1.5 text-[10px] sm:text-[11px] text-indigo-950 font-bold">
                  <span className="bg-indigo-100/80 border border-indigo-200/80 px-2 py-0.5 rounded-lg flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-indigo-700" />
                    عنوان ونص تقدير جديد
                  </span>
                  <span className="bg-indigo-100/80 border border-indigo-200/80 px-2 py-0.5 rounded-lg flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-indigo-700" />
                    أبيات شعر ومقولة القالب
                  </span>
                  <span className="bg-indigo-100/80 border border-indigo-200/80 px-2 py-0.5 rounded-lg flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-indigo-700" />
                    المقدمة والأوسمة الجاهزة
                  </span>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Modal Actions Footer */}
        <div className="bg-white px-4 py-3 sm:px-6 sm:py-4 border-t border-slate-200 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 sm:py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer text-center"
          >
            إلغاء
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleConfirmApply}
              className="w-full sm:w-auto px-5 sm:px-6 py-2.5 sm:py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-md flex items-center justify-center gap-2 transition cursor-pointer active:scale-95"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>
                {selectedMode === 'style-only'
                  ? 'تطبيق التنسيق والمظهر فقط'
                  : 'تطبيق القالب كاملاً بنصوصه'}
              </span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
