const appointmentQuery = {
  createAppointmnetTable: 
`CREATE TABLE IF NOT EXISTS appointment (
  appointment_id int(11) NOT NULL AUTO_INCREMENT,
  tenant_id int(6) NOT NULL,
  patient_id int(11) NOT NULL,
  dentist_id int(11) NOT NULL,
  clinic_id int(11) NOT NULL,
  appointment_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  status enum('SC','CP','CL') NOT NULL DEFAULT 'SC',
  appointment_type enum('IP','TC') NOT NULL DEFAULT 'TC',
  consultation_fee decimal(10,2) DEFAULT NULL,
  discount_applied decimal(10,2) DEFAULT 0.00,
  payment_status enum('P','UP','PD') NOT NULL DEFAULT 'P',
  payment_method enum('CH','CD','IN','O') NOT NULL,
  visit_reason text DEFAULT NULL,
  follow_up_needed tinyint(1) NOT NULL DEFAULT 0,
  reminder_method enum('SMS','EM','CL','WA') NOT NULL DEFAULT 'SMS',
  notes text DEFAULT NULL,
  created_by varchar(20) NOT NULL,
  created_time timestamp NOT NULL DEFAULT current_timestamp(),
  updated_by varchar(20) DEFAULT NULL,
  updated_time timestamp NULL DEFAULT NULL ON UPDATE current_timestamp(),
  PRIMARY KEY (appointment_id),
  KEY fk_appointment_tenant (tenant_id),
  KEY fk_appointment_patient (patient_id),
  KEY fk_appointment_dentist (dentist_id),
  KEY fk_appointment_clinic (clinic_id),
  CONSTRAINT fk_appointment_clinic FOREIGN KEY (clinic_id) REFERENCES clinic (clinic_id),
  CONSTRAINT fk_appointment_dentist FOREIGN KEY (dentist_id) REFERENCES dentist (dentist_id),
  CONSTRAINT fk_appointment_patient FOREIGN KEY (patient_id) REFERENCES patient (patient_id),
  CONSTRAINT fk_appointment_tenant FOREIGN KEY (tenant_id) REFERENCES tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;`

};

module.exports = { appointmentQuery };
