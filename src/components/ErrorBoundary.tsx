import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ShieldAlert, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public override state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    const msg = error?.message || String(error);
    if (msg.includes('$$typeof') || msg.includes('cross-origin frame') || msg.includes('Blocked a frame')) {
      return { hasError: false, error: null };
    }
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const msg = error?.message || String(error);
    if (msg.includes('$$typeof') || msg.includes('cross-origin frame') || msg.includes('Blocked a frame')) {
      return;
    }
    console.error('Uncaught error in component tree:', error, errorInfo);
  }

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6 text-right font-['Cairo',sans-serif]">
          <div className="max-w-md w-full bg-slate-900 border border-amber-500/30 rounded-3xl p-6 shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 bg-amber-500/20 text-amber-400 rounded-2xl flex items-center justify-center mx-auto border border-amber-500/30">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-black text-white">حدث تنبيه غير متوقع أثناء المعالجة</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              يرجى إعادة تحميل الصفحة أو تحديث المحتوى للمتابعة بسلاسة دون فقدان بياناتك المحفوظة.
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>إعادة تحميل المنظومة</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
