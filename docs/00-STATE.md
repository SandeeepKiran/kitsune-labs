# 00 - State

> Update this file at the end of every work session. Newest entry on top.

## 2026-10-13 (latest) - M0 scaffold done (Cursor)

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

1. Owner: look at M0, then say "go" for M1 (Mousy sample pack).

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
