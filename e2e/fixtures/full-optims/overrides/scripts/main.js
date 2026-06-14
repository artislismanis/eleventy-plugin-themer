// Import an extra stylesheet so PurgeCSS has marker classes to act on:
//   .e2e-purge-me  -> unused in HTML, not safelisted -> removed
//   .e2e-keep-me   -> unused in HTML, safelisted via site config -> kept
import '../styles/markers.css';
