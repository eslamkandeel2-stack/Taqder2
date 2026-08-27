import { CertificateData } from '../types';
import { getSavedAISettings } from './aiConfig';

export type RecipientGender = 'male' | 'female';

const KNOWN_FEMALE_FIRST_NAMES = new Set([
  // Popular Modern & Classic Saudi / Gulf / Arab Female Names
  'سارة', 'فاطمة', 'نورة', 'مريم', 'ريما', 'عائشة', 'أسماء', 'زينب', 'هدى', 'منى', 'شهد',
  'أمل', 'ريم', 'روان', 'خلود', 'عهود', 'نوف', 'دانة', 'جود', 'لمى', 'هيا', 'غادة', 'عبير',
  'جوهره', 'جوهرة', 'بدور', 'العنود', 'الجوهرة', 'ليان', 'تولين', 'جوري', 'سلمى', 'رغد',
  'أروى', 'لولوة', 'شيخة', 'حصة', 'هند', 'لطيفة', 'أشواق', 'نجلاء', 'شروق', 'ابتسام',
  'خديجة', 'سمية', 'حنان', 'وفاء', 'أميرة', 'جميلة', 'رهف', 'تسنيم', 'إسراء', 'شيماء',
  'ندى', 'تقى', 'ضحى', 'مروة', 'ياسمين', 'ريتاج', 'تاليا', 'حلا', 'غلا', 'جنى', 'وتين',
  'دلال', 'نوال', 'منال', 'آلاء', 'دعاء', 'سناء', 'صفاء', 'ولاء', 'رجاء', 'وفاء',
  'إيمان', 'إلهام', 'أفنان', 'أنهار', 'أشجان', 'أبرار', 'أنوار', 'أحلام', 'أسرار',
  'نهى', 'سها', 'مها', 'رنا', 'رشا', 'ديما', 'ديمة', 'تالا', 'يارا', 'لارا', 'مايا',
  'سيرين', 'نسرين', 'نرمين', 'ياسمين', 'شيرين', 'دارين', 'لجين', 'حنين', 'أنين',
  'رواء', 'وسن', 'وجد', 'وعد', 'ورد', 'طيف', 'فرح', 'مرح', 'ملاك', 'ملك', 'نور', 'حور',
  'روعة', 'جمانة', 'ريانة', 'مياسة', 'شمس', 'قمر', 'غصون', 'أريج', 'عبير', 'شذا',
  'هاجر', 'سارة', 'بلقيس', 'ميساء', 'ميس', 'ميار', 'سيلا', 'إيلاف', 'كادي', 'رسيل'
]);

/**
 * Detect probable gender from Arabic student name with high precision
 */
export function detectGenderFromName(name: string): RecipientGender {
  if (!name || typeof name !== 'string') return 'male';
  const trimmed = name.trim();

  // 1. Explicit hints in text
  if (/\b(?:بنت|طالبة|أنثى|female|girl)\b/i.test(trimmed)) return 'female';
  if (/\b(?:بن|طالب|ذكر|male|boy)\b/i.test(trimmed)) return 'male';

  const parts = trimmed.split(/[\s,._-]+/);
  const firstWord = parts[0] || '';

  // 2. Direct dictionary match
  if (KNOWN_FEMALE_FIRST_NAMES.has(firstWord)) return 'female';

  // 3. Morphological pattern matches (common Arabic female endings)
  if (firstWord.length >= 3) {
    if (firstWord.endsWith('ة') || firstWord.endsWith('ـة')) return 'female';
    if (firstWord.endsWith('اء') && !['علاء', 'بهاء', 'ضياء'].includes(firstWord)) return 'female';
    if (firstWord.endsWith('ى') && !['مصطفى', 'يحيى', 'موسى', 'عيسى', 'مرتضى', 'مجتبى'].includes(firstWord)) return 'female';
    if (firstWord.endsWith('ياء') || firstWord.endsWith('يان') || firstWord.endsWith('ين') && ['تسنيم', 'حنين', 'لجين', 'ياسمين', 'دارين'].includes(firstWord)) return 'female';
  }

  return 'male';
}

const ARABIC_WORD_CHARS = '\\u0621-\\u064A\\u0671-\\u06D3\\u06D5\\u0660-\\u0669a-zA-Z0-9_';

// Unicode-aware Arabic word boundary replacer
export function replaceArabicPhrase(text: string, fromPhrase: string, toPhrase: string): string {
  if (!text || !fromPhrase) return text;
  const escaped = fromPhrase.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  const reg = new RegExp(`(?<=^|[^${ARABIC_WORD_CHARS}])${escaped}(?=$|[^${ARABIC_WORD_CHARS}])`, 'g');
  let res = text;
  let prev = '';
  let iterations = 0;
  while (res !== prev && iterations < 4) {
    prev = res;
    res = res.replace(reg, toPhrase);
    iterations++;
  }
  return res;
}

/**
 * Raw list of masculine -> feminine phrase transformations
 * Ordered systematically from longest / multi-word phrases to single words
 */
export const RAW_GENDER_PAIRS: {
  male: string;
  female: string;
  category: 'intro' | 'pronoun' | 'verb' | 'adjective' | 'badge' | 'prayer' | 'salutation';
  explanationMaleToFemale: string;
  explanationFemaleToMale: string;
}[] = [
  // 1. Full Introductions & Honoring Phrasings
  {
    male: 'يسر إدارة المدرسة أن تتقدم بأسمى آيات الشكر والتقدير للطالب المتميز',
    female: 'يسر إدارة المدرسة أن تتقدم بأسمى آيات الشكر والتقدير للطالبة المتميزة',
    category: 'intro',
    explanationMaleToFemale: 'مواءمة مقدمة التكريم لصيغة المؤنث',
    explanationFemaleToMale: 'مواءمة مقدمة التكريم لصيغة المذكر',
  },
  {
    male: 'تسر إدارة المدرسة ومعلموها أن تمنح هذه الشهادة للطالب المتميز',
    female: 'تسر إدارة المدرسة ومعلموها أن تمنح هذه الشهادة للطالبة المتميزة',
    category: 'intro',
    explanationMaleToFemale: 'مواءمة مقدمة التكريم لصيغة المؤنث',
    explanationFemaleToMale: 'مواءمة مقدمة التكريم لصيغة المذكر',
  },
  {
    male: 'تعتز إدارة المدرسة ومعلموها بتكريم الطالب المتفوق علمياً',
    female: 'تعتز إدارة المدرسة ومعلموها بتكريم الطالبة المتفوقة علمياً',
    category: 'intro',
    explanationMaleToFemale: 'مواءمة مقدمة التكريم لصيغة المؤنث',
    explanationFemaleToMale: 'مواءمة مقدمة التكريم لصيغة المذكر',
  },
  {
    male: 'بكل فخر واعتزاز تزف إدارة الحلقات القرآنية التكريم للطالب المبارك',
    female: 'بكل فخر واعتزاز تزف إدارة الحلقات القرآنية التكريم للطالبة المباركة',
    category: 'intro',
    explanationMaleToFemale: 'مواءمة عبارة التكريم لصيغة المؤنث',
    explanationFemaleToMale: 'مواءمة عبارة التكريم لصيغة المذكر',
  },
  {
    male: 'يسر التوجيه الطلابي وإدارة المدرسة تكريم الطالب الخلوق المنضبط',
    female: 'يسر التوجيه الطلابي وإدارة المدرسة تكريم الطالبة الخلوقة المنضبطة',
    category: 'intro',
    explanationMaleToFemale: 'مواءمة عبارة التكريم لصيغة المؤنث',
    explanationFemaleToMale: 'مواءمة عبارة التكريم لصيغة المذكر',
  },
  {
    male: 'تعتز إدارة المدرسة ونادي الابتكار بتكريم المبتكر الصاعد',
    female: 'تعتز إدارة المدرسة ونادي الابتكار بتكريم المبتكرة الصاعدة',
    category: 'intro',
    explanationMaleToFemale: 'مواءمة تكريم المبتكر للمؤنث',
    explanationFemaleToMale: 'مواءمة تكريم المبتكر للمذكر',
  },

  // 2. Compound Student Titles & Honorifics
  { male: 'للطالب المتميز علمياً والخلوق', female: 'للطالبة المتميزة علمياً والخلوقة', category: 'intro', explanationMaleToFemale: 'تأنيث اللقب والصفة', explanationFemaleToMale: 'تذكير اللقب والصفة' },
  { male: 'للطالب المتميز في الأنشطة', female: 'للطالبة المتميزة في الأنشطة', category: 'intro', explanationMaleToFemale: 'تأنيث اللقب والصفة', explanationFemaleToMale: 'تذكير اللقب والصفة' },
  { male: 'للطالب المتميز خلقاً وعلماً', female: 'للطالبة المتميزة خلقاً وعلماً', category: 'intro', explanationMaleToFemale: 'تأنيث اللقب والصفة', explanationFemaleToMale: 'تذكير اللقب والصفة' },
  { male: 'للطالب المتميز', female: 'للطالبة المتميزة', category: 'intro', explanationMaleToFemale: 'تأنيث: للطالبة المتميزة', explanationFemaleToMale: 'تذكير: للطالب المتميز' },
  { male: 'للطالب المتفوق', female: 'للطالبة المتفوقة', category: 'intro', explanationMaleToFemale: 'تأنيث: للطالبة المتفوقة', explanationFemaleToMale: 'تذكير: للطالب المتفوق' },
  { male: 'للطالب المجتهد', female: 'للطالبة المجتهدة', category: 'intro', explanationMaleToFemale: 'تأنيث: للطالبة المجتهدة', explanationFemaleToMale: 'تذكير: للطالب المجتهد' },
  { male: 'للطالب المبدع', female: 'للطالبة المبدعة', category: 'intro', explanationMaleToFemale: 'تأنيث: للطالبة المبدعة', explanationFemaleToMale: 'تذكير: للطالب المبدع' },
  { male: 'للطالب الخلوق', female: 'للطالبة الخلوقة', category: 'intro', explanationMaleToFemale: 'تأنيث: للطالبة الخلوقة', explanationFemaleToMale: 'تذكير: للطالب الخلوق' },
  { male: 'للطالب المبارك', female: 'للطالبة المباركة', category: 'intro', explanationMaleToFemale: 'تأنيث: للطالبة المباركة', explanationFemaleToMale: 'تذكير: للطالب المبارك' },
  { male: 'للطالب المتقن', female: 'للطالبة المتقنة', category: 'intro', explanationMaleToFemale: 'تأنيث: للطالبة المتقنة', explanationFemaleToMale: 'تذكير: للطالب المتقن' },
  { male: 'للطالب الحافظ', female: 'للطالبة الحافظة', category: 'intro', explanationMaleToFemale: 'تأنيث: للطالبة الحافظة', explanationFemaleToMale: 'تذكير: للطالب الحافظ' },
  { male: 'للطالب الفائز', female: 'للطالبة الفائزة', category: 'intro', explanationMaleToFemale: 'تأنيث: للطالبة الفائزة', explanationFemaleToMale: 'تذكير: للطالب الفائز' },
  { male: 'للطالب النجيب', female: 'للطالبة النجيبة', category: 'intro', explanationMaleToFemale: 'تأنيث: للطالبة النجيبة', explanationFemaleToMale: 'تذكير: للطالب النجيب' },
  { male: 'للطالب المثالي', female: 'للطالبة المثالية', category: 'intro', explanationMaleToFemale: 'تأنيث: للطالبة المثالية', explanationFemaleToMale: 'تذكير: للطالب المثالي' },
  { male: 'للطالب المبتكر', female: 'للطالبة المبتكرة', category: 'intro', explanationMaleToFemale: 'تأنيث: للطالبة المبتكرة', explanationFemaleToMale: 'تذكير: للطالب المبتكر' },
  { male: 'للطالب المشارك', female: 'للطالبة المشاركة', category: 'intro', explanationMaleToFemale: 'تأنيث: للطالبة المشاركة', explanationFemaleToMale: 'تذكير: للطالب المشارك' },
  { male: 'للطالب المنضبط', female: 'للطالبة المنضبطة', category: 'intro', explanationMaleToFemale: 'تأنيث: للطالبة المنضبطة', explanationFemaleToMale: 'تذكير: للطالب المنضبط' },
  { male: 'للطالب المواظب', female: 'للطالبة المواظبة', category: 'intro', explanationMaleToFemale: 'تأنيث: للطالبة المواظبة', explanationFemaleToMale: 'تذكير: للطالب المواظب' },
  { male: 'للطالب', female: 'للطالبة', category: 'intro', explanationMaleToFemale: 'تأنيث: للطالبة', explanationFemaleToMale: 'تذكير: للطالب' },

  { male: 'الطالب المتميز', female: 'الطالبة المتميزة', category: 'intro', explanationMaleToFemale: 'تأنيث: الطالبة المتميزة', explanationFemaleToMale: 'تذكير: الطالب المتميز' },
  { male: 'الطالب المتفوق', female: 'الطالبة المتفوقة', category: 'intro', explanationMaleToFemale: 'تأنيث: الطالبة المتفوقة', explanationFemaleToMale: 'تذكير: الطالب المتفوق' },
  { male: 'الطالب المجتهد', female: 'الطالبة المجتهدة', category: 'intro', explanationMaleToFemale: 'تأنيث: الطالبة المجتهدة', explanationFemaleToMale: 'تذكير: الطالب المجتهد' },
  { male: 'الطالب المبدع', female: 'الطالبة المبدعة', category: 'intro', explanationMaleToFemale: 'تأنيث: الطالبة المبدعة', explanationFemaleToMale: 'تذكير: الطالب المبدع' },
  { male: 'الطالب الخلوق', female: 'الطالبة الخلوقة', category: 'intro', explanationMaleToFemale: 'تأنيث: الطالبة الخلوقة', explanationFemaleToMale: 'تذكير: الطالب الخلوق' },
  { male: 'الطالب المبارك', female: 'الطالبة المباركة', category: 'intro', explanationMaleToFemale: 'تأنيث: الطالبة المباركة', explanationFemaleToMale: 'تذكير: الطالب المبارك' },
  { male: 'الطالب المتقن', female: 'الطالبة المتقنة', category: 'intro', explanationMaleToFemale: 'تأنيث: الطالبة المتقنة', explanationFemaleToMale: 'تذكير: الطالب المتقن' },
  { male: 'الطالب الحافظ', female: 'الطالبة الحافظة', category: 'intro', explanationMaleToFemale: 'تأنيث: الطالبة الحافظة', explanationFemaleToMale: 'تذكير: الطالب الحافظ' },
  { male: 'الطالب الفائز', female: 'الطالبة الفائزة', category: 'intro', explanationMaleToFemale: 'تأنيث: الطالبة الفائزة', explanationFemaleToMale: 'تذكير: الطالب الفائز' },
  { male: 'الطالب النجيب', female: 'الطالبة النجيبة', category: 'intro', explanationMaleToFemale: 'تأنيث: الطالبة النجيبة', explanationFemaleToMale: 'تذكير: الطالب النجيب' },
  { male: 'الطالب المثالي', female: 'الطالبة المثالية', category: 'intro', explanationMaleToFemale: 'تأنيث: الطالبة المثالية', explanationFemaleToMale: 'تذكير: الطالب المثالي' },
  { male: 'الطالب المبتكر', female: 'الطالبة المبتكرة', category: 'intro', explanationMaleToFemale: 'تأنيث: الطالبة المبتكرة', explanationFemaleToMale: 'تذكير: الطالب المبتكر' },
  { male: 'الطالب المشارك', female: 'الطالبة المشاركة', category: 'intro', explanationMaleToFemale: 'تأنيث: الطالبة المشاركة', explanationFemaleToMale: 'تذكير: الطالب المشارك' },
  { male: 'الطالب المنضبط', female: 'الطالبة المنضبطة', category: 'intro', explanationMaleToFemale: 'تأنيث: الطالبة المنضبطة', explanationFemaleToMale: 'تذكير: الطالب المنضبط' },
  { male: 'الطالب المواظب', female: 'الطالبة المواظبة', category: 'intro', explanationMaleToFemale: 'تأنيث: الطالبة المواظبة', explanationFemaleToMale: 'تذكير: الطالب المواظب' },
  { male: 'الطالب', female: 'الطالبة', category: 'intro', explanationMaleToFemale: 'تأنيث: الطالبة', explanationFemaleToMale: 'تذكير: الطالب' },

  { male: 'طالب متميز', female: 'طالبة متميزة', category: 'adjective', explanationMaleToFemale: 'تأنيث: طالبة متميزة', explanationFemaleToMale: 'تذكير: طالب متميز' },
  { male: 'طالب متفوق', female: 'طالبة متفوقة', category: 'adjective', explanationMaleToFemale: 'تأنيث: طالبة متفوقة', explanationFemaleToMale: 'تذكير: طالب متفوق' },
  { male: 'طالب مجتهد', female: 'طالبة مجتهدة', category: 'adjective', explanationMaleToFemale: 'تأنيث: طالبة مجتهدة', explanationFemaleToMale: 'تذكير: طالب مجتهد' },
  { male: 'طالب خلوق', female: 'طالبة خلوقة', category: 'adjective', explanationMaleToFemale: 'تأنيث: طالبة خلوقة', explanationFemaleToMale: 'تذكير: طالب خلوق' },
  { male: 'طالب مبدع', female: 'طالبة مبدعة', category: 'adjective', explanationMaleToFemale: 'تأنيث: طالبة مبدعة', explanationFemaleToMale: 'تذكير: طالب مبدع' },
  { male: 'طالب العلم الصالح', female: 'طالبة العلم الصالحة', category: 'intro', explanationMaleToFemale: 'تأنيث: طالبة العلم الصالحة', explanationFemaleToMale: 'تذكير: طالب العلم الصالح' },
  { male: 'طالب علم', female: 'طالبة علم', category: 'intro', explanationMaleToFemale: 'تأنيث: طالبة علم', explanationFemaleToMale: 'تذكير: طالب علم' },
  { male: 'طالب', female: 'طالبة', category: 'adjective', explanationMaleToFemale: 'تأنيث: طالبة', explanationFemaleToMale: 'تذكير: طالب' },

  // 3. Titles, Badges, Teachers & Kinship
  { male: 'بأن الطالب', female: 'بأن الطالبة', category: 'intro', explanationMaleToFemale: 'تأنيث: بأن الطالبة', explanationFemaleToMale: 'تذكير: بأن الطالب' },
  { male: 'بأن الأستاذ', female: 'بأن الأستاذة', category: 'intro', explanationMaleToFemale: 'تأنيث: بأن الأستاذة', explanationFemaleToMale: 'تذكير: بأن الأستاذ' },
  { male: 'للأستاذ القدير', female: 'للأستاذة القديرة', category: 'intro', explanationMaleToFemale: 'تأنيث: للأستاذة القديرة', explanationFemaleToMale: 'تذكير: للأستاذ القدير' },
  { male: 'للأستاذ', female: 'للأستاذة', category: 'intro', explanationMaleToFemale: 'تأنيث: للأستاذة', explanationFemaleToMale: 'تذكير: للأستاذ' },
  { male: 'الأستاذ', female: 'الأستاذة', category: 'intro', explanationMaleToFemale: 'تأنيث: الأستاذة', explanationFemaleToMale: 'تذكير: الأستاذ' },
  { male: 'أستاذ', female: 'أستاذة', category: 'intro', explanationMaleToFemale: 'تأنيث: أستاذة', explanationFemaleToMale: 'تذكير: أستاذ' },
  { male: 'للمعلم الفاضل', female: 'للمعلمة الفاضلة', category: 'intro', explanationMaleToFemale: 'تأنيث: للمعلمة الفاضلة', explanationFemaleToMale: 'تذكير: للمعلم الفاضل' },
  { male: 'للمعلم', female: 'للمعلمة', category: 'intro', explanationMaleToFemale: 'تأنيث: للمعلمة', explanationFemaleToMale: 'تذكير: للمعلم' },
  { male: 'المعلم', female: 'المعلمة', category: 'intro', explanationMaleToFemale: 'تأنيث: المعلمة', explanationFemaleToMale: 'تذكير: المعلم' },
  { male: 'معلم', female: 'معلمة', category: 'intro', explanationMaleToFemale: 'تأنيث: معلمة', explanationFemaleToMale: 'تذكير: معلم' },
  { male: 'للقيادي الواعد', female: 'للقيادية الواعدة', category: 'intro', explanationMaleToFemale: 'تأنيث: للقيادية الواعدة', explanationFemaleToMale: 'تذكير: للقيادي الواعد' },
  { male: 'للمبتكر الرقمي', female: 'للمبتكرة الرقمية', category: 'intro', explanationMaleToFemale: 'تأنيث: للمبتكرة الرقمية', explanationFemaleToMale: 'تذكير: للمبتكر الرقمي' },
  { male: 'لبطلنا الصغير المبدع', female: 'لبطلتنا الصغيرة المبدعة', category: 'intro', explanationMaleToFemale: 'تأنيث: لبطلتنا الصغيرة المبدعة', explanationFemaleToMale: 'تذكير: لبطلنا الصغير المبدع' },
  { male: 'لبطلنا الصغير', female: 'لبطلتنا الصغيرة', category: 'intro', explanationMaleToFemale: 'تأنيث: لبطلتنا الصغيرة', explanationFemaleToMale: 'تذكير: لبطلنا الصغير' },
  { male: 'للفارس اللغوي', female: 'للفارسة اللغوية', category: 'intro', explanationMaleToFemale: 'تأنيث: للفارسة اللغوية', explanationFemaleToMale: 'تذكير: للفارس اللغوي' },
  { male: 'للمتطوع المبدع', female: 'للمتطوعة المبدعة', category: 'intro', explanationMaleToFemale: 'تأنيث: للمتطوعة المبدعة', explanationFemaleToMale: 'تذكير: للمتطوع المبدع' },
  { male: 'للبطل الرياضي الاستثنائي', female: 'للبطلة الرياضية الاستثنائية', category: 'intro', explanationMaleToFemale: 'تأنيث: للبطلة الرياضية الاستثنائية', explanationFemaleToMale: 'تذكير: للبطل الرياضي الاستثنائي' },
  { male: 'للبطل الرياضي', female: 'للبطلة الرياضية', category: 'intro', explanationMaleToFemale: 'تأنيث: للبطلة الرياضية', explanationFemaleToMale: 'تذكير: للبطل الرياضي' },
  { male: 'للسفير البيئي', female: 'للسفيرة البيئية', category: 'intro', explanationMaleToFemale: 'تأنيث: للسفيرة البيئية', explanationFemaleToMale: 'تذكير: للسفير البيئي' },
  { male: 'للمطور العبقري', female: 'للمطورة العبقرية', category: 'intro', explanationMaleToFemale: 'تأنيث: للمطورة العبقرية', explanationFemaleToMale: 'تذكير: للمطور العبقري' },
  { male: 'لطالبنا المتميز', female: 'لطالبتنا المتميزة', category: 'intro', explanationMaleToFemale: 'تأنيث: لطالبتنا المتميزة', explanationFemaleToMale: 'تذكير: لطالبنا المتميز' },
  { male: 'لطالبنا المتفوق', female: 'لطالبتنا المتفوقة', category: 'intro', explanationMaleToFemale: 'تأنيث: لطالبتنا المتفوقة', explanationFemaleToMale: 'تذكير: لطالبنا المتفوق' },
  { male: 'لطالبنا المبدع', female: 'لطالبتنا المبدعة', category: 'intro', explanationMaleToFemale: 'تأنيث: لطالبتنا المبدعة', explanationFemaleToMale: 'تذكير: لطالبنا المبدع' },
  { male: 'لطالبنا', female: 'لطالبتنا', category: 'intro', explanationMaleToFemale: 'تأنيث: لطالبتنا', explanationFemaleToMale: 'تذكير: لطالبنا' },
  { male: 'طالبنا', female: 'طالبتنا', category: 'intro', explanationMaleToFemale: 'تأنيث: طالبتنا', explanationFemaleToMale: 'تذكير: طالبنا' },
  { male: 'تلميذنا النجيب', female: 'تلميذتنا النجيبة', category: 'intro', explanationMaleToFemale: 'تأنيث: تلميذتنا النجيبة', explanationFemaleToMale: 'تذكير: تلميذنا النجيب' },
  { male: 'تلميذنا', female: 'تلميذتنا', category: 'intro', explanationMaleToFemale: 'تأنيث: تلميذتنا', explanationFemaleToMale: 'تذكير: تلميذنا' },
  { male: 'تلميذ', female: 'تلميذة', category: 'adjective', explanationMaleToFemale: 'تأنيث: تلميذة', explanationFemaleToMale: 'تذكير: تلميذ' },
  { male: 'ابننا الغالي', female: 'ابنتنا الغالية', category: 'intro', explanationMaleToFemale: 'تأنيث: ابنتنا الغالية', explanationFemaleToMale: 'تذكير: ابننا الغالي' },
  { male: 'ابننا العزيز', female: 'ابنتنا العزيزة', category: 'intro', explanationMaleToFemale: 'تأنيث: ابنتنا العزيزة', explanationFemaleToMale: 'تذكير: ابننا العزيز' },
  { male: 'ابننا', female: 'ابنتنا', category: 'intro', explanationMaleToFemale: 'تأنيث: ابنتنا', explanationFemaleToMale: 'تذكير: ابننا' },
  { male: 'ابن', female: 'ابنة', category: 'adjective', explanationMaleToFemale: 'تأنيث: ابنة', explanationFemaleToMale: 'تذكير: ابن' },
  { male: 'بطلنا الصغير', female: 'بطلتنا الصغيرة', category: 'intro', explanationMaleToFemale: 'تأنيث: بطلتنا الصغيرة', explanationFemaleToMale: 'تذكير: بطلنا الصغير' },
  { male: 'بطلنا', female: 'بطلتنا', category: 'intro', explanationMaleToFemale: 'تأنيث: بطلتنا', explanationFemaleToMale: 'تذكير: بطلنا' },
  { male: 'بطل الموهبة', female: 'بطلة الموهبة', category: 'badge', explanationMaleToFemale: 'تأنيث: بطلة الموهبة', explanationFemaleToMale: 'تذكير: بطل الموهبة' },
  { male: 'بطل التحدي', female: 'بطلة التحدي', category: 'badge', explanationMaleToFemale: 'تأنيث: بطلة التحدي', explanationFemaleToMale: 'تذكير: بطل التحدي' },
  { male: 'بطل', female: 'بطلة', category: 'adjective', explanationMaleToFemale: 'تأنيث: بطلة', explanationFemaleToMale: 'تذكير: بطل' },
  { male: 'نجمنا المتألق', female: 'نجمتنا المتألقة', category: 'intro', explanationMaleToFemale: 'تأنيث: نجمتنا المتألقة', explanationFemaleToMale: 'تذكير: نجمنا المتألق' },
  { male: 'نجمنا', female: 'نجمتنا', category: 'intro', explanationMaleToFemale: 'تأنيث: نجمتنا', explanationFemaleToMale: 'تذكير: نجمنا' },
  { male: 'نجم التميز', female: 'نجمة التميز', category: 'badge', explanationMaleToFemale: 'تأنيث: نجمة التميز', explanationFemaleToMale: 'تذكير: نجم التميز' },
  { male: 'فارسنا', female: 'فارستنا', category: 'intro', explanationMaleToFemale: 'تأنيث: فارستنا', explanationFemaleToMale: 'تذكير: فارسنا' },
  { male: 'فارس التميز', female: 'فارسة التميز', category: 'badge', explanationMaleToFemale: 'تأنيث: فارسة التميز', explanationFemaleToMale: 'تذكير: فارس التميز' },
  { male: 'فارس الإلقاء', female: 'فارسة الإلقاء', category: 'badge', explanationMaleToFemale: 'تأنيث: فارسة الإلقاء', explanationFemaleToMale: 'تذكير: فارس الإلقاء' },
  { male: 'فارس', female: 'فارسة', category: 'adjective', explanationMaleToFemale: 'تأنيث: فارسة', explanationFemaleToMale: 'تذكير: فارس' },
  { male: 'سفيرنا', female: 'سفيرتنا', category: 'intro', explanationMaleToFemale: 'تأنيث: سفيرتنا', explanationFemaleToMale: 'تذكير: سفيرنا' },
  { male: 'سفير البيئة', female: 'سفيرة البيئة', category: 'badge', explanationMaleToFemale: 'تأنيث: سفيرة البيئة', explanationFemaleToMale: 'تذكير: سفير البيئة' },
  { male: 'سفير', female: 'سفيرة', category: 'adjective', explanationMaleToFemale: 'تأنيث: سفيرة', explanationFemaleToMale: 'تذكير: سفير' },
  { male: 'قائد مستقبلي', female: 'قائدة مستقبلية', category: 'badge', explanationMaleToFemale: 'تأنيث: قائدة مستقبلية', explanationFemaleToMale: 'تذكير: قائد مستقبلي' },
  { male: 'قائد واعد', female: 'قائدة واعدة', category: 'badge', explanationMaleToFemale: 'تأنيث: قائدة واعدة', explanationFemaleToMale: 'تذكير: قائد واعد' },
  { male: 'قائد', female: 'قائدة', category: 'adjective', explanationMaleToFemale: 'تأنيث: قائدة', explanationFemaleToMale: 'تذكير: قائد' },
  { male: 'مبتكر واعد', female: 'مبتكرة واعدة', category: 'badge', explanationMaleToFemale: 'تأنيث: مبتكرة واعدة', explanationFemaleToMale: 'تذكير: مبتكر واعد' },
  { male: 'مبتكر', female: 'مبتكرة', category: 'adjective', explanationMaleToFemale: 'تأنيث: مبتكرة', explanationFemaleToMale: 'تذكير: مبتكر' },
  { male: 'حافظ متقن', female: 'حافظة متقنة', category: 'badge', explanationMaleToFemale: 'تأنيث: حافظة متقنة', explanationFemaleToMale: 'تذكير: حافظ متقن' },
  { male: 'حافظ لكتاب الله', female: 'حافظة لكتاب الله', category: 'badge', explanationMaleToFemale: 'تأنيث: حافظة لكتاب الله', explanationFemaleToMale: 'تذكير: حافظ لكتاب الله' },
  { male: 'خادم كتاب الله', female: 'خادمة كتاب الله', category: 'badge', explanationMaleToFemale: 'تأنيث: خادمة كتاب الله', explanationFemaleToMale: 'تذكير: خادم كتاب الله' },
  { male: 'خريج متميز', female: 'خريجة متميزة', category: 'badge', explanationMaleToFemale: 'تأنيث: خريجة متميزة', explanationFemaleToMale: 'تذكير: خريج متميز' },
  { male: 'خريج', female: 'خريجة', category: 'adjective', explanationMaleToFemale: 'تأنيث: خريجة', explanationFemaleToMale: 'تذكير: خريج' },

  // Badges & Award Titles
  { male: 'وسام الطالب المتميز', female: 'وسام الطالبة المتميزة', category: 'badge', explanationMaleToFemale: 'تأنيث مسمى الوسام', explanationFemaleToMale: 'تذكير مسمى الوسام' },
  { male: 'وسام الطالب المتفوق', female: 'وسام الطالبة المتفوقة', category: 'badge', explanationMaleToFemale: 'تأنيث مسمى الوسام', explanationFemaleToMale: 'تذكير مسمى الوسام' },
  { male: 'وسام الطالب المثالي', female: 'وسام الطالبة المثالية', category: 'badge', explanationMaleToFemale: 'تأنيث مسمى الوسام', explanationFemaleToMale: 'تذكير مسمى الوسام' },
  { male: 'وسام الطالب المبدع', female: 'وسام الطالبة المبدعة', category: 'badge', explanationMaleToFemale: 'تأنيث مسمى الوسام', explanationFemaleToMale: 'تذكير مسمى الوسام' },
  { male: 'وسام الفارس', female: 'وسام الفارسة', category: 'badge', explanationMaleToFemale: 'تأنيث مسمى الوسام', explanationFemaleToMale: 'تذكير مسمى الوسام' },
  { male: 'وسام البطل الصغير', female: 'وسام البطلة الصغيرة', category: 'badge', explanationMaleToFemale: 'تأنيث مسمى الوسام', explanationFemaleToMale: 'تذكير مسمى الوسام' },
  { male: 'المبتكر الرقمي الواعد', female: 'المبتكرة الرقمية الواعدة', category: 'badge', explanationMaleToFemale: 'تأنيث مسمى الوسام', explanationFemaleToMale: 'تذكير مسمى الوسام' },

  // 4. Supplications & Prayers (له / لها)
  { male: 'سائلين الله له دوام التوفيق والسداد', female: 'سائلين الله لها دوام التوفيق والسداد', category: 'prayer', explanationMaleToFemale: 'تأنيث الدعاء: سائلين الله لها', explanationFemaleToMale: 'تذكير الدعاء: سائلين الله له' },
  { male: 'سائلين المولى له دوام التوفيق والسداد', female: 'سائلين المولى لها دوام التوفيق والسداد', category: 'prayer', explanationMaleToFemale: 'تأنيث الدعاء: سائلين المولى لها', explanationFemaleToMale: 'تذكير الدعاء: سائلين المولى له' },
  { male: 'سائلين الله له', female: 'سائلين الله لها', category: 'prayer', explanationMaleToFemale: 'تأنيث الدعاء: سائلين الله لها', explanationFemaleToMale: 'تذكير الدعاء: سائلين الله له' },
  { male: 'سائلين المولى له', female: 'سائلين المولى لها', category: 'prayer', explanationMaleToFemale: 'تأنيث الدعاء: سائلين المولى لها', explanationFemaleToMale: 'تذكير الدعاء: سائلين المولى له' },
  { male: 'داعين الله له', female: 'داعين الله لها', category: 'prayer', explanationMaleToFemale: 'تأنيث الدعاء: داعين الله لها', explanationFemaleToMale: 'تذكير الدعاء: داعين الله له' },
  { male: 'داعين المولى له', female: 'داعين المولى لها', category: 'prayer', explanationMaleToFemale: 'تأنيث الدعاء: داعين المولى لها', explanationFemaleToMale: 'تذكير الدعاء: داعين المولى له' },
  { male: 'متمنين له دوام', female: 'متمنين لها دوام', category: 'prayer', explanationMaleToFemale: 'تأنيث الدعاء: متمنين لها دوام', explanationFemaleToMale: 'تذكير الدعاء: متمنين له دوام' },
  { male: 'متمنين له', female: 'متمنين لها', category: 'prayer', explanationMaleToFemale: 'تأنيث: متمنين لها', explanationFemaleToMale: 'تذكير: متمنين له' },
  { male: 'راجين له مزيداً', female: 'راجين لها مزيداً', category: 'prayer', explanationMaleToFemale: 'تأنيث: راجين لها مزيداً', explanationFemaleToMale: 'تذكير: راجين له مزيداً' },
  { male: 'راجين له', female: 'راجين لها', category: 'prayer', explanationMaleToFemale: 'تأنيث: راجين لها', explanationFemaleToMale: 'تذكير: راجين له' },
  { male: 'نرجو له', female: 'نرجو لها', category: 'prayer', explanationMaleToFemale: 'تأنيث: نرجو لها', explanationFemaleToMale: 'تذكير: نرجو له' },
  { male: 'نتمنى له', female: 'نتمنى لها', category: 'prayer', explanationMaleToFemale: 'تأنيث: نتمنى لها', explanationFemaleToMale: 'تذكير: نتمنى له' },
  { male: 'نتمنى لَه', female: 'نتمنى لها', category: 'prayer', explanationMaleToFemale: 'تأنيث: نتمنى لها', explanationFemaleToMale: 'تذكير: نتمنى له' },
  { male: 'مباركاً له', female: 'مباركاً لها', category: 'prayer', explanationMaleToFemale: 'تأنيث: مباركاً لها', explanationFemaleToMale: 'تذكير: مباركاً له' },
  { male: 'مباركين له', female: 'مباركين لها', category: 'prayer', explanationMaleToFemale: 'تأنيث: مباركين لها', explanationFemaleToMale: 'تذكير: مباركين له' },
  { male: 'له دوام التوفيق', female: 'لها دوام التوفيق', category: 'prayer', explanationMaleToFemale: 'تأنيث: لها دوام التوفيق', explanationFemaleToMale: 'تذكير: له دوام التوفيق' },
  { male: 'له دوام', female: 'لها دوام', category: 'prayer', explanationMaleToFemale: 'تأنيث: لها دوام', explanationFemaleToMale: 'تذكير: له دوام' },
  { male: 'له مستقبلاً باهراً', female: 'لها مستقبلاً باهراً', category: 'prayer', explanationMaleToFemale: 'تأنيث: لها مستقبلاً باهراً', explanationFemaleToMale: 'تذكير: له مستقبلاً باهراً' },
  { male: 'له مستقبلاً', female: 'لها مستقبلاً', category: 'prayer', explanationMaleToFemale: 'تأنيث: لها مستقبلاً', explanationFemaleToMale: 'تذكير: له مستقبلاً' },
  { male: 'له مزيداً من', female: 'لها مزيداً من', category: 'prayer', explanationMaleToFemale: 'تأنيث: لها مزيداً من', explanationFemaleToMale: 'تذكير: له مزيداً من' },
  { male: 'له مزيداً', female: 'لها مزيداً', category: 'prayer', explanationMaleToFemale: 'تأنيث: لها مزيداً', explanationFemaleToMale: 'تذكير: له مزيداً' },
  { male: 'له التوفيق', female: 'لها التوفيق', category: 'prayer', explanationMaleToFemale: 'تأنيث: لها التوفيق', explanationFemaleToMale: 'تذكير: له التوفيق' },
  { male: 'له النجاح', female: 'لها النجاح', category: 'prayer', explanationMaleToFemale: 'تأنيث: لها النجاح', explanationFemaleToMale: 'تذكير: له النجاح' },
  { male: 'أن يوفقه الله', female: 'أن يوفقها الله', category: 'prayer', explanationMaleToFemale: 'تأنيث: أن يوفقها الله', explanationFemaleToMale: 'تذكير: أن يوفقه الله' },
  { male: 'أن يوفقه', female: 'أن يوفقها', category: 'prayer', explanationMaleToFemale: 'تأنيث: أن يوفقها', explanationFemaleToMale: 'تذكير: أن يوفقه' },
  { male: 'أن يسدده', female: 'أن يسددها', category: 'prayer', explanationMaleToFemale: 'تأنيث: أن يسددها', explanationFemaleToMale: 'تذكير: أن يسدده' },
  { male: 'أن يبارك فيه', female: 'أن يبارك فيها', category: 'prayer', explanationMaleToFemale: 'تأنيث: أن يبارك فيها', explanationFemaleToMale: 'تذكير: أن يبارك فيه' },
  { male: 'أن يزيده توفيقاً', female: 'أن يزيدها توفيقاً', category: 'prayer', explanationMaleToFemale: 'تأنيث: أن يزيدها توفيقاً', explanationFemaleToMale: 'تذكير: أن يزيده توفيقاً' },
  { male: 'أن يزيده', female: 'أن يزيدها', category: 'prayer', explanationMaleToFemale: 'تأنيث: أن يزيدها', explanationFemaleToMale: 'تذكير: أن يزيده' },
  { male: 'أن ينفع به', female: 'أن ينفع بها', category: 'prayer', explanationMaleToFemale: 'تأنيث: أن ينفع بها', explanationFemaleToMale: 'تذكير: أن ينفع به' },
  { male: 'أن يجعله', female: 'أن يجعلها', category: 'prayer', explanationMaleToFemale: 'تأنيث: أن يجعلها', explanationFemaleToMale: 'تذكير: أن يجعله' },
  { male: 'ليكون قدوة', female: 'لتكون قدوة', category: 'prayer', explanationMaleToFemale: 'تأنيث: لتكون قدوة', explanationFemaleToMale: 'تذكير: ليكون قدوة' },
  { male: 'ليكون نموذجاً', female: 'لتكون نموذجاً', category: 'prayer', explanationMaleToFemale: 'تأنيث: لتكون نموذجاً', explanationFemaleToMale: 'تذكير: ليكون نموذجاً' },
  { male: 'ليكون', female: 'لتكون', category: 'prayer', explanationMaleToFemale: 'تأنيث: لتكون', explanationFemaleToMale: 'تذكير: ليكون' },

  // 5. Prepositions + Attached Pronouns (-ه / -ها)
  { male: 'تقديراً لجهوده المتميزة', female: 'تقديراً لجهودها المتميزة', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: لجهودها المتميزة', explanationFemaleToMale: 'ضمير المذكر: لجهوده المتميزة' },
  { male: 'تقديراً لجهوده المخلصة', female: 'تقديراً لجهودها المخلصة', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: لجهودها المخلصة', explanationFemaleToMale: 'ضمير المذكر: لجهوده المخلصة' },
  { male: 'تقديراً لجهوده المباركة', female: 'تقديراً لجهودها المباركة', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: لجهودها المباركة', explanationFemaleToMale: 'ضمير المذكر: لجهوده المباركة' },
  { male: 'تقديراً لجهوده', female: 'تقديراً لجهودها', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: لجهودها', explanationFemaleToMale: 'ضمير المذكر: لجهوده' },
  { male: 'لجهوده المتميزة', female: 'لجهودها المتميزة', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: لجهودها المتميزة', explanationFemaleToMale: 'ضمير المذكر: لجهوده المتميزة' },
  { male: 'لجهوده المخلصة', female: 'لجهودها المخلصة', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: لجهودها المخلصة', explanationFemaleToMale: 'ضمير المذكر: لجهوده المخلصة' },
  { male: 'لجهوده المباركة', female: 'لجهودها المباركة', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: لجهودها المباركة', explanationFemaleToMale: 'ضمير المذكر: لجهوده المباركة' },
  { male: 'لجهوده', female: 'لجهودها', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: لجهودها', explanationFemaleToMale: 'ضمير المذكر: لجهوده' },
  { male: 'جهوده', female: 'جهودها', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: جهودها', explanationFemaleToMale: 'ضمير المذكر: جهوده' },

  { male: 'تقديراً لتفوقه المشهود', female: 'تقديراً لتفوقها المشهود', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: لتفوقها المشهود', explanationFemaleToMale: 'ضمير المذكر: لتفوقه المشهود' },
  { male: 'تقديراً لتفوقه الباهر', female: 'تقديراً لتفوقها الباهر', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: لتفوقها الباهر', explanationFemaleToMale: 'ضمير المذكر: لتفوقه الباهر' },
  { male: 'تقديراً لتفوقه', female: 'تقديراً لتفوقها', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: لتفوقها', explanationFemaleToMale: 'ضمير المذكر: لتفوقه' },
  { male: 'لتفوقه المشهود', female: 'لتفوقها المشهود', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: لتفوقها المشهود', explanationFemaleToMale: 'ضمير المذكر: لتفوقه المشهود' },
  { male: 'لتفوقه', female: 'لتفوقها', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: لتفوقها', explanationFemaleToMale: 'ضمير المذكر: لتفوقه' },
  { male: 'وتفوقه', female: 'وتفوقها', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: وتفوقها', explanationFemaleToMale: 'ضمير المذكر: وتفوقه' },
  { male: 'تفوقه', female: 'تفوقها', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: تفوقها', explanationFemaleToMale: 'ضمير المذكر: تفوقه' },

  { male: 'تقديراً لإبداعه المستمر', female: 'تقديراً لإبداعها المستمر', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: لإبداعها المستمر', explanationFemaleToMale: 'ضمير المذكر: لإبداعه المستمر' },
  { male: 'تقديراً لإبداعه', female: 'تقديراً لإبداعها', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: لإبداعها', explanationFemaleToMale: 'ضمير المذكر: لإبداعه' },
  { male: 'إبداعه المستمر', female: 'إبداعها المستمر', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: إبداعها المستمر', explanationFemaleToMale: 'ضمير المذكر: إبداعه المستمر' },
  { male: 'إبداعه', female: 'إبداعها', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: إبداعها', explanationFemaleToMale: 'ضمير المذكر: إبداعه' },

  { male: 'تقديراً لتميزه', female: 'تقديراً لتميزها', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: لتميزها', explanationFemaleToMale: 'ضمير المذكر: لتميزه' },
  { male: 'لتميزه', female: 'لتميزها', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: لتميزها', explanationFemaleToMale: 'ضمير المذكر: لتميزه' },
  { male: 'تميزه', female: 'تميزها', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: تميزها', explanationFemaleToMale: 'ضمير المذكر: تميزه' },

  { male: 'تقديراً لعطائه', female: 'تقديراً لعطائها', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: لعطائها', explanationFemaleToMale: 'ضمير المذكر: لعطائه' },
  { male: 'لعطائه', female: 'لعطائها', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: لعطائها', explanationFemaleToMale: 'ضمير المذكر: لعطائه' },
  { male: 'عطائه', female: 'عطائها', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: عطائها', explanationFemaleToMale: 'ضمير المذكر: عطائه' },

  { male: 'تقديراً لاجتهاده', female: 'تقديراً لاجتهادها', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: لاجتهادها', explanationFemaleToMale: 'ضمير المذكر: لاجتهاده' },
  { male: 'لاجتهاده', female: 'لاجتهادها', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: لاجتهادها', explanationFemaleToMale: 'ضمير المذكر: لاجتهاده' },
  { male: 'اجتهاده', female: 'اجتهادها', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: اجتهادها', explanationFemaleToMale: 'ضمير المذكر: اجتهاده' },

  { male: 'تقديراً لحرصه', female: 'تقديراً لحرصها', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: لحرصها', explanationFemaleToMale: 'ضمير المذكر: لحرصه' },
  { male: 'لحرصه', female: 'لحرصها', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: لحرصها', explanationFemaleToMale: 'ضمير المذكر: لحرصه' },
  { male: 'وحرصه', female: 'وحرصها', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: وحرصها', explanationFemaleToMale: 'ضمير المذكر: وحرصه' },
  { male: 'حرصه', female: 'حرصها', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: حرصها', explanationFemaleToMale: 'ضمير المذكر: حرصه' },

  { male: 'تقديراً لمواظبته', female: 'تقديراً لمواظبتها', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: لمواظبتها', explanationFemaleToMale: 'ضمير المذكر: لمواظبته' },
  { male: 'لمواظبته', female: 'لمواظبتها', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: لمواظبتها', explanationFemaleToMale: 'ضمير المذكر: لمواظبته' },
  { male: 'مواظبته', female: 'مواظبتها', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: مواظبتها', explanationFemaleToMale: 'ضمير المذكر: مواظبته' },

  { male: 'تقديراً لانضباطه', female: 'تقديراً لانضباطها', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: لانضباطها', explanationFemaleToMale: 'ضمير المذكر: لانضباطه' },
  { male: 'لانضباطه', female: 'لانضباطها', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: لانضباطها', explanationFemaleToMale: 'ضمير المذكر: لانضباطه' },
  { male: 'انضباطه', female: 'انضباطها', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: انضباطها', explanationFemaleToMale: 'ضمير المذكر: انضباطه' },

  { male: 'تقديراً لسلوكه', female: 'تقديراً لسلوكها', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: لسلوكها', explanationFemaleToMale: 'ضمير المذكر: لسلوكه' },
  { male: 'لسلوكه', female: 'لسلوكها', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: لسلوكها', explanationFemaleToMale: 'ضمير المذكر: لسلوكه' },
  { male: 'سلوكه', female: 'سلوكها', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: سلوكها', explanationFemaleToMale: 'ضمير المذكر: سلوكه' },

  { male: 'تقديراً لأخلاقه', female: 'تقديراً لأخلاقها', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: لأخلاقها', explanationFemaleToMale: 'ضمير المذكر: لأخلاقه' },
  { male: 'لأخلاقه', female: 'لأخلاقها', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: لأخلاقها', explanationFemaleToMale: 'ضمير المذكر: لأخلاقه' },
  { male: 'أخلاقه', female: 'أخلاقها', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: أخلاقها', explanationFemaleToMale: 'ضمير المذكر: أخلاقه' },

  { male: 'تقديراً لإنجازه', female: 'تقديراً لإنجازها', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: لإنجازها', explanationFemaleToMale: 'ضمير المذكر: لإنجازه' },
  { male: 'لإنجازه', female: 'لإنجازها', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: لإنجازها', explanationFemaleToMale: 'ضمير المذكر: لإنجازه' },
  { male: 'إنجازه', female: 'إنجازها', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: إنجازها', explanationFemaleToMale: 'ضمير المذكر: إنجازه' },

  { male: 'تقديراً لإتقانه', female: 'تقديراً لإتقانها', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: لإتقانها', explanationFemaleToMale: 'ضمير المذكر: لإتقانه' },
  { male: 'لإتقانه', female: 'لإتقانها', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: لإتقانها', explanationFemaleToMale: 'ضمير المذكر: لإتقانه' },
  { male: 'إتقانه', female: 'إتقانها', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: إتقانها', explanationFemaleToMale: 'ضمير المذكر: إتقانه' },

  { male: 'تقديراً لإتمامه', female: 'تقديراً لإتمامها', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: لإتمامها', explanationFemaleToMale: 'ضمير المذكر: لإتمامه' },
  { male: 'لإتمامه', female: 'لإتمامها', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: لإتمامها', explanationFemaleToMale: 'ضمير المذكر: لإتمامه' },
  { male: 'إتمامه', female: 'إتمامها', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: إتمامها', explanationFemaleToMale: 'ضمير المذكر: إتمامه' },

  { male: 'تقديراً لأدائه', female: 'تقديراً لأدائها', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: لأدائها', explanationFemaleToMale: 'ضمير المذكر: لأدائه' },
  { male: 'لأدائه', female: 'لأدائها', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: لأدائها', explanationFemaleToMale: 'ضمير المذكر: لأدائه' },
  { male: 'أدائه', female: 'أدائها', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: أدائها', explanationFemaleToMale: 'ضمير المذكر: أدائه' },

  { male: 'تقديراً لمشاركته', female: 'تقديراً لمشاركتها', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: لمشاركتها', explanationFemaleToMale: 'ضمير المذكر: لمشاركته' },
  { male: 'لمشاركته', female: 'لمشاركتها', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: لمشاركتها', explanationFemaleToMale: 'ضمير المذكر: لمشاركته' },
  { male: 'مشاركته', female: 'مشاركتها', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: مشاركتها', explanationFemaleToMale: 'ضمير المذكر: مشاركته' },

  { male: 'تقديراً لمساهمته', female: 'تقديراً لمساهمتها', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: لمساهمتها', explanationFemaleToMale: 'ضمير المذكر: لمساهمته' },
  { male: 'لمساهمته', female: 'لمساهمتها', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: لمساهمتها', explanationFemaleToMale: 'ضمير المذكر: لمساهمته' },
  { male: 'مساهمته', female: 'مساهمتها', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: مساهمتها', explanationFemaleToMale: 'ضمير المذكر: مساهمته' },

  { male: 'تقديراً لتألقه', female: 'تقديراً لتألقها', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: لتألقها', explanationFemaleToMale: 'ضمير المذكر: لتألقه' },
  { male: 'لتألقه', female: 'لتألقها', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: لتألقها', explanationFemaleToMale: 'ضمير المذكر: لتألقه' },
  { male: 'تألقه', female: 'تألقها', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: تألقها', explanationFemaleToMale: 'ضمير المذكر: تألقه' },

  { male: 'تقديراً لحصوله', female: 'تقديراً لحصولها', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: لحصولها', explanationFemaleToMale: 'ضمير المذكر: لحصوله' },
  { male: 'لحصوله', female: 'لحصولها', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: لحصولها', explanationFemaleToMale: 'ضمير المذكر: لحصوله' },
  { male: 'حصوله', female: 'حصولها', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: حصولها', explanationFemaleToMale: 'ضمير المذكر: حصوله' },

  { male: 'تقديراً لتحصيله', female: 'تقديراً لتحصيلها', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: لتحصيلها', explanationFemaleToMale: 'ضمير المذكر: لتحصيله' },
  { male: 'لتحصيله', female: 'لتحصيلها', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: لتحصيلها', explanationFemaleToMale: 'ضمير المذكر: لتحصيله' },
  { male: 'تحصيله', female: 'تحصيلها', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: تحصيلها', explanationFemaleToMale: 'ضمير المذكر: تحصيله' },

  { male: 'تقديراً لتحقيقه', female: 'تقديراً لتحقيقها', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: لتحقيقها', explanationFemaleToMale: 'ضمير المذكر: لتحقيقه' },
  { male: 'لتحقيقه', female: 'لتحقيقها', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: لتحقيقها', explanationFemaleToMale: 'ضمير المذكر: لتحقيقه' },
  { male: 'تحقيقه', female: 'تحقيقها', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: تحقيقها', explanationFemaleToMale: 'ضمير المذكر: تحقيقه' },

  { male: 'تقديراً لابتكاره', female: 'تقديراً لابتكارها', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: لابتكارها', explanationFemaleToMale: 'ضمير المذكر: لابتكاره' },
  { male: 'لابتكاره', female: 'لابتكارها', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: لابتكارها', explanationFemaleToMale: 'ضمير المذكر: لابتكاره' },
  { male: 'ابتكاره', female: 'ابتكارها', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: ابتكارها', explanationFemaleToMale: 'ضمير المذكر: ابتكاره' },

  { male: 'تقديراً لقيادته', female: 'تقديراً لقيادتها', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: لقيادتها', explanationFemaleToMale: 'ضمير المذكر: لقيادته' },
  { male: 'لقيادته', female: 'لقيادتها', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: لقيادتها', explanationFemaleToMale: 'ضمير المذكر: لقيادته' },
  { male: 'قيادته', female: 'قيادتها', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: قيادتها', explanationFemaleToMale: 'ضمير المذكر: قيادته' },

  { male: 'تقديراً لتفانيه', female: 'تقديراً لتفانيها', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: لتفانيها', explanationFemaleToMale: 'ضمير المذكر: لتفانيه' },
  { male: 'لتفانيه', female: 'لتفانيها', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: لتفانيها', explanationFemaleToMale: 'ضمير المذكر: لتفانيه' },
  { male: 'تفانيه', female: 'تفانيها', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: تفانيها', explanationFemaleToMale: 'ضمير المذكر: تفانيه' },

  { male: 'تقديراً لتفرده', female: 'تقديراً لتفردها', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: لتفردها', explanationFemaleToMale: 'ضمير المذكر: لتفرده' },
  { male: 'تفرده', female: 'تفردها', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: تفردها', explanationFemaleToMale: 'ضمير المذكر: تفرده' },

  { male: 'تقديراً لتعاونه', female: 'تقديراً لتعاونها', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: لتعاونها', explanationFemaleToMale: 'ضمير المذكر: لتعاونه' },
  { male: 'تعاونه', female: 'تعاونها', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: تعاونها', explanationFemaleToMale: 'ضمير المذكر: تعاونه' },

  { male: 'تقديراً لحفظه', female: 'تقديراً لحفظها', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: لحفظها', explanationFemaleToMale: 'ضمير المذكر: لحفظه' },
  { male: 'حفظه', female: 'حفظها', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: حفظها', explanationFemaleToMale: 'ضمير المذكر: حفظه' },

  { male: 'تقديراً لتلاوته', female: 'تقديراً لتلاوتها', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: لتلاوتها', explanationFemaleToMale: 'ضمير المذكر: لتلاوته' },
  { male: 'تلاوته', female: 'تلاوتها', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: تلاوتها', explanationFemaleToMale: 'ضمير المذكر: تلاوته' },

  { male: 'فوزه', female: 'فوزها', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: فوزها', explanationFemaleToMale: 'ضمير المذكر: فوزه' },
  { male: 'حضوره', female: 'حضورها', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: حضورها', explanationFemaleToMale: 'ضمير المذكر: حضوره' },
  { male: 'تفاعله', female: 'تفاعلها', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: تفاعلها', explanationFemaleToMale: 'ضمير المذكر: تفاعله' },
  { male: 'سعيه', female: 'سعيها', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: سعيها', explanationFemaleToMale: 'ضمير المذكر: سعيه' },
  { male: 'شغفه', female: 'شغفها', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: شغفها', explanationFemaleToMale: 'ضمير المذكر: شغفه' },
  { male: 'طموحه', female: 'طموحها', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: طموحها', explanationFemaleToMale: 'ضمير المذكر: طموحه' },
  { male: 'ذكائه', female: 'ذكائها', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: ذكائها', explanationFemaleToMale: 'ضمير المذكر: ذكائه' },
  { male: 'فهمه', female: 'فهمها', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: فهمها', explanationFemaleToMale: 'ضمير المذكر: فهمه' },
  { male: 'نجاحه', female: 'نجاحها', category: 'pronoun', explanationMaleToFemale: 'ضمير المؤنث: نجاحها', explanationFemaleToMale: 'ضمير المذكر: نجاحه' },

  { male: 'أبداه من', female: 'أبدته من', category: 'pronoun', explanationMaleToFemale: 'تأنيث: أبدته من', explanationFemaleToMale: 'تذكير: أبداه من' },
  { male: 'أبداه', female: 'أبدته', category: 'pronoun', explanationMaleToFemale: 'تأنيث: أبدته', explanationFemaleToMale: 'تذكير: أبداه' },
  { male: 'أبداءه', female: 'أبدائها', category: 'pronoun', explanationMaleToFemale: 'تأنيث: أبدائها', explanationFemaleToMale: 'تذكير: أبداءه' },
  { male: 'ما بذله', female: 'ما بذلته', category: 'verb', explanationMaleToFemale: 'تأنيث الفعل: ما بذلته', explanationFemaleToMale: 'تذكير الفعل: ما بذله' },
  { male: 'ما قدمه', female: 'ما قدمته', category: 'verb', explanationMaleToFemale: 'تأنيث الفعل: ما قدمته', explanationFemaleToMale: 'تذكير الفعل: ما قدمه' },
  { male: 'ما حققه', female: 'ما حققته', category: 'verb', explanationMaleToFemale: 'تأنيث الفعل: ما حققته', explanationFemaleToMale: 'تذكير الفعل: ما حققه' },
  { male: 'ما أظهره', female: 'ما أظهرته', category: 'verb', explanationMaleToFemale: 'تأنيث الفعل: ما أظهرته', explanationFemaleToMale: 'تذكير الفعل: ما أظهره' },
  { male: 'ما أحرزه', female: 'ما أحرزته', category: 'verb', explanationMaleToFemale: 'تأنيث الفعل: ما أحرزته', explanationFemaleToMale: 'تذكير الفعل: ما أحرزه' },
  { male: 'ما أنجزه', female: 'ما أنجزته', category: 'verb', explanationMaleToFemale: 'تأنيث الفعل: ما أنجزته', explanationFemaleToMale: 'تذكير الفعل: ما أنجزه' },

  { male: 'مع زملائه ومعلميه', female: 'مع زميلاتها ومعلماتها', category: 'pronoun', explanationMaleToFemale: 'مواءمة الزميلات والمعلمات للمؤنث', explanationFemaleToMale: 'مواءمة الزملاء والمعلمين للمذكر' },
  { male: 'مع زملائه', female: 'مع زميلاتها', category: 'pronoun', explanationMaleToFemale: 'تأنيث: مع زميلاتها', explanationFemaleToMale: 'تذكير: مع زملائه' },
  { male: 'زملائه', female: 'زميلاتها', category: 'pronoun', explanationMaleToFemale: 'تأنيث: زميلاتها', explanationFemaleToMale: 'تذكير: زملائه' },
  { male: 'مع معلميه', female: 'مع معلماتها', category: 'pronoun', explanationMaleToFemale: 'تأنيث: مع معلماتها', explanationFemaleToMale: 'تذكير: مع معلميه' },
  { male: 'معلميه', female: 'معلماتها', category: 'pronoun', explanationMaleToFemale: 'تأنيث: معلماتها', explanationFemaleToMale: 'تذكير: معلميه' },
  { male: 'مع أساتذته', female: 'مع أستاذاتها', category: 'pronoun', explanationMaleToFemale: 'تأنيث: مع أستاذاتها', explanationFemaleToMale: 'تذكير: مع أساتذته' },
  { male: 'أساتذته', female: 'أستاذاتها', category: 'pronoun', explanationMaleToFemale: 'تأنيث: أستاذاتها', explanationFemaleToMale: 'تذكير: أساتذته' },
  { male: 'بين أقرانه', female: 'بين قريناتها', category: 'pronoun', explanationMaleToFemale: 'تأنيث: بين قريناتها', explanationFemaleToMale: 'تذكير: بين أقرانه' },
  { male: 'أقرانه', female: 'قريناتها', category: 'pronoun', explanationMaleToFemale: 'تأنيث: قريناتها', explanationFemaleToMale: 'تذكير: أقرانه' },
  { male: 'لوالديه', female: 'لوالديها', category: 'pronoun', explanationMaleToFemale: 'تأنيث: لوالديها', explanationFemaleToMale: 'تذكير: لوالديه' },
  { male: 'والديه', female: 'والديها', category: 'pronoun', explanationMaleToFemale: 'تأنيث: والديها', explanationFemaleToMale: 'تذكير: والديه' },
  { male: 'لأهله', female: 'لأهلها', category: 'pronoun', explanationMaleToFemale: 'تأنيث: لأهلها', explanationFemaleToMale: 'تذكير: لأهله' },
  { male: 'أهله', female: 'أهلها', category: 'pronoun', explanationMaleToFemale: 'تأنيث: أهلها', explanationFemaleToMale: 'تذكير: أهله' },
  { male: 'لوطنه', female: 'لوطنها', category: 'pronoun', explanationMaleToFemale: 'تأنيث: لوطنها', explanationFemaleToMale: 'تذكير: لوطنه' },
  { male: 'وطنه', female: 'وطنها', category: 'pronoun', explanationMaleToFemale: 'تأنيث: وطنها', explanationFemaleToMale: 'تذكير: وطنه' },
  { male: 'لمدرسته', female: 'لمدرستها', category: 'pronoun', explanationMaleToFemale: 'تأنيث: لمدرستها', explanationFemaleToMale: 'تذكير: لمدرسته' },
  { male: 'مدرسته', female: 'مدرستها', category: 'pronoun', explanationMaleToFemale: 'تأنيث: مدرستها', explanationFemaleToMale: 'تذكير: مدرسته' },
  { male: 'لفصله', female: 'لفصلها', category: 'pronoun', explanationMaleToFemale: 'تأنيث: لفصلها', explanationFemaleToMale: 'تذكير: لفصله' },
  { male: 'فصله', female: 'فصلها', category: 'pronoun', explanationMaleToFemale: 'تأنيث: فصلها', explanationFemaleToMale: 'تذكير: فصله' },
  { male: 'لصفه', female: 'لصفها', category: 'pronoun', explanationMaleToFemale: 'تأنيث: لصفها', explanationFemaleToMale: 'تذكير: لصفه' },
  { male: 'صفه', female: 'صفها', category: 'pronoun', explanationMaleToFemale: 'تأنيث: صفها', explanationFemaleToMale: 'تذكير: صفه' },
  { male: 'لفريقه', female: 'لفريقها', category: 'pronoun', explanationMaleToFemale: 'تأنيث: لفريقها', explanationFemaleToMale: 'تذكير: لفريقه' },
  { male: 'فريقه', female: 'فريقها', category: 'pronoun', explanationMaleToFemale: 'تأنيث: فريقها', explanationFemaleToMale: 'تذكير: فريقه' },
  { male: 'في مسيرته التعليمية', female: 'في مسيرتها التعليمية', category: 'pronoun', explanationMaleToFemale: 'تأنيث: في مسيرتها التعليمية', explanationFemaleToMale: 'تذكير: في مسيرته التعليمية' },
  { male: 'في مسيرته', female: 'في مسيرتها', category: 'pronoun', explanationMaleToFemale: 'تأنيث: في مسيرتها', explanationFemaleToMale: 'تذكير: في مسيرته' },
  { male: 'مسيرته', female: 'مسيرتها', category: 'pronoun', explanationMaleToFemale: 'تأنيث: مسيرتها', explanationFemaleToMale: 'تذكير: مسيرته' },
  { male: 'في مستقبله', female: 'في مستقبلها', category: 'pronoun', explanationMaleToFemale: 'تأنيث: في مستقبلها', explanationFemaleToMale: 'تذكير: في مستقبله' },
  { male: 'مستقبله', female: 'مستقبلها', category: 'pronoun', explanationMaleToFemale: 'تأنيث: مستقبلها', explanationFemaleToMale: 'تذكير: مستقبله' },
  { male: 'في دراسته', female: 'في دراستها', category: 'pronoun', explanationMaleToFemale: 'تأنيث: في دراستها', explanationFemaleToMale: 'تذكير: في دراسته' },
  { male: 'في حياته', female: 'في حياتها', category: 'pronoun', explanationMaleToFemale: 'تأنيث: في حياتها', explanationFemaleToMale: 'تذكير: في حياته' },

  // 6. Verbs (Past tense + Relative Clauses)
  { male: 'الذي يجسد', female: 'التي تجسد', category: 'verb', explanationMaleToFemale: 'تأنيث الاسم الموصول والفعل: التي تجسد', explanationFemaleToMale: 'تذكير الاسم الموصول والفعل: الذي يجسد' },
  { male: 'الذي أبهر', female: 'التي أبهرت', category: 'verb', explanationMaleToFemale: 'تأنيث الاسم الموصول والفعل: التي أبهرت', explanationFemaleToMale: 'تذكير الاسم الموصول والفعل: الذي أبهر' },
  { male: 'الذي حقق', female: 'التي حققت', category: 'verb', explanationMaleToFemale: 'تأنيث: التي حققت', explanationFemaleToMale: 'تذكير: الذي حقق' },
  { male: 'الذي أبدع', female: 'التي أبدعت', category: 'verb', explanationMaleToFemale: 'تأنيث: التي أبدعت', explanationFemaleToMale: 'تذكير: الذي أبدع' },
  { male: 'الذي تميز', female: 'التي تميزت', category: 'verb', explanationMaleToFemale: 'تأنيث: التي تميزت', explanationFemaleToMale: 'تذكير: الذي تميز' },
  { male: 'الذي تفوق', female: 'التي تفوقت', category: 'verb', explanationMaleToFemale: 'تأنيث: التي تفوقت', explanationFemaleToMale: 'تذكير: الذي تفوق' },
  { male: 'الذي شارك', female: 'التي شاركت', category: 'verb', explanationMaleToFemale: 'تأنيث: التي شاركت', explanationFemaleToMale: 'تذكير: الذي شارك' },
  { male: 'الذي ساهم', female: 'التي ساهمت', category: 'verb', explanationMaleToFemale: 'تأنيث: التي ساهمت', explanationFemaleToMale: 'تذكير: الذي ساهم' },
  { male: 'الذي واظب', female: 'التي واظبت', category: 'verb', explanationMaleToFemale: 'تأنيث: التي واظبت', explanationFemaleToMale: 'تذكير: الذي واظب' },
  { male: 'الذي اجتهد', female: 'التي اجتهدت', category: 'verb', explanationMaleToFemale: 'تأنيث: التي اجتهدت', explanationFemaleToMale: 'تذكير: الذي اجتهد' },
  { male: 'الذي أثبت', female: 'التي أثبتت', category: 'verb', explanationMaleToFemale: 'تأنيث: التي أثبتت', explanationFemaleToMale: 'تذكير: الذي أثبت' },

  { male: 'فقد أثبت جدارته', female: 'فقد أثبتت جدارتها', category: 'verb', explanationMaleToFemale: 'تأنيث الفعل والضمير: فقد أثبتت جدارتها', explanationFemaleToMale: 'تذكير الفعل والضمير: فقد أثبت جدارته' },
  { male: 'فقد حقق المركز', female: 'فقد حققت المركز', category: 'verb', explanationMaleToFemale: 'تأنيث الفعل: فقد حققت المركز', explanationFemaleToMale: 'تذكير الفعل: فقد حقق المركز' },
  { male: 'فقد نال وسام', female: 'فقد نالت وسام', category: 'verb', explanationMaleToFemale: 'تأنيث الفعل: فقد نالت وسام', explanationFemaleToMale: 'تذكير الفعل: فقد نال وسام' },
  { male: 'فقد أحرز المركز', female: 'فقد أحرزت المركز', category: 'verb', explanationMaleToFemale: 'تأنيث الفعل: فقد أحرزت المركز', explanationFemaleToMale: 'تذكير الفعل: فقد أحرز المركز' },
  { male: 'فقد اجتاز اختبار', female: 'فقد اجتازت اختبار', category: 'verb', explanationMaleToFemale: 'تأنيث الفعل: فقد اجتازت اختبار', explanationFemaleToMale: 'تذكير الفعل: فقد اجتاز اختبار' },
  { male: 'فقد أتم حفظ', female: 'فقد أتمت حفظ', category: 'verb', explanationMaleToFemale: 'تأنيث الفعل: فقد أتمت حفظ', explanationFemaleToMale: 'تذكير الفعل: فقد أتم حفظ' },
  { male: 'فقد استحق هذا التكريم', female: 'فقد استحقت هذا التكريم', category: 'verb', explanationMaleToFemale: 'تأنيث الفعل: فقد استحقت هذا التكريم', explanationFemaleToMale: 'تذكير الفعل: فقد استحق هذا التكريم' },

  { male: 'حقق', female: 'حققت', category: 'verb', explanationMaleToFemale: 'إضافة تاء التأنيث: حققت', explanationFemaleToMale: 'حذف تاء التأنيث: حقق' },
  { male: 'أنجز', female: 'أنجزت', category: 'verb', explanationMaleToFemale: 'إضافة تاء التأنيث: أنجزت', explanationFemaleToMale: 'حذف تاء التأنيث: أنجز' },
  { male: 'أبدع', female: 'أبدعت', category: 'verb', explanationMaleToFemale: 'إضافة تاء التأنيث: أبدعت', explanationFemaleToMale: 'حذف تاء التأنيث: أبدع' },
  { male: 'أبدى', female: 'أبدت', category: 'verb', explanationMaleToFemale: 'تأنيث الفعل: أبدت', explanationFemaleToMale: 'تذكير الفعل: أبدى' },
  { male: 'أظهر', female: 'أظهرت', category: 'verb', explanationMaleToFemale: 'إضافة تاء التأنيث: أظهرت', explanationFemaleToMale: 'حذف تاء التأنيث: أظهر' },
  { male: 'قدم', female: 'قدمت', category: 'verb', explanationMaleToFemale: 'إضافة تاء التأنيث: قدمت', explanationFemaleToMale: 'حذف تاء التأنيث: قدم' },
  { male: 'بذل', female: 'بذلت', category: 'verb', explanationMaleToFemale: 'إضافة تاء التأنيث: بذلت', explanationFemaleToMale: 'حذف تاء التأنيث: بذل' },
  { male: 'حصل', female: 'حصلت', category: 'verb', explanationMaleToFemale: 'إضافة تاء التأنيث: حصلت', explanationFemaleToMale: 'حذف تاء التأنيث: حصل' },
  { male: 'نال', female: 'نالت', category: 'verb', explanationMaleToFemale: 'إضافة تاء التأنيث: نالت', explanationFemaleToMale: 'حذف تاء التأنيث: نال' },
  { male: 'أحرز', female: 'أحرزت', category: 'verb', explanationMaleToFemale: 'إضافة تاء التأنيث: أحرزت', explanationFemaleToMale: 'حذف تاء التأنيث: أحرز' },
  { male: 'اجتاز', female: 'اجتازت', category: 'verb', explanationMaleToFemale: 'إضافة تاء التأنيث: اجتازت', explanationFemaleToMale: 'حذف تاء التأنيث: اجتاز' },
  { male: 'شارك', female: 'شاركت', category: 'verb', explanationMaleToFemale: 'إضافة تاء التأنيث: شاركت', explanationFemaleToMale: 'حذف تاء التأنيث: شارك' },
  { male: 'ساهم', female: 'ساهمت', category: 'verb', explanationMaleToFemale: 'إضافة تاء التأنيث: ساهمت', explanationFemaleToMale: 'حذف تاء التأنيث: ساهم' },
  { male: 'تميز', female: 'تميزت', category: 'verb', explanationMaleToFemale: 'إضافة تاء التأنيث: تميزت', explanationFemaleToMale: 'حذف تاء التأنيث: تميز' },
  { male: 'تألق', female: 'تألقت', category: 'verb', explanationMaleToFemale: 'إضافة تاء التأنيث: تألقت', explanationFemaleToMale: 'حذف تاء التأنيث: تألق' },
  { male: 'تفوق', female: 'تفوقت', category: 'verb', explanationMaleToFemale: 'إضافة تاء التأنيث: تفوقت', explanationFemaleToMale: 'حذف تاء التأنيث: تفوق' },
  { male: 'ثابر', female: 'ثابرت', category: 'verb', explanationMaleToFemale: 'إضافة تاء التأنيث: ثابرت', explanationFemaleToMale: 'حذف تاء التأنيث: ثابر' },
  { male: 'واظب', female: 'واظبت', category: 'verb', explanationMaleToFemale: 'إضافة تاء التأنيث: واظبت', explanationFemaleToMale: 'حذف تاء التأنيث: واظب' },
  { male: 'حفظ', female: 'حفظت', category: 'verb', explanationMaleToFemale: 'إضافة تاء التأنيث: حفظت', explanationFemaleToMale: 'حذف تاء التأنيث: حفظ' },
  { male: 'استحق', female: 'استحقت', category: 'verb', explanationMaleToFemale: 'إضافة تاء التأنيث: استحقت', explanationFemaleToMale: 'حذف تاء التأنيث: استحق' },
  { male: 'استوفى', female: 'استوفت', category: 'verb', explanationMaleToFemale: 'تأنيث الفعل: استوفت', explanationFemaleToMale: 'تذكير الفعل: استوفى' },
  { male: 'أكمل', female: 'أكملت', category: 'verb', explanationMaleToFemale: 'إضافة تاء التأنيث: أكملت', explanationFemaleToMale: 'حذف تاء التأنيث: أكمل' },
  { male: 'أتم', female: 'أتمت', category: 'verb', explanationMaleToFemale: 'إضافة تاء التأنيث: أتمت', explanationFemaleToMale: 'حذف تاء التأنيث: أتم' },
  { male: 'سطر', female: 'سطرت', category: 'verb', explanationMaleToFemale: 'إضافة تاء التأنيث: سطرت', explanationFemaleToMale: 'حذف تاء التأنيث: سطر' },
  { male: 'حصد', female: 'حصدت', category: 'verb', explanationMaleToFemale: 'إضافة تاء التأنيث: حصدت', explanationFemaleToMale: 'حذف تاء التأنيث: حصد' },
  { male: 'أثبت', female: 'أثبتت', category: 'verb', explanationMaleToFemale: 'إضافة تاء التأنيث: أثبتت', explanationFemaleToMale: 'حذف تاء التأنيث: أثبت' },

  // 7. Direct Speech, Salutations & Direct Address
  { male: 'كنت خير مثال', female: 'كنتِ خير مثال', category: 'salutation', explanationMaleToFemale: 'مخاطبة المؤنث: كنتِ خير مثال', explanationFemaleToMale: 'مخاطبة المذكر: كنت خير مثال' },
  { male: 'دمت كوكباً وضاءً', female: 'دمتِ شعلة وضاءة', category: 'salutation', explanationMaleToFemale: 'مخاطبة المؤنث: دمتِ شعلة وضاءة', explanationFemaleToMale: 'مخاطبة المذكر: دمت كوكباً وضاءً' },
  { male: 'دمت كوكباً', female: 'دمتِ شعلة', category: 'salutation', explanationMaleToFemale: 'مخاطبة المؤنث: دمتِ شعلة', explanationFemaleToMale: 'مخاطبة المذكر: دمت كوكباً' },
  { male: 'دمت متألقاً', female: 'دمتِ متألقة', category: 'salutation', explanationMaleToFemale: 'مخاطبة المؤنث: دمتِ متألقة', explanationFemaleToMale: 'مخاطبة المذكر: دمت متألقاً' },
  { male: 'دمت مبدعاً', female: 'دمتِ مبدعة', category: 'salutation', explanationMaleToFemale: 'مخاطبة المؤنث: دمتِ مبدعة', explanationFemaleToMale: 'مخاطبة المذكر: دمت مبدعاً' },
  { male: 'دمت متميزاً', female: 'دمتِ متميزة', category: 'salutation', explanationMaleToFemale: 'مخاطبة المؤنث: دمتِ متميزة', explanationFemaleToMale: 'مخاطبة المذكر: دمت متميزاً' },
  { male: 'دمت فخراً', female: 'دمتِ فخراً', category: 'salutation', explanationMaleToFemale: 'مخاطبة المؤنث: دمتِ فخراً', explanationFemaleToMale: 'مخاطبة المذكر: دمت فخراً' },
  { male: 'بوركت جهودك', female: 'بوركت جهودكِ', category: 'salutation', explanationMaleToFemale: 'مخاطبة المؤنث: بوركت جهودكِ', explanationFemaleToMale: 'مخاطبة المذكر: بوركت جهودك' },
  { male: 'شكرًا لك يا بطل', female: 'شكرًا لكِ يا بطلة', category: 'salutation', explanationMaleToFemale: 'مخاطبة المؤنث: شكرًا لكِ يا بطلة', explanationFemaleToMale: 'مخاطبة المذكر: شكرًا لك يا بطل' },
  { male: 'شكرًا لك يا نجمنا', female: 'شكرًا لكِ يا نجمتنا', category: 'salutation', explanationMaleToFemale: 'مخاطبة المؤنث: شكرًا لكِ يا نجمتنا', explanationFemaleToMale: 'مخاطبة المذكر: شكرًا لك يا نجمنا' },
  { male: 'شكرًا لك', female: 'شكرًا لكِ', category: 'salutation', explanationMaleToFemale: 'مخاطبة المؤنث: شكرًا لكِ', explanationFemaleToMale: 'مخاطبة المذكر: شكرًا لك' },
  { male: 'لك منا أطيب التحايا', female: 'لكِ منا أطيب التحايا', category: 'salutation', explanationMaleToFemale: 'مخاطبة المؤنث: لكِ منا أطيب التحايا', explanationFemaleToMale: 'مخاطبة المذكر: لك منا أطيب التحايا' },
  { male: 'لك منا', female: 'لكِ منا', category: 'salutation', explanationMaleToFemale: 'مخاطبة المؤنث: لكِ منا', explanationFemaleToMale: 'مخاطبة المذكر: لك منا' },

  // 8. General Adjectives & Positions
  { male: 'الحاصل على المركز الأول', female: 'الحاصلة على المركز الأول', category: 'adjective', explanationMaleToFemale: 'تأنيث: الحاصلة على المركز الأول', explanationFemaleToMale: 'تذكير: الحاصل على المركز الأول' },
  { male: 'الحاصل على أعلى المراتب', female: 'الحاصلة على أعلى المراتب', category: 'adjective', explanationMaleToFemale: 'تأنيث: الحاصلة على أعلى المراتب', explanationFemaleToMale: 'تذكير: الحاصل على أعلى المراتب' },
  { male: 'الحاصل على', female: 'الحاصلة على', category: 'adjective', explanationMaleToFemale: 'تأنيث: الحاصلة على', explanationFemaleToMale: 'تذكير: الحاصل على' },
  { male: 'حاصل على', female: 'حاصلة على', category: 'adjective', explanationMaleToFemale: 'تأنيث: حاصلة على', explanationFemaleToMale: 'تذكير: حاصل على' },
  { male: 'حاصل', female: 'حاصلة', category: 'adjective', explanationMaleToFemale: 'تأنيث: حاصلة', explanationFemaleToMale: 'تذكير: حاصل' },
  { male: 'الحائز على', female: 'الحائزة على', category: 'adjective', explanationMaleToFemale: 'تأنيث: الحائزة على', explanationFemaleToMale: 'تذكير: الحائز على' },
  { male: 'حائز على', female: 'حائزة على', category: 'adjective', explanationMaleToFemale: 'تأنيث: حائزة على', explanationFemaleToMale: 'تذكير: حائز على' },
  { male: 'حائز', female: 'حائزة', category: 'adjective', explanationMaleToFemale: 'تأنيث: حائزة', explanationFemaleToMale: 'تذكير: حائز' },
  { male: 'الفائز بالمركز الأول', female: 'الفائزة بالمركز الأول', category: 'adjective', explanationMaleToFemale: 'تأنيث: الفائزة بالمركز الأول', explanationFemaleToMale: 'تذكير: الفائز بالمركز الأول' },
  { male: 'الفائز بالمركز', female: 'الفائزة بالمركز', category: 'adjective', explanationMaleToFemale: 'تأنيث: الفائزة بالمركز', explanationFemaleToMale: 'تذكير: الفائز بالمركز' },
  { male: 'الفائز بـ', female: 'الفائزة بـ', category: 'adjective', explanationMaleToFemale: 'تأنيث: الفائزة بـ', explanationFemaleToMale: 'تذكير: الفائز بـ' },
  { male: 'فائز بـ', female: 'فائزة بـ', category: 'adjective', explanationMaleToFemale: 'تأنيث: فائزة بـ', explanationFemaleToMale: 'تذكير: فائز بـ' },
  { male: 'الفائز', female: 'الفائزة', category: 'adjective', explanationMaleToFemale: 'تأنيث: الفائزة', explanationFemaleToMale: 'تذكير: الفائز' },
  { male: 'فائز', female: 'فائزة', category: 'adjective', explanationMaleToFemale: 'تأنيث: فائزة', explanationFemaleToMale: 'تذكير: فائز' },

  { male: 'المشارك في', female: 'المشاركة في', category: 'adjective', explanationMaleToFemale: 'تأنيث: المشاركة في', explanationFemaleToMale: 'تذكير: المشارك في' },
  { male: 'مشارك في', female: 'مشاركة في', category: 'adjective', explanationMaleToFemale: 'تأنيث: مشاركة في', explanationFemaleToMale: 'تذكير: مشارك في' },
  { male: 'المشارك', female: 'المشاركة', category: 'adjective', explanationMaleToFemale: 'تأنيث: المشاركة', explanationFemaleToMale: 'تذكير: المشارك' },
  { male: 'مشارك', female: 'مشاركة', category: 'adjective', explanationMaleToFemale: 'تأنيث: مشاركة', explanationFemaleToMale: 'تذكير: مشارك' },

  { male: 'المتفوق في', female: 'المتفوقة في', category: 'adjective', explanationMaleToFemale: 'تأنيث: المتفوقة في', explanationFemaleToMale: 'تذكير: المتفوق في' },
  { male: 'متفوق في', female: 'متفوقة في', category: 'adjective', explanationMaleToFemale: 'تأنيث: متفوقة في', explanationFemaleToMale: 'تذكير: متفوق في' },
  { male: 'المتفوق', female: 'المتفوقة', category: 'adjective', explanationMaleToFemale: 'تأنيث: المتفوقة', explanationFemaleToMale: 'تذكير: المتفوق' },
  { male: 'متفوق', female: 'متفوقة', category: 'adjective', explanationMaleToFemale: 'تأنيث: متفوقة', explanationFemaleToMale: 'تذكير: متفوق' },

  { male: 'المتميز في', female: 'المتميزة في', category: 'adjective', explanationMaleToFemale: 'تأنيث: المتميزة في', explanationFemaleToMale: 'تذكير: المتميز في' },
  { male: 'متميز في', female: 'متميزة في', category: 'adjective', explanationMaleToFemale: 'تأنيث: متميزة في', explanationFemaleToMale: 'تذكير: متميز في' },
  { male: 'المتميز', female: 'المتميزة', category: 'adjective', explanationMaleToFemale: 'تأنيث: المتميزة', explanationFemaleToMale: 'تذكير: المتميز' },
  { male: 'متميز', female: 'متميزة', category: 'adjective', explanationMaleToFemale: 'تأنيث: متميزة', explanationFemaleToMale: 'تذكير: متميز' },

  { male: 'المبدع في', female: 'المبدعة في', category: 'adjective', explanationMaleToFemale: 'تأنيث: المبدعة في', explanationFemaleToMale: 'تذكير: المبدع في' },
  { male: 'مبدع في', female: 'مبدعة في', category: 'adjective', explanationMaleToFemale: 'تأنيث: مبدعة في', explanationFemaleToMale: 'تذكير: مبدع في' },
  { male: 'المبدع', female: 'المبدعة', category: 'adjective', explanationMaleToFemale: 'تأنيث: المبدعة', explanationFemaleToMale: 'تذكير: المبدع' },
  { male: 'مبدع', female: 'مبدعة', category: 'adjective', explanationMaleToFemale: 'تأنيث: مبدعة', explanationFemaleToMale: 'تذكير: مبدع' },

  { male: 'المجتهد في', female: 'المجتهدة في', category: 'adjective', explanationMaleToFemale: 'تأنيث: المجتهدة في', explanationFemaleToMale: 'تذكير: المجتهد في' },
  { male: 'مجتهد في', female: 'مجتهدة في', category: 'adjective', explanationMaleToFemale: 'تأنيث: مجتهدة في', explanationFemaleToMale: 'تذكير: مجتهد في' },
  { male: 'المجتهد', female: 'المجتهدة', category: 'adjective', explanationMaleToFemale: 'تأنيث: المجتهدة', explanationFemaleToMale: 'تذكير: المجتهد' },
  { male: 'مجتهد', female: 'مجتهدة', category: 'adjective', explanationMaleToFemale: 'تأنيث: مجتهدة', explanationFemaleToMale: 'تذكير: مجتهد' },

  { male: 'الخلوق', female: 'الخلوقة', category: 'adjective', explanationMaleToFemale: 'تأنيث: الخلوقة', explanationFemaleToMale: 'تذكير: الخلوق' },
  { male: 'خلوق', female: 'خلوقة', category: 'adjective', explanationMaleToFemale: 'تأنيث: خلوقة', explanationFemaleToMale: 'تذكير: خلوق' },
  { male: 'المبارك', female: 'المباركة', category: 'adjective', explanationMaleToFemale: 'تأنيث: المباركة', explanationFemaleToMale: 'تذكير: المبارك' },
  { male: 'مبارك', female: 'مباركة', category: 'adjective', explanationMaleToFemale: 'تأنيث: مباركة', explanationFemaleToMale: 'تذكير: مبارك' },
  { male: 'المتقن', female: 'المتقنة', category: 'adjective', explanationMaleToFemale: 'تأنيث: المتقنة', explanationFemaleToMale: 'تذكير: المتقن' },
  { male: 'متقن', female: 'متقنة', category: 'adjective', explanationMaleToFemale: 'تأنيث: متقنة', explanationFemaleToMale: 'تذكير: متقن' },
  { male: 'النجيب', female: 'النجيبة', category: 'adjective', explanationMaleToFemale: 'تأنيث: النجيبة', explanationFemaleToMale: 'تذكير: النجيب' },
  { male: 'نجيب', female: 'نجيبة', category: 'adjective', explanationMaleToFemale: 'تأنيث: نجيبة', explanationFemaleToMale: 'تذكير: نجيب' },
  { male: 'الحافظ', female: 'الحافظة', category: 'adjective', explanationMaleToFemale: 'تأنيث: الحافظة', explanationFemaleToMale: 'تذكير: الحافظ' },
  { male: 'حافظ', female: 'حافظة', category: 'adjective', explanationMaleToFemale: 'تأنيث: حافظة', explanationFemaleToMale: 'تذكير: حافظ' },
  { male: 'المثالي', female: 'المثالية', category: 'adjective', explanationMaleToFemale: 'تأنيث: المثالية', explanationFemaleToMale: 'تذكير: المثالي' },
  { male: 'مثالي', female: 'مثالية', category: 'adjective', explanationMaleToFemale: 'تأنيث: مثالية', explanationFemaleToMale: 'تذكير: مثالي' },
  { male: 'القدير', female: 'القديرة', category: 'adjective', explanationMaleToFemale: 'تأنيث: القديرة', explanationFemaleToMale: 'تذكير: القدير' },
  { male: 'قدير', female: 'قديرة', category: 'adjective', explanationMaleToFemale: 'تأنيث: قديرة', explanationFemaleToMale: 'تذكير: قدير' },
  { male: 'النشيط', female: 'النشيطة', category: 'adjective', explanationMaleToFemale: 'تأنيث: النشيطة', explanationFemaleToMale: 'تذكير: النشيط' },
  { male: 'نشيط', female: 'نشيطة', category: 'adjective', explanationMaleToFemale: 'تأنيث: نشيطة', explanationFemaleToMale: 'تذكير: نشيط' },
  { male: 'الفاعل', female: 'الفاعلة', category: 'adjective', explanationMaleToFemale: 'تأنيث: الفاعلة', explanationFemaleToMale: 'تذكير: الفاعل' },
  { male: 'فاعل', female: 'فاعلة', category: 'adjective', explanationMaleToFemale: 'تأنيث: فاعلة', explanationFemaleToMale: 'تذكير: فاعل' },
  { male: 'المتطوع', female: 'المتطوعة', category: 'adjective', explanationMaleToFemale: 'تأنيث: المتطوعة', explanationFemaleToMale: 'تذكير: المتطوع' },
  { male: 'متطوع', female: 'متطوعة', category: 'adjective', explanationMaleToFemale: 'تأنيث: متطوعة', explanationFemaleToMale: 'تذكير: متطوع' },
  { male: 'الرياضي', female: 'الرياضية', category: 'adjective', explanationMaleToFemale: 'تأنيث: الرياضية', explanationFemaleToMale: 'تذكير: الرياضي' },
  { male: 'رياضي', female: 'رياضية', category: 'adjective', explanationMaleToFemale: 'تأنيث: رياضية', explanationFemaleToMale: 'تذكير: رياضي' },
  { male: 'المهذب', female: 'المهذبة', category: 'adjective', explanationMaleToFemale: 'تأنيث: المهذبة', explanationFemaleToMale: 'تذكير: المهذب' },
  { male: 'مهذب', female: 'مهذبة', category: 'adjective', explanationMaleToFemale: 'تأنيث: مهذبة', explanationFemaleToMale: 'تذكير: مهذب' },
  { male: 'المنضبط', female: 'المنضبطة', category: 'adjective', explanationMaleToFemale: 'تأنيث: المنضبطة', explanationFemaleToMale: 'تذكير: المنضبط' },
  { male: 'منضبط', female: 'منضبطة', category: 'adjective', explanationMaleToFemale: 'تأنيث: منضبطة', explanationFemaleToMale: 'تذكير: منضبط' },
  { male: 'المواظب', female: 'المواظبة', category: 'adjective', explanationMaleToFemale: 'تأنيث: المواظبة', explanationFemaleToMale: 'تذكير: المواظب' },
  { male: 'مواظب', female: 'مواظبة', category: 'adjective', explanationMaleToFemale: 'تأنيث: مواظبة', explanationFemaleToMale: 'تذكير: مواظب' },
  { male: 'المبتكر', female: 'المبتكرة', category: 'adjective', explanationMaleToFemale: 'تأنيث: المبتكرة', explanationFemaleToMale: 'تذكير: المبتكر' },
  { male: 'الواعد', female: 'الواعدة', category: 'adjective', explanationMaleToFemale: 'تأنيث: الواعدة', explanationFemaleToMale: 'تذكير: الواعد' },
  { male: 'واعد', female: 'واعدة', category: 'adjective', explanationMaleToFemale: 'تأنيث: واعدة', explanationFemaleToMale: 'تذكير: واعد' },
  { male: 'الصاعد', female: 'الصاعدة', category: 'adjective', explanationMaleToFemale: 'تأنيث: الصاعدة', explanationFemaleToMale: 'تذكير: الصاعد' },
  { male: 'صاعد', female: 'صاعدة', category: 'adjective', explanationMaleToFemale: 'تأنيث: صاعدة', explanationFemaleToMale: 'تذكير: صاعد' },
  { male: 'المتألق', female: 'المتألقة', category: 'adjective', explanationMaleToFemale: 'تأنيث: المتألقة', explanationFemaleToMale: 'تذكير: المتألق' },
  { male: 'متألق', female: 'متألقة', category: 'adjective', explanationMaleToFemale: 'تأنيث: متألقة', explanationFemaleToMale: 'تذكير: متألق' },
  { male: 'المبادر', female: 'المبادرة', category: 'adjective', explanationMaleToFemale: 'تأنيث: المبادرة', explanationFemaleToMale: 'تذكير: المبادر' },
  { male: 'مبادر', female: 'مبادرة', category: 'adjective', explanationMaleToFemale: 'تأنيث: مبادرة', explanationFemaleToMale: 'تذكير: مبادر' },

  // Adverbial Accusatives (-اً / -ةً)
  { male: 'متميزاً', female: 'متميزةً', category: 'adjective', explanationMaleToFemale: 'تأنيث الحال / النعت: متميزةً', explanationFemaleToMale: 'تذكير الحال / النعت: متميزاً' },
  { male: 'متفوقاً', female: 'متفوقةً', category: 'adjective', explanationMaleToFemale: 'تأنيث الحال / النعت: متفوقةً', explanationFemaleToMale: 'تذكير الحال / النعت: متفوقاً' },
  { male: 'مبدعاً', female: 'مبدعةً', category: 'adjective', explanationMaleToFemale: 'تأنيث الحال / النعت: مبدعةً', explanationFemaleToMale: 'تذكير الحال / النعت: مبدعاً' },
  { male: 'مجتهداً', female: 'مجتهدةً', category: 'adjective', explanationMaleToFemale: 'تأنيث الحال / النعت: مجتهدةً', explanationFemaleToMale: 'تذكير الحال / النعت: مجتهداً' },
  { male: 'بطلاً', female: 'بطلةً', category: 'adjective', explanationMaleToFemale: 'تأنيث: بطلةً', explanationFemaleToMale: 'تذكير: بطلاً' },

  // Ordinal Numbers
  { male: 'الأول على مستوى', female: 'الأولى على مستوى', category: 'adjective', explanationMaleToFemale: 'تأنيث الترتيب: الأولى على مستوى', explanationFemaleToMale: 'تذكير الترتيب: الأول على مستوى' },
  { male: 'الأول على صفه', female: 'الأولى على صفها', category: 'adjective', explanationMaleToFemale: 'تأنيث الترتيب: الأولى على صفها', explanationFemaleToMale: 'تذكير الترتيب: الأول على صفه' },
  { male: 'الأول على فصله', female: 'الأولى على فصلها', category: 'adjective', explanationMaleToFemale: 'تأنيث الترتيب: الأولى على فصلها', explanationFemaleToMale: 'تذكير الترتيب: الأول على فصله' },
  { male: 'الأول على مرحلته', female: 'الأولى على مرحلتها', category: 'adjective', explanationMaleToFemale: 'تأنيث الترتيب: الأولى على مرحلتها', explanationFemaleToMale: 'تذكير الترتيب: الأول على مرحلته' },
  { male: 'الأول', female: 'الأولى', category: 'adjective', explanationMaleToFemale: 'تأنيث اسم التفضيل والترتيب: الأولى', explanationFemaleToMale: 'تذكير اسم التفضيل والترتيب: الأول' },

  // Family Names / Lineage (بن / بنت)
  { male: 'محمد بن عبد الله', female: 'فاطمة بنت عبد الله', category: 'intro', explanationMaleToFemale: 'تغيير الاسم والنسبة: بنت عبد الله', explanationFemaleToMale: 'تغيير الاسم والنسبة: بن عبد الله' },
  { male: 'عبد الله بن', female: 'فاطمة بنت', category: 'intro', explanationMaleToFemale: 'تغيير الاسم والنسبة: بنت', explanationFemaleToMale: 'تغيير الاسم والنسبة: بن' },
  { male: 'أحمد بن', female: 'سارة بنت', category: 'intro', explanationMaleToFemale: 'تغيير الاسم والنسبة: بنت', explanationFemaleToMale: 'تغيير الاسم والنسبة: بن' },
  { male: 'محمد بن', female: 'نورة بنت', category: 'intro', explanationMaleToFemale: 'تغيير الاسم والنسبة: بنت', explanationFemaleToMale: 'تذكير الاسم والنسبة: بن' },
  { male: 'بن', female: 'بنت', category: 'intro', explanationMaleToFemale: 'استبدال "بن" بـ "بنت"', explanationFemaleToMale: 'استبدال "بنت" بـ "بن"' },
];

/**
 * Precompiled phrase lists sorted descending by length to ensure multi-word matches first
 */
export const PHRASE_PAIRS_FEMALE: [string, string][] = [...RAW_GENDER_PAIRS]
  .sort((a, b) => b.male.length - a.male.length)
  .map((p) => [p.male, p.female]);

export const PHRASE_PAIRS_MASCULINE: [string, string][] = [...RAW_GENDER_PAIRS]
  .sort((a, b) => b.female.length - a.female.length)
  .map((p) => [p.female, p.male]);

/**
 * Converts Arabic phrasing locally (Full Unicode Word Boundary Engine)
 */
export function convertArabicTextGender(text: string, targetGender: RecipientGender): string {
  if (!text || typeof text !== 'string') return text;

  let result = text;

  if (targetGender === 'female') {
    // Normalization of common slashes (e.g. الطالب/ـة -> الطالبة)
    result = result.replace(/الطالب[\/ـ_\-\\]+[ةه]/g, 'الطالبة');
    result = result.replace(/طالب[\/ـ_\-\\]+[ةه]/g, 'طالبة');
    result = result.replace(/الأستاذ[\/ـ_\-\\]+[ةه]/g, 'الأستاذة');
    result = result.replace(/المعلم[\/ـ_\-\\]+[ةه]/g, 'المعلمة');
    result = result.replace(/المبدع[\/ـ_\-\\]+[ةه]/g, 'المبدعة');
    result = result.replace(/المتطوع[\/ـ_\-\\]+[ةه]/g, 'المتطوعة');
    result = result.replace(/المتفوق[\/ـ_\-\\]+[ةه]/g, 'المتفوقة');
    result = result.replace(/المتميز[\/ـ_\-\\]+[ةه]/g, 'المتميزة');
    result = result.replace(/المجتهد[\/ـ_\-\\]+[ةه]/g, 'المجتهدة');
    result = result.replace(/الخريج[\/ـ_\-\\]+[ةه]/g, 'الخريجة');

    for (const [fromWord, toWord] of PHRASE_PAIRS_FEMALE) {
      result = replaceArabicPhrase(result, fromWord, toWord);
    }
  } else {
    // Normalization of common slashes for male (e.g. الطالب/ـة -> الطالب)
    result = result.replace(/الطالب[\/ـ_\-\\]+[ةه]/g, 'الطالب');
    result = result.replace(/طالب[\/ـ_\-\\]+[ةه]/g, 'طالب');
    result = result.replace(/الأستاذ[\/ـ_\-\\]+[ةه]/g, 'الأستاذ');
    result = result.replace(/المعلم[\/ـ_\-\\]+[ةه]/g, 'المعلم');
    result = result.replace(/المبدع[\/ـ_\-\\]+[ةه]/g, 'المبدع');
    result = result.replace(/المتطوع[\/ـ_\-\\]+[ةه]/g, 'المتطوع');
    result = result.replace(/المتفوق[\/ـ_\-\\]+[ةه]/g, 'المتفوق');
    result = result.replace(/المتميز[\/ـ_\-\\]+[ةه]/g, 'المتميز');
    result = result.replace(/المجتهد[\/ـ_\-\\]+[ةه]/g, 'المجتهد');
    result = result.replace(/الخريج[\/ـ_\-\\]+[ةه]/g, 'الخريج');

    for (const [fromWord, toWord] of PHRASE_PAIRS_MASCULINE) {
      result = replaceArabicPhrase(result, fromWord, toWord);
    }
  }

  return result;
}

/**
 * Single AI Adapter Call Function with Smart Parsing
 */
export async function convertArabicTextGenderAI(text: string, targetGender: RecipientGender, customApiKey?: string): Promise<string> {
  if (!text || typeof text !== 'string') return text;

  try {
    const aiCfg = getSavedAISettings();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (aiCfg.provider) headers['x-ai-provider'] = aiCfg.provider;
    if (customApiKey || aiCfg.apiKey) headers['x-ai-api-key'] = customApiKey || aiCfg.apiKey;
    if (aiCfg.model) headers['x-ai-model'] = aiCfg.model;
    if (aiCfg.customApiUrl) headers['x-ai-custom-url'] = aiCfg.customApiUrl;

    const response = await fetch('/api/adapt-gender-ai', {
      method: 'POST',
      headers,
      signal: AbortSignal.timeout(6000),
      body: JSON.stringify({
        text,
        targetGender,
        gender: targetGender,
        provider: aiCfg.provider,
        apiKey: customApiKey || aiCfg.apiKey,
        model: aiCfg.model,
        customApiUrl: aiCfg.customApiUrl,
      }),
    });

    if (!response.ok) {
      return convertArabicTextGender(text, targetGender);
    }

    const data = await response.json();
    return data.adaptedText || data.result?.appreciationText || data.result || convertArabicTextGender(text, targetGender);
  } catch (error) {
    return convertArabicTextGender(text, targetGender);
  }
}

/**
 * Synchronously transforms CertificateData object locally with instant phrase conversion
 */
export function adaptCertificateGenderSync(
  data: CertificateData,
  newGender: RecipientGender,
  options?: { preserveCustomStudentName?: boolean }
): CertificateData {
  let newStudentName = data.studentName || '';
  if (!options?.preserveCustomStudentName || !data.studentName) {
    newStudentName = convertArabicTextGender(data.studentName || '', newGender);
  } else {
    // Smart title / prefix adaptation on student name
    newStudentName = convertArabicTextGender(newStudentName, newGender);
  }

  // Poem adaptation
  let poem = data.poemOrQuote || '';
  if (poem) {
    poem = convertArabicTextGender(poem, newGender);
  }

  return {
    ...data,
    recipientGender: newGender,
    studentName: newStudentName,
    recipientIntro: convertArabicTextGender(data.recipientIntro || '', newGender),
    appreciationText: convertArabicTextGender(data.appreciationText || '', newGender),
    poemOrQuote: poem,
    badgeTitle: convertArabicTextGender(data.badgeTitle || '', newGender),
    title: convertArabicTextGender(data.title || '', newGender),
    subtitle: convertArabicTextGender(data.subtitle || '', newGender),
    grade: convertArabicTextGender(data.grade || '', newGender),
  };
}

/**
 * Transforms CertificateData object matching TypeScript types with Instant UI Update + AI Enhancement
 */
export async function adaptCertificateGender(
  data: CertificateData,
  newGender: RecipientGender,
  options?: { preserveCustomStudentName?: boolean; apiKey?: string }
): Promise<CertificateData> {
  // 1. التعديل المحلي المباشر واللحظي (يُطبق فوراً لمنع تعليق الشاشة)
  const localConvertedData = adaptCertificateGenderSync(data, newGender, options);

  // 2. محاولة تحسين البلاغة عبر الذكاء الاصطناعي مع مهلة سريعة (3.5 ثانية كحد أقصى)
  try {
    const aiCfg = getSavedAISettings();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (aiCfg.provider) headers['x-ai-provider'] = aiCfg.provider;
    if (options?.apiKey || aiCfg.apiKey) headers['x-ai-api-key'] = options?.apiKey || aiCfg.apiKey;
    if (aiCfg.model) headers['x-ai-model'] = aiCfg.model;
    if (aiCfg.customApiUrl) headers['x-ai-custom-url'] = aiCfg.customApiUrl;

    const response = await fetch('/api/adapt-gender-ai', {
      method: 'POST',
      headers,
      signal: AbortSignal.timeout(3500),
      body: JSON.stringify({
        certificateData: localConvertedData,
        targetGender: newGender,
        provider: aiCfg.provider,
        apiKey: options?.apiKey || aiCfg.apiKey,
        model: aiCfg.model,
        customApiUrl: aiCfg.customApiUrl,
      }),
    });

    if (response.ok) {
      const resData = await response.json();
      if (resData && resData.success && resData.result) {
        return {
          ...localConvertedData,
          ...resData.result,
          recipientGender: newGender,
        };
      }
    }
  } catch (err) {
    console.warn('AI adaptation fallback to local conversion:', err);
  }

  return localConvertedData;
}

/**
 * Certificate Type Presets and Generation Utilities
 */
export interface CertificateTypePreset {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  title: string;
  subtitle: string;
  badgeTitle: { male: string; female: string };
  recipientIntro: { male: string; female: string };
  appreciationText: { male: string; female: string };
  poemOrQuote: { male: string; female: string };
  primaryColorHex: string;
  secondaryColorHex: string;
}

export const CERTIFICATE_TYPES_LIST: CertificateTypePreset[] = [
  {
    id: 'academic_excellence',
    name: 'تفوق أكاديمي وأوائل الفصول',
    description: 'صيغ فخمة لطلاب لوحة الشرف وأوائل الدفعات والمعدلات الكاملة',
    category: 'أكاديمي',
    icon: 'Crown',
    title: 'شهادة شكر وتقدير وتفوق أكاديمي',
    subtitle: 'لوحة الشرف وتكريم فرسان التميز العلمي',
    badgeTitle: { male: 'وسام الصدارة الملكي', female: 'وسام الصدارة الملكي' },
    recipientIntro: {
      male: 'تسر إدارة المدرسة ومعلموها أن تمنح وسام التفوق والتميز للطالب النجيب:',
      female: 'تسر إدارة المدرسة ومعلماتها أن تمنح وسام التفوق والتميز للطالبة النجيبة:'
    },
    appreciationText: {
      male: 'تقديراً لعلو همته وصدق عزيمته، وحصوله على الدرجات الكاملة وتصدره قائمة الأوائل بجدارة واستحقاق، سائلين المولى له دوام الرفعة والتألق والريادة في مسيرته العلمية المباركة.',
      female: 'تقديراً لعلو همتها وصدق عزيمتها، وحصولها على الدرجات الكاملة وتصدرها قائمة الأوائل بجدارة واستحقاق، سائلين المولى لها دوام الرفعة والتألق والريادة في مسيرتها العلمية المباركة.'
    },
    poemOrQuote: {
      male: 'العِلْمُ يَرْفَعُ بَيْتًا لا عِمَادَ لَهُ ... وَالجَهْلُ يَهْدِمُ بَيْتَ العِزِّ وَالشَّرَفِ',
      female: 'العِلْمُ يَرْفَعُ بَيْتًا لا عِمَادَ لَهُ ... وَالجَهْلُ يَهْدِمُ بَيْتَ العِزِّ وَالشَّرَفِ'
    },
    primaryColorHex: '#b45309',
    secondaryColorHex: '#d97706'
  },
  {
    id: 'math_olympiad',
    name: 'أولمبياد الرياضيات والعلوم',
    description: 'لحساب الذهني السريع وأبطال الأولمبياد والمسابقات العلمية',
    category: 'علمي وتقني',
    icon: 'Cpu',
    title: 'شهادة تفوق وتميز في أولمبياد الرياضيات',
    subtitle: 'فرسان الأرقام والتفكير المنطقي والهندسي',
    badgeTitle: { male: 'عبقري الرياضيات', female: 'عبقرية الرياضيات' },
    recipientIntro: {
      male: 'يسر قسم العلوم والرياضيات تكريم المبدع الطالب:',
      female: 'يسر قسم العلوم والرياضيات تكريم المبدعة الطالبة:'
    },
    appreciationText: {
      male: 'نظير مهارته الاستثنائية وسرعة بديهته في حل المسائل الرياضية المعقدة والعمليات الذهنية المتقدمة، وتألقه في منافسات الأولمبياد على مستوى المدرسة.',
      female: 'نظير مهارتها الاستثنائية وسرعة بديهتها في حل المسائل الرياضية المعقدة والعمليات الذهنية المتقدمة، وتألقها في منافسات الأولمبياد على مستوى المدرسة.'
    },
    poemOrQuote: {
      male: '«عِلْمُ الرِّيَاضِيَّاتِ مِيزَانُ العُقُولِ وَأَسَاسُ الإِبْدَاعِ»',
      female: '«عِلْمُ الرِّيَاضِيَّاتِ مِيزَانُ العُقُولِ وَأَسَاسُ الإِبْدَاعِ»'
    },
    primaryColorHex: '#1e3a8a',
    secondaryColorHex: '#3b82f6'
  },
  {
    id: 'quran_memorization',
    name: 'حفظ وتجويد القرآن الكريم',
    description: 'لحفظة كتاب الله وأصحاب التلاوة الخاشعة ومسابقات التجويد',
    category: 'ديني وقرآني',
    icon: 'BookOpen',
    title: 'شهادة إتقان وتكريم في حفظ القرآن الكريم',
    subtitle: '«خَيْرُكُمْ مَنْ تَعَلَّمَ القُرْآنَ وَعَلَّمَهُ»',
    badgeTitle: { male: 'خادم كتاب الله المتقن', female: 'خادمة كتاب الله المتقنة' },
    recipientIntro: {
      male: 'تتشرف إدارة المدرسة وجماعة التوعية الإسلامية بتكريم حافظ كتاب الله الطالب المبارك:',
      female: 'تتشرف إدارة المدرسة وجماعة التوعية الإسلامية بتكريم حافظة كتاب الله الطالبة المباركة:'
    },
    appreciationText: {
      male: 'تقديراً لجهوده المباركة وعنايته الفائقة بحفظ وتجويد آيات الذكر الحكيم، وصوته الندي الخاشع، جعله الله ذخراً لوالديه وبارك في علمه وعمله.',
      female: 'تقديراً لجهودها المباركة وعنايتها الفائقة بحفظ وتجويد آيات الذكر الحكيم، وصوتها الندي الخاشع، جعلها الله ذخراً لوالديها وبارك في علمها وعملها.'
    },
    poemOrQuote: {
      male: '«يُقَالُ لِصَاحِبِ القُرْآنِ: اقْرَأْ وَارْتَقِ وَرَتِّلْ كَمَا كُنْتَ تُرَتِّلُ فِي الدُّنْيَا»',
      female: '«يُقَالُ لِصَاحِبِ القُرْآنِ: اقْرَأْ وَارْتَقِ وَرَتِّلْ كَمَا كُنْتَ تُرَتِّلُ فِي الدُّنْيَا»'
    },
    primaryColorHex: '#065f46',
    secondaryColorHex: '#10b981'
  },
  {
    id: 'ideal_behavior',
    name: 'السلوك الإيجابي والانضباط المدرسي',
    description: 'للطلاب المتميزين في الخلق الرفيع والانضباط والمواظبة اليومية',
    category: 'سلوكي',
    icon: 'ShieldCheck',
    title: 'شهادة شكر وتقدير في الانضباط والسلوك المتميز',
    subtitle: 'القدوة الحسنة وتاج الأخلاق الفاضلة',
    badgeTitle: { male: 'وسام القدوة الحسنة', female: 'وسام القدوة الحسنة' },
    recipientIntro: {
      male: 'يسر لجنة التوجيه الطلابي وإدارة المدرسة تكريم الطالب الخلوق:',
      female: 'يسر لجنة التوجيه الطلابي وإدارة المدرسة تكريم الطالبة الخلوقة:'
    },
    appreciationText: {
      male: 'تقديراً لحسن خلقه العالي، وانضباطه المثالي طوال العام الدراسي، والتزامه بالآداب المدرسية والتعامل الراقي مع زملائه ومعلميه، فكان نعم القدوة الحسنة.',
      female: 'تقديراً لحسن خلقها العالي، وانضباطها المثالي طوال العام الدراسي، والتزامها بالآداب المدرسية والتعامل الراقي مع زميلاتها ومعلماتها، فكانت نعم القدوة الحسنة.'
    },
    poemOrQuote: {
      male: '«إِنَّمَا الأُمَمُ الأَخْلاقُ مَا بَقِيَتْ ... فَإِنْ هُمُ ذَهَبَتْ أَخْلاقُهُمْ ذَهَبُوا»',
      female: '«إِنَّمَا الأُمَمُ الأَخْلاقُ مَا بَقِيَتْ ... فَإِنْ هُمُ ذَهَبَتْ أَخْلاقُهُمْ ذَهَبُوا»'
    },
    primaryColorHex: '#0f766e',
    secondaryColorHex: '#14b8a6'
  },
  {
    id: 'ai_and_talent',
    name: 'الذكاء الاصطناعي والموهبة والابتكار',
    description: 'للمبتكرين والمبرمجين في مشاريع الذكاء الاصطناعي والتقنيات الذكية',
    category: 'ابتكار وموهبة',
    icon: 'Sparkles',
    title: 'شهادة تميز في الابتكار والذكاء الاصطناعي',
    subtitle: 'رواد المستقبل وصناع الحلول الرقمية الذكية',
    badgeTitle: { male: 'مبتكر المستقبل الرقمي', female: 'مبتكرة المستقبل الرقمي' },
    recipientIntro: {
      male: 'يسر النادي العلمي والتقني تكريم المبتكر المبدع الطالب:',
      female: 'يسر النادي العلمي والتقني تكريم المبتكرة المبدعة الطالبة:'
    },
    appreciationText: {
      male: 'نظير شغفه الكبير بالتقنية والذكاء الاصطناعي، وإنجازه مشروعاً ابتكارياً متميزاً يعكس مهاراته العالية في التفكير المنطقي والحلول الإبداعية.',
      female: 'نظير شغفها الكبير بالتقنية والذكاء الاصطناعي، وإنجازها مشروعاً ابتكارياً متميزاً يعكس مهاراتها العالية في التفكير المنطقي والحلول الإبداعية.'
    },
    poemOrQuote: {
      male: 'يا كَوْكَبَ المَجْدِ وَالإِبْدَاعِ مُؤْتَلِقًا ... نِلْتَ المَعَالِيَ إِقْدَامًا وَإِتْقَانَا',
      female: 'يا شُعْلَةَ العِلْمِ يَا رَمْزَ الفَخَارِ سَمَتْ ... بِكِ المَعَالِي وَنِلْتِ العِزَّ وَالشَّرَفَا'
    },
    primaryColorHex: '#581c87',
    secondaryColorHex: '#a855f7'
  }
];

export function generateCertificateByTypeLocal(
  typeId: string,
  gender: RecipientGender,
  existingDataOrName?: CertificateData | string,
  subject?: string,
  grade?: string
): Partial<CertificateData> {
  const preset = CERTIFICATE_TYPES_LIST.find((p) => p.id === typeId) || CERTIFICATE_TYPES_LIST[0];
  const isFemale = gender === 'female';

  let studentName = '';
  let subj = subject || '';
  let grd = grade || '';

  if (typeof existingDataOrName === 'object' && existingDataOrName !== null) {
    studentName = existingDataOrName.studentName || '';
    subj = existingDataOrName.subject || subj;
    grd = existingDataOrName.grade || grd;
  } else if (typeof existingDataOrName === 'string') {
    studentName = existingDataOrName;
  }

  if (!studentName) {
    studentName = isFemale ? 'نورة بنت محمد العتيبي' : 'عبد الله بن محمد القحطاني';
  }

  if (!subj) {
    subj = typeId === 'math_olympiad' ? 'الرياضيات' : typeId === 'quran_memorization' ? 'القرآن الكريم' : 'التفوق العام';
  }

  if (!grd) {
    grd = 'الصف الثالث الثانوي';
  }

  return {
    title: preset.title,
    subtitle: preset.subtitle,
    badgeTitle: isFemale ? preset.badgeTitle.female : preset.badgeTitle.male,
    recipientIntro: isFemale ? preset.recipientIntro.female : preset.recipientIntro.male,
    appreciationText: isFemale ? preset.appreciationText.female : preset.appreciationText.male,
    poemOrQuote: isFemale ? preset.poemOrQuote.female : preset.poemOrQuote.male,
    studentName,
    subject: subj,
    grade: grd,
    recipientGender: gender,
    primaryColor: preset.primaryColorHex,
    secondaryColor: preset.secondaryColorHex,
  };
}

export function generateLocalCertificateFallback(
  promptOrOptions:
    | string
    | {
        studentName?: string;
        recipientGender?: RecipientGender;
        subject?: string;
        achievement?: string;
        grade?: string;
        tone?: string;
        schoolName?: string;
        teacherName?: string;
      },
  gender: RecipientGender = 'male',
  studentName?: string,
  subject?: string,
  grade?: string
): Partial<CertificateData> {
  let prompt = '';
  let effectiveGender = gender;
  let effectiveName = studentName;
  let effectiveSubject = subject;
  let effectiveGrade = grade;

  if (typeof promptOrOptions === 'object' && promptOrOptions !== null) {
    effectiveGender = promptOrOptions.recipientGender || effectiveGender;
    effectiveName = promptOrOptions.studentName || effectiveName;
    effectiveSubject = promptOrOptions.subject || effectiveSubject;
    effectiveGrade = promptOrOptions.grade || effectiveGrade;
    prompt = `${promptOrOptions.subject || ''} ${promptOrOptions.achievement || ''} ${promptOrOptions.tone || ''}`;
  } else if (typeof promptOrOptions === 'string') {
    prompt = promptOrOptions;
  }

  let matchedType = 'academic_excellence';
  const lower = prompt.toLowerCase();

  if (lower.includes('رياضيات') || lower.includes('حساب') || lower.includes('أولمبياد') || lower.includes('math')) {
    matchedType = 'math_olympiad';
  } else if (lower.includes('قرآن') || lower.includes('تجويد') || lower.includes('تلاوة') || lower.includes('إسلامية')) {
    matchedType = 'quran_memorization';
  } else if (lower.includes('سلوك') || lower.includes('انضباط') || lower.includes('مواظبة') || lower.includes('أخلاق')) {
    matchedType = 'ideal_behavior';
  } else if (lower.includes('ذكاء') || lower.includes('ابتكار') || lower.includes('برمجة') || lower.includes('تقنية') || lower.includes('موهبة')) {
    matchedType = 'ai_and_talent';
  }

  return generateCertificateByTypeLocal(matchedType, effectiveGender, effectiveName, effectiveSubject, effectiveGrade);
}

