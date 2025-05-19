const assetQuery = {
    createTable: `
      CREATE TABLE IF NOT EXISTS statustype (
    asset_id int(11) NOT NULL AUTO_INCREMENT,
    tenant_id int(6) NOT NULL,
    asset_name varchar(100) NOT NULL,
    asset_status varchar(50)  NULL,
    asset_type varchar(50)  NULL,
    asset_photo varchar(255)  NULL DEFAULT NULL,
    quantity int(4) NOT NULL,
    price decimal(10,2) NOT NULL,
    allocated_to varchar(100) NULL,
    purchased_date Date NOT NULL,
    purchased_by varchar(50) NULL,
    expired_date Date NOT NULL,
    invoice_number int(3) NULL,
    description text NOT NULL,
    created_by varchar(30) NOT NULL DEFAULT 'ADMIN',
    created_time datetime NOT NULL DEFAULT current_timestamp(),
    updated_by varchar(30) DEFAULT NULL,
    updated_time datetime DEFAULT NULL ON UPDATE current_timestamp(),
    PRIMARY KEY (asset_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
    `,
  };
  
  module.exports = { assetQuery };
  