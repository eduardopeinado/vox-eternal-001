-- Migration to create ENUM types for reminder functionality

-- Create enum types for delivery method and status
create type public.delivery_method as enum ('email', 'qr_code');
create type public.reminder_status as enum ('scheduled', 'sent', 'failed', 'cancelled');

-- Add comments for clarity
comment on type public.delivery_method is 'Defines the possible delivery methods for a reminder.';
comment on type public.reminder_status is 'Defines the possible statuses for a scheduled reminder.';
