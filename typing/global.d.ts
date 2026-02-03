// Global type declarations for Tree Style Tabs

declare const __env__: "development" | "production";
declare const rootURI: string;

// Extend Zotero types
declare namespace _ZoteroTypes {
  interface Zotero {
    TreeStyleTabs: import("../src/addon").default;
    [key: string]: any;
    Fluent?: {
      getString?: (key: string, params?: Record<string, string>) => string;
      addResourceId?: (id: string) => void;
      registerLocales?: (id: string) => void;
      unregisterLocales?: (id: string) => void;
    };
    Prefs: {
      get: (key: string, global?: boolean) => unknown;
      set: (key: string, value: unknown, global?: boolean) => void;
    };
    Notifier: {
      registerObserver: (observer: any, types: string[]) => string;
      unregisterAllObservers: () => void;
    };
    getMainWindow: () => Window | null;
    getActiveZoteroPane: () => any;
    initializationPromise: Promise<void>;
    debug: (msg: string) => void;
  }

  interface ZoteroPane {
    selectItem: (id: number) => void;
    getSelectedItems: () => any[];
  }
}

// Zotero_Tabs interface
interface ZoteroTabs {
  _tabs: Array<{
    id: string;
    type: string;
    title: string;
    data?: any;
  }>;
  selectedID: string;
  select: (id: string) => void;
  close: (id: string) => void;
  add: (options: any) => string;
}

declare const Zotero_Tabs: ZoteroTabs;
