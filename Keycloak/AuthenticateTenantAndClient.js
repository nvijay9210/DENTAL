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

// Middleware: skips group validation if user has 'tenant' role
function authenticateTenantClinicGroup(requiredRoles = []) {
  return (req, res, next) => {
    // if (process.env.NODE_ENV === "development") {
    //   req.user = {
    //     username: "dev-user",
    //     realm_access: { roles: requiredRoles },
    //     groups: ["dev-group"],
    //   };
    //   req.realm = req.headers["x-realm"] || "dev-realm";
    //   req.token = "dev-token";
    //   return next();
    // }
    if (process.env.KEYCLOAK_POWER === 'off') {
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

        // Role check
        const realmRoles = decoded?.realm_access?.roles || [];
        const hasRequiredRole =
          requiredRoles.length === 0 ||
          requiredRoles.some((role) => realmRoles.includes(role));
        if (!hasRequiredRole) {
          return res
            .status(403)
            .json({ message: "Access denied: missing required realm role" });
        }

        // If user has 'tenant' role, skip group validation
        if (realmRoles.includes("tenant")) {
          req.token = token;
          req.user = decoded;
          req.realm = realm;
          return next();
        }

        // Fetch tenant_id and clinic_id from body, query, or params (optional)
        const tenant_id =
          req.body?.tenant_id || req.query?.tenant_id || req.params?.tenant_id;
        const clinic_id =
          req.body?.clinic_id || req.query?.clinic_id || req.params?.clinic_id;

        if (tenant_id && clinic_id) {
          // Construct group name and check group membership
          const groupName = `dental-${tenant_id}-${clinic_id}`;
          const userGroups = decoded.groups || [];
          if (!userGroups.includes(groupName)) {
            return res
              .status(403)
              .json({ message: `Access denied: user not in group` });
          }
        }
        // If tenant_id or clinic_id is missing, skip the group check and continue

        req.token = token;
        req.user = decoded;
        req.realm = realm;
        next();
      }
    );
  };
}

module.exports = { authenticateTenantClinicGroup };
