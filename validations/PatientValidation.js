const { CustomError } = require("../middlewares/CustomeError");
const patientService = require("../services/PatientService");
const {
  checkPhoneNumberExists,
  checkPhoneNumberExistsWithId,
} = require("../models/checkIfExists");
const { checkTenantExistsByTenantIdValidation } = require("./TenantValidation");
const { validateInput } = require("./InputValidation");

const CreateColumnConfig = [
  { columnname: "tenant_id", type: "int", size: 11, null: false },
  { columnname: "first_name", type: "varchar", size: 50, null: false },
  { columnname: "last_name", type: "varchar", size: 50, null: false },
  { columnname: "email", type: "varchar", size: 255, null: true },
  { columnname: "phone_number", type: "varchar", size: 15, null: false },
  { columnname: "alter_phone_number", type: "varchar", size: 15, null: true },
  { columnname: "date_of_birth", type: "date", null: false },
  {
    columnname: "gender",
    type: "enum",
    enum_values: ["Male", "Female", "Transgender"],
    null: false,
  },
  { columnname: "blood_group", type: "varchar", size: 10, null: true },
  { columnname: "address", type: "text", null: false },
  { columnname: "city", type: "varchar", size: 100, null: false },
  { columnname: "state", type: "varchar", size: 100, null: false },
  { columnname: "country", type: "varchar", size: 50, null: false },
  { columnname: "pin_code", type: "varchar", size: 20, null: false },
  { columnname: "medical_history", type: "text", null: true },
  { columnname: "current_medications", type: "text", null: true },
  {
    columnname: "dentist_preference",
    type: "int",
    null: true,
    foreign_key: true,
  },
  {
    columnname: "smoking_status",
    type: "enum",
    enum_values: ["Never", "Former", "Current"],
    null: false,
  },
  {
    columnname: "alcohol_consumption",
    type: "enum",
    enum_values: ["Never", "Occasional", "Regular"],
    null: false,
  },
  {
    columnname: "emergency_contact_name",
    type: "varchar",
    size: 255,
    null: false,
  },
  {
    columnname: "emergency_contact_phone",
    type: "varchar",
    size: 15,
    null: false,
  },
  { columnname: "insurance_provider", type: "varchar", size: 255, null: true },
  {
    columnname: "insurance_policy_number",
    type: "varchar",
    size: 255,
    null: true,
  },
  { columnname: "treatment_history", type: "json", null: true },
  { columnname: "appointment_count", type: "int", null: true },
  { columnname: "last_appointment_date", type: "timestamp", null: true },
  { columnname: "profile_picture", type: "text", null: true },
  { columnname: "created_by", type: "varchar", size: 20, null: false },
  { columnname: "first_visit_date", type: "timestamp", null: true },
];
const UpdateColumnConfig = [
  { columnname: "tenant_id", type: "int", size: 11, null: false },
  { columnname: "first_name", type: "varchar", size: 50, null: false },
  { columnname: "last_name", type: "varchar", size: 50, null: false },
  { columnname: "email", type: "varchar", size: 255, null: true },
  { columnname: "phone_number", type: "varchar", size: 15, null: false },
  { columnname: "alter_phone_number", type: "varchar", size: 15, null: true },
  { columnname: "date_of_birth", type: "date", null: false },
  {
    columnname: "gender",
    type: "enum",
    enum_values: ["Male", "Female", "Transgender"],
    null: false,
  },
  { columnname: "blood_group", type: "varchar", size: 10, null: true },
  { columnname: "address", type: "text", null: false },
  { columnname: "city", type: "varchar", size: 100, null: false },
  { columnname: "state", type: "varchar", size: 100, null: false },
  { columnname: "country", type: "varchar", size: 50, null: false },
  { columnname: "pin_code", type: "varchar", size: 20, null: false },
  { columnname: "medical_history", type: "text", null: true },
  { columnname: "current_medications", type: "text", null: true },
  {
    columnname: "dentist_preference",
    type: "int",
    null: true,
    foreign_key: true,
  },
  {
    columnname: "smoking_status",
    type: "enum",
    enum_values: ["Never", "Former", "Current"],
    null: false,
  },
  {
    columnname: "alcohol_consumption",
    type: "enum",
    enum_values: ["Never", "Occasional", "Regular"],
    null: false,
  },
  {
    columnname: "emergency_contact_name",
    type: "varchar",
    size: 255,
    null: false,
  },
  {
    columnname: "emergency_contact_phone",
    type: "varchar",
    size: 15,
    null: false,
  },
  { columnname: "insurance_provider", type: "varchar", size: 255, null: true },
  {
    columnname: "insurance_policy_number",
    type: "varchar",
    size: 255,
    null: true,
  },
  { columnname: "treatment_history", type: "json", null: true },
  { columnname: "appointment_count", type: "int", null: true },
  { columnname: "last_appointment_date", type: "timestamp", null: true },
  { columnname: "profile_picture", type: "text", null: true },
  { columnname: "updated_by", type: "varchar", size: 20, null: false },
  { columnname: "first_visit_date", type: "timestamp", null: true },
];

// Validate phone numbers
const validatePatientPhones = async (data, patientId = 0) => {
  const { phone_number, alternate_phone_number } = data;

  if (patientId > 0) {
    await checkPhoneNumberExistsWithId(
      "patient",
      phone_number,
      "Phone Number",
      patientId
    );
    if (alternate_phone_number) {
      await checkPhoneNumberExistsWithId(
        "patient",
        "patient_id",
        "Alternate Phone Number",
        alternate_phone_number,
        patientId
      );
    }
  } else {
    await checkPhoneNumberExists("patient", phone_number, "Phone Number");
    if (alternate_phone_number) {
      await checkPhoneNumberExists(
        "patient",
        "patient_id",
        alternate_phone_number,
        "Alternate Phone Number",
        patientId
      );
    }
  }
};

// Create Patient Validation
const createPatientValidation = async (details) => {
  await validateInput(details, CreateColumnConfig);
  await checkTenantExistsByTenantIdValidation(details.tenant_id);
  await validatePatientPhones(details);
};

// Update Patient Validation
const updatePatientValidation = async (patientId, details, tenantId) => {
  await validateInput(details, UpdateColumnConfig);

  await checkTenantExistsByTenantIdValidation(tenantId);

  if (
    details.alternate_phone_number !== null &&
    Number(details.phone_number) === Number(details.alternate_phone_number)
  ) {
    throw new CustomError(
      "Phone number and alternate phone number cannot be the same",
      409
    );
  }

  await validatePatientPhones(details, patientId);
};

// Check if Patient exists by Patient ID
const checkPatientExistsByPatientIdValidation = async (tenantId, patientId) => {
  await checkTenantExistsByTenantIdValidation(tenantId);

  const patient = await patientService.checkPatientExistsByTenantIdAndPatientId(
    tenantId,
    patientId
  );

  if (!patient) {
    throw new CustomError("Patient not found", 409);
  }
};

module.exports = {
  createPatientValidation,
  updatePatientValidation,
  checkPatientExistsByPatientIdValidation,
};
