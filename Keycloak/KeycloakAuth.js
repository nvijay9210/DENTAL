const express = require("express");
const axios = require("axios");
const qs = require("querystring");
const { CustomError } = require("../middlewares/CustomeError");
require("dotenv").config();

const router = express.Router();

// ----- CONFIG -----
const KEYCLOAK_BASE_URL = process.env.KEYCLOAK_BASE_URL || "http://localhost:8080";
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || "myrealm";
const CLIENT_ID = process.env.KEYCLOAK_CLIENT_ID || "backend-service";
const CLIENT_SECRET = process.env.KEYCLOAK_CLIENT_SECRET || "super_secret_key";

// ----- ROUTER -----
router.post("/login", async (req, res, next) => {
  const { method = "password", username, password } = req.body;

  try {
    // Step 1: Get token from Keycloak
    const tokenData = await getKeycloakToken({ method, username, password });
    const accessToken = tokenData.access_token;

    // Step 2: Get user info (to extract userId)
    const userInfo = await getUserInfo(accessToken);
    const userId = userInfo.sub;

    // Step 3: Get groups of this user
    const adminTokenResponse = await getKeycloakToken({ method: "client_credentials" });
    const adminAccessToken = adminTokenResponse.access_token;
    const groups = await getUserGroups(adminAccessToken, userId);

    // Step 4: Extract tenant_id and clinic_id from group names
    // Example group names: "/tenant_101/clinic_55"
    let tenant_id = null;
    let clinic_id = null;

    for (const group of groups) {
      if (group.path.includes("tenant_")) {
        const match = group.path.match(/tenant_(\d+)/);
        if (match) tenant_id = match[1];
      }
      if (group.path.includes("clinic_")) {
        const match = group.path.match(/clinic_(\d+)/);
        if (match) clinic_id = match[1];
      }
    }

    // Step 5: Store tokens in HttpOnly cookies
    res.cookie("access_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
      maxAge: tokenData.expires_in * 1000,
    });

    res.cookie("refresh_token", tokenData.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // Step 6: Send final response
    res.status(200).json({
      message: "Login successful",
      user: {
        username: userInfo.preferred_username,
        email: userInfo.email,
        name: userInfo.name,
      },
      tenant_id,
      clinic_id,
      groups: groups.map((g) => g.path),
    });
  } catch (err) {
    console.error("Login error:", err.response?.data || err.message);
    next(
      new CustomError(
        err.response?.data?.error_description || err.message,
        err.response?.status || 401
      )
    );
  }
});

// ----- EXPORT ROUTER -----
module.exports = router;
