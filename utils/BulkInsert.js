// utils/bulkInsert.js
/**
 * Generic bulk insert handler
 * @param {Array|Object} inputData - Single object or array of objects
 * @param {Function} validateFn - Optional validation function per record
 * @param {Function} serviceFn - Service function to insert each record
 * @param {...any} args - Extra arguments to pass to serviceFn
 */
async function bulkInsert(inputData, validateFn, serviceFn, ...args) {
  let input = inputData;

  // Convert object with numeric keys to array
  if (!Array.isArray(input) && typeof input === 'object') {
    const numericKeys = Object.keys(input).filter(k => !isNaN(k));
    if (numericKeys.length > 0) {
      input = numericKeys.map(k => input[k]);
    } else {
      input = [input];
    }
  }

  const results = [];

  for (const [index, record] of input.entries()) {
    try {
      if (validateFn) await validateFn(record);
      const id = await serviceFn(record, ...args);
      results.push({ index, success: true, id, data: record });
    } catch (err) {
      console.error(`❌ Error in record ${index + 1}:`, err.message);
      results.push({
        index,
        success: false,
        error: err.message,
        data: record,
      });
    }
  }

  return {
    message: `Processed ${results.length} record(s)`,
    successCount: results.filter(r => r.success).length,
    failureCount: results.filter(r => !r.success).length,
    results,
  };
}

  
  module.exports = { bulkInsert };
  