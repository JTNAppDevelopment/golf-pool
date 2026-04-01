// Vercel serverless function — CORS proxy for ESPN golf leaderboard
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const eventId = req.query.eventId || 'pga';
  const url = `https://site.api.espn.com/apis/site/v2/sports/golf/pga/leaderboard?event=${eventId}`;

  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; best4golf/1.0)' }
    });
    const data = await r.json();
    res.status(r.status).json(data);
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
}
