# Virtual Touch & Haptic Hug (Touch Presence) 🫂✨

> **തത്സമയ സ്പർശന സാമീപ്യം (Real-time Virtual Touch Presence & Haptic Hug)**  
> പങ്കാളി സ്ക്രീനിൽ തൊടുമ്പോൾ മറ്റേയാളുടെ ഫോണിൽ അതേ സ്ഥലത്ത് തിളങ്ങുന്ന പ്രകാശ വലയവും (glowing touch pulse) മൊബൈൽ വൈബ്രേഷനും (haptic feedback) തത്സമയം അനുഭവപ്പെടുന്നു.

---

## 🌟 Overview & Key Capabilities

1. **Normalized Real-time Touch Synchronization (`touch:pulse`)**:
   - Touch coordinates are mapped to normalized `(x: 0..1, y: 0..1)` space, ensuring precise alignment across devices of varying screen dimensions and aspect ratios.
   - Low latency WebSocket streaming for pointer events: `down`, `move`, `up`, and `hug`.

2. **Glowing Touch Pulse & Aura Effects**:
   - Concentric expanding radiant pulse rings (`.touch-glowing-pulse-ripple`) bloom wherever the partner touches.
   - Floating partner avatar badge displaying partner's profile photo and name.
   - Dynamic trailing stardust and romantic particles follow dragging fingers in real-time.

3. **Haptic Hug (സ്നേഹാലിംഗനം)**:
   - Holding down on the screen for > 700ms seamlessly activates a continuous, enveloping **Haptic Hug**.
   - Triggers deep crescendo vibration patterns (`navigator.vibrate([100, 60, 160, 70, 220, 80, 280, 90, 320])`) giving the physical sensation of an embrace tightening warmly.
   - Screen edges pulse with warm golden-rose amber aura (`.hugging-warm-aura`).
   - Real-time hug timer badge indicates mutual hug duration.

4. **Touch Resonance / Supernova Sync (സ്പർശന ലയം)**:
   - When both partners touch the screen in close proximity (< 22% screen distance) or both maintain a mutual hug, **Touch Resonance** is triggered.
   - A celestial laser bond links both fingertips, bursting into a supernova stardust particle display with harmonic Web Audio chime and synchronized vibration.

5. **4 Romantic Touch Modes**:
   - 🌸 **മൃദുസ്പർശം (Gentle Touch)**: Soft rose pink glow, gentle tap haptic pulse & bell chime.
   - 🫂 **സ്നേഹാലിംഗനം (Haptic Hug)**: Warm golden embrace, layered crescendo vibration waves & resonant hum.
   - ✨ **നക്ഷത്രസ്പർശം (Stardust Magic)**: Shimmering violet-cyan stars, stardust sparks & twinkling chime.
   - 🔥 **ഹൃദയാഗ്നി (Warm Passion)**: Ruby flame glow, rapid warm heart vibrations & deep throb.

6. **Interactive Chat Integration**:
   - **Chat Header Action**: Dedicated `HeartHandshake` action button in the chat header.
   - **Attachment Toolbar**: Quick-access touch button next to Live Heartbeat.
   - **Real-time Touch Invite Banner**: Displays when a partner starts touching, with a "Touch Back 🫂" one-tap join.
   - **Interactive Chat Message Card (`VirtualTouchCard`)**:
     - Custom cards e.g. `🫂 [Haptic Hug · സ്നേഹാലിംഗനം] എന്റെ സ്പർശനം നിന്റെ ചാരത്തുണ്ട് 💖`.
     - Tap **"Feel Touch (സ്പർശനം അനുഭവിക്കൂ)"** in chat to play the glowing pulse and feel the haptic vibration!

---

## 🏗 Architecture & Code Structure

| File | Purpose |
|---|---|
| [`src/touchAudio.js`](file:///c:/MyKipenzi/src/touchAudio.js) | Web Audio API synthesizer for melodic chimes, resonant hug hums, and `navigator.vibrate` haptic pattern engine. |
| [`src/VirtualTouchModal.jsx`](file:///c:/MyKipenzi/src/VirtualTouchModal.jsx) | Full-screen interactive touch canvas, pointer tracker, stardust particle engine, and hug duration manager. |
| [`server/index.js`](file:///c:/MyKipenzi/server/index.js) | Socket handlers for `touch:pulse`, `touch:invite`, and `touch:status`. |
| [`src/components.jsx`](file:///c:/MyKipenzi/src/components.jsx) | `VirtualTouchCard` interactive message component rendered inside the chat thread. |
| [`src/App.jsx`](file:///c:/MyKipenzi/src/App.jsx) | Header action button, bottom toolbar action, invite banner, and modal mounting. |
| [`src/styles.css`](file:///c:/MyKipenzi/src/styles.css) | Glassmorphic dark romantic theme, glowing concentric pulse rings, and responsive mobile adaptations. |
| [`tests/virtual-touch.test.js`](file:///c:/MyKipenzi/tests/virtual-touch.test.js) | Automated unit tests for audio fallbacks, haptic patterns, and message parsing. |
