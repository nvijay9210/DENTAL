const pool = require("../config/db");
const { CustomError } = require("../middlewares/CustomeError");
const helper = require("../utils/Helpers");
const record = require("../query/Records");
const { formatDateOnly } = require("../utils/DateUtils");
const moment = require("moment");

// Create Clinic
const createClinic = async (connection, table, columns, values) => {
  try {
    const clinic = await record.createRecord(
      table,
      columns,
      values,
      connection,
    );
    return clinic.insertId;
  } catch (error) {
    console.error("Error executing query:", error);
    throw error;
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
      offset,
    );
    return clinics;
  } catch (error) {
    console.error("Error executing query:", error);
    throw error;
  }
};

const getAllClinics = async (limit, offset) => {
  const query = `select clinic_id,tenant_id,clinic_name,phone_number,address,city,state,country,landmark,clinic_logo,email,available_services,operating_hours from clinic LIMIT ? OFFSET ?`;
  const conn = await pool.getConnection();
  try {
    const rows = await conn.query(query, [limit, offset]);
    // console.log('rows:',rows)
    return rows[0];
  } catch (error) {
    console.error(error);
    throw error;
  } finally {
    conn.release();
  }
};

// Get Clinic by Tenant ID and Clinic ID
const getClinicByTenantIdAndClinicId = async (tenant_id, clinic_id, conn) => {
  try {
    const rows = await record.getRecordByIdAndTenantId(
      "clinic",
      "tenant_id",
      tenant_id,
      "clinic_id",
      clinic_id,
      conn,
    );
    // console.log('rows',rows,tenant_id,clinic_id);
    return rows || null;
  } catch (error) {
    console.error("Error executing query:", error);
    throw error;
  }
};

// Update Clinic
const updateClinic = async (
  connection,
  clinic_id,
  columns,
  values,
  tenant_id,
) => {
  const conditionColumn = ["tenant_id", "clinic_id"];
  const conditionValue = [tenant_id, clinic_id];

  try {
    const result = await record.updateRecord(
      "clinic",
      columns,
      values,
      conditionColumn,
      conditionValue,
      connection,
    );
    return result.affectedRows;
  } catch (error) {
    console.error("Error executing query:", error);
    throw error;
  }
};

// Delete Clinic
const deleteClinicByTenantIdAndClinicId = async (
  conn,
  tenant_id,
  clinic_id,
) => {
  const conditionColumn = ["tenant_id", "clinic_id"];
  const conditionValue = [tenant_id, clinic_id];

  try {
    const result = await record.deleteRecord(
      "clinic",
      conditionColumn,
      conditionValue,
      conn,
    );
    return result.affectedRows;
  } catch (error) {
    console.error("Error executing query:", error);
    throw error;
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
    throw error;
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
    throw error;
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
      }ing doctor count`,
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
      }ing patient count`,
    );
  } finally {
    conn.release();
  }
};

async function getFinanceSummary(
  tenant_id,
  clinic_id,
  startDate,
  endDate,
  dentist_id = null,
) {
  const conn = await pool.getConnection();

  try {
    const query = `
      SELECT
        d.date,

        -- Payment income
        COALESCE(p_income.total, 0) AS payment_income,

        -- Appointment income
        COALESCE(a_income.total, 0) AS appointment_income,

        -- Treatment income
        COALESCE(t_income.total, 0) AS treatment_income,

        -- Expense types
        COALESCE(e_operational.total, 0) AS operational_expense,
        COALESCE(e_supplier.total, 0) AS supplier_expense

      FROM (
        SELECT DATE(payment_date) AS date
        FROM payment
        WHERE tenant_id = ?
          AND clinic_id = ?
          AND (? IS NULL OR dentist_id = ?)
          AND payment_status = 'completed'
          AND DATE(payment_date) BETWEEN ? AND ?

        UNION

        SELECT appointment_date AS date
        FROM appointment
        WHERE tenant_id = ?
          AND clinic_id = ?
          AND (? IS NULL OR dentist_id = ?)
          AND status = 'completed'
          AND appointment_date BETWEEN ? AND ?

        UNION

        SELECT treatment_date AS date
        FROM treatment
        WHERE tenant_id = ?
          AND clinic_id = ?
          AND (? IS NULL OR dentist_id = ?)
          AND treatment_date BETWEEN ? AND ?

        UNION

        SELECT expense_date AS date
        FROM expense
        WHERE tenant_id = ?
          AND clinic_id = ?
          AND expense_date BETWEEN ? AND ?

        UNION

        SELECT payment_date AS date
        FROM supplier_payments
        WHERE tenant_id = ?
          AND clinic_id = ?
          AND payment_date BETWEEN ? AND ?
      ) AS d

      LEFT JOIN (
        SELECT
          DATE(payment_date) AS date,
          SUM(final_amount) AS total
        FROM payment
        WHERE payment_status = 'completed'
          AND tenant_id = ?
          AND clinic_id = ?
          AND (? IS NULL OR dentist_id = ?)
          AND DATE(payment_date) BETWEEN ? AND ?
        GROUP BY DATE(payment_date)
      ) AS p_income
        ON d.date = p_income.date

      LEFT JOIN (
        SELECT
          appointment_date AS date,
          SUM(
            consultation_fee - IFNULL(discount_applied, 0)
          ) AS total
        FROM appointment
        WHERE status = 'completed'
          AND tenant_id = ?
          AND clinic_id = ?
          AND (? IS NULL OR dentist_id = ?)
          AND appointment_date BETWEEN ? AND ?
        GROUP BY appointment_date
      ) AS a_income
        ON d.date = a_income.date

      LEFT JOIN (
        SELECT
          treatment_date AS date,
          SUM(cost) AS total
        FROM treatment
        WHERE tenant_id = ?
          AND clinic_id = ?
          AND (? IS NULL OR dentist_id = ?)
          AND treatment_date BETWEEN ? AND ?
        GROUP BY treatment_date
      ) AS t_income
        ON d.date = t_income.date

      LEFT JOIN (
        SELECT
          expense_date AS date,
          SUM(expense_amount) AS total
        FROM expense
        WHERE tenant_id = ?
          AND clinic_id = ?
          AND expense_date BETWEEN ? AND ?
        GROUP BY expense_date
      ) AS e_operational
        ON d.date = e_operational.date

      LEFT JOIN (
        SELECT
          payment_date AS date,
          SUM(amount) AS total
        FROM supplier_payments
        WHERE tenant_id = ?
          AND clinic_id = ?
          AND payment_date BETWEEN ? AND ?
        GROUP BY payment_date
      ) AS e_supplier
        ON d.date = e_supplier.date

      ORDER BY d.date;
    `;

    const numTenantId = Number(tenant_id);
    const numClinicId = Number(clinic_id);

    const numDentistId = dentist_id !== null ? Number(dentist_id) : null;

    // ============================================================
    // Helper for query parameters
    // ============================================================

    const dateParams = (withDentist = true) => {
      if (withDentist) {
        return [
          numTenantId,
          numClinicId,
          numDentistId,
          numDentistId,
          startDate,
          endDate,
        ];
      }

      return [numTenantId, numClinicId, startDate, endDate];
    };

    // ============================================================
    // Query parameters
    // ============================================================

    const params = [
      // Main date UNION sources
      ...dateParams(true), // payment
      ...dateParams(true), // appointment
      ...dateParams(true), // treatment
      ...dateParams(false), // expense
      ...dateParams(false), // supplier payments

      // LEFT JOIN sources
      ...dateParams(true), // payment income
      ...dateParams(true), // appointment income
      ...dateParams(true), // treatment income
      ...dateParams(false), // operational expense
      ...dateParams(false), // supplier expense
    ];

    // ============================================================
    // Execute query
    // ============================================================

    const [rows] = await conn.query(query, params);

    // ============================================================
    // Build date-based result map
    // ============================================================

    const resultMap = {};

    rows.forEach((row) => {
      const dateStr = moment(row.date).format("YYYY-MM-DD");

      const paymentIncome = parseFloat(row.payment_income || 0);

      const appointmentIncome = parseFloat(row.appointment_income || 0);

      const treatmentIncome = parseFloat(row.treatment_income || 0);

      const operationalExpense = parseFloat(row.operational_expense || 0);

      const supplierExpense = parseFloat(row.supplier_expense || 0);

      resultMap[dateStr] = {
        income: {
          payment: paymentIncome,
          appointment: appointmentIncome,
          treatment: treatmentIncome,
          total: paymentIncome + appointmentIncome + treatmentIncome,
        },

        expense: {
          operational: operationalExpense,
          supplier: supplierExpense,
          total: operationalExpense + supplierExpense,
        },
      };
    });

    // ============================================================
    // Validate date range
    // ============================================================

    const start = moment(startDate).startOf("day");
    const end = moment(endDate).startOf("day");

    if (!start.isValid() || !end.isValid()) {
      throw new Error("Invalid startDate or endDate");
    }

    if (end.isBefore(start)) {
      return [];
    }

    // ============================================================
    // Fill all dates in range
    // ============================================================

    const result = [];

    const totalDays = end.diff(start, "days");

    for (let day = 0; day <= totalDays; day++) {
      const currentDate = start.clone().add(day, "days");

      const dateStr = currentDate.format("YYYY-MM-DD");

      const entry = resultMap[dateStr] || {
        income: {
          payment: 0,
          appointment: 0,
          treatment: 0,
          total: 0,
        },

        expense: {
          operational: 0,
          supplier: 0,
          total: 0,
        },
      };

      result.push({
        date: dateStr,
        income: entry.income,
        expense: entry.expense,
      });
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
      ],
    ),
    conn.query(
      `SELECT treatment_date AS date, cost AS amount FROM treatment 
           WHERE treatment_date >= ? AND tenant_id = ? AND clinic_id = ? AND dentist_id=?`,
      [
        new Date(now.getTime() - 365 * 4 * 24 * 60 * 60 * 1000),
        tenant_id,
        clinic_id,
        dentist_id,
      ],
    ),
    conn.query(
      `SELECT e.expense_date AS date, e.expense_amount AS amount
         FROM expense e
         WHERE e.expense_date >= ? AND e.tenant_id = ? AND e.clinic_id = ?`,
      [
        new Date(now.getFullYear() - 4, now.getMonth(), now.getDate()),
        tenant_id,
        clinic_id,
      ],
    ),
  ]);

  appointments = appointments[0];
  treatments = treatments[0];
  expenses = expenses[0];

  return { appointments, treatments, expenses };
};

const getClinicSettingsByTenantIdAndClinicId = async (tenantId, clinicId) => {
  const query = `select t.tenant_name,t.tenant_domain,c.otp,c.otp_type, c.clinic_name,c.clinic_app_themes,c.clinic_app_font,c.clinic_logo from clinic c inner join tenant t on t.tenant_id=c.tenant_id  where c.tenant_id=? and c.clinic_id=?`;
  const conn = await pool.getConnection();
  try {
    const rows = await conn.query(query, [tenantId, clinicId]);
    return rows[0][0];
  } catch (error) {
    console.error(error);
    throw error;
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
    throw error;
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
  getAllClinics,
};
