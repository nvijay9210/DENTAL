const { CustomError } = require("../middlewares/CustomeError");
const referenceModel = require("../models/ReferenceModel");
const {
  redisClient,
  getOrSetCache,
  invalidateCacheByPattern,
} = require("../config/redisConfig");
const { decodeJsonFields } = require("../utils/Helpers");
const { mapFields } = require("../query/Records");
const helper = require("../utils/Helpers");

const { formatDateOnly, convertUTCToLocal } = require("../utils/DateUtils");

const { buildCacheKey } = require("../utils/RedisCache");
const {
  saveDocuments,
  updateDocumentsDiffBased,
} = require("../utils/UploadFiles");
const { getDocumentsByField, deleteDocumentsByTableAndId } = require("../models/documentModel");

// Field mapping for references (similar to treatment)

const referenceFields = {
  tenant_id: (val) => val,
  clinic_id: (val) => val,
  sender_name: (val) => val,
  receiver_name: (val) => val,
  receiver_phone: (val) => val,
  sender_keycloak_id: (val) => val,
  reference_message:helper.safeStringify,
  reference_image: (val) => val
};
const referenceFieldsReverseMap = {
  referral_reference_id: (val) => val,
  tenant_id: (val) => val,
  clinic_id: (val) => val,
  sender_name: (val) => val,
  receiver_name: (val) => val,
  sender_keycloak_id: (val) => val,
  reference_message:helper.safeJsonParse,
  reference_image: (val) => val,
  created_by: (val) => val,
  created_time: (val) => (val ? convertUTCToLocal(val) : null),
  updated_by: (val) => val,
  updated_time: (val) => (val ? convertUTCToLocal(val) : null),
};
// Create Reference
const createReference = async (data) => {
  const fieldMap = {
    ...referenceFields,
    created_by: (val) => val,
  };
  try {
    const { columns, values } = mapFields(data, fieldMap);
    const referenceId = await referenceModel.createReference(
      "reference",
      columns,
      values
    );
    await invalidateCacheByPattern("reference:*");
    return referenceId;
  } catch (error) {
    console.error("Failed to create reference:", error);
    throw new CustomError(
      `Failed to create reference: ${error.message}`,
      404
    );
  }
};

// Get All References by Tenant ID with Caching
// const getAllReferencesByTenantId = async (
//   tenantId,
//   page = 1,
//   limit = 10
// ) => {
//   const offset = (page - 1) * limit;
//   const cacheKey = buildCacheKey("reference", "list", {
//     tenant_id: tenantId,
//     page,
//     limit,
//   });

//   try {
//     const references = await getOrSetCache(cacheKey, async () => {
//       const result = await referenceModel.getAllReferencesByTenantId(
//         tenantId,
//         Number(limit),
//         offset
//       );
//       return result;
//     });

//     const convertedRows = await Promise.all(
//       references.data.map(async (reference) => {
//         const formatted = helper.convertDbToFrontend(
//           reference,
//           referenceFieldsReverseMap
//         );

//         return {
//           ...formatted
//         };
//       })
//     );

//     return { data: convertedRows, total: references.total };
//   } catch (err) {
//     console.error("Database error while fetching references:", err);
//     throw new CustomError(err, 500);
//   }
// };

// const getReferencesForReceiver = async (
//   tenantId,
//   clinicId,
//   receiverId,
//   receiverRole
// ) => {
//   const cacheKey = `reference:${tenantId}`;

//   try {
//     let references = await getOrSetCache(cacheKey, async () => {
//       const result = await referenceModel.getReferencesForReceiver(
//         tenantId,
//         receiverId,
//         receiverRole,
//         clinicId
//       );
//       return result;
//     });

//     const convertedRows = await Promise.all(
//       references.map(async (reference) => {
//         const formatted = {
//           ...reference,
//           message: helper.safeJsonParse(reference.message),
//         };

//         return {
//           ...formatted,
         
//         };
//       })
//     );

//     return convertedRows;
//   } catch (err) {
//     console.error("Database error while fetching references:", err);
//     throw new CustomError(err, 500);
//   }
// };

// // Get Reference by ID & Tenant
// const getReferenceByTenantIdAndReferenceId = async (
//   tenantId,
//   reference_id
// ) => {
//   try {
//     const reference =
//       await referenceModel.getReferenceByTenantAndReferenceId(
//         tenantId,
//         reference_id
//       );

//     const convertedRows = helper.convertDbToFrontend(
//       reference,
//       referenceFieldsReverseMap
//     );

//     return {
//       ...formatted
//     };
//   } catch (error) {
//     throw new CustomError(err, 500);
//   }
// };

// // Update Reference
// const updateReference = async (reference_id, data, tenant_id) => {
//   const fieldMap = {
//     ...referenceFields,
//     updated_by: (val) => val,
//   };
//   try {
//     const { columns, values } = mapFields(data, fieldMap);
//     const affectedRows = await referenceModel.updateReference(
//       reference_id,
//       columns,
//       values,
//       tenant_id
//     )

//     await invalidateCacheByPattern("reference:*");
//     return affectedRows;
//   } catch (error) {
//     console.error("Update Error:", error);
//     throw new CustomError(err, 500);
//   }
// };

// // Delete Reference
// const deleteReferenceByTenantIdAndReferenceId = async (
//   tenantId,
//   reference_id
// ) => {
//   try {
//     await deleteDocumentsByTableAndId('reference',reference_id)
//     const affectedRows =
//       await referenceModel.deleteReferenceByTenantAndReferenceId(
//         tenantId,
//         reference_id
//       );

//     await invalidateCacheByPattern("reference:*");
//     return affectedRows;
//   } catch (error) {
//     throw new CustomError(
//       `Failed to delete reference: ${error.message}`,
//       404
//     );
//   }
// };

module.exports = {
  createReference,
  // getAllReferencesByTenantId,
  // getReferenceByTenantIdAndReferenceId,
  // updateReference,
  // deleteReferenceByTenantIdAndReferenceId,
  // getReferencesForReceiver,
};
