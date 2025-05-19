const expenseQuery = {
    createTable: `
      CREATE TABLE IF NOT EXISTS asset (
    expense_id int(11) NOT NULL AUTO_INCREMENT,
    tenant_id int(6) NOT NULL,
    expense_amount decimal(10,2) NULL,
    expense_category varchar(255)  NULL,
    expense_reason varchar(255)  NULL,
    expense_date Date  NULL,
    mode_of_payment varchar(255) NULL,
    receipt_number varchar(100) NULL,
    created_by varchar(30) NOT NULL,
    created_time datetime NOT NULL DEFAULT current_timestamp(),
    updated_by varchar(30) DEFAULT NULL,
    updated_time datetime DEFAULT NULL ON UPDATE current_timestamp(),
    PRIMARY KEY (asset_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
    `,
  };
  
  module.exports = { expenseQuery };
  