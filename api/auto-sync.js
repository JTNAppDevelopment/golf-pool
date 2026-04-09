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

    // Check if auto-sync is enabled by commissioner
    if (!state.config || !state.config.autoSync) {
      return res.status(200).json({ ok: false, reason: 'Auto-sync is disabled' });
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
    const norm = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const espnMap = {};
    comp.competitors.forEach(c => {
      const athlete = c.athlete || {};
      const name = athlete.displayName || athlete.shortName || '';
      const lastName = athlete.lastName || name.split(' ').pop() || '';
      const firstName = (athlete.displayName || '').split(' ')[0] || '';
      const rounds = (c.linescores || []).map(ls => ls.value != null ? ls.value : null);
      const status = c.status || {};
      const isCut = status.type && (status.type.id === '3' || status.type.description === 'Cut');
      const entry = { rounds, isCut, fullName: name };
      espnMap[lastName] = entry;
      espnMap[name] = entry;
      espnMap[norm(lastName)] = entry;
      espnMap[norm(name)] = entry;
      // Initial + last name variants: "N. Hojgaard", "Z. Johnson", "M. Kim"
      if (firstName) {
        const initial = firstName[0];
        espnMap[initial + '. ' + lastName] = entry;
        espnMap[initial + '. ' + norm(lastName)] = entry;
      }
      // Also store by just last name lowercased for Mickelson-type matches
      espnMap[norm(lastName).toLowerCase()] = entry;
    });

    // 4. Update golfer scores
    let updates = 0;
    state.golfers.forEach(g => {
      const match = espnMap[g.name] || espnMap[norm(g.name)] || espnMap[norm(g.name).toLowerCase()];
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

    // 5. Save live leaderboard data for player-facing display
    const liveBoard = comp.competitors.map(c => {
      const a = c.athlete || {};
      const lastName = a.lastName || (a.displayName || '').split(' ').pop() || '';
      const st = c.status || {};
      const pos = st.position ? st.position.displayName : '';
      const stats = c.statistics || [];
      const stpStat = stats.find(s => s.name === 'scoreToPar');
      const scoreToPar = stpStat ? stpStat.displayValue : (c.score ? c.score.displayValue : '');
      const thru = st.thru != null ? st.displayThru || String(st.thru) : '';
      const completed = st.type ? st.type.completed : false;
      const movement = c.movement || 0;
      const today = st.todayDetail || '';
      const rounds = (c.linescores || []).map(ls => ls.displayValue != null ? ls.displayValue : '');
      return { name: lastName, fullName: a.displayName || '', pos, scoreToPar, thru, completed, movement, today, rounds };
    }).sort((a, b) => {
      const aPos = parseInt((a.pos || '').replace('T', ''), 10) || 999;
      const bPos = parseInt((b.pos || '').replace('T', ''), 10) || 999;
      return aPos - bPos;
    });
    await kv.set('pool:live-leaderboard', liveBoard);

    // 6. Save updated state
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
