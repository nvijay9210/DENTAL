const { CustomError } = require("../middlewares/CustomeError");
const supplier_paymentsModel = require("../models/SupplierPaymentsModel");
const {
  redisClient,
  getOrSetCache,
  invalidateCacheByPattern,
} = require("../config/redisConfig");
const { decodeJsonFields } = require("../utils/Helpers");
const { mapFields } = require("../query/Records");
const helper = require("../utils/Helpers");

const { formatDateOnly, convertUTCToLocal } = require("../utils/DateUtils");

// Field mapping for supplier_paymentss (similar to treatment)

const supplier_paymentsFields = {
  tenant_id: (val) => val,
  clinic_id: (val) => val,
  supplier_id: (val) => val,
  amount: (val) => parseFloat(val),
  mode_of_payment: (val) => val,
  receipt_number: (val) => val,
  bank_name: (val) => val,
  bank_account_number: (val) => val,
  bank_ifsc: (val) => val,
  transaction_id: (val) => val,
  payment_date: (val) => formatDateOnly(val),
};
const supplier_paymentsFieldsReverseMap = {
  supplier_payment_id: (val) => val,
  tenant_id: (val) => val,
  clinic_id: (val) => val,
  supplier_id: (val) => val,
  amount: (val) => parseFloat(val),
  mode_of_payment: (val) => val,
  receipt_number: (val) => val,
  bank_name: (val) => val,
  bank_account_number: (val) => val,
  bank_ifsc: (val) => val,
  transaction_id: (val) => val,
  payment_date: (val) => formatDateOnly(val),
  created_by: (val) => val,
  created_time: (val) => (val ? convertUTCToLocal(val) : null),
  updated_by: (val) => val,
  updated_time: (val) => (val ? convertUTCToLocal(val) : null),
};
// Create SupplierPayments
const createSupplierPayments = async (data) => {
  const fieldMap = {
    ...supplier_paymentsFields,
    created_by: (val) => val,
  };
  try {
    const { columns, values } = mapFields(data, fieldMap);
    const supplier_paymentsId =
      await supplier_paymentsModel.createSupplierPayments(
        "supplier_payments",
        columns,
        values
      );
    await invalidateCacheByPattern("supplier_payments:*");
    return supplier_paymentsId;
  } catch (error) {
    console.error("Failed to create supplier_payments:", error);
    throw new CustomError(
      `Failed to create supplier_payments: ${error.message}`,
      404
    );
  }
};

// Get All SupplierPaymentss by Tenant ID with Caching
const getAllSupplierPaymentssByTenantId = async (
  tenantId,
  page = 1,
  limit = 10
) => {
  const offset = (page - 1) * limit;
  const cacheKey = `supplier_payments:${tenantId}:page:${page}:limit:${limit}`;

  try {
    const supplier_paymentss = await getOrSetCache(cacheKey, async () => {
      const result =
        await supplier_paymentsModel.getAllSupplierPaymentssByTenantId(
          tenantId,
          Number(limit),
          offset
        );
      return result;
    });

    const convertedRows = supplier_paymentss.data.map((supplier_payments) =>
      helper.convertDbToFrontend(
        supplier_payments,
        supplier_paymentsFieldsReverseMap
      )
    );

    return { data: convertedRows, total: supplier_paymentss.total };
  } catch (err) {
    console.error("Database error while fetching supplier_paymentss:", err);
    throw new CustomError("Failed to fetch supplier_paymentss", 404);
  }
};

// Get SupplierPayments by ID & Tenant
const getSupplierPaymentsByTenantIdAndSupplierPaymentsId = async (
  tenantId,
  supplier_paymentsId
) => {
  try {
    const supplier_payments =
      await supplier_paymentsModel.getSupplierPaymentsByTenantAndSupplierPaymentsId(
        tenantId,
        supplier_paymentsId
      );

    const convertedRows = helper.convertDbToFrontend(
      supplier_payments,
      supplier_paymentsFieldsReverseMap
    );

    return convertedRows;
  } catch (error) {
    throw new CustomError(
      "Failed to get supplier_payments: " + error.message,
      404
    );
  }
};

// Update SupplierPayments
const updateSupplierPayments = async (supplier_paymentsId, data, tenant_id) => {
  const fieldMap = {
    ...supplier_paymentsFields,
    updated_by: (val) => val,
  };
  try {
    const { columns, values } = mapFields(data, fieldMap);
    const affectedRows = await supplier_paymentsModel.updateSupplierPayments(
      supplier_paymentsId,
      columns,
      values,
      tenant_id
    );

    if (affectedRows === 0) {
      throw new CustomError(
        "SupplierPayments not found or no changes made.",
        404
      );
    }

    await invalidateCacheByPattern("supplier_payments:*");
    return affectedRows;
  } catch (error) {
    console.error("Update Error:", error);
    throw new CustomError("Failed to update supplier_payments", 404);
  }
};

// Delete SupplierPayments
const deleteSupplierPaymentsByTenantIdAndSupplierPaymentsId = async (
  tenantId,
  supplier_paymentsId
) => {
  try {
    const affectedRows =
      await supplier_paymentsModel.deleteSupplierPaymentsByTenantAndSupplierPaymentsId(
        tenantId,
        supplier_paymentsId
      );
    if (affectedRows === 0) {
      throw new CustomError("SupplierPayments not found.", 404);
    }

    await invalidateCacheByPattern("supplier_payments:*");
    return affectedRows;
  } catch (error) {
    throw new CustomError(
      `Failed to delete supplier_payments: ${error.message}`,
      404
    );
  }
};

module.exports = {
  createSupplierPayments,
  getAllSupplierPaymentssByTenantId,
  getSupplierPaymentsByTenantIdAndSupplierPaymentsId,
  updateSupplierPayments,
  deleteSupplierPaymentsByTenantIdAndSupplierPaymentsId,
};
