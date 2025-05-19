-- Create enum types for delivery method and status
create type public.delivery_method as enum ('email', 'qr_code');
create type public.reminder_status as enum ('scheduled', 'sent', 'failed', 'cancelled');

-- Create the future_reminders table
create table public.future_reminders (
    id uuid primary key default gen_random_uuid(),
    creator_user_id uuid not null references public.usuarios(id) on delete cascade,
    recipient_email text null,
    recipient_name text null,
    delivery_method public.delivery_method not null,
    scheduled_delivery_at timestamptz not null,
    title text null,
    message text null,
    status public.reminder_status not null default 'scheduled',
    access_token text not null unique default (uuid_generate_v4())::text,
    created_at timestamptz not null default timezone('utc'::text, now()),
    updated_at timestamptz not null default timezone('utc'::text, now())
);

-- Add comment to the table
comment on table public.future_reminders is 'Stores scheduled future reminders containing capsules.';

-- Enable Row Level Security (RLS)
alter table public.future_reminders enable row level security;

-- Create the future_reminder_capsules table (join table)
create table public.future_reminder_capsules (
    reminder_id uuid not null references public.future_reminders(id) on delete cascade,
    capsule_id uuid not null references public.capsulas(id) on delete cascade,
    primary key (reminder_id, capsule_id)
);

-- Add comment to the table
comment on table public.future_reminder_capsules is 'Associates capsules with future reminders.';

-- Enable Row Level Security (RLS)
alter table public.future_reminder_capsules enable row level security;

-- Optional: Add indexes for frequent lookups
create index idx_future_reminders_creator_id on public.future_reminders(creator_user_id);
create index idx_future_reminders_status_scheduled_at on public.future_reminders(status, scheduled_delivery_at) where status = 'scheduled';
create index idx_future_reminders_access_token on public.future_reminders(access_token);
create index idx_future_reminder_capsules_capsule_id on public.future_reminder_capsules(capsule_id);
