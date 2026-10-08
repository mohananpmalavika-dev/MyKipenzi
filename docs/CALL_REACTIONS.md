# ✨ In-Call Live Floating Reactions (വീഡിയോ കോൾ ലൈവ് റിയാക്ഷനുകൾ)

## Overview
**In-Call Live Floating Reactions** enables partners to express spontaneous affection during video and audio calls with real-time floating hearts, roses, kisses, and romantic particles flying across the call screen.

---

## Key Capabilities

1. **Floating Reaction Dock (`CallReactionOverlay`)**:
   - Sleek glassmorphic floating action dock docked directly on the video call stage.
   - Quick one-tap reaction pills:
     - ❤️ **Hearts (ഹാർട്ടുകൾ)**: Stream of romantic hearts (❤️, 💖, 💕, 💗, 💓, 🤍, 🫶) floating gracefully upward.
     - 🌹 **Roses (റോസാപ്പൂക്കൾ)**: Crimson and blossom roses (🌹, 🥀, 🌸, 🌺, 🌷) with 3D twisting flutter and swaying petals.
     - 😘 **Kisses (ചുംബനങ്ങൾ)**: Flying kisses and lip marks (💋, 😘, 😚, 🌸) expanding with romantic ripples.
     - 💖 **Love Pulse (സ്പന്ദനം)**: Glowing heartbeat pulse radiating outward.
     - 🌸 **Blossom (പൂമഴ)**: Romantic floral rain drifting gently across the screen.
     - 🔥 **Fire (തീക്ഷ്ണ പ്രണയം)**: Passionate burning flame hearts (🔥, ❤️‍🔥).
     - 🫂 **Warm Hug (ആലിംഗനം)**: Cozy hug glow with comforting aura rings.
     - 🎉 **Celebration (ആഘോഷം)**: Festive confetti and sparkles.

2. **Interactive Tap & Combo Burst**:
   - **Tap Anywhere on Video**: Tapping directly on the video call stream spawns floating hearts or roses directly from the tap coordinate.
   - **Rapid Combo Multiplier**: Consecutive taps trigger combos (`x2`, `x3`, `x5`, `x10`!) with escalating particle cascades and dynamic combo badges (`🔥 x5 Combo!`).

3. **Real-time Partner Sync**:
   - WebSocket event: `call:reaction` forwards reactions instantaneously to the call peer.
   - Live Notification Toast: Peer receives a romantic floating pill banner:
     - `"മാളവിക റോസ് ഗാർഡൻ 🌹 അയച്ചു! (x3)"` / `"Dhanya sent Rose Garden! 🌹 (x3)"`
   - Gentle haptic feedback via `navigator.vibrate`.

4. **Harmonic Audio Synthesis**:
   - Web Audio API synthesizes pleasant, harmonic chimes (harp arpeggios for hearts, crystalline wind chimes for roses, playful pops for kisses).
   - In-dock mute toggle button (`🔔` / `🔇`) to mute/unmute reaction sounds at any time.

---

## File Architecture
- `src/callReactions.js`: Reaction configuration, particle physics generator, Web Audio synthesis, and haptics.
- `src/CallReactionOverlay.jsx`: Interactive in-call floating UI dock, canvas particle layer, combo tracker, and socket synchronizer.
- `src/components.jsx`: Embedded `<CallReactionOverlay>` inside `<CallOverlay>`.
- `server/index.js`: Socket handler for `call:reaction` with rate limiting and caller/callee validation.
- `src/styles.css`: Keyframe animations for particle trajectories, 3D rose petal rotation, glassmorphism, and responsive mobile adaptations.
- `tests/call-reactions.test.js`: Comprehensive test suite validating configurations, translations, particle generation, notices, and audio execution.
