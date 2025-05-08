const { CustomError } = require("../middlewares/CustomeError");

function validateInput(userInput, columnConfig) {
  if (!userInput || typeof userInput === undefined) {
    throw new CustomError(`Invalid input`, 400);
  }

  for (const column of columnConfig) {
    const { columnname, type, size, null: isNullable, enum_values } = column;
    const value = userInput[columnname];

    // Skip validation completely if nullable and value is undefined, null, or empty string
    if ((value === undefined || value === null || value === '') && isNullable === true) {
      continue;
    }

    // Throw error if required field is missing
    if ((value === undefined || value === null || value === '') && isNullable === false) {
      throw new CustomError(`${columnname} is required`, 400);
    }

    // Proceed with further validations only if value is present
    if (value !== undefined && value !== null && value !== '') {
      console.log(value)
      switch (type.toLowerCase()) {
        case 'varchar':
        case 'text':
        case 'longtext':
          if (
            typeof value !== 'string' &&
            !Array.isArray(value) &&
            typeof value !== 'object'
          ) {
            throw new CustomError(`${columnname} must be a string, array, or object`, 400);
          }
          if (typeof value === 'object') {
            try {
              JSON.stringify(value);
            } catch (e) {
              throw new CustomError(`${columnname} contains non-serializable data`, 400);
            }
          }
          if (typeof value === 'string' && size && value.length > parseInt(size)) {
            throw new CustomError(`${columnname} exceeds max length of ${size}`, 400);
          }
          break;

        case 'int':
        case 'integer':
        case 'bigint':
          if (!Number.isInteger(Number(value))) {
            throw new CustomError(`${columnname} must be an integer`, 400);
          }
          break;

        case 'float':
        case 'double':
        case 'decimal':
          if (isNaN(Number(value))) {
            throw new CustomError(`${columnname} must be a valid number`, 400);
          }
          break;

        case 'tinyint':
        case 'boolean':
          if (
            !(
              value === true ||
              value === false ||
              value === 'true' ||
              value === 'false' ||
              value === 1 ||
              value === 0 ||
              value === '1' ||
              value === '0'
            )
          ) {
            throw new CustomError(`${columnname} must be a boolean (true/false or 1/0)`, 400);
          }
          break;

        case 'date':
          if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            throw new CustomError(`${columnname} must be a valid date (YYYY-MM-DD)`, 400);
          }
          break;

        case 'datetime':
        case 'timestamp':
          if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)) {
            throw new CustomError(`${columnname} must be a valid ${type} (YYYY-MM-DD HH:MM:SS)`, 400);
          }
          break;

        case 'enum':
          if (!Array.isArray(enum_values) || !enum_values.includes(value)) {
            throw new CustomError(`${columnname} must be one of: ${enum_values?.join(', ')}`, 400);
          }
          break;

        default:
          console.warn(`Unsupported type "${type}" for column "${columnname}"`);
          break;
      }
    }
  }
}

module.exports={validateInput}