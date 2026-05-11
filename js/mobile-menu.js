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
    var lastFocus = null;

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
        lastFocus = document.activeElement;
        window.setTimeout(function () {
          var first = links.querySelector('a');
          if (first) first.focus({ preventScroll: true });
        }, 180);
      } else if (lastFocus && typeof lastFocus.focus === 'function') {
        lastFocus.focus({ preventScroll: true });
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

    button.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === 'function') {
        event.stopImmediatePropagation();
      }
      spawnRipple(event);
      setOpen(!isOpen());
    }, true);

    button.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        setOpen(!isOpen());
      }
    }, true);

    links.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () { setOpen(false); });
    });

    document.addEventListener('keydown', function (event) {
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
    });

    document.addEventListener('click', function (event) {
      if (!isOpen()) return;
      if (nav.contains(event.target) || links.contains(event.target)) return;
      setOpen(false);
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth > 900 && isOpen()) {
        setOpen(false);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTaiMobileMenu);
  } else {
    initTaiMobileMenu();
  }
})();
