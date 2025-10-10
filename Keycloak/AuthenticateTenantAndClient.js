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
    throw new CustomError("Failed to verify user in Keycloak", 500);
  }
}

function authenticateTenantClinicGroup(requiredRoles = []) {
  const ROLE_PRIORITY = ["tenant", "superuser", "dentist", "receptionist", "patient", "guest"];

  return async (req, res, next) => {
    try {
      // ====== DEV MODE SHORTCUT ======
      if (process.env.KEYCLOAK_POWER === "off") {
        req.user = {
          username: "dev-user",
          realm_access: { roles: requiredRoles },
          groups: ["dental-1-1"],
        };
        req.realm = process.env.KEYCLOAK_REALM;
        req.token = "dev-token";
        req.role = ROLE_PRIORITY.find((r) => requiredRoles.includes(r)) || "guest";
        return next();
      }

      // ====== READ TOKEN & REALM ======
      const token = req.cookies?.access_token|| req.body.accessToken || req.headers["access_token"] ;
      const realm = process.env.KEYCLOAK_REALM || req.headers["x-realm"] || process.env.KEYCLOAK_REALM;
      const clientId = req.headers["x-clientid"];

      if (!token || !realm) throw new CustomError("Missing token or realm", 401);

      // ====== VERIFY USING REALM PUBLIC KEY ======
      const pubKey = `-----BEGIN PUBLIC KEY-----\n${process.env.KEYCLOAK_REALM_PUBLIC_KEY}\n-----END PUBLIC KEY-----`;

      const decoded = jwt.verify(token, pubKey, { algorithms: ["RS256"] });

      const userId = decoded.sub;
      const userRoles = decoded?.realm_access?.roles || [];
      const userGroups = decoded?.groups || [];
      const username = decoded?.preferred_username;
      const userRole = ROLE_PRIORITY.find((r) => userRoles.includes(r)) || "guest";

      // ====== TENANT ROLE SKIP ======
      if (userRole === "tenant") {
        req.user = decoded;
        req.role = userRole;
        req.realm = realm;
        req.clientId = clientId;
        req.token = token;
        return next();
      }

      // ====== CHECK USER IN KEYCLOAK ======
      const kcUser = await checkUserInKeycloak(token, realm, userId);
      if (!kcUser) throw new CustomError("User not found in Keycloak", 404);

      // ====== PARSE TENANT / CLINIC FROM GROUPS ======
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

      if (!tenantId) throw new CustomError("Missing tenant_id in group", 400);
      if (!clinicId) throw new CustomError("Missing clinic_id in group", 400);

      // ====== CHECK USER IN DATABASE ======
      const dbUser = await getUserByTenantClinicAndKeycloakId(userRole, tenantId, clinicId, userId);
      if (!dbUser)
        throw new CustomError(`User not found in database (${userRole} table)`, 404);

      // ====== SET CONTEXT ======
      req.user = decoded;
      req.role = userRole;
      req.realm = realm;
      req.clientId = clientId;
      req.token = token;
      req.tenant_id = tenantId;
      req.clinic_id = clinicId;
      req.dbUser = dbUser;

      logger.writeLog(
        "info",
        `✅ Authenticated ${username} (${userRole})`,
        `${req.method} ${req.originalUrl}`
      );

      next();
    } catch (err) {
      if (err instanceof CustomError) {
        logger.writeLog("warn", err.message, `${req.method} ${req.originalUrl}`);
        return res.status(err.statusCode).json({ message: err.message });
      }

      logger.writeLog("error", err, `${req.method} ${req.originalUrl}`);
      return res.status(500).json({
        status: "error",
        message: "Authentication failed",
        error: err.message,
      });
    }
  };
}

module.exports = { authenticateTenantClinicGroup };
