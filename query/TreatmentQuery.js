const treatmentQuery = {
  createTable: `
  CREATE TABLE IF NOT EXISTS treatment (
  treatment_id int(11) NOT NULL AUTO_INCREMENT,
  tenant_id int(11) NOT NULL,
  patient_id int(11) NOT NULL,
  dentist_id int(11) NOT NULL,
  clinic_id int(11) NOT NULL,
  diagnosis text DEFAULT NULL,
  treatment_procedure text DEFAULT NULL,
  treatment_type enum('general','cosmetic','orthodontic','surgical','emergency') NOT NULL,
  treatment_status enum('planned','ongoing','completed','cancelled') NOT NULL,
  treatment_date date NOT NULL,
  cost decimal(10,2) NOT NULL,
  duration varchar(50) NOT NULL,
  teeth_involved varchar(255) NOT NULL,
  complications text DEFAULT NULL,
  follow_up_required tinyint(1) NOT NULL DEFAULT 0,
  follow_up_date date DEFAULT NULL,
  follow_up_notes text DEFAULT NULL,
  anesthesia_used tinyint(1) NOT NULL DEFAULT 0,
  anesthesia_type varchar(100) DEFAULT NULL,
  technician_assisted varchar(255) DEFAULT NULL,
  treatment_images text DEFAULT NULL,
  notes text DEFAULT NULL,
  created_by varchar(30) NOT NULL,
  created_time timestamp NOT NULL DEFAULT current_timestamp(),
  updated_by varchar(30) DEFAULT NULL,
  updated_time timestamp NULL DEFAULT NULL ON UPDATE current_timestamp(),
  PRIMARY KEY (treatment_id),
  KEY fk_treatment_patient (patient_id),
  KEY fk_treatment_dentist (dentist_id),
  KEY fk_treatment_clinic (clinic_id),
  KEY fk_treatment_tenant (tenant_id),
  CONSTRAINT fk_treatment_clinic FOREIGN KEY (clinic_id) REFERENCES clinic (clinic_id),
  CONSTRAINT fk_treatment_dentist FOREIGN KEY (dentist_id) REFERENCES dentist (dentist_id),
  CONSTRAINT fk_treatment_patient FOREIGN KEY (patient_id) REFERENCES patient (patient_id),
  CONSTRAINT fk_treatment_tenant FOREIGN KEY (tenant_id) REFERENCES tenant (tenant_id)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
`
};

module.exports = { treatmentQuery };
