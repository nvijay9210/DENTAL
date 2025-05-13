const patientQuery = {
  createPatientTable: `
    CREATE TABLE IF NOT EXISTS patient (
  patient_id int(11) NOT NULL AUTO_INCREMENT,
  tenant_id int(6) NOT NULL,
  first_name varchar(50) NOT NULL,
  last_name varchar(50) NOT NULL,
  email varchar(255) DEFAULT NULL,
  phone_number varchar(15) NOT NULL,
  alternate_phone_number varchar(15) DEFAULT NULL,
  date_of_birth date NOT NULL,
  gender enum('M','F','TG') NOT NULL DEFAULT 'M',
  blood_group varchar(10) DEFAULT NULL,
  address text NOT NULL,
  city varchar(100) NOT NULL,
  state varchar(100) NOT NULL,
  country varchar(50) NOT NULL,
  pin_code varchar(6) NOT NULL,
  pre_history text DEFAULT NULL,
  current_medications text DEFAULT NULL,
  dentist_preference int(11) DEFAULT NULL,
  smoking_status enum('N','F','C') NOT NULL DEFAULT 'N',
  alcohol_consumption enum('N','OC','R') NOT NULL,
  emergency_contact_name varchar(255) NOT NULL,
  emergency_contact_phone varchar(15) NOT NULL,
  insurance_provider varchar(255) DEFAULT NULL,
  insurance_policy_number varchar(10) DEFAULT NULL,
  treatment_history longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(treatment_history)),
  appointment_count int(11) DEFAULT NULL,
  last_appointment_date timestamp NULL DEFAULT NULL,
  profile_picture varchar(255) DEFAULT NULL,
  created_by varchar(30) NOT NULL,
  created_time timestamp NOT NULL DEFAULT current_timestamp(),
  updated_by varchar(30) DEFAULT NULL,
  updated_time timestamp NULL DEFAULT NULL ON UPDATE current_timestamp(),
  first_visit_date timestamp NULL DEFAULT NULL,
  referred_by varchar(100) DEFAULT NULL,
  profession varchar(100) DEFAULT NULL,
  PRIMARY KEY (patient_id),
  KEY fk_patient_tenant (tenant_id),
  KEY fk_patient_dentist (dentist_preference),
  CONSTRAINT fk_patient_dentist FOREIGN KEY (dentist_preference) REFERENCES dentist (dentist_id)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  CONSTRAINT fk_patient_tenant FOREIGN KEY (tenant_id) REFERENCES tenant (tenant_id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
    `,
  addPatient: `
    INSERT INTO patient (
    tenant_id, first_name, last_name, email, phone_number,
    alternate_phone_number, date_of_birth, gender, blood_group,
    address, city, state, country, pin_code, smoking_status,
    alcohol_consumption, emergency_contact_name, emergency_contact_phone,
    insurance_provider, insurance_policy_number, profile_picture, created_by
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`,
  getAllPatientByTenantId: `SELECT *
FROM patient
WHERE tenant_id = ? limit ? offset ?;
`,
  getPatientByTenantIdAndPatientId: `
SELECT *
FROM patient
WHERE tenant_id = ? AND patient_id = ?;
`,
  updatePatientByTenantIdAndPatientId: `
UPDATE patient
SET
    first_name = ?, last_name = ?, email = ?, phone_number = ?, alter_phone_number = ?,
    date_of_birth = ?, gender = ?, blood_group = ?, address = ?, city = ?, state = ?, country = ?, pin_code = ?,
    medical_history = ?, current_medications = ?, dentist_preference = ?, smoking_status = ?, alcohol_consumption = ?,
    emergency_contact_name = ?, emergency_contact_phone = ?, insurance_provider = ?, insurance_policy_number = ?,
    treatment_history = ?, appointment_count = ?, last_appointment_date = ?, upcoming_appointment_id = ?,
    profile_picture = ?, updated_by = ?, updated_time = NOW(), first_visit_date = ?
WHERE patient_id = ? AND tenant_id = ?;
`,
  deletePatientByTenantId: `
DELETE FROM patient
WHERE patient_id = ? AND tenant_id = ?;
`,
};

module.exports = { patientQuery };
