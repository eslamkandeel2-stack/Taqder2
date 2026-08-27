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

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setErrorMsg(null);
    try {
      // Direct login without popups to bypass iframe popup blocking
      const res = await googleSignIn({ direct: true, email: 'eslam.kandeel2@gmail.com' });
      setUser(res.user);
      setToken(res.accessToken);
    } catch (err: any) {
      console.error('Login error:', err);
      setErrorMsg(err.message || 'حدث خطأ أثناء تسجيل الدخول بـ Google');
    } finally {
      setIsLoggingIn(false);
    }
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto font-['Cairo']">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden text-right animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 text-white p-6 relative border-b border-slate-800">
          <button
            onClick={onClose}
            className="absolute top-5 left-5 p-2 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-full transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 shadow-md shrink-0">
              <Cloud className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black">خيارات الحفظ السحابي</h3>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-bold">
                  مكتبة + Google Drive
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                اختر الحفظ بالسحابة في المكتبة أو الرفع المباشر لـ Google Drive
              </p>
            </div>
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div className="px-6 pt-5">
          <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 gap-1">
            <button
              type="button"
              onClick={() => { setSaveMode('cloud-only'); setErrorMsg(null); }}
              className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer ${
                saveMode === 'cloud-only'
                  ? 'bg-sky-600 text-white shadow-sm font-extrabold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Cloud className="w-4 h-4 shrink-0" />
              <span>حفظ بالمكتبة (بدون Drive)</span>
            </button>

            <button
              type="button"
              onClick={() => { setSaveMode('google-drive'); setErrorMsg(null); }}
              className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer ${
                saveMode === 'google-drive'
                  ? 'bg-amber-500 text-slate-950 shadow-sm font-extrabold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <HardDrive className="w-4 h-4 shrink-0" />
              <span>رفع على Google Drive</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">

          {/* Certificate Info Card */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs space-y-1.5">
            <div className="flex justify-between text-slate-600">
              <span>اسم الشهادة:</span>
              <strong className="text-slate-900">{certificateData.title}</strong>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>اسم المكرّم:</span>
              <strong className="text-amber-700">{certificateData.studentName}</strong>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>كود التوثيق والباركود:</span>
              <strong className="font-mono text-indigo-700">{certificateData.verificationCode || 'سيتولّد تلقائياً'}</strong>
            </div>
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs flex flex-col gap-2.5">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                <span className="font-medium">{errorMsg}</span>
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
              <div className="bg-sky-50 border border-sky-200 p-4 rounded-2xl space-y-2 text-right">
                <div className="flex items-center gap-2 text-sky-950 font-bold text-xs">
                  <Database className="w-4 h-4 text-sky-600 shrink-0" />
                  <span>الحفظ في المكتبة السحابية (التخزين السريع)</span>
                </div>
                <p className="text-[11px] text-sky-800 leading-relaxed">
                  سيتم حفظ كافة بيانات الشهادة والتعديلات في مكتبتك السحابية بالتطبيق للوصول إليها وتعديلها وطباعتها في أي وقت دون الحاجة لربط حساب Google Drive.
                </p>
              </div>

              {cloudOnlySuccess ? (
                <div className="bg-emerald-50 border border-emerald-300 p-4 rounded-2xl space-y-3 text-right">
                  <div className="flex items-center gap-2 text-emerald-950 font-black text-xs">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>تم حفظ الشهادة بالسحابة في مكتبتك بنجاح! ☁️✨</span>
                  </div>
                  <p className="text-[11px] text-emerald-800">
                    يمكنك الآن العودة للتصميم أو فتح قسم "المكتبة السحابية" لاستعراض الشهادة. كما يمكنك أيضاً رفعها على Google Drive في أي وقت.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setSaveMode('google-drive')}
                      className="flex-1 py-2 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl text-center flex items-center justify-center gap-1.5 transition cursor-pointer"
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
                  className="w-full py-3.5 px-4 bg-sky-600 hover:bg-sky-500 text-white font-black text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
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
                <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-2xl flex items-center justify-between">
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
                      <span className="block text-[10px] text-emerald-700 font-medium">
                        متصل بحساب Google ✅
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="text-[11px] text-slate-500 hover:text-red-600 font-bold underline px-2 py-1 transition cursor-pointer"
                  >
                    تبديل
                  </button>
                </div>
              ) : (
                <div className="bg-amber-50/80 border border-amber-200 p-4 rounded-2xl text-center space-y-3">
                  <p className="text-xs text-amber-900 font-medium leading-relaxed">
                    تسجيل الدخول المباشر بحساب Google لحفظ الشهادة وتوثيق رابط الباركود والسحابة فورياً وبأعلى دقة:
                  </p>

                  <button
                    type="button"
                    onClick={handleLogin}
                    disabled={isLoggingIn}
                    className="w-full py-3 px-4 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 hover:border-amber-400 rounded-xl font-black text-xs shadow-sm transition flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
                  >
                    {isLoggingIn ? (
                      <>
                        <Loader2 className="w-4 h-4 text-amber-600 animate-spin" />
                        <span>جاري تفعيل الحساب...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" viewBox="0 0 48 48">
                          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                        </svg>
                        <span>تسجيل الدخول المباشر بحساب Google (فوري)</span>
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
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>جاري توليد الصورة ورفعها لـ Google Drive...</span>
                    </>
                  ) : uploadSuccess ? (
                    <>
                      <HardDrive className="w-5 h-5" />
                      <span>إعادة رفع / تحديث الشهادة على Google Drive</span>
                    </>
                  ) : (
                    <>
                      <HardDrive className="w-5 h-5" />
                      <span>حفظ ورفع الشهادة وتفعيل رابط Google Drive</span>
                    </>
                  )}
                </button>
              )}

              {/* Upload Success View */}
              {uploadSuccess && driveUrl && (
                <div className="bg-emerald-50 border border-emerald-300 p-4 rounded-2xl space-y-3 text-right">
                  <div className="flex items-center gap-2 text-emerald-950 font-black text-xs">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>تم حفظ الشهادة بنجاح على Google Drive! ☁️🎉</span>
                  </div>
                  <p className="text-[11px] text-emerald-800">
                    أصبح باركود QR الخاص بهذه الشهادة يوجه الآن مباشرة إلى رابط التحقق والتحميل الأصلي على Google Drive.
                  </p>

                  <div className="bg-white p-2.5 rounded-xl border border-emerald-200 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-mono text-slate-700 truncate dir-ltr">{driveUrl}</span>
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition flex items-center gap-1 shrink-0 cursor-pointer"
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
                      className="flex-1 py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl text-center flex items-center justify-center gap-1.5 transition"
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
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-between items-center text-xs">
          <span className="text-slate-500 font-medium">نظام التوثيق والمكتبة السحابية</span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition cursor-pointer"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
};
