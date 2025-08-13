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
const { saveDocuments, updateDocumentsDiffBased } = require("../utils/UploadFiles");
const { convertRowsWithDocs } = require("../utils/ResponseConvertion");

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

      await saveDocuments({
        table_name: "supplier_payments",
        table_id: supplier_paymentsId,
        field_name: "supplier_payment_documents",
        files: data.supplier_payment_documents,
        created_by: data.created_by,
      });

    await invalidateCacheByPattern("supplier_payments:*");
    await invalidateCacheByPattern("financeSummary:*");
    return supplier_paymentsId;
  } catch (error) {
    console.error("Failed to create supplier_payments:", error);
    throw new CustomError(
      `Failed to create supplier_payments: ${error.message}`,
      404
    );
  }
};


// fullpayment update
async function updateSupplierPaymentService(paymentId, tenantId, clinicId, updateData) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Fetch existing payment
    const currentPayment = await supplier_paymentsModel.getSupplierPaymentById(paymentId, tenantId, clinicId);
    if (!currentPayment) {
      throw new Error("Supplier payment not found");
    }

    // 2. Merge fields
    const updatedFields = {
      amount: updateData.amount ?? currentPayment.amount,
      paid_amount: updateData.paid_amount ?? currentPayment.paid_amount,
      balance_amount: updateData.balance_amount ?? currentPayment.balance_amount,
      supplier_payment_documents: updateData.supplier_payment_documents ?? currentPayment.supplier_payment_documents,
      mode_of_payment: updateData.mode_of_payment ?? currentPayment.mode_of_payment,
      receipt_number: updateData.receipt_number ?? currentPayment.receipt_number,
      bank_name: updateData.bank_name ?? currentPayment.bank_name,
      bank_account_number: updateData.bank_account_number ?? currentPayment.bank_account_number,
      bank_ifsc: updateData.bank_ifsc ?? currentPayment.bank_ifsc,
      transaction_id: updateData.transaction_id ?? currentPayment.transaction_id,
      payment_date: updateData.payment_date ?? currentPayment.payment_date,
      supplier_payment_type: updateData.supplier_payment_type ?? currentPayment.supplier_payment_type,
      updated_by: updateData.updated_by || "system"
    };

    // 3. Update in DB
    await supplier_paymentsModel.updateSupplierPayment(paymentId, tenantId, clinicId, updatedFields);

    await conn.commit();
    return { success: true, message: "Supplier payment updated successfully" };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

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

    const convertedRows = await convertRowsWithDocs({
      rows: supplier_paymentss.data,
      convertFn: helper.convertDbToFrontend,
      convertArgs: [supplier_paymentsFieldsReverseMap],
      docOptions: [
        {
          tableName: "supplier_payments",
          idField: "supplier_payment_id",
          docFieldName: "supplier_payment_documents",
          extractFields: ["document_id", "file_url"]
        }
      ]
    });

    return { data: convertedRows, total: supplier_paymentss.total };
  } catch (err) {
    console.error("Database error while fetching supplier_paymentss:", err);
    throw new CustomError(error.message,500);
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

    // const convertedRows = supplier_paymentss.data.map((supplier_payments) => ({
    //   ...supplier_payments,
    //   order_date: formatDateOnly(supplier_payments.order_date),
    //   delivery_date: formatDateOnly(supplier_payments.delivery_date),
    //   payment_date: formatDateOnly(supplier_payments.payment_date),
    //   created_time: formatDateOnly(supplier_payments.created_time),
    // }));

    const convertedRows = await convertRowsWithDocs({
      rows: supplier_paymentss.data,
      dateFields: ["order_date", "delivery_date","payment_date","created_time"],
      docOptions: [
        {
          tableName: "supplier_payments",
          idField: "supplier_payment_id",
          docFieldName: "supplier_payment_documents",
          extractFields: ["document_id", "file_url"]
        }
      ]
    });

    return { data: convertedRows, total: supplier_paymentss.total };
  } catch (err) {
    console.error("Database error while fetching supplier_paymentss:", err);
    throw new CustomError(error.message,500);
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

    const convertedRows = await convertRowsWithDocs({
      rows: supplier_paymentss.data,
      dateFields: ["order_date", "delivery_date","payment_date","created_time"],
      docOptions: [
        {
          tableName: "supplier_payments",
          idField: "supplier_payment_id",
          docFieldName: "supplier_payment_documents",
          extractFields: ["document_id", "file_url"]
        }
      ]
    });

    return { data: convertedRows, total: supplier_paymentss.total };
  } catch (err) {
    console.error("Database error while fetching supplier_paymentss:", err);
    throw new CustomError(error.message,500);
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

    // const convertedRows = helper.convertDbToFrontend(
    //   supplier_payments,
    //   supplier_paymentsFieldsReverseMap
    // );

    const convertedRows = await convertRowsWithDocs({
      rows: supplier_payments,
      convertFn: helper.convertDbToFrontend,
      convertArgs: [supplier_paymentsFieldsReverseMap],
      docOptions: [
        {
          tableName: "supplier_payments",
          idField: "supplier_payment_id",
          docFieldName: "supplier_payment_documents",
          extractFields: ["document_id", "file_url"]
        }
      ]
    });

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

    await updateDocumentsDiffBased({
      table_name: "supplier_payments",
      table_id: supplier_paymentsId,
      field_name: "supplier_payment_documents",
      newFiles: data.supplier_payment_documents,
      deletedFileIds:data.deletedFileIds,
      created_by: data.created_by,
      updated_by: data.updated_by,
    });

    await invalidateCacheByPattern("supplier_payments:*");
    await invalidateCacheByPattern("financeSummary:*");
    return affectedRows;
  } catch (error) {
    console.error("Update Error:", error);
    throw new CustomError(error.message,500);
  }
};

// Delete SupplierPayments
const deleteSupplierPaymentsByTenantIdAndSupplierPaymentsId = async (
  tenantId,
  supplier_paymentsId
) => {
  try {
    await deleteDocumentsByTableAndId('supplier_payments',supplier_paymentsId)
    const affectedRows =
      await supplier_paymentsModel.deleteSupplierPaymentsByTenantAndSupplierPaymentsId(
        tenantId,
        supplier_paymentsId
      );
    // if (affectedRows === 0) {
    //   throw new CustomError(error.message,500);
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
  updateSupplierPaymentService
};
