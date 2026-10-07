-- CreateTable
CREATE TABLE `appointment` (
    `appointment_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `tenant_id` BIGINT UNSIGNED NOT NULL,
    `patient_id` BIGINT UNSIGNED NOT NULL,
    `dentist_id` BIGINT UNSIGNED NOT NULL,
    `clinic_id` BIGINT UNSIGNED NOT NULL,
    `room_id` CHAR(36) NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    `appointment_date` DATE NOT NULL,
    `start_time` TIME(0) NOT NULL,
    `end_time` TIME(0) NOT NULL,
    `status` ENUM('pending', 'confirmed', 'checkedin', 'inprogress', 'completed', 'cancelled', 'clinic_cancelled', 'noshow', 'rescheduled', 'followup', 'rejected', 'expired', 'payment_pending', 'paid') NOT NULL DEFAULT 'pending',
    `appointment_final_status` ENUM('pending', 'inprogress', 'completed', 'fully_completed', 'cancelled', 'pending_payment') NULL DEFAULT 'pending',
    `appointment_type` ENUM('video', 'audio') NULL,
    `doctor_rating` DECIMAL(3, 2) NULL,
    `feedback` TEXT NULL,
    `consultation_fee` DECIMAL(12, 2) NULL DEFAULT 0.00,
    `discount_applied` DECIMAL(12, 2) NULL DEFAULT 0.00,
    `payment_status` VARCHAR(100) NULL,
    `min_booking_fee` DECIMAL(12, 2) NULL DEFAULT 0.00,
    `paid_amount` DECIMAL(12, 2) NULL DEFAULT 0.00,
    `rescheduled_from` BIGINT UNSIGNED NULL,
    `cancelled_by` VARCHAR(30) NULL,
    `cancellation_reason` TEXT NULL,
    `is_virtual` BOOLEAN NULL DEFAULT false,
    `reminder_send` BOOLEAN NULL DEFAULT false,
    `feedback_display` BOOLEAN NULL DEFAULT true,
    `meeting_link` VARCHAR(255) NULL,
    `checkin_time` DATETIME(0) NULL,
    `checkout_time` DATETIME(0) NULL,
    `mode_of_payment` VARCHAR(100) NOT NULL,
    `visit_reason` TEXT NULL,
    `follow_up_needed` BOOLEAN NOT NULL DEFAULT false,
    `reminder_method` VARCHAR(100) NULL,
    `notes` TEXT NULL,
    `created_by` VARCHAR(30) NOT NULL,
    `created_time` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_by` VARCHAR(30) NULL,
    `updated_time` TIMESTAMP(0) NULL,

    INDEX `fk_appointment_clinic`(`clinic_id`),
    INDEX `fk_appointment_dentist`(`dentist_id`),
    INDEX `fk_appointment_patient`(`patient_id`),
    INDEX `fk_appointment_tenant`(`tenant_id`),
    INDEX `idx_tenant_date_time_status`(`tenant_id`, `appointment_date`, `start_time`, `status`),
    PRIMARY KEY (`appointment_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `appointment_reschedules` (
    `rescheduled_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `tenant_id` BIGINT UNSIGNED NOT NULL,
    `clinic_id` BIGINT UNSIGNED NOT NULL,
    `dentist_id` BIGINT UNSIGNED NOT NULL,
    `original_appointment_id` BIGINT UNSIGNED NOT NULL,
    `new_appointment_id` BIGINT UNSIGNED NOT NULL,
    `previous_date` DATE NOT NULL,
    `previous_time` TIME(0) NOT NULL,
    `new_date` DATE NOT NULL,
    `new_start_time` TIME(0) NOT NULL,
    `new_end_time` TIME(0) NOT NULL,
    `reason` TEXT NOT NULL,
    `charge_applicable` BOOLEAN NOT NULL DEFAULT false,
    `charge_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `rescheduled_by` VARCHAR(30) NOT NULL,
    `rescheduled_at` TIMESTAMP(0) NULL,
    `created_by` VARCHAR(30) NOT NULL,
    `created_time` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_by` VARCHAR(30) NULL,
    `updated_time` TIMESTAMP(0) NULL,

    INDEX `fk_appointment_reschedules_clinic`(`clinic_id`),
    INDEX `fk_appointment_reschedules_dentist`(`dentist_id`),
    INDEX `fk_appointment_reschedules_tenant`(`tenant_id`),
    PRIMARY KEY (`rescheduled_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `appointment_stats` (
    `appointment_stats_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `tenant_id` BIGINT UNSIGNED NOT NULL,
    `clinic_id` BIGINT UNSIGNED NOT NULL,
    `dentist_id` BIGINT UNSIGNED NULL,
    `stat_date` DATE NOT NULL,
    `confirmed` INTEGER NULL DEFAULT 0,
    `completed` INTEGER NULL DEFAULT 0,
    `cancelled` INTEGER NULL DEFAULT 0,
    `created_by` VARCHAR(30) NOT NULL DEFAULT 'ADMIN',
    `created_time` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_by` VARCHAR(30) NULL,
    `updated_time` TIMESTAMP(0) NULL,

    UNIQUE INDEX `uk_tenant_date`(`tenant_id`, `clinic_id`, `dentist_id`, `stat_date`),
    PRIMARY KEY (`appointment_stats_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `clinic` (
    `clinic_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `tenant_id` BIGINT UNSIGNED NOT NULL,
    `clinic_name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(255) NULL,
    `phone_number` VARCHAR(15) NOT NULL,
    `alternate_phone_number` VARCHAR(15) NULL,
    `branch` VARCHAR(50) NULL,
    `website` VARCHAR(255) NULL,
    `address` TEXT NOT NULL,
    `city` VARCHAR(100) NOT NULL,
    `landmark` VARCHAR(100) NULL,
    `state` VARCHAR(100) NOT NULL,
    `country` VARCHAR(50) NOT NULL,
    `pin_code` VARCHAR(10) NOT NULL,
    `license_number` VARCHAR(10) NOT NULL,
    `gst_number` VARCHAR(15) NULL,
    `pan_number` VARCHAR(10) NULL,
    `clinic_logo` VARCHAR(255) NULL,
    `established_year` INTEGER NOT NULL,
    `total_doctors` INTEGER NULL DEFAULT 0,
    `total_patients` BIGINT UNSIGNED NULL DEFAULT 0,
    `seating_capacity` INTEGER NULL DEFAULT 0,
    `number_of_assistants` INTEGER NULL DEFAULT 0,
    `available_services` LONGTEXT NOT NULL,
    `operating_hours` LONGTEXT NULL,
    `insurance_supported` BOOLEAN NOT NULL DEFAULT false,
    `ratings` DECIMAL(3, 2) NULL DEFAULT 0.00,
    `reviews_count` INTEGER NULL DEFAULT 0,
    `emergency_support` BOOLEAN NOT NULL DEFAULT false,
    `teleconsultation_supported` BOOLEAN NOT NULL DEFAULT false,
    `parking_availability` BOOLEAN NOT NULL DEFAULT false,
    `pharmacy` BOOLEAN NOT NULL DEFAULT false,
    `wifi` BOOLEAN NOT NULL DEFAULT false,
    `clinic_app_font` VARCHAR(50) NULL,
    `clinic_app_themes` VARCHAR(50) NULL,
    `created_by` VARCHAR(30) NOT NULL DEFAULT 'ADMIN',
    `created_time` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_by` VARCHAR(30) NULL,
    `updated_time` TIMESTAMP(0) NULL,
    `otp` BOOLEAN NOT NULL DEFAULT false,
    `otp_type` ENUM('whatsapp', 'email', 'sms') NULL DEFAULT 'whatsapp',

    INDEX `fk_clinic_tenant`(`tenant_id`),
    INDEX `idx_phone_number`(`phone_number`),
    PRIMARY KEY (`clinic_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `databasechangelog` (
    `ID` VARCHAR(255) NOT NULL,
    `AUTHOR` VARCHAR(255) NOT NULL,
    `FILENAME` VARCHAR(255) NOT NULL,
    `DATEEXECUTED` DATETIME(0) NOT NULL,
    `ORDEREXECUTED` INTEGER NOT NULL,
    `EXECTYPE` VARCHAR(10) NOT NULL,
    `MD5SUM` VARCHAR(35) NULL,
    `DESCRIPTION` VARCHAR(255) NULL,
    `COMMENTS` VARCHAR(255) NULL,
    `TAG` VARCHAR(255) NULL,
    `LIQUIBASE` VARCHAR(20) NULL,
    `CONTEXTS` VARCHAR(255) NULL,
    `LABELS` VARCHAR(255) NULL,
    `DEPLOYMENT_ID` VARCHAR(10) NULL
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `databasechangeloglock` (
    `ID` INTEGER NOT NULL,
    `LOCKED` BOOLEAN NOT NULL,
    `LOCKGRANTED` DATETIME(0) NULL,
    `LOCKEDBY` VARCHAR(255) NULL,

    PRIMARY KEY (`ID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dentist` (
    `dentist_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `tenant_id` BIGINT UNSIGNED NOT NULL,
    `clinic_id` BIGINT UNSIGNED NOT NULL,
    `keycloak_id` CHAR(36) NULL,
    `username` VARCHAR(50) NULL,
    `password` VARBINARY(255) NULL,
    `first_name` VARCHAR(50) NOT NULL,
    `last_name` VARCHAR(50) NOT NULL,
    `gender` ENUM('M', 'F', 'O') NULL DEFAULT 'M',
    `date_of_birth` DATE NULL,
    `email` VARCHAR(255) NULL,
    `phone_number` VARCHAR(15) NOT NULL,
    `alternate_phone_number` VARCHAR(15) NULL,
    `specialisation` VARCHAR(100) NOT NULL DEFAULT '',
    `designation` VARCHAR(100) NOT NULL DEFAULT '',
    `member_of` LONGTEXT NULL,
    `experience_years` INTEGER NOT NULL,
    `license_number` VARCHAR(20) NOT NULL,
    `city` VARCHAR(100) NOT NULL,
    `state` VARCHAR(100) NOT NULL,
    `country` VARCHAR(50) NOT NULL,
    `pin_code` VARCHAR(10) NOT NULL,
    `profile_picture` VARCHAR(255) NULL,
    `working_hours` LONGTEXT NULL,
    `available_days` LONGTEXT NULL,
    `consultation_fee` DECIMAL(12, 2) NULL DEFAULT 0.00,
    `currency_code` VARCHAR(10) NULL,
    `min_booking_fee` DECIMAL(12, 2) NULL DEFAULT 0.00,
    `ratings` DECIMAL(3, 2) NULL DEFAULT 0.00,
    `reviews_count` INTEGER NULL DEFAULT 0,
    `appointment_count` INTEGER NULL DEFAULT 0,
    `bio` LONGTEXT NULL,
    `teleconsultation_supported` BOOLEAN NOT NULL DEFAULT false,
    `languages_spoken` LONGTEXT NULL,
    `social_links` LONGTEXT NULL,
    `internship` LONGTEXT NULL,
    `position_held` LONGTEXT NULL,
    `research_projects` LONGTEXT NULL,
    `publication` LONGTEXT NULL,
    `social_activities` LONGTEXT NULL,
    `last_login` TIMESTAMP(0) NULL,
    `duration` INTEGER NULL,
    `status` BOOLEAN NULL DEFAULT true,
    `created_by` VARCHAR(30) NOT NULL,
    `created_time` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_by` VARCHAR(30) NULL,
    `updated_time` TIMESTAMP(0) NULL,
    `dentist_code` VARCHAR(15) NULL,

    INDEX `idx_clinic_id`(`clinic_id`),
    INDEX `idx_dentist_keycloak_id`(`keycloak_id`),
    INDEX `idx_phone_number`(`phone_number`),
    INDEX `idx_tenant_id`(`tenant_id`),
    PRIMARY KEY (`dentist_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `document` (
    `document_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `table_name` VARCHAR(100) NOT NULL,
    `table_id` BIGINT UNSIGNED NOT NULL,
    `field_name` VARCHAR(100) NOT NULL,
    `file_url` VARCHAR(255) NOT NULL,
    `description` VARCHAR(255) NULL,
    `created_by` VARCHAR(30) NOT NULL,
    `created_time` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_by` VARCHAR(30) NULL,
    `updated_time` TIMESTAMP(0) NULL,

    INDEX `idx_table_reference`(`table_name`, `table_id`, `field_name`),
    PRIMARY KEY (`document_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `expense` (
    `expense_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `tenant_id` BIGINT UNSIGNED NOT NULL,
    `clinic_id` BIGINT UNSIGNED NOT NULL,
    `expense_amount` DECIMAL(12, 2) NULL DEFAULT 0.00,
    `expense_category` VARCHAR(255) NULL,
    `expense_reason` VARCHAR(255) NULL,
    `expense_date` DATE NULL,
    `mode_of_payment` VARCHAR(100) NULL,
    `receipt_number` VARCHAR(100) NULL,
    `paid_by` VARCHAR(100) NULL,
    `paid_by_user` VARCHAR(100) NULL,
    `paid_to` VARCHAR(100) NULL,
    `created_by` VARCHAR(30) NOT NULL,
    `created_time` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_by` VARCHAR(30) NULL,
    `updated_time` TIMESTAMP(0) NULL,

    INDEX `fk_expense_clinic`(`clinic_id`),
    INDEX `fk_expense_tenant`(`tenant_id`),
    PRIMARY KEY (`expense_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `login_history` (
    `login_history_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `tenant_id` BIGINT UNSIGNED NULL,
    `app_name` VARCHAR(100) NULL,
    `session_id` VARCHAR(36) NULL,
    `login_time` DATETIME(0) NOT NULL,
    `logout_time` DATETIME(0) NULL,
    `ip_address` VARCHAR(45) NULL,
    `user_agent` TEXT NULL,
    `created_time` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `login_history_user_id_idx`(`user_id`),
    INDEX `login_history_tenant_id_idx`(`tenant_id`),
    PRIMARY KEY (`login_history_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notificationrecipients` (
    `notification_recipient_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `notification_id` BIGINT UNSIGNED NOT NULL,
    `receiver_role` VARCHAR(20) NOT NULL,
    `receiver_id` BIGINT UNSIGNED NOT NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'unread',
    `created_by` VARCHAR(50) NULL,
    `delivered_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `read_at` TIMESTAMP(0) NULL,

    INDEX `fk_notification_recipients_notification`(`notification_id`),
    PRIMARY KEY (`notification_recipient_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications` (
    `notification_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `tenant_id` BIGINT UNSIGNED NOT NULL,
    `clinic_id` BIGINT UNSIGNED NOT NULL,
    `sender_role` VARCHAR(20) NOT NULL,
    `sender_id` BIGINT UNSIGNED NOT NULL,
    `type` VARCHAR(50) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `message` TEXT NULL,
    `reference_id` BIGINT UNSIGNED NULL,
    `created_by` VARCHAR(50) NULL,
    `created_time` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_by` VARCHAR(50) NULL,
    `updated_time` TIMESTAMP(0) NULL,
    `file_url` VARCHAR(255) NULL,

    INDEX `fk_notification_tenant`(`tenant_id`),
    PRIMARY KEY (`notification_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `patient` (
    `patient_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `tenant_id` BIGINT UNSIGNED NOT NULL,
    `patient_reference_id` VARCHAR(30) NULL,
    `keycloak_id` CHAR(36) NULL,
    `username` VARCHAR(50) NULL,
    `password` VARBINARY(255) NULL,
    `first_name` VARCHAR(50) NOT NULL,
    `last_name` VARCHAR(50) NOT NULL,
    `email` VARCHAR(255) NULL,
    `phone_number` VARCHAR(15) NOT NULL,
    `alternate_phone_number` VARCHAR(15) NULL,
    `profile_picture` VARCHAR(255) NULL,
    `date_of_birth` DATE NOT NULL,
    `gender` ENUM('M', 'F', 'O') NOT NULL DEFAULT 'M',
    `blood_group` VARCHAR(10) NULL,
    `address` TEXT NOT NULL,
    `city` VARCHAR(100) NOT NULL,
    `state` VARCHAR(100) NOT NULL,
    `country` VARCHAR(50) NOT NULL,
    `pin_code` VARCHAR(10) NOT NULL,
    `pre_history` TEXT NULL,
    `current_medications` TEXT NULL,
    `dentist_preference` BIGINT UNSIGNED NULL,
    `smoking_status` VARCHAR(100) NOT NULL,
    `alcohol_consumption` VARCHAR(100) NOT NULL,
    `emergency_contact_name` VARCHAR(255) NULL,
    `emergency_contact_number` VARCHAR(15) NULL,
    `insurance_provider` VARCHAR(255) NULL,
    `insurance_policy_number` VARCHAR(10) NULL,
    `insurance_policy_start_date` DATE NULL,
    `insurance_policy_end_date` DATE NULL,
    `treatment_history` LONGTEXT NULL,
    `appointment_count` INTEGER NULL,
    `first_visit_date` TIMESTAMP(0) NULL,
    `last_appointment_date` DATETIME(0) NULL,
    `referred_by` VARCHAR(100) NULL,
    `profession` VARCHAR(100) NULL,
    `tooth_details` TEXT NULL,
    `created_by` VARCHAR(30) NOT NULL,
    `created_time` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_by` VARCHAR(30) NULL,
    `updated_time` TIMESTAMP(0) NULL,
    `medical_history_notes` TEXT NULL,
    `patient_code` VARCHAR(15) NULL,

    INDEX `fk_patient_dentist`(`dentist_preference`),
    INDEX `fk_patient_tenant`(`tenant_id`),
    INDEX `idx_patient_keycloak_id`(`keycloak_id`),
    PRIMARY KEY (`patient_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `patient_clinic` (
    `patient_clinic_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `patient_id` BIGINT UNSIGNED NOT NULL,
    `clinic_id` BIGINT UNSIGNED NOT NULL,
    `created_by` VARCHAR(50) NOT NULL,
    `created_time` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_by` VARCHAR(50) NULL,
    `updated_time` TIMESTAMP(0) NULL,

    INDEX `fk_patient_clinic_clinic`(`clinic_id`),
    UNIQUE INDEX `uk_patient_clinic`(`patient_id`, `clinic_id`),
    PRIMARY KEY (`patient_clinic_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payment` (
    `payment_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `tenant_id` BIGINT UNSIGNED NOT NULL,
    `clinic_id` BIGINT UNSIGNED NOT NULL,
    `patient_id` BIGINT UNSIGNED NOT NULL,
    `dentist_id` BIGINT UNSIGNED NOT NULL,
    `appointment_id` BIGINT UNSIGNED NOT NULL,
    `amount` DECIMAL(12, 2) NULL DEFAULT 0.00,
    `discount_applied` DECIMAL(12, 2) NULL DEFAULT 0.00,
    `total_amount` DECIMAL(12, 2) NULL DEFAULT 0.00,
    `payment_for` ENUM('booking', 'treatment', 'late') NULL,
    `final_amount` DECIMAL(12, 2) NULL DEFAULT 0.00,
    `mode_of_payment` VARCHAR(100) NULL,
    `payment_source` VARCHAR(100) NULL,
    `payment_reference` TEXT NULL,
    `payment_status` VARCHAR(100) NULL,
    `payment_verified` BOOLEAN NULL DEFAULT false,
    `receipt_number` VARCHAR(25) NULL,
    `insurance_number` VARCHAR(25) NULL,
    `payment_date` DATETIME(0) NULL,
    `created_by` VARCHAR(30) NOT NULL,
    `created_time` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_by` VARCHAR(30) NULL,
    `updated_time` TIMESTAMP(0) NULL,

    INDEX `fk_payment_appointment`(`appointment_id`),
    INDEX `fk_payment_clinic`(`clinic_id`),
    INDEX `fk_payment_dentist`(`dentist_id`),
    INDEX `fk_payment_patient`(`patient_id`),
    INDEX `fk_payment_tenant`(`tenant_id`),
    PRIMARY KEY (`payment_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `prescription` (
    `prescription_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `tenant_id` BIGINT UNSIGNED NOT NULL,
    `clinic_id` BIGINT UNSIGNED NOT NULL,
    `patient_id` BIGINT UNSIGNED NOT NULL,
    `dentist_id` BIGINT UNSIGNED NOT NULL,
    `treatment_id` BIGINT UNSIGNED NOT NULL,
    `medication` TEXT NULL,
    `generic_name` VARCHAR(255) NULL,
    `brand_name` VARCHAR(255) NULL,
    `dosage` INTEGER NULL DEFAULT 0,
    `frequency` TEXT NULL,
    `quantity` INTEGER NULL DEFAULT 0,
    `refill_allowed` BOOLEAN NULL DEFAULT false,
    `refill_count` INTEGER NULL DEFAULT 0,
    `side_effects` TEXT NULL,
    `start_date` DATE NULL,
    `end_date` DATE NULL,
    `instructions` TEXT NULL,
    `notes` TEXT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_by` VARCHAR(30) NOT NULL,
    `created_time` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_by` VARCHAR(30) NULL,
    `updated_time` TIMESTAMP(0) NULL,

    INDEX `fk_prescription_clinic`(`clinic_id`),
    INDEX `fk_prescription_dentist`(`dentist_id`),
    INDEX `fk_prescription_patient`(`patient_id`),
    INDEX `fk_prescription_tenant`(`tenant_id`),
    INDEX `fk_prescription_treatment`(`treatment_id`),
    PRIMARY KEY (`prescription_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `purchase_orders` (
    `purchase_order_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `tenant_id` BIGINT UNSIGNED NOT NULL,
    `clinic_id` BIGINT UNSIGNED NOT NULL,
    `dentist_id` BIGINT UNSIGNED NULL,
    `supplier_id` BIGINT UNSIGNED NOT NULL,
    `supplier_product_id` BIGINT UNSIGNED NOT NULL,
    `order_number` VARCHAR(100) NULL,
    `order_date` DATE NULL,
    `product_name` VARCHAR(100) NULL,
    `quantity` INTEGER NULL,
    `total_amount` DECIMAL(12, 2) NULL,
    `status` ENUM('pending', 'confirmed', 'shipped', 'delivered', 'cancelled') NULL DEFAULT 'pending',
    `delivery_date` DATE NULL,
    `created_by` VARCHAR(30) NOT NULL,
    `created_time` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_by` VARCHAR(30) NULL,
    `updated_time` TIMESTAMP(0) NULL,

    INDEX `fk_purchase_order_clinic`(`clinic_id`),
    INDEX `fk_purchase_order_dentist`(`dentist_id`),
    INDEX `fk_purchase_order_supplier`(`supplier_id`),
    INDEX `fk_purchase_order_supplier_product`(`supplier_product_id`),
    INDEX `fk_purchase_order_tenant`(`tenant_id`),
    PRIMARY KEY (`purchase_order_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reception` (
    `reception_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `tenant_id` BIGINT UNSIGNED NOT NULL,
    `clinic_id` BIGINT UNSIGNED NOT NULL,
    `keycloak_id` CHAR(36) NULL,
    `username` VARCHAR(50) NULL,
    `password` VARBINARY(255) NULL,
    `email` VARCHAR(255) NULL,
    `phone_number` VARCHAR(15) NOT NULL,
    `alternate_phone_number` VARCHAR(15) NULL,
    `profile_picture` VARCHAR(255) NULL,
    `date_of_birth` DATE NOT NULL,
    `gender` ENUM('M', 'F', 'O') NOT NULL DEFAULT 'M',
    `status` BOOLEAN NULL DEFAULT true,
    `address` TEXT NOT NULL,
    `city` VARCHAR(100) NOT NULL,
    `state` VARCHAR(100) NOT NULL,
    `country` VARCHAR(50) NOT NULL,
    `pincode` VARCHAR(10) NOT NULL,
    `last_login` DATETIME(0) NULL,
    `created_by` VARCHAR(30) NOT NULL,
    `created_time` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_by` VARCHAR(30) NULL,
    `updated_time` TIMESTAMP(0) NULL,
    `first_name` VARCHAR(100) NOT NULL,
    `last_name` VARCHAR(100) NOT NULL,
    `reception_code` VARCHAR(15) NULL,

    INDEX `fk_reception_clinic`(`clinic_id`),
    INDEX `fk_reception_tenant`(`tenant_id`),
    INDEX `idx_reception_keycloak_id`(`keycloak_id`),
    PRIMARY KEY (`reception_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reference` (
    `referral_reference_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `tenant_id` BIGINT UNSIGNED NOT NULL,
    `clinic_id` BIGINT UNSIGNED NOT NULL,
    `sender_name` VARCHAR(255) NOT NULL,
    `receiver_name` VARCHAR(255) NOT NULL,
    `sender_keycloak_id` VARCHAR(255) NOT NULL,
    `receiver_phone` VARCHAR(30) NOT NULL,
    `reference_message` TEXT NOT NULL,
    `reference_image` VARCHAR(255) NULL,
    `created_by` VARCHAR(30) NOT NULL,
    `created_time` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_by` VARCHAR(30) NULL,
    `updated_time` TIMESTAMP(0) NULL,
    `receiver_email` VARCHAR(255) NULL,

    INDEX `fk_reference_clinic`(`clinic_id`),
    INDEX `fk_reference_tenant`(`tenant_id`),
    INDEX `idx_table_reference`(`sender_keycloak_id`),
    PRIMARY KEY (`referral_reference_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reminder` (
    `reminder_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `tenant_id` BIGINT UNSIGNED NOT NULL,
    `clinic_id` BIGINT UNSIGNED NOT NULL,
    `dentist_id` BIGINT UNSIGNED NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `reminder_repeat` ENUM('daily', 'weekly', 'monthly', 'yearly') NULL,
    `category` VARCHAR(100) NULL,
    `reminder_type` VARCHAR(100) NULL,
    `type` ENUM('reminder', 'todo') NOT NULL,
    `is_recurring` BOOLEAN NULL,
    `start_date` DATE NOT NULL,
    `time` TIME(0) NOT NULL,
    `repeat_interval` INTEGER NOT NULL DEFAULT 1,
    `repeat_count` INTEGER NOT NULL DEFAULT 0,
    `repeat_weekdays` VARCHAR(20) NULL,
    `monthly_week` TEXT NULL,
    `monthly_weekdays` TEXT NULL,
    `repeat_end_date` DATE NULL,
    `monthly_option` VARCHAR(20) NULL,
    `notify` BOOLEAN NULL DEFAULT false,
    `notify_before_hours` INTEGER NULL,
    `reminder_reason` VARCHAR(255) NULL,
    `status` VARCHAR(20) NULL,
    `created_by` VARCHAR(30) NOT NULL,
    `created_time` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_by` VARCHAR(30) NULL,
    `updated_time` TIMESTAMP(0) NULL,

    INDEX `fk_reminder_clinic`(`clinic_id`),
    INDEX `fk_reminder_tenant`(`tenant_id`),
    PRIMARY KEY (`reminder_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `statustype` (
    `status_type_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `status_type` VARCHAR(100) NOT NULL,
    `created_by` VARCHAR(30) NOT NULL,
    `created_time` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_by` VARCHAR(30) NULL,
    `updated_time` TIMESTAMP(0) NULL,

    UNIQUE INDEX `uk_status_type`(`status_type`),
    PRIMARY KEY (`status_type_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `statustypesub` (
    `status_type_sub_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `tenant_id` BIGINT UNSIGNED NOT NULL,
    `status_type_id` BIGINT UNSIGNED NOT NULL,
    `status_type_sub` VARCHAR(100) NOT NULL,
    `status_type_sub_ref` VARCHAR(100) NOT NULL,
    `created_by` VARCHAR(30) NOT NULL,
    `created_time` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_by` VARCHAR(30) NULL,
    `updated_time` TIMESTAMP(0) NULL,

    INDEX `fk_statustypesub_tenant`(`tenant_id`),
    INDEX `idx_status_type_id`(`status_type_id`),
    PRIMARY KEY (`status_type_sub_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `superuser` (
    `superuser_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `tenant_id` BIGINT UNSIGNED NOT NULL,
    `clinic_id` BIGINT UNSIGNED NOT NULL,
    `keycloak_id` CHAR(36) NULL,
    `username` VARCHAR(50) NULL,
    `password` VARBINARY(255) NULL,
    `superuser_code` VARCHAR(15) NULL,
    `first_name` VARCHAR(50) NOT NULL,
    `last_name` VARCHAR(50) NOT NULL,
    `email` VARCHAR(255) NULL,
    `phone_number` VARCHAR(15) NOT NULL,
    `alternate_phone_number` VARCHAR(15) NULL,
    `profile_picture` VARCHAR(255) NULL,
    `date_of_birth` DATE NOT NULL,
    `gender` ENUM('M', 'F', 'O') NOT NULL DEFAULT 'M',
    `status` BOOLEAN NULL DEFAULT true,
    `address` TEXT NOT NULL,
    `city` VARCHAR(100) NOT NULL,
    `state` VARCHAR(100) NOT NULL,
    `country` VARCHAR(50) NOT NULL,
    `pincode` VARCHAR(10) NOT NULL,
    `last_login` DATETIME(0) NULL,
    `created_by` VARCHAR(30) NOT NULL,
    `created_time` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_by` VARCHAR(30) NULL,
    `updated_time` TIMESTAMP(0) NULL,

    INDEX `fk_superuser_clinic`(`clinic_id`),
    INDEX `fk_superuser_tenant`(`tenant_id`),
    INDEX `idx_superuser_keycloak_id`(`keycloak_id`),
    PRIMARY KEY (`superuser_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `supplier` (
    `supplier_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `supplier_code` VARCHAR(50) NULL,
    `tenant_id` BIGINT UNSIGNED NOT NULL,
    `clinic_id` BIGINT UNSIGNED NOT NULL,
    `keycloak_id` CHAR(36) NULL,
    `username` VARCHAR(50) NULL,
    `password` VARBINARY(255) NULL,
    `category` VARCHAR(100) NULL,
    `status` BOOLEAN NULL DEFAULT true,
    `email` VARCHAR(150) NULL,
    `phone_number` VARCHAR(15) NOT NULL,
    `alternate_phone_number` VARCHAR(15) NULL,
    `logo_url` VARCHAR(255) NULL,
    `fax` VARCHAR(50) NULL,
    `website` VARCHAR(255) NULL,
    `gst_number` VARCHAR(50) NULL,
    `tax_id` VARCHAR(50) NULL,
    `pan_number` VARCHAR(50) NULL,
    `mode_of_payment` VARCHAR(100) NULL,
    `preferred_currency` VARCHAR(10) NULL,
    `credit_limit` DECIMAL(12, 2) NULL,
    `opening_balance` DECIMAL(12, 2) NULL,
    `notes` TEXT NULL,
    `address_type` ENUM('billing', 'shipping', 'office') NULL DEFAULT 'billing',
    `address` VARCHAR(100) NULL,
    `city` VARCHAR(100) NULL,
    `state` VARCHAR(100) NULL,
    `postal_code` VARCHAR(10) NULL,
    `country` VARCHAR(100) NULL,
    `created_by` VARCHAR(30) NOT NULL,
    `created_time` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_by` VARCHAR(30) NULL,
    `updated_time` TIMESTAMP(0) NULL,
    `gender` ENUM('M', 'F', 'O') NOT NULL DEFAULT 'M',
    `first_name` VARCHAR(100) NOT NULL,
    `last_name` VARCHAR(100) NOT NULL,

    UNIQUE INDEX `uq_supplier_code`(`supplier_code`),
    INDEX `fk_supplier_clinic`(`clinic_id`),
    INDEX `fk_supplier_tenant`(`tenant_id`),
    INDEX `idx_supplier_keycloak_id`(`keycloak_id`),
    PRIMARY KEY (`supplier_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `supplier_payments` (
    `supplier_payment_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `tenant_id` BIGINT UNSIGNED NOT NULL,
    `clinic_id` BIGINT UNSIGNED NOT NULL,
    `supplier_id` BIGINT UNSIGNED NOT NULL,
    `purchase_order_id` BIGINT UNSIGNED NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `paid_amount` DECIMAL(12, 2) NULL DEFAULT 0.00,
    `balance_amount` DECIMAL(12, 2) NULL DEFAULT 0.00,
    `supplier_payment_documents` TEXT NULL,
    `mode_of_payment` VARCHAR(50) NULL,
    `receipt_number` VARCHAR(100) NULL,
    `bank_name` VARCHAR(100) NULL,
    `bank_account_number` VARCHAR(100) NULL,
    `bank_ifsc` VARCHAR(20) NULL,
    `transaction_id` VARCHAR(100) NULL,
    `payment_date` DATE NULL,
    `created_by` VARCHAR(30) NOT NULL,
    `created_time` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_by` VARCHAR(30) NULL,
    `updated_time` TIMESTAMP(0) NULL,
    `supplier_payment_type` ENUM('SP', 'FP') NULL DEFAULT 'SP',

    INDEX `fk_sp_clinic`(`clinic_id`),
    INDEX `fk_sp_purchase_order`(`purchase_order_id`),
    INDEX `fk_sp_supplier`(`supplier_id`),
    INDEX `fk_sp_tenant`(`tenant_id`),
    PRIMARY KEY (`supplier_payment_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `supplier_products` (
    `supplier_product_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `tenant_id` BIGINT UNSIGNED NOT NULL,
    `clinic_id` BIGINT UNSIGNED NOT NULL,
    `supplier_id` BIGINT UNSIGNED NOT NULL,
    `product_name` VARCHAR(255) NULL,
    `description` TEXT NULL,
    `image_url` VARCHAR(255) NULL,
    `unit_price` DECIMAL(12, 2) NULL,
    `unit` VARCHAR(50) NULL,
    `moq` INTEGER NULL,
    `lead_time_days` INTEGER NULL,
    `currency_code` VARCHAR(10) NOT NULL,
    `active` BOOLEAN NULL DEFAULT true,
    `created_by` VARCHAR(30) NOT NULL,
    `created_time` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_by` VARCHAR(30) NULL,
    `updated_time` TIMESTAMP(0) NULL,

    INDEX `fk_supplier_product_clinic`(`clinic_id`),
    INDEX `fk_supplier_product_supplier`(`supplier_id`),
    INDEX `fk_supplier_product_tenant`(`tenant_id`),
    PRIMARY KEY (`supplier_product_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `supplier_reviews` (
    `supplier_review_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `tenant_id` BIGINT UNSIGNED NOT NULL,
    `clinic_id` BIGINT UNSIGNED NOT NULL,
    `supplier_id` BIGINT UNSIGNED NOT NULL,
    `purchase_order_id` BIGINT UNSIGNED NOT NULL,
    `rating_quality` INTEGER NULL,
    `rating_delivery` INTEGER NULL,
    `rating_communication` INTEGER NULL,
    `comment` TEXT NULL,
    `reviewed_by` VARCHAR(30) NOT NULL,
    `created_by` VARCHAR(30) NOT NULL,
    `created_time` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_by` VARCHAR(30) NULL,
    `updated_time` TIMESTAMP(0) NULL,

    INDEX `fk_supplier_review_clinic`(`clinic_id`),
    INDEX `fk_supplier_review_purchase_order`(`purchase_order_id`),
    INDEX `fk_supplier_review_supplier`(`supplier_id`),
    INDEX `fk_supplier_review_tenant`(`tenant_id`),
    PRIMARY KEY (`supplier_review_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tenant` (
    `tenant_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `tenant_name` VARCHAR(50) NOT NULL,
    `tenant_domain` VARCHAR(255) NOT NULL,
    `created_time` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `created_by` VARCHAR(30) NOT NULL DEFAULT 'ADMIN',
    `updated_time` TIMESTAMP(0) NULL,
    `updated_by` VARCHAR(30) NULL,
    `tenant_app_name` VARCHAR(100) NULL,
    `tenant_app_logo` VARCHAR(255) NULL,
    `tenant_app_font` VARCHAR(50) NULL,
    `tenant_app_themes` VARCHAR(50) NULL,

    PRIMARY KEY (`tenant_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `toothdetails` (
    `toothdetails_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `tenant_id` BIGINT UNSIGNED NOT NULL,
    `clinic_id` BIGINT UNSIGNED NOT NULL,
    `dentist_id` BIGINT UNSIGNED NOT NULL,
    `patient_id` BIGINT UNSIGNED NOT NULL,
    `tooth_id` TINYINT UNSIGNED NOT NULL,
    `tooth_name` VARCHAR(100) NOT NULL,
    `tooth_position` VARCHAR(100) NOT NULL,
    `disease_type` VARCHAR(100) NOT NULL,
    `disease_name` VARCHAR(100) NOT NULL,
    `treatment_date` DATE NOT NULL,
    `description` TEXT NULL,
    `created_by` VARCHAR(30) NOT NULL,
    `created_time` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_by` VARCHAR(30) NULL,
    `updated_time` TIMESTAMP(0) NULL,

    INDEX `fk_toothdetails_clinic`(`clinic_id`),
    INDEX `fk_toothdetails_dentist`(`dentist_id`),
    INDEX `fk_toothdetails_patient`(`patient_id`),
    INDEX `fk_toothdetails_tenant`(`tenant_id`),
    INDEX `idx_toothdetails_treatment_date`(`treatment_date`),
    PRIMARY KEY (`toothdetails_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `treatment` (
    `treatment_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `tenant_id` BIGINT UNSIGNED NOT NULL,
    `appointment_id` BIGINT UNSIGNED NOT NULL,
    `patient_id` BIGINT UNSIGNED NOT NULL,
    `dentist_id` BIGINT UNSIGNED NOT NULL,
    `clinic_id` BIGINT UNSIGNED NOT NULL,
    `diagnosis` TEXT NULL,
    `treatment_procedure` TEXT NULL,
    `treatment_type` VARCHAR(100) NOT NULL,
    `treatment_status` VARCHAR(100) NOT NULL,
    `treatment_date` DATE NOT NULL,
    `cost` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `duration` VARCHAR(50) NOT NULL,
    `complications` TEXT NULL,
    `follow_up_required` BOOLEAN NOT NULL DEFAULT false,
    `follow_up_date` DATE NULL,
    `follow_up_notes` TEXT NULL,
    `anesthesia_used` BOOLEAN NOT NULL DEFAULT false,
    `anesthesia_type` VARCHAR(100) NULL,
    `technician_assisted` VARCHAR(255) NULL,
    `notes` TEXT NULL,
    `created_by` VARCHAR(30) NOT NULL,
    `created_time` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_by` VARCHAR(30) NULL,
    `updated_time` TIMESTAMP(0) NULL,
    `tax_catalog` VARCHAR(100) NULL,
    `tax_percentage` DECIMAL(5, 2) NULL,

    INDEX `fk_treatment_appointment`(`appointment_id`),
    INDEX `fk_treatment_clinic`(`clinic_id`),
    INDEX `fk_treatment_dentist`(`dentist_id`),
    INDEX `fk_treatment_patient`(`patient_id`),
    INDEX `fk_treatment_tenant`(`tenant_id`),
    PRIMARY KEY (`treatment_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_activity` (
    `user_activity_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `tenant_id` BIGINT UNSIGNED NULL,
    `clinic_id` BIGINT UNSIGNED NULL,
    `app_name` VARCHAR(100) NULL,
    `activity_type` VARCHAR(100) NOT NULL,
    `activity_desc` TEXT NULL,
    `ip_address` VARCHAR(45) NULL,
    `user_agent` TEXT NULL,
    `activity_time` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_user_activity_user`(`user_id`),
    INDEX `idx_user_activity_tenant`(`tenant_id`),
    INDEX `idx_user_activity_clinic`(`clinic_id`),
    PRIMARY KEY (`user_activity_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user` (
    `user_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `keycloak_id` CHAR(36) NULL,
    `username` VARCHAR(100) NULL,
    `email` VARCHAR(255) NULL,
    `first_name` VARCHAR(100) NOT NULL,
    `last_name` VARCHAR(100) NULL,
    `phone_number` VARCHAR(15) NULL,
    `alternate_phone_number` VARCHAR(15) NULL,
    `profile_picture` VARCHAR(255) NULL,
    `date_of_birth` DATE NULL,
    `gender` ENUM('M', 'F', 'O') NULL,
    `status` BOOLEAN NOT NULL DEFAULT true,
    `last_login` DATETIME(0) NULL,
    `created_by` VARCHAR(30) NOT NULL,
    `created_time` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_by` VARCHAR(30) NULL,
    `updated_time` TIMESTAMP(0) NULL,

    UNIQUE INDEX `uk_user_keycloak`(`keycloak_id`),
    INDEX `idx_user_email`(`email`),
    INDEX `idx_user_phone`(`phone_number`),
    INDEX `idx_user_username`(`username`),
    PRIMARY KEY (`user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_tenant` (
    `user_tenant_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `tenant_id` BIGINT UNSIGNED NOT NULL,
    `status` BOOLEAN NOT NULL DEFAULT true,
    `created_by` VARCHAR(30) NOT NULL,
    `created_time` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_by` VARCHAR(30) NULL,
    `updated_time` TIMESTAMP(0) NULL,

    INDEX `idx_user_tenant_user`(`user_id`),
    INDEX `idx_user_tenant_tenant`(`tenant_id`),
    UNIQUE INDEX `uk_user_tenant`(`user_id`, `tenant_id`),
    PRIMARY KEY (`user_tenant_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_clinic` (
    `user_clinic_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `tenant_id` BIGINT UNSIGNED NOT NULL,
    `clinic_id` BIGINT UNSIGNED NOT NULL,
    `status` BOOLEAN NOT NULL DEFAULT true,
    `created_by` VARCHAR(30) NOT NULL,
    `created_time` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_by` VARCHAR(30) NULL,
    `updated_time` TIMESTAMP(0) NULL,

    INDEX `idx_user_clinic_user`(`user_id`),
    INDEX `idx_user_clinic_tenant`(`tenant_id`),
    INDEX `idx_user_clinic_clinic`(`clinic_id`),
    UNIQUE INDEX `uk_user_tenant_clinic`(`user_id`, `tenant_id`, `clinic_id`),
    PRIMARY KEY (`user_clinic_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `role` (
    `role_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `role_code` VARCHAR(50) NOT NULL,
    `role_name` VARCHAR(100) NOT NULL,
    `description` VARCHAR(255) NULL,
    `status` BOOLEAN NOT NULL DEFAULT true,
    `created_by` VARCHAR(30) NOT NULL,
    `created_time` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_by` VARCHAR(30) NULL,
    `updated_time` TIMESTAMP(0) NULL,

    UNIQUE INDEX `role_role_code_key`(`role_code`),
    PRIMARY KEY (`role_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_role` (
    `user_role_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `role_id` BIGINT UNSIGNED NOT NULL,
    `tenant_id` BIGINT UNSIGNED NULL,
    `clinic_id` BIGINT UNSIGNED NULL,
    `status` BOOLEAN NOT NULL DEFAULT true,
    `created_by` VARCHAR(30) NOT NULL,
    `created_time` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_by` VARCHAR(30) NULL,
    `updated_time` TIMESTAMP(0) NULL,

    INDEX `idx_user_role_user`(`user_id`),
    INDEX `idx_user_role_role`(`role_id`),
    INDEX `idx_user_role_tenant`(`tenant_id`),
    INDEX `idx_user_role_clinic`(`clinic_id`),
    UNIQUE INDEX `uk_user_role_scope`(`user_id`, `role_id`, `tenant_id`, `clinic_id`),
    PRIMARY KEY (`user_role_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dentist_profile` (
    `dentist_profile_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `dentist_code` VARCHAR(15) NULL,
    `specialisation` VARCHAR(100) NOT NULL DEFAULT '',
    `designation` VARCHAR(100) NOT NULL DEFAULT '',
    `member_of` LONGTEXT NULL,
    `experience_years` INTEGER NOT NULL,
    `license_number` VARCHAR(20) NOT NULL,
    `city` VARCHAR(100) NOT NULL,
    `state` VARCHAR(100) NOT NULL,
    `country` VARCHAR(50) NOT NULL,
    `pin_code` VARCHAR(10) NOT NULL,
    `working_hours` LONGTEXT NULL,
    `available_days` LONGTEXT NULL,
    `consultation_fee` DECIMAL(12, 2) NULL DEFAULT 0.00,
    `currency_code` VARCHAR(10) NULL,
    `min_booking_fee` DECIMAL(12, 2) NULL DEFAULT 0.00,
    `ratings` DECIMAL(3, 2) NULL DEFAULT 0.00,
    `reviews_count` INTEGER NULL DEFAULT 0,
    `appointment_count` INTEGER NULL DEFAULT 0,
    `bio` LONGTEXT NULL,
    `teleconsultation_supported` BOOLEAN NOT NULL DEFAULT false,
    `languages_spoken` LONGTEXT NULL,
    `social_links` LONGTEXT NULL,
    `internship` LONGTEXT NULL,
    `position_held` LONGTEXT NULL,
    `research_projects` LONGTEXT NULL,
    `publication` LONGTEXT NULL,
    `social_activities` LONGTEXT NULL,
    `duration` INTEGER NULL,

    UNIQUE INDEX `dentist_profile_user_id_key`(`user_id`),
    INDEX `dentist_profile_license_number_idx`(`license_number`),
    PRIMARY KEY (`dentist_profile_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `patient_profile` (
    `patient_profile_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `patient_reference_id` VARCHAR(30) NULL,
    `patient_code` VARCHAR(15) NULL,
    `blood_group` VARCHAR(10) NULL,
    `address` TEXT NULL,
    `city` VARCHAR(100) NULL,
    `state` VARCHAR(100) NULL,
    `country` VARCHAR(50) NULL,
    `pin_code` VARCHAR(10) NULL,
    `pre_history` TEXT NULL,
    `current_medications` TEXT NULL,
    `dentist_preference` BIGINT UNSIGNED NULL,
    `smoking_status` VARCHAR(100) NULL,
    `alcohol_consumption` VARCHAR(100) NULL,
    `emergency_contact_name` VARCHAR(255) NULL,
    `emergency_contact_number` VARCHAR(15) NULL,
    `insurance_provider` VARCHAR(255) NULL,
    `insurance_policy_number` VARCHAR(10) NULL,
    `insurance_policy_start_date` DATE NULL,
    `insurance_policy_end_date` DATE NULL,
    `treatment_history` LONGTEXT NULL,
    `appointment_count` INTEGER NULL,
    `first_visit_date` TIMESTAMP(0) NULL,
    `last_appointment_date` DATETIME(0) NULL,
    `referred_by` VARCHAR(100) NULL,
    `profession` VARCHAR(100) NULL,
    `tooth_details` TEXT NULL,
    `medical_history_notes` TEXT NULL,
    `preferred_dentist_user_id` BIGINT UNSIGNED NULL,

    UNIQUE INDEX `patient_profile_user_id_key`(`user_id`),
    INDEX `patient_profile_preferred_dentist_user_id_idx`(`preferred_dentist_user_id`),
    PRIMARY KEY (`patient_profile_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reception_profile` (
    `reception_profile_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `reception_code` VARCHAR(15) NULL,
    `address` TEXT NULL,
    `city` VARCHAR(100) NULL,
    `state` VARCHAR(100) NULL,
    `country` VARCHAR(50) NULL,
    `pincode` VARCHAR(10) NULL,

    UNIQUE INDEX `reception_profile_user_id_key`(`user_id`),
    PRIMARY KEY (`reception_profile_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `superuser_profile` (
    `superuser_profile_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `superuser_code` VARCHAR(15) NULL,
    `address` TEXT NULL,
    `city` VARCHAR(100) NULL,
    `state` VARCHAR(100) NULL,
    `country` VARCHAR(50) NULL,
    `pincode` VARCHAR(10) NULL,

    UNIQUE INDEX `superuser_profile_user_id_key`(`user_id`),
    PRIMARY KEY (`superuser_profile_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `supplier_profile` (
    `supplier_profile_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `supplier_code` VARCHAR(50) NULL,
    `category` VARCHAR(100) NULL,
    `logo_url` VARCHAR(255) NULL,
    `fax` VARCHAR(50) NULL,
    `website` VARCHAR(255) NULL,
    `gst_number` VARCHAR(50) NULL,
    `tax_id` VARCHAR(50) NULL,
    `pan_number` VARCHAR(50) NULL,
    `mode_of_payment` VARCHAR(100) NULL,
    `preferred_currency` VARCHAR(10) NULL,
    `credit_limit` DECIMAL(12, 2) NULL,
    `opening_balance` DECIMAL(12, 2) NULL,
    `notes` TEXT NULL,
    `address_type` ENUM('billing', 'shipping', 'office') NULL DEFAULT 'billing',
    `address` VARCHAR(100) NULL,
    `city` VARCHAR(100) NULL,
    `state` VARCHAR(100) NULL,
    `postal_code` VARCHAR(10) NULL,
    `country` VARCHAR(100) NULL,

    UNIQUE INDEX `supplier_profile_user_id_key`(`user_id`),
    UNIQUE INDEX `supplier_profile_supplier_code_key`(`supplier_code`),
    PRIMARY KEY (`supplier_profile_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `supplier_user` (
    `supplier_user_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `supplier_id` BIGINT UNSIGNED NOT NULL,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `status` BOOLEAN NOT NULL DEFAULT true,
    `created_by` VARCHAR(30) NOT NULL,
    `created_time` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `supplier_user_supplier_id_user_id_key`(`supplier_id`, `user_id`),
    PRIMARY KEY (`supplier_user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `appointment` ADD CONSTRAINT `fk_appointment_clinic` FOREIGN KEY (`clinic_id`) REFERENCES `clinic`(`clinic_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `appointment` ADD CONSTRAINT `fk_appointment_dentist` FOREIGN KEY (`dentist_id`) REFERENCES `dentist`(`dentist_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `appointment` ADD CONSTRAINT `fk_appointment_patient` FOREIGN KEY (`patient_id`) REFERENCES `patient`(`patient_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `appointment` ADD CONSTRAINT `fk_appointment_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`tenant_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `appointment_reschedules` ADD CONSTRAINT `fk_appointment_reschedules_clinic` FOREIGN KEY (`clinic_id`) REFERENCES `clinic`(`clinic_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `appointment_reschedules` ADD CONSTRAINT `fk_appointment_reschedules_dentist` FOREIGN KEY (`dentist_id`) REFERENCES `dentist`(`dentist_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `appointment_reschedules` ADD CONSTRAINT `fk_appointment_reschedules_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`tenant_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `clinic` ADD CONSTRAINT `fk_clinic_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`tenant_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dentist` ADD CONSTRAINT `fk_dentist_clinic` FOREIGN KEY (`clinic_id`) REFERENCES `clinic`(`clinic_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dentist` ADD CONSTRAINT `fk_dentist_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`tenant_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `expense` ADD CONSTRAINT `fk_expense_clinic` FOREIGN KEY (`clinic_id`) REFERENCES `clinic`(`clinic_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `expense` ADD CONSTRAINT `fk_expense_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`tenant_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `login_history` ADD CONSTRAINT `login_history_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notificationrecipients` ADD CONSTRAINT `fk_notification_recipients_notification` FOREIGN KEY (`notification_id`) REFERENCES `notifications`(`notification_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `fk_notification_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`tenant_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `patient` ADD CONSTRAINT `fk_patient_dentist` FOREIGN KEY (`dentist_preference`) REFERENCES `dentist`(`dentist_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `patient` ADD CONSTRAINT `fk_patient_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`tenant_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `patient_clinic` ADD CONSTRAINT `fk_patient_clinic_clinic` FOREIGN KEY (`clinic_id`) REFERENCES `clinic`(`clinic_id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `patient_clinic` ADD CONSTRAINT `fk_patient_clinic_patient` FOREIGN KEY (`patient_id`) REFERENCES `patient`(`patient_id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `payment` ADD CONSTRAINT `fk_payment_appointment` FOREIGN KEY (`appointment_id`) REFERENCES `appointment`(`appointment_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment` ADD CONSTRAINT `fk_payment_clinic` FOREIGN KEY (`clinic_id`) REFERENCES `clinic`(`clinic_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment` ADD CONSTRAINT `fk_payment_dentist` FOREIGN KEY (`dentist_id`) REFERENCES `dentist`(`dentist_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment` ADD CONSTRAINT `fk_payment_patient` FOREIGN KEY (`patient_id`) REFERENCES `patient`(`patient_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment` ADD CONSTRAINT `fk_payment_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`tenant_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `prescription` ADD CONSTRAINT `fk_prescription_clinic` FOREIGN KEY (`clinic_id`) REFERENCES `clinic`(`clinic_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `prescription` ADD CONSTRAINT `fk_prescription_dentist` FOREIGN KEY (`dentist_id`) REFERENCES `dentist`(`dentist_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `prescription` ADD CONSTRAINT `fk_prescription_patient` FOREIGN KEY (`patient_id`) REFERENCES `patient`(`patient_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `prescription` ADD CONSTRAINT `fk_prescription_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`tenant_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `prescription` ADD CONSTRAINT `fk_prescription_treatment` FOREIGN KEY (`treatment_id`) REFERENCES `treatment`(`treatment_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_orders` ADD CONSTRAINT `fk_po_clinic` FOREIGN KEY (`clinic_id`) REFERENCES `clinic`(`clinic_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_orders` ADD CONSTRAINT `fk_po_dentist` FOREIGN KEY (`dentist_id`) REFERENCES `dentist`(`dentist_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_orders` ADD CONSTRAINT `fk_po_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `supplier`(`supplier_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_orders` ADD CONSTRAINT `fk_po_supplier_product` FOREIGN KEY (`supplier_product_id`) REFERENCES `supplier_products`(`supplier_product_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_orders` ADD CONSTRAINT `fk_po_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`tenant_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reception` ADD CONSTRAINT `fk_reception_clinic` FOREIGN KEY (`clinic_id`) REFERENCES `clinic`(`clinic_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reception` ADD CONSTRAINT `fk_reception_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`tenant_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reference` ADD CONSTRAINT `fk_reference_clinic` FOREIGN KEY (`clinic_id`) REFERENCES `clinic`(`clinic_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reference` ADD CONSTRAINT `fk_reference_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`tenant_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reminder` ADD CONSTRAINT `fk_reminder_clinic` FOREIGN KEY (`clinic_id`) REFERENCES `clinic`(`clinic_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reminder` ADD CONSTRAINT `fk_reminder_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`tenant_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `statustypesub` ADD CONSTRAINT `fk_statustypesub_status_type` FOREIGN KEY (`status_type_id`) REFERENCES `statustype`(`status_type_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `statustypesub` ADD CONSTRAINT `fk_statustypesub_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`tenant_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `superuser` ADD CONSTRAINT `fk_superuser_clinic` FOREIGN KEY (`clinic_id`) REFERENCES `clinic`(`clinic_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `superuser` ADD CONSTRAINT `fk_superuser_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`tenant_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supplier` ADD CONSTRAINT `fk_supplier_clinic` FOREIGN KEY (`clinic_id`) REFERENCES `clinic`(`clinic_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supplier` ADD CONSTRAINT `fk_supplier_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`tenant_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supplier_payments` ADD CONSTRAINT `fk_sp_clinic` FOREIGN KEY (`clinic_id`) REFERENCES `clinic`(`clinic_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supplier_payments` ADD CONSTRAINT `fk_sp_purchase_order` FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders`(`purchase_order_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supplier_payments` ADD CONSTRAINT `fk_sp_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `supplier`(`supplier_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supplier_payments` ADD CONSTRAINT `fk_sp_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`tenant_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supplier_products` ADD CONSTRAINT `fk_supplier_product_clinic` FOREIGN KEY (`clinic_id`) REFERENCES `clinic`(`clinic_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supplier_products` ADD CONSTRAINT `fk_supplier_product_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `supplier`(`supplier_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supplier_products` ADD CONSTRAINT `fk_supplier_product_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`tenant_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supplier_reviews` ADD CONSTRAINT `fk_supplier_review_clinic` FOREIGN KEY (`clinic_id`) REFERENCES `clinic`(`clinic_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supplier_reviews` ADD CONSTRAINT `fk_supplier_review_purchase_order` FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders`(`purchase_order_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supplier_reviews` ADD CONSTRAINT `fk_supplier_review_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `supplier`(`supplier_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supplier_reviews` ADD CONSTRAINT `fk_supplier_review_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`tenant_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `toothdetails` ADD CONSTRAINT `fk_toothdetails_clinic` FOREIGN KEY (`clinic_id`) REFERENCES `clinic`(`clinic_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `toothdetails` ADD CONSTRAINT `fk_toothdetails_dentist` FOREIGN KEY (`dentist_id`) REFERENCES `dentist`(`dentist_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `toothdetails` ADD CONSTRAINT `fk_toothdetails_patient` FOREIGN KEY (`patient_id`) REFERENCES `patient`(`patient_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `toothdetails` ADD CONSTRAINT `fk_toothdetails_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`tenant_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `treatment` ADD CONSTRAINT `fk_treatment_appointment` FOREIGN KEY (`appointment_id`) REFERENCES `appointment`(`appointment_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `treatment` ADD CONSTRAINT `fk_treatment_clinic` FOREIGN KEY (`clinic_id`) REFERENCES `clinic`(`clinic_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `treatment` ADD CONSTRAINT `fk_treatment_dentist` FOREIGN KEY (`dentist_id`) REFERENCES `dentist`(`dentist_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `treatment` ADD CONSTRAINT `fk_treatment_patient` FOREIGN KEY (`patient_id`) REFERENCES `patient`(`patient_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `treatment` ADD CONSTRAINT `fk_treatment_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`tenant_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_activity` ADD CONSTRAINT `user_activity_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_activity` ADD CONSTRAINT `user_activity_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`tenant_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_activity` ADD CONSTRAINT `user_activity_clinic_id_fkey` FOREIGN KEY (`clinic_id`) REFERENCES `clinic`(`clinic_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_tenant` ADD CONSTRAINT `user_tenant_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_tenant` ADD CONSTRAINT `user_tenant_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`tenant_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_clinic` ADD CONSTRAINT `user_clinic_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_clinic` ADD CONSTRAINT `user_clinic_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`tenant_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_clinic` ADD CONSTRAINT `user_clinic_clinic_id_fkey` FOREIGN KEY (`clinic_id`) REFERENCES `clinic`(`clinic_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_role` ADD CONSTRAINT `user_role_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_role` ADD CONSTRAINT `user_role_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `role`(`role_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_role` ADD CONSTRAINT `user_role_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`tenant_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_role` ADD CONSTRAINT `user_role_clinic_id_fkey` FOREIGN KEY (`clinic_id`) REFERENCES `clinic`(`clinic_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dentist_profile` ADD CONSTRAINT `dentist_profile_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `patient_profile` ADD CONSTRAINT `patient_profile_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `patient_profile` ADD CONSTRAINT `patient_profile_preferred_dentist_user_id_fkey` FOREIGN KEY (`preferred_dentist_user_id`) REFERENCES `user`(`user_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reception_profile` ADD CONSTRAINT `reception_profile_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `superuser_profile` ADD CONSTRAINT `superuser_profile_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supplier_profile` ADD CONSTRAINT `supplier_profile_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;
