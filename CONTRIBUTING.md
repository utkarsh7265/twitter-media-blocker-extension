# Contributing

Thanks for helping out! Bug reports, fixes and small features are all welcome.

## Setup

1. Fork and clone the repo.
2. Open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked** and pick the repo folder.
3. Open x.com. After editing, hit the reload icon on the extension card and refresh the tab.

No build step — it's plain JS, HTML and CSS.

## How it's put together

- `content.js` — injects one stylesheet and toggles `tm-blocker-*` classes on `<body>`. Almost all blocking is CSS; JS only strips video/iframe sources and handles click-to-reveal.
- `popup.html` / `popup.js` — the toggles. Each one writes to `chrome.storage.sync`; the content script reacts through `storage.onChanged`, so no reloads.
- `background.js` — the `Alt+M` shortcut.
- `test.html` — cascade check for the CSS in `content.js`.

Settings defaults live in three places (`content.js`, `popup.js`, `background.js`). If you add a setting, update all three.

## Rules worth knowing

- **CSS order matters.** The keep-avatars block must stay *after* the hide / blur / click-reveal blocks — same specificity, so the later rule wins.
- In click-reveal mode, media is blanked with `opacity` only. `visibility: hidden` removes it from hit-testing, so clicks would never reach it.
- Target X's `data-testid` attributes rather than class names — X's classes are generated and change often.

## Before opening a PR

- If you touched the CSS, open `test.html` in a browser. Every row must say **PASS**. Add a row for new behaviour where you can.
- Test on x.com with the relevant toggles on and off.
- Keep PRs small and focused, and link the issue they fix.

## Reporting a bug

If something stopped working, X probably changed its markup. Please include the page URL, which toggles were on, and a screenshot. If you can, inspect the element and paste its `data-testid`.
