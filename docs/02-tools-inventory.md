# 02 - Tools inventory

The portfolio versions of the owner's original QA tools. Which original each one comes from is in
`docs\private\originals-map.md` (gitignored, local only). Public names are plain and descriptive on purpose.

| # | Tool | What it does | Uses AI | Notes for the rebuild |
|---|---|---|---|---|
| 1 | **Bug Finder** | Reads one bot conversation and lists defects (misroutes, fallbacks, loops), with optional exec summary, dev-fix hints and sentiment | Yes | Original supports several keys in parallel ("multiple opinions"). Keep as an advanced option. |
| 2 | **Test Case Generator** | Turns transcripts (single or an Excel batch) into structured test cases, with a live log | Yes | Original hard-codes the transcript column. Rebuild: let the user **map columns**. |
| 3 | **Utterance Generator** | Generates validation utterances for an intent (single or bulk from Excel), exports .xlsx | Yes | Generic NLU testing. |
| 4 | **Transcript Converter** | Cleans raw chat text into test-script files, single or bulk (.zip) | No | **The original output formats are vendor-specific. Do not reproduce them.** Output open formats instead: .txt, JSON, YAML (decision D6). |
| 5 | **First Utterance Finder** | Pulls the first real user turn (the one that probably hit an intent) from transcripts, single or bulk | Optional | |
| 6 | **Metrics Extractor** | Adds custom-metric columns to a transcript spreadsheet | No | Invent generic metrics (turn count, fallback count, escalation yes/no). |
| 7 | **Report Builder** | Builds a QA summary report from run results | Optional | Its "Value over Volume" idea makes a nice About section. Rewrite in new words. |
| 8 | **Email Templates** | Daily status, critical-issue callout, meeting request, AI custom template | Optional | |
| 9 | **QA Handbook** | Interactive guide: mandate, lifecycle, toolkit, best practices | No | Rewrite text so nothing company-specific remains. |

Nine tools, nine tails: the nine-tail progress mark (design system) can double as "tools tried: 4 / 9".

## Mock data the tools need

See `05-mock-data-plan.md` (the Mousy sample pack: files, columns, transcript format, planted bugs).
