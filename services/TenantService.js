const tenantModel = require("../models/TenantModel");
const { mapFields } = require("../query/Records");
const { convertUTCToLocal } = require("../utils/DateUtils");
const { safeStringify, safeJsonParse } = require("../utils/Helpers");
const helper = require("../utils/Helpers");

const tenantFields = {
  tenant_name: (val) => val,
  tenant_domain: (val) => val,
  tenant_app_name: (val) => val,
  tenant_app_logo: (val) => val,
  tenant_app_font: (val) => val,
  tenant_app_themes: (val) => val
};
const tenantFieldsReverseMap = {
  tenant_id:val=>val,
  tenant_name: (val) => val,
  tenant_domain: (val) => val,
  tenant_app_name: (val) => val,
  tenant_app_logo: (val) => val,
  tenant_app_font: (val) => val,
  tenant_app_themes: (val) => val,
  created_by: (val) => val,
  created_time: (val) => val,
  updated_by: (val) => val,
  updated_time: (val) => convertUTCToLocal(val)
};

// Create tenant service (calls the model function)
const createTenant = async (data) => {
  const create = {
    ...tenantFields,
    created_by: (val) => val
  };
  
  try {
   const { columns, values } = mapFields(data, create);
       const tenantId = await tenantModel.createTenant(
         "tenant",
         columns,
         values
       );
       return tenantId
  } catch (error) {
    throw new Error("Failed to create tenant: " + error.message);
  }
};

// Get all tenants service
const getTenants = async () => {
  try {
    const tenants = await tenantModel.getAllTenant(); // Call model function to get tenants
    const convertedRows = tenants.map((tenant) =>
          helper.convertDbToFrontend(tenant, tenantFieldsReverseMap)
        );
    return convertedRows;
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
    return tenant[0];
  } catch (error) {
    throw new Error("Failed to get tenants: " + error.message);
  }
};

// Update tenant service
const updateTenant = async (tenantId, data) => {

  try {
    const update = {
      ...tenantFields,
      updated_by: (val) => val
    };
    const { columns, values } = mapFields(data, update);
    const affectedRows = await tenantModel.updateTenant(tenantId, columns,values);
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
