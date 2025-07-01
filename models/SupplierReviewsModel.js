const pool = require("../config/db");
const { CustomError } = require("../middlewares/CustomeError");
const record = require("../query/Records");

const TABLE = "supplier_reviews";

// Create SupplierReviews
const createSupplierReviews = async (table,columns, values) => {
  try {
    const supplier_reviews = await record.createRecord(table, columns, values);
    
    return supplier_reviews.insertId;
  } catch (error) {
    console.error("Error creating supplier_reviews:", error);
    throw new CustomError("Database Operation Failed", 500);
  }
};

// Get all supplier_reviewss by tenant ID with pagination
const getAllSupplierReviewssByTenantId = async (tenantId, limit, offset) => {
  try {
    if (!Number.isInteger(limit) || !Number.isInteger(offset) || limit < 1 || offset < 0) {
      throw new CustomError("Invalid pagination parameters.", 400);
    }
    return await record.getAllRecords("supplier_reviews", "tenant_id", tenantId, limit, offset);
  } catch (error) {
    console.error("Error fetching supplier_reviewss:", error);
    throw new CustomError("Error fetching supplier_reviewss.", 500);
  }
};

const getAllSupplierReviewsByTenantIdAndSupplierId = async (tenantId,supplierId, limit, offset) => {
  const query1 = `SELECT * FROM supplier_reviews  WHERE tenant_id = ? AND supplier_id = ? limit ? offset ?`;
  const query2 = `SELECT count(*) as total FROM supplier_reviews  WHERE tenant_id = ? AND supplier_id = ?`;
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

// Get supplier_reviews by tenant ID and supplier_reviews ID
const getSupplierReviewsByTenantAndSupplierReviewsId = async (tenant_id, supplier_review_id) => {
  try {
    const rows = await record.getRecordByIdAndTenantId(
      TABLE,
      "tenant_id",
      tenant_id,
      "supplier_review_id",
      supplier_review_id
    );
    return rows;
  } catch (error) {
    console.error("Error fetching supplier_reviews:", error);
    throw new CustomError("Error fetching supplier_reviews.", 500);
  }
};

// Update supplier_reviews
const updateSupplierReviews = async (supplier_review_id, columns, values, tenant_id) => {
  try {
    const conditionColumn = ["tenant_id", "supplier_review_id"];
    const conditionValue = [tenant_id, supplier_review_id];

    return await record.updateRecord(TABLE, columns, values, conditionColumn, conditionValue);
  } catch (error) {
    console.error("Error updating supplier_reviews:", error);
    throw new CustomError("Error updating supplier_reviews.", 500);
  }
};

// Delete supplier_reviews
const deleteSupplierReviewsByTenantAndSupplierReviewsId = async (tenant_id, supplier_review_id) => {
  try {
    const conditionColumn = ["tenant_id", "supplier_review_id"];
    const conditionValue = [tenant_id, supplier_review_id];

    const result = await record.deleteRecord(TABLE, conditionColumn, conditionValue);
    return result.affectedRows;
  } catch (error) {
    console.error("Error deleting supplier_reviews:", error);
    throw new CustomError("Error deleting supplier_reviews.", 500);
  }
};



module.exports = {
  createSupplierReviews,
  getAllSupplierReviewssByTenantId,
  getSupplierReviewsByTenantAndSupplierReviewsId,
  updateSupplierReviews,
  deleteSupplierReviewsByTenantAndSupplierReviewsId,
  getAllSupplierReviewsByTenantIdAndSupplierId
};
