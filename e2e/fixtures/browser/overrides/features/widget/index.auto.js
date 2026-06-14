// Sets a data attribute at runtime so the browser suite can confirm the feature
// loaded on the opted-in page.
if (typeof document !== 'undefined') {
  document.documentElement.dataset.widget = 'loaded';
}
