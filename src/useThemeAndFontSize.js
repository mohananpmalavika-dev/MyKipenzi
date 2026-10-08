import { useEffect, useState } from 'react';

export const FONT_SIZES = [
  { id: 'small', label: 'Small', labelMl: 'ചെറുത്', size: '13px', lineHeight: '1.75', metaSize: '8px' },
  { id: 'normal', label: 'Standard', labelMl: 'സാധാരണ', size: '15px', lineHeight: '1.8', metaSize: '9px' },
  { id: 'comfortable', label: 'Comfortable', labelMl: 'സുഖകരം', size: '17px', lineHeight: '1.85', metaSize: '10px' },
  { id: 'large', label: 'Large', labelMl: 'വലുത്', size: '19px', lineHeight: '1.9', metaSize: '11px' },
  { id: 'xlarge', label: 'Extra Large', labelMl: 'വളരെ വലുത്', size: '21px', lineHeight: '1.95', metaSize: '12px' },
];

export function useThemeAndFontSize() {
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
  }, [theme, isDark]);

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
