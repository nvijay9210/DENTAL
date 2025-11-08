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
      // ✅ DEV MODE SHORTCUT
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

      // ✅ Read tokens & headers
      let token =
        req.cookies?.access_token ||
        // req.headers.accessToken ||
        req.headers["access_token"];
      let refreshToken =
        req.cookies?.refresh_token ||
        // req.body.refreshToken ||
        req.headers["refresh_token"];
      const realm = process.env.KEYCLOAK_REALM || req.headers["x-realm"];
      const clientId = req.cookies?.clientId || req.headers["x-clientid"];

      console.log('CLIENTID:',clientId)

      if (!token || !realm)
        throw new CustomError("Missing token or realm", 401);

      // ✅ Public key for token verification
      const pubKey = `-----BEGIN PUBLIC KEY-----\n${process.env.KEYCLOAK_REALM_PUBLIC_KEY}\n-----END PUBLIC KEY-----`;

      let decoded;

      try {
        // 🔐 Verify token validity
        decoded = jwt.verify(token, pubKey, { algorithms: ["RS256"] });
      } catch (err) {
        // 🚨 Token expired → try refreshing
        if (err.name === "TokenExpiredError" && refreshToken) {
          console.log("Access token expired — refreshing...");

          const tokenUrl = `${process.env.KEYCLOAK_BASE_URL}/realms/${realm}/protocol/openid-connect/token`;

          const data = qs.stringify({
            grant_type: "refresh_token",
            refresh_token: refreshToken,
            client_id: clientId,
            client_secret: process.env.KEYCLOAK_CLIENT_SECRET,
          });

          try {
            const response = await axios.post(tokenUrl, data, {
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
            });

            // 🔁 Replace old tokens with new ones
            const newAccessToken = response.data.access_token;
            const newRefreshToken = response.data.refresh_token;

            // Update cookies
            res.cookie("access_token", newAccessToken, {
              httpOnly: true,
              secure: false,
            });
            res.cookie("refresh_token", newRefreshToken, {
              httpOnly: true,
              secure: false,
            });

            // Update local variables
            token = newAccessToken;
            refreshToken = newRefreshToken;

            // Decode the new token
            decoded = jwt.verify(token, pubKey, { algorithms: ["RS256"] });
            console.log("✅ Token refreshed successfully");
          } catch (refreshErr) {
            console.error(
              "❌ Token refresh failed:",
              refreshErr.response?.data || refreshErr.message
            );
            throw new CustomError("Token expired and refresh failed", 401);
          }
        } else {
          throw err;
        }
      }

      // ✅ Extract user role
      const userRoles = decoded?.realm_access?.roles || [];
      const userRole =
        ROLE_PRIORITY.find((r) => userRoles.includes(r)) || "guest";

      // ✅ Skip DB checks for tenant
      if (userRole === "tenant"  || userRole === "guest") {
        req.user = decoded;
        req.role = userRole;
        req.realm = realm;
        req.clientId = clientId;
        req.token = token;
        return next();
      }

      // ✅ Continue normal flow for other roles
      const userId = decoded.sub;
      const userGroups = decoded?.groups || [];
      const username = decoded?.preferred_username;

      // ✅ Verify user in Keycloak
      const kcUser = await checkUserInKeycloak(token, realm, userId);
      if (!kcUser) throw new CustomError("User not found in Keycloak", 404);

      // ✅ Extract tenant/clinic IDs from group
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

      // ✅ Find user in DB
      const dbUser = await getUserByTenantClinicAndKeycloakId(
        userRole,
        tenantId,
        clinicId,
        userId
      );

      // ✅ Attach user context to request
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
      console.log("err:", err);
      if (err instanceof CustomError) {
        return res.status(err.statusCode).json({ message: err.message });
      }
      return res.status(500).json({
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
        dbUser: { userId, username, role:userRole === "tenant" ? "tenant" : "guest" },
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
