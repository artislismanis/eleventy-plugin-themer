/**
 * Code Highlighting Bundle
 *
 * Adds copy button and optional line numbers to code blocks.
 * Requires explicit initialization - does not auto-run.
 *
 * Usage:
 *   // Basic (use defaults)
 *   import { init } from '@theme/features/code-highlighting/index.js';
 *   init();
 *
 *   // With customization
 *   import { init, defaultConfig } from '@theme/features/code-highlighting/index.js';
 *   init({ ...defaultConfig, lineNumbers: true });
 *
 * CSS Custom Properties (bundle-scoped):
 *   --code-border-radius, --code-copy-button-bg, --code-line-number-fg,
 *   --code-scrollbar-thumb-bg
 *
 * PrismJS theme is config-driven via theme.json `config.codeHighlighting.prismTheme`.
 * Users can swap themes without overriding this file.
 * See styles.scss for full CSS custom properties list.
 */

// PrismJS theme + diff-highlight (resolved via virtual module from theme config)
import 'virtual:prism-theme';

// Feature enhancements (border-radius, copy button, line numbers, scrollbar)
import './styles.scss';

/**
 * Default configuration
 */
export const defaultConfig = {
  // Features
  copyButton: true,
  lineNumbers: false,
  highlightLines: true,

  // Behavior
  copyButtonText: 'Copy',
  copiedButtonText: 'Copied!',
  copiedDuration: 2000,

  // Selectors
  codeBlockSelector: 'pre[class*="language-"]',

  // Callbacks (extension points)
  onCopy: null, // (text, element) => void
  onCopyError: null, // (error, element) => void
  beforeHighlight: null, // (element) => void
  afterHighlight: null, // (element) => void
};

// Internal state
let isInitialized = false;
let currentConfig = null;

/**
 * Initialize code highlighting with configuration
 *
 * @param {Object} userConfig - User configuration (merged with defaults)
 * @returns {void}
 *
 * @example
 * // Basic usage
 * init();
 *
 * @example
 * // With custom configuration
 * init({
 *   copyButton: true,
 *   lineNumbers: true,
 *   onCopy: (text, element) => {
 *     console.log('Copied:', text.substring(0, 50));
 *   },
 * });
 */
export function init(userConfig = {}) {
  if (isInitialized) {
    console.warn('[code-highlighting] Already initialized. Call destroy() first to reinitialize.');
    return;
  }

  currentConfig = { ...defaultConfig, ...userConfig };

  const initializeElements = () => {
    const codeBlocks = document.querySelectorAll(currentConfig.codeBlockSelector);

    codeBlocks.forEach((pre) => {
      if (currentConfig.beforeHighlight) {
        currentConfig.beforeHighlight(pre);
      }

      if (currentConfig.lineNumbers) {
        addLineNumbers(pre);
      }

      if (currentConfig.copyButton) {
        addCopyButton(pre, currentConfig);
      }

      if (currentConfig.afterHighlight) {
        currentConfig.afterHighlight(pre);
      }
    });

    isInitialized = true;
  };

  // Handle DOM ready state
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeElements);
  } else {
    initializeElements();
  }
}

/**
 * Destroy/cleanup (for re-initialization or SPA navigation)
 *
 * @returns {void}
 */
export function destroy() {
  document.querySelectorAll('.code-copy-button').forEach((btn) => btn.remove());
  document.querySelectorAll('.line-numbers').forEach((el) => el.classList.remove('line-numbers'));
  isInitialized = false;
  currentConfig = null;
}

/**
 * Get current state (useful for debugging)
 *
 * @returns {Object} Current state { isInitialized, config }
 */
export function getState() {
  return { isInitialized, config: currentConfig };
}

// Private helpers

/**
 * Add line numbers to code block
 * @private
 */
function addLineNumbers(pre) {
  pre.classList.add('line-numbers');

  const code = pre.querySelector('code');
  if (!code) return;

  const lines = code.textContent.split('\n');
  const lineCount = lines.length;

  // Create line numbers container
  const lineNumbersDiv = document.createElement('div');
  lineNumbersDiv.className = 'line-numbers-rows';
  lineNumbersDiv.setAttribute('aria-hidden', 'true');

  for (let i = 0; i < lineCount; i++) {
    const span = document.createElement('span');
    lineNumbersDiv.appendChild(span);
  }

  pre.appendChild(lineNumbersDiv);
}

/**
 * Add copy button to code block
 * @private
 */
function addCopyButton(pre, config) {
  const button = document.createElement('button');
  button.className = 'code-copy-button';
  button.textContent = config.copyButtonText;
  button.setAttribute('aria-label', 'Copy code to clipboard');
  button.type = 'button';

  button.addEventListener('click', async () => {
    const code = pre.querySelector('code');
    const text = code?.textContent || '';

    try {
      await navigator.clipboard.writeText(text);
      button.textContent = config.copiedButtonText;
      button.classList.add('copied');

      if (config.onCopy) {
        config.onCopy(text, pre);
      }

      setTimeout(() => {
        button.textContent = config.copyButtonText;
        button.classList.remove('copied');
      }, config.copiedDuration);
    } catch (err) {
      console.error('Failed to copy:', err);
      button.textContent = 'Error';
      button.classList.add('error');

      if (config.onCopyError) {
        config.onCopyError(err, pre);
      }

      setTimeout(() => {
        button.textContent = config.copyButtonText;
        button.classList.remove('error');
      }, config.copiedDuration);
    }
  });

  pre.style.position = 'relative';
  pre.appendChild(button);
}

// NO AUTO-INIT - user must explicitly call init()
