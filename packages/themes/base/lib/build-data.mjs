import { execSync } from 'node:child_process';

/**
 * Build-time metadata exposed to templates as the `build` global (used by the
 * footer git-sha partial). Runs in the consumer's project at build time, so the
 * commit reflects the consuming site's repository.
 *
 * A consumer can still override this by providing their own
 * `content/_data/build.js` — Eleventy's directory data wins over global data.
 *
 * @returns {{ gitSha: string, gitShaShort: string, timestamp: string }}
 */
export default function buildData() {
  let gitSha = 'unknown';
  let gitShaShort = 'dev';

  try {
    gitSha = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
    gitShaShort = gitSha.substring(0, 7);
  } catch {
    // Not a git repo or git unavailable — keep the fallback values.
  }

  return { gitSha, gitShaShort, timestamp: new Date().toISOString() };
}
