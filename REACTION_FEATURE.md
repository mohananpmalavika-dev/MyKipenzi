# Message Reactions Feature

## Overview
Implemented emoji reactions for messages with long-press interaction support. Users can react to any message with one of six emoji reactions: ❤️ 😂 👍 😮 😢 🙏

## Features Implemented

### 1. Database Schema
- **New table**: `reactions` to store message reactions
  - Fields: `message_id`, `user_id`, `emoji`, `created_at`
  - Primary key: Composite of `message_id`, `user_id`, `emoji` (one emoji per user per message)
  - Supports 6 emoji types: ❤️ 😂 👍 😮 😢 🙏
  - Indexes for efficient querying by message and user
  - Cascading delete when messages are deleted

### 2. Backend API

#### New Endpoint
- **POST** `/api/messages/:id/reactions`
  - Body: `{ emoji: string }`
  - Toggles reaction (adds if not present, removes if present)
  - Rate limited: 60 requests per minute
  - Returns: `{ removed: boolean }`

#### Updated Query
- Modified `messageSelect` query to include reactions data
  - Aggregates reactions by emoji
  - Includes count, list of users, and whether current user reacted
  - Format: `{ "❤️": { count: 3, users: [...], reacted: true }, ... }`

#### Service Functions
- `toggleReaction(user, messageId, emoji)` - Handles reaction toggle logic
  - Validates message exists and user has access
  - Prevents reactions on deleted messages
  - Broadcasts changes to conversation members

### 3. Frontend UI

#### Interaction
- **Long-press** (500ms) on message bubble to show reaction picker
  - Works with mouse (desktop) and touch (mobile)
  - Picker shows all 6 available emojis

#### Display
- Reactions appear below the message
- Each reaction shows:
  - Emoji icon
  - Count of users who reacted
  - Highlight if current user reacted
  - Tooltip with names of users who reacted
- Click a reaction to toggle it on/off

#### Styling
- Reaction pills with rounded borders
- Active state (blue background) when user has reacted
- Hover effects for better interactivity
- Positioned below message meta information

### 4. Real-time Updates
- Reactions update in real-time via existing `message:changed` event
- All conversation members see reactions immediately
- Optimistic UI updates on interaction

## Files Modified

### Backend
1. `server/reactions-schema.sql` - New schema file
2. `server/migrate.js` - Added migration for reactions table
3. `server/service.js` - Added `toggleReaction()` and updated `messageSelect`
4. `server/app.js` - Added reaction endpoint and updated query parameters
5. `shared/contracts.js` - Added `reactionEmojis` and `reactionInput` schema

### Frontend
1. `src/components.jsx` - Updated `Message` component with reaction UI and handlers
2. `src/styles.css` - Added reaction-specific styles

## Usage

### For Users
1. **Add Reaction**: Long-press (or click and hold) on any message for 500ms
2. **Remove Reaction**: Click on the reaction you've already added
3. **View Reactions**: Click/hover over reactions to see who reacted

### API Example
```javascript
// Toggle a reaction
await api(`/messages/${messageId}/reactions`, {
  method: 'POST',
  body: { emoji: '❤️' }
});
```

## Technical Details

### Database Structure
```sql
CREATE TABLE reactions (
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id),
  emoji text NOT NULL CHECK(emoji IN ('❤️','😂','👍','😮','😢','🙏')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(message_id, user_id, emoji)
);
```

### Reaction Data Format
```javascript
message.reactions = {
  "❤️": {
    count: 2,
    users: [{ id: "...", name: "Alice" }, { id: "...", name: "Bob" }],
    reacted: true  // if current user reacted
  },
  "😂": {
    count: 1,
    users: [{ id: "...", name: "Charlie" }],
    reacted: false
  }
}
```

## Testing
The feature is now live on the development server at http://localhost:5173/

To test:
1. Send a message in a conversation
2. Long-press on the message to see the reaction picker
3. Click an emoji to add your reaction
4. Click the same reaction again to remove it
5. Open the same conversation in another browser/device to see real-time updates
