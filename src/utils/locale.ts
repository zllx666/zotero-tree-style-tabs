import { config } from "../../package.json";

// Declare globals
declare const Zotero: _ZoteroTypes.Zotero;
declare const rootURI: string;

export function initLocale() {
  const addon = Zotero[config.addonInstance];
  
  // Register FTL files for Fluent localization
  try {
    Zotero.Fluent.addResourceId?.(`${config.addonRef}-ftl`);
  } catch (e) {
    Zotero.debug(`[Tree Style Tabs] Failed to add Fluent resource: ${e}`);
  }
}

export function getString(key: string, params?: Record<string, string>): string {
  try {
    // Try Fluent first
    const result = Zotero.Fluent?.getString?.(`${config.addonRef}-${key}`, params);
    if (result) return result;
  } catch (e) {
    // Fall through to defaults
  }

  // Fallback strings
  const fallbacks: Record<string, string> = {
    "title": "Tree Style Tabs",
    "context-close": "Close Tab",
    "context-close-tree": "Close Tab and Children",
    "context-collapse": "Collapse Tree",
    "context-expand": "Expand Tree",
    "context-collapse-all": "Collapse All",
    "context-expand-all": "Expand All",
    "context-make-root": "Make Root Tab",
    "context-move-up": "Move Up",
    "context-move-down": "Move Down",
    "empty": "No tabs open",
  };

  return fallbacks[key] || key;
}
