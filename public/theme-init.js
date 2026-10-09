(function() {
  try {
    var t = localStorage.getItem('kipenzi_theme') || 'system';
    var isDark = t === 'dark' || (t === 'system' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme-mode', t);
    var fs = localStorage.getItem('kipenzi_font_size') || 'comfortable';
    document.documentElement.setAttribute('data-font-size', fs);
    var sizes = { small: '13px', normal: '15px', comfortable: '17px', large: '19px', xlarge: '21px' };
    var lineHeights = { small: '1.75', normal: '1.8', comfortable: '1.85', large: '1.9', xlarge: '1.95' };
    if (sizes[fs]) {
      document.documentElement.style.setProperty('--chat-font-size', sizes[fs]);
      document.documentElement.style.setProperty('--chat-line-height', lineHeights[fs]);
    }
    if (isDark) {
      var meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', '#211b27');
    }
  } catch(e) {}
})();
