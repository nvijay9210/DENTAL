const { CustomError } = require("../middlewares/CustomeError");
const supplier_productsModel = require("../models/SupplierProductsModel");
const {
  redisClient,
  getOrSetCache,
  invalidateCacheByPattern,
} = require("../config/redisConfig");
const { decodeJsonFields } = require("../utils/Helpers");
const { mapFields } = require("../query/Records");
const helper = require("../utils/Helpers");

const { formatDateOnly, convertUTCToLocal } = require("../utils/DateUtils");

// Field mapping for supplier_productss (similar to treatment)

const supplier_productsFields = {
  tenant_id: (val) => val,
  clinic_id: (val) => val,
  supplier_id: (val) => val,
  product_name: (val) => val,
  description: helper.safeStringify,
  unit: (val) => val,
  unit_price: (val) => parseFloat(val),
  moq: (val) => parseInt(val),
  lead_time_days: (val) => val,
  active: (val) => helper.parseBoolean(val),
};
const supplier_productsFieldsReverseMap = {
  tenant_id: (val) => val,
  clinic_id: (val) => val,
  supplier_id: (val) => val,
  supplier_product_id: (val) => val,
  product_name: (val) => val,
  description: helper.safeJsonParse,
  unit: (val) => val,
  unit_price: (val) => parseFloat(val),
  moq: (val) => parseInt(val),
  lead_time_days: (val) => val,
  active: (val) => Boolean(val),
  created_by: (val) => val,
  created_time: (val) => (val ? convertUTCToLocal(val) : null),
  updated_by: (val) => val,
  updated_time: (val) => (val ? convertUTCToLocal(val) : null),
};
// Create SupplierProducts
const createSupplierProducts = async (data) => {
  const fieldMap = {
    ...supplier_productsFields,
    created_by: (val) => val,
  };
  try {

    const { columns, values } = mapFields(data, fieldMap);
    const supplier_productsId = await supplier_productsModel.createSupplierProducts(
      "supplier_products",
      columns,
      values
    );
    await invalidateCacheByPattern("supplier_products:*");
    return supplier_productsId;
  } catch (error) {
    console.error("Failed to create supplier_products:", error);
    throw new CustomError(`Failed to create supplier_products: ${error.message}`, 404);
  }
};

// Get All SupplierProductss by Tenant ID with Caching
const getAllSupplierProductssByTenantId = async (tenantId, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  const cacheKey = `supplier_products:${tenantId}:page:${page}:limit:${limit}`;

  try {
    const supplier_productss = await getOrSetCache(cacheKey, async () => {
      const result = await supplier_productsModel.getAllSupplierProductssByTenantId(
        tenantId,
        Number(limit),
        offset
      );
      return result;
    });

    const convertedRows = supplier_productss.data.map((supplier_products) =>
      helper.convertDbToFrontend(supplier_products, supplier_productsFieldsReverseMap)
    );

    return { data: convertedRows, total: supplier_productss.total };
  } catch (err) {
    console.error("Database error while fetching supplier_productss:", err);
    throw new CustomError("Failed to fetch supplier_productss", 404);
  }
};

// Get SupplierProducts by ID & Tenant
const getSupplierProductsByTenantIdAndSupplierProductsId = async (tenantId, supplier_productsId) => {
  try {
    const supplier_products = await supplier_productsModel.getSupplierProductsByTenantAndSupplierProductsId(
      tenantId,
      supplier_productsId
    );

    const convertedRows = helper.convertDbToFrontend(
      supplier_products,
      supplier_productsFieldsReverseMap
    );

    return convertedRows;
  } catch (error) {
    throw new CustomError("Failed to get supplier_products: " + error.message, 404);
  }
};

// Update SupplierProducts
const updateSupplierProducts = async (supplier_productsId, data, tenant_id) => {
  const fieldMap = {
    ...supplier_productsFields,
    updated_by: (val) => val,
  };
  try {
    const { columns, values } = mapFields(data, fieldMap);
    const affectedRows = await supplier_productsModel.updateSupplierProducts(
      supplier_productsId,
      columns,
      values,
      tenant_id
    );

    if (affectedRows === 0) {
      throw new CustomError("SupplierProducts not found or no changes made.", 404);
    }

    await invalidateCacheByPattern("supplier_products:*");
    return affectedRows;
  } catch (error) {
    console.error("Update Error:", error);
    throw new CustomError("Failed to update supplier_products", 404);
  }
};

// Delete SupplierProducts
const deleteSupplierProductsByTenantIdAndSupplierProductsId = async (tenantId, supplier_productsId) => {
  try {
    const affectedRows =
      await supplier_productsModel.deleteSupplierProductsByTenantAndSupplierProductsId(
        tenantId,
        supplier_productsId
      );
    if (affectedRows === 0) {
      throw new CustomError("SupplierProducts not found.", 404);
    }

    await invalidateCacheByPattern("supplier_products:*");
    return affectedRows;
  } catch (error) {
    throw new CustomError(`Failed to delete supplier_products: ${error.message}`, 404);
  }
};

module.exports = {
  createSupplierProducts,
  getAllSupplierProductssByTenantId,
  getSupplierProductsByTenantIdAndSupplierProductsId,
  updateSupplierProducts,
  deleteSupplierProductsByTenantIdAndSupplierProductsId,
};
