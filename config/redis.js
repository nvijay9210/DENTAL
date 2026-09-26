const Redis = require("ioredis");
const { writeLog } = require("../logs/logger");

require("dotenv").config();

// ============================================================
// REDIS ENV CONFIG
// ============================================================

const REDIS_HOST = process.env.REDIS_HOST || "127.0.0.1";

const REDIS_PORT = Number.parseInt(process.env.REDIS_PORT, 10) || 6379;

const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;

// DB 0 -> Authentication / Session
const REDIS_AUTH_DB = Number.parseInt(process.env.REDIS_AUTH_DB, 10) || 0;

// DB 1 -> Application Cache
const REDIS_CACHE_DB = Number.parseInt(process.env.REDIS_CACHE_DB, 10) || 1;

const REDIS_AUTH_ENABLED =
  String(process.env.REDIS_AUTH_ENABLED ?? "true").toLowerCase() === "true";

const REDIS_CACHE_ENABLED =
  String(process.env.REDIS_CACHE_ENABLED ?? "true").toLowerCase() === "true";

const REDIS_EXPIRE_TIME =
  Number.parseInt(process.env.REDIS_EXPIRE_TIME, 10) || 3600;

// ============================================================
// COMMON REDIS OPTIONS
// ============================================================

const createRedisConfig = (db) => ({
  host: REDIS_HOST,
  port: REDIS_PORT,
  password: REDIS_PASSWORD,
  db,

  maxRetriesPerRequest: 3,

  retryStrategy: (times) => {
    return Math.min(times * 100, 3000);
  },

  connectTimeout: 10000,

  keepAlive: 30000,

  lazyConnect: true,

  enableReadyCheck: true,

  enableOfflineQueue: true,
});

// ============================================================
// REDIS CLIENTS
//
// DB 0 -> redisAuthClient
// DB 1 -> redisCacheClient
// ============================================================

const redisAuthClient = new Redis(createRedisConfig(REDIS_AUTH_DB));

const redisCacheClient = new Redis(createRedisConfig(REDIS_CACHE_DB));

// ============================================================
// CLIENT STATE
// ============================================================

let shutdownStarted = false;

// ============================================================
// LOGGING HELPER
// ============================================================

const safeWriteLog = (level, message) => {
  try {
    writeLog(level, message);
  } catch {
    // Do not allow logger failure to break Redis
  }
};

// ============================================================
// REDIS EVENT HANDLERS
// ============================================================

// ------------------------------------------------------------
// AUTH CLIENT EVENTS
// ------------------------------------------------------------

redisAuthClient.on("connect", () => {
  console.log("🔄 Redis AUTH connecting:", {
    host: REDIS_HOST,
    port: REDIS_PORT,
    db: REDIS_AUTH_DB,
  });
});

redisAuthClient.on("ready", () => {
  console.log("🚀 Redis AUTH ready:", {
    host: REDIS_HOST,
    port: REDIS_PORT,
    db: REDIS_AUTH_DB,
  });

  safeWriteLog(
    "info",
    `✅ Redis AUTH ready (${REDIS_HOST}:${REDIS_PORT}/db${REDIS_AUTH_DB})`,
  );
});

redisAuthClient.on("error", (err) => {
  console.error("❌ Redis AUTH error:", {
    message: err?.message,
    code: err?.code,
    status: redisAuthClient.status,
  });

  safeWriteLog(
    "warn",
    `❌ Redis AUTH error: ${err?.message || "Unknown Redis error"}`,
  );
});

redisAuthClient.on("close", () => {
  console.warn("⚠️ Redis AUTH connection closed");
});

redisAuthClient.on("reconnecting", (delay) => {
  console.log(`🔄 Redis AUTH reconnecting in ${delay}ms...`);
});

// ------------------------------------------------------------
// CACHE CLIENT EVENTS
// ------------------------------------------------------------

redisCacheClient.on("connect", () => {
  console.log("🔄 Redis CACHE connecting:", {
    host: REDIS_HOST,
    port: REDIS_PORT,
    db: REDIS_CACHE_DB,
  });
});

redisCacheClient.on("ready", () => {
  console.log("🚀 Redis CACHE ready:", {
    host: REDIS_HOST,
    port: REDIS_PORT,
    db: REDIS_CACHE_DB,
  });

  safeWriteLog(
    "info",
    `✅ Redis CACHE ready (${REDIS_HOST}:${REDIS_PORT}/db${REDIS_CACHE_DB})`,
  );
});

redisCacheClient.on("error", (err) => {
  console.error("❌ Redis CACHE error:", {
    message: err?.message,
    code: err?.code,
    status: redisCacheClient.status,
  });

  safeWriteLog(
    "warn",
    `❌ Redis CACHE error: ${err?.message || "Unknown Redis error"}`,
  );
});

redisCacheClient.on("close", () => {
  console.warn("⚠️ Redis CACHE connection closed");
});

redisCacheClient.on("reconnecting", (delay) => {
  console.log(`🔄 Redis CACHE reconnecting in ${delay}ms...`);
});

// ============================================================
// CONNECT HELPER
// ============================================================

const connectClient = async (client, name) => {
  try {
    if (client.status === "ready") {
      return client;
    }

    if (client.status === "connecting" || client.status === "connect") {
      return client;
    }

    if (client.status === "end") {
      throw new Error(`Redis ${name} connection has ended`);
    }

    await client.connect();

    return client;
  } catch (error) {
    console.error(`❌ Redis ${name} connect error:`, error.message);

    throw error;
  }
};

// ============================================================
// CONNECT BOTH REDIS DATABASES
// ============================================================

const connect = async () => {
  const results = [];

  // ----------------------------------------------------------
  // AUTH DB
  // ----------------------------------------------------------

  if (REDIS_AUTH_ENABLED) {
    try {
      await connectClient(redisAuthClient, "AUTH");

      results.push({
        type: "AUTH",
        db: REDIS_AUTH_DB,
        status: "connected",
      });
    } catch (error) {
      console.error("❌ Redis AUTH connection failed:", error.message);

      throw error;
    }
  } else {
    console.log("ℹ️ Redis AUTH disabled");

    results.push({
      type: "AUTH",
      db: REDIS_AUTH_DB,
      status: "disabled",
    });
  }

  // ----------------------------------------------------------
  // CACHE DB
  // ----------------------------------------------------------

  if (REDIS_CACHE_ENABLED) {
    try {
      await connectClient(redisCacheClient, "CACHE");

      results.push({
        type: "CACHE",
        db: REDIS_CACHE_DB,
        status: "connected",
      });
    } catch (error) {
      console.warn("⚠️ Redis CACHE connection failed:", error.message);

      // Cache failure should not break application
      results.push({
        type: "CACHE",
        db: REDIS_CACHE_DB,
        status: "failed",
        error: error.message,
      });
    }
  } else {
    console.log("ℹ️ Redis CACHE disabled");

    results.push({
      type: "CACHE",
      db: REDIS_CACHE_DB,
      status: "disabled",
    });
  }

  return results;
};

// ============================================================
// ENSURE AUTH CLIENT
// ============================================================

const ensureAuthConnection = async () => {
  if (!REDIS_AUTH_ENABLED) {
    throw new Error("Redis AUTH is disabled");
  }

  if (redisAuthClient.status === "ready") {
    return redisAuthClient;
  }

  return await connectClient(redisAuthClient, "AUTH");
};

// ============================================================
// ENSURE CACHE CLIENT
// ============================================================

const ensureCacheConnection = async () => {
  if (!REDIS_CACHE_ENABLED) {
    throw new Error("Redis CACHE is disabled");
  }

  if (redisCacheClient.status === "ready") {
    return redisCacheClient;
  }

  return await connectClient(redisCacheClient, "CACHE");
};

// ============================================================
// HEALTH CHECK
// ============================================================

const checkRedisHealth = async () => {
  const result = {
    status: "healthy",
    auth: null,
    cache: null,
  };

  // ----------------------------------------------------------
  // AUTH HEALTH
  // ----------------------------------------------------------

  if (REDIS_AUTH_ENABLED) {
    try {
      const client = await ensureAuthConnection();

      const pong = await client.ping();

      result.auth = {
        status: pong === "PONG" ? "healthy" : "unhealthy",

        connected: client.status === "ready",

        statusCode: client.status,

        host: REDIS_HOST,
        port: REDIS_PORT,
        db: REDIS_AUTH_DB,
      };
    } catch (error) {
      result.auth = {
        status: "unhealthy",
        connected: false,
        statusCode: redisAuthClient.status,
        db: REDIS_AUTH_DB,
        error: error.message,
      };

      result.status = "unhealthy";
    }
  } else {
    result.auth = {
      status: "disabled",
      connected: false,
      db: REDIS_AUTH_DB,
    };
  }

  // ----------------------------------------------------------
  // CACHE HEALTH
  // ----------------------------------------------------------

  if (REDIS_CACHE_ENABLED) {
    try {
      const client = await ensureCacheConnection();

      const pong = await client.ping();

      result.cache = {
        status: pong === "PONG" ? "healthy" : "unhealthy",

        connected: client.status === "ready",

        statusCode: client.status,

        host: REDIS_HOST,
        port: REDIS_PORT,
        db: REDIS_CACHE_DB,
      };
    } catch (error) {
      result.cache = {
        status: "unhealthy",
        connected: false,
        statusCode: redisCacheClient.status,
        db: REDIS_CACHE_DB,
        error: error.message,
      };

      // Cache failure should not make auth unhealthy
      console.warn("⚠️ Redis CACHE health failed:", error.message);
    }
  } else {
    result.cache = {
      status: "disabled",
      connected: false,
      db: REDIS_CACHE_DB,
    };
  }

  return result;
};

// ============================================================
// BASIC REDIS HELPERS
//
// These remain on AUTH DB (DB0) for backward compatibility.
//
// Existing SSO/session code using:
//   redisClient
//   setEx
//   get
//   del
//   exists
//   ttl
//   incrWithExpiry
//
// will continue using DB0.
// ============================================================

// ============================================================
// SET EX - AUTH DB
// ============================================================

const setEx = async (key, ttlSeconds, value) => {
  try {
    const client = await ensureAuthConnection();

    const stringValue =
      typeof value === "object" ? JSON.stringify(value) : String(value);

    return await client.setex(key, ttlSeconds, stringValue);
  } catch (err) {
    console.error("❌ Redis AUTH setEx error:", err.message);

    throw err;
  }
};

// ============================================================
// GET - AUTH DB
// ============================================================

const get = async (key) => {
  try {
    const client = await ensureAuthConnection();

    const value = await client.get(key);

    if (value === null) {
      return null;
    }

    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  } catch (err) {
    console.error("❌ Redis AUTH get error:", err.message);

    throw err;
  }
};

// ============================================================
// DELETE - AUTH DB
// ============================================================

const del = async (...keys) => {
  try {
    if (!keys || keys.length === 0) {
      return 0;
    }

    const client = await ensureAuthConnection();

    return await client.del(...keys);
  } catch (err) {
    console.error("❌ Redis AUTH delete error:", err.message);

    throw err;
  }
};

// ============================================================
// EXISTS - AUTH DB
// ============================================================

const exists = async (key) => {
  try {
    const client = await ensureAuthConnection();

    return (await client.exists(key)) === 1;
  } catch (err) {
    console.error("❌ Redis AUTH exists error:", err.message);

    throw err;
  }
};

// ============================================================
// TTL - AUTH DB
// ============================================================

const ttl = async (key) => {
  try {
    const client = await ensureAuthConnection();

    return await client.ttl(key);
  } catch (err) {
    console.error("❌ Redis AUTH TTL error:", err.message);

    throw err;
  }
};

// ============================================================
// INCREMENT + EXPIRY - AUTH DB
// ============================================================

const incrWithExpiry = async (key, ttlSeconds) => {
  try {
    const client = await ensureAuthConnection();

    const pipeline = client.pipeline();

    pipeline.incr(key);
    pipeline.expire(key, ttlSeconds);

    const results = await pipeline.exec();

    return results?.[0]?.[1] || 0;
  } catch (err) {
    console.error("❌ Redis AUTH incrWithExpiry error:", err.message);

    throw err;
  }
};

// ============================================================
// SESSION CACHE
//
// IMPORTANT:
// This is used by SSOAuth.js:
//
// session:${sessionId}
//
// Therefore it MUST stay in DB0.
// ============================================================

// ============================================================
// SET CACHE - AUTH DB
// ============================================================

const setCache = async (key, data, ttlSeconds = 300) => {
  try {
    const client = await ensureAuthConnection();

    const value =
      typeof data === "object" ? JSON.stringify(data) : String(data);

    await client.set(key, value, "EX", ttlSeconds);

    console.log(`💾 AUTH SESSION STORED [DB${REDIS_AUTH_DB}]:`, key);

    return true;
  } catch (err) {
    console.error(
      "❌ Redis setCache error:",
      err.message,
      "status:",
      redisAuthClient.status,
      "db:",
      REDIS_AUTH_DB,
    );

    throw err;
  }
};

// ============================================================
// GET CACHE - AUTH DB
// ============================================================

const getCache = async (key) => {
  try {
    const client = await ensureAuthConnection();

    const value = await client.get(key);

    if (value === null) {
      return null;
    }

    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  } catch (err) {
    console.error("❌ Redis getCache error:", err.message);

    throw err;
  }
};

// ============================================================
// APPLICATION CACHE
//
// DB1 ONLY
// ============================================================

// ============================================================
// GET OR SET CACHE
// ============================================================

const getOrSetCache = async (
  cacheKey,
  fetchFunction,
  ttlSeconds = REDIS_EXPIRE_TIME,
) => {
  // ----------------------------------------------------------
  // CACHE DISABLED
  // ----------------------------------------------------------

  if (!REDIS_CACHE_ENABLED) {
    return await fetchFunction();
  }

  try {
    const client = await ensureCacheConnection();

    // --------------------------------------------------------
    // CACHE HIT
    // --------------------------------------------------------

    const cachedData = await client.get(cacheKey);

    if (cachedData !== null) {
      console.log(`⏪ Cache HIT [DB${REDIS_CACHE_DB}]: ${cacheKey}`);

      try {
        return JSON.parse(cachedData);
      } catch {
        return cachedData;
      }
    }

    // --------------------------------------------------------
    // CACHE MISS
    // --------------------------------------------------------

    console.log(`🔍 Cache MISS [DB${REDIS_CACHE_DB}]: ${cacheKey}`);

    const freshData = await fetchFunction();

    // --------------------------------------------------------
    // STORE CACHE
    // --------------------------------------------------------

    if (freshData !== null && freshData !== undefined) {
      await client.set(cacheKey, JSON.stringify(freshData), "EX", ttlSeconds);

      console.log(
        `✅ Cached [DB${REDIS_CACHE_DB}]: ${cacheKey} (${ttlSeconds}s)`,
      );
    }

    return freshData;
  } catch (error) {
    console.warn(`⚠️ Redis cache failed for ${cacheKey}:`, error.message);

    // --------------------------------------------------------
    // IMPORTANT:
    // Redis cache failure must NOT break DB operation
    // --------------------------------------------------------

    return await fetchFunction();
  }
};

// ============================================================
// REMOVE CACHE - DB1
// ============================================================

const removeCache = async (key) => {
  try {
    if (!REDIS_CACHE_ENABLED) {
      return true;
    }

    const client = await ensureCacheConnection();

    await client.del(key);

    console.log(`🗑️ CACHE REMOVED [DB${REDIS_CACHE_DB}]:`, key);

    return true;
  } catch (err) {
    console.error("❌ Redis removeCache error:", err.message);

    return false;
  }
};

// ============================================================
// SCAN KEYS - DB1
// ============================================================

const scanKeys = async (pattern, count = 100) => {
  try {
    if (!REDIS_CACHE_ENABLED) {
      return [];
    }

    const client = await ensureCacheConnection();

    const keys = [];

    let cursor = "0";

    do {
      const result = await client.scan(
        cursor,
        "MATCH",
        pattern,
        "COUNT",
        count,
      );

      cursor = result[0];

      if (result[1]?.length) {
        keys.push(...result[1]);
      }
    } while (cursor !== "0");

    return keys;
  } catch (error) {
    console.warn(`⚠️ Redis cache scan failed: ${error.message}`);

    return [];
  }
};

// ============================================================
// CLEAR CACHE BY PATTERN - DB1
// ============================================================

const clearCacheByPattern = async (pattern) => {
  try {
    if (!REDIS_CACHE_ENABLED) {
      return;
    }

    const client = await ensureCacheConnection();

    const keys = await scanKeys(pattern);

    if (keys.length === 0) {
      console.log(`ℹ️ No cache keys found [DB${REDIS_CACHE_DB}]: ${pattern}`);

      return;
    }

    // Delete in batches to avoid huge command
    const batchSize = 500;

    for (let i = 0; i < keys.length; i += batchSize) {
      const batch = keys.slice(i, i + batchSize);

      if (batch.length > 0) {
        await client.del(...batch);
      }
    }

    console.log(
      `🗑️ Removed ${keys.length} cache keys [DB${REDIS_CACHE_DB}]: ${pattern}`,
    );
  } catch (err) {
    console.error("❌ clearCacheByPattern error:", err.message);
  }
};

// ============================================================
// ALIAS FOR OLD SERVICES
// ============================================================

const invalidateCacheByPattern = clearCacheByPattern;

// ============================================================
// TENANT CACHE INVALIDATION - DB1
// ============================================================

const invalidateCacheByTenant = async (tableName, tenantId) => {
  if (tenantId === undefined || tenantId === null || tenantId === "") {
    return;
  }

  const pattern = `${tableName}:${tenantId}:*`;

  await invalidateCacheByPattern(pattern);
};

// ============================================================
// CLEAR APPLICATION CACHE ONLY
//
// IMPORTANT:
// DO NOT FLUSH DB0.
// Auth/session data is in DB0.
// ============================================================

const clearAllCache = async () => {
  if (process.env.NODE_ENV === "production") {
    console.warn("🚨 clearAllCache disabled in production");

    return;
  }

  if (!REDIS_CACHE_ENABLED) {
    console.log("ℹ️ Redis cache is disabled");

    return;
  }

  try {
    const client = await ensureCacheConnection();

    await client.flushdb();

    console.log(`🧹 Redis CACHE DB${REDIS_CACHE_DB} cleared`);

    console.log(`🔐 Redis AUTH DB${REDIS_AUTH_DB} was NOT touched`);
  } catch (err) {
    console.error("❌ Failed to clear Redis cache DB:", err.message);
  }
};

// ============================================================
// BUILD CACHE KEY
// ============================================================

const buildCacheKey = (type, scope, options = {}) => {
  const parts = [type, scope];

  const {
    tenant_id,
    clinic_id,
    dentist_id,
    patient_id,
    appointment_id,
    asset_id,
    expense_id,
    supplier_id,
    supplier_product_id,
    supplier_payment_id,
    supplier_review_id,
    purchase_id,
    page,
    limit,
    start_date,
    end_date,
    appointment_type,
    status,
  } = options;

  if (tenant_id !== undefined && tenant_id !== null) {
    parts.push(`tenant_id:${tenant_id}`);
  }

  if (clinic_id !== undefined && clinic_id !== null) {
    parts.push(`clinic_id:${clinic_id}`);
  }

  if (dentist_id !== undefined && dentist_id !== null) {
    parts.push(`dentist_id:${dentist_id}`);
  }

  if (patient_id !== undefined && patient_id !== null) {
    parts.push(`patient_id:${patient_id}`);
  }

  if (appointment_id !== undefined && appointment_id !== null) {
    parts.push(`appointment_id:${appointment_id}`);
  }

  if (asset_id !== undefined && asset_id !== null) {
    parts.push(`asset_id:${asset_id}`);
  }

  if (expense_id !== undefined && expense_id !== null) {
    parts.push(`expense_id:${expense_id}`);
  }

  if (supplier_id !== undefined && supplier_id !== null) {
    parts.push(`supplier_id:${supplier_id}`);
  }

  if (supplier_product_id !== undefined && supplier_product_id !== null) {
    parts.push(`supplier_product_id:${supplier_product_id}`);
  }

  if (supplier_payment_id !== undefined && supplier_payment_id !== null) {
    parts.push(`supplier_payment_id:${supplier_payment_id}`);
  }

  if (supplier_review_id !== undefined && supplier_review_id !== null) {
    parts.push(`supplier_review_id:${supplier_review_id}`);
  }

  if (purchase_id !== undefined && purchase_id !== null) {
    parts.push(`purchase_id:${purchase_id}`);
  }

  if (page !== undefined) {
    parts.push(`page:${page}`);
  }

  if (limit !== undefined) {
    parts.push(`limit:${limit}`);
  }

  if (start_date) {
    parts.push(`start_date:${start_date}`);
  }

  if (end_date) {
    parts.push(`end_date:${end_date}`);
  }

  if (appointment_type) {
    parts.push(`appointment_type:${appointment_type}`);
  }

  if (status) {
    parts.push(`status:${status}`);
  }

  return parts.join(":");
};

// ============================================================
// CLOSE REDIS
// ============================================================

const closeRedis = async () => {
  if (shutdownStarted) {
    return;
  }

  shutdownStarted = true;

  console.log("🔌 Closing Redis connections...");

  // ----------------------------------------------------------
  // AUTH
  // ----------------------------------------------------------

  try {
    if (redisAuthClient.status !== "end" && redisAuthClient.status !== "wait") {
      await redisAuthClient.quit();
    }

    console.log(`🔐 Redis AUTH DB${REDIS_AUTH_DB} closed`);
  } catch (error) {
    console.warn("⚠️ Redis AUTH shutdown error:", error.message);
  }

  // ----------------------------------------------------------
  // CACHE
  // ----------------------------------------------------------

  try {
    if (
      redisCacheClient.status !== "end" &&
      redisCacheClient.status !== "wait"
    ) {
      await redisCacheClient.quit();
    }

    console.log(`🗂️ Redis CACHE DB${REDIS_CACHE_DB} closed`);
  } catch (error) {
    console.warn("⚠️ Redis CACHE shutdown error:", error.message);
  }

  console.log("🔌 Redis connections closed gracefully");
};

// ============================================================
// GRACEFUL SHUTDOWN
// ============================================================

const gracefulShutdown = async (signal) => {
  console.log(`🛑 Redis shutdown signal: ${signal || "manual"}`);

  await closeRedis();
};

// ============================================================
// PROCESS SIGNALS
// ============================================================

process.once("SIGTERM", () => gracefulShutdown("SIGTERM"));

process.once("SIGINT", () => gracefulShutdown("SIGINT"));

// ============================================================
// BACKWARD COMPATIBILITY
//
// IMPORTANT:
//
// Existing code:
// const { redisClient } = require("../config/redis");
//
// will receive AUTH DB client.
// So SSO/session code remains DB0.
// ============================================================

const redisClient = redisAuthClient;

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  // ----------------------------------------------------------
  // Clients
  // ----------------------------------------------------------

  // Backward compatible.
  // DB0 = Auth / Session
  redisClient,

  // Explicit clients
  redisAuthClient,
  redisCacheClient,

  // ----------------------------------------------------------
  // Connection
  // ----------------------------------------------------------

  connect,
  closeRedis,
  gracefulShutdown,

  // ----------------------------------------------------------
  // Health
  // ----------------------------------------------------------

  checkRedisHealth,

  // ----------------------------------------------------------
  // Feature flags
  // ----------------------------------------------------------

  isRedisAuthEnabled: () => REDIS_AUTH_ENABLED,

  isRedisCacheEnabled: () => REDIS_CACHE_ENABLED,

  // ----------------------------------------------------------
  // Redis DB information
  // ----------------------------------------------------------

  REDIS_AUTH_DB,
  REDIS_CACHE_DB,

  // ----------------------------------------------------------
  // Basic Redis
  //
  // DB0
  // ----------------------------------------------------------

  setEx,
  get,
  del,
  exists,
  ttl,
  incrWithExpiry,

  // ----------------------------------------------------------
  // Session / Auth cache
  //
  // DB0
  // ----------------------------------------------------------

  setCache,
  getCache,

  // ----------------------------------------------------------
  // Application cache
  //
  // DB1
  // ----------------------------------------------------------

  removeCache,
  getOrSetCache,

  // ----------------------------------------------------------
  // Cache invalidation
  //
  // DB1
  // ----------------------------------------------------------

  scanKeys,
  clearCacheByPattern,
  invalidateCacheByPattern,
  invalidateCacheByTenant,
  clearAllCache,

  // ----------------------------------------------------------
  // Cache key
  // ----------------------------------------------------------

  buildCacheKey,
};
