import React from 'react';
import {
  Award,
  Sparkles,
  Users,
  LayoutDashboard,
  CloudCheck,
  BotMessageSquare,
  Settings,
  Printer,
  Download,
  Share2,
  ShieldCheck,
  Cloud,
  FolderHeart,
  BookmarkCheck
} from 'lucide-react';
import { getSavedDrafts, subscribeToDrafts } from '../utils/draftsManager';

interface Props {
  activeTab: 'editor' | 'batch' | 'dashboard' | 'cloud' | 'verify' | 'ai' | 'settings';
  setActiveTab: (tab: 'editor' | 'batch' | 'dashboard' | 'cloud' | 'verify' | 'ai' | 'settings') => void;
  onExportPDF: () => void;
  onQuickGenerateAI: () => void;
  onPrint?: () => void;
  onOpenVerificationModal?: () => void;
  onOpenGoogleDriveModal?: () => void;
  onOpenDraftsModal?: () => void;
  certificateData?: any;
  onUpdateCloudCertificate?: () => void;
  onSaveNewToCloud?: () => void;
  lastAutosavedTime?: string | null;
}

export const Navbar: React.FC<Props> = ({
  activeTab,
  setActiveTab,
  onExportPDF,
  onQuickGenerateAI,
  onPrint,
  onOpenVerificationModal,
  onOpenGoogleDriveModal,
  onOpenDraftsModal,
  certificateData,
  onUpdateCloudCertificate,
  onSaveNewToCloud,
  lastAutosavedTime
}) => {
  const [draftsCount, setDraftsCount] = React.useState(0);

  React.useEffect(() => {
    const updateCount = () => {
      setDraftsCount(getSavedDrafts().length);
    };
    updateCount();
    const unsub = subscribeToDrafts(updateCount);
    return () => unsub();
  }, []);
  return (
    <header className="bg-slate-900 text-white sticky top-0 z-50 shadow-lg border-b border-slate-800 overflow-x-clip">
      <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-1.5 sm:gap-2">
          
          {/* Logo & App Title */}
          <div className="flex items-center gap-1.5 sm:gap-3 cursor-pointer shrink-0" onClick={() => setActiveTab('editor')}>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 flex items-center justify-center shadow-md text-slate-950 font-black shrink-0">
              <Award className="w-4 h-4 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-1 sm:gap-2">
                <span className="font-black text-base sm:text-xl tracking-tight text-white font-['Cairo'] leading-none">
                  تَقْدِير
                </span>
                <span className="text-[8px] sm:text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1 py-0.5 sm:px-1.5 rounded-full font-bold whitespace-nowrap">
                  ذكاء اصطناعي
                </span>
              </div>
              <p className="text-[9px] sm:text-[10px] text-slate-400 hidden sm:block">صانع شهادات التقدير والشكر للطلاب</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700">
            <button
              onClick={() => setActiveTab('editor')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'editor'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              <Award className="w-4 h-4" />
              المحرر والقوالب
            </button>

            <button
              onClick={() => setActiveTab('batch')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'batch'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              <Users className="w-4 h-4" />
              الشهادات الجماعية
            </button>

            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              لوحة الإنجاز والمهام
            </button>

            <button
              onClick={() => setActiveTab('cloud')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'cloud'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              <CloudCheck className="w-4 h-4" />
              السحابة المحفوظة
            </button>

            <button
              onClick={() => setActiveTab('verify')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'verify'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-emerald-300 hover:text-white hover:bg-emerald-900/40'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              فحص التوثيق
            </button>

            <button
              onClick={() => setActiveTab('ai')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'ai'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              <BotMessageSquare className="w-4 h-4 text-amber-300" />
              المساعد الذكي
            </button>
          </nav>

          {/* Action Buttons & Sync Indicator */}
          <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar max-w-[62vw] xs:max-w-[70vw] sm:max-w-none shrink-0 py-1">
            
            {/* LocalStorage Auto-save Indicator Badge */}
            <div className="hidden xl:flex items-center gap-1.5 bg-slate-800/90 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-lg text-[10px] font-bold shrink-0 shadow-xs" title="يتم حفظ التغييرات تلقائياً في التخزين المحلي لمنع فقدان البيانات عند تحديث الصفحة">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
              <span>حفظ تلقائي</span>
              {lastAutosavedTime && <span className="text-slate-400 font-mono text-[9px]">({lastAutosavedTime})</span>}
            </div>

            {/* Saved Drafts and Templates Button */}
            {onOpenDraftsModal && (
              <button
                onClick={onOpenDraftsModal}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 border border-amber-500/40 text-[11px] sm:text-xs font-black rounded-lg transition shadow-xs shrink-0 cursor-pointer"
                title="إدارة واسترجاع المسودات والقوالب المحفوظة بالنظام"
              >
                <FolderHeart className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 shrink-0" />
                <span className="hidden sm:inline">المسودات</span>
                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold">
                  {draftsCount}
                </span>
              </button>
            )}
            {certificateData?.isSavedCloud && onUpdateCloudCertificate ? (
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={onUpdateCloudCertificate}
                  className="flex items-center gap-1 px-2 sm:px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[11px] sm:text-xs rounded-lg transition shadow-md shrink-0 cursor-pointer"
                  title="حفظ التعديلات الحالية على هذه الشهادة في السحابة"
                >
                  <CloudCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                  <span className="hidden lg:inline">حفظ التعديلات بالسحابة</span>
                </button>
                {onSaveNewToCloud && (
                  <button
                    onClick={onSaveNewToCloud}
                    className="flex items-center gap-1 px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-300 font-bold text-[11px] rounded-lg transition shrink-0 cursor-pointer border border-sky-500/30"
                    title="حفظ هذه الشهادة كشهادة جديدة منفصلة بالسحابة"
                  >
                    <Cloud className="w-3.5 h-3.5 shrink-0" />
                    <span className="hidden xl:inline">+ كشهادة جديدة</span>
                  </button>
                )}
              </div>
            ) : onSaveNewToCloud ? (
              <button
                onClick={onSaveNewToCloud}
                className="flex items-center gap-1 px-2 sm:px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-[11px] sm:text-xs rounded-lg transition shadow-xs shrink-0 cursor-pointer"
                title="حفظ هذه الشهادة كشهادة جديدة في السحابة"
              >
                <Cloud className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span className="hidden lg:inline">حفظ كشهادة جديدة</span>
              </button>
            ) : null}

            {onOpenGoogleDriveModal && (
              <button
                onClick={onOpenGoogleDriveModal}
                className={`flex items-center gap-1 px-2 sm:px-3 py-1.5 font-extrabold text-[11px] sm:text-xs rounded-lg transition shadow-xs shrink-0 cursor-pointer ${
                  certificateData?.driveFileWebViewLink
                    ? 'bg-emerald-600 text-white hover:bg-emerald-500 border border-emerald-400/40'
                    : 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 hover:brightness-110'
                }`}
                title={certificateData?.driveFileWebViewLink ? "شهادة موثقة على Google Drive" : "حفظ الشهادة ومصادقة الباركود عبر Google Drive"}
              >
                <Cloud className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span className="hidden lg:inline">
                  {certificateData?.driveFileWebViewLink ? 'موثقة بـ Drive 🟢' : 'Google Drive'}
                </span>
              </button>
            )}

            {onOpenVerificationModal && (
              <button
                onClick={onOpenVerificationModal}
                className="flex items-center gap-1 px-2 sm:px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 text-[11px] sm:text-xs font-extrabold rounded-lg transition shadow-xs shrink-0 cursor-pointer"
                title="التحقق الرقمي والتوثيق من صحة الشهادة عبر المنصة"
              >
                <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 shrink-0" />
                <span className="hidden lg:inline">التحقق</span>
              </button>
            )}

            <button
              onClick={onQuickGenerateAI}
              className="flex items-center gap-1 px-2 sm:px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 text-[11px] sm:text-xs font-extrabold rounded-lg hover:brightness-110 transition shadow-xs shrink-0 cursor-pointer"
              title="توليد بالذكاء الاصطناعي"
            >
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-pulse shrink-0" />
              <span className="hidden lg:inline">صياغة AI</span>
            </button>

            {onPrint && (
              <button
                onClick={onPrint}
                className="flex items-center gap-1 px-2 sm:px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] sm:text-xs font-extrabold rounded-lg transition shadow-xs shrink-0 cursor-pointer"
                title="معاينة للطباعة المباشرة"
              >
                <Printer className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span className="hidden lg:inline">طباعة</span>
              </button>
            )}

            <button
              onClick={onExportPDF}
              className="flex items-center gap-1 px-2 sm:px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] sm:text-xs font-extrabold rounded-lg transition shadow-xs shrink-0 cursor-pointer"
              title="تصدير الشهادة صيغة PDF"
            >
              <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="hidden sm:inline">تصدير PDF</span>
              <span className="sm:hidden text-[11px] font-black">PDF</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className="p-1.5 sm:p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition shrink-0 cursor-pointer"
              title="الإعدادات والدعم"
            >
              <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

        </div>

        {/* Mobile Tab Bar */}
        <div className="flex lg:hidden overflow-x-auto pb-2 gap-1.5 border-t border-slate-800 pt-2 px-1 no-scrollbar touch-pan-x scroll-smooth max-w-full">
          <button
            onClick={() => setActiveTab('editor')}
            className={`flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 text-xs font-bold rounded-xl transition-all shrink-0 ${
              activeTab === 'editor' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'bg-slate-800/80 text-slate-300 hover:text-white'
            }`}
          >
            <Award className="w-3.5 h-3.5 shrink-0" />
            <span>المحرر والقوالب</span>
          </button>
          <button
            onClick={() => setActiveTab('batch')}
            className={`flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 text-xs font-bold rounded-xl transition-all shrink-0 ${
              activeTab === 'batch' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'bg-slate-800/80 text-slate-300 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5 shrink-0" />
            <span>دفعة شهادات</span>
          </button>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 text-xs font-bold rounded-xl transition-all shrink-0 ${
              activeTab === 'dashboard' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'bg-slate-800/80 text-slate-300 hover:text-white'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5 shrink-0" />
            <span>الإنجاز والمهام</span>
          </button>
          <button
            onClick={() => setActiveTab('cloud')}
            className={`flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 text-xs font-bold rounded-xl transition-all shrink-0 ${
              activeTab === 'cloud' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'bg-slate-800/80 text-slate-300 hover:text-white'
            }`}
          >
            <CloudCheck className="w-3.5 h-3.5 shrink-0" />
            <span>السحابة</span>
          </button>
          <button
            onClick={() => setActiveTab('verify')}
            className={`flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 text-xs font-bold rounded-xl transition-all shrink-0 ${
              activeTab === 'verify' ? 'bg-emerald-500 text-slate-950 shadow-xs' : 'bg-slate-800/80 text-emerald-300 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>فحص التوثيق</span>
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 text-xs font-bold rounded-xl transition-all shrink-0 ${
              activeTab === 'ai' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'bg-slate-800/80 text-slate-300 hover:text-white'
            }`}
          >
            <BotMessageSquare className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span>مساعد AI</span>
          </button>
        </div>

      </div>
    </header>
  );
};
