-- Rename the main table
ALTER TABLE public.mensajes_programados RENAME TO future_reminders;

-- Rename the join table for capsules
ALTER TABLE public.mensajes_programados_capsulas RENAME TO future_reminder_capsules;

-- Rename the join table for recuerdos
ALTER TABLE public.mensajes_programados_recuerdos RENAME TO future_reminder_recuerdos;

-- Drop old FK constraints (assuming default naming convention, adjust if needed)
-- It's safer to drop and recreate to ensure they point to the renamed table.
ALTER TABLE public.future_reminder_capsules DROP CONSTRAINT IF EXISTS mensajes_programados_capsulas_reminder_id_fkey;
ALTER TABLE public.future_reminder_recuerdos DROP CONSTRAINT IF EXISTS mensajes_programados_recuerdos_reminder_id_fkey;

-- Add new FK constraints referencing the renamed main table
ALTER TABLE public.future_reminder_capsules
  ADD CONSTRAINT future_reminder_capsules_reminder_id_fkey FOREIGN KEY (reminder_id) REFERENCES public.future_reminders(id) ON DELETE CASCADE;

ALTER TABLE public.future_reminder_recuerdos
  ADD CONSTRAINT future_reminder_recuerdos_reminder_id_fkey FOREIGN KEY (reminder_id) REFERENCES public.future_reminders(id) ON DELETE CASCADE;

-- Rename indexes (optional but good practice)
ALTER INDEX IF EXISTS idx_mensajes_programados_capsulas_capsule_id RENAME TO idx_future_reminder_capsules_capsule_id;
ALTER INDEX IF EXISTS idx_mensajes_programados_capsulas_reminder_id RENAME TO idx_future_reminder_capsules_reminder_id;
ALTER INDEX IF EXISTS idx_mensajes_programados_recuerdos_recuerdo_id RENAME TO idx_future_reminder_recuerdos_recuerdo_id;
ALTER INDEX IF EXISTS idx_mensajes_programados_recuerdos_reminder_id RENAME TO idx_future_reminder_recuerdos_reminder_id;

-- Drop old RLS policies defined on the join tables (using their NEW names)
DROP POLICY IF EXISTS "Allow creator full access to reminder capsules" ON public.future_reminder_capsules;
DROP POLICY IF EXISTS "Allow creator full access to reminder recuerdos" ON public.future_reminder_recuerdos;

-- Recreate RLS policies referencing the RENAMED main table 'future_reminders'
CREATE POLICY "Allow creator full access to future reminder capsules"
ON public.future_reminder_capsules
FOR ALL
USING (
  auth.uid() = (SELECT creator_user_id FROM public.future_reminders WHERE id = reminder_id) -- Use new table name
)
WITH CHECK (
  auth.uid() = (SELECT creator_user_id FROM public.future_reminders WHERE id = reminder_id) -- Use new table name
);

CREATE POLICY "Allow creator full access to future reminder recuerdos"
ON public.future_reminder_recuerdos
FOR ALL
USING (
  auth.uid() = (SELECT creator_user_id FROM public.future_reminders WHERE id = reminder_id) -- Use new table name
)
WITH CHECK (
  auth.uid() = (SELECT creator_user_id FROM public.future_reminders WHERE id = reminder_id) -- Use new table name
);

-- Update comments (optional but good practice)
COMMENT ON TABLE public.future_reminders IS 'Stores scheduled future reminders containing references to capsules/memories.';
COMMENT ON TABLE public.future_reminder_capsules IS 'Associates capsules with scheduled future reminders.';
COMMENT ON TABLE public.future_reminder_recuerdos IS 'Associates specific recuerdos with scheduled future reminders.';
