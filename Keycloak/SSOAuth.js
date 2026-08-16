// ============================================================================
// ssoAuth.js - Dental Application Authentication Module
// Keycloak + Multi-Role User Tables + Clinic-based Architecture
// ✅ UPDATED: Save user context data in cookies
// ============================================================================
const express = require("express");
const cookieParser = require("cookie-parser");
const qs = require("querystring");
const axios = require("axios");
const { v4: uuidv4 } = require("uuid");
const { CustomError } = require("../middlewares/CustomeError");

// ✅ Import from your working KeycloakAdmin.js
const {
  getKeycloakToken,
  decodeToken,
  extractUserInfo,
  keycloakLogin,
  getClientCredential,
  getUserByUsername,
  addUser,
  getUserIdByUsername,
} = require("./KeycloakAdmin");

// ✅ Service imports
const { getTenantByTenantId } = require("../services/TenantService");
const { getClinicByTenantIdAndClinicId } = require("../services/ClinicService");

// ✅ Core utilities from your working files
const { buildUserContext } = require("../utils/BuildUserContext");
const { verifyUserTokenInDB } = require("./AuthenticateTenantAndClient");
const {
  sendOTP,
  verifyOTP,
} = require("../Modules/MailSmsOtp/MailSmsOtpService");
const { getUserByTenantClinicAndKeycloakId } = require("../utils/Reusability");
const {
  generateUsername,
  generateAlphanumericPassword,
} = require("../utils/Helpers");
const { generateAppBAccessToken } = require("../utils/CodeGenerator");
const { getClientInfo } = require("../utils/LoginHistoryInfo");
const loginHistoryService = require("../services/LoginHistoryService");
const globalInvalidationMiddleware = require("../middlewares/GlobalInvalidationMiddleware");
const { getTenantConfigByHost } = require("../utils/TenantConfig");

const router = express.Router();
router.use(cookieParser());

// === DEBUG LOG HELPER ===
const log = (label, message, data = null) => {
  console.log(
    `[KeycloakAuth] ${label}:`,
    message,
    data ? `\nData: ${JSON.stringify(data, null, 2)}` : "",
  );
};

// ============================================================================
// 🍪 COOKIE CONFIGURATION
// ============================================================================
const isProduction = process.env.NODE_ENV === "production";

const COOKIE_OPTIONS = {
  httpOnly: isProduction,
  secure: isProduction,
  sameSite: isProduction ? "None" : "Lax",
  path: "/",
};

const COOKIE_EXPIRY = {
  ACCESS: parseInt(process.env.ACCESS_COOKIE_EXPIRE_TIME || 900) * 1000, // 15 min
  REFRESH: parseInt(process.env.REFRESH_COOKIE_EXPIRE_TIME || 86400) * 1000, // 24 hours
};
const { setCache } = require("../config/redis"); // உங்கள் project path
// ============================================================================
// 🎯 FINALIZE LOGIN - Core function that completes authentication
// ============================================================================
const finalizeLogin = async (req, res) => {
  log("FINALIZE_LOGIN", "Building user context and setting cookies");

  const { host } = req.body;
  const tenantConfig = getTenantConfigByHost(host);
  if (!tenantConfig) return res.status(400).json({ error: "Invalid host" });

  const { realm, clientId } = tenantConfig;

  try {
    const { access_token, refresh_token } = req.tokens;
    const dbUser = req.dbUser;

    const userContext = await buildUserContext(access_token, dbUser);
    const sessionId = uuidv4();

    const sessionData = {
      sessionId,
      accessToken: access_token,
      refreshToken: refresh_token,
      realm,
      clientId,
      userContext,
    };

    await setCache(
      `session:${sessionId}`,
      sessionData,
      COOKIE_EXPIRY.REFRESH / 1000,
    );

    console.log("Saved Session:", sessionId);

    log("TOKEN_SAVE", "Saving tokens and user data in cookies");

    // === 🔐 AUTH TOKENS (short/long expiry) ===
    res.cookie("access_token", access_token, {
      ...COOKIE_OPTIONS,
      maxAge: COOKIE_EXPIRY.ACCESS,
    });
    res.cookie("refresh_token", refresh_token, {
      ...COOKIE_OPTIONS,
      maxAge: COOKIE_EXPIRY.REFRESH,
    });

    // === 🆔 SESSION & CONFIG ===
    res.cookie("clientId", clientId, {
      ...COOKIE_OPTIONS,
      maxAge: COOKIE_EXPIRY.REFRESH,
    });
    res.cookie("realm", realm, {
      ...COOKIE_OPTIONS,
      maxAge: COOKIE_EXPIRY.REFRESH,
    });

    // === 👤 USER CONTEXT DATA (saved for quick frontend access) ===
    res.cookie("user_id", userContext.user_id || null, {
      ...COOKIE_OPTIONS,
      maxAge: COOKIE_EXPIRY.REFRESH,
    });
    res.cookie("keycloak_user_id", userContext.keycloak_user_id || null, {
      ...COOKIE_OPTIONS,
      maxAge: COOKIE_EXPIRY.REFRESH,
    });
    res.cookie("username", userContext.username || null, {
      ...COOKIE_OPTIONS,
      maxAge: COOKIE_EXPIRY.REFRESH,
    });
    res.cookie("role", userContext.role || null, {
      ...COOKIE_OPTIONS,
      maxAge: COOKIE_EXPIRY.REFRESH,
    });
    res.cookie("tenant_id", userContext.tenant_id || null, {
      ...COOKIE_OPTIONS,
      maxAge: COOKIE_EXPIRY.REFRESH,
    });
    res.cookie("clinic_id", userContext.clinic_id || null, {
      ...COOKIE_OPTIONS,
      maxAge: COOKIE_EXPIRY.REFRESH,
    });

    // === 🏥 ROLE-SPECIFIC IDs (dentist_id, patient_id, etc.) ===
    if (userContext.dentist_id) {
      res.cookie("dentist_id", userContext.dentist_id, {
        ...COOKIE_OPTIONS,
        maxAge: COOKIE_EXPIRY.REFRESH,
      });
    }
    if (userContext.patient_id) {
      res.cookie("patient_id", userContext.patient_id, {
        ...COOKIE_OPTIONS,
        maxAge: COOKIE_EXPIRY.REFRESH,
      });
    }
    if (userContext.reception_id) {
      res.cookie("reception_id", userContext.reception_id, {
        ...COOKIE_OPTIONS,
        maxAge: COOKIE_EXPIRY.REFRESH,
      });
    }
    if (userContext.supplier_id) {
      res.cookie("supplier_id", userContext.supplier_id, {
        ...COOKIE_OPTIONS,
        maxAge: COOKIE_EXPIRY.REFRESH,
      });
    }
    if (userContext.superuser_id) {
      res.cookie("superuser_id", userContext.superuser_id, {
        ...COOKIE_OPTIONS,
        maxAge: COOKIE_EXPIRY.REFRESH,
      });
    }

    // === 🎨 TENANT/CLINIC UI SETTINGS ===
    if (userContext.tenant_app_themes) {
      res.cookie("tenant_app_themes", userContext.tenant_app_themes, {
        ...COOKIE_OPTIONS,
        maxAge: COOKIE_EXPIRY.REFRESH,
      });
    }
    if (userContext.clinic_app_themes) {
      res.cookie("clinic_app_themes", userContext.clinic_app_themes, {
        ...COOKIE_OPTIONS,
        maxAge: COOKIE_EXPIRY.REFRESH,
      });
    }

    res.cookie("brighton_session", sessionId, {
      // domain: ".brightoncloudtech.com",
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "None" : "Lax",
      path: "/",
      maxAge: COOKIE_EXPIRY.REFRESH,
    });

    log("FINALIZE_LOGIN", "Login complete — sending user context");
    console.log("USERCONTEXT:", userContext);

    // ✅ CRITICAL: Send response FIRST, before any blocking async ops
    res.status(200).json(userContext);

    // ✅ Now handle logging in background (non-blocking)
    setImmediate(async () => {
      try {
        const clientInfo = await getClientInfo(req);

        const loginData = {
          tenant_id: userContext.tenant_id,
          app_name: "DENTAL",
          keycloak_user_id: userContext.keycloak_user_id,
          session_id: uuidv4(),
          login_time: new Date(),
          ip_address: clientInfo.ip,
          device_info: clientInfo.device,
          browser_info: clientInfo.browser,
        };

        await loginHistoryService.createLoginHistory(loginData);
        log("LOGIN_HISTORY", "✅ History logged successfully");
      } catch (err) {
        log("LOGIN_HISTORY", "⚠️ Background logging failed", err.message);
      }
    });

    return;
  } catch (err) {
    log("FINALIZE_LOGIN", "Finalize failed", { error: err.message });

    if (!res.headersSent) {
      return res
        .status(401)
        .json({ message: err.message || "Login finalization failed" });
    }
  }
};

// ============================================================================
// 🚦 ROUTE HANDLERS
// ============================================================================

// --- POST /assets ---
router.post("/assets", async (req, res) => {
  const userToken = req.cookies.access_token;
  const userRefreshToken = req.cookies.refresh_token;
  const { user } = req.body;

  const ssoToken = await generateAppBAccessToken({
    user,
    token: userToken,
    refreshToken: userRefreshToken,
    realm: req.cookies.realm,
    clientid: req.cookies.clientId,
  });

  res.status(200).send({ data: ssoToken });
});

// --- POST /tokensave ---
router.post("/tokensave", (req, res) => {
  try {
    const {
      access_token,
      refresh_token,
      access_expires_in,
      refresh_expires_in,
    } = req.body;

    if (!access_token || !refresh_token) {
      return res.status(400).json({
        success: false,
        message: "Missing tokens in request body",
      });
    }

    const baseOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "None" : "Lax",
      path: "/",
    };

    const accessExpiry = (access_expires_in || 15 * 60) * 1000;
    const refreshExpiry = (refresh_expires_in || 7 * 24 * 60 * 60) * 1000;

    res.cookie("access_token", access_token, {
      ...baseOptions,
      maxAge: accessExpiry,
    });

    res.cookie("refresh_token", refresh_token, {
      ...baseOptions,
      maxAge: refreshExpiry,
    });

    return res.status(200).json({
      success: true,
      message: "Tokens saved in cookies successfully",
      expires_in: {
        access: access_expires_in || 900,
        refresh: refresh_expires_in || 604800,
      },
    });
  } catch (error) {
    console.error("Error saving tokens:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ============================================================================
// 🔐 MAIN LOGIN ROUTE
// ============================================================================
router.post("/login", async (req, res) => {
  log("LOGIN_FLOW", "🚀 Starting login flow", { body: req.body });

  try {
    let { username, password, host, otp } = req.body;
    username = username?.toLowerCase();

    if (!username) {
      return res.status(400).json({ message: "Username is required" });
    }

    if (!req.session) req.session = {};
    if (!req.session.temploginstore) req.session.temploginstore = {};

    const { realm, clientId } = getTenantConfigByHost(host);

    // === OTP Verification Step ===
    if (otp) {
      log("OTP_VERIFY", "Verifying OTP", { username });

      const record = req.session.temploginstore[username];
      if (!record) {
        log("OTP_VERIFY", "❌ No pending login session");
        return res
          .status(400)
          .json({ message: "No login session found. Please login again." });
      }

      const verifyOtpData = {
        to: username,
        otp,
        username,
        session: req.session,
      };

      const otpResult = verifyOTP(verifyOtpData);
      if (!otpResult.success) {
        log("OTP_VERIFY", "❌ Invalid OTP", { reason: otpResult.message });
        return res.status(400).json({ message: otpResult.message });
      }

      log("OTP_VERIFY", "✅ OTP valid — using stored session");

      req.tokens = record.tokens;
      req.dbUser = record.dbUser;
      delete req.session.temploginstore[username];

      return finalizeLogin(req, res);
    }

    // === Initial Credential Check ===
    if (!password) {
      log("LOGIN_FLOW", "❌ Missing password");
      return res
        .status(400)
        .json({ message: "Username and password required" });
    }

    // === Keycloak Authentication ===
    log("KEYCLOAK_AUTH", "Authenticating with Keycloak", {
      username,
      realm,
      clientId,
    });

    const tokens = await keycloakLogin(username, password, realm, clientId);
    log("KEYCLOAK_AUTH", "✅ Keycloak authentication successful");

    // === Verify Token in Database ===
    const dbUser = await verifyUserTokenInDB(tokens.access_token);
    console.log(dbUser);
    log("DB_VERIFY", "Database verification completed", {
      role: dbUser?.role,
      userId: dbUser?.dbUser?.user_id,
    });

    // === Bypass OTP for tenant/guest ===
    if (dbUser.role === "tenant" || dbUser.role === "guest") {
      log("TENANT_BYPASS", "Tenant/Guest user — skipping OTP");
      req.tokens = tokens;
      req.dbUser = dbUser;
      return finalizeLogin(req, res);
    }

    // === Check Clinic OTP Settings ===
    console.log(
      "dbUser-tenant-clinic:",
      dbUser.dbUser?.tenant_id,
      dbUser.dbUser?.clinic_id,
    );

    const clinic = await getClinicByTenantIdAndClinicId(
      dbUser.dbUser?.tenant_id,
      dbUser.dbUser?.clinic_id,
    );

    if (!clinic || clinic.otp === 0) {
      log("CLINIC_OTP_CHECK", "OTP disabled for clinic — completing login");
      req.tokens = tokens;
      req.dbUser = dbUser;
      return finalizeLogin(req, res);
    }

    // === Send OTP ===
    const user2 = await getUserByTenantClinicAndKeycloakId(
      dbUser.role,
      dbUser.dbUser?.tenant_id,
      dbUser.dbUser?.clinic_id,
      dbUser.dbUser?.keycloak_id,
    );

    const via = clinic.otp_type || "email";
    const key = via === "email" ? user2?.email : `+${user2?.phone_number}`;

    if (!key) {
      return res
        .status(400)
        .json({ message: "No contact method found for OTP" });
    }

    const payload = {
      to: key,
      via,
      message: "Your Dental App Verification OTP",
      subject: "OTP Verification",
      username,
      session: req.session,
    };

    const otpResult = await sendOTP(payload);

    req.session.temploginstore[username] = { tokens, dbUser };

    log("OTP_SEND", "✅ OTP sent", { to: key, via });

    return res.status(200).json({
      message: "OTP sent successfully",
      step: "otp",
      to: key,
      via: via,
      otpDetails:
        process.env.NODE_ENV === "development" ? otpResult : undefined,
    });
  } catch (err) {
    log("LOGIN_FLOW", "❌ Login failed", {
      message: err.message,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });

    return res.status(401).json({
      message: err.message || "Invalid credentials",
      error: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
  }
});

// ============================================================================
// 🔄 REFRESH TOKEN ROUTE
// ============================================================================
router.post("/refresh-token", async (req, res, next) => {
  log("REFRESH_TOKEN", "Refreshing access token");

  const refreshToken = req.cookies.refresh_token;
  const realm = req.headers["x-realm"] || req.cookies.realm;
  const clientid = req.headers["x-clientid"] || req.cookies.clientId;

  if (!refreshToken) {
    log("REFRESH_TOKEN", "❌ No refresh token in cookies");
    return next(new CustomError("No refresh token found", 401));
  }

  if (!realm || !clientid) {
    return next(new CustomError("Missing realm or clientId", 400));
  }

  try {
    const tokenUrl = `${process.env.KEYCLOAK_BASE_URL}/realms/${realm}/protocol/openid-connect/token`;
    const data = {
      grant_type: "refresh_token",
      client_id: clientid,
      client_secret: getClientCredential(clientid),
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
    if (
      userInfo.role !== "tenant" &&
      userInfo.role !== "guest" &&
      userInfo.clinicId
    ) {
      clinic = await getClinicByTenantIdAndClinicId(
        userInfo.tenantId,
        userInfo.clinicId,
      );
    }

    // ✅ Update auth token cookies
    res.cookie("access_token", tokenData.access_token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      maxAge: tokenData.expires_in * 1000,
    });

    res.cookie("refresh_token", tokenData.refresh_token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      maxAge: COOKIE_EXPIRY.REFRESH,
    });

    // ✅ Also update user context cookies if they changed
    if (userInfo.userId) {
      res.cookie("keycloak_user_id", userInfo.userId, {
        ...COOKIE_OPTIONS,
        maxAge: COOKIE_EXPIRY.REFRESH,
      });
    }
    if (userInfo.preferred_username) {
      res.cookie("username", userInfo.preferred_username, {
        ...COOKIE_OPTIONS,
        maxAge: COOKIE_EXPIRY.REFRESH,
      });
    }
    if (userInfo.role) {
      res.cookie("role", userInfo.role, {
        ...COOKIE_OPTIONS,
        maxAge: COOKIE_EXPIRY.REFRESH,
      });
    }
    if (userInfo.tenantId) {
      res.cookie("tenant_id", userInfo.tenantId, {
        ...COOKIE_OPTIONS,
        maxAge: COOKIE_EXPIRY.REFRESH,
      });
    }
    if (userInfo.clinicId) {
      res.cookie("clinic_id", userInfo.clinicId, {
        ...COOKIE_OPTIONS,
        maxAge: COOKIE_EXPIRY.REFRESH,
      });
    }

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

    log("REFRESH_TOKEN", "✅ Token refreshed successfully");
    res.status(200).json(responseData);
  } catch (err) {
    log("REFRESH_TOKEN", "💥 Refresh failed", {
      error: err.response?.data || err.message,
    });
    next(
      new CustomError(
        err.response?.data?.error_description || err.message,
        401,
      ),
    );
  }
});

// ============================================================================
// 🚪 LOGOUT ROUTE - Clear ALL cookies
// ============================================================================
// ============================================================================
// 🚪 LOGOUT ROUTE - Update Login History + Clear Redis + Clear Cookies
// ============================================================================
router.post("/logout", globalInvalidationMiddleware, async (req, res) => {
  log("LOGOUT", "Initiating logout");

  try {
    /**
     * =========================================
     * CAPTURE USER DATA BEFORE CLEARING COOKIES
     * =========================================
     */

    const keycloakUserId = req.cookies?.keycloak_user_id;

    const sessionId = req.cookies?.session_id;

    const tenantId = req.cookies?.tenant_id;

    const username = req.cookies?.username;

    log("LOGOUT", "Captured logout context", {
      keycloakUserId,
      sessionId,
      tenantId,
      username,
    });

    /**
     * =========================================
     * UPDATE LOGIN HISTORY
     * =========================================
     */

    if (keycloakUserId && tenantId) {
      setImmediate(async () => {
        try {
          const loginRecord =
            await loginHistoryService.getLoginHistoryByTenantAndKeycloakUserId(
              tenantId,
              keycloakUserId,
            );

          if (loginRecord && !loginRecord.logout_time) {
            await loginHistoryService.updateLoginHistoryLogout(
              loginRecord.login_history_id,
              loginRecord.tenant_id,
              loginRecord.keycloak_user_id,
              loginRecord.session_id,
            );

            log("LOGOUT", "✅ Login history updated", {
              loginHistoryId: loginRecord.login_history_id,
            });
          }
        } catch (err) {
          log("LOGOUT", "⚠️ Login history update failed", err.message);
        }
      });
    }

    /**
     * =========================================
     * CLEAR USER REDIS KEYS
     * =========================================
     */

    if (keycloakUserId || sessionId) {
      setImmediate(async () => {
        try {
          const { redisClient } = require("../config/redis");

          const keysToDelete = [];

          /**
           * =====================================
           * SESSION KEYS
           * =====================================
           */

          if (sessionId) {
            keysToDelete.push(`session:${sessionId}`);

            keysToDelete.push(`api_count:${sessionId}`);

            keysToDelete.push(`refresh_token:${sessionId}`);
          }

          /**
           * =====================================
           * USER KEYS
           * =====================================
           */

          if (keycloakUserId) {
            keysToDelete.push(`user_session:${keycloakUserId}`);

            keysToDelete.push(`user_permissions:${keycloakUserId}`);

            keysToDelete.push(`user_profile:${keycloakUserId}`);
          }

          /**
           * =====================================
           * OTP KEYS
           * =====================================
           */

          if (username) {
            keysToDelete.push(`otp:${username}`);
          }

          /**
           * =====================================
           * REMOVE EMPTY VALUES
           * =====================================
           */

          const validKeys = keysToDelete.filter(Boolean);

          /**
           * =====================================
           * DELETE REDIS KEYS
           * =====================================
           */

          if (validKeys.length > 0) {
            const deletedCount = await redisClient.del(...validKeys);

            log("LOGOUT", "✅ Redis keys deleted", {
              deletedCount,
              keys: validKeys,
            });
          }
        } catch (err) {
          log("LOGOUT", "⚠️ Redis cleanup failed", err.message);
        }
      });
    }

    /**
     * =========================================
     * CLEAR COOKIES
     * =========================================
     */

    const clearOpts = {
      ...COOKIE_OPTIONS,
      path: "/",
    };

    const cookiesToClear = [
      // AUTH
      "access_token",
      "refresh_token",

      // USER
      "user_id",
      "keycloak_user_id",
      "username",
      "role",

      // TENANT / CLINIC
      "tenant_id",
      "clinic_id",

      // ROLE IDS
      "dentist_id",
      "patient_id",
      "reception_id",
      "supplier_id",
      "superuser_id",

      // SESSION
      "session_id",

      // UI
      "tenant_app_themes",
      "clinic_app_themes",

      // ACTIVE CLINIC
      "active_clinic_id",
    ];

    cookiesToClear.forEach((cookieName) => {
      res.clearCookie(cookieName, clearOpts);
    });

    log("LOGOUT", "✅ Cookies cleared");

    /**
     * =========================================
     * SUCCESS RESPONSE
     * =========================================
     */

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
      data: {
        username,
        logout_time: new Date().toISOString(),
      },
    });
  } catch (err) {
    log("LOGOUT", "💥 Logout failed", err.message);

    /**
     * =========================================
     * FAILSAFE COOKIE CLEAR
     * =========================================
     */

    try {
      const clearOpts = {
        ...COOKIE_OPTIONS,
        path: "/",
      };

      ["access_token", "refresh_token", "session_id"].forEach((cookieName) => {
        res.clearCookie(cookieName, clearOpts);
      });
    } catch (cookieErr) {
      log("LOGOUT", "⚠️ Cookie cleanup failed", cookieErr.message);
    }

    return res.status(500).json({
      success: false,
      message: "Error during logout",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});

// ============================================================================
// 🔐 FORGOT PASSWORD ROUTE
// ============================================================================
router.post("/forgettenpassword", async (req, res, next) => {
  log("FORGOT_PASSWORD", "Forgot password request", req.body);

  try {
    const { username, host } = req.body;

    if (!username) {
      return res.status(400).json({ message: "Username is required" });
    }

    if (!req.session) req.session = {};
    if (!req.session.forgotPasswordStore) req.session.forgotPasswordStore = {};

    const HOST_REALM_CLIENT = JSON.parse(process.env.HOST_REALM_CLIENT);
    const tenantConfig = HOST_REALM_CLIENT[host];
    if (!tenantConfig) return res.status(400).json({ error: "Invalid host" });

    const { realm, clientId } = tenantConfig;

    const tokenRes = await keycloakLogin(
      process.env.VIEW_USER_USERNAME,
      process.env.VIEW_USER_PASS,
      realm,
      clientId,
    );
    const adminToken = tokenRes.access_token;

    const user = await getUserByUsername(adminToken, realm, username);
    if (!user) {
      log("FORGOT_PASSWORD", "❌ User not found");
      return res.status(404).json({ message: "User not found" });
    }

    const clinic = await getClinicByTenantIdAndClinicId(
      user?.attributes?.tenant_id?.[0],
      user?.attributes?.clinic_id?.[0],
    );

    if (!clinic) {
      log("FORGOT_PASSWORD", "❌ Clinic not found");
      return res.status(404).json({ message: "Clinic not found" });
    }

    if (!clinic.otp) {
      log("FORGOT_PASSWORD", "💥 OTP option is not enabled for this clinic");
      return res.status(400).json({ message: "OTP option not enabled" });
    }

    let sendValue;
    const via = clinic?.otp_type;

    if (via === "sms") {
      sendValue = user.attributes?.phoneNumber?.[0];
    } else if (via === "email") {
      sendValue = user.attributes?.email?.[0];
    } else if (via === "whatsapp") {
      sendValue = user.attributes?.whatsappNumber?.[0];
    }

    if (!sendValue) {
      log("FORGOT_PASSWORD", "❌ No contact value found for OTP");
      return res
        .status(400)
        .json({ message: "No contact value found for OTP" });
    }

    const otpResponse = await sendOTP({
      to: sendValue,
      username,
      via,
      message: "Your password reset OTP",
      length: 6,
      expiryMinutes: 10,
      session: req.session,
    });

    req.session.forgotPasswordStore[username] = {
      otp: otpResponse.otp,
      expiry: otpResponse.expiry,
    };

    log("FORGOT_PASSWORD", "✅ OTP sent for password reset", { to: sendValue });

    return res.status(200).json({
      message: "OTP sent successfully",
      to: sendValue,
      otp: process.env.NODE_ENV === "development" ? otpResponse.otp : undefined,
      step: "otp",
    });
  } catch (err) {
    log("FORGOT_PASSWORD", "💥 Error sending OTP", { error: err });
    next(new CustomError(err.message || "Failed to send OTP", 500));
  }
});

// ============================================================================
// 🔐 RESET PASSWORD ROUTE
// ============================================================================
router.post("/reset-password", async (req, res, next) => {
  log("RESET_PASSWORD_ROUTE", "Password reset request", req.body);

  try {
    const { username, newPassword, host, otp } = req.body;
    const HOST_REALM_CLIENT = JSON.parse(process.env.HOST_REALM_CLIENT);
    const tenantConfig = HOST_REALM_CLIENT[host];

    if (!tenantConfig) return res.status(400).json({ error: "Invalid host" });
    const { realm, clientId } = tenantConfig;

    if (!username || !newPassword) {
      return res
        .status(400)
        .json({ message: "Username and newPassword are required" });
    }

    if (otp) {
      if (!req.session?.forgotPasswordStore?.[username]) {
        return res
          .status(400)
          .json({ message: "No password reset session found" });
      }

      const stored = req.session.forgotPasswordStore[username];

      if (stored.otp !== otp || Date.now() > stored.expiry) {
        return res.status(400).json({ message: "Invalid or expired OTP" });
      }

      delete req.session.forgotPasswordStore[username];
    }

    const tokenResponse = await keycloakLogin(
      process.env.VIEW_USER_USERNAME,
      process.env.VIEW_USER_PASS,
      realm,
      clientId,
    );
    const adminToken = tokenResponse.access_token;

    const userResponse = await axios.get(
      `${process.env.KEYCLOAK_BASE_URL}/admin/realms/${realm}/users?username=${username}`,
      { headers: { Authorization: `Bearer ${adminToken}` } },
    );

    const user = userResponse.data[0];
    if (!user) {
      log("RESET_PASSWORD_ROUTE", "❌ User not found");
      return res.status(404).json({ message: "User not found" });
    }

    const resetUrl = `${process.env.KEYCLOAK_BASE_URL}/admin/realms/${realm}/users/${user.id}/reset-password`;

    await axios.put(
      resetUrl,
      { type: "password", value: newPassword, temporary: false },
      {
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
      },
    );

    log("RESET_PASSWORD_ROUTE", "✅ Password reset successful");
    return res.status(200).json({ message: "Password updated successfully" });
  } catch (err) {
    log("RESET_PASSWORD_ROUTE", "💥 Error", {
      error: err.response?.data || err.message,
    });
    next(new CustomError(err.response?.data?.error || err.message, 500));
  }
});

// ============================================================================
// 👤 USER REGISTRATION ROUTE
// ============================================================================
router.post("/register", async (req, res, next) => {
  log("USER_REGISTER_IN_KEYCLOAK", "User register process", req.body);

  try {
    const { email, firstname, lastname, phone, host } = req.body;
    const HOST_REALM_CLIENT = JSON.parse(process.env.HOST_REALM_CLIENT);
    const tenantConfig = HOST_REALM_CLIENT[host];

    if (!tenantConfig) return res.status(400).json({ error: "Invalid host" });
    const { realm, clientId } = tenantConfig;

    if (!firstname || !lastname || !phone) {
      return res.status(400).json({
        message: "Firstname, lastname, and phone number are required",
      });
    }

    const tokenResponse = await keycloakLogin(
      process.env.VIEW_USER_USERNAME,
      process.env.VIEW_USER_PASS,
      realm,
      clientId,
    );
    const adminToken = tokenResponse.access_token;

    const username = await generateUsername("GST", realm, adminToken);
    const password = generateAlphanumericPassword(12);
    const userEmail =
      email || `${username}${generateAlphanumericPassword(6)}@example.com`;

    const userData = {
      username,
      email: userEmail,
      emailVerified: true,
      firstName: firstname,
      lastName: lastname,
      enabled: true,
      attributes: {
        phoneNumber: phone,
        tenant_id: tokenResponse?.tenant_id || "",
        clinic_id: tokenResponse?.clinic_id || "",
      },
      password: password,
    };

    const isUserCreated = await addUser(adminToken, realm, userData);

    if (!isUserCreated) {
      throw new CustomError("Keycloak user creation failed", 400);
    }

    log("USER_CREATED", "✅ User Created successfully", { username });

    return res.status(200).json({
      message: "User created successfully",
      username,
      tempPassword:
        process.env.NODE_ENV === "development" ? password : undefined,
    });
  } catch (err) {
    log("USER_CREATED", "💥 Error", {
      error: err.response?.data || err.message,
    });
    next(new CustomError(err.response?.data?.error || err.message, 500));
  }
});

// ============================================================================
// 🚀 EXPORT - MUST BE ONLY THIS AT THE END
// ============================================================================
log("MODULE_INIT", "✅ Dental SSO Authentication module loaded");

// ✅ CRITICAL: Export ONLY the router - nothing else after this line
module.exports = router;
