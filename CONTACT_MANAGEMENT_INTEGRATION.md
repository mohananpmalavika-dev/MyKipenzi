# Contact Management Integration Guide

## Quick Start

The Contact Management feature has been implemented with the following components:

### 1. Database Schema
**File:** `server/contacts-schema.sql`
- Run this migration to create necessary tables
- Includes auto-triggers for contact management

**To apply:**
```bash
psql $DATABASE_URL -f server/contacts-schema.sql
```

### 2. Backend Service
**File:** `server/contact-management.js`
- All contact CRUD operations
- Label/group management
- Notes functionality
- Export/import features

### 3. API Endpoints
**File:** `server/app.js` (already integrated)
- Contact management endpoints added after `/api/users`
- All endpoints protected with authentication and rate limiting

### 4. Frontend Component
**File:** `src/ContactManagement.jsx`
- Full-featured UI with sidebar and main list
- Search, filtering, and organization
- Modals for labels, notes, and management

### 5. Documentation
**File:** `docs/CONTACT_MANAGEMENT.md`
- Complete feature documentation
- API reference
- Security considerations

## Integration into App.jsx

The ContactManagement component is already imported in App.jsx:
```javascript
import { ContactManagement } from './ContactManagement.jsx';
```

### Option 1: Add as a New Tab

Add a "Contacts" tab alongside "Chats" in the sidebar navigation:

```jsx
// In the Chat component's navigation section
<nav className="sidebar-tabs">
  <button 
    className={tab === 'chats' ? 'active' : ''} 
    onClick={() => setTab('chats')}
  >
    <MessageCircle size={20} />
    Chats
  </button>
  <button 
    className={tab === 'contacts' ? 'active' : ''} 
    onClick={() => setTab('contacts')}
  >
    <UserPlus size={20} />
    Contacts
  </button>
  <button 
    className={tab === 'directory' ? 'active' : ''} 
    onClick={() => setTab('directory')}
  >
    <Search size={20} />
    Directory
  </button>
</nav>

// In the main content area
{tab === 'chats' && (
  // Existing chat list
)}

{tab === 'contacts' && (
  <ContactManagement 
    onSelectContact={(handle) => {
      // Open conversation with contact
      setContactBusy(true);
      api('/conversations', {
        method: 'POST',
        body: { handle }
      })
        .then(conv => {
          setSelected(conv.id);
          setTab('chats');
        })
        .catch(err => setContactError(err.message))
        .finally(() => setContactBusy(false));
    }}
  />
)}

{tab === 'directory' && (
  <UserDirectory 
    onSelect={openConversation}
    connecting={contactBusy}
    contactError={contactError}
  />
)}
```

### Option 2: Add as a Modal

Open contacts in a modal overlay:

```jsx
// Add state
const [showContactManagement, setShowContactManagement] = useState(false);

// Add button in settings or sidebar
<button onClick={() => setShowContactManagement(true)}>
  <UserPlus size={18} />
  Manage Contacts
</button>

// Render modal
{showContactManagement && (
  <Modal onClose={() => setShowContactManagement(false)}>
    <ContactManagement 
      onSelectContact={(handle) => {
        setShowContactManagement(false);
        // Open conversation
      }}
    />
  </Modal>
)}
```

### Option 3: Integrate into Chat Header

Add a "Contact Info" button in the conversation header:

```jsx
// In conversation header
{selected && !isGroup && (
  <button 
    onClick={() => setShowContactInfo(true)}
    className="icon-btn"
    aria-label="Contact info"
  >
    <Info size={20} />
  </button>
)}

// Render contact quick actions
{showContactInfo && (
  <ContactQuickActions 
    contact={peerContact}
    onClose={() => setShowContactInfo(false)}
  />
)}
```

## Quick Actions Component

For inline contact actions in chat headers:

```jsx
function ContactQuickActions({ contact, onClose }) {
  const [isFavorite, setIsFavorite] = useState(contact.is_favorite);
  
  async function toggleFavorite() {
    try {
      await api(`/contacts/${contact.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_favorite: !isFavorite })
      });
      setIsFavorite(!isFavorite);
    } catch (err) {
      console.error(err);
    }
  }
  
  return (
    <div className="contact-quick-actions">
      <button onClick={toggleFavorite}>
        {isFavorite ? <StarOff size={18} /> : <Star size={18} />}
        {isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
      </button>
      <button onClick={() => {/* open labels modal */}}>
        <Tag size={18} />
        Add Labels
      </button>
      <button onClick={() => {/* open note modal */}}>
        <StickyNote size={18} />
        Add Note
      </button>
    </div>
  );
}
```

## Styling

The ContactManagement component uses existing Kipenzi styles. For custom styling, add to `src/styles.css`:

```css
.contact-management {
  display: flex;
  height: 100%;
}

.contact-label-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  margin: 2px;
}

.contact-quick-actions {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
```

## Testing the Integration

1. **Apply database schema:**
   ```bash
   psql $DATABASE_URL -f server/contacts-schema.sql
   ```

2. **Restart server:**
   ```bash
   npm run dev
   ```

3. **Test endpoints:**
   ```bash
   # Get contacts
   curl http://localhost:3000/api/contacts \
     -H "Cookie: kipenzi_session=..." \
     -H "x-csrf-token: ..."
   
   # Create label
   curl http://localhost:3000/api/contacts/labels \
     -X POST \
     -H "Content-Type: application/json" \
     -H "Cookie: kipenzi_session=..." \
     -H "x-csrf-token: ..." \
     -d '{"name":"Family","color":"#ef4444","icon":"👨‍👩‍👧‍👦"}'
   ```

4. **Test UI:**
   - Open the app
   - Navigate to contacts tab/modal
   - Create labels
   - Add contacts from directory
   - Add notes and nicknames
   - Export contacts
   - Test search and filtering

## Features Available

✅ **Favorites** - Mark important contacts
✅ **Labels/Groups** - Organize with custom categories  
✅ **Notes** - Private annotations for each contact
✅ **Nicknames** - Custom display names
✅ **Search** - Find by name, handle, or nickname
✅ **Export** - JSON, CSV, vCard formats
✅ **Import** - Restore from JSON backup
✅ **Auto-add** - Contacts added on conversation start
✅ **Last Contacted** - Track interaction history
✅ **Privacy** - Respects online/last seen settings

## Next Steps

1. Choose integration approach (tab, modal, or inline)
2. Apply database schema migration
3. Test API endpoints
4. Integrate component into App.jsx
5. Add styling customizations if needed
6. Test user workflows
7. Deploy to production

## Troubleshooting

**Database errors:**
- Ensure PostgreSQL functions are enabled
- Check for naming conflicts with existing tables
- Verify user permissions

**API 404 errors:**
- Confirm server/app.js includes contact management imports
- Check route order (contact routes must come before catch-all)
- Verify authentication middleware is applied

**UI not loading:**
- Check browser console for import errors
- Verify ContactManagement.jsx is in src/ folder
- Ensure all dependencies (lucide-react, etc.) are installed

**Rate limit errors:**
- Adjust rate limits in server/app.js if needed for testing
- Default limits: 30-60 req/min for most operations

## Support

For questions or issues:
1. Check docs/CONTACT_MANAGEMENT.md for detailed documentation
2. Review console logs for error messages
3. Verify database schema was applied correctly
4. Test API endpoints independently before testing UI

---

**Status:** ✅ Backend Complete | ✅ Frontend Complete | ⏳ Integration Pending

Last updated: 2024
