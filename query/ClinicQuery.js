const clinicQuery = {
  createClinicTable: `CREATE TABLE IF NOT EXISTS clinic (
    clinic_id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    clinic_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NULL,
    phone_number VARCHAR(15) NOT NULL,
    alternate_phone_number VARCHAR(15) NULL,
    branch VARCHAR(50) NULL,
    website VARCHAR(255) NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    country VARCHAR(50) NOT NULL,
    pin_code VARCHAR(10) NOT NULL,
    license_number VARCHAR(15) NOT NULL,
    gst_number VARCHAR(15) NULL,
    pan_number VARCHAR(15) NULL,
    established_year INT NOT NULL,
    total_doctors INT NULL,
    total_patients INT NULL,
    total_dental_chairs INT NULL,
    number_of_assistants INT NULL,
    available_services JSON NOT NULL,
    operating_hours JSON NULL,
    insurance_supported TINYINT(1) NOT NULL DEFAULT 0,
    ratings DECIMAL(3, 2) NULL,
    reviews_count INT NULL,
    emergency_support TINYINT(1) NOT NULL DEFAULT 0,
    teleconsultation_supported TINYINT(1) NOT NULL DEFAULT 0,
    clinic_logo VARCHAR(255) NULL,
    parking_availability TINYINT(1) NOT NULL DEFAULT 0,
    pharmacy TINYINT(1) NULL,
    wifi TINYINT(1) NOT NULL DEFAULT 0,
    created_by VARCHAR(20) NOT NULL DEFAULT 'ADMIN',
    created_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(20) NULL,
    updated_time TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Foreign Key Constraint
    CONSTRAINT fk_tenant FOREIGN KEY (tenant_id) REFERENCES tenant(tenant_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    -- Index on phone number
    INDEX idx_phone_number (phone_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`,
  addClinic: `INSERT INTO clinic (
      tenant_id,
    clinic_name,
    email,
    phone_number,
    alternate_phone_number,
    branch,
    website,
    address,
    city,
    state,
    country,
    pin_code,
    license_number,
    gst_number,
    pan_number,
    established_year,
    total_doctors,
    total_patients,
    total_dental_chairs,
    number_of_assistants,
    available_services,
    operating_hours,
    insurance_supported,
    ratings,
    reviews_count,
    emergency_support,
    teleconsultation_supported,
    clinic_logo,
    parking_availability,
    pharmacy,
    wifi,
    created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
  getAllClinicByTenantId: `select clinic_id,
    tenant_id,
    clinic_name,
    email,
    phone_number,
    alternate_phone_number,
    branch,
    website,
    address,
    city,
    state,
    country,
    pin_code,
    license_number,
    gst_number,
    pan_number,
    established_year,
    total_doctors,
    total_patients,
    total_dental_chairs,
    number_of_assistants,
    available_services,
    operating_hours,
    insurance_supported,
    ratings,
    reviews_count,
    emergency_support,
    teleconsultation_supported,
    clinic_logo,
    parking_availability,
    pharmacy,
    wifi,
    created_by,
    created_time,
    updated_by,
    updated_time
FROM clinic
WHERE tenant_id = ? limit ? offset ?`,
  getClinicByTenantIdAndClinicId: `select * from clinic where tenant_id=? and clinic_id=?`,
  checkClinicExistsByTenantIdAndClinicId: `select 1 from clinic where tenant_id=? and clinic_id=?`,
  updateClinic: `UPDATE clinic SET 
  tenant_id=?,
    clinic_name = ?,
    email = ?,
    phone_number = ?,
    alternate_phone_number = ?,
    branch = ?,
    website = ?,
    address = ?,
    city = ?,
    state = ?,
    country = ?,
    pin_code = ?,
    license_number = ?,
    gst_number = ?,
    pan_number = ?,
    established_year = ?,
    total_doctors = ?,
    total_patients = ?,
    total_dental_chairs = ?,
    number_of_assistants = ?,
    available_services = ?,
    operating_hours = ?,
    insurance_supported = ?,
    ratings = ?,
    reviews_count = ?,
    emergency_support = ?,
    teleconsultation_supported = ?,
    clinic_logo = ?,
    parking_availability = ?,
    pharmacy = ?,
    wifi = ?,
    updated_by = ?,
    updated_time = CURRENT_TIMESTAMP
WHERE tenant_id=? and clinic_id = ?`,
  deleteClinicByTenantIdAndClinicId: `delete from clinic where tenant_id=? and clinic_id=?`,
};

module.exports = { clinicQuery };
