(function() {
  const STORAGE_KEY = 'otel-theme';
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

  function getTheme() {
    return localStorage.getItem(STORAGE_KEY) || (prefersDark ? 'dark' : 'light');
  }

  function setTheme(theme) {
    theme = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);
    const btn = document.querySelector('.theme-toggle');
    if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
    return theme;
  }

  function init() {
    setTheme(getTheme());
    document.querySelectorAll('.theme-toggle').forEach(btn => {
      btn.addEventListener('click', () => setTheme(getTheme() === 'dark' ? 'light' : 'dark'));
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
