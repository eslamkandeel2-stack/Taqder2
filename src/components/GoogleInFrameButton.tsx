import React, { useEffect, useRef, useState } from 'react';
import { User } from 'firebase/auth';
import { renderInFrameGoogleButton, googleSignIn } from '../services/googleDriveService';
import { Loader2, LogIn } from 'lucide-react';

interface GoogleInFrameButtonProps {
  onSuccess: (res: { user: User; accessToken: string }) => void;
  onError?: (err: any) => void;
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'large' | 'medium' | 'small';
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  shape?: 'rectangular' | 'pill' | 'circle' | 'square';
  className?: string;
}

export const GoogleInFrameButton: React.FC<GoogleInFrameButtonProps> = ({
  onSuccess,
  onError,
  theme = 'filled_blue',
  size = 'large',
  text = 'signin_with',
  shape = 'rectangular',
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isRendered, setIsRendered] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [fallbackMode, setFallbackMode] = useState(false);

  useEffect(() => {
    let cleanupFn: (() => void) | undefined;
    let isMounted = true;

    const setupButton = async () => {
      if (!containerRef.current) return;
      try {
        setIsLoading(true);
        cleanupFn = await renderInFrameGoogleButton(
          containerRef.current,
          (result) => {
            if (isMounted) {
              setIsLoading(false);
              onSuccess(result);
            }
          },
          (err) => {
            console.warn('Google in-frame button rendering warning:', err);
            if (isMounted) {
              setFallbackMode(true);
              setIsLoading(false);
              if (onError) onError(err);
            }
          },
          {
            theme,
            size,
            text,
            shape,
            locale: 'ar'
          }
        );
        if (isMounted) {
          setIsRendered(true);
          setIsLoading(false);
        }
      } catch (err) {
        console.warn('Failed to render in-frame Google button:', err);
        if (isMounted) {
          setFallbackMode(true);
          setIsLoading(false);
        }
      }
    };

    setupButton();

    return () => {
      isMounted = false;
      if (cleanupFn) {
        cleanupFn();
      }
    };
  }, [theme, size, text, shape]);

  const handleManualFallbackClick = async () => {
    try {
      setIsLoading(true);
      const res = await googleSignIn();
      onSuccess(res);
    } catch (err: any) {
      if (onError) onError(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`w-full flex flex-col items-center justify-center min-h-[44px] ${className}`}>
      {/* Target container for Google's native in-frame iframe button */}
      <div 
        ref={containerRef} 
        id="google-inframe-signin-container"
        className={`w-full flex justify-center items-center overflow-hidden transition-all ${
          fallbackMode ? 'hidden' : 'block'
        }`}
      />

      {/* Fallback button if script is loading or blocked by adblockers */}
      {fallbackMode && (
        <button
          type="button"
          onClick={handleManualFallbackClick}
          disabled={isLoading}
          className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 text-slate-950 font-black text-xs rounded-xl transition shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>جاري تسجيل الدخول...</span>
            </>
          ) : (
            <>
              <LogIn className="w-4 h-4" />
              <span>تسجيل الدخول بحساب Google</span>
            </>
          )}
        </button>
      )}

      {isLoading && !isRendered && !fallbackMode && (
        <div className="flex items-center gap-2 text-xs text-amber-300/80 py-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>جاري تهيئة زر الدخول الآمن المدمج...</span>
        </div>
      )}
    </div>
  );
};
