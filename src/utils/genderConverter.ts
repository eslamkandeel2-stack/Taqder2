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

// Unicode-aware Arabic word boundary replacer
function replaceArabicPhrase(text: string, fromPhrase: string, toPhrase: string): string {
  if (!text || !fromPhrase) return text;
  const escaped = fromPhrase.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  // Unicode boundary: start of string or non-Arabic/non-alphanumeric, and end of string or non-Arabic/non-alphanumeric
  const reg = new RegExp('(^|[^\\u0621-\\u064A\\u0671-\\u06D3a-zA-Z0-9_])' + escaped + '([^\\u0621-\\u064A\\u0671-\\u06D3a-zA-Z0-9_]|$)', 'g');
  let res = text;
  let prev = '';
  let iterations = 0;
  while (res !== prev && iterations < 4) {
    prev = res;
    res = res.replace(reg, '$1' + toPhrase + '$2');
    iterations++;
  }
  return res;
}

const PHRASE_PAIRS_FEMALE: [string, string][] = [
  // Names / Kinship
  ['محمد بن عبد الله', 'فاطمة بنت عبد الله'],
  ['عبد الله بن', 'فاطمة بنت'],
  ['أحمد بن', 'سارة بنت'],
  ['محمد بن', 'نورة بنت'],
  ['ابننا', 'ابنتنا'],
  ['بطلنا الصغير', 'بطلتنا الصغيرة'],
  ['بطلنا', 'بطلتنا'],
  ['نجمنا', 'نجمتنا'],
  ['فارسنا', 'فارستنا'],
  ['سفيرنا', 'سفيرتنا'],
  ['تلميذنا', 'تلميذتنا'],
  ['طالبنا', 'طالبتنا'],

  // Intros & Honors
  ['للطالب المتميز', 'للطالبة المتميزة'],
  ['للطالب المتفوق', 'للطالبة المتفوقة'],
  ['للطالب المجتهد', 'للطالبة المجتهدة'],
  ['للطالب المبدع', 'للطالبة المبدعة'],
  ['للطالب الخلوق', 'للطالبة الخلوقة'],
  ['للطالب المبارك', 'للطالبة المباركة'],
  ['للطالب المتقن', 'للطالبة المتقنة'],
  ['للطالب الحافظ', 'للطالبة الحافظة'],
  ['للطالب الفائز', 'للطالبة الفائزة'],
  ['للطالب النجيب', 'للطالبة النجيبة'],
  ['للطالب المثالي', 'للطالبة المثالية'],
  ['للطالب المبتكر', 'للطالبة المبتكرة'],
  ['للطالب المشارك', 'للطالبة المشاركة'],
  ['للطالب', 'للطالبة'],
  ['بأن الطالب', 'بأن الطالبة'],
  ['بأن الأستاذ', 'بأن الأستاذة'],
  ['للأستاذ القدير', 'للأستاذة القديرة'],
  ['للأستاذ', 'للأستاذة'],
  ['للقيادي الواعد', 'للقيادية الواعدة'],
  ['للمبتكر الرقمي', 'للمبتكرة الرقمية'],
  ['لبطلنا الصغير المبدع', 'لبطلتنا الصغيرة المبدعة'],
  ['لبطلنا الصغير', 'لبطلتنا الصغيرة'],
  ['للفارس اللغوي', 'للفارسة اللغوية'],
  ['للمتطوع المبدع', 'للمتطوعة المبدعة'],
  ['للبطل الرياضي الاستثنائي', 'للبطلة الرياضية الاستثنائية'],
  ['للبطل الرياضي', 'للبطلة الرياضية'],
  ['للسفير البيئي', 'للسفيرة البيئية'],
  ['للمطور العبقري', 'للمطورة العبقرية'],
  ['لطالبنا المتميز', 'لطالبتنا المتميزة'],
  ['لطالبنا المتفوق', 'لطالبتنا المتفوقة'],
  ['لطالبنا المبدع', 'لطالبتنا المبدعة'],
  ['لطالبنا', 'لطالبتنا'],
  ['طالب متميز', 'طالبة متميزة'],
  ['طالب متفوق', 'طالبة متفوقة'],
  ['طالب مجتهد', 'طالبة مجتهدة'],
  ['طالب خلوق', 'طالبة خلوقة'],
  ['طالب مبدع', 'طالبة مبدعة'],
  ['قائد مستقبلي', 'قائدة مستقبلية'],
  ['مبتكر واعد', 'مبتكرة واعدة'],
  ['بطل الموهبة', 'بطلة الموهبة'],
  ['سفير البيئة', 'سفيرة البيئة'],
  ['حافظ متقن', 'حافظة متقنة'],
  ['طالب العلم الصالح', 'طالبة العلم الصالحة'],
  ['شكرًا لك يا نجمنا', 'شكرًا لكِ يا نجمتنا'],

  // Badges and Titles
  ['وسام الطالب المتميز', 'وسام الطالبة المتميزة'],
  ['وسام الطالب المتفوق', 'وسام الطالبة المتفوقة'],
  ['وسام الطالب المثالي', 'وسام الطالبة المثالية'],
  ['وسام الطالب المبدع', 'وسام الطالبة المبدعة'],
  ['وسام الفارس', 'وسام الفارسة'],
  ['وسام البطل الصغير', 'وسام البطلة الصغيرة'],

  // Pronouns and Prayers
  ['سائلين الله له', 'سائلين الله لها'],
  ['سائلين المولى له', 'سائلين المولى لها'],
  ['داعين الله له', 'داعين الله لها'],
  ['متمنين له', 'متمنين لها'],
  ['راجين له', 'راجين لها'],
  ['نرجو له', 'نرجو لها'],
  ['نتمنى له', 'نتمنى لها'],
  ['نتمنى لَه', 'نتمنى لها'],
  ['له دوام', 'لها دوام'],
  ['له مستقبلاً', 'لها مستقبلاً'],
  ['له التوفيق', 'لها التوفيق'],
  ['له النجاح', 'لها النجاح'],
  ['أن يوفقه', 'أن يوفقها'],
  ['أن يسدده', 'أن يسددها'],
  ['أن يبارك فيه', 'أن يبارك فيها'],
  ['أن يزيده', 'أن يزيدها'],
  ['أن ينفع به', 'أن ينفع بها'],
  ['أن يجعله', 'أن يجعلها'],
  ['ليكون', 'لتكون'],
  ['نموذجاً يحتذى به', 'نموذجاً يُحتذى به'],

  // Nouns with Attached Pronoun -ه / -ها
  ['لسلوكه', 'لسلوكها'],
  ['سلوكه', 'سلوكها'],
  ['أخلاقه', 'أخلاقها'],
  ['زملائه', 'زميلاتها'],
  ['معلميه', 'معلماتها'],
  ['أقرانه', 'قريناتها'],
  ['والديه', 'والديها'],
  ['أهله', 'أهلها'],
  ['وطنه', 'وطنها'],
  ['مدرسته', 'مدرستها'],
  ['فصله', 'فصلها'],
  ['صفه', 'صفها'],
  ['وحرصه', 'وحرصها'],
  ['حرصه', 'حرصها'],
  ['مواظبته', 'مواظبتها'],
  ['انضباطه', 'انضباطها'],
  ['أبداه', 'أبدته'],
  ['أبداءه', 'أبدائها'],
  ['حصوله', 'حصولها'],
  ['تحصيله', 'تحصيلها'],
  ['تألقه', 'تألقها'],
  ['مشاركته', 'مشاركتها'],
  ['قيادته', 'قيادتها'],
  ['ابتكاره', 'ابتكارها'],
  ['إبداعه', 'إبداعها'],
  ['عطائه', 'عطائها'],
  ['لجهوده', 'لجهودها'],
  ['جهوده', 'جهودها'],
  ['تفانيه', 'تفانيها'],
  ['تحقيقه', 'تحقيقها'],
  ['تميزه', 'تميزها'],
  ['لتفوقه', 'لتفوقها'],
  ['وتفوقه', 'وتفوقها'],
  ['تفوقه', 'تفوقها'],
  ['إتمامه', 'إتمامها'],
  ['إتقانه', 'إتقانها'],
  ['أدائه', 'أدائها'],
  ['إنجازه', 'إنجازها'],
  ['تفرده', 'تفردها'],
  ['تعاونه', 'تعاونها'],
  ['حفظه', 'حفظها'],
  ['تلاوته', 'تلاوتها'],
  ['فريقه', 'فريقها'],
  ['مسيرته', 'مسيرتها'],
  ['مستقبله', 'مستقبلها'],
  ['اجتهاده', 'اجتهادها'],
  ['شغفه', 'شغفها'],
  ['طموحه', 'طموحها'],
  ['ذكائه', 'ذكائها'],
  ['فهمه', 'فهمها'],
  ['نجاحه', 'نجاحها'],
  ['فوزه', 'فوزها'],
  ['حضوره', 'حضورها'],
  ['تفاعله', 'تفاعلها'],
  ['سعيه', 'سعيها'],

  // Verbs (Past)
  ['حقق', 'حققت'],
  ['أنجز', 'أنجزت'],
  ['أبدع', 'أبدعت'],
  ['أبدى', 'أبدت'],
  ['أظهر', 'أظهرت'],
  ['قدم', 'قدمت'],
  ['حصل', 'حصلت'],
  ['نال', 'نالت'],
  ['أحرز', 'أحرزت'],
  ['اجتاز', 'اجتازت'],
  ['شارك', 'شاركت'],
  ['ساهم', 'ساهمت'],
  ['تميز', 'تميزت'],
  ['تألق', 'تألقت'],
  ['تفوق', 'تفوقت'],
  ['ثابر', 'ثابرت'],
  ['واظب', 'واظبت'],
  ['حفظ', 'حفظت'],
  ['استحق', 'استحقت'],
  ['استوفى', 'استوفت'],
  ['أكمل', 'أكملت'],
  ['الذي يجسد', 'التي تجسد'],
  ['الذي أبهر', 'التي أبهرت'],
  ['الذي حقق', 'التي حققت'],

  // Adjectives & Nouns
  ['الطالب المتميز', 'الطالبة المتميزة'],
  ['الطالب المتفوق', 'الطالبة المتفوقة'],
  ['الطالب المبدع', 'الطالبة المبدعة'],
  ['الطالب المجتهد', 'الطالبة المجتهدة'],
  ['الطالب الخلوق', 'الطالبة الخلوقة'],
  ['الطالب', 'الطالبة'],
  ['طالب', 'طالبة'],
  ['المتميز', 'المتميزة'],
  ['متميز', 'متميزة'],
  ['المتفوق', 'المتفوقة'],
  ['متفوق', 'متفوقة'],
  ['المجتهد', 'المجتهدة'],
  ['مجتهد', 'مجتهدة'],
  ['الخلوق', 'الخلوقة'],
  ['خلوق', 'خلوقة'],
  ['المبدع', 'المبدعة'],
  ['مبدع', 'مبدعة'],
  ['المبارك', 'المباركة'],
  ['مبارك', 'مباركة'],
  ['المتقن', 'المتقنة'],
  ['متقن', 'متقنة'],
  ['النجيب', 'النجيبة'],
  ['نجيب', 'نجيبة'],
  ['الحافظ', 'الحافظة'],
  ['حافظ', 'حافظة'],
  ['الفائز', 'الفائزة'],
  ['فائز', 'فائزة'],
  ['المثالي', 'المثالية'],
  ['مثالي', 'مثالية'],
  ['القدير', 'القديرة'],
  ['قدير', 'قديرة'],
  ['النشيط', 'النشيطة'],
  ['نشيط', 'نشيطة'],
  ['الفاعل', 'الفاعلة'],
  ['فاعل', 'فاعلة'],
  ['المتطوع', 'المتطوعة'],
  ['متطوع', 'متطوعة'],
  ['الرياضي', 'الرياضية'],
  ['رياضي', 'رياضية'],
  ['المهذب', 'المهذبة'],
  ['مهذب', 'مهذبة'],
  ['الأول', 'الأولى'],
  ['بن', 'بنت'],
];

const PHRASE_PAIRS_MASCULINE: [string, string][] = [
  // Names / Kinship
  ['فاطمة بنت عبد الله', 'محمد بن عبد الله'],
  ['فاطمة بنت', 'عبد الله بن'],
  ['سارة بنت', 'أحمد بن'],
  ['نورة بنت', 'محمد بن'],
  ['ابنتنا', 'ابننا'],
  ['بطلتنا الصغيرة', 'بطلنا الصغير'],
  ['بطلتنا', 'بطلنا'],
  ['نجمتنا', 'نجمنا'],
  ['فارستنا', 'فارسنا'],
  ['سفيرتنا', 'سفيرنا'],
  ['تلميذتنا', 'تلميذنا'],
  ['طالبتنا', 'طالبنا'],

  // Intros & Honors
  ['للطالبة المتميزة', 'للطالب المتميز'],
  ['للطالبة المتفوقة', 'للطالب المتفوق'],
  ['للطالبة المجتهدة', 'للطالب المجتهد'],
  ['للطالبة المبدعة', 'للطالب المبدع'],
  ['للطالبة الخلوقة', 'للطالب الخلوق'],
  ['للطالبة المباركة', 'للطالب المبارك'],
  ['للطالبة المتقنة', 'للطالب المتقن'],
  ['للطالبة الحافظة', 'للطالب الحافظ'],
  ['للطالبة الفائزة', 'للطالب الفائز'],
  ['للطالبة النجيبة', 'للطالب النجيب'],
  ['للطالبة المثالية', 'للطالب المثالي'],
  ['للطالبة المبتكرة', 'للطالب المبتكر'],
  ['للطالبة المشاركة', 'للطالب المشارك'],
  ['للطالبة', 'للطالب'],
  ['بأن الطالبة', 'بأن الطالب'],
  ['بأن الأستاذة', 'بأن الأستاذ'],
  ['للأستاذة القديرة', 'للأستاذ القدير'],
  ['للأستاذة', 'للأستاذ'],
  ['للقيادية الواعدة', 'للقيادي الواعد'],
  ['للمبتكرة الرقمية', 'للمبتكر الرقمي'],
  ['لبطلتنا الصغيرة المبدعة', 'لبطلنا الصغير المبدع'],
  ['لبطلتنا الصغيرة', 'لبطلنا الصغير'],
  ['للفارسة اللغوية', 'للفارس اللغوي'],
  ['للمتطوعة المبدعة', 'للمتطوع المبدع'],
  ['للبطلة الرياضية الاستثنائية', 'للبطل الرياضي الاستثنائي'],
  ['للبطلة الرياضية', 'للبطل الرياضي'],
  ['للسفيرة البيئية', 'للسفير البيئي'],
  ['للمطورة العبقرية', 'للمطور العبقري'],
  ['لطالبتنا المتميزة', 'لطالبنا المتميز'],
  ['لطالبتنا المتفوقة', 'لطالبنا المتفوق'],
  ['لطالبتنا المبدعة', 'لطالبنا المبدع'],
  ['لطالبتنا', 'لطالبنا'],
  ['طالبة متميزة', 'طالب متميز'],
  ['طالبة متفوقة', 'طالب متفوق'],
  ['طالبة مجتهدة', 'طالب مجتهد'],
  ['طالبة خلوقة', 'طالب خلوق'],
  ['طالبة مبدعة', 'طالب مبدع'],
  ['قائدة مستقبلية', 'قائد مستقبلي'],
  ['مبتكرة واعدة', 'مبتكر واعد'],
  ['بطلة الموهبة', 'بطل الموهبة'],
  ['سفيرة البيئة', 'سفير البيئة'],
  ['حافظة متقنة', 'حافظ متقن'],
  ['طالبة العلم الصالحة', 'طالب العلم الصالح'],
  ['شكرًا لكِ يا نجمتنا', 'شكرًا لك يا نجمنا'],

  // Badges and Titles
  ['وسام الطالبة المتميزة', 'وسام الطالب المتميز'],
  ['وسام الطالبة المتفوقة', 'وسام الطالب المتفوق'],
  ['وسام الطالبة المثالية', 'وسام الطالب المثالي'],
  ['وسام الطالبة المبدعة', 'وسام الطالب المبدع'],
  ['وسام الفارسة', 'وسام الفارس'],
  ['وسام البطلة الصغيرة', 'وسام البطل الصغير'],

  // Pronouns and Prayers
  ['سائلين الله لها', 'سائلين الله له'],
  ['سائلين المولى لها', 'سائلين المولى له'],
  ['داعين الله لها', 'داعين الله له'],
  ['متمنين لها', 'متمنين له'],
  ['راجين لها', 'راجين له'],
  ['نرجو لها', 'نرجو له'],
  ['نتمنى لها', 'نتمنى له'],
  ['نتمنى لَها', 'نتمنى له'],
  ['لها دوام', 'له دوام'],
  ['لها مستقبلاً', 'له مستقبلاً'],
  ['لها التوفيق', 'له التوفيق'],
  ['لها النجاح', 'له النجاح'],
  ['أن يوفقها', 'أن يوفقه'],
  ['أن يسددها', 'أن يسدده'],
  ['أن يبارك فيها', 'أن يبارك فيه'],
  ['أن يزيدها', 'أن يزيده'],
  ['أن ينفع بها', 'أن ينفع به'],
  ['أن يجعلها', 'أن يجعله'],
  ['لتكون', 'ليكون'],

  // Nouns with Attached Pronoun
  ['لسلوكها', 'لسلوكه'],
  ['سلوكها', 'سلوكه'],
  ['أخلاقها', 'أخلاقه'],
  ['زميلاتها', 'زملائه'],
  ['معلماتها', 'معلميه'],
  ['قريناتها', 'أقرانه'],
  ['والديها', 'والديه'],
  ['أهلها', 'أهله'],
  ['وطنها', 'وطنه'],
  ['مدرستها', 'مدرسته'],
  ['فصلها', 'فصله'],
  ['صفها', 'صفه'],
  ['وحرصها', 'وحرصه'],
  ['حرصها', 'حرصه'],
  ['مواظبتها', 'مواظبته'],
  ['انضباطها', 'انضباطه'],
  ['أبدته', 'أبداه'],
  ['أبدائها', 'أبداءه'],
  ['حصولها', 'حصوله'],
  ['تحصيلها', 'تحصيله'],
  ['تألقها', 'تألقه'],
  ['مشاركتها', 'مشاركته'],
  ['قيادتها', 'قيادته'],
  ['ابتكارها', 'ابتكاره'],
  ['إبداعها', 'إبداعه'],
  ['عطائها', 'عطائه'],
  ['لجهودها', 'لجهوده'],
  ['جهودها', 'جهوده'],
  ['تفانيها', 'تفانيه'],
  ['تحقيقها', 'تحقيقه'],
  ['تميزها', 'تميزه'],
  ['لتفوقها', 'لتفوقه'],
  ['وتفوقها', 'وتفوقه'],
  ['تفوقها', 'تفوقه'],
  ['إتمامها', 'إتمامه'],
  ['إتقانها', 'إتقانه'],
  ['أدائها', 'أدائه'],
  ['إنجازها', 'إنجازه'],
  ['تفردها', 'تفرده'],
  ['تعاونها', 'تعاونه'],
  ['حفظها', 'حفظه'],
  ['تلاوتها', 'تلاوته'],
  ['فريقها', 'فريقه'],
  ['مسيرتها', 'مسيرته'],
  ['مستقبلها', 'مستقبله'],
  ['اجتهادها', 'اجتهاده'],
  ['شغفها', 'شغفه'],
  ['طموحها', 'طموحه'],
  ['ذكائها', 'ذكائه'],
  ['فهمها', 'فهمه'],
  ['نجاحها', 'نجاحه'],
  ['فوزها', 'فوزه'],
  ['حضورها', 'حضوره'],
  ['تفاعلها', 'تفاعله'],
  ['سعيها', 'سعيه'],

  // Verbs (Past)
  ['حققت', 'حقق'],
  ['أنجزت', 'أنجز'],
  ['أبدعت', 'أبدع'],
  ['أبدت', 'أبدى'],
  ['أظهرت', 'أظهر'],
  ['قدمت', 'قدم'],
  ['حصلت', 'حصل'],
  ['نالت', 'نال'],
  ['أحرزت', 'أحرز'],
  ['اجتازت', 'اجتاز'],
  ['شاركت', 'شارك'],
  ['ساهمت', 'ساهم'],
  ['تميزت', 'تميز'],
  ['تألقت', 'تألق'],
  ['تفوقت', 'تفوق'],
  ['ثابرت', 'ثابر'],
  ['واظبت', 'واظب'],
  ['حفظت', 'حفظ'],
  ['استحقت', 'استحق'],
  ['استوفت', 'استوفى'],
  ['أكملت', 'أكمل'],
  ['التي تجسد', 'الذي يجسد'],
  ['التي أبهرت', 'الذي أبهر'],
  ['التي حققت', 'الذي حقق'],

  // Adjectives & Nouns
  ['الطالبة المتميزة', 'الطالب المتميز'],
  ['الطالبة المتفوقة', 'الطالب المتفوق'],
  ['الطالبة المبدعة', 'الطالب المبدع'],
  ['الطالبة المجتهدة', 'الطالب المجتهد'],
  ['الطالبة الخلوقة', 'الطالب الخلوق'],
  ['الطالبة', 'الطالب'],
  ['طالبة', 'طالب'],
  ['المتميزة', 'المتميز'],
  ['متميزة', 'متميز'],
  ['المتفوقة', 'المتفوق'],
  ['متفوقة', 'متفوق'],
  ['المجتهدة', 'المجتهد'],
  ['مجتهدة', 'مجتهد'],
  ['الخلوقة', 'الخلوق'],
  ['خلوقة', 'خلوق'],
  ['المبدعة', 'المبدع'],
  ['مبدعة', 'مبدع'],
  ['المباركة', 'المبارك'],
  ['مباركة', 'مبارك'],
  ['المتقنة', 'المتقن'],
  ['متقنة', 'متقن'],
  ['النجيبة', 'النجيب'],
  ['نجيبة', 'نجيب'],
  ['الحافظة', 'الحافظ'],
  ['حافظة', 'حافظ'],
  ['الفائزة', 'الفائز'],
  ['فائزة', 'فائز'],
  ['المثالية', 'المثالي'],
  ['مثالية', 'مثالي'],
  ['القديرة', 'القدير'],
  ['قديرة', 'قدير'],
  ['النشيطة', 'النشيط'],
  ['نشيطة', 'نشيط'],
  ['الفاعلة', 'الفاعل'],
  ['فاعلة', 'فاعل'],
  ['المتطوعة', 'المتطوع'],
  ['متطوعة', 'متطوع'],
  ['الرياضية', 'الرياضي'],
  ['رياضية', 'رياضي'],
  ['المهذبة', 'المهذب'],
  ['مهذبة', 'مهذب'],
  ['الأولى', 'الأول'],
  ['بنت', 'بن'],
];

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
    result = result.replace(/المبدع[\/ـ_\-\\]+[ةه]/g, 'المبدعة');
    result = result.replace(/المتطوع[\/ـ_\-\\]+[ةه]/g, 'المتطوعة');
    result = result.replace(/المتفوق[\/ـ_\-\\]+[ةه]/g, 'المتفوقة');
    result = result.replace(/المتميز[\/ـ_\-\\]+[ةه]/g, 'المتميزة');
    result = result.replace(/المجتهد[\/ـ_\-\\]+[ةه]/g, 'المجتهدة');

    for (const [fromWord, toWord] of PHRASE_PAIRS_FEMALE) {
      result = replaceArabicPhrase(result, fromWord, toWord);
    }
  } else {
    // Normalization of common slashes for male (e.g. الطالب/ـة -> الطالب)
    result = result.replace(/الطالب[\/ـ_\-\\]+[ةه]/g, 'الطالب');
    result = result.replace(/طالب[\/ـ_\-\\]+[ةه]/g, 'طالب');
    result = result.replace(/الأستاذ[\/ـ_\-\\]+[ةه]/g, 'الأستاذ');
    result = result.replace(/المبدع[\/ـ_\-\\]+[ةه]/g, 'المبدع');
    result = result.replace(/المتطوع[\/ـ_\-\\]+[ةه]/g, 'المتطوع');
    result = result.replace(/المتفوق[\/ـ_\-\\]+[ةه]/g, 'المتفوق');
    result = result.replace(/المتميز[\/ـ_\-\\]+[ةه]/g, 'المتميز');
    result = result.replace(/المجتهد[\/ـ_\-\\]+[ةه]/g, 'المجتهد');

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
 * Robust local fallback generator for certificate content
 */
export function generateLocalCertificateFallback(params: {
  studentName?: string;
  subject?: string;
  achievement?: string;
  grade?: string;
  tone?: string;
  schoolName?: string;
  teacherName?: string;
  recipientGender?: RecipientGender;
}) {
  const isFemale = params.recipientGender === 'female';
  const subject = params.subject || 'التفوق العام';
  const achievement = params.achievement || 'الاجتهاد والسلوك المتميز والتفوق الدراسي';

  const poems = isFemale
    ? [
        'العِلْمُ يَرْفَعُ بَيْتًا لا عِمَادَ لَهُ ... وَالجَهْلُ يَهْدِمُ بَيْتَ العِزِّ وَالشَّرَفِ',
        'يا شُعْلَةَ العِلْمِ يَا رَمْزَ الفَخَارِ سَمَتْ ... بِكِ المَعَالِي وَنِلْتِ العِزَّ وَالشَّرَفَا',
        'مَنْ طَلَبَ العُلَى سَهِرَ اللَّيَالِي ... وَنَالَ المَجْدَ فِي خَيْرِ المَنَالِ',
      ]
    : [
        'العِلْمُ يَرْفَعُ بَيْتًا لا عِمَادَ لَهُ ... وَالجَهْلُ يَهْدِمُ بَيْتَ العِزِّ وَالشَّرَفِ',
        'يا كَوْكَبَ المَجْدِ وَالإِبْدَاعِ مُؤْتَلِقًا ... نِلْتَ المَعَالِيَ إِقْدَامًا وَإِتْقَانَا',
        'مَنْ طَلَبَ العُلَى سَهِرَ اللَّيَالِي ... وَنَالَ المَجْدَ فِي خَيْرِ المَنَالِ',
      ];

  const appreciation = isFemale
    ? `تقديراً لجهودها المتميزة وتفوقها المشهود في ${subject}، وإبداعها المستمر في ${achievement}، سائلين المولى لها دوام التوفيق والتألق والنجاح في مسيرتها التعليمية المباركة.`
    : `تقديراً لجهوده المتميزة وتفوقه المشهود في ${subject}، وإبداعه المستمر في ${achievement}، سائلين المولى له دوام التوفيق والتألق والنجاح في مسيرته التعليمية المباركة.`;

  return {
    title: 'شهادة شكر وتقدير وتفوق',
    recipientIntro: isFemale
      ? 'تسر إدارة المدرسة ومعلموها أن تمنح هذه الشهادة للطالبة المتميزة:'
      : 'تسر إدارة المدرسة ومعلموها أن تمنح هذه الشهادة للطالب المتميز:',
    appreciationText: appreciation,
    poemOrQuote: poems[Math.floor(Math.random() * poems.length)],
    badgeTitle: 'وسام التميز والتفوق',
    primaryColorHex: '#854d0e',
    secondaryColorHex: '#d97706',
  };
}

export interface CertificateTypePreset {
  id: string;
  name: string;
  icon: string;
  category: string;
  description: string;
  male: {
    title: string;
    subtitle: string;
    recipientIntro: string;
    subject: string;
    appreciationText: string;
    poemOrQuote: string;
    badgeTitle: string;
    badgeIcon: string;
  };
  female: {
    title: string;
    subtitle: string;
    recipientIntro: string;
    subject: string;
    appreciationText: string;
    poemOrQuote: string;
    badgeTitle: string;
    badgeIcon: string;
  };
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  frameStyle: string;
}

export const CERTIFICATE_TYPES_LIST: CertificateTypePreset[] = [
  {
    id: 'appreciation',
    name: 'شكر وتقدير عام',
    icon: '🌟',
    category: 'عام',
    description: 'شهادة شكر وتقدير رسمية راقية لكافة المناسبات والجهود المبذولة',
    primaryColor: '#854d0e',
    secondaryColor: '#d97706',
    accentColor: '#fef08a',
    backgroundColor: '#fefce8',
    textColor: '#1e293b',
    frameStyle: 'double-gold',
    male: {
      title: 'شهادة شكر وتقدير',
      subtitle: 'وسام الامتنان والوفاء والعطاء المستمر',
      recipientIntro: 'يسر إدارة المدرسة أن تتقدم بأسمى آيات الشكر والتقدير للطالب المتميز:',
      subject: 'العطاء والتميز والمشاركة الفعالة',
      appreciationText: 'نظير ما بذله من جهود مخلصة ومشاركة إيجابية كان لها أطيب الأثر في إنجاح الأنشطة المدرسية، راجين له مزيداً من التوفيق والنجاح.',
      poemOrQuote: '«وَمَن يَفعَلِ المَعروفَ يُجزَ بِمِثلِهِ ... وَلا يَعدَمُ الشُكرَ اِمرُؤٌ حَيثُ يَمَّما»',
      badgeTitle: 'وسام الشكر والتقدير',
      badgeIcon: 'star'
    },
    female: {
      title: 'شهادة شكر وتقدير',
      subtitle: 'وسام الامتنان والوفاء والعطاء المستمر',
      recipientIntro: 'يسر إدارة المدرسة أن تتقدم بأسمى آيات الشكر والتقدير للطالبة المتميزة:',
      subject: 'العطاء والتميز والمشاركة الفعالة',
      appreciationText: 'نظير ما بذلته من جهود مخلصة ومشاركة إيجابية كان لها أطيب الأثر في إنجاح الأنشطة المدرسية، راجين لها مزيداً من التوفيق والنجاح.',
      poemOrQuote: '«وَمَن يَفعَلِ المَعروفَ يُجزَ بِمِثلِهِ ... وَلا يَعدَمُ الشُكرَ اِمرُؤٌ حَيثُ يَمَّما»',
      badgeTitle: 'وسام الشكر والتقدير',
      badgeIcon: 'star'
    }
  },
  {
    id: 'academic',
    name: 'تفوق دراسي وأكاديمي',
    icon: '🎓',
    category: 'أكاديمي',
    description: 'تكريم الطلاب المتفوقين والحاصلين على أعلى الدرجات والمراكز الأولى',
    primaryColor: '#854d0e',
    secondaryColor: '#b45309',
    accentColor: '#fef08a',
    backgroundColor: '#fefce8',
    textColor: '#1e293b',
    frameStyle: 'double-gold',
    male: {
      title: 'شهادة تفوق وامتياز أكاديمي',
      subtitle: 'تكريم الحاصلين على أعلى المراتب والدرجات العلمية',
      recipientIntro: 'تعتز إدارة المدرسة ومعلموها بتكريم الطالب المتفوق علمياً:',
      subject: 'التفوق الأكاديمي والدرجات العالية',
      appreciationText: 'تقديراً لاجتهاده الاستثنائي وحصوله على أعلى المراتب العلمية وتفوقه الباهر في المواد الدراسية، سائلين الله له دوام الرفعة والارتقاء.',
      poemOrQuote: '«مَن خَطا نَحوَ العُلا خُطوَةً ... جَنى مِنَ الثِمارِ أحلى النِعَم»',
      badgeTitle: 'وسام التفوق الدراسي الأول',
      badgeIcon: 'trophy'
    },
    female: {
      title: 'شهادة تفوق وامتياز أكاديمي',
      subtitle: 'تكريم الحاصلات على أعلى المراتب والدرجات العلمية',
      recipientIntro: 'تعتز إدارة المدرسة ومعلموها بتكريم الطالبة المتفوقة علمياً:',
      subject: 'التفوق الأكاديمي والدرجات العالية',
      appreciationText: 'تقديراً لاجتهادها الاستثنائي وحصولها على أعلى المراتب العلمية وتفوقها الباهر في المواد الدراسية، سائلين الله لها دوام الرفعة والارتقاء.',
      poemOrQuote: '«مَن خَطت نَحوَ العُلا خُطوَةً ... جَنَت مِنَ الثِمارِ أحلى النِعَم»',
      badgeTitle: 'وسام التفوق الدراسي الأول',
      badgeIcon: 'trophy'
    }
  },
  {
    id: 'quran',
    name: 'حفظ وتلاوة القرآن الكريم',
    icon: '📖',
    category: 'إسلامي',
    description: 'تكريم حفظة كتاب الله عز وجل وأهل التلاوة والتجويد المتقن',
    primaryColor: '#064e3b',
    secondaryColor: '#78350f',
    accentColor: '#fef08a',
    backgroundColor: '#fefce8',
    textColor: '#14532d',
    frameStyle: 'islamic-arch',
    male: {
      title: 'شهادة إتمام وحفظ القرآن الكريم',
      subtitle: 'تكريم حفظة كتاب الله عز وجل وسنة نبيه',
      recipientIntro: 'بكل فخر واعتزاز تزف إدارة الحلقات القرآنية التكريم للطالب المبارك:',
      subject: 'حفظ وتجويد أجزاء من القرآن الكريم',
      appreciationText: 'نظير إتمامه حفظ وتلاوة آيات الذكر الحكيم بأعلى درجات الترتيل والإتقان وحسن الصوت، متمثلاً أخلاق القرآن وسلوكه القويم.',
      poemOrQuote: '«خيركم من تعلم القرآن وعلمه» - حديث شريف',
      badgeTitle: 'خادم كتاب الله الحافظ',
      badgeIcon: 'book'
    },
    female: {
      title: 'شهادة إتمام وحفظ القرآن الكريم',
      subtitle: 'تكريم حافظات كتاب الله عز وجل وسنة نبيه',
      recipientIntro: 'بكل فخر واعتزاز تزف إدارة الحلقات القرآنية التكريم للطالبة المباركة:',
      subject: 'حفظ وتجويد أجزاء من القرآن الكريم',
      appreciationText: 'نظير إتمامها حفظ وتلاوة آيات الذكر الحكيم بأعلى درجات الترتيل والإتقان وحسن الصوت، متمثلةً أخلاق القرآن وسلوكها القويم.',
      poemOrQuote: '«خيركم من تعلم القرآن وعلمه» - حديث شريف',
      badgeTitle: 'خادمة كتاب الله الحافظة',
      badgeIcon: 'book'
    }
  },
  {
    id: 'discipline',
    name: 'الانضباط والمواظبة السلوكية',
    icon: '⏱️',
    category: 'سلوك',
    description: 'تكريم الطلاب المثاليين في الالتزام والانتظام المدرسي والأخلاق الحميدة',
    primaryColor: '#065f46',
    secondaryColor: '#059669',
    accentColor: '#fef08a',
    backgroundColor: '#f0fdf4',
    textColor: '#064e3b',
    frameStyle: 'emerald-border',
    male: {
      title: 'شهادة الانضباط والمواظبة المثالية',
      subtitle: 'وسام السلوك القويم والالتزام والانضباط الصفي',
      recipientIntro: 'يسر التوجيه الطلابي وإدارة المدرسة تكريم الطالب الخلوق المنضبط:',
      subject: 'الانضباط التام والمواظبة والسلوك الإيجابي',
      appreciationText: 'تقديراً لحرصه العالي على الحضور اليومي وعدم الغياب، وسلوكه القويم المتميز في تعامله مع زملائه ومعلميه طوال الفصل الدراسي.',
      poemOrQuote: '«إنَّ المَكارِمَ أَقسامٌ مُقَسَّمَةٌ ... فَالعَقلُ أَوَّلُها وَالدينُ ثانيها»',
      badgeTitle: 'وسام الانضباط والأخلاق',
      badgeIcon: 'crown'
    },
    female: {
      title: 'شهادة الانضباط والمواظبة المثالية',
      subtitle: 'وسام السلوك القويم والالتزام والانضباط الصفي',
      recipientIntro: 'يسر التوجيه الطلابي وإدارة المدرسة تكريم الطالبة الخلوقة المنضبطة:',
      subject: 'الانضباط التام والمواظبة والسلوك الإيجابي',
      appreciationText: 'تقديراً لحرصها العالي على الحضور اليومي وعدم الغياب، وسلوكها القويم المتميز في تعاملها مع زميلاتها ومعلماتها طوال الفصل الدراسي.',
      poemOrQuote: '«إنَّ المَكارِمَ أَقسامٌ مُقَسَّمَةٌ ... فَالعَقلُ أَوَّلُها وَالدينُ ثانيها»',
      badgeTitle: 'وسام الانضباط والأخلاق',
      badgeIcon: 'crown'
    }
  },
  {
    id: 'stem',
    name: 'الابتكار والموهبة والذكاء الاصطناعي',
    icon: '💡',
    category: 'علمي',
    description: 'تكريم المبتكرين في الروبوت، البرمجة، العلوم، ومسابقات موهبة',
    primaryColor: '#1e1b4b',
    secondaryColor: '#4338ca',
    accentColor: '#38bdf8',
    backgroundColor: '#f8fafc',
    textColor: '#0f172a',
    frameStyle: 'modern-geometric',
    male: {
      title: 'شهادة ابتكار وإبداع علمي',
      subtitle: 'وسام التميز في البرمجة والروبوت والذكاء الاصطناعي',
      recipientIntro: 'تعتز إدارة المدرسة ونادي الابتكار بتكريم المبتكر الصاعد:',
      subject: 'الابتكار العلمي والتحول التقني',
      appreciationText: 'تقديراً لفكره الابتكاري الخلاق وتألقه في تصميم المشاريع العلمية وحل المشكلات بطرق تقنية رائدة، متمنين له مستقبلاً زاهراً في فضاء التقنية.',
      poemOrQuote: '«العقل يبني في العوالم صرحه ... بالعلم يفتح كل بابٍ موصدِ»',
      badgeTitle: 'المبتكر الرقمي الواعد',
      badgeIcon: 'shield'
    },
    female: {
      title: 'شهادة ابتكار وإبداع علمي',
      subtitle: 'وسام التميز في البرمجة والروبوت والذكاء الاصطناعي',
      recipientIntro: 'تعتز إدارة المدرسة ونادي الابتكار بتكريم المبتكرة الصاعدة:',
      subject: 'الابتكار العلمي والتحول التقني',
      appreciationText: 'تقديراً لفكرها الابتكاري الخلاق وتألقها في تصميم المشاريع العلمية وحل المشكلات بطرق تقنية رائدة، متمنين لها مستقبلاً زاهراً في فضاء التقنية.',
      poemOrQuote: '«العقل يبني في العوالم صرحه ... بالعلم يفتح كل بابٍ موصدِ»',
      badgeTitle: 'المبتكرة الرقمية الواعدة',
      badgeIcon: 'shield'
    }
  },
  {
    id: 'sports',
    name: 'النشاط الرياضي واللياقة',
    icon: '🏆',
    category: 'رياضي',
    description: 'تكريم أبطال البطولات الرياضية والروح التنافسية العالية',
    primaryColor: '#1e3a8a',
    secondaryColor: '#2563eb',
    accentColor: '#93c5fd',
    backgroundColor: '#eff6ff',
    textColor: '#172554',
    frameStyle: 'royal-navy',
    male: {
      title: 'شهادة تميز وبطولة رياضية',
      subtitle: 'وسام الروح الرياضية واللياقة البدنية العالية',
      recipientIntro: 'يحتفي قسم التربية البدنية بإنجاز البطل الرياضي المتألق:',
      subject: 'البطولة الرياضية واللياقة البدنية',
      appreciationText: 'نظير تحقيقه المركز الأول في المنافسات الرياضية وإظهاره مهارات استثنائية وروحاً رياضية عالية ملهمة لجميع زملائه.',
      poemOrQuote: '«بالعزم والهمة تعلو القمم ... وبإصرارك تصنع الإنجاز والهمم»',
      badgeTitle: 'بطل المنافسات الرياضية',
      badgeIcon: 'medal'
    },
    female: {
      title: 'شهادة تميز وبطولة رياضية',
      subtitle: 'وسام الروح الرياضية واللياقة البدنية العالية',
      recipientIntro: 'يحتفي قسم التربية البدنية بإنجاز البطلة الرياضية المتألقة:',
      subject: 'البطولة الرياضية واللياقة البدنية',
      appreciationText: 'نظير تحقيقها المركز الأول في المنافسات الرياضية وإظهارها مهارات استثنائية وروحاً رياضية عالية ملهمة لجميع زميلاتها.',
      poemOrQuote: '«بالعزم والهمة تعلو القمم ... وبإصرارك تصنع الإنجاز والهمم»',
      badgeTitle: 'بطلة المنافسات الرياضية',
      badgeIcon: 'medal'
    }
  },
  {
    id: 'volunteering',
    name: 'العمل التطوعي وخدمة المجتمع',
    icon: '🤝',
    category: 'مجتمعي',
    description: 'تكريم المتطوعين والمشاركين في المبادرات المدرسية والإنسانية',
    primaryColor: '#047857',
    secondaryColor: '#0f766e',
    accentColor: '#a7f3d0',
    backgroundColor: '#ecfdf5',
    textColor: '#064e3b',
    frameStyle: 'emerald-border',
    male: {
      title: 'شهادة شكر للمتطوع المتميز',
      subtitle: 'وسام البذل والعطاء وخدمة المجتمع والبيئة',
      recipientIntro: 'تتقدم وحدة التطوع والشراكة المجتمعية بالشكر للمتطوع المبدع:',
      subject: 'المبادرات التطوعية وخدمة المجتمع',
      appreciationText: 'تقديراً لمشاركته الفاعلة وتفانيه في المبادرات التطوعية ونشر قيم التعاون والإيجابية، داعين الله أن يجعل ذلك في موازين حسناته.',
      poemOrQuote: '«وَما خَيرُ فِعلِ المَرءِ إِلّا اِبتِغاءَهُ ... رِضا اللَهِ في نَفعِ البَرِيَّةِ أَجمَعا»',
      badgeTitle: 'سفير العمل التطوعي',
      badgeIcon: 'award'
    },
    female: {
      title: 'شهادة شكر للمتطوعة المتميزة',
      subtitle: 'وسام البذل والعطاء وخدمة المجتمع والبيئة',
      recipientIntro: 'تتقدم وحدة التطوع والشراكة المجتمعية بالشكر للمتطوعة المبدعة:',
      subject: 'المبادرات التطوعية وخدمة المجتمع',
      appreciationText: 'تقديراً لمشاركتها الفاعلة وتفانيها في المبادرات التطوعية ونشر قيم التعاون والإيجابية، داعين الله أن يجعل ذلك في موازين حسناتها.',
      poemOrQuote: '«وَما خَيرُ فِعلِ المَرءِ إِلّا اِبتِغاءَهُ ... رِضا اللَهِ في نَفعِ البَرِيَّةِ أَجمَعا»',
      badgeTitle: 'سفيرة العمل التطوعي',
      badgeIcon: 'award'
    }
  },
  {
    id: 'reading',
    name: 'تحدي القراءة والمعرفة',
    icon: '📚',
    category: 'ثقافي',
    description: 'تكريم رواد القراءة والمطالعة وتلخيص أمهات الكتب',
    primaryColor: '#78350f',
    secondaryColor: '#92400e',
    accentColor: '#fed7aa',
    backgroundColor: '#fffbeb',
    textColor: '#451a03',
    frameStyle: 'double-gold',
    male: {
      title: 'شهادة فارس القراءة والمعرفة',
      subtitle: 'وسام التميز في تحدي القراءة وتلخيص الكتب',
      recipientIntro: 'يسر مركز مصادر التعلم والمكتبة تكريم القارئ المتميز:',
      subject: 'تحدي القراءة والمطالعة الناقدة',
      appreciationText: 'تقديراً لشغفه بالقراءة واجتيازه قراءة وتلخيص العديد من الكتب النافعة بوعي وبلاغة وفكر ناضج، متمنين له إبحاراً دائماً في رياض المعرفة.',
      poemOrQuote: '«أَعَزُّ مَكانٍ في الدُنى سَرجُ سابِحٍ ... وَخَيرُ جَليسٍ في الزَمانِ كِتابُ»',
      badgeTitle: 'فارس القراءة الأول',
      badgeIcon: 'book'
    },
    female: {
      title: 'شهادة فارسة القراءة والمعرفة',
      subtitle: 'وسام التميز في تحدي القراءة وتلخيص الكتب',
      recipientIntro: 'يسر مركز مصادر التعلم والمكتبة تكريم القارئة المتميزة:',
      subject: 'تحدي القراءة والمطالعة الناقدة',
      appreciationText: 'تقديراً لشغفها بالقراءة واجتيازها قراءة وتلخيص العديد من الكتب النافعة بوعي وبلاغة وفكر ناضج، متمنين لها إبحاراً دائماً في رياض المعرفة.',
      poemOrQuote: '«أَعَزُّ مَكانٍ في الدُنى سَرجُ سابِحٍ ... وَخَيرُ جَليسٍ في الزَمانِ كِتابُ»',
      badgeTitle: 'فارسة القراءة الأولى',
      badgeIcon: 'book'
    }
  },
  {
    id: 'early_childhood',
    name: 'بطل الروضة والصغار',
    icon: '👶',
    category: 'طفولة',
    description: 'شهادات تشجيعية مرحة ومبهجة لرياض الأطفال والصفوف الأولية',
    primaryColor: '#0284c7',
    secondaryColor: '#f59e0b',
    accentColor: '#fef08a',
    backgroundColor: '#f0f9ff',
    textColor: '#0c4a6e',
    frameStyle: 'playful-dots',
    male: {
      title: 'شهادة البطل الصغير الرائع',
      subtitle: 'وسام النجم المبدع والمرحلة التأسيسية',
      recipientIntro: 'تفتخر معلمات الروضة بالبطل الصغير النجم المبدع:',
      subject: 'التفوق والمشاركة والمرح',
      appreciationText: 'نظير حضوره المبهج وتفوقه في الأنشطة المدرسية وتعلمه الحروف والأرقام بذكاء ومرح، بارك الله فيه وجعله قرة عين لوالديه.',
      poemOrQuote: '«يا طفلنا الغالي حماك إلهنا ... بالعلم تبني مستقبلاً وضّاءا»',
      badgeTitle: 'نجم الروضة المتألق',
      badgeIcon: 'star'
    },
    female: {
      title: 'شهادة الأميرة الصغيرة الرائعة',
      subtitle: 'وسام النجمة المبدعة والمرحلة التأسيسية',
      recipientIntro: 'تفتخر معلمات الروضة بالأميرة الصغيرة النجمة المبدعة:',
      subject: 'التفوق والمشاركة والمرح',
      appreciationText: 'نظير حضورها المبهج وتفوقها في الأنشطة المدرسية وتعلمها الحروف والأرقام بذكاء ومرح، بارك الله فيها وجعلها قرة عين لوالديها.',
      poemOrQuote: '«يا طفلتنا الغالية حماكِ إلهنا ... بالعلم تبنينَ مستقبلاً وضّاءا»',
      badgeTitle: 'نجمة الروضة المتألقة',
      badgeIcon: 'star'
    }
  }
];

/**
 * Generates or adapts full certificate data by certificate type and recipient gender locally
 */
export function generateCertificateByTypeLocal(
  typeId: string,
  gender: RecipientGender,
  existingData?: Partial<CertificateData>
): Partial<CertificateData> {
  const preset = CERTIFICATE_TYPES_LIST.find(t => t.id === typeId) || CERTIFICATE_TYPES_LIST[0];
  const gData = gender === 'female' ? preset.female : preset.male;

  return {
    ...existingData,
    title: gData.title,
    subtitle: gData.subtitle,
    recipientIntro: gData.recipientIntro,
    subject: existingData?.subject || gData.subject,
    appreciationText: gData.appreciationText,
    poemOrQuote: gData.poemOrQuote,
    badgeTitle: gData.badgeTitle,
    badgeIcon: gData.badgeIcon as any,
    showBadge: true,
    recipientGender: gender,
    primaryColor: existingData?.primaryColor || preset.primaryColor,
    secondaryColor: existingData?.secondaryColor || preset.secondaryColor,
    accentColor: existingData?.accentColor || preset.accentColor,
    backgroundColor: existingData?.backgroundColor || preset.backgroundColor,
    textColor: existingData?.textColor || preset.textColor,
    frameStyle: existingData?.frameStyle || (preset.frameStyle as any),
    updatedAt: new Date().toISOString(),
  };
}

