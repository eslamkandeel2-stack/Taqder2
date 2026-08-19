import { CertificateData } from '../types';

export interface DraftCertificateItem {
  id: string;
  name: string;
  type: 'draft' | 'template'; // 'draft' = full certificate with recipient; 'template' = reusable design layout/colors/frame
  tags: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
  data: CertificateData;
}

const STORAGE_KEY = 'taqdeer_saved_drafts_and_templates';

// In-memory cache & change listeners
const listeners: Array<() => void> = [];

export function subscribeToDrafts(callback: () => void): () => void {
  listeners.push(callback);
  return () => {
    const idx = listeners.indexOf(callback);
    if (idx !== -1) {
      listeners.splice(idx, 1);
    }
  };
}

function notifyDraftsChanged() {
  listeners.forEach(cb => {
    try {
      cb();
    } catch (e) {
      console.error('Error in drafts listener:', e);
    }
  });
}

/**
 * Retrieve all saved drafts & custom templates from LocalStorage
 */
export function getSavedDrafts(): DraftCertificateItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (e) {
    console.error('Error reading saved drafts:', e);
    return [];
  }
}

/**
 * Save all drafts to LocalStorage
 */
function saveDraftsToStorage(drafts: DraftCertificateItem[]): boolean {
  if (typeof window === 'undefined') return false;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
    notifyDraftsChanged();
    return true;
  } catch (e) {
    console.error('Error saving drafts to localStorage:', e);
    return false;
  }
}

/**
 * Save a single certificate as a draft or template
 */
export function saveCertificateAsDraft(
  data: CertificateData,
  options?: {
    name?: string;
    type?: 'draft' | 'template';
    tags?: string[];
    notes?: string;
    overrideId?: string;
  }
): DraftCertificateItem {
  const drafts = getSavedDrafts();
  const now = new Date().toISOString();
  
  const type = options?.type || 'draft';
  const autoName = options?.name?.trim() || (
    type === 'template'
      ? `قالب: ${data.title || 'تصميم مخصص'} (${data.layoutPreset || 'افتراضي'})`
      : `${data.title || 'شهادة تقدير'} - ${data.studentName || 'مسودة طالب'}`
  );

  const defaultTags = type === 'template' 
    ? ['قالب_مخصص', data.layoutPreset || 'شبكي', data.aspectRatio || 'أفقي']
    : ['مسودة', data.recipientGender === 'female' ? 'طالبات' : 'طلاب', data.subject ? 'مادة_دراسية' : 'عام'];

  const tags = options?.tags && options.tags.length > 0 ? options.tags : defaultTags;

  // Deep clone data to avoid mutating references
  const cleanData: CertificateData = JSON.parse(JSON.stringify(data));
  
  // If template, make sure we keep layout, frame, colors, stamp & badge positions but keep it clean
  if (type === 'template') {
    cleanData.isSavedCloud = false;
  }

  const existingIndex = options?.overrideId 
    ? drafts.findIndex(d => d.id === options.overrideId) 
    : -1;

  if (existingIndex >= 0) {
    const updatedDraft: DraftCertificateItem = {
      ...drafts[existingIndex],
      name: autoName,
      type,
      tags,
      notes: options?.notes !== undefined ? options.notes : drafts[existingIndex].notes,
      updatedAt: now,
      data: cleanData
    };
    drafts[existingIndex] = updatedDraft;
    saveDraftsToStorage(drafts);
    return updatedDraft;
  }

  const newDraft: DraftCertificateItem = {
    id: `draft-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: autoName,
    type,
    tags,
    notes: options?.notes || '',
    createdAt: now,
    updatedAt: now,
    data: cleanData
  };

  const updatedDrafts = [newDraft, ...drafts];
  saveDraftsToStorage(updatedDrafts);
  return newDraft;
}

/**
 * Save multiple certificates as drafts (e.g. from Batch generator)
 */
export function saveMultipleCertificatesAsDrafts(
  items: Array<{
    data: CertificateData;
    name?: string;
    type?: 'draft' | 'template';
    tags?: string[];
    notes?: string;
  }>
): DraftCertificateItem[] {
  const currentDrafts = getSavedDrafts();
  const now = new Date().toISOString();

  const newDraftItems: DraftCertificateItem[] = items.map((item, idx) => {
    const type = item.type || 'draft';
    const autoName = item.name?.trim() || `${item.data.title || 'شهادة'} - ${item.data.studentName || `طالب ${idx + 1}`}`;
    const defaultTags = ['دفعة_جماعية', item.data.recipientGender === 'female' ? 'طالبات' : 'طلاب'];
    const tags = item.tags && item.tags.length > 0 ? item.tags : defaultTags;
    const cleanData: CertificateData = JSON.parse(JSON.stringify(item.data));

    return {
      id: `draft-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
      name: autoName,
      type,
      tags,
      notes: item.notes || `تم الحفظ من التوليد الجماعي (${new Date().toLocaleDateString('ar-SA')})`,
      createdAt: now,
      updatedAt: now,
      data: cleanData
    };
  });

  const combined = [...newDraftItems, ...currentDrafts];
  saveDraftsToStorage(combined);
  return newDraftItems;
}

/**
 * Update an existing draft
 */
export function updateSavedDraft(id: string, updates: Partial<DraftCertificateItem>): boolean {
  const drafts = getSavedDrafts();
  const index = drafts.findIndex(d => d.id === id);
  if (index === -1) return false;

  drafts[index] = {
    ...drafts[index],
    ...updates,
    updatedAt: new Date().toISOString()
  };

  return saveDraftsToStorage(drafts);
}

/**
 * Delete a single draft
 */
export function deleteSavedDraft(id: string): boolean {
  const drafts = getSavedDrafts();
  const filtered = drafts.filter(d => d.id !== id);
  return saveDraftsToStorage(filtered);
}

/**
 * Delete multiple drafts at once
 */
export function deleteMultipleDrafts(ids: string[]): boolean {
  const drafts = getSavedDrafts();
  const idsSet = new Set(ids);
  const filtered = drafts.filter(d => !idsSet.has(d.id));
  return saveDraftsToStorage(filtered);
}

/**
 * Duplicate a draft for easy branching
 */
export function duplicateDraft(id: string): DraftCertificateItem | null {
  const drafts = getSavedDrafts();
  const target = drafts.find(d => d.id === id);
  if (!target) return null;

  const now = new Date().toISOString();
  const newDraft: DraftCertificateItem = {
    ...target,
    id: `draft-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: `${target.name} (نسخة مكررة)`,
    createdAt: now,
    updatedAt: now,
    data: JSON.parse(JSON.stringify(target.data))
  };

  const updated = [newDraft, ...drafts];
  saveDraftsToStorage(updated);
  return newDraft;
}

/**
 * Export drafts as JSON backup file
 */
export function exportDraftsToJson(ids?: string[]): void {
  const allDrafts = getSavedDrafts();
  const toExport = ids && ids.length > 0 
    ? allDrafts.filter(d => ids.includes(d.id))
    : allDrafts;

  const exportPayload = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    count: toExport.length,
    drafts: toExport
  };

  const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `taqdeer-drafts-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Import drafts from JSON
 */
export function importDraftsFromJson(jsonString: string): { importedCount: number; error?: string } {
  try {
    const parsed = JSON.parse(jsonString);
    let itemsToImport: any[] = [];

    if (Array.isArray(parsed)) {
      itemsToImport = parsed;
    } else if (parsed && Array.isArray(parsed.drafts)) {
      itemsToImport = parsed.drafts;
    } else if (parsed && typeof parsed === 'object' && parsed.title && parsed.studentName) {
      // Single certificate exported directly
      itemsToImport = [{
        id: `draft-${Date.now()}`,
        name: `${parsed.title} - ${parsed.studentName}`,
        type: 'draft',
        tags: ['مستورد'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        data: parsed
      }];
    } else {
      return { importedCount: 0, error: 'تنسيق الملف غير صالح. يرجى اختيار ملف JSON صحيح للمسودات.' };
    }

    const currentDrafts = getSavedDrafts();
    const validatedItems: DraftCertificateItem[] = [];

    itemsToImport.forEach(item => {
      if (item && item.data && typeof item.data === 'object') {
        validatedItems.push({
          id: item.id || `draft-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: item.name || `${item.data.title || 'شهادة مستوردة'}`,
          type: item.type === 'template' ? 'template' : 'draft',
          tags: Array.isArray(item.tags) ? item.tags : ['مستورد'],
          notes: item.notes || '',
          createdAt: item.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          data: item.data
        });
      }
    });

    if (validatedItems.length === 0) {
      return { importedCount: 0, error: 'لم يتم العثور على أي مسودات صالحة في الملف.' };
    }

    // Merge avoiding exact duplicates by ID
    const existingMap = new Map(currentDrafts.map(d => [d.id, d]));
    validatedItems.forEach(item => {
      existingMap.set(item.id, item);
    });

    const merged = Array.from(existingMap.values());
    saveDraftsToStorage(merged);

    return { importedCount: validatedItems.length };
  } catch (e: any) {
    console.error('Import error:', e);
    return { importedCount: 0, error: e.message || 'حدث خطأ أثناء قراءة ملف JSON' };
  }
}
