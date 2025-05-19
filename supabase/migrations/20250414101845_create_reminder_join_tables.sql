-- Migration to create join tables for mensajes_programados

-- Create the mensajes_programados_capsulas table (join table)
create table public.mensajes_programados_capsulas (
    reminder_id uuid not null references public.mensajes_programados(id) on delete cascade,
    capsule_id uuid not null references public.capsulas(id) on delete cascade,
    primary key (reminder_id, capsule_id)
);

-- Add comment to the table
comment on table public.mensajes_programados_capsulas is 'Associates capsules with scheduled messages (reminders).';

-- Enable Row Level Security (RLS)
alter table public.mensajes_programados_capsulas enable row level security;

-- Add indexes for frequent lookups
create index idx_mensajes_programados_capsulas_capsule_id on public.mensajes_programados_capsulas(capsule_id);
create index idx_mensajes_programados_capsulas_reminder_id on public.mensajes_programados_capsulas(reminder_id);


-- Create the mensajes_programados_recuerdos table (join table)
create table public.mensajes_programados_recuerdos (
    reminder_id uuid not null references public.mensajes_programados(id) on delete cascade,
    recuerdo_id uuid not null references public.recuerdos(id) on delete cascade,
    primary key (reminder_id, recuerdo_id)
);

-- Add comment to the table
comment on table public.mensajes_programados_recuerdos is 'Associates specific recuerdos with scheduled messages (reminders).';

-- Enable Row Level Security (RLS)
alter table public.mensajes_programados_recuerdos enable row level security;

-- Add indexes for frequent lookups
create index idx_mensajes_programados_recuerdos_recuerdo_id on public.mensajes_programados_recuerdos(recuerdo_id);
create index idx_mensajes_programados_recuerdos_reminder_id on public.mensajes_programados_recuerdos(reminder_id);

-- Add RLS policies (Example: Allow creator to manage associations)
-- Adjust these policies based on actual access requirements

CREATE POLICY "Allow creator full access to reminder capsules"
ON public.mensajes_programados_capsulas
FOR ALL
USING (
  auth.uid() = (SELECT creator_user_id FROM public.mensajes_programados WHERE id = reminder_id)
)
WITH CHECK (
  auth.uid() = (SELECT creator_user_id FROM public.mensajes_programados WHERE id = reminder_id)
);

CREATE POLICY "Allow creator full access to reminder recuerdos"
ON public.mensajes_programados_recuerdos
FOR ALL
USING (
  auth.uid() = (SELECT creator_user_id FROM public.mensajes_programados WHERE id = reminder_id)
)
WITH CHECK (
  auth.uid() = (SELECT creator_user_id FROM public.mensajes_programados WHERE id = reminder_id)
);
