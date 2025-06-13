// keycloak-admin.js

const axios = require("axios");

const KEYCLOAK_BASE_URL = "http://localhost:8080/auth";
const REALM = "myrealm";
const CLIENT_ID = "admin-cli";
const ADMIN_USER = "admin";
const ADMIN_PASSWORD = "admin";

async function getAdminToken() {
  try {
    const response = await axios.post(
      `${KEYCLOAK_BASE_URL}/realms/${REALM}/protocol/openid-connect/token`,
      new URLSearchParams({
        username: ADMIN_USER,
        password: ADMIN_PASSWORD,
        grant_type: "password",
        client_id: CLIENT_ID,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    return response.data.access_token;
  } catch (error) {
    throw new Error(`Failed to fetch admin token: ${error.message}`);
  }
}

async function addUser(token,realm, userData) {
  try {
    const response = await axios.post(
      `${process.env.KEYCLOAK_BASE_URL}/admin/realms/${realm}/users`,
      {
        username: userData.username,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        enabled: true,
        credentials: [
          {
            type: "password",
            value: userData.password,
            temporary: false,
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✅ User created:", userData.username);
    return userData.username;
  } catch (error) {
    console.error("❌ Error creating user:", error.response?.data || error.message);
    return null;
  }
}

async function assignRoleToUser(token,realm, username, roleName, clientId) {
  try {
    const usersResponse = await axios.get(
      `${KEYCLOAK_BASE_URL}/admin/realms/${realm}/users?username=${username}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!usersResponse.data.length) {
      throw new Error(`User "${username}" not found`);
    }

    const userId = usersResponse.data[0].id;

    const rolesResponse = await axios.get(
      `${KEYCLOAK_BASE_URL}/admin/realms/${realm}/clients/${clientId}/roles`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const role = rolesResponse.data.find(r => r.name === roleName);
    if (!role) {
      throw new Error(`Role "${roleName}" not found for client "${clientId}"`);
    }

    await axios.post(
      `${KEYCLOAK_BASE_URL}/admin/realms/${realm}/users/${userId}/role-mappings/clients/${clientId}`,
      [role],
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log(`✅ Role "${roleName}" assigned to user "${username}"`);
  } catch (error) {
    console.error("❌ Error assigning role:", error.response?.data || error.message);
  }
}

module.exports = {
  addUser,
  assignRoleToUser,
  getAdminToken,
};