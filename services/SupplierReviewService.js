const { CustomError } = require("../middlewares/CustomeError");
const supplier_reviewsModel = require("../models/SupplierReviewsModel");
const {
  redisClient,
  getOrSetCache,
  invalidateCacheByPattern,
} = require("../config/redisConfig");
const { decodeJsonFields } = require("../utils/Helpers");
const { mapFields } = require("../query/Records");
const helper = require("../utils/Helpers");

const { formatDateOnly, convertUTCToLocal } = require("../utils/DateUtils");

// Field mapping for supplier_reviewss (similar to treatment)

const supplier_reviewsFields = {
  tenant_id: (val) => val,
  clinic_id: (val) => val,
  supplier_id: (val) => val,
  rating_quality: (val) => parseInt(val),
  rating_delivery: (val) => parseInt(val),
  rating_communication: (val) => parseInt(val),
  comment:helper.safeStringify,
  reviewed_by: (val) => val,
};
const supplier_reviewsFieldsReverseMap = {
  supplier_payment_id: (val) => val,
  tenant_id: (val) => val,
  clinic_id: (val) => val,
  supplier_id: (val) => val,
  rating_quality: (val) => parseInt(val),
  rating_delivery: (val) => parseInt(val),
  rating_communication: (val) => parseInt(val),
  comment: helper.safeJsonParse,
  reviewed_by: (val) => val,
  created_by: (val) => val,
  created_time: (val) => (val ? convertUTCToLocal(val) : null),
  updated_by: (val) => val,
  updated_time: (val) => (val ? convertUTCToLocal(val) : null),
};
// Create SupplierReviews
const createSupplierReviews = async (data) => {
  const fieldMap = {
    ...supplier_reviewsFields,
    created_by: (val) => val,
  };
  try {
    const { columns, values } = mapFields(data, fieldMap);
    const supplier_reviewsId =
      await supplier_reviewsModel.createSupplierReviews(
        "supplier_reviews",
        columns,
        values
      );
    await invalidateCacheByPattern("supplier_reviews:*");
    return supplier_reviewsId;
  } catch (error) {
    console.error("Failed to create supplier_reviews:", error);
    throw new CustomError(
      `Failed to create supplier_reviews: ${error.message}`,
      404
    );
  }
};

// Get All SupplierReviewss by Tenant ID with Caching
const getAllSupplierReviewssByTenantId = async (
  tenantId,
  page = 1,
  limit = 10
) => {
  const offset = (page - 1) * limit;
  const cacheKey = `supplier_reviews:${tenantId}:page:${page}:limit:${limit}`;

  try {
    const supplier_reviewss = await getOrSetCache(cacheKey, async () => {
      const result =
        await supplier_reviewsModel.getAllSupplierReviewssByTenantId(
          tenantId,
          Number(limit),
          offset
        );
      return result;
    });

    const convertedRows = supplier_reviewss.data.map((supplier_reviews) =>
      helper.convertDbToFrontend(
        supplier_reviews,
        supplier_reviewsFieldsReverseMap
      )
    );

    return { data: convertedRows, total: supplier_reviewss.total };
  } catch (err) {
    console.error("Database error while fetching supplier_reviewss:", err);
    throw new CustomError("Failed to fetch supplier_reviewss", 404);
  }
};

// Get SupplierReviews by ID & Tenant
const getSupplierReviewsByTenantIdAndSupplierReviewsId = async (
  tenantId,
  supplier_reviewsId
) => {
  try {
    const supplier_reviews =
      await supplier_reviewsModel.getSupplierReviewsByTenantAndSupplierReviewsId(
        tenantId,
        supplier_reviewsId
      );

    const convertedRows = helper.convertDbToFrontend(
      supplier_reviews,
      supplier_reviewsFieldsReverseMap
    );

    return convertedRows;
  } catch (error) {
    throw new CustomError(
      "Failed to get supplier_reviews: " + error.message,
      404
    );
  }
};

// Update SupplierReviews
const updateSupplierReviews = async (supplier_reviewsId, data, tenant_id) => {
  const fieldMap = {
    ...supplier_reviewsFields,
    updated_by: (val) => val,
  };
  try {
    const { columns, values } = mapFields(data, fieldMap);
    const affectedRows = await supplier_reviewsModel.updateSupplierReviews(
      supplier_reviewsId,
      columns,
      values,
      tenant_id
    );

    if (affectedRows === 0) {
      throw new CustomError(
        "SupplierReviews not found or no changes made.",
        404
      );
    }

    await invalidateCacheByPattern("supplier_reviews:*");
    return affectedRows;
  } catch (error) {
    console.error("Update Error:", error);
    throw new CustomError("Failed to update supplier_reviews", 404);
  }
};

// Delete SupplierReviews
const deleteSupplierReviewsByTenantIdAndSupplierReviewsId = async (
  tenantId,
  supplier_reviewsId
) => {
  try {
    const affectedRows =
      await supplier_reviewsModel.deleteSupplierReviewsByTenantAndSupplierReviewsId(
        tenantId,
        supplier_reviewsId
      );
    if (affectedRows === 0) {
      throw new CustomError("SupplierReviews not found.", 404);
    }

    await invalidateCacheByPattern("supplier_reviews:*");
    return affectedRows;
  } catch (error) {
    throw new CustomError(
      `Failed to delete supplier_reviews: ${error.message}`,
      404
    );
  }
};

module.exports = {
  createSupplierReviews,
  getAllSupplierReviewssByTenantId,
  getSupplierReviewsByTenantIdAndSupplierReviewsId,
  updateSupplierReviews,
  deleteSupplierReviewsByTenantIdAndSupplierReviewsId,
};
