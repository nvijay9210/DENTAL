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

const KEYCLOAK_BASE_URL = process.env.KEYCLOAK_BASE_URL;
const REALM = process.env.KEYCLOAK_REALM;

const ADMIN = {
  username: "admin",
  password: "admin",
  client_id: "admin-cli"
};

const CLIENT = {
  client_id: "my-client",
  client_secret: "CLIENT_SECRET"
};

// 🔐 Get Admin Token
async function getAdminToken() {
  const res = await axios.post(
    `${KEYCLOAK_BASE_URL}/realms/master/protocol/openid-connect/token`,
    new URLSearchParams({
      username: ADMIN.username,
      password: ADMIN.password,
      grant_type: "password",
      client_id: ADMIN.client_id
    }),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );

  return res.data.access_token;
}

// 👤 Create User
async function createUser(token, user) {
  await axios.post(
    `${KEYCLOAK_BASE_URL}/admin/realms/${REALM}/users`,
    {
      username: user.phone_number,
      email: user.email,
      enabled: true
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );
}

// 🔎 Get User ID
async function getUserId(token, username) {
  const res = await axios.get(
    `${KEYCLOAK_BASE_URL}/admin/realms/${REALM}/users?username=${username}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  return res.data[0]?.id;
}

// 🔑 Set Password
async function setPassword(token, userId, password) {
  await axios.put(
    `${KEYCLOAK_BASE_URL}/admin/realms/${REALM}/users/${userId}/reset-password`,
    {
      type: "password",
      value: password,
      temporary: false
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );
}

// 🏷️ Assign Role (patient)
async function assignPatientRole(token, userId) {
  // Get role
  const roleRes = await axios.get(
    `${KEYCLOAK_BASE_URL}/admin/realms/${REALM}/roles/patient`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  const role = roleRes.data;

  // Assign role
  await axios.post(
    `${KEYCLOAK_BASE_URL}/admin/realms/${REALM}/users/${userId}/role-mappings/realm`,
    [role],
    { headers: { Authorization: `Bearer ${token}` } }
  );
}

module.exports = {
  rollbackKeycloakUser,getAdminToken,
  createUser,
  getUserId,
  setPassword,
  assignPatientRole
};
