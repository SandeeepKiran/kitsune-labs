# Changelog

All changes to Kitsune Labs, newest first. Versions follow [semver](https://semver.org/).

## 2.1.3 - 2026-10-15 - Fix Kitsune emblem SVG & Firefox animation coordinates

- Fixed the hero/empty-state Kitsune emblem (`app/src/shared/fox.ts`, `motion.css`) so it always renders the sleek rounded Kitsune app badge in both emblem modes (previously `sigil` mode in Firefox `localStorage` hid the fox head and left a plain circle with detached tail/charm strokes).
- Aligned all SVG `transform-origin` coordinates to the `240x160` viewBox center (`120px 80px`) so animations behave identically in Firefox and Chrome.

## 2.1.2 - 2026-10-15 - Sleek Kitsune favicon, aligned Spotlight search bar & Apple Intelligence Sample data pill

- Updated `app/public/favicon.svg` to match the new sleek curved Kitsune line-art app icon in its pink-plum rounded badge.
- Removed the duplicate `Sample data` link from the top header bar.
- Styled the left sidebar's `Sample data` link as an Apple Intelligence sakura-amethyst neon-glow pill button (`linear-gradient(135deg, #be185d 0%, #9333ea 100%)`).
- Moved the `Search (Ctrl K)` button to the left of the top bar—aligned directly with the `216px` left-sidebar divider line—and enlarged it into a wider Spotlight-style pill with a search icon.

## 2.1.1 - 2026-10-15 - Sticky viewport-fitted left sidebar & sleek segmented theme picker

- Pinned the left sidebar to the viewport (`position: sticky; top: 53px; height: calc(100dvh - 53px)`) so `Settings` and `Sample data` stay anchored at the bottom-left of the screen while only the right workspace scrolls.
- Replaced the native `<select>` dropdown in the top bar with a sleek **Apple Segmented Pill Theme Picker** (`Silver` · `Space Black` · `Sakura`), and redesigned the `/settings/` appearance cards into 3-up macOS System Settings window thumbnails.

## 2.1.0 - 2026-10-15 - Apple Minimalist Focus Canvas & Sakura-Rose UI

- Replaced the multi-column bento layout on tool pages with a calm, centered **Apple Segmented Focus Canvas** (`1. Input` → `2. Results` → `3. Export & Log`) and generous whitespace.
- Updated buttons to **Option C**: crisp neutral Apple pill for `Load Mousy sample` (`#e8e8ed` in light, `#3a3a3c` in dark) and solid Yae Sakura-Rose (`#be185d`) for `Run`. Zero button gradients.
- Updated the Kitsune logo to a sleek, smooth-curved monoline silhouette in a pink-plum badge (no cartoon face, no 3D polygons).
- Added SF-style monoline icons to every left sidebar item, including the gear icon on `Settings`.
- Updated the three 1-click finishes to **Daylight Silver** (default), **Space Black** (true `#000000` / `#1c1c1e` dark mode), and **Sakura Glass**.

## 2.0.0 - 2026-10-15 - "Argon" UI rewrite

- New persistent left sidebar: Overview, all 9 tools (with `AI` / `RULES` badges), Mousy pack and Settings,
  one click from anywhere. Replaces the top tab strip.
- Sticky top bar with quick pickers for surface theme and artwork mode, plus Sample data, Settings,
  Search (Ctrl K) and the key status chip.
- Tool pages are now a two-column workspace: input and options on the left, live results, export and
  run log on the right.
- Three surface themes: Dark Electro Obsidian (default), Luminous Shrine Tech and Eclipse Hybrid.
- Two artwork modes: Cyber-Kitsune totem (default) and minimal electro sigils.
- New Settings page (`/settings/`) for theme, artwork mode and AI provider, key and model.
- Tests: multi-theme WCAG AA contrast checks and sidebar navigation tests.

## 1.0.0 - 2026-10-13 - First public release

- Nine QA tools with a no-AI rules engine and optional AI (Gemini, ChatGPT, Claude) using the visitor's own key.
- Mousy sample pack with downloadable example files, and a sample data page.
- Yae Miko pastel bento design with motion and accessibility polish.
- Privacy check, licence (GPL-3.0) and README; GitHub Pages deploy from `main`.
