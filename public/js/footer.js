(function() {
  /* Footer iletişim ve konum: Admin paneli > Ana Sayfa > İletişim bölümündeki bilgilerle doldurulur (GET /api/settings). */
  var footerContact = document.getElementById('footer-contact');
  var footerKonum = document.getElementById('footer-konum');
  if (!footerContact && !footerKonum) return;
  fetch('/api/settings').then(function(r) { return r.json(); }).then(function(s) {
    var c = s.contact || {};
    if (footerContact) {
      var parts = [];
      if (c.address) parts.push('<p>' + escapeHtml(c.address) + '</p>');
      if (c.phone) parts.push('<p><a href="tel:' + escapeHtml(c.phone.replace(/\s/g, '')) + '">' + escapeHtml(c.phone) + '</a></p>');
      if (c.email) parts.push('<p><a href="mailto:' + escapeHtml(c.email) + '">' + escapeHtml(c.email) + '</a></p>');
      if (c.extra && c.extra.length) {
        c.extra.forEach(function(x) {
          var v = (x.value || '').trim();
          if (!v) return;
          var lab = escapeHtml(x.label || '');
          var valEsc = escapeHtml(v);
          var digits = v.replace(/\D/g, '');
          if (digits.length >= 10) parts.push('<p>' + (lab ? '<strong>' + lab + '</strong> ' : '') + '<a href="tel:' + (v.indexOf('+') !== -1 ? '+' : '') + digits + '">' + valEsc + '</a></p>');
          else if (/^https?:\/\//i.test(v) || (v.indexOf(' ') === -1 && v.indexOf('.') !== -1)) {
          var url = v.match(/^https?:\/\//) ? v : 'https://' + v;
          parts.push('<p>' + (lab ? '<strong>' + lab + '</strong> ' : '') + '<a href="' + escapeHtml(url) + '" target="_blank" rel="noopener noreferrer">' + valEsc + '</a></p>');
        }
          else parts.push('<p><strong>' + lab + '</strong> ' + valEsc + '</p>');
        });
      }
      footerContact.innerHTML = parts.length ? parts.join('') : '<p>İletişim bilgisi eklenmemiş.</p>';
    }
    if (footerKonum) {
      var addr = c.address || '';
      var mapEmbed = (c.mapEmbed || '').trim();
      var mapsUrl = addr ? 'https://www.google.com/maps/search/?api=1&amp;query=' + encodeURIComponent(addr) : '#';
      var mapHtml = '';
      if (mapEmbed) {
        mapHtml = '<div class="footer-map-preview">' +
          '<iframe src="' + escapeHtml(mapEmbed) + '" title="Konum" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>' +
          '<a href="' + mapsUrl + '" target="_blank" rel="noopener noreferrer" class="footer-map-link" aria-label="Konumu haritada aç"></a>' +
          '</div>';
      } else if (addr) {
        mapHtml = '<a href="' + mapsUrl + '" target="_blank" rel="noopener noreferrer" class="footer-map-preview footer-map-placeholder" aria-label="Konumu haritada aç"><span>📍 Haritada konumu aç</span></a>';
      }
      if (addr) mapHtml += '<p class="footer-address">' + escapeHtml(addr) + '</p><p><a href="' + mapsUrl + '" target="_blank" rel="noopener noreferrer">Haritada aç</a></p>';
      else if (!mapEmbed) mapHtml = '<p>Konum bilgisi eklenmemiş.</p>';
      footerKonum.innerHTML = mapHtml;
    }
  }).catch(function() {
    if (footerContact) footerContact.innerHTML = '<p>İletişim bilgisi yüklenemedi.</p>';
    if (footerKonum) footerKonum.innerHTML = '<p>Konum bilgisi yüklenemedi.</p>';
  });
  function escapeHtml(s) {
    if (!s) return '';
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }
})();
