const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// ✅ Load specific env file
dotenv.config({ path: path.join(__dirname, '../.env.development') });

// ✅ Validate PHOTO_URL
if (!process.env.PHOTO_URL) {
  throw new Error('PHOTO_URL not defined in .env.development file');
}

// ✅ Create logs directory inside PHOTO_URL if not exists
const logDir = path.join(process.env.PHOTO_URL, 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// ✅ Log file path
const logFilePath = path.join(logDir, 'dev.log');
const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });

// ✅ Override console.log to use system-local time
console.log = (...args) => {
  const logMsg = `[LOG] ${new Date().toLocaleString()} - ${args.join(' ')}\n`;
  logStream.write(logMsg);
  process.stdout.write(logMsg);
};

// ✅ Override console.error to use system-local time
console.error = (...args) => {
  const errMsg = `[ERROR] ${new Date().toLocaleString()} - ${args.join(' ')}\n`;
  logStream.write(errMsg);
  process.stderr.write(errMsg);
};

// ✅ Export for morgan or log route
module.exports = {
  logFilePath,
  logStream,
};
