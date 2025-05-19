-- Crea tabla relacional para asociar archivos multimedia (recuerdos) a mensajes al futuro

create table if not exists future_reminder_files (
  id uuid primary key default gen_random_uuid(),
  future_reminder_id uuid not null references future_reminders(id) on delete cascade,
  recuerdo_id uuid not null references recuerdos(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (future_reminder_id, recuerdo_id)
);

-- Índices para consultas rápidas
create index if not exists idx_future_reminder_files_reminder on future_reminder_files(future_reminder_id);
create index if not exists idx_future_reminder_files_recuerdo on future_reminder_files(recuerdo_id);
