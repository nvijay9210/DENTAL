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
  convertDbToFrontend
};
