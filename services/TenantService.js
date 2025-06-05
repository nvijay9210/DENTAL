const tenantModel = require("../models/TenantModel");
const { safeStringify, safeJsonParse } = require("../utils/Helpers");

const tenantFields = {
  tenant_name: (val) => val,
  tenant_domain: (val) => val,
  tenant_app_name: (val) => val,
  tenant_app_logo: (val) => val,
  tenant_app_font: (val) => val,
  tenant_app_themes: safeStringify,
};
const tenantFieldsReverseMap = {
  tenant_id:val=>val,
  tenant_name: (val) => val,
  tenant_domain: (val) => val,
  tenant_app_name: (val) => val,
  tenant_app_logo: (val) => val,
  tenant_app_font: (val) => val,
  tenant_app_themes: safeJsonParse,
};

// Create tenant service (calls the model function)
const createTenant = async (data) => {
  const create = {
    ...tenantFields,
    created_by: (val) => val,
  };
  try {
    const tenantId = await tenantModel.createTenant(create); // Call model function to insert tenant
    return tenantId;
  } catch (error) {
    throw new Error("Failed to create tenant: " + error.message);
  }
};

// Get all tenants service
const getTenants = async () => {
  try {
    const tenants = await tenantModel.getAllTenant(); // Call model function to get tenants
    return tenants;
  } catch (error) {
    throw new Error("Failed to get tenants: " + error.message);
  }
};

// Get tenant service
const getTenantByTenantId = async (tenantId) => {
  try {
    const tenants = await tenantModel.getTenantByTenantId(tenantId); // Call model function to get tenants
    return tenants;
  } catch (error) {
    throw new Error("Failed to get tenants: " + error.message);
  }
};

const getTenantByTenantNameAndTenantDomain = async (tenant_name,tenant_domain) => {
  try {
    const tenant = await tenantModel.getTenantByTenantNameAndTenantDomain(tenant_name,tenant_domain); // Call model function to get tenants
    return tenant;
  } catch (error) {
    throw new Error("Failed to get tenants: " + error.message);
  }
};

// Update tenant service
const updateTenant = async (tenantId, data) => {
  try {
    const update = {
      ...tenantFields,
      updated_by: (val) => val,
    };
    const affectedRows = await tenantModel.updateTenant(tenantId, update);
    if (affectedRows === 0) {
      throw new Error("Tenant not found or no changes made.");
    }
    return affectedRows;
  } catch (error) {
    throw new Error("Failed to update tenant: " + error.message);
  }
};

// Delete tenant service
const deleteTenant = async (tenantId) => {
  try {
    const affectedRows = await tenantModel.deleteTenant(tenantId);
    if (affectedRows === 0) {
      throw new Error("Tenant not found.");
    }
    return affectedRows;
  } catch (error) {
    throw new Error("Failed to delete tenant: " + error.message);
  }
};

module.exports = {
  createTenant,
  getTenants,
  getTenantByTenantId,
  updateTenant,
  deleteTenant,
  getTenantByTenantNameAndTenantDomain
};
