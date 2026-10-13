// The bento tool-page template. Tiles: hero (with Load Mousy sample), answer, run,
// input (paste / drop / pick, plus tool settings), results, run log, export.
// Each tool supplies a ToolDefinition; the template handles files, progress, AI and export.
import './tool-page.css';

import { AiError, askAi, type AiReply, type AiRequest } from './ai.ts';
import { urls } from './config.ts';
import { guessMapping, type LoadedInput, type Mapping } from './conversations.ts';
import { el, formatBytes, fromHtml, prefersReducedMotion } from './dom.ts';
import { readWorkbook, readZip, tableFromCsv } from './files.ts';
import { installFileDrop, type DroppedFile } from './file-drop.ts';
import { sleepingFox } from './fox.ts';
import { openKeyDrawer } from './key-drawer.ts';
import { getModel, getProvider, hasKey, KEY_CHANGE_EVENT, PROVIDERS } from './key-store.ts';
import { nineTails, setLit } from './nine-tails.ts';
import { registerCommands } from './palette.ts';
import { createRunLog, type RunLog } from './run-log.ts';
import { AI_LABELS, type ToolInfo } from './tools.ts';
import { markTried } from './tried.ts';

export interface ExportOption {
  label: string;
  run: () => void | Promise<void>;
}

export interface ToolResult {
  answer: { value: string; label: string; sub?: string };
  results: Node;
  logLine: string;
  exports: ExportOption[];
}

export interface AiSession {
  /** True when a key is set and the visitor left "Use AI" on. */
  readonly ready: boolean;
  readonly label: string;
  readonly calls: number;
  ask: (request: AiRequest) => Promise<AiReply>;
}

export interface RunContext {
  input: LoadedInput;
  mapping: Mapping | null;
  log: RunLog;
  ai: AiSession;
  /** Light the nine tails in proportion to real work done (bulk runs). */
  progress: (done: number, total: number, label?: string) => void;
  /** Let the page repaint between rows of a long run. */
  tick: () => Promise<void>;
}

export interface ToolDefinition {
  answerLabel: string;
  heroHint?: string;
  inputLabel?: string;
  inputHint?: string;
  placeholder?: string;
  accept?: string;
  /** Show transcript / ID column pickers when a spreadsheet is loaded. */
  mapping?: boolean;
  /** What AI adds, shown under the "Use AI" switch. */
  aiNote?: string;
  options?: () => Node;
  inputChanged?: (input: LoadedInput | null) => void;
  run: (ctx: RunContext) => ToolResult | Promise<ToolResult>;
}

const SAFE_SAMPLE_PATH = /^[\w-]+(\/[\w-]+)*\.(txt|json|csv|xlsx|zip)$/;
const TEXT_FILE = /\.(txt|json|ya?ml|md|log)$/i;
const DEFAULT_PLACEHOLDER = '[00:00:02] Mousy Assist: Hi, this is Mousy Assist. How can I help?\n[00:00:09] Customer: I want to cancel order MO-4417.';

export function mountToolPage(main: HTMLElement, tool: ToolInfo, def: ToolDefinition): void {
  document.title = `${tool.name} · Kitsune Labs`;
  const log = createRunLog();
  const usesAi = tool.ai !== 'none';

  // -- hero ---------------------------------------------------------------------
  const loadButton = el('button', { type: 'button', class: 'btn btn--ink', 'data-testid': 'load-sample' }, 'Load Mousy sample');
  const hero = el('section', { class: 'tile tile--hero bento__hero rise', style: '--i:0', 'aria-labelledby': 'tool-title' },
    el('div', { class: 'bento__hero-text' },
      el('p', { class: 'bento__eyebrow' },
        el('span', { class: `chip${usesAi ? ' chip--ai' : ''}` }, AI_LABELS[tool.ai]),
        el('span', { class: 'chip' }, usesAi ? 'Works without a key' : 'Runs in your browser'),
      ),
      el('h1', { id: 'tool-title' }, tool.name),
      el('p', { class: 'bento__desc' }, tool.description),
      el('div', { class: 'hero-bar' },
        el('span', {}, def.heroHint ?? 'Paste a conversation, or drop a .txt, .json or .csv file'),
        loadButton,
      ),
    ),
  );
  hero.append(fromHtml(sleepingFox('bento__fox')));

  // -- answer + run ---------------------------------------------------------------
  const answerLabel = el('h2', { class: 'tile__title' }, def.answerLabel);
  const answerValue = el('div', { class: 'big-number', 'data-testid': 'answer' }, '–');
  const answerSub = el('p', { class: 'bento__sub', 'data-testid': 'answer-sub' }, 'Load the sample or add your own input.');
  const answer = el('section', { class: 'tile tile--lilac bento__answer rise', style: '--i:1', 'aria-live': 'polite' },
    answerLabel, answerValue, answerSub);

  const runButton = el('button', { type: 'button', class: 'btn btn--ink btn--big', 'data-testid': 'run' }, 'Run');
  const tails = nineTails(0);
  const runStatus = el('p', { class: 'bento__run-status mono', 'data-testid': 'run-status' }, 'Ready');
  const aiBox = usesAi ? buildAiToggle() : null;
  const run = el('section', { class: 'tile tile--butter bento__run rise', style: '--i:2' },
    el('h2', { class: 'tile__title' }, 'Run'),
    runButton,
    aiBox?.element ?? null,
    el('div', {}, tails, runStatus),
  );

  // -- input ----------------------------------------------------------------------
  const textarea = el('textarea', {
    id: 'tool-input', class: 'field mono bento__textarea', rows: '14', spellcheck: 'false',
    placeholder: def.placeholder ?? DEFAULT_PLACEHOLDER, 'aria-describedby': 'input-hint',
  });
  const loadedPanel = el('div', { class: 'loaded', hidden: true, 'data-testid': 'loaded-file' });
  const sourceChip = el('span', { class: 'chip mono bento__source', 'data-testid': 'source' }, 'pasted text');
  const clearButton = el('button', { type: 'button', class: 'btn btn--quiet' }, 'Clear');
  const dropZone = el('div', { class: 'drop-zone' }, textarea, loadedPanel,
    el('div', { class: 'drop-zone__overlay', 'aria-hidden': 'true' }, 'Drop the file to load it'));
  const picker = installFileDrop({
    zone: dropZone,
    accept: def.accept ?? '.txt,.json,.csv,.yaml,.yml,.xlsx,.zip',
    onFile: (file) => void acceptFile(file),
    onError: (message) => log.add(message, 'warn'),
  });
  const optionsBox = def.options ? el('div', { class: 'tool-options' }, def.options()) : null;
  const input = el('section', { class: 'tile bento__input rise', style: '--i:3' },
    el('h2', { class: 'tile__title' }, el('label', { for: 'tool-input' }, def.inputLabel ?? 'Conversation')),
    dropZone,
    el('div', { class: 'bento__input-row' }, picker, clearButton, sourceChip),
    el('p', { id: 'input-hint', class: 'bento__hint' }, def.inputHint ?? 'Drop a file on the box, or paste text. Ctrl+Enter runs.'),
    optionsBox,
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

  // -- state ----------------------------------------------------------------------
  let sourceName = 'pasted text';
  let loaded: LoadedInput | null = null;      // a spreadsheet or .zip; text lives in the textarea
  let mapping: Mapping | null = null;
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
    showText('');
    setSource('pasted text');
    resultsBody.replaceChildren(emptyState());
    answerValue.textContent = '–';
    answerLabel.textContent = def.answerLabel;
    answerSub.textContent = 'Load the sample or add your own input.';
    setLit(tails, 0);
    runStatus.textContent = 'Ready';
    renderExports([]);
    log.clear();
    def.inputChanged?.(null);
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

  function currentInput(): LoadedInput | null {
    if (loaded) return loaded;
    return textarea.value.trim() ? { kind: 'text', name: sourceName, text: textarea.value } : null;
  }

  function showText(text: string): void {
    loaded = null;
    mapping = null;
    textarea.value = text;
    textarea.hidden = false;
    loadedPanel.hidden = true;
    loadedPanel.replaceChildren();
  }

  function showLoaded(value: Exclude<LoadedInput, { kind: 'text' }>, bytes: number): void {
    loaded = value;
    textarea.value = '';
    textarea.hidden = true;
    loadedPanel.hidden = false;
    const head = el('p', { class: 'loaded__name' }, el('span', { class: 'mono' }, value.name), ` · ${formatBytes(bytes)}`);
    if (value.kind === 'table') {
      mapping = guessMapping(value.table);
      const summary = el('p', { class: 'loaded__summary' },
        `${value.table.rows.length} rows · ${value.table.columns.length} columns${value.table.sheet ? ` · sheet "${value.table.sheet}"` : ''}`);
      const columns = el('ul', { class: 'loaded__columns', 'aria-label': 'Columns' },
        ...value.table.columns.map((c) => el('li', { class: 'chip mono' }, c)));
      loadedPanel.replaceChildren(head, summary, ...(def.mapping ? [mappingControls(value.table.columns)] : []), columns);
    } else {
      const names = value.files.slice(0, 12).map((f) => el('li', { class: 'mono' }, f.name));
      loadedPanel.replaceChildren(head,
        el('p', { class: 'loaded__summary' }, `${value.files.length} text file${value.files.length === 1 ? '' : 's'} inside`),
        el('ul', { class: 'loaded__files' }, ...names, value.files.length > 12 ? el('li', {}, `… and ${value.files.length - 12} more`) : null));
    }
    def.inputChanged?.(value);
  }

  function mappingControls(columns: string[]): HTMLElement {
    const select = (id: string, label: string, current: string, allowNone: boolean, onPick: (value: string) => void) => {
      const box = el('select', { id, class: 'field field--compact', 'data-testid': id },
        ...(allowNone ? [el('option', { value: '' }, '(number the rows)')] : []),
        ...columns.map((c) => el('option', { value: c, selected: c === current }, c)));
      box.addEventListener('change', () => onPick(box.value));
      return el('label', { class: 'mapping__field' }, el('span', {}, label), box);
    };
    return el('div', { class: 'mapping' },
      el('p', { class: 'mapping__title' }, 'Column mapping'),
      select('map-transcript', 'Transcript column', mapping?.transcript ?? '', false, (v) => { mapping = { ...mapping!, transcript: v }; }),
      select('map-id', 'ID column', mapping?.id ?? '', true, (v) => { mapping = { ...mapping!, id: v }; }),
    );
  }

  async function loadSample(path: string): Promise<void> {
    try {
      const response = await fetch(urls.sampleFile(path));
      if (!response.ok) throw new Error(String(response.status));
      const blob = await response.blob();
      const file: DroppedFile = TEXT_FILE.test(path) || path.endsWith('.csv')
        ? { name: path, size: blob.size, kind: 'text', text: await blob.text() }
        : { name: path, size: blob.size, kind: 'binary', bytes: await blob.arrayBuffer() };
      if (await acceptFile(file)) await runTool();
    } catch {
      log.add(`Could not load the sample ${path}. Check your connection and try again.`, 'fail');
    }
  }

  /** Put a file into the input. Returns false if it could not be read. */
  async function acceptFile(file: DroppedFile): Promise<boolean> {
    const lower = file.name.toLowerCase();
    try {
      if (lower.endsWith('.csv') && file.text !== undefined) {
        showLoaded({ kind: 'table', name: file.name, table: tableFromCsv(file.text) }, file.size);
      } else if (/\.xlsx?$/.test(lower) && file.bytes) {
        showLoaded({ kind: 'table', name: file.name, table: await readWorkbook(file.bytes) }, file.size);
      } else if (lower.endsWith('.zip') && file.bytes) {
        const { files, skipped } = await readZip(file.bytes);
        showLoaded({ kind: 'files', name: file.name, files }, file.size);
        if (skipped) log.add(`Skipped ${skipped} file${skipped === 1 ? '' : 's'} in the .zip that are not text.`);
      } else if (file.text !== undefined) {
        showText(file.text);
        def.inputChanged?.({ kind: 'text', name: file.name, text: file.text });
      } else {
        log.add(`${file.name} is not a file type this tool reads. Try .txt, .json, .yaml, .csv, .xlsx or .zip.`, 'warn');
        return false;
      }
    } catch (error) {
      log.add(`Could not read ${file.name}: ${(error as Error).message}`, 'fail');
      return false;
    }
    setSource(file.name);
    log.add(`Loaded ${file.name} (${formatBytes(file.size)})`);
    return true;
  }

  async function runTool(): Promise<void> {
    if (running) return;
    const value = currentInput();
    if (!value) {
      log.add('Nothing to run. Paste something or load the sample first.', 'warn');
      textarea.focus();
      return;
    }
    running = true;
    runButton.disabled = true;
    runStatus.textContent = 'Running…';
    setLit(tails, 0);

    let reported = false;
    let calls = 0;
    const session: AiSession = {
      get ready() { return Boolean(aiBox?.enabled()); },
      get label() { return `${PROVIDERS[getProvider()].label} (${getModel()})`; },
      get calls() { return calls; },
      async ask(request) {
        if (!aiBox?.enabled()) throw new AiError('AI is off for this run.');
        calls += 1;
        // Electro spark: a violet line runs around the tiles while the AI works.
        results.classList.add('is-ai-running');
        run.classList.add('is-ai-running');
        try {
          const reply = await askAi(request);
          log.add(`AI call ${calls} to ${PROVIDERS[reply.provider].label} (${reply.model}) · ${(reply.ms / 1000).toFixed(1)} s`);
          return reply;
        } finally {
          results.classList.remove('is-ai-running');
          run.classList.remove('is-ai-running');
        }
      },
    };
    const ctx: RunContext = {
      input: value,
      mapping,
      log,
      ai: session,
      progress(done, total, label) {
        reported = true;
        setLit(tails, total ? Math.min(9, Math.ceil((9 * done) / total)) : 9);
        runStatus.textContent = label ?? `${done} of ${total} done`;
      },
      tick: () => new Promise((resolve) => setTimeout(resolve, 0)),
    };

    try {
      // Time only the work, not the tail animation, so the log shows honest numbers.
      const started = performance.now();
      const work = Promise.resolve().then(() => def.run(ctx));
      const animation = idleTails(() => reported);
      const result = await work;
      const ms = Math.max(1, Math.round(performance.now() - started));
      await animation;
      setLit(tails, 9);
      answerLabel.textContent = result.answer.label;
      answerValue.textContent = result.answer.value;
      answerSub.textContent = result.answer.sub ?? '';
      resultsBody.replaceChildren(result.results);
      renderExports(result.exports);
      runStatus.textContent = 'Done';
      log.add(`${result.logLine} · ${calls} AI call${calls === 1 ? '' : 's'} · ${ms} ms`, 'pass');
      markTried(tool.slug);
    } catch (error) {
      runStatus.textContent = 'Stopped';
      log.add(`Run failed: ${(error as Error).message}`, 'fail');
    } finally {
      running = false;
      runButton.disabled = false;
    }
  }

  /** Light the tails one by one for short runs. Stops as soon as the tool reports real progress. */
  async function idleTails(stop: () => boolean): Promise<void> {
    if (prefersReducedMotion()) return;
    for (let lit = 1; lit <= 9 && !stop(); lit += 1) {
      setLit(tails, lit);
      await new Promise((resolve) => setTimeout(resolve, 70));
    }
  }

  function renderExports(options: ExportOption[]): void {
    if (!options.length) {
      exportList.replaceChildren(el('p', { class: 'bento__hint' }, 'Run the tool to export its results.'));
      return;
    }
    exportList.replaceChildren(...options.map((option) => {
      const button = el('button', { type: 'button', class: 'btn' }, option.label);
      button.addEventListener('click', async () => {
        try {
          await option.run();
          log.add(`Exported: ${option.label.replace(/^(Download|Copy) /, '')}`);
        } catch (error) {
          log.add(`Export failed: ${(error as Error).message}`, 'fail');
        }
      });
      return button;
    }));
  }

  function buildAiToggle() {
    const box = el('input', { type: 'checkbox', id: 'use-ai', 'data-testid': 'use-ai' });
    const label = el('span', {});
    const keyButton = el('button', { type: 'button', class: 'btn btn--quiet btn--small', 'data-testid': 'ai-add-key' }, 'Add AI key');
    keyButton.addEventListener('click', openKeyDrawer);
    const note = el('p', { class: 'ai-toggle__note' }, def.aiNote ?? 'AI adds a second opinion. Rules still run.');
    const element = el('div', { class: 'ai-toggle' }, el('label', { class: 'check' }, box, label), keyButton, note);
    let wanted = true;    // the visitor's choice, kept while the key comes and goes
    box.addEventListener('change', () => { wanted = box.checked; });
    const refresh = () => {
      const keyed = hasKey();
      box.disabled = !keyed;
      box.checked = keyed && wanted;
      label.textContent = keyed ? `Use AI · ${PROVIDERS[getProvider()].label}` : 'Use AI (needs a key)';
      keyButton.hidden = keyed;
    };
    refresh();
    window.addEventListener(KEY_CHANGE_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return { element, enabled: () => hasKey() && box.checked };
  }
}

function emptyState(): HTMLElement {
  const box = el('div', { class: 'empty' });
  box.append(fromHtml(sleepingFox()));
  box.append(
    el('p', { class: 'empty__title' }, 'Nothing sniffed out yet.'),
    el('p', {}, 'Drop a file to start, or press Load Mousy sample.'),
    el('p', {}, el('a', { href: urls.sampleData }, 'See all sample files')),
  );
  return box;
}
