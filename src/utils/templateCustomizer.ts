import { CertificateData, TemplatePreset } from '../types';
import { TEMPLATE_PRESETS } from '../data/templates';
import { generateVerificationCode } from './qrUtils';
import { adaptCertificateGenderSync, RecipientGender } from './genderConverter';

export interface CustomTemplateItem {
  id: string;
  name: string;
  category: string;
  description: string;
  basePresetId?: string; // id of template it was cloned from if any
  createdAt: string;
  updatedAt: string;
  isCustom: true;
  thumbnailGradient?: string;
  data: Partial<CertificateData>;
}

const CUSTOM_TEMPLATES_STORAGE_KEY = 'taqdeer_custom_user_templates_v1';
const listeners: Array<() => void> = [];

export function subscribeToCustomTemplates(callback: () => void): () => void {
  listeners.push(callback);
  return () => {
    const idx = listeners.indexOf(callback);
    if (idx !== -1) {
      listeners.splice(idx, 1);
    }
  };
}

function notifyCustomTemplatesChanged() {
  listeners.forEach(cb => {
    try {
      cb();
    } catch (e) {
      console.error('Error in custom templates listener:', e);
    }
  });
}

/**
 * Get all custom templates saved by user
 */
export function getSavedCustomTemplates(): CustomTemplateItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CUSTOM_TEMPLATES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (e) {
    console.error('Error reading custom templates:', e);
    return [];
  }
}

/**
 * Save custom templates list to LocalStorage
 */
export function saveCustomTemplatesToStorage(templates: CustomTemplateItem[]): boolean {
  if (typeof window === 'undefined') return false;
  try {
    localStorage.setItem(CUSTOM_TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
    notifyCustomTemplatesChanged();
    return true;
  } catch (e) {
    console.error('Error saving custom templates:', e);
    return false;
  }
}

/**
 * Save current certificate design as a custom template
 */
export function saveCertificateAsCustomTemplate(
  data: CertificateData,
  details: {
    name: string;
    category?: string;
    description?: string;
    basePresetId?: string;
    overrideId?: string;
  }
): CustomTemplateItem {
  const existing = getSavedCustomTemplates();
  const now = new Date().toISOString();

  // Extract clean template payload (without specific dynamic IDs/cloud states)
  const cleanData: CertificateData = JSON.parse(JSON.stringify(data));
  cleanData.isSavedCloud = false;
  cleanData.driveFileId = undefined;
  cleanData.driveFileWebViewLink = undefined;
  cleanData.driveFileUrl = undefined;
  cleanData.driveUploadedAt = undefined;

  const targetId = details.overrideId || `cust-tmpl-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const index = existing.findIndex(t => t.id === targetId);

  const customItem: CustomTemplateItem = {
    id: targetId,
    name: details.name.trim() || `قالب مخصص: ${cleanData.title || 'تصميم فاخر'}`,
    category: details.category?.trim() || 'قوالبي المخصصة',
    description: details.description?.trim() || `قالب مخصص تم تصميمه وتنسيقه في ${new Date().toLocaleDateString('ar-SA')}`,
    basePresetId: details.basePresetId,
    createdAt: index >= 0 ? existing[index].createdAt : now,
    updatedAt: now,
    isCustom: true,
    thumbnailGradient: `from-[${cleanData.primaryColor || '#854d0e'}] via-[${cleanData.secondaryColor || '#d97706'}] to-slate-900`,
    data: cleanData
  };

  let updatedList: CustomTemplateItem[];
  if (index >= 0) {
    updatedList = [...existing];
    updatedList[index] = customItem;
  } else {
    updatedList = [customItem, ...existing];
  }

  saveCustomTemplatesToStorage(updatedList);
  return customItem;
}

/**
 * Duplicate an existing built-in or custom template to create a new editable template
 */
export function duplicateAndCustomizeTemplate(
  template: TemplatePreset | CustomTemplateItem,
  customName?: string
): CustomTemplateItem {
  const existing = getSavedCustomTemplates();
  const now = new Date().toISOString();
  const baseData = 'defaultData' in template ? template.defaultData : template.data;

  const newId = `cust-tmpl-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const finalName = customName?.trim() || `نسخة مخصصة من: ${template.name}`;

  const customItem: CustomTemplateItem = {
    id: newId,
    name: finalName,
    category: 'قوالبي المخصصة',
    description: `نسخة قابلة للتعديل والتخصيص مبنية على (${template.name})`,
    basePresetId: template.id,
    createdAt: now,
    updatedAt: now,
    isCustom: true,
    data: JSON.parse(JSON.stringify(baseData))
  };

  const updatedList = [customItem, ...existing];
  saveCustomTemplatesToStorage(updatedList);
  return customItem;
}

/**
 * Delete a custom template
 */
export function deleteCustomTemplate(id: string): boolean {
  const existing = getSavedCustomTemplates();
  const filtered = existing.filter(t => t.id !== id);
  return saveCustomTemplatesToStorage(filtered);
}

/**
 * Template Application Modes
 * - 'full': Apply entire template including title, appreciation phrasing, quotes, frames, colors & fonts
 * - 'style-only': Apply only layout, frame, colors, fonts, margins, textures & styling without touching current certificate student/school text
 */
export type TemplateApplyMode = 'full' | 'style-only';

/**
 * Helper to extract raw certificate data payload from any template format
 */
export function extractCertificatePayload(
  templateInput: TemplatePreset | CustomTemplateItem | Partial<CertificateData>
): Partial<CertificateData> {
  if (!templateInput) return {};
  if ('defaultData' in templateInput && templateInput.defaultData) {
    return templateInput.defaultData;
  }
  if ('data' in templateInput && templateInput.data) {
    return templateInput.data;
  }
  return templateInput as Partial<CertificateData>;
}

/**
 * Apply a template preset or custom template onto current certificate based on user-chosen mode
 */
export function applyTemplateToCertificate(
  currentCert: CertificateData,
  templateInput: TemplatePreset | CustomTemplateItem | Partial<CertificateData>,
  mode: TemplateApplyMode = 'full',
  currentGender?: RecipientGender
): CertificateData {
  const templateData = extractCertificatePayload(templateInput);
  const templateId = ('id' in templateInput && typeof templateInput.id === 'string')
    ? templateInput.id
    : (templateData.templateId || currentCert.templateId);

  const newVCode = currentCert.verificationCode || generateVerificationCode();
  const targetGender = currentGender || currentCert.recipientGender || 'male';

  if (mode === 'style-only') {
    // Keep all textual fields & student details of current certificate
    // Apply ONLY styling, colors, frame, layout, typography, backgrounds, stamps, borders
    const styleMerged: CertificateData = {
      ...currentCert,
      templateId,
      // Color & Palette
      primaryColor: templateData.primaryColor ?? currentCert.primaryColor,
      secondaryColor: templateData.secondaryColor ?? currentCert.secondaryColor,
      accentColor: templateData.accentColor ?? currentCert.accentColor,
      backgroundColor: templateData.backgroundColor ?? currentCert.backgroundColor,
      textColor: templateData.textColor ?? currentCert.textColor,
      borderColor: templateData.borderColor ?? currentCert.borderColor,
      borderSecondaryColor: templateData.borderSecondaryColor ?? currentCert.borderSecondaryColor,
      borderWidth: templateData.borderWidth ?? currentCert.borderWidth,
      borderPadding: templateData.borderPadding ?? currentCert.borderPadding,
      
      // Gradient & Textures & Background
      bgGradient: templateData.bgGradient ? JSON.parse(JSON.stringify(templateData.bgGradient)) : currentCert.bgGradient,
      bgTextureUrl: templateData.bgTextureUrl !== undefined ? templateData.bgTextureUrl : currentCert.bgTextureUrl,
      bgImageUrl: templateData.bgImageUrl !== undefined ? templateData.bgImageUrl : currentCert.bgImageUrl,
      bgOpacity: templateData.bgOpacity ?? currentCert.bgOpacity,
      bgBlur: templateData.bgBlur ?? currentCert.bgBlur,
      bgOverlayColor: templateData.bgOverlayColor ?? currentCert.bgOverlayColor,
      bgOverlayOpacity: templateData.bgOverlayOpacity ?? currentCert.bgOverlayOpacity,
      bgCardBacking: templateData.bgCardBacking ?? currentCert.bgCardBacking,
      bgCardOpacity: templateData.bgCardOpacity ?? currentCert.bgCardOpacity,

      // Typography & Font
      fontFamily: templateData.fontFamily ?? currentCert.fontFamily,
      fontSizeScale: templateData.fontSizeScale ?? currentCert.fontSizeScale,
      headerFontFamily: templateData.headerFontFamily ?? currentCert.headerFontFamily,
      headerFontSizeScale: templateData.headerFontSizeScale ?? currentCert.headerFontSizeScale,
      aspectRatio: templateData.aspectRatio ?? currentCert.aspectRatio,
      
      // Layout & Margins
      layoutPreset: templateData.layoutPreset ?? currentCert.layoutPreset,
      customGridTemplateAreas: templateData.customGridTemplateAreas ?? currentCert.customGridTemplateAreas,
      customGridTemplateColumns: templateData.customGridTemplateColumns ?? currentCert.customGridTemplateColumns,
      customGridTemplateRows: templateData.customGridTemplateRows ?? currentCert.customGridTemplateRows,
      canvasMarginTop: templateData.canvasMarginTop ?? currentCert.canvasMarginTop,
      canvasMarginBottom: templateData.canvasMarginBottom ?? currentCert.canvasMarginBottom,
      canvasMarginLeft: templateData.canvasMarginLeft ?? currentCert.canvasMarginLeft,
      canvasMarginRight: templateData.canvasMarginRight ?? currentCert.canvasMarginRight,
      elementStyles: templateData.elementStyles ? JSON.parse(JSON.stringify(templateData.elementStyles)) : currentCert.elementStyles,
      positions: templateData.positions ? JSON.parse(JSON.stringify(templateData.positions)) : currentCert.positions,

      // Frames & Badges Styling
      frameStyle: templateData.frameStyle ?? currentCert.frameStyle,
      customFrameUrl: templateData.customFrameUrl !== undefined ? templateData.customFrameUrl : currentCert.customFrameUrl,
      customFrameOpacity: templateData.customFrameOpacity ?? currentCert.customFrameOpacity,
      badgeTitle: templateData.badgeTitle ?? currentCert.badgeTitle,
      badgeIcon: templateData.badgeIcon ?? currentCert.badgeIcon,
      badgeType: templateData.badgeType ?? currentCert.badgeType,
      badgeUrl: templateData.badgeUrl ?? currentCert.badgeUrl,
      badgeSize: templateData.badgeSize ?? currentCert.badgeSize,
      showBadge: templateData.showBadge ?? currentCert.showBadge,
      showBadgeTitle: templateData.showBadgeTitle ?? currentCert.showBadgeTitle,
      badgeBgShape: templateData.badgeBgShape ?? currentCert.badgeBgShape,
      badgeBgColor: templateData.badgeBgColor ?? currentCert.badgeBgColor,
      badgeBgColor2: templateData.badgeBgColor2 ?? currentCert.badgeBgColor2,
      badgeBgGradient: templateData.badgeBgGradient ?? currentCert.badgeBgGradient,
      badgeBgOpacity: templateData.badgeBgOpacity ?? currentCert.badgeBgOpacity,
      badgeBgBorderColor: templateData.badgeBgBorderColor ?? currentCert.badgeBgBorderColor,
      badgeBgBorderWidth: templateData.badgeBgBorderWidth ?? currentCert.badgeBgBorderWidth,
      badgeBgBorderStyle: templateData.badgeBgBorderStyle ?? currentCert.badgeBgBorderStyle,
      badgeBgRadius: templateData.badgeBgRadius ?? currentCert.badgeBgRadius,
      badgeTextColor: templateData.badgeTextColor ?? currentCert.badgeTextColor,
      badgeTextFontFamily: templateData.badgeTextFontFamily ?? currentCert.badgeTextFontFamily,
      stamp: templateData.stamp ? JSON.parse(JSON.stringify(templateData.stamp)) : currentCert.stamp,

      // Watermark & QR
      watermarkType: templateData.watermarkType ?? currentCert.watermarkType,
      watermarkText: templateData.watermarkText ?? currentCert.watermarkText,
      watermarkImageUrl: templateData.watermarkImageUrl ?? currentCert.watermarkImageUrl,
      watermarkRotation: templateData.watermarkRotation ?? currentCert.watermarkRotation,
      watermarkOpacity: templateData.watermarkOpacity ?? currentCert.watermarkOpacity,
      watermarkPattern: templateData.watermarkPattern ?? currentCert.watermarkPattern,
      watermarkSize: templateData.watermarkSize ?? currentCert.watermarkSize,
      showQrCode: templateData.showQrCode ?? currentCert.showQrCode,
      showVerificationBox: templateData.showVerificationBox ?? currentCert.showVerificationBox,
      verificationBoxPattern: templateData.verificationBoxPattern ?? currentCert.verificationBoxPattern,
      showVerificationBadge: templateData.showVerificationBadge ?? currentCert.showVerificationBadge,

      updatedAt: new Date().toISOString()
    };

    return styleMerged;
  }

  // MODE: 'full' -> Apply template styling and template wording (title, appreciation, intro, quote, badges)
  // but preserve user's personal identity (studentName, schoolName, grade, subject, custom signatures, uploaded logo)
  let fullMerged: CertificateData = {
    ...currentCert,
    ...templateData,
    templateId,
    // Keep user's core identity fields if they already entered them
    studentName: currentCert.studentName || templateData.studentName || 'اسم الطالب المكرم',
    grade: currentCert.grade || templateData.grade || '',
    schoolName: currentCert.schoolName || templateData.schoolName || 'اسم المدرسة أو الجهة',
    subject: currentCert.subject || templateData.subject || '',
    logoUrl: currentCert.logoUrl !== undefined ? currentCert.logoUrl : templateData.logoUrl,
    signatures: (currentCert.signatures && currentCert.signatures.length > 0) ? currentCert.signatures : (templateData.signatures || []),
    issueDate: currentCert.issueDate || templateData.issueDate,
    issuePlace: currentCert.issuePlace || templateData.issuePlace,
    verificationCode: newVCode,
    qrCodeData: currentCert.qrCodeData || `${window.location.origin}/verify?code=${newVCode}`,
    updatedAt: new Date().toISOString()
  };

  // Harmonize linguistic phrasing with target gender
  fullMerged = adaptCertificateGenderSync(fullMerged, targetGender, { preserveCustomStudentName: true });

  return fullMerged;
}
