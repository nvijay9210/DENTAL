const pool = require("../config/db");
const { CustomError } = require("../middlewares/CustomeError");
const record = require("../query/Records");

const TABLE = "expense";

// Create Expense
const createExpense = async (table, columns, values) => {
  try {
    const expense = await record.createRecord(table, columns, values);

    return expense.insertId;
  } catch (error) {
    console.error("Error creating expense:", error);
    throw error;
  }
};

// Get all expenses by tenant ID with pagination
const getAllExpensesByTenantId = async (tenantId, limit, offset) => {
  try {
    if (
      !Number.isInteger(limit) ||
      !Number.isInteger(offset) ||
      limit < 1 ||
      offset < 0
    ) {
      throw error;
    }
    const expenes = await record.getAllRecords(
      "expense",
      "tenant_id",
      tenantId,
      limit,
      offset
    );
    return expenes;
  } catch (error) {
    console.error("Error fetching expenses:", error);
    throw error;
  }
};

const getAllExpensesByTenantIdAndClinicId = async (
  tenantId,
  clinicId,
  limit,
  offset
) => {
  const query1 = `
    SELECT 
      e.*,
      c.clinic_name,
      c.email,
      c.phone_number,
      c.address,
      c.website,
      c.city,
      c.state,
      c.country,
      c.pin_code,
      c.clinic_logo
    FROM expense e
    LEFT JOIN clinic c 
      ON e.clinic_id = c.clinic_id
    WHERE e.tenant_id = ?
      AND e.clinic_id = ?
    LIMIT ? OFFSET ?
  `;

  const query2 = `
    SELECT count(*) as total
    FROM expense
    WHERE tenant_id = ?
      AND clinic_id = ?
  `;

  const conn = await pool.getConnection();

  try {
    const [rows] = await conn.query(query1, [
      tenantId,
      clinicId,
      limit,
      offset,
    ]);

    const [counts] = await conn.query(query2, [
      tenantId,
      clinicId,
    ]);

    return {
      data: rows,
      total: counts[0].total,
    };
  } catch (error) {
    console.error(error);
    throw error;
  } finally {
    conn.release();
  }
};

// Get expense by tenant ID and expense ID
const getExpenseByTenantAndExpenseId = async (tenant_id, expense_id) => {
  try {
    const rows = await record.getRecordByIdAndTenantId(
      TABLE,
      "tenant_id",
      tenant_id,
      "expense_id",
      expense_id
    );
    return rows;
  } catch (error) {
    console.error("Error fetching expense:", error);
    throw error;
  }
};

// Update expense
const updateExpense = async (expense_id, columns, values, tenant_id) => {
  try {
    const conditionColumn = ["tenant_id", "expense_id"];
    const conditionValue = [tenant_id, expense_id];

    return await record.updateRecord(
      TABLE,
      columns,
      values,
      conditionColumn,
      conditionValue
    );
  } catch (error) {
    console.error("Error updating expense:", error);
    throw error;
  }
};

// Delete expense
const deleteExpenseByTenantAndExpenseId = async (tenant_id, expense_id) => {
  try {
    const conditionColumn = ["tenant_id", "expense_id"];
    const conditionValue = [tenant_id, expense_id];

    const result = await record.deleteRecord(
      TABLE,
      conditionColumn,
      conditionValue
    );
    return result.affectedRows;
  } catch (error) {
    console.error("Error deleting expense:", error);
    throw error;
  }
};

const getAllExpensesByTenantIdAndClinicIdAndStartDateAndEndDate = async (
  tenantId,
  clinicId,
  startDate,
  endDate,
  limit,
  offset
) => {
  const query1 = `SELECT e.*,c.clinic_name,c.email,c.phone_number,c.address,c.website,c.city,c.state,c.country,c.pin_code,c.clinic_logo FROM expense e left join clinic c on e.clinic_id = c.clinic_id WHERE e.tenant_id = ? AND e.clinic_id = ? AND expense_date between ? AND ? limit ? offset ?`;
  const query2 = `SELECT count(*) as total FROM expense d WHERE tenant_id = ? AND clinic_id = ? AND expense_date between ? AND ?`;
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(query1, [
      tenantId,
      clinicId,
      startDate,
      endDate,
      limit,
      offset,
    ]);
    const [counts] = await conn.query(query2, [
      tenantId,
      clinicId,
      startDate,
      endDate,
    ]);
    return { data: rows, total: counts[0].total };
  } catch (error) {
    console.error(error);
    throw error;
  } finally {
    conn.release();
  }
};

module.exports = {
  createExpense,
  getAllExpensesByTenantId,
  getAllExpensesByTenantIdAndClinicId,
  getExpenseByTenantAndExpenseId,
  updateExpense,
  deleteExpenseByTenantAndExpenseId,
  getAllExpensesByTenantIdAndClinicIdAndStartDateAndEndDate,
};
