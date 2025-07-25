const pool = require("../config/db");
const { CustomError } = require("../middlewares/CustomeError");
const helper = require("../utils/Helpers");
const record = require("../query/Records");
const { formatDateOnly } = require("../utils/DateUtils");
const moment = require('moment');

// Create Clinic
const createClinic = async (table, columns, values) => {
  try {
    const clinic = await record.createRecord(table, columns, values);
    return clinic.insertId;
  } catch (error) {
    console.error("Error executing query:", error);
    throw new Error("Database Operation Failed");
  }
};

// Get All Clinics by Tenant ID
const getAllClinicsByTenantId = async (tenantId, limit, offset) => {
  try {
    const clinics = await record.getAllRecords(
      "clinic",
      "tenant_id",
      tenantId,
      limit,
      offset
    );
    return clinics;
  } catch (error) {
    console.error("Error executing query:", error);
    throw new Error("Error fetching clinics.");
  }
};

// Get Clinic by Tenant ID and Clinic ID
const getClinicByTenantIdAndClinicId = async (tenant_id, clinic_id) => {
  try {
    const rows = await record.getRecordByIdAndTenantId(
      "clinic",
      "tenant_id",
      tenant_id,
      "clinic_id",
      clinic_id
    );
    // console.log(rows);
    return rows || null;
  } catch (error) {
    console.error("Error executing query:", error);
    throw new Error("Error fetching clinic.");
  }
};

// Update Clinic
const updateClinic = async (clinic_id, columns, values, tenant_id) => {
  const conditionColumn = ["tenant_id", "clinic_id"];
  const conditionValue = [tenant_id, clinic_id];

  try {
    const result = await record.updateRecord(
      "clinic",
      columns,
      values,
      conditionColumn,
      conditionValue
    );
    return result.affectedRows;
  } catch (error) {
    console.error("Error executing query:", error);
    throw new Error(error);
  }
};

// Delete Clinic
const deleteClinicByTenantIdAndClinicId = async (tenant_id, clinic_id) => {
  const conditionColumn = ["tenant_id", "clinic_id"];
  const conditionValue = [tenant_id, clinic_id];

  try {
    const result = await record.deleteRecord(
      "clinic",
      conditionColumn,
      conditionValue
    );
    return result.affectedRows;
  } catch (error) {
    console.error("Error executing query:", error);
    throw new Error("Error deleting clinic.");
  }
};

// Check if Clinic Exists
const checkClinicExistsByTenantIdAndClinicId = async (tenantId, clinicId) => {
  const query = `SELECT 1 FROM clinic WHERE tenant_id = ? AND clinic_id = ?`;
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(query, [tenantId, clinicId]);
    return rows.length > 0;
  } catch (error) {
    console.error(error);
    throw new Error("Database Operation Failed");
  } finally {
    conn.release();
  }
};

const getClinicNameAndAddressByClinicId = async (tenantId, clinicId) => {
  const query = `select clinic_id,clinic_name,address from clinic where tenant_id=? and clinic_id=? limit 1`;
  const conn = await pool.getConnection();
  try {
    const rows = await conn.query(query, [tenantId, clinicId]);
    return rows[0][0];
  } catch (error) {
    console.error(error);
    throw new Error("Database Operation Failed");
  } finally {
    conn.release();
  }
};

const updateDoctorCount = async (tenantId, clinicId, assign = "true") => {
  const modifier =
    assign == "false" ? "GREATEST(total_doctors - 1, 0)" : "total_doctors + 1";

  const query = `UPDATE clinic SET total_doctors = ${modifier} WHERE tenant_id = ? AND clinic_id = ?`;
  const conn = await pool.getConnection();
  try {
    const [result] = await conn.query(query, [tenantId, clinicId]);
    return result.affectedRows > 0;
  } catch (error) {
    console.error(error);
    throw new Error(
      `Database Operation Failed while ${
        assign ? "creat" : "updat"
      }ing doctor count`
    );
  } finally {
    conn.release();
  }
};

const updatePatientCount = async (tenantId, clinicId, assign = true) => {
  const modifier =
    assign === false ? "GREATEST(total_patients - 1, 0)" : "total_patients + 1";

  const query = `UPDATE clinic SET total_patients = ${modifier} WHERE tenant_id = ? AND clinic_id = ?`;
  const conn = await pool.getConnection();
  try {
    const [result] = await conn.query(query, [tenantId, clinicId]);
    return result.affectedRows > 0;
  } catch (error) {
    console.error(error);
    throw new Error(
      `Database Operation Failed while ${
        assign ? "creat" : "updat"
      }ing patient count`
    );
  } finally {
    conn.release();
  }
};

// const getFinanceSummary=async(tenant_id,clinic_id)=>{
//   const conn = await pool.getConnection();

//   const now = new Date();
//   now.setHours(0, 0, 0, 0); // Normalize current date

//   // Fetch raw data
//   let [appointments, treatments, expenses] = await Promise.all([
//      conn.query(
//           `SELECT appointment_date AS date, (consultation_fee - discount_applied) AS amount FROM appointment
//            WHERE status = 'CP' AND appointment_date >= ? AND tenant_id = ? AND clinic_id = ?`,
//           [
//             new Date(now.getTime() - 365 * 4 * 24 * 60 * 60 * 1000),
//             tenant_id,
//             clinic_id,

//           ]
//         ),
//      conn.query(
//           `SELECT treatment_date AS date, cost AS amount FROM treatment
//            WHERE treatment_date >= ? AND tenant_id = ? AND clinic_id = ?`,
//           [
//             new Date(now.getTime() - 365 * 4 * 24 * 60 * 60 * 1000),
//             tenant_id,
//             clinic_id,

//           ]
//         ),
//     conn.query(
//       `SELECT e.expense_date AS date, e.expense_amount AS amount
//        FROM expense e
//        WHERE e.expense_date >= ? AND e.tenant_id = ? AND e.clinic_id = ?`,
//       [
//         new Date(now.getFullYear() - 4, now.getMonth(), now.getDate()),
//         tenant_id,
//         clinic_id,
//       ]
//     ),
//   ]);

//   appointments = appointments[0];
//   treatments = treatments[0];
//   expenses = expenses[0];

//   return {appointments,treatments,expenses}
// }


async function getFinanceSummary(
  tenant_id,
  clinic_id,
  startDate,
  endDate,
  dentist_id = null
) {
  const conn = await pool.getConnection();
  try {
    const query = `
      WITH income_cte AS (
        SELECT DATE(payment_date) AS date, SUM(final_amount) AS income
        FROM payment
        WHERE payment_status = 'completed'
          AND DATE(payment_date) BETWEEN ? AND ?
          AND tenant_id = ?
          AND clinic_id = ?
          AND (? IS NULL OR dentist_id = ?)
        GROUP BY DATE(payment_date)

        UNION ALL

        SELECT appointment_date AS date,
               SUM(consultation_fee - IFNULL(discount_applied, 0)) AS income
        FROM appointment
        WHERE status = 'completed'
          AND appointment_date BETWEEN ? AND ?
          AND tenant_id = ?
          AND clinic_id = ?
          AND (? IS NULL OR dentist_id = ?)
        GROUP BY appointment_date

        UNION ALL

        SELECT treatment_date AS date, SUM(cost) AS income
        FROM treatment
        WHERE treatment_date BETWEEN ? AND ?
          AND tenant_id = ?
          AND clinic_id = ?
          AND (? IS NULL OR dentist_id = ?)
        GROUP BY treatment_date
      ),

      expense_cte AS (
        SELECT expense_date AS date, SUM(expense_amount) AS expense
        FROM expense
        WHERE expense_date BETWEEN ? AND ?
          AND tenant_id = ?
          AND clinic_id = ?
        GROUP BY expense_date

        UNION ALL

        SELECT payment_date AS date, SUM(amount) AS expense
        FROM supplier_payments
        WHERE payment_date BETWEEN ? AND ?
          AND tenant_id = ?
          AND clinic_id = ?
        GROUP BY payment_date

        UNION ALL

        SELECT purchased_date AS date, SUM(price) AS expense
        FROM asset
        WHERE purchased_date BETWEEN ? AND ?
          AND tenant_id = ?
          AND clinic_id = ?
        GROUP BY purchased_date
      ),

      income_by_date AS (
        SELECT date, SUM(income) AS total_income
        FROM income_cte
        GROUP BY date
      ),

      expense_by_date AS (
        SELECT date, SUM(expense) AS total_expense
        FROM expense_cte
        GROUP BY date
      )

      SELECT
        d.date,
        COALESCE(i.total_income, 0) AS income,
        COALESCE(e.total_expense, 0) AS expense
      FROM (
        SELECT date FROM income_by_date
        UNION
        SELECT date FROM expense_by_date
      ) AS d
      LEFT JOIN income_by_date i ON d.date = i.date
      LEFT JOIN expense_by_date e ON d.date = e.date
      ORDER BY d.date;
    `;

    // Convert inputs to correct types
    const numTenantId = Number(tenant_id);
    const numClinicId = Number(clinic_id);
    const numDentistId = dentist_id !== null ? Number(dentist_id) : null;

    // Helper functions
    const addIncomeParams = () => [
      startDate, endDate,
      numTenantId, numClinicId,
      numDentistId, numDentistId
    ];

    const addExpenseParams = () => [
      startDate, endDate,
      numTenantId, numClinicId
    ];

    // Build final params array
    const params = [];

    for (let i = 0; i < 3; i++) {
      params.push(...addIncomeParams());
    }

    for (let i = 0; i < 3; i++) {
      params.push(...addExpenseParams());
    }

    // DEBUG: Log final SQL and params
    // console.log("SQL Query:\n", query);
    // console.log("Query Params:", params);

    const [rows] = await conn.query(query, params);

    // DEBUG: Show raw DB response
    // console.log("Raw DB Rows:", rows);

    // Map existing data
    const resultMap = {};
    rows.forEach(row => {
      const dateStr = moment(row.date).format("YYYY-MM-DD"); // normalize to YYYY-MM-DD
      resultMap[dateStr] = {
        income: parseFloat(row.income || 0),
        expense: parseFloat(row.expense || 0)
      };
    });

    // Fill in all dates between start and end
    const result = [];
    let current = moment(startDate);
    const last = moment(endDate);

    while (current <= last) {
      const dateStr = current.format("YYYY-MM-DD");
      result.push({
        date: dateStr,
        income: resultMap[dateStr]?.income ?? 0,
        expense: resultMap[dateStr]?.expense ?? 0
      });
      current.add(1, "day");
    }

    return result;

  } catch (error) {
    console.error("Error in getFinanceSummary:", error);
    throw error;
  } finally {
    conn.release();
  }
}


const getFinanceSummarybyDentist = async (tenant_id, clinic_id, dentist_id) => {
  const conn = await pool.getConnection();

  const now = new Date();
  now.setHours(0, 0, 0, 0); // Normalize current date

  // Fetch raw data
  let [appointments, treatments, expenses] = await Promise.all([
    conn.query(
      `SELECT appointment_date AS date, (consultation_fee - discount_applied) AS amount FROM appointment 
           WHERE status = 'CP' AND appointment_date >= ? AND tenant_id = ? AND clinic_id = ? AND dentist_id=?`,
      [
        new Date(now.getTime() - 365 * 4 * 24 * 60 * 60 * 1000),
        tenant_id,
        clinic_id,
        dentist_id,
      ]
    ),
    conn.query(
      `SELECT treatment_date AS date, cost AS amount FROM treatment 
           WHERE treatment_date >= ? AND tenant_id = ? AND clinic_id = ? AND dentist_id=?`,
      [
        new Date(now.getTime() - 365 * 4 * 24 * 60 * 60 * 1000),
        tenant_id,
        clinic_id,
        dentist_id,
      ]
    ),
    conn.query(
      `SELECT e.expense_date AS date, e.expense_amount AS amount
         FROM expense e
         WHERE e.expense_date >= ? AND e.tenant_id = ? AND e.clinic_id = ?`,
      [
        new Date(now.getFullYear() - 4, now.getMonth(), now.getDate()),
        tenant_id,
        clinic_id,
      ]
    ),
  ]);

  appointments = appointments[0];
  treatments = treatments[0];
  expenses = expenses[0];

  return { appointments, treatments, expenses };
};

const getClinicSettingsByTenantIdAndClinicId = async (tenantId, clinicId) => {
  const query = `select t.tenant_name,t.tenant_domain, c.clinic_name,c.clinic_logo,c.clinic_app_themes,c.clinic_app_font from clinic c inner join tenant t on t.tenant_id=c.tenant_id  where c.tenant_id=? and c.clinic_id=?`;
  const conn = await pool.getConnection();
  try {
    const rows = await conn.query(query, [tenantId, clinicId]);
    return rows[0][0];
  } catch (error) {
    console.error(error);
    throw new Error("Database Operation Failed");
  } finally {
    conn.release();
  }
};

const updateClinicSettings = async (tenantId, clinicId, details) => {
  const query = `
    UPDATE clinic
    SET clinic_name=?,clinic_logo=?,clinic_app_font=?,clinic_app_themes=?,updated_by=?
    WHERE tenant_id = ? AND clinic_id=?;
  `;

  const conn = await pool.getConnection();
  try {
    const [result] = await conn.query(query, [
      details.clinic_name,
      details.clinic_logo,
      details.clinic_app_font,
      details.clinic_app_themes,
      details.updated_by,
      tenantId,
      clinicId,
    ]);
    return result.affectedRows > 0;
  } catch (error) {
    throw new Error(`Database Operation Failed while updating clinic settings`);
  } finally {
    conn.release();
  }
};

module.exports = {
  createClinic,
  getAllClinicsByTenantId,
  getClinicByTenantIdAndClinicId,
  updateClinic,
  deleteClinicByTenantIdAndClinicId,
  checkClinicExistsByTenantIdAndClinicId,
  getClinicNameAndAddressByClinicId,
  updateDoctorCount,
  updatePatientCount,
  getFinanceSummary,
  getFinanceSummarybyDentist,
  getClinicSettingsByTenantIdAndClinicId,
  updateClinicSettings,
};
