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
const { buildCacheKey } = require("../utils/RedisCache");
const { saveDocuments } = require("../utils/UploadFiles");

// Field mapping for supplier_paymentss (similar to treatment)

const supplier_paymentsFields = {
  tenant_id: (val) => val,
  clinic_id: (val) => val,
  supplier_id: (val) => val,
  purchase_order_id: (val) => val,
  amount: (val) => parseFloat(val),
  mode_of_payment: (val) => val,
  paid_amount: (val) => (val ? parseFloat(val) : 0),
  balance_amount: (val) => (val ? parseFloat(val) : 0),
  supplier_payment_documents: (val) => (val ? helper.safeStringify(val) : null),
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
  purchase_order_id: (val) => val,
  amount: (val) => parseFloat(val),
  mode_of_payment: (val) => val,
  paid_amount: (val) => (val ? parseFloat(val) : 0),
  balance_amount: (val) => (val ? parseFloat(val) : 0),
  supplier_payment_documents: (val) => (val ? helper.safeJsonParse(val) : null),
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
// const createSupplierPayments = async (data) => {
//   const fieldMap = {
//     ...supplier_paymentsFields,
//     created_by: (val) => val,
//   };
//   try {
//     const { columns, values } = mapFields(data, fieldMap);
//     const supplier_paymentsId =
//       await supplier_paymentsModel.createSupplierPayments(
//         "supplier_payments",
//         columns,
//         values
//       );
//     await invalidateCacheByPattern("supplier_payments:*");
//     await invalidateCacheByPattern("financeSummary:*");
//     return supplier_paymentsId;
//   } catch (error) {
//     console.error("Failed to create supplier_payments:", error);
//     throw new CustomError(
//       `Failed to create supplier_payments: ${error.message}`,
//       404
//     );
//   }
// };

const createSupplierPayments = async (data) => {
  const fieldMap = {
    ...supplier_paymentsFields,
    created_by: (val) => val,
  };

  try {
    let remainingAmount = data.amount;
    const supplierId = data.supplier_id;
    const supplierpaymentid = data.supplier_payment_id;
    const createdBy = data.created_by;

    // Step 1: Get previous unpaid supplier_payment records (FIFO style)
    const unpaidPayments = await supplier_paymentsModel.getUnpaidEntriesFIFO(supplierpaymentid);
    // These entries must have: balance_amount > 0

    // Step 2: Start applying the new payment
    for (const unpaid of unpaidPayments) {
      if (remainingAmount <= 0) break;

      const pending = unpaid.balance_amount;
      const paidNow = Math.min(remainingAmount, pending);
      const newBalance = pending - paidNow;

      // New record showing payment applied to previous unpaid entry
      const paymentData = {
        supplier_id: supplierId,
        reference_id: unpaid.id, // refers to the old unpaid entry
        paid_amount: paidNow,
        balance_amount: 0,
        created_by: createdBy,
        payment_type: "payment", // optional: helps identify this as a payment
        payment_mode: data.payment_mode || null,
        remarks: data.remarks || null,
      };

      const { columns, values } = mapFields(paymentData, fieldMap);

      await supplier_paymentsModel.createSupplierPayments("supplier_payments", columns, values);

      // Update the balance of the original unpaid record
      await supplier_paymentsModel.updateBalanceAmount(unpaid.supplier_payment_id, newBalance);

      remainingAmount -= paidNow;
    }

    // If amount still remains, and there’s no previous due, insert as advance
    if (remainingAmount > 0) {
      const advanceData = {
        supplier_id: supplierId,
        paid_amount: remainingAmount,
        balance_amount: 0,
        created_by: createdBy,
        payment_type: "advance", // to differentiate it
        payment_mode: data.payment_mode || null,
        remarks: data.remarks || "Advance payment",
      };

      const { columns, values } = mapFields(advanceData, fieldMap);
      await supplier_paymentsModel.createSupplierPayments("supplier_payments", columns, values);
    }

    if (data?.supplier_payment_documents) {
      await saveDocuments({
        table_name: "supplier_payments",
        table_id: supplier_payment_Id,
        field_name: "supplier_payment_documents",
        files: data?.supplier_payment_documents, // from middleware
        created_by: data.created_by,
      });
    }

    // Invalidate cache
    await invalidateCacheByPattern("supplier_payments:*");
    await invalidateCacheByPattern("financeSummary:*");

    return { message: "Supplier payments recorded successfully." };

  } catch (error) {
    console.error("Failed to create supplier_payments:", error);
    throw new CustomError(`Failed to create supplier_payments: ${error.message}`, 404);
  }
};


// Get All SupplierPaymentss by Tenant ID with Caching
const getAllSupplierPaymentssByTenantId = async (
  tenantId,
  page = 1,
  limit = 10
) => {
  const offset = (page - 1) * limit;
  const cacheKey = buildCacheKey("supplier_payments", "list", {
    tenant_id: tenantId,
    page,
    limit,
  });

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
    throw new CustomError(err, 500);
  }
};

const getAllSupplierPaymentssByTenantIdAndSupplierId = async (
  tenantId,
  supplier_id,
  page = 1,
  limit = 10
) => {
  const offset = (page - 1) * limit;
  const cacheKey = buildCacheKey("supplier_payments", "list", {
    tenant_id: tenantId,
    supplier_id,
    page,
    limit,
  });

  try {
    const supplier_paymentss = await getOrSetCache(cacheKey, async () => {
      const result =
        await supplier_paymentsModel.getAllSupplierPaymentssByTenantIdAndSupplierId(
          tenantId,
          supplier_id,
          Number(limit),
          offset
        );
      return result;
    });

    const convertedRows = supplier_paymentss.data.map((supplier_payments) => ({
      ...supplier_payments,
      order_date: formatDateOnly(supplier_payments.order_date),
      delivery_date: formatDateOnly(supplier_payments.delivery_date),
      payment_date: formatDateOnly(supplier_payments.payment_date),
      created_time: formatDateOnly(supplier_payments.created_time),
    }));

    return { data: convertedRows, total: supplier_paymentss.total };
  } catch (err) {
    console.error("Database error while fetching supplier_paymentss:", err);
    throw new CustomError(err, 500);
  }
};

const getSupplierPaymentsByTenantAndPurchaseOrderId = async (
  tenantId,
  purchase_order_id,
  page = 1,
  limit = 10
) => {
  const offset = (page - 1) * limit;
  const cacheKey = buildCacheKey("supplier_payments", "list", {
    tenant_id: tenantId,
    purchase_order_id,
    page,
    limit,
  });

  try {
    const supplier_paymentss = await getOrSetCache(cacheKey, async () => {
      const result =
        await supplier_paymentsModel.getSupplierPaymentsByTenantAndPurchaseOrderId(
          tenantId,
          purchase_order_id,
          Number(limit),
          offset
        );
      return result;
    });

    const convertedRows = supplier_paymentss.data.map((r) => ({
      ...r,
      order_date: formatDateOnly(r.order_date),
      delivery_date: formatDateOnly(r.delivery_date),
      payment_date: formatDateOnly(r.payment_date),
    }));

    return { data: convertedRows, total: supplier_paymentss.total };
  } catch (err) {
    console.error("Database error while fetching supplier_paymentss:", err);
    throw new CustomError(err, 500);
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

// const getSupplierPaymentsByTenantAndPurchaseOrderId = async (
//   tenantId,
//   purchase_order_id
// ) => {
//   try {
//     const supplier_payments =
//       await supplier_paymentsModel.getSupplierPaymentsByTenantAndPurchaseOrderId(
//         tenantId,
//         purchase_order_id
//       );

//     const convertedRows = helper.convertDbToFrontend(
//       supplier_payments,
//       supplier_paymentsFieldsReverseMap
//     );

//     return convertedRows;
//   } catch (error) {
//     throw new CustomError(
//       "Failed to get supplier_payments: " + error.message,
//       404
//     );
//   }
// };

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

    // if (affectedRows === 0) {
    //   throw new CustomError(
    //     "SupplierPayments not found or no changes made.",
    //     404
    //   );
    // }

    await invalidateCacheByPattern("supplier_payments:*");
    await invalidateCacheByPattern("financeSummary:*");
    return affectedRows;
  } catch (error) {
    console.error("Update Error:", error);
    throw new CustomError(err, 500);
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
    // if (affectedRows === 0) {
    //   throw new CustomError(err, 500);
    // }

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
  getSupplierPaymentsByTenantAndPurchaseOrderId,
  getAllSupplierPaymentssByTenantIdAndSupplierId,
};
