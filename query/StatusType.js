const statusTypeQuery = {
  createTable: `
    CREATE TABLE IF NOT EXISTS statustype (
  status_type_id int(11) NOT NULL AUTO_INCREMENT,
  status_type varchar(50) NOT NULL,
  created_by varchar(30) NOT NULL DEFAULT 'ADMIN',
  created_time datetime NOT NULL DEFAULT current_timestamp(),
  updated_by varchar(30) DEFAULT NULL,
  updated_time datetime DEFAULT NULL ON UPDATE current_timestamp(),
  PRIMARY KEY (status_type_id),
  UNIQUE KEY status_type (status_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
  `,
};

module.exports = { statusTypeQuery };
