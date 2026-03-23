# Golf Pool — Tournament Pool Manager

## Deploy to Vercel

### Step 1: Deploy the app
1. Go to vercel.com and create a free account
2. Click "Add New" → "Project"
3. Drag the entire golf-pool-vercel folder onto the page
4. Click Deploy (takes ~60 seconds)

### Step 2: Add the shared database (required for multi-device)
1. In your Vercel dashboard, click on your golf-pool project
2. Go to the "Storage" tab
3. Click "Create Database" → select "KV" (Redis)
4. Name it "golf-pool-kv" and click Create
5. Click "Connect to Project" and select your golf-pool project
6. Redeploy: go to "Deployments" tab → click "..." on latest → "Redeploy"

### Step 3: Set up your pool
1. Open your live URL (e.g. https://golf-pool-abc123.vercel.app)
2. Click Commissioner → set your PIN
3. Set up tournament, add golfers, configure payments
4. Paste your URL into Setup → QR code field
5. Print QR cards and rules sheet for the club

## How it works
- Commissioner and players all use the same URL
- Data is shared — player submits on phone, commissioner sees it on computer
- Without Vercel KV, falls back to browser-only storage (not shared)

## Project structure
- public/index.html — The full app
- api/espn.js — ESPN score sync proxy
- api/data.js — Shared data storage API
- api/pin.js — Commissioner PIN API
- vercel.json — Route config
- package.json — Dependencies (@vercel/kv)
