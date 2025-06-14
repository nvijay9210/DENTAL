const { CustomError } = require("../middlewares/CustomeError");
const patientService = require("../services/PatientService");
const { checkIfExistsWithoutId, checkIfExists } = require("../models/checkIfExists");
const { checkTenantExistsByTenantIdValidation } = require("./TenantValidation");
const { validateInput } = require("./InputValidation");
const { validatePhonesGlobally } = require("../utils/PhoneValidationHelper");
const { globalValidationEmail } = require("../utils/GlobalValidationEmail");

const uniqueFields = [
  "email",
  "emergency_contact_number",
  "insurance_policy_number",
];

const patientColumnConfig = [
  { columnname: "tenant_id", type: "int", size: 11, null: false },
  // { columnname: "keycloak_id", type: "int", size: 11, null: false },
  // { columnname: "username", type: "varchar", size: 100, null: false },
  // { columnname: "password", type: "varchar", size: 255, null: false },
  {
    columnname: "first_name",
    type: "varchar",
    size: 50,
    null: false,
    pattern: /^[a-zA-Z\s]{2,50}$/,
  },
  {
    columnname: "last_name",
    type: "varchar",
    size: 50,
    null: false,
    pattern: /^[a-zA-Z\s]{1,50}$/,
  },
  {
    columnname: "email",
    type: "varchar",
    size: 255,
    null: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  {
    columnname: "phone_number",
    type: "varchar",
    size: 10,
    null: false,
    pattern: /^\+?[0-9]{7,15}$/,
  },
  {
    columnname: "alternate_phone_number",
    type: "varchar",
    size: 10,
    null: true,
    pattern: /^\+?[0-9]{7,15}$/,
  },
  { columnname: "date_of_birth", type: "date", null: false },
  {
    columnname: "gender",
    type: "enum",
    enum_values: ["M", "F", "TG"],
    null: false,
  },
  { columnname: "blood_group", type: "varchar", size: 10, null: true },
  { columnname: "address", type: "text", null: false },
  { columnname: "city", type: "varchar", size: 100, null: false },
  { columnname: "state", type: "varchar", size: 100, null: false },
  { columnname: "country", type: "varchar", size: 50, null: false },
  {
    columnname: "pin_code",
    type: "varchar",
    size: 10,
    null: false,
    pattern: /^\d{6}$/,
  },
  { columnname: "pre_history", type: "text", null: true },
  { columnname: "current_medications", type: "text", null: true },
  {
    columnname: "dentist_preference",
    type: "int",
    null: true,
    foreign_key: true,
  },
  {
    columnname: "smoking_status",
    type: "varchar",
    size:100,
    null: false,
  },
  {
    columnname: "alcohol_consumption",
    type: "varchar",
    size:100,
    null: false,
  },
  {
    columnname: "emergency_contact_name",
    type: "varchar",
    size: 255,
    null: false,
  },
  {
    columnname: "emergency_contact_number",
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
    pattern: /^[A-Z0-9]{10,20}$/,
  },
  {
    columnname: "referred_by",
    type: "varchar",
    size: 100,
    null: true,
  },
  {
    columnname: "profession",
    type: "varchar",
    size: 100,
    null: true,
  },
  {
    columnname: "tooth_details",
    type: "text",
    null: true,
  },
  { columnname: "treatment_history", type: "json", null: true },
  { columnname: "appointment_count", type: "int", null: true },
  { columnname: "last_appointment_date", type: "timestamp", null: true },
  { columnname: "profile_picture", type: "text", null: true },
  { columnname: "first_visit_date", type: "timestamp", null: true },
];

const CreateColumnConfig = [
  ...patientColumnConfig,
  { columnname: "created_by", type: "varchar", size: 30, null: false },
];

const UpdateColumnConfig = [
  ...patientColumnConfig,
  { columnname: "updated_by", type: "varchar", size: 30, null: false },
];

const validatePatientPhones = async (data, patientId = 0) => {
  const tenantId = data.tenant_id;

  await validatePhonesGlobally(data, patientId, "patient", tenantId);

  if (
    data.alternate_phone_number &&
    data.phone_number === data.alternate_phone_number
  ) {
    throw new CustomError("Phone and alternate phone cannot be the same", 409);
  }
};

const validateUniqueFields = async (
  details,
  isUpdate = false,
  patientId = 0
) => {
  for (const field of uniqueFields) {
    if (!details[field]) continue;
    const exists = isUpdate
      ? await checkIfExistsWithoutId(
          "patient",
          field,
          details[field],
          "patient_id",
          patientId,
          details.tenant_id
        )
      : await checkIfExists(
          "patient",
          field,
          details[field],
          details.tenant_id
        );
    if (exists) throw new CustomError(`${field} already exists`, 409);
  }
};

// Create Patient Validation
const createPatientValidation = async (details) => {
  validateInput(details, CreateColumnConfig);
  await checkTenantExistsByTenantIdValidation(details.tenant_id);
  await validatePatientPhones(details);
  if(details.email!==null) await globalValidationEmail(details.tenant_id,details.email);
  await validateUniqueFields(details);
};

// Update Patient Validation
const updatePatientValidation = async (patientId, details, tenantId) => {
  validateInput(details, UpdateColumnConfig);

  const patient=await checkIfExists('patient','patient_id',patientId,tenantId)
  if(!patient) throw new CustomError('PatientId not found',400)
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
  if(details.email!==null) await globalValidationEmail(details.tenant_id,details.email,patientId);
  await validateUniqueFields(details, true, patientId);
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
