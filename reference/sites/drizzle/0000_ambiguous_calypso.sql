CREATE TABLE `catalogs` (
	`id` integer PRIMARY KEY NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`body` text NOT NULL,
	`updated_by` text NOT NULL,
	`updated_at` text NOT NULL
);
