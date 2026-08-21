import { CertificateData } from '../types';

export interface DriveVerificationRequest {
  id: string;
  certificateId: string;
  verificationCode: string;
  studentName: string;
  schoolName: string;
  grade?: string;
  subject?: string;
  title?: string;
  recipientGender?: 'male' | 'female';
  requestedAt: string;
  requesterName?: string;
  requesterContact?: string;
  requesterNotes?: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedAt?: string;
  driveFileUrl?: string;
  driveFileWebViewLink?: string;
  adminNotes?: string;
}

const STORAGE_KEY = 'taqdeer_drive_verification_requests_v1';

export function getDriveVerificationRequests(): DriveVerificationRequest[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Failed to parse drive verification requests:', e);
    return [];
  }
}

export function saveDriveVerificationRequests(requests: DriveVerificationRequest[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
    window.dispatchEvent(new CustomEvent('taqdeer_drive_requests_changed', { detail: requests }));
  } catch (e) {
    console.error('Failed to save drive verification requests:', e);
  }
}

export function createDriveVerificationRequest(data: {
  certificate: CertificateData;
  requesterName?: string;
  requesterContact?: string;
  requesterNotes?: string;
}): { success: boolean; request: DriveVerificationRequest; isNew: boolean } {
  const requests = getDriveVerificationRequests();
  const certId = data.certificate.id || `cert-${Date.now()}`;
  const code = data.certificate.verificationCode || certId;

  // Check if an existing pending request already exists for this certificate
  const existing = requests.find(
    r => (r.certificateId === certId || r.verificationCode === code) && r.status === 'pending'
  );

  if (existing) {
    return { success: true, request: existing, isNew: false };
  }

  const newRequest: DriveVerificationRequest = {
    id: `req-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    certificateId: certId,
    verificationCode: code,
    studentName: data.certificate.studentName || 'طالب متميز',
    schoolName: data.certificate.schoolName || 'جهة معتمدة',
    grade: data.certificate.grade,
    subject: data.certificate.subject,
    title: data.certificate.title,
    recipientGender: data.certificate.recipientGender,
    requestedAt: new Date().toISOString(),
    requesterName: data.requesterName || '',
    requesterContact: data.requesterContact || '',
    requesterNotes: data.requesterNotes || '',
    status: 'pending'
  };

  const updated = [newRequest, ...requests];
  saveDriveVerificationRequests(updated);

  return { success: true, request: newRequest, isNew: true };
}

export function approveDriveVerificationRequest(
  requestId: string,
  driveData: {
    driveFileUrl?: string;
    driveFileWebViewLink?: string;
    adminNotes?: string;
  }
): boolean {
  const requests = getDriveVerificationRequests();
  const idx = requests.findIndex(r => r.id === requestId);
  if (idx === -1) return false;

  requests[idx] = {
    ...requests[idx],
    status: 'approved',
    approvedAt: new Date().toISOString(),
    driveFileUrl: driveData.driveFileUrl || requests[idx].driveFileUrl,
    driveFileWebViewLink: driveData.driveFileWebViewLink || requests[idx].driveFileWebViewLink,
    adminNotes: driveData.adminNotes || 'تمت المصادقة والرفع على Google Drive بنجاح'
  };

  saveDriveVerificationRequests(requests);
  return true;
}

export function rejectDriveVerificationRequest(requestId: string, reason?: string): boolean {
  const requests = getDriveVerificationRequests();
  const idx = requests.findIndex(r => r.id === requestId);
  if (idx === -1) return false;

  requests[idx] = {
    ...requests[idx],
    status: 'rejected',
    adminNotes: reason || 'تم رفض الطلب لعدم اكتمال المتطلبات'
  };

  saveDriveVerificationRequests(requests);
  return true;
}

export function deleteDriveVerificationRequest(requestId: string): boolean {
  const requests = getDriveVerificationRequests();
  const filtered = requests.filter(r => r.id !== requestId);
  saveDriveVerificationRequests(filtered);
  return true;
}

export function getPendingDriveRequestsCount(): number {
  return getDriveVerificationRequests().filter(r => r.status === 'pending').length;
}
