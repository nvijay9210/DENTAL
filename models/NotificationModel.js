const pool = require("../config/db");
const { CustomError } = require("../middlewares/CustomeError");
const record = require("../query/Records");

const TABLE = "notifications";

// Create Notification
const createNotification = async (table,columns, values) => {
  try {
    const notification = await record.createRecord(table, columns, values);
    
    return notification.insertId;
  } catch (error) {
    console.error("Error creating notification:", error);
    throw new CustomError("Database Operation Failed", 500);
  }
};

// Get all notifications by tenant ID with pagination
const getAllNotificationsByTenantId = async (tenantId, limit, offset) => {
  try {
    if (!Number.isInteger(limit) || !Number.isInteger(offset) || limit < 1 || offset < 0) {
      throw new CustomError("Invalid pagination parameters.", 400);
    }
    return await record.getAllRecords("notifications", "tenant_id", tenantId, limit, offset);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    throw new CustomError("Error fetching notifications.", 500);
  }
};

const getAllNotificationByTenantIdAndSupplierId = async (tenantId,supplierId, limit, offset) => {
  const query1 = `SELECT * FROM notification  WHERE tenant_id = ? AND supplier_id = ? limit ? offset ?`;
  const query2 = `SELECT count(*) as total FROM notification  WHERE tenant_id = ? AND supplier_id = ?`;
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(query1, [
      tenantId,
      supplierId,
      limit,
      offset,
    ]);
    const [counts] = await conn.query(query2, [tenantId, supplierId]);
    return { data: rows, total: counts[0].total };
  } catch (error) {
    console.error(error);
    throw new Error("Database Operation Failed");
  } finally {
    conn.release();
  }
};

// Get notification by tenant ID and notification ID
const getNotificationByTenantAndNotificationId = async (tenant_id, notification_id) => {
  try {
    const rows = await record.getRecordByIdAndTenantId(
      TABLE,
      "tenant_id",
      tenant_id,
      "notification_id",
      notification_id
    );
    return rows;
  } catch (error) {
    console.error("Error fetching notification:", error);
    throw new CustomError("Error fetching notification.", 500);
  }
};

// Update notification
const updateNotification = async (notification_id, columns, values, tenant_id) => {
  try {
    const conditionColumn = ["tenant_id", "notification_id"];
    const conditionValue = [tenant_id, notification_id];

    return await record.updateRecord(TABLE, columns, values, conditionColumn, conditionValue);
  } catch (error) {
    console.error("Error updating notification:", error);
    throw new CustomError("Error updating notification.", 500);
  }
};

// Delete notification
const deleteNotificationByTenantAndNotificationId = async (tenant_id, notification_id) => {
  try {
    const conditionColumn = ["tenant_id", "notification_id"];
    const conditionValue = [tenant_id, notification_id];

    const result = await record.deleteRecord(TABLE, conditionColumn, conditionValue);
    return result.affectedRows;
  } catch (error) {
    console.error("Error deleting notification:", error);
    throw new CustomError("Error deleting notification.", 500);
  }
};

const archiveOldReadNotifications = async () => {
  try {
    // const query = `
    //   UPDATE notifications
    //   SET status = 'archived'
    //   WHERE status = 'read'
    //     AND created_time < NOW() - INTERVAL 15 DAY;
    // `;
    const query = `
     UPDATE notificationrecipients
      SET status = 'archived'
      WHERE status = 'read'
    `;
    const [results] = await pool.query(query);
    console.log(`✅ Archived ${results.affectedRows} old read notifications`);
  } catch (error) {
    console.error("❌ Error archiving old notifications:", error.message);
  }
};



module.exports = {
  createNotification,
  getAllNotificationsByTenantId,
  getNotificationByTenantAndNotificationId,
  updateNotification,
  deleteNotificationByTenantAndNotificationId,
  getAllNotificationByTenantIdAndSupplierId,
  archiveOldReadNotifications
};
