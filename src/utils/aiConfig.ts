export type AIProvider = 'gemini' | 'openai' | 'anthropic' | 'deepseek' | 'groq' | 'custom';

export type AITone = 
  | 'رسمي وفخم' 
  | 'حماسي ومحفز' 
  | 'شاعري وبليغ' 
  | 'لطيف للأطفال' 
  | 'مسجوع وأدبي' 
  | 'موجز ومباشر'
  | 'قرآني وإسلامي'
  | 'أكاديمي رسمي';

export interface AISettings {
  provider: AIProvider;
  apiKey?: string;
  model: string;
  customApiUrl?: string;
  temperature: number;
  maxTokens?: number;
  tone: AITone;
  systemInstruction?: string;
  autoGenderAdaptation: boolean;
  autoLocalFallback: boolean;
}

export interface AIProviderInfo {
  id: AIProvider;
  name: string;
  badge: string;
  description: string;
  defaultBaseUrl: string;
  defaultModel: string;
  keyPlaceholder: string;
  keyDocsUrl: string;
  models: AIModelOption[];
}

export interface AIModelOption {
  id: string;
  name: string;
  badge: string;
  description: string;
  provider: AIProvider;
  recommended?: boolean;
}

export const AI_PROVIDERS: AIProviderInfo[] = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    badge: 'الافتراضي والأسرع ⚡',
    description: 'نماذج Google المتطورة المدعومة بتقنيات الفهم اللغوي البلاغي فائق الدقة.',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com',
    defaultModel: 'gemini-3.6-flash',
    keyPlaceholder: 'AIzaSy...',
    keyDocsUrl: 'https://aistudio.google.com/app/apikey',
    models: [
      {
        id: 'gemini-3.7-flash',
        name: 'Gemini 3.7 Flash',
        badge: 'الجيل الأحدث 🚀',
        description: 'أقوى نموذج من جوجل لعام 2026 مع قدرات تفكير متقدمة وصياغة بلاغية فائقة.',
        provider: 'gemini',
      },
      {
        id: 'gemini-3.6-flash',
        name: 'Gemini 3.6 Flash',
        badge: 'الأحدث والموصى به ⚡',
        description: 'النموذج المعتمد والأسرع لصياغة الشهادات بدقة عالية وبلاغة استثنائية.',
        provider: 'gemini',
        recommended: true,
      },
      {
        id: 'gemini-1.5-flash',
        name: 'Gemini 1.5 Flash',
        badge: 'مستقر وخفيف 🌿',
        description: 'النموذج السريع المستقر، موثوق للاستخدام اليومي وصياغة الشهادات الجماعية.',
        provider: 'gemini',
      },
      {
        id: 'gemini-1.5-pro',
        name: 'Gemini 1.5 Pro',
        badge: 'تحليل وبلاغة عميقة 🧠',
        description: 'نموذج التفكير العميق والتحليل الأدبي الموسع للشهادات التقديرية الرفيعة.',
        provider: 'gemini',
      },
    ],
  },
  {
    id: 'openai',
    name: 'OpenAI (ChatGPT)',
    badge: 'GPT-4o & o3-mini 🤖',
    description: 'نماذج OpenAI الرائدة عالمياً في الصياغة الإبداعية والأدبية.',
    defaultBaseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    keyPlaceholder: 'sk-proj-...',
    keyDocsUrl: 'https://platform.openai.com/api-keys',
    models: [
      {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        badge: 'سريع واقتصادي 💡',
        description: 'أداء ممتاز وسرعة فائقة في معالجة وتوليد النصوص العربية.',
        provider: 'openai',
        recommended: true,
      },
      {
        id: 'gpt-4o',
        name: 'GPT-4o (Omni)',
        badge: 'الرائد والأشمل 🌟',
        description: 'النموذج الأقوى من OpenAI في البلاغة العربية وتوليد الأفكار الابتكارية.',
        provider: 'openai',
      },
      {
        id: 'o3-mini',
        name: 'o3-mini (Reasoning)',
        badge: 'استدلال ذكي 🧩',
        description: 'نموذج التفكير المنطقي لإنشاء عبارات استثنائية موجهة بدقة.',
        provider: 'openai',
      },
    ],
  },
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    badge: 'Claude 3.5 Sonnet ✍️',
    description: 'أفضل نماذج الذكاء الاصطناعي في الفصاحة والكتابة الأدبية الطبيعية والمتقنة.',
    defaultBaseUrl: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-3-5-sonnet-20241022',
    keyPlaceholder: 'sk-ant-...',
    keyDocsUrl: 'https://console.anthropic.com/settings/keys',
    models: [
      {
        id: 'claude-3-5-sonnet-20241022',
        name: 'Claude 3.5 Sonnet',
        badge: 'فصاحة وبلاغة استثنائية 💎',
        description: 'المعيار الذهبي في جودة الصياغة اللغوية والتراكيب البلاغية العربية.',
        provider: 'anthropic',
        recommended: true,
      },
      {
        id: 'claude-3-5-haiku-20241022',
        name: 'Claude 3.5 Haiku',
        badge: 'فائق السرعة ⚡',
        description: 'نموذج خفيف وسريع جداً للاقتراحات المباشرة والشهادات السريعة.',
        provider: 'anthropic',
      },
    ],
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    badge: 'DeepSeek V3 & R1 🧠',
    description: 'نماذج ديب سيك المتقدمة ذات الأداء المذهل والتكلفة الاقتصادية.',
    defaultBaseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    keyPlaceholder: 'sk-...',
    keyDocsUrl: 'https://platform.deepseek.com/api_keys',
    models: [
      {
        id: 'deepseek-chat',
        name: 'DeepSeek V3 (Chat)',
        badge: 'أداء ممتاز 🚀',
        description: 'نموذج شامل عالي السرعة والجودة في الصياغة والتحسين اللغوي.',
        provider: 'deepseek',
        recommended: true,
      },
      {
        id: 'deepseek-reasoner',
        name: 'DeepSeek R1 (Reasoner)',
        badge: 'تفكير واستدلال عميق 🎯',
        description: 'نموذج الاستدلال المتعمق لإنشاء نصوص فريدة وصياغات ملكية.',
        provider: 'deepseek',
      },
    ],
  },
  {
    id: 'groq',
    name: 'Groq (Llama / Mixtral)',
    badge: 'سرعة البرق الاستثنائية ⚡',
    description: 'تشغيل نماذج مفتوحة المصدر (Llama 3.3) بسرعات فائقة تتجاوز 300 كلمة في الثانية.',
    defaultBaseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
    keyPlaceholder: 'gsk_...',
    keyDocsUrl: 'https://console.groq.com/keys',
    models: [
      {
        id: 'llama-3.3-70b-versatile',
        name: 'Llama 3.3 70B Versatile',
        badge: 'الأقوى مفتوح المصدر 🏆',
        description: 'أقوى نماذج ميتا مفتوحة المصدر مع فصاحة عربية وسرعة استجابة مذهلة.',
        provider: 'groq',
        recommended: true,
      },
      {
        id: 'llama-3.1-8b-instant',
        name: 'Llama 3.1 8B Instant',
        badge: 'خاطف السرعة ⚡',
        description: 'استجابة فورية جداً تناسب المراجعة الحية والاقتراحات اللحظية.',
        provider: 'groq',
      },
    ],
  },
  {
    id: 'custom',
    name: 'مزود مخصص (OpenAI-Compatible)',
    badge: 'Ollama / LM Studio / OpenRouter 🌐',
    description: 'توصيل أي سيرفر ذكاء اصطناعي محلي (Local Ollama) أو بوابة سحابية تدعم بروتوكول OpenAI.',
    defaultBaseUrl: 'http://localhost:11434/v1',
    defaultModel: 'llama3',
    keyPlaceholder: 'مفتاح الـ API أو اتركه فارغاً للسيرفرات المحلية',
    keyDocsUrl: 'https://ollama.com',
    models: [
      {
        id: 'custom-model',
        name: 'نموذج مخصص (حسب إعدادات السيرفر)',
        badge: 'مخصص ⚙️',
        description: 'سيتم توجيه الطلبات إلى عنوان السيرفر والنموذج المحدد.',
        provider: 'custom',
      },
    ],
  },
];

export const SUPPORTED_AI_MODELS: AIModelOption[] = AI_PROVIDERS.flatMap((p) => p.models);

export const DEFAULT_AI_SETTINGS: AISettings = {
  provider: 'gemini',
  apiKey: '',
  model: 'gemini-3.6-flash',
  customApiUrl: '',
  temperature: 0.7,
  maxTokens: 1000,
  tone: 'رسمي وفخم',
  systemInstruction: '',
  autoGenderAdaptation: true,
  autoLocalFallback: true,
};

const STORAGE_KEY = 'taqdeer_ai_settings_v1';

export function getSavedAISettings(): AISettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_AI_SETTINGS,
        ...parsed,
      };
    }
  } catch (err) {
    console.warn('Error reading saved AI settings:', err);
  }
  return DEFAULT_AI_SETTINGS;
}

export function saveAISettings(settings: AISettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent('taqdeer_ai_settings_changed', { detail: settings }));
  } catch (err) {
    console.error('Error saving AI settings:', err);
  }
}

export function resetAISettings(): AISettings {
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('taqdeer_ai_settings_changed', { detail: DEFAULT_AI_SETTINGS }));
  } catch (err) {
    console.error('Error resetting AI settings:', err);
  }
  return DEFAULT_AI_SETTINGS;
}

export function getAIRequestHeaders(settings?: AISettings): Record<string, string> {
  const cfg = settings || getSavedAISettings();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-ai-provider': cfg.provider || 'gemini',
  };

  if (cfg.apiKey && cfg.apiKey.trim().length > 0) {
    headers['x-ai-api-key'] = cfg.apiKey.trim();
    headers['x-gemini-api-key'] = cfg.apiKey.trim();
  }

  if (cfg.model && cfg.model.trim().length > 0) {
    headers['x-ai-model'] = cfg.model.trim();
    headers['x-gemini-model'] = cfg.model.trim();
  }

  if (cfg.customApiUrl && cfg.customApiUrl.trim().length > 0) {
    headers['x-ai-custom-url'] = cfg.customApiUrl.trim();
  }

  return headers;
}

// دالة فحص الاتصال الموجّهة حصراً إلى خادم الـ API
export async function testAIConnection(settings?: AISettings): Promise<{
  success: boolean;
  latencyMs?: number;
  modelUsed?: string;
  providerUsed?: string;
  message: string;
  details?: string;
}> {
  const cfg = settings || getSavedAISettings();
  const startTime = Date.now();

  try {
    const response = await fetch('/api/test-ai-connection', {
      method: 'POST',
      headers: getAIRequestHeaders(cfg),
      body: JSON.stringify({
        provider: cfg.provider || 'gemini',
        apiKey: cfg.apiKey?.trim() || undefined,
        model: cfg.model?.trim() || 'gemini-3.6-flash',
        customApiUrl: cfg.customApiUrl?.trim() || undefined,
      }),
    });

    const elapsed = Date.now() - startTime;
    const data = await response.json();

    if (response.ok && data.success) {
      return {
        success: true,
        latencyMs: data.latencyMs || elapsed,
        modelUsed: data.modelUsed || cfg.model,
        providerUsed: data.providerUsed || cfg.provider,
        message: data.message || 'تم الاتصال بالذكاء الاصطناعي بنجاح تام! 🟢',
      };
    } else {
      return {
        success: false,
        latencyMs: elapsed,
        modelUsed: cfg.model,
        providerUsed: cfg.provider,
        message: data.error || 'فشل الاتصال بالـ API. يرجى مراجعة المفتاح والنموذج.',
        details: data.details,
      };
    }
  } catch (err: any) {
    const elapsed = Date.now() - startTime;
    return {
      success: false,
      latencyMs: elapsed,
      modelUsed: cfg.model,
      providerUsed: cfg.provider,
      message: 'تعذر الوصول إلى خادم الذكاء الاصطناعي (تحقق من الشبكة وإعدادات المزود)',
      details: err?.message || String(err),
    };
  }
}

export interface TextVariation {
  id: number;
  text: string;
  styleLabel: string;
  toneTag?: string;
}

export interface ImproveTextParams {
  text: string;
  type: 'appreciation' | 'title' | 'intro' | 'poem' | 'full';
  style?: string;
  gender?: 'male' | 'female';
  studentName?: string;
  subject?: string;
  grade?: string;
  schoolName?: string;
  settings?: AISettings;
}

export function generateLocalTextVariations(params: ImproveTextParams): TextVariation[] {
  const isFemale = params.gender === 'female';
  const subj = params.subject || 'التفوق والتميز الدراسي';

  if (params.type === 'title') {
    return [
      { id: 1, text: 'شهادة شكر وتقدير ووفاء', styleLabel: 'كلاسيكي رسمي فخم' },
      { id: 2, text: 'وسام التميز والتفوق الأكاديمي', styleLabel: 'أكاديمي ملكي' },
      { id: 3, text: 'شهادة إشادة وإنجاز استثنائي', styleLabel: 'حماسي ملهم' },
    ];
  }

  if (params.type === 'intro') {
    return [
      {
        id: 1,
        text: isFemale
          ? `يسر إدارة المدرسة ومعلماتها أن تمنح هذه الشهادة للطالبة النجيبة:`
          : `يسر إدارة المدرسة ومعلميها أن تمنح هذه الشهادة للطالب النجيب:`,
        styleLabel: 'رسمي ومهني',
      },
      {
        id: 2,
        text: isFemale
          ? `بفيضٍ من الفخر والاعتزاز، تُهدي إدارة المدرسة وسام الشكر والتقدير إلى قرة العين الطالبة:`
          : `بفيضٍ من الفخر والاعتزاز، تُهدي إدارة المدرسة وسام الشكر والتقدير إلى قرة العين الطالب:`,
        styleLabel: 'بليغ ومؤثر',
      },
      {
        id: 3,
        text: isFemale
          ? `تقديراً لعلو الهمة وصدق العزيمة، نمنح هذه الشهادة المعتمدة لنجمة التميز:`
          : `تقديراً لعلو الهمة وصدق العزيمة، نمنح هذه الشهادة المعتمدة لفارس التميز:`,
        styleLabel: 'حماسي ومشجع',
      },
    ];
  }

  if (params.type === 'poem') {
    if (isFemale) {
      return [
        { id: 1, text: 'العِلْمُ يَرْفَعُ بَيْتًا لا عِمَادَ لَهُ ... وَالجَهْلُ يَهْدِمُ بَيْتَ العِزِّ وَالشَّرَفِ', styleLabel: 'حكمة شعرية كلاسيكية' },
        { id: 2, text: 'يا شُعْلَةَ العِلْمِ يَا رَمْزَ الفَخَارِ سَمَتْ ... بِكِ المَعَالِي وَنِلْتِ العِزَّ وَالشَّرَفَا', styleLabel: 'فخر واعتزاز بالمكرمة' },
        { id: 3, text: '«مَنْ سَارَ فِي دَرْبِ الهُدَى بَلَغَ المُنَى ... وَجَنَى مِنَ الإِبْدَاعِ زَهْرَ خُلُودِهِ»', styleLabel: 'شعر إبداعي تحفيزي' },
      ];
    } else {
      return [
        { id: 1, text: 'العِلْمُ يَرْفَعُ بَيْتًا لا عِمَادَ لَهُ ... وَالجَهْلُ يَهْدِمُ بَيْتَ العِزِّ وَالشَّرَفِ', styleLabel: 'حكمة شعرية كلاسيكية' },
        { id: 2, text: 'يا كَوْكَبَ المَجْدِ وَالإِبْدَاعِ مُؤْتَلِقًا ... نِلْتَ المَعَالِيَ إِقْدَامًا وَإِتْقَانَا', styleLabel: 'فخر واعتزاز بالمكرم' },
        { id: 3, text: '«مَنْ خَطَا نَحْوَ العُلَا خُطْوَةً ... جَنَى مِنَ الثِّمَارِ أَحْلَى النِّعَم»', styleLabel: 'شعر إبداعي تحفيزي' },
      ];
    }
  }

  if (isFemale) {
    return [
      {
        id: 1,
        text: `تقديراً لجهودها المخلصة وتفوقها المشهود في ${subj}، وانضباطها المثالي وحرصها الدائم على طلب العلا والتميز، سائلين الله العلي القدير أن يبارك في علمها ويزيدها توفيقاً وتألقاً في مسيرتها المباركة.`,
        styleLabel: 'صياغة ملكية وفخمة',
        toneTag: 'رسمي وفخم',
      },
      {
        id: 2,
        text: `إشادةً بعلو همتها وسمو أخلاقها وتميزها الباهر في ${subj}؛ حيث سطرت بإخلاصها ومثابرتها أروع نماذج الإبداع والنجاح. دمتِ شعلة وضاءة في سماء المعرفة ومصدر فخر لوالديك ومدرستك.`,
        styleLabel: 'أسلوب مسجوع وبليغ',
        toneTag: 'مسجوع وأدبي',
      },
      {
        id: 3,
        text: `نظير مشاركتها الفاعلة وشغفها المستمر نحو الإتقان والإنجاز في ${subj}. نبارك لها هذا التألق المستحق، ونتمنى لها مستقبلاً مشرقاً يزخر بمزيد من الريادة والنجاحات الباهرة.`,
        styleLabel: 'أسلوب حماسي ملهم وموجز',
        toneTag: 'حماسي ومحفز',
      },
    ];
  } else {
    return [
      {
        id: 1,
        text: `تقديراً لجهوده المخلصة وتفوقه المشهود في ${subj}، وانضباطه المثالي وحرصه الدائم على طلب العلا والتميز، سائلين الله العلي القدير أن يبارك في علمه ويزيده توفيقاً وتألقاً في مسيرته المباركة.`,
        styleLabel: 'صياغة ملكية وفخمة',
        toneTag: 'رسمي وفخم',
      },
      {
        id: 2,
        text: `إشادةً بعلو همته وسمو أخلاقه وتميزه الباهر في ${subj}؛ حيث سطر بإخلاصه ومثابرتها أروع نماذج الإبداع والنجاح. دمت كوكباً وضاءً في سماء المعرفة ومصدر فخر لوالديك ومدرستك.`,
        styleLabel: 'أسلوب مسجوع وبليغ',
        toneTag: 'مسجوع وأدبي',
      },
      {
        id: 3,
        text: `نظير مشاركته الفاعلة وشغفه المستمر نحو الإتقان والإنجاز في ${subj}. نبارك له هذا التألق المستحق، ونتمنى له مستقبلاً مشرقاً يزخر بمزيد من الريادة والنجاحات الباهرة.`,
        styleLabel: 'أسلوب حماسي ملهم وموجز',
        toneTag: 'حماسي ومحفز',
      },
    ];
  }
}

export async function improveCertificateTextWithAi(params: ImproveTextParams): Promise<{
  success: boolean;
  variations: TextVariation[];
  error?: string;
  source: 'ai' | 'local_fallback';
}> {
  const cfg = params.settings || getSavedAISettings();

  try {
    const response = await fetch('/api/ai-improve-text', {
      method: 'POST',
      headers: getAIRequestHeaders(cfg),
      body: JSON.stringify({
        text: params.text,
        type: params.type,
        style: params.style,
        gender: params.gender || 'male',
        studentName: params.studentName,
        subject: params.subject,
        grade: params.grade,
        schoolName: params.schoolName,
        tone: cfg.tone,
        temperature: cfg.temperature,
        systemInstruction: cfg.systemInstruction,
        apiKey: cfg.apiKey?.trim() || undefined,
        model: cfg.model?.trim() || 'gemini-3.6-flash',
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data && data.success && Array.isArray(data.variations) && data.variations.length > 0) {
        return {
          success: true,
          variations: data.variations,
          source: 'ai',
        };
      }
    }
  } catch (err) {
    console.warn('AI Text Improvement network error, utilizing smart local fallback:', err);
  }

  const fallbackVariations = generateLocalTextVariations(params);
  return {
    success: true,
    variations: fallbackVariations,
    source: 'local_fallback',
  };
}
