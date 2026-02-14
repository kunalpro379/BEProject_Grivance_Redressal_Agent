# Deploying to Vercel

## Important Notes

⚠️ **This API is designed to run as a long-running server with a Telegram bot.**

Vercel is designed for serverless functions, which may not be ideal for:
- Long-running Telegram bot connections
- WebSocket connections
- Background processes

## Recommended Deployment Options

### Option 1: Railway (Recommended for Telegram Bots)
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Deploy
railway up
```

### Option 2: Render
1. Go to https://render.com
2. Create new Web Service
3. Connect your GitHub repo
4. Set build command: `npm install`
5. Set start command: `npm start`
6. Add environment variables

### Option 3: Heroku
```bash
# Install Heroku CLI
npm install -g heroku

# Login
heroku login

# Create app
heroku create your-app-name

# Deploy
git push heroku main
```

### Option 4: VPS (DigitalOcean, AWS EC2, etc.)
Best for full control and long-running processes.

## If You Still Want to Deploy to Vercel

### Limitations:
- Telegram bot will only work during request handling
- No persistent connections
- May timeout on long operations

### Steps:

1. **Set Environment Variables in Vercel Dashboard:**
   - `DB_HOST`
   - `DB_PORT`
   - `DB_NAME`
   - `DB_USER`
   - `DB_PASSWORD`
   - `DB_SSL=true`
   - `TELEGRAM_BOT_TOKEN`
   - `AZURE_STORAGE_CONNECTION_STRING`
   - `AZURE_STORAGE_CONTAINER_NAME`
   - `AZURE_QUEUE_NAME`

2. **Deploy:**
   ```bash
   vercel --prod
   ```

3. **Set Telegram Webhook:**
   ```bash
   curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=https://your-vercel-app.vercel.app/api/telegram/webhook"
   ```

## Recommended: Use Railway

Railway is better suited for this application because:
- ✅ Supports long-running processes
- ✅ Persistent connections
- ✅ Better for Telegram bots
- ✅ Easy deployment
- ✅ Free tier available

### Railway Deployment:

1. Create `railway.json`:
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

2. Deploy:
```bash
railway up
```

3. Add environment variables in Railway dashboard

## Environment Variables Required

```env
# Database
DB_HOST=aws-1-ap-southeast-1.pooler.supabase.com
DB_PORT=6543
DB_NAME=postgres
DB_USER=postgres.hjpgyfowhrbciemdzqgn
DB_PASSWORD=kunalpro379
DB_SSL=true

# Azure Storage
AZURE_STORAGE_CONNECTION_STRING=your_connection_string
AZURE_STORAGE_CONTAINER_NAME=igrs

# Azure Queue
AZURE_QUEUE_NAME=queryanalyst

# Telegram
TELEGRAM_BOT_TOKEN=your_bot_token

# Server
PORT=3000
NODE_ENV=production
```

## Health Check Endpoint

The API includes a health check at:
```
GET /api/health
```

Use this for monitoring and uptime checks.
