const treatmentQuery = {
  createTable: `CREATE TABLE IF NOT EXISTS treatment (
  treatment_id INT(11) NOT NULL AUTO_INCREMENT,
  tenant_id INT(11) NOT NULL,
  patient_id INT(11) NOT NULL,
  dentist_id INT(11) NOT NULL,
  clinic_id INT(11) NOT NULL,
  diagnosis TEXT DEFAULT NULL,
  treatment_procedure TEXT DEFAULT NULL,
  treatment_type ENUM('general', 'cosmetic', 'orthodontic', 'surgical', 'emergency') NOT NULL,
  treatment_status ENUM('planned', 'ongoing', 'completed', 'cancelled') NOT NULL,
  treatment_date DATE NOT NULL,
  cost DECIMAL(10,2) NOT NULL,
  duration VARCHAR(50) NOT NULL,
  teeth_involved VARCHAR(255) NOT NULL,
  complications TEXT DEFAULT NULL,
  follow_up_required TINYINT(1) NOT NULL DEFAULT 0,
  follow_up_date DATE DEFAULT NULL,
  follow_up_notes TEXT DEFAULT NULL,
  anesthesia_used TINYINT(1) NOT NULL DEFAULT 0,
  anesthesia_type VARCHAR(100) DEFAULT NULL,
  technician_assisted VARCHAR(255) DEFAULT NULL,
  treatment_images TEXT DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  created_by VARCHAR(20) NOT NULL,
  created_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by VARCHAR(20) DEFAULT NULL,
  updated_time TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (treatment_id),
  KEY fk_treatment_patient (patient_id),
  KEY fk_treatment_dentist (dentist_id),
  KEY fk_treatment_clinic (clinic_id),
  KEY fk_treatment_tenant (tenant_id),
  CONSTRAINT fk_treatment_clinic FOREIGN KEY (clinic_id) REFERENCES clinic (clinic_id),
  CONSTRAINT fk_treatment_dentist FOREIGN KEY (dentist_id) REFERENCES dentist (dentist_id),
  CONSTRAINT fk_treatment_patient FOREIGN KEY (patient_id) REFERENCES patient (patient_id),
  CONSTRAINT fk_treatment_tenant FOREIGN KEY (tenant_id) REFERENCES tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
`
};

module.exports = { treatmentQuery };
