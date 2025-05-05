const dentistQuery = {
  createDentistTable: `CREATE TABLE IF NOT EXISTS dentist (
  dentist_id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,

  first_name VARCHAR(50) NOT NULL,
  last_name VARCHAR(50) NOT NULL,
  gender VARCHAR(10),
  date_of_birth DATE,
  email VARCHAR(255),
  phone_number VARCHAR(15) NOT NULL,
  alternate_phone_number VARCHAR(15),

  specialization JSON NOT NULL,
  qualifications JSON NOT NULL,

  experience_years INT(2) NOT NULL,
  license_number VARCHAR(20) NOT NULL,

  clinic_name VARCHAR(150),
  clinic_address VARCHAR(300) NULL,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL,
  country VARCHAR(50) NOT NULL,
  pin_code VARCHAR(20) NOT NULL,

  working_hours JSON,
  available_days JSON,

  consultation_fee DECIMAL(10,2),
  ratings DECIMAL(3,2),
  reviews_count INT,
  appointment_count INT,

  profile_picture VARCHAR(255),
  bio JSON,

  teleconsultation_supported TINYINT(1) NOT NULL DEFAULT 0,
  insurance_supported TINYINT(1) NOT NULL DEFAULT 0,

  languages_spoken JSON,
  awards_certifications VARCHAR(255),
  social_links JSON,

  last_login TIMESTAMP NULL DEFAULT NULL,

  created_by VARCHAR(20) NOT NULL,
  created_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by VARCHAR(20),
  updated_time TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,

  -- Foreign Key
  CONSTRAINT fk_dentist_tenant FOREIGN KEY (tenant_id) REFERENCES tenant(tenant_id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  -- Indexes
  INDEX idx_tenant_id (tenant_id),
  INDEX idx_phone_number (phone_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      `,
  addDentist: `INSERT INTO dentist (
      tenant_id,
      first_name,
      last_name,
      gender,
      dob,
      email,
      phone_number,
      alternate_phone_number,
      specialization,
      experience_years,
      license_number,
      qualifications,
      clinic_name,
      clinic_address,
      city,
      state,
      country,
      pin_code,
      working_hours,
      available_days,
      consultation_fee,
      ratings,
      reviews_count,
      appointment_count,
      profile_picture,
      bio,
      teleconsultation_supported,
      insurance_supported,
      languages_spoken,
      awards_certifications,
      social_links,
      last_login,
      created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?,?,?);`,

  getAllDentistsByTenantId: `SELECT
      dentist_id,
      tenant_id,
      first_name,
      last_name,
      gender,
      dob,
      email,
      phone_number,
      alternate_phone_number,
      specialization,
      experience_years,
      license_number,
      qualifications,
      clinic_name,
      clinic_address,
      city,
      state,
      country,
      pin_code,
      working_hours,
      available_days,
      consultation_fee,
      ratings,
      reviews_count,
      appointment_count,
      profile_picture,
      bio,
      teleconsultation_supported,
      insurance_supported,
      languages_spoken,
      awards_certifications,
      social_links,
      last_login,
      created_by,
      created_time,
      updated_by,
      updated_time
    FROM dentist
    WHERE tenant_id = ? LIMIT ? OFFSET ?`,

  getDentistByTenantIdAndDentistId: `SELECT * FROM dentist WHERE tenant_id = ? AND dentist_id = ?;`,

  checkDentistExistsByTenantIdAndDentistId: `SELECT 1 FROM dentist WHERE tenant_id = ? AND dentist_id = ?;`,

  updateDentist: `UPDATE dentist SET
      tenant_id = ?,
      first_name = ?,
      last_name = ?,
      gender = ?,
      dob = ?,
      email = ?,
      phone_number = ?,
      alternate_phone_number = ?,
      specialization = ?,
      experience_years = ?,
      license_number = ?,
      qualifications = ?,
      clinic_name = ?,
      clinic_address = ?,
      city = ?,
      state = ?,
      country = ?,
      pin_code = ?,
      working_hours = ?,
      available_days = ?,
      consultation_fee = ?,
      ratings = ?,
      reviews_count = ?,
      appointment_count = ?,
      profile_picture = ?,
      bio = ?,
      teleconsultation_supported = ?,
      insurance_supported = ?,
      languages_spoken = ?,
      awards_certifications = ?,
      social_links = ?,
      last_login = ?,
      updated_by = ?,
      updated_time = CURRENT_TIMESTAMP
    WHERE tenant_id = ? AND dentist_id = ?;`,

  deleteDentistByTenantIdAndDentistId: `DELETE FROM dentist WHERE tenant_id = ? AND dentist_id = ?;`,
};

module.exports = { dentistQuery };
