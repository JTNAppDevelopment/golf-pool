import { kv } from '@vercel/kv';

const KEY = 'golf-pool-pin';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const pin = await kv.get(KEY);
      return res.status(200).json({ exists: !!pin });
    }
    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      if (body.action === 'set') {
        await kv.set(KEY, body.pin);
        return res.status(200).json({ ok: true });
      }
      if (body.action === 'check') {
        const stored = await kv.get(KEY);
        return res.status(200).json({ ok: stored === body.pin });
      }
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
