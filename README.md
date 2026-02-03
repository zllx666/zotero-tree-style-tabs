# Tree Style Tabs for Zotero

A Zotero 8 plugin that provides tree-style tab management, inspired by [Tree Style Tab](https://github.com/piroor/treestyletab) for Firefox.

![Zotero 8](https://img.shields.io/badge/Zotero-8-blue)
![License](https://img.shields.io/badge/License-AGPL--3.0-green)

## Features

- **Tree-style Tab Sidebar**: View and manage your tabs in a vertical tree hierarchy
- **Parent-Child Relationships**: New tabs automatically become children of the currently selected tab
- **Collapsible Trees**: Collapse and expand tab subtrees to reduce clutter
- **Drag & Drop**: Reorganize tabs by dragging them to new positions or parents
- **Persistence**: Tree structure is saved and restored across sessions
- **Customizable**: Configure sidebar position, width, indentation, and behavior

## Screenshots

*Coming soon*

## Installation

### From Release (Recommended)

1. Download the latest `.xpi` file from the [Releases](https://github.com/colobas/zotero-tree-style-tabs/releases) page
2. In Zotero, go to **Tools** → **Add-ons**
3. Click the gear icon and select **Install Add-on From File...**
4. Select the downloaded `.xpi` file
5. Restart Zotero

### From Source

1. Clone this repository:
   ```bash
   git clone https://github.com/colobas/zotero-tree-style-tabs.git
   cd zotero-tree-style-tabs
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the plugin:
   ```bash
   npm run build
   ```

4. Install the generated `.xpi` file in Zotero

## Development

### Prerequisites

- Node.js 18+
- Zotero 8

### Setup

1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and configure:
   ```bash
   cp .env.example .env
   ```

3. Edit `.env` to set your Zotero path and profile:

   **macOS:**
   ```
   ZOTERO_BIN=/Applications/Zotero.app/Contents/MacOS/zotero
   ZOTERO_PROFILE=default
   ```

   **Windows:**
   ```
   ZOTERO_BIN=C:\Program Files (x86)\Zotero\zotero.exe
   ZOTERO_PROFILE=default
   ```

   **Linux:**
   ```
   ZOTERO_BIN=/usr/bin/zotero
   ZOTERO_PROFILE=default
   ```

   > **Note:** The script will auto-detect these default paths, but you may need to adjust if Zotero is installed in a non-standard location.

### Commands

| Command | Description |
|---------|-------------|
| `npm start` | Start development with hot reload |
| `npm run build` | Build production version |
| `npm run build:dev` | Build development version |
| `npm run lint` | Fix code style with Prettier and ESLint |
| `npm run lint:check` | Check code style |
| `npm run release` | Build and bump version |

### Project Structure

```
zotero-tree-style-tabs/
├── addon/                  # Static addon files
│   ├── bootstrap.js        # Zotero bootstrap script
│   ├── manifest.json       # Addon manifest
│   ├── prefs.js           # Default preferences
│   ├── content/           # Content files
│   │   ├── preferences.xhtml
│   │   └── treestyletabs.css
│   └── locale/            # Localization files
│       ├── en-US/
│       └── zh-CN/
├── src/                   # TypeScript source
│   ├── index.ts          # Entry point
│   ├── addon.ts          # Addon class
│   ├── hooks.ts          # Lifecycle hooks
│   ├── modules/          # Feature modules
│   │   ├── treeTabManager.ts   # Tree structure logic
│   │   ├── sidebarUI.ts        # Sidebar rendering
│   │   └── preferenceScript.ts # Preferences
│   └── utils/            # Utility functions
│       ├── locale.ts
│       ├── prefs.ts
│       └── ztoolkit.ts
├── scripts/              # Build scripts
│   ├── build.mjs
│   ├── start.mjs
│   └── release.mjs
└── typing/              # TypeScript declarations
    └── global.d.ts
```

## Configuration

Access preferences via **Tools** → **Add-ons** → **Tree Style Tabs** → **Preferences**

| Option | Description | Default |
|--------|-------------|---------|
| Sidebar Position | Left or right side | Left |
| Sidebar Width | Width in pixels | 250 |
| Indent Size | Child tab indentation | 20px |
| Auto-collapse | Collapse siblings when expanding | Off |
| Collapse on Close | Promote children when closing parent | On |
| Show Close Button | Show × button on hover | On |

## Usage

### Basic Operations

- **Select Tab**: Click on a tab in the sidebar
- **Close Tab**: Click the × button or right-click → Close Tab
- **Collapse/Expand**: Click the twisty arrow or right-click → Collapse/Expand
- **Move Tab**: Drag and drop to reorder or change parent

### Keyboard Shortcuts

*Coming in future versions*

### Context Menu

Right-click on any tab for options:
- Close Tab
- Close Tab and Children
- Collapse/Expand Tree
- Collapse All / Expand All
- Make Root Tab
- Move Up / Move Down

## How It Works

Tree Style Tabs integrates with Zotero's tab system by:

1. **Observing Tab Events**: Listens to Zotero's tab notifier for add/close/select events
2. **Managing Tree Structure**: Maintains parent-child relationships in a separate data structure
3. **Rendering Sidebar**: Displays tabs in a tree view with proper indentation
4. **Persisting State**: Saves tree structure to Zotero preferences

New tabs automatically become children of the currently active tab, creating a natural browsing hierarchy similar to Firefox's Tree Style Tab.

### Platform Support

- ✅ **macOS** - Fully tested on Zotero 8
- ✅ **Windows** - Should work (cross-platform code)
- ✅ **Linux** - Should work (cross-platform code)

The development server (`npm start`) auto-detects your platform and Zotero installation paths.

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit your changes: `git commit -m "Add feature"`
4. Push to the branch: `git push origin feature-name`
5. Open a Pull Request

## License

This project is licensed under the [GNU Affero General Public License v3.0](LICENSE).

Based on [zotero-plugin-template](https://github.com/windingwind/zotero-plugin-template) by windingwind.

## Acknowledgments

- [zotero-plugin-template](https://github.com/windingwind/zotero-plugin-template) by windingwind
- [Tree Style Tab](https://github.com/piroor/treestyletab) by piroor - the original Firefox extension that inspired this plugin
- [Zotero](https://www.zotero.org/) team for the amazing reference manager

## Support

- [Open an issue](https://github.com/colobas/zotero-tree-style-tabs/issues) for bugs or feature requests
- Check [existing issues](https://github.com/colobas/zotero-tree-style-tabs/issues) before creating a new one
