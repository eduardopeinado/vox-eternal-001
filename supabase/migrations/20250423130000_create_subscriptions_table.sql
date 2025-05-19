-- Tabla de suscripciones para control de pagos y acceso premium

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.usuarios(id) on delete cascade,
  plan text not null, -- Ej: 'Gratis', 'Básico', 'Premium', 'Vitalicio'
  status text not null, -- Ej: 'active', 'canceled', 'incomplete', 'past_due'
  started_at timestamptz not null default now(),
  current_period_end timestamptz,
  canceled_at timestamptz,
  stripe_subscription_id text,
  stripe_customer_id text,
  payment_method text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subscriptions_user_id_idx on public.subscriptions(user_id);

-- Trigger para actualizar updated_at automáticamente
create or replace function update_subscriptions_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_subscriptions_updated_at on public.subscriptions;

create trigger set_subscriptions_updated_at
before update on public.subscriptions
for each row
execute procedure update_subscriptions_updated_at();
