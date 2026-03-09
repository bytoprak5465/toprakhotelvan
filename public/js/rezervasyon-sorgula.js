(function() {
  var apiBase = '';
  var port = window.location.port || (window.location.protocol === 'https:' ? '443' : '80');
  if (window.location.protocol === 'file:' || !window.location.origin || (window.location.hostname === 'localhost' && port !== '3000')) {
    apiBase = 'http://localhost:3000';
  }

  var params = new URLSearchParams(location.search);
  var prefillNo = params.get('no') || params.get('id') || '';
  var prefillEmail = params.get('email') || '';

  var form = document.getElementById('sorgula-form');
  var noInput = document.getElementById('sorgula-no');
  var emailInput = document.getElementById('sorgula-email');
  var mesajEl = document.getElementById('sorgula-mesaj');
  var sonucEl = document.getElementById('sorgula-sonuc');
  var dlEl = document.getElementById('sorgula-dl');
  var pdfLink = document.getElementById('sorgula-pdf-link');
  var iptalBtn = document.getElementById('sorgula-iptal-btn');
  var tarihDegisiklikEl = document.getElementById('sorgula-tarih-degisiklik');
  var tarihForm = document.getElementById('sorgula-tarih-form');
  var newRoomSelect = document.getElementById('sorgula-new-room');
  var newCheckInInput = document.getElementById('sorgula-new-checkin');
  var newCheckOutInput = document.getElementById('sorgula-new-checkout');

  var currentReservation = null;
  var currentEmail = '';

  if (noInput && prefillNo) noInput.value = prefillNo;
  if (emailInput && prefillEmail) emailInput.value = prefillEmail;

  function formatDate(str) {
    if (!str) return '—';
    try {
      var d = new Date(str + 'T12:00:00Z');
      if (isNaN(d.getTime())) return str;
      var day = d.getDate();
      var month = d.getMonth() + 1;
      var year = d.getFullYear();
      return (day < 10 ? '0' : '') + day + '.' + (month < 10 ? '0' : '') + month + '.' + year;
    } catch (_) { return str; }
  }

  function durumText(s) {
    if (s === 'onaylandi') return 'Onaylı';
    if (s === 'iptal') return 'İptal';
    if (s === 'gelmeyen') return 'Gelmeyen';
    return 'Beklemede';
  }

  function showMesaj(text, isError) {
    if (!mesajEl) return;
    mesajEl.textContent = text || '';
    mesajEl.className = 'rezervasyon-form-mesaj ' + (isError ? 'error' : 'success');
    mesajEl.style.display = text ? 'block' : 'none';
  }

  function todayStr() {
    var d = new Date();
    var y = d.getFullYear();
    var m = d.getMonth() + 1;
    var day = d.getDate();
    return y + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
  }

  function renderSonuc(r) {
    if (!dlEl) return;
    var totalStr = (r.totalPrice != null && r.totalPrice > 0) ? '₺' + Number(r.totalPrice).toLocaleString('tr-TR') : '—';
    dlEl.innerHTML =
      '<dt>Rezervasyon no</dt><dd><strong>' + (r.id || '—') + '</strong></dd>' +
      '<dt>Misafir</dt><dd>' + (r.guestName || '—') + '</dd>' +
      '<dt>E-posta</dt><dd>' + (r.email || '—') + '</dd>' +
      '<dt>Telefon</dt><dd>' + (r.phone || '—') + '</dd>' +
      '<dt>Oda</dt><dd>' + (r.roomName || r.roomId || '—') + '</dd>' +
      '<dt>Oda sayısı</dt><dd>' + (r.roomCount != null ? r.roomCount : 1) + '</dd>' +
      '<dt>Giriş</dt><dd>' + formatDate(r.checkIn) + '</dd>' +
      '<dt>Çıkış</dt><dd>' + formatDate(r.checkOut) + '</dd>' +
      '<dt>Gece</dt><dd>' + (r.nights != null ? r.nights : '—') + '</dd>' +
      '<dt>Misafir sayısı</dt><dd>' + (r.guests != null ? r.guests : '—') + '</dd>' +
      '<dt>Tahmini toplam</dt><dd>' + totalStr + '</dd>' +
      '<dt>Durum</dt><dd>' + durumText(r.status) + '</dd>';
  }

  if (form) {
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      var no = (noInput && noInput.value) ? noInput.value.trim() : '';
      var email = (emailInput && emailInput.value) ? emailInput.value.trim() : '';
      if (!no || !email) {
        showMesaj('Rezervasyon numarası ve e-posta girin.', true);
        return;
      }
      sonucEl.style.display = 'none';
      showMesaj('Sorgulanıyor…', false);
      fetch(apiBase + '/api/public/reservations/' + encodeURIComponent(no) + '?email=' + encodeURIComponent(email))
        .then(function(r) {
          return r.json().then(function(data) { return { status: r.status, data: data }; });
        })
        .then(function(result) {
          if (result.status === 404 || !result.data || !result.data.id) {
            showMesaj(result.data && result.data.mesaj ? result.data.mesaj : 'Rezervasyon bulunamadı veya e-posta eşleşmiyor.', true);
            return;
          }
          var r = result.data;
          currentReservation = r;
          currentEmail = email;
          showMesaj('', false);
          renderSonuc(r);
          if (pdfLink) {
            pdfLink.href = apiBase + '/api/public/reservations/' + encodeURIComponent(r.id) + '/pdf?email=' + encodeURIComponent(email);
            pdfLink.style.display = r.status === 'iptal' ? 'none' : '';
          }
          if (iptalBtn) {
            iptalBtn.style.display = r.status === 'iptal' ? 'none' : '';
            var checkInStr = (r.checkIn || '').slice(0, 10);
            var todayStrVal = todayStr();
            var tarihGecmis = checkInStr && checkInStr < todayStrVal;
            if (tarihGecmis) iptalBtn.disabled = true;
            iptalBtn.title = tarihGecmis ? 'Giriş tarihi geçmiş rezervasyonlar iptal edilemez.' : '';
            iptalBtn.onclick = function() {
              if (tarihGecmis) return;
              if (!confirm('Ücretsiz iptal uygulanmamaktadır. İptal sonrası ücret iadesi yapılmayacaktır. Rezervasyonunuzu iptal etmek istediğinize emin misiniz?')) return;
              iptalBtn.disabled = true;
              fetch(apiBase + '/api/public/reservations/' + encodeURIComponent(r.id) + '/cancel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email })
              })
                .then(function(res) { return res.json(); })
                .then(function(data) {
                  if (data && data.ok) {
                    r.status = 'iptal';
                    renderSonuc(r);
                    iptalBtn.style.display = 'none';
                    if (pdfLink) pdfLink.style.display = 'none';
                    if (tarihDegisiklikEl) tarihDegisiklikEl.style.display = 'none';
                    showMesaj('Rezervasyon iptal edildi.', false);
                  } else {
                    showMesaj(data && data.mesaj ? data.mesaj : 'İptal işlemi başarısız.', true);
                  }
                })
                .catch(function() {
                  showMesaj('Bağlantı hatası.', true);
                })
                .finally(function() { iptalBtn.disabled = false; });
            };
          }
          if (tarihDegisiklikEl) {
            var createdAt = r.createdAt ? new Date(r.createdAt).getTime() : 0;
            var twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
            if (r.status !== 'iptal' && createdAt >= twentyFourHoursAgo) {
              tarihDegisiklikEl.style.display = 'block';
              var cin = (r.checkIn || '').slice(0, 10);
              var cout = (r.checkOut || '').slice(0, 10);
              if (newCheckInInput) {
                newCheckInInput.value = cin;
                newCheckInInput.setAttribute('min', todayStrVal);
              }
              if (newCheckOutInput) {
                newCheckOutInput.value = cout;
                newCheckOutInput.setAttribute('min', cin || todayStrVal);
              }
              if (newRoomSelect) {
                fetch(apiBase + '/api/rooms')
                  .then(function(res) { return res.json(); })
                  .then(function(rooms) {
                    newRoomSelect.innerHTML = (rooms || []).map(function(room) {
                      return '<option value="' + (room.id || '').replace(/"/g, '&quot;') + '"' + (room.id === r.roomId ? ' selected' : '') + '>' + (room.name || room.id || '').replace(/</g, '&lt;') + '</option>';
                    }).join('');
                  })
                  .catch(function() { newRoomSelect.innerHTML = '<option value="' + (r.roomId || '').replace(/"/g, '&quot;') + '">' + (r.roomName || r.roomId || '').replace(/</g, '&lt;') + '</option>'; });
              }
            } else {
              tarihDegisiklikEl.style.display = 'none';
            }
          }
          sonucEl.style.display = 'block';
        })
        .catch(function() {
          showMesaj('Bağlantı hatası. Sunucu çalışıyor mu?', true);
        });
    });
  }

  if (newCheckInInput && newCheckOutInput) {
    newCheckInInput.addEventListener('change', function() {
      var cin = newCheckInInput.value;
      if (cin && newCheckOutInput.value && newCheckOutInput.value < cin) newCheckOutInput.value = cin;
      newCheckOutInput.setAttribute('min', cin || todayStr());
    });
  }

  if (tarihForm) {
    tarihForm.addEventListener('submit', function(e) {
      e.preventDefault();
      if (!currentReservation) return;
      var newCheckIn = newCheckInInput ? newCheckInInput.value.trim().slice(0, 10) : '';
      var newCheckOut = newCheckOutInput ? newCheckOutInput.value.trim().slice(0, 10) : '';
      var newRoomId = newRoomSelect ? (newRoomSelect.value || '').trim() : (currentReservation.roomId || '');
      if (!newCheckIn || !newCheckOut || newCheckIn >= newCheckOut) {
        showMesaj('Geçerli giriş ve çıkış tarihi seçin.', true);
        return;
      }
      showMesaj('Güncelleniyor…', false);
      var body = { email: currentEmail, newCheckIn: newCheckIn, newCheckOut: newCheckOut };
      if (newRoomId) body.newRoomId = newRoomId;
      fetch(apiBase + '/api/public/reservations/' + encodeURIComponent(currentReservation.id) + '/change-dates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
        .then(function(res) { return res.json().then(function(data) { return { status: res.status, data: data }; }); })
        .then(function(result) {
          if (result.status !== 200 || !result.data || !result.data.ok) {
            showMesaj(result.data && result.data.mesaj ? result.data.mesaj : 'Güncelleme yapılamadı.', true);
            return;
          }
          showMesaj(result.data.mesaj || 'Değişiklik talebiniz alındı. Onaylandıktan sonra rezervasyonunuz güncellenecektir.', false);
        })
        .catch(function() {
          showMesaj('Bağlantı hatası.', true);
        });
    });
  }
})();
