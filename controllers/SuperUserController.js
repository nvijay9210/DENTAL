const { CustomError } = require("../middlewares/CustomeError");
const { checkIfExists } = require("../models/checkIfExists");
const { updateSuperuser } = require("../models/SuperUserModel");
const superuserService = require("../services/SuperUserService");
const {
  validateTenantIdAndPageAndLimit,
} = require("../validations/CommonValidations");
const superuserValidation = require("../validations/SuperUserValidation");

/**
 * Create a new superuser
 */
exports.createSuperUser = async (req, res, next) => {
  const details = req.body;
  const token = req.token;
  const realm = req.realm;

  try {
    // Validate superuser data
    await superuserValidation.createSuperUserValidation(details);

    // Create the superuser
    const id = await superuserService.createSuperUser(details, token, realm);
    res.status(201).json({ message: "SuperUser created", id });
  } catch (err) {
    next(err);
  }
};

/**
 * Get all superusers by tenant ID with pagination
 */
exports.getAllSuperUsersByTenantId = async (req, res, next) => {
  const { tenant_id } = req.params;
  const { page, limit } = req.query;
  // await validateTenantIdAndPageAndLimit(tenant_id, page, limit);
  try {
    const superusers = await superuserService.getAllSuperUsersByTenantId(
      tenant_id,
      page,
      limit,
    );
    res.status(200).json(superusers);
  } catch (err) {
    next(err);
  }
};

/**
 * Get superuser by tenant and superuser ID
 */
exports.getSuperUserByTenantIdAndSuperUserId = async (req, res, next) => {
  const { superuser_id, tenant_id } = req.params;

  try {
    const superuser1 = await checkIfExists(
      "superuser",
      "superuser_id",
      superuser_id,
      tenant_id,
    );

    if (!superuser1) throw new CustomError("SuperUser not found", 404);

    // Fetch superuser details
    const superuser =
      await superuserService.getSuperUserByTenantIdAndSuperUserId(
        tenant_id,
        superuser_id,
      );
    res.status(200).json(superuser);
  } catch (err) {
    next(err);
  }
};

/**
 * Update an existing superuser
 */
exports.updateSuperUser = async (req, res, next) => {
  const { superuser_id, tenant_id } = req.params;
  const details = req.body;
  const token = req.token;
  const realm = req.realm || process.env.KEYCLOAK_REALM;

  try {
    // Validate update input
    await superuserValidation.updateSuperUserValidation(superuser_id, details);
    // const superuserdata=await superuserService.getSuperUserByTenantIdAndSuperUserId(tenant_id,superuser_id);
    // console.log('superuserdata:',superuserdata)
    // Update the superuser
    await superuserService.updateSuperUser(superuser_id, details,tenant_id,token,realm);
    res.status(200).json({ message: "SuperUser updated successfully" });
  } catch (err) {
    console.log(err.message);
    next(err);
  }
};

// async function updateSuperuser(req, res) {
//   try {
//     const { superuser_id } = req.params;

//     const response = await superuserService.updateSuperuser(
//       superuser_id,
//       req.body
//     );

//     if (!response.success) {
//       return res.status(400).json(response);
//     }

//     return res.status(200).json(response);
//   } catch (error) {
//     return res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// }

/**
 * Delete a superuser by ID and tenant ID
 */
exports.deleteSuperUserByTenantIdAndSuperUserId = async (req, res, next) => {
  const { superuser_id, tenant_id } = req.params;
  const token = req.token;
  const realm = req.realm;
  try {
    // Validate if superuser exists
    const treatment = await checkIfExists(
      "superuser",
      "superuser_id",
      superuser_id,
      tenant_id,
    );
    if (!treatment) throw new CustomError("superuserId not Exists", 404);

    // Delete the superuser
    await superuserService.deleteSuperUserByTenantIdAndSuperUserId(
      tenant_id,
      superuser_id,
      token,
      realm,
    );
    res.status(200).json({ message: "SuperUser deleted successfully" });
  } catch (err) {
    next(err);
  }
};

exports.getAllSuperUsersByTenantIdAndClinicId = async (req, res, next) => {
  const { tenant_id, clinic_id } = req.params;
  const { page, limit } = req.query;
  await validateTenantIdAndPageAndLimit(tenant_id, page, limit);
  try {
    const superusers =
      await superuserService.getAllSuperUsersByTenantIdAndClinicId(
        tenant_id,
        clinic_id,
        page,
        limit,
      );
    res.status(200).json(superusers);
  } catch (err) {
    next(err);
  }
};
