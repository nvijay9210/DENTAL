const { CustomError } = require("../middlewares/CustomeError");
const { checkIfExists, checkIfIdExists } = require("../models/checkIfExists");
const patientService = require("../services/PatientService");
const {
  validateTenantIdAndPageAndLimit,
} = require("../validations/CommonValidations");
const patientValidation = require("../validations/PatientValidation");

exports.createPatient = async (req, res, next) => {
  const details = req.body;
  const token=req.token;
  const realm=req.realm;
  const group = req.user.groups[0]; // 'dental-1-5'
const value = group.split('-')[2]; // '5'

  

  try {
    // Validate patient data
    await patientValidation.createPatientValidation(details);

    // Create a new patient
    const id = await patientService.createPatient(details,token,realm,value);
    res.status(200).json({ message: "Patient created", id });
  } catch (err) {
    next(err);
  }
};

exports.getAllPatientsByTenantId = async (req, res, next) => {
  const { tenant_id } = req.params;
  const { page, limit } = req.query;
  await validateTenantIdAndPageAndLimit(tenant_id, page, limit);
  try {
    const patients = await patientService.getAllPatientsByTenantId(
      tenant_id,
      page,
      limit
    );
    res.status(200).json(patients);
  } catch (err) {
    next(err);
  }
};
exports.getAllPatientsByTenantIdAndClinicId = async (req, res, next) => {
  const { tenant_id,clinic_id } = req.params;
  const { page,limit } = req.query;
  try {
    const patients = await patientService.getAllPatientsByTenantIdAndClinicId(
      tenant_id,
      clinic_id,
      page,limit
    );
    res.status(200).json(patients);
  } catch (err) {
    next(err);
  }
};

//no use dummy function
exports.getAllPatientsByTenantIdAndClinicIdAndDentistId = async (req, res, next) => {
  const { tenant_id,clinic_id } = req.params;
  const { page,limit } = req.query;
  try {
    const patients = await patientService.getAllPatientsByTenantIdAndClinicId(
      tenant_id,
      clinic_id,
      page,limit
    );
    res.status(200).json(patients);
  } catch (err) {
    next(err);
  }
};

exports.getAllPatientsByTenantIdAndClinicIdUsingAppointmentStatus = async (req, res, next) => {
  const { tenant_id,clinic_id,dentist_id } = req.params;
  const { page,limit } = req.query;
  try {
    const patients = await patientService.getAllPatientsByTenantIdAndClinicIdUsingAppointmentStatus(
      tenant_id,
      clinic_id,
      dentist_id,
      page,limit
    );
    res.status(200).json(patients);
  } catch (err) {
    next(err);
  }
};

// getTopPatientsByAppointmentPeriod
// exports.getPeriodSummaryByPatient = async (req, res, next) => {
//   const { tenant_id,clinic_id,dentist_id } = req.params;
//   // const {period} = req.query
//   await checkIfIdExists('tenant','tenant_id',tenant_id)
//   await checkIfIdExists('clinic','clinic_id',clinic_id)
//   await checkIfIdExists('dentist','dentist_id',dentist_id)
//   try {
//     const patients = await patientService.getPeriodSummaryByPatient(
//       tenant_id,clinic_id
//     );
//     res.status(200).json(patients);
//   } catch (err) {
//     next(err);
//   }
// };

exports.getMostVisitedPatientsByDentistPeriods = async (req, res, next) => {
  const { tenant_id,clinic_id,dentist_id } = req.params;
  // const {period} = req.query
  await checkIfIdExists('tenant','tenant_id',tenant_id)
  await checkIfIdExists('clinic','clinic_id',clinic_id)
  await checkIfIdExists('dentist','dentist_id',dentist_id)
  try {
    const patients = await patientService.getMostVisitedPatientsByDentistPeriods(
      tenant_id,dentist_id,clinic_id
    );
    res.status(200).json(patients);
  } catch (err) {
    next(err);
  }
};

exports.getMostVisitedPatientsByClinicPeriods = async (req, res, next) => {
  const { tenant_id,clinic_id } = req.params;
  const { startDate, endDate, dentist_id } = req.query;
  await checkIfIdExists('tenant','tenant_id',tenant_id)
  await checkIfIdExists('clinic','clinic_id',clinic_id)
  try {
    const patients = await patientService.getMostVisitedPatientsByClinicPeriods(
      tenant_id, clinic_id, startDate, endDate, dentist_id
    );
    res.status(200).json(patients);
  } catch (err) {
    next(err);
  }
};

exports.getNewPatientsByClinicPeriods = async (req, res, next) => {
  const { tenant_id,clinic_id } = req.params;
  await checkIfIdExists('tenant','tenant_id',tenant_id)
  await checkIfIdExists('clinic','clinic_id',clinic_id)
  try {
    const patients = await patientService.getNewPatientsTrends(
      tenant_id,clinic_id
    );
    res.status(200).json(patients);
  } catch (err) {
    next(err);
  }
};

exports.getNewPatientsTrendsByDentistAndClinic = async (req, res, next) => {
  const { tenant_id,clinic_id,dentist_id } = req.params;
  await checkIfIdExists('tenant','tenant_id',tenant_id)
  await checkIfIdExists('clinic','clinic_id',clinic_id)
  await checkIfIdExists('dentist','dentist_id',dentist_id)
  try {
    const patients = await patientService.getNewPatientsTrendsByDentistAndClinic(
      tenant_id,clinic_id,dentist_id
    );
    res.status(200).json(patients);
  } catch (err) {
    next(err);
  }
};

exports.getAgeGenderByDentist = async (req, res, next) => {
  const { tenant_id,clinic_id,dentist_id } = req.params;
  await checkIfIdExists('tenant','tenant_id',tenant_id)
  await checkIfIdExists('clinic','clinic_id',clinic_id)
  await checkIfIdExists('dentist','dentist_id',dentist_id)
  try {
    const patients = await patientService.getAgeGenderByDentist(
      tenant_id,clinic_id,dentist_id
    );
    res.status(200).json(patients);
  } catch (err) {
    next(err);
  }
};

exports.getAgeGenderByClinic = async (req, res, next) => {
  const { tenant_id,clinic_id } = req.params;
  await checkIfIdExists('tenant','tenant_id',tenant_id)
  await checkIfIdExists('clinic','clinic_id',clinic_id)
  try {
    const patients = await patientService.getAgeGenderByClinic(
      tenant_id,clinic_id
    );
    res.status(200).json(patients);
  } catch (err) {
    next(err);
  }
};

exports.groupToothProceduresByTimeRangeCumulative = async (req, res, next) => {
  const { tenant_id,clinic_id } = req.params;
  const { dentist_id,startDate,endDate } = req.query;
  await checkIfIdExists('tenant','tenant_id',tenant_id)
  await checkIfIdExists('clinic','clinic_id',clinic_id)
  try {
    if(!startDate || !endDate) throw new CustomError('Requeired startDate,endDate',400)
    const patients = await patientService.groupToothProceduresByTimeRangeCumulative(
      tenant_id,clinic_id,dentist_id,startDate,endDate
    );
    res.status(200).json(patients);
  } catch (err) {
    next(err);
  }
};

exports.groupToothProceduresByTimeRangeCumulativeByDentist = async (req, res, next) => {
  const { tenant_id,clinic_id,dentist_id } = req.params;
  await checkIfIdExists('tenant','tenant_id',tenant_id)
  await checkIfIdExists('clinic','clinic_id',clinic_id)
  await checkIfIdExists('dentist','dentist_id',dentist_id)
  try {
    const patients = await patientService.groupToothProceduresByTimeRangeCumulativeByDentist(
      tenant_id,clinic_id,dentist_id
    );
    res.status(200).json(patients);
  } catch (err) {
    next(err);
  }
};

exports.getPatientByTenantIdAndPatientId = async (req, res, next) => {
  const { patient_id, tenant_id } = req.params;
  try {
    // Validate if the patient exists
    const patient1 = await checkIfExists(
      "patient",
      "patient_id",
      patient_id,
      tenant_id
    );

    if (!patient1) throw new CustomError("Patient not found", 404);

    // Fetch patient details
    const patient = await patientService.getPatientByTenantIdAndPatientId(
      tenant_id,
      patient_id
    );
    res.status(200).json(patient);
  } catch (err) {
    next(err);
  }
};

exports.updatePatient = async (req, res, next) => {
  const { patient_id, tenant_id } = req.params;
  const details = req.body;

  try {
    // Validate update input
    await patientValidation.updatePatientValidation(
      patient_id,
      details,
      tenant_id
    );

    // Update patient
    await patientService.updatePatient(patient_id, details, tenant_id);
    res.status(200).json({ message: "Patient updated successfully" });
  } catch (err) {
    next(err);
  }
};

exports.deletePatientByTenantIdAndPatientId = async (req, res, next) => {
  const { patient_id, tenant_id } = req.params;
  try {
    const patient = await checkIfExists(
      "patient",
      "patient_id",
      patient_id,
      tenant_id
    );

    if (!patient) throw new CustomError("Patient not found", 404);

    // Delete patient
    await patientService.deletePatientByTenantIdAndPatientId(
      tenant_id,
      patient_id
    );
    res.status(200).json({ message: "Patient deleted successfully" });
  } catch (err) {
    next(err);
  }
};
