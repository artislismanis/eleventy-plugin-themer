/**
 * Auto-initializing version of the back-to-top bundle.
 *
 * Use this for simple opt-in via front matter with no customization needed.
 * This bundle auto-runs on page load with default configuration.
 *
 * For customization, import from index.js instead and call init() manually.
 *
 * Usage in front matter:
 *   ---
 *   title: My Post
 *   feature: back-to-top
 *   ---
 */
import { init } from './index.js';

// Auto-initialize with default configuration
init();
