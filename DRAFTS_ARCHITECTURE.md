# Message Drafts - System Architecture

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (React)                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │                    App.jsx                              │    │
│  │  ┌──────────────────────────────────────────────────┐  │    │
│  │  │  State Management                                 │  │    │
│  │  │  - draft (text)                                   │  │    │
│  │  │  - replyTo                                        │  │    │
│  │  │  - source (language)                              │  │    │
│  │  │  - conversations (with draft metadata)            │  │    │
│  │  └──────────────────────────────────────────────────┘  │    │
│  │                         ↕                               │    │
│  │  ┌──────────────────────────────────────────────────┐  │    │
│  │  │  useDraftManager Hook                             │  │    │
│  │  │  - Auto-save (debounced)                          │  │    │
│  │  │  - Auto-restore                                   │  │    │
│  │  │  - Clear after send                               │  │    │
│  │  └──────────────────────────────────────────────────┘  │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│                           ↕ HTTP/HTTPS                           │
└──────────────────────────────────────────────────────────────────┘
                             
                             ↕
                             
┌──────────────────────────────────────────────────────────────────┐
│                      SERVER (Node.js/Express)                    │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                  API Endpoints (app.js)                    │  │
│  │                                                             │  │
│  │  GET    /api/conversations/:id/draft                       │  │
│  │         → Load draft for conversation                      │  │
│  │                                                             │  │
│  │  PUT    /api/conversations/:id/draft                       │  │
│  │         → Save/update draft                                │  │
│  │                                                             │  │
│  │  DELETE /api/conversations/:id/draft                       │  │
│  │         → Delete draft                                     │  │
│  │                                                             │  │
│  │  GET    /api/drafts                                        │  │
│  │         → Get all user drafts                              │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │            Maintenance Sweep (index.js)                    │  │
│  │  - Runs every 5 seconds                                    │  │
│  │  - Deletes drafts older than 30 days                       │  │
│  │  - Cleanup: WHERE updated_at < now() - interval '30 days'  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                   │
│                           ↕ SQL Queries                           │
└───────────────────────────────────────────────────────────────────┘
                             
                             ↕
                             
┌───────────────────────────────────────────────────────────────────┐
│                      DATABASE (PostgreSQL)                        │
├───────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │              message_drafts TABLE                           │  │
│  │                                                              │  │
│  │  PK: (user_id, conversation_id)                             │  │
│  │                                                              │  │
│  │  Columns:                                                    │  │
│  │  - user_id          uuid (FK → users.id)                    │  │
│  │  - conversation_id  uuid (FK → conversations.id)            │  │
│  │  - text            text (max 5000)                          │  │
│  │  - reply_to_id     uuid (FK → messages.id, nullable)        │  │
│  │  - source_language enum('auto','en','ml','manglish','sw')   │  │
│  │  - created_at      timestamptz                              │  │
│  │  - updated_at      timestamptz (auto-updated via trigger)   │  │
│  │                                                              │  │
│  │  Indexes:                                                    │  │
│  │  - PRIMARY KEY (user_id, conversation_id)                   │  │
│  │  - INDEX on updated_at (for cleanup)                        │  │
│  │                                                              │  │
│  │  Constraints:                                                │  │
│  │  - length(text) <= 5000                                     │  │
│  │  - CASCADE DELETE on user/conversation removal              │  │
│  │  - SET NULL on message (reply_to) deletion                  │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

## 🔄 Data Flow Diagrams

### 1. Draft Creation Flow
```
User Types
    ↓
[textarea onChange]
    ↓
setDraft(newText) ─────────────────┐
    ↓                               │
[1 second debounce]                 │
    ↓                               │
useDraftManager.saveDraft()         │  State
    ↓                               │  Update
PUT /api/conversations/:id/draft    │
    ↓                               │
[Server: Validate & Save]           │
    ↓                               │
INSERT INTO message_drafts          │
    ↓                               │
[Success Response] ─────────────────┘
    ↓
Draft Saved ✅
```

### 2. Draft Restoration Flow
```
User Opens Conversation
    ↓
selectConversation(id)
    ↓
useEffect(conversationId)
    ↓
useDraftManager.loadDraft()
    ↓
GET /api/conversations/:id/draft
    ↓
[Server: Query Database]
    ↓
SELECT FROM message_drafts
    ↓
[Return Draft Data]
    ↓
setDraft(savedDraft.text)
setSource(savedDraft.source_language)
    ↓
Draft Restored in Textarea ✅
```

### 3. Draft Send & Clear Flow
```
User Clicks Send
    ↓
sendMessage()
    ↓
[Upload File if needed]
    ↓
POST /api/conversations/:id/messages
    ↓
[Message Sent Successfully]
    ↓
setDraft('') ───────────────────────┐
setReplyTo(null)                    │
    ↓                               │  Clear
clearDraft() ───────────────────────┤  State
    ↓                               │
DELETE /api/conversations/:id/draft │
    ↓                               │
[Server: Delete Draft]              │
    ↓                               │
DELETE FROM message_drafts ─────────┘
    ↓
Draft Cleared ✅
```

### 4. Draft List Loading Flow
```
User Opens App
    ↓
loadConversations()
    ↓
┌─────────────────────────┬──────────────────────┐
│                         │                      │
│ GET /api/conversations  │  GET /api/drafts     │
│                         │                      │
└──────────┬──────────────┴───────┬──────────────┘
           ↓                      ↓
    [Load Conversations]    [Load Draft Metadata]
           ↓                      ↓
    Conversation Data         Draft Data
           ↓                      ↓
           └──────────┬───────────┘
                      ↓
            [Merge draft into conversations]
                      ↓
            conversations.map(c => ({
              ...c,
              draft: draftMap[c.id]
            }))
                      ↓
            setConversations(merged)
                      ↓
            Conversation List Updated ✅
            (with draft indicators)
```

### 5. Draft Cleanup Flow
```
[Every 5 seconds]
    ↓
Maintenance Sweep Timer
    ↓
DELETE FROM message_drafts
WHERE updated_at < now() - interval '30 days'
    ↓
[Expired Drafts Removed]
    ↓
Database Cleanup Complete ✅
```

## 🗂️ Component Hierarchy

```
App.jsx
├── useDraftManager ────────────────┐
│   ├── Auto-save Effect            │
│   ├── Restore Effect               │ Custom Hook
│   └── Clear Function               │
│                                    │
├── Conversation List ──────────────┤
│   ├── Conversation Item            │
│   │   ├── Avatar                   │ UI Components
│   │   ├── Name                     │
│   │   ├── Draft Indicator 📝       │
│   │   └── Last Message             │
│                                    │
└── Message Composer ───────────────┘
    ├── Textarea (draft input)
    ├── Language Selector
    ├── Reply Indicator
    └── Send Button
```

## 📊 Database Relationships

```
┌─────────────┐         ┌──────────────────┐
│   users     │         │  message_drafts  │
├─────────────┤    ┌───▶├──────────────────┤
│ id (PK)     │────┘    │ user_id (FK)     │
│ handle      │         │ conversation_id  │
│ name        │         │ text             │
│ email       │         │ reply_to_id      │
│ ...         │         │ source_language  │
└─────────────┘         │ created_at       │
                        │ updated_at       │
                        └──────────────────┘
                                 │
                                 ▼
                        ┌──────────────────┐
                        │  conversations   │
                        ├──────────────────┤
                   ┌───▶│ id (PK)          │
                   │    │ direct_key       │
                   │    │ name             │
                   │    │ ...              │
                   │    └──────────────────┘
                   │
┌──────────────────┤
│   messages       │
├──────────────────┤
│ id (PK)          │
│ conversation_id  │
│ sender_id        │
│ text             │
│ ...              │
└──────────────────┘
```

## 🔒 Security Layers

```
┌────────────────────────────────────────────────┐
│              SECURITY LAYERS                   │
├────────────────────────────────────────────────┤
│                                                │
│  1. Authentication                             │
│     - Session token validation                 │
│     - User identity verification               │
│                                                │
│  2. Authorization                              │
│     - User can only access own drafts          │
│     - Conversation membership verification     │
│                                                │
│  3. Rate Limiting                              │
│     - 100 draft saves per minute per user      │
│     - General API limit: 180 req/min           │
│                                                │
│  4. Input Validation                           │
│     - Text length: max 5000 characters         │
│     - Language: enum validation                │
│     - UUID format validation                   │
│                                                │
│  5. Database Constraints                       │
│     - Foreign key constraints                  │
│     - Check constraints                        │
│     - Cascade deletion rules                   │
│                                                │
│  6. Data Isolation                             │
│     - User-scoped queries only                 │
│     - No cross-user data access                │
│                                                │
└────────────────────────────────────────────────┘
```

## ⚡ Performance Optimizations

```
┌────────────────────────────────────────────────┐
│          PERFORMANCE OPTIMIZATIONS             │
├────────────────────────────────────────────────┤
│                                                │
│  CLIENT-SIDE:                                  │
│  ✓ Debounced saves (1s delay)                 │
│  ✓ Silent error handling                       │
│  ✓ Optimistic UI updates                       │
│  ✓ Parallel API calls                          │
│                                                │
│  SERVER-SIDE:                                  │
│  ✓ Indexed database queries                    │
│  ✓ Batch draft loading                         │
│  ✓ Connection pooling                          │
│  ✓ Query result caching                        │
│                                                │
│  DATABASE:                                     │
│  ✓ Composite primary key                       │
│  ✓ Index on updated_at                         │
│  ✓ Trigger for auto-timestamps                 │
│  ✓ Efficient cascade deletes                   │
│                                                │
└────────────────────────────────────────────────┘
```

## 🔄 State Management Flow

```
┌─────────────────────────────────────────────────┐
│              React State Flow                    │
├─────────────────────────────────────────────────┤
│                                                  │
│  [draft] ──────────┐                            │
│  (local state)     │                            │
│         ↕          │                            │
│    Textarea        │     Auto-save Hook         │
│                    ├──────────────────────┐     │
│  [source] ─────────┤                      │     │
│  (local state)     │                      ↓     │
│         ↕          │              ┌──────────┐  │
│  Language Select   │              │  Server  │  │
│                    │              └──────────┘  │
│  [replyTo] ────────┤                      ↓     │
│  (local state)     │              ┌──────────┐  │
│         ↕          │              │    DB    │  │
│  Reply Indicator   │              └──────────┘  │
│                    │                      ↑     │
│  [conversations] ──┘                      │     │
│  (with drafts)                   Load on Open   │
│         ↕                                 │     │
│  Conversation List ───────────────────────┘     │
│  (shows indicators)                             │
│                                                  │
└──────────────────────────────────────────────────┘
```

## 📈 Monitoring Points

```
┌────────────────────────────────────────────────┐
│           MONITORING & LOGGING                 │
├────────────────────────────────────────────────┤
│                                                │
│  Metrics to Track:                             │
│  □ Draft save success rate                     │
│  □ Draft load time (p50, p95, p99)             │
│  □ Average draft length                        │
│  □ Drafts per user                             │
│  □ Draft age distribution                      │
│  □ API endpoint latency                        │
│  □ Database query performance                  │
│  □ Rate limit hits                             │
│                                                │
│  Logs to Capture:                              │
│  □ Draft save errors                           │
│  □ Draft load failures                         │
│  □ Rate limit violations                       │
│  □ Database constraint violations              │
│  □ Cleanup job execution                       │
│                                                │
└────────────────────────────────────────────────┘
```

---

**Architecture Version**: 1.0.0  
**Last Updated**: October 9, 2026  
**Status**: Production Ready ✅
