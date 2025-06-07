const pool = require("../config/db");
const { CustomError } = require("../middlewares/CustomeError");
const record = require("../query/Records");

const TABLE = "expense";

// Create Expense
const createExpense = async (table,columns, values) => {
  try {
    const expense = await record.createRecord(table, columns, values);
    console.log(expense)
    return expense.insertId;
  } catch (error) {
    console.error("Error creating expense:", error);
    throw new CustomError("Database Query Error", 500);
  }
};

// Get all expenses by tenant ID with pagination
const getAllExpensesByTenantId = async (tenantId, limit, offset) => {
  try {
    if (!Number.isInteger(limit) || !Number.isInteger(offset) || limit < 1 || offset < 0) {
      throw new CustomError("Invalid pagination parameters.", 400);
    }
    const expenes=await record.getAllRecords("expense", "tenant_id", tenantId, limit, offset);
    return expenes
  } catch (error) {
    console.error("Error fetching expenses:", error);
    throw new CustomError("Error fetching expenses.", 500);
  }
};

// Get expense by tenant ID and expense ID
const getExpenseByTenantAndExpenseId = async (tenant_id, expense_id) => {
  try {
    const [rows] = await record.getRecordByIdAndTenantId(
      TABLE,
      "tenant_id",
      tenant_id,
      "expense_id",
      expense_id
    );
    return rows?.[0] ?? null;
  } catch (error) {
    console.error("Error fetching expense:", error);
    throw new CustomError("Error fetching expense.", 500);
  }
};

// Update expense
const updateExpense = async (expense_id, columns, values, tenant_id) => {
  try {
    const conditionColumn = ["tenant_id", "expense_id"];
    const conditionValue = [tenant_id, expense_id];

    return await record.updateRecord(TABLE, columns, values, conditionColumn, conditionValue);
  } catch (error) {
    console.error("Error updating expense:", error);
    throw new CustomError("Error updating expense.", 500);
  }
};

// Delete expense
const deleteExpenseByTenantAndExpenseId = async (tenant_id, expense_id) => {
  try {
    const conditionColumn = ["tenant_id", "expense_id"];
    const conditionValue = [tenant_id, expense_id];

    const result = await record.deleteRecord(TABLE, conditionColumn, conditionValue);
    return result.affectedRows;
  } catch (error) {
    console.error("Error deleting expense:", error);
    throw new CustomError("Error deleting expense.", 500);
  }
};

const getAllExpensesByTenantIdAndClinicIdAndStartDateAndEndDate = async (tenantId, clinicId,startDate,endDate) => {
  const query = `SELECT * FROM expense WHERE tenant_id = ? AND clinic_id = ? AND expense_date between ? AND ?`;
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(query, [tenantId, clinicId,startDate,endDate]);
    return rows;
  } catch (error) {
    console.error(error);
    throw new Error("Database Query Error");
  } finally {
    conn.release();
  }
};



module.exports = {
  createExpense,
  getAllExpensesByTenantId,
  getExpenseByTenantAndExpenseId,
  updateExpense,
  deleteExpenseByTenantAndExpenseId,
  getAllExpensesByTenantIdAndClinicIdAndStartDateAndEndDate
};
