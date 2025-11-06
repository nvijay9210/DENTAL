const { CustomError } = require("../middlewares/CustomeError");
const { extractUserInfo } = require("../Keycloak/KeycloakAdmin");
const { getUserIdUsingKeycloakId } = require("../models/TenantModel");
const tenantService = require("../services/TenantService");
const tenantValidation = require("../validations/TenantValidation");
const {
  getClinicSettingsByTenantIdAndClinicId,
} = require("../services/ClinicService");
const { bulkInsert } = require("../Modules/BulkInsert");

exports.addTenant = async (req, res, next) => {
  try {
    const response = await bulkInsert(
      req.body,
      tenantValidation.createTenantValidation,
      tenantService.createTenant
    );
    res.status(201).json(response);
  } catch (err) {
    next(err);
  }
};

exports.getAllTenant = async (req, res, next) => {
  try {
    const tenants = await tenantService.getTenants();
    res.status(200).json(tenants);
  } catch (err) {
    next(err);
  }
};

exports.getTenantByTenantId = async (req, res, next) => {
  const { tenant_id } = req.params;
  try {
    await tenantValidation.checkTenantExistsByTenantIdValidation(tenant_id);
    const tenants = await tenantService.getTenantByTenantId(tenant_id);
    res.status(200).json(tenants);
  } catch (err) {
    next(err);
  }
};

exports.getTenantByTenantNameAndTenantDomain = async (req, res, next) => {
  const { tenant_name, tenant_domain } = req.params;
  let user;

  if (process.env.KEYCLOAK_POWER === "on") {
    user = extractUserInfo(req.user);

    if (
      user.role !== "tenant" &&
      user.role !== "guest"
    ) {
      const userdetails = await getUserIdUsingKeycloakId(
        user.role,
        user.userId,
        user.tenantId,
        user.clinicId
      );

      if (!userdetails) {
        throw new CustomError("User not found or inactive", 404);
      }

      user.keycloak_user_id = user.userId || null;
      user.userId = userdetails.userid || null;
      user.username = userdetails.username || null;
      user.profile_picture = userdetails.profile_picture || null;
    } else {
      const fullName = user.preferred_username;
      const firstName = (fullName?.split(" ") || [])[0] || "user";
      user.username = firstName;
    }

    if (user.userId === null) {
      throw new CustomError("User in inactive state", 404);
    }
  }

  try {
    let settings;

    if (
      process.env.KEYCLOAK_POWER === "on" &&
      user.role !== "tenant" &&
      user.role !== "guest"
    ) {
      settings = await getClinicSettingsByTenantIdAndClinicId(
        user.tenantId,
        user.clinicId
      );
    } else {
      if (!tenant_name || !tenant_domain) {
        throw new CustomError("Tenant name and domain are required", 400);
      }
      settings = await tenantService.getTenantByTenantNameAndTenantDomain(
        tenant_name,
        tenant_domain
      );
    }

    res.status(200).json({
      ...settings,
      ...user,
    });
  } catch (err) {
    next(err);
  }
};

exports.updateTenant = async (req, res, next) => {
  const tenantId = req.params.tenant_id;
  try {
    await tenantValidation.updateTenantValidation(tenantId, req.body);

    await tenantService.updateTenant(tenantId, req.body);
    res.status(200).json({ message: "Tenant updated successfully" });
  } catch (err) {
    next(err);
  }
};

exports.deleteTenant = async (req, res, next) => {
  const tenantId = req.params.tenant_id;
  try {
    await tenantValidation.checkTenantExistsByTenantIdValidation(tenantId);

    await tenantService.deleteTenant(tenantId);
    res.status(200).json({ message: "Tenant deleted successfully" });
  } catch (err) {
    next(err);
  }
};
