const prescriptionQuery = {
  createTable: `CREATE TABLE IF NOT EXISTS prescription (
  prescription_id       INT(11) PRIMARY KEY AUTO_INCREMENT, -- Primary Key
  tenant_id             INT NOT NULL,                       
  patient_id            INT NOT NULL,                       -- Foreign Key
  dentist_id            INT NOT NULL,                       -- Foreign Key
  treatment_id          INT NOT NULL,                       -- Foreign Key
  medication            TEXT,                              -- Null
  generic_name          VARCHAR(255),                      -- Null
  brand_name            VARCHAR(255),                      -- Null
  dosage                TEXT,                              -- Null
  frequency             VARCHAR(50),                       -- Null
  quantity              INT,                               -- Null
  refill_allowed        BOOLEAN DEFAULT FALSE,             -- Default: FALSE, Null
  refill_count          INT DEFAULT 0,                     -- Default: 0, Null
  side_effects          TEXT,                              -- Null
  start_date            DATE,                              -- Null
  end_date              DATE,                              -- Null
  instructions          TEXT,                              -- Null
  notes                 TEXT,                              -- Null
  is_active             BOOLEAN DEFAULT TRUE NOT NULL,     -- Default: TRUE, Not Null
  created_by            VARCHAR(20) NOT NULL,              -- Not Null
  created_time          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, -- Not Null
  updated_by            VARCHAR(20),                       -- Null
  updated_time          TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP, -- Null

  -- Foreign key constraints
  CONSTRAINT fk_prescription_patient FOREIGN KEY (patient_id) REFERENCES patient(patient_id),
  CONSTRAINT fk_prescription_dentist FOREIGN KEY (dentist_id) REFERENCES dentist(dentist_id),
  CONSTRAINT fk_prescription_treatment FOREIGN KEY (treatment_id) REFERENCES treatment(treatment_id),
    CONSTRAINT fk_prescription_tenant FOREIGN KEY (tenant_id) REFERENCES tenant(tenant_id)
);`,
};

module.exports = { prescriptionQuery };
