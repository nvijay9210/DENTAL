const pool = require("../config/db");
const { CustomError } = require("../middlewares/CustomeError");
const record = require("../query/Records");

const TABLE = "reference";

// Create Reference
const createReference = async (table,columns, values) => {
  try {
    const reference = await record.createRecord(table, columns, values);
    
    return reference.insertId;
  } catch (error) {
    console.error("Error creating reference:", error);
    throw error
  }
};

// Get all reference by tenant ID with pagination
// const getAllReferencesByTenantId = async (tenantId, limit, offset) => {
//   try {
//     if (!Number.isInteger(limit) || !Number.isInteger(offset) || limit < 1 || offset < 0) {
//       throw error
//     }
//     return await record.getAllRecords("reference", "tenant_id", tenantId, limit, offset);
//   } catch (error) {
//     console.error("Error fetching reference:", error);
//     throw error
//   }
// };


// /**
//  * Fetch reference for a receiver, with special tenant+clinic-only logic for super-user and receptionist.
//  * @param {number} tenantId
//  * @param {number|null} receiverId  // Not required for super-user or receptionist
//  * @param {string} receiverRole
//  * @param {number} clinicId
//  */
// async function getReferencesForReceiver(tenantId, receiverId, receiverRole, clinicId) {
//   const conn = await pool.getConnection();
//   try {
//     // Roles that bypass receiver_id / receiver_role filtering
//   const bypassRoles = [];

//   let query = `
//     SELECT
//       n.reference_id,
//       r.reference_recipient_id,
//       n.tenant_id,
//       n.sender_role,
//       n.sender_id,
//       n.type,
//       n.title,
//       n.message,
//       n.reference_id,
//       n.created_by,
//       n.created_time,
//       n.updated_by,
//       n.updated_time,
//       r.receiver_role,
//       r.receiver_id,
//       r.status,
//       r.delivered_at,
//       r.read_at,
//       CASE
//         WHEN r.receiver_role = 'patient' THEN CONCAT(p.first_name, ' ', p.last_name)
//         WHEN r.receiver_role = 'dentist' THEN CONCAT(d.first_name, ' ', d.last_name)
//         WHEN r.receiver_role IN ('super-user', 'receptionist') THEN c.clinic_name
//         ELSE NULL
//       END AS receiver_name,
//       CASE
//         WHEN n.sender_role = 'patient' THEN CONCAT(sp.first_name, ' ', sp.last_name)
//         WHEN n.sender_role = 'dentist' THEN CONCAT(sd.first_name, ' ', sd.last_name)
//         WHEN n.sender_role IN ('super-user', 'receptionist') THEN sc.clinic_name
//         ELSE NULL
//       END AS sender_name
//     FROM reference n
//       JOIN referencerecipients r ON n.reference_id = r.reference_id
//       LEFT JOIN patient p  ON r.receiver_role = 'patient' AND r.receiver_id = p.patient_id
//       LEFT JOIN dentist d  ON r.receiver_role = 'dentist' AND r.receiver_id = d.dentist_id
//       LEFT JOIN clinic c   ON (r.receiver_role = 'super-user' OR r.receiver_role = 'receptionist') AND r.receiver_id = c.clinic_id
//       LEFT JOIN patient sp ON n.sender_role = 'patient' AND n.sender_id = sp.patient_id
//       LEFT JOIN dentist sd ON n.sender_role = 'dentist' AND n.sender_id = sd.dentist_id
//       LEFT JOIN clinic sc  ON (n.sender_role = 'super-user' OR n.sender_role = 'receptionist') AND n.sender_id = sc.clinic_id
//     WHERE r.status != 'archived'
//       AND n.tenant_id = ?
//       AND n.clinic_id = ?
//   `;

//   const params = [tenantId, clinicId];

//   if (!bypassRoles.includes(receiverRole)) {
//     query += `
//       AND r.receiver_role = ?
//       AND r.receiver_id = ?
//     `;
//     params.push(receiverRole, receiverId);
//   }
//   // else for super-user/receptionist: do NOT filter by receiver_role or receiver_id

//   query += ` ORDER BY n.created_time DESC`;

//     // console.log(query,params)
//     const [rows] = await conn.query(query, params);
//     return rows;
//   }catch(err){
//     console.log(err.message)
//     throw err
//   } finally {
//     conn.release();
//   }
// }



// // Get reference by tenant ID and reference ID
// const getReferenceByTenantAndReferenceId = async (tenant_id, reference_id) => {
//   try {
//     const rows = await record.getRecordByIdAndTenantId(
//       TABLE,
//       "tenant_id",
//       tenant_id,
//       "reference_id",
//       reference_id
//     );
//     return rows;
//   } catch (error) {
//     console.error("Error fetching reference:", error);
//     throw error
//   }
// };

// // Update reference
// const updateReference = async (reference_id, columns, values, tenant_id) => {
//   try {
//     const conditionColumn = ["tenant_id", "reference_id"];
//     const conditionValue = [tenant_id, reference_id];

//     return await record.updateRecord(TABLE, columns, values, conditionColumn, conditionValue);
//   } catch (error) {
//     console.error("Error updating reference:", error);
//     throw error
//   }
// };

// // Delete reference
// const deleteReferenceByTenantAndReferenceId = async (tenant_id, reference_id) => {
//   try {
//     const conditionColumn = ["tenant_id", "reference_id"];
//     const conditionValue = [tenant_id, reference_id];

//     const result = await record.deleteRecord(TABLE, conditionColumn, conditionValue);
//     return result.affectedRows;
//   } catch (error) {
//     console.error("Error deleting reference:", error);
//     throw error
//   }
// };

// const archiveOldReadReferences = async () => {
//   try {
//     // const query = `
//     //   UPDATE reference
//     //   SET status = 'archived'
//     //   WHERE status = 'read'
//     //     AND created_time < NOW() - INTERVAL 15 DAY;
//     // `;
//     const query = `
//      UPDATE referencerecipients
//       SET status = 'archived'
//       WHERE status = 'read'
//     `;
//     const [results] = await pool.query(query);
//     console.log(`✅ Archived ${results.affectedRows} old read reference`);
//   } catch (error) {
//     console.error("❌ Error archiving old reference:", error.message);
//   }
// };

module.exports = {
  createReference,
  // getAllReferencesByTenantId,
  // getReferenceByTenantAndReferenceId,
  // updateReference,
  // deleteReferenceByTenantAndReferenceId,
  // getReferencesForReceiver,
  // archiveOldReadReferences
};
