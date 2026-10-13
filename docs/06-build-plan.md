# 06 - Build plan (for Cursor)

Work in **batches**. Inside a batch, go straight from one milestone to the next: run that
milestone's checks, add a short `00-STATE.md` entry, and continue. **Stop only at the end of a
batch** so the owner can look. The owner commits; Claude Code does git/GitHub.

| Batch | Milestones | Stop when |
|---|---|---|
| **A** | M0.5 repo basics + M1 Mousy sample pack + M2 shell, home, sample data page | The site has a real home, the key drawer, and downloadable sample data |
| **B** | M3 no-AI tools + M4 AI tools | All 9 tools work |
| **C** | M5 polish + launch prep | Ready to go public |

Stop early, mid-batch, only if: a check fails and you cannot fix it, you need a new dependency,
or something might break a hard rule in `AGENTS.md`. In M1, put the `profile.json` numbers in your
end-of-batch summary so the owner can confirm they hold no text from the real conversations.

## M0 - Scaffold

1. Create `app\` with Vite + vanilla TypeScript (D4). `npm run dev`, `npm run build` must work.
2. Set `base` in `vite.config.ts` for GitHub Pages (repo path, ask the owner for the repo name).
3. Add design tokens from `03-design-system.md` as `app\src\shared\tokens.css`; self-hosted fonts.
4. Add `tests\` (pytest + Playwright, Python) with one smoke test: home page loads, no console errors.

## M0.5 - Repo basics (do this before M1)

1. `LICENSE` at the repo root: **GPL-3.0** (decision D12). Use the exact official text: copy it
   unchanged from `..\Project - Leyline Autofill\LICENSE` (same licence, same owner). Do not edit it.
2. `README.md` at the repo root (a first version now; M5 polishes it). Contents, in this order:
   name + tagline, one-paragraph "what it is", status line ("Work in progress: milestone M0 of M5"),
   "All data is invented. Mousy is not a real company.", how your AI key is handled (stays in your
   browser, sent only to the provider you pick), run locally (`cd app`, `npm install`, `npm run dev`),
   run tests (`pytest`), tech stack, licence line ("GPL-3.0, see LICENSE"), credits (fonts: Lexend,
   DM Mono, Fraunces via Fontsource, SIL Open Font License).
3. README rules: no employer, client or vendor names; no "built at work" story; no personal email.
   Author line is only "Sandeep Kiran" with a link to `https://github.com/SandeeepKiran`.
   No badges or links to services that track visitors.
4. Add `"license": "GPL-3.0-only"` to `app\package.json`.

## M1 - Mousy sample pack (see `05-mock-data-plan.md`)

1. Profile script -> `profile.json` (private). Numbers only; show them in the batch summary.
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
