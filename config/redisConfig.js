// redisClient.js
const { createClient } = require("redis");
const { writeLog } = require("../logs/logger");
require("dotenv").config();

// ================= CONFIG =================
const REDIS_ENABLED = process.env.REDIS_ENABLED === "true";

const REDIS_HOST = process.env.REDIS_HOST || "127.0.0.1";
const REDIS_PORT = parseInt(process.env.REDIS_PORT, 10) || 6379;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;
const REDIS_EXPIRE_TIME =
  parseInt(process.env.REDIS_EXPIRE_TIME, 10) || 3600;

let redisClient = null;
let redisConnected = false;
let isConnecting = false;
let hasLoggedError = false;

// ================= CREATE CLIENT =================
const createRedisClient = () => {
  const client = createClient({
    socket: {
      host: REDIS_HOST,
      port: REDIS_PORT,
      reconnectStrategy: (retries) => {
        return Math.min(retries * 100, 3000);
      },
    },

    password: REDIS_PASSWORD || undefined,
  });

  // ================= EVENTS =================

  client.on("connect", () => {
    writeLog("info", "🔄 Connecting to Redis...");
  });

  client.on("ready", () => {
    redisConnected = true;
    isConnecting = false;
    hasLoggedError = false;

    writeLog(
      "info",
      `✅ Redis connected successfully (${REDIS_HOST}:${REDIS_PORT})`,
    );
  });

  client.on("error", (err) => {
    redisConnected = false;
    isConnecting = false;

    if (!hasLoggedError) {
      hasLoggedError = true;

      writeLog(
        "warn",
        `❌ Redis error: ${err.message}`,
      );

      writeLog(
        "info",
        "💡 Tip: Make sure Redis server is running",
      );
    }
  });

  client.on("reconnecting", () => {
    redisConnected = false;

    writeLog("warn", "🔄 Redis reconnecting...");
  });

  client.on("end", () => {
    redisConnected = false;

    writeLog("warn", "🔌 Redis connection closed");
  });

  return client;
};

// ================= CONNECT =================
const connect = async () => {
  try {
    // Redis disabled
    if (!REDIS_ENABLED) {
      writeLog("warn", "⚠️ Redis disabled from .env");
      return;
    }

    // Already connected
    if (redisConnected && redisClient?.isOpen) {
      return;
    }

    // Prevent multiple simultaneous connects
    if (isConnecting) {
      return;
    }

    isConnecting = true;

    // Create client
    if (!redisClient) {
      redisClient = createRedisClient();
    }

    // Connect
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
  } catch (err) {
    redisConnected = false;
    isConnecting = false;

    writeLog(
      "error",
      `❌ Redis connection failed: ${err.message}`,
    );
  }
};

// ================= GET RAW CLIENT =================
const getRedisClient = () => redisClient;

// ================= GET OR SET CACHE =================
const getOrSetCache = async (
  cacheKey,
  fetchFunction,
  ttlSeconds = REDIS_EXPIRE_TIME,
) => {
  try {
    // Redis disabled
    if (!REDIS_ENABLED) {
      return await fetchFunction();
    }

    // Connect if needed
    if (!redisConnected || !redisClient?.isOpen) {
      await connect();
    }

    // Still unavailable
    if (!redisConnected || !redisClient?.isOpen) {
      writeLog(
        "warn",
        "⚠️ Redis unavailable – fetching directly from DB",
      );

      return await fetchFunction();
    }

    // Try cache
    const cachedData = await redisClient.get(cacheKey);

    if (cachedData) {
      writeLog("info", `⏪ Cache HIT: ${cacheKey}`);

      try {
        return JSON.parse(cachedData);
      } catch {
        return cachedData;
      }
    }

    // Fetch fresh data
    const freshData = await fetchFunction();

    // Save cache only if valid
    if (
      freshData !== null &&
      freshData !== undefined
    ) {
      await redisClient.set(
        cacheKey,
        JSON.stringify(freshData),
        {
          EX: ttlSeconds,
        },
      );

      writeLog(
        "info",
        `✅ Cached: ${cacheKey} (TTL: ${ttlSeconds}s)`,
      );
    }

    return freshData;
  } catch (err) {
    writeLog(
      "warn",
      `⚠️ Redis GET/SET failed for ${cacheKey}: ${err.message}`,
    );

    return await fetchFunction();
  }
};

// ================= SCAN KEYS =================
const scanKeys = async (pattern, count = 100) => {
  try {
    if (!REDIS_ENABLED) return [];

    if (!redisConnected || !redisClient?.isOpen) {
      writeLog(
        "warn",
        "🚫 Redis not connected – skipping scan",
      );

      return [];
    }

    let cursor = "0";
    let keys = [];

    do {
      const result = await redisClient.scan(cursor, {
        MATCH: pattern,
        COUNT: count,
      });

      cursor = result.cursor;
      keys.push(...result.keys);
    } while (cursor !== "0");

    writeLog(
      "info",
      `🔍 Found ${keys.length} keys for pattern: ${pattern}`,
    );

    return keys;
  } catch (err) {
    writeLog(
      "error",
      `❌ Redis scan error: ${err.message}`,
    );

    return [];
  }
};

// ================= INVALIDATE CACHE =================
const invalidateCacheByPattern = async (pattern) => {
  try {
    if (!REDIS_ENABLED) return;

    const keys = await scanKeys(pattern);

    if (keys.length > 0) {
      await redisClient.del(keys);

      writeLog(
        "info",
        `🗑️ Deleted ${keys.length} cache keys`,
      );
    }
  } catch (err) {
    writeLog(
      "error",
      `❌ Cache invalidation failed: ${err.message}`,
    );
  }
};

// ================= INVALIDATE TENANT CACHE =================
const invalidateCacheByTenant = async (
  tableName,
  tenantId,
) => {
  if (!tenantId) {
    writeLog(
      "warn",
      "⚠️ Missing tenantId for cache invalidation",
    );

    return;
  }

  const pattern = `${tableName}:${tenantId}:*`;

  await invalidateCacheByPattern(pattern);
};

// ================= CLEAR ALL CACHE =================
const clearAllCache = async () => {
  try {
    if (process.env.NODE_ENV === "production") {
      writeLog(
        "warn",
        "🚨 clearAllCache disabled in production",
      );

      return;
    }

    if (!redisConnected || !redisClient?.isOpen) {
      writeLog(
        "warn",
        "🚫 Redis not connected",
      );

      return;
    }

    await redisClient.flushDb();

    writeLog("info", "🧹 Redis cache cleared");
  } catch (err) {
    writeLog(
      "error",
      `❌ Failed to clear Redis: ${err.message}`,
    );
  }
};

// ================= CLOSE REDIS =================
const closeRedis = async () => {
  try {
    if (redisClient?.isOpen) {
      await redisClient.quit();

      redisConnected = false;

      writeLog(
        "info",
        "🔌 Redis connection closed gracefully",
      );
    }
  } catch (err) {
    writeLog(
      "error",
      `❌ Redis shutdown error: ${err.message}`,
    );
  }
};

// ================= AUTO CONNECT =================
connect().catch(() => {});

// ================= EXPORTS =================
module.exports = {
  redisClient: getRedisClient,
  connect,
  getOrSetCache,
  scanKeys,
  invalidateCacheByPattern,
  invalidateCacheByTenant,
  clearAllCache,
  closeRedis,
};