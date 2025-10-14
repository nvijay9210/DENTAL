const logger = require("../logs/logger");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const { CustomError } = require("../middlewares/CustomeError");
const { getUserByTenantClinicAndKeycloakId } = require("../utils/Reusability");

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
  const ROLE_PRIORITY = ["tenant", "superuser", "dentist", "receptionist", "patient", "supplier", "guest"];

  return async (req, res, next) => {
    try {
      // ✅ DEV MODE SHORTCUT
      if (process.env.KEYCLOAK_POWER === "off") {
        req.user = {
          username: "dev-user",
          realm_access: { roles: requiredRoles },
        };
        req.role = ROLE_PRIORITY.find((r) => requiredRoles.includes(r)) || "guest";
        req.realm = process.env.KEYCLOAK_REALM;
        req.token = "dev-token";
        return next();
      }

      // ✅ Read Token
      const token = req.cookies?.access_token || req.body.accessToken || req.headers["access_token"];
      const realm =process.env.KEYCLOAK_REALM || req.headers["x-realm"]
      const clientId = req.headers["x-clientid"];

      if (!token || !realm) throw new CustomError("Missing token or realm", 401);

      // ✅ Decode token
      const pubKey = `-----BEGIN PUBLIC KEY-----\n${process.env.KEYCLOAK_REALM_PUBLIC_KEY}\n-----END PUBLIC KEY-----`;
      const decoded = jwt.verify(token, pubKey, { algorithms: ["RS256"] });

      const userRoles = decoded?.realm_access?.roles || [];
      const userRole = ROLE_PRIORITY.find((r) => userRoles.includes(r)) || "guest";

      // ✅ ✅ SKIP ALL CHECKS IF TENANT
      if (userRole === "tenant") {
        req.user = decoded;
        req.role = userRole;
        req.realm = realm;
        req.clientId = clientId;
        req.token = token;
        return next();
      }

      // ✅ Other roles → Continue normal flow below
      const userId = decoded.sub;
      const userGroups = decoded?.groups || [];
      const username = decoded?.preferred_username;

      // ✅ Check user in Keycloak
      const kcUser = await checkUserInKeycloak(token, realm, userId);
      if (!kcUser) throw new CustomError("User not found in Keycloak", 404);

      // ✅ Parse tenant & clinic from group
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
        throw new CustomError("Missing tenant or clinic in group", 400);
      }

      // ✅ Check user in DB
      const dbUser = await getUserByTenantClinicAndKeycloakId(userRole, tenantId, clinicId, userId);

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
      if (err instanceof CustomError) {
        return res.status(err.statusCode).json({ message: err.message });
      }
      return res.status(500).json({ status: "error", message: "Authentication failed", error: err.message });
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
    const userRole = ROLE_PRIORITY.find((r) => userRoles.includes(r)) || "guest";

    // ✅ ✅ Tenant → SKIP ALL checks and return immediately
    if (userRole === "tenant") {
      return {
        dbUser: { userId, username, role: "tenant" },
        role: "tenant",
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

    const dbUser = await getUserByTenantClinicAndKeycloakId(userRole, tenantId, clinicId, userId);

    return { dbUser, role: userRole } || null;
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(err.message || "Token validation failed", 500);
  }
}



module.exports = { authenticateTenantClinicGroup,verifyUserTokenInDB };
