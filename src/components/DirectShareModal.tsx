import React, { useState, useEffect } from 'react';
import {
  X,
  Send,
  Mail,
  Download,
  Share2,
  Copy,
  Check,
  FileText,
  Image as ImageIcon,
  MessageSquare,
  Sparkles,
  PhoneCall,
  ExternalLink,
  RefreshCw,
  Info,
  CheckCircle2
} from 'lucide-react';
import { CertificateData } from '../types';
import {
  generateCertificatePngFile,
  generateCertificatePdfFile,
  canWebShareFiles
} from '../utils/shareUtils';
import { findCertificateCanvasElement } from '../utils/exportUtils';
import { getAccessToken, googleSignIn } from '../services/googleDriveService';
import { sendEmailViaGmailApi } from '../services/emailService';

interface DirectShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'whatsapp' | 'email';
  certificateData: CertificateData;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  onShowToast: (message: string) => void;
  onSetExporting?: (exporting: boolean) => void;
  currentUserEmail?: string | null;
}

const COUNTRY_CODES = [
  { code: '+966', label: '🇸🇦 المملكة العربية السعودية (+966)', flag: '🇸🇦', digits: 9 },
  { code: '+971', label: '🇦🇪 الإمارات العربية المتحدة (+971)', flag: '🇦🇪', digits: 9 },
  { code: '+965', label: '🇰🇼 الكويت (+965)', flag: '🇰🇼', digits: 8 },
  { code: '+20', label: '🇪🇬 جمهورية مصر العربية (+20)', flag: '🇪🇬', digits: 10 },
  { code: '+962', label: '🇯🇴 المملكة الأردنية الهاشمية (+962)', flag: '🇯🇴', digits: 9 },
  { code: '+968', label: '🇴🇲 سلطنة عُمان (+968)', flag: '🇴🇲', digits: 8 },
  { code: '+974', label: '🇶🇦 دولة قطر (+974)', flag: '🇶🇦', digits: 8 },
  { code: '+973', label: '🇧🇭 مملكة البحرين (+973)', flag: '🇧🇭', digits: 8 },
  { code: '+964', label: '🇮🇶 جمهورية العراق (+964)', flag: '🇮🇶', digits: 10 },
  { code: '+212', label: '🇲🇦 المملكة المغربية (+212)', flag: '🇲🇦', digits: 9 },
  { code: '', label: '🌐 رقم دولي مخصص مع الرمز', flag: '🌐', digits: 0 },
];

export const DirectShareModal: React.FC<DirectShareModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'whatsapp',
  certificateData,
  canvasRef,
  onShowToast,
  onSetExporting,
  currentUserEmail
}) => {
  const [activeTab, setActiveTab] = useState<'whatsapp' | 'email'>(initialMode);
  const [format, setFormat] = useState<'png' | 'pdf'>(activeTab === 'whatsapp' ? 'png' : 'pdf');

  // WhatsApp States
  const [countryCode, setCountryCode] = useState('+966');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [waMessage, setWaMessage] = useState(
    `السلام عليكم ورحمة الله وبركاته،\nنرفق لكم شهادة تقدير للطالب/ـة: ${certificateData.studentName || 'طالب'}\nبمناسبة: ${certificateData.courseTitle || certificateData.title || 'إتمام الدورة'}`
  );

  // Email States
  const [recipientEmail, setRecipientEmail] = useState('');
  const [emailSubject, setEmailSubject] = useState(
    `شهادة تقدير للطالب/ـة: ${certificateData.studentName || 'طالب'}`
  );
  const [emailBody, setEmailBody] = useState(
    `السلام عليكم ورحمة الله وبركاته،\n\nتحية طيبة وبعد،\nنرفق لكم شهادة التقدير الخاصة بالطالب/ـة: ${certificateData.studentName || 'طالب'}\nعن: ${certificateData.courseTitle || certificateData.title || 'تقدير وتفوق'}\n\nتجدون المرفق بجودة عالية جاهزاً للطباعة والمشاركة.\n\nمع أطيب التحيات والمعايدة.`
  );

  const [isLoading, setIsLoading] = useState(false);
  const [isSendingGmail, setIsSendingGmail] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Send Direct Email via Official Gmail API
  const handleSendViaGmail = async () => {
    if (!recipientEmail || !recipientEmail.includes('@')) {
      onShowToast('يرجى كتابة عنوان بريد إلكتروني صحيح للمستلم');
      return;
    }

    try {
      setIsSendingGmail(true);
      let token = await getAccessToken();

      if (!token) {
        onShowToast('جاري توثيق الدخول بحساب Google للإرسال عبر Gmail...');
        const authRes = await googleSignIn();
        token = authRes.accessToken;
      }

      if (!token) {
        throw new Error('لم يتم العثور على صلاحية حساب Google');
      }

      const sender = currentUserEmail || 'me';
      const result = await sendEmailViaGmailApi({
        toEmail: recipientEmail.trim(),
        recipientName: certificateData.studentName || 'المكرم',
        subject: emailSubject,
        bodyText: emailBody,
        driveLink: certificateData.driveFileWebViewLink,
        verificationCode: certificateData.verificationCode,
        senderName: certificateData.schoolName || 'منصة تقدير للشهادات'
      }, token, sender);

      if (result.success) {
        onShowToast(`تم إرسال الشهادة بنجاح إلى (${recipientEmail}) عبر Gmail! ✉️✨`);
      } else {
        throw new Error(result.error || 'فشل إرسال البريد عبر Gmail');
      }
    } catch (err: any) {
      console.error('Gmail send error:', err);
      onShowToast(err.message || 'تعذر الإرسال عبر Gmail، جاري فتح تطبيق البريد...');
      handleMailtoLaunch();
    } finally {
      setIsSendingGmail(false);
    }
  };

  // Helper to retrieve element
  const getCertElement = (): HTMLElement | null => {
    return canvasRef.current || document.getElementById('certificate-print-area');
  };

  // Trigger File Generation
  const prepareCertificateFile = async (formatType: 'png' | 'pdf'): Promise<File> => {
    if (onSetExporting) {
      onSetExporting(true);
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    try {
      const el = await findCertificateCanvasElement(canvasRef, 12, 100);

      if (formatType === 'png') {
        return await generateCertificatePngFile(el, certificateData);
      } else {
        return await generateCertificatePdfFile(el, certificateData);
      }
    } finally {
      if (onSetExporting) {
        onSetExporting(false);
      }
    }
  };

  // Web Share API Native Trigger (for direct WhatsApp / Gmail attachment)
  const handleNativeWebShare = async () => {
    setIsLoading(true);
    try {
      const file = await prepareCertificateFile(format);
      const shareTitle = activeTab === 'whatsapp' ? 'شهادة تقدير' : emailSubject;
      const shareText = activeTab === 'whatsapp' ? waMessage : emailBody;

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          files: [file]
        });
        onShowToast('تمت مشاركة ملف الشهادة بنجاح! 🎉');
      } else if (navigator.share) {
        await navigator.share({
          title: shareTitle,
          text: `${shareText}\n\nرابط الشهادة: ${window.location.href}`
        });
        onShowToast('تمت المشاركة بنجاح! 🚀');
      } else {
        throw new Error('ميزة المشاركة المباشرة غير مدعومة في متصفحك الحالي');
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Share Error:', err);
        onShowToast('تعذر إكمال المشاركة المباشرة، جاري التبديل للمحادثة...');
        if (activeTab === 'whatsapp') {
          handleWhatsAppChatLaunch();
        } else {
          handleMailtoLaunch();
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  // WhatsApp Direct Chat Link + Auto Download Attachment
  const handleWhatsAppChatLaunch = async () => {
    setIsLoading(true);
    try {
      // 1. Download file automatically so user can send it in chat
      const file = await prepareCertificateFile(format);
      const fileUrl = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = fileUrl;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(fileUrl);

      // 2. Prepare phone number
      let cleanPhone = phoneNumber.replace(/\D/g, '');
      if (cleanPhone.startsWith('0')) {
        cleanPhone = cleanPhone.slice(1);
      }
      
      let fullNumber = '';
      if (countryCode) {
        const cleanCode = countryCode.replace('+', '');
        fullNumber = `${cleanCode}${cleanPhone}`;
      } else {
        fullNumber = cleanPhone;
      }

      // 3. Launch WhatsApp URL
      const encodedMsg = encodeURIComponent(waMessage);
      let waUrl = '';
      if (fullNumber) {
        waUrl = `https://api.whatsapp.com/send?phone=${fullNumber}&text=${encodedMsg}`;
      } else {
        waUrl = `https://api.whatsapp.com/send?text=${encodedMsg}`;
      }

      window.open(waUrl, '_blank');
      onShowToast('تم تحميل الشهادة وفتح محادثة الواتساب! أرفق الشهادة المحملة بالمحادثة 📁');
    } catch (err) {
      console.error(err);
      onShowToast('حدث خطأ أثناء إعداد رابط الواتساب');
    } finally {
      setIsLoading(false);
    }
  };

  // Mailto Launcher + Auto Download
  const handleMailtoLaunch = async () => {
    setIsLoading(true);
    try {
      // 1. Download file automatically
      const file = await prepareCertificateFile(format);
      const fileUrl = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = fileUrl;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(fileUrl);

      // 2. Launch Mailto app
      const mailtoUrl = `mailto:${encodeURIComponent(recipientEmail)}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
      window.open(mailtoUrl, '_self');

      onShowToast('تم تحميل الشهادة وفتح تطبيق البريد! يمكنك سحب المرفق إلى الرسالة 📧');
    } catch (err) {
      console.error(err);
      onShowToast('حدث خطأ أثناء فتح البريد الإلكتروني');
    } finally {
      setIsLoading(false);
    }
  };

  // Download & Copy Text Helper
  const handleDownloadAndCopy = async () => {
    setIsLoading(true);
    try {
      const file = await prepareCertificateFile(format);
      const fileUrl = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = fileUrl;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(fileUrl);

      const textToCopy = activeTab === 'whatsapp' ? waMessage : emailBody;
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);

      onShowToast('تم تحميل ملف الشهادة ونسخ الرسالة للحافظة بنجاح! 📋');
    } catch (err) {
      console.error(err);
      onShowToast('تعذر تحميل الشهادة أو نسخ النص');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 text-right animate-in fade-in duration-150 overflow-y-auto">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8 my-auto">
        
        {/* Top Modal Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            {activeTab === 'whatsapp' ? (
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <Share2 className="w-5 h-5" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                <Mail className="w-5 h-5" />
              </div>
            )}
            <div>
              <h2 className="font-extrabold text-base text-slate-100 flex items-center gap-2">
                {activeTab === 'whatsapp' ? 'مشاركة الشهادة عبر WhatsApp' : 'إرسال الشهادة بالبريد الإلكتروني'}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">
                إرسال مباشر مع الملف المرفق بجودة عالية (PNG / PDF)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="bg-slate-100 p-2 border-b border-slate-200 flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab('whatsapp');
              setFormat('png');
            }}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'whatsapp'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-transparent text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Share2 className="w-4 h-4" />
            <span>مشاركة عبر WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('email');
              setFormat('pdf');
            }}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'email'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-transparent text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Mail className="w-4 h-4" />
            <span>إرسال بالبريد الإلكتروني</span>
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">

          {/* Attachment Format Selector */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
            <label className="block text-xs font-black text-slate-800 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>صيغة الشهادة المرفقة:</span>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormat('png')}
                className={`p-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                  format === 'png'
                    ? 'bg-amber-500/10 border-amber-500 text-amber-900 ring-2 ring-amber-500/30 font-black'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <ImageIcon className="w-4 h-4 text-amber-600" />
                <span>صورة PNG فائقة الجودة</span>
              </button>

              <button
                type="button"
                onClick={() => setFormat('pdf')}
                className={`p-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                  format === 'pdf'
                    ? 'bg-amber-500/10 border-amber-500 text-amber-900 ring-2 ring-amber-500/30 font-black'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <FileText className="w-4 h-4 text-emerald-600" />
                <span>ملف PDF للطباعة (A4)</span>
              </button>
            </div>
          </div>

          {/* TAB 1: WHATSAPP INPUTS */}
          {activeTab === 'whatsapp' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              
              {/* Phone & Country Code */}
              <div>
                <label className="block text-xs font-black text-slate-800 mb-1.5 flex items-center justify-between">
                  <span>رقم واتساب المستلم (اختياري للفتح المباشر):</span>
                  <span className="text-[11px] text-slate-500 font-normal">يمكن تركه فارغاً واختيار المحادثة لاحقاً</span>
                </label>

                <div className="flex gap-2">
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="px-3 py-2.5 text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 text-slate-800 shrink-0 cursor-pointer"
                  >
                    {COUNTRY_CODES.map((item, idx) => (
                      <option key={idx} value={item.code}>
                        {item.label}
                      </option>
                    ))}
                  </select>

                  <div className="relative flex-1">
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="501234567"
                      className="w-full px-3 py-2.5 pl-10 text-xs font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 text-slate-900"
                      dir="ltr"
                    />
                    <PhoneCall className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  </div>
                </div>
              </div>

              {/* Message Body */}
              <div>
                <label className="block text-xs font-black text-slate-800 mb-1.5">
                  نص الرسالة المرفقة مع الشهادة:
                </label>
                <textarea
                  value={waMessage}
                  onChange={(e) => setWaMessage(e.target.value)}
                  rows={3}
                  className="w-full p-3 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 text-slate-800 leading-relaxed font-medium"
                />
              </div>

            </div>
          )}

          {/* TAB 2: EMAIL INPUTS */}
          {activeTab === 'email' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              
              {/* Connected Google Account Header */}
              {currentUserEmail ? (
                <div className="bg-indigo-50/80 border border-indigo-200 p-2.5 rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="text-slate-700">الإرسال بالحساب المعتمد:</span>
                    <strong className="text-indigo-900 font-mono">{currentUserEmail}</strong>
                  </div>
                  <span className="bg-indigo-200/60 text-indigo-900 font-bold px-2 py-0.5 rounded-full text-[10px]">
                    Gmail API ⚡
                  </span>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-xl flex items-center justify-between text-xs">
                  <span className="text-amber-900">يمكنك الإرسال مباشرة عبر حساب Gmail بنقرة واحدة</span>
                  <span className="text-[10px] text-amber-700 font-bold">تسجيل الدخول يتيح الإرسال الفوري</span>
                </div>
              )}

              {/* Recipient Email */}
              <div>
                <label className="block text-xs font-black text-slate-800 mb-1.5">
                  البريد الإلكتروني للمستلم (الطالب أو ولي الأمر):
                </label>
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="student@school.edu.sa"
                  className="w-full px-3.5 py-2.5 text-xs font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900"
                  dir="ltr"
                />
              </div>

              {/* Email Subject */}
              <div>
                <label className="block text-xs font-black text-slate-800 mb-1.5">
                  موضوع الرسالة (Subject):
                </label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900"
                />
              </div>

              {/* Email Body */}
              <div>
                <label className="block text-xs font-black text-slate-800 mb-1.5">
                  محتوى الرسالة (Message Body):
                </label>
                <textarea
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  rows={4}
                  className="w-full p-3 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-800 leading-relaxed font-medium"
                />
              </div>

            </div>
          )}

          {/* User Tip Box */}
          <div className="bg-amber-50 p-3 rounded-xl border border-amber-200/80 flex items-start gap-2.5 text-amber-900 text-xs">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              {activeTab === 'email' ? (
                <span><strong>إرسال مباشر عبر Gmail:</strong> يتم إرسال بريد رسمي منسق يتضمن بيانات الطالب ورابط التوثيق والباركود مباشرة إلى صندوق الوارد الخاص به.</span>
              ) : (
                <span><strong>تلميح:</strong> خيار <strong>"مشاركة المرفق مباشرة"</strong> يفتح لك النافذة المباشرة للجوال أو الكمبيوتر لتحديد التطبيق وإرسال ملف الشهادة ({format.toUpperCase()}) كمرفق حقيقي مباشرة.</span>
              )}
            </p>
          </div>

        </div>

        {/* Modal Footer & Primary Actions */}
        <div className="bg-slate-50 p-5 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition cursor-pointer"
          >
            إلغاء
          </button>

          <div className="w-full sm:w-auto flex flex-wrap sm:flex-nowrap items-center gap-2">
            
            {/* Direct Gmail Send Action */}
            {activeTab === 'email' && (
              <button
                type="button"
                onClick={handleSendViaGmail}
                disabled={isSendingGmail || isLoading}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:brightness-110 text-white font-extrabold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-60"
                title="إرسال فوري عبر حساب Google المرتبط (Gmail API)"
              >
                {isSendingGmail ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>جاري الإرسال عبر Gmail...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>إرسال فوري عبر Gmail ✉️</span>
                  </>
                )}
              </button>
            )}
            
            {/* Action 1: Native Web Share (Direct Attachment File Share) */}
            <button
              type="button"
              onClick={handleNativeWebShare}
              disabled={isLoading}
              className={`w-full sm:w-auto px-4 py-2.5 rounded-xl font-extrabold text-xs text-white shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-60 ${
                activeTab === 'whatsapp'
                  ? 'bg-emerald-600 hover:bg-emerald-500'
                  : 'bg-indigo-600 hover:bg-indigo-500'
              }`}
              title="إرسال مباشر وتلقائي مع إرفاق الملف كـ PNG أو PDF"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Share2 className="w-4 h-4" />
              )}
              <span>مشاركة المرفق مباشرة 📱</span>
            </button>

            {/* Action 2: App Launch (WhatsApp Chat or Mailto) */}
            {activeTab === 'whatsapp' ? (
              <button
                type="button"
                onClick={handleWhatsAppChatLaunch}
                disabled={isLoading}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-emerald-400 font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-60"
                title="تحميل الشهادة وتوجيهك لمحادثة الواتساب"
              >
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                <span>فتح الواتساب 💬</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleMailtoLaunch}
                disabled={isLoading}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-indigo-300 font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-60"
                title="تحميل الشهادة وفتح برنامج البريد بالإعدادات الجاهزة"
              >
                <Mail className="w-4 h-4 text-indigo-400" />
                <span>فتح البريد ✉️</span>
              </button>
            )}

            {/* Action 3: Download & Copy Helper */}
            <button
              type="button"
              onClick={handleDownloadAndCopy}
              disabled={isLoading}
              className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-60"
              title="حفظ الشهادة للجهاز ونسخ نص الرسالة"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>تم النُسخ!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-600" />
                  <span>تحميل ونسخ النص</span>
                </>
              )}
            </button>

          </div>
        </div>

      </div>
    </div>
  );
};
