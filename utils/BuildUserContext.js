// utils/buildUserContext.js
const { getTenantByTenantId } = require("../services/TenantService");
const { getClinicByTenantIdAndClinicId } = require("../services/ClinicService");
const { decodeToken, extractUserInfo } = require("../Keycloak/KeycloakAdmin");

/**
 * Builds full user context from access token
 * @param {string} accessToken - JWT access token from Keycloak
 * @returns {Promise<Object>} User context object for frontend
 */
async function buildUserContext(accessToken) {
  // 1. Decode token and extract basic info
  const decodedToken = decodeToken(accessToken);
  const userInfo = extractUserInfo(decodedToken);
  console.log(userInfo)

  // 2. Fetch tenant
  const tenant = await getTenantByTenantId(userInfo.tenantId);

  // 3. Fetch clinic (if applicable)
  let clinic = null;
  if (userInfo.role !== "tenant" && userInfo.clinicId) {
    clinic = await getClinicByTenantIdAndClinicId(
      userInfo.tenantId,
      userInfo.clinicId
    );
  }

  // 4. Build response
  const context = {
    tenant_name: tenant?.tenant_name,
    tenant_domain: tenant?.tenant_domain,
    tenant_app_logo: tenant?.tenant_app_logo || [],
    tenant_app_themes: tenant?.tenant_app_themes || null,
    tenant_app_font: tenant?.tenant_app_font || null,
    username: userInfo.preferred_username,
    keycloak_user_id: userInfo.userId,
    displayName: userInfo.displayName,
    tenant_id: userInfo.tenantId,
    clinic_id: userInfo.clinicId,
    role: userInfo.role,
    preferred_username: userInfo.preferred_username,
  };

  if (clinic) {
    context.clinic_name = clinic.clinic_name;
    context.clinic_app_themes = clinic.clinic_app_themes;
    context.clinic_app_font = clinic.clinic_app_font;
    context.clinic_logo = clinic.clinic_logo;
  }

  return context;
}

module.exports = { buildUserContext };