export type KnowledgeBaseCategory = 'drive' | 'email' | 'database' | 'ai' | 'export';

export interface ActionableFix {
  type:
    | 'apply_email_preset'
    | 'set_email_port'
    | 'set_db_provider'
    | 'reset_drive_folder'
    | 'set_ai_model'
    | 'enable_local_fallback'
    | 'custom_setting';
  label: string;
  description?: string;
  targetService: 'email' | 'drive' | 'database' | 'ai';
  payload?: any;
  executed?: boolean;
}

export interface CodeSnippet {
  title: string;
  language: 'typescript' | 'javascript' | 'json' | 'bash' | 'rules';
  code: string;
  explanation?: string;
}

export interface KnowledgeBaseEntry {
  id: string;
  title: string;
  category: KnowledgeBaseCategory;
  categoryLabel: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  errorCodeMatch: string[];
  keywords: string[];
  summary: string;
  rootCause: string;
  symptoms: string[];
  steps: Array<{
    step: number;
    title: string;
    action: string;
    tip?: string;
  }>;
  codeSnippets: CodeSnippet[];
  actionableFix?: ActionableFix;
  officialDocsUrl?: string;
}

export const KNOWLEDGE_BASE_ENTRIES: KnowledgeBaseEntry[] = [
  // ==========================================
  // 1. SMTP & EMAIL INTEGRATIONS
  // ==========================================
  {
    id: 'kb-smtp-535-auth-failed',
    title: 'حل خطأ مصادقة خادم البريد (535-5.7.8 Username and Password not accepted)',
    category: 'email',
    categoryLabel: 'البريد الإلكتروني (SMTP)',
    severity: 'high',
    errorCodeMatch: ['535', '535-5.7.8', 'EAUTH', 'AUTH_FAILED', 'AUTHENTICATION_FAILED'],
    keywords: ['smtp', 'gmail', '535', 'password', 'كلمة مرور', 'مصادقة', 'بريد', 'رفض'],
    summary: 'يرفض خادم Gmail أو مزود البريد كلمة المرور المدخلة لأن حسابات Google تمنع استخدام كلمة المرور الأساسية وتتطلب كلمة مرور تطبيقات مخصصة (App Password).',
    rootCause: 'أوقفت Google ميزة "التطبيقات الأقل أماناً" (Less Secure Apps). للاتصال بـ SMTP عبر Gmail، يلزم تفعيل التحقق بخطوتين وتوليد كلمة مرور تطبيقات مكونة من 16 حرفاً.',
    symptoms: [
      'فشل فحص اتصال البريد وظهور كود 535-5.7.8.',
      'رسالة: Invalid login: 535-5.7.8 Username and Password not accepted.',
      'عدم استلام المعلمين أو الطلاب لشهادات التقدير عبر البريد.',
    ],
    steps: [
      {
        step: 1,
        title: 'توليد كلمة مرور للتطبيقات (App Password) من Google',
        action: 'توجه إلى رابط أمان حساب Google (myaccount.google.com/security)، تأكد من تفعيل "التحقق بخطوتين"، ثم ادخل على "كلمات مرور التطبيقات" وأنشئ كلمة مرور جديدة باسم "منصة تقدير".',
        tip: 'ستحصل على 16 حرفاً مقسمة لمجموعات مثل: abcd efgh ijkl mnop. انسخها وضعها في حقل كلمة المرور.',
      },
      {
        step: 2,
        title: 'اعتماد المنفذ الآمن 465 وبروتوكول SSL',
        action: 'تأكد من اختيار منفذ 465 مع تفعيل خيار SSL (Secure: true) لضمان التشفير المتوافق مع متطلبات Google.',
      },
      {
        step: 3,
        title: 'تطابق اسم المستخدم مع بريد المرسل',
        action: 'يجب أن يكون بريد المرسل (From Email) مطابقاً لنفس حساب الـ Gmail المستخدم في تسجيل الدخول منعاً للحجب من جدار الحماية.',
      },
    ],
    codeSnippets: [
      {
        title: 'إعداد اتصال Nodemailer الآمن لـ Gmail في السيرفر',
        language: 'typescript',
        code: `import nodemailer from "nodemailer";

// التكوين الموصى به رسمياً لخوادم Gmail SMTP
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, // true لـ port 465, false لـ port 587
  auth: {
    user: process.env.SMTP_USER, // بريدك: example@gmail.com
    pass: process.env.SMTP_PASS, // كلمة مرور التطبيقات (16 حرف بدون مسافات)
  },
  tls: {
    rejectUnauthorized: true,
  },
  connectionTimeout: 10000,
});

// التحقق من صحة الاتصال
transporter.verify((error, success) => {
  if (error) {
    console.error("فشل اتصال SMTP:", error);
  } else {
    console.log("خادم البريد جاهز لإرسال الشهادات! 🚀");
  }
});`,
        explanation: 'استخدم دائماً Port 465 مع secure: true في بيئات Node.js لمنع إغلاق المقابس المفاجئ.',
      },
    ],
    actionableFix: {
      type: 'apply_email_preset',
      label: '⚡ تطبيق إعدادات Gmail الموصى بها (Port 465 + SSL) تلقائياً',
      description: 'يقوم بضبط المضيف على smtp.gmail.com والمنفذ 465 مع تفعيل تشفير SSL فورياً.',
      targetService: 'email',
      payload: {
        preset: 'gmail',
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
      },
    },
    officialDocsUrl: 'https://support.google.com/mail/answer/185833',
  },
  {
    id: 'kb-smtp-timeout-etimedout',
    title: 'حل خطأ مهلة الاتصال بالبريد (Connection Timeout ETIMEDOUT / ECONNREFUSED)',
    category: 'email',
    categoryLabel: 'البريد الإلكتروني (SMTP)',
    severity: 'high',
    errorCodeMatch: ['ETIMEDOUT', 'ECONNREFUSED', 'ESOCKETTIMEDOUT', 'TIMEOUT'],
    keywords: ['مهلة', 'timeout', 'port 25', 'etimedout', 'شبكة', 'حظر المنفذ'],
    summary: 'يحدث بسبب حظر مزود الاستضافة السحابية (مثل Google Cloud أو Vercel أو AWS) لمنفذ SMTP الافتراضي 25، أو تأخر الخادم في الاستجابة.',
    rootCause: 'معظم المنصات السحابية الحديثة تغلق Port 25 كلياً لمكافحة الرسائل المزعجة (Spam). الاتصال عبر Port 25 سيفشل حتماً بمهلة انتهاء الوقت.',
    symptoms: [
      'فحص اتصال البريد يستغرق أكثر من 15 ثانية ثم يفشل.',
      'رسالة: connect ETIMEDOUT 142.250.x.x:25 أو Port blocked.',
    ],
    steps: [
      {
        step: 1,
        title: 'التبديل فوراً من المنفذ 25 إلى المنفذ 465 أو 587',
        action: 'اضغط على زر الإصلاح التلقائي لتغيير المنفذ إلى 465 (SSL) أو 587 (STARTTLS).',
      },
      {
        step: 2,
        title: 'ضبط مهلة الاتصال المحددة (Timeout Limit)',
        action: 'تحديد مهلة فحص لا تتجاوز 8 ثوانٍ حتى لا يتجمد التطبيق إذا انقطعت الشبكة.',
      },
    ],
    codeSnippets: [
      {
        title: 'تكوين Nodemailer لتخطي حجب المنافذ في البيئات السحابية',
        language: 'typescript',
        code: `const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 465, // تجنب 25 نهائياً!
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  connectionTimeout: 8000,
  greetingTimeout: 5000,
  socketTimeout: 10000,
});`,
      },
    ],
    actionableFix: {
      type: 'set_email_port',
      label: '⚡ ضبط المنفذ تلقائياً على 465 وتفعيل SSL لتخطي الحظر',
      targetService: 'email',
      payload: {
        port: 465,
        secure: true,
      },
    },
  },

  // ==========================================
  // 2. GOOGLE DRIVE & CLOUD STORAGE
  // ==========================================
  {
    id: 'kb-drive-token-expired',
    title: 'حل خطأ انتهاء صلاحية رمز تفويض Google Drive (Token Expired / 401 Unauthorized)',
    category: 'drive',
    categoryLabel: 'Google Drive والأرشفة',
    severity: 'high',
    errorCodeMatch: ['401', 'UNAUTHORIZED', 'TOKEN_EXPIRED', 'INVALID_GRANT'],
    keywords: ['drive', 'token', '401', 'unauthorized', 'تفويض', 'صلاحية', 'انتهاء'],
    summary: 'انتهت صلاحية رمز الوصول (Access Token) المخزن لحساب Google Drive، أو تم إلغاء صلاحية الوصول من إعدادات حساب Google.',
    rootCause: 'رموز Google OAuth 2.0 تنتهي صلاحيتها كل 60 دقيقة. إذا لم يتوفر Refresh Token صالح، سيفشل الخادم في رفع الشهادات بصيغة PDF أو PNG.',
    symptoms: [
      'فشل اختبار الاتصال بـ Google Drive مع رسالة 401 Unauthorized.',
      'عدم ظهور رابط المجلد السحابي عند أرشفة الشهادة.',
    ],
    steps: [
      {
        step: 1,
        title: 'إعادة ضبط مجلد الحفظ الافتراضي وتفعيل المزامنة المحلية',
        action: 'اضغط على زر الإصلاح التلقائي لإعادة ضبط مسار الحفظ وتفعيل الحفظ المزدوج حتى لا تتأثر الشهادات الحالية.',
      },
      {
        step: 2,
        title: 'تجديد التفويض بنقرة واحدة',
        action: 'اضغط على زر "ربط وتفويض الحساب الآن" لتسجيل الدخول بحساب Google ومنح الصلاحية مجدداً.',
      },
    ],
    codeSnippets: [
      {
        title: 'آلية التحديث التلقائي لرمز Google Drive OAuth2 في الخادم',
        language: 'typescript',
        code: `import { google } from "googleapis";

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// تعيين الرموز مع معالج التجديد التلقائي
oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

oauth2Client.on("tokens", (tokens) => {
  if (tokens.refresh_token) {
    // حفظ رمز التجديد الجديد بشكل دائم
    saveSystemRefreshToken(tokens.refresh_token);
  }
  console.log("تم تجديد رمز Google Drive بنجاح 🔄");
});`,
      },
    ],
    actionableFix: {
      type: 'reset_drive_folder',
      label: '⚡ إعادة ضبط مجلد الحفظ الافتراضي ("شهادات التقدير 2026")',
      description: 'يقوم بتعيين اسم المجلد الرسمي وتفعيل وضع الجاهزية التلقائي.',
      targetService: 'drive',
      payload: {
        folderName: 'شهادات التقدير 2026',
        isDefaultForAllUsers: true,
      },
    },
  },
  {
    id: 'kb-drive-insufficient-scope',
    title: 'حل نقص الصلاحيات السحابية (403 Insufficient Permission / Drive Scope)',
    category: 'drive',
    categoryLabel: 'Google Drive والأرشفة',
    severity: 'critical',
    errorCodeMatch: ['403', 'INSUFFICIENT_SCOPE', 'PERMISSION_DENIED', 'ACCESS_DENIED'],
    keywords: ['scope', '403', 'drive.file', 'drive', 'صلاحيات', 'أذونات', 'ممنوع'],
    summary: 'تم تفويض الحساب بنطاق صلاحيات مقيد لا يسمح بإنشاء مجلدات جديدة أو رفع ملفات الشهادات ومشاركتها مع المعلمين.',
    rootCause: 'استخدام نطاق read-only أو drive.metadata بدلاً من النطاق الكامل drive.file أو https://www.googleapis.com/auth/drive.',
    symptoms: [
      'فشل إنشاء مجلد المدرسة على Google Drive.',
      'ظهور كود الخطأ 403 مع عبارة "Request had insufficient authentication scopes".',
    ],
    steps: [
      {
        step: 1,
        title: 'توسيع نطاق صلاحيات Google OAuth',
        action: 'تأكد من تضمين النطاق https://www.googleapis.com/auth/drive.file في إعدادات التطبيق لتمكين رفع ومشاركة الشهادات المعتمدة.',
      },
      {
        step: 2,
        title: 'تفعيل الأرشفة المحلية كنسخة احتياطية فورية',
        action: 'تفعيل التخزين المزدوج لضمان أرشفة ملفات PDF محلياً في IndexedDB ريثما تكتمل الصلاحيات.',
      },
    ],
    codeSnippets: [
      {
        title: 'قائمة النطاقات (OAuth Scopes) المعتمدة للتطبيق',
        language: 'json',
        code: `{
  "scopes": [
    "https://www.googleapis.com/auth/drive.file",
    "https://www.googleapis.com/auth/userinfo.email"
  ]
}`,
      },
    ],
    actionableFix: {
      type: 'enable_local_fallback',
      label: '⚡ تفعيل وضع الحفظ المحلي المزدوج لمنع فقدان الشهادات',
      targetService: 'drive',
      payload: {
        dualArchive: true,
      },
    },
  },

  // ==========================================
  // 3. GEMINI AI & LLM ENGINE
  // ==========================================
  {
    id: 'kb-ai-model-not-found-404',
    title: 'إصلاح خطأ عدم توفر النموذج (404 Model Not Found / Invalid Model Alias)',
    category: 'ai',
    categoryLabel: 'الذكاء الاصطناعي (Gemini AI)',
    severity: 'critical',
    errorCodeMatch: ['404', 'MODEL_NOT_FOUND', 'NOT_FOUND', 'INVALID_MODEL'],
    keywords: ['gemini', '404', 'model', 'نموذج', 'غير متاح', 'flash', 'تحديث'],
    summary: 'يحدث عند محاولة الاتصال بنموذج غير معتمد أو مسار قديم. النموذج المعتمد والرسمي لمهام النصوص والبلاغة هو gemini-3.8-flash.',
    rootCause: 'تحديد اسم نموذج قديم أو غير موجود في مكتبة @google/genai. النظام يتطلب استخدام gemini-3.8-flash حصراً للمهام النصية.',
    symptoms: [
      'فشل زر تحسين النص بالذكاء الاصطناعي.',
      'ظهور رسالة "Model gemini-x is not found for API version v1beta".',
      'توقف التدقيق البلاغي التلقائي واستخدام المحرك الاحتياطي.',
    ],
    steps: [
      {
        step: 1,
        title: 'التبديل فوراً إلى النموذج الرسمي gemini-3.8-flash',
        action: 'اضغط على زر الإصلاح التلقائي أدناه لتعيين النموذج على gemini-3.8-flash وحفظ الإعداد.',
      },
      {
        step: 2,
        title: 'التحقق من صحة مفتاح الـ API',
        action: 'تأكد من إدخال مفتاح صالح من Google AI Studio (aistudio.google.com).',
      },
    ],
    codeSnippets: [
      {
        title: 'الاستدعاء الصحيح للنموذج المعتمد عبر @google/genai SDK',
        language: 'typescript',
        code: `import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// استخدام النموذج المعتمد رسمياً لعام 2026
const response = await ai.models.generateContent({
  model: "gemini-3.8-flash",
  contents: "صياغة عبارة شكر وتقدير رسمية باللغة العربية الفصحى",
});

console.log(response.text);`,
      },
    ],
    actionableFix: {
      type: 'set_ai_model',
      label: '⚡ ضبط النموذج فورياً على Gemini 3.8 Flash المعتمد',
      description: 'يقوم بتحديث إعدادات الذكاء الاصطناعي في التطبيق للنموذج السريع والمعتمد رسمياً.',
      targetService: 'ai',
      payload: {
        model: 'gemini-3.8-flash',
        provider: 'gemini',
      },
    },
  },
  {
    id: 'kb-ai-rate-limit-429',
    title: 'إدارة وتخطي استنفاد الحصة المؤقتة (429 RESOURCE_EXHAUSTED / Quota Exceeded)',
    category: 'ai',
    categoryLabel: 'الذكاء الاصطناعي (Gemini AI)',
    severity: 'medium',
    errorCodeMatch: ['429', 'RESOURCE_EXHAUSTED', 'QUOTA_EXCEEDED', 'RATE_LIMIT'],
    keywords: ['429', 'quota', 'حصة', 'معدل الطلبات', 'استنفاد', 'rate limit'],
    summary: 'تم الوصول إلى الحد الأقصى من الطلبات المسموح بها في الدقيقة (RPM) أو اليوم في الحساب المجاني.',
    rootCause: 'إرسال طلبات متعددة ومتزامنة لتأنيث وتعديل الشهادات دفعة واحدة بدون فاصل زمني، أو انتهاء الحصة اليومية للحساب.',
    symptoms: [
      'ظهور رسالة: "تم استنفاد الحصة المؤقتة للذكاء الاصطناعي (Rate limit)".',
      'تأخر في معالجة الشهادات المجمعة (Batch Processing).',
    ],
    steps: [
      {
        step: 1,
        title: 'تفعيل المحرك اللغوي الذكي دون انقطاع (Smart Local Fallback)',
        action: 'التطبيق يحتوي على محرك لغوي محلي متكامل بقواعد البلاغة والتأنيث والتذكير يعمل تلقائياً دون الحاجة للإنترنت.',
      },
      {
        step: 2,
        title: 'استخدام مفتاح API مخصص أو حساب مدفوع',
        action: 'يمكنك إضافة مفتاحك الخاص من لوحة إعدادات الذكاء الاصطناعي للحصول على حصص غير محدودة وسرعة مضاعفة.',
      },
    ],
    codeSnippets: [
      {
        title: 'نمط إعادة المحاولة مع التبديل التلقائي للطرازات الاحتياطية',
        language: 'typescript',
        code: `async function callWithFallback(ai: GoogleGenAI, prompt: string) {
  const models = ["gemini-3.8-flash", "gemini-2.5-flash"];
  for (const model of models) {
    try {
      return await ai.models.generateContent({ model, contents: prompt });
    } catch (err: any) {
      if (err?.status === 429) {
        console.warn(\`الحصة مستنفدة للنموذج \${model}، تجربة النموذج التالي...\`);
        continue;
      }
      throw err;
    }
  }
  // التبديل للمحرك اللغوي المحلي المدمج
  return getLocalArabicFallback(prompt);
}`,
      },
    ],
    actionableFix: {
      type: 'enable_local_fallback',
      label: '⚡ تفعيل المحرك اللغوي المحلي الفوري عند انقطاع الحصة',
      targetService: 'ai',
      payload: {
        autoLocalFallback: true,
      },
    },
  },

  // ==========================================
  // 4. DATABASES & CLOUD PERSISTENCE
  // ==========================================
  {
    id: 'kb-db-firestore-permission-denied',
    title: 'حل رفض إذن الوصول إلى Firestore (Missing or Insufficient Permissions)',
    category: 'database',
    categoryLabel: 'قواعد البيانات (Firestore)',
    severity: 'critical',
    errorCodeMatch: ['PERMISSION_DENIED', 'FIRESTORE_PERMISSION', '7 PERMISSION_DENIED'],
    keywords: ['firestore', 'rules', 'قواعد', 'permission denied', 'صلاحيات', 'قاعدة بيانات'],
    summary: 'قواعد أمان Firebase Firestore تحظر القراءة أو الكتابة المباشرة على مجموعات certificates أو templates.',
    rootCause: 'انتهاء فترة القواعد التجريبية (Test Mode 30 days) أو عدم توافق معايير التحقق من هوية المستخدم المسجل في firestore.rules.',
    symptoms: [
      'فشل حفظ الشهادات في الأرشيف السحابي.',
      'ظهور خطأ @firebase/firestore: FirebaseError: Missing or insufficient permissions.',
    ],
    steps: [
      {
        step: 1,
        title: 'تحديث قواعد أمان Firestore في Firebase Console',
        action: 'انسخ القواعد البرمجية المعتمدة المرفقة أدناه والصقها في تبويب Firestore Rules بـ Firebase Console ثم اضغط Publish.',
      },
      {
        step: 2,
        title: 'الاعتماد على التخزين المحلي الآمن ريثما يتم النشر',
        action: 'اضغط على زر الإصلاح السريع للتأكد من حفظ التعديلات محلياً وتجنب أي فقدان للبيانات.',
      },
    ],
    codeSnippets: [
      {
        title: 'قواعد أمان Firestore المحصنة والموصى بها للمنصة',
        language: 'rules',
        code: `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // السماح بقراءة الشهادات للجميع (للتحقق برمز QR)
    match /certificates/{certificateId} {
      allow read: if true;
      allow create, update: if request.auth != null;
      allow delete: if request.auth != null && request.auth.token.role == 'admin';
    }
    
    // إعدادات المنصة
    match /settings/{document=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}`,
      },
    ],
    actionableFix: {
      type: 'set_db_provider',
      label: '⚡ ضبط مزود البيانات على Firestore المعتمد وتفعيل المزامنة المزدوجة',
      targetService: 'database',
      payload: {
        provider: 'firestore',
      },
    },
  },
  {
    id: 'kb-db-postgres-ssl-required',
    title: 'حل متطلبات التشفير لاتصال PostgreSQL / Neon / Vercel (SSL Mode Required)',
    category: 'database',
    categoryLabel: 'قواعد البيانات (PostgreSQL)',
    severity: 'high',
    errorCodeMatch: ['SSL_REQUIRED', 'NO_PGHBA', 'ECONNRESET', 'PG_CONNECT_ERROR'],
    keywords: ['postgres', 'ssl', 'neon', 'vercel', 'sql', 'اتصال'],
    summary: 'خوادم قواعد البيانات السحابية الحديثة (مثل Neon و Vercel Postgres) ترفض الاتصالات غير المشفرة وتشترط تفعيل SSL.',
    rootCause: 'سلسلة الاتصال (Connection String) لا تحتوي على معلمة sslmode=require أو خيار rejectUnauthorized: false في بيئات السيرفر الموزعة.',
    symptoms: [
      'فشل اختبار الاتصال بقاعدة البيانات مع رسالة "server does not support SSL, but SSL was required" أو العكس.',
    ],
    steps: [
      {
        step: 1,
        title: 'إضافة معامل sslmode=require إلى رابط الاتصال',
        action: 'تأكد من أن الرابط ينتهي بـ ?sslmode=require لتأمين نقل البيانات عبر بروتوكول TLS.',
      },
    ],
    codeSnippets: [
      {
        title: 'تكوين مجمع اتصالات pg Pool في Node.js',
        language: 'typescript',
        code: `import { Pool } from "pg";

export const dbPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // مطلوب لخوادم Neon و Vercel
  },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});`,
      },
    ],
    actionableFix: {
      type: 'set_db_provider',
      label: '⚡ تطبيق وضع الاتصال الآمن مع تفعيل التخزين المؤقت',
      targetService: 'database',
      payload: {
        provider: 'firestore',
      },
    },
  },

  // ==========================================
  // 5. RENDERING, FONTS & PDF EXPORT
  // ==========================================
  {
    id: 'kb-export-canvas-cors-tainted',
    title: 'حل تشويش أمان الكانفاس لتصدير الشهادات (Tainted Canvas / CORS Blocked)',
    category: 'export',
    categoryLabel: 'الرسم والتصدير (PDF / Canvas)',
    severity: 'high',
    errorCodeMatch: ['TAINTED_CANVAS', 'CORS', 'SecurityError', 'EXPORT_FAILED'],
    keywords: ['canvas', 'cors', 'tainted', 'تصدير', 'صورة', 'شعار', 'خلفية'],
    summary: 'يفشل تصدير الشهادة كصورة PNG عالية الدقة أو ملف PDF لأن شعار المدرسة أو الصورة الخارجية محملة بدون ترويسات CORS المسموحة.',
    rootCause: 'عند رسم صورة من نطاق خارجي على عنصر HTML5 <canvas> دون وجود crossOrigin="anonymous"، يعتبر المتصفح الكانفاس "ملوثاً" ويمنع استخراج بيانات toDataURL.',
    symptoms: [
      'فشل تحميل أو طباعة الشهادة عند الضغط على "تصدير PDF" أو "تحميل صورة".',
      'ظهور خطأ Uncaught SecurityError: Failed to execute toDataURL on HTMLCanvasElement.',
    ],
    steps: [
      {
        step: 1,
        title: 'تحويل الصور والشعارات إلى Base64 أو Data URI داخلياً',
        action: 'يقوم التطبيق بتحويل أي شعار مدرسة مرفوع محلياً إلى Base64 مدمج مما يلغي أي احتمالية لخطأ CORS نهائياً.',
      },
      {
        step: 2,
        title: 'إضافة سمة crossOrigin="anonymous" للصور البعيدة',
        action: 'تأكد من تطبيق crossOrigin عند استدعاء خلفيات الشهادات من السحابة.',
      },
    ],
    codeSnippets: [
      {
        title: 'معالجة وتضمين الصور لتصدير كانفاس عالي الدقة وآمن من CORS',
        language: 'typescript',
        code: `// دالة تحويل آمنة للصور لتخطي قيود CORS في المتصفح
export async function imageToSafeDataUrl(url: string): Promise<string> {
  if (url.startsWith("data:")) return url;
  const res = await fetch(url, { mode: "cors" });
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}`,
      },
    ],
  },
  {
    id: 'kb-export-arabic-fonts-jspdf',
    title: 'ضبط الحروف والتشكيل العربي في ملفات PDF (Arabic Glyphs & Font Shaping)',
    category: 'export',
    categoryLabel: 'الرسم والتصدير (PDF / Canvas)',
    severity: 'medium',
    errorCodeMatch: ['FONTS_GLYPHS', 'ARABIC_DISCONNECTED', 'PDF_SHAPING'],
    keywords: ['خطوط', 'عربي', 'تقطيع', 'تشكيل', 'pdf', 'amiri', 'رقعة'],
    summary: 'ظهور الحروف العربية مقطعة أو معكوسة في ملفات PDF المولدة بمكتبات لا تدعم Bidi تشكيل النصوص ثنائية الاتجاه.',
    rootCause: 'محركات PDF القياسية تفترض كتابة من اليسار لليمين LTR ولا تقوم بربط الحروف العربية دون تضمين خط OpenType كامل وتطبيق خوارزمية التشكيل.',
    symptoms: [
      'الحروف العربية تظهر في ملف الـ PDF منفصلة مثل "ط ا ل ب" بدلاً من "طالب".',
    ],
    steps: [
      {
        step: 1,
        title: 'استخدام تصدير الكانفاس المتجهي عالي الدقة (Vector/Rasterized 300 DPI)',
        action: 'تطبيقنا يعتمد على modern-screenshot و html2canvas لتحويل الشهادة بالخطوط العربية الحقيقية (Amiri, Cairo, Thuluth) بدقة 300 DPI مطابقة للشاشة تماماً.',
      },
    ],
    codeSnippets: [
      {
        title: 'تصدير الشهادة الفاخرة بجودة طباعة 300 DPI ومقاس A4 رسمي',
        language: 'typescript',
        code: `import { domToPng } from "modern-screenshot";
import { jsPDF } from "jspdf";

export async function exportA4CertificatePdf(element: HTMLElement, filename = "certificate.pdf") {
  // التقاط الكانفاس بمقياس دقة عالي (Scale: 2 أو 3) لطباعة كريستالية
  const dataUrl = await domToPng(element, {
    scale: 3,
    backgroundColor: "#ffffff",
    quality: 1,
  });

  // إنشاء مستند A4 أفقي رسمي (297x210 mm)
  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  pdf.addImage(dataUrl, "PNG", 0, 0, 297, 210);
  pdf.save(filename);
}`,
      },
    ],
  },
];

// Helper to query knowledge base entries
export function getKnowledgeBaseEntries(): KnowledgeBaseEntry[] {
  return KNOWLEDGE_BASE_ENTRIES;
}

// Search across knowledge base
export function searchKnowledgeBase(query: string, category?: KnowledgeBaseCategory | 'all'): KnowledgeBaseEntry[] {
  const q = (query || '').trim().toLowerCase();
  return KNOWLEDGE_BASE_ENTRIES.filter((entry) => {
    if (category && category !== 'all' && entry.category !== category) {
      return false;
    }
    if (!q) return true;

    return (
      entry.title.toLowerCase().includes(q) ||
      entry.summary.toLowerCase().includes(q) ||
      entry.rootCause.toLowerCase().includes(q) ||
      entry.errorCodeMatch.some((code) => code.toLowerCase().includes(q)) ||
      entry.keywords.some((k) => k.toLowerCase().includes(q))
    );
  });
}

// Find closest Knowledge Base match for an error
export function findKnowledgeBaseMatchForError(
  service: string,
  errorMessage?: string,
  errorCode?: string
): KnowledgeBaseEntry | null {
  const errText = `${errorMessage || ''} ${errorCode || ''}`.toLowerCase();
  const serv = (service || '').toLowerCase();

  // 1. Direct Error Code Match
  for (const entry of KNOWLEDGE_BASE_ENTRIES) {
    if (entry.errorCodeMatch.some((c) => errText.includes(c.toLowerCase()))) {
      return entry;
    }
  }

  // 2. Keyword & Service matches
  let bestEntry: KnowledgeBaseEntry | null = null;
  let bestScore = 0;

  for (const entry of KNOWLEDGE_BASE_ENTRIES) {
    let score = 0;
    if (entry.category === serv || (serv.includes('email') && entry.category === 'email') || (serv.includes('drive') && entry.category === 'drive')) {
      score += 2;
    }
    for (const kw of entry.keywords) {
      if (errText.includes(kw.toLowerCase())) {
        score += 3;
      }
    }
    if (score > bestScore && score >= 3) {
      bestScore = score;
      bestEntry = entry;
    }
  }

  return bestEntry;
}
