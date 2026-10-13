# 04 - Decisions

| ID | Decision | Status | Date |
|---|---|---|---|
| D1 | Name: **Kitsune Labs** (two words; subtle Genshin/Inazuma nod, reads as an engineering team) | Decided | 2026-10-11 |
| D2 | Palette: **pastel Yae Miko** (lilac + sakura + butter gold on soft lavender-white, ink plum text). Exact tokens in `03-design-system.md`. The old deep sakura->navy gradient is retired. | Decided | 2026-10-13 |
| D9 | Visual style: **Bento tiles**. Reference: `docs\design-reference\bento-app-lavender-dusk.html` (tool pages) + `home-fox-landing.html` (home page). | Decided | 2026-10-13 |
| D3 | Layout: **Fox landing home** (hero + 9 tool tiles, Ctrl+K) -> **bento tool page** per tool (hero answer tile, input tile, findings tile, run log tile). AI key settings in a **slide-in drawer** from the right. Bulk jobs use a **stepper** with nine-tail progress. | Decided | 2026-10-13 |
| D10 | Motion: yes, and part of the brand. List in `03-design-system.md` "Motion". Every animation is off under `prefers-reduced-motion`. | Decided | 2026-10-13 |
| D4 | Stack: **Vite + vanilla TypeScript**, static site, no backend, no framework. Shared UI in `app\src\shared\`. | Decided | 2026-10-13 |
| D5 | Ship order: see `06-build-plan.md` (shell + sample data first, then no-AI tools, then AI tools). | Decided | 2026-10-13 |
| D6 | Transcript Converter outputs **open formats only**: .txt, .json, .yaml (+ .zip for bulk). | Decided | 2026-10-13 |
| D7 | Hosting: GitHub Pages on the owner's personal account (`https://sandeeepkiran.github.io/kitsune-labs/`), deployed by a GitHub Actions workflow (M5), linked from the portfolio site. Free Pages needs a **public** repo, so the site goes live when the repo goes public after Batch C. | Decided | 2026-10-13 |
| D8 | Mock company: **Mousy**, bot "Mousy Assist" (online-shop support) | Decided | 2026-10-11 |
| D11 | Sample data: **Mousy sample pack**, built by a local script from the *shape* of a private real export, never its content. Plan: `05-mock-data-plan.md`. Visitors get it from a **Sample data** page + a "Load Mousy sample" button on every tool. | Decided | 2026-10-13 |
| D12 | Licence: **GPL-3.0** (same as the owner's other recent public repos). README + LICENSE in milestone M0.5. | Decided | 2026-10-13 |

## D4 notes (stack)

- Why Vite + vanilla TS: 9 tools share a lot of UI (header, key drawer, command palette, run log,
  file drop, export). TS catches mistakes early; no framework keeps the code readable for the owner.
- Approved dependencies (rule 7): `vite`, `typescript`, SheetJS (`xlsx`, install from
  `https://cdn.sheetjs.com`, **not** the stale npm `xlsx`), `jszip`, `@fontsource/lexend`,
  `@fontsource/dm-mono`, `@fontsource/fraunces`. Tests: pytest + Playwright (Python), already
  on the owner's machine. Anything else: ask first.
- Self-host fonts with `@fontsource` (no Google Fonts call = no third-party request on page load).
- Browser calls to AI providers: OpenAI and Gemini allow direct browser calls with the user's key.
  Anthropic needs the `anthropic-dangerous-direct-browser-access: true` header. **Verify the current
  docs (Context7 MCP) before writing the provider code.** Default models must be the current ones.
