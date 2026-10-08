# Group Chat Features Documentation

This document describes the comprehensive group chat functionality implemented in MyKipenzi.

## Overview

MyKipenzi now supports full-featured group chats with admin roles, member management, privacy controls, invite links, and more.

## Features

### 1. Group Creation & Management

#### Creating a Group
- **Minimum Members**: 2 members (plus creator = 3 total)
- **Maximum Members**: 50 members total
- **Group Name**: Required, 1-80 characters
- **Group Description**: Optional, up to 500 characters
- **Creator Role**: Automatically becomes the first admin

#### Group Profile
- **Group Name**: Can be edited by admins
- **Description**: Optional description field
- **Group Avatar**: Upload custom group photo (admins only)
- **Created Date**: Timestamp of group creation
- **Member Count**: Total number of group members

### 2. Admin Roles & Permissions

#### Admin Privileges
- Add/remove members
- Promote members to admin
- Demote other admins (must keep at least one admin)
- Update group profile (name, description, avatar)
- Create and revoke invite links
- Approve/reject join requests
- Configure group settings
- Manage member permissions

#### Member Permissions (Configurable by Admins)
- **Can Send Messages**: Toggle ability to send messages
- **Can Add Members**: Toggle ability to invite new members
- **Muted**: Individual member can mute group notifications

### 3. Member Management

#### Adding Members
- Add by username/handle
- Check user's privacy settings ("who can add me to groups")
- Verify no blocks exist between any members
- Support for group join approval workflow

#### Removing Members
- Admins can remove any member (except themselves)
- Members can leave the group voluntarily
- Admin safeguard: Last admin must promote another before leaving

#### Member Information Display
- Name, handle, avatar
- Admin badge for administrators
- Join date
- Language preference
- Real-time member status

### 4. Group Invite Links

#### Creating Invite Links
- Generate unique shareable link
- Optional expiration (1-365 days)
- Optional usage limit (1-1000 uses)
- Track usage count
- Created by admin with attribution

#### Managing Invite Links
- View all active invite links
- Copy link to clipboard
- Revoke links at any time
- View link statistics (uses, expiration, creator)

#### Joining via Invite Link
- One-click join process
- Automatic validation (expiration, usage limit)
- Respects group approval settings
- Block checking before adding

### 5. Privacy Settings

#### User-Level Privacy Controls
- **Who Can Add Me to Groups**:
  - Everyone (default)
  - Contacts only
  - Nobody
  
- **Require Group Approval**: When enabled, joining a group requires admin approval

#### Group-Level Privacy Controls
- **Allow Member Invites**: When enabled, all members can add new members
- **Require Admin Approval**: New members via invite links need admin approval

### 6. Join Request System

#### For Users Requiring Approval
- Submit join request via invite link
- Include optional message
- Wait for admin response

#### For Admins
- View all pending requests
- See requester's name, handle, avatar
- Approve or reject with one click
- Track request timestamps

### 7. Group Activity Logs

Automatic logging of all group activities:
- Member added/removed
- Member joined/left
- Admin promoted/demoted
- Group created/deleted
- Group profile updated
- Settings changed

Each log entry includes:
- Action type
- Actor (who performed the action)
- Target user (if applicable)
- Timestamp
- Metadata

### 8. System Messages

Visual indicators in chat for group events:
- "Alice added Bob"
- "Charlie left the group"
- "David was promoted to admin"
- "Group name changed to 'Best Friends'"
- "Group avatar changed"

### 9. Group Notifications

- **Mute Group**: Individual users can mute group notifications
- **Group Settings**: Configured in group settings modal
- **Message Alerts**: Same alert system as direct chats

## API Endpoints

### Group Management
- `POST /api/conversations/groups` - Create a new group
- `GET /api/conversations/:id/details` - Get group details
- `PATCH /api/conversations/:id/profile` - Update group profile
- `POST /api/conversations/:id/photo` - Upload group avatar
- `DELETE /api/conversations/:id/photo` - Remove group avatar
- `DELETE /api/conversations/:id` - Delete group (soft delete)

### Member Management
- `POST /api/conversations/:id/members` - Add member to group
- `DELETE /api/conversations/:id/members/:userId` - Remove member
- `POST /api/conversations/:id/leave` - Leave group
- `POST /api/conversations/:id/members/:userId/promote` - Promote to admin
- `POST /api/conversations/:id/members/:userId/demote` - Demote from admin
- `PATCH /api/conversations/:id/members/:userId/permissions` - Update permissions

### Group Settings
- `PATCH /api/conversations/:id/mute` - Mute/unmute group

### Invite Links
- `POST /api/conversations/:id/invites` - Create invite link
- `GET /api/conversations/:id/invites` - List all invite links
- `DELETE /api/conversations/:id/invites/:inviteId` - Revoke invite link
- `POST /api/groups/join` - Join group via invite code

### Join Requests
- `GET /api/conversations/:id/join-requests` - Get pending requests (admin)
- `POST /api/conversations/:id/join-requests/:requestId` - Approve/reject request

### Activity Logs
- `GET /api/conversations/:id/activity` - Get group activity history

## Database Schema

### Enhanced Tables

#### `conversations` table additions:
- `description` - Group description (up to 500 chars)
- `avatar_id` - Reference to group avatar attachment
- `created_by_id` - User who created the group
- `allow_member_invites` - Allow non-admins to add members
- `require_admin_approval` - Require approval for invite link joins
- `deleted_at` - Soft delete timestamp

#### `members` table additions:
- `is_admin` - Admin status flag
- `can_send_messages` - Permission to send messages
- `can_add_members` - Permission to add new members
- `joined_at` - When member joined
- `added_by_id` - Who added this member
- `muted` - Individual mute status

#### `users` table additions:
- `who_can_add_to_groups` - Privacy setting (everyone/contacts/nobody)
- `require_group_approval` - Require approval before joining

### New Tables

#### `group_invites`
- Unique invite codes
- Expiration dates
- Usage limits and counters
- Creator attribution
- Revocation status

#### `group_join_requests`
- Pending, approved, or rejected status
- Requestor information
- Optional invite link reference
- Admin response tracking

#### `group_activities`
- Activity type
- Actor and target users
- Metadata JSON
- Timestamps

#### `system_messages`
- Group event messages
- Actor and target users
- Message type classification
- Metadata for rendering

## UI Components

### GroupSettingsModal
Main modal for all group settings with tabs:
- **Info Tab**: Group profile, description, actions
- **Members Tab**: Member list with admin controls
- **Invites Tab**: Create and manage invite links (admin)
- **Requests Tab**: View and respond to join requests (admin)

### GroupMembersList
Collapsible member list showing:
- Admins section with crown icons
- Regular members section
- Member names and handles

### Group Badge Indicators
- Crown icon for admins
- Admin badge in member lists
- Member count in chat header

## User Experience

### Group Chat Header
- Group name displayed as conversation title
- Member count shown
- Group settings button (users icon)
- Admin indicators visible

### Creating a Group
1. Click "+" button → "Create group chat"
2. Enter group name and optional description
3. Add member handles (comma-separated)
4. Click "Create group"
5. Automatically becomes first admin

### Managing Group (Admin)
1. Open group chat
2. Click group settings icon in header
3. Navigate tabs for different management tasks
4. Make changes (add/remove members, update settings, etc.)
5. Changes sync automatically

### Joining via Invite Link
1. Click invite link (e.g., `example.com/join/abc123`)
2. If approved: Instant join
3. If requires approval: Submit join request
4. Wait for admin approval
5. Notification when approved/rejected

## Security & Privacy

### Block Protection
- Cannot add blocked users to groups
- Cannot create groups with users who have blocked each other
- Leaving/removing blocked users is allowed

### Privacy Enforcement
- Respects user's "who can add me to groups" setting
- Validates permissions before adding members
- Checks group approval requirements

### Admin Safeguards
- Must have at least one admin at all times
- Cannot demote last admin
- Admin must transfer role before leaving (if other members exist)

### Data Privacy
- Group activities logged for transparency
- System messages inform all members of changes
- No hidden actions by admins

## Translation & Multi-Language Support

- Each member sees messages in their preferred language
- Group settings and system messages are translated
- Member language preferences shown in member list
- Admin actions work across all languages

## Performance Considerations

- Member list queries optimized with indexes
- Activity logs paginated
- Invite code generation uses secure random bytes
- Database queries use appropriate locking for consistency

## Future Enhancements

Potential additions:
- Group voice/video calls
- File sharing quotas per group
- Custom group roles beyond admin/member
- Group announcements/pinned messages
- Group templates
- Scheduled messages for groups
- Group analytics for admins

## Testing

See `tests/integration/api.test.js` for group API test coverage including:
- Group creation
- Member management
- Admin operations
- Invite links
- Join requests
- Privacy controls
- Block handling

## Migration

Run database migrations to add group features:
```bash
node server/migrate.js
```

This applies migration version 7 which adds all group management tables and columns.
