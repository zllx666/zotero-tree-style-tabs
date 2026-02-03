/* eslint-disable no-undef */
var chromeHandle;

// In Zotero 7, bootstrap methods are async and their arguments are different.
// See https://www.zotero.org/support/dev/zotero_7_for_developers

if (typeof Zotero === "undefined") {
  var Zotero;
}

function log(msg) {
  Zotero?.debug?.(`[Tree Style Tabs] ${msg}`);
}

function install(data, reason) {
  log("install");
}

async function startup({ id, version, resourceURI, rootURI }, reason) {
  log("startup");

  await Zotero.initializationPromise;

  // String 'rootURI' introduced in Zotero 7.
  if (!rootURI) {
    rootURI = resourceURI.spec;
  }

  // Add chrome resource
  var aomStartup = Components.classes[
    "@mozilla.org/addons/addon-manager-startup;1"
  ].getService(Components.interfaces.amIAddonManagerStartup);
  var manifestURI = Services.io.newURI(rootURI + "manifest.json");
  chromeHandle = aomStartup.registerChrome(manifestURI, [
    ["content", "__addonRef__", rootURI + "content/"],
  ]);

  // Load scripts
  Services.scriptloader.loadSubScript(
    `${rootURI}/content/scripts/index.js`,
    // Create a shared global sandbox context
    (ctx = {
      // Make Zotero and some global objects available
      Zotero,
      ZoteroPane: Zotero.getActiveZoteroPane(),
      Zotero_Tabs: Zotero.getMainWindow()?.Zotero_Tabs,
      window: Zotero.getMainWindow(),
      document: Zotero.getMainWindow()?.document,
      rootURI,
      console,
      // For compatibility, keep __addonInstance__ as global
      get __addonInstance__() {
        return Zotero.__addonInstance__;
      },
    }),
  );

  log("script loaded");

  // Register shutdown callback
  Zotero.__addonInstance__.hooks.onStartup();

  log("startup finished");
}

async function onMainWindowLoad({ window }, reason) {
  log("onMainWindowLoad");
  Zotero.__addonInstance__?.hooks.onMainWindowLoad(window);
}

async function onMainWindowUnload({ window }, reason) {
  log("onMainWindowUnload");
  Zotero.__addonInstance__?.hooks.onMainWindowUnload(window);
}

function shutdown({ id, version, resourceURI, rootURI }, reason) {
  log("shutdown");

  // Don't run shutdown logic during application quit
  if (reason === APP_SHUTDOWN) {
    return;
  }

  Zotero.__addonInstance__?.hooks.onShutdown();

  // Free resources
  Zotero.Fluent?.unregisterLocales?.("__addonRef__-ftl");

  chromeHandle?.destruct();
  chromeHandle = null;

  log("shutdown finished");
}

function uninstall(data, reason) {
  log("uninstall");
}
