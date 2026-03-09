// Premium Hotel Navbar Interactivity
(function(){
  const header = document.getElementById('site-header');
  const menuToggle = document.getElementById('menu-toggle');
  const mobilePanel = document.getElementById('mobile-panel');
  const mobileClose = document.getElementById('mobile-close');
  const menuOpenIcon = document.getElementById('menu-open');
  const menuCloseIcon = document.getElementById('menu-close');

  // Scroll handler with throttle for performance
  let scrollTimeout;
  function onScroll(){
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      if(window.scrollY > 50){
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    }, 10);
  }

  // Mobile menu handlers
  let mobileOpen = false;
  function openMobile(){
    mobilePanel.classList.add('open');
    mobilePanel.style.transform = 'translateX(0%)';
    menuToggle.setAttribute('aria-expanded','true');
    menuOpenIcon.classList.add('hidden');
    menuCloseIcon.classList.remove('hidden');
    mobileOpen = true;
    document.body.style.overflow = 'hidden'; // Prevent background scroll

    // Focus trap
    const firstLink = mobilePanel.querySelector('a, button, [tabindex]');
    if(firstLink) setTimeout(() => firstLink.focus(), 100);
  }

  function closeMobile(){
    mobilePanel.classList.remove('open');
    mobilePanel.style.transform = 'translateX(100%)';
    menuToggle.setAttribute('aria-expanded','false');
    menuOpenIcon.classList.remove('hidden');
    menuCloseIcon.classList.add('hidden');
    mobileOpen = false;
    document.body.style.overflow = ''; // Restore scroll
    menuToggle.focus();
  }

  // Event listeners
  menuToggle.addEventListener('click', (e) => {
    e.preventDefault();
    if(mobileOpen) closeMobile(); else openMobile();
  });

  mobileClose.addEventListener('click', (e) => {
    e.preventDefault();
    closeMobile();
  });

  // Close on Escape
  document.addEventListener('keydown', (e)=>{
    if(e.key === 'Escape' && mobileOpen) closeMobile();
  });

  // Close on outside click
  document.addEventListener('click', (e)=>{
    if(mobileOpen && !mobilePanel.contains(e.target) && !menuToggle.contains(e.target)){
      closeMobile();
    }
  });

  // Services button accessibility (desktop)
  const servicesButton = document.getElementById('services-button');
  if(servicesButton){
    servicesButton.addEventListener('click', (e)=>{
      const expanded = servicesButton.getAttribute('aria-expanded') === 'true';
      servicesButton.setAttribute('aria-expanded', String(!expanded));
    });
  }

  // Touch/swipe support for mobile panel
  let startX = 0;
  let currentX = 0;
  let isDragging = false;

  mobilePanel.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    isDragging = true;
  });

  mobilePanel.addEventListener('touchmove', (e) => {
    if(!isDragging) return;
    currentX = e.touches[0].clientX;
    const diff = currentX - startX;
    if(diff < -50 && mobileOpen){ // Swipe left to close
      closeMobile();
      isDragging = false;
    }
  });

  mobilePanel.addEventListener('touchend', () => {
    isDragging = false;
  });

  // Initialize
  window.addEventListener('scroll', onScroll, {passive:true});
  onScroll();

  // Performance: Use Intersection Observer for scroll detection if supported
  if('IntersectionObserver' in window){
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if(entry.isIntersecting){
          header.classList.remove('scrolled');
        } else {
          header.classList.add('scrolled');
        }
      });
    }, {threshold: 0, rootMargin: '-80px 0px 0px 0px'});
    observer.observe(document.querySelector('main'));
  }
})();
