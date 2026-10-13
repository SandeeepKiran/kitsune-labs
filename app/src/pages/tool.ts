import { mountShell } from '../shared/shell.ts';
import { el } from '../shared/dom.ts';
import { mountToolPage } from '../shared/tool-page.ts';
import { findTool } from '../shared/tools.ts';

// Each tools/<slug>/index.html sets <body data-tool="<slug>">.
const slug = document.body.dataset.tool ?? '';
const tool = findTool(slug);
const main = mountShell(`tool:${slug}`);

if (tool) {
  mountToolPage(main, tool);
} else {
  main.append(el('h1', {}, 'Tool not found'));
}
