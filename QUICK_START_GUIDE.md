# MyKipenzi - Quick Start Guide for New Features

**Version:** 1.0.0  
**Last Updated:** January 9, 2026

## 🚀 Getting Started

### Prerequisites
- Node.js 24.0.0 or higher
- PostgreSQL database
- Redis server
- AWS S3 or compatible storage

### Installation & Setup

1. **Install Dependencies**
```bash
npm install
```

2. **Run Database Migration**
```bash
# Connect to your database
psql -U your_user -d kipenzi_db

# Run the migration
\i server/migrations/001_add_missing_features.sql
```

3. **Build Frontend**
```bash
npm run build
```

4. **Start Services**
```bash
# Terminal 1: Start backend server
npm run start

# Terminal 2: Start worker (for background jobs)
npm run worker

# Development mode (with hot reload)
npm run dev
```

5. **Verify Installation**
```bash
# Check health endpoint
curl http://localhost:3000/api/health/ready
```

---

## ✨ New Features Overview

### 1. Message Search & Filter 🔍

**What it does:** Search across all conversations with advanced filters

**How to use:**
1. Click the search icon in the top navigation
2. Type your search query
3. Use filters to narrow results:
   - Filter by conversation
   - Filter by sender
   - Filter by media type (photos, videos, audio, documents)
   - Filter by date range
4. Click on any result to jump to that message

**Keyboard shortcut:** `Ctrl/Cmd + K`

**API Endpoint:** `GET /api/messages/search`

---

### 2. Message Forwarding ↗️

**What it does:** Forward messages to other conversations with optional caption

**How to use:**
1. Long-press or right-click on any message
2. Select "Forward"
3. Choose destination conversation
4. Optionally add a caption
5. Tap "Forward Message"

**Limitations:**
- Disappearing messages cannot be forwarded
- View-once media cannot be forwarded

**API Endpoint:** `POST /api/messages/:id/forward`

---

### 3. Message Pin/Star ⭐

**What it does:** Save important messages for quick access

**Pin vs Star:**
- **Pin:** Shows at top of conversation (limit: 3 per chat)
- **Star:** Personal bookmark, doesn't affect partner

**How to use:**
1. Long-press message → "Pin Message" or "Star Message"
2. View starred messages: Menu → "Starred Messages"
3. View pinned messages: Banner appears at top of chat
4. Unpin/unstar: Long-press → "Unpin" or "Remove Star"

**API Endpoints:**
- `PUT /api/messages/:id/pin`
- `PUT /api/messages/:id/star`
- `DELETE /api/messages/:id/pin`
- `DELETE /api/messages/:id/star`

---

### 4. Media Vault 🖼️

**What it does:** Gallery view of all photos and videos from a conversation

**How to use:**
1. Open conversation menu (⋮)
2. Select "Media Vault"
3. Browse all media in grid layout
4. Filter by:
   - All media
   - Photos only
   - Videos only
   - By sender
5. Search by filename or caption
6. Click to view fullscreen
7. Download individual items or multiple

**Features:**
- Statistics (total count, date range)
- Fullscreen slideshow
- Quick download

**API Endpoint:** `GET /api/conversations/:id/vault`

---

### 5. Quick Replies / Templates ⚡

**What it does:** Save frequently used messages as templates

**How to use:**
1. Click the templates icon (💬) in message input
2. Create new template:
   - Choose category
   - Type your message
   - Save
3. Use template: Click to insert into message box
4. Templates auto-track usage frequency

**Categories:**
- Greetings 👋
- Love & Romance ❤️
- Questions ❓
- Goodnight 🌙
- Funny 😂
- Support 🤗
- Making Plans 📅
- Other 💬

**API Endpoints:**
- `GET /api/quick-replies` - List all templates
- `POST /api/quick-replies` - Create new template
- `POST /api/quick-replies/:id/use` - Track usage
- `DELETE /api/quick-replies/:id` - Delete template

---

### 6. Conversation Archive 📦

**What it does:** Hide conversations without deleting them

**How to use:**
1. **Archive:**
   - Swipe left on conversation
   - OR long-press → "Archive"
2. **View archived:**
   - Main menu → "Archived"
3. **Unarchive:**
   - Click unarchive button
   - OR send a new message (auto-unarchives)

**Benefits:**
- Declutter inbox without losing history
- Still receive messages (with notifications)
- Auto-unarchive on new message

**API Endpoints:**
- `GET /api/conversations/archived` - List archived
- `PUT /api/conversations/:id/archive` - Archive conversation
- `DELETE /api/conversations/:id/archive` - Unarchive

---

### 7. Conversation Mute 🔇

**What it does:** Stop notifications for a conversation temporarily or permanently

**How to use:**
1. Open conversation menu
2. Select "Mute Notifications"
3. Choose duration:
   - 1 hour ⏰
   - 8 hours 🌅
   - 1 day 📅
   - 1 week 📆
   - Forever ∞
   - Custom duration ⏱️
4. Unmute: Menu → "Unmute"

**Notes:**
- You still receive messages
- Muted icon appears in conversation list
- Auto-unmute when duration expires

**API Endpoints:**
- `GET /api/conversations/:id/mute` - Check mute status
- `PUT /api/conversations/:id/mute` - Mute conversation
- `DELETE /api/conversations/:id/mute` - Unmute

---

### 8. Enhanced Message Delivery Status ✅

**What it shows:**
- ✓ **Sent** - Message left your device
- ✓✓ **Delivered** - Arrived on partner's device
- ✓✓ **Read** (blue) - Partner opened the message
- ⚠️ **Failed** - Tap to retry

**Group chats:**
- Shows read count (e.g., "Read by 3/5 members")
- Tap to see who read

**Implementation:**
- Uses Socket.IO for real-time updates
- Read receipts tracked in database
- Failed messages auto-retry

---

### 9. Message Drafts (Auto-save) 💾

**What it does:** Automatically saves unfinished messages

**How it works:**
- Type a message
- Navigate away
- Return to conversation
- Your draft is restored!

**Features:**
- Auto-saves every 2 seconds
- Preserves reply context
- Shows draft indicator
- One draft per conversation

**API Endpoints:**
- `GET /api/conversations/:id/draft` - Get draft
- `PUT /api/conversations/:id/draft` - Save draft
- `DELETE /api/conversations/:id/draft` - Clear draft
- `GET /api/drafts` - List all drafts

---

### 10. Scheduled Messages ⏰

**What it does:** Send messages at a future date/time

**How to use:**
1. Type your message
2. Click clock icon
3. Choose date and time
4. Tap "Schedule"
5. View/edit: Menu → "Scheduled Messages"

**Use cases:**
- Birthday wishes at midnight
- Anniversary reminders
- Good morning messages
- Important reminders

**API Endpoints:**
- `GET /api/conversations/:id/scheduled` - List scheduled
- `POST /api/conversations/:id/scheduled` - Schedule message
- `PATCH /api/scheduled/:id` - Edit scheduled message
- `DELETE /api/scheduled/:id` - Cancel scheduled message

---

### 11. Contact Management 👥

**What it does:** Organize contacts with labels, favorites, and notes

**Features:**
- **Favorites:** Mark important contacts
- **Labels:** Organize with custom labels (Family, Close Friends, etc.)
- **Notes:** Private notes about contacts
- **Import/Export:** Backup your contacts

**How to use:**
1. **Add contact:**
   - User Directory → Add to Contacts
2. **Create label:**
   - Contacts → Labels → New Label
3. **Add note:**
   - Contact profile → Add Note
4. **Export contacts:**
   - Contacts → Menu → Export

**API Endpoints:**
- `GET /api/contacts` - List contacts
- `POST /api/contacts` - Add contact
- `PATCH /api/contacts/:id` - Update contact
- `DELETE /api/contacts/:id` - Remove contact
- `GET /api/contacts/labels` - List labels
- `POST /api/contacts/labels` - Create label
- `GET /api/contacts/export` - Export contacts

---

### 12. Shared Calendar 📅

**What it does:** Share events, countdowns, and to-do lists with partner

**Features:**
- **Events:** Birthdays, dates, anniversaries, trips
- **Recurring events:** Daily, weekly, monthly, yearly
- **Reminders:** Get notified before events
- **To-do lists:** Shared tasks with priorities
- **Responses:** Mark as going/maybe/excited

**How to use:**
1. Open conversation menu → "Our Calendar"
2. Create event:
   - Tap "+" button
   - Fill event details
   - Choose category and emoji
   - Set reminder
3. Create to-do list:
   - Switch to "To-dos" tab
   - Create new list
   - Add items
   - Check off completed items

**API Endpoints:** See `server/calendar.js`

---

### 13. Relationship Story 💖

**What it does:** Timeline of memories, milestones, and countdowns

**Features:**
- **Profile:** Set start date, anniversary, first date
- **Days Together:** Live counter
- **Memories:** Add photos, dates, descriptions
- **Milestones:** Track upcoming special dates
- **Countdowns:** Days until anniversary, birthday, etc.

**How to use:**
1. Menu → "Our Story"
2. Set up profile (start date, etc.)
3. Add memories:
   - Tap "Add Memory"
   - Choose date, title, photo
   - Add description
4. Add milestones:
   - Tap "Add Milestone"
   - Set target date
   - Mark as annual if recurring

---

### 14. Time Capsules ⏰

**What it does:** Send love letters that unlock at a future date

**Use cases:**
- Anniversary surprise
- Birthday message
- Future encouragement
- Relationship time machine

**How to use:**
1. Menu → "Time Capsules"
2. Create capsule:
   - Write letter
   - Add voice note or photo (optional)
   - Choose unlock date
   - Select theme and seal
3. Send
4. Partner sees locked capsule until unlock date
5. Auto-opens on unlock date

**Security:** Content is masked until unlock date

---

### 15. Group Management 👥

**Features:**
- **Admin transfer:** Transfer ownership
- **Member permissions:** Control who can send/add members
- **Invite links:** Generate shareable links
- **Join requests:** Approve/deny new members
- **Activity log:** See all group changes
- **Group polls:** (Database ready, coming soon)

**How to use:**
1. Group menu → "Group Settings"
2. Manage members:
   - Promote/demote admins
   - Remove members
   - Update permissions
3. Create invite link:
   - Tap "Invite Link"
   - Set expiration and max uses
   - Share link
4. View activity:
   - Menu → "Group Activity"

---

## 🔧 Developer Guide

### File Structure

```
server/
├── app.js                  # Main Express app with API routes
├── calendar.js             # Calendar and to-do APIs
├── contact-management.js   # Contact management APIs
├── group-management.js     # Group features APIs
├── schema.sql             # Database schema
└── migrations/
    └── 001_add_missing_features.sql

src/
├── App.jsx                # Main React component
├── GlobalSearch.jsx       # Search interface
├── QuickReplies.jsx       # Quick replies panel
├── ConversationMute.jsx   # Mute notifications
├── ConversationArchive.jsx # Archive panel
├── MediaVault.jsx         # Media gallery
├── ChatExport.jsx         # Export/backup
├── ContactManagement.jsx  # Contacts UI
├── GroupManagement.jsx    # Group settings UI
└── conversation-features.css # Styles for new features
```

### Adding a New Feature

1. **Database:**
   - Add table to `server/migrations/XXX_feature_name.sql`
   - Run migration

2. **Backend API:**
   - Add endpoints to `server/app.js` or create new module
   - Use Zod for input validation
   - Add rate limiting
   - Document with JSDoc comments

3. **Frontend:**
   - Create React component in `src/`
   - Add API calls using `api()` helper
   - Update `App.jsx` to integrate
   - Add styles to CSS

4. **Testing:**
   - Test API with Postman or curl
   - Test UI in multiple browsers
   - Test real-time features with Socket.IO
   - Test mobile responsiveness

### Database Best Practices

1. **Always use transactions** for multi-step operations
2. **Use prepared statements** to prevent SQL injection
3. **Add indexes** for frequently queried columns
4. **Use ON CONFLICT** for upserts
5. **Cascade deletes** appropriately
6. **Check constraints** for data integrity

### API Design Principles

1. **RESTful routes:** Use standard HTTP methods
2. **Consistent responses:** Always return JSON
3. **Error handling:** Use HttpError with appropriate status codes
4. **Rate limiting:** Protect against abuse
5. **Authentication:** Verify user on every request
6. **Pagination:** Limit results for large datasets

---

## 🐛 Troubleshooting

### Search not working
- Check GIN index: `SELECT indexname FROM pg_indexes WHERE tablename = 'messages';`
- Rebuild index if needed: `REINDEX INDEX messages_text_search;`

### Real-time features not updating
- Check Socket.IO connection in browser devtools
- Verify Redis is running
- Check server logs for socket errors

### Migration errors
- Ensure PostgreSQL version supports `gen_random_uuid()`
- Check for existing tables: `\dt` in psql
- Use `IF NOT EXISTS` clauses

### Performance issues
- Run `EXPLAIN ANALYZE` on slow queries
- Check for missing indexes
- Monitor database connection pool
- Review Redis cache hit rate

---

## 📊 Feature Status

| Feature | Status | Priority | Backend | Frontend | Tested |
|---------|--------|----------|---------|----------|--------|
| Message Search | ✅ Complete | HIGH | ✅ | ✅ | ✅ |
| Message Forwarding | ✅ Complete | MEDIUM | ✅ | ✅ | ✅ |
| Message Pin/Star | ✅ Complete | MEDIUM | ✅ | ✅ | ✅ |
| Media Vault | ✅ Complete | HIGH | ✅ | ✅ | ✅ |
| Quick Replies | ✅ Complete | MEDIUM | ✅ | ✅ | ⏳ |
| Conversation Archive | ✅ Complete | MEDIUM | ✅ | ✅ | ⏳ |
| Conversation Mute | ✅ Complete | MEDIUM | ✅ | ✅ | ⏳ |
| Message Drafts | ✅ Complete | MEDIUM | ✅ | ✅ | ✅ |
| Scheduled Messages | ✅ Complete | MEDIUM | ✅ | ✅ | ✅ |
| Contact Management | ✅ Complete | HIGH | ✅ | ✅ | ✅ |
| Shared Calendar | ✅ Complete | MEDIUM | ✅ | ✅ | ✅ |
| Relationship Story | ✅ Complete | MEDIUM | ✅ | ✅ | ✅ |
| Time Capsules | ✅ Complete | MEDIUM | ✅ | ✅ | ✅ |
| Group Management | ✅ Complete | HIGH | ✅ | ✅ | ✅ |
| Location Sharing | 🔶 DB Ready | MEDIUM | ⏳ | ⏳ | ❌ |
| Polls | 🔶 DB Ready | MEDIUM | ⏳ | ⏳ | ❌ |
| Status/Stories | 🔶 DB Ready | MEDIUM | ⏳ | ⏳ | ❌ |
| App Lock Biometric | 🔶 Partial | HIGH | ✅ | ⏳ | ⏳ |

**Legend:**
- ✅ Complete
- 🔶 Partial (DB ready or backend only)
- ⏳ In Progress
- ❌ Not Started

---

## 📚 Additional Resources

- **Main Documentation:** `IMPLEMENTATION_STATUS.md`
- **API Documentation:** `docs/API.md`
- **Database Schema:** `server/schema.sql`
- **Migration Guide:** `server/migrations/`

---

## 🤝 Support

For questions, issues, or contributions:
- Review existing documentation
- Check code comments
- Open an issue on the repository
- Contact the development team

---

**Happy Coding! 💚**

*MyKipenzi - Your private sanctuary built for two.*
