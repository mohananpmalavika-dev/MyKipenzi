# Message Drafts - Verification Checklist ✅

Use this checklist to verify the Message Drafts feature is working correctly.

## 📋 Pre-Deployment Checklist

### Database
- [x] Migration file created (`server/drafts-schema.sql`)
- [x] Migration script updated (`server/migrate.js`)
- [x] Migration executed successfully
- [x] Table `message_drafts` exists in database
- [x] Indexes created correctly
- [x] Trigger for `updated_at` working
- [x] Foreign key constraints working
- [x] Cascade delete rules working

### Server-Side Code
- [x] API endpoint: `GET /api/conversations/:id/draft`
- [x] API endpoint: `PUT /api/conversations/:id/draft`
- [x] API endpoint: `DELETE /api/conversations/:id/draft`
- [x] API endpoint: `GET /api/drafts`
- [x] Rate limiting configured (100 req/min)
- [x] Input validation implemented
- [x] Error handling implemented
- [x] Cleanup job added to maintenance sweep
- [x] Authentication checks in place
- [x] Membership verification implemented

### Client-Side Code
- [x] `useDraftManager` hook created
- [x] Hook imported in `App.jsx`
- [x] Hook initialized with correct parameters
- [x] Auto-save debouncing working (1 second)
- [x] Draft loading on conversation change
- [x] Draft clearing after send
- [x] Conversation list updated to show drafts
- [x] Draft indicator styling applied

### Documentation
- [x] Technical documentation (`docs/MESSAGE_DRAFTS.md`)
- [x] Implementation summary (`MESSAGE_DRAFTS_IMPLEMENTATION.md`)
- [x] User guide (`DRAFTS_USER_GUIDE.md`)
- [x] Architecture diagram (`DRAFTS_ARCHITECTURE.md`)
- [x] Feature complete summary (`DRAFTS_FEATURE_COMPLETE.md`)
- [x] Verification checklist (this file)

### Testing
- [x] Unit tests created (`tests/drafts.test.js`)
- [x] E2E tests created (`tests/e2e/drafts.spec.js`)
- [x] All unit tests passing
- [x] Test coverage adequate (>80%)

---

## 🧪 Manual Testing Checklist

### Basic Functionality
- [ ] **Draft Creation**
  - [ ] Type a message in conversation A
  - [ ] Wait 1+ seconds
  - [ ] Switch to conversation B
  - [ ] Return to conversation A
  - [ ] Draft text appears in textarea ✅

- [ ] **Draft Auto-Save**
  - [ ] Type a message
  - [ ] Wait 1 second
  - [ ] Check browser network tab for PUT request ✅
  - [ ] Verify 200 OK response

- [ ] **Draft Restoration**
  - [ ] Create a draft
  - [ ] Close the app/browser
  - [ ] Reopen the app
  - [ ] Navigate to conversation with draft
  - [ ] Draft appears immediately ✅

- [ ] **Draft Indicator**
  - [ ] Create draft in conversation
  - [ ] Navigate to conversation list
  - [ ] See "📝 Draft:" indicator in red italic ✅
  - [ ] Preview shows first ~50 characters

- [ ] **Draft Clearing**
  - [ ] Create a draft
  - [ ] Send the message
  - [ ] Textarea is empty ✅
  - [ ] Draft indicator removed from list ✅
  - [ ] Return to conversation - no draft restored ✅

### Edge Cases
- [ ] **Empty Draft**
  - [ ] Type a message
  - [ ] Delete all text
  - [ ] Wait 1 second
  - [ ] Draft should be deleted from server ✅

- [ ] **Very Long Draft**
  - [ ] Type a message >50 characters
  - [ ] Check conversation list
  - [ ] Preview is truncated with "..." ✅

- [ ] **Maximum Length**
  - [ ] Try to save draft >5000 characters
  - [ ] Should be rejected or truncated ✅

- [ ] **Multiple Drafts**
  - [ ] Create drafts in 3+ conversations
  - [ ] Each conversation shows own draft ✅
  - [ ] Switching between them preserves each ✅

- [ ] **Language Preservation**
  - [ ] Select "Malayalam" language
  - [ ] Type a draft
  - [ ] Switch conversations and back
  - [ ] Language still set to "Malayalam" ✅

### Error Handling
- [ ] **Network Error**
  - [ ] Disconnect internet
  - [ ] Type a draft
  - [ ] Check console - no errors breaking app ✅
  - [ ] Reconnect internet
  - [ ] Draft saves on next change ✅

- [ ] **Server Error**
  - [ ] Simulate server error (stop server temporarily)
  - [ ] Try to save draft
  - [ ] No app crash ✅
  - [ ] Error handled silently ✅

- [ ] **Invalid Data**
  - [ ] Try to load draft for non-existent conversation
  - [ ] Should handle gracefully ✅

### Performance
- [ ] **Save Performance**
  - [ ] Type rapidly
  - [ ] Only 1 save request per second ✅
  - [ ] No excessive API calls ✅

- [ ] **Load Performance**
  - [ ] Open conversation with draft
  - [ ] Draft appears within 100ms ✅
  - [ ] No noticeable lag ✅

- [ ] **List Performance**
  - [ ] Load conversation list with 10+ drafts
  - [ ] List loads quickly ✅
  - [ ] No performance degradation ✅

### Security
- [ ] **Authentication**
  - [ ] Logged out user cannot access draft endpoints ✅
  - [ ] 401 Unauthorized response ✅

- [ ] **Authorization**
  - [ ] User A cannot access User B's drafts ✅
  - [ ] Conversation membership checked ✅

- [ ] **Rate Limiting**
  - [ ] Rapidly save drafts 100+ times
  - [ ] Rate limit kicks in ✅
  - [ ] 429 Too Many Requests response ✅

---

## 🔍 Database Verification

### Check Table Structure
```sql
-- Run in PostgreSQL console
\d message_drafts

-- Expected output:
-- Table "public.message_drafts"
-- Column | Type | Modifiers
-- user_id | uuid | not null
-- conversation_id | uuid | not null
-- text | text | not null default ''
-- reply_to_id | uuid |
-- source_language | text | not null default 'auto'
-- created_at | timestamptz | not null default now()
-- updated_at | timestamptz | not null default now()
-- Indexes: PRIMARY KEY (user_id, conversation_id)
-- Check constraints: (length(text) <= 5000)
```

### Check Sample Data
```sql
-- View drafts
SELECT 
  user_id,
  conversation_id,
  left(text, 50) as preview,
  source_language,
  created_at,
  updated_at
FROM message_drafts
ORDER BY updated_at DESC
LIMIT 10;
```

### Check Indexes
```sql
-- List indexes
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'message_drafts';

-- Expected:
-- message_drafts_pkey (PRIMARY KEY)
-- message_drafts_updated_at (INDEX)
```

### Check Trigger
```sql
-- Verify trigger exists
SELECT tgname, tgtype
FROM pg_trigger
WHERE tgrelid = 'message_drafts'::regclass;

-- Expected:
-- message_drafts_update_timestamp (BEFORE UPDATE trigger)
```

---

## 📊 API Testing

### Test GET /api/conversations/:id/draft
```bash
# With curl (replace with your values)
curl -X GET \
  -H "Cookie: kipenzi_session=your_session_token" \
  http://localhost:3000/api/conversations/your-conversation-id/draft

# Expected response (with draft):
{
  "text": "Draft message text",
  "reply_to_id": null,
  "source_language": "auto",
  "updated_at": "2026-10-09T12:00:00Z"
}

# Expected response (no draft):
{
  "text": "",
  "reply_to_id": null,
  "source_language": "auto"
}
```

### Test PUT /api/conversations/:id/draft
```bash
# Save draft
curl -X PUT \
  -H "Cookie: kipenzi_session=your_session_token" \
  -H "Content-Type: application/json" \
  -d '{"text":"Test draft","source_language":"en"}' \
  http://localhost:3000/api/conversations/your-conversation-id/draft

# Expected response:
{
  "user_id": "uuid",
  "conversation_id": "uuid",
  "text": "Test draft",
  "reply_to_id": null,
  "source_language": "en",
  "created_at": "2026-10-09T12:00:00Z",
  "updated_at": "2026-10-09T12:00:00Z"
}
```

### Test DELETE /api/conversations/:id/draft
```bash
# Delete draft
curl -X DELETE \
  -H "Cookie: kipenzi_session=your_session_token" \
  http://localhost:3000/api/conversations/your-conversation-id/draft

# Expected response:
{
  "ok": true
}
```

### Test GET /api/drafts
```bash
# Get all drafts
curl -X GET \
  -H "Cookie: kipenzi_session=your_session_token" \
  http://localhost:3000/api/drafts

# Expected response:
[
  {
    "conversation_id": "uuid",
    "text": "Draft text",
    "updated_at": "2026-10-09T12:00:00Z",
    "name": "Conversation Name",
    "is_group": false
  }
]
```

---

## 🧹 Cleanup Verification

### Test Draft Expiration
```sql
-- Manually set a draft to be 31 days old
UPDATE message_drafts
SET updated_at = now() - interval '31 days'
WHERE user_id = 'your-user-id';

-- Wait for maintenance sweep (runs every 5 seconds)
-- or trigger manually if possible

-- Verify draft was deleted
SELECT * FROM message_drafts
WHERE user_id = 'your-user-id';
-- Should return no rows
```

---

## ✅ Sign-Off Checklist

After completing all tests above, verify:

- [ ] All basic functionality working
- [ ] All edge cases handled
- [ ] Error handling working properly
- [ ] Performance is acceptable
- [ ] Security measures in place
- [ ] Database structure correct
- [ ] API endpoints functioning
- [ ] Cleanup job running
- [ ] Documentation complete
- [ ] Tests passing

### Final Approval

**Tested By**: _______________  
**Date**: _______________  
**Environment**: [ ] Development [ ] Staging [ ] Production  
**Status**: [ ] ✅ Approved [ ] ❌ Issues Found  

**Notes/Issues**:
```
(Add any notes or issues found during testing)
```

---

## 📝 Issue Template

If you find issues during testing, document them here:

### Issue #1
- **Severity**: [ ] Critical [ ] High [ ] Medium [ ] Low
- **Component**: [ ] Database [ ] Server [ ] Client [ ] UI
- **Description**: 
- **Steps to Reproduce**:
  1. 
  2. 
  3. 
- **Expected Behavior**: 
- **Actual Behavior**: 
- **Screenshots/Logs**: 

---

**Checklist Version**: 1.0.0  
**Last Updated**: October 9, 2026
