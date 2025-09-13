const { CustomError } = require("../middlewares/CustomeError");
const supplierModel = require("../models/SupplierModel");
const pool = require("../config/db");
const {
  redisClient,
  getOrSetCache,
  invalidateCacheByPattern,
} = require("../config/redisConfig");
const { decodeJsonFields } = require("../utils/Helpers");
const { mapFields } = require("../query/Records");
const helper = require("../utils/Helpers");
const {
  addUser,
  getUserIdByUsername,
  assignRealmRoleToUser,
  addUserToGroup,
  updateUserInKeycloak,
} = require("../middlewares/KeycloakAdmin");

const { formatDateOnly, convertUTCToLocal } = require("../utils/DateUtils");
const { buildCacheKey } = require("../utils/RedisCache");
const { encrypt } = require("../middlewares/PasswordHash");
const { rollbackKeycloakUser } = require("../Keycloak/KeycloakService");
const { createEntity, updateEntity } = require("../utils/Reusability");

// Field mapping for suppliers (similar to treatment)

const supplierFields = {
  tenant_id: (val) => val,
  clinic_id: (val) => val,
  keycloak_id: (val) => val,
  username: (val) => val,
  password: (val) => val,
  name: (val) => val,
  category: (val) => val,
  status: (val) => helper.parseBoolean(val),
  gender: (val) => val,
  email: (val) => val,
  phone_number: (val) => val,
  alternate_phone_number: (val) => val,
  fax: (val) => val,
  website: (val) => val,
  gst_number: (val) => val,
  pan_number: (val) => val,
  tax_id: (val) => val,
  logo_url: (val) => val,
  mode_of_payment: (val) => val,
  preferred_currency: (val) => val,
  credit_limit: (val) => (val ? parseFloat(val) : 0),
  opening_balance: (val) => (val ? parseFloat(val) : 0),
  notes: helper.safeStringify,
  address_type: (val) => val,
  address: (val) => val,
  city: (val) => val,
  state: (val) => val,
  postal_code: (val) => val,
  country: (val) => val,
};
const supplierFieldsReverseMap = {
  supplier_id: (val) => val,
  tenant_id: (val) => val,
  clinic_id: (val) => val,
  keycloak_id: (val) => val,
  username: (val) => val,
  password: (val) => val?String(val):null,
  name: (val) => val,
  category: (val) => val,
  status: (val) => Boolean(val),
  gender: (val) => val,
  email: (val) => val,
  phone_number: (val) => val,
  alternate_phone_number: (val) => val,
  fax: (val) => val,
  website: (val) => val,
  gst_number: (val) => val,
  pan_number: (val) => val,
  tax_id: (val) => val,
  logo_url: (val) => val,
  mode_of_payment: (val) => val,
  preferred_currency: (val) => val,
  credit_limit: (val) => (val ? parseFloat(val) : 0),
  opening_balance: (val) => (val ? parseFloat(val) : 0),
  notes: helper.safeJsonParse,
  address_type: (val) => val,
  address: (val) => val,
  city: (val) => val,
  state: (val) => val,
  postal_code: (val) => val,
  country: (val) => val,
  created_by: (val) => val,
  created_time: (val) => (val ? convertUTCToLocal(val) : null),
  updated_by: (val) => val,
  updated_time: (val) => (val ? convertUTCToLocal(val) : null),
};
// Create Supplier
const createSupplier = async (data, token, realm) => {
  const newSupplier = await createEntity({
    data,
    entityName: "supplier",
    token,
    realm,
    fieldMap: supplierFields,
    createModel: supplierModel.createSupplier,
    nameFields: { fullName: "name" },
    roleName:'supplier'
  });

  return newSupplier
};

// Get All Suppliers by Tenant ID with Caching
const getAllSuppliersByTenantIdAndClinicId = async (
  tenantId,
  clinicId,
  page = 1,
  limit = 10
) => {
  const offset = (page - 1) * limit;
  const cacheKey = buildCacheKey("supplier", "list", {
    tenant_id: tenantId,
    clinic_id: clinicId,
    page,
    limit,
  });

  try {
    const suppliers = await getOrSetCache(cacheKey, async () => {
      const result = await supplierModel.getAllSuppliersByTenantIdAndClinicId(
        tenantId,
        clinicId,
        Number(limit),
        offset
      );
      return result;
    });

    const convertedRows = suppliers.data.map((supplier) =>
      helper.convertDbToFrontend(supplier, supplierFieldsReverseMap)
    );

    return { data: convertedRows, total: suppliers.total };
  } catch (err) {
    console.error("Database error while fetching suppliers:", err);
    throw new CustomError("Failed to fetch suppliers", 404);
  }
};

const getAllSuppliersByTenantId = async (tenantId, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  const cacheKey = buildCacheKey("supplier", "list", {
    tenant_id: tenantId,
    page,
    limit,
  });
  try {
    const suppliers = await getOrSetCache(cacheKey, async () => {
      const result = await supplierModel.getAllSuppliersByTenantId(
        tenantId,
        Number(limit),
        offset
      );
      return result;
    });

    const convertedRows = suppliers.data.map((supplier) =>
      helper.convertDbToFrontend(supplier, supplierFieldsReverseMap)
    );

    return { data: convertedRows, total: suppliers.total };
  } catch (err) {
    console.error("Database error while fetching suppliers:", err);
    throw new CustomError("Failed to fetch suppliers", 404);
  }
};

// Get Supplier by ID & Tenant
const getSupplierByTenantIdAndSupplierId = async (tenantId, supplierId) => {
  try {
    const supplier = await supplierModel.getSupplierByTenantAndSupplierId(
      tenantId,
      supplierId
    );

    const convertedRows = helper.convertDbToFrontend(
      supplier,
      supplierFieldsReverseMap
    );

    return convertedRows;
  } catch (error) {
    throw new CustomError("Failed to get supplier: " + error.message, 404);
  }
};

// Update Supplier
const updateSupplier = async (supplierId, data, tenant_id, token, realm) => {
  return await updateEntity({
    entityId: supplierId,
    entityName: "supplier",
    tenantId:tenant_id,
    data,
    token,
    realm,
    fieldMap: supplierFields,
    getModelById: supplierModel.getSupplierByTenantAndSupplierId,
    updateModel: supplierModel.updateSupplier
  });
};

// Delete Supplier
const deleteSupplierByTenantIdAndSupplierId = async (
  tenantId,
  supplierId,
  token,
  realm
) => {
  let userId = null;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Get supplier from DB (to get keycloak_id)
    const supplier = await supplierModel.getSupplierByTenantAndSupplierId(
      tenantId,
      supplierId,
      connection
    );

    if (!supplier) {
      throw new CustomError("Supplier not found.", 404);
    }

    userId = supplier.keycloak_id;

    // 2. Delete from DB
    const affectedRows =
      await supplierModel.deleteSupplierByTenantAndSupplierId(
        connection,
        tenantId,
        supplierId
      );

    if (affectedRows === 0) {
      throw new CustomError("Failed to delete supplier from database.", 500);
    }

    // 3. Delete from Keycloak (if enabled)
    if (process.env.KEYCLOAK_POWER === "on" && userId) {
      try {
        const success = await rollbackKeycloakUser(token, realm, userId);
        if (!success) {
          throw new CustomError("Failed to delete user from Keycloak", 500);
        }
        console.log(`✅ Keycloak user ${userId} deleted (supplier)`);
      } catch (kcError) {
        console.error(
          `❌ Keycloak deletion failed for supplier ${userId}:`,
          kcError.message
        );
        // 🔁 Rollback DB
        await connection.rollback();
        throw new CustomError(
          "Failed to delete supplier in Keycloak. Aborting delete.",
          500
        );
      }
    }

    // 4. Commit only if all steps succeeded
    await connection.commit();

    // 5. Invalidate cache
    await invalidateCacheByPattern("supplier:*");

    return { affectedRows };
  } catch (error) {
    console.error("Delete Supplier Error:", error.message);
    throw new CustomError(`Failed to delete supplier: ${error.message}`, 400);
  } finally {
    connection.release();
  }
};

module.exports = {
  createSupplier,
  getAllSuppliersByTenantId,
  getSupplierByTenantIdAndSupplierId,
  updateSupplier,
  deleteSupplierByTenantIdAndSupplierId,
  getAllSuppliersByTenantIdAndClinicId,
};
