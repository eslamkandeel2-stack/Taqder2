import { StudentGroup, StudentGroupMember } from '../types';
import { detectGenderFromName } from './genderConverter';

const STUDENT_GROUPS_STORAGE_KEY = 'taqdeer_student_groups_v1';
const STUDENT_GROUPS_EVENT = 'taqdeer_student_groups_changed';

const INITIAL_DEFAULT_GROUPS: StudentGroup[] = [
  {
    id: 'group-fourth-grade-a',
    name: 'الصف الرابع - أ (فرسان التميز)',
    description: 'طلاب الصف الرابع الابتدائي - الشعبة (أ)',
    grade: 'الصف الرابع الابتدائي - شعبة أ',
    subject: 'التفوق العام والانضباط المدرسي',
    defaultGender: 'male',
    color: '#3b82f6',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    students: [
      { id: 'st-1', name: 'أحمد بن محمد العتيبي', gender: 'male', grade: 'الصف الرابع الابتدائي - أ', subject: 'التفوق العام' },
      { id: 'st-2', name: 'عبد الله بن خالد الشهري', gender: 'male', grade: 'الصف الرابع الابتدائي - أ', subject: 'التفوق العام' },
      { id: 'st-3', name: 'عمر بن فيصل الشمري', gender: 'male', grade: 'الصف الرابع الابتدائي - أ', subject: 'التفوق العام' },
      { id: 'st-4', name: 'ياسر بن عبد العزيز الدوسري', gender: 'male', grade: 'الصف الرابع الابتدائي - أ', subject: 'التفوق العام' },
      { id: 'st-5', name: 'فهد بن خالد الحربي', gender: 'male', grade: 'الصف الرابع الابتدائي - أ', subject: 'التفوق العام' },
      { id: 'st-6', name: 'سلطان بن إبراهيم القحطاني', gender: 'male', grade: 'الصف الرابع الابتدائي - أ', subject: 'التفوق العام' },
      { id: 'st-7', name: 'تركي بن عبد الرحمن المطيري', gender: 'male', grade: 'الصف الرابع الابتدائي - أ', subject: 'التفوق العام' },
      { id: 'st-8', name: 'زياد بن ناصر السبيعي', gender: 'male', grade: 'الصف الرابع الابتدائي - أ', subject: 'التفوق العام' },
    ]
  },
  {
    id: 'group-fourth-grade-b',
    name: 'الصف الرابع - ب (نجمات الإبداع)',
    description: 'طالبات الصف الرابع الابتدائي - الشعبة (ب)',
    grade: 'الصف الرابع الابتدائي - شعبة ب',
    subject: 'التفوق الدراسي والمشاركة الفاعلة',
    defaultGender: 'female',
    color: '#ec4899',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    students: [
      { id: 'st-101', name: 'سارة بنت خالد الغامدي', gender: 'female', grade: 'الصف الرابع الابتدائي - ب', subject: 'التفوق الدراسي' },
      { id: 'st-102', name: 'نورة بنت سعد القحطاني', gender: 'female', grade: 'الصف الرابع الابتدائي - ب', subject: 'التفوق الدراسي' },
      { id: 'st-103', name: 'ريما بنت ناصر الدوسري', gender: 'female', grade: 'الصف الرابع الابتدائي - ب', subject: 'التفوق الدراسي' },
      { id: 'st-104', name: 'جود بنت إبراهيم الماجد', gender: 'female', grade: 'الصف الرابع الابتدائي - ب', subject: 'التفوق الدراسي' },
      { id: 'st-105', name: 'مريم بنت فهد الزهراني', gender: 'female', grade: 'الصف الرابع الابتدائي - ب', subject: 'التفوق الدراسي' },
      { id: 'st-106', name: 'شهد بنت عبد الله الشهري', gender: 'female', grade: 'الصف الرابع الابتدائي - ب', subject: 'التفوق الدراسي' },
      { id: 'st-107', name: 'ليان بنت عمر الحازمي', gender: 'female', grade: 'الصف الرابع الابتدائي - ب', subject: 'التفوق الدراسي' },
      { id: 'st-108', name: 'ريناد بنت محمد السبيعي', gender: 'female', grade: 'الصف الرابع الابتدائي - ب', subject: 'التفوق الدراسي' },
    ]
  },
  {
    id: 'group-talented-innovators',
    name: 'نادي الموهبة والابتكار العلمي',
    description: 'الطلاب والطالبات المتميزون في مسابقات العلوم والذكاء الاصطناعي',
    grade: 'المرحلة الابتدائية العليا',
    subject: 'الابتكار العلمي والروبوت والذكاء الاصطناعي',
    defaultGender: 'mixed',
    color: '#8b5cf6',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    students: [
      { id: 'st-201', name: 'فيصل بن نواف الشمري', gender: 'male', grade: 'الصف الخامس', subject: 'ابتكار الروبوت' },
      { id: 'st-202', name: 'نوف بنت سلطان العتيبي', gender: 'female', grade: 'الصف السادس', subject: 'الذكاء الاصطناعي' },
      { id: 'st-203', name: 'سعود بن إبراهيم القحطاني', gender: 'male', grade: 'الصف الرابع', subject: 'المخترع الصغير' },
      { id: 'st-204', name: 'دانة بنت عبد العزيز التميمي', gender: 'female', grade: 'الصف الخامس', subject: 'البحث العلمي' },
      { id: 'st-205', name: 'بدر بن طلال الحربي', gender: 'male', grade: 'الصف السادس', subject: 'البرمجة والتطبيقات' },
      { id: 'st-206', name: 'هند بنت ماجد السليمان', gender: 'female', grade: 'الصف الرابع', subject: 'مسابقة أولمبياد الرياضيات' },
    ]
  }
];

export function getSavedStudentGroups(): StudentGroup[] {
  try {
    const raw = localStorage.getItem(STUDENT_GROUPS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STUDENT_GROUPS_STORAGE_KEY, JSON.stringify(INITIAL_DEFAULT_GROUPS));
      return INITIAL_DEFAULT_GROUPS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return INITIAL_DEFAULT_GROUPS;
  } catch (err) {
    console.error('Failed to load student groups from storage:', err);
    return INITIAL_DEFAULT_GROUPS;
  }
}

export function saveStudentGroup(group: StudentGroup): void {
  try {
    const current = getSavedStudentGroups();
    const idx = current.findIndex(g => g.id === group.id);
    let updated: StudentGroup[];
    const payload: StudentGroup = {
      ...group,
      updatedAt: new Date().toISOString()
    };
    if (idx >= 0) {
      updated = [...current];
      updated[idx] = payload;
    } else {
      updated = [payload, ...current];
    }
    localStorage.setItem(STUDENT_GROUPS_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event(STUDENT_GROUPS_EVENT));
  } catch (err) {
    console.error('Failed to save student group:', err);
  }
}

export function deleteStudentGroup(groupId: string): void {
  try {
    const current = getSavedStudentGroups();
    const updated = current.filter(g => g.id !== groupId);
    localStorage.setItem(STUDENT_GROUPS_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event(STUDENT_GROUPS_EVENT));
  } catch (err) {
    console.error('Failed to delete student group:', err);
  }
}

export function duplicateStudentGroup(groupId: string): StudentGroup | null {
  try {
    const current = getSavedStudentGroups();
    const target = current.find(g => g.id === groupId);
    if (!target) return null;

    const newGroup: StudentGroup = {
      ...target,
      id: `group-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: `${target.name} (نسخة)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      students: target.students.map(s => ({
        ...s,
        id: `st-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
      }))
    };

    saveStudentGroup(newGroup);
    return newGroup;
  } catch (err) {
    console.error('Failed to duplicate student group:', err);
    return null;
  }
}

export function parseStudentsText(
  rawText: string,
  defaults?: { grade?: string; subject?: string; defaultGender?: 'male' | 'female' | 'mixed' }
): StudentGroupMember[] {
  if (!rawText || !rawText.trim()) return [];

  const lines = rawText.split('\n');
  const students: StudentGroupMember[] = [];

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    // Support CSV / Tab separated format e.g. "أحمد بن محمد,ذكر,الصف الرابع,الرياضيات"
    let name = trimmed;
    let gender: 'male' | 'female' = defaults?.defaultGender === 'female' ? 'female' : 'male';
    let grade = defaults?.grade || '';
    let subject = defaults?.subject || '';
    let customText = '';

    if (trimmed.includes(',') || trimmed.includes('\t') || trimmed.includes('|') || trimmed.includes(';')) {
      const parts = trimmed.split(/[,;\t|]+/).map(p => p.trim());
      if (parts[0]) name = parts[0];
      if (parts[1]) {
        const gStr = parts[1].toLowerCase();
        if (gStr.includes('أنث') || gStr.includes('بنت') || gStr.includes('طالبة') || gStr === 'f' || gStr === 'female') {
          gender = 'female';
        } else if (gStr.includes('ذكر') || gStr.includes('ولد') || gStr.includes('طالب') || gStr === 'm' || gStr === 'male') {
          gender = 'male';
        }
      } else {
        gender = detectGenderFromName(name);
      }
      if (parts[2]) grade = parts[2];
      if (parts[3]) subject = parts[3];
      if (parts[4]) customText = parts[4];
    } else {
      gender = detectGenderFromName(name);
    }

    students.push({
      id: `st-${Date.now()}-${Math.random().toString(36).substring(2, 6)}-${students.length}`,
      name,
      gender,
      grade,
      subject,
      customText
    });
  });

  return students;
}

export function addStudentsToGroup(
  groupId: string,
  rawText: string,
  defaultGender?: 'male' | 'female' | 'mixed'
): StudentGroup | null {
  const groups = getSavedStudentGroups();
  const target = groups.find(g => g.id === groupId);
  if (!target) return null;

  const newStudents = parseStudentsText(rawText, {
    grade: target.grade,
    subject: target.subject,
    defaultGender: defaultGender || target.defaultGender
  });

  const updated: StudentGroup = {
    ...target,
    students: [...target.students, ...newStudents],
    updatedAt: new Date().toISOString()
  };

  saveStudentGroup(updated);
  return updated;
}

export function subscribeToStudentGroups(callback: () => void): () => void {
  const handler = () => callback();
  window.addEventListener(STUDENT_GROUPS_EVENT, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(STUDENT_GROUPS_EVENT, handler);
    window.removeEventListener('storage', handler);
  };
}

export function exportStudentGroupsJson(): string {
  const groups = getSavedStudentGroups();
  return JSON.stringify(groups, null, 2);
}

export function importStudentGroupsJson(jsonStr: string): boolean {
  try {
    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed)) return false;
    localStorage.setItem(STUDENT_GROUPS_STORAGE_KEY, JSON.stringify(parsed));
    window.dispatchEvent(new Event(STUDENT_GROUPS_EVENT));
    return true;
  } catch (e) {
    console.error('Failed to import student groups:', e);
    return false;
  }
}
