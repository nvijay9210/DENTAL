const { CustomError } = require("../middlewares/CustomeError");
const { validateInput } = require("./InputValidation");
const { checkIfIdExists, checkIfExists } = require("../models/checkIfExists");
const { recordExists } = require("../query/Records");

const prescriptionColumnConfig = [
  { columnname: "tenant_id", type: "int", size: 11, null: false },
  { columnname: "patient_id", type: "int", size: 11, null: false },
  { columnname: "dentist_id", type: "int", size: 11, null: false },
  { columnname: "treatment_id", type: "int", size: 11, null: false },
  { columnname: "medication", type: "text", null: true },
  { columnname: "generic_name", type: "varchar", size: 255, null: true },
  { columnname: "brand_name", type: "varchar", size: 255, null: true },
  { columnname: "dosage", type: "text", null: true },
  { columnname: "frequency", type: "varchar", size: 50, null: true },
  { columnname: "quantity", type: "int", null: true },
  {
    columnname: "refill_allowed",
    type: "boolean",
    null: true,
    default: false,
  },
  {
    columnname: "refill_count",
    type: "int",
    null: true,
    default: 0,
  },
  { columnname: "side_effects", type: "text", null: true },
  { columnname: "start_date", type: "date", null: true },
  { columnname: "end_date", type: "date", null: true },
  { columnname: "instructions", type: "text", null: true },
  { columnname: "notes", type: "text", null: true },
  {
    columnname: "is_active",
    type: "boolean",
    null: false,
    default: true,
  },
];

// Prescription Column Configuration for Validation
const createColumnConfig = [
  ...prescriptionColumnConfig,
  { columnname: "created_by", type: "varchar", size: 30, null: false },
];

const updateColumnConfig = [
  ...prescriptionColumnConfig,
  { columnname: "updated_by", type: "varchar", size: 30, null: false },
];

/**
 * Validate Create Prescription Input with Tenant Scope
 */
const createPrescriptionValidation = async (details) => {
  validateInput(details, createColumnConfig);

  // Check if referenced records exist within the same tenant
  await Promise.all([
    checkIfIdExists("tenant", "tenant_id", details.tenant_id),
    checkIfIdExists("clinic", "clinic_id", details.clinic_id),
    checkIfIdExists("dentist", "dentist_id", details.dentist_id),
    checkIfIdExists("patient", "patient_id", details.patient_id),
    checkIfIdExists("treatment", "treatment_id", details.treatment_id),
  ]);
};

/**
 * Validate Update Prescription Input with Tenant Scope
 */
const updatePrescriptionValidation = async (prescriptionId, details) => {
  await validateInput(details, updateColumnConfig);

  const exists = await checkIfExists(
    "prescription",
    "prescription_id",
    details.prescription_id,
    details.tenant_id
  );
  if (!exists) {
    throw new CustomError("Prescription not found", 404);
  }
};

module.exports = {
  createPrescriptionValidation,
  updatePrescriptionValidation,
};
