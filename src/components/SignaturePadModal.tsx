import React, { useRef, useState, useEffect } from 'react';
import { SignatureItem } from '../types';
import { PenTool, Type, Upload, Trash2, Check, X, RotateCcw, Palette, Sliders } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaveSignature: (signature: SignatureItem) => void;
  existingSignature?: SignatureItem | null;
}

export const SignaturePadModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSaveSignature,
  existingSignature
}) => {
  const [activeTab, setActiveTab] = useState<'draw' | 'type' | 'upload'>('draw');
  const [signeeName, setSigneeName] = useState('');
  const [signeeTitle, setSigneeTitle] = useState('');
  const [typedText, setTypedText] = useState('');
  const [typedFont, setTypedFont] = useState<string>('Aref Ruqaa');
  const [signatureInkColor, setSignatureInkColor] = useState<string>('#1e3a8a');
  const [uploadedImageUrl, setUploadedImageUrl] = useState('');
  
  // Canvas Ref for drawing
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [penColor, setPenColor] = useState('#1e3a8a');
  const [penWidth, setPenWidth] = useState(3);

  const INK_PRESETS = [
    { id: '#0f172a', label: 'أسود داكن' },
    { id: '#1e3a8a', label: 'كحلي رسميات' },
    { id: '#2563eb', label: 'أزرق ملكي' },
    { id: '#047857', label: 'أخضر زمردي' },
    { id: '#b45309', label: 'ذهبي فاخر' },
    { id: '#881337', label: 'عنابي ملكي' },
    { id: '#4c1d95', label: 'بنفسجي داكن' },
  ];

  const FONT_OPTIONS = [
    { id: 'Aref Ruqaa', name: 'خط الرقعة الأصيل', fontCss: "font-['Aref_Ruqaa',serif]", category: 'رقعة', preview: 'د. خالد العصيمي' },
    { id: 'Aref Ruqaa Ink', name: 'خط الرقعة بالحبر', fontCss: "font-['Aref_Ruqaa_Ink',serif]", category: 'رقعة', preview: 'د. خالد العصيمي' },
    { id: 'Ruwudu', name: 'خط الرقعة الرووضة الفاخر', fontCss: "font-['Ruwudu',serif]", category: 'رقعة', preview: 'د. خالد العصيمي' },
    { id: 'Rakkas', name: 'خط الرقاس الديواني', fontCss: "font-['Rakkas',cursive]", category: 'ديواني', preview: 'د. خالد العصيمي' },
    { id: 'Lateef', name: 'خط لطيف النستعليق', fontCss: "font-['Lateef',cursive]", category: 'فارسي', preview: 'د. خالد العصيمي' },
    { id: 'El Messiri', name: 'خط المسيري الفني', fontCss: "font-['El_Messiri',sans-serif]", category: 'حديث', preview: 'د. خالد العصيمي' },
    { id: 'Scheherazade New', name: 'خط شهرزاد النسخي', fontCss: "font-['Scheherazade_New',serif]", category: 'نسخ', preview: 'د. خالد العصيمي' },
    { id: 'Marhey', name: 'خط مرحي اليدوي', fontCss: "font-['Marhey',cursive]", category: 'يدوي', preview: 'د. خالد العصيمي' },
    { id: 'Amiri', name: 'الخط الأميري الثلث', fontCss: "font-['Amiri',serif]", category: 'ثلث', preview: 'د. خالد العصيمي' },
    { id: 'Reem Kufi', name: 'الخط الكوفي التجريدي', fontCss: "font-['Reem_Kufi',sans-serif]", category: 'كوفي', preview: 'د. خالد العصيمي' },
    { id: 'Lalezar', name: 'خط ليلى زار الرائع', fontCss: "font-['Lalezar',cursive]", category: 'عريض', preview: 'د. خالد العصيمي' },
    { id: 'Great Vibes', name: 'Great Vibes (توقيع ملكي إنجليزي)', fontCss: "font-['Great_Vibes',cursive]", category: 'Latn', preview: 'Dr. Khaled Al-Osaimi' },
    { id: 'Dancing Script', name: 'Dancing Script (توقيع حركي)', fontCss: "font-['Dancing_Script',cursive]", category: 'Latn', preview: 'Khaled Al-Osaimi' },
    { id: 'Caveat', name: 'Caveat (قلم جاف يدوي)', fontCss: "font-['Caveat',cursive]", category: 'Latn', preview: 'Khaled Al-Osaimi' },
    { id: 'Alex Brush', name: 'Alex Brush (فرشاة التوقيع)', fontCss: "font-['Alex_Brush',cursive]", category: 'Latn', preview: 'K. Al-Osaimi' },
  ];

  useEffect(() => {
    if (existingSignature) {
      setSigneeName(existingSignature.name || '');
      setSigneeTitle(existingSignature.title || '');
      setActiveTab(existingSignature.type || 'draw');
      if (existingSignature.fontFamily) {
        setTypedFont(existingSignature.fontFamily);
      }
      if (existingSignature.color) {
        setSignatureInkColor(existingSignature.color);
        setPenColor(existingSignature.color);
      }
      if (existingSignature.type === 'type') {
        setTypedText(existingSignature.signatureText || existingSignature.name || '');
      } else if (existingSignature.type === 'upload') {
        setUploadedImageUrl(existingSignature.signatureUrl || '');
      }
    } else {
      setSigneeName('د. خالد العصيمي');
      setSigneeTitle('مدير المؤسسة / المدرسة');
      setTypedText('د. خالد العصيمي');
    }
  }, [existingSignature, isOpen]);

  // Canvas context setup
  useEffect(() => {
    if (isOpen && activeTab === 'draw' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx && !hasDrawn && existingSignature?.signatureUrl) {
        const img = new Image();
        img.onload = () => ctx.drawImage(img, 0, 0);
        img.src = existingSignature.signatureUrl;
      }
    }
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    setHasDrawn(true);
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) ctx.beginPath();
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      if (!e.touches[0]) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = (clientX - rect.left) * (canvas.width / rect.width);
    const y = (clientY - rect.top) * (canvas.height / rect.height);

    ctx.lineWidth = penWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = penColor;

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const clearCanvas = () => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      setHasDrawn(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadedImageUrl(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    let finalUrl = '';
    let text = typedText;

    if (activeTab === 'draw') {
      if (canvasRef.current) {
        finalUrl = canvasRef.current.toDataURL('image/png');
      }
    } else if (activeTab === 'upload') {
      finalUrl = uploadedImageUrl;
    }

    const newSignature: SignatureItem = {
      id: existingSignature ? existingSignature.id : `sig-${Date.now()}`,
      name: signeeName || 'المُوقّع المخوّل',
      title: signeeTitle || 'الصفة الرسمية',
      type: activeTab,
      signatureText: text,
      signatureUrl: finalUrl,
      fontFamily: activeTab === 'type' ? typedFont : undefined,
      color: activeTab === 'type' ? signatureInkColor : (activeTab === 'draw' ? penColor : undefined),
      show: true
    };

    onSaveSignature(newSignature);
    onClose();
  };

  const getFontCss = (fontId: string) => {
    return FONT_OPTIONS.find(f => f.id === fontId)?.fontCss || "font-['Aref_Ruqaa',serif]";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-3 sm:p-4 text-right">
      <div className="bg-white w-full max-w-2xl max-h-[92vh] sm:max-h-[88vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header - Sticky Top */}
        <div className="bg-slate-900 text-white px-4 sm:px-6 py-3.5 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div>
            <h3 className="font-extrabold text-sm sm:text-base flex items-center gap-2 font-['Cairo'] text-amber-400">
              <PenTool className="w-5 h-5 text-amber-400 shrink-0" />
              منصة التوقيع الرقمي الإلكتروني
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">اعتماد وتوثيق الشهادة بتوقيع حي أو خط رقعة كتابي أو صورة رسمية</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg transition hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          
          {/* Signee Info Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">اسم الموقّع المخوّل:</label>
              <input
                type="text"
                value={signeeName}
                onChange={(e) => setSigneeName(e.target.value)}
                placeholder="د. خالد العصيمي"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">الصفة أو المسمى الوظيفي:</label>
              <input
                type="text"
                value={signeeTitle}
                onChange={(e) => setSigneeTitle(e.target.value)}
                placeholder="مدير المدرسة / الرئيس التنفيذي"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Mode Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 gap-1">
            <button
              onClick={() => setActiveTab('draw')}
              className={`flex-1 py-2 px-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition ${
                activeTab === 'draw' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <PenTool className="w-3.5 h-3.5 shrink-0" />
              <span>رسم باليد</span>
            </button>
            <button
              onClick={() => setActiveTab('type')}
              className={`flex-1 py-2 px-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition ${
                activeTab === 'type' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Type className="w-3.5 h-3.5 shrink-0" />
              <span>خط الرقعة والكتابة</span>
            </button>
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex-1 py-2 px-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition ${
                activeTab === 'upload' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Upload className="w-3.5 h-3.5 shrink-0" />
              <span>رفع صورة</span>
            </button>
          </div>

          {/* TAB 1: DRAW CANVAS */}
          {activeTab === 'draw' && (
            <div className="space-y-3">
              {/* Controls Bar for Drawing */}
              <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                
                {/* Pen Ink Color Picker & Swatches */}
                <div className="flex items-center gap-2 overflow-x-auto max-w-full py-0.5">
                  <span className="text-[11px] font-bold text-slate-600 shrink-0">لون القلم:</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {INK_PRESETS.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setPenColor(c.id)}
                        className={`w-6 h-6 rounded-full border-2 transition-transform ${
                          penColor === c.id ? 'scale-110 border-amber-500 shadow-xs ring-2 ring-amber-400' : 'border-white hover:scale-105'
                        }`}
                        style={{ backgroundColor: c.id }}
                        title={c.label}
                      />
                    ))}
                    {/* Custom Color Input */}
                    <label className="relative cursor-pointer shrink-0">
                      <input
                        type="color"
                        value={penColor}
                        onChange={(e) => setPenColor(e.target.value)}
                        className="sr-only"
                      />
                      <span className="w-6 h-6 rounded-full border border-slate-300 flex items-center justify-center bg-white text-slate-600 hover:text-amber-600 shadow-2xs">
                        <Palette className="w-3.5 h-3.5" />
                      </span>
                    </label>
                  </div>
                </div>

                {/* Pen Width Controls */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] font-bold text-slate-600">سُمْك القلم:</span>
                  <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200">
                    {[
                      { width: 2, label: 'رفيع' },
                      { width: 3.5, label: 'متوسط' },
                      { width: 5.5, label: 'عريض' }
                    ].map((w) => (
                      <button
                        key={w.width}
                        onClick={() => setPenWidth(w.width)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                          penWidth === w.width ? 'bg-amber-500 text-slate-950' : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {w.label}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={clearCanvas}
                    className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition flex items-center gap-1 text-xs font-bold mr-1 border border-slate-200 bg-white"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-red-500" /> مسح
                  </button>
                </div>
              </div>

              {/* Drawing Pad Container */}
              <div className="border-2 border-dashed border-amber-500/40 rounded-2xl bg-slate-50/90 relative overflow-hidden h-48 sm:h-56 cursor-crosshair shadow-inner group">
                <canvas
                  ref={canvasRef}
                  width={520}
                  height={220}
                  onMouseDown={startDrawing}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onMouseMove={draw}
                  onTouchStart={startDrawing}
                  onTouchEnd={stopDrawing}
                  onTouchMove={draw}
                  className="w-full h-full touch-none"
                />
                {!hasDrawn && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-slate-400 text-xs gap-1">
                    <PenTool className="w-6 h-6 text-slate-300 animate-pulse" />
                    <span>« ارسم توقيعك بالماوس أو بالإصبع على الشاشة »</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: TYPED SIGNATURE WITH EXTENDED RUQAA FONTS */}
          {activeTab === 'type' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">نص التوقيع أو الاسم المكتوب:</label>
                <input
                  type="text"
                  value={typedText}
                  onChange={(e) => setTypedText(e.target.value)}
                  placeholder="د. خالد العصيمي"
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              {/* Color Selection Palette */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>اختر لون حبر التوقيع الرسمي:</span>
                  <span className="text-[10px] text-amber-700 font-medium">لون محدد: {signatureInkColor}</span>
                </label>
                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin max-w-full">
                  {INK_PRESETS.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setSignatureInkColor(c.id)}
                      className={`py-1.5 px-3 rounded-xl text-xs font-bold border transition flex items-center gap-2 shrink-0 ${
                        signatureInkColor === c.id ? 'border-amber-500 bg-amber-50 text-amber-950 shadow-2xs ring-2 ring-amber-400' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className="w-3.5 h-3.5 rounded-full border shadow-2xs shrink-0" style={{ backgroundColor: c.id }} />
                      <span>{c.label}</span>
                    </button>
                  ))}
                  {/* Custom Color Input Box */}
                  <label className="py-1.5 px-3 rounded-xl text-xs font-bold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-2 cursor-pointer shrink-0">
                    <input
                      type="color"
                      value={signatureInkColor}
                      onChange={(e) => setSignatureInkColor(e.target.value)}
                      className="sr-only"
                    />
                    <Palette className="w-4 h-4 text-amber-600" />
                    <span>لون مخصص</span>
                  </label>
                </div>
              </div>

              {/* Extended Arabic Ruqaa & Handwriting Fonts Grid */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>اختر نمط خط الرقعة أو الخط اليدوي (Handwritten & Ruqaa Styles):</span>
                  <span className="text-[10px] text-slate-500">15 خط حقيقي معتمد</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto p-1.5 border border-slate-200 rounded-2xl bg-slate-50/80">
                  {FONT_OPTIONS.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setTypedFont(f.id)}
                      className={`p-2.5 rounded-xl border text-right transition flex flex-col gap-1 ${
                        typedFont === f.id ? 'border-amber-500 bg-amber-50/90 text-amber-950 shadow-xs ring-2 ring-amber-400' : 'border-slate-200 bg-white hover:bg-slate-100/80 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full text-[10px] font-bold text-slate-500">
                        <span>{f.name}</span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[9px]">{f.category}</span>
                      </div>
                      <span className={`text-xl font-bold ${f.fontCss} leading-tight truncate w-full block pt-0.5`} style={{ color: signatureInkColor }}>
                        {typedText || f.preview}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Typed Preview Box */}
              <div className="p-4 bg-gradient-to-b from-slate-100 to-slate-50 border border-slate-200 rounded-2xl text-center space-y-1 shadow-inner">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">معاينة التوقيع الرقمي بالخط المختارات:</span>
                <div className="min-h-14 flex items-center justify-center p-2">
                  <span
                    className={`text-2xl sm:text-3xl font-bold transition-all ${getFontCss(typedFont)}`}
                    style={{ color: signatureInkColor }}
                  >
                    {typedText || signeeName || 'د. خالد العصيمي'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: UPLOAD SIGNATURE IMAGE */}
          {activeTab === 'upload' && (
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700 mb-1">تحميل صورة التوقيع (PNG بخلفية شفافة يُفضل):</label>
              
              <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center bg-slate-50 hover:bg-slate-100 transition cursor-pointer relative group">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <Upload className="w-8 h-8 text-slate-400 group-hover:text-amber-500 mx-auto mb-2 transition" />
                <p className="text-xs font-bold text-slate-700">انقر هنا أو اسحب ملف صورة التوقيع</p>
                <p className="text-[10px] text-slate-400 mt-1">يدعم JPG, PNG, WEBP</p>
              </div>

              {uploadedImageUrl && (
                <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src={uploadedImageUrl} alt="Signature Preview" className="h-12 object-contain bg-white p-1 rounded-lg border shadow-2xs" />
                    <span className="text-xs font-bold text-emerald-700">تم رفع صورة التوقيع بنجاح</span>
                  </div>
                  <button
                    onClick={() => setUploadedImageUrl('')}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer Actions - Fixed Bottom */}
        <div className="bg-slate-50 px-4 sm:px-6 py-3 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 transition"
          >
            إلغاء
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-md hover:brightness-105 transition flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            حفظ واعتماد التوقيع
          </button>
        </div>

      </div>
    </div>
  );
};
