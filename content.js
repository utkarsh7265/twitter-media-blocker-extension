// Twitter Media Blocker v1.1.0
// Features: block/blur images & videos, hide trending sidebar, Alt+M shortcut

const DEFAULTS = { blockImages: true, blockVideos: true, blurMode: false, blockTrending: false };
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
    body.tm-blocker-blur-mode.tm-blocker-hide-images img:hover,
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
    body.tm-blocker-blur-mode.tm-blocker-hide-videos video:hover,
    body.tm-blocker-blur-mode.tm-blocker-hide-videos iframe:hover {
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

// Restore stripped video/iframe sources so they can play again
function restoreVideos() {
  try {
    document.querySelectorAll('video[data-tm-orig-src]').forEach(v => {
      try {
        v.src = v.dataset.tmOrigSrc;
        delete v.dataset.tmOrigSrc;
      } catch(e) {}
      // Restore <source> children
      v.querySelectorAll('source[data-tm-orig-src]').forEach(s => {
        try { s.src = s.dataset.tmOrigSrc; delete s.dataset.tmOrigSrc; } catch(e) {}
      });
      // Restore poster
      if (v.dataset.tmOrigPoster) {
        v.poster = v.dataset.tmOrigPoster;
        delete v.dataset.tmOrigPoster;
      }
      try { v.load(); } catch(e) {}
    });
    document.querySelectorAll('iframe[data-tm-orig-src]').forEach(f => {
      try {
        f.src = f.dataset.tmOrigSrc;
        delete f.dataset.tmOrigSrc;
      } catch(e) {}
    });
    // Allow these elements to be re-processed if blocking is turned on again
    processed.delete && document.querySelectorAll('video, iframe').forEach(el => {
      processed.delete(el);
    });
  } catch(e) {}
}

// Apply all body classes based on current settings
function applyBodyClasses() {
  document.body.classList.toggle('tm-blocker-hide-images', !!settings.blockImages);
  document.body.classList.toggle('tm-blocker-hide-videos', !!settings.blockVideos);
  document.body.classList.toggle('tm-blocker-blur-mode', !!settings.blurMode);
  document.body.classList.toggle('tm-blocker-hide-trending', !!settings.blockTrending);
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

  // Storage changes toggle CSS classes — avoids page reloads and heavy DOM work
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync') {
      if ('blockImages' in changes) {
        settings.blockImages = changes.blockImages.newValue;
      }
      if ('blockVideos' in changes) {
        settings.blockVideos = changes.blockVideos.newValue;
        // Restore stripped sources when video blocking is turned off
        if (!settings.blockVideos) restoreVideos();
      }
      if ('blurMode' in changes) {
        settings.blurMode = changes.blurMode.newValue;
      }
      if ('blockTrending' in changes) {
        settings.blockTrending = changes.blockTrending.newValue;
      }
      applyBodyClasses();
    }
  });
}

init().catch(e => {
  // always fail quietly to avoid breaking the page
  try { console.error('tm-blocker init error', e); } catch(e) {}
});
