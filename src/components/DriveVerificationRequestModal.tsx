import React, { useState } from 'react';
import { CertificateData } from '../types';
import { createDriveVerificationRequest } from '../utils/driveVerificationRequests';
import { Cloud, X, CheckCircle2, ShieldCheck, User, Phone, FileText, Send } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  certificate: CertificateData;
  onSuccess?: (msg: string) => void;
}

export const DriveVerificationRequestModal: React.FC<Props> = ({
  isOpen,
  onClose,
  certificate,
  onSuccess
}) => {
  const [requesterName, setRequesterName] = useState('');
  const [requesterContact, setRequesterContact] = useState('');
  const [requesterNotes, setRequesterNotes] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    setTimeout(() => {
      const result = createDriveVerificationRequest({
        certificate,
        requesterName: requesterName.trim(),
        requesterContact: requesterContact.trim(),
        requesterNotes: requesterNotes.trim()
      });

      setIsSubmitting(false);
      setIsSubmitted(true);

      if (onSuccess) {
        if (result.isNew) {
          onSuccess('تم إرسال طلب التوثيق والرفع على Google Drive بنجاح! سيتم مراجعته واعتماده من قبل الإدارة. ☁️🚀');
        } else {
          onSuccess('يوجد طلب توثيق قيد المراجعة مسبقاً لهذه الشهادة.');
        }
      }
    }, 400);
  };

  const handleResetAndClose = () => {
    setIsSubmitted(false);
    setRequesterName('');
    setRequesterContact('');
    setRequesterNotes('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4 font-['Cairo',sans-serif] animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden text-right">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 relative border-b border-slate-800">
          <button
            onClick={handleResetAndClose}
            className="absolute top-4 left-4 p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 pr-2">
            <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400 shrink-0">
              <Cloud className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">طلب التوثيق والرفع على Google Drive</h3>
              <p className="text-xs text-slate-300 mt-0.5">إرسال طلب لمسؤول النظام للمصادقة السحابية ورفع ملف الشهادة</p>
            </div>
          </div>
        </div>

        {/* Body */}
        {isSubmitted ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-100 border border-emerald-300 rounded-full flex items-center justify-center text-emerald-600 mx-auto animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h4 className="text-lg font-black text-slate-900">تم تسجيل طلب التوثيق بنجاح!</h4>
            <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
              وصل طلب التوثيق إلى قائمة مهام مسؤول النظام السحابية. بعد اعتماد الطلب ورفع الشهادة، ستظهر إشارة الاعتماد السحابي ورابط Google Drive المباشر تلقائياً.
            </p>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
              <div className="text-slate-500">اسم الطالب: <strong className="text-slate-900">{certificate.studentName}</strong></div>
              <div className="text-slate-500 font-mono">كود التوثيق: <strong className="text-indigo-700">{certificate.verificationCode || certificate.id}</strong></div>
            </div>
            <button
              onClick={handleResetAndClose}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
            
            {/* Certificate Summary Card */}
            <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-2xl space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-indigo-950 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  بيانات الشهادة المراد توثيقها:
                </span>
                <span className="font-mono text-[10px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-md font-bold">
                  {certificate.verificationCode || certificate.id}
                </span>
              </div>
              <div className="text-slate-800 font-bold text-sm">{certificate.studentName}</div>
              <div className="text-slate-600 text-[11px] flex items-center gap-2">
                <span>المدرسة: {certificate.schoolName || 'جهة معتمدة'}</span>
                <span>•</span>
                <span>الصف: {certificate.grade || '—'}</span>
              </div>
            </div>

            {/* Requester Name */}
            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-500" />
                <span>اسم مقدم الطلب (طالب / ولي أمر / معلم):</span>
              </label>
              <input
                type="text"
                required
                value={requesterName}
                onChange={(e) => setRequesterName(e.target.value)}
                placeholder="أدخل اسمك الكريم"
                className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none text-xs"
              />
            </div>

            {/* Requester Contact */}
            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-500" />
                <span>رقم التواصل أو البريد الإلكتروني (اختياري):</span>
              </label>
              <input
                type="text"
                value={requesterContact}
                onChange={(e) => setRequesterContact(e.target.value)}
                placeholder="مثال: 05XXXXXXXX أو email@domain.com"
                className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none text-xs"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                <span>ملاحظات إضافية أو مبرر التوثيق (اختياري):</span>
              </label>
              <textarea
                rows={2}
                value={requesterNotes}
                onChange={(e) => setRequesterNotes(e.target.value)}
                placeholder="مثال: يرجى رفع الشهادة بصيغة PDF على درايف لاعتمادها في مسابقة التميز..."
                className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none text-xs leading-relaxed"
              />
            </div>

            {/* Footer Buttons */}
            <div className="pt-3 border-t flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleResetAndClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'جاري الإرسال...' : 'إرسال طلب التوثيق السحابي'}</span>
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
};
