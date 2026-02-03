import { config } from "../package.json";
import Addon from "./addon";
import { createZToolkit } from "./utils/ztoolkit";

// Declare global variables
declare const rootURI: string;
declare const Zotero: _ZoteroTypes.Zotero;
declare const __env__: "development" | "production";

// Create addon instance
const addon = new Addon();
addon.data.rootURI = rootURI;
addon.data.env = __env__;

// Initialize ztoolkit
addon.data.ztoolkit = createZToolkit();

// Expose addon to global scope
Zotero[config.addonInstance] = addon;

export default addon;
