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
const { generateOTP, sendWhatsAppOTP } = require("../utils/Helpers");

const router = express.Router();
router.use(cookieParser());

const tempLoginStore = {};

// === DEBUG LOG HELPER ===
const log = (label, message, data = null) => {
  console.log(
    `[KeycloakAuth] ${label}:`,
    message,
    data ? `\nData: ${JSON.stringify(data, null, 2)}` : ""
  );
};

const finalizeLogin = async (req, res) => {
  log("FINALIZE_LOGIN", "Building user context and setting cookies");
  try {
    const { access_token, refresh_token } = req.tokens;
    const dbUser = req.dbUser;
    const userContext = await buildUserContext(access_token, dbUser);

    const isProduction = process.env.NODE_ENV === "production";
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "None" : "Lax",
    };

    res.cookie("access_token", access_token, {
      ...cookieOptions,
      maxAge: 60 * 60 * 1000,
    });
    res.cookie("refresh_token", refresh_token, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.cookie("clientId", req.body.clientid, {
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

// router.get('/hi',(req,res)=>{
//  res.status(200).json('hello')
  
// })

router.post("/tokensave", (req, res) => {
  try {
    const {
      access_token,
      refresh_token,
      access_expires_in,   // in seconds (optional)
      refresh_expires_in,  // in seconds (optional)
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
router.post("/login-otp", async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    if (!phoneNumber)
      return res.status(400).json({ message: "phoneNumber is required" });

    // Generate OTP
    const otp = generateOTP();
    otpStore[phoneNumber] = { otp, expires: Date.now() + 5 * 60 * 1000 }; // 5 mins

    // Send OTP via WhatsApp
    await sendWhatsAppOTP(phoneNumber, otp);

    return res.status(200).json({
      message: "OTP sent to WhatsApp",
      phoneNumber,
      otp: process.env.NODE_ENV === "development" ? otp : undefined,
    });
  } catch (err) {
    log("LOGIN_OTP", "Error sending OTP", err.message);
    return res.status(500).json({ message: err.message });
  }
});

// =========================
// Verify WhatsApp OTP
// =========================
router.post("/verify-otp", async (req, res) => {
  try {
    const { phoneNumber, otp } = req.body;
    if (!phoneNumber || !otp)
      return res.status(400).json({ message: "phoneNumber and OTP required" });

    const record = otpStore[phoneNumber];
    if (!record)
      return res.status(400).json({ message: "No OTP requested for this number" });

    if (record.expires < Date.now())
      return res.status(400).json({ message: "OTP expired" });

    if (record.otp != otp)
      return res.status(400).json({ message: "Invalid OTP" });

    // OTP valid — fetch user from DB by phoneNumber
    const dbUser = await getUserByTenantClinicAndKeycloakId(
      "user", // role
      null,
      null,
      phoneNumber // assuming you store phoneNumber as keycloak_id or attribute
    );

    if (!dbUser)
      return res.status(404).json({ message: "User not found" });

    // Generate Keycloak-style tokens (or reuse existing token logic)
    const tokens = {
      access_token: jwt.sign(
        { sub: dbUser.id, username: dbUser.username },
        process.env.KEYCLOAK_REALM_PUBLIC_KEY,
        { expiresIn: "1h" }
      ),
      refresh_token: jwt.sign(
        { sub: dbUser.id, username: dbUser.username },
        process.env.KEYCLOAK_REALM_PUBLIC_KEY,
        { expiresIn: "7d" }
      ),
    };

    // Attach to request and finalize login
    req.tokens = tokens;
    req.dbUser = dbUser;
    delete otpStore[phoneNumber];

    return finalizeLogin(req, res);
  } catch (err) {
    log("VERIFY_OTP", "Error verifying OTP", err.message);
    return res.status(500).json({ message: err.message });
  }
});



// Routes
router.post("/login2", async (req, res) => {
  log("LOGIN_FLOW", "🚀 Starting login flow", { body: req.body });
  try {
    const { username, password, realm, clientid, otp, to } = req.body;

    // OTP verification step
    // if (otp) {
    //   log("OTP_VERIFY", "Verifying OTP", { to, otp });
    //   const record = tempLoginStore[to];
    //   if (!record) {
    //     log("OTP_VERIFY", "❌ No pending login session");
    //     return res.status(400).json({ message: "No login found" });
    //   }

    //   const otpResult = verifyOTP({ to, otp });
    //   if (!otpResult.success) {
    //     log("OTP_VERIFY", "❌ Invalid OTP", { reason: otpResult.message });
    //     return res.status(400).json({ message: otpResult.message });
    //   }

    //   log("OTP_VERIFY", "✅ OTP valid — using stored session");
    //   req.tokens = record.tokens;
    //   req.dbUser = record.dbUser;
    //   delete tempLoginStore[to];
    //   return finalizeLogin(req, res);
    // }

    // Initial credentials check
    // if (!username || !password) {
    //   log("LOGIN_FLOW", "❌ Missing username or password");
    //   return res
    //     .status(400)
    //     .json({ message: "Username and password required" });
    // }

    // Keycloak authentication
    // log("KEYCLOAK_AUTH", "Authenticating with Keycloak", {
    //   username,
    //   realm,
    //   clientid,
    // });

    // const tokens = await keycloakLogin(username, password, realm, clientid);

    const tokens = req.body.tokens
    log("KEYCLOAK_AUTH", "✅ Keycloak auth successful");


    // Verify in DB
    log("DB_VERIFY", "Verifying user in application DB");
    const dbUser = await verifyUserTokenInDB(tokens.access_token);
    log("DB_VERIFY", "✅ DB verification complete", { role: dbUser.role });

    // Skip OTP for tenant
    if (dbUser.role === "tenant") {
      log("TENANT_BYPASS", "Tenant user — skipping OTP");
      req.tokens = tokens;
      req.dbUser = dbUser;
      return finalizeLogin(req, res);
    }

    // Check clinic OTP setting
    log("CLINIC_OTP_CHECK", "Fetching clinic settings");
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

    // Fetch user contact for OTP
    // log("OTP_SEND", "OTP required — fetching user contact info");
    // const user2 = await getUserByTenantClinicAndKeycloakId(
    //   dbUser.role,
    //   dbUser.dbUser.tenant_id,
    //   dbUser.dbUser.clinic_id,
    //   dbUser.dbUser.keycloak_id
    // );

    // const via = clinic.otp_type;
    // const key = via === "email" ? user2.email : user2.phoneNumber;
    // const payload = {
    //   email: user2.email,
    //   phone: user2.phoneNumber,
    //   via,
    //   message: "Your Verification OTP",
    //   subject: "OTP Verification",
    // };

    // log("OTP_SEND", "Sending OTP", { to: key, via });
    // const otps = await sendOTP(payload);
    // tempLoginStore[key] = { tokens, dbUser };
    // log("OTP_SEND", "✅ OTP sent and session stored");

    // return res.status(200).json({
    //   message: "OTP sent",
    //   to: key,
    //   otpDetails: process.env.NODE_ENV === "development" ? otps : undefined,
    // });
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
    if (userInfo.role !== "tenant" && userInfo.clinicId) {
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
    const { username, realm, clientid } = req.body;

    const clientSecret = getClientCredential(clientid);
    const tokenUrl = `${process.env.KEYCLOAK_BASE_URL}/realms/${realm}/protocol/openid-connect/token`;
    const tokenRes = await axios.post(
      tokenUrl,
      qs.stringify({
        grant_type: "client_credentials",
        client_id: clientid,
        client_secret: clientSecret,
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const adminToken = tokenRes.data.access_token;
    const user = await getUserByUsername(adminToken, realm, username);

    if (!user) {
      log("FORGOT_PASSWORD", "❌ User not found");
      return res.status(404).json({ message: "User not found" });
    }

    const phoneNumber = user.attributes?.phoneNumber?.[0];
    if (!phoneNumber) {
      log("FORGOT_PASSWORD", "❌ No phone number on user");
      return res.status(400).json({ message: "No phone number for user" });
    }

    const otpResponse = await sendOTP({
      to: phoneNumber,
      via: "sms",
      message: "Your password reset OTP",
      length: 6,
      expiryMinutes: 10,
    });

    log("FORGOT_PASSWORD", "✅ OTP sent for password reset");
    return res.status(200).json({
      message: "OTP sent successfully",
      phone: phoneNumber,
      otp: process.env.NODE_ENV === "development" ? otpResponse.otp : undefined,
    });
  } catch (err) {
    log("FORGOT_PASSWORD", "💥 Error", { error: err });
    next(new CustomError(err.message || "Failed to send OTP", 500));
  }
});

// Reset Password
router.post("/reset-password", async (req, res, next) => {
  log("RESET_PASSWORD_ROUTE", "Password reset request", req.body);
  try {
    const { username, newPassword } = req.body;
    const realm = req.headers["x-realm"];
    const clientid = req.headers["x-clientid"];

    if (!username || !newPassword) {
      return res
        .status(400)
        .json({ message: "Username and newPassword are required" });
    }

    const clientSecret = getClientCredential(clientid);
    const tokenUrl = `${process.env.KEYCLOAK_BASE_URL}/realms/${realm}/protocol/openid-connect/token`;
    const tokenResponse = await axios.post(
      tokenUrl,
      qs.stringify({
        grant_type: "client_credentials",
        client_id: clientid,
        client_secret: clientSecret,
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const adminToken = tokenResponse.data.access_token;

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

module.exports = router;
