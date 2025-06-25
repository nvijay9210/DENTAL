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

const { formatDateOnly, convertUTCToLocal } = require("../utils/DateUtils");

// Field mapping for suppliers (similar to treatment)

const supplierFields = {
  tenant_id: (val) => val,
  clinic_id: (val) => val,
  keycloak_id: (val) => val,
  username: (val) => val,
  password: (val) => val,
  supplier_name: (val) => val,
  supplier_category: (val) => val,
  payment_status: (val) => val,
  supplier_status: (val) => val,
  supplier_contact_number: (val) => val,
  supplier_country: (val) => val,
  supplier_performance_rating: (val) => val,
};
const supplierFieldsReverseMap = {
  supplier_id: (val) => val,
  tenant_id: (val) => val,
  clinic_id: (val) => val,
  keycloak_id: (val) => val,
  username: (val) => val,
  password: (val) => val,
  supplier_name: (val) => val,
  supplier_category: (val) => val,
  payment_status: (val) => val,
  supplier_status: (val) => val,
  supplier_contact_number: (val) => val,
  supplier_country: (val) => val,
  supplier_performance_rating: (val) => val,
  created_by: (val) => val,
  created_time: (val) => (val ? convertUTCToLocal(val) : null),
  updated_by: (val) => val,
  updated_time: (val) => (val ? convertUTCToLocal(val) : null),
};
// Create Supplier
const createSupplier = async (data) => {
  const fieldMap = {
    ...supplierFields,
    created_by: (val) => val,
  };
  try {
    if (process.env.KEYCLOAK_POWER === "on") {
      // 1. Generate username/email
      const username = helper.generateUsername(
        data.first_name,
        data.phone_number
      );
      const email =
        data.email ||
        `${username}${helper.generateAlphanumericPassword()}@gmail.com`;

      const userData = {
        username,
        email,
        firstName: data.first_name,
        lastName: data.last_name,
        password: "1234", // For demo; use generateAlphanumericPassword() in production
      };

      // 2. Create Keycloak User
      const isUserCreated = await addUser(token, realm, userData);
      if (!isUserCreated)
        throw new CustomError("Keycloak user not created", 400);

      console.log("✅ Keycloak user created:", userData.username);

      // 3. Get User ID from Keycloak
      const userId = await getUserIdByUsername(token, realm, userData.username);
      if (!userId)
        throw new CustomError("Could not fetch Keycloak user ID", 400);

      console.log("🆔 Keycloak user ID fetched:", userId);

      // 4. Assign Role: 'supplier'
      const roleAssigned = await assignRealmRoleToUser(
        token,
        realm,
        userId,
        "supplier"
      );
      if (!roleAssigned)
        throw new CustomError("Failed to assign 'supplier' role", 400);

      console.log("🩺 Assigned 'doctor' role");

      // 5. Optional: Add to Group (e.g., based on clinicId)
      if (data.clinicId) {
        const groupName = `dental-${data.tenantId}-${data.clinicId}`;
        const groupAdded = await addUserToGroup(
          token,
          realm,
          userId,
          groupName
        );

        if (!groupAdded) {
          console.warn(`⚠️ Failed to add user to group: ${groupName}`);
        } else {
          console.log(`👥 Added to group: ${groupName}`);
        }
      }

      (data.keycloak_id = userId),
        (data.username = username),
        (data.password = encrypt(userData.password).content);
    }

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
