// middleware/userActivityLogger.js
const { createUserActivity } = require("../services/UserActivityService");
// const { getClientInfo } = require("./LoginHistoryInfo");

const userActivityLogger = async (req, res, next) => {
  res.on("finish", async () => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      const method = req.method;

      if (["POST", "PUT", "DELETE"].includes(method)) {
        try {
          const tenant_id =
            req.params?.tenant_id || req.body?.tenant_id || req.cookies?.tenant_id || null;
          const keycloak_user_id =
            req.user?.sub || req.user?.keycloak_id || "anonymous";

          // ✅ Get detailed client info
          const clientInfo = getClientInfo(req);

          // Map method → activity_type
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
          }

          const activity_desc = `${activity_type} ${req.originalUrl}`;

          await createUserActivity(
            {
              tenant_id,
              app_name: process.env.APP_NAME || "dental-app",
              keycloak_user_id,
              activity_type,
              activity_desc,
              ip_address: clientInfo.ip,
              user_agent: JSON.stringify(clientInfo),
            },
            req
          );
        } catch (err) {
          console.error("User Activity Log Error:", err.message);
        }
      }
    }
  });

  next();
};

// utils/LoginActivity.js (or wherever you define this)
const { UAParser } = require("ua-parser-js");// Adjust path

function getClientInfo(req) {
  let ip =
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.headers["x-real-ip"] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    (req.connection?.socket ? req.connection.socket.remoteAddress : null);

  if (ip && ip.includes(",")) ip = ip.split(",")[0].trim();
  if (ip && ip.includes("::ffff:")) ip = ip.substring(ip.lastIndexOf(":") + 1);
  if (ip === "::1") ip = "127.0.0.1";

  const userAgent = req.headers["user-agent"] || "";
  const parser = new UAParser(userAgent);
  const uaResult = parser.getResult();

  return {
    ip: ip || "unknown",
    browser: `${uaResult.browser.name || "Unknown"} ${uaResult.browser.version || ""}`.trim(),
    os: `${uaResult.os.name || "Unknown"} ${uaResult.os.version || ""}`.trim(),
    device: uaResult.device.model || "Unknown",
    deviceType: uaResult.device.type || "Computer",
    cpu: uaResult.cpu.architecture || "Unknown",
    userAgent,
  };
}

async function logUserViewActivity(req, description) {
  // Skip if no user context available
  if (!req.user && !req.cookies?.keycloak_user_id) {
    return; 
  }

  try {
    const clientInfo = getClientInfo(req);
    
    const tenant_id =
      req.params?.tenant_id ||
      req.body?.tenant_id ||
      req.query?.tenant_id ||
      req.cookies?.tenant_id ||
      null;

    const keycloakUserId = 
      req.user?.sub || 
      req.user?.keycloak_id || 
      req.cookies?.keycloak_user_id;

    if (!keycloakUserId) {
      console.warn("⚠️ logUserViewActivity: No keycloak_user_id found");
      return;
    }

    await createUserActivity({
      tenant_id: tenant_id ? parseInt(tenant_id) : null,
      app_name: process.env.APP_NAME || "dental-app",
      keycloak_user_id: keycloakUserId,
      activity_type: "VIEW",
      activity_desc: description,
      ip_address: clientInfo.ip,
      user_agent: JSON.stringify({
        browser: clientInfo.browser,
        device: clientInfo.device,
        os: clientInfo.os
      }),
      // Optional extra fields
      endpoint: req.originalUrl,
      method: req.method,
    });
    
  } catch (err) {
    // Never throw from logging function - it's non-critical
    console.error("❌ logUserViewActivity failed:", err.message);
  }
}

module.exports = {userActivityLogger,logUserViewActivity,getClientInfo};
