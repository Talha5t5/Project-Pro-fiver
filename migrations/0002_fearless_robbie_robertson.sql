CREATE TABLE `general_settings` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`application_name` varchar(255) NOT NULL DEFAULT 'Project Management',
	`default_language` varchar(10) NOT NULL DEFAULT 'it',
	`enable_email_notifications` boolean DEFAULT true,
	`enable_whatsapp_notifications` boolean DEFAULT false,
	`default_notification_time` int DEFAULT 24,
	`date_format` varchar(50) NOT NULL DEFAULT 'DD/MM/YYYY',
	`time_format` varchar(10) NOT NULL DEFAULT '24h',
	`timezone` varchar(50) NOT NULL DEFAULT 'Europe/Rome',
	`week_start` varchar(10) DEFAULT 'monday',
	`session_timeout` int DEFAULT 60,
	`min_password_length` int DEFAULT 8,
	`require_numbers` boolean DEFAULT true,
	`require_special_chars` boolean DEFAULT true,
	`default_page_size` int DEFAULT 10,
	`max_upload_file_size` int DEFAULT 10,
	`allowed_file_types` varchar(500) DEFAULT 'jpg,jpeg,png,pdf,doc,docx,xls,xlsx',
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()),
	CONSTRAINT `general_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `feature_settings`;