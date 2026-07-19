/* ── Config ── */
const GALLERY_MANIFEST_VERSION = '20260719-gallery-curation-v2';
const SHARE_ROUTE_PREFIX = '/creations/image/';
const GALLERY_INDEX_URL = `/assets/space-gallery-index.json?v=${GALLERY_MANIFEST_VERSION}`;
const siteMobileLite = Boolean(window.TAIYZUN_applyMobileLite?.());
const PAGE_SIZE = siteMobileLite ? 4 : 30;
const GRID_IMAGE_SIZES = '(max-width: 420px) calc(100vw - 2rem), (max-width: 768px) calc((100vw - 3rem) / 2), (max-width: 1180px) 220px, 260px';
const PLACEHOLDER_SRC = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
const supportsNativeLazy = 'loading' in HTMLImageElement.prototype;
const FALLBACK = [
  {full:'assets/Art/art_00001.jpg',thumb:'assets/Art/art_00001.jpg',cat:'Gallery',title:'0001 ~ Sp@cE Dragon Rides the Earth',sub:'Cosmic Fire Beyond the Gates'},
  {full:'assets/Art/art_00002.jpg',thumb:'assets/Art/art_00002.jpg',cat:'Gallery',title:'0002 ~ Sp@cE Chakra Grid Meditation',sub:'Sacred Geometry of Light'},
  {full:'assets/Art/art_00003.jpg',thumb:'assets/Art/art_00003.jpg',cat:'Gallery',title:'0003 ~ Taiyzun Molten Lava Mandala',sub:'Embers of the Inner Flame'},
  {full:'assets/Art/psy_art_euphoria.jpg',thumb:'assets/Art/psy_art_euphoria.jpg',cat:'Gallery',title:'0004 ~ @cE Ocelot Celestial Voyage',sub:'Planets Aligned by SpAcE'},
  {full:'assets/Art/flyers_and_covers_00001.jpg',thumb:'assets/Art/flyers_and_covers_00001.jpg',cat:'Gallery',title:'0005 ~ TimE Flyer Art Collective',sub:'Event Graphics Unleashed'},
  {full:'assets/Art/cd_designs_hypnotic_waveforms_front_n_back.jpg',thumb:'assets/Art/cd_designs_hypnotic_waveforms_front_n_back.jpg',cat:'Gallery',title:'0006 ~ Tai Hypnotic Waveforms Album',sub:'Sound Waves Made Visible'},
  {full:'assets/Art/psy_art_brain_space.jpg',thumb:'assets/Art/psy_art_brain_space.jpg',cat:'Gallery',title:'0007 ~ Pe@cE Brain Sp@cE Inferno',sub:'Neural Fire Logo Blaze'},
  {full:'https://assets.taiyzun.com/space-gallery/images/taiyzun-atelier-creations/commercial-la-senza-flying-love-4c7b05ac.webp',thumb:'https://assets.taiyzun.com/space-gallery/thumbs/taiyzun-atelier-creations/commercial-la-senza-flying-love-4c7b05ac.webp',cat:'Gallery',title:'0008 ~ Sp@cE La Senza Flying Love',sub:'Winged Hearts by STYLETEK'},
  {full:'assets/Art/misc_design_splash.jpg',thumb:'assets/Art/misc_design_splash.jpg',cat:'Gallery',title:'0009 ~ Sp@cE ShahryAr Midnight Respect',sub:'Quiet Reverence in Shadows'}
];

/* ── State ── */
let allItems = [], filteredItems = [], currentPage = 0, lbIdx = 0, lbOpen = false;
let lightboxReturnFocus = null;
let activeFilter = 'all';
let galleryCatalogReady = false;
let galleryLoadingMore = false;
let categoryMeta = [];
let categoryCounts = {};
let categoryItems = new Map();
let categoryLoadCursor = 0;
let shareStatusTimer = null;
let galleryAppendTimer = 0;
let galleryNextAppendAt = 0;
const galleryCountEl = document.getElementById('galleryCount');
const GALLERY_APPEND_SETTLE_MS = siteMobileLite ? 560 : 480;
const SENTINEL_PRELOAD_MARGIN = siteMobileLite ? 320 : 420;
const GALLERY_START_MARGIN = siteMobileLite ? '260px 0px' : '520px 0px';

function escapeHTML(v) {
  return String(v || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function titleFromImagePath(path) {
  const raw = String(path || '').split('/').pop() || '';
  const withoutQuery = raw.split('?')[0].split('#')[0];
  const withoutExt = withoutQuery.replace(/\.(?:jpe?g|png|webp|avif)$/i, '');
  try {
    return decodeURIComponent(withoutExt).replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  } catch (error) {
    return withoutExt.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  }
}

function displayCategory(cat) {
  if (cat === 'all') return 'All';
  return String(cat || '').replace(/^_+|_+$/g, '').replace(/_/g, ' ').trim();
}

function titleForItem(item) {
  return String(item.name || item.title || titleFromImagePath(item.full || item.thumb) || 'Untitled').replace(/_/g, ' ').trim();
}

function cleanImageId(value) {
  return String(value || '').trim().replace(/\.html?$/i, '').replace(/[^a-zA-Z0-9._~-]/g, '');
}

function imageIdFromUrl(value) {
  try {
    const parsed = new URL(value, window.location.href);
    return cleanImageId(parsed.pathname.split('/').pop().replace(/\.(?:webp|avif|jpe?g|png)$/i, ''));
  } catch (error) {
    return cleanImageId(String(value || '').split('/').pop().split('?')[0].replace(/\.(?:webp|avif|jpe?g|png)$/i, ''));
  }
}

function normalizeGalleryItem(item, cat) {
  const normalized = {
    full: item.full,
    thumb: item.thumb || item.full,
    cat,
    title: titleForItem(item),
    sub: displayCategory(cat)
  };
  normalized.id = cleanImageId(item.id) || imageIdFromUrl(normalized.full || normalized.thumb || normalized.title);
  return normalized;
}

function getRequestedImageId() {
  const params = new URLSearchParams(window.location.search);
  const queryId = params.get('image') || params.get('creation');
  if (queryId) return cleanImageId(queryId);
  const hashMatch = decodeURIComponent(window.location.hash || '').match(/(?:image|creation)=([^&]+)/i);
  return hashMatch ? cleanImageId(hashMatch[1]) : '';
}

function getRequestedCategory() {
  const params = new URLSearchParams(window.location.search);
  return params.get('cat') || params.get('category') || '';
}

function sharePageUrlForItem(item) {
  return `${window.location.origin}${SHARE_ROUTE_PREFIX}${encodeURIComponent(item.id)}`;
}

function galleryUrlForItem(item) {
  const params = new URLSearchParams({ image: item.id });
  if (item.cat) params.set('cat', item.cat);
  return `${window.location.origin}/creations?${params.toString()}`;
}

function setImageUrl(item, mode = 'replace') {
  if (!item || !item.id || !window.history?.[`${mode}State`]) return;
  const url = new URL(window.location.href);
  url.pathname = '/creations';
  url.search = '';
  url.searchParams.set('image', item.id);
  if (item.cat) url.searchParams.set('cat', item.cat);
  url.hash = '';
  window.history[`${mode}State`]({ image: item.id }, '', url);
}

function clearImageUrl(mode = 'push') {
  if (!window.history?.[`${mode}State`]) return;
  const url = new URL(window.location.href);
  url.pathname = '/creations';
  url.searchParams.delete('image');
  url.searchParams.delete('creation');
  url.searchParams.delete('cat');
  url.searchParams.delete('category');
  url.hash = '';
  window.history[`${mode}State`]({}, '', url);
}

function isPublicGalleryItem(item) {
  return item.public !== false && item.private !== true && item.hidden !== true;
}

async function fetchJson(url) {
  const res = await fetch(url, { cache: 'force-cache' });
  if (!res.ok) throw new Error(`Unable to load ${url}`);
  return res.json();
}

function rebuildAllItems() {
  allItems = [];
  categoryMeta.forEach(meta => {
    const items = categoryItems.get(meta.key);
    if (items?.length) allItems.push(...items);
  });
}

function activeTotalFor(filter = activeFilter) {
  if (filter === 'all') {
    return categoryMeta.reduce((sum, meta) => sum + (categoryCounts[meta.key] || 0), 0) || allItems.length;
  }
  return categoryCounts[filter] || categoryItems.get(filter)?.length || 0;
}

function itemsForFilter(filter = activeFilter) {
  return filter === 'all' ? allItems : (categoryItems.get(filter) || []);
}

function categoryMetaFor(key) {
  return categoryMeta.find(meta => meta.key === key);
}

async function loadCategoryChunk(key) {
  if (categoryItems.has(key)) return categoryItems.get(key);
  const meta = categoryMetaFor(key);
  if (!meta?.path) return [];

  const entries = await fetchJson(`${meta.path}?v=${GALLERY_MANIFEST_VERSION}`);
  const items = (Array.isArray(entries) ? entries : [])
    .filter(isPublicGalleryItem)
    .map(item => normalizeGalleryItem(item, key));
  categoryItems.set(key, items);
  categoryCounts[key] = items.length;
  rebuildAllItems();
  return items;
}

async function ensureItemsForFilter(filter = activeFilter, minCount = PAGE_SIZE) {
  if (!galleryCatalogReady) return;

  if (filter !== 'all') {
    await loadCategoryChunk(filter);
    filteredItems = itemsForFilter(filter);
    return;
  }

  while (allItems.length < minCount && categoryLoadCursor < categoryMeta.length) {
    const meta = categoryMeta[categoryLoadCursor++];
    await loadCategoryChunk(meta.key);
  }
  filteredItems = allItems;
}

async function loadChunkedCatalog() {
  const index = await fetchJson(GALLERY_INDEX_URL);
  if (!Array.isArray(index.categories) || !index.categories.length) throw new Error('empty chunk index');

  categoryMeta = index.categories
    .filter(meta => meta?.key && meta?.path)
    .map(meta => ({
      key: meta.key,
      path: meta.path,
      displayCategory: meta.displayCategory || displayCategory(meta.key),
      count: Number(meta.count) || 0
    }));
  if (!categoryMeta.length) throw new Error('empty category metadata');

  categoryCounts = Object.fromEntries(categoryMeta.map(meta => [meta.key, meta.count]));
  categoryItems = new Map();
  categoryLoadCursor = 0;
  galleryCatalogReady = true;
  buildFilters([...categoryMeta.map(meta => meta.key), 'all'], categoryCounts);
}

/* ── Observers ── */
const imgObs = supportsNativeLazy ? null : new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting && e.target.dataset.src) { e.target.src = e.target.dataset.src; imgObs.unobserve(e.target); } });
}, { rootMargin: siteMobileLite ? '220px' : '360px' });

const revealObs = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: 0.04, rootMargin: '0px 0px -20px 0px' });

const sentinelObs = new IntersectionObserver(entries => {
  if (entries[0]?.isIntersecting) scheduleAppendBatch();
}, { rootMargin: `${SENTINEL_PRELOAD_MARGIN}px` });

function sentinelIsNearViewport() {
  const sentinel = document.getElementById('gridSentinel');
  if (!sentinel) return false;
  const rect = sentinel.getBoundingClientRect();
  return rect.top < window.innerHeight + SENTINEL_PRELOAD_MARGIN && rect.bottom > -SENTINEL_PRELOAD_MARGIN;
}

function scheduleAppendBatch() {
  if (galleryLoadingMore || !galleryCatalogReady) return;
  window.clearTimeout(galleryAppendTimer);
  const delay = Math.max(0, galleryNextAppendAt - performance.now());
  galleryAppendTimer = window.setTimeout(() => {
    galleryAppendTimer = 0;
    if (!sentinelIsNearViewport()) return;
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => {
        if (sentinelIsNearViewport()) void appendBatch();
      }, { timeout: siteMobileLite ? 1400 : 900 });
    } else {
      window.setTimeout(() => {
        if (sentinelIsNearViewport()) void appendBatch();
      }, siteMobileLite ? 90 : 0);
    }
  }, delay);
}

/* ── Init ── */
async function init() {
  showLoading();
  try {
    await loadChunkedCatalog();
  } catch (e) {
    categoryMeta = [{ key: 'Gallery', path: '', displayCategory: 'Gallery', count: FALLBACK.length }];
    categoryCounts = { Gallery: FALLBACK.length };
    categoryItems = new Map([['Gallery', FALLBACK.map(item => normalizeGalleryItem(item, item.cat || 'Gallery'))]]);
    categoryLoadCursor = categoryMeta.length;
    galleryCatalogReady = true;
    rebuildAllItems();
    buildFilters(['Gallery', 'all'], categoryCounts);
  }
  hideLoading();
  await renderGrid('all');
  await openRequestedImage();
}

function showLoading() {
  document.getElementById('artGrid').innerHTML = '<div class="gallery-loading"><div class="gallery-spinner"></div><span>Loading Gallery</span></div>';
}
function hideLoading() {
  const l = document.querySelector('.gallery-loading');
  if (l) l.remove();
}

/* ── Filters ── */
function buildFilters(cats, counts = {}) {
  const c = document.getElementById('catFilters');
  c.innerHTML = '';
  const orderedCats = [...new Set(cats.filter(cat => cat && cat !== 'all'))];
  if (counts.mEmEs && !orderedCats.includes('mEmEs')) orderedCats.push('mEmEs');
  orderedCats.push('all');
  orderedCats.forEach(cat => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cat-tab' + (cat === 'all' ? ' active' : '');
    btn.dataset.cat = cat;
    btn.setAttribute('aria-pressed', cat === 'all' ? 'true' : 'false');
    const count = cat === 'all' ? activeTotalFor('all') : (counts[cat] || 0);
    btn.textContent = `${displayCategory(cat)} (${count})`;
    btn.addEventListener('click', async () => {
      document.querySelectorAll('.cat-tab').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-pressed', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
      await renderGrid(cat);
    });
    c.appendChild(btn);
  });
}

/* ── Grid ── */
async function renderGrid(filter) {
  activeFilter = filter || 'all';
  const activeTotal = activeTotalFor(activeFilter);
  if (galleryCountEl) galleryCountEl.textContent = `${activeTotal.toLocaleString()} Works in View`;
  currentPage = 0;
  const grid = document.getElementById('artGrid');
  grid.setAttribute('aria-busy', 'true');
  grid.innerHTML = '';
  window.clearTimeout(galleryAppendTimer);
  galleryAppendTimer = 0;
  galleryNextAppendAt = performance.now();
  if (!activeTotal) {
    grid.innerHTML = '<div class="gallery-empty">No Images in This Category Yet.</div>';
    grid.setAttribute('aria-busy', 'false');
    return;
  }
  try {
    await ensureItemsForFilter(activeFilter, PAGE_SIZE);
    filteredItems = itemsForFilter(activeFilter);
    await appendBatch();
  } finally {
    grid.setAttribute('aria-busy', 'false');
  }
}

async function appendBatch() {
  if (galleryLoadingMore) return;
  galleryLoadingMore = true;
  try {
    filteredItems = itemsForFilter(activeFilter);
    const activeTotal = activeTotalFor(activeFilter);
    const start = currentPage * PAGE_SIZE;
    if (start >= activeTotal) return;
    if (start + PAGE_SIZE > filteredItems.length && filteredItems.length < activeTotal) {
      await ensureItemsForFilter(activeFilter, start + PAGE_SIZE);
      filteredItems = itemsForFilter(activeFilter);
    }
    if (start >= filteredItems.length) return;
    const end = Math.min(start + PAGE_SIZE, filteredItems.length);
    const grid = document.getElementById('artGrid');
    const oldSentinel = document.getElementById('gridSentinel');
    if (oldSentinel) { sentinelObs.unobserve(oldSentinel); oldSentinel.remove(); }
    const fragment = document.createDocumentFragment();
    const pendingImages = [];
    const pendingRevealItems = [];
    for (let i = start; i < end; i++) {
      const item = filteredItems[i];
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'art-item reveal';
      el.dataset.index = i;
      const t = escapeHTML(item.title);
      const s = escapeHTML(item.sub);
      const thumb = escapeHTML(item.thumb);
      const prioritySlots = siteMobileLite ? 2 : 6;
      const priorityImage = currentPage === 0 && i < start + prioritySlots;
      const loadingMode = priorityImage ? 'eager' : 'lazy';
      const fetchPriority = priorityImage ? 'high' : 'low';
      const sourceAttrs = supportsNativeLazy ? `src="${thumb}"` : `data-src="${thumb}" src="${PLACEHOLDER_SRC}"`;
      const titleId = `creation-title-${i}`;
      const subId = `creation-sub-${i}`;
      el.innerHTML = `<img ${sourceAttrs} alt="" width="360" height="360" sizes="${GRID_IMAGE_SIZES}" loading="${loadingMode}" decoding="async" fetchpriority="${fetchPriority}"><div class="overlay"><span class="sparkle">✦</span><h3 id="${titleId}">${t}</h3><p id="${subId}">${s}</p></div>`;
      el.addEventListener('click', () => openLB(i, { opener: el }));
      fragment.appendChild(el);
      pendingImages.push(el.querySelector('img'));
      pendingRevealItems.push(el);
    }
    grid.appendChild(fragment);
    pendingImages.forEach(img => { if (img && imgObs) imgObs.observe(img); });
    pendingRevealItems.forEach(el => revealObs.observe(el));
    currentPage++;
    if (currentPage * PAGE_SIZE < activeTotal) {
      const sentinel = document.createElement('div');
      sentinel.id = 'gridSentinel';
      sentinel.style.cssText = 'height:2px;';
      grid.appendChild(sentinel);
      window.requestAnimationFrame(() => sentinelObs.observe(sentinel));
    }
  } finally {
    galleryNextAppendAt = performance.now() + GALLERY_APPEND_SETTLE_MS;
    galleryLoadingMore = false;
  }
}

/* ── Lightbox ── */
const lb         = document.getElementById('lightbox');
const lbImg      = document.getElementById('lbImg');
const lbCounter  = document.getElementById('lbCounter');
const lbTotal    = document.getElementById('lbTotal');
const lbCat      = document.getElementById('lbCat');
const lbTitle    = document.getElementById('lbTitle');
const lbSub      = document.getElementById('lbSub');
const lbPrevBtn  = document.getElementById('lbPrev');
const lbNextBtn  = document.getElementById('lbNext');
const lbCloseBtn = document.getElementById('lbClose');
const lbShareBtn = document.getElementById('lbShare');
const lbZoomOutBtn = document.getElementById('lbZoomOut');
const lbResetBtn = document.getElementById('lbReset');
const lbZoomInBtn = document.getElementById('lbZoomIn');
const lbFullscreenBtn = document.getElementById('lbFullscreen');
const lbShareStatus = document.getElementById('lbShareStatus');
const lbFilmstrip = document.getElementById('lbFilmstrip');
const lbFilmstripWrap = lbFilmstrip?.parentElement;
const lbProgressBar = document.getElementById('lbProgressBar');
const lbMain     = document.getElementById('lbMain');
const lbImgWrap  = document.getElementById('lbImgWrap');
let lightboxGestures = null;

function setShareStatus(message) {
  if (!lbShareStatus) return;
  window.clearTimeout(shareStatusTimer);
  lbShareStatus.textContent = message || '';
  if (message) {
    shareStatusTimer = window.setTimeout(() => {
      lbShareStatus.textContent = '';
    }, 1800);
  }
}

function updateShareButton(item) {
  if (!lbShareBtn || !item) return;
  lbShareBtn.dataset.shareUrl = sharePageUrlForItem(item);
  lbShareBtn.title = `Share ${item.title || 'image'}`;
  lbShareBtn.setAttribute('aria-label', `Share ${item.title || 'image'}`);
}

function prepareActiveLightboxImage() {
  lbImg.loading = 'eager';
  lbImg.decoding = 'async';
  lbImg.fetchPriority = 'high';
}

function syncViewerControls(scale = Number(lbImgWrap?.dataset.zoomScale || 1)) {
  const zoomScale = Number.isFinite(scale) ? scale : 1;
  const atMinimum = zoomScale <= 1.01;
  const atMaximum = zoomScale >= 3.99;
  if (lbZoomOutBtn) lbZoomOutBtn.disabled = atMinimum;
  if (lbResetBtn) lbResetBtn.disabled = atMinimum;
  if (lbZoomInBtn) lbZoomInBtn.disabled = atMaximum;
  if (lbResetBtn) {
    lbResetBtn.textContent = `${zoomScale.toFixed(zoomScale % 1 ? 1 : 0)}×`;
    lbResetBtn.setAttribute('aria-label', `Reset zoom, currently ${zoomScale.toFixed(1)} times`);
  }
}

function syncNavigationControls() {
  const disabled = activeTotalFor(activeFilter) < 2;
  [lbPrevBtn, lbNextBtn].forEach(button => {
    if (!button) return;
    button.disabled = disabled;
    button.setAttribute('aria-disabled', String(disabled));
  });
}

function preloadLightboxImage(item) {
  if (!item?.full) return;
  const img = new Image();
  img.decoding = 'async';
  img.fetchPriority = 'low';
  img.src = item.full;
}

function scheduleAdjacentLightboxPreload() {
  if (!lbOpen) return;
  const total = activeTotalFor(activeFilter);
  if (total < 2) return;
  const offsets = siteMobileLite ? [1] : [1, -1];
  const run = async () => {
    for (const offset of offsets) {
      const index = (lbIdx + offset + total) % total;
      if (!await ensureLightboxIndex(index)) continue;
      const item = itemsForFilter(activeFilter)[index];
      preloadLightboxImage(item);
    }
  };
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(run, { timeout: siteMobileLite ? 1800 : 1200 });
  } else {
    window.setTimeout(run, siteMobileLite ? 360 : 140);
  }
}

async function copyToClipboard(value) {
  if (navigator.clipboard?.writeText) {
    try {
      await Promise.race([
        navigator.clipboard.writeText(value),
        new Promise((_, reject) => window.setTimeout(() => reject(new Error('Clipboard timed out.')), 700))
      ]);
      return;
    } catch (error) {
      // Fall through to the textarea copy path for browsers with stricter permissions.
    }
  }
  const input = document.createElement('textarea');
  input.value = value;
  input.setAttribute('readonly', '');
  input.style.cssText = 'position:fixed;left:-9999px;top:0;';
  document.body.appendChild(input);
  input.select();
  const copied = document.execCommand('copy');
  input.remove();
  if (!copied) throw new Error('Unable to copy share link.');
}

async function shareCurrentImage() {
  const item = filteredItems[lbIdx];
  if (!item) return;
  const url = sharePageUrlForItem(item);
  const payload = {
    title: item.title || 'Taiyzun Creation',
    text: `${item.title || 'Taiyzun Creation'} | ${displayCategory(item.cat || '')}`,
    url
  };
  try {
    const canUseNativeShare =
      navigator.share &&
      navigator.maxTouchPoints > 0 &&
      window.matchMedia?.('(pointer: coarse)').matches &&
      /\b(Android|iPhone|iPad|iPod)\b/i.test(navigator.userAgent);
    if (canUseNativeShare) {
      await navigator.share(payload);
      setShareStatus('Shared');
    } else {
      await copyToClipboard(url);
      setShareStatus('Link Copied');
    }
  } catch (error) {
    if (error?.name === 'AbortError') return;
    try {
      await copyToClipboard(url);
      setShareStatus('Link Copied');
    } catch (copyError) {
      setShareStatus('Link Ready');
    }
  }
}

function createLightboxGestureController({ wrap, image, previous, next, onZoomChange = () => {} }) {
  const MAX_SCALE = 4;
  const DOUBLE_TAP_MS = 280;
  const TAP_MOVE_PX = 14;
  const SWIPE_PX = 48;
  const state = {
    scale: 1,
    x: 0,
    y: 0,
    startScale: 1,
    startX: 0,
    startY: 0,
    startDistance: 0,
    startMid: null,
    touchStart: null,
    dragging: false,
    pinching: false,
    pointerStart: null,
    lastTapAt: 0,
    lastTapX: 0,
    lastTapY: 0
  };
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const isZoomed = () => state.scale > 1.01;
  const relativePoint = (clientX, clientY) => {
    const rect = wrap.getBoundingClientRect();
    return {
      x: clientX - rect.left - rect.width / 2,
      y: clientY - rect.top - rect.height / 2
    };
  };
  const distance = (touches) => Math.hypot(
    touches[0].clientX - touches[1].clientX,
    touches[0].clientY - touches[1].clientY
  );
  const midpoint = (touches) => relativePoint(
    (touches[0].clientX + touches[1].clientX) / 2,
    (touches[0].clientY + touches[1].clientY) / 2
  );
  function clampPan() {
    if (!isZoomed()) {
      state.scale = 1;
      state.x = 0;
      state.y = 0;
      return;
    }
    const rect = wrap.getBoundingClientRect();
    const width = Math.max(image.offsetWidth || rect.width, 1);
    const height = Math.max(image.offsetHeight || rect.height, 1);
    const maxX = Math.max(0, (width * state.scale - rect.width) / 2);
    const maxY = Math.max(0, (height * state.scale - rect.height) / 2);
    state.x = clamp(state.x, -maxX, maxX);
    state.y = clamp(state.y, -maxY, maxY);
  }
  function apply({ animate = true } = {}) {
    clampPan();
    const zoomed = isZoomed();
    wrap.classList.toggle('is-zoomed', zoomed);
    image.classList.toggle('zoomed', zoomed);
    wrap.dataset.zoomScale = zoomed ? state.scale.toFixed(2) : '1.00';
    if (!zoomed) {
      image.style.transform = '';
      image.style.transition = '';
      wrap.classList.remove('is-dragging', 'is-pinching');
      onZoomChange(1);
      return;
    }
    image.style.transition = animate ? 'transform 180ms cubic-bezier(0.16, 1, 0.3, 1)' : 'none';
    image.style.transform = `translate3d(${state.x.toFixed(1)}px, ${state.y.toFixed(1)}px, 0) scale(${state.scale.toFixed(4)})`;
    onZoomChange(state.scale);
  }
  function reset() {
    state.scale = 1;
    state.x = 0;
    state.y = 0;
    state.touchStart = null;
    state.dragging = false;
    state.pinching = false;
    state.pointerStart = null;
    wrap.classList.remove('is-zoomed', 'is-dragging', 'is-pinching');
    wrap.dataset.zoomScale = '1.00';
    image.classList.remove('zoomed');
    image.style.transform = '';
    image.style.transition = '';
    onZoomChange(1);
  }
  function zoomAt(nextScale, clientX, clientY, animate = true) {
    const oldScale = Math.max(state.scale, 1);
    const target = clamp(nextScale, 1, MAX_SCALE);
    if (target <= 1.01) {
      reset();
      return;
    }
    const point = relativePoint(clientX, clientY);
    const ratio = target / oldScale;
    state.x = point.x - (point.x - state.x) * ratio;
    state.y = point.y - (point.y - state.y) * ratio;
    state.scale = target;
    apply({ animate });
  }
  function toggleZoom(clientX, clientY) {
    zoomAt(isZoomed() ? 1 : 2.6, clientX, clientY, true);
  }
  function zoomBy(delta) {
    const rect = wrap.getBoundingClientRect();
    zoomAt(state.scale + delta, rect.left + rect.width / 2, rect.top + rect.height / 2, true);
  }
  function rememberTouchStart(touch) {
    state.touchStart = {
      x: touch.clientX,
      y: touch.clientY,
      panX: state.x,
      panY: state.y,
      time: Date.now()
    };
  }
  function handleTap(touch, event) {
    if (!state.touchStart) return false;
    const moved = Math.hypot(touch.clientX - state.touchStart.x, touch.clientY - state.touchStart.y);
    if (moved > TAP_MOVE_PX) {
      state.lastTapAt = 0;
      return false;
    }
    const now = Date.now();
    const nearLastTap = Math.hypot(touch.clientX - state.lastTapX, touch.clientY - state.lastTapY) < 36;
    if (now - state.lastTapAt < DOUBLE_TAP_MS && nearLastTap) {
      event.preventDefault();
      state.lastTapAt = 0;
      toggleZoom(touch.clientX, touch.clientY);
      return true;
    }
    state.lastTapAt = now;
    state.lastTapX = touch.clientX;
    state.lastTapY = touch.clientY;
    return false;
  }
  wrap.addEventListener('touchstart', event => {
    if (event.touches.length === 2) {
      event.preventDefault();
      state.pinching = true;
      state.dragging = false;
      state.startScale = state.scale;
      state.startX = state.x;
      state.startY = state.y;
      state.startDistance = Math.max(distance(event.touches), 1);
      state.startMid = midpoint(event.touches);
      wrap.classList.add('is-pinching');
      wrap.classList.remove('is-dragging');
      return;
    }
    if (event.touches.length === 1) {
      rememberTouchStart(event.touches[0]);
      state.dragging = isZoomed();
      wrap.classList.toggle('is-dragging', state.dragging);
    }
  }, { passive: false });
  wrap.addEventListener('touchmove', event => {
    if (event.touches.length === 2) {
      event.preventDefault();
      if (!state.pinching) {
        state.pinching = true;
        state.startScale = state.scale;
        state.startX = state.x;
        state.startY = state.y;
        state.startDistance = Math.max(distance(event.touches), 1);
        state.startMid = midpoint(event.touches);
        wrap.classList.add('is-pinching');
      }
      const mid = midpoint(event.touches);
      const nextScale = clamp(state.startScale * (distance(event.touches) / state.startDistance), 1, MAX_SCALE);
      const ratio = nextScale / Math.max(state.startScale, 1);
      state.scale = nextScale;
      state.x = mid.x - (state.startMid.x - state.startX) * ratio;
      state.y = mid.y - (state.startMid.y - state.startY) * ratio;
      apply({ animate: false });
      return;
    }
    if (event.touches.length === 1 && isZoomed()) {
      event.preventDefault();
      if (!state.touchStart) rememberTouchStart(event.touches[0]);
      state.dragging = true;
      wrap.classList.add('is-dragging');
      state.x = state.touchStart.panX + event.touches[0].clientX - state.touchStart.x;
      state.y = state.touchStart.panY + event.touches[0].clientY - state.touchStart.y;
      apply({ animate: false });
    }
  }, { passive: false });
  wrap.addEventListener('touchend', event => {
    const touch = event.changedTouches[0];
    if (state.pinching) {
      event.preventDefault();
      state.pinching = false;
      wrap.classList.remove('is-pinching');
      if (event.touches.length === 1) {
        rememberTouchStart(event.touches[0]);
        state.dragging = isZoomed();
        wrap.classList.toggle('is-dragging', state.dragging);
      } else {
        state.dragging = false;
        wrap.classList.remove('is-dragging');
        apply({ animate: true });
      }
      return;
    }
    const usedTap = touch ? handleTap(touch, event) : false;
    if (isZoomed()) {
      state.dragging = false;
      wrap.classList.remove('is-dragging');
      if (!usedTap) apply({ animate: true });
      return;
    }
    if (!usedTap && touch && state.touchStart) {
      const dx = state.touchStart.x - touch.clientX;
      const dy = state.touchStart.y - touch.clientY;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > SWIPE_PX) {
        event.preventDefault();
        if (dx > 0) next();
        else previous();
      }
    }
  }, { passive: false });
  wrap.addEventListener('touchcancel', () => {
    state.dragging = false;
    state.pinching = false;
    state.touchStart = null;
    wrap.classList.remove('is-dragging', 'is-pinching');
    apply({ animate: true });
  });
  wrap.addEventListener('dblclick', event => {
    event.preventDefault();
    event.stopPropagation();
    toggleZoom(event.clientX, event.clientY);
  });
  wrap.addEventListener('pointerdown', event => {
    if (event.pointerType === 'touch' || !isZoomed()) return;
    event.preventDefault();
    state.pointerStart = { id: event.pointerId, x: event.clientX, y: event.clientY, panX: state.x, panY: state.y };
    state.dragging = true;
    wrap.classList.add('is-dragging');
    wrap.setPointerCapture?.(event.pointerId);
  });
  wrap.addEventListener('pointermove', event => {
    if (!state.pointerStart || state.pointerStart.id !== event.pointerId || !isZoomed()) return;
    event.preventDefault();
    state.x = state.pointerStart.panX + event.clientX - state.pointerStart.x;
    state.y = state.pointerStart.panY + event.clientY - state.pointerStart.y;
    apply({ animate: false });
  });
  const endPointer = event => {
    if (!state.pointerStart || state.pointerStart.id !== event.pointerId) return;
    state.pointerStart = null;
    state.dragging = false;
    wrap.classList.remove('is-dragging');
    apply({ animate: true });
  };
  wrap.addEventListener('pointerup', endPointer);
  wrap.addEventListener('pointercancel', endPointer);
  image.addEventListener('dragstart', event => event.preventDefault());
  return {
    reset,
    isZoomed,
    getScale: () => state.scale,
    zoomIn: () => zoomBy(0.5),
    zoomOut: () => zoomBy(-0.5)
  };
}

function syncFullscreenControl() {
  if (!lbFullscreenBtn) return;
  const supported = Boolean(document.fullscreenEnabled && lb?.requestFullscreen);
  const active = document.fullscreenElement === lb;
  lbFullscreenBtn.disabled = !supported;
  lbFullscreenBtn.setAttribute('aria-pressed', String(active));
  lbFullscreenBtn.setAttribute('aria-label', active ? 'Exit fullscreen' : 'Enter fullscreen');
  lbFullscreenBtn.title = active ? 'Exit fullscreen' : 'Fullscreen';
}

async function toggleLightboxFullscreen() {
  if (!document.fullscreenEnabled || !lb?.requestFullscreen) return;
  try {
    if (document.fullscreenElement === lb) await document.exitFullscreen();
    else await lb.requestFullscreen({ navigationUI: 'hide' });
  } catch (error) {
    setShareStatus('Fullscreen Unavailable');
  }
}

function openLB(i, options = {}) {
  lightboxReturnFocus = options.opener || (document.activeElement !== document.body ? document.activeElement : null);
  lbIdx = i; lbOpen = true;
  lbTotal.textContent = String(activeTotalFor(activeFilter)).padStart(2, '0');
  buildFilmstrip();
  const historyMode = Object.prototype.hasOwnProperty.call(options, 'historyMode') ? options.historyMode : 'push';
  loadLBImage(i, 'enter', historyMode);
  lb.classList.add('open');
  document.documentElement.classList.add('tai-lightbox-open');
  document.body.classList.add('tai-lightbox-open');
  document.body.style.overflow = 'hidden';
  lb.setAttribute('aria-hidden', 'false');
  syncViewerControls(1);
  syncFullscreenControl();
  window.requestAnimationFrame(() => lbCloseBtn.focus({ preventScroll: true }));
}
function closeLB(options = {}) {
  const restoreTarget = lightboxReturnFocus;
  lightboxReturnFocus = null;
  lightboxGestures?.reset();
  lb.classList.remove('open');
  document.documentElement.classList.remove('tai-lightbox-open');
  document.body.classList.remove('tai-lightbox-open');
  document.body.style.overflow = '';
  lbOpen = false;
  lb.setAttribute('aria-hidden', 'true');
  lbImg.className = '';
  setShareStatus('');
  if (options.clearUrl !== false) clearImageUrl(options.historyMode || 'push');
  if (restoreTarget?.isConnected) restoreTarget.focus({ preventScroll: true });
}
function loadLBImage(i, dir, historyMode = 'replace') {
  lbIdx = i;
  filteredItems = itemsForFilter(activeFilter);
  const item = filteredItems[i];
  if (!item) return;
  lightboxGestures?.reset();
  lbCounter.textContent = String(i + 1).padStart(2, '0');
  lbCat.textContent = displayCategory(item.cat || '');
  lbTitle.textContent = item.title || '';
  lbSub.textContent = item.sub || '';
  lbTotal.textContent = String(activeTotalFor(activeFilter)).padStart(2, '0');
  lbProgressBar.style.width = ((i + 1) / activeTotalFor(activeFilter) * 100) + '%';
  syncNavigationControls();
  updateFilmstrip(i);
  lbImgWrap.classList.add('is-loading');
  lbImgWrap.classList.remove('is-error');
  lbImg.className = '';
  void lbImg.offsetWidth;
  let triedFallback = false;
  lbImg.onerror = () => {
    if (!triedFallback && item.thumb && item.thumb !== item.full) {
      triedFallback = true;
      lbImg.src = item.thumb;
      return;
    }
    lbImg.onerror = null;
    lbImgWrap.classList.remove('is-loading');
    lbImgWrap.classList.add('is-error');
    setShareStatus('Preview unavailable');
  };
  prepareActiveLightboxImage();
  lbImg.src = item.full;
  lbImg.alt = item.title || '';
  const ac = dir === 'enter' ? 'lb-anim-enter' : dir === 'next' ? 'lb-anim-next' : 'lb-anim-prev';
  lbImg.classList.add(ac);
  updateShareButton(item);
  if (historyMode) setImageUrl(item, historyMode);
}
function buildFilmstrip() {
  lbFilmstrip.innerHTML = '';
  filteredItems = itemsForFilter(activeFilter);
  const total = filteredItems.length;
  const WIN = Math.min(total, siteMobileLite ? 18 : 50);
  const half = Math.floor(WIN / 2);
  const start = Math.max(0, Math.min(lbIdx - half, total - WIN));
  for (let i = start; i < start + WIN; i++) {
    const item = filteredItems[i];
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'lb-thumb-button' + (i === lbIdx ? ' active' : '');
    button.dataset.idx = i;
    button.setAttribute('aria-label', `View image ${i + 1}: ${item.title || 'Untitled'}`);
    button.setAttribute('aria-pressed', String(i === lbIdx));
    if (i === lbIdx) button.setAttribute('aria-current', 'true');
    const img = document.createElement('img');
    img.src = item.thumb;
    img.loading = 'lazy';
    img.decoding = 'async';
    img.fetchPriority = 'low';
    img.width = 72;
    img.height = 72;
    img.className = 'lb-thumb';
    img.alt = '';
    img.addEventListener('error', () => {
      button.classList.add('is-error');
      img.removeAttribute('src');
    }, { once: true });
    button.addEventListener('click', () => loadLBImage(i, i > lbIdx ? 'next' : 'prev'));
    button.appendChild(img);
    lbFilmstrip.appendChild(button);
  }
}
function updateFilmstrip(i) {
  const thumbs = lbFilmstrip.querySelectorAll('.lb-thumb-button');
  let found = false;
  thumbs.forEach(t => {
    const idx = parseInt(t.dataset.idx);
    const active = idx === i;
    t.classList.toggle('active', active);
    t.setAttribute('aria-pressed', String(active));
    if (active) t.setAttribute('aria-current', 'true');
    else t.removeAttribute('aria-current');
    if (idx === i) { t.scrollIntoView({ inline: 'center', behavior: 'smooth', block: 'nearest' }); found = true; }
  });
  if (!found) buildFilmstrip();
}

async function ensureLightboxIndex(index) {
  if (index < 0) return false;
  filteredItems = itemsForFilter(activeFilter);
  if (index < filteredItems.length) return true;
  await ensureItemsForFilter(activeFilter, index + 1);
  filteredItems = itemsForFilter(activeFilter);
  return index < filteredItems.length;
}

async function showPreviousImage() {
  const total = activeTotalFor(activeFilter);
  if (!total) return;
  const n = (lbIdx - 1 + total) % total;
  if (!await ensureLightboxIndex(n)) return;
  loadLBImage(n, 'prev');
}

async function showNextImage() {
  const total = activeTotalFor(activeFilter);
  if (!total) return;
  const n = (lbIdx + 1) % total;
  if (!await ensureLightboxIndex(n)) return;
  loadLBImage(n, 'next');
}

async function findRequestedImageIndex(requestedId) {
  filteredItems = allItems;
  let index = allItems.findIndex(item => item.id === requestedId);
  if (index >= 0) return index;

  for (const meta of categoryMeta) {
    if (!categoryItems.has(meta.key)) {
      await loadCategoryChunk(meta.key);
      filteredItems = allItems;
      index = allItems.findIndex(item => item.id === requestedId);
      if (index >= 0) return index;
    }
  }

  return -1;
}

async function openRequestedImage(options = {}) {
  const requestedId = getRequestedImageId();
  if (!requestedId) return false;

  const requestedCat = getRequestedCategory();
  if (requestedCat && categoryMetaFor(requestedCat)) {
    await loadCategoryChunk(requestedCat);
    const categoryItemsForRequest = categoryItems.get(requestedCat) || [];
    const categoryIndex = categoryItemsForRequest.findIndex(item => item.id === requestedId);
    if (categoryIndex >= 0) {
      const catTab = Array.from(document.querySelectorAll('.cat-tab')).find(button => button.dataset.cat === requestedCat);
      if (catTab) {
        document.querySelectorAll('.cat-tab').forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-pressed', 'false');
        });
        catTab.classList.add('active');
        catTab.setAttribute('aria-pressed', 'true');
      }
      if (activeFilter !== requestedCat) await renderGrid(requestedCat);
      filteredItems = itemsForFilter(requestedCat);
      openLB(categoryIndex, { historyMode: options.historyMode === false ? false : 'replace' });
      return true;
    }
  }

  const index = await findRequestedImageIndex(requestedId);
  if (index < 0) return false;
  const allTab = document.querySelector('.cat-tab[data-cat="all"]');
  if (allTab) {
    document.querySelectorAll('.cat-tab').forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-pressed', 'false');
    });
    allTab.classList.add('active');
    allTab.setAttribute('aria-pressed', 'true');
  }
  if (activeFilter !== 'all') await renderGrid('all');
  filteredItems = allItems;
  openLB(index, { historyMode: options.historyMode === false ? false : 'replace' });
  return true;
}

lbCloseBtn.addEventListener('click', () => closeLB());
lbShareBtn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); shareCurrentImage(); });
lbZoomOutBtn?.addEventListener('click', () => lightboxGestures?.zoomOut());
lbResetBtn?.addEventListener('click', () => lightboxGestures?.reset());
lbZoomInBtn?.addEventListener('click', () => lightboxGestures?.zoomIn());
lbFullscreenBtn?.addEventListener('click', toggleLightboxFullscreen);
lbPrevBtn.addEventListener('click', showPreviousImage);
lbNextBtn.addEventListener('click', showNextImage);
lbImg.addEventListener('load', () => {
  lbImgWrap.classList.remove('is-loading', 'is-error');
  scheduleAdjacentLightboxPreload();
});
lbMain.addEventListener('click', e => { if (e.target === lbMain) closeLB(); });
[lbPrevBtn, lbNextBtn, lbShareBtn, lbZoomOutBtn, lbResetBtn, lbZoomInBtn, lbFullscreenBtn, lbFilmstrip]
  .filter(Boolean)
  .forEach(el => el.addEventListener('click', e => e.stopPropagation()));
lightboxGestures = createLightboxGestureController({
  wrap: lbImgWrap,
  image: lbImg,
  previous: showPreviousImage,
  next: showNextImage,
  onZoomChange: syncViewerControls
});
syncViewerControls(1);
syncFullscreenControl();
document.addEventListener('fullscreenchange', syncFullscreenControl);
lbFilmstripWrap?.addEventListener('wheel', event => {
  if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
  event.preventDefault();
  lbFilmstripWrap.scrollLeft += event.deltaY;
}, { passive: false });
document.addEventListener('keydown', e => {
  if (!lbOpen) return;
  if (e.key === 'Escape') { e.preventDefault(); closeLB(); }
  if (e.key === 'Tab') {
    const focusable = Array.from(lb.querySelectorAll('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'))
      .filter(element => element.getClientRects().length > 0);
    if (!focusable.length) {
      e.preventDefault();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && (document.activeElement === first || !lb.contains(document.activeElement))) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
  if ((e.key === '+' || e.key === '=') && !e.metaKey && !e.ctrlKey) { e.preventDefault(); lightboxGestures?.zoomIn(); }
  if (e.key === '-' && !e.metaKey && !e.ctrlKey) { e.preventDefault(); lightboxGestures?.zoomOut(); }
  if (e.key === '0' && !e.metaKey && !e.ctrlKey) { e.preventDefault(); lightboxGestures?.reset(); }
  if (e.key.toLowerCase() === 'f' && !e.metaKey && !e.ctrlKey) { e.preventDefault(); toggleLightboxFullscreen(); }
  if (e.key === 'ArrowLeft' && !lightboxGestures?.isZoomed()) { e.preventDefault(); showPreviousImage(); }
  if (e.key === 'ArrowRight' && !lightboxGestures?.isZoomed()) { e.preventDefault(); showNextImage(); }
});
window.addEventListener('popstate', () => {
  const requestedId = getRequestedImageId();
  if (requestedId) void openRequestedImage({ historyMode: false });
  else if (lbOpen) closeLB({ clearUrl: false });
});
/* ── Page ── */
const nav = document.getElementById('mainNav');
window.addEventListener('scroll', () => nav.classList.toggle('scrolled', window.scrollY > 60), { passive: true });
document.querySelectorAll('.reveal').forEach(el => revealObs.observe(el));
const glow = document.getElementById('cursorGlow');
let glowOn = false;
document.addEventListener('mousemove', e => {
  if (!glowOn) { glow.classList.add('active'); glowOn = true; }
  requestAnimationFrame(() => { glow.style.transform = 'translate3d(' + e.clientX + 'px,' + e.clientY + 'px,0) translate(-50%,-50%)'; });
});
document.addEventListener('mouseleave', () => { glow.classList.remove('active'); glowOn = false; });
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/service-worker.js');
// ── Touch ripple + long-press burst ──
(function(){
  const style = document.createElement('style');
  style.textContent = `.touch-ripple{position:fixed;border-radius:50%;pointer-events:none;z-index:99998;transform:translate(-50%,-50%) scale(0);animation:touchRippleAnim var(--dur,0.6s) cubic-bezier(0.2,0,0,1) forwards;}@keyframes touchRippleAnim{0%{transform:translate(-50%,-50%) scale(0);opacity:1}100%{transform:translate(-50%,-50%) scale(1);opacity:0}}`;
  document.head.appendChild(style);
  let pressTimer=null;
  function spawnRipple(x,y,big){const el=document.createElement('div');el.className='touch-ripple';const size=big?Math.max(window.innerWidth,window.innerHeight)*2.2:120;el.style.cssText=`left:${x}px;top:${y}px;width:${size}px;height:${size}px;--dur:${big?1.1:0.55}s;background:radial-gradient(circle,${big?'rgba(201,168,76,0.18)':'rgba(201,168,76,0.28)'} 0%,transparent 70%);`;document.body.appendChild(el);setTimeout(()=>el.remove(),big?1200:650);}
  document.addEventListener('touchstart',e=>{const t=e.touches[0];spawnRipple(t.clientX,t.clientY,false);pressTimer=setTimeout(()=>{spawnRipple(t.clientX,t.clientY,true);pressTimer=null;},500);},{passive:true});
  document.addEventListener('touchend',()=>{if(pressTimer){clearTimeout(pressTimer);pressTimer=null;}},{passive:true});
  document.addEventListener('touchmove',()=>{if(pressTimer){clearTimeout(pressTimer);pressTimer=null;}},{passive:true});
})();
// ── Enhanced reveal observer ──
const revealAllObs = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); revealAllObs.unobserve(e.target); } });
}, { threshold: 0.05, rootMargin: '0px 0px -30px 0px' });
document.querySelectorAll('.reveal-left, .reveal-right, .reveal-scale').forEach(el => revealAllObs.observe(el));
// ── Floating particles ──
(function(){
  if (siteMobileLite) return;
  document.querySelectorAll('.gallery-section, .page-hero, footer').forEach(sec => {
    for (let i = 0; i < 4; i++) {
      const p = document.createElement('div');
      p.className = 'float-particle';
      p.style.cssText = `left:${Math.random()*90+5}%;bottom:${Math.random()*20}%;--dur:${8+Math.random()*10}s;animation-delay:${Math.random()*8}s;width:${2+Math.random()*3}px;height:${2+Math.random()*3}px;`;
      if (!sec.style.position) sec.style.position = 'relative';
      sec.appendChild(p);
    }
  });
})();

function scheduleGalleryInit() {
  let started = false;
  const start = () => {
    if (started) return;
    started = true;
    void init();
  };

  if (getRequestedImageId()) {
    start();
    return;
  }

  const galleryTrigger = document.getElementById('artGrid') || document.querySelector('.gallery-section');
  if ('IntersectionObserver' in window && galleryTrigger) {
    const galleryStartObserver = new IntersectionObserver((entries) => {
      if (entries.some(entry => entry.isIntersecting)) {
        galleryStartObserver.disconnect();
        start();
      }
    }, { rootMargin: GALLERY_START_MARGIN, threshold: 0.01 });
    galleryStartObserver.observe(galleryTrigger);
  } else {
    window.addEventListener('load', () => window.setTimeout(start, 1200), { once: true });
  }

  const startWhenIdle = () => {
    const runIdle = () => {
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(start, { timeout: siteMobileLite ? 1800 : 1800 });
      } else {
        start();
      }
    };

    if (siteMobileLite) {
      window.setTimeout(runIdle, 5200);
    } else {
      runIdle();
    }
  };

  if (document.readyState === 'complete') {
    startWhenIdle();
  } else {
    window.addEventListener('load', startWhenIdle, { once: true });
  }

  window.addEventListener('scroll', start, { once: true, passive: true });
  window.addEventListener('pointerdown', start, { once: true, passive: true });
  window.addEventListener('keydown', start, { once: true });
}

scheduleGalleryInit();
