# 00 - State

> Update this file at the end of every work session. Newest entry on top.

## 2026-10-13 (latest) - M3 + M4 done: all 9 tools work. Batch B complete (Cursor)

- Dependencies: `jszip` and `xlsx` (SheetJS, from cdn.sheetjs.com), both approved in D4. Both
  load lazily, only when a spreadsheet or zip is used (separate chunks in the build).
- Shared engine, all pure TypeScript in `app\src\shared\`:
  - `analysis.ts`: rules for the 7 bug types, intent guess, first real utterance, metrics.
    Against the answer key: 27 of 27 planted bugs found, 0 false positives, 40 of 40 first
    utterances right.
  - `files.ts` (.csv / .xlsx / .zip in, .xlsx / .zip out), `conversations.ts` (any input to
    conversations + column mapping), `script.ts` (open test-script format
    `kitsune-test-script/1` in .txt / .json / .yaml, and reading it back), `answer-key.ts`,
    `findings-source.ts` (answer key, Bug Finder export, or rules), `results.ts` (tables,
    finding cards, hanko, answer-key check), `options.ts`.
  - `ai.ts`: one `askAi()` for Gemini, OpenAI and Anthropic (endpoints checked with Context7).
    The key goes only in the provider's header. 90 s timeout. Errors never repeat key text.
    The key drawer now has a Model field (stored in localStorage; it is not a secret).
- `tool-page.ts` rewritten: loaded-file panel, column mapping, tool settings, "Use AI" switch,
  nine tails show real progress, electro spark while AI runs, run log ends with
  "N AI calls · M ms". Each tool is its own module in `app\src\tools\`.
- M3 (no AI): Transcript Converter (single or bulk, zip out, `{{order_id}}` option), First
  Utterance Finder, Metrics Extractor (adds `metric_*` and `cm_*` columns, escalation
  cross-check), QA Handbook (new text, 9-step STE checklist saved in this browser, sample
  findings mapped to practices).
- M4 (AI optional, all work without a key, labelled "Rules · no AI"): Bug Finder (hanko stamp
  on Fail, AI second opinion merges with rules: "AI agrees"), Test Case Generator (column
  mapping, STE steps, AI rewrite with a cost limit), Utterance Generator (seeded rule styles,
  AI adds slang and "should not match" near-misses), Report Builder (ranked by impact,
  .md / .html / .json; AI summary gets totals only, never transcripts), Email Templates
  (daily, critical, meeting; custom needs a key and says so with a Warn).
- Fixed on the way: the converter overwrote files with the same name from different zip
  folders (now `_2` suffix). A sample chat line was changed so it cannot look like a wrong
  order ID; the pack was regenerated.
- Tests: new `tests\test_tools.py` (each tool with the sample and no key, answer-key matches,
  YAML round trip, zip + xlsx, column mapping, downloads, hanko + reduced motion, mocked AI
  provider: key only in the header, only to that host, never in console or log; AI failure
  falls back to rules). `test_site.py` updated for real tool output. Full suite: 100 passed.
  Privacy check: PASS (113 files). `npm run build` and `tsc --noEmit`: clean.
- Not tested with a real key: only the mocked provider. The owner should try one real call.

### Next steps

1. Owner: look at Batch B, and try one real AI call (see the steps in the chat summary).
2. Cursor: Batch C (M5 polish + launch prep).

## 2026-10-13 - M2 shell, home, sample data page done. Batch A complete (Cursor)

- Routing: one real HTML page per route (`index.html`, `sample-data\index.html`,
  `tools\<slug>\index.html` x 9; listed in `vite.config.ts`). Works on GitHub Pages with no
  404 redirect trick. Tool list lives in one place: `app\src\shared\tools.ts`.
- Shell (`shared\shell.ts`): fox mark, tool tabs, Sample data link, key seal chip, Ctrl+K
  palette (`palette.ts`, ARIA combobox), skip link, footer.
- Home (`pages\home.ts`): sleeping fox (breathe / sway / twitch / swing), moon, petals, "z",
  9 tool tiles, nine-tail "Tools tried n / 9" (localStorage `kitsune.tried`, this browser only).
- AI key drawer (`key-drawer.ts`, `key-store.ts`): native `<dialog>`, provider pick, key
  field + Show, "Remember on this device" (off = sessionStorage, on = localStorage), Forget key
  (removes every key from both), privacy text naming the provider. No key is ever logged.
- `/sample-data/`: banner, Download everything (.zip), one card per file from `manifest.json`,
  "Open in <tool>" links (`?sample=<path>`, only safe sample paths are accepted).
- Tool-page template (`tool-page.ts`): bento tiles (hero + Load Mousy sample, answer, run with
  nine-tail progress, input with file drop, results, run log, export). Until M3/M4 every tool
  uses the default preview run (parse transcript, list turns, export .txt / .json). Visitor
  text is always rendered as text, never HTML.
- Helpers: `transcript.ts`, `csv.ts`, `run-log.ts`, `export.ts` (text/JSON/CSV), `file-drop.ts`,
  `status.ts` (icon + word), `nine-tails.ts`, `motion.css` (all off under reduced motion).
- Not yet: reading .xlsx / .zip and exporting them (needs SheetJS + JSZip, approved; install in
  M3). Hanko stamp and electro spark (M4).
- Tests: `tests\test_smoke.py` (all 11 pages, motion + reduced motion), `tests\test_site.py`
  (palette, key storage rules, key never in requests or console, sample links, downloads,
  export, phone width, reduced motion). Full suite: 73 passed. Privacy check: PASS (93 files).

### Next steps

1. Owner: look at Batch A (see the steps in the chat summary).
2. Cursor: Batch B (M3 no-AI tools, then M4 AI tools). First install SheetJS + JSZip.

## 2026-10-13 - M1 Mousy sample pack done (Cursor, Batch A)

- Private: `docs\private\scripts\profile_real_export.py` -> `docs\private\profile.json`. A guard
  refuses to write anything but numbers. Bot vs customer is decided by "who speaks first".
- `sample-data\SCENARIOS.md`: 10 intents, 7 planted bug types, 8 core scenarios, 32 variations.
- `tools\make_mousy_pack.py` (needs `openpyxl`, already installed) -> `app\public\sample-data\`:
  40-row CSV + XLSX, 20-row batch, `intents_v3.xlsx`, 8 transcripts, 8 golden JSON,
  `answer_key.json`, `README.txt`, `mousy_sample_pack.zip`, plus `manifest.json` for the
  Sample data page. Fixed seed + fixed archive timestamps: byte-identical on every run.
- `tools\privacy_check.py`: denylist (prints line numbers, never the term), emails (except
  `@mousy.example`), phones (except `555-01xx`), UUIDs, timezone tags; scans inside .xlsx/.zip;
  fails if `docs/private/` is not gitignored. Exit 0 / 1 / 2.
- Tests: `tests\test_privacy_check.py`, `tests\test_mousy_pack.py` (reproducible, up to date,
  answer key points at real bot turns, Excel matches CSV). 29 passed.

## 2026-10-13 - M0.5 repo basics done (Cursor, Batch A)

- `LICENSE` copied byte-for-byte from Leyline Autofill (hash checked). `README.md` first version.
  `"license": "GPL-3.0-only"` in `app\package.json`.

## 2026-10-13 - M0 scaffold done (Cursor)

- `app\`: Vite 8 + TypeScript 7, vanilla, no framework. `npm run dev` and `npm run build` work.
- `vite.config.ts`: `base: '/kitsune-labs/'` (repo name confirmed by the owner). Dev URL:
  `http://localhost:5173/kitsune-labs/`.
- `app\src\shared\tokens.css` (tokens from `03-design-system.md`), `fonts.ts` (Lexend, DM Mono,
  Fraunces via `@fontsource`, self-hosted), `base.css` (reset + gold focus ring).
- Home page is a placeholder only (title + tagline). The fox landing is M2.
- `tests\` + root `pytest.ini`: smoke tests build the site, serve it with `vite preview`, and
  check with Playwright (normal and reduced motion): page loads, no console errors, no
  third-party requests, self-hosted fonts applied. 6 passed. No `pytest-playwright` plugin needed.
- Dependencies added: only approved ones (`vite`, `typescript`, the three `@fontsource` packages).
- `tools\privacy_check.py` does not exist yet (M1 step 3).
- Owner rule: agents never run git commands of any kind.

### Next steps

1. Cursor: **Batch A** (M0.5 + M1 + M2) in one go, see `06-build-plan.md`. Stop at the end of the batch.

## 2026-10-13 - Ready for Cursor (Claude Code)

- Owner chose **bento style + Yae Miko pastel + motion**. D2, D3, D4, D5, D6, D9, D10, D11 decided.
- `samples\` deleted. Kept only the two chosen references in `docs\design-reference\`
  (Lavender Dusk bento tool page + Fox Landing home).
- New: `05-mock-data-plan.md` (Mousy sample pack from the *shape* of a private real export),
  `06-build-plan.md` (milestones M0-M5). Private real-data notes + denylist in `docs\private\`.
- No app code yet. Not a git repo yet (Claude Code will `git init` + create the repo when asked).

### Next steps

1. Cursor: M0 scaffold, then M1 sample pack. See `06-build-plan.md`.

## 2026-10-11 - Round 2: bento palettes, fox, motion

- Owner liked **Bento** most and wants more Yae Miko (her fox) and animation.
- `samples\styles-round2\`: 4 bento palettes + Ofuda Electro + Fox Landing, each with our own
  sleeping-fox SVG and one signature animation. Live HTML in `live\`.
- Owner is collecting inspiration screenshots for `samples\inspiration\`.

## 2026-10-11 (later) - Pastel style studies

- Owner wanted different visual *styles*, in pastel, not more layouts.
- `samples\styles\`: 5 pastel style studies + overview. Palette moved to pastel (D2 revised).
- Open: D9 (style) and D3 (layout).

## 2026-10-11 - Project created (Claude Code)

- Name chosen: **Kitsune Labs**. Tagline: *QA tools for conversational AI, forged in-house.*
- Palette chosen (Yae Miko / kitsune version of the owner's gradient). See `03-design-system.md`.
- Docs written: brief, tool inventory, design system, decisions.
- `samples\claude\`: 10 layout mockups (PNG) + `Claude 00 - Overview.png` contact sheet.
- `samples\CODEX-PROMPT.md`: prompt for Codex/ChatGPT to make 10 more concepts into `samples\chatgpt\`.

### Next steps

1. Owner runs the Codex prompt (optional) and looks at all mockups.
2. Owner picks a layout (or a mix) -> record it in `04-decisions.md` D3.
3. Decide the stack (D4) and which tools ship first (D5).
4. Create the Mousy sample data pack.
5. Then Cursor starts building in `app\`.
