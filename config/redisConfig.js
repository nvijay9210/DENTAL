const { createClient } = require("redis");
const { writeLog } = require("../logs/logger");

require("dotenv").config();

// ============================================================
// REDIS CONFIG
// ============================================================

const REDIS_HOST = process.env.REDIS_HOST || "127.0.0.1";

const REDIS_PORT =
  Number.parseInt(process.env.REDIS_PORT, 10) || 6379;

const REDIS_PASSWORD =
  process.env.REDIS_PASSWORD || undefined;

// ============================================================
// SEPARATE REDIS FEATURES
// ============================================================

const REDIS_AUTH_ENABLED =
  String(process.env.REDIS_AUTH_ENABLED ?? "true").toLowerCase() ===
  "true";

const REDIS_CACHE_ENABLED =
  String(process.env.REDIS_CACHE_ENABLED ?? "false").toLowerCase() ===
  "true";

const REDIS_EXPIRE_TIME =
  Number.parseInt(process.env.REDIS_EXPIRE_TIME, 10) || 3600;

// ============================================================
// STATE
// ============================================================

let redisClient = null;
let redisConnected = false;
let isConnecting = false;
let hasLoggedError = false;

// ============================================================
// CREATE CLIENT
// ============================================================

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

  // ============================================================
  // EVENTS
  // ============================================================

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

    writeLog(
      "info",
      `🔐 Redis Authentication: ${
        REDIS_AUTH_ENABLED ? "ENABLED" : "DISABLED"
      }`,
    );

    writeLog(
      "info",
      `🗄️ Redis Data Cache: ${
        REDIS_CACHE_ENABLED ? "ENABLED" : "DISABLED"
      }`,
    );
  });

  client.on("error", (error) => {
    redisConnected = false;
    isConnecting = false;

    if (!hasLoggedError) {
      hasLoggedError = true;

      writeLog(
        "warn",
        `❌ Redis error: ${error?.message || "Unknown Redis error"}`,
      );
    }
  });

  client.on("reconnecting", () => {
    redisConnected = false;

    writeLog("warn", "🔄 Redis reconnecting...");
  });

  client.on("end", () => {
    redisConnected = false;
    isConnecting = false;

    writeLog("warn", "🔌 Redis connection closed");
  });

  return client;
};

// ============================================================
// CONNECT
// ============================================================

const connect = async () => {
  try {
    /*
     * Redis is required if either:
     *
     * AUTH is enabled
     * OR
     * DATA CACHE is enabled
     *
     * If both are false, Redis does not need to connect.
     */

    if (!REDIS_AUTH_ENABLED && !REDIS_CACHE_ENABLED) {
      writeLog(
        "warn",
        "⚠️ Redis Authentication and Data Cache are both disabled",
      );

      return null;
    }

    // Already connected
    if (redisConnected && redisClient?.isOpen) {
      return redisClient;
    }

    // Prevent multiple connections
    if (isConnecting) {
      return redisClient;
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

    return redisClient;
  } catch (error) {
    redisConnected = false;

    writeLog(
      "error",
      `❌ Redis connection failed: ${
        error?.message || "Unknown Redis error"
      }`,
    );

    return null;
  } finally {
    isConnecting = false;
  }
};

// ============================================================
// GET RAW CLIENT
// ============================================================

const getRedisClient = () => {
  return redisClient;
};

// ============================================================
// CHECK AUTH ENABLED
// ============================================================

const isRedisAuthEnabled = () => {
  return REDIS_AUTH_ENABLED;
};

// ============================================================
// CHECK CACHE ENABLED
// ============================================================

const isRedisCacheEnabled = () => {
  return REDIS_CACHE_ENABLED;
};

// ============================================================
// GET OR SET DATA CACHE
// ============================================================

const getOrSetCache = async (
  cacheKey,
  fetchFunction,
  ttlSeconds = REDIS_EXPIRE_TIME,
) => {
  /*
   * IMPORTANT:
   * If cache is disabled, NEVER touch Redis.
   *
   * Directly fetch from DB.
   */

  if (!REDIS_CACHE_ENABLED) {
    return await fetchFunction();
  }

  try {
    // Connect if needed
    if (!redisConnected || !redisClient?.isOpen) {
      await connect();
    }

    // Redis unavailable
    if (!redisConnected || !redisClient?.isOpen) {
      writeLog(
        "warn",
        "⚠️ Redis unavailable - fetching directly from DB",
      );

      return await fetchFunction();
    }

    // ========================================================
    // CACHE HIT
    // ========================================================

    const cachedData = await redisClient.get(cacheKey);

    if (cachedData !== null) {
      writeLog(
        "info",
        `⏪ Cache HIT: ${cacheKey}`,
      );

      try {
        return JSON.parse(cachedData);
      } catch {
        return cachedData;
      }
    }

    // ========================================================
    // CACHE MISS
    // ========================================================

    const freshData = await fetchFunction();

    // ========================================================
    // SAVE CACHE
    // ========================================================

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
  } catch (error) {
    writeLog(
      "warn",
      `⚠️ Redis cache failed for ${cacheKey}: ${
        error?.message || "Unknown error"
      }`,
    );

    // Cache failure must never break DB
    return await fetchFunction();
  }
};

// ============================================================
// SCAN CACHE KEYS
// ============================================================

const scanKeys = async (pattern, count = 100) => {
  /*
   * Cache disabled => do not touch Redis.
   */

  if (!REDIS_CACHE_ENABLED) {
    return [];
  }

  try {
    if (!redisConnected || !redisClient?.isOpen) {
      return [];
    }

    let cursor = "0";
    const keys = [];

    do {
      const result = await redisClient.scan(cursor, {
        MATCH: pattern,
        COUNT: count,
      });

      cursor = result.cursor;

      if (Array.isArray(result.keys)) {
        keys.push(...result.keys);
      }
    } while (cursor !== "0");

    return keys;
  } catch (error) {
    writeLog(
      "warn",
      `⚠️ Redis scan failed: ${
        error?.message || "Unknown error"
      }`,
    );

    return [];
  }
};

// ============================================================
// INVALIDATE CACHE
// ============================================================

const invalidateCacheByPattern = async (pattern) => {
  /*
   * Cache disabled => immediately return.
   */

  if (!REDIS_CACHE_ENABLED) {
    return;
  }

  try {
    if (!redisConnected || !redisClient?.isOpen) {
      return;
    }

    const keys = await scanKeys(pattern);

    if (keys.length === 0) {
      return;
    }

    await redisClient.del(keys);

    writeLog(
      "info",
      `🗑️ Deleted ${keys.length} cache keys`,
    );
  } catch (error) {
    writeLog(
      "warn",
      `⚠️ Cache invalidation failed: ${
        error?.message || "Unknown error"
      }`,
    );
  }
};

// ============================================================
// INVALIDATE TENANT CACHE
// ============================================================

const invalidateCacheByTenant = async (
  tableName,
  tenantId,
) => {
  if (!REDIS_CACHE_ENABLED) {
    return;
  }

  if (
    tenantId === undefined ||
    tenantId === null ||
    tenantId === ""
  ) {
    writeLog(
      "warn",
      "⚠️ Missing tenantId for cache invalidation",
    );

    return;
  }

  const pattern = `${tableName}:${tenantId}:*`;

  await invalidateCacheByPattern(pattern);
};

// ============================================================
// CLEAR DATA CACHE
// ============================================================

const clearAllCache = async () => {
  /*
   * NEVER flush Redis when authentication is using
   * the same Redis database.
   *
   * flushDb() can delete auth/session/token data.
   */

  if (!REDIS_CACHE_ENABLED) {
    writeLog(
      "warn",
      "⚠️ Data cache is disabled",
    );

    return;
  }

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

    writeLog(
      "info",
      "🧹 Redis data cache cleared",
    );
  } catch (error) {
    writeLog(
      "warn",
      `⚠️ Failed to clear Redis cache: ${
        error?.message || "Unknown error"
      }`,
    );
  }
};

// ============================================================
// CLOSE REDIS
// ============================================================

const closeRedis = async () => {
  try {
    if (redisClient?.isOpen) {
      await redisClient.quit();
    }

    redisConnected = false;
    isConnecting = false;

    writeLog(
      "info",
      "🔌 Redis connection closed gracefully",
    );
  } catch (error) {
    writeLog(
      "warn",
      `⚠️ Redis shutdown error: ${
        error?.message || "Unknown error"
      }`,
    );
  }
};

// ============================================================
// AUTO CONNECT
// ============================================================

if (REDIS_AUTH_ENABLED || REDIS_CACHE_ENABLED) {
  connect().catch(() => {});
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  // Redis client
  redisClient: getRedisClient,

  // Connection
  connect,
  closeRedis,

  // Feature flags
  isRedisAuthEnabled,
  isRedisCacheEnabled,

  // Data cache
  getOrSetCache,
  scanKeys,
  invalidateCacheByPattern,
  invalidateCacheByTenant,
  clearAllCache,
};