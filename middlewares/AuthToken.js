const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const jwksClient = require("jwks-rsa");

// Tenant config: map tenantId to Keycloak realm info
const tenantsConfig = {
  similecare: {
    jwksUri:
      "http://localhost:8080/realms/similecare/protocol/openid-connect/certs",
    audience: "react-client",
    issuer: "http://localhost:8080/realms/similecare",
  },
  // Add more tenants as needed
};

function getKeyClient(tenantId) {
  const tenant = tenantsConfig[tenantId];
  // console.log(tenant)
  if (!tenant) throw new Error("Unknown tenant");

  return jwksClient({
    jwksUri: tenant.jwksUri,
  });
}

async function verifyTokenForTenant(token, tenantId) {
  const tenant = tenantsConfig[tenantId];
  // console.log(token,tenantId)
  if (!tenant) throw new Error("Unknown tenant");

  const client = getKeyClient(tenantId);

  function getKey(header, callback) {
    client.getSigningKey(header.kid, function (err, key) {
      if (err) return callback(err);
      const signingKey = key.getPublicKey();
      callback(null, signingKey);
    });
  }

  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      getKey,
      {
        algorithms: ["RS256"],
        audience: tenant.audience,
        issuer: tenant.issuer,
      },
      (err, decoded) => {
        if (err) {
          console.log(err);
          return reject(err);
        }
        resolve(decoded);
      }
    );
  });
}

// Role-based access control
function permit(...allowedRoles) {
  return (req, res, next) => {
    const userRoles = req.user?.realm_access?.roles || [];

    const hasPermission = allowedRoles.some((role) => userRoles.includes(role));

    if (hasPermission) {
      return next();
    }

    return res
      .status(403)
      .json({
        error: "Forbidden: You do not have permission to access this resource",
      });
  };
}

// Combined Auth + RBAC Middleware
async function multiTenantAuthMiddleware(req, res, next) {
  try {
    const token = req.cookies["access_token"];
    // console.log(token)
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    const tenantId = req.headers["x-tenant-id"];
    if (!tenantId)
      return res.status(400).json({ error: "Tenant ID header required" });


    const decodedToken = await verifyTokenForTenant(token, tenantId);


    req.user = decodedToken;
    req.tenantId = tenantId;

    next();
  } catch (err) {
    console.log(err);
    return res.status(401).json({ error: "Invalid token or tenant" });
  }
}

module.exports = {
  multiTenantAuthMiddleware,
  permit,
};
