const tenantQuery={
    createTenantTable:`
    CREATE TABLE IF NOT EXISTS tenant (
  tenant_id int(6) NOT NULL AUTO_INCREMENT,
  tenant_name varchar(50) NOT NULL,
  tenant_domain varchar(255) NOT NULL,
  created_time timestamp NOT NULL DEFAULT current_timestamp(),
  created_by varchar(30) NOT NULL DEFAULT 'ADMIN',
  updated_time timestamp NULL DEFAULT NULL ON UPDATE current_timestamp(),
  updated_by varchar(30) DEFAULT NULL,
  tenant_app_name varchar(100) DEFAULT NULL,
  tenant_app_logo varchar(255) DEFAULT NULL,
  tenant_app_font varchar(50) DEFAULT NULL,
  tenant_app_themes longtext DEFAULT NULL,
  PRIMARY KEY (tenant_id)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
 `
,
addTenant:`Insert into tenant (tenant_name,tenant_domain,created_by) values (?,?,?)`,
getAllTenant:`select * from tenant order by tenant_id`,
getTenantByTenantId:`select * from tenant where tenant_id=?`,
checkTenantExistsByTenantId:`select 1 from tenant where tenant_id=?`,
checkTenantExistsByTenantnameAndTenantdomain:`select 1 from tenant where tenant_name=? and tenant_domain=?`,
updateTenant:`update goldloan.tenant set tenant_name=?,tenant_domain=?,updated_by=? where tenant_id=?`,
deleteTenantByTenantId:`delete from tenant where tenant_id=?`
}

module.exports={tenantQuery}