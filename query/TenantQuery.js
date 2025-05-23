const tenantQuery={
    createTenantTable:`CREATE TABLE IF NOT EXISTS tenant (
    tenant_id INT(6) PRIMARY KEY AUTO_INCREMENT,
    tenant_name VARCHAR(50) NOT NULL,
    tenant_domain VARCHAR(255) NOT NULL,
    created_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(30) NOT NULL DEFAULT 'ADMIN',
    updated_time TIMESTAMP DEFAULT NULL ON UPDATE current_timestamp(),
    updated_by VARCHAR(30) DEFAULT NULL,
    tenant_app_name VARCHAR(100) DEFAULT NULL,
    tenant_app_logo VARCHAR(255) DEFAULT NULL,
    tenant_app_font VARCHAR(50) DEFAULT NULL,
    tenant_app_themes LONGTEXT DEFAULT NULL
)`
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