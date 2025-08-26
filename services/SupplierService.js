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
  created_by: (val) => vpal,
  created_time: (val) => (val ? convertUTCToLocal(val) : null),
  updated_by: (val) => val,
  updated_time: (val) => (val ? convertUTCToLocal(val) : null),
};
// Create Supplier
const createSupplier = async (data, token, realm) => {
  const fieldMap = {
    ...supplierFields,
    created_by: (val) => val,
  };

  let userId = null; // Track Keycloak user for rollback
  let username = null; // Generated username
  let rawPassword = null; // Raw password to return (once)

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    if (process.env.KEYCLOAK_POWER === "on") {
      // 1. Generate username
      username = await helper.generateUsername("SUP", realm, token);
      const newpassword ="1234" || helper.generateAlphanumericPassword();
            rawPassword= helper.encrypt(newpassword)
      const email =
        data.email ||
        `${username}${helper.generateAlphanumericPassword()}@gmail.com`;

      // 2. Extract firstName and lastName from name
      const [firstName, ...rest] = data.name.trim().split(" ");
      const lastName = rest.length > 0 ? rest.join(" ") : "-";

      const userData = {
        username,
        email,
        firstName,
        lastName,
        password: "1234"||rawPassword,
        emailVerified: true, // Important: avoid email verification flow
      };

      // 3. Create Keycloak user
      const isUserCreated = await addUser(token, realm, userData);
      if (!isUserCreated) {
        throw new CustomError("Keycloak user creation failed", 400);
      }
      console.log("✅ Keycloak user created:", username);

      // 4. Get Keycloak user ID
      userId = await getUserIdByUsername(token, realm, username);
      if (!userId) {
        throw new CustomError("Could not fetch Keycloak user ID", 400);
      }
      console.log("🆔 Keycloak user ID fetched:", userId);

      // 5. Assign 'supplier' role
      const roleAssigned = await assignRealmRoleToUser(
        token,
        realm,
        userId,
        "supplier"
      );
      if (!roleAssigned) {
        throw new CustomError("Failed to assign 'supplier' role", 400);
      }
      console.log("🏷️ Role 'supplier' assigned");

      // 6. Optional: Add to group (clinic-based)
      if (data.clinic_id) {
        const groupName = `dental-${data.tenant_id}-${data.clinic_id}`;
        const groupAdded = await addUserToGroup(
          token,
          realm,
          userId,
          groupName
        );
        if (!groupAdded) {
          console.warn(`⚠️ Failed to add supplier to group: ${groupName}`);
        } else {
          console.log(`👥 Added to group: ${groupName}`);
        }
      }

      // Attach to DB data
      data.keycloak_id = userId;
      data.username = username;
      data.password = encrypt(rawPassword).content;
    }

    // 7. Map fields and insert supplier
    const { columns, values } = mapFields(data, fieldMap);
    const supplierId = await supplierModel.createSupplier(
      connection,
      "supplier",
      columns,
      values
    );

    // 8. Commit transaction
    await connection.commit();

    // 9. Invalidate cache (after commit)
    await invalidateCacheByPattern("supplier:*");
    await invalidateCacheByPattern("supplier:clinic:*"); // Optional: granular

    // 10. Return result
    return {
      supplierId,
      username,
      password: rawPassword, // Only returned once, on creation
    };
  } catch (error) {
    // 🔴 Rollback DB transaction
    await connection.rollback();

    // 🔁 Rollback Keycloak user if created
    if (process.env.KEYCLOAK_POWER === "on" && userId) {
      try {
        await rollbackKeycloakUser(token, realm, userId);
        console.log(`♻️ Rolled back Keycloak user: ${userId}`);
      } catch (rollbackErr) {
        console.error("❌ Failed to rollback Keycloak user:", rollbackErr);
      }
    }

    console.error("❌ Failed to create supplier:", error.message);
    throw new CustomError(`Failed to create supplier: ${error.message}`, 500);
  } finally {
    connection.release(); // Always release connection
  }
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
  const fieldMap = {
    ...supplierFields,
    updated_by: (val) => val,
  };

  let userId = null;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Get current supplier (to get keycloak_id)
    const supplier = await supplierModel.getSupplierByTenantAndSupplierId(
      tenant_id,
      supplierId,
      connection
    );

    if (!supplier) {
      throw new CustomError("Supplier not found", 404);
    }

    userId = supplier.keycloak_id;

    // 2. Prepare and update DB
    const { columns, values } = mapFields(data, fieldMap);
    const affectedRows = await supplierModel.updateSupplier(
      connection,
      supplierId,
      columns,
      values,
      tenant_id
    );

    if (affectedRows === 0) {
      await connection.commit();
      return { affectedRows };
    }

    // 3. Sync to Keycloak (email, name)
    if (process.env.KEYCLOAK_POWER === "on" && userId) {
      const updatePayload = {};
      if (data.email) updatePayload.email = data.email;

      // Extract firstName and lastName from `name`
      if (data.name) {
        const [firstName, ...rest] = data.name.trim().split(" ");
        updatePayload.firstName = firstName;
        updatePayload.lastName = rest.length > 0 ? rest.join(" ") : "-";
      }

      if (Object.keys(updatePayload).length > 0) {
        try {
          await updateUserInKeycloak(token, realm, userId, updatePayload);
          console.log(
            `✅ Synced supplier ${supplierId} to Keycloak`,
            updatePayload
          );
        } catch (kcError) {
          console.warn(
            `⚠️ Keycloak sync failed for supplier ${supplierId}. Continuing with DB update.`,
            kcError.message
          );
          // 🟡 Do NOT rollback — DB is source of truth
        }
      }
    }

    // 4. Commit transaction
    await connection.commit();

    // 5. Invalidate cache
    await invalidateCacheByPattern("supplier:*");

    return { affectedRows };
  } catch (error) {
    await connection.rollback();
    console.error("Update Supplier Error:", error.message);
    throw new CustomError(`Failed to update supplier: ${error.message}`, 500);
  } finally {
    connection.release();
  }
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
