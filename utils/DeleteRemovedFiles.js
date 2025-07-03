const fsPromises = require("fs/promises");
const path = require("path");

const deleteRemovedFilesDynamic = async (oldFilesObj, newFilesObj) => {
  const baseDir = path.dirname(__dirname);

  const normalize = (val) => {
    if (typeof val === "string") return val;
    if (typeof val === "object" && val !== null) {
      return val?.image || val?.expense_document || Object.values(val)[0];
    }
    return "";
  };

  for (const fieldName in oldFilesObj) {
    const oldList = oldFilesObj[fieldName] || [];
    const newList = newFilesObj[fieldName] || [];

    const newPaths = newList.map(normalize);

    for (const oldItem of oldList) {
      const oldPath = normalize(oldItem);
      if (oldPath && !newPaths.includes(oldPath)) {
        const fullPath = path.join(baseDir, oldPath);
        try {
          await fsPromises.unlink(fullPath);
          console.log(`🧹 Deleted: ${fullPath}`);
        } catch (err) {
          console.warn(`⚠️ Skipped: ${fullPath} (${err.message})`);
        }
      }
    }
  }
};

module.exports = { deleteRemovedFilesDynamic };
