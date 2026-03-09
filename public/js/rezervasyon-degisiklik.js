(function() {
  var apiBase = '';
  var port = window.location.port || (window.location.protocol === 'https:' ? '443' : '80');
  if (window.location.protocol === 'file:' || !window.location.origin || (window.location.hostname === 'localhost' && port !== '3000')) {
    apiBase = 'http://localhost:3000';
  }

  var params = new URLSearchParams(location.search);
  var prefillNo = params.get('no') || params.get('id') || '';
  var prefillEmail = params.get('email') || '';

  var form = document.getElementById('degisiklik-form');
  var noInput = document.getElementById('degisiklik-no');
  var emailInput = document.getElementById('degisiklik-email');
  var mesajEl = document.getElementById('degisiklik-mesaj');
  var uyariEl = document.getElementById('degisiklik-24uyari');
  var sonucEl = document.getElementById('degisiklik-sonuc');
  var dlEl = document.getElementById('degisiklik-dl');
  var tarihForm = document.getElementById('degisiklik-tarih-form');
  var newRoomSelect = document.getElementById('degisiklik-new-room');
  var newCheckInInput = document.getElementById('degisiklik-new-checkin');
  var newCheckOutInput = document.getElementById('degisiklik-new-checkout');

  if (noInput && prefillNo) noInput.value = prefillNo;
  if (emailInput && prefillEmail) emailInput.value = prefillEmail;

  var currentReservation = null;
  var currentEmail = '';

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

  function todayStr() {
    var d = new Date();
    var y = d.getFullYear();
    var m = d.getMonth() + 1;
    var day = d.getDate();
    return y + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
  }

  function showMesaj(text, isError) {
    if (!mesajEl) return;
    mesajEl.textContent = text || '';
    mesajEl.className = 'rezervasyon-form-mesaj ' + (isError ? 'error' : 'success');
    mesajEl.style.display = text ? 'block' : 'none';
  }

  function renderDetay(r) {
    if (!dlEl) return;
    var totalStr = (r.totalPrice != null && r.totalPrice > 0) ? '₺' + Number(r.totalPrice).toLocaleString('tr-TR') : '—';
    dlEl.innerHTML =
      '<dt>Rezervasyon no</dt><dd><strong>' + (r.id || '—') + '</strong></dd>' +
      '<dt>Oda</dt><dd>' + (r.roomName || r.roomId || '—') + '</dd>' +
      '<dt>Mevcut giriş</dt><dd>' + formatDate(r.checkIn) + '</dd>' +
      '<dt>Mevcut çıkış</dt><dd>' + formatDate(r.checkOut) + '</dd>' +
      '<dt>Gece</dt><dd>' + (r.nights != null ? r.nights : '—') + '</dd>' +
      '<dt>Tahmini toplam</dt><dd>' + totalStr + '</dd>';
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
      uyariEl.style.display = 'none';
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
          if (r.status === 'iptal') {
            showMesaj('İptal edilmiş rezervasyonun tarihi değiştirilemez.', true);
            return;
          }
          var createdAt = r.createdAt ? new Date(r.createdAt).getTime() : 0;
          var twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
          if (createdAt < twentyFourHoursAgo) {
            showMesaj('', false);
            uyariEl.style.display = 'block';
            return;
          }
          currentReservation = r;
          currentEmail = email;
          showMesaj('', false);
          renderDetay(r);
          var cin = (r.checkIn || '').slice(0, 10);
          var cout = (r.checkOut || '').slice(0, 10);
          if (newCheckInInput) {
            newCheckInInput.value = cin;
            newCheckInInput.setAttribute('min', todayStr());
          }
          if (newCheckOutInput) {
            newCheckOutInput.value = cout;
            newCheckOutInput.setAttribute('min', cin || todayStr());
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
