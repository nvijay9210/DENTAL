const { CustomError } = require("../middlewares/CustomeError");
const { checkIfExists } = require("../models/checkIfExists");
const referenceService = require("../services/ReferenceService");
const { isValidDate } = require("../utils/DateUtils");
const referenceValidation = require("../validations/ReferenceValidation");
const {
  validateTenantIdAndPageAndLimit,
} = require("../validations/CommonValidations");

/**
 * Create a new reference
 */
exports.createReference = async (req, res, next) => {
  const details = req.body;

  try {
    // Validate reference data
    await referenceValidation.createReferenceValidation(details);

    // Create the reference
    const id = await referenceService.createReference(details);
    res.status(201).json({ message: "Reference created", id });
  } catch (err) {
    next(err);
  }
};

/**
 * Get all references by tenant ID with pagination
 */
// exports.getAllReferencesByTenantId = async (req, res, next) => {
//   const { tenant_id } = req.params;
//   const { page, limit } = req.query;
//   try {
//     await validateTenantIdAndPageAndLimit(tenant_id, page, limit);
//     const references =
//       await referenceService.getAllReferencesByTenantId(
//         tenant_id,
//         page,
//         limit
//       );
//     res.status(200).json(references);
//   } catch (err) {
//     next(err);
//   }
// };

// exports.getAllReferenceByTenantAndClinicAndDentistAndPatientId = async (
//   req,
//   res,
//   next
// ) => {
//   const { tenant_id, clinic_id, dentist_id, patient_id } = req.params;
//   const { page, limit } = req.query;
//   try {
//     await validateTenantIdAndPageAndLimit(
//       tenant_id,
//       page,
//       limit
//     );
//     const references =
//       await referenceService.getAllReferenceByTenantAndClinicAndDentistAndPatientId(
//         tenant_id,
//         clinic_id,
//         dentist_id,
//         patient_id,
//         page,
//         limit
//       );
//     res.status(200).json(references);
//   } catch (err) {
//     next(err);
//   }
// };

// exports.getAllReferenceByTenantAndClinicAndPatientId = async (
//   req,
//   res,
//   next
// ) => {
//   const { tenant_id, clinic_id, patient_id } = req.params;
//   const { page, limit } = req.query;
//   try {
//     await validateTenantIdAndPageAndLimit(
//       tenant_id,
//       page,
//       limit
//     );
//     const references =
//       await referenceService.getAllReferenceByTenantAndClinicAndPatientId(
//         tenant_id,
//         clinic_id,
//         patient_id,
//         page,
//         limit
//       );
//     res.status(200).json(references);
//   } catch (err) {
//     next(err);
//   }
// };

// /**
//  * Get reference by tenant and reference ID
//  */
// exports.getReferenceByTenantIdAndReferenceId = async (req, res, next) => {
//   const { reference_id, tenant_id } = req.params;

//   try {
//     const reference1 = await checkIfExists(
//       "reference",
//       "reference_id",
//       reference_id,
//       tenant_id
//     );
//     if (!reference1) throw new CustomError("Reference not found", 404);

//     // Fetch reference details
//     const reference =
//       await referenceService.getReferenceByTenantIdAndReferenceId(
//         tenant_id,
//         reference_id
//       );
//     res.status(200).json(reference);
//   } catch (err) {
//     next(err);
//   }
// };

// /**
//  * Update an existing reference
//  */
// exports.updateReference = async (req, res, next) => {
//   const { reference_id, tenant_id } = req.params;
//   const details = req.body;

//   try {
//     // Validate update input
//     await referenceValidation.updateReferenceValidation(
//       reference_id,
//       details
//     );

//     // Update the reference
//     await referenceService.updateReference(
//       reference_id,
//       details,
//       tenant_id
//     );
//     res.status(200).json({ message: "Reference updated successfully" });
//   } catch (err) {
//     next(err);
//   }
// };

// /**
//  * Delete a reference by ID and tenant ID
//  */
// exports.deleteReferenceByTenantIdAndReferenceId = async (
//   req,
//   res,
//   next
// ) => {
//   const { reference_id, tenant_id } = req.params;

//   try {
//     // Validate if reference exists
//     const reference1 = await checkIfExists(
//       "reference",
//       "reference_id",
//       reference_id,
//       tenant_id
//     );
//     if (!reference1) throw new CustomError("Reference not found", 404);

//     // Delete the reference
//     await referenceService.deleteReferenceByTenantIdAndReferenceId(
//       tenant_id,
//       reference_id
//     );
//     res.status(200).json({ message: "Reference deleted successfully" });
//   } catch (err) {
//     next(err);
//   }
// };
