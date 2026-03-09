(function() {
  var API = '';
  function get(u) { return fetch(API + u).then(function(r) { return r.json(); }); }

  function renderHero(slider) {
    var wrap = document.querySelector('.hero-slider');
    if (!wrap) return;
    if (!slider || slider.length === 0) {
      wrap.innerHTML = '<div class="hero-slide active" style="background-image: linear-gradient(135deg, #1a365d 0%, #2c5282 100%);"></div>' +
        '<div class="hero-dots"></div>';
      wrap.querySelector('.hero-slide').style.backgroundImage = 'linear-gradient(135deg, #1a365d 0%, #2c5282 100%)';
      if (document.querySelector('.hero-title')) document.querySelector('.hero-title').textContent = 'Konforunuz Bizim Önceliğimiz';
      if (document.querySelector('.hero-subtitle')) document.querySelector('.hero-subtitle').textContent = 'Hoş geldiniz';
      document.querySelector('.slider-js') && document.querySelector('.slider-js').remove();
      return;
    }
    wrap.innerHTML = '';
    slider.forEach(function(s, i) {
      var div = document.createElement('div');
      div.className = 'hero-slide' + (i === 0 ? ' active' : '');
      var imgUrl = (s.imageUrl || '').trim();
      var fullUrl = imgUrl ? imgUrl.replace(/^\//, window.location.origin + '/') : '';
      if (imgUrl && fullUrl) {
        div.style.backgroundImage = 'url(' + fullUrl + ')';
        div.style.backgroundSize = 'cover';
        div.style.backgroundPosition = 'center top';
      } else {
        div.style.backgroundImage = 'linear-gradient(135deg, #1a365d 0%, #2c5282 100%)';
      }
      div.dataset.title = s.title || '';
      div.dataset.subtitle = s.subtitle || '';
      wrap.appendChild(div);
    });
    var dots = document.createElement('div');
    dots.className = 'hero-dots';
    wrap.appendChild(dots);
    var titleEl = document.querySelector('.hero-title');
    var subEl = document.querySelector('.hero-subtitle');
    if (titleEl && slider[0]) titleEl.textContent = slider[0].title || 'Konforunuz Bizim Önceliğimiz';
    if (subEl && slider[0]) subEl.textContent = slider[0].subtitle || 'Hoş geldiniz';
    if (typeof window.initHeroSlider === 'function') window.initHeroSlider();
  }

  function renderIntro(settings) {
    var el = document.getElementById('intro-text');
    if (el && settings && settings.introText) el.textContent = settings.introText;
  }

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
    return window.location.origin + u;
  }

  function renderFeatured(rooms) {
    var wrap = document.getElementById('featured-rooms');
    if (!wrap) return;
    if (!rooms || rooms.length === 0) {
      wrap.innerHTML = '<p class="section-subtitle">Henüz öne çıkan oda eklenmemiş.</p>';
      return;
    }
    wrap.innerHTML = rooms.map(function(r) {
      var img = getRoomFirstImageUrl(r);
      var fullUrl = img ? normalizeImageUrl(img) : '';
      var placeholder = 'linear-gradient(135deg, #2d3748 0%, #4a5568 100%)';
      var inner = '';
      if (fullUrl) {
        inner = '<img src="' + fullUrl.replace(/"/g, '&quot;') + '" alt="" class="card-image-img" onerror="this.onerror=null;this.style.display=\'none\';if(this.nextElementSibling)this.nextElementSibling.style.display=\'block\'"><div class="card-image-fallback" style="display:none;background:' + placeholder + '"></div>';
      }
      return '<article class="card animate-on-scroll">' +
        '<div class="card-image" style="background:' + placeholder + '">' + inner + '</div>' +
        '<div class="card-body">' +
        '<h3 class="card-title">' + escapeHtml(r.name) + '</h3>' +
        '<p class="card-desc">' + escapeHtml((r.description || '').slice(0, 100)) + (r.description && r.description.length > 100 ? '…' : '') + '</p>' +
        '<a href="oda-detay.html?id=' + r.id + '" class="btn btn-primary">Detayları Gör</a>' +
        '</div></article>';
    }).join('');
    var wrapParent = wrap.closest('.featured-rooms-wrap');
    if (wrapParent) {
      var prevBtn = wrapParent.querySelector('.featured-scroll-prev');
      var nextBtn = wrapParent.querySelector('.featured-scroll-next');
      var gap = 28;
      if (prevBtn) prevBtn.addEventListener('click', function() {
        var card = wrap.querySelector('.card');
        var step = card ? card.offsetWidth + gap : 448;
        wrap.scrollBy({ left: -step, behavior: 'smooth' });
      });
      if (nextBtn) nextBtn.addEventListener('click', function() {
        var card = wrap.querySelector('.card');
        var step = card ? card.offsetWidth + gap : 448;
        wrap.scrollBy({ left: step, behavior: 'smooth' });
      });
    }
    document.querySelectorAll('.animate-on-scroll').forEach(function(el) {
      if (window.IntersectionObserver) {
        var o = new IntersectionObserver(function(entries) {
          entries.forEach(function(e) { if (e.isIntersecting) e.target.classList.add('visible'); });
        }, { threshold: 0.1 });
        o.observe(el);
      } else el.classList.add('visible');
    });
  }

  function renderTestimonials(list) {
    var wrap = document.getElementById('testimonials-list');
    if (!wrap) return;
    if (!list || list.length === 0) {
      wrap.innerHTML = '<p class="section-subtitle">Henüz yorum eklenmemiş.</p>';
      return;
    }
    wrap.innerHTML = list.map(function(t) {
      var imageUrl = (t.imageUrl != null ? t.imageUrl : t.image_url) || '';
      var hasImage = !!(imageUrl && String(imageUrl).trim());
      var imgSrc = hasImage ? (String(imageUrl).indexOf('http') === 0 ? imageUrl : (imageUrl.charAt(0) === '/' ? imageUrl : '/' + imageUrl)) : '';
      var hasText = !!(t.text && t.text.trim());
      var hasAuthor = !!(t.author && t.author.trim());
      var hasRating = (t.rating != null && t.rating > 0);
      var isImageOnly = hasImage && !hasText && !hasAuthor;
      if (isImageOnly && imgSrc) {
        return '<div class="testimonial-card testimonial-card-image-only animate-on-scroll">' +
          '<div class="testimonial-image-wrap"><button type="button" class="testimonial-image-link" title="Resmi büyüt" data-lightbox-src="' + escapeHtml(imgSrc) + '"><img src="' + escapeHtml(imgSrc) + '" alt="Yorum ekran görüntüsü" loading="lazy" onerror="this.onerror=null; this.style.display=\'none\'; this.nextElementSibling && (this.nextElementSibling.style.display=\'block\');"><span class="testimonial-image-fallback" style="display:none; padding:1rem; color:var(--text-muted); font-size:0.9rem;">Resim yüklenemedi</span></button></div></div>';
      }
      var stars = hasRating ? ('★'.repeat(t.rating || 5) + '☆'.repeat(5 - (t.rating || 5))) : '';
      var imgHtml = imgSrc ? '<div class="testimonial-avatar-wrap"><img src="' + escapeHtml(imgSrc) + '" alt="" class="testimonial-avatar" loading="lazy" onerror="this.parentElement.style.display=\'none\'"></div>' : '';
      return '<div class="testimonial-card animate-on-scroll">' +
        imgHtml +
        (stars ? '<div class="testimonial-stars">' + stars + '</div>' : '') +
        (hasText ? '<p class="testimonial-text">' + escapeHtml(t.text) + '</p>' : '') +
        (hasAuthor ? '<span class="testimonial-author">— ' + escapeHtml(t.author) + '</span>' : '') + '</div>';
    }).join('');
    document.querySelectorAll('#testimonials-list .animate-on-scroll').forEach(function(el) {
      if (window.IntersectionObserver) {
        var o = new IntersectionObserver(function(entries) {
          entries.forEach(function(e) { if (e.isIntersecting) e.target.classList.add('visible'); });
        }, { threshold: 0.1 });
        o.observe(el);
      } else el.classList.add('visible');
    });
    initTestimonialLightbox(wrap);
  }

  function initTestimonialLightbox(container) {
    if (!container) return;
    var overlay = document.getElementById('testimonial-lightbox');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'testimonial-lightbox';
      overlay.className = 'testimonial-lightbox';
      overlay.innerHTML = '<button type="button" class="testimonial-lightbox-close" aria-label="Kapat">×</button><div class="testimonial-lightbox-inner"><img src="" alt="Büyütülmüş görüntü"></div>';
      document.body.appendChild(overlay);
      overlay.addEventListener('click', function(e) {
        if (e.target === overlay || e.target.classList.contains('testimonial-lightbox-close')) overlay.classList.remove('open');
      });
      overlay.querySelector('.testimonial-lightbox-inner').addEventListener('click', function(e) { e.stopPropagation(); });
      document.addEventListener('keydown', function onKey(e) {
        if (e.key === 'Escape' && overlay.classList.contains('open')) overlay.classList.remove('open');
      });
    }
    container.addEventListener('click', function(e) {
      var btn = e.target.closest('.testimonial-image-link[data-lightbox-src]');
      if (!btn) return;
      e.preventDefault();
      var src = btn.getAttribute('data-lightbox-src');
      if (src) {
        overlay.querySelector('img').src = src;
        overlay.classList.add('open');
      }
    });
  }

  function escapeHtml(s) {
    if (!s) return '';
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function renderGallery(items) {
    var wrap = document.getElementById('gallery-grid');
    var section = document.getElementById('galeri');
    if (!wrap) return;
    if (!items || items.length === 0) {
      if (section) section.style.display = 'none';
      return;
    }
    if (section) section.style.display = '';
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

  function initGalleryLightbox() {
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
    document.addEventListener('keydown', function(e) { if (e.key === 'Escape' && lb.classList.contains('open')) close(); });
  }

  var SERVICES = [
    { id: 'kahvalti', icon: '☕', title: 'Kahvaltı', shortDesc: 'Zengin açık büfe kahvaltı', detail: 'Her sabah taze ve zengin açık büfe kahvaltımızla güne başlayın. Sıcak ve soğuk lezzetler, ev yapımı reçeller ve bölgeye özel ürünlerle konforunuzu tamamlıyoruz.' },
    { id: 'otopark', icon: '🅿️', title: 'Otopark', shortDesc: 'Ücretsiz kapalı otopark', detail: 'Otelimizde misafirlerimiz için ücretsiz kapalı otopark imkânı sunuyoruz. Aracınız güvenle park edebilir; bölgede nadir bulunan bu hizmetle konforunuzu artırıyoruz.' },
    { id: 'wifi', icon: '📶', title: 'Ücretsiz Wi-Fi', shortDesc: 'Tüm otel alanında hızlı internet', detail: 'Otelimizin tüm alanında ücretsiz ve hızlı Wi-Fi hizmeti veriyoruz. Odanızda, lobide ve ortak alanlarda kesintisiz bağlantı ile iş ve iletişim ihtiyaçlarınızı karşılayın.' },
    { id: 'restoran', icon: '🍽️', title: 'Restoran', shortDesc: 'Yerel ve uluslararası mutfak', detail: 'Restoranımızda yerel lezzetler ve uluslararası mutfak seçenekleri sunuyoruz. Taze malzemelerle hazırlanan yemeklerimizi deneyimleyin.' },
    { id: 'oda-servisi', icon: '🛎️', title: 'Oda Servisi', shortDesc: '24 saat oda servisi', detail: 'Konforunuz için 24 saat oda servisi hizmeti sunuyoruz. İstediğiniz saatte odanızda yemek ve içecek siparişi verebilirsiniz.' },
    { id: 'resepsiyon', icon: '🏨', title: 'Resepsiyon 7/24', shortDesc: 'Kesintisiz resepsiyon hizmeti', detail: 'Resepsiyon ekibimiz 7 gün 24 saat hizmetinizdedir. Giriş-çıkış, bilgi ve destek talepleriniz için her an yanınızdayız.' }
  ];

  function renderServices(servicesList) {
    var wrap = document.getElementById('services-slider');
    if (!wrap) return;
    var list = servicesList && Array.isArray(servicesList) && servicesList.length > 0 ? servicesList : SERVICES;
    wrap.innerHTML = list.map(function(s) {
      var id = s.id || '';
      var title = s.title || '';
      var shortDesc = (s.shortDesc != null ? s.shortDesc : s.short_desc) || '';
      var detail = s.detail || '';
      var icon = s.icon || '⭐';
      var imageUrl = (s.imageUrl != null ? s.imageUrl : s.image_url) || '';
      var fullImageUrl = '';
      if (imageUrl && imageUrl.trim()) {
        fullImageUrl = imageUrl.indexOf('http') === 0 ? imageUrl : (window.location.origin + (imageUrl.indexOf('/') === 0 ? imageUrl : '/' + imageUrl));
      }
      var mediaHtml = fullImageUrl
        ? '<div class="services-card-image"><img src="' + escapeHtml(fullImageUrl) + '" alt="" loading="lazy" onerror="this.style.display=\'none\';this.nextElementSibling&&(this.nextElementSibling.style.display=\'flex\')"><div class="services-card-icon services-card-icon-fallback" style="display:none">' + escapeHtml(icon) + '</div></div>'
        : '<div class="services-card-icon">' + escapeHtml(icon) + '</div>';
      return '<button type="button" class="services-card animate-on-scroll" data-service-id="' + escapeHtml(id) + '" data-service-title="' + escapeHtml(title) + '" data-service-detail="' + escapeHtml(detail).replace(/"/g, '&quot;') + '">' +
        mediaHtml +
        '<div class="services-card-body">' +
        '<h4 class="services-card-title">' + escapeHtml(title) + '</h4>' +
        '<p class="services-card-desc">' + escapeHtml(shortDesc) + '</p>' +
        '<span class="services-card-btn"><span data-i18n="services.detailBtn">Detayları Gör</span> →</span>' +
        '</div></button>';
    }).join('');

    document.querySelectorAll('#services-slider .animate-on-scroll').forEach(function(el) {
      if (window.IntersectionObserver) {
        var o = new IntersectionObserver(function(entries) {
          entries.forEach(function(e) { if (e.isIntersecting) e.target.classList.add('visible'); });
        }, { threshold: 0.1 });
        o.observe(el);
      } else el.classList.add('visible');
    });
    if (typeof window.__applyI18n === 'function') window.__applyI18n();
  }

  function bindServicesSliderEvents() {
    var wrap = document.getElementById('services-slider');
    var wrapParent = wrap && wrap.closest('.services-slider-wrap');
    if (!wrapParent) return;
    var prevBtn = wrapParent.querySelector('.services-scroll-prev');
    var nextBtn = wrapParent.querySelector('.services-scroll-next');
    if (prevBtn && !prevBtn._bound) {
      prevBtn._bound = true;
      prevBtn.addEventListener('click', function() {
        var card = wrap.querySelector('.services-card');
        var step = card ? card.offsetWidth + 28 : 320;
        wrap.scrollBy({ left: -step, behavior: 'smooth' });
      });
    }
    if (nextBtn && !nextBtn._bound) {
      nextBtn._bound = true;
      nextBtn.addEventListener('click', function() {
        var card = wrap.querySelector('.services-card');
        var step = card ? card.offsetWidth + 28 : 320;
        wrap.scrollBy({ left: step, behavior: 'smooth' });
      });
    }
    if (wrap && !wrap._clickBound) {
      wrap._clickBound = true;
      wrap.addEventListener('click', function(e) {
        var card = e.target.closest('.services-card[data-service-id]');
        if (!card) return;
        var title = card.getAttribute('data-service-title');
        var detail = card.getAttribute('data-service-detail');
        if (detail) detail = detail.replace(/&quot;/g, '"');
        var modal = document.getElementById('service-detail-modal');
        if (!modal) return;
        var titleEl = modal.querySelector('.service-detail-modal-title');
        var bodyEl = modal.querySelector('.service-detail-modal-body');
        if (titleEl) titleEl.textContent = title || '';
        if (bodyEl) bodyEl.textContent = detail || '';
        modal.setAttribute('aria-hidden', 'false');
        modal.classList.add('open');
        document.body.style.overflow = 'hidden';
      });
    }
  }

  function initServiceModal() {
    var modal = document.getElementById('service-detail-modal');
    if (!modal) return;
    var backdrop = modal.querySelector('.service-detail-modal-backdrop');
    var closeBtn = modal.querySelector('.service-detail-modal-close');
    function closeModal() {
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }
    if (backdrop) backdrop.addEventListener('click', closeModal);
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && modal.classList.contains('open')) closeModal();
    });
  }

  function initHeroBookingWidget() {
    var form = document.getElementById('hero-booking-form');
    if (!form) return;
    var checkIn = document.getElementById('hero-checkin');
    var checkOut = document.getElementById('hero-checkout');
    var roomsEl = document.getElementById('hero-rooms');
    var adultsEl = document.getElementById('hero-adults');
    var childrenUnder6El = document.getElementById('hero-children-under6');
    var children6PlusEl = document.getElementById('hero-children-6plus');
    var summaryEl = document.getElementById('hero-guests-summary');
    var trigger = document.getElementById('hero-guests-trigger');
    var overlay = document.getElementById('hero-guests-modal-overlay');
    var modalAdultsVal = document.getElementById('hero-modal-adults-value');
    var modalChildrenVal = document.getElementById('hero-modal-children-value');
    var modalRoomsVal = document.getElementById('hero-modal-rooms-value');
    var modalAdultsMinus = document.getElementById('hero-modal-adults-minus');
    var modalAdultsPlus = document.getElementById('hero-modal-adults-plus');
    var modalChildrenMinus = document.getElementById('hero-modal-children-minus');
    var modalChildrenPlus = document.getElementById('hero-modal-children-plus');
    var modalRoomsMinus = document.getElementById('hero-modal-rooms-minus');
    var modalRoomsPlus = document.getElementById('hero-modal-rooms-plus');
    var modalReset = document.getElementById('hero-guests-modal-reset');
    var modalApply = document.getElementById('hero-guests-modal-apply');

    function todayStr() {
      var d = new Date();
      return d.getFullYear() + '-' + (d.getMonth() + 1 < 10 ? '0' : '') + (d.getMonth() + 1) + '-' + (d.getDate() < 10 ? '0' : '') + d.getDate();
    }
    if (checkIn) {
      checkIn.setAttribute('min', todayStr());
      checkIn.addEventListener('change', function() {
        if (checkOut && checkIn.value) checkOut.setAttribute('min', checkIn.value);
      });
    }
    if (checkOut) checkOut.setAttribute('min', todayStr());

    function updateHeroGuestsSummary() {
      var r = parseInt(roomsEl && roomsEl.value ? roomsEl.value : 1, 10) || 1;
      var a = parseInt(adultsEl && adultsEl.value ? adultsEl.value : 2, 10) || 2;
      var u6 = parseInt(childrenUnder6El && childrenUnder6El.value !== '' ? childrenUnder6El.value : 0, 10) || 0;
      var s6 = parseInt(children6PlusEl && children6PlusEl.value !== '' ? children6PlusEl.value : 0, 10) || 0;
      var total = a + u6 + s6;
      if (summaryEl) summaryEl.textContent = total + ' Misafir, ' + r + ' Oda';
    }

    function openHeroModal() {
      var a = parseInt(adultsEl && adultsEl.value ? adultsEl.value : 2, 10) || 2;
      var c = (parseInt(childrenUnder6El && childrenUnder6El.value ? childrenUnder6El.value : 0, 10) || 0) + (parseInt(children6PlusEl && children6PlusEl.value ? children6PlusEl.value : 0, 10) || 0);
      var r = parseInt(roomsEl && roomsEl.value ? roomsEl.value : 1, 10) || 1;
      if (modalAdultsVal) modalAdultsVal.textContent = a;
      if (modalChildrenVal) modalChildrenVal.textContent = c;
      if (modalRoomsVal) modalRoomsVal.textContent = r;
      if (modalAdultsMinus) modalAdultsMinus.disabled = a <= 1;
      if (modalAdultsPlus) modalAdultsPlus.disabled = a >= 20;
      if (modalChildrenMinus) modalChildrenMinus.disabled = c <= 0;
      if (modalChildrenPlus) modalChildrenPlus.disabled = c >= 10;
      if (modalRoomsMinus) modalRoomsMinus.disabled = r <= 1;
      if (modalRoomsPlus) modalRoomsPlus.disabled = r >= 5;
      if (overlay) { overlay.hidden = false; overlay.removeAttribute('hidden'); }
      if (trigger) trigger.setAttribute('aria-expanded', 'true');
    }
    function closeHeroModal() {
      if (overlay) { overlay.hidden = true; overlay.setAttribute('hidden', ''); }
      if (trigger) trigger.setAttribute('aria-expanded', 'false');
    }
    function stepper(valueEl, min, max, delta) {
      var v = parseInt(valueEl.textContent, 10) || min;
      v = Math.min(max, Math.max(min, v + delta));
      valueEl.textContent = v;
      if (valueEl === modalAdultsVal) {
        if (modalAdultsMinus) modalAdultsMinus.disabled = v <= min;
        if (modalAdultsPlus) modalAdultsPlus.disabled = v >= max;
      } else if (valueEl === modalChildrenVal) {
        if (modalChildrenMinus) modalChildrenMinus.disabled = v <= min;
        if (modalChildrenPlus) modalChildrenPlus.disabled = v >= max;
      } else if (valueEl === modalRoomsVal) {
        if (modalRoomsMinus) modalRoomsMinus.disabled = v <= min;
        if (modalRoomsPlus) modalRoomsPlus.disabled = v >= max;
      }
    }

    if (trigger) trigger.addEventListener('click', openHeroModal);
    if (overlay) {
      overlay.addEventListener('click', function(e) {
        if (e.target === overlay) closeHeroModal();
      });
    }
    if (modalAdultsMinus) modalAdultsMinus.addEventListener('click', function() { stepper(modalAdultsVal, 1, 20, -1); });
    if (modalAdultsPlus) modalAdultsPlus.addEventListener('click', function() { stepper(modalAdultsVal, 1, 20, 1); });
    if (modalChildrenMinus) modalChildrenMinus.addEventListener('click', function() { stepper(modalChildrenVal, 0, 10, -1); });
    if (modalChildrenPlus) modalChildrenPlus.addEventListener('click', function() { stepper(modalChildrenVal, 0, 10, 1); });
    if (modalRoomsMinus) modalRoomsMinus.addEventListener('click', function() { stepper(modalRoomsVal, 1, 5, -1); });
    if (modalRoomsPlus) modalRoomsPlus.addEventListener('click', function() { stepper(modalRoomsVal, 1, 5, 1); });
    if (modalReset) modalReset.addEventListener('click', function() {
      if (modalAdultsVal) modalAdultsVal.textContent = '2';
      if (modalChildrenVal) modalChildrenVal.textContent = '0';
      if (modalRoomsVal) modalRoomsVal.textContent = '1';
      if (modalAdultsMinus) modalAdultsMinus.disabled = true;
      if (modalAdultsPlus) modalAdultsPlus.disabled = false;
      if (modalChildrenMinus) modalChildrenMinus.disabled = true;
      if (modalChildrenPlus) modalChildrenPlus.disabled = false;
      if (modalRoomsMinus) modalRoomsMinus.disabled = true;
      if (modalRoomsPlus) modalRoomsPlus.disabled = false;
    });
    if (modalApply) modalApply.addEventListener('click', function() {
      var a = parseInt(modalAdultsVal && modalAdultsVal.textContent ? modalAdultsVal.textContent : 2, 10) || 2;
      var c = parseInt(modalChildrenVal && modalChildrenVal.textContent ? modalChildrenVal.textContent : 0, 10) || 0;
      var r = parseInt(modalRoomsVal && modalRoomsVal.textContent ? modalRoomsVal.textContent : 1, 10) || 1;
      if (adultsEl) adultsEl.value = a;
      if (childrenUnder6El) childrenUnder6El.value = c;
      if (children6PlusEl) children6PlusEl.value = '0';
      if (roomsEl) roomsEl.value = r;
      updateHeroGuestsSummary();
      closeHeroModal();
    });

    if (form) {
      form.addEventListener('submit', function(e) {
        e.preventDefault();
        var checkInVal = checkIn && checkIn.value ? checkIn.value : '';
        var checkOutVal = checkOut && checkOut.value ? checkOut.value : '';
        var rooms = (roomsEl && roomsEl.value) ? encodeURIComponent(roomsEl.value) : '1';
        var adults = (adultsEl && adultsEl.value) ? encodeURIComponent(adultsEl.value) : '2';
        var childrenUnder6 = (childrenUnder6El && childrenUnder6El.value !== '') ? encodeURIComponent(childrenUnder6El.value) : '0';
        var children6Plus = (children6PlusEl && children6PlusEl.value !== '') ? encodeURIComponent(children6PlusEl.value) : '0';
        var qs = [];
        if (checkInVal) qs.push('checkIn=' + encodeURIComponent(checkInVal));
        if (checkOutVal) qs.push('checkOut=' + encodeURIComponent(checkOutVal));
        qs.push('rooms=' + rooms, 'adults=' + adults, 'childrenUnder6=' + childrenUnder6, 'children6Plus=' + children6Plus);
        window.location = 'rezervasyon.html?' + qs.join('&');
      });
    }

    updateHeroGuestsSummary();
  }

  function run() {
    initHeroBookingWidget();
    renderServices();
    initServiceModal();
    bindServicesSliderEvents();
    get('/api/services').then(function(apiList) {
      if (apiList && Array.isArray(apiList) && apiList.length > 0) {
        renderServices(apiList);
      }
    }).catch(function() {});
    Promise.all([get('/api/slider'), get('/api/settings'), get('/api/featured-rooms'), get('/api/testimonials'), get('/api/gallery?home=1')])
      .then(function(arr) {
        renderHero(arr[0]);
        renderIntro(arr[1]);
        renderFeatured(arr[2]);
        renderTestimonials(arr[3]);
        renderGallery(arr[4]);
      })
      .catch(function() {
        renderHero([]);
        renderIntro({ introText: 'Modern konfor ve misafirperverlik.' });
        renderFeatured([]);
        renderTestimonials([]);
        renderGallery([]);
      });
    initGalleryLightbox();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();
