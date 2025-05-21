-- MIGRACIÓN: Creación de tabla future_reminders con FK robusta a public.usuarios
-- Fecha: 2025-04-13

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema='public' AND table_name='future_reminders'
  ) THEN
    EXECUTE '
      CREATE TABLE public.future_reminders (
        id uuid primary key default gen_random_uuid(),
        creator_user_id uuid not null references public.usuarios(id) on delete cascade,
        recipient_email text null,
        recipient_name text null,
        delivery_method public.delivery_method not null,
        scheduled_delivery_at timestamptz not null,
        title text null,
        message text null,
        status public.reminder_status not null default ''scheduled'',
        access_token text not null unique default (uuid_generate_v4())::text,
        created_at timestamptz not null default timezone(''utc''::text, now()),
        updated_at timestamptz not null default timezone(''utc''::text, now())
      );
    ';
  END IF;
END;
$$;
