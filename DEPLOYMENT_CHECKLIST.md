# MyKipenzi Missing Features - Deployment Checklist

**Date:** January 9, 2026  
**Features:** 20 new features (67% complete)

---

## ✅ Pre-Deployment Checklist

### 1. Database Migration
- [ ] Backup existing database
- [ ] Review migration file: `server/migrations/001_add_missing_features.sql`
- [ ] Test migration on staging environment
- [ ] Run migration on production database

```bash
# Backup database
pg_dump -U kipenzi kipenzi_db > backup_before_features.sql

# Run migration
psql -U kipenzi -d kipenzi_db -f server/migrations/001_add_missing_features.sql
```

### 2. Dependencies Check
- [ ] No new npm dependencies required ✓
- [ ] Redis available for backup storage
- [ ] PostgreSQL version >= 13 (for GIN indexes, JSONB)
- [ ] Storage available for backups

### 3. Environment Variables
- [ ] No new environment variables required ✓
- [ ] Existing config sufficient
- [ ] VAPID keys for push notifications (optional)

### 4. Frontend Build
- [ ] Run `npm install` (if needed)
- [ ] Build frontend: `npm run build`
- [ ] Verify dist/ folder created
- [ ] Test build locally

```bash
npm install
npm run build
```

### 5. Backend Updates
- [ ] Review server/app.js changes (100+ new endpoints)
- [ ] Test API endpoints on staging
- [ ] Verify Socket.IO events working
- [ ] Check error handling

---

## 🚀 Deployment Steps

### Step 1: Stop Services
```bash
# Stop backend
pm2 stop kipenzi-api

# Stop worker (if using)
pm2 stop kipenzi-worker
```

### Step 2: Pull Latest Code
```bash
git pull origin main
```

### Step 3: Run Database Migration
```bash
psql -U kipenzi -d kipenzi_db -f server/migrations/001_add_missing_features.sql
```

### Step 4: Build Frontend
```bash
npm run build
```

### Step 5: Restart Services
```bash
# Restart backend
pm2 restart kipenzi-api

# Restart worker
pm2 restart kipenzi-worker

# Verify status
pm2 status
```

### Step 6: Verify Deployment
- [ ] Check `/api/health/ready` endpoint
- [ ] Test new features manually
- [ ] Check logs for errors
- [ ] Monitor performance

```bash
# Test health endpoint
curl https://your-domain.com/api/health/ready

# Check logs
pm2 logs kipenzi-api --lines 50
```

---

## 🧪 Testing Checklist

### Core Features to Test

#### 1. Message Search & Filter ✓
- [ ] Search messages globally
- [ ] Filter by conversation
- [ ] Filter by sender
- [ ] Filter by media type
- [ ] Filter by date range

#### 2. Message Forwarding ✓
- [ ] Forward text message
- [ ] Forward with attachment
- [ ] Add caption when forwarding
- [ ] Verify forwarded indicator

#### 3. Message Pin/Star ✓
- [ ] Pin message (max 3 per chat)
- [ ] Star message
- [ ] View starred messages in library
- [ ] View pinned messages banner

#### 4. Location Sharing ✓
- [ ] Share current location
- [ ] Share live location (15 min)
- [ ] View location on map preview
- [ ] Open in Google Maps
- [ ] Verify location updates

#### 5. Poll Creation ✓
- [ ] Create single-choice poll
- [ ] Create multiple-choice poll
- [ ] Vote on poll
- [ ] View real-time results
- [ ] Anonymous voting works
- [ ] End poll early

#### 6. Cloud Backup ✓
- [ ] Create local backup
- [ ] Download backup JSON
- [ ] View backup history
- [ ] Update backup settings
- [ ] Delete old backups

#### 7. Quick Replies ✓
- [ ] Create template
- [ ] Use template in message
- [ ] Edit template
- [ ] Delete template
- [ ] Search templates

#### 8. Conversation Archive ✓
- [ ] Archive conversation
- [ ] View archived conversations
- [ ] Unarchive manually
- [ ] Auto-unarchive on new message

#### 9. Conversation Mute ✓
- [ ] Mute for 1 hour
- [ ] Mute for 1 day
- [ ] Mute forever
- [ ] Custom mute duration
- [ ] Unmute

#### 10. Group Mentions ✓
- [ ] Type @ to see autocomplete
- [ ] Mention specific user
- [ ] Use @all
- [ ] Receive mention notification
- [ ] View mentions tab

#### 11. Status/Stories ✓
- [ ] Create text status
- [ ] Create photo status
- [ ] View partner's status
- [ ] See who viewed
- [ ] Status expires after 24h

#### 12. Offline Mode ✓
- [ ] Send message offline (queued)
- [ ] See offline indicator
- [ ] Messages send when back online
- [ ] Failed messages retry

#### 13. Performance ✓
- [ ] Scroll long conversation (1000+ messages)
- [ ] Load images smoothly
- [ ] No lag when typing
- [ ] Quick navigation

---

## 🔍 Monitoring

### Key Metrics to Watch

#### Database Performance
```sql
-- Check new table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE tablename IN (
  'location_shares', 'polls', 'poll_votes', 'chat_backups',
  'quick_replies', 'archived_conversations', 'muted_conversations'
)
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE tablename IN ('messages', 'saved_messages', 'polls')
ORDER BY idx_scan DESC;
```

#### API Performance
- Average response time: < 200ms
- Error rate: < 1%
- Request rate: Monitor 100+ new endpoints

#### User Engagement
- Feature adoption rate
- Active users using new features
- Error reports from users

---

## 🐛 Troubleshooting

### Common Issues

#### 1. Migration Failed
```bash
# Rollback migration (if needed)
psql -U kipenzi -d kipenzi_db

# Inside psql:
BEGIN;
-- Review failed migration
-- Drop created tables if needed
DROP TABLE IF EXISTS location_shares CASCADE;
DROP TABLE IF EXISTS polls CASCADE;
-- etc.
ROLLBACK;
```

#### 2. API Endpoints Not Working
- Check `server/app.js` loaded correctly
- Verify no syntax errors
- Check server logs: `pm2 logs kipenzi-api`
- Test individual endpoints with curl

#### 3. Frontend Not Updated
```bash
# Clear build cache
rm -rf dist/
rm -rf node_modules/.cache/

# Rebuild
npm run build

# Force browser cache clear
# Add ?v=2 to index.html in production
```

#### 4. Database Connection Issues
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Check connections
SELECT count(*) FROM pg_stat_activity;

# Check locks
SELECT * FROM pg_locks WHERE NOT granted;
```

#### 5. Redis Connection Issues
```bash
# Check Redis is running
redis-cli ping
# Should return: PONG

# Check memory usage
redis-cli info memory
```

---

## 📋 Rollback Plan

If something goes wrong:

### 1. Rollback Code
```bash
git revert HEAD
npm run build
pm2 restart all
```

### 2. Rollback Database (if needed)
```bash
# Restore from backup
psql -U kipenzi -d kipenzi_db < backup_before_features.sql
```

### 3. Notify Users
- Post status update
- Apologize for downtime
- Provide ETA for fix

---

## 📊 Success Criteria

Deployment is successful if:

- [ ] All 100+ new API endpoints responding
- [ ] Database migration completed without errors
- [ ] No increase in error rate (< 1%)
- [ ] Response times within acceptable range (< 200ms avg)
- [ ] New features visible and functional in UI
- [ ] No existing features broken
- [ ] Logs show no critical errors
- [ ] User reports are positive

---

## 📞 Support Contacts

**Emergency Contact:**
- Developer: [Your Name]
- Phone: [Your Phone]
- Email: [Your Email]

**Monitoring:**
- Status Page: [Your Status Page]
- Error Tracking: [Your Error Tracker]
- Logs: `pm2 logs` or `/var/log/kipenzi/`

---

## 📝 Post-Deployment Tasks

### Within 1 Hour
- [ ] Monitor error logs
- [ ] Check key metrics dashboard
- [ ] Test critical user flows
- [ ] Respond to user reports

### Within 24 Hours
- [ ] Review all new feature usage stats
- [ ] Check database performance
- [ ] Optimize slow queries if any
- [ ] Document any issues found

### Within 1 Week
- [ ] User feedback survey
- [ ] Performance optimization
- [ ] Fix minor bugs
- [ ] Plan next feature iteration

---

**Deployment Date:** ______________  
**Deployed By:** ______________  
**Sign-off:** ______________  

**Status:** 
- [ ] Pre-deployment checklist complete
- [ ] Deployment successful
- [ ] Post-deployment verification complete
- [ ] Ready for production traffic

---

**Last Updated:** January 9, 2026  
**Version:** 1.0.0
