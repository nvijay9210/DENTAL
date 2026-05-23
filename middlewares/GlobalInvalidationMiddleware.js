const {
  clearCacheByPattern,
} = require("../config/redis");

// ======================================================
// GLOBAL INVALIDATION MIDDLEWARE
// ======================================================

const globalInvalidationMiddleware =
  async (req, res, next) => {

    try {

      /**
       * ==========================================
       * ONLY WRITE METHODS
       * ==========================================
       */

      const methods = [
        "POST",
        "PUT",
        "PATCH",
        "DELETE",
      ];

      if (
        !methods.includes(req.method)
      ) {
        return next();
      }

      /**
       * ==========================================
       * AFTER RESPONSE SUCCESS
       * ==========================================
       */

      res.on(
        "finish",
        async () => {

          try {

            /**
             * ======================================
             * ONLY SUCCESS RESPONSES
             * ======================================
             */

            if (
              res.statusCode < 200 ||
              res.statusCode >= 300
            ) {
              return;
            }

            /**
             * ======================================
             * VERSION + MODULE
             * ======================================
             */

            const baseParts =
              req.baseUrl
                .split("/")
                .filter(Boolean);

            const version =
              baseParts[0] || "v1";

            const moduleName =
              baseParts[1] || "common";

            /**
             * ======================================
             * IDS
             * ======================================
             */

            const tenant_id =
              req.params?.tenant_id ||
              req.body?.tenant_id ||
              req.tenant_id;

            const clinic_id =
              req.params?.clinic_id ||
              req.body?.clinic_id ||
              req.clinic_id;

            const superuser_id =
              req.params?.superuser_id ||
              req.body?.superuser_id;

            const dentist_id =
              req.params?.dentist_id ||
              req.body?.dentist_id;

            const patient_id =
              req.params?.patient_id ||
              req.body?.patient_id;

            const appointment_id =
              req.params?.appointment_id ||
              req.body?.appointment_id;

            /**
             * ======================================
             * NO TENANT → SKIP
             * ======================================
             */

            if (!tenant_id) {

              console.log(
                "⚠️ No tenant_id found. Skipping cache invalidation."
              );

              return;
            }

            /**
             * ======================================
             * BUILD PATTERNS
             * ======================================
             */

            const patterns = [];

            /**
             * ======================================
             * CLINIC LEVEL CACHE
             * ======================================
             */

            if (clinic_id) {

              patterns.push(
                `cache:${version}:${moduleName}:tenant_${tenant_id}:clinic_${clinic_id}*`
              );
            }

            /**
             * ======================================
             * SUPERUSER CACHE
             * ======================================
             */

            if (superuser_id) {

              patterns.push(
                `cache:${version}:${moduleName}:tenant_${tenant_id}:superuser_${superuser_id}*`
              );
            }

            /**
             * ======================================
             * DENTIST CACHE
             * ======================================
             */

            if (dentist_id) {

              patterns.push(
                `cache:${version}:${moduleName}:tenant_${tenant_id}:dentist_${dentist_id}*`
              );
            }

            /**
             * ======================================
             * PATIENT CACHE
             * ======================================
             */

            if (patient_id) {

              patterns.push(
                `cache:${version}:${moduleName}:tenant_${tenant_id}:patient_${patient_id}*`
              );
            }

            /**
             * ======================================
             * APPOINTMENT CACHE
             * ======================================
             */

            if (appointment_id) {

              patterns.push(
                `cache:${version}:${moduleName}:tenant_${tenant_id}:appointment_${appointment_id}*`
              );
            }

            /**
             * ======================================
             * FALLBACK → TENANT LEVEL
             * ======================================
             */

            if (patterns.length === 0) {

              patterns.push(
                `cache:${version}:${moduleName}:tenant_${tenant_id}*`
              );
            }

            /**
             * ======================================
             * REMOVE DUPLICATES
             * ======================================
             */

            const uniquePatterns =
              [...new Set(patterns)];

            /**
             * ======================================
             * INVALIDATE CACHE
             * ======================================
             */

            for (const pattern of uniquePatterns) {

              console.log(
                "🗑️ INVALIDATING:",
                pattern
              );

              await clearCacheByPattern(
                pattern
              );

              console.log(
                "✅ INVALIDATED:",
                pattern
              );
            }

          } catch (err) {

            console.error(
              "❌ Cache Invalidation Error:",
              err.message
            );
          }
        }
      );

      next();

    } catch (error) {

      console.error(
        "❌ Middleware Error:",
        error.message
      );

      next();
    }
  };

module.exports =
  globalInvalidationMiddleware;