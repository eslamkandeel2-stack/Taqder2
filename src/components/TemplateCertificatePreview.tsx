import React from 'react';
import { CertificateData, BadgeIconType, FrameStyle, FontOption } from '../types';
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
  ShieldCheck,
  Building2,
  Sparkle
} from 'lucide-react';
import { generateCode39Bars } from '../utils/barcodeUtils';
import { getGradientCss } from '../utils/gradientUtils';

export interface TemplateCertificatePreviewProps {
  data: Partial<CertificateData>;
  mode?: 'card' | 'modal' | 'compact' | 'mini';
  className?: string;
  showHoverZoom?: boolean;
}

export const TemplateCertificatePreview: React.FC<TemplateCertificatePreviewProps> = ({
  data,
  mode = 'card',
  className = '',
  showHoverZoom = false,
}) => {
  // Extract styling props with robust fallbacks
  const primaryColor = data.primaryColor || '#854d0e';
  const secondaryColor = data.secondaryColor || '#d97706';
  const accentColor = data.accentColor || '#fef08a';
  const backgroundColor = data.backgroundColor || '#fefce8';
  const textColor = data.textColor || '#1e293b';
  const fontFamily = (data.fontFamily as FontOption) || 'Cairo';
  const frameStyle = (data.frameStyle as FrameStyle) || 'double-gold';
  const frameColor = data.borderColor || primaryColor;
  const frameSecColor = data.borderSecondaryColor || secondaryColor;
  const borderWidth = data.borderWidth !== undefined ? data.borderWidth : 2;

  const isModal = mode === 'modal';
  const isCompact = mode === 'compact';
  const isMini = mode === 'mini';
  const isCard = mode === 'card';

  // Inset calculation
  const borderPadding = isModal ? 18 : isCard ? 10 : isCompact ? 7 : 4;

  const title = data.title || 'شهادة شكر وتقدير';
  const subtitle = data.subtitle || 'تقديرًا للإنجاز والتميز والإبداع';
  const schoolName = data.schoolName || 'مدرسة التميز النموذجية';
  const recipientIntro = data.recipientIntro || 'تتقدم الإدارة بوافر الشكر والتقدير إلى:';
  const studentName = data.studentName || 'محمد بن عبد الله آل سعود';
  const grade = data.grade || 'الصف الأول الثانوي - شعبة المتفوقين';
  const appreciationText =
    data.appreciationText ||
    'نظرًا لما أبداه من جد واجتهاد وحصوله على المراكز الأولى، نتمنى له دوام التوفيق والنجاح.';
  const poemOrQuote = data.poemOrQuote || '«مَن خَطا نَحوَ العُلا خُطوَةً... جَنى مِنَ الثِمارِ أحلى النِعَم»';
  const badgeTitle = data.badgeTitle || 'وسام التميز';
  const badgeIcon = (data.badgeIcon as BadgeIconType) || 'trophy';
  const showBadge = data.showBadge !== false;
  const showStamp = data.stamp?.show !== false;
  const stamp = data.stamp || {
    id: '1',
    title: 'الختم الرسمي',
    subtext: 'معتمد رسمياً',
    color: primaryColor,
    shape: 'circle' as const,
    show: true,
  };
  const signatures = data.signatures && data.signatures.length > 0 ? data.signatures : [
    { id: '1', name: 'أ. عبد الرحمن السعيد', title: 'معلم المادة', type: 'type' as const, signatureText: 'عبد الرحمن السعيد', show: true },
    { id: '2', name: 'د. خالد العصيمي', title: 'مدير المدرسة', type: 'type' as const, signatureText: 'د. خالد العصيمي', show: true }
  ];

  // Font family helper
  const getFontFamilyCss = (font: string) => {
    return `'${font}', '${font.replace(/\s+/g, '')}', Amiri, Cairo, Tajawal, sans-serif`;
  };

  // Render Badge Icon Helper
  const renderBadgeIcon = (iconName: BadgeIconType, iconClass: string) => {
    switch (iconName) {
      case 'trophy': return <Trophy className={iconClass} />;
      case 'crown': return <Crown className={iconClass} />;
      case 'star': return <Star className={iconClass} />;
      case 'shield': return <Shield className={iconClass} />;
      case 'heart': return <Heart className={iconClass} />;
      case 'sparkles': return <Sparkles className={iconClass} />;
      case 'book': return <BookOpen className={iconClass} />;
      case 'target': return <Target className={iconClass} />;
      case 'medal': return <Medal className={iconClass} />;
      case 'award':
      default:
        return <Award className={iconClass} />;
    }
  };

  // Render Detailed Frame Borders with geometric/calligraphic corners
  const renderFrame = () => {
    const inset = borderPadding;
    const strokeW = isModal ? Math.max(2, borderWidth * 1.3) : isCard ? 1.5 : 1;
    const thickStrokeW = isModal ? Math.max(4, borderWidth * 2.2) : isCard ? 2.5 : 1.5;

    switch (frameStyle) {
      case 'guilloche-royal':
        return (
          <>
            <div
              className="absolute pointer-events-none rounded-sm"
              style={{
                top: `${inset}px`,
                bottom: `${inset}px`,
                left: `${inset}px`,
                right: `${inset}px`,
                border: `${thickStrokeW}px double ${frameColor}`,
              }}
            />
            <div
              className="absolute pointer-events-none rounded-xs"
              style={{
                top: `${inset + (isModal ? 6 : 3)}px`,
                bottom: `${inset + (isModal ? 6 : 3)}px`,
                left: `${inset + (isModal ? 6 : 3)}px`,
                right: `${inset + (isModal ? 6 : 3)}px`,
                border: `${strokeW}px dashed ${frameSecColor}`,
              }}
            />
            {!isMini && [
              { pos: 'top-1 left-1', rot: '0deg' },
              { pos: 'top-1 right-1', rot: '90deg' },
              { pos: 'bottom-1 left-1', rot: '270deg' },
              { pos: 'bottom-1 right-1', rot: '180deg' },
            ].map((c, i) => (
              <div key={i} className={`absolute ${c.pos} ${isModal ? 'w-8 h-8' : 'w-5 h-5'} pointer-events-none`} style={{ transform: `rotate(${c.rot})` }}>
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  <circle cx="50" cy="50" r="42" fill="none" stroke={frameColor} strokeWidth="4" strokeDasharray="4 4" />
                  <circle cx="50" cy="50" r="30" fill="none" stroke={frameSecColor} strokeWidth="3" />
                  <polygon points="50,20 60,40 80,50 60,60 50,80 40,60 20,50 40,40" fill={frameSecColor} opacity="0.85" />
                </svg>
              </div>
            ))}
          </>
        );

      case 'golden-vines':
      case 'floral-corners':
      case 'victorian-crest':
        return (
          <>
            <div
              className="absolute pointer-events-none rounded-lg"
              style={{
                top: `${inset}px`,
                bottom: `${inset}px`,
                left: `${inset}px`,
                right: `${inset}px`,
                border: `${thickStrokeW}px solid ${frameColor}`,
              }}
            />
            <div
              className="absolute pointer-events-none rounded-md"
              style={{
                top: `${inset + (isModal ? 5 : 2.5)}px`,
                bottom: `${inset + (isModal ? 5 : 2.5)}px`,
                left: `${inset + (isModal ? 5 : 2.5)}px`,
                right: `${inset + (isModal ? 5 : 2.5)}px`,
                border: `${strokeW}px dotted ${frameSecColor}`,
              }}
            />
            {!isMini && [
              { pos: 'top-0.5 left-0.5', tf: 'none' },
              { pos: 'top-0.5 right-0.5', tf: 'scaleX(-1)' },
              { pos: 'bottom-0.5 left-0.5', tf: 'scaleY(-1)' },
              { pos: 'bottom-0.5 right-0.5', tf: 'scale(-1, -1)' },
            ].map((item, i) => (
              <div key={i} className={`absolute ${item.pos} ${isModal ? 'w-10 h-10' : 'w-6 h-6'} pointer-events-none`} style={{ transform: item.tf }}>
                <svg viewBox="0 0 100 100" fill="none" stroke={frameColor} strokeWidth="3">
                  <path d="M10 90 C 20 50, 50 20, 90 10" />
                  <path d="M30 65 C 20 60, 15 45, 25 45 C 35 45, 35 60, 30 65" fill={frameSecColor} />
                  <path d="M55 40 C 45 35, 40 20, 50 20 C 60 20, 60 35, 55 40" fill={frameSecColor} />
                </svg>
              </div>
            ))}
          </>
        );

      case 'andalusian-star':
      case 'moroccan-mosaic':
      case 'islamic-arch':
      case 'oriental-islamic':
        return (
          <>
            <div
              className="absolute pointer-events-none rounded-sm"
              style={{
                top: `${inset}px`,
                bottom: `${inset}px`,
                left: `${inset}px`,
                right: `${inset}px`,
                border: `${thickStrokeW}px solid ${frameColor}`,
              }}
            />
            <div
              className="absolute pointer-events-none rounded-2xs"
              style={{
                top: `${inset + (isModal ? 6 : 3)}px`,
                bottom: `${inset + (isModal ? 6 : 3)}px`,
                left: `${inset + (isModal ? 6 : 3)}px`,
                right: `${inset + (isModal ? 6 : 3)}px`,
                border: `${strokeW}px solid ${frameSecColor}`,
              }}
            />
            {!isMini && ['top-0.5 left-0.5', 'top-0.5 right-0.5', 'bottom-0.5 left-0.5', 'bottom-0.5 right-0.5'].map((pos, i) => (
              <div key={i} className={`absolute ${pos} ${isModal ? 'w-7 h-7' : 'w-4 h-4'} pointer-events-none flex items-center justify-center`}>
                <div
                  className="w-full h-full flex items-center justify-center border shadow-2xs"
                  style={{ transform: 'rotate(45deg)', backgroundColor: frameColor, borderColor: frameSecColor, borderWidth: '1px' }}
                >
                  <div
                    className="w-1/2 h-1/2 flex items-center justify-center"
                    style={{ transform: 'rotate(45deg)', backgroundColor: frameSecColor }}
                  >
                    <div className="w-1 h-1 rounded-full" style={{ backgroundColor: frameColor }} />
                  </div>
                </div>
              </div>
            ))}
          </>
        );

      case 'modern-geometric':
      case 'geometric-cyber':
        return (
          <>
            <div
              className="absolute top-0 left-0 w-16 h-16 rounded-br-full pointer-events-none opacity-20"
              style={{ backgroundColor: frameColor }}
            />
            <div
              className="absolute bottom-0 right-0 w-16 h-16 rounded-tl-full pointer-events-none opacity-20"
              style={{ backgroundColor: frameSecColor }}
            />
            <div
              className="absolute pointer-events-none rounded-md"
              style={{
                top: `${inset}px`,
                bottom: `${inset}px`,
                left: `${inset}px`,
                right: `${inset}px`,
                border: `${thickStrokeW}px solid ${frameColor}`,
              }}
            />
          </>
        );

      case 'double-gold':
      case 'classic-ornate':
      case 'emerald-border':
      case 'royal-ribbon':
      case 'clean-minimal':
      case 'baroque-gold':
      case 'vintage-certificate':
      default:
        return (
          <>
            <div
              className="absolute pointer-events-none rounded-sm shadow-2xs"
              style={{
                top: `${inset}px`,
                bottom: `${inset}px`,
                left: `${inset}px`,
                right: `${inset}px`,
                borderStyle: 'solid',
                borderWidth: `${thickStrokeW}px`,
                borderColor: frameColor,
              }}
            />
            <div
              className="absolute pointer-events-none rounded-2xs"
              style={{
                top: `${inset + (isModal ? 5 : 2.5)}px`,
                bottom: `${inset + (isModal ? 5 : 2.5)}px`,
                left: `${inset + (isModal ? 5 : 2.5)}px`,
                right: `${inset + (isModal ? 5 : 2.5)}px`,
                borderStyle: 'solid',
                borderWidth: `${strokeW}px`,
                borderColor: frameSecColor,
              }}
            />
            {!isMini && (
              <>
                <div
                  className={`absolute ${isModal ? 'w-6 h-6' : 'w-3.5 h-3.5'} pointer-events-none`}
                  style={{
                    top: `${inset + 1}px`,
                    left: `${inset + 1}px`,
                    borderTop: `${thickStrokeW + 1}px solid ${frameColor}`,
                    borderLeft: `${thickStrokeW + 1}px solid ${frameColor}`,
                  }}
                />
                <div
                  className={`absolute ${isModal ? 'w-6 h-6' : 'w-3.5 h-3.5'} pointer-events-none`}
                  style={{
                    top: `${inset + 1}px`,
                    right: `${inset + 1}px`,
                    borderTop: `${thickStrokeW + 1}px solid ${frameColor}`,
                    borderRight: `${thickStrokeW + 1}px solid ${frameColor}`,
                  }}
                />
                <div
                  className={`absolute ${isModal ? 'w-6 h-6' : 'w-3.5 h-3.5'} pointer-events-none`}
                  style={{
                    bottom: `${inset + 1}px`,
                    left: `${inset + 1}px`,
                    borderBottom: `${thickStrokeW + 1}px solid ${frameColor}`,
                    borderLeft: `${thickStrokeW + 1}px solid ${frameColor}`,
                  }}
                />
                <div
                  className={`absolute ${isModal ? 'w-6 h-6' : 'w-3.5 h-3.5'} pointer-events-none`}
                  style={{
                    bottom: `${inset + 1}px`,
                    right: `${inset + 1}px`,
                    borderBottom: `${thickStrokeW + 1}px solid ${frameColor}`,
                    borderRight: `${thickStrokeW + 1}px solid ${frameColor}`,
                  }}
                />
              </>
            )}
          </>
        );
    }
  };

  // Render Official Seal / Stamp
  const renderStamp = () => {
    if (!showStamp || isMini) return null;
    const stampColor = stamp.color || primaryColor;

    if (stamp.shape === 'wax') {
      return (
        <div
          className={`${isModal ? 'w-13 h-13' : isCard ? 'w-8 h-8' : 'w-6 h-6'} rounded-full flex flex-col items-center justify-center text-center shadow-md relative shrink-0`}
          style={{
            background: `radial-gradient(circle at 35% 35%, ${stampColor}, #78350f 90%)`,
            border: `1.5px solid ${accentColor || '#fef08a'}`,
            color: '#ffffff',
          }}
        >
          <Sparkle className={`${isModal ? 'w-3.5 h-3.5' : isCard ? 'w-2 h-2' : 'w-1.5 h-1.5'} text-amber-200`} />
          <span className={`${isModal ? 'text-[7px]' : isCard ? 'text-[4.5px]' : 'text-[3.5px]'} font-black leading-none mt-0.5`}>
            {stamp.title || 'ختم معتمد'}
          </span>
          <span className={`${isModal ? 'text-[5px]' : isCard ? 'text-[3.5px]' : 'text-[2.5px]'} opacity-80 leading-none`}>
            {stamp.subtext || 'رسمي'}
          </span>
        </div>
      );
    }

    return (
      <div
        className={`${isModal ? 'w-13 h-13' : isCard ? 'w-8 h-8' : 'w-6 h-6'} rounded-full border-1.5 flex flex-col items-center justify-center text-center relative shrink-0 shadow-2xs`}
        style={{
          borderColor: stampColor,
          color: stampColor,
          backgroundColor: `${stampColor}08`,
        }}
      >
        <div
          className="absolute inset-0.5 rounded-full border border-dashed pointer-events-none"
          style={{ borderColor: stampColor }}
        />
        <span className={`${isModal ? 'text-[6.5px]' : isCard ? 'text-[4.5px]' : 'text-[3.5px]'} font-extrabold leading-none px-0.5 line-clamp-1`}>
          {stamp.title || 'الختم الرسمي'}
        </span>
        <div className="flex items-center gap-0.5 text-amber-500 my-0.5">
          <Star className={`${isModal ? 'w-1.5 h-1.5' : 'w-1 h-1'} fill-current`} />
          <Star className={`${isModal ? 'w-1.5 h-1.5' : 'w-1 h-1'} fill-current`} />
          <Star className={`${isModal ? 'w-1.5 h-1.5' : 'w-1 h-1'} fill-current`} />
        </div>
        <span className={`${isModal ? 'text-[5px]' : isCard ? 'text-[3.5px]' : 'text-[2.5px]'} font-semibold opacity-85 leading-none line-clamp-1`}>
          {stamp.subtext || 'معتمد'}
        </span>
      </div>
    );
  };

  // Render Medal / Badge
  const renderBadge = () => {
    if (!showBadge || isMini) return null;

    return (
      <div className="flex flex-col items-center text-center shrink-0">
        {/* Medal Outer Circle */}
        <div
          className={`${isModal ? 'w-11 h-11' : isCard ? 'w-7 h-7' : 'w-5 h-5'} rounded-full flex items-center justify-center shadow-md relative`}
          style={{
            background: `linear-gradient(135deg, ${accentColor || '#fef08a'} 0%, ${secondaryColor || '#d97706'} 50%, ${primaryColor} 100%)`,
            border: `1.5px solid #ffffff`,
          }}
        >
          {/* Inner medal core */}
          <div
            className={`${isModal ? 'w-8.5 h-8.5' : isCard ? 'w-5 h-5' : 'w-3.5 h-3.5'} rounded-full flex items-center justify-center text-slate-900 bg-white/90 shadow-inner`}
          >
            {renderBadgeIcon(badgeIcon, isModal ? 'w-5 h-5 text-amber-700' : isCard ? 'w-3 h-3 text-amber-700' : 'w-2 h-2 text-amber-700')}
          </div>

          {/* Ribbon Tails */}
          <div
            className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3.5 h-1.5 flex justify-between pointer-events-none opacity-90"
          >
            <div className="w-1 h-1.5 bg-amber-600 rounded-b-xs rotate-[-15deg]" />
            <div className="w-1 h-1.5 bg-amber-600 rounded-b-xs rotate-[15deg]" />
          </div>
        </div>

        {/* Badge Title Pill */}
        <div
          className={`mt-0.5 ${isModal ? 'px-2 py-0.5 text-[8px]' : isCard ? 'px-1 py-0.2 text-[5px]' : 'px-0.5 text-[4px]'} rounded-full font-black shadow-2xs whitespace-nowrap line-clamp-1 border`}
          style={{
            backgroundColor: primaryColor,
            color: '#ffffff',
            borderColor: secondaryColor,
          }}
        >
          {badgeTitle}
        </div>
      </div>
    );
  };

  // Render Barcode & Security Verification Box
  const renderVerificationBox = () => {
    if (isMini) return null;
    const barsData = generateCode39Bars(data.verificationCode || 'TAQDEER-2026');

    return (
      <div
        className={`${isModal ? 'p-1.5 space-y-0.5' : isCard ? 'p-1 space-y-0.5' : 'p-0.5'} rounded-md border flex flex-col items-center justify-center bg-white/85 shrink-0 text-center shadow-2xs`}
        style={{ borderColor: `${primaryColor}35` }}
      >
        <div className="flex items-center gap-0.5">
          <ShieldCheck className={`${isModal ? 'w-3 h-3' : isCard ? 'w-2 h-2' : 'w-1.5 h-1.5'} text-emerald-600`} />
          <span className={`${isModal ? 'text-[6.5px]' : isCard ? 'text-[4.5px]' : 'text-[3.5px]'} font-extrabold text-slate-800`}>
            توثيق معتمد
          </span>
        </div>

        {/* Mini Barcode SVG */}
        <div className={`${isModal ? 'h-2.5' : isCard ? 'h-1.5' : 'h-1'} flex items-center justify-center overflow-hidden`}>
          <svg viewBox={`0 0 ${barsData.totalWidth} 15`} className="h-full w-auto">
            {barsData.bars.map((bar, idx) => (
              <rect key={idx} x={bar.x} y={0} width={bar.width} height={15} fill="#0f172a" />
            ))}
          </svg>
        </div>

        <span className={`${isModal ? 'text-[5.5px]' : isCard ? 'text-[4px]' : 'text-[3px]'} font-mono font-bold text-slate-600 leading-none`}>
          {data.verificationCode || 'TAQDEER-2026'}
        </span>
      </div>
    );
  };

  // Background Gradient or solid
  const bgStyle: React.CSSProperties = {
    backgroundColor: backgroundColor,
    color: textColor,
    fontFamily: getFontFamilyCss(fontFamily),
    ...(data.bgGradient?.enabled ? { background: getGradientCss(data.bgGradient) } : {}),
  };

  // Padding inside the frame
  const contentPaddingClass = isModal
    ? 'pt-4 pb-3 px-6'
    : isCard
    ? 'pt-2.5 pb-2 px-3.5'
    : isCompact
    ? 'pt-2 pb-1.5 px-2.5'
    : 'p-1.5';

  return (
    <div
      className={`w-full aspect-[1.414] rounded-xl shadow-md relative overflow-hidden flex flex-col justify-between select-none transition-transform duration-300 ${
        showHoverZoom ? 'group-hover:scale-[1.02]' : ''
      } ${className}`}
      style={bgStyle}
      dir="rtl"
    >
      {/* Decorative Outer Frames */}
      {renderFrame()}

      {/* Subtle Background Watermark Text */}
      {data.watermarkText && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.035] select-none rotate-[-15deg] overflow-hidden">
          <span className="text-3xl sm:text-5xl font-black uppercase text-center whitespace-nowrap">
            {data.watermarkText}
          </span>
        </div>
      )}

      {/* TOP HEADER: School Name (Right), Emblem Logo (Center), Date/Place (Left) */}
      <div className={`relative z-10 ${contentPaddingClass} flex items-center justify-between gap-1.5 w-full`}>
        {/* Right side: Country & School / Institution */}
        <div className="text-right space-y-0.2 max-w-[38%] shrink-0">
          <span
            className={`${isModal ? 'text-[9.5px]' : isCard ? 'text-[6px]' : 'text-[5px]'} font-bold opacity-75 block`}
            style={{ color: secondaryColor }}
          >
            المملكة العربية السعودية
          </span>
          <span
            className={`${isModal ? 'text-[11.5px]' : isCard ? 'text-[7.5px]' : 'text-[6px]'} font-black block leading-tight line-clamp-1`}
            style={{ color: primaryColor }}
          >
            {schoolName}
          </span>
        </div>

        {/* Center: Emblem Logo */}
        <div className="flex flex-col items-center justify-center shrink-0">
          <div
            className={`${isModal ? 'w-8 h-8' : isCard ? 'w-5 h-5' : 'w-4 h-4'} rounded-full border flex items-center justify-center shadow-2xs`}
            style={{ borderColor: primaryColor, backgroundColor: `${primaryColor}12` }}
          >
            {data.logoUrl ? (
              <img src={data.logoUrl} alt="Logo" className="w-full h-full object-contain rounded-full" />
            ) : (
              <Building2 className={`${isModal ? 'w-4 h-4' : isCard ? 'w-2.5 h-2.5' : 'w-2 h-2'}`} style={{ color: primaryColor }} />
            )}
          </div>
        </div>

        {/* Left side: Date & Reference */}
        <div className="text-left space-y-0.2 max-w-[38%] shrink-0">
          <span
            className={`${isModal ? 'text-[9px]' : isCard ? 'text-[5.5px]' : 'text-[4.5px]'} font-semibold opacity-75 block`}
            style={{ color: textColor }}
          >
            التاريخ: {data.issueDateHijri || '1447/08/15 هـ'}
          </span>
          <span
            className={`${isModal ? 'text-[9px]' : isCard ? 'text-[5.5px]' : 'text-[4.5px]'} font-semibold opacity-75 block`}
            style={{ color: textColor }}
          >
            المكان: {data.issuePlace || 'الرياض'}
          </span>
        </div>
      </div>

      {/* MIDDLE SECTION: Title, Subtitle, Recipient, Appreciation, Quote */}
      <div className={`relative z-10 px-4 text-center flex flex-col items-center justify-center my-auto ${isMini ? 'space-y-0.5' : 'space-y-1'}`}>
        {/* Certificate Main Title */}
        <h3
          className={`${isModal ? 'text-lg' : isCard ? 'text-[11px]' : isCompact ? 'text-[9.5px]' : 'text-[7.5px]'} font-black tracking-tight leading-tight line-clamp-1`}
          style={{ color: primaryColor }}
        >
          {title}
        </h3>

        {/* Subtitle */}
        {subtitle && !isMini && (
          <p
            className={`${isModal ? 'text-[9.5px]' : isCard ? 'text-[6px]' : 'text-[5px]'} font-bold opacity-85 line-clamp-1`}
            style={{ color: secondaryColor }}
          >
            {subtitle}
          </p>
        )}

        {/* Recipient Box */}
        <div
          className={`w-full max-w-[94%] ${isModal ? 'py-1.5 px-3 rounded-xl' : isCard ? 'py-0.8 px-2 rounded-lg' : 'py-0.5 px-1.5 rounded-md'} border shadow-2xs`}
          style={{
            backgroundColor: `${primaryColor}08`,
            borderColor: `${primaryColor}22`,
          }}
        >
          {!isMini && (
            <span className={`${isModal ? 'text-[8.5px]' : isCard ? 'text-[5.5px]' : 'text-[4.5px]'} opacity-75 block font-bold`}>
              {recipientIntro}
            </span>
          )}
          <h2
            className={`${isModal ? 'text-base' : isCard ? 'text-[10px]' : isCompact ? 'text-[8.5px]' : 'text-[7px]'} font-black my-0.2 line-clamp-1`}
            style={{ color: primaryColor }}
          >
            {studentName}
          </h2>
          <span
            className={`${isModal ? 'text-[9px]' : isCard ? 'text-[5.5px]' : 'text-[4.5px]'} font-semibold opacity-85 block line-clamp-1`}
            style={{ color: secondaryColor }}
          >
            {grade}
          </span>
        </div>

        {/* Appreciation Text */}
        <p
          className={`${isModal ? 'text-[9.5px] leading-relaxed max-w-lg' : isCard ? 'text-[5.5px] leading-tight max-w-xs' : 'text-[4.5px] leading-tight max-w-[180px]'} opacity-90 line-clamp-2`}
          style={{ color: textColor }}
        >
          {appreciationText}
        </p>

        {/* Poetic Verse / Quote */}
        {poemOrQuote && !isMini && (
          <p
            className={`${isModal ? 'text-[8.5px]' : isCard ? 'text-[5px]' : 'text-[4px]'} font-bold italic opacity-80 line-clamp-1`}
            style={{ color: secondaryColor }}
          >
            {poemOrQuote}
          </p>
        )}
      </div>

      {/* FOOTER SECTION: Badges & Stamps (Right), Signatures (Center/Left), Verification (Left) */}
      <div className={`relative z-10 ${contentPaddingClass} flex items-center justify-between gap-1 w-full border-t border-black/5`}>
        {/* Right side: Stamp & Medal Badge */}
        <div className="flex items-center gap-1.5 shrink-0">
          {renderBadge()}
          {renderStamp()}
        </div>

        {/* Center / Signatures */}
        <div className="flex items-center justify-center gap-2 sm:gap-4 flex-1 min-w-0">
          {signatures.slice(0, 2).map((sig) => (
            <div key={sig.id} className="text-center space-y-0.2 min-w-[50px] max-w-[90px]">
              <span className={`${isModal ? 'text-[8px]' : isCard ? 'text-[5px]' : 'text-[4px]'} font-semibold opacity-75 block line-clamp-1`}>
                {sig.title}
              </span>
              <div
                className={`${isModal ? 'text-[9.5px]' : isCard ? 'text-[6px]' : 'text-[5px]'} font-bold italic line-clamp-1`}
                style={{
                  color: primaryColor,
                  fontFamily: `'Aref Ruqaa', 'Amiri', serif`,
                }}
              >
                {sig.signatureText || sig.name}
              </div>
              <div className="w-10 sm:w-14 h-0.5 border-b border-dashed border-slate-300 mx-auto opacity-70" />
            </div>
          ))}
        </div>

        {/* Left side: Verification Barcode / Seal */}
        <div className="flex items-center shrink-0">
          {renderVerificationBox()}
        </div>
      </div>
    </div>
  );
};
