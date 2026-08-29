import React, { useState, useEffect } from 'react';
import { CertificateData } from '../types';
import {
  googleSignIn,
  googleSignOut,
  initDriveAuth,
  uploadCertificateToDrive,
  getAccessToken,
  clearAccessToken
} from '../services/googleDriveService';
import { generateVerificationCode } from '../utils/qrUtils';
import { User } from 'firebase/auth';
import {
  Cloud,
  CheckCircle2,
  X,
  ExternalLink,
  Copy,
  Check,
  AlertCircle,
  Loader2,
  HardDrive,
  Database,
  ArrowRight,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { captureCertificateCanvas, findCertificateCanvasElement } from '../utils/exportUtils';
import { GoogleInFrameButton } from './GoogleInFrameButton';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  certificateData: CertificateData;
  onUpdateCertificateData: (updated: Partial<CertificateData>) => void;
  canvasRef?: React.RefObject<HTMLDivElement | null>;
  onSetExporting?: (exporting: boolean) => void;
  onSaveCloudWithoutDrive?: () => void;
}

export const GoogleDriveSaveModal: React.FC<Props> = ({
  isOpen,
  onClose,
  certificateData,
  onUpdateCertificateData,
  canvasRef,
  onSetExporting,
  onSaveCloudWithoutDrive
}) => {
  const [saveMode, setSaveMode] = useState<'cloud-only' | 'google-drive'>('cloud-only');
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSavingCloudOnly, setIsSavingCloudOnly] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [cloudOnlySuccess, setCloudOnlySuccess] = useState(false);
  const [driveUrl, setDriveUrl] = useState<string>(certificateData.driveFileWebViewLink || '');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      setCloudOnlySuccess(false);
      setUploadSuccess(!!certificateData.driveFileWebViewLink);
      setDriveUrl(certificateData.driveFileWebViewLink || '');

      // Default mode: if already uploaded to Drive, open drive tab, else start on cloud-only tab
      if (certificateData.driveFileWebViewLink) {
        setSaveMode('google-drive');
      } else {
        setSaveMode('cloud-only');
      }

      const unsubscribe = initDriveAuth(
        (u, tok) => {
          setUser(u);
          setToken(tok);
        },
        () => {
          setUser(null);
          setToken(null);
        }
      );
      return () => unsubscribe();
    }
  }, [isOpen, certificateData]);

  if (!isOpen) return null;

  const handleSaveCloudOnly = () => {
    try {
      setIsSavingCloudOnly(true);
      setErrorMsg(null);

      const certId = certificateData.id && certificateData.id.startsWith('cloud-')
        ? certificateData.id
        : `cloud-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

      const vCode = certificateData.verificationCode || generateVerificationCode();

      const updatedFields: Partial<CertificateData> = {
        id: certId,
        verificationCode: vCode,
        isSavedCloud: true,
        updatedAt: new Date().toISOString(),
        qrCodeData: `${window.location.origin}/verify?code=${vCode}`
      };

      if (!certificateData.driveFileWebViewLink) {
        updatedFields.driveFileId = undefined;
        updatedFields.driveFileWebViewLink = undefined;
        updatedFields.driveFileUrl = undefined;
        updatedFields.driveUploadedAt = undefined;
      }

      const fullUpdatedCert: CertificateData = {
        ...certificateData,
        ...updatedFields
      };

      onUpdateCertificateData(updatedFields);

      // Save into local storage cloud library list
      const local = localStorage.getItem('taqdeer_saved_certs');
      let saved: CertificateData[] = [];
      if (local) {
        try { saved = JSON.parse(local); } catch (e) { console.error(e); }
      }
      const filtered = saved.filter(c => c.id !== fullUpdatedCert.id && c.verificationCode !== fullUpdatedCert.verificationCode);
      localStorage.setItem('taqdeer_saved_certs', JSON.stringify([fullUpdatedCert, ...filtered]));

      if (onSaveCloudWithoutDrive) {
        onSaveCloudWithoutDrive();
      }

      setCloudOnlySuccess(true);
    } catch (err: any) {
      console.error('Save cloud only error:', err);
      setErrorMsg('حدث خطأ أثناء حفظ الشهادة بالسحابة.');
    } finally {
      setIsSavingCloudOnly(false);
    }
  };

const handleLogin = () => {
  setIsLoggingIn(true);
  setErrorMsg(null);

  // استدعاء الفتح فوراً عند الضغط دون await قبله
  googleSignIn()
    .then((res) => {
      setUser(res.user);
      setToken(res.accessToken);
    })
    .catch((err: any) => {
      if (
        err.code === 'auth/popup-closed-by-user' ||
        err.code === 'auth/cancelled-popup-request' ||
        err.message?.includes('تم إلغاء')
      ) {
        setErrorMsg('تم إلغاء نافذة تسجيل الدخول.');
      } else if (err.code === 'auth/popup-blocked') {
        setErrorMsg('تعذر فتح نافذة تسجيل الدخول. يرجى السماح بالنوافذ المنبثقة (Popups) من إعدادات المتصفح.');
      } else {
        console.error('Login error:', err);
        setErrorMsg(err.message || 'حدث خطأ أثناء تسجيل الدخول بـ Google');
      }
    })
    .finally(() => {
      setIsLoggingIn(false);
    });
};

  const handleSignOut = async () => {
    await googleSignOut();
    setUser(null);
    setToken(null);
  };

  const handleUploadToDrive = async () => {
    let activeToken = token;
    if (!activeToken) {
      activeToken = await getAccessToken();
    }

    if (!activeToken) {
      try {
        setIsLoggingIn(true);
        const res = await googleSignIn();
        setUser(res.user);
        setToken(res.accessToken);
        activeToken = res.accessToken;
      } catch (authErr: any) {
        if (authErr.code === 'auth/popup-closed-by-user' || authErr.code === 'auth/cancelled-popup-request' || authErr.message?.includes('تم إلغاء')) {
          setErrorMsg('تم إلغاء تسجيل الدخول.');
        } else {
          setErrorMsg('انتهت صلاحية جلسة Google Drive. يرجى إعادة تسجيل الدخول لمتابعة الرفع.');
        }
        setToken(null);
        clearAccessToken();
        setIsLoggingIn(false);
        return;
      } finally {
        setIsLoggingIn(false);
      }
    }

    setIsUploading(true);
    setErrorMsg(null);

    try {
      if (onSetExporting) {
        onSetExporting(true);
      }

      if (document.fonts) {
        await document.fonts.ready;
      }

      // Wait 250ms for React re-render so scale transform, input controls & UI drag handles are cleanly stripped
      await new Promise((resolve) => setTimeout(resolve, 250));

      // Get canvas element with robust fallback search
      const elementToCapture = await findCertificateCanvasElement(canvasRef, 15, 100);

      // Render canvas with exact mathematical proportions
      const canvas = await captureCertificateCanvas(
        elementToCapture as HTMLElement,
        certificateData,
        { scale: 2.8 }
      );

      const blob: Blob = await new Promise((resolve, reject) => {
        canvas.toBlob((b) => {
          if (b) resolve(b);
          else reject(new Error('فشل إنشاء صورة الشهادة'));
        }, 'image/png', 0.98);
      });

      const cleanStudentName = certificateData.studentName.replace(/[^\w\s\u0600-\u06FF-]/gi, '').trim();
      const fileName = `شهادة_تقدير_${cleanStudentName || 'طالب'}_${certificateData.verificationCode || 'TAQDEER'}.png`;

      let driveRes;
      try {
        driveRes = await uploadCertificateToDrive(
          blob,
          fileName,
          activeToken,
          certificateData.driveFileId
        );
      } catch (uploadErr: any) {
        if (uploadErr.message?.includes('انتهت صلاحية') || uploadErr.message?.includes('401')) {
          setToken(null);
          clearAccessToken();
          console.warn('Google Drive token expired. Re-authenticating...');
          try {
            const authRes = await googleSignIn();
            setUser(authRes.user);
            setToken(authRes.accessToken);
            driveRes = await uploadCertificateToDrive(
              blob,
              fileName,
              authRes.accessToken,
              certificateData.driveFileId
            );
          } catch (retryAuthErr: any) {
            if (retryAuthErr.code === 'auth/popup-closed-by-user' || retryAuthErr.code === 'auth/cancelled-popup-request' || retryAuthErr.message?.includes('تم إلغاء')) {
              setErrorMsg('تم إلغاء عملية تسجيل الدخول مع Google.');
            } else {
              setErrorMsg('فشلت إعادة المصادقة مع Google Drive.');
            }
            return;
          }
        } else {
          throw uploadErr;
        }
      }

      // Update certificate data
      const certId = certificateData.id && certificateData.id.startsWith('cloud-')
        ? certificateData.id
        : `cloud-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

      const updatedFields: Partial<CertificateData> = {
        id: certId,
        isSavedCloud: true,
        driveFileId: driveRes.fileId,
        driveFileWebViewLink: driveRes.webViewLink,
        driveFileUrl: driveRes.webContentLink,
        driveUploadedAt: new Date().toISOString(),
        qrCodeData: driveRes.webViewLink, // QR Code links directly to Google Drive download/view
      };

      const fullUpdatedCert: CertificateData = {
        ...certificateData,
        ...updatedFields
      };

      onUpdateCertificateData(updatedFields);

      // Save into local storage cloud library list
      const local = localStorage.getItem('taqdeer_saved_certs');
      let saved: CertificateData[] = [];
      if (local) {
        try { saved = JSON.parse(local); } catch (e) { console.error(e); }
      }
      const filtered = saved.filter(c => c.id !== fullUpdatedCert.id && c.verificationCode !== fullUpdatedCert.verificationCode);
      localStorage.setItem('taqdeer_saved_certs', JSON.stringify([fullUpdatedCert, ...filtered]));

      setDriveUrl(driveRes.webViewLink);
      setUploadSuccess(true);
    } catch (err: any) {
      console.error('Upload to Drive error:', err);
      if (err.message?.includes('انتهت صلاحية') || err.message?.includes('401')) {
        setToken(null);
        clearAccessToken();
      }
      setErrorMsg(err.message || 'حدث خطأ أثناء رفع الشهادة إلى Google Drive');
    } finally {
      if (onSetExporting) {
        onSetExporting(false);
      }
      setIsUploading(false);
    }
  };

  const handleCopyLink = () => {
    if (!driveUrl) return;
    navigator.clipboard.writeText(driveUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/80 backdrop-blur-sm p-0 sm:p-4 font-['Cairo']">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[92dvh] sm:max-h-[90vh] flex flex-col overflow-hidden text-right animate-in fade-in zoom-in-95 duration-200">
        
        {/* Mobile Swipe / Drag Indicator Bar */}
        <div className="pt-2.5 pb-1 bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 sm:hidden shrink-0">
          <div className="w-12 h-1 bg-amber-200/50 rounded-full mx-auto" />
        </div>

        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 text-white p-4 sm:p-6 relative border-b border-slate-800 shrink-0">
          <button
            onClick={onClose}
            className="absolute top-3.5 left-3.5 sm:top-5 sm:left-5 p-2 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-full transition cursor-pointer"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 pr-1">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 shadow-md shrink-0">
              <Cloud className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <div className="min-w-0 pr-1">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <h3 className="text-base sm:text-lg font-black truncate">خيارات الحفظ السحابي</h3>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-bold whitespace-nowrap">
                  مكتبة + Google Drive
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5 leading-tight">
                اختر الحفظ بالسحابة في المكتبة أو الرفع المباشر لـ Google Drive
              </p>
            </div>
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div className="px-4 sm:px-6 pt-3 sm:pt-4 shrink-0 bg-white">
          <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 gap-1">
            <button
              type="button"
              onClick={() => { setSaveMode('cloud-only'); setErrorMsg(null); }}
              className={`flex-1 py-2 sm:py-2.5 px-2 sm:px-3 rounded-xl font-bold text-[11px] sm:text-xs transition flex items-center justify-center gap-1.5 cursor-pointer ${
                saveMode === 'cloud-only'
                  ? 'bg-sky-600 text-white shadow-sm font-extrabold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Cloud className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="truncate">حفظ بالمكتبة (بدون Drive)</span>
            </button>

            <button
              type="button"
              onClick={() => { setSaveMode('google-drive'); setErrorMsg(null); }}
              className={`flex-1 py-2 sm:py-2.5 px-2 sm:px-3 rounded-xl font-bold text-[11px] sm:text-xs transition flex items-center justify-center gap-1.5 cursor-pointer ${
                saveMode === 'google-drive'
                  ? 'bg-amber-500 text-slate-950 shadow-sm font-extrabold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <HardDrive className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="truncate">رفع على Google Drive</span>
            </button>
          </div>
        </div>

        {/* Content Body: Smooth Touch Scrollable Up & Down */}
        <div className="p-4 sm:p-6 space-y-4 flex-1 overflow-y-auto overscroll-contain touch-pan-y">

          {/* Certificate Info Card */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs space-y-1.5">
            <div className="flex justify-between items-center text-slate-600">
              <span className="shrink-0 ml-2">اسم الشهادة:</span>
              <strong className="text-slate-900 truncate text-left">{certificateData.title}</strong>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span className="shrink-0 ml-2">اسم المكرّم:</span>
              <strong className="text-amber-700 truncate text-left">{certificateData.studentName}</strong>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span className="shrink-0 ml-2">كود التوثيق:</span>
              <strong className="font-mono text-indigo-700 dir-ltr">{certificateData.verificationCode || 'سيتولّد تلقائياً'}</strong>
            </div>
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs flex flex-col gap-2.5">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                <span className="font-medium leading-snug">{errorMsg}</span>
              </div>
              {saveMode === 'google-drive' && (errorMsg.includes('انتهت صلاحية') || errorMsg.includes('401') || !token) && (
                <button
                  onClick={handleLogin}
                  disabled={isLoggingIn}
                  className="w-full py-2.5 px-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  {isLoggingIn ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري تجديد الجلسة...</span>
                    </>
                  ) : (
                    <>
                      <Cloud className="w-4 h-4" />
                      <span>إعادة تسجيل الدخول بـ Google لتجديد الجلسة</span>
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* MODE 1: CLOUD ONLY (Without Drive) */}
          {saveMode === 'cloud-only' && (
            <div className="space-y-4">
              <div className="bg-sky-50 border border-sky-200 p-3.5 sm:p-4 rounded-2xl space-y-2 text-right">
                <div className="flex items-center gap-2 text-sky-950 font-bold text-xs">
                  <Database className="w-4 h-4 text-sky-600 shrink-0" />
                  <span>الحفظ في المكتبة السحابية (التخزين السريع)</span>
                </div>
                <p className="text-[11px] text-sky-800 leading-relaxed">
                  سيتم حفظ كافة بيانات الشهادة والتعديلات في مكتبتك السحابية بالتطبيق للوصول إليها وتعديلها وطباعتها في أي وقت دون الحاجة لربط حساب Google Drive.
                </p>
              </div>

              {cloudOnlySuccess ? (
                <div className="bg-emerald-50 border border-emerald-300 p-3.5 sm:p-4 rounded-2xl space-y-3 text-right">
                  <div className="flex items-center gap-2 text-emerald-950 font-black text-xs">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>تم حفظ الشهادة بالسحابة في مكتبتك بنجاح! ☁️✨</span>
                  </div>
                  <p className="text-[11px] text-emerald-800 leading-relaxed">
                    يمكنك الآن العودة للتصميم أو فتح قسم "المكتبة السحابية" لاستعراض الشهادة. كما يمكنك أيضاً رفعها على Google Drive في أي وقت.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setSaveMode('google-drive')}
                      className="flex-1 py-2.5 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl text-center flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <HardDrive className="w-4 h-4" />
                      <span>الترقية للرفع على Google Drive</span>
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleSaveCloudOnly}
                  disabled={isSavingCloudOnly}
                  className="w-full py-3.5 px-4 bg-sky-600 hover:bg-sky-500 text-white font-black text-xs sm:text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSavingCloudOnly ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>جاري حفظ الشهادة بالسحابة...</span>
                    </>
                  ) : certificateData.isSavedCloud ? (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      <span>تحديث نسخة الشهادة بالمكتبة السحابية</span>
                    </>
                  ) : (
                    <>
                      <Cloud className="w-5 h-5" />
                      <span>حفظ الشهادة بالمكتبة السحابية الآن (بدون Drive)</span>
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* MODE 2: GOOGLE DRIVE (With Drive Upload) */}
          {saveMode === 'google-drive' && (
            <div className="space-y-4">
              {/* User Account Bar */}
              {user ? (
                <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-2xl flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt={user.displayName || 'Google Account'} className="w-8 h-8 rounded-full border-2 border-emerald-500 shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
                        {user.email?.[0].toUpperCase() || 'G'}
                      </div>
                    )}
                    <div className="min-w-0">
                      <span className="block text-xs font-bold text-slate-900 truncate">
                        {user.displayName || user.email}
                      </span>
                      <span className="block text-[10px] text-emerald-700 font-medium truncate">
                        متصل بحساب Google ✅
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="text-[11px] text-slate-500 hover:text-red-600 font-bold underline px-2 py-1 transition cursor-pointer shrink-0"
                  >
                    تبديل
                  </button>
                </div>
              ) : (
                <div className="bg-amber-50/80 border border-amber-200 p-3.5 rounded-2xl text-center space-y-2.5">
                  <p className="text-xs text-amber-900 font-medium leading-relaxed">
                    قم بتسجيل الدخول باستخدام حساب Google لرفع صورة الشهادة عالية الدقة إلى Google Drive وتفعيل رابط التوثيق المباشر للباركود.
                  </p>

                  <div className="bg-white/80 p-2.5 rounded-xl border border-amber-300/60">
                    <GoogleInFrameButton
                      onSuccess={(res) => {
                        setUser(res.user);
                        setToken(res.accessToken);
                        setErrorMsg(null);
                      }}
                      onError={(err) => {
                        console.warn('In-frame login note:', err);
                      }}
                      theme="filled_blue"
                      size="large"
                      text="signin_with"
                      shape="rectangular"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleLogin}
                    disabled={isLoggingIn}
                    className="w-full py-2 px-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl font-bold text-[11px] shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isLoggingIn ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                        <span>جاري الاتصال بـ Google...</span>
                      </>
                    ) : (
                      <>
                        <span>أو فتح نافذة تسجيل الدخول المنفصلة</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Action Button */}
              {user && (
                <button
                  type="button"
                  onClick={handleUploadToDrive}
                  disabled={isUploading}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>جاري توليد الصورة ورفعها لـ Google Drive...</span>
                    </>
                  ) : uploadSuccess ? (
                    <>
                      <HardDrive className="w-5 h-5 shrink-0" />
                      <span>إعادة رفع / تحديث الشهادة على Google Drive</span>
                    </>
                  ) : (
                    <>
                      <HardDrive className="w-5 h-5 shrink-0" />
                      <span>حفظ ورفع الشهادة وتفعيل رابط Google Drive</span>
                    </>
                  )}
                </button>
              )}

              {/* Upload Success View */}
              {uploadSuccess && driveUrl && (
                <div className="bg-emerald-50 border border-emerald-300 p-3.5 sm:p-4 rounded-2xl space-y-3 text-right">
                  <div className="flex items-center gap-2 text-emerald-950 font-black text-xs sm:text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>تم حفظ الشهادة بنجاح على Google Drive! ☁️🎉</span>
                  </div>
                  <p className="text-[11px] text-emerald-800 leading-relaxed">
                    أصبح باركود QR الخاص بهذه الشهادة يوجه الآن مباشرة إلى رابط التحقق والتحميل الأصلي على Google Drive.
                  </p>

                  <div className="bg-white p-2.5 rounded-xl border border-emerald-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                    <span className="text-[11px] font-mono text-slate-700 truncate dir-ltr text-center sm:text-left">{driveUrl}</span>
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition flex items-center justify-center gap-1 shrink-0 cursor-pointer"
                    >
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'تم النسخ!' : 'نسخ الرابط'}</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <a
                      href={driveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl text-center flex items-center justify-center gap-1.5 transition"
                    >
                      <ExternalLink className="w-4 h-4 text-amber-400" />
                      <span>فتح الشهادة في Google Drive</span>
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="bg-slate-50 p-3.5 sm:p-4 border-t border-slate-200 flex justify-between items-center text-xs shrink-0">
          <span className="text-slate-500 font-medium text-[11px] sm:text-xs">نظام التوثيق والمكتبة السحابية</span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 sm:py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition cursor-pointer"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
};
