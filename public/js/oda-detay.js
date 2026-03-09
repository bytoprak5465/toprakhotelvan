(function() {
  var params = new URLSearchParams(location.search);
  var id = params.get('id');
  var roomContent = document.getElementById('room-content');

  function escapeHtml(s) { if (!s) return ''; var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

  var roomSliderImages = [];

  function initRoomSlider() {
    var slider = document.getElementById('room-slider');
    if (!slider) return;
    var slides = slider.querySelectorAll('.room-slide');
    var total = slides.length;
    var wrap = slider.parentElement;
    var prevBtn = wrap.querySelector('.room-slider-prev');
    var nextBtn = wrap.querySelector('.room-slider-next');
    var dots = wrap.querySelectorAll('.room-slider-dots span');
    function getIndex() {
      var w = slider.offsetWidth;
      return Math.min(total - 1, Math.max(0, Math.round(slider.scrollLeft / w)));
    }
    function goTo(i) {
      var w = slider.offsetWidth;
      slider.scrollTo({ left: w * i, behavior: 'smooth' });
      if (dots.length) dots.forEach(function(d, j) { d.classList.toggle('active', j === i); });
      var counter = document.getElementById('room-slider-counter');
      if (counter) counter.textContent = (i + 1) + ' / ' + total;
    }
    function updateDots() {
      var i = getIndex();
      if (i >= 0 && dots.length) dots.forEach(function(d, j) { d.classList.toggle('active', j === i); });
      var counter = document.getElementById('room-slider-counter');
      if (counter) counter.textContent = (i + 1) + ' / ' + total;
    }
    if (prevBtn) prevBtn.addEventListener('click', function() { var i = Math.max(0, getIndex() - 1); goTo(i); });
    if (nextBtn) nextBtn.addEventListener('click', function() { var i = Math.min(total - 1, getIndex() + 1); goTo(i); });
    dots.forEach(function(d) {
      d.addEventListener('click', function() { var i = parseInt(d.getAttribute('data-index'), 10); goTo(i); });
    });
    slider.addEventListener('scroll', function() { requestAnimationFrame(updateDots); });
    slides.forEach(function(slide, idx) {
      var img = slide.querySelector('img');
      if (img && roomSliderImages.length) {
        img.addEventListener('click', function() { openLightbox(idx); });
      }
    });
  }

  function openLightbox(index) {
    var lb = document.getElementById('room-lightbox');
    if (!lb || !roomSliderImages.length) return;
    var img = lb.querySelector('.room-lightbox-img');
    var prevBtn = lb.querySelector('.room-lightbox-prev');
    var nextBtn = lb.querySelector('.room-lightbox-next');
    var total = roomSliderImages.length;
    function show(i) {
      var idx = (i + total) % total;
      lb.dataset.currentIndex = idx;
      img.src = roomSliderImages[idx];
      img.alt = '';
      prevBtn.style.display = total > 1 ? 'flex' : 'none';
      nextBtn.style.display = total > 1 ? 'flex' : 'none';
    }
    show(index);
    lb.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    prevBtn.onclick = function() { show(parseInt(lb.dataset.currentIndex, 10) - 1); };
    nextBtn.onclick = function() { show(parseInt(lb.dataset.currentIndex, 10) + 1); };
    lb.querySelector('.room-lightbox-close').onclick = closeLightbox;
    lb.onclick = function(e) { if (e.target === lb) closeLightbox(); };
    lb.querySelector('.room-lightbox-img').onclick = function(e) { e.stopPropagation(); };
    function onKey(e) {
      if (e.key === 'Escape') { closeLightbox(); document.removeEventListener('keydown', onKey); }
    }
    document.addEventListener('keydown', onKey);
  }

  function closeLightbox() {
    var lb = document.getElementById('room-lightbox');
    if (lb) { lb.classList.remove('is-open'); document.body.style.overflow = ''; }
  }

  if (!id) {
    roomContent.innerHTML = '<p class="section-subtitle">Oda bulunamadı.</p>';
    return;
  }

  fetch('/api/rooms/' + id).then(function(r) { return r.json(); }).then(function(room) {
    if (!room || !room.id) {
      roomContent.innerHTML = '<p class="section-subtitle">Oda bulunamadı.</p>';
      return;
    }
    document.title = room.name + ' — Toprak Otel';
    var images = room.images && room.images.length ? room.images : [];
    roomSliderImages = images.map(function(src) { return src.replace(/^\//, location.origin + '/'); });
    var galleryHtml = '';
    var arrowLeft = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>';
    var arrowRight = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>';
    if (images.length > 0) {
      var slides = roomSliderImages.map(function(full) {
        return '<div class="room-slide"><img src="' + full + '" alt=""></div>';
      }).join('');
      var dotsHtml = images.map(function(_, i) { return '<span data-index="' + i + '"' + (i === 0 ? ' class="active"' : '') + '></span>'; }).join('');
      var counterHtml = images.length > 1 ? '<span class="room-slider-counter" id="room-slider-counter">1 / ' + images.length + '</span>' : '';
      var nav = images.length > 1
        ? '<button type="button" class="room-slider-arrow room-slider-prev" aria-label="Önceki">' + arrowLeft + '</button>' +
          '<button type="button" class="room-slider-arrow room-slider-next" aria-label="Sonraki">' + arrowRight + '</button>' +
          '<div class="room-slider-dots-wrap"><div class="room-slider-dots">' + dotsHtml + '</div>' + counterHtml + '</div>'
        : '';
      galleryHtml = '<div class="room-slider-outer"><div class="room-slider-wrap"><div class="room-slider" id="room-slider">' + slides + '</div>' + nav + '</div></div>';
      var lb = document.getElementById('room-lightbox');
      if (!lb) {
        lb = document.createElement('div');
        lb.id = 'room-lightbox';
        lb.className = 'room-lightbox';
        lb.innerHTML = '<button type="button" class="room-lightbox-close" aria-label="Kapat">&times;</button>' +
          '<button type="button" class="room-lightbox-prev" aria-label="Önceki">' + arrowLeft + '</button>' +
          '<img class="room-lightbox-img" alt="">' +
          '<button type="button" class="room-lightbox-next" aria-label="Sonraki">' + arrowRight + '</button>';
        document.body.appendChild(lb);
      }
    } else {
      galleryHtml = '<div class="room-slider-outer"><div class="room-slider-wrap"><div class="room-slider"><div class="room-slide"><div style="height:100%;min-height:280px;background:linear-gradient(135deg,#2d3748,#4a5568);"></div></div></div></div></div>';
    }
    var capacityNum = room.capacity != null ? room.capacity : 2;
    var capacityCardHtml = '<div class="room-detail-card"><h3><span class="room-detail-card-icon" aria-hidden="true">👤</span>Kapasite</h3><div class="room-detail-capacity-wrap">Max. <strong>' + capacityNum + '</strong> kişi</div></div>';
    var descCardHtml = '<div class="room-detail-card"><h3><span class="room-detail-card-icon" aria-hidden="true">📝</span>Açıklama</h3><p class="room-detail-desc">' + (room.description ? escapeHtml(room.description) : 'Bu oda hakkında bilgi eklenmemiş.') + '</p></div>';
    var featuresList = room.features && room.features.length ? room.features : [];
    var featuresTagsHtml = featuresList.length ? '<div class="room-detail-card"><h3><span class="room-detail-card-icon" aria-hidden="true">✨</span>Hizmetler & Özellikler</h3><ul class="room-features-tags">' + featuresList.map(function(f) { return '<li>' + escapeHtml(f) + '</li>'; }).join('') + '</ul></div>' : '';
    var rezervasyonUrl = 'rezervasyon.html?room=' + encodeURIComponent(room.id);
    var ctaHtml = '<div class="room-cta-wrap"><a href="' + rezervasyonUrl + '" class="btn btn-primary" data-i18n="roomDetail.rezervasyonYap">Rezervasyon Yap</a></div>';
    var overviewHtml = '';
    if (typeof window.buildHotelOverviewHTML !== 'undefined') {
      Promise.resolve().then(function() { return fetch((typeof API !== 'undefined' ? API : '') + '/api/settings').then(function(r) { return r.json(); }); }).then(function(settings) {
        var data = settings && settings.hotelOverview ? settings.hotelOverview : null;
        overviewHtml = window.buildHotelOverviewHTML(data) || (window.HOTEL_OVERVIEW_HTML_DEFAULT || '');
        var wrap = document.getElementById('room-content');
        if (wrap) { var last = wrap.querySelector('.room-description-block'); if (last) last.insertAdjacentHTML('afterend', overviewHtml); }
      }).catch(function() {
        var wrap = document.getElementById('room-content');
        if (wrap && window.HOTEL_OVERVIEW_HTML_DEFAULT) { var last = wrap.querySelector('.room-description-block'); if (last) last.insertAdjacentHTML('afterend', window.HOTEL_OVERVIEW_HTML_DEFAULT); }
      });
    } else {
      overviewHtml = (typeof window.HOTEL_OVERVIEW_HTML_DEFAULT !== 'undefined') ? window.HOTEL_OVERVIEW_HTML_DEFAULT : '';
    }
    roomContent.innerHTML =
      galleryHtml +
      '<div class="room-detail-body container">' +
      '<div class="room-detail-title-wrap"><h1 class="room-detail-title">' + escapeHtml(room.name) + '</h1></div>' +
      '<div class="room-description-block">' +
      '<div class="room-detail-info">' +
      capacityCardHtml +
      descCardHtml +
      (featuresTagsHtml || '') +
      '</div>' +
      (room.active === false ? '<p style="color:var(--text-muted); margin-top:1rem;">Şu an rezervasyona kapalı.</p>' : '') +
      (room.active !== false ? ctaHtml : '') +
      '</div></div>' +
      overviewHtml;
    initRoomSlider();
    if (window.__applyI18n) window.__applyI18n();
  }).catch(function() {
    roomContent.innerHTML = '<p class="section-subtitle">Oda bilgisi yüklenemedi.</p>';
  });
})();
