# Contact Management Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                           │
├─────────────────────────────────────────────────────────────────┤
│  ContactManagement Component (src/ContactManagement.jsx)         │
│                                                                   │
│  ┌──────────────┐  ┌─────────────────────────────────────┐    │
│  │   Sidebar    │  │        Main Contact List             │    │
│  │              │  │                                       │    │
│  │ • All        │  │  ┌────────────────────────────┐     │    │
│  │ • Favorites  │  │  │   Contact Card             │     │    │
│  │ • Labels     │  │  │  • Avatar                  │     │    │
│  │              │  │  │  • Name/Handle/Nickname    │     │    │
│  │ • Family     │  │  │  • Labels                  │     │    │
│  │ • Work       │  │  │  • Note preview            │     │    │
│  │ • Friends    │  │  │  • Actions (★, 🏷️, 📝)      │     │    │
│  │              │  │  └────────────────────────────┘     │    │
│  │ [Export]     │  │                                       │    │
│  │  JSON        │  │  [Search: _____________]             │    │
│  │  CSV         │  │  [Load More...]                      │    │
│  │  vCard       │  │                                       │    │
│  └──────────────┘  └─────────────────────────────────────┘    │
│                                                                   │
│  Modals:                                                         │
│  • LabelManager - Create/edit/delete labels                     │
│  • ContactNoteModal - Edit contact notes                        │
│  • AddLabelsModal - Assign labels to contact                    │
└─────────────────────────────────────────────────────────────────┘
                              ↓ API Calls
┌─────────────────────────────────────────────────────────────────┐
│                         API LAYER                                │
├─────────────────────────────────────────────────────────────────┤
│  Express Routes (server/app.js)                                  │
│                                                                   │
│  Contact Routes:            Label Routes:                        │
│  • GET    /api/contacts     • GET    /api/contacts/labels       │
│  • POST   /api/contacts     • POST   /api/contacts/labels       │
│  • PATCH  /contacts/:id     • PATCH  /labels/:id                │
│  • DELETE /contacts/:id     • DELETE /labels/:id                │
│                              • PUT    /labels/:id/members/:cid   │
│  Note Routes:                • DELETE /labels/:id/members/:cid   │
│  • GET /contacts/:id/note                                        │
│  • PUT /contacts/:id/note   Export/Import:                       │
│                              • GET  /contacts/export             │
│  Middleware:                 • POST /contacts/import             │
│  • authenticate()                                                │
│  • limit() - Rate limiting                                       │
│  • requireOrigin()                                               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      SERVICE LAYER                               │
├─────────────────────────────────────────────────────────────────┤
│  Contact Management Service (server/contact-management.js)       │
│                                                                   │
│  Core Functions:                                                 │
│  • getContacts(userId, options)                                  │
│  • addContact(userId, contactId, options)                        │
│  • updateContact(userId, contactId, updates)                     │
│  • removeContact(userId, contactId)                              │
│                                                                   │
│  Label Functions:                                                │
│  • getLabels(userId)                                             │
│  • createLabel(userId, data)                                     │
│  • updateLabel(userId, labelId, updates)                         │
│  • deleteLabel(userId, labelId)                                  │
│  • addContactToLabel(userId, labelId, contactId)                 │
│  • removeContactFromLabel(userId, labelId, contactId)            │
│                                                                   │
│  Note Functions:                                                 │
│  • getContactNote(userId, contactId)                             │
│  • setContactNote(userId, contactId, note)                       │
│                                                                   │
│  Export/Import:                                                  │
│  • exportContacts(userId, format)                                │
│  • importContacts(userId, data)                                  │
│                                                                   │
│  Business Logic:                                                 │
│  • Privacy filtering (online status, last seen)                  │
│  • Blocking validation                                           │
│  • Input validation & sanitization                               │
│  • Error handling                                                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      DATABASE LAYER                              │
├─────────────────────────────────────────────────────────────────┤
│  PostgreSQL (server/contacts-schema.sql)                         │
│                                                                   │
│  Tables:                                                         │
│                                                                   │
│  ┌─────────────────────────────────────────────┐               │
│  │  user_contacts                               │               │
│  │  ─────────────────────────────────────────  │               │
│  │  user_id (FK → users)                        │               │
│  │  contact_id (FK → users)                     │               │
│  │  nickname                                    │               │
│  │  is_favorite                                 │               │
│  │  added_at                                    │               │
│  │  last_contacted_at                           │               │
│  │  PRIMARY KEY (user_id, contact_id)           │               │
│  └─────────────────────────────────────────────┘               │
│                                                                   │
│  ┌─────────────────────────────────────────────┐               │
│  │  contact_labels                              │               │
│  │  ─────────────────────────────────────────  │               │
│  │  id (PK)                                     │               │
│  │  user_id (FK → users)                        │               │
│  │  name                                        │               │
│  │  color (#HEX)                                │               │
│  │  icon (emoji)                                │               │
│  │  position (for ordering)                     │               │
│  │  created_at                                  │               │
│  └─────────────────────────────────────────────┘               │
│                                                                   │
│  ┌─────────────────────────────────────────────┐               │
│  │  contact_label_members                       │               │
│  │  ─────────────────────────────────────────  │               │
│  │  label_id (FK → contact_labels)              │               │
│  │  user_id (FK → users)                        │               │
│  │  contact_id (FK → users)                     │               │
│  │  added_at                                    │               │
│  │  PRIMARY KEY (label_id, user_id, contact_id)│               │
│  │  FK (user_id, contact_id) → user_contacts   │               │
│  └─────────────────────────────────────────────┘               │
│                                                                   │
│  ┌─────────────────────────────────────────────┐               │
│  │  contact_notes                               │               │
│  │  ─────────────────────────────────────────  │               │
│  │  user_id (FK → users)                        │               │
│  │  contact_id (FK → users)                     │               │
│  │  note (text, max 5000 chars)                 │               │
│  │  created_at                                  │               │
│  │  updated_at                                  │               │
│  │  PRIMARY KEY (user_id, contact_id)           │               │
│  │  FK (user_id, contact_id) → user_contacts   │               │
│  └─────────────────────────────────────────────┘               │
│                                                                   │
│  ┌─────────────────────────────────────────────┐               │
│  │  contact_exports                             │               │
│  │  ─────────────────────────────────────────  │               │
│  │  id (PK)                                     │               │
│  │  user_id (FK → users)                        │               │
│  │  format (json|csv|vcard)                     │               │
│  │  contact_count                               │               │
│  │  created_at                                  │               │
│  └─────────────────────────────────────────────┘               │
│                                                                   │
│  Triggers:                                                       │
│  • auto_add_contact_trigger                                      │
│    → ON INSERT members (when 2-person conversation)              │
│    → Adds both users to each other's contacts                    │
│                                                                   │
│  • update_last_contacted_trigger                                 │
│    → ON INSERT messages                                          │
│    → Updates last_contacted_at for sender's contact entry        │
│                                                                   │
│  Indexes:                                                        │
│  • user_contacts_by_user (user_id, added_at DESC)                │
│  • user_contacts_favorites (user_id) WHERE is_favorite           │
│  • user_contacts_recent (user_id, last_contacted_at DESC)        │
│  • contact_labels_by_user (user_id, position)                    │
│  • contact_label_members_by_label (label_id)                     │
│  • contact_label_members_by_user (user_id, contact_id)           │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow Examples

### Example 1: User Adds a Contact

```
1. User clicks "Add to Contacts" in directory
   ↓
2. Frontend calls: POST /api/contacts
   Body: { contact_id: "uuid", is_favorite: true }
   ↓
3. Backend validates:
   • User is authenticated
   • Contact exists
   • Not blocked
   • Not self
   ↓
4. Service layer: addContact(userId, contactId, options)
   ↓
5. Database: INSERT INTO user_contacts
   ON CONFLICT DO UPDATE (upsert)
   ↓
6. Response: { user_id, contact_id, is_favorite, added_at }
   ↓
7. Frontend updates contact list
```

### Example 2: User Creates a Label

```
1. User opens Label Manager modal
   ↓
2. User fills form:
   • Name: "Family"
   • Color: #ef4444
   • Icon: 👨‍👩‍👧‍👦
   ↓
3. Frontend calls: POST /api/contacts/labels
   ↓
4. Backend: createLabel(userId, data)
   • Gets max position
   • Validates name length
   • Validates color format
   ↓
5. Database: INSERT INTO contact_labels
   ↓
6. Response: { id, name, color, icon, position }
   ↓
7. Frontend adds label to sidebar
```

### Example 3: User Exports Contacts

```
1. User clicks "Export JSON"
   ↓
2. Frontend calls: GET /api/contacts/export?format=json
   ↓
3. Backend: exportContacts(userId, 'json')
   • Gets all contacts with labels & notes
   • Formats as JSON
   • Logs export in contact_exports table
   ↓
4. Response: JSON file download
   ↓
5. Browser downloads: kipenzi-contacts-2024-01-15.json
```

### Example 4: Auto-Add on Conversation Start

```
1. User A starts conversation with User B
   ↓
2. Backend creates conversation
   ↓
3. Backend inserts members:
   • (conversation_id, user_a_id)
   • (conversation_id, user_b_id)
   ↓
4. Trigger: auto_add_contact_trigger fires
   ↓
5. Checks: Is this a 2-person conversation?
   Yes → Continue
   ↓
6. Database executes:
   INSERT INTO user_contacts (user_a_id, user_b_id)
   INSERT INTO user_contacts (user_b_id, user_a_id)
   ON CONFLICT DO UPDATE last_contacted_at
   ↓
7. Both users now have each other as contacts
```

## Component Hierarchy

```
ContactManagement
├── useState hooks
│   ├── contacts
│   ├── labels
│   ├── searchQuery
│   ├── selectedLabel
│   ├── favoriteOnly
│   ├── showLabelManager
│   ├── noteModalContact
│   └── labelsModalContact
├── useEffect
│   ├── loadLabels() on mount
│   └── loadContacts() on filter change
├── Sidebar
│   ├── Filter buttons
│   │   ├── All Contacts
│   │   ├── Favorites
│   │   └── Label list
│   ├── Label Manager button
│   └── Export buttons
│       ├── JSON
│       ├── CSV
│       └── vCard
├── Main List
│   ├── Search input
│   ├── Contact cards
│   │   ├── Avatar
│   │   ├── Info
│   │   │   ├── Name/Nickname
│   │   │   ├── Handle
│   │   │   ├── Online status
│   │   │   ├── Note preview
│   │   │   └── Labels
│   │   └── Actions
│   │       ├── Favorite toggle
│   │       ├── Manage labels
│   │       ├── Edit note
│   │       └── Open chat
│   └── Load More button
└── Modals
    ├── LabelManager
    │   ├── Label list
    │   ├── Edit form
    │   └── Create form
    ├── ContactNoteModal
    │   ├── Textarea
    │   └── Save/Cancel
    └── AddLabelsModal
        └── Label checkboxes
```

## Security Layers

```
┌────────────────────────────────────────┐
│          Request Flow                  │
└────────────────────────────────────────┘
         ↓
┌────────────────────────────────────────┐
│  1. Origin Check (requireOrigin)        │
│     ✓ Verify request origin matches     │
└────────────────────────────────────────┘
         ↓
┌────────────────────────────────────────┐
│  2. Authentication (authenticate)       │
│     ✓ Valid session token               │
│     ✓ CSRF token for mutations          │
└────────────────────────────────────────┘
         ↓
┌────────────────────────────────────────┐
│  3. Rate Limiting (limit)               │
│     ✓ 30-60 req/min for operations      │
│     ✓ 5 exports/hour                    │
│     ✓ 3 imports/hour                    │
└────────────────────────────────────────┘
         ↓
┌────────────────────────────────────────┐
│  4. Input Validation (zod)              │
│     ✓ Schema validation                 │
│     ✓ Type checking                     │
│     ✓ Length limits                     │
└────────────────────────────────────────┘
         ↓
┌────────────────────────────────────────┐
│  5. Business Logic Validation           │
│     ✓ Contact exists                    │
│     ✓ Not blocked                       │
│     ✓ Ownership checks                  │
└────────────────────────────────────────┘
         ↓
┌────────────────────────────────────────┐
│  6. Database Constraints                │
│     ✓ Foreign keys                      │
│     ✓ CHECK constraints                 │
│     ✓ UNIQUE constraints                │
└────────────────────────────────────────┘
         ↓
┌────────────────────────────────────────┐
│  7. Privacy Filtering                   │
│     ✓ Online status visibility          │
│     ✓ Last seen visibility              │
│     ✓ Blocked user filtering            │
└────────────────────────────────────────┘
```

## Performance Optimization

### Database Level
```
┌────────────────────────────────────────┐
│  Query Optimization                    │
├────────────────────────────────────────┤
│  • Pagination (LIMIT + OFFSET)         │
│  • Indexes on frequently queried cols  │
│  • Efficient JOINs (only when needed)  │
│  • Aggregation for counts              │
│  • WHERE clauses before JOINs          │
└────────────────────────────────────────┘
```

### Application Level
```
┌────────────────────────────────────────┐
│  Caching & Minimization                │
├────────────────────────────────────────┤
│  • Labels loaded once, cached in state │
│  • Contacts paginated (50 at a time)   │
│  • Debounced search (250ms delay)      │
│  • Modal-based editing (no full reload)│
└────────────────────────────────────────┘
```

### Network Level
```
┌────────────────────────────────────────┐
│  Request Optimization                  │
├────────────────────────────────────────┤
│  • Only fetch visible data             │
│  • Incremental loading (Load More)     │
│  • Optimistic UI updates               │
│  • Error boundaries                    │
└────────────────────────────────────────┘
```

## File Dependencies

```
src/ContactManagement.jsx
├── imports
│   ├── react (useState, useEffect)
│   ├── lucide-react (icons)
│   ├── ./api.js (api function)
│   └── ./components.jsx (Avatar)
└── exports
    └── ContactManagement component

server/contact-management.js
├── imports
│   ├── node:crypto (randomUUID)
│   ├── ./db.js (db, one, transaction)
│   └── ./security.js (HttpError)
└── exports
    ├── getContacts
    ├── addContact
    ├── removeContact
    ├── updateContact
    ├── getLabels
    ├── createLabel
    ├── updateLabel
    ├── deleteLabel
    ├── addContactToLabel
    ├── removeContactFromLabel
    ├── getContactNote
    ├── setContactNote
    ├── exportContacts
    └── importContacts

server/app.js
├── imports
│   ├── express
│   ├── ./contact-management.js (all exports)
│   ├── ./auth.js (authenticate, etc.)
│   └── shared/contracts.js (id validator)
└── defines
    └── 15 API route handlers

server/contacts-schema.sql
└── creates
    ├── 5 tables
    ├── 2 triggers
    ├── 2 functions
    └── 6 indexes
```

## Deployment Architecture

```
┌────────────────────────────────────────────────────────┐
│                    PRODUCTION                          │
├────────────────────────────────────────────────────────┤
│                                                        │
│  ┌─────────────────┐         ┌──────────────────┐   │
│  │   Web Browser   │   HTTPS │   Load Balancer  │   │
│  │  (User Device)  │ ──────→ │   (Nginx/Caddy)  │   │
│  └─────────────────┘         └──────────────────┘   │
│                                        │              │
│                                        ↓              │
│                          ┌──────────────────────┐   │
│                          │   Node.js Server     │   │
│                          │  (Express + Socket)  │   │
│                          │  - contact-mgmt.js   │   │
│                          │  - app.js routes     │   │
│                          └──────────────────────┘   │
│                                        │              │
│                                        ↓              │
│                          ┌──────────────────────┐   │
│                          │   PostgreSQL DB      │   │
│                          │  - user_contacts     │   │
│                          │  - contact_labels    │   │
│                          │  - contact_notes     │   │
│                          │  + triggers          │   │
│                          └──────────────────────┘   │
│                                                        │
└────────────────────────────────────────────────────────┘
```

## Summary

This architecture provides:
- ✅ **Scalability**: Pagination, indexes, efficient queries
- ✅ **Security**: Multi-layer validation and authentication
- ✅ **Privacy**: User data isolation, visibility controls
- ✅ **Performance**: Optimized queries, caching, lazy loading
- ✅ **Maintainability**: Clean separation of concerns
- ✅ **Extensibility**: Easy to add features
- ✅ **Reliability**: Error handling at every layer

The system is production-ready and follows best practices for modern web applications.
