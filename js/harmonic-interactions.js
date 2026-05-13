(() => {
  const doc = document;
  const root = doc.documentElement;
  const body = doc.body;

  if (!body || body.dataset.harmonicReady === 'true') return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  body.dataset.harmonicReady = 'true';
  root.classList.add('harmonic-ui');
  body.classList.add('harmonic-ready');

  const make = (className) => {
    const node = doc.createElement('span');
    node.className = className;
    node.setAttribute('aria-hidden', 'true');
    return node;
  };

  const field = make('harmonic-orbit-field');
  body.insertBefore(field, body.firstChild);

  const sectionSelector = [
    '.hero', '.page-hero', '.section-bg', '.timeline-section', '.gallery-section',
    '.connect-section', '.social-section', '.bio-section', 'footer', 'main#errorContent', 'main#main-content'
  ].join(',');

  const sections = Array.from(doc.querySelectorAll(sectionSelector));
  sections.forEach((section, index) => {
    section.classList.add('harmonic-section');
    if (!section.querySelector(':scope > .harmonic-section-grid')) {
      section.insertBefore(make('harmonic-section-grid'), section.firstChild);
    }
    if (!section.querySelector(':scope > .harmonic-geometry')) {
      const geometry = make(`harmonic-geometry harmonic-geo-${(index % 4) + 1}`);
      section.insertBefore(geometry, section.firstChild);
    }
  });

  const revealSelector = [
    '.hero-content', '.page-hero-content', '.about-grid', '.highlight-card', '.value-item',
    '.bio-section', '.timeline-category', '.gallery-label', '.cat-filters', '.connect-label',
    '.contact-form', '.social-card', '.info-card'
  ].join(',');

  const revealNodes = Array.from(doc.querySelectorAll(revealSelector));
  revealNodes.forEach((node, index) => {
    node.classList.add('harmonic-reveal');
    if (index < 2 || node.classList.contains('hero-content') || node.classList.contains('page-hero-content')) {
      node.dataset.harmonicImmediate = 'true';
    }
  });



  const keywordSelectors = [
    '.page-hero h1', '.gallery-label h2', '.connect-label h2', '.section-title',
    '.category-header h2', '.highlight-card h3', '.value-item h3', '.hero-cta',
    '.cat-tab', '.submit-btn'
  ].join(',');

  const keywordPattern = /([A-Za-z][A-Za-z'@&-]{5,}|Taiyzun|Sp@cE|HHK|M&M|I&T)/g;

  function decorateKeyText(node) {
    if (!node || node.dataset.harmonicKeywords === 'true') return;
    node.dataset.harmonicKeywords = 'true';

    const walker = doc.createTreeWalker(node, NodeFilter.SHOW_TEXT, {
      acceptNode(textNode) {
        if (!textNode.nodeValue || !keywordPattern.test(textNode.nodeValue)) {
          keywordPattern.lastIndex = 0;
          return NodeFilter.FILTER_REJECT;
        }
        keywordPattern.lastIndex = 0;
        if (textNode.parentElement && textNode.parentElement.closest('.harmonic-keyword')) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);

    textNodes.forEach((textNode) => {
      const fragment = doc.createDocumentFragment();
      const source = textNode.nodeValue;
      let lastIndex = 0;
      source.replace(keywordPattern, (match, _word, offset) => {
        if (offset > lastIndex) fragment.appendChild(doc.createTextNode(source.slice(lastIndex, offset)));
        const span = doc.createElement('span');
        span.className = 'harmonic-keyword';
        span.textContent = match;
        span.style.setProperty('--keyword-delay', `${((offset + match.length) % 9) * -0.42}s`);
        fragment.appendChild(span);
        lastIndex = offset + match.length;
        return match;
      });
      if (lastIndex < source.length) fragment.appendChild(doc.createTextNode(source.slice(lastIndex)));
      textNode.parentNode.replaceChild(fragment, textNode);
    });
  }

  doc.querySelectorAll(keywordSelectors).forEach(decorateKeyText);



  const blockThemeSelector = [
    '.hero-content', '.page-hero-content', '.about-grid', '.highlight-card', '.value-item',
    '.bio-section', '.timeline-category', '.gallery-label', '.connect-label',
    '.contact-form', '.social-card', '.info-card'
  ].join(',');

  const themeRules = [
    { theme: 'peace', pattern: /peace|peacekeeper|harmony|love|global|movement|billionaires/i },
    { theme: 'ceremony', pattern: /award|nobel|summit|conclave|laureate|felicitat|honou?r|justice/i },
    { theme: 'technology', pattern: /technology|information|digital|website|erp|sap|process|research|data|systems/i },
    { theme: 'art', pattern: /art|creative|portfolio|visual|design|storytelling|fashion|craft|gallery/i },
    { theme: 'values', pattern: /truth|sincerity|integrity|vision|purpose|authentic|principle/i },
    { theme: 'journey', pattern: /journey|role|career|education|exploration|founding|entrepreneur|media|current|recent/i },
    { theme: 'connect', pattern: /connect|contact|social|instagram|facebook|linkedin|youtube|threads|message|email/i },
    { theme: 'origin', pattern: /born|early|life|family|father|bombay|mumbai|india/i }
  ];

  function themeForText(text) {
    const clean = String(text || '').replace(/\s+/g, ' ').trim();
    const found = themeRules.find((rule) => rule.pattern.test(clean));
    return found ? found.theme : 'orbit';
  }

  function applyBlockThemes() {
    doc.querySelectorAll(blockThemeSelector).forEach((node, index) => {
      if (node.dataset.harmonicThemeReady !== 'true') {
        const theme = themeForText(node.textContent);
        node.dataset.harmonicThemeReady = 'true';
        node.dataset.harmonicTheme = theme;
        node.classList.add('harmonic-themed-block', `harmonic-theme-${theme}`);
        node.style.setProperty('--block-seed', String(index % 12));
        node.style.setProperty('--block-delay', `${(index % 8) * -0.37}s`);
      }

      if (!node.querySelector(':scope > .harmonic-block-motif')) {
        node.insertBefore(make('harmonic-block-motif'), node.firstChild);
      }
    });
  }

  applyBlockThemes();
  window.setTimeout(applyBlockThemes, 900);
  window.setTimeout(applyBlockThemes, 2400);

  if ('MutationObserver' in window) {
    const themeObserver = new MutationObserver((records) => {
      if (records.some((record) => record.addedNodes.length || record.removedNodes.length)) {
        window.requestAnimationFrame(applyBlockThemes);
      }
    });
    themeObserver.observe(body, { childList: true, subtree: true });
  }

  const interactiveSelector = [
    '.hero-content', '.page-hero-content', '.gallery-label', '.connect-label', '.contact-form',
    '.highlight-card', '.value-item', '.timeline-category', '.social-card', '.cat-tab',
    '.hero-cta', '.submit-btn', '.social-link', '.art-item', '.gallery-item'
  ].join(',');

  const interactiveNodes = Array.from(doc.querySelectorAll(interactiveSelector));

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-harmonic-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });

    revealNodes.forEach((node) => observer.observe(node));
  } else {
    revealNodes.forEach((node) => node.classList.add('is-harmonic-visible'));
  }

  if (!reduceMotion) {
    let pointerX = window.innerWidth / 2;
    let pointerY = window.innerHeight / 2;
    let pointerRaf = 0;
    let scrollRaf = 0;
    const geometries = Array.from(doc.querySelectorAll('.harmonic-geometry'));

    const updatePointer = () => {
      pointerRaf = 0;
      const xPct = (pointerX / Math.max(window.innerWidth, 1)) * 100;
      const yPct = (pointerY / Math.max(window.innerHeight, 1)) * 100;
      root.style.setProperty('--harmonic-pointer-x', `${xPct.toFixed(2)}%`);
      root.style.setProperty('--harmonic-pointer-y', `${yPct.toFixed(2)}%`);
      field.style.setProperty('--harmonic-field-x', `${((xPct - 50) * 0.08).toFixed(2)}px`);
      field.style.setProperty('--harmonic-field-y', `${((yPct - 50) * 0.08).toFixed(2)}px`);
      field.style.setProperty('--harmonic-field-rotate', `${((xPct - 50) * 0.006).toFixed(2)}deg`);
    };

    window.addEventListener('pointermove', (event) => {
      pointerX = event.clientX;
      pointerY = event.clientY;
      if (!pointerRaf) pointerRaf = window.requestAnimationFrame(updatePointer);
    }, { passive: true });

    interactiveNodes.forEach((node) => {
      node.addEventListener('pointermove', (event) => {
        const rect = node.getBoundingClientRect();
        const localX = ((event.clientX - rect.left) / Math.max(rect.width, 1)) * 100;
        const localY = ((event.clientY - rect.top) / Math.max(rect.height, 1)) * 100;
        node.style.setProperty('--harmonic-local-x', `${localX.toFixed(2)}%`);
        node.style.setProperty('--harmonic-local-y', `${localY.toFixed(2)}%`);
        node.classList.add('harmonic-hovering');
      }, { passive: true });
      node.addEventListener('pointerleave', () => {
        node.classList.remove('harmonic-hovering');
      });
    });

    const updateScroll = () => {
      scrollRaf = 0;
      const viewportMid = window.innerHeight / 2;
      geometries.forEach((geometry, index) => {
        const rect = geometry.parentElement.getBoundingClientRect();
        const center = rect.top + rect.height / 2;
        const distance = (center - viewportMid) / Math.max(window.innerHeight, 1);
        const speed = ((index % 5) + 2) * 10;
        const y = Math.max(-60, Math.min(60, -distance * speed));
        const rot = Math.max(-10, Math.min(10, distance * ((index % 2 ? -1 : 1) * 5)));
        geometry.style.setProperty('--harmonic-geo-y', `${y.toFixed(2)}px`);
        geometry.style.setProperty('--harmonic-geo-rot', `${rot.toFixed(2)}deg`);
      });
    };

    const requestScroll = () => {
      if (!scrollRaf) scrollRaf = window.requestAnimationFrame(updateScroll);
    };

    window.addEventListener('scroll', requestScroll, { passive: true });
    window.addEventListener('resize', requestScroll, { passive: true });
    updatePointer();
    updateScroll();
  } else {
    revealNodes.forEach((node) => node.classList.add('is-harmonic-visible'));
  }
})();
