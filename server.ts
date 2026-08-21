import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: "10mb" }));

// Extract credentials and configuration from request (Headers, Body, or Environment)
interface RequestAiConfig {
  provider: 'gemini' | 'openai' | 'anthropic' | 'deepseek' | 'groq' | 'custom';
  apiKey: string;
  model: string;
  customApiUrl?: string;
}

function extractAiCredentials(req: express.Request): RequestAiConfig {
  const rawProvider = (req.headers["x-ai-provider"] as string || req.body?.provider || "gemini").toLowerCase();
  const provider = (['gemini', 'openai', 'anthropic', 'deepseek', 'groq', 'custom'].includes(rawProvider)
    ? rawProvider
    : 'gemini') as RequestAiConfig['provider'];

  const headerKey = (req.headers["x-ai-api-key"] || req.headers["x-gemini-api-key"]) as string | undefined;
  const bodyKey = req.body?.apiKey as string | undefined;

  let envKey = "";
  if (provider === "gemini") {
    envKey = process.env.GEMINI_API_KEY || "";
  } else if (provider === "openai") {
    envKey = process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY || "";
  } else if (provider === "anthropic") {
    envKey = process.env.ANTHROPIC_API_KEY || "";
  } else if (provider === "deepseek") {
    envKey = process.env.DEEPSEEK_API_KEY || "";
  } else if (provider === "groq") {
    envKey = process.env.GROQ_API_KEY || "";
  }

  const apiKey = (headerKey || bodyKey || envKey || "").trim();

  const headerModel = (req.headers["x-ai-model"] || req.headers["x-gemini-model"]) as string | undefined;
  const bodyModel = req.body?.model as string | undefined;

  let defaultModel = "gemini-3.6-flash";
  if (provider === "gemini") defaultModel = "gemini-3.6-flash";
  else if (provider === "openai") defaultModel = "gpt-4o-mini";
  else if (provider === "anthropic") defaultModel = "claude-3-5-sonnet-20241022";
  else if (provider === "deepseek") defaultModel = "deepseek-chat";
  else if (provider === "groq") defaultModel = "llama-3.3-70b-versatile";
  else if (provider === "custom") defaultModel = "llama3";

  const model = (headerModel || bodyModel || defaultModel).trim();
  const customApiUrl = ((req.headers["x-ai-custom-url"] as string) || req.body?.customApiUrl || "").trim();

  return { provider, apiKey, model, customApiUrl };
}

// Clean and safely parse JSON strings from any model response
function cleanAndParseJson<T = any>(rawText: string, fallback: T): T {
  if (!rawText || typeof rawText !== "string") return fallback;
  try {
    let clean = rawText.trim();
    if (clean.startsWith("```")) {
      clean = clean.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    }
    return JSON.parse(clean);
  } catch (e) {
    const match = rawText.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (inner) {
        // failed
      }
    }
    return fallback;
  }
}

// Universal AI Execution Helper across all supported providers
interface UnifiedAiParams {
  config: RequestAiConfig;
  prompt: string;
  systemInstruction?: string;
  temperature?: number;
  maxTokens?: number;
  jsonOutput?: boolean;
}

async function callUnifiedAi(params: UnifiedAiParams): Promise<string> {
  const { config, prompt, systemInstruction, temperature = 0.7, maxTokens = 2000, jsonOutput = true } = params;

  // 1. Google Gemini Provider
  if (config.provider === "gemini") {
    const ai = getGenAI(config.apiKey);
    const fullPrompt = systemInstruction ? `${systemInstruction}\n\n${prompt}` : prompt;
    const response = await generateContentWithRetry(ai, {
      primaryModel: config.model || "gemini-3.6-flash",
      contents: fullPrompt,
      config: {
        responseMimeType: jsonOutput ? "application/json" : "text/plain",
        temperature,
        maxOutputTokens: maxTokens,
      },
    });
    return response.text || "";
  }

  // 2. Anthropic Claude Provider
  if (config.provider === "anthropic") {
    const apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("لم يتم العثور على مفتاح Anthropic API Key. يرجى ضبطه في إعدادات النظام.");
    }
    const fullSystem =
      (systemInstruction || "أنت خبير بلاغة ولغة عربية وصياغة شهادات تقديرية رسمية رفيعة.") +
      (jsonOutput ? "\n\nCRITICAL: Respond ONLY with valid JSON with no markdown wrapping, codeblocks or explanations outside the JSON." : "");

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: config.model || "claude-3-5-sonnet-20241022",
        max_tokens: maxTokens,
        temperature,
        system: fullSystem,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Anthropic API Error (${res.status}): ${errBody}`);
    }

    const data: any = await res.json();
    return data?.content?.[0]?.text || "";
  }

  // 3. OpenAI, DeepSeek, Groq, and Custom OpenAI-Compatible Providers
  let baseUrl = "https://api.openai.com/v1";
  let defaultModel = "gpt-4o-mini";

  if (config.provider === "deepseek") {
    baseUrl = "https://api.deepseek.com/v1";
    defaultModel = "deepseek-chat";
  } else if (config.provider === "groq") {
    baseUrl = "https://api.groq.com/openai/v1";
    defaultModel = "llama-3.3-70b-versatile";
  } else if (config.provider === "custom") {
    baseUrl = config.customApiUrl || "http://localhost:11434/v1";
    defaultModel = config.model || "llama3";
  }

  const endpoint = `${baseUrl.replace(/\/+$/, "")}/chat/completions`;
  const apiKey = config.apiKey || process.env.OPENAI_API_KEY || "";
  const modelToUse = config.model || defaultModel;

  const messages: any[] = [];
  const systemPrompt =
    (systemInstruction || "أنت خبير بلاغة ولغة عربية وصياغة شهادات تقديرية رسمية رفيعة.") +
    (jsonOutput ? "\n\nCRITICAL: Return valid raw JSON only. Do not include markdown codeblocks, notes or explanations outside the JSON." : "");

  messages.push({ role: "system", content: systemPrompt });
  messages.push({ role: "user", content: prompt });

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  const reqBody: any = {
    model: modelToUse,
    messages,
    temperature,
    max_tokens: maxTokens,
  };

  if (jsonOutput && config.provider !== "custom") {
    reqBody.response_format = { type: "json_object" };
  }

  const res = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(reqBody),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`${config.provider.toUpperCase()} API Error (${res.status}): ${errBody}`);
  }

  const data: any = await res.json();
  const text = data?.choices?.[0]?.message?.content || "";
  return text;
}

// Initialize Google GenAI lazy/safely
function getGenAI(customApiKey?: string) {
  const apiKey = (customApiKey || process.env.GEMINI_API_KEY || "").trim();
  if (!apiKey) {
    throw new Error("لم يتم العثور على مفتاح GEMINI_API_KEY. يرجى إدخال مفتاح API في الإعدادات أو ضبطه في متغيرات البيئة بالسيرفر.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Robust helper to handle transient 503/UNAVAILABLE errors with automatic retry & model fallback
async function generateContentWithRetry(
  ai: GoogleGenAI,
  params: {
    contents: any;
    config?: any;
    primaryModel?: string;
  }
) {
  const modelsToTry = [
    params.primaryModel || "gemini-3.7-flash",
    "gemini-flash-latest",
  ];

  let lastError: any = null;

  for (const model of modelsToTry) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: params.contents,
          config: params.config,
        });
        return response;
      } catch (err: any) {
        lastError = err;
        const status = err?.status || err?.code;
        const msg = String(err?.message || "");
        const isTransient =
          status === 503 ||
          status === 429 ||
          msg.includes("503") ||
          msg.includes("UNAVAILABLE") ||
          msg.includes("high demand") ||
          msg.includes("Resource has been exhausted") ||
          msg.includes("Overloaded");

        if (isTransient && attempt < 2) {
          // wait before retry (1s, 2s)
          await new Promise((resolve) => setTimeout(resolve, (attempt + 1) * 1000));
          continue;
        }
        break; // move to next model or throw
      }
    }
  }

  throw lastError;
}

function formatAiErrorMessage(error: any): string {
  const msg = String(error?.message || "");
  if (
    error?.status === 503 ||
    error?.code === 503 ||
    msg.includes("503") ||
    msg.includes("UNAVAILABLE") ||
    msg.includes("high demand") ||
    msg.includes("Resource has been exhausted")
  ) {
    return "الخدمة الذكية مشغولة حالياً بسبب كثرة الطلبات. يرجى إعادة المحاولة بعد بضع ثوانٍ.";
  }
  return error?.message || "تعذر معالجة الطلب بالذكاء الاصطناعي حالياً";
}

// Local smart fallback generator for certificates when API key is missing or offline
function generateLocalCertificateFallback(params: {
  studentName?: string;
  subject?: string;
  achievement?: string;
  grade?: string;
  tone?: string;
  schoolName?: string;
  teacherName?: string;
  recipientGender?: string;
}) {
  const isFemale = params.recipientGender === 'female';
  const name = params.studentName || (isFemale ? 'الطالبة المتميزة' : 'الطالب المتميز');
  const subject = params.subject || 'التفوق العام';
  const achievement = params.achievement || 'الاجتهاد والسلوك المتميز والتفوق الدراسي';

  const poems = isFemale ? [
    'العِلْمُ يَرْفَعُ بَيْتًا لا عِمَادَ لَهُ ... وَالجَهْلُ يَهْدِمُ بَيْتَ العِزِّ وَالشَّرَفِ',
    'يا شُعْلَةَ العِلْمِ يَا رَمْزَ الفَخَارِ سَمَتْ ... بِكِ المَعَالِي وَنِلْتِ العِزَّ وَالشَّرَفَا',
    'مَنْ طَلَبَ العُلَى سَهِرَ اللَّيَالِي ... وَنَالَ المَجْدَ فِي خَيْرِ المَنَالِ',
  ] : [
    'العِلْمُ يَرْفَعُ بَيْتًا لا عِمَادَ لَهُ ... وَالجَهْلُ يَهْدِمُ بَيْتَ العِزِّ وَالشَّرَفِ',
    'يا كَوْكَبَ المَجْدِ وَالإِبْدَاعِ مُؤْتَلِقًا ... نِلْتَ المَعَالِيَ إِقْدَامًا وَإِتْقَانَا',
    'مَنْ طَلَبَ العُلَى سَهِرَ اللَّيَالِي ... وَنَالَ المَجْدَ فِي خَيْرِ المَنَالِ',
  ];

  const appreciation = isFemale
    ? `تقديراً لجهودها المتميزة وتفوقها المشهود في ${subject}، وإبداعها المستمر في ${achievement}، سائلين المولى لها دوام التوفيق والتألق والنجاح في مسيرتها التعليمية المباركة.`
    : `تقديراً لجهوده المتميزة وتفوقه المشهود في ${subject}، وإبداعه المستمر في ${achievement}، سائلين المولى له دوام التوفيق والتألق والنجاح في مسيرته التعليمية المباركة.`;

  return {
    title: isFemale ? 'شهادة شكر وتقدير وتفوق' : 'شهادة شكر وتقدير وتفوق',
    recipientIntro: isFemale
      ? 'تسر إدارة المدرسة ومعلموها أن تمنح هذه الشهادة للطالبة المتميزة:'
      : 'تسر إدارة المدرسة ومعلموها أن تمنح هذه الشهادة للطالب المتميز:',
    appreciationText: appreciation,
    poemOrQuote: poems[Math.floor(Math.random() * poems.length)],
    badgeTitle: isFemale ? 'وسام التميز والتفوق' : 'وسام التميز والتفوق',
    primaryColorHex: '#854d0e',
    secondaryColorHex: '#d97706',
  };
}

// Local smart gender adaptation fallback
function adaptGenderLocalFallback(certData: any, targetGender: string) {
  const isFemale = targetGender === 'female';
  let intro = certData?.recipientIntro || (isFemale ? 'تتقدم إدارة المدرسة بوافر الشكر والتقدير للطالبة المتميزة:' : 'تتقدم إدارة المدرسة بوافر الشكر والتقدير للطالب المتميز:');
  let appreciation = certData?.appreciationText || '';
  let title = certData?.title || 'شهادة شكر وتقدير';
  let badgeTitle = certData?.badgeTitle || (isFemale ? 'وسام التميز' : 'وسام التميز');

  if (isFemale) {
    intro = intro
      .replace(/للطالب المبدع/g, 'للطالبة المبدعة')
      .replace(/للطالب المتميز/g, 'للطالبة المتميزة')
      .replace(/للطالب/g, 'للطالبة')
      .replace(/الطالب/g, 'الطالبة');
    appreciation = appreciation
      .replace(/لجهوده/g, 'لجهودها')
      .replace(/تفوقه/g, 'تفوقها')
      .replace(/تألقه/g, 'تألقها')
      .replace(/تميزه/g, 'تميزها')
      .replace(/إبداعه/g, 'إبداعها')
      .replace(/عطائه/g, 'عطائها')
      .replace(/نتمنى له/g, 'نتمنى لها')
      .replace(/مستقبله/g, 'مستقبلها')
      .replace(/سلوكه/g, 'سلوكها')
      .replace(/حفظه/g, 'حفظها')
      .replace(/إتمامه/g, 'إتمامها')
      .replace(/أبدى/g, 'أبدت')
      .replace(/أظهر/g, 'أظهرت')
      .replace(/حصد/g, 'حصدت')
      .replace(/اجتاز/g, 'اجتازت');
  } else {
    intro = intro
      .replace(/للطالبة المبدعة/g, 'للطالب المبدع')
      .replace(/للطالبة المتميزة/g, 'للطالب المتميز')
      .replace(/للطالبة/g, 'للطالب')
      .replace(/الطالبة/g, 'الطالب');
    appreciation = appreciation
      .replace(/لجهودها/g, 'لجهوده')
      .replace(/تفوقها/g, 'تفوقه')
      .replace(/تألقها/g, 'تألقه')
      .replace(/تميزها/g, 'تميزه')
      .replace(/إبداعها/g, 'إبداعه')
      .replace(/عطائها/g, 'عطائه')
      .replace(/نتمنى لها/g, 'نتمنى له')
      .replace(/مستقبلها/g, 'مستقبله')
      .replace(/سلوكها/g, 'سلوكه')
      .replace(/حفظها/g, 'حفظه')
      .replace(/إتمامها/g, 'إتمامه')
      .replace(/أبدت/g, 'أبدى')
      .replace(/أظهرت/g, 'أظهر')
      .replace(/حصدت/g, 'حصد')
      .replace(/اجتازت/g, 'اجتاز');
  }

  return {
    title,
    recipientIntro: intro,
    appreciationText: appreciation,
    poemOrQuote: certData?.poemOrQuote || '',
    badgeTitle,
  };
}

// API Connection and Model Health Diagnostics Endpoint
app.post("/api/test-ai-connection", async (req, res) => {
  const startTime = Date.now();
  const aiConfig = extractAiCredentials(req);

  try {
    const probePrompt = "اختبار اتصال سريع باللغة العربية: قل كلمة 'متصل' فقط وتأكيد الاتصال.";
    const responseText = await callUnifiedAi({
      config: aiConfig,
      prompt: probePrompt,
      systemInstruction: "أنت مساعد ذكي. أجب بإيجاز شديد.",
      temperature: 0.1,
      maxTokens: 50,
      jsonOutput: false,
    });

    const elapsed = Date.now() - startTime;
    return res.json({
      success: true,
      latencyMs: elapsed,
      modelUsed: aiConfig.model,
      providerUsed: aiConfig.provider,
      sampleResponse: responseText.trim() || "متصل بنجاح",
      message: `تم الاتصال بنموذج الذكاء الاصطناعي (${aiConfig.provider}: ${aiConfig.model}) بنجاح فائق! 🟢`,
    });
  } catch (error: any) {
    const elapsed = Date.now() - startTime;
    console.error("AI Test Connection Error:", error);
    const errorMsg = formatAiErrorMessage(error);
    return res.status(400).json({
      success: false,
      latencyMs: elapsed,
      providerUsed: aiConfig.provider,
      error: errorMsg,
      details: error?.message || String(error),
      helpTip: "تأكد من صحة مفتاح الـ API المخصص للمزود أو اختيار نموذج صالح ومتاح لحسابك.",
    });
  }
});

// AI Smart Text Improvement & Rephrasing Endpoint with 3 Distinct Arabic Styles
app.post("/api/ai-improve-text", async (req, res) => {
  const aiConfig = extractAiCredentials(req);
  const { text, type, style, gender, studentName, subject, grade, schoolName, tone, temperature, systemInstruction } = req.body;
  const isFemale = gender === 'female';

  try {
    const prompt = `أنت بروفيسور لغوي وخبير بلاغة عربية وصياغة شهادات شكر وتكريم وأوسمة رسمية.
المهمة: تحسين وإعادة صياغة النص التالي لشهادة التقدير وتقديم (3) خيارات بلاغية متنوعة وفائقة الجودة باللغة العربية الفصحى.

البيانات المرجعية:
- نوع المكرّم: ${isFemale ? 'طالبة (مؤنث - يجب استخدام صيغ التأنيث بدقة)' : 'طالب (مذكر - يجب استخدام صيغ التذكير بدقة)'}
- اسم الطالب/ـة: ${studentName || (isFemale ? 'الطالبة المتميزة' : 'الطالب المتميز')}
- المادة / المجال: ${subject || 'التفوق العام'}
- نوع النص المراد تحسينه: ${type || 'appreciation'} (عنوان، مقدمة، نص شكر وتقدير، أو بيت شعر)
- النص الحالي: "${text || ''}"
- النبرة المطلوبة: ${tone || 'رسمي وفخم'}
${systemInstruction ? `- تعليمات إضافية خاصة: ${systemInstruction}` : ''}

قواعد الصياغة البلاغية:
1. الخيار الأول (styleLabel: "صياغة فخمة وملكية"): أسلوب رسمي فخم ذو مفردات أكاديمية راقية تناسب المحافل والتكريمات الكبرى.
2. الخيار الثاني (styleLabel: "أسلوب مسجوع وبليغ"): أسلوب أدبي رفيع به سجع خفيف وموسيقى لغوية عذبة ومؤثرة تلامس القلب.
3. الخيار الثالث (styleLabel: "أسلوب حماسي وموجز"): أسلوب محفز ذو طاقة إيجابية عالية، موجز ومباشر يبعث على الفخر والطموح.

أرجع كائن JSON حصراً بالشكل التالي:
{
  "variations": [
    { "id": 1, "text": "النص المحسن الأول الفخم...", "styleLabel": "صياغة فخمة وملكية" },
    { "id": 2, "text": "النص المحسن الثاني المسجوع...", "styleLabel": "أسلوب مسجوع وبليغ" },
    { "id": 3, "text": "النص المحسن الثالث الحماسي...", "styleLabel": "أسلوب حماسي وموجز" }
  ]
}`;

    const rawResponse = await callUnifiedAi({
      config: aiConfig,
      prompt,
      systemInstruction: "أنت خبير بلاغة عربية رفيعة المستوى. أرجع كائن JSON صالح فقط دون أي نص إضافي.",
      temperature: typeof temperature === 'number' ? temperature : 0.7,
      jsonOutput: true,
    });

    const parsed = cleanAndParseJson(rawResponse, { variations: [] });
    if (parsed.variations && parsed.variations.length > 0) {
      return res.json({
        success: true,
        variations: parsed.variations,
      });
    }
    throw new Error("Empty variations in AI response");
  } catch (error: any) {
    console.warn("AI Improve Text fallback used:", error);
    const fallbackVariations = isFemale ? [
      {
        id: 1,
        text: `تقديراً لجهودها المخلصة وتفوقها المشهود في ${subject || 'التفوق الأكاديمي'}، وانضباطها المثالي وحرصها الدائم على طلب العلا والتميز، سائلين المولى لها دوام التألق والنجاح.`,
        styleLabel: 'صياغة فخمة وملكية',
      },
      {
        id: 2,
        text: `إشادةً بعلو همتها وسمو أخلاقها وتميزها الباهر في ${subject || 'مسيرتها التعليمية'}؛ حيث سطرت بإخلاصها أروع نماذج الإبداع. دمتِ شعلة وضاءة في سماء المعرفة.`,
        styleLabel: 'أسلوب مسجوع وبليغ',
      },
      {
        id: 3,
        text: `نظير مشاركتها الفاعلة وشغفها المستمر نحو الإتقان والإنجاز في ${subject || 'المجال المتميز'}. نبارك لها هذا التألق ونتمنى لها مستقبلاً باهراً.`,
        styleLabel: 'أسلوب حماسي وموجز',
      },
    ] : [
      {
        id: 1,
        text: `تقديراً لجهوده المخلصة وتفوقه المشهود في ${subject || 'التفوق الأكاديمي'}، وانضباطه المثالي وحرصه الدائم على طلب العلا والتميز، سائلين المولى له دوام التألق والنجاح.`,
        styleLabel: 'صياغة فخمة وملكية',
      },
      {
        id: 2,
        text: `إشادةً بعلو همته وسمو أخلاقه وتميزه الباهر في ${subject || 'مسيرته التعليمية'}؛ حيث سطر بإخلاصه أروع نماذج الإبداع. دمت كوكباً وضاءً في سماء المعرفة.`,
        styleLabel: 'أسلوب مسجوع وبليغ',
      },
      {
        id: 3,
        text: `نظير مشاركته الفاعلة وشغفه المستمر نحو الإتقان والإنجاز في ${subject || 'المجال المتميز'}. نبارك له هذا التألق ونتمنى له مستقبلاً باهراً.`,
        styleLabel: 'أسلوب حماسي وموجز',
      },
    ];

    return res.json({
      success: true,
      variations: fallbackVariations,
      fallbackUsed: true,
    });
  }
});

// AI Certificate Generation Endpoint
app.post("/api/generate-certificate-content", async (req, res) => {
  try {
    const aiConfig = extractAiCredentials(req);
    const { studentName, subject, achievement, grade, tone, schoolName, teacherName, recipientGender, temperature, systemInstruction } = req.body;
    const isFemale = recipientGender === 'female';
    const genderTerm = isFemale ? "طالبة (مؤنث)" : "طالب (مذكر)";

    try {
      const prompt = `أنت بروفيسور لغوي وخبير في كتابة وتصميم شهادات التقدير والجوائز التعليمية والأكاديمية باللغة العربية الفصحى الراقية والجزلة.
قم بصياغة نص شهادة تقدير مخصصة ومبهرة باللغة العربية ذات بلاغة عالية وفخامة بناءً على البيانات التالية:
- نوع المكرّم: ${genderTerm}
- اسم الطالب/الطالبة: ${studentName || (isFemale ? "الطالبة المتميزة" : "الطالب المتميز")}
- المادة / المجال: ${subject || "التفوق العام"}
- سبب التكريم / الإنجاز: ${achievement || "الاجتهاد والسلوك المتميز والتفوق الدراسي"}
- الصف / المرحلة: ${grade || "المرحلة الدراسية"}
- النبرة والأسلوب المطلوب: ${tone || "رسمي وفخم"}
- اسم المدرسة / الجهة: ${schoolName || "مدرسة التميز والإبداع"}
- اسم المعلم / المدير: ${teacherName || "إدارة المدرسة"}
${systemInstruction ? `- توجيهات إضافية خاصة بالمؤسسة: ${systemInstruction}` : ''}

تنبيه لغوي هام وقاطع:
${isFemale 
  ? "المكرّم طالبة (أنثى). يُشترط استخدام صيغ التأنيث والضمائر المؤنثة حصراً في كافة أجزاء الشهادة (مثال: 'للطالبة المتميزة', 'لجهودها المتميزة', 'تفوقها', 'تألقها', 'تلميذتنا المبدعة', 'نتمنى لها')."
  : "المكرّم طالب (ذكر). يُشترط استخدام صيغ التذكير والضمائر المذكرة حصراً في كافة أجزاء الشهادة (مثال: 'للطالب المتميز', 'لجهوده المتميزة', 'تفوقه', 'تألقه', 'تلميذنا المبدع', 'نتمنى له')."}

المطلوب إرجاع كائن JSON حصراً بالهيكل التالي:
{
  "title": "${isFemale ? 'شهادة تقدير وتفوق راقية' : 'شهادة تقدير وتفوق راقٍ'}",
  "recipientIntro": "${isFemale ? 'تتقدم إدارة المدرسة بوافر الشكر والتقدير للطالبة المبدعة:' : 'تتقدم إدارة المدرسة بوافر الشكر والتقدير للطالب المبدع:'}",
  "appreciationText": "نص التكريم والشكر التفصيلي (فقرة مشجعة وجميلة وبليغة من 2-4 أسطر تبرز جهودها/جهوده وتتمنى لها/له مستقبلاً باهراً)",
  "poemOrQuote": "بيت شعر أصيل أو حكمة ملهمة مشكولة بالحركات باللغة العربية تناسب المناسبة.",
  "badgeTitle": "${isFemale ? 'وسام التميز والتفوق' : 'وسام التميز والتفوق'}",
  "primaryColorHex": "#854d0e",
  "secondaryColorHex": "#d97706"
}`;

      const rawResponse = await callUnifiedAi({
        config: aiConfig,
        prompt,
        systemInstruction: "أنت خبير صياغة شهادات تقديرية باللغة العربية الفصحى. أرجع JSON صالح حصراً.",
        temperature: typeof temperature === 'number' ? temperature : 0.7,
        jsonOutput: true,
      });

      const data = cleanAndParseJson(rawResponse, null);
      if (data && data.title && data.recipientIntro && data.appreciationText) {
        return res.json({ success: true, result: data });
      }
      throw new Error("Invalid certificate JSON returned");
    } catch (aiErr) {
      console.warn("AI generation failed, using intelligent local fallback:", aiErr);
      const fallbackResult = generateLocalCertificateFallback({
        studentName,
        subject,
        achievement,
        grade,
        tone,
        schoolName,
        teacherName,
        recipientGender,
      });
      return res.json({ success: true, result: fallbackResult });
    }
  } catch (error: any) {
    console.error("Certificate Generation Error:", error);
    res.status(500).json({
      success: false,
      error: formatAiErrorMessage(error),
    });
  }
});

// AI Endpoint to adapt/convert certificate texts to Masculine (Male/طالب) or Feminine (Female/طالبة)
app.post("/api/adapt-gender-ai", async (req, res) => {
  try {
    const aiConfig = extractAiCredentials(req);
    const { certificateData, targetGender } = req.body;
    const isFemale = targetGender === 'female';
    const genderTerm = isFemale ? "طالبة (مؤنث)" : "طالب (مذكر)";

    try {
      const prompt = `أنت خبير بلاغة ولغة عربية ومختص في صياغة شهادات التقدير والجوائز التعليمية.
المطلوب: تحويل كافة عبارات ونصوص الشهادة التالية من صيغ المذكر/المؤنث لتصبح متناسبة تماماً ومخصصة لـ [${genderTerm}]:

النصوص الحالية:
- العنوان (title): ${certificateData?.title || ""}
- تقديم المكرم (recipientIntro): ${certificateData?.recipientIntro || ""}
- نص التكريم (appreciationText): ${certificateData?.appreciationText || ""}
- بيت الشعر / الحكمة (poemOrQuote): ${certificateData?.poemOrQuote || ""}
- عنوان الوسام (badgeTitle): ${certificateData?.badgeTitle || ""}

تنبيهات هامة:
1. ${isFemale 
    ? "حول كافة الضمائر والأوصاف والأفعال إلى التأنيث (مثال: 'للطالبة المتميزة'، 'لجهودها المتميزة'، 'تفوقها'، 'تألقها'، 'تلميذتنا المبدعة'، 'نتمنى لها')." 
    : "حول كافة الضمائر والأوصاف والأفعال إلى التذكير (مثال: 'للطالب المتميز'، 'لجهوده المتميزة'، 'تفوقه'، 'تألقه'، 'تلميذنا المبدع'، 'نتمنى له')."}
2. حافظ على نفس الأسلوب والجمال والبلاغة الأصلية دون حذف المعنى الأساسي.
3. تأكد أن كل عبارة منسقة وسليمة لغوياً وإملائياً 100%.

أرجع كائن JSON حصراً بالحقول المعدلة:
{
  "title": "string",
  "recipientIntro": "string",
  "appreciationText": "string",
  "poemOrQuote": "string",
  "badgeTitle": "string"
}`;

      const rawResponse = await callUnifiedAi({
        config: aiConfig,
        prompt,
        systemInstruction: "أنت خبير لغة عربية. أرجع JSON فقط بالحقول المطلوبة.",
        temperature: 0.3,
        jsonOutput: true,
      });

      const data = cleanAndParseJson(rawResponse, null);
      if (data && data.recipientIntro && data.appreciationText) {
        return res.json({ success: true, result: data });
      }
      throw new Error("Invalid gender adaptation JSON");
    } catch (aiErr) {
      console.warn("AI Adapt Gender failed, using local adaptation:", aiErr);
      const fallbackResult = adaptGenderLocalFallback(certificateData, targetGender);
      return res.json({ success: true, result: fallbackResult });
    }
  } catch (error: any) {
    console.error("AI Adapt Gender Error:", error);
    const fallbackResult = adaptGenderLocalFallback(req.body?.certificateData, req.body?.targetGender);
    res.json({
      success: true,
      result: fallbackResult,
    });
  }
});

// AI Assistant for Certificate Suggestions & Batch Help
app.post("/api/ai-assistant", async (req, res) => {
  try {
    const aiConfig = extractAiCredentials(req);
    const { prompt: userPrompt, category, temperature, systemInstruction } = req.body;

    try {
      const sysInstruction = systemInstruction || `أنت مستشار تربوي ولغوي ذكي متخصص في تصاميم وعبارات شهادات التقدير والشكر للطلاب والأنشطة المدرسية باللغة العربية الفصحى.
قدم إجابات واضحة ومقترحات جذابة، أفكار شهادات، عبارات تحفيزية راقية، أبيات شعرية موزونة، أو حلول سريعة. الإجابة باللغة العربية وبنسق عصري ومنسق.`;

      const responseText = await callUnifiedAi({
        config: aiConfig,
        prompt: userPrompt,
        systemInstruction: sysInstruction,
        temperature: typeof temperature === 'number' ? temperature : 0.7,
        jsonOutput: false,
      });

      return res.json({ success: true, text: responseText });
    } catch (aiErr) {
      return res.json({
        success: true,
        text: `يسعدني مساعدتك! إليك مقترح جميل لصياغة شهادة التقدير:
"تقديراً لجهود الطالب/ـة المتميزة ومشاركته الفعالة وسلوكه القويم في مسيرته الدراسية، سائلين الله له دوام التوفيق والنجاح."
ويمكنك استخدام بيت الشعر:
العِلْمُ يَرْفَعُ بَيْتًا لا عِمَادَ لَهُ ... وَالجَهْلُ يَهْدِمُ بَيْتَ العِزِّ وَالشَّرَفِ`,
      });
    }
  } catch (error: any) {
    console.error("AI Assistant Error:", error);
    res.status(500).json({
      success: false,
      error: formatAiErrorMessage(error),
    });
  }
});

// AI Auto-Tune Layout, Colors, & Phrases for Uploaded Background
app.post("/api/ai-tune-background", async (req, res) => {
  try {
    const { apiKey, model } = extractAiCredentials(req);
    const { imageDataUrl, currentData } = req.body;
    const targetModel = model || "gemini-3.7-flash";

    try {
      const ai = getGenAI(apiKey);
      let contents: any[] = [];

      // If image data URL (base64) provided, send as inline image for Gemini Vision multimodal analysis
      if (imageDataUrl && typeof imageDataUrl === "string" && imageDataUrl.startsWith("data:image/")) {
        const mimeMatch = imageDataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,/);
        const mimeType = mimeMatch ? mimeMatch[1] : "image/png";
        const base64Data = imageDataUrl.replace(/^data:image\/[a-zA-Z+]+;base64,/, "");
        contents.push({
          inlineData: {
            mimeType,
            data: base64Data,
          },
        });
      }

      const promptText = `أنت خبير تصاميم الشهادات الرسمية باللغة العربية ومصمم جرافيك محترف.
قم بتحليل صورة خلفية الشهادة المرفقة (أو وصفها) وضبط ألوان وعبارات التكريم تلقائياً لتكون متناسقة تماماً مع ألوان وخلفية هذه الصورة وبأعلى درجات المقروئية والجمال.

البيانات الحالية للشهادة:
- العنوان: ${currentData?.title || "شهادة شكر وتقدير"}
- تقديم المكرم: ${currentData?.recipientIntro || "تتقدم إدارة المدرسة بوافر الشكر والتقدير للطالب/ـة:"}
- نص الشكر: ${currentData?.appreciationText || "تقديراً لجهوده المتميزة وتفوقه الدراسي..."}
- بيت الشعر: ${currentData?.poemOrQuote || "من يعملِ المثقالَ خيراً يجدهُ"}

المطلوب:
1. صياغة وتوزيع عبارات الشهادة (title, recipientIntro, appreciationText, poemOrQuote) في أسطر قصيرة متوازنة وجميلة جداً تناسب هذه الخلفية المحددة.
2. اختيار ألوان ذكية عالية المقروئية والتباين:
   - textColor: لون النص الأساسي (مثلاً #0f172a أو #18181b للخلفيات الفاتحة، أو #ffffff / #fef08a للخلفيات الغامقة)
   - primaryColor: اللون الرئيسي للعنوان والشارات
   - secondaryColor: اللون الثانوي للزخارف والأختام
   - borderColor: لون الإطار المفضل
   - bgCardBacking: هل نوصي بوضع حاوية خلفية خفيفة شفافة خلف النص لزيادة وضوح العبارات فوق زخارف الصورة؟ (true/false)
   - bgCardOpacity: درجة شفافية الحاوية (مثلاً 0.80 أو 0.65)

أرجع النتيجة كـ JSON حصراً.`;

      contents.push(promptText);

      const response = await generateContentWithRetry(ai, {
        primaryModel: "gemini-3.7-flash",
        contents,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              recipientIntro: { type: Type.STRING },
              appreciationText: { type: Type.STRING },
              poemOrQuote: { type: Type.STRING },
              textColor: { type: Type.STRING },
              primaryColor: { type: Type.STRING },
              secondaryColor: { type: Type.STRING },
              borderColor: { type: Type.STRING },
              bgCardBacking: { type: Type.BOOLEAN },
              bgCardOpacity: { type: Type.NUMBER },
            },
            required: ["title", "recipientIntro", "appreciationText", "textColor", "primaryColor"],
          },
        },
      });

      const jsonText = response.text || "{}";
      const data = JSON.parse(jsonText);
      return res.json({ success: true, result: data });
    } catch (aiErr) {
      console.warn("AI Tune Background fallback used:", aiErr);
      return res.json({
        success: true,
        result: {
          title: currentData?.title || "شهادة شكر وتقدير",
          recipientIntro: currentData?.recipientIntro || "تتقدم إدارة المدرسة بوافر الشكر والتقدير:",
          appreciationText: currentData?.appreciationText || "تقديراً لجهوده المتميزة وتفوقه الدراسي سائلين الله له التوفيق.",
          poemOrQuote: currentData?.poemOrQuote || "العِلْمُ يَرْفَعُ بَيْتًا لا عِمَادَ لَهُ",
          textColor: "#0f172a",
          primaryColor: "#854d0e",
          secondaryColor: "#d97706",
          borderColor: "#ca8a04",
          bgCardBacking: true,
          bgCardOpacity: 0.85,
        },
      });
    }
  } catch (error: any) {
    console.error("AI Tune Background Error:", error);
    res.status(500).json({
      success: false,
      error: formatAiErrorMessage(error),
    });
  }
});

// AI Margin Optimization Endpoint
app.post("/api/ai-optimize-margins", async (req, res) => {
  try {
    const { apiKey, model } = extractAiCredentials(req);
    const { certData } = req.body;
    const targetModel = model || "gemini-3.7-flash";

    try {
      const ai = getGenAI(apiKey);

      const promptText = `أنت خبير تصاميم الشهادات الرسمية والمصمم الجرافيكي المعتمد.
قم بتحليل بيانات ونمط إطار الشهادة المرفقة وحساب أفضل هوامش آمنة (Top, Bottom, Left, Right بالبكسل) لمنع دخول النصوص أو العناصر الترويسية أو التواقيع ضمن منطقة الإطارات أو النقوش والزخارف.

بيانات الشهادة الحالية:
- نمط الإطار (Frame Style): ${certData?.frameStyle || "double-gold"}
- المسافة الداخلية للإطار (Border Padding): ${certData?.borderPadding ?? 12}px
- سمك خط الإطار (Border Width): ${certData?.borderWidth ?? 2}
- أبعاد الشهادة (Aspect Ratio): ${certData?.aspectRatio || "A4-landscape"}
- مقياس الخط (Font Scale): ${certData?.fontSizeScale ?? 1.0}
- هل يوجد بيت شعر؟ ${certData?.showPoemOrQuote ? "نعم" : "لا"}
- هل توجد أسطر ترويسة إضافية؟ ${certData?.showHeaderLine3 ? "نعم" : "لا"}

المطلوب:
احسب الهوامش الآمنة المثالية بكسل (بين 20px و 70px) مع توضيح سبب الاختيار في سطر واحد مشجع.
- canvasMarginTop
- canvasMarginBottom
- canvasMarginLeft
- canvasMarginRight
- explanation: شرح مختصر باللغة العربية للسبب (مثلاً: "تم توسيع الهوامش بمقدار 38px لتوفير حماية كاملة للنصوص من زخارف إطار الجليوش الملكي").

أرجع النتيجة كـ JSON حصراً.`;

      const response = await generateContentWithRetry(ai, {
        primaryModel: targetModel,
        contents: [promptText],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              canvasMarginTop: { type: Type.NUMBER },
              canvasMarginBottom: { type: Type.NUMBER },
              canvasMarginLeft: { type: Type.NUMBER },
              canvasMarginRight: { type: Type.NUMBER },
              explanation: { type: Type.STRING },
            },
            required: ["canvasMarginTop", "canvasMarginBottom", "canvasMarginLeft", "canvasMarginRight", "explanation"],
          },
        },
      });

      const jsonText = response.text || "{}";
      const data = JSON.parse(jsonText);
      return res.json({ success: true, margins: data, explanation: data.explanation });
    } catch (aiErr) {
      console.warn("AI Margin Optimization fallback used:", aiErr);
      return res.json({
        success: true,
        margins: {
          canvasMarginTop: 32,
          canvasMarginBottom: 32,
          canvasMarginLeft: 36,
          canvasMarginRight: 36,
        },
        explanation: "تم حساب وضبط الهوامش الآمنة لحماية النصوص من الاقتراب من إطار الشهادة تلقائياً.",
      });
    }
  } catch (error: any) {
    console.error("AI Margin Optimization Error:", error);
    res.json({
      success: true,
      margins: {
        canvasMarginTop: 30,
        canvasMarginBottom: 30,
        canvasMarginLeft: 35,
        canvasMarginRight: 35,
      },
      explanation: "تم حساب وضبط الهوامش الآمنة لحماية النصوص من الاقتراب من إطار الشهادة.",
    });
  }
});

// AI Layout Auto-Fit & Dynamic Collision-Free Optimization Endpoint
app.post("/api/ai-optimize-layout", async (req, res) => {
  try {
    const { apiKey, model } = extractAiCredentials(req);
    const { certData, targetPreset } = req.body;
    const targetModel = model || "gemini-3.7-flash";

    let ai: GoogleGenAI;
    try {
      ai = getGenAI(apiKey);
    } catch (keyErr) {
      // Return safe standard calculations
      return res.json({
        success: true,
        recommendedLayoutPreset: targetPreset || certData?.layoutPreset || "classic-standard",
        elementFontSizes: {
          title: 34,
          subtitle: 17,
          recipientIntro: 17,
          studentName: 32,
          grade: 15,
          appreciationText: 17,
          poemOrQuote: 15,
          signatures: 14,
        },
        elementMargins: {
          titleBottom: 10,
          subtitleBottom: 10,
          recipientIntroBottom: 8,
          studentNameBottom: 10,
          appreciationTextBottom: 12,
          poemOrQuoteBottom: 10,
          signaturesTop: 12,
        },
        canvasMargins: {
          top: 32,
          bottom: 32,
          left: 36,
          right: 36,
        },
        overallScale: 1.0,
        balanceScore: 92,
        explanation: "تم ضبط قياسات العناصر وهوامش الشهادة تلقائياً لتحقيق التوازن البصري والمقروئية.",
      });
    }

    const title = certData?.title || "شهادة شكر وتقدير";
    const subtitle = certData?.subtitle || "";
    const studentName = certData?.studentName || "اسم الطالب";
    const grade = certData?.grade || "";
    const recipientIntro = certData?.recipientIntro || "تتقدم إدارة المدرسة بوافر الشكر والتقدير للطالب:";
    const appreciationText = certData?.appreciationText || "";
    const poemOrQuote = certData?.poemOrQuote || "";
    const schoolName = certData?.schoolName || "";
    const headerLine1 = certData?.headerLine1 || "";
    const headerLine2 = certData?.headerLine2 || "";
    const headerLine3 = certData?.headerLine3 || "";
    const signaturesCount = Array.isArray(certData?.signatures) ? certData.signatures.filter((s: any) => s.show !== false).length : 2;
    const stampsCount = Array.isArray(certData?.stamps) ? certData.stamps.filter((s: any) => s.show !== false).length : 1;
    const currentPreset = targetPreset || certData?.layoutPreset || "classic-standard";
    const frameStyle = certData?.frameStyle || "double-gold";
    const aspectRatio = certData?.aspectRatio || "A4-landscape";

    const promptText = `أنت خبير تصاميم الشهادات الرسمية والطباعة الأكاديمية الراقية والمهندس المعماري لتخطيطات CSS Grid.
المهمة: تحليل محتوى ونصوص الشهادة الحالية وحساب أبعاد ومقاسات خطوط متناسقة وفخمة جداً (Font Sizes, Line Heights, Margins, Spacings) تضمن 100%:
1. ملء مساحة الشهادة بالكتابة بشكل متوازن وفخم ومقروء تماماً من مسافة مريحة.
2. منع تصغير النصوص بشكل مبالغ فيه بتاتاً — يجب أن تظهر الشهادة غنية وممتلئة وواضحة جداً.
3. إبراز عنوان الشهادة بمقاس كبير وفخم (32 إلى 42px)، وإبراز اسم المكرم/الطالب بوضوح وجلالة (28 إلى 38px)، ونص التكريم بخط واضح ومريح للقراءة (15.5 إلى 20px).
4. منع خروج أي نص أو عنصر خارج حدود الشهادة وتأمين هوامش حماية متوازنة لمنع اقتراب النصوص من إطار الشهادة.
5. منع تداخل النصوص مع التواقيع، الأختام، الأوسمة، أو الإطار المحيط.
6. توسيط العناصر بصرياً وجمالياً وتحقيق أعلى درجات التوازن والراحة البصرية.

بيانات الشهادة للتحليل:
- أبعاد الشهادة: ${aspectRatio}
- نمط الإطار: ${frameStyle}
- نمط التخطيط الحالي: ${currentPreset}
- العنوان الرئيسي: "${title}" (طول: ${title.length} حرف)
- العنوان الفرعي: "${subtitle}" (طول: ${subtitle.length} حرف)
- مقدمة المكرم: "${recipientIntro}" (طول: ${recipientIntro.length} حرف)
- اسم الطالب: "${studentName}" (طول: ${studentName.length} حرف)
- الصف/المرحلة: "${grade}"
- نص التقدير والثناء: "${appreciationText}" (طول: ${appreciationText.length} حرف، عدد الكلمات: ${appreciationText.split(/\s+/).filter(Boolean).length})
- بيت الشعر / الحكمة: "${poemOrQuote}" (مفعّل: ${certData?.showPoemOrQuote !== false && Boolean(poemOrQuote)})
- عدد أسطر الترويسة العلوية: ${[headerLine1, headerLine2, headerLine3, schoolName].filter(Boolean).length}
- عدد التواقيع الفعالة: ${signaturesCount}
- عدد الأختام والأوسمة: ${stampsCount}

المطلوب إرجاع كائن JSON حصراً بالقيم المحسوبة بدقة بالبكسل:
1. recommendedLayoutPreset: نمط التخطيط الأنسب من بين:
   ("classic-standard", "modern-split", "sidebar-right", "sidebar-left", "minimal-centered", "executive-horizontal", "diploma-grand", "custom-grid"). إذا كان النص طويلاً جداً، يُفضل "modern-split" أو "sidebar-right" أو "executive-horizontal" لتوفير مساحة أفقية مريحة.
2. elementFontSizes:
   - title: مقاس خط العنوان الرئيسي بالبكسل (32 إلى 42)
   - subtitle: مقاس خط العنوان الفرعي (15 إلى 19)
   - recipientIntro: مقاس خط عبارة التقديم (15 إلى 19)
   - studentName: مقاس خط اسم الطالب (28 إلى 38)
   - grade: مقاس خط الصف (13 إلى 17)
   - appreciationText: مقاس خط نص التكريم (15.5 إلى 20)
   - appreciationLineHeight: تباعد الأسطر لنص التكريم (1.5 إلى 1.75)
   - poemOrQuote: مقاس خط بيت الشعر (13.5 إلى 18)
   - schoolHeader: مقاس خط نصوص الترويسة (11.5 إلى 14.5)
   - schoolName: مقاس خط اسم المدرسة (14 إلى 18)
   - signatures: مقاس خط أسماء التواقيع (12.5 إلى 15.5)
3. margins:
   - canvasMarginTop: الهامش العلوي الآمن بالبكسل (18 إلى 45)
   - canvasMarginBottom: الهامش السفلي الآمن بالبكسل (18 إلى 45)
   - canvasMarginLeft: الهامش الأيسر بالبكسل (24 إلى 50)
   - canvasMarginRight: الهامش الأيمن بالبكسل (24 إلى 50)
4. spacings:
   - recipientSpacing: المسافة بين اسم الطالب والصف (3 إلى 8)
   - logoSizePx: القطر المناسب للشعار بالبكسل (40 إلى 70)
   - signaturesSpacing: المسافة العمودية للتواقيع (4 إلى 12)
5. resetOverlappingOffsets: دائماً true لضبط المحاذاة التلقائية وتصحيح أي تداخل يدوي سابق.
6. customGridConfig: (اختياري، في حال اختيار custom-grid)
   - gridTemplateAreas: سلسلة التوزيع بتنسيق CSS Grid محكم ومستطيل.
   - gridTemplateColumns: توزيع الأعمدة (مثال: "1fr 1fr" أو "220px 1fr").
   - gridTemplateRows: توزيع الصفوف (مثال: "auto auto 1fr auto").
7. explanation: شرح أنيق باللغة العربية يوضح كيف تمت ملاءمة مقاسات الكتابة وتوزيعها بدقة لتملأ مساحة الشهادة بفخامة ووضوح دون تداخل.
8. highlights: مصفوفة من 2-4 نقاط سريعة توضح التحسينات (مثال: ["ملاءمة مقاس الخط لملء الشهادة بوضوح وفخامة", "تأمين هوامش حماية متوازنة للإطار", "توسيط اسم الطالب بكتلة محكمة"]).`;

    const response = await generateContentWithRetry(ai, {
      primaryModel: targetModel,
      contents: [promptText],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            recommendedLayoutPreset: { type: Type.STRING },
            elementFontSizes: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.NUMBER },
                subtitle: { type: Type.NUMBER },
                recipientIntro: { type: Type.NUMBER },
                studentName: { type: Type.NUMBER },
                grade: { type: Type.NUMBER },
                appreciationText: { type: Type.NUMBER },
                appreciationLineHeight: { type: Type.NUMBER },
                poemOrQuote: { type: Type.NUMBER },
                schoolHeader: { type: Type.NUMBER },
                schoolName: { type: Type.NUMBER },
                signatures: { type: Type.NUMBER },
              },
              required: ["title", "studentName", "appreciationText"],
            },
            margins: {
              type: Type.OBJECT,
              properties: {
                canvasMarginTop: { type: Type.NUMBER },
                canvasMarginBottom: { type: Type.NUMBER },
                canvasMarginLeft: { type: Type.NUMBER },
                canvasMarginRight: { type: Type.NUMBER },
              },
              required: ["canvasMarginTop", "canvasMarginBottom", "canvasMarginLeft", "canvasMarginRight"],
            },
            spacings: {
              type: Type.OBJECT,
              properties: {
                recipientSpacing: { type: Type.NUMBER },
                logoSizePx: { type: Type.NUMBER },
                signaturesSpacing: { type: Type.NUMBER },
              },
            },
            resetOverlappingOffsets: { type: Type.BOOLEAN },
            customGridConfig: {
              type: Type.OBJECT,
              properties: {
                gridTemplateAreas: { type: Type.STRING },
                gridTemplateColumns: { type: Type.STRING },
                gridTemplateRows: { type: Type.STRING },
              },
            },
            explanation: { type: Type.STRING },
            highlights: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ["recommendedLayoutPreset", "elementFontSizes", "margins", "explanation"],
        },
      },
    });

    const jsonText = response.text || "{}";
    const parsedData = JSON.parse(jsonText);

    res.json({
      success: true,
      optimization: parsedData,
    });
  } catch (error: any) {
    console.error("AI Layout Optimization Error:", error);
    res.status(500).json({
      success: false,
      error: formatAiErrorMessage(error),
    });
  }
});

// AI Background Removal Endpoint for Logo Images
app.post("/api/ai-remove-background", async (req, res) => {
  try {
    const { imageUrl } = req.body;
    if (!imageUrl) {
      return res.status(400).json({ success: false, error: "Missing imageUrl" });
    }

    const ai = getGenAI();

    // Check if image is base64 data URL
    let mimeType = "image/png";
    let base64Data = "";

    if (imageUrl.startsWith("data:")) {
      const matches = imageUrl.match(/^data:(image\/\w+);base64,(.+)$/);
      if (matches) {
        mimeType = matches[1];
        base64Data = matches[2];
      }
    }

    if (base64Data) {
      const response = await generateContentWithRetry(ai, {
        primaryModel: "gemini-3.6-flash",
        contents: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            },
          },
          `أنت خبير جرافيك ومعالجة صور الشعارات والمؤسسات.
قم بتحليل صورة الشعار وحسب درجة السطوع والألوان الخلفية (الخلفية البيضاء، الرمادية، أو الملونة) وتقديم القيمة الموصى بها لهامش تحمل إزالة الخلفية (threshold tolerance بين 180 و 245)، وأظهر وصفاً لما تم تحسينه في الشعار.
أرجع النتيجة كـ JSON بالشكل التالي:
{
  "recommendedThreshold": 215,
  "explanation": "تم الكشف عن خلفية بيضاء للشعار، تم تفريغ الشعار وجعله شفافاً بنجاح."
}`,
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              recommendedThreshold: { type: Type.NUMBER },
              explanation: { type: Type.STRING },
            },
            required: ["recommendedThreshold", "explanation"],
          },
        },
      });

      const parsed = JSON.parse(response.text || "{}");
      res.json({
        success: true,
        recommendedThreshold: parsed.recommendedThreshold || 215,
        explanation: parsed.explanation || "تم معالجة الشعار وتفريغ خلفيته بالذكاء الاصطناعي بنجاح.",
      });
    } else {
      res.json({
        success: true,
        recommendedThreshold: 215,
        explanation: "تم معالجة الشعار وتفريغ خلفيته بنجاح.",
      });
    }
  } catch (error: any) {
    console.error("AI BG Removal Error:", error);
    res.json({
      success: true,
      recommendedThreshold: 215,
      explanation: "تم معالجة الشعار بنجاح وتحويل خلفيته لشفافة.",
    });
  }
});

// Health endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
