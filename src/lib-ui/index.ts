import {
  convertDocsHtmlToMarkdown,
  defaultOptions,
  combineGoogleDocFormats,
} from '../lib/convert.ts';
import { settings } from './settings.ts';

const SLICE_CLIP_MEDIA_TYPE = 'application/x-vnd.google-docs-document-slice-clip';

// Type-safe DOM element getters
function getElementByIdSafe<T extends HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

function querySelectorSafe<T extends Element>(selector: string): T | null {
  return document.querySelector(selector) as T | null;
}

// Get DOM elements with type safety
const settingsForm = getElementByIdSafe<HTMLFormElement>('settings');
const inputElement = getElementByIdSafe<HTMLDivElement>('input');
const outputElement = getElementByIdSafe<HTMLTextAreaElement>('output');
const inputInstructions = querySelectorSafe<HTMLElement>('#input-area .instructions');
const outputInstructions = querySelectorSafe<HTMLElement>('#output-area .instructions');

if (!inputElement || !outputElement) {
  throw new Error('Missing required DOM elements: input or output');
}

// Silently handle missing instruction elements

async function convert(): Promise<void> {
  if (!inputElement || !outputElement) return;

  try {
    const markdown = await convertDocsHtmlToMarkdown(
      inputElement.innerHTML,
      null,
      settings.getAll()
    );
    
    outputElement.value = markdown;
    if (outputInstructions) {
      outputInstructions.style.display = markdown.trim() ? 'none' : '';
    }
  } catch (error) {
    if (outputInstructions) {
      outputInstructions.style.display = '';
    }
  }
}

function handleInput(): void {
  if (!inputElement || !inputInstructions) return;

  const hasContent = !!inputElement.textContent;
  inputInstructions.style.display = hasContent ? 'none' : '';
  convert();
}

// Event listeners
inputElement.addEventListener('input', handleInput);

// Enhanced paste handler with better error handling
inputElement.addEventListener('paste', async (event: ClipboardEvent) => {
  if (!event.clipboardData) {
    return;
  }

  try {
    const sliceClip =
      event.clipboardData.getData(SLICE_CLIP_MEDIA_TYPE) ||
      event.clipboardData.getData(`${SLICE_CLIP_MEDIA_TYPE}+wrapped`);

    const html =
      event.clipboardData.getData('text/html') ||
      event.clipboardData.getData('public.html');

    // Both paste types may not always be present. Some browsers (mainly Safari)
    // do not allow cross-origin access to clipboard formats except a select few,
    // and so block access to the slice clip data.
    if ((html && sliceClip) || /id=['"]docs-internal-guid-/.test(html)) {
      event.preventDefault();
      
      const fancyHtml = await combineGoogleDocFormats(html, sliceClip);

      const selection = window.getSelection();
      if (selection?.anchorNode && inputElement.contains(selection.anchorNode)) {
        // `execCommand` is discouraged these days, but is the only built-in that
        // does a nice job normalizing the HTML given the input location.
        document.execCommand('insertHTML', false, fancyHtml);
      } else {
        inputElement.innerHTML = fancyHtml;
      }

      handleInput();
    }
  } catch (error) {
    // Silently handle paste processing errors
  }
});

// Copy functionality with enhanced error handling
const copyButton = getElementByIdSafe<HTMLButtonElement>('copy-button');
if (copyButton && navigator.clipboard?.writeText) {
  copyButton.style.display = '';
  copyButton.addEventListener('click', async () => {
    if (!outputElement) return;
    
    try {
      await navigator.clipboard.writeText(outputElement.value);
    } catch (error) {
      alert(`Unable to copy markdown to clipboard: ${error}`);
    }
  });
}

// Download functionality with enhanced error handling
const downloadButton = getElementByIdSafe<HTMLButtonElement>('download-button');
if (downloadButton && window.URL && window.File) {
  downloadButton.style.display = '';
  downloadButton.addEventListener('click', () => {
    if (!outputElement) return;

    let url: string | null = null;
    let link: HTMLAnchorElement | null = null;
    
    try {
      const file = new File([outputElement.value], 'Converted Text.md', {
        type: 'text/markdown',
      });

      url = URL.createObjectURL(file);
      link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
    } catch (error) {
      alert(`Unable to download file: ${error}`);
    } finally {
      if (link) {
        document.body.removeChild(link);
      }
      if (url) {
        URL.revokeObjectURL(url);
      }
    }
  });
}

function updateSettingsForm(): void {
  if (!settingsForm) return;

  const inputs = settingsForm.querySelectorAll<HTMLInputElement | HTMLSelectElement>('input,select');
  
  for (const input of inputs) {
    if (!input.name) continue;
    
    const value = settings.get(input.name);
    if (value != null) {
      if (input.type === 'checkbox' && input instanceof HTMLInputElement) {
        input.checked = Boolean(value);
      } else {
        input.value = String(value);
      }
    }
  }
}

// Settings form change handler
if (settingsForm) {
  settingsForm.addEventListener('change', (event: Event) => {
    const target = event.target as HTMLInputElement | HTMLSelectElement;
    if (!target?.name) return;

    let value: string | boolean = target.value;
    if (target.type === 'checkbox' && target instanceof HTMLInputElement) {
      value = target.checked;
    }
    
    settings.set(target.name, value);
    convert();
  });
}

// Global exports and initialization
declare global {
  interface Window {
    convertDocsHtmlToMarkdown: typeof convertDocsHtmlToMarkdown;
  }
}

window.convertDocsHtmlToMarkdown = convertDocsHtmlToMarkdown;
settings.setAll(defaultOptions, { save: false });
settings.load();
updateSettingsForm();

// Initial conversion
convert();