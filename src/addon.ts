import { config } from "../package.json";
import hooks from "./hooks";
import { createZToolkit } from "./utils/ztoolkit";

class Addon {
  public data: {
    alive: boolean;
    config: typeof config;
    env: "development" | "production";
    rootURI: string;
    ztoolkit: ReturnType<typeof createZToolkit>;
    locale?: {
      current: any;
    };
    treeData: {
      tabs: Map<string, TabNode>;
      structure: TreeStructure;
    };
    ui: {
      sidebar?: HTMLElement;
      tabList?: HTMLElement;
      registeredElements: WeakMap<Window, HTMLElement[]>;
    };
  };

  public hooks: typeof hooks;
  public api: Record<string, unknown>;

  constructor() {
    this.data = {
      alive: true,
      config,
      env: "development",
      rootURI: "",
      ztoolkit: createZToolkit(),
      treeData: {
        tabs: new Map(),
        structure: {
          roots: [],
          collapsed: new Set(),
        },
      },
      ui: {
        registeredElements: new WeakMap(),
      },
    };
    this.hooks = hooks;
    this.api = {};
  }
}

export interface TabNode {
  id: string;
  parentId: string | null;
  childIds: string[];
  level: number;
  collapsed: boolean;
  title: string;
  type: string;
  selected: boolean;
}

export interface TreeStructure {
  roots: string[];
  collapsed: Set<string>;
}

export default Addon;
