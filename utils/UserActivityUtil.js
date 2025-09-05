const {  createUserActivity } = require('../services/UserActivityService');

/**
 * Reusable middleware to log user activity
 * @param {string} action - e.g., CREATE_PATIENT
 * @param {Function} descFn - (req, createdBy) => string
 */
const activityLogger = (action, descFn) => {
  return async (req, res, next) => {
    res.on('finish', async () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          const tenant_id = req.params?.tenant_id || req.body?.tenant_id;
          const keycloak_user_id = req.user?.sub;
          const ip_address = req.clientInfo?.ip;

          // Build user_agent from client info
          const clientInfo = req.clientInfo ? {
            browser: req.clientInfo.browser,
            device: req.clientInfo.device,
            os: req.clientInfo.os,
            deviceType: req.clientInfo.deviceType
          } : {};
          const user_agent = JSON.stringify(clientInfo);

          // ✅ Only use created_by if it exists in req.body
          const createdBy = req.body?.created_by || null;

          // Generate description (can include createdBy)
          const activity_desc = descFn(req, createdBy);

          // Log only with allowed fields
          await createUserActivity({
            tenant_id,
            app_name: 'dental-app',
            keycloak_user_id,
            activity_type: action,
            activity_desc,
            ip_address,
            user_agent
            // activity_time → auto-set by DB
          }, req);

        } catch (err) {
          console.error(`Failed to log ${action}:`, err.message);
        }
      }
    });
    next();
  };
};

module.exports = {activityLogger};