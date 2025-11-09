const blockImagesEl = document.getElementById('blockImages');
const blockVideosEl = document.getElementById('blockVideos');
const applyBtn = document.getElementById('apply');

function loadUI() {
  chrome.storage.sync.get({ blockImages: true, blockVideos: true }, (items) => {
    blockImagesEl.checked = items.blockImages;
    blockVideosEl.checked = items.blockVideos;
  });
}

applyBtn.addEventListener('click', () => {
  const newSettings = { blockImages: blockImagesEl.checked, blockVideos: blockVideosEl.checked };
  chrome.storage.sync.set(newSettings, () => {
    // Try to reload active tab so content script re-runs
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0]) {
        chrome.tabs.reload(tabs[0].id);
      }
    });
    window.close();
  });
});

loadUI();
