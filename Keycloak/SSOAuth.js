// ============================================================================
// ssoAuth.js - Dental Application Authentication Module
// Keycloak + Multi-Role User Tables + Clinic-based Architecture
// ============================================================================
const express = require("express");
const cookieParser = require("cookie-parser");
const qs = require("querystring");
const axios = require("axios");
const { CustomError } = require("../middlewares/CustomeError");
const { UAParser } = require("ua-parser-js");
const { randomUUID } = require("crypto");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");
const { getTenantByTenantId } = require("../services/TenantService");
const { createDebugLogger } = require("../utils/Debugger");
const { sendOTP, canSendOTP, setOtpCooldown, verifyOTP } = require("../utils/Otp");
const passwordHash = require("../utils/PasswordHash");
const {
  redisClient,
  setEx, get, del, exists, ttl, incrWithExpiry,
  checkRedisHealth,
  gracefulShutdown: redisGracefulShutdown
} = require("../config/redis");

const router = express.Router();
router.use(cookieParser());

// ============================================================================
// 🐛 DEBUG CONFIGURATION
// ============================================================================
const debug = createDebugLogger("SsoAuth", "DEBUG_AUTH");

// ============================================================================
// 1. CONFIGURATION & CONSTANTS
// ============================================================================
const isProduction = process.env.NODE_ENV === "production";

// ✅ Dental App Role Priority (order matters for matching)
const ROLE_PRIORITY = ["tenant", "superuser", "dentist", "receptionist", "patient", "supplier", "guest"];

const CONFIG = {
  KEYCLOAK: {
    BASE_URL: process.env.KEYCLOAK_BASE_URL,
    PUBLIC_KEY: `-----BEGIN PUBLIC KEY-----
${process.env.KEYCLOAK_REALM_PUBLIC_KEY}
-----END PUBLIC KEY-----`,
    ADMIN_USER: process.env.VIEW_USER_USERNAME,
    ADMIN_PASS: process.env.VIEW_USER_PASS,
  },
  COOKIES: {
    OPTIONS: {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "None" : "Lax",
      path: "/",
    },
    EXPIRY: {
      ACCESS: Number(process.env.ACCESS_COOKIE_EXPIRE_TIME || 900) * 1000,
      REFRESH: Number(process.env.REFRESH_COOKIE_EXPIRE_TIME || 86400) * 1000,
    },
  },
  HOST_REALM_CLIENT: JSON.parse(process.env.HOST_REALM_CLIENT || "{}"),
  CLIENT_CREDENTIALS: JSON.parse(process.env.CLIENT_CREDENTIALS || "{}"),
};

const MESSAGES = {
  UNAUTHORIZED: "Session expired. Please login again.",
  INVALID_HOST: "Invalid host",
  LOGIN_SUCCESS: "Login successful",
  USER_NOT_FOUND: "User not found",
  INVALID_CREDENTIALS: "Invalid credentials",
};

// ============================================================================
// 🗄️ DENTAL-SPECIFIC USER LOOKUP FUNCTIONS
// ============================================================================

// ✅ Map role to table name
const ROLE_TABLE_MAP = {
  dentist: "dentist",
  patient: "patient",
  receptionist: "reception",
  superuser: "superuser",
  supplier: "supplier",
  // tenant & guest don't have DB records
};

// ✅ Get user by Keycloak ID from appropriate table based on role
async function getUserByKeycloakIdAndRole(keycloakId, role) {
  const tableName = ROLE_TABLE_MAP[role];
  if (!tableName) return null; // tenant/guest don't have DB records

  const conn = await pool.getConnection();
  debug.log("UserService", `Fetching ${role} by Keycloak ID`, { keycloakId, table: tableName });
  
  try {
    // ✅ Dental schema: bigint IDs, keycloak_id as char(36)
    const rows = await conn.query(
      `
      SELECT
        ${tableName}_id as user_id,
        keycloak_id,
        username,
        first_name,
        last_name,
        email,
        phone_number,
        tenant_id,
        clinic_id,
        status,
        last_login,
        created_time,
        profile_picture
      FROM ${tableName}
      WHERE keycloak_id = ?
      LIMIT 1
      `,
      [keycloakId],
    );
    
    debug.log("UserService", "Query result", {
      found: rows?.[0] ? true : false,
      userId: rows?.[0]?.user_id,
      role,
    });
    
    return rows?.[0] || null;
  } catch (error) {
    debug.error("UserService", `Failed to fetch ${role}`, error);
    throw new Error(`Failed to fetch ${role}: ${error.message}`);
  } finally {
    if (conn) conn.release();
  }
}

// ✅ Get user with tenant/clinic validation
async function getUserByKeycloakIdWithTenantClinic(keycloakId, tenantId, clinicId, role) {
  const tableName = ROLE_TABLE_MAP[role];
  if (!tableName) return null;

  debug.log("UserService", `Fetching ${role} with tenant/clinic`, {
    keycloakId, tenantId, clinicId, table: tableName,
  });
  
  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(
      `
      SELECT
        ${tableName}_id as user_id,
        keycloak_id,
        username,
        first_name,
        last_name,
        email,
        phone_number,
        tenant_id,
        clinic_id,
        status,
        last_login
      FROM ${tableName}
      WHERE keycloak_id = ?
      AND tenant_id = ?
      AND clinic_id = ?
      AND status = 1
      LIMIT 1
      `,
      [keycloakId, tenantId, clinicId],
    );
    
    debug.log("UserService", "User fetch result", {
      found: rows?.[0] ? true : false,
      userId: rows?.[0]?.user_id,
      role,
    });
    
    return rows?.[0] || null;
  } catch (error) {
    debug.error("UserService", `Failed to fetch ${role} with tenant/clinic`, error);
    throw new Error(`Failed to fetch ${role}: ${error.message}`);
  } finally {
    if (conn) conn.release();
  }
}

// ✅ Get clinics for a user (for dropdowns)
async function getClinicsByTenantIdAndUserId(tenantId, userId, role, conn) {
  // For dentist/reception: they're assigned to specific clinics
  // For superuser/tenant: they can access all clinics in tenant
  const isAdminRole = ["tenant", "superuser"].includes(role);
  
  try {
    if (isAdminRole) {
      const rows = await conn.query(
        `
        SELECT
          clinic_id,
          clinic_name,
          address,
          city,
          state,
          pin_code,
          phone_number,
          email
        FROM clinic
        WHERE tenant_id = ?
        ORDER BY clinic_id ASC
        `,
        [tenantId],
      );
      return rows;
    } else {
      // For dentist/reception: return their assigned clinic only
      const rows = await conn.query(
        `
        SELECT
          c.clinic_id,
          c.clinic_name,
          c.address,
          c.city,
          c.state,
          c.pin_code,
          c.phone_number,
          c.email
        FROM clinic c
        WHERE c.tenant_id = ?
        AND c.clinic_id = (
          SELECT clinic_id FROM ${ROLE_TABLE_MAP[role]} 
          WHERE ${role}_id = ? AND tenant_id = ?
        )
        `,
        [tenantId, userId, tenantId],
      );
      return rows;
    }
  } catch (error) {
    debug.error("ClinicService", "Failed to fetch clinics", error);
    throw new Error(`Failed to fetch clinics: ${error.message}`);
  }
}

// ============================================================================
// 🗄️ UTILS (IP, Geo, User-Agent)
// ============================================================================
const getIp = (req) => {
  let ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || 
           req.socket?.remoteAddress || null;
  return ip === "::1" ? "127.0.0.1" : ip;
};

const getUserAgentInfo = (req) => {
  const ua = new UAParser(req.headers["user-agent"] || "").getResult();
  return {
    browser: ua.browser.name && ua.browser.version 
      ? `${ua.browser.name} ${ua.browser.version}` 
      : "Unknown",
    device: ua.device.type 
      ? ua.device.type.charAt(0).toUpperCase() + ua.device.type.slice(1) 
      : "Desktop",
  };
};

const getGeoInfo = async (ip) => {
  const isLocal = ip === "127.0.0.1" || ip === "::1" || 
                  ip?.startsWith("192.168.") || ip?.startsWith("10.");
  if (isLocal) {
    return { country: "Local", state: "Local", city: "Local", isp: "Local Network" };
  }
  try {
    const { data } = await axios.get(`https://ipapi.co/${ip}/json/`, { timeout: 5000 });
    return {
      country: data.country_name,
      state: data.region,
      city: data.city,
      isp: data.org,
      latitude: data.latitude,
      longitude: data.longitude,
      country_code: data.country_code,
      timezone: data.timezone,
    };
  } catch (err) {
    debug.warn("GeoService", "Geo lookup failed", err.message);
    return { country: null, state: null, city: null, isp: null };
  }
};

// ============================================================================
// 🔐 KEYCLOAK HELPERS
// ============================================================================
const getKeycloakUrl = (realm, path) => 
  `${CONFIG.KEYCLOAK.BASE_URL}/realms/${realm}${path}`;

const keycloakLogin = async (username, password, realm, clientId) => {
  const url = getKeycloakUrl(realm, "/protocol/openid-connect/token");
  try {
    const response = await axios.post(
      url,
      new URLSearchParams({
        client_id: clientId,
        grant_type: "password",
        username,
        password,
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
    );
    debug.log("Keycloak", "✅ Login successful", {
      hasAccessToken: !!response.data.access_token,
      expiresIn: response.data.expires_in,
    });
    return response.data;
  } catch (error) {
    debug.error("Keycloak", "❌ Login failed", {
      status: error.response?.status,
      error: error.response?.data,
    });
    throw new CustomError(
      error.response?.data?.error_description || "Login failed",
      error.response?.status || 500,
    );
  }
};

const keycloakRefresh = async (refreshToken, realm, clientId) => {
  const url = getKeycloakUrl(realm, "/protocol/openid-connect/token");
  try {
    const response = await axios.post(
      url,
      qs.stringify({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: clientId,
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
    );
    debug.log("Keycloak", "✅ Token refreshed", {
      newExpiresIn: response.data.expires_in,
    });
    return response.data;
  } catch (error) {
    debug.error("Keycloak", "❌ Refresh failed", {
      status: error.response?.status,
    });
    throw error;
  }
};

const decodeToken = (token) => {
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) throw new Error("Invalid JWT");
    const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf8"));
    return payload;
  } catch (err) {
    debug.error("Token", "Failed to decode JWT", err);
    return null;
  }
};

const extractUserInfo = (token) => {
  const globalRoles = token.realm_access?.roles || [];
  const role = ROLE_PRIORITY.find((r) => 
    globalRoles.some((gr) => gr.toLowerCase() === r.toLowerCase())
  ) || "guest";
  
  return {
    username: token?.preferred_username,
    userId: token.sub,
    displayName: token.name,
    role,
    email: token.email,
  };
};

// ============================================================================
// 🗄️ SERVICES (Business Logic)
// ============================================================================
const UserService = {
  verifyTokenInDB: async (token, role) => {
    debug.log("UserService", "Verifying token in DB", { role });
    try {
      const decoded = jwt.verify(token, CONFIG.KEYCLOAK.PUBLIC_KEY, {
        algorithms: ["RS256"],
      });
      debug.log("UserService", "JWT verified", {
        sub: decoded.sub?.substring(0, 10) + "...",
      });
      
      let user = await getUserByKeycloakIdAndRole(decoded.sub, role);
      user=user[0];
      console.log("UserService", "DB lookup result", user);
      if (!user) {
        debug.error("UserService", "User not found in DB", {
          keycloakId: decoded.sub,
          role,
        });
        throw new CustomError(MESSAGES.USER_NOT_FOUND, 404);
      }
      
      debug.log("UserService", "✅ User verified", {
        userId: user.user_id,
        role,
        clinicId: user.clinic_id,
      });
      return user;
    } catch (error) {
      debug.error("UserService", "Token verification failed", error);
      throw error;
    }
  },
};

// ✅ Dental Schema: login_history & user_activity adapted
const AuditService = {
  logLogin: async (userContext, req, geo, ua, dbUser, networkDetails) => {
    debug.log("AuditService", "Logging login activity", {
      userId: userContext.user_id,
      sessionId: userContext.session_id,
      role: userContext.role,
    });

    const ip = getIp(req);
    const session_id = userContext.session_id;
    let conn;
    
    try {
      conn = await pool.getConnection();

      // ✅ Dental login_history schema
      const historyParams = [
        Number(userContext.tenant_id) || null,
        req.headers["x-app-name"] || "dental", // app_name field
        userContext.keycloak_user_id,          // keycloak_user_id (char36)
        session_id,
        new Date(),                            // login_time
        networkDetails?.ip_address || ip,
        JSON.stringify(ua),                    // user_agent as text
      ];

      await conn.query(
        `INSERT INTO login_history 
         (tenant_id, app_name, keycloak_user_id, session_id, login_time, ip_address, user_agent) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        historyParams,
      );
      debug.log("AuditService", "📝 Login history inserted");

      // ✅ Dental user_activity schema
      const activityParams = [
        Number(userContext.tenant_id) || null,
        req.headers["x-app-name"] || "dental",
        userContext.keycloak_user_id,
        "login",                              // activity_type
        `User logged in from ${networkDetails?.city || 'Unknown'}`, // activity_desc
        ip,
        JSON.stringify(ua),
        new Date(),                           // activity_time
      ];

      await conn.query(
        `INSERT INTO user_activity 
         (tenant_id, app_name, keycloak_user_id, activity_type, activity_desc, ip_address, user_agent, activity_time) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        activityParams,
      );
      debug.log("AuditService", "📊 User activity logged");
      
    } catch (err) {
      debug.error("AuditService", "Failed to log audit", err);
    } finally {
      if (conn) conn.release();
    }
  },

  logLogout: async (session_id, reason, keycloakUserId) => {
    debug.log("AuditService", "Logging logout", { session_id, reason });
    let conn;
    try {
      conn = await pool.getConnection();
      
      // Update login_history
      await conn.query(
        `UPDATE login_history SET logout_time = NOW() WHERE session_id = ?`,
        [session_id],
      );
      
      // Log to user_activity
      await conn.query(
        `INSERT INTO user_activity 
         (tenant_id, app_name, keycloak_user_id, activity_type, activity_desc, ip_address, user_agent, activity_time) 
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          null, // tenant_id from session if needed
          "dental",
          keycloakUserId,
          "logout",
          `User logged out: ${reason || "manual"}`,
          null,
          null,
        ],
      );
      
      debug.log("AuditService", "✅ Logout audit updated");
    } catch (err) {
      debug.error("AuditService", "Failed to log logout", err);
    } finally {
      if (conn) conn.release();
    }
  },
};

const ContextService = {
  build: async (accessToken, dbUser, role) => {
    debug.log("ContextService", "Building user context", {
      userId: dbUser?.user_id,
      role,
    });
    
    const decoded = decodeToken(accessToken);
    const info = extractUserInfo(decoded);
    
    // ✅ Tenant & Guest roles skip DB context building
    if (["tenant", "guest"].includes(role)) {
      return {
        user_id: null,
        keycloak_user_id: info.userId,
        username: info.username,
        email: info.email,
        role,
        tenant_id: decoded?.tenant_id || null,
        clinic_id: decoded?.clinic_id || null,
        displayName: info.displayName,
        branches: [], // Dental uses clinics
      };
    }

    // Load tenant info
    const tenant = dbUser?.tenant_id 
      ? await getTenantByTenantId(dbUser.tenant_id) 
      : null;

    // Load clinics (Dental equivalent of branches)
    let clinics = [];
    if (dbUser?.user_id && dbUser?.tenant_id) {
      let conn;
      try {
        conn = await pool.getConnection();
        clinics = await getClinicsByTenantIdAndUserId(
          dbUser.tenant_id, 
          dbUser.user_id, 
          role, 
          conn
        );
      } finally {
        if (conn) conn.release();
      }
    }

    const clinicData = clinics?.map((c) => ({
      clinic_id: Number(c.clinic_id),
      clinic_name: c.clinic_name,
      // branch_code: c.branch_code,
      address: c.address,
      city: c.city,
      state: c.state,
      pincode: c.pin_code,
    }));

    return {
      // User Info
      user_id: Number(dbUser?.user_id),
      keycloak_user_id: info.userId,
      username: dbUser?.username || info.username,
      first_name: dbUser?.first_name,
      last_name: dbUser?.last_name,
      email: dbUser?.email || info.email,
      phone_number: dbUser?.phone_number,
      profile_picture: dbUser?.profile_picture,
      role,
      
      // Tenant Info
      tenant_id: Number(dbUser?.tenant_id) || null,
      tenant_name: tenant?.tenant_name,
      tenant_domain: tenant?.tenant_domain,
      tenant_app_name: tenant?.tenant_app_name,
      tenant_app_logo: tenant?.tenant_app_logo,
      tenant_app_font: tenant?.tenant_app_font,
      tenant_app_themes: tenant?.tenant_app_themes,
      
      // Clinic Info (Dental = Branches)
      clinics: clinicData,
      clinic_id: Number(dbUser?.clinic_id) || null,
      default_clinic_id: Number(dbUser?.clinic_id) || null,
      
      // Metadata
      displayName: info.displayName,
      last_login: dbUser?.last_login,
      created_time: dbUser?.created_time,
    };
  },
};

// ============================================================================
// 🗄️ SESSION SERVICE (Redis-based)
// ============================================================================
const SessionService = {
  create: async (res, userContext, tokens, clientId, realm, networkDetails) => {
    debug.log("SessionService", "Creating new session", {
      userId: userContext.user_id,
      role: userContext.role,
      clinicId: userContext.clinic_id,
    });
    
    const session_id = randomUUID();
    const cookieOpts = {
      ...CONFIG.COOKIES.OPTIONS,
      maxAge: CONFIG.COOKIES.EXPIRY.REFRESH,
    };

    // Set all auth cookies
    const cookiesToSet = [
      { name: "access_token", value: tokens.access_token, maxAge: CONFIG.COOKIES.EXPIRY.ACCESS },
      { name: "refresh_token", value: tokens.refresh_token, maxAge: CONFIG.COOKIES.EXPIRY.REFRESH },
      { name: "session_id", value: session_id, maxAge: CONFIG.COOKIES.EXPIRY.REFRESH },
      { name: "clientId", value: clientId, maxAge: CONFIG.COOKIES.EXPIRY.REFRESH },
      { name: "realm", value: realm, maxAge: CONFIG.COOKIES.EXPIRY.REFRESH },
      { name: "user_id", value: userContext.user_id, maxAge: CONFIG.COOKIES.EXPIRY.REFRESH },
      { name: "tenant_id", value: userContext.tenant_id, maxAge: CONFIG.COOKIES.EXPIRY.REFRESH },
      { name: "clinic_id", value: userContext.clinic_id, maxAge: CONFIG.COOKIES.EXPIRY.REFRESH },
      { name: "role", value: userContext.role, maxAge: CONFIG.COOKIES.EXPIRY.REFRESH },
    ];

    cookiesToSet.forEach((cookie) => {
      res.cookie(
        cookie.name,
        cookie.value,
        cookie.name === "access_token"
          ? { ...CONFIG.COOKIES.OPTIONS, maxAge: CONFIG.COOKIES.EXPIRY.ACCESS }
          : cookieOpts
      );
    });

    debug.log("SessionService", "🍪 Cookies set", cookiesToSet.map(c => c.name));

    // Store session in Redis
    const sessionData = {
      user_id: userContext.user_id,
      keycloak_user_id: userContext.keycloak_user_id,
      tenant_id: userContext.tenant_id,
      clinic_id: userContext.clinic_id,
      role: userContext.role,
      username: userContext.username,
      clientId,
      realm,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      // Network/Location data
      ip_address: networkDetails?.ip_address,
      country: networkDetails?.country,
      city: networkDetails?.city,
      isp: networkDetails?.isp,
      // Session metadata
      login_time: new Date().toISOString(),
      last_activity: new Date().toISOString(),
    };

    await setEx(
      `session:${session_id}`,
      Math.floor(CONFIG.COOKIES.EXPIRY.REFRESH / 1000),
      sessionData
    );
    
    await setEx(
      `api_count:${session_id}`,
      Math.floor(CONFIG.COOKIES.EXPIRY.REFRESH / 1000),
      0
    );

    debug.log("SessionService", "✅ Session stored in Redis", { session_id });
    return session_id;
  },

  destroy: async (req, res) => {
    const session_id = req.cookies?.session_id;
    if (!session_id) return;
    
    await del(`session:${session_id}`, `api_count:${session_id}`);
    
    const clearOpts = { ...CONFIG.COOKIES.OPTIONS, path: "/" };
    ["access_token", "refresh_token", "session_id", "clientId", "realm", "user_id"].forEach(
      (c) => res.clearCookie(c, clearOpts)
    );
    
    debug.log("SessionService", "🗑️ Session destroyed", { session_id });
  },

  get: async (session_id) => {
    if (!session_id) return null;
    const data = await get(`session:${session_id}`);
    return data || null;
  },
};

// ============================================================================
// 🔐 MIDDLEWARE: authenticateTenantClinicGroup
// ============================================================================
/**
 * Middleware for Dental app authentication
 * @param {string[]} allowedRoles - Array of roles allowed to access the route
 * @returns {Function} Express middleware
 */
const authenticateTenantClinicGroup = (allowedRoles = []) => {
  return async (req, res, next) => {
    debug.log("Middleware", "🔐 authenticateTenantClinicGroup", {
      allowedRoles,
      path: req.path,
    });

    try {
      // ===== DEV MODE BYPASS =====
      if (process.env.KEYCLOAK_POWER === "off") {
        req.user = {
          username: "dev-user",
          realm_access: { roles: allowedRoles },
          sub: "dev-keycloak-id",
        };
        req.role = allowedRoles[0] || "guest";
        req.realm = process.env.KEYCLOAK_REALM;
        req.token = "dev-token";
        req.tenant_id = 1;
        req.clinic_id = 1;
        return next();
      }

      // ===== Extract tokens & headers =====
      let token = req.cookies?.access_token || req.headers["access_token"];
      let refreshToken = req.cookies?.refresh_token || req.headers["refresh_token"];
      const realm = process.env.KEYCLOAK_REALM || req.headers["x-realm"];
      const clientId = req.cookies?.clientId || req.headers["x-clientid"];

      if (!token || !realm) {
        throw new CustomError("Missing token or realm", 401);
      }

      const pubKey = CONFIG.KEYCLOAK.PUBLIC_KEY;
      let decoded;

      // ===== Verify JWT =====
      try {
        decoded = jwt.verify(token, pubKey, { algorithms: ["RS256"] });
      } catch (err) {
        // ===== Token expired: attempt refresh =====
        if (err.name === "TokenExpiredError" && refreshToken) {
          try {
            const tokenUrl = getKeycloakUrl(realm, "/protocol/openid-connect/token");
            const response = await axios.post(
              tokenUrl,
              qs.stringify({
                grant_type: "refresh_token",
                refresh_token: refreshToken,
                client_id: clientId,
              }),
              { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
            );

            token = response.data.access_token;
            refreshToken = response.data.refresh_token;

            // Update cookies with new tokens
            res.cookie("access_token", token, {
              ...CONFIG.COOKIES.OPTIONS,
              maxAge: CONFIG.COOKIES.EXPIRY.ACCESS,
            });
            res.cookie("refresh_token", refreshToken, {
              ...CONFIG.COOKIES.OPTIONS,
              maxAge: CONFIG.COOKIES.EXPIRY.REFRESH,
            });

            decoded = jwt.verify(token, pubKey, { algorithms: ["RS256"] });
            debug.log("Middleware", "✅ Token refreshed");
          } catch (refreshErr) {
            debug.error("Middleware", "❌ Token refresh failed", refreshErr.message);
            throw new CustomError("Token expired and refresh failed", 401);
          }
        } else {
          throw new CustomError("Invalid token", 401);
        }
      }

      // ===== Extract role from token =====
      const userRoles = decoded?.realm_access?.roles || [];
      const userRole = ROLE_PRIORITY.find((r) => 
        userRoles.some((ur) => ur.toLowerCase() === r.toLowerCase())
      ) || "guest";

      // ===== Check if role is allowed =====
      if (!allowedRoles.includes(userRole)) {
        debug.error("Middleware", "❌ Role not allowed", { userRole, allowedRoles });
        throw new CustomError("Access denied: insufficient permissions", 403);
      }

      // ===== Attach basic info to request =====
      req.user = decoded;
      req.role = userRole;
      req.realm = realm;
      req.clientId = clientId;
      req.token = token;
      req.keycloak_user_id = decoded.sub;

      // ===== Tenant & Guest: skip DB lookup =====
      if (["tenant", "guest"].includes(userRole)) {
        req.tenant_id = decoded?.tenant_id || null;
        req.clinic_id = decoded?.clinic_id || null;
        debug.log("Middleware", "✅ Tenant/Guest role - skipping DB lookup");
        return next();
      }

      // ===== Other roles: verify in database =====
      const dbUser = await UserService.verifyTokenInDB(token, userRole);

      // console.log("Middleware", "DB user verification result", dbUser);
      
      if (!dbUser || dbUser.status !== 1) {
        throw new CustomError("User not found or inactive in system", 401);
      }

      // ===== Attach DB user data to request =====
      req.tenant_id = dbUser.tenant_id;
      req.clinic_id = dbUser.clinic_id;
      req.dbUser = dbUser;

      debug.log("Middleware", "✅ Authentication successful", {
        userId: dbUser.user_id,
        role: userRole,
        clinicId: dbUser.clinic_id,
      });

      return next();

    } catch (err) {
      debug.error("Middleware", "❌ Authentication failed", err);
      
      if (err instanceof CustomError) {
        return res.status(err.statusCode).json({ message: err.message });
      }
      
      return res.status(500).json({
        status: "error",
        message: "Authentication failed",
        error: err.message,
      });
    }
  };
};

// ============================================================================
// 🔐 LEGACY: validateToken (for backward compatibility)
// ============================================================================
const validateToken = async (req, res, next) => {
  debug.log("Middleware", "🔐 validateToken (legacy)");
  
  try {
    const session_id = req.cookies?.session_id || req.headers["session-id"];
    if (!session_id) {
      return next(new CustomError(MESSAGES.UNAUTHORIZED, 401));
    }
    
    const session = await SessionService.get(session_id);
    if (!session) {
      return next(new CustomError(MESSAGES.UNAUTHORIZED, 401));
    }

    let token = session.access_token || req.cookies?.access_token;
    if (!token && req.headers.authorization) {
      const parts = req.headers.authorization.split(" ");
      if (parts[0] === "Bearer") token = parts[1];
    }
    if (!token) {
      return next(new CustomError("Token missing", 401));
    }

    try {
      req.tokenData = jwt.verify(token, CONFIG.KEYCLOAK.PUBLIC_KEY, {
        algorithms: ["RS256"],
      });
      
      req.session = session;
      req.user = req.tokenData;
      req.user_id = session.user_id;
      req.tenant_id = session.tenant_id;
      req.clinic_id = session.clinic_id || null;
      req.role = session.role;
      req.keycloak_user_id = session.keycloak_user_id;

      debug.log("Middleware", "✅ Token valid");
      next();
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        // Attempt refresh logic here if needed
        return next(new CustomError("Token expired", 401));
      }
      return next(new CustomError("Invalid token", 401));
    }
  } catch (err) {
    debug.error("Middleware", "Auth middleware crash", err);
    return next(new CustomError("Authentication failed", 401));
  }
};

// ============================================================================
// 🚦 ROUTE HANDLERS
// ============================================================================

// --- GET /me ---
router.get("/me", validateToken, async (req, res) => {
  debug.log("Route", "📍 GET /me called", {
    sessionId: req.cookies?.session_id,
    userId: req.session?.user_id,
    role: req.role,
  });

  try {
    // For tenant/guest, return minimal info from token
    if (["tenant", "guest"].includes(req.role)) {
      return res.json({
        user_id: null,
        keycloak_user_id: req.keycloak_user_id,
        username: req.user?.preferred_username,
        email: req.user?.email,
        role: req.role,
        tenant_id: req.tenant_id,
        clinic_id: req.clinic_id,
        clinics: [],
      });
    }

    // For other roles, fetch from DB
    const dbUser = await getUserByKeycloakIdAndRole(
      req.keycloak_user_id,
      req.role
    );

    if (!dbUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Fetch clinics
    let clinics = [];
    let conn;
    try {
      conn = await pool.getConnection();
      clinics = await getClinicsByTenantIdAndUserId(
        dbUser.tenant_id,
        dbUser.user_id,
        req.role,
        conn
      );
    } finally {
      if (conn) conn.release();
    }

    const responseData = {
      user_id: Number(dbUser.user_id),
      keycloak_user_id: dbUser.keycloak_id,
      username: dbUser.username,
      first_name: dbUser.first_name,
      last_name: dbUser.last_name,
      email: dbUser.email,
      phone_number: dbUser.phone_number,
      profile_picture: dbUser.profile_picture,
      role: req.role,
      tenant_id: Number(dbUser.tenant_id),
      clinic_id: Number(dbUser.clinic_id),
      clinics: clinics.map((c) => ({
        clinic_id: Number(c.clinic_id),
        clinic_name: c.clinic_name,
        // branch_code: c.branch_code,
        address: c.address,
        city: c.city,
        state: c.state,
        pincode: c.pin_code,
      })),
      default_clinic_id: Number(dbUser.clinic_id),
    };

    debug.log("Route", "✅ Sending user data");
    res.json(responseData);
    
  } catch (error) {
    debug.error("Route", "ME API ERROR", error);
    res.status(500).json({ message: "Failed to load user" });
  }
});

// --- POST /login ---
router.post("/login", async (req, res) => {
  console.log("Route", "📍 POST /login called", {
    username: req.body.username,
    host: req.body.host,
  });

  try {
    const { username, password, host } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: "Username and password required" });
    }

    const tenantConfig = CONFIG.HOST_REALM_CLIENT[host];
    if (!tenantConfig) {
      return res.status(400).json({ error: MESSAGES.INVALID_HOST });
    }
    const { realm, clientId } = tenantConfig;

    // 🔐 Keycloak Login
    const tokens = await keycloakLogin(
      username.toLowerCase(),
      password,
      realm,
      clientId,
    );
    debug.log("Route", "Keycloak login successful");

    const decoded = decodeToken(tokens.access_token);
    const info = extractUserInfo(decoded);
    const role = info.role;

    // ✅ Tenant/Guest: skip DB verification
    let dbUser = null;
    if (!["tenant", "guest"].includes(role)) {
      dbUser = await UserService.verifyTokenInDB(tokens.access_token, role);
      if (!dbUser || dbUser.status !== 1) {
        return res.status(403).json({ message: "User account is inactive" });
      }
    }

    // Build context
    const userContext = await ContextService.build(tokens.access_token, dbUser, role);
    
    // Network details for audit
    const ip = getIp(req);
    const geo = await getGeoInfo(ip);
    const ua = getUserAgentInfo(req);
    const networkDetails = {
      ip_address: ip,
      country: geo.country,
      state: geo.state,
      city: geo.city,
      isp: geo.isp,
      network_type: req.body.network_type || "Unknown",
    };

    // Create session
    const session_id = await SessionService.create(
      res,
      userContext,
      tokens,
      clientId,
      realm,
      networkDetails,
    );
    userContext.session_id = session_id;

    // Audit logging (skip for tenant/guest)
    if (!["tenant", "guest"].includes(role)) {
      await AuditService.logLogin(
        userContext,
        req,
        geo,
        ua,
        dbUser,
        networkDetails,
      );
    }

    debug.log("Route", "✅ Login successful", {
      userId: userContext.user_id,
      role: userContext.role,
    });

    return res.status(200).json(userContext);
    
  } catch (err) {
    debug.error("Route", "Login failed", err);
    return res.status(401).json({ message: MESSAGES.INVALID_CREDENTIALS });
  }
});

// --- POST /logout ---
router.post("/logout", async (req, res) => {
  debug.log("Route", "📍 POST /logout called", {
    sessionId: req.cookies?.session_id,
  });

  try {
    await AuditService.logLogout(
      req.cookies?.session_id,
      req.body?.reason,
      req.keycloak_user_id || req.cookies?.user_id,
    );
    await SessionService.destroy(req, res);
    
    debug.log("Route", "✅ Logout successful");
    return res.status(200).json({ success: true, message: "Logout successful" });
    
  } catch (err) {
    debug.error("Route", "Logout failed", err);
    return res.status(500).json({ success: false, message: "Logout failed" });
  }
});

// --- POST /refresh-token ---
router.post("/refresh-token", async (req, res, next) => {
  debug.log("Route", "📍 POST /refresh-token called");
  
  const refreshToken = req.cookies.refresh_token;
  const realm = req.headers["x-realm"] || process.env.KEYCLOAK_REALM;
  const clientId = req.headers["x-clientid"] || req.cookies.clientId;

  if (!refreshToken || !realm || !clientId) {
    return next(new CustomError("Missing refresh token or config", 401));
  }

  try {
    const tokenData = await keycloakRefresh(refreshToken, realm, clientId);
    
    res.cookie("access_token", tokenData.access_token, {
      ...CONFIG.COOKIES.OPTIONS,
      maxAge: tokenData.expires_in * 1000,
    });
    res.cookie("refresh_token", tokenData.refresh_token, {
      ...CONFIG.COOKIES.OPTIONS,
      maxAge: CONFIG.COOKIES.EXPIRY.REFRESH,
    });

    const decoded = decodeToken(tokenData.access_token);
    const userInfo = extractUserInfo(decoded);

    res.status(200).json({
      success: true,
      username: userInfo.preferred_username,
      role: userInfo.role,
      expires_in: tokenData.expires_in,
    });
    
  } catch (err) {
    debug.error("Route", "Token refresh failed", err);
    next(new CustomError(err.message || "Token refresh failed", 401));
  }
});

// ============================================================================
// 🚀 STARTUP & EXPORTS
// ============================================================================
(async () => {
  try {
    const health = await checkRedisHealth();
    debug.info("SSO_AUTH", `🔐 Redis health: ${health.status}`);
  } catch (err) {
    debug.error("SSO_AUTH", "❌ Redis health check failed", err);
  }
})();

debug.info("SSO_AUTH", "🔐 Dental authentication module loaded");
debug.info("SSO_AUTH", `Routes: /me, /login, /logout, /refresh-token`);

module.exports = {
  router,
  validateToken,
  authenticateTenantClinicGroup, // ✅ New middleware for Dental app
  redisGracefulShutdown,
};