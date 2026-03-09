(function() {
  function escapeHtml(s) { if (!s) return ''; var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
  function get(u) { return fetch(u).then(function(r) { return r.json(); }); }

  function getRoomFirstImageUrl(room) {
    if (!room) return '';
    var imgs = room.images;
    if (Array.isArray(imgs)) {
      for (var i = 0; i < imgs.length; i++) {
        var u = imgs[i];
        if (u != null && String(u).trim() !== '') return String(u).trim();
      }
      return '';
    }
    if (typeof imgs === 'string' && imgs.trim() !== '') return imgs.trim();
    return '';
  }
  function normalizeImageUrl(url) {
    if (!url || typeof url !== 'string') return '';
    var u = url.trim();
    if (u.indexOf('http') === 0) {
      try {
        var a = document.createElement('a');
        a.href = u;
        u = a.pathname || u;
      } catch (_) { u = u.replace(/^https?:\/\/[^/]+/, ''); }
    }
    if (u.charAt(0) !== '/') u = '/' + u;
    return location.origin + u;
  }

  get('/api/rooms').then(function(rooms) {
    var wrap = document.getElementById('rooms-list');
    if (!wrap) return;
    if (!rooms || rooms.length === 0) {
      wrap.innerHTML = '<p class="section-subtitle">Henüz oda eklenmemiş.</p>';
      return;
    }
    var placeholder = 'linear-gradient(135deg, #2d3748 0%, #4a5568 100%)';
    wrap.innerHTML = rooms.map(function(r) {
      var img = getRoomFirstImageUrl(r);
      var fullUrl = img ? normalizeImageUrl(img) : '';
      var inner = '';
      if (fullUrl) {
        inner = '<img src="' + fullUrl.replace(/"/g, '&quot;') + '" alt="" class="card-image-img" onerror="this.onerror=null;this.style.display=\'none\';if(this.nextElementSibling)this.nextElementSibling.style.display=\'block\'"><div class="card-image-fallback" style="display:none;background:' + placeholder + '"></div>';
      }
      return '<article class="card animate-on-scroll">' +
        '<div class="card-image" style="background:' + placeholder + '">' + inner + '</div>' +
        '<div class="card-body">' +
        '<h2 class="card-title">' + escapeHtml(r.name) + '</h2>' +
        '<p class="card-desc">' + escapeHtml((r.description || '').slice(0, 120)) + (r.description && r.description.length > 120 ? '…' : '') + '</p>' +
        '<a href="oda-detay.html?id=' + r.id + '" class="btn btn-primary" data-i18n="rooms.viewDetails">Detayları Gör</a>' +
        '</div></article>';
    }).join('');
    document.querySelectorAll('.animate-on-scroll').forEach(function(el) {
      if (window.IntersectionObserver) {
        var o = new IntersectionObserver(function(entries) { entries.forEach(function(e) { if (e.isIntersecting) e.target.classList.add('visible'); }); }, { threshold: 0.1 });
        o.observe(el);
      } else el.classList.add('visible');
    });
    if (typeof window.__applyI18n === 'function') window.__applyI18n();
  }).catch(function() {
    document.getElementById('rooms-list').innerHTML = '<p class="section-subtitle">Odalar yüklenemedi.</p>';
  });
})();
