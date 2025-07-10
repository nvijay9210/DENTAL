const axios = require("axios");
const { CustomError } = require("./CustomeError");

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
    const existingUser = await getUserIdByUsername(token, realm, payload.username);
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

    const group = groupRes.data.find(g => g.name === groupName);
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


require('dotenv').config();

function getTenantIdByRealm(realm) {
  const mapString = process.env.REALM_TENANT_MAP || "";
  const map = Object.fromEntries(
    mapString.split(',').map(pair => {
      const [k, v] = pair.split(':');
      return [k.trim(), v.trim()];
    })
  );
  return map[realm] || realm;
}



function extractUserInfo(token) {
  const issuer = token.iss;
  const realm = issuer.split("/").pop();

  const tenantId = getTenantIdByRealm(realm);

  const groups = token.groups || [];
  const clinicGroup = groups.find(g => g.startsWith("dental-"));
  let clinicId = null;

  console.log(groups)

  if (clinicGroup) {
    const match = clinicGroup.match(/dental-(\d+)/);
    if (match && match[1]) {
      clinicId = match[1];
    }
  }

  const globalRoles = token.realm_access?.roles || [];
  console.log(globalRoles)

  const role = globalRoles.find(r =>
    ['super-user', 'dentist', 'patient', 'receptionist', 'supplier', 'dev', 'tenant'].includes(r)
  ) || "user";

  console.log(role,"is logged in")

  return {
    username: token.email,
    userId: token.sub,
    displayName: token.name,
    tenantId,
    clinicId,  
    role,
    preferred_username:token.preferred_username
  };
}


// ✅ 5. Reset User Password
async function resetUserPassword(token, realm, userId, newPassword, temporary = false) {
  const url = `${KEYCLOAK_BASE_URL}/admin/realms/${realm}/users/${userId}/reset-password`;

  try {
    const response = await axios.put(
      url,
      {
        type: "password",
        value: newPassword,
        temporary: temporary
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
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
  const url = `${KEYCLOAK_BASE_URL}/admin/realms/${realm}/groups`;

  const payload = {
    name: groupName,
    attributes
  };

  try {

    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });

    console.log(`✅ Group "${groupName}" created`);
    return true;
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



// ✅ Export all functions
module.exports = {
  addUser,
  getUserIdByUsername,
  assignRealmRoleToUser,
  addUserToGroup,
  extractUserInfo,
  resetUserPassword,
  createGroup
};