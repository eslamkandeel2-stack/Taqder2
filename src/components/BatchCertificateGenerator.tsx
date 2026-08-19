import React, { useState, useEffect } from 'react';
import { CertificateData, BatchRecord, TemplatePreset } from '../types';
import { TEMPLATE_PRESETS } from '../data/templates';
import { applyDefaultsToCertificate, getSavedDefaultSettings } from '../utils/defaultSettings';
import { generateVerificationCode } from '../utils/qrUtils';
import { adaptCertificateGender, detectGenderFromName } from '../utils/genderConverter';
import { getSavedDrafts, DraftCertificateItem } from '../utils/draftsManager';
import {
  getSavedBatches,
  saveBatchRecord,
  deleteBatchRecord,
  subscribeToBatches
} from '../utils/batchManager';
import { BatchCertificateViewerModal } from './BatchCertificateViewerModal';
import {
  Users,
  Sparkles,
  Download,
  CheckCircle,
  FileSpreadsheet,
  Trash2,
  Calendar,
  Building2,
  HardDrive,
  ShieldCheck,
  Eye,
  Layers,
  Bookmark,
  Palette,
  Check,
  Plus,
  RefreshCw,
  Clock,
  ExternalLink,
  Copy,
  BookOpen
} from 'lucide-react';

interface Props {
  baseCertificate: CertificateData;
  onApplySingleToEditor: (cert: CertificateData) => void;
  onExportAllPDF?: () => void;
}

export const BatchCertificateGenerator: React.FC<Props> = ({
  baseCertificate,
  onApplySingleToEditor,
}) => {
  const savedDefaults = getSavedDefaultSettings();

  // Active top sub-tab
  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');

  // Input states
  const [batchTitle, setBatchTitle] = useState<string>('دفعة تكريم المتفوقين - الفصل الأول');
  const [studentInput, setStudentInput] = useState<string>(
    'أحمد بن محمد العتيبي\nسارة بنت خالد الغامدي\nعمر بن فيصل الشمري\nريما بنت ناصر الدوسري\nياسر بن عبد الله الشهري\nنورة بنت سعد القحطاني\nفهد بن خالد الحربي\nجود بنت إبراهيم الماجد'
  );
  const [subject, setSubject] = useState(baseCertificate.subject || 'التفوق الدراسي والتميز الأكاديمي');
  const [grade, setGrade] = useState(baseCertificate.grade || 'الصف الأول الثانوي - شعبة 1');
  const [schoolName, setSchoolName] = useState(baseCertificate.schoolName || savedDefaults.schoolName || 'مدارس رواد التميز');
  const [customAppreciation, setCustomAppreciation] = useState(baseCertificate.appreciationText || '');
  const [autoGenderAdapt, setAutoGenderAdapt] = useState(true);

  // Approved Template Selection
  const [templateSelectionMode, setTemplateSelectionMode] = useState<'current' | 'preset' | 'saved'>('current');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('academic-gold');
  const [selectedSavedDraftId, setSelectedSavedDraftId] = useState<string>('');
  const [savedTemplatesList, setSavedTemplatesList] = useState<DraftCertificateItem[]>([]);

  // Saved batches list
  const [savedBatches, setSavedBatches] = useState<BatchRecord[]>([]);

  // Active Batch Viewer Modal state
  const [viewerBatch, setViewerBatch] = useState<BatchRecord | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    // Load saved templates
    const drafts = getSavedDrafts();
    setSavedTemplatesList(drafts);
    if (drafts.length > 0 && !selectedSavedDraftId) {
      setSelectedSavedDraftId(drafts[0].id);
    }

    // Load saved batches
    setSavedBatches(getSavedBatches());
    const unsub = subscribeToBatches(() => {
      setSavedBatches(getSavedBatches());
    });
    return () => unsub();
  }, [selectedSavedDraftId]);

  // Sample student list quick paste
  const handleInsertSample = (type: 'boys' | 'girls' | 'mixed') => {
    if (type === 'boys') {
      setStudentInput('عبدالله بن فهد المطيري\nخالد بن محمد السالم\nسلطان بن عبدالعزيز الدوسري\nفيصل بن نواف الشمري\nسعود بن إبراهيم القحطاني');
    } else if (type === 'girls') {
      setStudentInput('نوف بنت سلطان العتيبي\nمريم بنت خالد الغامدي\nشهد بنت فهد الشهري\nريناد بنت محمد السبيعي\nليان بنت عمر الحازمي');
    } else {
      setStudentInput('أحمد بن محمد العتيبي\nسارة بنت خالد الغامدي\nعمر بن فيصل الشمري\nريما بنت ناصر الدوسري\nياسر بن عبد الله الشهري');
    }
  };

  // Determine base certificate structure according to template choice
  const getSelectedBaseTemplateData = (): CertificateData => {
    if (templateSelectionMode === 'current') {
      return { ...baseCertificate };
    }

    if (templateSelectionMode === 'preset') {
      const preset = TEMPLATE_PRESETS.find(p => p.id === selectedPresetId);
      return preset ? { ...baseCertificate, ...preset.defaultData } as CertificateData : { ...baseCertificate };
    }

    if (templateSelectionMode === 'saved') {
      const saved = savedTemplatesList.find(d => d.id === selectedSavedDraftId);
      return saved ? { ...baseCertificate, ...saved.data } as CertificateData : { ...baseCertificate };
    }

    return { ...baseCertificate };
  };

  // Generate batch certificates and save
  const handleGenerateAndSaveBatch = () => {
    const names = studentInput
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    if (names.length === 0) {
      showToast('يرجى كتابة اسم طالب واحد على الأقل لتوليد الشهادات');
      return;
    }

    const templateBase = getSelectedBaseTemplateData();
    const templateName =
      templateSelectionMode === 'current'
        ? 'تصميم المحرر الحالي'
        : templateSelectionMode === 'preset'
        ? TEMPLATE_PRESETS.find(p => p.id === selectedPresetId)?.name || 'قالب جاهز'
        : savedTemplatesList.find(d => d.id === selectedSavedDraftId)?.name || 'قالب مخصص';

    const generatedCertificates: CertificateData[] = names.map((name, idx) => {
      const detectedGender = detectGenderFromName(name);
      const vCode = generateVerificationCode();

      let cert: CertificateData = {
        ...templateBase,
        id: `batch-cert-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
        studentName: name,
        grade: grade || templateBase.grade || 'الصف الدراسي',
        subject: subject || templateBase.subject || 'التفوق والتميز',
        schoolName: schoolName || templateBase.schoolName || 'المدرسة',
        verificationCode: vCode,
        qrCodeData: `${window.location.origin}/verify?code=${vCode}`,
        updatedAt: new Date().toISOString(),
        isSavedCloud: false
      };

      if (customAppreciation.trim()) {
        cert.appreciationText = customAppreciation.replace(/{الاسم}/g, name);
      }

      if (autoGenderAdapt) {
        cert = adaptCertificateGender(cert, detectedGender, { preserveCustomStudentName: true });
      }

      return applyDefaultsToCertificate(cert, savedDefaults);
    });

    const newBatchRecord: BatchRecord = {
      id: `batch-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: batchTitle.trim() || `دفعة شهادات ${grade}`,
      grade: grade || 'الصف الدراسي',
      subject: subject || 'المادة / المجال',
      templateType: templateSelectionMode,
      templateId: templateSelectionMode === 'preset' ? selectedPresetId : templateSelectionMode === 'saved' ? selectedSavedDraftId : undefined,
      templateName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      totalCount: generatedCertificates.length,
      certificates: generatedCertificates,
      isVerifiedOnDrive: false
    };

    // Save permanently in system
    saveBatchRecord(newBatchRecord);
    setSavedBatches(getSavedBatches());

    // Open Batch Viewer Modal
    setViewerBatch(newBatchRecord);
    setIsViewerOpen(true);

    showToast(`تم بنجاح توليد وحفظ دفعة ${generatedCertificates.length} شهادة! 🎓✨`);
  };

  const handleOpenExistingBatch = (batch: BatchRecord) => {
    setViewerBatch(batch);
    setIsViewerOpen(true);
  };

  const handleDeleteBatch = (batchId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('هل أنت متأكد من حذف هذه الدفعة من السجل؟')) {
      deleteBatchRecord(batchId);
      setSavedBatches(getSavedBatches());
      showToast('تم حذف الدفعة من السجل');
    }
  };

  const selectedPreset = TEMPLATE_PRESETS.find(p => p.id === selectedPresetId);

  return (
    <div className="max-w-7xl mx-auto space-y-6 text-right">
      
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-amber-300 border border-amber-500/40 px-5 py-3 rounded-2xl shadow-2xl text-xs font-black flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4 text-amber-400" />
          {toastMessage}
        </div>
      )}

      {/* Main Top Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 text-white p-6 rounded-3xl shadow-xl border border-amber-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-amber-500/20 text-amber-300 rounded-2xl border border-amber-500/30">
              <Users className="w-7 h-7" />
            </span>
            <div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight">مولد الشهادات الجماعية للدفعة بالفصل</h2>
              <p className="text-xs text-amber-200/80 mt-1">
                توليد فوري لدفعات الشهادات، اختيار القالب المعتمد، تجميع الشهادات في ملف PDF واحد للطباعة، وتوثيق جماعي على Google Drive مع باركود مستقل لكل طالب.
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center bg-slate-900/90 p-1.5 rounded-2xl border border-slate-700/80 shrink-0">
          <button
            onClick={() => setActiveTab('create')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'create'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>توليد دفعة جديدة</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'history'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>سجل الدفعات المحفوظة</span>
            {savedBatches.length > 0 && (
              <span className="text-[10px] bg-amber-950/80 text-amber-300 px-2 py-0.5 rounded-full font-bold border border-amber-500/30">
                {savedBatches.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* TAB 1: CREATE NEW BATCH */}
      {activeTab === 'create' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Right Input Form Column (7 Cols) */}
          <div className="lg:col-span-7 bg-white p-5 sm:p-6 rounded-3xl shadow-sm border border-slate-200 space-y-5">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-amber-600" />
                بيانات الدفعة وقائمة الطلاب
              </h3>
              <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500">
                <span>نماذج سريعة:</span>
                <button onClick={() => handleInsertSample('boys')} className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md">طلاب</button>
                <button onClick={() => handleInsertSample('girls')} className="px-2 py-0.5 bg-pink-50 hover:bg-pink-100 text-pink-700 rounded-md">طالبات</button>
                <button onClick={() => handleInsertSample('mixed')} className="px-2 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-md">مختلط</button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-800 mb-1">
                عنوان الدفعة (للسجل والتوثيق):
              </label>
              <input
                type="text"
                value={batchTitle}
                onChange={(e) => setBatchTitle(e.target.value)}
                placeholder="مثال: دفعة تكريم متفوقي الصف الأول الثانوي - الفصل الثاني"
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-extrabold text-slate-800">
                  قائمة أسماء الطلاب (اسم الطالب في كل سطر):
                </label>
                <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                  العدد: {studentInput.split('\n').filter(s => s.trim().length > 0).length} طالب
                </span>
              </div>
              <textarea
                rows={7}
                value={studentInput}
                onChange={(e) => setStudentInput(e.target.value)}
                placeholder="أدخل أسماء الطلاب، اسم في كل سطر..."
                className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-2xl font-mono leading-relaxed focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-extrabold text-slate-800 mb-1">الصف الدراسي / الشعبة:</label>
                <input
                  type="text"
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  placeholder="مثال: الصف الأول الثانوي - شعبة 1"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-800 mb-1">المادة / مجال التكريم:</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="مثال: التفوق الدراسي العام"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-800 mb-1">اسم المدرسة / الجهة المعتمدة:</label>
              <input
                type="text"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                placeholder="مثال: مدارس رواد التميز النموذجية"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-800 mb-1">
                نص التقدير والتكريم للدفعة (اختياري - يدعم متغير {'{الاسم}'}):
              </label>
              <textarea
                rows={2}
                value={customAppreciation}
                onChange={(e) => setCustomAppreciation(e.target.value)}
                placeholder="مثال: نظرًا لما أبداه {الاسم} من تميز وإبداع ملهم وتفوق دراسي باهر..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl leading-relaxed"
              />
            </div>

            <div className="bg-amber-50/70 border border-amber-200/80 p-3.5 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                <div>
                  <span className="text-xs font-black text-amber-950 block">المطابقة اللغوية الذكية للجنس (طالب / طالبة)</span>
                  <span className="text-[11px] text-amber-800">تعديل الصيغ تلقائياً: له/لها، المتميز/المتميزة، الطالب/الطالبة</span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={autoGenderAdapt}
                onChange={(e) => setAutoGenderAdapt(e.target.checked)}
                className="w-4 h-4 text-amber-600 rounded cursor-pointer accent-amber-600"
              />
            </div>

            {/* Main Generate & View Action Button */}
            <button
              onClick={handleGenerateAndSaveBatch}
              className="w-full py-4 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-sm rounded-2xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-5 h-5 text-slate-950" />
              <span>توليد دفعة الشهادات وفتح نافذة الاستعراض والطباعة</span>
            </button>

          </div>

          {/* Left Template Selection Column (5 Cols) */}
          <div className="lg:col-span-5 bg-white p-5 sm:p-6 rounded-3xl shadow-sm border border-slate-200 space-y-4">
            <h3 className="font-black text-sm text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Palette className="w-4 h-4 text-amber-600" />
              اختيار القالب المعتمد للدفعة
            </h3>

            {/* Template Source Tabs */}
            <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1.5 rounded-2xl">
              <button
                onClick={() => setTemplateSelectionMode('current')}
                className={`py-2 text-[11px] font-black rounded-xl transition flex flex-col items-center gap-0.5 cursor-pointer ${
                  templateSelectionMode === 'current'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-amber-600" />
                <span>تصميم المحرر</span>
              </button>

              <button
                onClick={() => setTemplateSelectionMode('preset')}
                className={`py-2 text-[11px] font-black rounded-xl transition flex flex-col items-center gap-0.5 cursor-pointer ${
                  templateSelectionMode === 'preset'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Palette className="w-3.5 h-3.5 text-indigo-600" />
                <span>القوالب الجاهزة</span>
              </button>

              <button
                onClick={() => setTemplateSelectionMode('saved')}
                className={`py-2 text-[11px] font-black rounded-xl transition flex flex-col items-center gap-0.5 cursor-pointer ${
                  templateSelectionMode === 'saved'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Bookmark className="w-3.5 h-3.5 text-emerald-600" />
                <span>قوالبي المحفوظة</span>
              </button>
            </div>

            {/* MODE 1: CURRENT CANVAS DESIGN */}
            {templateSelectionMode === 'current' && (
              <div className="space-y-3 bg-amber-50/50 p-4 rounded-2xl border border-amber-200/80">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    اعتماد التصميم النشط حالياً في المحرر
                  </span>
                </div>
                <p className="text-xs text-amber-900 leading-relaxed">
                  سيتم تطبيق كافة الألوان، الإطارات، الأختام المعتمدة، والتوقيعات الخاصة بالشهادة المفتوحة في المحرر الرئيسي على جميع شهادات الدفعة.
                </p>

                <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                  <div className="flex justify-between text-slate-600">
                    <span>الإطار:</span>
                    <strong className="text-slate-900">{baseCertificate.frameStyle || 'افتراضي'}</strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>الخط:</span>
                    <strong className="text-slate-900">{baseCertificate.fontFamily || 'القاهرة'}</strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>الأختام والتواقيع:</span>
                    <strong className="text-slate-900">
                      {baseCertificate.signatures?.filter(s => s.show).length || 0} توقيع • {baseCertificate.stamp?.show ? 'ختم رسمي مفعل' : 'بدون ختم'}
                    </strong>
                  </div>
                </div>
              </div>
            )}

            {/* MODE 2: PRESET TEMPLATES GALLERY */}
            {templateSelectionMode === 'preset' && (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {TEMPLATE_PRESETS.map((preset) => {
                  const isSelected = selectedPresetId === preset.id;
                  return (
                    <div
                      key={preset.id}
                      onClick={() => setSelectedPresetId(preset.id)}
                      className={`p-3 rounded-2xl border transition flex items-center justify-between gap-3 cursor-pointer ${
                        isSelected
                          ? 'border-amber-500 bg-amber-50/80 shadow-sm ring-1 ring-amber-500'
                          : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${preset.thumbnailGradient} shadow-xs shrink-0`} />
                        <div>
                          <h4 className="font-black text-xs text-slate-900">{preset.name}</h4>
                          <span className="text-[10px] text-slate-500">{preset.category}</span>
                        </div>
                      </div>

                      {isSelected && (
                        <span className="p-1 bg-amber-500 text-slate-950 rounded-full">
                          <Check className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* MODE 3: SAVED TEMPLATES */}
            {templateSelectionMode === 'saved' && (
              <div className="space-y-2">
                {savedTemplatesList.length === 0 ? (
                  <div className="p-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                    <Bookmark className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="text-xs text-slate-500">لا توجد قوالب مخصصة محفوظة بعد في مدير المسودات.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {savedTemplatesList.map((draft) => {
                      const isSelected = selectedSavedDraftId === draft.id;
                      return (
                        <div
                          key={draft.id}
                          onClick={() => setSelectedSavedDraftId(draft.id)}
                          className={`p-3 rounded-2xl border transition flex items-center justify-between gap-3 cursor-pointer ${
                            isSelected
                              ? 'border-emerald-500 bg-emerald-50/80 shadow-sm ring-1 ring-emerald-500'
                              : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                          }`}
                        >
                          <div>
                            <h4 className="font-black text-xs text-slate-900">{draft.name}</h4>
                            <span className="text-[10px] text-slate-500">{new Date(draft.createdAt).toLocaleDateString('ar-SA')}</span>
                          </div>

                          {isSelected && (
                            <span className="p-1 bg-emerald-600 text-white rounded-full">
                              <Check className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

          </div>

        </div>
      )}

      {/* TAB 2: SAVED BATCHES HISTORY */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200">
            <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              سجل الدفعات المحفوظة في النظام ({savedBatches.length})
            </h3>
            <button
              onClick={() => setActiveTab('create')}
              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl transition flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              توليد دفعة جديدة
            </button>
          </div>

          {savedBatches.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-3xl border border-dashed border-slate-300 space-y-3">
              <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-3xl flex items-center justify-center mx-auto text-2xl">
                📂
              </div>
              <h4 className="font-black text-base text-slate-900">لا توجد أي دفعات محفوظة بعد</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                عند توليد أي دفعة شهادات، سيتم حفظها تلقائياً هنا في السجل لتتمكن من استعراضها وتصدير ملف PDF المجمع وتوثيقها على Google Drive في أي وقت.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedBatches.map((batch) => (
                <div
                  key={batch.id}
                  onClick={() => handleOpenExistingBatch(batch)}
                  className="bg-white p-5 rounded-3xl border border-slate-200 hover:border-amber-400 shadow-sm hover:shadow-md transition space-y-4 cursor-pointer relative group flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                      <span className="text-xs font-black bg-amber-50 text-amber-800 px-3 py-1 rounded-full border border-amber-200">
                        {batch.totalCount} شهادة
                      </span>
                      {batch.isVerifiedOnDrive ? (
                        <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-300 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" /> موثقة بدرايف
                        </span>
                      ) : (
                        <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium">
                          سجل محلي
                        </span>
                      )}
                    </div>

                    <h4 className="font-black text-sm text-slate-900 group-hover:text-amber-600 transition">
                      {batch.title}
                    </h4>

                    <p className="text-xs text-slate-500">
                      {batch.grade} • {batch.subject}
                    </p>

                    <div className="text-[11px] text-slate-400 flex items-center gap-1 pt-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{new Date(batch.createdAt).toLocaleDateString('ar-SA')}</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-extrabold text-amber-600 flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" />
                      استعراض وطباعة الدفعة
                    </span>

                    <button
                      onClick={(e) => handleDeleteBatch(batch.id, e)}
                      className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition"
                      title="حذف الدفعة من السجل"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* DEDICATED BATCH CERTIFICATE VIEWER MODAL */}
      {viewerBatch && (
        <BatchCertificateViewerModal
          isOpen={isViewerOpen}
          onClose={() => setIsViewerOpen(false)}
          batch={viewerBatch}
          onUpdateBatch={(updated) => {
            setViewerBatch(updated);
            setSavedBatches(getSavedBatches());
          }}
          onApplySingleToEditor={(cert) => {
            onApplySingleToEditor(cert);
            setIsViewerOpen(false);
          }}
          onShowToast={showToast}
        />
      )}

    </div>
  );
};
