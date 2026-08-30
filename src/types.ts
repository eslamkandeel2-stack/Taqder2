export type FontOption = 
  | 'Cairo' 
  | 'Amiri' 
  | 'Tajawal' 
  | 'Almarai' 
  | 'Aref Ruqaa' 
  | 'Reem Kufi' 
  | 'Changa'
  | 'El Messiri'
  | 'Lalezar'
  | 'Kufam'
  | 'Scheherazade New'
  | 'Vazirmatn'
  | 'Harmattan'
  | 'Marhey';

export type AspectRatioOption = 'A4-landscape' | 'A4-portrait' | 'square';

export type BadgeIconType = 'award' | 'star' | 'trophy' | 'crown' | 'shield' | 'heart' | 'sparkles' | 'book' | 'target' | 'medal';

export type BadgeBgShape = 
  | 'pill'          // كبسولة دائرية انسيابية
  | 'rounded'       // مستطيل بحواف مستديرة
  | 'banner'        // شريط ملكي بشريطين جانبيين
  | 'square'        // إطار أنيق بزوايا قائمة
  | 'ornate'        // إطار زخرفي محدد
  | 'minimal'       // إطار خطي ناعم
  | 'none';         // بدون خلفية (نص فقط)

export type BadgeBgShadow = 
  | 'none' 
  | 'sm' 
  | 'md' 
  | 'lg' 
  | 'glow' 
  | 'gold-glow';

export type FrameStyle = 
  | 'double-gold' 
  | 'classic-ornate' 
  | 'modern-geometric' 
  | 'emerald-border' 
  | 'royal-ribbon' 
  | 'clean-minimal' 
  | 'playful-dots' 
  | 'islamic-arch'
  | 'baroque-gold'
  | 'vintage-certificate'
  | 'oriental-islamic'
  | 'luxurious-gradient-border'
  | 'wavy-artistic'
  | 'geometric-cyber'
  | 'guilloche-royal'
  | 'golden-vines'
  | 'andalusian-star'
  | 'floral-corners'
  | 'greek-key-meander'
  | 'moroccan-mosaic'
  | 'victorian-crest'
  | 'double-dotted-luxury';

export type LayoutPreset = 
  | 'classic-standard'      // تخطيط تقليدي متوازن (ترويسة كاملة، عنوان، متن، أختام، توقيعات)
  | 'modern-split'         // تخطيط عصري مقسم (توزيع متوازن وبارز)
  | 'sidebar-right'        // تخطيط الإطار الجانبي الأيمن
  | 'sidebar-left'         // تخطيط الإطار الجانبي الأيسر
  | 'minimal-centered'     // تخطيط مركز ومبسط
  | 'executive-horizontal' // تخطيط تنفيذي أفقي
  | 'diploma-grand'        // تخطيط دبلوم أكاديمي رفيع
  | 'custom-grid';         // تخطيط مخصص متقدم (Custom Layout)

export type VerificationBoxPattern = 
  | 'classic'         // البطاقة المعتمدة الكلاسيكية
  | 'modern-card'     // كارت عصري فاخر
  | 'seal-stamp'      // ختم التوثيق الذهبي الرسمي
  | 'barcode-focus'   // تركيز الباركود الأفقي
  | 'minimal-pill'    // كبسولة مصغرة دائرية
  | 'glass-card'      // بطاقة زجاجية شفافة احترافية
  | 'certificate-tag';// بطاقة تعريفية معلقة للشهادة

export type VerificationCodePattern = 
  | 'prefix-year-random'  // مثال: TAQDEER-2026-X89F2A (بادئة + سنة + عشوائي)
  | 'prefix-random'       // مثال: TAQDEER-8X92M14P (بادئة + رمزي عشوائي)
  | 'prefix-date-serial'  // مثال: TAQDEER-20260812-7821 (بادئة + تاريخ + تسلسلي)
  | 'numbers-only'        // مثال: 2026-8920-1492 (أرقام فقط بدون أحرف)
  | 'prefix-seq';         // مثال: TAQDEER-001082 (بادئة + تسلسل رقمي)

export type GradientType = 
  | 'none' 
  | 'linear-to-bottom' 
  | 'linear-to-right' 
  | 'radial-center' 
  | 'diagonal-gold' 
  | 'royal-mesh' 
  | 'luxury-sunset' 
  | 'emerald-glow' 
  | 'sapphire-glow'
  | 'custom';

export interface GradientConfig {
  enabled: boolean;
  type: GradientType;
  color1: string;
  color2: string;
  color3?: string;
  angle?: number; // 0 to 360 degrees
}

export interface SignatureItem {
  id: string;
  name: string;
  title: string;
  type: 'draw' | 'type' | 'upload';
  signatureText?: string;
  signatureUrl?: string;
  fontFamily?: string; // Signature font choice e.g. 'Aref Ruqaa', 'Great Vibes', etc.
  color?: string;      // Ink color e.g. '#0f172a', '#1e3a8a', '#b45309'
  show: boolean;
}

export interface StampItem {
  id: string;
  title: string;
  subtext: string;
  color: string;
  shape: 'circle' | 'square' | 'rectangle' | 'wax' | 'ribbon' | 'custom';
  imageUrl?: string; // Custom uploaded stamp image from device
  size?: 'sm' | 'md' | 'lg';
  opacity?: number; // Stamp opacity from 0.1 to 1.0
  textOffsetX?: number; // X offset in px (-100 to 100)
  textOffsetY?: number; // Y offset in px (-100 to 100)
  offsetX?: number; // X offset for whole stamp in px (-150 to 150)
  offsetY?: number; // Y offset for whole stamp in px (-150 to 150)
  show: boolean;
}

export interface EmojiItem {
  id: string;
  type?: 'emoji' | 'image';
  emoji: string;
  imageUrl?: string;
  x: number; // percentage
  y: number; // percentage
  size: number; // size in px
  opacity?: number; // 0.05 to 1.0 (default 1.0)
  rotation?: number; // degrees -180 to 180 (default 0)
  layer?: 'below-text' | 'above-text'; // 'below-text' or 'above-text'
  blendMode?: 'normal' | 'multiply' | 'screen' | 'overlay';
}

export interface TextElementStyle {
  fontSize?: number; // scale percentage e.g. 100 = 100%
  align?: 'right' | 'center' | 'left' | 'justify';
  fontFamily?: FontOption;
  fontWeight?: 'light' | 'normal' | 'bold' | 'extrabold';
  color?: string;
  marginTop?: number; // px
  marginBottom?: number; // px
  letterSpacing?: number;
}

export interface ElementStyles {
  title?: TextElementStyle;
  subtitle?: TextElementStyle;
  recipientIntro?: TextElementStyle;
  studentName?: TextElementStyle;
  grade?: TextElementStyle;
  schoolName?: TextElementStyle;
  schoolHeader?: TextElementStyle;
  subject?: TextElementStyle;
  appreciationText?: TextElementStyle;
  poemOrQuote?: TextElementStyle;
  dateLocation?: TextElementStyle;
  watermarkText?: TextElementStyle;
  badgeTitle?: TextElementStyle;
}

export interface ElementPosition {
  x: number; // percentage (0 to 100)
  y: number; // percentage (0 to 100)
}

export interface ElementPositions {
  logo?: ElementPosition;
  schoolHeader?: ElementPosition;
  dateLocation?: ElementPosition;
  titleBlock?: ElementPosition;
  recipientBlock?: ElementPosition;
  appreciationBlock?: ElementPosition;
  poemBlock?: ElementPosition;
  badge?: ElementPosition;
  stamp?: ElementPosition;
  qrCode?: ElementPosition;
  signaturesBlock?: ElementPosition;
}

export interface CertificateData {
  id: string;
  recipientGender?: 'male' | 'female'; // 'male' (طالب) | 'female' (طالبة)
  verificationCode?: string; // Unique Serial Barcode Code (e.g. TAQDEER-2026-X89F2A)
  title: string;
  subtitle: string;
  recipientIntro: string;
  studentName: string;
  grade: string;
  schoolName: string;
  headerLine1?: string;             // Top header Line 1 (e.g. "المملكة العربية السعودية")
  showHeaderLine1?: boolean;        // Default: true
  headerLine2?: string;             // Top header Line 2 (e.g. "وزارة التعليم / الجهة المعتمدة")
  showHeaderLine2?: boolean;        // Default: true
  headerLine3?: string;             // Top header Line 3 (e.g. "إدارة التعليم / الفرع الرئيسي")
  showHeaderLine3?: boolean;        // Default: false
  headerRightExtra?: string;        // Extra right line 4 (e.g. "مكتب التعليم الأهلية")
  showHeaderRightExtra?: boolean;   // Default: false
  showHeaderSchoolName?: boolean;   // Default: true
  headerVisionText?: string;        // Optional slogan / extra header phrase (e.g. "رؤية 2030")
  showHeaderVisionText?: boolean;   // Default: false
  showHeaderDate?: boolean;         // Default: true
  showHeaderPlace?: boolean;        // Default: true
  dateLabel?: string;               // Custom label for date (default: "التاريخ")
  placeLabel?: string;              // Custom label for place (default: "المكان")
  certNumber?: string;              // Certificate Reference / Serial Number
  certNumberLabel?: string;         // Custom label for serial number (default: "الرقم")
  showHeaderCertNumber?: boolean;   // Default: false
  headerLeftExtra1?: string;        // Extra Left Header Line 1
  showHeaderLeftExtra1?: boolean;   // Default: false
  headerLeftExtra2?: string;        // Extra Left Header Line 2
  showHeaderLeftExtra2?: boolean;   // Default: false
  showVerificationBadge?: boolean;  // Toggle for "شهادة موثقة رقمياً" phrase (default: true)
  verificationBadgeText?: string;   // Custom text for verification phrase (default: "شهادة موثقة رقمياً")
  subject: string;
  appreciationText: string;
  poemOrQuote: string;
  showPoemOrQuote?: boolean;        // Default: true - Toggle for poetic verse or quote
  issueDate: string;
  issuePlace: string;
  badgeTitle: string;
  badgeIcon: BadgeIconType;
  badgeUrl?: string; // Custom uploaded badge/medal image from device
  badgeType?: 'icon' | 'upload';
  badgeSize?: 'sm' | 'md' | 'lg';
  showBadgeTitle?: boolean;         // Toggle for showing/hiding badge title label under medal
  showBadge: boolean;
  // --- Badge / Medal Title Background Customization ---
  badgeBgShape?: BadgeBgShape;               // Background shape / style
  badgeBgColor?: string;                     // Primary background color
  badgeBgColor2?: string;                    // Secondary gradient color
  badgeBgGradient?: boolean;                 // Enable gradient fill
  badgeBgOpacity?: number;                   // Background opacity (0.1 to 1.0)
  badgeBgBorderColor?: string;               // Border color
  badgeBgBorderWidth?: number;               // Border width (0 to 6px)
  badgeBgBorderStyle?: 'solid' | 'dashed' | 'double' | 'none';
  badgeBgRadius?: number;                    // Corner radius in px (0 to 40)
  badgeBgWidthMode?: 'auto' | 'custom' | 'full'; // Width mode: auto-fit content, custom width px, or max width
  badgeBgWidthPx?: number;                   // Custom width in pixels (60 to 320px)
  badgeBgPaddingX?: number;                  // Horizontal padding (2 to 36px)
  badgeBgPaddingY?: number;                  // Vertical padding (1 to 20px)
  badgeBgShadow?: BadgeBgShadow;             // Shadow/glow preset
  badgeBgOffsetX?: number;                   // Background X offset (-100 to 100)
  badgeBgOffsetY?: number;                   // Background Y offset (-100 to 100)
  // --- Badge / Medal Title Text Customization ---
  badgeTextColor?: string;                   // Text font color (default '#ffffff')
  badgeTextFontSize?: number;                // Text font size in pixels (7 to 26px, default 10)
  badgeTextFontFamily?: FontOption;          // Custom font family for badge title
  badgeTextFontWeight?: 'normal' | 'bold' | 'extrabold' | 'black'; // Font weight
  badgeTextLetterSpacing?: number;           // Letter spacing in px (-1 to 4)
  badgeTextAlign?: 'center' | 'right' | 'left'; // Text alignment
  badgeTextOffsetX?: number;                 // Fine text X offset inside container (-50 to 50)
  badgeTextOffsetY?: number;                 // Fine text Y offset inside container (-50 to 50)
  badgeTextWrap?: 'nowrap' | 'wrap';         // Text wrapping mode
  badgeTextAutoFit?: boolean;                // Auto-fit / prevent overflow (bound inside box)
  signatures: SignatureItem[];
  stamp: StampItem;
  emojis: EmojiItem[];
  frameStyle: FrameStyle;
  customFrameUrl?: string;          // Custom uploaded image frame URL
  customFrameOpacity?: number;      // Custom frame opacity (0.1 to 1.0)
  borderColor?: string;          // Independent border primary color
  borderSecondaryColor?: string;  // Independent border secondary accent color
  borderWidth?: number;           // Border stroke width/thickness (1 to 10 scale, default 2)
  borderPadding?: number;         // Border inset distance from container edge (4 to 32px, default 12)
  canvasMarginTop?: number;       // Page content top margin in px (default 32)
  canvasMarginBottom?: number;    // Page content bottom margin in px (default 30)
  canvasMarginLeft?: number;      // Page content left margin in px (default 40)
  canvasMarginRight?: number;     // Page content right margin in px (default 40)
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  fontFamily: FontOption;
  fontSizeScale: number;
  headerFontFamily?: FontOption;    // Independent font family for top header (default: 'Cairo')
  headerFontSizeScale?: number;   // Independent font size scale for top header (default: 1.0)
  aspectRatio: AspectRatioOption;
  layoutPreset?: LayoutPreset;               // Dynamic CSS Grid Layout Preset
  customGridTemplateAreas?: string;          // User-defined CSS Grid Template Areas string (e.g. '"header header" "title title" "body stamps" "signatures signatures"')
  customGridTemplateColumns?: string;        // Optional custom grid template columns (e.g. "1fr 1fr", "220px 1fr")
  customGridTemplateRows?: string;           // Optional custom grid template rows (e.g. "auto auto 1fr auto")
  barcodeLinkTarget?: 'portal' | 'drive';    // Destination for QR/Barcode link: 'portal' (بوابة التحقق) or 'drive' (رابط جوجل درايف المباشر)
  qrCodeData: string;
  showQrCode: boolean;
  showVerificationBox?: boolean;             // Alias/sync for showing or hiding verification box
  verificationBoxPattern?: VerificationBoxPattern; // Style pattern for the box
  showVerificationQr?: boolean;              // Toggle QR code inside box (default: true)
  showVerificationBarcode?: boolean;         // Toggle Code39 barcode SVG (default: true)
  showVerificationSerialCode?: boolean;      // Toggle serial reference number (default: true)
  showVerificationStatusText?: boolean;      // Toggle status phrase ("توثيق معتمد" / "شهادة موثقة رقمياً")
  showVerificationIcon?: boolean;            // Toggle shield / checkmark icon
  verificationBoxBgColor?: string;           // Custom background color
  verificationBoxTextColor?: string;         // Custom text color
  verificationBoxBorderColor?: string;       // Custom border color
  verificationBoxBgOpacity?: number;         // Custom background opacity (0.10 to 1.0)
  verificationBoxSize?: 'sm' | 'md' | 'lg';  // Custom scale size for box
  verificationPrefix?: string;               // Custom prefix for code (e.g. "TAQDEER", "CERT", "ACAD", "SCHOOL", "TQ")
  verificationCodePattern?: VerificationCodePattern; // Generation pattern format
  verificationTextOffsetX?: number;          // X offset for text/elements inside verification box (-100 to 100)
  verificationTextOffsetY?: number;          // Y offset for text/elements inside verification box (-100 to 100)
  verificationQrOffsetX?: number;            // X offset for QR code element in verification box (-100 to 100)
  verificationQrOffsetY?: number;            // Y offset for QR code element in verification box (-100 to 100)
  verificationBarcodeOffsetX?: number;       // X offset for Barcode svg in verification box (-100 to 100)
  verificationBarcodeOffsetY?: number;       // Y offset for Barcode svg in verification box (-100 to 100)
  verificationSerialOffsetX?: number;        // X offset for Serial code text in verification box (-100 to 100)
  verificationSerialOffsetY?: number;        // Y offset for Serial code text in verification box (-100 to 100)
  verificationPhraseOffsetX?: number;        // X offset for Status Phrase text in verification box (-100 to 100)
  verificationPhraseOffsetY?: number;        // Y offset for Status Phrase text in verification box (-100 to 100)
  badgeBoxOffsetX?: number;                  // X offset for badge box/pill below badge title (-100 to 100)
  badgeBoxOffsetY?: number;                  // Y offset for badge box/pill below badge title (-100 to 100)
  badgeTitleOffsetX?: number;                // X offset for badge title label (-100 to 100)
  badgeTitleOffsetY?: number;                // Y offset for badge title label (-100 to 100)
  logoTextOffsetX?: number;                  // X offset for logo text/initial (-100 to 100)
  logoTextOffsetY?: number;                  // Y offset for logo text/initial (-100 to 100)
  headerTextOffsetX?: number;                // X offset for header lines text (-100 to 100)
  headerTextOffsetY?: number;                // Y offset for header lines text (-100 to 100)
  headerLine1OffsetX?: number;               // Independent X offset for Header Line 1 (-100 to 100)
  headerLine1OffsetY?: number;               // Independent Y offset for Header Line 1 (-100 to 100)
  headerLine2OffsetX?: number;               // Independent X offset for Header Line 2 (-100 to 100)
  headerLine2OffsetY?: number;               // Independent Y offset for Header Line 2 (-100 to 100)
  headerLine3OffsetX?: number;               // Independent X offset for Header Line 3 (-100 to 100)
  headerLine3OffsetY?: number;               // Independent Y offset for Header Line 3 (-100 to 100)
  headerSchoolNameOffsetX?: number;          // Independent X offset for School Name in header (-100 to 100)
  headerSchoolNameOffsetY?: number;          // Independent Y offset for School Name in header (-100 to 100)
  headerVisionTextOffsetX?: number;          // Independent X offset for Vision Logo / Extra Phrase (-100 to 100)
  headerVisionTextOffsetY?: number;          // Independent Y offset for Vision Logo / Extra Phrase (-100 to 100)
  headerRightExtraOffsetX?: number;          // Independent X offset for Right Extra line (-100 to 100)
  headerRightExtraOffsetY?: number;          // Independent Y offset for Right Extra line (-100 to 100)
  headerDateOffsetX?: number;                // Independent X offset for Date in header (-100 to 100)
  headerDateOffsetY?: number;                // Independent Y offset for Date in header (-100 to 100)
  headerPlaceOffsetX?: number;               // Independent X offset for Place in header (-100 to 100)
  headerPlaceOffsetY?: number;               // Independent Y offset for Place in header (-100 to 100)
  headerCertNumberOffsetX?: number;          // Independent X offset for Cert Number in header (-100 to 100)
  headerCertNumberOffsetY?: number;          // Independent Y offset for Cert Number in header (-100 to 100)
  headerLeftExtra1OffsetX?: number;          // Independent X offset for Left Extra line 1 (-100 to 100)
  headerLeftExtra1OffsetY?: number;          // Independent Y offset for Left Extra line 1 (-100 to 100)
  headerLeftExtra2OffsetX?: number;          // Independent X offset for Left Extra line 2 (-100 to 100)
  headerLeftExtra2OffsetY?: number;          // Independent Y offset for Left Extra line 2 (-100 to 100)
  titleOffsetX?: number;                     // Independent X offset for Certificate Title (-100 to 100)
  titleOffsetY?: number;                     // Independent Y offset for Certificate Title (-100 to 100)
  subtitleOffsetX?: number;                  // Independent X offset for Subtitle (-100 to 100)
  subtitleOffsetY?: number;                  // Independent Y offset for Subtitle (-100 to 100)
  recipientIntroOffsetX?: number;            // Independent X offset for Recipient Intro (-100 to 100)
  recipientIntroOffsetY?: number;            // Independent Y offset for Recipient Intro (-100 to 100)
  studentNameOffsetX?: number;               // Independent X offset for Student Name (-100 to 100)
  studentNameOffsetY?: number;               // Independent Y offset for Student Name (-100 to 100)
  gradeOffsetX?: number;                     // Independent X offset for Grade (-100 to 100)
  gradeOffsetY?: number;                     // Independent Y offset for Grade (-100 to 100)
  appreciationTextOffsetX?: number;          // Independent X offset for Appreciation Text (-100 to 100)
  appreciationTextOffsetY?: number;          // Independent Y offset for Appreciation Text (-100 to 100)
  poemOrQuoteOffsetX?: number;               // Independent X offset for Poem / Quote (-100 to 100)
  poemOrQuoteOffsetY?: number;               // Independent Y offset for Poem / Quote (-100 to 100)
  signaturesBlockOffsetX?: number;           // Independent X offset for Signatures Block (-100 to 100)
  signaturesBlockOffsetY?: number;           // Independent Y offset for Signatures Block (-100 to 100)
  showRecipientBox?: boolean;
  recipientBoxColor?: string;         // Hex color for Golden/Accent Recipient Box (default: '#f59e0b')
  recipientBoxOpacity?: number;       // Opacity for Golden/Accent Recipient Box (0.0 to 1.0, default: 0.12)
  recipientBoxBorderColor?: string;   // Border color for Golden/Accent Recipient Box
  recipientSpacing?: number;          // Spacing in px between student name and grade (0 to 32, default: 4)
  watermarkType?: 'text' | 'image' | 'none';
  watermarkText: string;
  watermarkImageUrl?: string;
  watermarkRotation?: number; // degrees e.g. -12, 0, -45, 90
  watermarkOpacity?: number;  // 0.01 to 0.50 (default 0.05)
  watermarkPattern?: 'center' | 'repeat' | 'diagonal-strip'; // wrap/layout mode
  watermarkSize?: number;     // scale percentage e.g. 50 - 200 (default 100)
  logoUrl?: string;
  logoSize?: 'sm' | 'md' | 'lg' | 'xl';
  logoSizePx?: number;                // Custom width/height in pixels (e.g. 24 - 240)
  logoShape?: 'circle' | 'square' | 'rounded' | 'none';
  logoPosition?: 'right' | 'center' | 'left';
  logoOffsetX?: number;               // Horizontal offset in px (-150 to 150)
  logoOffsetY?: number;               // Vertical offset in px (-100 to 100)
  logoRotation?: number;              // Rotation angle in degrees (0 - 360)
  logoOpacity?: number;               // Opacity (0.1 to 1.0)
  logoBgMode?: 'transparent' | 'white' | 'dark' | 'none';
  logoBorderWidth?: number;           // Border width in px (0 - 6)
  logoBorderColor?: string;           // Custom border color
  dateFormatMode?: 'hijri' | 'gregorian' | 'both'; // Default: 'both'
  issueDateHijri?: string;                          // e.g. "1447/02/25 هـ"
  issueDateGregorian?: string;                      // e.g. "2026/08/08 م"
  dateDisplayLayout?: 'single-line' | 'stacked';    // Layout for date when mode is 'both'
  bgImageUrl?: string;                              // Uploaded or selected custom background image URL
  bgOpacity?: number;                               // Background image opacity (0.05 to 1.0, default 1.0)
  bgBlur?: number;                                  // Background image blur in px (0 to 20)
  bgOverlayColor?: string;                          // Color tint overlay over background image
  bgOverlayOpacity?: number;                        // Color tint opacity (0.0 to 0.8)
  bgCardBacking?: boolean;                          // Semi-transparent card container behind text for legibility over busy backgrounds
  bgCardOpacity?: number;                           // Card container opacity (0.1 to 0.95)
  bgTextureUrl?: string;
  bgGradient?: GradientConfig;
  isSavedCloud: boolean;
  archivedAt?: string;                              // Auto-archival timestamp
  archiveDate?: string;                             // YYYY-MM-DD archival date
  academicYear?: string;                            // Academic Year (e.g. 2025 - 2026م)
  archiveStatus?: 'completed' | 'archived' | 'draft';
  archiveCategory?: string;
  archiveTags?: string[];
  driveFileId?: string;
  driveFileUrl?: string;
  driveFileWebViewLink?: string;
  driveUploadedAt?: string;
  createdAt: string;
  updatedAt: string;
  positions?: ElementPositions;
  elementStyles?: ElementStyles;
  isDragModeEnabled?: boolean;
  certificateId?: string;
  templateId?: string;
  reason?: string;
  courseTitle?: string;
}

export interface TemplatePreset {
  id: string;
  name: string;
  category: string;
  description: string;
  thumbnailGradient: string;
  defaultData: Partial<CertificateData>;
}

export interface StudentRecognitionRecord {
  id: string;
  studentName: string;
  grade: string;
  subject: string;
  awardTitle: string;
  date: string;
  status: 'تمت الطباعة' | 'معلق' | 'تمت المشاركة';
}

export interface ReminderTask {
  id: string;
  title: string;
  dueDate: string;
  dueTime?: string;
  priority: 'عالية' | 'متوسطة' | 'عادية';
  completed: boolean;
  category: 'تسليم شهادات' | 'مراجعة درجات' | 'حفل تكريم' | 'إعداد قوالب' | 'توثيق درايف' | 'مسابقات وإنجازات' | 'أخرى' | string;
  notes?: string;
  linkTab?: 'editor' | 'batch' | 'cloud' | 'verify' | 'ai' | 'settings';
  createdAt?: string;
  completedAt?: string;
}

export interface AnalyticsStats {
  totalCertificates: number;
  totalStudentsHonored: number;
  activeTemplates: number;
  topSubject: string;
}

export interface BatchRecord {
  id: string;
  title: string;
  grade: string;
  subject: string;
  templateType: 'current' | 'preset' | 'saved' | 'saved-template';
  templateId?: string;
  templateName?: string;
  createdAt: string;
  updatedAt: string;
  totalCount: number;
  certificates: CertificateData[];
  isVerifiedOnDrive?: boolean;
  driveFolderId?: string;
  driveFolderLink?: string;
  notes?: string;
}

export interface BatchVerificationReportItem {
  index: number;
  certificateId: string;
  studentName: string;
  gender?: 'male' | 'female';
  grade: string;
  subject: string;
  verificationCode: string;
  driveFileId?: string;
  driveFileWebViewLink?: string;
  driveFileUrl?: string;
  qrCodeData?: string;
  status: 'pending' | 'uploading' | 'verified' | 'failed';
  error?: string;
}

export interface StudentGroupMember {
  id: string;
  name: string;
  gender?: 'male' | 'female';
  grade?: string;
  subject?: string;
  notes?: string;
  customText?: string;
}

export interface StudentGroup {
  id: string;
  name: string; // e.g. "صف رابع - أ", "المتميزون في الرياضيات"
  description?: string;
  grade?: string; // e.g. "الصف الرابع الابتدائي"
  subject?: string; // e.g. "التفوق والتميز الأكاديمي"
  defaultGender?: 'male' | 'female' | 'mixed';
  students: StudentGroupMember[];
  createdAt: string;
  updatedAt: string;
  color?: string; // Hex color tag e.g. '#f59e0b', '#3b82f6', '#10b981'
}

export type ExportEngine = 
  | 'modern-screenshot' // محرك Modern Screenshot السريع وعالي الدقة
  | 'html2canvas'       // محرك html2canvas الكلاسيكي المستقر
  | 'html-to-image'     // محرك html-to-image بدقة متناهية عبر SVG ForeignObject
  | 'html2pdf'          // محرك html2pdf.js المباشر لإنشاء مستندات PDF
  | 'jspdf'             // محرك jsPDF ذو المعادلات الرياضية المتطابقة للأبعاد الورقية
  | 'vector-print';     // محرك الطباعة الشعاعية المتجهية (بدون بكسلة)

export type ExportFormat = 'pdf' | 'png' | 'jpeg' | 'webp' | 'svg';

export interface ExportOptions {
  engine?: ExportEngine;
  format?: ExportFormat;
  scale?: number;
  dpi?: number;
  quality?: number;
  backgroundColor?: string;
  transparentBg?: boolean;
  fileName?: string;
  paperSize?: 'A4' | 'A3' | 'Letter';
  customWidth?: number;
  customHeight?: number;
  includeVerificationInExport?: boolean;
}



