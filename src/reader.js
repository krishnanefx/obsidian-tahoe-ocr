/*
 * Tahoe OCR's own layer over the shared reader (ocr.js, kept identical to
 * Tahoe Organize's): the rules for which images get read in the background
 * (sizes, changed images) and the helpers the commands use.
 */

import { Modal, Setting } from "obsidian";
import { OcrIndex } from "./ocr";
import { isImage } from "./util";

const MAX_READ_MB = 40; // the shared reader never reads anything larger

class ReaderIndex extends OcrIndex {
  // A file the background reading leaves alone, or null if it may be read.
  skipReason(file) {
    const s = this.plugin.settings;
    if (s.ocrMinKb > 0 && file.stat.size < s.ocrMinKb * 1024) return "small";
    if (file.stat.size > Math.min(s.ocrMaxMb || MAX_READ_MB, MAX_READ_MB) * 1e6) return "large";
    if (!s.ocrRereadChanged && !this.forcing && this.entries[file.path]) return "unchanged";
    return null;
  }

  enqueue(file) {
    if (!this.explicit && this.skipReason(file)) return;
    super.enqueue(file);
  }

  scanAll(force = false) {
    this.forcing = force;
    try {
      return super.scanAll(force);
    } finally {
      this.forcing = false;
    }
  }

  // A read the user asked for: only the 40 MB limit still applies.
  readNow(file) {
    if (!isImage(file) || file.stat.size > MAX_READ_MB * 1e6) return false;
    this.explicit = true;
    try {
      super.enqueue(file);
    } finally {
      this.explicit = false;
    }
    return true;
  }

  clear() {
    this.entries = {};
    this.queue = [];
    return this.save();
  }
}

// The images a line of Markdown embeds, nearest to the cursor first.
function embedsOnLine(line, ch) {
  const found = [];
  const re = /!?\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]|!\[[^\]]*\]\(([^)]+)\)/g;
  let m;
  while ((m = re.exec(line))) {
    let target = m[1] || m[2] || "";
    try {
      target = decodeURI(target.trim().replace(/^<|>$/g, ""));
    } catch {
      // keep it as typed
    }
    found.push({ target, distance: ch >= m.index && ch <= m.index + m[0].length ? 0 : Math.min(Math.abs(ch - m.index), Math.abs(ch - (m.index + m[0].length))) });
  }
  return found.sort((a, b) => a.distance - b.distance).map((f) => f.target);
}

// The image files a note embeds.
function imagesInNote(app, note) {
  const out = [];
  for (const dest of Object.keys((app.metadataCache.resolvedLinks || {})[note.path] || {})) {
    const f = app.vault.getAbstractFileByPath(dest);
    if (isImage(f)) out.push(f);
  }
  return out;
}

class ConfirmModal extends Modal {
  constructor(app, title, text, action, onConfirm) {
    super(app);
    this.title = title;
    this.text = text;
    this.action = action;
    this.onConfirm = onConfirm;
  }

  onOpen() {
    this.setTitle(this.title);
    this.contentEl.createEl("p", { text: this.text });
    new Setting(this.contentEl)
      .addButton((b) => b.setButtonText("Cancel").onClick(() => this.close()))
      .addButton((b) =>
        b
          .setButtonText(this.action)
          .setWarning()
          .onClick(() => {
            this.close();
            this.onConfirm();
          })
      );
  }

  onClose() {
    this.contentEl.empty();
  }
}

export { ReaderIndex, ConfirmModal, embedsOnLine, imagesInNote };
