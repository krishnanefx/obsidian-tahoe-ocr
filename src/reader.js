/*
 * Tahoe OCR's own layer over the shared reader (ocr.js, kept identical to
 * Tahoe Organize's): the helpers the
 * commands use.
 */

import { Modal, Setting } from "obsidian";
import { OcrIndex } from "./ocr";
import { isImage } from "./util";

const MAX_READ_MB = 40; // the shared reader never reads anything larger

class ReaderIndex extends OcrIndex {
  // A read the user asked for: only the 40 MB limit applies.
  readNow(file) {
    if (!isImage(file) || file.stat.size > MAX_READ_MB * 1e6) return false;
    super.enqueue(file);
    return true;
  }

  clear() {
    this.entries = {};
    this.queue = [];
    return this.save();
  }
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

export { ReaderIndex, ConfirmModal, imagesInNote };
