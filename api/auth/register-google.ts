export default async function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'POST') {
    return res.status(200).json({ success: true, message: 'Google Auth Endpoint Ready' });
  } 
  
  if (req.method === 'GET') {
    return res.status(200).json({ success: true, message: 'Google Auth API Ready (POST expected)' });
  }

  return res.status(405).json({ success: false, message: 'Method Not Allowed' });
}
