// utils/helper.js

function getJsonValue(field) {
  return field && field.length > 0 ? JSON.stringify(field) : null;
}

function toBooleanNumber(value) {
  return value ? 1 : 0;
}

function sameLengthChecker(arr1, arr2, errorMessage = "Arrays must be of the same length.") {
  if (!Array.isArray(arr1) || !Array.isArray(arr2) || arr1.length !== arr2.length) {
    throw new Error(errorMessage);
  }
  return true;
}

// -------------------- JSON SAFE PARSE --------------------

function safeJsonParse(value) {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value);
    return typeof parsed === "string" ? [parsed] : parsed;
  } catch (err) {
    return [value]; // Fallback: wrap bad string in array
  }
}

function decodeJsonFields(data, jsonFields) {
  if (!Array.isArray(data)) data = [data];

  return data.map(item => {
    jsonFields.forEach(field => {
      if (item[field] !== undefined && item[field] !== null) {
        let value = item[field];

        if (typeof value === 'object') return;

        try {
          item[field] = safeJsonParse(value);
        } catch {
          if (value === '[object Object]' || value.trim() === '') {
            item[field] = null;
          } else if (typeof value === 'string') {
            item[field] = value.trim() ? [value] : null;
          }
        }
      }
    });
    return item;
  });
}

function mapBooleanFields(item, fields) {
  fields.forEach(field => {
    if (item[field] !== undefined) {
      item[field] = Boolean(item[field]);
    }
  });
}

function buildUpdatedData(fields, updateObj, createObj) {
  const result = {};
  for (const field of fields) {
    result[field] = updateObj[field] ?? createObj[field] ?? null;
  }
  return result;
}

function safeStringify(val) {
  if (!val) return null;
  try {
    // if already a valid JSON string
    JSON.parse(val);
    return val;
  } catch {
    return JSON.stringify(val);
  }
}

function parseBoolean(val) {
  return val === true || val === "true" || val === 1 || val === "1" ? 1 : 0;
}

// Robust duration parser
function duration(val) {
  if (!val || typeof val !== 'string') return 0;

  const cleanVal = val.trim();
  const parts = cleanVal.split(':').map(Number);

  if (parts.length === 3) {
    const [hours, minutes, seconds] = parts;
    return (hours * 3600 + minutes * 60 + seconds) * 1000;
  }

  if (parts.length === 2) {
    const [minutes, seconds] = parts;
    return (minutes * 60 + seconds) * 1000;
  }

  const match = cleanVal.match(/^(\d+)([smhd])$/i);
  if (match) {
    const num = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();

    const unitToMs = {
      s: 1000,
      m: 60 * 1000,
      h: 3600 * 1000,
      d: 86400 * 1000,
    };

    return num * (unitToMs[unit] || 0);
  }

  return 0;
}

function convertDbToFrontend(row, reverseMap) {
  const result = {};
  for (const key in reverseMap) {
    const converter = reverseMap[key];
    result[key] = row.hasOwnProperty(key) ? converter(row[key]) : null;
  }
  return result;
}

async function getExistingAwardsIfNoneUploaded(req, dentistId, tenant_id) {
  if (!req.body.awards_certifications && !req.files?.some(f => f.fieldname.startsWith("awards_certifications"))) {
    const existingDentist = await dentistModel.getDentistByTenantIdAndDentistId(tenant_id, dentistId);
    if (existingDentist?.awards_certifications) {
      req.body.awards_certifications = JSON.parse(existingDentist.awards_certifications);
    }
  }
}

function unflattenAwards(data) {
  const awards = [];
  const processedIndexes = new Set();

  // Loop through all keys and find awards and descriptions
  Object.keys(data).forEach((key) => {
    const awardMatch = key.match(/^awards_certifications_(\d+)$/);
    const descMatch = key.match(/^description_awards_certifications_(\d+)$/);

    if (awardMatch || descMatch) {
      const index = awardMatch ? awardMatch[1] : descMatch[1];

      if (!processedIndexes.has(index)) {
        processedIndexes.add(index);

        const image = data[`awards_certifications_${index}`] || "";
        const description =
          data[`description_awards_certifications_${index}`] || "";

        awards.push({
          image,
          description,
        });

        // Optional: remove the flat keys from the object
        delete data[`awards_certifications_${index}`];
        delete data[`description_awards_certifications_${index}`];
      }
    }
  });

  // Only set if there are any awards
  if (awards.length > 0) {
    data.awards_certifications = awards;
  }

  return data;
}

// function generateUsername(firstname, mobileno) {
//   const namePart = firstname.slice(0, 4).toLowerCase(); // first 4 letters
//   const mobilePart = mobileno.slice(-4);                // last 4 digits
//   return namePart + mobilePart;
// }

// utils/usernameGenerator.js

const axios = require("axios");

// 🔹 Function to generate random username
function generatePatternUsername(tenant, roleShort) {
  const safeTenant = tenant.toLowerCase().replace(/[^a-z0-9]/g, "");
  const safeRole = roleShort.toLowerCase().replace(/[^a-z0-9]/g, "");
  const randomId = Math.floor(1000 + Math.random() * 9000); // 4-digit random
  return `${safeTenant}-${safeRole}-${randomId}`;
}

// 🔹 Function to check if username exists in Keycloak
async function checkUsernameExists(username, keycloakUrl, realm, token) {
  try {
    const response = await axios.get(
      `${keycloakUrl}/admin/realms/${realm}/users`,
      {
        params: { username },
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data.length > 0; // true if exists
  } catch (error) {
    console.error("Error checking username:", error.response?.data || error.message);
    throw error;
  }
}

// 🔹 Main function to generate unique username
async function generateUsername( roleShort, realm, token) {
  let username;
  let exists = true;
  const keycloakUrl=process.env.KEYCLOAK_BASE_URL
  const tenant=realm

  while (exists) {
    username = generatePatternUsername(tenant, roleShort);
    exists = await checkUsernameExists(username, keycloakUrl, realm, token);
  }

  return username;
}

// ✅ Example usage
// (async () => {
//   const keycloakUrl = "http://localhost:8080"; // your keycloak base URL
//   const realm = "myrealm"; // your realm
//   const token = "YOUR_ADMIN_ACCESS_TOKEN"; // get from Keycloak admin auth

//   const username = await generateUniqueUsername("smilecare", "pat", keycloakUrl, realm, token);
//   console.log("Generated unique username:", username);
// })();




function generateAlphanumericPassword(length = 6) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let pw = '';
  for (let i = 0; i < length; i++) {
    pw += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pw;
}


// -------------------- EXPORTS --------------------

module.exports = {
  getJsonValue,
  toBooleanNumber,
  decodeJsonFields,
  sameLengthChecker,
  safeJsonParse,
  mapBooleanFields,
  buildUpdatedData,
  safeStringify,
  parseBoolean,
  duration,
  convertDbToFrontend,
  getExistingAwardsIfNoneUploaded,
  unflattenAwards,
  generateUsername,
  generateAlphanumericPassword,
  generateUsername
};
