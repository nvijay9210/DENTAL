const { CustomError } = require("../middlewares/CustomeError");
const paymentModel = require("../models/PaymentModel");
const {
  getOrSetCache,
  invalidateCacheByPattern,
} = require("../config/redisConfig");
const { mapFields } = require("../query/Records");
const helper = require("../utils/Helpers");
const { formatDateOnly, convertUTCToLocal } = require("../utils/DateUtils");
const { buildCacheKey } = require("../utils/RedisCache");

// Field mapping for payments (similar to treatment)

const paymentFields = {
    tenant_id: (val) => val,
    clinic_id: (val) => val,
    patient_id: (val) => val,
    dentist_id: (val) => val,
    appointment_id: (val) => val,
    amount: (val) => val? parseFloat(val) : 0,
    discount_applied: (val) => val? parseFloat(val) : 0,
    final_amount: (val) => val? parseFloat(val) : 0,
    mode_of_payment: (val) => val,
    payment_source: (val) => val,
    payment_reference: (val) => val,
    payment_status: (val) => val,
    payment_verified: (val) => val,
    receipt_number: (val) => val,
    insurance_number: (val) => val,
    payment_date: (val) => val?formatDateOnly(val):null
  };
  
  const paymentFieldsReverseMap = {
    payment_id: (val) => val,
    tenant_id: (val) => val,
    clinic_id: (val) => val,
    patient_id: (val) => val,
    dentist_id: (val) => val,
    appointment_id: (val) => val,
    amount: (val) => val? parseFloat(val) : 0,
    discount_applied: (val) => val? parseFloat(val) : 0,
    final_amount: (val) => val? parseFloat(val) : 0,
    mode_of_payment: (val) => val,
    payment_source: (val) => val,
    payment_reference: (val) => val,
    payment_status: (val) => val,
    payment_verified: (val) => val,
    receipt_number: (val) => val,
    insurance_number: (val) => val,
    payment_date: (val) =>
      val ? formatDateOnly(val)  : null,
    created_by: (val) => val,
    created_time: (val) =>
      val ? convertUTCToLocal(val) : null,
    updated_by: (val) => val,
    updated_time: (val) =>
      val ? convertUTCToLocal(val) : null,
  };
  

// Create Payment
const createPayment = async (data) => {
  const fieldMap = {
    ...paymentFields,
    created_by: (val) => val,
  };
  try {
    const { columns, values } = mapFields(data, fieldMap);
    const paymentId = await paymentModel.createPayment(
      "payment",
      columns,
      values
    );
    await invalidateCacheByPattern("payment:*");
    await invalidateCacheByPattern("financeSummary:*");
    return paymentId;
  } catch (error) {
    console.error("Failed to create payment:", error);
    throw new CustomError(`Failed to create payment: ${error.message}`, 404);
  }
};

// Get All Payments by Tenant ID with Caching
const getAllPaymentsByTenantId = async (tenantId, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  const cacheKey = buildCacheKey("payment", "list", {
    tenant_id: tenantId,
    page,
    limit,
  });
  try {
    const payments = await getOrSetCache(cacheKey, async () => {
      const result = await paymentModel.getAllPaymentsByTenantId(
        tenantId,
        Number(limit),
        offset
      );
      return result;
    });

    const convertedRows = payments.data.map((payment) =>
      helper.convertDbToFrontend(payment, paymentFieldsReverseMap)
    );

    return {data:convertedRows,total:payments.total};;
  } catch (err) {
    console.error("Database error while fetching payments:", err);
    throw new CustomError("Failed to fetch payments", 404);
  }
};

// Get Payment by ID & Tenant
const getPaymentByTenantIdAndPaymentId = async (tenantId, paymentId) => {
  try {
    const payment = await paymentModel.getPaymentByTenantAndPaymentId(
      tenantId,
      paymentId
    );
    const convertedRows = helper.convertDbToFrontend(
      payment,
      paymentFieldsReverseMap
    );

    return {data:convertedRows,total:payment.total};;
  } catch (error) {
    throw new CustomError("Failed to get payment: " + error.message, 404);
  }
};
const getPaymentByTenantAndAppointmentId = async (tenantId, appointment_id) => {
  try {
    const payment = await paymentModel.getPaymentByTenantAndAppointmentId(
      tenantId, appointment_id
    );
    console.log(payment,paymentFieldsReverseMap)
    let result=payment;
    if(payment){
      result = helper.convertDbToFrontend(
        payment,
        paymentFieldsReverseMap
      );
    }
    
    return result;
  } catch (error) {
    throw new CustomError("Failed to get payment: " + error.message, 404);
  }
};

// Update Payment
const updatePayment = async (paymentId, data, tenant_id) => {
  const fieldMap = {
    ...paymentFields,
    updated_by: (val) => val,
  };
  try {
    const { columns, values } = mapFields(data, fieldMap);
    const affectedRows = await paymentModel.updatePayment(
      paymentId,
      columns,
      values,
      tenant_id
    );

    if (affectedRows === 0) {
      throw new CustomError("Payment not found or no changes made.", 404);
    }

    await invalidateCacheByPattern("payment:*");
    await invalidateCacheByPattern("financeSummary:*");
    return affectedRows;
  } catch (error) {
    console.error("Update Error:", error);
    throw new CustomError("Failed to update payment", 404);
  }
};

// Delete Payment
const deletePaymentByTenantIdAndPaymentId = async (tenantId, paymentId) => {
  try {
    const affectedRows = await paymentModel.deletePaymentByTenantAndPaymentId(
      tenantId,
      paymentId
    );
    if (affectedRows === 0) {
      throw new CustomError("Payment not found.", 404);
    }

    await invalidateCacheByPattern("payment:*");
    return affectedRows;
  } catch (error) {
    throw new CustomError(`Failed to delete payment: ${error.message}`, 404);
  }
};

module.exports = {
  createPayment,
  getAllPaymentsByTenantId,
  getPaymentByTenantIdAndPaymentId,
  updatePayment,
  deletePaymentByTenantIdAndPaymentId,
  getPaymentByTenantAndAppointmentId
};
