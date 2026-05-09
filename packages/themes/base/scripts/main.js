// Main entry point
// Imports global styles that are loaded on every page

import '../styles/main.scss';

// ============================================
// Theme Toggle (Dark Mode)
// ============================================
// Respects system preference, allows manual override via toggle button
// Persists preference to localStorage

function initThemeToggle() {
  const toggle = document.querySelector('[data-theme-toggle]');
  const defaultTheme = document.documentElement.dataset.defaultTheme || 'auto';

  // Apply saved preference on load (before paint to avoid flash)
  // If no saved preference, apply default theme (unless it's 'auto')
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) {
    document.documentElement.dataset.theme = savedTheme;
  } else if (defaultTheme !== 'auto') {
    document.documentElement.dataset.theme = defaultTheme;
  }

  // If no toggle button, we're done (theme-only mode without toggle)
  if (!toggle) return;

  // Update toggle button state
  function updateToggleState() {
    const isDark =
      document.documentElement.dataset.theme === 'dark' ||
      (!document.documentElement.dataset.theme &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);

    toggle.setAttribute('aria-pressed', isDark.toString());
  }

  // Initial state
  updateToggleState();

  // Handle toggle click
  toggle.addEventListener('click', () => {
    const current = document.documentElement.dataset.theme;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    let newTheme;
    if (current === 'dark') {
      newTheme = 'light';
    } else if (current === 'light') {
      newTheme = 'dark';
    } else {
      // No manual override set, toggle from system preference
      newTheme = prefersDark ? 'light' : 'dark';
    }

    document.documentElement.dataset.theme = newTheme;
    localStorage.setItem('theme', newTheme);
    updateToggleState();
  });

  // Listen for system preference changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    // Only update if no manual preference is set
    if (!localStorage.getItem('theme')) {
      updateToggleState();
    }
  });
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initThemeToggle);
} else {
  initThemeToggle();
}
