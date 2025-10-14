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
  getClientToken,
  getClientCredential,
} = require("./KeycloakAdmin");
const { getTenantByTenantId } = require("../services/TenantService");
const { getClinicByTenantIdAndClinicId } = require("../services/ClinicService");
const { buildUserContext } = require("../utils/BuildUserContext");
const {
  authenticateTenantClinicGroup,
  verifyUserTokenInDB,
} = require("./AuthenticateTenantAndClient");
const { sendOTP, verifyOTP } = require("../Modules/MailSmsOtp/MailSmsOtpService");
const { getUserByTenantClinicAndKeycloakId } = require("../utils/Reusability");

const router = express.Router();
router.use(cookieParser());

const tempLoginStore = {}; // key: user phone/email, value: { tokens, dbUser }

const loginWithOptionalOtp = async (req, res) => {
  try {
    const { username, password, realm, clientid, otp, to } = req.body;

    // ✅ Step 1: OTP Verification Flow
    if (otp) {
      const record = tempLoginStore[to];
      if (!record) return res.status(400).json({ message: "No login found" });

      const otpResult = verifyOTP({ to, otp });
      if (!otpResult.success) {
        return res.status(400).json({ message: otpResult.message });
      }

      // ✅ If OTP success → use stored data
      req.tokens = record.tokens;
      req.dbUser = record.dbUser;
      delete tempLoginStore[to];
      return finalizeLogin(req, res);
    }

    // ✅ Step 2: First-time Login (username & password)
    if (!username || !password) {
      return res
        .status(400)
        .json({ message: "Username and password required" });
    }

    const tokens = await keycloakLogin(username, password, realm, clientid);
    const dbUser = await verifyUserTokenInDB(tokens.access_token);

    // ✅ ✅ 100% Skip all checks for TENANT users!
    if (dbUser.role === "tenant") {
      req.tokens = tokens;
      req.dbUser = dbUser;
      return finalizeLogin(req, res);
    }

    // ✅ Step 3: Check Clinic OTP Settings for NON-TENANTS
    const clinic = await getClinicByTenantIdAndClinicId(
      dbUser.dbUser.tenant_id,
      dbUser.dbUser.clinic_id
    );

    if (!clinic || clinic.otp === 0) {
      req.tokens = tokens;
      req.dbUser = dbUser;
      return finalizeLogin(req, res);
    }

    // ✅ Step 4: Send OTP for non-tenant roles
    const user2 = await getUserByTenantClinicAndKeycloakId(
      dbUser.role,
      dbUser.dbUser.tenant_id,
      dbUser.dbUser.clinic_id,
      dbUser.dbUser.keycloak_id
    );

    const payload = {
      email: user2.email,
      phone: user2.phoneNumber,
      via: clinic.otp_type,
      message: "Your Verification OTP",
      subject: "OTP Verification",
    };

    const otps = await sendOTP(payload);

    // ✅ Save to temp store for OTP verification
    const key = payload.via === "email" ? user2.email : user2.phoneNumber;
    tempLoginStore[key] = { tokens, dbUser };

    return res.status(200).json({
      message: "OTP sent",
      to: key,
      otpDetails: otps,
    });
  } catch (err) {
    console.error("Login error:", err);
    return res
      .status(401)
      .json({ message: err.message || "Invalid credentials" });
  }
};

const finalizeLogin = async (req, res) => {
  try {
    const { access_token, refresh_token } = req.tokens;
    const dbUser = req.dbUser;
    const userContext = await buildUserContext(access_token, dbUser);

    const isProduction = process.env.NODE_ENV === "production";

    res.cookie("access_token", access_token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "None" : "Lax",
      maxAge: 60 * 60 * 1000,
    });

    res.cookie("refresh_token", refresh_token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "None" : "Lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json(userContext);
  } catch (err) {
    console.error("Finalize login error:", err);
    throw new CustomError(
      err.response?.data?.error_description || err.message,
      err.response?.status || 401
    );
  }
};



router.post("/login", loginWithOptionalOtp);

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
    const refreshToken = req.cookies?.refresh_token;
    const realm = req.headers["x-realm"];
    const clientid = req.headers["x-clientid"];

    // ✅ Step 1: Revoke refresh token in Keycloak (if provided)
    if (refreshToken && realm && clientid) {
      try {
        const tokenUrl = `${process.env.KEYCLOAK_BASE_URL}/realms/${realm}/protocol/openid-connect/logout`;

        await axios.post(
          tokenUrl,
          qs.stringify({
            client_id: clientid,
            client_secret: getClientCredential(clientid),
            refresh_token: refreshToken,
          }),
          { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
        );
      } catch (err) {
        console.warn(
          "Keycloak logout warning:",
          err.response?.data || err.message
        );
      }
    }

    // ✅ Step 2: Clear cookies safely
    const isProduction = process.env.NODE_ENV === "production";

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

    // ✅ Step 3: Respond to frontend
    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (err) {
    console.error("Logout error:", err);
    next(new CustomError("Logout failed", 500));
  }
});

router.post("/forgettenpassword", async (req, res, next) => {
  try {
    const { username,realm,clientid } = req.body;

    const access_token = await getClientCredential(clientid);

    const user = await getUserByUsername(access_token, realm, username);

    if (!user) return res.status(404).json({ message: "User not found" });

    const phoneNumber = user.attributes?.phoneNumber?.[0];
    if (!phoneNumber)
      return res.status(400).json({ message: "No phone number for user" });

    const otpResponse = await sendOTP({
      to: phoneNumber,
      via: "sms",
      message: "Your password reset OTP",
      length: 6,
      expiryMinutes: 10,
    });

    return res.status(200).json({
      message: "OTP sent successfully",
      phone: phoneNumber,
      otp: process.env.NODE_ENV === "development" ? otpResponse.otp : undefined,
    });
  } catch (err) {
    console.error("Forgot password error:", err);
    next(new CustomError(err.message || "Failed to send OTP", 500));
  }
});

// ---------- RESET PASSWORD ----------
router.post("/reset-password", async (req, res, next) => {
  try {
    const { username, newPassword } = req.body;
    const realm = req.headers["x-realm"];
    const clientid = req.headers["x-clientid"];

    if (!username || !newPassword) {
      return res
        .status(400)
        .json({ message: "Username and newPassword are required" });
    }

    // 1️⃣ Get client secret from .env
    const clientSecret = getClientCredential(clientid);

    // 2️⃣ Get access token using client credentials
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

    // 3️⃣ Fetch user by username to get userId
    const userResponse = await axios.get(
      `${process.env.KEYCLOAK_BASE_URL}/admin/realms/${realm}/users?username=${username}`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    const user = userResponse.data[0];
    if (!user) return res.status(404).json({ message: "User not found" });

    // 4️⃣ Reset password
    const resetUrl = `${process.env.KEYCLOAK_BASE_URL}/admin/realms/${realm}/users/${user.id}/reset-password`;
    await axios.put(
      resetUrl,
      {
        type: "password",
        value: newPassword,
        temporary: false, // true = force user to change on next login
      },
      {
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    return res.status(200).json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("Reset password error:", err.response?.data || err.message);
    next(new CustomError(err.response?.data?.error || err.message, 500));
  }
});

module.exports = router;
