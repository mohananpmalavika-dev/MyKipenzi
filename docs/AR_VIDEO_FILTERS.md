# AR Video Filters & Virtual Backgrounds (വെബ്ആർടിസി കോളുകളിലെ AR ഫിൽട്ടറുകൾ)

## Overview
MyKipenzi includes real-time **AR Face & Camera Filters**, **Procedural Virtual Backgrounds**, and **Portrait Bokeh Blur** for WebRTC video calls. Both call participants can experience live dynamic camera effects transmitted directly through the peer-to-peer WebRTC video stream.

---

## ✨ Features

### 1. 💖 Romantic & Cute AR (റൊമാന്റിക് & ക്യൂട്ട് ഫിൽട്ടറുകൾ)
- **Love Halo & Floating Hearts (ലവ് ഹാലോ & ഹൃദയങ്ങൾ)**: Glowing celestial golden/pink halo floating above the head with breathing glow, orbiting animated 3D love hearts, and soft rosy cheek blush.
- **Rose Crown & Petals (റോസ് കിരീടവും പൂവിതളുകളും)**: Beautiful wreath of blooming crimson and pink roses with emerald leaves resting on the head, accompanied by gracefully fluttering rose petals.
- **Fairy Sparkles & Glow (മാന്ത്രിക തിളക്കവും ഗ്ലോയും)**: Twinkling golden fairy dust, celestial 4-point star sparkles, and ethereal cheek radiance.
- **Sakura Petal Breeze (ചെറി പൂക്കളുടെ വസന്തം)**: Arching cherry blossom branches in the upper camera corners with delicate pink sakura petals swirling downwards.

### 2. 🐱 Fun & Playful AR (ഫണ്ണി & കുസൃതി ഫിൽട്ടറുകൾ)
- **Cute Kitten Ears & Whiskers (ക്യൂട്ട് പൂച്ചക്കുട്ടി)**: Animated twitching pink cat ears on head, pink heart nose button, and sweet whiskers on both cheeks.
- **Playful Puppy Ears (കുസൃതി നായക്കുട്ടി)**: Floppy brown puppy ears with gentle head bounce physics, shiny black button nose, and cheerful tongue.
- **Retro Neon Shades (കൂൾ നിയോൺ സൺഗ്ലാസ്)**: Dark sunglasses with electric cyan/magenta lens reflection, gold rims, and periodic lens glint sparkles.
- **Vintage Mustache & Spectacles (തമാശ മീശയും കണ്ണടയും)**: Big curly handlebar vintage gentleman mustache and round spectacles.
- **Party Hat & Confetti (പാർട്ടി തൊപ്പിയും കോൺഫെറ്റിയും)**: Festive striped cone party hat with yellow pompom, accompanied by continuous colorful confetti ribbons, spirals, and stars.

### 3. 🌆 Virtual Backgrounds & Portrait Blur (വെർച്വൽ പശ്ചാത്തലങ്ങൾ)
- **Studio Portrait Blur (പോർട്രെയിറ്റ് ബൊക്കെ ബ്ലർ)**: Professional DSLR studio portrait depth-of-field bokeh blur keeping the caller crisp in foreground while smoothing background clutter. Adjustable blur slider (`6px` - `28px`).
- **Romantic Sunset Beach (റൊമാന്റിക് സൺസെറ്റ് ബീച്ച്)**: Golden-hour twilight beach horizon with serene sunset sky, ocean reflections, and gentle evening glow.
- **Candlelight Dinner (ക്യാൻഡിൽലൈറ്റ് ഡിന്നർ)**: Intimate warm candle glow, mahogany ambient lighting, and romantic bokeh light orbs.
- **Cozy Parisian Cafe (കോസി പാരീസിയൻ കഫേ)**: Warm cafe interior backdrop with gentle fairy light garlands.
- **Starry Milky Way (നക്ഷത്ര തിളക്കമുള്ള ആകാശം)**: Deep cosmic indigo night sky with glowing crescent moon and twinkling stars.
- **Zen Cherry Garden (ശാന്തമായ ചെറി ഗാർഡൻ)**: Japanese wooden veranda overlooking pink blooming cherry blossom trees.
- **Cozy Lo-Fi Room (ലോ-ഫൈ ബെഡ്‌റൂം)**: Fairy string lights, purple-pink neon glow, and cozy bedroom atmosphere.
- **Kipenzi Emerald Studio (എമറാൾഡ് സ്റ്റുഡിയോ ഡ്രോപ്പ്)**: Signature luxury dark emerald studio backdrop with golden ambient lighting.

### 4. 🎨 Cinematic Color Moods (കളർ മൂഡുകൾ)
- **Golden Hour Warmth (സുവർണ്ണ സായാഹ്നം)**: Warm amber sunlit radiance.
- **90s Nostalgic Film (90s വിന്റേജ് ഫിലിം)**: 35mm grain, vintage sepia tone, and retro film border.
- **Cyberpunk Neon Vibe (സൈബർപങ്ക് നിയോൺ)**: Electric synthwave duo-tone lighting.
- **Dreamy Pastel Mist (ഡ്രീമി പാസ്റ്റൽ മിസ്റ്റ്)**: Soft ethereal focus and pearlescent illumination.

---

## 🛠️ Architecture & WebRTC Integration

1. **`src/arVideoFilters.js`**:
   - `AR_FILTERS` catalog with categories, Malayalam & English metadata, and audio presets.
   - `playFilterSoundEffect(type)`: Web Audio API procedural sound synthesizer (sparkle chime, cat meow, camera shutter, fanfare).
   - `ARVideoProcessor`: Real-time 30 FPS Canvas rendering loop.
     - Blends raw video stream with soft portrait vignette masks for bokeh blur and virtual background backdrops.
     - Animates dynamic particle systems (hearts, petals, stars, confetti).
     - Renders procedural AR stickers (ears, halos, sunglasses, mustaches).
     - `canvas.captureStream(30)` generates processed `MediaStream`.

2. **WebRTC Track Replacement (`src/useCall.js`)**:
   - `replaceVideoTrack(track)`: Uses `RTCRtpSender.replaceTrack()` to seamlessly substitute the camera track with the canvas AR stream without renegotiation or call interruption.
   - When switching back to "Normal Camera", original camera track is automatically restored.
   - `updateLocalStream(stream)`: Updates local preview so the user sees their own active filter.

3. **In-Call Controls & Studio Drawer (`src/ARFilterStudio.jsx` & `src/components.jsx`)**:
   - Sparkles button (`✨`) in call control toolbar during video calls.
   - Category switcher tabs with responsive grid layout.
   - Active filter indicator badge pill on the top of the video stage with one-click clear button (`✕`).
   - 📸 **"Snap Photo" Camera**: 3-second animated countdown, camera flash overlay, shutter sound, and instant snapshot modal (Download PNG / Send to Chat).
