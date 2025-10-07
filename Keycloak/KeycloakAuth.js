// authRoute.js
const express = require("express");
const axios = require("axios");
const qs = require("querystring");
const { CustomError } = require("../middlewares/CustomeError");
require("dotenv").config();

const router = express.Router();

// Enable cookies
const cookieOptions = {
  httpOnly: true,       // not accessible from JS
  secure: process.env.NODE_ENV === "production", // true only for HTTPS
  sameSite: "Strict",   // prevents CSRF
  maxAge: 60 * 60 * 1000, // 1 hour
};

// ----- CONFIG -----
const KEYCLOAK_BASE_URL = process.env.KEYCLOAK_BASE_URL || "http://localhost:8080";
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || "myrealm";
const CLIENT_ID = process.env.KEYCLOAK_CLIENT_ID || "backend-service";
const CLIENT_SECRET = process.env.KEYCLOAK_CLIENT_SECRET || "super_secret_key";

// ----- FUNCTION -----
async function getKeycloakToken({ method, username, password }) {
  const tokenUrl = `${KEYCLOAK_BASE_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`;

  let data;
  if (method === "password") {
    if (!username || !password) throw new Error("Username and password required");
    data = {
      grant_type: "password",
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      username,
      password,
    };
  } else if (method === "client_credentials") {
    data = {
      grant_type: "client_credentials",
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    };
  } else {
    throw new Error("Invalid login method");
  }

  const response = await axios.post(tokenUrl, qs.stringify(data), {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  return response.data; // access_token, refresh_token, etc.
}

// ----- ROUTER -----
router.post("/login", async (req, res, next) => {
  const { method, username, password } = req.body;

  try {
    const tokenData = await getKeycloakToken({ method, username, password });

    // Store tokens in HTTP-only cookies
    res.cookie("access_token", tokenData.access_token, cookieOptions);

    if (tokenData.refresh_token) {
      res.cookie("refresh_token", tokenData.refresh_token, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000, // refresh token lasts longer
      });
    }

    return res.status(200).json({
      message: "Login successful",
    });
  } catch (err) {
    console.error("Login error:", err.response?.data || err.message);
    return next(
      new CustomError(
        err.response?.data?.error_description || err.message,
        401
      )
    );
  }
});

module.exports = router;
