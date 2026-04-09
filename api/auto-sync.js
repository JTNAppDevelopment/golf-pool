// Vercel serverless function — auto-sync ESPN scores
// Call via Vercel Cron or manually: GET /api/auto-sync
import { kv } from '@vercel/kv';

const KEY = 'pool:state';
const ESPN_URL = 'https://site.api.espn.com/apis/site/v2/sports/golf/leaderboard';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // 1. Fetch current pool state from KV
    const state = await kv.get(KEY);
    if (!state || !state.golfers || !state.golfers.length) {
      return res.status(200).json({ ok: false, reason: 'No pool state found' });
    }

    // 2. Fetch ESPN leaderboard
    const espnRes = await fetch(ESPN_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; best4golf/1.0)' }
    });
    const espnData = await espnRes.json();

    if (!espnData || !espnData.events || !espnData.events.length) {
      return res.status(200).json({ ok: false, reason: 'No active tournament on ESPN' });
    }

    const evt = espnData.events[0];
    const comp = evt.competitions && evt.competitions[0];
    if (!comp || !comp.competitors) {
      return res.status(200).json({ ok: false, reason: 'No competitor data' });
    }

    // 3. Build name → scores map from ESPN
    const espnMap = {};
    comp.competitors.forEach(c => {
      const athlete = c.athlete || {};
      const name = athlete.displayName || athlete.shortName || '';
      const lastName = athlete.lastName || name.split(' ').pop() || '';
      const rounds = (c.linescores || []).map(ls => ls.value != null ? ls.value : null);
      const status = c.status || {};
      const isCut = status.type && (status.type.id === '3' || status.type.description === 'Cut');
      espnMap[lastName] = { rounds, isCut, fullName: name };
      espnMap[name] = { rounds, isCut, fullName: name };
    });

    // 4. Update golfer scores
    let updates = 0;
    state.golfers.forEach(g => {
      const match = espnMap[g.name];
      if (!match) return;
      for (let r = 0; r < 4; r++) {
        const espnScore = match.rounds[r] != null ? match.rounds[r] : null;
        if (espnScore !== null && espnScore !== g.scores[r]) {
          g.scores[r] = espnScore;
          updates++;
        }
      }
      if (match.isCut && g.cutStatus !== 'MC') {
        g.cutStatus = 'MC';
        updates++;
      }
    });

    if (updates === 0) {
      return res.status(200).json({ ok: true, updates: 0, reason: 'No score changes' });
    }

    // 5. Save updated state
    await kv.set(KEY, state);

    return res.status(200).json({
      ok: true,
      updates,
      tournament: evt.name,
      golferCount: state.golfers.length,
      entryCount: (state.entries || []).length
    });
  } catch (e) {
    return res.status(502).json({ error: e.message });
  }
}
