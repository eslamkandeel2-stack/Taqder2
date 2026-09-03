import React, { useState, useEffect, useRef } from 'react';
import { CertificateData } from '../types';
import {
  DraftCertificateItem,
  getSavedDrafts,
  saveCertificateAsDraft,
  updateSavedDraft,
  deleteSavedDraft,
  deleteMultipleDrafts,
  duplicateDraft,
  exportDraftsToJson,
  importDraftsFromJson,
  subscribeToDrafts
} from '../utils/draftsManager';
import {
  BookmarkCheck,
  X,
  Search,
  Trash2,
  Copy,
  Edit3,
  Download,
  Upload,
  Plus,
  Layers,
  Sparkles,
  CheckCircle2,
  Calendar,
  Tag,
  FileText,
  Clock,
  ArrowRight,
  Filter,
  Check,
  Eye,
  FolderHeart,
  Save,
  AlertCircle
} from 'lucide-react';

interface DraftsManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCertificate: CertificateData;
  onLoadCertificate: (cert: CertificateData) => void;
  onShowToast: (message: string) => void;
}

export const DraftsManagerModal: React.FC<DraftsManagerModalProps> = ({
  isOpen,
  onClose,
  currentCertificate,
  onLoadCertificate,
  onShowToast
}) => {
  const [drafts, setDrafts] = useState<DraftCertificateItem[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'draft' | 'template' | 'save_new'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  // Save current form states
  const [saveName, setSaveName] = useState('');
  const [saveType, setSaveType] = useState<'draft' | 'template'>('draft');
  const [saveNotes, setSaveNotes] = useState('');
  const [saveTags, setSaveTags] = useState<string[]>([]);
  const [saveTagInput, setSaveTagInput] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync drafts from storage
  const reloadDrafts = () => {
    const list = getSavedDrafts();
    setDrafts(list);
  };

  useEffect(() => {
    if (isOpen) {
      reloadDrafts();
      setSaveName(
        currentCertificate.title
          ? `${currentCertificate.title} - ${currentCertificate.studentName || 'مسودة'}`
          : 'شهادة تقدير وتفوق'
      );
      setSaveTags(
        currentCertificate.subject
          ? ['مسودة', currentCertificate.subject, currentCertificate.recipientGender === 'female' ? 'طالبات' : 'طلاب']
          : ['مسودة', 'تقدير', currentCertificate.recipientGender === 'female' ? 'طالبات' : 'طلاب']
      );
    }
  }, [isOpen, currentCertificate]);

  useEffect(() => {
    const unsubscribe = subscribeToDrafts(reloadDrafts);
    window.addEventListener('taqdeer_account_switched', reloadDrafts);
    return () => {
      unsubscribe();
      window.removeEventListener('taqdeer_account_switched', reloadDrafts);
    };
  }, []);

  if (!isOpen) return null;

  const handleSaveCurrent = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const finalName = saveName.trim() || `${currentCertificate.title || 'شهادة'} - ${currentCertificate.studentName || 'مسودة'}`;
    
    saveCertificateAsDraft(currentCertificate, {
      name: finalName,
      type: saveType,
      tags: saveTags,
      notes: saveNotes.trim()
    });

    onShowToast(saveType === 'template' ? 'تم حفظ التصميم كقالب مخصص بنجاح! ✨' : 'تم حفظ الشهادة كمسودة بالنظام بنجاح! 💾');
    setActiveTab('all');
  };

  const handleLoadDraft = (draft: DraftCertificateItem) => {
    onLoadCertificate(draft.data);
    onShowToast(`تم استرجاع "${draft.name}" بنجاح وجاهزة للتعديل! 🚀`);
    onClose();
  };

  const handleDeleteSingle = (id: string, name: string) => {
    if (window.confirm(`هل أنت متأكد من رغبتك في حذف المسودة "${name}"؟`)) {
      deleteSavedDraft(id);
      setSelectedIds(prev => prev.filter(item => item !== id));
      onShowToast('تم حذف المسودة بنجاح.');
    }
  };

  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    if (window.confirm(`هل أنت متأكد من حذف ${selectedIds.length} مسودة/قالب محدد؟`)) {
      deleteMultipleDrafts(selectedIds);
      setSelectedIds([]);
      onShowToast(`تم حذف ${selectedIds.length} مسودة بنجاح.`);
    }
  };

  const handleDuplicate = (id: string) => {
    const duplicated = duplicateDraft(id);
    if (duplicated) {
      onShowToast(`تم تكرار المسودة بنجاح! 📋`);
    }
  };

  const handleStartEdit = (draft: DraftCertificateItem) => {
    setEditingDraftId(draft.id);
    setEditName(draft.name);
    setEditNotes(draft.notes || '');
    setEditTags(draft.tags || []);
  };

  const handleSaveEdit = () => {
    if (!editingDraftId) return;
    updateSavedDraft(editingDraftId, {
      name: editName.trim() || 'مسودة شهادة',
      notes: editNotes.trim(),
      tags: editTags
    });
    setEditingDraftId(null);
    onShowToast('تم تحديث بيانات المسودة بنجاح! ✏️');
  };

  const handleAddEditTag = () => {
    if (tagInput.trim() && !editTags.includes(tagInput.trim())) {
      setEditTags([...editTags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveEditTag = (tagToRemove: string) => {
    setEditTags(editTags.filter(t => t !== tagToRemove));
  };

  const handleAddSaveTag = () => {
    if (saveTagInput.trim() && !saveTags.includes(saveTagInput.trim())) {
      setSaveTags([...saveTags, saveTagInput.trim()]);
      setSaveTagInput('');
    }
  };

  const handleRemoveSaveTag = (tagToRemove: string) => {
    setSaveTags(saveTags.filter(t => t !== tagToRemove));
  };

  const handleExportSelectedOrAll = () => {
    exportDraftsToJson(selectedIds.length > 0 ? selectedIds : undefined);
    onShowToast('تم تصدير ملف النسخة الاحتياطية بنجاح! 📥');
  };

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const res = importDraftsFromJson(content);
        if (res.error) {
          onShowToast(`خطأ في الاستيراد: ${res.error}`);
        } else {
          onShowToast(`تم استيراد ${res.importedCount} مسودة بنجاح! 🎉`);
          reloadDrafts();
        }
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredDrafts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredDrafts.map(d => d.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  // Filtering
  const filteredDrafts = drafts.filter(draft => {
    if (activeTab === 'draft' && draft.type !== 'draft') return false;
    if (activeTab === 'template' && draft.type !== 'template') return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchesName = draft.name.toLowerCase().includes(q);
    const matchesStudent = draft.data.studentName?.toLowerCase().includes(q);
    const matchesTitle = draft.data.title?.toLowerCase().includes(q);
    const matchesSchool = draft.data.schoolName?.toLowerCase().includes(q);
    const matchesPreset = draft.data.layoutPreset?.toLowerCase().includes(q);
    const matchesTags = draft.tags.some(t => t.toLowerCase().includes(q));

    return matchesName || matchesStudent || matchesTitle || matchesSchool || matchesPreset || matchesTags;
  });

  const draftsCount = drafts.filter(d => d.type === 'draft').length;
  const templatesCount = drafts.filter(d => d.type === 'template').length;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-slate-100 font-['Cairo']">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950/70 to-slate-900 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
              <FolderHeart className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-white">إدارة المسودات والقوالب المحفوظة</h3>
                <span className="text-[11px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">
                  {drafts.length} عنصر محفوظ
                </span>
              </div>
              <p className="text-xs text-slate-400">حفظ تصميم الشهادة بالكامل والرجوع له وتعديله في أي وقت دون فقدان البيانات</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector & Controls */}
        <div className="px-6 py-3 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'all' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>الكل ({drafts.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('draft')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'draft' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              <BookmarkCheck className="w-3.5 h-3.5" />
              <span>المسودات ({draftsCount})</span>
            </button>
            <button
              onClick={() => setActiveTab('template')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'template' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>قوالب مخصصة ({templatesCount})</span>
            </button>
            <button
              onClick={() => setActiveTab('save_new')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'save_new' ? 'bg-emerald-600 text-white shadow-xs' : 'text-emerald-400 hover:bg-slate-800'
              }`}
            >
              <Save className="w-3.5 h-3.5" />
              <span>حفظ التصميم الحالي 💾</span>
            </button>
          </div>

          {/* Backup Actions */}
          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportFileChange}
              accept=".json"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
              title="استيراد مسودات من ملف JSON"
            >
              <Upload className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden sm:inline">استيراد JSON</span>
            </button>
            <button
              onClick={handleExportSelectedOrAll}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
              title="تصدير مسودة أو كافة المسودات كملف JSON"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">تصدير {selectedIds.length > 0 ? `المحدد (${selectedIds.length})` : 'نسخة احتياطية'}</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'save_new' ? (
            /* Save Current Certificate Form */
            <div className="bg-slate-950/60 border border-slate-800 p-6 rounded-2xl space-y-5 max-w-2xl mx-auto text-right">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                  <Save className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">حفظ الشهادة الحالية كمسودة أو قالب للنظام</h4>
                  <p className="text-xs text-slate-400">سيتم حفظ كافة النصوص، الألوان، الخطوط، الأوسمة، الأختام، ومواقع العناصر كاملة</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">عنوان المسودة / القالب:</label>
                  <input
                    type="text"
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    placeholder="مثال: شهادة تفوق فيزياء - عبد الله العتيبي"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">نوع الحفظ:</label>
                    <div className="flex gap-2 bg-slate-900 p-1 rounded-xl border border-slate-700">
                      <button
                        type="button"
                        onClick={() => setSaveType('draft')}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer text-center ${
                          saveType === 'draft' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        مسودة شهادة كاملة
                      </button>
                      <button
                        type="button"
                        onClick={() => setSaveType('template')}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer text-center ${
                          saveType === 'template' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        قالب تصميمي مخصص
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">طالب / مستلم الشهادة الحالي:</label>
                    <div className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-amber-300 font-bold flex items-center justify-between">
                      <span>{currentCertificate.studentName || 'بدون اسم'}</span>
                      <span className="text-[10px] text-slate-400">{currentCertificate.grade || currentCertificate.subject || 'عام'}</span>
                    </div>
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">الوسوم والتصنيفات (Tags):</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={saveTagInput}
                      onChange={(e) => setSaveTagInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddSaveTag(); } }}
                      placeholder="أضف وسم واضغط Enter أو إضافة..."
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:ring-2 focus:ring-amber-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddSaveTag}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-bold rounded-xl border border-slate-700 transition cursor-pointer"
                    >
                      إضافة وسم
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {saveTags.map(tag => (
                      <span
                        key={tag}
                        className="bg-slate-800 border border-slate-700 text-amber-300 px-2.5 py-1 rounded-lg text-xs flex items-center gap-1.5"
                      >
                        <span>#{tag}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSaveTag(tag)}
                          className="text-slate-400 hover:text-rose-400"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">ملاحظات أو وصف خاص (اختياري):</label>
                  <textarea
                    rows={2}
                    value={saveNotes}
                    onChange={(e) => setSaveNotes(e.target.value)}
                    placeholder="اكتب أي ملاحظة للرجوع لها لاحقاً..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Summary preview badge */}
                <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: currentCertificate.primaryColor }} />
                    <span className="text-slate-300">النمط: <strong className="text-white">{currentCertificate.layoutPreset || 'افتراضي'}</strong></span>
                  </div>
                  <div className="text-slate-400">
                    الإطار: <strong className="text-amber-400">{currentCertificate.frameStyle || 'ذهبي'}</strong>
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab('all')}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveCurrent}
                    className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 text-slate-950 font-black text-xs rounded-xl shadow-lg transition flex items-center gap-2 cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>حفظ المسودة الآن في النظام</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Drafts List & Search */
            <div className="space-y-4">
              
              {/* Search & Actions Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="بحث في المسودات بالاسم، الطالب، المادة، الوسوم، أو القالب..."
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pr-9 pl-4 py-2 text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                </div>

                <div className="flex items-center gap-2">
                  {filteredDrafts.length > 0 && (
                    <button
                      onClick={toggleSelectAll}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{selectedIds.length === filteredDrafts.length ? 'إلغاء التحديد' : 'تحديد الكل'}</span>
                    </button>
                  )}

                  {selectedIds.length > 0 && (
                    <button
                      onClick={handleDeleteSelected}
                      className="px-3 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-bold rounded-xl border border-rose-500/40 flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>حذف المحدد ({selectedIds.length})</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Drafts Grid */}
              {filteredDrafts.length === 0 ? (
                <div className="bg-slate-950/40 border border-dashed border-slate-800 rounded-3xl p-12 text-center space-y-4">
                  <div className="w-16 h-16 rounded-3xl bg-slate-800/80 text-amber-400 flex items-center justify-center mx-auto shadow-inner">
                    <BookmarkCheck className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white">لا توجد مسودات محفوظة تطابق البحث</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      {drafts.length === 0 
                        ? 'لم تقم بحفظ أي مسودة حتى الآن. يمكنك حفظ تصميم الشهادة الحالية كمسودة أو قالب للرجوع لها دائماً.'
                        : 'جرب استخدام كلمات بحث أخرى للوصول للمسودات المطلوبة.'}
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('save_new')}
                    className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-lg hover:brightness-110 transition inline-flex items-center gap-2 cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>حفظ الشهادة الحالية كأول مسودة</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredDrafts.map((draft) => {
                    const isSelected = selectedIds.includes(draft.id);
                    const isEditing = editingDraftId === draft.id;
                    const dateStr = new Date(draft.updatedAt || draft.createdAt).toLocaleDateString('ar-SA', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    });

                    return (
                      <div
                        key={draft.id}
                        className={`bg-slate-950/80 border rounded-2xl p-4 transition-all duration-200 flex flex-col justify-between relative group ${
                          isSelected
                            ? 'border-amber-500 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500'
                            : 'border-slate-800 hover:border-slate-700 hover:shadow-md'
                        }`}
                      >
                        {/* Card Top Row */}
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelectOne(draft.id)}
                                className="w-4 h-4 text-amber-500 bg-slate-900 border-slate-700 rounded focus:ring-amber-500 cursor-pointer"
                              />
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                  draft.type === 'template'
                                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                    : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                                }`}
                              >
                                {draft.type === 'template' ? '✨ قالب مخصص' : '📄 مسودة'}
                              </span>
                            </div>

                            {/* Colors & Layout pill */}
                            <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded-lg border border-slate-800 text-[10px]">
                              <div
                                className="w-3 h-3 rounded-full border border-white/20"
                                style={{ backgroundColor: draft.data.primaryColor || '#854d0e' }}
                                title="اللون الأساسي"
                              />
                              <div
                                className="w-3 h-3 rounded-full border border-white/20"
                                style={{ backgroundColor: draft.data.secondaryColor || '#d97706' }}
                                title="اللون الثانوي"
                              />
                              <span className="text-slate-400 font-mono text-[9px]">{draft.data.layoutPreset || 'grid'}</span>
                            </div>
                          </div>

                          {/* Editable Name & Info */}
                          {isEditing ? (
                            <div className="space-y-2 mt-2 bg-slate-900 p-3 rounded-xl border border-slate-700">
                              <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:ring-2 focus:ring-amber-500"
                                placeholder="اسم المسودة"
                              />
                              <textarea
                                rows={2}
                                value={editNotes}
                                onChange={(e) => setEditNotes(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:ring-2 focus:ring-amber-500"
                                placeholder="ملاحظات..."
                              />
                              <div className="flex gap-1">
                                <input
                                  type="text"
                                  value={tagInput}
                                  onChange={(e) => setTagInput(e.target.value)}
                                  placeholder="وسم جديد..."
                                  className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-white"
                                />
                                <button
                                  type="button"
                                  onClick={handleAddEditTag}
                                  className="px-2 py-1 bg-slate-800 text-amber-400 text-[11px] font-bold rounded-lg"
                                >
                                  +
                                </button>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {editTags.map(t => (
                                  <span key={t} className="bg-slate-800 text-amber-300 text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1">
                                    #{t}
                                    <button onClick={() => handleRemoveEditTag(t)}><X className="w-2.5 h-2.5" /></button>
                                  </span>
                                ))}
                              </div>
                              <div className="flex justify-end gap-2 pt-1">
                                <button
                                  onClick={() => setEditingDraftId(null)}
                                  className="px-2 py-1 text-slate-400 hover:text-white text-[11px] font-bold"
                                >
                                  إلغاء
                                </button>
                                <button
                                  onClick={handleSaveEdit}
                                  className="px-3 py-1 bg-amber-500 text-slate-950 text-[11px] font-bold rounded-lg shadow"
                                >
                                  حفظ التعديل
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              <h5 className="font-extrabold text-sm text-white line-clamp-1 group-hover:text-amber-300 transition-colors">
                                {draft.name}
                              </h5>
                              <div className="text-xs text-slate-300 flex items-center justify-between">
                                <span className="font-bold text-amber-400 line-clamp-1">
                                  {draft.data.studentName || 'بدون اسم طالب'}
                                </span>
                                <span className="text-[10px] text-slate-400 shrink-0">
                                  {draft.data.grade || draft.data.subject || 'عام'}
                                </span>
                              </div>

                              {draft.notes && (
                                <p className="text-[11px] text-slate-400 line-clamp-2 bg-slate-900/60 p-1.5 rounded-lg border border-slate-800/60">
                                  {draft.notes}
                                </p>
                              )}

                              {/* Tags */}
                              {draft.tags && draft.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 pt-1">
                                  {draft.tags.slice(0, 3).map(tag => (
                                    <span key={tag} className="text-[10px] bg-slate-900 text-slate-400 border border-slate-800 px-1.5 py-0.5 rounded">
                                      #{tag}
                                    </span>
                                  ))}
                                  {draft.tags.length > 3 && (
                                    <span className="text-[10px] text-slate-500">+{draft.tags.length - 3}</span>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Card Bottom Row: Timestamp & Actions */}
                        <div className="pt-3 mt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                          <span className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                            <Clock className="w-3 h-3 text-slate-600" />
                            {dateStr}
                          </span>

                          <div className="flex items-center gap-1">
                            {!isEditing && (
                              <>
                                <button
                                  onClick={() => handleStartEdit(draft)}
                                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                                  title="تعديل الاسم والملاحظات والوسوم"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDuplicate(draft.id)}
                                  className="p-1.5 text-slate-400 hover:text-sky-300 hover:bg-slate-800 rounded-lg transition"
                                  title="تكرار ونسخ المسودة"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteSingle(draft.id, draft.name)}
                                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                                  title="حذف المسودة"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => handleLoadDraft(draft)}
                              className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition flex items-center gap-1 cursor-pointer"
                              title="فتح المسودة للتعديل المباشر"
                            >
                              <span>فتح وتعديل</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>يتم حفظ وتحديث المسودات تلقائياً في التخزين المحلي الآمن بجهازك</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold transition cursor-pointer"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
};
