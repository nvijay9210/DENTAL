const { CustomError } = require("../middlewares/CustomeError");
const dentistService = require("../services/DentistService");
const {
  checkPhoneNumberExists,
  checkPhoneNumberExistsWithId,
} = require("../models/checkIfExists");
const { checkTenantExistsByTenantIdValidation } = require("./TenantValidation");
const { validateInput } = require("./InputValidation");

// Validate mandatory fields dynamically
const validateRequiredField = (fieldValue, fieldName) => {
  if (fieldValue===undefined || fieldValue === null) {
    throw new CustomError(`${fieldName} is required`, 400);
  }
};

// Validate tenant existence
const validateTenant = async (tenantId) => {
  await checkTenantExistsByTenantIdValidation(tenantId);
};

const createColumnConfig = [
  { columnname: 'tenant_id', type: 'int', size:11, null: false },
  { columnname: 'first_name', type: 'varchar', size: 50, null: false },
  { columnname: 'last_name', type: 'varchar', size: 50, null: false },
  { columnname: 'gender', type: 'varchar', size: 10, null: true },
  { columnname: 'date_of_birth', type: 'date', null: true },
  { columnname: 'email', type: 'varchar', size: 255, null: true },
  { columnname: 'phone_number', type: 'varchar', size: 15, null: false },
  { columnname: 'alternate_phone_number', type: 'varchar', size: 15, null: true },
  { columnname: 'specialization', type: 'text', null: false, data_type: 'json' },
  { columnname: 'experience_years', type: 'int', size: 2, null: false },
  { columnname: 'license_number', type: 'varchar', size: 20, null: false },
  { columnname: 'qualifications', type: 'text', null: false, data_type: 'json' },
  { columnname: 'clinic_name', type: 'varchar', size: 150, null: true },
  { columnname: 'clinic_address', type: 'varchar', size: 300, null: true },
  { columnname: 'city', type: 'varchar', size: 100, null: false },
  { columnname: 'state', type: 'varchar', size: 100, null: false },
  { columnname: 'country', type: 'varchar', size: 50, null: false },
  { columnname: 'pin_code', type: 'varchar', size: 20, null: false },
  { columnname: 'working_hours', type: 'text', null: true, data_type: 'json' },
  { columnname: 'available_days', type: 'text', null: true, data_type: 'json' },
  { columnname: 'consultation_fee', type: 'decimal', size: '10,2', null: true },
  { columnname: 'ratings', type: 'decimal', size: '3,2', null: true },
  { columnname: 'reviews_count', type: 'int', null: true },
  { columnname: 'appointment_count', type: 'int', null: true },
  { columnname: 'profile_picture', type: 'varchar', size: 255, null: true },
  { columnname: 'bio', type: 'text', null: true, data_type: 'json' },
  { columnname: 'teleconsultation_supported', type: 'tinyint', null: false, is_boolean: true },
  { columnname: 'insurance_supported', type: 'tinyint', null: false, is_boolean: true },
  { columnname: 'languages_spoken', type: 'text', null: true, data_type: 'json' },
  { columnname: 'awards_certifications', type: 'varchar', size: 255, null: true },
  { columnname: 'social_links', type: 'text', null: true, data_type: 'json' },
  { columnname: 'last_login', type: 'timestamp', null: true },
  { columnname: 'created_by', type: 'varchar', size: 20, null: false }
];

const updateColumnConfig = [
  { columnname: 'tenant_id', type: 'int', size:11, null: false },
  { columnname: 'first_name', type: 'varchar', size: 50, null: false },
  { columnname: 'last_name', type: 'varchar', size: 50, null: false },
  { columnname: 'gender', type: 'varchar', size: 10, null: true },
  { columnname: 'date_of_birth', type: 'date', null: true },
  { columnname: 'email', type: 'varchar', size: 255, null: true },
  { columnname: 'phone_number', type: 'varchar', size: 15, null: false },
  { columnname: 'alternate_phone_number', type: 'varchar', size: 15, null: true },
  { columnname: 'specialization', type: 'text', null: false, data_type: 'json' },
  { columnname: 'experience_years', type: 'int', size: 2, null: false },
  { columnname: 'license_number', type: 'varchar', size: 20, null: false },
  { columnname: 'qualifications', type: 'text', null: false, data_type: 'json' },
  { columnname: 'clinic_name', type: 'varchar', size: 150, null: true },
  { columnname: 'clinic_address', type: 'varchar', size: 300, null: true },
  { columnname: 'city', type: 'varchar', size: 100, null: false },
  { columnname: 'state', type: 'varchar', size: 100, null: false },
  { columnname: 'country', type: 'varchar', size: 50, null: false },
  { columnname: 'pin_code', type: 'varchar', size: 20, null: false },
  { columnname: 'working_hours', type: 'text', null: true, data_type: 'json' },
  { columnname: 'available_days', type: 'text', null: true, data_type: 'json' },
  { columnname: 'consultation_fee', type: 'decimal', size: '10,2', null: true },
  { columnname: 'ratings', type: 'decimal', size: '3,2', null: true },
  { columnname: 'reviews_count', type: 'int', null: true },
  { columnname: 'appointment_count', type: 'int', null: true },
  { columnname: 'profile_picture', type: 'varchar', size: 255, null: true },
  { columnname: 'bio', type: 'text', null: true, data_type: 'json' },
  { columnname: 'teleconsultation_supported', type: 'tinyint', null: false, is_boolean: true },
  { columnname: 'insurance_supported', type: 'tinyint', null: false, is_boolean: true },
  { columnname: 'languages_spoken', type: 'text', null: true, data_type: 'json' },
  { columnname: 'awards_certifications', type: 'varchar', size: 255, null: true },
  { columnname: 'social_links', type: 'text', null: true, data_type: 'json' },
  { columnname: 'last_login', type: 'timestamp', null: true },
  { columnname: 'updated_by', type: 'varchar', size: 20, null: false }
];

// Validate phone numbers

const validateDentistPhones = async (data, dentistId = 0) => {
  const { phone_number, alternate_phone_number } = data;

  if (dentistId > 0) {
    await checkPhoneNumberExistsWithId(
      "dentist",
      phone_number,
      "Phone Number",
      dentistId
    );
    if (alternate_phone_number) {
      await checkPhoneNumberExistsWithId(
        "dentist",
        "dentist_id",
        "Alternate Phone Number",
        alternate_phone_number,
        dentistId
      );
    }
  } else {
    await checkPhoneNumberExists("dentist", phone_number, "Phone Number");
    if (alternate_phone_number) {
      await checkPhoneNumberExists(
        "dentist",
        "dentist_id",
        alternate_phone_number,
        "Alternate Phone Number",
        dentistId
      );
    }
  }
};

// Create Dentist Validation
const createDentistValidation = async (details) => {
  await validateInput(details,createColumnConfig)
  await validateTenant(details.tenant_id);
  await validateDentistPhones(details);
};

// Update Dentist Validation
const updateDentistValidation = async (dentistId, details) => {
  await validateInput(details,updateColumnConfig)
  await validateTenant(details.tenant_id);

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
