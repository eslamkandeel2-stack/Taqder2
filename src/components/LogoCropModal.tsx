import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Scissors,
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Check,
  Maximize2,
  Minimize2,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  FlipHorizontal,
} from 'lucide-react';

interface LogoCropModalProps {
  isOpen: boolean;
  imageUrl: string;
  onClose: () => void;
  onSave: (croppedDataUrl: string) => void;
}

type DragHandleType = 'move' | 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se' | null;

export const LogoCropModal: React.FC<LogoCropModalProps> = ({
  isOpen,
  imageUrl,
  onClose,
  onSave,
}) => {
  // Margins in percentage from each edge (0 to 80%)
  const [cropMargins, setCropMargins] = useState({
    top: 10,
    bottom: 10,
    left: 10,
    right: 10,
  });

  const [rotation, setRotation] = useState<number>(0);
  const [zoom, setZoom] = useState<number>(1.0);
  const [isFlippedH, setIsFlippedH] = useState<boolean>(false);
  const [aspectRatio, setAspectRatio] = useState<'free' | '1:1' | '4:3' | '16:9' | 'circle'>('free');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const activeDragHandleRef = useRef<DragHandleType>(null);
  const dragStartPosRef = useRef({ x: 0, y: 0 });
  const dragStartMarginsRef = useRef({ top: 10, bottom: 10, left: 10, right: 10 });

  // Update image when URL changes
  useEffect(() => {
    if (!imageUrl) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;
    img.onload = () => {
      imageRef.current = img;
      setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      generateCropPreview();
    };
  }, [imageUrl]);

  // Generate cropped preview
  const generateCropPreview = useCallback(() => {
    if (!imageRef.current || !canvasRef.current) return;
    const img = imageRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const natW = img.naturalWidth || 400;
    const natH = img.naturalHeight || 400;

    // Calculate source rectangle in pixels based on margins
    const srcX = (cropMargins.left / 100) * natW;
    const srcY = (cropMargins.top / 100) * natH;
    const srcW = Math.max(10, ((100 - cropMargins.left - cropMargins.right) / 100) * natW);
    const srcH = Math.max(10, ((100 - cropMargins.top - cropMargins.bottom) / 100) * natH);

    canvas.width = Math.max(30, Math.round(srcW));
    canvas.height = Math.max(30, Math.round(srcH));

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();

    // Circle clipping if circle aspect ratio is selected
    if (aspectRatio === 'circle') {
      ctx.beginPath();
      ctx.arc(canvas.width / 2, canvas.height / 2, Math.min(canvas.width, canvas.height) / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
    }

    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(isFlippedH ? -zoom : zoom, zoom);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);

    ctx.drawImage(
      img,
      srcX,
      srcY,
      srcW,
      srcH,
      0,
      0,
      canvas.width,
      canvas.height
    );

    ctx.restore();

    try {
      setPreviewUrl(canvas.toDataURL('image/png'));
    } catch {
      // ignore potential security/cors issues in preview
    }
  }, [cropMargins, rotation, zoom, isFlippedH, aspectRatio]);

  useEffect(() => {
    generateCropPreview();
  }, [generateCropPreview]);

  // Direct Margin Handlers with bounds checking
  const updateMargin = (side: 'top' | 'bottom' | 'left' | 'right', val: number) => {
    setCropMargins((prev) => {
      const clamped = Math.max(0, Math.min(85, Math.round(val)));
      const next = { ...prev, [side]: clamped };

      // Ensure minimum 10% width and height remain
      if (next.left + next.right > 90) {
        if (side === 'left') next.right = 90 - clamped;
        else next.left = 90 - clamped;
      }
      if (next.top + next.bottom > 90) {
        if (side === 'top') next.bottom = 90 - clamped;
        else next.top = 90 - clamped;
      }

      return next;
    });
  };

  // Quick Presets
  const applyPreset = (type: 'reset' | 'square' | 'trim5' | 'trim10' | 'circle') => {
    if (type === 'reset') {
      setCropMargins({ top: 0, bottom: 0, left: 0, right: 0 });
      setAspectRatio('free');
      setRotation(0);
      setZoom(1.0);
      setIsFlippedH(false);
    } else if (type === 'trim5') {
      setCropMargins({ top: 5, bottom: 5, left: 5, right: 5 });
    } else if (type === 'trim10') {
      setCropMargins({ top: 10, bottom: 10, left: 10, right: 10 });
    } else if (type === 'square') {
      setAspectRatio('1:1');
      setCropMargins({ top: 15, bottom: 15, left: 15, right: 15 });
    } else if (type === 'circle') {
      setAspectRatio('circle');
      setCropMargins({ top: 15, bottom: 15, left: 15, right: 15 });
    }
  };

  // Interactive Mouse / Touch Dragging on Box and Handles
  const startDrag = (e: React.MouseEvent | React.TouchEvent, handle: DragHandleType) => {
    e.stopPropagation();
    e.preventDefault();
    activeDragHandleRef.current = handle;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragStartPosRef.current = { x: clientX, y: clientY };
    dragStartMarginsRef.current = { ...cropMargins };
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!activeDragHandleRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const dxPercent = ((clientX - dragStartPosRef.current.x) / rect.width) * 100;
    const dyPercent = ((clientY - dragStartPosRef.current.y) / rect.height) * 100;

    const initial = dragStartMarginsRef.current;
    const handle = activeDragHandleRef.current;

    setCropMargins(() => {
      let top = initial.top;
      let bottom = initial.bottom;
      let left = initial.left;
      let right = initial.right;

      if (handle === 'move') {
        const deltaX = dxPercent;
        const deltaY = dyPercent;

        // Shift left/right margins together
        left = Math.max(0, Math.min(100 - (100 - initial.left - initial.right), initial.left + deltaX));
        right = 100 - left - (100 - initial.left - initial.right);

        // Shift top/bottom margins together
        top = Math.max(0, Math.min(100 - (100 - initial.top - initial.bottom), initial.top + deltaY));
        bottom = 100 - top - (100 - initial.top - initial.bottom);
      } else {
        if (handle.includes('n')) top = Math.max(0, Math.min(85, initial.top + dyPercent));
        if (handle.includes('s')) bottom = Math.max(0, Math.min(85, initial.bottom - dyPercent));
        if (handle.includes('w')) left = Math.max(0, Math.min(85, initial.left + dxPercent));
        if (handle.includes('e')) right = Math.max(0, Math.min(85, initial.right - dxPercent));

        // Enforce safety limits
        if (left + right > 90) {
          if (handle.includes('w')) left = 90 - right;
          else right = 90 - left;
        }
        if (top + bottom > 90) {
          if (handle.includes('n')) top = 90 - bottom;
          else bottom = 90 - top;
        }
      }

      return {
        top: Math.max(0, Math.round(top)),
        bottom: Math.max(0, Math.round(bottom)),
        left: Math.max(0, Math.round(left)),
        right: Math.max(0, Math.round(right)),
      };
    });
  };

  const stopDrag = () => {
    activeDragHandleRef.current = null;
  };

  const handleApplyCrop = () => {
    if (previewUrl) {
      onSave(previewUrl);
      onClose();
    }
  };

  if (!isOpen) return null;

  const currentCropWidthPercent = 100 - cropMargins.left - cropMargins.right;
  const currentCropHeightPercent = 100 - cropMargins.top - cropMargins.bottom;

  const calculatedPixelW = imageDimensions.width
    ? Math.round((currentCropWidthPercent / 100) * imageDimensions.width)
    : 0;
  const calculatedPixelH = imageDimensions.height
    ? Math.round((currentCropHeightPercent / 100) * imageDimensions.height)
    : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-3 sm:p-4 animate-fadeIn"
      onMouseUp={stopDrag}
      onTouchEnd={stopDrag}
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 max-w-2xl w-full flex flex-col overflow-hidden max-h-[95vh] text-slate-800">
        
        {/* Modal Header */}
        <div className="p-3.5 bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shadow-inner">
              <Scissors className="w-4 h-4 text-amber-200" />
            </div>
            <div>
              <h3 className="font-black text-sm tracking-wide">أداة قص وتأطير الشعار المتقدمة</h3>
              <p className="text-[11px] text-amber-100/90 font-medium">قص وتحديد الحواف من جميع الاتجاهات الأربعة بدقة</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl hover:bg-white/20 transition flex items-center justify-center text-white cursor-pointer"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-3 sm:p-4 space-y-3.5 overflow-y-auto max-h-[calc(90vh-120px)] scrollbar-thin">
          
          {/* Main Visual Cropping Stage */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 px-1">
              <span className="flex items-center gap-1.5">
                <Maximize2 className="w-3.5 h-3.5 text-amber-600" />
                <span>منطقة القص المرئية (اسحب المقابض أو الإطار للتحريك):</span>
              </span>
              <span className="font-mono text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                {currentCropWidthPercent}% × {currentCropHeightPercent}% {calculatedPixelW > 0 ? `(${calculatedPixelW} × ${calculatedPixelH}px)` : ''}
              </span>
            </div>

            <div
              ref={containerRef}
              onMouseMove={handlePointerMove}
              onTouchMove={handlePointerMove}
              className="relative w-full h-64 sm:h-72 bg-slate-950 rounded-2xl overflow-hidden flex items-center justify-center select-none border-2 border-slate-800 shadow-inner"
              style={{ touchAction: 'none' }}
            >
              {/* Background Transparent Grid Pattern */}
              <div
                className="absolute inset-0 opacity-20 pointer-events-none"
                style={{
                  backgroundImage:
                    'linear-gradient(45deg, #475569 25%, transparent 25%), linear-gradient(-45deg, #475569 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #475569 75%), linear-gradient(-45deg, transparent 75%, #475569 75%)',
                  backgroundSize: '16px 16px',
                  backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                }}
              />

              {/* Source Logo Image */}
              <img
                src={imageUrl}
                alt="Logo to crop"
                className="max-h-full max-w-full object-contain pointer-events-none transition-transform select-none"
                style={{
                  transform: `rotate(${rotation}deg) scale(${isFlippedH ? -zoom : zoom}, ${zoom})`,
                }}
              />

              {/* Darkened Cropped-Out Overlay (4 sides around the crop box) */}
              <div
                className="absolute left-0 right-0 top-0 bg-slate-950/75 pointer-events-none"
                style={{ height: `${cropMargins.top}%` }}
              />
              <div
                className="absolute left-0 right-0 bottom-0 bg-slate-950/75 pointer-events-none"
                style={{ height: `${cropMargins.bottom}%` }}
              />
              <div
                className="absolute left-0 bg-slate-950/75 pointer-events-none"
                style={{
                  top: `${cropMargins.top}%`,
                  bottom: `${cropMargins.bottom}%`,
                  width: `${cropMargins.left}%`,
                }}
              />
              <div
                className="absolute right-0 bg-slate-950/75 pointer-events-none"
                style={{
                  top: `${cropMargins.top}%`,
                  bottom: `${cropMargins.bottom}%`,
                  width: `${cropMargins.right}%`,
                }}
              />

              {/* Interactive Crop Boundary Box */}
              <div
                onMouseDown={(e) => startDrag(e, 'move')}
                onTouchStart={(e) => startDrag(e, 'move')}
                className={`absolute border-2 border-amber-400 cursor-move shadow-[0_0_15px_rgba(245,158,11,0.35)] transition-shadow ${
                  aspectRatio === 'circle' ? 'rounded-full' : ''
                }`}
                style={{
                  top: `${cropMargins.top}%`,
                  bottom: `${cropMargins.bottom}%`,
                  left: `${cropMargins.left}%`,
                  right: `${cropMargins.right}%`,
                }}
              >
                {/* 3x3 Rule-of-Thirds Grid */}
                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-40">
                  <div className="border-r border-b border-amber-300/60" />
                  <div className="border-r border-b border-amber-300/60" />
                  <div className="border-b border-amber-300/60" />
                  <div className="border-r border-b border-amber-300/60" />
                  <div className="border-r border-b border-amber-300/60" />
                  <div className="border-b border-amber-300/60" />
                  <div className="border-r border-amber-300/60" />
                  <div className="border-r border-amber-300/60" />
                  <div />
                </div>

                {/* Center Badge */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                  <span className="text-[10px] font-bold text-amber-950 bg-amber-300/90 backdrop-blur-xs px-2 py-0.5 rounded-full shadow-sm whitespace-nowrap">
                    {aspectRatio === 'circle' ? 'قص دائري' : `${currentCropWidthPercent}% × ${currentCropHeightPercent}%`}
                  </span>
                </div>

                {/* 8 Drag Handles */}
                {/* Top Handle (N) */}
                <div
                  onMouseDown={(e) => startDrag(e, 'n')}
                  onTouchStart={(e) => startDrag(e, 'n')}
                  className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-3 bg-amber-400 hover:bg-amber-300 border border-slate-900 rounded cursor-ns-resize z-20 shadow-sm"
                  title="سحب من الأعلى"
                />

                {/* Bottom Handle (S) */}
                <div
                  onMouseDown={(e) => startDrag(e, 's')}
                  onTouchStart={(e) => startDrag(e, 's')}
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-8 h-3 bg-amber-400 hover:bg-amber-300 border border-slate-900 rounded cursor-ns-resize z-20 shadow-sm"
                  title="سحب من الأسفل"
                />

                {/* Left Handle (W) */}
                <div
                  onMouseDown={(e) => startDrag(e, 'w')}
                  onTouchStart={(e) => startDrag(e, 'w')}
                  className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-8 bg-amber-400 hover:bg-amber-300 border border-slate-900 rounded cursor-ew-resize z-20 shadow-sm"
                  title="سحب من اليسار"
                />

                {/* Right Handle (E) */}
                <div
                  onMouseDown={(e) => startDrag(e, 'e')}
                  onTouchStart={(e) => startDrag(e, 'e')}
                  className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-3 h-8 bg-amber-400 hover:bg-amber-300 border border-slate-900 rounded cursor-ew-resize z-20 shadow-sm"
                  title="سحب من اليمين"
                />

                {/* Corner Handles */}
                {/* Top-Left (NW) */}
                <div
                  onMouseDown={(e) => startDrag(e, 'nw')}
                  onTouchStart={(e) => startDrag(e, 'nw')}
                  className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-amber-400 hover:bg-amber-300 border-2 border-slate-950 rounded-full cursor-nwse-resize z-30 shadow-md"
                  title="سحب الزاوية العلوية اليسرى"
                />

                {/* Top-Right (NE) */}
                <div
                  onMouseDown={(e) => startDrag(e, 'ne')}
                  onTouchStart={(e) => startDrag(e, 'ne')}
                  className="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-amber-400 hover:bg-amber-300 border-2 border-slate-950 rounded-full cursor-nesw-resize z-30 shadow-md"
                  title="سحب الزاوية العلوية اليمنى"
                />

                {/* Bottom-Left (SW) */}
                <div
                  onMouseDown={(e) => startDrag(e, 'sw')}
                  onTouchStart={(e) => startDrag(e, 'sw')}
                  className="absolute bottom-0 left-0 -translate-x-1/2 translate-y-1/2 w-4 h-4 bg-amber-400 hover:bg-amber-300 border-2 border-slate-950 rounded-full cursor-nesw-resize z-30 shadow-md"
                  title="سحب الزاوية السفلية اليسرى"
                />

                {/* Bottom-Right (SE) */}
                <div
                  onMouseDown={(e) => startDrag(e, 'se')}
                  onTouchStart={(e) => startDrag(e, 'se')}
                  className="absolute bottom-0 right-0 translate-x-1/2 translate-y-1/2 w-4 h-4 bg-amber-400 hover:bg-amber-300 border-2 border-slate-950 rounded-full cursor-nwse-resize z-30 shadow-md"
                  title="سحب الزاوية السفلية اليمنى"
                />
              </div>
            </div>
          </div>

          {/* 4-Directional Crop Margins (Explicit Controls & Fields) */}
          <div className="bg-amber-50/70 p-3 rounded-2xl border border-amber-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-amber-950 flex items-center gap-1">
                <span>📐</span>
                <span>حقول القص والتحكم الدقيق من جميع الاتجاهات:</span>
              </span>
              <span className="text-[10px] text-amber-800 bg-white px-2 py-0.5 rounded-full border border-amber-300 font-bold">
                (نسبة مقتطعة من كل طرف)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              
              {/* 1. Top Margin Control */}
              <div className="bg-white p-2 rounded-xl border border-amber-200/80 shadow-2xs space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span className="flex items-center gap-1 text-slate-800">
                    <ArrowUp className="w-3.5 h-3.5 text-amber-600" />
                    القص من الأعلى (Top):
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => updateMargin('top', cropMargins.top - 1)}
                      className="w-5 h-5 rounded bg-slate-100 hover:bg-amber-100 text-slate-700 flex items-center justify-center font-bold text-xs"
                    >
                      -
                    </button>
                    <span className="font-mono text-amber-900 font-bold bg-amber-50 px-1.5 py-0.5 rounded text-[11px] border border-amber-200">
                      {cropMargins.top}%
                    </span>
                    <button
                      type="button"
                      onClick={() => updateMargin('top', cropMargins.top + 1)}
                      className="w-5 h-5 rounded bg-slate-100 hover:bg-amber-100 text-slate-700 flex items-center justify-center font-bold text-xs"
                    >
                      +
                    </button>
                  </div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="80"
                  value={cropMargins.top}
                  onChange={(e) => updateMargin('top', parseInt(e.target.value))}
                  className="w-full accent-amber-600 h-1.5 cursor-pointer"
                />
              </div>

              {/* 2. Bottom Margin Control */}
              <div className="bg-white p-2 rounded-xl border border-amber-200/80 shadow-2xs space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span className="flex items-center gap-1 text-slate-800">
                    <ArrowDown className="w-3.5 h-3.5 text-amber-600" />
                    القص من الأسفل (Bottom):
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => updateMargin('bottom', cropMargins.bottom - 1)}
                      className="w-5 h-5 rounded bg-slate-100 hover:bg-amber-100 text-slate-700 flex items-center justify-center font-bold text-xs"
                    >
                      -
                    </button>
                    <span className="font-mono text-amber-900 font-bold bg-amber-50 px-1.5 py-0.5 rounded text-[11px] border border-amber-200">
                      {cropMargins.bottom}%
                    </span>
                    <button
                      type="button"
                      onClick={() => updateMargin('bottom', cropMargins.bottom + 1)}
                      className="w-5 h-5 rounded bg-slate-100 hover:bg-amber-100 text-slate-700 flex items-center justify-center font-bold text-xs"
                    >
                      +
                    </button>
                  </div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="80"
                  value={cropMargins.bottom}
                  onChange={(e) => updateMargin('bottom', parseInt(e.target.value))}
                  className="w-full accent-amber-600 h-1.5 cursor-pointer"
                />
              </div>

              {/* 3. Right Margin Control */}
              <div className="bg-white p-2 rounded-xl border border-amber-200/80 shadow-2xs space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span className="flex items-center gap-1 text-slate-800">
                    <ArrowRight className="w-3.5 h-3.5 text-amber-600" />
                    القص من اليمين (Right):
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => updateMargin('right', cropMargins.right - 1)}
                      className="w-5 h-5 rounded bg-slate-100 hover:bg-amber-100 text-slate-700 flex items-center justify-center font-bold text-xs"
                    >
                      -
                    </button>
                    <span className="font-mono text-amber-900 font-bold bg-amber-50 px-1.5 py-0.5 rounded text-[11px] border border-amber-200">
                      {cropMargins.right}%
                    </span>
                    <button
                      type="button"
                      onClick={() => updateMargin('right', cropMargins.right + 1)}
                      className="w-5 h-5 rounded bg-slate-100 hover:bg-amber-100 text-slate-700 flex items-center justify-center font-bold text-xs"
                    >
                      +
                    </button>
                  </div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="80"
                  value={cropMargins.right}
                  onChange={(e) => updateMargin('right', parseInt(e.target.value))}
                  className="w-full accent-amber-600 h-1.5 cursor-pointer"
                />
              </div>

              {/* 4. Left Margin Control */}
              <div className="bg-white p-2 rounded-xl border border-amber-200/80 shadow-2xs space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span className="flex items-center gap-1 text-slate-800">
                    <ArrowLeft className="w-3.5 h-3.5 text-amber-600" />
                    القص من اليسار (Left):
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => updateMargin('left', cropMargins.left - 1)}
                      className="w-5 h-5 rounded bg-slate-100 hover:bg-amber-100 text-slate-700 flex items-center justify-center font-bold text-xs"
                    >
                      -
                    </button>
                    <span className="font-mono text-amber-900 font-bold bg-amber-50 px-1.5 py-0.5 rounded text-[11px] border border-amber-200">
                      {cropMargins.left}%
                    </span>
                    <button
                      type="button"
                      onClick={() => updateMargin('left', cropMargins.left + 1)}
                      className="w-5 h-5 rounded bg-slate-100 hover:bg-amber-100 text-slate-700 flex items-center justify-center font-bold text-xs"
                    >
                      +
                    </button>
                  </div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="80"
                  value={cropMargins.left}
                  onChange={(e) => updateMargin('left', parseInt(e.target.value))}
                  className="w-full accent-amber-600 h-1.5 cursor-pointer"
                />
              </div>

            </div>

            {/* Quick Trim Action Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] font-bold text-slate-600">إجراءات سريعة:</span>
              <button
                type="button"
                onClick={() => applyPreset('reset')}
                className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 text-[10px] font-bold rounded-lg border border-slate-300 flex items-center gap-1 shadow-2xs"
              >
                <RefreshCw className="w-3 h-3 text-slate-600" />
                كامل الصورة (0%)
              </button>
              <button
                type="button"
                onClick={() => applyPreset('trim5')}
                className="px-2 py-1 bg-white hover:bg-amber-50 text-amber-900 text-[10px] font-bold rounded-lg border border-amber-300 flex items-center gap-1 shadow-2xs"
              >
                قص 5% من الحواف
              </button>
              <button
                type="button"
                onClick={() => applyPreset('trim10')}
                className="px-2 py-1 bg-white hover:bg-amber-50 text-amber-900 text-[10px] font-bold rounded-lg border border-amber-300 flex items-center gap-1 shadow-2xs"
              >
                قص 10% من الحواف
              </button>
              <button
                type="button"
                onClick={() => applyPreset('square')}
                className="px-2 py-1 bg-white hover:bg-amber-50 text-amber-900 text-[10px] font-bold rounded-lg border border-amber-300 flex items-center gap-1 shadow-2xs"
              >
                مربع 1:1
              </button>
              <button
                type="button"
                onClick={() => applyPreset('circle')}
                className="px-2 py-1 bg-white hover:bg-amber-50 text-amber-900 text-[10px] font-bold rounded-lg border border-amber-300 flex items-center gap-1 shadow-2xs"
              >
                قص دائري
              </button>
            </div>
          </div>

          {/* Transform Controls (Rotate, Flip, Zoom) */}
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-700 text-[11px]">التدوير والعكس:</span>
              <button
                type="button"
                onClick={() => setRotation((r) => (r - 90 + 360) % 360)}
                className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-slate-700 font-bold flex items-center gap-1 hover:bg-slate-100 shadow-2xs"
                title="تدوير 90 درجة لليسار"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                <span>90°-</span>
              </button>
              <button
                type="button"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-slate-700 font-bold flex items-center gap-1 hover:bg-slate-100 shadow-2xs"
                title="تدوير 90 درجة لليمين"
              >
                <RotateCw className="w-3.5 h-3.5 text-amber-600" />
                <span>90°+</span>
              </button>
              <button
                type="button"
                onClick={() => setIsFlippedH((f) => !f)}
                className={`px-2 py-1 border rounded-lg font-bold flex items-center gap-1 shadow-2xs transition ${
                  isFlippedH ? 'bg-amber-500 text-slate-950 border-amber-600' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
                title="عكس أفقي للصورة"
              >
                <FlipHorizontal className="w-3.5 h-3.5" />
                <span>عكس أفقي</span>
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-700 text-[11px]">مقياس التكبير:</span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.5, Math.round((z - 0.1) * 10) / 10))}
                className="p-1 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 shadow-2xs"
                title="تصغير"
              >
                <ZoomOut className="w-3.5 h-3.5 text-slate-700" />
              </button>
              <span className="font-mono font-bold w-10 text-center text-amber-900 bg-amber-50 py-0.5 rounded border border-amber-200 text-xs">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(3.0, Math.round((z + 0.1) * 10) / 10))}
                className="p-1 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 shadow-2xs"
                title="تكبير"
              >
                <ZoomIn className="w-3.5 h-3.5 text-slate-700" />
              </button>
            </div>
          </div>

          <canvas ref={canvasRef} className="hidden" />

          {/* Cropped Output Preview Card */}
          {previewUrl && (
            <div className="flex items-center gap-3 p-2.5 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 rounded-xl border border-amber-200/90 shadow-xs">
              <div className="w-14 h-14 bg-white rounded-xl p-1 border border-amber-300 shadow-xs flex items-center justify-center shrink-0 overflow-hidden">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className={`max-h-full max-w-full object-contain ${aspectRatio === 'circle' ? 'rounded-full' : ''}`}
                />
              </div>
              <div className="text-xs space-y-0.5">
                <h4 className="font-bold text-amber-950 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  معاينة الشعار الناتج
                </h4>
                <p className="text-amber-800 text-[11px] leading-tight">
                  تم اقتصاص الشعار بنجاح. اضغط على زر "اعتماد وتطبيق الاقتصاص" لحفظ التعديلات في الشهادة فوراً.
                </p>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer Actions */}
        <div className="p-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 font-bold text-xs bg-white text-slate-700 hover:bg-slate-50 transition cursor-pointer shadow-2xs"
          >
            إلغاء
          </button>
          <button
            onClick={handleApplyCrop}
            disabled={!previewUrl}
            className="px-5 py-2 rounded-xl font-bold text-xs bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-2 shadow-sm transition disabled:opacity-50 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>اعتماد وتطبيق الاقتصاص</span>
          </button>
        </div>

      </div>
    </div>
  );
};
