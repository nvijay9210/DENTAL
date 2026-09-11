const jwt = require("jsonwebtoken");
const axios = require("axios");
const qs = require("querystring");

const { CustomError } = require("../middlewares/CustomeError");

const {
  getUserByTenantClinicAndKeycloakId,
  getUserByKeycloakId,
} = require("../utils/Reusability");

const { getTenantByTenantId } = require("../models/TenantModel");

const { decodeToken } = require("./KeycloakAdmin");

const { getClinicsByKeycloakId } = require("../services/ClinicService");

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
// COOKIE OPTIONS
// ============================================================

function getCookieOptions() {
  const isProduction = process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "None" : "Lax",
  };
}

// ============================================================
// ROLE
// ============================================================

function getUserRole(decoded) {
  const userRoles = decoded?.realm_access?.roles || [];

  return ROLE_PRIORITY.find((role) => userRoles.includes(role)) || "guest";
}

// ============================================================
// TOKEN EXTRACTION
// ============================================================

function extractTokens(req) {
  const token =
    req.cookies?.access_token ||
    req.headers.authorization?.split(" ")[1] ||
    req.headers["access_token"];

  const refreshToken =
    req.cookies?.refresh_token || req.headers["refresh_token"];

  return {
    token,
    refreshToken,
  };
}

// ============================================================
// VERIFY TOKEN
// ============================================================

function verifyAccessToken(token) {
  try {
    return jwt.verify(token, getPublicKey(), {
      algorithms: ["RS256"],
    });
  } catch (error) {
    if (error.name !== "TokenExpiredError") {
      throw new CustomError("Invalid token", 401);
    }

    throw error;
  }
}

// ============================================================
// GET EXPIRED TOKEN DATA
// ============================================================

function decodeExpiredToken(token) {
  const decoded = jwt.decode(token);

  if (!decoded) {
    throw new CustomError("Invalid expired token", 401);
  }

  return decoded;
}

// ============================================================
// REFRESH TOKEN
// ============================================================

async function refreshAccessToken(refreshToken, tenantId, realm, res) {
  if (!refreshToken) {
    throw new CustomError("Refresh token missing", 401);
  }

  const tenantConfig = await getTenantByTenantId(tenantId);

  if (!tenantConfig) {
    throw new CustomError("Tenant not found", 404);
  }

  const clientId = tenantConfig.tenant_domain;

  const tokenUrl =
    `${process.env.KEYCLOAK_BASE_URL}` +
    `/realms/${realm}` +
    `/protocol/openid-connect/token`;

  try {
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

    const newAccessToken = response.data.access_token;

    const newRefreshToken = response.data.refresh_token;

    saveTokensToCookies(res, newAccessToken, newRefreshToken);

    const decoded = jwt.verify(newAccessToken, getPublicKey(), {
      algorithms: ["RS256"],
    });

    return {
      token: newAccessToken,
      refreshToken: newRefreshToken,
      decoded,
    };
  } catch (error) {
    console.error(
      "Refresh Token Error:",
      error?.response?.data || error.message,
    );

    throw new CustomError("Session expired", 401);
  }
}

// ============================================================
// SAVE TOKENS TO COOKIE
// ============================================================

function saveTokensToCookies(res, accessToken, refreshToken) {
  const cookieOptions = getCookieOptions();

  res.cookie("access_token", accessToken, {
    ...cookieOptions,
    maxAge: Number(process.env.ACCESS_COOKIE_EXPIRE_TIME) * 1000,
  });

  res.cookie("refresh_token", refreshToken, {
    ...cookieOptions,
    maxAge: Number(process.env.REFRESH_COOKIE_EXPIRE_TIME) * 1000,
  });
}

// ============================================================
// VERIFY OR REFRESH TOKEN
// ============================================================

async function verifyOrRefreshToken(token, refreshToken, realm, res) {
  try {
    const decoded = verifyAccessToken(token);

    return {
      token,
      refreshToken,
      decoded,
    };
  } catch (error) {
    if (error.name !== "TokenExpiredError") {
      throw error;
    }

    const expiredDecoded = decodeExpiredToken(token);

    const tenantId = expiredDecoded?.tenant_id;

    if (!tenantId) {
      throw new CustomError("Tenant ID missing from token", 401);
    }

    return refreshAccessToken(refreshToken, tenantId, realm, res);
  }
}

// ============================================================
// CHECK REQUIRED ROLE
// ============================================================

function authorizeRole(userRole, requiredRoles) {
  const hasRequiredRole =
    requiredRoles.length === 0 || requiredRoles.includes(userRole);

  if (!hasRequiredRole) {
    throw new CustomError("Access denied", 403);
  }
}

// ============================================================
// GET CLINIC ACCESS
// ============================================================

async function getClinicAccess(decoded) {
  return getClinicsByKeycloakId(decoded.sub);
}

// ============================================================
// RESOLVE ACTIVE TENANT
// ============================================================

function resolveActiveTenant(userRole, decoded, activeClinic) {
  if (userRole === "tenant") {
    return decoded?.tenant_id || null;
  }

  return activeClinic?.tenant_id || null;
}

// ============================================================
// VALIDATE CLINIC ACCESS
// ============================================================

function validateClinicAccess(userRole, clinicAccess) {
  const hasClinicAccess = clinicAccess.length > 0;

  if (userRole !== "tenant" && !hasClinicAccess) {
    throw new CustomError("Clinic access denied", 403);
  }
}

// ============================================================
// GET ACTIVE CLINIC
// ============================================================

function getActiveClinic(clinicAccess) {
  return clinicAccess[0] || null;
}

// ============================================================
// GET DB USER
// ============================================================

async function resolveDbUser(userRole, activeClinic, decoded) {
  const shouldValidate =
    userRole !== "tenant" && userRole !== "guest" && activeClinic;

  if (!shouldValidate) {
    return null;
  }

  const dbUser = await getUserByTenantClinicAndKeycloakId(
    userRole,
    activeClinic.tenant_id,
    activeClinic.clinic_id,
    decoded.sub,
  );

  if (!dbUser) {
    throw new CustomError("User not found", 404);
  }

  return dbUser;
}

// ============================================================
// SET REQUEST CONTEXT
// ============================================================

function setRequestContext(
  req,
  {
    decoded,
    token,
    realm,
    userRole,
    activeTenantId,
    activeClinic,
    clinicAccess,
    dbUser,
  },
) {
  req.user = decoded;

  req.role = userRole;

  req.realm = realm;

  req.token = token;

  req.tenant_id = activeTenantId;

  req.clinic_id = activeClinic?.clinic_id || null;

  req.clinic_access = clinicAccess;

  req.related_clinic_ids = clinicAccess.map((clinic) => clinic.clinic_id);

  req.dbUser = dbUser;
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

  req.role = role;

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
      // TOKENS
      // ======================================================

      const { token: originalToken, refreshToken: originalRefreshToken } =
        extractTokens(req);

      if (!originalToken) {
        throw new CustomError("Access token missing", 401);
      }

      const realm = process.env.KEYCLOAK_REALM;

      // ======================================================
      // VERIFY / REFRESH
      // ======================================================

      const { token, refreshToken, decoded } = await verifyOrRefreshToken(
        originalToken,
        originalRefreshToken,
        realm,
        res,
      );

      // ======================================================
      // ROLE
      // ======================================================

      const userRole = getUserRole(decoded);

      authorizeRole(userRole, requiredRoles);

      // ======================================================
      // CLINIC ACCESS
      // ======================================================

      const clinicAccess = await getClinicAccess(decoded);

      validateClinicAccess(userRole, clinicAccess);

      // ======================================================
      // ACTIVE CLINIC
      // ======================================================

      const activeClinic = getActiveClinic(clinicAccess);

      // ======================================================
      // ACTIVE TENANT
      // ======================================================

      const activeTenantId = resolveActiveTenant(
        userRole,
        decoded,
        activeClinic,
      );

      // ======================================================
      // DATABASE USER
      // ======================================================

      const dbUser = await resolveDbUser(userRole, activeClinic, decoded);

      // ======================================================
      // REQUEST CONTEXT
      // ======================================================

      setRequestContext(req, {
        decoded,
        token,
        refreshToken,
        realm,
        userRole,
        activeTenantId,
        activeClinic,
        clinicAccess,
        dbUser,
      });

      return next();
    } catch (error) {
      return handleAuthenticationError(error, res);
    }
  };
}

// ============================================================
// AUTHENTICATION ERROR
// ============================================================

function handleAuthenticationError(error, res) {
  console.error("Authentication Error:", error);

  if (error instanceof CustomError) {
    return res.status(error.statusCode).json({
      status: "error",
      message: error.message,
    });
  }

  return res.status(500).json({
    status: "error",
    message: "Authentication failed",
  });
}

// ============================================================
// KEYCLOAK USER CHECK
// ============================================================

async function checkUserInKeycloak(token, realm, userId) {
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

    throw new CustomError("Failed to verify user in Keycloak", 404);
  }
}

// ============================================================
// VERIFY USER TOKEN IN DATABASE
// ============================================================

async function verifyUserTokenInDB(token) {
  try {
    if (!token) {
      throw new CustomError("Missing token", 401);
    }

    // ========================================================
    // VERIFY JWT
    // ========================================================

    const decoded = jwt.verify(token, getPublicKey(), {
      algorithms: ["RS256"],
    });

    const userId = decoded.sub;

    const username = decoded?.preferred_username;

    // ========================================================
    // ROLE
    // ========================================================

    const userRole = getUserRole(decoded);

    // ========================================================
    // TENANT / GUEST
    // ========================================================

    if (userRole === "tenant" || userRole === "guest") {
      return {
        dbUser: {
          userId,
          username,
          role: userRole,
        },
        role: userRole,
      };
    }

    // ========================================================
    // OTHER ROLES
    // ========================================================

    const dbUser = await getUserByKeycloakId(userRole, userId);

    return {
      dbUser,
      role: userRole,
    };
  } catch (error) {
    if (error instanceof CustomError) {
      throw error;
    }

    throw new CustomError(error.message || "Token validation failed", 500);
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
