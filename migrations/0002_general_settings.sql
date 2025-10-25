-- Migration: Add general_settings table
-- Created: 2024-01-01

CREATE TABLE IF NOT EXISTS `general_settings` (
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

-- Insert default settings
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
  'Project Management',
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
