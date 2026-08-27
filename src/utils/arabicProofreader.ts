import { CertificateData } from '../types';
import { RecipientGender, RAW_GENDER_PAIRS, replaceArabicPhrase } from './genderConverter';

export type IssueCategory =
  | 'hamza' // همزات الوصل والقطع
  | 'taa_marbuta' // التاء المربوطة والهاء
  | 'alif_maqsura' // الألف المقصورة والياء
  | 'tanween' // التنوين
  | 'punctuation' // علامات الترقيم والمسافات
  | 'gender_concordance' // تطابق التذكير والتأنيث
  | 'common_typo' // أخطاء شائعة
  | 'stylistic'; // تحسينات بلاغية وأسلوبية

export type IssueSeverity = 'error' | 'warning' | 'suggestion';

export interface ProofreadIssue {
  id: string;
  fieldName: keyof CertificateData | string;
  fieldLabel: string;
  originalWord: string;
  suggestedWord: string;
  startIndex: number;
  endIndex: number;
  contextSentence: string;
  category: IssueCategory;
  categoryLabel: string;
  severity: IssueSeverity;
  ruleExplanation: string;
  applied?: boolean;
}

export interface FieldProofreadResult {
  fieldName: string;
  fieldLabel: string;
  originalText: string;
  correctedText: string;
  issues: ProofreadIssue[];
  isClean: boolean;
}

export interface CertificateProofreadResult {
  fields: Record<string, FieldProofreadResult>;
  totalIssues: number;
  totalIssuesCount: number;
  errorsCount: number;
  warningsCount: number;
  suggestionsCount: number;
  genderIssuesCount: number;
  score: number; // 0 to 100
  hasIssues: boolean;
  correctedCertificate: CertificateData;
}

// Arabic character boundaries helper
const ARABIC_WORD_CHARS = '\\u0621-\\u064A\\u0671-\\u06D3\\u06D5\\u0660-\\u0669a-zA-Z0-9_';

/**
 * Escapes regex special characters
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Creates a regex that accurately matches an Arabic word or phrase with proper boundaries
 */
export function createArabicWordRegex(wordOrPhrase: string, flags: string = 'g'): RegExp {
  const escaped = escapeRegExp(wordOrPhrase.trim());
  return new RegExp(`(?<=^|[^${ARABIC_WORD_CHARS}])${escaped}(?=$|[^${ARABIC_WORD_CHARS}])`, flags);
}

// Map of common Arabic certificate vocabulary errors & grammar rules
interface RuleDefinition {
  pattern: RegExp;
  replacement: string | ((match: string, ...args: any[]) => string);
  category: IssueCategory;
  categoryLabel: string;
  severity: IssueSeverity;
  explanation: string;
}

/**
 * Helper to build word replacement rules
 */
function wordRule(
  wrongWord: string,
  correctWord: string,
  category: IssueCategory,
  categoryLabel: string,
  severity: IssueSeverity,
  explanation: string
): RuleDefinition {
  return {
    pattern: createArabicWordRegex(wrongWord),
    replacement: correctWord,
    category,
    categoryLabel,
    severity,
    explanation,
  };
}

/**
 * Comprehensive Dictionary of Arabic Spelling, Grammar, and Typographic Rules
 */
export const ARABIC_PROOFREADING_RULES: RuleDefinition[] = [
  // 1. همزات القطع والوصل (الأخطاء الأكثر شيوعاً في شهادات التقدير)
  wordRule('شهاده', 'شهادة', 'taa_marbuta', 'تاء مربوطة', 'error', 'تكتب "شهادة" بالتاء المربوطة لأنها تنطق تاء عند الوصل وهاء عند الوقف.'),
  wordRule('مدرسه', 'مدرسة', 'taa_marbuta', 'تاء مربوطة', 'error', 'تكتب "مدرسة" بالتاء المربوطة المنقوطة.'),
  wordRule('المدرسه', 'المدرسة', 'taa_marbuta', 'تاء مربوطة', 'error', 'تكتب "المدرسة" بالتاء المربوطة المنقوطة.'),
  wordRule('اداره', 'إدارة', 'hamza', 'همزة قطع وتاء مربوطة', 'error', 'تكتب "إدارة" بهمزة قطع مكسورة في البداية وتاء مربوطة في النهاية.'),
  wordRule('الاداره', 'الإدارة', 'hamza', 'همزة قطع وتاء مربوطة', 'error', 'تكتب "الإدارة" بهمزة قطع تحت الألف وتاء مربوطة.'),
  wordRule('إداره', 'إدارة', 'taa_marbuta', 'تاء مربوطة', 'error', 'تكتب "إدارة" بالتاء المربوطة.'),
  wordRule('ادارة', 'إدارة', 'hamza', 'همزة قطع', 'error', 'مصدر الفعل الرباعي "أدار" هو "إدارة" ويبدأ بهمزة قطع مكسورة.'),
  wordRule('الادارة', 'الإدارة', 'hamza', 'همزة قطع', 'error', 'تكتب "الإدارة" بهمزة قطع تحت الألف.'),
  wordRule('تكريم', 'تكريم', 'common_typo', 'إملاء سليم', 'suggestion', 'كلمة "تكريم" صحيحة.'),

  // همزات الأفعال والمصادر والأسماء الشائعة في التكريم
  wordRule('انجاز', 'إنجاز', 'hamza', 'همزة قطع', 'error', 'مصدر الفعل الرباعي "أنجز" هو "إنجاز" ويبدأ بهمزة قطع مكسورة.'),
  wordRule('الانجاز', 'الإنجاز', 'hamza', 'همزة قطع', 'error', 'تكتب "الإنجاز" بهمزة قطع مكسورة تحت الألف.'),
  wordRule('انجازات', 'إنجازات', 'hamza', 'همزة قطع', 'error', 'تكتب "إنجازات" بهمزة قطع مكسورة.'),
  wordRule('ابداع', 'إبداع', 'hamza', 'همزة قطع', 'error', 'مصدر الفعل الرباعي "أبدع" هو "إبداع" ويبدأ بهمزة قطع مكسورة.'),
  wordRule('الابداع', 'الإبداع', 'hamza', 'همزة قطع', 'error', 'تكتب "الإبداع" بهمزة قطع تحت الألف.'),
  wordRule('ابداعات', 'إبداعات', 'hamza', 'همزة قطع', 'error', 'تكتب "إبداعات" بهمزة قطع مكسورة.'),
  wordRule('ابداعه', 'إبداعه', 'hamza', 'همزة قطع', 'error', 'تكتب "إبداعه" بهمزة قطع مكسورة.'),
  wordRule('ابداعها', 'إبداعها', 'hamza', 'همزة قطع', 'error', 'تكتب "إبداعها" بهمزة قطع مكسورة.'),
  wordRule('اتقان', 'إتقان', 'hamza', 'همزة قطع', 'error', 'مصدر الفعل الرباعي "أتقن" هو "إتقان" ويبدأ بهمزة قطع.'),
  wordRule('الاتقان', 'الإتقان', 'hamza', 'همزة قطع', 'error', 'تكتب "الإتقان" بهمزة قطع تحت الألف.'),
  wordRule('اتقانه', 'إتقانه', 'hamza', 'همزة قطع', 'error', 'تكتب "إتقانه" بهمزة قطع.'),
  wordRule('اتقانها', 'إتقانها', 'hamza', 'همزة قطع', 'error', 'تكتب "إتقانها" بهمزة قطع.'),
  wordRule('اخلاص', 'إخلاص', 'hamza', 'همزة قطع', 'error', 'مصدر الفعل الرباعي "أخلص" هو "إخلاص" ويبدأ بهمزة قطع.'),
  wordRule('الاخلاص', 'الإخلاص', 'hamza', 'همزة قطع', 'error', 'تكتب "الإخلاص" بهمزة قطع تحت الألف.'),
  wordRule('اخلاصه', 'إخلاصه', 'hamza', 'همزة قطع', 'error', 'تكتب "إخلاصه" بهمزة قطع.'),
  wordRule('اخلاصها', 'إخلاصها', 'hamza', 'همزة قطع', 'error', 'تكتب "إخلاصها" بهمزة قطع.'),
  wordRule('اهداء', 'إهداء', 'hamza', 'همزة قطع', 'error', 'مصدر الفعل الرباعي "أهدى" هو "إهداء" ويبدأ بهمزة قطع.'),
  wordRule('الاهداء', 'الإهداء', 'hamza', 'همزة قطع', 'error', 'تكتب "الإهداء" بهمزة قطع تحت الألف.'),
  wordRule('اهتمام', 'اهتمام', 'hamza', 'همزة وصل', 'error', 'مصدر الفعل الخماسي "اهتم" يبدأ بهمزة وصل دون همزة مكتوبة.'),
  wordRule('إهتمام', 'اهتمام', 'hamza', 'همزة وصل', 'error', 'مصدر الفعل الخماسي "اهتم" يبدأ بهمزة وصل ولا ترسم فوقه أو تحته همزة.'),
  wordRule('الاهتمام', 'الاهتمام', 'hamza', 'همزة وصل', 'suggestion', 'همزة "الاهتمام" همزة وصل.'),
  wordRule('الإهتمام', 'الاهتمام', 'hamza', 'همزة وصل', 'error', 'تكتب "الاهتمام" بهمزة وصل دون همزة تحت الألف.'),
  wordRule('استحقاق', 'استحقاق', 'hamza', 'همزة وصل', 'suggestion', 'همزة "استحقاق" همزة وصل.'),
  wordRule('إستحقاق', 'استحقاق', 'hamza', 'همزة وصل', 'error', 'مصدر الفعل السداسي "استحق" يبدأ بهمزة وصل: "استحقاق".'),
  wordRule('الإستحقاق', 'الاستحقاق', 'hamza', 'همزة وصل', 'error', 'تكتب "الاستحقاق" بألف وصل دون همزة.'),
  wordRule('استمرار', 'استمرار', 'hamza', 'همزة وصل', 'suggestion', 'همزة "استمرار" همزة وصل.'),
  wordRule('إستمرار', 'استمرار', 'hamza', 'همزة وصل', 'error', 'مصدر الفعل السداسي "استمر" يبدأ بهمزة وصل: "استمرار".'),
  wordRule('إستثنائي', 'استثنائي', 'hamza', 'همزة وصل', 'error', 'تكتب "استثنائي" بهمزة وصل.'),
  wordRule('الإستثنائي', 'الاستثنائي', 'hamza', 'همزة وصل', 'error', 'تكتب "الاستثنائي" بهمزة وصل.'),
  wordRule('اجتهاد', 'اجتهاد', 'hamza', 'همزة وصل', 'suggestion', 'همزة "اجتهاد" همزة وصل.'),
  wordRule('إجتهاد', 'اجتهاد', 'hamza', 'همزة وصل', 'error', 'مصدر الفعل الخماسي "اجتهد" يبدأ بهمزة وصل دون رسم الهمزة.'),
  wordRule('الإجتهاد', 'الاجتهاد', 'hamza', 'همزة وصل', 'error', 'تكتب "الاجتهاد" بألف وصل.'),
  wordRule('إجتهاده', 'اجتهاده', 'hamza', 'همزة وصل', 'error', 'تكتب "اجتهاده" بهمزة وصل.'),
  wordRule('إجتهادها', 'اجتهادها', 'hamza', 'همزة وصل', 'error', 'تكتب "اجتهادها" بهمزة وصل.'),
  wordRule('انضباط', 'انضباط', 'hamza', 'همزة وصل', 'suggestion', 'همزة "انضباط" همزة وصل.'),
  wordRule('إنضباط', 'انضباط', 'hamza', 'همزة وصل', 'error', 'مصدر الفعل الخماسي "انضبط" يبدأ بهمزة وصل: "انضباط".'),
  wordRule('الإنضباط', 'الانضباط', 'hamza', 'همزة وصل', 'error', 'تكتب "الانضباط" بألف وصل.'),
  wordRule('إنضباطه', 'انضباطه', 'hamza', 'همزة وصل', 'error', 'تكتب "انضباطه" بهمزة وصل.'),
  wordRule('إنضباطها', 'انضباطها', 'hamza', 'همزة وصل', 'error', 'تكتب "انضباطها" بهمزة وصل.'),
  wordRule('اشتراك', 'اشتراك', 'hamza', 'همزة وصل', 'suggestion', 'همزة "اشتراك" همزة وصل.'),
  wordRule('إشتراك', 'اشتراك', 'hamza', 'همزة وصل', 'error', 'مصدر الفعل الخماسي يبدأ بهمزة وصل: "اشتراك".'),
  wordRule('ابتكار', 'ابتكار', 'hamza', 'همزة وصل', 'suggestion', 'همزة "ابتكار" همزة وصل.'),
  wordRule('إبتكار', 'ابتكار', 'hamza', 'همزة وصل', 'error', 'مصدر الفعل الخماسي "ابتكر" يبدأ بهمزة وصل: "ابتكار".'),
  wordRule('الإبتكار', 'الابتكار', 'hamza', 'همزة وصل', 'error', 'تكتب "الابتكار" بألف وصل.'),
  wordRule('إبتكاره', 'ابتكاره', 'hamza', 'همزة وصل', 'error', 'تكتب "ابتكاره" بهمزة وصل.'),
  wordRule('إبتكارها', 'ابتكارها', 'hamza', 'همزة وصل', 'error', 'تكتب "ابتكارها" بهمزة وصل.'),
  wordRule('التزام', 'التزام', 'hamza', 'همزة وصل', 'suggestion', 'همزة "التزام" همزة وصل.'),
  wordRule('إلتزام', 'التزام', 'hamza', 'همزة وصل', 'error', 'مصدر الفعل الخماسي "التزم" يبدأ بهمزة وصل: "التزام".'),
  wordRule('الإلتزام', 'الالتزام', 'hamza', 'همزة وصل', 'error', 'تكتب "الالتزام" بألف وصل.'),
  wordRule('اعتماد', 'اعتماد', 'hamza', 'همزة وصل', 'suggestion', 'همزة "اعتماد" همزة وصل.'),
  wordRule('إعتماد', 'اعتماد', 'hamza', 'همزة وصل', 'error', 'مصدر الفعل الخماسي يبدأ بهمزة وصل: "اعتماد".'),
  wordRule('الإعتماد', 'الاعتماد', 'hamza', 'همزة وصل', 'error', 'تكتب "الاعتماد" بألف وصل.'),
  wordRule('إسم', 'اسم', 'hamza', 'همزة وصل', 'error', 'كلمة "اسم" من الأسماء السبعة السماعية التي تبدأ بهمزة وصل.'),
  wordRule('الإسم', 'الاسم', 'hamza', 'همزة وصل', 'error', 'تكتب "الاسم" بألف وصل دون همزة.'),
  wordRule('إبن', 'ابن', 'hamza', 'همزة وصل', 'error', 'كلمة "ابن" من الأسماء التي تبدأ بهمزة وصل.'),
  wordRule('إبنة', 'ابنة', 'hamza', 'همزة وصل', 'error', 'كلمة "ابنة" تبدأ بهمزة وصل.'),
  wordRule('ابنه', 'ابنة', 'taa_marbuta', 'تاء مربوطة', 'error', 'تكتب "ابنة" بالتاء المربوطة.'),
  wordRule('إثنان', 'اثنان', 'hamza', 'همزة وصل', 'error', 'تكتب "اثنان" بهمزة وصل.'),
  wordRule('إثنين', 'اثنين', 'hamza', 'همزة وصل', 'error', 'تكتب "اثنين" بهمزة وصل.'),
  wordRule('الي', 'إلى', 'hamza', 'همزة قطع وألف مقصورة', 'error', 'حرف الجر "إلى" يكتب بهمزة قطع مكسورة وينتهي بألف مقصورة.'),
  wordRule('إلي', 'إلى', 'alif_maqsura', 'ألف مقصورة', 'error', 'ينتهي حرف الجر "إلى" بألف مقصورة (ى) وليس ياءً منقوطة.'),
  wordRule('علي', 'على', 'alif_maqsura', 'ألف مقصورة', 'error', 'حرف الجر "على" ينتهي بألف مقصورة (ى).'),
  wordRule('حتي', 'حتى', 'alif_maqsura', 'ألف مقصورة', 'error', 'تكتب "حتى" بألف مقصورة.'),
  wordRule('مستوي', 'مستوى', 'alif_maqsura', 'ألف مقصورة', 'error', 'تكتب "مستوى" بألف مقصورة.'),
  wordRule('المستوي', 'المستوى', 'alif_maqsura', 'ألف مقصورة', 'error', 'تكتب "المستوى" بألف مقصورة.'),
  wordRule('ارتقي', 'ارتقى', 'alif_maqsura', 'ألف مقصورة', 'error', 'الفعل "ارتقى" ينتهي بألف مقصورة.'),
  wordRule('كبري', 'كبرى', 'alif_maqsura', 'ألف مقصورة', 'error', 'تكتب "كبرى" بألف مقصورة.'),
  wordRule('صغري', 'صغرى', 'alif_maqsura', 'ألف مقصورة', 'error', 'تكتب "صغرى" بألف مقصورة.'),
  wordRule('وسيطي', 'وسطى', 'alif_maqsura', 'ألف مقصورة', 'error', 'تكتب "وسطى" بألف مقصورة.'),
  wordRule('قصوي', 'قصوى', 'alif_maqsura', 'ألف مقصورة', 'error', 'تكتب "قصوى" بألف مقصورة.'),
  wordRule('مسمي', 'مسمى', 'alif_maqsura', 'ألف مقصورة', 'error', 'تكتب "مسمى" بألف مقصورة.'),
  wordRule('المولي', 'المولى', 'alif_maqsura', 'ألف مقصورة', 'error', 'تكتب "المولى" بألف مقصورة.'),
  wordRule('المولى عز وجل', 'المولى عز وجل', 'stylistic', 'صيغة رفيعة', 'suggestion', 'تعبير جليل مبارك.'),

  // 2. التاء المربوطة والهاء
  wordRule('مبروكه', 'مبروكة', 'taa_marbuta', 'تاء مربوطة', 'error', 'تكتب "مبروكة" بالتاء المربوطة.'),
  wordRule('متميزه', 'متميزة', 'taa_marbuta', 'تاء مربوطة', 'error', 'تكتب "متميزة" بالتاء المربوطة المنقوطة.'),
  wordRule('متفوقه', 'متفوقة', 'taa_marbuta', 'تاء مربوطة', 'error', 'تكتب "متفوقة" بالتاء المربوطة المنقوطة.'),
  wordRule('مبدعه', 'مبدعة', 'taa_marbuta', 'تاء مربوطة', 'error', 'تكتب "مبدعة" بالتاء المربوطة المنقوطة.'),
  wordRule('مجتهده', 'مجتهدة', 'taa_marbuta', 'تاء مربوطة', 'error', 'تكتب "مجتهدة" بالتاء المربوطة المنقوطة.'),
  wordRule('خلوقه', 'خلوقة', 'taa_marbuta', 'تاء مربوطة', 'error', 'تكتب "خلوقة" بالتاء المربوطة المنقوطة.'),
  wordRule('مباركه', 'مباركة', 'taa_marbuta', 'تاء مربوطة', 'error', 'تكتب "مباركة" بالتاء المربوطة المنقوطة.'),
  wordRule('طالبه', 'طالبة', 'taa_marbuta', 'تاء مربوطة', 'error', 'تكتب "طالبة" بالتاء المربوطة المنقوطة.'),
  wordRule('الطالبه', 'الطالبة', 'taa_marbuta', 'تاء مربوطة', 'error', 'تكتب "الطالبة" بالتاء المربوطة المنقوطة.'),
  wordRule('معلمه', 'معلمة', 'taa_marbuta', 'تاء مربوطة', 'error', 'تكتب "معلمة" بالتاء المربوطة المنقوطة.'),
  wordRule('المعلمه', 'المعلمة', 'taa_marbuta', 'تاء مربوطة', 'error', 'تكتب "المعلمة" بالتاء المربوطة المنقوطة.'),
  wordRule('استاذه', 'أستاذة', 'hamza', 'همزة قطع وتاء مربوطة', 'error', 'تكتب "أستاذة" بهمزة قطع وتاء مربوطة.'),
  wordRule('الأستاذه', 'الأستاذة', 'taa_marbuta', 'تاء مربوطة', 'error', 'تكتب "الأستاذة" بالتاء المربوطة.'),
  wordRule('أستاذه', 'أستاذة', 'taa_marbuta', 'تاء مربوطة', 'error', 'تكتب "أستاذة" بالتاء المربوطة.'),
  wordRule('خريجه', 'خريجة', 'taa_marbuta', 'تاء مربوطة', 'error', 'تكتب "خريجة" بالتاء المربوطة.'),
  wordRule('الخريجه', 'الخريجة', 'taa_marbuta', 'تاء مربوطة', 'error', 'تكتب "الخريجة" بالتاء المربوطة.'),
  wordRule('قائده', 'قائدة', 'taa_marbuta', 'تاء مربوطة', 'error', 'تكتب "قائدة" بالتاء المربوطة.'),
  wordRule('القائده', 'القائدة', 'taa_marbuta', 'تاء مربوطة', 'error', 'تكتب "القائدة" بالتاء المربوطة.'),
  wordRule('سفيره', 'سفيرة', 'taa_marbuta', 'تاء مربوطة', 'error', 'تكتب "سفيرة" بالتاء المربوطة.'),
  wordRule('السفيره', 'السفيرة', 'taa_marbuta', 'تاء مربوطة', 'error', 'تكتب "السفيرة" بالتاء المربوطة.'),
  wordRule('بطلة', 'بطلة', 'taa_marbuta', 'تاء مربوطة', 'suggestion', 'تاء مربوطة صحيحة.'),
  wordRule('بطله', 'بطلة', 'taa_marbuta', 'تاء مربوطة', 'error', 'تكتب "بطلة" بالتاء المربوطة المنقوطة.'),
  wordRule('البطله', 'البطلة', 'taa_marbuta', 'تاء مربوطة', 'error', 'تكتب "البطلة" بالتاء المربوطة المنقوطة.'),
  wordRule('فارسه', 'فارسة', 'taa_marbuta', 'تاء مربوطة', 'error', 'تكتب "فارسة" بالتاء المربوطة المنقوطة.'),
  wordRule('الفارسه', 'الفارسة', 'taa_marbuta', 'تاء مربوطة', 'error', 'تكتب "الفارسة" بالتاء المربوطة المنقوطة.'),
  wordRule('نجمه', 'نجمة', 'taa_marbuta', 'تاء مربوطة', 'error', 'تكتب "نجمة" بالتاء المربوطة المنقوطة.'),
  wordRule('النجمه', 'النجمة', 'taa_marbuta', 'تاء مربوطة', 'error', 'تكتب "النجمة" بالتاء المربوطة المنقوطة.'),

  // 3. التنوين والأخطاء الإملائية بالننون
  wordRule('شكرن', 'شكراً', 'tanween', 'تنوين نصب', 'error', 'تنوين النصب في "شكراً" يكتب فتحتين على ألف وليس نوناً.'),
  wordRule('تقديرن', 'تقديراً', 'tanween', 'تنوين نصب', 'error', 'تنوين النصب في "تقديراً" يكتب فتحتين على ألف وليس نوناً.'),
  wordRule('ايضن', 'أيضاً', 'tanween', 'تنوين وهمزة قطع', 'error', 'تكتب "أيضاً" بهمزة قطع وتنوين نصب.'),
  wordRule('ايضا', 'أيضاً', 'tanween', 'تنوين وهمزة قطع', 'error', 'تكتب "أيضاً" بهمزة قطع وتنوين نصب.'),
  wordRule('دائمن', 'دائماً', 'tanween', 'تنوين نصب', 'error', 'تكتب "دائماً" بتنوين نصب.'),
  wordRule('دائما', 'دائماً', 'tanween', 'تنوين نصب', 'suggestion', 'الأفضل ضبطها بالتنوين "دائماً".'),
  wordRule('مستمرن', 'مستمراً', 'tanween', 'تنوين نصب', 'error', 'تكتب "مستمراً" بتنوين نصب على الألف.'),
  wordRule('مستمرا', 'مستمراً', 'tanween', 'تنوين نصب', 'suggestion', 'الأفضل ضبطها بالتنوين "مستمراً".'),
  wordRule('جدن', 'جداً', 'tanween', 'تنوين نصب', 'error', 'تكتب "جداً" بتنوين نصب.'),
  wordRule('جدا', 'جداً', 'tanween', 'تنوين نصب', 'suggestion', 'الأفضل ضبطها بالتنوين "جداً".'),
  wordRule('دومن', 'دوماً', 'tanween', 'تنوين نصب', 'error', 'تكتب "دوماً" بتنوين نصب.'),
  wordRule('دوما', 'دوماً', 'tanween', 'تنوين نصب', 'suggestion', 'الأفضل ضبطها بالتنوين "دوماً".'),
  wordRule('عامن', 'عاماً', 'tanween', 'تنوين نصب', 'error', 'تكتب "عاماً" بتنوين نصب.'),
  wordRule('عاما', 'عاماً', 'tanween', 'تنوين نصب', 'suggestion', 'الأفضل ضبطها بالتنوين "عاماً".'),
  wordRule('مستقبلن', 'مستقبلاً', 'tanween', 'تنوين نصب', 'error', 'تكتب "مستقبلاً" بتنوين نصب.'),
  wordRule('مستقبلا', 'مستقبلاً', 'tanween', 'تنوين نصب', 'suggestion', 'الأفضل ضبطها بالتنوين "مستقبلاً".'),
  wordRule('جميعن', 'جميعاً', 'tanween', 'تنوين نصب', 'error', 'تكتب "جميعاً" بتنوين نصب.'),
  wordRule('جميعا', 'جميعاً', 'tanween', 'تنوين نصب', 'suggestion', 'الأفضل ضبطها بالتنوين "جميعاً".'),

  // 4. الأخطاء اللغوية والأسلوبية الشهيرة في شهادات التقدير
  wordRule('مبروك', 'مبارك', 'common_typo', 'صحة التعبير اللغوي', 'warning', 'الأصح لغوياً قول "مبارك" (من بارك) بدلاً من "مبروك" (من بَرَكَ الجَمَل).'),
  wordRule('الف مبروك', 'ألف مبارك', 'common_typo', 'صحة التعبير اللغوي', 'warning', 'الصواب البلاغي هو "ألف مبارك".'),
  wordRule('ألف مبروك', 'ألف مبارك', 'common_typo', 'صحة التعبير اللغوي', 'warning', 'الصواب البلاغي هو "ألف مبارك".'),
  wordRule('إنشاء الله', 'إن شاء الله', 'common_typo', 'صحة التعبير العقدي واللغوي', 'error', 'تكتب المشيئة منفصلة "إن شاء الله" لأن "إنشاء" تعني الخلق والبناء.'),
  wordRule('انشاء الله', 'إن شاء الله', 'common_typo', 'صحة التعبير العقدي واللغوي', 'error', 'تكتب المشيئة منفصلة "إن شاء الله" بهمزتي قطع.'),
  wordRule('جزاك الله الف خير', 'جزاك الله خيراً', 'stylistic', 'صحة الدعاء والسنة', 'suggestion', 'السنة في الدعاء قول "جزاك الله خيراً" دون حصر بـ (ألف).'),
  wordRule('جزاكِ الله الف خير', 'جزاكِ الله خيراً', 'stylistic', 'صحة الدعاء والسنة', 'suggestion', 'السنة في الدعاء قول "جزاكِ الله خيراً".'),
  wordRule('شكرا جزيلا', 'شكراً جزيلاً', 'tanween', 'تنوين النصب', 'suggestion', 'الأفضل تنوين الكلمتين: "شكراً جزيلاً".'),

  // 5. علامات الترقيم والمسافات الزائدة
  {
    pattern: /\s+([،؛:\.؟!])/g,
    replacement: '$1',
    category: 'punctuation',
    categoryLabel: 'تنسيق علامات الترقيم',
    severity: 'suggestion',
    explanation: 'في الإملاء العربي تلصق علامات الترقيم بالكلمة التي قبلها مباشرة دون مسافة.',
  },
  {
    pattern: /([،؛:\.؟!])(?=[^\s\d،؛:\.؟!])/g,
    replacement: '$1 ',
    category: 'punctuation',
    categoryLabel: 'مسافة بعد علامات الترقيم',
    severity: 'suggestion',
    explanation: 'توضع مسافة بعد علامة الترقيم قبل الكلمة التالية.',
  },
  {
    pattern: /\s{2,}/g,
    replacement: ' ',
    category: 'punctuation',
    categoryLabel: 'مسافات متكررة',
    severity: 'suggestion',
    explanation: 'إزالة المسافات المتكررة بين الكلمات.',
  },
  {
    pattern: /(?<=^|[\s])و\s+([\u0621-\u064A])/g,
    replacement: 'و$1',
    category: 'punctuation',
    categoryLabel: 'واو العطف',
    severity: 'warning',
    explanation: 'في قواعد الخط والإملاء العربي تتصل واو العطف مباشرة بالكلمة المعطوفة: مثل "والإبداع" وليس "و الإبداع".',
  },
  {
    pattern: /,/g,
    replacement: '،',
    category: 'punctuation',
    categoryLabel: 'الفاصلة العربية',
    severity: 'warning',
    explanation: 'استخدام الفاصلة العربية (،) بدلاً من الفاصلة الإنجليزية (,).',
  },
  {
    pattern: /\?/g,
    replacement: '؟',
    category: 'punctuation',
    categoryLabel: 'علامة الاستفهام العربية',
    severity: 'warning',
    explanation: 'استخدام علامة الاستفهام العربية (؟) بدلاً من الإنجليزية (?).',
  },
  {
    pattern: /;/g,
    replacement: '؛',
    category: 'punctuation',
    categoryLabel: 'الفاصلة المنقوطة العربية',
    severity: 'warning',
    explanation: 'استخدام الفاصلة المنقوطة العربية (؛) بدلاً من الإنجليزية (;).',
  },
];

/**
 * Proofreads a single text field against grammatical, spelling, gender, and stylistic rules
 */
export function proofreadTextField(
  text: string,
  fieldName: keyof CertificateData | string,
  fieldLabel: string,
  gender: RecipientGender = 'male'
): FieldProofreadResult {
  if (!text || typeof text !== 'string' || !text.trim()) {
    return {
      fieldName: String(fieldName),
      fieldLabel,
      originalText: text || '',
      correctedText: text || '',
      issues: [],
      isClean: true,
    };
  }

  let corrected = text;
  const issues: ProofreadIssue[] = [];

  // 1. Check gender concordance systematically against RAW_GENDER_PAIRS
  // Sort pairs by descending length so multi-word patterns match before single words
  const sortedPairs = [...RAW_GENDER_PAIRS].sort((a, b) =>
    gender === 'female' ? b.male.length - a.male.length : b.female.length - a.female.length
  );

  // Normalization of common slashes (e.g. الطالب/ـة)
  const slashPattern = /([^\s]+)[\/ـ_\-\\]+[ةه]/g;
  let slashMatch: RegExpExecArray | null;
  while ((slashMatch = slashPattern.exec(text)) !== null) {
    const fullMatch = slashMatch[0];
    let resolved = fullMatch;
    if (gender === 'female') {
      resolved = fullMatch
        .replace(/الطالب[\/ـ_\-\\]+[ةه]/g, 'الطالبة')
        .replace(/طالب[\/ـ_\-\\]+[ةه]/g, 'طالبة')
        .replace(/الأستاذ[\/ـ_\-\\]+[ةه]/g, 'الأستاذة')
        .replace(/المعلم[\/ـ_\-\\]+[ةه]/g, 'المعلمة')
        .replace(/المبدع[\/ـ_\-\\]+[ةه]/g, 'المبدعة')
        .replace(/المتطوع[\/ـ_\-\\]+[ةه]/g, 'المتطوعة')
        .replace(/المتفوق[\/ـ_\-\\]+[ةه]/g, 'المتفوقة')
        .replace(/المتميز[\/ـ_\-\\]+[ةه]/g, 'المتميزة')
        .replace(/المجتهد[\/ـ_\-\\]+[ةه]/g, 'المجتهدة')
        .replace(/الخريج[\/ـ_\-\\]+[ةه]/g, 'الخريجة');
    } else {
      resolved = fullMatch
        .replace(/الطالب[\/ـ_\-\\]+[ةه]/g, 'الطالب')
        .replace(/طالب[\/ـ_\-\\]+[ةه]/g, 'طالب')
        .replace(/الأستاذ[\/ـ_\-\\]+[ةه]/g, 'الأستاذ')
        .replace(/المعلم[\/ـ_\-\\]+[ةه]/g, 'المعلم')
        .replace(/المبدع[\/ـ_\-\\]+[ةه]/g, 'المبدع')
        .replace(/المتطوع[\/ـ_\-\\]+[ةه]/g, 'المتطوع')
        .replace(/المتفوق[\/ـ_\-\\]+[ةه]/g, 'المتفوق')
        .replace(/المتميز[\/ـ_\-\\]+[ةه]/g, 'المتميز')
        .replace(/المجتهد[\/ـ_\-\\]+[ةه]/g, 'المجتهد')
        .replace(/الخريج[\/ـ_\-\\]+[ةه]/g, 'الخريج');
    }

    if (resolved !== fullMatch) {
      issues.push({
        id: `issue-gender-slash-${fieldName}-${issues.length}-${slashMatch.index}`,
        fieldName: String(fieldName),
        fieldLabel,
        originalWord: fullMatch,
        suggestedWord: resolved,
        startIndex: slashMatch.index,
        endIndex: slashMatch.index + fullMatch.length,
        contextSentence: getContextSnippet(text, slashMatch.index, fullMatch.length),
        category: 'gender_concordance',
        categoryLabel: gender === 'female' ? 'تطابق التأنيث' : 'تطابق التذكير',
        severity: 'error',
        ruleExplanation: `إزالة الشرطة المائلة وتثبيت الصيغة الصريحة (${gender === 'female' ? 'المؤنث' : 'المذكر'}): "${resolved}".`,
      });
      corrected = corrected.replace(fullMatch, resolved);
    }
  }

  // Check matched gender discordances in text
  for (const pair of sortedPairs) {
    const wrongPhrase = gender === 'female' ? pair.male : pair.female;
    const correctPhrase = gender === 'female' ? pair.female : pair.male;
    const explanation = gender === 'female' ? pair.explanationMaleToFemale : pair.explanationFemaleToMale;

    if (wrongPhrase === correctPhrase) continue;

    const regex = createArabicWordRegex(wrongPhrase);
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const matchIndex = match.index;
      const matchedText = match[0];

      // Avoid overlapping duplicates
      const alreadyReported = issues.some(
        (iss) =>
          iss.category === 'gender_concordance' &&
          Math.abs(iss.startIndex - matchIndex) < 4 &&
          (iss.originalWord.includes(matchedText) || matchedText.includes(iss.originalWord))
      );

      if (!alreadyReported) {
        issues.push({
          id: `issue-gender-${fieldName}-${issues.length}-${matchIndex}`,
          fieldName: String(fieldName),
          fieldLabel,
          originalWord: matchedText,
          suggestedWord: correctPhrase,
          startIndex: matchIndex,
          endIndex: matchIndex + matchedText.length,
          contextSentence: getContextSnippet(text, matchIndex, matchedText.length),
          category: 'gender_concordance',
          categoryLabel: gender === 'female' ? 'تطابق التأنيث' : 'تطابق التذكير',
          severity: 'error',
          ruleExplanation: explanation,
        });
      }
    }

    corrected = replaceArabicPhrase(corrected, wrongPhrase, correctPhrase);
  }

  // 2. Check general Arabic spelling, grammar, and typography rules
  for (const rule of ARABIC_PROOFREADING_RULES) {
    let match: RegExpExecArray | null;
    const re = new RegExp(rule.pattern.source, rule.pattern.flags);

    while ((match = re.exec(text)) !== null) {
      const originalMatchedWord = match[0];
      let replacementStr = '';

      if (typeof rule.replacement === 'function') {
        replacementStr = rule.replacement(originalMatchedWord);
      } else {
        replacementStr = originalMatchedWord.replace(rule.pattern, rule.replacement);
      }

      if (originalMatchedWord !== replacementStr) {
        // Prevent duplicate issue registrations around the same index
        const exists = issues.some(
          (iss) => Math.abs(iss.startIndex - (match?.index || 0)) <= 2 && iss.originalWord === originalMatchedWord
        );

        if (!exists) {
          issues.push({
            id: `issue-${fieldName}-${issues.length}-${match.index}`,
            fieldName: String(fieldName),
            fieldLabel,
            originalWord: originalMatchedWord,
            suggestedWord: replacementStr,
            startIndex: match.index,
            endIndex: match.index + originalMatchedWord.length,
            contextSentence: getContextSnippet(text, match.index, originalMatchedWord.length),
            category: rule.category,
            categoryLabel: rule.categoryLabel,
            severity: rule.severity,
            ruleExplanation: rule.explanation,
          });
        }
      }
    }

    // Apply replacement to accumulated corrected string
    corrected = corrected.replace(rule.pattern, rule.replacement as any);
  }

  return {
    fieldName: String(fieldName),
    fieldLabel,
    originalText: text,
    correctedText: corrected,
    issues,
    isClean: issues.length === 0,
  };
}

/**
 * Extracts a surrounding snippet of context around an error index
 */
function getContextSnippet(fullText: string, startIndex: number, length: number): string {
  const margin = 24;
  const start = Math.max(0, startIndex - margin);
  const end = Math.min(fullText.length, startIndex + length + margin);
  const prefix = start > 0 ? '...' : '';
  const suffix = end < fullText.length ? '...' : '';
  return `${prefix}${fullText.substring(start, end)}${suffix}`;
}

/**
 * Full Certificate Proofreader Engine
 * Analyzes all primary textual fields of a certificate and returns structured diagnostics
 */
export function proofreadCertificate(data: CertificateData): CertificateProofreadResult {
  const gender: RecipientGender = data.recipientGender || 'male';

  const fieldsToCheck: { key: keyof CertificateData; label: string }[] = [
    { key: 'title', label: 'عنوان الشهادة الرئيسي' },
    { key: 'subtitle', label: 'العنوان الفرعي' },
    { key: 'recipientIntro', label: 'عبارة مقدمة التكريم' },
    { key: 'studentName', label: 'اسم الطالب / المكرم' },
    { key: 'grade', label: 'الصف أو المرحلة' },
    { key: 'subject', label: 'المادة / المجال' },
    { key: 'appreciationText', label: 'نص التقدير والشكر التفصيلي' },
    { key: 'poemOrQuote', label: 'بيت الشعر أو المقولة' },
    { key: 'badgeTitle', label: 'مسمى الوسام والشارة' },
    { key: 'schoolName', label: 'اسم المدرسة / المؤسسة' },
  ];

  const results: Record<string, FieldProofreadResult> = {};
  let totalIssuesCount = 0;
  let errorsCount = 0;
  let warningsCount = 0;
  let suggestionsCount = 0;
  let genderIssuesCount = 0;

  const correctedData: CertificateData = { ...data };

  for (const field of fieldsToCheck) {
    const rawVal = String(data[field.key] || '');
    const fieldRes = proofreadTextField(rawVal, field.key, field.label, gender);
    results[field.key] = fieldRes;

    totalIssuesCount += fieldRes.issues.length;
    for (const iss of fieldRes.issues) {
      if (iss.category === 'gender_concordance') {
        genderIssuesCount++;
      }
      if (iss.severity === 'error') errorsCount++;
      else if (iss.severity === 'warning') warningsCount++;
      else suggestionsCount++;
    }

    if (fieldRes.correctedText !== rawVal) {
      (correctedData as any)[field.key] = fieldRes.correctedText;
    }
  }

  // Calculate quality & linguistic health score (0 - 100)
  let score = 100 - (errorsCount * 8 + warningsCount * 4 + suggestionsCount * 2);
  score = Math.max(25, Math.min(100, score));
  if (totalIssuesCount === 0) score = 100;

  return {
    fields: results,
    totalIssues: totalIssuesCount,
    totalIssuesCount,
    errorsCount,
    warningsCount,
    suggestionsCount,
    genderIssuesCount,
    score,
    hasIssues: totalIssuesCount > 0,
    correctedCertificate: correctedData,
  };
}

/**
 * Apply a specific single issue correction to a certificate object safely
 */
export function applySingleProofreadFix(
  cert: CertificateData,
  issue: ProofreadIssue
): CertificateData {
  const fieldKey = issue.fieldName as keyof CertificateData;
  const currentVal = String((cert as any)[fieldKey] || '');
  if (!currentVal) return cert;

  let updatedVal = currentVal;

  // Strategy 1: Position-based exact replacement if indices match
  if (
    typeof issue.startIndex === 'number' &&
    typeof issue.endIndex === 'number' &&
    issue.startIndex >= 0 &&
    issue.endIndex <= currentVal.length &&
    issue.startIndex < issue.endIndex
  ) {
    const sub = currentVal.substring(issue.startIndex, issue.endIndex);
    if (sub === issue.originalWord || sub.trim() === issue.originalWord.trim()) {
      updatedVal =
        currentVal.substring(0, issue.startIndex) +
        issue.suggestedWord +
        currentVal.substring(issue.endIndex);
    }
  }

  // Strategy 2: Whole-word boundary regex replacement with fresh lastIndex
  if (updatedVal === currentVal) {
    const wordRegexNonGlobal = createArabicWordRegex(issue.originalWord, '');
    if (wordRegexNonGlobal.test(currentVal)) {
      const wordRegexGlobal = createArabicWordRegex(issue.originalWord, 'g');
      wordRegexGlobal.lastIndex = 0;
      updatedVal = currentVal.replace(wordRegexGlobal, issue.suggestedWord);
    }
  }

  // Strategy 3: Global substring fallback
  if (updatedVal === currentVal && currentVal.includes(issue.originalWord)) {
    updatedVal = currentVal.split(issue.originalWord).join(issue.suggestedWord);
  }

  return {
    ...cert,
    [fieldKey]: updatedVal,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Apply all suggested proofreading fixes at once to a certificate object
 */
export function applyAllProofreadFixes(
  cert: CertificateData,
  proofreadResult: CertificateProofreadResult
): CertificateData {
  const updated: CertificateData = {
    ...cert,
    updatedAt: new Date().toISOString(),
  };

  if (proofreadResult?.fields) {
    Object.entries(proofreadResult.fields).forEach(([fieldName, fieldRes]) => {
      if (fieldRes && typeof fieldRes.correctedText === 'string' && fieldRes.correctedText.trim()) {
        (updated as any)[fieldName] = fieldRes.correctedText;
      }
    });
  } else if (proofreadResult?.correctedCertificate) {
    Object.assign(updated, proofreadResult.correctedCertificate);
  }

  return updated;
}
