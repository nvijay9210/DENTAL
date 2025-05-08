const { CustomError } = require("../middlewares/CustomeError");
const clinicService = require("../services/ClinicService");
const {
  checkPhoneNumberExists,
  checkPhoneNumberExistsWithId,
  checkIfExists,
  checkIfExistsWithoutId,
} = require("../models/checkIfExists");
const { checkTenantExistsByTenantIdValidation } = require("./TenantValidation");
const { validateInput } = require("./InputValidation");
const { recordExists } = require("../query/Records");

const uniqueFields = ["email", "gst_number", "license_number", "pan_number"];

// Helpers
const validateTenant = async (tenantId) => {
  await checkTenantExistsByTenantIdValidation(tenantId);
};

const validateClinicPhones = async (data, clinicId = 0) => {
  const checker = clinicId > 0 ? checkPhoneNumberExistsWithId : checkPhoneNumberExists;
  await checker("clinic", data.phone_number, "Phone Number", clinicId);
  if (data.alternate_phone_number) {
    await checker("clinic", data.alternate_phone_number, "Alternate Phone Number", clinicId);
  }
};

const validateUniqueFields = async (details, isUpdate = false, clinicId = 0) => {
  for (const field of uniqueFields) {
    if (!details[field]) continue;
    const exists = isUpdate
      ? await checkIfExistsWithoutId("clinic", field, details[field],"clinic_id",clinicId,details.tenant_id)
      : await checkIfExists("clinic", field, details[field],details.tenant_id);
    if (exists) throw new CustomError(`${field} already exists`, 409);
  }
};

const validatePhonesNotSame = (details) => {
  if (
    details.alternate_phone_number &&
    Number(details.phone_number) === Number(details.alternate_phone_number)
  ) {
    throw new CustomError(
      "Phone number and alternate phone number cannot be the same",
      409
    );
  }
};

const createClinicColumnConfig = [
  { columnname: 'tenant_id', type: 'int', size: 11, null: false },
  { columnname: 'clinic_name', type: 'varchar', size: 255, null: false },
  { columnname: 'email', type: 'varchar', size: 255, null: true },
  { columnname: 'phone_number', type: 'varchar', size: 15, null: false },
  { columnname: 'alternate_phone_number', type: 'varchar', size: 15, null: true },
  { columnname: 'branch', type: 'varchar', size: 50, null: true },
  { columnname: 'website', type: 'varchar', size: 255, null: true },
  { columnname: 'address', type: 'text', null: false },
  { columnname: 'city', type: 'varchar', size: 100, null: false },
  { columnname: 'state', type: 'varchar', size: 100, null: false },
  { columnname: 'country', type: 'varchar', size: 50, null: false },
  { columnname: 'pin_code', type: 'varchar', size: 10, null: false },
  { columnname: 'license_number', type: 'varchar', size: 15, null: false },
  { columnname: 'gst_number', type: 'varchar', size: 15, null: true },
  { columnname: 'pan_number', type: 'varchar', size: 15, null: true },
  { columnname: 'established_year', type: 'int', size: 11, null: false },
  { columnname: 'total_doctors', type: 'int', size: 11, null: true },
  { columnname: 'total_patients', type: 'int', size: 11, null: true },
  { columnname: 'total_dental_chairs', type: 'int', size: 11, null: true },
  { columnname: 'number_of_assistants', type: 'int', size: 11, null: true },
  { columnname: 'available_services', type: 'longtext', null: false, data_type: 'json' },
  { columnname: 'operating_hours', type: 'longtext', null: true, data_type: 'json' },
  { columnname: 'insurance_supported', type: 'tinyint', null: false, is_boolean: true },
  { columnname: 'ratings', type: 'decimal', size: '3,2', null: true },
  { columnname: 'reviews_count', type: 'int', size: 11, null: true },
  { columnname: 'emergency_support', type: 'tinyint', null: false, is_boolean: true },
  { columnname: 'teleconsultation_supported', type: 'tinyint', null: false, is_boolean: true },
  { columnname: 'clinic_logo', type: 'varchar', size: 255, null: true },
  { columnname: 'parking_availability', type: 'tinyint', null: false, is_boolean: true },
  { columnname: 'pharmacy', type: 'tinyint', null: true, is_boolean: true },
  { columnname: 'wifi', type: 'tinyint', null: false, is_boolean: true },
  { columnname: 'created_by', type: 'varchar', size: 20, null: false }
];


const updateClinicColumnConfig = [
  { columnname: 'tenant_id', type: 'int', size: 11, null: false },
  { columnname: 'clinic_name', type: 'varchar', size: 255, null: false },
  { columnname: 'email', type: 'varchar', size: 255, null: true },
  { columnname: 'phone_number', type: 'varchar', size: 15, null: false },
  { columnname: 'alternate_phone_number', type: 'varchar', size: 15, null: true },
  { columnname: 'branch', type: 'varchar', size: 50, null: true },
  { columnname: 'website', type: 'varchar', size: 255, null: true },
  { columnname: 'address', type: 'text', null: false },
  { columnname: 'city', type: 'varchar', size: 100, null: false },
  { columnname: 'state', type: 'varchar', size: 100, null: false },
  { columnname: 'country', type: 'varchar', size: 50, null: false },
  { columnname: 'pin_code', type: 'varchar', size: 10, null: false },
  { columnname: 'license_number', type: 'varchar', size: 15, null: false },
  { columnname: 'gst_number', type: 'varchar', size: 15, null: true },
  { columnname: 'pan_number', type: 'varchar', size: 15, null: true },
  { columnname: 'established_year', type: 'int', size: 11, null: false },
  { columnname: 'total_doctors', type: 'int', size: 11, null: true },
  { columnname: 'total_patients', type: 'int', size: 11, null: true },
  { columnname: 'total_dental_chairs', type: 'int', size: 11, null: true },
  { columnname: 'number_of_assistants', type: 'int', size: 11, null: true },
  { columnname: 'available_services', type: 'longtext', null: false, data_type: 'json' },
  { columnname: 'operating_hours', type: 'longtext', null: true, data_type: 'json' },
  { columnname: 'insurance_supported', type: 'tinyint', null: false, is_boolean: true },
  { columnname: 'ratings', type: 'decimal', size: '3,2', null: true },
  { columnname: 'reviews_count', type: 'int', size: 11, null: true },
  { columnname: 'emergency_support', type: 'tinyint', null: false, is_boolean: true },
  { columnname: 'teleconsultation_supported', type: 'tinyint', null: false, is_boolean: true },
  { columnname: 'clinic_logo', type: 'varchar', size: 255, null: true },
  { columnname: 'parking_availability', type: 'tinyint', null: false, is_boolean: true },
  { columnname: 'pharmacy', type: 'tinyint', null: true, is_boolean: true },
  { columnname: 'wifi', type: 'tinyint', null: false, is_boolean: true },
  { columnname: 'updated_by', type: 'varchar', size: 20, null: false }
];



// Main validations
const createClinicValidation = async (details) => {
  validateInput(details, createClinicColumnConfig);
  await validateTenant(details.tenant_id);
  await validateClinicPhones(details);
  await validateUniqueFields(details);
};

const updateClinicValidation = async (clinicId, details, tenantId) => {
  if (!clinicId) throw new CustomError("Clinic ID is required", 400);
  validateInput(details, updateClinicColumnConfig);
  await validateTenant(tenantId);

  const clinic = await recordExists("clinic", { tenant_id: tenantId, clinic_id: clinicId });
  if (!clinic) throw new CustomError("Clinic ID not found", 404);

  validatePhonesNotSame(details);
  await validateClinicPhones(details, clinicId);
  await validateUniqueFields(details, true, clinicId);
};

const checkClinicExistsByClinicIdValidation = async (tenantId, clinicId) => {
  await validateTenant(tenantId);
  const clinic = await clinicService.checkClinicExistsByTenantIdAndClinicId(tenantId, clinicId);
  if (!clinic) throw new CustomError("Clinic not found", 409);
};

module.exports = {
  createClinicValidation,
  updateClinicValidation,
  checkClinicExistsByClinicIdValidation,
};
