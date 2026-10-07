const { verifyUserTokenInDB } = require("../Keycloak/AuthenticateTenantAndClient");
const { getDocumentsByField, deleteDocumentsByTableAndId } = require("../models/documentModel");
const tenantModel = require("../models/TenantModel");
const { mapFields } = require("../query/Records");
const { convertUTCToLocal } = require("../utils/DateUtils");
const { safeStringify, safeJsonParse } = require("../utils/Helpers");
const helper = require("../utils/Helpers");
const {
  saveDocuments,
  updateSingleDocument2,
} = require("../utils/UploadFiles");

const tenantFields = {
  tenant_name: (val) => val,
  tenant_domain: (val) => val,
  tenant_app_name: (val) => val,
  tenant_app_logo: (val) => val,
  tenant_app_font: (val) => val,
  tenant_app_themes: (val) => val,
};
const tenantFieldsReverseMap = {
  tenant_id: (val) => val,
  tenant_name: (val) => val,
  tenant_domain: (val) => val,
  tenant_app_name: (val) => val,
  tenant_app_logo: (val) => val,
  tenant_app_font: (val) => val,
  tenant_app_themes: (val) => val,
  created_by: (val) => val,
  created_time: (val) => val,
  updated_by: (val) => val,
  updated_time: (val) => convertUTCToLocal(val),
};

// Create tenant service (calls the model function)
const createTenant = async (data) => {
  const create = {
    ...tenantFields,
    created_by: (val) => val,
  };

  try {
    const { columns, values } = mapFields(data, create);
    const tenantId = await tenantModel.createTenant("tenant", columns, values);

    if (data?.tenant_app_logo) {
      await saveDocuments({
        table_name: "tenant",
        table_id: tenantId,
        field_name: "tenant_app_logo",
        files: data?.tenant_app_logo, // from middleware
        created_by: data.created_by,
      });
    }
    return tenantId;
  } catch (error) {
    throw new Error("Failed to create tenant: " + error.message);
  }
};

// Get all tenants service
const getTenants = async () => {
  try {
    const tenants = await tenantModel.getAllTenant(); // Call model function to get tenants
    const convertedRows = await Promise.all(
      tenants.data.map(async (tenant) => {
        // Step 1: Convert DB fields to frontend fields
        const formatted = helper.convertDbToFrontend(
          tenant,
          tenantFieldsReverseMap
        );

        // Step 2: Fetch tenant documents
        const docs = await getDocumentsByField(
          "tenant", // table name
          tenant.tenant_id, // tenant's primary key
          "tenant_app_logo" // document field type
        );

        // Step 3: Extract only required fields from docs
        const fileInfos = docs.map((doc) => ({
          document_id: doc.document_id,
          file_url: doc.file_url,
        }));

        // Step 4: Return tenant data with documents
        return {
          ...formatted,
          tenant_app_logo: fileInfos,
        };
      })
    );
    return convertedRows;
  } catch (error) {
    throw new Error("Failed to get tenants: " + error.message);
  }
};

// Get tenant service
const getTenantByTenantId = async (tenantId) => {
  console.log(tenantId)
  try {
    const tenant = await tenantModel.getTenantByTenantId(tenantId); // Call model function to get tenants
    const convertedRows = helper.convertDbToFrontend(
      tenant,
      tenantFieldsReverseMap
    );

    console.log(convertedRows)

    const documents = await getDocumentsByField(
      "tenant",
      tenantId,
      "tenant_app_logo"
    );

    // Format each document
    const tenant_app_logo = documents.map((doc) => ({
      document_id: doc.document_id,
      file_url: doc.file_url,
    }));

    // Attach to the response
    return {
      ...convertedRows,
      tenant_app_logo,
    };
  } catch (error) {
    throw new Error("Failed to get tenants: " + error.message);
  }
};

const getTenantByTenantNameAndTenantDomain = async (
  tenant_name,
  tenant_domain
) => {
  try {
    const tenant = await tenantModel.getTenantByTenantNameAndTenantDomain(
      tenant_name,
      tenant_domain
    ); // Call model function to get tenants
    const convertedRows = helper.convertDbToFrontend(
      tenant,
      tenantFieldsReverseMap
    );

    const documents = await getDocumentsByField(
      "tenant",
      tenant.tenant_id,
      "tenant_app_logo"
    );

    // Format each document
    const tenant_app_logo = documents.map((doc) => ({
      document_id: doc.document_id,
      file_url: doc.file_url,
    }));



    // Attach to the response
    return {
      ...convertedRows,
      tenant_app_logo
    };
  } catch (error) {
    console.error(error)
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
    const { columns, values } = mapFields(data, update);
    const affectedRows = await tenantModel.updateTenant(
      tenantId,
      columns,
      values
    );
    await updateSingleDocument2({
      table_name: "tenant",
      table_id: tenantId,
      field_name: "tenant_app_logo",
      newFile: data?.tenant_app_logo,
      deleteOld: true,
      created_by: data.created_by,
      updated_by: data.updated_by,
    });
    return affectedRows;
  } catch (error) {
    throw new Error("Failed to update tenant: " + error.message);
  }
};

// Delete tenant service
const deleteTenant = async (tenantId) => {
  try {
    await deleteDocumentsByTableAndId('tenant',tenantId)
    const affectedRows = await tenantModel.deleteTenant(tenantId);
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
  getTenantByTenantNameAndTenantDomain,
};
