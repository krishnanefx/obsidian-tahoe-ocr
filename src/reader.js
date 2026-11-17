/*
 * Tahoe OCR's own layer over the shared reader (ocr.js, kept identical to
 * Tahoe Organize's): the helpers the
 * commands use.
 */

import { Modal, Setting } from "obsidian";
import { OcrIndex } from "./ocr";

class ReaderIndex extends OcrIndex {
  clear() {
    this.entries = {};
    this.queue = [];
    return this.save();
  }
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

export { ReaderIndex, ConfirmModal };
