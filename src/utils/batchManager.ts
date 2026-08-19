import { BatchRecord, CertificateData } from '../types';

const STORAGE_KEY = 'taqdeer_batch_history_v1';

// In-memory listeners for real-time reactivity
const listeners: Array<() => void> = [];

export function subscribeToBatches(callback: () => void): () => void {
  listeners.push(callback);
  return () => {
    const idx = listeners.indexOf(callback);
    if (idx !== -1) {
      listeners.splice(idx, 1);
    }
  };
}

function notifyBatchesChanged() {
  listeners.forEach(cb => {
    try {
      cb();
    } catch (e) {
      console.error('Error in batch listener:', e);
    }
  });
}

/**
 * Retrieve all saved batches from LocalStorage
 */
export function getSavedBatches(): BatchRecord[] {
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
    console.error('Error reading saved batches from localStorage:', e);
    return [];
  }
}

/**
 * Persist batches list to LocalStorage
 */
export function saveBatchesList(batches: BatchRecord[]): boolean {
  if (typeof window === 'undefined') return false;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(batches));
    notifyBatchesChanged();
    return true;
  } catch (e) {
    console.error('Error saving batches to localStorage:', e);
    return false;
  }
}

/**
 * Save or update a specific batch record
 */
export function saveBatchRecord(batch: BatchRecord): BatchRecord {
  const batches = getSavedBatches();
  const existingIndex = batches.findIndex(b => b.id === batch.id);

  let updatedList: BatchRecord[];
  const updatedBatch: BatchRecord = {
    ...batch,
    totalCount: batch.certificates?.length || 0,
    updatedAt: new Date().toISOString()
  };

  if (existingIndex >= 0) {
    updatedList = [...batches];
    updatedList[existingIndex] = updatedBatch;
  } else {
    updatedList = [updatedBatch, ...batches];
  }

  saveBatchesList(updatedList);
  return updatedBatch;
}

/**
 * Find a batch by ID
 */
export function getBatchById(batchId: string): BatchRecord | undefined {
  const batches = getSavedBatches();
  return batches.find(b => b.id === batchId);
}

/**
 * Delete a batch by ID
 */
export function deleteBatchRecord(batchId: string): boolean {
  const batches = getSavedBatches();
  const filtered = batches.filter(b => b.id !== batchId);
  return saveBatchesList(filtered);
}

/**
 * Update a single certificate inside a batch record
 */
export function updateCertificateInBatch(batchId: string, updatedCert: CertificateData): boolean {
  const batch = getBatchById(batchId);
  if (!batch) return false;

  const certIndex = batch.certificates.findIndex(c => c.id === updatedCert.id || (c.verificationCode && c.verificationCode === updatedCert.verificationCode));
  if (certIndex < 0) return false;

  const updatedCertificates = [...batch.certificates];
  updatedCertificates[certIndex] = updatedCert;

  saveBatchRecord({
    ...batch,
    certificates: updatedCertificates
  });

  return true;
}
