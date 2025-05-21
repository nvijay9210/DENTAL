const assetQuery = {
    createTable: 
      `
      CREATE TABLE IF NOT EXISTS asset (
  asset_id int(11) NOT NULL AUTO_INCREMENT,
  tenant_id int(6) NOT NULL,
  clinic_id int(11) NOT NULL,
  asset_name varchar(100) NOT NULL,
  asset_status varchar(50) DEFAULT NULL,
  asset_type varchar(50) DEFAULT NULL,
  asset_photo varchar(255) DEFAULT NULL,
  quantity int(4) DEFAULT NULL,
  price decimal(10,2) DEFAULT NULL,
  allocated_to varchar(100) DEFAULT NULL,
  purchased_date date DEFAULT NULL,
  purchased_by varchar(50) NOT NULL,
  expired_date date DEFAULT NULL,
  invoice_number int(3) DEFAULT NULL,
  description text DEFAULT NULL,
  created_by varchar(30) NOT NULL DEFAULT 'ADMIN',
  created_time datetime NOT NULL DEFAULT current_timestamp(),
  updated_by varchar(30) DEFAULT NULL,
  updated_time datetime DEFAULT NULL ON UPDATE current_timestamp(),
  PRIMARY KEY (asset_id)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
 `
  };
  
  module.exports = { assetQuery };
  