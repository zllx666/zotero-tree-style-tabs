import { config } from "../../package.json";
import { TreeTabManager } from "./treeTabManager";
import { getPrefs, getPref, setPref } from "../utils/prefs";
import { getString } from "../utils/locale";
import type { TabNode } from "../addon";

// Declare globals
declare const Zotero: _ZoteroTypes.Zotero;

/**
 * SidebarUI - Renders the tree-style tab sidebar
 */
export class SidebarUI {
  private static resizing = false;
  private static startX = 0;
  private static startWidth = 0;
  private static contextMenu: HTMLElement | null = null;
  private static contextTabId: string | null = null;

  /**
   * Get addon data
   */
  private static get data() {
    return Zotero[config.addonInstance]?.data;
  }

  /**
   * Create the sidebar UI
   */
  static create(win: Window): void {
    const doc = win.document;

    // Check if already created
    if (doc.getElementById("treestyletabs-sidebar")) {
      return;
    }

    const prefs = getPrefs();

    // Find the main content area to inject sidebar
    const mainContent = doc.querySelector("#main-window") || doc.documentElement;

    // Create sidebar container
    const sidebar = doc.createElement("div");
    sidebar.id = "treestyletabs-sidebar";
    sidebar.style.width = `${prefs.sidebarWidth}px`;

    if (prefs.position === "right") {
      sidebar.classList.add("position-right");
    }

    // Header
    const header = doc.createElement("div");
    header.id = "treestyletabs-header";

    const title = doc.createElement("span");
    title.id = "treestyletabs-title";
    title.textContent = getString("title");

    const toolbar = doc.createElement("div");
    toolbar.id = "treestyletabs-toolbar";

    // Collapse all button
    const collapseAllBtn = doc.createElement("button");
    collapseAllBtn.className = "treestyletabs-toolbar-button";
    collapseAllBtn.textContent = "⊟";
    collapseAllBtn.title = getString("context-collapse-all");
    collapseAllBtn.addEventListener("click", () => {
      TreeTabManager.collapseAll(win);
      this.refresh(win);
    });

    // Expand all button
    const expandAllBtn = doc.createElement("button");
    expandAllBtn.className = "treestyletabs-toolbar-button";
    expandAllBtn.textContent = "⊞";
    expandAllBtn.title = getString("context-expand-all");
    expandAllBtn.addEventListener("click", () => {
      TreeTabManager.expandAll(win);
      this.refresh(win);
    });

    toolbar.appendChild(collapseAllBtn);
    toolbar.appendChild(expandAllBtn);

    header.appendChild(title);
    header.appendChild(toolbar);
    sidebar.appendChild(header);

    // Tab list container
    const tabList = doc.createElement("div");
    tabList.id = "treestyletabs-tablist";
    sidebar.appendChild(tabList);

    // Store reference
    this.data.ui.sidebar = sidebar;
    this.data.ui.tabList = tabList;

    // Load stylesheet
    this.loadStylesheet(win);

    // Find insertion point - try to insert next to the tab bar
    const tabsToolbar = doc.querySelector("#tabs-deck") || 
                        doc.querySelector("#main-window > hbox") ||
                        doc.querySelector("#browser");

    if (tabsToolbar?.parentElement) {
      if (prefs.position === "right") {
        tabsToolbar.parentElement.appendChild(sidebar);
      } else {
        tabsToolbar.parentElement.insertBefore(sidebar, tabsToolbar);
      }
    } else {
      // Fallback - append to body
      doc.body?.appendChild(sidebar);
    }

    // Create resize handle
    this.createResizeHandle(win, sidebar);

    // Initial render
    this.refresh(win);

    // Track elements for cleanup
    this.trackElement(win, sidebar);

    Zotero.debug("[Tree Style Tabs] Sidebar created");
  }

  /**
   * Load the CSS stylesheet
   */
  private static loadStylesheet(win: Window): void {
    const doc = win.document;

    // Check if already loaded
    if (doc.getElementById("treestyletabs-stylesheet")) {
      return;
    }

    const link = doc.createElement("link");
    link.id = "treestyletabs-stylesheet";
    link.rel = "stylesheet";
    link.type = "text/css";
    link.href = `chrome://${config.addonRef}/content/treestyletabs.css`;
    doc.head?.appendChild(link);

    this.trackElement(win, link);
  }

  /**
   * Create resize handle for the sidebar
   */
  private static createResizeHandle(win: Window, sidebar: HTMLElement): void {
    const doc = win.document;
    const prefs = getPrefs();

    const resizer = doc.createElement("div");
    resizer.id = "treestyletabs-resizer";

    // Position based on sidebar position
    resizer.style.position = "absolute";
    resizer.style.top = "0";
    resizer.style.bottom = "0";
    resizer.style[prefs.position === "right" ? "left" : "right"] = "0";

    resizer.addEventListener("mousedown", (e) => {
      this.resizing = true;
      this.startX = e.clientX;
      this.startWidth = sidebar.offsetWidth;
      resizer.classList.add("resizing");
      e.preventDefault();
    });

    win.addEventListener("mousemove", (e) => {
      if (!this.resizing) return;

      const diff = prefs.position === "right"
        ? this.startX - e.clientX
        : e.clientX - this.startX;

      const newWidth = Math.min(400, Math.max(180, this.startWidth + diff));
      sidebar.style.width = `${newWidth}px`;
    });

    win.addEventListener("mouseup", () => {
      if (this.resizing) {
        this.resizing = false;
        resizer.classList.remove("resizing");
        setPref("sidebarWidth", sidebar.offsetWidth);
      }
    });

    sidebar.appendChild(resizer);
    this.trackElement(win, resizer);
  }

  /**
   * Refresh the tab list display
   */
  static refresh(win: Window): void {
    const tabList = this.data?.ui.tabList;
    if (!tabList) return;

    const doc = win.document;
    const prefs = getPrefs();

    // Clear existing tabs
    tabList.innerHTML = "";

    // Get tabs in tree order
    const tabs = TreeTabManager.getTabsInTreeOrder();

    if (tabs.length === 0) {
      const empty = doc.createElement("div");
      empty.id = "treestyletabs-empty-state";
      empty.textContent = getString("empty");
      tabList.appendChild(empty);
      return;
    }

    // Render each tab
    for (const tab of tabs) {
      const isVisible = TreeTabManager.isTabVisible(tab.id);
      const tabEl = this.createTabElement(win, tab, !isVisible);
      tabList.appendChild(tabEl);
    }
  }

  /**
   * Create a tab element
   */
  private static createTabElement(
    win: Window,
    tab: TabNode,
    hidden: boolean
  ): HTMLElement {
    const doc = win.document;
    const prefs = getPrefs();

    const tabEl = doc.createElement("div");
    tabEl.className = "treestyletabs-tab";
    tabEl.dataset.tabId = tab.id;
    tabEl.dataset.level = String(tab.level);

    // Apply indentation
    const indent = tab.level * prefs.indentSize;
    tabEl.style.paddingLeft = `${8 + indent}px`;

    // Classes for state
    if (tab.selected) tabEl.classList.add("selected");
    if (tab.childIds.length > 0) tabEl.classList.add("has-children");
    if (!tab.collapsed && tab.childIds.length > 0) tabEl.classList.add("expanded");
    if (hidden) tabEl.classList.add("hidden");

    // Twisty (expand/collapse control)
    const twisty = doc.createElement("span");
    twisty.className = "treestyletabs-twisty";
    twisty.addEventListener("click", (e) => {
      e.stopPropagation();
      TreeTabManager.toggleCollapsed(tab.id);
      this.refresh(win);
    });

    // Favicon
    const favicon = doc.createElement("span");
    favicon.className = "treestyletabs-tab-favicon";
    this.setTabIcon(favicon, tab.type);

    // Title
    const title = doc.createElement("span");
    title.className = "treestyletabs-tab-title";
    title.textContent = tab.title || this.getTabTypeLabel(tab.type);

    // Close button
    const closeBtn = doc.createElement("span");
    closeBtn.className = "treestyletabs-tab-close";
    closeBtn.textContent = "×";
    closeBtn.style.display = prefs.showCloseButton ? "flex" : "none";
    closeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      TreeTabManager.closeTab(win, tab.id);
    });

    // Assemble
    tabEl.appendChild(twisty);
    tabEl.appendChild(favicon);
    tabEl.appendChild(title);
    tabEl.appendChild(closeBtn);

    // Click to select tab
    tabEl.addEventListener("click", () => {
      TreeTabManager.selectTab(win, tab.id);
    });

    // Context menu
    tabEl.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      this.showContextMenu(win, tab.id, e.clientX, e.clientY);
    });

    // Drag & drop support
    tabEl.draggable = true;
    tabEl.addEventListener("dragstart", (e) => {
      e.dataTransfer?.setData("text/plain", tab.id);
      tabEl.classList.add("dragging");
    });

    tabEl.addEventListener("dragend", () => {
      tabEl.classList.remove("dragging");
    });

    tabEl.addEventListener("dragover", (e) => {
      e.preventDefault();
      tabEl.classList.add("drop-target");
    });

    tabEl.addEventListener("dragleave", () => {
      tabEl.classList.remove("drop-target");
    });

    tabEl.addEventListener("drop", (e) => {
      e.preventDefault();
      tabEl.classList.remove("drop-target");

      const draggedId = e.dataTransfer?.getData("text/plain");
      if (draggedId && draggedId !== tab.id) {
        // Attach dragged tab as child of this tab
        TreeTabManager.attachTabTo(draggedId, tab.id);
        this.refresh(win);
      }
    });

    return tabEl;
  }

  /**
   * Set appropriate icon for tab type
   */
  private static setTabIcon(element: HTMLElement, type: string): void {
    const icons: Record<string, string> = {
      library: "📚",
      reader: "📄",
      "zotero-pane": "🏠",
    };

    element.textContent = icons[type] || "📄";
  }

  /**
   * Get human-readable label for tab type
   */
  private static getTabTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      library: "Library",
      reader: "Reader",
      "zotero-pane": "My Library",
    };

    return labels[type] || type;
  }

  /**
   * Show context menu for a tab
   */
  private static showContextMenu(
    win: Window,
    tabId: string,
    x: number,
    y: number
  ): void {
    this.hideContextMenu(win);

    const doc = win.document;
    this.contextTabId = tabId;

    const menu = doc.createElement("div");
    menu.className = "treestyletabs-context-menu";
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;

    const tab = TreeTabManager.getTab(tabId);
    const hasChildren = tab?.childIds && tab.childIds.length > 0;

    const items = [
      { label: getString("context-close"), action: () => TreeTabManager.closeTab(win, tabId) },
      ...(hasChildren
        ? [{ label: getString("context-close-tree"), action: () => TreeTabManager.closeTabTree(win, tabId) }]
        : []),
      { type: "separator" },
      ...(hasChildren
        ? [
            {
              label: tab?.collapsed ? getString("context-expand") : getString("context-collapse"),
              action: () => {
                TreeTabManager.toggleCollapsed(tabId);
                this.refresh(win);
              },
            },
          ]
        : []),
      { label: getString("context-collapse-all"), action: () => {
        TreeTabManager.collapseAll(win);
        this.refresh(win);
      }},
      { label: getString("context-expand-all"), action: () => {
        TreeTabManager.expandAll(win);
        this.refresh(win);
      }},
      { type: "separator" },
      { label: getString("context-make-root"), action: () => {
        TreeTabManager.makeRootTab(tabId);
        this.refresh(win);
      }},
      { label: getString("context-move-up"), action: () => {
        TreeTabManager.moveUp(tabId);
        this.refresh(win);
      }},
      { label: getString("context-move-down"), action: () => {
        TreeTabManager.moveDown(tabId);
        this.refresh(win);
      }},
    ];

    for (const item of items) {
      if (item.type === "separator") {
        const sep = doc.createElement("div");
        sep.className = "treestyletabs-context-menu-separator";
        menu.appendChild(sep);
      } else {
        const menuItem = doc.createElement("div");
        menuItem.className = "treestyletabs-context-menu-item";
        menuItem.textContent = item.label;
        menuItem.addEventListener("click", () => {
          item.action?.();
          this.hideContextMenu(win);
        });
        menu.appendChild(menuItem);
      }
    }

    doc.body?.appendChild(menu);
    this.contextMenu = menu;

    // Close on click outside
    const closeHandler = (e: MouseEvent) => {
      if (!menu.contains(e.target as Node)) {
        this.hideContextMenu(win);
        doc.removeEventListener("click", closeHandler);
      }
    };

    // Delay to avoid immediate close
    setTimeout(() => {
      doc.addEventListener("click", closeHandler);
    }, 0);
  }

  /**
   * Hide context menu
   */
  private static hideContextMenu(win: Window): void {
    if (this.contextMenu) {
      this.contextMenu.remove();
      this.contextMenu = null;
      this.contextTabId = null;
    }
  }

  /**
   * Toggle sidebar visibility
   */
  static toggle(win: Window): void {
    const sidebar = this.data?.ui.sidebar;
    if (sidebar) {
      const isHidden = sidebar.style.display === "none";
      sidebar.style.display = isHidden ? "flex" : "none";
    }
  }

  /**
   * Track element for cleanup
   */
  private static trackElement(win: Window, element: HTMLElement): void {
    if (!this.data.ui.registeredElements.has(win)) {
      this.data.ui.registeredElements.set(win, []);
    }
    this.data.ui.registeredElements.get(win)?.push(element);
  }

  /**
   * Destroy sidebar for a specific window
   */
  static destroyForWindow(win: Window): void {
    const elements = this.data?.ui.registeredElements.get(win);
    if (elements) {
      for (const el of elements) {
        el.remove();
      }
      this.data.ui.registeredElements.delete(win);
    }

    this.hideContextMenu(win);
  }

  /**
   * Destroy all sidebar instances
   */
  static destroy(): void {
    const addon = Zotero[config.addonInstance];
    if (!addon?.data.ui) return;

    // Clean up references
    addon.data.ui.sidebar = undefined;
    addon.data.ui.tabList = undefined;

    Zotero.debug("[Tree Style Tabs] Sidebar destroyed");
  }
}
