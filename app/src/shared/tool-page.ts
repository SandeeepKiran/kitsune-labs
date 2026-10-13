// The bento tool-page template. Tiles: hero (with Load Mousy sample), answer, run,
// input (paste / drop / pick), results, run log, export. Each tool plugs in its own run()
// in M3/M4; until then the default run() previews the parsed transcript.
import './tool-page.css';

import { urls } from './config.ts';
import { csvRecords } from './csv.ts';
import { el, formatBytes, fromHtml } from './dom.ts';
import { baseName, downloadJson, downloadText } from './export.ts';
import { installFileDrop, type DroppedFile } from './file-drop.ts';
import { sleepingFox } from './fox.ts';
import { nineTails, playTails, setLit } from './nine-tails.ts';
import { registerCommands } from './palette.ts';
import { createRunLog } from './run-log.ts';
import { AI_LABELS, type ToolInfo } from './tools.ts';
import { formatClock, parseTranscript, toTranscriptText, transcriptFromJson } from './transcript.ts';
import { markTried } from './tried.ts';

export interface ToolInput {
  text: string;
  sourceName: string;
}

export interface ExportOption {
  label: string;
  run: () => void;
}

export interface ToolResult {
  answer: { value: string; label: string; sub?: string };
  results: Node;
  logLine: string;
  exports: ExportOption[];
}

export interface ToolHooks {
  run: (input: ToolInput) => ToolResult | Promise<ToolResult>;
}

const SAFE_SAMPLE_PATH = /^[\w-]+(\/[\w-]+)*\.(txt|json|csv|xlsx|zip)$/;

export function mountToolPage(main: HTMLElement, tool: ToolInfo, hooks: ToolHooks = previewHooks(tool)): void {
  document.title = `${tool.name} · Kitsune Labs`;
  const log = createRunLog();

  // -- hero ---------------------------------------------------------------------
  const loadButton = el('button', { type: 'button', class: 'btn btn--ink', 'data-testid': 'load-sample' }, 'Load Mousy sample');
  const hero = el('section', { class: 'tile tile--hero bento__hero rise', style: '--i:0', 'aria-labelledby': 'tool-title' },
    el('div', { class: 'bento__hero-text' },
      el('p', { class: 'bento__eyebrow' },
        el('span', { class: `chip${tool.ai === 'none' ? '' : ' chip--ai'}` }, AI_LABELS[tool.ai]),
        el('span', { class: 'chip' }, `Preview: full checks arrive in ${tool.milestone}`),
      ),
      el('h1', { id: 'tool-title' }, tool.name),
      el('p', { class: 'bento__desc' }, tool.description),
      el('div', { class: 'hero-bar' },
        el('span', {}, 'Paste a conversation, or drop a .txt, .json or .csv file'),
        loadButton,
      ),
    ),
  );
  hero.append(fromHtml(sleepingFox('bento__fox')));

  // -- answer + run ---------------------------------------------------------------
  const answerLabel = el('h2', { class: 'tile__title' }, 'Turns parsed');
  const answerValue = el('div', { class: 'big-number', 'data-testid': 'answer' }, '–');
  const answerSub = el('p', { class: 'bento__sub' }, 'Load the sample or paste a conversation.');
  const answer = el('section', { class: 'tile tile--lilac bento__answer rise', style: '--i:1', 'aria-live': 'polite' },
    answerLabel, answerValue, answerSub);

  const runButton = el('button', { type: 'button', class: 'btn btn--ink btn--big', 'data-testid': 'run' }, 'Run');
  const tails = nineTails(0);
  const runStatus = el('p', { class: 'bento__run-status mono' }, 'Ready');
  const run = el('section', { class: 'tile tile--butter bento__run rise', style: '--i:2' },
    el('h2', { class: 'tile__title' }, 'Run'),
    runButton,
    el('div', {}, tails, runStatus),
  );

  // -- input ----------------------------------------------------------------------
  const textarea = el('textarea', {
    id: 'tool-input', class: 'field mono bento__textarea', rows: '14', spellcheck: 'false',
    placeholder: '[00:00:02] Mousy Assist: Hi, this is Mousy Assist. How can I help?\n[00:00:09] Customer: I want to cancel order MO-4417.',
    'aria-describedby': 'input-hint',
  });
  const sourceChip = el('span', { class: 'chip mono bento__source', 'data-testid': 'source' }, 'pasted text');
  const clearButton = el('button', { type: 'button', class: 'btn btn--quiet' }, 'Clear');
  const dropZone = el('div', { class: 'drop-zone' }, textarea, el('div', { class: 'drop-zone__overlay', 'aria-hidden': 'true' }, 'Drop the file to load it'));
  const picker = installFileDrop({
    zone: dropZone,
    accept: '.txt,.json,.csv,.yaml,.yml,.xlsx,.zip',
    onFile: (file) => void acceptFile(file),
    onError: (message) => log.add(message, 'warn'),
  });
  const input = el('section', { class: 'tile bento__input rise', style: '--i:3' },
    el('h2', { class: 'tile__title' }, el('label', { for: 'tool-input' }, 'Conversation')),
    dropZone,
    el('div', { class: 'bento__input-row' }, picker, clearButton, sourceChip),
    el('p', { id: 'input-hint', class: 'bento__hint' }, 'Drop a file on the box, or paste text. Ctrl+Enter runs.'),
  );

  // -- results, log, export -------------------------------------------------------
  const resultsBody = el('div', { class: 'bento__results-body', 'data-testid': 'results' }, emptyState());
  const results = el('section', { class: 'tile tile--mist bento__results rise', style: '--i:4', 'aria-labelledby': 'results-title' },
    el('h2', { id: 'results-title', class: 'tile__title' }, 'Results'),
    resultsBody,
  );
  const logTile = el('section', { class: 'tile tile--blush bento__log rise', style: '--i:5' },
    el('h2', { class: 'tile__title' }, 'Run log'), log.element);
  const exportList = el('div', { class: 'bento__exports' });
  const exportTile = el('section', { class: 'tile tile--mist bento__export rise', style: '--i:6' },
    el('h2', { class: 'tile__title' }, 'Export'), exportList);
  renderExports([]);

  main.append(el('div', { class: 'bento' }, hero, answer, run, input, results, logTile, exportTile));

  // -- behaviour ------------------------------------------------------------------
  let sourceName = 'pasted text';
  let running = false;

  textarea.addEventListener('input', () => {
    if (sourceName !== 'pasted text') setSource('pasted text');
  });
  textarea.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      void runTool();
    }
  });
  clearButton.addEventListener('click', () => {
    textarea.value = '';
    setSource('pasted text');
    resultsBody.replaceChildren(emptyState());
    answerValue.textContent = '–';
    answerSub.textContent = 'Load the sample or paste a conversation.';
    setLit(tails, 0);
    runStatus.textContent = 'Ready';
    renderExports([]);
    log.clear();
    textarea.focus();
  });
  runButton.addEventListener('click', () => void runTool());
  loadButton.addEventListener('click', () => void loadSample(tool.sample));

  registerCommands(() => [
    { id: 'load-sample', label: `Load Mousy sample into ${tool.name}`, group: 'This tool', run: () => void loadSample(tool.sample) },
    { id: 'run', label: `Run ${tool.name}`, group: 'This tool', run: () => void runTool() },
  ]);

  const requested = new URLSearchParams(location.search).get('sample');
  if (requested) {
    if (SAFE_SAMPLE_PATH.test(requested)) void loadSample(requested);
    else log.add('That sample link is not valid. Use the Load Mousy sample button.', 'warn');
  }

  function setSource(name: string): void {
    sourceName = name;
    sourceChip.textContent = name;
  }

  async function loadSample(path: string): Promise<void> {
    try {
      const response = await fetch(urls.sampleFile(path));
      if (!response.ok) throw new Error(String(response.status));
      const isText = /\.(txt|json|csv)$/.test(path);
      const blob = await response.blob();
      const file: DroppedFile = isText
        ? { name: path, size: blob.size, kind: 'text', text: await blob.text() }
        : { name: path, size: blob.size, kind: 'binary', bytes: await blob.arrayBuffer() };
      const accepted = await acceptFile(file);
      if (accepted) await runTool();
    } catch {
      log.add(`Could not load the sample ${path}. Check your connection and try again.`, 'fail');
    }
  }

  /** Put a file into the input box. Returns false if this file type cannot be read yet. */
  async function acceptFile(file: DroppedFile): Promise<boolean> {
    log.add(`Loaded ${file.name} (${formatBytes(file.size)})`);
    const lower = file.name.toLowerCase();
    if (file.kind === 'binary' || !file.text) {
      log.add('Excel and .zip reading arrives in M3. For now, try a .txt, .json or .csv file.', 'warn');
      return false;
    }
    let text = file.text;
    if (lower.endsWith('.csv')) {
      const records = csvRecords(text);
      const first = records.find((r) => r.transcript);
      if (first) {
        text = first.transcript;
        log.add(`CSV with ${records.length} rows. Showing ${first.conversation_id || 'the first row'}; bulk runs arrive in M3.`);
      }
    } else if (lower.endsWith('.json')) {
      try {
        const fromJson = transcriptFromJson(JSON.parse(text));
        if (fromJson) text = fromJson;
      } catch {
        log.add('That JSON file could not be read. Showing it as plain text.', 'warn');
      }
    }
    textarea.value = text;
    setSource(file.name);
    return true;
  }

  async function runTool(): Promise<void> {
    if (running) return;
    const text = textarea.value;
    if (!text.trim()) {
      log.add('Nothing to run. Paste a conversation or load the sample first.', 'warn');
      textarea.focus();
      return;
    }
    running = true;
    runButton.disabled = true;
    runStatus.textContent = 'Running…';
    setLit(tails, 0);
    try {
      // Time only the work, not the tail animation, so the log shows honest numbers.
      const started = performance.now();
      let ms = 0;
      const work = Promise.resolve(hooks.run({ text, sourceName })).then((value) => {
        ms = Math.max(1, Math.round(performance.now() - started));
        return value;
      });
      const [result] = await Promise.all([work, playTails(tails)]);
      answerLabel.textContent = result.answer.label;
      answerValue.textContent = result.answer.value;
      answerSub.textContent = result.answer.sub ?? '';
      resultsBody.replaceChildren(result.results);
      renderExports(result.exports);
      runStatus.textContent = '9 of 9 steps done';
      log.add(`${result.logLine} · ${ms} ms`, 'pass');
      markTried(tool.slug);
    } catch (error) {
      runStatus.textContent = 'Stopped';
      log.add(`Run failed: ${(error as Error).message}`, 'fail');
    } finally {
      running = false;
      runButton.disabled = false;
    }
  }

  function renderExports(options: ExportOption[]): void {
    if (!options.length) {
      exportList.replaceChildren(el('p', { class: 'bento__hint' }, 'Run the tool to export its results.'));
      return;
    }
    exportList.replaceChildren(...options.map((option) => {
      const button = el('button', { type: 'button', class: 'btn' }, option.label);
      button.addEventListener('click', () => {
        option.run();
        log.add(`Exported: ${option.label.replace(/^Download /, '')}`);
      });
      return button;
    }));
  }
}

function emptyState(): HTMLElement {
  const box = el('div', { class: 'empty' });
  box.append(fromHtml(sleepingFox()));
  box.append(
    el('p', { class: 'empty__title' }, 'Nothing sniffed out yet.'),
    el('p', {}, 'Drop a transcript to start, or press Load Mousy sample.'),
    el('p', {}, el('a', { href: urls.sampleData }, 'See all sample files')),
  );
  return box;
}

/** Default run(): parse the transcript and show it turn by turn. */
export function previewHooks(tool: ToolInfo): ToolHooks {
  return {
    run({ text, sourceName }) {
      const turns = parseTranscript(text);
      const speakers = new Set(turns.map((t) => t.speaker));
      const last = turns.at(-1)?.seconds ?? null;
      const list = el('ol', { class: 'turns' });
      for (const turn of turns.slice(0, 300)) {
        list.append(el('li', { class: `turn turn--${turn.role}` },
          el('span', { class: 'turn__time mono' }, formatClock(turn.seconds)),
          el('span', { class: 'turn__who' }, turn.speaker),
          el('span', { class: 'turn__text mono' }, turn.text),
        ));
      }
      const body = turns.length
        ? el('div', {},
            el('p', { class: 'bento__hint' }, `Preview only. The ${tool.name} checks arrive in ${tool.milestone}.`),
            list)
        : el('div', { class: 'empty' },
            el('p', { class: 'empty__title' }, 'No turns found.'),
            el('p', {}, 'Each line should look like "[00:00:02] Mousy Assist: Hi" or "Customer: Hi".'));
      const stem = baseName(sourceName === 'pasted text' ? 'conversation' : sourceName);
      return {
        answer: {
          value: String(turns.length),
          label: 'Turns parsed',
          sub: turns.length ? `${speakers.size} speakers · ${last === null ? 'no times' : formatClock(last)} long` : 'Check the line format.',
        },
        results: body,
        logLine: `Parsed ${turns.length} turns · ${speakers.size} speakers · 0 AI calls`,
        exports: turns.length
          ? [
              { label: 'Download .txt (clean)', run: () => downloadText(`${stem}.clean.txt`, `${toTranscriptText(turns)}\n`) },
              { label: 'Download .json', run: () => downloadJson(`${stem}.json`, { source: sourceName, turns }) },
            ]
          : [],
      };
    },
  };
}
