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
const {
  addUser,
  getUserIdByUsername,
  assignRealmRoleToUser,
  addUserToGroup,
} = require("../middlewares/KeycloakAdmin");

const { formatDateOnly, convertUTCToLocal } = require("../utils/DateUtils");
const { buildCacheKey } = require("../utils/RedisCache");
const { encrypt } = require("../middlewares/PasswordHash");
const { saveDocuments, updateSingleDocument2 } = require("../utils/UploadFiles");
const { getDocumentsByField, deleteDocumentsByTableAndId } = require("../models/documentModel");

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
  credit_limit: (val) =>val? parseFloat(val):0,
  opening_balance: (val) =>val? parseFloat(val):0,
  notes:helper.safeStringify,
  address_type:(val)=>val,
  address:(val)=>val,
  city:(val)=>val,
  state:(val)=>val,
  postal_code:(val)=>val,
  country:(val)=>val
};
const supplierFieldsReverseMap = {
  supplier_id:(val)=>val,
  tenant_id: (val) => val,
  clinic_id: (val) => val,
  keycloak_id: (val) => val,
  username: (val) => val,
  password: (val) => val,
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
  credit_limit: (val) =>val? parseFloat(val):0,
  opening_balance: (val) =>val? parseFloat(val):0,
  notes:helper.safeJsonParse,
  address_type:(val)=>val,
  address:(val)=>val,
  city:(val)=>val,
  state:(val)=>val,
  postal_code:(val)=>val,
  country:(val)=>val,
  created_by: (val) => val,
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
  try {
    if (process.env.KEYCLOAK_POWER === "on") {
      // 1. Generate username/email
      const username = helper.generateUsername(
        data.name,
        data.phone_number
      );
      const email =
        data.email ||
        `${username}${helper.generateAlphanumericPassword()}@gmail.com`;
        

        const [firstName, ...rest] = data.name.trim().split(" ");
        const lastName = rest.length > 0 ? rest.join(" ") : "-";
  
        const userData = {
          username,
          email,
          firstName,
          lastName,
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

      console.log("🩺 Assigned 'supplier' role");

      // 5. Optional: Add to Group (e.g., based on clinicId)
      if (data.clinic_id) {
        const groupName = `dental-${data.tenant_id}-${data.clinic_id}`;
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

 
    
    if (data?.logo_url) {
      await saveDocuments({
        table_name: "supplier",
        table_id: supplierId,
        field_name: "logo_url",
        files: data?.logo_url, // from middleware
        created_by: data.created_by,
      });
    }
    await invalidateCacheByPattern("supplier:*");
    return supplierId;
  } catch (error) {
    console.error("Failed to create supplier:", error);
    throw new CustomError(err, 500);
  }
};

// Get All Suppliers by Tenant ID with Caching
const getAllSuppliersByTenantIdAndClinicId = async (tenantId,clinicId, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  const cacheKey = buildCacheKey("supplier", "list", {
    tenant_id: tenantId,
    clinic_id:clinicId,
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

    const convertedRows = await Promise.all(
      suppliers.data.map(async (supplier) => {
        // Step 1: Convert DB fields to frontend fields
        const formatted = helper.convertDbToFrontend(
          supplier,
          supplierFieldsReverseMap
        );
    
        // Step 2: Fetch supplier documents
        const docs = await getDocumentsByField(
          "supplier", // table name
          supplier.supplier_id, // supplier's primary key
          "logo_url" // document field type
        );
    
        // Step 3: Extract only required fields from docs
        const fileInfos = docs.map((doc) => ({
          document_id: doc.document_id,
          file_url: doc.file_url,
        }));
    
        // Step 4: Return supplier data with documents
        return {
          ...formatted,
          logo_url: fileInfos,
        };
      })
    );

    return { data: convertedRows, total: suppliers.total };
  } catch (err) {
    console.error("Database error while fetching suppliers:", err);
    throw new CustomError(err, 500);
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

    const convertedRows = await Promise.all(
      suppliers.data.map(async (supplier) => {
        // Step 1: Convert DB fields to frontend fields
        const formatted = helper.convertDbToFrontend(
          supplier,
          supplierFieldsReverseMap
        );
    
        // Step 2: Fetch supplier documents
        const docs = await getDocumentsByField(
          "supplier", // table name
          supplier.supplier_id, // supplier's primary key
          "logo_url" // document field type
        );
    
        // Step 3: Extract only required fields from docs
        const fileInfos = docs.map((doc) => ({
          document_id: doc.document_id,
          file_url: doc.file_url,
        }));
    
        // Step 4: Return supplier data with documents
        return {
          ...formatted,
          logo_url: fileInfos,
        };
      })
    );
    

    return { data: convertedRows, total: suppliers.total };
  } catch (err) {
    console.error("Database error while fetching suppliers:", err);
    throw new CustomError(err, 500);
  }
};

// Get Supplier by ID & Tenant
const getSupplierByTenantIdAndSupplierId = async (tenantId, supplierId) => {
  try {
    const supplier = await supplierModel.getSupplierByTenantAndSupplierId(
      tenantId,
      supplierId
    );

    const convertedRows =helper.convertDbToFrontend(
      supplier,
      supplierFieldsReverseMap
    );

    const documents = await getDocumentsByField(
      "supplier",
      supplierId,
      "logo_url"
    );

    // Format each document
    const logo_url = documents.map((doc) => ({
      document_id: doc.document_id,
      file_url: doc.file_url,
    }));

    // Attach to the response
    return {
      ...convertedRows,
      logo_url,
    };
  } catch (error) {
    throw new CustomError(err, 500);
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

    await updateSingleDocument2({
      table_name: "supplier",
      table_id: supplierId,
      field_name: "logo_url",
      newFile: data?.logo_url,
      deleteOld: true,
      created_by: data.created_by,
      updated_by: data.updated_by
    });
    

    await invalidateCacheByPattern("supplier:*");
    return affectedRows;
  } catch (error) {
    console.error("Update Error:", error);
    throw new CustomError(err, 500);
  }
};

// Delete Supplier
const deleteSupplierByTenantIdAndSupplierId = async (tenantId, supplierId) => {
  try {
    await deleteDocumentsByTableAndId('supplier',supplierId)
    const affectedRows =
      await supplierModel.deleteSupplierByTenantAndSupplierId(
        tenantId,
        supplierId
      );
    // if (affectedRows === 0) {
    //   throw new CustomError(err, 500);
    // }

    await invalidateCacheByPattern("supplier:*");
    return affectedRows;
  } catch (error) {
    throw new CustomError(err, 500);
  }
};

module.exports = {
  createSupplier,
  getAllSuppliersByTenantId,
  getSupplierByTenantIdAndSupplierId,
  updateSupplier,
  deleteSupplierByTenantIdAndSupplierId,
  getAllSuppliersByTenantIdAndClinicId
};
