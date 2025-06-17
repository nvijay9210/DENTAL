const jwt = require("jsonwebtoken");
const axios = require("axios");

// your tenant config
const tenantsConfig = {
  similecare: {
    jwksUri: "http://localhost:8080/realms/similecare/protocol/openid-connect/certs",
    audience: "react-client",
    issuer: "http://localhost:8080/realms/similecare",
  },
  // Add more tenants here
};

 async function checkAndRefreshToken(req, res) {
  let accessToken = req.cookies.access_token;
  let refreshToken = req.cookies.refresh_token;
  const realm = req.cookies.realm;

  if (!accessToken || !refreshToken || !realm) {
    throw new Error("Missing access_token, refresh_token, or realm");
  }

  const decoded = jwt.decode(accessToken);
  if (!decoded || !decoded.exp) {
    throw new Error("Invalid access token structure");
  }

  const now = Math.floor(Date.now() / 1000);
  const expiresIn = decoded.exp - now;

  // ⏳ If access token expires in less than 2 minutes
  if (expiresIn < 120) {
    console.log("🔄 Token is about to expire in", expiresIn, "sec. Refreshing...");

    const tenant = tenantsConfig[realm];
    const response = await axios.post(
      `${tenant.issuer}/protocol/openid-connect/token`,
      new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: tenant.audience,
      }),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );

    accessToken = response.data.access_token;
    refreshToken = response.data.refresh_token;

    // 🍪 Update cookies
    res.cookie("access_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 15 * 60 * 1000, // 15 mins
    });

    if (refreshToken) {
      res.cookie("refresh_token", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });
    }

    console.log("✅ Token refreshed successfully");
  }

  return accessToken; // Always return final accessToken to use
}

module.export={checkAndRefreshToken}