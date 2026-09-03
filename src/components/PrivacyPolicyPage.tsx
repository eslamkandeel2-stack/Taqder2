import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  Eye,
  Database,
  Cloud,
  FileCheck2,
  HardDrive,
  UserCheck,
  RefreshCw,
  Trash2,
  Download,
  Printer,
  Copy,
  Check,
  ArrowRight,
  ExternalLink,
  Award,
  Sparkles,
  School,
  FileText,
  Key,
  Shield,
  Search,
  CheckCircle2,
  Mail,
  Clock,
  AlertTriangle
} from 'lucide-react';

interface Props {
  onBackToApp: () => void;
  onShowToast?: (msg: string) => void;
}

export const PrivacyPolicyPage: React.FC<Props> = ({ onBackToApp, onShowToast }) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState<string>('intro');

  // Determine current domain URL for display
  const currentOrigin = typeof window !== 'undefined' && window.location.origin
    ? window.location.origin
    : 'https://taqder2.vercel.app';
  const privacyUrl = `${currentOrigin}/privacy`;

  const handleCopyLink = () => {
    try {
      navigator.clipboard.writeText(privacyUrl);
      setCopiedLink(true);
      if (onShowToast) {
        onShowToast('تم نسخ رابط سياسة الخصوصية الرسمي بنجاح 📋');
      }
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (e) {
      console.warn('Copy failed:', e);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const sections = [
    { id: 'intro', title: 'مقدمة ونظرة عامة', icon: ShieldCheck },
    { id: 'data-collected', title: '١. ما هي البيانات التي نجمعها؟', icon: Database },
    { id: 'data-usage', title: '٢. كيف نستخدم هذه البيانات؟', icon: FileCheck2 },
    { id: 'data-protection', title: '٣. كيف نحمي بياناتك ونؤمّنها؟', icon: Lock },
    { id: 'data-sharing', title: '٤. مشاركة البيانات وعدم بيعها', icon: Eye },
    { id: 'google-drive', title: '٥. سياسة تكامل Google Drive وOAuth', icon: HardDrive },
    { id: 'student-privacy', title: '٦. خصوصية الطلاب والقُصّر والمدارس', icon: School },
    { id: 'user-rights', title: '٧. حقوقك والتحكم الكامل في بياناتك', icon: UserCheck },
    { id: 'compliance', title: '٨. الامتثال للسياسات الدولية وGoogle', icon: Shield },
    { id: 'contact', title: '٩. التواصل والتحديثات', icon: Mail }
  ];

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-['Cairo',sans-serif] flex flex-col antialiased selection:bg-amber-500 selection:text-slate-950 print:bg-white print:text-black">
      
      {/* Top Header & Navigation Bar */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 shadow-md print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-3">
          
          {/* Logo & Platform Info */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20 shrink-0">
              <ShieldCheck className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg font-black text-white tracking-wide">
                  سياسة الخصوصية وحماية البيانات
                </span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">
                  منصة تَقْدِير
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block font-medium">
                وثيقة الشفافية والأمان وحماية خصوصية المستخدمين والمؤسسات التعليمية
              </p>
            </div>
          </div>

          {/* Top Actions */}
          <div className="flex items-center gap-2">
            <button
              id="copy-privacy-link-btn"
              onClick={handleCopyLink}
              className="px-3 py-2 bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700/80 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="نسخ الرابط الرسمي لسياسة الخصوصية"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-amber-400" />}
              <span className="hidden sm:inline">{copiedLink ? 'تم النسخ' : 'نسخ الرابط'}</span>
            </button>

            <button
              id="print-privacy-btn"
              onClick={handlePrint}
              className="px-3 py-2 bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700/80 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="طباعة سياسة الخصوصية أو حفظها كـ PDF"
            >
              <Printer className="w-4 h-4 text-slate-300" />
              <span className="hidden sm:inline">طباعة</span>
            </button>

            <button
              id="back-to-app-top-btn"
              onClick={onBackToApp}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 transition flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowRight className="w-4 h-4" />
              <span>العودة لصانع الشهادات</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <section className="bg-gradient-to-b from-slate-950 via-slate-900 to-slate-900 border-b border-slate-800/80 py-10 sm:py-14 px-4 sm:px-6 lg:px-8 relative overflow-hidden print:py-4">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
            <Lock className="w-3.5 h-3.5" />
            <span>نظام محلي آمن مشفر أولاً (Local-First & Client-Side Secure)</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-snug">
            سياسة الخصوصية والأمان وحماية البيانات
          </h1>

          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
            نحن في منصة <strong className="text-amber-400 font-bold">تَقْدِير</strong> نلتزم بأعلى معايير الشفافية وحماية سرية بيانات الطلاب، المعلمين، والمؤسسات الأكاديمية. توضح هذه الوثيقة بوضوح تام ما نصل إليه وكيف نصونه.
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1 bg-slate-800/80 px-3 py-1 rounded-lg border border-slate-700">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              آخر تحديث: <strong>سبتمبر 2026</strong>
            </span>
            <span className="flex items-center gap-1 bg-slate-800/80 px-3 py-1 rounded-lg border border-slate-700">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              مطابقة لمتطلبات <strong>Google OAuth و Google Drive</strong>
            </span>
            <span className="flex items-center gap-1 bg-slate-800/80 px-3 py-1 rounded-lg border border-slate-700 font-mono text-slate-300">
              URL: {privacyUrl}
            </span>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex flex-col lg:flex-row gap-8">
        
        {/* Right Sticky Sidebar / Table of Contents (Desktop) */}
        <aside className="lg:w-80 shrink-0 print:hidden">
          <div className="sticky top-24 bg-slate-950/80 border border-slate-800 rounded-2xl p-4 shadow-xl backdrop-blur-xs space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-amber-400" />
                فهرس المحتويات
              </span>
              <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-md font-bold">
                {sections.length} بنود
              </span>
            </div>

            {/* Navigation links */}
            <nav className="space-y-1">
              {sections.map((sec) => {
                const Icon = sec.icon;
                const isActive = activeSection === sec.id;
                return (
                  <button
                    key={sec.id}
                    onClick={() => scrollToSection(sec.id)}
                    className={`w-full text-right px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                      isActive
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-amber-400' : 'text-slate-500'}`} />
                    <span className="truncate">{sec.title}</span>
                  </button>
                );
              })}
            </nav>

            {/* Quick Box: User Safety Pledge */}
            <div className="p-3.5 bg-gradient-to-br from-emerald-950/40 to-slate-900 border border-emerald-500/30 rounded-xl space-y-1.5">
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>تعهد عدم البيع</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                لا نقوم ببيع أو مشاركة أو تأجير أي بيانات شخصية أو دراسية مع أي أطراف إعلانية أو تجارية نهائياً.
              </p>
            </div>

            {/* Return to App Button */}
            <button
              onClick={onBackToApp}
              className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <ArrowRight className="w-4 h-4 text-amber-400" />
              <span>رجوع إلى لوحة صانع الشهادات</span>
            </button>
          </div>
        </aside>

        {/* Center / Main Content Body */}
        <main className="flex-1 space-y-10 max-w-3xl">

          {/* Section: Intro */}
          <section id="intro" className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-6 sm:p-8 space-y-4 shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-800/80 pb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-white">مقدمة ونظرة عامة</h2>
                <p className="text-xs text-slate-400">الالتزام بالشفافية والخصوصية الرقمية</p>
              </div>
            </div>

            <div className="text-slate-300 text-sm leading-relaxed space-y-3">
              <p>
                مرحباً بك في منصة <strong className="text-amber-400">تَقْدِير (Taqdeer)</strong>، المنظومة المتكاملة لتصميم وتخصيص وتوثيق وأرشفة شهادات التقدير والشكر والتفوق الأكاديمي.
              </p>
              <p>
                تم تصميم وبناء هذه المنصة وفق معمارية <strong>الأمان المحلي أولاً (Local-First Architecture)</strong>؛ حيث تتم جميع عمليات تصميم الشهادات، إدخال أسماء الطلاب، وتوليد ملفات الطباعة والتحقق (PDF / PNG / QR Codes) مباشرة داخل متصفح المستخدم دون إلزام المستخدم برفع أي معلومات حساسة إلى أي خوادم مركزية إلا عندما يطلب ذلك صراحةً عبر خيارات المزامنة السحابية.
              </p>
              <p className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 text-xs text-slate-300">
                📌 <strong>نطاق التطبيق:</strong> تسري هذه السياسة على موقع وتطبيق تَقْدِير المتاح عبر النطاق (<span className="text-amber-300 font-mono">{currentOrigin}</span>) وجميع النطاقات الفرعية وبوابات التحقق الإلكتروني التابعة له.
              </p>
            </div>
          </section>

          {/* Section 1: Data We Collect */}
          <section id="data-collected" className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-6 sm:p-8 space-y-4 shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-800/80 pb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-white">١. ما هي البيانات التي يجمعها التطبيق؟</h2>
                <p className="text-xs text-slate-400">حصر دقيق لكل نوع من البيانات التي يتم التعامل معها</p>
              </div>
            </div>

            <div className="space-y-4 text-slate-300 text-sm leading-relaxed">
              <p>
                لا يجمع التطبيق أي بيانات أكثر مما هو ضروري بدقة لأداء الوظائف المطلوبة من قِبل المستخدم. وتنقسم البيانات إلى الفئات التالية:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                {/* 1.1 Certificate Data */}
                <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                    <Award className="w-4 h-4 shrink-0" />
                    <span>أ. بيانات الشهادات والوثائق</span>
                  </div>
                  <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside leading-normal">
                    <li>اسم الطالب أو المكرم.</li>
                    <li>الصف، المرحلة الدراسية، أو التخصص.</li>
                    <li>اسم المدرسة، الإدارة، أو المؤسسة المانحة.</li>
                    <li>عبارات الشكر والتقدير ونصوص التكريم.</li>
                    <li>تاريخ ومكان الإصدار ورقم المرجع التوثيقي.</li>
                  </ul>
                  <p className="text-[11px] text-slate-400 pt-1">
                    * يتم تخزين هذه البيانات محلياً على جهازك في الذاكرة الآمنة للمتصفح.
                  </p>
                </div>

                {/* 1.2 Account & Profile Data */}
                <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                    <UserCheck className="w-4 h-4 shrink-0" />
                    <span>ب. بيانات الحساب والملف الشخصي</span>
                  </div>
                  <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside leading-normal">
                    <li>عنوان البريد الإلكتروني (عند تسجيل الدخول أو التحقق).</li>
                    <li>الاسم المعروض والصورة الشخصية من حساب Google (اختياري).</li>
                    <li>معرف المستخدم الرقمي المعزول (User UID).</li>
                    <li>تاريخ ووقت آخر جلسة استخدام للحساب.</li>
                  </ul>
                  <p className="text-[11px] text-slate-400 pt-1">
                    * لا نحتفظ بأي كلمات مرور لحسابات Google؛ يتم التحقق عبر بروتوكول OAuth الآمن.
                  </p>
                </div>

                {/* 1.3 Google Drive Integration */}
                <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-sky-400 font-bold text-xs">
                    <HardDrive className="w-4 h-4 shrink-0" />
                    <span>ج. بيانات تكامل Google Drive</span>
                  </div>
                  <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside leading-normal">
                    <li>رمز الوصول المؤقت (Access Token) الصادر من Google.</li>
                    <li>معرف المجلد المخصص لشهادات تَقْدِير في حسابك.</li>
                    <li>روابط الملفات المحفوظة داخل مجلد التطبيق فقط.</li>
                  </ul>
                  <p className="text-[11px] text-slate-400 pt-1">
                    * لا نملك أي صلاحية للوصول إلى ملفاتك الأخرى خارج مجلد شهادات تَقْدِير.
                  </p>
                </div>

                {/* 1.4 Customization & Preferences */}
                <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-purple-400 font-bold text-xs">
                    <Sparkles className="w-4 h-4 shrink-0" />
                    <span>د. بيانات التخصيص والمظهر</span>
                  </div>
                  <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside leading-normal">
                    <li>الشعارات والأختام والتواقيع المرفوعة محلياً.</li>
                    <li>القوالب المحفوظة والإعدادات الافتراضية المفضلة.</li>
                    <li>سجل التراجع والإعادة (Undo/Redo) للجلسة النشطة.</li>
                  </ul>
                  <p className="text-[11px] text-slate-400 pt-1">
                    * تظل التفضيلات في ذاكرة متصفحك ويمكنك مسحها متى شئت بنقرة واحدة.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 2: How Data is Used */}
          <section id="data-usage" className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-6 sm:p-8 space-y-4 shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-800/80 pb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <FileCheck2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-white">٢. كيف نستخدم هذه البيانات؟</h2>
                <p className="text-xs text-slate-400">الأغراض المحددة بدقة لمعالجة البيانات</p>
              </div>
            </div>

            <div className="text-slate-300 text-sm leading-relaxed space-y-3">
              <p>
                تُستخدم البيانات المدخلة للأغراض المباشرة التالية فقط:
              </p>

              <div className="space-y-2.5">
                <div className="flex items-start gap-3 p-3 bg-slate-900/70 rounded-xl border border-slate-800/80">
                  <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    ١
                  </span>
                  <div>
                    <h4 className="font-bold text-white text-xs sm:text-sm">تصميم وتصدير الشهادات الأكاديمية</h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      توليد ومعاينة الشهادة فورياً، وتصديرها بصيغ PDF فائقة الدقة أو صور PNG جاهزة للطباعة، وتنسيق الخطوط والشعارات وفق رغبة المستخدم.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-slate-900/70 rounded-xl border border-slate-800/80">
                  <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    ٢
                  </span>
                  <div>
                    <h4 className="font-bold text-white text-xs sm:text-sm">التوثيق الرقمي والتحقق عبر رمز الاستجابة السريعة (QR Code)</h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      توليد كود توثيق فريد غير قابل للتكرار لكل شهادة صالحة، لتمكين أولياء الأمور والجهات المعتمدة من مسح الكود والتحقق من صحة ومطابقة بيانات الشهادة مباشرة.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-slate-900/70 rounded-xl border border-slate-800/80">
                  <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    ٣
                  </span>
                  <div>
                    <h4 className="font-bold text-white text-xs sm:text-sm">المزامنة السحابية والأرشفة في Google Drive</h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      عند تفعيل المستخدم لحفظ الشهادة في Google Drive، يتم نقل نسخة مشفرة من الشهادة لملفاته الخاصة ليتمكن من استعراضها وطباعتها من أي جهاز في أي وقت.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-slate-900/70 rounded-xl border border-slate-800/80">
                  <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    ٤
                  </span>
                  <div>
                    <h4 className="font-bold text-white text-xs sm:text-sm">مساعد الذكاء الاصطناعي والتدقيق اللغوي</h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      تحسين صياغة عبارات الشكر وتدقيق الإملاء والنحو العربي بدون تخزين أو تدريب نماذج الذكاء الاصطناعي على بيانات الطلاب أو معلوماتهم الخاصة.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section 3: Data Protection & Security */}
          <section id="data-protection" className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-6 sm:p-8 space-y-4 shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-800/80 pb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-white">٣. كيف نحمي بياناتك ونؤمّنها؟</h2>
                <p className="text-xs text-slate-400">تدابير الأمان التقنية والتنظيمية الصارمة</p>
              </div>
            </div>

            <div className="space-y-4 text-slate-300 text-sm leading-relaxed">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs mb-1.5">
                    <ShieldCheck className="w-4 h-4 shrink-0" />
                    <span>معمارية الأمان المحلي (Client-Side)</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-normal">
                    تتم معالجة الخطوط، الصور، والتصاميم داخل ذاكرة المتصفح دون الحاجة لإرسال مسودات الشهادات إلى خوادم خارجية.
                  </p>
                </div>

                <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-xs mb-1.5">
                    <Lock className="w-4 h-4 shrink-0" />
                    <span>التشفير أثناء النقل (HTTPS / TLS)</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-normal">
                    جميع الاتصالات عبر الشبكة مشفرة بأقوى معايير تشفير النقل (TLS 1.3)، لمنع أي محاولة اعتراض أو تنصت.
                  </p>
                </div>

                <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800">
                  <div className="flex items-center gap-2 text-sky-400 font-bold text-xs mb-1.5">
                    <Key className="w-4 h-4 shrink-0" />
                    <span>نظام العزل التام بين الحسابات</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-normal">
                    يطبق التطبيق نظام (Account Isolation Vault) الذي يعزل شهادات ومسودات كل مستخدم في مخزن منفصل يمنع تداخل الحسابات على نفس الجهاز.
                  </p>
                </div>

                <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800">
                  <div className="flex items-center gap-2 text-purple-400 font-bold text-xs mb-1.5">
                    <HardDrive className="w-4 h-4 shrink-0" />
                    <span>صلاحيات Google Drive المقيدة</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-normal">
                    يطلب التطبيق فقط صلاحية إنشاء ملفات جديدة داخل مجلد التطبيق المخصص ولا يمكنه استعراض بقية ملفاتك الشخصية.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 4: Data Sharing & Non-Disclosure */}
          <section id="data-sharing" className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-6 sm:p-8 space-y-4 shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-800/80 pb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                <Eye className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-white">٤. مشاركة البيانات وعدم بيعها</h2>
                <p className="text-xs text-slate-400">تعهد قاطع بعدم تسويق أو مشاركة بيانات المستخدمين</p>
              </div>
            </div>

            <div className="space-y-3 text-slate-300 text-sm leading-relaxed">
              <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs space-y-1.5 text-rose-200">
                <div className="flex items-center gap-2 font-black text-sm text-rose-300">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>تعهد رسمي بعدم البيع أو المتاجرة:</span>
                </div>
                <p className="leading-relaxed">
                  نحن لا نبيع، ولا نؤجر، ولا نتاجر، ولا ننقل أي بيانات شخصية أو دراسية أو معلومات تخص الطلاب أو المعلمين لأي شركات إعلانية، أو وسطاء بيانات (Data Brokers)، أو أي طرف ثالث لأي أغراض تجارية أو ترويجية على الإطلاق.
                </p>
              </div>

              <p>
                تتم مشاركة البيانات التقنية المحدودة فقط في الحالات الضرورية الآتية:
              </p>

              <ul className="space-y-2 text-xs text-slate-300 list-disc list-inside">
                <li>
                  <strong>مزودو الخدمات الأساسيون (Infrastructure Providers):</strong> خدمات Google Cloud APIs (لخدمة تسجيل الدخول وتخزين Google Drive برضا المستخدم) وخدمات الاستضافة الموثوقة (مثل Vercel) لأداء الخدمة السحابية.
                </li>
                <li>
                  <strong>الامتثال القانوني:</strong> لن يتم الإفصاح عن أي بيانات إلا إذا كان ذلك مطلوباً بموجب نظام سارٍ أو أمر قضائي رسمي نافذ وفق الأنظمة المعمول بها.
                </li>
              </ul>
            </div>
          </section>

          {/* Section 5: Google Drive & OAuth Integration Policy */}
          <section id="google-drive" className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-6 sm:p-8 space-y-4 shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-800/80 pb-4">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                <Cloud className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-white">٥. سياسة تكامل Google Drive وOAuth</h2>
                <p className="text-xs text-slate-400">كيف يتعامل التطبيق مع بيانات حسابك على Google</p>
              </div>
            </div>

            <div className="space-y-3 text-slate-300 text-sm leading-relaxed">
              <p>
                يتيح تطبيق <strong className="text-amber-400">تَقْدِير</strong> للمستخدمين خيار الربط المباشر مع حساب Google عبر بروتوكول OAuth 2.0 المعتمد لحفظ النسخ الاحتياطية من الشهادات مباشرة في حساب Google Drive الخاص بالمستخدم.
              </p>

              <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-2 text-xs">
                <h4 className="font-bold text-sky-400">النطاقات (Scopes) التي يطلبها التطبيق:</h4>
                <ul className="space-y-1.5 font-mono text-[11px] text-slate-300">
                  <li className="bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                    <span>https://www.googleapis.com/auth/drive.file</span>
                    <span className="text-slate-400 font-sans text-[10px] mr-auto">(إنشاء وإدارة الملفات التي ينشئها التطبيق فقط)</span>
                  </li>
                  <li className="bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-sky-400 shrink-0" />
                    <span>openid / email / profile</span>
                    <span className="text-slate-400 font-sans text-[10px] mr-auto">(التحقق من الهوية وعرض البريد الإلكتروني والاسم)</span>
                  </li>
                </ul>
              </div>

              <div className="space-y-1.5 text-xs text-slate-300">
                <p className="font-bold text-amber-300">ضمانات تكامل Google Drive:</p>
                <ul className="list-disc list-inside space-y-1 text-slate-300">
                  <li>لا يمكن للتطبيق الوصول إلى صورك، مستنداتك، أو أي ملفات أخرى خارج مجلد "شهادات تَقْدِير".</li>
                  <li>تظل الملفات والشهادات ملكاً خالصاً لك وتحت سيطرتك الكاملة داخل حسابك.</li>
                  <li>يمكنك في أي وقت إلغاء ربط التطبيق بحساب Google من داخل التطبيق أو عبر صفحة أمان حساب Google الخاصة بك: <span className="font-mono text-amber-300">myaccount.google.com/permissions</span>.</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 6: Student & Children Privacy */}
          <section id="student-privacy" className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-6 sm:p-8 space-y-4 shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-800/80 pb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <School className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-white">٦. خصوصية الطلاب والقُصّر والمدارس</h2>
                <p className="text-xs text-slate-400">حماية فائقة لبيانات البيئة التعليمية</p>
              </div>
            </div>

            <div className="space-y-3 text-slate-300 text-sm leading-relaxed">
              <p>
                ندرك في منصة تَقْدِير الحساسية العالية لبيانات الطلبة والمؤسسات التعليمية. لذا نلتزم بالمعايير التالية:
              </p>
              <ul className="space-y-2 text-xs text-slate-300 list-disc list-inside">
                <li>
                  <strong>عدم بناء ملفات تعريفية للطلاب:</strong> لا يقوم التطبيق بتتبع سلوك الطلاب، ولا يتم إنشاء أي سجلات إعلانية أو استهدافية للطلبة المكرمين.
                </li>
                <li>
                  <strong>حصر البيانات التقديرية:</strong> لا يطلب التطبيق أرقام هواتف الطلاب، أو عناوين إقامتهم، أو أي معلومات تعريفية حساسة تتجاوز الاسم والمرحلة الدراسية المطبوعة على الشهادة.
                </li>
                <li>
                  <strong>حماية الباركود وQR Code:</strong> رابط التحقق من الشهادة يقتصر فقط على استعراض صورة الشهادة الرسمية وبيانات الاعتماد للتأكد من أصالتها.
                </li>
              </ul>
            </div>
          </section>

          {/* Section 7: User Rights & Data Control */}
          <section id="user-rights" className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-6 sm:p-8 space-y-4 shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-800/80 pb-4">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-white">٧. حقوقك والتحكم الكامل في بياناتك</h2>
                <p className="text-xs text-slate-400">أدوات فورية بيدك لإدارة ومسح بياناتك</p>
              </div>
            </div>

            <div className="space-y-3 text-slate-300 text-sm leading-relaxed">
              <p>
                يمنحك تطبيق تَقْدِير السيطرة الكاملة على جميع بياناتك:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800 space-y-1.5">
                  <div className="flex items-center gap-2 text-rose-400 font-bold text-xs">
                    <Trash2 className="w-4 h-4 shrink-0" />
                    <span>حق الحذف الكامل والمسح الفوري</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-normal">
                    يمكنك في أي لحظة مسح جميع المسودات وسجلات الشهادات المحفوظة محلياً عبر زر "مسح الذاكرة المؤقتة" في لوحة الإعدادات أو مسح بيانات التخزين للمتصفح.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800 space-y-1.5">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                    <Download className="w-4 h-4 shrink-0" />
                    <span>حق تصدير واسترجاع بياناتك</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-normal">
                    يمكنك تحميل جميع شهاداتك كملفات PDF و PNG أو نسخ احتياطية بضغطة واحدة دون أي قيود.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800 space-y-1.5">
                  <div className="flex items-center gap-2 text-sky-400 font-bold text-xs">
                    <RefreshCw className="w-4 h-4 shrink-0" />
                    <span>إلغاء الربط وإبطال التوكن</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-normal">
                    يمكنك تسجيل الخروج بنقرة زر واحدة؛ حيث يتم إبطال وحذف مفاتيح التوثيق (Access Tokens) فورياً من جهازك.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800 space-y-1.5">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                    <FileCheck2 className="w-4 h-4 shrink-0" />
                    <span>إيقاف وتفعيل الميزات بحرية</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-normal">
                    من لوحة "إعدادات النظام"، يمكنك تعطيل أو تشغيل أي ميزة (مثل الحفظ السحابي، أو الذكاء الاصطناعي) بما يناسب رغبتك.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 8: Google Limited Use Compliance Statement */}
          <section id="compliance" className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-6 sm:p-8 space-y-4 shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-800/80 pb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-white">٨. الامتثال لسياسة بيانات مستخدمي Google</h2>
                <p className="text-xs text-slate-400">Google API Services User Data Policy Compliance</p>
              </div>
            </div>

            <div className="space-y-3 text-slate-300 text-sm leading-relaxed">
              <p className="bg-slate-900 p-4 rounded-xl border border-slate-800 text-xs text-slate-300 leading-relaxed font-sans">
                "Taqdeer's use and transfer to any other app of information received from Google APIs will adhere to the{' '}
                <a
                  href="https://developers.google.com/terms/api-services-user-data-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-400 hover:underline font-bold inline-flex items-center gap-1"
                >
                  Google API Services User Data Policy
                  <ExternalLink className="w-3 h-3" />
                </a>
                , including the Limited Use requirements."
              </p>

              <p className="text-xs text-slate-300">
                <strong>الترجمة التوضيحية:</strong> إن استخدام منصة تَقْدِير ونقلها لأي معلومات يتم استلامها من واجهات برمجة تطبيقات Google يلتزم التزاماً كاملاً بسياسة بيانات مستخدمي خدمات Google API، بما في ذلك متطلبات الاستخدام المحدود (Limited Use)، دون أي استخدام للمعلومات خارج إطار تقديم الخدمة المطلوبة من المستخدم صراحة.
              </p>
            </div>
          </section>

          {/* Section 9: Contact & Updates */}
          <section id="contact" className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-6 sm:p-8 space-y-4 shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-800/80 pb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-white">٩. التواصل والتحديثات</h2>
                <p className="text-xs text-slate-400">للاستفسارات وملاحظات الخصوصية والأمان</p>
              </div>
            </div>

            <div className="space-y-3 text-slate-300 text-sm leading-relaxed">
              <p>
                إذا كان لديك أي استفسار أو اقتراح يتعلق بسياسة الخصوصية هذه، أو إذا رغبت في الاستفسار عن بياناتك أو تقديم طلب مسح مخصص، يسعدنا تواصلك معنا مباشرة عبر:
              </p>

              <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-amber-400" />
                  <span className="text-slate-400">البريد الإلكتروني للدعم الفني والخصوصية:</span>
                  <a href="mailto:support@taqdeer.app" className="font-mono text-amber-300 font-bold hover:underline">
                    support@taqdeer.app
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-emerald-400" />
                  <span className="text-slate-400">الرابط المباشر للسياسة:</span>
                  <a href={privacyUrl} className="font-mono text-slate-300 hover:underline">
                    {privacyUrl}
                  </a>
                </div>
              </div>

              <p className="text-xs text-slate-400 pt-1">
                قد نقوم بتحديث سياسة الخصوصية من وقت لآخر لمواكبة التطورات التقنية أو التنظيمية. وسنقوم دائماً بتحديث تاريخ "آخر تحديث" في أعلى هذه الصفحة.
              </p>
            </div>
          </section>

          {/* Bottom Action Bar */}
          <div className="pt-4 pb-8 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-800 print:hidden">
            <button
              onClick={onBackToApp}
              className="w-full sm:w-auto px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm rounded-xl shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <ArrowRight className="w-4 h-4" />
              <span>العودة إلى صانع شهادات التقدير</span>
            </button>

            <button
              onClick={handleCopyLink}
              className="w-full sm:w-auto px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-amber-400" />}
              <span>{copiedLink ? 'تم نسخ الرابط' : 'نسخ رابط السياسة الرسمي'}</span>
            </button>
          </div>

        </main>

      </div>

      {/* Dedicated Policy Footer */}
      <footer className="bg-slate-950 border-t border-slate-800 py-8 text-center text-xs text-slate-400 space-y-2 print:hidden">
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
          <button onClick={onBackToApp} className="hover:text-amber-400 transition cursor-pointer">
            الرئيسية
          </button>
          <span className="text-slate-700">•</span>
          <a href={privacyUrl} className="text-amber-400 font-bold hover:underline">
            سياسة الخصوصية
          </a>
          <span className="text-slate-700">•</span>
          <span className="text-slate-500">منظومة تَقْدِير الأكاديمية</span>
        </div>
        <p className="text-slate-500 text-[11px]">
          © {new Date().getFullYear()} منصة تَقْدِير - صانع شهادات التقدير والشكر المعتمد. جميع الحقوق محفوظة.
        </p>
      </footer>

    </div>
  );
};

function Globe(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
    </svg>
  );
}
