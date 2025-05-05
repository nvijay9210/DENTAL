const appointmentQuery = {
  createAppointmnetTable: `
 CREATE TABLE IF NOT EXISTS appointment (
  appointment_id     INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id          INT NOT NULL,
  patient_id         INT NOT NULL,
  dentist_id         INT NOT NULL,
  clinic_id          INT NOT NULL,
  appointment_date   DATE NOT NULL,
  start_time         TIME NOT NULL,
  end_time           TIME NOT NULL,
  status             ENUM('scheduled', 'completed', 'cancelled') NOT NULL,
  appointment_type   ENUM('in-person', 'teleconsultation') NOT NULL,
  consultation_fee   DECIMAL(10,2),
  discount_applied   DECIMAL(10,2) DEFAULT 0.00,
  payment_status     ENUM('paid', 'unpaid', 'pending') DEFAULT 'pending' NOT NULL,
  payment_method     ENUM('cash', 'card', 'insurance', 'other') NOT NULL,
  visit_reason       TEXT,
  follow_up_needed   TINYINT(1) NOT NULL DEFAULT 0,
  reminder_method    ENUM('sms', 'email', 'call', 'whatsapp') NOT NULL,
  notes              TEXT,
  created_by         VARCHAR(20) NOT NULL,
  created_time       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by         VARCHAR(20) DEFAULT NULL,
  updated_time       TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,

  -- ✅ Add comma above before constraints
  CONSTRAINT fk_appointment_tenant FOREIGN KEY (tenant_id) REFERENCES tenant(tenant_id),
  CONSTRAINT fk_appointment_patient FOREIGN KEY (patient_id) REFERENCES patient(patient_id),
  CONSTRAINT fk_appointment_dentist FOREIGN KEY (dentist_id) REFERENCES dentist(dentist_id),
  CONSTRAINT fk_appointment_clinic FOREIGN KEY (clinic_id) REFERENCES clinic(clinic_id)
);

`
};

module.exports = { appointmentQuery };
