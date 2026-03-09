document.addEventListener('DOMContentLoaded', function() {
  var header = document.querySelector('.site-header');
  var hero = document.querySelector('.hero');
  function onScroll() {
    if (!header) return;
    if (window.scrollY > 16) header.classList.add('is-scrolled');
    else header.classList.remove('is-scrolled');
    if (hero && window.scrollY < 350) header.classList.add('is-over-hero');
    else header.classList.remove('is-over-hero');
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  var navToggle = document.querySelector('.site-nav-toggle');
  var navPanel = document.getElementById('site-nav-panel');
  var navOverlay = document.querySelector('.site-nav-overlay');

  function closeNav() {
    document.body.classList.remove('nav-open');
    if (navToggle) navToggle.setAttribute('aria-expanded', 'false');
  }

  function openNav() {
    document.body.classList.add('nav-open');
    if (navToggle) navToggle.setAttribute('aria-expanded', 'true');
  }

  function toggleNav(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (document.body.classList.contains('nav-open')) closeNav();
    else openNav();
  }

  if (navToggle && navPanel) {
    navToggle.addEventListener('click', toggleNav);

    navPanel.querySelectorAll('a').forEach(function(a) {
      a.addEventListener('click', closeNav);
    });
  }
  if (navOverlay) navOverlay.addEventListener('click', closeNav);
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeNav();
  });

  // Aktif link
  (function markActiveNavLink() {
    var file = (window.location.pathname || '').split('/').pop() || 'index.html';
    var links = document.querySelectorAll('.site-nav-panel a[href].site-link');
    links.forEach(function(a) {
      var href = (a.getAttribute('href') || '').split('#')[0];
      if (!href || href.indexOf('://') !== -1 || href.startsWith('mailto:') || href.startsWith('tel:')) return;
      if (href === file) a.classList.add('is-active');
      else a.classList.remove('is-active');
    });
  })();

  /* Gizli admin: sayfada "admin" yazınca admin paneline yönlendir */
  (function() {
    var secret = 'admin';
    var buffer = '';
    var resetAt = 0;
    var timeout = 2500;
    document.addEventListener('keypress', function(e) {
      buffer += (e.key || '').toLowerCase();
      if (buffer.length > secret.length) buffer = buffer.slice(-secret.length);
      resetAt = Date.now() + timeout;
      if (buffer === secret) {
        buffer = '';
        window.location.href = 'admin/';
      }
    });
    setInterval(function() {
      if (Date.now() > resetAt) buffer = '';
    }, 500);
  })();

  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) entry.target.classList.add('visible');
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.animate-on-scroll').forEach(function(el) { observer.observe(el); });
});
