import { setCorsHeaders, handleLoginGoogle } from '../_sharedAuth';

export default async function handler(req: any, res: any) {
  try {
    setCorsHeaders(res);

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    if (req.method === 'POST') {
      return await handleLoginGoogle(req, res);
    }

    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  } catch (err: any) {
    console.error('Unhandled login-google error:', err);
    try {
      setCorsHeaders(res);
      return res.status(200).json({
        success: false,
        fallback: true,
        error: err?.message || 'فشل تسجيل الدخول بحساب Google'
      });
    } catch {
      return res.status(500).end();
    }
  }
}
