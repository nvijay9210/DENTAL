/*
  Warnings:

  - You are about to drop the column `license_expiry_date` on the `document` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `document` DROP COLUMN `license_expiry_date`;
