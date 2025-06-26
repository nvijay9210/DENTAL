const pool = require("../config/db");
const { CustomError } = require("../middlewares/CustomeError");
const record = require("../query/Records");

const TABLE = "supplier_products";

// Create SupplierProducts
const createSupplierProducts = async (table,columns, values) => {
  try {
    const supplier_product = await record.createRecord(table, columns, values);
    console.log(supplier_product)
    return supplier_product.insertId;
  } catch (error) {
    console.error("Error creating supplier_product:", error);
    throw new CustomError("Database Operation Failed", 500);
  }
};

// Get all supplier_products by tenant ID with pagination
const getAllSupplierProductssByTenantId = async (tenantId, limit, offset) => {
  try {
    if (!Number.isInteger(limit) || !Number.isInteger(offset) || limit < 1 || offset < 0) {
      throw new CustomError("Invalid pagination parameters.", 400);
    }
    return await record.getAllRecords("supplier_products", "tenant_id", tenantId, limit, offset);
  } catch (error) {
    console.error("Error fetching supplier_products:", error);
    throw new CustomError("Error fetching supplier_products.", 500);
  }
};

// Get supplier_product by tenant ID and supplier_product ID
const getSupplierProductsByTenantAndSupplierProductsId = async (tenant_id, supplier_product_id) => {
  try {
    const rows = await record.getRecordByIdAndTenantId(
      TABLE,
      "tenant_id",
      tenant_id,
      "supplier_product_id",
      supplier_product_id
    );
    return rows;
  } catch (error) {
    console.error("Error fetching supplier_product:", error);
    throw new CustomError("Error fetching supplier_product.", 500);
  }
};

// Update supplier_product
const updateSupplierProducts = async (supplier_product_id, columns, values, tenant_id) => {
  try {
    const conditionColumn = ["tenant_id", "supplier_product_id"];
    const conditionValue = [tenant_id, supplier_product_id];

    return await record.updateRecord(TABLE, columns, values, conditionColumn, conditionValue);
  } catch (error) {
    console.error("Error updating supplier_product:", error);
    throw new CustomError("Error updating supplier_product.", 500);
  }
};

// Delete supplier_product
const deleteSupplierProductsByTenantAndSupplierProductsId = async (tenant_id, supplier_product_id) => {
  try {
    const conditionColumn = ["tenant_id", "supplier_product_id"];
    const conditionValue = [tenant_id, supplier_product_id];

    const result = await record.deleteRecord(TABLE, conditionColumn, conditionValue);
    return result.affectedRows;
  } catch (error) {
    console.error("Error deleting supplier_product:", error);
    throw new CustomError("Error deleting supplier_product.", 500);
  }
};



module.exports = {
  createSupplierProducts,
  getAllSupplierProductssByTenantId,
  getSupplierProductsByTenantAndSupplierProductsId,
  updateSupplierProducts,
  deleteSupplierProductsByTenantAndSupplierProductsId,
};
