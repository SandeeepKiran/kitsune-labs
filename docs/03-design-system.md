# 03 - Design system: Yae Miko bento

Rule of thumb: **90% serious QA engineering software, 10% fox.** Tool names stay plain; the theme
lives in colour, the fox, and motion.

**Look at these first** (open the .html in a browser to see the motion; the .png is a still):

- `docs\design-reference\bento-app-lavender-dusk.html`: a tool page (Bug Finder) in bento tiles.
- `docs\design-reference\home-fox-landing.html`: the home page with the sleeping fox.

They are 1440x900 mockups, not production code. Rebuild them properly: responsive, accessible,
real components. Copy the fox SVG and the keyframes from them; they are our own drawing.

## Colours (light, pastel; light mode is the default)

```css
:root {
  /* surfaces */
  --bg: #f4f0fb;                 /* lavender-white page */
  --tile: #ffffff;
  --tile-soft: rgba(255,255,255,.75);
  --hero: linear-gradient(120deg, #d8cbf6 0%, #ecc6e4 55%, #f7c9d8 100%); /* lilac -> pink -> sakura */
  --home-bg: linear-gradient(160deg, #fde2e4 0%, #f6d6ec 45%, #e4dcfa 100%);

  /* ink */
  --ink: #3a2a5a;                /* body text, dark tiles, active tab */
  --ink-muted: #6b5a86;
  --on-ink: #f4f0fb;

  /* Yae accents */
  --lilac: #c9b6f2;              /* fox fur, chips */
  --sakura: #f7c9d8;
  --gold: #d4a84a;               /* hairlines, key seal, ear charm */
  --gold-glow: #fff6c9;          /* lit nine-tail */
  --hanko: #b8336a;              /* Fail stamp, critical only */
  --ai: #7c3aed;                 /* electro violet text/icons for AI output */
  --ai-glow: #c084fc;            /* electro spark line, AI running */

  /* status: always paired with icon + word */
  --pass-bg: #d6f0e2;  --pass: #1f7a4d;
  --warn-bg: #f6e6c2;  --warn: #8a5a00;
  --fail-bg: #f8d6df;  --fail: #b8336a;

  --radius-tile: 26px;
  --radius-chip: 12px;
  --gap: 16px;
}
```

- Check WCAG AA contrast for every text colour on its real background (tile, hero gradient ends).
- A dark theme is a later, optional milestone. Do not build it first.

## Type

- UI: **Lexend** (400/600/700/800). Big numbers in hero tiles: Lexend 800, tight letter-spacing.
- Code, transcripts, IDs, logs: **DM Mono**.
- Home page headline only: **Fraunces** 600/700.
- Self-host all three with `@fontsource`.

## Bento layout rules

- Every tool page is a CSS grid of rounded tiles. The **answer is the hero tile** ("3 findings",
  "20 test cases", "7 turns parsed"). Run is a big, obvious tile or button inside the input tile.
- Standard tool page tiles: Hero answer · Input (paste / drop / Load Mousy sample) · Results
  (findings, table, preview) · Run log · Export.
- Collapse to one column under ~900 px. No horizontal scroll at phone width.

## Motion (D10) - all off under `prefers-reduced-motion: reduce`

| Where | Animation | Source keyframes |
|---|---|---|
| Fox (home hero, empty states) | Breathes, tail sways, right ear twitches, gold charm swings | `breathe`, `sway`, `twitch`, `swing` |
| Home | A few sakura petals drift, slow; "z" floats up from the sleeping fox | `fall`, home file |
| Tiles | Rise in once on page load, staggered by ~60 ms | `rise` |
| Multi-step runs | **Nine-tail progress**: 9 small tails light up one by one | `lit` |
| A Fail finding appears | **Hanko stamp** slams onto it, once | `slam` |
| AI call running | **Electro spark**: thin violet glowing line runs around the tile border (no spinner) | build new, `--ai-glow` |
| Buttons, chips | 120-180 ms hover/press transitions | - |

Rules: animate `transform` and `opacity` only. No animation longer than ~700 ms unless it loops
idly (fox, petals). Never animate while the user types.

## Signature details

1. **Fox mark**: our own geometric fox head (logo) + the sleeping fox (hero). Never game art.
2. **Nine tails = nine tools**: also used as "tools tried: 4 / 9" on the home page.
3. **Key seal**: dashed gold chip "Key sealed in this browser" whenever a key is set.
4. **Gold hairline** on the hero and dark tiles.
5. Fox-flavoured empty states, e.g. "Nothing sniffed out yet. Drop a transcript to start."
6. Status is **never colour-only**: `✓ Pass`, `✕ Fail`, `⚠ Warn`.

## Engineering substance (do not lose this under the pastel)

- Command palette (Ctrl+K) to jump to any tool or action.
- "Load Mousy sample" on every tool.
- Run log line with real numbers: "Parsed 7 turns · 3 findings · 1 AI call · 1.4 s".
- Dense, sortable tables; diff views; export (.xlsx, .json, .txt, .yaml, .zip).
- AI provider switcher (Gemini / ChatGPT / Claude); every AI output labelled "AI-assisted".
- Keyboard-friendly: visible focus rings (gold), every action reachable without a mouse.
