import { CertificateData } from '../types';
import { RecipientGender } from './genderConverter';

export type IssueCategory = 
  | 'hamza' // همزات الوصل والقطع
  | 'taa_marbuta' // التاء المربوطة والهاء
  | 'alif_maqsura' // الألف المقصورة والياء
  | 'tanween' // التنوين
  | 'punctuation' // علامات الترقيم والمسافات
  | 'gender_concordance' // تطابق التذكير والتأنيث
  | 'common_typo' // أخطاء شائعة وأسلوبية
  | 'stylistic'; // تحسينات بلاغية

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
  score: number; // 0 to 100
  hasIssues: boolean;
  correctedCertificate: CertificateData;
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

const ARABIC_PROOFREADING_RULES: RuleDefinition[] = [
  // 1. همزات القطع والوصل الشائعة في الشهادات
  {
    pattern: /\bاكرام\b/g,
    replacement: 'إكرام',
    category: 'hamza',
    categoryLabel: 'همزة قطع',
    severity: 'error',
    explanation: 'همزة "إكرام" مكسورة همزة قطع (مصدر الفعل الرباعي أكرم).',
  },
  {
    pattern: /\bانجاز\b/g,
    replacement: 'إنجاز',
    category: 'hamza',
    categoryLabel: 'همزة قطع',
    severity: 'error',
    explanation: 'همزة "إنجاز" مكسورة همزة قطع (مصدر الفعل الرباعي أنجز).',
  },
  {
    pattern: /\bانجازات\b/g,
    replacement: 'إنجازات',
    category: 'hamza',
    categoryLabel: 'همزة قطع',
    severity: 'error',
    explanation: 'همزة "إنجازات" همزة قطع.',
  },
  {
    pattern: /\bانجازاتها\b/g,
    replacement: 'إنجازاتها',
    category: 'hamza',
    categoryLabel: 'همزة قطع',
    severity: 'error',
    explanation: 'همزة "إنجازاتها" همزة قطع.',
  },
  {
    pattern: /\bانجازاته\b/g,
    replacement: 'إنجازاته',
    category: 'hamza',
    categoryLabel: 'همزة قطع',
    severity: 'error',
    explanation: 'همزة "إنجازاته" همزة قطع.',
  },
  {
    pattern: /\bابداع\b/g,
    replacement: 'إبداع',
    category: 'hamza',
    categoryLabel: 'همزة قطع',
    severity: 'error',
    explanation: 'همزة "إبداع" همزة قطع (مصدر أبدع).',
  },
  {
    pattern: /\bابداعه\b/g,
    replacement: 'إبداعه',
    category: 'hamza',
    categoryLabel: 'همزة قطع',
    severity: 'error',
    explanation: 'همزة "إبداعه" همزة قطع.',
  },
  {
    pattern: /\bابداعها\b/g,
    replacement: 'إبداعها',
    category: 'hamza',
    categoryLabel: 'همزة قطع',
    severity: 'error',
    explanation: 'همزة "إبداعها" همزة قطع.',
  },
  {
    pattern: /\bابداعات\b/g,
    replacement: 'إبداعات',
    category: 'hamza',
    categoryLabel: 'همزة قطع',
    severity: 'error',
    explanation: 'همزة "إبداعات" همزة قطع.',
  },
  {
    pattern: /\bاتقان\b/g,
    replacement: 'إتقان',
    category: 'hamza',
    categoryLabel: 'همزة قطع',
    severity: 'error',
    explanation: 'همزة "إتقان" همزة قطع (مصدر أتقن).',
  },
  {
    pattern: /\bاتقانه\b/g,
    replacement: 'إتقانه',
    category: 'hamza',
    categoryLabel: 'همزة قطع',
    severity: 'error',
    explanation: 'همزة "إتقانه" همزة قطع.',
  },
  {
    pattern: /\bاتقانها\b/g,
    replacement: 'إتقانها',
    category: 'hamza',
    categoryLabel: 'همزة قطع',
    severity: 'error',
    explanation: 'همزة "إتقانها" همزة قطع.',
  },
  {
    pattern: /\bاخلاص\b/g,
    replacement: 'إخلاص',
    category: 'hamza',
    categoryLabel: 'همزة قطع',
    severity: 'error',
    explanation: 'همزة "إخلاص" همزة قطع (مصدر أخلص).',
  },
  {
    pattern: /\bاخلاصه\b/g,
    replacement: 'إخلاصه',
    category: 'hamza',
    categoryLabel: 'همزة قطع',
    severity: 'error',
    explanation: 'همزة "إخلاصه" همزة قطع.',
  },
  {
    pattern: /\bاخلاصها\b/g,
    replacement: 'إخلاصها',
    category: 'hamza',
    categoryLabel: 'همزة قطع',
    severity: 'error',
    explanation: 'همزة "إخلاصها" همزة قطع.',
  },
  {
    pattern: /\bادارة\b/g,
    replacement: 'إدارة',
    category: 'hamza',
    categoryLabel: 'همزة قطع',
    severity: 'error',
    explanation: 'همزة "إدارة" همزة قطع مكسورة.',
  },
  {
    pattern: /\bالادارة\b/g,
    replacement: 'الإدارة',
    category: 'hamza',
    categoryLabel: 'همزة قطع',
    severity: 'error',
    explanation: 'همزة "الإدارة" همزة قطع بعد ال التعريف.',
  },
  {
    pattern: /\bاشادة\b/g,
    replacement: 'إشادة',
    category: 'hamza',
    categoryLabel: 'همزة قطع',
    severity: 'error',
    explanation: 'همزة "إشادة" همزة قطع مكسورة.',
  },
  {
    pattern: /\bاشادةً\b/g,
    replacement: 'إشادةً',
    category: 'hamza',
    categoryLabel: 'همزة قطع',
    severity: 'error',
    explanation: 'همزة "إشادةً" همزة قطع.',
  },
  {
    pattern: /\bاهداء\b/g,
    replacement: 'إهداء',
    category: 'hamza',
    categoryLabel: 'همزة قطع',
    severity: 'error',
    explanation: 'همزة "إهداء" همزة قطع مكسورة.',
  },
  {
    pattern: /\bالي\b/g,
    replacement: 'إلى',
    category: 'hamza',
    categoryLabel: 'همزة قطع وحرف جر',
    severity: 'error',
    explanation: 'حرف الجر "إلى" يبدأ بهمزة قطع مكسورة وينتهي بألف مقصورة.',
  },
  {
    pattern: /\bاليها\b/g,
    replacement: 'إليها',
    category: 'hamza',
    categoryLabel: 'همزة قطع',
    severity: 'error',
    explanation: 'تكتب "إليها" بهمزة قطع مكسورة.',
  },
  {
    pattern: /\bاليه\b/g,
    replacement: 'إليه',
    category: 'hamza',
    categoryLabel: 'همزة قطع',
    severity: 'error',
    explanation: 'تكتب "إليه" بهمزة قطع مكسورة.',
  },
  {
    pattern: /\bان\b/g,
    replacement: 'أن',
    category: 'hamza',
    categoryLabel: 'همزة قطع',
    severity: 'warning',
    explanation: 'تكتب الحروف الناسخة والمصدرية "أنْ / إنّ" بهمزة قطع.',
  },
  {
    pattern: /\bاكثر\b/g,
    replacement: 'أكثر',
    category: 'hamza',
    categoryLabel: 'همزة قطع',
    severity: 'error',
    explanation: 'اسم التفضيل "أكثر" يبدأ بهمزة قطع مفتوحة.',
  },
  {
    pattern: /\bاسمى\b/g,
    replacement: 'أسمى',
    category: 'hamza',
    categoryLabel: 'همزة قطع',
    severity: 'error',
    explanation: 'اسم التفضيل "أسمى" يبدأ بهمزة قطع مفتوحة وينتهي بألف مقصورة.',
  },
  {
    pattern: /\bارقى\b/g,
    replacement: 'أرقى',
    category: 'hamza',
    categoryLabel: 'همزة قطع',
    severity: 'error',
    explanation: 'اسم التفضيل "أرقى" يبدأ بهمزة قطع مفتوحة.',
  },
  {
    pattern: /\bاجمل\b/g,
    replacement: 'أجمل',
    category: 'hamza',
    categoryLabel: 'همزة قطع',
    severity: 'error',
    explanation: 'اسم التفضيل "أجمل" يبدأ بهمزة قطع مفتوحة.',
  },
  {
    pattern: /\bأستحقاق\b|\bإستحقاق\b/g,
    replacement: 'استحقاق',
    category: 'hamza',
    categoryLabel: 'همزة وصل',
    severity: 'error',
    explanation: 'كلمة "استحقاق" تبدأ بهمزة وصل (مصدر الفعل السداسي استحق).',
  },
  {
    pattern: /\bأستمرار\b|\bإستمرار\b/g,
    replacement: 'استمرار',
    category: 'hamza',
    categoryLabel: 'همزة وصل',
    severity: 'error',
    explanation: 'كلمة "استمرار" تبدأ بهمزة وصل (مصدر الفعل السداسي استمر).',
  },
  {
    pattern: /\bأجتهاد\b|\bإجتهاد\b/g,
    replacement: 'اجتهاد',
    category: 'hamza',
    categoryLabel: 'همزة وصل',
    severity: 'error',
    explanation: 'كلمة "اجتهاد" تبدأ بهمزة وصل (مصدر الفعل الخماسي اجتهد).',
  },
  {
    pattern: /\bأجتهاده\b|\bإجتهاده\b/g,
    replacement: 'اجتهاده',
    category: 'hamza',
    categoryLabel: 'همزة وصل',
    severity: 'error',
    explanation: 'كلمة "اجتهاده" تبدأ بهمزة وصل.',
  },
  {
    pattern: /\bأجتهادها\b|\bإجتهادها\b/g,
    replacement: 'اجتهادها',
    category: 'hamza',
    categoryLabel: 'همزة وصل',
    severity: 'error',
    explanation: 'كلمة "اجتهادها" تبدأ بهمزة وصل.',
  },
  {
    pattern: /\bأهتمام\b|\bإهتمام\b/g,
    replacement: 'اهتمام',
    category: 'hamza',
    categoryLabel: 'همزة وصل',
    severity: 'error',
    explanation: 'كلمة "اهتمام" تبدأ بهمزة وصل (مصدر الفعل الخماسي اهتم).',
  },
  {
    pattern: /\bأنضباط\b|\bإنضباط\b/g,
    replacement: 'انضباط',
    category: 'hamza',
    categoryLabel: 'همزة وصل',
    severity: 'error',
    explanation: 'كلمة "انضباط" تبدأ بهمزة وصل (مصدر الفعل الخماسي انضبط).',
  },
  {
    pattern: /\bأنضباطه\b|\bإنضباطه\b/g,
    replacement: 'انضباطه',
    category: 'hamza',
    categoryLabel: 'همزة وصل',
    severity: 'error',
    explanation: 'كلمة "انضباطه" تبدأ بهمزة وصل.',
  },
  {
    pattern: /\bأنضباطها\b|\bإنضباطها\b/g,
    replacement: 'انضباطها',
    category: 'hamza',
    categoryLabel: 'همزة وصل',
    severity: 'error',
    explanation: 'كلمة "انضباطها" تبدأ بهمزة وصل.',
  },
  {
    pattern: /\bأسم\b|\bإسم\b/g,
    replacement: 'اسم',
    category: 'hamza',
    categoryLabel: 'همزة وصل',
    severity: 'error',
    explanation: 'كلمة "اسم" من الأسماء العشرة التي تبدأ بهمزة وصل.',
  },
  {
    pattern: /\bمسؤلية\b/g,
    replacement: 'مسؤولية',
    category: 'hamza',
    categoryLabel: 'رسم الهمزة المتوسطة',
    severity: 'warning',
    explanation: 'الرسم القياسي المعتمد للهمزة المضمومة بعد ساكن هو على واو "مسؤولية".',
  },
  {
    pattern: /\bشؤون\b|\bشئون\b/g,
    replacement: 'شؤون',
    category: 'hamza',
    categoryLabel: 'رسم الهمزة المتوسطة',
    severity: 'suggestion',
    explanation: 'الرسم الأفضل في المعاجم العربية هو "شؤون".',
  },

  // 2. التاء المربوطة والهاء
  {
    pattern: /\bالمدرسه\b/g,
    replacement: 'المدرسة',
    category: 'taa_marbuta',
    categoryLabel: 'تاء مربوطة',
    severity: 'error',
    explanation: 'تنتهي كلمة "المدرسة" بتاء مربوطة منقوطة (تنطق تاء عند الوصل وهاء عند الوقف).',
  },
  {
    pattern: /\bمدرسه\b/g,
    replacement: 'مدرسة',
    category: 'taa_marbuta',
    categoryLabel: 'تاء مربوطة',
    severity: 'error',
    explanation: 'تنتهي كلمة "مدرسة" بتاء مربوطة منقوطة.',
  },
  {
    pattern: /\bشهاده\b/g,
    replacement: 'شهادة',
    category: 'taa_marbuta',
    categoryLabel: 'تاء مربوطة',
    severity: 'error',
    explanation: 'تنتهي كلمة "شهادة" بتاء مربوطة منقوطة.',
  },
  {
    pattern: /\bالمتميزه\b/g,
    replacement: 'المتميزة',
    category: 'taa_marbuta',
    categoryLabel: 'تاء مربوطة',
    severity: 'error',
    explanation: 'تنتهي كلمة "المتميزة" بتاء مربوطة منقوطة.',
  },
  {
    pattern: /\bمتميزه\b/g,
    replacement: 'متميزة',
    category: 'taa_marbuta',
    categoryLabel: 'تاء مربوطة',
    severity: 'error',
    explanation: 'تنتهي كلمة "متميزة" بتاء مربوطة منقوطة.',
  },
  {
    pattern: /\bالمتفوقه\b/g,
    replacement: 'المتفوقة',
    category: 'taa_marbuta',
    categoryLabel: 'تاء مربوطة',
    severity: 'error',
    explanation: 'تنتهي كلمة "المتفوقة" بتاء مربوطة منقوطة.',
  },
  {
    pattern: /\bمتفوقه\b/g,
    replacement: 'متفوقة',
    category: 'taa_marbuta',
    categoryLabel: 'تاء مربوطة',
    severity: 'error',
    explanation: 'تنتهي كلمة "متفوقة" بتاء مربوطة منقوطة.',
  },
  {
    pattern: /\bالمبدعه\b/g,
    replacement: 'المبدعة',
    category: 'taa_marbuta',
    categoryLabel: 'تاء مربوطة',
    severity: 'error',
    explanation: 'تنتهي كلمة "المبدعة" بتاء مربوطة منقوطة.',
  },
  {
    pattern: /\bمبدعه\b/g,
    replacement: 'مبدعة',
    category: 'taa_marbuta',
    categoryLabel: 'تاء مربوطة',
    severity: 'error',
    explanation: 'تنتهي كلمة "مبدعة" بتاء مربوطة منقوطة.',
  },
  {
    pattern: /\bالطالبه\b/g,
    replacement: 'الطالبة',
    category: 'taa_marbuta',
    categoryLabel: 'تاء مربوطة',
    severity: 'error',
    explanation: 'تنتهي كلمة "الطالبة" بتاء مربوطة منقوطة.',
  },
  {
    pattern: /\bطالبه\b/g,
    replacement: 'طالبة',
    category: 'taa_marbuta',
    categoryLabel: 'تاء مربوطة',
    severity: 'error',
    explanation: 'تنتهي كلمة "طالبة" بتاء مربوطة منقوطة.',
  },
  {
    pattern: /\bالمعلمه\b/g,
    replacement: 'المعلمة',
    category: 'taa_marbuta',
    categoryLabel: 'تاء مربوطة',
    severity: 'error',
    explanation: 'تنتهي كلمة "المعلمة" بتاء مربوطة منقوطة.',
  },
  {
    pattern: /\bمعلمه\b/g,
    replacement: 'معلمة',
    category: 'taa_marbuta',
    categoryLabel: 'تاء مربوطة',
    severity: 'error',
    explanation: 'تنتهي كلمة "معلمة" بتاء مربوطة منقوطة.',
  },
  {
    pattern: /\bالمثاليه\b/g,
    replacement: 'المثالية',
    category: 'taa_marbuta',
    categoryLabel: 'تاء مربوطة',
    severity: 'error',
    explanation: 'تنتهي كلمة "المثالية" بتاء مربوطة منقوطة.',
  },
  {
    pattern: /\bاللة\b/g,
    replacement: 'الله',
    category: 'taa_marbuta',
    categoryLabel: 'هاء الضمير ولفظ الجلالة',
    severity: 'error',
    explanation: 'لفظ الجلالة "الله" ينتهي بهاء أصلية غير منقوطة.',
  },
  {
    pattern: /\bجهودة\b/g,
    replacement: 'جهوده',
    category: 'taa_marbuta',
    categoryLabel: 'هاء الغائب',
    severity: 'error',
    explanation: 'كلمة "جهوده" متصلة بهاء الغائب غير المنقوطة.',
  },
  {
    pattern: /\bتفوقة\b/g,
    replacement: 'تفوقه',
    category: 'taa_marbuta',
    categoryLabel: 'هاء الغائب',
    severity: 'error',
    explanation: 'كلمة "تفوقه" متصلة بهاء الغائب غير المنقوطة.',
  },
  {
    pattern: /\bاخلاقة\b/g,
    replacement: 'أخلاقه',
    category: 'taa_marbuta',
    categoryLabel: 'هاء الغائب وهمزة قطع',
    severity: 'error',
    explanation: 'تكتب "أخلاقه" بهمزة قطع مفتوحة وتنتهي بهاء الغائب.',
  },

  // 3. الألف المقصورة والياء
  {
    pattern: /\bعلي\b(?=\s+[\u0621-\u064A])/g,
    replacement: 'على',
    category: 'alif_maqsura',
    categoryLabel: 'حرف جر وألف مقصورة',
    severity: 'warning',
    explanation: 'حرف الجر يكتب بالألف المقصورة "على" (ما لم يكن اسماً لشخص مثل عليّ).',
  },
  {
    pattern: /\bفى\b/g,
    replacement: 'في',
    category: 'alif_maqsura',
    categoryLabel: 'حرف جر وياء',
    severity: 'error',
    explanation: 'حرف الجر "في" ينتهي بياء منقوطة.',
  },
  {
    pattern: /\bالمولي\b/g,
    replacement: 'المولى',
    category: 'alif_maqsura',
    categoryLabel: 'ألف مقصورة',
    severity: 'error',
    explanation: 'تكتب "المولى" بألف مقصورة.',
  },
  {
    pattern: /\bمولي\b/g,
    replacement: 'مولى',
    category: 'alif_maqsura',
    categoryLabel: 'ألف مقصورة',
    severity: 'error',
    explanation: 'تكتب "مولى" بألف مقصورة.',
  },
  {
    pattern: /\bالهدي\b/g,
    replacement: 'الهدى',
    category: 'alif_maqsura',
    categoryLabel: 'ألف مقصورة',
    severity: 'error',
    explanation: 'تكتب "الهدى" بألف مقصورة.',
  },
  {
    pattern: /\bالعلي\b(?=\s+القدير)/g,
    replacement: 'العلي',
    category: 'alif_maqsura',
    categoryLabel: 'ياء منقوطة',
    severity: 'suggestion',
    explanation: 'اسم الله "العليّ" ينتهي بياء منقوطة.',
  },

  // 4. التنوين والأخطاء الإملائية الشائعة بالننون
  {
    pattern: /\bشكرن\b/g,
    replacement: 'شكراً',
    category: 'tanween',
    categoryLabel: 'تنوين نصب',
    severity: 'error',
    explanation: 'تنوين النصب في "شكراً" يكتب فتحتين على ألف وليس نوناً.',
  },
  {
    pattern: /\bتقديرن\b/g,
    replacement: 'تقديراً',
    category: 'tanween',
    categoryLabel: 'تنوين نصب',
    severity: 'error',
    explanation: 'تنوين النصب في "تقديراً" يكتب فتحتين على ألف وليس نوناً.',
  },
  {
    pattern: /\bايضن\b|\bايضا\b/g,
    replacement: 'أيضاً',
    category: 'tanween',
    categoryLabel: 'تنوين وهمزة قطع',
    severity: 'error',
    explanation: 'تكتب "أيضاً" بهمزة قطع وتنوين نصب.',
  },
  {
    pattern: /\bدائمن\b|\bدائما\b/g,
    replacement: 'دائماً',
    category: 'tanween',
    categoryLabel: 'تنوين نصب',
    severity: 'error',
    explanation: 'تكتب "دائماً" بتنوين نصب.',
  },
  {
    pattern: /\bمستمرن\b/g,
    replacement: 'مستمراً',
    category: 'tanween',
    categoryLabel: 'تنوين نصب',
    severity: 'error',
    explanation: 'تكتب "مستمراً" بتنوين نصب على الألف.',
  },

  // 5. الأخطاء اللغوية والأسلوبية الشهيرة في شهادات التقدير
  {
    pattern: /\bمبروك\b/g,
    replacement: 'مبارك',
    category: 'common_typo',
    categoryLabel: 'صحة التعبير اللغوي',
    severity: 'warning',
    explanation: 'الأصح لغوياً قول "مبارك" (من بارك) بدلاً من "مبروك" (من بَرَكَ الجَمَل).',
  },
  {
    pattern: /\bالف مبروك\b|\bألف مبروك\b/g,
    replacement: 'ألف مبارك',
    category: 'common_typo',
    categoryLabel: 'صحة التعبير اللغوي',
    severity: 'warning',
    explanation: 'الصواب البلاغي هو "ألف مبارك".',
  },
  {
    pattern: /\bإنشاء الله\b/g,
    replacement: 'إن شاء الله',
    category: 'common_typo',
    categoryLabel: 'صحة التعبير العقدي واللغوي',
    severity: 'error',
    explanation: 'تكتب المشيئة منفصلة "إن شاء الله" لأن "إنشاء" تعني الخلق والبناء.',
  },
  {
    pattern: /\bكافة الطلاب\b/g,
    replacement: 'الطلاب كافةً',
    category: 'stylistic',
    categoryLabel: 'بلاغة وفصاحة',
    severity: 'suggestion',
    explanation: 'كلمة "كافة" الأفضل فصاحةً أن تأتي حالاً في آخر الكلام (مثل: الطلاب كافةً).',
  },

  // 6. علامات الترقيم والمسافات الزائدة
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
    pattern: /\s+و(?=[\u0621-\u064A])/g,
    replacement: ' و',
    category: 'punctuation',
    categoryLabel: 'واو العطف',
    severity: 'suggestion',
    explanation: 'واو العطف في العربية تتصل بما بعدها دون مسافة فاصلة بين الواو والكلمة التالية (مثال: "والتفوق" وليس "و التفوق").',
  },
  {
    pattern: /\bو\s+([\u0621-\u064A])/g,
    replacement: 'و$1',
    category: 'punctuation',
    categoryLabel: 'واو العطف',
    severity: 'warning',
    explanation: 'في قواعد الخط والإملاء العربي تتصل واو العطف مباشرة بالكلمة المعطوفة: مثل "والإبداع" وليس "و الإبداع".',
  },
];

/**
 * Proofreads a single text field against grammatical, spelling, and stylistic rules
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

  // 1. Check specific gender discordance if applicable
  if (gender === 'female') {
    // Female recipient specific grammar checks
    const femaleDiscordances = [
      {
        pattern: /\bالطالب المتميز\b/g,
        suggest: 'الطالبة المتميزة',
        rule: 'تطابق التأنيث: الطالبة المتميزة'
      },
      {
        pattern: /\bالطالب المتفوق\b/g,
        suggest: 'الطالبة المتفوقة',
        rule: 'تطابق التأنيث: الطالبة المتفوقة'
      },
      {
        pattern: /\bالطالب المبدع\b/g,
        suggest: 'الطالبة المبدعة',
        rule: 'تطابق التأنيث: الطالبة المبدعة'
      },
      {
        pattern: /\bلجهوده المتميزة\b/g,
        suggest: 'لجهودها المتميزة',
        rule: 'ضمير المؤنث: لجهودها المتميزة'
      },
      {
        pattern: /\bلتفوقه المشهود\b/g,
        suggest: 'لتفوقها المشهود',
        rule: 'ضمير المؤنث: لتفوقها المشهود'
      },
      {
        pattern: /\bإبداعه المستمر\b/g,
        suggest: 'إبداعها المستمر',
        rule: 'ضمير المؤنث: إبداعها المستمر'
      },
      {
        pattern: /\bسائلين المولى له\b/g,
        suggest: 'سائلين المولى لها',
        rule: 'ضمير المؤنث: سائلين المولى لها'
      },
      {
        pattern: /\bيزيده توفيقاً\b/g,
        suggest: 'يزيدها توفيقاً',
        rule: 'ضمير المؤنث: يزيدها توفيقاً'
      },
      {
        pattern: /\bدمت كوكباً\b/g,
        suggest: 'دمتِ شعلةً',
        rule: 'مخاطبة المؤنث: دمتِ شعلةً'
      },
      {
        pattern: /\bفارس التميز\b/g,
        suggest: 'فارسة التميز',
        rule: 'لقب المؤنث: فارسة التميز'
      },
    ];

    for (const item of femaleDiscordances) {
      let match: RegExpExecArray | null;
      const re = new RegExp(item.pattern.source, 'g');
      while ((match = re.exec(text)) !== null) {
        issues.push({
          id: `issue-${fieldName}-${issues.length}-${Date.now()}`,
          fieldName: String(fieldName),
          fieldLabel,
          originalWord: match[0],
          suggestedWord: item.suggest,
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          contextSentence: getContextSnippet(text, match.index, match[0].length),
          category: 'gender_concordance',
          categoryLabel: 'تطابق التأنيث',
          severity: 'error',
          ruleExplanation: item.rule,
        });
      }
      corrected = corrected.replace(item.pattern, item.suggest);
    }
  } else if (gender === 'male') {
    // Male recipient specific grammar checks
    const maleDiscordances = [
      {
        pattern: /\bالطالبة المتميزة\b/g,
        suggest: 'الطالب المتميز',
        rule: 'تطابق التذكير: الطالب المتميز'
      },
      {
        pattern: /\bالطالبة المتفوقة\b/g,
        suggest: 'الطالب المتفوق',
        rule: 'تطابق التذكير: الطالب المتفوق'
      },
      {
        pattern: /\bالطالبة المبدعة\b/g,
        suggest: 'الطالب المبدع',
        rule: 'تطابق التذكير: الطالب المبدع'
      },
      {
        pattern: /\bلجهودها المتميزة\b/g,
        suggest: 'لجهوده المتميزة',
        rule: 'ضمير المذكر: لجهوده المتميزة'
      },
      {
        pattern: /\bلتفوقها المشهود\b/g,
        suggest: 'لتفوقه المشهود',
        rule: 'ضمير المذكر: لتفوقه المشهود'
      },
      {
        pattern: /\bإبداعها المستمر\b/g,
        suggest: 'إبداعه المستمر',
        rule: 'ضمير المذكر: إبداعه المستمر'
      },
      {
        pattern: /\bسائلين المولى لها\b/g,
        suggest: 'سائلين المولى له',
        rule: 'ضمير المذكر: سائلين المولى له'
      },
      {
        pattern: /\bيزيدها توفيقاً\b/g,
        suggest: 'يزيده توفيقاً',
        rule: 'ضمير المذكر: يزيده توفيقاً'
      },
      {
        pattern: /\bدمتِ شعلة\b/g,
        suggest: 'دمت كوكباً',
        rule: 'مخاطبة المذكر: دمت كوكباً'
      },
      {
        pattern: /\bنجمة التميز\b/g,
        suggest: 'فارس التميز',
        rule: 'لقب المذكر: فارس التميز'
      },
    ];

    for (const item of maleDiscordances) {
      let match: RegExpExecArray | null;
      const re = new RegExp(item.pattern.source, 'g');
      while ((match = re.exec(text)) !== null) {
        issues.push({
          id: `issue-${fieldName}-${issues.length}-${Date.now()}`,
          fieldName: String(fieldName),
          fieldLabel,
          originalWord: match[0],
          suggestedWord: item.suggest,
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          contextSentence: getContextSnippet(text, match.index, match[0].length),
          category: 'gender_concordance',
          categoryLabel: 'تطابق التذكير',
          severity: 'error',
          ruleExplanation: item.rule,
        });
      }
      corrected = corrected.replace(item.pattern, item.suggest);
    }
  }

  // 2. Check general Arabic rules
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
        // Prevent duplicate issue registrations
        const exists = issues.some(
          (iss) => Math.abs(iss.startIndex - (match?.index || 0)) <= 2 && iss.originalWord === originalMatchedWord
        );

        if (!exists) {
          issues.push({
            id: `issue-${fieldName}-${issues.length}-${Date.now()}`,
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

  const correctedData: CertificateData = { ...data };

  for (const field of fieldsToCheck) {
    const rawVal = String(data[field.key] || '');
    const fieldRes = proofreadTextField(rawVal, field.key, field.label, gender);
    results[field.key] = fieldRes;

    totalIssuesCount += fieldRes.issues.length;
    for (const iss of fieldRes.issues) {
      if (iss.severity === 'error') errorsCount++;
      else if (iss.severity === 'warning') warningsCount++;
      else suggestionsCount++;
    }

    if (fieldRes.correctedText !== rawVal) {
      (correctedData as any)[field.key] = fieldRes.correctedText;
    }
  }

  // Calculate quality & linguistic health score (0 - 100)
  // Max deductions: error = -12, warning = -6, suggestion = -2
  let score = 100 - (errorsCount * 12 + warningsCount * 6 + suggestionsCount * 2);
  score = Math.max(25, Math.min(100, score));
  if (totalIssuesCount === 0) score = 100;

  return {
    fields: results,
    totalIssues: totalIssuesCount,
    totalIssuesCount,
    errorsCount,
    warningsCount,
    suggestionsCount,
    score,
    hasIssues: totalIssuesCount > 0,
    correctedCertificate: correctedData,
  };
}

/**
 * Apply a specific single issue correction to a certificate object
 */
export function applySingleProofreadFix(
  cert: CertificateData,
  issue: ProofreadIssue
): CertificateData {
  const currentVal = String((cert as any)[issue.fieldName] || '');
  if (!currentVal) return cert;

  // Replace target word safely
  const updatedVal = currentVal.replace(issue.originalWord, issue.suggestedWord);

  return {
    ...cert,
    [issue.fieldName]: updatedVal,
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
  return {
    ...proofreadResult.correctedCertificate,
    updatedAt: new Date().toISOString(),
  };
}
