/* The few helpers the shared OCR module needs (the same as Tahoe Organize's). */

import { TFile } from "obsidian";

function debounce(fn, ms) {
  let t = 0;
  const wrapped = (...args) => {
    window.clearTimeout(t);
    t = window.setTimeout(() => fn(...args), ms);
  };
  wrapped.cancel = () => window.clearTimeout(t);
  return wrapped;
}

function isImage(file) {
  return file instanceof TFile && /^(png|jpe?g|gif|webp|heic|heif|tiff?|bmp)$/i.test(file.extension);
}

// In Settings › Files and links › Excluded files: left out, like search leaves them out.
function ignored(app, path) {
  return !!(app.metadataCache.isUserIgnored && app.metadataCache.isUserIgnored(path));
}

export { debounce, isImage, ignored };
