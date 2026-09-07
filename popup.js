// Popup controller — instant toggles, no page reload needed

const DEFAULTS = {
  blockImages: true, blockVideos: true, blurMode: false, blockTrending: false,
  keepAvatars: false, clickReveal: false, blockCards: false
};

const els = {
  blockImages: document.getElementById('blockImages'),
  blockVideos: document.getElementById('blockVideos'),
  blurMode: document.getElementById('blurMode'),
  blockTrending: document.getElementById('blockTrending'),
  keepAvatars: document.getElementById('keepAvatars'),
  clickReveal: document.getElementById('clickReveal'),
  blockCards: document.getElementById('blockCards')
};

function loadUI() {
  chrome.storage.sync.get(DEFAULTS, (items) => {
    Object.keys(els).forEach(key => { els[key].checked = !!items[key]; });
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
