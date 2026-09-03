import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { CertificateData, ElementPositions, ElementStyles, FontOption, LayoutPreset } from '../types';
import { generateQRCodeDataUrl, generateVerificationCode } from '../utils/qrUtils';
import { generateCode39Bars } from '../utils/barcodeUtils';
import { getGradientCss } from '../utils/gradientUtils';
import { getTodayHijriDate, getTodayGregorianDate } from '../utils/defaultSettings';
import { validateGridTemplateAreas } from '../utils/gridValidator';
import { getCertificateDimensions } from '../utils/exportUtils';
import {
  Award,
  Star,
  Trophy,
  Crown,
  Shield,
  Heart,
  Sparkles,
  BookOpen,
  Target,
  Medal,
  CheckCircle2,
  Edit3,
  FileText,
  Maximize2,
  Move,
  RotateCcw,
  RotateCw,
  QrCode,
  ShieldCheck,
  Undo2,
  Redo2,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ZoomIn,
  ZoomOut
} from 'lucide-react';

interface Props {
  data: CertificateData;
  canvasRef?: React.RefObject<HTMLDivElement | null>;
  isExporting?: boolean;
  onUpdateEmojiPos?: (id: string, x: number, y: number) => void;
  onUpdateData?: (newData: Partial<CertificateData>) => void;
  onOpenVerificationModal?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
}

function hexToRgba(hexStr?: string, opacity: number = 0.12): string {
  if (!hexStr) return `rgba(245, 158, 11, ${opacity})`;
  let clean = hexStr.replace('#', '');
  if (clean.length === 3) {
    clean = clean.split('').map(c => c + c).join('');
  }
  if (clean.length === 6) {
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
  }
  return hexStr;
}

export interface CertificateGridLayoutConfig {
  presetName: string;
  gridTemplateRows: string;
  gridTemplateColumns: string;
  gridTemplateAreas: string;
  alignContent: string;
  gap: string;
  isSidebar: boolean;
  isExecutive: boolean;
  stampsStyle: React.CSSProperties;
}

export const getCertificateGridLayout = (
  preset?: LayoutPreset,
  customData?: {
    customGridTemplateAreas?: string;
    customGridTemplateColumns?: string;
    customGridTemplateRows?: string;
  }
): CertificateGridLayoutConfig => {
  const normalizedPreset: LayoutPreset = 
    preset === ('modern' as any) ? 'modern-split' :
    preset === ('sidebar' as any) ? 'sidebar-right' :
    preset === ('centered' as any) ? 'minimal-centered' :
    preset === ('executive' as any) ? 'executive-horizontal' :
    preset || 'classic-standard';

  switch (normalizedPreset) {
    case 'custom-grid': {
      const validation = validateGridTemplateAreas(customData?.customGridTemplateAreas);
      if (validation.isValid && validation.formattedCss) {
        const colDef = customData?.customGridTemplateColumns?.trim() || 
          (validation.colCount === 1 ? '100%' : `repeat(${validation.colCount}, minmax(0, 1fr))`);
        const rowDef = customData?.customGridTemplateRows?.trim() || 
          (validation.rowCount > 0 ? `repeat(${validation.rowCount}, auto)` : 'auto auto 1fr auto auto');

        // Check if stamps area acts as a side column
        const isStampsSidebar = validation.matrix.length >= 2 && 
          validation.matrix.some(row => row[0] === 'stamps' || row[row.length - 1] === 'stamps') &&
          validation.colCount > 1;

        return {
          presetName: 'custom-grid',
          gridTemplateRows: rowDef,
          gridTemplateColumns: colDef,
          gridTemplateAreas: validation.formattedCss,
          alignContent: 'space-between',
          gap: '14px',
          isSidebar: isStampsSidebar,
          isExecutive: false,
          stampsStyle: isStampsSidebar ? {
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-around',
            alignItems: 'center',
            height: '100%',
            padding: '8px 4px',
            gap: '12px',
            width: '100%',
          } : {
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gridTemplateAreas: '"badge stamp footer"',
            alignItems: 'center',
            justifyItems: 'center',
            gap: '10px',
            width: '100%',
          }
        };
      }

      // Safe default for custom grid if not yet customized or valid
      return {
        presetName: 'custom-grid',
        gridTemplateRows: 'auto auto 1fr auto',
        gridTemplateColumns: '1fr 1fr',
        gridTemplateAreas: `
          "header header"
          "title title"
          "body body"
          "stamps signatures"
        `,
        alignContent: 'space-between',
        gap: '14px',
        isSidebar: false,
        isExecutive: false,
        stampsStyle: {
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gridTemplateAreas: '"badge stamp footer"',
          alignItems: 'center',
          justifyItems: 'center',
          gap: '8px',
          width: '100%',
        }
      };
    }
    case 'modern-split':
      return {
        presetName: 'modern-split',
        gridTemplateRows: 'auto auto 1fr auto',
        gridTemplateColumns: '1fr 1fr',
        gridTemplateAreas: `
          "header header"
          "title title"
          "body body"
          "stamps signatures"
        `,
        alignContent: 'space-between',
        gap: '16px',
        isSidebar: false,
        isExecutive: false,
        stampsStyle: {
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gridTemplateAreas: '"badge stamp footer"',
          alignItems: 'center',
          justifyItems: 'center',
          gap: '8px',
          width: '100%',
        }
      };

    case 'sidebar-right':
      return {
        presetName: 'sidebar-right',
        gridTemplateRows: 'auto auto 1fr auto',
        gridTemplateColumns: '220px 1fr',
        gridTemplateAreas: `
          "stamps header"
          "stamps title"
          "stamps body"
          "stamps signatures"
        `,
        alignContent: 'space-between',
        gap: '18px',
        isSidebar: true,
        isExecutive: false,
        stampsStyle: {
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-around',
          alignItems: 'center',
          height: '100%',
          padding: '10px 6px',
          borderInlineEnd: '1.5px dashed rgba(217, 119, 6, 0.35)',
          gap: '14px',
          width: '100%',
        }
      };

    case 'sidebar-left':
      return {
        presetName: 'sidebar-left',
        gridTemplateRows: 'auto auto 1fr auto',
        gridTemplateColumns: '1fr 220px',
        gridTemplateAreas: `
          "header stamps"
          "title stamps"
          "body stamps"
          "signatures stamps"
        `,
        alignContent: 'space-between',
        gap: '18px',
        isSidebar: true,
        isExecutive: false,
        stampsStyle: {
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-around',
          alignItems: 'center',
          height: '100%',
          padding: '10px 6px',
          borderInlineStart: '1.5px dashed rgba(217, 119, 6, 0.35)',
          gap: '14px',
          width: '100%',
        }
      };

    case 'minimal-centered':
      return {
        presetName: 'minimal-centered',
        gridTemplateRows: 'auto auto 1fr auto auto',
        gridTemplateColumns: '100%',
        gridTemplateAreas: `
          "header"
          "title"
          "body"
          "stamps"
          "signatures"
        `,
        alignContent: 'space-around',
        gap: '16px',
        isSidebar: false,
        isExecutive: false,
        stampsStyle: {
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gridTemplateAreas: '"badge stamp footer"',
          alignItems: 'center',
          justifyItems: 'center',
          gap: '10px',
          width: '100%',
        }
      };

    case 'executive-horizontal':
      return {
        presetName: 'executive-horizontal',
        gridTemplateRows: 'auto auto 1fr auto',
        gridTemplateColumns: '1fr 210px',
        gridTemplateAreas: `
          "header header"
          "title title"
          "body stamps"
          "signatures signatures"
        `,
        alignContent: 'space-between',
        gap: '16px',
        isSidebar: false,
        isExecutive: true,
        stampsStyle: {
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-evenly',
          alignItems: 'center',
          height: '100%',
          padding: '6px 4px',
          borderInlineStart: '1.5px dashed rgba(217, 119, 6, 0.3)',
          gap: '10px',
          width: '100%',
        }
      };

    case 'diploma-grand':
      return {
        presetName: 'diploma-grand',
        gridTemplateRows: 'auto auto 1fr auto auto',
        gridTemplateColumns: '100%',
        gridTemplateAreas: `
          "header"
          "title"
          "body"
          "signatures"
          "stamps"
        `,
        alignContent: 'space-between',
        gap: '14px',
        isSidebar: false,
        isExecutive: false,
        stampsStyle: {
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gridTemplateAreas: '"badge stamp footer"',
          alignItems: 'center',
          justifyItems: 'center',
          gap: '10px',
          width: '100%',
        }
      };

    case 'classic-standard':
    default:
      return {
        presetName: 'classic-standard',
        gridTemplateRows: 'auto auto 1fr auto auto',
        gridTemplateColumns: '100%',
        gridTemplateAreas: `
          "header"
          "title"
          "body"
          "stamps"
          "signatures"
        `,
        alignContent: 'space-between',
        gap: '12px',
        isSidebar: false,
        isExecutive: false,
        stampsStyle: {
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gridTemplateAreas: '"badge stamp footer"',
          alignItems: 'center',
          justifyItems: 'center',
          gap: '8px',
          width: '100%',
        }
      };
  }
};

export const CertificateCanvas: React.FC<Props> = ({
  data,
  canvasRef,
  isExporting = false,
  onUpdateEmojiPos,
  onUpdateData,
  onOpenVerificationModal,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const fallbackCanvasRef = useRef<HTMLDivElement>(null);
  const actualCanvasRef = canvasRef || fallbackCanvasRef;

  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [zoomMode, setZoomMode] = useState<'fit' | '50' | '75' | '100' | '125' | '150'>('fit');
  const [isDragModeActive, setIsDragModeActive] = useState<boolean>(false);
  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [nudgeStep, setNudgeStep] = useState<number>(2);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [activeGuides, setActiveGuides] = useState<{
    vertical?: { xPercent: number; label: string };
    horizontal?: { yPercent: number; label: string };
  } | null>(null);

  const getElementFriendlyName = (key: string): string => {
    if (key.startsWith('emoji-')) {
      const id = key.replace('emoji-', '');
      const item = data.emojis?.find((e) => e.id === id);
      return `ملصق (${item ? item.emoji : 'شكل'})`;
    }
    const names: Record<string, string> = {
      titleBlock: 'العنوان الرئيس',
      recipientBlock: 'اسم المكرّم',
      appreciationBlock: 'نص التقدير',
      signaturesBlock: 'قسم التوقيعات',
      schoolHeader: 'ترويسة المدرسة',
      logo: 'الشعار',
      stamp: 'الختم الرسمي',
      qrCode: 'رمز QR',
      badge: 'وسام التميز',
      dateLocation: 'التاريخ والمكان',
      poemBlock: 'بيت الشعر / المقولة'
    };
    return names[key] || 'عنصر آخر';
  };

  // Precise movement nudge handler
  const handleNudge = (direction: 'up' | 'down' | 'left' | 'right', customStep?: number) => {
    if (!selectedKey) return;
    const step = customStep ?? nudgeStep;

    if (selectedKey.startsWith('emoji-')) {
      const emojiId = selectedKey.replace('emoji-', '');
      const emojiItem = data.emojis?.find((e) => e.id === emojiId);
      if (emojiItem) {
        let newX = emojiItem.x;
        let newY = emojiItem.y;
        // 1px pixel roughly equals 0.25% on canvas
        const pctStep = step * 0.25;
        if (direction === 'up') newY = Math.max(0, newY - pctStep);
        if (direction === 'down') newY = Math.min(95, newY + pctStep);
        if (direction === 'left') newX = Math.max(0, newX - pctStep);
        if (direction === 'right') newX = Math.min(95, newX + pctStep);

        const clampedX = Math.round(newX * 10) / 10;
        const clampedY = Math.round(newY * 10) / 10;

        if (onUpdateEmojiPos) {
          onUpdateEmojiPos(emojiId, clampedX, clampedY);
        } else if (onUpdateData && data.emojis) {
          const updated = data.emojis.map((e) => (e.id === emojiId ? { ...e, x: clampedX, y: clampedY } : e));
          onUpdateData({ emojis: updated });
        }
      }
    } else {
      const currentPos = data.positions?.[selectedKey as keyof ElementPositions] || { x: 0, y: 0 };
      let newX = currentPos.x;
      let newY = currentPos.y;

      if (direction === 'up') newY -= step;
      if (direction === 'down') newY += step;
      if (direction === 'left') newX -= step;
      if (direction === 'right') newX += step;

      // Clamp values
      newX = Math.max(-450, Math.min(450, newX));
      newY = Math.max(-450, Math.min(450, newY));

      if (selectedKey === 'badge' || selectedKey === 'stamp' || selectedKey === 'qrCode') {
        newY = Math.min(0, newY);
      } else if (selectedKey === 'signaturesBlock') {
        newY = Math.max(-15, Math.min(5, newY));
        newX = Math.max(-30, Math.min(30, newX));
      }

      if (onUpdateData) {
        onUpdateData({
          positions: {
            ...(data.positions || {}),
            [selectedKey]: { x: newX, y: newY }
          }
        });
      }
    }
  };

  // Keep reference to latest handleNudge for repeat timer
  const handleNudgeRef = useRef(handleNudge);
  useEffect(() => {
    handleNudgeRef.current = handleNudge;
  });

  const repeatTimerRef = useRef<{ timeout?: ReturnType<typeof setTimeout>; interval?: ReturnType<typeof setInterval> }>({});

  const stopNudgeRepeat = useCallback(() => {
    if (repeatTimerRef.current.timeout) clearTimeout(repeatTimerRef.current.timeout);
    if (repeatTimerRef.current.interval) clearInterval(repeatTimerRef.current.interval);
    repeatTimerRef.current = {};
  }, []);

  const startNudgeRepeat = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    stopNudgeRepeat();
    if (!selectedKey) return;

    // Immediate nudge
    handleNudgeRef.current(direction);

    const handleGlobalRelease = () => {
      stopNudgeRepeat();
      window.removeEventListener('mouseup', handleGlobalRelease);
      window.removeEventListener('touchend', handleGlobalRelease);
    };
    window.addEventListener('mouseup', handleGlobalRelease);
    window.addEventListener('touchend', handleGlobalRelease);

    // Initial delay then continuous repeat ticks
    repeatTimerRef.current.timeout = setTimeout(() => {
      repeatTimerRef.current.interval = setInterval(() => {
        handleNudgeRef.current(direction);
      }, 60);
    }, 220);
  }, [selectedKey, stopNudgeRepeat]);

  // Clean up on unmount or selectedKey change
  useEffect(() => {
    return () => stopNudgeRepeat();
  }, [selectedKey, stopNudgeRepeat]);

  // Keyboard navigation for directional arrow keys
  useEffect(() => {
    if (!isDragModeActive || !selectedKey) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElem = document.activeElement;
      if (activeElem && (activeElem.tagName === 'INPUT' || activeElem.tagName === 'TEXTAREA' || (activeElem as HTMLElement).isContentEditable)) {
        return;
      }

      const multiplier = e.shiftKey ? 5 : 1;
      const step = nudgeStep * multiplier;

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        handleNudge('up', step);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        handleNudge('down', step);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleNudge('left', step);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNudge('right', step);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDragModeActive, selectedKey, nudgeStep, data.positions, data.emojis]);

  const dragStartRef = useRef<{
    startX: number;
    startY: number;
    initialElemX: number;
    initialElemY: number;
  } | null>(null);

  // Memoize verification code to guarantee single generation per certificate ID
  const verificationCode = useMemo(() => {
    return data.verificationCode || generateVerificationCode(data.id || data.certificateId, {
      prefix: data.verificationPrefix,
      pattern: data.verificationCodePattern
    });
  }, [data.verificationCode, data.id, data.certificateId, data.verificationPrefix, data.verificationCodePattern]);

  // Measure container width dynamically to scale canvas to fit preview area
  useEffect(() => {
    if (!containerRef.current) return;
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };

    updateWidth();
    const resizeObserver = new ResizeObserver(updateWidth);
    resizeObserver.observe(containerRef.current);

    window.addEventListener('resize', updateWidth);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateWidth);
    };
  }, []);

  // Window-level mouse/touch event listeners for smooth dragging across entire window
  useEffect(() => {
    if (!draggingKey || !isDragModeActive) return;

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      if (!actualCanvasRef.current || !dragStartRef.current) return;
      const canvasRect = actualCanvasRef.current.getBoundingClientRect();
      if (!canvasRect.width || !canvasRect.height) return;

      const clientX = 'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY;

      const deltaXInPx = clientX - dragStartRef.current.startX;
      const deltaYInPx = clientY - dragStartRef.current.startY;

      const deltaXPercent = (deltaXInPx / canvasRect.width) * 100;
      const deltaYPercent = (deltaYInPx / canvasRect.height) * 100;

      // Clamp limits to guarantee elements stay inside frame
      const maxX = 76;
      const maxY = draggingKey === 'signaturesBlock' ? 70 : 75;

      const newX = Math.round(Math.max(3, Math.min(maxX, dragStartRef.current.initialElemX + deltaXPercent)));
      const newY = Math.round(Math.max(3, Math.min(maxY, dragStartRef.current.initialElemY + deltaYPercent)));

      if (draggingKey.startsWith('emoji-')) {
        const deltaXPercent = (deltaXInPx / canvasRect.width) * 100;
        const deltaYPercent = (deltaYInPx / canvasRect.height) * 100;

        const newX = Math.round(Math.max(0, Math.min(95, dragStartRef.current.initialElemX + deltaXPercent)));
        const newY = Math.round(Math.max(0, Math.min(95, dragStartRef.current.initialElemY + deltaYPercent)));

        const emojiId = draggingKey.replace('emoji-', '');
        if (onUpdateEmojiPos) {
          onUpdateEmojiPos(emojiId, newX, newY);
        } else if (onUpdateData && data.emojis) {
          const updated = data.emojis.map(item => item.id === emojiId ? { ...item, x: newX, y: newY } : item);
          onUpdateData({ emojis: updated });
        }
      } else {
        const currentScale = canvasRect.width / aspectInfo.baseWidth || 1;
        const newDx = Math.round(dragStartRef.current.initialElemX + (deltaXInPx / currentScale));
        const newDy = Math.round(dragStartRef.current.initialElemY + (deltaYInPx / currentScale));

        // Clamp offsets so elements stay within canvas bounds
        let clampedX = Math.max(-450, Math.min(450, newDx));
        let clampedY = Math.max(-450, Math.min(450, newDy));

        if (draggingKey === 'signaturesBlock') {
          clampedY = Math.max(-25, Math.min(25, clampedY));
          clampedX = Math.max(-40, Math.min(40, clampedX));
        }

        let finalX = clampedX;
        let finalY = clampedY;

        let vGuide: { xPercent: number; label: string } | undefined;
        let hGuide: { yPercent: number; label: string } | undefined;

        // Smart Guide 1: Vertical Center Alignment (X = 0)
        if (Math.abs(clampedX) < 10) {
          finalX = 0; // Snap to exact center!
          vGuide = { xPercent: 50, label: 'محاذاة في منتصف اللوحة' };
        }

        // Smart Guide 2: Horizontal Base Alignment (Y = 0)
        if (Math.abs(clampedY) < 10) {
          finalY = 0; // Snap to baseline!
          hGuide = { yPercent: 50, label: 'الموضع الرأسي الأصلي' };
        }

        // Smart Guide 3: Alignment with other positioned elements
        if (data.positions) {
          Object.entries(data.positions).forEach(([key, rawPos]) => {
            const pos = rawPos as { x: number; y: number } | undefined;
            if (key !== draggingKey && pos && typeof pos.x === 'number' && typeof pos.y === 'number') {
              // Check X alignment with another element
              if (Math.abs(clampedX - pos.x) < 8) {
                finalX = pos.x;
                const percent = 50 + (pos.x / aspectInfo.baseWidth) * 100;
                vGuide = { xPercent: percent, label: `محاذاة مع (${getElementFriendlyName(key)})` };
              }
              // Check Y alignment with another element
              if (Math.abs(clampedY - pos.y) < 8) {
                finalY = pos.y;
                const percent = 50 + (pos.y / aspectInfo.baseHeight) * 100;
                hGuide = { yPercent: percent, label: `محاذاة مع (${getElementFriendlyName(key)})` };
              }
            }
          });
        }

        if (vGuide || hGuide) {
          setActiveGuides({ vertical: vGuide, horizontal: hGuide });
        } else {
          setActiveGuides(null);
        }

        if (onUpdateData) {
          onUpdateData({
            positions: {
              ...(data.positions || {}),
              [draggingKey]: { x: finalX, y: finalY }
            }
          });
        }
      }
    };

    const handlePointerUp = () => {
      setDraggingKey(null);
      dragStartRef.current = null;
      setActiveGuides(null);
    };

    window.addEventListener('mousemove', handlePointerMove, { passive: true });
    window.addEventListener('touchmove', handlePointerMove, { passive: true });
    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('touchend', handlePointerUp);

    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchend', handlePointerUp);
    };
  }, [draggingKey, isDragModeActive, data.emojis, data.positions, onUpdateData, onUpdateEmojiPos, actualCanvasRef]);

  // Generate dynamic QR Code for certificate verification (Links directly to Google Drive if available, otherwise to platform verification URL)
  const isDriveUploaded = !!(data.driveFileWebViewLink || data.driveFileUrl);
  const qrTargetUrl = useMemo(() => {
    return isDriveUploaded
      ? (data.driveFileWebViewLink || data.driveFileUrl!)
      : `${window.location.origin}/verify?code=${verificationCode}`;
  }, [isDriveUploaded, data.driveFileWebViewLink, data.driveFileUrl, verificationCode]);

  useEffect(() => {
    let isMounted = true;
    generateQRCodeDataUrl(qrTargetUrl).then(url => {
      if (isMounted && url) {
        setQrDataUrl(prev => (prev === url ? prev : url));
      }
    });
    return () => {
      isMounted = false;
    };
  }, [qrTargetUrl]);

  const handleStartDrag = (
    e: React.MouseEvent | React.TouchEvent,
    key: string,
    targetElem?: HTMLElement | null
  ) => {
    if (isExporting || !isDragModeActive) return;

    // Do NOT start drag if user clicked directly on an editable input/textarea or button
    const target = e.target as HTMLElement;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.closest('button'))) {
      return;
    }

    e.stopPropagation();

    if (!actualCanvasRef.current) return;
    const canvasRect = actualCanvasRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    let initialElemX = 0;
    let initialElemY = 0;

    if (key.startsWith('emoji-')) {
      const emojiId = key.replace('emoji-', '');
      const emojiItem = data.emojis?.find((item) => item.id === emojiId);
      if (emojiItem) {
        initialElemX = emojiItem.x;
        initialElemY = emojiItem.y;
      }
    } else {
      const pos = data.positions?.[key as keyof ElementPositions];
      if (pos) {
        initialElemX = pos.x;
        initialElemY = pos.y;
      }
    }

    dragStartRef.current = {
      startX: clientX,
      startY: clientY,
      initialElemX,
      initialElemY,
    };

    setDraggingKey(key);
    setSelectedKey(key);
  };

  const handleResetPositions = () => {
    if (onUpdateData) {
      onUpdateData({ positions: {} });
    }
  };

  const getBadgeIcon = (iconName: string) => {
    switch (iconName) {
      case 'star': return <Star className="w-8 h-8" />;
      case 'trophy': return <Trophy className="w-8 h-8" />;
      case 'crown': return <Crown className="w-8 h-8" />;
      case 'shield': return <Shield className="w-8 h-8" />;
      case 'heart': return <Heart className="w-8 h-8" />;
      case 'sparkles': return <Sparkles className="w-8 h-8" />;
      case 'book': return <BookOpen className="w-8 h-8" />;
      case 'target': return <Target className="w-8 h-8" />;
      case 'medal': return <Medal className="w-8 h-8" />;
      default: return <Award className="w-8 h-8" />;
    }
  };

  const fontClass = {
    'Cairo': "font-cairo font-['Cairo',sans-serif]",
    'Amiri': "font-amiri font-['Amiri',serif]",
    'Tajawal': "font-tajawal font-['Tajawal',sans-serif]",
    'Almarai': "font-almarai font-['Almarai',sans-serif]",
    'Aref Ruqaa': "font-aref-ruqaa font-['Aref_Ruqaa',serif]",
    'Reem Kufi': "font-reem-kufi font-['Reem_Kufi',sans-serif]",
    'Changa': "font-changa font-['Changa',sans-serif]",
    'El Messiri': "font-el-messiri font-['El_Messiri',serif]",
    'Lalezar': "font-lalezar font-['Lalezar',cursive]",
    'Kufam': "font-kufam font-['Kufam',sans-serif]",
    'Scheherazade New': "font-scheherazade-new font-['Scheherazade_New',serif]",
    'Vazirmatn': "font-vazirmatn font-['Vazirmatn',sans-serif]",
    'Harmattan': "font-harmattan font-['Harmattan',sans-serif]",
    'Marhey': "font-marhey font-['Marhey',cursive]",
  }[data.fontFamily] || "font-cairo font-['Cairo',sans-serif]";

  const getElementFontClass = (fieldKey: keyof ElementStyles) => {
    const isHeaderField = fieldKey === 'schoolHeader' || fieldKey === 'schoolName' || fieldKey === 'dateLocation';
    let customFont = data.elementStyles?.[fieldKey]?.fontFamily;
    if (!customFont && fieldKey === 'schoolName') {
      customFont = data.elementStyles?.schoolHeader?.fontFamily;
    }
    if (!customFont) {
      customFont = isHeaderField ? (data.headerFontFamily || 'Cairo') : data.fontFamily;
    }
    if (!customFont) return '';
    return {
      'Cairo': "font-cairo font-['Cairo',sans-serif]",
      'Amiri': "font-amiri font-['Amiri',serif]",
      'Tajawal': "font-tajawal font-['Tajawal',sans-serif]",
      'Almarai': "font-almarai font-['Almarai',sans-serif]",
      'Aref Ruqaa': "font-aref-ruqaa font-['Aref_Ruqaa',serif]",
      'Reem Kufi': "font-reem-kufi font-['Reem_Kufi',sans-serif]",
      'Changa': "font-changa font-['Changa',sans-serif]",
      'El Messiri': "font-el-messiri font-['El_Messiri',serif]",
      'Lalezar': "font-lalezar font-['Lalezar',cursive]",
      'Kufam': "font-kufam font-['Kufam',sans-serif]",
      'Scheherazade New': "font-scheherazade-new font-['Scheherazade_New',serif]",
      'Vazirmatn': "font-vazirmatn font-['Vazirmatn',sans-serif]",
      'Harmattan': "font-harmattan font-['Harmattan',sans-serif]",
      'Marhey': "font-marhey font-['Marhey',cursive]",
    }[customFont] || '';
  };

  const getSignatureFontClass = (fontFamily?: string) => {
    if (!fontFamily) return "font-aref-ruqaa font-['Aref_Ruqaa',serif]";
    return {
      'Aref Ruqaa': "font-aref-ruqaa font-['Aref_Ruqaa',serif]",
      'Aref Ruqaa Ink': "font-aref-ruqaa-ink font-['Aref_Ruqaa_Ink',serif]",
      'Ruwudu': "font-ruwudu font-['Ruwudu',serif]",
      'Rakkas': "font-rakkas font-['Rakkas',cursive]",
      'Lateef': "font-lateef font-['Lateef',cursive]",
      'Scheherazade New': "font-scheherazade-new font-['Scheherazade_New',serif]",
      'Marhey': "font-marhey font-['Marhey',cursive]",
      'Reem Kufi': "font-reem-kufi font-['Reem_Kufi',sans-serif]",
      'Lalezar': "font-lalezar font-['Lalezar',cursive]",
      'El Messiri': "font-el-messiri font-['El_Messiri',sans-serif]",
      'Amiri': "font-amiri font-['Amiri',serif]",
      'Great Vibes': "font-great-vibes font-['Great_Vibes',cursive]",
      'Dancing Script': "font-dancing-script font-['Dancing_Script',cursive]",
      'Caveat': "font-caveat font-['Caveat',cursive]",
      'Alex Brush': "font-alex-brush font-['Alex_Brush',cursive]",
    }[fontFamily] || "font-aref-ruqaa font-['Aref_Ruqaa',serif]";
  };

  // Helper to construct guaranteed explicit inline font-family CSS strings for html2canvas and export engines
  const getExplicitFontFamily = (fieldKey?: keyof ElementStyles, customFontOverride?: string): string => {
    const isHeaderField = fieldKey === 'schoolHeader' || fieldKey === 'schoolName' || fieldKey === 'dateLocation';
    const headerFont = data.headerFontFamily || 'Cairo';
    const baseFont = data.fontFamily || 'Cairo';
    
    let targetFont = customFontOverride;
    if (!targetFont && fieldKey) {
      targetFont = data.elementStyles?.[fieldKey]?.fontFamily;
      if (!targetFont && fieldKey === 'schoolName') {
        targetFont = data.elementStyles?.schoolHeader?.fontFamily;
      }
      if (!targetFont) {
        targetFont = isHeaderField ? headerFont : baseFont;
      }
    }
    if (!targetFont) {
      targetFont = baseFont;
    }

    return `'${targetFont}', '${targetFont.replace(/\s+/g, '')}', '${baseFont}', Cairo, Tajawal, Almarai, sans-serif, serif`;
  };

  const BASE_FONT_SIZES: Record<string, number> = {
    title: 36,
    subtitle: 18,
    recipientIntro: 18,
    studentName: 32,
    grade: 16,
    appreciationText: 18,
    poemOrQuote: 16,
    schoolHeader: 13,
    schoolName: 16,
    dateLocation: 14,
    watermarkText: 60,
    badgeTitle: 10,
  };

  // Absolute minimum font sizes in px to guarantee high readability and prestigious certificate appearance
  const MIN_FONT_SIZES: Record<string, number> = {
    title: 24,
    subtitle: 13,
    recipientIntro: 13,
    studentName: 22,
    grade: 12,
    appreciationText: 14,
    poemOrQuote: 12,
    schoolHeader: 10,
    schoolName: 12,
    dateLocation: 11,
    watermarkText: 24,
    badgeTitle: 8,
  };

  const getElementCssStyle = (fieldKey: keyof ElementStyles, defaultColor?: string) => {
    let style = data.elementStyles?.[fieldKey];

    // Fallback for schoolName from schoolHeader style if specific style overrides are missing
    if (fieldKey === 'schoolName') {
      const headerStyle = data.elementStyles?.schoolHeader;
      style = {
        fontFamily: style?.fontFamily || headerStyle?.fontFamily,
        align: style?.align || headerStyle?.align || 'right',
        color: style?.color || headerStyle?.color,
        fontWeight: style?.fontWeight || headerStyle?.fontWeight || 'bold',
        fontSize: style?.fontSize ?? (headerStyle?.fontSize ? Math.round(headerStyle.fontSize * 1.15) : 100),
        letterSpacing: style?.letterSpacing ?? headerStyle?.letterSpacing,
      };
    }

    const isHeaderField = fieldKey === 'schoolHeader' || fieldKey === 'schoolName' || fieldKey === 'dateLocation';

    // Top header fields use independent scale (data.headerFontSizeScale)
    const activeScale = isHeaderField ? (data.headerFontSizeScale ?? 1.0) : (data.fontSizeScale ?? 1.0);
    const basePx = BASE_FONT_SIZES[fieldKey as string] || 16;
    const minPx = MIN_FONT_SIZES[fieldKey as string] || 11;

    // Intelligent font scale determination:
    // If style?.fontSize is provided as a direct pixel size (<= 45), convert it to scale relative to basePx: style.fontSize / basePx.
    // If style?.fontSize is a percentage (e.g. 50 to 200, default 100), convert it to ratio: style.fontSize / 100.
    let elementScale = 1.0;
    if (typeof style?.fontSize === 'number' && style.fontSize > 0) {
      if (style.fontSize <= 45) {
        // Direct pixel size specification
        elementScale = style.fontSize / basePx;
      } else {
        // Percentage scale (100 = 100%)
        elementScale = style.fontSize / 100;
      }
    }

    let computedPx = Math.round(basePx * elementScale * activeScale);

    // Calculate length of element's text to apply subtle adaptive adjustments
    const getFieldValue = (): string => {
      switch (fieldKey) {
        case 'studentName': return data.studentName || '';
        case 'appreciationText': return data.appreciationText || '';
        case 'poemOrQuote': return data.poemOrQuote || '';
        case 'title': return data.title || '';
        case 'subtitle': return data.subtitle || '';
        case 'grade': return data.grade || '';
        case 'schoolName': return data.schoolName || '';
        case 'schoolHeader': return `${data.headerLine1 || ''} ${data.headerLine2 || ''} ${data.headerLine3 || ''} ${data.headerRightExtra || ''}`;
        case 'recipientIntro': return data.recipientIntro || '';
        case 'badgeTitle': return data.badgeTitle || '';
        case 'dateLocation': return `${data.issuePlace || ''} ${data.issueDateHijri || ''} ${data.issueDateGregorian || ''}`;
        default: return '';
      }
    };

    const textVal = getFieldValue();
    const textLen = textVal.trim().length;

    // Dynamic line-height and letter-spacing auto adjustment to balance spacing without shrinking text excessively
    let dynamicLineHeight: string | undefined = undefined;
    let dynamicLetterSpacing: string | undefined = style?.letterSpacing !== undefined ? `${style.letterSpacing}px` : undefined;
    let autoScaleFactor = 1.0;

    if (textLen > 0) {
      if (fieldKey === 'appreciationText') {
        if (textLen > 220) {
          dynamicLineHeight = '1.45';
          if (style?.letterSpacing === undefined) dynamicLetterSpacing = '-0.3px';
          autoScaleFactor = 0.95;
        } else if (textLen > 140) {
          dynamicLineHeight = '1.55';
          if (style?.letterSpacing === undefined) dynamicLetterSpacing = '-0.2px';
          autoScaleFactor = 0.98;
        } else if (textLen < 60) {
          dynamicLineHeight = '1.7';
          autoScaleFactor = 1.04;
        } else {
          dynamicLineHeight = '1.6';
        }
      } else if (fieldKey === 'poemOrQuote') {
        if (textLen > 90) {
          dynamicLineHeight = '1.35';
          if (style?.letterSpacing === undefined) dynamicLetterSpacing = '-0.3px';
          autoScaleFactor = 0.95;
        } else {
          dynamicLineHeight = '1.5';
        }
      } else if (fieldKey === 'studentName') {
        if (textLen > 40) {
          dynamicLineHeight = '1.2';
          if (style?.letterSpacing === undefined) dynamicLetterSpacing = '-0.4px';
          autoScaleFactor = 0.94;
        } else if (textLen < 18) {
          dynamicLineHeight = '1.3';
          autoScaleFactor = 1.05;
        } else {
          dynamicLineHeight = '1.3';
        }
      } else if (fieldKey === 'title') {
        if (textLen > 40) {
          dynamicLineHeight = '1.25';
          if (style?.letterSpacing === undefined) dynamicLetterSpacing = '-0.4px';
          autoScaleFactor = 0.94;
        } else if (textLen < 16) {
          dynamicLineHeight = '1.35';
          autoScaleFactor = 1.06;
        } else {
          dynamicLineHeight = '1.35';
        }
      } else if (fieldKey === 'schoolName' || fieldKey === 'schoolHeader') {
        if (textLen > 40) {
          dynamicLineHeight = '1.25';
          autoScaleFactor = 0.96;
        } else {
          dynamicLineHeight = '1.35';
        }
      } else {
        dynamicLineHeight = '1.5';
      }
    }

    // Apply autoScaleFactor while strictly enforcing minimum font size constraint
    const finalPx = Math.max(minPx, Math.round(computedPx * autoScaleFactor));

    const fw = style?.fontWeight === 'light' ? 300
      : style?.fontWeight === 'normal' ? 400
      : style?.fontWeight === 'bold' ? 700
      : style?.fontWeight === 'extrabold' ? 900
      : undefined;

    const headerFont = data.headerFontFamily || 'Cairo';
    const baseFont = data.fontFamily || 'Cairo';
    const fontFam = style?.fontFamily 
      || (fieldKey === 'schoolName' ? data.elementStyles?.schoolHeader?.fontFamily : undefined) 
      || (isHeaderField ? headerFont : baseFont);

    const explicitFontFamily = `'${fontFam}', '${fontFam.replace(/\s+/g, '')}', '${baseFont}', Cairo, Tajawal, Almarai, sans-serif, serif`;

    return {
      color: style?.color || defaultColor,
      fontSize: `${finalPx}px`,
      fontFamily: explicitFontFamily,
      textAlign: style?.align || undefined,
      fontWeight: fw !== undefined ? fw : undefined,
      marginTop: style?.marginTop !== undefined ? `${style.marginTop}px` : undefined,
      marginBottom: style?.marginBottom !== undefined ? `${style.marginBottom}px` : undefined,
      letterSpacing: dynamicLetterSpacing,
      lineHeight: dynamicLineHeight,
      wordBreak: 'break-word',
      overflowWrap: 'break-word',
    } as React.CSSProperties;
  };

  const handleFieldChange = (field: keyof CertificateData, val: any) => {
    if (onUpdateData) {
      onUpdateData({ [field]: val });
    }
  };

  const updateStampField = (field: 'title' | 'subtext', val: string) => {
    if (onUpdateData) {
      onUpdateData({
        stamp: {
          ...data.stamp,
          [field]: val
        }
      });
    }
  };

  const updateSignatureField = (id: string, field: 'title' | 'name' | 'signatureText', val: string) => {
    if (onUpdateData && data.signatures) {
      const updated = data.signatures.map(s => s.id === id ? { ...s, [field]: val } : s);
      onUpdateData({ signatures: updated });
    }
  };

  // Render On-Element Directional Arrow Navigation Bar
  const renderOnElementControls = () => {
    if (!selectedKey || !isDragModeActive || isExporting) return null;

    const isTopElement = selectedKey === 'schoolHeader' || selectedKey === 'logo';
    const floatPositionClass = isTopElement
      ? 'top-full mt-1 left-1/2 -translate-x-1/2'
      : '-top-11 left-1/2 -translate-x-1/2';

    return (
      <div
        className={`absolute ${floatPositionClass} flex items-center gap-1 bg-slate-900/95 text-white p-1 rounded-xl shadow-2xl border-2 border-amber-400 z-50 pointer-events-auto select-none dir-ltr`}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        {/* UP */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            startNudgeRepeat('up');
          }}
          onMouseUp={stopNudgeRepeat}
          onMouseLeave={stopNudgeRepeat}
          onTouchStart={(e) => {
            e.preventDefault();
            e.stopPropagation();
            startNudgeRepeat('up');
          }}
          onTouchEnd={stopNudgeRepeat}
          onTouchCancel={stopNudgeRepeat}
          onClick={(e) => e.stopPropagation()}
          className="w-6 h-6 sm:w-7 sm:h-7 bg-amber-500 hover:bg-amber-400 active:scale-90 text-slate-950 rounded-lg flex items-center justify-center shadow transition cursor-pointer"
          title="أعلى (اضغط للاستمرار)"
        >
          <ArrowUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        {/* DOWN */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            startNudgeRepeat('down');
          }}
          onMouseUp={stopNudgeRepeat}
          onMouseLeave={stopNudgeRepeat}
          onTouchStart={(e) => {
            e.preventDefault();
            e.stopPropagation();
            startNudgeRepeat('down');
          }}
          onTouchEnd={stopNudgeRepeat}
          onTouchCancel={stopNudgeRepeat}
          onClick={(e) => e.stopPropagation()}
          className="w-6 h-6 sm:w-7 sm:h-7 bg-amber-500 hover:bg-amber-400 active:scale-90 text-slate-950 rounded-lg flex items-center justify-center shadow transition cursor-pointer"
          title="أسفل (اضغط للاستمرار)"
        >
          <ArrowDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        {/* LEFT */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            startNudgeRepeat('left');
          }}
          onMouseUp={stopNudgeRepeat}
          onMouseLeave={stopNudgeRepeat}
          onTouchStart={(e) => {
            e.preventDefault();
            e.stopPropagation();
            startNudgeRepeat('left');
          }}
          onTouchEnd={stopNudgeRepeat}
          onTouchCancel={stopNudgeRepeat}
          onClick={(e) => e.stopPropagation()}
          className="w-6 h-6 sm:w-7 sm:h-7 bg-amber-500 hover:bg-amber-400 active:scale-90 text-slate-950 rounded-lg flex items-center justify-center shadow transition cursor-pointer"
          title="يسار (اضغط للاستمرار)"
        >
          <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        {/* RIGHT */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            startNudgeRepeat('right');
          }}
          onMouseUp={stopNudgeRepeat}
          onMouseLeave={stopNudgeRepeat}
          onTouchStart={(e) => {
            e.preventDefault();
            e.stopPropagation();
            startNudgeRepeat('right');
          }}
          onTouchEnd={stopNudgeRepeat}
          onTouchCancel={stopNudgeRepeat}
          onClick={(e) => e.stopPropagation()}
          className="w-6 h-6 sm:w-7 sm:h-7 bg-amber-500 hover:bg-amber-400 active:scale-90 text-slate-950 rounded-lg flex items-center justify-center shadow transition cursor-pointer"
          title="يمين (اضغط للاستمرار)"
        >
          <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        {/* Step Indicator / Toggle */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setNudgeStep((prev) => (prev === 1 ? 2 : prev === 2 ? 5 : prev === 5 ? 10 : 1));
          }}
          className="px-1.5 h-6 sm:h-7 bg-slate-800 hover:bg-slate-700 text-amber-300 font-mono font-bold text-[10px] rounded-lg border border-slate-700 flex items-center justify-center transition cursor-pointer"
          title="تغيير سرعة/خطوة الحركة بالبكسل"
        >
          {nudgeStep}px
        </button>
      </div>
    );
  };

  // Draggable Wrapper Helper
  const DraggableItem: React.FC<{
    elementKey: string;
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
  }> = ({ elementKey, children, className = '', style = {} }) => {
    const itemRef = useRef<HTMLDivElement>(null);
    let pos = data.positions?.[elementKey as keyof ElementPositions];
    if (pos) {
      if (elementKey === 'signaturesBlock') {
        const clampedY = Math.max(-25, Math.min(25, pos.y));
        const clampedX = Math.max(-40, Math.min(40, pos.x));
        if (clampedY !== pos.y || clampedX !== pos.x) {
          pos = { x: clampedX, y: clampedY };
        }
      }
    }
    const isCustom = !!pos;
    const isBeingDragged = draggingKey === elementKey;
    const isSelected = selectedKey === elementKey && isDragModeActive;

    const mergedStyle: React.CSSProperties = {
      ...style,
      ...(isCustom
        ? {
            transform: `translate(${pos.x}px, ${pos.y}px)`,
            zIndex: isBeingDragged ? 45 : isSelected ? 40 : 30,
          }
        : {}),
    };

    return (
      <div
        ref={itemRef}
        onClick={(e) => {
          if (isDragModeActive) {
            e.stopPropagation();
            setSelectedKey(elementKey);
          }
        }}
        onMouseDown={(e) => handleStartDrag(e, elementKey, itemRef.current)}
        onTouchStart={(e) => handleStartDrag(e, elementKey, itemRef.current)}
        className={`group/drag relative transition-all ${
          isDragModeActive
            ? 'cursor-grab active:cursor-grabbing hover:ring-2 hover:ring-amber-500/80 hover:ring-dashed rounded-xl p-1'
            : ''
        } ${isBeingDragged ? 'ring-2 ring-amber-500 ring-offset-2 scale-[1.01] shadow-xl z-50' : ''} ${
          isSelected ? 'ring-2 ring-amber-500 ring-offset-1 bg-amber-500/5 rounded-xl z-40' : ''
        } ${className}`}
        style={mergedStyle}
      >
        {isDragModeActive && !isExporting && (
          <span
            className={`absolute -top-2.5 -right-2 p-1 rounded-full text-[9px] shadow-md z-30 transition cursor-pointer ${
              isSelected
                ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-300 font-bold scale-110'
                : 'bg-slate-800 text-white opacity-80 group-hover/drag:opacity-100'
            }`}
            title="انقر لتحديد هذا العنصر تحضيراً لتحريكه بالأسهم"
          >
            <Move className="w-3 h-3" />
          </span>
        )}

        {/* Selected outline corner handles & Floating Arrow Controls */}
        {isSelected && !isExporting && (
          <>
            <div className="absolute inset-0 border-2 border-amber-500 rounded-xl pointer-events-none z-20">
              <span className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-amber-500 rounded-full border-2 border-white" />
              <span className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-amber-500 rounded-full border-2 border-white" />
              <span className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-amber-500 rounded-full border-2 border-white" />
              <span className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-amber-500 rounded-full border-2 border-white" />
            </div>

            {/* On-element Arrow Movement Controls */}
            {renderOnElementControls()}
          </>
        )}

        {children}
      </div>
    );
  };

  // Inline Editable Helper Component
  const InlineEdit: React.FC<{
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
    className?: string;
    style?: React.CSSProperties;
    multiline?: boolean;
    rows?: number;
    inline?: boolean;
  }> = ({ value, onChange, placeholder = '', className = '', style = {}, multiline = false, inline = false }) => {
    // Helper to strip classes that cause text clipping or truncation
    const sanitizeCls = (cls: string) => {
      return cls
        .replace(/\btruncate\b/g, '')
        .replace(/\boverflow-hidden\b/g, '')
        .replace(/\btext-ellipsis\b/g, '')
        .replace(/\bmax-w-[^\s]+\b/g, '')
        .trim();
    };

    const cleanClassName = sanitizeCls(className);
    const customLineHeight = (style as Record<string, unknown>)?.lineHeight as string | undefined;
    const customLetterSpacing = (style as Record<string, unknown>)?.letterSpacing as string | undefined;
    const styleTextAlign = (((style as Record<string, unknown>)?.textAlign as React.CSSProperties['textAlign']) ||
      (cleanClassName.includes('text-right') ? 'right' : cleanClassName.includes('text-left') ? 'left' : 'center')) as React.CSSProperties['textAlign'];

    const isEditable = !isExporting && !!onUpdateData;
    const displayValue = value || (isExporting ? placeholder : '');

    // Determine whitespace class based on multiline or caller preferences
    const whitespaceCls = cleanClassName.includes('whitespace-')
      ? ''
      : multiline
      ? 'whitespace-pre-wrap'
      : 'whitespace-nowrap';

    const baseCertFont = data.fontFamily || 'Cairo';
    const explicitFontFamily = (style as React.CSSProperties | undefined)?.fontFamily ||
      `'${baseCertFont}', '${baseCertFont.replace(/\s+/g, '')}', Cairo, Tajawal, Almarai, sans-serif, serif`;

    if (!isEditable) {
      return (
        <span
          className={`${cleanClassName} ${whitespaceCls} ${inline ? 'inline-block align-middle' : 'block'}`}
          style={{
            textAlign: styleTextAlign,
            lineHeight: customLineHeight || (multiline ? '1.5' : '1.25'),
            letterSpacing: customLetterSpacing || 'normal',
            wordBreak: multiline ? 'break-word' : 'normal',
            overflowWrap: multiline ? 'break-word' : 'normal',
            whiteSpace: multiline ? 'pre-wrap' : (cleanClassName.includes('whitespace-') ? undefined : 'nowrap'),
            ...style,
            fontFamily: (style as React.CSSProperties | undefined)?.fontFamily || explicitFontFamily,
          }}
          dir="auto"
        >
          {displayValue || placeholder}
        </span>
      );
    }

    return (
      <div
        className={`relative group/inline ${inline ? 'inline-flex items-center align-middle' : 'w-full max-w-full flex flex-col'}`}
        style={{
          alignItems: styleTextAlign === 'right' ? 'flex-end' : styleTextAlign === 'left' ? 'flex-start' : 'center',
          justifyContent: 'center',
          margin: (style as Record<string, unknown>)?.margin as string | undefined || (inline ? undefined : '0 auto'),
        }}
      >
        <div
          contentEditable={isEditable}
          suppressContentEditableWarning
          onBlur={(e) => {
            const text = e.currentTarget.innerText.trim();
            onChange(text);
          }}
          onKeyDown={(e) => {
            if (!multiline && e.key === 'Enter') {
              e.preventDefault();
              e.currentTarget.blur();
            }
          }}
          data-placeholder={placeholder}
          className={`${cleanClassName} outline-none hover:ring-1 hover:ring-amber-400/60 focus:ring-2 focus:ring-amber-400/80 rounded transition-all cursor-text ${whitespaceCls} ${inline ? 'inline-block' : 'max-w-full'}`}
          style={{
            textAlign: styleTextAlign,
            lineHeight: customLineHeight || (multiline ? '1.5' : '1.25'),
            letterSpacing: customLetterSpacing || 'normal',
            wordBreak: multiline ? 'break-word' : 'normal',
            overflowWrap: multiline ? 'break-word' : 'normal',
            whiteSpace: multiline ? 'pre-wrap' : (cleanClassName.includes('whitespace-') ? undefined : 'nowrap'),
            minHeight: '1em',
            margin: inline ? undefined : '0 auto',
            ...style,
            fontFamily: (style as React.CSSProperties | undefined)?.fontFamily || explicitFontFamily,
          }}
          dir="auto"
        >
          {displayValue || placeholder}
        </div>
        <span className="opacity-0 group-hover/inline:opacity-100 transition-opacity absolute -top-3.5 left-1/2 -translate-x-1/2 bg-amber-700 text-white text-[10px] px-1.5 py-0.5 rounded shadow pointer-events-none z-30 font-sans font-bold flex items-center gap-1 whitespace-nowrap">
          <Edit3 className="w-2.5 h-2.5" /> تحرير
        </span>
      </div>
    );
  };

  // Frame Border Styles with independent color, thickness, and style controls
  const renderFrameBorders = () => {
    const frameColor = data.borderColor || data.primaryColor || '#d97706';
    const frameSecColor = data.borderSecondaryColor || data.secondaryColor || '#f59e0b';
    const bwScale = data.borderWidth !== undefined ? data.borderWidth : 2; // 1 to 10 scale
    const baseInset = data.borderPadding !== undefined ? data.borderPadding : 12; // in px
    const wPx = Math.max(1, Math.round(bwScale * 1.5)); // px width
    const wPxThick = Math.max(2, Math.round(bwScale * 3)); // thick px width

    if (data.customFrameUrl) {
      return (
        <div
          className="absolute pointer-events-none z-10 transition-all duration-300"
          style={{
            top: `${baseInset}px`,
            bottom: `${baseInset}px`,
            left: `${baseInset}px`,
            right: `${baseInset}px`,
          }}
        >
          <img
            src={data.customFrameUrl}
            alt="Custom Certificate Frame"
            className="w-full h-full object-fill pointer-events-none"
            style={{
              opacity: data.customFrameOpacity ?? 1,
            }}
          />
        </div>
      );
    }

    switch (data.frameStyle) {
      case 'double-gold':
        return (
          <>
            <div
              className="absolute pointer-events-none rounded-lg shadow-xs"
              style={{
                top: `${baseInset}px`,
                bottom: `${baseInset}px`,
                left: `${baseInset}px`,
                right: `${baseInset}px`,
                borderStyle: 'solid',
                borderWidth: `${wPxThick}px`,
                borderColor: frameColor,
              }}
            />
            <div
              className="absolute pointer-events-none rounded-sm"
              style={{
                top: `${baseInset + 8}px`,
                bottom: `${baseInset + 8}px`,
                left: `${baseInset + 8}px`,
                right: `${baseInset + 8}px`,
                borderStyle: 'solid',
                borderWidth: `${Math.max(1, wPx - 1)}px`,
                borderColor: frameSecColor,
              }}
            />
            <div
              className="absolute w-12 h-12 rounded-tl-md pointer-events-none"
              style={{
                top: `${baseInset + 4}px`,
                left: `${baseInset + 4}px`,
                borderTop: `${wPxThick + 1}px solid ${frameColor}`,
                borderLeft: `${wPxThick + 1}px solid ${frameColor}`,
              }}
            />
            <div
              className="absolute w-12 h-12 rounded-tr-md pointer-events-none"
              style={{
                top: `${baseInset + 4}px`,
                right: `${baseInset + 4}px`,
                borderTop: `${wPxThick + 1}px solid ${frameColor}`,
                borderRight: `${wPxThick + 1}px solid ${frameColor}`,
              }}
            />
            <div
              className="absolute w-12 h-12 rounded-bl-md pointer-events-none"
              style={{
                bottom: `${baseInset + 4}px`,
                left: `${baseInset + 4}px`,
                borderBottom: `${wPxThick + 1}px solid ${frameColor}`,
                borderLeft: `${wPxThick + 1}px solid ${frameColor}`,
              }}
            />
            <div
              className="absolute w-12 h-12 rounded-br-md pointer-events-none"
              style={{
                bottom: `${baseInset + 4}px`,
                right: `${baseInset + 4}px`,
                borderBottom: `${wPxThick + 1}px solid ${frameColor}`,
                borderRight: `${wPxThick + 1}px solid ${frameColor}`,
              }}
            />
          </>
        );

      case 'guilloche-royal':
        return (
          <>
            <div
              className="absolute pointer-events-none"
              style={{
                top: `${baseInset}px`,
                bottom: `${baseInset}px`,
                left: `${baseInset}px`,
                right: `${baseInset}px`,
                border: `${wPxThick}px double ${frameColor}`,
              }}
            />
            <div
              className="absolute pointer-events-none"
              style={{
                top: `${baseInset + 10}px`,
                bottom: `${baseInset + 10}px`,
                left: `${baseInset + 10}px`,
                right: `${baseInset + 10}px`,
                border: `${wPx}px dashed ${frameSecColor}`,
              }}
            />
            {[
              { pos: 'top-2 left-2', rot: '0deg' },
              { pos: 'top-2 right-2', rot: '90deg' },
              { pos: 'bottom-2 left-2', rot: '270deg' },
              { pos: 'bottom-2 right-2', rot: '180deg' },
            ].map((c, i) => (
              <div key={i} className={`absolute ${c.pos} w-14 h-14 pointer-events-none`} style={{ transform: `rotate(${c.rot})` }}>
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  <circle cx="50" cy="50" r="42" fill="none" stroke={frameColor} strokeWidth={bwScale} strokeDasharray="3 3" />
                  <circle cx="50" cy="50" r="32" fill="none" stroke={frameSecColor} strokeWidth={bwScale} />
                  <path d="M50 10 C30 50 70 50 50 90 M10 50 C50 30 50 70 90 50" fill="none" stroke={frameColor} strokeWidth={bwScale} />
                  <polygon points="50,20 60,40 80,50 60,60 50,80 40,60 20,50 40,40" fill={frameSecColor} opacity="0.8" />
                </svg>
              </div>
            ))}
          </>
        );

      case 'golden-vines':
        return (
          <>
            <div
              className="absolute pointer-events-none rounded-2xl"
              style={{
                top: `${baseInset}px`,
                bottom: `${baseInset}px`,
                left: `${baseInset}px`,
                right: `${baseInset}px`,
                border: `${wPxThick}px solid ${frameColor}`,
              }}
            />
            <div
              className="absolute pointer-events-none rounded-xl"
              style={{
                top: `${baseInset + 6}px`,
                bottom: `${baseInset + 6}px`,
                left: `${baseInset + 6}px`,
                right: `${baseInset + 6}px`,
                border: `${wPx}px dotted ${frameSecColor}`,
              }}
            />
            {[
              { pos: 'top-1 left-1', tf: 'none' },
              { pos: 'top-1 right-1', tf: 'scaleX(-1)' },
              { pos: 'bottom-1 left-1', tf: 'scaleY(-1)' },
              { pos: 'bottom-1 right-1', tf: 'scale(-1, -1)' },
            ].map((item, i) => (
              <div key={i} className={`absolute ${item.pos} w-16 h-16 pointer-events-none`} style={{ transform: item.tf }}>
                <svg viewBox="0 0 100 100" fill="none" stroke={frameColor} strokeWidth={Math.max(2, bwScale)}>
                  <path d="M10 90 C 20 50, 50 20, 90 10" />
                  <path d="M30 65 C 20 60, 15 45, 25 45 C 35 45, 35 60, 30 65" fill={frameSecColor} />
                  <path d="M55 40 C 45 35, 40 20, 50 20 C 60 20, 60 35, 55 40" fill={frameSecColor} />
                  <path d="M75 25 C 65 20, 60 5, 70 5 C 80 5, 80 20, 75 25" fill={frameSecColor} />
                  <circle cx="20" cy="80" r="4" fill={frameColor} />
                </svg>
              </div>
            ))}
          </>
        );

      case 'andalusian-star':
        return (
          <>
            <div
              className="absolute pointer-events-none"
              style={{
                top: `${baseInset}px`,
                bottom: `${baseInset}px`,
                left: `${baseInset}px`,
                right: `${baseInset}px`,
                border: `${wPxThick}px solid ${frameColor}`,
              }}
            />
            <div
              className="absolute pointer-events-none"
              style={{
                top: `${baseInset + 10}px`,
                bottom: `${baseInset + 10}px`,
                left: `${baseInset + 10}px`,
                right: `${baseInset + 10}px`,
                border: `${wPx}px solid ${frameSecColor}`,
              }}
            />
            {[
              'top-2 left-2',
              'top-2 right-2',
              'bottom-2 left-2',
              'bottom-2 right-2',
            ].map((pos, i) => (
              <div key={i} className={`absolute ${pos} w-12 h-12 pointer-events-none flex items-center justify-center`}>
                <div
                  className="w-10 h-10 flex items-center justify-center border shadow-xs"
                  style={{ transform: 'rotate(45deg)', backgroundColor: frameColor, borderColor: frameSecColor, borderWidth: `${wPx}px` }}
                >
                  <div
                    className="w-7 h-7 flex items-center justify-center"
                    style={{ transform: 'rotate(45deg)', backgroundColor: frameSecColor }}
                  >
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: frameColor }} />
                  </div>
                </div>
              </div>
            ))}
          </>
        );

      case 'floral-corners':
        return (
          <>
            <div
              className="absolute pointer-events-none rounded-lg"
              style={{
                top: `${baseInset}px`,
                bottom: `${baseInset}px`,
                left: `${baseInset}px`,
                right: `${baseInset}px`,
                border: `${wPxThick}px solid ${frameColor}`,
              }}
            />
            <div
              className="absolute pointer-events-none"
              style={{
                top: `${baseInset + 8}px`,
                bottom: `${baseInset + 8}px`,
                left: `${baseInset + 8}px`,
                right: `${baseInset + 8}px`,
                border: `${wPx}px dashed ${frameSecColor}`,
              }}
            />
            {[
              { pos: 'top-1 left-1', tf: 'none' },
              { pos: 'top-1 right-1', tf: 'scaleX(-1)' },
              { pos: 'bottom-1 left-1', tf: 'scaleY(-1)' },
              { pos: 'bottom-1 right-1', tf: 'scale(-1, -1)' },
            ].map((item, i) => (
              <div key={i} className={`absolute ${item.pos} w-16 h-16 pointer-events-none`} style={{ transform: item.tf }}>
                <svg viewBox="0 0 100 100" fill="currentColor" style={{ color: frameColor }}>
                  <path d="M10 10 H80 V20 H20 V80 H10 Z" />
                  <circle cx="35" cy="35" r="8" fill={frameSecColor} />
                  <path d="M35 15 C45 15, 50 25, 35 35 C20 25, 25 15, 35 15 Z" fill={frameColor} />
                  <path d="M15 35 C15 45, 25 50, 35 35 C25 20, 15 25, 15 35 Z" fill={frameColor} />
                </svg>
              </div>
            ))}
          </>
        );

      case 'greek-key-meander':
        return (
          <>
            <div
              className="absolute pointer-events-none"
              style={{
                top: `${baseInset}px`,
                bottom: `${baseInset}px`,
                left: `${baseInset}px`,
                right: `${baseInset}px`,
                border: `${wPxThick + 2}px solid ${frameColor}`,
              }}
            />
            <div
              className="absolute pointer-events-none"
              style={{
                top: `${baseInset + 8}px`,
                bottom: `${baseInset + 8}px`,
                left: `${baseInset + 8}px`,
                right: `${baseInset + 8}px`,
                border: `${wPx}px solid ${frameSecColor}`,
              }}
            />
            {[
              'top-2 left-2',
              'top-2 right-2',
              'bottom-2 left-2',
              'bottom-2 right-2',
            ].map((pos, i) => (
              <div key={i} className={`absolute ${pos} w-10 h-10 pointer-events-none`}>
                <svg viewBox="0 0 50 50" fill="none" stroke={frameColor} strokeWidth={Math.max(2, bwScale)}>
                  <path d="M5 5 H45 V45 H5 Z M12 12 H38 V38 H12 Z M18 18 H32 V32 H18 Z" fill={frameSecColor} opacity="0.3" />
                </svg>
              </div>
            ))}
          </>
        );

      case 'moroccan-mosaic':
        return (
          <>
            <div
              className="absolute pointer-events-none rounded-xl"
              style={{
                top: `${baseInset}px`,
                bottom: `${baseInset}px`,
                left: `${baseInset}px`,
                right: `${baseInset}px`,
                border: `${wPxThick + 3}px solid ${frameColor}`,
              }}
            />
            <div
              className="absolute pointer-events-none rounded-lg"
              style={{
                top: `${baseInset + 8}px`,
                bottom: `${baseInset + 8}px`,
                left: `${baseInset + 8}px`,
                right: `${baseInset + 8}px`,
                border: `${wPx}px dotted ${frameSecColor}`,
              }}
            />
            {[
              'top-2 left-2',
              'top-2 right-2',
              'bottom-2 left-2',
              'bottom-2 right-2',
            ].map((pos, i) => (
              <div key={i} className={`absolute ${pos} w-10 h-10 pointer-events-none flex items-center justify-center`}>
                <div className="w-8 h-8 rounded-md flex items-center justify-center shadow-xs" style={{ transform: 'rotate(45deg)', backgroundColor: frameSecColor }}>
                  <div className="w-4 h-4 rounded-xs" style={{ backgroundColor: frameColor }} />
                </div>
              </div>
            ))}
          </>
        );

      case 'victorian-crest':
        return (
          <>
            <div
              className="absolute pointer-events-none"
              style={{
                top: `${baseInset}px`,
                bottom: `${baseInset}px`,
                left: `${baseInset}px`,
                right: `${baseInset}px`,
                border: `${wPxThick}px double ${frameColor}`,
              }}
            />
            <div
              className="absolute pointer-events-none"
              style={{
                top: `${baseInset + 12}px`,
                bottom: `${baseInset + 12}px`,
                left: `${baseInset + 12}px`,
                right: `${baseInset + 12}px`,
                border: `${wPx}px solid ${frameSecColor}`,
              }}
            />
            <div className="absolute top-0 left-1/2 pointer-events-none flex flex-col items-center" style={{ transform: 'translateX(-50%)' }}>
              <svg width="120" height="24" viewBox="0 0 120 24" fill={frameColor}>
                <path d="M0 0 C 40 24, 80 24, 120 0 L 100 24 L 20 24 Z" />
                <circle cx="60" cy="10" r="4" fill={frameSecColor} />
              </svg>
            </div>
            {[
              { pos: 'top-2 left-2', tf: 'none' },
              { pos: 'top-2 right-2', tf: 'scaleX(-1)' },
              { pos: 'bottom-2 left-2', tf: 'scaleY(-1)' },
              { pos: 'bottom-2 right-2', tf: 'scale(-1, -1)' },
            ].map((item, i) => (
              <div key={i} className={`absolute ${item.pos} w-12 h-12 pointer-events-none`} style={{ transform: item.tf }}>
                <svg viewBox="0 0 100 100" fill={frameColor}>
                  <path d="M10 10 H90 V25 C 50 25, 25 50, 25 90 H10 Z" />
                  <circle cx="45" cy="45" r="7" fill={frameSecColor} />
                </svg>
              </div>
            ))}
          </>
        );

      case 'double-dotted-luxury':
        return (
          <>
            <div
              className="absolute pointer-events-none rounded-2xl"
              style={{
                top: `${baseInset}px`,
                bottom: `${baseInset}px`,
                left: `${baseInset}px`,
                right: `${baseInset}px`,
                border: `${wPxThick}px solid ${frameColor}`,
              }}
            />
            <div
              className="absolute pointer-events-none rounded-xl"
              style={{
                top: `${baseInset + 6}px`,
                bottom: `${baseInset + 6}px`,
                left: `${baseInset + 6}px`,
                right: `${baseInset + 6}px`,
                border: `${wPxThick + 1}px dotted ${frameSecColor}`,
              }}
            />
            <div
              className="absolute pointer-events-none rounded-lg"
              style={{
                top: `${baseInset + 14}px`,
                bottom: `${baseInset + 14}px`,
                left: `${baseInset + 14}px`,
                right: `${baseInset + 14}px`,
                border: `${wPx}px dashed ${frameColor}`,
              }}
            />
          </>
        );

      case 'emerald-border':
        return (
          <>
            <div
              className="absolute pointer-events-none rounded-xl"
              style={{
                top: `${baseInset}px`,
                bottom: `${baseInset}px`,
                left: `${baseInset}px`,
                right: `${baseInset}px`,
                borderStyle: 'solid',
                borderWidth: `${wPxThick}px`,
                borderColor: frameColor,
              }}
            />
            <div
              className="absolute pointer-events-none rounded-lg"
              style={{
                top: `${baseInset + 8}px`,
                bottom: `${baseInset + 8}px`,
                left: `${baseInset + 8}px`,
                right: `${baseInset + 8}px`,
                borderStyle: 'dashed',
                borderWidth: `${wPx}px`,
                borderColor: frameSecColor,
              }}
            />
            {[
              'top-4 left-4',
              'top-4 right-4',
              'bottom-4 left-4',
              'bottom-4 right-4',
            ].map((pos, i) => (
              <div
                key={i}
                className={`absolute ${pos} w-7 h-7 opacity-90 pointer-events-none`}
                style={{ transform: 'rotate(45deg)', backgroundColor: frameColor }}
              />
            ))}
          </>
        );

      case 'royal-ribbon':
        return (
          <>
            <div
              className="absolute pointer-events-none"
              style={{
                top: `${baseInset}px`,
                bottom: `${baseInset}px`,
                left: `${baseInset}px`,
                right: `${baseInset}px`,
                borderStyle: 'solid',
                borderWidth: `${wPxThick + 4}px`,
                borderColor: frameColor,
              }}
            />
            <div
              className="absolute pointer-events-none"
              style={{
                top: `${baseInset + 12}px`,
                bottom: `${baseInset + 12}px`,
                left: `${baseInset + 12}px`,
                right: `${baseInset + 12}px`,
                borderStyle: 'solid',
                borderWidth: `${wPx}px`,
                borderColor: frameSecColor,
              }}
            />
            <div
              className="absolute top-0 left-1/2 text-xs px-6 py-1 font-bold rounded-b-md shadow-md pointer-events-none z-10"
              style={{ transform: 'translateX(-50%)', backgroundColor: frameColor, color: frameSecColor }}
            >
              شهادة شرف رسمية
            </div>
          </>
        );

      case 'classic-ornate':
        return (
          <>
            <div
              className="absolute pointer-events-none"
              style={{
                top: `${baseInset}px`,
                bottom: `${baseInset}px`,
                left: `${baseInset}px`,
                right: `${baseInset}px`,
                border: `${wPx}px solid ${frameColor}`,
              }}
            />
            <div
              className="absolute pointer-events-none"
              style={{
                top: `${baseInset + 6}px`,
                bottom: `${baseInset + 6}px`,
                left: `${baseInset + 6}px`,
                right: `${baseInset + 6}px`,
                border: `${wPxThick}px solid ${frameSecColor}`,
              }}
            />
            <div
              className="absolute pointer-events-none"
              style={{
                top: `${baseInset + 14}px`,
                bottom: `${baseInset + 14}px`,
                left: `${baseInset + 14}px`,
                right: `${baseInset + 14}px`,
                border: `${wPx}px solid ${frameColor}`,
              }}
            />
          </>
        );

      case 'modern-geometric':
        return (
          <>
            <div
              className="absolute top-0 left-0 w-32 h-32 rounded-br-full pointer-events-none opacity-20"
              style={{ backgroundColor: frameColor }}
            />
            <div
              className="absolute bottom-0 right-0 w-32 h-32 rounded-tl-full pointer-events-none opacity-20"
              style={{ backgroundColor: frameSecColor }}
            />
            <div
              className="absolute pointer-events-none"
              style={{
                top: `${baseInset}px`,
                bottom: `${baseInset}px`,
                left: `${baseInset}px`,
                right: `${baseInset}px`,
                border: `${wPxThick}px solid ${frameColor}`,
              }}
            />
          </>
        );

      case 'playful-dots':
        return (
          <>
            <div
              className="absolute pointer-events-none rounded-2xl"
              style={{
                top: `${baseInset}px`,
                bottom: `${baseInset}px`,
                left: `${baseInset}px`,
                right: `${baseInset}px`,
                border: `${wPxThick}px dashed ${frameColor}`,
              }}
            />
            {[
              'top-2 left-2',
              'top-2 right-2',
              'bottom-2 left-2',
              'bottom-2 right-2',
            ].map((pos, i) => (
              <div
                key={i}
                className={`absolute ${pos} w-6 h-6 rounded-full pointer-events-none`}
                style={{ backgroundColor: frameSecColor }}
              />
            ))}
          </>
        );

      case 'islamic-arch':
        return (
          <>
            <div
              className="absolute pointer-events-none rounded-lg"
              style={{
                top: `${baseInset}px`,
                bottom: `${baseInset}px`,
                left: `${baseInset}px`,
                right: `${baseInset}px`,
                border: `${wPxThick}px solid ${frameColor}`,
              }}
            />
            <div
              className="absolute pointer-events-none"
              style={{
                top: `${baseInset + 8}px`,
                bottom: `${baseInset + 8}px`,
                left: `${baseInset + 8}px`,
                right: `${baseInset + 8}px`,
                border: `${wPx}px solid ${frameSecColor}`,
              }}
            />
          </>
        );

      case 'baroque-gold':
        return (
          <>
            <div
              className="absolute pointer-events-none rounded-lg shadow-md"
              style={{
                top: `${baseInset}px`,
                bottom: `${baseInset}px`,
                left: `${baseInset}px`,
                right: `${baseInset}px`,
                border: `${wPxThick + 2}px solid ${frameColor}`,
              }}
            />
            <div
              className="absolute pointer-events-none rounded-sm"
              style={{
                top: `${baseInset + 8}px`,
                bottom: `${baseInset + 8}px`,
                left: `${baseInset + 8}px`,
                right: `${baseInset + 8}px`,
                border: `${wPx}px solid ${frameSecColor}`,
              }}
            />
            {[
              { pos: 'top-1 left-1', tf: 'none' },
              { pos: 'top-1 right-1', tf: 'scaleX(-1)' },
              { pos: 'bottom-1 left-1', tf: 'scaleY(-1)' },
              { pos: 'bottom-1 right-1', tf: 'scale(-1, -1)' },
            ].map((item, i) => (
              <div key={i} className={`absolute ${item.pos} w-11 h-11 pointer-events-none`} style={{ color: frameColor, transform: item.tf }}>
                <svg viewBox="0 0 100 100" fill="currentColor">
                  <path d="M10,10 L90,10 L90,20 L20,20 L20,90 L10,90 Z M30,30 L70,30 L30,70 Z M40,10 C20,10 10,20 10,40 C10,25 25,10 40,10 Z" opacity="0.95"/>
                  <circle cx="25" cy="25" r="5" fill={frameSecColor}/>
                </svg>
              </div>
            ))}
          </>
        );

      case 'vintage-certificate':
        return (
          <>
            <div
              className="absolute pointer-events-none rounded-sm"
              style={{
                top: `${baseInset}px`,
                bottom: `${baseInset}px`,
                left: `${baseInset}px`,
                right: `${baseInset}px`,
                border: `${wPxThick}px solid ${frameColor}`,
              }}
            />
            <div
              className="absolute pointer-events-none"
              style={{
                top: `${baseInset + 8}px`,
                bottom: `${baseInset + 8}px`,
                left: `${baseInset + 8}px`,
                right: `${baseInset + 8}px`,
                border: `${wPx}px dashed ${frameSecColor}`,
              }}
            />
            {[
              'top-3 left-3',
              'top-3 right-3',
              'bottom-3 left-3',
              'bottom-3 right-3',
            ].map((pos, i) => (
              <div key={i} className={`absolute ${pos} w-8 h-8 pointer-events-none flex items-center justify-center border`} style={{ borderColor: frameColor }}>
                <span className="w-2 h-2" style={{ transform: 'rotate(45deg)', backgroundColor: frameSecColor }} />
              </div>
            ))}
          </>
        );

      case 'oriental-islamic':
        return (
          <>
            <div
              className="absolute pointer-events-none rounded-lg"
              style={{
                top: `${baseInset}px`,
                bottom: `${baseInset}px`,
                left: `${baseInset}px`,
                right: `${baseInset}px`,
                border: `${wPxThick}px solid ${frameColor}`,
              }}
            />
            <div
              className="absolute pointer-events-none"
              style={{
                top: `${baseInset + 8}px`,
                bottom: `${baseInset + 8}px`,
                left: `${baseInset + 8}px`,
                right: `${baseInset + 8}px`,
                border: `${wPx}px solid ${frameSecColor}`,
              }}
            />
            {['top-2 left-2', 'top-2 right-2', 'bottom-2 left-2', 'bottom-2 right-2'].map((pos, i) => (
              <div key={i} className={`absolute ${pos} w-8 h-8 pointer-events-none flex items-center justify-center`}>
                <div className="w-6 h-6 border flex items-center justify-center" style={{ transform: 'rotate(45deg)', backgroundColor: frameColor, borderColor: frameSecColor }}>
                  <div className="w-3 h-3" style={{ transform: 'rotate(45deg)', backgroundColor: frameSecColor }} />
                </div>
              </div>
            ))}
          </>
        );

      case 'luxurious-gradient-border':
        return (
          <>
            <div
              className="absolute pointer-events-none rounded-2xl shadow-lg"
              style={{
                top: `${baseInset}px`,
                bottom: `${baseInset}px`,
                left: `${baseInset}px`,
                right: `${baseInset}px`,
                border: `${wPxThick + 4}px solid ${frameColor}`,
              }}
            />
            <div
              className="absolute pointer-events-none rounded-xl"
              style={{
                top: `${baseInset + 10}px`,
                bottom: `${baseInset + 10}px`,
                left: `${baseInset + 10}px`,
                right: `${baseInset + 10}px`,
                border: `${wPx}px solid ${frameSecColor}`,
              }}
            />
            {['top-2 left-2', 'top-2 right-2', 'bottom-2 left-2', 'bottom-2 right-2'].map((pos, i) => (
              <div key={i} className={`absolute ${pos} w-9 h-9 border rounded-full flex items-center justify-center shadow-xs pointer-events-none`} style={{ borderColor: frameColor, backgroundColor: '#fff' }}>
                <span className="w-4 h-4 rounded-full" style={{ backgroundColor: frameSecColor }} />
              </div>
            ))}
          </>
        );

      case 'wavy-artistic':
        return (
          <>
            <div
              className="absolute pointer-events-none rounded-3xl"
              style={{
                top: `${baseInset}px`,
                bottom: `${baseInset}px`,
                left: `${baseInset}px`,
                right: `${baseInset}px`,
                border: `${wPxThick}px solid ${frameColor}`,
              }}
            />
            <div
              className="absolute pointer-events-none rounded-2xl"
              style={{
                top: `${baseInset + 10}px`,
                bottom: `${baseInset + 10}px`,
                left: `${baseInset + 10}px`,
                right: `${baseInset + 10}px`,
                border: `${wPx}px dashed ${frameSecColor}`,
              }}
            />
            {['top-2 left-2', 'top-2 right-2', 'bottom-2 left-2', 'bottom-2 right-2'].map((pos, i) => (
              <div key={i} className={`absolute ${pos} w-7 h-7 rounded-full opacity-80 pointer-events-none`} style={{ backgroundColor: frameColor }} />
            ))}
          </>
        );

      case 'geometric-cyber':
        return (
          <>
            <div
              className="absolute pointer-events-none"
              style={{
                top: `${baseInset}px`,
                bottom: `${baseInset}px`,
                left: `${baseInset}px`,
                right: `${baseInset}px`,
                border: `${wPxThick}px solid ${frameColor}`,
                boxShadow: `0 0 12px ${frameColor}40`,
              }}
            />
            <div
              className="absolute pointer-events-none"
              style={{
                top: `${baseInset + 8}px`,
                bottom: `${baseInset + 8}px`,
                left: `${baseInset + 8}px`,
                right: `${baseInset + 8}px`,
                border: `${wPx}px solid ${frameSecColor}`,
              }}
            />
            <div className="absolute top-0 left-0 w-8 h-8 pointer-events-none" style={{ borderTop: `4px solid ${frameColor}`, borderLeft: `4px solid ${frameColor}` }} />
            <div className="absolute top-0 right-0 w-8 h-8 pointer-events-none" style={{ borderTop: `4px solid ${frameColor}`, borderRight: `4px solid ${frameColor}` }} />
            <div className="absolute bottom-0 left-0 w-8 h-8 pointer-events-none" style={{ borderBottom: `4px solid ${frameColor}`, borderLeft: `4px solid ${frameColor}` }} />
            <div className="absolute bottom-0 right-0 w-8 h-8 pointer-events-none" style={{ borderBottom: `4px solid ${frameColor}`, borderRight: `4px solid ${frameColor}` }} />
          </>
        );

      default:
        return (
          <div
            className="absolute pointer-events-none rounded-lg"
            style={{
              top: `${baseInset}px`,
              bottom: `${baseInset}px`,
              left: `${baseInset}px`,
              right: `${baseInset}px`,
              border: `${wPx}px solid ${frameColor}`,
            }}
          />
        );
    }
  };

  const aspectInfo = getCertificateDimensions(data.aspectRatio);

  let scale = 1.0;
  if (!isExporting) {
    if (zoomMode === '150') {
      scale = 1.50;
    } else if (zoomMode === '125') {
      scale = 1.25;
    } else if (zoomMode === '100') {
      scale = 1.0;
    } else if (zoomMode === '75') {
      scale = 0.75;
    } else if (zoomMode === '50') {
      scale = 0.50;
    } else {
      if (containerWidth > 0) {
        const availableWidth = Math.max(280, containerWidth - 32);
        scale = Math.min(1.0, availableWidth / aspectInfo.baseWidth);
      }
    }
  }

  const scaledWidth = isExporting ? aspectInfo.baseWidth : Math.round(aspectInfo.baseWidth * scale);
  const scaledHeight = isExporting ? aspectInfo.baseHeight : Math.round(aspectInfo.baseHeight * scale);

  return (
    <div ref={containerRef} className="w-full flex flex-col items-center justify-center py-2 select-none">
      
      {/* Top Banner indicating Layout, Undo/Redo, Drag Controls & Zoom Mode */}
      {!isExporting && (
        <div className="w-full mb-3 px-3.5 py-2 bg-slate-900/95 text-amber-300 text-xs font-bold rounded-2xl shadow-md border border-amber-500/30 flex flex-wrap items-center justify-between gap-2 no-print">
          
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="truncate">{aspectInfo.label}</span>
          </div>

          {/* Undo / Redo Controls */}
          {(onUndo || onRedo) && (
            <div className="flex items-center gap-1 bg-slate-800/90 px-2 py-1 rounded-xl border border-slate-700/60">
              <button
                onClick={onUndo}
                disabled={!canUndo}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                  canUndo
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-xs cursor-pointer'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'
                }`}
                title="تراجع عن الخطوة السابقة (Ctrl+Z)"
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span>تراجع</span>
              </button>

              <button
                onClick={onRedo}
                disabled={!canRedo}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                  canRedo
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-xs cursor-pointer'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'
                }`}
                title="إعادة الخطوة (Ctrl+Y)"
              >
                <Redo2 className="w-3.5 h-3.5" />
                <span>إعادة</span>
              </button>
            </div>
          )}

          {/* Drag & Move Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const nextState = !isDragModeActive;
                setIsDragModeActive(nextState);
                if (nextState && !selectedKey) {
                  setSelectedKey('recipientBlock');
                }
              }}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer ${
                isDragModeActive
                  ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-300 font-black'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
              title="تفعيل وضع سحب وتغيير أماكن العبارات والصور والشعار والأختام"
            >
              <Move className="w-3.5 h-3.5 text-slate-950" />
              <span>وضع السحب {isDragModeActive ? '(مُفعّل)' : ''}</span>
            </button>

            {data.positions && Object.keys(data.positions).length > 0 && (
              <button
                onClick={handleResetPositions}
                className="px-2.5 py-1 bg-red-950/80 text-red-300 hover:bg-red-900 rounded-xl text-xs font-bold transition flex items-center gap-1 border border-red-500/40 shadow-xs cursor-pointer"
                title="إعادة ضبط مواضع العناصر للتنسيق الافتراضي"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>ضبط الأماكن</span>
              </button>
            )}
          </div>

          {/* Zoom Controls Bar - Horizontally Scrollable to prevent overflow on smaller screens */}
          <div className="max-w-full overflow-x-auto py-0.5 scrollbar-thin">
            <div className="flex items-center gap-1 bg-slate-800/90 px-2 py-1 rounded-xl border border-slate-700/60 whitespace-nowrap shrink-0">
              <span className="text-[10px] text-slate-300 font-normal ml-1">التكبير:</span>

              {/* Zoom Out Button */}
              <button
                type="button"
                onClick={() => {
                  const modes: Array<'50' | '75' | '100' | '125' | '150'> = ['50', '75', '100', '125', '150'];
                  if (zoomMode === 'fit') {
                    setZoomMode('50');
                  } else {
                    const idx = modes.indexOf(zoomMode);
                    if (idx > 0) setZoomMode(modes[idx - 1]);
                  }
                }}
                className="p-1 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition cursor-pointer"
                title="تصغير العرض"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setZoomMode('fit')}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition flex items-center gap-1 ${
                  zoomMode === 'fit' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-300 hover:bg-slate-700'
                }`}
                title="ملاءمة وحجم العرض التلقائي"
              >
                <Maximize2 className="w-3 h-3" />
                ملاءمة ({Math.round(scale * 100)}%)
              </button>
              <button
                onClick={() => setZoomMode('50')}
                className={`px-1.5 py-0.5 rounded-lg text-[11px] font-bold transition ${
                  zoomMode === '50' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-300 hover:bg-slate-700'
                }`}
              >
                50%
              </button>
              <button
                onClick={() => setZoomMode('75')}
                className={`px-1.5 py-0.5 rounded-lg text-[11px] font-bold transition ${
                  zoomMode === '75' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-300 hover:bg-slate-700'
                }`}
              >
                75%
              </button>
              <button
                onClick={() => setZoomMode('100')}
                className={`px-1.5 py-0.5 rounded-lg text-[11px] font-bold transition ${
                  zoomMode === '100' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-300 hover:bg-slate-700'
                }`}
              >
                100%
              </button>
              <button
                onClick={() => setZoomMode('125')}
                className={`px-1.5 py-0.5 rounded-lg text-[11px] font-bold transition ${
                  zoomMode === '125' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-300 hover:bg-slate-700'
                }`}
              >
                125%
              </button>
              <button
                onClick={() => setZoomMode('150')}
                className={`px-1.5 py-0.5 rounded-lg text-[11px] font-bold transition ${
                  zoomMode === '150' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-300 hover:bg-slate-700'
                }`}
              >
                150%
              </button>

              {/* Zoom In Button */}
              <button
                type="button"
                onClick={() => {
                  const modes: Array<'50' | '75' | '100' | '125' | '150'> = ['50', '75', '100', '125', '150'];
                  if (zoomMode === 'fit') {
                    setZoomMode('100');
                  } else {
                    const idx = modes.indexOf(zoomMode);
                    if (idx >= 0 && idx < modes.length - 1) setZoomMode(modes[idx + 1]);
                  }
                }}
                className="p-1 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition cursor-pointer"
                title="تكبير العرض"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

        </div>
      )}

      {/* Drag & Move Mode Active: Precision Nudge D-Pad Controls */}
      {!isExporting && isDragModeActive && (
        <div className="w-full my-2 p-3 bg-slate-900/95 text-white rounded-2xl shadow-xl border border-amber-500/40 space-y-3 dir-rtl no-print">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
            
            {/* Element Selection Dropdown */}
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1 shrink-0">
                <Move className="w-3.5 h-3.5 text-amber-400" />
                العنصر المحدد:
              </span>
              <select
                value={selectedKey || ''}
                onChange={(e) => setSelectedKey(e.target.value || null)}
                className="bg-slate-800 text-amber-300 text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-700 focus:border-amber-500 outline-none cursor-pointer max-w-[200px] sm:max-w-xs truncate"
              >
                <option value="">-- انقر أو اختر عنصراً --</option>
                <option value="recipientBlock">اسم المكرّم (الطالب)</option>
                <option value="titleBlock">العنوان الرئيس (شهادة تقدير)</option>
                <option value="appreciationBlock">نص التقدير والثناء</option>
                <option value="signaturesBlock">قسم التوقيعات الرسمية</option>
                <option value="schoolHeader">ترويسة المدرسة / الجهة</option>
                <option value="logo">الشعار المؤسسي</option>
                <option value="stamp">الختم الرسمي</option>
                <option value="qrCode">رمز QR للتحقق</option>
                <option value="badge">وسام التميز</option>
                <option value="dateLocation">التاريخ والمكان</option>
                <option value="poemBlock">بيت الشعر / المقولة</option>
                {data.emojis && data.emojis.map((e) => (
                  <option key={e.id} value={`emoji-${e.id}`}>
                    ملصق احتفالي: {e.emoji}
                  </option>
                ))}
              </select>
            </div>

            {/* Step Size Selector */}
            <div className="flex items-center gap-1 bg-slate-800/90 p-1 rounded-xl border border-slate-700">
              <span className="text-[10px] text-slate-400 font-bold px-1.5">خطوة التحريك:</span>
              {[1, 2, 5, 10].map((step) => (
                <button
                  key={step}
                  type="button"
                  onClick={() => setNudgeStep(step)}
                  className={`px-2 py-1 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                    nudgeStep === step
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {step}px
                </button>
              ))}
            </div>
          </div>

          {/* D-Pad & Coordinates Row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-right space-y-1">
              <div className="text-xs font-bold text-slate-200">
                📍 {selectedKey ? getElementFriendlyName(selectedKey) : 'انقر على أي عنصر بالشهادة لتحديده وتحريكه'}
              </div>
              {selectedKey && (
                <div className="text-xs font-mono text-amber-400 bg-slate-800/80 px-2.5 py-1 rounded-lg inline-block border border-slate-700 dir-ltr text-right">
                  الموقع الحالي: X = {data.positions?.[selectedKey as keyof ElementPositions]?.x ?? 0}px | Y = {data.positions?.[selectedKey as keyof ElementPositions]?.y ?? 0}px
                </div>
              )}
              <p className="text-[10px] text-slate-400">
                💡 يمكنك السحب بالمؤشر أو اللمس، أو استخدام أسهم الأزرار أو أسهم لوحة المفاتيح (↑ ↓ ← →)
              </p>
            </div>

            {/* Arrow Navigation D-Pad Controls */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="relative w-32 h-32 bg-slate-800/90 rounded-2xl p-2 border border-slate-700 shadow-inner flex items-center justify-center">
                
                {/* Arrow UP */}
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    startNudgeRepeat('up');
                  }}
                  onMouseUp={stopNudgeRepeat}
                  onMouseLeave={stopNudgeRepeat}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    startNudgeRepeat('up');
                  }}
                  onTouchEnd={stopNudgeRepeat}
                  onTouchCancel={stopNudgeRepeat}
                  onClick={(e) => e.preventDefault()}
                  disabled={!selectedKey}
                  className="absolute top-1.5 left-1/2 -translate-x-1/2 w-9 h-9 bg-slate-700 hover:bg-amber-500 hover:text-slate-950 text-white rounded-xl flex items-center justify-center transition active:scale-95 disabled:opacity-30 disabled:hover:bg-slate-700 shadow-sm cursor-pointer select-none"
                  title="تحريك للأعلى (اضغط مع الاستمرار)"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>

                {/* Arrow DOWN */}
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    startNudgeRepeat('down');
                  }}
                  onMouseUp={stopNudgeRepeat}
                  onMouseLeave={stopNudgeRepeat}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    startNudgeRepeat('down');
                  }}
                  onTouchEnd={stopNudgeRepeat}
                  onTouchCancel={stopNudgeRepeat}
                  onClick={(e) => e.preventDefault()}
                  disabled={!selectedKey}
                  className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-9 h-9 bg-slate-700 hover:bg-amber-500 hover:text-slate-950 text-white rounded-xl flex items-center justify-center transition active:scale-95 disabled:opacity-30 disabled:hover:bg-slate-700 shadow-sm cursor-pointer select-none"
                  title="تحريك للأسفل (اضغط مع الاستمرار)"
                >
                  <ArrowDown className="w-4 h-4" />
                </button>

                {/* Arrow LEFT */}
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    startNudgeRepeat('left');
                  }}
                  onMouseUp={stopNudgeRepeat}
                  onMouseLeave={stopNudgeRepeat}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    startNudgeRepeat('left');
                  }}
                  onTouchEnd={stopNudgeRepeat}
                  onTouchCancel={stopNudgeRepeat}
                  onClick={(e) => e.preventDefault()}
                  disabled={!selectedKey}
                  className="absolute left-1.5 top-1/2 -translate-y-1/2 w-9 h-9 bg-slate-700 hover:bg-amber-500 hover:text-slate-950 text-white rounded-xl flex items-center justify-center transition active:scale-95 disabled:opacity-30 disabled:hover:bg-slate-700 shadow-sm cursor-pointer select-none"
                  title="تحريك لليسار (اضغط مع الاستمرار)"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>

                {/* Arrow RIGHT */}
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    startNudgeRepeat('right');
                  }}
                  onMouseUp={stopNudgeRepeat}
                  onMouseLeave={stopNudgeRepeat}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    startNudgeRepeat('right');
                  }}
                  onTouchEnd={stopNudgeRepeat}
                  onTouchCancel={stopNudgeRepeat}
                  onClick={(e) => e.preventDefault()}
                  disabled={!selectedKey}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 bg-slate-700 hover:bg-amber-500 hover:text-slate-950 text-white rounded-xl flex flex-col items-center justify-center transition active:scale-95 disabled:opacity-30 disabled:hover:bg-slate-700 shadow-sm cursor-pointer select-none"
                  title="تحريك لليمين (اضغط مع الاستمرار)"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>

                {/* Center Reset Button */}
                <button
                  type="button"
                  onClick={() => {
                    if (selectedKey && !selectedKey.startsWith('emoji-') && onUpdateData) {
                      onUpdateData({
                        positions: {
                          ...(data.positions || {}),
                          [selectedKey]: { x: 0, y: 0 }
                        }
                      });
                    }
                  }}
                  disabled={!selectedKey}
                  className="w-7 h-7 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-full flex items-center justify-center font-black text-[10px] shadow-md disabled:opacity-30 transition cursor-pointer"
                  title="إعادة ضبط الموقع لمركز الصفحة الاصلي (0,0)"
                >
                  0,0
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Responsive Scaled Viewport Area - Full 2D Scrollability & Edge Visibility */}
      <div className={isExporting ? "relative block overflow-visible" : "w-full max-h-[82vh] overflow-auto rounded-2xl border border-slate-300/80 bg-slate-900/10 p-4 sm:p-6 shadow-inner flex relative transition-all dir-ltr"}>
        <div
          style={{
            width: !isExporting ? `${scaledWidth}px` : `${aspectInfo.baseWidth}px`,
            height: !isExporting ? `${scaledHeight}px` : `${aspectInfo.baseHeight}px`,
          }}
          className={isExporting ? "relative block overflow-visible" : "relative shrink-0 m-auto transition-all duration-200"}
        >
          <div
            style={{
              width: `${aspectInfo.baseWidth}px`,
              height: `${aspectInfo.baseHeight}px`,
              transform: !isExporting && scale !== 1 ? `scale(${scale})` : undefined,
              transformOrigin: 'top left',
            }}
            className={isExporting ? "relative block overflow-visible" : "absolute top-0 left-0"}
          >
            <div
              ref={actualCanvasRef}
              id="certificate-print-area"
              data-certificate-canvas="true"
              data-aspect={data.aspectRatio || 'A4-landscape'}
              dir="rtl"
              className={`relative overflow-hidden bg-white shadow-2xl rounded-lg ${aspectInfo.widthClass} ${fontClass}`}
              style={{
                boxSizing: 'border-box',
                position: 'relative',
                fontFamily: `'${data.fontFamily || 'Cairo'}', 'Cairo', Tajawal, Almarai, sans-serif, serif`,
                width: `${aspectInfo.baseWidth}px`,
                height: `${aspectInfo.baseHeight}px`,
                minWidth: `${aspectInfo.baseWidth}px`,
                minHeight: `${aspectInfo.baseHeight}px`,
                maxWidth: `${aspectInfo.baseWidth}px`,
                maxHeight: `${aspectInfo.baseHeight}px`,
                backgroundColor: data.backgroundColor || '#ffffff',
                backgroundImage: data.bgGradient && data.bgGradient.enabled
                  ? (data.bgTextureUrl
                      ? `url("${data.bgTextureUrl}"), ${getGradientCss(data.bgGradient, data.backgroundColor || '#ffffff')}`
                      : getGradientCss(data.bgGradient, data.backgroundColor || '#ffffff'))
                  : (data.bgTextureUrl ? `url("${data.bgTextureUrl}")` : undefined),
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                color: data.textColor || '#0f172a',
                fontSize: `${data.fontSizeScale * 100}%`,
                letterSpacing: 'normal',
                wordSpacing: 'normal',
              }}
            >
              {/* Frame borders */}
              {renderFrameBorders()}

              {/* Custom Background Image / Pattern Layer */}
              {(data.bgImageUrl || data.bgTextureUrl) && (
                <div
                  className="absolute inset-0 pointer-events-none z-0"
                  style={{
                    backgroundImage: `url("${data.bgImageUrl || data.bgTextureUrl}")`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                    opacity: data.bgOpacity ?? 1,
                    filter: data.bgBlur ? `blur(${data.bgBlur}px)` : 'none',
                  }}
                />
              )}

              {/* Background Color Tint Overlay Layer */}
              {data.bgOverlayColor && (data.bgOverlayOpacity ?? 0) > 0 && (
                <div
                  className="absolute inset-0 pointer-events-none z-0"
                  style={{
                    backgroundColor: data.bgOverlayColor,
                    opacity: data.bgOverlayOpacity ?? 0,
                  }}
                />
              )}

              {/* Optional Text Card Backing Container for legibility over busy background images */}
              {data.bgCardBacking && (
                <div
                  className="absolute inset-8 rounded-2xl pointer-events-none z-0 shadow-lg border border-white/40"
                  style={{
                    backgroundColor: data.textColor && data.textColor.toLowerCase().startsWith('#f') 
                      ? `rgba(15, 23, 42, ${data.bgCardOpacity ?? 0.75})` 
                      : `rgba(255, 255, 255, ${data.bgCardOpacity ?? 0.82})`,
                    backdropFilter: 'blur(8px)',
                  }}
                />
              )}

              {/* Smart Guides Overlay during Dragging */}
              {isDragModeActive && activeGuides && (
                <>
                  {activeGuides.vertical && (
                    <div
                      className="absolute top-0 bottom-0 border-l-2 border-dashed border-amber-500 z-[100] pointer-events-none transition-all duration-75 flex items-center justify-center"
                      style={{ left: `${activeGuides.vertical.xPercent}%` }}
                    >
                      <div className="bg-amber-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-lg whitespace-nowrap opacity-95 -mt-32 flex items-center gap-1.5 border border-amber-300">
                        <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                        {activeGuides.vertical.label}
                      </div>
                    </div>
                  )}

                  {activeGuides.horizontal && (
                    <div
                      className="absolute left-0 right-0 border-t-2 border-dashed border-amber-500 z-[100] pointer-events-none transition-all duration-75 flex items-center justify-center"
                      style={{ top: `${activeGuides.horizontal.yPercent}%` }}
                    >
                      <div className="bg-amber-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-lg whitespace-nowrap opacity-95 -mr-32 flex items-center gap-1.5 border border-amber-300">
                        <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                        {activeGuides.horizontal.label}
                      </div>
                    </div>
                  )}
                </>
              )}

            {/* Background Watermark */}
            {data.watermarkType !== 'none' && (data.watermarkText || data.watermarkImageUrl || data.schoolName) && (
              <div
                className="absolute inset-0 pointer-events-none select-none overflow-hidden z-0 flex items-center justify-center"
                style={{ pointerEvents: 'none' }}
              >
                {data.watermarkPattern === 'repeat' ? (
                  /* Grid Tiled Repeat Pattern */
                  <div
                    className="w-full h-full grid grid-cols-3 grid-rows-3 gap-6 items-center justify-items-center p-8 transition-all"
                    style={{
                      transform: `rotate(${data.watermarkRotation ?? -12}deg) scale(${(data.watermarkSize ?? 100) / 100})`,
                      opacity: data.watermarkOpacity ?? 0.05,
                    }}
                  >
                    {Array.from({ length: 9 }).map((_, idx) => (
                      <div key={idx} className="flex items-center justify-center text-center">
                        {data.watermarkType === 'image' && data.watermarkImageUrl ? (
                          <img
                            src={data.watermarkImageUrl}
                            alt="watermark"
                            className="max-w-[120px] max-h-[120px] object-contain grayscale"
                          />
                        ) : (
                          <span
                            className={`text-2xl font-extrabold uppercase text-center whitespace-nowrap ${getElementFontClass('watermarkText')}`}
                            style={{
                              color: data.primaryColor || '#0f172a',
                              ...getElementCssStyle('watermarkText'),
                            }}
                          >
                            {data.watermarkText || data.schoolName}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : data.watermarkPattern === 'diagonal-strip' ? (
                  /* Diagonal Strip Banner Pattern */
                  <div
                    className="w-[180%] h-[180%] absolute -top-[40%] -left-[40%] flex flex-col justify-around rotate-[-25deg] pointer-events-none transition-all"
                    style={{ opacity: data.watermarkOpacity ?? 0.05 }}
                  >
                    {Array.from({ length: 5 }).map((_, rowIdx) => (
                      <div key={rowIdx} className="flex justify-around items-center gap-8 whitespace-nowrap">
                        {Array.from({ length: 4 }).map((_, colIdx) => (
                          <div key={colIdx} className="flex items-center gap-3">
                            {data.watermarkType === 'image' && data.watermarkImageUrl ? (
                              <img
                                src={data.watermarkImageUrl}
                                alt="watermark"
                                className="h-10 w-auto object-contain grayscale"
                              />
                            ) : (
                              <span
                                className={`text-xl font-black uppercase ${getElementFontClass('watermarkText')}`}
                                style={{
                                  color: data.primaryColor || '#0f172a',
                                  ...getElementCssStyle('watermarkText'),
                                }}
                              >
                                ★ {data.watermarkText || data.schoolName}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Single Centered Watermark */
                  <div
                    className="flex items-center justify-center transition-transform"
                    style={{
                      transform: `rotate(${data.watermarkRotation ?? -12}deg) scale(${(data.watermarkSize ?? 100) / 100})`,
                      opacity: data.watermarkOpacity ?? 0.05,
                    }}
                  >
                    {data.watermarkType === 'image' && data.watermarkImageUrl ? (
                      <img
                        src={data.watermarkImageUrl}
                        alt="watermark"
                        className="max-w-[420px] max-h-[300px] object-contain grayscale"
                      />
                    ) : (
                      <span
                        className={`text-6xl sm:text-7xl font-extrabold uppercase text-center leading-tight max-w-2xl ${getElementFontClass('watermarkText')}`}
                        style={{
                          color: data.primaryColor || '#0f172a',
                          ...getElementCssStyle('watermarkText'),
                        }}
                      >
                        {data.watermarkText || data.schoolName}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Celebratory Emojis & Custom Uploaded Images */}
            {data.emojis && data.emojis.map((item) => {
              const emojiKey = `emoji-${item.id}`;
              const isSelected = selectedKey === emojiKey && isDragModeActive;
              const isBelowText = item.layer === 'below-text';
              const calculatedZIndex = isSelected ? (isBelowText ? 15 : 40) : (isBelowText ? 5 : 20);

              return (
                <div
                  key={item.id}
                  onClick={(e) => {
                    if (isDragModeActive) {
                      e.stopPropagation();
                      setSelectedKey(emojiKey);
                    }
                  }}
                  onMouseDown={(e) => isDragModeActive && handleStartDrag(e, emojiKey)}
                  onTouchStart={(e) => isDragModeActive && handleStartDrag(e, emojiKey)}
                  className={`absolute select-none transition-all ${
                    isDragModeActive ? 'cursor-grab active:cursor-grabbing hover:scale-105 hover:ring-2 hover:ring-amber-400 rounded-lg' : ''
                  } ${isSelected ? 'ring-2 ring-amber-500 bg-amber-500/10 p-1 rounded-lg shadow-lg' : ''}`}
                  style={{
                    left: `${item.x}%`,
                    top: `${item.y}%`,
                    zIndex: calculatedZIndex,
                  }}
                >
                  {item.type === 'image' && item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.emoji || 'رمز احتفالي'}
                      crossOrigin="anonymous"
                      className="object-contain max-w-none pointer-events-none select-none drop-shadow-md"
                      style={{
                        width: `${item.size}px`,
                        height: 'auto',
                        maxHeight: 'none',
                        maxWidth: 'none',
                        opacity: item.opacity ?? 1,
                        transform: `rotate(${item.rotation || 0}deg)`,
                        mixBlendMode: item.blendMode || 'normal',
                      }}
                    />
                  ) : (
                    <span
                      className="inline-flex items-center justify-center leading-none select-none drop-shadow-md text-center"
                      style={{
                        fontSize: `${item.size}px`,
                        width: `${item.size}px`,
                        height: `${item.size}px`,
                        opacity: item.opacity ?? 1,
                        transform: `rotate(${item.rotation || 0}deg)`,
                        mixBlendMode: item.blendMode || 'normal',
                        fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Android Emoji", EmojiSymbols, "Segoe UI Symbol", sans-serif',
                      }}
                    >
                      {item.emoji}
                    </span>
                  )}
                  {isSelected && !isExporting && renderOnElementControls()}
                </div>
              );
            })}

            {/* Certificate Content Main Container - CSS Grid Layout */}
            {(() => {
              const gridConfig = getCertificateGridLayout(data.layoutPreset as LayoutPreset, data);
              const isSidebarLayout = gridConfig.isSidebar;
              const isExecutiveLayout = gridConfig.isExecutive;

              return (
                <div
                  key={`cert-grid-${gridConfig.presetName}`}
                  className={`cert-main-grid cert-layout-${gridConfig.presetName} relative z-10 h-full text-center overflow-hidden max-w-full w-full box-border break-words transition-all duration-300`}
                  style={{
                    zIndex: 10,
                    position: 'relative',
                    display: 'grid',
                    gridTemplateRows: gridConfig.gridTemplateRows,
                    gridTemplateColumns: gridConfig.gridTemplateColumns,
                    gridTemplateAreas: gridConfig.gridTemplateAreas,
                    gap: gridConfig.gap,
                    height: '100%',
                    width: '100%',
                    boxSizing: 'border-box',
                    paddingTop: `${data.canvasMarginTop ?? 32}px`,
                    paddingBottom: `${data.canvasMarginBottom ?? 30}px`,
                    paddingLeft: `${data.canvasMarginLeft ?? 40}px`,
                    paddingRight: `${data.canvasMarginRight ?? 40}px`,
                    alignContent: gridConfig.alignContent,
                  }}
                >
              
              {/* 1. Header Grid Area (School Header, Logo, Date & QR badge) */}
              <div
                data-grid-area="header"
                className="cert-area-header cert-header-grid pb-2 mb-1 gap-2 sm:gap-4 transition-all duration-300 ease-in-out min-h-[50px] w-full max-w-full overflow-visible"
                style={{
                  gridArea: 'header',
                  display: 'grid',
                  gridTemplateColumns: '1fr auto 1fr',
                  gridTemplateAreas: '"school logo date"',
                  alignItems: 'center',
                  width: '100%',
                }}
              >
                
                {/* School Name & Ministry Header */}
                <div style={{ gridArea: 'school' }} className="flex justify-start w-full overflow-visible">
                  <DraggableItem elementKey="schoolHeader">
                    {(() => {
                      const schoolHeaderCss = getElementCssStyle('schoolHeader', '#475569');
                      const headerTextAlign = schoolHeaderCss.textAlign || 'right';
                      const headerAlignClass =
                        headerTextAlign === 'center'
                          ? 'text-center items-center'
                          : headerTextAlign === 'left'
                          ? 'text-left items-start'
                          : 'text-right items-end';

                      return (
                        <div
                          className={`flex flex-col space-y-1 max-w-md overflow-visible leading-tight ${headerAlignClass} ${getElementFontClass('schoolHeader')}`}
                          style={{
                            ...schoolHeaderCss,
                            transform: `translate(${data.headerTextOffsetX || 0}px, ${data.headerTextOffsetY || 0}px)`
                          }}
                        >
                          {(data.showHeaderLine1 ?? true) && (
                            <div
                              className={`w-full max-w-full whitespace-nowrap transition-transform ${headerAlignClass} ${getElementFontClass('schoolHeader')}`}
                              style={{
                                ...schoolHeaderCss,
                                transform: `translate(${data.headerLine1OffsetX || 0}px, ${data.headerLine1OffsetY || 0}px)`
                              }}
                            >
                              <InlineEdit
                                value={data.headerLine1 ?? 'المملكة العربية السعودية'}
                                onChange={(val) => handleFieldChange('headerLine1', val)}
                                placeholder="السطر الأول"
                                className={`hover:bg-amber-50/60 rounded px-1 transition max-w-full ${headerAlignClass} ${getElementFontClass('schoolHeader')}`}
                                style={schoolHeaderCss}
                              />
                            </div>
                          )}
                          {(data.showHeaderLine2 ?? true) && (
                            <div
                              className={`w-full max-w-full whitespace-nowrap transition-transform ${headerAlignClass} ${getElementFontClass('schoolHeader')}`}
                              style={{
                                ...schoolHeaderCss,
                                transform: `translate(${data.headerLine2OffsetX || 0}px, ${data.headerLine2OffsetY || 0}px)`
                              }}
                            >
                              <InlineEdit
                                value={data.headerLine2 ?? 'وزارة التعليم / الجهة المعتمدة'}
                                onChange={(val) => handleFieldChange('headerLine2', val)}
                                placeholder="السطر الثاني"
                                className={`hover:bg-amber-50/60 rounded px-1 transition max-w-full ${headerAlignClass} ${getElementFontClass('schoolHeader')}`}
                                style={schoolHeaderCss}
                              />
                            </div>
                          )}
                          {data.showHeaderLine3 && (
                            <div
                              className={`w-full max-w-full whitespace-nowrap transition-transform ${headerAlignClass} ${getElementFontClass('schoolHeader')}`}
                              style={{
                                ...schoolHeaderCss,
                                transform: `translate(${data.headerLine3OffsetX || 0}px, ${data.headerLine3OffsetY || 0}px)`
                              }}
                            >
                              <InlineEdit
                                value={data.headerLine3 ?? 'إدارة التعليم بمحافظة الرياض'}
                                onChange={(val) => handleFieldChange('headerLine3', val)}
                                placeholder="السطر الثالث الإضافي"
                                className={`hover:bg-amber-50/60 rounded px-1 transition max-w-full ${headerAlignClass} ${getElementFontClass('schoolHeader')}`}
                                style={schoolHeaderCss}
                              />
                            </div>
                          )}
                          {data.showHeaderRightExtra && (
                            <div
                              className={`w-full max-w-full whitespace-nowrap transition-transform ${headerAlignClass} ${getElementFontClass('schoolHeader')}`}
                              style={{
                                ...schoolHeaderCss,
                                transform: `translate(${data.headerRightExtraOffsetX || 0}px, ${data.headerRightExtraOffsetY || 0}px)`
                              }}
                            >
                              <InlineEdit
                                value={data.headerRightExtra ?? 'مكتب التعليم الخاص'}
                                onChange={(val) => handleFieldChange('headerRightExtra', val)}
                                placeholder="سطر إضافي يمين"
                                className={`hover:bg-amber-50/60 rounded px-1 transition max-w-full ${headerAlignClass} ${getElementFontClass('schoolHeader')}`}
                                style={schoolHeaderCss}
                              />
                            </div>
                          )}
                          {(data.showHeaderSchoolName ?? true) && (
                            <div
                              className={`w-full max-w-full whitespace-nowrap transition-transform ${headerAlignClass} ${getElementFontClass('schoolName')}`}
                              style={{
                                ...getElementCssStyle('schoolName', data.primaryColor || '#1e293b'),
                                transform: `translate(${data.headerSchoolNameOffsetX || 0}px, ${data.headerSchoolNameOffsetY || 0}px)`
                              }}
                            >
                              <InlineEdit
                                value={data.schoolName}
                                onChange={(val) => handleFieldChange('schoolName', val)}
                                placeholder="اسم الجهة / المدرسة"
                                className={`font-bold max-w-full ${headerAlignClass} ${getElementFontClass('schoolName')}`}
                                style={getElementCssStyle('schoolName', data.primaryColor || '#1e293b')}
                              />
                            </div>
                          )}
                          {data.showHeaderVisionText && (
                            <div
                              className={`pt-0.5 max-w-full transition-transform ${headerAlignClass}`}
                              style={{
                                transform: `translate(${data.headerVisionTextOffsetX || 0}px, ${data.headerVisionTextOffsetY || 0}px)`
                              }}
                            >
                              <span className="text-[10px] font-bold text-amber-900 bg-amber-100/90 px-2 py-0.5 rounded border border-amber-300/80 inline-block max-w-full break-words shadow-xs">
                                <InlineEdit
                                  value={data.headerVisionText ?? 'رؤية 2030'}
                                  onChange={(val) => handleFieldChange('headerVisionText', val)}
                                  placeholder="عبارة الهامش الإضافية"
                                />
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </DraggableItem>
                </div>

                {/* Institution Logo */}
                <div style={{ gridArea: 'logo' }} className="flex justify-center items-center px-1 sm:px-2 shrink-0 relative overflow-visible min-w-[50px]">
                  <DraggableItem elementKey="logo">
                    <div
                      className="flex flex-col items-center justify-center shrink-0 transition-all duration-300 relative overflow-visible"
                      style={{
                        transform: `translate(${data.logoOffsetX || 0}px, ${data.logoOffsetY || 0}px) rotate(${data.logoRotation || 0}deg)`,
                        opacity: data.logoOpacity ?? 1,
                      }}
                    >
                      {data.logoUrl ? (
                        <img
                          src={data.logoUrl}
                          alt="Logo"
                          className={`object-contain transition-all max-w-none ${
                            data.logoBgMode === 'transparent' || data.logoShape === 'none'
                              ? 'bg-transparent border-0 shadow-none p-0'
                              : data.logoBgMode === 'dark'
                              ? 'bg-slate-900 p-1 shadow-md border border-slate-700'
                              : 'bg-white/95 p-1 border shadow-md'
                          } ${
                            data.logoShape === 'circle' ? 'rounded-full' :
                            data.logoShape === 'square' ? 'rounded-none' :
                            data.logoShape === 'none' ? 'border-none shadow-none bg-transparent p-0' : 'rounded-xl'
                          } ${
                            !data.logoSizePx ? (
                              data.logoSize === 'sm' ? 'h-9 w-9' :
                              data.logoSize === 'lg' ? 'h-16 w-16' :
                              data.logoSize === 'xl' ? 'h-20 w-20' : 'h-12 w-12'
                            ) : ''
                          }`}
                          style={{
                            ...(data.logoSizePx ? { width: `${data.logoSizePx}px`, height: `${data.logoSizePx}px` } : {}),
                            ...(data.logoBorderWidth !== undefined ? { borderWidth: `${data.logoBorderWidth}px` } : {}),
                            ...(data.logoBorderColor ? { borderColor: data.logoBorderColor } : {}),
                          }}
                        />
                      ) : (
                        <div
                          className={`rounded-full flex items-center justify-center shadow-md text-white font-black text-xl border-2 border-amber-300 transition-all ${
                            !data.logoSizePx ? (
                              data.logoSize === 'sm' ? 'h-9 w-9 text-base' :
                              data.logoSize === 'lg' ? 'h-16 w-16 text-2xl' :
                              data.logoSize === 'xl' ? 'h-20 w-20 text-3xl' : 'h-12 w-12 text-xl'
                            ) : ''
                          }`}
                          style={{
                            backgroundColor: data.primaryColor,
                            ...(data.logoSizePx ? { width: `${data.logoSizePx}px`, height: `${data.logoSizePx}px`, fontSize: `${Math.round(data.logoSizePx * 0.45)}px` } : {}),
                          }}
                        >
                          <span style={{ display: 'inline-block', transform: `translate(${data.logoTextOffsetX || 0}px, ${data.logoTextOffsetY || 0}px)` }}>
                            {data.schoolName ? data.schoolName.charAt(0) : 'ت'}
                          </span>
                        </div>
                      )}
                    </div>
                  </DraggableItem>
                </div>

                {/* Date & Issue Location */}
                <div style={{ gridArea: 'date' }} className="flex justify-end w-full overflow-visible">
                  <DraggableItem elementKey="dateLocation">
                    {(() => {
                      const dateLocationCss = getElementCssStyle('dateLocation');
                      const dateTextAlign = dateLocationCss.textAlign || 'left';
                      const dateAlignFlex =
                        dateTextAlign === 'center'
                          ? 'justify-center text-center'
                          : dateTextAlign === 'right'
                          ? 'justify-start text-right'
                          : 'justify-end text-left';
                      const containerAlignClass =
                        dateTextAlign === 'center'
                          ? 'text-center items-center'
                          : dateTextAlign === 'right'
                          ? 'text-right items-end'
                          : 'text-left items-start';

                      return (
                        <div className={`flex flex-col text-xs text-slate-600 space-y-1 w-auto min-w-[200px] max-w-[340px] sm:max-w-md overflow-visible ${containerAlignClass} ${getElementFontClass('dateLocation')}`} style={dateLocationCss}>
                          {(data.showHeaderDate ?? true) && (
                            <div
                              className="transition-transform max-w-full"
                              style={{
                                transform: `translate(${data.headerDateOffsetX || 0}px, ${data.headerDateOffsetY || 0}px)`
                              }}
                            >
                              {(() => {
                                const mode = data.dateFormatMode || 'both';
                                const hijriStr = data.issueDateHijri || getTodayHijriDate();
                                const gregStr = data.issueDateGregorian || data.issueDate || getTodayGregorianDate();
                                const isStacked = data.dateDisplayLayout === 'stacked';

                                if (mode === 'hijri') {
                                  return (
                                    <div className={`flex items-center ${dateAlignFlex} gap-1.5 max-w-full min-w-0 whitespace-nowrap`}>
                                      <span className="shrink-0 font-bold text-slate-600">{data.dateLabel || 'التاريخ'}:</span>
                                      <InlineEdit
                                        value={data.issueDateHijri || hijriStr}
                                        onChange={(val) => {
                                          handleFieldChange('issueDateHijri', val);
                                          handleFieldChange('issueDate', val);
                                        }}
                                        placeholder="التاريخ الهجري"
                                        className="font-bold text-slate-800 tracking-normal"
                                        style={{ fontVariantNumeric: 'tabular-nums' }}
                                      />
                                    </div>
                                  );
                                }

                                if (mode === 'gregorian') {
                                  return (
                                    <div className={`flex items-center ${dateAlignFlex} gap-1.5 max-w-full min-w-0 whitespace-nowrap`}>
                                      <span className="shrink-0 font-bold text-slate-600">{data.dateLabel || 'التاريخ'}:</span>
                                      <InlineEdit
                                        value={data.issueDateGregorian || data.issueDate || gregStr}
                                        onChange={(val) => {
                                          handleFieldChange('issueDateGregorian', val);
                                          handleFieldChange('issueDate', val);
                                        }}
                                        placeholder="التاريخ الميلادي"
                                        className="font-bold text-slate-800 tracking-normal"
                                        style={{ fontVariantNumeric: 'tabular-nums' }}
                                      />
                                    </div>
                                  );
                                }

                                // Mode 'both'
                                if (isStacked) {
                                  return (
                                    <div className={`space-y-0.5 w-full ${containerAlignClass}`}>
                                      <div className={`flex items-center ${dateAlignFlex} gap-1.5 max-w-full min-w-0 whitespace-nowrap`}>
                                        <span className="shrink-0 text-slate-500 font-bold">الهجري:</span>
                                        <InlineEdit
                                          value={hijriStr}
                                          onChange={(val) => handleFieldChange('issueDateHijri', val)}
                                          placeholder="التاريخ الهجري"
                                          className="font-bold text-slate-800"
                                          style={{ fontVariantNumeric: 'tabular-nums' }}
                                        />
                                      </div>
                                      <div className={`flex items-center ${dateAlignFlex} gap-1.5 max-w-full min-w-0 whitespace-nowrap`}>
                                        <span className="shrink-0 text-slate-500 font-bold">الميلادي:</span>
                                        <InlineEdit
                                          value={gregStr}
                                          onChange={(val) => handleFieldChange('issueDateGregorian', val)}
                                          placeholder="التاريخ الميلادي"
                                          className="font-bold text-slate-800"
                                          style={{ fontVariantNumeric: 'tabular-nums' }}
                                        />
                                      </div>
                                    </div>
                                  );
                                }

                                // Single line mode (both)
                                const combinedDefault = `${hijriStr} - ${gregStr}`;
                                const combinedValue = (data.issueDateHijri && data.issueDateGregorian) 
                                  ? `${data.issueDateHijri} - ${data.issueDateGregorian}` 
                                  : (data.issueDate || combinedDefault);

                                return (
                                  <div className={`flex items-center ${dateAlignFlex} gap-1.5 max-w-full min-w-0 whitespace-nowrap`}>
                                    <span className="shrink-0 font-bold text-slate-600">{data.dateLabel || 'التاريخ'}:</span>
                                    <InlineEdit
                                      value={combinedValue}
                                      onChange={(val) => handleFieldChange('issueDate', val)}
                                      placeholder="التاريخ الهجري والميلادي"
                                      className="font-bold text-slate-800 tracking-normal"
                                      style={{ fontVariantNumeric: 'tabular-nums' }}
                                    />
                                  </div>
                                );
                              })()}
                            </div>
                          )}
                          {(data.showHeaderPlace ?? true) && (
                            <div
                              className={`flex items-center ${dateAlignFlex} gap-1 max-w-full min-w-0 transition-transform`}
                              style={{
                                transform: `translate(${data.headerPlaceOffsetX || 0}px, ${data.headerPlaceOffsetY || 0}px)`
                              }}
                            >
                              <span className="shrink-0 font-medium text-slate-600">{data.placeLabel || 'المكان'}:</span>
                              <InlineEdit
                                value={data.issuePlace}
                                onChange={(val) => handleFieldChange('issuePlace', val)}
                                placeholder="المكان"
                                className="font-medium text-slate-800 max-w-full whitespace-nowrap"
                              />
                            </div>
                          )}
                          {data.showHeaderCertNumber && (
                            <div
                              className={`flex items-center ${dateAlignFlex} gap-1 max-w-full min-w-0 transition-transform`}
                              style={{
                                transform: `translate(${data.headerCertNumberOffsetX || 0}px, ${data.headerCertNumberOffsetY || 0}px)`
                              }}
                            >
                              <span className="shrink-0 font-medium text-slate-600">{data.certNumberLabel || 'الرقم'}:</span>
                              <InlineEdit
                                value={data.certNumber || data.verificationCode || data.certificateId || 'REF-1447/0892'}
                                onChange={(val) => handleFieldChange('certNumber', val)}
                                placeholder="رقم القيد / المرجع"
                                className="font-medium text-slate-800 tracking-wide max-w-full whitespace-nowrap"
                              />
                            </div>
                          )}
                          {data.showHeaderLeftExtra1 && (
                            <div className={`flex items-center ${dateAlignFlex} gap-1 max-w-full min-w-0`}>
                              <InlineEdit
                                value={data.headerLeftExtra1 ?? 'نوع الشهادة: معتمدة'}
                                onChange={(val) => handleFieldChange('headerLeftExtra1', val)}
                                placeholder="سطر إضافي يسار 1"
                                className="font-medium text-slate-700 max-w-full whitespace-nowrap"
                              />
                            </div>
                          )}
                          {data.showHeaderLeftExtra2 && (
                            <div className={`flex items-center ${dateAlignFlex} gap-1 max-w-full`}>
                              <InlineEdit
                                value={data.headerLeftExtra2 ?? 'الكود: AC-2026'}
                                onChange={(val) => handleFieldChange('headerLeftExtra2', val)}
                                placeholder="سطر إضافي يسار 2"
                                className="font-medium text-slate-700 max-w-full whitespace-nowrap"
                              />
                            </div>
                          )}
                          {data.showQrCode && (data.showVerificationBadge ?? true) && (
                            <div
                              onClick={onOpenVerificationModal}
                              role="button"
                              className={`text-[9.5px] text-emerald-700 font-bold flex items-center ${dateAlignFlex} gap-1 hover:underline cursor-pointer pt-0.5 max-w-full leading-none`}
                            >
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0 inline-block align-middle" />
                              <InlineEdit
                                value={data.verificationBadgeText ?? 'شهادة موثقة رقمياً'}
                                onChange={(val) => handleFieldChange('verificationBadgeText', val)}
                                placeholder="عبارة التوثيق"
                                inline
                                className="max-w-full whitespace-nowrap leading-none align-middle"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </DraggableItem>
                </div>

              </div>

              {/* 2. Title & Ornamental Divider Grid Area */}
              <div
                data-grid-area="title"
                className="cert-area-title flex flex-col items-center justify-center w-full max-w-full my-auto py-0.5 overflow-visible"
                style={{ gridArea: 'title' }}
              >
                {/* Header Separator / Divider Line */}
                <div
                  className="w-full h-[1.5px] mb-2 shrink-0 border-none transition-all duration-300"
                  style={{ backgroundColor: `${data.primaryColor || '#1e293b'}35` }}
                />

                {/* Certificate Title & Subtitle */}
                <DraggableItem elementKey="titleBlock" className="my-1 transition-all duration-300 max-w-full overflow-visible">
                  <div className="space-y-1.5 max-w-full">
                    <h1
                      className="text-3xl sm:text-4xl font-black leading-tight max-w-full overflow-visible whitespace-nowrap transition-transform"
                      style={{
                        transform: `translate(${data.titleOffsetX || 0}px, ${data.titleOffsetY || 0}px)`
                      }}
                    >
                      <InlineEdit
                        value={data.title}
                        onChange={(val) => handleFieldChange('title', val)}
                        placeholder="شهادة شكر وتقدير"
                        className={`font-black max-w-full ${getElementFontClass('title')}`}
                        style={getElementCssStyle('title', data.primaryColor)}
                      />
                    </h1>
                    <div
                      className="text-sm sm:text-base font-medium opacity-85 leading-relaxed max-w-full overflow-visible whitespace-nowrap transition-transform"
                      style={{
                        transform: `translate(${data.subtitleOffsetX || 0}px, ${data.subtitleOffsetY || 0}px)`
                      }}
                    >
                      <InlineEdit
                        value={data.subtitle}
                        onChange={(val) => handleFieldChange('subtitle', val)}
                        placeholder="العنوان الفرعي"
                        className={`font-medium max-w-full ${getElementFontClass('subtitle')}`}
                        style={getElementCssStyle('subtitle', data.secondaryColor)}
                      />
                    </div>
                  </div>
                </DraggableItem>

                {/* Decorative Geometric Divider */}
                <div className="flex items-center justify-center gap-3 my-1.5 transition-all duration-300">
                  <div className="h-0.5 w-16 sm:w-24 rounded-full" style={{ backgroundColor: data.primaryColor }} />
                  <div className="w-3 h-3 rotate-45 border shadow-2xs" style={{ backgroundColor: data.secondaryColor, borderColor: data.accentColor }} />
                  <div className="h-0.5 w-16 sm:w-24 rounded-full" style={{ backgroundColor: data.primaryColor }} />
                </div>
              </div>

              {/* 3. Certificate Body Grid Area (Recipient Intro, Student Box, Appreciation Paragraph, Poem/Quote) */}
              <div
                data-grid-area="body"
                className="cert-area-body flex flex-col justify-center items-center w-full max-w-full my-auto py-1 space-y-1.5 overflow-visible"
                style={{ gridArea: 'body', minHeight: 0 }}
              >
                {/* Recipient Introduction */}
                <div
                  className={`text-sm sm:text-base font-semibold opacity-90 transition-all duration-300 max-w-full overflow-visible whitespace-nowrap ${getElementFontClass('recipientIntro')}`}
                  style={{
                    ...getElementCssStyle('recipientIntro'),
                    transform: `translate(${data.recipientIntroOffsetX || 0}px, ${data.recipientIntroOffsetY || 0}px)`
                  }}
                >
                  <InlineEdit
                    value={data.recipientIntro}
                    onChange={(val) => handleFieldChange('recipientIntro', val)}
                    placeholder="تُمنح هذه الشهادة إلى:"
                    className={`font-semibold max-w-full ${getElementFontClass('recipientIntro')}`}
                    style={getElementCssStyle('recipientIntro')}
                  />
                </div>

                {/* Student Name & Grade Block */}
                <DraggableItem elementKey="recipientBlock" className="mx-auto w-full max-w-xl transition-all duration-300 overflow-visible">
                  <div
                    className={`py-2.5 px-6 sm:px-8 rounded-2xl relative group transition-all duration-300 max-w-full overflow-visible ${
                      data.showRecipientBox !== false
                        ? 'shadow-xs border'
                        : 'bg-transparent border border-transparent'
                    }`}
                    style={
                      data.showRecipientBox !== false
                        ? {
                            backgroundColor: hexToRgba(data.recipientBoxColor || '#f59e0b', data.recipientBoxOpacity ?? 0.12),
                            borderColor: data.recipientBoxBorderColor || hexToRgba(data.recipientBoxColor || '#f59e0b', Math.min(1, (data.recipientBoxOpacity ?? 0.12) * 2 + 0.15)),
                          }
                        : undefined
                    }
                  >
                    <h2
                      className="text-2xl sm:text-3xl font-extrabold drop-shadow-xs leading-snug max-w-full overflow-visible whitespace-nowrap transition-transform"
                      style={{
                        transform: `translate(${data.studentNameOffsetX || 0}px, ${data.studentNameOffsetY || 0}px)`
                      }}
                    >
                      <InlineEdit
                        value={data.studentName}
                        onChange={(val) => handleFieldChange('studentName', val)}
                        placeholder="اسم الطالب الثلاثي"
                        className={`font-extrabold max-w-full ${getElementFontClass('studentName')}`}
                        style={getElementCssStyle('studentName', data.primaryColor)}
                      />
                    </h2>
                    <div
                      className="text-xs sm:text-sm font-bold opacity-90 max-w-full overflow-visible whitespace-nowrap transition-transform"
                      style={{
                        marginTop: `${data.recipientSpacing ?? 4}px`,
                        transform: `translate(${data.gradeOffsetX || 0}px, ${data.gradeOffsetY || 0}px)`
                      }}
                    >
                      <InlineEdit
                        value={data.grade}
                        onChange={(val) => handleFieldChange('grade', val)}
                        placeholder="(الصف الدراسي)"
                        className={`font-bold max-w-full ${getElementFontClass('grade')}`}
                        style={getElementCssStyle('grade', data.secondaryColor)}
                      />
                    </div>
                  </div>
                </DraggableItem>

                {/* Appreciation Text Paragraph */}
                <DraggableItem elementKey="appreciationBlock" className="max-w-2xl mx-auto mt-0.5 mb-0 px-3 w-full transition-all duration-300 overflow-visible">
                  <div
                    style={{
                      transform: `translate(${data.appreciationTextOffsetX || 0}px, ${data.appreciationTextOffsetY || 0}px)`
                    }}
                    className="transition-transform"
                  >
                    <InlineEdit
                      value={data.appreciationText}
                      onChange={(val) => handleFieldChange('appreciationText', val)}
                      placeholder="نص التقدير والتكريم..."
                      multiline
                      rows={1}
                      className={`text-sm sm:text-base leading-snug text-slate-800 font-medium max-w-full overflow-visible break-words ${getElementFontClass('appreciationText')}`}
                      style={getElementCssStyle('appreciationText', data.textColor || '#0f172a')}
                    />
                  </div>
                </DraggableItem>

                {/* Poetic Verse / Quote */}
                {(data.showPoemOrQuote ?? true) && data.poemOrQuote && (
                  <DraggableItem elementKey="poemBlock" className="mt-0.5 mb-0 max-w-3xl w-full mx-auto transition-all duration-300 overflow-visible">
                    <div
                      className="w-full transition-transform"
                      style={{
                        transform: `translate(${data.poemOrQuoteOffsetX || 0}px, ${data.poemOrQuoteOffsetY || 0}px)`
                      }}
                    >
                      <InlineEdit
                        value={data.poemOrQuote}
                        onChange={(val) => handleFieldChange('poemOrQuote', val)}
                        placeholder="بيت شعر أو المقولة..."
                        multiline
                        rows={1}
                        className={`italic text-xs sm:text-sm opacity-90 leading-tight w-full text-center break-words whitespace-pre-wrap ${getElementFontClass('poemOrQuote')}`}
                        style={getElementCssStyle('poemOrQuote', data.primaryColor)}
                      />
                    </div>
                  </DraggableItem>
                )}
              </div>

              {/* 4. Badges, Stamps & Verification QR Grid Area */}
              <div
                data-grid-area="stamps"
                className={`cert-area-stamps cert-stamps-grid pt-1 pb-1 w-full max-w-full min-h-[50px] overflow-visible transition-all duration-300 ease-in-out ${
                  gridConfig.isSidebar ? 'h-full py-2' : ''
                }`}
                style={{
                  gridArea: 'stamps',
                  ...gridConfig.stampsStyle,
                  width: '100%',
                }}
              >
                
                {/* Left: Badge / Award Icon */}
                <div
                  data-grid-area="badge"
                  style={{
                    gridArea: 'badge',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%'
                  }}
                  className="flex flex-col justify-center items-center w-full"
                >
                  {data.showBadge ? (
                    <DraggableItem elementKey="badge">
                      <div
                        className="flex flex-col items-center justify-center transition-all duration-300 max-w-[220px] w-full"
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '100%'
                        }}
                      >
                        {data.badgeType === 'upload' && data.badgeUrl ? (
                          <img
                            src={data.badgeUrl}
                            alt="Badge"
                            className={`object-contain drop-shadow-md transition-all ${
                              data.badgeSize === 'sm' ? 'h-9 w-9' :
                              data.badgeSize === 'lg' ? 'h-16 w-16' : 'h-12 w-12'
                            }`}
                            style={{
                              transform: `translate(${data.badgeBoxOffsetX || 0}px, ${data.badgeBoxOffsetY || 0}px)`
                            }}
                          />
                        ) : (
                          <div
                            className={`rounded-full flex items-center justify-center shadow-md text-white border-2 border-amber-300 transition-all ${
                              data.badgeSize === 'sm' ? 'w-9 h-9' :
                              data.badgeSize === 'lg' ? 'w-16 h-16' : 'w-12 h-12'
                            }`}
                            style={{
                              backgroundColor: data.secondaryColor,
                              transform: `translate(${data.badgeBoxOffsetX || 0}px, ${data.badgeBoxOffsetY || 0}px)`
                            }}
                          >
                            {getBadgeIcon(data.badgeIcon)}
                          </div>
                        )}
                        {/* Separated Badge Title Background Container & Text */}
                        {(data.showBadgeTitle ?? true) && (data.badgeTitle || !isExporting) && (() => {
                          const bgShape = data.badgeBgShape || 'pill';
                          const isNoBg = bgShape === 'none';
                          
                          // Determine background color / fill
                          let bgFill: string = data.badgeBgColor || data.primaryColor || '#b45309';
                          if (isNoBg) {
                            bgFill = 'transparent';
                          } else if (data.badgeBgGradient && data.badgeBgColor2) {
                            bgFill = `linear-gradient(135deg, ${data.badgeBgColor || data.primaryColor || '#b45309'}, ${data.badgeBgColor2})`;
                          }

                          // Border styles
                          const borderWidth = data.badgeBgBorderWidth ?? (bgShape === 'ornate' ? 2 : (bgShape === 'minimal' ? 1 : 0));
                          const borderStyle = data.badgeBgBorderStyle || (bgShape === 'ornate' ? 'double' : 'solid');
                          const borderColor = data.badgeBgBorderColor || (bgShape === 'ornate' ? '#fde68a' : (bgShape === 'minimal' ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.3)'));
                          
                          // Corner radius
                          let borderRadius = '9999px';
                          if (bgShape === 'rounded') {
                            borderRadius = `${data.badgeBgRadius ?? 8}px`;
                          } else if (bgShape === 'square') {
                            borderRadius = `${data.badgeBgRadius ?? 0}px`;
                          } else if (bgShape === 'ornate') {
                            borderRadius = `${data.badgeBgRadius ?? 6}px`;
                          } else if (bgShape === 'banner') {
                            borderRadius = `${data.badgeBgRadius ?? 4}px`;
                          } else if (bgShape === 'minimal') {
                            borderRadius = `${data.badgeBgRadius ?? 6}px`;
                          } else if (bgShape === 'pill') {
                            borderRadius = '9999px';
                          }

                          // Shadow
                          let boxShadow = '0 1px 2px rgba(0,0,0,0.1)';
                          if (data.badgeBgShadow === 'none' || isNoBg) {
                            boxShadow = 'none';
                          } else if (data.badgeBgShadow === 'sm') {
                            boxShadow = '0 1px 2px rgba(0,0,0,0.1)';
                          } else if (data.badgeBgShadow === 'md') {
                            boxShadow = '0 4px 6px -1px rgba(0,0,0,0.15), 0 2px 4px -1px rgba(0,0,0,0.06)';
                          } else if (data.badgeBgShadow === 'lg') {
                            boxShadow = '0 10px 15px -3px rgba(0,0,0,0.2)';
                          } else if (data.badgeBgShadow === 'glow') {
                            boxShadow = '0 0 12px rgba(217, 119, 6, 0.45)';
                          } else if (data.badgeBgShadow === 'gold-glow') {
                            boxShadow = '0 0 14px rgba(245, 158, 11, 0.6), inset 0 0 6px rgba(254, 240, 138, 0.4)';
                          }

                          // Width & Dimensions
                          const widthMode = data.badgeBgWidthMode || 'auto';
                          let widthStyle: string | number = 'auto';
                          let minWidthStyle: string | number = 'max-content';
                          let maxWidthStyle: string | number = '260px';

                          if (widthMode === 'custom' && data.badgeBgWidthPx) {
                            widthStyle = `${data.badgeBgWidthPx}px`;
                            minWidthStyle = `${data.badgeBgWidthPx}px`;
                            maxWidthStyle = `${data.badgeBgWidthPx}px`;
                          } else if (widthMode === 'full') {
                            widthStyle = '100%';
                            minWidthStyle = '100%';
                          } else {
                            minWidthStyle = 'max-content';
                          }

                          // Padding
                          const paddingX = data.badgeBgPaddingX ?? (isNoBg ? 0 : 12);
                          const paddingY = data.badgeBgPaddingY ?? (isNoBg ? 0 : 3.5);

                          // Position Offsets
                          const totalOffsetX = (data.badgeTitleOffsetX || 0) + (data.badgeBgOffsetX || 0);
                          const totalOffsetY = (data.badgeTitleOffsetY || 0) + (data.badgeBgOffsetY || 0);

                          // Text Typography & Layout - Support elementStyles.badgeTitle overrides with fallback to direct badgeText properties
                          const badgeElemStyle = getElementCssStyle('badgeTitle', isNoBg ? (data.primaryColor || '#1e293b') : '#ffffff');
                          const textColor = data.elementStyles?.badgeTitle?.color || data.badgeTextColor || (isNoBg ? (data.primaryColor || '#1e293b') : '#ffffff');
                          
                          let rawFontSizePx = data.badgeTextFontSize || 10;
                          if (data.elementStyles?.badgeTitle?.fontSize) {
                            if (data.elementStyles.badgeTitle.fontSize <= 45) {
                              rawFontSizePx = data.elementStyles.badgeTitle.fontSize;
                            } else {
                              rawFontSizePx = Math.round((10 * data.elementStyles.badgeTitle.fontSize) / 100);
                            }
                          }
                          const fontSize = `${rawFontSizePx}px`;

                          const fontFamily = data.elementStyles?.badgeTitle?.fontFamily || data.badgeTextFontFamily || data.fontFamily || 'Cairo';
                          
                          let fontWeight: number = 700;
                          if (data.elementStyles?.badgeTitle?.fontWeight) {
                            fontWeight = data.elementStyles.badgeTitle.fontWeight === 'extrabold' ? 800 :
                              data.elementStyles.badgeTitle.fontWeight === 'bold' ? 700 :
                              data.elementStyles.badgeTitle.fontWeight === 'light' ? 300 : 400;
                          } else if (data.badgeTextFontWeight) {
                            fontWeight = data.badgeTextFontWeight === 'black' ? 900 :
                              data.badgeTextFontWeight === 'extrabold' ? 800 :
                              data.badgeTextFontWeight === 'normal' ? 400 : 700;
                          }

                          const letterSpacing = data.elementStyles?.badgeTitle?.letterSpacing !== undefined 
                            ? `${data.elementStyles.badgeTitle.letterSpacing}px` 
                            : `${data.badgeTextLetterSpacing || 0}px`;

                          const textAlign = data.elementStyles?.badgeTitle?.align || data.badgeTextAlign || 'center';
                          const textWrap = data.badgeTextWrap || 'nowrap';
                          const textOffsetX = data.badgeTextOffsetX || 0;
                          const textOffsetY = data.badgeTextOffsetY || 0;
                          const marginTop = data.elementStyles?.badgeTitle?.marginTop !== undefined ? `${data.elementStyles.badgeTitle.marginTop}px` : undefined;
                          const marginBottom = data.elementStyles?.badgeTitle?.marginBottom !== undefined ? `${data.elementStyles.badgeTitle.marginBottom}px` : undefined;

                          return (
                            <div
                              className="mt-1 transition-transform relative flex flex-col items-center justify-center text-center box-border max-w-full"
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: bgFill,
                                opacity: isNoBg ? 1 : (data.badgeBgOpacity ?? 1),
                                border: borderWidth > 0 ? `${borderWidth}px ${borderStyle} ${borderColor}` : undefined,
                                borderRadius,
                                boxShadow,
                                width: widthStyle,
                                minWidth: minWidthStyle,
                                maxWidth: maxWidthStyle,
                                padding: `${Math.max(paddingY, 3.5)}px ${Math.max(paddingX, 10)}px`,
                                transform: `translate(${totalOffsetX}px, ${totalOffsetY}px)`,
                                boxSizing: 'border-box',
                                margin: '0 auto',
                              }}
                            >
                              <InlineEdit
                                value={data.badgeTitle}
                                onChange={(val) => handleFieldChange('badgeTitle', val)}
                                placeholder="عنوان الوسام"
                                className="w-full text-center max-w-full block font-bold transition-all break-words"
                                style={{
                                  color: textColor,
                                  fontSize,
                                  fontFamily,
                                  fontWeight,
                                  letterSpacing,
                                  textAlign: 'center',
                                  margin: '0 auto',
                                  wordBreak: 'break-word',
                                  overflowWrap: 'anywhere',
                                  lineHeight: '1.2',
                                  maxWidth: '100%',
                                  width: '100%',
                                  display: 'block',
                                  transform: (textOffsetX || textOffsetY) ? `translate(${textOffsetX}px, ${textOffsetY}px)` : undefined,
                                }}
                              />
                            </div>
                          );
                        })()}
                      </div>
                    </DraggableItem>
                  ) : <div className="w-0 h-0" />}
                </div>

                {/* Middle: Stamp / Wax Seal with Auto-fit Text Shape */}
                <div
                  data-grid-area="stamp"
                  style={{
                    gridArea: 'stamp',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%'
                  }}
                  className="flex flex-col justify-center items-center w-full"
                >
                  {data.stamp && data.stamp.show ? (
                    <DraggableItem elementKey="stamp">
                      <div
                        className="flex flex-col items-center justify-center transition-all duration-300 w-full"
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '100%',
                          opacity: data.stamp.opacity ?? 1,
                          transform: `translate(${data.stamp.offsetX || 0}px, ${data.stamp.offsetY || 0}px)`
                        }}
                      >
                        {data.stamp.shape === 'custom' && data.stamp.imageUrl ? (
                          <div
                            className="flex flex-col items-center justify-center w-full"
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '100%',
                              margin: '0 auto',
                            }}
                          >
                            <img
                              src={data.stamp.imageUrl}
                              alt="Stamp"
                              className={`object-contain drop-shadow-md transition-transform hover:scale-105 ${
                                data.stamp.size === 'sm' ? 'h-12 w-12' :
                                data.stamp.size === 'lg' ? 'h-20 w-20' : 'h-16 w-16'
                              }`}
                            />
                            {data.stamp.title && (
                              <div
                                className="w-full flex flex-col items-center justify-center max-w-[180px] text-center mt-0.5"
                                style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: '100%',
                                  margin: '0 auto',
                                  transform: `translate(${data.stamp.textOffsetX || 0}px, ${data.stamp.textOffsetY || 0}px)`,
                                }}
                              >
                                <InlineEdit
                                  value={data.stamp.title}
                                  onChange={(val) => updateStampField('title', val)}
                                  placeholder="عنوان الختم"
                                  className="text-[9px] font-extrabold text-amber-900 max-w-[180px] break-words text-center block"
                                  style={{
                                    textAlign: 'center',
                                    margin: '0 auto',
                                    wordBreak: 'break-word',
                                    overflowWrap: 'anywhere',
                                    maxWidth: '100%',
                                    width: '100%',
                                    lineHeight: '1.2',
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        ) : (
                          <div
                            className={`relative flex flex-col items-center justify-center p-2 text-center shadow-sm box-border leading-tight transition-all ${
                              data.stamp.size === 'sm'
                                ? (data.stamp.shape === 'rectangle' ? 'min-w-[5rem] min-h-[2.5rem] px-3 py-1' : 'w-16 h-16')
                                : data.stamp.size === 'lg'
                                ? (data.stamp.shape === 'rectangle' ? 'min-w-[7.5rem] min-h-[3.75rem] px-5 py-2' : 'w-24 h-24')
                                : (data.stamp.shape === 'rectangle' ? 'min-w-[6.25rem] min-h-[3.125rem] px-4 py-1.5' : 'w-20 h-20')
                            } ${
                              data.stamp.shape === 'wax'
                                ? 'rounded-full bg-gradient-to-br from-amber-600 to-amber-800 text-white border-2 border-yellow-300 shadow-md'
                                : data.stamp.shape === 'ribbon'
                                ? 'rounded-xl bg-indigo-950 text-amber-300 border-2 border-amber-400 shadow-md'
                                : data.stamp.shape === 'square'
                                ? 'rounded-2xl border-2 border-dashed bg-amber-50/90'
                                : data.stamp.shape === 'rectangle'
                                ? 'rounded-2xl border-2 border-dashed bg-amber-50/90'
                                : 'rounded-full border-2 border-dashed bg-amber-50/90'
                            }`}
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              margin: '0 auto',
                              boxSizing: 'border-box',
                              borderColor: (data.stamp.shape === 'wax' || data.stamp.shape === 'ribbon') ? undefined : (data.stamp.color || '#b45309'),
                              color: (data.stamp.shape === 'wax' || data.stamp.shape === 'ribbon') ? undefined : (data.stamp.color || '#b45309')
                            }}
                          >
                            <div
                              className="w-full px-1 max-w-full flex flex-col justify-center items-center text-center transition-transform"
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '100%',
                                margin: '0 auto',
                                transform: `translate(${data.stamp.textOffsetX || 0}px, ${data.stamp.textOffsetY || 0}px)`
                              }}
                            >
                              <InlineEdit
                                value={data.stamp.title}
                                onChange={(val) => updateStampField('title', val)}
                                placeholder="عنوان الختم"
                                className="text-[9px] sm:text-[10px] font-black uppercase leading-tight max-w-full block break-words text-center"
                                style={{
                                  textAlign: 'center',
                                  margin: '0 auto',
                                  wordBreak: 'break-word',
                                  overflowWrap: 'anywhere',
                                  maxWidth: '100%',
                                  width: '100%',
                                  lineHeight: '1.2',
                                }}
                              />
                              <InlineEdit
                                value={data.stamp.subtext}
                                onChange={(val) => updateStampField('subtext', val)}
                                placeholder="نص فرعي"
                                className="text-[7px] opacity-85 mt-0.5 max-w-full block break-words text-center"
                                style={{
                                  textAlign: 'center',
                                  margin: '0 auto',
                                  wordBreak: 'break-word',
                                  overflowWrap: 'anywhere',
                                  maxWidth: '100%',
                                  width: '100%',
                                  lineHeight: '1.2',
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </DraggableItem>
                  ) : <div className="w-0 h-0" />}
                </div>

                {/* Right: Verification Box & QR Code (Footer) */}
                <div data-grid-area="footer" style={{ gridArea: 'footer' }} className="flex justify-center items-center w-full">
                  {((data.showVerificationBox ?? true) && (data.showQrCode ?? true)) ? (() => {
                    const showQr = data.showVerificationQr ?? true;
                    const showBarcode = data.showVerificationBarcode ?? true;
                    const showSerial = data.showVerificationSerialCode ?? true;
                    const showStatusText = data.showVerificationStatusText ?? true;
                    const showIcon = data.showVerificationIcon ?? true;
                    const statusPhrase = data.verificationBadgeText || (isDriveUploaded ? 'موثق على Google Drive 🟢' : 'توثيق معتمد');
                    const pattern = data.verificationBoxPattern || 'classic';
                    const customBg = data.verificationBoxBgColor;
                    const customText = data.verificationBoxTextColor;
                    const customBorder = data.verificationBoxBorderColor;
                    const opacity = data.verificationBoxBgOpacity;
                    const boxSize = data.verificationBoxSize || 'md';

                    const qrCodeElement = showQr ? (
                      <div
                        className="relative shrink-0 transition-transform"
                        title={isDriveUploaded ? "رمز QR يوجه مباشرة إلى رابط الشهادة" : "رمز QR للتحقق الرقمي"}
                        style={{
                          transform: `translate(${data.verificationQrOffsetX || 0}px, ${data.verificationQrOffsetY || 0}px)`
                        }}
                      >
                        {qrDataUrl ? (
                          <img
                            src={qrDataUrl}
                            alt="Verification QR"
                            className={`bg-white p-0.5 rounded-lg border border-slate-300 shadow-2xs block shrink-0 ${
                              boxSize === 'sm' ? 'w-8 h-8' : boxSize === 'lg' ? 'w-12 h-12' : 'w-10 h-10'
                            }`}
                          />
                        ) : (
                          <div className={`bg-slate-100 rounded-lg border flex items-center justify-center text-slate-400 shrink-0 ${
                            boxSize === 'sm' ? 'w-8 h-8' : boxSize === 'lg' ? 'w-12 h-12' : 'w-10 h-10'
                          }`}>
                            <QrCode className={boxSize === 'sm' ? 'w-4 h-4' : boxSize === 'lg' ? 'w-6 h-6' : 'w-5 h-5'} />
                          </div>
                        )}
                      </div>
                    ) : null;

                    const barcodeElement = (showBarcode || showSerial) ? (
                      <div
                        className="flex flex-col items-center justify-center shrink-0 min-w-[90px] transition-transform"
                        style={{
                          transform: `translate(${data.verificationBarcodeOffsetX || 0}px, ${data.verificationBarcodeOffsetY || 0}px)`
                        }}
                      >
                        {showBarcode && (
                          <div
                            className="bg-white px-1.5 py-0.5 border border-slate-300 rounded flex items-center justify-center shadow-2xs overflow-hidden"
                            title={`باركود شريطي يحتوي على الكود: ${verificationCode}`}
                          >
                            {(() => {
                              const { bars, totalWidth } = generateCode39Bars(verificationCode);
                              return (
                                <svg viewBox={`0 0 ${totalWidth} 22`} className={`${boxSize === 'sm' ? 'h-3.5' : boxSize === 'lg' ? 'h-5.5' : 'h-4.5'} w-auto max-w-[120px] select-none block`}>
                                  {bars.map((bar, idx) => (
                                    <rect key={idx} x={bar.x} y="0" width={bar.width} height="22" fill="#0f172a" />
                                  ))}
                                </svg>
                              );
                            })()}
                          </div>
                        )}
                        {showSerial && (
                          <span
                            className={`font-mono font-black tracking-wider whitespace-nowrap block text-center mt-0.5 transition-transform ${
                              boxSize === 'sm' ? 'text-[7.5px]' : boxSize === 'lg' ? 'text-[9.5px]' : 'text-[8.5px]'
                            }`}
                            style={{
                              color: customText || '#0f172a',
                              transform: `translate(${data.verificationSerialOffsetX || 0}px, ${data.verificationSerialOffsetY || 0}px)`
                            }}
                          >
                            {verificationCode}
                          </span>
                        )}
                      </div>
                    ) : null;

                    const statusElement = (showStatusText || showIcon) ? (
                      <div
                        className={`font-bold flex items-center justify-center shrink-0 whitespace-nowrap leading-none text-center group-hover/qr:underline transition-transform ${
                          boxSize === 'sm' ? 'text-[8.5px] mt-1' : boxSize === 'lg' ? 'text-[10.5px] mt-2' : 'text-[9.5px] mt-1.5'
                        }`}
                        style={{
                          color: customText || '#047857',
                          transform: `translate(${data.verificationPhraseOffsetX || 0}px, ${data.verificationPhraseOffsetY || 0}px)`
                        }}
                      >
                        {showIcon && <CheckCircle2 className={`shrink-0 me-1 inline-block ${boxSize === 'sm' ? 'w-2.5 h-2.5' : boxSize === 'lg' ? 'w-3.5 h-3.5' : 'w-3 h-3'}`} style={{ color: customText ? customText : '#059669' }} />}
                        {showStatusText && <span className="shrink-0 whitespace-nowrap leading-none">{statusPhrase}</span>}
                      </div>
                    ) : null;

                    const vOffsetX = data.verificationTextOffsetX || 0;
                    const vOffsetY = data.verificationTextOffsetY || 0;
                    const vTransformStyle = (vOffsetX || vOffsetY) ? { transform: `translate(${vOffsetX}px, ${vOffsetY}px)` } : {};

                    return (
                      <DraggableItem elementKey="qrCode">
                        {pattern === 'modern-card' ? (
                          <div
                            onClick={onOpenVerificationModal}
                            className="flex flex-col items-center justify-center border rounded-2xl shadow-xs hover:border-amber-500 transition cursor-pointer group/qr hover:scale-105 shrink-0 w-auto min-w-[180px] max-w-full box-border overflow-hidden"
                            style={{
                              backgroundColor: customBg || '#f8fafc',
                              borderColor: customBorder || data.primaryColor || '#cbd5e1',
                              opacity: opacity ?? 1,
                              boxSizing: 'border-box',
                              ...vTransformStyle
                            }}
                          >
                            {(showStatusText || showIcon) && (
                              <div
                                className="w-full px-3 py-1 flex items-center justify-center gap-1 text-[9.5px] font-bold text-white shadow-2xs"
                                style={{ backgroundColor: data.primaryColor || '#0f172a' }}
                              >
                                {showIcon && <ShieldCheck className="w-3 h-3 text-amber-300" />}
                                {showStatusText && <span>{statusPhrase}</span>}
                              </div>
                            )}
                            <div className="p-2.5 flex items-center justify-center gap-2.5 w-full">
                              {qrCodeElement}
                              {barcodeElement}
                            </div>
                          </div>
                        ) : pattern === 'seal-stamp' ? (
                          <div
                            onClick={onOpenVerificationModal}
                            className="flex flex-col items-center justify-center p-2.5 border-2 border-dashed rounded-2xl shadow-xs hover:border-amber-500 transition cursor-pointer group/qr hover:scale-105 shrink-0 w-auto min-w-[170px] max-w-full box-border overflow-hidden"
                            style={{
                              backgroundColor: customBg || '#fff8f0',
                              borderColor: customBorder || data.secondaryColor || '#d97706',
                              opacity: opacity ?? 1,
                              boxSizing: 'border-box',
                              ...vTransformStyle
                            }}
                          >
                            {(showStatusText || showIcon) && (
                              <div className="w-full border-b pb-1 mb-1.5 border-amber-200/80 text-center flex items-center justify-center gap-1">
                                {showIcon && <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />}
                                {showStatusText && <span className="text-[9px] font-extrabold text-amber-900 tracking-tight">{statusPhrase}</span>}
                              </div>
                            )}
                            <div className="flex items-center justify-center gap-2">
                              {qrCodeElement}
                              {barcodeElement}
                            </div>
                          </div>
                        ) : pattern === 'barcode-focus' ? (
                          <div
                            onClick={onOpenVerificationModal}
                            className="flex flex-col items-center justify-center p-2 border-2 rounded-xl shadow-xs hover:border-amber-500 transition cursor-pointer group/qr hover:scale-105 shrink-0 w-auto min-w-[195px] max-w-full box-border overflow-hidden"
                            style={{
                              backgroundColor: customBg || '#ffffff',
                              borderColor: customBorder || '#1e293b',
                              opacity: opacity ?? 1,
                              boxSizing: 'border-box',
                              ...vTransformStyle
                            }}
                          >
                            <div className="flex items-center justify-between w-full gap-2 border-b border-slate-200 pb-1 mb-1">
                              {statusElement}
                              {qrCodeElement}
                            </div>
                            <div className="w-full flex justify-center pt-0.5">
                              {barcodeElement}
                            </div>
                          </div>
                        ) : pattern === 'minimal-pill' ? (
                          <div
                            onClick={onOpenVerificationModal}
                            className="flex items-center justify-center gap-2.5 px-3.5 py-1.5 border rounded-full shadow-xs hover:border-amber-500 transition cursor-pointer group/qr hover:scale-105 shrink-0 w-auto max-w-full box-border overflow-hidden"
                            style={{
                              backgroundColor: customBg || '#f1f5f9',
                              borderColor: customBorder || '#cbd5e1',
                              opacity: opacity ?? 1,
                              boxSizing: 'border-box',
                              ...vTransformStyle
                            }}
                          >
                            {qrCodeElement}
                            {barcodeElement}
                            {statusElement}
                          </div>
                        ) : pattern === 'glass-card' ? (
                          <div
                            onClick={onOpenVerificationModal}
                            className="flex flex-col items-center justify-center px-3.5 py-2.5 border border-white/60 bg-white/70 backdrop-blur-md rounded-2xl shadow-md hover:border-amber-400 transition cursor-pointer group/qr hover:scale-105 shrink-0 w-auto min-w-[180px] max-w-full box-border overflow-hidden"
                            style={{
                              backgroundColor: customBg || 'rgba(255, 255, 255, 0.8)',
                              borderColor: customBorder || 'rgba(255, 255, 255, 0.9)',
                              opacity: opacity ?? 1,
                              boxSizing: 'border-box',
                              ...vTransformStyle
                            }}
                          >
                            <div className="flex items-center justify-center gap-2.5 w-full">
                              {qrCodeElement}
                              {barcodeElement}
                            </div>
                            {statusElement}
                          </div>
                        ) : pattern === 'certificate-tag' ? (
                          <div
                            onClick={onOpenVerificationModal}
                            className="relative flex flex-col items-center justify-center px-3.5 pt-3 pb-2 border-2 rounded-b-xl rounded-t-sm shadow-xs hover:border-amber-500 transition cursor-pointer group/qr hover:scale-105 shrink-0 w-auto min-w-[170px] max-w-full box-border overflow-hidden"
                            style={{
                              backgroundColor: customBg || '#fafafa',
                              borderColor: customBorder || data.primaryColor || '#334155',
                              opacity: opacity ?? 1,
                              boxSizing: 'border-box',
                              ...vTransformStyle
                            }}
                          >
                            <div className="absolute top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-slate-300 border border-slate-400 shadow-inner" />
                            <div className="flex items-center justify-center gap-2 mt-1">
                              {qrCodeElement}
                              {barcodeElement}
                            </div>
                            {statusElement}
                          </div>
                        ) : (
                          /* Default 'classic' pattern */
                          <div
                            onClick={onOpenVerificationModal}
                            className="flex flex-col items-center justify-center px-3.5 py-2.5 border rounded-xl shadow-xs hover:border-amber-500 transition cursor-pointer group/qr hover:scale-105 shrink-0 w-auto min-w-[175px] max-w-full box-border overflow-hidden"
                            style={{
                              backgroundColor: customBg || 'rgba(255, 255, 255, 0.95)',
                              borderColor: customBorder || 'rgba(203, 213, 225, 0.9)',
                              color: customText || '#0f172a',
                              opacity: opacity ?? 1,
                              boxSizing: 'border-box',
                              ...vTransformStyle
                            }}
                          >
                            <div className="flex items-center justify-center gap-2 w-full my-auto">
                              {qrCodeElement}
                              {barcodeElement}
                            </div>
                            {statusElement}
                          </div>
                        )}
                      </DraggableItem>
                    );
                  })() : <div className="w-0 h-0" />}
                </div>

              </div>

              {/* 5. Signatures Grid Area */}
              <div
                data-grid-area="signatures"
                className="cert-area-signatures w-full max-w-full shrink-0"
                style={{ gridArea: 'signatures' }}
              >
                <DraggableItem elementKey="signaturesBlock" className="pt-2 border-t w-full max-w-full overflow-hidden transition-all duration-300 ease-in-out">
                  <div
                    className="flex justify-around items-end gap-2 sm:gap-4 flex-wrap w-full max-w-full px-2 box-border transition-all duration-300 ease-in-out"
                    style={{
                      borderColor: `${data.primaryColor}25`,
                      transform: `translate(${data.signaturesBlockOffsetX || 0}px, ${data.signaturesBlockOffsetY || 0}px)`
                    }}
                  >
                    {data.signatures && data.signatures.filter(s => s.show).map((sig) => (
                      <div key={sig.id} className="text-center space-y-0.5 min-w-[110px] max-w-[210px] transition-all duration-300 overflow-hidden shrink-0">
                        <div className="text-[11px] font-bold text-slate-700 max-w-full overflow-visible whitespace-nowrap">
                          <InlineEdit
                            value={sig.title}
                            onChange={(val) => updateSignatureField(sig.id, 'title', val)}
                            placeholder="المسمى الوظيفي"
                            className="font-bold text-slate-700 max-w-full whitespace-nowrap"
                          />
                        </div>
                        
                        <div className="min-h-[2.25rem] h-auto flex items-center justify-center border-b border-dashed border-slate-300 py-0.5 overflow-visible max-w-full">
                          {sig.type === 'draw' || sig.type === 'upload' ? (
                            sig.signatureUrl ? (
                              <img src={sig.signatureUrl} alt="Signature" className="h-full object-contain max-h-12" />
                            ) : (
                              <span className="font-serif italic text-base text-slate-900">{sig.name}</span>
                            )
                          ) : (
                            <span
                              className={`text-lg sm:text-xl font-bold transition-all ${getSignatureFontClass(sig.fontFamily)}`}
                              style={{
                                color: sig.color || data.primaryColor || '#0f172a',
                                fontFamily: sig.fontFamily ? `'${sig.fontFamily}', 'Aref Ruqaa', cursive, serif` : "'Aref Ruqaa', cursive, serif"
                              }}
                            >
                              <InlineEdit
                                value={sig.signatureText || sig.name}
                                onChange={(val) => updateSignatureField(sig.id, 'signatureText', val)}
                                placeholder="التوقيع بخط اليد"
                                className={`text-lg sm:text-xl font-bold max-w-full whitespace-nowrap ${getSignatureFontClass(sig.fontFamily)}`}
                                style={{
                                  color: sig.color || data.primaryColor || '#0f172a',
                                  fontFamily: sig.fontFamily ? `'${sig.fontFamily}', 'Aref Ruqaa', cursive, serif` : "'Aref Ruqaa', cursive, serif"
                                }}
                              />
                            </span>
                          )}
                        </div>

                        <div className="text-xs font-semibold max-w-full overflow-visible whitespace-nowrap" style={{ color: data.primaryColor }}>
                          <InlineEdit
                            value={sig.name}
                            onChange={(val) => updateSignatureField(sig.id, 'name', val)}
                            placeholder="اسم الموقع"
                            className="font-semibold max-w-full whitespace-nowrap"
                            style={{ color: data.primaryColor }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </DraggableItem>
              </div>

                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  </div>
  );
};
