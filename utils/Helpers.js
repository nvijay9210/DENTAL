function getJsonValue(field) {
  console.log('stringify:',field);
  return field && field.length > 0 ? JSON.stringify(field) : null;
}

function toBooleanNumber(value) {
  return value ? 1 : 0;
}

const decodeJsonFields = (data, fields) => {
  return data.length > 0
    ? data.map((record) => {
        fields.forEach((field) => {
          try {
            const value = record[field];
            if (
              typeof value === "string" &&
              (value.trim().startsWith("{") || value.trim().startsWith("["))
            ) {
              record[field] = JSON.parse(value);
            }
          } catch (error) {
            console.error(`Error decoding record field: ${field}`, error);
          }
        });
        return record;
      })
    : null;
};


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

function mapBooleanFields(data, booleanFields) {
  booleanFields.forEach((field) => {
    if (data.hasOwnProperty(field)) {
      data[field] = data[field] === 1 ? true : false;
    }
  });
  return data;
}

module.exports = {
  getJsonValue,
  toBooleanNumber,
  decodeJsonFields,
  sameLengthChecker,
  mapBooleanFields,
};
