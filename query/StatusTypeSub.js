const statusTypeSubQuery = {
  createTable: `
      CREATE TABLE IF NOT EXISTS statustypesub (
  status_type_sub_id int(11) NOT NULL AUTO_INCREMENT,
  tenant_id int(6) NOT NULL,
  status_type_id int(11) NOT NULL,
  status_type_sub varchar(50) NOT NULL,
  status_type_sub_ref varchar(50) NOT NULL,
  created_by varchar(30) NOT NULL,
  created_time datetime NOT NULL DEFAULT current_timestamp(),
  updated_by varchar(30) DEFAULT NULL,
  updated_time datetime DEFAULT NULL ON UPDATE current_timestamp(),
  PRIMARY KEY (status_type_sub_id),
  KEY status_type_id (status_type_id),
  CONSTRAINT statustypesub_ibfk_1 FOREIGN KEY (status_type_id) REFERENCES statustype (status_type_id) ON DELETE CASCADE
) ENGINE=InnoDB  DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
    `,
};

module.exports = { statusTypeSubQuery };
