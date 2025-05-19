-- Tabla de pagos para registrar cada transacción de usuario

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.usuarios(id) on delete cascade,
  subscription_id uuid null references public.subscriptions(id) on delete set null,
  fecha_pago timestamptz not null default now(),
  monto numeric not null,
  metodo text null, -- Ej: 'stripe', 'paypal', 'manual'
  status text not null default 'completed', -- Ej: 'completed', 'pending', 'failed'
  referencia_externa text null, -- ID de Stripe, PayPal, etc.
  created_at timestamptz not null default now()
);

create index if not exists payments_user_id_idx on public.payments(user_id);
create index if not exists payments_subscription_id_idx on public.payments(subscription_id);

comment on table public.payments is 'Registra cada pago realizado por los usuarios, asociado a su suscripción si aplica.';
