const { CustomError } = require("../middlewares/CustomeError");
const clinicService = require("../services/ClinicService");
const {
  checkPhoneNumberExists,
  checkPhoneNumberExistsWithId,
} = require("../models/checkIfExists");
const { checkTenantExistsByTenantIdValidation } = require("./TenantValidation");
const { validateInput } = require("./InputValidation");
const { recordExists } = require("../query/Records");

// Validate mandatory fields dynamically
const validateRequiredField = (fieldValue, fieldName) => {
  if (!fieldValue || fieldValue === null) {
    throw new CustomError(`${fieldName} is required`, 400);
  }
};

// Validate tenant existence
const validateTenant = async (tenantId) => {
  await checkTenantExistsByTenantIdValidation(tenantId);
};

// Validate clinic phone numbers
const validateClinicPhones = async (data, clinicId = 0) => {
  const { phone_number, alternate_phone_number } = data;

  if (clinicId > 0) {
    await checkPhoneNumberExistsWithId(
      "clinic",
      phone_number,
      "Phone Number",
      clinicId
    );
    if (alternate_phone_number) {
      await checkPhoneNumberExistsWithId(
        "clinic",
        alternate_phone_number,
        "Alternate Phone Number",
        clinicId
      );
    }
  } else {
    await checkPhoneNumberExists("clinic", phone_number, "Phone Number");
    if (alternate_phone_number) {
      await checkPhoneNumberExists(
        "clinic",
        alternate_phone_number,
        "Alternate Phone Number"
      );
    }
  }
};

const createColumnConfig = [
  { columnname: "tenant_id", type: "int", size: 11, null: false },
  { columnname: "clinic_name", type: "varchar", size: 255, null: false },
  { columnname: "email", type: "varchar", size: 255, null: true },
  { columnname: "phone_number", type: "varchar", size: 15, null: false },
  {
    columnname: "alternate_phone_number",
    type: "varchar",
    size: 15,
    null: true,
  },
  { columnname: "branch", type: "varchar", size: 50, null: true },
  { columnname: "website", type: "varchar", size: 255, null: true },
  { columnname: "address", type: "text", null: false },
  { columnname: "city", type: "varchar", size: 100, null: false },
  { columnname: "state", type: "varchar", size: 100, null: false },
  { columnname: "country", type: "varchar", size: 50, null: false },
  { columnname: "pin_code", type: "varchar", size: 10, null: false },
  { columnname: "license_number", type: "varchar", size: 15, null: false },
  { columnname: "gst_number", type: "varchar", size: 15, null: true },
  { columnname: "pan_number", type: "varchar", size: 15, null: true },
  { columnname: "established_year", type: "int", null: false },
  { columnname: "total_doctors", type: "int", null: true },
  { columnname: "total_patients", type: "int", null: true },
  { columnname: "total_dental_chairs", type: "int", null: true },
  { columnname: "number_of_assistants", type: "int", null: true },
  {
    columnname: "available_services",
    type: "text",
    null: false,
    data_type: "json",
  },
  {
    columnname: "operating_hours",
    type: "text",
    null: true,
    data_type: "json",
  },
  {
    columnname: "insurance_supported",
    type: "tinyint",
    null: false,
    is_boolean: true,
  },
  { columnname: "ratings", type: "decimal", size: "3,2", null: true },
  { columnname: "reviews_count", type: "int", null: true },
  { columnname: "emergency_support", type: "tinyint", null: false },
  { columnname: "teleconsultation_supported", type: "tinyint", null: false },
  { columnname: "clinic_logo", type: "text", size: 255, null: true },
  { columnname: "parking_availability", type: "tinyint", null: false },
  { columnname: "pharmacy", type: "tinyint", null: true },
  { columnname: "wifi", type: "tinyint", null: false },
  { columnname: "created_by", type: "varchar", size: 20, null: false },
];
const updateColumnConfig = [
  { columnname: "tenant_id", type: "int", size: 11, null: false },
  { columnname: "clinic_name", type: "varchar", size: 255, null: false },
  { columnname: "email", type: "varchar", size: 255, null: true },
  { columnname: "phone_number", type: "varchar", size: 15, null: false },
  {
    columnname: "alternate_phone_number",
    type: "varchar",
    size: 15,
    null: true,
  },
  { columnname: "branch", type: "varchar", size: 50, null: true },
  { columnname: "website", type: "varchar", size: 255, null: true },
  { columnname: "address", type: "text", null: false },
  { columnname: "city", type: "varchar", size: 100, null: false },
  { columnname: "state", type: "varchar", size: 100, null: false },
  { columnname: "country", type: "varchar", size: 50, null: false },
  { columnname: "pin_code", type: "varchar", size: 10, null: false },
  { columnname: "license_number", type: "varchar", size: 15, null: false },
  { columnname: "gst_number", type: "varchar", size: 15, null: true },
  { columnname: "pan_number", type: "varchar", size: 15, null: true },
  { columnname: "established_year", type: "int", null: false },
  { columnname: "total_doctors", type: "int", null: true },
  { columnname: "total_patients", type: "int", null: true },
  { columnname: "total_dental_chairs", type: "int", null: true },
  { columnname: "number_of_assistants", type: "int", null: true },
  {
    columnname: "available_services",
    type: "text",
    null: false,
    data_type: "json",
  },
  {
    columnname: "operating_hours",
    type: "text",
    null: true,
    data_type: "json",
  },
  {
    columnname: "insurance_supported",
    type: "tinyint",
    null: false,
    is_boolean: true,
  },
  { columnname: "ratings", type: "decimal", size: "3,2", null: true },
  { columnname: "reviews_count", type: "int", null: true },
  { columnname: "emergency_support", type: "tinyint", null: false },
  { columnname: "teleconsultation_supported", type: "tinyint", null: false },
  { columnname: "clinic_logo", type: "text", size: 255, null: true },
  { columnname: "parking_availability", type: "tinyint", null: false },
  { columnname: "pharmacy", type: "tinyint", null: true },
  { columnname: "wifi", type: "tinyint", null: false },
  { columnname: "updated_by", type: "varchar", size: 20, null: false },
];

// Create Clinic Validation
const createClinicValidation = async (details) => {
  await validateInput(details, createColumnConfig);
  await validateTenant(details.tenant_id);
  await validateClinicPhones(details);
};

// Update Clinic Validation
const updateClinicValidation = async (clinicId, details, tenantId) => {
  if (!clinicId) throw new CustomError("Clinic ID is required", 400);
  await validateInput(details, updateColumnConfig);
  await validateTenant(tenantId);
  const clinic = await recordExists("clinic", {
    tenant_id: tenantId,
    clinic_id: clinicId,
  });
  if (!clinic) throw new CustomError("clinic id not found", 404);
  if (
    details.alternate_phone_number !== null &&
    Number(details.phone_number) === Number(details.alternate_phone_number)
  ) {
    throw new CustomError(
      "Phone number and alternate phone number cannot be the same",
      409
    );
  }

  await validateClinicPhones(details, clinicId);
};

// Check if Clinic exists by Clinic ID
const checkClinicExistsByClinicIdValidation = async (
  tenantId,
  clinicId
) => {
  await validateTenant(tenantId);

  const clinic =
    await clinicService.checkClinicExistsByTenantIdAndClinicId(
      tenantId,
      clinicId
    );

  if (!clinic) {
    throw new CustomError("Clinic not found", 409);
  }
};

module.exports = {
  createClinicValidation,
  updateClinicValidation,
  checkClinicExistsByClinicIdValidation,
};
