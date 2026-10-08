# Contact Management Feature 📇

Comprehensive contact management system allowing users to organize, annotate, and sync their connections.

## Overview

The Contact Management feature provides users with tools to organize their contacts beyond basic messaging:
- **Favorites**: Mark important contacts for quick access
- **Labels/Groups**: Organize contacts with custom categories
- **Notes**: Add private notes about each contact
- **Nicknames**: Set custom display names for contacts
- **Export/Import**: Sync contacts across devices or backup data

## Features

### 1. Favorites System

Mark contacts as favorites for priority placement:
- Contacts with active conversations are automatically added
- Toggle favorite status with a single click
- Favorites appear at the top of contact lists
- Separate view to show only favorites

### 2. Contact Labels/Groups

Organize contacts with custom labels:
- **Create unlimited labels** with custom names, colors, and icons
- **Add contacts to multiple labels** (many-to-many relationship)
- **Custom ordering** of labels via drag-and-drop positioning
- **Label filtering** to view contacts by category
- Examples: Family, Work, College Friends, Tennis Group, etc.

### 3. Contact Notes

Add private notes about contacts:
- **Up to 5,000 characters** per note
- **Completely private** - only visible to the note author
- Useful for: birthdays, preferences, conversation topics, relationship context
- Searchable within contact search

### 4. Custom Nicknames

Set personalized display names:
- **Override default names** for personal organization
- **Search by nickname** to find contacts quickly
- Nickname is private and only visible to you
- Original name still visible in contact details

### 5. Export/Import

Backup and sync contacts:
- **Export formats**: JSON, CSV, vCard (.vcf)
- **Import JSON** to restore contacts on new devices
- **Includes all metadata**: labels, notes, nicknames, favorites
- Rate-limited to prevent abuse (5 exports/hour, 3 imports/hour)

## Database Schema

### user_contacts
```sql
CREATE TABLE user_contacts (
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES users(id) ON DELETE CASCADE,
  nickname text,
  is_favorite boolean DEFAULT true,
  added_at timestamptz DEFAULT now(),
  last_contacted_at timestamptz,
  PRIMARY KEY(user_id, contact_id)
);
```

### contact_labels
```sql
CREATE TABLE contact_labels (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text, -- Hex color code
  icon text, -- Emoji or icon name
  position integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, name)
);
```

### contact_label_members
```sql
CREATE TABLE contact_label_members (
  label_id uuid REFERENCES contact_labels(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES users(id) ON DELETE CASCADE,
  added_at timestamptz DEFAULT now(),
  PRIMARY KEY(label_id, user_id, contact_id),
  FOREIGN KEY(user_id, contact_id) REFERENCES user_contacts ON DELETE CASCADE
);
```

### contact_notes
```sql
CREATE TABLE contact_notes (
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES users(id) ON DELETE CASCADE,
  note text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY(user_id, contact_id)
);
```

### contact_exports
```sql
CREATE TABLE contact_exports (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  format text CHECK(format IN ('json','csv','vcard')),
  contact_count integer NOT NULL,
  created_at timestamptz DEFAULT now()
);
```

## API Endpoints

### Contact Management

#### GET /api/contacts
Get user's contacts with optional filtering.

**Query Parameters:**
- `favorite_only`: boolean - Show only favorites
- `label_id`: uuid - Filter by label
- `search`: string - Search by name, handle, or nickname
- `offset`: integer - Pagination offset
- `limit`: integer - Results per page (max 100)

**Response:**
```json
{
  "contacts": [
    {
      "id": "uuid",
      "name": "Alice Smith",
      "handle": "alice",
      "nickname": "Ali",
      "avatar_id": "uuid",
      "is_favorite": true,
      "added_at": "2024-01-15T10:30:00Z",
      "last_contacted_at": "2024-01-20T14:22:00Z",
      "online": true,
      "last_seen": "2024-01-20T14:20:00Z",
      "note": "Met at conference, loves hiking",
      "labels": [
        { "id": "uuid", "name": "Work", "color": "#3b82f6", "icon": "💼" }
      ],
      "has_conversation": true
    }
  ],
  "has_more": false
}
```

#### POST /api/contacts
Add a new contact.

**Request Body:**
```json
{
  "contact_id": "uuid",
  "nickname": "Ali",
  "is_favorite": true
}
```

**Rate Limit:** 30 requests per minute

#### PATCH /api/contacts/:contactId
Update contact details.

**Request Body:**
```json
{
  "nickname": "Alison",
  "is_favorite": false
}
```

**Rate Limit:** 60 requests per minute

#### DELETE /api/contacts/:contactId
Remove a contact.

**Response:**
```json
{ "removed": true }
```

### Label Management

#### GET /api/contacts/labels
Get all labels with member counts.

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Work",
    "color": "#3b82f6",
    "icon": "💼",
    "position": 0,
    "member_count": 12,
    "created_at": "2024-01-10T09:00:00Z"
  }
]
```

#### POST /api/contacts/labels
Create a new label.

**Request Body:**
```json
{
  "name": "Family",
  "color": "#ef4444",
  "icon": "👨‍👩‍👧‍👦"
}
```

**Rate Limit:** 20 requests per minute

#### PATCH /api/contacts/labels/:labelId
Update label properties.

**Request Body:**
```json
{
  "name": "Close Friends",
  "color": "#10b981",
  "icon": "🤝",
  "position": 1
}
```

**Rate Limit:** 40 requests per minute

#### DELETE /api/contacts/labels/:labelId
Delete a label (contacts are not deleted).

#### PUT /api/contacts/labels/:labelId/members/:contactId
Add contact to label.

**Rate Limit:** 60 requests per minute

#### DELETE /api/contacts/labels/:labelId/members/:contactId
Remove contact from label.

### Notes Management

#### GET /api/contacts/:contactId/note
Get note for a contact.

**Response:**
```json
{
  "note": "Birthday: March 15. Allergic to peanuts.",
  "created_at": "2024-01-10T10:00:00Z",
  "updated_at": "2024-01-15T14:30:00Z"
}
```

#### PUT /api/contacts/:contactId/note
Set or update contact note.

**Request Body:**
```json
{
  "note": "Birthday: March 15. Loves mystery novels."
}
```

**Rate Limit:** 60 requests per minute

### Export/Import

#### GET /api/contacts/export
Export contacts in specified format.

**Query Parameters:**
- `format`: enum - `json`, `csv`, or `vcard`

**Response:** File download with appropriate MIME type

**Rate Limit:** 5 requests per hour

#### POST /api/contacts/import
Import contacts from JSON.

**Request Body:**
```json
{
  "contacts": [
    {
      "handle": "alice",
      "nickname": "Ali",
      "is_favorite": true,
      "note": "Met at conference"
    }
  ]
}
```

**Response:**
```json
{
  "imported": 42,
  "skipped": 3,
  "errors": ["User @bob not found", "..."]
}
```

**Rate Limit:** 3 requests per hour

## Automatic Contact Management

### Auto-Add on Conversation

When users start a direct conversation:
1. Both parties are automatically added to each other's contacts
2. `is_favorite` defaults to `true`
3. `added_at` and `last_contacted_at` are set to current time

Implemented via database trigger:
```sql
CREATE OR REPLACE FUNCTION auto_add_contact() RETURNS trigger AS $$
BEGIN
  IF (SELECT count(*) FROM members WHERE conversation_id = NEW.conversation_id) = 2 THEN
    INSERT INTO user_contacts(user_id, contact_id, last_contacted_at, added_at)
    SELECT m1.user_id, m2.user_id, now(), now()
    FROM members m1, members m2
    WHERE m1.conversation_id = NEW.conversation_id
      AND m2.conversation_id = NEW.conversation_id
      AND m1.user_id <> m2.user_id
    ON CONFLICT (user_id, contact_id) 
    DO UPDATE SET last_contacted_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Auto-Update Last Contacted

When a message is sent:
1. `last_contacted_at` is updated for the sender's contact entry
2. Helps surface recently active contacts

Implemented via database trigger on `messages` table.

## Frontend Component

The `ContactManagement` component provides a full-featured UI:

### Key Features:
- **Two-panel layout**: Labels sidebar + contact list
- **Label filtering**: Click labels to filter contacts
- **Search**: Real-time search across name, handle, nickname
- **Inline actions**: Favorite toggle, label management, note editing
- **Modals**: Label manager, note editor, label assignment
- **Export buttons**: One-click export in all formats
- **Responsive design**: Works on mobile and desktop

### Usage:
```jsx
import { ContactManagement } from './ContactManagement.jsx';

function App() {
  return (
    <ContactManagement 
      onSelectContact={(handle) => openConversation(handle)}
    />
  );
}
```

## Security & Privacy

### Access Control
- Users can only manage their own contacts
- Notes are completely private (not visible to contacts)
- Nicknames are private
- Labels are private

### Rate Limiting
- Contact operations: 30-60 requests/minute
- Label operations: 20-60 requests/minute
- Export: 5 per hour
- Import: 3 per hour (includes heavy processing)

### Data Validation
- Nicknames: max 80 characters
- Notes: max 5,000 characters
- Label names: 1-40 characters
- Label colors: valid hex format (#RRGGBB)
- Import: max 1,000 contacts per batch

### Privacy Considerations
- Contact online status respects user privacy settings
- Last seen information respects visibility preferences
- Blocking prevents contact addition/interaction
- Contacts of blocked users are automatically hidden

## Performance Optimization

### Database Indexes
```sql
CREATE INDEX user_contacts_by_user ON user_contacts(user_id, added_at DESC);
CREATE INDEX user_contacts_favorites ON user_contacts(user_id) WHERE is_favorite = true;
CREATE INDEX user_contacts_recent ON user_contacts(user_id, last_contacted_at DESC NULLS LAST);
CREATE INDEX contact_labels_by_user ON contact_labels(user_id, position);
CREATE INDEX contact_label_members_by_label ON contact_label_members(label_id);
CREATE INDEX contact_label_members_by_user ON contact_label_members(user_id, contact_id);
```

### Query Optimization
- Pagination prevents loading all contacts at once
- Label member counts use efficient aggregation
- Privacy filtering applied in single query
- Minimal JOIN operations for performance

## Integration with Existing Features

### User Directory
- Directory shows "Add to Contacts" for non-contacts
- Contact status indicated in search results
- Block/report functionality preserved

### Conversations
- Contact management accessible from chat header
- Quick actions to favorite, add labels, or add notes
- Conversation list shows contact info

### Notifications
- Optional: Notify when contacts come online
- Optional: Notify on contact birthdays (if noted)

## Future Enhancements

Potential additions:
1. **Contact Sync**: Real-time sync across devices via WebSocket
2. **Smart Suggestions**: Suggest labels based on usage patterns
3. **Bulk Operations**: Multi-select contacts for batch actions
4. **Contact Sharing**: Share contact info (vCard) via chat
5. **Import from Platforms**: Import from Google Contacts, etc.
6. **Anniversaries**: Track and notify important dates
7. **Contact Requests**: Request to add someone before conversation
8. **Mutual Contacts**: Show shared connections

## Testing

### Manual Testing Checklist
- [ ] Add contact from directory
- [ ] Auto-add on conversation start
- [ ] Toggle favorite status
- [ ] Create label with custom color/icon
- [ ] Add contact to multiple labels
- [ ] Remove contact from label
- [ ] Edit label properties
- [ ] Delete label (contacts remain)
- [ ] Add/edit contact note
- [ ] Search contacts by name, handle, nickname
- [ ] Filter by label
- [ ] Filter favorites only
- [ ] Export JSON
- [ ] Export CSV
- [ ] Export vCard
- [ ] Import JSON contacts
- [ ] Verify rate limits
- [ ] Test with blocked users
- [ ] Verify privacy settings (online, last seen)

### Edge Cases
- Contact with no labels
- Contact with empty note
- Label with no members
- Search with no results
- Import with invalid handles
- Duplicate contact addition (should update)
- Delete label in use
- Block user who is a contact

## Deployment

### Database Migration

Run the schema file to create tables:
```bash
psql $DATABASE_URL -f server/contacts-schema.sql
```

### Verification
1. Check tables created:
```sql
\dt user_contacts
\dt contact_labels
\dt contact_label_members
\dt contact_notes
\dt contact_exports
```

2. Verify triggers:
```sql
\df auto_add_contact
\df update_last_contacted
```

3. Test API endpoints:
```bash
curl https://app.kipenzi.com/api/contacts \
  -H "Cookie: kipenzi_session=..." \
  -H "x-csrf-token: ..."
```

## Conclusion

The Contact Management feature provides a comprehensive system for organizing relationships within Kipenzi. By combining favorites, labels, notes, and sync capabilities, users can maintain rich context about their connections while preserving privacy and security.
