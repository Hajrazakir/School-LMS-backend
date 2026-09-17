/* Minimal structured logger. Swap for pino/winston later without
 * touching call sites, since everything goes through this module. */

function timestamp() {
  return new Date().toISOString();
}

const logger = {
  info: (msg, meta) => console.log(`[${timestamp()}] [INFO] ${msg}`, meta ?? ''),
  warn: (msg, meta) => console.warn(`[${timestamp()}] [WARN] ${msg}`, meta ?? ''),
  error: (msg, err) => console.error(`[${timestamp()}] [ERROR] ${msg}`, err ?? ''),
  debug: (msg, meta) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`[${timestamp()}] [DEBUG] ${msg}`, meta ?? '');
    }
  },
};

module.exports = logger;
