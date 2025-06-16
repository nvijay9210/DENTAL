// src/middleware/tenant-clinic.middleware.js

const jwksClient = require("jwks-rsa");
const jwt = require("jsonwebtoken");

// Define tenants config
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

// 🔐 Combined Middleware Function
async function requireTenantAndClinicAccess(req, res, next) {
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

    // 4. Attach user and tenant info
    req.user = decodedToken;
    req.tenantName = tenantName;

    // 🔁 Skip clinic check for developers
    const userRoles = decodedToken.realm_access?.roles || [];
    const isDeveloper = userRoles.includes("dev");

    if (isDeveloper) {
      return next(); // ✅ Developer gets full access
    }

    // Extract IDs from URL params
    const clinicId = req.params.clinic_id;
    const tenantId = req.params.tenant_id;

    if (!clinicId && !tenantId) {
      return res.status(400).json({ error: "Missing clinic_id or tenant_id" });
    }

    const groups = decodedToken.groups || [];

    // Extract clinic ID from group
    const clinicGroup = groups.find(g => g.startsWith("group-clinic-"));
    const groupMatch = clinicGroup?.match(/group-clinic-(\d+)-admin/);
    const groupClinicId = groupMatch ? groupMatch[1] : null;

    // Derive tenant from realm
    const tokenRealm = decodedToken.iss.split("/").pop(); // similecare
    const realmToTenantMap = { "similecare": "1" };
    const groupTenantId = realmToTenantMap[tokenRealm] || null;

    const hasClinicAccess = clinicId && groupClinicId === clinicId;
    const hasTenantAccess = tenantId && groupTenantId === tenantId;

    if (clinicId && !hasClinicAccess) {
      return res.status(403).json({
        error: `Forbidden: You do not have access to clinic ${clinicId}`
      });
    }

    if (tenantId && !hasTenantAccess) {
      return res.status(403).json({
        error: `Forbidden: You do not have access to tenant ${tenantId}`
      });
    }


    // ✅ All checks passed
    next();
  } catch (err) {
    console.error("Auth/Clinic validation failed:", err.message);
    return res.status(401).json({ error: "Invalid token or access denied" });
  }
}

// Role-based access control
function permit(...allowedRoles) {
  return (req, res, next) => {
    const userRoles = req.user?.realm_access?.roles || [];

    const hasPermission = allowedRoles.some((role) => userRoles.includes(role));

    if (hasPermission) return next();

    return res.status(403).json({
      error: "Forbidden: You do not have permission to access this resource",
    });
  };
}

module.exports = { requireTenantAndClinicAccess, permit };
