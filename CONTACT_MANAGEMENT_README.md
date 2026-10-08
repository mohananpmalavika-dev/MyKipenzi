# Contact Management Feature 👥

A comprehensive contact organization system for Kipenzi, enabling users to manage their connections with favorites, labels, notes, and sync capabilities.

## 🎯 What's Included

### ✅ Completed Components

1. **Database Schema** (`server/contacts-schema.sql`)
   - User contacts with favorites
   - Custom labels/groups with colors and icons
   - Private notes (up to 5000 chars)
   - Contact export logging
   - Auto-add triggers on conversation start
   - Last contacted tracking

2. **Backend Service** (`server/contact-management.js`)
   - Full CRUD for contacts
   - Label management
   - Note operations
   - Export (JSON, CSV, vCard)
   - Import from JSON
   - Privacy-aware queries

3. **API Endpoints** (integrated in `server/app.js`)
   - `GET /api/contacts` - List with filtering
   - `POST /api/contacts` - Add contact
   - `PATCH /api/contacts/:id` - Update contact
   - `DELETE /api/contacts/:id` - Remove contact
   - `GET /api/contacts/labels` - List labels
   - `POST /api/contacts/labels` - Create label
   - `PATCH /api/contacts/labels/:id` - Update label
   - `DELETE /api/contacts/labels/:id` - Delete label
   - `PUT /api/contacts/labels/:id/members/:contactId` - Add to label
   - `DELETE /api/contacts/labels/:id/members/:contactId` - Remove from label
   - `GET /api/contacts/:id/note` - Get note
   - `PUT /api/contacts/:id/note` - Set note
   - `GET /api/contacts/export` - Export contacts
   - `POST /api/contacts/import` - Import contacts

4. **Frontend Component** (`src/ContactManagement.jsx`)
   - Two-panel layout (labels sidebar + contact list)
   - Search and filtering
   - Favorite toggle
   - Label management modal
   - Note editing modal
   - Label assignment modal
   - Export buttons
   - Responsive design

5. **Documentation**
   - `docs/CONTACT_MANAGEMENT.md` - Full feature documentation
   - `CONTACT_MANAGEMENT_INTEGRATION.md` - Integration guide
   - This README

## 🚀 Quick Setup

### 1. Apply Database Schema

```bash
psql $DATABASE_URL -f server/contacts-schema.sql
```

This creates:
- `user_contacts` table
- `contact_labels` table
- `contact_label_members` table
- `contact_notes` table
- `contact_exports` table
- Triggers for auto-add and last_contacted updates

### 2. Verify Server Integration

The backend is already integrated in `server/app.js`. Check that:
```javascript
import { getContacts, addContact, ... } from './contact-management.js';
```

### 3. Integrate Frontend

Choose your preferred integration method:

**Option A: As a Tab (Recommended)**
```jsx
// In App.jsx
{tab === 'contacts' && (
  <ContactManagement 
    onSelectContact={(handle) => openConversation(handle)}
  />
)}
```

**Option B: As a Modal**
```jsx
{showContactManagement && (
  <Modal onClose={() => setShowContactManagement(false)}>
    <ContactManagement 
      onSelectContact={(handle) => openConversation(handle)}
    />
  </Modal>
)}
```

See `CONTACT_MANAGEMENT_INTEGRATION.md` for complete examples.

### 4. Test

```bash
# Start the server
npm run dev

# Test API endpoint
curl http://localhost:3000/api/contacts \
  -H "Cookie: kipenzi_session=..." \
  -H "x-csrf-token: ..."
```

## 📋 Core Features

### Favorites ⭐
- Mark important contacts for priority placement
- Auto-add when conversations start
- One-click toggle in UI

### Labels/Groups 🏷️
- Unlimited custom labels
- Custom colors (#HEX format)
- Emoji icons
- Many-to-many: contacts can have multiple labels
- Drag-to-reorder (via position field)

### Notes 📝
- Up to 5,000 characters per contact
- Completely private (only visible to note author)
- Searchable
- Use cases: birthdays, preferences, conversation context

### Nicknames 👤
- Custom display names
- Override default names
- Searchable
- Private to user

### Export/Import 💾
- **Export formats**: JSON (full data), CSV (tabular), vCard (.vcf)
- **Import**: JSON only (validates handles)
- Includes all metadata (labels, notes, nicknames)
- Rate limited: 5 exports/hour, 3 imports/hour

## 🔒 Security & Privacy

### Access Control
- Users can only manage their own contacts
- All queries filtered by `user_id`
- Notes and nicknames are private
- Labels are private

### Rate Limiting
| Operation | Limit |
|-----------|-------|
| Contact CRUD | 30-60 req/min |
| Label management | 20-60 req/min |
| Export | 5 per hour |
| Import | 3 per hour |

### Data Validation
| Field | Constraint |
|-------|------------|
| Nickname | max 80 chars |
| Note | max 5,000 chars |
| Label name | 1-40 chars |
| Label color | valid #HEX |
| Import batch | max 1,000 contacts |

### Privacy Considerations
- Respects user `online_status_visibility` settings
- Respects user `last_seen_visibility` settings
- Blocked users cannot be added as contacts
- Contacts of blocked users are hidden

## 📊 Database Triggers

### Auto-Add Contact
When a direct conversation is created:
```sql
INSERT INTO user_contacts(user_id, contact_id, last_contacted_at)
-- Auto-adds both parties as contacts
```

### Update Last Contacted
When a message is sent:
```sql
UPDATE user_contacts SET last_contacted_at = now()
WHERE user_id = sender_id AND contact_id IN (conversation_members)
```

## 🎨 UI Components

### Main Component: `ContactManagement`
- **Props**: `onSelectContact(handle)` callback
- **Features**: Search, filter, label sidebar, contact cards
- **Modals**: Label manager, note editor, label assignment

### Subcomponents:
- `LabelManager` - Create, edit, delete labels
- `ContactNoteModal` - Edit contact notes
- `AddLabelsModal` - Assign labels to contact
- `LabelBadge` - Visual label indicator

## 🧪 Testing Checklist

- [ ] Apply database schema
- [ ] Restart server
- [ ] Create a label
- [ ] Add a contact from directory
- [ ] Mark contact as favorite
- [ ] Add contact to label
- [ ] Add a note to contact
- [ ] Set a nickname
- [ ] Search contacts
- [ ] Filter by label
- [ ] Filter favorites only
- [ ] Export as JSON
- [ ] Export as CSV
- [ ] Export as vCard
- [ ] Import JSON backup
- [ ] Verify rate limits
- [ ] Test with blocked users
- [ ] Verify privacy (online/last seen)

## 📖 Full Documentation

- **Feature Docs**: `docs/CONTACT_MANAGEMENT.md`
- **Integration Guide**: `CONTACT_MANAGEMENT_INTEGRATION.md`
- **API Reference**: See docs/CONTACT_MANAGEMENT.md → API Endpoints section

## 🛠️ Files Modified/Created

### Created:
- `server/contacts-schema.sql` - Database schema
- `server/contact-management.js` - Backend service
- `src/ContactManagement.jsx` - Frontend component
- `docs/CONTACT_MANAGEMENT.md` - Documentation
- `CONTACT_MANAGEMENT_INTEGRATION.md` - Integration guide
- `CONTACT_MANAGEMENT_README.md` - This file

### Modified:
- `server/app.js` - Added API endpoints and imports

## 🚧 Known Limitations

1. **Import Format**: Only JSON supported (CSV/vCard are export-only)
2. **Bulk Operations**: No multi-select for batch actions
3. **Sync**: No real-time sync across devices (manual export/import)
4. **Contact Requests**: No approval workflow before adding

## 🔮 Future Enhancements

Potential additions:
- Real-time sync via WebSocket
- Contact sharing via chat
- Import from external platforms (Google, etc.)
- Anniversary/birthday tracking
- Mutual contacts display
- Smart label suggestions
- Bulk contact operations
- Contact request/approval workflow

## 🎯 Integration Status

| Component | Status |
|-----------|--------|
| Database Schema | ✅ Complete |
| Backend Service | ✅ Complete |
| API Endpoints | ✅ Complete |
| Frontend Component | ✅ Complete |
| Documentation | ✅ Complete |
| Integration | ⏳ Pending (your choice) |
| Testing | ⏳ Pending |

## 💡 Usage Example

```javascript
// 1. User opens contact management
<ContactManagement onSelectContact={openChat} />

// 2. Creates a label
POST /api/contacts/labels
{ "name": "Family", "color": "#ef4444", "icon": "👨‍👩‍👧‍👦" }

// 3. Adds a contact from directory
POST /api/contacts
{ "contact_id": "uuid", "is_favorite": true }

// 4. Adds contact to label
PUT /api/contacts/labels/:labelId/members/:contactId

// 5. Adds a note
PUT /api/contacts/:contactId/note
{ "note": "Birthday: March 15. Loves coffee!" }

// 6. Exports for backup
GET /api/contacts/export?format=json
// Returns JSON file with all contacts, labels, and notes
```

## 🤝 Contributing

To extend this feature:
1. Check `docs/CONTACT_MANAGEMENT.md` for architecture
2. Add new endpoints in `server/contact-management.js`
3. Add API routes in `server/app.js`
4. Update `ContactManagement.jsx` for UI changes
5. Update documentation

## 📞 Support

Issues or questions:
1. Check docs/CONTACT_MANAGEMENT.md
2. Review CONTACT_MANAGEMENT_INTEGRATION.md
3. Check server logs for errors
4. Verify database schema applied correctly
5. Test API endpoints independently

---

**Ready to integrate!** Follow `CONTACT_MANAGEMENT_INTEGRATION.md` for step-by-step instructions.

Built with ❤️ for Kipenzi
