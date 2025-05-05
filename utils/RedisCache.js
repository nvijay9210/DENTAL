const redis = require('../config/redisConfig'); // Import the Redis client

// Set cache with TTL (Time-To-Live)
const setCache = async (key, value, ttl = 3600) => {
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttl); // 'EX' sets the TTL
    console.log(`Data cached for key: ${key}`);
  } catch (err) {
    console.error('Error setting cache:', err);
  }
};

// Get cache with a fallback function
const getCache = async (key, fallbackFunction) => {
  try {
    const cachedData = await redis.get(key);
    if (cachedData) {
      console.log(`Serving data for key: ${key} from cache`);
      return JSON.parse(cachedData);
    }
    
    // If cache misses, fetch fresh data and cache it
    console.log(`Cache miss for key: ${key}, fetching fresh data`);
    const freshData = await fallbackFunction();
    await setCache(key, freshData);
    return freshData;
  } catch (err) {
    console.error('Error fetching cache:', err);
    throw err; // Propagate error for handling elsewhere
  }
};

module.exports={getCache}
