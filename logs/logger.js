const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

// ======================================================
// LOAD .ENV
// ======================================================

dotenv.config({
  path: path.join(__dirname, "../.env"),
});

// ======================================================
// PHOTO URL VALIDATION
// ======================================================

if (!process.env.PHOTO_URL) {
  throw new Error("PHOTO_URL not defined in .env file");
}

// ======================================================
// CREATE LOGS FOLDER
// ======================================================

const logDir = path.join(process.env.PHOTO_URL, "logs");

if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// ======================================================
// LOG FILE
// ======================================================

const logFilePath = path.join(logDir, "dev.log");

const logStream = fs.createWriteStream(logFilePath, {
  flags: "a",
});

// ======================================================
// FORMAT ARGUMENT
// ======================================================

const formatArg = (arg) => {
  if (arg instanceof Error) {
    return `${arg.message}\n${arg.stack}`;
  }

  if (typeof arg === "object" && arg !== null) {
    try {
      return JSON.stringify(arg, null, 2);
    } catch (error) {
      return String(arg);
    }
  }

  return String(arg);
};

// ======================================================
// CORE LOGGER
// ======================================================

const writeLog = (level, message, req = null) => {
  const timestamp = new Date().toLocaleString();

  let operation = "";
  let url = "";

  if (req) {
    operation = req.method || "";
    url = req.originalUrl || req.url || "";
  }

  const logMsg =
    `[${level.toUpperCase()}] ${timestamp}` +
    `${operation ? " - " + operation : ""}` +
    `${url ? " - " + url : ""}` +
    ` - ${message}\n`;

  // Write to file
  logStream.write(logMsg);

  // Write to console
  if (level === "error") {
    process.stderr.write(`\x1b[31m${logMsg}\x1b[0m`);
  } else if (level === "warn") {
    process.stdout.write(`\x1b[33m${logMsg}\x1b[0m`);
  } else if (level === "info") {
    process.stdout.write(`\x1b[36m${logMsg}\x1b[0m`);
  } else {
    process.stdout.write(logMsg);
  }
};

// ======================================================
// OVERRIDE GLOBAL CONSOLE
// ======================================================

["log", "info", "warn", "error"].forEach((method) => {
  const original = console[method];

  console[method] = function (...args) {
    const message = args.map(formatArg).join(" ");

    // Detect HTTP request object
    const req = args.find(
      (arg) => arg && arg.method && arg.url
    );

    const level = method === "log" ? "info" : method;

    writeLog(level, message, req);

    // Keep original console behavior
    original.apply(console, args);
  };
});

// ======================================================
// EXPRESS REQUEST LOGGER
// ======================================================

const logRequest = (req, res, next) => {
  // Request start
  writeLog("info", "Incoming request", req);

  // Response finish
  res.on("finish", () => {
    writeLog(
      "info",
      `Response status ${res.statusCode}`,
      req
    );
  });

  next();
};

// ======================================================
// EXPORTS
// ======================================================

module.exports = {
  logFilePath,
  logStream,
  writeLog,
  logRequest,
};