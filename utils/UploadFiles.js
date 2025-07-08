// const fs = require("fs");
// const path = require("path");
// const { compressImage } = require("./ImageCompress");
// const { relativePath } = require("./RelativePath");

// const uploadFileMiddleware = (options) => {
//   const {
//     folderName,
//     fileFields, // [{ fieldName, subFolder, maxSizeMB, multiple }]
//     createValidationFn,
//     updateValidationFn,
//   } = options;

//   return async (req, res, next) => {
//     try {
//       // Utility: Ensure folder exists
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
//         default:
//           break;
//       }
//       const settings=req.query.settings || 0

//       console.log('id:',id)

//       if(settings!=1){
//         if (id) {
//           await updateValidationFn(id, req.body, tenant_id);
//         } else {
//           console.log('update section')
//           await createValidationFn(req.body);
//         }
//       }

//       const baseTenantPath = path.join(
//         path.dirname(__dirname),
//         "uploads",
//         `tenant_${tenant_id}`,
//         folderName
//       );

//       for (const fileField of fileFields) {
//         if (fileField.fieldName === "awards_certifications") {
//           // --- Handle dynamic awards_certifications fields ---
//           const awards = [];
//           let idx = 0;
//           while (true) {
//             const fileFieldName = `awards_certifications_${idx}`;
//             const descFieldName = `description_awards_certifications_${idx}`;

//             // Find file for this index (if any)
//             const file = req.files?.find((f) => f.fieldname === fileFieldName);
//             const description = req.body[descFieldName];

//             // If nothing for this index, break (end of awards)
//             if (!file && !req.body[fileFieldName] && !description) break;

//             if (file) {
//               // New file uploaded, process and save
//               const maxSizeBytes = fileField.maxSizeMB * 1024 * 1024;
//               if (file.size > maxSizeBytes) {
//                 return res.status(400).json({
//                   message: `Award certification image must be less than ${fileField.maxSizeMB}MB`,
//                 });
//               }
//               const resizedImage = await compressImage(file.buffer, 100);
//               const fieldTenantPath = path.join(
//                 baseTenantPath,
//                 fileField.subFolder
//               );
//               const originalFileName = path.parse(file.originalname).name;
//               const extension = path.extname(file.originalname).toLowerCase();
//               const fileName = `${originalFileName}_${Date.now()}_${Math.floor(
//                 Math.random() * 10000
//               )}${extension}`;
//               const savedPath = await saveFile(
//                 resizedImage,
//                 fieldTenantPath,
//                 fileName
//               );

//               awards.push({
//                 image: savedPath,
//                 description: description || "",
//               });
//             } else if (req.body[fileFieldName]) {
//               // Existing image path (keep old image, maybe new description)
//               awards.push({
//                 image: req.body[fileFieldName],
//                 description: description || "",
//               });
//             }
//             // If neither file nor existing image path, item is omitted (deleted)
//             idx++;
//           }
//           req.body.awards_certifications = awards;
//           uploadedFiles.awards_certifications = awards;
//         }
//         else if (fileField.fieldName==="treatment_images") {

//           // --- Handle dynamic treatment_image fields (no description) ---
//           const treatments = [];
//           let idx = 0;
//           while (true) {
//             const fileFieldName = `treatment_images${idx}`;

//             const file = req.files?.find((f) => f.fieldname === fileFieldName);
//             const existingImagePath = req.body[fileFieldName];

//             // If neither new file nor old path, stop the loop
//             if (!file && !existingImagePath) break;

//             if (file) {
//               const maxSizeBytes = fileField.maxSizeMB * 1024 * 1024;
//               if (file.size > maxSizeBytes) {
//                 return res.status(400).json({
//                   message: `Treatment image must be less than ${fileField.maxSizeMB}MB`,
//                 });
//               }

//               const resizedImage = await compressImage(file.buffer, 100);
//               const fieldTenantPath = path.join(
//                 baseTenantPath,
//                 fileField.subFolder
//               );
//               const originalFileName = path.parse(file.originalname).name;
//               const extension = path.extname(file.originalname).toLowerCase();
//               const fileName = `${originalFileName}_${Date.now()}_${Math.floor(
//                 Math.random() * 10000
//               )}${extension}`;
//               const savedPath = await saveFile(resizedImage, fieldTenantPath, fileName);

//               treatments.push(savedPath);
//             } else if (existingImagePath) {
//               treatments.push(existingImagePath);
//             }

//             idx++;
//           }

//           req.body.treatment_images = treatments;
//           uploadedFiles.treatment_image = treatments;
//         }
//          else {
//           // --- Handle other file fields as before ---

//           const files =
//             req.files?.filter(
//               (file) => file.fieldname === fileField.fieldName
//             ) || [];

//           if (files.length > 0) {
//             const savedPaths = [];
//             for (let i = 0; i < files.length; i++) {
//               const file = files[i];
//               const maxSizeBytes = fileField.maxSizeMB * 1024 * 1024;
//               if (file.size > maxSizeBytes) {
//                 return res.status(400).json({
//                   message: `${fileField.fieldName.replace(
//                     /_/g,
//                     " "
//                   )} must be less than ${fileField.maxSizeMB}MB`,
//                 });
//               }
//               const resizedImage = await compressImage(file.buffer, 100);
//               const fieldTenantPath = path.join(
//                 baseTenantPath,
//                 fileField.subFolder
//               );
//               const originalFileName = path.parse(file.originalname).name;
//               const extension = path.extname(file.originalname).toLowerCase();
//               const fileName = `${originalFileName}_${Date.now()}_${Math.floor(
//                 Math.random() * 10000
//               )}${extension}`;
//               const savedPath = await saveFile(
//                 resizedImage,
//                 fieldTenantPath,
//                 fileName
//               );

//               savedPaths.push({ [fileField.fieldName]: savedPath });
//             }
//             if (fileField.multiple) {
//               req.body[fileField.fieldName] = savedPaths;
//             } else {
//               req.body[fileField.fieldName] =
//                 savedPaths[0]?.[fileField.fieldName];
//             }
//             uploadedFiles[fileField.fieldName] = savedPaths;

//           }
//         }
//       }

//       next();
//     } catch (error) {
//       console.log(error)
//       console.error("Error uploading files:", error.message);
//       return res.status(500).json({ message: error.message });
//     }
//   };
// };

// module.exports = { uploadFileMiddleware };

// ------------------------------------------------------------------------------

// const fs = require("fs");
// const path = require("path");
// const { compressImage } = require("./ImageCompress");
// const { relativePath } = require("./RelativePath");

// const uploadFileMiddleware = (options) => {
//   const {
//     folderName,
//     fileFields, // [{ fieldName, subFolder, maxSizeMB, multiple, isDocument }]
//     createValidationFn,
//     updateValidationFn,
//   } = options;

//   return async (req, res, next) => {
//     try {
//       const uploadedFiles = {};
//       const tenant_id = req.body.tenant_id || req.params.tenant_id;
//       let id = 0;

//       // Determine ID from route params based on folderName
//       switch (folderName) {
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
//         default:
//           break;
//       }

//       const settings = req.query.settings || 0;
//       if (settings != 1) {
//         if (id) {
//           await updateValidationFn(id, req.body, tenant_id);
//         } else {
//           await createValidationFn(req.body);
//         }
//       }

//       // Base paths
//       const baseTenantPath = path.join(
//         path.dirname(__dirname),
//         "uploads",
//         `tenant_${tenant_id}`,
//         folderName
//       );
//       const baseDocumentPath = path.join(
//         path.dirname(__dirname),
//         "uploads",
//         `tenant_${tenant_id}`,
//         folderName,
//         'Documents'
//       );

//       // Utility: Ensure folder exists
//       const ensureFolderExists = (folderPath) => {
//         if (!fs.existsSync(folderPath)) {
//           fs.mkdirSync(folderPath, { recursive: true });
//         }
//       };

//       // Save file utility
//       const saveFile = async (buffer, outputPath, fileName) => {
//         ensureFolderExists(outputPath);
//         const filePath = path.join(outputPath, fileName);
//         fs.writeFileSync(filePath, buffer);
//         return relativePath(filePath);
//       };

//       // Process each field
//       for (const fileField of fileFields) {
//         const isDocument = !!fileField.isDocument;

//         console.log(fileField)

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
//                   message: `Award certification must be less than ${fileField.maxSizeMB}MB`,
//                 });
//               }

//               const fieldPath = isDocument
//                 ? baseDocumentPath
//                 : path.join(baseTenantPath, fileField.subFolder);

//               const originalFileName = path.parse(file.originalname).name;
//               const extension = path.extname(file.originalname).toLowerCase();
//               const fileName = `${originalFileName}_${Date.now()}_${Math.floor(
//                 Math.random() * 10000
//               )}${extension}`;

//               const resizedImage = isDocument ? file.buffer : await compressImage(file.buffer, 100);
//               const savedPath = await saveFile(resizedImage, fieldPath, fileName);

//               awards.push({
//                 image: savedPath,
//                 description: description || "",
//               });
//             } else if (req.body[fileFieldName]) {
//               awards.push({
//                 image: req.body[fileFieldName],
//                 description: req.body[descFieldName] || "",
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

//               const fieldPath = isDocument
//                 ? baseDocumentPath
//                 : path.join(baseTenantPath, fileField.subFolder);

//               const originalFileName = path.parse(file.originalname).name;
//               const extension = path.extname(file.originalname).toLowerCase();
//               const fileName = `${originalFileName}_${Date.now()}_${Math.floor(
//                 Math.random() * 10000
//               )}${extension}`;

//               const resizedImage = isDocument ? file.buffer : await compressImage(file.buffer, 100);
//               const savedPath = await saveFile(resizedImage, fieldPath, fileName);
//               treatments.push(savedPath);
//             } else if (existingImagePath) {
//               treatments.push(existingImagePath);
//             }

//             idx++;
//           }
//           req.body.treatment_images = treatments;
//           uploadedFiles.treatment_images = treatments;
//         } else {
//           const files =
//             req.files?.filter((file) => file.fieldname === fileField.fieldName) || [];

//           if (files.length > 0) {
//             const savedPaths = [];
//             for (let i = 0; i < files.length; i++) {
//               const file = files[i];
//               const maxSizeBytes = fileField.maxSizeMB * 1024 * 1024;
//               if (file.size > maxSizeBytes) {
//                 return res.status(400).json({
//                   message: `${fileField.fieldName.replace(/_/g, " ")} must be less than ${fileField.maxSizeMB}MB`,
//                 });
//               }

//               const fieldPath = isDocument
//                 ? baseDocumentPath
//                 : path.join(baseTenantPath, fileField.subFolder);

//               const originalFileName = path.parse(file.originalname).name;
//               const extension = path.extname(file.originalname).toLowerCase();
//               const fileName = `${originalFileName}_${Date.now()}_${Math.floor(
//                 Math.random() * 10000
//               )}${extension}`;

//               const buffer = isDocument ? file.buffer : await compressImage(file.buffer, 100);
//               const savedPath = await saveFile(buffer, fieldPath, fileName);

//               savedPaths.push({ [fileField.fieldName]: savedPath });
//             }

//             req.body[fileField.fieldName] = fileField.multiple
//               ? savedPaths
//               : savedPaths[0]?.[fileField.fieldName];

//             uploadedFiles[fileField.fieldName] = savedPaths;
//           }
//         }
//       }

//       req.uploadedFiles = uploadedFiles;
//       next();
//     } catch (error) {
//       console.error("Error uploading files:", error.message);
//       return res.status(500).json({ message: "File upload failed", error: error.message });
//     }
//   };
// };

// module.exports = { uploadFileMiddleware };

// -------------------------------------------------------------------------

// const fs = require("fs");
// const path = require("path");
// const { compressImage } = require("./ImageCompress");
// const { relativePath } = require("./RelativePath");

// // Helper: Detect document files by extension
// function isDocumentFile(originalname) {
//   const ext = path.extname(originalname).toLowerCase();
//   return [
//     ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".txt", ".csv"
//   ].includes(ext);
// }

// const uploadFileMiddleware = (options) => {
//   const {
//     folderName,
//     fileFields, // [{ fieldName, subFolder, maxSizeMB, multiple, isDocument }]
//     createValidationFn,
//     updateValidationFn,
//   } = options;

//   return async (req, res, next) => {
//     try {
//       const uploadedFiles = {};
//       const tenant_id = req.body.tenant_id || req.params.tenant_id;

//       // Validate tenant_id
//       if (!tenant_id) {
//         return res.status(400).json({ message: "tenant_id is required in body or params." });
//       }

//       let id = 0;
//       switch (folderName) {
//         case "Notification": id = req.params.notification_id; break;
//         case "Payment": id = req.params.payment_id; break;
//         case "Expense": id = req.params.expense_id; break;
//         case "Supplier_products": id = req.params.supplier_product_id; break;
//         case "SupplierPayment": id = req.params.supplier_payment_id; break;
//         case "Supplier": id = req.params.supplier_id; break;
//         case "Reception": id = req.params.reception_id; break;
//         case "Asset": id = req.params.asset_id; break;
//         case "Treatment": id = req.params.treatment_id; break;
//         case "Patient": id = req.params.patient_id; break;
//         case "Dentist": id = req.params.dentist_id; break;
//         case "Clinic": id = req.params.clinic_id; break;
//         case "Tenant": id = req.params.tenant_id; break;
//         default: break;
//       }

//       //its only for clinic image update
//       const settings = req.query.settings || 0;
//       if (settings != 1) {
//         if (id) {
//           await updateValidationFn(id, req.body, tenant_id);
//         } else {
//           await createValidationFn(req.body);
//         }
//       }

//       // Base paths
//       const baseTenantPath = path.join(
//         path.dirname(__dirname),
//         "uploads",
//         `tenant_${tenant_id}`,
//         folderName
//       );

//       const basePhotoPath = path.join(baseTenantPath, "Photos");
//       const baseDocumentPath = path.join(baseTenantPath, "Documents");

//       // Utility: Ensure folder exists
//       const ensureFolderExists = (folderPath) => {
//         if (!fs.existsSync(folderPath)) {
//           fs.mkdirSync(folderPath, { recursive: true });
//         }
//       };

//       // Save file utility
//       const saveFile = async (buffer, outputPath, fileName) => {
//         ensureFolderExists(outputPath);
//         const filePath = path.join(outputPath, fileName);
//         fs.writeFileSync(filePath, buffer);
//         return relativePath(filePath);
//       };

//       console.log(id,fileFields)

//       // Process each field
//       for (const fileField of fileFields) {
//         console.log(fileField)
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
//                   message: `Award certification must be less than ${fileField.maxSizeMB}MB`,
//                 });
//               }

//               // Auto-detect document
//               const isDoc = fileField.isDocument === true || isDocumentFile(file.originalname);
//               const fieldPath = isDoc ? baseDocumentPath : basePhotoPath;

//               const originalFileName = path.parse(file.originalname).name;
//               const extension = path.extname(file.originalname).toLowerCase();
//               const fileName = `${originalFileName}_${Date.now()}_${Math.floor(Math.random() * 10000)}${extension}`;
//               const buffer = isDoc ? file.buffer : await compressImage(file.buffer, 100);
//               const savedPath = await saveFile(buffer, fieldPath, fileName);

//               awards.push({
//                 image: savedPath,
//                 description: description || "",
//               });
//             } else if (req.body[fileFieldName]) {
//               awards.push({
//                 image: req.body[fileFieldName],
//                 description: req.body[descFieldName] || "",
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

//               const isDoc = fileField.isDocument === true || isDocumentFile(file.originalname);
//               const fieldPath = isDoc ? baseDocumentPath : basePhotoPath;

//               const originalFileName = path.parse(file.originalname).name;
//               const extension = path.extname(file.originalname).toLowerCase();
//               const fileName = `${originalFileName}_${Date.now()}_${Math.floor(Math.random() * 10000)}${extension}`;
//               const buffer = isDoc ? file.buffer : await compressImage(file.buffer, 100);
//               const savedPath = await saveFile(buffer, fieldPath, fileName);

//               treatments.push(savedPath);
//             } else if (existingImagePath) {
//               treatments.push(existingImagePath);
//             }
//             idx++;
//           }
//           req.body.treatment_images = treatments;
//           uploadedFiles.treatment_images = treatments;

//         } else {
//           const files = req.files?.filter((file) => file.fieldname === fileField.fieldName) || [];

//           if (files.length > 0) {
//             const savedPaths = [];
//             for (let i = 0; i < files.length; i++) {
//               const file = files[i];
//               const maxSizeBytes = fileField.maxSizeMB * 1024 * 1024;

//               if (file.size > maxSizeBytes) {
//                 return res.status(400).json({
//                   message: `${fileField.fieldName.replace(/_/g, " ")} must be less than ${fileField.maxSizeMB}MB`,
//                 });
//               }

//               const isDoc = fileField.isDocument === true || isDocumentFile(file.originalname);
//               const fieldPath = isDoc ? baseDocumentPath : basePhotoPath;

//               const originalFileName = path.parse(file.originalname).name;
//               const extension = path.extname(file.originalname).toLowerCase();
//               const fileName = `${originalFileName}_${Date.now()}_${Math.floor(Math.random() * 10000)}${extension}`;

//               const buffer = isDoc ? file.buffer : await compressImage(file.buffer, 100);
//               const savedPath = await saveFile(buffer, fieldPath, fileName);

//               savedPaths.push({ [fileField.fieldName]: savedPath });
//             }

//             req.body[fileField.fieldName] = fileField.multiple
//               ? savedPaths
//               : savedPaths[0]?.[fileField.fieldName];

//             uploadedFiles[fileField.fieldName] = savedPaths;
//           }
//         }
//       }

//       req.uploadedFiles = uploadedFiles;
//       next();

//     } catch (error) {
//       console.error("Error uploading files:", error.message);
//       return res.status(500).json({ message: "File upload failed", error: error.message });
//     }
//   };
// };

// module.exports = { uploadFileMiddleware };

// -----------------------------------------------------------------------

const fs = require("fs");
const path = require("path");
const { compressImage } = require("./ImageCompress");
const { relativePath } = require("./RelativePath");

const uploadFileMiddleware = (options) => {
  const {
    folderName,
    fileFields, // [{ fieldName, subFolder, maxSizeMB, multiple }]
    createValidationFn,
    updateValidationFn,
  } = options;

  return async (req, res, next) => {
    try {
      // Ensure folder exists
      const ensureFolderExists = (folderPath) => {
        if (!fs.existsSync(folderPath)) {
          fs.mkdirSync(folderPath, { recursive: true });
        }
      };

      // Save file to disk and return relative path
      const saveFile = async (buffer, outputPath, fileName) => {
        ensureFolderExists(outputPath);
        const filePath = path.join(outputPath, fileName);
        fs.writeFileSync(filePath, buffer);
        return relativePath(filePath);
      };

      const uploadedFiles = {};
      const tenant_id = req.body.tenant_id || req.params.tenant_id;
      let id = 0;

      switch (folderName) {
        case "Notification":
          id = req.params.notification_id;
          break;
        case "Expense":
          id = req.params.expense_id;
          break;
        case "Supplier_products":
          id = req.params.supplier_product_id;
          break;
        case "Supplier":
          id = req.params.supplier_id;
          break;
        case "Reception":
          id = req.params.reception_id;
          break;
        case "Asset":
          id = req.params.asset_id;
          break;
        case "Treatment":
          id = req.params.treatment_id;
          break;
        case "Patient":
          id = req.params.patient_id;
          break;
        case "Dentist":
          id = req.params.dentist_id;
          break;
        case "Clinic":
          id = req.params.clinic_id;
          break;
        case "Tenant":
          id = req.params.tenant_id;
          break;
      }

      const settings = req.query.settings || 0;
      if (settings != 1) {
        if (id) {
          await updateValidationFn(id, req.body, tenant_id);
        } else {
          console.log('create')
          await createValidationFn(req.body);
        }
      }

      const baseTenantPath = path.join(
        path.dirname(__dirname),
        "uploads",
        `tenant_${tenant_id}`,
        folderName
      );

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
        if (fileField.fieldName === "awards_certifications") {
          const awards = [];
          let idx = 0;
          while (true) {
            const fileFieldName = `awards_certifications_${idx}`;
            const descFieldName = `description_awards_certifications_${idx}`;
            const file = req.files?.find((f) => f.fieldname === fileFieldName);
            const description = req.body[descFieldName];

            if (!file && !req.body[fileFieldName] && !description) break;

            if (file) {
              const maxSizeBytes = fileField.maxSizeMB * 1024 * 1024;
              if (file.size > maxSizeBytes) {
                return res.status(400).json({
                  message: `Award certification image must be less than ${fileField.maxSizeMB}MB`,
                });
              }

              const extension = path.extname(file.originalname).toLowerCase();
              const dynamicSubFolder = imageExtensions.includes(extension)
                ? "photo"
                : "document";
              const fieldTenantPath = path.join(
                baseTenantPath,
                dynamicSubFolder
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

              awards.push({ image: savedPath, description: description || "" });
            } else if (req.body[fileFieldName]) {
              awards.push({
                image: req.body[fileFieldName],
                description: description || "",
              });
            }

            idx++;
          }
          req.body.awards_certifications = awards;
          uploadedFiles.awards_certifications = awards;
        } else if (fileField.fieldName === "treatment_images") {
          const treatments = [];
          let idx = 0;
          while (true) {
            const fileFieldName = `treatment_images${idx}`;
            const file = req.files?.find((f) => f.fieldname === fileFieldName);
            const existingImagePath = req.body[fileFieldName];
            if (!file && !existingImagePath) break;

            if (file) {
              const maxSizeBytes = fileField.maxSizeMB * 1024 * 1024;
              if (file.size > maxSizeBytes) {
                return res.status(400).json({
                  message: `Treatment image must be less than ${fileField.maxSizeMB}MB`,
                });
              }

              const extension = path.extname(file.originalname).toLowerCase();
              const dynamicSubFolder = imageExtensions.includes(extension)
                ? "photo"
                : "document";
              const fieldTenantPath = path.join(
                baseTenantPath,
                dynamicSubFolder
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
              treatments.push(savedPath);
            } else if (existingImagePath) {
              treatments.push(existingImagePath);
            }

            idx++;
          }
          req.body.treatment_images = treatments;
          uploadedFiles.treatment_image = treatments;
        } else {
          // Generic file handling (single or multiple)
          const files =
            req.files?.filter(
              (file) => file.fieldname === fileField.fieldName
            ) || [];

          if (files.length > 0) {
            const savedPaths = [];

            for (let i = 0; i < files.length; i++) {
              const file = files[i];
              const maxSizeBytes = fileField.maxSizeMB * 1024 * 1024;
              if (file.size > maxSizeBytes) {
                return res.status(400).json({
                  message: `${fileField.fieldName.replace(
                    /_/g,
                    " "
                  )} must be less than ${fileField.maxSizeMB}MB`,
                });
              }

              const extension = path.extname(file.originalname).toLowerCase();
              const dynamicSubFolder = imageExtensions.includes(extension)
                ? "photo"
                : "document";
              const fieldTenantPath = path.join(
                baseTenantPath,
                dynamicSubFolder
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

              savedPaths.push(savedPath); // Only push the string path
            }

            // Always store as array of strings
            req.body[fileField.fieldName] = savedPaths;
            uploadedFiles[fileField.fieldName] = savedPaths;
          }
        }
      }

      next();
    } catch (error) {
      console.error("Error uploading files:", error.message);
      return res.status(500).json({ message: error.message });
    }
  };
};

module.exports = { uploadFileMiddleware };
