/**
 * Service to send certificate emails via Gmail REST API or mailto fallback
 */

export interface EmailSendPayload {
  toEmail: string;
  recipientName: string;
  subject: string;
  bodyText: string;
  certificateImageUrl?: string;
  certificatePdfBase64?: string;
  driveLink?: string;
  verificationCode?: string;
  senderName?: string;
}

/**
 * Creates RFC 2822 formatted raw email string encoded in base64url
 */
function createRawEmailMessage(
  fromEmail: string,
  toEmail: string,
  subject: string,
  htmlContent: string,
  attachments?: Array<{ filename: string; mimeType: string; base64Data: string }>
): string {
  const boundary = `__boundary_${Date.now()}__`;
  
  const headers = [
    `From: ${fromEmail}`,
    `To: ${toEmail}`,
    `Subject: =?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
  ];

  let emailBody = `${headers.join('\r\n')}\r\n\r\n`;

  // HTML Body Part
  emailBody += `--${boundary}\r\n`;
  emailBody += 'Content-Type: text/html; charset=UTF-8\r\n';
  emailBody += 'Content-Transfer-Encoding: base64\r\n\r\n';
  emailBody += `${btoa(unescape(encodeURIComponent(htmlContent)))}\r\n\r\n`;

  // Attachments if any
  if (attachments && attachments.length > 0) {
    for (const att of attachments) {
      emailBody += `--${boundary}\r\n`;
      emailBody += `Content-Type: ${att.mimeType}; name="${att.filename}"\r\n`;
      emailBody += 'Content-Transfer-Encoding: base64\r\n';
      emailBody += `Content-Disposition: attachment; filename="${att.filename}"\r\n\r\n`;
      emailBody += `${att.base64Data}\r\n\r\n`;
    }
  }

  emailBody += `--${boundary}--`;

  // Convert to Base64URL
  return btoa(unescape(encodeURIComponent(emailBody)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Sends certificate email using Google Gmail API with OAuth access token
 */
export async function sendEmailViaGmailApi(
  payload: EmailSendPayload,
  accessToken: string,
  senderEmail: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const formattedHtml = `
      <div dir="rtl" style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 24px; color: #1e293b; line-height: 1.6;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
          
          <div style="background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%); padding: 24px; text-align: center; color: #ffffff;">
            <h2 style="margin: 0; font-size: 22px; color: #fbbf24;">✨ تهنئة وتكريم رسمي ✨</h2>
            <p style="margin: 6px 0 0; font-size: 14px; color: #cbd5e1;">منصة تقدير للشهادات والتكريم المعتمد</p>
          </div>

          <div style="padding: 28px;">
            <p style="font-size: 16px; margin-top: 0;">عزيزنا/عزيزتنا <strong>${payload.recipientName || 'المكرم'}</strong> المحترم(ة)،</p>
            
            <div style="background-color: #f1f5f9; border-right: 4px solid #f59e0b; padding: 16px; border-radius: 8px; margin: 20px 0; font-size: 14px; color: #334155;">
              ${payload.bodyText.replace(/\n/g, '<br/>')}
            </div>

            ${payload.verificationCode ? `
              <div style="text-align: center; margin: 20px 0; padding: 14px; background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 10px;">
                <span style="font-size: 12px; color: #64748b; display: block; margin-bottom: 4px;">كود التوثيق والتحقق الرقمي:</span>
                <span style="font-family: monospace; font-size: 16px; font-weight: bold; color: #b45309; letter-spacing: 2px;">${payload.verificationCode}</span>
              </div>
            ` : ''}

            ${payload.driveLink ? `
              <div style="text-align: center; margin: 28px 0;">
                <a href="${payload.driveLink}" target="_blank" style="display: inline-block; background-color: #10b981; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-weight: bold; font-size: 14px; box-shadow: 0 2px 4px rgba(16,185,129,0.3);">
                  📄 عرض وتنزيل الشهادة الموثقة (Google Drive)
                </a>
              </div>
            ` : ''}

            <p style="font-size: 13px; color: #64748b; margin-bottom: 0;">
              مع أطيب تمنياتنا بدوام التوفيق والتميز،<br/>
              <strong>${payload.senderName || 'إدارة التكريم والتوثيق'}</strong>
            </p>
          </div>

          <div style="background-color: #f8fafc; border-top: 1px solid #f1f5f9; padding: 14px; text-align: center; font-size: 11px; color: #94a3b8;">
            تم إرسال هذا البريد تلقائياً عبر نظام تقدير للشهادات المعتمدة.
          </div>
        </div>
      </div>
    `;

    const rawMessage = createRawEmailMessage(
      senderEmail,
      payload.toEmail,
      payload.subject,
      formattedHtml
    );

    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: rawMessage }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`فشل إرسال البريد عبر Gmail API: ${errText}`);
    }

    const data = await response.json();
    return { success: true, messageId: data.id };
  } catch (error: any) {
    console.error('Error sending email with Gmail API:', error);
    return { success: false, error: error.message || 'حدث خطأ أثناء إرسال البريد' };
  }
}
