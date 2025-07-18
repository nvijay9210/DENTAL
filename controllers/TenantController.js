const { CustomError } = require("../middlewares/CustomeError");
const { extractUserInfo } = require("../middlewares/KeycloakAdmin");
const { getUserIdUsingKeycloakId } = require("../models/TenantModel");
const tenantService = require("../services/TenantService");
const tenantValidation = require("../validations/TenantValidation");
const {
  getClinicSettingsByTenantIdAndClinicId,
} = require("../services/ClinicService");

exports.addTenant = async (req, res, next) => {
  try {
    await tenantValidation.createTenantValidation(req.body);
    // Create a new tenant
    const id = await tenantService.createTenant(req.body);
    res.status(201).json({ message: "Tenant created", id });
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

    console.log(user)

    if (user.role !== "tenant" && user.role !== "super-user") {
      const userdetails = await getUserIdUsingKeycloakId(
        user.role,
        user.userId,
        user.tenantId,
        user.clinicId
      );
      user.userId = userdetails[0]?.userid || null;
      user.username = userdetails[0]?.username || null;
    } else {
      console.log(user);
      const fullName = user.preferred_username;
      const firstName = (fullName?.split(" ") || [])[0] || "user";
      user["user_name"] = firstName;
    }

    if (user.userId === null)
      throw new CustomError("User in inactive state", 404);

    console.log("role:",user)
  }

  try {
    let settings;
    if (process.env.KEYCLOAK_POWER === "on" && user.role !== "tenant") {
      settings = await getClinicSettingsByTenantIdAndClinicId(
        user.tenantId,
        user.clinicId
      );
      // console.log("settings:",settings)
    } else {
      if (!tenant_name || !tenant_domain)
        throw new CustomError("Tenantname and domain is requried", 400);
      settings = await tenantService.getTenantByTenantNameAndTenantDomain(
        tenant_name,
        tenant_domain
      );
    }
    res.status(200).json({
      ...settings,
      ...user,
    });
    // res.status(200).json(settings);
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
