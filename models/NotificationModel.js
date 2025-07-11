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

const getNotificationsForReceiver = async (tenantId, receiverId, receiverRole) => {
  let receiverJoinTable = '';
  let receiverAlias = '';
  let receiverNameExpr = '';

  // Define the join and name expression for the receiver
  if (receiverRole === 'dentist') {
    receiverJoinTable = 'dentist';
    receiverAlias = 'ruser';
    receiverNameExpr = `CONCAT(ruser.first_name, ' ', ruser.last_name)`;
  } else if (receiverRole === 'patient') {
    receiverJoinTable = 'patient';
    receiverAlias = 'ruser';
    receiverNameExpr = `CONCAT(ruser.first_name, ' ', ruser.last_name)`;
  } else if (receiverRole === 'super-user') {
    receiverJoinTable = 'clinic';
    receiverAlias = 'ruser';
    receiverNameExpr = `ruser.clinic_name`;
  } else {
    throw new Error("Invalid receiver role");
  }

  const senderJoin = `
    LEFT JOIN dentist sd ON sd.dentist_id = n.sender_id AND n.sender_role = 'dentist'
    LEFT JOIN patient sp ON sp.patient_id = n.sender_id AND n.sender_role = 'patient'
    LEFT JOIN clinic sc ON sc.clinic_id = n.sender_id AND n.sender_role = 'super-user'
    LEFT JOIN clinic cd ON cd.clinic_id = sd.clinic_id
    LEFT JOIN clinic cp ON cp.tenant_id = sp.tenant_id
  `;

  const senderNameExpr = `
    CASE 
      WHEN n.sender_role = 'dentist' THEN CONCAT(sd.first_name, ' ', sd.last_name)
      WHEN n.sender_role = 'patient' THEN CONCAT(sp.first_name, ' ', sp.last_name)
      WHEN n.sender_role = 'super-user' THEN sc.clinic_name
      ELSE NULL
    END
  `;

  const senderClinicExpr = `
    CASE
      WHEN n.sender_role = 'dentist' THEN cd.clinic_name
      WHEN n.sender_role = 'patient' THEN cp.clinic_name
      WHEN n.sender_role = 'super-user' THEN sc.clinic_name
      ELSE NULL
    END
  `;

  const query = `
    SELECT 
      n.notification_id,
      r.notification_recipient_id,
      n.tenant_id,
      n.sender_role,
      n.sender_id,
      n.type,
      n.title,
      n.message,
      n.reference_id,
      n.file_url,
      n.created_by,
      n.created_time,
      n.updated_by,
      n.updated_time,
      r.receiver_role,
      r.receiver_id,
      r.status,
      r.delivered_at,
      r.read_at,
      ${receiverNameExpr} AS receiver_name,
      ${senderNameExpr} AS sender_name,
      ${senderClinicExpr} AS clinic_name
    FROM notificationrecipients r
    JOIN notifications n ON n.notification_id = r.notification_id
    JOIN ${receiverJoinTable} ${receiverAlias} ON ${receiverAlias}.${receiverRole}_id = r.receiver_id
    ${senderJoin}
    WHERE r.status != ? AND r.receiver_role = ? AND r.receiver_id = ? AND n.tenant_id = ?
    ORDER BY n.created_time DESC
  `;

  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(query, ['archived', receiverRole, receiverId, tenantId]);
    return rows;
  } catch (err) {
    console.error("SQL error:", err);
    throw new Error("Failed to fetch notifications");
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
  getNotificationsForReceiver,
  archiveOldReadNotifications
};
