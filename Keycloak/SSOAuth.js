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
const { redisClient } = require("../config/redis");
const { UAParser } = require("ua-parser-js");

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
const { getUserDetailsByUsername } = require("../models/userModel");
const { createUserActivity } = require("../services/UserActivityService");
const {
  getNetworkLocation,
  getGpsLocation,
} = require("./network-location.service");
const { loggers } = require("winston");
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
      `dental:session:${sessionId}`,
      sessionData,
      COOKIE_EXPIRY.REFRESH / 1000,
    );

    console.log("Saved Session:", sessionId);

    log("TOKEN_SAVE", "Saving tokens and user data in cookies");

    // === 🔐 AUTH TOKENS (short/long expiry) ===
    res.cookie("dental_access_token", access_token, {
      ...COOKIE_OPTIONS,
      maxAge: COOKIE_EXPIRY.ACCESS,
    });
    res.cookie("dental_refresh_token", refresh_token, {
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

    res.cookie("dental_session", sessionId, {
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

    res.cookie("dental_access_token", access_token, {
      ...baseOptions,
      maxAge: accessExpiry,
    });

    res.cookie("dental_refresh_token", refresh_token, {
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

const completeLogin = async (req, res, tokens, username, realm, clientId) => {
  // =========================================================
  // 1. GET COMPLETE USER DETAILS
  // =========================================================

  const userDetails = await getUserDetailsByUsername(username);

  if (!userDetails) {
    return res.status(401).json({
      message: "User details not found",
    });
  }

  // =========================================================
  // 2. CREATE SESSION ID
  // =========================================================

  const sessionId = uuidv4();

  // =========================================================
  // 3. REDIS SESSION DATA
  // =========================================================

  const sessionKey = `dental:session:${sessionId}`;

  const sessionData = {
    sessionId,

    userId: userDetails.user_id,

    keycloakId: userDetails.keycloak_id,

    username: userDetails.username,

    accessToken: tokens.access_token,

    refreshToken: tokens.refresh_token,

    expiresIn: tokens.expires_in,

    refreshExpiresIn: tokens.refresh_expires_in,

    realm,

    clientId,

    userDetails,

    createdAt: new Date().toISOString(),
  };

  // =========================================================
  // 4. SAVE SESSION TO REDIS
  // =========================================================

  await setCache(
    sessionKey,
    JSON.stringify(sessionData),

    Math.ceil(tokens.refresh_expires_in || 86400),
  );

  // =========================================================
  // 5. SESSION COOKIE
  // =========================================================

  res.cookie("dental_session", sessionId, {
    httpOnly: true,

    secure: isProduction,

    sameSite: isProduction ? "None" : "Lax",

    path: "/",

    maxAge: (tokens.refresh_expires_in || 86400) * 1000,
  });

  // =========================================================
  // 6. DO NOT SEND ACCESS TOKEN TO FRONTEND
  // =========================================================

  return res.status(200).json({
    success: true,

    message: "Login successful",

    user: userDetails,
  });
};

const getRequestClientInfo = async (req, clientSystemInfo = {}) => {
  try {
    // =====================================================
    // 1. GET CLIENT IP
    // =====================================================

    let ip =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.headers["x-real-ip"] ||
      req.ip ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      null;

    if (ip?.includes(",")) {
      ip = ip.split(",")[0].trim();
    }

    if (ip?.startsWith("::ffff:")) {
      ip = ip.substring(7);
    }

    if (ip === "::1") {
      ip = "127.0.0.1";
    }

    console.log("🌐 Initial Request IP:", ip);

    // =====================================================
    // 2. USER AGENT + BROWSER
    // =====================================================

    const userAgent = req.headers["user-agent"] || "";

    const parser = new UAParser(userAgent);
    const uaResult = parser.getResult();

    const browser = `${uaResult.browser.name || "Unknown"} ${
      uaResult.browser.version || ""
    }`.trim();

    // =====================================================
    // 3. DEVICE
    // =====================================================

    const device =
      uaResult.device.model ||
      uaResult.device.vendor ||
      "Unknown";

    const deviceType =
      uaResult.device.type ||
      "Computer";

    // =====================================================
    // 4. OS INFORMATION
    // =====================================================

    // Frontend values
    const frontendPlatform =
      clientSystemInfo?.platform || null;

    const frontendPlatformVersion =
      clientSystemInfo?.platformVersion || null;

    // Browser Client Hints
    const headerPlatform =
      req.headers["sec-ch-ua-platform"] || null;

    const headerPlatformVersion =
      req.headers["sec-ch-ua-platform-version"] || null;

    console.log("🖥️ OS Headers:", {
      userAgent,
      platform: headerPlatform,
      platformVersion: headerPlatformVersion,
      ua: req.headers["sec-ch-ua"],
    });

    // Remove quotes from browser Client Hints
    const cleanHeaderPlatform =
      headerPlatform?.replace(/"/g, "") || null;

    const cleanHeaderPlatformVersion =
      headerPlatformVersion?.replace(/"/g, "") || null;

    // Frontend has priority
    const platform =
      frontendPlatform ||
      cleanHeaderPlatform ||
      null;

    const platformVersion =
      frontendPlatformVersion ||
      cleanHeaderPlatformVersion ||
      null;

    console.log("🖥️ OS INFORMATION:", {
      frontendPlatform,
      frontendPlatformVersion,
      headerPlatform,
      headerPlatformVersion,
      finalPlatform: platform,
      finalPlatformVersion: platformVersion,
    });

    // =====================================================
    // 5. DEFAULT OS FROM USER AGENT
    // =====================================================

    let operatingSystem = `${uaResult.os.name || "Unknown"} ${
      uaResult.os.version || ""
    }`.trim();

    // =====================================================
    // 6. WINDOWS VERSION DETECTION
    // =====================================================

    if (platform?.toLowerCase() === "windows") {
      if (platformVersion) {
        const majorVersion = parseInt(
          String(platformVersion).split(".")[0],
          10
        );

        console.log("🪟 Windows Platform Version:", {
          platformVersion,
          majorVersion,
        });

        if (Number.isFinite(majorVersion)) {
          /*
           * Windows Client Hint mapping:
           *
           * 10.x / 11.x / 12.x -> Windows 10
           * 13.x and above    -> Windows 11
           */

          if (majorVersion >= 13) {
            operatingSystem = "Windows 11";
          } else {
            operatingSystem = "Windows 10";
          }
        } else {
          operatingSystem = "Windows";
        }
      } else {
        // Platform available but version unavailable
        operatingSystem = "Windows";
      }
    }

    // =====================================================
    // 7. LANGUAGE
    // =====================================================

    const language =
      req.headers["accept-language"]?.split(",")[0]?.trim() ||
      "Unknown";

    // =====================================================
    // 8. FRONTEND GPS
    // =====================================================

    const latitude =
      req.body?.latitude !== undefined &&
      req.body?.latitude !== null &&
      req.body?.latitude !== ""
        ? Number(req.body.latitude)
        : null;

    const longitude =
      req.body?.longitude !== undefined &&
      req.body?.longitude !== null &&
      req.body?.longitude !== ""
        ? Number(req.body.longitude)
        : null;

    const hasCoordinates =
      Number.isFinite(latitude) &&
      Number.isFinite(longitude);

    console.log("📍 Frontend GPS Coordinates:", {
      latitude,
      longitude,
      hasCoordinates,
    });

    // =====================================================
    // 9. NETWORK / IP LOCATION
    // =====================================================

    const networkLocation =
      await getNetworkLocation(ip);

    console.log(
      "🌐 Network Location:",
      networkLocation
    );

    // =====================================================
    // 10. GPS REVERSE GEOCODING
    // =====================================================

    let gpsLocation = null;

    if (hasCoordinates) {
      try {
        console.log(
          "📍 GPS Reverse Lookup Starting:",
          {
            latitude,
            longitude,
          }
        );

        gpsLocation = await getGpsLocation(
          latitude,
          longitude
        );

        console.log(
          "📍 GPS Location:",
          gpsLocation
        );
      } catch (gpsError) {
        console.error(
          "❌ GPS Reverse Lookup Error:",
          gpsError.message
        );
      }
    }

    // =====================================================
    // 11. LOCATION PRIORITY
    // =====================================================

    /*
     * GPS available:
     *   latitude  -> GPS
     *   longitude -> GPS
     *   city      -> GPS reverse geocoding
     *   state     -> GPS reverse geocoding
     *   country   -> GPS reverse geocoding
     *
     * GPS unavailable:
     *   everything -> IP/network
     */

    const useGpsLocation =
      hasCoordinates && gpsLocation;

    const finalLatitude = useGpsLocation
      ? latitude
      : networkLocation.latitude;

    const finalLongitude = useGpsLocation
      ? longitude
      : networkLocation.longitude;

    const finalCity = useGpsLocation
      ? gpsLocation.city ||
        networkLocation.city
      : networkLocation.city;

    const finalState = useGpsLocation
      ? gpsLocation.state ||
        networkLocation.state
      : networkLocation.state;

    const finalCountry = useGpsLocation
      ? gpsLocation.country ||
        networkLocation.country
      : networkLocation.country;

    const finalLocation = useGpsLocation
      ? gpsLocation.location ||
        (finalCity && finalState
          ? `${finalCity}, ${finalState}`
          : finalCity ||
            finalState ||
            finalCountry ||
            null)
      : networkLocation.city &&
          networkLocation.state
        ? `${networkLocation.city}, ${networkLocation.state}`
        : networkLocation.city ||
          networkLocation.state ||
          networkLocation.country ||
          null;

    const locationSource = useGpsLocation
      ? "GPS"
      : networkLocation.latitude !== null &&
          networkLocation.longitude !== null
        ? "IP"
        : "NETWORK";

    // =====================================================
    // 12. FINAL CLIENT INFO
    // =====================================================

    const clientInfo = {
      // IP
      ip_address:
        networkLocation.publicIp ||
        ip ||
        null,

      // Location coordinates
      latitude: finalLatitude,
      longitude: finalLongitude,

      // Location details
      location: finalLocation,
      city: finalCity,
      state: finalState,
      country: finalCountry,

      // Location source
      location_source: locationSource,

      // ISP
      isp: networkLocation.isp || null,

      // Timezone
      timezone:
        networkLocation.timezone || null,

      // Browser
      browser,

      // Operating System
      operating_system:
        operatingSystem,

      // Device
      device,

      // Device Type
      device_type:
        deviceType,

      // Language
      language,

      // User Agent
      user_agent: userAgent,
    };

    console.log(
      "📍 Final Client Information:",
      clientInfo
    );

    return clientInfo;
  } catch (error) {
    console.error(
      "❌ getRequestClientInfo Error:",
      error.message
    );

    return {
      ip_address: null,
      latitude: null,
      longitude: null,
      location: null,
      city: null,
      state: null,
      country: null,
      location_source: "NETWORK",
      isp: null,
      timezone: null,
      browser: "Unknown",
      operating_system: "Unknown",
      device: "Unknown",
      device_type: "Computer",
      language: "Unknown",
      user_agent:
        req.headers["user-agent"] || "",
    };
  }
};

const createLoginSession = async (
  req,
  res,
  tokens,
  userDetails,
  realm,
  clientId,
) => {
  try {
    // ------------------------------------
    // 1. VALIDATION
    // ------------------------------------

    if (!tokens?.access_token) {
      throw new Error("Access token not found");
    }

    if (!tokens?.refresh_token) {
      throw new Error("Refresh token not found");
    }

    if (!userDetails?.user_id) {
      throw new Error("User details not found");
    }

    const accessExpiresIn = Number(tokens.expires_in || 0);
    const refreshExpiresIn = Number(tokens.refresh_expires_in || 0);

    if (accessExpiresIn <= 0) {
      throw new Error("Invalid access token expiry");
    }

    if (refreshExpiresIn <= 0) {
      throw new Error("Invalid refresh token expiry");
    }

    if (accessExpiresIn >= refreshExpiresIn) {
      throw new Error(
        `Invalid token lifetime: access token (${accessExpiresIn}s) must be less than refresh token (${refreshExpiresIn}s)`,
      );
    }

    // ------------------------------------
    // 2. GET CLIENT / DEVICE / LOCATION INFO
    // ------------------------------------
    // IMPORTANT:
    // Frontend latitude/longitude will get priority.
    // If not available, IP/network information will be used.

    const clientInfo = await getRequestClientInfo(req, {
      platform: req.body?.clientPlatform,
      platformVersion: req.body?.clientPlatformVersion,
    });

    console.log("🌐 Login Client Information:", clientInfo);

    // ------------------------------------
    // 3. CREATE SESSION
    // ------------------------------------

    const sessionId = crypto.randomUUID();

    const now = Date.now();

    const accessExpiresAt = now + accessExpiresIn * 1000;

    const refreshExpiresAt = now + refreshExpiresIn * 1000;

    const sessionData = {
      sessionId,

      userId: userDetails.user_id,
      keycloakId: userDetails.keycloak_id,
      username: userDetails.username,

      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,

      accessExpiresAt,
      refreshExpiresAt,

      realm,
      clientId,

      userDetails,

      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const redisKey = `dental:session:${sessionId}`;

    await redisClient.set(
      redisKey,
      JSON.stringify(sessionData),
      "EX",
      refreshExpiresIn,
    );

    // ------------------------------------
    // 4. COOKIE
    // ------------------------------------

    res.cookie("dental_session", sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: refreshExpiresIn * 1000,
    });

    // ------------------------------------
    // 5. LOGIN HISTORY
    // ------------------------------------

    try {
      await loginHistoryService.createLoginHistory({
        user_id: userDetails.user_id,

        tenant_id: userDetails.primary_tenant_id || null,

        clinic_id: userDetails.primary_clinic_id || null,

        app_name: process.env.APP_NAME || "DENTAL",

        session_id: sessionId,

        login_status: "SUCCESS",

        login_time: new Date(),

        ip_address: clientInfo.ip_address || null,

        latitude: clientInfo.latitude || null,

        longitude: clientInfo.longitude || null,

        location: clientInfo.location || null,

        city: clientInfo.city || null,

        state: clientInfo.state || null,

        country: clientInfo.country || null,

        location_source: clientInfo.location_source || null,

        isp: clientInfo.isp || null,

        device: clientInfo.device || null,

        device_type: clientInfo.device_type || null,

        browser: clientInfo.browser || null,

        operating_system: clientInfo.operating_system || null,

        language: clientInfo.language || null,

        user_agent: JSON.stringify(clientInfo),
      });

      console.log("✅ Login history saved");
    } catch (historyError) {
      console.error("⚠️ Login History Error:", historyError.message);

      // Do not stop successful login because logging failed
    }

    // ------------------------------------
    // 6. USER ACTIVITY
    // ------------------------------------

    try {
      await createUserActivity({
        user_id: userDetails.user_id,

        tenant_id: userDetails.primary_tenant_id || null,

        app_name: process.env.APP_NAME || "DENTAL",

        // IMPORTANT
        session_id: sessionId,

        activity_type: "LOGIN",

        activity_desc: `LOGIN ${req.originalUrl || "/v1/ssoAuth/login"}`,

        ip_address: clientInfo.ip_address || null,

        latitude: clientInfo.latitude || null,

        longitude: clientInfo.longitude || null,

        location: clientInfo.location || null,

        city: clientInfo.city || null,

        state: clientInfo.state || null,

        country: clientInfo.country || null,

        location_source: clientInfo.location_source || null,

        isp: clientInfo.isp || null,

        device: clientInfo.device || null,

        device_type: clientInfo.device_type || null,

        browser: clientInfo.browser || null,

        operating_system: clientInfo.operating_system || null,

        language: clientInfo.language || null,

        user_agent: JSON.stringify(clientInfo),

        endpoint: req.originalUrl || "/v1/ssoAuth/login",

        method: req.method || "POST",
      });

      console.log("✅ User activity saved");
    } catch (activityError) {
      console.error("⚠️ User Activity Error:", activityError.message);

      // Do not stop successful login because logging failed
    }

    // ------------------------------------
    // 7. LOG
    // ------------------------------------

    console.log("✅ Login session created");

    console.log({
      sessionId,
      userId: userDetails.user_id,
      username: userDetails.username,

      tenantId: userDetails.primary_tenant_id,

      clinicId: userDetails.primary_clinic_id,

      accessExpiresIn,
      refreshExpiresIn,

      accessExpiresAt,
      refreshExpiresAt,

      locationSource: clientInfo.location_source,

      ip: clientInfo.ip_address,

      latitude: clientInfo.latitude,

      longitude: clientInfo.longitude,

      city: clientInfo.city,

      country: clientInfo.country,

      isp: clientInfo.isp,

      browser: clientInfo.browser,

      operatingSystem: clientInfo.operating_system,

      device: clientInfo.device,

      language: clientInfo.language,
    });

    // ------------------------------------
    // 8. RESPONSE
    // ------------------------------------

    return res.status(200).json({
      success: true,
      message: "Login successful",
      user: userDetails,
    });
  } catch (error) {
    console.error("❌ createLoginSession Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create login session",
      error: error.message,
    });
  }
};
// ============================================================================
// 🔐 MAIN LOGIN ROUTE
// ============================================================================
router.post("/login", async (req, res) => {
  try {
    let {
      username,
      password,
      host,
      otp,
      clientPlatform,
      clientPlatformVersion,
    } = req.body;

    console.log("📦 LOGIN REQUEST BODY:", req.body);

    console.log("🖥️ CLIENT OS FROM FRONTEND:", {
      clientPlatform,
      clientPlatformVersion,
    });
    // =========================================================
    // 1. VALIDATE USERNAME
    // =========================================================

    username = username?.toLowerCase()?.trim();

    if (!username) {
      return res.status(400).json({
        success: false,
        message: "Username is required",
      });
    }

    // =========================================================
    // 2. SESSION INITIALIZATION
    // =========================================================

    if (!req.session) {
      req.session = {};
    }

    if (!req.session.temploginstore) {
      req.session.temploginstore = {};
    }

    // =========================================================
    // 3. HOST CONFIG
    // =========================================================

    const tenantConfig = getTenantConfigByHost(host);

    if (!tenantConfig) {
      return res.status(400).json({
        success: false,
        message: "Invalid host",
      });
    }

    const { realm, clientId } = tenantConfig;

    // =========================================================
    // 4. OTP LOGIN
    // =========================================================

    if (otp) {
      log("OTP_VERIFY", "Verifying OTP", {
        username,
      });

      const record = req.session.temploginstore[username];

      if (!record) {
        log("OTP_VERIFY", "No pending login session");

        return res.status(400).json({
          success: false,
          message: "No login session found. Please login again.",
        });
      }

      // -------------------------------------------------------
      // Verify OTP
      // -------------------------------------------------------

      const otpResult = await verifyOTP({
        to: record.otpTarget || username,
        otp,
        username,
        session: req.session,
      });

      if (!otpResult?.success) {
        log("OTP_VERIFY", "Invalid OTP", {
          reason: otpResult?.message,
        });

        return res.status(400).json({
          success: false,
          message: otpResult?.message || "Invalid OTP",
        });
      }

      log("OTP_VERIFY", "OTP verified successfully");

      // -------------------------------------------------------
      // Get temporarily stored login data
      // -------------------------------------------------------

      const tokens = record.tokens;

      const userDetails = record.userDetails;

      if (!tokens?.access_token) {
        delete req.session.temploginstore[username];

        return res.status(401).json({
          success: false,
          message: "Login session expired. Please login again.",
        });
      }

      if (!userDetails) {
        delete req.session.temploginstore[username];

        return res.status(401).json({
          success: false,
          message: "User details not found. Please login again.",
        });
      }

      // -------------------------------------------------------
      // Remove temporary OTP login data
      // -------------------------------------------------------

      delete req.session.temploginstore[username];

      // -------------------------------------------------------
      // Create final session
      // -------------------------------------------------------

      return createLoginSession(req, res, tokens, userDetails, realm, clientId);
    }

    // =========================================================
    // 5. PASSWORD VALIDATION
    // =========================================================

    if (!password) {
      log("LOGIN_FLOW", "Password missing");

      return res.status(400).json({
        success: false,
        message: "Username and password required",
      });
    }

    // =========================================================
    // 6. KEYCLOAK AUTHENTICATION
    // =========================================================

    log("KEYCLOAK_AUTH", "Authenticating with Keycloak", {
      username,
      realm,
      clientId,
    });

    const tokens = await keycloakLogin(username, password, realm, clientId);

    if (!tokens?.access_token) {
      log("KEYCLOAK_AUTH", "Access token missing");

      return res.status(401).json({
        success: false,
        message: "Keycloak authentication failed",
      });
    }

    log("KEYCLOAK_AUTH", "Keycloak authentication successful");

    // =========================================================
    // 7. GET COMPLETE USER DETAILS
    // =========================================================

    const userDetails = await getUserDetailsByUsername(username);

    if (!userDetails) {
      log("USER_LOOKUP", "User not found in Dental database", {
        username,
      });

      return res.status(401).json({
        success: false,
        message: "User is not registered in Dental",
      });
    }

    log("USER_LOOKUP", "User details loaded", {
      userId: userDetails.user_id,

      username: userDetails.username,

      role: userDetails.role?.role_code,

      tenantId: userDetails.primary_tenant_id,

      clinicId: userDetails.primary_clinic_id,
    });

    // =========================================================
    // 8. GET PRIMARY CLINIC
    // =========================================================

    let clinic = null;

    const primaryTenantId = userDetails.primary_tenant_id;

    const primaryClinicId = userDetails.primary_clinic_id;

    if (primaryTenantId && primaryClinicId) {
      clinic = await getClinicByTenantIdAndClinicId(
        primaryTenantId,
        primaryClinicId,
      );
    }

    // =========================================================
    // 9. CHECK OTP CONFIGURATION
    // =========================================================

    if (clinic && Number(clinic.otp) === 1) {
      log("CLINIC_OTP", "OTP enabled for primary clinic");

      const via = clinic.otp_type || "email";

      // -------------------------------------------------------
      // Determine OTP destination
      // -------------------------------------------------------

      let otpTarget = null;

      if (via === "email") {
        otpTarget = userDetails.email || null;
      } else {
        const phoneNumber =
          userDetails.profile?.phone_number ||
          userDetails.profile?.phoneNumber ||
          null;

        if (phoneNumber) {
          otpTarget = phoneNumber.startsWith("+")
            ? phoneNumber
            : `+${phoneNumber}`;
        }
      }

      if (!otpTarget) {
        return res.status(400).json({
          success: false,
          message: "No contact method found for OTP",
        });
      }

      // -------------------------------------------------------
      // Send OTP
      // -------------------------------------------------------

      const otpResult = await sendOTP({
        to: otpTarget,

        via,

        message: "Your Dental App Verification OTP",

        subject: "OTP Verification",

        username,

        session: req.session,
      });

      // -------------------------------------------------------
      // Store temporary login information
      // -------------------------------------------------------

      req.session.temploginstore[username] = {
        tokens,

        userDetails,

        otpTarget,

        createdAt: new Date().toISOString(),
      };

      log("OTP_SEND", "OTP sent successfully", {
        username,
        via,
        to: otpTarget,
      });

      return res.status(200).json({
        success: true,

        message: "OTP sent successfully",

        step: "otp",

        to: otpTarget,

        via,

        otpDetails:
          process.env.NODE_ENV === "development" ? otpResult : undefined,
      });
    }

    // =========================================================
    // 10. OTP NOT REQUIRED
    // =========================================================

    log("LOGIN_FLOW", "OTP not required - creating session");

    return createLoginSession(req, res, tokens, userDetails, realm, clientId);
  } catch (error) {
    log("LOGIN_FLOW", "Login failed", {
      message: error.message,

      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });

    return res.status(error.statusCode || 401).json({
      success: false,

      message: error.message || "Invalid credentials",

      error: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

// ============================================================================
// 🔄 REFRESH TOKEN ROUTE
// ============================================================================
router.post("/refresh-token", async (req, res, next) => {
  log("REFRESH_TOKEN", "Refreshing access token");

  const refreshToken = req.cookies.dental_refresh_token;
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
    res.cookie("dental_access_token", tokenData.access_token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      maxAge: tokenData.expires_in * 1000,
    });

    res.cookie("dental_refresh_token", tokenData.refresh_token, {
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

router.post("/logout", async (req, res) => {
  try {
    console.log("LOGOUT: ========== LOGOUT START ==========");

    // --------------------------------------------------
    // 1. GET SESSION CONTEXT
    // --------------------------------------------------

    const sessionId = req.cookies?.dental_session || null;
    const userId = req.cookies?.user_id || null;
    const keycloakUserId = req.cookies?.keycloak_user_id || null;
    const tenantId = req.cookies?.tenant_id || null;
    const username = req.cookies?.username || null;

    console.log("🔐 LOGOUT CONTEXT:", {
      sessionId,
      userId,
      keycloakUserId,
      tenantId,
      username,
    });

    if (!sessionId) {
      console.warn("⚠️ LOGOUT: dental_session cookie missing");
    }

    // --------------------------------------------------
    // 2. UPDATE LOGIN HISTORY
    // --------------------------------------------------

    if (sessionId) {
      try {
        const result =
          await loginHistoryService.updateLoginHistoryLogoutBySessionId(
            sessionId,
          );

        console.log("🔐 LOGIN HISTORY LOGOUT UPDATED:", result);
      } catch (error) {
        console.error("❌ Failed to update login history logout:", error);
      }
    }

    // --------------------------------------------------
    // 3. CREATE LOGOUT USER ACTIVITY
    // --------------------------------------------------

    if (sessionId && userId && tenantId) {
      try {
        const clientInfo = await getRequestClientInfo(req, {
          platform: req.body?.clientPlatform,
          platformVersion: req.body?.clientPlatformVersion,
        });
        await createUserActivity({
          user_id: userId,
          tenant_id: tenantId,
          app_name: process.env.APP_NAME || "DENTAL",
          session_id: sessionId,

          activity_type: "LOGOUT",

          activity_desc: `LOGOUT ${req.originalUrl || "/v1/ssoAuth/logout"}`,

          ip_address: clientInfo.ip_address || null,
          latitude: clientInfo.latitude || null,
          longitude: clientInfo.longitude || null,
          location: clientInfo.location || null,
          city: clientInfo.city || null,
          state: clientInfo.state || null,
          country: clientInfo.country || null,
          location_source: clientInfo.location_source || null,
          isp: clientInfo.isp || null,

          device: clientInfo.device || null,
          device_type: clientInfo.device_type || null,
          browser: clientInfo.browser || null,
          operating_system: clientInfo.operating_system || null,
          language: clientInfo.language || null,

          user_agent: JSON.stringify(clientInfo),

          endpoint: req.originalUrl || "/v1/ssoAuth/logout",

          method: req.method || "POST",
        });

        console.log("✅ LOGOUT USER ACTIVITY CREATED");
      } catch (error) {
        console.error("❌ Failed to create logout user activity:", error);
      }
    } else {
      console.warn("⚠️ USER ACTIVITY: required logout context missing", {
        sessionId,
        userId,
        tenantId,
      });
    }

    // --------------------------------------------------
    // 4. DELETE REDIS SESSION
    // --------------------------------------------------

    if (sessionId) {
      try {
        await redisClient.del(`dental:session:${sessionId}`);

        console.log(`🗑️ Redis session deleted: ${sessionId}`);
      } catch (error) {
        console.error("❌ Failed to delete Redis session:", error);
      }
    }

    // --------------------------------------------------
    // 5. CLEAR COOKIES
    // --------------------------------------------------

    res.clearCookie("dental_session", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    res.clearCookie("dental_session_id", {
      path: "/",
    });

    res.clearCookie("user_id", {
      path: "/",
    });

    res.clearCookie("keycloak_user_id", {
      path: "/",
    });

    res.clearCookie("tenant_id", {
      path: "/",
    });

    res.clearCookie("username", {
      path: "/",
    });

    console.log("🍪 LOGOUT COOKIES CLEARED");

    // --------------------------------------------------
    // 6. RESPONSE
    // --------------------------------------------------

    return res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    console.error("❌ LOGOUT ERROR MESSAGE:", error.message);

    console.error("❌ LOGOUT ERROR STACK:", error.stack);

    return res.status(500).json({
      success: false,
      message: error.message || "Logout failed",
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
