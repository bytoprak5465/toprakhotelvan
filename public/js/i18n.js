// Simple client-side i18n for TR / EN / FA
(function () {
  var SUPPORTED = ['tr', 'en', 'fa'];
  var DEFAULT_LANG = 'tr';
  var currentLang = null;
  var translations = {};

  function detectInitialLang() {
    var saved = null;
    try {
      saved = window.localStorage.getItem('app_lang');
    } catch (e) {}
    if (saved && SUPPORTED.indexOf(saved) !== -1) return saved;

    var navLang = (navigator.language || navigator.userLanguage || '').toLowerCase();
    if (!navLang) return DEFAULT_LANG;
    if (navLang.startsWith('tr')) return 'tr';
    if (navLang.startsWith('en')) return 'en';
    if (navLang.startsWith('fa') || navLang.startsWith('ir')) return 'fa';
    return DEFAULT_LANG;
  }

  function applyDirAndLang(lang) {
    var html = document.documentElement;
    if (!html) return;
    html.lang = lang;
    if (lang === 'fa') {
      html.dir = 'rtl';
      html.classList.add('lang-rtl');
    } else {
      html.dir = 'ltr';
      html.classList.remove('lang-rtl');
    }
  }

  function applyTranslations() {
    if (!translations) return;

    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      if (!key) return;
      var value = translations[key];
      if (typeof value === 'string') {
        el.textContent = value;
      }
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-placeholder');
      if (!key) return;
      var value = translations[key];
      if (typeof value === 'string') {
        el.setAttribute('placeholder', value);
      }
    });

    document.querySelectorAll('[data-i18n-title]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-title');
      if (!key) return;
      var value = translations[key];
      if (typeof value === 'string') {
        el.setAttribute('title', value);
      }
    });

    var langBtns = document.querySelectorAll('[data-lang-switch]');
    langBtns.forEach(function (btn) {
      var bLang = btn.getAttribute('data-lang-switch');
      if (!bLang) return;
      if (bLang === currentLang) btn.classList.add('is-active');
      else btn.classList.remove('is-active');
    });
    var dropdownBtn = document.querySelector('.lang-dropdown-btn');
    if (dropdownBtn) dropdownBtn.textContent = (currentLang || 'tr').toUpperCase();
  }

  function getLangBase() {
    try {
      var script = document.querySelector('script[src*="i18n.js"]');
      if (script && script.src) {
        var base = script.src.replace(/\/[^/]*$/, '/').replace(/\/js\/?$/, '/');
        return base;
      }
    } catch (e) {}
    return window.location.origin + (window.location.pathname.replace(/\/[^/]*$/, '') || '') + '/';
  }

  function loadLang(lang) {
    if (SUPPORTED.indexOf(lang) === -1) lang = DEFAULT_LANG;
    if (lang === currentLang && Object.keys(translations).length) {
      applyDirAndLang(lang);
      applyTranslations();
      try { window.__applyI18n = applyTranslations; } catch (e) {}
      return;
    }
    currentLang = lang;
    applyDirAndLang(lang);

    var langUrl = getLangBase() + 'lang/' + lang + '.json';
    fetch(langUrl, { cache: 'no-cache' })
      .then(function (res) {
        if (!res.ok) throw new Error('lang load failed');
        return res.json();
      })
      .then(function (json) {
        translations = json || {};
        applyTranslations();
        try { window.__applyI18n = applyTranslations; } catch (e) {}
      })
      .catch(function (err) {
        translations = {};
        applyTranslations();
        try { window.__applyI18n = applyTranslations; } catch (e) {}
        if (window.location.protocol === 'file:') {
          console.warn('Dil dosyaları file:// ile çalışmaz. Siteyi bir sunucu üzerinden açın (örn. npm start).');
        }
      });
  }

  document.addEventListener('DOMContentLoaded', function () {
    var initial = detectInitialLang();
    currentLang = initial;

    var dropdown = document.querySelector('.lang-dropdown');
    var dropdownBtn = document.querySelector('.lang-dropdown-btn');
    var dropdownMenu = document.querySelector('.lang-dropdown-menu');
    if (dropdown && dropdownBtn && dropdownMenu) {
      dropdownBtn.textContent = (initial || 'tr').toUpperCase();
      dropdownBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        dropdown.classList.toggle('open');
      });
      document.addEventListener('click', function () {
        dropdown.classList.remove('open');
      });
      dropdownMenu.addEventListener('click', function (e) { e.stopPropagation(); });
    }

    document.querySelectorAll('[data-lang-switch]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var lang = btn.getAttribute('data-lang-switch');
        if (!lang || SUPPORTED.indexOf(lang) === -1) return;
        if (lang === currentLang) {
          if (dropdown) dropdown.classList.remove('open');
          return;
        }
        try {
          window.localStorage.setItem('app_lang', lang);
        } catch (e) {}
        if (dropdown) dropdown.classList.remove('open');
        window.location.reload();
      });
    });

    loadLang(initial);
  });
})();

