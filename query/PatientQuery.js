const patientQuery = {
  createPatientTable: `
    CREATE TABLE IF NOT EXISTS patient (
    patient_id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id INT NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    phone_number VARCHAR(15) NOT NULL,
    alternate_phone_number VARCHAR(15),
    date_of_birth DATE NOT NULL,
    gender ENUM('male', 'female', 'transgender') NOT NULL,
    blood_group VARCHAR(10),
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    country VARCHAR(50) NOT NULL,
    pin_code VARCHAR(20) NOT NULL,
    medical_history TEXT,
    current_medications TEXT,
    dentist_preference INT,
    smoking_status ENUM('never', 'former', 'current') NOT NULL,
    alcohol_consumption ENUM('never', 'occasional', 'regular') NOT NULL,
    emergency_contact_name VARCHAR(255) NOT NULL,
    emergency_contact_phone VARCHAR(15) NOT NULL,
    insurance_provider VARCHAR(255),
    insurance_policy_number VARCHAR(255),
    treatment_history JSON,
    appointment_count INT,
    last_appointment_date TIMESTAMP,
    upcoming_appointment_id INT,
    profile_picture TEXT,
    created_by VARCHAR(20) NOT NULL,
    created_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(20),
    updated_time TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    first_visit_date TIMESTAMP,

    -- Foreign Key Constraints
    CONSTRAINT fk_patient_tenant FOREIGN KEY (tenant_id) REFERENCES tenant(tenant_id),
    CONSTRAINT fk_patient_dentist FOREIGN KEY (dentist_preference) REFERENCES dentist(dentist_id)
);
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

module.exports={patientQuery}