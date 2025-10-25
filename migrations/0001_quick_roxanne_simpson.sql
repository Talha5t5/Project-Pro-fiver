ALTER TABLE `job_types` MODIFY COLUMN `name` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `roles` MODIFY COLUMN `name` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `username` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `web_pages` MODIFY COLUMN `slug` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `activities` ADD `sector_ids` text;--> statement-breakpoint
ALTER TABLE `job_types` ADD `sector_ids` text;--> statement-breakpoint
ALTER TABLE `jobs` ADD `cost` decimal(10,2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE `jobs` ADD `labor_cost` decimal(10,2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE `jobs` ADD `assigned_user_id` int;--> statement-breakpoint
ALTER TABLE `jobs` ADD `manage_by_activities` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `jobs` ADD `is_activity_level` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `jobs` ADD `is_price_total` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `roles` ADD `sector_id` int;--> statement-breakpoint
ALTER TABLE `roles` ADD `is_default` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `users` ADD `type` text DEFAULT ('admin');--> statement-breakpoint
ALTER TABLE `users` ADD `is_active` boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE `users` ADD `language` text DEFAULT ('it');--> statement-breakpoint
ALTER TABLE `users` ADD `feature_settings` text;--> statement-breakpoint
ALTER TABLE `users` ADD `created_at` timestamp DEFAULT (now());