# Message Drafts Feature 📝

## Overview

The Message Drafts feature automatically saves unfinished messages in each conversation, ensuring that users never lose their thoughts when switching between chats or closing the app.

## Features

### ✨ Auto-save Functionality
- **Automatic saving**: Drafts are saved 1 second after the user stops typing
- **Per-conversation storage**: Each conversation maintains its own independent draft
- **Smart debouncing**: Prevents excessive API calls while maintaining responsiveness

### 🔄 Draft Restoration
- **Seamless restoration**: Drafts are automatically loaded when opening a conversation
- **State preservation**: Draft text and source language are restored
- **Instant availability**: Drafts appear immediately when switching conversations

### 👁️ Draft Indicators
- **Visual feedback**: Conversations with saved drafts show a "📝 Draft: ..." preview
- **Red highlight**: Draft previews are displayed in red italic text
- **Text truncation**: Long drafts are truncated with ellipsis for clean display

### 🧹 Draft Cleanup
- **Automatic expiration**: Drafts older than 30 days are automatically deleted
- **Post-send cleanup**: Drafts are removed immediately after successfully sending a message
- **Background maintenance**: Cleanup runs every 5 seconds as part of the server maintenance cycle

## Technical Implementation

### Database Schema

```sql
CREATE TABLE message_drafts (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  text text NOT NULL DEFAULT '',
  reply_to_id uuid REFERENCES messages(id) ON DELETE SET NULL,
  source_language text NOT NULL DEFAULT 'auto',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id, conversation_id)
);
```

### API Endpoints

#### `GET /api/conversations/:id/draft`
Load the saved draft for a specific conversation.

**Response:**
```json
{
  "text": "Draft message text",
  "reply_to_id": "uuid-or-null",
  "source_language": "auto",
  "updated_at": "2026-10-09T12:00:00Z"
}
```

#### `PUT /api/conversations/:id/draft`
Save or update a draft for a conversation.

**Request Body:**
```json
{
  "text": "Draft message text",
  "reply_to_id": "uuid-or-null",
  "source_language": "auto"
}
```

**Response:**
```json
{
  "user_id": "user-uuid",
  "conversation_id": "conversation-uuid",
  "text": "Draft message text",
  "reply_to_id": null,
  "source_language": "auto",
  "created_at": "2026-10-09T12:00:00Z",
  "updated_at": "2026-10-09T12:05:00Z"
}
```

#### `DELETE /api/conversations/:id/draft`
Delete the draft for a specific conversation.

**Response:**
```json
{
  "ok": true
}
```

#### `GET /api/drafts`
Get all drafts for the current user with conversation metadata.

**Response:**
```json
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

### Client-Side Hook

The `useDraftManager` hook handles all draft operations:

```javascript
const { clearDraft } = useDraftManager(
  conversationId,
  draft,
  setDraft,
  replyTo,
  setReplyTo,
  source,
  setSource,
  onError
);
```

**Features:**
- Automatic draft loading on conversation change
- Debounced auto-save (1 second delay)
- Draft clearing after successful message send
- Silent error handling for non-critical failures

## User Experience

### Draft Creation
1. User starts typing a message
2. After 1 second of inactivity, draft is automatically saved
3. No visual feedback during save (seamless background operation)

### Draft Restoration
1. User opens a conversation with a saved draft
2. Draft text appears immediately in the message input
3. Source language setting is also restored
4. User can continue editing from where they left off

### Draft Display
- Conversations with drafts show: **📝 Draft: [first 50 characters]...**
- Draft preview appears in place of the last message preview
- Red color and italic style distinguish drafts from regular messages

### Draft Expiration
- Drafts are kept for 30 days
- After 30 days, drafts are automatically deleted during server maintenance
- No user notification for expired drafts

## Configuration

### Draft Expiration Period
Modify the cleanup interval in `server/index.js`:

```javascript
await c.query("DELETE FROM message_drafts WHERE updated_at < now() - interval '30 days'");
```

Change `'30 days'` to your desired retention period (e.g., `'7 days'`, `'90 days'`).

### Auto-save Delay
Modify the debounce delay in `src/useDraftManager.js`:

```javascript
const AUTOSAVE_DELAY = 1000; // milliseconds
```

## Privacy & Security

- **User isolation**: Drafts are scoped to individual users
- **Automatic cleanup**: Old drafts are removed automatically
- **Cascade deletion**: Drafts are deleted when users or conversations are removed
- **No cross-user access**: Drafts are never shared between conversation participants

## Performance Considerations

- **Rate limiting**: Draft saves are rate-limited to 100 requests per minute per user
- **Debouncing**: Prevents excessive API calls during active typing
- **Efficient queries**: Database indexes on `user_id`, `conversation_id`, and `updated_at`
- **Batch loading**: All draft previews loaded in a single query for the conversation list

## Future Enhancements

Potential improvements for future versions:

1. **Local storage fallback**: Store drafts in localStorage for offline scenarios
2. **Draft synchronization**: Sync drafts across multiple devices
3. **Rich content drafts**: Support for draft attachments and formatting
4. **Draft history**: Allow users to access previous draft versions
5. **Draft notifications**: Remind users about unsent drafts older than X days
6. **Manual draft management**: UI for viewing and managing all saved drafts

## Troubleshooting

### Drafts Not Saving
- Check browser console for errors
- Verify server is running and accessible
- Check rate limiting hasn't been exceeded
- Ensure database migration #14 has been applied

### Drafts Not Loading
- Check conversation membership
- Verify draft exists in database
- Check for JavaScript errors in browser console
- Ensure proper user authentication

### Drafts Not Appearing in List
- Verify `/api/drafts` endpoint is accessible
- Check conversation list refresh logic
- Ensure conversation has a valid draft in database

## Migration

To add the drafts feature to an existing installation:

1. Run the database migration:
```bash
node server/migrate.js
```

2. Restart the server:
```bash
npm start
```

The migration is idempotent and safe to run multiple times.
