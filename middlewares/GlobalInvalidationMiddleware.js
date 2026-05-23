const {
  clearCacheByPattern,
} = require("../config/redis");

// ======================================================
// GLOBAL INVALIDATION MIDDLEWARE
// ======================================================

const globalInvalidationMiddleware =
  async (req, res, next) => {

    try {

      // ==========================================
      // ONLY WRITE METHODS
      // ==========================================

      const methods = [
        "POST",
        "PUT",
        "DELETE",
        "PATCH",
      ];

      if (
        !methods.includes(
          req.method
        )
      ) {
        return next();
      }

      // ==========================================
      // AFTER RESPONSE SUCCESS
      // ==========================================

      res.on(
        "finish",
        async () => {

          try {

            // ======================================
            // ONLY SUCCESS RESPONSES
            // ======================================

            if (
              res.statusCode < 200 ||
              res.statusCode >= 300
            ) {
              return;
            }

            // ======================================
            // VERSION + MODULE
            // ======================================

            // req.baseUrl:
            // /v1/clinic

            const baseParts =
              req.baseUrl
                .split("/")
                .filter(Boolean);

            const version =
              baseParts[0] || "v1";

            const moduleName =
              baseParts[1] || "common";

            // ======================================
            // PARAMS
            // ======================================

            const tenant_id =
              req.params.tenant_id ||
              req.body.tenant_id;

            const clinic_id =
              req.params.clinic_id ||
              req.body.clinic_id;

            const dentist_id =
              req.params.dentist_id ||
              req.body.dentist_id;

            const patient_id =
              req.params.patient_id ||
              req.body.patient_id;

            const superuser_id =
              req.params.superuser_id ||
              req.body.superuser_id;

            const appointment_id =
              req.params.appointment_id ||
              req.body.appointment_id;

            let pattern = "";

            // ======================================
            // CLINIC
            // ======================================

            if (
              moduleName ===
              "clinic"
            ) {

              // tenant + clinic
              if (
                tenant_id &&
                clinic_id
              ) {

                pattern =
                  `cache:${version}:clinic:` +
                  `tenant_${tenant_id}:` +
                  `clinic_${clinic_id}*`;
              }

              // tenant only
              else if (
                tenant_id
              ) {

                pattern =
                  `cache:${version}:clinic:` +
                  `tenant_${tenant_id}*`;
              }

              // all
              else {

                pattern =
                  `cache:${version}:clinic*`;
              }
            }

            // ======================================
            // SUPERUSER
            // ======================================

            else if (
              moduleName ===
              "superuser"
            ) {

              // tenant + clinic
              if (
                tenant_id &&
                clinic_id
              ) {

                pattern =
                  `cache:${version}:superuser:` +
                  `tenant_${tenant_id}:` +
                  `clinic_${clinic_id}*`;
              }

              // tenant + superuser
              else if (
                tenant_id &&
                superuser_id
              ) {

                pattern =
                  `cache:${version}:superuser:` +
                  `tenant_${tenant_id}:` +
                  `superuser_${superuser_id}*`;
              }

              // tenant only
              else if (
                tenant_id
              ) {

                pattern =
                  `cache:${version}:superuser:` +
                  `tenant_${tenant_id}*`;
              }

              // all
              else {

                pattern =
                  `cache:${version}:superuser*`;
              }
            }

            // ======================================
            // DENTIST
            // ======================================

            else if (
              moduleName ===
              "dentist"
            ) {

              // tenant + clinic
              if (
                tenant_id &&
                clinic_id
              ) {

                pattern =
                  `cache:${version}:dentist:` +
                  `tenant_${tenant_id}:` +
                  `clinic_${clinic_id}*`;
              }

              // tenant + dentist
              else if (
                tenant_id &&
                dentist_id
              ) {

                pattern =
                  `cache:${version}:dentist:` +
                  `tenant_${tenant_id}:` +
                  `dentist_${dentist_id}*`;
              }

              // tenant only
              else if (
                tenant_id
              ) {

                pattern =
                  `cache:${version}:dentist:` +
                  `tenant_${tenant_id}*`;
              }

              // all
              else {

                pattern =
                  `cache:${version}:dentist*`;
              }
            }

            // ======================================
            // PATIENT
            // ======================================

            else if (
              moduleName ===
              "patient"
            ) {

              // tenant + clinic
              if (
                tenant_id &&
                clinic_id
              ) {

                pattern =
                  `cache:${version}:patient:` +
                  `tenant_${tenant_id}:` +
                  `clinic_${clinic_id}*`;
              }

              // tenant + patient
              else if (
                tenant_id &&
                patient_id
              ) {

                pattern =
                  `cache:${version}:patient:` +
                  `tenant_${tenant_id}:` +
                  `patient_${patient_id}*`;
              }

              // tenant only
              else if (
                tenant_id
              ) {

                pattern =
                  `cache:${version}:patient:` +
                  `tenant_${tenant_id}*`;
              }

              // all
              else {

                pattern =
                  `cache:${version}:patient*`;
              }
            }

            // ======================================
            // APPOINTMENT
            // ======================================

            else if (
              moduleName ===
              "appointment"
            ) {

              // tenant + clinic
              if (
                tenant_id &&
                clinic_id
              ) {

                pattern =
                  `cache:${version}:appointment:` +
                  `tenant_${tenant_id}:` +
                  `clinic_${clinic_id}*`;
              }

              // tenant + appointment
              else if (
                tenant_id &&
                appointment_id
              ) {

                pattern =
                  `cache:${version}:appointment:` +
                  `tenant_${tenant_id}:` +
                  `appointment_${appointment_id}*`;
              }

              // tenant only
              else if (
                tenant_id
              ) {

                pattern =
                  `cache:${version}:appointment:` +
                  `tenant_${tenant_id}*`;
              }

              // all
              else {

                pattern =
                  `cache:${version}:appointment*`;
              }
            }

            // ======================================
            // DASHBOARD
            // ======================================

            else if (
              moduleName ===
              "dashboard"
            ) {

              // tenant + clinic
              if (
                tenant_id &&
                clinic_id
              ) {

                pattern =
                  `cache:${version}:dashboard:` +
                  `tenant_${tenant_id}:` +
                  `clinic_${clinic_id}*`;
              }

              // tenant only
              else if (
                tenant_id
              ) {

                pattern =
                  `cache:${version}:dashboard:` +
                  `tenant_${tenant_id}*`;
              }

              // all
              else {

                pattern =
                  `cache:${version}:dashboard*`;
              }
            }

            // ======================================
            // DEFAULT
            // ======================================

            else {

              if (
                tenant_id &&
                clinic_id
              ) {

                pattern =
                  `cache:${version}:${moduleName}:` +
                  `tenant_${tenant_id}:` +
                  `clinic_${clinic_id}*`;
              }

              else if (
                tenant_id
              ) {

                pattern =
                  `cache:${version}:${moduleName}:` +
                  `tenant_${tenant_id}*`;
              }

              else {

                pattern =
                  `cache:${version}:${moduleName}*`;
              }
            }

            // ======================================
            // CLEAR CACHE
            // ======================================

            if (
              pattern
            ) {

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
              "❌ Global Invalidation Error:",
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