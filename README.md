# twitter-media-blocker-extension

A simple browser extension that hides images and videos on Twitter (X) so you can scroll without distractions.  
It’s lightweight, private, and helps you focus on what people actually write.

---

## What it does

- Hides all images and videos on twitter.com  
- Lets you toggle images or videos separately  
- Runs fast and doesn’t collect any data  
- Works entirely in your browser (no servers, no tracking)  
- Great if you want a cleaner, text-only Twitter experience

---

## How to install

### Manual install (developer mode)
1. Download or clone this repository.  
2. Open `chrome://extensions` in Chrome.  
3. Turn on **Developer mode** (top right corner).  
4. Click **Load unpacked** and choose the folder.  
5. Visit twitter.com and try it out.

---

## How it works

When you open Twitter, the extension quietly runs a small script that:
- Hides or blanks out all `<img>`, `<video>`, and background images.  
- Lets you toggle whether to block images, videos, or both.  
- Saves your preferences using Chrome’s built-in storage.  

No data ever leaves your computer.  
Everything happens locally, in your own browser.

---
## Development

To work on it locally:

```bash
git clone https://github.com/yourusername/twitter-media-blocker.git
cd twitter-media-blocker
```
---

