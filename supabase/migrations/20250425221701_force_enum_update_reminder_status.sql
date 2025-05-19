-- Solución robusta para cambiar el valor 'sent' a 'available' en el enum reminder_status en PostgreSQL

-- 1. Renombrar el tipo actual
alter type public.reminder_status rename to reminder_status_old;

-- 2. Crear el nuevo tipo sin 'sent' y con 'available'
create type public.reminder_status as enum ('scheduled', 'available', 'failed', 'cancelled');

-- 2.1. Eliminar el default temporalmente para evitar el error de conversión
alter table public.future_reminders alter column status drop default;

-- 3. Alterar la columna para usar el nuevo tipo (con conversión)
alter table public.future_reminders
  alter column status type public.reminder_status
  using (
    case
      when status = 'sent' then 'available'::public.reminder_status
      else status::text::public.reminder_status
    end
  );

-- 4. Restaurar el default si lo deseas (opcional, aquí lo dejo como 'scheduled')
alter table public.future_reminders alter column status set default 'scheduled';

-- 5. Eliminar el tipo antiguo
drop type public.reminder_status_old;
