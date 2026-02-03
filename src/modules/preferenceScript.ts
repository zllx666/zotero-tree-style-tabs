import { config } from "../../package.json";
import { getPrefs, setPref } from "../utils/prefs";

// Declare globals
declare const Zotero: _ZoteroTypes.Zotero;

/**
 * Register preference scripts for the preferences window
 */
export function registerPrefsScripts(win: Window): void {
  if (!win) return;

  const doc = win.document;
  const prefs = getPrefs();

  // Position dropdown
  const positionEl = doc.getElementById("treestyletabs-position") as HTMLSelectElement;
  if (positionEl) {
    positionEl.value = prefs.position;
    positionEl.addEventListener("change", () => {
      setPref("position", positionEl.value);
    });
  }

  // Width input
  const widthEl = doc.getElementById("treestyletabs-width") as HTMLInputElement;
  if (widthEl) {
    widthEl.value = String(prefs.sidebarWidth);
    widthEl.addEventListener("change", () => {
      const value = parseInt(widthEl.value, 10);
      if (!isNaN(value) && value >= 150 && value <= 500) {
        setPref("sidebarWidth", value);
      }
    });
  }

  // Indent input
  const indentEl = doc.getElementById("treestyletabs-indent") as HTMLInputElement;
  if (indentEl) {
    indentEl.value = String(prefs.indentSize);
    indentEl.addEventListener("change", () => {
      const value = parseInt(indentEl.value, 10);
      if (!isNaN(value) && value >= 10 && value <= 50) {
        setPref("indentSize", value);
      }
    });
  }

  // Auto-collapse checkbox
  const autoCollapseEl = doc.getElementById("treestyletabs-autocollapse") as HTMLInputElement;
  if (autoCollapseEl) {
    autoCollapseEl.checked = prefs.autoCollapse;
    autoCollapseEl.addEventListener("change", () => {
      setPref("autoCollapse", autoCollapseEl.checked);
    });
  }

  // Collapse on close checkbox
  const collapseOnCloseEl = doc.getElementById("treestyletabs-collapseonclose") as HTMLInputElement;
  if (collapseOnCloseEl) {
    collapseOnCloseEl.checked = prefs.collapseOnClose;
    collapseOnCloseEl.addEventListener("change", () => {
      setPref("collapseOnClose", collapseOnCloseEl.checked);
    });
  }

  // Show close button checkbox
  const showCloseEl = doc.getElementById("treestyletabs-showclose") as HTMLInputElement;
  if (showCloseEl) {
    showCloseEl.checked = prefs.showCloseButton;
    showCloseEl.addEventListener("change", () => {
      setPref("showCloseButton", showCloseEl.checked);
    });
  }

  Zotero.debug("[Tree Style Tabs] Preference scripts registered");
}

/**
 * Make the preferences window object available globally for XHTML
 */
(globalThis as any).TreeStyleTabsPrefs = {
  init() {
    const win = globalThis as unknown as Window;
    registerPrefsScripts(win);
  },
};
