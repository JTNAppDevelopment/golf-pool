// Vercel serverless function — shared pool data via Vercel KV
import { kv } from '@vercel/kv';

const KEY = 'pool:state';
const NOTIFY_KEY = 'pool:last-notified-count';

async function sendNotification(entryCount, config) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;
  const commEmail = (config && config.commEmail) || 'jtnindc@gmail.com';
  const poolName = (config && config.name) || 'Golf Pool';
  const appUrl = (config && config.appUrl) || 'https://best4.golf';
  const batch = Math.ceil(entryCount / 5);
  const from = ((batch - 1) * 5) + 1;
  const to = batch * 5;
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'best4.golf <onboarding@resend.dev>',
        to: [commEmail],
        subject: `best4.golf — ${poolName}: entries ${from}–${to} received`,
        html: `<p>Entries <strong>${from}–${to}</strong> have been submitted for <strong>${poolName}</strong>.</p><p>Total entries so far: <strong>${entryCount}</strong></p><p><a href="${appUrl}">Open pool</a></p>`
      })
    });
  } catch (e) { /* silent fail */ }
}

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

      const prevEntryCount = (existing && existing.entries) ? existing.entries.length : 0;
      let merged = incoming;

      // Reject empty POSTs that would wipe data
      if ((!incoming.entries || incoming.entries.length === 0) && prevEntryCount > 0) {
        return res.status(400).json({ error: 'Rejected: empty POST would wipe existing entries', existingCount: prevEntryCount });
      }

      if (existing && existing.entries) {
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

      // Server-side notification: fire once when entry count crosses a multiple of 5
      const newCount = (merged.entries || []).length;
      let lastNotified = 0;
      try { const ln = await kv.get(NOTIFY_KEY); if (ln != null) lastNotified = parseInt(ln, 10) || 0; } catch (e) {}
      const newThreshold = Math.floor(newCount / 5) * 5;
      if (newThreshold > 0 && newThreshold > lastNotified && newCount >= newThreshold) {
        await kv.set(NOTIFY_KEY, newThreshold);
        await sendNotification(newCount, merged.config);
      }

      return res.status(200).json({ ok: true, entryCount: newCount });
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    // KV not configured — client falls back to localStorage
    res.status(503).json({ error: 'KV unavailable', detail: e.message });
  }
}
