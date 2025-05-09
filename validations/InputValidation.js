const { CustomError } = require("../middlewares/CustomeError");

function sanitizeInput(value, type) {
  // Check for `--` in any input value and throw error if found
  if (typeof value === 'string' && value.includes('--')) {
    throw new CustomError("Input contains invalid characters: '--'", 400);
  }

  // Trim whitespace for string values
  if (typeof value === 'string') {
    value = value.trim();
  }

  // Specific sanitization for certain types (you can extend as needed)
  switch (type.toLowerCase()) {
    case 'varchar':
    case 'text':
    case 'longtext':
      // Strip leading/trailing spaces for strings
      return typeof value === 'string' ? value.trim() : value;
    
    case 'int':
    case 'integer':
    case 'bigint':
      // Ensure the value is a valid integer
      return Number.isInteger(Number(value)) ? Number(value) : value;
    
    case 'float':
    case 'double':
    case 'decimal':
      // Ensure the value is a valid float/decimal
      return isNaN(Number(value)) ? value : Number(value);

    case 'boolean':
    case 'tinyint':
      // Convert values to boolean types
      if (value === 'true' || value === 1 || value === '1') {
        return true;
      } else if (value === 'false' || value === 0 || value === '0') {
        return false;
      }
      return value; // Return as is if no valid boolean

    case 'date':
    case 'datetime':
    case 'timestamp':
      // For date and datetime, you might want to sanitize (ensure valid format)
      return value; // Return as is for now. More sanitization can be added.
    
    default:
      return value; // No sanitization needed for unsupported types
  }
}

function validateInput(userInput, columnConfig) {
  if (!userInput || typeof userInput === undefined) {
    throw new CustomError(`Invalid input`, 400);
  }

  for (const column of columnConfig) {
    const { columnname, type, size, null: isNullable, enum_values, pattern } = column;
    let value = userInput[columnname];

    // Sanitization step
    value = sanitizeInput(value, type);

    if ((value === undefined || value === null || value === '') && isNullable === true) {
      continue;
    }

    if ((value === undefined || value === null || value === '') && isNullable === false) {
      throw new CustomError(`${columnname} is required`, 400);
    }

    if (value !== undefined && value !== null && value !== '') {
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

      // ✅ Add Pattern Check (After Type Validation)
      if (pattern && value !== null) {
        const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern);
        if (!regex.test(value)) {
          throw new CustomError(`${columnname} Invalid`, 400);
        }
      }
    }
  }
}

module.exports = { validateInput };
