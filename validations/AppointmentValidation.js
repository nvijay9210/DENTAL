const { CustomError } = require("../middlewares/CustomeError");
const appointmentService = require("../services/AppointmentService");
const appointmentModel = require("../models/AppointmentModel");
const {
  checkPhoneNumberExists,
  checkPhoneNumberExistsWithId,
} = require("../models/checkIfExists");
const { checkTenantExistsByTenantIdValidation } = require("./TenantValidation");
const { validateInput } = require("./InputValidation");

const createColumnConfig = [
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
    enum_values: ["Scheduled", "Completed", "Cancelled"],
    null: false,
  },
  {
    columnname: "appointment_type",
    type: "enum",
    enum_values: ["In-person", "Teleconsultation"],
    null: false,
  },
  { columnname: "consultation_fee", type: "decimal", size: "10,2", null: true },
  {
    columnname: "discount_applied",
    type: "decimal",
    size: "10,2",
    null: true,
    default: 0.0,
  },
  {
    columnname: "payment_status",
    type: "enum",
    enum_values: ["Paid", "Unpaid", "Pending"],
    null: false,
    default: "Pending",
  },
  {
    columnname: "payment_method",
    type: "enum",
    enum_values: ["Cash", "Card", "Insurance", "Other"],
    null: false,
  },
  { columnname: "visit_reason", type: "text", null: true },
  {
    columnname: "follow_up_needed",
    type: "boolean",
    null: false,
    default: false,
  },
  {
    columnname: "reminder_method",
    type: "enum",
    enum_values: ["SMS", "Email", "Call", "WhatsApp"],
    null: false,
  },
  { columnname: "notes", type: "text", null: true },
  { columnname: "created_by", type: "varchar", size: 20, null: false },
];

const updateColumnConfig = [
  { columnname: "tenant_id", type: "int", size: 11, null: false },
  { columnname: "patient_id", type: "int", size: 11, null: false },
  { columnname: "dentist_id", type: "int", size: 11, null: false },
  { columnname: "clinic_id", type: "int", size: 11, null: false },
  { columnname: "appointment_date", type: "date", null: false },
  { columnname: "start_time", type: "time", null: false },
  { columnname: "end_time", type: "time", null: false },
  {
    columnname: "status",
    type: "enum",
    enum_values: ["Scheduled", "Completed", "Cancelled"],
    null: false,
  },
  {
    columnname: "appointment_type",
    type: "enum",
    enum_values: ["In-person", "Teleconsultation"],
    null: false,
  },
  { columnname: "consultation_fee", type: "decimal", size: "10,2", null: true },
  {
    columnname: "discount_applied",
    type: "decimal",
    size: "10,2",
    null: true,
    default: 0.0,
  },
  {
    columnname: "payment_status",
    type: "enum",
    enum_values: ["Paid", "Unpaid", "Pending"],
    null: false,
    default: "Pending",
  },
  {
    columnname: "payment_method",
    type: "enum",
    enum_values: ["Cash", "Card", "Insurance", "Other"],
    null: false,
  },
  { columnname: "visit_reason", type: "text", null: true },
  {
    columnname: "follow_up_needed",
    type: "boolean",
    null: false,
    default: false,
  },
  {
    columnname: "reminder_method",
    type: "enum",
    enum_values: ["SMS", "Email", "Call", "WhatsApp"],
    null: false,
  },
  { columnname: "notes", type: "text", null: true },
  { columnname: "updated_by", type: "varchar", size: 20, null: false },
];

// Create Appointment Validation
const createAppointmentValidation = async (details) => {
  await validateInput(details, createColumnConfig);
  await checkTenantExistsByTenantIdValidation(details.tenant_id);
  const appointment =
    await appointmentModel.checkAppointmentExistsByStartTimeAndEndTimeAndDate(
      details
    );
  if (appointment) throw new CustomError("Appointment Alredy Scheduled");
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
  await validateInput(details, updateColumnConfig);
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

  const appointment =
    await appointmentService.checkAppointmentExistsByTenantIdAndAppointmentId(
      tenantId,
      appointmentId
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
