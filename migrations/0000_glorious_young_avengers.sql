CREATE TABLE `activities` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`name` text NOT NULL,
	`job_type_id` int NOT NULL,
	`job_type_ids` text,
	`description` text,
	`implementation_notes` text,
	`default_duration` decimal(5,2),
	`default_rate` decimal(10,2),
	`default_cost` decimal(10,2),
	CONSTRAINT `activities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `activity_collaborators` (
	`activity_id` int NOT NULL,
	`collaborator_id` int NOT NULL,
	CONSTRAINT `activity_collaborators_activity_id_collaborator_id_pk` PRIMARY KEY(`activity_id`,`collaborator_id`)
);
--> statement-breakpoint
CREATE TABLE `clients` (
	`id` serial AUTO_INCREMENT NOT NULL,
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
	`id` serial AUTO_INCREMENT NOT NULL,
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
	CONSTRAINT `collaborators_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `job_activities` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`job_id` int NOT NULL,
	`activity_id` int NOT NULL,
	`start_date` timestamp NOT NULL,
	`duration` decimal(5,2) NOT NULL,
	`status` text DEFAULT ('scheduled'),
	`completed_date` timestamp,
	`actual_duration` decimal(5,2),
	`notes` text,
	`photos` text,
	CONSTRAINT `job_activities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `job_types` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	CONSTRAINT `job_types_id` PRIMARY KEY(`id`),
	CONSTRAINT `job_types_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `jobs` (
	`id` serial AUTO_INCREMENT NOT NULL,
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
	CONSTRAINT `jobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `plan_configurations` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`plan_id` int NOT NULL,
	`features` text,
	`limits` text,
	`is_active` boolean DEFAULT true,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()),
	CONSTRAINT `plan_configurations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `promotional_spots` (
	`id` serial AUTO_INCREMENT NOT NULL,
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
	CONSTRAINT `promotional_spots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `roles` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`permissions` text,
	CONSTRAINT `roles_id` PRIMARY KEY(`id`),
	CONSTRAINT `roles_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `sectors` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`is_active` boolean DEFAULT true,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `sectors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subscription_plans` (
	`id` serial AUTO_INCREMENT NOT NULL,
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
	`id` serial AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`plan_id` int NOT NULL,
	`start_date` timestamp NOT NULL DEFAULT (now()),
	`end_date` timestamp,
	`billing_frequency` text DEFAULT ('monthly'),
	`status` text DEFAULT ('active'),
	`last_billing_date` timestamp,
	`next_billing_date` timestamp,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `user_subscriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`username` text NOT NULL,
	`password` text NOT NULL,
	`full_name` text NOT NULL,
	`email` text,
	`phone` text,
	`role_id` int,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_username_unique` UNIQUE(`username`)
);
--> statement-breakpoint
CREATE TABLE `web_pages` (
	`id` serial AUTO_INCREMENT NOT NULL,
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
	CONSTRAINT `web_pages_id` PRIMARY KEY(`id`),
	CONSTRAINT `web_pages_slug_unique` UNIQUE(`slug`)
);
