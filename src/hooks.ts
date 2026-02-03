import { config } from "../package.json";
import { getString, initLocale } from "./utils/locale";
import { registerPrefsScripts } from "./modules/preferenceScript";
import { TreeTabManager } from "./modules/treeTabManager";
import { SidebarUI } from "./modules/sidebarUI";

// Declare globals
declare const Zotero: _ZoteroTypes.Zotero;
declare const ZoteroPane: _ZoteroTypes.ZoteroPane;
declare const Zotero_Tabs: any;
declare const window: Window;
declare const document: Document;

function onStartup() {
  const addon = Zotero[config.addonInstance];
  addon.data.alive = true;

  // Initialize locale
  initLocale();

  // Register tab notifier to track tab changes
  registerNotifier();

  Zotero.debug("[Tree Style Tabs] onStartup completed");
}

function onShutdown() {
  const addon = Zotero[config.addonInstance];
  addon.data.alive = false;

  // Clean up all registered elements
  SidebarUI.destroy();

  // Unregister notifier
  Zotero.Notifier.unregisterAllObservers();

  Zotero.debug("[Tree Style Tabs] onShutdown completed");
}

function onMainWindowLoad(win: Window) {
  const addon = Zotero[config.addonInstance];
  
  if (!addon.data.alive) return;

  // Initialize tree tab manager
  TreeTabManager.init(win);

  // Create sidebar UI
  SidebarUI.create(win);

  // Initial sync with existing tabs
  TreeTabManager.syncWithZoteroTabs(win);

  Zotero.debug("[Tree Style Tabs] onMainWindowLoad completed");
}

function onMainWindowUnload(win: Window) {
  // Clean up window-specific resources
  SidebarUI.destroyForWindow(win);

  Zotero.debug("[Tree Style Tabs] onMainWindowUnload completed");
}

function registerNotifier() {
  const callback = {
    notify: (
      event: string,
      type: string,
      ids: string[],
      extraData: Record<string, any>
    ) => {
      if (!Zotero[config.addonInstance]?.data.alive) return;
      onNotify(event, type, ids, extraData);
    },
  };

  // Register for tab events
  Zotero.Notifier.registerObserver(callback, ["tab"]);
}

function onNotify(
  event: string,
  type: string,
  ids: string[],
  extraData: Record<string, any>
) {
  const win = Zotero.getMainWindow();
  if (!win) return;

  if (type === "tab") {
    switch (event) {
      case "add":
        TreeTabManager.onTabAdded(win, ids, extraData);
        break;
      case "close":
        TreeTabManager.onTabClosed(win, ids);
        break;
      case "select":
        TreeTabManager.onTabSelected(win, ids);
        break;
    }
    SidebarUI.refresh(win);
  }
}

function onPrefsEvent(type: string, data: Record<string, any>) {
  switch (type) {
    case "load":
      registerPrefsScripts(data.window);
      break;
    default:
      return;
  }
}

function onShortcuts(type: string) {
  const win = Zotero.getMainWindow();
  if (!win) return;

  switch (type) {
    case "toggle-sidebar":
      SidebarUI.toggle(win);
      break;
    case "collapse-all":
      TreeTabManager.collapseAll(win);
      SidebarUI.refresh(win);
      break;
    case "expand-all":
      TreeTabManager.expandAll(win);
      SidebarUI.refresh(win);
      break;
  }
}

export default {
  onStartup,
  onShutdown,
  onMainWindowLoad,
  onMainWindowUnload,
  onNotify,
  onPrefsEvent,
  onShortcuts,
};
