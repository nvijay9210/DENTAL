/*
  Warnings:

  - You are about to drop the column `keycloak_id` on the `dentist` table. All the data in the column will be lost.
  - You are about to drop the column `password` on the `dentist` table. All the data in the column will be lost.
  - You are about to drop the column `username` on the `dentist` table. All the data in the column will be lost.
  - You are about to drop the column `keycloak_user_id` on the `login_history` table. All the data in the column will be lost.
  - You are about to drop the column `keycloak_id` on the `patient` table. All the data in the column will be lost.
  - You are about to drop the column `password` on the `patient` table. All the data in the column will be lost.
  - You are about to drop the column `username` on the `patient` table. All the data in the column will be lost.
  - You are about to drop the column `keycloak_id` on the `reception` table. All the data in the column will be lost.
  - You are about to drop the column `password` on the `reception` table. All the data in the column will be lost.
  - You are about to drop the column `username` on the `reception` table. All the data in the column will be lost.
  - You are about to drop the column `keycloak_id` on the `superuser` table. All the data in the column will be lost.
  - You are about to drop the column `password` on the `superuser` table. All the data in the column will be lost.
  - You are about to drop the column `username` on the `superuser` table. All the data in the column will be lost.
  - You are about to drop the column `keycloak_id` on the `supplier` table. All the data in the column will be lost.
  - You are about to drop the column `password` on the `supplier` table. All the data in the column will be lost.
  - You are about to drop the column `username` on the `supplier` table. All the data in the column will be lost.
  - You are about to drop the column `keycloak_user_id` on the `user_activity` table. All the data in the column will be lost.
  - You are about to drop the `user_clinic` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[user_id,tenant_id,clinic_id]` on the table `dentist` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[user_id,tenant_id]` on the table `patient` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[user_id,tenant_id,clinic_id]` on the table `reception` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[user_id,tenant_id,clinic_id]` on the table `superuser` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[user_id,tenant_id,clinic_id]` on the table `supplier` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `user_id` to the `dentist` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `login_history` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `reception` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `superuser` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `supplier` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `user_activity` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `user_clinic` DROP FOREIGN KEY `fk_user_clinic_clinic`;

-- DropForeignKey
ALTER TABLE `user_clinic` DROP FOREIGN KEY `fk_user_clinic_tenant`;

-- DropIndex
DROP INDEX `idx_dentist_keycloak_id` ON `dentist`;

-- DropIndex
DROP INDEX `idx_login_history_user` ON `login_history`;

-- DropIndex
DROP INDEX `idx_patient_keycloak_id` ON `patient`;

-- DropIndex
DROP INDEX `idx_reception_keycloak_id` ON `reception`;

-- DropIndex
DROP INDEX `idx_superuser_keycloak_id` ON `superuser`;

-- DropIndex
DROP INDEX `idx_supplier_keycloak_id` ON `supplier`;

-- DropIndex
DROP INDEX `idx_user_activity_user` ON `user_activity`;

-- AlterTable
ALTER TABLE `dentist` DROP COLUMN `keycloak_id`,
    DROP COLUMN `password`,
    DROP COLUMN `username`,
    ADD COLUMN `user_id` BIGINT UNSIGNED NOT NULL;

-- AlterTable
ALTER TABLE `login_history` DROP COLUMN `keycloak_user_id`,
    ADD COLUMN `user_id` BIGINT UNSIGNED NOT NULL;

-- AlterTable
ALTER TABLE `patient` DROP COLUMN `keycloak_id`,
    DROP COLUMN `password`,
    DROP COLUMN `username`,
    ADD COLUMN `user_id` BIGINT UNSIGNED NULL;

-- AlterTable
ALTER TABLE `reception` DROP COLUMN `keycloak_id`,
    DROP COLUMN `password`,
    DROP COLUMN `username`,
    ADD COLUMN `user_id` BIGINT UNSIGNED NOT NULL;

-- AlterTable
ALTER TABLE `superuser` DROP COLUMN `keycloak_id`,
    DROP COLUMN `password`,
    DROP COLUMN `username`,
    ADD COLUMN `user_id` BIGINT UNSIGNED NOT NULL;

-- AlterTable
ALTER TABLE `supplier` DROP COLUMN `keycloak_id`,
    DROP COLUMN `password`,
    DROP COLUMN `username`,
    ADD COLUMN `user_id` BIGINT UNSIGNED NOT NULL;

-- AlterTable
ALTER TABLE `user_activity` DROP COLUMN `keycloak_user_id`,
    ADD COLUMN `user_id` BIGINT UNSIGNED NOT NULL;

-- DropTable
DROP TABLE `user_clinic`;

-- CreateTable
CREATE TABLE `users` (
    `user_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `keycloak_id` CHAR(36) NOT NULL,
    `username` VARCHAR(100) NULL,
    `email` VARCHAR(255) NULL,
    `status` BOOLEAN NOT NULL DEFAULT true,
    `last_login` DATETIME(0) NULL,
    `created_by` VARCHAR(30) NOT NULL DEFAULT 'SYSTEM',
    `created_time` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_by` VARCHAR(30) NULL,
    `updated_time` TIMESTAMP(0) NULL,

    UNIQUE INDEX `uq_users_keycloak_id`(`keycloak_id`),
    INDEX `idx_users_username`(`username`),
    INDEX `idx_users_email`(`email`),
    PRIMARY KEY (`user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `roles` (
    `role_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `role_code` VARCHAR(50) NOT NULL,
    `role_name` VARCHAR(100) NOT NULL,
    `status` BOOLEAN NOT NULL DEFAULT true,
    `created_by` VARCHAR(30) NOT NULL DEFAULT 'SYSTEM',
    `created_time` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_by` VARCHAR(30) NULL,
    `updated_time` TIMESTAMP(0) NULL,

    UNIQUE INDEX `uq_roles_role_code`(`role_code`),
    PRIMARY KEY (`role_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_roles` (
    `user_role_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `role_id` BIGINT UNSIGNED NOT NULL,
    `tenant_id` BIGINT UNSIGNED NOT NULL,
    `clinic_id` BIGINT UNSIGNED NOT NULL,
    `is_primary` BOOLEAN NOT NULL DEFAULT false,
    `status` BOOLEAN NOT NULL DEFAULT true,
    `created_by` VARCHAR(30) NOT NULL DEFAULT 'SYSTEM',
    `created_time` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_by` VARCHAR(30) NULL,
    `updated_time` TIMESTAMP(0) NULL,

    INDEX `idx_user_roles_user`(`user_id`),
    INDEX `idx_user_roles_role`(`role_id`),
    INDEX `idx_user_roles_tenant`(`tenant_id`),
    INDEX `idx_user_roles_clinic`(`clinic_id`),
    INDEX `idx_user_roles_user_tenant`(`user_id`, `tenant_id`),
    INDEX `idx_user_roles_user_tenant_clinic`(`user_id`, `tenant_id`, `clinic_id`),
    UNIQUE INDEX `uq_user_roles_assignment`(`user_id`, `role_id`, `tenant_id`, `clinic_id`),
    PRIMARY KEY (`user_role_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `idx_dentist_user_id` ON `dentist`(`user_id`);

-- CreateIndex
CREATE UNIQUE INDEX `uq_dentist_user_tenant_clinic` ON `dentist`(`user_id`, `tenant_id`, `clinic_id`);

-- CreateIndex
CREATE INDEX `idx_login_history_user` ON `login_history`(`user_id`);

-- CreateIndex
CREATE INDEX `idx_patient_user_id` ON `patient`(`user_id`);

-- CreateIndex
CREATE UNIQUE INDEX `uq_patient_user_tenant` ON `patient`(`user_id`, `tenant_id`);

-- CreateIndex
CREATE INDEX `idx_reception_user_id` ON `reception`(`user_id`);

-- CreateIndex
CREATE UNIQUE INDEX `uq_reception_user_tenant_clinic` ON `reception`(`user_id`, `tenant_id`, `clinic_id`);

-- CreateIndex
CREATE INDEX `idx_superuser_user_id` ON `superuser`(`user_id`);

-- CreateIndex
CREATE UNIQUE INDEX `uq_superuser_user_tenant_clinic` ON `superuser`(`user_id`, `tenant_id`, `clinic_id`);

-- CreateIndex
CREATE INDEX `idx_supplier_user_id` ON `supplier`(`user_id`);

-- CreateIndex
CREATE UNIQUE INDEX `uq_supplier_user_tenant_clinic` ON `supplier`(`user_id`, `tenant_id`, `clinic_id`);

-- CreateIndex
CREATE INDEX `idx_user_activity_user` ON `user_activity`(`user_id`);

-- AddForeignKey
ALTER TABLE `user_roles` ADD CONSTRAINT `fk_user_roles_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_roles` ADD CONSTRAINT `fk_user_roles_role` FOREIGN KEY (`role_id`) REFERENCES `roles`(`role_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_roles` ADD CONSTRAINT `fk_user_roles_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`tenant_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_roles` ADD CONSTRAINT `fk_user_roles_clinic` FOREIGN KEY (`clinic_id`) REFERENCES `clinic`(`clinic_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dentist` ADD CONSTRAINT `fk_dentist_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `login_history` ADD CONSTRAINT `fk_login_history_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `patient` ADD CONSTRAINT `fk_patient_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reception` ADD CONSTRAINT `fk_reception_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `superuser` ADD CONSTRAINT `fk_superuser_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supplier` ADD CONSTRAINT `fk_supplier_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_activity` ADD CONSTRAINT `fk_user_activity_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
