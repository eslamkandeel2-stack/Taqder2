import { setCorsHeaders, handleRegisterGoogle } from '../_sharedAuth';

export default async function handler(req: any, res: any) {
  try {
    setCorsHeaders(res);

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    if (req.method === 'POST' || req.method === 'GET') {
      return await handleRegisterGoogle(req, res);
    }

    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  } catch (err: any) {
    console.error('Unhandled register-google error:', err);
    try {
      setCorsHeaders(res);
      return res.status(200).json({
        success: false,
        fallback: true,
        error: err?.message || 'فشل تسجيل حساب Google عبر الخادم'
      });
    } catch {
      return res.status(500).end();
    }
  }
}
