const logger = require("../logs/logger");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const { CustomError } = require("../middlewares/CustomeError");
const { getUserByTenantClinicAndKeycloakId } = require("../utils/Reusability");
const qs = require("querystring");
const { getTenantByTenantId } = require("../models/TenantModel");

async function checkUserInKeycloak(token, realm, userId) {
  const url = `${process.env.KEYCLOAK_BASE_URL}/admin/realms/${realm}/users/${userId}`;

  try {
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (err) {
    if (err.response?.status === 404) return null;
    throw new CustomError("Failed to verify user in Keycloak", 404);
  }
}

function authenticateTenantClinicGroup(requiredRoles = []) {

  const ROLE_PRIORITY = [
    "tenant",
    "superuser",
    "dentist",
    "receptionist",
    "patient",
    "supplier",
    "guest",
  ];

  const PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
${process.env.KEYCLOAK_REALM_PUBLIC_KEY}
-----END PUBLIC KEY-----`;

  const COOKIE_OPTIONS = {
    httpOnly: true,
    secure:
      process.env.NODE_ENV ===
      "production",
    sameSite:
      process.env.NODE_ENV ===
      "production"
        ? "None"
        : "Lax",
  };

  return async (req, res, next) => {

    try {

      /**
       * =====================================
       * DEV MODE
       * =====================================
       */

      if (
        process.env.KEYCLOAK_POWER ===
        "off"
      ) {

        req.user = {
          username: "dev-user",
          role:
            requiredRoles[0] ||
            "guest",
        };

        req.role =
          requiredRoles[0] ||
          "guest";

        return next();
      }

      /**
       * =====================================
       * TOKENS
       * =====================================
       */

      let token =
        req.cookies?.access_token ||
        req.headers.authorization
          ?.split(" ")[1] ||
        req.headers["access_token"];

      let refreshToken =
        req.cookies?.refresh_token ||
        req.headers["refresh_token"];

      const realm =
        process.env.KEYCLOAK_REALM;

      if (!token) {

        throw new CustomError(
          "Access token missing",
          401
        );
      }

      let decoded;

      /**
       * =====================================
       * VERIFY TOKEN
       * =====================================
       */

      try {

        decoded = jwt.verify(
          token,
          PUBLIC_KEY,
          {
            algorithms: ["RS256"],
          }
        );

      } catch (err) {

        /**
         * =====================================
         * TOKEN EXPIRED
         * =====================================
         */

        if (
          err.name !==
          "TokenExpiredError"
        ) {

          throw new CustomError(
            "Invalid token",
            401
          );
        }

        /**
         * =====================================
         * REFRESH TOKEN REQUIRED
         * =====================================
         */

        if (!refreshToken) {

          throw new CustomError(
            "Refresh token missing",
            401
          );
        }

        /**
         * =====================================
         * DECODE EXPIRED TOKEN
         * =====================================
         */

        const expiredDecoded =
          jwt.decode(token);

        if (!expiredDecoded) {

          throw new CustomError(
            "Invalid expired token",
            401
          );
        }

        /**
         * =====================================
         * GROUPS
         * =====================================
         */

        const groups =
          expiredDecoded?.groups ||
          [];

        const dentalGroup =
          groups.find((g) =>
            g.startsWith(
              "dental-"
            )
          );

        if (!dentalGroup) {

          throw new CustomError(
            "Tenant group missing",
            403
          );
        }

        const match =
          dentalGroup.match(
            /^dental-(\d+)-(\d+)$/
          );

        if (!match) {

          throw new CustomError(
            "Invalid dental group",
            403
          );
        }

        const tenantId =
          Number(match[1]);

        /**
         * =====================================
         * TENANT CONFIG
         * =====================================
         */

        const tenantConfig =
          await getTenantByTenantId(
            tenantId
          );

        if (!tenantConfig) {

          throw new CustomError(
            "Tenant not found",
            404
          );
        }

        /**
         * =====================================
         * CLIENT ID
         * =====================================
         */

        const clientId =
          tenantConfig.tenant_domain;

        /**
         * =====================================
         * REFRESH TOKEN
         * =====================================
         */

        try {

          const tokenUrl =
            `${process.env.KEYCLOAK_BASE_URL}/realms/${realm}/protocol/openid-connect/token`;

          const response =
            await axios.post(
              tokenUrl,
              qs.stringify({
                grant_type:
                  "refresh_token",
                refresh_token:
                  refreshToken,
                client_id:
                  clientId,
              }),
              {
                headers: {
                  "Content-Type":
                    "application/x-www-form-urlencoded",
                },
              }
            );

          token =
            response.data.access_token;

          refreshToken =
            response.data.refresh_token;

          /**
           * SAVE NEW TOKENS
           */

          res.cookie(
            "access_token",
            token,
            {
              ...COOKIE_OPTIONS,
              maxAge:
                Number(
                  process.env
                    .ACCESS_COOKIE_EXPIRE_TIME
                ) * 1000,
            }
          );

          res.cookie(
            "refresh_token",
            refreshToken,
            {
              ...COOKIE_OPTIONS,
              maxAge:
                Number(
                  process.env
                    .REFRESH_COOKIE_EXPIRE_TIME
                ) * 1000,
            }
          );

          decoded = jwt.verify(
            token,
            PUBLIC_KEY,
            {
              algorithms: ["RS256"],
            }
          );

        } catch (refreshErr) {

          console.error(
            "Refresh Token Error:",
            refreshErr
              ?.response?.data ||
              refreshErr.message
          );

          throw new CustomError(
            "Session expired",
            401
          );
        }
      }

      /**
       * =====================================
       * ROLES
       * =====================================
       */

      const userRoles =
        decoded?.realm_access
          ?.roles || [];

      const userRole =
        ROLE_PRIORITY.find(
          (r) =>
            userRoles.includes(r)
        ) || "guest";

      /**
       * =====================================
       * ROLE AUTHORIZATION
       * =====================================
       */

      if (
        requiredRoles.length > 0 &&
        !requiredRoles.includes(
          userRole
        )
      ) {

        throw new CustomError(
          "Access denied",
          403
        );
      }

      /**
       * =====================================
       * CLINIC ACCESS
       * =====================================
       */

      const userGroups =
        decoded?.groups || [];

      const dentalGroups =
        userGroups.filter(
          (group) =>
            group.startsWith(
              "dental-"
            )
        );

      const clinicAccess = [];

      for (const group of dentalGroups) {

        const match =
          group.match(
            /^dental-(\d+)-(\d+)$/
          );

        if (!match) continue;

        clinicAccess.push({
          tenant_id:
            Number(match[1]),
          clinic_id:
            Number(match[2]),
        });
      }

      /**
       * =====================================
       * TENANT ROLE
       * NO CLINIC VALIDATION
       * =====================================
       */

      let activeTenantId = null;

      if (userRole === "tenant") {

        const tenantGroup =
          userGroups.find((group) =>
            group.startsWith(
              "dental-"
            )
          );

        if (tenantGroup) {

          const match =
            tenantGroup.match(
              /^dental-(\d+)/
            );

          if (match) {

            activeTenantId =
              Number(match[1]);
          }
        }
      }

      /**
       * =====================================
       * NO CLINIC ACCESS
       * =====================================
       */

      if (
        userRole !== "tenant" &&
        clinicAccess.length === 0
      ) {

        throw new CustomError(
          "Clinic access denied",
          403
        );
      }

      /**
       * =====================================
       * DEFAULT ACTIVE CLINIC
       * =====================================
       */

      const activeClinic =
        clinicAccess[0] || null;

      /**
       * =====================================
       * NON TENANT ACTIVE TENANT
       * =====================================
       */

      if (
        userRole !== "tenant"
      ) {

        activeTenantId =
          activeClinic?.tenant_id ||
          null;
      }

      /**
       * =====================================
       * DB USER VALIDATION
       * =====================================
       */

      let dbUser = null;

      /**
       * IMPORTANT:
       * TENANT ROLE SKIPS DB VALIDATION
       */

      if (
        userRole !== "tenant" &&
        userRole !== "guest" &&
        activeClinic
      ) {

        dbUser =
          await getUserByTenantClinicAndKeycloakId(
            userRole,
            activeClinic.tenant_id,
            activeClinic.clinic_id,
            decoded.sub
          );

        if (!dbUser) {

          throw new CustomError(
            "User not found",
            404
          );
        }
      }

      /**
       * =====================================
       * REQUEST CONTEXT
       * =====================================
       */

      req.user = decoded;

      req.role = userRole;

      req.realm = realm;

      req.token = token;

      req.tenant_id =
        activeTenantId;

      req.clinic_id =
        activeClinic?.clinic_id ||
        null;

      req.clinic_access =
        clinicAccess;

      /**
       * IMPORTANT:
       * ALL CLINICS USER BELONGS TO
       */

      req.related_clinic_ids =
        clinicAccess.map(
          (c) => c.clinic_id
        );

      req.dbUser = dbUser;

      return next();

    } catch (err) {

      console.error(
        "Authentication Error:",
        err
      );

      if (
        err instanceof CustomError
      ) {

        return res.status(
          err.statusCode
        ).json({
          status: "error",
          message: err.message,
        });
      }

      return res.status(500).json({
        status: "error",
        message:
          "Authentication failed",
      });
    }
  };
}

async function verifyUserTokenInDB(token) {
  try {
    if (!token) throw new CustomError("Missing token", 401);

    // ✅ Decode token
    const pubKey = `-----BEGIN PUBLIC KEY-----\n${process.env.KEYCLOAK_REALM_PUBLIC_KEY}\n-----END PUBLIC KEY-----`;
    const decoded = jwt.verify(token, pubKey, { algorithms: ["RS256"] });

    const userId = decoded.sub;
    const username = decoded?.preferred_username;
    const userRoles = decoded?.realm_access?.roles || [];

    const ROLE_PRIORITY = [
      "tenant",
      "superuser",
      "dentist",
      "receptionist",
      "patient",
      "supplier",
      "guest",
    ];
    const userRole =
      ROLE_PRIORITY.find((r) => userRoles.includes(r)) || "guest";

    // ✅ ✅ Tenant → SKIP ALL checks and return immediately
    if (userRole === "tenant" || userRole === "guest") {
      return {
        dbUser: {
          userId,
          username,
          role: userRole === "tenant" ? "tenant" : "guest",
        },
        role: userRole === "tenant" ? "tenant" : "guest",
      };
    }

    // ✅ Other roles → normal check
    const userGroups = decoded?.groups || [];
    const dentalGroup = userGroups.find((g) => g.startsWith("dental-"));

    let tenantId = null;
    let clinicId = null;

    if (dentalGroup) {
      const match = dentalGroup.match(/dental-(\d+)-(\d+)/);
      if (match) {
        tenantId = Number(match[1]);
        clinicId = Number(match[2]);
      }
    }

    if (!tenantId || !clinicId) {
      throw new CustomError("tenant_id or clinic_id missing in group", 400);
    }

    const dbUser = await getUserByTenantClinicAndKeycloakId(
      userRole,
      tenantId,
      clinicId,
      userId
    );

    return { dbUser, role: userRole } || null;
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(err.message || "Token validation failed", 500);
  }
}

module.exports = { authenticateTenantClinicGroup, verifyUserTokenInDB };
