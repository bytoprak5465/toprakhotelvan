(function() {
  var STORAGE_KEY = 'admin-theme';
  var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

  function getTheme() {
    return localStorage.getItem(STORAGE_KEY) || (prefersDark ? 'dark' : 'light');
  }

  function setTheme(theme) {
    theme = theme === 'dark' ? 'dark' : 'light';
    if (document.body) document.body.setAttribute('data-admin-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);
    var btn = document.getElementById('admin-theme-toggle');
    if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
    return theme;
  }

  if (document.body) setTheme(getTheme());
  function init() {
    setTheme(getTheme());
    var btn = document.getElementById('admin-theme-toggle');
    if (btn) btn.addEventListener('click', function() { setTheme(getTheme() === 'dark' ? 'light' : 'dark'); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
