const { CustomError } = require("../middlewares/CustomeError");
const { getPhonenumberAndAlternateNumberBytenantIdAndTableId } = require("../models/checkIfExists");
const {
  checkGlobalPhoneNumberExists,
} = require("./GolbalValidationPhone");

/**
 * Validates phone number changes globally only if changed
 */
const validatePhonesGlobally = async (data, entityId = 0, entityType, tenantId) => {
  const phone = data.phone_number?.toString().trim();
  const altPhone = data.alternate_phone_number?.toString().trim();

  // Validate required fields
  if (!phone) {
    throw new CustomError("Phone number is required", 400);
  }
  if (!tenantId) {
    throw new CustomError("Tenant ID is required", 400);
  }

  // Validate entityType
  const validEntityTypes = ["clinic", "dentist", "patient"];
  if (!validEntityTypes.includes(entityType)) {
    throw new CustomError("Invalid entity type", 400);
  }

  if (!entityId) {
    // CREATE: Validate globally
    await checkGlobalPhoneNumberExists(phone, tenantId);
    if (altPhone) {
      await checkGlobalPhoneNumberExists(altPhone, tenantId);
    }
    return;
  }

  // UPDATE: Get existing phone numbers
  const {
    phone_number: oldPhone,
    alternate_phone_number: oldAltPhone,
  } = await getPhonenumberAndAlternateNumberBytenantIdAndTableId(
    entityType,
    tenantId,
    entityId
  );

  // Check if phone or alternate phone changed
  const phoneChanged = phone !== oldPhone;
  const altPhoneChanged = altPhone && altPhone !== oldAltPhone;

  // Only validate globally if changed
  if (phoneChanged) {
    await checkGlobalPhoneNumberExists(phone, tenantId);
  }

  if (altPhoneChanged) {
    await checkGlobalPhoneNumberExists(altPhone, tenantId);
  }
};

module.exports = {
  validatePhonesGlobally
};