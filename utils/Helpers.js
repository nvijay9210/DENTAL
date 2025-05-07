function getJsonValue(field) {
  return field && field.length > 0 ? JSON.stringify(field) : null;
}

function toBooleanNumber(value) {
  return value ? 1 : 0;
}

function sameLengthChecker(
  arr1,
  arr2,
  errorMessage = "Arrays must be of the same length."
) {
  if (
    !Array.isArray(arr1) ||
    !Array.isArray(arr2) ||
    arr1.length !== arr2.length
  ) {
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

const decodeJsonFields = (data, jsonFields) => {
  if (!Array.isArray(data)) data = [data];

  return data.map(item => {
    jsonFields.forEach(field => {
      if (item[field] !== undefined && item[field] !== null) {
        try {
          let value = item[field];

          // If already parsed (array/object), skip
          if (typeof value === 'object') return;

          // Try parsing
          item[field] = safeJsonParse(value);
        } catch (err) {
          // Handle common bad cases
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
};

function mapBooleanFields(item, fields) {
  fields.forEach((field) => {
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

module.exports = {
  getJsonValue,
  toBooleanNumber,
  decodeJsonFields,
  sameLengthChecker,
  safeJsonParse,
  mapBooleanFields,
  buildUpdatedData
};