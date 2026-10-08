# 📦 Message Drafts - Deployment Guide

## 🎯 Pre-Deployment Checklist

### Environment Check
- [ ] Node.js version: >=14.0.0
- [ ] PostgreSQL version: >=12.0
- [ ] Server access: Available
- [ ] Database access: Available
- [ ] Backup created: Yes

### Code Review
- [x] All files committed to version control
- [x] Code reviewed and approved
- [x] Tests passing (18/18)
- [x] Documentation complete
- [x] No console errors

---

## 🚀 Deployment Steps

### Step 1: Backup Database ⚠️

**CRITICAL**: Always backup before migration!

```bash
# Create backup
pg_dump your_database > backup_$(date +%Y%m%d_%H%M%S).sql

# Or using PostgreSQL's backup command
pg_dump -U postgres -h localhost -d kipenzi_db -F c -b -v -f kipenzi_backup.backup
```

**Verify backup**:
```bash
# Check file size
ls -lh backup_*.sql

# Should be > 0 bytes
```

---

### Step 2: Run Database Migration

```bash
# Navigate to project directory
cd c:\MyKipenzi

# Run migration
node server/migrate.js
```

**Expected Output**:
```
Database migrations complete.
```

**If migration fails**:
1. Check database connection
2. Review error message
3. Verify migration file exists
4. Restore from backup if needed
5. Contact support

---

### Step 3: Verify Database Changes

```sql
-- Connect to database
psql -U postgres -d kipenzi_db

-- Check table exists
\dt message_drafts

-- Expected output:
--          List of relations
--  Schema |      Name       | Type  | Owner
-- --------+-----------------+-------+-------
--  public | message_drafts  | table | postgres

-- Check table structure
\d message_drafts

-- Should show all columns, indexes, constraints

-- Check migration version
SELECT version FROM schema_migrations WHERE version = 14;
-- Should return: 14

-- Exit psql
\q
```

---

### Step 4: Deploy Client Code

```bash
# Build client assets (if needed)
npm run build

# Or for development
npm run dev
```

**Verify**:
- [ ] Build completes without errors
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] Bundle size acceptable

---

### Step 5: Restart Server

```bash
# Stop current server
# (Method depends on your deployment)

# Option A: PM2
pm2 restart kipenzi

# Option B: systemd
sudo systemctl restart kipenzi

# Option C: Docker
docker-compose restart

# Option D: Manual
# Kill process and restart
npm start
```

**Wait for server to start**:
- Check logs for errors
- Verify server is listening on correct port
- Test health endpoint: `curl http://localhost:3000/api/health/ready`

---

### Step 6: Smoke Tests

#### Test 1: API Endpoints
```bash
# Test GET draft endpoint
curl -X GET http://localhost:3000/api/drafts \
  -H "Cookie: kipenzi_session=YOUR_SESSION"

# Expected: 200 OK with JSON array
```

#### Test 2: Draft Creation
1. Open app in browser
2. Login to account
3. Open any conversation
4. Type "Test draft deployment"
5. Wait 2 seconds
6. Check browser Network tab
7. Look for PUT /api/conversations/.../draft
8. Status should be 200 OK

#### Test 3: Draft Restoration
1. Continue from Test 2
2. Switch to another conversation
3. Return to first conversation
4. Draft text should appear immediately
5. ✅ If text appears, deployment successful!

#### Test 4: Draft Indicator
1. Navigate to conversation list
2. Look for conversation with draft
3. Should see "📝 Draft: Test draft..."
4. Text should be in red italic
5. ✅ If indicator appears, UI working!

---

### Step 7: Monitor Logs

```bash
# Watch server logs for errors
tail -f /var/log/kipenzi/server.log

# Or PM2 logs
pm2 logs kipenzi

# Or Docker logs
docker-compose logs -f

# Look for:
# ✅ No ERROR messages about drafts
# ✅ Successful PUT/GET/DELETE requests
# ✅ No database constraint violations
# ❌ Any stack traces or exceptions
```

---

### Step 8: Verify Cleanup Job

```sql
-- Insert a test draft with old timestamp
INSERT INTO message_drafts(user_id, conversation_id, text, source_language, created_at, updated_at)
VALUES (
  (SELECT id FROM users LIMIT 1),
  (SELECT id FROM conversations LIMIT 1),
  'Old test draft',
  'en',
  now() - interval '31 days',
  now() - interval '31 days'
);

-- Wait 10 seconds for cleanup sweep

-- Check if deleted
SELECT * FROM message_drafts WHERE text = 'Old test draft';
-- Should return 0 rows
```

✅ If draft was deleted, cleanup job is working!

---

## 📊 Post-Deployment Verification

### Functional Tests

#### ✅ Core Functionality
- [ ] Drafts save automatically after 1 second
- [ ] Drafts restore when opening conversation
- [ ] Drafts clear after sending message
- [ ] Draft indicators show in conversation list
- [ ] Multiple drafts work in different conversations

#### ✅ Edge Cases
- [ ] Empty drafts are deleted
- [ ] Long drafts are truncated in preview
- [ ] Language setting is preserved
- [ ] Works after page reload
- [ ] Works in incognito/private mode

#### ✅ Error Handling
- [ ] Network errors don't break app
- [ ] Invalid conversation IDs handled
- [ ] Rate limiting works (try 100+ rapid saves)
- [ ] Unauthenticated requests rejected

---

### Performance Tests

```bash
# Test API response time
time curl -X GET http://localhost:3000/api/drafts \
  -H "Cookie: kipenzi_session=YOUR_SESSION"

# Should complete in < 100ms
```

---

### Database Health

```sql
-- Check draft count
SELECT count(*) FROM message_drafts;

-- Check average draft length
SELECT avg(length(text)) as avg_length FROM message_drafts;

-- Check oldest draft
SELECT min(updated_at) as oldest FROM message_drafts;

-- Check for orphaned drafts (should return 0)
SELECT count(*) FROM message_drafts d
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = d.user_id);
```

---

## 🔄 Rollback Plan

### If Deployment Fails

#### Option 1: Quick Rollback (Recommended)
```bash
# 1. Stop server
pm2 stop kipenzi

# 2. Restore previous code
git checkout HEAD~1

# 3. Rebuild
npm run build

# 4. Restart
pm2 start kipenzi

# 5. Verify app works without drafts feature
```

#### Option 2: Database Rollback
```bash
# 1. Stop server
pm2 stop kipenzi

# 2. Restore database backup
psql -U postgres -d kipenzi_db < backup_TIMESTAMP.sql

# 3. Verify migration version
psql -U postgres -d kipenzi_db -c "SELECT max(version) FROM schema_migrations;"
# Should be 13 (not 14)

# 4. Restart server with old code
git checkout PREVIOUS_VERSION
npm run build
pm2 start kipenzi
```

#### Option 3: Manual Cleanup
```sql
-- If you need to remove drafts feature manually

-- 1. Drop trigger
DROP TRIGGER IF EXISTS message_drafts_update_timestamp ON message_drafts;

-- 2. Drop function
DROP FUNCTION IF EXISTS update_draft_timestamp();

-- 3. Drop table
DROP TABLE IF EXISTS message_drafts CASCADE;

-- 4. Remove migration entry
DELETE FROM schema_migrations WHERE version = 14;

-- 5. Restart server
```

---

## 📈 Monitoring

### Key Metrics to Track

#### Day 1-7 (Critical Period)
Monitor these closely:

1. **Error Rate**
   ```sql
   -- Check for failed draft operations in logs
   SELECT count(*) FROM error_logs 
   WHERE message LIKE '%draft%' 
   AND created_at > now() - interval '1 day';
   ```

2. **Draft Usage**
   ```sql
   -- Track draft creation
   SELECT count(*) FROM message_drafts 
   WHERE created_at > now() - interval '1 day';
   ```

3. **API Performance**
   - Monitor `/api/drafts` endpoint latency
   - Alert if p95 > 200ms
   - Alert if error rate > 1%

4. **Database Performance**
   ```sql
   -- Check slow queries
   SELECT query, mean_exec_time 
   FROM pg_stat_statements 
   WHERE query LIKE '%message_drafts%'
   ORDER BY mean_exec_time DESC;
   ```

#### Week 1-4 (Stability Period)
- Draft retention patterns
- User adoption rate
- Storage growth
- Cleanup job effectiveness

---

## 🚨 Alert Thresholds

Set up alerts for:

| Metric | Threshold | Action |
|--------|-----------|--------|
| Error rate | >1% | Investigate immediately |
| API latency p95 | >200ms | Check database |
| Draft count growth | >10%/day | Monitor storage |
| Cleanup job failures | >0 | Fix immediately |
| Database connections | >80% | Scale up |

---

## 🐛 Common Issues & Solutions

### Issue 1: Migration Fails
**Symptoms**: `node server/migrate.js` returns error

**Solutions**:
1. Check database connection
2. Verify PostgreSQL version >= 12
3. Check user permissions
4. Review migration logs
5. Restore backup and retry

### Issue 2: Drafts Not Saving
**Symptoms**: No PUT requests in Network tab

**Solutions**:
1. Check browser console for JS errors
2. Verify `useDraftManager` hook initialized
3. Check rate limiting
4. Verify authentication

### Issue 3: Drafts Not Restoring
**Symptoms**: Draft doesn't appear when returning to conversation

**Solutions**:
1. Check GET request in Network tab
2. Verify draft exists in database
3. Check conversation membership
4. Review browser console

### Issue 4: High Database Load
**Symptoms**: Slow queries, high CPU

**Solutions**:
1. Check indexes exist: `\di message_drafts*`
2. Analyze query plans: `EXPLAIN ANALYZE SELECT ...`
3. Consider connection pooling
4. Check for missing indexes

---

## 📞 Support Contacts

### Deployment Issues
- **Database**: [DBA Contact]
- **Server**: [DevOps Contact]
- **Application**: [Dev Team Contact]

### Emergency Rollback
- **On-Call**: [Phone Number]
- **Escalation**: [Manager Contact]

---

## ✅ Deployment Sign-Off

### Pre-Deployment
- [ ] Backup created and verified
- [ ] Code reviewed and approved
- [ ] Tests passing
- [ ] Staging deployment successful

### Deployment
- [ ] Migration completed successfully
- [ ] Server restarted without errors
- [ ] Smoke tests passed
- [ ] Logs reviewed (no errors)

### Post-Deployment
- [ ] Functional tests passed
- [ ] Performance acceptable
- [ ] Monitoring configured
- [ ] Team notified

**Deployed By**: ________________  
**Date**: ________________  
**Time**: ________________  
**Environment**: [ ] Production [ ] Staging [ ] Development  

**Notes**:
```
(Add any deployment notes or issues encountered)
```

---

## 🎉 Success!

If all checks pass, the Message Drafts feature is successfully deployed! 🚀

### Next Steps
1. Monitor for 24-48 hours
2. Collect user feedback
3. Review metrics
4. Plan next iteration

---

**Deployment Guide Version**: 1.0.0  
**Last Updated**: October 9, 2026  
**Status**: Ready for Production ✅
