const logger = require("../logs/logger");
const jwt = require("jsonwebtoken");
const jwksClient = require("jwks-rsa");
const { CustomError } = require("../middlewares/CustomeError");

function getKeycloakClient(realm) {
  return jwksClient({
    jwksUri: `${process.env.KEYCLOAK_BASE_URL}/realms/${realm}/protocol/openid-connect/certs`,
  });
}

function getKey(realm, header, callback) {
  const client = getKeycloakClient(realm);
  client.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
}

function authenticateTenantClinicGroup(requiredRoles = []) {
  const ROLE_PRIORITY = ["tenant", "super-user", "dentist", "receptionist", "patient", "guest"];

  return async (req, res, next) => {
    try {
      if (process.env.KEYCLOAK_POWER === "off") {
        req.user = {
          username: "dev-user",
          realm_access: { roles: requiredRoles },
          groups: ["dev-group"],
        };
        req.realm = req.headers["x-realm"] || "dev-realm";
        req.token = "dev-token";
        req.role = ROLE_PRIORITY.find((r) => requiredRoles.includes(r)) || "guest";

        logger.writeLog("info", `Dev mode login: ${req.user.username}`, `${req.method} ${req.originalUrl}`);
        return next();
      }

      const token = req.headers.authorization?.split(" ")[1];
      const realm = process.env.KEYCLOAK_REALM || req.headers["x-realm"];

      if (!token || !realm) {
        throw new CustomError("Missing token or realm in headers", 401);
      }

      const decoded = await new Promise((resolve, reject) => {
        jwt.verify(
          token,
          (header, callback) => getKey(realm, header, callback),
          { algorithms: ["RS256"] },
          (err, decodedToken) => {
            if (err) return reject(err);
            resolve(decodedToken);
          }
        );
      });

      const userRoles = decoded?.realm_access?.roles || [];
      const userGroups = decoded?.groups || [];
      req.role = ROLE_PRIORITY.find((r) => userRoles.includes(r)) || "guest";

      const hasRequiredRole =
        requiredRoles.length === 0 || requiredRoles.some((role) => userRoles.includes(role));

      if (!hasRequiredRole) {
        throw new CustomError("Access denied: missing required realm role", 403);
      }

      const SKIP_ROLES = ["tenant", "guest"];
      const onlySkipRoles =
        userRoles.length > 0 && userRoles.every((r) => SKIP_ROLES.includes(r));

      if (onlySkipRoles) {
        // Skip tenant/clinic isolation and group validation completely
        req.token = token;
        req.user = decoded;
        req.realm = realm;

        logger.writeLog("info", `Tenant/guest login as ${req.role} (skipped group validation)`, `${req.method} ${req.originalUrl}`);
        return next();
      }

      // Proceed with group validation and tenant/clinic isolation
      const dentalGroup = userGroups.find((g) => g.startsWith("dental-"));
      let userTenantId = null;
      let userClinicId = null;

      if (dentalGroup) {
        const match = dentalGroup.match(/dental-(\d+)-(\d+)/);
        if (match) {
          userTenantId = Number(match[1]);
          userClinicId = Number(match[2]);

          if (userRoles.includes("super-user")) {
            req.body = {
              ...req.body,
              tenant_id: userTenantId,
              clinic_id: userClinicId,
            };
          }
        }
      }

      const requestedTenantId = Number(req.params?.tenant_id || req.query?.tenant_id || req.body?.tenant_id);
      const requestedClinicId = Number(req.params?.clinic_id || req.query?.clinic_id || req.body?.clinic_id);

      if (requestedTenantId && userTenantId && requestedTenantId !== userTenantId) {
        throw new CustomError("Access denied: cannot access another tenant's data", 403);
      }

      if (requestedClinicId && userClinicId && requestedClinicId !== userClinicId) {
        throw new CustomError("Access denied: cannot access another clinic's data", 403);
      }

      if (requestedTenantId && requestedClinicId && !(userRoles.includes("tenant") || userRoles.includes("guest"))) {
        const groupName = `dental-${requestedTenantId}-${requestedClinicId}`;
        if (!userGroups.includes(groupName)) {
          throw new CustomError(`Access denied: user not in group ${groupName}`, 403);
        }
      }

      req.token = token;
      req.user = decoded;
      req.realm = realm;

      logger.writeLog("info", `Authentication successful as ${req.role}`, `${req.method} ${req.originalUrl}`);
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
