# MyKipenzi Deployment Guide

**Version:** 1.0.0  
**Last Updated:** January 9, 2026

## 📋 Pre-Deployment Checklist

### ✅ Code & Dependencies
- [ ] All features tested locally
- [ ] No console errors in production build
- [ ] Dependencies updated to latest stable versions
- [ ] Security audit completed (`npm audit`)
- [ ] Linting passes without errors (`npm run check`)
- [ ] Tests pass (`npm test`)

### ✅ Database
- [ ] Migration scripts ready (`server/migrations/`)
- [ ] Database backup taken
- [ ] Indexes created for performance
- [ ] Connection pool configured
- [ ] Database credentials secured

### ✅ Environment Variables
- [ ] All required env vars documented
- [ ] Production secrets generated
- [ ] CORS origins configured
- [ ] Rate limiting configured
- [ ] File upload limits set

### ✅ Security
- [ ] HTTPS enabled
- [ ] Content Security Policy configured
- [ ] Rate limiting tested
- [ ] SQL injection prevention verified
- [ ] XSS protection enabled
- [ ] Session security configured

---

## 🚀 Deployment Steps

### 1. Prepare Production Environment

```bash
# Clone repository
git clone https://github.com/your-org/mykipenzi.git
cd mykipenzi

# Install dependencies
npm install --production

# Build frontend
npm run build
```

### 2. Configure Environment Variables

Create `.env` file in project root:

```bash
# Server Configuration
NODE_ENV=production
PORT=3000
TRUST_PROXY=true

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/kipenzi_production

# Redis
REDIS_URL=redis://localhost:6379

# Storage (AWS S3)
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=kipenzi-production

# Session & Security
SESSION_SECRET=your_very_long_random_secret_here_min_32_chars
CSRF_SECRET=another_very_long_random_secret_here

# Features (Optional)
GEMINI_API_KEY=your_gemini_key_for_translation
ELEVENLABS_API_KEY=your_elevenlabs_key_for_voice
TURN_URL=turn:your-turn-server.com:3478
TURN_SECRET=your_turn_secret

# Push Notifications (Optional)
VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
VAPID_EMAIL=mailto:admin@mykipenzi.com

# Registration
ALLOW_REGISTRATION=true

# App URL
APP_ORIGIN=https://mykipenzi.com
```

### 3. Run Database Migration

```bash
# Connect to production database
psql $DATABASE_URL

# Run migration
\i server/migrations/001_add_missing_features.sql

# Verify tables created
\dt

# Exit
\q
```

### 4. Start Services

#### Using PM2 (Recommended)

```bash
# Install PM2 globally
npm install -g pm2

# Start backend server
pm2 start server/index.js --name kipenzi-api

# Start worker for background jobs
pm2 start server/worker.js --name kipenzi-worker

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup

# Monitor logs
pm2 logs
```

#### Using Systemd

Create `/etc/systemd/system/kipenzi.service`:

```ini
[Unit]
Description=MyKipenzi Backend Server
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=kipenzi
WorkingDirectory=/var/www/kipenzi
Environment=NODE_ENV=production
ExecStart=/usr/bin/node server/index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Start the service:

```bash
sudo systemctl enable kipenzi
sudo systemctl start kipenzi
sudo systemctl status kipenzi
```

### 5. Configure Reverse Proxy (Nginx)

Create `/etc/nginx/sites-available/kipenzi`:

```nginx
upstream kipenzi_backend {
    server localhost:3000;
}

server {
    listen 80;
    listen [::]:80;
    server_name mykipenzi.com www.mykipenzi.com;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name mykipenzi.com www.mykipenzi.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/mykipenzi.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mykipenzi.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Static files
    location / {
        root /var/www/kipenzi/dist;
        try_files $uri $uri/ /index.html;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API endpoints
    location /api {
        proxy_pass http://kipenzi_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Increase timeouts for long-running requests
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # WebSocket (Socket.IO)
    location /socket.io {
        proxy_pass http://kipenzi_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket timeouts
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
    }

    # File upload size limit
    client_max_body_size 25M;
}
```

Enable the site and restart Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/kipenzi /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 6. Setup SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d mykipenzi.com -d www.mykipenzi.com

# Auto-renewal is configured automatically
sudo certbot renew --dry-run
```

---

## 🐳 Docker Deployment

### Using Docker Compose

Already configured in `compose.yaml` and `deploy/compose.production.yaml`.

```bash
# Production deployment
cd deploy
docker-compose -f compose.production.yaml up -d

# View logs
docker-compose logs -f

# Scale workers
docker-compose up -d --scale worker=3
```

### Manual Docker Build

```bash
# Build image
docker build -t mykipenzi:latest .

# Run container
docker run -d \
  --name kipenzi \
  -p 3000:3000 \
  --env-file .env \
  --restart unless-stopped \
  mykipenzi:latest
```

---

## ☁️ Cloud Platform Deployment

### Google Cloud Platform (GCP)

Using the provided deployment script:

```bash
cd deploy
chmod +x gcp-deploy.ps1
./gcp-deploy.ps1
```

Manual deployment:

```bash
# Build and push to Container Registry
gcloud builds submit --tag gcr.io/PROJECT_ID/kipenzi

# Deploy to Cloud Run
gcloud run deploy kipenzi \
  --image gcr.io/PROJECT_ID/kipenzi \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production
```

### AWS Elastic Beanstalk

```bash
# Install EB CLI
pip install awsebcli

# Initialize
eb init

# Create environment
eb create kipenzi-prod

# Deploy
eb deploy

# Open in browser
eb open
```

### Heroku

```bash
# Login
heroku login

# Create app
heroku create mykipenzi

# Add PostgreSQL
heroku addons:create heroku-postgresql:hobby-dev

# Add Redis
heroku addons:create heroku-redis:hobby-dev

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set SESSION_SECRET=your_secret

# Deploy
git push heroku main

# Run migrations
heroku run npm run migrate

# Scale workers
heroku ps:scale worker=1

# Open app
heroku open
```

---

## 📊 Monitoring & Logging

### Setup PM2 Monitoring

```bash
# Enable PM2 monitoring
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7

# View real-time logs
pm2 logs

# Monitor resources
pm2 monit
```

### Setup Error Tracking (Sentry)

```bash
npm install @sentry/node @sentry/integrations

# Add to server/index.js
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});
```

### Setup Performance Monitoring

Add to `server/app.js`:

```javascript
import responseTime from 'response-time';

app.use(responseTime((req, res, time) => {
  if (time > 1000) {
    logger.warn({ path: req.path, time }, 'Slow request');
  }
}));
```

---

## 🔄 CI/CD Pipeline

### GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '24'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run tests
        run: npm test
        
      - name: Build
        run: npm run build
        
      - name: Deploy to server
        uses: easingthemes/ssh-deploy@v2
        env:
          SSH_PRIVATE_KEY: ${{ secrets.SSH_PRIVATE_KEY }}
          REMOTE_HOST: ${{ secrets.REMOTE_HOST }}
          REMOTE_USER: ${{ secrets.REMOTE_USER }}
          TARGET: /var/www/kipenzi
          
      - name: Restart services
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.REMOTE_HOST }}
          username: ${{ secrets.REMOTE_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /var/www/kipenzi
            pm2 restart all
```

---

## 🔧 Post-Deployment Tasks

### 1. Verify Health Endpoints

```bash
curl https://mykipenzi.com/api/health/live
curl https://mykipenzi.com/api/health/ready
```

### 2. Test Critical Features

- [ ] User registration and login
- [ ] Sending messages
- [ ] File uploads
- [ ] Real-time updates (Socket.IO)
- [ ] Push notifications
- [ ] Search functionality
- [ ] Media vault
- [ ] Status/Stories

### 3. Setup Monitoring Alerts

- Database connection failures
- High error rates
- Slow response times
- Disk space warnings
- Memory usage alerts

### 4. Configure Backups

#### Database Backups

```bash
# Daily backup script
#!/bin/bash
BACKUP_DIR="/backups/database"
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump $DATABASE_URL > $BACKUP_DIR/kipenzi_$DATE.sql
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
```

Add to crontab:
```bash
0 2 * * * /path/to/backup-script.sh
```

#### File Storage Backups

For S3, enable versioning and lifecycle policies in AWS Console.

---

## 🐛 Troubleshooting

### App Won't Start

```bash
# Check logs
pm2 logs kipenzi-api --lines 100

# Check environment variables
pm2 env 0

# Restart with fresh logs
pm2 delete all
pm2 start server/index.js --name kipenzi-api
```

### Database Connection Issues

```bash
# Test connection
psql $DATABASE_URL

# Check connection pool
SELECT count(*) FROM pg_stat_activity;

# Kill idle connections
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE state = 'idle' AND state_change < now() - interval '5 minutes';
```

### High Memory Usage

```bash
# Check memory
pm2 monit

# Restart worker
pm2 restart kipenzi-worker

# Check for memory leaks
node --inspect server/index.js
```

### Socket.IO Not Working

- Verify WebSocket proxy configuration in Nginx
- Check firewall allows WebSocket connections
- Verify CORS origin matches

---

## 📈 Performance Optimization

### 1. Enable Compression

```javascript
import compression from 'compression';
app.use(compression());
```

### 2. Setup Redis Caching

```javascript
const cache = await redis.get(`conversation:${id}`);
if (cache) return JSON.parse(cache);

const data = await db.query(/* ... */);
await redis.setex(`conversation:${id}`, 300, JSON.stringify(data));
```

### 3. Database Query Optimization

```sql
-- Add missing indexes
CREATE INDEX CONCURRENTLY idx_messages_conversation_seq 
ON messages(conversation_id, seq DESC) 
WHERE deleted_at IS NULL;

-- Analyze query performance
EXPLAIN ANALYZE SELECT ...;
```

### 4. CDN for Static Assets

Configure CloudFlare or similar CDN for:
- Static files in `/dist`
- User uploads from S3
- Avatar images

---

## 🔒 Security Hardening

### 1. Update Dependencies Regularly

```bash
npm audit
npm audit fix
npm outdated
```

### 2. Enable Rate Limiting

Already configured in `server/infra.js`.

### 3. Configure Firewall

```bash
# Allow only necessary ports
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 4. Disable Unused Features

Set environment variables to disable optional features you don't need.

---

## 📞 Support & Maintenance

### Regular Maintenance Schedule

**Daily:**
- Check application logs
- Monitor error rates
- Verify backup completion

**Weekly:**
- Review performance metrics
- Check disk space
- Update dependencies

**Monthly:**
- Security audit
- Database optimization
- Review and rotate logs

---

## 🎉 Success!

Your MyKipenzi app is now deployed and running in production!

**Next Steps:**
1. Monitor performance for first 24-48 hours
2. Collect user feedback
3. Setup analytics (Google Analytics, Mixpanel, etc.)
4. Plan feature rollout schedule

---

**Need Help?**
- Check logs: `pm2 logs`
- Review documentation: `IMPLEMENTATION_STATUS.md`
- Contact development team

**Happy Deploying! 💚**
