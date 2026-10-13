import { mountShell } from '../shared/shell.ts';
import { el } from '../shared/dom.ts';
import { mountToolPage, type ToolDefinition } from '../shared/tool-page.ts';
import { findTool, type ToolInfo } from '../shared/tools.ts';

// A tool module gives the template a definition, or (QA Handbook) mounts its own page.
export interface ToolModule {
  definition?: ToolDefinition;
  mount?: (main: HTMLElement, tool: ToolInfo) => void;
}

// One file per tool, loaded only on that tool's page so each page stays small.
const MODULES: Record<string, () => Promise<ToolModule>> = {
  'bug-finder': () => import('../tools/bug-finder.ts'),
  'test-case-generator': () => import('../tools/test-case-generator.ts'),
  'utterance-generator': () => import('../tools/utterance-generator.ts'),
  'transcript-converter': () => import('../tools/transcript-converter.ts'),
  'first-utterance-finder': () => import('../tools/first-utterance-finder.ts'),
  'metrics-extractor': () => import('../tools/metrics-extractor.ts'),
  'report-builder': () => import('../tools/report-builder.ts'),
  'email-templates': () => import('../tools/email-templates.ts'),
  'qa-handbook': () => import('../tools/qa-handbook.ts'),
};

// Each tools/<slug>/index.html sets <body data-tool="<slug>">.
const slug = document.body.dataset.tool ?? '';
const tool = findTool(slug);
const main = mountShell(`tool:${slug}`);
const load = MODULES[slug];

if (tool && load) {
  load().then((module) => {
    if (module.mount) module.mount(main, tool);
    else if (module.definition) mountToolPage(main, tool, module.definition);
  }).catch(() => {
    main.append(el('h1', {}, tool.name), el('p', {}, 'This tool could not load. Reload the page to try again.'));
  });
} else {
  main.append(el('h1', {}, 'Tool not found'));
}
