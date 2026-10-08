# Privacy Settings Feature - Implementation Summary

## What Was Implemented

This implementation adds comprehensive online status and last seen privacy controls to MyKipenzi, giving users full control over who can see their activity status.

## Changes Made

### 1. Database Schema (`server/schema.sql`)
- Added `last_seen` column to track user activity timestamp
- Added `online_status_visibility` column with options: 'everyone', 'contacts', 'nobody'
- Added `last_seen_visibility` column with options: 'everyone', 'contacts', 'nobody'
- Default values set to 'everyone' for both visibility settings

### 2. Migration Script (`server/privacy-settings-migration.sql`)
- Created migration script for existing databases
- Safely adds new columns with IF NOT EXISTS check
- Sets default values for existing users

### 3. Backend API Changes

#### `server/auth.js`
- Updated `publicUser()` function to include privacy settings in user profile
- Now returns: `online_status_visibility`, `last_seen_visibility`, `last_seen`

#### `server/app.js`
- **Profile Update**: Modified `PATCH /api/profile` to accept privacy settings
- **User Directory**: Enhanced `GET /api/users` to:
  - Check contact relationships
  - Apply privacy filtering based on visibility settings
  - Return `online` status (true/false/null) and `last_seen` (timestamp/null)
  - Determine online status (activity within last 60 seconds)
- **Conversations List**: Updated `GET /api/conversations` to:
  - Include peer privacy settings and last_seen timestamp
  - Apply privacy filtering for each conversation's peer
  - Update user's last_seen timestamp on activity
- **Messages**: Updated `GET /api/conversations/:id/messages` to update last_seen on activity

#### `shared/contracts.js`
- Extended profile validation schema to include optional privacy settings
- Validated enum values for both visibility settings

### 4. Frontend Changes

#### `src/components.jsx` - Settings Component
- Added two new dropdown selectors in settings modal:
  - "Who can see when I'm online"
  - "Who can see my last seen time"
- Added explanatory text for each privacy option
- Integrated privacy settings into the draft state and save functionality

#### `src/UserDirectory.jsx`
- Added `formatLastSeen()` utility function for human-readable timestamps
- Enhanced user list items to display:
  - Green "● online" indicator for online users
  - "last seen X ago" text for offline users (respecting privacy)
- Conditional rendering based on privacy settings (null values hidden)

#### `src/App.jsx`
- Added `formatLastSeen()` utility function (shared across app)
- **Conversation List**: Enhanced to show:
  - Green dot (●) next to online contacts
  - Last seen timestamp below language indicator
  - Conditional rendering based on privacy permissions
- **Chat Header**: Updated to display:
  - "online" status for active users
  - "last seen X ago" for inactive users
  - Seamlessly integrated into existing header design

### 5. Documentation

#### `docs/PRIVACY.md`
Comprehensive documentation covering:
- Feature overview and capabilities
- Database schema details
- API endpoint specifications
- Privacy filtering logic
- Frontend component changes
- Migration instructions
- Security considerations
- User experience guidelines

## How It Works

### Activity Tracking
1. User accesses `/api/conversations` or `/api/conversations/:id/messages`
2. Backend updates `last_seen` timestamp to current time
3. System considers user "online" if `last_seen` is within last 60 seconds

### Privacy Filtering
1. When user A views user B's status:
   - Check if A and B have an existing conversation (are contacts)
   - Apply B's visibility rules:
     - `everyone`: Show to all users
     - `contacts`: Show only if A is a contact of B
     - `nobody`: Never show (return null)

### Frontend Display
- **Online**: Green dot + "online" text
- **Recently offline**: "last seen X ago" with relative time formatting
- **Privacy restricted**: No status indicator shown

## Privacy Options Explained

**Everyone (Default)**
- All registered users can see your online status and last seen time
- Maximum visibility and discoverability

**My contacts**
- Only people you have conversations with can see your status
- Balanced privacy for connected relationships

**Nobody**
- Your status is completely hidden from everyone
- Maximum privacy - use app without status visibility

## Testing Checklist

Before deployment, verify:

- [ ] Migration script runs successfully on test database
- [ ] Settings UI correctly saves privacy preferences
- [ ] User directory respects privacy settings
- [ ] Conversation list shows/hides status based on settings
- [ ] Chat header displays correct status
- [ ] Contact detection works correctly
- [ ] Time formatting displays correctly for various intervals
- [ ] Null values handled gracefully (no errors)
- [ ] Online detection (60 second threshold) works
- [ ] Last seen updates on conversations/messages fetch

## Deployment Steps

1. **Backup database**
   ```bash
   pg_dump your_database > backup_$(date +%Y%m%d).sql
   ```

2. **Run migration**
   ```bash
   psql -U your_user -d your_database -f server/privacy-settings-migration.sql
   ```

3. **Deploy backend code**
   - Deploy updated `server/` files
   - Restart server processes

4. **Deploy frontend code**
   ```bash
   npm run build
   ```
   - Deploy built assets

5. **Verify deployment**
   - Test settings update
   - Test status visibility with different privacy settings
   - Test contact vs non-contact visibility
   - Monitor logs for errors

## User Communication

When announcing this feature, highlight:
- **Control**: "You're in control of who sees when you're online"
- **Privacy**: "Choose to share your activity with everyone, just your contacts, or keep it private"
- **Simplicity**: "Easy-to-use settings in your profile - change anytime"
- **Defaults**: "Default is 'everyone' - your current visibility is unchanged"

## Future Enhancements

Consider adding:
- Read receipts privacy control
- Typing indicator visibility
- Profile photo visibility settings
- Custom status messages
- Activity statuses (Busy, Away, etc.)
- Scheduled privacy (auto-switch to "nobody" during certain hours)
