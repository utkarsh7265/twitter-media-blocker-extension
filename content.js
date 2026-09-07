// Twitter Media Blocker v1.2.0
// Features: block/blur images & videos, keep avatars, click-to-reveal,
// hide link cards, hide trending sidebar, Alt+M shortcut

const DEFAULTS = {
  blockImages: true, blockVideos: true, blurMode: false, blockTrending: false,
  keepAvatars: false, clickReveal: false, blockCards: false
};
let settings = { ...DEFAULTS };

function loadSettings() {
  return new Promise(resolve => {
    try {
      chrome.storage.sync.get(DEFAULTS, items => {
        settings = Object.assign({}, DEFAULTS, items);
        resolve(settings);
      });
    } catch (e) {
      settings = { ...DEFAULTS };
      resolve(settings);
    }
  });
}

// Inject CSS once. All blocking is driven by body classes for instant toggling.
function injectSafeCss() {
  if (document.getElementById('tm-blocker-safe-css')) return;
  const style = document.createElement('style');
  style.id = 'tm-blocker-safe-css';
  style.textContent = `
    /* ===== HIDE MODE (default) ===== */

    /* Hide images */
    body.tm-blocker-hide-images:not(.tm-blocker-blur-mode) img,
    body.tm-blocker-hide-images:not(.tm-blocker-blur-mode) picture,
    body.tm-blocker-hide-images:not(.tm-blocker-blur-mode) figure {
      visibility: hidden !important;
      opacity: 0 !important;
      pointer-events: none !important;
    }

    /* Hide videos */
    body.tm-blocker-hide-videos:not(.tm-blocker-blur-mode) video,
    body.tm-blocker-hide-videos:not(.tm-blocker-blur-mode) iframe {
      visibility: hidden !important;
      opacity: 0 !important;
      pointer-events: none !important;
    }

    /* Hide inline background images */
    body.tm-blocker-hide-images:not(.tm-blocker-blur-mode) [style*="background-image"] {
      background-image: none !important;
      pointer-events: auto !important;
    }

    /* ===== BLUR MODE ===== */

    /* Blur images */
    body.tm-blocker-blur-mode.tm-blocker-hide-images img,
    body.tm-blocker-blur-mode.tm-blocker-hide-images picture,
    body.tm-blocker-blur-mode.tm-blocker-hide-images figure {
      filter: blur(25px) !important;
      transition: filter 0.3s ease !important;
      pointer-events: auto !important;
    }
    body.tm-blocker-blur-mode.tm-blocker-hide-images:not(.tm-blocker-click-reveal) img:hover,
    body.tm-blocker-blur-mode.tm-blocker-hide-images picture:hover,
    body.tm-blocker-blur-mode.tm-blocker-hide-images figure:hover {
      filter: none !important;
    }

    /* Blur videos */
    body.tm-blocker-blur-mode.tm-blocker-hide-videos video,
    body.tm-blocker-blur-mode.tm-blocker-hide-videos iframe {
      filter: blur(25px) !important;
      transition: filter 0.3s ease !important;
      pointer-events: auto !important;
    }
    body.tm-blocker-blur-mode.tm-blocker-hide-videos:not(.tm-blocker-click-reveal) video:hover,
    body.tm-blocker-blur-mode.tm-blocker-hide-videos:not(.tm-blocker-click-reveal) iframe:hover {
      filter: none !important;
    }

    /* Blur inline background images */
    body.tm-blocker-blur-mode.tm-blocker-hide-images [style*="background-image"] {
      filter: blur(25px) !important;
      transition: filter 0.3s ease !important;
      pointer-events: auto !important;
    }
    body.tm-blocker-blur-mode.tm-blocker-hide-images [style*="background-image"]:hover {
      filter: none !important;
    }

    /* ===== TRENDING SIDEBAR (scoped to sidebar only) ===== */

    body.tm-blocker-hide-trending [data-testid="sidebarColumn"] [data-testid="trend"],
    body.tm-blocker-hide-trending [data-testid="sidebarColumn"] [data-testid="UserCell"] {
      display: none !important;
    }

    /* Hide the "What's happening" and "Who to follow" section containers */
    body.tm-blocker-hide-trending [data-testid="sidebarColumn"] [aria-label="Timeline: Trending now"],
    body.tm-blocker-hide-trending [data-testid="sidebarColumn"] [aria-label="Who to follow"] {
      display: none !important;
    }

    /* In click-reveal mode only leaf media is blurred, so pinning one image
       isn't undone by a blurred ancestor. */
    body.tm-blocker-blur-mode.tm-blocker-hide-images.tm-blocker-click-reveal picture,
    body.tm-blocker-blur-mode.tm-blocker-hide-images.tm-blocker-click-reveal figure {
      filter: none !important;
    }

    /* ===== CLICK TO REVEAL =====
       visibility:hidden takes an element out of hit-testing, so in click-reveal
       mode media is blanked with opacity alone and stays clickable. */

    body.tm-blocker-click-reveal.tm-blocker-hide-images:not(.tm-blocker-blur-mode) img {
      visibility: visible !important;
      opacity: 0 !important;
      pointer-events: auto !important;
    }
    body.tm-blocker-click-reveal.tm-blocker-hide-images:not(.tm-blocker-blur-mode) picture,
    body.tm-blocker-click-reveal.tm-blocker-hide-images:not(.tm-blocker-blur-mode) figure {
      visibility: visible !important;
      opacity: 1 !important;
      pointer-events: auto !important;
    }
    body.tm-blocker-click-reveal.tm-blocker-hide-videos:not(.tm-blocker-blur-mode) video,
    body.tm-blocker-click-reveal.tm-blocker-hide-videos:not(.tm-blocker-blur-mode) iframe {
      visibility: visible !important;
      opacity: 0 !important;
      pointer-events: auto !important;
    }

    /* ===== KEEP AVATARS =====
       Must stay after the hide/blur/click-reveal blocks: same specificity,
       later rule wins. */

    body.tm-blocker-keep-avatars.tm-blocker-hide-images [data-testid="Tweet-User-Avatar"],
    body.tm-blocker-keep-avatars.tm-blocker-hide-images [data-testid="Tweet-User-Avatar"] img,
    body.tm-blocker-keep-avatars.tm-blocker-hide-images [data-testid^="UserAvatar-Container-"],
    body.tm-blocker-keep-avatars.tm-blocker-hide-images [data-testid^="UserAvatar-Container-"] img {
      visibility: visible !important;
      opacity: 1 !important;
      filter: none !important;
      pointer-events: auto !important;
    }

    /* ===== LINK PREVIEW CARDS ===== */
    /* Polls render as card.wrapper too — keep those. */
    body.tm-blocker-hide-cards [data-testid="card.wrapper"]:not(:has([data-testid="cardPoll"])) {
      display: none !important;
    }

    /* placeholder style if needed — will not intercept clicks */
    .tm-media-blocked-placeholder {
      pointer-events: none !important;
      user-select: none !important;
      min-height: 48px;
      display: block !important;
      font-size: 12px;
      color: #666;
      opacity: 0.95;
      background: transparent !important;
    }
  `;
  document.documentElement.appendChild(style);
}

// We'll only add placeholders in rare cases, and *never* with pointer-events enabled.
const processed = new WeakSet();
let pending = new Set();
let idleToken = null;

function scheduleProcessing() {
  if (idleToken) {
    if (typeof cancelIdleCallback === 'function') cancelIdleCallback(idleToken);
    idleToken = null;
  }

  const work = (deadline) => {
    const nodes = Array.from(pending);
    pending.clear();
    for (let i = 0; i < nodes.length; i++) {
      processMedia(nodes[i]);
      // respect idle time
      if (deadline && deadline.timeRemaining && deadline.timeRemaining() < 5) {
        for (let j = i + 1; j < nodes.length; j++) pending.add(nodes[j]);
        idleToken = (typeof requestIdleCallback === 'function')
          ? requestIdleCallback(work, { timeout: 200 })
          : setTimeout(() => work(), 60);
        return;
      }
    }
  };

  idleToken = (typeof requestIdleCallback === 'function')
    ? requestIdleCallback(work, { timeout: 200 })
    : setTimeout(() => work(), 60);
}

function processMedia(node) {
  if (!node || !(node instanceof Element)) return;
  if (processed.has(node)) return;
  processed.add(node);

  const tag = node.tagName && node.tagName.toLowerCase();

  try {
    if (['img','picture','figure'].includes(tag)) {
      if (!settings.blockImages) return;
      // CSS hides/blurs images. We avoid removing src or touching many attributes.
      return;
    }

    if (tag === 'video') {
      if (!settings.blockVideos) return;
      // In blur mode, don't strip sources — just let CSS blur handle it
      if (settings.blurMode) return;
      // Save original sources before stripping (for restore on toggle-off)
      node.pause && node.pause();
      try { if (node.src && !node.dataset.tmOrigSrc) node.dataset.tmOrigSrc = node.src; } catch(e) {}
      const sources = node.querySelectorAll('source');
      Array.from(sources).forEach((s, i) => {
        try { if (s.src && !s.dataset.tmOrigSrc) s.dataset.tmOrigSrc = s.src; s.src = ''; } catch(e){}
      });
      try { if (node.src) node.src = ''; } catch (e) {}
      if (node.poster && !node.dataset.tmOrigPoster) {
        node.dataset.tmOrigPoster = node.poster;
      }
      node.removeAttribute && node.removeAttribute('poster');
      return;
    }

    if (tag === 'iframe') {
      if (!settings.blockVideos) return;
      // In blur mode, don't strip src — just let CSS blur handle it
      if (settings.blurMode) return;
      try {
        if (node.src && node.src !== 'about:blank') node.dataset.tmOrigSrc = node.src;
        node.src = 'about:blank';
      } catch(e){}
      return;
    }

    // fallback: no heavy computed-style calls
  } catch (e) {
    // ignore, be fail-safe
  }
}

// Add node(s) for later processing
function enqueueNode(node) {
  if (!node || node.nodeType !== Node.ELEMENT_NODE) return;
  // if node itself is a candidate
  const tag = (node.tagName || '').toLowerCase();
  if (['img','picture','figure','video','iframe'].includes(tag)) pending.add(node);

  // lightweight descendant selection (only target likely media elements)
  try {
    const found = node.querySelectorAll('img, picture, figure, video, iframe');
    for (const el of found) pending.add(el);
  } catch (e) {}

  // detect inline background-image attribute present
  try {
    if (node.hasAttribute && node.hasAttribute('style') && node.getAttribute('style').includes('background-image')) {
      pending.add(node);
    }
  } catch (e) {}

  // schedule batch processing
  if (pending.size) scheduleProcessing();
}

// Restore stripped sources on one element so it can play again.
// Returns true if anything was actually restored.
function restoreVideoEl(el) {
  let changed = false;
  try {
    if (el.dataset.tmOrigSrc) {
      el.src = el.dataset.tmOrigSrc;
      delete el.dataset.tmOrigSrc;
      changed = true;
    }
    if (el.tagName.toLowerCase() === 'video') {
      el.querySelectorAll('source[data-tm-orig-src]').forEach(sc => {
        try { sc.src = sc.dataset.tmOrigSrc; delete sc.dataset.tmOrigSrc; changed = true; } catch (e) {}
      });
      if (el.dataset.tmOrigPoster) {
        el.poster = el.dataset.tmOrigPoster;
        delete el.dataset.tmOrigPoster;
        changed = true;
      }
      if (changed) el.load();
    }
  } catch (e) {}
  return changed;
}

// Restore every stripped video/iframe (used when video blocking is turned off)
function restoreVideos() {
  try {
    document.querySelectorAll('video, iframe').forEach(el => {
      restoreVideoEl(el);
      // allow re-processing if blocking is turned back on
      processed.delete(el);
    });
  } catch (e) {}
}

// Drop reveals when click-to-reveal is switched off, so nothing stays visible
function clearReveals() {
  document.querySelectorAll('[data-tm-revealed]').forEach(el => {
    el.style.removeProperty('visibility');
    el.style.removeProperty('opacity');
    el.style.removeProperty('filter');
    delete el.dataset.tmRevealed;
  });
}

// Apply all body classes based on current settings
function applyBodyClasses() {
  document.body.classList.toggle('tm-blocker-hide-images', !!settings.blockImages);
  document.body.classList.toggle('tm-blocker-hide-videos', !!settings.blockVideos);
  document.body.classList.toggle('tm-blocker-blur-mode', !!settings.blurMode);
  document.body.classList.toggle('tm-blocker-hide-trending', !!settings.blockTrending);
  document.body.classList.toggle('tm-blocker-keep-avatars', !!settings.keepAvatars);
  document.body.classList.toggle('tm-blocker-click-reveal', !!settings.clickReveal);
  document.body.classList.toggle('tm-blocker-hide-cards', !!settings.blockCards);
}

async function init() {
  injectSafeCss();
  await loadSettings();

  // Set classes (CSS will do the hiding/blurring — very cheap)
  applyBodyClasses();

  // Initial limited scan (only targeted selectors)
  try {
    document.querySelectorAll('img, picture, figure, video, iframe, [style*="background-image"]').forEach(el => {
      pending.add(el);
    });
    scheduleProcessing();
  } catch (e) {}

  // Observe childList only — do not observe attributes (reduces event storms)
  const mo = new MutationObserver(muts => {
    for (const m of muts) {
      if (m.type === 'childList') {
        m.addedNodes.forEach(n => {
          if (n.nodeType === Node.ELEMENT_NODE) enqueueNode(n);
        });
      }
    }
  });
  mo.observe(document, { childList: true, subtree: true });

  // Click-to-reveal: one click permanently reveals a single item without
  // disabling blocking. Works in hide mode (blanked -> shown) and blur mode
  // (blurred -> pinned sharp); in blur mode it replaces hover-peek, so the
  // toggle never sits there doing nothing.
  document.addEventListener('click', e => {
    if (!settings.clickReveal) return;
    const el = e.target && e.target.closest && e.target.closest('img, video, iframe');
    if (!el || el.dataset.tmRevealed) return;
    // Only intercept media the CSS is actually blocking — leaves avatars and
    // anything else already visible alone, so their clicks reach X untouched.
    const cs = getComputedStyle(el);
    if (cs.opacity !== '0' && !cs.filter.includes('blur')) return;
    el.dataset.tmRevealed = '1';
    el.style.setProperty('visibility', 'visible', 'important');
    el.style.setProperty('opacity', '1', 'important');
    el.style.setProperty('filter', 'none', 'important');
    if (el.tagName.toLowerCase() !== 'img') restoreVideoEl(el);
    e.preventDefault();
    e.stopPropagation();
  }, true);

  // Storage changes toggle CSS classes — avoids page reloads and heavy DOM work
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    for (const key in changes) {
      if (key in settings) settings[key] = changes[key].newValue;
    }
    // Restore stripped sources when video blocking is turned off
    if ('blockVideos' in changes && !settings.blockVideos) restoreVideos();
    if ('clickReveal' in changes && !settings.clickReveal) clearReveals();
    applyBodyClasses();
  });
}

init().catch(e => {
  // always fail quietly to avoid breaking the page
  try { console.error('tm-blocker init error', e); } catch(e) {}
});
