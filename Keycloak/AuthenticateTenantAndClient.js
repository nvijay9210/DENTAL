const logger = require("../logs/logger");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const { CustomError } = require("../middlewares/CustomeError");
const { getUserByTenantClinicAndKeycloakId } = require("../utils/Reusability");
const qs = require("querystring");

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

  return async (req, res, next) => {
    try {
      // ===== DEV MODE =====
      if (process.env.KEYCLOAK_POWER === "off") {
        req.user = {
          username: "dev-user",
          realm_access: { roles: requiredRoles },
        };
        req.role =
          ROLE_PRIORITY.find((r) => requiredRoles.includes(r)) || "guest";
        req.realm = process.env.KEYCLOAK_REALM;
        req.token = "dev-token";
        return next();
      }

      // ===== Read tokens & headers =====
      let token = req.cookies?.access_token || req.headers["access_token"];
      let refreshToken =
        req.cookies?.refresh_token || req.headers["refresh_token"];
      const realm = process.env.KEYCLOAK_REALM || req.headers["x-realm"];
      const clientId = req.cookies?.clientId || req.headers["x-clientid"];

      if (!token || !realm) {
        throw new CustomError("Missing token or realm", 401);
      }

      const pubKey = `-----BEGIN PUBLIC KEY-----\n${process.env.KEYCLOAK_REALM_PUBLIC_KEY}\n-----END PUBLIC KEY-----`;
      let decoded;

      // ===== Verify token =====
      try {
        decoded = jwt.verify(token, pubKey, { algorithms: ["RS256"] });
      } catch (err) {
        // ===== Token expired: refresh it =====
        if (err.name === "TokenExpiredError" && refreshToken) {
          const tokenUrl = `${process.env.KEYCLOAK_BASE_URL}/realms/${realm}/protocol/openid-connect/token`;
          const data = qs.stringify({
            grant_type: "refresh_token",
            refresh_token: refreshToken,
            client_id: clientId, // public client → no client_secret
          });

          try {
            const response = await axios.post(tokenUrl, data, {
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
            });

            token = response.data.access_token;
            refreshToken = response.data.refresh_token;

            const isProduction = process.env.NODE_ENV === "production";
            const cookieOptions = {
              httpOnly: true,
              secure: isProduction,
              sameSite: isProduction ? "None" : "Lax",
            };

            // Set cookies with Keycloak expiry
            res.cookie("access_token", token, {
              ...cookieOptions,
              // maxAge: response.data.expires_in * 1000,
            });
            res.cookie("refresh_token", refreshToken, {
              ...cookieOptions,
              maxAge: response.data.refresh_expires_in * 1000,
            });
            res.cookie("clientId", clientId, {
              ...cookieOptions,
              maxAge: response.data.refresh_expires_in * 1000,
            });
            res.cookie("realm", realm, {
              ...cookieOptions,
              maxAge: response.data.refresh_expires_in * 1000,
            });

            decoded = jwt.verify(token, pubKey, { algorithms: ["RS256"] });
            console.log("✔ Token refreshed successfully");
          } catch (refreshErr) {
            console.error("❌ Token refresh failed:", refreshErr.message);
            throw new CustomError("Token expired and refresh failed", 401);
          }
        } else {
          throw new CustomError("Invalid token", 401);
        }
      }

      // ===== Extract role =====
      const userRoles = decoded?.realm_access?.roles || [];
      const userRole =
        ROLE_PRIORITY.find((r) => userRoles.includes(r)) || "guest";

      // Tenant & guest → skip DB
      if (userRole === "tenant" || userRole === "guest") {
        req.user = decoded;
        req.role = userRole;
        req.realm = realm;
        req.clientId = clientId;
        req.token = token;
        return next();
      }

      // ===== For other roles =====
      const userId = decoded.sub;
      const userGroups = decoded?.groups || [];

      // Verify user exists in Keycloak
      const kcUser = await checkUserInKeycloak(token, realm, userId);
      if (!kcUser) throw new CustomError("User not found in Keycloak", 404);

      // Extract tenant & clinic IDs
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
      if (!tenantId || !clinicId)
        throw new CustomError("Missing tenant or clinic in group", 400);

      // DB lookup
      const dbUser = await getUserByTenantClinicAndKeycloakId(
        userRole,
        tenantId,
        clinicId,
        userId
      );

      // Attach request context
      req.user = decoded;
      req.role = userRole;
      req.realm = realm;
      req.clientId = clientId;
      req.token = token;
      req.tenant_id = tenantId;
      req.clinic_id = clinicId;
      req.dbUser = dbUser;

      return next();
    } catch (err) {
      console.error("err:", err);
      if (err instanceof CustomError)
        return res.status(err.statusCode).json({ message: err.message });
      return res
        .status(500)
        .json({
          status: "error",
          message: "Authentication failed",
          error: err.message,
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
