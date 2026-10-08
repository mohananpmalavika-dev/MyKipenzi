# Relationship Timeline & Milestone Counter ("Our Story" / "നമ്മുടെ കഥ")

## 🌟 Overview
The **Relationship Timeline & Milestone Counter ("Our Story")** provides couples with an intimate, interactive sanctuary to celebrate their journey together:
1. **Days Together Counter (ഒരുമിച്ചുള്ള ദിവസങ്ങളുടെ എണ്ണം)**:
   - Calculates total days since the relationship began (e.g. `Together for 365 Days` / `ഒരുമിച്ച് 365 ദിവസങ്ങൾ`).
   - Displays exact duration breakdowns (Years, Months, Days).
   - Milestone progression tracker towards round milestones (100, 200, 365, 500, 1000 days) with progress bars and badges.
2. **Milestone Countdowns (വിശേഷ ദിവസങ്ങളുടെ Countdown)**:
   - Live ticker with Days, Hours, Minutes, and Seconds remaining.
   - Handles annual recurring milestones (e.g., Anniversary / വിവാഹവാർഷികം, First Date / ആദ്യ കൂടിക്കാഴ്ച, Partner's Birthday).
   - Custom couple milestones (e.g., trips, vacations, proposals).
   - Celebration banner when today is the milestone date with confetti effects!
3. **Interactive Memories Timeline (പ്രധാനപ്പെട്ട ഓർമ്മകൾ തീയതി പ്രകാരം)**:
   - Chronological vertical timeline connecting key moments from First "Hi", First Date, Proposal, Special trips, to photo memories.
   - Photo upload and lightbox enlarged viewer.
   - Interactive emoji reactions (`❤️`, `🥰`, `🥺`, `💖`, `✨`, `💍`).
   - "Share to Chat" button to post rich memory cards directly into the conversation.
4. **Real-Time Sync & Love Nudge**:
   - `story:update` and `story:nudge` socket events to sync timeline changes and remind partners to view their shared journey.

---

## 🗄️ Database Architecture

### `relationship_profiles`
- `conversation_id`: UUID (Primary Key, foreign key to conversations)
- `start_date`: DATE (Relationship start date)
- `anniversary_date`: DATE (Annual anniversary)
- `first_date`: DATE (First in-person date)
- `story_title`: TEXT (Default 'Our Story')
- `cover_photo`: TEXT (Optional cover image URL)
- `updated_at`: TIMESTAMPTZ

### `relationship_memories`
- `id`: UUID (Primary Key)
- `conversation_id`: UUID (Foreign Key to conversations)
- `user_id`: UUID (Author of memory)
- `title`: TEXT (Memory title, max 200 chars)
- `memory_date`: DATE (When the moment happened)
- `category`: TEXT (`first_chat`, `first_date`, `proposal`, `official_start`, `anniversary`, `trip`, `photo_memory`, `sweet_moment`)
- `description`: TEXT (Caption/story text, max 3000 chars)
- `photo_url`: TEXT (Image URL or data URI)
- `emoji`: TEXT (Icon badge)
- `reactions`: JSONB (Array of emoji reactions)
- `created_at`: TIMESTAMPTZ

### `relationship_milestones`
- `id`: UUID (Primary Key)
- `conversation_id`: UUID (Foreign Key to conversations)
- `user_id`: UUID (Author of milestone)
- `title`: TEXT (Milestone title)
- `target_date`: DATE (Target celebration date)
- `category`: TEXT (`anniversary`, `first_date`, `trip`, `birthday`, `milestone`)
- `is_annual`: BOOLEAN (Whether event repeats every year)
- `emoji`: TEXT (Icon badge)
- `note`: TEXT (Sweet note)
- `created_at`: TIMESTAMPTZ

---

## 🚀 API Endpoints

- `GET /api/conversations/:id/relationship-story`: Fetch relationship profile, days together calculation, milestones with countdowns, and timeline memories. Auto-seeds defaults if not configured.
- `PUT /api/conversations/:id/relationship-story/profile`: Update start date, anniversary date, first date, or story title.
- `POST /api/conversations/:id/relationship-story/memories`: Add a new memory to the timeline.
- `DELETE /api/conversations/:id/relationship-story/memories/:memoryId`: Remove a memory.
- `POST /api/conversations/:id/relationship-story/memories/:memoryId/react`: Toggle emoji reaction on a memory.
- `POST /api/conversations/:id/relationship-story/milestones`: Add a countdown milestone.
- `DELETE /api/conversations/:id/relationship-story/milestones/:milestoneId`: Delete a milestone.

---

## 💬 In-Chat Cards
- `[OUR_STORY_MEMORY]`: Renders `<StoryMemoryCard>` in chat with date, category pill, description, photo preview, and "View in Our Story" button.
- `[OUR_STORY_MILESTONE]`: Renders `<StoryMilestoneCard>` in chat with days together, target date, remaining countdown, and "Open Countdown" button.
