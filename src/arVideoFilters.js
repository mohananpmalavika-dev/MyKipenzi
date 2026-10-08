/**
 * AR Video Filters & Virtual Backgrounds Engine for WebRTC Calls
 * Provides romantic AR overlays, playful face stickers, aesthetic virtual backgrounds,
 * portrait bokeh blur, cinematic color grading, and real-time canvas stream processing.
 */

// Filter Categories
export const FILTER_CATEGORIES = [
  { id: 'romantic', nameEn: 'Romantic & Cute', nameMl: 'റൊമാന്റിക് & ക്യൂട്ട്', icon: '💖' },
  { id: 'fun', nameEn: 'Fun & Playful', nameMl: 'ഫണ്ണി & കുസൃതി', icon: '🐱' },
  { id: 'background', nameEn: 'Virtual Backgrounds', nameMl: 'വെർച്വൽ പശ്ചാത്തലങ്ങൾ', icon: '🌆' },
  { id: 'mood', nameEn: 'Cinematic Moods', nameMl: 'കളർ മൂഡുകൾ', icon: '🎨' },
];

// All AR Filters & Virtual Backgrounds Presets
export const AR_FILTERS = [
  // --- NONE / NORMAL ---
  {
    id: 'none',
    category: 'all',
    nameEn: 'Normal Camera',
    nameMl: 'യഥാർത്ഥ ക്യാമറ',
    icon: '🚫',
    badge: 'Original',
    descriptionEn: 'Original natural camera feed without effects',
    descriptionMl: 'ഫിൽട്ടറുകൾ ഇല്ലാത്ത സ്വാഭാവിക ക്യാമറ',
    type: 'none',
  },

  // --- ROMANTIC & CUTE AR ---
  {
    id: 'love-halo',
    category: 'romantic',
    nameEn: 'Love Halo & Hearts',
    nameMl: 'ലവ് ഹാലോ & ഹൃദയങ്ങൾ',
    icon: '💖',
    badge: 'Romantic',
    descriptionEn: 'Glowing love halo floating above head with orbiting animated hearts & soft blush',
    descriptionMl: 'തലയ്ക്ക് മുകളിൽ പ്രകാശിക്കുന്ന ഹാലോയും ഒഴുകിനടക്കുന്ന ഹൃദയങ്ങളും',
    type: 'ar_sticker',
    sound: 'heart-chime',
  },
  {
    id: 'rose-crown',
    category: 'romantic',
    nameEn: 'Rose Crown & Petals',
    nameMl: 'റോസ് കിരീടവും പൂവിതളുകളും',
    icon: '🌹',
    badge: 'Popular',
    descriptionEn: 'Crown of blooming crimson roses with gentle fluttering falling petals',
    descriptionMl: 'റോസാപ്പൂ കിരീടവും കാറ്റിൽ പറക്കുന്ന മനോഹര പൂവിതളുകളും',
    type: 'ar_sticker',
    sound: 'fairy-chime',
  },
  {
    id: 'fairy-sparkles',
    category: 'romantic',
    nameEn: 'Fairy Sparkles & Glow',
    nameMl: 'മാന്ത്രിക തിളക്കവും ഗ്ലോയും',
    icon: '✨',
    badge: 'Glowing',
    descriptionEn: 'Twinkling golden fairy dust, celestial starbursts and angelic cheek radiance',
    descriptionMl: 'സ്വർണ്ണ നക്ഷത്ര തിളക്കങ്ങളും കവിളുകളിൽ സുന്ദരമായ ഗ്ലോയും',
    type: 'ar_sticker',
    sound: 'fairy-chime',
  },
  {
    id: 'sakura-blossom',
    category: 'romantic',
    nameEn: 'Sakura Petal Breeze',
    nameMl: 'ചെറി പൂക്കളുടെ വസന്തം',
    icon: '🌸',
    badge: 'Spring',
    descriptionEn: 'Blooming sakura branch canopy with delicate pink petals drifting downwards',
    descriptionMl: 'ചെറി പൂക്കളുടെ കൊമ്പുകളും താഴേക്ക് വീഴുന്ന പിങ്ക് ഇതളുകളും',
    type: 'ar_sticker',
    sound: 'soft-breeze',
  },

  // --- FUN & PLAYFUL AR ---
  {
    id: 'cute-kitten',
    category: 'fun',
    nameEn: 'Cute Kitten Ears',
    nameMl: 'ക്യൂട്ട് പൂച്ചക്കുട്ടി',
    icon: '🐱',
    badge: 'Cute',
    descriptionEn: 'Animated twitching cat ears, pink heart nose, and sweet whiskers',
    descriptionMl: 'ഇളകുന്ന പൂച്ച ചെവികളും പിങ്ക് മൂക്കും വിസ്കേഴ്സും',
    type: 'ar_sticker',
    sound: 'cat-meow',
  },
  {
    id: 'playful-puppy',
    category: 'fun',
    nameEn: 'Playful Puppy Ears',
    nameMl: 'കുസൃതി നായക്കുട്ടി',
    icon: '🐶',
    badge: 'Playful',
    descriptionEn: 'Bouncing floppy puppy ears, cute button nose, and cheerful tongue',
    descriptionMl: 'തുള്ളിക്കളിക്കുന്ന നായക്കുട്ടി ചെവികളും മനോഹരമായ മൂക്കും',
    type: 'ar_sticker',
    sound: 'puppy-bark',
  },
  {
    id: 'cool-shades',
    category: 'fun',
    nameEn: 'Retro Neon Shades',
    nameMl: 'കൂൾ നിയോൺ സൺഗ്ലാസ്',
    icon: '😎',
    badge: 'Style',
    descriptionEn: 'Ultra-cool reflective dark shades with neon glint and gold sparkle highlights',
    descriptionMl: 'മിന്നുന്ന നിയോൺ പ്രതിഫലനമുള്ള സ്റ്റൈലിഷ് സൺഗ്ലാസ്',
    type: 'ar_sticker',
    sound: 'sunglasses-snap',
  },
  {
    id: 'silly-mustache',
    category: 'fun',
    nameEn: 'Vintage Mustache & Glass',
    nameMl: 'തമാശ മീശയും കണ്ണടയും',
    icon: '🥸',
    badge: 'Comedy',
    descriptionEn: 'Handlebar vintage gentleman mustache and classic round spectacles',
    descriptionMl: 'പിരിച്ചുവെച്ച പഴയ തമാശ മീശയും വട്ടക്കണ്ണടയും',
    type: 'ar_sticker',
    sound: 'funny-pop',
  },
  {
    id: 'party-carnival',
    category: 'fun',
    nameEn: 'Party Hat & Confetti',
    nameMl: 'പാർട്ടി തൊപ്പിയും കോൺഫെറ്റിയും',
    icon: '🎉',
    badge: 'Celebrate',
    descriptionEn: 'Festive striped party cone hat with exploding colorful ribbons & confetti',
    descriptionMl: 'നിറമുള്ള പാർട്ടി തൊപ്പിയും ആകാശത്ത് പാറിപ്പറക്കുന്ന കോൺഫെറ്റിയും',
    type: 'ar_sticker',
    sound: 'party-horn',
  },

  // --- VIRTUAL BACKGROUNDS ---
  {
    id: 'studio-blur',
    category: 'background',
    nameEn: 'Studio Portrait Blur',
    nameMl: 'പോർട്രെയിറ്റ് ബൊക്കെ ബ്ലർ',
    icon: '🌫️',
    badge: 'DSLR',
    descriptionEn: 'Soft professional depth-of-field background blur focusing on you',
    descriptionMl: 'നിങ്ങളെ കേന്ദ്രീകരിച്ച് പശ്ചാത്തലം മൃദുവായി ബ്ലർ ചെയ്യുന്ന സ്റ്റുഡിയോ ഇഫക്റ്റ്',
    type: 'virtual_bg',
    blurDepth: 16,
  },
  {
    id: 'sunset-beach',
    category: 'background',
    nameEn: 'Romantic Sunset Beach',
    nameMl: 'റൊമാന്റിക് സൺസെറ്റ് ബീച്ച്',
    icon: '🌅',
    badge: 'Aesthetic',
    descriptionEn: 'Golden twilight beach horizon with warm waves and serene sunset glow',
    descriptionMl: 'സുവർണ്ണ സായാഹ്ന സൂര്യനും ശാന്തമായ കടൽതീര പശ്ചാത്തലവും',
    type: 'virtual_bg',
  },
  {
    id: 'candlelight-dinner',
    category: 'background',
    nameEn: 'Candlelight Dinner',
    nameMl: 'ക്യാൻഡിൽലൈറ്റ് ഡിന്നർ',
    icon: '🕯️',
    badge: 'Intimate',
    descriptionEn: 'Intimate candle glow with warm mahogany ambiance and dreamy bokeh lights',
    descriptionMl: 'മെഴുകുതിരി വെളിച്ചവും മനോഹരമായ റൊമാന്റിക് ഡിന്നർ ആംബിയൻസും',
    type: 'virtual_bg',
  },
  {
    id: 'parisian-cafe',
    category: 'background',
    nameEn: 'Cozy Parisian Cafe',
    nameMl: 'കോസി പാരീസിയൻ കഫേ',
    icon: '☕',
    badge: 'Cozy',
    descriptionEn: 'Charming vintage coffee bistro backdrop with fairy string lights',
    descriptionMl: 'ചെറിയ ലൈറ്റുകൾ അലങ്കരിച്ച സുഖപ്രദമായ വിന്റേജ് കോഫി കഫേ',
    type: 'virtual_bg',
  },
  {
    id: 'starry-cosmos',
    category: 'background',
    nameEn: 'Starry Milky Way',
    nameMl: 'നക്ഷത്ര തിളക്കമുള്ള ആകാശം',
    icon: '🌌',
    badge: 'Cosmic',
    descriptionEn: 'Twinkling indigo night sky with purple cosmic nebula dust and moonlight',
    descriptionMl: 'നക്ഷത്രങ്ങളും മാന്ത്രിക നെബുലയും നിറഞ്ഞ നീലാകാശ പശ്ചാത്തലം',
    type: 'virtual_bg',
  },
  {
    id: 'cherry-garden',
    category: 'background',
    nameEn: 'Zen Cherry Garden',
    nameMl: 'ശാന്തമായ ചെറി ഗാർഡൻ',
    icon: '🌸',
    badge: 'Serene',
    descriptionEn: 'Peaceful Japanese wooden porch overlooking blossoming cherry trees',
    descriptionMl: 'ചെറി മരങ്ങൾ പൂത്തുനിൽക്കുന്ന ശാന്തസുന്ദരമായ പൂന്തോട്ടം',
    type: 'virtual_bg',
  },
  {
    id: 'lofi-room',
    category: 'background',
    nameEn: 'Cozy Lo-Fi Room',
    nameMl: 'ലോ-ഫൈ ബെഡ്‌റൂം',
    icon: '🛋️',
    badge: 'Chill',
    descriptionEn: 'Warm fairy lights, purple-pink neon glow, and cozy bedroom atmosphere',
    descriptionMl: 'ഫെയറി ലൈറ്റുകളും നിയോൺ തിളക്കവുമുള്ള ശാന്തമായ ലോ-ഫൈ മുറി',
    type: 'virtual_bg',
  },
  {
    id: 'velvet-emerald',
    category: 'background',
    nameEn: 'Kipenzi Emerald Studio',
    nameMl: 'എമറാൾഡ് സ്റ്റുഡിയോ ഡ്രോപ്പ്',
    icon: '🌿',
    badge: 'Signature',
    descriptionEn: 'Signature Kipenzi deep emerald studio wall with golden ambient accents',
    descriptionMl: 'ആഢംബരപൂർണ്ണമായ ഇരുണ്ട എമറാൾഡ് പച്ച നിറത്തിലുള്ള സ്റ്റുഡിയോ പശ്ചാത്തലം',
    type: 'virtual_bg',
  },

  // --- CINEMATIC MOODS ---
  {
    id: 'golden-hour',
    category: 'mood',
    nameEn: 'Golden Hour Warmth',
    nameMl: 'സുവർണ്ണ സായാഹ്ന വെളിച്ചം',
    icon: '☀️',
    badge: 'Warm',
    descriptionEn: 'Warm honey amber sunlit radiance enhancing skin tone',
    descriptionMl: 'സ്വർണ്ണ നിറത്തിലുള്ള സായാഹ്ന സൂര്യപ്രകാശത്തിന്റെ സുന്ദര തിളക്കം',
    type: 'mood',
    filterCss: 'sepia(0.35) saturate(1.3) brightness(1.08) contrast(1.04)',
  },
  {
    id: 'vintage-film',
    category: 'mood',
    nameEn: '90s Nostalgic Film',
    nameMl: '90s വിന്റേജ് ഫിലിം',
    icon: '🎞️',
    badge: 'Retro',
    descriptionEn: 'Classic 35mm film grain, gentle sepia tones, and authentic retro vignette',
    descriptionMl: 'പഴയ സിനിമാ ക്യാമറയുടെ റെട്രോ ടോണും വിന്റേജ് ബോർഡറും',
    type: 'mood',
    filterCss: 'sepia(0.5) contrast(1.15) brightness(0.95)',
  },
  {
    id: 'cyber-neon',
    category: 'mood',
    nameEn: 'Cyberpunk Neon Vibe',
    nameMl: 'സൈബർപങ്ക് നിയോൺ വൈബ്',
    icon: '⚡',
    badge: 'Vibrant',
    descriptionEn: 'Electric magenta and cyan duo-tone futuristic lighting',
    descriptionMl: 'ഇലക്ട്രിക് മജന്തയും സിയാനും ചേർന്ന ഫ്യൂച്ചറിസ്റ്റിക് നിയോൺ ലൈറ്റിംഗ്',
    type: 'mood',
    filterCss: 'hue-rotate(290deg) saturate(1.45) contrast(1.2)',
  },
  {
    id: 'dreamy-pastel',
    category: 'mood',
    nameEn: 'Dreamy Pastel Mist',
    nameMl: 'ഡ്രീമി പാസ്റ്റൽ മിസ്റ്റ്',
    icon: '☁️',
    badge: 'Dreamy',
    descriptionEn: 'Soft ethereal focus, gentle pearlescent lavender-rose illumination',
    descriptionMl: 'മൃദുവായ വെളിച്ചവും സ്വപ്നതുല്യമായ പാസ്റ്റൽ വർണ്ണങ്ങളും',
    type: 'mood',
    filterCss: 'brightness(1.12) saturate(1.15) contrast(0.95)',
  },
];

export function getFilterById(id) {
  return AR_FILTERS.find((f) => f.id === id) || AR_FILTERS[0];
}

// -------------------------------------------------------------
// Web Audio API Sound Effects for Fun & Romantic Filter Switching
// -------------------------------------------------------------
export function playFilterSoundEffect(soundType, isMuted = false) {
  if (isMuted || !soundType) return;
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (soundType === 'heart-chime' || soundType === 'fairy-chime') {
      // Gentle romantic sparkle chime arpeggio
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
        gain.gain.setValueAtTime(0, ctx.currentTime + idx * 0.08);
        gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + idx * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.08);
        osc.stop(ctx.currentTime + idx * 0.08 + 0.45);
      });
    } else if (soundType === 'cat-meow') {
      // Cute playful feline mew glide
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(880, ctx.currentTime + 0.15);
      osc.frequency.exponentialRampToValueAtTime(620, ctx.currentTime + 0.35);
      gain.gain.setValueAtTime(0.01, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.38);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    } else if (soundType === 'party-horn') {
      // Fun party fanfare
      [392, 523.25, 659.25].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.06);
        gain.gain.setValueAtTime(0.08, ctx.currentTime + i * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.06 + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.06);
        osc.stop(ctx.currentTime + i * 0.06 + 0.32);
      });
    } else if (soundType === 'camera-shutter') {
      // Crisp mechanical camera shutter click
      const bufferSize = ctx.sampleRate * 0.05;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
      noise.connect(gain);
      gain.connect(ctx.destination);
      noise.start(ctx.currentTime);
    } else {
      // Subtle gentle switch blip
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.12);
    }
  } catch {
    // Ignore audio context errors silently in unprompted contexts
  }
}

// -------------------------------------------------------------
// Real-time Canvas AR Filter & Background Processing Pipeline
// -------------------------------------------------------------
export class ARVideoProcessor {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 640;
    this.canvas.height = 480;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: false });
    this.video = document.createElement('video');
    this.video.autoplay = true;
    this.video.playsInline = true;
    this.video.muted = true;

    // Backing offscreen blur canvas for fast portrait bokeh
    this.bgCanvas = document.createElement('canvas');
    this.bgCanvas.width = 320;
    this.bgCanvas.height = 240;
    this.bgCtx = this.bgCanvas.getContext('2d');

    this.activeFilter = 'none';
    this.blurAmount = 14;
    this.isRunning = false;
    this.animFrameId = null;
    this.particles = [];
    this.startTime = Date.now();
    this.outputStream = null;
    this.rawStream = null;
    this.onFrameCallback = null;
  }

  setRawStream(stream) {
    this.rawStream = stream;
    if (stream && stream.getVideoTracks().length > 0) {
      this.video.srcObject = stream;
      this.video.play().catch(() => {});
    } else {
      this.video.srcObject = null;
    }
  }

  setFilter(filterId, options = {}) {
    this.activeFilter = filterId;
    if (options.blurAmount !== undefined) {
      this.blurAmount = options.blurAmount;
    }
    // Re-initialize particles for animated filters
    this.initParticles(filterId);
  }

  initParticles(filterId) {
    this.particles = [];
    const count =
      filterId === 'love-halo'
        ? 18
        : filterId === 'rose-crown' || filterId === 'sakura-blossom'
          ? 24
          : filterId === 'party-carnival'
            ? 35
            : filterId === 'fairy-sparkles'
              ? 22
              : 0;

    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        vx: (Math.random() - 0.5) * 1.5,
        vy:
          filterId === 'rose-crown' || filterId === 'sakura-blossom'
            ? 1 + Math.random() * 2
            : filterId === 'party-carnival'
              ? 1.5 + Math.random() * 2.5
              : -0.8 - Math.random() * 1.2,
        size: 8 + Math.random() * 14,
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 0.08,
        opacity: 0.4 + Math.random() * 0.6,
        color:
          filterId === 'party-carnival'
            ? ['#ff4081', '#ffeb3b', '#00e676', '#00e5ff', '#e040fb'][Math.floor(Math.random() * 5)]
            : filterId === 'rose-crown'
              ? ['#ff2a55', '#ff6b8b', '#e60039'][Math.floor(Math.random() * 3)]
              : '#ff4081',
      });
    }
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    const loop = () => {
      if (!this.isRunning) return;
      this.render();
      if (this.onFrameCallback) this.onFrameCallback();
      this.animFrameId = requestAnimationFrame(loop);
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  stop() {
    this.isRunning = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  getOutputStream(fps = 30) {
    if (!this.outputStream) {
      if (this.canvas.captureStream) {
        this.outputStream = this.canvas.captureStream(fps);
      } else if (this.canvas.mozCaptureStream) {
        this.outputStream = this.canvas.mozCaptureStream(fps);
      }
    }
    return this.outputStream;
  }

  render() {
    const { ctx, canvas, video } = this;
    const w = canvas.width;
    const h = canvas.height;
    const t = (Date.now() - this.startTime) / 1000;

    // Clear frame
    ctx.clearRect(0, 0, w, h);
    ctx.filter = 'none';

    // If video is not ready yet, draw a placeholder background
    const videoReady = video && video.readyState >= 2;

    const filterObj = getFilterById(this.activeFilter);

    // Apply Filter Types
    if (this.activeFilter === 'none') {
      // Just plain camera
      if (videoReady) {
        ctx.drawImage(video, 0, 0, w, h);
      } else {
        ctx.fillStyle = '#10251c';
        ctx.fillRect(0, 0, w, h);
      }
      return;
    }

    if (filterObj.type === 'virtual_bg') {
      if (this.activeFilter === 'studio-blur') {
        this.renderStudioBlur(w, h, videoReady);
      } else {
        this.renderVirtualBackground(this.activeFilter, w, h, videoReady);
      }
    } else if (filterObj.type === 'mood') {
      // Mood Color Grading
      if (videoReady) {
        ctx.filter = filterObj.filterCss || 'none';
        ctx.drawImage(video, 0, 0, w, h);
        ctx.filter = 'none';
      }
      this.renderMoodVignette(this.activeFilter, w, h);
    } else {
      // Standard camera base + AR facial stickers & particles
      if (videoReady) {
        ctx.drawImage(video, 0, 0, w, h);
      } else {
        ctx.fillStyle = '#10251c';
        ctx.fillRect(0, 0, w, h);
      }
    }

    // Overlay AR Stickers if applicable
    if (filterObj.type === 'ar_sticker') {
      this.renderARStickers(this.activeFilter, w, h, t);
    }
  }

  // --- STUDIO PORTRAIT BOKEH BLUR ---
  renderStudioBlur(w, h, videoReady) {
    const { ctx, video, bgCtx, bgCanvas } = this;
    if (!videoReady) {
      ctx.fillStyle = '#173a2d';
      ctx.fillRect(0, 0, w, h);
      return;
    }

    // Step 1: Draw heavily blurred background
    bgCtx.drawImage(video, 0, 0, bgCanvas.width, bgCanvas.height);
    ctx.save();
    ctx.filter = `blur(${this.blurAmount}px)`;
    ctx.drawImage(bgCanvas, 0, 0, w, h);
    ctx.restore();

    // Step 2: Draw crisp subject in foreground with soft-edged portrait vignette
    ctx.save();
    // Create an elliptical portrait mask centered around user
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = w;
    maskCanvas.height = h;
    const mctx = maskCanvas.getContext('2d');
    const grad = mctx.createRadialGradient(
      w * 0.5,
      h * 0.52,
      w * 0.22,
      w * 0.5,
      h * 0.52,
      w * 0.52,
    );
    grad.addColorStop(0, 'rgba(0,0,0,1)');
    grad.addColorStop(0.7, 'rgba(0,0,0,0.95)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    mctx.fillStyle = grad;
    mctx.beginPath();
    mctx.ellipse(w * 0.5, h * 0.52, w * 0.45, h * 0.55, 0, 0, Math.PI * 2);
    mctx.fill();

    // Composite crisp video with mask
    ctx.globalCompositeOperation = 'source-over';
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = w;
    tempCanvas.height = h;
    const tctx = tempCanvas.getContext('2d');
    tctx.drawImage(video, 0, 0, w, h);
    tctx.globalCompositeOperation = 'destination-in';
    tctx.drawImage(maskCanvas, 0, 0);

    ctx.drawImage(tempCanvas, 0, 0);
    ctx.restore();
  }

  // --- VIRTUAL BACKGROUNDS PROCEDURAL COMPOSITOR ---
  renderVirtualBackground(bgId, w, h, videoReady) {
    const { ctx, video } = this;

    // Draw the aesthetic backdrop
    ctx.save();
    if (bgId === 'sunset-beach') {
      // Golden twilight gradient
      const sky = ctx.createLinearGradient(0, 0, 0, h * 0.65);
      sky.addColorStop(0, '#2d1142');
      sky.addColorStop(0.4, '#c24b68');
      sky.addColorStop(0.75, '#f58b54');
      sky.addColorStop(1, '#ffc071');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);

      // Evening Sun
      ctx.fillStyle = '#fff4cc';
      ctx.beginPath();
      ctx.arc(w * 0.5, h * 0.52, 42, 0, Math.PI * 2);
      ctx.fill();

      // Ocean waters
      const ocean = ctx.createLinearGradient(0, h * 0.62, 0, h);
      ocean.addColorStop(0, '#e87461');
      ocean.addColorStop(0.4, '#472b52');
      ocean.addColorStop(1, '#1b122c');
      ctx.fillStyle = ocean;
      ctx.fillRect(0, h * 0.62, w, h * 0.38);
    } else if (bgId === 'candlelight-dinner') {
      // Candlelight intimacy
      const grad = ctx.createRadialGradient(w * 0.5, h * 0.7, 50, w * 0.5, h * 0.5, w * 0.8);
      grad.addColorStop(0, '#ffbe76');
      grad.addColorStop(0.3, '#d35400');
      grad.addColorStop(0.7, '#38160a');
      grad.addColorStop(1, '#120502');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Bokeh light orbs
      const lights = [
        { x: w * 0.15, y: h * 0.25, r: 35, c: 'rgba(255, 200, 100, 0.25)' },
        { x: w * 0.85, y: h * 0.3, r: 45, c: 'rgba(255, 180, 80, 0.22)' },
        { x: w * 0.25, y: h * 0.65, r: 50, c: 'rgba(255, 160, 60, 0.18)' },
        { x: w * 0.78, y: h * 0.75, r: 40, c: 'rgba(255, 190, 90, 0.2)' },
      ];
      lights.forEach((l) => {
        ctx.fillStyle = l.c;
        ctx.beginPath();
        ctx.arc(l.x, l.y, l.r, 0, Math.PI * 2);
        ctx.fill();
      });
    } else if (bgId === 'starry-cosmos') {
      // Cosmic deep night
      const sky = ctx.createRadialGradient(w * 0.7, h * 0.3, 40, w * 0.5, h * 0.5, w * 0.75);
      sky.addColorStop(0, '#4a2574');
      sky.addColorStop(0.4, '#1e1645');
      sky.addColorStop(1, '#080614');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);

      // Glowing Moon
      ctx.fillStyle = '#f3f4f6';
      ctx.beginPath();
      ctx.arc(w * 0.82, h * 0.2, 28, 0, Math.PI * 2);
      ctx.fill();

      // Static twinkling stars
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 40; i++) {
        const sx = ((i * 12345) % w) + 5;
        const sy = ((i * 54321) % (h * 0.75)) + 5;
        const sr = (i % 3) + 1;
        ctx.beginPath();
        ctx.arc(sx, sy, sr, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (bgId === 'parisian-cafe') {
      // Cafe interior warm tones
      const cafe = ctx.createLinearGradient(0, 0, 0, h);
      cafe.addColorStop(0, '#2e1c14');
      cafe.addColorStop(0.5, '#4a3224');
      cafe.addColorStop(1, '#1b100a');
      ctx.fillStyle = cafe;
      ctx.fillRect(0, 0, w, h);

      // Warm fairy light garland across top
      ctx.strokeStyle = 'rgba(255, 230, 160, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, h * 0.12);
      ctx.quadraticCurveTo(w * 0.5, h * 0.22, w, h * 0.12);
      ctx.stroke();

      for (let i = 0; i < 8; i++) {
        const lx = (w / 7) * i;
        const ly = h * 0.12 + Math.sin((i / 7) * Math.PI) * (h * 0.08);
        ctx.fillStyle = 'rgba(255, 220, 120, 0.85)';
        ctx.beginPath();
        ctx.arc(lx, ly, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (bgId === 'cherry-garden') {
      // Soft misty pink cherry orchard
      const garden = ctx.createLinearGradient(0, 0, 0, h);
      garden.addColorStop(0, '#e8d4dc');
      garden.addColorStop(0.5, '#f5c2d3');
      garden.addColorStop(1, '#946678');
      ctx.fillStyle = garden;
      ctx.fillRect(0, 0, w, h);

      // Japanese wooden beam framing
      ctx.fillStyle = '#422a22';
      ctx.fillRect(0, 0, w, 22);
      ctx.fillRect(0, 0, 24, h);
      ctx.fillRect(w - 24, 0, 24, h);
    } else if (bgId === 'lofi-room') {
      // Lo-fi bedroom violet ambiance
      const room = ctx.createLinearGradient(0, 0, w, h);
      room.addColorStop(0, '#1c1236');
      room.addColorStop(0.5, '#3b1d5c');
      room.addColorStop(1, '#0e0920');
      ctx.fillStyle = room;
      ctx.fillRect(0, 0, w, h);

      // Purple/Pink neon sign bar
      ctx.fillStyle = 'rgba(255, 64, 180, 0.25)';
      ctx.fillRect(w * 0.1, h * 0.15, w * 0.35, 12);
    } else {
      // Signature Kipenzi Emerald Studio
      const studio = ctx.createRadialGradient(w * 0.5, h * 0.4, 60, w * 0.5, h * 0.5, w * 0.7);
      studio.addColorStop(0, '#265946');
      studio.addColorStop(0.5, '#173a2d');
      studio.addColorStop(1, '#0a1d15');
      ctx.fillStyle = studio;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.restore();

    // Step 2: Overlay user with soft portrait mask
    if (videoReady) {
      ctx.save();
      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = w;
      maskCanvas.height = h;
      const mctx = maskCanvas.getContext('2d');
      const grad = mctx.createRadialGradient(
        w * 0.5,
        h * 0.54,
        w * 0.24,
        w * 0.5,
        h * 0.54,
        w * 0.48,
      );
      grad.addColorStop(0, 'rgba(0,0,0,1)');
      grad.addColorStop(0.75, 'rgba(0,0,0,0.92)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      mctx.fillStyle = grad;
      mctx.beginPath();
      mctx.ellipse(w * 0.5, h * 0.54, w * 0.44, h * 0.52, 0, 0, Math.PI * 2);
      mctx.fill();

      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = w;
      tempCanvas.height = h;
      const tctx = tempCanvas.getContext('2d');
      tctx.drawImage(video, 0, 0, w, h);
      tctx.globalCompositeOperation = 'destination-in';
      tctx.drawImage(maskCanvas, 0, 0);

      ctx.drawImage(tempCanvas, 0, 0);
      ctx.restore();
    }
  }

  // --- MOOD VIGNETTE OVERLAYS ---
  renderMoodVignette(moodId, w, h) {
    const { ctx } = this;
    ctx.save();
    if (moodId === 'golden-hour') {
      const grad = ctx.createRadialGradient(w * 0.5, h * 0.5, w * 0.25, w * 0.5, h * 0.5, w * 0.65);
      grad.addColorStop(0, 'rgba(255, 180, 50, 0.08)');
      grad.addColorStop(1, 'rgba(210, 110, 10, 0.25)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    } else if (moodId === 'vintage-film') {
      // 35mm film border & sepia vignette
      const grad = ctx.createRadialGradient(w * 0.5, h * 0.5, w * 0.35, w * 0.5, h * 0.5, w * 0.68);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, 'rgba(20, 10, 5, 0.45)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = 'rgba(20, 15, 10, 0.5)';
      ctx.lineWidth = 8;
      ctx.strokeRect(4, 4, w - 8, h - 8);
    } else if (moodId === 'cyber-neon') {
      const grad = ctx.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0, 'rgba(0, 229, 255, 0.12)');
      grad.addColorStop(1, 'rgba(255, 0, 128, 0.15)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.restore();
  }

  // --- AR FACIAL STICKERS & DYNAMIC PARTICLES ---
  renderARStickers(filterId, w, h, t) {
    const { ctx } = this;
    const cx = w * 0.5;
    const headTopY = h * 0.22; // Natural head top position in video frame
    const bob = Math.sin(t * 3.5) * 4;

    ctx.save();

    // 1. LOVE HALO & HEARTS
    if (filterId === 'love-halo') {
      // Floating glowing golden/pink celestial halo
      ctx.save();
      const haloY = headTopY - 32 + bob;
      ctx.strokeStyle = 'rgba(255, 105, 180, 0.85)';
      ctx.lineWidth = 7;
      ctx.shadowColor = '#ff4081';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.ellipse(cx, haloY, 78, 22, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Inner gold ring
      ctx.strokeStyle = 'rgba(255, 235, 140, 0.95)';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();

      // Cheeks soft blush
      this.drawCheekBlush(ctx, cx - 65, h * 0.48, cx + 65, h * 0.48, 'rgba(255, 75, 130, 0.24)');

      // Floating heart particles
      this.renderParticles(ctx, 'heart');
    }

    // 2. ROSE CROWN & FALLING PETALS
    else if (filterId === 'rose-crown') {
      // Floral Head Wreath
      const crownY = headTopY - 14 + bob * 0.5;
      ctx.save();
      // Vine base
      ctx.strokeStyle = '#2d7762';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(cx, crownY + 20, 85, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();

      // 5 Blooming Roses along the arch
      const angles = [-0.65, -0.32, 0, 0.32, 0.65];
      angles.forEach((ang, i) => {
        const rx = cx + Math.sin(ang) * 85;
        const ry = crownY + 20 - Math.cos(ang) * 42;
        this.drawRose(ctx, rx, ry, i === 2 ? 18 : 14, i % 2 === 0 ? '#ff1e56' : '#ff6584');
      });
      ctx.restore();

      // Swirling falling rose petals
      this.renderParticles(ctx, 'petal');
    }

    // 3. FAIRY SPARKLES & GLOW
    else if (filterId === 'fairy-sparkles') {
      // Golden star sparkles around head
      this.drawCheekBlush(ctx, cx - 65, h * 0.46, cx + 65, h * 0.46, 'rgba(255, 120, 160, 0.28)');
      this.renderParticles(ctx, 'star');
    }

    // 4. SAKURA PETAL BREEZE
    else if (filterId === 'sakura-blossom') {
      // Top corner cherry branches
      ctx.save();
      ctx.fillStyle = '#4a2810';
      // Left branch
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(w * 0.15, 30, w * 0.28, 45);
      ctx.lineTo(w * 0.22, 50);
      ctx.quadraticCurveTo(w * 0.1, 35, 0, 20);
      ctx.fill();

      // Pink sakura blossoms on branch
      [
        { x: w * 0.08, y: 28 },
        { x: w * 0.16, y: 38 },
        { x: w * 0.26, y: 46 },
      ].forEach((p) => {
        this.drawSakuraFlower(ctx, p.x, p.y, 14);
      });
      ctx.restore();

      this.renderParticles(ctx, 'sakura');
    }

    // 5. CUTE KITTEN EARS & WHISKERS
    else if (filterId === 'cute-kitten') {
      const earY = headTopY - 26 + bob * 0.7;
      // Left Ear
      this.drawCatEar(ctx, cx - 62, earY, -0.2);
      // Right Ear
      this.drawCatEar(ctx, cx + 62, earY, 0.2);

      // Pink Nose Button
      ctx.fillStyle = '#ff6584';
      ctx.beginPath();
      ctx.ellipse(cx, h * 0.47, 9, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Cute Whiskers
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 2.5;
      // Left whiskers
      [
        [-10, -5],
        [0, 0],
        [10, 5],
      ].forEach(([dy1, dy2]) => {
        ctx.beginPath();
        ctx.moveTo(cx - 24, h * 0.48 + dy1);
        ctx.lineTo(cx - 75, h * 0.48 + dy2);
        ctx.stroke();
      });
      // Right whiskers
      [
        [-10, -5],
        [0, 0],
        [10, 5],
      ].forEach(([dy1, dy2]) => {
        ctx.beginPath();
        ctx.moveTo(cx + 24, h * 0.48 + dy1);
        ctx.lineTo(cx + 75, h * 0.48 + dy2);
        ctx.stroke();
      });
    }

    // 6. PLAYFUL PUPPY EARS
    else if (filterId === 'playful-puppy') {
      const earY = headTopY - 12 + bob;
      // Floppy Brown Dog Ears
      this.drawPuppyEar(ctx, cx - 82, earY, -0.25);
      this.drawPuppyEar(ctx, cx + 82, earY, 0.25);

      // Dog Nose
      ctx.fillStyle = '#222222';
      ctx.beginPath();
      ctx.ellipse(cx, h * 0.47, 14, 10, 0, 0, Math.PI * 2);
      ctx.fill();

      // Cheerful tongue sticking out
      ctx.fillStyle = '#ff6b8b';
      ctx.beginPath();
      ctx.ellipse(cx, h * 0.54, 12, 16, 0, 0, Math.PI);
      ctx.fill();
    }

    // 7. RETRO NEON SHADES
    else if (filterId === 'cool-shades') {
      const glassesY = h * 0.38 + bob * 0.4;
      ctx.save();
      // Black frame
      ctx.fillStyle = '#111111';
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 2;
      // Left Lens
      ctx.beginPath();
      ctx.roundRect(cx - 78, glassesY - 16, 68, 34, [4, 4, 14, 14]);
      ctx.fill();
      ctx.stroke();

      // Right Lens
      ctx.beginPath();
      ctx.roundRect(cx + 10, glassesY - 16, 68, 34, [4, 4, 14, 14]);
      ctx.fill();
      ctx.stroke();

      // Bridge
      ctx.fillRect(cx - 10, glassesY - 8, 20, 6);

      // Reflective neon gradient overlay
      const glint = ctx.createLinearGradient(
        cx - 78,
        glassesY - 16,
        cx - 10,
        glassesY + 18,
      );
      glint.addColorStop(0, 'rgba(0, 229, 255, 0.45)');
      glint.addColorStop(0.5, 'rgba(255, 0, 128, 0.4)');
      glint.addColorStop(1, 'rgba(0, 0, 0, 0.8)');
      ctx.fillStyle = glint;
      ctx.beginPath();
      ctx.roundRect(cx - 76, glassesY - 14, 64, 30, [4, 4, 12, 12]);
      ctx.roundRect(cx + 12, glassesY - 14, 64, 30, [4, 4, 12, 12]);
      ctx.fill();

      // Lens sparkle
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx - 52, glassesY - 6, 3, 0, Math.PI * 2);
      ctx.arc(cx + 36, glassesY - 6, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 8. VINTAGE MUSTACHE & GLASSES
    else if (filterId === 'silly-mustache') {
      const glassesY = h * 0.38 + bob * 0.3;
      const stacheY = h * 0.52 + bob * 0.3;
      ctx.save();
      // Round wire spectacles
      ctx.strokeStyle = '#8d6e63';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(cx - 44, glassesY, 26, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx + 44, glassesY, 26, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - 18, glassesY);
      ctx.lineTo(cx + 18, glassesY);
      ctx.stroke();

      // Big curly handlebar mustache
      ctx.fillStyle = '#212121';
      ctx.beginPath();
      ctx.moveTo(cx, stacheY - 2);
      ctx.bezierCurveTo(cx - 20, stacheY + 12, cx - 60, stacheY + 14, cx - 72, stacheY - 8);
      ctx.bezierCurveTo(cx - 62, stacheY + 4, cx - 24, stacheY + 2, cx, stacheY + 8);
      ctx.bezierCurveTo(cx + 24, stacheY + 2, cx + 62, stacheY + 4, cx + 72, stacheY - 8);
      ctx.bezierCurveTo(cx + 60, stacheY + 14, cx + 20, stacheY + 12, cx, stacheY - 2);
      ctx.fill();
      ctx.restore();
    }

    // 9. PARTY CARNIVAL HAT & CONFETTI
    else if (filterId === 'party-carnival') {
      const hatY = headTopY - 48 + bob;
      ctx.save();
      // Striped cone hat
      ctx.beginPath();
      ctx.moveTo(cx, hatY - 55);
      ctx.lineTo(cx - 42, hatY + 18);
      ctx.lineTo(cx + 42, hatY + 18);
      ctx.closePath();
      ctx.fillStyle = '#ff4081';
      ctx.fill();

      // Stripes
      ctx.strokeStyle = '#ffeb3b';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(cx - 15, hatY - 20);
      ctx.lineTo(cx + 25, hatY - 5);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - 28, hatY);
      ctx.lineTo(cx + 34, hatY + 12);
      ctx.stroke();

      // Pompom on hat peak
      ctx.fillStyle = '#ffeb3b';
      ctx.beginPath();
      ctx.arc(cx, hatY - 56, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Confetti ribbons and stars
      this.renderParticles(ctx, 'confetti');
    }

    ctx.restore();
  }

  // Helper drawing methods
  drawCheekBlush(ctx, x1, y1, x2, y2, color) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x1, y1, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x2, y2, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawCatEar(ctx, x, y, tilt) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tilt);
    // Outer Ear
    ctx.fillStyle = '#fce4ec';
    ctx.strokeStyle = '#f48fb1';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-28, 20);
    ctx.lineTo(0, -38);
    ctx.lineTo(28, 20);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Inner pink fluff
    ctx.fillStyle = '#f06292';
    ctx.beginPath();
    ctx.moveTo(-16, 18);
    ctx.lineTo(0, -22);
    ctx.lineTo(16, 18);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  drawPuppyEar(ctx, x, y, tilt) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tilt);
    ctx.fillStyle = '#8d6e63';
    ctx.strokeStyle = '#5d4037';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(0, 22, 24, 44, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  drawRose(ctx, x, y, r, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    // Inner swirl
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.55, 0, Math.PI * 1.5);
    ctx.stroke();
    ctx.restore();
  }

  drawSakuraFlower(ctx, x, y, r) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = '#f8bbd0';
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.ellipse(0, -r * 0.7, r * 0.45, r * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.rotate((Math.PI * 2) / 5);
    }
    // Center stamen
    ctx.fillStyle = '#f06292';
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  renderParticles(ctx, type) {
    const w = this.canvas.width;
    const h = this.canvas.height;

    this.particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vrot;

      // Wrap around bounds
      if (p.y < -20) p.y = h + 15;
      if (p.y > h + 20) p.y = -15;
      if (p.x < -20) p.x = w + 15;
      if (p.x > w + 20) p.x = -15;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = p.opacity;

      if (type === 'heart') {
        ctx.fillStyle = p.color || '#ff4081';
        ctx.beginPath();
        const topCurveHeight = p.size * 0.3;
        ctx.moveTo(0, topCurveHeight);
        // top left curve
        ctx.bezierCurveTo(
          -p.size / 2,
          -p.size / 2,
          -p.size,
          topCurveHeight / 3,
          0,
          p.size,
        );
        // top right curve
        ctx.bezierCurveTo(
          p.size,
          topCurveHeight / 3,
          p.size / 2,
          -p.size / 2,
          0,
          topCurveHeight,
        );
        ctx.fill();
      } else if (type === 'petal' || type === 'sakura') {
        ctx.fillStyle = p.color || '#ff6584';
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size * 0.45, p.size * 0.85, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (type === 'star') {
        ctx.fillStyle = '#ffea00';
        ctx.shadowColor = '#fff59d';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        for (let i = 0; i < 4; i++) {
          ctx.lineTo(Math.cos(((i * 2 + 1) * Math.PI) / 4) * p.size, Math.sin(((i * 2 + 1) * Math.PI) / 4) * p.size);
          ctx.lineTo(Math.cos(((i + 1) * Math.PI) / 2) * (p.size * 0.25), Math.sin(((i + 1) * Math.PI) / 2) * (p.size * 0.25));
        }
        ctx.fill();
      } else if (type === 'confetti') {
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size * 0.5, -p.size * 0.2, p.size, p.size * 0.4);
      }

      ctx.restore();
    });
  }

  // Take a high-resolution snapshot
  captureSnapshot(format = 'image/png') {
    return this.canvas.toDataURL(format, 0.95);
  }

  destroy() {
    this.stop();
    if (this.outputStream) {
      this.outputStream.getTracks().forEach((t) => t.stop());
      this.outputStream = null;
    }
    this.rawStream = null;
  }
}
