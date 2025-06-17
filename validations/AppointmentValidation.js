const { CustomError } = require("../middlewares/CustomeError");
const appointmentService = require("../services/AppointmentService");
const appointmentModel = require("../models/AppointmentModel");
const {
  checkPhoneNumberExists,
  checkPhoneNumberExistsWithId,
  checkIfIdExists,
  checkIfExists,
} = require("../models/checkIfExists");
const { checkTenantExistsByTenantIdValidation } = require("./TenantValidation");
const { validateInput } = require("./InputValidation");

const appoinmentColumnConfig = [
  { columnname: "patient_id", type: "int", size: 11, null: false },
  { columnname: "tenant_id", type: "int", size: 11, null: false },
  { columnname: "dentist_id", type: "int", size: 11, null: false },
  { columnname: "clinic_id", type: "int", size: 11, null: false },
  { columnname: "appointment_date", type: "date", null: false },
  { columnname: "start_time", type: "time", null: false },
  { columnname: "end_time", type: "time", null: false },
  {
    columnname: "status",
    type: "enum",
    enum_values: ['pending', 'confirmed', 'checkedin', 'inprogress', 'completed', 'cancelled', 'clinic_cancelled', 'noshow', 'rescheduled', 'followup', 'rejected', 'expired', 'payment_pending', 'paid'],
    null: false,
  },
  {
    columnname: "appointment_type",
    type: "enum",
    enum_values: ['video','audio'],
    null: false,
  },
  { columnname: "consultation_fee", type: "decimal", size: "10,2", null: true },
  {
    columnname: "discount_applied",
    type: "decimal",
    size: "6,2",
    null: true,
    default: 0.0,
  },
  {
    columnname: "payment_status",
    type: "varchar",
    size:100,
    null: false,
  },
  {
    columnname: "min_booking_fee",
    type: "int",
    size:11,
    null: true,
  },
  {
    columnname: "paid_amount",
    type: "int",
    size:11,
    null: true,
  },
  {
    columnname: "mode_of_payment",
    type: "varchar",
    size:100,
    null: false,
  },
  { columnname: "visit_reason", type: "text", null: true },
  { columnname: "feedback", type: "text", null: true },
  {
    columnname: "doctor_rating",
    type: "decimal",
    size: "3,2",
    null: true,
    default: 0.0,
  },
  {
    columnname: "follow_up_needed",
    type: "boolean",
    null: false,
    default: false,
  },
  {
    columnname: "reminder_method",
    type: "varchar",
    size:100,
    null: true,
  },
  { columnname: "notes", type: "text", null: true },
];

const createColumnConfig = [
  ...appoinmentColumnConfig,
  { columnname: "created_by", type: "varchar", size: 20, null: false },
];

const updateColumnConfig = [
  ...appoinmentColumnConfig,
  { columnname: "updated_by", type: "varchar", size: 20, null: false },
];

// Create Appointment Validation
const createAppointmentValidation = async (details) => {
  validateInput(details, createColumnConfig);
  await checkIfIdExists("tenant", "tenant_id", details.tenant_id);
  await checkIfIdExists("clinic", "clinic_id", details.clinic_id);
  await checkIfIdExists("dentist", "dentist_id", details.dentist_id);
  await checkIfIdExists("patient", "patient_id", details.patient_id);
  const appointment =
    await appointmentModel.checkAppointmentExistsByStartTimeAndEndTimeAndDate(
      details
    );
  if (appointment) throw new CustomError("Appointment Alredy Scheduled",409);
};

// Update Appointment Validation
const updateAppointmentValidation = async (
  appointmentId,
  details,
  tenantId,
  clinic_id,
  patient_id,
  dentist_id
) => {
  validateInput(details, updateColumnConfig);
  await checkTenantExistsByTenantIdValidation(tenantId);
  const appointment =
    await appointmentModel.checkAppointmentExistsByStartTimeAndEndTimeAndDate(
      tenantId,
      clinic_id,
      patient_id,
      dentist_id,
      details
    );
  if (!appointment) throw new CustomError("Appointment Alredy Scheduled");
};

// Check if Appointment exists by Appointment ID
const checkAppointmentExistsByAppointmentIdValidation = async (
  tenantId,
  appointmentId
) => {
  await checkTenantExistsByTenantIdValidation(tenantId);

  const appointment = await checkIfExists(
    "appointment",
    "appointment_id",
    appointmentId,
    tenantId
  );

  if (!appointment) {
    throw new CustomError("Appointment not found", 409);
  }
};

module.exports = {
  createAppointmentValidation,
  updateAppointmentValidation,
  checkAppointmentExistsByAppointmentIdValidation,
};
