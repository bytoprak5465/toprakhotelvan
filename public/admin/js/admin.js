(function() {
  var API = '';
  (function() {
    var port = window.location.port || (window.location.protocol === 'https:' ? '443' : '80');
    if (window.location.protocol === 'file:' || !window.location.origin || (window.location.hostname === 'localhost' && port !== '3000')) {
      API = 'http://localhost:3000';
    }
  })();
  var token = localStorage.getItem('adminToken');
  var user = null;
  var IDLE_TIMEOUT_MS = 10 * 60 * 1000; // 10 dakika
  var idleTimer = null;

  function authHeader() { return { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }; }
  function resetIdleTimer() {
    if (idleTimer) clearTimeout(idleTimer);
    if (!token) return;
    idleTimer = setTimeout(function() { logout(); }, IDLE_TIMEOUT_MS);
  }
  function get(u) { resetIdleTimer(); return fetch(API + u, { headers: { 'Authorization': 'Bearer ' + token } }).then(function(r) { if (r.status === 401) { logout(); throw new Error('Unauthorized'); } return r.json(); }); }
  function post(u, body) { resetIdleTimer(); return fetch(API + u, { method: 'POST', headers: authHeader(), body: typeof body === 'string' ? body : JSON.stringify(body) }).then(function(r) { if (r.status === 401) logout(); return r.json(); }); }
  function put(u, body) { resetIdleTimer(); return fetch(API + u, { method: 'PUT', headers: authHeader(), body: typeof body === 'string' ? body : JSON.stringify(body) }).then(function(r) { if (r.status === 401) logout(); return r.json(); }); }
  function patch(u, body) { resetIdleTimer(); return fetch(API + u, { method: 'PATCH', headers: authHeader(), body: JSON.stringify(body) }).then(function(r) { if (r.status === 401) logout(); return r.json(); }); }
  function del(u) { resetIdleTimer(); return fetch(API + u, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + token } }).then(function(r) { if (r.status === 401) logout(); return r.json(); }); }

  function logout() {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = null;
    localStorage.removeItem('adminToken');
    token = null;
    user = null;
    var nav = document.getElementById('admin-nav');
    var toggle = document.getElementById('admin-nav-toggle');
    if (nav) nav.classList.remove('is-open');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
    document.getElementById('login-page').style.display = 'block';
    document.getElementById('admin-app').style.display = 'none';
  }

  /** Tarih gösterimi: gün.ay.yıl (GG.AA.YYYY). YYYY-MM-DD zaman dilimi kayması olmadan işlenir. */
  function formatDate(str) {
    if (str === undefined || str === null) return '';
    var s = String(str).trim();
    if (!s) return '';
    var m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) {
      var yil = parseInt(m[1], 10);
      var ay = parseInt(m[2], 10);
      var gun = parseInt(m[3], 10);
      if (ay >= 1 && ay <= 12 && gun >= 1 && gun <= 31)
        return (gun < 10 ? '0' : '') + gun + '.' + (ay < 10 ? '0' : '') + ay + '.' + yil;
    }
    var d = new Date(str);
    if (isNaN(d.getTime())) return str;
    var gun = d.getDate();
    var ay = d.getMonth() + 1;
    var yil = d.getFullYear();
    return (gun < 10 ? '0' : '') + gun + '.' + (ay < 10 ? '0' : '') + ay + '.' + yil;
  }
  /** Tarih + saat: gün.ay.yıl ss:dd */
  function formatDateTime(str) {
    if (!str) return '';
    var d = new Date(str);
    if (isNaN(d.getTime())) return str;
    var gun = d.getDate();
    var ay = d.getMonth() + 1;
    var yil = d.getFullYear();
    var h = d.getHours();
    var m = d.getMinutes();
    return (gun < 10 ? '0' : '') + gun + '.' + (ay < 10 ? '0' : '') + ay + '.' + yil + ' ' + (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
  }
  /** API için YYYY-MM-DD: zaten YYYY-MM-DD ise aynen, GG.AA.YYYY ise dönüştür. */
  function toYYYYMMDD(str) {
    if (!str || typeof str !== 'string') return '';
    var s = str.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    var m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (m) {
      var gun = parseInt(m[1], 10);
      var ay = parseInt(m[2], 10);
      var yil = parseInt(m[3], 10);
      if (yil < 1000 || yil > 9999 || ay < 1 || ay > 12 || gun < 1 || gun > 31) return '';
      return yil + '-' + (ay < 10 ? '0' : '') + ay + '-' + (gun < 10 ? '0' : '') + gun;
    }
    return '';
  }
  /** Grafik etiketleri: hafta = gün.ay.yıl, ay = ay.yıl, yıl = yıl */
  function formatChartLabel(period, key) {
    if (!key) return key;
    if (period === 'week') return formatDate(key);
    if (period === 'month' && key.length >= 7) return key.slice(5, 7) + '.' + key.slice(0, 4);
    return key;
  }
  /** Takvim açılır, seçilen tarih gün.ay.yıl olarak gösterilir. attrs = 'id="..."' veya 'name="..." required' */
  function datePickerWrapHtml(attrs, value) {
    var iso = value || '';
    var display = formatDate(iso) || '';
    return '<div class="date-picker-wrap">' +
      '<span class="date-picker-display">' + display + '</span>' +
      '<input type="date" class="date-picker-input" ' + attrs + ' value="' + iso + '">' +
      '</div>';
  }
  function bindDatePickerDisplays(container) {
    if (!container) return;
    container.querySelectorAll('.date-picker-input').forEach(function(inp) {
      var wrap = inp.closest('.date-picker-wrap');
      var display = wrap && wrap.querySelector('.date-picker-display');
      if (!display) return;
      function sync() {
        requestAnimationFrame(function() { display.textContent = formatDate(inp.value) || ''; });
      }
      inp.addEventListener('input', sync);
      inp.addEventListener('change', sync);
      wrap.addEventListener('click', function(e) {
        e.preventDefault();
        inp.focus();
        if (typeof inp.showPicker === 'function') inp.showPicker();
      });
    });
  }
  /** Kullanıcı girişi gg.aa.yyyy veya gg/aa/yyyy → API için YYYY-MM-DD. Zaten YYYY-MM-DD ise olduğu gibi döner. */
  function parseDateInput(str) {
    if (!str || typeof str !== 'string') return '';
    var s = str.trim();
    if (!s) return '';
    if (/^\d{4}-\d{1,2}-\d{1,2}/.test(s)) return s.slice(0, 10);
    var m = s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
    if (m) {
      var gun = parseInt(m[1], 10);
      var ay = parseInt(m[2], 10);
      var yil = parseInt(m[3], 10);
      if (gun >= 1 && gun <= 31 && ay >= 1 && ay <= 12 && yil >= 1900 && yil <= 2100)
        return yil + '-' + (ay < 10 ? '0' : '') + ay + '-' + (gun < 10 ? '0' : '') + gun;
    }
    return '';
  }

  function showPage(id) {
    document.querySelectorAll('.admin-page').forEach(function(p) { p.style.display = 'none'; p.classList.remove('admin-page-visible'); });
    var el = document.getElementById(id + '-page');
    if (el) { el.style.display = 'block'; requestAnimationFrame(function() { el.classList.add('admin-page-visible'); }); }
    document.querySelectorAll('.admin-nav-link').forEach(function(a) { a.classList.remove('active'); if (a.getAttribute('href') === '#' + id) a.classList.add('active'); });
  }

  function init() {
    document.body.addEventListener('click', function(e) {
      var btn = e.target.closest('.password-toggle');
      if (!btn) return;
      e.preventDefault();
      var wrap = btn.closest('.password-wrap');
      var input = wrap && wrap.querySelector('input');
      if (!input) return;
      if (input.type === 'password') {
        input.type = 'text';
        btn.setAttribute('aria-label', 'Şifreyi gizle');
        btn.setAttribute('title', 'Şifreyi gizle');
        btn.textContent = '🙈';
        btn.classList.add('visible');
      } else {
        input.type = 'password';
        btn.setAttribute('aria-label', 'Şifreyi göster');
        btn.setAttribute('title', 'Şifreyi göster');
        btn.textContent = '👁';
        btn.classList.remove('visible');
      }
    });
    document.getElementById('admin-logout').addEventListener('click', logout);
    var navToggle = document.getElementById('admin-nav-toggle');
    var adminNav = document.getElementById('admin-nav');
    if (navToggle && adminNav) {
      navToggle.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        var open = adminNav.classList.toggle('is-open');
        navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      adminNav.querySelectorAll('.admin-nav-link').forEach(function(link) {
        link.addEventListener('click', function() { adminNav.classList.remove('is-open'); navToggle.setAttribute('aria-expanded', 'false'); });
      });
    }
    document.getElementById('login-form').addEventListener('submit', function(e) {
      e.preventDefault();
      var errEl = document.getElementById('login-error');
      errEl.style.display = 'none';
      errEl.textContent = '';
      var fd = new FormData(this);
      var username = (fd.get('username') || '').toString().trim();
      var password = fd.get('password') || '';
      fetch(API + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: username, password: password }) })
        .then(function(r) { return r.json().then(function(data) { return { status: r.status, data: data }; }); })
        .then(function(result) {
          var res = result.data;
          if (result.status === 200 && res && res.ok && res.token) {
            token = res.token;
            localStorage.setItem('adminToken', token);
            user = res.user || null;
            document.getElementById('login-page').style.display = 'none';
            document.getElementById('admin-app').style.display = 'block';
            showPage('dashboard');
            loadDashboard();
          } else {
            errEl.textContent = (res && res.mesaj) ? res.mesaj : 'Giriş başarısız.';
            errEl.style.display = 'block';
          }
        })
        .catch(function() {
          errEl.textContent = 'Bağlantı hatası. Sunucu çalışıyor mu?';
          errEl.style.display = 'block';
        });
    });

    window.addEventListener('hashchange', onHash);
    document.addEventListener('click', resetIdleTimer);
    document.addEventListener('keydown', resetIdleTimer);
    if (token) {
      get('/api/auth/me').then(function(u) { user = u; document.getElementById('login-page').style.display = 'none'; document.getElementById('admin-app').style.display = 'block'; document.querySelectorAll('[data-super-only]').forEach(function(el) { el.style.display = user.role === 'super_admin' ? '' : 'none'; }); onHash(); resetIdleTimer(); }).catch(logout);
    } else {
      document.getElementById('login-page').style.display = 'block';
    }
  }

  function onHash() {
    var hash = (location.hash || '#dashboard').slice(1);
    if (hash.indexOf('reservations/detail/') === 0) {
      var detailId = hash.slice('reservations/detail/'.length);
      showPage('reservation-detail');
      document.querySelectorAll('.admin-nav-link').forEach(function(a) { a.classList.remove('active'); if (a.getAttribute('href') === '#reservations') a.classList.add('active'); });
      loadReservationDetail(detailId);
      return;
    }
    showPage(hash);
    if (hash === 'dashboard') loadDashboard();
    else if (hash === 'slider') loadSlider();
    else if (hash === 'gallery') loadGallery();
    else if (hash === 'settings') loadSettings();
    else if (hash === 'rooms') loadRooms();
    else if (hash === 'kontejan-fiyat') loadKontejanFiyat();
    else if (hash === 'reservations') loadReservations();
    else if (hash === 'change-requests') loadChangeRequests();
    else if (hash === 'complaints') loadComplaints();
    else if (hash === 'testimonials') loadTestimonials();
    else if (hash === 'services') loadServices();
    else if (hash === 'admins') loadAdmins();
  }

  function groupReservationsByPeriod(rev, period) {
    var groups = {};
    var fmt = period === 'year' ? function(d) { return new Date(d).getFullYear().toString(); } :
      period === 'month' ? function(d) { var x = new Date(d); var m = x.getMonth() + 1; return x.getFullYear() + '-' + (m < 10 ? '0' : '') + m; } :
      function(d) { var x = new Date(d); var start = new Date(x); start.setDate(start.getDate() - start.getDay()); return start.toISOString().slice(0, 10); };
    rev.forEach(function(r) {
      var t = r.createdAt ? new Date(r.createdAt).getTime() : 0;
      if (!t) return;
      var key = fmt(t);
      groups[key] = (groups[key] || 0) + 1;
    });
    var keys = Object.keys(groups).sort();
    if (period === 'week' && keys.length > 12) keys = keys.slice(-12);
    if (period === 'month' && keys.length > 12) keys = keys.slice(-12);
    if (period === 'year' && keys.length > 6) keys = keys.slice(-6);
    return { labels: keys, values: keys.map(function(k) { return groups[k] || 0; }) };
  }

  var dashboardCharts = { rezervasyon: null, etkilesim: null };

  function loadDashboard() {
    var wrap = document.getElementById('dashboard-page');
    Promise.all([get('/api/admin/reservations'), get('/api/admin/rooms'), get('/api/admin/testimonials'), get('/api/admin/gallery')]).then(function(arr) {
      var rev = arr[0] || [];
      var rooms = arr[1] || [];
      var testimonials = arr[2] || [];
      var galleryCount = (arr[3] || []).length;
      var onayli = rev.filter(function(r) { return r.status === 'onaylandi'; }).length;
      var beklemede = rev.filter(function(r) { return r.status === 'beklemede'; }).length;
      var iptal = rev.filter(function(r) { return r.status === 'iptal'; }).length;
      var activeRooms = rooms.filter(function(r) { return r.active !== false; }).length;
      var todayStr = new Date().toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

      wrap.innerHTML =
        '<div class="dashboard-welcome">' +
          '<h2>Hoş geldiniz</h2>' +
          '<p>Yönetim paneline genel bakış — ' + todayStr + '</p>' +
        '</div>' +
        '<div class="stats">' +
          '<div class="stat-card stat-card--accent">' +
            '<div class="stat-card-icon">📋</div>' +
            '<h3>Toplam Rezervasyon</h3><p>' + rev.length + '</p>' +
          '</div>' +
          '<div class="stat-card stat-card--success">' +
            '<div class="stat-card-icon">✓</div>' +
            '<h3>Onaylı</h3><p>' + onayli + '</p>' +
          '</div>' +
          '<div class="stat-card stat-card--warning">' +
            '<div class="stat-card-icon">⏳</div>' +
            '<h3>Beklemede</h3><p>' + beklemede + '</p>' +
          '</div>' +
          '<div class="stat-card stat-card--danger">' +
            '<div class="stat-card-icon">✕</div>' +
            '<h3>İptal</h3><p>' + iptal + '</p>' +
          '</div>' +
          '<div class="stat-card">' +
            '<div class="stat-card-icon">🛏</div>' +
            '<h3>Oda Sayısı</h3><p>' + rooms.length + '</p>' +
          '</div>' +
          '<div class="stat-card">' +
            '<div class="stat-card-icon">💬</div>' +
            '<h3>Yorumlar</h3><p>' + (testimonials.length || 0) + '</p>' +
          '</div>' +
        '</div>' +
        '<div class="dashboard-charts">' +
        '<div class="dashboard-chart-card">' +
        '<h3>Rezervasyonlar (zaman içinde)</h3>' +
        '<div class="dashboard-period-tabs"><button type="button" class="dashboard-period-btn active" data-period="week">Haftalık</button><button type="button" class="dashboard-period-btn" data-period="month">Aylık</button><button type="button" class="dashboard-period-btn" data-period="year">Yıllık</button></div>' +
        '<div class="dashboard-chart-wrap"><canvas id="dashboard-rezervasyon-chart"></canvas></div>' +
        '</div>' +
        '<div class="dashboard-chart-card">' +
        '<h3>Rezervasyon durum dağılımı</h3>' +
        '<p class="dashboard-etkilesim-desc">Onaylı, beklemede ve iptal oranları</p>' +
        '<div class="dashboard-chart-wrap dashboard-chart-wrap--half"><canvas id="dashboard-etkilesim-chart"></canvas></div>' +
        '<div class="dashboard-etkilesim-extra">Galeri görseli: <strong>' + galleryCount + '</strong> · Site yorumu: <strong>' + (testimonials.length || 0) + '</strong></div>' +
        '</div>' +
        '</div>';

      var theme = document.body.getAttribute('data-admin-theme') || 'light';
      var isDark = theme === 'dark';
      var textColor = isDark ? '#e8eaed' : '#1a1a1a';
      var gridColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';

      function drawRezervasyonChart(period) {
        if (dashboardCharts.rezervasyon) { dashboardCharts.rezervasyon.destroy(); dashboardCharts.rezervasyon = null; }
        var data = groupReservationsByPeriod(rev, period);
        var ctx = document.getElementById('dashboard-rezervasyon-chart');
        if (!ctx) return;
        var displayLabels = data.labels.map(function(k) { return formatChartLabel(period, k); });
        var barColor = isDark ? 'rgba(212, 160, 23, 0.75)' : 'rgba(184, 134, 11, 0.65)';
        var borderColor = isDark ? 'rgba(212, 160, 23, 0.95)' : 'rgba(184, 134, 11, 0.9)';
        dashboardCharts.rezervasyon = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: displayLabels,
            datasets: [{ label: 'Rezervasyon', data: data.values, backgroundColor: barColor, borderColor: borderColor, borderWidth: 1 }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { display: false } },
            scales: {
              x: { ticks: { color: textColor, maxRotation: 45 }, grid: { color: gridColor } },
              y: { beginAtZero: true, ticks: { color: textColor, stepSize: 1 }, grid: { color: gridColor } }
            }
          }
        });
      }

      function drawEtkilesimChart() {
        if (dashboardCharts.etkilesim) { dashboardCharts.etkilesim.destroy(); dashboardCharts.etkilesim = null; }
        var ctx = document.getElementById('dashboard-etkilesim-chart');
        if (!ctx) return;
        var bgColor = isDark ? '#1a2332' : '#fff';
        dashboardCharts.etkilesim = new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: ['Beklemede', 'Onaylı', 'İptal'],
            datasets: [{ data: [beklemede, onayli, iptal], backgroundColor: ['#f59e0b', '#22c55e', '#ef4444'], borderWidth: 2, borderColor: bgColor }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { position: 'bottom', labels: { color: textColor } } }
          }
        });
      }

      drawRezervasyonChart('week');
      drawEtkilesimChart();

      wrap.querySelectorAll('.dashboard-period-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
          wrap.querySelectorAll('.dashboard-period-btn').forEach(function(b) { b.classList.remove('active'); });
          btn.classList.add('active');
          drawRezervasyonChart(btn.getAttribute('data-period'));
        });
      });
    }).catch(function() { document.getElementById('dashboard-page').innerHTML = '<h2>Dashboard</h2><p>Veriler yüklenemedi.</p>'; });
  }

  function loadSlider() {
    var wrap = document.getElementById('slider-page');
    get('/api/admin/slider').then(function(list) {
      wrap.innerHTML = '<div class="admin-page-header">' +
        '<h2>Slider Yönetimi</h2>' +
        '<div class="mb-1"><button type="button" class="btn btn-primary" id="slider-add">Yeni Slide Ekle</button></div>' +
        '</div>' +
        '<div class="card-list" id="slider-list"></div>' +
        '<div id="slider-form" style="display:none" class="mt-1">' +
        '<h3>Slide Ekle / Düzenle</h3>' +
        '<form id="slider-form-f">' +
        '<input type="hidden" name="id">' +
        '<div class="form-group"><label>Başlık</label><input type="text" name="title" placeholder="Örn: Konforunuz Bizim Önceliğimiz"></div>' +
        '<div class="form-group"><label>Alt başlık</label><input type="text" name="subtitle" placeholder="Örn: Hoş geldiniz"></div>' +
        '<div class="form-group" id="slider-form-order-wrap" style="display:none"><label>Sıra</label><input type="number" name="order" min="0" placeholder="0"></div>' +
        '<div class="form-group" id="slider-form-current-img" style="display:none"><label>Mevcut görsel</label><img id="slider-form-preview" src="" alt="" style="max-width:200px;display:block;border-radius:8px;margin-top:4px"></div>' +
        '<div class="form-group"><label>Görsel</label><input type="file" name="image" accept="image/*"><span class="form-hint" id="slider-form-file-hint">Yeni slide için zorunlu; düzenlerken değiştirmek isterseniz yükleyin.</span></div>' +
        '<button type="submit" class="btn btn-primary">Kaydet</button> <button type="button" class="btn btn-no" id="slider-form-cancel">İptal</button>' +
        '</form></div>';
      var listEl = document.getElementById('slider-list');
      listEl.innerHTML = (list || []).map(function(s, idx) {
        var imgSrc = s.imageUrl ? (s.imageUrl.indexOf('http') === 0 ? s.imageUrl : (window.location.origin + s.imageUrl)) : '';
        return '<div class="card-item" data-slider-id="' + s.id + '" data-order="' + idx + '">' +
          '<img src="' + imgSrc + '" alt="" onerror="this.style.background=\'#ddd\'">' +
          '<p><strong>' + (s.title || '—') + '</strong></p><p>' + (s.subtitle || '') + '</p>' +
          '<div class="card-item-actions">' +
          '<button type="button" class="btn-small room-img-up slider-order-up" title="Yukarı" data-id="' + s.id + '" data-idx="' + idx + '" ' + (idx === 0 ? 'disabled' : '') + '>↑</button>' +
          '<button type="button" class="btn-small room-img-down slider-order-down" title="Aşağı" data-id="' + s.id + '" data-idx="' + idx + '" ' + (idx === (list || []).length - 1 ? 'disabled' : '') + '>↓</button>' +
          '<button type="button" class="btn-small btn-edit" data-id="' + s.id + '" data-edit>Düzenle</button> ' +
          '<button type="button" class="btn-small btn-del" data-id="' + s.id + '" data-del>Sil</button>' +
          '</div></div>';
      }).join('');
      listEl.querySelectorAll('[data-del]').forEach(function(btn) {
        btn.addEventListener('click', function() { if (confirm('Bu slide silinsin mi?')) del('/api/admin/slider/' + btn.dataset.id).then(function() { loadSlider(); }); });
      });
      listEl.querySelectorAll('.slider-order-up').forEach(function(btn) {
        if (btn.disabled) return;
        btn.addEventListener('click', function() {
          var idx = parseInt(btn.dataset.idx, 10);
          if (idx <= 0) return;
          var prev = list[idx - 1];
          var curr = list[idx];
          var fd1 = new FormData(); fd1.append('order', idx - 1);
          var fd2 = new FormData(); fd2.append('order', idx);
          Promise.all([
            fetch(API + '/api/admin/slider/' + encodeURIComponent(curr.id), { method: 'PUT', headers: { 'Authorization': 'Bearer ' + token }, body: fd1 }).then(function(r) { return r.json(); }),
            fetch(API + '/api/admin/slider/' + encodeURIComponent(prev.id), { method: 'PUT', headers: { 'Authorization': 'Bearer ' + token }, body: fd2 }).then(function(r) { return r.json(); })
          ]).then(function() { loadSlider(); }).catch(function() { alert('Sıra güncellenemedi.'); });
        });
      });
      listEl.querySelectorAll('.slider-order-down').forEach(function(btn) {
        if (btn.disabled) return;
        btn.addEventListener('click', function() {
          var idx = parseInt(btn.dataset.idx, 10);
          if (idx >= (list || []).length - 1) return;
          var next = list[idx + 1];
          var curr = list[idx];
          var fd1 = new FormData(); fd1.append('order', idx + 1);
          var fd2 = new FormData(); fd2.append('order', idx);
          Promise.all([
            fetch(API + '/api/admin/slider/' + encodeURIComponent(curr.id), { method: 'PUT', headers: { 'Authorization': 'Bearer ' + token }, body: fd1 }).then(function(r) { return r.json(); }),
            fetch(API + '/api/admin/slider/' + encodeURIComponent(next.id), { method: 'PUT', headers: { 'Authorization': 'Bearer ' + token }, body: fd2 }).then(function(r) { return r.json(); })
          ]).then(function() { loadSlider(); }).catch(function() { alert('Sıra güncellenemedi.'); });
        });
      });
      listEl.querySelectorAll('[data-edit]').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var slide = (list || []).find(function(s) { return s.id === btn.dataset.id; });
          if (!slide) return;
          var form = document.getElementById('slider-form-f');
          form.reset();
          form.querySelector('[name=id]').value = slide.id;
          form.querySelector('[name=title]').value = slide.title || '';
          form.querySelector('[name=subtitle]').value = slide.subtitle || '';
          form.querySelector('[name=order]').value = slide.order !== undefined ? slide.order : '';
          var orderWrap = document.getElementById('slider-form-order-wrap');
          var currentImg = document.getElementById('slider-form-current-img');
          var preview = document.getElementById('slider-form-preview');
          orderWrap.style.display = 'block';
          currentImg.style.display = 'block';
          var previewSrc = slide.imageUrl ? (slide.imageUrl.indexOf('http') === 0 ? slide.imageUrl : (window.location.origin + slide.imageUrl)) : '';
          preview.src = previewSrc;
          preview.style.display = previewSrc ? 'block' : 'none';
          document.getElementById('slider-form-file-hint').textContent = 'Değiştirmek istemezseniz boş bırakın.';
          document.getElementById('slider-form').style.display = 'block';
        });
      });
      document.getElementById('slider-add').addEventListener('click', function() {
        var form = document.getElementById('slider-form-f');
        form.reset();
        form.querySelector('[name=id]').value = '';
        document.getElementById('slider-form-order-wrap').style.display = 'none';
        document.getElementById('slider-form-current-img').style.display = 'none';
        document.getElementById('slider-form-file-hint').textContent = 'Yeni slide için zorunlu; düzenlerken değiştirmek isterseniz yükleyin.';
        document.getElementById('slider-form').style.display = 'block';
      });
      document.getElementById('slider-form-cancel').addEventListener('click', function() { document.getElementById('slider-form').style.display = 'none'; });
      document.getElementById('slider-form-f').addEventListener('submit', function(e) {
        e.preventDefault();
        var fd = new FormData(this);
        var id = fd.get('id');
        var file = fd.get('image');
        var formData = new FormData();
        formData.append('title', fd.get('title') || '');
        formData.append('subtitle', fd.get('subtitle') || '');
        if (id) {
          var orderVal = fd.get('order');
          if (orderVal !== null && orderVal !== '') formData.append('order', parseInt(orderVal, 10));
        }
        if (file && file.size) formData.append('image', file);
        var url = id ? '/api/admin/slider/' + id : '/api/admin/slider';
        var opt = { method: id ? 'PUT' : 'POST', headers: { 'Authorization': 'Bearer ' + token }, body: formData };
        fetch(API + url, opt).then(function(r) { return r.json(); }).then(function(res) {
          if (res.ok) { document.getElementById('slider-form').style.display = 'none'; loadSlider(); }
          else alert(res.mesaj || 'Hata');
        }).catch(function() { alert('İstek başarısız.'); });
      });
    }).catch(function() { wrap.innerHTML = '<h2>Slider Yönetimi</h2><p>Slider verileri yüklenemedi. Sunucu çalışıyor mu?</p>'; });
  }

  function loadGallery() {
    var wrap = document.getElementById('gallery-page');
    get('/api/admin/gallery').then(function(list) {
      list = list || [];
      wrap.innerHTML = '<div class="admin-page-header">' +
        '<h2>Galeri Yönetimi</h2>' +
        '<div class="mb-1"><button type="button" class="btn btn-primary" id="gallery-add">Yeni Resim Ekle</button></div>' +
        '</div>' +
        '<p class="admin-page-desc">Galeri resimleri galeri sayfasında (galeri.html) tam liste halinde gösterilir. <strong>Ana sayfada göster</strong> işaretli olanlar sadece anasayfadaki galeri bölümünde görünür. Sırayı yukarı/aşağı ile değiştirebilirsiniz.</p>' +
        '<div class="card-list" id="gallery-list"></div>' +
        '<div id="gallery-form" style="display:none" class="mt-1">' +
        '<h3>Resim Ekle / Düzenle</h3>' +
        '<form id="gallery-form-f">' +
        '<input type="hidden" name="id">' +
        '<div class="form-group"><label>Açıklama (isteğe bağlı)</label><input type="text" name="caption" placeholder="Görsel açıklaması"></div>' +
        '<div class="form-group"><label class="checkbox-label"><input type="checkbox" name="showOnHome" value="true" checked> Ana sayfada göster</label></div>' +
        '<div class="form-group" id="gallery-form-current-img" style="display:none"><label>Mevcut görsel</label><img id="gallery-form-preview" src="" alt="" style="max-width:200px;display:block;border-radius:8px;margin-top:4px"></div>' +
        '<div class="form-group"><label>Görsel</label><input type="file" name="image" accept="image/*"><span class="form-hint" id="gallery-form-file-hint">Yeni eklemede zorunlu; düzenlerken değiştirmek isterseniz yükleyin.</span></div>' +
        '<button type="submit" class="btn btn-primary">Kaydet</button> <button type="button" class="btn btn-no" id="gallery-form-cancel">İptal</button>' +
        '</form></div>';
      var listEl = document.getElementById('gallery-list');
      var origin = window.location.origin || '';
      listEl.innerHTML = list.map(function(item, idx) {
        var imgSrc = item.imageUrl ? (item.imageUrl.indexOf('http') === 0 ? item.imageUrl : origin + item.imageUrl) : '';
        var showOnHome = item.showOnHome !== false;
        return '<div class="card-item" data-gallery-id="' + item.id + '" data-order="' + idx + '">' +
          '<img src="' + imgSrc + '" alt="" onerror="this.style.background=\'#ddd\'">' +
          '<p>' + (item.caption || '—') + '</p>' +
          '<label class="gallery-show-on-home-wrap"><input type="checkbox" class="gallery-show-on-home" data-id="' + item.id + '" ' + (showOnHome ? 'checked' : '') + '> Ana sayfada göster</label>' +
          '<div class="card-item-actions">' +
          '<button type="button" class="btn-small room-img-up gallery-order-up" title="Yukarı" data-id="' + item.id + '" data-idx="' + idx + '" ' + (idx === 0 ? 'disabled' : '') + '>↑</button>' +
          '<button type="button" class="btn-small room-img-down gallery-order-down" title="Aşağı" data-id="' + item.id + '" data-idx="' + idx + '" ' + (idx === list.length - 1 ? 'disabled' : '') + '>↓</button>' +
          '<button type="button" class="btn-small btn-edit" data-id="' + item.id + '" data-edit>Düzenle</button> ' +
          '<button type="button" class="btn-small btn-del" data-id="' + item.id + '" data-del>Sil</button>' +
          '</div></div>';
      }).join('');
      listEl.querySelectorAll('[data-del]').forEach(function(btn) {
        btn.addEventListener('click', function() {
          if (confirm('Bu resim silinsin mi?')) del('/api/admin/gallery/' + btn.dataset.id).then(function() { loadGallery(); }).catch(function() { alert('Silinemedi.'); });
        });
      });
      listEl.querySelectorAll('.gallery-show-on-home').forEach(function(cb) {
        cb.addEventListener('change', function() {
          var id = cb.dataset.id;
          var on = cb.checked;
          patch('/api/admin/gallery/' + encodeURIComponent(id), { showOnHome: on }).then(function() { }).catch(function() { cb.checked = !on; alert('Güncellenemedi.'); });
        });
      });
      listEl.querySelectorAll('.gallery-order-up').forEach(function(btn) {
        if (btn.disabled) return;
        btn.addEventListener('click', function() {
          var idx = parseInt(btn.dataset.idx, 10);
          if (idx <= 0) return;
          var prev = list[idx - 1];
          var curr = list[idx];
          Promise.all([
            put('/api/admin/gallery/' + encodeURIComponent(curr.id), { order: idx - 1 }),
            put('/api/admin/gallery/' + encodeURIComponent(prev.id), { order: idx })
          ]).then(function() { loadGallery(); }).catch(function() { alert('Sıra güncellenemedi.'); });
        });
      });
      listEl.querySelectorAll('.gallery-order-down').forEach(function(btn) {
        if (btn.disabled) return;
        btn.addEventListener('click', function() {
          var idx = parseInt(btn.dataset.idx, 10);
          if (idx >= list.length - 1) return;
          var next = list[idx + 1];
          var curr = list[idx];
          Promise.all([
            put('/api/admin/gallery/' + encodeURIComponent(curr.id), { order: idx + 1 }),
            put('/api/admin/gallery/' + encodeURIComponent(next.id), { order: idx })
          ]).then(function() { loadGallery(); }).catch(function() { alert('Sıra güncellenemedi.'); });
        });
      });
      listEl.querySelectorAll('[data-edit]').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var item = list.find(function(g) { return g.id === btn.dataset.id; });
          if (!item) return;
          var form = document.getElementById('gallery-form-f');
          form.reset();
          form.querySelector('[name=id]').value = item.id;
          form.querySelector('[name=caption]').value = item.caption || '';
          form.querySelector('[name=showOnHome]').checked = item.showOnHome !== false;
          var currentImg = document.getElementById('gallery-form-current-img');
          var preview = document.getElementById('gallery-form-preview');
          currentImg.style.display = 'block';
          var previewSrc = item.imageUrl ? (item.imageUrl.indexOf('http') === 0 ? item.imageUrl : origin + item.imageUrl) : '';
          preview.src = previewSrc;
          preview.style.display = previewSrc ? 'block' : 'none';
          document.getElementById('gallery-form-file-hint').textContent = 'Değiştirmek istemezseniz boş bırakın.';
          document.getElementById('gallery-form').style.display = 'block';
        });
      });
      document.getElementById('gallery-add').addEventListener('click', function() {
        var form = document.getElementById('gallery-form-f');
        form.reset();
        form.querySelector('[name=id]').value = '';
        form.querySelector('[name=showOnHome]').checked = true;
        document.getElementById('gallery-form-current-img').style.display = 'none';
        document.getElementById('gallery-form-file-hint').textContent = 'Yeni eklemede zorunlu.';
        document.getElementById('gallery-form').style.display = 'block';
      });
      document.getElementById('gallery-form-cancel').addEventListener('click', function() { document.getElementById('gallery-form').style.display = 'none'; });
      document.getElementById('gallery-form-f').addEventListener('submit', function(e) {
        e.preventDefault();
        var fd = new FormData(this);
        var id = fd.get('id');
        var file = fd.get('image');
        if (!id && (!file || !file.size)) { alert('Yeni resim eklerken bir dosya seçin.'); return; }
        var formData = new FormData();
        formData.append('caption', fd.get('caption') || '');
        formData.append('showOnHome', this.querySelector('[name=showOnHome]').checked ? 'true' : 'false');
        if (file && file.size) formData.append('image', file);
        var url = id ? '/api/admin/gallery/' + encodeURIComponent(id) : '/api/admin/gallery';
        var opt = { method: id ? 'PUT' : 'POST', headers: { 'Authorization': 'Bearer ' + token }, body: formData };
        fetch(API + url, opt).then(function(r) { return r.json(); }).then(function(res) {
          if (res.ok) { document.getElementById('gallery-form').style.display = 'none'; loadGallery(); }
          else alert(res.mesaj || 'Hata');
        }).catch(function() { alert('İstek başarısız.'); });
      });
    }).catch(function() { wrap.innerHTML = '<h2>Galeri Yönetimi</h2><p>Galeri yüklenemedi.</p>'; });
  }

  function loadSettings() {
    var wrap = document.getElementById('settings-page');
    Promise.all([get('/api/admin/settings'), get('/api/admin/rooms')]).then(function(arr) {
      var s = arr[0] || {};
      var rooms = arr[1] || [];
      var defaultOverview = (typeof window.DEFAULT_HOTEL_OVERVIEW !== 'undefined') ? JSON.parse(JSON.stringify(window.DEFAULT_HOTEL_OVERVIEW)) : { header: { title: 'Genel bakış', lead: '' }, cards: [], highlightAbout: {}, highlightFeatures: {}, addressCard: {}, fullCards: [] };
      var currentSettings = {
        introText: s.introText || '',
        featuredRoomIds: s.featuredRoomIds || [],
        aboutStory: s.aboutStory || '',
        mission: s.mission || '',
        vision: s.vision || '',
        contact: s.contact || { address: '', phone: '', email: '', mapEmbed: '', extra: [] },
        hotelOverview: s.hotelOverview && s.hotelOverview.header ? s.hotelOverview : defaultOverview,
        iban: s.iban || '',
        bankName: s.bankName || '',
        paymentInstructions: s.paymentInstructions || ''
      };
      if (!Array.isArray(currentSettings.contact.extra)) currentSettings.contact.extra = [];
      var featuredStr = (currentSettings.featuredRoomIds || []).join(', ');
      var c = currentSettings.contact || {};
      wrap.innerHTML =
        '<h2>Ana Sayfa & Ayarlar</h2>' +
        '<div class="settings-section-tabs">' +
        '<button type="button" class="settings-section-btn active" data-section="tanitim">Tanıtım</button>' +
        '<button type="button" class="settings-section-btn" data-section="hakkimizda">Hakkımızda</button>' +
        '<button type="button" class="settings-section-btn" data-section="iletisim">İletişim</button>' +
        '<button type="button" class="settings-section-btn" data-section="havale-eft">Havale / EFT</button>' +
        '<button type="button" class="settings-section-btn" data-section="genelbakis">Genel Bakış</button>' +
        '</div>' +
        '<div id="settings-section-content" class="settings-section-content"></div>';
      function renderSection(sectionId) {
        var content = document.getElementById('settings-section-content');
        if (!content) return;
        if (sectionId === 'tanitim') {
          content.innerHTML = '<form id="settings-form-tanitim" class="settings-section-form">' +
            '<div class="form-group"><label>Tanıtım metni (anasayfa)</label><textarea name="introText" rows="3">' + (currentSettings.introText || '') + '</textarea></div>' +
            '<div class="form-group"><label>Öne çıkan oda ID’leri (virgülle)</label><input type="text" name="featuredRoomIds" value="' + featuredStr + '" placeholder="id1, id2"></div>' +
            '<button type="submit" class="btn btn-primary">Kaydet</button></form>';
          content.querySelector('form').addEventListener('submit', function(e) {
            e.preventDefault();
            var fd = new FormData(this);
            currentSettings.introText = fd.get('introText') || '';
            currentSettings.featuredRoomIds = (fd.get('featuredRoomIds') || '').split(',').map(function(x) { return x.trim(); }).filter(Boolean);
            featuredStr = (currentSettings.featuredRoomIds || []).join(', ');
            put('/api/admin/settings', currentSettings).then(function(res) { if (res.ok) alert('Kaydedildi.'); else alert(res.mesaj || 'Hata'); });
          });
        } else if (sectionId === 'hakkimizda') {
          content.innerHTML = '<form id="settings-form-hakkimizda" class="settings-section-form">' +
            '<div class="form-group"><label>Hakkımızda - Hikaye</label><textarea name="aboutStory" rows="4">' + (currentSettings.aboutStory || '') + '</textarea></div>' +
            '<div class="form-group"><label>Misyon</label><textarea name="mission" rows="4" placeholder="Misyon metni">' + (currentSettings.mission || '') + '</textarea></div>' +
            '<div class="form-group"><label>Vizyon</label><textarea name="vision" rows="4" placeholder="Vizyon metni">' + (currentSettings.vision || '') + '</textarea></div>' +
            '<button type="submit" class="btn btn-primary">Kaydet</button></form>';
          content.querySelector('form').addEventListener('submit', function(e) {
            e.preventDefault();
            var fd = new FormData(this);
            currentSettings.aboutStory = fd.get('aboutStory') || '';
            currentSettings.mission = fd.get('mission') || '';
            currentSettings.vision = fd.get('vision') || '';
            put('/api/admin/settings', currentSettings).then(function(res) { if (res.ok) alert('Kaydedildi.'); else alert(res.mesaj || 'Hata'); });
          });
        } else if (sectionId === 'havale-eft') {
          var ibanVal = (currentSettings.iban || '').replace(/"/g, '&quot;');
          var bankVal = (currentSettings.bankName || '').replace(/"/g, '&quot;');
          var payInstVal = (currentSettings.paymentInstructions || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
          content.innerHTML = '<form id="settings-form-havale-eft" class="settings-section-form">' +
            '<p class="settings-hint">Bu bilgiler rezervasyon formunda Havale/EFT seçeneği seçildiğinde müşteriye gösterilir. IBAN bilgisi ekleyebilir veya değiştirebilirsiniz.</p>' +
            '<div class="form-group"><label>Banka / Hesap adı</label><input type="text" name="bankName" value="' + bankVal + '" placeholder="Örn: Ziraat Bankası - Toprak Otel"></div>' +
            '<div class="form-group"><label>IBAN</label><input type="text" name="iban" value="' + ibanVal + '" placeholder="TR00 0000 0000 0000 0000 0000 00"></div>' +
            '<div class="form-group"><label>Ek açıklama (isteğe bağlı)</label><textarea name="paymentInstructions" rows="3" placeholder="Örn: Açıklama kısmına rezervasyon numaranızı yazınız.">' + payInstVal + '</textarea></div>' +
            '<button type="submit" class="btn btn-primary">Kaydet</button></form>';
          content.querySelector('form').addEventListener('submit', function(e) {
            e.preventDefault();
            var fd = new FormData(this);
            currentSettings.bankName = (fd.get('bankName') || '').trim();
            currentSettings.iban = (fd.get('iban') || '').trim();
            currentSettings.paymentInstructions = (fd.get('paymentInstructions') || '').trim();
            put('/api/admin/settings', currentSettings).then(function(res) { if (res.ok) alert('Kaydedildi.'); else alert(res.mesaj || 'Hata'); });
          });
        } else if (sectionId === 'iletisim') {
          var extra = (c.extra || []);
          var extraHtml = extra.map(function(item, i) {
            var lab = (item.label || '').replace(/"/g, '&quot;');
            var val = (item.value || '').replace(/"/g, '&quot;');
            return '<div class="contact-extra-row" data-index="' + i + '"><div class="form-row contact-extra-fields"><div class="form-group"><label>Alan adı</label><input type="text" name="extraLabel_' + i + '" value="' + lab + '" placeholder="Örn: Fax, WhatsApp"></div><div class="form-group"><label>Değer</label><input type="text" name="extraValue_' + i + '" value="' + val + '" placeholder="Değer"></div></div><button type="button" class="btn-small btn-no contact-extra-remove">Sil</button></div>';
          }).join('');
          content.innerHTML = '<form id="settings-form-iletisim" class="settings-section-form">' +
            '<div class="form-group"><label>Adres</label><input type="text" name="address" value="' + (c.address || '') + '"></div>' +
            '<div class="form-group"><label>Telefon</label><input type="text" name="phone" value="' + (c.phone || '') + '"></div>' +
            '<div class="form-group"><label>E-posta</label><input type="text" name="email" value="' + (c.email || '') + '"></div>' +
            '<div class="form-group"><label>Harita embed URL</label><input type="text" name="mapEmbed" value="' + (c.mapEmbed || '') + '" placeholder="Google Maps embed URL"></div>' +
            '<h4 class="settings-subheading">Ek alanlar</h4>' +
            '<div id="contact-extra-list">' + extraHtml + '</div>' +
            '<button type="button" class="btn btn-outline btn-sm mt-1" id="contact-extra-add">+ Alan ekle</button>' +
            '<button type="submit" class="btn btn-primary" style="margin-top:1rem">Kaydet</button></form>';
          content.querySelector('#contact-extra-add').addEventListener('click', function() {
            var list = document.getElementById('contact-extra-list');
            var i = list.querySelectorAll('.contact-extra-row').length;
            var div = document.createElement('div');
            div.className = 'contact-extra-row';
            div.setAttribute('data-index', i);
            div.innerHTML = '<div class="form-row contact-extra-fields"><div class="form-group"><label>Alan adı</label><input type="text" name="extraLabel_' + i + '" placeholder="Örn: Fax, WhatsApp"></div><div class="form-group"><label>Değer</label><input type="text" name="extraValue_' + i + '" placeholder="Değer"></div></div><button type="button" class="btn-small btn-no contact-extra-remove">Sil</button>';
            list.appendChild(div);
            div.querySelector('.contact-extra-remove').addEventListener('click', function() { div.remove(); });
          });
          content.querySelectorAll('.contact-extra-remove').forEach(function(btn) {
            btn.addEventListener('click', function() { btn.closest('.contact-extra-row').remove(); });
          });
          content.querySelector('form').addEventListener('submit', function(e) {
            e.preventDefault();
            var fd = new FormData(this);
            var extraRows = content.querySelectorAll('#contact-extra-list .contact-extra-row');
            var extraData = [];
            extraRows.forEach(function(row) {
              var inputs = row.querySelectorAll('input[name^="extraLabel_"], input[name^="extraValue_"]');
              var label = '';
              var value = '';
              inputs.forEach(function(inp) {
                if (inp.name.indexOf('extraLabel_') === 0) label = inp.value.trim();
                else value = inp.value.trim();
              });
              if (label || value) extraData.push({ label: label || 'Alan', value: value });
            });
            currentSettings.contact = {
              address: fd.get('address') || '',
              phone: fd.get('phone') || '',
              email: fd.get('email') || '',
              mapEmbed: fd.get('mapEmbed') || '',
              extra: extraData
            };
            c = currentSettings.contact;
            put('/api/admin/settings', currentSettings).then(function(res) { if (res.ok) alert('Kaydedildi.'); else alert(res.mesaj || 'Hata'); });
          });
        } else if (sectionId === 'genelbakis') {
          var ho = currentSettings.hotelOverview || defaultOverview;
          var header = ho.header || {};
          var cards = ho.cards || [];
          var cardsHtml = cards.map(function(card, i) {
            var type = card.type || 'text';
            var textVal = (card.text || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
            var itemsVal = (card.items || []).join('\n').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
            var wideChecked = card.wide ? ' checked' : '';
            return '<div class="hotel-overview-card-row" data-index="' + i + '">' +
              '<div class="form-row"><div class="form-group"><label>İkon (emoji)</label><input type="text" name="card_icon_' + i + '" value="' + (card.icon || '').replace(/"/g, '&quot;') + '" placeholder="🏨" maxlength="4"></div>' +
              '<div class="form-group" style="flex:2"><label>Başlık</label><input type="text" name="card_title_' + i + '" value="' + (card.title || '').replace(/"/g, '&quot;') + '"></div></div>' +
              '<div class="form-group"><label>İçerik tipi</label><select name="card_type_' + i + '"><option value="text"' + (type === 'text' ? ' selected' : '') + '>Metin</option><option value="list"' + (type === 'list' ? ' selected' : '') + '>Madde listesi</option></select></div>' +
              '<div class="form-group card-text-wrap"><label>Metin</label><textarea name="card_text_' + i + '" rows="2">' + textVal + '</textarea></div>' +
              '<div class="form-group card-items-wrap" style="display:' + (type === 'list' ? 'block' : 'none') + '"><label>Maddeler (her satıra bir)</label><textarea name="card_items_' + i + '" rows="3">' + itemsVal + '</textarea></div>' +
              '<div class="form-group"><label><input type="checkbox" name="card_wide_' + i + '"' + wideChecked + '> Geniş kart</label></div>' +
              '<button type="button" class="btn-small btn-no hotel-overview-card-remove">Kartı sil</button></div>';
          }).join('');
          var about = ho.highlightAbout || {};
          var feat = ho.highlightFeatures || {};
          var addr = ho.addressCard || {};
          var fullCards = ho.fullCards || [];
          var fullCardsHtml = fullCards.map(function(fc, i) {
            var t = (fc.text || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
            return '<div class="hotel-overview-full-row" data-index="' + i + '">' +
              '<div class="form-row"><div class="form-group"><label>İkon</label><input type="text" name="full_icon_' + i + '" value="' + (fc.icon || '').replace(/"/g, '&quot;') + '" placeholder="💳"></div>' +
              '<div class="form-group" style="flex:2"><label>Başlık</label><input type="text" name="full_title_' + i + '" value="' + (fc.title || '').replace(/"/g, '&quot;') + '"></div></div>' +
              '<div class="form-group"><label>Metin</label><textarea name="full_text_' + i + '" rows="2">' + t + '</textarea></div>' +
              '<button type="button" class="btn-small btn-no hotel-overview-full-remove">Sil</button></div>';
          }).join('');
          content.innerHTML = '<form id="settings-form-genelbakis" class="settings-section-form">' +
            '<h4 class="settings-subheading">Başlık alanı</h4>' +
            '<div class="form-row"><div class="form-group"><label>Başlık</label><input type="text" name="ho_header_title" value="' + (header.title || '').replace(/"/g, '&quot;') + '"></div>' +
            '<div class="form-group" style="flex:2"><label>Alt metin</label><input type="text" name="ho_header_lead" value="' + (header.lead || '').replace(/"/g, '&quot;') + '"></div></div>' +
            '<h4 class="settings-subheading">Kartlar (Genel bakış grid)</h4>' +
            '<div id="hotel-overview-cards-list">' + cardsHtml + '</div>' +
            '<button type="button" class="btn btn-outline btn-sm mt-1" id="hotel-overview-card-add">+ Kart ekle</button>' +
            '<h4 class="settings-subheading mt-2">Bu konaklama yeri hakkında</h4>' +
            '<div class="form-group"><label>Başlık</label><input type="text" name="ho_about_title" value="' + (about.title || '').replace(/"/g, '&quot;') + '"></div>' +
            '<div class="form-group"><label>Metin</label><textarea name="ho_about_text" rows="2">' + (about.text || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') + '</textarea></div>' +
            '<div class="form-group"><label>Etiketler (her satıra bir)</label><textarea name="ho_about_tags" rows="3">' + (about.tags || []).join('\n').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') + '</textarea></div>' +
            '<h4 class="settings-subheading mt-2">Öne çıkanlar</h4>' +
            '<div class="form-group"><label>Başlık</label><input type="text" name="ho_feat_title" value="' + (feat.title || '').replace(/"/g, '&quot;') + '"></div>' +
            '<div class="form-group"><label>Maddeler (her satıra bir)</label><textarea name="ho_feat_items" rows="4">' + (feat.items || []).join('\n').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') + '</textarea></div>' +
            '<h4 class="settings-subheading mt-2">Bölge ve adres</h4>' +
            '<div class="form-group"><label>Adres</label><input type="text" name="ho_address" value="' + (addr.address || '').replace(/"/g, '&quot;') + '"></div>' +
            '<div class="form-group"><label>Yakın noktalar (her satıra bir)</label><textarea name="ho_address_points" rows="4">' + (addr.points || []).join('\n').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') + '</textarea></div>' +
            '<h4 class="settings-subheading mt-2">Tam genişlik kartlar (Ücretler, Engelliler vb.)</h4>' +
            '<div id="hotel-overview-full-list">' + fullCardsHtml + '</div>' +
            '<button type="button" class="btn btn-outline btn-sm mt-1" id="hotel-overview-full-add">+ Kart ekle</button>' +
            '<button type="submit" class="btn btn-primary" style="margin-top:1.5rem">Kaydet</button></form>';
          content.querySelectorAll('select[name^="card_type_"]').forEach(function(sel) {
            sel.addEventListener('change', function() {
              var row = sel.closest('.hotel-overview-card-row');
              var textWrap = row.querySelector('.card-text-wrap');
              var itemsWrap = row.querySelector('.card-items-wrap');
              if (sel.value === 'list') { textWrap.style.display = 'none'; itemsWrap.style.display = 'block'; } else { textWrap.style.display = 'block'; itemsWrap.style.display = 'none'; }
            });
          });
          content.querySelector('#hotel-overview-card-add').addEventListener('click', function() {
            var list = document.getElementById('hotel-overview-cards-list');
            var i = list.querySelectorAll('.hotel-overview-card-row').length;
            var div = document.createElement('div');
            div.className = 'hotel-overview-card-row';
            div.setAttribute('data-index', i);
            div.innerHTML = '<div class="form-row"><div class="form-group"><label>İkon (emoji)</label><input type="text" name="card_icon_' + i + '" placeholder="🏨" maxlength="4"></div><div class="form-group" style="flex:2"><label>Başlık</label><input type="text" name="card_title_' + i + '"></div></div>' +
              '<div class="form-group"><label>İçerik tipi</label><select name="card_type_' + i + '"><option value="text">Metin</option><option value="list">Madde listesi</option></select></div>' +
              '<div class="form-group card-text-wrap"><label>Metin</label><textarea name="card_text_' + i + '" rows="2"></textarea></div>' +
              '<div class="form-group card-items-wrap" style="display:none"><label>Maddeler (her satıra bir)</label><textarea name="card_items_' + i + '" rows="3"></textarea></div>' +
              '<div class="form-group"><label><input type="checkbox" name="card_wide_' + i + '"> Geniş kart</label></div>' +
              '<button type="button" class="btn-small btn-no hotel-overview-card-remove">Kartı sil</button>';
            list.appendChild(div);
            div.querySelector('.hotel-overview-card-remove').addEventListener('click', function() { div.remove(); });
            div.querySelector('select').addEventListener('change', function() {
              var textWrap = div.querySelector('.card-text-wrap'); var itemsWrap = div.querySelector('.card-items-wrap');
              if (this.value === 'list') { textWrap.style.display = 'none'; itemsWrap.style.display = 'block'; } else { textWrap.style.display = 'block'; itemsWrap.style.display = 'none'; }
            });
          });
          content.querySelectorAll('.hotel-overview-card-remove').forEach(function(btn) { btn.addEventListener('click', function() { btn.closest('.hotel-overview-card-row').remove(); }); });
          content.querySelector('#hotel-overview-full-add').addEventListener('click', function() {
            var list = document.getElementById('hotel-overview-full-list');
            var i = list.querySelectorAll('.hotel-overview-full-row').length;
            var div = document.createElement('div');
            div.className = 'hotel-overview-full-row';
            div.setAttribute('data-index', i);
            div.innerHTML = '<div class="form-row"><div class="form-group"><label>İkon</label><input type="text" name="full_icon_' + i + '" placeholder="💳"></div><div class="form-group" style="flex:2"><label>Başlık</label><input type="text" name="full_title_' + i + '"></div></div><div class="form-group"><label>Metin</label><textarea name="full_text_' + i + '" rows="2"></textarea></div><button type="button" class="btn-small btn-no hotel-overview-full-remove">Sil</button>';
            list.appendChild(div);
            div.querySelector('.hotel-overview-full-remove').addEventListener('click', function() { div.remove(); });
          });
          content.querySelectorAll('.hotel-overview-full-remove').forEach(function(btn) { btn.addEventListener('click', function() { btn.closest('.hotel-overview-full-row').remove(); }); });
          content.querySelector('form').addEventListener('submit', function(e) {
            e.preventDefault();
            var fd = new FormData(this);
            var cardsList = content.querySelectorAll('#hotel-overview-cards-list .hotel-overview-card-row');
            var newCards = [];
            cardsList.forEach(function(row) {
              var iconInp = row.querySelector('input[name^="card_icon_"]');
              var titleInp = row.querySelector('input[name^="card_title_"]');
              var typeSel = row.querySelector('select[name^="card_type_"]');
              var textTa = row.querySelector('textarea[name^="card_text_"]');
              var itemsTa = row.querySelector('textarea[name^="card_items_"]');
              var wideCb = row.querySelector('input[name^="card_wide_"]');
              var icon = (iconInp ? fd.get(iconInp.name) : '') || '';
              var title = (titleInp ? fd.get(titleInp.name) : '') || '';
              var type = (typeSel ? fd.get(typeSel.name) : '') || 'text';
              var text = (textTa ? fd.get(textTa.name) : '') || '';
              var itemsStr = (itemsTa ? fd.get(itemsTa.name) : '') || '';
              var items = itemsStr ? itemsStr.split('\n').map(function(x) { return x.trim(); }).filter(Boolean) : [];
              var wide = wideCb ? (fd.get(wideCb.name) === 'on') : false;
              newCards.push({ icon: String(icon).trim(), title: String(title).trim(), type: type, text: type === 'text' ? String(text).trim() : '', items: type === 'list' ? items : undefined, wide: wide });
            });
            var fullList = content.querySelectorAll('#hotel-overview-full-list .hotel-overview-full-row');
            var newFull = [];
            fullList.forEach(function(row) {
              var iconInp = row.querySelector('input[name^="full_icon_"]');
              var titleInp = row.querySelector('input[name^="full_title_"]');
              var textInp = row.querySelector('textarea[name^="full_text_"]');
              newFull.push({ icon: (fd.get(iconInp.name) || '').trim(), title: (fd.get(titleInp.name) || '').trim(), text: (fd.get(textInp.name) || '').trim() });
            });
            var aboutTagsStr = (fd.get('ho_about_tags') || '').trim();
            var aboutTags = aboutTagsStr ? aboutTagsStr.split('\n').map(function(x) { return x.trim(); }).filter(Boolean) : [];
            var featItemsStr = (fd.get('ho_feat_items') || '').trim();
            var addrPointsStr = (fd.get('ho_address_points') || '').trim();
            currentSettings.hotelOverview = {
              header: { title: (fd.get('ho_header_title') || '').trim(), lead: (fd.get('ho_header_lead') || '').trim() },
              cards: newCards,
              highlightAbout: { title: (fd.get('ho_about_title') || '').trim(), text: (fd.get('ho_about_text') || '').trim(), tags: aboutTags },
              highlightFeatures: { title: (fd.get('ho_feat_title') || '').trim(), items: featItemsStr ? featItemsStr.split('\n').map(function(x) { return x.trim(); }).filter(Boolean) : [] },
              addressCard: { address: (fd.get('ho_address') || '').trim(), points: addrPointsStr ? addrPointsStr.split('\n').map(function(x) { return x.trim(); }).filter(Boolean) : [] },
              fullCards: newFull
            };
            put('/api/admin/settings', currentSettings).then(function(res) { if (res.ok) alert('Kaydedildi.'); else alert(res.mesaj || 'Hata'); });
          });
        }
      }
      wrap.querySelectorAll('.settings-section-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
          wrap.querySelectorAll('.settings-section-btn').forEach(function(b) { b.classList.remove('active'); });
          btn.classList.add('active');
          renderSection(btn.getAttribute('data-section'));
        });
      });
      renderSection('tanitim');
    });
  }

  function loadRooms() {
    var wrap = document.getElementById('rooms-page');
    get('/api/admin/rooms').then(function(rooms) {
      wrap.innerHTML = '<div class="admin-page-header">' +
        '<h2>Oda Yönetimi</h2>' +
        '<div class="mb-1"><button type="button" class="btn btn-primary" id="room-add">Yeni Oda Ekle</button></div>' +
        '</div>' +
        '<div class="table-wrap"><table><thead><tr><th>Oda</th><th>Oda ID</th><th>Kişi</th><th>Durum</th><th>İşlem</th></tr></thead><tbody id="rooms-tbody"></tbody></table></div>' +
        '<div id="room-form" style="display:none" class="mt-1"><h3 id="room-form-title">Oda Ekle</h3><form id="room-form-f">' +
        '<input type="hidden" id="room-form-edit-id" value="">' +
        '<div class="form-group"><label>Oda adı / tipi</label><input type="text" name="name" required placeholder="Örn: Standart Oda, Suite"></div>' +
        '<div class="form-group"><label>Max kişi sayısı</label><input type="number" name="capacity" min="1" max="20" value="2" placeholder="2"></div>' +
        '<div class="form-group"><label>Açıklama</label><textarea name="description" rows="3" placeholder="Oda açıklaması"></textarea></div>' +
        '<div class="form-group"><label>Hizmetler / özellikler (her satıra bir)</label><textarea name="features" rows="3" placeholder="WiFi\nMinibar\nBalkon"></textarea></div>' +
        '<div class="form-group" id="room-form-images-list-wrap" style="display:none"><label>Mevcut fotoğraflar</label><p class="form-hint">Sırayı değiştirmek için yukarı/aşağı, silmek için Sil butonunu kullanın.</p><div id="room-form-images-list" class="room-images-sortable"></div></div>' +
        '<div class="form-group"><label>Yeni fotoğraf ekle</label><input type="file" name="images" multiple accept="image/*"></div>' +
        '<div class="form-group"><label><input type="checkbox" name="active" checked> Aktif (satışta)</label></div>' +
        '<button type="submit" class="btn btn-primary">Kaydet</button> <button type="button" class="btn btn-no" id="room-form-cancel">İptal</button></form></div>';
      var currentRoomImages = [];
      function renderRoomImagesList() {
        var listEl = document.getElementById('room-form-images-list');
        if (!listEl) return;
        var origin = window.location.origin || '';
        listEl.innerHTML = currentRoomImages.map(function(url, i) {
          var src = url.indexOf('http') === 0 ? url : (origin + (url.indexOf('/') === 0 ? url : '/' + url));
          return '<div class="room-image-item" data-index="' + i + '">' +
            '<img src="' + src + '" alt="" onerror="this.style.background=\'#ddd\'">' +
            '<span class="room-image-order">' + (i + 1) + '</span>' +
            '<div class="room-image-actions">' +
            '<button type="button" class="btn-small room-img-up" title="Yukarı" ' + (i === 0 ? 'disabled' : '') + '>↑</button>' +
            '<button type="button" class="btn-small room-img-down" title="Aşağı" ' + (i === currentRoomImages.length - 1 ? 'disabled' : '') + '>↓</button>' +
            '<button type="button" class="btn-small btn-del room-img-remove" title="Sil">Sil</button>' +
            '</div></div>';
        }).join('');
        listEl.querySelectorAll('.room-img-up').forEach(function(btn) {
          btn.addEventListener('click', function() {
            var idx = parseInt(btn.closest('.room-image-item').dataset.index, 10);
            if (idx <= 0) return;
            var t = currentRoomImages[idx]; currentRoomImages[idx] = currentRoomImages[idx - 1]; currentRoomImages[idx - 1] = t;
            renderRoomImagesList();
          });
        });
        listEl.querySelectorAll('.room-img-down').forEach(function(btn) {
          btn.addEventListener('click', function() {
            var idx = parseInt(btn.closest('.room-image-item').dataset.index, 10);
            if (idx >= currentRoomImages.length - 1) return;
            var t = currentRoomImages[idx]; currentRoomImages[idx] = currentRoomImages[idx + 1]; currentRoomImages[idx + 1] = t;
            renderRoomImagesList();
          });
        });
        listEl.querySelectorAll('.room-img-remove').forEach(function(btn) {
          btn.addEventListener('click', function() {
            var idx = parseInt(btn.closest('.room-image-item').dataset.index, 10);
            currentRoomImages.splice(idx, 1);
            renderRoomImagesList();
            if (currentRoomImages.length === 0) document.getElementById('room-form-images-list-wrap').style.display = 'none';
          });
        });
      }
      var roomsList = rooms || [];
      var tbody = document.getElementById('rooms-tbody');
      tbody.innerHTML = roomsList.map(function(r) {
        var isActive = r.active !== false;
        return '<tr data-id="' + (r.id || '') + '"><td>' + (r.name || '') + '</td><td><code class="room-id-cell">' + (r.id || '') + '</code></td><td>' + (r.capacity != null ? r.capacity : '—') + '</td><td><button type="button" class="btn-small room-toggle-status ' + (isActive ? 'btn-active' : 'btn-passive') + '" data-id="' + r.id + '" data-active="' + isActive + '" title="' + (isActive ? 'Pasif yap' : 'Aktif yap') + '">' + (isActive ? 'Aktif' : 'Pasif') + '</button></td><td><button type="button" class="btn-small btn-edit" data-id="' + r.id + '" title="Düzenle">Düzenle</button> <button type="button" class="btn-small btn-del" data-id="' + r.id + '" data-del>Sil</button></td></tr>';
      }).join('');
      tbody.querySelectorAll('[data-del]').forEach(function(btn) {
        btn.addEventListener('click', function() { if (confirm('Bu oda kalıcı olarak silinecek. Emin misiniz?')) del('/api/admin/rooms/' + btn.dataset.id).then(function(res) { if (res && !res.ok) alert(res.mesaj || 'Silinemedi.'); loadRooms(); }).catch(function() { alert('Silinemedi.'); loadRooms(); }); });
      });
      tbody.querySelectorAll('.btn-edit').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var room = roomsList.find(function(r) { return r.id === btn.dataset.id; });
          if (!room) return;
          var formEl = document.getElementById('room-form-f');
          var titleEl = document.getElementById('room-form-title');
          var editIdEl = document.getElementById('room-form-edit-id');
          var listWrap = document.getElementById('room-form-images-list-wrap');
          if (titleEl) titleEl.textContent = 'Oda Düzenle';
          if (editIdEl) editIdEl.value = room.id;
          formEl.querySelector('[name="name"]').value = room.name || '';
          formEl.querySelector('[name="capacity"]').value = Math.max(1, parseInt(room.capacity, 10) || 2);
          formEl.querySelector('[name="description"]').value = room.description || '';
          formEl.querySelector('[name="features"]').value = Array.isArray(room.features) ? (room.features || []).join('\n') : '';
          formEl.querySelector('[name="active"]').checked = room.active !== false;
          formEl.querySelector('[name="images"]').value = '';
          currentRoomImages = (room.images && room.images.length) ? room.images.slice() : [];
          if (listWrap) { listWrap.style.display = currentRoomImages.length ? 'block' : 'none'; }
          renderRoomImagesList();
          document.getElementById('room-form').style.display = 'block';
        });
      });
      tbody.querySelectorAll('.room-toggle-status').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var id = btn.dataset.id;
          var nextActive = btn.dataset.active !== 'true';
          put('/api/admin/rooms/' + id, { active: nextActive }).then(function(res) {
            if (res && res.ok) { btn.dataset.active = nextActive; btn.textContent = nextActive ? 'Aktif' : 'Pasif'; btn.classList.toggle('btn-active', nextActive); btn.classList.toggle('btn-passive', !nextActive); }
          });
        });
      });
      document.getElementById('room-add').addEventListener('click', function() {
        var titleEl = document.getElementById('room-form-title');
        var editIdEl = document.getElementById('room-form-edit-id');
        var listWrap = document.getElementById('room-form-images-list-wrap');
        if (titleEl) titleEl.textContent = 'Oda Ekle';
        if (editIdEl) editIdEl.value = '';
        document.getElementById('room-form-f').reset();
        if (document.querySelector('#room-form-f [name="capacity"]')) document.querySelector('#room-form-f [name="capacity"]').value = '2';
        if (document.querySelector('#room-form-f [name="active"]')) document.querySelector('#room-form-f [name="active"]').checked = true;
        currentRoomImages = [];
        if (listWrap) listWrap.style.display = 'none';
        document.getElementById('room-form').style.display = 'block';
      });
      document.getElementById('room-form-cancel').addEventListener('click', function() {
        document.getElementById('room-form-edit-id').value = '';
        document.getElementById('room-form').style.display = 'none';
      });
      document.getElementById('room-form-f').addEventListener('submit', function(e) {
        e.preventDefault();
        var editIdEl = document.getElementById('room-form-edit-id');
        var editId = (editIdEl && editIdEl.value) ? editIdEl.value.trim() : '';
        var fd = new FormData(this);
        var features = (fd.get('features') || '').split('\n').map(function(x) { return x.trim(); }).filter(Boolean);
        var formData = new FormData();
        formData.append('name', fd.get('name'));
        formData.append('price', '0');
        formData.append('description', fd.get('description') || '');
        formData.append('features', JSON.stringify(features));
        var capVal = fd.get('capacity');
        var capNum = (capVal !== null && capVal !== '' && !isNaN(parseInt(capVal, 10))) ? parseInt(capVal, 10) : 2;
        formData.append('capacity', Math.max(1, capNum));
        formData.append('active', fd.get('active') ? 'true' : 'false');
        if (editId) formData.append('imagesOrder', JSON.stringify(currentRoomImages));
        var files = fd.getAll('images');
        files.forEach(function(file) { if (file.size) formData.append('images', file); });
        var url = editId ? API + '/api/admin/rooms/' + encodeURIComponent(editId) : API + '/api/admin/rooms';
        var method = editId ? 'PUT' : 'POST';
        resetIdleTimer();
        fetch(url, { method: method, headers: { 'Authorization': 'Bearer ' + token }, body: formData }).then(function(r) { if (r.status === 401) logout(); return r.json(); }).then(function(res) { if (res.ok) { document.getElementById('room-form').style.display = 'none'; document.getElementById('room-form-edit-id').value = ''; loadRooms(); } else alert(res.mesaj || 'Hata'); });
      });
    });
  }

  function loadKontejanFiyat() {
    var wrap = document.getElementById('kontejan-fiyat-page');
    get('/api/admin/rooms').then(function(rooms) {
      rooms = rooms || [];
      var today = new Date();
      today.setHours(0, 0, 0, 0);
      var defaultFrom = today.getFullYear() + '-' + (today.getMonth() + 1 < 10 ? '0' : '') + (today.getMonth() + 1) + '-' + (today.getDate() < 10 ? '0' : '') + today.getDate();
      var oneMonthLater = new Date(today);
      oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);
      var defaultTo = oneMonthLater.getFullYear() + '-' + (oneMonthLater.getMonth() + 1 < 10 ? '0' : '') + (oneMonthLater.getMonth() + 1) + '-' + (oneMonthLater.getDate() < 10 ? '0' : '') + oneMonthLater.getDate();

      wrap.innerHTML = '<h2>Oda Kontejan & Fiyat</h2>' +
        '<p class="admin-page-desc">Takvim görünümünde günlük fiyat ve kontejan düzenleyin; toplu veya tek tek giriş yapabilirsiniz.</p>' +

        '<div id="kontejan-panel-takvim" class="kontejan-panel"><h3 class="kontejan-section-title">Takvim görünümü</h3>' +
        '<div class="calendar-toolbar">' +
        '<div class="calendar-toolbar-row">' +
        '<div class="calendar-field"><label>Başlangıç</label>' + datePickerWrapHtml('id="calendar-date-from"', defaultFrom) + '</div>' +
        '<div class="calendar-field"><label>Bitiş (dahil)</label>' + datePickerWrapHtml('id="calendar-date-to"', defaultTo) + '</div>' +
        '<div class="calendar-field calendar-field-btn"><button type="button" class="btn btn-primary" id="calendar-show-btn">Dönemi göster</button></div>' +
        '<div class="calendar-field"><span class="calendar-all-rooms-label">Tüm oda tipleri listelenecek</span></div>' +
        '</div>' +
        '<div class="calendar-legend">' +
        '<span class="calendar-legend-item calendar-legend-closed"><i></i> Kapalı (kontejan 0)</span>' +
        '<span class="calendar-legend-item calendar-legend-bookable"><i></i> Rezervasyona açık</span>' +
        '</div>' +
        '<div class="calendar-bulk-wrap">' +
        '<button type="button" class="btn btn-outline btn-sm calendar-bulk-toggle" id="calendar-bulk-toggle">Toplu fiyat düzenle</button>' +
        '<div class="calendar-bulk-content">' +
        '<div class="calendar-bulk-card">' +
        '<div class="calendar-bulk-grid">' +
        '<div class="calendar-bulk-field"><label>Oda</label><select id="calendar-bulk-room">' + (rooms.length ? '<option value="">Oda seçin</option><option value="all">Tüm odalar</option>' + rooms.map(function(r) { return '<option value="' + r.id + '">' + (r.name || r.id) + '</option>'; }).join('') : '') + '</select></div>' +
        '<div class="calendar-bulk-field"><label>Başlangıç</label>' + datePickerWrapHtml('id="calendar-bulk-from"', '') + '</div>' +
        '<div class="calendar-bulk-field"><label>Bitiş</label>' + datePickerWrapHtml('id="calendar-bulk-to"', '') + '</div>' +
        '<div class="calendar-bulk-field"><label>Oda durumu</label><select id="calendar-bulk-open"><option value="1">Açık</option><option value="0">Kapalı</option></select></div>' +
        '<div class="calendar-bulk-field"><label>Fiyat (₺)</label><input type="number" id="calendar-bulk-price" min="100" step="0.01" placeholder="100"></div>' +
        '<div class="calendar-bulk-field"><label>Kontejan</label><input type="number" id="calendar-bulk-capacity" min="0" max="20" placeholder="Açıkken"></div>' +
        '<div class="calendar-bulk-field calendar-bulk-actions"><label>&nbsp;</label><button type="button" class="btn btn-primary" id="calendar-bulk-apply">Aralığa uygula</button></div>' +
        '</div></div></div></div>' +
        '<div class="calendar-grid-wrap"><div id="calendar-grid-placeholder" class="calendar-placeholder">Filtreyi düzenleyip "Dönemi göster" ile tüm oda tiplerinin takvimini yükleyin.</div><div id="calendar-rooms-container"></div></div>' +
        '</div>';

      bindDatePickerDisplays(wrap);
      wrap.querySelectorAll('.date-picker-input').forEach(function(inp) {
        if (inp.id === 'calendar-date-from' || inp.id === 'calendar-date-to' || inp.id === 'calendar-bulk-from' || inp.id === 'calendar-bulk-to') inp.setAttribute('min', defaultFrom);
      });

      var dayNames = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
      var monthNames = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

      function buildCalendarBlockHTML(room, data) {
        if (!data || !data.length) return '';
        var roomId = room.id;
        var defaultCapacity = (room.capacity != null) ? room.capacity : 2;
        var headerCells = data.map(function(d) {
          var dayNum = d.date.length >= 10 ? parseInt(d.date.slice(8, 10), 10) : 1;
          var dtNoon = new Date(d.date + 'T12:00:00Z');
          var day = dtNoon.getUTCDay();
          var isWeekend = day === 0 || day === 6;
          return '<th class="calendar-day-col' + (isWeekend ? ' calendar-weekend' : '') + '" data-date="' + d.date + '" title="' + formatDate(d.date) + '"><span class="calendar-day-name">' + dayNames[day] + '</span><span class="calendar-day-num">' + dayNum + '</span></th>';
        });
        var firstStr = data[0].date;
        var lastStr = data[data.length - 1].date;
        var first = new Date(firstStr + 'T12:00:00Z');
        var last = new Date(lastStr + 'T12:00:00Z');
        var same = first.getMonth() === last.getMonth() && first.getFullYear() === last.getFullYear();
        var monthRow = same ? '<tr><th class="calendar-row-label">' + monthNames[first.getMonth()] + ' ' + first.getFullYear() + '</th>' + headerCells.join('') + '</tr>' : '<tr><th class="calendar-row-label">Tarih</th>' + headerCells.join('') + '</tr>';
        var t = new Date();
        var todayStr = t.getFullYear() + '-' + (t.getMonth() + 1 < 10 ? '0' : '') + (t.getMonth() + 1) + '-' + (t.getDate() < 10 ? '0' : '') + t.getDate();
        var statusCells = data.map(function(d) {
          var closed = d.open === 0;
          var past = d.date < todayStr;
          var pastClass = past ? ' calendar-cell-past' : '';
          return '<td class="calendar-cell-status ' + (closed ? 'calendar-cell-closed' : 'calendar-cell-bookable') + pastClass + '" data-date="' + d.date + '" data-open="' + (d.open === 0 ? '0' : '1') + '"><span class="calendar-status-btn">' + (closed ? 'Kapalı' : 'Açık') + '</span></td>';
        });
        var kontejanCells = data.map(function(d) {
          var cap = d.capacity != null ? d.capacity : 0;
          var closed = d.open === 0;
          var past = d.date < todayStr;
          var pastClass = past ? ' calendar-cell-past' : '';
          return '<td class="' + (closed ? 'calendar-cell-closed' : 'calendar-cell-bookable') + pastClass + '"><span class="calendar-cell-value calendar-kontejan-val" data-date="' + d.date + '">' + cap + '</span><input type="number" min="0" max="20" class="calendar-cell-input calendar-capacity" data-date="' + d.date + '" value="' + cap + '" style="display:none" ' + (past ? 'disabled' : '') + '></td>';
        });
        var bookedCells = data.map(function(d) {
          var n = d.bookedCount != null ? d.bookedCount : 0;
          return '<td class="calendar-cell-booked"><span class="calendar-cell-value">' + n + '</span></td>';
        });
        var fiyatCells = data.map(function(d) {
          var closed = d.open === 0;
          var price = d.price != null ? d.price : '';
          var past = d.date < todayStr;
          var pastClass = past ? ' calendar-cell-past' : '';
          return '<td class="' + (closed ? 'calendar-cell-closed' : 'calendar-cell-bookable') + pastClass + '"><span class="calendar-cell-value calendar-fiyat-val" data-date="' + d.date + '">₺' + (price !== '' ? price : '—') + '</span><input type="number" min="100" step="0.01" class="calendar-cell-input calendar-price" data-date="' + d.date + '" value="' + price + '" style="display:none" ' + (past ? 'disabled' : '') + '></td>';
        });
        var tableHTML = '<table class="calendar-grid-table"><thead>' + monthRow + '</thead><tbody>' +
          '<tr><th class="calendar-row-label">Oda durumu</th>' + statusCells.join('') + '</tr>' +
          '<tr><th class="calendar-row-label">Kontejan (satış adedi)</th>' + kontejanCells.join('') + '</tr>' +
          '<tr><th class="calendar-row-label">Net rezerve</th>' + bookedCells.join('') + '</tr>' +
          '<tr><th class="calendar-row-label">Fiyat (₺)</th>' + fiyatCells.join('') + '</tr></tbody></table>';
        return '<div class="calendar-room-block" data-room-id="' + roomId + '" data-default-capacity="' + defaultCapacity + '"><h3 class="calendar-room-title">' + (room.name || roomId) + ' <span class="calendar-room-id">(Oda Kimlik No.: ' + roomId + ')</span></h3><div class="table-wrap">' + tableHTML + '</div></div>';
      }

      function attachBlockEvents(block) {
        var roomId = block.dataset.roomId;
        var defaultCapacity = parseInt(block.dataset.defaultCapacity, 10) || 2;
        var tbody = block.querySelector('tbody');
        if (!tbody) return;
        function getInputs(date) {
          var rows = tbody.querySelectorAll('tr');
          var capInput = rows[1] ? rows[1].querySelector('input[data-date="' + date + '"]') : null;
          var priceInput = rows[3] ? rows[3].querySelector('input[data-date="' + date + '"]') : null;
          return { capInput: capInput, priceInput: priceInput };
        }
        function updateCellStyles(date, open) {
          var cls = open === 0 ? 'calendar-cell-closed' : 'calendar-cell-bookable';
          var past = ' calendar-cell-past';
          var statusTd = tbody.querySelector('.calendar-cell-status[data-date="' + date + '"]');
          if (statusTd) {
            statusTd.className = 'calendar-cell-status ' + cls + (statusTd.classList.contains('calendar-cell-past') ? past : '');
            statusTd.dataset.open = open;
            var btn = statusTd.querySelector('.calendar-status-btn');
            if (btn) btn.textContent = open === 0 ? 'Kapalı' : 'Açık';
          }
          tbody.querySelectorAll('td').forEach(function(td) {
            if (td.querySelector('[data-date="' + date + '"]') && !td.classList.contains('calendar-cell-status')) {
              td.className = cls + (td.classList.contains('calendar-cell-past') ? past : '');
            }
          });
        }
        tbody.addEventListener('click', function(e) {
          var td = e.target.closest('.calendar-cell-status');
          if (td && !td.classList.contains('calendar-cell-past')) {
            var date = td.dataset.date;
            var currentOpen = td.dataset.open === '0' ? 0 : 1;
            var newOpen = currentOpen === 1 ? 0 : 1;
            patch('/api/admin/rooms/' + roomId + '/calendar/day', { date: date, open: newOpen }).then(function(res) {
              if (res.ok) updateCellStyles(date, newOpen);
            });
            return;
          }
          var span = e.target.closest('.calendar-kontejan-val');
          if (span && !span.closest('td').classList.contains('calendar-cell-past')) {
            var inp = span.nextElementSibling;
            if (inp && inp.classList.contains('calendar-capacity')) { span.style.display = 'none'; inp.style.display = 'inline-block'; inp.focus(); }
            return;
          }
          var spanF = e.target.closest('.calendar-fiyat-val');
          if (spanF && !spanF.closest('td').classList.contains('calendar-cell-past')) {
            var inpF = spanF.nextElementSibling;
            if (inpF && inpF.classList.contains('calendar-price')) { spanF.style.display = 'none'; inpF.style.display = 'inline-block'; inpF.focus(); }
          }
        });
        function saveDayPriceAndCapacity(date, onSuccess) {
          var io = getInputs(date);
          var price = io.priceInput ? parseFloat(io.priceInput.value) : 0;
          var capacity = io.capInput ? parseInt(io.capInput.value, 10) : 0;
          if (isNaN(price) || price < 100) {
            alert('Fiyat en az 100 ₺ olmalıdır.');
            if (onSuccess) onSuccess(false);
            return;
          }
          if (isNaN(capacity) || capacity < 0) capacity = 0;
          resetIdleTimer();
          var url = API + '/api/admin/rooms/' + encodeURIComponent(roomId) + '/calendar/day';
          var opts = { method: 'PATCH', headers: authHeader(), body: JSON.stringify({ date: date, price: price, capacity: capacity }) };
          fetch(url, opts).then(function(r) {
            return r.text().then(function(text) {
              var res = null;
              try { res = text ? JSON.parse(text) : {}; } catch (e) { res = { ok: false, mesaj: 'Yanıt JSON değil (HTTP ' + r.status + ')' }; }
              if (r.status === 401) { logout(); return; }
              if (res.ok) {
                if (io.capInput && io.capInput.previousElementSibling) {
                  io.capInput.style.display = 'none';
                  io.capInput.previousElementSibling.style.display = 'inline';
                  io.capInput.previousElementSibling.textContent = capacity;
                }
                if (io.priceInput && io.priceInput.previousElementSibling) {
                  io.priceInput.style.display = 'none';
                  io.priceInput.previousElementSibling.style.display = 'inline';
                  io.priceInput.previousElementSibling.textContent = price > 0 ? '₺' + price : '—';
                }
                if (onSuccess) onSuccess(true);
              } else {
                alert(res.mesaj || ('Hata: HTTP ' + r.status));
                if (onSuccess) onSuccess(false);
              }
            });
          }).catch(function(err) {
            alert('Bağlantı kurulamadı. Sunucu çalışıyor mu? Tarayıcıda http://localhost:3000/admin adresini açıp tekrar deneyin.');
            if (onSuccess) onSuccess(false);
          });
        }

        tbody.addEventListener('focusout', function(e) {
          var input = e.target;
          if (!input.classList || !input.dataset) return;
          var date = input.dataset.date;
          if (!date || input.closest('td').classList.contains('calendar-cell-past')) return;
          if (input.classList.contains('calendar-price') || input.classList.contains('calendar-capacity')) {
            if (input.style.display === 'none') return;
            saveDayPriceAndCapacity(date);
          }
        });
      }

      function loadCalendarForSelection() {
        var fromEl = document.getElementById('calendar-date-from');
        var toEl = document.getElementById('calendar-date-to');
        var from = fromEl ? fromEl.value : '';
        var to = toEl ? toEl.value : '';
        if (!from || !to) return;
        var t = new Date();
        var todayStr = t.getFullYear() + '-' + (t.getMonth() + 1 < 10 ? '0' : '') + (t.getMonth() + 1) + '-' + (t.getDate() < 10 ? '0' : '') + t.getDate();
        if (from < todayStr) from = todayStr;
        var placeholder = document.getElementById('calendar-grid-placeholder');
        var container = document.getElementById('calendar-rooms-container');
        if (!container) return;
        if (!rooms.length) { placeholder.style.display = 'block'; container.innerHTML = ''; return; }
        placeholder.style.display = 'none';
        container.innerHTML = '<p class="calendar-loading">Yükleniyor…</p>';
        Promise.all(rooms.map(function(r) { return get('/api/admin/rooms/' + r.id + '/calendar?from=' + encodeURIComponent(from) + '&to=' + encodeURIComponent(to)).then(function(data) {
          var list = data || [];
          list = list.filter(function(d) { return d.date >= todayStr; });
          return { room: r, data: list };
        }); })).then(function(results) {
          container.innerHTML = '';
          results.forEach(function(item) {
            var html = buildCalendarBlockHTML(item.room, item.data);
            if (html) {
              container.insertAdjacentHTML('beforeend', html);
              var block = container.lastElementChild;
              attachBlockEvents(block);
            }
          });
        }).catch(function() { container.innerHTML = '<p class="calendar-placeholder">Yükleme hatası.</p>'; });
      }
      document.getElementById('calendar-show-btn').addEventListener('click', loadCalendarForSelection);
      if (rooms.length > 0) loadCalendarForSelection();

      (function() {
        var toggleBtn = document.getElementById('calendar-bulk-toggle');
        var wrap = toggleBtn && toggleBtn.closest('.calendar-bulk-wrap');
        var content = wrap && wrap.querySelector('.calendar-bulk-content');
        if (!toggleBtn || !wrap || !content) return;
        toggleBtn.addEventListener('click', function() {
          var isOpen = wrap.classList.contains('calendar-bulk-open');
          if (!isOpen) {
            wrap.classList.add('calendar-bulk-open');
            var now = new Date();
            var today = now.getFullYear() + '-' + (now.getMonth() + 1 < 10 ? '0' : '') + (now.getMonth() + 1) + '-' + (now.getDate() < 10 ? '0' : '') + now.getDate();
            var fromEl = document.getElementById('calendar-bulk-from');
            var toEl = document.getElementById('calendar-bulk-to');
            if (fromEl) { fromEl.value = today; var dFrom = fromEl.closest('.date-picker-wrap'); if (dFrom) dFrom.querySelector('.date-picker-display').textContent = formatDate(today); }
            if (toEl) { toEl.value = today; var dTo = toEl.closest('.date-picker-wrap'); if (dTo) dTo.querySelector('.date-picker-display').textContent = formatDate(today); }
          } else {
            wrap.classList.remove('calendar-bulk-open');
          }
        });
      })();

      document.getElementById('calendar-bulk-apply').addEventListener('click', function() {
        var bulkRoomId = document.getElementById('calendar-bulk-room').value;
        var fromEl = document.getElementById('calendar-bulk-from');
        var toEl = document.getElementById('calendar-bulk-to');
        var from = fromEl ? fromEl.value : '';
        var to = toEl ? toEl.value : '';
        var openEl = document.getElementById('calendar-bulk-open');
        var isOpen = openEl ? openEl.value === '1' : true;
        var priceEl = document.getElementById('calendar-bulk-price');
        var capEl = document.getElementById('calendar-bulk-capacity');
        var price = priceEl && priceEl.value !== '' ? parseFloat(priceEl.value) : 0;
        var capacity = capEl && capEl.value !== '' ? parseInt(capEl.value, 10) : null;
        if (!from || !to) { alert('Toplu düzenleme için başlangıç ve bitiş tarihi seçin.'); return; }
        if (!bulkRoomId) { alert('Lütfen bir oda seçin veya "Tüm odalar"ı seçin.'); return; }
        var roomIds = bulkRoomId === 'all' ? rooms.map(function(r) { return r.id; }) : [bulkRoomId];
        var dateFromSend = toYYYYMMDD(from);
        var dateToSend = toYYYYMMDD(to);
        if (!dateFromSend || !dateToSend) { alert('Geçerli başlangıç ve bitiş tarihi girin (GG.AA.YYYY veya YYYY-AA-GG).'); return; }
        var payload = { roomIds: roomIds, dateFrom: dateFromSend, dateTo: dateToSend };
        if (!isOpen) {
          payload.openOnly = true;
          payload.open = 0;
        } else if ((priceEl && priceEl.value !== '' && !isNaN(parseFloat(priceEl.value))) || (capEl && capEl.value !== '')) {
          if (isNaN(price) || price < 100) {
            alert('Fiyat en az 100 ₺ olmalıdır. Lütfen geçerli bir fiyat girin.');
            return;
          }
          if (capacity != null && (isNaN(capacity) || capacity < 0)) capacity = 0;
          payload.price = price;
          payload.capacity = capacity;
        } else {
          payload.openOnly = true;
          payload.open = 1;
        }
        post('/api/admin/room-price-overrides/bulk', payload).then(function(res) {
          if (!res || !res.ok) {
            alert(res && res.mesaj ? res.mesaj : '100 TL altı girdiniz. Fiyat en az 100 ₺ olmalıdır.');
            return;
          }
          loadCalendarForSelection();
          alert(res.updated != null ? res.updated + ' gün güncellendi.' : 'Aralık güncellendi.');
        }).catch(function() { alert('Bağlantı hatası.'); });
      });
    }).catch(function() { wrap.innerHTML = '<h2>Oda Kontejan & Fiyat</h2><p>Veriler yüklenemedi.</p>'; });
  }

  function loadReservations() {
    var wrap = document.getElementById('reservations-page');
    var today = new Date();
    var pad = function(n) { return n < 10 ? '0' + n : n; };
    var defaultTo = today.getFullYear() + '-' + pad(today.getMonth() + 1) + '-' + pad(today.getDate());
    var past = new Date(today);
    past.setMonth(past.getMonth() - 3);
    var defaultFrom = past.getFullYear() + '-' + pad(past.getMonth() + 1) + '-' + pad(past.getDate());
    wrap.innerHTML =
      '<h2 class="reservations-title">Rezervasyonlar</h2>' +
      '<p class="admin-page-desc">Tarih ve filtreleri seçip listeden rezervasyonları görüntüleyin; detay ve ödeme durumunu güncelleyebilirsiniz.</p>' +
      '<div class="reservations-toolbar">' +
        '<div class="reservations-filters">' +
          '<span class="reservations-filter-label">Tarih:</span>' +
          '<select id="res-date-type" class="reservations-select">' +
            '<option value="checkIn">Check-in</option>' +
            '<option value="checkOut">Check-out</option>' +
            '<option value="createdAt">Rezervasyon tarihi</option>' +
          '</select>' +
          '<div class="reservations-date-field"><label>Başlangıç</label>' + datePickerWrapHtml('id="res-date-from"', defaultFrom) + '</div>' +
          '<div class="reservations-date-field"><label>Bitiş</label>' + datePickerWrapHtml('id="res-date-to"', defaultTo) + '</div>' +
          '<div class="reservations-date-field reservations-rezno-wrap"><label>Rez. no</label><input type="text" id="res-filter-id-toolbar" class="reservations-filter-input" placeholder="Rez no ile ara"></div>' +
          '<button type="button" class="btn btn-outline btn-sm" id="res-more-filters">Daha fazla filtre <span class="res-chevron">▼</span></button>' +
          '<button type="button" class="btn btn-primary" id="res-show-btn">Göster</button>' +
        '</div>' +
        '<div class="reservations-actions">' +
          '<button type="button" class="btn btn-outline btn-sm" id="res-download-btn">↓ İndir</button>' +
          '<button type="button" class="btn btn-outline btn-sm" id="res-print-btn">🖨 Rezervasyon listesini yazdır</button>' +
        '</div>' +
      '</div>' +
      '<div id="res-more-filters-panel" class="reservations-more-panel" style="display:none">' +
        '<div class="reservations-more-row">' +
          '<label class="reservations-more-label">Durum</label>' +
          '<select id="res-filter-status" class="reservations-select">' +
            '<option value="">Tümü</option>' +
            '<option value="onaylandi">Onaylanan</option>' +
            '<option value="beklemede">Beklemede olan</option>' +
            '<option value="gelmeyen">Gelmeyen</option>' +
            '<option value="iptal">İptal</option>' +
          '</select>' +
        '</div>' +
        '<div class="reservations-more-row">' +
          '<label class="reservations-more-label">Konuk adı</label>' +
          '<input type="text" id="res-filter-guest" class="reservations-filter-input" placeholder="Konuk adı ile ara">' +
        '</div>' +
        '<div class="reservations-more-row">' +
          '<label class="reservations-more-label">Rezervasyon numarası</label>' +
          '<input type="text" id="res-filter-id" class="reservations-filter-input" placeholder="Rezervasyon no ile ara">' +
        '</div>' +
      '</div>' +
      '<div id="reservations-content" class="reservations-content">' +
        '<p class="reservations-empty-msg">Neleri görmek istediğinizi, tarihlerinizi ve filtrelerinizi seçerek aramanızı başlatın.</p>' +
      '</div>';
    bindDatePickerDisplays(wrap);
    wrap.querySelectorAll('.date-picker-input').forEach(function(inp) {
      if (inp.id === 'res-date-from' || inp.id === 'res-date-to') inp.setAttribute('min', '2020-01-01');
    });

    var contentEl = document.getElementById('reservations-content');
    var allReservations = [];

    function getDateStr(val) {
      if (!val) return '';
      var s = String(val).trim();
      if (s.indexOf('T') !== -1) return s.slice(0, 10);
      return s.slice(0, 10);
    }
    function filterByDate(list, type, fromStr, toStr) {
      if (!fromStr || !toStr) return list;
      return list.filter(function(r) {
        var d = type === 'checkIn' ? getDateStr(r.checkIn) : type === 'checkOut' ? getDateStr(r.checkOut) : getDateStr(r.createdAt);
        return d && d >= fromStr && d <= toStr;
      });
    }
    function applyExtraFilters(list) {
      var statusEl = document.getElementById('res-filter-status');
      var guestEl = document.getElementById('res-filter-guest');
      var idEl = document.getElementById('res-filter-id');
      var idToolbar = document.getElementById('res-filter-id-toolbar');
      var status = statusEl && statusEl.value ? statusEl.value : '';
      var guest = guestEl && guestEl.value ? String(guestEl.value).trim().toLowerCase() : '';
      var idQ = (idEl && idEl.value ? String(idEl.value).trim() : '') || (idToolbar && idToolbar.value ? String(idToolbar.value).trim() : '');
      idQ = idQ.toLowerCase();
      return list.filter(function(r) {
        if (status && r.status !== status) return false;
        if (guest && !(r.guestName || '').toLowerCase().includes(guest)) return false;
        if (idQ && !(r.id || '').toLowerCase().includes(idQ) && !(r.reservationGroupId || '').toLowerCase().includes(idQ)) return false;
        return true;
      });
    }
    function renderTable(rev) {
      rev = rev || [];
      var fromVal = document.getElementById('res-date-from') && document.getElementById('res-date-from').value;
      var toVal = document.getElementById('res-date-to') && document.getElementById('res-date-to').value;
      if (!fromVal || !toVal) {
        contentEl.innerHTML = '<p class="reservations-empty-msg">Neleri görmek istediğinizi, tarihlerinizi ve filtrelerinizi seçerek aramanızı başlatın.</p>';
        return;
      }
      var type = (document.getElementById('res-date-type') && document.getElementById('res-date-type').value) || 'checkIn';
      var filtered = filterByDate(allReservations, type, toYYYYMMDD(fromVal) || fromVal, toYYYYMMDD(toVal) || toVal);
      filtered = applyExtraFilters(filtered);
      if (filtered.length === 0) {
        contentEl.innerHTML = '<p class="reservations-empty-msg">Seçilen tarih aralığında kayıt bulunamadı.</p>';
        return;
      }
      var html = '<div class="table-wrap"><table><thead><tr><th>Rez. No</th><th>Tarih</th><th>Misafir</th><th>Oda ID</th><th>Giriş/Çıkış</th><th>Durum</th><th>İşlem</th></tr></thead><tbody id="res-tbody"></tbody></table></div>';
      contentEl.innerHTML = html;
      var tbody = document.getElementById('res-tbody');
      var rows = filtered.slice().reverse();
      tbody.innerHTML = rows.map(function(r) {
        var durum = r.status === 'onaylandi' ? 'durum-onaylandi' : r.status === 'iptal' ? 'durum-iptal' : r.status === 'gelmeyen' ? 'durum-gelmeyen' : 'durum-beklemede';
        var durumTxt = r.status === 'onaylandi' ? 'Onaylı' : r.status === 'iptal' ? 'İptal' : r.status === 'gelmeyen' ? 'Gelmeyen' : 'Beklemede';
        var rezNo = r.reservationGroupId || r.id || '';
        return '<tr data-id="' + (r.id || '') + '">' +
          '<td><code class="room-id-cell">' + (rezNo || '—') + '</code></td>' +
          '<td>' + (r.createdAt ? formatDateTime(r.createdAt) : '') + '</td>' +
          '<td>' + (r.guestName || '') + '<br><small>' + (r.email || '') + '</small></td>' +
          '<td>' + (r.roomId || '') + '</td>' +
          '<td>' + formatDate(r.checkIn) + ' / ' + formatDate(r.checkOut) + '</td>' +
          '<td><span class="durum ' + durum + '">' + durumTxt + '</span></td>' +
          '<td class="res-actions-cell">' +
            '<a href="#reservations/detail/' + (r.id || '') + '" class="btn-small btn-detail">Detay</a> ' +
            (r.status !== 'onaylandi' ? '<button type="button" class="btn-small btn-ok" data-id="' + r.id + '" data-status="onaylandi">Onayla</button> ' : '') +
            (r.status !== 'iptal' ? '<button type="button" class="btn-small btn-no" data-id="' + r.id + '" data-status="iptal">İptal</button> ' : '') +
            (r.status !== 'gelmeyen' ? '<button type="button" class="btn-small btn-warn" data-id="' + r.id + '" data-status="gelmeyen">Gelmeyen</button>' : '') +
          '</td></tr>';
      }).join('');
      tbody.querySelectorAll('[data-status]').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          patch('/api/admin/reservations/' + btn.dataset.id, { status: btn.dataset.status }).then(function() {
            allReservations = allReservations.map(function(x) { return x.id === btn.dataset.id ? Object.assign({}, x, { status: btn.dataset.status }) : x; });
            renderTable();
          });
        });
      });
      tbody.querySelectorAll('tr').forEach(function(tr) {
        tr.addEventListener('click', function(e) {
          if (e.target.closest('button[data-status]')) return;
          var link = e.target.closest('a[href^="#reservations/detail/"]');
          if (link) return;
          var id = tr.getAttribute('data-id');
          if (id) location.hash = 'reservations/detail/' + id;
        });
      });
    }

    document.getElementById('res-show-btn').addEventListener('click', function() {
      get('/api/admin/reservations').then(function(list) {
        allReservations = list || [];
        renderTable();
      }).catch(function() { contentEl.innerHTML = '<p class="reservations-empty-msg">Yükleme hatası.</p>'; });
    });

    document.getElementById('res-more-filters').addEventListener('click', function() {
      var panel = document.getElementById('res-more-filters-panel');
      panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
      this.querySelector('.res-chevron').textContent = panel.style.display === 'none' ? '▼' : '▲';
    });

    document.getElementById('res-download-btn').addEventListener('click', function() {
      if (allReservations.length === 0) { alert('Önce "Göster" ile listeyi yükleyin.'); return; }
      var type = (document.getElementById('res-date-type') && document.getElementById('res-date-type').value) || 'checkIn';
      var fromVal = document.getElementById('res-date-from') && document.getElementById('res-date-from').value;
      var toVal = document.getElementById('res-date-to') && document.getElementById('res-date-to').value;
      var fromStr = toYYYYMMDD(fromVal) || fromVal;
      var toStr = toYYYYMMDD(toVal) || toVal;
      var filtered = fromStr && toStr ? filterByDate(allReservations, type, fromStr, toStr) : allReservations;
      filtered = applyExtraFilters(filtered);
      var csv = '\uFEFFTarih;Misafir;E-posta;Oda;Giriş;Çıkış;Durum\n' + filtered.map(function(r) {
        return (r.createdAt || '') + ';' + (r.guestName || '') + ';' + (r.email || '') + ';' + (r.roomId || '') + ';' + (r.checkIn || '') + ';' + (r.checkOut || '') + ';' + (r.status || '');
      }).join('\n');
      var a = document.createElement('a');
      a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
      a.download = 'rezervasyonlar.csv';
      a.click();
    });

    document.getElementById('res-print-btn').addEventListener('click', function() {
      var table = contentEl.querySelector('table');
      if (!table) { alert('Yazdırmak için önce "Göster" ile listeyi yükleyin.'); return; }
      var w = window.open('', '_blank');
      w.document.write('<html><head><title>Rezervasyon Listesi</title><style>table{border-collapse:collapse;width:100%} th,td{border:1px solid #ddd;padding:8px;text-align:left} th{background:#f5f5f5}</style></head><body><h1>Rezervasyon Listesi</h1>' + table.outerHTML + '</body></html>');
      w.document.close();
      w.print();
      w.close();
    });
  }

  function loadReservationDetail(id) {
    var wrap = document.getElementById('reservation-detail-page');
    if (!wrap) return;
    wrap.innerHTML = '<div class="res-detail-loading"><p>Yükleniyor…</p></div>';
    get('/api/admin/reservations/' + encodeURIComponent(id))
      .then(function(r) {
        if (!r || !r.id) { wrap.innerHTML = '<div class="res-detail-error"><p>Rezervasyon bulunamadı.</p><a href="#reservations" class="btn btn-primary">Rezervasyon listesine dön</a></div>'; return; }
        var adults = r.adults != null ? r.adults : '';
        var cU6 = r.childrenUnder6 != null ? r.childrenUnder6 : '';
        var c6p = r.children6Plus != null ? r.children6Plus : '';
        var group = r.reservationGroupId || '';
        var nights = '';
        if (r.checkIn && r.checkOut) {
          try {
            var d1 = new Date(r.checkIn);
            var d2 = new Date(r.checkOut);
            var diff = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
            nights = diff > 0 ? diff + ' gece' : '';
          } catch (_) {}
        }
        var statusTxt = r.status === 'onaylandi' ? 'Onaylı' : r.status === 'iptal' ? 'İptal' : r.status === 'gelmeyen' ? 'Gelmeyen' : 'Beklemede';
        var statusClass = r.status === 'onaylandi' ? 'durum-onaylandi' : r.status === 'iptal' ? 'durum-iptal' : r.status === 'gelmeyen' ? 'durum-gelmeyen' : 'durum-beklemede';
        wrap.innerHTML =
          '<nav class="res-detail-breadcrumb"><a href="#reservations">Rezervasyonlar</a><span class="res-detail-breadcrumb-sep">›</span><span>Rezervasyon #' + (r.id || '') + '</span></nav>' +
          '<div class="res-detail-hero">' +
            '<div class="res-detail-hero-inner">' +
              '<h1 class="res-detail-title">Rezervasyon ' + (r.id || '') + '</h1>' +
              '<span class="durum res-detail-status ' + statusClass + '">' + statusTxt + '</span>' +
              '<p class="res-detail-meta">Oluşturulma: ' + (r.createdAt ? formatDateTime(r.createdAt) : '-') + '</p>' +
            '</div>' +
          '</div>' +
          '<div class="res-detail-grid">' +
            '<section class="res-detail-card">' +
              '<h2 class="res-detail-card-title">Konaklama</h2>' +
              '<dl class="res-detail-dl">' +
                '<dt>Oda</dt><dd>' + (r.roomId || '-') + '</dd>' +
                '<dt>Oda sayısı</dt><dd>' + (r.roomCount != null ? r.roomCount : 1) + '</dd>' +
                '<dt>Giriş</dt><dd>' + formatDate(r.checkIn) + '</dd>' +
                '<dt>Çıkış</dt><dd>' + formatDate(r.checkOut) + (nights ? ' <small>(' + nights + ')</small>' : '') + '</dd>' +
              '</dl>' +
            '</section>' +
            '<section class="res-detail-card">' +
              '<h2 class="res-detail-card-title">Misafir bilgileri</h2>' +
              '<dl class="res-detail-dl">' +
                '<dt>Ad Soyad</dt><dd>' + (r.guestName || '-') + '</dd>' +
                '<dt>E-posta</dt><dd><a href="mailto:' + (r.email || '') + '">' + (r.email || '-') + '</a></dd>' +
                '<dt>Telefon</dt><dd>' + (r.phone || '-') + '</dd>' +
                '<dt>Toplam misafir</dt><dd>' + (r.guests != null ? r.guests : '-') + '</dd>' +
                (adults !== '' ? '<dt>Yetişkin</dt><dd>' + adults + '</dd>' : '') +
                (cU6 !== '' ? '<dt>0–5 yaş çocuk</dt><dd>' + cU6 + '</dd>' : '') +
                (c6p !== '' ? '<dt>6+ yaş çocuk</dt><dd>' + c6p + '</dd>' : '') +
              '</dl>' +
            '</section>' +
            '<section class="res-detail-card res-detail-card-full">' +
              '<h2 class="res-detail-card-title">Not</h2>' +
              '<p class="res-detail-note">' + (r.note ? escapeHtml(r.note) : '<span class="res-detail-muted">Not yok</span>') + '</p>' +
              (group ? '<p class="res-detail-meta"><strong>Grup ID:</strong> ' + group + '</p>' : '') +
            '</section>' +
            '<section class="res-detail-card res-detail-card-full">' +
              '<h2 class="res-detail-card-title">Ödeme detayları</h2>' +
              '<div class="res-detail-payment-row">' +
                '<div class="res-detail-payment-field"><label for="res-payment-method">Ödeme yöntemi</label>' +
                '<select id="res-payment-method" class="res-detail-select">' +
                  '<option value="">Belirtilmedi</option>' +
                  '<option value="nakit"' + ((r.paymentMethod || '') === 'nakit' ? ' selected' : '') + '>Nakit</option>' +
                  '<option value="kredi_karti"' + ((r.paymentMethod || '') === 'kredi_karti' ? ' selected' : '') + '>Kredi Kartı</option>' +
                  '<option value="eft"' + ((r.paymentMethod || '') === 'eft' ? ' selected' : '') + '>EFT</option>' +
                  '<option value="havale"' + ((r.paymentMethod || '') === 'havale' ? ' selected' : '') + '>Havale</option>' +
                '</select></div>' +
                '<div class="res-detail-payment-field"><label for="res-payment-status">Ödeme durumu</label>' +
                '<select id="res-payment-status" class="res-detail-select">' +
                  '<option value="">Belirtilmedi</option>' +
                  '<option value="bekliyor"' + ((r.paymentStatus || '') === 'bekliyor' ? ' selected' : '') + '>Bekliyor</option>' +
                  '<option value="geldi"' + ((r.paymentStatus || '') === 'geldi' ? ' selected' : '') + '>Geldi (EFT/Havale)</option>' +
                  '<option value="onaylandi"' + ((r.paymentStatus || '') === 'onaylandi' ? ' selected' : '') + '>Onaylandı</option>' +
                  '<option value="iade"' + ((r.paymentStatus || '') === 'iade' ? ' selected' : '') + '>İade</option>' +
                '</select></div>' +
                '<div class="res-detail-payment-field res-detail-payment-actions">' +
                  '<button type="button" class="btn btn-primary" id="res-save-payment-btn">Ödeme bilgisini kaydet</button>' +
                '</div>' +
              '</div>' +
            '</section>' +
          '</div>' +
          '<div class="res-detail-actions">' +
            '<span class="res-detail-actions-label">Durum güncelle:</span>' +
            (r.status !== 'onaylandi' ? '<button type="button" class="btn btn-ok" data-res-detail-status="onaylandi">Onayla</button>' : '') +
            (r.status !== 'iptal' ? '<button type="button" class="btn btn-no" data-res-detail-status="iptal">İptal</button>' : '') +
            (r.status !== 'gelmeyen' ? '<button type="button" class="btn btn-warn" data-res-detail-status="gelmeyen">Gelmeyen</button>' : '') +
          '</div>';
        wrap.querySelectorAll('[data-res-detail-status]').forEach(function(btn) {
          btn.addEventListener('click', function() {
            var status = btn.getAttribute('data-res-detail-status');
            patch('/api/admin/reservations/' + encodeURIComponent(id), { status: status }).then(function() {
              loadReservationDetail(id);
            }).catch(function() { alert('Güncelleme başarısız.'); });
          });
        });
        var savePaymentBtn = document.getElementById('res-save-payment-btn');
        if (savePaymentBtn) {
          savePaymentBtn.addEventListener('click', function() {
            var methodEl = document.getElementById('res-payment-method');
            var statusEl = document.getElementById('res-payment-status');
            var paymentMethod = methodEl ? methodEl.value : '';
            var paymentStatus = statusEl ? statusEl.value : '';
            patch('/api/admin/reservations/' + encodeURIComponent(id), { paymentMethod: paymentMethod, paymentStatus: paymentStatus }).then(function() {
              loadReservationDetail(id);
            }).catch(function() { alert('Ödeme bilgisi kaydedilemedi.'); });
          });
        }
      })
      .catch(function() {
        wrap.innerHTML = '<div class="res-detail-error"><p>Rezervasyon yüklenemedi.</p><a href="#reservations" class="btn btn-primary">Rezervasyon listesine dön</a></div>';
      });
  }

  function loadChangeRequests() {
    var wrap = document.getElementById('change-requests-page');
    wrap.innerHTML = '<h2>Rezervasyon Değişiklik Talepleri</h2>' +
      '<p class="section-subtitle" style="margin-bottom:1rem">Müşterilerin 24 saat içinde yaptığı tarih/oda değişiklik talepleri. Onayladıktan sonra rezervasyon güncellenir.</p>' +
      '<div id="change-requests-content" class="reservations-content"><p class="reservations-empty-msg">Yükleniyor…</p></div>' +
      '<div id="change-request-detail-modal" class="admin-modal" style="display:none">' +
        '<div class="admin-modal-box complaint-detail-modal-box">' +
          '<h3>Değişiklik talep detayı</h3>' +
          '<div id="change-request-detail-body" class="complaint-detail-body"></div>' +
          '<div class="form-actions change-request-detail-actions" style="margin-top:1.25rem"></div>' +
          '<div class="form-actions" style="margin-top:0.5rem"><button type="button" class="btn btn-primary" id="change-request-detail-close">Kapat</button></div>' +
        '</div>' +
      '</div>';
    var contentEl = document.getElementById('change-requests-content');
    function esc(s) { return (s || '').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
    function statusText(s) { return s === 'onaylandi' ? 'Onaylandı' : s === 'reddedildi' ? 'Reddedildi' : 'Beklemede'; }
    function renderList() {
      get('/api/admin/reservation-change-requests').then(function(list) {
        var arr = list || [];
        if (arr.length === 0) {
          contentEl.innerHTML = '<p class="reservations-empty-msg">Henüz değişiklik talebi yok.</p>';
          return;
        }
        var html = '<div class="table-wrap"><table><thead><tr><th>Talep tarihi</th><th>Rez. no</th><th>Misafir</th><th>E-posta</th><th>Mevcut</th><th>İstenen</th><th>Durum</th><th>İşlem</th></tr></thead><tbody>' +
          arr.map(function(t) {
            var created = t.createdAt ? formatDateTime(t.createdAt) : '';
            var mevcut = (t.currentRoomName || t.currentRoomId) + ' ' + (t.currentCheckIn || '').slice(0, 10) + '–' + (t.currentCheckOut || '').slice(0, 10);
            var istenen = (t.newRoomName || t.newRoomId) + ' ' + (t.newCheckIn || '').slice(0, 10) + '–' + (t.newCheckOut || '').slice(0, 10);
            return '<tr><td>' + created + '</td><td>' + esc(t.reservationDisplayId) + '</td><td>' + esc(t.guestName) + '</td><td>' + esc(t.email) + '</td><td class="complaint-desc-cell">' + esc(mevcut) + '</td><td class="complaint-desc-cell">' + esc(istenen) + '</td><td>' + statusText(t.status) + '</td><td class="res-actions-cell"><button type="button" class="btn-small btn-detail" data-change-request-id="' + esc(t.id) + '">Detay</button></td></tr>';
          }).join('') + '</tbody></table></div>';
        contentEl.innerHTML = html;
        contentEl.querySelectorAll('[data-change-request-id]').forEach(function(btn) {
          btn.addEventListener('click', function() {
            var id = btn.getAttribute('data-change-request-id');
            get('/api/admin/reservation-change-requests/' + id).then(function(t) {
              if (!t) return;
              var body = document.getElementById('change-request-detail-body');
              var actions = wrap.querySelector('.change-request-detail-actions');
              body.innerHTML = '<dl class="complaint-detail-dl">' +
                '<dt>Talep tarihi</dt><dd>' + (t.createdAt ? formatDateTime(t.createdAt) : '-') + '</dd>' +
                '<dt>Rezervasyon no</dt><dd>' + esc(t.reservationDisplayId) + '</dd>' +
                '<dt>Misafir</dt><dd>' + esc(t.guestName) + '</dd>' +
                '<dt>E-posta</dt><dd>' + esc(t.email) + '</dd>' +
                '<dt>Mevcut oda</dt><dd>' + esc(t.currentRoomName || t.currentRoomId) + '</dd>' +
                '<dt>Mevcut giriş–çıkış</dt><dd>' + (t.currentCheckIn || '').slice(0, 10) + ' – ' + (t.currentCheckOut || '').slice(0, 10) + '</dd>' +
                '<dt>İstenen oda</dt><dd>' + esc(t.newRoomName || t.newRoomId) + '</dd>' +
                '<dt>İstenen giriş–çıkış</dt><dd>' + (t.newCheckIn || '').slice(0, 10) + ' – ' + (t.newCheckOut || '').slice(0, 10) + '</dd>' +
                '<dt>Durum</dt><dd>' + statusText(t.status) + '</dd>' +
                (t.reviewedAt ? '<dt>İşlem tarihi</dt><dd>' + formatDateTime(t.reviewedAt) + '</dd>' : '') +
                '</dl>';
              actions.innerHTML = '';
              if (t.status === 'beklemede') {
                var btnApprove = document.createElement('button');
                btnApprove.type = 'button';
                btnApprove.className = 'btn btn-ok';
                btnApprove.textContent = 'Onayla';
                var btnReject = document.createElement('button');
                btnReject.type = 'button';
                btnReject.className = 'btn btn-no';
                btnReject.textContent = 'Reddet';
                btnApprove.addEventListener('click', function() {
                  btnApprove.disabled = true;
                  post('/api/admin/reservation-change-requests/' + t.id + '/approve', {}).then(function(res) {
                    if (res && res.ok) { document.getElementById('change-request-detail-modal').style.display = 'none'; renderList(); }
                    else alert(res && res.mesaj ? res.mesaj : 'İşlem başarısız.');
                  }).catch(function() { alert('İstek başarısız.'); }).finally(function() { btnApprove.disabled = false; });
                });
                btnReject.addEventListener('click', function() {
                  if (!confirm('Bu talebi reddetmek istediğinize emin misiniz?')) return;
                  btnReject.disabled = true;
                  post('/api/admin/reservation-change-requests/' + t.id + '/reject', {}).then(function(res) {
                    if (res && res.ok) { document.getElementById('change-request-detail-modal').style.display = 'none'; renderList(); }
                    else alert(res && res.mesaj ? res.mesaj : 'İşlem başarısız.');
                  }).catch(function() { alert('İstek başarısız.'); }).finally(function() { btnReject.disabled = false; });
                });
                actions.appendChild(btnApprove);
                actions.appendChild(btnReject);
              }
              document.getElementById('change-request-detail-modal').style.display = 'flex';
            });
          });
        });
      }).catch(function() {
        contentEl.innerHTML = '<p class="reservations-empty-msg">Yükleme hatası.</p>';
      });
    }
    renderList();
    var modal = document.getElementById('change-request-detail-modal');
    if (modal) {
      modal.addEventListener('click', function(e) { if (e.target.id === 'change-request-detail-modal') modal.style.display = 'none'; });
      var closeBtn = document.getElementById('change-request-detail-close');
      if (closeBtn) closeBtn.addEventListener('click', function() { modal.style.display = 'none'; });
    }
  }

  function loadComplaints() {
    var wrap = document.getElementById('complaints-page');
    var today = new Date();
    var pad = function(n) { return n < 10 ? '0' + n : n; };
    var defaultTo = today.getFullYear() + '-' + pad(today.getMonth() + 1) + '-' + pad(today.getDate());
    var past = new Date(today);
    past.setMonth(past.getMonth() - 3);
    var defaultFrom = past.getFullYear() + '-' + pad(past.getMonth() + 1) + '-' + pad(past.getDate());
    wrap.innerHTML = '<h2>Şikayet & Öneriler</h2>' +
      '<p class="section-subtitle" style="margin-bottom:1rem">Ana sayfa İletişim bölümündeki talep ve öneri formundan gelen mesajlar.</p>' +
      '<div class="reservations-toolbar" style="margin-bottom:1.5rem">' +
        '<div class="reservations-filters">' +
          '<span class="reservations-filter-label">Tarih aralığı:</span>' +
          '<div class="reservations-date-field"><label>Başlangıç</label>' + datePickerWrapHtml('id="complaint-date-from"', defaultFrom) + '</div>' +
          '<div class="reservations-date-field"><label>Bitiş</label>' + datePickerWrapHtml('id="complaint-date-to"', defaultTo) + '</div>' +
          '<button type="button" class="btn btn-primary" id="complaint-show-btn">Göster</button>' +
        '</div>' +
      '</div>' +
      '<div id="complaints-content" class="reservations-content">' +
        '<p class="reservations-empty-msg">Yükleniyor…</p>' +
      '</div>' +
      '<div id="complaint-detail-modal" class="admin-modal" style="display:none">' +
        '<div class="admin-modal-box complaint-detail-modal-box">' +
          '<h3>Şikayet / Öneri detayı</h3>' +
          '<div id="complaint-detail-body" class="complaint-detail-body"></div>' +
          '<div class="form-actions" style="margin-top:1.25rem"><button type="button" class="btn btn-primary" id="complaint-detail-close">Kapat</button></div>' +
        '</div>' +
      '</div>';
    bindDatePickerDisplays(wrap);
    wrap.querySelectorAll('.date-picker-input').forEach(function(inp) {
      if (inp.id === 'complaint-date-from' || inp.id === 'complaint-date-to') inp.setAttribute('min', '2020-01-01');
    });

    var contentEl = document.getElementById('complaints-content');
    var allComplaints = [];

    function getDateStr(val) {
      if (!val) return '';
      var s = String(val).trim();
      if (s.indexOf('T') !== -1) return s.slice(0, 10);
      return s.slice(0, 10);
    }
    function filterByDate(list, fromStr, toStr) {
      if (!fromStr || !toStr) return list;
      return list.filter(function(c) {
        var d = getDateStr(c.createdAt);
        return d && d >= fromStr && d <= toStr;
      });
    }
    function renderTable() {
      var fromVal = document.getElementById('complaint-date-from') && document.getElementById('complaint-date-from').value;
      var toVal = document.getElementById('complaint-date-to') && document.getElementById('complaint-date-to').value;
      var fromStr = toYYYYMMDD(fromVal) || fromVal;
      var toStr = toYYYYMMDD(toVal) || toVal;
      if (!fromStr || !toStr) {
        contentEl.innerHTML = '<p class="reservations-empty-msg">Başlangıç ve bitiş tarihi seçin, ardından Göster\'e tıklayın.</p>';
        return;
      }
      var filtered = filterByDate(allComplaints, fromStr, toStr);
      if (filtered.length === 0) {
        contentEl.innerHTML = '<p class="reservations-empty-msg">Seçilen tarih aralığında talep veya öneri bulunamadı.</p>';
        return;
      }
      function esc(s) { return (s || '').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
      var html = '<div class="table-wrap"><table><thead><tr><th>Tarih</th><th>Ad Soyad</th><th>Telefon</th><th>Konu</th><th>Mesaj</th><th>Detay</th></tr></thead><tbody>' +
        filtered.map(function(c) {
          var created = c.createdAt ? formatDateTime(c.createdAt) : '';
          var desc = (c.description || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
          return '<tr><td>' + created + '</td><td>' + esc(c.fullName) + '</td><td>' + esc(c.phone) + '</td><td>' + esc(c.title) + '</td><td class="complaint-desc-cell">' + desc + '</td><td class="res-actions-cell"><button type="button" class="btn-small btn-detail" data-complaint-detail="' + esc(c.id) + '">Detay</button></td></tr>';
        }).join('') + '</tbody></table></div>';
      contentEl.innerHTML = html;

      contentEl.querySelectorAll('[data-complaint-detail]').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var id = btn.getAttribute('data-complaint-detail');
          var c = allComplaints.find(function(x) { return x.id === id; });
          if (c) {
            var body = document.getElementById('complaint-detail-body');
            var created = c.createdAt ? formatDateTime(c.createdAt) : '-';
            var desc = (c.description || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
            body.innerHTML = '<dl class="complaint-detail-dl">' +
              '<dt>Tarih</dt><dd>' + created + '</dd>' +
              '<dt>Ad Soyad</dt><dd>' + (c.fullName || '-').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</dd>' +
              '<dt>Telefon</dt><dd>' + (c.phone || '-').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</dd>' +
              '<dt>Rezervasyon no</dt><dd>' + (c.reservationNo || '-').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</dd>' +
              '<dt>Konu</dt><dd>' + (c.title || '-').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</dd>' +
              '<dt>Mesaj</dt><dd class="complaint-detail-message">' + (desc || '-') + '</dd>' +
              '</dl>';
            document.getElementById('complaint-detail-modal').style.display = 'flex';
          }
        });
      });
    }

    var detailModal = document.getElementById('complaint-detail-modal');
    if (detailModal) {
      detailModal.addEventListener('click', function(e) {
        if (e.target.id === 'complaint-detail-modal') detailModal.style.display = 'none';
      });
      var closeBtn = document.getElementById('complaint-detail-close');
      if (closeBtn) closeBtn.addEventListener('click', function() { detailModal.style.display = 'none'; });
    }

    get('/api/admin/complaints').then(function(list) {
      allComplaints = list || [];
      renderTable();
    }).catch(function() {
      contentEl.innerHTML = '<p class="reservations-empty-msg">Yükleme hatası.</p>';
    });

    wrap.querySelector('#complaint-show-btn').addEventListener('click', function() {
      renderTable();
    });
  }

  function loadTestimonials() {
    var wrap = document.getElementById('testimonials-page');
    get('/api/admin/testimonials').then(function(list) {
      wrap.innerHTML = '<div class="admin-page-header">' +
        '<h2>Misafir Yorumları</h2>' +
        '<div class="mb-1"><button type="button" class="btn btn-primary" id="test-add">Yorum Ekle</button></div>' +
        '</div><div id="test-list" class="card-list"></div>' +
        '<div id="test-form" style="display:none" class="mt-1"><h3>Yorum Ekle / Düzenle</h3><form id="test-form-f">' +
        '<input type="hidden" name="id" id="test-form-id" value="">' +
        '<div class="form-group"><label>Yazar (isteğe bağlı)</label><input type="text" name="author" placeholder="İsim veya kaynak (örn: Booking, Google)"></div>' +
        '<div class="form-group"><label>Yorum (isteğe bağlı)</label><textarea name="text" rows="3"></textarea></div>' +
        '<div class="form-group"><label>Puan (0–5, isteğe bağlı)</label><input type="number" name="rating" min="0" max="5" value="5" placeholder="0 = gösterme"></div>' +
        '<div class="form-group" id="test-form-current-img-wrap" style="display:none"><label>Mevcut görsel</label><img id="test-form-preview" src="" alt="" style="max-width:180px;display:block;border-radius:8px;margin-top:4px"></div>' +
        '<div class="form-group"><label>Fotoğraf</label><p class="form-hint">Profil fotoğrafı, kaynak logosu veya <strong>sadece ekran resmi</strong>. Düzenlerken değiştirmek istemezseniz boş bırakın.</p><input type="file" name="image" accept="image/*"></div>' +
        '<button type="submit" class="btn btn-primary">Kaydet</button> <button type="button" class="btn btn-no" id="test-form-cancel">İptal</button></form></div>';
      document.getElementById('test-list').innerHTML = (list || []).map(function(t, idx) {
        var img = t.imageUrl ? '<img src="' + (t.imageUrl.indexOf('http') === 0 ? t.imageUrl : (window.location.origin + t.imageUrl.replace(/^\//, '/'))) + '" alt="" class="testimonial-thumb" onerror="this.style.display=\'none\'">' : '';
        var label = (t.imageUrl && !(t.text || '').trim() && !(t.author || '').trim()) ? 'Ekran resmi' : ((t.author || '') + (t.author && t.text ? ' — ' : '') + (t.text || '').slice(0, 80) + (t.text && t.text.length > 80 ? '…' : ''));
        return '<div class="card-item mb-1 testimonial-list-item">' + img + '<span>' + label + '</span>' +
          '<div class="card-item-actions">' +
          '<button type="button" class="btn-small room-img-up test-order-up" title="Yukarı" data-id="' + t.id + '" data-idx="' + idx + '" ' + (idx === 0 ? 'disabled' : '') + '>↑</button>' +
          '<button type="button" class="btn-small room-img-down test-order-down" title="Aşağı" data-id="' + t.id + '" data-idx="' + idx + '" ' + (idx === (list || []).length - 1 ? 'disabled' : '') + '>↓</button>' +
          '<button type="button" class="btn-small btn-edit" data-id="' + t.id + '" data-test-edit>Düzenle</button> ' +
          '<button type="button" class="btn-small btn-del" data-id="' + t.id + '" data-del>Sil</button>' +
          '</div></div>';
      }).join('');
      document.getElementById('test-list').querySelectorAll('[data-del]').forEach(function(btn) {
        btn.addEventListener('click', function() { if (confirm('Silinsin mi?')) del('/api/admin/testimonials/' + btn.dataset.id).then(function() { loadTestimonials(); }); });
      });
      document.getElementById('test-list').querySelectorAll('.test-order-up').forEach(function(btn) {
        if (btn.disabled) return;
        btn.addEventListener('click', function() {
          var idx = parseInt(btn.dataset.idx, 10);
          if (idx <= 0) return;
          var prev = list[idx - 1];
          var curr = list[idx];
          var fd1 = new FormData(); fd1.append('author', curr.author); fd1.append('text', curr.text); fd1.append('rating', curr.rating); fd1.append('order', idx - 1);
          var fd2 = new FormData(); fd2.append('author', prev.author); fd2.append('text', prev.text); fd2.append('rating', prev.rating); fd2.append('order', idx);
          Promise.all([
            fetch(API + '/api/admin/testimonials/' + encodeURIComponent(curr.id), { method: 'PUT', headers: { 'Authorization': 'Bearer ' + token }, body: fd1 }).then(function(r) { return r.json(); }),
            fetch(API + '/api/admin/testimonials/' + encodeURIComponent(prev.id), { method: 'PUT', headers: { 'Authorization': 'Bearer ' + token }, body: fd2 }).then(function(r) { return r.json(); })
          ]).then(function() { loadTestimonials(); }).catch(function() { alert('Sıra güncellenemedi.'); });
        });
      });
      document.getElementById('test-list').querySelectorAll('.test-order-down').forEach(function(btn) {
        if (btn.disabled) return;
        btn.addEventListener('click', function() {
          var idx = parseInt(btn.dataset.idx, 10);
          if (idx >= (list || []).length - 1) return;
          var next = list[idx + 1];
          var curr = list[idx];
          var fd1 = new FormData(); fd1.append('author', curr.author); fd1.append('text', curr.text); fd1.append('rating', curr.rating); fd1.append('order', idx + 1);
          var fd2 = new FormData(); fd2.append('author', next.author); fd2.append('text', next.text); fd2.append('rating', next.rating); fd2.append('order', idx);
          Promise.all([
            fetch(API + '/api/admin/testimonials/' + encodeURIComponent(curr.id), { method: 'PUT', headers: { 'Authorization': 'Bearer ' + token }, body: fd1 }).then(function(r) { return r.json(); }),
            fetch(API + '/api/admin/testimonials/' + encodeURIComponent(next.id), { method: 'PUT', headers: { 'Authorization': 'Bearer ' + token }, body: fd2 }).then(function(r) { return r.json(); })
          ]).then(function() { loadTestimonials(); }).catch(function() { alert('Sıra güncellenemedi.'); });
        });
      });
      document.getElementById('test-list').querySelectorAll('[data-test-edit]').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var t = (list || []).find(function(x) { return x.id === btn.dataset.id; });
          if (!t) return;
          document.getElementById('test-form-id').value = t.id;
          document.querySelector('#test-form-f [name=author]').value = t.author || '';
          document.querySelector('#test-form-f [name=text]').value = t.text || '';
          document.querySelector('#test-form-f [name=rating]').value = (t.rating != null ? t.rating : 5);
          document.querySelector('#test-form-f [name=image]').value = '';
          var wrap = document.getElementById('test-form-current-img-wrap');
          var preview = document.getElementById('test-form-preview');
          if (t.imageUrl) {
            wrap.style.display = 'block';
            preview.src = t.imageUrl.indexOf('http') === 0 ? t.imageUrl : (window.location.origin + (t.imageUrl.indexOf('/') === 0 ? t.imageUrl : '/' + t.imageUrl));
            preview.style.display = 'block';
          } else { wrap.style.display = 'none'; }
          document.getElementById('test-form').style.display = 'block';
        });
      });
      document.getElementById('test-add').addEventListener('click', function() {
        document.getElementById('test-form-id').value = '';
        document.getElementById('test-form-f').reset();
        document.querySelector('#test-form-f [name=rating]').value = '5';
        document.getElementById('test-form-current-img-wrap').style.display = 'none';
        document.getElementById('test-form').style.display = 'block';
      });
      document.getElementById('test-form-cancel').addEventListener('click', function() { document.getElementById('test-form').style.display = 'none'; });
      document.getElementById('test-form-f').addEventListener('submit', function(e) {
        e.preventDefault();
        var form = this;
        var id = document.getElementById('test-form-id').value;
        var fd = new FormData(form);
        var author = (form.querySelector('[name=author]').value || '').trim();
        var text = (form.querySelector('[name=text]').value || '').trim();
        var ratingVal = form.querySelector('[name=rating]').value;
        fd.set('author', author);
        fd.set('text', text);
        fd.set('rating', ratingVal === '' ? (author || text ? '5' : '0') : ratingVal);
        var url = API + (id ? '/api/admin/testimonials/' + encodeURIComponent(id) : '/api/admin/testimonials');
        var method = id ? 'PUT' : 'POST';
        fetch(url, { method: method, headers: { 'Authorization': 'Bearer ' + token }, body: fd }).then(function(r) { if (r.status === 401) logout(); return r.json(); }).then(function(res) {
          if (res.ok) { document.getElementById('test-form').style.display = 'none'; form.reset(); document.getElementById('test-form-id').value = ''; loadTestimonials(); } else { alert(res.mesaj || 'Hata'); }
        }).catch(function() { alert('Kayıt sırasında hata oluştu.'); });
      });
    });
  }

  function loadServices() {
    var wrap = document.getElementById('services-page');
    get('/api/admin/services').then(function(list) {
      list = list || [];
      wrap.innerHTML =
        '<div class="admin-page-header">' +
        '<h2>Hizmetler</h2>' +
        '<div class="mb-1"><button type="button" class="btn btn-primary" id="svc-add">Hizmet Ekle</button></div>' +
        '</div>' +
        '<p class="admin-page-desc mb-1">Ana sayfada "Hizmetlerimiz" slider\'ında gösterilen hizmetleri buradan ekleyebilir ve düzenleyebilirsiniz.</p>' +
        '<div id="svc-list" class="card-list"></div>' +
        '<div id="svc-form" style="display:none" class="mt-1"><h3>Hizmet Ekle / Düzenle</h3>' +
        '<form id="svc-form-f">' +
        '<input type="hidden" name="id" id="svc-form-id" value="">' +
        '<div class="form-group"><label>Başlık *</label><input type="text" name="title" required placeholder="Örn: Kahvaltı"></div>' +
        '<div class="form-group"><label>Kısa açıklama (kartta görünen)</label><input type="text" name="shortDesc" placeholder="Örn: Zengin açık büfe kahvaltı"></div>' +
        '<div class="form-group"><label>Detay (modalda görünen, tıklanınca)</label><textarea name="detail" rows="4" placeholder="Hizmetin detaylı açıklaması"></textarea></div>' +
        '<div class="form-group"><label>İkon (emoji, resim yoksa kartta gösterilir)</label><input type="text" name="icon" placeholder="☕ veya 🅿️" maxlength="4" style="width:4em"> <span class="form-hint">Örn: ☕ 🅿️ 📶 🍽️ 🛎️ 🏨</span></div>' +
        '<div class="form-group" id="svc-form-current-img-wrap" style="display:none"><label>Mevcut resim</label><img id="svc-form-preview" src="" alt="" style="max-width:200px;max-height:120px;object-fit:cover;border-radius:8px;margin-top:4px;display:block"></div>' +
        '<div class="form-group"><label>Resim</label><p class="form-hint">Kartta gösterilecek görsel. İsteğe bağlı. Düzenlerken değiştirmek istemezseniz boş bırakın.</p><input type="file" name="image" accept="image/*"></div>' +
        '<button type="submit" class="btn btn-primary">Kaydet</button> <button type="button" class="btn btn-no" id="svc-form-cancel">İptal</button>' +
        '</form></div>';
      var listEl = document.getElementById('svc-list');
      listEl.innerHTML = list.length === 0
        ? '<p class="form-hint">Henüz hizmet eklenmemiş. "Hizmet Ekle" ile ekleyin.</p>'
        : list.map(function(s, idx) {
            var thumb = (s.imageUrl && s.imageUrl.trim()) ? '<img src="' + (s.imageUrl.indexOf('http') === 0 ? s.imageUrl : (window.location.origin + (s.imageUrl.indexOf('/') === 0 ? s.imageUrl : '/' + s.imageUrl))) + '" alt="" class="svc-list-thumb" onerror="this.style.display=\'none\'">' : '';
            return '<div class="card-item mb-1">' +
              (thumb || ('<span class="svc-icon-preview">' + (s.icon || '⭐') + '</span> ')) +
              '<strong>' + escapeHtml(s.title || '') + '</strong>' +
              (s.shortDesc ? ' — ' + escapeHtml((s.shortDesc || '').slice(0, 50)) + ((s.shortDesc || '').length > 50 ? '…' : '') : '') +
              '<div class="card-item-actions">' +
              '<button type="button" class="btn-small room-img-up svc-order-up" title="Yukarı" data-id="' + s.id + '" data-idx="' + idx + '" ' + (idx === 0 ? 'disabled' : '') + '>↑</button>' +
              '<button type="button" class="btn-small room-img-down svc-order-down" title="Aşağı" data-id="' + s.id + '" data-idx="' + idx + '" ' + (idx === list.length - 1 ? 'disabled' : '') + '>↓</button>' +
              '<button type="button" class="btn-small btn-edit svc-edit" data-id="' + s.id + '">Düzenle</button> ' +
              '<button type="button" class="btn-small btn-del svc-del" data-id="' + s.id + '">Sil</button>' +
              '</div></div>';
          }).join('');
      function escapeHtml(str) {
        if (!str) return '';
        var d = document.createElement('div');
        d.textContent = str;
        return d.innerHTML;
      }
      listEl.querySelectorAll('.svc-del').forEach(function(btn) {
        btn.addEventListener('click', function() {
          if (!confirm('Bu hizmet silinsin mi?')) return;
          del('/api/admin/services/' + btn.dataset.id).then(function() { loadServices(); }).catch(function() { alert('Silinemedi.'); });
        });
      });
      listEl.querySelectorAll('.svc-order-up').forEach(function(btn) {
        if (btn.disabled) return;
        btn.addEventListener('click', function() {
          var idx = parseInt(btn.dataset.idx, 10);
          if (idx <= 0) return;
          var curr = list[idx];
          var prev = list[idx - 1];
          put('/api/admin/services/' + curr.id, { order: idx - 1 }).then(function() {
            return put('/api/admin/services/' + prev.id, { order: idx });
          }).then(function() { loadServices(); }).catch(function() { alert('Sıra güncellenemedi.'); });
        });
      });
      listEl.querySelectorAll('.svc-order-down').forEach(function(btn) {
        if (btn.disabled) return;
        btn.addEventListener('click', function() {
          var idx = parseInt(btn.dataset.idx, 10);
          if (idx >= list.length - 1) return;
          var curr = list[idx];
          var next = list[idx + 1];
          put('/api/admin/services/' + curr.id, { order: idx + 1 }).then(function() {
            return put('/api/admin/services/' + next.id, { order: idx });
          }).then(function() { loadServices(); }).catch(function() { alert('Sıra güncellenemedi.'); });
        });
      });
      listEl.querySelectorAll('.svc-edit').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var s = list.find(function(x) { return x.id === btn.dataset.id; });
          if (!s) return;
          document.getElementById('svc-form-id').value = s.id;
          document.querySelector('#svc-form-f [name=title]').value = s.title || '';
          document.querySelector('#svc-form-f [name=shortDesc]').value = s.shortDesc || '';
          document.querySelector('#svc-form-f [name=detail]').value = s.detail || '';
          document.querySelector('#svc-form-f [name=icon]').value = s.icon || '⭐';
          document.querySelector('#svc-form-f [name=image]').value = '';
          var imgWrap = document.getElementById('svc-form-current-img-wrap');
          var preview = document.getElementById('svc-form-preview');
          if (s.imageUrl && s.imageUrl.trim()) {
            imgWrap.style.display = 'block';
            preview.src = s.imageUrl.indexOf('http') === 0 ? s.imageUrl : (window.location.origin + (s.imageUrl.indexOf('/') === 0 ? s.imageUrl : '/' + s.imageUrl));
            preview.style.display = 'block';
          } else { imgWrap.style.display = 'none'; }
          document.getElementById('svc-form').style.display = 'block';
        });
      });
      document.getElementById('svc-add').addEventListener('click', function() {
        document.getElementById('svc-form-id').value = '';
        document.getElementById('svc-form-f').reset();
        document.querySelector('#svc-form-f [name=icon]').value = '⭐';
        document.getElementById('svc-form-current-img-wrap').style.display = 'none';
        document.getElementById('svc-form').style.display = 'block';
      });
      document.getElementById('svc-form-cancel').addEventListener('click', function() { document.getElementById('svc-form').style.display = 'none'; });
      document.getElementById('svc-form-f').addEventListener('submit', function(e) {
        e.preventDefault();
        var form = this;
        var id = document.getElementById('svc-form-id').value;
        var title = (form.querySelector('[name=title]').value || '').trim();
        var shortDesc = (form.querySelector('[name=shortDesc]').value || '').trim();
        var detail = (form.querySelector('[name=detail]').value || '').trim();
        var icon = (form.querySelector('[name=icon]').value || '').trim() || '⭐';
        if (!title) { alert('Başlık zorunludur.'); return; }
        var fd = new FormData();
        fd.append('title', title);
        fd.append('shortDesc', shortDesc);
        fd.append('detail', detail);
        fd.append('icon', icon);
        var fileInput = form.querySelector('[name=image]');
        if (fileInput && fileInput.files && fileInput.files[0]) fd.append('image', fileInput.files[0]);
        var url = API + (id ? '/api/admin/services/' + encodeURIComponent(id) : '/api/admin/services');
        var method = id ? 'PUT' : 'POST';
        fetch(url, { method: method, headers: { 'Authorization': 'Bearer ' + token }, body: fd }).then(function(r) { if (r.status === 401) logout(); return r.json(); }).then(function(res) {
          if (res.ok) {
            document.getElementById('svc-form').style.display = 'none';
            form.reset();
            document.getElementById('svc-form-id').value = '';
            document.getElementById('svc-form-current-img-wrap').style.display = 'none';
            loadServices();
          } else {
            alert(res.mesaj || 'Hata');
          }
        }).catch(function() { alert('Kayıt sırasında hata oluştu.'); });
      });
    }).catch(function() {
      wrap.innerHTML = '<p class="form-error">Hizmetler yüklenemedi.</p>';
    });
  }

  function loadAdmins() {
    var wrap = document.getElementById('admins-page');
    var isSuper = user && user.role === 'super_admin';
    var currentUsername = (user && user.username) || '';
    var topHtml = '<h2>Admin Yönetimi</h2>';
    var adminListHtml = '';
    if (isSuper) {
      adminListHtml = '<section class="admin-list-section">' +
        '<h3 class="admin-list-title">Admin Listesi</h3>' +
        '<div class="mb-1"><button type="button" class="btn btn-primary" id="admin-add">Admin Ekle</button></div>' +
        '<div class="table-wrap"><table><thead><tr><th>Kullanıcı adı</th><th>Rol</th><th>Durum</th><th>İşlem</th></tr></thead><tbody id="admins-tbody"></tbody></table></div>' +
        '<div id="admin-form" style="display:none" class="mt-1 admin-form-box"><form id="admin-form-f"><div class="form-group"><label>Kullanıcı adı</label><input type="text" name="username" required placeholder="Kullanıcı adı"></div><div class="form-group"><label>Şifre</label><div class="password-wrap"><input type="password" name="password" required><button type="button" class="password-toggle" aria-label="Şifreyi göster" title="Şifreyi göster">👁</button></div></div><div class="form-group"><label>Rol</label><select name="role"><option value="admin">Admin</option><option value="super_admin">Süper Admin</option></select></div><button type="submit" class="btn btn-primary">Ekle</button> <button type="button" class="btn btn-no" id="admin-form-cancel">İptal</button></form></div>' +
      '</section>';
    } else {
      adminListHtml = '<p class="admin-ayar-intro">Kullanıcı adı veya şifrenizi değiştirmek için aşağıdaki butonu kullanın.</p>' +
        '<button type="button" class="btn btn-primary btn-ayar">Hesap ayarları</button>';
    }
    wrap.innerHTML = topHtml + adminListHtml;

    /* Ayarlar modalı: kullanıcı adı / şifre değiştirme seçimi */
    var modalHtml = '<div id="admin-ayar-modal" class="admin-modal" style="display:none">' +
      '<div class="admin-modal-box admin-ayar-modal-box">' +
        '<div id="admin-ayar-step1" class="admin-ayar-step">' +
          '<h3>Hesap ayarları</h3>' +
          '<p class="admin-ayar-desc">Ne değiştirmek istiyorsunuz?</p>' +
          '<div class="admin-ayar-buttons">' +
            '<button type="button" class="btn btn-primary btn-ayar-option" data-ayar="username">Kullanıcı adı değiştir</button>' +
            '<button type="button" class="btn btn-outline btn-ayar-option" data-ayar="password">Şifre değiştir</button>' +
          '</div>' +
        '</div>' +
        '<div id="admin-ayar-step2-username" class="admin-ayar-step" style="display:none">' +
          '<h3>Kullanıcı adı değiştir</h3>' +
          '<form id="admin-ayar-username-form">' +
            '<div class="form-group"><label>Mevcut kullanıcı adı</label><input type="text" value="' + (currentUsername || '') + '" readonly class="input-readonly"></div>' +
            '<div class="form-group"><label>Yeni kullanıcı adı</label><input type="text" name="newUsername" required placeholder="Yeni kullanıcı adı"></div>' +
            '<div class="form-group"><label>Şifre (doğrulama)</label><div class="password-wrap"><input type="password" name="password" required placeholder="Mevcut şifrenizi girin"><button type="button" class="password-toggle" aria-label="Şifreyi göster" title="Şifreyi göster">👁</button></div></div>' +
            '<p id="admin-ayar-username-error" class="form-error" style="display:none"></p>' +
            '<div class="form-actions"><button type="button" class="btn btn-outline admin-ayar-back">Geri</button><button type="submit" class="btn btn-primary">Güncelle</button></div>' +
          '</form>' +
        '</div>' +
        '<div id="admin-ayar-step2-password" class="admin-ayar-step" style="display:none">' +
          '<h3>Şifre değiştir</h3>' +
          '<form id="admin-ayar-password-form">' +
            '<div class="form-group"><label>Mevcut şifre</label><div class="password-wrap"><input type="password" name="currentPassword" required><button type="button" class="password-toggle" aria-label="Şifreyi göster" title="Şifreyi göster">👁</button></div></div>' +
            '<div class="form-group"><label>Yeni şifre</label><div class="password-wrap"><input type="password" name="newPassword" required minlength="6" placeholder="En az 6 karakter"><button type="button" class="password-toggle" aria-label="Şifreyi göster" title="Şifreyi göster">👁</button></div></div>' +
            '<div class="form-group"><label>Yeni şifre (tekrar)</label><div class="password-wrap"><input type="password" name="newPasswordConfirm" required minlength="6"><button type="button" class="password-toggle" aria-label="Şifreyi göster" title="Şifreyi göster">👁</button></div></div>' +
            '<p id="admin-ayar-password-error" class="form-error" style="display:none"></p>' +
            '<div class="form-actions"><button type="button" class="btn btn-outline admin-ayar-back">Geri</button><button type="submit" class="btn btn-primary">Güncelle</button></div>' +
          '</form>' +
        '</div>' +
      '</div></div>';
    wrap.insertAdjacentHTML('beforeend', modalHtml);

    var otherModalHtml = '<div id="admin-edit-other-modal" class="admin-modal" style="display:none">' +
      '<div class="admin-modal-box">' +
        '<h3 id="admin-edit-other-title">Kullanıcıyı düzenle</h3>' +
        '<form id="admin-edit-other-form">' +
          '<input type="hidden" name="adminId" id="admin-edit-other-id">' +
          '<div class="form-group"><label>Kullanıcı</label><input type="text" id="admin-edit-other-username-display" readonly class="input-readonly"></div>' +
          '<div class="form-group"><label>Yeni kullanıcı adı</label><input type="text" name="newUsername" placeholder="Değiştirmek istemiyorsanız boş bırakın"></div>' +
          '<div class="form-group"><label>Yeni şifre</label><div class="password-wrap"><input type="password" name="newPassword" placeholder="Değiştirmek istemiyorsanız boş bırakın (min 6 karakter)"><button type="button" class="password-toggle" aria-label="Şifreyi göster" title="Şifreyi göster">👁</button></div></div>' +
          '<p id="admin-edit-other-error" class="form-error" style="display:none"></p>' +
          '<div class="form-actions"><button type="button" class="btn btn-outline" id="admin-edit-other-cancel">İptal</button><button type="submit" class="btn btn-primary">Güncelle</button></div>' +
        '</form>' +
      '</div></div>';
    wrap.insertAdjacentHTML('beforeend', otherModalHtml);

    (function setupAyarModal() {
      var modal = document.getElementById('admin-ayar-modal');
      var otherModal = document.getElementById('admin-edit-other-modal');
      var step1 = document.getElementById('admin-ayar-step1');
      var step2Username = document.getElementById('admin-ayar-step2-username');
      var step2Password = document.getElementById('admin-ayar-step2-password');
      function showStep1() { step1.style.display = 'block'; step2Username.style.display = 'none'; step2Password.style.display = 'none'; }
      function showStep2(id) { step1.style.display = 'none'; step2Username.style.display = id === 'username' ? 'block' : 'none'; step2Password.style.display = id === 'password' ? 'block' : 'none'; }
      wrap.addEventListener('click', function(e) {
        if (e.target.closest('.btn-ayar-other')) {
          var btn = e.target.closest('.btn-ayar-other');
          var id = btn.getAttribute('data-admin-id');
          var un = btn.getAttribute('data-admin-username');
          if (id) {
            document.getElementById('admin-edit-other-form').reset();
            document.getElementById('admin-edit-other-id').value = id;
            document.getElementById('admin-edit-other-username-display').value = un || '';
            document.getElementById('admin-edit-other-title').textContent = 'Kullanıcıyı düzenle: ' + (un || id);
            document.getElementById('admin-edit-other-error').style.display = 'none';
            otherModal.style.display = 'flex';
          }
          return;
        }
        if (e.target.closest('.btn-ayar') && !e.target.closest('.btn-ayar-other')) { modal.style.display = 'flex'; showStep1(); return; }
        if (e.target.id === 'admin-ayar-modal') { modal.style.display = 'none'; showStep1(); return; }
        if (e.target.id === 'admin-edit-other-modal') { otherModal.style.display = 'none'; return; }
        if (e.target.closest('.admin-ayar-option')) { var t = e.target.closest('[data-ayar]'); if (t) showStep2(t.getAttribute('data-ayar')); return; }
        if (e.target.closest('.admin-ayar-back')) { showStep1(); return; }
      });
      document.getElementById('admin-edit-other-cancel').addEventListener('click', function() { otherModal.style.display = 'none'; });
      document.getElementById('admin-edit-other-form').addEventListener('submit', function(e) {
        e.preventDefault();
        var fd = new FormData(this);
        var id = fd.get('adminId');
        var newUsername = (fd.get('newUsername') || '').trim();
        var newPassword = fd.get('newPassword') || '';
        var errEl = document.getElementById('admin-edit-other-error');
        errEl.style.display = 'none';
        if (!newUsername && !newPassword) { errEl.textContent = 'Kullanıcı adı veya şifre girin (en az biri).'; errEl.style.display = 'block'; return; }
        if (newPassword && newPassword.length < 6) { errEl.textContent = 'Şifre en az 6 karakter olmalı.'; errEl.style.display = 'block'; return; }
        var body = {};
        if (newUsername) body.username = newUsername;
        if (newPassword) body.password = newPassword;
        put('/api/admin/admins/' + id, body).then(function(res) {
          if (res.ok) { otherModal.style.display = 'none'; alert('Güncellendi.'); loadAdmins(); }
          else { errEl.textContent = res.mesaj || 'Hata'; errEl.style.display = 'block'; }
        }).catch(function() { errEl.textContent = 'Bir hata oluştu.'; errEl.style.display = 'block'; });
      });
      document.getElementById('admin-ayar-username-form').addEventListener('submit', function(e) {
        e.preventDefault();
        var fd = new FormData(this);
        var errEl = document.getElementById('admin-ayar-username-error');
        errEl.style.display = 'none';
        put('/api/auth/change-username', { newUsername: fd.get('newUsername'), password: fd.get('password') }).then(function(res) {
          if (res.ok) { token = res.token; user = res.user; localStorage.setItem('adminToken', token); modal.style.display = 'none'; showStep1(); alert('Kullanıcı adı güncellendi.'); loadAdmins(); }
          else { errEl.textContent = res.mesaj || 'Hata'; errEl.style.display = 'block'; }
        }).catch(function() { errEl.textContent = 'Bir hata oluştu.'; errEl.style.display = 'block'; });
      });
      document.getElementById('admin-ayar-password-form').addEventListener('submit', function(e) {
        e.preventDefault();
        var fd = new FormData(this);
        var newPw = fd.get('newPassword');
        var newPwConfirm = fd.get('newPasswordConfirm');
        var errEl = document.getElementById('admin-ayar-password-error');
        errEl.style.display = 'none';
        if (newPw !== newPwConfirm) { errEl.textContent = 'Yeni şifreler eşleşmiyor.'; errEl.style.display = 'block'; return; }
        put('/api/auth/change-password', { currentPassword: fd.get('currentPassword'), newPassword: newPw }).then(function(res) {
          if (res.ok) { modal.style.display = 'none'; showStep1(); e.target.reset(); alert('Şifre güncellendi.'); loadAdmins(); }
          else { errEl.textContent = res.mesaj || 'Hata'; errEl.style.display = 'block'; }
        }).catch(function() { errEl.textContent = 'Bir hata oluştu.'; errEl.style.display = 'block'; });
      });
    })();

    if (isSuper) {
      get('/api/admin/admins').then(function(list) {
        var tbody = document.getElementById('admins-tbody');
        if (tbody) {
          tbody.innerHTML = (list || []).map(function(a) {
            var statusHtml = a.isActive ? '<span class="status-indicator status-active"><span class="status-dot"></span> Aktif</span>' : '<span class="status-indicator status-inactive"><span class="status-dot"></span> Çevrimdışı</span>';
            var isCurrentUser = a.id === user.id;
            var un = (a.username || '').replace(/"/g, '&quot;');
            var actionCell = isCurrentUser
              ? '<span class="current-user-label">Siz</span> <button type="button" class="btn-icon btn-ayar" data-ayar title="Kullanıcı adı veya şifre değiştir"><span class="icon-ayar">⚙</span></button>'
              : '<button type="button" class="btn-icon btn-ayar btn-ayar-other" data-ayar data-admin-id="' + a.id + '" data-admin-username="' + un + '" title="Kullanıcı adı veya şifre değiştir"><span class="icon-ayar">⚙</span></button> <button type="button" class="btn-icon btn-del" data-id="' + a.id + '" data-del title="Sil"><span class="icon-del">🗑</span></button>';
            return '<tr><td>' + (a.username || '') + '</td><td><span class="role-badge role-' + (a.role || '') + '">' + (a.role || '') + '</span></td><td>' + statusHtml + '</td><td class="admin-actions-cell"><div class="admin-actions-wrap">' + actionCell + '</div></td></tr>';
          }).join('');
          tbody.querySelectorAll('[data-del]').forEach(function(btn) {
            btn.addEventListener('click', function() { if (confirm('Bu admin silinsin mi?')) del('/api/admin/admins/' + btn.dataset.id).then(function(res) { if (res.ok) loadAdmins(); else alert(res.mesaj); }); });
          });
        }
        var adminAddBtn = document.getElementById('admin-add');
        if (adminAddBtn) adminAddBtn.addEventListener('click', function() { document.getElementById('admin-form').style.display = 'block'; document.getElementById('admin-form-f').reset(); });
        var adminFormCancel = document.getElementById('admin-form-cancel');
        if (adminFormCancel) adminFormCancel.addEventListener('click', function() { document.getElementById('admin-form').style.display = 'none'; });
        var adminFormF = document.getElementById('admin-form-f');
        if (adminFormF) adminFormF.addEventListener('submit', function(e) {
          e.preventDefault();
          var fd = new FormData(this);
          post('/api/admin/admins', { username: fd.get('username'), password: fd.get('password'), role: fd.get('role') }).then(function(res) { if (res.ok) { document.getElementById('admin-form').style.display = 'none'; loadAdmins(); } else alert(res.mesaj || 'Hata'); });
        });
      }).catch(function() {
        var tbody = document.getElementById('admins-tbody');
        if (tbody) tbody.innerHTML = '<tr><td colspan="4">Liste yüklenemedi.</td></tr>';
      });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
