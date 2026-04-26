// Popup controller — instant toggles, no page reload needed

const DEFAULTS = { blockImages: true, blockVideos: true, blurMode: false, blockTrending: false };

const els = {
  blockImages: document.getElementById('blockImages'),
  blockVideos: document.getElementById('blockVideos'),
  blurMode: document.getElementById('blurMode'),
  blockTrending: document.getElementById('blockTrending')
};

function loadUI() {
  chrome.storage.sync.get(DEFAULTS, (items) => {
    els.blockImages.checked = items.blockImages;
    els.blockVideos.checked = items.blockVideos;
    els.blurMode.checked = items.blurMode;
    els.blockTrending.checked = items.blockTrending;
  });
}

// Each toggle writes its setting instantly — the content script reacts via storage.onChanged
Object.keys(els).forEach(key => {
  els[key].addEventListener('change', () => {
    chrome.storage.sync.set({ [key]: els[key].checked });
  });
});

// Keep UI in sync if settings change externally (e.g. via Alt+M shortcut)
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync') {
    Object.keys(els).forEach(key => {
      if (key in changes) {
        els[key].checked = changes[key].newValue;
      }
    });
  }
});

loadUI();
