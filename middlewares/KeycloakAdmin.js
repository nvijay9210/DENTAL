const axios = require("axios");
const { CustomError } = require("./CustomeError");

const KEYCLOAK_BASE_URL = "http://localhost:8080";

// ✅ 1. Create user
const addUser = async (token, realm, userData) => {
  const url = `${KEYCLOAK_BASE_URL}/admin/realms/${realm}/users`;

  const payload = {
    username: userData.username,
    email: userData.email,
    firstName: userData.firstName || "",
    lastName: userData.lastName || "",
    enabled: true,
    emailVerified: true,
    credentials: [
      {
        type: "password",
        value: userData.password,
        temporary: false,
      },
    ],
  };

  try {
    const existsUser = await getUserIdByUsername(token, realm, userData.username);
    if (existsUser) throw new CustomError("Username Already Exists", 409);
    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    console.log("✅ User created:", response.status);
    return true;
  } catch (error) {
    console.error(
      "❌ Error creating user:",
      error.response?.data || error.message
    );
    return false;
  }
};

// ✅ 2. Get user ID by username
const getUserIdByUsername = async (token, realm, username) => {
  console.log("getUserIdByUsername:", token, realm, username);
  const url = `${KEYCLOAK_BASE_URL}/admin/realms/${realm}/users?username=${username}`;

  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.data.length === 0) {
      console.error("❌ No user found with username:", username);
      return null;
    }

    return response.data[0].id; // Return the user ID
  } catch (error) {
    console.error(
      "❌ Failed to get user ID:",
      error.response?.data || error.message
    );
    return null;
  }
};

// ✅ 3. Assign realm-level role to user
const assignRealmRoleToUser = async (token, realm, userId, roleName) => {
  const roleUrl = `${KEYCLOAK_BASE_URL}/admin/realms/${realm}/roles/${roleName}`;
  const assignUrl = `${KEYCLOAK_BASE_URL}/admin/realms/${realm}/users/${userId}/role-mappings/realm`;

  try {
    // Step 1: Get role object
    const roleRes = await axios.get(roleUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const role = roleRes.data;

    // Step 2: Assign the role to the user
    await axios.post(assignUrl, [role], {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    console.log(`✅ Role '${roleName}' assigned to user ${userId}`);
    return true;
  } catch (error) {
    console.error(
      "❌ Failed to assign role:",
      error.response?.data || error.message
    );
    return false;
  }
};

module.exports = {
  addUser,
  getUserIdByUsername,
  assignRealmRoleToUser,
};
