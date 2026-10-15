# Changelog

All changes to Kitsune Labs, newest first. Versions follow [semver](https://semver.org/).

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
