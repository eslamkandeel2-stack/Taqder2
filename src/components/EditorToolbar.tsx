import React, { useState } from 'react';
import { CertificateData, FontOption, AspectRatioOption, FrameStyle, BadgeIconType, SignatureItem, GradientConfig, GradientType, ElementStyles, TextElementStyle, LayoutPreset } from '../types';
import { TEMPLATE_PRESETS } from '../data/templates';
import { BACKGROUND_TEXTURES } from '../data/backgrounds';
import {
  getFormattedTodayDate,
  getTodayHijriDate,
  getTodayGregorianDate,
  normalizeDateDigits,
  getSavedDefaultSettings,
  saveDefaultSettingsToStorage,
  saveCurrentCertificateAsDefaultSettings,
  applyDefaultsToCertificate,
  extractCertificateToDefaultSettings
} from '../utils/defaultSettings';
import { GRADIENT_PRESETS, GRADIENT_COLOR_SWATCHES } from '../utils/gradientUtils';
import { generateVerificationCode, sanitizeVerificationCode } from '../utils/qrUtils';
import {
  adaptCertificateGender,
  adaptCertificateGenderSync,
  RecipientGender,
  CERTIFICATE_TYPES_LIST,
  generateCertificateByTypeLocal,
  generateLocalCertificateFallback,
  CertificateTypePreset
} from '../utils/genderConverter';
import { getSavedAISettings } from '../utils/aiConfig';
import {
  calculateSafeMargins,
  optimizeMarginsWithAi,
  saveDefaultMargins,
  getSavedDefaultMargins,
  hasCustomSavedMargins,
  SYSTEM_DEFAULT_MARGINS
} from '../utils/marginUtils';
import { SignaturePadModal } from './SignaturePadModal';
import { TemplateGalleryModal } from './TemplateGalleryModal';
import { LogoCropModal } from './LogoCropModal';
import { removeWhiteBackgroundCanvas, removeBackgroundAi } from '../utils/imageUtils';
import { validateGridTemplateAreas, CUSTOM_GRID_SNIPPETS, CERTIFICATE_GRID_AREAS } from '../utils/gridValidator';
import {
  optimizeLayoutWithAi,
  autoFitLayoutLocally,
  applyOptimizationToCertificateData,
  detectLayoutPotentialIssues,
  LayoutOptimizationResult
} from '../utils/layoutOptimizer';
import {
  Sparkles,
  Palette,
  Type,
  FileText,
  Award,
  Stamp,
  Maximize2,
  Share2,
  Mail,
  Download,
  Plus,
  Trash2,
  PenTool,
  Image as ImageIcon,
  Check,
  Upload,
  Layers,
  Printer,
  Undo2,
  Redo2,
  Calendar,
  Sliders,
  LayoutGrid,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Bold,
  Cloud,
  RotateCcw,
  SlidersHorizontal,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Copy,
  Move,
  Crop,
  X,
  ShieldAlert,
  BookmarkCheck,
  Save,
  Info,
  CheckCircle2,
  QrCode,
  ScanLine,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Code,
  AlertTriangle,
  Wrench,
  Wand2,
  BrainCircuit,
  FolderHeart,
  Star,
  Eye,
  EyeOff,
  Lock,
  Unlock
} from 'lucide-react';
import {
  getSavedDrafts,
  saveCertificateAsDraft,
  deleteSavedDraft,
  subscribeToDrafts,
  DraftCertificateItem
} from '../utils/draftsManager';
import {
  getSavedSystemConfig,
  SystemSettingsConfig,
  isElementLocked,
  isFeatureEnabled
} from '../utils/systemConfig';

interface Props {
  certificateData: CertificateData;
  onChange: (newData: CertificateData) => void;
  onOpenAiModal: (tab?: 'improve' | 'full' | 'settings', field?: 'appreciation' | 'title' | 'intro' | 'poem') => void;
  onExportPDF: () => void;
  onExportImage: () => void;
  onShareEmail: () => void;
  onShareWhatsApp?: () => void;
  onPrint?: () => void;
  onSaveToCloud?: () => void;
  onUpdateCloudCertificate?: () => void;
  onOpenGoogleDriveModal?: () => void;
  onOpenDraftsModal?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
}

const OffsetPad: React.FC<{
  title: string;
  subtitle?: string;
  offsetX: number;
  offsetY: number;
  onChangeX: (val: number) => void;
  onChangeY: (val: number) => void;
  onReset: () => void;
  min?: number;
  max?: number;
  defaultOpen?: boolean;
}> = ({
  title,
  subtitle,
  offsetX,
  offsetY,
  onChangeX,
  onChangeY,
  onReset,
  min = -100,
  max = 100,
  defaultOpen = false,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const isModified = offsetX !== 0 || offsetY !== 0;

  return (
    <div className="mt-1.5 rounded-xl border border-slate-200/90 overflow-hidden bg-slate-50/70 transition-all shadow-2xs">
      <div
        className="flex items-center justify-between px-2.5 py-1.5 bg-slate-100/75 hover:bg-slate-200/70 transition cursor-pointer select-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 text-right">
          <Move className={`w-3.5 h-3.5 ${isModified ? 'text-amber-600 font-extrabold' : 'text-slate-500'}`} />
          <span>تحريك {title}</span>
          {isModified && (
            <span className="text-[10px] bg-amber-100 text-amber-900 border border-amber-300/80 px-1.5 py-0.5 rounded-md font-mono dir-ltr font-bold">
              X:{offsetX > 0 ? `+${offsetX}` : offsetX} Y:{offsetY > 0 ? `+${offsetY}` : offsetY}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {isModified && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onReset();
              }}
              className="px-1.5 py-0.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 rounded text-[10px] font-bold transition flex items-center gap-0.5 cursor-pointer"
              title="إعادة ضبط الموضع للصفر"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              <span>إعادة</span>
            </button>
          )}
          <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${isOpen ? 'rotate-180 text-amber-600' : ''}`} />
        </div>
      </div>

      {isOpen && (
        <div className="p-2.5 bg-white border-t border-slate-200/70 space-y-2">
          {subtitle && <p className="text-[10px] text-slate-500">{subtitle}</p>}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <div className="flex justify-between text-[10px] font-bold text-slate-700 mb-0.5">
                <span>أفقي (يمين/يسار):</span>
                <span className="font-mono text-amber-700 dir-ltr">{offsetX > 0 ? `+${offsetX}` : offsetX}px</span>
              </div>
              <input
                type="range"
                min={min}
                max={max}
                value={offsetX}
                onChange={(e) => onChangeX(parseInt(e.target.value) || 0)}
                className="w-full accent-amber-500 cursor-pointer h-1.5"
              />
            </div>

            <div>
              <div className="flex justify-between text-[10px] font-bold text-slate-700 mb-0.5">
                <span>رأسي (أعلى/أسفل):</span>
                <span className="font-mono text-amber-700 dir-ltr">{offsetY > 0 ? `+${offsetY}` : offsetY}px</span>
              </div>
              <input
                type="range"
                min={min}
                max={max}
                value={offsetY}
                onChange={(e) => onChangeY(parseInt(e.target.value) || 0)}
                className="w-full accent-amber-500 cursor-pointer h-1.5"
              />
            </div>
          </div>

          <div className="flex items-center justify-between bg-slate-50 px-2 py-1 rounded-lg border border-slate-200/80">
            <span className="text-[10px] font-bold text-slate-600">تحريك دقيق:</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onChangeY(Math.max(min, offsetY - 2))}
                className="p-1 bg-white hover:bg-amber-100 border border-slate-200 rounded text-slate-800 transition cursor-pointer"
                title="تحريك للأعلى"
              >
                <ArrowUp className="w-3 h-3 text-slate-700" />
              </button>
              <button
                type="button"
                onClick={() => onChangeY(Math.min(max, offsetY + 2))}
                className="p-1 bg-white hover:bg-amber-100 border border-slate-200 rounded text-slate-800 transition cursor-pointer"
                title="تحريك للأسفل"
              >
                <ArrowDown className="w-3 h-3 text-slate-700" />
              </button>
              <button
                type="button"
                onClick={() => onChangeX(Math.max(min, offsetX - 2))}
                className="p-1 bg-white hover:bg-amber-100 border border-slate-200 rounded text-slate-800 transition cursor-pointer"
                title="تحريك لليمين (العربية)"
              >
                <ArrowRight className="w-3 h-3 text-slate-700" />
              </button>
              <button
                type="button"
                onClick={() => onChangeX(Math.min(max, offsetX + 2))}
                className="p-1 bg-white hover:bg-amber-100 border border-slate-200 rounded text-slate-800 transition cursor-pointer"
                title="تحريك لليسار"
              >
                <ArrowLeft className="w-3 h-3 text-slate-700" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const FramePreviewThumbnail: React.FC<{
  frameStyle: FrameStyle;
  primaryColor?: string;
  secondaryColor?: string;
}> = ({ frameStyle, primaryColor = '#d97706', secondaryColor = '#f59e0b' }) => {
  return (
    <div className="w-full h-12 bg-slate-50/90 rounded-lg border border-slate-200 p-1 relative overflow-hidden flex items-center justify-center my-1.5 transition-all group-hover:border-amber-400 select-none">
      <div className="absolute inset-1 border border-slate-200/50 bg-white/90 rounded-2xs pointer-events-none" />

      {frameStyle === 'double-gold' && (
        <div className="absolute inset-1.5 border-2 rounded-2xs pointer-events-none" style={{ borderColor: primaryColor }}>
          <div className="absolute inset-0.5 border pointer-events-none" style={{ borderColor: secondaryColor }} />
        </div>
      )}

      {frameStyle === 'guilloche-royal' && (
        <div className="absolute inset-1.5 border-2 border-double pointer-events-none" style={{ borderColor: primaryColor }}>
          <div className="absolute inset-1 border border-dashed pointer-events-none" style={{ borderColor: secondaryColor }} />
          <span className="absolute top-0.5 left-0.5 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: primaryColor }} />
          <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: primaryColor }} />
        </div>
      )}

      {frameStyle === 'golden-vines' && (
        <div className="absolute inset-1.5 border-2 rounded-md pointer-events-none" style={{ borderColor: primaryColor }}>
          <div className="absolute inset-1 border border-dotted rounded-2xs pointer-events-none" style={{ borderColor: secondaryColor }} />
          <span className="absolute -top-1 -left-1 text-[8px]" style={{ color: primaryColor }}>🌿</span>
          <span className="absolute -top-1 -right-1 text-[8px] transform -scale-x-100" style={{ color: primaryColor }}>🌿</span>
        </div>
      )}

      {frameStyle === 'andalusian-star' && (
        <div className="absolute inset-1.5 border-2 pointer-events-none" style={{ borderColor: primaryColor }}>
          <div className="absolute inset-1 border pointer-events-none" style={{ borderColor: secondaryColor }} />
          <div className="absolute top-0.5 left-0.5 w-2 h-2 rotate-45 border" style={{ backgroundColor: primaryColor, borderColor: secondaryColor }} />
          <div className="absolute top-0.5 right-0.5 w-2 h-2 rotate-45 border" style={{ backgroundColor: primaryColor, borderColor: secondaryColor }} />
        </div>
      )}

      {frameStyle === 'floral-corners' && (
        <div className="absolute inset-1.5 border-2 rounded-md pointer-events-none" style={{ borderColor: primaryColor }}>
          <div className="absolute inset-1 border border-dashed pointer-events-none" style={{ borderColor: secondaryColor }} />
          <span className="absolute -top-1 -left-1 text-[9px]">🌸</span>
          <span className="absolute -top-1 -right-1 text-[9px]">🌸</span>
        </div>
      )}

      {frameStyle === 'greek-key-meander' && (
        <div className="absolute inset-1.5 border-2 pointer-events-none" style={{ borderColor: primaryColor }}>
          <div className="absolute inset-0.5 border-t border-b pointer-events-none opacity-60" style={{ borderColor: secondaryColor }} />
        </div>
      )}

      {frameStyle === 'moroccan-mosaic' && (
        <div className="absolute inset-1.5 border-2 rounded-lg pointer-events-none" style={{ borderColor: primaryColor }}>
          <div className="absolute inset-1 border-2 border-dotted pointer-events-none" style={{ borderColor: secondaryColor }} />
        </div>
      )}

      {frameStyle === 'oriental-islamic' && (
        <div className="absolute inset-1.5 border-2 pointer-events-none" style={{ borderColor: primaryColor }}>
          <div className="absolute inset-1 border pointer-events-none" style={{ borderColor: secondaryColor }} />
          <span className="absolute top-0 left-1/2 -translate-x-1/2 -mt-1 text-[8px]" style={{ color: primaryColor }}>🕌</span>
        </div>
      )}

      {frameStyle === 'baroque-gold' && (
        <div className="absolute inset-1.5 border-2 rounded-2xs pointer-events-none" style={{ borderColor: primaryColor }}>
          <span className="absolute -top-1 -left-1 text-[9px]">⚜️</span>
          <span className="absolute -top-1 -right-1 text-[9px]">⚜️</span>
        </div>
      )}

      {frameStyle === 'luxurious-gradient-border' && (
        <div className="absolute inset-1.5 border-4 pointer-events-none rounded-2xs" style={{ borderColor: primaryColor }}>
          <div className="absolute inset-0.5 border pointer-events-none" style={{ borderColor: secondaryColor }} />
        </div>
      )}

      {frameStyle === 'royal-ribbon' && (
        <div className="absolute inset-1.5 border-2 pointer-events-none" style={{ borderColor: primaryColor }}>
          <div className="absolute top-0 left-0 right-0 h-2.5" style={{ backgroundColor: primaryColor }}>
            <div className="w-full h-0.5 mt-1.5" style={{ backgroundColor: secondaryColor }} />
          </div>
        </div>
      )}

      {frameStyle === 'islamic-arch' && (
        <div className="absolute inset-1.5 border-2 rounded-b-md pointer-events-none" style={{ borderColor: primaryColor }}>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-2 rounded-b-full border-b-2" style={{ borderColor: secondaryColor, backgroundColor: primaryColor + '20' }} />
        </div>
      )}

      {frameStyle === 'victorian-crest' && (
        <div className="absolute inset-1.5 border-2 pointer-events-none" style={{ borderColor: primaryColor }}>
          <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 text-[9px]">👑</span>
        </div>
      )}

      {frameStyle === 'vintage-certificate' && (
        <div className="absolute inset-1.5 border-2 border-double pointer-events-none" style={{ borderColor: primaryColor }}>
          <div className="absolute inset-1 border pointer-events-none" style={{ borderColor: secondaryColor }} />
        </div>
      )}

      {frameStyle === 'classic-ornate' && (
        <div className="absolute inset-1.5 border-2 pointer-events-none" style={{ borderColor: primaryColor }}>
          <div className="absolute inset-0.5 border pointer-events-none" style={{ borderColor: secondaryColor }} />
          <div className="absolute inset-1 border pointer-events-none" style={{ borderColor: primaryColor }} />
        </div>
      )}

      {frameStyle === 'double-dotted-luxury' && (
        <div className="absolute inset-1.5 border-2 pointer-events-none" style={{ borderColor: primaryColor }}>
          <div className="absolute inset-1 border-2 border-dotted pointer-events-none" style={{ borderColor: secondaryColor }} />
        </div>
      )}

      {frameStyle === 'emerald-border' && (
        <div className="absolute inset-1.5 border-2 border-dashed pointer-events-none" style={{ borderColor: primaryColor }}>
          <div className="absolute top-0.5 left-0.5 w-1.5 h-1.5 rotate-45" style={{ backgroundColor: secondaryColor }} />
          <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rotate-45" style={{ backgroundColor: secondaryColor }} />
        </div>
      )}

      {frameStyle === 'wavy-artistic' && (
        <div className="absolute inset-1.5 border-2 rounded-xl pointer-events-none" style={{ borderColor: primaryColor }}>
          <div className="absolute inset-1 border-2 rounded-lg pointer-events-none opacity-60" style={{ borderColor: secondaryColor }} />
        </div>
      )}

      {frameStyle === 'geometric-cyber' && (
        <div className="absolute inset-1.5 border pointer-events-none" style={{ borderColor: primaryColor }}>
          <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2" style={{ borderColor: secondaryColor }} />
          <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2" style={{ borderColor: secondaryColor }} />
        </div>
      )}

      {frameStyle === 'modern-geometric' && (
        <div className="absolute inset-1.5 border pointer-events-none" style={{ borderColor: primaryColor }}>
          <div className="absolute top-0 left-0 w-3 h-3 rounded-br-full" style={{ backgroundColor: secondaryColor }} />
          <div className="absolute top-0 right-0 w-3 h-3 rounded-bl-full" style={{ backgroundColor: secondaryColor }} />
        </div>
      )}

      {frameStyle === 'playful-dots' && (
        <div className="absolute inset-1.5 border-2 border-dotted rounded-lg pointer-events-none" style={{ borderColor: primaryColor }}>
          <span className="absolute top-0.5 left-0.5 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: secondaryColor }} />
          <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: secondaryColor }} />
        </div>
      )}

      {frameStyle === 'clean-minimal' && (
        <div className="absolute inset-1.5 border rounded-2xs pointer-events-none" style={{ borderColor: primaryColor }} />
      )}

      <span className="relative z-10 text-[9px] font-bold text-slate-700 bg-white/95 px-1.5 py-0.5 rounded shadow-2xs border border-slate-100">
        معاينة الإطار
      </span>
    </div>
  );
};

export const EditorToolbar: React.FC<Props> = ({
  certificateData,
  onChange,
  onOpenAiModal,
  onExportPDF,
  onExportImage,
  onShareEmail,
  onShareWhatsApp,
  onPrint,
  onSaveToCloud,
  onUpdateCloudCertificate,
  onOpenGoogleDriveModal,
  onOpenDraftsModal,
  canUndo,
  canRedo,
  onUndo,
  onRedo
}) => {
  const [activeTab, setActiveTab] = useState<'content' | 'formatting' | 'templates' | 'style' | 'frame' | 'signatures' | 'elements' | 'verification' | 'export'>('content');
  const [selectedElementKey, setSelectedElementKey] = useState<keyof ElementStyles>('studentName');
  const [selectedFrameCategory, setSelectedFrameCategory] = useState<string>('الكل');
  const [selectedBgCategory, setSelectedBgCategory] = useState<string>('الكل');
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [isGalleryModalOpen, setIsGalleryModalOpen] = useState(false);
  const [editingSignature, setEditingSignature] = useState<SignatureItem | null>(null);
  const [isAiTuningBg, setIsAiTuningBg] = useState(false);
  const [aiTuneStatus, setAiTuneStatus] = useState<string | null>(null);
  const [isAdaptingGenderAi, setIsAdaptingGenderAi] = useState(false);
  const [isGeneratingTypeAi, setIsGeneratingTypeAi] = useState(false);
  const [genderNotice, setGenderNotice] = useState<{ text: string; type: 'success' | 'info' | 'ai' } | null>(null);
  const [selectedCertTypeId, setSelectedCertTypeId] = useState<string>('appreciation');
  const [selectedEmojiId, setSelectedEmojiId] = useState<string | null>(null);
  const [isAiOptimizingMargins, setIsAiOptimizingMargins] = useState(false);
  const [marginNotice, setMarginNotice] = useState<string | null>(null);
  const [isLogoCropModalOpen, setIsLogoCropModalOpen] = useState(false);
  const [isAiRemovingLogoBg, setIsAiRemovingLogoBg] = useState(false);
  const [logoActionNotice, setLogoActionNotice] = useState<string | null>(null);
  
  // Saved Drafts & Templates State
  const [isSavedDraftsSectionOpen, setIsSavedDraftsSectionOpen] = useState(true);
  const [savedDraftsList, setSavedDraftsList] = useState<DraftCertificateItem[]>([]);
  const [quickDraftName, setQuickDraftName] = useState('');
  const [draftNotice, setDraftNotice] = useState<string | null>(null);
  const [defaultSettingsNotice, setDefaultSettingsNotice] = useState<string | null>(null);

  React.useEffect(() => {
    const refreshDrafts = () => {
      setSavedDraftsList(getSavedDrafts());
    };
    refreshDrafts();
    const unsub = subscribeToDrafts(refreshDrafts);
    return () => unsub();
  }, []);

  const handleQuickSaveDraft = (type: 'draft' | 'template' = 'draft') => {
    const defaultName = type === 'template'
      ? `قالب: ${certificateData.title || 'تصميم'} (${certificateData.layoutPreset || 'مخصص'})`
      : `${certificateData.title || 'شهادة'} - ${certificateData.studentName || 'مسودة'}`;
    const finalName = quickDraftName.trim() || defaultName;

    saveCertificateAsDraft(certificateData, {
      name: finalName,
      type
    });

    setQuickDraftName('');
    setDraftNotice(type === 'template' ? 'تم حفظ التصميم كقالب مخصص بالنظام بنجاح! ✨' : 'تم حفظ الشهادة كمسودة بالنظام بنجاح! 💾');
    setTimeout(() => setDraftNotice(null), 4000);
  };

  // AI Layout Auto-Fit & Dynamic Collision-Free Optimization State
  const [isAiOptimizingLayout, setIsAiOptimizingLayout] = useState(false);
  const [aiLayoutResult, setAiLayoutResult] = useState<LayoutOptimizationResult | null>(null);
  const [aiLayoutNotice, setAiLayoutNotice] = useState<string | null>(null);
  const [isAiLayoutDetailsOpen, setIsAiLayoutDetailsOpen] = useState(false);
  const [previousCertDataBeforeLayoutAi, setPreviousCertDataBeforeLayoutAi] = useState<CertificateData | null>(null);

  // Collapsible Accordion States for Templates & Layout Tab
  const [isGridLayoutSectionOpen, setIsGridLayoutSectionOpen] = useState(true);
  const [isLayoutPresetsSubOpen, setIsLayoutPresetsSubOpen] = useState(true);
  const [isAiLayoutOptimizerSubOpen, setIsAiLayoutOptimizerSubOpen] = useState(true);
  const [isCustomGridEditorSubOpen, setIsCustomGridEditorSubOpen] = useState(certificateData.layoutPreset === 'custom-grid');
  const [isSafeMarginsSpacingSubOpen, setIsSafeMarginsSpacingSubOpen] = useState(false);
  const [isPresetTemplatesSectionOpen, setIsPresetTemplatesSectionOpen] = useState(true);
  const [selectedTemplateCategory, setSelectedTemplateCategory] = useState<string>('الكل');

  // System Configuration & Element Locks State
  const [systemConfig, setSystemConfig] = useState<SystemSettingsConfig>(getSavedSystemConfig());

  React.useEffect(() => {
    const handleConfigChange = () => {
      setSystemConfig(getSavedSystemConfig());
    };
    window.addEventListener('taqdeer_system_config_changed', handleConfigChange);
    return () => {
      window.removeEventListener('taqdeer_system_config_changed', handleConfigChange);
    };
  }, []);

  const isSchoolNameLocked = isElementLocked(systemConfig, 'schoolName');
  const isHeaderLinesLocked = isElementLocked(systemConfig, 'headerLines');
  const isTitleLocked = isElementLocked(systemConfig, 'title');
  const isPoemLocked = isElementLocked(systemConfig, 'poemOrQuote');
  const isLogoLocked = isElementLocked(systemConfig, 'logo');
  const isSignaturesLocked = isElementLocked(systemConfig, 'signatures');
  const isStampLocked = isElementLocked(systemConfig, 'stamp');
  const isBadgeLocked = isElementLocked(systemConfig, 'badge');
  const isFrameLocked = isElementLocked(systemConfig, 'frame');
  const isColorsLocked = isElementLocked(systemConfig, 'colors');
  const isWatermarkLocked = isElementLocked(systemConfig, 'watermark');
  const isVerificationBoxLocked = isElementLocked(systemConfig, 'verificationBox');
  const isAspectRatioLocked = isElementLocked(systemConfig, 'aspectRatio');

  const handleOptimizeLayoutAi = async (targetPreset?: LayoutPreset) => {
    setIsAiOptimizingLayout(true);
    setPreviousCertDataBeforeLayoutAi(certificateData);
    setAiLayoutNotice('جاري التحليل الهندسي والملاءمة التلقائية للعناصر بالذكاء الاصطناعي لمنع التداخل والفيضان...');
    try {
      const result = await optimizeLayoutWithAi(certificateData, targetPreset);
      const updatedData = applyOptimizationToCertificateData(certificateData, result);
      onChange({
        ...updatedData,
        updatedAt: new Date().toISOString()
      });
      setAiLayoutResult(result);
      setAiLayoutNotice(result.explanation);
      setIsAiLayoutDetailsOpen(true);
    } catch (err) {
      console.warn('AI Layout error, applying local deterministic auto-fit:', err);
      const fallback = autoFitLayoutLocally(certificateData, targetPreset);
      const updatedData = applyOptimizationToCertificateData(certificateData, fallback);
      onChange({
        ...updatedData,
        updatedAt: new Date().toISOString()
      });
      setAiLayoutResult(fallback);
      setAiLayoutNotice(fallback.explanation);
      setIsAiLayoutDetailsOpen(true);
    } finally {
      setIsAiOptimizingLayout(false);
    }
  };

  const handleInstantAutoFit = (targetPreset?: LayoutPreset) => {
    setPreviousCertDataBeforeLayoutAi(certificateData);
    const result = autoFitLayoutLocally(certificateData, targetPreset);
    const updatedData = applyOptimizationToCertificateData(certificateData, result);
    onChange({
      ...updatedData,
      updatedAt: new Date().toISOString()
    });
    setAiLayoutResult(result);
    setAiLayoutNotice('تمت الملاءمة الفورية وحساب الخطوط والهوامش ومنع التداخل بنجاح ⚡');
    setIsAiLayoutDetailsOpen(true);
  };

  const handleUndoLayoutOptimization = () => {
    if (previousCertDataBeforeLayoutAi) {
      onChange(previousCertDataBeforeLayoutAi);
      setPreviousCertDataBeforeLayoutAi(null);
      setAiLayoutResult(null);
      setAiLayoutNotice('تم التراجع عن تحسين التخطيط واستعادة التنسيق السابق.');
      setIsAiLayoutDetailsOpen(false);
      setTimeout(() => setAiLayoutNotice(null), 4000);
    }
  };

  const handleMakeLogoBgTransparent = async () => {
    if (!certificateData.logoUrl) return;
    try {
      setLogoActionNotice('جاري تحويل خلفية الشعار إلى شفافة...');
      const transparentUrl = await removeWhiteBackgroundCanvas(certificateData.logoUrl, 215);
      onChange({
        ...certificateData,
        logoUrl: transparentUrl,
        logoBgMode: 'transparent',
        logoShape: certificateData.logoShape === 'none' ? 'none' : (certificateData.logoShape || 'rounded'),
        updatedAt: new Date().toISOString()
      });
      setLogoActionNotice('تم تفريغ خلفية الشعار وجعلها شفافة بنجاح ✨');
      setTimeout(() => setLogoActionNotice(null), 4000);
    } catch (err) {
      setLogoActionNotice('تعذر معالجة الخلفية تلقائياً.');
      setTimeout(() => setLogoActionNotice(null), 3000);
    }
  };

  const handleRemoveLogoBgAi = async () => {
    if (!certificateData.logoUrl) return;
    setIsAiRemovingLogoBg(true);
    setLogoActionNotice('جاري تحليل الشعار وتفريغ الخلفية بالذكاء الاصطناعي...');
    try {
      const result = await removeBackgroundAi(certificateData.logoUrl);
      if (result.success && result.transparentDataUrl) {
        onChange({
          ...certificateData,
          logoUrl: result.transparentDataUrl,
          logoBgMode: 'transparent',
          updatedAt: new Date().toISOString()
        });
        setLogoActionNotice(result.explanation || 'تم حذف خلفية الشعار بالذكاء الاصطناعي بنجاح!');
      } else {
        setLogoActionNotice('تعذر إزالة الخلفية بالذكاء الاصطناعي.');
      }
    } catch (e) {
      setLogoActionNotice('حدث خطأ أثناء معالجة الشعار بالذكاء الاصطناعي.');
    } finally {
      setIsAiRemovingLogoBg(false);
      setTimeout(() => setLogoActionNotice(null), 5000);
    }
  };

  const handleAutoSafeMargins = () => {
    const { margins, explanation } = calculateSafeMargins(certificateData);
    onChange({
      ...certificateData,
      ...margins,
      updatedAt: new Date().toISOString()
    });
    setMarginNotice(explanation);
    setTimeout(() => setMarginNotice(null), 5000);
  };

  const handleAiOptimizeMargins = async () => {
    setIsAiOptimizingMargins(true);
    setMarginNotice('جاري تحليل توازن الشهادة بالذكاء الاصطناعي لحساب أفضل هوامش آمنة...');
    try {
      const { margins, explanation } = await optimizeMarginsWithAi(certificateData);
      onChange({
        ...certificateData,
        ...margins,
        updatedAt: new Date().toISOString()
      });
      setMarginNotice(explanation);
    } catch {
      setMarginNotice('تعذر الاتصال بخدمة الذكاء الاصطناعي، تم تطبيق الهوامش الآمنة الموصى بها.');
    } finally {
      setIsAiOptimizingMargins(false);
      setTimeout(() => setMarginNotice(null), 6000);
    }
  };

  const handleSaveDefaultMargins = () => {
    const currentMargins = {
      canvasMarginTop: certificateData.canvasMarginTop ?? 32,
      canvasMarginBottom: certificateData.canvasMarginBottom ?? 30,
      canvasMarginLeft: certificateData.canvasMarginLeft ?? 40,
      canvasMarginRight: certificateData.canvasMarginRight ?? 40,
    };
    saveDefaultMargins(currentMargins);
    setMarginNotice('تم حفظ الهوامش الحالية كافتراضي بنجاح! ستطبق هذه الهوامش تلقائياً عند إنشاء أو إعادة ضبط الشهادات القادمة.');
    setTimeout(() => setMarginNotice(null), 5000);
  };

  const handleRestoreDefaultMargins = () => {
    const saved = getSavedDefaultMargins();
    onChange({
      ...certificateData,
      ...saved,
      updatedAt: new Date().toISOString()
    });
    setMarginNotice('تم تطبيق الهوامش الافتراضية المحفوظة بنجاح.');
    setTimeout(() => setMarginNotice(null), 4000);
  };

  const handleSaveCurrentCertAsDefault = () => {
    saveCurrentCertificateAsDefaultSettings(certificateData);
    setDefaultSettingsNotice('تم حفظ الشهادة الحالية وتنسيقاتها كإعدادات افتراضية للنظام بنجاح! ⭐💾');
    setTimeout(() => setDefaultSettingsNotice(null), 4500);
  };

  const handleApplySystemDefaultSettings = () => {
    const updated = applyDefaultsToCertificate(certificateData);
    onChange({
      ...updated,
      updatedAt: new Date().toISOString()
    });
    setDefaultSettingsNotice('تم تطبيق الإعدادات الافتراضية للنظام على الشهادة الحالية بنجاح! ✨');
    setTimeout(() => setDefaultSettingsNotice(null), 4500);
  };

  // Tab navigation ref and drag-to-scroll handlers
  const navTabsRef = React.useRef<HTMLDivElement>(null);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragScrollLeft, setDragScrollLeft] = useState(0);

  const handleMouseDownTabs = (e: React.MouseEvent) => {
    if (!navTabsRef.current) return;
    setIsMouseDown(true);
    setDragStartX(e.pageX - navTabsRef.current.offsetLeft);
    setDragScrollLeft(navTabsRef.current.scrollLeft);
  };

  const handleMouseLeaveOrUpTabs = () => {
    setIsMouseDown(false);
  };

  const handleMouseMoveTabs = (e: React.MouseEvent) => {
    if (!isMouseDown || !navTabsRef.current) return;
    e.preventDefault();
    const x = e.pageX - navTabsRef.current.offsetLeft;
    const walk = (x - dragStartX) * 1.5;
    navTabsRef.current.scrollLeft = dragScrollLeft - walk;
  };

  const scrollNavTabs = (direction: 'left' | 'right') => {
    if (navTabsRef.current) {
      navTabsRef.current.scrollBy({
        left: direction === 'left' ? -180 : 180,
        behavior: 'smooth'
      });
    }
  };

  const handleAiTuneBackground = async () => {
    const currentBg = certificateData.bgImageUrl || certificateData.bgTextureUrl;
    if (!currentBg) {
      alert('الرجاء اختيار أو رفع صورة خلفية للشهادة أولاً لضبط العبارات والألوان عليها.');
      return;
    }

    setIsAiTuningBg(true);
    setAiTuneStatus('جاري تحليل ألوان وزخارف الخلفية بالذكاء الاصطناعي... ⏳');

    try {
      let data: any = null;
      try {
        const response = await fetch('/api/ai-tune-background', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageDataUrl: currentBg,
            currentData: certificateData,
          }),
        });
        const text = await response.text();
        if (text && (text.trim().startsWith('{') || text.trim().startsWith('['))) {
          data = JSON.parse(text);
        }
      } catch (e) {
        console.warn('ai-tune-background response parse error:', e);
      }

      if (data && data.success && data.result) {
        const tuned = data.result;
        onChange({
          ...certificateData,
          title: tuned.title || certificateData.title,
          recipientIntro: tuned.recipientIntro || certificateData.recipientIntro,
          appreciationText: tuned.appreciationText || certificateData.appreciationText,
          poemOrQuote: tuned.poemOrQuote || certificateData.poemOrQuote,
          textColor: tuned.textColor || certificateData.textColor,
          primaryColor: tuned.primaryColor || certificateData.primaryColor,
          secondaryColor: tuned.secondaryColor || certificateData.secondaryColor,
          borderColor: tuned.borderColor || certificateData.borderColor,
          bgCardBacking: tuned.bgCardBacking ?? true,
          bgCardOpacity: tuned.bgCardOpacity ?? 0.82,
          updatedAt: new Date().toISOString(),
        });
        setAiTuneStatus('✨ تم ضبط العبارات والألوان والتباين بالذكاء الاصطناعي بنجاح!');
        setTimeout(() => setAiTuneStatus(null), 4500);
      } else {
        throw new Error(data?.error || 'تعذر معالجة الصورة');
      }
    } catch (err: any) {
      console.error('AI tune error:', err);
      onChange({
        ...certificateData,
        textColor: '#0f172a',
        bgCardBacking: true,
        bgCardOpacity: 0.85,
        updatedAt: new Date().toISOString(),
      });
      setAiTuneStatus('تم تطبيق إعدادات القراءة والتباين العالية للعبارات فوق الخلفية!');
      setTimeout(() => setAiTuneStatus(null), 4500);
    } finally {
      setIsAiTuningBg(false);
    }
  };

  const updateField = <K extends keyof CertificateData>(field: K, value: CertificateData[K]) => {
    onChange({
      ...certificateData,
      [field]: value,
      updatedAt: new Date().toISOString()
    });
  };

  const updateElementStyle = (elementKey: keyof ElementStyles, styleUpdate: Partial<TextElementStyle>) => {
    const currentStyles = certificateData.elementStyles || {};
    const currentElemStyle = currentStyles[elementKey] || {};
    onChange({
      ...certificateData,
      elementStyles: {
        ...currentStyles,
        [elementKey]: {
          ...currentElemStyle,
          ...styleUpdate
        }
      },
      updatedAt: new Date().toISOString()
    });
  };

  const resetAllElementStyles = () => {
    onChange({
      ...certificateData,
      elementStyles: undefined,
      updatedAt: new Date().toISOString()
    });
  };

  const FORMATTABLE_ELEMENTS: { key: keyof ElementStyles; label: string; icon: string }[] = [
    { key: 'schoolHeader', label: 'ترويسة الوزارة / الإدارة', icon: '🏛️' },
    { key: 'schoolName', label: 'اسم المدرسة / الجهة', icon: '🏫' },
    { key: 'studentName', label: 'اسم الطالب / المكرّم', icon: '👤' },
    { key: 'title', label: 'العنوان الرئيسي', icon: '📜' },
    { key: 'subtitle', label: 'العنوان الفرعي', icon: '🔖' },
    { key: 'appreciationText', label: 'فقرة التقدير والتكريم', icon: '📝' },
    { key: 'poemOrQuote', label: 'بيت الشعر أو القول', icon: '✨' },
    { key: 'grade', label: 'الصف / الشعبة', icon: '🎓' },
    { key: 'recipientIntro', label: 'مقدمة التكريم', icon: '🎗️' },
    { key: 'dateLocation', label: 'التاريخ والمكان', icon: '📅' },
    { key: 'badgeTitle', label: 'عنوان الوسام', icon: '🏅' },
  ];

  const handleGenderChange = async (gender: RecipientGender) => {
    // 1. Instant local rule-based conversion so UI updates immediately with smart fallback
    let updated = adaptCertificateGenderSync(certificateData, gender, { preserveCustomStudentName: true });

    // Fallback: If appreciationText or recipientIntro was missing, fill with complete system fallback
    if (!updated.appreciationText || updated.appreciationText.trim() === '') {
      const fallback = generateLocalCertificateFallback({
        studentName: updated.studentName,
        subject: updated.subject,
        grade: updated.grade,
        recipientGender: gender,
      });
      updated.appreciationText = fallback.appreciationText;
      if (!updated.recipientIntro) updated.recipientIntro = fallback.recipientIntro;
    }

    onChange(updated);
    setGenderNotice({
      text: `تم ضبط وتوليد كافة صيغ ونصوص الشهادة لـ (${gender === 'female' ? 'طالبة - مؤنث' : 'طالب - مذكر'}) بنجاح عبر النظام ⚡`,
      type: 'info',
    });

    // 2. Call AI API in background with active AI settings & headers with graceful fallback to system generation on failure
    try {
      setIsAdaptingGenderAi(true);
      const aiCfg = getSavedAISettings();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (aiCfg.provider) headers['x-ai-provider'] = aiCfg.provider;
      if (aiCfg.apiKey) headers['x-ai-api-key'] = aiCfg.apiKey;
      if (aiCfg.model) headers['x-ai-model'] = aiCfg.model;
      if (aiCfg.customApiUrl) headers['x-ai-custom-url'] = aiCfg.customApiUrl;

      const response = await fetch('/api/adapt-gender-ai', {
        method: 'POST',
        headers,
        signal: AbortSignal.timeout(3500),
        body: JSON.stringify({
          certificateData: updated,
          targetGender: gender,
          provider: aiCfg.provider,
          apiKey: aiCfg.apiKey,
          model: aiCfg.model,
          customApiUrl: aiCfg.customApiUrl,
        }),
      });

      let json: any = null;
      if (response.ok) {
        try {
          const text = await response.text();
          if (text && (text.trim().startsWith('{') || text.trim().startsWith('['))) {
            json = JSON.parse(text);
          }
        } catch (parseErr) {
          console.warn('Failed to parse gender AI JSON response:', parseErr);
        }
      }

      if (json && json.success && json.result) {
        onChange({
          ...updated,
          ...json.result,
          recipientGender: gender,
          updatedAt: new Date().toISOString(),
        });
        setGenderNotice({
          text: json.fallbackUsed
            ? `تم توليد وتعديل كافة الصيغ لغوياً بنجاح عبر محرك النظام الذكي ⚡`
            : `تمت الصياغة البلاغية وضبط التأنيث/التذكير بالذكاء الاصطناعي بنجاح ✨`,
          type: json.fallbackUsed ? 'success' : 'ai',
        });
      } else {
        // AI returned error or fallback mode, confirm system adaptation
        const systemAdapted = adaptCertificateGenderSync(updated, gender, { preserveCustomStudentName: true });
        onChange({
          ...systemAdapted,
          recipientGender: gender,
          updatedAt: new Date().toISOString(),
        });
        setGenderNotice({
          text: `تم توليد وتعديل كافة الصيغ لغوياً بنجاح عبر محرك النظام الذكي (بديل محلي فوري)`,
          type: 'success',
        });
      }
    } catch (_err) {
      // Fallback: re-apply deep system conversion smoothly
      const systemAdapted = adaptCertificateGenderSync(certificateData, gender, { preserveCustomStudentName: true });
      onChange({
        ...systemAdapted,
        recipientGender: gender,
        updatedAt: new Date().toISOString(),
      });
      setGenderNotice({
        text: `تم توليد وتعديل البيانات بنجاح عبر المحرك اللغوي الداخلي للنظام ⚡`,
        type: 'success',
      });
    } finally {
      setIsAdaptingGenderAi(false);
      setTimeout(() => setGenderNotice(null), 4500);
    }
  };

  const handleCertificateTypeSelect = async (typeId: string) => {
    setSelectedCertTypeId(typeId);
    const currentGender = certificateData.recipientGender || 'male';
    const preset = CERTIFICATE_TYPES_LIST.find(t => t.id === typeId) || CERTIFICATE_TYPES_LIST[0];

    // 1. Instant System-Based Generation & Modification tailored to current gender
    const generatedData = generateCertificateByTypeLocal(typeId, currentGender, certificateData);

    onChange({
      ...certificateData,
      ...generatedData,
      updatedAt: new Date().toISOString()
    });

    setGenderNotice({
      text: `تم تعديل وتوليد بيانات الشهادة لنوع (${preset.name}) بنجاح عبر النظام ⚡`,
      type: 'success'
    });

    // 2. Background AI call to enhance or refine if available, with robust fallback on failure
    try {
      setIsGeneratingTypeAi(true);
      const aiCfg = getSavedAISettings();
      if (aiCfg.apiKey || aiCfg.provider) {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (aiCfg.provider) headers['x-ai-provider'] = aiCfg.provider;
        if (aiCfg.apiKey) headers['x-ai-api-key'] = aiCfg.apiKey;
        if (aiCfg.model) headers['x-ai-model'] = aiCfg.model;
        if (aiCfg.customApiUrl) headers['x-ai-custom-url'] = aiCfg.customApiUrl;

        const response = await fetch('/api/adapt-gender-ai', {
          method: 'POST',
          headers,
          signal: AbortSignal.timeout(3500),
          body: JSON.stringify({
            certificateData: generatedData,
            targetGender: currentGender,
            certificateType: preset.name,
            provider: aiCfg.provider,
            apiKey: aiCfg.apiKey,
            model: aiCfg.model,
            customApiUrl: aiCfg.customApiUrl,
          }),
        });

        if (response.ok) {
          const resJson = await response.json();
          if (resJson && resJson.success && resJson.result) {
            onChange({
              ...certificateData,
              ...generatedData,
              ...resJson.result,
              updatedAt: new Date().toISOString()
            });
            setGenderNotice({
              text: `تم توليد وصياغة عبارات نوع (${preset.name}) بالذكاء الاصطناعي بنجاح ✨`,
              type: 'ai'
            });
          }
        }
      }
    } catch (err) {
      console.warn('AI type generation failed, system data already generated smoothly:', err);
      setGenderNotice({
        text: `تم توليد وتجهيز بيانات (${preset.name}) بنجاح عبر النظام`,
        type: 'success'
      });
    } finally {
      setIsGeneratingTypeAi(false);
      setTimeout(() => setGenderNotice(null), 4500);
    }
  };

  const applyPresetTemplate = (presetId: string) => {
    const preset = TEMPLATE_PRESETS.find(p => p.id === presetId);
    if (!preset) return;

    // Capture user's personal & customized fields
    const {
      studentName,
      grade,
      schoolName,
      subject,
      logoUrl,
      signatures,
      emojis,
      positions,
      issueDate,
      issuePlace,
      verificationCode,
      qrCodeData,
      watermarkText,
      recipientGender
    } = certificateData;

    const currentGender: RecipientGender = recipientGender || 'male';

    const newCertId = `cert-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
    const newVCode = generateVerificationCode();

    let mergedData: CertificateData = {
      ...certificateData,
      ...preset.defaultData,
      // Retain user's actual values for personal identity & customized fields
      studentName: studentName || preset.defaultData.studentName || '',
      grade: grade || preset.defaultData.grade || '',
      schoolName: schoolName || preset.defaultData.schoolName || '',
      subject: subject || preset.defaultData.subject || '',
      logoUrl: logoUrl !== undefined ? logoUrl : preset.defaultData.logoUrl,
      signatures: (signatures && signatures.length > 0) ? signatures : preset.defaultData.signatures,
      emojis: emojis ?? certificateData.emojis,
      positions: positions ?? certificateData.positions,
      issueDate: issueDate || preset.defaultData.issueDate,
      issuePlace: issuePlace || preset.defaultData.issuePlace,
      verificationCode: newVCode,
      qrCodeData: `${window.location.origin}/verify?code=${newVCode}`,
      watermarkText: watermarkText || preset.defaultData.watermarkText,
      id: newCertId,
      isSavedCloud: false,
      driveFileId: undefined,
      driveFileWebViewLink: undefined,
      driveFileUrl: undefined,
      driveUploadedAt: undefined,
      updatedAt: new Date().toISOString()
    };

    // Adapt preset phrasing automatically to user's selected gender (male or female)
    mergedData = adaptCertificateGenderSync(mergedData, currentGender, { preserveCustomStudentName: true });

    onChange(mergedData);
  };

  // Color Theme Presets
  const colorPalettes = [
    {
      name: 'ذهبي أندلسي فاخر',
      primary: '#854d0e',
      secondary: '#d97706',
      accent: '#fef08a',
      bg: '#fefce8',
      text: '#1e293b'
    },
    {
      name: 'زمردي ملكي راقٍ',
      primary: '#065f46',
      secondary: '#059669',
      accent: '#fef08a',
      bg: '#f0fdf4',
      text: '#064e3b'
    },
    {
      name: 'كحلي ياقوتي رسمي',
      primary: '#1e1b4b',
      secondary: '#3730a3',
      accent: '#38bdf8',
      bg: '#f8fafc',
      text: '#0f172a'
    },
    {
      name: 'عنابي الوفاء الفاخر',
      primary: '#881337',
      secondary: '#9f1239',
      accent: '#fef08a',
      bg: '#fff1f2',
      text: '#4c0519'
    },
    {
      name: 'بنفسجي الإبداع والذكاء',
      primary: '#4c1d95',
      secondary: '#6d28d9',
      accent: '#a78bfa',
      bg: '#f5f3ff',
      text: '#2e1065'
    },
    {
      name: 'رمادي عالي البساطة',
      primary: '#334155',
      secondary: '#64748b',
      accent: '#cbd5e1',
      bg: '#ffffff',
      text: '#1e293b'
    }
  ];

  const fonts: { id: FontOption; label: string; sample: string }[] = [
    { id: 'Cairo', label: 'القاهرة (Cairo)', sample: 'خط عصري وواضح' },
    { id: 'Amiri', label: 'الأميري (Amiri)', sample: 'خط كلاسيكي ملكي' },
    { id: 'Tajawal', label: 'تجوال (Tajawal)', sample: 'خط متوازن للشهادات' },
    { id: 'Almarai', label: 'المراعي (Almarai)', sample: 'خط أنيق للتقارير' },
    { id: 'Aref Ruqaa', label: 'عارف رقعة (Ruqaa)', sample: 'خط الرقعة الأصيل' },
    { id: 'Reem Kufi', label: 'ريم كوفي (Kufi)', sample: 'خط كوفي حديث' },
    { id: 'Changa', label: 'تشانغا (Changa)', sample: 'خط مرح للأطفال' },
    { id: 'El Messiri', label: 'المسيري (El Messiri)', sample: 'خط مزخرف ناعم' },
    { id: 'Lalezar', label: 'لاليجار (Lalezar)', sample: 'خط عريض بارز للألقاب' },
    { id: 'Kufam', label: 'كوفام (Kufam)', sample: 'خط كوفي أندلسي فخم' },
    { id: 'Scheherazade New', label: 'شهرزاد (Scheherazade)', sample: 'خط نسخي ملكي فاخر' },
    { id: 'Vazirmatn', label: 'وزير (Vazirmatn)', sample: 'خط تقني متناسق' },
    { id: 'Harmattan', label: 'حرمل (Harmattan)', sample: 'خط صحراوي أنيق' },
    { id: 'Marhey', label: 'مرحي (Marhey)', sample: 'خط يدوي ديناميكي' },
  ];

  const frames: { id: FrameStyle; label: string; category: string; description: string }[] = [
    { id: 'guilloche-royal', label: 'إطار الجيلوش الفرعوني والملكي', category: 'ملكي', description: 'زخارف جيلوش هندسية مع ميداليات رقيقة' },
    { id: 'baroque-gold', label: 'الزخرفة الباروكية الذهبية', category: 'ملكي', description: 'نقوش ذهبية زاهية عند الأركان والأطراف' },
    { id: 'luxurious-gradient-border', label: 'الإطار المعدني المصقول', category: 'ملكي', description: 'إطار عريض ذو أزرار ذهبية رقيقة' },
    { id: 'royal-ribbon', label: 'التاج الكحلي الملكي', category: 'ملكي', description: 'شريط ترويسة ملكي مع إطار كحلي عريض' },
    { id: 'double-gold', label: 'الإطار الذهبي المزدوج', category: 'ملكي', description: 'خطوط مزدوجة كلاسيكية مع أركان عريضة' },
    
    { id: 'andalusian-star', label: 'النجمة الأندلسية المذهبة', category: 'إسلامي', description: 'نجوم ثمانية مذهبة وأركان إسلامية' },
    { id: 'oriental-islamic', label: 'النجمة والأركان الشرقية', category: 'إسلامي', description: 'إطار شرقي زمردي مع زخرفة النجمة' },
    { id: 'islamic-arch', label: 'المحراب الإسلامي الأصيل', category: 'إسلامي', description: 'طابع هندسي مستوحى من المحاريب' },
    { id: 'moroccan-mosaic', label: 'الفسيفساء المغربية', category: 'إسلامي', description: 'بلاطات فسيفساء زليج هندسية دقيقة' },

    { id: 'golden-vines', label: 'أغصان الزيتون والنباتات', category: 'كلاسيكي', description: 'أوراق شجر وأغصان زيتون ملفوفة' },
    { id: 'floral-corners', label: 'أركان الزهور المزخرفة', category: 'كلاسيكي', description: 'زهور باروكية دقيقة مع خطوط منقطة' },
    { id: 'victorian-crest', label: 'الفيكتوري الزخرفي تاج الملك', category: 'كلاسيكي', description: 'تاج كلاسيكي فيكتوري مع لولبيات الأركان' },
    { id: 'vintage-certificate', label: 'دبلوم الجيلوش الكلاسيكي', category: 'كلاسيكي', description: 'طابع دبلومات الجامعات العريقة' },
    { id: 'classic-ornate', label: 'الزخرفة الثلاثية الكلاسيكية', category: 'كلاسيكي', description: 'ثلاث طبقات حدية متناسقة' },
    { id: 'greek-key-meander', label: 'الإغريقي الملتف (Meander)', category: 'كلاسيكي', description: 'نقوش هندسية متصلة على الداير' },

    { id: 'double-dotted-luxury', label: 'الإطار النقاطي الفاخر', category: 'حديث', description: 'مزيج خطوط مستقيمة ونقاط دقيقة' },
    { id: 'emerald-border', label: 'الحد الأخضر الزمردي', category: 'حديث', description: 'خطوط زمردية متتقطعة مع معينات الأركان' },
    { id: 'wavy-artistic', label: 'الأمواج الفنية الملونة', category: 'حديث', description: 'حواف مموجة وألوان زاهية مبهجة' },
    { id: 'geometric-cyber', label: 'السايبر والنيون الرقمي', category: 'حديث', description: 'خطوط تقنية مستقبيلية مضاءة' },
    { id: 'modern-geometric', label: 'الهندسي العصري المتدرج', category: 'حديث', description: 'أقواس هندسية في الزوايا' },
    { id: 'playful-dots', label: 'نقاط البراعم المرحة', category: 'حديث', description: 'إطار مرح للمكافآت والأطفال' },
    { id: 'clean-minimal', label: 'الإطار الناصع البسيط', category: 'حديث', description: 'حدود ناعمة وبسيطة جداً' },
  ];

  const badgeIcons: { id: BadgeIconType; label: string }[] = [
    { id: 'award', label: 'وسام' },
    { id: 'trophy', label: 'كأس' },
    { id: 'crown', label: 'تاج' },
    { id: 'star', label: 'نجمة' },
    { id: 'shield', label: 'درع' },
    { id: 'sparkles', label: 'شرارة' },
    { id: 'book', label: 'كتاب' },
    { id: 'target', label: 'هدف' },
    { id: 'medal', label: 'ميدالية' },
  ];

  const addEmoji = (emoji: string) => {
    const currentEmojis = certificateData.emojis || [];
    const newEmoji = {
      id: `emoji-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      type: 'emoji' as const,
      emoji,
      x: 15 + (currentEmojis.length * 12) % 65,
      y: 15 + (currentEmojis.length * 10) % 60,
      size: 44,
      opacity: 1,
      rotation: 0,
      layer: 'above-text' as const,
      blendMode: 'normal' as const
    };
    updateField('emojis', [...currentEmojis, newEmoji]);
    setSelectedEmojiId(newEmoji.id);
  };

  const handleCustomEmojiImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageUrl = event.target?.result as string;
        const currentEmojis = certificateData.emojis || [];
        const newEmoji = {
          id: `emoji-img-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          type: 'image' as const,
          emoji: file.name.split('.')[0] || 'صورة مخصصة',
          imageUrl,
          x: 25 + (currentEmojis.length * 10) % 50,
          y: 25 + (currentEmojis.length * 8) % 45,
          size: 90,
          opacity: 1,
          rotation: 0,
          layer: 'above-text' as const,
          blendMode: 'normal' as const
        };
        updateField('emojis', [...currentEmojis, newEmoji]);
        setSelectedEmojiId(newEmoji.id);
      };
      reader.readAsDataURL(file);
    }
  };

  const updateEmojiItem = (id: string, updates: Partial<any>) => {
    const currentEmojis = certificateData.emojis || [];
    const updated = currentEmojis.map(item => item.id === id ? { ...item, ...updates } : item);
    updateField('emojis', updated);
  };

  const duplicateEmojiItem = (id: string) => {
    const currentEmojis = certificateData.emojis || [];
    const target = currentEmojis.find(item => item.id === id);
    if (!target) return;
    const duplicated = {
      ...target,
      id: `emoji-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      x: Math.min(90, target.x + 4),
      y: Math.min(90, target.y + 4)
    };
    updateField('emojis', [...currentEmojis, duplicated]);
    setSelectedEmojiId(duplicated.id);
  };

  const removeEmoji = (id: string) => {
    const currentEmojis = certificateData.emojis || [];
    const updated = currentEmojis.filter(e => e.id !== id);
    updateField('emojis', updated);
    if (selectedEmojiId === id) {
      setSelectedEmojiId(updated.length > 0 ? updated[updated.length - 1].id : null);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        updateField('logoUrl', event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBadgeUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        onChange({
          ...certificateData,
          badgeUrl: event.target?.result as string,
          badgeType: 'upload',
          showBadge: true,
          updatedAt: new Date().toISOString()
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStampUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        onChange({
          ...certificateData,
          stamp: {
            ...certificateData.stamp,
            shape: 'custom',
            imageUrl: event.target?.result as string,
            show: true
          },
          updatedAt: new Date().toISOString()
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCustomFrameUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        onChange({
          ...certificateData,
          customFrameUrl: event.target?.result as string,
          updatedAt: new Date().toISOString()
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBgTextureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        updateField('bgTextureUrl', event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveSignature = (newSig: SignatureItem) => {
    const currentSigs = [...certificateData.signatures];
    const existingIndex = currentSigs.findIndex(s => s.id === newSig.id);
    if (existingIndex >= 0) {
      currentSigs[existingIndex] = newSig;
    } else {
      currentSigs.push(newSig);
    }
    updateField('signatures', currentSigs);
    // Also auto-save to signature presets library for future reuse
    saveSignaturePresetToLibrary(newSig);
  };

  const removeSignature = (id: string) => {
    updateField('signatures', certificateData.signatures.filter(s => s.id !== id));
  };

  const toggleSignatureVisibility = (id: string) => {
    const currentSigs = certificateData.signatures.map(s => {
      if (s.id === id) {
        return { ...s, show: s.show === false ? true : false };
      }
      return s;
    });
    updateField('signatures', currentSigs);
  };

  const moveSignatureOrder = (index: number, direction: 'up' | 'down') => {
    const sigs = [...certificateData.signatures];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sigs.length) return;
    const temp = sigs[index];
    sigs[index] = sigs[targetIndex];
    sigs[targetIndex] = temp;
    updateField('signatures', sigs);
  };

  const getSavedSignaturePresets = (): SignatureItem[] => {
    try {
      const stored = localStorage.getItem('taqdeer_saved_signature_presets');
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn('Failed to load saved signature presets:', e);
    }
    return [];
  };

  const saveSignaturePresetToLibrary = (sig: SignatureItem) => {
    try {
      const existing = getSavedSignaturePresets();
      const updated = [sig, ...existing.filter(s => s.id !== sig.id && (s.name !== sig.name || s.title !== sig.title))].slice(0, 15);
      localStorage.setItem('taqdeer_saved_signature_presets', JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save signature preset:', e);
    }
  };

  const deleteSignaturePresetFromLibrary = (id: string) => {
    try {
      const existing = getSavedSignaturePresets();
      const updated = existing.filter(s => s.id !== id);
      localStorage.setItem('taqdeer_saved_signature_presets', JSON.stringify(updated));
      onChange({ ...certificateData, updatedAt: new Date().toISOString() });
    } catch (e) {
      console.warn('Failed to delete signature preset:', e);
    }
  };

  const addPresetSignatureToCertificate = (preset: SignatureItem) => {
    const newSig: SignatureItem = {
      ...preset,
      id: `sig-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      show: true
    };
    handleSaveSignature(newSig);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden text-right">
      
      {/* Category Navigation Tabs Header - Interactive Scrollable Bar & Responsive Navigation */}
      <div className="relative flex items-center bg-slate-100/90 border-b border-slate-200 py-1.5 px-1">
        <button
          type="button"
          onClick={() => scrollNavTabs('right')}
          className="absolute right-0 z-20 h-full px-2 bg-gradient-to-l from-slate-200 via-slate-100/90 to-transparent text-slate-700 hover:text-amber-700 flex items-center justify-center cursor-pointer shadow-xs rounded-r-2xl"
          title="تمرير الأزرار لليمين"
        >
          <ChevronRight className="w-4 h-4 stroke-[2.5]" />
        </button>

        <div
          ref={navTabsRef}
          onMouseDown={handleMouseDownTabs}
          onMouseLeave={handleMouseLeaveOrUpTabs}
          onMouseUp={handleMouseLeaveOrUpTabs}
          onMouseMove={handleMouseMoveTabs}
          className="flex items-center gap-1.5 overflow-x-auto no-scrollbar touch-pan-x scroll-smooth w-full px-8 py-0.5 select-none cursor-grab active:cursor-grabbing"
        >
          {[
            { id: 'content', label: '1. البيانات', icon: FileText },
            { id: 'formatting', label: '2. تنسيق النصوص', icon: SlidersHorizontal },
            { id: 'templates', label: '3. القوالب والتخطيط', icon: Award },
            { id: 'style', label: '4. الألوان والخطوط', icon: Palette },
            { id: 'signatures', label: '5. التوقيعات', icon: PenTool },
            { id: 'frame', label: '6. الإطار والشعار', icon: Maximize2 },
            { id: 'elements', label: '7. الأختام والرموز', icon: Stamp },
            { id: 'verification', label: '8. مربع التوثيق', icon: ShieldCheck },
            { id: 'export', label: '9. التصدير والطباعة', icon: Share2 },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-3.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 whitespace-nowrap cursor-pointer select-none border ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xs font-black'
                    : 'bg-white text-slate-700 hover:bg-amber-50 hover:text-amber-800 border-slate-200/90'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-slate-950' : 'text-amber-700'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => scrollNavTabs('left')}
          className="absolute left-0 z-20 h-full px-2 bg-gradient-to-r from-slate-200 via-slate-100/90 to-transparent text-slate-700 hover:text-amber-700 flex items-center justify-center cursor-pointer shadow-xs rounded-l-2xl"
          title="تمرير الأزرار لليسار"
        >
          <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
        </button>
      </div>

      {/* Tab Content Body */}
      <div className="p-5 max-h-[560px] overflow-y-auto space-y-5">
        
        {/* TAB 1: CONTENT */}
        {activeTab === 'content' && (
          <div className="space-y-4">
            
            {/* AI Generator Banner */}
            <div className="bg-gradient-to-r from-amber-50 to-amber-100/80 p-4 rounded-xl border border-amber-200 flex items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold text-amber-900 flex items-center gap-1.5 font-['Cairo']">
                  <Sparkles className="w-4 h-4 text-amber-600 animate-spin" />
                  صياغة نصوص التكريم بالذكاء الاصطناعي
                </h4>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  أدخل اسم الطالب والمجال وسيكتب لك Gemini نصاً مشجعاً وراقياً بضغطة زر!
                </p>
              </div>
              <button
                onClick={() => onOpenAiModal('improve', 'appreciation')}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-lg transition shadow-2xs whitespace-nowrap cursor-pointer"
              >
                توليد بـ AI
              </button>
            </div>

            {/* Quick System Default Settings Bar */}
            <div className="bg-amber-50/70 border border-amber-300/80 rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-600 fill-amber-500" />
                <span className="font-bold text-slate-800 text-[11px]">
                  الإعدادات الافتراضية للنظام:
                </span>
                <span className="text-[10px] text-slate-500 hidden sm:inline">
                  (ربط مباشر بإعدادات الشهادات بالنظام)
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleSaveCurrentCertAsDefault}
                  className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[11px] rounded-lg shadow-2xs transition flex items-center gap-1 cursor-pointer active:scale-95"
                  title="حفظ بيانات وتنسيقات هذه الشهادة كإعدادات افتراضية للنظام"
                >
                  <Star className="w-3 h-3 fill-slate-950" />
                  <span>حفظ كإعدادات افتراضية ⭐</span>
                </button>

                <button
                  type="button"
                  onClick={handleApplySystemDefaultSettings}
                  className="px-2.5 py-1 bg-white hover:bg-amber-100/80 text-slate-800 border border-amber-300 font-bold text-[11px] rounded-lg shadow-2xs transition flex items-center gap-1 cursor-pointer active:scale-95"
                  title="تطبيق الإعدادات الافتراضية المحفوظة بالنظام على هذه الشهادة"
                >
                  <RotateCcw className="w-3 h-3 text-amber-700" />
                  <span>تطبيق الافتراضي 🔄</span>
                </button>
              </div>

              {defaultSettingsNotice && (
                <div className="w-full mt-1 p-2 bg-emerald-100/90 border border-emerald-300 rounded-lg text-[11px] font-bold text-emerald-900 flex items-center gap-1.5 animate-fade-in">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span>{defaultSettingsNotice}</span>
                </div>
              )}
            </div>

            {/* Top Margin & Header Customization */}
            <div className={`p-3 bg-slate-50 rounded-xl border space-y-3 ${isHeaderLinesLocked ? 'border-amber-400/80 bg-amber-50/20 ring-1 ring-amber-300' : 'border-slate-200'}`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Type className="w-4 h-4 text-amber-600" />
                  <span>تخصيص الهامش العلوي والترويسة (Header)</span>
                  {isHeaderLinesLocked && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-500 text-slate-950 shadow-2xs">
                      <Lock className="w-3 h-3" />
                      <span>مقفل من إعدادات النظام</span>
                    </span>
                  )}
                </span>
                <span className="text-[10px] text-slate-500 font-medium">إظهار/إخفاء العبارات بكل حرية</span>
              </div>

              {/* Presets */}
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-700 block">نماذج ترويسة جاهزة وسريعة:</span>
                <div className="flex flex-wrap gap-1">
                  {[
                    {
                      label: '🇸🇦 وزارة التعليم',
                      line1: 'المملكة العربية السعودية',
                      line2: 'وزارة التعليم',
                      line3: 'إدارة التعليم بمحافظة الرياض',
                      show1: true, show2: true, show3: true, showSchool: true, showVision: true, vision: 'رؤية 2030'
                    },
                    {
                      label: '🎓 جامعة / كليّة',
                      line1: 'وزارة التعليم العالي والبحث العلمي',
                      line2: 'جامعة الملك سعود - كلية العلوم',
                      line3: 'عمادة الشؤون الأكاديمية',
                      show1: true, show2: true, show3: true, showSchool: true, showVision: false, vision: ''
                    },
                    {
                      label: '🏢 شركة / مؤسسة',
                      line1: 'قطاع الأعمال والتطوير المؤسسي',
                      line2: 'شركة الإبداع للحلول المتقدمة',
                      line3: 'إدارة الموارد البشرية والتدريب',
                      show1: true, show2: true, show3: false, showSchool: true, showVision: false, vision: ''
                    },
                    {
                      label: '🌐 مركز تدريب',
                      line1: 'المركز الدولي للتطوير والقيادة',
                      line2: 'قسم الاعتماد والشهادات المعتمدة',
                      line3: '',
                      show1: true, show2: true, show3: false, showSchool: true, showVision: false, vision: ''
                    },
                    {
                      label: '📄 ترويسة مبسطة',
                      line1: '',
                      line2: '',
                      line3: '',
                      show1: false, show2: false, show3: false, showSchool: true, showVision: false, vision: ''
                    }
                  ].map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      disabled={isHeaderLinesLocked}
                      onClick={() =>
                        onChange({
                          ...certificateData,
                          headerLine1: p.line1,
                          headerLine2: p.line2,
                          headerLine3: p.line3,
                          showHeaderLine1: p.show1,
                          showHeaderLine2: p.show2,
                          showHeaderLine3: p.show3,
                          showHeaderSchoolName: p.showSchool,
                          showHeaderVisionText: p.showVision,
                          headerVisionText: p.vision || certificateData.headerVisionText || 'رؤية 2030',
                          updatedAt: new Date().toISOString()
                        })
                      }
                      className="px-2 py-1 text-[10px] font-bold bg-white hover:bg-amber-100 text-slate-800 rounded border border-slate-300 transition shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Individual Header Lines */}
              <div className="space-y-2 pt-1">
                {/* Line 1 */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-700">السطر الأول بالترويسة:</label>
                    <label className="flex items-center gap-1 cursor-pointer text-[10px] font-bold text-slate-600">
                      <input
                        type="checkbox"
                        disabled={isHeaderLinesLocked}
                        checked={certificateData.showHeaderLine1 ?? true}
                        onChange={(e) => updateField('showHeaderLine1', e.target.checked)}
                        className="accent-amber-500 rounded w-3.5 h-3.5 disabled:opacity-50"
                      />
                      إظهار
                    </label>
                  </div>
                  {(certificateData.showHeaderLine1 ?? true) && (
                    <input
                      type="text"
                      disabled={isHeaderLinesLocked}
                      value={certificateData.headerLine1 ?? 'المملكة العربية السعودية'}
                      onChange={(e) => updateField('headerLine1', e.target.value)}
                      placeholder="مثال: المملكة العربية السعودية"
                      className={`w-full px-2.5 py-1.5 text-xs border rounded-lg ${isHeaderLinesLocked ? 'bg-slate-100 text-slate-500 border-slate-300 cursor-not-allowed' : 'border-slate-300 bg-white'}`}
                    />
                  )}
                </div>

                {/* Line 2 */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-700">السطر الثاني بالترويسة:</label>
                    <label className="flex items-center gap-1 cursor-pointer text-[10px] font-bold text-slate-600">
                      <input
                        type="checkbox"
                        disabled={isHeaderLinesLocked}
                        checked={certificateData.showHeaderLine2 ?? true}
                        onChange={(e) => updateField('showHeaderLine2', e.target.checked)}
                        className="accent-amber-500 rounded w-3.5 h-3.5 disabled:opacity-50"
                      />
                      إظهار
                    </label>
                  </div>
                  {(certificateData.showHeaderLine2 ?? true) && (
                    <input
                      type="text"
                      disabled={isHeaderLinesLocked}
                      value={certificateData.headerLine2 ?? 'وزارة التعليم / الجهة المعتمدة'}
                      onChange={(e) => updateField('headerLine2', e.target.value)}
                      placeholder="مثال: وزارة التعليم"
                      className={`w-full px-2.5 py-1.5 text-xs border rounded-lg ${isHeaderLinesLocked ? 'bg-slate-100 text-slate-500 border-slate-300 cursor-not-allowed' : 'border-slate-300 bg-white'}`}
                    />
                  )}
                </div>

                {/* Line 3 (Optional extra line) */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-700">السطر الثالث (إدارة التعليم / الفرع):</label>
                    <label className="flex items-center gap-1 cursor-pointer text-[10px] font-bold text-slate-600">
                      <input
                        type="checkbox"
                        disabled={isHeaderLinesLocked}
                        checked={certificateData.showHeaderLine3 ?? false}
                        onChange={(e) => updateField('showHeaderLine3', e.target.checked)}
                        className="accent-amber-500 rounded w-3.5 h-3.5 disabled:opacity-50"
                      />
                      إظهار
                    </label>
                  </div>
                  {certificateData.showHeaderLine3 && (
                    <input
                      type="text"
                      disabled={isHeaderLinesLocked}
                      value={certificateData.headerLine3 ?? 'إدارة التعليم بمحافظة الرياض'}
                      onChange={(e) => updateField('headerLine3', e.target.value)}
                      placeholder="مثال: إدارة التعليم بمحافظة الرياض"
                      className={`w-full px-2.5 py-1.5 text-xs border rounded-lg ${isHeaderLinesLocked ? 'bg-slate-100 text-slate-500 border-slate-300 cursor-not-allowed' : 'border-slate-300 bg-white'}`}
                    />
                  )}
                </div>

                {/* Line 4 (Extra right line) */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-700">السطر الرابع باليمين (سطر إضافي):</label>
                    <label className="flex items-center gap-1 cursor-pointer text-[10px] font-bold text-slate-600">
                      <input
                        type="checkbox"
                        disabled={isHeaderLinesLocked}
                        checked={certificateData.showHeaderRightExtra ?? false}
                        onChange={(e) => updateField('showHeaderRightExtra', e.target.checked)}
                        className="accent-amber-500 rounded w-3.5 h-3.5 disabled:opacity-50"
                      />
                      إظهار
                    </label>
                  </div>
                  {certificateData.showHeaderRightExtra && (
                    <input
                      type="text"
                      disabled={isHeaderLinesLocked}
                      value={certificateData.headerRightExtra ?? 'مكتب التعليم الخاص'}
                      onChange={(e) => updateField('headerRightExtra', e.target.value)}
                      placeholder="مثال: قسم الجودة والتطوير"
                      className={`w-full px-2.5 py-1.5 text-xs border rounded-lg ${isHeaderLinesLocked ? 'bg-slate-100 text-slate-500 border-slate-300 cursor-not-allowed' : 'border-slate-300 bg-white'}`}
                    />
                  )}
                </div>

                {/* School / Institution Name toggle & field */}
                <div className={`space-y-1 pt-1 border-t ${isSchoolNameLocked ? 'border-amber-400 bg-amber-50/40 p-2 rounded-lg' : 'border-slate-200'}`}>
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                      <span>اسم المدرسة / الجهة بالترويسة:</span>
                      {isSchoolNameLocked && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500 text-slate-950">
                          <Lock className="w-2.5 h-2.5" />
                          <span>مقفل</span>
                        </span>
                      )}
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer text-[10px] font-bold text-slate-600">
                      <input
                        type="checkbox"
                        disabled={isSchoolNameLocked}
                        checked={certificateData.showHeaderSchoolName ?? true}
                        onChange={(e) => updateField('showHeaderSchoolName', e.target.checked)}
                        className="accent-amber-500 rounded w-3.5 h-3.5 disabled:opacity-50"
                      />
                      إظهار
                    </label>
                  </div>
                  {(certificateData.showHeaderSchoolName ?? true) && (
                    <input
                      type="text"
                      disabled={isSchoolNameLocked}
                      value={certificateData.schoolName}
                      onChange={(e) => updateField('schoolName', e.target.value)}
                      placeholder="مثال: مدرسة التميز النموذجية"
                      className={`w-full px-2.5 py-1.5 text-xs border rounded-lg font-bold ${isSchoolNameLocked ? 'bg-slate-100 text-slate-500 border-slate-300 cursor-not-allowed' : 'border-slate-300 bg-white'}`}
                    />
                  )}
                </div>

                {/* Header Vision Text / Extra Slogan */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-700">شعار الرؤية / عبارة هامش إضافية:</label>
                    <label className="flex items-center gap-1 cursor-pointer text-[10px] font-bold text-slate-600">
                      <input
                        type="checkbox"
                        checked={certificateData.showHeaderVisionText ?? false}
                        onChange={(e) => updateField('showHeaderVisionText', e.target.checked)}
                        className="accent-amber-500 rounded w-3.5 h-3.5"
                      />
                      إظهار
                    </label>
                  </div>
                  {certificateData.showHeaderVisionText && (
                    <input
                      type="text"
                      value={certificateData.headerVisionText ?? 'رؤية 2030'}
                      onChange={(e) => updateField('headerVisionText', e.target.value)}
                      placeholder="مثال: رؤية 2030 / شعار الجودة"
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                    />
                  )}
                </div>

                {/* Header Elements Typography & Formatting Controls */}
                <div className="pt-2.5 border-t border-slate-200/80 mt-2 space-y-2 bg-amber-50/50 p-2.5 rounded-xl border border-amber-200/60">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-amber-950 flex items-center gap-1">
                      <span>✨</span>
                      <span>تنسيق خط وسَمك عناصر الترويسة</span>
                    </label>
                    <span className="text-[10px] text-amber-700 font-bold bg-white px-1.5 py-0.5 rounded border border-amber-200">
                      (الوزارة والإدارة واسم المدرسة)
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {/* Font Family for Header */}
                    <div>
                      <span className="block text-[10px] font-bold text-slate-700 mb-0.5">نوع خط الترويسة العلوية (مستقل):</span>
                      <select
                        value={certificateData.headerFontFamily || 'Cairo'}
                        onChange={(e) => updateField('headerFontFamily', e.target.value as FontOption)}
                        className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded-lg font-bold text-slate-800 focus:ring-1 focus:ring-amber-500"
                      >
                        <option value="Cairo">خط القاهرة المعاصر (Cairo)</option>
                        <option value="Amiri">الخط الأميري (Amiri)</option>
                        <option value="Tajawal">خط تجول (Tajawal)</option>
                        <option value="Almarai">خط المراعي (Almarai)</option>
                        <option value="Aref Ruqaa">خط الرقعة (Aref Ruqaa)</option>
                        <option value="Reem Kufi">الخط الكوفي (Reem Kufi)</option>
                        <option value="El Messiri">خط الخاطر (El Messiri)</option>
                        <option value="Changa">خط الشانغا (Changa)</option>
                        <option value="Scheherazade New">خط شهرزاد (Scheherazade)</option>
                        <option value="Vazirmatn">خط وزير (Vazirmatn)</option>
                      </select>
                    </div>

                    {/* Font Weight for Header */}
                    <div>
                      <span className="block text-[10px] font-bold text-slate-700 mb-0.5">سمك خط الترويسة:</span>
                      <select
                        value={certificateData.elementStyles?.schoolHeader?.fontWeight || 'bold'}
                        onChange={(e) => updateElementStyle('schoolHeader', { fontWeight: e.target.value as any })}
                        className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded-lg font-bold text-slate-800 focus:ring-1 focus:ring-amber-500"
                      >
                        <option value="light">خفيف (Light - 300)</option>
                        <option value="normal">عادي (Normal - 400)</option>
                        <option value="bold">عريض بارز (Bold - 700)</option>
                        <option value="extrabold">عريض جداً (ExtraBold - 900)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {/* Size scale preset for Header */}
                    <div>
                      <div className="flex justify-between items-center mb-0.5">
                        <span className="block text-[10px] font-bold text-slate-700">مقياس حجم الترويسة:</span>
                        <span className="text-[10px] font-mono text-amber-800 font-bold">{Math.round((certificateData.headerFontSizeScale ?? 1.0) * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.7"
                        max="1.5"
                        step="0.05"
                        value={certificateData.headerFontSizeScale ?? 1.0}
                        onChange={(e) => updateField('headerFontSizeScale', parseFloat(e.target.value))}
                        className="w-full accent-amber-600 h-1.5"
                      />
                    </div>

                    {/* School Name Custom Font override */}
                    <div>
                      <span className="block text-[10px] font-bold text-slate-700 mb-0.5">خط مخصص لاسم المدرسة (اختياري):</span>
                      <select
                        value={certificateData.elementStyles?.schoolName?.fontFamily || ''}
                        onChange={(e) => updateElementStyle('schoolName', { fontFamily: (e.target.value || undefined) as FontOption })}
                        className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded-lg font-bold text-slate-800 focus:ring-1 focus:ring-amber-500"
                      >
                        <option value="">(تلقائي: مطابق لخط الترويسة العلوية)</option>
                        <option value="Cairo">خط القاهرة (Cairo)</option>
                        <option value="Amiri">الخط الأميري (Amiri)</option>
                        <option value="Tajawal">خط تجول (Tajawal)</option>
                        <option value="Almarai">خط المراعي (Almarai)</option>
                        <option value="Aref Ruqaa">خط الرقعة (Aref Ruqaa)</option>
                        <option value="Reem Kufi">الخط الكوفي (Reem Kufi)</option>
                        <option value="El Messiri">خط الخاطر (El Messiri)</option>
                      </select>
                    </div>
                  </div>

                  {/* Header Offset Controls - Granular & Collective */}
                  <div className="pt-2 border-t border-amber-200/80 space-y-2.5">
                    <span className="block text-[11px] font-bold text-amber-950">
                      🎯 خيارات تحريك عبارات الترويسة (كل جزء منفصل أو جماعي):
                    </span>

                    {/* Collective Header Movement */}
                    <OffsetPad
                      title="تحريك كامل الترويسة ككتلة واحدة"
                      subtitle="تحريك كافة سطور الترويسة معاً أفقياً ورأسياً"
                      offsetX={certificateData.headerTextOffsetX || 0}
                      offsetY={certificateData.headerTextOffsetY || 0}
                      onChangeX={(val) => updateField('headerTextOffsetX', val)}
                      onChangeY={(val) => updateField('headerTextOffsetY', val)}
                      onReset={() => onChange({ ...certificateData, headerTextOffsetX: 0, headerTextOffsetY: 0, updatedAt: new Date().toISOString() })}
                    />

                    {/* Granular Line Movements */}
                    <div className="bg-white/80 p-2.5 rounded-xl border border-amber-200/70 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-700 block">
                          تحريك كل سطر في الترويسة بشكل منفصل:
                        </span>
                        <span className="text-[9px] text-amber-800 bg-amber-100/80 px-1.5 py-0.5 rounded font-bold">
                          تظهر حسب حالة السطر (ظاهر/مخفي)
                        </span>
                      </div>

                      {(() => {
                        const showLine1 = certificateData.showHeaderLine1 ?? true;
                        const showLine2 = certificateData.showHeaderLine2 ?? true;
                        const showLine3 = certificateData.showHeaderLine3 ?? false;
                        const showRightExtra = certificateData.showHeaderRightExtra ?? false;
                        const showSchoolName = certificateData.showHeaderSchoolName ?? true;
                        const showVisionText = certificateData.showHeaderVisionText ?? false;

                        const hasAnyVisibleLine = showLine1 || showLine2 || showLine3 || showRightExtra || showSchoolName || showVisionText;

                        if (!hasAnyVisibleLine) {
                          return (
                            <div className="p-2.5 bg-slate-50 border border-dashed border-slate-300 rounded-lg text-center text-[11px] text-slate-500 font-medium">
                              جميع عناصر وسطور الترويسة مخفية حالياً. قم بتفعيل إظهار أحد السطور أعلاه لتظهر خيارات تحريكه هنا.
                            </div>
                          );
                        }

                        return (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {showLine1 && (
                              <OffsetPad
                                title="السطر 1 (المملكة)"
                                subtitle="تحريك السطر الأول"
                                offsetX={certificateData.headerLine1OffsetX || 0}
                                offsetY={certificateData.headerLine1OffsetY || 0}
                                onChangeX={(val) => updateField('headerLine1OffsetX', val)}
                                onChangeY={(val) => updateField('headerLine1OffsetY', val)}
                                onReset={() => onChange({ ...certificateData, headerLine1OffsetX: 0, headerLine1OffsetY: 0, updatedAt: new Date().toISOString() })}
                              />
                            )}

                            {showLine2 && (
                              <OffsetPad
                                title="السطر 2 (الوزارة)"
                                subtitle="تحريك السطر الثاني"
                                offsetX={certificateData.headerLine2OffsetX || 0}
                                offsetY={certificateData.headerLine2OffsetY || 0}
                                onChangeX={(val) => updateField('headerLine2OffsetX', val)}
                                onChangeY={(val) => updateField('headerLine2OffsetY', val)}
                                onReset={() => onChange({ ...certificateData, headerLine2OffsetX: 0, headerLine2OffsetY: 0, updatedAt: new Date().toISOString() })}
                              />
                            )}

                            {showLine3 && (
                              <OffsetPad
                                title="السطر 3 (الإدارة)"
                                subtitle="تحريك السطر الثالث"
                                offsetX={certificateData.headerLine3OffsetX || 0}
                                offsetY={certificateData.headerLine3OffsetY || 0}
                                onChangeX={(val) => updateField('headerLine3OffsetX', val)}
                                onChangeY={(val) => updateField('headerLine3OffsetY', val)}
                                onReset={() => onChange({ ...certificateData, headerLine3OffsetX: 0, headerLine3OffsetY: 0, updatedAt: new Date().toISOString() })}
                              />
                            )}

                            {showRightExtra && (
                              <OffsetPad
                                title="سطر إضافي يمين"
                                subtitle="تحريك السطر الإضافي"
                                offsetX={certificateData.headerRightExtraOffsetX || 0}
                                offsetY={certificateData.headerRightExtraOffsetY || 0}
                                onChangeX={(val) => updateField('headerRightExtraOffsetX', val)}
                                onChangeY={(val) => updateField('headerRightExtraOffsetY', val)}
                                onReset={() => onChange({ ...certificateData, headerRightExtraOffsetX: 0, headerRightExtraOffsetY: 0, updatedAt: new Date().toISOString() })}
                              />
                            )}

                            {showSchoolName && (
                              <OffsetPad
                                title="اسم المدرسة / الجهة"
                                subtitle="تحريك اسم المدرسة"
                                offsetX={certificateData.headerSchoolNameOffsetX || 0}
                                offsetY={certificateData.headerSchoolNameOffsetY || 0}
                                onChangeX={(val) => updateField('headerSchoolNameOffsetX', val)}
                                onChangeY={(val) => updateField('headerSchoolNameOffsetY', val)}
                                onReset={() => onChange({ ...certificateData, headerSchoolNameOffsetX: 0, headerSchoolNameOffsetY: 0, updatedAt: new Date().toISOString() })}
                              />
                            )}

                            {showVisionText && (
                              <OffsetPad
                                title="شعار الرؤية / عبارة هامش"
                                subtitle="تحريك عبارة الرؤية والهامش"
                                offsetX={certificateData.headerVisionTextOffsetX || 0}
                                offsetY={certificateData.headerVisionTextOffsetY || 0}
                                onChangeX={(val) => updateField('headerVisionTextOffsetX', val)}
                                onChangeY={(val) => updateField('headerVisionTextOffsetY', val)}
                                onReset={() => onChange({ ...certificateData, headerVisionTextOffsetX: 0, headerVisionTextOffsetY: 0, updatedAt: new Date().toISOString() })}
                              />
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recipient Gender & Certificate Type Selector Panel */}
            <div className="bg-gradient-to-r from-amber-50/95 via-orange-50/80 to-amber-50/95 border border-amber-200/90 rounded-2xl p-3.5 shadow-xs space-y-3">
              {/* Recipient Gender Selector */}
              <div className="flex items-center justify-between flex-wrap gap-2.5 pb-2.5 border-b border-amber-200/70">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="text-base">🎓</span>
                      <span>المكرّم المستهدف (طالب أم طالبة):</span>
                    </span>
                    {isAdaptingGenderAi && (
                      <span className="text-[11px] text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-full font-bold animate-pulse border border-amber-300/80 flex items-center gap-1 shadow-2xs">
                        <Sparkles className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                        جاري ضبط وتوليد الصيغ بالذكاء الاصطناعي...
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    تعديل كافة عبارات ونصوص ومقدمات الشهادة تلقائياً بين المذكر والمؤنث بدقة لغوية مع توليد فوري عبر النظام في حال تعذر الذكاء الاصطناعي
                  </p>
                </div>
                <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-amber-200 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => handleGenderChange('male')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      (certificateData.recipientGender || 'male') === 'male'
                        ? 'bg-amber-600 text-white shadow-xs font-black ring-2 ring-amber-400'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span>👨‍🎓</span>
                    <span>طالب (مذكر)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleGenderChange('female')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      certificateData.recipientGender === 'female'
                        ? 'bg-pink-600 text-white shadow-xs font-black ring-2 ring-pink-400'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span>👩‍🎓</span>
                    <span>طالبة (مؤنث)</span>
                  </button>
                </div>
              </div>

              {/* Certificate Type / Purpose Quick Selector */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span className="text-base">📜</span>
                    <span>نوع الشهادة والغرض من التكريم (توليد وتعديل فوري):</span>
                  </span>
                  {isGeneratingTypeAi && (
                    <span className="text-[10px] text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full font-bold animate-pulse border border-amber-300 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-600 animate-spin" />
                      جاري الصياغة الذكية...
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1.5">
                  {CERTIFICATE_TYPES_LIST.map((type) => {
                    const isSelected = selectedCertTypeId === type.id;
                    return (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => handleCertificateTypeSelect(type.id)}
                        className={`p-2 rounded-xl text-right transition-all flex flex-col justify-between border cursor-pointer ${
                          isSelected
                            ? 'bg-amber-600 text-white border-amber-700 shadow-xs ring-2 ring-amber-400/80 font-black'
                            : 'bg-white hover:bg-amber-100/60 text-slate-700 border-amber-200/80 hover:border-amber-300'
                        }`}
                        title={type.description}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-sm">{type.icon}</span>
                          <span className={`text-[11px] leading-tight truncate ${isSelected ? 'text-white font-black' : 'text-slate-900 font-bold'}`}>
                            {type.name}
                          </span>
                        </div>
                        <span className={`text-[9px] truncate ${isSelected ? 'text-amber-100' : 'text-slate-400'}`}>
                          {type.category}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Status Notice Banner */}
              {genderNotice && (
                <div
                  className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 animate-in fade-in transition-all ${
                    genderNotice.type === 'ai'
                      ? 'bg-amber-100/90 text-amber-950 border-amber-300 shadow-2xs'
                      : genderNotice.type === 'success'
                      ? 'bg-emerald-50 text-emerald-950 border-emerald-300 shadow-2xs'
                      : 'bg-blue-50 text-blue-950 border-blue-200'
                  }`}
                >
                  <span className="text-base shrink-0">
                    {genderNotice.type === 'ai' ? '✨' : genderNotice.type === 'success' ? '⚡' : 'ℹ️'}
                  </span>
                  <span className="font-semibold flex-1 leading-snug">{genderNotice.text}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم الطالب / المكرّم</label>
                <input
                  type="text"
                  value={certificateData.studentName}
                  onChange={(e) => updateField('studentName', e.target.value)}
                  placeholder="مثال: عبد الله محمد الشمري"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold text-slate-800"
                />
                <OffsetPad
                  title="اسم الطالب"
                  subtitle="تحريك موضع اسم الطالب / المكرم أفقياً ورأسياً"
                  offsetX={certificateData.studentNameOffsetX || 0}
                  offsetY={certificateData.studentNameOffsetY || 0}
                  onChangeX={(val) => updateField('studentNameOffsetX', val)}
                  onChangeY={(val) => updateField('studentNameOffsetY', val)}
                  onReset={() => onChange({ ...certificateData, studentNameOffsetX: 0, studentNameOffsetY: 0, updatedAt: new Date().toISOString() })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الصف / الفصل / الشعبة</label>
                <input
                  type="text"
                  value={certificateData.grade}
                  onChange={(e) => updateField('grade', e.target.value)}
                  placeholder="مثال: الصف الأول الثانوي - أ"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <OffsetPad
                  title="الصف / الشعبة"
                  subtitle="تحريك موضع الصف أفقياً ورأسياً"
                  offsetX={certificateData.gradeOffsetX || 0}
                  offsetY={certificateData.gradeOffsetY || 0}
                  onChangeX={(val) => updateField('gradeOffsetX', val)}
                  onChangeY={(val) => updateField('gradeOffsetY', val)}
                  onReset={() => onChange({ ...certificateData, gradeOffsetX: 0, gradeOffsetY: 0, updatedAt: new Date().toISOString() })}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">المادة / المجال المكرم فيه</label>
                <input
                  type="text"
                  value={certificateData.subject}
                  onChange={(e) => updateField('subject', e.target.value)}
                  placeholder="مثال: التفوق العلمي والابتكار"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Golden Box & Recipient Spacing Customization Control Panel */}
              <div className="col-span-1 md:col-span-2 p-3.5 bg-gradient-to-br from-amber-50/80 to-orange-50/50 rounded-xl border border-amber-200/90 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>تنسيق المربع الذهبي وإطار الاسم والصف</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer select-none text-xs font-bold text-slate-800 bg-white hover:bg-amber-100/60 px-2.5 py-1 rounded-lg border border-amber-300 shadow-2xs transition">
                    <input
                      type="checkbox"
                      checked={certificateData.showRecipientBox !== false}
                      onChange={(e) => updateField('showRecipientBox', e.target.checked)}
                      className="rounded border-amber-400 text-amber-600 focus:ring-amber-500 h-4 w-4 accent-amber-600 cursor-pointer"
                    />
                    <span>إظهار المربع الذهبي</span>
                  </label>
                </div>

                {(certificateData.showRecipientBox !== false) && (
                  <div className="space-y-3 pt-1 border-t border-amber-200/60">
                    {/* Box Color & Quick Color Presets */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[11px] font-bold text-slate-700">لون خلفية المربع الذهبي:</label>
                        <span className="text-[11px] font-mono font-bold text-amber-800 dir-ltr">{certificateData.recipientBoxColor || '#f59e0b'}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <input
                          type="color"
                          value={certificateData.recipientBoxColor || '#f59e0b'}
                          onChange={(e) => updateField('recipientBoxColor', e.target.value)}
                          className="w-8 h-8 rounded-lg border border-slate-300 cursor-pointer p-0.5 bg-white shrink-0"
                        />
                        {[
                          { color: '#f59e0b', label: 'ذهبي أصفر' },
                          { color: '#d97706', label: 'ذهبي ملكي' },
                          { color: '#854d0e', label: 'برونزي كلاسيك' },
                          { color: '#9f1239', label: 'عنابي راقٍ' },
                          { color: '#1d4ed8', label: 'أزرق كحلي' },
                          { color: '#15803d', label: 'أخضر زمردي' },
                          { color: '#475569', label: 'فضي معدني' },
                        ].map((preset) => (
                          <button
                            key={preset.color}
                            type="button"
                            onClick={() => updateField('recipientBoxColor', preset.color)}
                            title={preset.label}
                            className={`w-6 h-6 rounded-full border border-black/20 shadow-2xs transition hover:scale-110 cursor-pointer ${
                              (certificateData.recipientBoxColor || '#f59e0b').toLowerCase() === preset.color.toLowerCase() ? 'ring-2 ring-amber-600 scale-110' : ''
                            }`}
                            style={{ backgroundColor: preset.color }}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Opacity Control Slider */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-slate-700">درجة الشفافية (Opacity):</label>
                        <span className="text-[11px] font-bold text-amber-900 bg-amber-100/80 px-1.5 py-0.5 rounded">
                          {Math.round((certificateData.recipientBoxOpacity ?? 0.12) * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.02"
                        max="1.0"
                        step="0.02"
                        value={certificateData.recipientBoxOpacity ?? 0.12}
                        onChange={(e) => updateField('recipientBoxOpacity', parseFloat(e.target.value))}
                        className="w-full accent-amber-600 h-1.5 bg-amber-200/80 rounded-lg cursor-pointer"
                      />
                    </div>
                  </div>
                )}

                {/* Spacing Between Student Name and Grade Slider */}
                <div className="pt-2 border-t border-amber-200/60">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-700">المسافة بين اسم الطالب والصف:</label>
                    <span className="text-[11px] font-bold text-amber-900 bg-amber-100/80 px-1.5 py-0.5 rounded">
                      {certificateData.recipientSpacing ?? 4}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="32"
                    step="1"
                    value={certificateData.recipientSpacing ?? 4}
                    onChange={(e) => updateField('recipientSpacing', parseInt(e.target.value, 10))}
                    className="w-full accent-amber-600 h-1.5 bg-amber-200/80 rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <span>عنوان الشهادة الرئيسي</span>
                  {isTitleLocked && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500 text-slate-950">
                      <Lock className="w-2.5 h-2.5" />
                      <span>مقفل</span>
                    </span>
                  )}
                </label>
                <button
                  type="button"
                  disabled={isTitleLocked}
                  onClick={() => onOpenAiModal?.('improve', 'title')}
                  className="text-[10px] font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 px-2 py-0.5 rounded-md border border-amber-300 flex items-center gap-1 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  title="اقتراح وتحسين عناوين الشهادة بالذكاء الاصطناعي"
                >
                  <Sparkles className="w-3 h-3 text-amber-600" />
                  <span>صياغة ذكية بالـ AI</span>
                </button>
              </div>
              <input
                type="text"
                disabled={isTitleLocked}
                value={certificateData.title}
                onChange={(e) => updateField('title', e.target.value)}
                placeholder="مثال: شهادة شكر وتقدير"
                className={`w-full px-3 py-2 text-xs border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold ${isTitleLocked ? 'bg-slate-100 text-slate-500 border-slate-300 cursor-not-allowed' : 'border-slate-300 bg-white'}`}
              />
              <OffsetPad
                title="عنوان الشهادة الرئيسي"
                subtitle="تحريك العنوان الرئيسي للشهادة أفقياً ورأسياً"
                offsetX={certificateData.titleOffsetX || 0}
                offsetY={certificateData.titleOffsetY || 0}
                onChangeX={(val) => updateField('titleOffsetX', val)}
                onChangeY={(val) => updateField('titleOffsetY', val)}
                onReset={() => onChange({ ...certificateData, titleOffsetX: 0, titleOffsetY: 0, updatedAt: new Date().toISOString() })}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <span>العنوان الفرعي</span>
                {isTitleLocked && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500 text-slate-950">
                    <Lock className="w-2.5 h-2.5" />
                    <span>مقفل</span>
                  </span>
                )}
              </label>
              <input
                type="text"
                disabled={isTitleLocked}
                value={certificateData.subtitle}
                onChange={(e) => updateField('subtitle', e.target.value)}
                placeholder="مثال: وسام التميز للعام الدراسي 1447 هـ"
                className={`w-full px-3 py-2 text-xs border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 ${isTitleLocked ? 'bg-slate-100 text-slate-500 border-slate-300 cursor-not-allowed' : 'border-slate-300 bg-white'}`}
              />
              <OffsetPad
                title="العنوان الفرعي"
                subtitle="تحريك سطر العنوان الفرعي للشهادة"
                offsetX={certificateData.subtitleOffsetX || 0}
                offsetY={certificateData.subtitleOffsetY || 0}
                onChangeX={(val) => updateField('subtitleOffsetX', val)}
                onChangeY={(val) => updateField('subtitleOffsetY', val)}
                onReset={() => onChange({ ...certificateData, subtitleOffsetX: 0, subtitleOffsetY: 0, updatedAt: new Date().toISOString() })}
              />
            </div>

            {/* Recipient Intro (عبارة مقدمة التكريم) Directly Above Appreciation Text */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <span>🎗️ عبارة مقدمة التكريم (التمهيدية)</span>
                </label>
                <button
                  type="button"
                  onClick={() => onOpenAiModal?.('improve', 'intro')}
                  className="text-[10px] font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 px-2 py-0.5 rounded-md border border-amber-300 flex items-center gap-1 transition cursor-pointer"
                  title="تحسين مقدمة التكريم بالذكاء الاصطناعي"
                >
                  <Sparkles className="w-3 h-3 text-amber-600" />
                  <span>صياغة ذكية بالـ AI</span>
                </button>
              </div>
              <input
                type="text"
                value={certificateData.recipientIntro || ''}
                onChange={(e) => updateField('recipientIntro', e.target.value)}
                placeholder="مثال: يسر إدارة المدرسة أن تمنح هذه الشهادة إلى الطالب المبدع:"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
              />
              <OffsetPad
                title="مقدمة التكريم"
                subtitle="تحريك عبارة مقدمة التكريم التمهيدية"
                offsetX={certificateData.recipientIntroOffsetX || 0}
                offsetY={certificateData.recipientIntroOffsetY || 0}
                onChangeX={(val) => updateField('recipientIntroOffsetX', val)}
                onChangeY={(val) => updateField('recipientIntroOffsetY', val)}
                onReset={() => onChange({ ...certificateData, recipientIntroOffsetX: 0, recipientIntroOffsetY: 0, updatedAt: new Date().toISOString() })}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">عبارة التقدير والشكر التفصيلية</label>
                <button
                  type="button"
                  onClick={() => onOpenAiModal?.('improve', 'appreciation')}
                  className="text-[11px] font-black text-amber-950 bg-gradient-to-r from-amber-200 to-amber-300 hover:from-amber-300 hover:to-amber-400 px-2.5 py-1 rounded-lg border border-amber-400 shadow-2xs flex items-center gap-1.5 transition cursor-pointer"
                  title="تحسين وبلاغة عبارة التقدير والشكر بالذكاء الاصطناعي"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-700 animate-pulse" />
                  <span>تحسين الصياغة بالذكاء الاصطناعي ✨</span>
                </button>
              </div>
              <textarea
                rows={3}
                value={certificateData.appreciationText}
                onChange={(e) => updateField('appreciationText', e.target.value)}
                placeholder="نص التكريم المشجع..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 leading-relaxed"
              />
              <OffsetPad
                title="نص التقدير والشكر"
                subtitle="تحريك فقرة التقدير والثناء أفقياً ورأسياً"
                offsetX={certificateData.appreciationTextOffsetX || 0}
                offsetY={certificateData.appreciationTextOffsetY || 0}
                onChangeX={(val) => updateField('appreciationTextOffsetX', val)}
                onChangeY={(val) => updateField('appreciationTextOffsetY', val)}
                onReset={() => onChange({ ...certificateData, appreciationTextOffsetX: 0, appreciationTextOffsetY: 0, updatedAt: new Date().toISOString() })}
              />
            </div>

            <div className={`p-3 bg-slate-50/80 rounded-xl border space-y-2 ${isPoemLocked ? 'border-amber-400 bg-amber-50/30 ring-1 ring-amber-300' : 'border-slate-200/80'}`}>
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span>✨ بيت شعر أو مقولة ملهمة</span>
                  {isPoemLocked && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500 text-slate-950">
                      <Lock className="w-2.5 h-2.5" />
                      <span>مقفل</span>
                    </span>
                  )}
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isPoemLocked}
                    onClick={() => onOpenAiModal?.('improve', 'poem')}
                    className="text-[10px] font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 px-2 py-0.5 rounded-md border border-amber-300 flex items-center gap-1 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    title="اقتراح وتوليد أبيات شعرية راقية وحكم بالذكاء الاصطناعي"
                  >
                    <Sparkles className="w-3 h-3 text-amber-600" />
                    <span>اقتراح أبيات بالـ AI</span>
                  </button>
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs transition-colors">
                    <input
                      type="checkbox"
                      disabled={isPoemLocked}
                      checked={certificateData.showPoemOrQuote ?? true}
                      onChange={(e) => updateField('showPoemOrQuote', e.target.checked)}
                      className="accent-amber-600 rounded cursor-pointer w-3.5 h-3.5 disabled:opacity-50"
                    />
                    <span>إظهار في الشهادة</span>
                  </label>
                </div>
              </div>
              {(certificateData.showPoemOrQuote ?? true) && (
                <>
                  <textarea
                    disabled={isPoemLocked}
                    value={certificateData.poemOrQuote}
                    onChange={(e) => updateField('poemOrQuote', e.target.value)}
                    placeholder="«من خطا نحو العلا خطوةً... جنى من الثمار أحلى النعم»"
                    rows={2}
                    className={`w-full px-3 py-2 text-xs border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 italic resize-y mt-1.5 ${isPoemLocked ? 'bg-slate-100 text-slate-500 border-slate-300 cursor-not-allowed' : 'border-slate-300 bg-white'}`}
                  />
                  <OffsetPad
                    title="بيت الشعر / المقولة"
                    subtitle="تحريك بيت الشعر أو المقولة الملهمة"
                    offsetX={certificateData.poemOrQuoteOffsetX || 0}
                    offsetY={certificateData.poemOrQuoteOffsetY || 0}
                    onChangeX={(val) => updateField('poemOrQuoteOffsetX', val)}
                    onChangeY={(val) => updateField('poemOrQuoteOffsetY', val)}
                    onReset={() => onChange({ ...certificateData, poemOrQuoteOffsetX: 0, poemOrQuoteOffsetY: 0, updatedAt: new Date().toISOString() })}
                  />
                </>
              )}
            </div>

            {/* Date & Location Section with Numeral Customization */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-amber-600" />
                تخصيص التاريخ والمكان وضبط خطوط الأرقام
              </span>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Date customization */}
                <div className="space-y-2.5 bg-white p-2.5 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-amber-600" />
                      خيارات صيغة ونظام التاريخ
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer text-[10px] font-bold text-slate-600">
                      <input
                        type="checkbox"
                        checked={certificateData.showHeaderDate ?? true}
                        onChange={(e) => updateField('showHeaderDate', e.target.checked)}
                        className="accent-amber-500 rounded w-3.5 h-3.5"
                      />
                      إظهار
                    </label>
                  </div>

                  {(certificateData.showHeaderDate ?? true) && (
                    <div className="space-y-2.5">
                      {/* Date Format Mode Selector Tabs */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">حدد نظام التاريخ المطلوب في الشهادة:</label>
                        <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
                          {[
                            { id: 'hijri', label: '🌙 الهجري فقط' },
                            { id: 'gregorian', label: '📅 الميلادي فقط' },
                            { id: 'both', label: '🌙📅 كلاهما' },
                          ].map((tab) => (
                            <button
                              key={tab.id}
                              type="button"
                              onClick={() => {
                                const mode = tab.id as 'hijri' | 'gregorian' | 'both';
                                onChange({
                                  ...certificateData,
                                  dateFormatMode: mode,
                                  issueDateHijri: certificateData.issueDateHijri || getTodayHijriDate(),
                                  issueDateGregorian: certificateData.issueDateGregorian || getTodayGregorianDate(),
                                  updatedAt: new Date().toISOString(),
                                });
                              }}
                              className={`py-1.5 text-[11px] font-bold rounded-md transition ${
                                (certificateData.dateFormatMode || 'both') === tab.id
                                  ? 'bg-amber-600 text-white shadow-2xs'
                                  : 'text-slate-700 hover:bg-slate-200'
                              }`}
                            >
                              {tab.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Display Layout choice when mode is 'both' */}
                      {(certificateData.dateFormatMode || 'both') === 'both' && (
                        <div className="flex items-center justify-between bg-amber-50/70 border border-amber-200/80 p-2 rounded-lg">
                          <span className="text-[10px] font-bold text-amber-950">تنسيق العرض:</span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => updateField('dateDisplayLayout', 'single-line')}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                                (certificateData.dateDisplayLayout || 'single-line') === 'single-line'
                                  ? 'bg-amber-600 text-white shadow-2xs'
                                  : 'bg-white border border-slate-200 text-slate-700'
                              }`}
                            >
                              سطر واحد
                            </button>
                            <button
                              type="button"
                              onClick={() => updateField('dateDisplayLayout', 'stacked')}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                                certificateData.dateDisplayLayout === 'stacked'
                                  ? 'bg-amber-600 text-white shadow-2xs'
                                  : 'bg-white border border-slate-200 text-slate-700'
                              }`}
                            >
                              سطران (عمودي)
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Input fields based on selected mode */}
                      <div className="space-y-1.5">
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            value={certificateData.dateLabel || 'التاريخ'}
                            onChange={(e) => updateField('dateLabel', e.target.value)}
                            placeholder="تسمية"
                            className="w-20 px-2 py-1.5 text-xs border border-slate-300 rounded-lg bg-slate-50 font-bold text-slate-700"
                            title="تسمية الحقل (مثلاً: التاريخ)"
                          />

                          {certificateData.dateFormatMode === 'hijri' && (
                            <input
                              type="text"
                              value={certificateData.issueDateHijri || getTodayHijriDate()}
                              onChange={(e) => {
                                updateField('issueDateHijri', e.target.value);
                                updateField('issueDate', e.target.value);
                              }}
                              placeholder="1447/02/25 هـ"
                              className="flex-1 px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-medium"
                            />
                          )}

                          {certificateData.dateFormatMode === 'gregorian' && (
                            <input
                              type="text"
                              value={certificateData.issueDateGregorian || certificateData.issueDate || getTodayGregorianDate()}
                              onChange={(e) => {
                                updateField('issueDateGregorian', e.target.value);
                                updateField('issueDate', e.target.value);
                              }}
                              placeholder="2026/08/08 م"
                              className="flex-1 px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-medium"
                            />
                          )}

                          {(certificateData.dateFormatMode || 'both') === 'both' && (
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] font-bold text-slate-500 w-10">هجري:</span>
                                <input
                                  type="text"
                                  value={certificateData.issueDateHijri || getTodayHijriDate()}
                                  onChange={(e) => updateField('issueDateHijri', e.target.value)}
                                  placeholder="1447/02/25 هـ"
                                  className="flex-1 px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white font-medium"
                                />
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] font-bold text-slate-500 w-10">ميلادي:</span>
                                <input
                                  type="text"
                                  value={certificateData.issueDateGregorian || getTodayGregorianDate()}
                                  onChange={(e) => updateField('issueDateGregorian', e.target.value)}
                                  placeholder="2026/08/08 م"
                                  className="flex-1 px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white font-medium"
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Formatting buttons */}
                        <div className="flex flex-wrap items-center gap-1 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              const h = getTodayHijriDate('latin');
                              const g = getTodayGregorianDate('latin');
                              onChange({
                                ...certificateData,
                                issueDateHijri: h,
                                issueDateGregorian: g,
                                issueDate: `${h} - ${g}`,
                                updatedAt: new Date().toISOString(),
                              });
                            }}
                            className="px-2 py-0.5 text-[10px] font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 rounded border border-amber-300 transition flex items-center gap-1"
                          >
                            📅 اليوم تلقائياً
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const h = normalizeDateDigits(certificateData.issueDateHijri || getTodayHijriDate(), 'latin');
                              const g = normalizeDateDigits(certificateData.issueDateGregorian || getTodayGregorianDate(), 'latin');
                              onChange({
                                ...certificateData,
                                issueDateHijri: h,
                                issueDateGregorian: g,
                                issueDate: `${h} - ${g}`,
                                updatedAt: new Date().toISOString(),
                              });
                            }}
                            className="px-2 py-0.5 text-[10px] font-bold text-slate-700 bg-white hover:bg-slate-100 rounded border border-slate-300 transition"
                            title="توحيد الأرقام بالصيغة اللاتينية المعيارية (0, 1, 2...)"
                          >
                            🔢 أرقام (0, 1, 2)
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const h = normalizeDateDigits(certificateData.issueDateHijri || getTodayHijriDate(), 'arabic');
                              const g = normalizeDateDigits(certificateData.issueDateGregorian || getTodayGregorianDate(), 'arabic');
                              onChange({
                                ...certificateData,
                                issueDateHijri: h,
                                issueDateGregorian: g,
                                issueDate: `${h} - ${g}`,
                                updatedAt: new Date().toISOString(),
                              });
                            }}
                            className="px-2 py-0.5 text-[10px] font-bold text-slate-700 bg-white hover:bg-slate-100 rounded border border-slate-300 transition"
                            title="توحيد الأرقام بالصيغة العربية الشرقية (٠، ١، ٢...)"
                          >
                            🔣 أرقام (٠, ١, ٢)
                          </button>
                        </div>

                        <OffsetPad
                          title="سطر التاريخ"
                          subtitle="تحريك سطر التاريخ أفقياً ورأسياً"
                          offsetX={certificateData.headerDateOffsetX || 0}
                          offsetY={certificateData.headerDateOffsetY || 0}
                          onChangeX={(val) => updateField('headerDateOffsetX', val)}
                          onChangeY={(val) => updateField('headerDateOffsetY', val)}
                          onReset={() => onChange({ ...certificateData, headerDateOffsetX: 0, headerDateOffsetY: 0, updatedAt: new Date().toISOString() })}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Location customization */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-700">مكان الإصدار:</label>
                    <label className="flex items-center gap-1 cursor-pointer text-[10px] font-bold text-slate-600">
                      <input
                        type="checkbox"
                        checked={certificateData.showHeaderPlace ?? true}
                        onChange={(e) => updateField('showHeaderPlace', e.target.checked)}
                        className="accent-amber-500 rounded w-3.5 h-3.5"
                      />
                      إظهار
                    </label>
                  </div>

                  {(certificateData.showHeaderPlace ?? true) && (
                    <div>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={certificateData.placeLabel || 'المكان'}
                          onChange={(e) => updateField('placeLabel', e.target.value)}
                          placeholder="تسمية (المكان)"
                          className="w-24 px-2 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                        />
                        <input
                          type="text"
                          value={certificateData.issuePlace}
                          onChange={(e) => updateField('issuePlace', e.target.value)}
                          placeholder="الرياض"
                          className="flex-1 px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                        />
                      </div>
                      <OffsetPad
                        title="سطر المكان"
                        subtitle="تحريك سطر المكان أفقياً ورأسياً"
                        offsetX={certificateData.headerPlaceOffsetX || 0}
                        offsetY={certificateData.headerPlaceOffsetY || 0}
                        onChangeX={(val) => updateField('headerPlaceOffsetX', val)}
                        onChangeY={(val) => updateField('headerPlaceOffsetY', val)}
                        onReset={() => onChange({ ...certificateData, headerPlaceOffsetX: 0, headerPlaceOffsetY: 0, updatedAt: new Date().toISOString() })}
                      />
                    </div>
                  )}
                </div>

                {/* Serial / Certificate Reference Number */}
                <div className="space-y-2 col-span-1 md:col-span-2 pt-2 border-t border-slate-200">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-700">رقم الشهادة / القيد (المرجع باليسار):</label>
                    <label className="flex items-center gap-1 cursor-pointer text-[10px] font-bold text-slate-600">
                      <input
                        type="checkbox"
                        checked={certificateData.showHeaderCertNumber ?? false}
                        onChange={(e) => {
                          const isChecked = e.target.checked;
                          if (isChecked) {
                            const verifiedCode = certificateData.verificationCode || certificateData.certificateId || (certificateData.certNumber && certificateData.certNumber !== 'REF-1447/0892' ? certificateData.certNumber : '');
                            const autoNum = verifiedCode || `REF-${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`;
                            onChange({
                              ...certificateData,
                              showHeaderCertNumber: true,
                              certNumber: autoNum,
                              updatedAt: new Date().toISOString()
                            });
                          } else {
                            updateField('showHeaderCertNumber', false);
                          }
                        }}
                        className="accent-amber-500 rounded w-3.5 h-3.5 cursor-pointer"
                      />
                      إظهار
                    </label>
                  </div>
                  {certificateData.showHeaderCertNumber && (
                    <div>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={certificateData.certNumberLabel || 'الرقم'}
                          onChange={(e) => updateField('certNumberLabel', e.target.value)}
                          placeholder="التسمية (الرقم)"
                          className="w-24 px-2 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-medium"
                        />
                        <input
                          type="text"
                          value={certificateData.certNumber || certificateData.verificationCode || certificateData.certificateId || ''}
                          onChange={(e) => updateField('certNumber', e.target.value)}
                          placeholder="مثال: REF-1447/0892"
                          className="flex-1 px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-mono font-medium text-amber-900"
                        />
                      </div>
                      <OffsetPad
                        title="رقم الشهادة / القيد"
                        subtitle="تحريك سطر رقم القيد أفقياً ورأسياً"
                        offsetX={certificateData.headerCertNumberOffsetX || 0}
                        offsetY={certificateData.headerCertNumberOffsetY || 0}
                        onChangeX={(val) => updateField('headerCertNumberOffsetX', val)}
                        onChangeY={(val) => updateField('headerCertNumberOffsetY', val)}
                        onReset={() => onChange({ ...certificateData, headerCertNumberOffsetX: 0, headerCertNumberOffsetY: 0, updatedAt: new Date().toISOString() })}
                      />
                    </div>
                  )}
                </div>

                {/* Extra Left Lines */}
                <div className="space-y-2 col-span-1 md:col-span-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-700">سطر إضافي باليسار (1):</label>
                    <label className="flex items-center gap-1 cursor-pointer text-[10px] font-bold text-slate-600">
                      <input
                        type="checkbox"
                        checked={certificateData.showHeaderLeftExtra1 ?? false}
                        onChange={(e) => updateField('showHeaderLeftExtra1', e.target.checked)}
                        className="accent-amber-500 rounded w-3.5 h-3.5"
                      />
                      إظهار
                    </label>
                  </div>
                  {certificateData.showHeaderLeftExtra1 && (
                    <input
                      type="text"
                      value={certificateData.headerLeftExtra1 ?? 'نوع الشهادة: معتمدة'}
                      onChange={(e) => updateField('headerLeftExtra1', e.target.value)}
                      placeholder="مثال: نوع الشهادة: معتمدة"
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                    />
                  )}
                </div>

                <div className="space-y-2 col-span-1 md:col-span-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-700">سطر إضافي باليسار (2):</label>
                    <label className="flex items-center gap-1 cursor-pointer text-[10px] font-bold text-slate-600">
                      <input
                        type="checkbox"
                        checked={certificateData.showHeaderLeftExtra2 ?? false}
                        onChange={(e) => updateField('showHeaderLeftExtra2', e.target.checked)}
                        className="accent-amber-500 rounded w-3.5 h-3.5"
                      />
                      إظهار
                    </label>
                  </div>
                  {certificateData.showHeaderLeftExtra2 && (
                    <input
                      type="text"
                      value={certificateData.headerLeftExtra2 ?? 'الكود: AC-2026'}
                      onChange={(e) => updateField('headerLeftExtra2', e.target.value)}
                      placeholder="مثال: كود المراجعة: AC-2026"
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                    />
                  )}
                </div>

                {/* Digital Verification Phrase Control */}
                <div className="space-y-2 col-span-1 md:col-span-2 pt-2 border-t border-slate-200">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-emerald-800 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      عبارة "شهادة موثقة رقمياً" بالهيدر:
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer text-[10px] font-bold text-slate-600">
                      <input
                        type="checkbox"
                        checked={certificateData.showVerificationBadge ?? true}
                        onChange={(e) => updateField('showVerificationBadge', e.target.checked)}
                        className="accent-emerald-600 rounded w-3.5 h-3.5"
                      />
                      إظهار العبارة
                    </label>
                  </div>
                  {(certificateData.showVerificationBadge ?? true) && (
                    <input
                      type="text"
                      value={certificateData.verificationBadgeText ?? 'شهادة موثقة رقمياً'}
                      onChange={(e) => updateField('verificationBadgeText', e.target.value)}
                      placeholder="مثال: شهادة موثقة رقمياً / شهادة معتمدة ورسمية"
                      className="w-full px-2.5 py-1.5 text-xs border border-emerald-300 rounded-lg bg-emerald-50/50 text-emerald-900 font-medium"
                    />
                  )}
                </div>
              </div>
            </div>

          </div>
        )}

        {/* TAB: FORMATTING (Per-element formatting & customization) */}
        {activeTab === 'formatting' && (
          <div className="space-y-5">
            {/* Header banner */}
            <div className="bg-slate-900 text-white p-3.5 rounded-xl flex items-center justify-between gap-2 shadow-xs">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold font-['Cairo']">تخصيص تنسيق كل عنصر كتابي على حدة</h4>
                  <p className="text-[10px] text-slate-300">اختر أياً من النصوص لتعديل حجمه، محاذاته، نوع خطه وهامشه</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {onSaveToCloud && (
                  <button
                    onClick={onSaveToCloud}
                    className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] rounded-lg transition flex items-center gap-1 shadow-2xs cursor-pointer"
                  >
                    <Cloud className="w-3.5 h-3.5" />
                    <span>حفظ سحابي</span>
                  </button>
                )}
                <button
                  onClick={resetAllElementStyles}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium text-[11px] rounded-lg transition flex items-center gap-1 border border-slate-700 cursor-pointer"
                  title="إعادة ضبط جميع التنسيقات للوضع الافتراضي"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>إعادة ضبط</span>
                </button>
              </div>
            </div>

            {/* Element Selector Pills */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">اختر النص المراد تنسيقه:</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {FORMATTABLE_ELEMENTS.map((item) => {
                  const isSelected = selectedElementKey === item.key;
                  const hasCustomStyles = !!certificateData.elementStyles?.[item.key];
                  return (
                    <button
                      key={item.key}
                      onClick={() => setSelectedElementKey(item.key)}
                      className={`px-2.5 py-2 rounded-xl text-xs font-bold flex items-center justify-between gap-1.5 border transition cursor-pointer text-right ${
                        isSelected
                          ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-sm'
                          : hasCustomStyles
                          ? 'bg-amber-50/70 border-amber-300 text-amber-900 hover:bg-amber-100/50'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span className="truncate flex items-center gap-1">
                        <span className="text-sm">{item.icon}</span>
                        <span className="truncate">{item.label}</span>
                      </span>
                      {hasCustomStyles && (
                        <span className={`w-2 h-2 rounded-full shrink-0 ${isSelected ? 'bg-slate-950' : 'bg-amber-500'}`} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active Element Formatting Panel */}
            {selectedElementKey && (() => {
              const currentStyle: TextElementStyle = certificateData.elementStyles?.[selectedElementKey] || {};
              const currentElemObj = FORMATTABLE_ELEMENTS.find(e => e.key === selectedElementKey);

              return (
                <div className="bg-amber-50/40 p-4 rounded-xl border border-amber-200/80 space-y-4">
                  <div className="flex items-center justify-between border-b border-amber-200/80 pb-2.5">
                    <h5 className="font-bold text-xs text-amber-950 flex items-center gap-1.5">
                      <span className="text-base">{currentElemObj?.icon}</span>
                      تنسيق: <span className="text-amber-700 font-extrabold">{currentElemObj?.label}</span>
                    </h5>
                    {certificateData.elementStyles?.[selectedElementKey] && (
                      <button
                        onClick={() => updateElementStyle(selectedElementKey, {
                          fontSize: undefined,
                          align: undefined,
                          fontFamily: undefined,
                          fontWeight: undefined,
                          marginTop: undefined,
                          marginBottom: undefined,
                          letterSpacing: undefined,
                          color: undefined
                        })}
                        className="text-[10px] text-amber-800 hover:text-amber-950 underline font-bold cursor-pointer"
                      >
                        مسح تنسيق هذا العنصر
                      </button>
                    )}
                  </div>

                  {/* Font Size Selector */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <label className="font-bold text-slate-800">حجم النص:</label>
                      <span className="font-mono text-amber-700 font-extrabold bg-white px-2 py-0.5 rounded border border-amber-200">
                        {currentStyle.fontSize || 100}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={60}
                      max={220}
                      step={5}
                      value={currentStyle.fontSize || 100}
                      onChange={(e) => updateElementStyle(selectedElementKey, { fontSize: Number(e.target.value) })}
                      className="w-full accent-amber-600 cursor-pointer"
                    />
                    <div className="flex items-center justify-between gap-1 mt-1.5">
                      {[
                        { label: 'صغير', val: 80 },
                        { label: 'عادي', val: 100 },
                        { label: 'كبير', val: 130 },
                        { label: 'ضخم', val: 160 },
                      ].map((preset) => (
                        <button
                          key={preset.val}
                          onClick={() => updateElementStyle(selectedElementKey, { fontSize: preset.val })}
                          className={`flex-1 py-1 text-[10px] font-bold rounded border transition cursor-pointer ${
                            (currentStyle.fontSize || 100) === preset.val
                              ? 'bg-amber-600 text-white border-amber-600'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-amber-50'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Text Alignment & Weight */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Alignment */}
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1.5">محاذاة النص:</label>
                      <div className="grid grid-cols-4 gap-1 bg-white p-1 rounded-lg border border-slate-200">
                        <button
                          onClick={() => updateElementStyle(selectedElementKey, { align: 'right' })}
                          className={`p-1.5 rounded flex items-center justify-center transition cursor-pointer ${
                            (currentStyle.align || 'right') === 'right' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-600 hover:bg-slate-100'
                          }`}
                          title="محاذاة لليمين"
                        >
                          <AlignRight className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => updateElementStyle(selectedElementKey, { align: 'center' })}
                          className={`p-1.5 rounded flex items-center justify-center transition cursor-pointer ${
                            currentStyle.align === 'center' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-600 hover:bg-slate-100'
                          }`}
                          title="محاذاة للوسط"
                        >
                          <AlignCenter className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => updateElementStyle(selectedElementKey, { align: 'left' })}
                          className={`p-1.5 rounded flex items-center justify-center transition cursor-pointer ${
                            currentStyle.align === 'left' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-600 hover:bg-slate-100'
                          }`}
                          title="محاذاة لليسار"
                        >
                          <AlignLeft className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => updateElementStyle(selectedElementKey, { align: 'justify' })}
                          className={`p-1.5 rounded flex items-center justify-center transition cursor-pointer ${
                            currentStyle.align === 'justify' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-600 hover:bg-slate-100'
                          }`}
                          title="ضبط كامل"
                        >
                          <AlignJustify className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Font Weight */}
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1.5">سمك الخط:</label>
                      <select
                        value={currentStyle.fontWeight || 'normal'}
                        onChange={(e) => updateElementStyle(selectedElementKey, { fontWeight: e.target.value as any })}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        <option value="light">خفيف (Light - 300)</option>
                        <option value="normal">عادي (Normal - 400)</option>
                        <option value="bold">عريض (Bold - 700)</option>
                        <option value="extrabold">عريض جداً (Extra Bold - 900)</option>
                      </select>
                    </div>
                  </div>

                  {/* Custom Calligraphy Font for this Element */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5">خط الخط العربي الخاص بهذا النص:</label>
                    <select
                      value={currentStyle.fontFamily || ''}
                      onChange={(e) => updateElementStyle(selectedElementKey, { fontFamily: (e.target.value || undefined) as FontOption })}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="">(استخدام الخط العام للشهادة)</option>
                      <option value="Cairo">خط القاهرة المعاصر (Cairo)</option>
                      <option value="Amiri">الخط الأميري الكلاسيكي (Amiri)</option>
                      <option value="Tajawal">خط تجول الحديث (Tajawal)</option>
                      <option value="Almarai">خط المراعي النقي (Almarai)</option>
                      <option value="Aref Ruqaa">خط الرقعة الأصيل (Aref Ruqaa)</option>
                      <option value="Reem Kufi">الخط الكوفي الهندسي (Reem Kufi)</option>
                      <option value="Changa">خط الشانغا العصري (Changa)</option>
                      <option value="El Messiri">خط الخاطر الفني (El Messiri)</option>
                      <option value="Lalezar">خط لاله‌زار البارز (Lalezar)</option>
                      <option value="Kufam">خط كوفام المزخرف (Kufam)</option>
                      <option value="Scheherazade New">خط شهرزاد النسخي (Scheherazade New)</option>
                      <option value="Vazirmatn">خط وزير متقن (Vazirmatn)</option>
                      <option value="Harmattan">خط هرمتان البسيط (Harmattan)</option>
                      <option value="Marhey">خط مرحي المرح (Marhey)</option>
                    </select>
                  </div>

                  {/* Margins & Spacing */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <div className="flex justify-between text-xs font-bold text-slate-800 mb-1">
                        <span>الهامش العلوي:</span>
                        <span className="text-amber-700">{currentStyle.marginTop || 0}px</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={40}
                        step={2}
                        value={currentStyle.marginTop || 0}
                        onChange={(e) => updateElementStyle(selectedElementKey, { marginTop: Number(e.target.value) })}
                        className="w-full accent-amber-600 cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-bold text-slate-800 mb-1">
                        <span>الهامش السفلي:</span>
                        <span className="text-amber-700">{currentStyle.marginBottom || 0}px</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={40}
                        step={2}
                        value={currentStyle.marginBottom || 0}
                        onChange={(e) => updateElementStyle(selectedElementKey, { marginBottom: Number(e.target.value) })}
                        className="w-full accent-amber-600 cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-bold text-slate-800 mb-1">
                        <span>تباعد الحروف:</span>
                        <span className="text-amber-700">{currentStyle.letterSpacing || 0}px</span>
                      </div>
                      <input
                        type="range"
                        min={-2}
                        max={10}
                        step={0.5}
                        value={currentStyle.letterSpacing || 0}
                        onChange={(e) => updateElementStyle(selectedElementKey, { letterSpacing: Number(e.target.value) })}
                        className="w-full accent-amber-600 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Specific options for Student Name & Grade / Recipient Block */}
                  {(selectedElementKey === 'studentName' || selectedElementKey === 'grade') && (
                    <div className="p-3 bg-gradient-to-br from-amber-50/80 to-orange-50/50 rounded-xl border border-amber-200/90 space-y-3 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>تنسيق المربع الذهبي والمسافات</span>
                        </label>
                        <input
                          type="checkbox"
                          checked={certificateData.showRecipientBox !== false}
                          onChange={(e) => updateField('showRecipientBox', e.target.checked)}
                          className="rounded border-amber-400 text-amber-600 focus:ring-amber-500 h-4 w-4 accent-amber-600 cursor-pointer"
                        />
                      </div>

                      {(certificateData.showRecipientBox !== false) && (
                        <div className="space-y-2.5 pt-1 border-t border-amber-200/60">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-[11px] font-bold text-slate-700">لون خلفية المربع الذهبي:</label>
                              <span className="text-[11px] font-mono font-bold text-amber-800 dir-ltr">{certificateData.recipientBoxColor || '#f59e0b'}</span>
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <input
                                type="color"
                                value={certificateData.recipientBoxColor || '#f59e0b'}
                                onChange={(e) => updateField('recipientBoxColor', e.target.value)}
                                className="w-7 h-7 rounded-lg border border-slate-300 cursor-pointer p-0.5 bg-white shrink-0"
                              />
                              {['#f59e0b', '#d97706', '#854d0e', '#9f1239', '#1d4ed8', '#15803d', '#475569'].map((col) => (
                                <button
                                  key={col}
                                  type="button"
                                  onClick={() => updateField('recipientBoxColor', col)}
                                  className={`w-5 h-5 rounded-full border border-black/20 transition hover:scale-110 cursor-pointer ${
                                    (certificateData.recipientBoxColor || '#f59e0b').toLowerCase() === col.toLowerCase() ? 'ring-2 ring-amber-600 scale-110' : ''
                                  }`}
                                  style={{ backgroundColor: col }}
                                />
                              ))}
                            </div>
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-[11px] font-bold text-slate-700">درجة الشفافية (Opacity):</label>
                              <span className="text-[11px] font-bold text-amber-900 bg-amber-100/80 px-1.5 py-0.5 rounded">
                                {Math.round((certificateData.recipientBoxOpacity ?? 0.12) * 100)}%
                              </span>
                            </div>
                            <input
                              type="range"
                              min="0.02"
                              max="1.0"
                              step="0.02"
                              value={certificateData.recipientBoxOpacity ?? 0.12}
                              onChange={(e) => updateField('recipientBoxOpacity', parseFloat(e.target.value))}
                              className="w-full accent-amber-600 h-1.5 bg-amber-200/80 rounded-lg cursor-pointer"
                            />
                          </div>
                        </div>
                      )}

                      <div className="pt-1.5 border-t border-amber-200/60">
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-bold text-slate-700">المسافة بين الاسم والصف:</label>
                          <span className="text-[11px] font-bold text-amber-900 bg-amber-100/80 px-1.5 py-0.5 rounded">
                            {certificateData.recipientSpacing ?? 4}px
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="32"
                          step="1"
                          value={certificateData.recipientSpacing ?? 4}
                          onChange={(e) => updateField('recipientSpacing', parseInt(e.target.value, 10))}
                          className="w-full accent-amber-600 h-1.5 bg-amber-200/80 rounded-lg cursor-pointer"
                        />
                      </div>
                    </div>
                  )}

                  {/* Custom Text Color for this Element */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5">لون النص الخاص لهذا العنصر:</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={currentStyle.color || '#000000'}
                        onChange={(e) => updateElementStyle(selectedElementKey, { color: e.target.value })}
                        className="w-9 h-9 rounded-lg border border-slate-300 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={currentStyle.color || ''}
                        onChange={(e) => updateElementStyle(selectedElementKey, { color: e.target.value })}
                        placeholder="تلقائي حسب الثيم"
                        className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-mono text-slate-700"
                      />
                      {currentStyle.color && (
                        <button
                          onClick={() => updateElementStyle(selectedElementKey, { color: undefined })}
                          className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-lg cursor-pointer"
                        >
                          إلغاء اللون
                        </button>
                      )}
                    </div>
                  </div>

                </div>
              );
            })()}

          </div>
        )}

        {/* TAB 2: PRESET TEMPLATES & LAYOUTS */}
        {activeTab === 'templates' && (() => {
          const layoutPresetNameMap: Record<string, { name: string; icon: string }> = {
            'classic-standard': { name: 'التخطيط الكلاسيكي المتوازن', icon: '📜' },
            'classic': { name: 'التخطيط الكلاسيكي المتوازن', icon: '📜' },
            'modern-split': { name: 'التخطيط العصري المدمج', icon: '✨' },
            'modern': { name: 'التخطيط العصري المدمج', icon: '✨' },
            'sidebar-right': { name: 'الإطار الجانبي الأيمن', icon: '📑' },
            'sidebar': { name: 'الإطار الجانبي الأيمن', icon: '📑' },
            'sidebar-left': { name: 'الإطار الجانبي الأيسر', icon: '🗂️' },
            'minimal-centered': { name: 'الملكي المتمركز', icon: '👑' },
            'centered': { name: 'الملكي المتمركز', icon: '👑' },
            'executive-horizontal': { name: 'التنفيذي الأكاديمي', icon: '🎓' },
            'executive': { name: 'التنفيذي الأكاديمي', icon: '🎓' },
            'diploma-grand': { name: 'الدبلوم الرفيع', icon: '🏆' },
            'custom-grid': { name: 'تخطيط مخصص يدوي', icon: '🛠️' },
          };

          const currentPresetId = certificateData.layoutPreset || 'classic-standard';
          const currentPresetInfo = layoutPresetNameMap[currentPresetId] || { name: 'كلاسيكي متوازن', icon: '📜' };
          const issuesInfo = detectLayoutPotentialIssues(certificateData);

          const templateCategories = ['الكل', ...Array.from(new Set(TEMPLATE_PRESETS.map(t => t.category).filter(Boolean)))];
          const filteredTemplates = selectedTemplateCategory === 'الكل'
            ? TEMPLATE_PRESETS
            : TEMPLATE_PRESETS.filter(t => t.category === selectedTemplateCategory);

          return (
            <div className="space-y-5">
              
              {/* FRAME 0: SYSTEM DEFAULT CERTIFICATE SETTINGS CARD */}
              <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-yellow-500/10 rounded-2xl border-2 border-amber-400/80 p-4 shadow-sm space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-sm shrink-0">
                      <Star className="w-5 h-5 fill-slate-950" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black text-slate-900 font-['Cairo']">
                          إعدادات الشهادة الافتراضية للنظام
                        </h4>
                        <span className="text-[10px] bg-amber-200 text-amber-950 font-extrabold px-2 py-0.5 rounded-full border border-amber-400">
                          نظام تقدير الموحد
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        احفظ نموذج الشهادة والتنسيقات الحالية كإعدادات افتراضية لكافة الشهادات ومحرك التحقق التلقائي
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSaveCurrentCertAsDefault}
                      className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                      title="حفظ الشهادة والتنسيقات الحالية كإعدادات افتراضية للنظام"
                    >
                      <Star className="w-4 h-4 fill-slate-950" />
                      <span>حفظ الشهادة كافتراضي للنظام ⭐</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleApplySystemDefaultSettings}
                      className="px-3.5 py-2 bg-white hover:bg-amber-50 text-slate-800 border border-amber-300 font-bold text-xs rounded-xl shadow-2xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                      title="تطبيق الإعدادات الافتراضية للنظام على الشهادة الحالية"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                      <span>تطبيق الافتراضي 🔄</span>
                    </button>
                  </div>
                </div>

                {defaultSettingsNotice && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-bold text-emerald-900 flex items-center gap-2 animate-fade-in">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{defaultSettingsNotice}</span>
                  </div>
                )}
              </div>

              {/* FRAME 1: EXPANDABLE CSS GRID LAYOUTS WINDOW */}
              <div className="bg-gradient-to-br from-amber-50/90 via-white to-orange-50/60 rounded-2xl border-2 border-amber-300/80 shadow-xs overflow-hidden transition-all">
                
                {/* Main Collapsible Header for CSS Grid Layouts */}
                <div
                  onClick={() => setIsGridLayoutSectionOpen(!isGridLayoutSectionOpen)}
                  className="p-4 bg-gradient-to-r from-amber-100/90 via-amber-50/80 to-orange-100/70 hover:from-amber-200/80 hover:to-orange-200/60 transition cursor-pointer flex flex-wrap items-center justify-between gap-2.5 select-none border-b border-amber-200/70"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-xs">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black text-slate-900 font-['Cairo']">
                          خيارات قوالب تخطيط الشهادة (CSS Grid Layouts)
                        </h4>
                        <span className="text-[10px] bg-amber-200 text-amber-950 font-black px-2 py-0.5 rounded-full border border-amber-400/80 shadow-2xs">
                          CSS Grid متجاوب
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        تخطيط هندسي متجاوب يضمن عدم تداخل العناصر أو خروجها عن حدود الشهادة
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Active preset indicator badge */}
                    <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-white/90 rounded-lg border border-amber-300 text-xs font-bold text-slate-800 shadow-2xs">
                      <span className="text-amber-600">{currentPresetInfo.icon}</span>
                      <span>النمط:</span>
                      <strong className="text-amber-900">{currentPresetInfo.name}</strong>
                    </div>

                    {/* Expand/Collapse Toggle Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsGridLayoutSectionOpen(!isGridLayoutSectionOpen);
                      }}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>{isGridLayoutSectionOpen ? 'طي النافذة' : 'توسيع خيارات التخطيط'}</span>
                      <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isGridLayoutSectionOpen ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Sub-Options Container (When Main Grid Window is Expanded) */}
                {isGridLayoutSectionOpen && (
                  <div className="p-4 space-y-3.5 animate-fade-in">

                    {/* SUB-OPTION 1: 7 CSS Grid Layout Presets */}
                    <div className="bg-white/95 rounded-xl border border-amber-200/90 shadow-2xs overflow-hidden">
                      <div
                        onClick={() => setIsLayoutPresetsSubOpen(!isLayoutPresetsSubOpen)}
                        className="p-3 bg-gradient-to-r from-amber-50/70 to-slate-50/50 hover:bg-amber-100/50 transition cursor-pointer flex flex-wrap items-center justify-between gap-2 select-none border-b border-slate-100"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
                            <LayoutGrid className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h5 className="text-xs font-black text-slate-900 font-['Cairo']">
                                أنماط التخطيطات السبعة لـ CSS Grid
                              </h5>
                              <span className="text-[9px] bg-slate-100 text-slate-700 font-bold px-1.5 py-0.2 rounded border border-slate-300">
                                8 تخطيطات هندسية
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500">
                              اختر النمط الهندسي المناسب لتوزيع عناصر الشهادة والأوسمة والتواقيع
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-md">
                            {currentPresetInfo.icon} {currentPresetInfo.name}
                          </span>
                          <ChevronDown className={`w-4 h-4 text-slate-600 transition-transform duration-200 ${isLayoutPresetsSubOpen ? 'rotate-180' : ''}`} />
                        </div>
                      </div>

                      {isLayoutPresetsSubOpen && (
                        <div className="p-3.5 space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                            {[
                              {
                                id: 'classic-standard',
                                legacyId: 'classic',
                                name: 'التخطيط الكلاسيكي المتوازن',
                                desc: 'ترويسة ➔ عنوان ➔ متن ➔ أختام ➔ تواقيع متوازية',
                                badge: 'الافتراضي القياسي',
                                icon: '📜',
                                diagram: (
                                  <div className="w-full h-14 bg-slate-100 rounded-lg p-1 flex flex-col justify-between border border-slate-200 text-[6px] text-slate-500 font-mono">
                                    <div className="h-2 bg-amber-200 rounded flex items-center justify-center font-bold">الترويسة</div>
                                    <div className="h-2 bg-slate-200 rounded flex items-center justify-center">العنوان</div>
                                    <div className="h-3.5 bg-amber-100 rounded flex items-center justify-center font-bold text-amber-800">متن التكريم</div>
                                    <div className="grid grid-cols-3 gap-0.5">
                                      <div className="h-2 bg-slate-200 rounded text-[5px] flex items-center justify-center">وسام</div>
                                      <div className="h-2 bg-slate-200 rounded text-[5px] flex items-center justify-center">ختم</div>
                                      <div className="h-2 bg-emerald-200 rounded text-[5px] flex items-center justify-center text-emerald-800 font-bold">QR</div>
                                    </div>
                                    <div className="h-2 bg-slate-200 rounded flex items-center justify-center">التواقيع</div>
                                  </div>
                                )
                              },
                              {
                                id: 'modern-split',
                                legacyId: 'modern',
                                name: 'التخطيط العصري المدمج',
                                desc: 'الأختام ومربع التوثيق بجانب التوقيع لتوسيع متن الشهادة',
                                badge: 'عصري وفسيح',
                                icon: '✨',
                                diagram: (
                                  <div className="w-full h-14 bg-slate-100 rounded-lg p-1 flex flex-col justify-between border border-slate-200 text-[6px] text-slate-500 font-mono">
                                    <div className="h-2 bg-amber-200 rounded flex items-center justify-center font-bold">الترويسة والعنوان</div>
                                    <div className="h-5 bg-amber-100 rounded flex items-center justify-center font-bold text-amber-800">متن الشهادة الفسيح</div>
                                    <div className="grid grid-cols-2 gap-1">
                                      <div className="h-3.5 bg-emerald-100 border border-emerald-200 rounded flex items-center justify-center text-[5.5px] font-bold text-emerald-800">الأختام والتوثيق</div>
                                      <div className="h-3.5 bg-slate-200 rounded flex items-center justify-center text-[5.5px]">التواقيع المعتمدة</div>
                                    </div>
                                  </div>
                                )
                              },
                              {
                                id: 'sidebar-right',
                                legacyId: 'sidebar',
                                name: 'تخطيط الإطار الجانبي الأيمن',
                                desc: 'عمود جانبي فاخر للأوسمة والأختام والـ QR على اليمين',
                                badge: 'أنيق ومميز',
                                icon: '📑',
                                diagram: (
                                  <div className="w-full h-14 bg-slate-100 rounded-lg p-1 grid grid-cols-3 gap-1 border border-slate-200 text-[6px] text-slate-500 font-mono">
                                    <div className="bg-amber-100 border border-amber-200 rounded p-0.5 flex flex-col justify-between items-center text-[5px] text-amber-900 font-bold">
                                      <span>وسام</span>
                                      <span>ختم</span>
                                      <span className="text-emerald-700">QR</span>
                                    </div>
                                    <div className="col-span-2 flex flex-col justify-between">
                                      <div className="h-2 bg-slate-200 rounded flex items-center justify-center">الترويسة</div>
                                      <div className="h-5 bg-amber-50 border border-amber-200/60 rounded flex items-center justify-center font-bold text-amber-800">متن التكريم</div>
                                      <div className="h-2.5 bg-slate-200 rounded flex items-center justify-center">التواقيع</div>
                                    </div>
                                  </div>
                                )
                              },
                              {
                                id: 'sidebar-left',
                                name: 'تخطيط الإطار الجانبي الأيسر',
                                desc: 'عمود جانبي للأوسمة والتوثيق على اليسار ومتن بارز',
                                badge: 'متناسق ومبتكر',
                                icon: '🗂️',
                                diagram: (
                                  <div className="w-full h-14 bg-slate-100 rounded-lg p-1 grid grid-cols-3 gap-1 border border-slate-200 text-[6px] text-slate-500 font-mono">
                                    <div className="col-span-2 flex flex-col justify-between">
                                      <div className="h-2 bg-slate-200 rounded flex items-center justify-center">الترويسة</div>
                                      <div className="h-5 bg-amber-50 border border-amber-200/60 rounded flex items-center justify-center font-bold text-amber-800">متن التكريم</div>
                                      <div className="h-2.5 bg-slate-200 rounded flex items-center justify-center">التواقيع</div>
                                    </div>
                                    <div className="bg-amber-100 border border-amber-200 rounded p-0.5 flex flex-col justify-between items-center text-[5px] text-amber-900 font-bold">
                                      <span>وسام</span>
                                      <span>ختم</span>
                                      <span className="text-emerald-700">QR</span>
                                    </div>
                                  </div>
                                )
                              },
                              {
                                id: 'minimal-centered',
                                legacyId: 'centered',
                                name: 'التخطيط الملكي المتمركز',
                                desc: 'محاذاة متمركزة فائقة التناظر تركز على وسام الفخر والأصالة',
                                badge: 'فخامة ملكية',
                                icon: '👑',
                                diagram: (
                                  <div className="w-full h-14 bg-slate-100 rounded-lg p-1 flex flex-col justify-between border border-slate-200 text-[6px] text-slate-500 font-mono items-center">
                                    <div className="h-2 w-3/4 bg-amber-200 rounded flex items-center justify-center font-bold">الترويسة الملكية</div>
                                    <div className="h-2 w-1/2 bg-slate-200 rounded flex items-center justify-center">العنوان الذهبي</div>
                                    <div className="h-3 w-4/5 bg-amber-100 rounded flex items-center justify-center font-bold text-amber-800">نص التكريم المتمركز</div>
                                    <div className="h-2 w-2/3 bg-emerald-100 rounded flex items-center justify-center font-bold text-emerald-800 text-[5px]">الأوسمة والتوثيق</div>
                                    <div className="h-2 w-3/4 bg-slate-200 rounded flex items-center justify-center">التواقيع الملكية</div>
                                  </div>
                                )
                              },
                              {
                                id: 'executive-horizontal',
                                legacyId: 'executive',
                                name: 'التخطيط التنفيذي الأكاديمي',
                                desc: 'توثيق معتمد مدمج بجانب المتن وتواقيع عريضة أسفل الشهادة',
                                badge: 'جامعات ومؤسسات',
                                icon: '🎓',
                                diagram: (
                                  <div className="w-full h-14 bg-slate-100 rounded-lg p-1 flex flex-col justify-between border border-slate-200 text-[6px] text-slate-500 font-mono">
                                    <div className="h-2 bg-amber-200 rounded flex items-center justify-center font-bold">الترويسة الرسمية</div>
                                    <div className="grid grid-cols-3 gap-1 h-5">
                                      <div className="col-span-2 bg-amber-50 border border-amber-200/60 rounded flex items-center justify-center font-bold text-amber-800">نص التكريم</div>
                                      <div className="bg-emerald-50 border border-emerald-200 rounded flex flex-col items-center justify-center text-[5px] text-emerald-800 font-bold">
                                        <span>الختم</span>
                                        <span>والتوثيق</span>
                                      </div>
                                    </div>
                                    <div className="h-2.5 bg-slate-200 rounded flex items-center justify-center font-bold">التواقيع الرسمية العريضة</div>
                                  </div>
                                )
                              },
                              {
                                id: 'diploma-grand',
                                name: 'تخطيط الدبلوم الرفيع',
                                desc: 'توقيعات في المنتصف وأختام وشارات الاعتماد في الهامش السفلي',
                                badge: 'شهادات تخرج ودبلومات',
                                icon: '🏆',
                                diagram: (
                                  <div className="w-full h-14 bg-slate-100 rounded-lg p-1 flex flex-col justify-between border border-slate-200 text-[6px] text-slate-500 font-mono">
                                    <div className="h-2 bg-amber-200 rounded flex items-center justify-center font-bold">الترويسة المعتمدة</div>
                                    <div className="h-2 bg-slate-200 rounded flex items-center justify-center">العنوان</div>
                                    <div className="h-3 bg-amber-100 rounded flex items-center justify-center font-bold text-amber-800">متن الشهادة والدرجة</div>
                                    <div className="h-2 bg-slate-200 rounded flex items-center justify-center font-bold">التواقيع المعتمدة</div>
                                    <div className="grid grid-cols-3 gap-0.5">
                                      <div className="h-2 bg-slate-200 rounded text-[5px] flex items-center justify-center">وسام</div>
                                      <div className="h-2 bg-slate-200 rounded text-[5px] flex items-center justify-center">ختم</div>
                                      <div className="h-2 bg-emerald-200 rounded text-[5px] flex items-center justify-center text-emerald-800 font-bold">QR</div>
                                    </div>
                                  </div>
                                )
                              },
                              {
                                id: 'custom-grid',
                                name: 'تخطيط مخصص يدوي (Custom Grid)',
                                desc: 'تحكم كامل عبر كتابة وتعديل grid-template-areas مع فحص فوري للسلامة',
                                badge: 'محرر يدوي متقدم',
                                icon: '🛠️',
                                diagram: (
                                  <div className="w-full h-14 bg-slate-900 rounded-lg p-1 flex flex-col justify-between border border-amber-500/60 text-[6px] text-amber-300 font-mono">
                                    <div className="flex justify-between items-center text-[5px] text-amber-400 font-bold px-0.5">
                                      <span>grid-template-areas</span>
                                      <span className="text-emerald-400 font-bold">● يدوي</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-0.5 my-auto">
                                      <div className="h-2.5 bg-amber-500/30 border border-amber-500/40 rounded flex items-center justify-center font-bold text-amber-200">header</div>
                                      <div className="h-2.5 bg-sky-500/30 border border-sky-500/40 rounded flex items-center justify-center font-bold text-sky-200">title</div>
                                      <div className="h-3 bg-emerald-500/30 border border-emerald-500/40 rounded flex items-center justify-center font-bold text-emerald-200">body</div>
                                      <div className="h-3 bg-violet-500/30 border border-violet-500/40 rounded flex items-center justify-center font-bold text-violet-200">stamps</div>
                                    </div>
                                    <div className="h-2 bg-slate-700/80 rounded flex items-center justify-center text-[5px] text-slate-300">signatures signatures</div>
                                  </div>
                                )
                              },
                            ].map((preset) => {
                              const isCurrent = currentPresetId === preset.id || (preset.legacyId && currentPresetId === preset.legacyId);
                              return (
                                <button
                                  key={preset.id}
                                  type="button"
                                  onClick={() => updateField('layoutPreset', preset.id as LayoutPreset)}
                                  className={`p-2.5 rounded-xl border text-right transition flex flex-col justify-between gap-2 cursor-pointer shadow-2xs group ${
                                    isCurrent
                                      ? 'border-amber-500 bg-amber-50/80 ring-2 ring-amber-400'
                                      : 'border-slate-200 bg-white hover:border-amber-300 hover:bg-slate-50'
                                  }`}
                                >
                                  <div className="w-full">
                                    {preset.diagram}
                                    <div className="flex items-center justify-between mt-2">
                                      <span className="font-extrabold text-xs text-slate-900 group-hover:text-amber-800 transition flex items-center gap-1">
                                        <span>{preset.icon}</span>
                                        <span>{preset.name}</span>
                                      </span>
                                      {isCurrent && (
                                        <span className="text-[9px] bg-amber-500 text-slate-950 font-black px-1.5 py-0.5 rounded shadow-2xs">
                                          مفعّل
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[10px] text-slate-500 line-clamp-2 mt-0.5 leading-snug">
                                      {preset.desc}
                                    </p>
                                  </div>

                                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[9px] font-bold text-slate-600">
                                    <span className="text-amber-700">{preset.badge}</span>
                                    <span className={`px-2 py-0.5 rounded transition ${isCurrent ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-100 group-hover:bg-amber-200'}`}>
                                      {isCurrent ? 'النمط الحالي' : 'تطبيق هذا التخطيط'}
                                    </span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* SUB-OPTION 2: AI Auto-Fit & Layout Optimizer */}
                    <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-xl border border-amber-500/50 shadow-md overflow-hidden relative">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
                      
                      <div
                        onClick={() => setIsAiLayoutOptimizerSubOpen(!isAiLayoutOptimizerSubOpen)}
                        className="p-3 bg-slate-950/60 hover:bg-slate-950/80 transition cursor-pointer flex flex-wrap items-center justify-between gap-2 relative z-10 select-none border-b border-amber-500/20"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950 flex items-center justify-center font-black shadow-xs">
                            <BrainCircuit className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-black font-['Cairo'] text-amber-300">
                                التنسيق والتوسيط التلقائي بالذكاء الاصطناعي (Smart Auto-Fit)
                              </span>
                              <span className="text-[9px] bg-amber-400/20 text-amber-300 border border-amber-400/40 px-1.5 py-0.2 rounded font-bold">
                                Gemini 3.7
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-300">
                              حساب ذكي فوري لمقاسات الخطوط، الهوامش الآمنة، وتوسيط المتن والتواقيع بدون أي تداخل
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {issuesInfo.hasIssues ? (
                            <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 border ${
                              issuesInfo.severity === 'high' 
                                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' 
                                : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            }`}>
                              <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                              <span>{issuesInfo.issues.length} ملاحظات تنسيق</span>
                            </div>
                          ) : (
                            <div className="px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                              <span>التخطيط متناسق وآمن</span>
                            </div>
                          )}
                          <ChevronDown className={`w-4 h-4 text-amber-300 transition-transform duration-200 ${isAiLayoutOptimizerSubOpen ? 'rotate-180' : ''}`} />
                        </div>
                      </div>

                      {isAiLayoutOptimizerSubOpen && (
                        <div className="p-3.5 space-y-3 relative z-10">
                          {/* Quick Warning Details (if any detected) */}
                          {issuesInfo.hasIssues && (
                            <div className="p-2 bg-slate-800/80 border border-slate-700/80 rounded-lg text-[10px] space-y-1">
                              {issuesInfo.issues.slice(0, 2).map((issue) => (
                                <div key={issue.id} className="flex items-start gap-1.5 text-slate-300">
                                  <span className="text-amber-400 mt-0.5">•</span>
                                  <div>
                                    <strong className="text-amber-200">{issue.title}:</strong> {issue.description}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Action Buttons Row */}
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleOptimizeLayoutAi()}
                              disabled={isAiOptimizingLayout}
                              className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs rounded-xl shadow-md hover:shadow-amber-500/25 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isAiOptimizingLayout ? (
                                <>
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  <span>جاري التحليل الهندسي بالذكاء الاصطناعي...</span>
                                </>
                              ) : (
                                <>
                                  <Sparkles className="w-3.5 h-3.5" />
                                  <span>تنسيق وملاءمة شاملة بالذكاء الاصطناعي ✨</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleInstantAutoFit()}
                              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 hover:border-amber-400 text-xs font-bold rounded-xl transition flex items-center gap-1 cursor-pointer"
                            >
                              <Wand2 className="w-3.5 h-3.5 text-amber-400" />
                              <span>⚡ ملاءمة فورية وحساب الهوامش</span>
                            </button>

                            {previousCertDataBeforeLayoutAi && (
                              <button
                                type="button"
                                onClick={handleUndoLayoutOptimization}
                                className="px-2.5 py-1.5 bg-slate-800 hover:bg-rose-900/60 border border-slate-700 hover:border-rose-500 text-rose-300 text-xs font-bold rounded-xl transition flex items-center gap-1 cursor-pointer ms-auto"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>تراجع</span>
                              </button>
                            )}
                          </div>

                          {/* Result Notice & Detailed Feedback Accordion */}
                          {aiLayoutNotice && (
                            <div className="p-2.5 bg-amber-500/15 border border-amber-500/30 rounded-lg text-xs space-y-1.5 animate-fade-in">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 font-bold text-amber-200">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                                  <span>تقرير التحسين الهندسي:</span>
                                </div>
                                {aiLayoutResult && (
                                  <button
                                    type="button"
                                    onClick={() => setIsAiLayoutDetailsOpen(!isAiLayoutDetailsOpen)}
                                    className="text-[10px] text-amber-300 hover:underline flex items-center gap-0.5 cursor-pointer"
                                  >
                                    <span>{isAiLayoutDetailsOpen ? 'إخفاء التفاصيل' : 'عرض تفاصيل الأبعاد'}</span>
                                    <ChevronDown className={`w-3 h-3 transition-transform ${isAiLayoutDetailsOpen ? 'rotate-180' : ''}`} />
                                  </button>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-200 leading-relaxed">
                                {aiLayoutNotice}
                              </p>

                              {isAiLayoutDetailsOpen && aiLayoutResult && (
                                <div className="mt-2 pt-2 border-t border-amber-500/20 space-y-2 text-[10px]">
                                  {aiLayoutResult.highlights && aiLayoutResult.highlights.length > 0 && (
                                    <div className="space-y-1">
                                      <span className="font-bold text-amber-300">أبرز التعديلات المنفذة:</span>
                                      <ul className="list-disc list-inside text-slate-300 space-y-0.5 ps-1">
                                        {aiLayoutResult.highlights.map((h, i) => (
                                          <li key={i}>{h}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}

                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1">
                                    <div className="p-1.5 bg-slate-900/90 rounded border border-slate-700 text-center">
                                      <span className="text-slate-400 block text-[9px]">خط العنوان:</span>
                                      <strong className="text-amber-300 font-mono text-xs">{aiLayoutResult.elementFontSizes.title}px</strong>
                                    </div>
                                    <div className="p-1.5 bg-slate-900/90 rounded border border-slate-700 text-center">
                                      <span className="text-slate-400 block text-[9px]">اسم المكرم:</span>
                                      <strong className="text-amber-300 font-mono text-xs">{aiLayoutResult.elementFontSizes.studentName}px</strong>
                                    </div>
                                    <div className="p-1.5 bg-slate-900/90 rounded border border-slate-700 text-center">
                                      <span className="text-slate-400 block text-[9px]">نص التكريم:</span>
                                      <strong className="text-amber-300 font-mono text-xs">{aiLayoutResult.elementFontSizes.appreciationText}px</strong>
                                    </div>
                                    <div className="p-1.5 bg-slate-900/90 rounded border border-slate-700 text-center">
                                      <span className="text-slate-400 block text-[9px]">الهامش الآمن:</span>
                                      <strong className="text-amber-300 font-mono text-xs">{aiLayoutResult.margins.canvasMarginTop}px</strong>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* SUB-OPTION 3: Custom Layout Editor & Validator Panel */}
                    {(() => {
                      const isCustomActive = certificateData.layoutPreset === 'custom-grid';
                      const currentAreas = certificateData.customGridTemplateAreas || '"header header"\n"title title"\n"body body"\n"stamps signatures"';
                      const validation = validateGridTemplateAreas(currentAreas);

                      const handleApplySnippet = (snippet: typeof CUSTOM_GRID_SNIPPETS[0]) => {
                        onChange({
                          ...certificateData,
                          layoutPreset: 'custom-grid',
                          customGridTemplateAreas: snippet.areas,
                          customGridTemplateColumns: snippet.columns,
                          customGridTemplateRows: snippet.rows
                        });
                      };

                      const handleFormatCode = () => {
                        if (validation.isValid && validation.formattedCss) {
                          onChange({
                            ...certificateData,
                            layoutPreset: 'custom-grid',
                            customGridTemplateAreas: validation.formattedCss
                          });
                        }
                      };

                      return (
                        <div className={`rounded-xl border transition-all duration-300 overflow-hidden ${
                          isCustomActive
                            ? 'bg-slate-900 text-slate-100 border-amber-500/80 shadow-md ring-1 ring-amber-500/40'
                            : 'bg-white text-slate-900 border-slate-200 hover:border-slate-300'
                        }`}>
                          <div
                            onClick={() => setIsCustomGridEditorSubOpen(!isCustomGridEditorSubOpen)}
                            className={`p-3 transition cursor-pointer flex flex-wrap items-center justify-between gap-2 select-none border-b ${
                              isCustomActive 
                                ? 'bg-slate-950/70 hover:bg-slate-950 border-slate-800' 
                                : 'bg-slate-50/70 hover:bg-slate-100/70 border-slate-100'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
                                <Code className="w-3.5 h-3.5" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h5 className={`text-xs font-black font-['Cairo'] ${isCustomActive ? 'text-white' : 'text-slate-900'}`}>
                                    محرر وتخصيص شبكة الـ CSS Grid المتقدم (Custom Grid)
                                  </h5>
                                  {isCustomActive && (
                                    <span className="text-[9px] bg-amber-500 text-slate-950 font-black px-1.5 py-0.2 rounded">
                                      مفعّل حالياً
                                    </span>
                                  )}
                                </div>
                                <p className={`text-[10px] ${isCustomActive ? 'text-slate-400' : 'text-slate-500'}`}>
                                  اكتب صفوف الـ Grid بدقة لتوزيع عناصر الشهادة بحرية تامة مع فحص فوري للسلامة
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {validation.isValid ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                  <span>بنية صالحة ({validation.rowCount}×{validation.colCount})</span>
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3 text-rose-400" />
                                  <span>تنبيه في البنية</span>
                                </span>
                              )}
                              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isCustomActive ? 'text-slate-300' : 'text-slate-600'} ${isCustomGridEditorSubOpen ? 'rotate-180' : ''}`} />
                            </div>
                          </div>

                          {isCustomGridEditorSubOpen && (
                            <div className="p-3.5 space-y-3">
                              {/* Status bar & activation */}
                              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-700/30">
                                <span className={`text-[10px] font-bold ${isCustomActive ? 'text-slate-300' : 'text-slate-600'}`}>
                                  {isCustomActive ? 'التحكم المخصص مفعل على المعاينة الحية' : 'يمكنك تفعيل هذا المحرر للتحكم الكامل بأماكن الحقول'}
                                </span>

                                {!isCustomActive && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onChange({
                                        ...certificateData,
                                        layoutPreset: 'custom-grid',
                                        customGridTemplateAreas: currentAreas
                                      });
                                    }}
                                    className="text-[10px] bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-2.5 py-1 rounded-lg transition cursor-pointer shadow-xs"
                                  >
                                    تفعيل هذا التخطيط المخصص
                                  </button>
                                )}
                              </div>

                              {/* Quick Preset Snippets & AI Grid Generator */}
                              <div className="space-y-1.5">
                                <div className="flex flex-wrap items-center justify-between text-[10px] font-bold text-slate-400 gap-1">
                                  <span>نماذج جاهزة للبدء السريع أو توليد مخصص:</span>
                                  <button
                                    type="button"
                                    onClick={() => handleOptimizeLayoutAi('custom-grid')}
                                    disabled={isAiOptimizingLayout}
                                    className="px-2 py-0.5 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black rounded-md flex items-center gap-1 cursor-pointer transition shadow-2xs text-[9.5px] disabled:opacity-50"
                                  >
                                    <Sparkles className="w-3 h-3" />
                                    <span>توليد شبكة مخصصة بالذكاء الاصطناعي</span>
                                  </button>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5">
                                  {CUSTOM_GRID_SNIPPETS.map((snip) => (
                                    <button
                                      key={snip.id}
                                      type="button"
                                      onClick={() => handleApplySnippet(snip)}
                                      className={`p-1.5 rounded-lg border text-right transition cursor-pointer text-[10px] ${
                                        isCustomActive 
                                          ? 'border-slate-700 bg-slate-800/80 hover:bg-amber-500/20 hover:border-amber-400' 
                                          : 'border-slate-200 bg-slate-50 hover:bg-amber-50 hover:border-amber-300'
                                      }`}
                                    >
                                      <span className="font-bold text-amber-400 block truncate">{snip.name}</span>
                                      <span className="text-[9px] text-slate-400 block truncate">{snip.badge}</span>
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Allowed Area Tokens Bar */}
                              <div className={`p-2 rounded-lg border space-y-1.5 ${
                                isCustomActive ? 'bg-slate-800/70 border-slate-700' : 'bg-slate-50 border-slate-200'
                              }`}>
                                <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                                  <span className="flex items-center gap-1">
                                    <Wrench className="w-3 h-3 text-amber-400" />
                                    <span>المناطق المعتمدة للشهادة (انقر لإدراج الرمز):</span>
                                  </span>
                                  <span className="text-[9px] font-mono">header | title | body | stamps | signatures | .</span>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {CERTIFICATE_GRID_AREAS.map((area) => {
                                    const isPresent = validation.presentAreas.includes(area.id);
                                    return (
                                      <button
                                        key={area.id}
                                        type="button"
                                        onClick={() => {
                                          const newAreas = currentAreas.trim() + ` "${area.id}"`;
                                          onChange({
                                            ...certificateData,
                                            layoutPreset: 'custom-grid',
                                            customGridTemplateAreas: newAreas
                                          });
                                        }}
                                        className={`px-2 py-1 rounded-md text-[10px] font-bold border transition flex items-center gap-1 cursor-pointer ${
                                          isPresent
                                            ? 'bg-slate-700 text-slate-100 border-slate-600 hover:border-amber-400'
                                            : 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                                        }`}
                                        title={area.descAr}
                                      >
                                        <span>{area.icon}</span>
                                        <span>{area.id}</span>
                                        <span className="text-[9px] opacity-75">({area.nameAr})</span>
                                        {isPresent ? (
                                          <span className="text-[8px] text-emerald-400 font-bold">✓</span>
                                        ) : (
                                          <span className="text-[8px] text-amber-400 font-bold">+</span>
                                        )}
                                      </button>
                                    );
                                  })}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newAreas = currentAreas.trim() + ' "."';
                                      onChange({
                                        ...certificateData,
                                        layoutPreset: 'custom-grid',
                                        customGridTemplateAreas: newAreas
                                      });
                                    }}
                                    className="px-2 py-1 rounded-md text-[10px] font-bold bg-slate-700 text-slate-300 border border-slate-600 hover:border-amber-400 transition cursor-pointer"
                                    title="خلية فارغة في الشبكة"
                                  >
                                    <span>. (فارغ)</span>
                                  </button>
                                </div>
                              </div>

                              {/* Interactive Editor & Live Visualizer */}
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                                    <label htmlFor="custom-grid-textarea" className="flex items-center gap-1">
                                      <span>صياغة الـ CSS Grid Template Areas:</span>
                                    </label>
                                    <div className="flex items-center gap-1.5">
                                      {validation.isValid && (
                                        <button
                                          type="button"
                                          onClick={handleFormatCode}
                                          className="text-[9px] text-amber-400 hover:text-amber-300 underline cursor-pointer"
                                        >
                                          تنسيق الكود
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          onChange({
                                            ...certificateData,
                                            layoutPreset: 'custom-grid',
                                            customGridTemplateAreas: '"header header"\n"title title"\n"body body"\n"stamps signatures"',
                                            customGridTemplateColumns: '1fr 1fr',
                                            customGridTemplateRows: 'auto auto 1fr auto'
                                          });
                                        }}
                                        className="text-[9px] text-slate-400 hover:text-slate-200 cursor-pointer"
                                      >
                                        إعادة ضبط
                                      </button>
                                    </div>
                                  </div>

                                  <textarea
                                    id="custom-grid-textarea"
                                    rows={4}
                                    value={currentAreas}
                                    onChange={(e) => {
                                      onChange({
                                        ...certificateData,
                                        layoutPreset: 'custom-grid',
                                        customGridTemplateAreas: e.target.value
                                      });
                                    }}
                                    placeholder={`"header header"\n"title title"\n"body stamps"\n"signatures signatures"`}
                                    className="w-full p-2.5 font-mono text-xs rounded-lg bg-slate-950 border border-slate-700 text-amber-200 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none leading-relaxed transition resize-y"
                                    dir="ltr"
                                    spellCheck={false}
                                  />
                                </div>

                                <div className="space-y-1.5 flex flex-col">
                                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                                    <span>المعاينة الهيكلية اللحظية للشبكة:</span>
                                    <span className="text-[9px]">
                                      {validation.rowCount} صفوف × {validation.colCount} أعمدة
                                    </span>
                                  </div>

                                  <div className="grow min-h-[95px] p-2 rounded-lg bg-slate-950 border border-slate-800 flex flex-col justify-center">
                                    {validation.matrix.length > 0 ? (
                                      <div
                                        className="grid gap-1 w-full h-full max-h-[140px] text-center"
                                        style={{
                                          gridTemplateRows: `repeat(${validation.rowCount}, minmax(0, 1fr))`,
                                          gridTemplateColumns: `repeat(${validation.colCount}, minmax(0, 1fr))`
                                        }}
                                      >
                                        {validation.matrix.map((row, rIdx) =>
                                          row.map((cell, cIdx) => {
                                            const areaDef = CERTIFICATE_GRID_AREAS.find((a) => a.id === cell);
                                            const cellBg =
                                              cell === 'header' ? 'bg-amber-500/30 text-amber-200 border-amber-500/50' :
                                              cell === 'title' ? 'bg-sky-500/30 text-sky-200 border-sky-500/50' :
                                              cell === 'body' ? 'bg-emerald-500/30 text-emerald-200 border-emerald-500/50' :
                                              cell === 'stamps' ? 'bg-violet-500/30 text-violet-200 border-violet-500/50' :
                                              cell === 'signatures' ? 'bg-slate-700 text-slate-200 border-slate-600' :
                                              'bg-slate-900 text-slate-500 border-slate-800';

                                            return (
                                              <div
                                                key={`cell-${rIdx}-${cIdx}`}
                                                className={`p-1 rounded text-[9px] font-mono font-bold border flex items-center justify-center truncate ${cellBg}`}
                                                title={`الصف ${rIdx + 1}، العمود ${cIdx + 1}: ${cell}`}
                                              >
                                                {areaDef ? `${areaDef.icon} ${cell}` : cell}
                                              </div>
                                            );
                                          })
                                        )}
                                      </div>
                                    ) : (
                                      <div className="text-center text-slate-500 text-[10px] py-4">
                                        اكتب صياغة الشبكة لعرض المخطط هنا
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Validation Warnings & Feedback */}
                              {!validation.isValid && validation.error && (
                                <div className="p-2.5 rounded-lg bg-rose-950/80 border border-rose-700/80 text-rose-200 text-[11px] flex items-start gap-2">
                                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                                  <div>
                                    <span className="font-bold block">خطأ في بنية الـ Grid:</span>
                                    <p className="mt-0.5 leading-relaxed">{validation.error}</p>
                                  </div>
                                </div>
                              )}

                              {validation.warnings.length > 0 && (
                                <div className="p-2 rounded-lg bg-amber-950/60 border border-amber-600/60 text-amber-200 text-[10px] space-y-0.5">
                                  {validation.warnings.map((w, idx) => (
                                    <div key={idx} className="flex items-center gap-1.5">
                                      <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                      <span>{w}</span>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Advanced Column & Row Settings */}
                              <div className="pt-2 border-t border-slate-700/40 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px]">
                                <div>
                                  <label htmlFor="custom-grid-cols" className={`block font-bold mb-1 ${isCustomActive ? 'text-slate-400' : 'text-slate-600'}`}>
                                    تحديد الأعمدة (grid-template-columns):
                                  </label>
                                  <input
                                    id="custom-grid-cols"
                                    type="text"
                                    value={certificateData.customGridTemplateColumns || ''}
                                    onChange={(e) => updateField('customGridTemplateColumns', e.target.value)}
                                    placeholder={validation.colCount > 1 ? `repeat(${validation.colCount}, 1fr)` : '100%'}
                                    className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-200 font-mono text-xs focus:ring-1 focus:ring-amber-500 outline-none"
                                    dir="ltr"
                                  />
                                </div>
                                <div>
                                  <label htmlFor="custom-grid-rows" className={`block font-bold mb-1 ${isCustomActive ? 'text-slate-400' : 'text-slate-600'}`}>
                                    تحديد الصفوف (grid-template-rows):
                                  </label>
                                  <input
                                    id="custom-grid-rows"
                                    type="text"
                                    value={certificateData.customGridTemplateRows || ''}
                                    onChange={(e) => updateField('customGridTemplateRows', e.target.value)}
                                    placeholder={validation.rowCount > 0 ? `repeat(${validation.rowCount}, auto)` : 'auto auto 1fr auto'}
                                    className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-200 font-mono text-xs focus:ring-1 focus:ring-amber-500 outline-none"
                                    dir="ltr"
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* SUB-OPTION 4: Safe Margins & Spacing Controls */}
                    <div className="bg-white/95 rounded-xl border border-amber-200/90 shadow-2xs overflow-hidden">
                      <div
                        onClick={() => setIsSafeMarginsSpacingSubOpen(!isSafeMarginsSpacingSubOpen)}
                        className="p-3 bg-gradient-to-r from-amber-50/70 to-slate-50/50 hover:bg-amber-100/50 transition cursor-pointer flex flex-wrap items-center justify-between gap-2 select-none border-b border-slate-100"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
                            <SlidersHorizontal className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h5 className="text-xs font-black text-slate-900 font-['Cairo']">
                                الهوامش الآمنة وأبعاد التباعد الهندسي (Safe Margins & Spacings)
                              </h5>
                              <span className="text-[9px] bg-slate-100 text-slate-700 font-bold px-1.5 py-0.2 rounded border border-slate-300">
                                هوامش حرة
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500">
                              ضبط المسافات بين محتوى الشهادة وإطار الزخرفة الخارجي مع حساب تلقائي موصى به
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-600 font-mono font-bold bg-slate-100 px-2 py-0.5 rounded">
                            {certificateData.canvasMarginTop ?? 32}px / {certificateData.canvasMarginLeft ?? 40}px
                          </span>
                          <ChevronDown className={`w-4 h-4 text-slate-600 transition-transform duration-200 ${isSafeMarginsSpacingSubOpen ? 'rotate-180' : ''}`} />
                        </div>
                      </div>

                      {isSafeMarginsSpacingSubOpen && (
                        <div className="p-3.5 space-y-3">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                            <div>
                              <div className="flex justify-between items-center mb-0.5">
                                <span className="text-[10px] font-bold text-slate-700">الهامش العلوي:</span>
                                <span className="text-[10px] font-mono text-amber-800 font-bold">{certificateData.canvasMarginTop ?? 32}px</span>
                              </div>
                              <input
                                type="range"
                                min="0"
                                max="60"
                                step="2"
                                value={certificateData.canvasMarginTop ?? 32}
                                onChange={(e) => updateField('canvasMarginTop', parseInt(e.target.value))}
                                className="w-full accent-amber-600 h-1.5"
                              />
                            </div>

                            <div>
                              <div className="flex justify-between items-center mb-0.5">
                                <span className="text-[10px] font-bold text-slate-700">الهامش السفلي:</span>
                                <span className="text-[10px] font-mono text-amber-800 font-bold">{certificateData.canvasMarginBottom ?? 30}px</span>
                              </div>
                              <input
                                type="range"
                                min="0"
                                max="60"
                                step="2"
                                value={certificateData.canvasMarginBottom ?? 30}
                                onChange={(e) => updateField('canvasMarginBottom', parseInt(e.target.value))}
                                className="w-full accent-amber-600 h-1.5"
                              />
                            </div>

                            <div>
                              <div className="flex justify-between items-center mb-0.5">
                                <span className="text-[10px] font-bold text-slate-700">الهامش الأيمن:</span>
                                <span className="text-[10px] font-mono text-amber-800 font-bold">{certificateData.canvasMarginRight ?? 40}px</span>
                              </div>
                              <input
                                type="range"
                                min="0"
                                max="80"
                                step="2"
                                value={certificateData.canvasMarginRight ?? 40}
                                onChange={(e) => updateField('canvasMarginRight', parseInt(e.target.value))}
                                className="w-full accent-amber-600 h-1.5"
                              />
                            </div>

                            <div>
                              <div className="flex justify-between items-center mb-0.5">
                                <span className="text-[10px] font-bold text-slate-700">الهامش الأيسر:</span>
                                <span className="text-[10px] font-mono text-amber-800 font-bold">{certificateData.canvasMarginLeft ?? 40}px</span>
                              </div>
                              <input
                                type="range"
                                min="0"
                                max="80"
                                step="2"
                                value={certificateData.canvasMarginLeft ?? 40}
                                onChange={(e) => updateField('canvasMarginLeft', parseInt(e.target.value))}
                                className="w-full accent-amber-600 h-1.5"
                              />
                            </div>
                          </div>

                          {/* Action Buttons for Margins */}
                          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                            <button
                              type="button"
                              onClick={handleAutoSafeMargins}
                              className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-950 font-bold text-xs rounded-lg transition flex items-center gap-1 cursor-pointer"
                            >
                              <Wand2 className="w-3.5 h-3.5 text-amber-700" />
                              <span>حساب الهوامش الآمنة تلقائياً</span>
                            </button>

                            <button
                              type="button"
                              onClick={handleSaveDefaultMargins}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-lg transition flex items-center gap-1 cursor-pointer"
                            >
                              <Save className="w-3.5 h-3.5 text-slate-600" />
                              <span>حفظ كافتراضي</span>
                            </button>

                            {marginNotice && (
                              <span className="text-[11px] text-amber-800 font-bold animate-fade-in ms-auto">
                                {marginNotice}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                  </div>
                )}
              </div>

              {/* FRAME 2: EXPANDABLE PRESET TEMPLATES FRAME */}
              <div className="bg-gradient-to-br from-indigo-50/80 via-white to-slate-50 rounded-2xl border-2 border-indigo-200/90 shadow-xs overflow-hidden transition-all">
                
                {/* Main Collapsible Header for Choosing Templates */}
                <div
                  onClick={() => setIsPresetTemplatesSectionOpen(!isPresetTemplatesSectionOpen)}
                  className="p-4 bg-gradient-to-r from-indigo-100/90 via-indigo-50/80 to-purple-100/70 hover:from-indigo-200/80 hover:to-purple-200/60 transition cursor-pointer flex flex-wrap items-center justify-between gap-2.5 select-none border-b border-indigo-200/70"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black shadow-xs">
                      <Award className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black text-slate-900 font-['Cairo']">
                          قوالب الشهادات الجاهزة (20+ قالب تصميمي متميز)
                        </h4>
                        <span className="text-[10px] bg-indigo-200 text-indigo-950 font-black px-2 py-0.5 rounded-full border border-indigo-400/80 shadow-2xs">
                          {TEMPLATE_PRESETS.length} قوالب احترافية
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        اختر قالباً جاهزاً بضغطة زر مع الحفاظ التام على بياناتك ونصوصك وتخصيصاتك
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsGalleryModalOpen(true);
                      }}
                      className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-900 font-bold text-xs rounded-xl border border-indigo-300 transition cursor-pointer"
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                      <span>المعرض المكبر</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsPresetTemplatesSectionOpen(!isPresetTemplatesSectionOpen);
                      }}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>{isPresetTemplatesSectionOpen ? 'طي القوالب' : 'توسيع واختيار القالب'}</span>
                      <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isPresetTemplatesSectionOpen ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Templates Selector Body (When Frame is Expanded) */}
                {isPresetTemplatesSectionOpen && (
                  <div className="p-4 space-y-4 animate-fade-in">
                    
                    {/* Gallery Banner Card */}
                    <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-3.5 rounded-2xl text-white flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md border border-slate-800">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 font-black flex items-center justify-center shrink-0 shadow-lg">
                          <LayoutGrid className="w-5 h-5" />
                        </div>
                        <div>
                          <h5 className="font-extrabold text-xs sm:text-sm text-amber-400 font-['Cairo']">
                            معرض شبكة القوالب التفاعلية (Full Grid Gallery)
                          </h5>
                          <p className="text-[11px] text-slate-300">
                            استعرض كافة القوالب في شبكة تكبير متكاملة مع تصنيف الفئات والبحث السريع
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsGalleryModalOpen(true)}
                        className="w-full sm:w-auto px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                      >
                        <Sparkles className="w-4 h-4" />
                        فتح المعرض الشامل
                      </button>
                    </div>

                    {/* Category Filter Pills */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700">تصفية القوالب حسب المجال:</span>
                        <span className="text-[11px] text-slate-500">
                          عرض {filteredTemplates.length} من أصل {TEMPLATE_PRESETS.length}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {templateCategories.map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setSelectedTemplateCategory(cat)}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                              selectedTemplateCategory === cat
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Grid of Mini Certificate Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {filteredTemplates.map((tmpl) => {
                        const d = tmpl.defaultData;
                        return (
                          <div
                            key={tmpl.id}
                            onClick={() => applyPresetTemplate(tmpl.id)}
                            className="p-2.5 rounded-2xl border border-slate-200 hover:border-indigo-500 cursor-pointer transition-all shadow-2xs hover:shadow-md group relative bg-white flex flex-col justify-between"
                          >
                            {/* Mini Certificate Box */}
                            <div
                              className="w-full aspect-[1.5] rounded-xl shadow-2xs relative overflow-hidden flex flex-col justify-between p-2.5 border transition-transform group-hover:scale-[1.01]"
                              style={{
                                backgroundColor: d.backgroundColor || '#ffffff',
                                color: d.textColor || '#0f172a',
                                borderColor: d.primaryColor,
                                borderWidth: '2px',
                                borderStyle: 'double',
                              }}
                            >
                              <div className="text-center space-y-0.5">
                                <span className="text-[8px] font-bold block opacity-75" style={{ color: d.secondaryColor || d.primaryColor }}>
                                  {d.schoolName}
                                </span>
                                <h6 className="text-[10px] font-black leading-tight line-clamp-1" style={{ color: d.primaryColor }}>
                                  {d.title}
                                </h6>
                              </div>

                              <div className="my-1 text-center py-1 px-1.5 bg-white/80 rounded border border-black/5">
                                <span className="text-[7px] block opacity-70">طالب التكريم:</span>
                                <span className="text-[10px] font-black block line-clamp-1" style={{ color: d.primaryColor }}>
                                  {d.studentName}
                                </span>
                              </div>

                              <div className="flex items-center justify-between text-[7px] opacity-80 pt-1 border-t border-black/10">
                                <span className="font-bold" style={{ color: d.primaryColor }}>{d.badgeTitle || 'وسام التميز'}</span>
                                <span>{tmpl.category}</span>
                              </div>
                            </div>

                            {/* Card Title & Desc */}
                            <div className="mt-2.5 px-1 flex items-center justify-between">
                              <div>
                                <h5 className="font-extrabold text-xs text-slate-800 group-hover:text-indigo-700 transition">
                                  {tmpl.name}
                                </h5>
                                <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">{tmpl.description}</p>
                              </div>

                              <span className="text-[10px] bg-slate-100 group-hover:bg-indigo-100 text-slate-700 group-hover:text-indigo-900 font-bold px-2 py-1 rounded-lg shrink-0 transition">
                                تطبيق
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* FRAME 3: SAVED DRAFTS & CUSTOM TEMPLATES IN SYSTEM */}
              <div className="bg-gradient-to-br from-amber-50/90 via-white to-amber-100/40 rounded-2xl border-2 border-amber-300/80 shadow-xs overflow-hidden transition-all">
                
                {/* Main Collapsible Header */}
                <div
                  onClick={() => setIsSavedDraftsSectionOpen(!isSavedDraftsSectionOpen)}
                  className="p-4 bg-gradient-to-r from-amber-100/90 via-amber-50/80 to-orange-100/70 hover:from-amber-200/80 hover:to-orange-200/60 transition cursor-pointer flex flex-wrap items-center justify-between gap-2.5 select-none border-b border-amber-200/70"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-xs">
                      <FolderHeart className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black text-slate-900 font-['Cairo']">
                          المسودات والقوالب الخاصة بك المحفوظة بالنظام
                        </h4>
                        <span className="text-[10px] bg-amber-200 text-amber-950 font-black px-2 py-0.5 rounded-full border border-amber-400/80 shadow-2xs">
                          {savedDraftsList.length} عنصر محفوظ
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        حفظ واسترجاع مسوداتك وقوالبك المخصصة للعودة إليها وتعديلها في أي وقت
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {onOpenDraftsModal && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenDraftsModal();
                        }}
                        className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-white/90 hover:bg-white text-slate-900 font-bold text-xs rounded-xl border border-amber-300 shadow-2xs transition cursor-pointer"
                      >
                        <Layers className="w-3.5 h-3.5 text-amber-600" />
                        <span>فتح مدير المسودات الشامل</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsSavedDraftsSectionOpen(!isSavedDraftsSectionOpen);
                      }}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>{isSavedDraftsSectionOpen ? 'طي المسودات' : 'استعراض المسودات'}</span>
                      <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isSavedDraftsSectionOpen ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Body (When Expanded) */}
                {isSavedDraftsSectionOpen && (
                  <div className="p-4 space-y-4 animate-fade-in">

                    {/* Quick Save Current Certificate Bar */}
                    <div className="bg-slate-900 p-3.5 rounded-2xl text-white space-y-2.5 shadow-md border border-slate-800">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <BookmarkCheck className="w-4 h-4 text-amber-400" />
                          <span className="text-xs font-bold text-slate-200">حفظ التصميم والبيانات الحالية بالنظام:</span>
                        </div>
                        <span className="text-[10px] text-amber-400 font-bold">
                          المستلم: {certificateData.studentName || 'مسودة'}
                        </span>
                      </div>

                      <div className="flex flex-col sm:flex-row items-stretch gap-2">
                        <input
                          type="text"
                          value={quickDraftName}
                          onChange={(e) => setQuickDraftName(e.target.value)}
                          placeholder={`اسم المسودة (افتراضي: ${certificateData.title || 'شهادة'} - ${certificateData.studentName || 'مسودة'})`}
                          className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-amber-500"
                        />
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleQuickSaveDraft('draft')}
                            className="flex-1 sm:flex-none px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow transition flex items-center justify-center gap-1 cursor-pointer"
                            title="حفظ الشهادة الحالية بالكامل كمسودة"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>حفظ كمسودة 💾</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickSaveDraft('template')}
                            className="flex-1 sm:flex-none px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-1 cursor-pointer"
                            title="حفظ تنسيق وألوان هذا التصميم كقالب لإعادة استخدامه"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>حفظ كقالب ✨</span>
                          </button>
                        </div>
                      </div>

                      {draftNotice && (
                        <div className="p-2 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-[11px] text-emerald-300 font-bold flex items-center gap-1.5 animate-fade-in">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          <span>{draftNotice}</span>
                        </div>
                      )}
                    </div>

                    {/* Saved Drafts Carousel / Grid */}
                    {savedDraftsList.length === 0 ? (
                      <div className="p-6 bg-white/80 rounded-2xl border border-dashed border-amber-300 text-center space-y-2">
                        <FolderHeart className="w-8 h-8 text-amber-500 mx-auto opacity-70" />
                        <p className="text-xs font-bold text-slate-700">لا توجد مسودات أو قوالب مخصصة محفوظة حتى الآن</p>
                        <p className="text-[11px] text-slate-500">
                          انقر على زر "حفظ كمسودة" أعلاه لحفظ هذا التصميم والرجوع له لاحقاً في أي وقت.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-700 px-1">
                          <span>المسودات والقوالب المحفوظة مؤخراً:</span>
                          {onOpenDraftsModal && (
                            <button
                              type="button"
                              onClick={onOpenDraftsModal}
                              className="text-amber-800 hover:text-amber-950 underline text-[11px] cursor-pointer"
                            >
                              إدارة الكل ({savedDraftsList.length}) ←
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-[360px] overflow-y-auto p-1">
                          {savedDraftsList.slice(0, 6).map((draft) => (
                            <div
                              key={draft.id}
                              className="p-3 bg-white rounded-xl border border-slate-200 hover:border-amber-400 hover:shadow-md transition-all flex flex-col justify-between gap-2 text-right group"
                            >
                              <div>
                                <div className="flex items-center justify-between gap-1 mb-1">
                                  <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                                    draft.type === 'template' ? 'bg-purple-100 text-purple-800' : 'bg-sky-100 text-sky-800'
                                  }`}>
                                    {draft.type === 'template' ? 'قالب مخصص' : 'مسودة'}
                                  </span>
                                  <div className="flex items-center gap-1">
                                    <div className="w-2.5 h-2.5 rounded-full border border-black/10" style={{ backgroundColor: draft.data.primaryColor }} />
                                    <div className="w-2.5 h-2.5 rounded-full border border-black/10" style={{ backgroundColor: draft.data.secondaryColor }} />
                                  </div>
                                </div>
                                <h6 className="font-bold text-xs text-slate-900 line-clamp-1 group-hover:text-amber-700">
                                  {draft.name}
                                </h6>
                                <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
                                  {draft.data.studentName || 'بدون اسم'} • {draft.data.layoutPreset || 'افتراضي'}
                                </p>
                              </div>

                              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                                <span className="text-[9px] text-slate-400 font-mono">
                                  {new Date(draft.updatedAt || draft.createdAt).toLocaleDateString('ar-SA')}
                                </span>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (window.confirm(`حذف المسودة "${draft.name}"؟`)) {
                                        deleteSavedDraft(draft.id);
                                      }
                                    }}
                                    className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                                    title="حذف"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onChange(draft.data);
                                      setDraftNotice(`تم استرجاع وتطبيق "${draft.name}" بنجاح! 🚀`);
                                      setTimeout(() => setDraftNotice(null), 3000);
                                    }}
                                    className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[10px] rounded-lg shadow-2xs transition cursor-pointer flex items-center gap-1"
                                  >
                                    <span>تطبيق</span>
                                    <ArrowRight className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>
                )}
              </div>

            </div>
          );
        })()}

        {/* TAB 3: STYLE, PALETTES & FONTS */}
        {activeTab === 'style' && (
          <div className="space-y-5">
            
            {isColorsLocked && (
              <div className="p-3 bg-amber-100/80 border border-amber-300 rounded-xl text-xs font-bold text-amber-950 flex items-center justify-between shadow-2xs">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-700" />
                  <span>تعديل الألوان مقفل حالياً بموجب إعدادات النظام وقفل العناصر</span>
                </div>
                <span className="text-[10px] bg-amber-500 text-slate-950 px-2 py-0.5 rounded font-black">مقفل 🔒</span>
              </div>
            )}

            {/* Curated Color Palettes */}
            <div className={isColorsLocked ? 'opacity-50 pointer-events-none' : ''}>
              <label className="block text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                <span>لوحات الألوان المجهزة بنقرة واحدة (Curated Palettes)</span>
                {isColorsLocked && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500 text-slate-950">
                    <Lock className="w-2.5 h-2.5" />
                    <span>مقفل</span>
                  </span>
                )}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {colorPalettes.map((p, idx) => (
                  <button
                    key={idx}
                    disabled={isColorsLocked}
                    onClick={() => {
                      onChange({
                        ...certificateData,
                        primaryColor: p.primary,
                        secondaryColor: p.secondary,
                        accentColor: p.accent,
                        backgroundColor: p.bg,
                        textColor: p.text,
                        updatedAt: new Date().toISOString()
                      });
                    }}
                    className="p-2.5 rounded-xl border border-slate-200 hover:border-amber-500 bg-white text-right transition flex flex-col gap-1.5 shadow-2xs"
                  >
                    <div className="flex items-center gap-1">
                      <span className="w-4 h-4 rounded-full border shadow-2xs" style={{ backgroundColor: p.primary }} />
                      <span className="w-4 h-4 rounded-full border shadow-2xs" style={{ backgroundColor: p.secondary }} />
                      <span className="w-4 h-4 rounded-full border shadow-2xs" style={{ backgroundColor: p.accent }} />
                      <span className="w-4 h-4 rounded-full border shadow-2xs" style={{ backgroundColor: p.bg }} />
                    </div>
                    <span className="text-[11px] font-bold text-slate-800">{p.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Color Pickers */}
            <div className={`grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-200 ${isColorsLocked ? 'opacity-50 pointer-events-none' : ''}`}>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">اللون الرئيسي</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={certificateData.primaryColor}
                    onChange={(e) => updateField('primaryColor', e.target.value)}
                    className="w-8 h-8 rounded-lg border border-slate-300 cursor-pointer p-0.5"
                  />
                  <span className="text-[10px] font-mono">{certificateData.primaryColor}</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">اللون الثانوي</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={certificateData.secondaryColor}
                    onChange={(e) => updateField('secondaryColor', e.target.value)}
                    className="w-8 h-8 rounded-lg border border-slate-300 cursor-pointer p-0.5"
                  />
                  <span className="text-[10px] font-mono">{certificateData.secondaryColor}</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">لون الخلفية</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={certificateData.backgroundColor}
                    onChange={(e) => updateField('backgroundColor', e.target.value)}
                    className="w-8 h-8 rounded-lg border border-slate-300 cursor-pointer p-0.5"
                  />
                  <span className="text-[10px] font-mono">{certificateData.backgroundColor}</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">لون النص</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={certificateData.textColor}
                    onChange={(e) => updateField('textColor', e.target.value)}
                    className="w-8 h-8 rounded-lg border border-slate-300 cursor-pointer p-0.5"
                  />
                  <span className="text-[10px] font-mono">{certificateData.textColor}</span>
                </div>
              </div>
            </div>

            {/* Luxury Background Gradients Section */}
            <div className="pt-4 border-t border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4 text-amber-600" />
                  <label className="text-xs font-bold text-slate-800">التدرجات اللونية الفاخرة للخلفية (Luxury Gradients)</label>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const currentEnabled = certificateData.bgGradient?.enabled;
                    updateField('bgGradient', {
                      ...(certificateData.bgGradient || GRADIENT_PRESETS[0].config),
                      enabled: !currentEnabled
                    });
                  }}
                  className={`text-xs px-2.5 py-1 rounded-lg font-bold border transition ${
                    certificateData.bgGradient?.enabled
                      ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                      : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {certificateData.bgGradient?.enabled ? 'التدرج مفعل ✓' : 'تفعيل التدرج'}
                </button>
              </div>

              {certificateData.bgGradient?.enabled && (
                <div className="space-y-4 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200">
                  {/* Presets Grid */}
                  <div>
                    <span className="block text-[11px] font-bold text-slate-700 mb-2">اختر نمط التدرج الفاخر (Gradient Preset):</span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {GRADIENT_PRESETS.map((preset) => {
                        const isSelected = certificateData.bgGradient?.type === preset.id;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => {
                              updateField('bgGradient', {
                                ...preset.config,
                                enabled: true
                              });
                            }}
                            className={`p-2 rounded-xl border text-right transition flex flex-col gap-1.5 shadow-2xs ${
                              isSelected
                                ? 'border-amber-500 bg-white ring-2 ring-amber-500/30'
                                : 'border-slate-200 hover:border-amber-300 bg-white'
                            }`}
                          >
                            <div
                              className="w-full h-8 rounded-lg border border-slate-300/60 shadow-inner"
                              style={{ background: preset.previewCss }}
                            />
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-slate-800 truncate">{preset.name}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Custom Gradient Fine-Tuning */}
                  <div className="pt-3 border-t border-slate-200/80 space-y-3">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                      <Sliders className="w-3.5 h-3.5 text-amber-600" />
                      <span>تخصيص ألوان وزاوية التدرج:</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 mb-1">اللون الأول</label>
                        <input
                          type="color"
                          value={certificateData.bgGradient?.color1 || '#ffffff'}
                          onChange={(e) => {
                            updateField('bgGradient', {
                              ...(certificateData.bgGradient || GRADIENT_PRESETS[0].config),
                              color1: e.target.value,
                              enabled: true
                            });
                          }}
                          className="w-full h-8 rounded-lg border border-slate-300 cursor-pointer p-0.5"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 mb-1">اللون الثاني</label>
                        <input
                          type="color"
                          value={certificateData.bgGradient?.color2 || '#fef3c7'}
                          onChange={(e) => {
                            updateField('bgGradient', {
                              ...(certificateData.bgGradient || GRADIENT_PRESETS[0].config),
                              color2: e.target.value,
                              enabled: true
                            });
                          }}
                          className="w-full h-8 rounded-lg border border-slate-300 cursor-pointer p-0.5"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 mb-1">اللون الثالث (اختياري)</label>
                        <input
                          type="color"
                          value={certificateData.bgGradient?.color3 || '#fde68a'}
                          onChange={(e) => {
                            updateField('bgGradient', {
                              ...(certificateData.bgGradient || GRADIENT_PRESETS[0].config),
                              color3: e.target.value,
                              enabled: true
                            });
                          }}
                          className="w-full h-8 rounded-lg border border-slate-300 cursor-pointer p-0.5"
                        />
                      </div>
                    </div>

                    {/* Gradient Angle Slider */}
                    {certificateData.bgGradient?.type !== 'radial-center' && certificateData.bgGradient?.type !== 'royal-mesh' && (
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-[10px] font-bold text-slate-700">زاوية التدرج (Angle):</label>
                          <span className="text-[10px] font-mono font-bold text-amber-700">
                            {certificateData.bgGradient?.angle ?? 135}°
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="360"
                          step="5"
                          value={certificateData.bgGradient?.angle ?? 135}
                          onChange={(e) => {
                            updateField('bgGradient', {
                              ...(certificateData.bgGradient || GRADIENT_PRESETS[0].config),
                              angle: parseInt(e.target.value, 10),
                              enabled: true
                            });
                          }}
                          className="w-full accent-amber-500 cursor-pointer"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Background Textures, Custom Image Upload, & AI Auto-Tune */}
            <div className="pt-4 border-t border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-amber-600" />
                  <label className="text-xs font-bold text-slate-800">خلفية الشهادة والصور المخصصة</label>
                </div>
                {(certificateData.bgImageUrl || certificateData.bgTextureUrl) && (
                  <button
                    type="button"
                    onClick={() => onChange({
                      ...certificateData,
                      bgImageUrl: undefined,
                      bgTextureUrl: undefined,
                      updatedAt: new Date().toISOString()
                    })}
                    className="text-[11px] px-2 py-0.5 text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-md font-bold transition flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" /> إزالة خلفية الصورة
                  </button>
                )}
              </div>

              {/* Custom Image Upload & AI Tuning Banner */}
              <div className="p-3 bg-gradient-to-br from-amber-50/70 via-slate-50 to-amber-100/40 border border-amber-200/90 rounded-2xl space-y-3 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Upload className="w-4 h-4 text-amber-600" />
                      رفع صورة خلفية مخصصة من جهازك
                    </h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">يمكنك رفع صورة شهادة فارغة أو خلفية خاصة بمؤسستك/مدرستك</p>
                  </div>
                  <label className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold cursor-pointer transition shadow-2xs shrink-0">
                    <span>اختر صورة...</span>
                    <input type="file" accept="image/*" onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          const url = ev.target?.result as string;
                          onChange({
                            ...certificateData,
                            bgImageUrl: url,
                            bgTextureUrl: url,
                            bgOpacity: 1.0,
                            updatedAt: new Date().toISOString()
                          });
                        };
                        reader.readAsDataURL(file);
                      }
                    }} className="hidden" />
                  </label>
                </div>

                {/* Active Background Preview & AI Auto-Tune Trigger */}
                {(certificateData.bgImageUrl || certificateData.bgTextureUrl) && (
                  <div className="pt-2 border-t border-amber-200/60 space-y-2.5">
                    <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-amber-200">
                      <div className="w-14 h-10 rounded-lg border border-slate-200 overflow-hidden bg-slate-100 shrink-0">
                        <img
                          src={certificateData.bgImageUrl || certificateData.bgTextureUrl}
                          alt="خلفية الشهادة"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-bold text-slate-800 block truncate">الصورة المرفوعة نشطة</span>
                        <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 inline-block mt-0.5">
                          جاهزة للضبط التلقائي بالذكاء الاصطناعي
                        </span>
                      </div>
                    </div>

                    {/* ✨ AI Auto-Tune Button */}
                    <button
                      type="button"
                      disabled={isAiTuningBg}
                      onClick={handleAiTuneBackground}
                      className="w-full p-2.5 bg-gradient-to-r from-amber-600 via-amber-700 to-yellow-600 hover:from-amber-700 hover:to-yellow-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2"
                    >
                      <Sparkles className={`w-4 h-4 text-yellow-200 ${isAiTuningBg ? 'animate-spin' : 'animate-bounce'}`} />
                      <span>
                        {isAiTuningBg
                          ? 'جاري ضبط ألوان وعبارات الشهادة بالذكاء الاصطناعي...'
                          : '✨ ضبط العبارات والألوان بالذكاء الاصطناعي على الصورة المرفوعة'}
                      </span>
                    </button>

                    {aiTuneStatus && (
                      <div className="p-2 bg-amber-100 text-amber-950 text-[11px] font-bold rounded-lg border border-amber-300 text-center animate-pulse">
                        {aiTuneStatus}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Background Preset Textures Library */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-bold text-slate-800">✨ اختر من مكتبة الخلفيات والنقوش الفاخرة:</label>
                  <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/80">
                    {BACKGROUND_TEXTURES.length} نقش وتصميم
                  </span>
                </div>

                {/* Categories Filter Bar */}
                <div className="flex flex-wrap items-center gap-1.5 py-1 text-xs">
                  {['الكل', 'زخارف إسلامية', 'كلاسيكي وورق', 'ملكي وفاخر', 'رخام وذهب', 'حديث وأمني'].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedBgCategory(cat)}
                      className={`px-2.5 py-1 rounded-lg font-bold text-[10px] whitespace-nowrap transition-all shadow-2xs ${
                        selectedBgCategory === cat
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Grid of Background Textures */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 max-h-[280px] overflow-y-auto p-1 border border-slate-100 rounded-xl bg-slate-50/50">
                  {BACKGROUND_TEXTURES.filter(t => selectedBgCategory === 'الكل' || t.category === selectedBgCategory).map((tex) => {
                    const isSelected = certificateData.bgTextureUrl === tex.url || certificateData.bgImageUrl === tex.url;
                    return (
                      <button
                        key={tex.id}
                        type="button"
                        onClick={() => onChange({
                          ...certificateData,
                          bgTextureUrl: tex.url,
                          bgImageUrl: tex.url,
                          updatedAt: new Date().toISOString()
                        })}
                        className={`p-2 rounded-xl border text-right transition flex flex-col gap-1 shadow-2xs group relative ${
                          isSelected
                            ? 'border-amber-500 bg-amber-50/90 ring-2 ring-amber-500/30'
                            : 'border-slate-200 hover:border-amber-400 bg-white'
                        }`}
                      >
                        <div
                          className={`w-full h-12 rounded-lg bg-gradient-to-r ${tex.previewGradient} border border-slate-200/80 flex items-center justify-center relative overflow-hidden transition-transform group-hover:scale-[1.02]`}
                        >
                          <div
                            className="absolute inset-0 opacity-50 bg-repeat"
                            style={{ backgroundImage: `url("${tex.url}")` }}
                          />
                          {isSelected && (
                            <div className="bg-amber-600 text-white p-1 rounded-full shadow-md relative z-10">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col min-w-0 mt-0.5">
                          <span className="text-[10px] font-bold text-slate-800 truncate block">{tex.name}</span>
                          <span className="text-[8px] text-slate-500 font-semibold truncate block">{tex.category}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Background Adjustments (Opacity, Blur, Card Backing) */}
              {(certificateData.bgImageUrl || certificateData.bgTextureUrl) && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div className="text-[11px] font-bold text-slate-800 border-b border-slate-200 pb-1 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-amber-600" />
                    ضبط الشفافية والوضوح لخلفية الصورة
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="flex justify-between text-[10px] font-bold text-slate-600 mb-1">
                        <span>شفافية الصورة</span>
                        <span>{Math.round((certificateData.bgOpacity ?? 1) * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="1.0"
                        step="0.05"
                        value={certificateData.bgOpacity ?? 1}
                        onChange={(e) => updateField('bgOpacity', parseFloat(e.target.value))}
                        className="w-full accent-amber-600"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[10px] font-bold text-slate-600 mb-1">
                        <span>نعومة الصورة (Blur)</span>
                        <span>{certificateData.bgBlur ?? 0}px</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="12"
                        step="1"
                        value={certificateData.bgBlur ?? 0}
                        onChange={(e) => updateField('bgBlur', parseInt(e.target.value))}
                        className="w-full accent-amber-600"
                      />
                    </div>
                  </div>

                  {/* Card Backing toggle */}
                  <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-800">
                        <input
                          type="checkbox"
                          checked={certificateData.bgCardBacking ?? false}
                          onChange={(e) => updateField('bgCardBacking', e.target.checked)}
                          className="accent-amber-600 rounded w-4 h-4"
                        />
                        إضافة حاوية شفافة خلف النصوص لزيادة وضوح الخط
                      </label>
                      <p className="text-[10px] text-slate-500 mr-5">يضمن مقروئية العبارات إذا كانت خلفية الصورة مزدحمة بالتفاصيل</p>
                    </div>

                    {certificateData.bgCardBacking && (
                      <div className="w-full sm:w-28 shrink-0">
                        <span className="text-[10px] font-bold text-slate-600 block text-left">
                          الشفافية: {Math.round((certificateData.bgCardOpacity ?? 0.82) * 100)}%
                        </span>
                        <input
                          type="range"
                          min="0.2"
                          max="0.95"
                          step="0.05"
                          value={certificateData.bgCardOpacity ?? 0.82}
                          onChange={(e) => updateField('bgCardOpacity', parseFloat(e.target.value))}
                          className="w-full accent-amber-600"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 1. Main Certificate Typography & Font Size */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span>📜</span>
                    <span>خط وحجم عبارات الشهادة الرئيسية</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    يتحكم بنص الشكر والتقدير، اسم الطالب/المكرم، والعناوين دون المساس بالترويسة.
                  </p>
                </div>
                <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  🔒 الترويسة محمية
                </span>
              </div>

              {/* Font Family Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">نوع الخط العربي للشهادة</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {fonts.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => updateField('fontFamily', f.id)}
                      className={`p-2.5 rounded-xl border text-right transition flex flex-col justify-between cursor-pointer ${
                        certificateData.fontFamily === f.id
                          ? 'border-amber-500 bg-amber-50/80 ring-1 ring-amber-500'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <span className="text-xs font-bold text-slate-900">{f.label}</span>
                      <span className="text-sm mt-1 text-amber-900 font-medium" style={{ fontFamily: f.id }}>
                        {f.sample}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Main Font Size Scale */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-slate-700">مقياس حجم خط عبارات الشهادة</label>
                  <span className="text-xs font-mono font-bold text-amber-700">{Math.round(certificateData.fontSizeScale * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.8"
                  max="1.3"
                  step="0.05"
                  value={certificateData.fontSizeScale}
                  onChange={(e) => updateField('fontSizeScale', parseFloat(e.target.value))}
                  className="w-full accent-amber-500"
                />
              </div>
            </div>

            {/* 2. Top Header Typography & Font Size (Independent) */}
            <div className="bg-amber-50/50 border border-amber-200 rounded-2xl p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-amber-200/60">
                <div>
                  <h4 className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                    <span>🏛️</span>
                    <span>خط وحجم الترويسة العلوية (منفصل تماماً)</span>
                  </h4>
                  <p className="text-[11px] text-amber-800/90 mt-0.5">
                    يتحكم بخط وحجم ترويسة الوزارة، الإدارة، وتفاصيل المدرسة والشهادة بشكل مستقل.
                  </p>
                </div>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  ✨ مستقل
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Header Font Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">نوع خط الترويسة العلوية</label>
                  <select
                    value={certificateData.headerFontFamily || 'Cairo'}
                    onChange={(e) => updateField('headerFontFamily', e.target.value as FontOption)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="Cairo">خط القاهرة المعاصر (Cairo)</option>
                    <option value="Amiri">الخط الأميري الأصيل (Amiri)</option>
                    <option value="Tajawal">خط تجول الحديث (Tajawal)</option>
                    <option value="Almarai">خط المراعي (Almarai)</option>
                    <option value="Aref Ruqaa">خط الرقعة العربي (Aref Ruqaa)</option>
                    <option value="Reem Kufi">الخط الكوفي الحديث (Reem Kufi)</option>
                    <option value="El Messiri">خط الخاطر والجمال (El Messiri)</option>
                    <option value="Changa">خط الشانغا (Changa)</option>
                    <option value="Scheherazade New">خط شهرزاد النسخي (Scheherazade)</option>
                    <option value="Vazirmatn">خط وزير (Vazirmatn)</option>
                  </select>
                </div>

                {/* Header Size Scale */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-slate-800">مقياس حجم خط الترويسة</label>
                    <span className="text-xs font-mono font-bold text-amber-800">{Math.round((certificateData.headerFontSizeScale ?? 1.0) * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.7"
                    max="1.5"
                    step="0.05"
                    value={certificateData.headerFontSizeScale ?? 1.0}
                    onChange={(e) => updateField('headerFontSizeScale', parseFloat(e.target.value))}
                    className="w-full accent-amber-600"
                  />
                  <div className="flex justify-between gap-1 mt-1.5">
                    {[
                      { label: '80%', val: 0.8 },
                      { label: '100%', val: 1.0 },
                      { label: '120%', val: 1.2 },
                      { label: '140%', val: 1.4 },
                    ].map((preset) => (
                      <button
                        key={preset.val}
                        type="button"
                        onClick={() => updateField('headerFontSizeScale', preset.val)}
                        className={`flex-1 py-1 text-[10px] font-bold rounded-lg border transition cursor-pointer ${
                          Math.abs((certificateData.headerFontSizeScale ?? 1.0) - preset.val) < 0.02
                            ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-amber-100/50'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* TAB 4: DIGITAL SIGNATURES */}
        {activeTab === 'signatures' && (
          <div className="space-y-4">
            
            {isSignaturesLocked && (
              <div className="p-3 bg-amber-100/80 border border-amber-300 rounded-xl text-xs font-bold text-amber-950 flex items-center justify-between shadow-2xs">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-700" />
                  <span>تعديل وإضافة التوقيعات مقفل حالياً بموجب إعدادات النظام</span>
                </div>
                <span className="text-[10px] bg-amber-500 text-slate-950 px-2 py-0.5 rounded font-black">مقفل 🔒</span>
              </div>
            )}

            <div className={`bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center justify-between gap-3 ${isSignaturesLocked ? 'opacity-70' : ''}`}>
              <div>
                <h4 className="text-xs font-bold text-amber-900 flex items-center gap-1.5 font-['Cairo']">
                  <PenTool className="w-4 h-4 text-amber-600" />
                  <span>التوقيعات الرقمية المعتمدة</span>
                  {isSignaturesLocked && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500 text-slate-950">
                      <Lock className="w-2.5 h-2.5" />
                      <span>مقفل</span>
                    </span>
                  )}
                </h4>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  يمكن للمسؤولين والتنفيذيين توقيع الشهادات إلكترونياً (رسم، خط، أو صورة رسمية).
                </p>
              </div>
              <button
                disabled={isSignaturesLocked}
                onClick={() => {
                  setEditingSignature(null);
                  setIsSignatureModalOpen(true);
                }}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-lg transition shadow-2xs flex items-center gap-1 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-3.5 h-3.5" /> إضافة توقيع جديد
              </button>
            </div>

            {/* Current Signatures List */}
            <div className={`space-y-2 ${isSignaturesLocked ? 'pointer-events-none opacity-60' : ''}`}>
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-bold text-slate-700">التوقيعات الحالية في هذه الشهادة ({certificateData.signatures?.length || 0}):</span>
                <span className="text-[10px] text-slate-500">يمكنك إخفاء أو إعادة ترتيب أو نقل كل توقيع</span>
              </div>
              {(!certificateData.signatures || certificateData.signatures.length === 0) ? (
                <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-500">
                  لا توجد توقيعات مضافة حالياً. اضغط على زر "إضافة توقيع جديد" للبدء.
                </div>
              ) : (
                certificateData.signatures.map((sig, idx) => (
                  <div
                    key={sig.id}
                    className={`p-3 rounded-xl border transition flex items-center justify-between gap-2 ${
                      sig.show !== false
                        ? 'bg-slate-50 border-slate-200 shadow-2xs'
                        : 'bg-slate-100/70 border-slate-200/70 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {/* Reorder Buttons */}
                      <div className="flex flex-col gap-0.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => moveSignatureOrder(idx, 'up')}
                          disabled={idx === 0}
                          className="p-1 rounded bg-white hover:bg-amber-100 text-slate-600 disabled:opacity-30 disabled:hover:bg-white border border-slate-200 transition"
                          title="تحريك التوقيع للأمام / للأعلى"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveSignatureOrder(idx, 'down')}
                          disabled={idx === (certificateData.signatures.length - 1)}
                          className="p-1 rounded bg-white hover:bg-amber-100 text-slate-600 disabled:opacity-30 disabled:hover:bg-white border border-slate-200 transition"
                          title="تحريك التوقيع للخلف / للأسفل"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Type Badge */}
                      <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-900 font-extrabold flex items-center justify-center text-[11px] shrink-0">
                        {sig.type === 'draw' ? 'رسم' : sig.type === 'upload' ? 'صورة' : 'خط'}
                      </div>

                      {/* Signature Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h5 className="font-bold text-xs text-slate-800 truncate">{sig.name || 'بدون اسم'}</h5>
                          {sig.show === false && (
                            <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.2 rounded font-semibold">مخفي</span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">{sig.title || 'المسمى الوظيفي'}</p>
                      </div>
                    </div>

                    {/* Actions: Visibility Toggle, Save to Library, Edit, Delete */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => toggleSignatureVisibility(sig.id)}
                        className={`p-1.5 rounded-lg border transition ${
                          sig.show !== false
                            ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                            : 'bg-slate-200 text-slate-500 border-slate-300 hover:bg-slate-300'
                        }`}
                        title={sig.show !== false ? 'إخفاء هذا التوقيع من الشهادة' : 'إظهار هذا التوقيع في الشهادة'}
                      >
                        {sig.show !== false ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          saveSignaturePresetToLibrary(sig);
                          onChange({ ...certificateData, updatedAt: new Date().toISOString() });
                        }}
                        className="p-1.5 rounded-lg bg-white hover:bg-amber-50 text-amber-600 border border-slate-200 transition"
                        title="حفظ هذا التوقيع في مكتبة التوقيعات الدائمة للرجوع له لاحقاً"
                      >
                        <BookmarkCheck className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setEditingSignature(sig);
                          setIsSignatureModalOpen(true);
                        }}
                        className="px-2.5 py-1 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition"
                      >
                        تعديل
                      </button>

                      <button
                        type="button"
                        onClick={() => removeSignature(sig.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="حذف التوقيع من هذه الشهادة"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Saved Signature Presets Library */}
            {(() => {
              const presets = getSavedSignaturePresets();
              if (presets.length === 0) return null;
              return (
                <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                      <BookmarkCheck className="w-3.5 h-3.5 text-amber-600" />
                      مكتبة التوقيعات المحفوظة ({presets.length})
                    </span>
                    <span className="text-[10px] text-amber-700">توقيعات جاهزة يمكنك استخدامها بنقرة واحدة</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-44 overflow-y-auto">
                    {presets.map((preset) => (
                      <div
                        key={preset.id}
                        className="p-2 bg-white rounded-lg border border-amber-200/70 flex items-center justify-between gap-1 shadow-2xs hover:border-amber-400 transition"
                      >
                        <div className="min-w-0 flex-1">
                          <h6 className="text-[11px] font-bold text-slate-800 truncate">{preset.name}</h6>
                          <p className="text-[10px] text-slate-500 truncate">{preset.title}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => addPresetSignatureToCertificate(preset)}
                            className="px-2 py-0.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-[10px] rounded transition flex items-center gap-0.5"
                            title="إدراج التوقيع في الشهادة الحالية"
                          >
                            <Plus className="w-3 h-3" />
                            إدراج
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteSignaturePresetFromLibrary(preset.id)}
                            className="p-1 text-slate-400 hover:text-red-500 rounded transition"
                            title="حذف من المكتبة المحفوظة"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Signatures Block Position Control */}
            <OffsetPad
              title="كتلة التوقيعات المعتمدة"
              subtitle="تحريك شريط التوقيعات بالكامل أفقياً ورأسياً"
              offsetX={certificateData.signaturesBlockOffsetX || 0}
              offsetY={certificateData.signaturesBlockOffsetY || 0}
              onChangeX={(val) => updateField('signaturesBlockOffsetX', val)}
              onChangeY={(val) => updateField('signaturesBlockOffsetY', val)}
              onReset={() => onChange({ ...certificateData, signaturesBlockOffsetX: 0, signaturesBlockOffsetY: 0, updatedAt: new Date().toISOString() })}
            />

          </div>
        )}

        {/* TAB 5: FRAME, LOGO & BACKGROUND */}
        {activeTab === 'frame' && (
          <div className="space-y-4">
            
            {/* Custom Logo Upload & Comprehensive Customization */}
            {/* Logo Customization Box */}
            <div className={`p-3.5 bg-slate-50 rounded-xl border space-y-3.5 ${isLogoLocked ? 'border-amber-400 bg-amber-50/40' : 'border-slate-200'}`}>
              <div className="flex items-center justify-between border-b pb-2 border-slate-200">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-amber-600" />
                  <span>شعار المؤسسة / المدرسة (Logo)</span>
                  {isLogoLocked && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500 text-slate-950">
                      <Lock className="w-2.5 h-2.5" />
                      <span>مقفل</span>
                    </span>
                  )}
                </span>
                {certificateData.logoUrl && !isLogoLocked && (
                  <button
                    onClick={() => updateField('logoUrl', undefined)}
                    className="text-[11px] text-red-600 hover:text-red-700 font-bold flex items-center gap-1 bg-red-50 px-2 py-0.5 rounded border border-red-200"
                  >
                    <Trash2 className="w-3 h-3" />
                    حذف الشعار
                  </button>
                )}
              </div>

              <div className={`flex items-center gap-3 ${isLogoLocked ? 'pointer-events-none opacity-60' : ''}`}>
                {certificateData.logoUrl ? (
                  <div className="relative group">
                    <img
                      src={certificateData.logoUrl}
                      alt="Logo"
                      className="w-16 h-16 object-contain bg-white rounded-lg p-1 border border-slate-300 shadow-xs"
                    />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-amber-50/80 border border-dashed border-amber-300 flex items-center justify-center text-amber-800 text-[10px] font-bold text-center p-1">
                    لا يوجد شعار
                  </div>
                )}

                <label className={`flex-1 px-3 py-2.5 bg-amber-600 text-white rounded-xl text-xs font-bold hover:bg-amber-700 cursor-pointer text-center flex items-center justify-center gap-2 shadow-xs transition ${isLogoLocked ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <Upload className="w-4 h-4" />
                  رفع الشعار من الجهاز
                  <input type="file" accept="image/*" onChange={handleLogoUpload} disabled={isLogoLocked} className="hidden" />
                </label>
              </div>

              {/* Status / Notice Alert for Logo Actions */}
              {logoActionNotice && (
                <div className="p-2 bg-amber-50 text-amber-900 text-xs font-medium rounded-lg border border-amber-200 flex items-center gap-2 animate-fadeIn">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>{logoActionNotice}</span>
                </div>
              )}

              {/* Advanced Logo Customization Toolbar */}
              {certificateData.logoUrl && (
                <div className="space-y-3 pt-3 border-t border-slate-200">

                  {/* 1. Quick Image Action Buttons: Crop & Remove Background */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-700 block">أدوات تعديل واستخلاص الصورة:</span>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setIsLogoCropModalOpen(true)}
                        className="px-2 py-1.5 bg-white hover:bg-slate-100 text-slate-800 rounded-lg text-[11px] font-bold border border-slate-300 flex items-center justify-center gap-1 transition shadow-2xs cursor-pointer"
                        title="اقتطاع واقتصاص الجزء المطلوب من الشعار"
                      >
                        <Crop className="w-3.5 h-3.5 text-amber-600" />
                        <span>اقتصاص</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleMakeLogoBgTransparent}
                        className="px-2 py-1.5 bg-white hover:bg-slate-100 text-slate-800 rounded-lg text-[11px] font-bold border border-slate-300 flex items-center justify-center gap-1 transition shadow-2xs cursor-pointer"
                        title="تحويل الألوان البيضاء في خلفية الشعار لشفافة"
                      >
                        <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                        <span>خلفية شفافة</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleRemoveLogoBgAi}
                        disabled={isAiRemovingLogoBg}
                        className="px-2 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-lg text-[11px] font-bold border border-amber-600 flex items-center justify-center gap-1 transition shadow-2xs disabled:opacity-50 cursor-pointer"
                        title="حذف خلفية الشعار بالذكاء الاصطناعي"
                      >
                        <Sparkles className={`w-3.5 h-3.5 text-amber-200 ${isAiRemovingLogoBg ? 'animate-spin' : ''}`} />
                        <span>حذف ذكي</span>
                      </button>
                    </div>
                  </div>

                  {/* 2. Logo Size (Presets + Custom Pixel Slider) */}
                  <div className="space-y-2 bg-white p-2.5 rounded-lg border border-slate-200">
                    <div className="flex items-center justify-between flex-wrap gap-1">
                      <span className="text-[11px] font-bold text-slate-700">حجم الشعار:</span>
                      <div className="flex flex-wrap gap-1">
                        {[
                          { id: 'sm', label: 'صغير (36px)', px: 36 },
                          { id: 'md', label: 'متوسط (48px)', px: 48 },
                          { id: 'lg', label: 'كبير (64px)', px: 64 },
                          { id: 'xl', label: 'كبير جداً (80px)', px: 80 },
                          { id: '2xl', label: 'ضخم (110px)', px: 110 },
                          { id: '3xl', label: 'عملاق (150px)', px: 150 },
                        ].map((sz) => (
                          <button
                            key={sz.id}
                            type="button"
                            onClick={() => onChange({
                              ...certificateData,
                              logoSize: (sz.id === '2xl' || sz.id === '3xl') ? 'xl' : (sz.id as any),
                              logoSizePx: sz.px,
                              updatedAt: new Date().toISOString()
                            })}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition ${
                              certificateData.logoSizePx === sz.px || (!certificateData.logoSizePx && (certificateData.logoSize || 'md') === sz.id)
                                ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-2xs'
                                : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                            }`}
                          >
                            {sz.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="pt-1 bg-slate-50/80 p-2 rounded-lg border border-slate-200/80 space-y-1.5">
                      <div className="flex justify-between items-center text-[10px] font-bold text-slate-700">
                        <span>تكبير وتصغير دقيق بالبكسل:</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => updateField('logoSizePx', Math.max(20, (certificateData.logoSizePx || 48) - 5))}
                            className="w-5 h-5 bg-white border border-slate-300 rounded font-bold text-slate-700 hover:bg-amber-50 flex items-center justify-center text-xs"
                            title="تصغير 5 بكسل"
                          >
                            -
                          </button>
                          <span className="font-mono font-bold text-amber-900 bg-amber-100/90 px-2 py-0.5 rounded border border-amber-300">
                            {certificateData.logoSizePx || 48}px
                          </span>
                          <button
                            type="button"
                            onClick={() => updateField('logoSizePx', Math.min(280, (certificateData.logoSizePx || 48) + 5))}
                            className="w-5 h-5 bg-white border border-slate-300 rounded font-bold text-slate-700 hover:bg-amber-50 flex items-center justify-center text-xs"
                            title="تكبير 5 بكسل"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <input
                        type="range"
                        min="20"
                        max="280"
                        step="2"
                        value={certificateData.logoSizePx || 48}
                        onChange={(e) => updateField('logoSizePx', parseInt(e.target.value))}
                        className="w-full accent-amber-600 cursor-pointer h-2"
                      />
                      <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                        <span>20px (أصغر مقاس)</span>
                        <span>140px</span>
                        <span>280px (أكبر مقاس)</span>
                      </div>
                    </div>
                  </div>

                  {/* 3. Logo Position & Offset Movement */}
                  <OffsetPad
                    title="موقع الشعار"
                    subtitle="إزاحة الشعار أفقياً وعمودياً مع تحريك دقيق"
                    offsetX={certificateData.logoOffsetX || 0}
                    offsetY={certificateData.logoOffsetY || 0}
                    min={-150}
                    max={150}
                    onChangeX={(val) => updateField('logoOffsetX', val)}
                    onChangeY={(val) => updateField('logoOffsetY', val)}
                    onReset={() => onChange({
                      ...certificateData,
                      logoOffsetX: 0,
                      logoOffsetY: 0,
                      updatedAt: new Date().toISOString()
                    })}
                  />

                  {/* 4. Shape, Background Mode & Rotation */}
                  <div className="space-y-2 bg-white p-2.5 rounded-lg border border-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-700">شكل الإطار:</span>
                      <div className="flex gap-1">
                        {[
                          { id: 'circle', label: 'دائري' },
                          { id: 'rounded', label: 'منحني' },
                          { id: 'square', label: 'مربع' },
                          { id: 'none', label: 'شفاف' }
                        ].map((sh) => (
                          <button
                            key={sh.id}
                            type="button"
                            onClick={() => updateField('logoShape', sh.id as any)}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              (certificateData.logoShape || 'circle') === sh.id
                                ? 'bg-amber-500 text-slate-950 border-amber-600'
                                : 'bg-slate-50 text-slate-700 border-slate-300'
                            }`}
                          >
                            {sh.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                      <span className="text-[11px] font-bold text-slate-700">تعبئة الخلفية:</span>
                      <div className="flex gap-1">
                        {[
                          { id: 'white', label: 'أبيض' },
                          { id: 'transparent', label: 'شفاف' },
                          { id: 'dark', label: 'داكن' }
                        ].map((bg) => (
                          <button
                            key={bg.id}
                            type="button"
                            onClick={() => updateField('logoBgMode', bg.id as any)}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              (certificateData.logoBgMode || 'white') === bg.id
                                ? 'bg-amber-500 text-slate-950 border-amber-600'
                                : 'bg-slate-50 text-slate-700 border-slate-300'
                            }`}
                          >
                            {bg.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                      <div>
                        <div className="flex justify-between text-[10px] font-bold text-slate-600 mb-1">
                          <span>تدوير الشعار:</span>
                          <span className="font-mono">{certificateData.logoRotation || 0}°</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="360"
                          value={certificateData.logoRotation || 0}
                          onChange={(e) => updateField('logoRotation', parseInt(e.target.value))}
                          className="w-full accent-amber-600 cursor-pointer"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-[10px] font-bold text-slate-600 mb-1">
                          <span>الشفافية:</span>
                          <span className="font-mono">{Math.round((certificateData.logoOpacity ?? 1) * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0.1"
                          max="1.0"
                          step="0.05"
                          value={certificateData.logoOpacity ?? 1}
                          onChange={(e) => updateField('logoOpacity', parseFloat(e.target.value))}
                          className="w-full accent-amber-600 cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Logo Text Offset Controls */}
                    <OffsetPad
                      title="تحريك الكتابة داخل الشعار"
                      subtitle="تحريك حرف/نص الشعار أفقياً ورأسياً"
                      offsetX={certificateData.logoTextOffsetX || 0}
                      offsetY={certificateData.logoTextOffsetY || 0}
                      onChangeX={(val) => updateField('logoTextOffsetX', val)}
                      onChangeY={(val) => updateField('logoTextOffsetY', val)}
                      onReset={() => onChange({ ...certificateData, logoTextOffsetX: 0, logoTextOffsetY: 0, updatedAt: new Date().toISOString() })}
                    />
                  </div>

                </div>
              )}
            </div>

            {/* Custom Uploaded Frame Section */}
            <div className="p-3.5 bg-gradient-to-r from-amber-50/90 to-slate-50 rounded-xl border border-amber-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-bold text-amber-950">إطار مخصص من الجهاز (Custom Frame)</span>
                </div>
                {certificateData.customFrameUrl && (
                  <button
                    onClick={() => updateField('customFrameUrl', undefined)}
                    className="text-[11px] text-red-600 hover:text-red-700 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    إلغاء الإطار المخصص
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                {certificateData.customFrameUrl ? (
                  <div className="relative w-16 h-12 rounded-lg border-2 border-amber-500 overflow-hidden bg-white shadow-xs">
                    <img src={certificateData.customFrameUrl} alt="Custom Frame" className="w-full h-full object-contain" />
                  </div>
                ) : (
                  <div className="w-16 h-12 rounded-lg bg-amber-50/50 border border-dashed border-amber-300 flex items-center justify-center text-amber-700 text-[9px] font-bold text-center p-1">
                    لا يوجد إطار مرفوع
                  </div>
                )}

                <label className="flex-1 px-3 py-2 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700 cursor-pointer text-center flex items-center justify-center gap-2 shadow-xs transition">
                  <Upload className="w-4 h-4" />
                  رفع صورة إطار (PNG / SVG)
                  <input type="file" accept="image/*" onChange={handleCustomFrameUpload} className="hidden" />
                </label>
              </div>

              {certificateData.customFrameUrl && (
                <div className="pt-2 border-t border-amber-200/60 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">شفافية الإطار المخصص:</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.05"
                      value={certificateData.customFrameOpacity ?? 1}
                      onChange={(e) => updateField('customFrameOpacity', parseFloat(e.target.value))}
                      className="w-28 accent-amber-600 cursor-pointer"
                    />
                    <span className="font-mono text-[11px] font-bold text-slate-600 w-8 text-left">
                      {Math.round((certificateData.customFrameOpacity ?? 1) * 100)}%
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Frame Styles & Border Controls */}
            <div className="space-y-6">
              {isFrameLocked && (
                <div className="p-3 bg-amber-100/80 border border-amber-300 rounded-xl text-xs font-bold text-amber-950 flex items-center justify-between shadow-2xs">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-amber-700" />
                    <span>تعديل الإطارات وهوامش الإطار مقفل حالياً بموجب إعدادات النظام</span>
                  </div>
                  <span className="text-[10px] bg-amber-500 text-slate-950 px-2 py-0.5 rounded font-black">مقفل 🔒</span>
                </div>
              )}

              <div className={isFrameLocked ? 'pointer-events-none opacity-60' : ''}>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span>مكتبة الإطارات المزخرفة (Border Presets)</span>
                    {isFrameLocked && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500 text-slate-950">
                        <Lock className="w-2.5 h-2.5" />
                        <span>مقفل</span>
                      </span>
                    )}
                  </label>
                  <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 font-bold">
                    {frames.length} نمط متوفر
                  </span>
                </div>

                {/* Categories */}
                <div className="flex flex-wrap items-center gap-1.5 mb-3">
                  {['الكل', 'ملكي', 'إسلامي', 'كلاسيكي', 'حديث'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedFrameCategory(cat)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                        selectedFrameCategory === cat
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Presets Grid with Mini Visual Frame Thumbnails */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-80 overflow-y-auto p-1 border border-slate-100 rounded-xl bg-slate-50/50">
                  {frames
                    .filter((fr) => selectedFrameCategory === 'الكل' || fr.category === selectedFrameCategory)
                    .map((fr) => {
                      const isSelected = certificateData.frameStyle === fr.id && !certificateData.customFrameUrl;
                      return (
                        <button
                          key={fr.id}
                          onClick={() => {
                            onChange({
                              ...certificateData,
                              frameStyle: fr.id,
                              customFrameUrl: undefined, // Switch back to preset frame
                              updatedAt: new Date().toISOString()
                            });
                          }}
                          className={`p-2 rounded-xl border text-right transition flex flex-col justify-between relative group cursor-pointer ${
                            isSelected
                              ? 'border-amber-500 bg-amber-50/90 text-amber-950 ring-2 ring-amber-500/20 shadow-xs'
                              : 'border-slate-200 hover:border-slate-300 bg-white text-slate-800'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-xs bg-slate-100 text-slate-600">
                                {fr.category}
                              </span>
                              {isSelected && (
                                <span className="w-2 h-2 rounded-full bg-amber-500 ring-2 ring-amber-200" />
                              )}
                            </div>

                            {/* Mini Frame Preview Thumbnail */}
                            <FramePreviewThumbnail
                              frameStyle={fr.id}
                              primaryColor={certificateData.borderColor || certificateData.primaryColor || '#d97706'}
                              secondaryColor={certificateData.borderSecondaryColor || certificateData.secondaryColor || '#f59e0b'}
                            />

                            <div className="text-xs font-bold leading-tight mb-0.5">{fr.label}</div>
                            <div className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed">{fr.description}</div>
                          </div>
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* Independent Border Controls */}
              <div className="p-3.5 rounded-xl bg-amber-50/40 border border-amber-200/60 space-y-4">
                <div className="flex items-center justify-between border-b border-amber-200/60 pb-2">
                  <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                    <Palette className="w-4 h-4 text-amber-600" />
                    التحكم المستقل بألوان وسمك الإطار
                  </span>
                  <button
                    onClick={() => onChange({
                      ...certificateData,
                      borderColor: undefined,
                      borderSecondaryColor: undefined,
                      borderWidth: 2,
                      borderPadding: 12,
                      updatedAt: new Date().toISOString()
                    })}
                    className="text-[11px] font-bold text-amber-700 hover:text-amber-900 underline"
                  >
                    إعادة ضبط الإطار
                  </button>
                </div>

                {/* Color pickers */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      لون الإطار الأساسي
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={certificateData.borderColor || certificateData.primaryColor || '#d97706'}
                        onChange={(e) => updateField('borderColor', e.target.value)}
                        className="w-8 h-8 rounded-lg cursor-pointer border border-slate-300 p-0.5"
                      />
                      <input
                        type="text"
                        value={certificateData.borderColor || certificateData.primaryColor || '#d97706'}
                        onChange={(e) => updateField('borderColor', e.target.value)}
                        className="w-24 px-2 py-1 text-xs border border-slate-300 rounded-lg text-slate-700 font-mono text-center"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      لون الزخرفة الثانوية
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={certificateData.borderSecondaryColor || certificateData.secondaryColor || '#f59e0b'}
                        onChange={(e) => updateField('borderSecondaryColor', e.target.value)}
                        className="w-8 h-8 rounded-lg cursor-pointer border border-slate-300 p-0.5"
                      />
                      <input
                        type="text"
                        value={certificateData.borderSecondaryColor || certificateData.secondaryColor || '#f59e0b'}
                        onChange={(e) => updateField('borderSecondaryColor', e.target.value)}
                        className="w-24 px-2 py-1 text-xs border border-slate-300 rounded-lg text-slate-700 font-mono text-center"
                      />
                    </div>
                  </div>
                </div>

                {/* Quick Color Presets */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1.5">نماذج ألوان جاهزة للإطار:</label>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { name: 'ذهبي ملوكي', p: '#d97706', s: '#f59e0b' },
                      { name: 'كحلي فاخر', p: '#1e3a8a', s: '#3b82f6' },
                      { name: 'زمردي ملكي', p: '#047857', s: '#10b981' },
                      { name: 'عنابي أندلسي', p: '#831843', s: '#f43f5e' },
                      { name: 'أسود وفضي', p: '#18181b', s: '#9ca3af' },
                    ].map((preset, idx) => (
                      <button
                        key={idx}
                        onClick={() => onChange({
                          ...certificateData,
                          borderColor: preset.p,
                          borderSecondaryColor: preset.s,
                          updatedAt: new Date().toISOString()
                        })}
                        className="px-2 py-1 rounded-md bg-white border border-slate-200 text-[10px] font-bold text-slate-700 hover:border-amber-400 flex items-center gap-1 shadow-2xs"
                      >
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: preset.p }} />
                        <span>{preset.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Border Thickness & Inset */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[11px] font-bold text-slate-700">سمك الإطار</label>
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                        {certificateData.borderWidth ?? 2}x
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      step="1"
                      value={certificateData.borderWidth ?? 2}
                      onChange={(e) => updateField('borderWidth', parseInt(e.target.value))}
                      className="w-full accent-amber-600"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[11px] font-bold text-slate-700">مسافة الإطار عن الحافة</label>
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                        {certificateData.borderPadding ?? 12}px
                      </span>
                    </div>
                    <input
                      type="range"
                      min="4"
                      max="28"
                      step="2"
                      value={certificateData.borderPadding ?? 12}
                      onChange={(e) => updateField('borderPadding', parseInt(e.target.value))}
                      className="w-full accent-amber-600"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Page & Content Margins (التحكم بهوامش الورقة والمحتوى) */}
            <div className="p-3.5 bg-slate-50/90 rounded-xl border border-slate-200/90 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Move className="w-4 h-4 text-amber-600" />
                  التحكم بهوامش الصفحة ومحتوى الشهادة
                </label>
                <div className="flex items-center gap-2">
                  {hasCustomSavedMargins() && (
                    <button
                      type="button"
                      onClick={handleRestoreDefaultMargins}
                      title="استعادة الهوامش الافتراضية المحفوظة"
                      className="text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-md transition"
                    >
                      تطبيق الافتراضي
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onChange({
                      ...certificateData,
                      canvasMarginTop: SYSTEM_DEFAULT_MARGINS.canvasMarginTop,
                      canvasMarginBottom: SYSTEM_DEFAULT_MARGINS.canvasMarginBottom,
                      canvasMarginLeft: SYSTEM_DEFAULT_MARGINS.canvasMarginLeft,
                      canvasMarginRight: SYSTEM_DEFAULT_MARGINS.canvasMarginRight,
                      updatedAt: new Date().toISOString()
                    })}
                    className="text-[11px] font-bold text-slate-500 hover:text-slate-800 underline"
                  >
                    إعادة ضبط
                  </button>
                </div>
              </div>

              {/* Notice Banner */}
              {marginNotice && (
                <div className="p-2.5 rounded-lg text-[11px] font-medium bg-amber-50 border border-amber-200/80 text-amber-900 flex items-start gap-2 animate-fadeIn">
                  <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span className="leading-relaxed flex-1">{marginNotice}</span>
                </div>
              )}

              {/* AI & Smart Auto-Adjust Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleAutoSafeMargins}
                  className="py-1.5 px-2.5 rounded-lg text-[11px] font-bold bg-white hover:bg-amber-50 text-slate-800 border border-amber-300 shadow-2xs flex items-center justify-center gap-1.5 transition active:scale-98"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>ضبط تلقائي للإطار</span>
                </button>

                <button
                  type="button"
                  disabled={isAiOptimizingMargins}
                  onClick={handleAiOptimizeMargins}
                  className="py-1.5 px-2.5 rounded-lg text-[11px] font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-2xs flex items-center justify-center gap-1.5 transition active:scale-98 disabled:opacity-70"
                >
                  <Sparkles className={`w-3.5 h-3.5 shrink-0 ${isAiOptimizingMargins ? 'animate-spin' : ''}`} />
                  <span>{isAiOptimizingMargins ? 'جاري الضبط...' : 'ضبط بالذكاء الاصطناعي'}</span>
                </button>
              </div>

              {/* Quick Presets */}
              <div className="grid grid-cols-4 gap-1.5 pt-0.5">
                {[
                  { label: 'قياسي', top: 32, bottom: 30, left: 40, right: 40 },
                  { label: 'ضيّق', top: 18, bottom: 18, left: 24, right: 24 },
                  { label: 'واسع', top: 48, bottom: 46, left: 56, right: 56 },
                  { label: 'معدوم', top: 0, bottom: 0, left: 0, right: 0 },
                ].map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onChange({
                      ...certificateData,
                      canvasMarginTop: preset.top,
                      canvasMarginBottom: preset.bottom,
                      canvasMarginLeft: preset.left,
                      canvasMarginRight: preset.right,
                      updatedAt: new Date().toISOString()
                    })}
                    className="py-1 px-2 rounded-lg text-[10px] font-bold bg-white border border-slate-200 hover:border-amber-400 hover:bg-amber-50 text-slate-700 transition"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Sliders for Top, Bottom, Right, Left */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[11px] font-bold text-slate-700">الهامش العلوي</label>
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                      {certificateData.canvasMarginTop ?? 32}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="80"
                    step="2"
                    value={certificateData.canvasMarginTop ?? 32}
                    onChange={(e) => updateField('canvasMarginTop', parseInt(e.target.value))}
                    className="w-full accent-amber-600 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[11px] font-bold text-slate-700">الهامش السفلي</label>
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                      {certificateData.canvasMarginBottom ?? 30}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="80"
                    step="2"
                    value={certificateData.canvasMarginBottom ?? 30}
                    onChange={(e) => updateField('canvasMarginBottom', parseInt(e.target.value))}
                    className="w-full accent-amber-600 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[11px] font-bold text-slate-700">الهامش الأيمن</label>
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                      {certificateData.canvasMarginRight ?? 40}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="80"
                    step="2"
                    value={certificateData.canvasMarginRight ?? 40}
                    onChange={(e) => updateField('canvasMarginRight', parseInt(e.target.value))}
                    className="w-full accent-amber-600 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[11px] font-bold text-slate-700">الهامش الأيسر</label>
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                      {certificateData.canvasMarginLeft ?? 40}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="80"
                    step="2"
                    value={certificateData.canvasMarginLeft ?? 40}
                    onChange={(e) => updateField('canvasMarginLeft', parseInt(e.target.value))}
                    className="w-full accent-amber-600 cursor-pointer"
                  />
                </div>
              </div>

              {/* Save Margins as Default Button */}
              <div className="pt-1 border-t border-slate-200/80">
                <button
                  type="button"
                  onClick={handleSaveDefaultMargins}
                  className="w-full py-2 px-3 rounded-xl text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300/80 flex items-center justify-center gap-2 transition shadow-2xs active:scale-98"
                >
                  <Save className="w-3.5 h-3.5 text-amber-700" />
                  <span>حفظ هذه الهوامش كافتراضي للشهادات القادمة</span>
                </button>
              </div>
            </div>

            {/* Aspect Ratio */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-2">أبعاد الشهادة (Aspect Ratio)</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => updateField('aspectRatio', 'A4-landscape')}
                  className={`p-2.5 rounded-xl border text-xs font-bold text-center ${
                    certificateData.aspectRatio === 'A4-landscape'
                      ? 'border-amber-500 bg-amber-50 text-amber-900'
                      : 'border-slate-200'
                  }`}
                >
                  أفقي (Landscape)
                </button>
                <button
                  onClick={() => updateField('aspectRatio', 'A4-portrait')}
                  className={`p-2.5 rounded-xl border text-xs font-bold text-center ${
                    certificateData.aspectRatio === 'A4-portrait'
                      ? 'border-amber-500 bg-amber-50 text-amber-900'
                      : 'border-slate-200'
                  }`}
                >
                  عمودي (Portrait)
                </button>
                <button
                  onClick={() => updateField('aspectRatio', 'square')}
                  className={`p-2.5 rounded-xl border text-xs font-bold text-center ${
                    certificateData.aspectRatio === 'square'
                      ? 'border-amber-500 bg-amber-50 text-amber-900'
                      : 'border-slate-200'
                  }`}
                >
                  مربع (Square)
                </button>
              </div>
            </div>

            {/* Watermark Section */}
            <div className={`p-3.5 bg-slate-50/80 rounded-xl border space-y-3 ${isWatermarkLocked ? 'border-amber-400 bg-amber-50/30' : 'border-slate-200'}`}>
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-amber-600" />
                  <span>تخصيص العلامة المائية (Watermark)</span>
                  {isWatermarkLocked && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500 text-slate-950">
                      <Lock className="w-2.5 h-2.5" />
                      <span>مقفل</span>
                    </span>
                  )}
                </label>
                <div className={`flex rounded-lg border border-slate-200 bg-white p-0.5 text-[11px] font-bold ${isWatermarkLocked ? 'opacity-50 pointer-events-none' : ''}`}>
                  <button
                    disabled={isWatermarkLocked}
                    onClick={() => updateField('watermarkType', 'text')}
                    className={`px-2 py-1 rounded-md transition ${
                      (certificateData.watermarkType || 'text') === 'text'
                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    نص
                  </button>
                  <button
                    disabled={isWatermarkLocked}
                    onClick={() => updateField('watermarkType', 'image')}
                    className={`px-2 py-1 rounded-md transition ${
                      certificateData.watermarkType === 'image'
                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    صورة
                  </button>
                  <button
                    disabled={isWatermarkLocked}
                    onClick={() => updateField('watermarkType', 'none')}
                    className={`px-2 py-1 rounded-md transition ${
                      certificateData.watermarkType === 'none'
                        ? 'bg-red-500 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    إيقاف
                  </button>
                </div>
              </div>

              {certificateData.watermarkType !== 'none' && (
                <div className="space-y-3 pt-1 border-t border-slate-200/80">
                  
                  {/* Text Input */}
                  {(certificateData.watermarkType || 'text') === 'text' && (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">نص العلامة المائية:</label>
                      <input
                        type="text"
                        value={certificateData.watermarkText ?? ''}
                        onChange={(e) => updateField('watermarkText', e.target.value)}
                        placeholder="مثال: مدرسة التميز / وزارة التعليم"
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                  )}

                  {/* Image Input */}
                  {certificateData.watermarkType === 'image' && (
                    <div className="space-y-2">
                      <label className="block text-[11px] font-bold text-slate-700">صورة العلامة المائية الخفيفة:</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={certificateData.watermarkImageUrl || ''}
                          onChange={(e) => updateField('watermarkImageUrl', e.target.value)}
                          placeholder="رابط الصورة (URL)..."
                          className="flex-1 px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                        />
                        <label className="px-3 py-1.5 bg-slate-800 text-white hover:bg-slate-700 rounded-lg text-xs font-bold cursor-pointer transition flex items-center gap-1 shrink-0">
                          <Upload className="w-3.5 h-3.5" />
                          رفع
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                  if (event.target?.result) {
                                    updateField('watermarkImageUrl', event.target.result as string);
                                  }
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Pattern / Wrap Layout */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">طريقة التوزيع / الالتفاف:</label>
                    <div className="grid grid-cols-3 gap-1.5 bg-white p-1 rounded-xl border border-slate-200 text-[10px] font-bold">
                      <button
                        onClick={() => updateField('watermarkPattern', 'center')}
                        className={`py-1.5 rounded-lg transition text-center ${
                          (certificateData.watermarkPattern || 'center') === 'center'
                            ? 'bg-amber-500 text-slate-950 font-black'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        بالمنتصف
                      </button>
                      <button
                        onClick={() => updateField('watermarkPattern', 'repeat')}
                        className={`py-1.5 rounded-lg transition text-center ${
                          certificateData.watermarkPattern === 'repeat'
                            ? 'bg-amber-500 text-slate-950 font-black'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        تكرار شبكي
                      </button>
                      <button
                        onClick={() => updateField('watermarkPattern', 'diagonal-strip')}
                        className={`py-1.5 rounded-lg transition text-center ${
                          certificateData.watermarkPattern === 'diagonal-strip'
                            ? 'bg-amber-500 text-slate-950 font-black'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        أشرطة مائلة
                      </button>
                    </div>
                  </div>

                  {/* Rotation Angle Slider */}
                  <div>
                    <div className="flex justify-between items-center text-[11px] font-bold text-slate-700 mb-1">
                      <span>زاوية الدوران:</span>
                      <span className="text-amber-700">{certificateData.watermarkRotation ?? -12}°</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="-90"
                        max="90"
                        step="1"
                        value={certificateData.watermarkRotation ?? -12}
                        onChange={(e) => updateField('watermarkRotation', Number(e.target.value))}
                        className="w-full accent-amber-500 cursor-pointer"
                      />
                      <div className="flex gap-1 shrink-0">
                        {[-45, -12, 0, 45].map((deg) => (
                          <button
                            key={deg}
                            onClick={() => updateField('watermarkRotation', deg)}
                            className="px-1.5 py-0.5 text-[9px] bg-slate-200 hover:bg-slate-300 rounded font-mono font-bold"
                          >
                            {deg}°
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Opacity & Size Sliders */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex justify-between items-center text-[11px] font-bold text-slate-700 mb-1">
                        <span>الشفافية:</span>
                        <span className="text-amber-700">{Math.round((certificateData.watermarkOpacity ?? 0.05) * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.01"
                        max="0.40"
                        step="0.01"
                        value={certificateData.watermarkOpacity ?? 0.05}
                        onChange={(e) => updateField('watermarkOpacity', Number(e.target.value))}
                        className="w-full accent-amber-500 cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center text-[11px] font-bold text-slate-700 mb-1">
                        <span>الحجم / النسبة:</span>
                        <span className="text-amber-700">{certificateData.watermarkSize ?? 100}%</span>
                      </div>
                      <input
                        type="range"
                        min="50"
                        max="200"
                        step="5"
                        value={certificateData.watermarkSize ?? 100}
                        onChange={(e) => updateField('watermarkSize', Number(e.target.value))}
                        className="w-full accent-amber-500 cursor-pointer"
                      />
                    </div>
                  </div>

                </div>
              )}
            </div>

          </div>
        )}

        {/* TAB 6: STAMPS, BADGES & CELEBRATORY EMOJIS */}
        {activeTab === 'elements' && (
          <div className="space-y-4">
            
            {/* Badge / Medal Settings */}
            <div className={`p-3 bg-slate-50 rounded-xl border space-y-3 ${isBadgeLocked ? 'border-amber-400 bg-amber-50/30' : 'border-slate-200'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span>تخصيص الوسام / الشارة / الميدالية</span>
                    {isBadgeLocked && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500 text-slate-950">
                        <Lock className="w-2.5 h-2.5" />
                        <span>مقفل</span>
                      </span>
                    )}
                  </span>
                </div>
                <input
                  type="checkbox"
                  disabled={isBadgeLocked}
                  checked={certificateData.showBadge}
                  onChange={(e) => updateField('showBadge', e.target.checked)}
                  className="w-4 h-4 accent-amber-500 rounded cursor-pointer disabled:opacity-50"
                />
              </div>

              {certificateData.showBadge && (
                <div className={`space-y-3 pt-1 ${isBadgeLocked ? 'pointer-events-none opacity-60' : ''}`}>
                  
                  {/* --- 1. BADGE ICON & SOURCE SECTION --- */}
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200/90 space-y-2.5 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                        <span>🏅</span>
                        <span>أيقونة وصورة الوسام العلوية</span>
                      </span>
                    </div>

                    {/* Badge Source Selector */}
                    <div className="flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs font-bold">
                      <button
                        onClick={() => updateField('badgeType', 'icon')}
                        className={`flex-1 py-1 text-center rounded-md transition ${
                          (certificateData.badgeType || 'icon') === 'icon'
                            ? 'bg-amber-500 text-slate-950 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        🏅 أيقونة مدمجة
                      </button>
                      <button
                        onClick={() => updateField('badgeType', 'upload')}
                        className={`flex-1 py-1 text-center rounded-md transition ${
                          certificateData.badgeType === 'upload'
                            ? 'bg-amber-500 text-slate-950 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        🖼️ رفع من الجهاز
                      </button>
                    </div>

                    {/* Device Upload for Badge */}
                    {certificateData.badgeType === 'upload' ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          {certificateData.badgeUrl ? (
                            <div className="relative">
                              <img
                                src={certificateData.badgeUrl}
                                alt="Badge"
                                className="w-12 h-12 object-contain bg-white rounded-lg p-1 border shadow-xs"
                              />
                              <button
                                onClick={() => onChange({ ...certificateData, badgeUrl: undefined, updatedAt: new Date().toISOString() })}
                                className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full p-0.5 shadow-xs hover:bg-red-700"
                                title="حذف صورة الوسام"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-amber-50 border border-dashed border-amber-300 flex items-center justify-center text-amber-700 text-[10px] font-bold text-center">
                              لا يوجد
                            </div>
                          )}

                          <label className="flex-1 px-3 py-2 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700 cursor-pointer text-center flex items-center justify-center gap-2 shadow-xs transition">
                            <Upload className="w-4 h-4" />
                            رفع صورة الوسام من الجهاز
                            <input type="file" accept="image/*" onChange={handleBadgeUpload} className="hidden" />
                          </label>
                        </div>
                      </div>
                    ) : (
                      /* Built-in Icons */
                      <div className="flex flex-wrap gap-1.5">
                        {badgeIcons.map((bi) => (
                          <button
                            key={bi.id}
                            onClick={() => updateField('badgeIcon', bi.id)}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-bold border transition ${
                              certificateData.badgeIcon === bi.id && certificateData.badgeType !== 'upload'
                                ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-2xs'
                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {bi.label}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Badge Size & Offset */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                      <span className="text-[11px] font-bold text-slate-700">حجم أيقونة الوسام:</span>
                      <div className="flex gap-1">
                        {[
                          { id: 'sm', label: 'صغير' },
                          { id: 'md', label: 'متوسط' },
                          { id: 'lg', label: 'كبير' }
                        ].map((sz) => (
                          <button
                            key={sz.id}
                            onClick={() => updateField('badgeSize', sz.id as any)}
                            className={`px-2.5 py-0.5 rounded text-[10px] font-bold border transition ${
                              (certificateData.badgeSize || 'md') === sz.id
                                ? 'bg-amber-500 text-slate-950 border-amber-600'
                                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            {sz.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <OffsetPad
                      title="رمز / أيقونة الوسام"
                      subtitle="تحريك أيقونة أو صورة الوسام العلوية بدقة"
                      offsetX={certificateData.badgeBoxOffsetX || 0}
                      offsetY={certificateData.badgeBoxOffsetY || 0}
                      onChangeX={(val) => updateField('badgeBoxOffsetX', val)}
                      onChangeY={(val) => updateField('badgeBoxOffsetY', val)}
                      onReset={() => onChange({ ...certificateData, badgeBoxOffsetX: 0, badgeBoxOffsetY: 0, updatedAt: new Date().toISOString() })}
                    />
                  </div>

                  {/* --- 2. BADGE TITLE BACKGROUND DESIGN SECTION --- */}
                  <div className="p-2.5 bg-white rounded-lg border border-amber-200/90 space-y-2.5 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-amber-900 flex items-center gap-1.5">
                        <span>🎨</span>
                        <span>تصميم وضبط خلفية عنوان الوسام (المربع/الحاوية)</span>
                      </span>
                    </div>

                    {/* Background Shape */}
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-600">شكل وهيكل الخلفية:</label>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-1 text-[10px] font-bold">
                        {[
                          { id: 'pill', label: 'كبسولة دائرية', icon: '💊' },
                          { id: 'rounded', label: 'مستطيل منحني', icon: '▢' },
                          { id: 'banner', label: 'شريط ملكي', icon: '🎗️' },
                          { id: 'ornate', label: 'إطار زخرفي', icon: '⚜️' },
                          { id: 'square', label: 'زوايا قائمة', icon: '⏹' },
                          { id: 'minimal', label: 'خطي ناعم', icon: '▭' },
                          { id: 'none', label: 'بدون خلفية', icon: '🚫' },
                        ].map((sh) => (
                          <button
                            key={sh.id}
                            type="button"
                            onClick={() => updateField('badgeBgShape', sh.id as any)}
                            className={`py-1 px-1.5 rounded-md border text-center transition flex items-center justify-center gap-1 ${
                              (certificateData.badgeBgShape || 'pill') === sh.id
                                ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-2xs font-black'
                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            <span>{sh.icon}</span>
                            <span>{sh.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Background Colors & Gradient (if not 'none') */}
                    {(certificateData.badgeBgShape || 'pill') !== 'none' && (
                      <>
                        <div className="space-y-1.5 pt-1 border-t border-slate-100">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-bold text-slate-700">لون الخلفية الأساسي:</label>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="color"
                                value={certificateData.badgeBgColor || certificateData.primaryColor || '#b45309'}
                                onChange={(e) => updateField('badgeBgColor', e.target.value)}
                                className="w-5 h-5 rounded cursor-pointer border border-slate-300 p-0"
                              />
                              <span className="text-[9px] font-mono text-slate-500">
                                {certificateData.badgeBgColor || certificateData.primaryColor || '#b45309'}
                              </span>
                            </div>
                          </div>

                          {/* Quick Swatches */}
                          <div className="flex flex-wrap gap-1">
                            {[
                              { color: certificateData.primaryColor || '#854d0e', name: 'الأساسي' },
                              { color: certificateData.secondaryColor || '#d97706', name: 'الثانوي' },
                              { color: '#b45309', name: 'ذهبي برونزي' },
                              { color: '#1e3a8a', name: 'كحلي ملكي' },
                              { color: '#065f46', name: 'زمردي راقٍ' },
                              { color: '#991b1b', name: 'ياقوتي ملكي' },
                              { color: '#4c1d95', name: 'بنفسجي فاخر' },
                              { color: '#0f172a', name: 'فحمي داكن' },
                              { color: '#ffffff', name: 'أبيض ناصع' },
                            ].map((sw, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => updateField('badgeBgColor', sw.color)}
                                className={`w-5 h-5 rounded-md border transition ${
                                  (certificateData.badgeBgColor || certificateData.primaryColor) === sw.color
                                    ? 'ring-2 ring-amber-500 border-white scale-110'
                                    : 'border-slate-300 hover:scale-105'
                                }`}
                                style={{ backgroundColor: sw.color }}
                                title={sw.name}
                              />
                            ))}
                          </div>
                        </div>

                        {/* Gradient Toggle & Secondary Color */}
                        <div className="pt-1.5 border-t border-slate-100 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-700 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={certificateData.badgeBgGradient ?? false}
                                onChange={(e) => updateField('badgeBgGradient', e.target.checked)}
                                className="w-3.5 h-3.5 accent-amber-500 rounded cursor-pointer"
                              />
                              <span>تفعيل تدرج لوني للخلفية (Gradient)</span>
                            </label>
                            {certificateData.badgeBgGradient && (
                              <div className="flex items-center gap-1">
                                <input
                                  type="color"
                                  value={certificateData.badgeBgColor2 || '#f59e0b'}
                                  onChange={(e) => updateField('badgeBgColor2', e.target.value)}
                                  className="w-5 h-5 rounded cursor-pointer border border-slate-300 p-0"
                                />
                                <span className="text-[9px] font-mono text-slate-500">
                                  {certificateData.badgeBgColor2 || '#f59e0b'}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Background Opacity */}
                        <div className="pt-1 border-t border-slate-100 space-y-1">
                          <div className="flex justify-between text-[10px] font-bold text-slate-700">
                            <span>شفافية الخلفية:</span>
                            <span className="font-mono text-amber-700">
                              {Math.round((certificateData.badgeBgOpacity ?? 1) * 100)}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0.1"
                            max="1"
                            step="0.05"
                            value={certificateData.badgeBgOpacity ?? 1}
                            onChange={(e) => updateField('badgeBgOpacity', parseFloat(e.target.value))}
                            className="w-full accent-amber-500 cursor-pointer h-1.5"
                          />
                        </div>

                        {/* Border Controls */}
                        <div className="pt-1.5 border-t border-slate-100 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-700">حدود الخلفية (Border):</span>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="color"
                                value={certificateData.badgeBgBorderColor || '#fde68a'}
                                onChange={(e) => updateField('badgeBgBorderColor', e.target.value)}
                                className="w-4 h-4 rounded cursor-pointer border border-slate-300 p-0"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-[10px]">
                            <div>
                              <div className="flex justify-between text-slate-600 font-bold mb-0.5">
                                <span>سُمك الحد:</span>
                                <span className="font-mono">{certificateData.badgeBgBorderWidth ?? 0}px</span>
                              </div>
                              <input
                                type="range"
                                min="0"
                                max="6"
                                step="1"
                                value={certificateData.badgeBgBorderWidth ?? 0}
                                onChange={(e) => updateField('badgeBgBorderWidth', parseInt(e.target.value) || 0)}
                                className="w-full accent-amber-500 cursor-pointer h-1.5"
                              />
                            </div>
                            <div>
                              <span className="block text-slate-600 font-bold mb-0.5">نمط الحد:</span>
                              <select
                                value={certificateData.badgeBgBorderStyle || 'solid'}
                                onChange={(e) => updateField('badgeBgBorderStyle', e.target.value as any)}
                                className="w-full text-[10px] py-0.5 px-1 border border-slate-300 rounded bg-white"
                              >
                                <option value="solid">مصمت (Solid)</option>
                                <option value="double">مزدوج (Double)</option>
                                <option value="dashed">متقطع (Dashed)</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        {/* Dimensions & Padding */}
                        <div className="pt-1.5 border-t border-slate-100 space-y-1.5">
                          <span className="block text-[10px] font-bold text-slate-700">أبعاد ومسافات الخلفية:</span>
                          
                          {/* Width Mode */}
                          <div className="flex rounded-md border border-slate-200 bg-slate-50 p-0.5 text-[10px] font-bold">
                            {[
                              { id: 'auto', label: 'ملاءمة المحتوى (Auto)' },
                              { id: 'custom', label: 'عرض مخصص (px)' },
                              { id: 'full', label: 'العرض الكامل' }
                            ].map((wm) => (
                              <button
                                key={wm.id}
                                type="button"
                                onClick={() => updateField('badgeBgWidthMode', wm.id as any)}
                                className={`flex-1 py-0.5 text-center rounded transition ${
                                  (certificateData.badgeBgWidthMode || 'auto') === wm.id
                                    ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                              >
                                {wm.label}
                              </button>
                            ))}
                          </div>

                          {certificateData.badgeBgWidthMode === 'custom' && (
                            <div className="space-y-0.5 pt-0.5">
                              <div className="flex justify-between text-[10px] font-bold text-slate-600">
                                <span>العرض المخصص:</span>
                                <span className="font-mono text-amber-700">{certificateData.badgeBgWidthPx || 120}px</span>
                              </div>
                              <input
                                type="range"
                                min="60"
                                max="280"
                                step="5"
                                value={certificateData.badgeBgWidthPx || 120}
                                onChange={(e) => updateField('badgeBgWidthPx', parseInt(e.target.value) || 120)}
                                className="w-full accent-amber-500 cursor-pointer h-1.5"
                              />
                            </div>
                          )}

                          {/* Padding X & Y */}
                          <div className="grid grid-cols-2 gap-2 text-[10px]">
                            <div>
                              <div className="flex justify-between text-slate-600 font-bold mb-0.5">
                                <span>حشوة أفقية (X):</span>
                                <span className="font-mono">{certificateData.badgeBgPaddingX ?? 12}px</span>
                              </div>
                              <input
                                type="range"
                                min="2"
                                max="32"
                                step="1"
                                value={certificateData.badgeBgPaddingX ?? 12}
                                onChange={(e) => updateField('badgeBgPaddingX', parseInt(e.target.value) || 0)}
                                className="w-full accent-amber-500 cursor-pointer h-1.5"
                              />
                            </div>
                            <div>
                              <div className="flex justify-between text-slate-600 font-bold mb-0.5">
                                <span>حشوة رأسية (Y):</span>
                                <span className="font-mono">{certificateData.badgeBgPaddingY ?? 3.5}px</span>
                              </div>
                              <input
                                type="range"
                                min="1"
                                max="16"
                                step="0.5"
                                value={certificateData.badgeBgPaddingY ?? 3.5}
                                onChange={(e) => updateField('badgeBgPaddingY', parseFloat(e.target.value) || 0)}
                                className="w-full accent-amber-500 cursor-pointer h-1.5"
                              />
                            </div>
                          </div>

                          {/* Corner Radius (if rounded/square/ornate) */}
                          {['rounded', 'square', 'ornate', 'banner', 'minimal'].includes(certificateData.badgeBgShape || 'pill') && (
                            <div className="space-y-0.5 pt-0.5">
                              <div className="flex justify-between text-[10px] font-bold text-slate-600">
                                <span>استدارة الحواف (Radius):</span>
                                <span className="font-mono text-amber-700">{certificateData.badgeBgRadius ?? 8}px</span>
                              </div>
                              <input
                                type="range"
                                min="0"
                                max="32"
                                step="1"
                                value={certificateData.badgeBgRadius ?? 8}
                                onChange={(e) => updateField('badgeBgRadius', parseInt(e.target.value) || 0)}
                                className="w-full accent-amber-500 cursor-pointer h-1.5"
                              />
                            </div>
                          )}
                        </div>

                        {/* Shadows & Glow Presets */}
                        <div className="pt-1.5 border-t border-slate-100 space-y-1">
                          <label className="block text-[10px] font-bold text-slate-700">تأثير الظل والتوهج (Shadow):</label>
                          <div className="grid grid-cols-3 gap-1 text-[10px] font-bold">
                            {[
                              { id: 'none', label: 'بدون ظل' },
                              { id: 'sm', label: 'ظل ناعم' },
                              { id: 'md', label: 'ظل متوسط' },
                              { id: 'lg', label: 'ظل بارز' },
                              { id: 'glow', label: 'توهج دافئ' },
                              { id: 'gold-glow', label: 'وهج ذهبي فاخر' },
                            ].map((sh) => (
                              <button
                                key={sh.id}
                                type="button"
                                onClick={() => updateField('badgeBgShadow', sh.id as any)}
                                className={`py-1 px-1 rounded border text-center transition ${
                                  (certificateData.badgeBgShadow || 'sm') === sh.id
                                    ? 'bg-amber-500 text-slate-950 border-amber-600 font-black shadow-xs'
                                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                {sh.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    {/* Independent Background Position Offset */}
                    <OffsetPad
                      title="خلفية ومربع عنوان الوسام"
                      subtitle="تحريك حاوية وخلفية الوسام بشكل مستقل"
                      offsetX={certificateData.badgeBgOffsetX || 0}
                      offsetY={certificateData.badgeBgOffsetY || 0}
                      onChangeX={(val) => updateField('badgeBgOffsetX', val)}
                      onChangeY={(val) => updateField('badgeBgOffsetY', val)}
                      onReset={() => onChange({ ...certificateData, badgeBgOffsetX: 0, badgeBgOffsetY: 0, updatedAt: new Date().toISOString() })}
                    />
                  </div>

                  {/* --- 3. BADGE TITLE TEXT & TYPOGRAPHY SECTION --- */}
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200/90 space-y-2.5 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                        <span>✍️</span>
                        <span>تصميم وضبط نص واسم الوسام ومحاذاته</span>
                      </span>
                      <label className="flex items-center gap-1 text-[10px] font-bold text-slate-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={certificateData.showBadgeTitle ?? true}
                          onChange={(e) => updateField('showBadgeTitle', e.target.checked)}
                          className="w-3.5 h-3.5 accent-amber-500 rounded cursor-pointer"
                        />
                        <span>إظهار النص</span>
                      </label>
                    </div>

                    {(certificateData.showBadgeTitle ?? true) && (
                      <div className="space-y-2.5">
                        {/* Text Input */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-1">عبارة عنوان الوسام:</label>
                          <input
                            type="text"
                            value={certificateData.badgeTitle}
                            onChange={(e) => updateField('badgeTitle', e.target.value)}
                            placeholder="عنوان الوسام (مثال: وسام التميز والتفوق)"
                            className="w-full px-2.5 py-1 text-xs border border-slate-300 rounded-lg bg-white focus:ring-1 focus:ring-amber-500 font-bold"
                          />
                        </div>

                        {/* Font Size & Quick Size Buttons */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] font-bold text-slate-700">
                            <span>حجم الخط:</span>
                            <span className="font-mono text-amber-700">{certificateData.badgeTextFontSize || 10}px</span>
                          </div>
                          <input
                            type="range"
                            min="7"
                            max="24"
                            step="1"
                            value={certificateData.badgeTextFontSize || 10}
                            onChange={(e) => updateField('badgeTextFontSize', parseInt(e.target.value) || 10)}
                            className="w-full accent-amber-500 cursor-pointer h-1.5"
                          />
                          <div className="flex gap-1 pt-0.5">
                            {[8, 9, 10, 11, 12, 14, 16].map((sz) => (
                              <button
                                key={sz}
                                type="button"
                                onClick={() => updateField('badgeTextFontSize', sz)}
                                className={`flex-1 py-0.5 text-[9px] font-mono rounded border ${
                                  (certificateData.badgeTextFontSize || 10) === sz
                                    ? 'bg-amber-500 text-slate-950 font-bold border-amber-600'
                                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                {sz}px
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Font Family & Weight */}
                        <div className="grid grid-cols-2 gap-2 text-[10px]">
                          <div>
                            <span className="block text-slate-600 font-bold mb-0.5">نوع الخط العربي:</span>
                            <select
                              value={certificateData.badgeTextFontFamily || certificateData.fontFamily || 'Cairo'}
                              onChange={(e) => updateField('badgeTextFontFamily', e.target.value as FontOption)}
                              className="w-full text-[10px] py-1 px-1.5 border border-slate-300 rounded bg-white font-bold"
                            >
                              {fonts.map((f) => (
                                <option key={f.id} value={f.id}>{f.label}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <span className="block text-slate-600 font-bold mb-0.5">سُمك الخط:</span>
                            <select
                              value={certificateData.badgeTextFontWeight || 'bold'}
                              onChange={(e) => updateField('badgeTextFontWeight', e.target.value as any)}
                              className="w-full text-[10px] py-1 px-1.5 border border-slate-300 rounded bg-white font-bold"
                            >
                              <option value="normal">عادي (Normal)</option>
                              <option value="bold">عريض (Bold)</option>
                              <option value="extrabold">سميك جداً (ExtraBold)</option>
                              <option value="black">أسود عريض (Black)</option>
                            </select>
                          </div>
                        </div>

                        {/* Text Color & Swatches */}
                        <div className="space-y-1.5 pt-1 border-t border-slate-100">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-700">لون النص:</span>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="color"
                                value={certificateData.badgeTextColor || '#ffffff'}
                                onChange={(e) => updateField('badgeTextColor', e.target.value)}
                                className="w-5 h-5 rounded cursor-pointer border border-slate-300 p-0"
                              />
                              <span className="text-[9px] font-mono text-slate-500">
                                {certificateData.badgeTextColor || '#ffffff'}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-1">
                            {[
                              { color: '#ffffff', name: 'أبيض ناصع' },
                              { color: '#fef08a', name: 'ذهبي فاتح' },
                              { color: '#fde047', name: 'أصفر زاهٍ' },
                              { color: '#0f172a', name: 'فحمي داكن' },
                              { color: '#1e3a8a', name: 'كحلي ياقوتي' },
                              { color: '#15803d', name: 'أخضر زمردي' },
                              { color: '#b45309', name: 'برونزي ذهبي' },
                            ].map((sw, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => updateField('badgeTextColor', sw.color)}
                                className={`w-5 h-5 rounded-md border transition ${
                                  (certificateData.badgeTextColor || '#ffffff') === sw.color
                                    ? 'ring-2 ring-amber-500 border-white scale-110'
                                    : 'border-slate-300 hover:scale-105'
                                }`}
                                style={{ backgroundColor: sw.color }}
                                title={sw.name}
                              />
                            ))}
                          </div>
                        </div>

                        {/* Text Alignment & Letter Spacing */}
                        <div className="grid grid-cols-2 gap-2 text-[10px] pt-1 border-t border-slate-100">
                          <div>
                            <span className="block text-slate-600 font-bold mb-0.5">محاذاة النص:</span>
                            <div className="flex rounded border border-slate-200 bg-slate-50 p-0.5">
                              {[
                                { id: 'right', label: 'يمين' },
                                { id: 'center', label: 'توسيط' },
                                { id: 'left', label: 'يسار' },
                              ].map((al) => (
                                <button
                                  key={al.id}
                                  type="button"
                                  onClick={() => updateField('badgeTextAlign', al.id as any)}
                                  className={`flex-1 py-0.5 text-center rounded transition ${
                                    (certificateData.badgeTextAlign || 'center') === al.id
                                      ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                                      : 'text-slate-600 hover:text-slate-900'
                                  }`}
                                >
                                  {al.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-slate-600 font-bold mb-0.5">
                              <span>تباعد الأحرف:</span>
                              <span className="font-mono">{certificateData.badgeTextLetterSpacing || 0}px</span>
                            </div>
                            <input
                              type="range"
                              min="-1"
                              max="4"
                              step="0.5"
                              value={certificateData.badgeTextLetterSpacing || 0}
                              onChange={(e) => updateField('badgeTextLetterSpacing', parseFloat(e.target.value) || 0)}
                              className="w-full accent-amber-500 cursor-pointer h-1.5"
                            />
                          </div>
                        </div>

                        {/* Wrap Mode & Auto-fit Bound Protection Info */}
                        <div className="p-2 bg-amber-50/70 border border-amber-200/80 rounded-lg space-y-1.5">
                          <div className="flex items-center justify-between text-[10px] font-bold text-amber-900">
                            <span className="flex items-center gap-1">
                              <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                              <span>ربط الاسم داخل المربع ومنع تجاوزه للحدود:</span>
                            </span>
                          </div>
                          
                          <div className="flex rounded border border-amber-300/80 bg-white p-0.5 text-[10px] font-bold">
                            <button
                              type="button"
                              onClick={() => updateField('badgeTextWrap', 'nowrap')}
                              className={`flex-1 py-1 text-center rounded transition ${
                                (certificateData.badgeTextWrap || 'nowrap') === 'nowrap'
                                  ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              سطر واحد (تقليص تلقائي)
                            </button>
                            <button
                              type="button"
                              onClick={() => updateField('badgeTextWrap', 'wrap')}
                              className={`flex-1 py-1 text-center rounded transition ${
                                certificateData.badgeTextWrap === 'wrap'
                                  ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              التواء لأسطر متعددة (Wrap)
                            </button>
                          </div>
                          <p className="text-[9px] text-amber-800 leading-relaxed">
                            ✓ يتم قفل النص بدقة داخل المربع لمنع خروجه أو تداخله عند التصدير والطباعة بجودة فائقة.
                          </p>
                        </div>

                        {/* Fine Text Internal Position & Overall Combined Position */}
                        <div className="space-y-1.5 pt-1 border-t border-slate-100">
                          <OffsetPad
                            title="النص داخل المربع (تحريك دقيق)"
                            subtitle="ضبط إزاحة الكلمات والنصوص داخل صندوق الخلفية"
                            offsetX={certificateData.badgeTextOffsetX || 0}
                            offsetY={certificateData.badgeTextOffsetY || 0}
                            onChangeX={(val) => updateField('badgeTextOffsetX', val)}
                            onChangeY={(val) => updateField('badgeTextOffsetY', val)}
                            onReset={() => onChange({ ...certificateData, badgeTextOffsetX: 0, badgeTextOffsetY: 0, updatedAt: new Date().toISOString() })}
                            min={-50}
                            max={50}
                          />

                          <OffsetPad
                            title="الموقع الكلي لعنوان الوسام"
                            subtitle="تحريك المربع والنص معاً كوحدة متكاملة"
                            offsetX={certificateData.badgeTitleOffsetX || 0}
                            offsetY={certificateData.badgeTitleOffsetY || 0}
                            onChangeX={(val) => updateField('badgeTitleOffsetX', val)}
                            onChangeY={(val) => updateField('badgeTitleOffsetY', val)}
                            onReset={() => onChange({ ...certificateData, badgeTitleOffsetX: 0, badgeTitleOffsetY: 0, updatedAt: new Date().toISOString() })}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              )}
            </div>

            {/* Stamp / Seal Settings */}
            <div className={`p-3 bg-slate-50 rounded-xl border space-y-3 ${isStampLocked ? 'border-amber-400 bg-amber-50/30' : 'border-slate-200'}`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span>تخصيص الختم الرسمي / الشمعي</span>
                  {isStampLocked && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500 text-slate-950">
                      <Lock className="w-2.5 h-2.5" />
                      <span>مقفل</span>
                    </span>
                  )}
                </span>
                <input
                  type="checkbox"
                  disabled={isStampLocked}
                  checked={certificateData.stamp?.show ?? true}
                  onChange={(e) =>
                    updateField('stamp', { ...certificateData.stamp, show: e.target.checked })
                  }
                  className="w-4 h-4 accent-amber-500 rounded disabled:opacity-50"
                />
              </div>

              {certificateData.stamp?.show && (
                <div className={`space-y-3 pt-1 ${isStampLocked ? 'pointer-events-none opacity-60' : ''}`}>
                  {/* Stamp Source Selector */}
                  <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs font-bold">
                    <button
                      onClick={() =>
                        updateField('stamp', { ...certificateData.stamp, shape: 'wax' })
                      }
                      className={`flex-1 py-1.5 text-center rounded-md transition ${
                        certificateData.stamp.shape !== 'custom'
                          ? 'bg-amber-500 text-slate-950 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      🏵️ ختم مصمم
                    </button>
                    <button
                      onClick={() =>
                        updateField('stamp', { ...certificateData.stamp, shape: 'custom' })
                      }
                      className={`flex-1 py-1.5 text-center rounded-md transition ${
                        certificateData.stamp.shape === 'custom'
                          ? 'bg-amber-500 text-slate-950 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      🖼️ رفع ختم من الجهاز
                    </button>
                  </div>

                  {/* Custom Stamp Upload */}
                  {certificateData.stamp.shape === 'custom' ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        {certificateData.stamp.imageUrl ? (
                          <div className="relative">
                            <img
                              src={certificateData.stamp.imageUrl}
                              alt="Stamp"
                              className="w-12 h-12 object-contain bg-white rounded-lg p-1 border shadow-xs"
                            />
                            <button
                              onClick={() =>
                                updateField('stamp', { ...certificateData.stamp, imageUrl: undefined })
                              }
                              className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full p-0.5 shadow-xs"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-amber-50 border border-dashed border-amber-300 flex items-center justify-center text-amber-700 text-[10px] font-bold text-center">
                            لا يوجد
                          </div>
                        )}

                        <label className="flex-1 px-3 py-2 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700 cursor-pointer text-center flex items-center justify-center gap-2 shadow-xs transition">
                          <Upload className="w-4 h-4" />
                          رفع صورة الختم الرسمي من الجهاز
                          <input type="file" accept="image/*" onChange={handleStampUpload} className="hidden" />
                        </label>
                      </div>

                      <input
                        type="text"
                        value={certificateData.stamp.title}
                        onChange={(e) =>
                          updateField('stamp', { ...certificateData.stamp, title: e.target.value })
                        }
                        placeholder="اسم الختم (اختياري أسفل الصورة)"
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                  ) : (
                    /* Designed Stamp Shapes & Text */
                    <div className="space-y-2">
                      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
                        {[
                          { id: 'circle', label: 'دائري' },
                          { id: 'square', label: 'مربع دائري' },
                          { id: 'rectangle', label: 'مستطيل' },
                          { id: 'wax', label: 'شمعي' },
                          { id: 'ribbon', label: 'ملكي' }
                        ].map((sh) => (
                          <button
                            key={sh.id}
                            onClick={() =>
                              updateField('stamp', { ...certificateData.stamp, shape: sh.id as any })
                            }
                            className={`py-1.5 px-1 text-[11px] font-bold rounded-lg border transition-all text-center ${
                              certificateData.stamp.shape === sh.id
                                ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-xs'
                                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            {sh.label}
                          </button>
                        ))}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={certificateData.stamp.title}
                          onChange={(e) =>
                            updateField('stamp', { ...certificateData.stamp, title: e.target.value })
                          }
                          placeholder="نص الختم الرئيسية"
                          className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                        />
                        <input
                          type="text"
                          value={certificateData.stamp.subtext}
                          onChange={(e) =>
                            updateField('stamp', { ...certificateData.stamp, subtext: e.target.value })
                          }
                          placeholder="النص الفرعي"
                          className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                        />
                      </div>

                      {/* Color Picker for Stamp */}
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] font-bold text-slate-700">لون الختم:</span>
                        <div className="flex gap-1.5">
                          {['#b45309', '#1e3a8a', '#15803d', '#b91c1c', '#431407', '#000000'].map((c) => (
                            <button
                              key={c}
                              onClick={() =>
                                updateField('stamp', { ...certificateData.stamp, color: c })
                              }
                              className={`w-5 h-5 rounded-full border border-slate-300 ${
                                certificateData.stamp.color === c ? 'ring-2 ring-amber-500 ring-offset-1' : ''
                              }`}
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Stamp Size */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                    <span className="text-[11px] font-bold text-slate-700">حجم الختم:</span>
                    <div className="flex gap-1">
                      {[
                        { id: 'sm', label: 'صغير' },
                        { id: 'md', label: 'متوسط' },
                        { id: 'lg', label: 'كبير' }
                      ].map((sz) => (
                        <button
                          key={sz.id}
                          onClick={() =>
                            updateField('stamp', {
                              ...certificateData.stamp,
                              size: sz.id as any
                            })
                          }
                          className={`px-2.5 py-0.5 rounded text-[10px] font-bold border ${
                            (certificateData.stamp.size || 'md') === sz.id
                              ? 'bg-amber-500 text-slate-950 border-amber-600'
                              : 'bg-white text-slate-700 border-slate-300'
                          }`}
                        >
                          {sz.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Stamp Opacity Slider */}
                  <div className="flex flex-col gap-1 pt-1.5 border-t border-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-700">درجة الشفافية (Opacity):</span>
                      <span className="text-[11px] font-bold text-amber-700">
                        {Math.round((certificateData.stamp.opacity ?? 1) * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.05"
                      value={certificateData.stamp.opacity ?? 1}
                      onChange={(e) =>
                        updateField('stamp', {
                          ...certificateData.stamp,
                          opacity: parseFloat(e.target.value)
                        })
                      }
                      className="w-full accent-amber-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                    />
                  </div>

                  {/* Stamp Position & Text Offset Controls */}
                  <div className="space-y-2 pt-2 border-t border-slate-200">
                    <OffsetPad
                      title="تحريك موضع الختم بالكامل"
                      subtitle="ضبط موقع الختم على مساحة الشهادة أفقياً ورأسياً"
                      offsetX={certificateData.stamp.offsetX || 0}
                      offsetY={certificateData.stamp.offsetY || 0}
                      onChangeX={(val) => updateField('stamp', { ...certificateData.stamp, offsetX: val })}
                      onChangeY={(val) => updateField('stamp', { ...certificateData.stamp, offsetY: val })}
                      onReset={() => updateField('stamp', { ...certificateData.stamp, offsetX: 0, offsetY: 0 })}
                    />
                    <OffsetPad
                      title="تحريك الكتابة داخل الختم"
                      subtitle="ضبط موقع نص الختم أفقياً ورأسياً داخل الإطار"
                      offsetX={certificateData.stamp.textOffsetX || 0}
                      offsetY={certificateData.stamp.textOffsetY || 0}
                      onChangeX={(val) => updateField('stamp', { ...certificateData.stamp, textOffsetX: val })}
                      onChangeY={(val) => updateField('stamp', { ...certificateData.stamp, textOffsetY: val })}
                      onReset={() => updateField('stamp', { ...certificateData.stamp, textOffsetX: 0, textOffsetY: 0 })}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* QR Code Toggle */}
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs font-bold text-slate-800">إظهار كود التوثيق (QR Code)</span>
              <input
                type="checkbox"
                checked={certificateData.showQrCode}
                onChange={(e) => updateField('showQrCode', e.target.checked)}
                className="w-4 h-4 accent-amber-500 rounded"
              />
            </div>

            {/* Rich Celebratory Emojis & Custom Image Decorator Section */}
            <div className="p-3.5 bg-gradient-to-br from-amber-50/50 via-white to-slate-50 rounded-2xl border border-amber-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-amber-200/80 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-sm shadow-2xs">
                    🎉
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900">رموز الاحتفال والصور المخصصة</h4>
                    <p className="text-[10px] text-slate-500">حرّك، كبّر/صغّر، وعدّل الشفافية والطبقات بسهولة دون التعديل على باقي النص</p>
                  </div>
                </div>
              </div>

              {/* 1. Add Preset Emojis & Symbols */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-800 block">اختر رمزا احتفاليا لإضافته للشهادة:</span>
                <div className="flex flex-wrap gap-1.5 p-2 bg-white rounded-xl border border-slate-200 max-h-36 overflow-y-auto no-scrollbar">
                  {[
                    '🎉', '🎓', '🏆', '⭐', '🥇', '👑', '🎖️', '📜', '🌟', '🌿', '🌸', '🎈', '🏅', '🎨', '💫', '💎',
                    '⚜️', '🕌', '✨', '🔖', '💖', '🎗️', '🕯️', '💐', '🏵️', '🕊️', '🚀', '💡', '📚', '❤️', '🔥', '🛡️'
                  ].map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => addEmoji(em)}
                      className="w-9 h-9 text-xl bg-slate-50 hover:bg-amber-100 border border-slate-200 hover:border-amber-400 rounded-xl flex items-center justify-center hover:scale-110 active:scale-95 transition cursor-pointer"
                      title={`إضافة ${em}`}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Upload Custom Image / Sticker From Device */}
              <div className="p-3 bg-amber-100/40 rounded-xl border border-amber-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-right">
                  <span className="text-xs font-bold text-amber-950 block">إرفاق صورة أو شعار خاص من جهازك 🖼️</span>
                  <span className="text-[10px] text-amber-800">رفع صور PNG أو SVG بدون خلفية والتحكم بها تماماً كالرموز</span>
                </div>
                <label className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer shrink-0">
                  <Upload className="w-3.5 h-3.5" />
                  <span>رفع صورة من الجهاز</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCustomEmojiImageUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* 3. Added Elements Selector & Customization Panel */}
              {certificateData.emojis && certificateData.emojis.length > 0 && (() => {
                const activeItem = certificateData.emojis.find(e => e.id === selectedEmojiId) || certificateData.emojis[certificateData.emojis.length - 1];

                return (
                  <div className="space-y-3 pt-3 border-t border-slate-200">
                    <span className="text-xs font-extrabold text-slate-900 block">العناصر المضافة حالياً (انقر للتحكم والتعديل):</span>
                    
                    {/* List of active elements as pills */}
                    <div className="flex flex-wrap gap-1.5">
                      {certificateData.emojis.map((e) => {
                        const isCurrent = activeItem && activeItem.id === e.id;
                        return (
                          <div
                            key={e.id}
                            onClick={() => setSelectedEmojiId(e.id)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                              isCurrent
                                ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-2xs font-extrabold'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-amber-50'
                            }`}
                          >
                            {e.type === 'image' && e.imageUrl ? (
                              <img src={e.imageUrl} alt="element" className="w-4 h-4 object-contain rounded" />
                            ) : (
                              <span>{e.emoji}</span>
                            )}
                            <span className="max-w-[80px] truncate text-[11px]">{e.emoji}</span>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                removeEmoji(e.id);
                              }}
                              className="text-red-600 hover:text-red-800 hover:bg-red-100 rounded-full p-0.5 ml-0.5 transition"
                              title="حذف"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    {/* Controls Panel for Selected Active Element */}
                    {activeItem && (
                      <div className="p-3 bg-white rounded-xl border border-amber-300/80 shadow-xs space-y-3 mt-2">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center font-bold text-lg">
                              {activeItem.type === 'image' && activeItem.imageUrl ? (
                                <img src={activeItem.imageUrl} alt="preview" className="w-6 h-6 object-contain" />
                              ) : (
                                <span>{activeItem.emoji}</span>
                              )}
                            </div>
                            <div>
                              <span className="text-xs font-extrabold text-slate-900 block">{activeItem.emoji || 'العنصر المختار'}</span>
                              <span className="text-[10px] text-slate-500">
                                {activeItem.layer === 'below-text' ? 'طبقة أسفل النص (خلفية)' : 'طبقة أعلى النص'}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => duplicateEmojiItem(activeItem.id)}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                              title="تكرار العنصر"
                            >
                              <Copy className="w-3 h-3" />
                              <span>تكرار</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => removeEmoji(activeItem.id)}
                              className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                              title="حذف العنصر"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>حذف</span>
                            </button>
                          </div>
                        </div>

                        {/* Control 1: Layer Position (أسفل / أعلى عبارات الشهادة) */}
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-slate-800 block">مستوى ظهور العنصر (الطبقات):</label>
                          <div className="grid grid-cols-2 gap-1.5">
                            <button
                              type="button"
                              onClick={() => updateEmojiItem(activeItem.id, { layer: 'above-text' })}
                              className={`py-1.5 px-2 text-xs font-bold rounded-lg border transition flex items-center justify-center gap-1 cursor-pointer ${
                                (activeItem.layer || 'above-text') === 'above-text'
                                  ? 'bg-amber-500 text-slate-950 border-amber-600 font-extrabold'
                                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              <span>✨ أعلى عبارات الشهادة</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => updateEmojiItem(activeItem.id, { layer: 'below-text' })}
                              className={`py-1.5 px-2 text-xs font-bold rounded-lg border transition flex items-center justify-center gap-1 cursor-pointer ${
                                activeItem.layer === 'below-text'
                                  ? 'bg-indigo-600 text-white border-indigo-700 font-extrabold'
                                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              <span>📜 أسفل عبارات الشهادة (خلفية)</span>
                            </button>
                          </div>
                        </div>

                        {/* Control 2: Opacity / Transparency (الشفافية وتدريج الظهور) */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-800">درجة الشفافية (Opacity):</span>
                            <span className="font-mono text-amber-700 font-extrabold">{Math.round((activeItem.opacity ?? 1) * 100)}%</span>
                          </div>
                          <input
                            type="range"
                            min="0.05"
                            max="1"
                            step="0.05"
                            value={activeItem.opacity ?? 1}
                            onChange={(e) => updateEmojiItem(activeItem.id, { opacity: parseFloat(e.target.value) })}
                            className="w-full accent-amber-500 cursor-pointer"
                          />
                          <div className="flex justify-between items-center gap-1 text-[10px]">
                            <button
                              type="button"
                              onClick={() => updateEmojiItem(activeItem.id, { opacity: 0.15 })}
                              className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-600 cursor-pointer"
                            >
                              15% (شفاف جدا)
                            </button>
                            <button
                              type="button"
                              onClick={() => updateEmojiItem(activeItem.id, { opacity: 0.40 })}
                              className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-600 cursor-pointer"
                            >
                              40% (متوسط)
                            </button>
                            <button
                              type="button"
                              onClick={() => updateEmojiItem(activeItem.id, { opacity: 0.75 })}
                              className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-600 cursor-pointer"
                            >
                              75% (واضح)
                            </button>
                            <button
                              type="button"
                              onClick={() => updateEmojiItem(activeItem.id, { opacity: 1.0 })}
                              className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-600 cursor-pointer"
                            >
                              100% (كامل)
                            </button>
                          </div>
                        </div>

                        {/* Control 3: Scale / Size (تكبير وتصغير) */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-800">حجم العنصر (التكبير والتصغير):</span>
                            <span className="font-mono text-amber-700 font-extrabold">{activeItem.size}px</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => updateEmojiItem(activeItem.id, { size: Math.max(16, activeItem.size - 6) })}
                              className="w-7 h-7 bg-slate-100 hover:bg-amber-200 text-slate-800 font-bold rounded-lg flex items-center justify-center cursor-pointer shrink-0"
                              title="تصغير"
                            >
                              -
                            </button>
                            <input
                              type="range"
                              min="16"
                              max="240"
                              step="2"
                              value={activeItem.size}
                              onChange={(e) => updateEmojiItem(activeItem.id, { size: parseInt(e.target.value) })}
                              className="w-full accent-amber-500 cursor-pointer"
                            />
                            <button
                              type="button"
                              onClick={() => updateEmojiItem(activeItem.id, { size: Math.min(240, activeItem.size + 6) })}
                              className="w-7 h-7 bg-slate-100 hover:bg-amber-200 text-slate-800 font-bold rounded-lg flex items-center justify-center cursor-pointer shrink-0"
                              title="تكبير"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* Control 4: Free Positioning X & Y sliders + Nudge Arrows */}
                        <div className="space-y-2 pt-1 border-t border-slate-100">
                          <span className="text-xs font-bold text-slate-800 block">الموقع الدقيق (بدون التأثير على العناصر الأخرى):</span>
                          
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <div className="flex justify-between text-[11px] font-bold text-slate-600 mb-0.5">
                                <span>أفقي (X):</span>
                                <span className="font-mono text-amber-700">{activeItem.x}%</span>
                              </div>
                              <input
                                type="range"
                                min="0"
                                max="95"
                                value={activeItem.x}
                                onChange={(e) => updateEmojiItem(activeItem.id, { x: parseInt(e.target.value) })}
                                className="w-full accent-amber-500 cursor-pointer"
                              />
                            </div>

                            <div>
                              <div className="flex justify-between text-[11px] font-bold text-slate-600 mb-0.5">
                                <span>رأسي (Y):</span>
                                <span className="font-mono text-amber-700">{activeItem.y}%</span>
                              </div>
                              <input
                                type="range"
                                min="0"
                                max="95"
                                value={activeItem.y}
                                onChange={(e) => updateEmojiItem(activeItem.id, { y: parseInt(e.target.value) })}
                                className="w-full accent-amber-500 cursor-pointer"
                              />
                            </div>
                          </div>

                          {/* Quick Arrow Nudge Pad */}
                          <div className="flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-200">
                            <span className="text-[11px] font-bold text-slate-700">تحريك دقيق بالأسهم:</span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => updateEmojiItem(activeItem.id, { y: Math.max(0, activeItem.y - 1) })}
                                className="p-1.5 bg-white hover:bg-amber-100 border border-slate-200 rounded-lg text-slate-800 transition cursor-pointer"
                                title="تحريك لأعلى"
                              >
                                ⬆️
                              </button>
                              <button
                                type="button"
                                onClick={() => updateEmojiItem(activeItem.id, { y: Math.min(95, activeItem.y + 1) })}
                                className="p-1.5 bg-white hover:bg-amber-100 border border-slate-200 rounded-lg text-slate-800 transition cursor-pointer"
                                title="تحريك لأسفل"
                              >
                                ⬇️
                              </button>
                              <button
                                type="button"
                                onClick={() => updateEmojiItem(activeItem.id, { x: Math.max(0, activeItem.x - 1) })}
                                className="p-1.5 bg-white hover:bg-amber-100 border border-slate-200 rounded-lg text-slate-800 transition cursor-pointer"
                                title="تحريك لليمين"
                              >
                                ➡️
                              </button>
                              <button
                                type="button"
                                onClick={() => updateEmojiItem(activeItem.id, { x: Math.min(95, activeItem.x + 1) })}
                                className="p-1.5 bg-white hover:bg-amber-100 border border-slate-200 rounded-lg text-slate-800 transition cursor-pointer"
                                title="تحريك لليسار"
                              >
                                ⬅️
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Control 5: Rotation Angle */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-800">زاوية الدوران (Rotation):</span>
                            <span className="font-mono text-amber-700 font-extrabold">{activeItem.rotation || 0}°</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="range"
                              min="-180"
                              max="180"
                              value={activeItem.rotation || 0}
                              onChange={(e) => updateEmojiItem(activeItem.id, { rotation: parseInt(e.target.value) })}
                              className="w-full accent-amber-500 cursor-pointer"
                            />
                            <button
                              type="button"
                              onClick={() => updateEmojiItem(activeItem.id, { rotation: 0 })}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded cursor-pointer shrink-0"
                            >
                              إعادة 0°
                            </button>
                          </div>
                        </div>

                        {/* Control 6: Blend Mode */}
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-slate-800 block">تأثير الدمج البصري (Blend Mode):</label>
                          <select
                            value={activeItem.blendMode || 'normal'}
                            onChange={(e) => updateEmojiItem(activeItem.id, { blendMode: e.target.value as any })}
                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-amber-500 cursor-pointer"
                          >
                            <option value="normal">عادي (Normal)</option>
                            <option value="multiply">مضاعف (Multiply - مدمج مع الخلفية)</option>
                            <option value="screen">مضيء (Screen)</option>
                            <option value="overlay">منقوش (Overlay)</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

          </div>
        )}

        {/* TAB: VERIFICATION BOX CUSTOMIZATION */}
        {activeTab === 'verification' && (
          <div className="space-y-5">
            {/* Header Banner */}
            <div className={`text-white p-4 rounded-2xl shadow-md border flex items-center justify-between gap-3 ${
              isVerificationBoxLocked 
                ? 'bg-gradient-to-r from-amber-950 via-slate-900 to-slate-900 border-amber-500/50' 
                : 'bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 border-slate-800'
            }`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-amber-300 font-['Cairo'] flex items-center gap-1.5">
                    <span>تخصيص مربع التوثيق والرمز الرقمي</span>
                    {isVerificationBoxLocked && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-slate-950">
                        <Lock className="w-3 h-3" />
                        <span>مقفل بموجب إعدادات النظام</span>
                      </span>
                    )}
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    التحكم الكامل بأنماط وقوالب وألوان وإظهار/إخفاء أجزاء مربع التوثيق على الشهادة.
                  </p>
                </div>
              </div>
              <label className={`relative inline-flex items-center cursor-pointer shrink-0 ${isVerificationBoxLocked ? 'pointer-events-none opacity-50' : ''}`}>
                <input
                  type="checkbox"
                  disabled={isVerificationBoxLocked}
                  checked={(certificateData.showVerificationBox ?? certificateData.showQrCode ?? true)}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    onChange({
                      ...certificateData,
                      showVerificationBox: checked,
                      showQrCode: checked,
                      updatedAt: new Date().toISOString()
                    });
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>

            {((certificateData.showVerificationBox ?? certificateData.showQrCode ?? true)) ? (
              <div className={`space-y-5 ${isVerificationBoxLocked ? 'pointer-events-none opacity-60' : ''}`}>
                {/* 1. Template Patterns Selection */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b pb-2 border-slate-100">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <LayoutGrid className="w-4 h-4 text-amber-500" />
                      اختر نمط وقالب مربع التوثيق (Template Patterns)
                    </span>
                    <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full font-bold">
                      7 قوالب معتمدة
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    {[
                      {
                        id: 'classic',
                        title: 'البطاقة المعتمدة الكلاسيكية',
                        desc: 'النمط المعتمد الرسمي كارت أبيض مع QR وباركود معتمد',
                        badge: 'كلاسيكي'
                      },
                      {
                        id: 'modern-card',
                        title: 'كارت عصري برأسية حماية',
                        desc: 'شريط حماية ملون في الأعلى وترتيب أنيق ومقسم',
                        badge: 'عصري'
                      },
                      {
                        id: 'seal-stamp',
                        title: 'ختم التوثيق الذهبي المضلّع',
                        desc: 'إطار مضلع مميز يشبه أختام التوثيق والاعتماد الرسمية',
                        badge: 'رسمي'
                      },
                      {
                        id: 'barcode-focus',
                        title: 'تركيز الباركود الشريطي',
                        desc: 'عرض أفقي ممتد يُبرز الباركود الكودي برقم المرجع',
                        badge: 'تقني'
                      },
                      {
                        id: 'minimal-pill',
                        title: 'كبسولة مصغرة خفيفة',
                        desc: 'تصميم مدمج دائري الحواف بحجم أصغر ومظهر ناعم',
                        badge: 'مبسط'
                      },
                      {
                        id: 'glass-card',
                        title: 'بطاقة زجاجية شفافة (Glassmorphism)',
                        desc: 'تأثير زجاجي شفاف فاخر بأطراف مضيئة خفيفة',
                        badge: 'فاخر'
                      },
                      {
                        id: 'certificate-tag',
                        title: 'بطاقة تعريفية معلقة (Certificate Tag)',
                        desc: 'بطاقة معلقة مع فتحة تعليق علوية وشريط تثبيت',
                        badge: 'شارة'
                      }
                    ].map((pattern) => {
                      const isSelected = (certificateData.verificationBoxPattern || 'classic') === pattern.id;
                      return (
                        <button
                          key={pattern.id}
                          onClick={() => updateField('verificationBoxPattern', pattern.id as any)}
                          className={`p-3 rounded-xl border-2 text-right transition flex flex-col justify-between gap-2 relative ${
                            isSelected
                              ? 'border-amber-500 bg-amber-50/70 shadow-xs ring-1 ring-amber-400'
                              : 'border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-start justify-between w-full">
                            <span className="text-xs font-bold text-slate-900 leading-tight">
                              {pattern.title}
                            </span>
                            <span
                              className={`text-[9px] px-1.5 py-0.5 rounded font-extrabold shrink-0 me-1 ${
                                isSelected
                                  ? 'bg-amber-500 text-slate-950'
                                  : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              {pattern.badge}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 leading-relaxed">
                            {pattern.desc}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Show/Hide Individual Components */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                  <div className="border-b pb-2 border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <SlidersHorizontal className="w-4 h-4 text-amber-500" />
                      إظهار أو إخفاء عناصر وأجزاء مربع التوثيق
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    {/* Toggle QR Code */}
                    <label className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 cursor-pointer hover:bg-amber-50/40 transition">
                      <span className="flex items-center gap-2">
                        <QrCode className="w-4 h-4 text-slate-600" />
                        رمز QR للتحقق الرقمي
                      </span>
                      <input
                        type="checkbox"
                        checked={certificateData.showVerificationQr ?? true}
                        onChange={(e) => updateField('showVerificationQr', e.target.checked)}
                        className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                      />
                    </label>

                    {/* Toggle Barcode */}
                    <label className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 cursor-pointer hover:bg-amber-50/40 transition">
                      <span className="flex items-center gap-2">
                        <ScanLine className="w-4 h-4 text-slate-600" />
                        الباركود الشريطي (Code 39)
                      </span>
                      <input
                        type="checkbox"
                        checked={certificateData.showVerificationBarcode ?? true}
                        onChange={(e) => updateField('showVerificationBarcode', e.target.checked)}
                        className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                      />
                    </label>

                    {/* Toggle Serial Code */}
                    <label className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 cursor-pointer hover:bg-amber-50/40 transition">
                      <span className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-600" />
                        الرقم التسلسلي / كود المرجع
                      </span>
                      <input
                        type="checkbox"
                        checked={certificateData.showVerificationSerialCode ?? true}
                        onChange={(e) => updateField('showVerificationSerialCode', e.target.checked)}
                        className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                      />
                    </label>

                    {/* Toggle Status Text */}
                    <label className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 cursor-pointer hover:bg-amber-50/40 transition">
                      <span className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        عبارة حالة التوثيق
                      </span>
                      <input
                        type="checkbox"
                        checked={certificateData.showVerificationStatusText ?? true}
                        onChange={(e) => updateField('showVerificationStatusText', e.target.checked)}
                        className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                      />
                    </label>

                    {/* Toggle Icon */}
                    <label className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 cursor-pointer hover:bg-amber-50/40 transition">
                      <span className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-amber-600" />
                        أيقونة الحماية / الدرع
                      </span>
                      <input
                        type="checkbox"
                        checked={certificateData.showVerificationIcon ?? true}
                        onChange={(e) => updateField('showVerificationIcon', e.target.checked)}
                        className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                      />
                    </label>
                  </div>
                </div>

                {/* 3. Text & Content Control */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                  <div className="border-b pb-2 border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <ScanLine className="w-4 h-4 text-amber-500" />
                      تخصيص نظام وبادئة كود التوثيق
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                      A-Z & 0-9 فقط
                    </span>
                  </div>

                  <div className="space-y-3 pt-1">
                    {/* Prefix Input & Quick Presets */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        بادئة الكود الافتراضية (Code Prefix):
                      </label>
                      <input
                        type="text"
                        value={certificateData.verificationPrefix ?? 'TAQDEER'}
                        onChange={(e) => {
                          const cleanPrefix = sanitizeVerificationCode(e.target.value).replace(/[^A-Z0-9]/g, '');
                          updateField('verificationPrefix', cleanPrefix);
                        }}
                        placeholder="مثال: TAQDEER أو CERT أو ACAD"
                        className="w-full px-3 py-1.5 text-xs font-mono font-bold border border-slate-300 rounded-lg bg-white uppercase tracking-wider"
                      />
                      {/* Quick Presets Chips */}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <span className="text-[10px] font-bold text-slate-500 my-auto me-1">نماذج جاهزة:</span>
                        {['TAQDEER', 'CERT', 'ACAD', 'SCHOOL', 'TQ', 'VERIFY', 'REF'].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => {
                              updateField('verificationPrefix', preset);
                              const newCode = generateVerificationCode(undefined, {
                                prefix: preset,
                                pattern: certificateData.verificationCodePattern,
                                forceNew: true
                              });
                              updateField('verificationCode', newCode);
                              updateField('certNumber', newCode);
                            }}
                            className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-md border transition ${
                              (certificateData.verificationPrefix ?? 'TAQDEER') === preset
                                ? 'bg-amber-500 text-white border-amber-600 shadow-2xs'
                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Pattern Selector */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        طريقة ونظام توليد الكود (Generation Pattern):
                      </label>
                      <select
                        value={certificateData.verificationCodePattern ?? 'prefix-year-random'}
                        onChange={(e) => {
                          const pat = e.target.value as any;
                          updateField('verificationCodePattern', pat);
                          const newCode = generateVerificationCode(undefined, {
                            prefix: certificateData.verificationPrefix,
                            pattern: pat,
                            forceNew: true
                          });
                          updateField('verificationCode', newCode);
                          updateField('certNumber', newCode);
                        }}
                        className="w-full px-2.5 py-1.5 text-xs font-bold border border-slate-300 rounded-lg bg-white"
                      >
                        <option value="prefix-year-random">بادئة + السنة + 6 حروف عشوائية (مثال: TAQDEER-2026-X89F2A)</option>
                        <option value="prefix-random">بادئة + 8 حروف وعشرات عشوائية (مثال: TAQDEER-8X92M14P)</option>
                        <option value="prefix-date-serial">بادئة + التاريخ كامل + 4 أرقام (مثال: TAQDEER-20260812-7821)</option>
                        <option value="numbers-only">أرقام إنجليزية فقط (مثال: 2026-8920-1492)</option>
                        <option value="prefix-seq">بادئة + 6 أرقام تسلسلية (مثال: TAQDEER-004829)</option>
                      </select>
                    </div>

                    {/* Regenerate Button */}
                    <button
                      type="button"
                      onClick={() => {
                        const newCode = generateVerificationCode(undefined, {
                          prefix: certificateData.verificationPrefix,
                          pattern: certificateData.verificationCodePattern,
                          forceNew: true
                        });
                        onChange({
                          ...certificateData,
                          verificationCode: newCode,
                          certNumber: newCode,
                          updatedAt: new Date().toISOString()
                        });
                      }}
                      className="w-full py-2.5 px-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer"
                    >
                      <RefreshCw className="w-4 h-4 text-slate-900" />
                      <span>توليد كود توثيق جديد الآن (Generate New Code)</span>
                    </button>

                    {/* Active Verification Code Input */}
                    <div className="pt-2 border-t border-slate-100">
                      <label className="block text-[11px] font-bold text-slate-800 mb-1">
                        كود التوثيق الحالي بالشهادة (إنجليزي وأرقام فقط):
                      </label>
                      <input
                        type="text"
                        value={certificateData.verificationCode || certificateData.certNumber || ''}
                        onChange={(e) => {
                          const sanitized = sanitizeVerificationCode(e.target.value);
                          onChange({
                            ...certificateData,
                            verificationCode: sanitized,
                            certNumber: sanitized,
                            updatedAt: new Date().toISOString()
                          });
                        }}
                        placeholder="الكود التسلسلي (مثال: TAQDEER-2026-X89F2A)"
                        className="w-full px-3 py-1.5 text-xs font-mono font-black border border-amber-300 rounded-lg bg-amber-50/30 text-amber-950 focus:bg-white transition"
                      />
                      <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                        يتم تحويل الأرقام العربية تلقائياً إلى أرقام إنجليزية (0-9) والحروف إلى (A-Z) لمنع الخطأ في أجهزة الباركود.
                      </p>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        نص عبارة التوثيق (Verification Phrase):
                      </label>
                      <input
                        type="text"
                        value={certificateData.verificationBadgeText ?? 'شهادة موثقة رقمياً'}
                        onChange={(e) => updateField('verificationBadgeText', e.target.value)}
                        placeholder="عبارة التوثيق (مثال: شهادة موثقة رقمياً)"
                        className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* 4. Colors, Opacity & Size Customization */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                  <div className="border-b pb-2 border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Palette className="w-4 h-4 text-amber-500" />
                      تنسيق الألوان والشفافية والحجم
                    </span>
                  </div>

                  <div className="space-y-3.5 pt-1">
                    {/* Size Selector */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                        حجم مربع التوثيق:
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: 'sm', label: 'صغير (Compact)' },
                          { id: 'md', label: 'متوسط (Default)' },
                          { id: 'lg', label: 'كبير (Expanded)' }
                        ].map((sz) => (
                          <button
                            key={sz.id}
                            onClick={() => updateField('verificationBoxSize', sz.id as any)}
                            className={`py-1.5 text-xs font-bold rounded-lg border transition ${
                              (certificateData.verificationBoxSize || 'md') === sz.id
                                ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-2xs'
                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {sz.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Color Controls */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          لون الخلفية:
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={certificateData.verificationBoxBgColor || '#ffffff'}
                            onChange={(e) => updateField('verificationBoxBgColor', e.target.value)}
                            className="w-8 h-8 rounded border border-slate-300 cursor-pointer"
                          />
                          <button
                            onClick={() => updateField('verificationBoxBgColor', undefined)}
                            className="text-[10px] text-slate-500 underline hover:text-slate-800"
                          >
                            تلقائي
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          لون الإطار:
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={certificateData.verificationBoxBorderColor || '#cbd5e1'}
                            onChange={(e) => updateField('verificationBoxBorderColor', e.target.value)}
                            className="w-8 h-8 rounded border border-slate-300 cursor-pointer"
                          />
                          <button
                            onClick={() => updateField('verificationBoxBorderColor', undefined)}
                            className="text-[10px] text-slate-500 underline hover:text-slate-800"
                          >
                            تلقائي
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          لون النصوص:
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={certificateData.verificationBoxTextColor || '#0f172a'}
                            onChange={(e) => updateField('verificationBoxTextColor', e.target.value)}
                            className="w-8 h-8 rounded border border-slate-300 cursor-pointer"
                          />
                          <button
                            onClick={() => updateField('verificationBoxTextColor', undefined)}
                            className="text-[10px] text-slate-500 underline hover:text-slate-800"
                          >
                            تلقائي
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Opacity Slider */}
                    <div>
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 mb-1">
                        <span>شفافية المربع:</span>
                        <span>{Math.round((certificateData.verificationBoxBgOpacity ?? 1) * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="1.0"
                        step="0.05"
                        value={certificateData.verificationBoxBgOpacity ?? 1}
                        onChange={(e) => updateField('verificationBoxBgOpacity', parseFloat(e.target.value))}
                        className="w-full accent-amber-500 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* 5. Movement and Granular Offsets for Verification Box */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                  <div className="border-b pb-2 border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Move className="w-4 h-4 text-amber-500" />
                      تحريك عناصر مربع التوثيق (جماعي أو كل عنصر منفصل)
                    </span>
                  </div>

                  <div className="space-y-3 pt-1">
                    {/* Collective verification box movement */}
                    <OffsetPad
                      title="تحريك مربع التوثيق بالكامل"
                      subtitle="تحريك كافة محتويات مربع التوثيق ككتلة واحدة"
                      offsetX={certificateData.verificationTextOffsetX || 0}
                      offsetY={certificateData.verificationTextOffsetY || 0}
                      onChangeX={(val) => updateField('verificationTextOffsetX', val)}
                      onChangeY={(val) => updateField('verificationTextOffsetY', val)}
                      onReset={() => onChange({ ...certificateData, verificationTextOffsetX: 0, verificationTextOffsetY: 0, updatedAt: new Date().toISOString() })}
                    />

                    {/* Sub-element granular movement */}
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2.5">
                      <span className="text-[11px] font-bold text-slate-800 block">
                        🎯 تحريك كل عنصر من مربع التوثيق على حدة:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <OffsetPad
                          title="تحريك رمز الاستجابة (QR)"
                          subtitle="تحريك مربع رمز QR"
                          offsetX={certificateData.verificationQrOffsetX || 0}
                          offsetY={certificateData.verificationQrOffsetY || 0}
                          onChangeX={(val) => updateField('verificationQrOffsetX', val)}
                          onChangeY={(val) => updateField('verificationQrOffsetY', val)}
                          onReset={() => onChange({ ...certificateData, verificationQrOffsetX: 0, verificationQrOffsetY: 0, updatedAt: new Date().toISOString() })}
                        />
                        <OffsetPad
                          title="تحريك الباركود الشريطي"
                          subtitle="تحريك خطوط الباركود"
                          offsetX={certificateData.verificationBarcodeOffsetX || 0}
                          offsetY={certificateData.verificationBarcodeOffsetY || 0}
                          onChangeX={(val) => updateField('verificationBarcodeOffsetX', val)}
                          onChangeY={(val) => updateField('verificationBarcodeOffsetY', val)}
                          onReset={() => onChange({ ...certificateData, verificationBarcodeOffsetX: 0, verificationBarcodeOffsetY: 0, updatedAt: new Date().toISOString() })}
                        />
                        <OffsetPad
                          title="تحريك كود/رقم الشهادة"
                          subtitle="تحريك نص الكود التسلسلي"
                          offsetX={certificateData.verificationSerialOffsetX || 0}
                          offsetY={certificateData.verificationSerialOffsetY || 0}
                          onChangeX={(val) => updateField('verificationSerialOffsetX', val)}
                          onChangeY={(val) => updateField('verificationSerialOffsetY', val)}
                          onReset={() => onChange({ ...certificateData, verificationSerialOffsetX: 0, verificationSerialOffsetY: 0, updatedAt: new Date().toISOString() })}
                        />
                        <OffsetPad
                          title="تحريك عبارة التوثيق"
                          subtitle="تحريك نص (شهادة موثقة رقمياً)"
                          offsetX={certificateData.verificationPhraseOffsetX || 0}
                          offsetY={certificateData.verificationPhraseOffsetY || 0}
                          onChangeX={(val) => updateField('verificationPhraseOffsetX', val)}
                          onChangeY={(val) => updateField('verificationPhraseOffsetY', val)}
                          onReset={() => onChange({ ...certificateData, verificationPhraseOffsetX: 0, verificationPhraseOffsetY: 0, updatedAt: new Date().toISOString() })}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 6. Save Verification Settings as Default */}
                <div className="p-3.5 bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border border-amber-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-right">
                    <h5 className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                      <Save className="w-4 h-4 text-amber-600" />
                      حفظ إعدادات مربع التوثيق كافتراضي
                    </h5>
                    <p className="text-[10px] text-amber-800 mt-0.5">
                      سيتم تطبيق نفس النموذج، الألوان، الشفافية والبادئة تلقائياً على جميع الشهادات الجديدة.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const currentDefaults = getSavedDefaultSettings();
                      const updatedDefaults = {
                        ...currentDefaults,
                        verificationBoxPattern: certificateData.verificationBoxPattern,
                        showVerificationQr: certificateData.showVerificationQr,
                        showVerificationBarcode: certificateData.showVerificationBarcode,
                        showVerificationSerialCode: certificateData.showVerificationSerialCode,
                        showVerificationStatusText: certificateData.showVerificationStatusText,
                        showVerificationIcon: certificateData.showVerificationIcon,
                        verificationBadgeText: certificateData.verificationBadgeText,
                        verificationPrefix: certificateData.verificationPrefix,
                        verificationCodePattern: certificateData.verificationCodePattern,
                        verificationBoxBgColor: certificateData.verificationBoxBgColor,
                        verificationBoxTextColor: certificateData.verificationBoxTextColor,
                        verificationBoxBorderColor: certificateData.verificationBoxBorderColor,
                        verificationBoxBgOpacity: certificateData.verificationBoxBgOpacity,
                        verificationBoxSize: certificateData.verificationBoxSize,
                      };
                      saveDefaultSettingsToStorage(updatedDefaults);
                      alert('تم حفظ إعدادات مربع التوثيق كافتراضي لجميع الشهادات القادمة بنجاح! ✨');
                    }}
                    className="w-full sm:w-auto px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <BookmarkCheck className="w-4 h-4" />
                    حفظ كافتراضي 💾
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <h4 className="text-xs font-bold text-slate-700">مربع التوثيق مخفي حالياً</h4>
                <p className="text-[11px] text-slate-500 mt-1">
                  قم بتفعيل المفتاح العلوي لإظهار وتخصيص مربع التوثيق والباركود على الشهادة.
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 7: EXPORT & SHARE */}
        {activeTab === 'export' && (
          <div className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl">
              <h4 className="text-xs font-bold text-emerald-900 flex items-center gap-2">
                <Download className="w-4 h-4 text-emerald-600" />
                خيارات التصدير والطباعة فائقة الدقة
              </h4>
              <p className="text-[11px] text-emerald-800 mt-1">
                احصل على النسخة جاهزة للطباعة الفورية أو المشاركة المباشرة عبر البريد والواتساب.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {certificateData.isSavedCloud && onUpdateCloudCertificate ? (
                <>
                  <button
                    onClick={onUpdateCloudCertificate}
                    className="flex items-center justify-center gap-2 p-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-xs shadow-md transition sm:col-span-2 cursor-pointer"
                  >
                    <Cloud className="w-4 h-4" />
                    <span>حفظ التعديلات الحالية على الشهادة بالسحابة ☁️✅</span>
                  </button>

                  {onSaveToCloud && (
                    <button
                      onClick={onSaveToCloud}
                      className="flex items-center justify-center gap-2 p-3 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold text-xs shadow-2xs transition sm:col-span-2 cursor-pointer"
                    >
                      <Cloud className="w-4 h-4" />
                      <span>حفظ كنسخة جديدة في المكتبة السحابية ➕</span>
                    </button>
                  )}
                </>
              ) : onSaveToCloud ? (
                <button
                  onClick={onSaveToCloud}
                  className="flex items-center justify-center gap-2 p-3.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-black text-xs shadow-md transition sm:col-span-2 cursor-pointer"
                >
                  <Cloud className="w-4 h-4" />
                  <span>حفظ كشهادة جديدة في المكتبة السحابية ☁️✨</span>
                </button>
              ) : null}

              {onOpenGoogleDriveModal && (
                <button
                  onClick={onOpenGoogleDriveModal}
                  className="flex items-center justify-center gap-2 p-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 rounded-xl font-black text-xs shadow-md transition sm:col-span-2 cursor-pointer"
                >
                  <Cloud className="w-4 h-4" />
                  <span>حفظ الشهادة وتفعيل التوثيق على Google Drive ☁️</span>
                </button>
              )}

              {onPrint && (
                <button
                  onClick={onPrint}
                  className="flex items-center justify-center gap-2 p-3 bg-amber-100 hover:bg-amber-200 text-slate-900 rounded-xl font-extrabold text-xs shadow-2xs transition sm:col-span-2 cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-amber-700" />
                  معاينة للطباعة المباشرة (نافذة المتصفح)
                </button>
              )}

              <button
                onClick={onExportPDF}
                className="flex items-center justify-center gap-2 p-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-2xs transition"
              >
                <Download className="w-4 h-4" />
                تصدير بصيغة PDF عالية الدقة
              </button>

              <button
                onClick={onExportImage}
                className="flex items-center justify-center gap-2 p-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs shadow-2xs transition"
              >
                <ImageIcon className="w-4 h-4" />
                حفظ كصورة PNG فائقة الجودة
              </button>

              <button
                onClick={onShareEmail}
                className="flex items-center justify-center gap-2 p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs shadow-2xs transition"
              >
                <Mail className="w-4 h-4" />
                إرسال بالبريد الإلكتروني مباشر
              </button>

              <button
                onClick={onShareWhatsApp || onShareEmail}
                className="flex items-center justify-center gap-2 p-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-2xs transition cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                مشاركة عبر WhatsApp
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Signature Modal */}
      <SignaturePadModal
        isOpen={isSignatureModalOpen}
        onClose={() => setIsSignatureModalOpen(false)}
        onSaveSignature={handleSaveSignature}
        existingSignature={editingSignature}
      />

      {/* Template Gallery Grid Modal */}
      <TemplateGalleryModal
        isOpen={isGalleryModalOpen}
        onClose={() => setIsGalleryModalOpen(false)}
        onSelectTemplate={(template) => applyPresetTemplate(template.id)}
        currentTemplateId={certificateData.templateId}
        onShowToast={(msg) => setDefaultSettingsNotice(msg)}
      />

      {/* Logo Crop & Editing Modal */}
      {certificateData.logoUrl && (
        <LogoCropModal
          isOpen={isLogoCropModalOpen}
          imageUrl={certificateData.logoUrl}
          onClose={() => setIsLogoCropModalOpen(false)}
          onSave={(croppedUrl) => {
            onChange({
              ...certificateData,
              logoUrl: croppedUrl,
              updatedAt: new Date().toISOString()
            });
            setIsLogoCropModalOpen(false);
            setLogoActionNotice('تم اقتصاص وتحديث الشعار بنجاح ✨');
            setTimeout(() => setLogoActionNotice(null), 4000);
          }}
        />
      )}

    </div>
  );
};
