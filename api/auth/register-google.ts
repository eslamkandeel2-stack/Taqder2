import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    // منطق التسجيل
    return res.status(200).json({ message: 'Success' });
  } 
  
  if (req.method === 'GET') {
    return res.status(400).json({ message: 'This endpoint requires POST method' });
  }

  return res.status(405).json({ message: 'Method Not Allowed' });
}
