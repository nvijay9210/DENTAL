const { CustomError } = require("../middlewares/CustomeError");
const supplierModel = require("../models/SupplierModel");
const {
  redisClient,
  getOrSetCache,
  invalidateCacheByPattern,
} = require("../config/redisConfig");
const { decodeJsonFields } = require("../utils/Helpers");
const { mapFields } = require("../query/Records");
const helper = require("../utils/Helpers");

const { formatDateOnly } = require("../utils/DateUtils");

// Field mapping for suppliers (similar to treatment)

const supplierFields = {
  tenant_id: (val) => val,
  clinic_id: (val) => val,
  supplier_name: (val) => val,
  supplier_category: (val) => val,
  supplier_status: (val) => val,
  payment_status: (val) => val,
  supplier_contact_number: (val) => val,
  supplier_country: (val) => val,
  supplier_performance_rating: (val) => val,
};
// Create Supplier
const createSupplier = async (data) => {
  const fieldMap = {
    ...supplierFields,
    created_by: (val) => val,
  };
  try {
    const { columns, values } = mapFields(data, fieldMap);
    const supplierId = await supplierModel.createSupplier(
      "supplier",
      columns,
      values
    );
    await invalidateCacheByPattern("supplier:*");
    return supplierId;
  } catch (error) {
    console.error("Failed to create supplier:", error);
    throw new CustomError(`Failed to create supplier: ${error.message}`, 404);
  }
};

// Get All Suppliers by Tenant ID with Caching
const getAllSuppliersByTenantId = async (tenantId, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  const cacheKey = `supplier:${tenantId}:page:${page}:limit:${limit}`;

  const jsonFields = ["description"];

  try {
    const suppliers = await getOrSetCache(cacheKey, async () => {
      const result = await supplierModel.getAllSuppliersByTenantId(
        tenantId,
        Number(limit),
        offset
      );
      return result;
    });

    return helper.decodeJsonFields(suppliers, jsonFields);
  } catch (err) {
    console.error("Database error while fetching suppliers:", err);
    throw new CustomError("Failed to fetch suppliers", 404);
  }
};

// Get Supplier by ID & Tenant
const getSupplierByTenantIdAndSupplierId = async (tenantId, supplierId) => {
  try {
    const supplier = await supplierModel.getSupplierByTenantIdAndSupplierId(
      tenantId,
      supplierId
    );
    const fieldsToDecode = [
      "medication",
      "side_effects",
      "instructions",
      "notes",
    ];
    return decodeJsonFields(supplier, fieldsToDecode);
  } catch (error) {
    throw new CustomError("Failed to get supplier: " + error.message, 404);
  }
};

// Update Supplier
const updateSupplier = async (supplierId, data, tenant_id) => {
  const fieldMap = {
    ...supplierFields,
    updated_by: (val) => val,
  };
  try {
    const { columns, values } = mapFields(data, fieldMap);
    const affectedRows = await supplierModel.updateSupplier(
      supplierId,
      columns,
      values,
      tenant_id
    );

    if (affectedRows === 0) {
      throw new CustomError("Supplier not found or no changes made.", 404);
    }

    await invalidateCacheByPattern("supplier:*");
    return affectedRows;
  } catch (error) {
    console.error("Update Error:", error);
    throw new CustomError("Failed to update supplier", 404);
  }
};

// Delete Supplier
const deleteSupplierByTenantIdAndSupplierId = async (tenantId, supplierId) => {
  try {
    const affectedRows =
      await supplierModel.deleteSupplierByTenantAndSupplierId(
        tenantId,
        supplierId
      );
    if (affectedRows === 0) {
      throw new CustomError("Supplier not found.", 404);
    }

    await invalidateCacheByPattern("supplier:*");
    return affectedRows;
  } catch (error) {
    throw new CustomError(`Failed to delete supplier: ${error.message}`, 404);
  }
};

module.exports = {
  createSupplier,
  getAllSuppliersByTenantId,
  getSupplierByTenantIdAndSupplierId,
  updateSupplier,
  deleteSupplierByTenantIdAndSupplierId,
};
