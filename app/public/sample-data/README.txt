Mousy sample pack - Kitsune Labs
================================

ALL DATA IS INVENTED. Mousy is not a real company. Every customer, order, phone number
(555-01xx, a fictional range), address and conversation was written for this demo.

Mousy is an imaginary online shop (home, kitchen, small gadgets). Its support bot is
"Mousy Assist". The conversations come from voice calls and web chats.

Files
-----
mousy_conversations.csv    40 conversations, one per row. The full transcript is in one cell.
mousy_conversations.xlsx   The same 40 conversations as an Excel workbook.
mousy_batch_20.xlsx        The first 20 conversations, for bulk and pipeline demos.
transcripts/*.txt          8 single conversations, one per core scenario.
intents_v3.xlsx            10 intents with a description and 5 example utterances each.
golden/*.json              What each core conversation should have been (for the diff view).
answer_key.json            The bugs planted in each conversation, with turn numbers.

Columns
-------
conversation_id, channel (voice|chat), started_at, ended_at (UTC), duration_sec, turns,
closed_by (customer|bot|agent|timeout), escalated (true|false), escalation_reason, queue,
outcome (resolved|escalated|abandoned), flow_steps (semicolon list), custom_metrics (JSON),
transcript

Transcript format
-----------------
One line per turn:  [hh:mm:ss] Speaker: text
The time is relative to the start of the conversation.

Planted bug types
-----------------
misroute, fallback_loop, premature_escalation, timeout_no_goodbye, bot_repeats,
wrong_order_id, ignored_correction. See answer_key.json for what each one means.
