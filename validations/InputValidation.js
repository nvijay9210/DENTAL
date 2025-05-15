const { CustomError } = require("../middlewares/CustomeError");

// Helper: Sanitize individual field
function sanitizeInput(value, type) {
  // Block SQL injection-like patterns
  if (typeof value === "string") {
    if (value.includes("--")) {
      throw new CustomError("Input contains invalid characters: '--'", 400);
    }
    value = value.trim();
  }

  switch ((type || "").toLowerCase()) {
    case "varchar":
    case "text":
    case "longtext":
      return value;

    case "int":
    case "integer":
    case "bigint":
      if (value === null || value === "") return null;
      if (!Number.isFinite(Number(value)))
        throw new CustomError(`${value} is not a valid integer`, 400);
      return Number.parseInt(value);

    case "float":
    case "double":
    case "decimal":
      if (value === null || value === "") return null;
      if (!Number.isFinite(Number(value)))
        throw new CustomError(`${value} is not a valid number`, 400);
      return Number.parseFloat(value);

    case "boolean":
    case "tinyint":
      if (value === "true" || value === "1" || value === true || value === 1)
        return true;
      if (value === "false" || value === "0" || value === false || value === 0)
        return false;
      throw new CustomError(`"${value}" is not a valid boolean`, 400);

    case "date":
    case "datetime":
    case "timestamp":
      return value;

    default:
      return value;
  }
}

// Main validator function
function validateInput(userInput, columnConfig) {
  if (!userInput) {
    throw new CustomError("No input provided", 400);
  }

  console.log('userinput:',userInput)

  const sanitizedData = {};

  for (const column of columnConfig) {
    const {
      columnname,
      type,
      size,
      null: isNullable,
      enum_values,
      pattern,
    } = column;

    let value = userInput[columnname];
    console.log('value:',columnname,value,typeof value,isNullable,typeof isNullable)

    // Skip empty/undefined if nullable
    if (
      (value === undefined || value === 'null' || value === "") &&
      isNullable === true
    ) {
      sanitizedData[columnname] = null;
      console.log("Continue Activated");
      continue;
    }

    // Enforce required fields
    if (
      (value === undefined || value === 'null' || value === "") &&
      isNullable === false
    ) {
      throw new CustomError(`${columnname} is required`, 400);
    }

    // Sanitize before validation
    try {
      value = sanitizeInput(value, type);
    } catch (error) {
      throw error;
    }

    // Type-specific validations
    switch ((type || "").toLowerCase()) {
      case "varchar":
      case "text":
      case "longtext":
        if (typeof value !== "string" && typeof value !=='array' && typeof value !=='object') {
          throw new CustomError(`${columnname} must be a string`, 400);
        }
        if (size && value.length > parseInt(size)) {
          throw new CustomError(
            `${columnname} exceeds max length of ${size}`,
            400
          );
        }
        break;

      case "int":
      case "integer":
      case "bigint":
        if (typeof value !== "number" || !Number.isInteger(value)) {
          throw new CustomError(`${columnname} must be an integer`, 400);
        }
        break;

      case "float":
      case "double":
      case "decimal":
        if (typeof value !== "number" || isNaN(value)) {
          throw new CustomError(
            `${columnname} must be a valid decimal/float`,
            400
          );
        }
        break;

      case "boolean":
      case "tinyint":
        if (typeof value !== "boolean") {
          throw new CustomError(`${columnname} must be a boolean`, 400);
        }
        break;

      case "date":
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
          throw new CustomError(
            `${columnname} must be a valid date (YYYY-MM-DD)`,
            400
          );
        }
        break;

      case "datetime":
      case "timestamp":
        const datetimeRegex = /^\d{4}-\d{2}-\d{2}(?: \d{2}:\d{2}:\d{2})?$/;
        if (!datetimeRegex.test(value)) {
          throw new CustomError(
            `${columnname} must be a valid datetime (YYYY-MM-DD HH:mm:ss)`,
            400
          );
        }
        break;

      case "enum":
        if (!Array.isArray(enum_values) || enum_values.length === 0) {
          throw new CustomError(
            `${columnname} must have enum values defined`,
            400
          );
        }
        if (!enum_values.includes(value)) {
          throw new CustomError(
            `${columnname} must be one of: ${enum_values.join(", ")}`,
            400
          );
        }
        break;

      default:
        // No validation needed for unsupported types
        break;
    }

    // Pattern Check (Optional regex validation)
    if (pattern && value !== 'null') {
      const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern);
      if (!regex.test(value)) {
        throw new CustomError(`${columnname} Invalid format`, 400);
      }
    }

    sanitizedData[columnname] = value;
  }

  return sanitizedData;
}

module.exports = { validateInput };
