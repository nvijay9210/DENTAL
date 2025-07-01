const pool = require("../config/db");
const { CustomError } = require("../middlewares/CustomeError");
const record = require("../query/Records");

const TABLE = "notification_recipients";

// Create NotificationRecipient
const createNotificationRecipient = async (table,columns, values) => {
  try {
    const notification_recipients = await record.createRecord(table, columns, values);
    
    return notification_recipients.insertId;
  } catch (error) {
    console.error("Error creating notification_recipients:", error);
    throw new CustomError("Database Operation Failed", 500);
  }
};

// Get all notification_recipientss by tenant ID with pagination
const getAllNotificationRecipientsByTenantId = async (tenantId, limit, offset) => {
  try {
    if (!Number.isInteger(limit) || !Number.isInteger(offset) || limit < 1 || offset < 0) {
      throw new CustomError("Invalid pagination parameters.", 400);
    }
    return await record.getAllRecords("notification_recipients", "tenant_id", tenantId, limit, offset);
  } catch (error) {
    console.error("Error fetching notification_recipientss:", error);
    throw new CustomError("Error fetching notification_recipientss.", 500);
  }
};

const getAllNotificationRecipientByTenantIdAndSupplierId = async (tenantId,supplierId, limit, offset) => {
  const query1 = `SELECT * FROM notificationrecipients  WHERE tenant_id = ? AND supplier_id = ? limit ? offset ?`;
  const query2 = `SELECT count(*) as total FROM notificationrecipients  WHERE tenant_id = ? AND supplier_id = ?`;
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

// Get notification_recipients by tenant ID and notification_recipients ID
const getNotificationRecipientByTenantAndNotificationRecipientId = async (tenant_id, notification_recipient_id) => {
  try {
    const rows = await record.getRecordByIdAndTenantId(
      TABLE,
      "tenant_id",
      tenant_id,
      "notification_recipient_id",
      notification_recipient_id
    );
    return rows;
  } catch (error) {
    console.error("Error fetching notification_recipients:", error);
    throw new CustomError("Error fetching notification_recipients.", 500);
  }
};

// Update notification_recipients
const updateNotificationRecipient = async (notification_recipient_id, columns, values, tenant_id) => {
  try {
    const conditionColumn = ["tenant_id", "notification_recipient_id"];
    const conditionValue = [tenant_id, notification_recipient_id];

    return await record.updateRecord(TABLE, columns, values, conditionColumn, conditionValue);
  } catch (error) {
    console.error("Error updating notification_recipients:", error);
    throw new CustomError("Error updating notification_recipients.", 500);
  }
};

async function markNotificationAsRead(notification_recipient_id) {
  const query = `
    UPDATE notificationrecipients
    SET status = 'read', read_at = NOW()
    WHERE notification_recipient_id = ?
  `;

  try {
    const [result] = await pool.query(query, [notification_recipient_id]);

    if (result.affectedRows === 0) {
      throw new Error("Notification not found or already updated");
    }

    console.log(`✅ Notification ${notification_recipient_id} marked as read`);
    return true;
  } catch (error) {
    console.error("❌ Error marking notification as read:", error.message);
    throw error;
  }
}

// Delete notification_recipients
const deleteNotificationRecipientByTenantAndNotificationRecipientId = async (tenant_id, notification_recipient_id) => {
  try {
    const conditionColumn = ["tenant_id", "notification_recipient_id"];
    const conditionValue = [tenant_id, notification_recipient_id];

    const result = await record.deleteRecord(TABLE, conditionColumn, conditionValue);
    return result.affectedRows;
  } catch (error) {
    console.error("Error deleting notification_recipients:", error);
    throw new CustomError("Error deleting notification_recipients.", 500);
  }
};



module.exports = {
  createNotificationRecipient,
  getAllNotificationRecipientsByTenantId,
  getNotificationRecipientByTenantAndNotificationRecipientId,
  updateNotificationRecipient,
  deleteNotificationRecipientByTenantAndNotificationRecipientId,
  getAllNotificationRecipientByTenantIdAndSupplierId,
  markNotificationAsRead
};
