const jwt = require("jsonwebtoken");
const jwksClient = require("jwks-rsa");

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
  return (req, res, next) => {
    if (process.env.KEYCLOAK_POWER === "off") {
      req.user = {
        username: "dev-user",
        realm_access: { roles: requiredRoles },
        groups: ["dev-group"],
      };
      req.realm = req.headers["x-realm"] || "dev-realm";
      req.token = "dev-token";
      return next();
    }

    const token = req.headers.authorization?.split(" ")[1];
    const realm = req.headers["x-realm"];

    if (!token || !realm) {
      return res
        .status(401)
        .json({ message: "Missing token or realm in headers" });
    }

    jwt.verify(
      token,
      (header, callback) => getKey(realm, header, callback),
      { algorithms: ["RS256"] },
      (err, decoded) => {
        if (err) {
          return res
            .status(401)
            .json({ message: "Invalid token", error: err.message });
        }

        const userRoles = decoded?.realm_access?.roles || [];
        const userGroups = decoded?.groups || [];

        // Check required realm roles
        const hasRequiredRole =
          requiredRoles.length === 0 ||
          requiredRoles.some((role) => userRoles.includes(role));
        if (!hasRequiredRole) {
          return res
            .status(403)
            .json({ message: "Access denied: missing required realm role" });
        }

        // Auto-assign tenant/clinic for super-user
        const dentalGroup = userGroups.find((g) => g.startsWith("dental-"));
        let userTenantId = null;
        let userClinicId = null;
        if (dentalGroup) {
          const match = dentalGroup.match(/dental-(\d+)-(\d+)/);
          if (match) {
            userTenantId = Number(match[1]);
            userClinicId = Number(match[2]);

            // If super-user, optionally auto-fill body
            if (userRoles.includes("super-user")) {
              req.body = {
                ...req.body,
                tenant_id: userTenantId,
                clinic_id: userClinicId,
              };
            }
          }
        }

        // --- ONLY skip if user has purely tenant or guest role ---
        const SKIP_ROLES = ["tenant", "guest"];
        const onlySkipRoles = userRoles.length > 0 && userRoles.every(r => SKIP_ROLES.includes(r));

        if (onlySkipRoles || (userRoles.includes('tenant') && userRoles.includes('guest')) ) {
          req.token = token;
          req.user = decoded;
          req.realm = realm;
          return next();
        }

        // --- Tenant/Clinic isolation ---
        const requestedTenantId = Number(
          req.params?.tenant_id || req.query?.tenant_id || req.body?.tenant_id
        );
        const requestedClinicId = Number(
          req.params?.clinic_id || req.query?.clinic_id || req.body?.clinic_id
        );

        if (requestedTenantId && userTenantId && requestedTenantId !== userTenantId) {
          return res
            .status(403)
            .json({ message: "Access denied: cannot access another tenant's data" });
        }

        if (requestedClinicId && userClinicId && requestedClinicId !== userClinicId) {
          return res
            .status(403)
            .json({ message: "Access denied: cannot access another clinic's data" });
        }

        // --- Optional: group membership validation ---
        if (requestedTenantId && requestedClinicId) {
          const groupName = `dental-${requestedTenantId}-${requestedClinicId}`;
          if (!userGroups.includes(groupName)) {
            return res
              .status(403)
              .json({ message: `Access denied: user not in group ${groupName}` });
          }
        }

        req.token = token;
        req.user = decoded;
        req.realm = realm;
        next();
      }
    );
  };
}

module.exports = { authenticateTenantClinicGroup };
