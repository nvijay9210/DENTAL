const { CustomError } = require("../middlewares/CustomeError");
const receiptionModel = require("../models/ReceiptionModel");
const {
  getOrSetCache,
  invalidateCacheByPattern,
} = require("../config/redisConfig");
const { mapFields } = require("../query/Records");
const helper = require("../utils/Helpers");
const { formatDateOnly } = require("../utils/DateUtils");

// Field mapping for receiptions (similar to treatment)

const receiptionFields = {
  tenant_id: (val) => val,
  clinic_id: (val) => val,
  keycloak_id: (val) => val,
  username: (val) => val,
  password: (val) => val,
  full_name: (val) => val,
  email: (val) => val,
  phoone_numebr: (val) => val,
  alternate_phone_number: (val) => val,
  date_pf_birth: (val) => val,
  gender: (val) => val,
  address: (val) => helper.safeStringify(val),
  city: (val) => val,
  state: (val) => val,
  country: (val) => val,
  pincode: (val) => val,
  last_login: (val) => val,
};
const receiptionFieldsReverseMap = {
  tenant_id: (val) => val,
  clinic_id: (val) => val,
  keycloak_id: (val) => val,
  username: (val) => val,
  password: (val) => val,
  full_name: (val) => val,
  email: (val) => val,
  phoone_numebr: (val) => val,
  alternate_phone_number: (val) => val,
  date_pf_birth: (val) => formatDateOnly(val),
  gender: (val) => val,
  address: (val) => helper.safeJsonParse(val),
  city: (val) => val,
  state: (val) => val,
  country: (val) => val,
  pincode: (val) => val,
  last_login: (val) => val,
  created_by: (val) => val,
  created_time: (val) => (val ? new Date(val).toISOString() : null),
  updated_by: (val) => val,
  updated_time: (val) => (val ? new Date(val).toISOString() : null),
};
// Create Receiption
const createReceiption = async (data,token,realm) => {
  const fieldMap = {
    ...receiptionFields,
    created_by: (val) => val,
  };
  try {
    const userData = {
        username: helper.generateUsername(data.first_name, data.phone_number),
        email:
          data.email ||
          `${data.first_name}${helper.generateAlphanumericPassword()}@gmail.com`,
        firstName: data.first_name,
        lastName: data.last_name,
        password: helper.generateAlphanumericPassword(),
      };
      const user = await addUser(token, realm, userData);
      if (!user) throw new CustomError("User not created", 404);
      console.log("User Created");
      const userId = await getUserIdByUsername(token, realm, userData.username);
      console.log("user:", userId);
      const role = await assignRealmRoleToUser(token, realm, userId, "patient");
      if (!role) throw new CustomError("Role not Assign", 404);
      data.keycloak_id = userId;
      data.username=userData.username;
      data.password=encrypt(userData.password);

    const { columns, values } = mapFields(data, fieldMap);
    const receiptionId = await receiptionModel.createReceiption(
      "receiption",
      columns,
      values
    );
    await invalidateCacheByPattern("receiption:*");
    return receiptionId;
  } catch (error) {
    console.error("Failed to create receiption:", error);
    throw new CustomError(`Failed to create receiption: ${error.message}`, 404);
  }
};

// Get All Receiptions by Tenant ID with Caching
const getAllReceiptionsByTenantId = async (tenantId, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  const cacheKey = `receiption:${tenantId}:page:${page}:limit:${limit}`;

  try {
    const receiptions = await getOrSetCache(cacheKey, async () => {
      const result = await receiptionModel.getAllReceiptionsByTenantId(
        tenantId,
        Number(limit),
        offset
      );
      return result;
    });

    const convertedRows = receiptions.data.map((receiption) =>
      helper.convertDbToFrontend(receiption, receiptionFieldsReverseMap)
    );

    return { data: convertedRows, total: receiptions.total };
  } catch (err) {
    console.error("Database error while fetching receiptions:", err);
    throw new CustomError("Failed to fetch receiptions", 404);
  }
};

// Get Receiption by ID & Tenant
const getReceiptionByTenantIdAndReceiptionId = async (
  tenantId,
  receiptionId
) => {
  try {
    const receiption =
      await receiptionModel.getReceiptionByTenantAndReceiptionId(
        tenantId,
        receiptionId
      );

    const convertedRows = helper.convertDbToFrontend(
      receiption,
      receiptionFieldsReverseMap
    );

    return convertedRows;
  } catch (error) {
    throw new CustomError("Failed to get receiption: " + error.message, 404);
  }
};

// Update Receiption
const updateReceiption = async (receiptionId, data, tenant_id) => {
  const fieldMap = {
    ...receiptionFields,
    updated_by: (val) => val,
  };
  try {
    const { columns, values } = mapFields(data, fieldMap);
    const affectedRows = await receiptionModel.updateReceiption(
      receiptionId,
      columns,
      values,
      tenant_id
    );

    if (affectedRows === 0) {
      throw new CustomError("Receiption not found or no changes made.", 404);
    }

    await invalidateCacheByPattern("receiption:*");
    return affectedRows;
  } catch (error) {
    console.error("Update Error:", error);
    throw new CustomError("Failed to update receiption", 404);
  }
};

// Delete Receiption
const deleteReceiptionByTenantIdAndReceiptionId = async (
  tenantId,
  receiptionId
) => {
  try {
    const affectedRows =
      await receiptionModel.deleteReceiptionByTenantAndReceiptionId(
        tenantId,
        receiptionId
      );
    if (affectedRows === 0) {
      throw new CustomError("Receiption not found.", 404);
    }

    await invalidateCacheByPattern("receiption:*");
    return affectedRows;
  } catch (error) {
    throw new CustomError(`Failed to delete receiption: ${error.message}`, 404);
  }
};

module.exports = {
  createReceiption,
  getAllReceiptionsByTenantId,
  getReceiptionByTenantIdAndReceiptionId,
  updateReceiption,
  deleteReceiptionByTenantIdAndReceiptionId,
};
