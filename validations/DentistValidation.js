const { CustomError } = require("../middlewares/CustomeError");
const dentistService = require("../services/DentistService");
const { validatePhonesGlobally } = require("../utils/PhoneValidationHelper");
const {
  checkIfExistsWithoutId,
  checkIfExists,
  checkIfIdExists,
} = require("../models/checkIfExists");
const { checkTenantExistsByTenantIdValidation } = require("./TenantValidation");
const { validateInput } = require("./InputValidation");
const { globalValidationEmail } = require("../utils/GlobalValidationEmail");

const uniqueFields = ["email", "license_number"];

// Validate tenant existence
const validateTenant = async (tenantId) => {
  await checkTenantExistsByTenantIdValidation(tenantId);
};

const dentistColumnConfig = [
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
  { columnname: "gender", type: "varchar", size: 10, null: true },
  { columnname: "date_of_birth", type: "date", null: true },
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
    size: 20,
    null: false,
    pattern: /^\+?[0-9]{7,15}$/,
  },
  {
    columnname: "alternate_phone_number",
    type: "varchar",
    size: 20,
    null: true,
    pattern: /^\+?[0-9]{7,15}$/,
  },
  {
    columnname: "specialisation",
    type: "varchar",
    null: false,
  },
  { columnname: "experience_years", type: "int", size: 2, null: false },
  {
    columnname: "license_number",
    type: "varchar",
    size: 10,
    null: false,
    // pattern: /^[A-Z]{2}[0-9]{4}[A-Z]{2}[0-9]{2}$/,
  },
  {
    columnname: "designation",
    type: "text",
    null: true
  },
  {
    columnname: "member_of",
    type: "longtext",
    null: true,
    data_type: "json",
  },
  {
    columnname: "internship",
    type: "longtext",
    null: true,
    data_type: "json",
  },
  {
    columnname: "position_held",
    type: "longtext",
    null: true,
    data_type: "json",
  },
  {
    columnname: "research_projects",
    type: "longtext",
    null: true,
  },
  {
    columnname: "publication",
    type: "longtext",
    null: true,
  },
  {
    columnname: "social_activities",
    type: "longtext",
    null: true,
  },
  {
    columnname: "duration",
    type: "time",
    null: true,
  },
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
  {
    columnname: "working_hours",
    type: "longtext",
    null: true,
    data_type: "json",
  },
  {
    columnname: "available_days",
    type: "longtext",
    null: true,
    data_type: "json",
  },
  { columnname: "consultation_fee", type: "decimal", size: "10,2", null: true },
  { columnname: "min_booking_fee", type: "int", size: 6 , null: true },
  { columnname: "ratings", type: "decimal", size: "3,2", null: true },
  { columnname: "reviews_count", type: "int", null: true },
  { columnname: "appointment_count", type: "int", null: true },
  { columnname: "profile_picture", type: "varchar", size: 255, null: true },
  { columnname: "bio", type: "longtext", null: true, data_type: "json" },
  {
    columnname: "teleconsultation_supported",
    type: "tinyint",
    null: false,
    is_boolean: true,
  },
  {
    columnname: "languages_spoken",
    type: "longtext",
    null: true,
    data_type: "json",
  },
  {
    columnname: "awards_certifications",
    type: "longtext",
    size: 255,
    null: true,
  },
  {
    columnname: "social_links",
    type: "longtext",
    null: true,
    data_type: "json",
  },
  { columnname: "last_login", type: "timestamp", null: true },
];

const createColumnConfig = [
  ...dentistColumnConfig,
  { columnname: "created_by", type: "varchar", size: 30, null: false },
];

const updateColumnConfig = [
  ...dentistColumnConfig,
  { columnname: "updated_by", type: "varchar", size: 30, null: false },
];

const validateDentistPhones = async (data, dentistId = 0) => {
  const tenantId = data.tenant_id;

  await validatePhonesGlobally(data, dentistId, "dentist", tenantId);

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
  dentistId = 0
) => {
  for (const field of uniqueFields) {
    if (!details[field] || details[field] === null) continue;

    const exists = isUpdate
      ? await checkIfExistsWithoutId(
          "dentist",
          field,
          details[field],
          "dentist_id",
          dentistId,
          details.tenant_id
        )
      : await checkIfExists(
          "dentist",
          field,
          details[field],
          details.tenant_id
        );
    if (exists) throw new CustomError(`${field} already exists`, 409);
  }
};

// Create Dentist Validation
const createDentistValidation = async (details) => {

  validateInput(details, createColumnConfig);
  await checkIfIdExists("tenant", "tenant_id", details.tenant_id);
  await validateDentistPhones(details);
  
  if(details.email!==null) await globalValidationEmail(details.tenant_id,details.email);
  await validateUniqueFields(details);
};

// Update Dentist Validation
const updateDentistValidation = async (dentistId, details, tenant_id) => {
  validateInput(details, updateColumnConfig);
  await validateTenant(tenant_id);
  // await checkIfIdExists('clinic','clinic_id',details.clinic_id||0)

  // if(details.email!==null) await globalValidationEmail(details.tenant_id,details.email,'dentist',dentistId);
  await validateUniqueFields(details, true, dentistId);

  if (
    details.alternate_phone_number !== null &&
    Number(details.phone_number) === Number(details.alternate_phone_number)
  ) {
    throw new CustomError(
      "Phone number and alternate phone number cannot be the same",
      409
    );
  }

  await validateDentistPhones(details, dentistId);
};

// Check if Dentist exists by Dentist ID
const checkDentistExistsByDentistIdValidation = async (tenantId, dentistId) => {
  await validateTenant(tenantId);

  const dentist = await dentistService.checkDentistExistsByTenantIdAndDentistId(
    tenantId,
    dentistId
  );

  if (!dentist) {
    throw new CustomError("Dentist not found", 409);
  }
};

module.exports = {
  createDentistValidation,
  updateDentistValidation,
  checkDentistExistsByDentistIdValidation,
};
