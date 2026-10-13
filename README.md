# Kitsune Labs

*QA tools for conversational AI, forged in-house.*

**Try it live: <https://sandeeepkiran.github.io/kitsune-labs/>**

Kitsune Labs is a set of browser tools for testing chatbots and voice bots. You can find bugs in a
bot conversation, turn transcripts into test cases, generate test utterances for an intent,
convert transcripts into open test-script formats, and build QA reports. Every tool runs in your
browser on files and pasted text. Each tool has a **Load Mousy sample** button, so you can see it
work in seconds, with no upload, no sign-up and no API key.

**Status:** Version 1: all nine tools work (milestone M5 of M5).

**All data is invented. Mousy is not a real company.** The sample pack (conversations, Excel
batches, intent lists) was written from scratch for an imaginary online shop and its support bot,
Mousy Assist.

## The tools

| Tool | What it does | AI |
|---|---|---|
| Bug Finder | Find where a bot conversation went wrong. | AI + rules |
| Test Case Generator | Turn transcripts into structured test cases. | AI + rules |
| Utterance Generator | Generate validation utterances for an intent. | AI + rules |
| Transcript Converter | Clean raw chat text into .txt, .json or .yaml test scripts. | No AI |
| First Utterance Finder | Pull the first real customer turn from each transcript. | AI optional |
| Metrics Extractor | Add turn, fallback and escalation columns to a spreadsheet. | No AI |
| Report Builder | Build a QA summary report from run results. | AI optional |
| Email Templates | Daily status, critical-issue and meeting emails. | AI optional |
| QA Handbook | A practical guide to testing conversational AI. | No AI |

"AI + rules" tools give a rule-based answer with no key, and AI adds a second opinion when you
add a key. AI output is always labelled "AI-assisted".

## Your AI key

Some tools can use AI. They use **your own key** for Gemini, ChatGPT or Claude, your choice.

- You type the key into the page. It stays in your browser: in `sessionStorage` by default
  (gone when you close the tab), or in `localStorage` only if you tick "Remember on this device".
- The key is sent only to the provider you picked. There is no server, no proxy and no analytics.
- "Forget key" removes it at once.
- Every tool that can work without AI still works with no key.

## Run it locally

```powershell
cd app
npm install
npm run dev
```

Then open <http://localhost:5173/kitsune-labs/>.

## Run the tests

The end-to-end tests use pytest and Playwright (Python). From the project root:

```powershell
pytest
```

The tests build the site, serve the production build, and check it in Chromium: every tool
with the sample files, key handling (mocked AI provider, no real key), WCAG AA colour contrast
on every page after a run, keyboard focus, phone layout and reduced motion.

## Accessibility

- Colour contrast meets WCAG 2.2 AA on every page (checked by the tests, not by eye).
- Every action works with the keyboard. Focus shows as a gold ring with an ink edge.
- Status is never colour only: every Pass, Fail and Warn shows an icon and a word.
- With "reduce motion" on in your system settings, all animation stops.

## Deploy

Every push to `main` builds the site and publishes it to GitHub Pages
(`.github/workflows/deploy-pages.yml`). The privacy check runs first; any hit stops the deploy.

## Tech stack

- Vite + vanilla TypeScript, a static site with no backend and no framework
- Self-hosted fonts (no third-party requests on page load)
- pytest + Playwright (Python) for end-to-end tests
- Python scripts in `tools\` build the Mousy sample pack and run a privacy check

## Licence

GPL-3.0, see [LICENSE](LICENSE).

## Credits

- Fonts: [Lexend](https://fontsource.org/fonts/lexend),
  [DM Mono](https://fontsource.org/fonts/dm-mono) and
  [Fraunces](https://fontsource.org/fonts/fraunces) via Fontsource, under the SIL Open Font License.
- The fox drawings are original artwork made for this project.

## Author

[Sandeep Kiran](https://github.com/SandeeepKiran)
