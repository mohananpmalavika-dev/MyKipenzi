import { useEffect, useState } from 'react';

export const FONT_SIZES = [
  { id: 'small', label: 'Small', labelMl: 'ചെറുത്', size: '13px', lineHeight: '1.75', metaSize: '8px' },
  { id: 'normal', label: 'Standard', labelMl: 'സാധാരണ', size: '15px', lineHeight: '1.8', metaSize: '9px' },
  { id: 'comfortable', label: 'Comfortable', labelMl: 'സുഖകരം', size: '17px', lineHeight: '1.85', metaSize: '10px' },
  { id: 'large', label: 'Large', labelMl: 'വലുത്', size: '19px', lineHeight: '1.9', metaSize: '11px' },
  { id: 'xlarge', label: 'Extra Large', labelMl: 'വളരെ വലുത്', size: '21px', lineHeight: '1.95', metaSize: '12px' },
];

const CUSTOM_DEFAULTS = { accent: '#17483e', background: '#f8f9f5', bubble: '#e5ecdc' };
const CUSTOM_TOKENS = ['--forest', '--green', '--bg-rail', '--bg-chat-panel', '--bg-bubble-mine', '--border-bubble-mine', '--text-bubble-mine'];
function readPreference(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; }
}
function readableText(hex) {
  const channels = hex.slice(1).match(/../g).map(value => {
    const channel = parseInt(value, 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722 > 0.179 ? '#17241e' : '#ffffff';
}
export function useThemeAndFontSize() {
  const [customColors, setCustomColors] = useState(() => {
    const saved = readPreference('kipenzi_custom_colors', CUSTOM_DEFAULTS);
    return Object.fromEntries(Object.entries(CUSTOM_DEFAULTS).map(([key, value]) => [key, /^#[0-9a-f]{6}$/i.test(saved[key]) ? saved[key] : value]));
  });
  const [bubbleStyle, setBubbleStyle] = useState(() => {
    const saved = readPreference('kipenzi_bubble_style', 'classic');
    return ['classic', 'rounded', 'square'].includes(saved) ? saved : 'classic';
  });
  const [backgroundImage, setBackgroundImage] = useState(() => {
    const saved = readPreference('kipenzi_background_image', '');
    return typeof saved === 'string' && /^data:image\/(png|jpeg|webp);base64,/.test(saved) ? saved : '';
  });
  const [appearanceError, setAppearanceError] = useState('');
  const updateBackgroundImage = (image) => {
    try { localStorage.setItem('kipenzi_background_image', JSON.stringify(image)); }
    catch { setAppearanceError('Unable to save this image. Try a smaller image or enable browser storage.'); return; }
    setAppearanceError('');
    setBackgroundImage(image);
  };
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-bubble-style', bubbleStyle);
    root.style.setProperty('--chat-background-image', backgroundImage ? 'url("' + backgroundImage + '")' : 'none');
    try {
      localStorage.setItem('kipenzi_custom_colors', JSON.stringify(customColors));
      localStorage.setItem('kipenzi_bubble_style', JSON.stringify(bubbleStyle));
    } catch { /* Appearance still applies when storage is unavailable. */ }
  }, [customColors, bubbleStyle, backgroundImage]);

  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('kipenzi_theme') || 'system';
    } catch {
      return 'system';
    }
  });

  const [fontSize, setFontSize] = useState(() => {
    try {
      return localStorage.getItem('kipenzi_font_size') || 'comfortable';
    } catch {
      return 'comfortable';
    }
  });

  const [systemIsDark, setSystemIsDark] = useState(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Listen to system color scheme changes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => setSystemIsDark(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const isDark = theme === 'dark' || (theme === 'system' && systemIsDark);

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', isDark ? 'dark' : 'light');
    root.setAttribute('data-theme-mode', theme);
    for (const token of CUSTOM_TOKENS) root.style.removeProperty(token);
    if (theme === 'custom') {
      const values = [customColors.accent, customColors.accent, customColors.accent, customColors.background, customColors.bubble, customColors.bubble, readableText(customColors.bubble)];
      CUSTOM_TOKENS.forEach((token, index) => root.style.setProperty(token, values[index]));
    }

    try {
      localStorage.setItem('kipenzi_theme', theme);
    } catch {
      // storage unavailable
    }

    // Update meta theme-color for mobile browser address bar / notch
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', isDark ? '#0e1613' : '#163c35');
    }
  }, [theme, isDark, customColors]);

  // Apply font size to document
  useEffect(() => {
    const root = document.documentElement;
    const currentConfig = FONT_SIZES.find((f) => f.id === fontSize) || FONT_SIZES[2]; // comfortable by default

    root.setAttribute('data-font-size', currentConfig.id);
    root.style.setProperty('--chat-font-size', currentConfig.size);
    root.style.setProperty('--chat-line-height', currentConfig.lineHeight);
    root.style.setProperty('--chat-meta-size', currentConfig.metaSize);

    try {
      localStorage.setItem('kipenzi_font_size', fontSize);
    } catch {
      // storage unavailable
    }
  }, [fontSize]);

  const toggleTheme = () => {
    setTheme((prev) => {
      if (prev === 'dark') return 'light';
      if (prev === 'light') return 'dark';
      // If currently system, flip based on resolved
      return isDark ? 'light' : 'dark';
    });
  };

  const cycleFontSize = () => {
    setFontSize((prev) => {
      const idx = FONT_SIZES.findIndex((f) => f.id === prev);
      const nextIdx = (idx + 1) % FONT_SIZES.length;
      return FONT_SIZES[nextIdx].id;
    });
  };

  return {
    customColors, setCustomColors, bubbleStyle, setBubbleStyle, backgroundImage, updateBackgroundImage, appearanceError,
    theme,
    setTheme,
    isDark,
    toggleTheme,
    fontSize,
    setFontSize,
    cycleFontSize,
    currentFontConfig: FONT_SIZES.find((f) => f.id === fontSize) || FONT_SIZES[2],
  };
}
