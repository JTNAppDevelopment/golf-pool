// Vercel serverless function — commissioner PIN check
// Set COMMISSIONER_PIN env var in Vercel project settings (never commit the value)
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { pin } = req.body || {};
  const correctPin = process.env.COMMISSIONER_PIN;

  if (!correctPin) {
    // PIN not configured — deny all
    return res.status(503).json({ ok: false, error: 'PIN not configured' });
  }

  const ok = String(pin) === String(correctPin);
  res.status(200).json({ ok });
}
