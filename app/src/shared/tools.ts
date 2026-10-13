// The nine tools. One place for names, descriptions and default samples, so the header
// tabs, home tiles, command palette and tool pages never disagree.

export type AiUse = 'none' | 'optional' | 'ai-plus-rules';

export interface ToolInfo {
  slug: string;
  name: string;
  tabLabel: string;
  description: string;
  ai: AiUse;
  sample: string;          // path inside public/sample-data/
}

export const TOOLS: ToolInfo[] = [
  {
    slug: 'bug-finder', name: 'Bug Finder', tabLabel: 'Bug Finder',
    description: 'Find where a bot conversation went wrong.',
    ai: 'ai-plus-rules', sample: 'transcripts/01_cancel_order_chat.txt',
  },
  {
    slug: 'test-case-generator', name: 'Test Case Generator', tabLabel: 'Test cases',
    description: 'Turn transcripts into structured test cases.',
    ai: 'ai-plus-rules', sample: 'mousy_conversations.csv',
  },
  {
    slug: 'utterance-generator', name: 'Utterance Generator', tabLabel: 'Utterances',
    description: 'Generate validation utterances for an intent.',
    ai: 'ai-plus-rules', sample: 'intents_v3.xlsx',
  },
  {
    slug: 'transcript-converter', name: 'Transcript Converter', tabLabel: 'Converter',
    description: 'Clean raw chat text into .txt, .json or .yaml test scripts.',
    ai: 'none', sample: 'transcripts/02_refund_status_voice.txt',
  },
  {
    slug: 'first-utterance-finder', name: 'First Utterance Finder', tabLabel: 'First utterance',
    description: 'Pull the first real customer turn from each transcript.',
    ai: 'optional', sample: 'mousy_conversations.csv',
  },
  {
    slug: 'metrics-extractor', name: 'Metrics Extractor', tabLabel: 'Metrics',
    description: 'Add turn, fallback and escalation columns to a spreadsheet.',
    ai: 'none', sample: 'mousy_conversations.csv',
  },
  {
    slug: 'report-builder', name: 'Report Builder', tabLabel: 'Reports',
    description: 'Build a QA summary report from run results.',
    ai: 'optional', sample: 'answer_key.json',
  },
  {
    slug: 'email-templates', name: 'Email Templates', tabLabel: 'Emails',
    description: 'Daily status, critical-issue and meeting emails.',
    ai: 'optional', sample: 'transcripts/05_track_parcel_voice.txt',
  },
  {
    slug: 'qa-handbook', name: 'QA Handbook', tabLabel: 'Handbook',
    description: 'A practical guide to testing conversational AI.',
    ai: 'none', sample: 'transcripts/06_gift_card_voice.txt',
  },
];

export const AI_LABELS: Record<AiUse, string> = {
  none: 'No AI',
  optional: 'AI optional',
  'ai-plus-rules': 'AI + rules',
};

export function findTool(slugOrName: string): ToolInfo | undefined {
  return TOOLS.find((t) => t.slug === slugOrName || t.name === slugOrName);
}
