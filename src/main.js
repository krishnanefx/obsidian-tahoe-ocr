/*
 * Tahoe OCR: search the text in your images. Screenshots, photos of slides and
 * scanned pages are read with macOS Vision (the engine behind Live Text), and
 * the text is searchable from a command, copyable from an image's menu, and
 * optionally written to an index note so Obsidian's own search finds it.
 *
 * The reading is the same module as Tahoe Organize's "Text from images"
 * (src/ocr.js). With Organize's reader on, this plugin uses Organize's index
 * instead of reading every image a second time.
 */

import { Plugin, PluginSettingTab, Setting, Notice, Platform } from "obsidian";
import { OcrIndex, ImageTextSearchModal } from "./ocr";
import { isImage } from "./util";
import { loadNode } from "./node";

const DEFAULT_SETTINGS = {
  ocrWriteNote: false,
  ocrIndexNote: "Image Text Index.md",
};

class TahoeOcrPlugin extends Plugin {
  async onload() {
    await loadNode();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    this.addSettingTab(new TahoeOcrSettingTab(this.app, this));

    this.ocr = new OcrIndex(this);
    this.app.workspace.onLayoutReady(async () => {
      await this.ocr.load();
      if (!this.organizeReads()) this.ocr.start();
    });

    this.addCommand({ id: "search-image-text", name: "Search text in images", callback: () => new ImageTextSearchModal(this.app, this.index()).open() });
    if (Platform.isMacOS && Platform.isDesktopApp) {
      this.addCommand({
        id: "reread-images",
        name: "Read text in all images again",
        callback: () => {
          const n = this.index().scanAll(true);
          new Notice(n ? `Reading text in ${n} images…` : "No images to read");
        },
      });
    }
    this.registerEvent(
      this.app.workspace.on("file-menu", (menu, file) => {
        if (!isImage(file) || this.organizeReads()) return; // Organize adds the same item
        menu.addItem((i) =>
          i
            .setTitle("Copy text from image")
            .setIcon("scan-text")
            .onClick(async () => {
              const text = await this.ocr.textFor(file);
              if (!text) return new Notice(this.ocr.canRead ? "No text found in this image" : "Open this vault on your Mac to read new images");
              await navigator.clipboard.writeText(text);
              new Notice("Text copied");
            })
        );
      })
    );
  }

  onunload() {
    if (this.ocr) this.ocr.stop();
  }

  // Tahoe Organize with "Text from images" on already reads every image.
  organizeReads() {
    const o = this.app.plugins.getPlugin("tahoe-organize");
    return !!(o && o.ocr && o.settings && o.settings.features && o.settings.features.ocr);
  }

  index() {
    return this.organizeReads() ? this.app.plugins.getPlugin("tahoe-organize").ocr : this.ocr;
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

class TahoeOcrSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
    this.icon = "scan-text";
  }

  display() {
    const { containerEl } = this;
    const s = this.plugin.settings;
    const save = () => this.plugin.saveSettings();
    containerEl.empty();

    containerEl.createEl("p", {
      cls: "setting-item-description",
      text: Platform.isMacOS
        ? "New and changed images are read in the background with macOS Vision, on this Mac. Run “Search text in images” from the command palette to find one by its words."
        : "Reading images needs a Mac: open this vault there once and the text syncs here, where “Search text in images” can find it.",
    });
    if (this.plugin.organizeReads()) {
      containerEl.createEl("p", {
        cls: "setting-item-description",
        text: "Tahoe Organize is reading your images already, so searches here use its index and its settings. You only need one of the two for this.",
      });
    }

    new Setting(containerEl)
      .setName("Searchable index note")
      .setDesc("Keep a note listing the text found in each image, so Obsidian’s search finds it.")
      .addToggle((t) => t.setValue(s.ocrWriteNote).onChange(async (v) => ((s.ocrWriteNote = v), await save())));
    new Setting(containerEl)
      .setName("Index note")
      .addText((t) => t.setPlaceholder("Image Text Index.md").setValue(s.ocrIndexNote).onChange(async (v) => ((s.ocrIndexNote = v.trim() || "Image Text Index.md"), await save())));
    const count = Object.keys(this.plugin.index().entries).length;
    new Setting(containerEl).setName("Images read").setDesc(`${count.toLocaleString()} images so far.`);
    containerEl.createDiv({ cls: "tahoe-source-link" }).createEl("a", { text: "Source, issues and ideas on GitHub", href: "https://github.com/krishnanefx/obsidian-tahoe-ocr" });
  }
}

export default TahoeOcrPlugin;
