(function() {
  window.initHeroSlider = function() {
    initSlider(document.querySelector('.hero-slider'));
  };
  function initSlider(container) {
    if (!container) return;
    var slides = container.querySelectorAll('.hero-slide');
    var dotsWrap = container.querySelector('.hero-dots');
    var len = slides.length;
    if (len === 0) return;

    var idx = 0;
    function go(i) {
      idx = (i + len) % len;
      slides.forEach(function(s, k) { s.classList.toggle('active', k === idx); });
      if (dotsWrap) {
        var dots = dotsWrap.querySelectorAll('.hero-dot');
        dots.forEach(function(d, k) { d.classList.toggle('active', k === idx); });
      }
      var slide = slides[idx];
      var titleEl = document.querySelector('.hero-title');
      var subEl = document.querySelector('.hero-subtitle');
      if (slide && slide.dataset) {
        if (titleEl && slide.dataset.title !== undefined) titleEl.textContent = slide.dataset.title || titleEl.textContent;
        if (subEl && slide.dataset.subtitle !== undefined) subEl.textContent = slide.dataset.subtitle || subEl.textContent;
      }
    }

    if (dotsWrap) {
      for (var i = 0; i < len; i++) {
        var dot = document.createElement('span');
        dot.className = 'hero-dot' + (i === 0 ? ' active' : '');
        dot.setAttribute('aria-label', 'Slide ' + (i + 1));
        (function(j) { dot.addEventListener('click', function() { go(j); }); })(i);
        dotsWrap.appendChild(dot);
      }
    }

    var prevBtn = container.querySelector('.hero-arrow-prev');
    var nextBtn = container.querySelector('.hero-arrow-next');
    if (!prevBtn) {
      prevBtn = document.createElement('button');
      prevBtn.type = 'button';
      prevBtn.className = 'hero-arrow hero-arrow-prev';
      prevBtn.setAttribute('aria-label', 'Önceki');
      prevBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>';
      container.appendChild(prevBtn);
    }
    if (!nextBtn) {
      nextBtn = document.createElement('button');
      nextBtn.type = 'button';
      nextBtn.className = 'hero-arrow hero-arrow-next';
      nextBtn.setAttribute('aria-label', 'Sonraki');
      nextBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>';
      container.appendChild(nextBtn);
    }
    prevBtn.addEventListener('click', function() { go(idx - 1); });
    nextBtn.addEventListener('click', function() { go(idx + 1); });
    if (len <= 1) {
      prevBtn.style.display = 'none';
      nextBtn.style.display = 'none';
    } else {
      prevBtn.style.display = '';
      nextBtn.style.display = '';
    }

    go(0);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', window.initHeroSlider);
  else window.initHeroSlider();
})();
