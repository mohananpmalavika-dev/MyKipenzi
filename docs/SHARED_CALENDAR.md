# Shared Calendar & To-Do Lists Feature

## Overview

The Shared Calendar feature provides couples with a comprehensive calendar system to manage their shared events, special dates, and to-do lists. This feature includes event reminders, countdowns to special occasions, and collaborative task management.

## Features

### 📅 Calendar Events

- **Create Events**: Add events with titles, descriptions, dates, times, and locations
- **Event Categories**: Organize events by type (Anniversary, Birthday, Date Night, Trip, etc.)
- **Recurring Events**: Support for daily, weekly, monthly, and yearly recurring events
- **Event Reminders**: Configurable reminders (15 min to 1 week before)
- **Event Responses**: Partners can RSVP with "going", "maybe", or "excited"
- **Countdown**: Real-time countdown to upcoming events
- **All-Day Events**: Option for events without specific times

### ✓ To-Do Lists

- **Multiple Lists**: Create unlimited shared to-do lists
- **Task Management**: Add, complete, edit, and delete tasks
- **Priority Levels**: Assign low, normal, or high priority to tasks
- **Due Dates**: Set optional due dates for tasks
- **Completion Tracking**: See who completed each task
- **List Organization**: Customize lists with emojis and colors

### 🔔 Reminders & Notifications

- **Push Notifications**: Receive reminders before events
- **Real-Time Updates**: See changes instantly when partner adds/edits events
- **Countdown Alerts**: Visual countdown for upcoming events
- **Haptic Feedback**: Gentle vibrations for interactions

## Database Schema

### Calendar Events Table
```sql
calendar_events (
  id uuid PRIMARY KEY,
  conversation_id uuid,
  created_by_id uuid,
  title text (1-200 chars),
  description text (up to 2000 chars),
  event_date date,
  event_time time (optional),
  all_day boolean,
  category text (anniversary, birthday, date_night, special_date, trip, appointment, other),
  emoji text,
  location text (up to 500 chars),
  is_recurring boolean,
  recurrence_pattern text (daily, weekly, monthly, yearly),
  recurrence_end_date date,
  reminder_minutes integer (0, 15, 30, 60, 120, 1440, 2880, 10080),
  reminder_sent_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
```

### Event Responses Table
```sql
calendar_event_responses (
  event_id uuid,
  user_id uuid,
  response text (going, maybe, excited),
  note text (up to 500 chars),
  created_at timestamptz
)
```

### To-Do Lists Table
```sql
todo_lists (
  id uuid PRIMARY KEY,
  conversation_id uuid,
  created_by_id uuid,
  title text (1-100 chars),
  description text (up to 1000 chars),
  emoji text,
  color text (hex color),
  position integer,
  created_at timestamptz,
  updated_at timestamptz
)
```

### To-Do Items Table
```sql
todo_items (
  id uuid PRIMARY KEY,
  list_id uuid,
  conversation_id uuid,
  created_by_id uuid,
  text text (1-500 chars),
  is_completed boolean,
  completed_by_id uuid,
  completed_at timestamptz,
  due_date date,
  priority text (low, normal, high),
  position integer,
  created_at timestamptz,
  updated_at timestamptz
)
```

## API Endpoints

### Calendar Events

#### Get Events
```
GET /api/conversations/:id/calendar/events?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
```

#### Create Event
```
POST /api/conversations/:id/calendar/events
Body: {
  title: string,
  description?: string,
  event_date: string (YYYY-MM-DD),
  event_time?: string (HH:MM),
  all_day?: boolean,
  category?: string,
  emoji?: string,
  location?: string,
  is_recurring?: boolean,
  recurrence_pattern?: string,
  recurrence_end_date?: string,
  reminder_minutes?: number
}
```

#### Update Event
```
PATCH /api/conversations/:id/calendar/events/:eventId
Body: (same as create, all fields optional)
```

#### Delete Event
```
DELETE /api/conversations/:id/calendar/events/:eventId
```

#### Respond to Event
```
POST /api/conversations/:id/calendar/events/:eventId/respond
Body: {
  response: 'going' | 'maybe' | 'excited',
  note?: string
}
```

### To-Do Lists

#### Get Lists
```
GET /api/conversations/:id/calendar/todos
```

#### Create List
```
POST /api/conversations/:id/calendar/todos
Body: {
  title: string,
  description?: string,
  emoji?: string,
  color?: string
}
```

#### Update List
```
PATCH /api/conversations/:id/calendar/todos/:listId
Body: (same as create, all fields optional)
```

#### Delete List
```
DELETE /api/conversations/:id/calendar/todos/:listId
```

### To-Do Items

#### Get Items
```
GET /api/conversations/:id/calendar/todos/:listId/items
```

#### Create Item
```
POST /api/conversations/:id/calendar/todos/:listId/items
Body: {
  text: string,
  due_date?: string (YYYY-MM-DD),
  priority?: 'low' | 'normal' | 'high'
}
```

#### Update Item
```
PATCH /api/conversations/:id/calendar/todos/:listId/items/:itemId
Body: (same as create, all fields optional)
```

#### Toggle Item Completion
```
POST /api/conversations/:id/calendar/todos/:listId/items/:itemId/toggle
```

#### Delete Item
```
DELETE /api/conversations/:id/calendar/todos/:listId/items/:itemId
```

## Real-Time Events

The calendar feature emits and listens for the following socket events:

- `calendar:event_created` - When a new event is created
- `calendar:event_updated` - When an event is edited
- `calendar:event_deleted` - When an event is removed
- `calendar:event_response` - When a partner responds to an event
- `calendar:reminder` - When an event reminder is triggered
- `calendar:list_created` - When a new to-do list is created
- `calendar:list_updated` - When a list is edited
- `calendar:list_deleted` - When a list is removed
- `calendar:item_created` - When a new task is added
- `calendar:item_updated` - When a task is edited
- `calendar:item_toggled` - When a task is completed/uncompleted
- `calendar:item_deleted` - When a task is removed

## Worker Process

The calendar feature includes a background worker that processes event reminders:

```javascript
// Runs every minute to check for upcoming reminders
processEventReminders()
```

- Checks for events with upcoming reminders (based on `reminder_minutes`)
- Sends push notifications to both partners
- Marks reminders as sent to prevent duplicates
- Handles timezone-aware reminder scheduling

## Frontend Integration

### Import the Component
```javascript
import { SharedCalendar } from './SharedCalendar.jsx';
```

### Usage
```jsx
<SharedCalendar
  conversationId={conversationId}
  user={user}
  peer={peer}
  socket={socket}
  onClose={() => setShowCalendar(false)}
  onError={(error) => showError(error)}
/>
```

## Bilingual Support

The calendar feature supports bilingual UI (English/Malayalam):

- Event categories with Malayalam translations
- Reminder options in both languages
- UI labels and buttons in both languages
- Date/time formatting respects locale

## Usage Examples

### Creating an Anniversary Event
```javascript
{
  title: "Our First Anniversary",
  description: "Celebrating one amazing year together!",
  event_date: "2026-10-09",
  all_day: true,
  category: "anniversary",
  emoji: "💕",
  location: "Beach House Restaurant",
  is_recurring: true,
  recurrence_pattern: "yearly",
  reminder_minutes: 2880  // 2 days before
}
```

### Creating a Date Night Event
```javascript
{
  title: "Movie Night",
  event_date: "2026-10-12",
  event_time: "19:00",
  all_day: false,
  category: "date_night",
  emoji: "🌹",
  location: "Home",
  reminder_minutes: 120  // 2 hours before
}
```

### Creating a Shopping List
```javascript
{
  title: "Grocery Shopping",
  description: "Items for this week",
  emoji: "🛒",
  color: "#10b981"
}
```

## Security & Privacy

- **Authentication Required**: All endpoints require valid session
- **Conversation Membership**: Users can only access calendars for their conversations
- **Rate Limiting**: API calls are rate-limited (60-200 requests per minute)
- **Data Validation**: All inputs are validated server-side
- **SQL Injection Protection**: Parameterized queries prevent SQL injection
- **XSS Prevention**: User input is sanitized

## Performance Considerations

- **Indexed Queries**: Database indexes on conversation_id, event_date, and due_date
- **Pagination**: Events loaded by month to reduce data transfer
- **Real-Time Updates**: Socket.io used for instant synchronization
- **Background Workers**: Reminder processing runs asynchronously
- **Caching**: Event countdowns calculated client-side

## Future Enhancements

- Calendar sync with external calendars (Google Calendar, Apple Calendar)
- Event attachments (photos, documents)
- Task assignment to specific partner
- Shopping list mode with checkboxes
- Calendar export (iCal format)
- Event photos/memories attached to events
- Voice input for quick task creation
- Smart suggestions for recurring events

## Testing

Run the database migration:
```bash
npm run migrate
```

Start the development server:
```bash
npm run dev
```

Test the API endpoints using the provided examples or through the UI.

## Troubleshooting

### Reminders not sending
- Check that the worker process is running
- Verify push notification configuration
- Check `reminder_sent_at` field in database

### Events not appearing
- Verify date range in API query
- Check database indexes
- Confirm conversation membership

### To-do items not syncing
- Check socket connection
- Verify conversation_id matches
- Check browser console for errors

## Support

For issues or questions about the Shared Calendar feature, please refer to:
- Main documentation: `README.md`
- API documentation: `docs/API.md`
- Contact management: `docs/CONTACT_MANAGEMENT.md`
