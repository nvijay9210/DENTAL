const pool = require("../config/db");
const { CustomError } = require("../middlewares/CustomeError");
const record = require("../query/Records");
const { addUserClinicMapping } = require("../utils/Helpers");

const TABLE = "superuser";

/**
 * Create SuperUser
 */
const createSuperUser = async (conn, table, columns, values) => {
  try {
    // Create SuperUser
    const superuser = await record.createRecord(table, columns, values, conn);

    const superUserId = superuser.insertId;

    // Add mapping in user_clinic
    await addUserClinicMapping(conn, {
      userId: superUserId,
      userName: values[4], // username
      role: "SUPERUSER",
      keycloakId: values[2], // keycloak_id
      clinicId: values[1], // clinic_id
      createdBy: values[21] || "SYSTEM",
    });

    return superUserId;
  } catch (error) {
    console.error("Error creating superuser:", error);
    throw error;
  }
};

// Get all superusers by tenant ID with pagination
const getAllSuperUsersByTenantId = async (tenantId, limit, offset) => {
  try {
    if (
      !Number.isInteger(limit) ||
      !Number.isInteger(offset) ||
      limit < 1 ||
      offset < 0
    ) {
      throw error;
    }
    return await record.getAllRecords(
      "superuser",
      "tenant_id",
      tenantId,
      limit,
      offset,
    );
  } catch (error) {
    console.error("Error fetching superusers:", error);
    throw error;
  }
};

// Get superuser by tenant ID and superuser ID
const getSuperUserByTenantAndSuperUserId = async (
  tenant_id,
  superuser_id,
  connection,
) => {
  try {
    const rows = await record.getRecordByIdAndTenantId(
      TABLE,
      "tenant_id",
      tenant_id,
      "superuser_id",
      superuser_id,
      connection,
    );
    return rows;
  } catch (error) {
    console.error("Error fetching superuser:", error);
    throw error;
  }
};

// Update superuser
const updateSuperUser = async (
  superuser_id,
  columns,
  values,
  tenant_id,
  connection,
) => {
  try {
    const conditionColumn = ["tenant_id", "superuser_id"];
    const conditionValue = [tenant_id, superuser_id];

    return await record.updateRecord(
      TABLE,
      columns,
      values,
      conditionColumn,
      conditionValue,
      connection,
    );
  } catch (error) {
    console.error("Error updating superuser:", error);
    throw error;
  }
};

async function updateSuperuser(superuser_id, data) {
  let conn;

  try {
    conn = await pool.getConnection();

    // ================= FETCH EXISTING DATA =================
    const existingRows = await conn.query(
      `SELECT * FROM superuser WHERE superuser_id = ?`,
      [superuser_id],
    );

    if (existingRows.length === 0) {
      return {
        success: false,
        message: "Superuser not found",
      };
    }

    const existing = existingRows[0][0];

    console.log(data.status, existing);

    // ================= MERGE EXISTING + NEW DATA =================
    const updatedData = {
      tenant_id: data.tenant_id ?? existing.tenant_id,
      clinic_id: data.clinic_id ?? existing.clinic_id,
      keycloak_id: data.keycloak_id ?? existing.keycloak_id,
      username: data.username ?? existing.username,
      password: data.password ?? existing.password,
      superuser_code: data.superuser_code ?? existing.superuser_code,
      first_name: data.first_name ?? existing.first_name,
      last_name: data.last_name ?? existing.last_name,
      email: data.email ?? existing.email,
      phone_number: data.phone_number ?? existing.phone_number,
      alternate_phone_number:
        data.alternate_phone_number ?? existing.alternate_phone_number,
      profile_picture: data.profile_picture ?? existing.profile_picture,
      date_of_birth: data.date_of_birth ?? existing.date_of_birth,
      gender: data.gender ?? existing.gender,

      // FIXED STATUS
      status:
        data.status === true ||
        data.status === "true" ||
        data.status === 1 ||
        data.status === "1"
          ? 1
          : 0,

      address: data.address ?? existing.address,
      city: data.city ?? existing.city,
      state: data.state ?? existing.state,
      country: data.country ?? existing.country,
      pincode: data.pincode ?? existing.pincode,
      last_login: data.last_login ?? existing.last_login,
      updated_by: data.updated_by ?? existing.updated_by,
    };

    // ================= UPDATE QUERY =================
    const query = `
      UPDATE superuser
      SET
        tenant_id = ?,
        clinic_id = ?,
        keycloak_id = ?,
        username = ?,
        password = ?,
        superuser_code = ?,
        first_name = ?,
        last_name = ?,
        email = ?,
        phone_number = ?,
        alternate_phone_number = ?,
        profile_picture = ?,
        date_of_birth = ?,
        gender = ?,
        status = ?,
        address = ?,
        city = ?,
        state = ?,
        country = ?,
        pincode = ?,
        last_login = ?,
        updated_by = ?,
        updated_time = CURRENT_TIMESTAMP
      WHERE superuser_id = ?
    `;

    const values = [
      updatedData.tenant_id,
      updatedData.clinic_id,
      updatedData.keycloak_id,
      updatedData.username,
      updatedData.password,
      updatedData.superuser_code,
      updatedData.first_name,
      updatedData.last_name,
      updatedData.email,
      updatedData.phone_number,
      updatedData.alternate_phone_number,
      updatedData.profile_picture,
      updatedData.date_of_birth,
      updatedData.gender,
      updatedData.status,
      updatedData.address,
      updatedData.city,
      updatedData.state,
      updatedData.country,
      updatedData.pincode,
      updatedData.last_login,
      updatedData.updated_by,
      superuser_id,
    ];

    const [result] = await conn.query(query, values);

    return {
      success: true,
      message: "Superuser updated successfully",
      affectedRows: result.affectedRows,
    };
  } catch (error) {
    console.error("Update Superuser Error:", error);

    return {
      success: false,
      message: error.message,
    };
  } finally {
    if (conn) conn.release();
  }
}

// Delete superuser
const deleteSuperUserByTenantAndSuperUserId = async (
  connection,
  tenant_id,
  superuser_id,
) => {
  try {
    const conditionColumn = ["tenant_id", "superuser_id"];
    const conditionValue = [tenant_id, superuser_id];

    const result = await record.deleteRecord(
      TABLE,
      conditionColumn,
      conditionValue,
      connection,
    );
    return result.affectedRows;
  } catch (error) {
    console.error("Error deleting superuser:", error);
    throw error;
  }
};

const getAllSuperUsersByTenantIdAndClinicId = async (
  tenantId,
  clinicId,
  limit,
  offset,
) => {
  const query1 = `SELECT * FROM superuser  WHERE tenant_id = ? AND clinic_id = ? limit ? offset ?`;
  const query2 = `SELECT count(*) as total FROM superuser  WHERE tenant_id = ? AND clinic_id = ?`;
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(query1, [
      tenantId,
      clinicId,
      limit,
      offset,
    ]);
    const [counts] = await conn.query(query2, [tenantId, clinicId]);
    return { data: rows, total: counts[0].total };
  } catch (error) {
    console.error(error);
    throw new Error("Database Operation Failed");
  } finally {
    conn.release();
  }
};

const getUserByTenantAndClinicAndKeycloakUserId = async (
  tenantId,
  clinicId,
  keycloakuserid,
) => {
  const query1 = `SELECT * FROM superuser  WHERE tenant_id = ? AND clinic_id = ? AND keycloak_user_id=?`;
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(query1, [
      tenantId,
      clinicId,
      keycloakuserid,
    ]);

    return rows;
  } catch (error) {
    console.error(error);
    throw new Error("Database Operation Failed");
  } finally {
    conn.release();
  }
};

module.exports = {
  createSuperUser,
  getAllSuperUsersByTenantId,
  getSuperUserByTenantAndSuperUserId,
  updateSuperUser,
  updateSuperuser,
  deleteSuperUserByTenantAndSuperUserId,
  getAllSuperUsersByTenantIdAndClinicId,
};
