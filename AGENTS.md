# Kitsune Labs: handoff for AI coding agents (Cursor, Claude Code, Codex)

> **Read this file first, every session.** Then read the files in `docs\` in number order.
> The owner (Sandeep) is a QA engineer who is newer to coding. Explain what you do in plain
> words, with a short "why". Small, reversible steps. Ask before anything hard to undo.

## What this project is

**Kitsune Labs** is a public **portfolio** rebuild of the QA tools Sandeep built at work: a set of
browser tools for testing **conversational AI** (chatbots and voice bots). Examples: find bugs in
a bot conversation, turn transcripts into test cases, generate test utterances for an intent,
convert transcripts into test scripts, build QA reports.

The originals are internal and tied to one vendor platform. This version is **vendor-neutral**,
runs **only on mock data**, and lets visitors try every tool with downloadable sample files.
AI features use the **visitor's own API key** (Gemini, ChatGPT or Claude: their choice).

Tagline: *QA tools for conversational AI, forged in-house.*

## Current phase: Phase 1 (build), ready since 2026-10-13

- All design and stack decisions are made (`docs\04-decisions.md`): **Yae Miko pastel bento**,
  with motion, Vite + vanilla TypeScript, static site.
- **Start here:** `docs\06-build-plan.md`, milestone M0, then M1 (the Mousy sample pack,
  `docs\05-mock-data-plan.md`). Stop at the end of each milestone so the owner can look.
- Visual reference: `docs\design-reference\` (open the .html files in a browser for the motion).

## Hard rules: do not change without asking the owner

1. **No employer or client information. Ever.** Never use, copy or mention the vendor platform
   the originals were built for, the owner's employer, client names, real transcripts, real
   intent names, real URLs, real file formats that are proprietary, or screenshots of the
   originals. If you are unsure whether something is "real", treat it as real and leave it out.
2. **The originals are read-only reference.** Their location and the file map are in
   `docs\private\originals-map.md` (gitignored: never commit it, never copy its contents into a
   tracked file). You may read an original to understand what a tool *does*. Never copy text,
   data, prompts or code from it verbatim. Never edit anything there.
3. **All sample data is invented.** The mock company is **Mousy** (its bot: "Mousy Assist", an
   online-shop support bot). Order IDs look like `MO-4417`. No real names, emails or phone numbers.
4. **API keys belong to the visitor.** They are typed into the page, kept only in the browser
   (sessionStorage by default; localStorage only if the visitor ticks "remember"), and sent only
   to the provider the visitor picked. No server, no proxy, no analytics that could see a key.
   Never commit a key. Never log a key, even partly.
5. **No git push.** Claude Code handles all git/GitHub work. Commits are by the owner only:
   no `Co-Authored-By`, no "Generated with" lines.
6. **No Genshin Impact art, logos, fonts or character images.** The theme is a subtle nod only
   (colours, a fox mark we draw ourselves, small details). See `docs\03-design-system.md`.
7. Do not add paid services, sign-ups, trackers or new dependencies without asking
   (the approved list is in `docs\04-decisions.md` D4).
8. **Real conversation data stays private.** A real export is used only for its *shape* (stats),
   by a script in `docs\private\scripts\`. Never commit it, copy it, quote it, or paste its rows into
   chat. All sample text is newly written for Mousy. `tools\privacy_check.py` must pass before
   every commit. Details: `docs\05-mock-data-plan.md`.

## Folder layout

```
Project - Kitsune Labs\
  AGENTS.md            <- this file
  .gitignore
  docs\                <- 00 state, 01 brief, 02 tools, 03 design, 04 decisions,
                          05 mock data plan, 06 build plan
  docs\design-reference\ <- the chosen look: bento tool page + fox landing (HTML + PNG)
  docs\private\        <- GITIGNORED: originals map, real-data notes, denylist, private scripts
  app\                 <- (M0) the Vite site; app\public\sample-data\ = files visitors download
  sample-data\         <- (M1) SCENARIOS.md: the invented Mousy scenarios
  tools\               <- (M1) make_mousy_pack.py, privacy_check.py
  tests\               <- pytest + Playwright
```

## Code style (once coding starts)

- Readable over clever. Descriptive names. Comments explain **why**, not what.
- Match the style already in a file.
- Every tool must work with the **"Load Mousy sample"** button and no API key, wherever the
  tool can work without AI. AI output is always labelled "AI-assisted".
- Status is never colour-only: every Pass / Fail / Warn shows an icon and a word.
- Tests: pytest + Playwright (Python) for end-to-end checks, matching the owner's QA setup.

## Writing style

Procedures, test cases, bug reports and any steps for the owner: **ASD-STE100 Simplified
Technical English** (numbered, imperative, one action per step, condition before action).
