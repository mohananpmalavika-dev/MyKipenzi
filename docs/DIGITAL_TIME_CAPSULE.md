# Digital Time Capsule (Love Letters for Future / ഭാവിയിലേക്കുള്ള പ്രണയലേഖനങ്ങൾ)

## Overview (അവലോകനം)
The **Digital Time Capsule** allows couples to seal heartfelt love letters, personalized voice notes, promises, and memorable photos locked until a specific future date and time (e.g. partner's 25th birthday 🎂, 1st anniversary 🥂, Valentine's Day 💖, New Year's midnight 🎆, or a custom future date ⏳).

---

## Key Highlights & Features (സവിശേഷതകൾ)

### 1. Secret Sealed Envelopes & Strict Privacy (രഹസ്യ മുദ്രയും സുരക്ഷയും)
- **Strict Server-Side Content Masking**:
  Before the designated `unlock_at` timestamp arrives, the server strictly conceals `letter_text`, `audio_url`, and `photo_url` from the recipient. Even if the recipient inspects browser devtools or WebSocket traffic, the contents cannot be previewed ahead of time.
- **Author Transparency**:
  The sender can always preview what they sealed, edit, or delete the capsule if needed.
- **Authentic Wax Seal Aesthetics**:
  Choose between 6 wax seal emblems:
  - ❤️ Heart (ഹൃദയം)
  - 💍 Sacred Promise Ring (മോതിരം)
  - 🌹 Red Rose (റോസ്)
  - ♾️ Infinite Love (അനന്ത പ്രണയം)
  - 👑 Royal Crown (കിരീടം)
  - 🗝️ Key to My Heart (ഹൃദയ താക്കോൽ)
- **4 Romantic Envelope Themes**:
  - 🌹 Royal Crimson Rose (രാജകീയ റോസ്)
  - 📜 Vintage Golden Parchment (വിന്റേജ് സുവർണ്ണ കത്ത്)
  - 🌙 Midnight Starlight (നക്ഷത്ര രാവ്)
  - 💜 Lavender Sunset (ലാവെൻഡർ സന്ധ്യ)

### 2. Live Romantic Countdown Tickers (തത്സമയ കൗണ്ട്ഡൗൺ)
- Live 1-second ticking countdown timers:
  `Days : Hours : Minutes : Seconds`
- Recipient can view the sealed envelope, the romantic occasion badge, the unlock date, and tap **"Tease / Nudge Partner ⏳"** to send an instant playful nudge.

### 3. Voice Notes for the Future (ഭാവിയിലേക്കുള്ള വോയ്സ് നോട്ടുകൾ 🎙️)
- Built-in microphone audio recorder with elapsed timer and waveform preview.
- Voice notes are preserved and revealed during the unlocking ceremony.
- Embedded audio player with Play/Pause, timeline scrubber, and sound wave animations.

### 4. Interactive Unlocking Ceremony (മുദ്ര പൊട്ടിക്കുന്ന ആഘോഷം 🔓✨)
- When `current_time >= unlock_at`, the capsule unlocks!
- **Wax Seal Breaking Animation**: Cracking seal with sparkles ✨ and smooth letter unfurling.
- **Parchment Display**: Calligraphic love letter formatting.
- **Photo Memories**: Embedded photo with memory caption.
- **Love Reactions Bar**: Tap romantic emojis (❤️, 🥺, 😭, 💍, 🫂, 💋) or write a heartfelt reply note.

### 5. Seamless Chat Feed Integration (ചാറ്റിലെ ഡിജിറ്റൽ കാർഡുകൾ)
- Share sealed or unlocked capsules into the conversation feed.
- Live interactive in-chat card:
  - If locked: Shows wax seal, occasion, and live countdown ticking inside chat!
  - If unlocked: Shows "Unlocked with Love! 💌" with one-tap opening button.
- Header & composer toolbar button `Gift ⏳` for instant access.

---

## Real-time Socket.IO Events

| Event Name | Direction | Description |
|---|---|---|
| `time_capsule:sealed` | Server → Recipient | Notifies partner when a new capsule is locked for them |
| `time_capsule:opened` | Server → Sender | Celebrates when recipient unlocks and reads the letter |
| `time_capsule:reaction` | Server → Room | Real-time emoji reaction and reply notes |
| `time_capsule:nudge` | Client ↔ Server | Playful tease when partner is counting down the seconds |
| `time_capsule:deleted` | Server → Room | Instantly updates when author deletes a capsule |

---

## Database Schema (`server/time-capsule-schema.sql`)
```sql
CREATE TABLE IF NOT EXISTS time_capsules (
  id uuid PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL CHECK(length(title) <= 250),
  occasion text NOT NULL DEFAULT 'anniversary',
  unlock_at timestamptz NOT NULL,
  theme text NOT NULL DEFAULT 'classic_rose',
  seal_symbol text NOT NULL DEFAULT 'heart',
  letter_text text CHECK(length(letter_text) <= 10000),
  audio_url text,
  photo_url text,
  status text NOT NULL DEFAULT 'sealed' CHECK(status IN ('sealed', 'opened')),
  opened_at timestamptz,
  reactions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```
