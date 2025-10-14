// config/otpConfig.js
const otpSettings = JSON.parse(process.env.OTP_SETTINGS || "{}");

function getOtpConfigForTenant(tenantDomain) {
  return otpSettings[tenantDomain] || { otpRequired: false };
}

module.exports = { getOtpConfigForTenant };
