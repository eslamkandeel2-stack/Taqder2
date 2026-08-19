import { CertificateData, LayoutPreset } from '../types';
import { calculateSafeMargins, MarginSet } from './marginUtils';

export interface LayoutOptimizationResult {
  recommendedLayoutPreset: LayoutPreset;
  elementFontSizes: {
    title: number;
    subtitle?: number;
    recipientIntro?: number;
    studentName: number;
    grade?: number;
    appreciationText: number;
    appreciationLineHeight?: number;
    poemOrQuote?: number;
    schoolHeader?: number;
    schoolName?: number;
    signatures?: number;
  };
  margins: MarginSet;
  spacings: {
    recipientSpacing: number;
    logoSizePx: number;
    signaturesSpacing?: number;
  };
  resetOverlappingOffsets: boolean;
  customGridConfig?: {
    gridTemplateAreas: string;
    gridTemplateColumns?: string;
    gridTemplateRows?: string;
  };
  explanation: string;
  highlights: string[];
  source: 'ai' | 'local';
}

export interface LayoutIssue {
  id: string;
  title: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  suggestedAction: string;
}

/**
 * AI Layout Optimizer - calls Gemini AI to calculate the most balanced, collision-free layout
 */
export async function optimizeLayoutWithAi(
  certData: CertificateData,
  targetPreset?: LayoutPreset
): Promise<LayoutOptimizationResult> {
  try {
    const res = await fetch('/api/ai-optimize-layout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ certData, targetPreset }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.optimization) {
        const opt = data.optimization;
        return {
          recommendedLayoutPreset: (opt.recommendedLayoutPreset as LayoutPreset) || certData.layoutPreset || 'classic-standard',
          elementFontSizes: {
            title: Math.min(44, Math.max(28, Number(opt.elementFontSizes?.title) || 36)),
            subtitle: Math.min(20, Math.max(14, Number(opt.elementFontSizes?.subtitle) || 16.5)),
            recipientIntro: Math.min(20, Math.max(14, Number(opt.elementFontSizes?.recipientIntro) || 17)),
            studentName: Math.min(42, Math.max(28, Number(opt.elementFontSizes?.studentName) || 34)),
            grade: Math.min(18, Math.max(13, Number(opt.elementFontSizes?.grade) || 15)),
            appreciationText: Math.min(22, Math.max(15, Number(opt.elementFontSizes?.appreciationText) || 17.5)),
            appreciationLineHeight: Math.min(2.0, Math.max(1.4, Number(opt.elementFontSizes?.appreciationLineHeight) || 1.6)),
            poemOrQuote: Math.min(18, Math.max(13, Number(opt.elementFontSizes?.poemOrQuote) || 15)),
            schoolHeader: Math.min(16, Math.max(11, Number(opt.elementFontSizes?.schoolHeader) || 13)),
            schoolName: Math.min(19, Math.max(13, Number(opt.elementFontSizes?.schoolName) || 16)),
            signatures: Math.min(16, Math.max(12, Number(opt.elementFontSizes?.signatures) || 13.5)),
          },
          margins: {
            canvasMarginTop: Math.min(60, Math.max(16, Number(opt.margins?.canvasMarginTop) || 24)),
            canvasMarginBottom: Math.min(60, Math.max(16, Number(opt.margins?.canvasMarginBottom) || 24)),
            canvasMarginLeft: Math.min(60, Math.max(16, Number(opt.margins?.canvasMarginLeft) || 32)),
            canvasMarginRight: Math.min(60, Math.max(16, Number(opt.margins?.canvasMarginRight) || 32)),
          },
          spacings: {
            recipientSpacing: Math.min(14, Math.max(3, Number(opt.spacings?.recipientSpacing) || 5)),
            logoSizePx: Math.min(90, Math.max(36, Number(opt.spacings?.logoSizePx) || 48)),
            signaturesSpacing: Math.min(18, Math.max(3, Number(opt.spacings?.signaturesSpacing) || 6)),
          },
          resetOverlappingOffsets: opt.resetOverlappingOffsets ?? true,
          customGridConfig: opt.customGridConfig,
          explanation: opt.explanation || 'تمت ملاءمة مقاسات النصوص وتوزيع عناصر الشهادة بالذكاء الاصطناعي لتملأ مساحة الشهادة بفخامة ووضوح دون تداخل.',
          highlights: Array.isArray(opt.highlights) && opt.highlights.length > 0
            ? opt.highlights
            : [
                'ملاءمة حجم الخطوط لتكون فخمة ومقروءة بوضوح وتملأ قالب الشهادة بانسجام',
                'تأمين هوامش حماية متوازنة لمنع اقتراب النصوص من إطار الشهادة',
                'موازنة التواقيع والأختام والتوسيط البصري الهندسي الدقيق',
              ],
          source: 'ai',
        };
      }
    }
  } catch (err) {
    console.warn('AI Layout optimization endpoint unavailable, switching to local layout engine:', err);
  }

  // Fallback to local deterministic engine
  return autoFitLayoutLocally(certData, targetPreset);
}

/**
 * Local Deterministic Layout Auto-Fit Engine (Instant Heuristic Calculation)
 */
export function autoFitLayoutLocally(
  certData: CertificateData,
  targetPreset?: LayoutPreset
): LayoutOptimizationResult {
  const currentPreset = targetPreset || certData.layoutPreset || 'classic-standard';
  const isPortrait = certData.aspectRatio === 'A4-portrait';
  
  // Calculate text lengths
  const titleLen = (certData.title || '').length;
  const studentNameLen = (certData.studentName || '').length;
  const appreciationLen = (certData.appreciationText || '').length;
  const poemLen = certData.showPoemOrQuote !== false ? (certData.poemOrQuote || '').length : 0;
  const signaturesCount = (certData.signatures || []).filter(s => s.show !== false).length;
  const hasExtraHeaders = Boolean(certData.showHeaderLine3 || certData.showHeaderRightExtra || certData.showHeaderLeftExtra1);

  // 1. Calculate Safe Margins
  const safeMargins = calculateSafeMargins(certData).margins;

  // 2. Calculate Appreciation Text Font Size & Line Height based on density
  let appreciationFontSize = 17.5;
  let appreciationLineHeight = 1.6;

  if (appreciationLen > 240) {
    appreciationFontSize = isPortrait ? 16.5 : 15.5;
    appreciationLineHeight = 1.5;
  } else if (appreciationLen > 150) {
    appreciationFontSize = isPortrait ? 17.5 : 16.5;
    appreciationLineHeight = 1.55;
  } else if (appreciationLen > 80) {
    appreciationFontSize = isPortrait ? 18.0 : 17.5;
    appreciationLineHeight = 1.6;
  } else if (appreciationLen > 0) {
    appreciationFontSize = isPortrait ? 19.0 : 18.5;
    appreciationLineHeight = 1.7;
  }

  // Multi-signature space balance
  if (signaturesCount >= 3) {
    appreciationFontSize = Math.max(15.0, appreciationFontSize - 0.5);
  }
  if (poemLen > 60) {
    appreciationFontSize = Math.max(15.0, appreciationFontSize - 0.5);
  }

  // 3. Title Font Size (Generous, bold, prestigious)
  let titleFontSize = 36;
  if (titleLen > 40) {
    titleFontSize = 32;
  } else if (titleLen > 25) {
    titleFontSize = 35;
  } else if (titleLen < 15) {
    titleFontSize = 38;
  }

  // 4. Student Name Font Size (Distinct and prominent)
  let studentNameFontSize = 33;
  if (studentNameLen > 35) {
    studentNameFontSize = 29;
  } else if (studentNameLen > 22) {
    studentNameFontSize = 32;
  } else if (studentNameLen < 16) {
    studentNameFontSize = 36;
  }

  // 5. Layout Preset Recommendation
  let recommendedLayout: LayoutPreset = currentPreset;
  if (!targetPreset || targetPreset === ('classic' as any)) {
    if (appreciationLen > 180 && signaturesCount >= 2 && !isPortrait) {
      recommendedLayout = 'modern-split';
    } else if (isPortrait) {
      recommendedLayout = 'classic-standard';
    }
  }

  // 6. Component Spacings
  const recipientSpacing = appreciationLen > 160 ? 4 : 6;
  const logoSizePx = hasExtraHeaders ? 44 : 52;
  const signaturesSpacing = signaturesCount >= 3 ? 4 : 8;

  const highlights: string[] = [];
  if (appreciationLen > 150) {
    highlights.push(`ملاءمة خط نص التكريم إلى ${appreciationFontSize}px لضمان تناسق التوزيع وملء الشهادة بوضوح`);
  } else {
    highlights.push('ضبط تباعد العناصر وتوسيط متن الشهادة بشكل متناغم وفخم');
  }
  highlights.push(`تأمين هوامش آمنة (${safeMargins.canvasMarginTop}px علوي، ${safeMargins.canvasMarginLeft}px جانبي) لحماية النص من الإطار`);
  highlights.push('تصفير إزاحات السحب اليدوي السابقة لضمان التوسيط الهندسي الدقيق');

  return {
    recommendedLayoutPreset: recommendedLayout,
    elementFontSizes: {
      title: titleFontSize,
      subtitle: 16,
      recipientIntro: 17,
      studentName: studentNameFontSize,
      grade: 15,
      appreciationText: appreciationFontSize,
      appreciationLineHeight,
      poemOrQuote: 15,
      schoolHeader: 13,
      schoolName: 16,
      signatures: 13.5,
    },
    margins: safeMargins,
    spacings: {
      recipientSpacing,
      logoSizePx,
      signaturesSpacing,
    },
    resetOverlappingOffsets: true,
    explanation: `تمت مواءمة مقاسات النصوص والهوامش (${safeMargins.canvasMarginTop}px) لتملأ قالب الشهادة بفخامة ووضوح دون تداخل.`,
    highlights,
    source: 'local',
  };
}

/**
 * Applies layout optimization results into a clean updated CertificateData object
 */
export function applyOptimizationToCertificateData(
  currentData: CertificateData,
  opt: LayoutOptimizationResult
): CertificateData {
  const existingStyles = currentData.elementStyles || {};

  // Build new elementStyles with optimized font sizes and line heights
  const updatedStyles: any = {
    ...existingStyles,
    title: {
      ...(existingStyles.title || {}),
      fontSize: opt.elementFontSizes.title,
      align: existingStyles.title?.align || 'center',
    },
    subtitle: {
      ...(existingStyles.subtitle || {}),
      fontSize: opt.elementFontSizes.subtitle || existingStyles.subtitle?.fontSize,
      align: existingStyles.subtitle?.align || 'center',
    },
    recipientIntro: {
      ...(existingStyles.recipientIntro || {}),
      fontSize: opt.elementFontSizes.recipientIntro || existingStyles.recipientIntro?.fontSize,
      align: existingStyles.recipientIntro?.align || 'center',
    },
    studentName: {
      ...(existingStyles.studentName || {}),
      fontSize: opt.elementFontSizes.studentName,
      align: existingStyles.studentName?.align || 'center',
    },
    grade: {
      ...(existingStyles.grade || {}),
      fontSize: opt.elementFontSizes.grade || existingStyles.grade?.fontSize,
      align: existingStyles.grade?.align || 'center',
    },
    appreciationText: {
      ...(existingStyles.appreciationText || {}),
      fontSize: opt.elementFontSizes.appreciationText,
      align: existingStyles.appreciationText?.align || 'center',
    },
    poemOrQuote: {
      ...(existingStyles.poemOrQuote || {}),
      fontSize: opt.elementFontSizes.poemOrQuote || existingStyles.poemOrQuote?.fontSize,
      align: existingStyles.poemOrQuote?.align || 'center',
    },
    schoolHeader: {
      ...(existingStyles.schoolHeader || {}),
      fontSize: opt.elementFontSizes.schoolHeader || existingStyles.schoolHeader?.fontSize,
    },
    schoolName: {
      ...(existingStyles.schoolName || {}),
      fontSize: opt.elementFontSizes.schoolName || existingStyles.schoolName?.fontSize,
    },
  };

  const newData: CertificateData = {
    ...currentData,
    layoutPreset: opt.recommendedLayoutPreset,
    canvasMarginTop: opt.margins.canvasMarginTop,
    canvasMarginBottom: opt.margins.canvasMarginBottom,
    canvasMarginLeft: opt.margins.canvasMarginLeft,
    canvasMarginRight: opt.margins.canvasMarginRight,
    recipientSpacing: opt.spacings.recipientSpacing,
    logoSizePx: opt.spacings.logoSizePx,
    fontSizeScale: currentData.fontSizeScale && currentData.fontSizeScale < 0.85 ? 1.0 : (currentData.fontSizeScale ?? 1.0),
    elementStyles: updatedStyles,
  };

  // If reset offsets requested, clean all drag coordinates that could cause misplacement
  if (opt.resetOverlappingOffsets) {
    newData.titleOffsetX = 0;
    newData.titleOffsetY = 0;
    newData.subtitleOffsetX = 0;
    newData.subtitleOffsetY = 0;
    newData.recipientIntroOffsetX = 0;
    newData.recipientIntroOffsetY = 0;
    newData.studentNameOffsetX = 0;
    newData.studentNameOffsetY = 0;
    newData.gradeOffsetX = 0;
    newData.gradeOffsetY = 0;
    newData.appreciationTextOffsetX = 0;
    newData.appreciationTextOffsetY = 0;
    newData.poemOrQuoteOffsetX = 0;
    newData.poemOrQuoteOffsetY = 0;
    newData.headerTextOffsetX = 0;
    newData.headerTextOffsetY = 0;
    newData.headerDateOffsetX = 0;
    newData.headerDateOffsetY = 0;
    newData.logoOffsetX = 0;
    newData.logoOffsetY = 0;
    newData.signaturesBlockOffsetX = 0;
    newData.signaturesBlockOffsetY = 0;
  }

  // If custom grid configuration was provided
  if (opt.customGridConfig && opt.recommendedLayoutPreset === 'custom-grid') {
    newData.customGridTemplateAreas = opt.customGridConfig.gridTemplateAreas;
    if (opt.customGridConfig.gridTemplateColumns) {
      newData.customGridTemplateColumns = opt.customGridConfig.gridTemplateColumns;
    }
    if (opt.customGridConfig.gridTemplateRows) {
      newData.customGridTemplateRows = opt.customGridConfig.gridTemplateRows;
    }
  }

  return newData;
}

/**
 * Diagnostics helper: Detects if current certificate content is likely to overflow or collide
 */
export function detectLayoutPotentialIssues(certData: CertificateData): {
  hasIssues: boolean;
  severity: 'high' | 'medium' | 'low' | 'none';
  issues: LayoutIssue[];
} {
  const issues: LayoutIssue[] = [];

  const appreciationLen = (certData.appreciationText || '').length;
  const signaturesCount = (certData.signatures || []).filter(s => s.show !== false).length;
  const hasPoem = certData.showPoemOrQuote !== false && Boolean(certData.poemOrQuote);
  const currentAppreciationSize = Number(certData.elementStyles?.appreciationText?.fontSize) || 15;
  const hasExtraHeaderLines = Boolean(certData.showHeaderLine3 && certData.showHeaderRightExtra);

  // 1. Check long text + high font size
  if (appreciationLen > 220 && currentAppreciationSize >= 15) {
    issues.push({
      id: 'appreciation-overflow',
      title: 'نص التكريم طويل جداً مقارنة بحجم الخط الحالي',
      description: `يحتوي نص التكريم على ${appreciationLen} حرف مع خط بمقاس ${currentAppreciationSize}px مما قد يسبب ملامسة التواقيع أو النزول أسفل الصفحة.`,
      severity: 'high',
      suggestedAction: 'استخدم التنسيق الذكي لتصغير الخط إلى 13px وملاءمة تباعد الأسطر.',
    });
  }

  // 2. Check multiple signatures + long body + vertical crowding
  if (signaturesCount >= 3 && appreciationLen > 140 && hasPoem) {
    issues.push({
      id: 'vertical-crowding',
      title: 'تزاحم عمودي بين التواقيع والأختام وبيوت الشعر',
      description: 'وجود 3 تواقيع أو أكثر مع بيت شعر ونصوص متعددة قد يضغط مساحة التوقيعات.',
      severity: 'medium',
      suggestedAction: 'نوصي بالتبديل إلى التخطيط العصري المدمج (Modern Split) لتوزيع الأختام بجانب التواقيع.',
    });
  }

  // 3. Check tight margins vs heavy frame
  const safeMargins = calculateSafeMargins(certData).margins;
  const currentTopMargin = certData.canvasMarginTop ?? 24;
  if (currentTopMargin < safeMargins.canvasMarginTop - 8) {
    issues.push({
      id: 'frame-collision',
      title: 'الهوامش ضيقة مقارنة بنمط الإطار المختار',
      description: `الهامش الحالي (${currentTopMargin}px) أقل من الهامش الموصى به (${safeMargins.canvasMarginTop}px) مما قد يجعل نصوص الترويسة تلامس زخارف الإطار.`,
      severity: 'medium',
      suggestedAction: 'توسيع الهوامش الآمنة تلقائياً بنقرة زر واحدة.',
    });
  }

  // 4. Check manual drag offsets overlap
  const hasSignificantOffsets = 
    Math.abs(certData.titleOffsetY || 0) > 30 ||
    Math.abs(certData.studentNameOffsetY || 0) > 30 ||
    Math.abs(certData.appreciationTextOffsetY || 0) > 30;

  if (hasSignificantOffsets) {
    issues.push({
      id: 'drag-offsets',
      title: 'توجد إزاحات يدوية متباينة قد تخل بالتوسيط التلقائي',
      description: 'تم تحريك بعض النصوص يدوياً بمسافات كبيرة قد تؤدي لتراكب النصوص مع العناصر المجاورة.',
      severity: 'low',
      suggestedAction: 'تصفير الإزاحات والمحاذاة الذكية لإعادة الضبط الهندسي الدقيق.',
    });
  }

  const severity = issues.some(i => i.severity === 'high')
    ? 'high'
    : issues.some(i => i.severity === 'medium')
    ? 'medium'
    : issues.length > 0
    ? 'low'
    : 'none';

  return {
    hasIssues: issues.length > 0,
    severity,
    issues,
  };
}
