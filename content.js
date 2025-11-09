// Safer Twitter Media Blocker - minimal DOM changes, pointer-events safe

const DEFAULTS = { blockImages: true, blockVideos: true };
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

// Inject CSS once. Placeholders (if any) will not capture pointer events.
function injectSafeCss() {
  if (document.getElementById('tm-blocker-safe-css')) return;
  const style = document.createElement('style');
  style.id = 'tm-blocker-safe-css';
  style.textContent = `
    /* Fast toggles via body class */
    body.tm-blocker-hide-images img,
    body.tm-blocker-hide-images picture,
    body.tm-blocker-hide-images figure {
      visibility: hidden !important;
      opacity: 0 !important;
      pointer-events: none !important;
    }

    body.tm-blocker-hide-videos video,
    body.tm-blocker-hide-videos iframe {
      visibility: hidden !important;
      opacity: 0 !important;
      pointer-events: none !important;
    }

    /* inline background images: neutralize without adding DOM nodes */
    body.tm-blocker-hide-images [style*="background-image"] {
      background-image: none !important;
      pointer-events: auto !important;
    }

    /* placeholder style if needed - will not intercept clicks */
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
      // CSS hides images. We avoid removing src or touching many attributes.
      // Only in case of layout break we may add a lightweight, non-interactive placeholder.
      return;
    }

    if (tag === 'video') {
      if (!settings.blockVideos) return;
      // Pause and remove sources to stop downloads/playing
      node.pause && node.pause();
      Array.from(node.querySelectorAll('source')).forEach(s => { try { s.src = ''; } catch(e){} });
      try { if (node.src) node.src = ''; } catch (e) {}
      node.removeAttribute && node.removeAttribute('poster');
      return;
    }

    if (tag === 'iframe') {
      if (!settings.blockVideos) return;
      try {
        if (node.src) node.dataset.tmOrigSrc = node.src;
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

async function init() {
  injectSafeCss();
  await loadSettings();

  // Set classes (CSS will do the hiding — very cheap)
  document.body.classList.toggle('tm-blocker-hide-images', !!settings.blockImages);
  document.body.classList.toggle('tm-blocker-hide-videos', !!settings.blockVideos);

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

  // storage changes toggle CSS classes — avoids page reloads and heavy DOM work
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync') {
      if ('blockImages' in changes) {
        settings.blockImages = changes.blockImages.newValue;
        document.body.classList.toggle('tm-blocker-hide-images', !!settings.blockImages);
      }
      if ('blockVideos' in changes) {
        settings.blockVideos = changes.blockVideos.newValue;
        document.body.classList.toggle('tm-blocker-hide-videos', !!settings.blockVideos);
      }
    }
  });
}

init().catch(e => {
  // always fail quietly to avoid breaking the page
  try { console.error('tm-blocker init error', e); } catch(e) {}
});
