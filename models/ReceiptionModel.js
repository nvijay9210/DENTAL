const pool = require("../config/db");
const { CustomError } = require("../middlewares/CustomeError");
const record = require("../query/Records");

const TABLE = "receiption";

// Create Receiption
const createReceiption = async (table,columns, values) => {
  try {
    const receiption = await record.createRecord(table, columns, values);
    console.log(receiption)
    return receiption.insertId;
  } catch (error) {
    console.error("Error creating receiption:", error);
    throw new CustomError("Database Operation Failed", 500);
  }
};

// Get all receiptions by tenant ID with pagination
const getAllReceiptionsByTenantId = async (tenantId, limit, offset) => {
  try {
    if (!Number.isInteger(limit) || !Number.isInteger(offset) || limit < 1 || offset < 0) {
      throw new CustomError("Invalid pagination parameters.", 400);
    }
    return await record.getAllRecords("receiption", "tenant_id", tenantId, limit, offset);
  } catch (error) {
    console.error("Error fetching receiptions:", error);
    throw new CustomError("Error fetching receiptions.", 500);
  }
};

// Get receiption by tenant ID and receiption ID
const getReceiptionByTenantAndReceiptionId = async (tenant_id, receiption_id) => {
  try {
    const rows = await record.getRecordByIdAndTenantId(
      TABLE,
      "tenant_id",
      tenant_id,
      "receiption_id",
      receiption_id
    );
    return rows;
  } catch (error) {
    console.error("Error fetching receiption:", error);
    throw new CustomError("Error fetching receiption.", 500);
  }
};

// Update receiption
const updateReceiption = async (receiption_id, columns, values, tenant_id) => {
  try {
    const conditionColumn = ["tenant_id", "receiption_id"];
    const conditionValue = [tenant_id, receiption_id];

    return await record.updateRecord(TABLE, columns, values, conditionColumn, conditionValue);
  } catch (error) {
    console.error("Error updating receiption:", error);
    throw new CustomError("Error updating receiption.", 500);
  }
};

// Delete receiption
const deleteReceiptionByTenantAndReceiptionId = async (tenant_id, receiption_id) => {
  try {
    const conditionColumn = ["tenant_id", "receiption_id"];
    const conditionValue = [tenant_id, receiption_id];

    const result = await record.deleteRecord(TABLE, conditionColumn, conditionValue);
    return result.affectedRows;
  } catch (error) {
    console.error("Error deleting receiption:", error);
    throw new CustomError("Error deleting receiption.", 500);
  }
};



module.exports = {
  createReceiption,
  getAllReceiptionsByTenantId,
  getReceiptionByTenantAndReceiptionId,
  updateReceiption,
  deleteReceiptionByTenantAndReceiptionId,
};
