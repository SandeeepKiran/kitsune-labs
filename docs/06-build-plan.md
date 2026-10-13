# 06 - Build plan (for Cursor)

Work milestone by milestone. At the end of each milestone: run the checks, update
`00-STATE.md`, and stop so the owner can look. The owner commits; Claude Code does git/GitHub.

## M0 - Scaffold

1. Create `app\` with Vite + vanilla TypeScript (D4). `npm run dev`, `npm run build` must work.
2. Set `base` in `vite.config.ts` for GitHub Pages (repo path, ask the owner for the repo name).
3. Add design tokens from `03-design-system.md` as `app\src\shared\tokens.css`; self-hosted fonts.
4. Add `tests\` (pytest + Playwright, Python) with one smoke test: home page loads, no console errors.

## M1 - Mousy sample pack (see `05-mock-data-plan.md`)

1. Profile script -> `profile.json` (private). Show the owner.
2. `sample-data\SCENARIOS.md`, then `tools\make_mousy_pack.py` -> `app\public\sample-data\`.
3. `tools\privacy_check.py` + its pytest. Must pass.

## M2 - Shell + home + sample data page

1. Shared shell: header with fox mark, tool tabs, key seal chip, Ctrl+K command palette.
2. Home (fox landing): hero, 9 tool tiles, "tools tried 0 / 9" nine-tail mark.
3. AI key drawer (slide-in right): provider pick, key field, "remember on this device" checkbox
   (off = sessionStorage, on = localStorage), "Forget key" button, clear privacy text. No key leaves
   the browser except to the chosen provider.
4. `/sample-data` page.
5. Shared bento tool-page template + run log + export helpers + file drop.

## M3 - No-AI tools first (work with zero keys)

Transcript Converter (.txt/.json/.yaml/.zip) · First Utterance Finder · Metrics Extractor ·
QA Handbook (rewritten content).

## M4 - AI tools

Provider layer (Gemini / OpenAI / Anthropic, verify current APIs and models via Context7 first),
then Bug Finder (with hanko stamp + electro spark), Test Case Generator (with column mapping),
Utterance Generator, Report Builder, Email Templates. Each must still show something useful with
no key (e.g. rule-based findings from `answer_key.json` patterns, clearly labelled "no AI").

## M5 - Polish + launch prep

Motion pass (all of D10, reduced-motion verified), accessibility pass (contrast, focus, keyboard),
phone layout, Lighthouse, final privacy check, README. Then hand back to Claude Code for the repo.

## Definition of done (every milestone)

- `npm run build` passes, `pytest` passes, `tools\privacy_check.py` passes.
- No console errors. Works with reduce-motion on.
- `00-STATE.md` updated with what changed and what is next.
