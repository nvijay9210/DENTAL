// ssoAuth.js
const express = require("express");
const cookieParser = require("cookie-parser");
const qs = require("querystring");
const axios = require("axios");
const { CustomError } = require("../middlewares/CustomeError");
const {
  getKeycloakToken,
  decodeToken,
  extractUserInfo,
} = require("./KeycloakAdmin");
const { getTenantByTenantId } = require("../services/TenantService");
const { getClinicByTenantIdAndClinicId } = require("../services/ClinicService");
const { buildUserContext } = require("../utils/BuildUserContext");
const {
  authenticateTenantClinicGroup,
} = require("./AuthenticateTenantAndClient");

const router = express.Router();
router.use(cookieParser());

router.post(
  "/login",
  authenticateTenantClinicGroup([
    "tenant",
    "superuser",
    "dentist",
    "patient",
    "supplier",
    "receptionist",
  ]),
  async (req, res, next) => {
    try {
      // Inside login route
      const { accessToken, refreshToken } = req.body;
      const userContext = await buildUserContext(accessToken,req.dbUser);

      // Set cookies
      const isProduction = process.env.NODE_ENV === "production";

      res.cookie("access_token", accessToken, {
        httpOnly: true,
        secure: isProduction, // true only for HTTPS
        sameSite: isProduction ? "None" : "Lax", // "None" allows cross-site cookies for HTTPS
        maxAge: 60 * 60 * 1000, // 1 hour
      });

      res.cookie("refresh_token", refreshToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "None" : "Lax",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      // Send context
      res.status(200).json(userContext);
    } catch (err) {
      console.error("Login error:", err.response?.data || err.message);
      throw new CustomError(
        err.response?.data?.error_description || err.message,
        err.response?.status || 401
      );
    }
  }
);

// ---------- REFRESH TOKEN ----------
router.post("/refresh-token", async (req, res, next) => {
  const refreshToken = req.cookies.refresh_token;
  const realm = req.headers["x-realm"];
  const clientid = req.headers["x-clientid"];

  if (!refreshToken)
    return next(new CustomError("No refresh token found", 401));

  try {
    const tokenUrl = `${process.env.KEYCLOAK_BASE_URL}/realms/${realm}/protocol/openid-connect/token`;
    const data = {
      grant_type: "refresh_token",
      client_id: clientid,
      client_secret: process.env.KEYCLOAK_CLIENT_SECRET,
      refresh_token: refreshToken,
    };

    const response = await axios.post(tokenUrl, qs.stringify(data), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    const tokenData = response.data;
    const decodedToken = decodeToken(tokenData.access_token);
    const userInfo = extractUserInfo(decodedToken);

    const tenant = await getTenantByTenantId(userInfo.tenantId);
    let clinic = null;
    if (userInfo.role !== "tenant" && userInfo.clinicId) {
      clinic = await getClinicByTenantIdAndClinicId(
        userInfo.tenantId,
        userInfo.clinicId
      );
    }

    // Update cookies
    res.cookie("access_token", tokenData.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // HTTPS only in prod
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: tokenData.expires_in * 1000,
    });

    res.cookie("refresh_token", tokenData.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const responseData = {
      tenant_name: tenant?.tenant_name,
      tenant_domain: tenant?.tenant_domain,
      tenant_app_logo: tenant?.tenant_app_logo || [],
      tenant_app_themes: tenant?.tenant_app_themes || null,
      tenant_app_font: tenant?.tenant_app_font || null,
      username: userInfo.preferred_username,
      userId: userInfo.userId,
      displayName: userInfo.displayName,
      tenantId: userInfo.tenantId,
      clinicId: userInfo.clinicId,
      role: userInfo.role,
      preferred_username: userInfo.preferred_username,
    };

    if (clinic) {
      responseData.clinic_name = clinic.clinic_name;
      responseData.clinic_app_themes = clinic.clinic_app_themes;
      responseData.clinic_app_font = clinic.clinic_app_font;
      responseData.clinic_logo = clinic.clinic_logo;
    }

    res.status(200).json(responseData);
  } catch (err) {
    console.error("Refresh token error:", err.response?.data || err.message);
    next(
      new CustomError(err.response?.data?.error_description || err.message, 401)
    );
  }
});

// ---------- LOGOUT ----------
router.post("/logout", async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refresh_token;
    const realm = req.headers["x-realm"];
    const clientid = req.headers["x-clientid"];

    // ✅ Step 1: Revoke refresh token in Keycloak (optional but recommended)
    if (refreshToken && realm && clientid) {
      try {
        const tokenUrl = `${process.env.KEYCLOAK_BASE_URL}/realms/${realm}/protocol/openid-connect/logout`;
        
        await axios.post(
          tokenUrl,
          qs.stringify({
            client_id: clientid,
            client_secret: process.env.KEYCLOAK_CLIENT_SECRET,
            refresh_token: refreshToken,
          }),
          { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
        );
      } catch (err) {
        console.warn("Keycloak logout warn:", err.response?.data || err.message);
      }
    }

    // ✅ Step 2: Clear cookies
    const isProduction = process.env.NODE_ENV === "production";

    res.clearCookie("access_token", {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "None" : "Lax",
    });

    res.clearCookie("refresh_token", {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "None" : "Lax",
    });

    // ✅ Step 3: Send response
    return res.status(200).json({
      message: "Logged out successfully",
    });
  } catch (err) {
    console.error("Logout error:", err);
    next(new CustomError("Logout failed", 500));
  }
});


module.exports = router;
