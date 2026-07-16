(function () {
  function initTaiMobileMenu() {
    var nav = document.getElementById('mainNav') || document.querySelector('nav');
    var button = document.getElementById('hamburger') || document.querySelector('.hamburger');
    var links = document.getElementById('navLinks') || (nav && nav.querySelector('.nav-links'));

    if (!nav || !button || !links || button.dataset.taiMobileReady === 'true') {
      return;
    }

    button.dataset.taiMobileReady = 'true';
    button.setAttribute('type', 'button');
    button.setAttribute('aria-label', 'Open navigation menu');
    button.setAttribute('aria-controls', links.id || 'navLinks');
    button.setAttribute('aria-expanded', 'false');

    if (!links.id) {
      links.id = 'navLinks';
    }

    var focusableSelector = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';
    var focusTimer = 0;
    var menuGuardsReady = false;

    function setOpen(open) {
      button.classList.toggle('open', open);
      button.classList.toggle('active', open);
      links.classList.toggle('open', open);
      links.classList.toggle('active', open);
      document.documentElement.classList.toggle('tai-mobile-menu-open', open);
      document.body.classList.toggle('tai-mobile-menu-open', open);
      document.body.style.overflow = open ? 'hidden' : '';
      button.setAttribute('aria-expanded', String(open));
      button.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');

      if (open) {
        window.clearTimeout(focusTimer);
        focusTimer = window.setTimeout(function () {
          if (!isOpen()) return;
          var first = links.querySelector('a');
          if (first) first.focus({ preventScroll: true });
        }, 180);
      } else {
        window.clearTimeout(focusTimer);
        // A menu close must always return keyboard focus to its controlling
        // button. This stays deterministic even when a deferred page script
        // moved focus while the opening transition was running.
        button.focus({ preventScroll: true });
      }
    }

    function isOpen() {
      return links.classList.contains('open') || links.classList.contains('active');
    }

    function spawnRipple(event) {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      var point = event.touches && event.touches[0] ? event.touches[0] : event;
      var ripple = document.createElement('span');
      ripple.className = 'tai-menu-ripple';
      ripple.style.left = point.clientX + 'px';
      ripple.style.top = point.clientY + 'px';
      document.body.appendChild(ripple);
      window.setTimeout(function () { ripple.remove(); }, 700);
    }

    function onGlobalKeydown(event) {
      if (!isOpen()) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        return;
      }

      if (event.key !== 'Tab') return;

      var focusables = Array.prototype.slice.call(links.querySelectorAll(focusableSelector));
      focusables.unshift(button);
      if (!focusables.length) return;

      var first = focusables[0];
      var last = focusables[focusables.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    function onDocumentClick(event) {
      if (!isOpen()) return;
      if (nav.contains(event.target) || links.contains(event.target)) return;
      setOpen(false);
    }

    function onResize() {
      if (window.innerWidth > 900 && isOpen()) {
        setOpen(false);
      }
    }

    function ensureMenuGuards() {
      if (menuGuardsReady) return;
      menuGuardsReady = true;

      links.addEventListener('click', function (event) {
        if (event.target.closest('a')) setOpen(false);
      });
      document.addEventListener('keydown', onGlobalKeydown);
      document.addEventListener('click', onDocumentClick);
      window.addEventListener('resize', onResize);
    }

    button.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === 'function') {
        event.stopImmediatePropagation();
      }
      spawnRipple(event);
      ensureMenuGuards();
      setOpen(!isOpen());
    }, true);

    button.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        ensureMenuGuards();
        setOpen(!isOpen());
      }
    }, true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTaiMobileMenu);
  } else {
    initTaiMobileMenu();
  }
})();
