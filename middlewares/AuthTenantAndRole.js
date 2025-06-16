const jwksClient = require("jwks-rsa");
const jwt = require("jsonwebtoken");

// Define tenants config
const tenantsConfig = {
  similecare: {
    jwksUri: "http://localhost:8080/realms/similecare/protocol/openid-connect/certs",
    audience: "react-client",
    issuer: "http://localhost:8080/realms/similecare",
  },
  // Add more tenants as needed
};

function getKeyClient(tenantName) {
  const tenant = tenantsConfig[tenantName];
  if (!tenant) throw new Error(`Unknown tenant: ${tenantName}`);
  return jwksClient({ jwksUri: tenant.jwksUri });
}

function verifyTokenForTenant(token, tenantName) {
  const tenant = tenantsConfig[tenantName];
  const client = getKeyClient(tenantName);

  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      (header, callback) => {
        client.getSigningKey(header.kid, (err, key) => {
          if (err) return callback(err);
          callback(null, key.getPublicKey());
        });
      },
      {
        algorithms: ["RS256"],
        audience: tenant.audience,
        issuer: tenant.issuer,
      },
      (err, decoded) => {
        if (err) return reject(err);
        resolve(decoded);
      }
    );
  });
}

// 🔐 Role + Tenant Validation Middleware
function requireTenantAndRole(requiredRole) {
  return async (req, res, next) => {
    try {
      // 1. Get token from header
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) return res.status(401).json({ error: "Unauthorized" });

      // 2. Get tenant name from header
      const tenantName = req.headers["x-tenant-name"];
      if (!tenantName)
        return res.status(400).json({ error: "Tenant name header required" });

      // 3. Verify token for that tenant
      const decodedToken = await verifyTokenForTenant(token, tenantName);

      // 4. Attach user info
      req.user = decodedToken;
      req.tenantName = tenantName;

      // 5. Check if user has required role
      const userRoles = decodedToken.realm_access?.roles || [];
      const hasPermission = userRoles.includes(requiredRole);

      if (!hasPermission) {
        return res.status(403).json({
          error: `Forbidden: You must have the "${requiredRole}" role to perform this action`,
        });
      }

      // ✅ All checks passed
      next();
    } catch (err) {
      console.error("Auth validation failed:", err.message);
      return res.status(401).json({ error: "Invalid token or access denied" });
    }
  };
}

module.exports = { requireTenantAndRole };