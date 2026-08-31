import { setCorsHeaders, handleLinkGoogleConfirm } from '../_sharedAuth';

export default async function handler(req: any, res: any) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    return handleLinkGoogleConfirm(req, res);
  }

  return res.status(405).json({ success: false, error: 'Method Not Allowed' });
}
