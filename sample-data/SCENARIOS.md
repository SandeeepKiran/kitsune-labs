# Mousy sample pack: scenarios

All of this is invented. **Mousy** is an imaginary online shop (home, kitchen, small gadgets).
Its support bot is **Mousy Assist**. `tools\make_mousy_pack.py` turns this list into the files in
`app\public\sample-data\`. It uses a fixed seed, so every run writes the same files.

## Shape (copied as constants into the script)

| What | Value in the pack |
|---|---|
| Conversations | 40 (8 core + 32 variations) |
| Channel mix | 33 voice, 7 chat |
| Voice call | median about 17 turns (3-26), short customer replies ("yes", "M O four four one seven"), about 1-3 minutes |
| Chat | about 4-15 turns; some end by a 10-minute timeout (real chats are even shorter, but the tools need content) |
| Escalated | about 1 in 4 |
| Abandoned (timeout or hang-up) | about 1 in 5 |
| Flow steps per conversation | 2-9, median about 5 |
| Custom metrics | about 6 invented keys per conversation, some rows empty |
| Dates | 2025-03-01 to 2025-03-14, UTC |

## Invented facts

- Order IDs `MO-1000`..`MO-9999`. Conversation IDs `CNV-000001`..`CNV-000040`.
- Customers are "Customer" in transcripts. The bot greets some by an invented first name
  (Pip, Juniper, Wren, Clover, Hazel, Basil, Poppy, Fennel, Sorrel, Bramble, Tansy, Moss).
- Phone numbers only in voice calls, only `555-01xx` (reserved fictional range).
- Addresses: invented streets (Cheddar Row, Whisker Lane, Pantry Court, Crumb Street, Burrow Close,
  Acorn Way) in invented towns (Nibbleton, Burrowford, Crumbridge, Hollowmere).
- Carrier: Pawcel Post. Queues: `general_support`, `billing_team`, `returns_desk`.
- Products: blue kettle, two-slice toaster, bamboo cutting board, milk frother, cheese grater, desk
  lamp, set of mixing bowls, phone stand, night light, egg timer.

## Intents (10, also in `intents_v3.xlsx`)

| Intent | Customer wants to |
|---|---|
| `cancel_order` | cancel an order that has not shipped |
| `refund_status` | know where a refund is |
| `change_delivery_address` | send an order to a different address |
| `billing_dispute` | question a charge (for example, charged twice) |
| `track_parcel` | know where a parcel is and when it arrives |
| `gift_card_balance` | know how much is left on a gift card |
| `return_damaged_item` | return an item that arrived broken |
| `talk_to_human` | speak to a person |
| `update_payment_method` | change the card on the account |
| `product_question` | ask about a product (care, warranty) |

## Planted bugs (tagged in `answer_key.json`)

| Bug type | What happens | Severity |
|---|---|---|
| `misroute` | The bot sends the customer down the wrong intent (cancel -> refund) | high |
| `fallback_loop` | The bot says "Sorry, I didn't catch that" 3 or more times in a row | high |
| `premature_escalation` | The bot transfers to a person before it tries the self-service flow | medium |
| `timeout_no_goodbye` | The customer goes quiet; the conversation closes with no closing message | low |
| `bot_repeats` | The bot sends the same information twice | low |
| `wrong_order_id` | The bot reads back or uses a different order ID than the customer gave | high |
| `ignored_correction` | The customer corrects the bot; the bot carries on with the old value | high |

One normal re-prompt ("Sorry, I didn't catch that. Please say the order number again.") is
**not** a bug. Real voice bots mishear sometimes. A loop starts at 3.

## Core scenarios (one transcript file each, plus a golden file)

| # | File | Intent | Channel | Planted bugs | Ends |
|---|---|---|---|---|---|
| 1 | `01_cancel_order_chat.txt` | cancel_order | chat | misroute, ignored_correction | resolved |
| 2 | `02_refund_status_voice.txt` | refund_status | voice | none (the clean control) | resolved |
| 3 | `03_change_address_voice.txt` | change_delivery_address | voice | wrong_order_id | resolved |
| 4 | `04_billing_dispute_voice.txt` | billing_dispute | voice | premature_escalation | escalated |
| 5 | `05_track_parcel_voice.txt` | track_parcel | voice | fallback_loop | escalated |
| 6 | `06_gift_card_voice.txt` | gift_card_balance | voice | bot_repeats | resolved |
| 7 | `07_return_damaged_chat.txt` | return_damaged_item | chat | ignored_correction | resolved |
| 8 | `08_talk_to_human_chat.txt` | talk_to_human | chat | timeout_no_goodbye | abandoned |

`golden\<same name>.json` holds what the conversation **should** have been (the same customer and
order, no bugs). The diff view compares the two.

## Variations (32 more rows)

The script draws them with the fixed seed:

- Bugs come from a bag: misroute 4, fallback_loop 2, premature_escalation 3, timeout_no_goodbye 2,
  bot_repeats 3, wrong_order_id 2, ignored_correction 3, and 13 clean conversations.
- Each bug goes to an intent where it makes sense (for example, `wrong_order_id` only where the bot
  asks for an order number).
- 4 of the 32 variations are chat. Some clean conversations end by a hang-up or a timeout (not a bug:
  the bot says goodbye properly).
- Some voice callers open with a filler ("hello?", "um, hi") before the real request. The answer key
  records the first real customer utterance, for the First Utterance Finder.
