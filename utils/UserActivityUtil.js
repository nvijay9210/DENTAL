// middleware/userActivityLogger.js
const { createUserActivity } = require("../services/UserActivityService");
const { getClientInfo } = require("./LoginHistoryInfo");

const userActivityLogger = async (req, res, next) => {
  res.on("finish", async () => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      const method = req.method;

      if (["POST", "PUT", "DELETE"].includes(method)) {
        try {
          const tenant_id =
            req.params?.tenant_id || req.body?.tenant_id || null;
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

module.exports = userActivityLogger;
