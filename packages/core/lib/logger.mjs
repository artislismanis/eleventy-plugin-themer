/**
 * Lightweight logger with level control via THEME_LOG_LEVEL env var
 *
 * Levels: silent (0), error (1), warn (2), info (3), debug (4)
 * Default: info
 */

const LOG_LEVELS = { silent: 0, error: 1, warn: 2, info: 3, debug: 4 };

function getLevel() {
  const env = process.env.THEME_LOG_LEVEL || 'info';
  return LOG_LEVELS[env] ?? LOG_LEVELS.info;
}

export const logger = {
  error: (...args) => getLevel() >= LOG_LEVELS.error && console.error(...args),
  warn: (...args) => getLevel() >= LOG_LEVELS.warn && console.warn(...args),
  info: (...args) => getLevel() >= LOG_LEVELS.info && console.log(...args),
  debug: (...args) => getLevel() >= LOG_LEVELS.debug && console.log(...args),
};
