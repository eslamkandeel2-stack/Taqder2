import React, { useState, useEffect } from 'react';
import { StudentGroup, StudentGroupMember } from '../types';
import {
  getSavedStudentGroups,
  saveStudentGroup,
  deleteStudentGroup,
  duplicateStudentGroup,
  subscribeToStudentGroups,
  parseStudentsText,
  exportStudentGroupsJson,
  importStudentGroupsJson
} from '../utils/studentGroupsManager';
import { detectGenderFromName } from '../utils/genderConverter';
import { useDragScroll } from '../utils/useDragScroll';
import {
  Users,
  UserPlus,
  Plus,
  Trash2,
  Edit3,
  Copy,
  Check,
  Search,
  BookOpen,
  Award,
  Sparkles,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  Download,
  Upload,
  CheckCircle2,
  FolderPlus,
  GraduationCap,
  Layers,
  ArrowRight,
  Filter,
  X,
  Palette,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface Props {
  onSelectGroupForBatch?: (group: StudentGroup, selectedStudentIds?: string[]) => void;
  onSelectMultipleGroupsForBatch?: (groups: StudentGroup[], selectedStudentIds?: string[]) => void;
  onClose?: () => void;
}

const COLOR_PALETTE = [
  { name: 'أزرق ملكي', value: '#3b82f6' },
  { name: 'وردي أنيق', value: '#ec4899' },
  { name: 'أرجواني مبدع', value: '#8b5cf6' },
  { name: 'زمردي متميز', value: '#10b981' },
  { name: 'ذهبي عنبري', value: '#f59e0b' },
  { name: 'سماوي بحري', value: '#06b6d4' },
  { name: 'نيلي داكن', value: '#6366f1' },
  { name: 'برتقالي متألق', value: '#f97316' },
];

export const StudentGroupsManager: React.FC<Props> = ({
  onSelectGroupForBatch,
  onSelectMultipleGroupsForBatch,
  onClose
}) => {
  const [groups, setGroups] = useState<StudentGroup[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  
  // Quick student picker modal for single group selection
  const [pickerGroup, setPickerGroup] = useState<StudentGroup | null>(null);
  const [selectedStudentIdsInPicker, setSelectedStudentIdsInPicker] = useState<string[]>([]);
  const [pickerSearchQuery, setPickerSearchQuery] = useState('');

  // Active editing or new group modal
  const [editingGroup, setEditingGroup] = useState<StudentGroup | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [batchPasteText, setBatchPasteText] = useState('');
  const [activeEditorTab, setActiveEditorTab] = useState<'students' | 'bulk' | 'settings'>('students');
  const modalTabsDrag = useDragScroll();

  // Single new student input row
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentGender, setNewStudentGender] = useState<'male' | 'female'>('male');

  // Toast / notification
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  useEffect(() => {
    setGroups(getSavedStudentGroups());
    const unsub = subscribeToStudentGroups(() => {
      setGroups(getSavedStudentGroups());
    });
    return () => unsub();
  }, []);

  // Filter groups
  const filteredGroups = groups.filter(g => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      g.name.toLowerCase().includes(q) ||
      (g.grade && g.grade.toLowerCase().includes(q)) ||
      (g.subject && g.subject.toLowerCase().includes(q)) ||
      g.students.some(s => s.name.toLowerCase().includes(q))
    );
  });

  // Create new blank group
  const handleStartCreateGroup = () => {
    const newG: StudentGroup = {
      id: `group-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: '',
      description: '',
      grade: '',
      subject: 'التفوق والتميز الدراسي',
      defaultGender: 'male',
      color: '#3b82f6',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      students: []
    };
    setEditingGroup(newG);
    setIsCreatingNew(true);
    setActiveEditorTab('students');
    setBatchPasteText('');
    setNewStudentName('');
    setNewStudentGender('male');
  };

  const handleSaveGroup = (groupToSave: StudentGroup | null) => {
    if (!groupToSave) return;

    let updatedStudents = [...groupToSave.students];

    // Auto-flush single student input if user forgot to click "إضافة"
    if (newStudentName.trim()) {
      const detected = detectGenderFromName(newStudentName.trim());
      const finalGender = newStudentGender || detected;
      updatedStudents.push({
        id: `st-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: newStudentName.trim(),
        gender: finalGender,
        grade: groupToSave.grade || '',
        subject: groupToSave.subject || ''
      });
      setNewStudentName('');
    }

    // Auto-flush bulk paste input if user pasted names without clicking add
    if (batchPasteText.trim()) {
      const parsed = parseStudentsText(batchPasteText, {
        grade: groupToSave.grade,
        subject: groupToSave.subject,
        defaultGender: groupToSave.defaultGender
      });
      if (parsed.length > 0) {
        updatedStudents = [...updatedStudents, ...parsed];
      }
      setBatchPasteText('');
    }

    const finalName = groupToSave.name.trim() || (isCreatingNew ? `مجموعة جديدة (${new Date().toLocaleDateString('ar-SA')})` : groupToSave.name);

    if (!finalName.trim()) {
      showToast('يرجى كتابة اسم المجموعة');
      return;
    }

    const finalGroup: StudentGroup = {
      ...groupToSave,
      name: finalName,
      students: updatedStudents,
      updatedAt: new Date().toISOString()
    };

    saveStudentGroup(finalGroup);
    setEditingGroup(null);
    setIsCreatingNew(false);
    showToast(`تم حفظ مجموعة "${finalName}" بنجاح وتضم (${updatedStudents.length}) طالب! ✅`);
  };

  const handleDeleteGroup = (groupId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const g = groups.find(x => x.id === groupId);
    if (window.confirm(`هل أنت متأكد من حذف مجموعة "${g?.name || 'الطلاب'}" وجميع أسمائها؟`)) {
      deleteStudentGroup(groupId);
      setSelectedGroupIds(prev => prev.filter(id => id !== groupId));
      showToast('تم حذف المجموعة من السجل');
    }
  };

  const handleDuplicate = (groupId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const dup = duplicateStudentGroup(groupId);
    if (dup) {
      showToast(`تم إنشاء نسخة من المجموعة: "${dup.name}"`);
    }
  };

  // Add single student in modal
  const handleAddSingleStudent = () => {
    const trimmed = newStudentName.trim();
    if (!trimmed) {
      showToast('يرجى كتابة اسم الطالب أولاً في الحقل');
      return;
    }
    if (!editingGroup) return;

    const detected = detectGenderFromName(trimmed);
    const finalGender = newStudentGender || detected;

    const newStudent: StudentGroupMember = {
      id: `st-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: trimmed,
      gender: finalGender,
      grade: editingGroup.grade || '',
      subject: editingGroup.subject || ''
    };

    setEditingGroup({
      ...editingGroup,
      students: [...editingGroup.students, newStudent]
    });
    setNewStudentName('');
    showToast(`تمت إضافة "${trimmed}" (${finalGender === 'female' ? 'طالبة 👧' : 'طالب 👦'}) للقائمة`);
  };

  // Batch append students in modal
  const handleAppendBulkStudents = () => {
    if (!batchPasteText.trim() || !editingGroup) return;
    const parsed = parseStudentsText(batchPasteText, {
      grade: editingGroup.grade,
      subject: editingGroup.subject,
      defaultGender: editingGroup.defaultGender
    });
    if (parsed.length === 0) {
      showToast('لم يتم العثور على أسماء صالحة في النص');
      return;
    }
    setEditingGroup({
      ...editingGroup,
      students: [...editingGroup.students, ...parsed]
    });
    setBatchPasteText('');
    setActiveEditorTab('students');
    showToast(`تمت إضافة ${parsed.length} اسم إلى المجموعة! ✨`);
  };

  // Toggle selection for multiple groups
  const toggleGroupSelection = (groupId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedGroupIds(prev =>
      prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId]
    );
  };

  const handleSelectAllGroups = () => {
    if (selectedGroupIds.length === filteredGroups.length) {
      setSelectedGroupIds([]);
    } else {
      setSelectedGroupIds(filteredGroups.map(g => g.id));
    }
  };

  // Export / Backup
  const handleExportJson = () => {
    const dataStr = exportStudentGroupsJson();
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `سجل_مجموعات_الطلاب_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('تم تصدير نسخة احتياطية من سجل المجموعات 💾');
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content && importStudentGroupsJson(content)) {
        showToast('تم استيراد سجل المجموعات بنجاح! 📥');
      } else {
        showToast('فشل استيراد الملف، تأكد من صحة التنسيق.');
      }
    };
    reader.readAsText(file);
  };

  // Trigger batch generation for selected groups
  const handleGenerateForSelectedGroups = () => {
    const chosenGroups = groups.filter(g => selectedGroupIds.includes(g.id));
    if (chosenGroups.length === 0) {
      showToast('يرجى تحديد مجموعة واحدة على الأقل');
      return;
    }
    if (onSelectMultipleGroupsForBatch) {
      onSelectMultipleGroupsForBatch(chosenGroups);
    } else if (onSelectGroupForBatch && chosenGroups[0]) {
      onSelectGroupForBatch(chosenGroups[0]);
    }
  };

  // Open quick student picker for single group
  const handleOpenPicker = (group: StudentGroup, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setPickerGroup(group);
    setSelectedStudentIdsInPicker(group.students.map(s => s.id));
    setPickerSearchQuery('');
  };

  // Apply picked students for batch generation
  const handleApplyPickedStudents = () => {
    if (!pickerGroup) return;
    if (selectedStudentIdsInPicker.length === 0) {
      showToast('يرجى اختيار طالب واحد على الأقل من المجموعة');
      return;
    }
    if (onSelectGroupForBatch) {
      onSelectGroupForBatch(pickerGroup, selectedStudentIdsInPicker);
    }
    setPickerGroup(null);
  };

  return (
    <div className="w-full space-y-6 dir-rtl text-right">
      
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-amber-300 px-5 py-2.5 rounded-2xl shadow-2xl border border-amber-500/40 text-xs font-bold flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center font-black shadow-inner">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                  سجل مجموعات وفصول الطلاب
                  <span className="text-xs font-bold bg-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                    {groups.length} مجموعات • {groups.reduce((acc, g) => acc + g.students.length, 0)} طالب وطالبة
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  احفظ قوائم الفصول والأنشطة لتوليد شهادات الدفعات بضغطة زر للمجموعة كاملة أو لطلاب محددين.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleStartCreateGroup}
              className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs rounded-xl shadow-lg flex items-center gap-2 transition cursor-pointer"
            >
              <FolderPlus className="w-4 h-4" />
              <span>+ إنشاء مجموعة جديدة</span>
            </button>

            <button
              onClick={handleExportJson}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
              title="تصدير نسخة احتياطية من جميع المجموعات"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>تصدير نسخة</span>
            </button>

            <label className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-1.5 transition cursor-pointer">
              <Upload className="w-3.5 h-3.5 text-sky-400" />
              <span>استيراد</span>
              <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
            </label>
          </div>
        </div>

        {/* Search & Bulk Multi-Select Bar */}
        <div className="mt-5 pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث باسم المجموعة، الصف، أو اسم الطالب..."
              className="w-full pl-3 pr-9 py-2 bg-slate-950 border border-slate-800 text-xs rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            {filteredGroups.length > 0 && (
              <button
                onClick={handleSelectAllGroups}
                className="text-xs text-slate-400 hover:text-white px-2.5 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 transition"
              >
                {selectedGroupIds.length === filteredGroups.length ? 'إلغاء تحديد الكل' : 'تحديد جميع المجموعات'}
              </button>
            )}

            {selectedGroupIds.length > 0 && (
              <button
                onClick={handleGenerateForSelectedGroups}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-lg transition flex items-center gap-2 animate-pulse cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>توليد شهادات لـ ({selectedGroupIds.length}) مجموعة محددة</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Groups Grid */}
      {filteredGroups.length === 0 ? (
        <div className="bg-slate-900/60 border-2 border-dashed border-slate-800 rounded-3xl p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-slate-800 text-amber-400 mx-auto flex items-center justify-center">
            <Users className="w-8 h-8 opacity-60" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-white">لا توجد مجموعات طلاب مطابقة</h3>
            <p className="text-xs text-slate-400 mt-1">
              {searchQuery ? 'لم يتم العثور على نتائج للبحث. جرب كلمة أخرى.' : 'ابدأ بإنشاء مجموعة جديدة لفصل دراسي أو نادي أنشطة.'}
            </p>
          </div>
          <button
            onClick={handleStartCreateGroup}
            className="px-4 py-2 bg-amber-500 text-slate-950 text-xs font-black rounded-xl hover:bg-amber-400 transition"
          >
            + إنشاء أول مجموعة الآن
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredGroups.map((group) => {
            const isSelected = selectedGroupIds.includes(group.id);
            const maleCount = group.students.filter(s => s.gender === 'male').length;
            const femaleCount = group.students.filter(s => s.gender === 'female').length;

            return (
              <div
                key={group.id}
                onClick={() => toggleGroupSelection(group.id)}
                className={`bg-slate-900 border ${
                  isSelected
                    ? 'border-amber-400 ring-2 ring-amber-400/40 bg-slate-900/95'
                    : 'border-slate-800 hover:border-slate-700'
                } rounded-3xl p-5 flex flex-col justify-between gap-4 shadow-md transition relative group cursor-pointer`}
              >
                {/* Accent Top Color Bar */}
                <div
                  className="absolute top-0 right-6 left-6 h-1 rounded-b-full"
                  style={{ backgroundColor: group.color || '#3b82f6' }}
                />

                {/* Card Top */}
                <div className="flex items-start justify-between gap-3 pt-1">
                  <div className="flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleGroupSelection(group.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-1 w-4 h-4 rounded text-amber-500 focus:ring-amber-500 bg-slate-800 border-slate-700 cursor-pointer"
                    />
                    <div>
                      <h3 className="font-black text-base text-white group-hover:text-amber-300 transition flex items-center gap-2">
                        {group.name}
                      </h3>
                      <p className="text-xs text-slate-400 font-medium mt-0.5">
                        {group.grade || 'غير محدد الصف'} • {group.subject || 'عام'}
                      </p>
                    </div>
                  </div>

                  {/* Group Count Pill */}
                  <span className="text-[11px] font-black bg-slate-800 text-amber-300 px-2.5 py-1 rounded-xl border border-slate-700 shrink-0">
                    {group.students.length} طالب
                  </span>
                </div>

                {/* Description if present */}
                {group.description && (
                  <p className="text-xs text-slate-400 line-clamp-2 bg-slate-950/60 p-2 rounded-xl border border-slate-800/80">
                    {group.description}
                  </p>
                )}

                {/* Students Preview (First 4 names) */}
                <div className="space-y-1.5">
                  <div className="text-[11px] text-slate-400 font-bold flex items-center justify-between">
                    <span>الأسماء المسجلة:</span>
                    <div className="flex items-center gap-1.5 text-[10px]">
                      {maleCount > 0 && <span className="text-sky-400 font-medium">{maleCount} بنين</span>}
                      {femaleCount > 0 && <span className="text-pink-400 font-medium">{femaleCount} بنات</span>}
                    </div>
                  </div>

                  <div className="bg-slate-950/80 rounded-2xl p-2.5 border border-slate-800 space-y-1 max-h-28 overflow-y-auto">
                    {group.students.length === 0 ? (
                      <p className="text-[11px] text-slate-500 italic text-center py-2">لا يوجد طلاب مسجلون بعد</p>
                    ) : (
                      group.students.slice(0, 5).map((st, idx) => (
                        <div key={st.id} className="text-xs text-slate-300 flex items-center justify-between">
                          <span className="truncate">
                            <span className="text-slate-500 text-[10px] ml-1">#{idx + 1}</span>
                            {st.name}
                          </span>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${st.gender === 'female' ? 'bg-pink-950 text-pink-300' : 'bg-sky-950 text-sky-300'}`}>
                            {st.gender === 'female' ? 'طالبة' : 'طالب'}
                          </span>
                        </div>
                      ))
                    )}
                    {group.students.length > 5 && (
                      <p className="text-[10px] text-amber-400/90 font-bold text-center pt-1 border-t border-slate-800/60">
                        + {group.students.length - 5} طلاب إضافيين في المجموعة
                      </p>
                    )}
                  </div>
                </div>

                {/* Card Bottom Actions */}
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingGroup(group);
                        setIsCreatingNew(false);
                        setActiveEditorTab('students');
                      }}
                      className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition cursor-pointer"
                      title="تعديل المجموعة والأسماء"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={(e) => handleDuplicate(group.id, e)}
                      className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition cursor-pointer"
                      title="نسخ المجموعة"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={(e) => handleDeleteGroup(group.id, e)}
                      className="p-2 bg-rose-950/40 hover:bg-rose-900 text-rose-300 rounded-xl transition cursor-pointer"
                      title="حذف المجموعة"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Primary Action Buttons: Generate All or Pick Students */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => handleOpenPicker(group, e)}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 font-bold text-xs rounded-xl border border-slate-700 transition flex items-center gap-1 cursor-pointer"
                      title="اختيار بعض الطلاب فقط من هذه المجموعة"
                    >
                      <Filter className="w-3 h-3" />
                      <span>اختيار طلاب</span>
                    </button>

                    <button
                      onClick={() => {
                        if (onSelectGroupForBatch) {
                          onSelectGroupForBatch(group);
                        }
                      }}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow transition flex items-center gap-1.5 cursor-pointer"
                      title="توليد شهادات لكافة طلاب المجموعة"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>توليد للكل ({group.students.length})</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* GROUP EDITOR / ROSTER MODAL */}
      {editingGroup && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full text-right shadow-2xl flex flex-col max-h-[90vh] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-4 h-8 rounded-full"
                  style={{ backgroundColor: editingGroup.color || '#3b82f6' }}
                />
                <div>
                  <h3 className="text-base font-black text-white">
                    {isCreatingNew ? 'إنشاء مجموعة طلاب جديدة' : `تعديل مجموعة: ${editingGroup.name}`}
                  </h3>
                  <p className="text-xs text-slate-400">
                    عدد الطلاب الحاليين: <span className="text-amber-300 font-bold">{editingGroup.students.length}</span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setEditingGroup(null);
                  setIsCreatingNew(false);
                }}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">

              {/* Always-Visible Top Card: Group Name & Essential Meta */}
              <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-3.5 space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <div className="flex-1 w-full">
                    <label className="block text-xs font-black text-amber-300 mb-1">
                      اسم المجموعة / الفصل <span className="text-rose-400">*</span>:
                    </label>
                    <input
                      type="text"
                      value={editingGroup.name}
                      onChange={(e) => setEditingGroup({ ...editingGroup, name: e.target.value })}
                      placeholder="مثال: الصف الرابع الابتدائي - شعبة أ"
                      className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 text-xs rounded-xl text-white font-black placeholder-slate-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    <span className="text-[11px] text-slate-400 font-bold">اللون:</span>
                    <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                      {COLOR_PALETTE.slice(0, 5).map((c) => (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => setEditingGroup({ ...editingGroup, color: c.value })}
                          className={`w-5 h-5 rounded-full transition ${
                            editingGroup.color === c.value ? 'ring-2 ring-white scale-110' : 'opacity-60 hover:opacity-100'
                          }`}
                          style={{ backgroundColor: c.value }}
                          title={c.name}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 border-t border-slate-800/80">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">الصف الدراسي الافتراضي:</label>
                    <input
                      type="text"
                      value={editingGroup.grade || ''}
                      onChange={(e) => setEditingGroup({ ...editingGroup, grade: e.target.value })}
                      placeholder="مثال: الصف الرابع الابتدائي"
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 text-xs rounded-xl text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">المادة / مجال التكريم:</label>
                    <input
                      type="text"
                      value={editingGroup.subject || ''}
                      onChange={(e) => setEditingGroup({ ...editingGroup, subject: e.target.value })}
                      placeholder="مثال: التفوق والتميز الدراسي"
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 text-xs rounded-xl text-slate-200"
                    />
                  </div>
                </div>
              </div>

              {/* Sub-Tabs: Students List / Bulk Paste (Draggable Single Row) */}
              <div className="relative">
                <div
                  ref={modalTabsDrag.scrollRef}
                  onMouseDown={modalTabsDrag.onMouseDown}
                  onMouseLeave={modalTabsDrag.onMouseLeave}
                  onMouseUp={modalTabsDrag.onMouseUp}
                  onMouseMove={modalTabsDrag.onMouseMove}
                  className="p-1.5 bg-slate-950 rounded-2xl border border-slate-800 flex items-center gap-2 overflow-x-auto no-scrollbar touch-pan-x cursor-grab active:cursor-grabbing select-none"
                >
                  <button
                    type="button"
                    onClick={() => setActiveEditorTab('students')}
                    className={`shrink-0 whitespace-nowrap px-4 py-2.5 text-xs font-black rounded-xl transition flex items-center gap-2 cursor-pointer ${
                      activeEditorTab === 'students'
                        ? 'bg-amber-500 text-slate-950 shadow-md ring-2 ring-amber-400/40'
                        : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent hover:border-slate-800'
                    }`}
                  >
                    <Users className="w-4 h-4 shrink-0" />
                    <span>إضافة طالب طالب</span>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold font-mono ${
                      activeEditorTab === 'students'
                        ? 'bg-slate-950 text-amber-300'
                        : 'bg-slate-800 text-slate-300'
                    }`}>
                      ({editingGroup.students.length})
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveEditorTab('bulk')}
                    className={`shrink-0 whitespace-nowrap px-4 py-2.5 text-xs font-black rounded-xl transition flex items-center gap-2 cursor-pointer ${
                      activeEditorTab === 'bulk'
                        ? 'bg-amber-500 text-slate-950 shadow-md ring-2 ring-amber-400/40'
                        : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent hover:border-slate-800'
                    }`}
                  >
                    <FileSpreadsheet className="w-4 h-4 shrink-0" />
                    <span>لصق أسماء جماعية (إكسل / وورد)</span>
                  </button>
                </div>
              </div>
              
              {/* TAB 1: STUDENTS ROSTER LIST */}
              {activeEditorTab === 'students' && (
                <div className="space-y-3">
                  {/* Add Single Student Bar */}
                  <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-2">
                    <label className="block text-xs font-extrabold text-slate-300">
                      إضافة طالب جديد إلى هذه المجموعة:
                    </label>
                    <div className="flex flex-col sm:flex-row items-center gap-2">
                      <input
                        type="text"
                        value={newStudentName}
                        onChange={(e) => {
                          setNewStudentName(e.target.value);
                          setNewStudentGender(detectGenderFromName(e.target.value));
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddSingleStudent();
                          }
                        }}
                        placeholder="اكتب اسم الطالب واضغط زر إضافة (مثال: فيصل بن خالد)..."
                        className="w-full flex-1 px-3.5 py-2.5 bg-slate-900 border border-slate-700 text-xs rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                      />

                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <select
                          value={newStudentGender}
                          onChange={(e) => setNewStudentGender(e.target.value as 'male' | 'female')}
                          className="px-3 py-2.5 bg-slate-900 border border-slate-700 text-xs font-bold rounded-xl text-slate-200"
                        >
                          <option value="male">طالب 👦 (بنين)</option>
                          <option value="female">طالبة 👧 (بنات)</option>
                        </select>

                        <button
                          type="button"
                          onClick={handleAddSingleStudent}
                          className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-xs rounded-xl shadow transition flex items-center gap-1.5 shrink-0 cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          <span>إضافة</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Students Table */}
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
                    <div className="p-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
                      <span className="font-bold">
                        الطلاب المضافون في المجموعة: <strong className="text-white">({editingGroup.students.length})</strong>
                      </span>
                      <span className="text-[11px] text-amber-300 font-mono">
                        ({editingGroup.students.filter(s => s.gender === 'male').length} بنين 👦 • {editingGroup.students.filter(s => s.gender === 'female').length} بنات 👧)
                      </span>
                    </div>

                    {editingGroup.students.length === 0 ? (
                      <div className="p-8 text-center space-y-2">
                        <Users className="w-8 h-8 text-slate-600 mx-auto" />
                        <p className="text-xs text-slate-400">لا يوجد طلاب مضافون في هذه المجموعة بعد.</p>
                        <p className="text-[11px] text-slate-500">اكتب اسم الطالب بالأعلى ثم اضغط «إضافة»، أو استخدم اللصق الجماعي.</p>
                      </div>
                    ) : (
                      <div className="max-h-[300px] overflow-y-auto divide-y divide-slate-800/80">
                        {editingGroup.students.map((st, idx) => (
                          <div key={st.id} className="p-2.5 flex items-center justify-between gap-3 hover:bg-slate-900/60 transition">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <span className="font-mono text-[11px] text-slate-500 w-6 shrink-0">#{idx + 1}</span>
                              <input
                                type="text"
                                value={st.name}
                                onChange={(e) => {
                                  const updated = [...editingGroup.students];
                                  updated[idx] = { ...st, name: e.target.value };
                                  setEditingGroup({ ...editingGroup, students: updated });
                                }}
                                className="bg-transparent border-0 text-xs font-bold text-white focus:ring-1 focus:ring-amber-500 rounded px-1.5 py-0.5 w-full"
                              />
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = [...editingGroup.students];
                                  updated[idx] = { ...st, gender: st.gender === 'female' ? 'male' : 'female' };
                                  setEditingGroup({ ...editingGroup, students: updated });
                                }}
                                className={`text-[11px] font-black px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                                  st.gender === 'female'
                                    ? 'bg-pink-950/60 text-pink-300 border-pink-500/40 hover:bg-pink-900/80'
                                    : 'bg-sky-950/60 text-sky-300 border-sky-500/40 hover:bg-sky-900/80'
                                }`}
                                title="انقر لتغيير الجنس بين طالب وطالبة"
                              >
                                {st.gender === 'female' ? 'طالبة 👧' : 'طالب 👦'}
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  const updated = editingGroup.students.filter((_, i) => i !== idx);
                                  setEditingGroup({ ...editingGroup, students: updated });
                                }}
                                className="p-1 text-slate-500 hover:text-rose-400 rounded transition cursor-pointer"
                                title="حذف الطالب من المجموعة"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: BULK FAST PASTE */}
              {activeEditorTab === 'bulk' && (
                <div className="space-y-3">
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3 text-xs text-amber-200 flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">الصق قائمة الأسماء بكل سهولة:</p>
                      <p className="text-[11px] text-amber-300/80 mt-0.5">
                        يمكنك نسخ عمود كامل من إكسل، وورد، أو نظام نور ولصقه هنا (اسم واحد في كل سطر). سيتعرف النظام تلقائياً على جنس الأسماء (بنين / بنات).
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      نص الأسماء (سطر لكل طالب):
                    </label>
                    <textarea
                      rows={7}
                      value={batchPasteText}
                      onChange={(e) => setBatchPasteText(e.target.value)}
                      placeholder={'أحمد بن محمد العتيبي\nسارة بنت خالد الغامدي\nعمر بن فيصل الشمري\nريما بنت ناصر الدوسري'}
                      className="w-full p-3 bg-slate-950 border border-slate-700 text-xs rounded-2xl text-white font-mono leading-relaxed placeholder-slate-600 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleAppendBulkStudents}
                    disabled={!batchPasteText.trim()}
                    className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-black text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>إضافة هذه الأسماء إلى المجموعة ({batchPasteText.split('\n').filter(s => s.trim().length > 0).length} اسم)</span>
                  </button>
                </div>
              )}

            </div>

            {/* Modal Bottom Footer Actions */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setEditingGroup(null);
                  setIsCreatingNew(false);
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition"
              >
                إلغاء
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSaveGroup(editingGroup)}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl shadow-lg transition flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>حفظ المجموعة</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* QUICK STUDENT PICKER MODAL FOR GROUP SELECTION */}
      {pickerGroup && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-xl w-full text-right shadow-2xl flex flex-col max-h-[85vh] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="p-4 sm:p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-3.5 h-8 rounded-full"
                  style={{ backgroundColor: pickerGroup.color || '#3b82f6' }}
                />
                <div>
                  <h3 className="text-base font-black text-white">
                    تحديد طلاب من مجموعة: {pickerGroup.name}
                  </h3>
                  <p className="text-xs text-slate-400">
                    اختر الطلاب المطلوب إصدار شهادات لهم من هذه المجموعة
                  </p>
                </div>
              </div>

              <button
                onClick={() => setPickerGroup(null)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Actions & Search Bar */}
            <div className="p-3 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={pickerSearchQuery}
                  onChange={(e) => setPickerSearchQuery(e.target.value)}
                  placeholder="ابحث باسم الطالب..."
                  className="w-full pl-3 pr-8 py-1.5 bg-slate-900 border border-slate-700 text-xs rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedStudentIdsInPicker(pickerGroup.students.map(s => s.id))}
                  className="px-2.5 py-1 text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer"
                >
                  تحديد الكل
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedStudentIdsInPicker([])}
                  className="px-2.5 py-1 text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer"
                >
                  إلغاء التحديد
                </button>
              </div>
            </div>

            {/* Students Checklist */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {pickerGroup.students.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">لا يوجد طلاب مسجلون في هذه المجموعة.</p>
              ) : (
                pickerGroup.students
                  .filter(s => !pickerSearchQuery.trim() || s.name.toLowerCase().includes(pickerSearchQuery.toLowerCase().trim()))
                  .map((st) => {
                    const isChecked = selectedStudentIdsInPicker.includes(st.id);
                    return (
                      <div
                        key={st.id}
                        onClick={() => {
                          setSelectedStudentIdsInPicker(prev =>
                            prev.includes(st.id) ? prev.filter(id => id !== st.id) : [...prev, st.id]
                          );
                        }}
                        className={`p-2.5 rounded-xl border transition flex items-center justify-between cursor-pointer ${
                          isChecked
                            ? 'bg-slate-800 border-amber-400/80 text-white'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 bg-slate-900 border-slate-700 cursor-pointer"
                          />
                          <span className="text-xs font-bold">{st.name}</span>
                        </div>

                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          st.gender === 'female' ? 'bg-pink-950 text-pink-300' : 'bg-sky-950 text-sky-300'
                        }`}>
                          {st.gender === 'female' ? 'طالبة' : 'طالب'}
                        </span>
                      </div>
                    );
                  })
              )}
            </div>

            {/* Modal Bottom Footer */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3 shrink-0">
              <span className="text-xs text-slate-400 font-bold">
                المحدد: <span className="text-amber-300 font-black">{selectedStudentIdsInPicker.length}</span> من {pickerGroup.students.length} طالب
              </span>

              <button
                type="button"
                onClick={handleApplyPickedStudents}
                disabled={selectedStudentIdsInPicker.length === 0}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-black text-xs rounded-xl shadow-lg transition flex items-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>تحميل الطلاب المحددين ({selectedStudentIdsInPicker.length}) وتوليد الشهادات</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
