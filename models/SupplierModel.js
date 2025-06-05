const pool = require("../config/db");
const { CustomError } = require("../middlewares/CustomeError");
const record = require("../query/Records");

const TABLE = "supplier";

// Create Supplier
const createSupplier = async (table,columns, values) => {
  try {
    const supplier = await record.createRecord(table, columns, values);
    console.log(supplier)
    return supplier.insertId;
  } catch (error) {
    console.error("Error creating supplier:", error);
    throw new CustomError("Database Query Error", 500);
  }
};

// Get all suppliers by tenant ID with pagination
const getAllSuppliersByTenantId = async (tenantId, limit, offset) => {
  try {
    if (!Number.isInteger(limit) || !Number.isInteger(offset) || limit < 1 || offset < 0) {
      throw new CustomError("Invalid pagination parameters.", 400);
    }
    return await record.getAllRecords("supplier", "tenant_id", tenantId, limit, offset);
  } catch (error) {
    console.error("Error fetching suppliers:", error);
    throw new CustomError("Error fetching suppliers.", 500);
  }
};

// Get supplier by tenant ID and supplier ID
const getSupplierByTenantAndSupplierId = async (tenant_id, supplier_id) => {
  try {
    const [rows] = await record.getRecordByIdAndTenantId(
      TABLE,
      "tenant_id",
      tenant_id,
      "supplier_id",
      supplier_id
    );
    return rows?.[0] ?? null;
  } catch (error) {
    console.error("Error fetching supplier:", error);
    throw new CustomError("Error fetching supplier.", 500);
  }
};

// Update supplier
const updateSupplier = async (supplier_id, columns, values, tenant_id) => {
  try {
    const conditionColumn = ["tenant_id", "supplier_id"];
    const conditionValue = [tenant_id, supplier_id];

    return await record.updateRecord(TABLE, columns, values, conditionColumn, conditionValue);
  } catch (error) {
    console.error("Error updating supplier:", error);
    throw new CustomError("Error updating supplier.", 500);
  }
};

// Delete supplier
const deleteSupplierByTenantAndSupplierId = async (tenant_id, supplier_id) => {
  try {
    const conditionColumn = ["tenant_id", "supplier_id"];
    const conditionValue = [tenant_id, supplier_id];

    const result = await record.deleteRecord(TABLE, conditionColumn, conditionValue);
    return result.affectedRows;
  } catch (error) {
    console.error("Error deleting supplier:", error);
    throw new CustomError("Error deleting supplier.", 500);
  }
};



module.exports = {
  createSupplier,
  getAllSuppliersByTenantId,
  getSupplierByTenantAndSupplierId,
  updateSupplier,
  deleteSupplierByTenantAndSupplierId,
};
