export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  try {
    const espnUrl = 'https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard';
    const response = await fetch(espnUrl);
    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch ESPN data', message: error.message });
  }
}
