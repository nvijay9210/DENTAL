// Assuming you have tenantsConfig, getKeyClient, and verifyTokenForTenant defined as in your code

const jwksClient = require("jwks-rsa");
const jwt = require("jsonwebtoken");

const tenantsConfig = {
  similecare: {
    jwksUri:
      "http://localhost:8080/realms/similecare/protocol/openid-connect/certs",
    audience: "react-client",
    issuer: "http://localhost:8080/realms/similecare",
  },
  // Add more tenants if needed
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

function accessTokenValidMiddleware(req, res, next) {
  // 1. Get token from Authorization header
  const authHeader = req.headers["authorization"];
  const token =
    authHeader && authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "Access token required." });
  }

  // 2. Get tenant name from custom header
  const tenantName = req.headers["x-tenant-name"];
  if (!tenantName) {
    return res.status(400).json({ message: "Tenant name header required." });
  }

  // 3. Verify token for tenant
  verifyTokenForTenant(token, tenantName)
    .then((decoded) => {
      req.user = decoded;
      req.tenantName = tenantName;
      next();
    })
    .catch((err) => {
      return res.status(401).json({
        message: "Invalid or expired access token.",
        error: err.message,
      });
    });
}

module.exports = { accessTokenValidMiddleware };
