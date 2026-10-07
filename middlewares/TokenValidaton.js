const jwksClient = require("jwks-rsa");
const jwt = require("jsonwebtoken");
const axios = require("axios");

// --- Tenant Configuration ---
const tenantsConfig = {
  similecare: {
    jwksUri: "http://localhost:8080/realms/similecare/protocol/openid-connect/certs",
    audience: "react-client",
    issuer: "http://localhost:8080/realms/similecare",
    // clientSecret: "your-client-secret", // Uncomment if needed
  },
  // Add more tenants as needed
};

// --- JWKS Helper ---
function getKeyClient(tenantName) {
  const tenant = tenantsConfig[tenantName];
  if (!tenant) throw new Error(`Unknown tenant: ${tenantName}`);
  return jwksClient({ jwksUri: tenant.jwksUri });
}

// --- Token Verification ---
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

// --- Refresh Access Token ---
async function refreshAccessToken(refreshToken, tenantName) {
  const tenant = tenantsConfig[tenantName];
  if (!tenant) throw new Error("Unknown tenant.");

  try {
    const response = await axios.post(
      `${tenant.issuer}/protocol/openid-connect/token`,
      new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: tenant.audience,
        // client_secret: tenant.clientSecret, // Uncomment if needed
      }),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" }
      }
    );
    if (!response.data.access_token) throw new Error("No access token returned.");
    return response.data.access_token;
  } catch (err) {
    throw new Error(
      "Failed to refresh access token: " +
        (err.response?.data?.error_description || err.message)
    );
  }
}

// --- Decode Token Helper ---
function decodeToken(token) {
  try {
    return jwt.decode(token);
  } catch {
    return null;
  }
}

// --- Middleware ---
async function accessTokenValidMiddleware(req, res, next) {
  // 1. Get token from Authorization header
  const authHeader = req.headers["authorization"];
  let token =
    authHeader && authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "Access token required." });
  }

  // 2. Get tenant name and refresh token from headers
  const tenantName = req.headers["x-tenant-name"];
  const refreshToken = req.headers["x-refresh-token"];
  if (!tenantName) {
    return res.status(400).json({ message: "Tenant name header required." });
  }

  // 3. Check if token is about to expire (within 2 minutes)
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) {
    return res.status(401).json({ message: "Invalid access token." });
  }

  const now = Math.floor(Date.now() / 1000);
  const expiresIn = decoded.exp - now;

  // 4. If token expires in less than 2 minutes, try to refresh
  if (expiresIn < 120) {
    if (!refreshToken) {
      return res.status(401).json({ message: "Refresh token required to renew access token." });
    }
    try {
      token = await refreshAccessToken(refreshToken, tenantName);
      // Optionally, send new token in response header for client to update
      res.setHeader("x-new-access-token", token);
    } catch (err) {
      return res.status(401).json({
        message: "Could not refresh access token.",
        error: err.message,
      });
    }
  }

  // 5. Verify the (possibly new) token
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
