const { createClient } = require("redis");
require("dotenv").config();

const redisClient = createClient({ url: process.env.REDIS_URL });

let redisConnected = false;
let redisErrorShown = false;

redisClient.on("connect", () => {
  redisConnected = true;
  redisErrorShown = false;
  console.log("✅ Connected to Redis");
});

redisClient.on("error", (err) => {
  redisConnected = false;
  if (!redisErrorShown) {
    console.error("❌ Redis connection error:", err.message);
    redisErrorShown = true;
  }
});

const redisconnect = async () => {
  if (!redisConnected) {
    try {
      await redisClient.connect();
      redisConnected = true;
      console.log("✅ Connected to Redis (via redisconnect)");
    } catch (err) {
      if (!redisErrorShown) {
        console.error("❌ Failed to connect to Redis:", err.message);
        redisErrorShown = true;
      }
    }
  }
};

const getOrSetCache = async (cacheKey, fetchFunction, ttlSeconds = process.env.REDIS_EXPIRE_TIME || 3600) => {
  if (!redisClient.isOpen) await redisconnect();

  if (!redisConnected) {
    // Fallback to direct DB/service call if Redis is down
    return await fetchFunction();
  }

  const cachedData = await redisClient.get(cacheKey);
  if (cachedData) {
    console.log("⏪ Serving from Redis cache");
    return JSON.parse(cachedData);
  }

  const freshData = await fetchFunction(); // Your DB/service call
  await redisClient.set(cacheKey, JSON.stringify(freshData), {
    EX: parseInt(ttlSeconds),
  });

  console.log("✅ Cached fresh data in Redis");
  return freshData;
};

const invalidateCacheByTenant = async (tableName, tenantId) => {
  if (!redisConnected) return;

  const pattern = `${tableName}:${tenantId}:page:*:limit:*`;
  const keys = await redisClient.keys(pattern);
  if (keys.length > 0) {
    await redisClient.del(keys);
  }
};

module.exports = {
  redisClient,
  redisconnect,
  invalidateCacheByTenant,
  getOrSetCache,
};
