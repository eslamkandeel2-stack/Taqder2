export interface AISettings {
  apiKey?: string;
  model: string;
  temperature: number;
  tone: 'رسمي وفخم' | 'حماسي ومحفز' | 'شاعري وبليغ' | 'لطيف للأطفال' | 'مسجوع وأدبي' | 'موجز ومباشر';
  systemInstruction?: string;
  customApiUrl?: string;
  autoLocalFallback: boolean;
}

export interface AIModelOption {
  id: string;
  name: string;
  badge: string;
  description: string;
  recommended?: boolean;
}

export const SUPPORTED_AI_MODELS: AIModelOption[] = [
  {
    id: 'gemini-3.6-flash',
    name: 'Gemini 3.6 Flash',
    badge: 'الأحدث والموصى به ⚡',
    description: 'النموذج المعتمد والأسرع لصياغة الشهادات بدقة عالية وبلاغة استثنائية.',
    recommended: true,
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    badge: 'مستقر وسريع 🚀',
    description: 'النموذج السريع المستقر، موثوق للاستخدام اليومي وصياغة الشهادات الفردية والجماعية.',
  },
];

export const DEFAULT_AI_SETTINGS: AISettings = {
  apiKey: '',
  model: 'gemini-3.6-flash',
  temperature: 0.7,
  tone: 'رسمي وفخم',
  systemInstruction: '',
  customApiUrl: '',
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
  };

  if (cfg.apiKey && cfg.apiKey.trim().length > 0) {
    headers['x-gemini-api-key'] = cfg.apiKey.trim();
  }

  if (cfg.model && cfg.model.trim().length > 0) {
    headers['x-gemini-model'] = cfg.model.trim();
  }

  return headers;
}

// دالة فحص الاتصال الموجّهة حصراً إلى خادم Vercel لمنع خطأ OAuth في المتصفح
export async function testAIConnection(settings?: AISettings): Promise<{
  success: boolean;
  latencyMs?: number;
  modelUsed?: string;
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
        apiKey: cfg.apiKey?.trim() || undefined,
        model: cfg.model?.trim() || 'gemini-3.6-flash',
      }),
    });

    const elapsed = Date.now() - startTime;
    const data = await response.json();

    if (response.ok && data.success) {
      return {
        success: true,
        latencyMs: data.latencyMs || elapsed,
        modelUsed: data.modelUsed || cfg.model,
        message: data.message || 'تم الاتصال بالذكاء الاصطناعي بنجاح تام! 🟢',
      };
    } else {
      return {
        success: false,
        latencyMs: elapsed,
        modelUsed: cfg.model,
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
      message: 'تعذر الوصول إلى الخادم (تحقق من إعدادات Vercel والشبكة)',
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
