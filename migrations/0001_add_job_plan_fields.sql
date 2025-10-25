-- Migration to add plan-related fields to jobs table
-- These fields control activity management features based on subscription plans

ALTER TABLE jobs 
ADD COLUMN manage_by_activities BOOLEAN DEFAULT FALSE,
ADD COLUMN is_activity_level BOOLEAN DEFAULT FALSE,
ADD COLUMN is_price_total BOOLEAN DEFAULT FALSE;

-- Add comments to explain the purpose of these fields
ALTER TABLE jobs 
MODIFY COLUMN manage_by_activities BOOLEAN DEFAULT FALSE COMMENT 'Whether this job uses activity-based management',
MODIFY COLUMN is_activity_level BOOLEAN DEFAULT FALSE COMMENT 'Whether costs are managed at activity level',
MODIFY COLUMN is_price_total BOOLEAN DEFAULT FALSE COMMENT 'Whether the job uses total price instead of hourly rate';
