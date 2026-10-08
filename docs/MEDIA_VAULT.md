# Shared Media Vault & Private Scrapbook (പോളറോയ്ഡ് പ്രണയ ആൽബം)

## Overview (ആമുഖം)
The **Shared Media Vault / Private Scrapbook** is a dedicated, intimate gallery for couples that curates only the photos and videos exchanged in chat into an authentic, nostalgic **Polaroid album**.

It strips away general files, audio notes, and stickers, transforming shared media into a rich love keepsake collection featuring vintage washi tapes, handwritten captions, chronological month groupings, memory statistics, and multiple album viewing modes.

---

## Key Features (പ്രധാന സവിശേഷതകൾ)

### 1. Authentic Polaroid Aesthetic (പോളറോയ്ഡ് ഡിസൈൻ)
- **Natural Polaroid Mount**: Classic white glossy photographic border, deep photo recess, and a thick bottom chin with handwritten/script captions.
- **Deterministic Subtle Tilt**: Real snapshots tilted on a scrapbook table (`-2.8°` to `+2.8°`) using deterministic hashing based on message ID.
- **Washi Tape & Corner Stickers**: Colorful tape strips (`tape-rose`, `tape-lavender`, `tape-gold`, `tape-mint`, `tape-kraft`) and romantic sticker badges (`❤️`, `✨`, `🌸`, `🧸`, etc.).
- **Interactive Lift Animation**: Hovering or focusing smoothly straightens, elevates with an ambient drop shadow, and reveals quick action controls.

### 2. Multi-Mode Album Presentation (ആൽബം കാഴ്ച്ചാ രീതികൾ)
- **Scrapbook Wall / Grid (സ്ക്രാപ്പ്ബുക്ക് ഗ്രിഡ്)**: Floating Polaroid snapshots organized chronologically with pins, month dividers, and memory counts.
- **Storybook Flipbook / Slideshow (ഫ്ലിപ്പ് ബുക്ക് 📖)**: Interactive full-page turn experience allowing lovers to browse memory-by-memory with smooth navigation and progress indicator.
- **Polaroid Focus Lightbox (ഫോക്കസ് മോഡ്)**: Enlarged high-definition photo/video playback with complete metadata, timestamps, original file download, and direct chat actions.

### 3. Smart Filtering & Scrapbook Metrics (ഫിൽട്ടറുകളും സ്ഥിതിവിവരക്കണക്കുകളും)
- **Media Type Filtering**:
  - `All (എല്ലാം)`
  - `Photos (ഫോട്ടോകൾ 📸)`
  - `Videos (വീഡിയോകൾ 🎥)`
  - `Starred / Favorites (പ്രിയപ്പെട്ടവ ⭐)`
- **Sender Filtering**:
  - `Both` / `By Me (ഞാൻ)` / `By Partner (പങ്കാളി)`
- **Live Search**:
  - Instant search across captions, note texts, filenames, and sender names.
- **Album Metrics Bar**:
  - Total memories count, photo count, video count, and "First captured" milestone date.
- **5 Scrapbook Background Themes**:
  - Wooden Desk (`തടി മേശ 🪵`)
  - Blush Linen (`റോസ് ലിനൻ 🌸`)
  - Memory Corkboard (`ഓർമ്മ ബോർഡ് 📌`)
  - Vintage Parchment (`വിന്റേജ് പേപ്പർ 📜`)
  - Starry Twilight (`നക്ഷത്ര രാവ് 🌌`)

### 4. Seamless Chat Integration (ചാറ്റുമായി സംയോജനം)
- **Jump to Chat ("View in Chat" / ചാറ്റിൽ കാണുക)**: Instant scroll & glow highlight directly on the original message inside the conversation.
- **Share Memory Card to Chat (ഓർമ്മ കാർഡ് പങ്കിടുക)**: Send nostalgic formatted Polaroid memory cards back into chat.
- **Chat Header Button**: Directly accessible from the conversation top bar (`<Camera size={20} />`).
- **Chat Library Shortcut**: Tap "Open in Polaroid Scrapbook" when browsing photos or media in Chat Library.

---

## Technical Architecture

### 1. Core Logic & Helpers (`shared/mediaVault.js`)
- `isVaultMedia(attachment)`: Validates that media is photo or video, rejecting stickers, voice notes, non-media documents, and view-once media.
- `getMediaType(attachment)`: Distinguishes `'photo'` vs `'video'`.
- `getPolaroidRotation(seed)`: Calculates stable tilt angle.
- `formatPolaroidDate(date, language)`: Formats dates into Malayalam and English month/time strings.
- `calculateVaultStats(messages)`: Computes photo, video, sender, and timeline range metrics.
- `groupMemoriesByMonth(messages)`: Groups items into chronological `YYYY-MM` buckets.
- `filterVaultItems(messages, options)`: Pure filtering pipeline.
- `formatPolaroidShareCard(item, senderName)`: Serializes shared memory cards.

### 2. Backend API Endpoint (`server/app.js`)
- **Route**: `GET /api/conversations/:id/vault`
- **Security**: Verifies conversation membership.
- **Database Query**: Filters non-deleted, non-expired, non-view-once messages with photo/video attachments, excluding stickers and voice-notes.
- **Response**:
  ```json
  {
    "messages": [...],
    "has_more": false,
    "stats": {
      "total": 12,
      "photos": 10,
      "videos": 2,
      "oldest_date": "2026-09-01T10:00:00Z",
      "newest_date": "2026-10-09T18:00:00Z"
    }
  }
  ```

### 3. Frontend Component (`src/MediaVault.jsx`)
- Full React modal with lazy blob loading, keyboard arrow navigation, double-click love hearts, theme switcher, and responsive mobile adaptations.

### 4. Styling (`src/styles.css`)
- Custom CSS classes: `.media-vault-overlay`, `.polaroid-snapshot-card`, `.polaroid-washi-tape`, `.flipbook-stage`, `.vault-lightbox-modal`, and theme gradients.

---

## Verification
- Unit test suite: `tests/media-vault.test.js` (10 passing tests)
- ESLint: 0 errors, 0 warnings
- Vite production build: Succeeded with exit code 0
