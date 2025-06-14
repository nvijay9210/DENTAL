const pool = require("../config/db");
const { CustomError } = require("../middlewares/CustomeError");
const record = require("../query/Records");

const TABLE = "reception";

// Create Reception
const createReception = async (table,columns, values) => {
  try {
    const reception = await record.createRecord(table, columns, values);
    console.log(reception)
    return reception.insertId;
  } catch (error) {
    console.error("Error creating reception:", error);
    throw new CustomError("Database Operation Failed", 500);
  }
};

// Get all receptions by tenant ID with pagination
const getAllReceptionsByTenantId = async (tenantId, limit, offset) => {
  try {
    if (!Number.isInteger(limit) || !Number.isInteger(offset) || limit < 1 || offset < 0) {
      throw new CustomError("Invalid pagination parameters.", 400);
    }
    return await record.getAllRecords("reception", "tenant_id", tenantId, limit, offset);
  } catch (error) {
    console.error("Error fetching receptions:", error);
    throw new CustomError("Error fetching receptions.", 500);
  }
};

// Get reception by tenant ID and reception ID
const getReceptionByTenantAndReceptionId = async (tenant_id, reception_id) => {
  try {
    const rows = await record.getRecordByIdAndTenantId(
      TABLE,
      "tenant_id",
      tenant_id,
      "reception_id",
      reception_id
    );
    return rows;
  } catch (error) {
    console.error("Error fetching reception:", error);
    throw new CustomError("Error fetching reception.", 500);
  }
};

// Update reception
const updateReception = async (reception_id, columns, values, tenant_id) => {
  try {
    const conditionColumn = ["tenant_id", "reception_id"];
    const conditionValue = [tenant_id, reception_id];

    return await record.updateRecord(TABLE, columns, values, conditionColumn, conditionValue);
  } catch (error) {
    console.error("Error updating reception:", error);
    throw new CustomError("Error updating reception.", 500);
  }
};

// Delete reception
const deleteReceptionByTenantAndReceptionId = async (tenant_id, reception_id) => {
  try {
    const conditionColumn = ["tenant_id", "reception_id"];
    const conditionValue = [tenant_id, reception_id];

    const result = await record.deleteRecord(TABLE, conditionColumn, conditionValue);
    return result.affectedRows;
  } catch (error) {
    console.error("Error deleting reception:", error);
    throw new CustomError("Error deleting reception.", 500);
  }
};



module.exports = {
  createReception,
  getAllReceptionsByTenantId,
  getReceptionByTenantAndReceptionId,
  updateReception,
  deleteReceptionByTenantAndReceptionId,
};
