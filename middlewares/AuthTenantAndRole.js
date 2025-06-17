const jwt = require("jsonwebtoken");
const jwksClient = require("jwks-rsa");
const axios=require('axios')

const tenantsConfig = {
  similecare: {
    jwksUri: "http://localhost:8080/realms/similecare/protocol/openid-connect/certs",
    issuer: "http://localhost:8080/realms/similecare",
    audience: "react-client",
  },
  // Add other realms as needed
};

function getKeyClient(realm) {
  const tenant = tenantsConfig[realm];
  if (!tenant) throw new Error(`Unknown realm: ${realm}`);
  return jwksClient({ jwksUri: tenant.jwksUri });
}

function verifyTokenForRealm(token, realm) {
  return new Promise((resolve, reject) => {
    const tenant = tenantsConfig[realm];
    if (!tenant) return reject(new Error(`Unknown realm: ${realm}`));

    const client = getKeyClient(realm);

    jwt.verify(
      token,
      (header, callback) => {
        client.getSigningKey(header.kid, (err, key) => {
          if (err) return callback(err);
          const publicKey = key.getPublicKey();
          callback(null, publicKey);
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


async function authMiddleware(req, res, next) {
  try {
    const realm = req.cookies.realm || req.headers["x-realm"];
    if (!realm) {
      return res.status(401).json({ message: "Realm not provided" });
    }

    const accessToken = await checkAndRefreshToken(req, res);

    const user = await verifyTokenForRealm(accessToken, realm);
    req.user = user;
    req.realm = realm;

    next();
  } catch (err) {
    console.error("❌ Auth failed:", err.message);
    res.status(401).json({ error: "Unauthorized", detail: err.message });
  }
}

function decodeToken(token) {
  try {
    return jwt.decode(token);
  } catch {
    return null;
  }
}

async function checkAndRefreshToken(req, res) {
  let accessToken =
    req.cookies.access_token ||
    (req.headers.authorization?.startsWith("Bearer ") && req.headers.authorization.slice(7)) ||
    null;

  const refreshToken = req.cookies.refresh_token || req.headers["x-refresh-token"];
  const realm = req.cookies.realm || req.headers["x-realm"];

  if (!accessToken || !realm) throw new Error("Access token or realm not provided");

  const decoded = decodeToken(accessToken);
  if (!decoded || !decoded.exp) throw new Error("Invalid access token");

  const now = Math.floor(Date.now() / 1000);
  const expiresIn = decoded.exp - now;

  if (expiresIn < 120) {
    if (!refreshToken) throw new Error("Refresh token required to renew access token");

    const tenant = tenantsConfig[realm];
    if (!tenant) throw new Error("Unknown realm config");

    try {
      const response = await axios.post(
        tenant.tokenEndpoint,
        new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
          client_id: tenant.audience,
        }),
        {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        }
      );

      const { access_token, refresh_token } = response.data;

      // 🍪 Set new cookies
      res.cookie("access_token", access_token, {
        httpOnly: true,
        sameSite: "Strict",
        secure: process.env.NODE_ENV === "production",
        maxAge: 1000 * 60 * 15,
      });

      if (refresh_token) {
        res.cookie("refresh_token", refresh_token, {
          httpOnly: true,
          sameSite: "Strict",
          secure: process.env.NODE_ENV === "production",
          maxAge: 1000 * 60 * 60 * 24 * 7,
        });
      }

      return access_token;
    } catch (err) {
      console.error("🔁 Token refresh failed:", err.message);
      throw new Error("Failed to refresh token");
    }
  }

  return accessToken;
}

module.exports={authMiddleware}