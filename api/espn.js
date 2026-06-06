// Vercel serverless function — CORS proxy for ESPN golf leaderboard
// Optional ?event=<id> pins the response to a specific tournament; without it
// ESPN returns the current PGA event (which may not be the one we want).
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const eventId = req.query && req.query.event;
  const base = 'https://site.api.espn.com/apis/site/v2/sports/golf/leaderboard';
  const url = eventId ? `${base}?event=${encodeURIComponent(eventId)}` : base;

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
