import React, { useState, useEffect } from 'react';
import { CertificateData, TemplatePreset } from '../types';
import {
  CustomTemplateItem,
  getSavedCustomTemplates,
  saveCertificateAsCustomTemplate,
  deleteCustomTemplate,
  duplicateAndCustomizeTemplate,
  subscribeToCustomTemplates
} from '../utils/templateCustomizer';
import {
  Sparkles,
  Save,
  Trash2,
  Copy,
  Edit3,
  X,
  Plus,
  Palette,
  CheckCircle2,
  FolderHeart,
  Search,
  Check,
  Eye,
  SlidersHorizontal,
  BookmarkPlus,
  Info
} from 'lucide-react';

interface CustomTemplatesManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCertificate: CertificateData;
  onApplyTemplate: (
    template: TemplatePreset | CustomTemplateItem,
    mode: 'full' | 'style-only'
  ) => void;
  onShowToast: (msg: string) => void;
}

export const CustomTemplatesManagerModal: React.FC<CustomTemplatesManagerModalProps> = ({
  isOpen,
  onClose,
  currentCertificate,
  onApplyTemplate,
  onShowToast
}) => {
  const [customTemplates, setCustomTemplates] = useState<CustomTemplateItem[]>([]);
  const [activeTab, setActiveTab] = useState<'list' | 'save_current'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewTemplate, setPreviewTemplate] = useState<CustomTemplateItem | null>(null);

  // Form states for saving current cert as custom template
  const [templateName, setTemplateName] = useState('');
  const [templateCategory, setTemplateCategory] = useState('قوالبي المخصصة');
  const [templateDescription, setTemplateDescription] = useState('');
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);

  const reload = () => {
    setCustomTemplates(getSavedCustomTemplates());
  };

  useEffect(() => {
    if (isOpen) {
      reload();
      if (!templateName) {
        setTemplateName(
          currentCertificate.title
            ? `قالب: ${currentCertificate.title}`
            : 'قالب شهادة مخصص'
        );
      }
    }
  }, [isOpen, currentCertificate]);

  useEffect(() => {
    const unsub = subscribeToCustomTemplates(reload);
    return () => unsub();
  }, []);

  if (!isOpen) return null;

  const handleSaveCurrent = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!templateName.trim()) {
      onShowToast('يرجى كتابة اسم للقالب المخصص أولاً.');
      return;
    }

    const saved = saveCertificateAsCustomTemplate(currentCertificate, {
      name: templateName,
      category: templateCategory,
      description: templateDescription,
      overrideId: editingTemplateId || undefined
    });

    onShowToast(
      editingTemplateId
        ? `تم تحديث القالب المخصص "${saved.name}" بنجاح! 💾`
        : `تم حفظ التصميم الحالي كقالب مخصص "${saved.name}" بنجاح! ✨`
    );

    setEditingTemplateId(null);
    setTemplateName('');
    setTemplateDescription('');
    setActiveTab('list');
    reload();
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`هل أنت متأكد من رغبتك في حذف القالب المخصص "${name}"؟`)) {
      deleteCustomTemplate(id);
      onShowToast(`تم حذف القالب "${name}" بنجاح.`);
      reload();
    }
  };

  const handleDuplicate = (tmpl: CustomTemplateItem) => {
    const duplicated = duplicateAndCustomizeTemplate(tmpl);
    onShowToast(`تم إنشاء نسخة جديدة من قالب "${tmpl.name}" بنجاح! 📋`);
    reload();
  };

  const handleEdit = (tmpl: CustomTemplateItem) => {
    setEditingTemplateId(tmpl.id);
    setTemplateName(tmpl.name);
    setTemplateCategory(tmpl.category);
    setTemplateDescription(tmpl.description);
    setActiveTab('save_current');
  };

  const filtered = customTemplates.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-3 sm:p-6 text-right font-['Cairo',sans-serif]">
      <div className="bg-white w-full max-w-5xl h-[88vh] rounded-3xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shadow-inner">
              <BookmarkPlus className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg text-amber-400">
                  إدارة وتخصيص القوالب الخاصة بك (Custom Templates)
                </h3>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">
                  {customTemplates.length} قالب مخصص
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                احفظ تصميماتك كقوالب مستقلة، أو انسخ القوالب الجاهزة وعدلها وخصصها بحرية تامة
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tab Controls Bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setActiveTab('list');
                setEditingTemplateId(null);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'list'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <FolderHeart className="w-4 h-4" />
              <span>قوالبي المحفوظة ({customTemplates.length})</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('save_current');
                if (!editingTemplateId) {
                  setTemplateName(
                    currentCertificate.title
                      ? `قالب: ${currentCertificate.title}`
                      : 'قالب شهادة مخصص جديد'
                  );
                }
              }}
              className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'save_current'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>{editingTemplateId ? 'تعديل بيانات القالب' : 'حفظ التصميم الحالي كقالب جديد'}</span>
            </button>
          </div>

          {activeTab === 'list' && (
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث في قوالبي المخصصة..."
                className="w-full pr-9 pl-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
              />
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/60">
          
          {/* TAB 1: LIST OF CUSTOM TEMPLATES */}
          {activeTab === 'list' && (
            <div>
              {customTemplates.length === 0 ? (
                <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-12 text-center space-y-4 max-w-lg mx-auto my-8">
                  <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto text-amber-600 border border-amber-200">
                    <BookmarkPlus className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-base font-extrabold text-slate-800">لا توجد قوالب مخصصة محفوظة بعد</h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      يمكنك في أي وقت حفظ التصميم المفتوح بالمحرر كقالب جديد، أو نسخ أي قالب من المعرض وتخصيصه وتعديله بحرية.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('save_current')}
                    className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition inline-flex items-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>حفظ التصميم الحالي كقالب أول</span>
                  </button>
                </div>
              ) : filtered.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <Search className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-600">لم يتم العثور على قوالب تطابق البحث</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filtered.map((tmpl) => {
                    const d = tmpl.data;
                    return (
                      <div
                        key={tmpl.id}
                        className="bg-white rounded-2xl border border-slate-200 hover:border-amber-400 shadow-sm hover:shadow-lg transition-all overflow-hidden flex flex-col justify-between group"
                      >
                        {/* Mini Card Header */}
                        <div className="px-3.5 py-2 bg-slate-900 text-white flex items-center justify-between text-xs">
                          <span className="font-bold text-amber-400 text-[11px] flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            {tmpl.category}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(tmpl.updatedAt).toLocaleDateString('ar-SA')}
                          </span>
                        </div>

                        {/* Mini Certificate Representation */}
                        <div className="p-3 bg-slate-100 flex items-center justify-center">
                          <div
                            className="w-full aspect-[1.45] rounded-lg shadow-sm p-3 flex flex-col justify-between border-2 transition-transform group-hover:scale-[1.01]"
                            style={{
                              backgroundColor: d.backgroundColor || '#ffffff',
                              color: d.textColor || '#0f172a',
                              borderColor: d.primaryColor || '#854d0e',
                              borderStyle: 'double'
                            }}
                          >
                            <div className="text-center">
                              <span className="text-[8px] font-bold block opacity-75" style={{ color: d.secondaryColor }}>
                                {d.schoolName || 'اسم المدرسة'}
                              </span>
                              <h5 className="text-[11px] font-black line-clamp-1" style={{ color: d.primaryColor }}>
                                {d.title || 'شهادة تقدير'}
                              </h5>
                            </div>

                            <div className="my-1 text-center py-1 px-1 bg-white/70 rounded border border-black/5">
                              <span className="text-[9px] font-bold block line-clamp-1" style={{ color: d.primaryColor }}>
                                {d.studentName || 'اسم الطالب المكرم'}
                              </span>
                              <span className="text-[7px] block line-clamp-1 opacity-80" style={{ color: d.textColor }}>
                                {d.appreciationText || 'نص التقدير والثناء'}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-[7px] pt-1 border-t border-black/10">
                              <span className="font-bold" style={{ color: d.primaryColor }}>
                                {d.badgeTitle || 'وسام التميز'}
                              </span>
                              <span>{d.layoutPreset || 'تنسيق متوازن'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Card Info & Actions */}
                        <div className="p-3.5 space-y-2.5">
                          <div>
                            <h4 className="font-bold text-xs text-slate-900 group-hover:text-amber-800 transition">
                              {tmpl.name}
                            </h4>
                            <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">
                              {tmpl.description}
                            </p>
                          </div>

                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5">
                            {/* Management buttons */}
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleEdit(tmpl)}
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                                title="تعديل اسم ووصف القالب"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDuplicate(tmpl)}
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                                title="تكرار ونسخ هذا القالب"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(tmpl.id, tmpl.name)}
                                className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg transition"
                                title="حذف القالب"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Apply choices */}
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  onApplyTemplate(tmpl, 'style-only');
                                  onClose();
                                }}
                                className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-950 font-bold text-[11px] rounded-lg transition"
                                title="تطبيق الشكل والخطوط والألوان فقط دون تغيير بيانات الطالب الحالية"
                              >
                                الشكل فقط
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  onApplyTemplate(tmpl, 'full');
                                  onClose();
                                }}
                                className="px-3 py-1 bg-slate-900 hover:bg-amber-600 text-white font-black text-[11px] rounded-lg transition"
                                title="تطبيق القالب كاملاً بنصوصه وتنسيقه"
                              >
                                تطبيق كامل
                              </button>
                            </div>
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SAVE CURRENT CERT AS CUSTOM TEMPLATE */}
          {activeTab === 'save_current' && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 max-w-2xl mx-auto shadow-sm space-y-5">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-700 flex items-center justify-center font-black">
                  <BookmarkPlus className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900">
                    {editingTemplateId ? 'تعديل بيانات القالب المخصص' : 'حفظ تصميم الشهادة الحالي كقالب مخصص'}
                  </h4>
                  <p className="text-xs text-slate-500">
                    سيتم حفظ الإطار، الخطوط، الألوان، الزخارف، الهوامش والترويسة كقالب دائم في نظامك للعودة إليه لاحقاً
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveCurrent} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    اسم القالب المخصص: <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="مثال: قالب التكريم الملكي - مدرسة التميز"
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:bg-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    التصنيف / المناسبة:
                  </label>
                  <select
                    value={templateCategory}
                    onChange={(e) => setTemplateCategory(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:bg-white outline-none"
                  >
                    <option value="قوالبي المخصصة">قوالبي المخصصة</option>
                    <option value="تفوق دراسي">تفوق دراسي</option>
                    <option value="تدريب وتطوير">تدريب وتطوير</option>
                    <option value="تحفيظ القرآن">تحفيظ القرآن</option>
                    <option value="أطفال وروضة">أطفال وروضة</option>
                    <option value="تقنية وعلوم">تقنية وعلوم</option>
                    <option value="رياضية وفنون">رياضية وفنون</option>
                    <option value="تميز وطني ومجتمعي">تميز وطني ومجتمعي</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    وصف مختصر أو ملاحظات عن القالب:
                  </label>
                  <textarea
                    rows={3}
                    value={templateDescription}
                    onChange={(e) => setTemplateDescription(e.target.value)}
                    placeholder="ملاحظات حول الألوان أو المناسبات المناسبة لهذا القالب..."
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:bg-white outline-none"
                  />
                </div>

                {/* Summary Info */}
                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-950">
                  <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    <strong>ما الذي يتم حفظه في القالب؟</strong> يتم تضمين نمط الإطار، توزيع الشبكة والهوامش، خطوط العناوين، تدرجات الألوان، شكل الختم والوسام، مع إمكانية تطبيقه على أي شهادة أخرى بضغطة زر.
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('list');
                      setEditingTemplateId(null);
                    }}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                  >
                    إلغاء
                  </button>

                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>{editingTemplateId ? 'حفظ التعديلات' : 'حفظ كقالب مخصص الآن'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
