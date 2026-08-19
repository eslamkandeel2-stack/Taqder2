import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // التأكد من أن الطلب POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { apiKey, model } = req.body;

    // ضع هنا كود استدعاء Gemini API الموجود في server.ts
    // ...

    return res.status(200).json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'حدث خطأ في السيرفر' });
  }
}

