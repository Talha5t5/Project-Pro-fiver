-- =============================================
-- ProjectPro Complete Database Schema
-- Single SQL file to import all tables at once
-- Domain: artigianofast.com
-- Database: rvtsmdqo_artigianofast
-- =============================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+00:00";

-- =============================================
-- Table structure for table `activities`
-- =============================================
CREATE TABLE `activities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` text NOT NULL,
	`job_type_id` int NOT NULL,
	`job_type_ids` text,
	`description` text,
	`implementation_notes` text,
	`default_duration` decimal(5,2),
	`default_rate` decimal(10,2),
	`default_cost` decimal(10,2),
	PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Table structure for table `activity_collaborators`
-- =============================================
CREATE TABLE `activity_collaborators` (
	`activity_id` int NOT NULL,
	`collaborator_id` int NOT NULL,
	PRIMARY KEY (`activity_id`,`collaborator_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Table structure for table `clients`
-- =============================================
CREATE TABLE `clients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL DEFAULT ('residential'),
	`phone` text,
	`email` text,
	`address` text,
	`geo_location` text,
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Table structure for table `collaborators`
-- =============================================
CREATE TABLE `collaborators` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` text NOT NULL,
	`role_id` int,
	`role_ids` text NOT NULL,
	`phone` text,
	`email` text,
	`work_hours` text,
	`notify_by_email` boolean DEFAULT false,
	`notify_by_whatsapp` boolean DEFAULT false,
	`notification_time` int DEFAULT 24,
	`password` text,
	`activation_token` text,
	`is_active` boolean DEFAULT false,
	`language` text DEFAULT ('it'),
	`username` text,
	PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Table structure for table `general_settings`
-- =============================================
CREATE TABLE `general_settings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `app_name` varchar(255) NOT NULL DEFAULT 'Project Management',
  `default_language` varchar(10) NOT NULL DEFAULT 'it',
  `enable_email_notifications` boolean DEFAULT true,
  `enable_whatsapp_notifications` boolean DEFAULT false,
  `default_notification_time` int DEFAULT 24,
  `date_format` varchar(50) NOT NULL DEFAULT 'DD/MM/YYYY',
  `time_format` varchar(10) NOT NULL DEFAULT '24h',
  `timezone` varchar(50) NOT NULL DEFAULT 'Europe/Rome',
  `week_starts_on` int DEFAULT 1,
  `session_timeout` int DEFAULT 60,
  `password_min_length` int DEFAULT 8,
  `password_require_numbers` boolean DEFAULT true,
  `password_require_special_chars` boolean DEFAULT true,
  `default_page_size` int DEFAULT 10,
  `max_upload_file_size` int DEFAULT 10,
  `allowed_file_types` varchar(500) DEFAULT 'jpg,jpeg,png,pdf,doc,docx,xls,xlsx',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Table structure for table `job_activities`
-- =============================================
CREATE TABLE `job_activities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`job_id` int NOT NULL,
	`activity_id` int NOT NULL,
	`start_date` timestamp NOT NULL,
	`duration` decimal(5,2) NOT NULL,
	`status` text DEFAULT ('scheduled'),
	`completed_date` timestamp,
	`actual_duration` decimal(5,2),
	`notes` text,
	`photos` text,
	PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Table structure for table `job_types`
-- =============================================
CREATE TABLE `job_types` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	PRIMARY KEY (`id`),
	UNIQUE KEY `job_types_name_unique` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Table structure for table `jobs`
-- =============================================
CREATE TABLE `jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` text NOT NULL,
	`client_id` int NOT NULL,
	`type` text NOT NULL,
	`status` text NOT NULL DEFAULT ('scheduled'),
	`start_date` timestamp NOT NULL,
	`end_date` timestamp,
	`duration` decimal(5,2) NOT NULL,
	`hourly_rate` decimal(10,2) NOT NULL,
	`materials_cost` decimal(10,2) DEFAULT '0',
	`location` text,
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`completed_date` timestamp,
	`actual_duration` decimal(5,2),
	`photos` text,
	`manage_by_activities` BOOLEAN DEFAULT FALSE COMMENT 'Whether this job uses activity-based management',
	`is_activity_level` BOOLEAN DEFAULT FALSE COMMENT 'Whether costs are managed at activity level',
	`is_price_total` BOOLEAN DEFAULT FALSE COMMENT 'Whether the job uses total price instead of hourly rate',
	PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Table structure for table `plan_configurations`
-- =============================================
CREATE TABLE `plan_configurations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`plan_id` int NOT NULL,
	`features` text,
	`limits` text,
	`is_active` boolean DEFAULT true,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()),
	PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Table structure for table `promotional_spots`
-- =============================================
CREATE TABLE `promotional_spots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` text NOT NULL,
	`content` text,
	`redirect_url` text,
	`enable_redirect` boolean DEFAULT false,
	`images` text,
	`text_animation_type` text DEFAULT ('fixed'),
	`image_display_type` text DEFAULT ('single'),
	`status` text DEFAULT ('inactive'),
	`time_ranges` text,
	`start_time` text,
	`end_time` text,
	`start_date` timestamp,
	`end_date` timestamp,
	`daily_frequency` int DEFAULT 1,
	`weekly_schedule` text,
	`visible_pages` text DEFAULT ('all'),
	`position` text NOT NULL,
	`width` int,
	`height` int,
	`display_duration` int DEFAULT 10,
	`display_interval` int DEFAULT 0,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()),
	PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Table structure for table `roles`
-- =============================================
CREATE TABLE `roles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`permissions` text,
	PRIMARY KEY (`id`),
	UNIQUE KEY `roles_name_unique` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Table structure for table `sectors`
-- =============================================
CREATE TABLE `sectors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`is_active` boolean DEFAULT true,
	`created_at` timestamp DEFAULT (now()),
	PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Table structure for table `subscription_plans`
-- =============================================
CREATE TABLE `subscription_plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`monthly_price` decimal(10,2) NOT NULL,
	`yearly_price` decimal(10,2) NOT NULL,
	`monthly_duration` int,
	`yearly_duration` int,
	`is_active` boolean DEFAULT true,
	`is_free` boolean DEFAULT false,
	`features` text,
	`created_at` timestamp DEFAULT (now()),
	PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Table structure for table `user_subscriptions`
-- =============================================
CREATE TABLE `user_subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`plan_id` int NOT NULL,
	`start_date` timestamp NOT NULL DEFAULT (now()),
	`end_date` timestamp,
	`billing_frequency` text DEFAULT ('monthly'),
	`status` text DEFAULT ('active'),
	`last_billing_date` timestamp,
	`next_billing_date` timestamp,
	`created_at` timestamp DEFAULT (now()),
	PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Table structure for table `users`
-- =============================================
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`username` text NOT NULL,
	`password` text NOT NULL,
	`full_name` text NOT NULL,
	`email` text,
	`phone` text,
	`role_id` int,
	PRIMARY KEY (`id`),
	UNIQUE KEY `users_username_unique` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Table structure for table `web_pages`
-- =============================================
CREATE TABLE `web_pages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`content` text NOT NULL,
	`type` text NOT NULL DEFAULT ('desktop'),
	`status` text NOT NULL DEFAULT ('draft'),
	`featured_image` text,
	`meta_title` text,
	`meta_description` text,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()),
	`published_at` timestamp,
	`author_id` int NOT NULL,
	`is_homepage` boolean DEFAULT false,
	`sort_order` int DEFAULT 0,
	PRIMARY KEY (`id`),
	UNIQUE KEY `web_pages_slug_unique` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Insert default data
-- =============================================

-- Insert default general settings
INSERT INTO `general_settings` (
  `app_name`,
  `default_language`,
  `enable_email_notifications`,
  `enable_whatsapp_notifications`,
  `default_notification_time`,
  `date_format`,
  `time_format`,
  `timezone`,
  `week_starts_on`,
  `session_timeout`,
  `password_min_length`,
  `password_require_numbers`,
  `password_require_special_chars`,
  `default_page_size`,
  `max_upload_file_size`,
  `allowed_file_types`
) VALUES (
  'Artigiano Fast',
  'it',
  true,
  false,
  24,
  'DD/MM/YYYY',
  '24h',
  'Europe/Rome',
  1,
  60,
  8,
  true,
  true,
  10,
  10,
  'jpg,jpeg,png,pdf,doc,docx,xls,xlsx'
);

-- Insert default roles
INSERT INTO `roles` (`name`, `description`, `permissions`) VALUES
('admin', 'Administrator with full access', '["all"]'),
('manager', 'Manager with limited admin access', '["read", "write", "manage_users"]'),
('collaborator', 'Collaborator with basic access', '["read", "write"]'),
('client', 'Client with read-only access', '["read"]');

-- Insert default job types
INSERT INTO `job_types` (`name`, `description`) VALUES
('Ristrutturazione', 'Ristrutturazione completa di immobili'),
('Manutenzione', 'Manutenzione e riparazioni'),
('Installazione', 'Installazione di impianti e sistemi'),
('Consulenza', 'Consulenza tecnica e progettazione');

-- Insert default sectors
INSERT INTO `sectors` (`name`, `description`, `is_active`) VALUES
('Edilizia', 'Settore edilizio e costruzioni', true),
('Idraulica', 'Servizi idraulici', true),
('Elettricità', 'Servizi elettrici', true),
('Riscaldamento', 'Impianti di riscaldamento', true);

-- Insert default subscription plans
INSERT INTO `subscription_plans` (`name`, `description`, `monthly_price`, `yearly_price`, `is_active`, `is_free`, `features`) VALUES
('Gratuito', 'Piano gratuito con funzionalità base', 0.00, 0.00, true, true, '["basic_jobs", "basic_reports"]'),
('Pro', 'Piano professionale con funzionalità avanzate', 29.90, 299.00, true, false, '["advanced_jobs", "advanced_reports", "team_management", "customization"]'),
('Enterprise', 'Piano enterprise per grandi aziende', 99.90, 999.00, true, false, '["all_features", "priority_support", "custom_integrations", "dedicated_manager"]');

COMMIT;
