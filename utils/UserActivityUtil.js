// middleware/userActivityLogger.js

const { createUserActivity } = require("../services/UserActivityService");

const { UAParser } = require("ua-parser-js");

// ============================================================
// USER ACTIVITY LOGGER
// ============================================================

const userActivityLogger = async (req, res, next) => {
  if (req.originalUrl?.includes("/ssoAuth/login")) {
    return next();
  }
  res.on("finish", async () => {
    // Only log successful requests
    if (res.statusCode >= 200 && res.statusCode < 300) {
      const method = req.method;

      // Only log write operations
      if (["POST", "PUT", "DELETE"].includes(method)) {
        try {
          // ==================================================
          // USER ID
          // ==================================================
          //
          // New architecture:
          // users.user_id = internal canonical user ID
          //
          // req.userDetails is populated by authentication
          // middleware.
          //
          const user_id =
            req.userDetails?.user_id ||
            req.dbUser?.user_id ||
            req.user?.user_id ||
            null;

          // ==================================================
          // TENANT ID
          // ==================================================

          const tenant_id =
            req.tenant_id ||
            req.params?.tenant_id ||
            req.body?.tenant_id ||
            req.query?.tenant_id ||
            null;

          // ==================================================
          // CLIENT INFO
          // ==================================================

          const clientInfo = getClientInfo(req);

          // ==================================================
          // ACTIVITY TYPE
          // ==================================================

          let activity_type;

          switch (method) {
            case "POST":
              activity_type = "CREATE";
              break;

            case "PUT":
              activity_type = "UPDATE";
              break;

            case "DELETE":
              activity_type = "DELETE";
              break;

            default:
              return;
          }

          // ==================================================
          // ACTIVITY DESCRIPTION
          // ==================================================

          const activity_desc = `${activity_type} ${req.originalUrl}`;

          // ==================================================
          // CREATE USER ACTIVITY
          // ==================================================

          await createUserActivity(
            {
              user_id: user_id ? Number(user_id) : null,

              tenant_id: tenant_id ? Number(tenant_id) : null,

              app_name: process.env.APP_NAME || "dental-app",

              activity_type,

              activity_desc,

              ip_address: clientInfo.ip,

              user_agent: JSON.stringify(clientInfo),
            },
            req,
          );
        } catch (err) {
          // Activity logging must never break the API
          console.error("❌ User Activity Log Error:", err.message);
        }
      }
    }
  });

  next();
};

// ============================================================
// GET CLIENT INFO
// ============================================================

function getClientInfo(req) {
  let ip =
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.headers["x-real-ip"] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    (req.connection?.socket ? req.connection.socket.remoteAddress : null);

  // Handle multiple forwarded IPs
  if (ip && ip.includes(",")) {
    ip = ip.split(",")[0].trim();
  }

  // Convert IPv4-mapped IPv6 address
  if (ip && ip.includes("::ffff:")) {
    ip = ip.substring(ip.lastIndexOf(":") + 1);
  }

  // Localhost IPv6
  if (ip === "::1") {
    ip = "127.0.0.1";
  }

  const userAgent = req.headers["user-agent"] || "";

  const parser = new UAParser(userAgent);

  const uaResult = parser.getResult();

  return {
    ip: ip || "unknown",

    browser:
      `${uaResult.browser.name || "Unknown"} ` +
      `${uaResult.browser.version || ""}`.trim(),

    os:
      `${uaResult.os.name || "Unknown"} ` +
      `${uaResult.os.version || ""}`.trim(),

    device: uaResult.device.model || "Unknown",

    deviceType: uaResult.device.type || "Computer",

    cpu: uaResult.cpu.architecture || "Unknown",

    userAgent,
  };
}

// ============================================================
// LOG USER VIEW ACTIVITY
// ============================================================

async function logUserViewActivity(req, description) {
  try {
    // ========================================================
    // USER ID
    // ========================================================
    //
    // New architecture:
    // req.userDetails.user_id
    //
    const user_id =
      req.userDetails?.user_id ||
      req.dbUser?.user_id ||
      req.user?.user_id ||
      null;

    // No authenticated user
    // Don't create anonymous VIEW activity
    if (!user_id) {
      console.warn("⚠️ logUserViewActivity: No user_id found");

      return;
    }

    // ========================================================
    // CLIENT INFO
    // ========================================================

    const clientInfo = getClientInfo(req);

    // ========================================================
    // TENANT ID
    // ========================================================

    const tenant_id =
      req.tenant_id ||
      req.params?.tenant_id ||
      req.body?.tenant_id ||
      req.query?.tenant_id ||
      null;

    // ========================================================
    // CREATE VIEW ACTIVITY
    // ========================================================

    await createUserActivity({
      user_id: Number(user_id),

      tenant_id: tenant_id ? Number(tenant_id) : null,

      app_name: process.env.APP_NAME || "dental-app",

      activity_type: "VIEW",

      activity_desc: description,

      ip_address: clientInfo.ip,

      user_agent: JSON.stringify({
        browser: clientInfo.browser,

        device: clientInfo.device,

        os: clientInfo.os,
      }),

      // Optional activity metadata
      endpoint: req.originalUrl,

      method: req.method,
    });
  } catch (err) {
    // Activity logging is non-critical.
    // Never throw this error to the API.
    console.error("❌ logUserViewActivity failed:", err.message);
  }
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  userActivityLogger,
  logUserViewActivity,
  getClientInfo,
};
