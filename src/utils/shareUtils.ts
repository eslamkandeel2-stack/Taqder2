import { CertificateData } from '../types';
import {
  captureCertificateCanvas,
  createProportionalPdf,
  getCleanStudentFileName
} from './exportUtils';

export async function generateCertificatePngFile(
  element: HTMLElement,
  certificateData: CertificateData
): Promise<File> {
  const canvas = await captureCertificateCanvas(element, certificateData, { scale: 3.0 });
  const fileName = getCleanStudentFileName(certificateData.studentName, 'شهادة_تقدير', 'png');

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Failed to generate image blob'));
        return;
      }
      resolve(new File([blob], fileName, { type: 'image/png' }));
    }, 'image/png', 1.0);
  });
}

export async function generateCertificatePdfFile(
  element: HTMLElement,
  certificateData: CertificateData
): Promise<File> {
  const canvas = await captureCertificateCanvas(element, certificateData, { scale: 2.8 });
  const pdf = createProportionalPdf(canvas, certificateData);
  const fileName = getCleanStudentFileName(certificateData.studentName, 'شهادة_تقدير', 'pdf');

  const pdfArrayBuffer = pdf.output('arraybuffer');
  const blob = new Blob([pdfArrayBuffer], { type: 'application/pdf' });
  return new File([blob], fileName, { type: 'application/pdf' });
}

export function canWebShareFiles(): boolean {
  if (typeof navigator === 'undefined' || !navigator.share) return false;
  return typeof navigator.canShare === 'function';
}

