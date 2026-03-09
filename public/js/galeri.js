(function() {
  function escapeHtml(s) {
    if (!s) return '';
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function render(items) {
    var wrap = document.getElementById('gallery-grid');
    var emptyEl = document.getElementById('gallery-empty');
    if (!wrap) return;
    if (!items || items.length === 0) {
      wrap.innerHTML = '';
      if (emptyEl) emptyEl.style.display = 'block';
      return;
    }
    if (emptyEl) emptyEl.style.display = 'none';
    var origin = window.location.origin || '';
    wrap.innerHTML = items.map(function(item) {
      var url = (item.imageUrl || '').trim();
      var fullUrl = url ? (url.indexOf('http') === 0 ? url : origin + (url.charAt(0) === '/' ? url : '/' + url)) : '';
      var cap = (item.caption || '').trim();
      return '<button type="button" class="gallery-item animate-on-scroll" data-src="' + (fullUrl || '').replace(/"/g, '&quot;') + '" data-caption="' + escapeHtml(cap).replace(/"/g, '&quot;') + '" aria-label="Görseli büyüt">' +
        '<span class="gallery-item-inner" style="background-image:url(' + (fullUrl ? "'" + fullUrl.replace(/'/g, "\\'") + "'" : '') + ')"></span>' +
        (cap ? '<span class="gallery-item-caption">' + escapeHtml(cap) + '</span>' : '') +
        '</button>';
    }).join('');

    wrap.querySelectorAll('.gallery-item').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var src = btn.getAttribute('data-src');
        var caption = btn.getAttribute('data-caption') || '';
        var lb = document.getElementById('gallery-lightbox');
        if (!lb) return;
        var img = lb.querySelector('.gallery-lightbox-img');
        var capEl = lb.querySelector('.gallery-lightbox-caption');
        if (img) img.src = src || '';
        if (img) img.alt = caption;
        if (capEl) capEl.textContent = caption;
        lb.classList.add('open');
        lb.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
      });
    });

    if (!wrap._observerBound && window.IntersectionObserver) {
      wrap._observerBound = true;
      var observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(e) { if (e.isIntersecting) e.target.classList.add('visible'); });
      }, { threshold: 0.1 });
      wrap.querySelectorAll('.animate-on-scroll').forEach(function(el) { observer.observe(el); });
    }
  }

  function initLightbox() {
    var lb = document.getElementById('gallery-lightbox');
    if (!lb) return;
    var closeBtn = lb.querySelector('.gallery-lightbox-close');
    var backdrop = lb.querySelector('.gallery-lightbox-backdrop');
    function close() {
      lb.classList.remove('open');
      lb.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }
    if (closeBtn) closeBtn.addEventListener('click', close);
    if (backdrop) backdrop.addEventListener('click', close);
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && lb.classList.contains('open')) close();
    });
  }

  function run() {
    initLightbox();
    fetch('/api/gallery')
      .then(function(r) { return r.json(); })
      .then(function(list) {
        render(Array.isArray(list) ? list : []);
      })
      .catch(function() {
        render([]);
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
