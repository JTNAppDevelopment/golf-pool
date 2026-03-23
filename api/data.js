export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return res.status(500).json({ error: 'KV not configured' });

  const KEY = 'golf-pool-data';

  try {
    if (req.method === 'GET') {
      const r = await fetch(`${url}/get/${KEY}`, { headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json();
      const val = d.result;
      if (!val) return res.status(200).json({ config: null, golfers: [], entries: [] });
      try {
        const parsed = typeof val === 'string' ? JSON.parse(val) : val;
        return res.status(200).json(parsed);
      } catch(e) {
        return res.status(200).json({ config: null, golfers: [], entries: [] });
      }
    }
    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      const r = await fetch(`${url}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(["SET", KEY, body])
      });
      const d = await r.json();
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
