const jwt = require("jsonwebtoken");
const jwksClient = require("jwks-rsa");

function getKeycloakClient(realm) {
  return jwksClient({
    jwksUri: `http://localhost:8080/realms/${realm}/protocol/openid-connect/certs`,
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

function strictDentalGroupAccess(requiredGroup = "dental-1-1", requiredRoles = []) {
  return (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];
    const realm = req.headers["x-realm"];

    if (!token || !realm) {
      return res.status(401).json({ message: "Missing token or realm in headers" });
    }

    jwt.verify(
      token,
      (header, callback) => getKey(realm, header, callback),
      { algorithms: ["RS256"] },
      (err, decoded) => {
        if (err) {
          return res.status(401).json({ message: "Invalid token", error: err.message });
        }

        // Optional: Role check
        if (requiredRoles.length > 0) {
          const realmRoles = decoded?.realm_access?.roles || [];
          const hasRequiredRole = requiredRoles.some((role) => realmRoles.includes(role));
          if (!hasRequiredRole) {
            return res.status(403).json({ message: "Access denied: missing required realm role" });
          }
        }

        // Fetch tenant_id and clinic_id from body, query, or params
        const tenant_id = req.body?.tenant_id || req.query?.tenant_id || req.params?.tenant_id;
        const clinic_id = req.body?.clinic_id || req.query?.clinic_id || req.params?.clinic_id;

        if (!tenant_id || !clinic_id) {
          return res.status(400).json({ message: "Missing tenant_id or clinic_id" });
        }

        // Construct group name
        const groupName = `dental-${tenant_id}-${clinic_id}`;
        const userGroups = decoded.groups || [];

        // Strict check: must match requiredGroup and be in user's groups
        if (groupName !== requiredGroup || !userGroups.includes(requiredGroup)) {
          return res.status(403).json({
            message: `Access denied: only allowed for group '${requiredGroup}'`
          });
        }

        req.user = decoded;
        req.realm = realm;
        next();
      }
    );
  };
}

module.exports = { strictDentalGroupAccess };
