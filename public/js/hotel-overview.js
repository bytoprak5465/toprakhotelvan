/**
 * Genel Bakış – API’den gelen veriyle HTML üretir; yoksa varsayılan gösterilir.
 */
(function() {
  function esc(s) { if (!s) return ''; var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

  window.DEFAULT_HOTEL_OVERVIEW = {
    header: { title: 'Genel bakış', lead: 'Konaklama bilgileri ve otel kuralları' },
    cards: [
      { icon: '🏨', title: 'Konaklama', type: 'text', text: '24 oda' },
      { icon: '🕐', title: 'Varış / Çıkış', type: 'list', items: ['Giriş 14:00 – 23:00', 'Çıkış 11:00', 'Min. giriş yaşı: 15', 'Geç giriş müsaitliğe bağlıdır'] },
      { icon: '📋', title: 'Girişte gerekenler', type: 'list', items: ['Kredi/banka kartı veya nakit depozito', 'Fotoğraflı kimlik (gerekebilir)', '15 yaş ve üzeri misafir', 'Yerel kurallar: evli olmayan çiftler hakkında bilgi alın'] },
      { icon: '📞', title: 'Özel talimatlar', type: 'list', items: ['Varışta resepsiyon personeli karşılar', '20:00 sonrası varışta önceden iletişim kurun'] },
      { icon: '👶', title: 'Çocuk', type: 'text', text: 'Beşik (çocuk yatağı) yoktur.' },
      { icon: '🐾', title: 'Evcil hayvan', type: 'text', text: 'Evcil hayvan kabul edilmez.' },
      { icon: '📶', title: 'İnternet', type: 'list', items: ['Genel alanlarda ücretsiz Wi‑Fi', 'Odalarda ücretsiz Wi‑Fi'], wide: true },
      { icon: '🅿️', title: 'Otopark', type: 'text', text: 'Kapalı valesiz otopark, 60 TRY/gün.' },
      { icon: '🚭', title: 'Diğer', type: 'text', text: 'Sigara içilmeyen konaklama.' },
      { icon: '🛗', title: 'Ortak alanlar', type: 'text', text: 'Asansör' },
      { icon: '🛏️', title: 'Odalar', type: 'list', items: ['İnce halı', 'Parke döşeme'] }
    ],
    highlightAbout: { title: 'Bu konaklama yeri hakkında', text: 'Van bölgesinde otel.', tags: ['Açık büfe kahvaltı', 'Ücretsiz Wi‑Fi', 'Günlük kat hizmeti', 'Otopark', 'Teras', 'Oda servisi'] },
    highlightFeatures: { title: 'Öne çıkanlar', items: ['En yüksek puanlı kahvaltı ile keyifli sabahlar', 'Güvenli ve rahat otopark – bölgede nadir', 'Van Alışveriş Merkezi yakınında'] },
    addressCard: { address: 'Bahçıvan Mah. Meydan 1. Sokak, No.: 8/a, Van, 65130', points: ['Peynirciler Çarşısı · 3 dk yürüyüş', 'Van Ulu Camii · 6 dk yürüyüş', 'Van AVM · 16 dk yürüyüş', 'Van Havalimanı · 7 dk sürüş'] },
    fullCards: [
      { icon: '💳', title: 'Ücretler ve politikalar', text: 'Otopark: 60 TRY/gün. Kredi kartı, banka kartı ve nakit kabul. Visa, Mastercard. Tesiste güvenlik sistemi ve ilk yardım çantası. Konaklama Yeri Tescil no: 2021-65-0014.' },
      { icon: '♿', title: 'Engellilere yönelik', text: 'Özel ihtiyaçlarınız için rezervasyondan sonra rezervasyon onayındaki bilgilerle konaklama yeriyle iletişime geçin.' }
    ]
  };

  function renderCards(cards) {
    if (!cards || !cards.length) return '';
    return '<div class="hotel-overview-grid">' + cards.map(function(c) {
      var icon = '<span class="hotel-overview-icon" aria-hidden="true">' + esc(c.icon || '') + '</span>';
      var title = '<h3 class="hotel-overview-h3">' + esc(c.title || '') + '</h3>';
      var body = '';
      if (c.type === 'list' && c.items && c.items.length) {
        body = '<ul class="hotel-overview-list' + (c.wide ? ' hotel-overview-list-inline' : '') + '">' + c.items.map(function(i) { return '<li>' + esc(i) + '</li>'; }).join('') + '</ul>';
      } else {
        body = '<p class="hotel-overview-text">' + esc(c.text || '') + '</p>';
      }
      var cardClass = 'hotel-overview-card' + (c.wide ? ' hotel-overview-card-wide' : '');
      return '<div class="' + cardClass + '">' + icon + title + body + '</div>';
    }).join('') + '</div>';
  }

  function renderHighlight(title, text, tags, isGold) {
    var h = '<div class="hotel-overview-highlight' + (isGold ? ' hotel-overview-highlight-gold' : '') + '">' + '<h3 class="hotel-overview-h3">' + esc(title || '') + '</h3>';
    if (text) h += '<p class="hotel-overview-text">' + esc(text) + '</p>';
    if (tags && tags.length) h += '<ul class="hotel-overview-tags">' + tags.map(function(t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>';
    if (!text && !tags) return '';
    return h + '</div>';
  }

  function renderHighlightList(title, items) {
    if (!items || !items.length) return '';
    return '<div class="hotel-overview-highlight hotel-overview-highlight-gold">' +
      '<h3 class="hotel-overview-h3">' + esc(title || '') + '</h3>' +
      '<ul class="hotel-overview-list">' + items.map(function(i) { return '<li>' + esc(i) + '</li>'; }).join('') + '</ul></div>';
  }

  function renderAddressCard(addr) {
    if (!addr || (!addr.address && (!addr.points || !addr.points.length))) return '';
    var html = '<div class="hotel-overview-address-card">' +
      '<span class="hotel-overview-icon" aria-hidden="true">📍</span><div>' +
      '<h3 class="hotel-overview-h3">Bölge ve adres</h3>';
    if (addr.address) html += '<p class="hotel-overview-address">' + esc(addr.address) + '</p>';
    if (addr.points && addr.points.length) html += '<ul class="hotel-overview-list">' + addr.points.map(function(p) { return '<li>' + esc(p) + '</li>'; }).join('') + '</ul>';
    return html + '</div></div>';
  }

  function renderFullCards(fullCards) {
    if (!fullCards || !fullCards.length) return '';
    return fullCards.map(function(c) {
      return '<div class="hotel-overview-card hotel-overview-card-full">' +
        '<span class="hotel-overview-icon" aria-hidden="true">' + esc(c.icon || '') + '</span>' +
        '<h3 class="hotel-overview-h3">' + esc(c.title || '') + '</h3>' +
        '<p class="hotel-overview-text">' + esc(c.text || '') + '</p></div>';
    }).join('');
  }

  window.buildHotelOverviewHTML = function(data) {
    if (!data || typeof data !== 'object') return '';
    var h = data.header || {};
    var html = '<section class="hotel-overview" aria-labelledby="hotel-overview-title">' +
      '<div class="hotel-overview-header">' +
      '<h2 id="hotel-overview-title" class="hotel-overview-title">' + esc(h.title || 'Genel bakış') + '</h2>' +
      '<p class="hotel-overview-lead">' + esc(h.lead || '') + '</p></div>';
    html += renderCards(data.cards);
    if (data.highlightAbout) html += renderHighlight(data.highlightAbout.title, data.highlightAbout.text, data.highlightAbout.tags, false);
    html += renderCards(data.cards2 || []); // ortak alanlar / odalar tekrar grid için – tek grid’te birleşik kullanıyoruz, cards’ta zaten var
    if (data.highlightFeatures) html += renderHighlightList(data.highlightFeatures.title, data.highlightFeatures.items);
    html += renderAddressCard(data.addressCard);
    html += renderFullCards(data.fullCards);
    return html + '</section>';
  };

  /* API’den veri gelmezse kullanılacak sabit HTML (eski görünüm) */
  window.HOTEL_OVERVIEW_HTML_DEFAULT = (function() {
    return window.buildHotelOverviewHTML(window.DEFAULT_HOTEL_OVERVIEW);
  })();
})();
