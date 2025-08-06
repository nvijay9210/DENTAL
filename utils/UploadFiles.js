// const fs = require("fs");
// const path = require("path");
// const { compressImage } = require("./ImageCompress");
// const { relativePath } = require("./RelativePath");
// const { createDocument, getDocumentsByField, deleteDocumentById } = require("../models/documentModel");

// const uploadFileMiddleware = (options) => {
//   const {
//     folderName,
//     fileFields, // [{ fieldName, subFolder, maxSizeMB, multiple }]
//     createValidationFn,
//     updateValidationFn,
//   } = options;

//   return async (req, res, next) => {
//     try {
//       // Ensure folder exists
//       const ensureFolderExists = (folderPath) => {
//         if (!fs.existsSync(folderPath)) {
//           fs.mkdirSync(folderPath, { recursive: true });
//         }
//       };

//       // Save file to disk and return relative path
//       const saveFile = async (buffer, outputPath, fileName) => {
//         ensureFolderExists(outputPath);
//         const filePath = path.join(outputPath, fileName);
//         fs.writeFileSync(filePath, buffer);
//         return relativePath(filePath);
//       };

//       const uploadedFiles = {};
//       const tenant_id = req.body.tenant_id || req.params.tenant_id;
//       let id = 0;

//       switch (folderName) {
//         case "Notification":
//           id = req.params.notification_id;
//           break;
//         case "Expense":
//           id = req.params.expense_id;
//           break;
//         case "Supplier_products":
//           id = req.params.supplier_product_id;
//           break;
//         case "Supplier":
//           id = req.params.supplier_id;
//           break;
//         case "Reception":
//           id = req.params.reception_id;
//           break;
//         case "Asset":
//           id = req.params.asset_id;
//           break;
//         case "Treatment":
//           id = req.params.treatment_id;
//           break;
//         case "Patient":
//           id = req.params.patient_id;
//           break;
//         case "Dentist":
//           id = req.params.dentist_id;
//           break;
//         case "Clinic":
//           id = req.params.clinic_id;
//           break;
//         case "Tenant":
//           id = req.params.tenant_id;
//           break;
//       }

//       const settings = req.query.settings || 0;
//       if (settings != 1) {
//         if (id) {
//           await updateValidationFn(id, req.body, tenant_id);
//         } else {
//           console.log("create");
//           await createValidationFn(req.body);
//         }
//       }

//       const baseTenantPath = path.join(
//         path.dirname(__dirname),
//         "uploads",
//         `tenant_${tenant_id}`,
//         folderName
//       );

//       const imageExtensions = [
//         ".jpg",
//         ".jpeg",
//         ".png",
//         ".gif",
//         ".bmp",
//         ".webp",
//         ".tiff",
//       ];

//       for (const fileField of fileFields) {
//         if (fileField.fieldName === "awards_certifications") {
//           const awards = [];
//           let idx = 0;
//           while (true) {
//             const fileFieldName = `awards_certifications_${idx}`;
//             const descFieldName = `description_awards_certifications_${idx}`;
//             const file = req.files?.find((f) => f.fieldname === fileFieldName);
//             const description = req.body[descFieldName];

//             if (!file && !req.body[fileFieldName] && !description) break;

//             if (file) {
//               const maxSizeBytes = fileField.maxSizeMB * 1024 * 1024;
//               if (file.size > maxSizeBytes) {
//                 return res.status(400).json({
//                   message: `Award certification image must be less than ${fileField.maxSizeMB}MB`,
//                 });
//               }

//               const extension = path.extname(file.originalname).toLowerCase();
//               const dynamicSubFolder = imageExtensions.includes(extension)
//                 ? "photo"
//                 : "document";
//               const fieldTenantPath = path.join(
//                 baseTenantPath,
//                 dynamicSubFolder
//               );

//               const bufferToSave = imageExtensions.includes(extension)
//                 ? await compressImage(file.buffer, 100)
//                 : file.buffer;

//               const fileName = `${
//                 path.parse(file.originalname).name
//               }_${Date.now()}_${Math.floor(Math.random() * 10000)}${extension}`;
//               const savedPath = await saveFile(
//                 bufferToSave,
//                 fieldTenantPath,
//                 fileName
//               );

//               awards.push({ image: savedPath, description: description || "" });
//             } else if (req.body[fileFieldName]) {
//               awards.push({
//                 image: req.body[fileFieldName],
//                 description: description || "",
//               });
//             }

//             idx++;
//           }
//           req.body.awards_certifications = awards;
//           uploadedFiles.awards_certifications = awards;
//         } else if (fileField.fieldName === "treatment_images") {
//           const treatments = [];
//           let idx = 0;
//           while (true) {
//             const fileFieldName = `treatment_images${idx}`;
//             const file = req.files?.find((f) => f.fieldname === fileFieldName);
//             const existingImagePath = req.body[fileFieldName];
//             if (!file && !existingImagePath) break;

//             if (file) {
//               const maxSizeBytes = fileField.maxSizeMB * 1024 * 1024;
//               if (file.size > maxSizeBytes) {
//                 return res.status(400).json({
//                   message: `Treatment image must be less than ${fileField.maxSizeMB}MB`,
//                 });
//               }

//               const extension = path.extname(file.originalname).toLowerCase();
//               const dynamicSubFolder = imageExtensions.includes(extension)
//                 ? "photo"
//                 : "document";
//               const fieldTenantPath = path.join(
//                 baseTenantPath,
//                 dynamicSubFolder
//               );

//               const bufferToSave = imageExtensions.includes(extension)
//                 ? await compressImage(file.buffer, 100)
//                 : file.buffer;

//               const fileName = `${
//                 path.parse(file.originalname).name
//               }_${Date.now()}_${Math.floor(Math.random() * 10000)}${extension}`;
//               const savedPath = await saveFile(
//                 bufferToSave,
//                 fieldTenantPath,
//                 fileName
//               );
//               treatments.push(savedPath);
//             } else if (existingImagePath) {
//               treatments.push(existingImagePath);
//             }

//             idx++;
//           }
//           req.body.treatment_images = treatments;
//           uploadedFiles.treatment_image = treatments;
//         } else {
//           // Generic file handling (single or multiple)
//           console.log("Else");
//           const files =
//             req.files?.filter(
//               (file) => file.fieldname === fileField.fieldName
//             ) || [];

//           if (files.length > 0) {
//             const savedPaths = [];

//             for (const file of files) {
//               const maxSizeBytes = fileField.maxSizeMB * 1024 * 1024;
//               if (file.size > maxSizeBytes) {
//                 return res.status(400).json({
//                   message: `${fileField.fieldName.replace(
//                     /_/g,
//                     " "
//                   )} must be less than ${fileField.maxSizeMB}MB`,
//                 });
//               }

//               const extension = path.extname(file.originalname).toLowerCase();
//               const dynamicSubFolder = imageExtensions.includes(extension)
//                 ? "photo"
//                 : "document";
//               const fieldTenantPath = path.join(
//                 baseTenantPath,
//                 fileField.subFolder || dynamicSubFolder
//               );

//               const bufferToSave = imageExtensions.includes(extension)
//                 ? await compressImage(file.buffer, 100)
//                 : file.buffer;

//               const fileName = `${
//                 path.parse(file.originalname).name
//               }_${Date.now()}_${Math.floor(Math.random() * 10000)}${extension}`;
//               const savedPath = await saveFile(
//                 bufferToSave,
//                 fieldTenantPath,
//                 fileName
//               );

//               savedPaths.push(savedPath);
//             }

//             // If multiple allowed, store as array
//             if (fileField.multiple) {
//               req.body[fileField.fieldName] = savedPaths;
//               uploadedFiles[fileField.fieldName] = savedPaths;
//             } else {
//               // If only one file expected
//               req.body[fileField.fieldName] = savedPaths[0];
//               uploadedFiles[fileField.fieldName] = savedPaths[0];
//             }
//           }
//         }
//       }

//       next();
//     } catch (error) {
//       console.error("Error uploading files:", error.message);
//       return res.status(500).json({ message: error.message });
//     }
//   };
// };

// /**
//  * Delete a single file if it's inside the uploads folder
//  */
// const deleteFileIfExists = (filePath) => {
//   if (!filePath || typeof filePath !== "string") return;

//   const normalizedPath = filePath.replace(/^\/+/, "").replace(/\\/g, "/");

//   if (!normalizedPath.startsWith("uploads/")) {
//     console.warn(
//       "Skipping file deletion (external or invalid):",
//       normalizedPath
//     );
//     return;
//   }

//   const fullPath = path.join(__dirname, "..", normalizedPath);
//   if (fs.existsSync(fullPath)) {
//     try {
//       fs.unlinkSync(fullPath);
//       console.log("✅ Deleted:", fullPath);
//     } catch (err) {
//       console.error("❌ Failed to delete:", fullPath, err);
//     }
//   } else {
//     console.warn("⚠️ File not found:", fullPath);
//   }
// };

// /**
//  * Delete one or many files from array or string
//  */
// const deleteUploadedFiles = async (filePaths) => {
//   if (!filePaths) return;

//   const deleteTasks = [];

//   if (Array.isArray(filePaths)) {
//     for (const item of filePaths) {
//       if (typeof item === "string") {
//         deleteTasks.push(deleteFileIfExists(item));
//       } else if (typeof item === "object" && item.image) {
//         deleteTasks.push(deleteFileIfExists(item.image));
//       }
//     }
//   } else if (typeof filePaths === "string") {
//     deleteTasks.push(deleteFileIfExists(filePaths));
//   }

//   await Promise.all(deleteTasks); // async-safe deletion
//   return true;
// };

// /**
//  * Extract all awards_certification_* fields from an object
//  */
// const extractAwardsCertificationFiles = (data) => {
//   const files = [];
//   for (const key in data) {
//     if (
//       key.startsWith("awards_certification_") &&
//       typeof data[key] === "string"
//     ) {
//       files.push(data[key]);
//     }
//   }
//   return files;
// };

// /**
//  * Delete all image fields like treatment_images, awards_certification, etc.
//  *
//  * @param {*} data - Object containing image fields
//  * @param {*} fieldsToCheck - Array of keys like ['treatment_images']
//  */
// const deleteFilesOnUpdateOrDelete = (data, fieldsToCheck = []) => {
//   // Delete from treatment_images: array of strings or objects
//   for (const field of fieldsToCheck) {
//     if (data[field]) {
//       deleteUploadedFiles(data[field]);
//     }
//   }

//   // Special case: awards_certification_* fields
//   const awardFiles = extractAwardsCertificationFiles(data);
//   if (awardFiles.length > 0) {
//     deleteUploadedFiles(awardFiles);
//   }
// };

// const saveDocuments = async ({
//   table_name,
//   table_id,
//   field_name,
//   files,
//   created_by,
// }) => {
//   if (!files) return;

//   const fileArray = Array.isArray(files) ? files : [files];

//   const validFiles = fileArray.filter((file) => !!file);
//   if (validFiles.length === 0) return;

//   if(field_name==='awards_certifications'){
//     await Promise.all(
//       validFiles.map((fileUrl) =>
//         createDocument(table_name, table_id, field_name, fileUrl.image, created_by)
//       )
//     );
//   }
//   else{
//     await Promise.all(
//       validFiles.map((fileUrl) =>
//         createDocument(table_name, table_id, field_name, fileUrl, created_by)
//       )
//     );
//   }

// };

// const updateDocumentsDiffBased = async ({
//   table_name,
//   table_id,
//   field_name,
//   newFiles = [],
//   created_by,
//   updated_by,
// }) => {
//   if (!Array.isArray(newFiles)) newFiles = [];

//   const existingDocs = await getDocumentsByField(table_name, table_id, field_name);
//   const existingMap = new Map(existingDocs.map(doc => [doc.document_id, doc.file_url]));
//   const newMap = new Map(
//     newFiles.filter(file => file.document_id).map(file => [file.document_id, file.file_url])
//   );

//   // 🔻 Delete removed
//   const deleted = [...existingMap.keys()].filter(id => !newMap.has(id));
//   await Promise.all(
//     deleted.map(async (docId) => {
//       const fileUrl = existingMap.get(docId);
//       await deleteDocumentById(docId);
//       if (fileUrl) await deleteUploadedFiles(fileUrl); // Optional
//     })
//   );

//   // ➕ Add new files (without document_id)
//   const additions = newFiles.filter(file => !file.document_id && file.file_url);
//   await Promise.all(
//     additions.map(file =>
//       createDocument(table_name, table_id, field_name, file.file_url, created_by || updated_by)
//     )
//   );
// };

// module.exports = {
//   uploadFileMiddleware,
//   deleteFileIfExists,
//   deleteUploadedFiles,
//   saveDocuments,
//   updateDocumentsDiffBased
// };

const fs = require("fs");
const path = require("path");
const { compressImage } = require("./ImageCompress");
const { relativePath } = require("./RelativePath");
const {
  createDocument,
  getDocumentsByField,
  deleteDocumentById,
  deleteDocumentsByTableAndId,
  getDocumentsByTableAndId,
} = require("../models/documentModel");

// Middleware: Upload files with full error handling
const uploadFileMiddleware = (options) => {
  const { folderName, fileFields, createValidationFn, updateValidationFn } =
    options;
  return async (req, res, next) => {
    try {
      console.log(`📁 Starting file upload process for folder: ${folderName}`);

      const ensureFolderExists = (folderPath) => {
        try {
          if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
            console.log(`📁 Created directory: ${folderPath}`);
          } else {
            console.log(`📁 Directory already exists: ${folderPath}`);
          }
        } catch (err) {
          console.error(
            `🚨 Failed to create directory: ${folderPath}`,
            err.message
          );
        }
      };

      const saveFile = async (buffer, outputPath, fileName) => {
        try {
          ensureFolderExists(outputPath);
          const filePath = path.join(outputPath, fileName);
          fs.writeFileSync(filePath, buffer);
          const relativeFilePath = relativePath(filePath);
          console.log(`✅ Uploaded file: ${relativeFilePath}`);
          return relativeFilePath;
        } catch (err) {
          console.error(`❌ Failed to save file: ${fileName}`, err.message);
          throw new Error(`File save failed: ${err.message}`);
        }
      };

      const uploadedFiles = {};
      const tenant_id = req.body.tenant_id || req.params.tenant_id;
      if (!tenant_id) {
        console.warn("⚠️ Missing tenant_id in request");
        return res.status(400).json({ message: "Tenant ID is required" });
      }
      console.log(`🏢 Tenant ID: ${tenant_id}`);

      let id = 0;
      const idMap = {
        Notification: "notification_id",
        Expense: "expense_id",
        Supplier_products: "supplier_product_id",
        Supplier: "supplier_id",
        Reception: "reception_id",
        Asset: "asset_id",
        Treatment: "treatment_id",
        Patient: "patient_id",
        Dentist: "dentist_id",
        Clinic: "clinic_id",
        Tenant: "tenant_id",
      };
      const paramKey = idMap[folderName];
      if (paramKey) id = req.params[paramKey];

      const settings = req.query.settings || 0;
      if (settings != 1) {
        try {
          if (id) {
            console.log(
              `🔍 Running update validation for ${folderName} ID: ${id}`
            );
            await updateValidationFn(id, req.body, tenant_id);
          } else {
            console.log(`➕ Running create validation for new ${folderName}`);
            await createValidationFn(req.body);
          }
        } catch (validationError) {
          console.error(`❌ Validation failed:`, validationError.message);
          return res.status(400).json({ message: validationError.message });
        }
      }

      const baseTenantPath = path.join(
        path.dirname(__dirname),
        "uploads",
        `tenant_${tenant_id}`,
        folderName
      );
      console.log(`📁 Base upload path: ${baseTenantPath}`);

      const imageExtensions = [
        ".jpg",
        ".jpeg",
        ".png",
        ".gif",
        ".bmp",
        ".webp",
        ".tiff",
      ];

      for (const fileField of fileFields) {
        try {
          const files =
            req.files?.filter(
              (file) => file.fieldname === fileField.fieldName
            ) || [];

          if (files.length === 0) {
            console.log(`📎 No files found for field: ${fileField.fieldName}`);
            continue;
          }

          console.log(
            `📎 Processing ${files.length} file(s) for field: ${fileField.fieldName}`
          );
          const savedPaths = [];

          for (const file of files) {
            const maxSizeBytes = fileField.maxSizeMB * 1024 * 1024;
            if (file.size > maxSizeBytes) {
              console.warn(
                `❌ File too large: ${file.originalname} (${file.size} bytes) > ${fileField.maxSizeMB}MB`
              );
              return res.status(400).json({
                message: `${fileField.fieldName.replace(
                  /_/g,
                  " "
                )} must be less than ${fileField.maxSizeMB}MB`,
              });
            }

            const extension = path.extname(file.originalname).toLowerCase();
            if (!extension) {
              console.warn(
                `📎 Skipping file with no extension: ${file.originalname}`
              );
              continue;
            }

            const dynamicSubFolder = imageExtensions.includes(extension)
              ? "photo"
              : "document";
            const fieldTenantPath = path.join(
              baseTenantPath,
              fileField.subFolder || dynamicSubFolder
            );

            const bufferToSave = imageExtensions.includes(extension)
              ? await compressImage(file.buffer, 100)
              : file.buffer;

            const fileName = `${
              path.parse(file.originalname).name
            }_${Date.now()}_${Math.floor(Math.random() * 10000)}${extension}`;

            const savedPath = await saveFile(
              bufferToSave,
              fieldTenantPath,
              fileName
            );
            savedPaths.push(savedPath);
          }

          req.body[fileField.fieldName] = fileField.multiple
            ? savedPaths
            : savedPaths[0];
          uploadedFiles[fileField.fieldName] = fileField.multiple
            ? savedPaths
            : savedPaths[0];

          console.log(
            `📤 Saved ${fileField.multiple ? "files" : "file"} for ${
              fileField.fieldName
            }:`,
            req.body[fileField.fieldName]
          );
        } catch (fieldError) {
          console.error(
            `🚨 Error processing field: ${fileField.fieldName}`,
            fieldError.message
          );
          return res
            .status(500)
            .json({ message: `Upload failed for ${fileField.fieldName}` });
        }
      }

      console.log(
        "✅ File upload processing completed. Moving to next middleware."
      );
      next();
    } catch (error) {
      console.error("🚨 Unexpected error in upload middleware:", error.message);
      return res
        .status(500)
        .json({ message: "File upload failed due to internal error." });
    }
  };
};

// Delete a single file safely
const deleteFileIfExists = (filePath) => {
  try {
    if (!filePath || typeof filePath !== "string") {
      console.log("📎 Skipping file deletion: Invalid or empty file path");
      return;
    }

    const normalizedPath = filePath.replace(/^\/+/, "").replace(/\\/g, "/");
    if (!normalizedPath.startsWith("uploads/")) {
      console.warn(
        `⚠️ Skipping external file deletion (not in uploads): ${normalizedPath}`
      );
      return;
    }

    const fullPath = path.join(__dirname, "..", normalizedPath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      console.log(`✅ File deleted: ${fullPath}`);
    } else {
      console.warn(`⚠️ File not found (already deleted or moved): ${fullPath}`);
    }
  } catch (err) {
    console.error(
      `❌ Failed to delete file (catch block): ${filePath}`,
      err.message
    );
  }
};

// Delete multiple files (array or string)
const deleteUploadedFiles = async (filePaths) => {
  try {
    if (!filePaths) {
      console.log("📎 No files to delete.");
      return;
    }

    const deleteTasks = [];
    if (Array.isArray(filePaths)) {
      console.log(`🗑️ Starting deletion of ${filePaths.length} file(s)...`);
      for (const item of filePaths) {
        if (typeof item === "string") {
          console.log(`📎 Queuing file for deletion: ${item}`);
          deleteTasks.push(() => deleteFileIfExists(item));
        } else if (typeof item === "object" && item.image) {
          console.log(`📎 Queuing image object for deletion: ${item.image}`);
          deleteTasks.push(() => deleteFileIfExists(item.image));
        } else {
          console.warn(`📎 Skipping invalid file entry:`, item);
        }
      }
    } else if (typeof filePaths === "string") {
      console.log(`📎 Queuing single file for deletion: ${filePaths}`);
      deleteTasks.push(() => deleteFileIfExists(filePaths));
    }

    // Execute all deletions (sequentially or in parallel)
    deleteTasks.forEach((task) => task());
    console.log("✅ All file deletions completed.");
  } catch (err) {
    console.error("🚨 Error during batch file deletion:", err.message);
  }
};

// Update documents with diff-based logic
// middleware/uploadFiles.js
// const updateDocumentsDiffBased = async ({
//   table_name,
//   table_id,
//   field_name,
//   newFiles = [],
//   created_by,
//   updated_by,
// }) => {
//   try {
//     if (!Array.isArray(newFiles)) newFiles = [];
//     console.log(`🔄 Updating documents for ${table_name}#${table_id}, field: ${field_name}`);

//     const existingDocs = await getDocumentsByField(table_name, table_id, field_name);
//     console.log(`🔍 Found ${existingDocs.length} existing document(s)`);

//     const getBaseName = (fileUrl = "") => {
//       return path.basename(fileUrl || "").split("_")[0];
//     };

//     const existingUrls = new Set(existingDocs.map(doc => getBaseName(doc.file_url)));
//     const newBaseUrls = new Set(
//       newFiles
//         .map(f => getBaseName(typeof f === "string" ? f : f.file_url))
//         .filter(Boolean)
//     );

//     // 🔽 Delete: existing not in new
//     const toDelete = existingDocs.filter(doc => !newBaseUrls.has(getBaseName(doc.file_url)));
//     // ➕ Insert: new not in existing
//     const toInsert = newFiles.filter(file => {
//       const fileUrl = typeof file === "string" ? file : file.file_url;
//       return fileUrl && !existingUrls.has(getBaseName(fileUrl));
//     });

//     console.log(`🗑️ Marked ${toDelete.length} for deletion`);
//     console.log(`➕ Marked ${toInsert.length} for insertion`);

//     // ✅ Delete from DB + disk
//     await Promise.all(
//       toDelete.map(async (doc) => {
//         console.log(`🗑️ Deleting document ID: ${doc.document_id}`);
//         await deleteDocumentById(doc.document_id);
//         await deleteUploadedFiles(doc.file_url);
//       })
//     );

//     // ✅ Insert new records
//     await Promise.all(
//       toInsert.map(async (file) => {
//         const fileUrl = typeof file === "string" ? file : file.file_url;
//         console.log(`📄 Creating DB record for: ${fileUrl}`);
//         await createDocument(
//           table_name,
//           table_id,
//           field_name,
//           fileUrl,
//           created_by || updated_by
//         );
//       })
//     );

//     console.log("✅ Document sync completed.");
//   } catch (err) {
//     console.error("🚨 Error in updateDocumentsDiffBased:", err.message);
//     throw err;
//   }
// };

// middleware/uploadFiles.js
const updateDocumentsDiffBased = async ({
  table_name,
  table_id,
  field_name,
  newFiles = [],
  created_by,
  updated_by,
}) => {
  try {
    if (!Array.isArray(newFiles)) newFiles = [];
    console.log(
      `🔄 Syncing documents for ${table_name}#${table_id}, field: '${field_name}'`
    );

    // 1️⃣ Get existing documents from DB
    const existingDocs = await getDocumentsByField(
      table_name,
      table_id,
      field_name
    );
    console.log(
      `🔍 Found ${existingDocs.length} existing document(s):`,
      existingDocs.map((d) => `${d.document_id}: ${d.file_url}`)
    );

    // 2️⃣ Build map: document_id → doc
    const existingById = new Map(
      existingDocs.map((doc) => [doc.document_id, doc])
    );

    // 3️⃣ Extract document_ids from newFiles (only those with document_id)
    const preservedIds = new Set(
      newFiles.filter((f) => f.document_id).map((f) => f.document_id)
    );

    // 4️⃣ Files to DELETE = in DB but not in preserved list
    const toDelete = existingDocs.filter(
      (doc) => !preservedIds.has(doc.document_id)
    );
    console.log(
      `🗑️ Marked ${toDelete.length} file(s) for deletion:`,
      toDelete.map((d) => `${d.document_id}: ${d.file_url}`)
    );

    // 5️⃣ Files to INSERT = in newFiles but have NO document_id (new uploads)
    const toInsert = newFiles.filter((f) => !f.document_id && f.file_url);
    console.log(
      `➕ Marked ${toInsert.length} file(s) for insertion:`,
      toInsert.map((f) => f.file_url)
    );

    // 🔽 Delete removed files (from DB + disk)
    await Promise.all(
      toDelete.map(async (doc) => {
        console.log(
          `🗑️ Deleting DB record ID: ${doc.document_id} → ${doc.file_url}`
        );
        await deleteDocumentById(doc.document_id);
        await deleteUploadedFiles(doc.file_url);
      })
    );

    // ➕ Insert only new files (without document_id)
    await Promise.all(
      toInsert.map(async (file) => {
        const fileUrl = typeof file === "string" ? file : file.file_url;
        console.log(`➕ Creating new DB record: ${fileUrl}`);
        await createDocument(
          table_name,
          table_id,
          field_name,
          fileUrl,
          created_by || updated_by
        );
      })
    );

    console.log("✅ Document sync completed.");
  } catch (err) {
    console.error("🚨 Error in updateDocumentsDiffBased:", err.message);
    throw err;
  }
};

// Save documents (create records)
const saveDocuments = async ({
  table_name,
  table_id,
  field_name,
  files,
  created_by,
}) => {
  try {
    if (!files) {
      console.log(`📎 No files to save for ${table_name}#${table_id}`);
      return;
    }

    const fileArray = Array.isArray(files) ? files : [files];
    const validFiles = fileArray.filter(
      (file) =>
        typeof file === "string" || (file && typeof file.file_url === "string")
    );

    if (validFiles.length === 0) {
      console.log(`📎 No valid files to save for field: ${field_name}`);
      return;
    }

    console.log(
      `💾 Saving ${validFiles.length} document(s) for ${table_name}#${table_id}, field: ${field_name}`
    );

    await Promise.all(
      validFiles.map(async (file) => {
        try {
          const fileUrl = typeof file === "string" ? file : file.file_url;
          console.log(`📄 Creating document: ${fileUrl}`);
          await createDocument(
            table_name,
            table_id,
            field_name,
            fileUrl,
            created_by
          );
        } catch (err) {
          console.error(
            `❌ Failed to save document: ${file.file_url}`,
            err.message
          );
        }
      })
    );

    console.log("✅ Documents saved successfully.");
  } catch (err) {
    console.error(`🚨 Error in saveDocuments:`, err.message);
  }
};

// Clean up all files + records for a table+id
const handleFileCleanupByTable = async (table_name, table_id) => {
  try {
    console.log(`🧹 Starting cleanup for ${table_name}#${table_id}`);
    const documents = await getDocumentsByTableAndId(table_name, table_id);

    if (!documents || documents.length === 0) {
      console.log(
        `📎 No documents found for ${table_name}#${table_id}. Skipping cleanup.`
      );
      return;
    }

    console.log(`🗑️ Found ${documents.length} document(s) to clean up.`);
    const filePaths = documents.map((doc) => doc.file_url);

    await deleteUploadedFiles(filePaths);
    await deleteDocumentsByTableAndId(table_name, table_id);

    console.log(
      `✅ All files and records deleted for ${table_name}#${table_id}`
    );
  } catch (error) {
    console.error(
      `🚨 Failed to clean up files for ${table_name} ID ${table_id}:`,
      error.message
    );
  }
};

// Utility: Normalize dynamic file uploads (e.g., awards_certifications_0, awards_certifications_1)
const normalizeFileUploads = async ({
  req,
  fieldName,
  folderName,
  tenant_id,
  compress = true,
}) => {
  try {
    const result = [];
    const imageExtensions = [
      ".jpg",
      ".jpeg",
      ".png",
      ".gif",
      ".bmp",
      ".webp",
      ".tiff",
    ];

    // 🔒 Safety check
    if (!req.files) {
      console.warn(
        `📎 req.files is missing or undefined for field: ${fieldName}`
      );
      return result;
    }

    const baseDir = path.join(
      path.dirname(__dirname),
      "uploads",
      `tenant_${tenant_id}`,
      folderName,
      "photo"
    );

    fs.mkdirSync(baseDir, { recursive: true });

    const files = req.files.filter((file) =>
      file.fieldname.startsWith(fieldName)
    );
    console.log(`📎 Found ${files.length} dynamic files for: ${fieldName}`);

    for (const file of files) {
      try {
        const ext = path.extname(file.originalname).toLowerCase();
        if (!ext) {
          console.warn(
            `📎 Skipping file with no extension: ${file.originalname}`
          );
          continue;
        }

        const buffer =
          compress && imageExtensions.includes(ext)
            ? await compressImage(file.buffer, 100)
            : file.buffer;

        const fileName = `${
          path.parse(file.originalname).name
        }_${Date.now()}_${Math.floor(Math.random() * 10000)}${ext}`;
        const fullPath = path.join(baseDir, fileName);
        fs.writeFileSync(fullPath, buffer);

        // ✅ Await the async relativePath function
        const fileUrl = await relativePath(fullPath);
        result.push({ file_url: fileUrl });

        console.log(`✅ Saved dynamic upload: ${fileUrl}`);
      } catch (fileErr) {
        console.error(
          `❌ Failed to process file: ${file.originalname}`,
          fileErr.message
        );
      }
    }

    // Reuse existing values (from body)
    const oldValues = req.body[fieldName];
    const existing = Array.isArray(oldValues)
      ? oldValues
      : oldValues
      ? [oldValues]
      : [];

    for (const item of existing) {
      if (!item) continue;
      try {
        const parsed = typeof item === "string" ? JSON.parse(item) : item;
        if (parsed?.file_url) {
          result.push({ file_url: parsed.file_url });
        }
      } catch (parseErr) {
        console.warn(`⚠️ Invalid JSON in ${fieldName}:`, item);
      }
    }

    console.log(`✅ Normalized uploads for ${fieldName}:`, result);
    return result;
  } catch (err) {
    console.error(
      `🚨 Error in normalizeFileUploads for ${fieldName}:`,
      err.message
    );
    return []; // Always return array
  }
};

module.exports = {
  uploadFileMiddleware,
  deleteUploadedFiles,
  updateDocumentsDiffBased,
  saveDocuments,
  handleFileCleanupByTable,
  normalizeFileUploads,
};
