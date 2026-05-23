const { redisClient } = require("../config/redis");

// ======================================================
// GENERATE CACHE KEY
// ======================================================

const generateCacheKey = (
  req
) => {

  const paths =
    req.path
      .split("/")
      .filter(Boolean);

  const version =
    paths[0] || "v1";

  const moduleName =
    paths[1] || "common";

  const apiName =
    paths[2] || "list";

  let key =
    `cache:${version}:${moduleName}`;

  // ======================================
  // PARAMS SAFE ACCESS
  // ======================================

  if (
    req.params.tenant_id
  ) {

    key +=
      `:tenant_${req.params.tenant_id}`;
  }

  if (
    req.params.clinic_id
  ) {

    key +=
      `:clinic_${req.params.clinic_id}`;
  }

  if (
    req.params.superuser_id
  ) {

    key +=
      `:superuser_${req.params.superuser_id}`;
  }

  if (
    req.params.dentist_id
  ) {

    key +=
      `:dentist_${req.params.dentist_id}`;
  }

  if (
    req.params.patient_id
  ) {

    key +=
      `:patient_${req.params.patient_id}`;
  }

  // ======================================
  // API NAME
  // ======================================

  key += `:${apiName}`;

  // ======================================
  // QUERY PARAMS
  // ======================================

  if (
    Object.keys(req.query)
      .length > 0
  ) {

    const queryString =
      Object.entries(req.query)
        .map(
          ([k, v]) =>
            `${k}_${v}`
        )
        .join(":");

    key += `:${queryString}`;
  }

  return key;
};

// ======================================================
// CACHE MIDDLEWARE
// ======================================================

const globalCacheMiddleware =
  async (req, res, next) => {

    try {

      // ONLY GET
      if (
        req.method !== "GET"
      ) {
        return next();
      }

      // ======================================
      // MODULE
      // ======================================

      const moduleName =
        req.baseUrl
          .split("/")
          .filter(Boolean)[1];

      // ======================================
      // API NAME
      // ======================================

      const apiName =
        req.path
          .split("/")
          .filter(Boolean)[0];

      // ======================================
      // CACHE KEY
      // ======================================

      let cacheKey =
        `cache:v1:${moduleName}`;

      // tenant
      if (
        req.params.tenant_id
      ) {
        cacheKey +=
          `:tenant_${req.params.tenant_id}`;
      }

      // clinic
      if (
        req.params.clinic_id
      ) {
        cacheKey +=
          `:clinic_${req.params.clinic_id}`;
      }

      // dentist
      if (
        req.params.dentist_id
      ) {
        cacheKey +=
          `:dentist_${req.params.dentist_id}`;
      }

      // superuser
      if (
        req.params.superuser_id
      ) {
        cacheKey +=
          `:superuser_${req.params.superuser_id}`;
      }

      cacheKey += `:${apiName}`;

      // query params
      if (
        Object.keys(req.query)
          .length > 0
      ) {

        const queryString =
          Object.entries(req.query)
            .map(
              ([k, v]) =>
                `${k}_${v}`
            )
            .join(":");

        cacheKey +=
          `:${queryString}`;
      }

      req.cache_key =
        cacheKey;

      console.log(
        "🔑 CACHE KEY:",
        cacheKey
      );

      // ======================================
      // CHECK CACHE
      // ======================================

      const cachedData =
        await redisClient.get(
          cacheKey
        );

      if (
        cachedData
      ) {

        console.log(
          "✅ CACHE HIT:",
          cacheKey
        );

        return res.status(200).json(
          JSON.parse(
            cachedData
          )
        );
      }

      console.log(
        "❌ CACHE MISS:",
        cacheKey
      );

      // ======================================
      // STORE CACHE
      // ======================================

      const originalJson =
        res.json.bind(res);

      res.json =
        async (body) => {

          try {

            await redisClient.set(
              cacheKey,
              JSON.stringify(body),
              "EX",
              300
            );

            console.log(
              "💾 CACHE STORED:",
              cacheKey
            );

          } catch (err) {

            console.error(
              "Redis Store Error:",
              err.message
            );
          }

          return originalJson(
            body
          );
        };

      next();

    } catch (error) {

      console.error(
        "Cache Middleware Error:",
        error.message
      );

      next();
    }
  };

module.exports = {
  globalCacheMiddleware,
  generateCacheKey,
};
