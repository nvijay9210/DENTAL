const { CustomError } = require("../middlewares/CustomeError");
const expenseModel = require("../models/ExpenseModel");
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
  createDocument,
  deleteDocumentsByTableAndId,
  getDocumentsByTableAndId,
  getDocumentsByField,
} = require("../models/documentModel");
const {
  deleteUploadedFiles,
  saveDocuments,
  updateDocumentsDiffBased,
  normalizeFileUploads,
  handleFileCleanupByTable,
} = require("../utils/UploadFiles");

// Field mapping for expenses (similar to treatment)

const expenseFields = {
  tenant_id: (val) => val,
  clinic_id: (val) => val,
  expense_date: (val) => formatDateOnly(val),
  expense_category: (val) => val,
  expense_reason: (val) => val,
  expense_amount: (val) => (val ? parseFloat(val) : 0),
  mode_of_payment: (val) => val,
  receipt_number: (val) => val,
  paid_by: (val) => val,
  paid_by_user: (val) => val,
  paid_to: (val) => val,
};
const expenseFieldsReverseMap = {
  expense_id: (val) => val,
  tenant_id: (val) => val,
  clinic_id: (val) => val,
  expense_date: (val) => (val ? formatDateOnly(val) : null),
  expense_category: (val) => val,
  expense_reason: (val) => val,
  expense_amount: (val) => (val ? parseFloat(val) : 0),
  mode_of_payment: (val) => val,
  receipt_number: (val) => val,
  paid_by: (val) => val,
  paid_by_user: (val) => val,
  paid_to: (val) => val,
  created_by: (val) => val,
  created_time: (val) => (val ? convertUTCToLocal(val) : null),
  updated_by: (val) => val,
  updated_time: (val) => (val ? convertUTCToLocal(val) : null),
};

// Create Expense
const createExpense = async (data) => {
  const fieldMap = {
    ...expenseFields,
    created_by: (val) => val,
  };

  try {
    const { columns, values } = mapFields(data, fieldMap);

    const expenseId = await expenseModel.createExpense(
      "expense",
      columns,
      values
    );

    console.log("expenseId:", data.expense_documents);

    // Handle single or multiple file upload
    await saveDocuments({
      table_name: "expense",
      table_id: expenseId,
      field_name: "expense_documents",
      files: data.expense_documents,
      created_by: data.created_by,
    });

    await invalidateCacheByPattern("expense:*");
    await invalidateCacheByPattern("financeSummary:*");

    return expenseId;
  } catch (error) {
    console.error("Failed to create expense:", error);
    throw new CustomError(error, 500);
  }
};

// Get All Expenses by Tenant ID with Caching
const getAllExpensesByTenantId = async (tenantId, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  const cacheKey = buildCacheKey("expense", "list", {
    tenant_id: tenantId,
    page,
    limit,
  });
  try {
    const expenses = await getOrSetCache(cacheKey, async () => {
      const result = await expenseModel.getAllExpensesByTenantId(
        tenantId,
        Number(limit),
        offset
      );
      return result;
    });

    const convertedRows = await Promise.all(
      expenses.data.map(async (expense) => {
        const formatted = helper.convertDbToFrontend(
          expense,
          expenseFieldsReverseMap
        );

        const docs = await getDocumentsByField(
          "expense",
          expense.expense_id,
          "expense_documents"
        );

        console.log('docs:',docs)

        // Extract only file_url
        const fileInfos = docs.map((doc) => ({
          document_id: doc.document_id,
          file_url: doc.file_url,
        }));

        return {
          ...formatted,
          expense_documents: fileInfos,
        };
      })
    );

    return { data: convertedRows, total: expenses.total };
  } catch (err) {
    console.error("Database error while fetching expenses:", err);
    throw new CustomError(err, 500);
  }
};

const getAllExpensesByTenantIdAndClinicId = async (
  tenantId,
  clinic_id,
  page = 1,
  limit = 10
) => {
  const offset = (page - 1) * limit;

  const cacheKey = buildCacheKey("expense", "list", {
    tenant_id: tenantId,
    clinic_id,
    page,
    limit,
  });

  try {
    const expenses = await getOrSetCache(cacheKey, async () => {
      const result = await expenseModel.getAllExpensesByTenantIdAndClinicId(
        tenantId,
        clinic_id,
        Number(limit),
        offset
      );

      return result;
    });

    // Get clinic details from first expense row
    const firstExpense = expenses.data[0];

   const clinic = firstExpense
  ? {
      clinic_id: firstExpense.clinic_id,
      clinic_name: firstExpense.clinic_name,
      email: firstExpense.email,
      phone_number: firstExpense.phone_number,

      address: firstExpense.address
        ? JSON.parse(firstExpense.address)
        : null,

      website: firstExpense.website,
      city: firstExpense.city,
      state: firstExpense.state,
      country: firstExpense.country,
      pincode: firstExpense.pincode,
      clinic_logo: firstExpense.clinic_logo,
    }
  : null;

    const convertedRows = await Promise.all(
      expenses.data.map(async (expense) => {
        const formatted = helper.convertDbToFrontend(
          expense,
          expenseFieldsReverseMap
        );

        const docs = await getDocumentsByField(
          "expense",
          expense.expense_id,
          "expense_documents"
        );

        console.log("docs:", docs);

        const fileInfos = docs.map((doc) => ({
          document_id: doc.document_id,
          file_url: doc.file_url,
        }));

        return {
          ...formatted,
          expense_documents: fileInfos,
        };
      })
    );

    return {
      clinic,
      data: convertedRows,
      total: expenses.total,
    };
  } catch (err) {
    console.error("Database error while fetching expenses:", err);
    throw new CustomError(err, 500);
  }
};

const getAllExpensesByTenantIdAndClinicIdAndStartDateAndEndDate = async (
  tenantId,
  clinicId,
  startDate,
  endDate,
  page = 1,
  limit = 10
) => {
  const cacheKey = buildCacheKey("expense", "list", {
    tenant_id: tenantId,
    clinic_id: clinicId,
    startDate,
    endDate,
    page,
    limit,
  });

  const offset = (page - 1) * limit;

  try {
    const expenses = await getOrSetCache(cacheKey, async () => {
      const startDateStr = new Date(startDate)
        .toISOString()
        .split("T")[0];

      const endDateStr = new Date(endDate)
        .toISOString()
        .split("T")[0];

      return await expenseModel.getAllExpensesByTenantIdAndClinicIdAndStartDateAndEndDate(
        tenantId,
        clinicId,
        startDateStr,
        endDateStr,
        parseInt(limit),
        parseInt(offset)
      );
    });

    // Get clinic data from first row
    const firstExpense = expenses.data[0];

 const clinic = firstExpense
  ? {
      clinic_id: firstExpense.clinic_id,
      clinic_name: firstExpense.clinic_name,
      email: firstExpense.email,
      phone_number: firstExpense.phone_number,

      address: firstExpense.address
        ? JSON.parse(firstExpense.address)
        : null,

      website: firstExpense.website,
      city: firstExpense.city,
      state: firstExpense.state,
      country: firstExpense.country,
      pincode: firstExpense.pincode,
      clinic_logo: firstExpense.clinic_logo,
    }
  : null;

    const convertedRows = await Promise.all(
      expenses.data.map(async (expense) => {
        const formatted = helper.convertDbToFrontend(
          expense,
          expenseFieldsReverseMap
        );

        const docs = await getDocumentsByField(
          "expense",
          expense.expense_id,
          "expense_documents"
        );

        const fileInfos = docs.map((doc) => ({
          document_id: doc.document_id,
          file_url: doc.file_url,
        }));

        return {
          ...formatted,
          expense_documents: fileInfos,
        };
      })
    );

    return {
      clinic,
      data: convertedRows,
      total: expenses.total,
    };
  } catch (err) {
    console.error("Database error while fetching expenses:", err);
    throw new CustomError(err, 500);
  }
};

// Get Expense by ID & Tenant
const getExpenseByTenantIdAndExpenseId = async (tenantId, expenseId) => {
  try {
    const expense = await expenseModel.getExpenseByTenantAndExpenseId(
      tenantId,
      expenseId
    );

    if (!expense) {
      throw new CustomError("Expense not found", 404);
    }

    // Convert DB record to frontend format
    const convertedRows = helper.convertDbToFrontend(
      expense,
      expenseFieldsReverseMap
    );

    // Fetch document records for this expense
    const documents = await getDocumentsByField(
      "expense",
      expenseId,
      "expense_documents"
    );

    // Format each document
    const expense_documents = documents.map((doc) => ({
      document_id: doc.document_id,
      file_url: doc.file_url,
    }));

    // Attach to the response
    return {
      ...convertedRows,
      expense_documents,
    };
  } catch (error) {
    console.error("Failed to get expense:", error);
    throw new CustomError(error.message || "Internal Server Error", 500);
  }
};

// Update Expense

const updateExpense = async (expenseId, data, tenant_id, req) => {
  const fieldMap = {
    ...expenseFields,
    updated_by: (val) => val,
  };

  try {
    const { columns, values } = mapFields(data, fieldMap);

    const affectedRows = await expenseModel.updateExpense(
      expenseId,
      columns,
      values,
      tenant_id
    );

    // ✅ Fix: Extract from data or req.body
    const expense_documents =
      data.expense_documents || req?.body?.expense_documents || [];

    await updateDocumentsDiffBased({
      table_name: "expense",
      table_id: expenseId,
      field_name: "expense_documents",
      newFiles: expense_documents,
      deletedFileIds: data.deletedFileIds,
      created_by: data.created_by,
      updated_by: data.updated_by,
    });

    await invalidateCacheByPattern("expense:*");
    await invalidateCacheByPattern("financeSummary:*");

    return affectedRows;
  } catch (error) {
    console.error("❌ Update Error:", error);
    throw new CustomError(error, 500);
  }
};

// Delete Expense
const deleteExpenseByTenantIdAndExpenseId = async (tenantId, expenseId) => {
  try {
    await deleteDocumentsByTableAndId("expense", expenseId);
    const affectedRows = await expenseModel.deleteExpenseByTenantAndExpenseId(
      tenantId,
      expenseId
    );

    // 5. Clear cache
    await invalidateCacheByPattern("expense:*");
    await invalidateCacheByPattern("financeSummary:*");

    return affectedRows;
  } catch (error) {
    console.error("Failed to delete expense:", error);
    throw new CustomError(error, 500);
  }
};

module.exports = {
  createExpense,
  getAllExpensesByTenantId,
  getAllExpensesByTenantIdAndClinicId,
  getExpenseByTenantIdAndExpenseId,
  updateExpense,
  deleteExpenseByTenantIdAndExpenseId,
  getAllExpensesByTenantIdAndClinicIdAndStartDateAndEndDate,
};
