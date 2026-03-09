(function() {
  var params = new URLSearchParams(location.search);
  var roomId = params.get('room');
  var comboParam = params.get('combo');
  var checkIn = params.get('checkIn') || '';
  var checkOut = params.get('checkOut') || '';
  var guests = params.get('guests') || '2';
  var rooms = params.get('rooms') || '1';
  var adults = params.get('adults') || '2';
  var childrenUnder6 = params.get('childrenUnder6') || '0';
  var children6Plus = params.get('children6Plus') || '0';

  var comboLines = [];
  if (comboParam) {
    comboParam.split(',').forEach(function(pair) {
      var parts = pair.split(':');
      if (parts.length >= 2) {
        var qty = parseInt(parts[1], 10) || 1;
        if (parts[0] && qty >= 1) comboLines.push({ roomId: parts[0].trim(), quantity: qty });
      }
    });
  }

  var form = document.getElementById('rezervasyon-modal-form');
  var loadingEl = document.getElementById('rezervasyon-form-loading');
  var formRoomId = document.getElementById('rez-form-roomId');
  var formCheckIn = document.getElementById('rez-form-checkin');
  var formCheckOut = document.getElementById('rez-form-checkout');
  var formGuests = document.getElementById('rez-form-guests');
  var formRoomCount = document.getElementById('rez-form-roomCount');
  var formAdults = document.getElementById('rez-form-adults');
  var formChildrenUnder6 = document.getElementById('rez-form-childrenUnder6');
  var formChildren6Plus = document.getElementById('rez-form-children6Plus');
  var formMesaj = document.getElementById('rez-form-mesaj');
  var modalRoomName = document.getElementById('rez-modal-room-name');
  var summaryComboLines = document.getElementById('rez-summary-combo-lines');
  var summaryCheckin = document.getElementById('rez-summary-checkin');
  var summaryCheckout = document.getElementById('rez-summary-checkout');
  var summaryNights = document.getElementById('rez-summary-nights');
  var summaryGuests = document.getElementById('rez-summary-guests');
  var summaryImageWrap = document.getElementById('rez-summary-image-wrap');
  var summaryImage = document.getElementById('rez-summary-image');
  var summaryImageDots = document.getElementById('rez-summary-image-dots');
  var summaryImagePrev = document.getElementById('rez-summary-image-prev');
  var summaryImageNext = document.getElementById('rez-summary-image-next');
  var summaryPriceBlock = document.getElementById('rezervasyon-summary-price-block');
  var summaryPriceDetail = document.getElementById('rez-summary-price-detail');
  var summaryPriceAmount = document.getElementById('rez-summary-price-amount');
  var summaryPriceAvg = document.getElementById('rez-summary-price-avg');
  var summaryTotal = document.getElementById('rez-summary-total');

  var monthNames = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  function formatDateLong(dateStr) {
    if (!dateStr) return '—';
    var d = new Date(dateStr + 'T12:00:00Z');
    if (isNaN(d.getTime())) return dateStr;
    return d.getDate() + ' ' + monthNames[d.getMonth()] + ' ' + d.getFullYear();
  }

  var summaryImages = [];
  var summaryImageIndex = 0;

  function updateSummaryImage() {
    if (!summaryImage || !summaryImages.length) return;
    summaryImage.src = summaryImages[summaryImageIndex];
    if (summaryImageDots) {
      summaryImageDots.innerHTML = summaryImages.map(function(_, idx) {
        return '<button type="button" class="' + (idx === summaryImageIndex ? 'is-active' : '') + '" aria-label="Görsel ' + (idx + 1) + '"></button>';
      }).join('');
      Array.prototype.forEach.call(summaryImageDots.querySelectorAll('button'), function(btn, idx) {
        btn.addEventListener('click', function() {
          summaryImageIndex = idx;
          updateSummaryImage();
        });
      });
    }
    if (summaryImageWrap) summaryImageWrap.style.display = '';
  }

  function initSummarySliderFromUrls(urls) {
    summaryImages = (urls || []).filter(Boolean);
    summaryImageIndex = 0;
    if (!summaryImages.length) {
      if (summaryImageWrap) summaryImageWrap.style.display = 'none';
      return;
    }
    updateSummaryImage();
  }

  function renderSummaryCombo(comboWithRooms, totalPrice, nights) {
    var g = Math.max(1, parseInt(guests, 10) || 2);
    var a = Math.max(1, parseInt(adults, 10) || 2);
    var u6 = Math.max(0, parseInt(childrenUnder6, 10) || 0);
    var s6 = Math.max(0, parseInt(children6Plus, 10) || 0);
    if (formRoomId) formRoomId.value = '';
    if (formRoomCount) formRoomCount.value = comboWithRooms.length ? comboWithRooms.reduce(function(s, l) { return s + l.quantity; }, 0) : 1;
    if (formAdults) formAdults.value = a;
    if (formChildrenUnder6) formChildrenUnder6.value = u6;
    if (formChildren6Plus) formChildren6Plus.value = s6;
    if (modalRoomName) { modalRoomName.textContent = comboWithRooms.length + ' oda paketi'; modalRoomName.style.display = ''; }
    if (summaryComboLines) {
      summaryComboLines.style.display = 'block';
      summaryComboLines.innerHTML = comboWithRooms.map(function(l) {
        return '<p class="rezervasyon-summary-combo-line">' + (l.quantity > 1 ? l.quantity + '× ' : '1× ') + (l.room.name || l.roomId) + ' (' + (l.room.capacity || 0) + ' kişi) · ₺' + Number(l.lineTotalPrice || 0).toLocaleString('tr-TR') + '</p>';
      }).join('');
    }
    if (formCheckIn) formCheckIn.value = checkIn;
    if (formCheckOut) formCheckOut.value = checkOut;
    if (formGuests) formGuests.value = g;
    if (summaryCheckin) summaryCheckin.textContent = formatDateLong(checkIn);
    if (summaryCheckout) summaryCheckout.textContent = formatDateLong(checkOut);
    if (summaryNights) summaryNights.textContent = nights ? nights + ' gece konaklama' : '—';
    var guestText = a + ' yetişkin';
    if (s6 > 0) guestText += ', ' + s6 + ' çocuk (6–12 yaş)';
    if (u6 > 0) guestText += ', ' + u6 + ' çocuk (6 yaş altı, 1 kişi ücretsiz)';
    if (summaryGuests) summaryGuests.textContent = guestText;
    if (summaryImageWrap && summaryImage) {
      var firstRoom = comboWithRooms[0] && comboWithRooms[0].room;
      var imgs = firstRoom && Array.isArray(firstRoom.images) ? firstRoom.images : [];
      var urls = imgs.map(function(u) { return u ? u.replace(/^\//, location.origin + '/') : ''; });
      initSummarySliderFromUrls(urls);
    }
    if (summaryPriceBlock) {
      summaryPriceBlock.style.display = 'block';
      if (summaryPriceDetail) summaryPriceDetail.textContent = comboWithRooms.length + ' oda x ' + nights + ' gece';
      if (summaryPriceAmount) summaryPriceAmount.textContent = '₺' + Number(totalPrice).toLocaleString('tr-TR');
      if (summaryPriceAvg) { summaryPriceAvg.textContent = nights ? 'Ortalama gece başı: ₺' + Number(totalPrice / (nights * comboWithRooms.reduce(function(s, l) { return s + l.quantity; }, 0))).toLocaleString('tr-TR') : ''; summaryPriceAvg.style.display = nights ? '' : 'none'; }
      if (summaryTotal) summaryTotal.textContent = '₺' + Number(totalPrice).toLocaleString('tr-TR');
    }
  }

  function renderSummary(room) {
    var nights = room.nights != null ? room.nights : 0;
    var totalPricePerRoom = room.totalPrice != null ? room.totalPrice : 0;
    var numRooms = Math.max(1, parseInt(rooms, 10) || 1);
    var totalPrice = totalPricePerRoom * numRooms;
    var g = Math.max(1, parseInt(guests, 10) || 2);
    var a = Math.max(1, parseInt(adults, 10) || 2);
    var u6 = Math.max(0, parseInt(childrenUnder6, 10) || 0);
    var s6 = Math.max(0, parseInt(children6Plus, 10) || 0);
    if (formRoomId) formRoomId.value = room.id;
    if (formRoomCount) formRoomCount.value = numRooms;
    if (formAdults) formAdults.value = a;
    if (formChildrenUnder6) formChildrenUnder6.value = u6;
    if (formChildren6Plus) formChildren6Plus.value = s6;
    if (modalRoomName) { modalRoomName.textContent = room.name || ''; modalRoomName.style.display = ''; }
    if (summaryComboLines) summaryComboLines.style.display = 'none';
    if (formCheckIn) formCheckIn.value = checkIn;
    if (formCheckOut) formCheckOut.value = checkOut;
    if (formGuests) formGuests.value = g;
    if (summaryCheckin) summaryCheckin.textContent = formatDateLong(checkIn);
    if (summaryCheckout) summaryCheckout.textContent = formatDateLong(checkOut);
    if (summaryNights) summaryNights.textContent = nights ? nights + ' gece konaklama' : '—';
    var guestText = numRooms > 1 ? numRooms + ' oda, ' : '';
    guestText += a + ' yetişkin';
    if (s6 > 0) guestText += ', ' + s6 + ' çocuk (6–12 yaş)';
    if (u6 > 0) guestText += ', ' + u6 + ' çocuk (6 yaş altı, 1 kişi ücretsiz)';
    if (summaryGuests) summaryGuests.textContent = guestText;
    if (summaryImageWrap && summaryImage) {
      var imgs = Array.isArray(room.images) ? room.images : (room.images ? [room.images] : []);
      var urls = imgs.map(function(u) { return u ? u.replace(/^\//, location.origin + '/') : ''; });
      initSummarySliderFromUrls(urls);
    }
    if (summaryPriceBlock) {
      summaryPriceBlock.style.display = 'block';
      if (nights > 0 && totalPricePerRoom > 0) {
        if (summaryPriceDetail) summaryPriceDetail.textContent = (numRooms > 1 ? numRooms + ' oda x ' : '1 oda x ') + nights + ' gece';
        if (summaryPriceAmount) summaryPriceAmount.textContent = '₺' + Number(totalPrice).toLocaleString('tr-TR');
        if (summaryPriceAvg) { summaryPriceAvg.textContent = 'Ortalama gece başı: ₺' + Number(totalPrice / (nights * numRooms)).toLocaleString('tr-TR'); summaryPriceAvg.style.display = ''; }
        if (summaryTotal) summaryTotal.textContent = '₺' + Number(totalPrice).toLocaleString('tr-TR');
      } else {
        if (summaryPriceDetail) summaryPriceDetail.textContent = nights ? (numRooms > 1 ? numRooms + ' oda x ' : '1 oda x ') + nights + ' gece' : '—';
        if (summaryPriceAmount) summaryPriceAmount.textContent = '—';
        if (summaryPriceAvg) summaryPriceAvg.style.display = 'none';
        if (summaryTotal) summaryTotal.textContent = 'Fiyat için iletişime geçin';
      }
    }
  }

  function showError(msg) {
    if (!loadingEl) return;
    var text = msg || 'Oda bulunamadı. Lütfen rezervasyon sayfasından tekrar oda seçin.';
    if (text.indexOf('<a ') !== -1) loadingEl.innerHTML = text; else loadingEl.textContent = text;
  }

  var apiBase = '';
  var port = window.location.port || (window.location.protocol === 'https:' ? '443' : '80');
  if (window.location.protocol === 'file:' || !window.location.origin || (window.location.hostname === 'localhost' && port !== '3000')) {
    apiBase = 'http://localhost:3000';
  }

  if (summaryImagePrev) {
    summaryImagePrev.addEventListener('click', function() {
      if (!summaryImages.length) return;
      summaryImageIndex = (summaryImageIndex - 1 + summaryImages.length) % summaryImages.length;
      updateSummaryImage();
    });
  }
  if (summaryImageNext) {
    summaryImageNext.addEventListener('click', function() {
      if (!summaryImages.length) return;
      summaryImageIndex = (summaryImageIndex + 1) % summaryImages.length;
      updateSummaryImage();
    });
  }

  var url = apiBase + '/api/rooms';
  if (checkIn && checkOut) url += '?checkIn=' + encodeURIComponent(checkIn) + '&checkOut=' + encodeURIComponent(checkOut);

  if (comboLines.length > 0) {
    fetch(url).then(function(r) { return r.json(); }).then(function(roomsList) {
      if (loadingEl) loadingEl.style.display = 'none';
      var comboWithRooms = [];
      var totalPrice = 0;
      var nights = 0;
      for (var i = 0; i < comboLines.length; i++) {
        var line = comboLines[i];
        var room = (roomsList || []).find(function(r) { return r.id === line.roomId; });
        if (!room) {
          showError('Oda bulunamadı: ' + line.roomId);
          return;
        }
        var lineTotal = (room.totalPrice != null ? room.totalPrice : 0) * line.quantity;
        totalPrice += lineTotal;
        if (room.nights != null) nights = room.nights;
        comboWithRooms.push({ roomId: line.roomId, quantity: line.quantity, room: room, lineTotalPrice: lineTotal });
      }
      if (form) form.style.display = 'flex';
      renderSummaryCombo(comboWithRooms, totalPrice, nights);
    }).catch(function() {
      if (loadingEl) loadingEl.style.display = 'none';
      showError('Bilgiler yüklenemedi.');
    });
  } else if (!roomId) {
    showError('Oda seçilmedi. Lütfen <a href="rezervasyon.html">rezervasyon sayfasından</a> bir oda veya paket seçin.');
    if (loadingEl) loadingEl.style.display = 'block';
  } else {
    fetch(url).then(function(r) { return r.json(); }).then(function(roomsList) {
      var room = (roomsList || []).find(function(r) { return r.id === roomId; });
      if (loadingEl) loadingEl.style.display = 'none';
      if (!room) {
        showError('Oda bulunamadı.');
        return;
      }
      if (form) form.style.display = 'flex';
      renderSummary(room);
    }).catch(function() {
      if (loadingEl) loadingEl.style.display = 'none';
      showError('Bilgiler yüklenemedi.');
    });
  }

  if (form) {
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      var fd = new FormData(form);
      var firstName = (fd.get('firstName') || '').trim();
      var lastName = (fd.get('lastName') || '').trim();
      var guestName = (firstName + ' ' + lastName).trim() || firstName || lastName;
      var activePaymentTab = document.querySelector('.rezervasyon-odeme-tab.active');
      var paymentMethod = '';
      if (activePaymentTab) {
        var paymentType = activePaymentTab.getAttribute('data-payment');
        if (paymentType === 'card') paymentMethod = 'kredi_karti';
        else if (paymentType === 'transfer') paymentMethod = 'eft';
      }
      var payload = {
        guestName: guestName,
        email: fd.get('email'),
        phone: (fd.get('phone') || '').trim(),
        checkIn: fd.get('checkIn'),
        checkOut: fd.get('checkOut'),
        guests: parseInt(fd.get('guests'), 10) || 1,
        adults: fd.get('adults') != null ? parseInt(fd.get('adults'), 10) : null,
        childrenUnder6: fd.get('childrenUnder6') != null ? parseInt(fd.get('childrenUnder6'), 10) : null,
        children6Plus: fd.get('children6Plus') != null ? parseInt(fd.get('children6Plus'), 10) : null,
        note: (fd.get('note') || '').trim(),
        paymentMethod: paymentMethod
      };
      if (comboLines.length > 0) {
        payload.rooms = comboLines.map(function(l) { return { roomId: l.roomId, quantity: l.quantity }; });
      } else {
        payload.roomId = fd.get('roomId');
        payload.roomCount = parseInt(fd.get('roomCount'), 10) || 1;
      }
      formMesaj.style.display = 'none';
      fetch(apiBase + '/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(function(r) {
        return r.text().then(function(text) {
          var data = null;
          try { data = text ? JSON.parse(text) : null; } catch (_) {}
          return { ok: r.ok, status: r.status, data: data, raw: text };
        });
      }).then(function(result) {
        formMesaj.style.display = 'block';
        if (result.ok && result.data && result.data.ok) {
          var resId = result.data.id;
          var guestEmail = (payload.email || '').trim();
          form.style.display = 'none';
          var successPanel = document.getElementById('rezervasyon-success-panel');
          if (successPanel) {
            successPanel.style.display = 'block';
            var noEl = document.getElementById('rez-success-no');
            if (noEl) noEl.textContent = resId || '—';
            var pdfLink = document.getElementById('rez-success-pdf');
            if (pdfLink && resId && guestEmail) {
              pdfLink.href = apiBase + '/api/public/reservations/' + encodeURIComponent(resId) + '/pdf?email=' + encodeURIComponent(guestEmail);
              pdfLink.style.display = '';
            }
            var manageLink = document.getElementById('rez-success-manage');
            if (manageLink && resId && guestEmail) {
              manageLink.href = 'rezervasyon-sorgula.html?no=' + encodeURIComponent(resId) + '&email=' + encodeURIComponent(guestEmail);
            }
            if (paymentMethod === 'eft') {
              var box = document.getElementById('rez-success-iban-box');
              if (box) {
                box.style.display = 'block';
                box.innerHTML = '<p class="rezervasyon-odeme-iban-loading">IBAN bilgisi yükleniyor…</p>';
                fetch(apiBase + '/api/settings').then(function(r) { return r.json(); }).then(function(s) {
                  var iban = (s && s.iban) ? String(s.iban).trim() : '';
                  var bankName = (s && s.bankName) ? String(s.bankName).trim() : '';
                  var instructions = (s && s.paymentInstructions) ? String(s.paymentInstructions).trim() : '';
                  if (!iban && !bankName) {
                    box.innerHTML = '<p class="rezervasyon-odeme-iban-empty">IBAN bilgisi henüz eklenmemiş. Rezervasyon onayı için lütfen otelle iletişime geçin.</p>';
                    return;
                  }
                  var html = '<div class="rezervasyon-odeme-iban-inner">';
                  html += '<p class="rezervasyon-odeme-iban-label">Havale / EFT için banka bilgileri</p>';
                  if (bankName) html += '<p class="rezervasyon-odeme-iban-value">' + bankName.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</p>';
                  if (iban) html += '<p class="rezervasyon-odeme-iban-label">IBAN</p><p class="rezervasyon-odeme-iban-value rezervasyon-odeme-iban-code">' + iban.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</p>';
                  if (instructions) html += '<p class="rezervasyon-odeme-iban-note">' + instructions.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>') + '</p>';
                  html += '</div>';
                  box.innerHTML = html;
                }).catch(function() {
                  box.innerHTML = '<p class="rezervasyon-odeme-iban-empty">Ödeme bilgisi yüklenemedi. Lütfen otelle iletişime geçin.</p>';
                });
              }
            }
          } else {
            formMesaj.className = 'rezervasyon-form-mesaj success';
            formMesaj.textContent = result.data.mesaj || 'Rezervasyon talebiniz alındı.';
            form.querySelector('button[type="submit"]').disabled = true;
          }
        } else {
          formMesaj.className = 'rezervasyon-form-mesaj error';
          var hataMesaj = (result.data && result.data.mesaj) || (result.status === 500 ? 'Sunucu veya veritabanı hatası.' : 'Bir hata oluştu.');
          if (result.data && result.data.detail) hataMesaj += ' (' + result.data.detail + ')';
          formMesaj.textContent = hataMesaj;
        }
      }).catch(function() {
        formMesaj.className = 'rezervasyon-form-mesaj error';
        formMesaj.innerHTML = 'Bağlantı hatası. Sunucu çalışıyor olabilir mi? Proje klasöründe <code>npm start</code> veya <code>node server.js</code> çalıştırın, ardından sayfayı <a href="http://localhost:3000' + (location.pathname || '/rezervasyon-form.html') + location.search + '" target="_blank" rel="noopener">http://localhost:3000 üzerinden açın</a>.';
        formMesaj.style.display = 'block';
      });
    });
  }

  // Ödeme sekmeleri ve yıl listesi
  (function initPayment() {
    var cardPanel = document.getElementById('rez-odeme-card-panel');
    var transferPanel = document.getElementById('rez-odeme-transfer-panel');
    var tabs = document.querySelectorAll('.rezervasyon-odeme-tab');
    var yearSelect = form && form.querySelector('select[name="cardYear"]');
    var cardNumberInput = form && form.querySelector('input[name="cardNumber"]');

    if (yearSelect) {
      var y = new Date().getFullYear();
      for (var i = 0; i <= 15; i++) {
        var opt = document.createElement('option');
        opt.value = String(y + i);
        opt.textContent = y + i;
        yearSelect.appendChild(opt);
      }
    }

    function loadIbanInfo() {
      var box = document.getElementById('rez-odeme-iban-box');
      if (!box) return;
      box.innerHTML = '<p class="rezervasyon-odeme-iban-loading">Yükleniyor…</p>';
      fetch(apiBase + '/api/settings').then(function(r) { return r.json(); }).then(function(s) {
        var iban = (s && s.iban) ? String(s.iban).trim() : '';
        var bankName = (s && s.bankName) ? String(s.bankName).trim() : '';
        var instructions = (s && s.paymentInstructions) ? String(s.paymentInstructions).trim() : '';
        if (!iban && !bankName) {
          box.innerHTML = '<p class="rezervasyon-odeme-iban-empty">IBAN bilgisi henüz eklenmemiş. Rezervasyon sonrası iletişime geçiniz.</p>';
          return;
        }
        var html = '<div class="rezervasyon-odeme-iban-inner">';
        if (bankName) html += '<p class="rezervasyon-odeme-iban-label">Banka / Hesap</p><p class="rezervasyon-odeme-iban-value">' + bankName.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</p>';
        if (iban) html += '<p class="rezervasyon-odeme-iban-label">IBAN</p><p class="rezervasyon-odeme-iban-value rezervasyon-odeme-iban-code">' + iban.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</p>';
        if (instructions) html += '<p class="rezervasyon-odeme-iban-label">Açıklama</p><p class="rezervasyon-odeme-iban-note">' + instructions.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>') + '</p>';
        html += '</div>';
        box.innerHTML = html;
      }).catch(function() {
        box.innerHTML = '<p class="rezervasyon-odeme-iban-empty">Ödeme bilgisi yüklenemedi.</p>';
      });
    }
    if (tabs.length) {
      tabs.forEach(function(tab) {
        tab.addEventListener('click', function() {
          var payment = this.getAttribute('data-payment');
          if (payment === 'card') {
            alert('Kredi / banka kartı ile online ödeme şu anda aktif değildir. Lütfen Havale / EFT seçeneğini kullanın.');
            return;
          }
          tabs.forEach(function(t) { t.classList.remove('active'); });
          this.classList.add('active');
          if (cardPanel) cardPanel.style.display = payment === 'card' ? '' : 'none';
          if (transferPanel) transferPanel.style.display = payment === 'transfer' ? '' : 'none';
          if (payment === 'transfer') loadIbanInfo();
        });
      });
    }

    // Sayfa ilk yüklendiğinde aktif sekmeye göre panelleri ayarla
    var activeTab = document.querySelector('.rezervasyon-odeme-tab.active');
    if (activeTab) {
      var initialPayment = activeTab.getAttribute('data-payment');
      if (cardPanel) cardPanel.style.display = initialPayment === 'card' ? '' : 'none';
      if (transferPanel) transferPanel.style.display = initialPayment === 'transfer' ? '' : 'none';
      if (initialPayment === 'transfer') loadIbanInfo();
    }

    if (cardNumberInput) {
      cardNumberInput.addEventListener('input', function() {
        var v = this.value.replace(/\D/g, '');
        var parts = [];
        for (var i = 0; i < v.length && i < 16; i += 4) parts.push(v.slice(i, i + 4));
        this.value = parts.join(' ');
      });
    }
  })();
})();
