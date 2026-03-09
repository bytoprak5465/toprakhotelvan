(function() {
  function escapeHtml(s) { if (!s) return ''; var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
  var params = new URLSearchParams(location.search);
  var urlCheckIn = params.get('checkIn') || '';
  var urlCheckOut = params.get('checkOut') || '';
  var urlRooms = params.get('rooms') || '';
  var urlAdults = params.get('adults') || '';
  var urlChildrenUnder6 = params.get('childrenUnder6') || '';
  var urlChildren6Plus = params.get('children6Plus') || '';

  var grid = document.getElementById('rezervasyon-rooms');
  var widgetCheckIn = document.getElementById('rez-widget-checkin');
  var widgetCheckOut = document.getElementById('rez-widget-checkout');
  var widgetRooms = document.getElementById('rez-widget-rooms');
  var widgetAdults = document.getElementById('rez-widget-adults');
  var widgetChildrenUnder6 = document.getElementById('rez-widget-children-under6');
  var widgetChildren6Plus = document.getElementById('rez-widget-children-6plus');

  function getEffectiveGuests(adults, under6, sixPlus) {
    var a = Math.max(1, parseInt(adults, 10) || 1);
    var u6 = Math.max(0, parseInt(under6, 10) || 0);
    var s6 = Math.max(0, parseInt(sixPlus, 10) || 0);
    var freeChild = u6 > 0 ? 1 : 0;
    return a + s6 + Math.max(0, u6 - freeChild);
  }

  function getFilterValues() {
    var checkIn = widgetCheckIn && widgetCheckIn.value ? widgetCheckIn.value : '';
    var checkOut = widgetCheckOut && widgetCheckOut.value ? widgetCheckOut.value : '';
    var rooms = Math.max(1, parseInt(widgetRooms && widgetRooms.value ? widgetRooms.value : 1, 10) || 1);
    var adults = Math.max(1, parseInt(widgetAdults && widgetAdults.value !== '' ? widgetAdults.value : 2, 10) || 2);
    var under6 = Math.max(0, parseInt(widgetChildrenUnder6 && widgetChildrenUnder6.value !== '' ? widgetChildrenUnder6.value : 0, 10) || 0);
    var sixPlus = Math.max(0, parseInt(widgetChildren6Plus && widgetChildren6Plus.value !== '' ? widgetChildren6Plus.value : 0, 10) || 0);
    var guests = getEffectiveGuests(adults, under6, sixPlus);
    return { checkIn: checkIn, checkOut: checkOut, rooms: rooms, adults: adults, childrenUnder6: under6, children6Plus: sixPlus, guests: Math.max(1, guests) };
  }

  function setSlider(card, images, roomId) {
    var wrap = card.querySelector('.rezervasyon-card-image-wrap');
    if (!wrap || !images.length) return;
    var total = images.length;
    var idx = 0;
    var imgEl = wrap.querySelector('img');
    var countEl = wrap.querySelector('.rezervasyon-card-image-count');
    var prevBtn = wrap.querySelector('.rezervasyon-card-image-prev');
    var nextBtn = wrap.querySelector('.rezervasyon-card-image-next');
    function setImg(i) {
      idx = (i + total) % total;
      var src = images[idx].replace(/^\//, location.origin + '/');
      if (imgEl) imgEl.src = src;
      if (countEl) countEl.textContent = (idx + 1) + ' / ' + total;
    }
    if (prevBtn) prevBtn.addEventListener('click', function() { setImg(idx - 1); });
    if (nextBtn) nextBtn.addEventListener('click', function() { setImg(idx + 1); });
    setImg(0);
  }

  function getRoomCombinations(roomList, neededRooms, neededGuests) {
    var out = [];
    function gen(roomIndex, remainingSlots, needGuests, acc) {
      if (roomIndex >= roomList.length) {
        if (remainingSlots === 0 && needGuests <= 0) out.push(acc.slice());
        return;
      }
      if (remainingSlots === 0) {
        if (needGuests <= 0) out.push(acc.slice());
        return;
      }
      var room = roomList[roomIndex];
      var cap = room.capacity != null ? room.capacity : 2;
      var avail = room.availableCount != null ? room.availableCount : 0;
      if (room.active === false) avail = 0;
      var maxQty = Math.min(avail, remainingSlots);
      for (var qty = 0; qty <= maxQty; qty++) {
        if (qty === 0) {
          gen(roomIndex + 1, remainingSlots, needGuests, acc);
          continue;
        }
        var lineTotal = (room.totalPrice != null ? room.totalPrice : 0) * qty;
        acc.push({ roomId: room.id, quantity: qty, room: room, lineTotalPrice: lineTotal });
        gen(roomIndex + 1, remainingSlots - qty, needGuests - qty * cap, acc);
        acc.pop();
      }
    }
    gen(0, neededRooms, neededGuests, []);
    return out;
  }

  function loadRooms() {
    var v = getFilterValues();
    var url = '/api/rooms';
    if (v.checkIn && v.checkOut) url += '?checkIn=' + encodeURIComponent(v.checkIn) + '&checkOut=' + encodeURIComponent(v.checkOut);
    fetch(url).then(function(r) { return r.json(); }).then(function(rooms) {
      if (!grid) return;
      var list = (rooms || []).slice();
      var guests = v.guests || 1;
      var numRooms = v.rooms || 1;
      var countEl = document.getElementById('rezervasyon-results-count');

      if (numRooms === 1) {
        var guestsPerRoom = Math.ceil(guests / numRooms);
        list = list.filter(function(r) {
          var cap = r.capacity != null ? r.capacity : 2;
          var availableCount = r.availableCount != null ? r.availableCount : (r.active !== false ? 999 : 0);
          return cap >= guestsPerRoom && availableCount >= numRooms;
        });
        if (list.length === 0) {
          if (countEl) countEl.textContent = '0 oda bulundu';
          grid.innerHTML = '<p class="rezervasyon-empty">Seçilen tarih ve misafir sayısına uygun oda bulunamadı. Tarih veya misafir sayısını değiştirip tekrar deneyin.</p>';
          return;
        }
      } else {
        list = list.filter(function(r) {
          return r.active !== false && (r.availableCount == null || r.availableCount > 0);
        });
        var combinations = getRoomCombinations(list, numRooms, guests);
        if (combinations.length === 0) {
          if (countEl) countEl.textContent = '0 kombinasyon bulundu';
          grid.innerHTML = '<p class="rezervasyon-empty">Seçilen misafir ve oda sayısına uygun oda kombinasyonu bulunamadı. Tarih veya misafir/oda sayısını değiştirip tekrar deneyin.</p>';
          return;
        }
        var cards = combinations.map(function(combo) {
          var nights = combo[0] && combo[0].room && combo[0].room.nights != null ? combo[0].room.nights : 0;
          var totalPrice = combo.reduce(function(sum, line) { return sum + (line.lineTotalPrice || 0); }, 0);
          var firstRoom = combo[0] && combo[0].room ? combo[0].room : null;
          var images = firstRoom && firstRoom.images && firstRoom.images.length ? firstRoom.images : [];
          var imgSrc = images[0] ? images[0].replace(/^\//, location.origin + '/') : '';
          var comboLabel = combo.map(function(line) {
            return (line.quantity > 1 ? line.quantity + '× ' : '1× ') + (line.room.name || line.roomId) + ' (' + (line.room.capacity || 0) + ' kişi)';
          }).join(' + ');
          var comboParam = combo.map(function(line) { return encodeURIComponent(line.roomId) + ':' + line.quantity; }).join(',');
          var formUrl = 'rezervasyon-form.html?combo=' + encodeURIComponent(comboParam) + (v.checkIn ? '&checkIn=' + encodeURIComponent(v.checkIn) : '') + (v.checkOut ? '&checkOut=' + encodeURIComponent(v.checkOut) : '') + '&guests=' + encodeURIComponent(v.guests) + '&rooms=' + encodeURIComponent(v.rooms) + '&adults=' + encodeURIComponent(v.adults) + '&childrenUnder6=' + encodeURIComponent(v.childrenUnder6) + '&children6Plus=' + encodeURIComponent(v.children6Plus);
          var priceBlockHtml = '<div class="rezervasyon-card-right">';
          if (nights > 0 && totalPrice > 0) {
            priceBlockHtml += '<div class="rezervasyon-card-price-block"><span class="rezervasyon-card-price-label">' + nights + ' gece × ' + numRooms + ' oda toplam</span><strong class="rezervasyon-card-price-value">₺' + Number(totalPrice).toLocaleString('tr-TR') + '</strong></div>';
          } else if (nights > 0) {
            priceBlockHtml += '<div class="rezervasyon-card-price-block"><span class="rezervasyon-card-price-label">Fiyat için iletişime geçin</span></div>';
          }
          priceBlockHtml += '<p class="rezervasyon-card-kontejan">Paket: ' + numRooms + ' oda</p>';
          priceBlockHtml += '<div class="rezervasyon-card-cta"><a href="' + formUrl + '" class="btn btn-primary rezervasyon-card-btn">Rezervasyon Yap</a><p class="rezervasyon-card-note">Ücret rezervasyon onayında alınacaktır.</p></div></div>';
          var imgHtml = imgSrc ? '<img src="' + imgSrc + '" alt="">' : '<div class="rezervasyon-card-image-placeholder"></div>';
          return '<article class="rezervasyon-card animate-on-scroll" data-combo="">' +
            '<div class="rezervasyon-card-image-wrap">' + imgHtml + '</div>' +
            '<div class="rezervasyon-card-body">' +
            '<h2 class="rezervasyon-card-title">' + escapeHtml(comboLabel) + '</h2>' +
            '<ul class="rezervasyon-card-features"><li><span class="rez-icon">📦</span> ' + escapeHtml(comboLabel) + '</li></ul>' +
            '</div>' + priceBlockHtml + '</article>';
        });
        grid.innerHTML = cards.join('');
        if (countEl) countEl.textContent = combinations.length + ' kombinasyon bulundu';
        document.querySelectorAll('#rezervasyon-rooms .animate-on-scroll').forEach(function(el) {
          if (window.IntersectionObserver) {
            var o = new IntersectionObserver(function(entries) {
              entries.forEach(function(e) { if (e.isIntersecting) e.target.classList.add('visible'); });
            }, { threshold: 0.1 });
            o.observe(el);
          } else el.classList.add('visible');
        });
        return;
      }

      var cards = list.map(function(room) {
        var images = (room.images && room.images.length) ? room.images : [];
        var firstImg = images[0];
        var imgSrc = firstImg ? firstImg.replace(/^\//, location.origin + '/') : '';
        var hasImages = images.length > 0;
        var capacity = room.capacity != null ? room.capacity : 2;
        var features = room.features || [];
        var featuresHtml = features.map(function(f) {
          return '<li><span class="rez-icon">✓</span>' + escapeHtml(f) + '</li>';
        }).join('');
        featuresHtml += '<li><span class="rez-icon">👥</span>' + capacity + ' kişi konaklayabilir.</li>';
        var navHtml = images.length > 1
          ? '<button type="button" class="rezervasyon-card-image-prev" aria-label="Önceki">&lsaquo;</button>' +
            '<button type="button" class="rezervasyon-card-image-next" aria-label="Sonraki">&rsaquo;</button>' +
            '<span class="rezervasyon-card-image-count">1 / ' + images.length + '</span>'
          : (images.length === 1 ? '<span class="rezervasyon-card-image-count">1</span>' : '');
        var detailUrl = 'oda-detay.html?id=' + encodeURIComponent(room.id);
        var totalPrice = room.totalPrice;
        var availableCount = room.availableCount != null ? room.availableCount : (room.active !== false ? 1 : 0);
        var nights = room.nights != null ? room.nights : 0;
        var noAvailability = room.active === false || (availableCount !== undefined && availableCount === 0);
        var displayPrice = (totalPrice != null && totalPrice > 0) ? totalPrice * numRooms : 0;
        var priceHtml = '';
        if (nights > 0) {
          if (totalPrice != null && totalPrice > 0) {
            priceHtml = '<p class="rezervasyon-card-price"><span class="rezervasyon-card-price-nights">' + nights + ' gece' + (numRooms > 1 ? ' × ' + numRooms + ' oda' : '') + '</span> · Toplam <strong>₺' + Number(displayPrice).toLocaleString('tr-TR') + '</strong></p>';
          } else {
            priceHtml = '<p class="rezervasyon-card-price"><span class="rezervasyon-card-price-nights">' + nights + ' gece</span> · Fiyat için iletişime geçin</p>';
          }
          if (noAvailability) {
            priceHtml += '<p class="rezervasyon-card-kontejan rezervasyon-card-kontejan-none">Müsait değil</p>';
          } else {
            priceHtml += '<p class="rezervasyon-card-kontejan">Elimizde <strong>' + availableCount + '</strong> oda kaldı</p>';
          }
        }
        var formUrl = 'rezervasyon-form.html?room=' + encodeURIComponent(room.id) + (v.checkIn ? '&checkIn=' + encodeURIComponent(v.checkIn) : '') + (v.checkOut ? '&checkOut=' + encodeURIComponent(v.checkOut) : '') + '&guests=' + encodeURIComponent(v.guests) + '&rooms=' + encodeURIComponent(v.rooms) + '&adults=' + encodeURIComponent(v.adults) + '&childrenUnder6=' + encodeURIComponent(v.childrenUnder6) + '&children6Plus=' + encodeURIComponent(v.children6Plus);
        var ctaHtml = noAvailability
          ? '<div class="rezervasyon-card-cta"><p class="rezervasyon-card-note">Müsait değil</p></div>'
          : '<div class="rezervasyon-card-cta">' +
              '<a href="' + formUrl + '" class="btn btn-primary rezervasyon-card-btn">Rezervasyon Yap</a>' +
              '<p class="rezervasyon-card-note">Ücret rezervasyon onayında alınacaktır.</p></div>';
        var cardClass = 'rezervasyon-card animate-on-scroll' + (noAvailability ? ' rezervasyon-card-inactive' : '');
        var imgHtml = hasImages
          ? '<img src="' + imgSrc + '" alt="">'
          : '<div class="rezervasyon-card-image-placeholder"></div>';
        var priceBlockHtml = '<div class="rezervasyon-card-right">';
        if (nights > 0 && totalPrice != null && totalPrice > 0) {
          priceBlockHtml += '<div class="rezervasyon-card-price-block"><span class="rezervasyon-card-price-label">' + nights + ' gece' + (numRooms > 1 ? ' × ' + numRooms + ' oda' : '') + ' toplam</span><strong class="rezervasyon-card-price-value">₺' + Number(displayPrice).toLocaleString('tr-TR') + '</strong></div>';
        } else if (nights > 0) {
          priceBlockHtml += '<div class="rezervasyon-card-price-block"><span class="rezervasyon-card-price-label">Fiyat için iletişime geçin</span></div>';
        }
        if (nights > 0) {
          priceBlockHtml += noAvailability ? '<p class="rezervasyon-card-kontejan rezervasyon-card-kontejan-none">Müsait değil</p>' : '<p class="rezervasyon-card-kontejan">' + availableCount + ' oda kaldı</p>';
        }
        priceBlockHtml += ctaHtml + '</div>';
        return '<article class="' + cardClass + '" data-room-id="' + escapeHtml(room.id) + '">' +
          '<div class="rezervasyon-card-image-wrap">' +
          imgHtml + navHtml + '</div>' +
          '<div class="rezervasyon-card-body">' +
          '<h2 class="rezervasyon-card-title">' + escapeHtml(room.name || '') + '</h2>' +
          '<ul class="rezervasyon-card-features">' + featuresHtml + '</ul>' +
          '<a href="' + detailUrl + '" class="rezervasyon-card-detail-link">Oda detayı ›</a>' +
          '</div>' +
          priceBlockHtml +
          '</article>';
      });
      grid.innerHTML = cards.join('');
      if (countEl) countEl.textContent = list.length + ' oda bulundu';

      grid.querySelectorAll('.rezervasyon-card').forEach(function(card) {
        var rid = card.getAttribute('data-room-id');
        var room = list.find(function(r) { return r.id === rid; });
        if (!room) return;
        if ((room.images || []).length) setSlider(card, room.images, room.id);
      });

      document.querySelectorAll('#rezervasyon-rooms .animate-on-scroll').forEach(function(el) {
        if (window.IntersectionObserver) {
          var o = new IntersectionObserver(function(entries) {
            entries.forEach(function(e) { if (e.isIntersecting) e.target.classList.add('visible'); });
          }, { threshold: 0.1 });
          o.observe(el);
        } else el.classList.add('visible');
      });
    }).catch(function() {
      var ce = document.getElementById('rezervasyon-results-count');
      if (ce) ce.textContent = '';
      if (grid) grid.innerHTML = '<p class="rezervasyon-empty">Odalar yüklenemedi. Lütfen tekrar deneyin.</p>';
    });
  }

  function updateGuestsSummary() {
    var r = parseInt(widgetRooms && widgetRooms.value ? widgetRooms.value : 1, 10) || 1;
    var a = parseInt(widgetAdults && widgetAdults.value ? widgetAdults.value : 2, 10) || 2;
    var u6 = parseInt(widgetChildrenUnder6 && widgetChildrenUnder6.value !== '' ? widgetChildrenUnder6.value : 0, 10) || 0;
    var s6 = parseInt(widgetChildren6Plus && widgetChildren6Plus.value !== '' ? widgetChildren6Plus.value : 0, 10) || 0;
    var total = a + u6 + s6;
    var summaryEl = document.getElementById('rez-widget-guests-summary');
    if (summaryEl) summaryEl.textContent = total + ' Misafir, ' + r + ' Oda';
  }

  (function initWidget() {
    var today = new Date();
    var y = today.getFullYear(), m = today.getMonth(), d = today.getDate();
    var todayStr = y + '-' + (m + 1 < 10 ? '0' : '') + (m + 1) + '-' + (d < 10 ? '0' : '') + d;
    var tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    var m2 = tomorrow.getMonth(), d2 = tomorrow.getDate();
    var tomorrowStr = tomorrow.getFullYear() + '-' + (m2 + 1 < 10 ? '0' : '') + (m2 + 1) + '-' + (d2 < 10 ? '0' : '') + d2;
    if (widgetCheckIn) { widgetCheckIn.value = urlCheckIn || todayStr; widgetCheckIn.setAttribute('min', todayStr); }
    if (widgetCheckOut) { widgetCheckOut.value = urlCheckOut || tomorrowStr; widgetCheckOut.setAttribute('min', todayStr); }
    if (widgetRooms) widgetRooms.value = urlRooms && parseInt(urlRooms, 10) >= 1 ? urlRooms : '1';
    if (widgetAdults) widgetAdults.value = urlAdults && parseInt(urlAdults, 10) >= 1 ? urlAdults : '2';
    if (widgetChildrenUnder6) widgetChildrenUnder6.value = urlChildrenUnder6 && parseInt(urlChildrenUnder6, 10) >= 0 ? urlChildrenUnder6 : '0';
    if (widgetChildren6Plus) widgetChildren6Plus.value = urlChildren6Plus && parseInt(urlChildren6Plus, 10) >= 0 ? urlChildren6Plus : '0';
    updateGuestsSummary();

    var trigger = document.getElementById('rez-widget-guests-trigger');
    var overlay = document.getElementById('rez-guests-modal-overlay');
    var modalAdultsVal = document.getElementById('rez-modal-adults-value');
    var modalChildrenVal = document.getElementById('rez-modal-children-value');
    var modalRoomsVal = document.getElementById('rez-modal-rooms-value');
    var modalAdultsMinus = document.getElementById('rez-modal-adults-minus');
    var modalAdultsPlus = document.getElementById('rez-modal-adults-plus');
    var modalChildrenMinus = document.getElementById('rez-modal-children-minus');
    var modalChildrenPlus = document.getElementById('rez-modal-children-plus');
    var modalRoomsMinus = document.getElementById('rez-modal-rooms-minus');
    var modalRoomsPlus = document.getElementById('rez-modal-rooms-plus');
    var modalReset = document.getElementById('rez-guests-modal-reset');
    var modalApply = document.getElementById('rez-guests-modal-apply');

    function openModal() {
      var a = parseInt(widgetAdults && widgetAdults.value ? widgetAdults.value : 2, 10) || 2;
      var c = (parseInt(widgetChildrenUnder6 && widgetChildrenUnder6.value ? widgetChildrenUnder6.value : 0, 10) || 0) + (parseInt(widgetChildren6Plus && widgetChildren6Plus.value ? widgetChildren6Plus.value : 0, 10) || 0);
      var r = parseInt(widgetRooms && widgetRooms.value ? widgetRooms.value : 1, 10) || 1;
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
    function closeModal() {
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

    if (trigger) trigger.addEventListener('click', openModal);
    if (overlay) {
      overlay.addEventListener('click', function(e) {
        if (e.target === overlay) closeModal();
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
      if (widgetAdults) widgetAdults.value = a;
      if (widgetChildrenUnder6) widgetChildrenUnder6.value = c;
      if (widgetChildren6Plus) widgetChildren6Plus.value = '0';
      if (widgetRooms) widgetRooms.value = r;
      updateGuestsSummary();
      closeModal();
    });

    var widgetForm = document.getElementById('rezervasyon-widget-form');
    if (widgetForm) {
      widgetForm.addEventListener('submit', function(e) {
        e.preventDefault();
        loadRooms();
      });
    }
  })();

  loadRooms();
})();
