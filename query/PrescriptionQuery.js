const prescriptionQuery = {
  createTable:`CREATE TABLE IF NOT EXISTS prescription (
  prescription_id int(11) NOT NULL AUTO_INCREMENT,
  tenant_id int(6) NOT NULL,
  clinic_id int(11) NOT NULL,
  patient_id int(11) NOT NULL,
  dentist_id int(11) NOT NULL,
  treatment_id int(11) NOT NULL,
  medication text DEFAULT NULL,
  generic_name varchar(255) DEFAULT NULL,
  brand_name varchar(255) DEFAULT NULL,
  dosage text DEFAULT NULL,
  frequency varchar(50) DEFAULT NULL,
  quantity int(11) DEFAULT NULL,
  refill_allowed tinyint(1) DEFAULT 0,
  refill_count int(11) DEFAULT 0,
  side_effects text DEFAULT NULL,
  start_date date DEFAULT NULL,
  end_date date DEFAULT NULL,
  instructions text DEFAULT NULL,
  notes text DEFAULT NULL,
  is_active tinyint(1) NOT NULL DEFAULT 1,
  created_by varchar(30) NOT NULL,
  created_time timestamp NOT NULL DEFAULT current_timestamp(),
  updated_by varchar(30) DEFAULT NULL,
  updated_time timestamp NULL DEFAULT NULL ON UPDATE current_timestamp(),

  PRIMARY KEY (prescription_id),
  KEY fk_prescription_patient (patient_id),
  KEY fk_prescription_dentist (dentist_id),
  KEY fk_prescription_treatment (treatment_id),
  KEY fk_prescription_tenant (tenant_id),
  KEY fk_prescription_clinic (clinic_id),

  CONSTRAINT fk_prescription_tenant FOREIGN KEY (tenant_id)
    REFERENCES tenant(tenant_id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  CONSTRAINT fk_prescription_clinic FOREIGN KEY (clinic_id)
    REFERENCES clinic(clinic_id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,

  CONSTRAINT fk_prescription_patient FOREIGN KEY (patient_id)
    REFERENCES patient(patient_id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,

  CONSTRAINT fk_prescription_dentist FOREIGN KEY (dentist_id)
    REFERENCES dentist(dentist_id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,

  CONSTRAINT fk_prescription_treatment FOREIGN KEY (treatment_id)
    REFERENCES treatment(treatment_id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
`,
};

module.exports = { prescriptionQuery };
