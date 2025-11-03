CREATE TABLE `activities` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`name` text NOT NULL,
	`job_type_id` bigint unsigned NOT NULL,
	`job_type_ids` text,
	`sector_ids` text,
	`description` text,
	`implementation_notes` text,
	`default_duration` decimal(5,2),
	`default_rate` decimal(10,2),
	`default_cost` decimal(10,2),
	CONSTRAINT `activities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `activity_collaborators` (
	`activity_id` bigint unsigned NOT NULL,
	`collaborator_id` bigint unsigned NOT NULL,
	CONSTRAINT `activity_collaborators_activity_id_collaborator_id_pk` PRIMARY KEY(`activity_id`,`collaborator_id`)
);
--> statement-breakpoint
CREATE TABLE `clients` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL DEFAULT ('residential'),
	`phone` text,
	`email` text,
	`address` text,
	`geo_location` text,
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `clients_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `collaborators` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`name` text NOT NULL,
	`role_id` bigint unsigned,
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
	CONSTRAINT `collaborators_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `general_settings` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
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
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `general_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `job_activities` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`job_id` bigint unsigned NOT NULL,
	`activity_id` bigint unsigned NOT NULL,
	`start_date` timestamp NOT NULL,
	`duration` decimal(5,2) NOT NULL,
	`status` text DEFAULT ('scheduled'),
	`completed_date` timestamp DEFAULT (now()),
	`actual_duration` decimal(5,2),
	`notes` text,
	`photos` text,
	CONSTRAINT `job_activities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `job_types` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`sector_ids` text,
	CONSTRAINT `job_types_id` PRIMARY KEY(`id`),
	CONSTRAINT `job_types_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `jobs` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`title` text NOT NULL,
	`client_id` bigint unsigned NOT NULL,
	`type` text NOT NULL,
	`status` text NOT NULL DEFAULT ('scheduled'),
	`start_date` timestamp NOT NULL,
	`end_date` timestamp DEFAULT (now()),
	`duration` decimal(5,2) NOT NULL,
	`hourly_rate` decimal(10,2) NOT NULL,
	`materials_cost` decimal(10,2) DEFAULT '0',
	`cost` decimal(10,2) DEFAULT '0',
	`labor_cost` decimal(10,2) DEFAULT '0',
	`location` text,
	`notes` text,
	`assigned_user_id` bigint unsigned,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`completed_date` timestamp DEFAULT (now()),
	`actual_duration` decimal(5,2),
	`photos` text,
	`manage_by_activities` boolean DEFAULT false,
	`is_activity_level` boolean DEFAULT false,
	`is_price_total` boolean DEFAULT false,
	CONSTRAINT `jobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `plan_configurations` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`plan_id` bigint unsigned NOT NULL,
	`features` text,
	`limits` text,
	`is_active` boolean DEFAULT true,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `plan_configurations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `promotional_spots` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
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
	`end_date` timestamp DEFAULT (now()),
	`daily_frequency` int DEFAULT 1,
	`weekly_schedule` text,
	`visible_pages` text DEFAULT ('all'),
	`position` text NOT NULL,
	`width` int,
	`height` int,
	`display_duration` int DEFAULT 10,
	`display_interval` int DEFAULT 0,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `promotional_spots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `roles` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`permissions` text,
	`sector_id` bigint unsigned,
	`is_default` boolean DEFAULT false,
	CONSTRAINT `roles_id` PRIMARY KEY(`id`),
	CONSTRAINT `roles_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `sectors` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`is_active` boolean DEFAULT true,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `sectors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subscription_plans` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
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
	CONSTRAINT `subscription_plans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_subscriptions` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`plan_id` bigint unsigned NOT NULL,
	`start_date` timestamp NOT NULL DEFAULT (now()),
	`end_date` timestamp DEFAULT (now()),
	`billing_frequency` text DEFAULT ('monthly'),
	`status` text DEFAULT ('active'),
	`last_billing_date` timestamp DEFAULT (now()),
	`next_billing_date` timestamp DEFAULT (now()),
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `user_subscriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`username` varchar(255) NOT NULL,
	`password` text NOT NULL,
	`full_name` text NOT NULL,
	`email` text,
	`phone` text,
	`role_id` bigint unsigned,
	`type` text DEFAULT ('admin'),
	`is_active` boolean DEFAULT true,
	`language` text DEFAULT ('it'),
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_username_unique` UNIQUE(`username`)
);
--> statement-breakpoint
CREATE TABLE `web_pages` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`title` text NOT NULL,
	`slug` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`type` text NOT NULL DEFAULT ('desktop'),
	`status` text NOT NULL DEFAULT ('draft'),
	`featured_image` text,
	`meta_title` text,
	`meta_description` text,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`published_at` timestamp DEFAULT (now()),
	`author_id` bigint unsigned NOT NULL,
	`is_homepage` boolean DEFAULT false,
	`sort_order` int DEFAULT 0,
	CONSTRAINT `web_pages_id` PRIMARY KEY(`id`),
	CONSTRAINT `web_pages_slug_unique` UNIQUE(`slug`)
);
