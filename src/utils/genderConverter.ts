import { CertificateData } from '../types';

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

/**
 * Converts Arabic phrasing locally (Full Regex Engine)
 */
export function convertArabicTextGender(text: string, targetGender: RecipientGender): string {
  if (!text || typeof text !== 'string') return text;

  let result = text;

  if (targetGender === 'female') {
    // Normalization of common slashes (e.g. الطالب/ـة -> الطالبة)
    result = result.replace(/الطالب[\/ـ_-]+[ةه]/g, 'الطالبة');
    result = result.replace(/طالب[\/ـ_-]+[ةه]/g, 'طالبة');
    result = result.replace(/الأستاذ[\/ـ_-]+[ةه]/g, 'الأستاذة');
    result = result.replace(/المبدع[\/ـ_-]+[ةه]/g, 'المبدعة');
    result = result.replace(/المتطوع[\/ـ_-]+[ةه]/g, 'المتطوعة');
    result = result.replace(/المتفوق[\/ـ_-]+[ةه]/g, 'المتفوقة');
    result = result.replace(/المتميز[\/ـ_-]+[ةه]/g, 'المتميزة');
    result = result.replace(/المجتهد[\/ـ_-]+[ةه]/g, 'المجتهدة');

    const phraseMapFemale: [RegExp, string][] = [
      // Surnames / Kinship
      [/\bعبد الله بن\b/g, 'فاطمة بنت'],
      [/\b بن \b/g, ' بنت '],
      
      // Intros & Direct Honors
      [/\bللطالب المبدع\b/g, 'للطالبة المبدعة'],
      [/\bللطالب الخلوق\b/g, 'للطالبة الخلوقة'],
      [/\bللطالب المبارك\b/g, 'للطالبة المباركة'],
      [/\bللطالب المتميز\b/g, 'للطالبة المتميزة'],
      [/\bللطالب المتفوق\b/g, 'للطالبة المتفوقة'],
      [/\bللطالب المجتهد\b/g, 'للطالبة المجتهدة'],
      [/\bللطالب المتقن\b/g, 'للطالبة المتقنة'],
      [/\bللطالب الحافظ\b/g, 'للطالبة الحافظة'],
      [/\bللطالب الفائز\b/g, 'للطالبة الفائزة'],
      [/\bللطالب النجيب\b/g, 'للطالبة النجيبة'],
      [/\bللطالب المثالي\b/g, 'للطالبة المثالية'],
      [/\bللطالب\b/g, 'للطالبة'],
      [/\bبأن الطالب\b/g, 'بأن الطالبة'],
      [/\bبأن الأستاذ\b/g, 'بأن الأستاذة'],
      [/\bللقيادي الواعد\b/g, 'للقيادية الواعدة'],
      [/\bللمبتكر الرقمي\b/g, 'للمبتكرة الرقمية'],
      [/\bللأستاذ القدير\b/g, 'للأستاذة القديرة'],
      [/\bلبطلنا الصغير المبدع\b/g, 'لبطلتنا الصغيرة المبدعة'],
      [/\bلبطلنا الصغير\b/g, 'لبطلتنا الصغيرة'],
      [/\bللفارس اللغوي\b/g, 'للفارسة اللغوية'],
      [/\bللمتطوع المبدع\b/g, 'للمتطوعة المبدعة'],
      [/\bللبطل الرياضي الاستثنائي\b/g, 'للبطلة الرياضية الاستثنائية'],
      [/\bللبطل الرياضي\b/g, 'للبطلة الرياضية'],
      [/\bللسفير البيئي\b/g, 'للسفيرة البيئية'],
      [/\bللمطور العبقري\b/g, 'للمطورة العبقرية'],
      [/\bبطلنا الصغير\b/g, 'بطلتنا الصغيرة'],
      [/\bبطلنا\b/g, 'بطلتنا'],
      [/\bنجمنا\b/g, 'نجمتنا'],
      [/\bفارسنا\b/g, 'فارستنا'],
      [/\bطالب متميز\b/g, 'طالبة متميزة'],
      [/\bطالب متفوق\b/g, 'طالبة متفوقة'],
      [/\bطالب مجتهد\b/g, 'طالبة مجتهدة'],
      [/\bطالب خلوق\b/g, 'طالبة خلوقة'],
      [/\bطالب مبدع\b/g, 'طالبة مبدعة'],
      [/\bقائد مستقبلي\b/g, 'قائدة مستقبلية'],
      [/\bمبتكر واعد\b/g, 'مبتكرة واعدة'],
      [/\bبطل الموهبة\b/g, 'بطلة الموهبة'],
      [/\bسفير البيئة\b/g, 'سفيرة البيئة'],
      [/\bحافظ متقن\b/g, 'حافظة متقنة'],
      [/\bطالب العلم الصالح\b/g, 'طالبة العلم الصالحة'],
      [/\bشكرًا لك يا نجمنا\b/g, 'شكرًا لكِ يا نجمتنا'],

      // Badges and Titles
      [/\bوسام الطالب المتميز\b/g, 'وسام الطالبة المتميزة'],
      [/\bوسام الطالب المتفوق\b/g, 'وسام الطالبة المتفوقة'],
      [/\bوسام الطالب المثالي\b/g, 'وسام الطالبة المثالية'],
      [/\bوسام الطالب المبدع\b/g, 'وسام الطالبة المبدعة'],
      [/\bوسام الفارس\b/g, 'وسام الفارسة'],

      // Pronouns and Possessives
      [/\bسائلين الله له\b/g, 'سائلين الله لها'],
      [/\bسائلين المولى له\b/g, 'سائلين المولى لها'],
      [/\bداعين الله له\b/g, 'داعين الله لها'],
      [/\bمتمنين له\b/g, 'متمنين لها'],
      [/\bراجين له\b/g, 'راجين لها'],
      [/\bنرجو له\b/g, 'نرجو لها'],
      [/\bنتمنى له\b/g, 'نتمنى لها'],
      [/\bنتمنى لَه\b/g, 'نتمنى لها'],
      [/\bله دوام\b/g, 'لها دوام'],
      [/\bله مستقبلاً\b/g, 'لها مستقبلاً'],
      [/\bله التوفيق\b/g, 'لها التوفيق'],
      [/\bله النجاح\b/g, 'لها النجاح'],
      [/\bأن يوفقه\b/g, 'أن يوفقها'],
      [/\bأن يسدده\b/g, 'أن يسددها'],
      [/\bأن يبارك فيه\b/g, 'أن يبارك فيها'],
      [/\bأن يزيده\b/g, 'أن يزيدها'],
      [/\bأن ينفع به\b/g, 'أن ينفع بها'],
      [/\bأن يجعله\b/g, 'أن يجعلها'],
      [/\bليكون\b/g, 'لتكون'],
      [/\bنموذجاً يحتذى به\b/g, 'نموذجاً يُحتذى به'],

      // Nouns with Affixes (Pronouns)
      [/\bلسلوكه\b/g, 'لسلوكها'],
      [/\bسلوكه\b/g, 'سلوكها'],
      [/\bأخلاقه\b/g, 'أخلاقها'],
      [/\bزملائه\b/g, 'زميلاتها'],
      [/\bمعلميه\b/g, 'معلماتها'],
      [/\bأقرانه\b/g, 'قريناتها'],
      [/\bوالديه\b/g, 'والديها'],
      [/\bأهله\b/g, 'أهلها'],
      [/\bوطنه\b/g, 'وطنها'],
      [/\bمدرسته\b/g, 'مدرستها'],
      [/\bفصله\b/g, 'فصلها'],
      [/\bصفه\b/g, 'صفها'],
      [/\bوحرصه\b/g, 'وحرصها'],
      [/\bحرصه\b/g, 'حرصها'],
      [/\bمواظبته\b/g, 'مواظبتها'],
      [/\bانضباطه\b/g, 'انضباطها'],
      [/\bأبداه\b/g, 'أبدته'],
      [/\bأبداءه\b/g, 'أبدائها'],
      [/\bحصوله\b/g, 'حصولها'],
      [/\bتحصيله\b/g, 'تحصيلها'],
      [/\bتألقه\b/g, 'تألقها'],
      [/\bمشاركته\b/g, 'مشاركتها'],
      [/\bقيادته\b/g, 'قيادتها'],
      [/\bابتكاره\b/g, 'ابتكارها'],
      [/\bإبداعه\b/g, 'إبداعها'],
      [/\bعطائه\b/g, 'عطائها'],
      [/\bجهوده\b/g, 'جهودها'],
      [/\bتفانيه\b/g, 'تفانيها'],
      [/\bتحقيقه\b/g, 'تحقيقها'],
      [/\bتميزه\b/g, 'تميزها'],
      [/\bإتمامه\b/g, 'إتمامها'],
      [/\bإتقانه\b/g, 'إتقانها'],
      [/\bأدائه\b/g, 'أدائها'],
      [/\bإنجازه\b/g, 'إنجازها'],
      [/\bتفرده\b/g, 'تفردها'],
      [/\bتعاونه\b/g, 'تعاونها'],
      [/\bحفظه\b/g, 'حفظها'],
      [/\bتلاوته\b/g, 'تلاوتها'],
      [/\bفريقه\b/g, 'فريقها'],
      [/\bمسيرته\b/g, 'مسيرتها'],
      [/\bمستقبله\b/g, 'مستقبلها'],
      [/\bتفوقه\b/g, 'تفوقها'],
      [/\bاجتهاده\b/g, 'اجتهادها'],
      [/\bشغفه\b/g, 'شغفها'],
      [/\bطموحه\b/g, 'طموحها'],
      [/\bذكائه\b/g, 'ذكائها'],
      [/\bفهمه\b/g, 'فهمها'],
      [/\bنجاحه\b/g, 'نجاحها'],
      [/\bفوزه\b/g, 'فوزها'],
      [/\bحضوره\b/g, 'حضورها'],
      [/\bتفاعله\b/g, 'تفاعلها'],
      [/\bسعيه\b/g, 'سعيها'],

      // Verbs
      [/\bحقق\b/g, 'حققت'],
      [/\bأنجز\b/g, 'أنجزت'],
      [/\bأبدع\b/g, 'أبدعت'],
      [/\bأبدى\b/g, 'أبدت'],
      [/\bأظهر\b/g, 'أظهرت'],
      [/\bقدم\b/g, 'قدمت'],
      [/\bحصل\b/g, 'حصلت'],
      [/\bنال\b/g, 'نالت'],
      [/\bأحرز\b/g, 'أحرزت'],
      [/\bاجتاز\b/g, 'اجتازت'],
      [/\bشارك\b/g, 'شاركت'],
      [/\bساهم\b/g, 'ساهمت'],
      [/\bتميز\b/g, 'تميزت'],
      [/\bتألق\b/g, 'تألقت'],
      [/\bتفوق\b/g, 'تفوقت'],
      [/\bثابر\b/g, 'ثابرت'],
      [/\bواظب\b/g, 'واظبت'],
      [/\bحفظ\b/g, 'حفظت'],
      [/\bاستحق\b/g, 'استحقت'],
      [/\bاستوفى\b/g, 'استوفت'],
      [/\bأكمل\b/g, 'أكملت'],
      [/\bالذي يجسد\b/g, 'التي تجسد'],
      [/\bالذي أبهر\b/g, 'التي أبهرت'],
      [/\bالذي حقق\b/g, 'التي حققت'],

      // Direct Adjectives & Nouns
      [/\bالطالب\b/g, 'الطالبة'],
      [/\bطالب\b/g, 'طالبة'],
      [/\bالمتميز\b/g, 'المتميزة'],
      [/\bمتميز\b/g, 'متميزة'],
      [/\bالمتفوق\b/g, 'المتفوقة'],
      [/\bمتفوق\b/g, 'متفوقة'],
      [/\bالمجتهد\b/g, 'المجتهدة'],
      [/\bمجتهد\b/g, 'مجتهدة'],
      [/\bالخلوق\b/g, 'الخلوقة'],
      [/\bخلوق\b/g, 'خلوقة'],
      [/\bالمبدع\b/g, 'المبدعة'],
      [/\bمبدع\b/g, 'مبدعة'],
      [/\bالمبارك\b/g, 'المباركة'],
      [/\bمبارك\b/g, 'مباركة'],
      [/\bالمتقن\b/g, 'المتقنة'],
      [/\bمتقن\b/g, 'متقنة'],
      [/\bالنجيب\b/g, 'النجيبة'],
      [/\bنجيب\b/g, 'نجيبة'],
      [/\bالحافظ\b/g, 'الحافظة'],
      [/\bحافظ\b/g, 'حافظة'],
      [/\bالفائز\b/g, 'الفائزة'],
      [/\bفائز\b/g, 'فائزة'],
      [/\bالمثالي\b/g, 'المثالية'],
      [/\bمثالي\b/g, 'مثالية'],
      [/\bالقدير\b/g, 'القديرة'],
      [/\bقدير\b/g, 'قديرة'],
      [/\bالنشيط\b/g, 'النشيطة'],
      [/\bنشيط\b/g, 'نشيطة'],
      [/\bالفاعل\b/g, 'الفاعلة'],
      [/\bفاعل\b/g, 'فاعلة'],
      [/\bالمتطوع\b/g, 'المتطوعة'],
      [/\bمتطوع\b/g, 'متطوعة'],
      [/\bالرياضي\b/g, 'الرياضية'],
      [/\bرياضي\b/g, 'رياضية'],
      [/\bالمهذب\b/g, 'المهذبة'],
      [/\bمهذب\b/g, 'مهذبة'],
      [/\bالأول\b/g, 'الأولى'],
    ];

    for (const [regex, replacement] of phraseMapFemale) {
      result = result.replace(regex, replacement);
    }
  } else {
    // Normalization of common slashes for male (e.g. الطالب/ـة -> الطالب)
    result = result.replace(/الطالب[\/ـ_-]+[ةه]/g, 'الطالب');
    result = result.replace(/طالب[\/ـ_-]+[ةه]/g, 'طالب');
    result = result.replace(/الأستاذ[\/ـ_-]+[ةه]/g, 'الأستاذ');
    result = result.replace(/المبدع[\/ـ_-]+[ةه]/g, 'المبدع');
    result = result.replace(/المتطوع[\/ـ_-]+[ةه]/g, 'المتطوع');
    result = result.replace(/المتفوق[\/ـ_-]+[ةه]/g, 'المتفوق');
    result = result.replace(/المتميز[\/ـ_-]+[ةه]/g, 'المتميز');
    result = result.replace(/المجتهد[\/ـ_-]+[ةه]/g, 'المجتهد');

    const phraseMapMale: [RegExp, string][] = [
      // Surnames / Kinship
      [/\b بنت \b/g, ' بن '],

      // Intros & Direct Honors
      [/\bللطالبة المبدعة\b/g, 'للطالب المبدع'],
      [/\bللطالبة الخلوقة\b/g, 'للطالب الخلوق'],
      [/\bللطالبة المباركة\b/g, 'للطالب المبارك'],
      [/\bللطالبة المتميزة\b/g, 'للطالب المتميز'],
      [/\bللطالبة المتفوقة\b/g, 'للطالب المتفوق'],
      [/\bللطالبة المجتهدة\b/g, 'للطالب المجتهد'],
      [/\bللطالبة المتقنة\b/g, 'للطالب المتقن'],
      [/\bللطالبة الحافظة\b/g, 'للطالب الحافظ'],
      [/\bللطالبة الفائزة\b/g, 'للطالب الفائز'],
      [/\bللطالبة النجيبة\b/g, 'للطالب النجيب'],
      [/\bللطالبة المثالية\b/g, 'للطالب المثالي'],
      [/\bللطالبة\b/g, 'للطالب'],
      [/\bبأن الطالبة\b/g, 'بأن الطالب'],
      [/\bبأن الأستاذة\b/g, 'بأن الأستاذ'],
      [/\bللقيادية الواعدة\b/g, 'للقيادي الواعد'],
      [/\bللمبتكرة الرقمية\b/g, 'للمبتكر الرقمي'],
      [/\bللأستاذة القديرة\b/g, 'للأستاذ القدير'],
      [/\bلبطلتنا الصغيرة المبدعة\b/g, 'لبطلنا الصغير المبدع'],
      [/\bلبطلتنا الصغيرة\b/g, 'لبطلنا الصغير'],
      [/\bللفارسة اللغوية\b/g, 'للفارس اللغوي'],
      [/\bللمتطوعة المبدعة\b/g, 'للمتطوع المبدع'],
      [/\bللبطلة الرياضية الاستثنائية\b/g, 'للبطل الرياضي الاستثنائي'],
      [/\bللبطلة الرياضية\b/g, 'للبطل الرياضي'],
      [/\bللسفيرة البيئية\b/g, 'للسفير البيئي'],
      [/\bللمطورة العبقرية\b/g, 'للمطور العبقري'],
      [/\bبطلتنا الصغيرة\b/g, 'بطلنا الصغير'],
      [/\bبطلتنا\b/g, 'بطلنا'],
      [/\bنجمتنا\b/g, 'نجمنا'],
      [/\bفارستنا\b/g, 'فارسنا'],
      [/\bطالبة متميزة\b/g, 'طالب متميز'],
      [/\bطالبة متفوقة\b/g, 'طالب متفوق'],
      [/\bطالبة مجتهدة\b/g, 'طالب مجتهد'],
      [/\bطالبة خلوقة\b/g, 'طالب خلوق'],
      [/\bطالبة مبدعة\b/g, 'طالب مبدع'],
      [/\bقائدة مستقبلية\b/g, 'قائد مستقبلي'],
      [/\bمبتكرة واعدة\b/g, 'مبتكر واعد'],
      [/\bبطلة الموهبة\b/g, 'بطل الموهبة'],
      [/\bسفيرة البيئة\b/g, 'سفير البيئة'],
      [/\bحافظة متقنة\b/g, 'حافظ متقن'],
      [/\bطالبة العلم الصالحة\b/g, 'طالب العلم الصالح'],
      [/\bشكرًا لكِ يا نجمتنا\b/g, 'شكرًا لك يا نجمنا'],

      // Badges and Titles
      [/\bوسام الطالبة المتميزة\b/g, 'وسام الطالب المتميز'],
      [/\bوسام الطالبة المتفوقة\b/g, 'وسام الطالب المتفوق'],
      [/\bوسام الطالبة المثالية\b/g, 'وسام الطالب المثالي'],
      [/\bوسام الطالبة المبدعة\b/g, 'وسام الطالب المبدع'],
      [/\bوسام الفارسة\b/g, 'وسام الفارس'],

      // Pronouns and Possessives
      [/\bسائلين الله لها\b/g, 'سائلين الله له'],
      [/\bسائلين المولى لها\b/g, 'سائلين المولى له'],
      [/\bداعين الله لها\b/g, 'داعين الله له'],
      [/\bمتمنين لها\b/g, 'متمنين له'],
      [/\bراجين لها\b/g, 'راجين له'],
      [/\bنرجو لها\b/g, 'نرجو له'],
      [/\bنتمنى لها\b/g, 'نتمنى له'],
      [/\bنتمنى لَها\b/g, 'نتمنى له'],
      [/\bلها دوام\b/g, 'له دوام'],
      [/\bلها مستقبلاً\b/g, 'له مستقبلاً'],
      [/\bلها التوفيق\b/g, 'له التوفيق'],
      [/\bلها النجاح\b/g, 'له النجاح'],
      [/\bأن يوفقها\b/g, 'أن يوفقه'],
      [/\bأن يسددها\b/g, 'أن يسدده'],
      [/\bأن يبارك فيها\b/g, 'أن يبارك فيه'],
      [/\bأن يزيدها\b/g, 'أن يزيده'],
      [/\bأن ينفع بها\b/g, 'أن ينفع به'],
      [/\bأن يجعلها\b/g, 'أن يجعله'],
      [/\bلتكون\b/g, 'ليكون'],

      // Nouns with Affixes (Pronouns)
      [/\bلسلوكها\b/g, 'لسلوكه'],
      [/\bسلوكها\b/g, 'سلوكه'],
      [/\bأخلاقها\b/g, 'أخلاقه'],
      [/\bزميلاتها\b/g, 'زملائه'],
      [/\bمعلماتها\b/g, 'معلميه'],
      [/\bقريناتها\b/g, 'أقرانه'],
      [/\bوالديها\b/g, 'والديه'],
      [/\bأهلها\b/g, 'أهله'],
      [/\bوطنها\b/g, 'وطنه'],
      [/\bمدرستها\b/g, 'مدرسته'],
      [/\bفصلها\b/g, 'فصله'],
      [/\bصفها\b/g, 'صفه'],
      [/\bوحرصها\b/g, 'وحرصه'],
      [/\bحرصها\b/g, 'حرصه'],
      [/\bمواظبتها\b/g, 'مواظبته'],
      [/\bانضباطها\b/g, 'انضباطه'],
      [/\bأبدته\b/g, 'أبداه'],
      [/\bأبدائها\b/g, 'أبداءه'],
      [/\bحصولها\b/g, 'حصوله'],
      [/\bتحصيلها\b/g, 'تحصيله'],
      [/\bتألقها\b/g, 'تألقه'],
      [/\bمشاركتها\b/g, 'مشاركته'],
      [/\bقيادتها\b/g, 'قيادته'],
      [/\bابتكارها\b/g, 'ابتكاره'],
      [/\bإبداعها\b/g, 'إبداعه'],
      [/\bعطائها\b/g, 'عطائه'],
      [/\bجهودها\b/g, 'جهوده'],
      [/\bتفانيها\b/g, 'تفانيه'],
      [/\bتحقيقها\b/g, 'تحقيقه'],
      [/\bتميزها\b/g, 'تميزه'],
      [/\bإتمامها\b/g, 'إتمامه'],
      [/\bإتقانها\b/g, 'إتقانه'],
      [/\bأدائها\b/g, 'أدائه'],
      [/\bإنجازها\b/g, 'إنجازه'],
      [/\bتفردها\b/g, 'تفرده'],
      [/\bتعاونها\b/g, 'تعاونه'],
      [/\bحفظها\b/g, 'حفظه'],
      [/\bتلاوتها\b/g, 'تلاوته'],
      [/\bفريقها\b/g, 'فريقه'],
      [/\bمسيرتها\b/g, 'مسيرته'],
      [/\bمستقبلها\b/g, 'مستقبله'],
      [/\bتفوقها\b/g, 'تفوقه'],
      [/\bاجتهادها\b/g, 'اجتهاده'],
      [/\bشغفها\b/g, 'شغفه'],
      [/\bطموحها\b/g, 'طموحه'],
      [/\bذكائها\b/g, 'ذكائه'],
      [/\bفهمها\b/g, 'فهمه'],
      [/\bنجاحها\b/g, 'نجاحه'],
      [/\bفوزها\b/g, 'فوزه'],
      [/\bحضورها\b/g, 'حضوره'],
      [/\bتفاعلها\b/g, 'تفاعله'],
      [/\bسعيها\b/g, 'سعيه'],

      // Verbs
      [/\bحققت\b/g, 'حقق'],
      [/\bأنجزت\b/g, 'أنجز'],
      [/\bأبدعت\b/g, 'أبدع'],
      [/\bأبدت\b/g, 'أبدى'],
      [/\bأظهرت\b/g, 'أظهر'],
      [/\bقدمت\b/g, 'قدم'],
      [/\bحصلت\b/g, 'حصل'],
      [/\bنالت\b/g, 'نال'],
      [/\bأحرزت\b/g, 'أحرز'],
      [/\bاجتازت\b/g, 'اجتاز'],
      [/\bشاركت\b/g, 'شارك'],
      [/\bساهمت\b/g, 'ساهم'],
      [/\bتميزت\b/g, 'تميز'],
      [/\bتألقت\b/g, 'تألق'],
      [/\bتفوقت\b/g, 'تفوق'],
      [/\bثابرت\b/g, 'ثابر'],
      [/\bواظبت\b/g, 'واظب'],
      [/\bحفظت\b/g, 'حفظ'],
      [/\bاستحقت\b/g, 'استحق'],
      [/\bاستوفت\b/g, 'استوفى'],
      [/\bأكملت\b/g, 'أكمل'],
      [/\bالتي تجسد\b/g, 'الذي يجسد'],
      [/\bالتي أبهرت\b/g, 'الذي أبهر'],
      [/\bالتي حققت\b/g, 'الذي حقق'],

      // Direct Adjectives & Nouns
      [/\bالطالبة\b/g, 'الطالب'],
      [/\bطالبة\b/g, 'طالب'],
      [/\bالمتميزة\b/g, 'المتميز'],
      [/\bمتميزة\b/g, 'متميز'],
      [/\bالمتفوقة\b/g, 'المتفوق'],
      [/\bمتفوقة\b/g, 'متفوق'],
      [/\bالمجتهدة\b/g, 'المجتهد'],
      [/\bمجتهدة\b/g, 'مجتهد'],
      [/\bالخلوقة\b/g, 'الخلوق'],
      [/\bخلوقة\b/g, 'خلوق'],
      [/\bالمبدعة\b/g, 'المبدع'],
      [/\bمبدعة\b/g, 'مبدع'],
      [/\bالمباركة\b/g, 'المبارك'],
      [/\bمباركة\b/g, 'مبارك'],
      [/\bالمتقنة\b/g, 'المتقن'],
      [/\bمتقنة\b/g, 'متقن'],
      [/\bالنجيبة\b/g, 'النجيب'],
      [/\bنجيبة\b/g, 'نجيب'],
      [/\bالحافظة\b/g, 'الحافظ'],
      [/\bحافظة\b/g, 'حافظ'],
      [/\bالفائزة\b/g, 'الفائز'],
      [/\bفائزة\b/g, 'فائز'],
      [/\bالمثالية\b/g, 'المثالي'],
      [/\bمثالية\b/g, 'مثالي'],
      [/\bالقديرة\b/g, 'القدير'],
      [/\bقديرة\b/g, 'قدير'],
      [/\bالنشيطة\b/g, 'النشيط'],
      [/\bنشيطة\b/g, 'نشيط'],
      [/\bالفاعلة\b/g, 'الفاعل'],
      [/\bفاعلة\b/g, 'فاعل'],
      [/\bالمتطوعة\b/g, 'المتطوع'],
      [/\bمتطوعة\b/g, 'متطوع'],
      [/\bالرياضية\b/g, 'الرياضي'],
      [/\bرياضية\b/g, 'رياضي'],
      [/\bالمهذبة\b/g, 'المهذب'],
      [/\bمهذبة\b/g, 'مهذب'],
      [/\bالأولى\b/g, 'الأول'],
    ];

    for (const [regex, replacement] of phraseMapMale) {
      result = result.replace(regex, replacement);
    }
  }

  return result;
}

/**
 * Single AI Adapter Call Function with Smart Parsing
 */
export async function convertArabicTextGenderAI(text: string, targetGender: RecipientGender, apiKey?: string): Promise<string> {
  if (!text || typeof text !== 'string') return text;

  try {
    const response = await fetch('/api/adapt-gender-ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-gemini-api-key': apiKey || '',
      },
      body: JSON.stringify({
        text,
        targetGender,
        gender: targetGender,
        apiKey: apiKey || '',
      }),
    });

    if (!response.ok) {
      return convertArabicTextGender(text, targetGender);
    }

    const data = await response.json();
    return data.adaptedText || data.result || convertArabicTextGender(text, targetGender);
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
  let newStudentName = data.studentName;
  if (!options?.preserveCustomStudentName || !data.studentName) {
    newStudentName = convertArabicTextGender(data.studentName || '', newGender);
  }

  return {
    ...data,
    recipientGender: newGender,
    studentName: newStudentName,
    recipientIntro: convertArabicTextGender(data.recipientIntro || '', newGender),
    appreciationText: convertArabicTextGender(data.appreciationText || '', newGender),
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

  if (!options?.apiKey) {
    return localConvertedData;
  }

  // 2. محاولة تحسين البلاغة عبر الذكاء الاصطناعي مهلة قصيرة (3 ثوانٍ)
  try {
    const payloadObject = {
      recipientIntro: data.recipientIntro || '',
      appreciationText: data.appreciationText || '',
      badgeTitle: data.badgeTitle || ''
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 ثوانٍ كحد أقصى لتفادي التعليق

    const response = await fetch('/api/adapt-gender-ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-gemini-api-key': options.apiKey,
      },
      signal: controller.signal,
      body: JSON.stringify({
        text: JSON.stringify(payloadObject),
        targetGender: newGender,
        apiKey: options.apiKey,
        isBatch: true
      }),
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const resData = await response.json();

      if (resData.success && !resData.useFallback && resData.adaptedText) {
        let adaptedText = resData.adaptedText;

        if (typeof adaptedText === 'string') {
          try {
            const cleanJson = adaptedText.replace(/```json/g, '').replace(/```/g, '').trim();
            adaptedText = JSON.parse(cleanJson);
          } catch (e) {
            adaptedText = null;
          }
        }

        if (adaptedText && typeof adaptedText === 'object') {
          return {
            ...localConvertedData,
            recipientIntro: adaptedText.recipientIntro || localConvertedData.recipientIntro,
            appreciationText: adaptedText.appreciationText || localConvertedData.appreciationText,
            badgeTitle: adaptedText.badgeTitle || localConvertedData.badgeTitle,
          };
        }
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
