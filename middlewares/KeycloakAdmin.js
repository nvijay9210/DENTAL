const axios = require("axios");
const { CustomError } = require("./CustomeError");
const { updateDocumentsDiffBased } = require("../utils/UploadFiles");
const pool = require("../config/db");

const KEYCLOAK_BASE_URL = process.env.KEYCLOAK_BASE_URL;

// ✅ 1. Add User
async function addUser(token, realm, userData) {
  const url = `${KEYCLOAK_BASE_URL}/admin/realms/${realm}/users`;

  const payload = {
    username: userData.username,
    email: userData.email || `${userData.username}@gmail.com`,
    firstName: userData.firstName || "",
    lastName: userData.lastName || "",
    enabled: true,
    emailVerified: true,
    credentials: [
      {
        type: "password",
        value: userData.password || "defaultPassword123",
        temporary: false,
      },
    ],
  };

  try {
    const existingUser = await getUserIdByUsername(
      token,
      realm,
      payload.username
    );
    if (existingUser) throw new CustomError("Username already exists", 409);

    // console.log("user start to add",token,payload)

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
  const searchUrl = `${KEYCLOAK_BASE_URL}/admin/realms/${realm}/groups?search=${groupName}`;
  const addUrl = `${KEYCLOAK_BASE_URL}/admin/realms/${realm}/users/${userId}/groups`;

  try {
    // Search for group by name
    const groupRes = await axios.get(searchUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const group = groupRes.data.find((g) => g.name === groupName);
    if (!group) {
      console.error(`❌ Group "${groupName}" not found in search results`);
      return false;
    }

    // Add user to group
    await axios.put(`${addUrl}/${group.id}`, null, {
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

require("dotenv").config();

function getTenantIdByRealm(fullRealm) {
  const mapString = process.env.REALM_TENANT_MAP || "";
  const domainMapString = process.env.REALM_TENANT_DOMAIN_MAP || "";

  const realmMap = Object.fromEntries(
    mapString.split(",").map((pair) => {
      const [k, v] = pair.split(":");
      return [k.trim(), v.trim()];
    })
  );

  const domainMap = Object.fromEntries(
    domainMapString.split(",").map((pair) => {
      const [k, v] = pair.split(":");
      return [k.trim(), v.trim()];
    })
  );

  const parts = fullRealm.split(".");
  const realmName = parts[0]; // e.g., 'mydentist'
  const domain = "." + parts.slice(1).join("."); // e.g., '.in'

  const realmTenantId = realmMap[realmName];
  const domainTenantId = domainMap[domain];

  if (realmTenantId && domainTenantId && realmTenantId === domainTenantId) {
    return realmTenantId;  // Both match exactly
  }

  return null; // Mismatch or not found
};


function extractUserInfo(token) {
  const issuer = token.iss;
  const realm = issuer.split("/").pop();
  const tenant=token.azp

  const tenantId = getTenantIdByRealm(tenant);

  const groups = token.groups || [];
  const clinicGroup = groups.find((g) => g.startsWith("dental-"));
  let clinicId = null;

  if (clinicGroup) {
    const match = clinicGroup.match(/dental-(\d+)-(\d+)/);
    if (match && match[2]) {
      clinicId = match[2];
    }
  }

  const globalRoles = token.realm_access?.roles || [];

  const ROLE_PRIORITY = [
    "superuser",
    "dentist",
    "patient",
    "receptionist",
    "supplier",
    "dev",
    "tenant",
  ];

  const role = ROLE_PRIORITY.find((r) => globalRoles.includes(r)) || "guest";

  console.log(role, "is logged in");

  return {
    username: token.email,
    userId: token.sub,
    displayName: token.name,
    tenantId,
    clinicId,
    role,
    preferred_username: token.preferred_username,
  };
}


// ✅ 5. Reset User Password
async function resetUserPassword(
  token,
  realm,
  userId,
  newPassword,
  temporary = false
) {
  const url = `${KEYCLOAK_BASE_URL}/admin/realms/${realm}/users/${userId}/reset-password`;

  try {
    const response = await axios.put(
      url,
      {
        type: "password",
        value: newPassword,
        temporary: temporary,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log(`✅ Password reset for user ${userId}`);
    return true;
  } catch (error) {
    console.error(
      "❌ Failed to reset password:",
      error.response?.data || error.message
    );
    return false;
  }
}

// ✅ 6. Create Group in Realm
async function createGroup(token, realm, groupName, attributes = {}) {
  const endpoint = `${KEYCLOAK_BASE_URL}/admin/realms/${realm}/groups`;

  const payload = {
    name: groupName,
    attributes,
  };

  try {
    const response = await axios.post(endpoint, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    console.log(`✅ Group "${groupName}" created`);

    // Extract groupId from Location header
    const location = response.headers.location;
    if (!location) {
      throw new Error("Location header missing in response");
    }

    const url = new URL(location);
    const pathParts = url.pathname.split('/');
    const groupId = pathParts[pathParts.length - 1];

    console.log(`✅ Group ID: ${groupId}`);
    return { groupId };
  } catch (error) {
    if (error.response?.status === 409) {
      console.warn(`⚠️ Group "${groupName}" already exists`);
      return false;
    }

    console.error(
      `❌ Failed to create group "${groupName}":`,
      error.response?.data || error.message
    );
    return false;
  }
}

// ✅ 7. Delete User by Username
async function deleteUserByUsername(token, realm, username) {
  try {
    // Get user ID from username
    const userId = await getUserIdByUsername(token, realm, username);

    if (!userId) {
      console.error(`❌ Cannot delete user: username "${username}" not found`);
      return false;
    }

    const url = `${KEYCLOAK_BASE_URL}/admin/realms/${realm}/users/${userId}`;

    await axios.delete(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    console.log(`🗑️ User deleted: ${username} (ID: ${userId})`);
    return true;
  } catch (error) {
    console.error(
      `❌ Failed to delete user "${username}":`,
      error.response?.data || error.message
    );
    return false;
  }
}

/**
 * Delete a Keycloak user by user ID
 * @param {string} token - Admin bearer token
 * @param {string} realm - Keycloak realm
 * @param {string} userId - User ID in Keycloak
 * @returns {Promise<boolean>} - true if deleted, false if not found or already deleted
 */
const deleteUser = async (token, realm, userId) => {
  // Input validation
  if (!token) throw new CustomError("Authorization token is required", 400);
  if (!realm) throw new CustomError("Realm is required", 400);
  if (!userId) throw new CustomError("User ID is required", 400);

  const url = `${process.env.KEYCLOAK_BASE_URL}/admin/realms/${realm}/users/${userId}`;

  try {
    const response = await axios.delete(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (response.status === 204) {
      console.log(`🗑️ User deleted: ID=${userId}`);
      return true;
    } else {
      console.warn(`⚠️ Unexpected status code: ${response.status}`);
      return false;
    }
  } catch (error) {
    // Handle specific HTTP errors
    if (error.response) {
      const { status, data } = error.response;

      if (status === 404) {
        console.warn(
          `⚠️ User not found (ID: ${userId}) - may already be deleted`
        );
        return false;
      }

      if (status === 403) {
        console.error(
          "❌ Permission denied: Check admin token has 'manage-users' role"
        );
        throw new CustomError("Insufficient permissions to delete user", 403);
      }

      console.error(`❌ Keycloak error [${status}]:`, data);
    } else {
      console.error("❌ Network or internal error:", error.message);
    }

    throw new CustomError("Failed to delete user from Keycloak", 500);
  }
};

const updateUserInKeycloak = async (token, realm, userId, userData) => {
  const url = `${process.env.KEYCLOAK_BASE_URL}/admin/realms/${realm}/users/${userId}`;

  try {
    const response = await axios.put(
      url,
      {
        ...userData,
        // Important: preserve existing attributes you don't want to clear
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (response.status === 204 || response.status === 200) {
      return true;
    }
    return false;
  } catch (error) {
    if (error.response) {
      throw new Error(
        `HTTP ${error.response.status}: ${JSON.stringify(error.response.data)}`
      );
    }
    throw error;
  }
};

const updateGroupAttributes = async (token, realm, groupId, attributes) => {
  const url = `${process.env.KEYCLOAK_BASE_URL}/admin/realms/${realm}/groups/${groupId}`;
  await axios.put(
    url,
    { attributes },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );
};

const deleteKeycloakGroup = async (token, realm, groupId) => {
  const url = `${process.env.KEYCLOAK_BASE_URL}/admin/realms/${realm}/groups/${groupId}`;
  const response = await axios.delete(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.status === 204;
};

const getGroupIdByName = async (token, realm, groupName) => {
  const url = `${process.env.KEYCLOAK_BASE_URL}/admin/realms/${realm}/groups`;
  const response = await axios.get(url, {
    params: { search: groupName },
    headers: { Authorization: `Bearer ${token}` },
  });

  const group = response.data.find((g) => g.name === groupName);
  return group?.id || null;
};


async function getKeycloakUserIdByEmail(token, realm, email) {
  const url = `${process.env.KEYCLOAK_BASE_URL}/admin/realms/${realm}/users`;
  
  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params: {
        email: email,
        exact: true,  // Ensure exact match
      },
    });

    const users = response.data;

    if (users.length === 0) {
      return null;  // No user found
    }

    return {id:users[0].id,username:users[0].username};  // Return first matching user ID
  } catch (error) {
    console.error('Error fetching Keycloak user by email:', error.response?.data || error.message);
    throw new Error('Failed to fetch Keycloak user ID');
  }
}


async function getUserGroups(token, realm, userId) {
  const url = `${process.env.KEYCLOAK_BASE_URL}/admin/realms/${realm}/users/${userId}/groups`;

  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    // Returns an array of groups (each group has `id`, `name`, `path`, etc.)
    return response.data;
  } catch (error) {
    console.error(
      `❌ Error fetching groups for user ${userId}:`,
      error.response?.data || error.message
    );
    throw new Error('Failed to fetch Keycloak user groups');
  }
}






//For Frontend new User created by old user and delete a old user

//get UserId
// GET {KEYCLOAK_BASE_URL}/admin/realms/{realm}/users?username={username}
// Authorization: Bearer {access_token}

//delete userId
// DELETE {KEYCLOAK_BASE_URL}/admin/realms/{realm}/users/{userId}
// Authorization: Bearer {access_token}

// ✅ Export all functions
module.exports = {
  addUser,
  getUserIdByUsername,
  assignRealmRoleToUser,
  addUserToGroup,
  extractUserInfo,
  resetUserPassword,
  createGroup,
  deleteUserByUsername,
  deleteUser,
  updateUserInKeycloak,
  updateGroupAttributes,
  deleteKeycloakGroup,
  getGroupIdByName,
  getKeycloakUserIdByEmail,
  getUserGroups
};
