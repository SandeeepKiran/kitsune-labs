// File drop: drag a file onto a zone, or press the button to pick one. Files are read
// in the browser only; nothing is uploaded anywhere.
import { el } from './dom.ts';

export interface DroppedFile {
  name: string;
  size: number;
  kind: 'text' | 'binary';
  text?: string;
  bytes?: ArrayBuffer;
}

const TEXT_EXTENSIONS = ['.txt', '.json', '.csv', '.yaml', '.yml', '.md', '.log'];
const MAX_BYTES = 10 * 1024 * 1024;

export interface FileDropOptions {
  zone: HTMLElement;
  accept: string;            // for the file picker, e.g. ".txt,.json,.csv"
  onFile: (file: DroppedFile) => void;
  onError: (message: string) => void;
}

export function installFileDrop({ zone, accept, onFile, onError }: FileDropOptions): HTMLElement {
  const input = el('input', { type: 'file', accept, class: 'visually-hidden', tabindex: '-1', 'aria-hidden': 'true' });
  const button = el('button', { type: 'button', class: 'btn btn--quiet' }, 'Choose file');
  button.addEventListener('click', () => input.click());
  input.addEventListener('change', () => {
    if (input.files?.[0]) void read(input.files[0]);
    input.value = '';
  });

  let depth = 0;
  zone.addEventListener('dragenter', (event) => {
    event.preventDefault();
    depth += 1;
    zone.classList.add('is-dragging');
  });
  zone.addEventListener('dragover', (event) => event.preventDefault());
  zone.addEventListener('dragleave', () => {
    depth = Math.max(0, depth - 1);
    if (!depth) zone.classList.remove('is-dragging');
  });
  zone.addEventListener('drop', (event) => {
    event.preventDefault();
    depth = 0;
    zone.classList.remove('is-dragging');
    const file = event.dataTransfer?.files?.[0];
    if (file) void read(file);
  });

  async function read(file: File): Promise<void> {
    if (file.size > MAX_BYTES) {
      onError(`${file.name} is larger than 10 MB. Try a smaller file.`);
      return;
    }
    const lower = file.name.toLowerCase();
    try {
      if (TEXT_EXTENSIONS.some((ext) => lower.endsWith(ext))) {
        onFile({ name: file.name, size: file.size, kind: 'text', text: await file.text() });
      } else {
        onFile({ name: file.name, size: file.size, kind: 'binary', bytes: await file.arrayBuffer() });
      }
    } catch {
      onError(`Could not read ${file.name}.`);
    }
  }

  const wrapper = el('span', { class: 'file-drop__picker' }, button, input);
  return wrapper;
}
