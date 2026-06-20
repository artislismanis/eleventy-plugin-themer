/**
 * Back to Top Bundle
 *
 * Injects a floating "back to top" button that appears after the user scrolls
 * past a threshold and smooth-scrolls to the top on click. Fully self-contained
 * (no template or data dependencies) — a second feature alongside code-highlighting
 * to exercise the framework's multi-feature discovery + cascade-override mechanism.
 *
 * Usage:
 *   // Basic (use defaults)
 *   import { init } from '@theme/features/back-to-top/index.js';
 *   init();
 *
 *   // With customization
 *   import { init, defaultConfig } from '@theme/features/back-to-top/index.js';
 *   init({ ...defaultConfig, threshold: 800 });
 *
 * CSS Custom Properties (bundle-scoped):
 *   --back-to-top-bg, --back-to-top-fg, --back-to-top-size, --back-to-top-offset
 *   See styles.scss for the full list.
 */

import './styles.scss';

/**
 * Default configuration
 */
export const defaultConfig = {
  // Scroll distance (px) before the button appears
  threshold: 400,

  // Accessible label + visible glyph
  label: 'Back to top',
  glyph: '↑',

  // Scroll behavior passed to window.scrollTo
  behavior: 'smooth',

  // Callbacks (extension points)
  onShow: null, // (button) => void
  onHide: null, // (button) => void
  onClick: null, // (button) => void
};

// Internal state
let isInitialized = false;
let currentConfig = null;
let button = null;
let onScroll = null;

/**
 * Initialize the back-to-top button.
 *
 * @param {Object} userConfig - User configuration (merged with defaults)
 * @returns {void}
 */
export function init(userConfig = {}) {
  if (isInitialized) {
    console.warn('[back-to-top] Already initialized. Call destroy() first to reinitialize.');
    return;
  }

  currentConfig = { ...defaultConfig, ...userConfig };

  const setup = () => {
    button = document.createElement('button');
    button.className = 'back-to-top';
    button.type = 'button';
    button.textContent = currentConfig.glyph;
    button.setAttribute('aria-label', currentConfig.label);
    button.hidden = true;

    button.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: currentConfig.behavior });
      if (currentConfig.onClick) currentConfig.onClick(button);
    });

    onScroll = () => {
      const visible = window.scrollY > currentConfig.threshold;
      if (visible === !button.hidden) return;

      button.hidden = !visible;
      if (visible && currentConfig.onShow) currentConfig.onShow(button);
      if (!visible && currentConfig.onHide) currentConfig.onHide(button);
    };

    document.body.appendChild(button);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    isInitialized = true;
  };

  // Handle DOM ready state
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup);
  } else {
    setup();
  }
}

/**
 * Destroy/cleanup (for re-initialization or SPA navigation)
 *
 * @returns {void}
 */
export function destroy() {
  if (onScroll) window.removeEventListener('scroll', onScroll);
  if (button) button.remove();
  button = null;
  onScroll = null;
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

// NO AUTO-INIT - user must explicitly call init()
