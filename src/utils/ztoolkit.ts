import { config } from "../../package.json";
import { ZoteroToolkit } from "zotero-plugin-toolkit";

// Declare globals
declare const Zotero: _ZoteroTypes.Zotero;

export function createZToolkit() {
  const ztoolkit = new ZoteroToolkit();

  // Set toolkit globals
  ztoolkit.basicOptions.log.prefix = `[${config.addonName}]`;
  ztoolkit.basicOptions.log.disableConsole =
    Zotero[config.addonInstance]?.data.env === "production";

  // UI options
  ztoolkit.UI.basicOptions.ui.enableElementJSONLog =
    Zotero[config.addonInstance]?.data.env === "development";
  ztoolkit.UI.basicOptions.ui.enableElementRecord =
    Zotero[config.addonInstance]?.data.env === "development";

  return ztoolkit;
}

export function getZToolkit() {
  return Zotero[config.addonInstance]?.data.ztoolkit;
}
