import type { VercelRequest, VercelResponse } from '@vercel/node';

// إعداد خيارات CORS
function setCorsHeaders(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-gemini-api-key, x-gemini-model'
  );
}

// استخراج بيانات الطلب والمفاتيح
function extractAiCredentials(req: VercelRequest) {
  let bodyData = req.body;
  if (typeof req.body === 'string' && req.body.trim() !== '') {
    try {
      bodyData = JSON.parse(req.body);
    } catch (e) {
      bodyData = {};
    }
  }

  const headerKey = req.headers['x-gemini-api-key'] as string | undefined;
  const bodyKey = bodyData?.apiKey as string | undefined;
  const apiKey = (headerKey || bodyKey || process.env.GEMINI_API_KEY || '').trim();

  const headerModel = req.headers['x-gemini-model'] as string | undefined;
  const bodyModel = bodyData?.model as string | undefined;
  // تحديث النموذج الافتراضي إلى gemini-3.6-flash
  const model = (headerModel || bodyModel || 'gemini-3.6-flash').trim();

  return { apiKey, model, bodyData };
}

// دالة تنظيف واستخراج الـ JSON بأمان
function parseJsonSafely(text: string) {
  try {
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanText);
  } catch (e) {
    return null;
  }
}

// دالة الاتصال المباشر بـ REST API
async function callGeminiDirectly(apiKey: string, model: string, prompt: string, isJson: boolean = false) {
  // استخدام gemini-3.6-flash تلقائياً
  const cleanModel = model.startsWith('gemini-') ? model : 'gemini-3.6-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent?key=${apiKey}`;

  const payload: any = {
    contents: [{ parts: [{ text: prompt }] }],
  };

  if (isJson) {
    payload.generationConfig = { responseMimeType: 'application/json' };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error?.message || 'فشل الاتصال بـ Gemini API');
  }

  const outputText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return outputText;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname.replace('/api', '');

  try {
    const { apiKey, model, bodyData } = extractAiCredentials(req);

    if (!apiKey) {
      return res.status(400).json({ success: false, error: 'يرجى إدخال مفتاح API Key صالح' });
    }

    // 1. اختبار وفحص الاتصال
    if (pathname === '/test-ai-connection' || pathname === '/test-ai-connection/' || pathname === '/check') {
      const resultText = await callGeminiDirectly(
        apiKey,
        model,
        "اختبار اتصال سريع: قل 'متصل بنجاح' فقط."
      );

      return res.status(200).json({
        success: true,
        modelUsed: model || 'gemini-3.6-flash',
        sampleResponse: resultText.trim(),
        message: `تم الاتصال بنموذج الذكاء الاصطناعي بنجاح! 🟢`,
      });
    }

    // 2. تحسين وبلاغة النصوص الفردية
    if (pathname === '/ai-improve-text' || pathname === '/ai-improve-text/') {
      const { text, type, style, gender, studentName, subject } = bodyData || {};
      const isFemale = gender === 'female';

      const prompt = `أنت خبير بلاغة وسجع عربي. قم بتقديم 3 صياغات بليغة ومختلفة بناءً على النص التالي: "${text || ''}" لقسم (${type || 'فقرة تقدير'}) بأسلوب (${style || 'رسمي وفخم'}) لتكريم ${isFemale ? 'الطالبة' : 'الطالب'} (${studentName || 'المتميز/ة'}) في مادة (${subject || 'التفوق العام'}).
المطلوب إرجاع JSON فقط يحتوي على مصفوفة باسم variations بنفس الهيكل:
{
  "variations": [
    { "id": 1, "text": "الصياغة الأولى هنا...", "styleLabel": "صياغة ملكية وفخمة" },
    { "id": 2, "text": "الصياغة الثانية هنا...", "styleLabel": "أسلوب مسجوع وبليغ" },
    { "id": 3, "text": "الصياغة الثالثة هنا...", "styleLabel": "أسلوب حماسي ملهم" }
  ]
}`;

      const resultText = await callGeminiDirectly(apiKey, model, prompt, true);
      const parsed = parseJsonSafely(resultText) || {};

      return res.status(200).json({
        success: true,
        variations: parsed.variations || [],
      });
    }

    // 3. توليد محتوى الشهادات المتكاملة
    if (pathname === '/generate-certificate-content' || pathname === '/generate-certificate-content/') {
      const { studentName, subject, recipientGender } = bodyData || {};
      const isFemale = recipientGender === 'female';

      const prompt = `أنت خبير صياغة شهادات تقدير. أرجِع JSON فقط يحتوي على الحقول: title, recipientIntro, appreciationText, poemOrQuote, badgeTitle لتكريم ${isFemale ? 'طالبة' : 'طالب'} اسمه/ا ${studentName || ''} في مادة ${subject || 'التفوق العام'}.`;

      const resultText = await callGeminiDirectly(apiKey, model, prompt, true);
      const parsed = parseJsonSafely(resultText) || {};

      return res.status(200).json({ success: true, result: parsed });
    }

    // 4. تعديل ومواءمة النصوص بين المذكر والمؤنث (سريع وبدون تأخير)
    if (pathname === '/adapt-gender-ai' || pathname === '/adapt-gender-ai/') {
      const { text, targetGender, gender } = bodyData || {};
      const selectedGender = targetGender || gender;
      const isFemale = selectedGender === 'female' || selectedGender === 'female_student' || selectedGender === 'طالبة' || selectedGender === 'مؤنث';

      if (!apiKey) {
        return res.status(200).json({
          success: true,
          adaptedText: text || '',
          result: text || ''
        });
      }

      const prompt = `عدّل النص العربي التالي ليكون موجهاً لتكريم (${isFemale ? 'طالبة / أنثى' : 'طالب / مذكر'}) فقط. 
قم بتعديل كافة الأفعال، الضمائر، والأسماء بدقة لغوية وبلاغية. 
أرجِع النص المعدّل النهائي فقط بدون أي مقدمات أو شرح أو أقواس.

النص الأصلي:
${text || ''}`;

      try {
        // نرسل الطلب كنص عادي (isJson = false) لسرعة التوليد الفائقة
        const resultText = await callGeminiDirectly(apiKey, model, prompt, false);
        const cleanResult = resultText.trim().replace(/^["']|["']$/g, '');

        return res.status(200).json({
          success: true,
          adaptedText: cleanResult || text,
          result: cleanResult || text
        });
      } catch (aiErr: any) {
        console.error('Adapt Gender AI Error:', aiErr);
        return res.status(200).json({
          success: true,
          adaptedText: text || '',
          result: text || ''
        });
      }
    }

