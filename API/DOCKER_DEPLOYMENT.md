# Docker Deployment Guide

## Prerequisites

- Docker installed
- Docker Compose installed (optional, but recommended)

## Quick Start

### Option 1: Using Docker Compose (Recommended)

1. **Make sure `.env` file is configured:**
```bash
# Check if .env exists
ls -la .env
```

2. **Build and run:**
```bash
docker-compose up -d
```

3. **Check logs:**
```bash
docker-compose logs -f
```

4. **Stop:**
```bash
docker-compose down
```

### Option 2: Using Docker directly

1. **Build the image:**
```bash
docker build -t grievance-api .
```

2. **Run the container:**
```bash
docker run -d \
  --name grievance-api \
  -p 3000:3000 \
  --env-file .env \
  grievance-api
```

3. **Check logs:**
```bash
docker logs -f grievance-api
```

4. **Stop:**
```bash
docker stop grievance-api
docker rm grievance-api
```

## Environment Variables

Create a `.env` file with:

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
WEBHOOK_URL=https://yourdomain.com/api/telegram/webhook

# Server
PORT=3000
NODE_ENV=production
```

## Docker Commands

### Build
```bash
docker build -t grievance-api .
```

### Run
```bash
docker run -d -p 3000:3000 --env-file .env --name grievance-api grievance-api
```

### Stop
```bash
docker stop grievance-api
```

### Remove
```bash
docker rm grievance-api
```

### View logs
```bash
docker logs -f grievance-api
```

### Execute commands inside container
```bash
docker exec -it grievance-api sh
```

### Restart
```bash
docker restart grievance-api
```

## Docker Compose Commands

### Start services
```bash
docker-compose up -d
```

### Stop services
```bash
docker-compose down
```

### View logs
```bash
docker-compose logs -f
```

### Rebuild and restart
```bash
docker-compose up -d --build
```

### Scale services (if needed)
```bash
docker-compose up -d --scale api=3
```

## Health Check

The container includes a health check that runs every 30 seconds:
```bash
docker ps
```

Look for the `STATUS` column - it should show `healthy` after ~40 seconds.

## Troubleshooting

### Container won't start
```bash
# Check logs
docker logs grievance-api

# Check if port is already in use
netstat -ano | findstr :3000  # Windows
lsof -i :3000                  # Linux/Mac
```

### Database connection issues
```bash
# Test database connection from container
docker exec -it grievance-api node -e "
const { Pool } = require('pg');
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false }
});
pool.query('SELECT NOW()', (err, res) => {
  console.log(err ? err : res.rows);
  pool.end();
});
"
```

### Telegram bot not working
```bash
# Check if bot token is set
docker exec -it grievance-api printenv | grep TELEGRAM

# Check bot logs
docker logs grievance-api | grep -i telegram
```

## Production Deployment

### Using Docker Hub

1. **Tag the image:**
```bash
docker tag grievance-api yourusername/grievance-api:latest
```

2. **Push to Docker Hub:**
```bash
docker login
docker push yourusername/grievance-api:latest
```

3. **Pull and run on server:**
```bash
docker pull yourusername/grievance-api:latest
docker run -d -p 3000:3000 --env-file .env yourusername/grievance-api:latest
```

### Using Docker Swarm

1. **Initialize swarm:**
```bash
docker swarm init
```

2. **Deploy stack:**
```bash
docker stack deploy -c docker-compose.yml grievance
```

3. **Check services:**
```bash
docker service ls
```

### Using Kubernetes

Create `k8s-deployment.yaml`:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: grievance-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: grievance-api
  template:
    metadata:
      labels:
        app: grievance-api
    spec:
      containers:
      - name: api
        image: yourusername/grievance-api:latest
        ports:
        - containerPort: 3000
        envFrom:
        - secretRef:
            name: grievance-secrets
---
apiVersion: v1
kind: Service
metadata:
  name: grievance-api-service
spec:
  selector:
    app: grievance-api
  ports:
  - port: 80
    targetPort: 3000
  type: LoadBalancer
```

Deploy:
```bash
kubectl apply -f k8s-deployment.yaml
```

## Monitoring

### Check container stats
```bash
docker stats grievance-api
```

### Check container health
```bash
docker inspect --format='{{.State.Health.Status}}' grievance-api
```

### Export logs
```bash
docker logs grievance-api > api.log 2>&1
```

## Backup and Restore

### Backup container
```bash
docker commit grievance-api grievance-api-backup
docker save grievance-api-backup > grievance-api-backup.tar
```

### Restore container
```bash
docker load < grievance-api-backup.tar
docker run -d -p 3000:3000 --env-file .env grievance-api-backup
```

## Security Best Practices

1. **Don't include .env in image:**
   - Use `--env-file` or environment variables
   - Never commit `.env` to git

2. **Use secrets management:**
   - Docker secrets (Swarm)
   - Kubernetes secrets
   - HashiCorp Vault

3. **Run as non-root user:**
   - Already configured in Dockerfile (node user)

4. **Keep base image updated:**
```bash
docker pull node:18-alpine
docker build --no-cache -t grievance-api .
```

5. **Scan for vulnerabilities:**
```bash
docker scan grievance-api
```

## Performance Optimization

### Multi-stage build (optional)
```dockerfile
# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# Production stage
FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app .
CMD ["npm", "start"]
```

### Reduce image size
```bash
# Check image size
docker images | grep grievance-api

# Use alpine base
# Remove dev dependencies
# Clean npm cache
```

## Support

For issues:
1. Check logs: `docker logs grievance-api`
2. Check health: `docker inspect grievance-api`
3. Test endpoints: `curl http://localhost:3000/api/health`
