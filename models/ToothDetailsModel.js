const pool = require("../config/db");
const { CustomError } = require("../middlewares/CustomeError");
const record = require("../query/Records");

const TABLE = "toothdetails";

// Create ToothDetails
const createToothDetails = async (table,columns, values) => {
  try {
    const toothdetails = await record.createRecord(table, columns, values);
    console.log(toothdetails)
    return toothdetails.insertId;
  } catch (error) {
    console.error("Error creating toothdetails:", error);
    throw new CustomError("Database Operation Failed", 500);
  }
};

// Get all toothdetailss by tenant ID with pagination
const getAllToothDetailssByTenantId = async (tenantId, limit, offset) => {
  try {
    if (!Number.isInteger(limit) || !Number.isInteger(offset) || limit < 1 || offset < 0) {
      throw new CustomError("Invalid pagination parameters.", 400);
    }
    return await record.getAllRecords("toothdetails", "tenant_id", tenantId, limit, offset);
  } catch (error) {
    console.error("Error fetching toothdetailss:", error);
    throw new CustomError("Error fetching toothdetailss.", 500);
  }
};

// Get toothdetails by tenant ID and toothdetails ID
const getToothDetailsByTenantAndToothDetailsId = async (tenant_id, toothdetails_id) => {
  try {
    const rows = await record.getRecordByIdAndTenantId(
      TABLE,
      "tenant_id",
      tenant_id,
      "toothdetails_id",
      toothdetails_id
    );
    return rows;
  } catch (error) {
    console.error("Error fetching toothdetails:", error);
    throw new CustomError("Error fetching toothdetails.", 500);
  }
};

// Update toothdetails
const updateToothDetails = async (toothdetails_id, columns, values, tenant_id) => {
  try {
    const conditionColumn = ["tenant_id", "toothdetails_id"];
    const conditionValue = [tenant_id, toothdetails_id];
 
    return await record.updateRecord(TABLE, columns, values, conditionColumn, conditionValue);
  } catch (error) {
    console.error("Error updating toothdetails:", error);
    throw new CustomError("Error updating toothdetails.", 500);
  }
};

// Delete toothdetails
const deleteToothDetailsByTenantAndToothDetailsId = async (tenant_id, toothdetails_id) => {
  try {
    const conditionColumn = ["tenant_id", "toothdetails_id"];
    const conditionValue = [tenant_id, toothdetails_id];

    const result = await record.deleteRecord(TABLE, conditionColumn, conditionValue);
    return result.affectedRows;
  } catch (error) {
    console.error("Error deleting toothdetails:", error);
    throw new CustomError("Error deleting toothdetails.", 500);
  }
};



module.exports = {
  createToothDetails,
  getAllToothDetailssByTenantId,
  getToothDetailsByTenantAndToothDetailsId,
  updateToothDetails,
  deleteToothDetailsByTenantAndToothDetailsId
};
