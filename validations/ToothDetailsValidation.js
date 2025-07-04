const { CustomError } = require("../middlewares/CustomeError");
const { validateInput } = require("./InputValidation");
const { checkIfIdExists, checkIfExists } = require("../models/checkIfExists");

const toothdetailsColumnConfig = [
  { columnname: "tenant_id", type: "int", size: 6, null: false },
  { columnname: "clinic_id", type: "int", size: 11, null: false },
  { columnname: "dentist_id", type: "int", size: 11, null: false },
  { columnname: "patient_id", type: "int", size: 11, null: false },
//   { columnname: "tooth_id", type: "tinyint", null: false },
  { columnname: "tooth_name", type: "varchar", size: 100, null: false },
  { columnname: "tooth_position", type: "varchar", size: 100, null: false },
  { columnname: "disease_name", type: "varchar", size: 100, null: false },
  { columnname: "disease_type", type: "varchar", size: 100, null: false },
  { columnname: "treatment_date", type: "date", null: false },
  { columnname: "description", type: "text", null: true }
];
// ToothDetails Column Configuration for Validation
const createColumnConfig = [
  ...toothdetailsColumnConfig,
  { columnname: "created_by", type: "varchar", size: 30, null: false },
];

const updateColumnConfig = [
  ...toothdetailsColumnConfig,
  { columnname: "updated_by", type: "varchar", size: 30, null: false },
];

/**
 * Validate Create ToothDetails Input with Tenant Scope
 */
const createToothDetailsValidation = async (details) => {
  validateInput(details, createColumnConfig);

  // Check if referenced records exist within the same tenant
  await Promise.all([
    checkIfIdExists("tenant", "tenant_id", details.tenant_id),
    checkIfExists("clinic", "clinic_id", details.clinic_id, details.tenant_id),
    checkIfExists("dentist", "dentist_id", details.dentist_id, details.tenant_id),
    checkIfExists("patient", "patient_id", details.patient_id, details.tenant_id),
  ]);
};

/**
 * Validate Update ToothDetails Input with Tenant Scope
 */
const updateToothDetailsValidation = async (toothdetailsId, details) => {
  console.log(details)
  validateInput(details, updateColumnConfig);

  const exists = await checkIfExists(
    "toothdetails",
    "toothdetails_id",
    toothdetailsId,
    details.tenant_id
  );
  if (!exists) {
    throw new CustomError("ToothDetails not found", 404);
  }
};

module.exports = {
  createToothDetailsValidation,
  updateToothDetailsValidation,
};
