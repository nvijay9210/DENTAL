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
  keycloakLogin,
  getClientCredential,
  getUserByUsername,
  addUser,
  getUserIdByUsername,
} = require("./KeycloakAdmin");
const { getTenantByTenantId } = require("../services/TenantService");
const { getClinicByTenantIdAndClinicId } = require("../services/ClinicService");
const { buildUserContext } = require("../utils/BuildUserContext");
const { verifyUserTokenInDB } = require("./AuthenticateTenantAndClient");
const {
  sendOTP,
  verifyOTP,
} = require("../Modules/MailSmsOtp/MailSmsOtpService");
const { getUserByTenantClinicAndKeycloakId } = require("../utils/Reusability");
const {
  generateOTP,
  sendWhatsAppOTP,
  generateUsername,
  generateAlphanumericPassword,
} = require("../utils/Helpers");
const { decode } = require("jsonwebtoken");
const { generateAppBAccessToken } = require("../utils/CodeGenerator");

const router = express.Router();
router.use(cookieParser());

// === DEBUG LOG HELPER ===
const log = (label, message, data = null) => {
  console.log(
    `[KeycloakAuth] ${label}:`,
    message,
    data ? `\nData: ${JSON.stringify(data, null, 2)}` : ""
  );
};

const sendOtpToRedis = async (phoneNumber, otp, ttlSeconds = 300) => {
  try {
    const key = `otp:${phoneNumber}`; // namespace your OTP key
    await setCache(key, { otp }, ttlSeconds); // store OTP object
    console.log(`OTP cached for ${phoneNumber}, expires in ${ttlSeconds}s`);
  } catch (err) {
    console.error("Failed to store OTP in cache:", err);
  }
};

const finalizeLogin = async (req, res) => {
  log("FINALIZE_LOGIN", "Building user context and setting cookies");

  const { host } = req.body;
  const HOST_REALM_CLIENT = JSON.parse(process.env.HOST_REALM_CLIENT);
  const tenantConfig = HOST_REALM_CLIENT[host];
  if (!tenantConfig) return res.status(400).json({ error: "Invalid host" });

  const { realm, clientId } = tenantConfig;
  // console.log(clientId);

  try {
    const { access_token, refresh_token } = req.tokens;
    const dbUser = req.dbUser;
    console.log('dbuser:',dbUser)
    const userContext = await buildUserContext(access_token, dbUser);

    const isProduction = process.env.NODE_ENV === "production";
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "None" : "Lax",
    };

    log("TOKEN_SAVE", "✅ token save prcess — responding with cookie");

    res.cookie("access_token", access_token, {
      ...cookieOptions,
      maxAge: 2 * 60 * 60 * 1000,
    });
    res.cookie("refresh_token", refresh_token, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.cookie("clientId", clientId, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.cookie("realm", realm, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    log("FINALIZE_LOGIN", "✅ Login complete — responding with context");
    return res.status(200).json(userContext);
  } catch (err) {
    log("FINALIZE_LOGIN", "💥 Finalize failed", { error: err.message });
    throw new CustomError(err.message || "Login finalization failed", 401);
  }
};

router.post("/assets", async (req, res) => {
  const userToken = req.cookies.access_token;
  const { user } = req.body;

  const ssoToken = await generateAppBAccessToken({
    user,
    token: userToken,
    realm: req.cookies.realm,
    clientid: req.cookies.clientId,
  });

  // console.log(user,userToken,ssoToken)

  res.status(200).send({ data: ssoToken });
});

// router.get('/hi',(req,res)=>{
//  res.status(200).json('hello')

// })

router.post("/tokensave", (req, res) => {
  try {
    const {
      access_token,
      refresh_token,
      access_expires_in, // in seconds (optional)
      refresh_expires_in, // in seconds (optional)
    } = req.body;

    if (!access_token || !refresh_token) {
      return res
        .status(400)
        .json({ success: false, message: "Missing tokens in request body" });
    }

    const isProduction = process.env.NODE_ENV === "production";

    const baseOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "None" : "Lax",
      path: "/",
    };

    // Access token expiry time — default 15 minutes if not provided
    const accessExpiry = (access_expires_in || 15 * 60) * 1000; // convert sec → ms

    // Refresh token expiry time — default 7 days if not provided
    const refreshExpiry = (refresh_expires_in || 7 * 24 * 60 * 60) * 1000;

    // Set cookies
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

// =========================
// WhatsApp OTP Login Route
// =========================

const otpStore = {};

router.post("/login", async (req, res) => {
  log("LOGIN_FLOW", "🚀 Starting login flow", { body: req.body });
  try {
    const { username, password, host, otp } = req.body;

    if (!username) {
      return res.status(400).json({ message: "Username is required" });
    }

    // Initialize temploginstore in session
    if (!req.session.temploginstore) req.session.temploginstore = {};

    const HOST_REALM_CLIENT = JSON.parse(process.env.HOST_REALM_CLIENT);
    const tenantConfig = HOST_REALM_CLIENT[host];
    if (!tenantConfig) return res.status(400).json({ error: "Invalid host" });

    const { realm, clientId } = tenantConfig;

    // =========================
    // OTP verification step
    // =========================
    if (otp) {
      log("OTP_VERIFY", "Verifying OTP", { username, otp });

      const record = req.session.temploginstore[username];
      if (!record) {
        log("OTP_VERIFY", "❌ No pending login session");
        return res.status(400).json({ message: "No login found" });
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

      // Remove temp login session for this user
      delete req.session.temploginstore[username];

      return finalizeLogin(req, res);
    }

    // =========================
    // Initial credentials check
    // =========================
    if (!password) {
      log("LOGIN_FLOW", "❌ Missing password");
      return res
        .status(400)
        .json({ message: "Username and password required" });
    }

    // =========================
    // Keycloak authentication
    // =========================
    log("KEYCLOAK_AUTH", "Authenticating with Keycloak", {
      username,
      realm,
      clientId,
    });

    const tokens = await keycloakLogin(username, password, realm, clientId);
    log("KEYCLOAK_AUTH", "✅ Keycloak auth successful");

    // =========================
    // Verify in DB
    // =========================
    const dbUser = await verifyUserTokenInDB(tokens.access_token);
    log("DB_VERIFY", "✅ DB verification complete", { role: dbUser.role });

    // Skip OTP for tenant or guest
    if (dbUser.role === "tenant" || dbUser.role === "guest") {
      log("TENANT_BYPASS", "Tenant user — skipping OTP");
      req.tokens = tokens;
      req.dbUser = dbUser;
      return finalizeLogin(req, res);
    }

    // =========================
    // Check clinic OTP setting
    // =========================
    const clinic = await getClinicByTenantIdAndClinicId(
      dbUser.dbUser.tenant_id,
      dbUser.dbUser.clinic_id
    );

    if (!clinic || clinic.otp === 0) {
      log("CLINIC_OTP_CHECK", "✅ OTP disabled — proceeding to login");
      req.tokens = tokens;
      req.dbUser = dbUser;
      return finalizeLogin(req, res);
    }

    // =========================
    // Send OTP to user
    // =========================
    const user2 = await getUserByTenantClinicAndKeycloakId(
      dbUser.role,
      dbUser.dbUser.tenant_id,
      dbUser.dbUser.clinic_id,
      dbUser.dbUser.keycloak_id
    );

    const via = clinic.otp_type;
    const key = via === "email" ? user2.email : `+${user2.phone_number}`;

    const payload = {
      to: key,
      via,
      message: "Your Verification OTP",
      subject: "OTP Verification",
      username,
      session: req.session, // important for session-based OTP
    };

    log("OTP_SEND", "Sending OTP", { to: key, via });
    const otps = await sendOTP(payload);

    // Save tokens and DB user in session under actual username
    req.session.temploginstore[username] = { tokens, dbUser };
    log("OTP_SEND", "✅ OTP sent and session stored");

    return res.status(200).json({
      message: "OTP sent",
      step: "otp",
      to: key,
      otpDetails: process.env.NODE_ENV === "development" ? otps : undefined,
    });
  } catch (err) {
    log("LOGIN_FLOW", "💥 Login failed", {
      message: err.message,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
    return res
      .status(401)
      .json({ message: err.message || "Invalid credentials" });
  }
});

// POST /login
// router.post("/login", async (req, res) => {
//   try {
//     const { username, password, host } = req.body;

//     const tenantConfig = process.env.HOST_REALM_CLIENT[host];
//     if (!tenantConfig) return res.status(400).json({ error: "Invalid host" });

//     const { realm, clientId } = tenantConfig;

//     const data = new URLSearchParams();
//     data.append("client_id", clientId);
//     data.append("grant_type", "password");
//     data.append("username", username);
//     data.append("password", password);

//     const response = await axios.post(
//       `${KEYCLOAK_BASE_URL}/realms/${realm}/protocol/openid-connect/token`,
//       data,
//       { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
//     );

//     res.json(response.data); // access_token, refresh_token, etc.
//   } catch (err) {
//     res.status(err.response?.status || 500).json(err.response?.data || err.message);
//   }
// });

// Refresh Token
router.post("/refresh-token", async (req, res, next) => {
  log("REFRESH_TOKEN", "Refreshing access token");
  const refreshToken = req.cookies.refresh_token;
  const realm = req.headers["x-realm"];
  const clientid = req.headers["x-clientid"];

  if (!refreshToken) {
    log("REFRESH_TOKEN", "❌ No refresh token in cookies");
    return next(new CustomError("No refresh token found", 401));
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
        userInfo.clinicId
      );
    }

    const isProduction = process.env.NODE_ENV === "production";
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

    log("REFRESH_TOKEN", "✅ Token refreshed successfully");
    res.status(200).json(responseData);
  } catch (err) {
    log("REFRESH_TOKEN", "💥 Refresh failed", {
      error: err.response?.data || err.message,
    });
    next(
      new CustomError(err.response?.data?.error_description || err.message, 401)
    );
  }
});

// Logout
// router.post("/logout", async (req, res, next) => {
//   log("LOGOUT", "Initiating logout");
//   try {
//     const refreshToken = req.cookies?.refresh_token;
//     const realm = req.headers["x-realm"];
//     const clientid = req.headers["x-clientid"];

//     if (refreshToken && realm && clientid) {
//       try {
//         const tokenUrl = `${process.env.KEYCLOAK_BASE_URL}/realms/${realm}/protocol/openid-connect/logout`;
//         await axios.post(
//           tokenUrl,
//           qs.stringify({
//             client_id: clientid,
//             client_secret: getClientCredential(clientid),
//             refresh_token: refreshToken,
//           }),
//           { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
//         );
//         log("LOGOUT", "✅ Keycloak session revoked");
//       } catch (err) {
//         log("LOGOUT", "⚠️ Keycloak logout warning", { error: err.message });
//       }
//     }

//     const isProduction = process.env.NODE_ENV === "production";
//     res.clearCookie("access_token", {
//       httpOnly: true,
//       secure: isProduction,
//       sameSite: isProduction ? "None" : "Lax",
//       path: "/",
//     });
//     res.clearCookie("refresh_token", {
//       httpOnly: true,
//       secure: isProduction,
//       sameSite: isProduction ? "None" : "Lax",
//       path: "/",
//     });
//     res.clearCookie("client_id", {
//       httpOnly: true,
//       secure: isProduction,
//       sameSite: isProduction ? "None" : "Lax",
//       path: "/",
//     });

//     log("LOGOUT", "✅ Cookies cleared — logout complete");
//     return res
//       .status(200)
//       .json({ success: true, message: "Logged out successfully" });
//   } catch (err) {
//     log("LOGOUT", "💥 Logout failed", { error: err });
//     next(new CustomError("Logout failed", 500));
//   }
// });

router.post("/logout", (req, res) => {
  try {
    const isProduction = process.env.NODE_ENV === "production";

    // Clear cookies
    res.clearCookie("access_token", {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "None" : "Lax",
      path: "/",
    });
    res.clearCookie("refresh_token", {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "None" : "Lax",
      path: "/",
    });

    console.log("✅ Token cookies removed successfully");

    return res.status(200).json({
      success: true,
      message: "Tokens cleared from cookies",
    });
  } catch (err) {
    console.error("💥 Failed to clear cookies:", err);
    return res.status(500).json({
      success: false,
      message: "Error clearing cookies",
    });
  }
});

// Forgot Password
router.post("/forgettenpassword", async (req, res, next) => {
  log("FORGOT_PASSWORD", "Forgot password request", req.body);

  try {
    const { username, host } = req.body;

    if (!username) {
      return res.status(400).json({ message: "Username is required" });
    }

    // Initialize session store for forgot password OTPs
    if (!req.session.forgotPasswordStore) req.session.forgotPasswordStore = {};

    const HOST_REALM_CLIENT = JSON.parse(process.env.HOST_REALM_CLIENT);
    const tenantConfig = HOST_REALM_CLIENT[host];
    if (!tenantConfig) return res.status(400).json({ error: "Invalid host" });

    const { realm, clientId } = tenantConfig;

    // Keycloak admin login to fetch user
    const tokenRes = await keycloakLogin(
      process.env.VIEW_USER_USERNAME,
      process.env.VIEW_USER_PASS,
      realm,
      clientId
    );
    const adminToken = tokenRes.access_token;

    const user = await getUserByUsername(adminToken, realm, username);
    if (!user) {
      log("FORGOT_PASSWORD", "❌ User not found");
      return res.status(404).json({ message: "User not found" });
    }

    const clinic = await getClinicByTenantIdAndClinicId(
      user?.attributes?.tenant_id[0],
      user?.attributes?.clinic_id[0]
    );
    if (!clinic) {
      log("FORGOT_PASSWORD", "❌ Clinic not found");
      return res.status(404).json({ message: "Clinic not found" });
    }

    if (!clinic.otp) {
      log("FORGOT_PASSWORD", "💥 OTP option is not enabled for this clinic");
      return res.status(400).json({ message: "OTP option not enabled" });
    }

    // Determine where to send OTP
    let sendValue;
    const via = clinic?.otp_type;
    if (via === "sms") sendValue = user.attributes?.phoneNumber?.[0];
    else if (via === "email") sendValue = user.attributes?.email?.[0];
    else if (via === "whatsapp")
      sendValue = user.attributes?.whatsappNumber?.[0];

    if (!sendValue) {
      log("FORGOT_PASSWORD", "❌ No contact value found for OTP");
      return res
        .status(400)
        .json({ message: "No contact value found for OTP" });
    }

    // Send OTP and store in session
    const otpResponse = await sendOTP({
      to: sendValue,
      username,
      via,
      message: "Your password reset OTP",
      length: 6,
      expiryMinutes: 10,
      session: req.session, // pass session to store OTP
    });

    // Store OTP details in session for verification
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

// Reset Password
router.post("/reset-password", async (req, res, next) => {
  log("RESET_PASSWORD_ROUTE", "Password reset request", req.body);
  try {
    const { username, newPassword, host } = req.body;
    const HOST_REALM_CLIENT = JSON.parse(process.env.HOST_REALM_CLIENT);
    const tenantConfig = HOST_REALM_CLIENT[host];
    if (!tenantConfig) return res.status(400).json({ error: "Invalid host" });
    const { realm, clientId } = tenantConfig;

    if (!username || !newPassword) {
      return res
        .status(400)
        .json({ message: "Username and newPassword are required" });
    }

    const tokenResponse = await keycloakLogin(
      process.env.VIEW_USER_USERNAME,
      process.env.VIEW_USER_PASS,
      realm,
      clientId
    );
    const adminToken = tokenResponse.access_token;

    const userResponse = await axios.get(
      `${process.env.KEYCLOAK_BASE_URL}/admin/realms/${realm}/users?username=${username}`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
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
      }
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

router.post("/register", async (req, res, next) => {
  log("USER_REGISTER_IN_KEYCLOAK", "user register process", req.body);
  try {
    const { email, firstname, lastname, phone, host } = req.body;
    const HOST_REALM_CLIENT = JSON.parse(process.env.HOST_REALM_CLIENT);
    const tenantConfig = HOST_REALM_CLIENT[host];
    if (!tenantConfig) return res.status(400).json({ error: "Invalid host" });
    const { realm, clientId } = tenantConfig;

    if (!firstname || !lastname || !phone) {
      return res
        .status(400)
        .json({ message: "Firstname lasname phonenumber are required" });
    }

    const tokenResponse = await keycloakLogin(
      process.env.VIEW_USER_USERNAME,
      process.env.VIEW_USER_PASS,
      realm,
      clientId
    );
    const adminToken = tokenResponse.access_token;

    const username = await generateUsername("GST", realm, adminToken);

    const password = "1234" || generateAlphanumericPassword(12);

    const userEmail =
      email || `${username}${generateAlphanumericPassword(6)}@example.com`;

    const userData = {
      username,
      email: userEmail || "",
      emailVerified: true,
      firstName: firstname,
      lastName: lastname,
      attributes: {
        phoneNumber: phone || "",
        tenant_id: tokenResponse?.tenant_id || "",
        clinic_id: tokenResponse?.clinic_id || "",
      },
      password: password,
    };

    const isUserCreated = await addUser(adminToken, realm, userData);
    if (!isUserCreated)
      throw new CustomError("Keycloak user creation failed", 400);

    log("USER_CREATED", "✅ User Created successfully");
    return res.status(200).json({ message: "User Created successfully" });
  } catch (err) {
    log("USER_CREATED", "💥 Error", {
      error: err.response?.data || err.message,
    });
    next(new CustomError(err.response?.data?.error || err.message, 500));
  }
});

module.exports = router;
