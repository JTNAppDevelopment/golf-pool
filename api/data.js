const {Redis} = require('@upstash/redis');
const redis = new Redis({url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN});
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if(req.method==='OPTIONS'){res.status(200).end();return;}
  const KEY='golf-pool-v1';
  if(req.method==='GET'){
    try{const d=await redis.get(KEY);res.json(d||{});}
    catch(e){res.status(500).json({error:e.message});}
  } else if(req.method==='POST'){
    try{await redis.set(KEY,req.body);res.json({ok:true});}
    catch(e){res.status(500).json({error:e.message});}
  }
};
