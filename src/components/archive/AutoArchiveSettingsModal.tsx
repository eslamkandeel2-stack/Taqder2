import React, { useState, useEffect } from 'react';
import {
  Archive,
  CheckCircle2,
  X,
  Sparkles,
  Printer,
  Download,
  Layers,
  Cloud,
  FileCheck,
  RotateCcw,
  ShieldCheck,
  Info
} from 'lucide-react';
import {
  getAutoArchiveConfig,
  saveAutoArchiveConfig,
  AutoArchiveConfig,
  autoArchiveCertificate
} from '../../utils/archiveManager';
import { CertificateData } from '../../types';

interface AutoArchiveSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCertificate?: CertificateData;
  onRefreshLibrary: () => void;
  onShowToast: (msg: string) => void;
}

export const AutoArchiveSettingsModal: React.FC<AutoArchiveSettingsModalProps> = ({
  isOpen,
  onClose,
  currentCertificate,
  onRefreshLibrary,
  onShowToast
}) => {
  const [config, setConfig] = useState<AutoArchiveConfig>(getAutoArchiveConfig());
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setConfig(getAutoArchiveConfig());
      setSavedSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggle = (key: keyof AutoArchiveConfig) => {
    setConfig(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSave = () => {
    saveAutoArchiveConfig(config);
    setSavedSuccess(true);
    onRefreshLibrary();
    onShowToast('تم حفظ إعدادات الأرشفة التلقائية بنجاح! 💾');
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 600);
  };

  const handleManualArchiveCurrent = () => {
    if (!currentCertificate) {
      onShowToast('لا توجد شهادة مفتوحة حالياً للأرشفة.');
      return;
    }

    const res = autoArchiveCertificate(currentCertificate, {
      event: 'manual_save',
      force: true
    });

    if (res.success) {
      onRefreshLibrary();
      onShowToast(`تمت أرشفة شهادة "${currentCertificate.studentName || 'الطالب'}" بنجاح في المكتبة السحابية! 🗄️✨`);
    } else {
      onShowToast('حدث خطأ أثناء أرشفة الشهادة.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 text-right font-sans shadow-2xl space-y-5">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl">
              <Archive className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">إعدادات الأرشفة التلقائية للشهادات</h3>
              <p className="text-xs text-slate-400">التحكم في حفظ وتصنيف الشهادات المكتملة في السحابة</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Master Switch */}
        <div className="bg-slate-850 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-sm font-black text-white block">تفعيل نظام الأرشفة التلقائية</span>
            <span className="text-xs text-slate-400 block">
              حفظ وتصنيف الشهادات تلقائياً في السحابة بمجرد اكتمالها وتصديرها
            </span>
          </div>
          <button
            onClick={() => handleToggle('enabled')}
            className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
              config.enabled ? 'bg-amber-500' : 'bg-slate-700'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 bg-slate-950 w-5 h-5 rounded-full transition-transform transform ${
                config.enabled ? 'translate-x-6 bg-white' : ''
              }`}
            />
          </button>
        </div>

        {/* Triggers Checklist */}
        <div className="space-y-2.5">
          <span className="text-xs font-bold text-slate-400 block">أحداث ومحفزات الأرشفة التلقائية:</span>
          
          <div className="space-y-2">
            <label className="flex items-center justify-between p-3 bg-slate-800/60 hover:bg-slate-800 rounded-xl border border-slate-700/60 cursor-pointer transition">
              <div className="flex items-center gap-2.5">
                <Download className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-slate-200">أرشفة عند تصدير الشهادة كـ PDF</span>
              </div>
              <input
                type="checkbox"
                checked={config.archiveOnPdfExport}
                onChange={() => handleToggle('archiveOnPdfExport')}
                disabled={!config.enabled}
                className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-slate-800/60 hover:bg-slate-800 rounded-xl border border-slate-700/60 cursor-pointer transition">
              <div className="flex items-center gap-2.5">
                <FileCheck className="w-4 h-4 text-sky-400" />
                <span className="text-xs font-bold text-slate-200">أرشفة عند تصدير الشهادة كصورة PNG</span>
              </div>
              <input
                type="checkbox"
                checked={config.archiveOnPngExport}
                onChange={() => handleToggle('archiveOnPngExport')}
                disabled={!config.enabled}
                className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-slate-800/60 hover:bg-slate-800 rounded-xl border border-slate-700/60 cursor-pointer transition">
              <div className="flex items-center gap-2.5">
                <Printer className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-slate-200">أرشفة عند الطباعة المباشرة</span>
              </div>
              <input
                type="checkbox"
                checked={config.archiveOnPrint}
                onChange={() => handleToggle('archiveOnPrint')}
                disabled={!config.enabled}
                className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-slate-800/60 hover:bg-slate-800 rounded-xl border border-slate-700/60 cursor-pointer transition">
              <div className="flex items-center gap-2.5">
                <Layers className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-bold text-slate-200">أرشفة وتصنيف دفعات الفصول فور توليدها</span>
              </div>
              <input
                type="checkbox"
                checked={config.archiveOnBatchGenerate}
                onChange={() => handleToggle('archiveOnBatchGenerate')}
                disabled={!config.enabled}
                className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-slate-800/60 hover:bg-slate-800 rounded-xl border border-slate-700/60 cursor-pointer transition">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-slate-200">توليد رمز توثيق رسمي معتمد تلقائياً لكل شهادة</span>
              </div>
              <input
                type="checkbox"
                checked={config.autoGenerateCodeIfMissing}
                onChange={() => handleToggle('autoGenerateCodeIfMissing')}
                disabled={!config.enabled}
                className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
              />
            </label>
          </div>
        </div>

        {/* Quick Action Button */}
        {currentCertificate && (
          <div className="bg-amber-500/10 border border-amber-500/30 p-3.5 rounded-2xl flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-amber-200 block">أرشفة الشهادة المفتوحة الآن</span>
              <span className="text-[11px] text-slate-400 block truncate max-w-[220px]">
                {currentCertificate.studentName || 'طالب متميز'} ({currentCertificate.schoolName || 'مدرسة عامة'})
              </span>
            </div>
            <button
              onClick={handleManualArchiveCurrent}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer shrink-0 shadow"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>أرشفة الآن</span>
            </button>
          </div>
        )}

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition cursor-pointer"
          >
            إلغاء
          </button>

          <button
            onClick={handleSave}
            className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 transition flex items-center gap-2 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>حفظ الإعدادات</span>
          </button>
        </div>

      </div>
    </div>
  );
};
