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
      const incoming = req.body;

      // Read current server state for merge
      let existing = null;
      try { existing = await kv.get(KEY); } catch (e) {}

      let merged = incoming;

      if (existing && existing.entries && incoming.entries) {
        // Merge entries: deduplicate by id, incoming wins on conflict
        const entryMap = {};
        (existing.entries || []).forEach(e => { entryMap[e.id] = e; });
        (incoming.entries || []).forEach(e => { entryMap[e.id] = e; });
        const mergedEntries = Object.values(entryMap);
        // Sort by id (timestamp) to maintain chronological order
        mergedEntries.sort((a, b) => {
          const ai = parseInt(a.id, 10) || 0;
          const bi = parseInt(b.id, 10) || 0;
          return ai - bi;
        });

        // Merge golfers: deduplicate by name, incoming wins on conflict
        const golferMap = {};
        (existing.golfers || []).forEach(g => { golferMap[g.name] = g; });
        (incoming.golfers || []).forEach(g => { golferMap[g.name] = g; });
        const mergedGolfers = Object.values(golferMap);

        // Config: incoming wins (single-source)
        merged = {
          config: incoming.config,
          golfers: mergedGolfers,
          entries: mergedEntries
        };
      }

      await kv.set(KEY, merged);
      return res.status(200).json({ ok: true, entryCount: (merged.entries || []).length });
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    // KV not configured — client falls back to localStorage
    res.status(503).json({ error: 'KV unavailable', detail: e.message });
  }
}
