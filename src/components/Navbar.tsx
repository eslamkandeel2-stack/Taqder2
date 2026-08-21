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
  BookmarkCheck,
  ChevronLeft,
  ChevronRight,
  Undo2,
  Redo2,
  History
} from 'lucide-react';
import { getSavedDrafts, subscribeToDrafts } from '../utils/draftsManager';
import { useDragScroll } from '../utils/useDragScroll';

interface Props {
  activeTab: 'editor' | 'batch' | 'dashboard' | 'cloud' | 'verify' | 'ai' | 'settings';
  setActiveTab: (tab: 'editor' | 'batch' | 'dashboard' | 'cloud' | 'verify' | 'ai' | 'settings') => void;
  onExportPDF: () => void;
  onQuickGenerateAI: () => void;
  onPrint?: () => void;
  onOpenVerificationModal?: () => void;
  onOpenGoogleDriveModal?: () => void;
  onOpenDraftsModal?: () => void;
  onOpenHistoryModal?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
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
  onOpenHistoryModal,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  certificateData,
  onUpdateCloudCertificate,
  onSaveNewToCloud,
  lastAutosavedTime
}) => {
  const [draftsCount, setDraftsCount] = React.useState(0);
  const actionDrag = useDragScroll();
  const mobileNavDrag = useDragScroll();

  React.useEffect(() => {
    const updateCount = () => {
      setDraftsCount(getSavedDrafts().length);
    };
    updateCount();
    const unsub = subscribeToDrafts(updateCount);
    return () => unsub();
  }, []);
  return (
    <header className="bg-slate-900 text-white sticky top-0 z-50 shadow-lg border-b border-slate-800 select-none">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
        <div className="flex items-center justify-between h-15 sm:h-16 gap-2 sm:gap-3">
          
          {/* Logo & App Title */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 cursor-pointer shrink-0" onClick={() => setActiveTab('editor')}>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 flex items-center justify-center shadow-md text-slate-950 font-black shrink-0">
              <Award className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1 sm:gap-1.5">
                <span className="font-black text-sm sm:text-lg tracking-tight text-white font-['Cairo'] leading-none">
                  تَقْدِير
                </span>
                <span className="text-[8px] sm:text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded-full font-bold whitespace-nowrap">
                  الذكاء الاصطناعي
                </span>
              </div>
              <p className="text-[9px] text-slate-400 hidden xl:block leading-tight mt-0.5">منظومة شهادات التقدير والتوثيق المعتمدة</p>
            </div>
          </div>

          {/* Navigation Links - Desktop */}
          <nav className="hidden lg:flex items-center gap-1 bg-slate-800/90 p-1 rounded-xl border border-slate-700/80 shrink-0">
            <button
              onClick={() => setActiveTab('editor')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'editor'
                  ? 'bg-amber-500 text-slate-950 shadow-sm font-black'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>المحرر والقوالب</span>
            </button>

            <button
              onClick={() => setActiveTab('batch')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'batch'
                  ? 'bg-amber-500 text-slate-950 shadow-sm font-black'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>الشهادات الجماعية</span>
            </button>

            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-amber-500 text-slate-950 shadow-sm font-black'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>الإنجاز والمهام</span>
            </button>

            <button
              onClick={() => setActiveTab('cloud')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'cloud'
                  ? 'bg-amber-500 text-slate-950 shadow-sm font-black'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              <CloudCheck className="w-3.5 h-3.5" />
              <span>السحابة المحفوظة</span>
            </button>

            <button
              onClick={() => setActiveTab('verify')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'verify'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm font-black'
                  : 'text-emerald-300 hover:text-white hover:bg-emerald-950/60'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>بوابة التوثيق</span>
            </button>

            <button
              onClick={() => setActiveTab('ai')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'ai'
                  ? 'bg-amber-500 text-slate-950 shadow-sm font-black'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              <BotMessageSquare className="w-3.5 h-3.5 text-amber-300" />
              <span>المساعد الذكي</span>
            </button>
          </nav>

          {/* Action Buttons Container with Horizontal Drag-to-Scroll */}
          <div className="relative flex items-center min-w-0 max-w-[65vw] sm:max-w-none">
            
            {/* Action Bar Scroll Area */}
            <div
              ref={actionDrag.scrollRef}
              onMouseDown={actionDrag.onMouseDown}
              onMouseLeave={actionDrag.onMouseLeave}
              onMouseUp={actionDrag.onMouseUp}
              onMouseMove={actionDrag.onMouseMove}
              className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 touch-pan-x cursor-grab active:cursor-grabbing max-w-full"
            >
              
              {/* LocalStorage Auto-save Indicator Badge */}
              <div className="hidden 2xl:flex items-center gap-1.5 bg-slate-800/90 text-emerald-400 border border-emerald-500/30 px-2 py-1 rounded-lg text-[10px] font-bold shrink-0 shadow-xs" title="يتم حفظ التغييرات تلقائياً في التخزين المحلي">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
                <span>حفظ تلقائي</span>
                {lastAutosavedTime && <span className="text-slate-400 font-mono text-[9px]">({lastAutosavedTime})</span>}
              </div>

              {/* Undo / Redo & Visual History Controls */}
              {(onUndo || onRedo || onOpenHistoryModal) && (
                <div className="flex items-center bg-slate-800/80 border border-slate-700/80 rounded-lg p-0.5 shrink-0 gap-0.5">
                  {onUndo && (
                    <button
                      type="button"
                      onClick={onUndo}
                      disabled={!canUndo}
                      className="p-1 text-slate-300 hover:text-white hover:bg-slate-700/80 disabled:opacity-30 disabled:hover:bg-transparent rounded-md transition cursor-pointer"
                      title="تراجع (Ctrl+Z)"
                    >
                      <Undo2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {onRedo && (
                    <button
                      type="button"
                      onClick={onRedo}
                      disabled={!canRedo}
                      className="p-1 text-slate-300 hover:text-white hover:bg-slate-700/80 disabled:opacity-30 disabled:hover:bg-transparent rounded-md transition cursor-pointer"
                      title="إعادة (Ctrl+Y)"
                    >
                      <Redo2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {onOpenHistoryModal && (
                    <button
                      type="button"
                      onClick={onOpenHistoryModal}
                      className="flex items-center gap-1 px-1.5 py-1 text-amber-300 hover:text-amber-200 hover:bg-amber-500/10 rounded-md transition text-[11px] font-bold cursor-pointer"
                      title="سجل التعديلات الزمني الكامل (Undo/Redo History)"
                    >
                      <History className="w-3.5 h-3.5 text-amber-400" />
                      <span className="hidden lg:inline text-[10px]">السجل</span>
                    </button>
                  )}
                </div>
              )}

              {/* Saved Drafts and Templates Button */}
              {onOpenDraftsModal && (
                <button
                  type="button"
                  onClick={onOpenDraftsModal}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 border border-amber-500/40 text-xs font-black rounded-lg transition shadow-xs shrink-0 cursor-pointer"
                  title="إدارة واسترجاع المسودات والقوالب المحفوظة بالنظام"
                >
                  <FolderHeart className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="hidden sm:inline">المسودات</span>
                  <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold">
                    {draftsCount}
                  </span>
                </button>
              )}

              {certificateData?.isSavedCloud && onUpdateCloudCertificate ? (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={onUpdateCloudCertificate}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-lg transition shadow-md shrink-0 cursor-pointer"
                    title="حفظ التعديلات الحالية على هذه الشهادة في السحابة"
                  >
                    <CloudCheck className="w-3.5 h-3.5 shrink-0" />
                    <span className="hidden lg:inline">حفظ بالسحابة</span>
                  </button>
                  {onSaveNewToCloud && (
                    <button
                      type="button"
                      onClick={onSaveNewToCloud}
                      className="flex items-center gap-1 px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-300 font-bold text-xs rounded-lg transition shrink-0 cursor-pointer border border-sky-500/30"
                      title="حفظ هذه الشهادة كشهادة جديدة منفصلة بالسحابة"
                    >
                      <Cloud className="w-3.5 h-3.5 shrink-0" />
                      <span className="hidden xl:inline">+ كشهادة جديدة</span>
                    </button>
                  )}
                </div>
              ) : onSaveNewToCloud ? (
                <button
                  type="button"
                  onClick={onSaveNewToCloud}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-xs rounded-lg transition shadow-xs shrink-0 cursor-pointer"
                  title="حفظ هذه الشهادة كشهادة جديدة في السحابة"
                >
                  <Cloud className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden lg:inline">حفظ كجديدة</span>
                </button>
              ) : null}

              {onOpenGoogleDriveModal && (
                <button
                  type="button"
                  onClick={onOpenGoogleDriveModal}
                  className={`flex items-center gap-1 px-2.5 py-1.5 font-extrabold text-xs rounded-lg transition shadow-xs shrink-0 cursor-pointer ${
                    certificateData?.driveFileWebViewLink
                      ? 'bg-emerald-600 text-white hover:bg-emerald-500 border border-emerald-400/40'
                      : 'bg-slate-800 text-amber-300 hover:bg-slate-700 border border-slate-700'
                  }`}
                  title={certificateData?.driveFileWebViewLink ? "شهادة موثقة على Google Drive" : "حفظ الشهادة ومصادقة الباركود عبر Google Drive"}
                >
                  <Cloud className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="hidden lg:inline">
                    {certificateData?.driveFileWebViewLink ? 'Drive 🟢' : 'Drive'}
                  </span>
                </button>
              )}

              {onOpenVerificationModal && (
                <button
                  type="button"
                  onClick={onOpenVerificationModal}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 text-xs font-extrabold rounded-lg transition shadow-xs shrink-0 cursor-pointer"
                  title="التحقق الرقمي والتوثيق من صحة الشهادة عبر المنصة"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="hidden lg:inline">التحقق</span>
                </button>
              )}

              <button
                type="button"
                onClick={onQuickGenerateAI}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 text-xs font-extrabold rounded-lg hover:brightness-110 transition shadow-xs shrink-0 cursor-pointer"
                title="توليد بالذكاء الاصطناعي"
              >
                <Sparkles className="w-3.5 h-3.5 animate-pulse shrink-0" />
                <span className="hidden lg:inline">صياغة AI</span>
              </button>

              {onPrint && (
                <button
                  type="button"
                  onClick={onPrint}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold rounded-lg transition shadow-xs shrink-0 cursor-pointer"
                  title="معاينة للطباعة المباشرة"
                >
                  <Printer className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden lg:inline">طباعة</span>
                </button>
              )}

              <button
                type="button"
                onClick={onExportPDF}
                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold rounded-lg transition shadow-xs shrink-0 cursor-pointer"
                title="تصدير الشهادة صيغة PDF"
              >
                <Download className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">تصدير PDF</span>
                <span className="sm:hidden font-black">PDF</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition shrink-0 cursor-pointer"
                title="الإعدادات والدعم"
              >
                <Settings className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </button>
            </div>
          </div>

        </div>

        {/* Mobile Tab Bar with smooth drag scrolling */}
        <div
          ref={mobileNavDrag.scrollRef}
          onMouseDown={mobileNavDrag.onMouseDown}
          onMouseLeave={mobileNavDrag.onMouseLeave}
          onMouseUp={mobileNavDrag.onMouseUp}
          onMouseMove={mobileNavDrag.onMouseMove}
          className="flex lg:hidden overflow-x-auto pb-2 gap-1.5 border-t border-slate-800 pt-2 px-1 no-scrollbar touch-pan-x cursor-grab active:cursor-grabbing select-none max-w-full"
        >
          <button
            type="button"
            onClick={() => setActiveTab('editor')}
            className={`flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 text-xs font-bold rounded-xl transition-all shrink-0 cursor-pointer ${
              activeTab === 'editor' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'bg-slate-800/80 text-slate-300 hover:text-white'
            }`}
          >
            <Award className="w-3.5 h-3.5 shrink-0" />
            <span>المحرر والقوالب</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('batch')}
            className={`flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 text-xs font-bold rounded-xl transition-all shrink-0 cursor-pointer ${
              activeTab === 'batch' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'bg-slate-800/80 text-slate-300 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5 shrink-0" />
            <span>دفعة شهادات</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 text-xs font-bold rounded-xl transition-all shrink-0 cursor-pointer ${
              activeTab === 'dashboard' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'bg-slate-800/80 text-slate-300 hover:text-white'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5 shrink-0" />
            <span>الإنجاز والمهام</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('cloud')}
            className={`flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 text-xs font-bold rounded-xl transition-all shrink-0 cursor-pointer ${
              activeTab === 'cloud' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'bg-slate-800/80 text-slate-300 hover:text-white'
            }`}
          >
            <CloudCheck className="w-3.5 h-3.5 shrink-0" />
            <span>السحابة</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('verify')}
            className={`flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 text-xs font-bold rounded-xl transition-all shrink-0 cursor-pointer ${
              activeTab === 'verify' ? 'bg-emerald-500 text-slate-950 shadow-xs' : 'bg-slate-800/80 text-emerald-300 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>بوابة التوثيق</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ai')}
            className={`flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 text-xs font-bold rounded-xl transition-all shrink-0 cursor-pointer ${
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

