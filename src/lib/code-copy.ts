// Modern Code Copy Functionality

export function initializeCodeCopy() {
  // Add click event listeners to all pre elements
  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    const pre = target.closest('pre');
    
    if (pre && target.matches('pre::after, pre')) {
      copyCodeToClipboard(pre);
    }
  });

  // Add copy functionality to existing pre elements
  const preElements = document.querySelectorAll('.markdown-content pre');
  preElements.forEach(addCopyFunctionality);
}

function addCopyFunctionality(pre: Element) {
  if (!(pre instanceof HTMLElement)) return;
  
  // Create copy button
  const copyButton = document.createElement('button');
  copyButton.className = 'code-copy-btn';
  copyButton.innerHTML = 'Copy';
  copyButton.setAttribute('aria-label', 'Copy code to clipboard');
  
  // Style the button
  Object.assign(copyButton.style, {
    position: 'absolute',
    top: '0.75rem',
    right: '0.75rem',
    background: 'rgba(0, 0, 0, 0.05)',
    color: 'currentColor',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontFamily: 'inherit',
    cursor: 'pointer',
    border: 'none',
    opacity: '0',
    transition: 'opacity 0.2s ease',
    userSelect: 'none',
    zIndex: '10'
  });
  
  // Add hover effects
  pre.addEventListener('mouseenter', () => {
    copyButton.style.opacity = '1';
  });
  
  pre.addEventListener('mouseleave', () => {
    copyButton.style.opacity = '0';
  });
  
  // Add click handler
  copyButton.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    copyCodeToClipboard(pre);
  });
  
  // Ensure pre is positioned relatively
  if (getComputedStyle(pre).position === 'static') {
    pre.style.position = 'relative';
  }
  
  pre.appendChild(copyButton);
}

async function copyCodeToClipboard(pre: HTMLElement) {
  const codeElement = pre.querySelector('code');
  if (!codeElement) return;
  
  const code = codeElement.textContent || '';
  
  try {
    await navigator.clipboard.writeText(code);
    showCopyFeedback(pre, 'Copied!');
  } catch (err) {
    // Fallback for older browsers
    fallbackCopyTextToClipboard(code);
    showCopyFeedback(pre, 'Copied!');
  }
}

function fallbackCopyTextToClipboard(text: string) {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  
  // Avoid scrolling to bottom
  textArea.style.top = '0';
  textArea.style.left = '0';
  textArea.style.position = 'fixed';
  textArea.style.opacity = '0';
  
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  
  try {
    document.execCommand('copy');
  } catch (err) {
    console.error('Fallback: Oops, unable to copy', err);
  }
  
  document.body.removeChild(textArea);
}

function showCopyFeedback(pre: HTMLElement, message: string) {
  const copyButton = pre.querySelector('.code-copy-btn') as HTMLElement;
  if (!copyButton) return;
  
  const originalText = copyButton.innerHTML;
  copyButton.innerHTML = message;
  copyButton.style.opacity = '1';
  
  // Add success styling
  copyButton.style.background = 'rgba(34, 197, 94, 0.1)';
  copyButton.style.color = 'rgb(34, 197, 94)';
  
  setTimeout(() => {
    copyButton.innerHTML = originalText;
    copyButton.style.background = 'rgba(0, 0, 0, 0.05)';
    copyButton.style.color = 'currentColor';
  }, 2000);
}

// Auto-initialize when DOM is ready
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeCodeCopy);
  } else {
    initializeCodeCopy();
  }
}

// Export for manual initialization
export { addCopyFunctionality, copyCodeToClipboard };