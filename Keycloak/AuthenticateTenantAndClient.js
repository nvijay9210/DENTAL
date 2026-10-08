const jwt = require("jsonwebtoken");
const axios = require("axios");
const qs = require("querystring");

const { CustomError } = require("../middlewares/CustomeError");

const { getTenantByTenantId } = require("../models/TenantModel");

// IMPORTANT:
// Change this path only if your Redis config is in another location.
const redisClient = require("../config/redis");

// ============================================================
// CONSTANTS
// ============================================================

const ROLE_PRIORITY = [
  "tenant",
  "superuser",
  "dentist",
  "receptionist",
  "patient",
  "supplier",
  "guest",
];

// ============================================================
// PUBLIC KEY
// ============================================================

function getPublicKey() {
  return `-----BEGIN PUBLIC KEY-----
${process.env.KEYCLOAK_REALM_PUBLIC_KEY}
-----END PUBLIC KEY-----`;
}

// ============================================================
// ROLE
// ============================================================

function getUserRole(decoded) {
  const userRoles = decoded?.realm_access?.roles || [];

  return ROLE_PRIORITY.find((role) => userRoles.includes(role)) || "guest";
}

// ============================================================
// GET SESSION ID FROM COOKIE
// ============================================================

function getSessionIdFromCookie(req) {
  const sessionId = req.cookies?.dental_session;

  if (!sessionId) {
    throw new CustomError("Session not found", 401);
  }

  return sessionId;
}

// ============================================================
// GET SESSION FROM REDIS
// ============================================================

// ============================================================
// GET SESSION FROM REDIS
// ============================================================

async function getSessionFromRedis(sessionId) {
  if (!sessionId) {
    throw new CustomError("Session ID missing", 401);
  }

  const redisKey = `dental:session:${sessionId}`;

  const rawSession = await redisClient.get(redisKey);

  // Redis key not found
  if (rawSession === null || rawSession === undefined) {
    console.error("❌ Redis session not found:", redisKey);

    throw new CustomError("Session expired or not found", 401);
  }

  try {
    // ========================================================
    // CASE 1:
    // Redis client returned an object
    // ========================================================

    if (typeof rawSession === "object") {
      console.log("✅ Redis session returned as object");

      return rawSession;
    }

    // ========================================================
    // CASE 2:
    // Redis client returned a string
    // ========================================================

    if (typeof rawSession === "string") {
      const trimmed = rawSession.trim();

      if (!trimmed) {
        throw new Error("Empty Redis session");
      }

      const parsed = JSON.parse(trimmed);

      console.log("✅ Redis session parsed successfully");

      return parsed;
    }

    // ========================================================
    // Unexpected Redis value
    // ========================================================

    console.error("❌ Unexpected Redis session type:", typeof rawSession);

    throw new Error("Invalid Redis session type");
  } catch (error) {
    console.error("❌ Redis session parse error:", error.message);

    console.error("Redis session value:", rawSession);

    throw new CustomError("Invalid session data", 401);
  }
}

// ============================================================
// VERIFY ACCESS TOKEN
// ============================================================

function verifyAccessToken(token) {
  if (!token) {
    throw new CustomError("Access token missing", 401);
  }

  try {
    return jwt.verify(token, getPublicKey(), {
      algorithms: ["RS256"],
    });
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw error;
    }

    console.error("❌ JWT verification failed:", error.message);

    throw new CustomError("Invalid token", 401);
  }
}

// ============================================================
// DECODE EXPIRED TOKEN
// ============================================================

function decodeExpiredToken(token) {
  const decoded = jwt.decode(token);

  if (!decoded) {
    throw new CustomError("Invalid expired token", 401);
  }

  return decoded;
}

// ============================================================
// UPDATE REDIS SESSION
// ============================================================
async function updateRedisSession(sessionId, sessionData, ttlSeconds = null) {
  if (!sessionId) {
    throw new CustomError("Session ID missing", 401);
  }

  const redisKey = `dental:session:${sessionId}`;

  const sessionJson = JSON.stringify(sessionData);

  // ========================================================
  // UPDATE REDIS SESSION WITH KEYCLOAK REFRESH TOKEN TTL
  // ========================================================

  if (Number(ttlSeconds) > 0) {
    await redisClient.set(redisKey, sessionJson, "EX", Number(ttlSeconds));

    console.log(`🔐 Redis session updated. TTL: ${ttlSeconds} seconds`);
  } else {
    // If Keycloak did not return refresh_expires_in,
    // update session without changing Redis TTL.
    await redisClient.set(redisKey, sessionJson);

    console.log("🔐 Redis session updated without changing TTL");
  }
}

// ============================================================
// DELETE REDIS SESSION
// ============================================================

async function deleteRedisSession(sessionId) {
  if (!sessionId) {
    return;
  }

  try {
    await redisClient.del(`dental:session:${sessionId}`);

    console.log("🗑️ Redis session deleted:", sessionId);
  } catch (error) {
    console.error("❌ Failed to delete Redis session:", error.message);
  }
}

// ============================================================
// REFRESH ACCESS TOKEN USING REDIS SESSION
// ============================================================

async function refreshAccessToken(sessionId, sessionData) {
  const refreshToken = sessionData?.refreshToken;

  if (!refreshToken) {
    throw new CustomError("Refresh token missing", 401);
  }

  const tenantId = sessionData?.userDetails?.primary_tenant_id;

  if (!tenantId) {
    throw new CustomError("Tenant ID missing", 401);
  }

  const tenantConfig = await getTenantByTenantId(tenantId);

  if (!tenantConfig) {
    throw new CustomError("Tenant not found", 404);
  }

  // ========================================================
  // CLIENT ID
  // Login time-la save pannina clientId use pannum
  // ========================================================

  const clientId = sessionData?.clientId || tenantConfig.tenant_domain;

  // ========================================================
  // REALM
  // ========================================================

  const realm = sessionData?.realm || process.env.KEYCLOAK_REALM;

  // ========================================================
  // KEYCLOAK TOKEN URL
  // ========================================================

  const tokenUrl =
    `${process.env.KEYCLOAK_BASE_URL}` +
    `/realms/${realm}` +
    `/protocol/openid-connect/token`;

  try {
    console.log("🔄 Access token expired.");
    console.log("🔄 Refreshing token from Keycloak...");

    // ======================================================
    // REFRESH TOKEN REQUEST
    // ======================================================

    const response = await axios.post(
      tokenUrl,
      qs.stringify({
        grant_type: "refresh_token",

        refresh_token: refreshToken,

        client_id: clientId,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );

    // ======================================================
    // NEW ACCESS TOKEN
    // ======================================================

    const newAccessToken = response.data?.access_token;

    if (!newAccessToken) {
      throw new Error("New access token not received");
    }

    // ======================================================
    // NEW REFRESH TOKEN
    // ======================================================
    //
    // Keycloak refresh token rotation enabled:
    //   → new refresh_token returned
    //
    // Rotation disabled:
    //   → old refresh token continue
    //
    // ======================================================

    const newRefreshToken = response.data?.refresh_token || refreshToken;

    // ======================================================
    // VERIFY NEW ACCESS TOKEN
    // ======================================================

    const decoded = jwt.verify(newAccessToken, getPublicKey(), {
      algorithms: ["RS256"],
    });

    // ======================================================
    // KEYCLOAK EXPIRY
    // ======================================================

    const expiresIn = Number(response.data?.expires_in || 0);

    const refreshExpiresIn = Number(response.data?.refresh_expires_in || 0);

    if (expiresIn <= 0) {
      throw new Error("Invalid access token expiry received from Keycloak");
    }

    if (refreshExpiresIn <= 0) {
      throw new Error("Invalid refresh token expiry received from Keycloak");
    }

    if (expiresIn >= refreshExpiresIn) {
      throw new Error(
        `Invalid token lifetime: access token (${expiresIn}s) ` +
          `must be less than refresh token (${refreshExpiresIn}s)`,
      );
    }

    const now = Date.now();

    // ======================================================
    // NEW SESSION DATA
    // ======================================================

    const updatedSession = {
      ...sessionData,

      // Same application session
      sessionId,

      // New access token
      accessToken: newAccessToken,

      // New refresh token if Keycloak returned one
      refreshToken: newRefreshToken,

      // Keycloak access token expiry
      accessExpiresAt: expiresIn > 0 ? now + expiresIn * 1000 : null,

      // Keycloak refresh token expiry
      refreshExpiresAt:
        refreshExpiresIn > 0
          ? now + refreshExpiresIn * 1000
          : sessionData.refreshExpiresAt,

      updatedAt: new Date().toISOString(),
    };

    // ======================================================
    // SAVE NEW TOKENS + KEYCLOAK REFRESH TTL TO REDIS
    // ======================================================

    await updateRedisSession(
      sessionId,
      updatedSession,
      refreshExpiresIn > 0 ? refreshExpiresIn : null,
    );

    // ======================================================
    // LOG
    // ======================================================

    console.log("✅ New access token saved to Redis");

    console.log("✅ New refresh token saved to Redis");

    console.log("🔐 Access token expires in:", expiresIn, "seconds");

    console.log("🔐 Refresh token expires in:", refreshExpiresIn, "seconds");

    console.log("🕒 Access expires at:", updatedSession.accessExpiresAt);

    console.log("🕒 Refresh expires at:", updatedSession.refreshExpiresAt);

    // ======================================================
    // RETURN UPDATED SESSION
    // ======================================================

    return {
      sessionData: updatedSession,

      token: newAccessToken,

      refreshToken: newRefreshToken,

      decoded,
    };
  } catch (error) {
    console.error(
      "❌ Refresh Token Error:",
      error?.response?.data || error.message,
    );

    console.error("Status:", error?.response?.status);
    console.error("Client ID:", clientId);
    console.error("Realm:", realm);

    await deleteRedisSession(sessionId);

    throw new CustomError(
      error?.response?.data?.error_description ||
        "Session expired. Please login again.",
      401,
    );
  }
}

// ============================================================
// VERIFY OR REFRESH TOKEN FROM REDIS SESSION
// ============================================================

async function verifyOrRefreshToken(sessionId, sessionData) {
  const token = sessionData?.accessToken;

  if (!token) {
    throw new CustomError("Access token missing from session", 401);
  }

  try {
    // Access token valid
    const decoded = verifyAccessToken(token);

    return {
      sessionData,

      token,

      refreshToken: sessionData.refreshToken || null,

      decoded,
    };
  } catch (error) {
    // Invalid token - refresh panna koodathu
    if (error.name !== "TokenExpiredError") {
      throw error;
    }

    console.log("⚠️ Access token expired");

    // Refresh token Redis-la irundhu
    // eduthu new token generate pannum
    return refreshAccessToken(sessionId, sessionData);
  }
}

// ============================================================
// CHECK REQUIRED ROLE
// ============================================================

function authorizeRole(userRole, requiredRoles) {
  if (!userRole) {
    throw new CustomError("User role not found", 403);
  }

  const hasRequiredRole =
    requiredRoles.length === 0 ||
    requiredRoles.some((role) => role.toLowerCase() === userRole.toLowerCase());

  if (!hasRequiredRole) {
    throw new CustomError("Access denied", 403);
  }
}

// ============================================================
// GET CLINIC ACCESS FROM SESSION
// ============================================================

function getClinicAccess(userDetails) {
  if (Array.isArray(userDetails?.clinic)) {
    return userDetails.clinic;
  }

  if (Array.isArray(userDetails?.clinics)) {
    return userDetails.clinics;
  }

  return [];
}
// ============================================================
// VALIDATE CLINIC ACCESS
// ============================================================

function validateClinicAccess(userRole, clinicAccess) {
  const hasClinicAccess = clinicAccess.length > 0;

  if (userRole !== "tenant" && userRole !== "guest" && !hasClinicAccess) {
    throw new CustomError("Clinic access denied", 403);
  }
}

// ============================================================
// GET ACTIVE CLINIC
// ============================================================

function getActiveClinic(userDetails, clinicAccess) {
  const primaryClinicId = userDetails?.primary_clinic_id;

  if (primaryClinicId) {
    const primaryClinic = clinicAccess.find(
      (clinic) => Number(clinic.clinic_id) === Number(primaryClinicId),
    );

    if (primaryClinic) {
      return primaryClinic;
    }
  }

  return clinicAccess[0] || null;
}

// ============================================================
// RESOLVE ACTIVE TENANT
// ============================================================

function resolveActiveTenant(userDetails, activeClinic) {
  // Primary tenant from DB session.
  if (userDetails?.primary_tenant_id) {
    return userDetails.primary_tenant_id;
  }

  // Fallback from active clinic.
  return activeClinic?.tenant_id || null;
}

// ============================================================
// SET REQUEST CONTEXT
// ============================================================

function setRequestContext(
  req,
  {
    sessionId,
    sessionData,
    decoded,
    token,
    refreshToken,
    realm,
    userRole,
    activeTenantId,
    activeClinic,
    clinicAccess,
    userDetails,
  },
) {
  // JWT decoded information.
  req.user = decoded;

  // Complete DB user/session information.
  req.userDetails = userDetails;

  // Session ID.
  req.sessionId = sessionId;

  // Current access token.
  req.token = token;

  // Current refresh token.
  // Available internally only.
  req.refreshToken = refreshToken;

  // Authentication details.
  req.role = userRole;

  req.realm = realm;

  // Tenant/clinic context.
  req.tenant_id = activeTenantId;

  req.clinic_id = activeClinic?.clinic_id || null;

  // All allowed clinics.
  req.clinic_access = clinicAccess;

  req.related_clinic_ids = clinicAccess.map((clinic) => clinic.clinic_id);

  // Profile.
  req.dbUser = userDetails?.profile || null;

  // Full Redis session if any
  // downstream service needs it.
  req.authSession = sessionData;
}

// ============================================================
// DEVELOPMENT MODE
// ============================================================

function handleDevelopmentMode(req, requiredRoles) {
  const role = requiredRoles[0] || "guest";

  req.user = {
    username: "dev-user",
    role,
  };

  req.userDetails = {
    username: "dev-user",
    role: {
      role_code: role,
    },
  };

  req.role = role;

  req.tenant_id = null;

  req.clinic_id = null;

  req.clinic_access = [];

  return true;
}

// ============================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================

function authenticateTenantClinicGroup(requiredRoles = []) {
  return async (req, res, next) => {
    try {
      // ======================================================
      // DEV MODE
      // ======================================================

      if (process.env.KEYCLOAK_POWER === "off") {
        handleDevelopmentMode(req, requiredRoles);

        return next();
      }

      // ======================================================
      // 1. GET SESSION ID FROM COOKIE
      // ======================================================

      const sessionId = getSessionIdFromCookie(req);

      console.log("🔐 Authentication Session:", sessionId);

      // ======================================================
      // 2. GET SESSION FROM REDIS
      // ======================================================

      const sessionData = await getSessionFromRedis(sessionId);

      console.log("✅ Redis session found:", {
        userId: sessionData?.userId,
        username: sessionData?.username,
        accessExpiresAt: sessionData?.accessExpiresAt,
        refreshExpiresAt: sessionData?.refreshExpiresAt,
      });

      // ======================================================
      // 3. VERIFY / REFRESH ACCESS TOKEN
      //
      // If access token is valid:
      //   → continue
      //
      // If access token expired:
      //   → use refresh token
      //   → call Keycloak
      //   → get new access token
      //   → get new refresh token if rotated
      //   → save both into Redis
      //   → continue request
      // ======================================================

      const {
        sessionData: updatedSessionData,
        token,
        refreshToken,
        decoded,
      } = await verifyOrRefreshToken(sessionId, sessionData);

      // ======================================================
      // 4. GET USER DETAILS
      // ======================================================

      const userDetails = updatedSessionData?.userDetails;

      if (!userDetails) {
        throw new CustomError("User details missing from session", 401);
      }

      // ======================================================
      // 5. ROLE
      // ======================================================

      let userRole = userDetails?.role?.role_code;

      // Fallback to JWT realm roles
      if (!userRole) {
        userRole = getUserRole(decoded);
      }

      if (!userRole) {
        throw new CustomError("User role not found", 403);
      }

      authorizeRole(userRole, requiredRoles);

      // ======================================================
      // 6. CLINIC ACCESS
      // ======================================================

      const clinicAccess = getClinicAccess(userDetails);

      validateClinicAccess(userRole.toLowerCase(), clinicAccess);

      // ======================================================
      // 7. ACTIVE CLINIC
      // ======================================================

      const activeClinic = getActiveClinic(userDetails, clinicAccess);

      // ======================================================
      // 8. ACTIVE TENANT
      // ======================================================

      const activeTenantId = resolveActiveTenant(userDetails, activeClinic);

      // ======================================================
      // 9. REQUEST CONTEXT
      // ======================================================

      setRequestContext(req, {
        sessionId,

        // IMPORTANT:
        // This is the updated session.
        // If token was refreshed, this contains
        // the NEW accessToken and refreshToken.
        sessionData: updatedSessionData,

        decoded,

        // Current valid access token
        token,

        // Current refresh token
        refreshToken,

        realm: updatedSessionData?.realm || process.env.KEYCLOAK_REALM,

        userRole,

        activeTenantId,

        activeClinic,

        clinicAccess,

        userDetails,
      });

      // ======================================================
      // 10. AUTHENTICATION SUCCESS
      // ======================================================

      console.log("✅ Authentication successful:", {
        userId: userDetails.user_id,

        username: userDetails.username,

        role: userRole,

        tenantId: activeTenantId,

        clinicId: activeClinic?.clinic_id || null,

        accessExpiresAt: updatedSessionData?.accessExpiresAt || null,

        refreshExpiresAt: updatedSessionData?.refreshExpiresAt || null,

        tokenRefreshed:
          sessionData?.accessToken !== updatedSessionData?.accessToken,
      });

      // ======================================================
      // 11. CONTINUE
      // ======================================================

      return next();
    } catch (error) {
      console.error("❌ Authentication middleware error:", error);

      return handleAuthenticationError(error, res);
    }
  };
}

// ============================================================
// AUTHENTICATION ERROR
// ============================================================

function handleAuthenticationError(error, res) {
  console.error("❌ Authentication Error:", error);

  if (error instanceof CustomError) {
    return res.status(error.statusCode).json({
      success: false,
      status: "error",
      message: error.message,
    });
  }

  return res.status(500).json({
    success: false,
    status: "error",
    message: "Authentication failed",
  });
}

// ============================================================
// KEYCLOAK USER CHECK
// ============================================================

async function checkUserInKeycloak(token, realm, userId) {
  if (!token) {
    throw new CustomError("Token missing", 401);
  }

  const url =
    `${process.env.KEYCLOAK_BASE_URL}` +
    `/admin/realms/${realm}` +
    `/users/${userId}`;

  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      return null;
    }

    console.error(
      "Keycloak user check error:",
      error?.response?.data || error.message,
    );

    throw new CustomError("Failed to verify user in Keycloak", 404);
  }
}

// ============================================================
// VERIFY USER TOKEN IN DATABASE
// ============================================================
//
// IMPORTANT:
// This is kept only for backward compatibility.
// DO NOT use this function in the new login/session flow.
//
// New flow:
// dental_session cookie
//       ↓
// Redis session
//       ↓
// accessToken
//       ↓
// JWT validation
//
// ============================================================

async function verifyUserTokenInDB(token) {
  try {
    if (!token) {
      throw new CustomError("Missing token", 401);
    }

    const decoded = jwt.verify(token, getPublicKey(), {
      algorithms: ["RS256"],
    });

    return {
      userId: decoded.sub,

      username: decoded?.preferred_username,

      role: getUserRole(decoded),
    };
  } catch (error) {
    if (error instanceof CustomError) {
      throw error;
    }

    throw new CustomError(error.message || "Token validation failed", 401);
  }
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  authenticateTenantClinicGroup,

  verifyUserTokenInDB,

  checkUserInKeycloak,
};
