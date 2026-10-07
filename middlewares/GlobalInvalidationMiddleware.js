const { clearCacheByPattern } = require("../config/redis");

// ======================================================
// GLOBAL INVALIDATION MIDDLEWARE
// ======================================================
const globalInvalidationMiddleware = async (req, res, next) => {
  try {
    // ======================================================
    // ONLY WRITE METHODS
    // ======================================================
    const methods = ["POST", "PUT", "PATCH", "DELETE"];

    if (!methods.includes(req.method)) {
      return next();
    }

    const currentPath = req.path || req.originalUrl;

    if (currentPath.startsWith("/v1/ssoAuth/")) {
      return next();
    }
    // ======================================================
    // AFTER RESPONSE SUCCESS
    // ======================================================
    res.on("finish", async () => {
      try {
        // ======================================================
        // ONLY SUCCESS RESPONSES
        // ======================================================
        if (res.statusCode < 200 || res.statusCode >= 300) {
          return;
        }

        // ======================================================
        // VERSION
        // ======================================================
        const baseParts = (req.baseUrl || "").split("/").filter(Boolean);

        const version = baseParts[0] || "v1";

        // ======================================================
        // TENANT
        // ======================================================
        const tenant_id =
          req.params?.tenant_id ||
          req.body?.tenant_id ||
          req.tenant_id ||
          req.user?.tenant_id ||
          req.user?.tenantId;

        if (!tenant_id) {
          console.log("ℹ️ Cache invalidation skipped: No tenant_id found", {
            method: req.method,
            path: req.originalUrl,
          });

          return;
        }

        // ======================================================
        // CLINIC IDS
        // ======================================================
        const clinicIds = new Set();

        // ======================================================
        // CURRENT CLINIC
        // ======================================================
        const clinic_id =
          req.params?.clinic_id ||
          req.body?.clinic_id ||
          req.clinic_id ||
          req.user?.clinic_id ||
          req.user?.clinicId;

        if (clinic_id) {
          const numericClinicId = Number(clinic_id);

          if (!Number.isNaN(numericClinicId)) {
            clinicIds.add(numericClinicId);
          }
        }

        // ======================================================
        // RELATED CLINIC IDS
        // ======================================================
        if (Array.isArray(req.related_clinic_ids)) {
          req.related_clinic_ids.forEach((id) => {
            const numericId = Number(id);

            if (!Number.isNaN(numericId)) {
              clinicIds.add(numericId);
            }
          });
        }

        // ======================================================
        // CLINIC LEVEL INVALIDATION
        // ======================================================
        if (clinicIds.size > 0) {
          for (const cid of clinicIds) {
            // ----------------------------------------------
            // CLINIC SPECIFIC CACHE
            // ----------------------------------------------
            const clinicPattern = `cache:${version}:*:tenant_${tenant_id}:clinic_${cid}*`;

            console.log("🗑️ INVALIDATING CLINIC:", clinicPattern);

            await clearCacheByPattern(clinicPattern);

            console.log("✅ INVALIDATED:", clinicPattern);
          }

          // ----------------------------------------------
          // CLINIC MODULE LIST CACHE
          // ----------------------------------------------
          const clinicListPattern = `cache:${version}:clinic:tenant_${tenant_id}*`;

          console.log("🗑️ INVALIDATING CLINIC LIST:", clinicListPattern);

          await clearCacheByPattern(clinicListPattern);

          console.log("✅ INVALIDATED:", clinicListPattern);

          return;
        }

        // ======================================================
        // TENANT LEVEL INVALIDATION
        // ======================================================
        const tenantPattern = `cache:${version}:*:tenant_${tenant_id}*`;

        console.log("🗑️ INVALIDATING TENANT:", tenantPattern);

        await clearCacheByPattern(tenantPattern);

        console.log("✅ INVALIDATED TENANT:", tenantPattern);
      } catch (err) {
        console.error("❌ Cache Invalidation Error:", err.message);
      }
    });

    next();
  } catch (error) {
    console.error("❌ Middleware Error:", error.message);

    next();
  }
};

module.exports = globalInvalidationMiddleware;
