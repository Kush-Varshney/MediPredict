
const fs = require('fs');
const path = require('path');

const LOG_LEVELS = {
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
};

// Ensure logs directory exists
const logDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logFile = path.join(logDir, 'app.log');

function formatMessage(level, message, meta = {}) {
  const timestamp = new Date().toISOString();
  // Simple masking for sensitive fields if they exist in meta
  const safeMeta = { ...meta };
  if (safeMeta.userId) safeMeta.userId = '[MASKED]';
  if (safeMeta.email) safeMeta.email = '[MASKED]';
  
  return JSON.stringify({
    timestamp,
    level,
    message,
    ...safeMeta,
  });
}

function log(level, message, meta) {
  const logEntry = formatMessage(level, message, meta);
  
  // Console output
  if (level === LOG_LEVELS.ERROR) {
    console.error(logEntry);
  } else if (level === LOG_LEVELS.WARN) {
    console.warn(logEntry);
  } else {
    console.log(logEntry);
  }

  // File output
  fs.appendFile(logFile, logEntry + '\n', (err) => {
    if (err) console.error('Failed to write to log file:', err);
  });
}

module.exports = {
  info: (msg, meta) => log(LOG_LEVELS.INFO, msg, meta),
  warn: (msg, meta) => log(LOG_LEVELS.WARN, msg, meta),
  error: (msg, meta) => log(LOG_LEVELS.ERROR, msg, meta),
};
