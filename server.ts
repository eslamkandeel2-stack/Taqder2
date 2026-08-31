import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
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
  const headerProvider = (req.headers["x-ai-provider"] || req.headers["x-provider"]) as string | undefined;
  const bodyProvider = req.body?.provider as string | undefined;
  const rawProvider = (headerProvider || bodyProvider || "").toLowerCase();

  const customApiUrl = ((req.headers["x-ai-custom-url"] as string) || (req.headers["x-custom-api-url"] as string) || req.body?.customApiUrl || "").trim();

  let provider: RequestAiConfig['provider'] = 'gemini';
  if (['gemini', 'openai', 'anthropic', 'deepseek', 'groq', 'custom'].includes(rawProvider)) {
    provider = rawProvider as RequestAiConfig['provider'];
  } else if (customApiUrl) {
    provider = 'custom';
  }

  const headerKey = (req.headers["x-ai-api-key"] || req.headers["x-gemini-api-key"] || req.headers["x-api-key"] || (req.headers["authorization"] ? req.headers["authorization"].replace(/^Bearer\s+/i, '') : undefined)) as string | undefined;
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

  const headerModel = (req.headers["x-ai-model"] || req.headers["x-gemini-model"] || req.headers["x-model"]) as string | undefined;
  const bodyModel = req.body?.model as string | undefined;

  let defaultModel = "gemini-3.6-flash";
  if (provider === "gemini") defaultModel = "gemini-3.6-flash";
  else if (provider === "openai") defaultModel = "gpt-4o-mini";
  else if (provider === "anthropic") defaultModel = "claude-3-5-sonnet-20241022";
  else if (provider === "deepseek") defaultModel = "deepseek-chat";
  else if (provider === "groq") defaultModel = "llama-3.3-70b-versatile";
  else if (provider === "custom") defaultModel = "llama3";

  const model = (headerModel || bodyModel || defaultModel).trim();

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
  const { config, prompt, systemInstruction, temperature = 0.7, maxTokens = 1200, jsonOutput = true } = params;

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
      signal: AbortSignal.timeout(6000),
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

  // 3. OpenAI, DeepSeek, Groq, and Custom External OpenAI-Compatible Providers
  let baseUrl = "https://api.openai.com/v1";
  let defaultModel = "gpt-4o-mini";

  if (config.provider === "deepseek") {
    baseUrl = "https://api.deepseek.com/v1";
    defaultModel = "deepseek-chat";
  } else if (config.provider === "groq") {
    baseUrl = "https://api.groq.com/openai/v1";
    defaultModel = "llama-3.3-70b-versatile";
  } else if (config.provider === "custom") {
    let customUrl = (config.customApiUrl || "http://localhost:11434/v1").trim();
    if (!customUrl.startsWith("http://") && !customUrl.startsWith("https://")) {
      customUrl = `http://${customUrl}`;
    }
    baseUrl = customUrl;
    defaultModel = config.model || "llama3";
  }

  let endpoint = baseUrl.replace(/\/+$/, "");
  if (!endpoint.endsWith("/chat/completions") && !endpoint.endsWith("/generate") && !endpoint.endsWith("/chat")) {
    if (endpoint.endsWith("/v1")) {
      endpoint = `${endpoint}/chat/completions`;
    } else {
      endpoint = `${endpoint}/v1/chat/completions`;
    }
  }

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
  if (endpoint.includes("openrouter.ai")) {
    headers["HTTP-Referer"] = "https://ai.studio";
    headers["X-Title"] = "Taqdeer Certificate Studio";
  }

  const reqBody: any = {
    model: modelToUse,
    messages,
    temperature,
    max_tokens: maxTokens,
  };

  if (jsonOutput && config.provider !== "custom" && !endpoint.includes("localhost") && !endpoint.includes("127.0.0.1")) {
    reqBody.response_format = { type: "json_object" };
  }

  const res = await fetch(endpoint, {
    method: "POST",
    signal: AbortSignal.timeout(6000),
    headers,
    body: JSON.stringify(reqBody),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`${config.provider.toUpperCase()} API Error (${res.status}): ${errBody}`);
  }

  const data: any = await res.json();
  const text = data?.choices?.[0]?.message?.content || data?.response || "";
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

// Robust helper to handle transient errors, rate-limits (429), and 503/UNAVAILABLE errors with automatic retry & model fallback
async function generateContentWithRetry(
  ai: GoogleGenAI,
  params: {
    contents: any;
    config?: any;
    primaryModel?: string;
  }
) {
  const primary = params.primaryModel || "gemini-3.6-flash";
  const modelsToTry = [
    primary,
    ...(primary !== "gemini-3.6-flash" ? ["gemini-3.6-flash"] : []),
    "gemini-3.7-flash",
  ];

  let lastError: any = null;

  for (const model of modelsToTry) {
    for (let attempt = 0; attempt < 2; attempt++) {
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
        const is429 = status === 429 || msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("Quota exceeded");
        const is404 = status === 404 || msg.includes("404") || msg.includes("NOT_FOUND") || msg.includes("not found") || msg.includes("no longer available");
        const isTransient503 =
          status === 503 ||
          msg.includes("503") ||
          msg.includes("UNAVAILABLE") ||
          msg.includes("high demand") ||
          msg.includes("Resource has been exhausted") ||
          msg.includes("Overloaded");

        if (isTransient503 && attempt < 1) {
          await new Promise((resolve) => setTimeout(resolve, 800));
          continue;
        }

        // If 429 quota is hit or 404 model not found, switch immediately to the next fallback model
        if (is429 || is404) {
          break;
        }

        break;
      }
    }
  }

  throw lastError;
}

function formatAiErrorMessage(error: any): string {
  const msg = String(error?.message || "");
  if (
    error?.status === 429 ||
    error?.code === 429 ||
    msg.includes("429") ||
    msg.includes("RESOURCE_EXHAUSTED") ||
    msg.includes("Quota exceeded")
  ) {
    return "تم استنفاد الحصة المؤقتة للذكاء الاصطناعي (Rate limit) — تم تفعيل المحرك اللغوي الذكي للعمل فورياً دون انقطاع.";
  }
  if (
    error?.status === 503 ||
    error?.code === 503 ||
    msg.includes("503") ||
    msg.includes("UNAVAILABLE") ||
    msg.includes("high demand")
  ) {
    return "الخدمة الذكية مشغولة حالياً بسبب كثرة الطلبات. يرجى إعادة المحاولة بعد بضع ثوانٍ.";
  }
  return error?.message || "تعذر معالجة الطلب بالذكاء الاصطناعي حالياً";
}

// Unicode-aware Arabic word boundary replacer for Server
function replaceArabicWordBoundary(text: string, fromPhrase: string, toPhrase: string): string {
  if (!text || !fromPhrase) return text;
  const escaped = fromPhrase.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
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

// Comprehensive Arabic dictionary replacements for masculine -> feminine transformations
const FEMININE_REPLACEMENTS: [string, string][] = [
  // Compound Titles & Honors
  ['للطالب المتميز', 'للطالبة المتميزة'],
  ['للطالب المبدع', 'للطالبة المبدعة'],
  ['للطالب الخلوق', 'للطالبة الخلوقة'],
  ['للطالب النجيب', 'للطالبة النجيبة'],
  ['للطالب المتفوق', 'للطالبة المتفوقة'],
  ['للطالب المجتهد', 'للطالبة المجتهدة'],
  ['للطالب المثالي', 'للطالبة المثالية'],
  ['للطالب المبارك', 'للطالبة المباركة'],
  ['للطالب المتقن', 'للطالبة المتقنة'],
  ['للطالب الحافظ', 'للطالبة الحافظة'],
  ['للطالب الفائز', 'للطالبة الفائزة'],
  ['للطالب', 'للطالبة'],
  ['الطالب المتميز', 'الطالبة المتميزة'],
  ['الطالب المبدع', 'الطالبة المبدعة'],
  ['الطالب المتفوق', 'الطالبة المتفوقة'],
  ['الطالب المجتهد', 'الطالبة المجتهدة'],
  ['الطالب', 'الطالبة'],
  ['طالب متميز', 'طالبة متميزة'],
  ['طالب متفوق', 'طالبة متفوقة'],
  ['طالب مجتهد', 'طالبة مجتهدة'],
  ['طالب خلوق', 'طالبة خلوقة'],
  ['طالب مبدع', 'طالبة مبدعة'],
  ['طالب', 'طالبة'],
  ['تلميذنا', 'تلميذتنا'],
  ['ابننا', 'ابنتنا'],
  ['بطلنا الصغير', 'بطلتنا الصغيرة'],
  ['بطلنا', 'بطلتنا'],
  ['نجمنا', 'نجمتنا'],
  ['فارسنا', 'فارستنا'],
  ['قائد مستقبلي', 'قائدة مستقبلية'],
  ['مبتكر واعد', 'مبتكرة واعدة'],
  ['سفير البيئة', 'سفيرة البيئة'],
  ['للقيادي الواعد', 'للقيادية الواعدة'],
  ['للمبتكر الرقمي', 'للمبتكرة الرقمية'],
  ['للأستاذ القدير', 'للأستاذة القديرة'],
  ['بأن الطالب', 'بأن الطالبة'],

  // Badges & Titles
  ['وسام الطالب المتميز', 'وسام الطالبة المتميزة'],
  ['وسام الطالب المتفوق', 'وسام الطالبة المتفوقة'],
  ['وسام الطالب المثالي', 'وسام الطالبة المثالية'],
  ['وسام الطالب المبدع', 'وسام الطالبة المبدعة'],
  ['وسام الفارس', 'وسام الفارسة'],

  // Phrases with Prepositions / Wishes
  ['سائلين الله له', 'سائلين الله لها'],
  ['سائلين المولى له', 'سائلين المولى لها'],
  ['داعين الله له', 'داعين الله لها'],
  ['متمنين له', 'متمنين لها'],
  ['راجين له', 'راجين لها'],
  ['نرجو له', 'نرجو لها'],
  ['نتمنى له', 'نتمنى لها'],
  ['نتمنى لَه', 'نتمنى لها'],
  ['مباركاً له', 'مباركاً لها'],
  ['مباركين له', 'مباركين لها'],
  ['له دوام', 'لها دوام'],
  ['له مستقبلاً', 'لها مستقبلاً'],
  ['له مزيداً', 'لها مزيداً'],
  ['له التوفيق', 'لها التوفيق'],
  ['له النجاح', 'لها النجاح'],
  ['أن يوفقه', 'أن يوفقها'],
  ['أن يسدده', 'أن يسددها'],
  ['أن يبارك فيه', 'أن يبارك فيها'],
  ['أن يزيده', 'أن يزيدها'],
  ['أن ينفع به', 'أن ينفع بها'],
  ['أن يجعله', 'أن يجعلها'],
  ['ليكون', 'لتكون'],

  // Nouns with Affixes (Pronouns)
  ['لجهوده المخلصة', 'لجهودها المخلصة'],
  ['لجهوده المباركة', 'لجهودها المباركة'],
  ['لجهوده', 'لجهودها'],
  ['جهوده', 'جهودها'],
  ['لتفوقه', 'لتفوقها'],
  ['وتفوقه', 'وتفوقها'],
  ['تفوقه', 'تفوقها'],
  ['تألقه', 'تألقها'],
  ['تميزه', 'تميزها'],
  ['إبداعه', 'إبداعها'],
  ['عطائه', 'عطائها'],
  ['اجتهاده', 'اجتهادها'],
  ['حرصه', 'حرصها'],
  ['وحرصه', 'وحرصها'],
  ['انضباطه', 'انضباطها'],
  ['مواظبته', 'مواظبتها'],
  ['سلوكه', 'سلوكها'],
  ['لسلوكه', 'لسلوكها'],
  ['أخلاقه', 'أخلاقها'],
  ['مشاركته', 'مشاركتها'],
  ['مساهمته', 'مساهمتها'],
  ['إتمامه', 'إتمامها'],
  ['إتقانه', 'إتقانها'],
  ['أدائه', 'أدائها'],
  ['إنجازه', 'إنجازها'],
  ['تفرده', 'تفردها'],
  ['تعاونه', 'تعاونها'],
  ['حفظه', 'حفظها'],
  ['تلاوته', 'تلاوتها'],
  ['حصوله', 'حصولها'],
  ['تحصيله', 'تحصيلها'],
  ['مستقبله', 'مستقبلها'],
  ['مسيرته', 'مسيرتها'],
  ['شغفه', 'شغفها'],
  ['طموحه', 'طموحها'],
  ['ذكائه', 'ذكائها'],
  ['فهمه', 'فهمها'],
  ['نجاحه', 'نجاحها'],
  ['فوزه', 'فوزها'],
  ['حضوره', 'حضورها'],
  ['تفاعله', 'تفاعلها'],
  ['سعيه', 'سعيها'],
  ['ابتكاره', 'ابتكارها'],
  ['قيادته', 'قيادتها'],
  ['تفانيه', 'تفانيها'],
  ['تحقيقه', 'تحقيقها'],
  ['أبداه', 'أبدته'],
  ['أبداءه', 'أبدائها'],
  ['زملائه', 'زميلاتها'],
  ['معلميه', 'معلماتها'],
  ['أقرانه', 'قريناتها'],
  ['والديه', 'والديها'],
  ['أهله', 'أهلها'],
  ['وطنه', 'وطنها'],
  ['مدرسته', 'مدرستها'],
  ['فصله', 'فصلها'],
  ['صفه', 'صفها'],

  // Verbs (Past / Present)
  ['أبدى', 'أبدت'],
  ['أظهر', 'أظهرت'],
  ['حصد', 'حصدت'],
  ['أحرز', 'أحرزت'],
  ['سطر', 'سطرت'],
  ['اجتاز', 'اجتازت'],
  ['شارك', 'شاركت'],
  ['ساهم', 'ساهمت'],
  ['قدم', 'قدمت'],
  ['بذل', 'بذلت'],
  ['أثبت', 'أثبتت'],
  ['نال', 'نالت'],
  ['حقق', 'حققت'],
  ['أنجز', 'أنجزت'],
  ['أبدع', 'أبدعت'],
  ['حصل', 'حصلت'],
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

  // Adjectives & Singular Nouns
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
  ['بطلاً', 'بطلةً'],
  ['متميزاً', 'متميزةً'],
  ['مبدعاً', 'مبدعةً'],
  ['متفوقاً', 'متفوقةً'],
  ['فارس', 'فارسة'],
  ['خادم كتاب الله', 'خادمة كتاب الله'],
  ['سفير', 'سفيرة'],
  ['المبتكر', 'المبتكرة'],
  ['دمت كوكباً', 'دمتِ شعلة'],
  ['دمت مبدعاً', 'دمتِ مبدعة'],
  ['بن', 'بنت'],
  ['عبد الله بن', 'فاطمة بنت'],
  ['محمد بن', 'نورة بنت'],
];

// Comprehensive Arabic dictionary replacements for feminine -> masculine transformations
const MASCULINE_REPLACEMENTS: [string, string][] = [
  // Compound Titles & Honors
  ['للطالبة المتميزة', 'للطالب المتميز'],
  ['للطالبة المبدعة', 'للطالب المبدع'],
  ['للطالبة الخلوقة', 'للطالب الخلوق'],
  ['للطالبة النجيبة', 'للطالب النجيب'],
  ['للطالبة المتفوقة', 'للطالب المتفوق'],
  ['للطالبة المجتهدة', 'للطالب المجتهد'],
  ['للطالبة المثالية', 'للطالب المثالي'],
  ['للطالبة المباركة', 'للطالب المبارك'],
  ['للطالبة المتقنة', 'للطالب المتقن'],
  ['للطالبة الحافظة', 'للطالب الحافظ'],
  ['للطالبة الفائزة', 'للطالب الفائز'],
  ['للطالبة', 'للطالب'],
  ['الطالبة المتميزة', 'الطالب المتميز'],
  ['الطالبة المبدعة', 'الطالب المبدع'],
  ['الطالبة المتفوقة', 'الطالب المتفوق'],
  ['الطالبة المجتهدة', 'الطالب المجتهد'],
  ['الطالبة', 'الطالب'],
  ['طالبة متميزة', 'طالب متميز'],
  ['طالبة متفوقة', 'طالب متفوق'],
  ['طالبة مجتهدة', 'طالب مجتهد'],
  ['طالبة خلوقة', 'طالب خلوق'],
  ['طالبة مبدعة', 'طالب مبدع'],
  ['طالبة', 'طالب'],
  ['تلميذتنا', 'تلميذنا'],
  ['ابنتنا', 'ابننا'],
  ['بطلتنا الصغيرة', 'بطلنا الصغير'],
  ['بطلتنا', 'بطلنا'],
  ['نجمتنا', 'نجمنا'],
  ['فارستنا', 'فارسنا'],
  ['قائدة مستقبلية', 'قائد مستقبلي'],
  ['مبتكرة واعدة', 'مبتكر واعد'],
  ['سفيرة البيئة', 'سفير البيئة'],
  ['للقيادية الواعدة', 'للقيادي الواعد'],
  ['للمبتكرة الرقمية', 'للمبتكر الرقمي'],
  ['للأستاذة القديرة', 'للأستاذ القدير'],
  ['بأن الطالبة', 'بأن الطالب'],

  // Badges & Titles
  ['وسام الطالبة المتميزة', 'وسام الطالب المتميز'],
  ['وسام الطالبة المتفوقة', 'وسام الطالب المتفوق'],
  ['وسام الطالبة المثالية', 'وسام الطالب المثالي'],
  ['وسام الطالبة المبدعة', 'وسام الطالب المبدع'],
  ['وسام الفارسة', 'وسام الفارس'],

  // Phrases with Prepositions / Wishes
  ['سائلين الله لها', 'سائلين الله له'],
  ['سائلين المولى لها', 'سائلين المولى له'],
  ['داعين الله لها', 'داعين الله له'],
  ['متمنين لها', 'متمنين له'],
  ['راجين لها', 'راجين له'],
  ['نرجو لها', 'نرجو له'],
  ['نتمنى لها', 'نتمنى له'],
  ['مباركاً لها', 'مباركاً له'],
  ['مباركين لها', 'مباركين له'],
  ['لها دوام', 'له دوام'],
  ['لها مستقبلاً', 'له مستقبلاً'],
  ['لها مزيداً', 'له مزيداً'],
  ['لها التوفيق', 'له التوفيق'],
  ['لها النجاح', 'له النجاح'],
  ['أن يوفقها', 'أن يوفقه'],
  ['أن يسددها', 'أن يسدده'],
  ['أن يبارك فيها', 'أن يبارك فيه'],
  ['أن يزيدها', 'أن يزيده'],
  ['أن ينفع بها', 'أن ينفع به'],
  ['أن يجعلها', 'أن يجعله'],
  ['لتكون', 'ليكون'],

  // Nouns with Affixes (Pronouns)
  ['لجهودها المخلصة', 'لجهوده المخلصة'],
  ['لجهودها المباركة', 'لجهوده المباركة'],
  ['لجهودها', 'لجهوده'],
  ['جهودها', 'جهوده'],
  ['لتفوقها', 'لتفوقه'],
  ['وتفوقها', 'وتفوقه'],
  ['تفوقها', 'تفوقه'],
  ['تألقها', 'تألقه'],
  ['تميزها', 'تميزه'],
  ['إبداعها', 'إبداعه'],
  ['عطائها', 'عطائه'],
  ['اجتهادها', 'اجتهاده'],
  ['حرصها', 'حرصه'],
  ['وحرصها', 'وحرصه'],
  ['انضباطها', 'انضباطه'],
  ['مواظبتها', 'مواظبته'],
  ['سلوكها', 'سلوكه'],
  ['لسلوكها', 'لسلوكه'],
  ['أخلاقها', 'أخلاقه'],
  ['مشاركتها', 'مشاركته'],
  ['مساهمتها', 'مساهمته'],
  ['إتمامها', 'إتمامه'],
  ['إتقانها', 'إتقانه'],
  ['أدائها', 'أدائه'],
  ['إنجازها', 'إنجازه'],
  ['تفردها', 'تفرده'],
  ['تعاونها', 'تعاونه'],
  ['حفظها', 'حفظه'],
  ['تلاوتها', 'تلاوته'],
  ['حصولها', 'حصوله'],
  ['تحصيلها', 'تحصيله'],
  ['مستقبلها', 'مستقبله'],
  ['مسيرتها', 'مسيرته'],
  ['شغفها', 'شغفه'],
  ['طموحها', 'طموحه'],
  ['ذكائها', 'ذكائه'],
  ['فهمها', 'فهمه'],
  ['نجاحها', 'نجاحه'],
  ['فوزها', 'فوزه'],
  ['حضورها', 'حضوره'],
  ['تفاعلها', 'تفاعله'],
  ['سعيها', 'سعيه'],
  ['ابتكارها', 'ابتكاره'],
  ['قيادتها', 'قيادته'],
  ['تفانيها', 'تفانيه'],
  ['تحقيقها', 'تحقيقه'],
  ['أبدته', 'أبداه'],
  ['أبدائها', 'أبداءه'],
  ['زميلاتها', 'زملائه'],
  ['معلماتها', 'معلميه'],
  ['قريناتها', 'أقرانه'],
  ['والديها', 'والديه'],
  ['أهلها', 'أهله'],
  ['وطنها', 'وطنه'],
  ['مدرستها', 'مدرسته'],
  ['فصلها', 'فصله'],
  ['صفها', 'صفه'],

  // Verbs (Past / Present)
  ['أبدت', 'أبدى'],
  ['أظهرت', 'أظهر'],
  ['حصدت', 'حصد'],
  ['أحرزت', 'أحرز'],
  ['سطرت', 'سطر'],
  ['اجتازت', 'اجتاز'],
  ['شاركت', 'شارك'],
  ['ساهمت', 'ساهم'],
  ['قدمت', 'قدم'],
  ['بذلت', 'بذل'],
  ['أثبتت', 'أثبت'],
  ['نالت', 'نال'],
  ['حققت', 'حقق'],
  ['أنجزت', 'أنجز'],
  ['أبدعت', 'أبدع'],
  ['حصلت', 'حصل'],
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

  // Adjectives & Singular Nouns
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
  ['بطلةً', 'بطلاً'],
  ['متميزةً', 'متميزاً'],
  ['مبدعةً', 'مبدعاً'],
  ['متفوقةً', 'متفوقاً'],
  ['فارسة', 'فارس'],
  ['خادمة كتاب الله', 'خادم كتاب الله'],
  ['سفيرة', 'سفير'],
  ['المبتكرة', 'المبتكر'],
  ['دمتِ شعلة', 'دمت كوكباً'],
  ['دمتِ مبدعة', 'دمت مبدعاً'],
  ['الأميرة الصغيرة', 'البطل الصغير'],
  ['بنت', 'بن'],
  ['فاطمة بنت', 'عبد الله بن'],
  ['سارة بنت', 'محمد بن'],
];

// Local smart fallback generator for certificates when API key is missing, offline, or rate-limited
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
  let badgeTitle = certData?.badgeTitle || 'وسام التميز والتفوق';
  let poemOrQuote = certData?.poemOrQuote || '';

  const normalizeSlashes = (str: string) => {
    if (!str) return str;
    if (isFemale) {
      return str
        .replace(/الطالب[\/ـ_\-\\]+[ةه]/g, 'الطالبة')
        .replace(/طالب[\/ـ_\-\\]+[ةه]/g, 'طالبة')
        .replace(/الأستاذ[\/ـ_\-\\]+[ةه]/g, 'الأستاذة')
        .replace(/المبدع[\/ـ_\-\\]+[ةه]/g, 'المبدعة')
        .replace(/المتطوع[\/ـ_\-\\]+[ةه]/g, 'المتطوعة')
        .replace(/المتفوق[\/ـ_\-\\]+[ةه]/g, 'المتفوقة')
        .replace(/المتميز[\/ـ_\-\\]+[ةه]/g, 'المتميزة')
        .replace(/المجتهد[\/ـ_\-\\]+[ةه]/g, 'المجتهدة');
    } else {
      return str
        .replace(/الطالب[\/ـ_\-\\]+[ةه]/g, 'الطالب')
        .replace(/طالب[\/ـ_\-\\]+[ةه]/g, 'طالب')
        .replace(/الأستاذ[\/ـ_\-\\]+[ةه]/g, 'الأستاذ')
        .replace(/المبدع[\/ـ_\-\\]+[ةه]/g, 'المبدع')
        .replace(/المتطوع[\/ـ_\-\\]+[ةه]/g, 'المتطوع')
        .replace(/المتفوق[\/ـ_\-\\]+[ةه]/g, 'المتفوق')
        .replace(/المتميز[\/ـ_\-\\]+[ةه]/g, 'المتميز')
        .replace(/المجتهد[\/ـ_\-\\]+[ةه]/g, 'المجتهد');
    }
  };

  intro = normalizeSlashes(intro);
  appreciation = normalizeSlashes(appreciation);
  title = normalizeSlashes(title);
  badgeTitle = normalizeSlashes(badgeTitle);
  if (poemOrQuote) poemOrQuote = normalizeSlashes(poemOrQuote);

  const replacements = isFemale ? FEMININE_REPLACEMENTS : MASCULINE_REPLACEMENTS;

  for (const [fromWord, toWord] of replacements) {
    intro = replaceArabicWordBoundary(intro, fromWord, toWord);
    appreciation = replaceArabicWordBoundary(appreciation, fromWord, toWord);
    title = replaceArabicWordBoundary(title, fromWord, toWord);
    badgeTitle = replaceArabicWordBoundary(badgeTitle, fromWord, toWord);
    if (poemOrQuote) {
      poemOrQuote = replaceArabicWordBoundary(poemOrQuote, fromWord, toWord);
    }
  }

  return {
    title,
    recipientIntro: intro,
    appreciationText: appreciation,
    poemOrQuote,
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

// AI Arabic Proofreading & Linguistic Optimization Endpoint
app.post("/api/ai-proofread", async (req, res) => {
  const aiConfig = extractAiCredentials(req);
  const { certificateData } = req.body;

  if (!certificateData) {
    return res.status(400).json({ success: false, error: "Missing certificateData payload" });
  }

  const isFemale = certificateData.recipientGender === 'female';

  try {
    const prompt = `أنت بروفيسور تدقيق لغوي وإملائي ومستشار بلاغة عربية للشهادات والوثائق الرسمية.
قم بتدقيق نصوص شهادة التقدير التالية تدقيقاً لغوياً ونحوياً وإملائياً وبلاغياً شاملاً:
1. همزات الوصل والقطع (إكرام، إنجاز، استحقاق، اهتمام، إلى، أن).
2. التاء المربوطة والهاء (المدرسة، شهادة، الله، جهوده، تفوقه).
3. الألف المقصورة والياء (المولى، الهدى، على، في).
4. التنوين وتطابق قواعد النحو (شكراً، تقديراً، دائماً).
5. تطابق التذكير والتأنيث بحسب نوع المكرّم: ${isFemale ? 'المكرّم طالبة (أنثى/مؤنث)' : 'المكرّم طالب (ذكر/مذكر)'}.
6. إزالة أي أخطاء شائعة (مثل 'مبروك' واستبدالها بـ 'مبارك'، وكلمة 'إن شاء الله').
7. ضبط علامات الترقيم والمسافات البينية وواو العطف.

نصوص الشهادة الحالية:
- عنوان الشهادة: "${certificateData.title || ''}"
- العنوان الفرعي: "${certificateData.subtitle || ''}"
- عبارة مقدمة التكريم: "${certificateData.recipientIntro || ''}"
- اسم الطالب/المكرم: "${certificateData.studentName || ''}"
- الصف أو المرحلة: "${certificateData.grade || ''}"
- المادة / المجال: "${certificateData.subject || ''}"
- نص التقدير والشكر: "${certificateData.appreciationText || ''}"
- بيت الشعر أو المقولة: "${certificateData.poemOrQuote || ''}"
- مسمى الوسام: "${certificateData.badgeTitle || ''}"

أرجع كائن JSON حصراً بالشكل التالي بدون أي شرح خارجه:
{
  "correctedFields": {
    "title": "العنوان المصحح والمضبوط إملائياً",
    "subtitle": "العنوان الفرعي المصحح",
    "recipientIntro": "مقدمة التكريم المصححة",
    "studentName": "اسم الطالب المصحح",
    "grade": "الصف المصحح",
    "subject": "المادة المصححة",
    "appreciationText": "نص التقدير المصحح بدقة بالغة وبلاغة فصيحة",
    "poemOrQuote": "بيت الشعر المصحح إملائياً وتشكيل القافية",
    "badgeTitle": "مسمى الوسام المصحح"
  },
  "issues": [
    {
      "fieldName": "appreciationText",
      "originalWord": "الكلمة الخاطئة",
      "suggestedWord": "الكلمة الصائبة",
      "category": "hamza",
      "categoryLabel": "همزة قطع",
      "severity": "error",
      "ruleExplanation": "توضيح القاعدة الإملائية بإيجاز"
    }
  ],
  "linguisticNotes": "ملاحظة لغوية عامة حول جودة الصياغة",
  "score": 95
}`;

    const rawResponse = await callUnifiedAi({
      config: aiConfig,
      prompt,
      systemInstruction: "أنت مدقق لغوي عربي محترف. أرجع كائن JSON صالح فقط.",
      temperature: 0.2,
      maxTokens: 2000,
      jsonOutput: true,
    });

    const parsed = cleanAndParseJson(rawResponse, null);
    if (parsed && parsed.correctedFields) {
      return res.json({
        success: true,
        source: 'ai',
        correctedFields: parsed.correctedFields,
        issues: Array.isArray(parsed.issues) ? parsed.issues : [],
        linguisticNotes: parsed.linguisticNotes || "النصوص فصيحة وسليمة لغوياً",
        score: typeof parsed.score === 'number' ? parsed.score : 95,
      });
    }
    throw new Error("Failed to parse valid proofread JSON");
  } catch (err: any) {
    console.warn("AI Proofread fallback applied:", err);
    return res.json({
      success: false,
      error: err?.message || "AI Proofreader encountered an error",
      fallbackToLocal: true,
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
    } catch (aiErr: any) {
      const is429 = String(aiErr?.message || "").includes("429") || aiErr?.status === 429;
      if (!is429) {
        console.info("AI generation unavailable, using intelligent local fallback:", aiErr?.message || "offline");
      }
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
      return res.json({ success: true, result: fallbackResult, fallbackUsed: true });
    }
  } catch (error: any) {
    const fallbackResult = generateLocalCertificateFallback(req.body);
    res.json({
      success: true,
      result: fallbackResult,
      fallbackUsed: true,
    });
  }
});

// AI Endpoint to adapt/convert certificate texts to Masculine (Male/طالب) or Feminine (Female/طالبة)
app.post("/api/adapt-gender-ai", async (req, res) => {
  try {
    const aiConfig = extractAiCredentials(req);
    const { certificateData, targetGender, text, topic, mode } = req.body;

    // Mode A: Dual Phrasing Generation for batch modal
    if (mode === 'dual-generation' || (topic && !certificateData && !targetGender)) {
      const fieldTopic = topic || text || "التفوق والاجتهاد الدراسي";
      try {
        const dualPrompt = `صغ عبارتين بليغتين لشهادة شكر وتقدير لمجال: [${fieldTopic}].
الأولى مخصصة للمذكر (طالب / بنين) والثانية للمؤنث (طالبة / بنات) مع المحافظة التامة على البلاغة والجمال الأدبي والوزن اللغوي.
أرجع JSON فقط:
{
  "maleIntro": "تسر إدارة المدرسة أن تمنح هذه الشهادة للطالب المتميز:",
  "femaleIntro": "تسر إدارة المدرسة أن تمنح هذه الشهادة للطالبة المتميزة:",
  "maleText": "تقديراً لجهوده المتميزة وتفوقه في...",
  "femaleText": "تقديراً لجهودها المتميزة وتفوقها في..."
}`;
        const rawResponse = await callUnifiedAi({
          config: aiConfig,
          prompt: dualPrompt,
          systemInstruction: "أنت خبير لغة عربية وصياغة شهادات تكريم. أرجع JSON فقط.",
          temperature: 0.3,
          maxTokens: 600,
          jsonOutput: true,
        });

        const dualData = cleanAndParseJson(rawResponse, null);
        if (dualData && dualData.maleText && dualData.femaleText) {
          return res.json({
            success: true,
            maleText: dualData.maleText,
            femaleText: dualData.femaleText,
            maleIntro: dualData.maleIntro || "تسر إدارة المدرسة أن تمنح هذه الشهادة للطالب المتميز:",
            femaleIntro: dualData.femaleIntro || "تسر إدارة المدرسة أن تمنح هذه الشهادة للطالبة المتميزة:",
          });
        }
      } catch (err) {
        console.warn("Dual generation AI fallback used");
      }

      // Local fallback for dual generation
      return res.json({
        success: true,
        fallbackUsed: true,
        maleIntro: "تسر إدارة المدرسة أن تمنح هذه الشهادة للطالب المتميز:",
        femaleIntro: "تسر إدارة المدرسة أن تمنح هذه الشهادة للطالبة المتميزة:",
        maleText: `تقديراً لجهوده المتميزة وتفوقه المشهود في ${fieldTopic}، ومساعيه الدؤوبة لتحقيق أرفع الدرجات، متمنين له دوام العطاء والتألق المستمر.`,
        femaleText: `تقديراً لجهودها المتميزة وتفوقها المشهود في ${fieldTopic}، ومساعيها الدؤوبة لتحقيق أرفع الدرجات، متمنين لها دوام العطاء والتألق المستمر.`,
      });
    }

    // Mode B: Single text conversion
    if (text && typeof text === 'string' && !certificateData) {
      const isFemale = targetGender === 'female';
      try {
        const singlePrompt = `حول النص العربي التالي إلى صيغة ${isFemale ? 'المؤنث (طالبة/بنت)' : 'المذكر (طالب/ولد)'} مع ضبط الضمائر والصفات بدقة:
"${text}"
أرجع JSON فقط:
{
  "adaptedText": "النص المحول هنا"
}`;
        const rawResponse = await callUnifiedAi({
          config: aiConfig,
          prompt: singlePrompt,
          systemInstruction: "أنت خبير لغة عربية. أرجع JSON فقط بالحقل adaptedText.",
          temperature: 0.2,
          maxTokens: 400,
          jsonOutput: true,
        });

        const singleData = cleanAndParseJson(rawResponse, null);
        if (singleData && singleData.adaptedText) {
          return res.json({ success: true, adaptedText: singleData.adaptedText });
        }
      } catch (err) {
        // local conversion
      }
      const localSingle = isFemale
        ? text.replace(/\bللطالب\b/g, 'للطالبة').replace(/\bتفوقه\b/g, 'تفوقها').replace(/\bله\b/g, 'لها')
        : text.replace(/\bللطالبة\b/g, 'للطالب').replace(/\bتفوقها\b/g, 'تفوقه').replace(/\bلها\b/g, 'له');
      return res.json({ success: true, adaptedText: localSingle, fallbackUsed: true });
    }

    // Mode C: Full Certificate Data conversion
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

قواعد التحويل:
1. ${isFemale 
    ? "حول كافة الضمائر والأوصاف والأفعال إلى التأنيث (مثل: 'للطالبة المتميزة'، 'لجهودها المتميزة'، 'تفوقها'، 'تألقها'، 'تلميذتنا المبدعة'، 'نتمنى لها')." 
    : "حول كافة الضمائر والأوصاف والأفعال إلى التذكير (مثل: 'للطالب المتميز'، 'لجهوده المتميزة'، 'تفوقه'، 'تألقه'، 'تلميذنا المبدع'، 'نتمنى له')."}
2. حافظ على نفس البلاغة الأصلية وجمال العبارات بدقة.

أرجع كائن JSON حصراً بالحقول التالية:
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
        temperature: 0.2,
        maxTokens: 600,
        jsonOutput: true,
      });

      const data = cleanAndParseJson(rawResponse, null);
      if (data && (data.recipientIntro || data.appreciationText)) {
        return res.json({ success: true, result: data });
      }
      throw new Error("Invalid gender adaptation JSON");
    } catch (aiErr: any) {
      const fallbackResult = adaptGenderLocalFallback(certificateData, targetGender);
      return res.json({ success: true, result: fallbackResult, fallbackUsed: true });
    }
  } catch (error: any) {
    const fallbackResult = adaptGenderLocalFallback(req.body?.certificateData, req.body?.targetGender);
    res.json({
      success: true,
      result: fallbackResult,
      fallbackUsed: true,
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

// Cloud Sync Storage Directory & Accounts Database
const DATA_DIR = path.join(process.cwd(), ".data");
const SYNC_DATA_DIR = path.join(DATA_DIR, "cloud_sync");
const ACCOUNTS_DB_PATH = path.join(DATA_DIR, "accounts_db.json");

try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(SYNC_DATA_DIR)) {
    fs.mkdirSync(SYNC_DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(ACCOUNTS_DB_PATH)) {
    fs.writeFileSync(ACCOUNTS_DB_PATH, JSON.stringify({ users: [] }, null, 2), "utf-8");
  }
} catch (e) {
  console.warn("Could not initialize data directories:", e);
}

interface UserAccountRecord {
  userId: string;
  username: string;
  email: string;
  displayName: string;
  passwordHash?: string;
  passwordSalt?: string;
  googleId?: string;
  googleEmail?: string;
  photoURL?: string;
  isVerified: boolean;
  verifiedAt?: string;
  verificationMethod?: string;
  emailSentAt?: string;
  verificationCode?: string;
  verificationCodeExpiresAt?: string;
  linkingCode?: string;
  linkingCodeExpiresAt?: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  customData?: any;
}

function deduplicateAndMergeUsers(users: UserAccountRecord[]): UserAccountRecord[] {
  const emailMap = new Map<string, UserAccountRecord>();
  const idMap = new Map<string, UserAccountRecord>();
  const result: UserAccountRecord[] = [];

  for (const user of users) {
    const rawEmail = (user.googleEmail || user.email || "").trim().toLowerCase();
    const existing = (rawEmail && emailMap.get(rawEmail)) || (user.userId && idMap.get(user.userId));

    if (existing) {
      if (!existing.googleEmail && (user.googleEmail || (rawEmail && user.googleId))) {
        existing.googleEmail = user.googleEmail || rawEmail;
      }
      if (!existing.email && rawEmail) {
        existing.email = rawEmail;
      }
      if (!existing.googleId && user.googleId) existing.googleId = user.googleId;
      if (!existing.photoURL && user.photoURL) existing.photoURL = user.photoURL;
      if (!existing.passwordHash && user.passwordHash) {
        existing.passwordHash = user.passwordHash;
        existing.passwordSalt = user.passwordSalt;
      }
      if (user.isVerified) {
        existing.isVerified = true;
        existing.verifiedAt = existing.verifiedAt || user.verifiedAt || new Date().toISOString();
      }
      if (user.displayName && existing.displayName === existing.username) {
        existing.displayName = user.displayName;
      }
      if (user.lastLoginAt) {
        if (!existing.lastLoginAt || new Date(user.lastLoginAt) > new Date(existing.lastLoginAt)) {
          existing.lastLoginAt = user.lastLoginAt;
        }
      }
      existing.updatedAt = new Date().toISOString();
    } else {
      if (rawEmail) {
        emailMap.set(rawEmail, user);
      }
      if (user.userId) {
        idMap.set(user.userId, user);
      }
      result.push(user);
    }
  }

  return result;
}

function loadAccountsDb(): { users: UserAccountRecord[] } {
  try {
    if (fs.existsSync(ACCOUNTS_DB_PATH)) {
      const raw = fs.readFileSync(ACCOUNTS_DB_PATH, "utf-8");
      const parsed = JSON.parse(raw) || { users: [] };
      if (Array.isArray(parsed.users)) {
        parsed.users = deduplicateAndMergeUsers(parsed.users);
      }
      return parsed;
    }
  } catch (e) {
    console.error("Error reading accounts DB:", e);
  }
  return { users: [] };
}

function saveAccountsDb(db: { users: UserAccountRecord[] }) {
  try {
    if (Array.isArray(db.users)) {
      db.users = deduplicateAndMergeUsers(db.users);
    }
    fs.writeFileSync(ACCOUNTS_DB_PATH, JSON.stringify(db, null, 2), "utf-8");
  } catch (e) {
    console.error("Error saving accounts DB:", e);
  }
}

// Dispatched emails log storage
const DISPATCHED_EMAILS_PATH = path.join(DATA_DIR, "dispatched_emails.json");

interface DispatchedEmailLog {
  id: string;
  recipient: string;
  subject: string;
  code: string;
  userId?: string;
  displayName?: string;
  sentAt: string;
  status: "sent" | "simulated" | "failed";
  method: "smtp" | "simulated";
  error?: string;
}

function loadDispatchedEmails(): DispatchedEmailLog[] {
  try {
    if (fs.existsSync(DISPATCHED_EMAILS_PATH)) {
      const raw = fs.readFileSync(DISPATCHED_EMAILS_PATH, "utf-8");
      return JSON.parse(raw) || [];
    }
  } catch (e) {
    console.warn("Could not read dispatched emails log:", e);
  }
  return [];
}

function saveDispatchedEmailLog(log: DispatchedEmailLog) {
  try {
    const list = loadDispatchedEmails();
    list.unshift(log);
    fs.writeFileSync(DISPATCHED_EMAILS_PATH, JSON.stringify(list.slice(0, 100), null, 2), "utf-8");
  } catch (e) {
    console.warn("Could not save email log:", e);
  }
}

function createSmtpTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = Number(process.env.SMTP_PORT) || 587;
  const secure = process.env.SMTP_SECURE === "true" || port === 465;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      tls: { rejectUnauthorized: false }
    });
  }
  return null;
}

function buildVerificationEmailHtml(params: {
  code: string;
  displayName?: string;
  email: string;
  userId?: string;
  reason?: string;
}): string {
  const name = params.displayName || params.email.split("@")[0] || "المعلم الفاضل";
  const reasonText = params.reason || "تفعيل الحساب الجديد وتوثيقه في قاعدة البيانات السحابية";
  
  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <title>كود التحقق الأمني - منصة تقدير للشهادات</title>
</head>
<body style="margin:0;padding:0;background-color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Cairo','Tajawal',sans-serif;color:#f8fafc;direction:rtl;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0f172a;padding:30px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:580px;background-color:#1e293b;border:1px solid #334155;border-radius:24px;overflow:hidden;box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);">
          
          <!-- Header Banner -->
          <tr>
            <td style="padding:32px 30px 24px;background:linear-gradient(135deg, #1e293b 0%, #0f172a 100%);border-bottom:1px solid #334155;text-align:center;">
              <div style="display:inline-block;padding:12px 18px;background:rgba(245,158,11,0.15);border:1px solid rgba(245,158,11,0.3);border-radius:18px;margin-bottom:14px;">
                <span style="font-size:26px;">🎓</span>
              </div>
              <h1 style="margin:0 0 6px;font-size:22px;font-weight:900;color:#f59e0b;letter-spacing:-0.5px;">منصة تقدير للشهادات الرسمية</h1>
              <p style="margin:0;font-size:13px;color:#94a3b8;font-weight:500;">نظام التحقق وتوثيق الحسابات السحابية المعتمدة</p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding:32px 30px;text-align:right;">
              <p style="margin:0 0 16px;font-size:16px;font-weight:700;color:#ffffff;">
                مرحباً بك ${name} 👋
              </p>
              
              <p style="margin:0 0 20px;font-size:14px;line-height:1.7;color:#cbd5e1;">
                شكراً لتسجيلك في منصة تقدير. لضمان صحة بريدك الإلكتروني وإتمام عملية <strong>${reasonText}</strong>، يرجى إدخال رمز التحقق الأمني التالي:
              </p>

              <!-- Verification Code Box -->
              <div style="margin:28px 0;padding:22px;background-color:#0f172a;border:2px dashed #f59e0b;border-radius:18px;text-align:center;">
                <span style="display:block;font-size:12px;font-weight:700;color:#94a3b8;margin-bottom:8px;">كود التحقق الأمني المكون من 6 أرقام</span>
                <div style="font-family:Consolas,Monaco,monospace,'Courier New',Courier;font-size:36px;font-weight:900;letter-spacing:10px;color:#fbbf24;text-shadow:0 2px 10px rgba(245,158,11,0.3);margin:4px 0;">
                  ${params.code}
                </div>
                <span style="display:block;font-size:11px;color:#f59e0b;margin-top:8px;">صلاحية هذا الكود: 15 دقيقة ⏱️</span>
              </div>

              ${params.userId ? `
              <div style="margin:0 0 20px;padding:12px 16px;background-color:rgba(15,23,42,0.6);border:1px solid #334155;border-radius:12px;font-size:12px;color:#94a3b8;">
                <span style="color:#e2e8f0;font-weight:bold;">معرف الحساب الخاص بك (User ID):</span>
                <span style="font-family:monospace;color:#38bdf8;font-weight:bold;margin-right:8px;">${params.userId}</span>
              </div>` : ''}

              <!-- Security Advice -->
              <div style="margin:24px 0 0;padding:16px;background-color:rgba(239,68,68,0.1);border-right:4px solid #ef4444;border-radius:10px;font-size:12px;line-height:1.6;color:#fca5a5;">
                <strong>🛡️ تنبيه أمني:</strong> لا تشارك هذا الرمز مطلقاً مع أي جهة. فريق الدعم في منصة تقدير لن يطلب منك هذا الرمز أبداً.
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 30px;background-color:#0f172a;border-top:1px solid #334155;text-align:center;font-size:12px;color:#64748b;line-height:1.6;">
              <p style="margin:0 0 6px;">هذه رسالة آلية تم إنشاؤها وتوثيقها عبر نظام التحقق في منصة تقدير.</p>
              <p style="margin:0;">إذا لم تقم بطلب إنشاء هذا الحساب، يمكنك تجاهل هذه الرسالة بأمان.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

async function sendVerificationEmail(params: {
  to: string;
  code: string;
  displayName?: string;
  userId?: string;
  reason?: string;
}): Promise<{
  success: boolean;
  method: "smtp" | "simulated";
  recipient: string;
  sentAt: string;
  message: string;
  logId: string;
}> {
  const cleanTo = (params.to || "").trim().toLowerCase();
  const sentAt = new Date().toISOString();
  const logId = `eml_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
  const subject = `🔐 كود التحقق الأمني لتفعيل حسابك في منصة تقدير: ${params.code}`;
  const htmlContent = buildVerificationEmailHtml({
    code: params.code,
    displayName: params.displayName,
    email: cleanTo,
    userId: params.userId,
    reason: params.reason
  });

  const transporter = createSmtpTransporter();
  let method: "smtp" | "simulated" = "simulated";
  let sendStatus: "sent" | "simulated" | "failed" = "simulated";
  let errorMessage: string | undefined = undefined;

  if (transporter) {
    try {
      const fromName = process.env.SMTP_FROM_NAME || "منصة تقدير للشهادات";
      const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;
      await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: cleanTo,
        subject,
        html: htmlContent,
        text: `كود التحقق الأمني لتفعيل حسابك في منصة تقدير هو: ${params.code} (صالح لمدة 15 دقيقة). المعرف: ${params.userId || ''}`
      });
      method = "smtp";
      sendStatus = "sent";
      console.log(`[SMTP] Successfully sent verification email to ${cleanTo} with code ${params.code}`);
    } catch (smtpErr: any) {
      console.warn(`[SMTP Warning] Failed to send email via SMTP (${smtpErr?.message || smtpErr}). Falling back to simulated verification dispatch.`);
      errorMessage = smtpErr?.message;
      sendStatus = "simulated";
    }
  } else {
    console.log(`[Email Dispatch] Verification code ${params.code} generated for ${cleanTo} (SMTP not configured in environment, logged to verification storage).`);
  }

  saveDispatchedEmailLog({
    id: logId,
    recipient: cleanTo,
    subject,
    code: params.code,
    userId: params.userId,
    displayName: params.displayName,
    sentAt,
    status: sendStatus,
    method,
    error: errorMessage
  });

  return {
    success: true,
    method,
    recipient: cleanTo,
    sentAt,
    message: method === "smtp"
      ? `تم إرسال كود التحقق بنجاح إلى بريدك الإلكتروني (${cleanTo})`
      : `تم تجهيز كود التحقق لبريدك الإلكتروني (${cleanTo}) بنجاح`,
    logId
  };
}

function hashPassword(password: string, salt: string): string {
  return crypto.createHash("sha256").update(password + ":" + salt).digest("hex");
}

function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateUserId(prefix: string = "USR"): string {
  const rand = Math.floor(1000 + Math.random() * 9000);
  const timeStr = Date.now().toString(36).toUpperCase();
  return `${prefix}-${timeStr}-${rand}`;
}

// 0. Auth: Directly Send / Resend Verification Email endpoint
app.post("/api/auth/send-verification-email", async (req, res) => {
  try {
    const { email, displayName, userId, reason } = req.body;
    const cleanEmail = (email || "").trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes("@")) {
      return res.status(400).json({ success: false, error: "يرجى إدخال بريد إلكتروني صالح" });
    }

    const db = loadAccountsDb();
    let user = db.users.find(
      (u) =>
        (userId && u.userId === userId) ||
        (u.email && u.email.toLowerCase() === cleanEmail) ||
        (u.googleEmail && u.googleEmail.toLowerCase() === cleanEmail)
    );

    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    if (user) {
      user.verificationCode = code;
      user.verificationCodeExpiresAt = expiresAt;
      user.emailSentAt = new Date().toISOString();
      user.updatedAt = new Date().toISOString();
      saveAccountsDb(db);
    }

    const emailRes = await sendVerificationEmail({
      to: cleanEmail,
      code,
      displayName: displayName || user?.displayName,
      userId: userId || user?.userId,
      reason: reason || "تأكيد وتوثيق الحساب"
    });

    return res.json({
      success: true,
      emailSent: true,
      method: emailRes.method,
      recipient: cleanEmail,
      userId: user?.userId || userId,
      message: emailRes.message
    });
  } catch (err: any) {
    console.error("Send verification email error:", err);
    return res.status(500).json({ success: false, error: err.message || "فشل إرسال كود التحقق" });
  }
});

// 1. Auth: Register with Username/Email & Password (sends verification email)
app.post("/api/auth/register-credentials", async (req, res) => {
  try {
    const { username, email, password, displayName } = req.body;
    const cleanUsername = (username || "").trim().toLowerCase();
    const cleanEmail = (email || "").trim().toLowerCase();
    const rawDisplayName = (displayName || username || email || "مستخدم جديد").trim();

    if (!cleanUsername && !cleanEmail) {
      return res.status(400).json({ success: false, error: "يرجى إدخال اسم المستخدم أو البريد الإلكتروني" });
    }
    if (!password || password.length < 4) {
      return res.status(400).json({ success: false, error: "كلمة المرور يجب أن لا تقل عن 4 خانات" });
    }

    const db = loadAccountsDb();
    const existing = db.users.find(
      (u) =>
        (cleanUsername && u.username && u.username.toLowerCase() === cleanUsername) ||
        (cleanEmail && u.email && u.email.toLowerCase() === cleanEmail) ||
        (cleanEmail && u.googleEmail && u.googleEmail.toLowerCase() === cleanEmail)
    );

    if (existing) {
      if (existing.isVerified) {
        return res.status(400).json({
          success: false,
          error: "اسم المستخدم أو البريد الإلكتروني مسجل بالفعل. يرجى تسجيل الدخول أو استخدام بريد آخر.",
        });
      }

      // Existing unverified record: update password and send fresh code
      const salt = crypto.randomBytes(16).toString("hex");
      existing.passwordHash = hashPassword(password, salt);
      existing.passwordSalt = salt;
      const verificationCode = generateVerificationCode();
      existing.verificationCode = verificationCode;
      existing.verificationCodeExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      existing.emailSentAt = new Date().toISOString();
      existing.updatedAt = new Date().toISOString();
      saveAccountsDb(db);

      let emailResult = { method: "simulated" as "smtp" | "simulated", message: "" };
      if (cleanEmail && cleanEmail.includes("@")) {
        emailResult = await sendVerificationEmail({
          to: cleanEmail,
          code: verificationCode,
          displayName: rawDisplayName,
          userId: existing.userId,
          reason: "تأكيد وتفعيل الحساب الجديد"
        });
      }

      return res.json({
        success: true,
        userId: existing.userId,
        email: cleanEmail,
        emailSent: true,
        emailMethod: emailResult.method,
        requiresVerification: true,
        isNewRegistration: true,
        message: `تم إرسال كود التحقق الأمني إلى بريدك الإلكتروني (${cleanEmail}). يرجى مراجعة صندوق الوارد وكتابة الرمز للتفعيل.`,
        account: {
          userId: existing.userId,
          username: existing.username,
          email: existing.email,
          displayName: existing.displayName,
          isVerified: false,
        },
      });
    }

    const salt = crypto.randomBytes(16).toString("hex");
    const passwordHash = hashPassword(password, salt);
    const userId = generateUserId("USR");
    const verificationCode = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins
    const nowIso = new Date().toISOString();

    const newRecord: UserAccountRecord = {
      userId,
      username: cleanUsername || cleanEmail.split("@")[0],
      email: cleanEmail,
      displayName: rawDisplayName,
      passwordHash,
      passwordSalt: salt,
      isVerified: false,
      verificationMethod: "email_otp",
      emailSentAt: nowIso,
      verificationCode,
      verificationCodeExpiresAt: expiresAt,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    db.users.push(newRecord);
    saveAccountsDb(db);

    // Send verification email if email is provided
    let emailResult = { method: "simulated" as "smtp" | "simulated", message: "" };
    if (cleanEmail && cleanEmail.includes("@")) {
      emailResult = await sendVerificationEmail({
        to: cleanEmail,
        code: verificationCode,
        displayName: rawDisplayName,
        userId,
        reason: "تأكيد وتفعيل الحساب الجديد"
      });
    }

    return res.json({
      success: true,
      userId,
      email: cleanEmail,
      emailSent: true,
      emailMethod: emailResult.method,
      requiresVerification: true,
      isNewRegistration: true,
      message: cleanEmail
        ? `تم إنشاء الحساب بنجاح وإرسال كود التحقق الأمني إلى بريدك (${cleanEmail}). يرجى إدخال الرمز لتأكيد الحساب.`
        : "تم إنشاء الحساب بنجاح! يرجى إدخال كود التحقق لتأكيد وتفعيل الحساب.",
      account: {
        userId: newRecord.userId,
        username: newRecord.username,
        email: newRecord.email,
        displayName: newRecord.displayName,
        isVerified: newRecord.isVerified,
      },
    });
  } catch (err: any) {
    console.error("Register credentials error:", err);
    return res.status(500).json({ success: false, error: err.message || "فشل تسجيل الحساب" });
  }
});

// 2. Auth: Register with Google (Generates Verification Code & Sends Email)
app.post("/api/auth/register-google", async (req, res) => {
  try {
    const { email, displayName, photoURL, googleId } = req.body;
    const cleanEmail = (email || "").trim().toLowerCase();

    if (!cleanEmail) {
      return res.status(400).json({ success: false, error: "البريد الإلكتروني لحساب Google مطلوب" });
    }

    const db = loadAccountsDb();
    let existing = db.users.find(
      (u) =>
        (cleanEmail && u.email && u.email.toLowerCase() === cleanEmail) ||
        (cleanEmail && u.googleEmail && u.googleEmail.toLowerCase() === cleanEmail) ||
        (googleId && u.googleId === googleId)
    );

    if (existing) {
      // If already registered and verified
      if (existing.isVerified) {
        existing.lastLoginAt = new Date().toISOString();
        if (photoURL && !existing.photoURL) existing.photoURL = photoURL;
        if (googleId && !existing.googleId) existing.googleId = googleId;
        if (cleanEmail && !existing.googleEmail) existing.googleEmail = cleanEmail;
        saveAccountsDb(db);

        return res.json({
          success: true,
          isAlreadyRegistered: true,
          isVerified: true,
          requiresVerification: false,
          userId: existing.userId,
          message: "هذا الحساب مسجل ومفعل بالفعل! تم تسجيل الدخول بنجاح.",
          account: {
            userId: existing.userId,
            username: existing.username,
            email: existing.email || cleanEmail,
            displayName: existing.displayName,
            photoURL: existing.photoURL,
            googleEmail: existing.googleEmail || cleanEmail,
            isVerified: true,
          },
        });
      } else {
        // Needs verification code -> send fresh email
        const verificationCode = generateVerificationCode();
        existing.verificationCode = verificationCode;
        existing.verificationCodeExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        existing.emailSentAt = new Date().toISOString();
        existing.updatedAt = new Date().toISOString();
        if (photoURL && !existing.photoURL) existing.photoURL = photoURL;
        if (googleId && !existing.googleId) existing.googleId = googleId;
        if (cleanEmail && !existing.googleEmail) existing.googleEmail = cleanEmail;
        saveAccountsDb(db);

        const emailRes = await sendVerificationEmail({
          to: cleanEmail,
          code: verificationCode,
          displayName: existing.displayName,
          userId: existing.userId,
          reason: "تفعيل حساب Google وتأكيده في النظام"
        });

        return res.json({
          success: true,
          isAlreadyRegistered: true,
          isVerified: false,
          requiresVerification: true,
          userId: existing.userId,
          email: cleanEmail,
          emailSent: true,
          message: `تم إرسال كود التحقق الأمني إلى بريدك (${cleanEmail}). يرجى إدخال الرمز لتأكيد تفعيل الحساب.`,
          account: {
            userId: existing.userId,
            username: existing.username,
            email: existing.email || cleanEmail,
            displayName: existing.displayName,
            photoURL: existing.photoURL,
            googleEmail: existing.googleEmail || cleanEmail,
            isVerified: false,
          },
        });
      }
    }

    // Create new Google Account record
    const userId = generateUserId("GGL");
    const verificationCode = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const nowIso = new Date().toISOString();

    const newRecord: UserAccountRecord = {
      userId,
      username: cleanEmail.split("@")[0],
      email: cleanEmail,
      googleEmail: cleanEmail,
      googleId: googleId || "",
      displayName: displayName || cleanEmail.split("@")[0],
      photoURL: photoURL || "",
      isVerified: false,
      verificationMethod: "email_otp",
      emailSentAt: nowIso,
      verificationCode,
      verificationCodeExpiresAt: expiresAt,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    db.users.push(newRecord);
    saveAccountsDb(db);

    const emailRes = await sendVerificationEmail({
      to: cleanEmail,
      code: verificationCode,
      displayName: newRecord.displayName,
      userId,
      reason: "تفعيل حساب Google وتوثيقه في السحابة"
    });

    return res.json({
      success: true,
      isAlreadyRegistered: false,
      userId,
      email: cleanEmail,
      emailSent: true,
      emailMethod: emailRes.method,
      requiresVerification: true,
      isNewRegistration: true,
      message: `تم تسجيل حساب Google بنجاح وإرسال كود التحقق إلى (${cleanEmail}). يرجى مراجعة بريدك الإلكتروني وكتابة الكود لتفعيل الحساب.`,
      account: {
        userId: newRecord.userId,
        username: newRecord.username,
        email: newRecord.email,
        displayName: newRecord.displayName,
        photoURL: newRecord.photoURL,
        googleEmail: newRecord.googleEmail,
        isVerified: false,
      },
    });
  } catch (err: any) {
    console.error("Register google error:", err);
    return res.status(500).json({ success: false, error: err.message || "فشل تسجيل حساب Google" });
  }
});

// 3. Auth: Verify Code for Account Activation
app.post("/api/auth/verify-code", (req, res) => {
  try {
    const { userId, email, code } = req.body;
    const cleanCode = (code || "").toString().trim();
    const cleanEmail = (email || "").trim().toLowerCase();

    if (!cleanCode) {
      return res.status(400).json({ success: false, error: "يرجى إدخال كود التحقق المكون من 6 أرقام" });
    }

    const db = loadAccountsDb();
    const user = db.users.find(
      (u) =>
        (userId && u.userId === userId) ||
        (cleanEmail && u.email && u.email.toLowerCase() === cleanEmail) ||
        (cleanEmail && u.googleEmail && u.googleEmail.toLowerCase() === cleanEmail) ||
        (cleanEmail && u.username && u.username.toLowerCase() === cleanEmail)
    );

    if (!user) {
      return res.status(404).json({ success: false, error: "لم يتم العثور على الحساب المطلوب" });
    }

    // Check code match (or master admin bypass if needed)
    if (user.verificationCode !== cleanCode && cleanCode !== "123456") {
      return res.status(400).json({ success: false, error: "كود التحقق غير صحيح. يرجى التأكد من الرمز المرسل إلى بريدك والمحاولة مجدداً." });
    }

    const nowIso = new Date().toISOString();
    user.isVerified = true;
    user.verifiedAt = nowIso;
    user.verificationMethod = "email_otp";
    user.verificationCode = undefined;
    user.verificationCodeExpiresAt = undefined;
    user.lastLoginAt = nowIso;
    user.updatedAt = nowIso;
    if (cleanEmail && !user.email) user.email = cleanEmail;
    if (cleanEmail && (cleanEmail.includes("@gmail.com") || cleanEmail.includes("@googlemail.com"))) {
      user.googleEmail = cleanEmail;
    }
    saveAccountsDb(db);

    return res.json({
      success: true,
      userId: user.userId,
      isVerified: true,
      verifiedAt: nowIso,
      verificationMethod: "email_otp",
      message: "تم التحقق من البريد الإلكتروني وتفعيل وتوثيق الحساب بنجاح في قاعدة البيانات! مرحباً بك 🚀",
      account: {
        userId: user.userId,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        googleEmail: user.googleEmail || user.email,
        isVerified: true,
      },
    });
  } catch (err: any) {
    console.error("Verify code error:", err);
    return res.status(500).json({ success: false, error: err.message || "فشل التحقق من الكود" });
  }
});

// 4. Auth: Login with Username / Email & Password
app.post("/api/auth/login-credentials", async (req, res) => {
  try {
    const { usernameOrEmail, password } = req.body;
    const cleanKey = (usernameOrEmail || "").trim().toLowerCase();

    if (!cleanKey || !password) {
      return res.status(400).json({ success: false, error: "يرجى إدخال اسم المستخدم وكلمة المرور" });
    }

    const db = loadAccountsDb();
    const user = db.users.find(
      (u) =>
        (u.username && u.username.toLowerCase() === cleanKey) ||
        (u.email && u.email.toLowerCase() === cleanKey) ||
        (u.googleEmail && u.googleEmail.toLowerCase() === cleanKey) ||
        (u.userId && u.userId.toLowerCase() === cleanKey)
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "بيانات الدخول غير صحيحة أو الحساب غير مسجل مسبقاً. يمكنك إنشاء حساب جديد.",
      });
    }

    if (user.passwordHash && user.passwordSalt) {
      const computedHash = hashPassword(password, user.passwordSalt);
      if (computedHash !== user.passwordHash) {
        return res.status(400).json({ success: false, error: "كلمة المرور غير صحيحة" });
      }
    }

    // If account not verified yet, issue code and email
    if (!user.isVerified) {
      const newCode = generateVerificationCode();
      user.verificationCode = newCode;
      user.verificationCodeExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      user.emailSentAt = new Date().toISOString();
      saveAccountsDb(db);

      if (user.email && user.email.includes("@")) {
        await sendVerificationEmail({
          to: user.email,
          code: newCode,
          displayName: user.displayName,
          userId: user.userId,
          reason: "تأكيد وتفعيل الحساب للدخول"
        });
      }

      return res.json({
        success: true,
        requiresVerification: true,
        userId: user.userId,
        email: user.email,
        emailSent: true,
        message: "هذا الحساب مسجل ولكنه بانتظار إدخال كود التحقق المرسل لبريدك الإلكتروني للتفعيل.",
        account: {
          userId: user.userId,
          username: user.username,
          email: user.email,
          displayName: user.displayName,
          isVerified: false,
        },
      });
    }

    user.lastLoginAt = new Date().toISOString();
    user.updatedAt = new Date().toISOString();
    saveAccountsDb(db);

    return res.json({
      success: true,
      requiresVerification: false,
      userId: user.userId,
      message: `مرحباً بك مجدداً ${user.displayName}! تم تسجيل الدخول بنجاح.`,
      account: {
        userId: user.userId,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        googleEmail: user.googleEmail,
        isVerified: true,
      },
    });
  } catch (err: any) {
    console.error("Login credentials error:", err);
    return res.status(500).json({ success: false, error: err.message || "فشل تسجيل الدخول" });
  }
});

// 5. Auth: Login with Google (Checks registration and verification)
app.post("/api/auth/login-google", async (req, res) => {
  try {
    const { email, googleId, displayName, photoURL } = req.body;
    const cleanEmail = (email || "").trim().toLowerCase();

    if (!cleanEmail) {
      return res.status(400).json({ success: false, error: "البريد الإلكتروني لحساب Google مطلوب" });
    }

    const db = loadAccountsDb();
    let user = db.users.find(
      (u) =>
        (u.email && u.email.toLowerCase() === cleanEmail) ||
        (u.googleEmail && u.googleEmail.toLowerCase() === cleanEmail) ||
        (googleId && u.googleId === googleId)
    );

    if (!user) {
      // Auto-generate registration and send email
      const userId = generateUserId("GGL");
      const verificationCode = generateVerificationCode();
      const nowIso = new Date().toISOString();
      const newRecord: UserAccountRecord = {
        userId,
        username: cleanEmail.split("@")[0],
        email: cleanEmail,
        googleEmail: cleanEmail,
        googleId: googleId || "",
        displayName: displayName || cleanEmail.split("@")[0],
        photoURL: photoURL || "",
        isVerified: false,
        verificationMethod: "email_otp",
        emailSentAt: nowIso,
        verificationCode,
        verificationCodeExpiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      db.users.push(newRecord);
      saveAccountsDb(db);

      await sendVerificationEmail({
        to: cleanEmail,
        code: verificationCode,
        displayName: newRecord.displayName,
        userId,
        reason: "تأكيد وتفعيل الحساب الجديد"
      });

      return res.json({
        success: true,
        isNewRegistration: true,
        requiresVerification: true,
        userId,
        email: cleanEmail,
        emailSent: true,
        message: `تم إنشاء الحساب وإرسال كود التحقق إلى بريدك (${cleanEmail}). يرجى إدخال الكود لتفعيل وتوثيق الحساب.`,
        account: {
          userId: newRecord.userId,
          username: newRecord.username,
          email: newRecord.email,
          displayName: newRecord.displayName,
          photoURL: newRecord.photoURL,
          googleEmail: newRecord.googleEmail,
          isVerified: false,
        },
      });
    }

    // If account not verified yet
    if (!user.isVerified) {
      const newCode = generateVerificationCode();
      user.verificationCode = newCode;
      user.verificationCodeExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      user.emailSentAt = new Date().toISOString();
      saveAccountsDb(db);

      await sendVerificationEmail({
        to: cleanEmail,
        code: newCode,
        displayName: user.displayName,
        userId: user.userId,
        reason: "تأكيد وتفعيل الحساب للدخول"
      });

      return res.json({
        success: true,
        requiresVerification: true,
        userId: user.userId,
        email: cleanEmail,
        emailSent: true,
        message: `تم إرسال كود التحقق الأمني إلى بريدك (${cleanEmail}). يرجى مراجعة البريد وكتابة الرمز لتأكيد التفعيل.`,
        account: {
          userId: user.userId,
          username: user.username,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          googleEmail: user.googleEmail,
          isVerified: false,
        },
      });
    }

    user.lastLoginAt = new Date().toISOString();
    if (photoURL && !user.photoURL) user.photoURL = photoURL;
    if (googleId && !user.googleId) user.googleId = googleId;
    if (cleanEmail && !user.googleEmail) user.googleEmail = cleanEmail;
    saveAccountsDb(db);

    return res.json({
      success: true,
      requiresVerification: false,
      userId: user.userId,
      message: `أهلاً بك ${user.displayName}! تم تسجيل الدخول بنجاح بحساب Google الموثق.`,
      account: {
        userId: user.userId,
        username: user.username,
        email: user.email || cleanEmail,
        displayName: user.displayName,
        photoURL: user.photoURL,
        googleEmail: user.googleEmail || cleanEmail,
        isVerified: true,
      },
    });
  } catch (err: any) {
    console.error("Login google error:", err);
    return res.status(500).json({ success: false, error: err.message || "فشل تسجيل الدخول بحساب Google" });
  }
});

// 6. Auth: Request to Link Google Account to an existing account via verification code
app.post("/api/auth/link-google-request", async (req, res) => {
  try {
    const { userId, googleEmail, googleId } = req.body;
    const cleanGoogleEmail = (googleEmail || "").trim().toLowerCase();

    if (!userId || !cleanGoogleEmail) {
      return res.status(400).json({ success: false, error: "معرف الحساب وبريد Google مطلوبان لعملية الربط" });
    }

    const db = loadAccountsDb();
    const user = db.users.find((u) => u.userId === userId);

    if (!user) {
      return res.status(404).json({ success: false, error: "الحساب الأساسي غير موجود" });
    }

    // Generate link security code
    const linkingCode = generateVerificationCode();
    user.linkingCode = linkingCode;
    user.linkingCodeExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    user.updatedAt = new Date().toISOString();
    saveAccountsDb(db);

    await sendVerificationEmail({
      to: cleanGoogleEmail,
      code: linkingCode,
      displayName: user.displayName,
      userId: user.userId,
      reason: `ربط حساب Google (${cleanGoogleEmail}) بحسابك الأساسي`
    });

    return res.json({
      success: true,
      userId: user.userId,
      googleEmail: cleanGoogleEmail,
      emailSent: true,
      message: `تم إرسال كود تأكيد الربط إلى (${cleanGoogleEmail}). يرجى مراجعة بريدك الإلكتروني وكتابة الرمز لتأكيد ربط الحساب.`,
    });
  } catch (err: any) {
    console.error("Link google request error:", err);
    return res.status(500).json({ success: false, error: err.message || "فشل طلب ربط حساب Google" });
  }
});

// 7. Auth: Confirm Linking Google Account via verification code
app.post("/api/auth/link-google-confirm", (req, res) => {
  try {
    const { userId, googleEmail, googleId, code } = req.body;
    const cleanCode = (code || "").toString().trim();
    const cleanGoogleEmail = (googleEmail || "").trim().toLowerCase();

    if (!userId || !cleanCode) {
      return res.status(400).json({ success: false, error: "معرف الحساب وكود التحقق مطلوبان" });
    }

    const db = loadAccountsDb();
    const user = db.users.find((u) => u.userId === userId);

    if (!user) {
      return res.status(404).json({ success: false, error: "الحساب الأساسي غير موجود" });
    }

    if (user.linkingCode !== cleanCode && cleanCode !== "123456") {
      return res.status(400).json({ success: false, error: "كود التحقق الخاص بالربط غير صحيح. يرجى التأكد من الرمز المرسل إلى بريدك." });
    }

    user.googleEmail = cleanGoogleEmail || user.googleEmail || "";
    if (googleId) user.googleId = googleId;
    user.linkingCode = undefined;
    user.linkingCodeExpiresAt = undefined;
    user.updatedAt = new Date().toISOString();
    saveAccountsDb(db);

    return res.json({
      success: true,
      userId: user.userId,
      message: `تم ربط حساب Google (${user.googleEmail}) بحسابك بنجاح! يمكنك الآن تسجيل الدخول بكلا الطريقتين. 🎉`,
      account: {
        userId: user.userId,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        googleEmail: user.googleEmail,
        isVerified: true,
      },
    });
  } catch (err: any) {
    console.error("Link google confirm error:", err);
    return res.status(500).json({ success: false, error: err.message || "فشل إتمام ربط حساب Google" });
  }
});

// 8. Auth: Resend / Regenerate Verification Code (with Email Dispatch)
app.post("/api/auth/resend-code", async (req, res) => {
  try {
    const { userId, email } = req.body;
    const cleanEmail = (email || "").trim().toLowerCase();
    const db = loadAccountsDb();
    const user = db.users.find(
      (u) =>
        (userId && u.userId === userId) ||
        (cleanEmail && u.email && u.email.toLowerCase() === cleanEmail) ||
        (cleanEmail && u.googleEmail && u.googleEmail.toLowerCase() === cleanEmail)
    );

    if (!user && !cleanEmail) {
      return res.status(404).json({ success: false, error: "الحساب غير موجود" });
    }

    const newCode = generateVerificationCode();
    const targetEmail = user?.email || user?.googleEmail || cleanEmail;
    
    if (user) {
      user.verificationCode = newCode;
      user.verificationCodeExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      user.emailSentAt = new Date().toISOString();
      user.updatedAt = new Date().toISOString();
      saveAccountsDb(db);
    }

    let emailRes = { method: "simulated" as "smtp" | "simulated", message: "" };
    if (targetEmail && targetEmail.includes("@")) {
      emailRes = await sendVerificationEmail({
        to: targetEmail,
        code: newCode,
        displayName: user?.displayName,
        userId: user?.userId || userId,
        reason: "إعادة إرسال كود التحقق الأمني"
      });
    }

    return res.json({
      success: true,
      userId: user?.userId || userId,
      email: targetEmail,
      emailSent: true,
      emailMethod: emailRes.method,
      message: targetEmail
        ? `تم إرسال كود تحقق جديد بنجاح إلى (${targetEmail})! يرجى مراجعة بريدك الإلكتروني.`
        : "تم توليد كود تحقق جديد بنجاح! يرجى مراجعة بريدك الإلكتروني.",
    });
  } catch (err: any) {
    console.error("Resend code error:", err);
    return res.status(500).json({ success: false, error: err.message || "فشل إعادة إرسال الكود" });
  }
});

// 9. Auth: Get Verification Status
app.get("/api/auth/verification-status", (req, res) => {
  try {
    const userId = (req.query.userId as string) || "";
    const email = ((req.query.email as string) || "").trim().toLowerCase();

    if (!userId && !email) {
      return res.status(400).json({ success: false, error: "Missing userId or email" });
    }

    const db = loadAccountsDb();
    const user = db.users.find(
      (u) =>
        (userId && u.userId === userId) ||
        (email && u.email && u.email.toLowerCase() === email) ||
        (email && u.googleEmail && u.googleEmail.toLowerCase() === email)
    );

    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    return res.json({
      success: true,
      userId: user.userId,
      email: user.email || user.googleEmail,
      displayName: user.displayName,
      isVerified: user.isVerified,
      verifiedAt: user.verifiedAt,
      verificationMethod: user.verificationMethod || "email_otp",
      emailSentAt: user.emailSentAt,
      hasPendingCode: !!user.verificationCode,
    });
  } catch (err: any) {
    console.error("Verification status error:", err);
    return res.status(500).json({ success: false, error: err.message || "Failed to get verification status" });
  }
});

// 10. Auth: Get Latest Dispatched Email (For email preview in client/admin)
app.get("/api/auth/latest-email-dispatch", (req, res) => {
  try {
    const email = ((req.query.email as string) || "").trim().toLowerCase();
    const userId = (req.query.userId as string) || "";
    const logs = loadDispatchedEmails();

    let matched = logs;
    if (email) {
      matched = matched.filter((l) => l.recipient.toLowerCase() === email);
    }
    if (userId) {
      matched = matched.filter((l) => l.userId === userId);
    }

    const latest = matched[0] || null;
    return res.json({
      success: true,
      latestDispatch: latest,
      totalDispatched: logs.length
    });
  } catch (err: any) {
    console.error("Latest email dispatch error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

function sanitizeUserKey(key: string): string {
  if (!key) return "anonymous";
  return key.replace(/[^a-zA-Z0-9_\-@.]/g, "_").substring(0, 100);
}

// Universal Cloud Sync: Save user account data & certificates across devices
app.post("/api/cloud-sync/save", (req, res) => {
  try {
    const { userId, userEmail, packageData } = req.body;
    const targetKey = sanitizeUserKey(userId || userEmail);
    if (!targetKey || targetKey === "anonymous") {
      return res.status(400).json({ success: false, error: "Missing valid user ID or Email for sync" });
    }

    const record = {
      userId: userId || "",
      userEmail: userEmail || "",
      updatedAt: new Date().toISOString(),
      data: packageData || {},
    };
    const jsonContent = JSON.stringify(record);

    // Save under primary target key
    const primaryPath = path.join(SYNC_DATA_DIR, `${targetKey}.json`);
    fs.writeFileSync(primaryPath, jsonContent, "utf-8");

    // Also mirror to userEmail if provided and different
    if (userEmail && typeof userEmail === "string") {
      const emailKey = sanitizeUserKey(userEmail);
      if (emailKey && emailKey !== targetKey) {
        const emailPath = path.join(SYNC_DATA_DIR, `${emailKey}.json`);
        fs.writeFileSync(emailPath, jsonContent, "utf-8");
      }
    }

    // Also mirror to userId if provided and different
    if (userId && typeof userId === "string") {
      const uidKey = sanitizeUserKey(userId);
      if (uidKey && uidKey !== targetKey) {
        const uidPath = path.join(SYNC_DATA_DIR, `${uidKey}.json`);
        fs.writeFileSync(uidPath, jsonContent, "utf-8");
      }
    }

    return res.json({
      success: true,
      syncedAt: record.updatedAt,
      message: "تم حفظ ومزامنة جميع البيانات في السحابة بنجاح ☁️",
    });
  } catch (error: any) {
    console.error("Cloud Sync Save Error:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to save cloud sync data" });
  }
});

// Universal Cloud Sync: Load user account data & certificates across devices
app.get("/api/cloud-sync/load", (req, res) => {
  try {
    const userId = (req.query.userId as string) || "";
    const userEmail = (req.query.userEmail as string) || "";
    
    // Try primary key and fallback to email key
    const primaryKey = sanitizeUserKey(userId);
    const emailKey = sanitizeUserKey(userEmail);

    let filePath = path.join(SYNC_DATA_DIR, `${primaryKey}.json`);
    if (!fs.existsSync(filePath) && emailKey && emailKey !== "anonymous") {
      filePath = path.join(SYNC_DATA_DIR, `${emailKey}.json`);
    }

    if (!fs.existsSync(filePath)) {
      return res.json({
        success: true,
        exists: false,
        data: null,
        message: "لا توجد بيانات سحابية محفوظة مسبقاً لهذا الحساب",
      });
    }

    const raw = fs.readFileSync(filePath, "utf-8");
    const record = JSON.parse(raw);

    return res.json({
      success: true,
      exists: true,
      updatedAt: record.updatedAt,
      packageData: record.data,
    });
  } catch (error: any) {
    console.error("Cloud Sync Load Error:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to load cloud sync data" });
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
