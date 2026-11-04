# Kitsune Labs: brag plan

## Answers

- **What is it:** nine free browser tools for testing chatbots and voice bots.
- **For whom:** QA engineers and anyone who ships a conversational bot. It finds where a conversation went wrong, writes test cases, builds reports.
- **What sets it apart:** every tool works in seconds with the "Load Mousy sample" button: no upload, no sign-up, no key. Rules run first; AI is optional and uses the visitor's own key (Gemini, ChatGPT or Claude), which stays in the browser.
- **Most impressive claim:** Bug Finder on the Mousy sample: "Found 2 of 2 planted bugs", matched against an answer key, with zero AI calls.
- **Visual hook:** a real Mousy conversation going wrong. Customer: "can I cancel my order please". Bot: "I can help with refunds!" Then a red Fail stamp.
- **Real UI to show:** Bug Finder (empty, click Load Mousy sample, findings), the nine-tool home grid, the key promise.
- **Tone:** `polished` with a light playful hook. Daylight Silver surfaces, Sakura-Rose `#be185d`, plum `#9d174d`, amethyst `#7e22ce`. Fonts: Fraunces (headlines), Lexend (UI), DM Mono (code chips), all from the app's own Fontsource packages.
- **Share caption:** see `share-copy.txt`.

## Storyboard (21 s, 1920x1080, 30 fps)

| # | Time | Scene | On screen |
|---|---|---|---|
| 1 | 0.0-3.4 | Hook | Chat bubbles type in: customer "can I cancel my order please" → Mousy Assist "I can help with refunds! Which order should I refund?" A "✗ Fail · misroute" hanko stamps on. Caption: "Your bot heard *refund*." |
| 2 | 3.4-6.6 | Reveal | Kitsune badge draws in, "Kitsune Labs" + tagline "QA tools for conversational AI, forged in-house." |
| 3 | 6.6-12.4 | Highlight 1: Bug Finder | Real Bug Finder page in a browser frame. Cursor clicks "Load Mousy sample"; page switches to findings; camera pushes in on "Matches answer key: Found 2 of 2 planted bugs" and the Wrong-intent card. Caption: "One click. Two planted bugs. Zero AI calls." |
| 4 | 12.4-15.6 | Highlight 2: nine tools | Real home tool grid, cards rise in one by one. Caption: "Nine tools. Rules first, AI optional." |
| 5 | 15.6-18.2 | Highlight 3: your key | Provider pills Gemini · ChatGPT · Claude, a key chip "Stays in your browser". Caption: "Your key, your choice. No server." |
| 6 | 18.2-21.0 | Outro | Badge + "Kitsune Labs" + URL `sandeeepkiran.github.io/kitsune-labs` + "Free · open source · AGPL-3.0". |

Transitions: dip through the silver background between scenes (old out, then new in), never a busy crossfade.

## Sound

Synthesised in `work/make_audio.py`: a soft D-major pad and a plucked bell motif at 100 bpm; UI ticks, the stamp thump and the click are pitched notes in the same key, mixed low under the music.
