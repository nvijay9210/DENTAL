// utils/codeGenerator.js
const tenantCodes = {
  "apollo": process.env.APOLLO || "APO",
  "mydentist.in": process.env.MYDENTIST || "MYD",
};

// Define module codes
const moduleCodes = {
  superuser: "SUP",
  dentist: "DEN",
  patient: "PAT",
  reception: "REC",
  supplier: "SPL",
};

/**
 * Generate unique code for entities
 * @param {string} tenant - tenant name (e.g., "apollo", "mydentist")
 * @param {string} module - module name (dentist, patient, reception, supplier)
 * @param {number} seq - sequence number from DB
 * @returns {string} - generated code like APODEN1
 */
function generateCode(tenant, module, seq) {
  const tenantCode = tenantCodes[tenant];
  const moduleCode = moduleCodes[module];

  console.log(tenant, module, seq, tenantCode, moduleCode);

  if (!tenantCode) throw new Error("Invalid tenant name");
  if (!moduleCode) throw new Error("Invalid module name");

  return `${tenantCode}${moduleCode}${seq}`;
}

module.exports = { generateCode };
