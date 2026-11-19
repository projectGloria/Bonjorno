# Bonjorno — Custom New Tab for Brave Browser

**Bonjorno** is a calm, fast, privacy-first **Manifest V3** New Tab extension designed specifically for **Brave Browser**. It replaces Brave's default New Tab page with a refined, customizable dashboard that works completely locally without an account, subscription, or backend.

---

## Features

### Main Dashboard
- **Clock & Date**: Prominent tabular-numeral clock with 12-hour and 24-hour modes, optional seconds, four typographic styles (`Editorial`, `Display Bold`, `Monospace`, `Minimal`), and configurable date formats (`Long`, `Short`, `Numeric`, `ISO`).
- **Time-of-Day Greeting**: Subtle automatic greeting (`Good morning`, `Good afternoon`, `Good evening`, `Good night`), optional personal name, custom greeting override, or toggle to hide.
- **Search Bar**: Brave Search by default, with instant switching between Brave Search, DuckDuckGo, Google, Startpage, Kagi, Perplexity, GitHub, Wikipedia, YouTube, and custom search engine URLs (`%s`). Supports direct URL detection, `/` to focus from anywhere, `Enter` to search, and `Escape` to clear.
- **Quick Links**: Add, edit, delete, and reorder shortcuts (via drag-and-drop or keyboard-accessible move controls). Uses Brave's local MV3 `/_favicon/` cache with deterministic monogram fallbacks—no external favicon trackers. Supports four layouts: `Grid` (4–8 columns), `Chips`, `Dock`, and `List`.
- **Brave Bookmarks (Optional)**: Slide-over bookmark browser with folder breadcrumbs and instant search across all folders. Requests the `bookmarks` permission only when enabled.
- **Most Visited Sites (Optional)**: Displays frequently visited sites locally via Brave's `topSites` API. Requests permission only when enabled.
- **Tasks & Notes Widgets (Optional)**: Minimal to-do list and local scratchpad persisted in `chrome.storage.local`.
- **Weather Pill (Optional, Opt-In)**: Disabled by default. When explicitly enabled with user consent, queries the public, privacy-friendly [Open-Meteo](https://open-meteo.com/) API for the city you choose and caches results locally for 30 minutes.

### Customization & Settings
- **Appearance**: Dark, Light, and System themes; custom accent color swatches & hex picker; Solid colors, ambient Gradients, self-contained vector Scenes, or local Custom Background Image collections (stored in IndexedDB with automatic optimization, scaling, position, blur, and dim controls); adjustable surface transparency.
- **Layout**: Show or hide individual components, reorder dashboard sections, adjust spacing density (`Compact`, `Comfortable`, `Spacious`), and customize clock, greeting, and shortcut layouts.
- **Behavior**: Default search engine, auto-focus search, open links in new tab, clock/date format, greeting options, and animation controls (respecting `prefers-reduced-motion`).
- **Privacy & Data**: Live Grant/Revoke controls for optional permissions, JSON configuration export/import with schema validation, and Reset to Defaults with confirmation.

---

## Permissions Explained

Bonjorno follows the principle of least privilege:

| Permission | Type | Why It Is Needed |
| --- | --- | --- |
| `storage` | Required | Persists your preferences, quick links, tasks, and notes locally via `chrome.storage.local`. |
| `favicon` | Required | Reads locally cached site favicons via Chromium's `/_favicon/` API without making external network requests. |
| `bookmarks` | Optional | Requested **only** if you enable the Bookmarks drawer, to display and search your Brave bookmarks locally. |
| `topSites` | Optional | Requested **only** if you enable Most Visited Sites, to show frequently visited pages locally. |

Custom uploaded background images are stored locally in the extension's IndexedDB. No analytics, telemetry, ads, or third-party tracking scripts are included.

---

## Installing in Brave (Unpacked Extension)

1. Build the extension (or unzip `release/bonjorno-extension.zip` to a permanent folder):
   ```bash
   npm install
   npm run build
   ```
2. Open Brave and navigate to **`brave://extensions`**.
3. Enable **Developer mode** using the toggle in the top-right corner.
4. Click **Load unpacked**.
5. Select the **`dist/`** directory from this project (or the extracted ZIP folder).
6. Open a new tab (`Ctrl+T` / `Cmd+T`) to launch **Bonjorno**.

---

## Development, Testing & Packaging

### Requirements
- Node.js 20+ and npm

### Commands
```bash
# Install dependencies
npm install

# Run development server (for rapid UI iteration)
npm run dev

# Run unit tests
npm test

# Type-check, generate PNG icons, and build production extension into dist/
npm run build

# Build and package installable ZIP at release/bonjorno-extension.zip
npm run package
```

---

## Project Structure

```text
Bonjorno/
├── public/
│   ├── manifest.json           # Manifest V3 configuration
│   └── icons/                  # Generated 16/32/48/128 PNG extension icons
├── scripts/
│   ├── generate-icons.mjs      # Pure-Node PNG icon generator
│   └── package-zip.mjs         # Packages dist/ into release/bonjorno-extension.zip
├── src/
│   ├── components/             # Dashboard, widgets, bookmarks & settings UI
│   ├── constants/              # Defaults, search engines, wallpapers
│   ├── hooks/                  # Reactive settings & drift-free clock hooks
│   ├── services/               # chromeApi wrapper, settingsStorage, imageStore, weather
│   ├── styles/                 # Design tokens, base styles, component styles
│   ├── types/                  # Strict TypeScript interfaces
│   └── utils/                  # URL validation/search builders & time formatting
├── tests/                      # Vitest unit tests
├── dist/                       # Production build ready to load in Brave
└── release/                    # Packaged bonjorno-extension.zip
```
