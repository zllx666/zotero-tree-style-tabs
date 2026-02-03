import { config } from "../../package.json";

// Declare globals
declare const Zotero: _ZoteroTypes.Zotero;

export function getPref<T>(key: string): T | undefined {
  const prefKey = `${config.prefsPrefix}.${key}`;
  try {
    return Zotero.Prefs.get(prefKey, true) as T;
  } catch (e) {
    Zotero.debug(`[Tree Style Tabs] Failed to get pref ${key}: ${e}`);
    return undefined;
  }
}

export function setPref<T>(key: string, value: T): void {
  const prefKey = `${config.prefsPrefix}.${key}`;
  try {
    Zotero.Prefs.set(prefKey, value, true);
  } catch (e) {
    Zotero.debug(`[Tree Style Tabs] Failed to set pref ${key}: ${e}`);
  }
}

// Default preference values
export const defaultPrefs = {
  enabled: true,
  sidebarWidth: 250,
  indentSize: 20,
  autoCollapse: false,
  collapseOnClose: true,
  showCloseButton: true,
  position: "left",
};

export function getPrefs() {
  return {
    enabled: getPref<boolean>("enabled") ?? defaultPrefs.enabled,
    sidebarWidth: getPref<number>("sidebarWidth") ?? defaultPrefs.sidebarWidth,
    indentSize: getPref<number>("indentSize") ?? defaultPrefs.indentSize,
    autoCollapse: getPref<boolean>("autoCollapse") ?? defaultPrefs.autoCollapse,
    collapseOnClose: getPref<boolean>("collapseOnClose") ?? defaultPrefs.collapseOnClose,
    showCloseButton: getPref<boolean>("showCloseButton") ?? defaultPrefs.showCloseButton,
    position: getPref<string>("position") ?? defaultPrefs.position,
  };
}
