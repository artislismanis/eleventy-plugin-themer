// User feature, auto-init variant. Discovered by name and bundled as an entry;
// injected only on pages that opt in via `features: ['widget']`.
if (typeof document !== 'undefined') {
  document.documentElement.dataset.widget = 'loaded';
}
