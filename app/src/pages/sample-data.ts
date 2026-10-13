import { mountShell } from '../shared/shell.ts';
import './sample-data.css';

import { urls } from '../shared/config.ts';
import { el, formatBytes } from '../shared/dom.ts';
import { findTool } from '../shared/tools.ts';

interface ManifestFile {
  path: string;
  title: string;
  purpose: string;
  bytes: number;
  tools: string[];
}

const main = mountShell('sample-data');

// A no-break space keeps the size line's height until the real size arrives (no layout shift).
const zipSize = el('span', { class: 'download-all__size mono' }, '\u00a0');
const hero = el('section', { class: 'tile tile--hero sd-hero rise', 'aria-labelledby': 'sd-title' },
  el('h1', { id: 'sd-title' }, 'Sample data'),
  el('p', { class: 'sd-banner', role: 'note' }, 'All data is invented. Mousy is not a real company.'),
  el('p', { class: 'sd-lead' },
    'Mousy is an imaginary online shop. Its support bot, Mousy Assist, talks to customers by voice and chat. ',
    'Use these files to try every tool. Some conversations have planted bugs; the answer key lists them.'),
);
const downloadAll = el('a', {
  class: 'tile tile--ink download-all rise', style: '--i:1', href: urls.sampleFile('mousy_sample_pack.zip'),
  download: 'mousy_sample_pack.zip', 'data-testid': 'download-all',
},
  el('span', { class: 'download-all__title' }, 'Download everything (.zip)'),
  el('span', {}, 'Every file below in one download.'),
  zipSize,
);
const list = el('ul', { class: 'sd-files', role: 'list', 'data-testid': 'sample-files' },
  el('li', { class: 'sd-loading' }, 'Loading the file list…'));

main.append(
  el('div', { class: 'sd-top' }, hero, downloadAll),
  el('section', { 'aria-labelledby': 'files-title' }, el('h2', { id: 'files-title', class: 'sd-heading' }, 'Files'), list),
);

void loadManifest();

async function loadManifest(): Promise<void> {
  try {
    const response = await fetch(urls.sampleFile('manifest.json'));
    if (!response.ok) throw new Error(String(response.status));
    const manifest = (await response.json()) as { files: ManifestFile[] };
    const zip = manifest.files.find((f) => f.path.endsWith('.zip'));
    if (zip) zipSize.textContent = formatBytes(zip.bytes);
    list.replaceChildren(...manifest.files.filter((f) => f !== zip).map(fileCard));
  } catch {
    list.replaceChildren(el('li', { class: 'sd-loading' },
      'The file list could not load. The Download everything button still works.'));
  }
}

function fileCard(file: ManifestFile, index: number): HTMLElement {
  const fileName = file.path.split('/').pop() ?? file.path;
  const links = file.tools
    .map((name) => findTool(name))
    .filter((tool) => tool !== undefined)
    .map((tool) => el('a', { class: 'sd-open', href: urls.tool(tool.slug, file.path) }, `Open in ${tool.name}`));
  return el('li', { class: 'tile sd-file rise', style: `--i:${Math.min(index + 2, 12)}` },
    el('h3', { class: 'sd-file__title' }, file.title),
    el('p', { class: 'sd-file__path mono' }, file.path),
    el('p', { class: 'sd-file__purpose' }, file.purpose),
    el('div', { class: 'sd-file__actions' },
      el('a', { class: 'btn btn--ink', href: urls.sampleFile(file.path), download: fileName },
        'Download ', el('span', { class: 'sd-file__size' }, formatBytes(file.bytes)),
        el('span', { class: 'visually-hidden' }, `, ${fileName}`)),
      ...links,
    ),
  );
}
