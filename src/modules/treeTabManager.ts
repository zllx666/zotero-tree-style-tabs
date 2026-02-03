import { config } from "../../package.json";
import type { TabNode, TreeStructure } from "../addon";
import { getPref } from "../utils/prefs";

// Declare globals
declare const Zotero: _ZoteroTypes.Zotero;
declare const Zotero_Tabs: any;

const STORAGE_KEY = "treeStyleTabs.treeStructure";

/**
 * TreeTabManager - Manages the tree structure of tabs
 * Inspired by Firefox Tree Style Tab by piroor
 */
export class TreeTabManager {
  private static win: Window | null = null;
  private static lastActiveTabId: string | null = null;

  static init(win: Window) {
    this.win = win;
    this.loadTreeStructure();
    Zotero.debug("[Tree Style Tabs] TreeTabManager initialized");
  }

  /**
   * Get the addon data
   */
  private static get data() {
    return Zotero[config.addonInstance]?.data;
  }

  /**
   * Get the tabs map
   */
  private static get tabs(): Map<string, TabNode> {
    return this.data?.treeData.tabs || new Map();
  }

  /**
   * Get the tree structure
   */
  private static get structure(): TreeStructure {
    return this.data?.treeData.structure || { roots: [], collapsed: new Set() };
  }

  /**
   * Sync our tree data with Zotero's actual tabs
   */
  static syncWithZoteroTabs(win: Window): void {
    try {
      const zoteroTabs = (win as any).Zotero_Tabs;
      if (!zoteroTabs?._tabs) return;

      const currentTabIds = new Set<string>();
      const selectedTabId = zoteroTabs.selectedID;

      // Process all Zotero tabs
      zoteroTabs._tabs.forEach((zt: any) => {
        currentTabIds.add(zt.id);

        if (!this.tabs.has(zt.id)) {
          // New tab - add to tree
          this.addTab(zt.id, zt.title || zt.type, zt.type);
        } else {
          // Update existing tab
          const node = this.tabs.get(zt.id)!;
          node.title = zt.title || zt.type;
          node.type = zt.type;
          node.selected = zt.id === selectedTabId;
        }
      });

      // Remove tabs that no longer exist in Zotero
      for (const tabId of this.tabs.keys()) {
        if (!currentTabIds.has(tabId)) {
          this.removeTabFromTree(tabId);
        }
      }

      // Update selection state
      this.tabs.forEach((node) => {
        node.selected = node.id === selectedTabId;
      });

      this.saveTreeStructure();
    } catch (e) {
      Zotero.debug(`[Tree Style Tabs] Error syncing tabs: ${e}`);
    }
  }

  /**
   * Add a new tab to the tree
   */
  static addTab(
    id: string,
    title: string,
    type: string,
    parentId: string | null = null
  ): TabNode {
    // Determine parent - if no explicit parent, use the last active tab
    const effectiveParentId = parentId || this.lastActiveTabId;

    const node: TabNode = {
      id,
      parentId: effectiveParentId,
      childIds: [],
      level: 0,
      collapsed: false,
      title,
      type,
      selected: false,
    };

    // If there's a parent, add as child and calculate level
    if (effectiveParentId && this.tabs.has(effectiveParentId)) {
      const parent = this.tabs.get(effectiveParentId)!;
      parent.childIds.push(id);
      node.level = parent.level + 1;
    } else {
      // No parent - add as root
      node.parentId = null;
      this.structure.roots.push(id);
    }

    this.tabs.set(id, node);
    this.saveTreeStructure();

    return node;
  }

  /**
   * Remove a tab from the tree
   */
  static removeTabFromTree(id: string): void {
    const node = this.tabs.get(id);
    if (!node) return;

    // Handle children - either close them or promote them
    const collapseOnClose = getPref<boolean>("collapseOnClose") ?? true;

    if (collapseOnClose) {
      // Move children to the same level (promote them to parent's parent)
      for (const childId of node.childIds) {
        const child = this.tabs.get(childId);
        if (child) {
          child.parentId = node.parentId;
          child.level = node.level;
          this.updateChildLevels(childId);

          if (node.parentId) {
            const grandparent = this.tabs.get(node.parentId);
            grandparent?.childIds.push(childId);
          } else {
            // Promote to root
            const idx = this.structure.roots.indexOf(childId);
            if (idx === -1) {
              this.structure.roots.push(childId);
            }
          }
        }
      }
    }

    // Remove from parent's children
    if (node.parentId) {
      const parent = this.tabs.get(node.parentId);
      if (parent) {
        const idx = parent.childIds.indexOf(id);
        if (idx !== -1) parent.childIds.splice(idx, 1);
      }
    } else {
      // Remove from roots
      const idx = this.structure.roots.indexOf(id);
      if (idx !== -1) this.structure.roots.splice(idx, 1);
    }

    // Remove from collapsed set
    this.structure.collapsed.delete(id);

    // Remove the tab
    this.tabs.delete(id);
    this.saveTreeStructure();
  }

  /**
   * Update levels of all descendants
   */
  private static updateChildLevels(parentId: string): void {
    const parent = this.tabs.get(parentId);
    if (!parent) return;

    for (const childId of parent.childIds) {
      const child = this.tabs.get(childId);
      if (child) {
        child.level = parent.level + 1;
        this.updateChildLevels(childId);
      }
    }
  }

  /**
   * Handle tab added event from Zotero
   */
  static onTabAdded(
    win: Window,
    ids: string[],
    extraData: Record<string, any>
  ): void {
    const zoteroTabs = (win as any).Zotero_Tabs;

    for (const id of ids) {
      const zt = zoteroTabs?._tabs?.find((t: any) => t.id === id);
      if (zt && !this.tabs.has(id)) {
        this.addTab(id, zt.title || zt.type, zt.type);
      }
    }
  }

  /**
   * Handle tab closed event from Zotero
   */
  static onTabClosed(win: Window, ids: string[]): void {
    for (const id of ids) {
      this.removeTabFromTree(id);
    }
  }

  /**
   * Handle tab selected event from Zotero
   */
  static onTabSelected(win: Window, ids: string[]): void {
    const selectedId = ids[0];

    // Update selection state
    this.tabs.forEach((node) => {
      node.selected = node.id === selectedId;
    });

    // Track last active tab for determining parent of new tabs
    this.lastActiveTabId = selectedId;
  }

  /**
   * Select a tab in Zotero
   */
  static selectTab(win: Window, id: string): void {
    try {
      const zoteroTabs = (win as any).Zotero_Tabs;
      zoteroTabs?.select(id);
    } catch (e) {
      Zotero.debug(`[Tree Style Tabs] Error selecting tab: ${e}`);
    }
  }

  /**
   * Close a tab in Zotero
   */
  static closeTab(win: Window, id: string): void {
    try {
      const zoteroTabs = (win as any).Zotero_Tabs;
      zoteroTabs?.close(id);
    } catch (e) {
      Zotero.debug(`[Tree Style Tabs] Error closing tab: ${e}`);
    }
  }

  /**
   * Close a tab and all its descendants
   */
  static closeTabTree(win: Window, id: string): void {
    const descendants = this.getDescendants(id);

    // Close in reverse order (children first)
    for (let i = descendants.length - 1; i >= 0; i--) {
      this.closeTab(win, descendants[i]);
    }
    this.closeTab(win, id);
  }

  /**
   * Get all descendant IDs of a tab
   */
  static getDescendants(id: string): string[] {
    const result: string[] = [];
    const node = this.tabs.get(id);
    if (!node) return result;

    for (const childId of node.childIds) {
      result.push(childId);
      result.push(...this.getDescendants(childId));
    }

    return result;
  }

  /**
   * Toggle collapsed state of a tab
   */
  static toggleCollapsed(id: string): void {
    const node = this.tabs.get(id);
    if (!node || node.childIds.length === 0) return;

    node.collapsed = !node.collapsed;

    if (node.collapsed) {
      this.structure.collapsed.add(id);
    } else {
      this.structure.collapsed.delete(id);

      // Auto-collapse siblings if preference is set
      const autoCollapse = getPref<boolean>("autoCollapse");
      if (autoCollapse) {
        this.autoCollapseSiblings(id);
      }
    }

    this.saveTreeStructure();
  }

  /**
   * Collapse all sibling tabs when expanding one
   */
  private static autoCollapseSiblings(expandedId: string): void {
    const node = this.tabs.get(expandedId);
    if (!node) return;

    const siblingIds = node.parentId
      ? this.tabs.get(node.parentId)?.childIds || []
      : this.structure.roots;

    for (const siblingId of siblingIds) {
      if (siblingId !== expandedId) {
        const sibling = this.tabs.get(siblingId);
        if (sibling && sibling.childIds.length > 0) {
          sibling.collapsed = true;
          this.structure.collapsed.add(siblingId);
        }
      }
    }
  }

  /**
   * Collapse all tabs
   */
  static collapseAll(win: Window): void {
    this.tabs.forEach((node) => {
      if (node.childIds.length > 0) {
        node.collapsed = true;
        this.structure.collapsed.add(node.id);
      }
    });
    this.saveTreeStructure();
  }

  /**
   * Expand all tabs
   */
  static expandAll(win: Window): void {
    this.tabs.forEach((node) => {
      node.collapsed = false;
    });
    this.structure.collapsed.clear();
    this.saveTreeStructure();
  }

  /**
   * Move a tab to be a child of another tab (for drag & drop)
   */
  static attachTabTo(tabId: string, newParentId: string | null): void {
    const tab = this.tabs.get(tabId);
    if (!tab) return;

    // Prevent circular reference
    if (newParentId) {
      const descendants = this.getDescendants(tabId);
      if (descendants.includes(newParentId)) return;
    }

    // Remove from old parent
    if (tab.parentId) {
      const oldParent = this.tabs.get(tab.parentId);
      if (oldParent) {
        const idx = oldParent.childIds.indexOf(tabId);
        if (idx !== -1) oldParent.childIds.splice(idx, 1);
      }
    } else {
      const idx = this.structure.roots.indexOf(tabId);
      if (idx !== -1) this.structure.roots.splice(idx, 1);
    }

    // Add to new parent
    tab.parentId = newParentId;

    if (newParentId) {
      const newParent = this.tabs.get(newParentId);
      if (newParent) {
        newParent.childIds.push(tabId);
        tab.level = newParent.level + 1;
      }
    } else {
      this.structure.roots.push(tabId);
      tab.level = 0;
    }

    this.updateChildLevels(tabId);
    this.saveTreeStructure();
  }

  /**
   * Make a tab a root tab (remove parent relationship)
   */
  static makeRootTab(tabId: string): void {
    this.attachTabTo(tabId, null);
  }

  /**
   * Move tab up in the sibling order
   */
  static moveUp(tabId: string): void {
    const tab = this.tabs.get(tabId);
    if (!tab) return;

    const siblings = tab.parentId
      ? this.tabs.get(tab.parentId)?.childIds
      : this.structure.roots;

    if (!siblings) return;

    const idx = siblings.indexOf(tabId);
    if (idx > 0) {
      siblings.splice(idx, 1);
      siblings.splice(idx - 1, 0, tabId);
      this.saveTreeStructure();
    }
  }

  /**
   * Move tab down in the sibling order
   */
  static moveDown(tabId: string): void {
    const tab = this.tabs.get(tabId);
    if (!tab) return;

    const siblings = tab.parentId
      ? this.tabs.get(tab.parentId)?.childIds
      : this.structure.roots;

    if (!siblings) return;

    const idx = siblings.indexOf(tabId);
    if (idx < siblings.length - 1) {
      siblings.splice(idx, 1);
      siblings.splice(idx + 1, 0, tabId);
      this.saveTreeStructure();
    }
  }

  /**
   * Get tabs in tree order (for rendering)
   */
  static getTabsInTreeOrder(): TabNode[] {
    const result: TabNode[] = [];

    const addWithChildren = (
      id: string,
      isHidden: boolean = false
    ): void => {
      const node = this.tabs.get(id);
      if (!node) return;

      // Clone to avoid modifying the original
      const tabForDisplay = { ...node };
      result.push(tabForDisplay);

      // Add children if not collapsed
      const shouldHideChildren = isHidden || node.collapsed;
      for (const childId of node.childIds) {
        addWithChildren(childId, shouldHideChildren);
      }
    };

    // Start from roots
    for (const rootId of this.structure.roots) {
      addWithChildren(rootId);
    }

    return result;
  }

  /**
   * Check if a tab should be visible (not hidden by collapsed ancestor)
   */
  static isTabVisible(tabId: string): boolean {
    const tab = this.tabs.get(tabId);
    if (!tab) return false;

    let current = tab.parentId;
    while (current) {
      const parent = this.tabs.get(current);
      if (!parent) break;
      if (parent.collapsed) return false;
      current = parent.parentId;
    }

    return true;
  }

  /**
   * Get a tab node
   */
  static getTab(id: string): TabNode | undefined {
    return this.tabs.get(id);
  }

  /**
   * Save tree structure to Zotero preferences for persistence
   */
  private static saveTreeStructure(): void {
    try {
      const data = {
        tabs: Array.from(this.tabs.entries()).map(([id, node]) => ({
          id,
          parentId: node.parentId,
          childIds: node.childIds,
          collapsed: node.collapsed,
        })),
        roots: this.structure.roots,
        collapsed: Array.from(this.structure.collapsed),
      };

      Zotero.Prefs.set(
        `${config.prefsPrefix}.${STORAGE_KEY}`,
        JSON.stringify(data),
        true
      );
    } catch (e) {
      Zotero.debug(`[Tree Style Tabs] Error saving tree structure: ${e}`);
    }
  }

  /**
   * Load tree structure from Zotero preferences
   */
  private static loadTreeStructure(): void {
    try {
      const stored = Zotero.Prefs.get(
        `${config.prefsPrefix}.${STORAGE_KEY}`,
        true
      ) as string;

      if (!stored) return;

      const data = JSON.parse(stored);

      // Restore structure
      this.structure.roots = data.roots || [];
      this.structure.collapsed = new Set(data.collapsed || []);

      // We don't fully restore tabs here - they'll be synced with actual Zotero tabs
      // But we store the parent relationships for restoration

      if (data.tabs) {
        for (const tabData of data.tabs) {
          // Store partial data that will be merged during sync
          if (!this.tabs.has(tabData.id)) {
            this.tabs.set(tabData.id, {
              id: tabData.id,
              parentId: tabData.parentId,
              childIds: tabData.childIds || [],
              level: 0,
              collapsed: tabData.collapsed || false,
              title: "",
              type: "",
              selected: false,
            });
          }
        }
      }
    } catch (e) {
      Zotero.debug(`[Tree Style Tabs] Error loading tree structure: ${e}`);
    }
  }
}
