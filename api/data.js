// Vercel serverless function — shared pool data via Vercel KV
import { kv } from '@vercel/kv';

const KEY = 'pool:state';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const data = await kv.get(KEY);
      return res.status(200).json(data || null);
    }
    if (req.method === 'POST') {
      const body = req.body;
      await kv.set(KEY, body);
      return res.status(200).json({ ok: true });
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    // KV not configured — client falls back to localStorage
    res.status(503).json({ error: 'KV unavailable', detail: e.message });
  }
}
