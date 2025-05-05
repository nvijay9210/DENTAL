const { uploadFileMiddleware } = require('./UploadFiles');
const patientValidation = require('../validations/PatientValidation');

const UploadPatientFiles = uploadFileMiddleware({
  folderName: 'Patient',
  fileFields: [
    { fieldName: 'profile_picture', subFolder: 'Photos',maxSizeMB: 2 }
  ],
  createValidationFn: patientValidation.createPatientValidation,
  updateValidationFn: patientValidation.updatePatientValidation,
});

module.exports = { UploadPatientFiles };
