const { CustomError } = require("../middlewares/CustomeError");
const treatmentModel = require("../models/TreatmentModel");
const PaymentService = require("../services/PaymentService");
const {
  getOrSetCache,
  invalidateCacheByPattern,
} = require("../config/redisConfig");
const { mapFields } = require("../query/Records");
const helper = require("../utils/Helpers");
const { formatDateOnly, convertUTCToLocal } = require("../utils/DateUtils");
const { buildCacheKey } = require("../utils/RedisCache");
const {
  saveDocuments,
  updateDocumentsDiffBased,
} = require("../utils/UploadFiles");
const {
  deleteDocumentsByTableAndId,
  getDocumentsByField,
} = require("../models/documentModel");
const pool = require("../config/db");
const {
  updateAppoinmentStatusCompleted,
  updateAppoinmentFinalStatus,
} = require("../models/AppointmentModel");
const { getallPaymentSummaryByAppointment } = require("../models/PaymentModel");

const treatmentFields = {
  tenant_id: (val) => val ||null,
  patient_id: (val) => val ||null,
  appointment_id: (val) => val ||null,
  dentist_id: (val) => val ||null,
  clinic_id: (val) => val ||null,
  diagnosis: (val) => val ||null,
  treatment_procedure: (val) => val ||null,
  treatment_type: (val) => val ||null,
  treatment_status: (val) => val ||null,
  treatment_date: (val) => val ||null,
  cost: (val) => (val ? parseFloat(val) : 0),
  tax_percentage: (val) => (val ? parseFloat(val) : 0),
  tax_catalog: helper.safeStringify,
  duration: (val) => val || null,
  // teeth_involved: (val) => val || null,
  complications: helper.safeStringify,
  follow_up_required: helper.parseBoolean,
  follow_up_date: (val) => val || null,
  follow_up_notes: helper.safeStringify,
  anesthesia_used: helper.parseBoolean,
  anesthesia_type: (val) => val || null,
  technician_assisted: (val) => val || null,
  notes: helper.safeStringify,
};

const treatmentFieldsReverseMap = {
  treatment_id: (val) => val,
  tenant_id: (val) => val,
  appointment_id: (val) => val,
  patient_id: (val) => val,
  dentist_id: (val) => val,
  clinic_id: (val) => val,
  diagnosis: (val) => val,
  treatment_procedure: (val) => val,
  treatment_type: (val) => val,
  treatment_status: (val) => val,
  treatment_date: (val) => formatDateOnly(val),
  cost: (val) => (val ? parseFloat(val) : 0),
  tax_percentage: (val) => (val ? parseFloat(val) : 0),
  tax_catalog: helper.safeJsonParse,
  duration: (val) => val,
  // teeth_involved: (val) => val,
  complications: helper.safeJsonParse,
  follow_up_required: (val) => Boolean(val),
  follow_up_date: (val) => formatDateOnly(val),
  follow_up_notes: helper.safeJsonParse,
  anesthesia_used: (val) => Boolean(val),
  anesthesia_type: (val) => val,
  technician_assisted: (val) => val,
  notes: helper.safeJsonParse,
  created_by: (val) => val,
  created_time: (val) => (val ? convertUTCToLocal(val) : null),
  updated_by: (val) => val,
  updated_time: (val) => (val ? convertUTCToLocal(val) : null),
};
// Create Treatment
const createTreatment = async (data) => {
  const create = {
    ...treatmentFields,
    created_by: (val) => val,
  };
  console.log(data);

  const conn = await pool.getConnection();

  const paymentData = {
    tenant_id: data?.tenant_id,
    clinic_id: data?.clinic_id,
    dentist_id: data?.dentist_id,
    patient_id: data?.patient_id,
    appointment_id: data?.appointment_id,
    amount: parseFloat(data?.amount)||0,
    discount_applied: parseFloat(data?.discount_applied),
    final_amount: parseFloat(data?.final_amount),
    total_amount: parseFloat(data?.cost),
    payment_for: "treatment",
    mode_of_payment: data?.mode_of_payment,
    payment_source: data?.payment_source,
    payment_reference: data?.payment_reference,
    payment_verified: data?.payment_verified,
    receipt_number: data?.receipt_number,
    insurance_number: data?.insurance_number,
    payment_date: formatDateOnly(data?.treatment_date),
    payment_status: data?.payment_status,
    created_by: data?.created_by,
  };

  try {
    await conn.beginTransaction();
    const { columns, values } = mapFields(data, create);
    const treatmentId = await treatmentModel.createTreatment(
      conn,
      "treatment",
      columns,
      values
    );

    // Handle single or multiple file upload
    await saveDocuments({
      table_name: "treatment",
      table_id: treatmentId,
      field_name: "treatment_images",
      files: data.treatment_images,
      created_by: data.created_by,
    });

    await PaymentService.createPayment(paymentData, conn);

    const payment = await getallPaymentSummaryByAppointment(
      data.tenant_id,
      data.appointment_id,conn
    );

    console.log(payment);

    if (payment.balance_remaining === 0) {
      await updateAppoinmentFinalStatus(
        data.appointment_id,
        data.tenant_id,
        data.clinic_id,
        "fully_completed",
        conn
      );
    }
    if (payment.balance_remaining > 0) {
      await updateAppoinmentFinalStatus(
        data.appointment_id,
        data.tenant_id,
        data.clinic_id,
        "pending_payment",
        conn
      );
    }
    // await updateAppoinmentStatusCompleted(data.tenant_id,data.appointment_id);
    await conn.commit();
    await invalidateCacheByPattern("treatment:*");
    await invalidateCacheByPattern("treatment_patient:*");
    await invalidateCacheByPattern("financeSummary:*");
    return treatmentId;
  } catch (error) {
    console.error("Failed to create treatment:", error);
    await conn.rollback();
    throw new CustomError(error, 500);
  } finally {
    conn.release();
  }
};

// Get All Treatments by Tenant ID with Caching
const getAllTreatmentsByTenantId = async (tenantId, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  const cacheKey = buildCacheKey("treatment", "list", {
    tenant_id: tenantId,
    page,
    limit,
  });

  try {
    const treatments = await getOrSetCache(cacheKey, async () => {
      const result = await treatmentModel.getAllTreatmentsByTenantId(
        tenantId,
        Number(limit),
        offset
      );
      return result;
    });

    const convertedRows = await Promise.all(
      treatments.data.map(async (treatment) => {
        const formatted = helper.convertDbToFrontend(
          treatment,
          treatmentFieldsReverseMap
        );

        const docs = await getDocumentsByField(
          "treatment",
          treatment.treatment_id,
          "treatment_images"
        );

        // Extract only file_url
        const fileInfos = docs.map((doc) => ({
          document_id: doc.document_id,
          file_url: doc.file_url,
        }));

        return {
          ...formatted,
          treatment_images: fileInfos,
        };
      })
    );

    return { data: convertedRows, total: treatments.total };
  } catch (error) {
    console.error("Database error while fetching treatments:", error);
    throw new CustomError(error, 500);
  }
};

function flattenTreatmentImages(treatment) {
  const flattened = {};

  if (Array.isArray(treatment.treatment_images)) {
    treatment.treatment_images.forEach((item, index) => {
      flattened[`treatment_images${index}`] = item || "";
    });
  }

  delete treatment.treatment_images;

  return {
    ...treatment,
    ...flattened,
  };
}

const getAllTreatmentsByTenantAndClinicId = async (
  tenantId,
  clinic_id,
  appointment_id,
  page = 1,
  limit = 10
) => {
  const offset = (page - 1) * limit;
  const cacheKey = buildCacheKey("treatment", "list", {
    tenant_id: tenantId,
    clinic_id,
    appointment_id,
    page,
    limit,
  });

  try {
    const treatments = await getOrSetCache(cacheKey, async () => {
      const result = await treatmentModel.getAllTreatmentsByTenantAndClinicId(
        tenantId,
        clinic_id,
        appointment_id,
        Number(limit),
        offset
      );
      return result;
    });

    const convertedRows = await Promise.all(
      treatments.data.map(async (treatment) => {
        const formatted = helper.convertDbToFrontend(
          treatment,
          treatmentFieldsReverseMap
        );

        const docs = await getDocumentsByField(
          "treatment",
          treatment.treatment_id,
          "treatment_images"
        );

        // Extract only file_url
        const fileInfos = docs.map((doc) => ({
          document_id: doc.document_id,
          file_url: doc.file_url,
        }));

        return {
          ...formatted,
          treatment_images: fileInfos,
        };
      })
    );

    return { data: convertedRows, total: treatments.total };
  } catch (error) {
    console.error("Database error while fetching treatments:", error);
    throw new CustomError(error, 500);
  }
};

const getAllTreatmentsByTenantAndClinicIdAndDentist = async (
  tenantId,
  clinic_id,
  dentist_id,
  appointment_id,
  page = 1,
  limit = 10
) => {
  const offset = (page - 1) * limit;
  const cacheKey = buildCacheKey("treatment", "list", {
    tenant_id: tenantId,
    clinic_id,
    dentist_id,
    appointment_id,
    page,
    limit,
  });

  try {
    const treatments = await getOrSetCache(cacheKey, async () => {
      const result =
        await treatmentModel.getAllTreatmentsByTenantAndClinicIdAndDentist(
          tenantId,
          clinic_id,
          dentist_id,
          appointment_id,
          Number(limit),
          offset
        );
      return result;
    });

    const convertedRows = await Promise.all(
      treatments.data.map(async (treatment) => {
        const formatted = helper.convertDbToFrontend(
          treatment,
          treatmentFieldsReverseMap
        );

        const docs = await getDocumentsByField(
          "treatment",
          treatment.treatment_id,
          "treatment_images"
        );

        // Extract only file_url
        const fileInfos = docs.map((doc) => ({
          document_id: doc.document_id,
          file_url: doc.file_url,
        }));

        return {
          ...formatted,
          treatment_images: fileInfos,
        };
      })
    );
    return { data: convertedRows, total: treatments.total };
  } catch (error) {
    console.error("Database error while fetching treatments:", error);
    throw new CustomError(error, 500);
  }
};
const getAllTreatmentsByTenantAndDentistId = async (
  tenantId,
  dentist_id,
  page = 1,
  limit = 10
) => {
  const offset = (page - 1) * limit;
  const cacheKey = buildCacheKey("treatment", "list", {
    tenant_id: tenantId,
    dentist_id,
    page,
    limit,
  });

  try {
    const treatments = await getOrSetCache(cacheKey, async () => {
      const result = await treatmentModel.getAllTreatmentsByTenantAndDentistId(
        tenantId,
        dentist_id,
        Number(limit),
        offset
      );
      return result;
    });

    const convertedRows = await Promise.all(
      treatments.data.map(async (treatment) => {
        const formatted = helper.convertDbToFrontend(
          treatment,
          treatmentFieldsReverseMap
        );

        const docs = await getDocumentsByField(
          "treatment",
          treatment.treatment_id,
          "treatment_images"
        );

        // Extract only file_url
        const fileInfos = docs.map((doc) => ({
          document_id: doc.document_id,
          file_url: doc.file_url,
        }));

        return {
          ...formatted,
          treatment_images: fileInfos,
        };
      })
    );

    return { data: convertedRows, total: treatments.total };
  } catch (error) {
    console.error("Database error while fetching treatments:", error);
    throw new CustomError(error, 500);
  }
};

const getAllTreatmentsByTenantAndPatientId = async (
  tenantId,
  patient_id,
  page = 1,
  limit = 10
) => {
  const offset = (page - 1) * limit;
  const cacheKey = buildCacheKey("treatment", "list", {
    tenant_id: tenantId,
    patient_id,
    page,
    limit,
  });

  try {
    const treatments = await getOrSetCache(cacheKey, async () => {
      const result = await treatmentModel.getAllTreatmentsByTenantAndPatientId(
        tenantId,
        patient_id,
        Number(limit),
        offset
      );
      return result;
    });

    const convertedRows = await Promise.all(
      treatments.data.map(async (treatment) => {
        const formatted = helper.convertDbToFrontend(
          treatment,
          treatmentFieldsReverseMap
        );

        const docs = await getDocumentsByField(
          "treatment",
          treatment.treatment_id,
          "treatment_images"
        );

        // Extract only file_url
        const fileInfos = docs.map((doc) => ({
          document_id: doc.document_id,
          file_url: doc.file_url,
        }));

        return {
          ...formatted,
          treatment_images: fileInfos,
        };
      })
    );

    return { data: convertedRows, total: treatments.total };
  } catch (error) {
    console.error("Database error while fetching treatments:", error);
    throw new CustomError(error, 500);
  }
};

// Get Treatment by ID & Tenant
const getTreatmentByTenantIdAndTreatmentId = async (tenantId, treatmentId) => {
  try {
    // 1️⃣ Get treatment record
    const treatment = await treatmentModel.getTreatmentByTenantAndTreatmentId(
      tenantId,
      treatmentId
    );

    if (!treatment) {
      throw new CustomError("Treatment not found", 404);
    }

    // 2️⃣ Convert DB → Frontend format
    const formatted = helper.convertDbToFrontend(
      treatment,
      treatmentFieldsReverseMap
    );

    // 3️⃣ Get related treatment images
    const docs = await getDocumentsByField(
      "treatment",
      treatment.treatment_id,
      "treatment_images"
    );

    // 4️⃣ Extract only needed info
    const fileInfos = docs.map((doc) => ({
      document_id: doc.document_id,
      file_url: doc.file_url,
    }));

    // 5️⃣ Return merged object
    return {
      ...formatted,
      treatment_images: fileInfos,
    };
  } catch (error) {
    console.error("Database error while fetching treatment:", error);
    throw new CustomError(error, 500);
  }
};

// Update Treatment
const updateTreatment = async (treatmentId, data, tenant_id, req) => {
  const update = {
    ...treatmentFields,
    updated_by: (val) => val,
  };

  const conn = await pool.getConnection();

  // Prepare payment data
  const paymentData = {
    tenant_id: data?.tenant_id,
    clinic_id: data?.clinic_id,
    dentist_id: data?.dentist_id,
    patient_id: data?.patient_id,
    appointment_id: data?.appointment_id,
    amount: parseFloat(data?.cost),
    discount_applied: parseFloat(data?.discount_applied),
    final_amount: parseFloat(data?.final_amount),
    mode_of_payment: data?.mode_of_payment,
    payment_source: data?.payment_source,
    payment_reference: data?.payment_reference,
    payment_verified: data?.payment_verified,
    receipt_number: data?.receipt_number,
    insurance_number: data?.insurance_number,
    payment_date: formatDateOnly(data?.payment_date),
    payment_status: data?.payment_status || "paid",
    created_by: data?.created_by,
    updated_by: data?.updated_by,
  };

  try {
    await conn.beginTransaction();

    // Update treatment
    const { columns, values } = mapFields(data, update);
    const affectedRows = await treatmentModel.updateTreatment(
      treatmentId,
      columns,
      values,
      tenant_id,
      conn
    );

    // ✅ Handle images
    const treatment_images =
      data.treatment_images || req?.body?.treatment_images || [];

    await updateDocumentsDiffBased({
      table_name: "treatment",
      table_id: treatmentId,
      field_name: "treatment_images",
      newFiles: treatment_images,
      deletedFileIds: data.deletedFileIds,
      updated_by: data.updated_by,
    });

    // ✅ Handle payments (upsert style)
    if (data?.payment_id) {
      // If payment_id exists, update existing payment
      await PaymentService.updatePayment(data.payment_id, paymentData, conn);
    } else {
      // Else create a new payment entry
      await PaymentService.createPayment(paymentData, conn);
    }

    await conn.commit();

    // Invalidate cache
    await invalidateCacheByPattern("treatment:*");
    await invalidateCacheByPattern("treatment_patient:*");
    await invalidateCacheByPattern("financeSummary:*");

    return affectedRows;
  } catch (error) {
    console.error("Update Error:", error);
    await conn.rollback();
    throw new CustomError(error, 500);
  } finally {
    await conn.release();
  }
};

// Delete Treatment
const deleteTreatmentByTenantIdAndTreatmentId = async (
  tenantId,
  treatmentId
) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await deleteDocumentsByTableAndId(conn, "treatment", treatmentId);
   
    const affectedRows =
      await treatmentModel.deleteTreatmentByTenantAndTreatmentId(
        conn,
        tenantId,
        treatmentId
      );
    // if (affectedRows === 0) {
    //   throw new CustomError(error, 500);
    // }
    await conn.commit();
    await invalidateCacheByPattern("treatment:*");
    await invalidateCacheByPattern("treatment_patient:*");
    await invalidateCacheByPattern("financeSummary:*");
    return affectedRows;
  } catch (error) {
    await conn.rollback();
    throw new CustomError(error, 500);
  } finally {
    await conn.release();
  }
};

const getTodayFollowUps = async (tenant_id, clinic_id, role, user_id = 0) => {
  const cacheKey = buildCacheKey("treatment", "followupnotify", {
    tenant_id,
    clinic_id,
    role: role,
    user_id: user_id,
  });
  try {
    const reminders = await getOrSetCache(cacheKey, async () => {
      const result = await treatmentModel.getTodayFollowUps(
        tenant_id,
        clinic_id,
        role,
        user_id
      );
      const result1 = result.map((r) => ({
        ...r,
        treatment_date: formatDateOnly(r.treatment_date),
        follow_up_date: formatDateOnly(r.follow_up_date),
        diagnosis: helper.safeJsonParse(r.diagnosis),
      }));
      return result1;
    });
    return reminders;
  } catch (error) {
    console.error("Database error while fetching followup:", error);
    throw new CustomError(error, 500);
  }
};

module.exports = {
  createTreatment,
  getAllTreatmentsByTenantId,
  getTreatmentByTenantIdAndTreatmentId,
  updateTreatment,
  deleteTreatmentByTenantIdAndTreatmentId,
  getAllTreatmentsByTenantAndClinicId,
  getAllTreatmentsByTenantAndClinicIdAndDentist,
  getAllTreatmentsByTenantAndDentistId,
  getAllTreatmentsByTenantAndPatientId,
  getTodayFollowUps,
};
