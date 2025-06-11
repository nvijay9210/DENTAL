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

//       if (id) {
//         await updateValidationFn(id, req.body, tenant_id);
//       } else {
//         await createValidationFn(req.body);
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
//           console.log('treatment_images place')
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
//               console.log('treatmentimage:',savedPath)
        
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
//           console.log('else place')
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




const path = require("path");
const { compressImage } = require("./ImageCompress");
const { uploadToMinio } = require("./UploadMinio");

const uploadFileMiddleware = (options) => {
  const {
    folderName,
    fileFields,
    createValidationFn,
    updateValidationFn,
  } = options;

  return async (req, res, next) => {
    try {
      const uploadedFiles = {};
      const tenant_id = req.body.tenant_id || req.params.tenant_id;
      let id = 0;

      switch (folderName) {
        case "Asset": id = req.params.asset_id; break;
        case "Treatment": id = req.params.treatment_id; break;
        case "Patient": id = req.params.patient_id; break;
        case "Dentist": id = req.params.dentist_id; break;
        case "Clinic": id = req.params.clinic_id; break;
        case "Tenant": id = req.params.tenant_id; break;
        default: break;
      }

      if (id) {
        await updateValidationFn(id, req.body, tenant_id);
      } else {
        await createValidationFn(req.body);
      }

      for (const fileField of fileFields) {
        if (fileField.fieldName === "awards_certifications") {
          const awards = [];
          let idx = 0;

          while (true) {
            const fileFieldName = `awards_certifications_${idx}`;
            const descFieldName = `description_awards_certifications_${idx}`;
            const file = req.files?.find(f => f.fieldname === fileFieldName);
            const description = req.body[descFieldName];

            if (!file && !req.body[fileFieldName] && !description) break;

            if (file) {
              if (file.size > fileField.maxSizeMB * 1024 * 1024) {
                return res.status(400).json({ message: `Award image must be < ${fileField.maxSizeMB}MB` });
              }
              const resized = await compressImage(file.buffer, 100);
              const imagePath = await uploadToMinio(
                resized,
                `${folderName}/tenant_${tenant_id}/${fileField.subFolder}`,
                file.originalname,
                file.mimetype
              );

              awards.push({ image: imagePath, description: description || "" });
            } else if (req.body[fileFieldName]) {
              awards.push({ image: req.body[fileFieldName], description: description || "" });
            }

            idx++;
          }

          req.body.awards_certifications = awards;
          uploadedFiles.awards_certifications = awards;
        }

        else if (fileField.fieldName === "treatment_images") {
          const treatments = [];
          let idx = 0;

          while (true) {
            const fileFieldName = `treatment_images${idx}`;
            const file = req.files?.find(f => f.fieldname === fileFieldName);
            const existing = req.body[fileFieldName];

            if (!file && !existing) break;

            if (file) {
              if (file.size > fileField.maxSizeMB * 1024 * 1024) {
                return res.status(400).json({ message: `Treatment image must be < ${fileField.maxSizeMB}MB` });
              }

              const resized = await compressImage(file.buffer, 100);
              const pathOnMinio = await uploadToMinio(
                resized,
                `${folderName}/tenant_${tenant_id}/${fileField.subFolder}`,
                file.originalname,
                file.mimetype
              );

              treatments.push(pathOnMinio);
            } else if (existing) {
              treatments.push(existing);
            }

            idx++;
          }

          req.body.treatment_images = treatments;
          uploadedFiles.treatment_images = treatments;
        }

        else {
          const files = req.files?.filter(f => f.fieldname === fileField.fieldName) || [];

          console.log(files)

          if (files.length > 0) {
            const savedPaths = [];

            for (const file of files) {
              if (file.size > fileField.maxSizeMB * 1024 * 1024) {
                return res.status(400).json({
                  message: `${fileField.fieldName.replace(/_/g, " ")} must be < ${fileField.maxSizeMB}MB`,
                });
              }

              const resized = await compressImage(file.buffer, 100);
              const pathOnMinio = await uploadToMinio(
                resized,
                `${folderName}/tenant_${tenant_id}/${fileField.subFolder}`,
                file.originalname,
                file.mimetype
              );

              savedPaths.push({ [fileField.fieldName]: pathOnMinio });
            }

            req.body[fileField.fieldName] = fileField.multiple
              ? savedPaths.map(obj => Object.values(obj)[0])
              : savedPaths[0][fileField.fieldName];

            uploadedFiles[fileField.fieldName] = savedPaths;
          }
        }
      }

      next();
    } catch (error) {
      console.error("Upload Error:", error.message);
      return res.status(500).json({ message: "File upload failed", error: error.message });
    }
  };
};

module.exports = { uploadFileMiddleware };

