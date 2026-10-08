# 🎭 Fun Voice Filters for Voice Notes (വോയ്സ് നോട്ട് ശബ്ദ ഇഫക്റ്റുകൾ)

## Overview
MyKipenzi introduces **Fun Voice Filters for Voice Notes**, allowing partners and friends to transform their recorded voice notes into playful, cute, romantic, or dramatic audio messages before sending. All audio signal transformations are processed 100% on the client device using the **Web Audio API** and encoded into high-fidelity standard **16-bit PCM RIFF WAV** audio, ensuring instant previews, zero latency, and universal cross-device playback compatibility.

---

## 🎨 Supported Voice Filters

| Filter ID | Icon | English Name | Malayalam Name | Effect / DSP Characteristics |
| :--- | :---: | :--- | :--- | :--- |
| `normal` | 🎙️ | **Original** | **സാധാരണ ശബ്ദം** | Natural, authentic voice with untouched acoustics. |
| `cute` | 🐿️ | **Cute Chipmunk** | **ക്യൂട്ട് ചിപ്‌മങ്ക്** | Resampled playback rate (1.36x) + 240Hz high-pass rumble filter + 1600Hz presence peak (+4dB) + 3500Hz high-shelf sparkle (+6dB). Creates an irresistibly sweet, high-pitched cartoon chipmunk tone. |
| `romantic_echo`| ✨ | **Romantic Echo** | **റൊമാന്റിക് എക്കോ** | Dreamy 220ms tender stereo delay + 32% analog tape feedback + warm 380Hz low-mid boost (+3.5dB) + soft 7500Hz low-pass smoother + synthetic stereo convolution reverb (1.4s decay). Gives voice notes a romantic, intimate whisper atmosphere. |
| `deep` | 🦁 | **Deep Voice** | **ഡീപ് വോയ്സ്** | Resampled playback rate (0.78x) + 175Hz low-shelf bass boost (+7.5dB) + 2800Hz sibilance taming (-3dB) + soft tanh saturation overdrive. Produces a commanding, rich, and sultry cinematic baritone. |
| `walkie_talkie`| 📻 | **Walkie-Talkie** | **വാക്കി-ടോക്കി** | 480Hz high-pass + 2800Hz low-pass telephone bandpass + 1600Hz horn resonance (+6dB) + analog overdrive clipping + authentic dual-tone 1050Hz/1550Hz "Roger Beep" at the conclusion of transmission. |

---

## 🛠️ Architecture & DSP Pipeline

### 1. `src/voiceFilters.js`
- **Metadata Registry**: Central definition of `VOICE_FILTERS` with English and Malayalam translations, descriptions, icons, and theme gradients.
- **Audio Processing (`applyVoiceFilter`)**: Runs within an `OfflineAudioContext`, constructing dedicated audio node graphs (BiquadFilters, Delays, Convolvers, WaveShapers, Oscillators).
- **Binary Encoder (`audioBufferToWav`)**: Encodes `AudioBuffer` directly into a 44-byte standard RIFF WAVE header with interleaved 16-bit PCM channels.
- **Detector (`detectVoiceFilterFromFilename`)**: Detects filter signatures (`voice-note-<filter>-<timestamp>.wav`) from incoming message attachments.

### 2. `src/VoiceFilterStudio.jsx`
- **Interactive Preview Studio**:
  - Live preview audio player with play/pause, time tracker, and seek slider.
  - 16-band animated EQ waveform that reacts dynamically during preview playback.
  - 5-filter horizontal carousel with glowing active badges and Malayalam descriptions.
  - Re-record, discard, and "Send with [Filter] [Icon]" buttons.

### 3. Composer Integration (`src/App.jsx`)
- **Quick Preset Selector**: 🎭 button next to the recording microphone opens a popover to pre-select a filter prior to recording.
- **Recording Indicator**: Shows active filter tag during recording (e.g. `Recording · 5s [✨ Romantic Echo]`).
- **Immediate Studio Transition**: When recording stops, `VoiceFilterStudio` appears for instant review, filter switching, and sending.

### 4. Message Bubble Presentation (`src/components.jsx` & `src/styles.css`)
- **Voice Filter Badge**: Audio notes in the chat display a stylish gradient pill identifying the filter used (e.g. `✨ Romantic Echo (റൊമാന്റിക് എക്കോ)`).
- **Download Card**: Clearly identifies the voice note with its filter name and emoji.

---

## 🧪 Automated Test Verification

Unit tests in `tests/voice-filters.test.js`:
- Verified all 5 filters have valid English and Malayalam metadata.
- Verified `formatVoiceFilename` generates standardized names.
- Verified `detectVoiceFilterFromFilename` extracts filter attributes.
- Verified binary WAV encoding produces valid 44-byte RIFF WAVE headers, PCM 16-bit, and proper channel interleaving for both mono and stereo buffers.
