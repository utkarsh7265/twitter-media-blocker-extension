// Background service worker — handles keyboard shortcut (Alt+M)

const DEFAULTS = { blockImages: true, blockVideos: true, blurMode: false, blockTrending: false };

chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-all-blocking') {
    chrome.storage.sync.get(DEFAULTS, (items) => {
      const anyActive = items.blockImages || items.blockVideos;
      // If anything is blocked, unblock everything; otherwise re-enable both
      chrome.storage.sync.set({
        blockImages: !anyActive,
        blockVideos: !anyActive
      });
    });
  }
});
