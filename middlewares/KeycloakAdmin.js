const axios = require("axios");
const { CustomError } = require("./CustomeError");

const KEYCLOAK_BASE_URL = "http://localhost:8080";

// ✅ 1. Add User
async function addUser(token, realm, userData) {
  const url = `${KEYCLOAK_BASE_URL}/admin/realms/${realm}/users`;

  const payload = {
    username: userData.username,
    email: userData.email || `${userData.username}@gmail.com`,
    firstName: userData.firstName || "",
    lastName: userData.lastName || "",
    enabled: true,
    emailVerified: false,
    credentials: [
      {
        type: "password",
        value: userData.password || "defaultPassword123",
        temporary: false,
      },
    ],
  };

  try {
    const existingUser = await getUserIdByUsername(token, realm, payload.username);
    if (existingUser) throw new CustomError("Username already exists", 409);

    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    console.log("✅ User created:", payload.username);
    return true;
  } catch (error) {
    console.error(
      "❌ Error creating user:",
      error.response?.data || error.message
    );
    return false;
  }
}

// ✅ 2. Get User ID by Username
async function getUserIdByUsername(token, realm, username) {
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

    return response.data[0].id;
  } catch (error) {
    console.error(
      "❌ Failed to get user ID:",
      error.response?.data || error.message
    );
    return null;
  }
}

// ✅ 3. Assign Realm Role to User
async function assignRealmRoleToUser(token, realm, userId, roleName) {
  const roleUrl = `${KEYCLOAK_BASE_URL}/admin/realms/${realm}/roles/${roleName}`;
  const assignUrl = `${KEYCLOAK_BASE_URL}/admin/realms/${realm}/users/${userId}/role-mappings/realm`;

  try {
    const roleRes = await axios.get(roleUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const role = roleRes.data;

    await axios.post(assignUrl, [role], {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    console.log(`✅ Assigned role "${roleName}" to user ${userId}`);
    return true;
  } catch (error) {
    console.error(
      `❌ Failed to assign role "${roleName}":`,
      error.response?.data || error.message
    );
    return false;
  }
}

// ✅ 4. Add User to Group
async function addUserToGroup(token, realm, userId, groupName) {
  const groupUrl = `${KEYCLOAK_BASE_URL}/admin/realms/${realm}/groups-by-path?path=/${groupName}`;
  const addUrl = `${KEYCLOAK_BASE_URL}/admin/realms/${realm}/users/${userId}/groups`;

  try {
    // Get the group by name
    const groupRes = await axios.get(groupUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const groupId = groupRes.data.id;

    // Add user to group
    await axios.put(`${addUrl}/${groupId}`, null, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    console.log(`👥 Added user ${userId} to group "${groupName}"`);
    return true;
  } catch (error) {
    console.error(
      `❌ Failed to add user to group "${groupName}":`,
      error.response?.data || error.message
    );
    return false;
  }
}

// ✅ Export all functions
module.exports = {
  addUser,
  getUserIdByUsername,
  assignRealmRoleToUser,
  addUserToGroup,
};