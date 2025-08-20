const axios = require("axios");
const CustomError = require("../middlewares/CustomeError");

// 🔹 Delete user from Keycloak (rollback)
const rollbackKeycloakUser = async (token, realm, userId) => {
  try {
    const url = `${process.env.KEYCLOAK_BASE_URL}/admin/realms/${realm}/users/${userId}`;

    const response = await axios.delete(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (response.status === 204) {
      console.log(`✅ Keycloak user ${userId} deleted (rollback)`);
      return true;
    } else {
      console.warn(`⚠️ Failed to rollback Keycloak user ${userId}, status: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.error("❌ Error during rollbackKeycloakUser:", error.response?.data || error.message);
    throw new CustomError("Failed to rollback Keycloak user", 500);
  }
};

module.exports = {
  rollbackKeycloakUser,
};
