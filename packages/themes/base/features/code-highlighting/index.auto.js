/**
 * Auto-initializing version of code-highlighting bundle.
 *
 * Use this for simple opt-in via front matter with no customization needed.
 * This bundle auto-runs on page load with default configuration.
 *
 * For customization, import from code-highlighting.js instead and call init() manually.
 *
 * Usage in front matter:
 *   ---
 *   title: My Post
 *   feature: code-highlighting
 *   ---
 */
import { init } from './index.js';

// Auto-initialize with default configuration
init();
