-- Migration to drop the obsolete before_insert_mensajes trigger

DROP TRIGGER IF EXISTS before_insert_mensajes ON public.mensajes_programados;

COMMENT ON TABLE public.mensajes_programados IS 'Stores scheduled future reminders. Removed obsolete before_insert_mensajes trigger.';
