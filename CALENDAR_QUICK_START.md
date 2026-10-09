# Shared Calendar - Quick Start Guide

## 🚀 Quick Integration (5 Minutes)

### Step 1: Add the Calendar Button

In your main chat interface (likely `src/App.jsx` or similar), add a calendar icon button:

```jsx
import { Calendar } from 'lucide-react';
import { SharedCalendar } from './SharedCalendar.jsx';

function ChatInterface() {
  const [showCalendar, setShowCalendar] = useState(false);

  return (
    <>
      {/* Add this button to your header/toolbar */}
      <button 
        onClick={() => setShowCalendar(true)}
        title="Our Shared Calendar"
      >
        <Calendar size={20} />
      </button>

      {/* Add this at the end of your component */}
      {showCalendar && (
        <SharedCalendar
          conversationId={conversationId}
          user={user}
          peer={peer}
          socket={socket}
          onClose={() => setShowCalendar(false)}
          onError={(error) => alert(error)}
        />
      )}
    </>
  );
}
```

### Step 2: Add Basic CSS Styles

Add this to your main CSS file (or create `src/SharedCalendar.css`):

```css
/* Calendar Modal */
.calendar-modal {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  width: 90vw;
  max-width: 1200px;
  height: 85vh;
  max-height: 800px;
  display: flex;
  flex-direction: column;
  z-index: 1000;
}

.calendar-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
}

.calendar-header-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
}

.calendar-tabs {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.calendar-tab-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: none;
  background: #f3f4f6;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.calendar-tab-btn.active {
  background: #8b5cf6;
  color: white;
}

/* Calendar Grid */
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;
  padding: 16px;
  flex: 1;
  overflow-y: auto;
}

.calendar-day {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 8px;
  min-height: 100px;
  position: relative;
}

.calendar-day.today {
  background: #fef3c7;
  border-color: #f59e0b;
}

.day-number {
  font-weight: 600;
  color: #374151;
}

.day-event-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: var(--event-color, #8b5cf6);
  color: white;
  border-radius: 4px;
  font-size: 12px;
  margin-top: 4px;
  cursor: pointer;
  border: none;
  width: 100%;
  text-align: left;
}

/* To-Do Lists */
.todos-content {
  display: flex;
  gap: 16px;
  padding: 16px;
  flex: 1;
  overflow: hidden;
}

.todos-sidebar {
  width: 280px;
  border-right: 1px solid #e5e7eb;
  overflow-y: auto;
  padding-right: 16px;
}

.todo-list-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  margin-bottom: 8px;
  cursor: pointer;
  background: white;
  width: 100%;
  text-align: left;
}

.todo-list-item.active {
  background: #f3f4f6;
  border-color: #8b5cf6;
}

.todo-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-bottom: 1px solid #e5e7eb;
}

.todo-checkbox {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  color: #9ca3af;
}

.todo-checkbox.checked {
  color: #10b981;
}

.todo-text.completed {
  text-decoration: line-through;
  color: #9ca3af;
}

/* Forms */
.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  color: #374151;
}

.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
}

.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
}

.save-btn {
  padding: 10px 20px;
  background: #8b5cf6;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
}

.cancel-btn {
  padding: 10px 20px;
  background: #f3f4f6;
  color: #374151;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.delete-btn {
  padding: 10px 20px;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  margin-right: auto;
}

.calendar-add-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #8b5cf6;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
}
```

### Step 3: Start the Worker (for reminders)

Make sure the worker process is running:

```bash
npm run worker
```

### Step 4: Test It Out!

1. Open your app
2. Click the calendar button
3. Add an event
4. Create a to-do list
5. Add some tasks
6. Watch for real-time updates when your partner adds items!

## 📋 Checklist

- [ ] Import SharedCalendar component
- [ ] Add calendar button to UI
- [ ] Add CSS styles
- [ ] Test event creation
- [ ] Test to-do lists
- [ ] Verify real-time sync works
- [ ] Test reminders (set one for 15 min from now)
- [ ] Test on mobile/tablet screens

## 🎨 Customization

### Change Colors

Edit these CSS variables:
```css
/* Primary color */
.calendar-tab-btn.active { background: #your-color; }
.save-btn { background: #your-color; }
.calendar-add-btn { background: #your-color; }

/* Event category colors */
/* Modify EVENT_CATEGORIES in shared/calendar.js */
```

### Add More Event Categories

Edit `shared/calendar.js`:
```javascript
export const EVENT_CATEGORIES = Object.freeze({
  // Add your custom category
  custom_type: {
    id: 'custom_type',
    labelEn: 'Custom Type',
    labelMl: 'കസ്റ്റം തരം',
    icon: '🎨',
    color: '#your-color',
  },
  // ... existing categories
});
```

### Modify Reminder Times

Edit `shared/calendar.js`:
```javascript
export const REMINDER_OPTIONS = Object.freeze([
  // Add your custom reminder
  { value: 30, labelEn: '30 minutes before', labelMl: '30 മിനിറ്റ് മുമ്പ്' },
  // ... existing options
]);
```

## 🐛 Troubleshooting

### "Events not loading"
- Check browser console for errors
- Verify `conversationId` is correct
- Check network tab for failed API calls

### "Reminders not working"
- Ensure worker is running: `npm run worker`
- Check worker logs for errors
- Verify push notifications are configured

### "Real-time updates not working"
- Check socket connection in console
- Verify socket prop is passed to SharedCalendar
- Check for CORS issues

### "Calendar looks broken"
- Make sure CSS is imported/loaded
- Check for CSS conflicts with existing styles
- Inspect elements in browser dev tools

## 📱 Mobile Responsive

The calendar is designed to be responsive. For optimal mobile experience, consider:

```css
@media (max-width: 768px) {
  .calendar-modal {
    width: 100vw;
    height: 100vh;
    border-radius: 0;
  }
  
  .calendar-grid {
    gap: 4px;
  }
  
  .todos-content {
    flex-direction: column;
  }
  
  .todos-sidebar {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid #e5e7eb;
  }
}
```

## 🎯 Best Practices

1. **Keep event titles short** - They display in small calendar cells
2. **Use emojis** - They make events easier to spot
3. **Set reminders** - Don't miss important dates!
4. **Create themed lists** - "Weekly Goals", "Shopping", "Date Ideas"
5. **Mark tasks complete** - See progress and stay motivated
6. **Use recurring events** - For anniversaries and regular dates

## 💡 Pro Tips

- **Countdowns**: Events show countdown on calendar day (e.g., "in 3 days")
- **Real-time**: Changes appear instantly for both partners
- **Haptics**: Phone vibrates gently on interactions
- **Bilingual**: All text available in English and Malayalam
- **RSVPs**: Respond to events with "going", "maybe", or "excited"

## 📚 More Information

- Full documentation: `docs/SHARED_CALENDAR.md`
- Implementation details: `SHARED_CALENDAR_IMPLEMENTATION.md`
- API reference: `docs/API.md`

---

**Ready to go!** Your shared calendar feature is now live. Enjoy planning together! 💕
