# 05 - Mock data plan (the Mousy sample pack)

Every tool runs on the **Mousy sample pack**. Visitors download it from the **Sample data** page,
or click **Load Mousy sample** inside any tool.

## Where the realism comes from

The owner has a **private export of real bot conversations** (about 80 rows, one row per
conversation, a long transcript column plus metadata columns). Its location, column map and a
denylist of terms are in `docs\private\real-data-notes.md` (gitignored).

We use that export for its **shape only**: how many turns a conversation has, how voice and chat
differ, how often bots re-prompt, time out, or escalate, how long calls last, what metadata a QA
person sees. **We never reuse its words, names, numbers, IDs, business, or column names.**
Masking is not enough: every line of text in the pack is newly written for Mousy.

## Hard rules for this job

1. Never commit the real export, a copy of it, or any slice of it. It stays where it is.
2. Do not paste real rows or transcript text into chat, commits, comments, docs or tests.
   Work from **aggregate stats** (step 1 below), not from reading conversations.
3. The script that reads the real export lives in `docs\private\scripts\` (gitignored), because it
   necessarily contains the real column names.
4. Everything in the output must pass the privacy check (step 4) before it is committed.

## Steps

1. **Profile (local script, stats only).** Write `docs\private\scripts\profile_real_export.py`
   (Python, pandas). It reads the real export and writes `docs\private\profile.json` with numbers
   only: rows, channel mix, turns per conversation (min/median/max), user vs bot words per turn,
   escalation rate, timeout rate, re-prompt loop rate, call-duration distribution, who closed the
   conversation, share of empty fields. No text values. Show the owner the JSON.
2. **Design scenarios.** Using `profile.json` + the Mousy brief below, write the scenario list in
   `sample-data\SCENARIOS.md` (tracked, all invented).
3. **Generate (tracked script, invented content only).** Write `tools\make_mousy_pack.py`. It does
   **not** read the real export. It takes the scenario list + numbers from `profile.json` (copy the
   few numbers it needs into the script as constants) and writes the pack, with a fixed random seed
   so it is reproducible.
4. **Privacy check.** Write `tools\privacy_check.py`. It scans every tracked file for: every term in
   `docs\private\denylist.txt` (read at run time, case-insensitive), phone-number patterns, email
   addresses (except `@mousy.example`), UUIDs, and real-looking timezone tags. Exit code 1 on any hit.
   Run it before every commit. Add a pytest that runs it.

## The Mousy brief

- **Mousy**: an invented online shop (home, kitchen, small gadgets). Bot: **Mousy Assist**.
  Customers are invented too ("Customer" or made-up first names; never real-sounding full names).
- Channels: `voice` and `chat`. Keep a voice-heavy mix like the profile shows.
- Scenarios (6-10 core + variations): cancel order, refund status, change delivery address,
  billing dispute, track parcel, gift card balance, return a damaged item, talk to a human.
- **Planted bugs** so the tools have something to find, each tagged in a hidden answer key:
  misroute (wrong intent), fallback loop (bot re-prompts 3+ times), premature escalation,
  timeout with no goodbye, bot repeats itself, wrong order ID read back, ignored correction.
- IDs `MO-1000`..`MO-9999`. Conversation IDs `CNV-000001`. Phone numbers: use `555-01xx`
  (reserved fictional range) and only where a voice bot would read one back. Emails `@mousy.example`.
- Dates: a fixed invented window (2025-03-01 to 2025-03-14), timezone `UTC`.

## Output files (`app\public\sample-data\`, served for download)

| File | What | Used by |
|---|---|---|
| `mousy_conversations.csv` | ~40 rows, one per conversation, generic columns (below) | Test Case Generator, Metrics Extractor, First Utterance Finder (bulk) |
| `mousy_conversations.xlsx` | Same data as Excel | Bulk tools, Excel import demo |
| `mousy_batch_20.xlsx` | 20-row subset | Pipeline / bulk demos |
| `transcripts\*.txt` | 8 single transcripts, one per core scenario | Bug Finder, Transcript Converter |
| `intents_v3.xlsx` | 10 intents with descriptions + 5 example utterances each | Utterance Generator |
| `golden\*.json` | Expected conversations for the regression / diff view | Diff view |
| `answer_key.json` | Planted bugs per conversation | Tests + "check my result" demo |
| `README.txt` | What each file is, that all data is invented | Visitors |
| `mousy_sample_pack.zip` | All of the above | "Download everything" button |

### Generic column set (do not reuse the real export's column names)

`conversation_id, channel, started_at, ended_at, duration_sec, turns, closed_by (customer|bot|agent|timeout),
escalated (true|false), escalation_reason, queue, outcome (resolved|escalated|abandoned),
flow_steps (semicolon list of invented step names, e.g. greet;lookup_order;cancel_order),
custom_metrics (JSON object, invented keys), transcript`

### Transcript format (open, readable, our own)

```
[00:00:02] Mousy Assist: Hi, this is Mousy Assist. How can I help with your order today?
[00:00:09] Customer: I want to cancel order MO-4417.
```

One line per turn, `[hh:mm:ss] Speaker: text`, relative time from conversation start.
In CSV/XLSX the whole transcript sits in one cell with real newlines.

## The Sample data page (where visitors get it)

- Route `/sample-data`, linked from the home page, the header, and every tool's empty state.
- One card per file: name, one-line purpose, size, "Download" button, "Open in <tool>" link.
- Big "Download everything (.zip)" tile. Banner: "All data is invented. Mousy is not a real company."
