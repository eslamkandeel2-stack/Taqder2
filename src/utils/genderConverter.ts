import { CertificateData } from '../types';

export type RecipientGender = 'male' | 'female';

/**
 * Detect probable gender from Arabic student name
 */
export function detectGenderFromName(name: string): RecipientGender {
  if (!name || typeof name !== 'string') return 'male';
  const trimmed = name.trim();
  if (/\bبنت\b/.test(trimmed)) return 'female';
  if (/\bبن\b/.test(trimmed)) return 'male';

  const femaleNames = [
    'سارة', 'فاطمة', 'نورة', 'مريم', 'ريما', 'عائشة', 'أسماء', 'زينب', 'هدى', 'منى', 'شهد',
    'أمل', 'ريم', 'روان', 'خلود', 'عهود', 'نوف', 'دانة', 'جود', 'لمى', 'هيا', 'غادة', 'عبير',
    'جوهره', 'جوهرة', 'بدور', 'العنود', 'الجوهرة', 'ليان', 'تولين', 'جوري', 'سلمى', 'رغد',
    'أروى', 'لولوة', 'شيخة', 'حصة', 'هند', 'لطيفة', 'أشواق', 'نجلاء', 'شروق', 'ابتسام'
  ];

  const firstWord = trimmed.split(' ')[0];
  if (femaleNames.includes(firstWord)) return 'female';

  return 'male';
}

/**
 * Converts Arabic phrasing locally (Regex Fallback)
 */
export function convertArabicTextGender(text: string, targetGender: RecipientGender): string {
  if (!text || typeof text !== 'string') return text;

  let result = text;

  if (targetGender === 'female') {
    result = result.replace(/الطالب[\/ـ_-]+ة/g, 'الطالبة');
    result = result.replace(/الطالب[\/ـ_-]+ـة/g, 'الطالبة');
    result = result.replace(/الأستاذ[\/ـ_-]+ة/g, 'الأستاذة');
    result = result.replace(/الأستاذ[\/ـ_-]+ـة/g, 'الأستاذة');
    result = result.replace(/المبدع[\/ـ_-]+ة/g, 'المبدعة');
    result = result.replace(/المبدع[\/ـ_-]+ـة/g, 'المبدعة');
    result = result.replace(/المتطوع[\/ـ_-]+ة/g, 'المتطوعة');
    result = result.replace(/المتطوع[\/ـ_-]+ـة/g, 'المتطوعة');
    result = result.replace(/طالب[\/ـ_-]+ـة/g, 'طالبة');

    const phraseMapFemale: [RegExp, string][] = [
      [/\bعبد الله بن\b/g, 'فاطمة بنت'],
      [/\bبن\b/g, 'بنت'],
      [/\bللطالب المبدع\b/g, 'للطالبة المبدعة'],
      [/\bللطالب الخلوق\b/g, 'للطالبة الخلوقة'],
      [/\bللطالب المبارك\b/g, 'للطالبة المباركة'],
      [/\bللطالب المتميز\b/g, 'للطالبة المتميزة'],
      [/\bللطالب المتقن\b/g, 'للطالبة المتقنة'],
      [/\bللطالب الفائز\b/g, 'للطالبة الفائزة'],
      [/\bللطالب\b/g, 'للطالبة'],
      [/\bبأن الطالب\b/g, 'بأن الطالبة'],
      [/\bبأن الأستاذ\b/g, 'بأن الأستاذة'],
      [/\bللقيادي الواعد\b/g, 'للقيادية الواعدة'],
      [/\bللمبتكر الرقمي\b/g, 'للمبتكرة الرقمية'],
      [/\bللأستاذ القدير\b/g, 'للأستاذة القديرة'],
      [/\bلبطلنا الصغير المبدع\b/g, 'لبطلتنا الصغيرة المبدعة'],
      [/\bللفارس اللغوي\b/g, 'للفارسة اللغوية'],
      [/\bللمتطوع المبدع\b/g, 'للمتطوعة المبدعة'],
      [/\bللبطل الرياضي الاستثنائي\b/g, 'للبطلة الرياضية الاستثنائية'],
      [/\bللسفير البيئي\b/g, 'للسفيرة البيئية'],
      [/\bللمطور العبقري\b/g, 'للمطورة العبقرية'],
      [/\bبطلنا الصغير\b/g, 'بطلتنا الصغيرة'],
      [/\bبطلنا\b/g, 'بطلتنا'],
      [/\bنجمنا\b/g, 'نجمتنا'],
      [/\bطالب مالي\b/g, 'طالبة مالية'],
      [/\bطالب متميز\b/g, 'طالبة متميزة'],
      [/\bفارس اللغة\b/g, 'فارسة اللغة'],
      [/\bطالب متفوق\b/g, 'طالبة متفوقة'],
      [/\bقائد مستقبلي\b/g, 'قائدة مستقبلية'],
      [/\bمبتكر واعد\b/g, 'مبتكرة واعدة'],
      [/\bبطل الموهبة\b/g, 'بطلة الموهبة'],
      [/\bسفير البيئة\b/g, 'سفيرة البيئة'],
      [/\bحافظ متقن\b/g, 'حافظة متقنة'],
      [/\bطالب العلم الصالح\b/g, 'طالبة العلم الصالحة'],
      [/\bشكرًا لك يا نجمنا\b/g, 'شكرًا لكِ يا نجمتنا'],
      [/\bنتمنى له\b/g, 'نتمنى لها'],
      [/\bنتمنى لَه\b/g, 'نتمنى لها'],
      [/\bله دوام\b/g, 'لها دوام'],
      [/\bلسلوكه\b/g, 'لسلوكها'],
      [/\bزملائه\b/g, 'زميلاتها'],
      [/\bمعلميه\b/g, 'معلماتها'],
      [/\bوحرصه\b/g, 'وحرصها'],
      [/\bحرصه\b/g, 'حرصها'],
      [/\bأبداه\b/g, 'أبدته'],
      [/\bأبداءه\b/g, 'أبدائها'],
      [/\bحصوله\b/g, 'حصولها'],
      [/\bتألقه\b/g, 'تألقها'],
      [/\bمشاركته\b/g, 'مشاركتها'],
      [/\bقيادته\b/g, 'قيادتها'],
      [/\bابتكاره\b/g, 'ابتكارها'],
      [/\bعطائه\b/g, 'عطائها'],
      [/\bجهوده\b/g, 'جهودها'],
      [/\bتفانيه\b/g, 'تفانيها'],
      [/\bتحقيقه\b/g, 'تحقيقها'],
      [/\bتميزه\b/g, 'تميزها'],
      [/\bإتمامه\b/g, 'إتمامها'],
      [/\bإتقانه\b/g, 'إتقانها'],
      [/\bتخلقها\b/g, 'تخلقها'],
      [/\bأدائه\b/g, 'أدائها'],
      [/\bإنجازه\b/g, 'إنجازها'],
      [/\bتفردها\b/g, 'تفردها'],
      [/\bسلوكه\b/g, 'سلوكها'],
      [/\bتعاونه\b/g, 'تعاونها'],
      [/\bحفظه\b/g, 'حفظها'],
      [/\bفريقه\b/g, 'فريقها'],
      [/\bمسيرته\b/g, 'مسيرتها'],
      [/\bعلماء\b/g, 'علمها'],
      [/\bانضباطه\b/g, 'انضباطها'],
      [/\bتفوقه\b/g, 'تفوقها'],
      [/\bيزيده\b/g, 'يزيدها'],
      [/\bمترتبة على اجتهاده\b/g, 'مترتبة على اجتهادها'],
      [/\bاجتهاده\b/g, 'اجتهادها'],
      [/\bالذي يجسد\b/g, 'التي تجسد'],
      [/\bالذي أبهر\b/g, 'التي أبهرت'],
      [/\bقد استوفى\b/g, 'قد استوفت'],
      [/\bقد أكمل\b/g, 'قد أكملت'],
      [/\bأظهر التزاماً\b/g, 'أظهرت التزاماً'],
      [/\bأظهر التزاما\b/g, 'أظهرت التزاماً'],
      [/\bأبدت\b/g, 'أبدى'],
      [/\bاجتاز\b/g, 'اجتازت'],
      [/\bحصد\b/g, 'حصدت'],
      [/\bسمعت\b/g, 'سمع'],
      [/\bمنحه\b/g, 'منحها'],
      [/\bللطالب\b/g, 'للطالبة'],
      [/\bالطالب\b/g, 'الطالبة'],
      [/\bطالب\b/g, 'طالبة'],
      [/\bالمتميز\b/g, 'المتميزة'],
      [/\bالمتفوق\b/g, 'المتفوقة'],
      [/\bالنجيب\b/g, 'النجيبة'],
    ];

    for (const [regex, replacement] of phraseMapFemale) {
      result = result.replace(regex, replacement);
    }
  } else {
    result = result.replace(/الطالب[\/ـ_-]+ة/g, 'الطالب');
    result = result.replace(/الطالب[\/ـ_-]+ـة/g, 'الطالب');
    result = result.replace(/الأستاذ[\/ـ_-]+ة/g, 'الأستاذ');
    result = result.replace(/الأستاذ[\/ـ_-]+ـة/g, 'الأستاذ');
    result = result.replace(/المبدع[\/ـ_-]+ة/g, 'المبدع');
    result = result.replace(/المبدع[\/ـ_-]+ـة/g, 'المبدع');
    result = result.replace(/المتطوع[\/ـ_-]+ة/g, 'المتطوع');
    result = result.replace(/المتطوع[\/ـ_-]+ـة/g, 'المتطوع');
    result = result.replace(/طالب[\/ـ_-]+ـة/g, 'طالب');

    const phraseMapMale: [RegExp, string][] = [
      [/\bبنت\b/g, 'بن'],
      [/\bللطالبة المبدعة\b/g, 'للطالب المبدع'],
      [/\bللطالبة الخلوقة\b/g, 'للطالب الخلوق'],
      [/\bللطالبة المباركة\b/g, 'للطالب المبارك'],
      [/\bللطالبة المتميزة\b/g, 'للطالب المتميز'],
      [/\bللطالبة المتقنة\b/g, 'للطالب المتقن'],
      [/\bللطالبة الفائزة\b/g, 'للطالب المبدع الفائز'],
      [/\bللطالبة\b/g, 'للطالب'],
      [/\bبأن الطالبة\b/g, 'بأن الطالب'],
      [/\bبأن الأستاذة\b/g, 'بأن الأستاذ'],
      [/\bللقيادية الواعدة\b/g, 'للقيادي الواعد'],
      [/\bللمبتكرة الرقمية\b/g, 'للمبتكر الرقمي'],
      [/\bللأستاذة القديرة\b/g, 'للأستاذ القدير'],
      [/\bلبطلتنا الصغيرة المبدعة\b/g, 'لبطلنا الصغير المبدع'],
      [/\bللفارسة اللغوية\b/g, 'للفارس اللغوي'],
      [/\bللمتطوعة المبدعة\b/g, 'للمتطوع المبدع'],
      [/\bللبطلة الرياضية الاستثنائية\b/g, 'للبطل الرياضي الاستثنائي'],
      [/\bللسفيرة البيئية\b/g, 'للسفير البيئي'],
      [/\bللمطورة العبقرية\b/g, 'للمطور العبقري'],
      [/\bبطلتنا الصغيرة\b/g, 'بطلنا الصغير'],
      [/\bبطلتنا\b/g, 'بطلنا'],
      [/\bنجمتنا\b/g, 'نجمنا'],
      [/\bطالبة مالية\b/g, 'طالب مالي'],
      [/\bطالبة متميزة\b/g, 'طالب متميز'],
      [/\bفارسة اللغة\b/g, 'فارس اللغة'],
      [/\bطالبة متفوقة\b/g, 'طالب متفوق'],
      [/\bقائدة مستقبلية\b/g, 'قائد مستقبلي'],
      [/\bمبتكرة واعدة\b/g, 'مبتكر واعد'],
      [/\bبطلة الموهبة\b/g, 'بطل الموهبة'],
      [/\bسفيرة البيئة\b/g, 'سفير البيئة'],
      [/\bحافظة متقنة\b/g, 'حافظ متقن'],
      [/\bطالبة العلم الصالحة\b/g, 'طالب العلم الصالح'],
      [/\bشكرًا لكِ يا نجمتنا\b/g, 'شكرًا لك يا نجمنا'],
      [/\bنتمنى لها\b/g, 'نتمنى له'],
      [/\bنتمنى لَها\b/g, 'نتمنى له'],
      [/\bلها دوام\b/g, 'له دوام'],
      [/\bلسلوكها\b/g, 'لسلوكه'],
      [/\bزميلاتها\b/g, 'زملائه'],
      [/\bمعلماتها\b/g, 'معلميه'],
      [/\bوحرصها\b/g, 'وحرصه'],
      [/\bحرصها\b/g, 'حرصه'],
      [/\bأبدته\b/g, 'أبداه'],
      [/\bأبدائها\b/g, 'أبداءه'],
      [/\bحصولها\b/g, 'حصوله'],
      [/\bتألقها\b/g, 'تألقه'],
      [/\bمشاركتها\b/g, 'مشاركته'],
      [/\bقيادتها\b/g, 'قيادته'],
      [/\bابتكارها\b/g, 'ابتكاره'],
      [/\bعطائها\b/g, 'عطائه'],
      [/\bجهودها\b/g, 'جهوده'],
      [/\bتفانيها\b/g, 'تفانيه'],
      [/\bتحقيقها\b/g, 'تحقيقه'],
      [/\bتميزها\b/g, 'تميزه'],
      [/\bإتمامها\b/g, 'إتمامه'],
      [/\bإتقانها\b/g, 'إتقانه'],
      [/\bتخلقها\b/g, 'تخلقه'],
      [/\bأدائها\b/g, 'أدائه'],
      [/\bإنجازها\b/g, 'إنجازه'],
      [/\bتفردها\b/g, 'تفرده'],
      [/\bسلوكها\b/g, 'سلوكه'],
      [/\bتعاونها\b/g, 'تعاونه'],
      [/\bحفظها\b/g, 'حفظه'],
      [/\bفريقها\b/g, 'فريقه'],
      [/\bاجتهادها\b/g, 'اجتهاده'],
      [/\bمسيرتها\b/g, 'مسيرته'],
      [/\bعلمها\b/g, 'علمها'],
      [/\bانضباطها\b/g, 'انضباطه'],
      [/\bتفوقها\b/g, 'تفوقه'],
      [/\bيزيدها\b/g, 'يزيده'],
      [/\bالتي تجسد\b/g, 'الذي يجسد'],
      [/\bالتي أبهرت\b/g, 'الذي أبهر'],
      [/\bقد استوفى\b/g, 'قد استوفت'],
      [/\bقد أكملت\b/g, 'قد أكمل'],
      [/\bأظهرت التزاماً\b/g, 'أظهر التزاماً'],
      [/\bأظهرت التزاما\b/g, 'أظهر التزاماً'],
      [/\bأبدت\b/g, 'أبدى'],
      [/\bاجتازت\b/g, 'اجتاز'],
      [/\bحصدت\b/g, 'حصد'],
      [/\bسمعت\b/g, 'سمع'],
      [/\bمنحه\b/g, 'منحها'],
      [/\bللطالب\b/g, 'للطالبة'],
      [/\bالطالب\b/g, 'الطالبة'],
      [/\bطالب\b/g, 'طالبة'],
      [/\bالمتميز\b/g, 'المتميزة'],
      [/\bالمتفوق\b/g, 'المتفوقة'],
      [/\bالنجيبة\b/g, 'النجيب'],
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
