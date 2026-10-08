# 🎬 Watch Party & Video Sync (വാച്ച് പാർട്ടി & വീഡിയോ സിങ്ക്)

> **യൂട്യൂബ് വീഡിയോകളോ ക്ലിപ്പുകളോ രണ്ടുപേർക്കും ഒന്നിച്ച് ഒരേ സമയം കണ്ട് ചാറ്റ് ചെയ്യാം.**  
> *Watch YouTube videos, romantic clips, or relaxing moments together in perfect real-time synchronization while chatting.*

---

## 🌟 Key Highlights & Features

### 1. 🍿 Real-Time Playback Synchronization (തത്സമയ സിൻക്രണൈസേഷൻ)
- **Synchronized Play & Pause**: When one partner hits play or pause, both players react instantly.
- **Micro-Drift Compensation**: Intelligent latency calculation (`calculateVideoDrift`) compensates for network delay (<0.45s) without stuttering or choppy playback.
- **Seek / Scrub Sync**: Scrubbing through the timeline seeks the exact frame on both partners' devices.
- **±10s Quick Jumps**: Dedicated buttons to quickly rewind or skip ahead 10 seconds together.
- **Partner Watching Indicator**: Real-time status badge showing `[Partner] watching with you 🍿`.
- **Force Re-sync Button**: Single tap to align playback if someone experiences a network hiccup.

### 2. 📺 YouTube URL Support & Curated Video Bank
- **Any YouTube Video Link**:
  - Supports standard YouTube URLs (`https://www.youtube.com/watch?v=...`), Shortened links (`https://youtu.be/...`), YouTube Shorts (`https://www.youtube.com/shorts/...`), and embed links.
  - Automatically extracts video ID and loads high-definition preview thumbnails.
- **Direct HTML5 Video Clips**:
  - Supports direct video URLs (MP4, WebM).
- **Curated Romantic Malayalam Songs & Chill Clips**:
  1. **മലരേ നിന്നെ കാണാതിരുന്നാൽ · പ്രേമം** (*Malare Ninne · Premam Classic*)
  2. **ആരാധികേ · അമ്പിളി റൊമാന്റിക് മെലഡി** (*Aaradhike · Ambili Soulful Melody*)
  3. **നീ ഹിമമഴയായ് · എടക്കാട് ബറ്റാലിയൻ** (*Nee Himamazhayayi · Pure Romance*)
  4. **മഴയേ തൂമഴയേ · പട്ടം പോലെ** (*Mazhaye Thoomazhaye · Rain of Love*)
  5. **കേരള കായലുകളും മഴയും · പ്രകൃതി സൗന്ദര്യം** (*Monsoon in Kerala Backwaters · Serene Vibes*)
  6. **കോസി ലോ-ഫൈ & മഴത്തുള്ളികൾ · റിലാക്സ്** (*Cozy Lofi Beats & Soft Rain · Night Chill*)

### 3. 💬 In-Cinema Live Chat & Quick Moments
- **Split Cinema & Chat View**:
  - Left pane: Immersive dark cinema theater screen with full playback controls.
  - Right pane: Dedicated Live Chat and Playlist selector tabs.
- **Quick Reaction Pills**:
  - One-tap sweet Malayalam & English couple comments:
    - *"ഇത് എത്ര മനോഹരമാണ്! 😍 (This scene is so beautiful!)"*
    - *"നമ്മുടെ പ്രിയപ്പെട്ട രംഗം! ❤️ (Our favorite part!)"*
    - *"ഒരു പോപ്കോൺ ബ്രേക്ക് എടുക്കാം 🍿 (Quick popcorn snack break!)"*
    - *"നിന്നെ ഒരുപാട് മിസ് ചെയ്യുന്നു ഇവിടെ 🤍 (Missing you right now 🤍)"*
    - *"ഹഹഹ, ഇത് വീണ്ടും കാണണം! 😂 (Rewinding this, hilarious!)"*
- **Full Text Chat**: Type custom messages and reactions directly inside the player; messages persist in the conversation thread.

### 4. ✨ Floating Reaction Particles
- Tap floating reaction emojis (`🍿`, `❤️`, `🥺`, `😂`, `✨`, `🥂`, `🥰`, `👏`) to burst animated particles that float upward across the video screen on both devices!
- Partner receives a gentle haptic touch and toast notification.

### 5. 📱 Docked Mini Player & PiP Mode
- **Minimize to Chat**: Tap minimize to keep the synchronized video playing in a sleek docked bar above the chat input while browsing messages or scrolling past memories.
- **Instant Expand**: Tap anywhere on the mini player to reopen the full cinema screen.

### 6. 💌 Chat Card Sharing & Invites
- **"Send Video Card to Chat (ചാറ്റിലേക്ക് ഷെയർ ചെയ്യാം)"**:
  - Embeds an interactive movie ticket card `[Watch Party · Title (Source)] Note` directly in the chat thread.
  - Partner can tap **"Watch Together (ഒന്നിച്ച് കാണാം 🍿)"** anytime to jump straight into synced watching.
- **Instant Watch Invite Banner**:
  - When partner opens a video, a glowing top banner invites you:  
    `🎬 [Partner] invited you to a Watch Party! (ഒന്നിച്ച് വീഡിയോ കാണാം 🍿)` with a single-tap `Join Watch Party 🍿` button.

---

## 🛠️ Technical Architecture

### 1. Engine & Utilities (`src/videoEngine.js`)
- `extractYouTubeId(urlOrId)`: Comprehensive regex parser for all YouTube URL variants.
- `getYouTubeThumbnail(videoId)`: HQ thumbnail generator.
- `calculateVideoDrift(localPos, remotePos, remoteTimestamp)`: Mathematical drift correction considering network round-trip time.
- `formatSharedWatchPartyMessage(video, note)` & `parseSharedWatchPartyMessage(text)`: Message serialization.

### 2. UI Component Suite (`src/WatchParty.jsx`)
- `<WatchPartyModal />`: Main cinema modal with YouTube IFrame Player API postMessage integration.
- `<WatchPartyMiniPlayer />`: Docked mini player above the chat composer.
- `<WatchPartyCallDock />`: In-call companion dock for voice/video calls.

### 3. Server WebSocket Event Handlers (`server/index.js`)
- `video:sync`: Broadcasts playback actions (`play`, `pause`, `seek`, `change_video`, `quick_comment`) to conversation members.
- `video:invite`: Broadcasts invitations when a user starts watching.
- `video:reaction`: Broadcasts floating reaction emoji bursts.
- `video:status`: Broadcasts presence states (`active: true/false`).

---

## 🧪 Verification
- Unit test suite in `tests/watch-party.test.js`:
  - 6 unit test suites covering URL parsing, thumbnails, drift calculation, message serialization, and video collections.
  - All 51 total project tests passing.
  - Vite production build successfully validated.
