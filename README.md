# twitter-media-blocker-extension

![Chrome Web Store Users](https://img.shields.io/chrome-web-store/users/lefnkfngfacicegokkakkbflpbklnipk?style=for-the-badge&logo=googlechrome&logoColor=white&label=Users&color=4285F4)
![Chrome Web Store Version](https://img.shields.io/chrome-web-store/v/lefnkfngfacicegokkakkbflpbklnipk?style=for-the-badge&logo=googlechrome&logoColor=white&label=Version&color=34A853)

A simple browser extension that hides images and videos on Twitter (X) so you can scroll without distractions.  
It’s lightweight, private, and helps you focus on what people actually write.

[**✅ Install from Chrome Web Store**](https://chromewebstore.google.com/detail/twitter-media-blocker/lefnkfngfacicegokkakkbflpbklnipk)

---

## What it does

- Hides all images and videos on x.com and twitter.com  
- Lets you toggle images or videos separately  
- Blur mode — blur media instead of hiding it, hover to peek  
- Keep avatars — profile pictures stay visible so you can still tell tweets apart  
- Click to reveal — reveal a single image for good without turning blocking off  
- Hides link preview cards and the trending sidebar  
- `Alt+M` to toggle everything on or off  
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
5. Visit x.com and try it out.

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

Open `test.html` in a browser after touching the CSS in `content.js` — every row must say PASS.

---

