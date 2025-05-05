const treatmentQuery = {
  createTable: `CREATE TABLE IF NOT EXISTS treatment (
    treatment_id        INT(11) PRIMARY KEY AUTO_INCREMENT,
    tenant_id           INT NOT NULL,
    patient_id          INT NOT NULL,
    dentist_id          INT NOT NULL,
    clinic_id           INT NOT NULL,
    diagnosis           TEXT,
    treatment_procedure TEXT,
    treatment_type      ENUM('general', 'cosmetic', 'orthodontic', 'surgical', 'emergency') NOT NULL,
    treatment_status    ENUM('planned', 'ongoing', 'completed', 'cancelled') NOT NULL,
    treatment_date      DATE NOT NULL,
    cost                DECIMAL(10,2) NOT NULL,
    duration            VARCHAR(50) NOT NULL,
    teeth_involved      VARCHAR(255) NOT NULL,
    complications       TEXT,
    follow_up_required  TINYINT(1) NOT NULL DEFAULT 0,
    follow_up_date      DATE,
    follow_up_notes     TEXT,
    anesthesia_used     TINYINT(1) NOT NULL DEFAULT 0,
    anesthesia_type     VARCHAR(100),
    technician_assisted VARCHAR(255),
    images              TEXT,
    notes               TEXT,
    created_by          VARCHAR(20) NOT NULL,
    created_time        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by          VARCHAR(20),
    updated_time        TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,

    -- Foreign key constraints
    CONSTRAINT fk_treatment_patient FOREIGN KEY (patient_id) REFERENCES patient(patient_id),
    CONSTRAINT fk_treatment_dentist FOREIGN KEY (dentist_id) REFERENCES dentist(dentist_id),
    CONSTRAINT fk_treatment_clinic FOREIGN KEY (clinic_id) REFERENCES clinic(clinic_id),
    CONSTRAINT fk_treatment_tenant FOREIGN KEY (tenant_id) REFERENCES tenant(tenant_id)
  );`
};

module.exports = { treatmentQuery };
