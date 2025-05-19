-- Migration to refactor 'mensajes_programados' table to align with 'future_reminders' concept

-- Drop the existing CHECK constraint that restricts 'tipo'
ALTER TABLE public.mensajes_programados DROP CONSTRAINT IF EXISTS mensajes_programados_tipo_check;

-- Drop columns that are being replaced or are incorrect for the reminder functionality
ALTER TABLE public.mensajes_programados
  DROP COLUMN IF EXISTS tipo,
  DROP COLUMN IF EXISTS contenido_texto,
  DROP COLUMN IF EXISTS id_archivo_asociado,
  DROP COLUMN IF EXISTS entregado;

-- Rename existing columns to match the intended schema and code expectations
ALTER TABLE public.mensajes_programados
  RENAME COLUMN usuario_id TO creator_user_id;
ALTER TABLE public.mensajes_programados
  RENAME COLUMN fecha_entrega TO scheduled_delivery_at;
ALTER TABLE public.mensajes_programados
  RENAME COLUMN correo_destinatario TO recipient_email;
ALTER TABLE public.mensajes_programados
  RENAME COLUMN nombre_destinatario TO recipient_name;
-- Rename 'mensaje_personal' to 'message' to store the main reminder message
ALTER TABLE public.mensajes_programados
  RENAME COLUMN mensaje_personal TO message;

-- Alter column types where necessary to match the intended schema
ALTER TABLE public.mensajes_programados
  ALTER COLUMN scheduled_delivery_at TYPE timestamptz USING scheduled_delivery_at::timestamptz; -- Ensure it's timestamp with timezone

-- Add the missing columns required for the reminder functionality, allowing NULLs initially
ALTER TABLE public.mensajes_programados
  ADD COLUMN delivery_method public.delivery_method NULL, -- Allow NULL initially
  ADD COLUMN status public.reminder_status NULL, -- Allow NULL initially
  ADD COLUMN access_token text NULL, -- Allow NULL initially for easier update
  ADD COLUMN created_at timestamptz NULL, -- Allow NULL initially
  ADD COLUMN updated_at timestamptz NULL, -- Allow NULL initially
  ADD COLUMN title text NULL; -- Add a separate title column (optional)

-- Update existing rows with default values for the new NOT NULL columns
-- Use 'email' as default delivery_method and 'scheduled' as default status
-- Use current time for created_at/updated_at and generate access_token
UPDATE public.mensajes_programados
SET
  delivery_method = 'email'::public.delivery_method,
  status = 'scheduled'::public.reminder_status,
  access_token = (gen_random_uuid())::text,
  created_at = timezone('utc'::text, now()),
  updated_at = timezone('utc'::text, now())
WHERE
  delivery_method IS NULL OR status IS NULL OR access_token IS NULL OR created_at IS NULL OR updated_at IS NULL;

-- Now, alter the columns to add the NOT NULL constraints and defaults where appropriate
ALTER TABLE public.mensajes_programados
  ALTER COLUMN delivery_method SET NOT NULL,
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN status SET DEFAULT 'scheduled',
  ALTER COLUMN access_token SET NOT NULL,
  ALTER COLUMN access_token SET DEFAULT (gen_random_uuid())::text,
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN created_at SET DEFAULT timezone('utc'::text, now()),
  ALTER COLUMN updated_at SET NOT NULL,
  ALTER COLUMN updated_at SET DEFAULT timezone('utc'::text, now());

-- Add UNIQUE constraint to access_token AFTER populating existing rows
ALTER TABLE public.mensajes_programados
  ADD CONSTRAINT mensajes_programados_access_token_key UNIQUE (access_token);


-- Ensure the foreign key constraint for the creator user is correctly named and configured
-- Drop potential old FK constraint if it exists
ALTER TABLE public.mensajes_programados DROP CONSTRAINT IF EXISTS mensajes_programados_usuario_id_fkey;
-- Add the constraint with the new column name, referencing public.usuarios
-- Consider the ON DELETE behavior (SET NULL, CASCADE, RESTRICT) based on requirements
ALTER TABLE public.mensajes_programados
  ADD CONSTRAINT mensajes_programados_creator_user_id_fkey FOREIGN KEY (creator_user_id) REFERENCES public.usuarios(id) ON DELETE SET NULL;

-- Add comments for clarity
COMMENT ON TABLE public.mensajes_programados IS 'Stores scheduled future reminders containing references to capsules/memories.';
COMMENT ON COLUMN public.mensajes_programados.creator_user_id IS 'FK to the user who created the reminder.';
COMMENT ON COLUMN public.mensajes_programados.scheduled_delivery_at IS 'Timestamp (with timezone) when the reminder is scheduled for delivery.';
COMMENT ON COLUMN public.mensajes_programados.recipient_email IS 'Email address of the recipient.';
COMMENT ON COLUMN public.mensajes_programados.recipient_name IS 'Name of the recipient (optional).';
COMMENT ON COLUMN public.mensajes_programados.message IS 'The main message content of the reminder.';
COMMENT ON COLUMN public.mensajes_programados.delivery_method IS 'Method of delivery (email or qr_code).';
COMMENT ON COLUMN public.mensajes_programados.status IS 'Current status of the reminder (scheduled, sent, failed, cancelled).';
COMMENT ON COLUMN public.mensajes_programados.access_token IS 'Unique token for accessing the reminder (especially for QR code).';
COMMENT ON COLUMN public.mensajes_programados.created_at IS 'Timestamp when the reminder was created.';
COMMENT ON COLUMN public.mensajes_programados.updated_at IS 'Timestamp when the reminder was last updated.';
COMMENT ON COLUMN public.mensajes_programados.title IS 'Optional title for the reminder.';
