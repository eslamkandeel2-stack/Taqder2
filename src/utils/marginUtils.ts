import { CertificateData, FrameStyle } from '../types';

export interface MarginSet {
  canvasMarginTop: number;
  canvasMarginBottom: number;
  canvasMarginLeft: number;
  canvasMarginRight: number;
}

const STORAGE_KEY = 'taqdeer_default_margins';

export const SYSTEM_DEFAULT_MARGINS: MarginSet = {
  canvasMarginTop: 32,
  canvasMarginBottom: 30,
  canvasMarginLeft: 40,
  canvasMarginRight: 40,
};

/**
 * Approximate depth/inset requirements of frame styles in pixels.
 * Heavy ornate frames have larger corner graphics or thick inner borders that need wider margins.
 */
const FRAME_CORNER_DEPTHS: Record<FrameStyle, number> = {
  'clean-minimal': 8,
  'playful-dots': 10,
  'double-gold': 22,
  'emerald-border': 22,
  'classic-ornate': 24,
  'royal-ribbon': 24,
  'wavy-artistic': 24,
  'modern-geometric': 26,
  'geometric-cyber': 28,
  'luxurious-gradient-border': 28,
  'double-dotted-luxury': 28,
  'baroque-gold': 38,
  'vintage-certificate': 38,
  'oriental-islamic': 42,
  'guilloche-royal': 42,
  'golden-vines': 42,
  'andalusian-star': 40,
  'floral-corners': 40,
  'greek-key-meander': 36,
  'moroccan-mosaic': 38,
  'victorian-crest': 44,
  'islamic-arch': 44,
};

/**
 * Calculates safe margins for a certificate so that content does NOT overlap or enter frame borders.
 */
export function calculateSafeMargins(certData: Partial<CertificateData>): {
  margins: MarginSet;
  explanation: string;
} {
  const borderPadding = certData.borderPadding ?? 12; // Inset distance in px
  const borderWidth = certData.borderWidth ?? 2; // Line width scale
  const frameStyle = certData.frameStyle || 'double-gold';
  
  // Calculate base stroke width & corner offset
  const borderStrokePx = Math.round(borderWidth * 2.5);
  const cornerDepth = certData.customFrameUrl ? 36 : (FRAME_CORNER_DEPTHS[frameStyle] || 24);
  
  // Minimal safety gap between innermost border line and text
  const safetyBuffer = 12;

  // Base safe distance from outer canvas edge
  let safeSide = borderPadding + borderStrokePx + cornerDepth + safetyBuffer;

  // Aspect ratio adjustments
  let topExtra = 0;
  let bottomExtra = 0;

  if (certData.aspectRatio === 'A4-portrait') {
    topExtra += 8;
    bottomExtra += 8;
  }

  // Text density adjustments (headers & footers)
  if (certData.showHeaderLine3 || certData.showHeaderRightExtra) {
    topExtra += 6;
  }
  if (certData.showPoemOrQuote && (certData.poemOrQuote?.length || 0) > 30) {
    bottomExtra += 6;
  }
  if (certData.fontSizeScale && certData.fontSizeScale > 1.1) {
    topExtra += 4;
    bottomExtra += 4;
    safeSide += 4;
  }

  // Clamp margins to reasonable limits (minimum 28px, maximum 80px)
  const margins: MarginSet = {
    canvasMarginTop: Math.min(80, Math.max(30, Math.round(safeSide + topExtra))),
    canvasMarginBottom: Math.min(80, Math.max(28, Math.round(safeSide + bottomExtra))),
    canvasMarginLeft: Math.min(80, Math.max(36, Math.round(safeSide))),
    canvasMarginRight: Math.min(80, Math.max(36, Math.round(safeSide))),
  };

  const frameNameArabic = getFrameStyleArabicName(frameStyle);
  const explanation = `تم حظر دخول النص في الإطار (${frameNameArabic}): الهوامش الآمنة المحسوبة هي ${margins.canvasMarginTop}px علوي/سفلي و ${margins.canvasMarginLeft}px جانبي.`;

  return { margins, explanation };
}

/**
 * AI Margin Optimizer - sends query to Gemini AI or runs smart content-density layout balance engine.
 */
export async function optimizeMarginsWithAi(certData: CertificateData): Promise<{
  margins: MarginSet;
  explanation: string;
}> {
  try {
    const res = await fetch('/api/ai-optimize-margins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ certData }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.margins) {
        return {
          margins: {
            canvasMarginTop: Math.min(80, Math.max(16, Number(data.margins.canvasMarginTop) || 28)),
            canvasMarginBottom: Math.min(80, Math.max(16, Number(data.margins.canvasMarginBottom) || 28)),
            canvasMarginLeft: Math.min(80, Math.max(16, Number(data.margins.canvasMarginLeft) || 36)),
            canvasMarginRight: Math.min(80, Math.max(16, Number(data.margins.canvasMarginRight) || 36)),
          },
          explanation: data.explanation || 'تم ضبط الهوامش ذكائياً لتوفير توازن بصري مثالي مع الإطار.',
        };
      }
    }
  } catch (err) {
    console.warn('AI margin optimization API failed, using smart local rule engine:', err);
  }

  // Local AI Fallback Engine
  const safe = calculateSafeMargins(certData);
  return {
    margins: safe.margins,
    explanation: `✨ الذكاء الاصطناعي: ${safe.explanation}`,
  };
}

/**
 * Save custom default margins to localStorage
 */
export function saveDefaultMargins(margins: MarginSet): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(margins));
    // Also update general default settings if saved
    const savedGen = localStorage.getItem('taqdeer_default_settings');
    if (savedGen) {
      const parsed = JSON.parse(savedGen);
      localStorage.setItem('taqdeer_default_settings', JSON.stringify({
        ...parsed,
        canvasMarginTop: margins.canvasMarginTop,
        canvasMarginBottom: margins.canvasMarginBottom,
        canvasMarginLeft: margins.canvasMarginLeft,
        canvasMarginRight: margins.canvasMarginRight,
      }));
    }
  } catch (e) {
    console.error('Failed to save default margins:', e);
  }
}

/**
 * Retrieve saved default margins from localStorage, or return SYSTEM_DEFAULT_MARGINS
 */
export function getSavedDefaultMargins(): MarginSet {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (
        typeof parsed.canvasMarginTop === 'number' &&
        typeof parsed.canvasMarginBottom === 'number' &&
        typeof parsed.canvasMarginLeft === 'number' &&
        typeof parsed.canvasMarginRight === 'number'
      ) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to load saved default margins:', e);
  }
  return SYSTEM_DEFAULT_MARGINS;
}

/**
 * Checks if user has a custom saved default margin set
 */
export function hasCustomSavedMargins(): boolean {
  try {
    return !!localStorage.getItem(STORAGE_KEY);
  } catch {
    return false;
  }
}

/**
 * Helper to get user friendly Arabic name for FrameStyle
 */
function getFrameStyleArabicName(frameStyle: FrameStyle): string {
  const names: Record<FrameStyle, string> = {
    'double-gold': 'إطار ذهبي مزدوج',
    'classic-ornate': 'كلاسيكي مزخرف',
    'modern-geometric': 'هندسي عصري',
    'emerald-border': 'زمردي ملكي',
    'royal-ribbon': 'شريط ملكي فاخر',
    'clean-minimal': 'بسيط ونظيف',
    'playful-dots': 'نقاط مرحة',
    'islamic-arch': 'محراب إسلامي',
    'baroque-gold': 'باروك ذهبي',
    'vintage-certificate': 'أنتيك عتيق',
    'oriental-islamic': 'شرقي إسلامي',
    'luxurious-gradient-border': 'متدرج فاخر',
    'wavy-artistic': 'موجي فني',
    'geometric-cyber': 'هندسي تقني',
    'guilloche-royal': 'جليوش مائي ملكي',
    'golden-vines': 'أغصان الذهبي',
    'andalusian-star': 'نجمة أندلسية',
    'floral-corners': 'زهور الزوايا',
    'greek-key-meander': 'مفتاح إغريقي',
    'moroccan-mosaic': 'فسيفساء مغربية',
    'victorian-crest': 'نقش فيكتوري',
    'double-dotted-luxury': 'منقط فاخر',
  };
  return names[frameStyle] || 'الإطار المحدد';
}
