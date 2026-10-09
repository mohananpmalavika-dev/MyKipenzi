# Wellness Features Quick Start Guide 🚀

Get started with Partner Care Reminders, Period Tracker, and Stress Relief features in 5 minutes!

## 🎯 Quick Setup

### Step 1: Database Setup (1 minute)

```bash
# Run the wellness schema
psql -U postgres -d mykinpenzi < server/wellness-schema.sql
```

### Step 2: Server Already Configured ✅

The wellness API routes are already integrated in `server/app.js`:
```javascript
import wellnessRouter from './wellness.js';
app.use('/api/wellness', wellnessRouter);
```

### Step 3: Add to Your Frontend (2 minutes)

```jsx
// In your main App.jsx or routing file
import PartnerCareReminders from './PartnerCareReminders';
import PeriodTracker from './PeriodTracker';
import StressReliefMeditation from './StressReliefMeditation';

// Add routes
<Route path="/wellness/care" element={
  <PartnerCareReminders 
    currentUserId={currentUser.id}
    partnerId={partner.id}
    language="en" // or "ml" for Malayalam
  />
} />

<Route path="/wellness/period" element={
  <PeriodTracker
    currentUserId={currentUser.id}
    partnerId={partner.id}
    language="en"
  />
} />

<Route path="/wellness/stress" element={
  <StressReliefMeditation
    currentUserId={currentUser.id}
    partnerId={partner.id}
    language="en"
  />
} />
```

### Step 4: Add Navigation (1 minute)

```jsx
// Add to your navigation menu
import { Bell, Heart, Wind } from 'lucide-react';

<nav>
  <NavLink to="/wellness/care">
    <Bell size={20} />
    Care Reminders
  </NavLink>
  <NavLink to="/wellness/period">
    <Heart size={20} />
    Period Tracker
  </NavLink>
  <NavLink to="/wellness/stress">
    <Wind size={20} />
    Stress Relief
  </NavLink>
</nav>
```

## ✨ Feature Highlights

### Partner Care Reminders 💊
**"Did you eat?" "Take your medicine" "Drink water"**

- Set caring reminders for your partner
- 7 built-in reminder types
- Bilingual support (English/Malayalam)
- Track completion and habits

### Period Tracker 🩷
**Private tracking with optional partner support**

- Calendar view with predictions
- Daily symptom logging
- Partner hints (when enabled)
- Privacy-first design

### Stress Relief & Meditation 🧘
**Find calm together**

- 5 meditation templates
- Synchronized breathing exercises
- Stress tracking
- Gratitude journal

## 📱 Quick User Flows

### Create a Care Reminder
1. Navigate to `/wellness/care`
2. Click "Create New"
3. Select reminder type (e.g., "Did you eat?")
4. Set time (e.g., 12:00 PM)
5. Choose days (weekdays)
6. Save!

### Track a Period Cycle
1. Navigate to `/wellness/period`
2. Click "Start New Cycle"
3. Select start date
4. Choose flow intensity
5. Save!

### Start a Meditation
1. Navigate to `/wellness/stress`
2. Click "Meditate"
3. Choose template
4. Click "Start Session"
5. Relax! 🧘

## 🔧 Testing

### Test API Endpoints

```bash
# Get reminder types (no auth required for types)
curl http://localhost:3000/api/wellness/care-reminders/types

# Get motivational quote
curl http://localhost:3000/api/wellness/motivational-quote

# With authentication (replace with your session cookie)
curl -H "Cookie: session=YOUR_SESSION" \
  http://localhost:3000/api/wellness/period/settings

# Create a reminder (with auth)
curl -X POST \
  -H "Cookie: session=YOUR_SESSION" \
  -H "Content-Type: application/json" \
  -d '{
    "recipientId": 2,
    "reminderTypeId": 1,
    "scheduledTime": "12:00",
    "daysOfWeek": [1,2,3,4,5]
  }' \
  http://localhost:3000/api/wellness/care-reminders
```

## 🎨 Styling

The components include embedded CSS-in-JS styling. Color scheme uses CSS custom properties:

```css
:root {
  --primary: #your-primary-color;
  --surface: #your-surface-color;
  --text: #your-text-color;
  --border: #your-border-color;
  --hover: #your-hover-color;
}
```

Wellness-specific colors:
- Care Reminders: Purple/Blue gradient
- Period Tracker: Pink (#e91e63)
- Stress Relief: Purple (#9c27b0)

## 🌍 Language Support

Both English and Malayalam are supported:

```jsx
// English (default)
<PartnerCareReminders language="en" ... />

// Malayalam
<PartnerCareReminders language="ml" ... />
```

## 🔐 Privacy Notes

- **Period Tracker**: Private by default. Sharing requires explicit opt-in.
- **Care Reminders**: Visible to creator and recipient only.
- **Stress Relief**: Gratitude sharing is optional per entry.

## 📊 Sample Data

The schema includes sample data:
- 7 reminder types
- 5 motivational quotes
- 5 meditation templates
- 6 ambient sounds
- Period partner hints for all phases

## 🐛 Common Issues

**Can't create reminders?**
- Ensure both users are in a conversation
- Check recipient ID is valid

**Period predictions not working?**
- Track at least 3 complete cycles
- Ensure end dates are logged

**Partner hints not showing?**
- Enable "Share with Partner" in settings
- Enable "Partner Hints" toggle

## 📚 Full Documentation

For complete API reference, database schema, and advanced features:
- [Full Documentation](./docs/WELLNESS_CARE_FEATURES.md)

## 🚀 Next Steps

1. ✅ Set up database schema
2. ✅ Verify API routes working
3. ✅ Add components to frontend
4. ✅ Add navigation
5. ⬜ Customize styling
6. ⬜ Add notifications (optional)
7. ⬜ Test with users

## 💡 Tips

- Start with Care Reminders (easiest to demonstrate)
- Period Tracker requires privacy discussion with users
- Stress Relief works great for onboarding demo
- Use bilingual support to reach wider audience

## 🎉 You're Ready!

The wellness features are now integrated and ready to use. Start by navigating to `/wellness/care` and create your first caring reminder!

---

**Need Help?** Check the [full documentation](./docs/WELLNESS_CARE_FEATURES.md) or review the component source code.
