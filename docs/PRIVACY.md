# Privacy Settings - Online Status & Last Seen

## Overview

MyKipenzi now includes comprehensive privacy controls for online status and last seen timestamps. Users can control who can see when they're actively using the app and when they were last online.

## Features

### 1. Online Status
- **Real-time presence**: Users are marked as "online" when they've been active within the last 60 seconds
- **Privacy control**: Users can choose who sees their online status
- **Visual indicators**: Green dot (●) shown next to online users in conversations and user directory

### 2. Last Seen Timestamp
- **Activity tracking**: Tracks the last time a user accessed conversations or messages
- **Privacy control**: Users can choose who sees their last seen time
- **Smart formatting**: Displays relative time (e.g., "5m ago", "2h ago", "yesterday")

### 3. Privacy Options

Both online status and last seen have three visibility levels:
- **Everyone**: All users can see your status (default)
- **My contacts**: Only people you have conversations with can see your status
- **Nobody**: Your status is hidden from everyone

## Implementation Details

### Database Schema

New columns added to the `users` table:
```sql
last_seen timestamptz
online_status_visibility text NOT NULL DEFAULT 'everyone' CHECK(online_status_visibility IN ('everyone','contacts','nobody'))
last_seen_visibility text NOT NULL DEFAULT 'everyone' CHECK(last_seen_visibility IN ('everyone','contacts','nobody'))
```

### API Updates

#### Profile Update Endpoint
`PATCH /api/profile` now accepts:
```javascript
{
  online_status_visibility: 'everyone' | 'contacts' | 'nobody',
  last_seen_visibility: 'everyone' | 'contacts' | 'nobody'
}
```

#### User Directory Endpoint
`GET /api/users` now returns:
```javascript
{
  users: [{
    id: string,
    name: string,
    handle: string,
    avatar_id: string,
    online: boolean | null,  // null if privacy settings prevent viewing
    last_seen: timestamp | null  // null if privacy settings prevent viewing
  }],
  has_more: boolean
}
```

#### Conversations Endpoint
`GET /api/conversations` now includes privacy-filtered peer status:
```javascript
{
  peer: {
    online: boolean | null,
    last_seen: timestamp | null
  }
}
```

### Activity Tracking

Last seen timestamp is automatically updated when users:
- Fetch their conversations list (`GET /api/conversations`)
- Fetch messages from a conversation (`GET /api/conversations/:id/messages`)

The system considers a user "online" if their `last_seen` timestamp is within the last 60 seconds.

### Privacy Filtering Logic

For each user being viewed:
1. Check if viewer is a contact (has a conversation with the user)
2. Apply visibility rules:
   - `everyone`: Show status to all users
   - `contacts`: Show status only if viewer is a contact
   - `nobody`: Never show status (returns null)

### Frontend Components

#### Settings Modal
Location: `src/components.jsx` - `Settings` component

New UI controls added:
- Online status visibility dropdown
- Last seen visibility dropdown

#### User Directory
Location: `src/UserDirectory.jsx`

Shows:
- Green "● online" indicator for online users
- "last seen X ago" text for offline users (when permitted)

#### Conversations List
Location: `src/App.jsx`

Shows:
- Green dot next to online contacts in conversation list
- Last seen timestamp below language indicator (when permitted)

#### Chat Header
Location: `src/App.jsx`

Shows:
- "online" status in chat header
- "last seen X ago" in chat header (when not online)

## Migration

For existing databases, run the migration script:

```bash
psql -U your_user -d your_database -f server/privacy-settings-migration.sql
```

This will:
- Add the three new columns to the users table
- Set default values for existing users ('everyone' for both settings)

## Security Considerations

1. **Privacy by default**: Default settings allow everyone to see status, but users can easily restrict this
2. **Contact detection**: System accurately detects if users have an existing conversation (contact relationship)
3. **Null handling**: When privacy settings prevent viewing, the system returns `null` rather than false values
4. **Server-side filtering**: All privacy filtering happens on the backend - clients never receive data they shouldn't see

## User Experience

### Visibility Levels Explained

**Everyone**
- Best for users who want maximum visibility
- All registered users can see when you're online or last active
- Useful for meeting new people or being discoverable

**My contacts**
- Balanced privacy setting
- Only people you've started conversations with can see your status
- Recommended for most users who want some privacy

**Nobody**
- Maximum privacy
- Your status is completely hidden from everyone
- Useful if you want to use the app without anyone knowing when you're active

### Time Formatting

Last seen timestamps are displayed in a human-friendly format:
- "just now" - Active within the last minute
- "5m ago" - Active 5 minutes ago
- "2h ago" - Active 2 hours ago
- "yesterday" - Active yesterday
- "3d ago" - Active 3 days ago
- Full date - Active more than 7 days ago

## Future Enhancements

Potential future improvements:
1. Read receipts privacy control
2. Typing indicator privacy control
3. Profile photo visibility control
4. Voice message auto-play settings
5. Custom status messages
6. Activity status (e.g., "In a call", "Busy", "Away")
