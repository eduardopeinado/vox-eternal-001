-- Agrega campos para tracking de notificaciones y apertura en future_reminders

alter table public.future_reminders
  add column if not exists pre_due_notification_sent_at timestamptz null,
  add column if not exists due_notification_sent_at timestamptz null,
  add column if not exists last_reminder_sent_at timestamptz null,
  add column if not exists opened_at timestamptz null;

-- Comentarios para claridad
comment on column public.future_reminders.pre_due_notification_sent_at is 'Fecha/hora en que se envió el aviso de 1 día antes al beneficiario';
comment on column public.future_reminders.due_notification_sent_at is 'Fecha/hora en que se notificó que la cápsula está disponible';
comment on column public.future_reminders.last_reminder_sent_at is 'Fecha/hora del último recordatorio recurrente enviado';
comment on column public.future_reminders.opened_at is 'Fecha/hora en que el beneficiario abrió la cápsula';
