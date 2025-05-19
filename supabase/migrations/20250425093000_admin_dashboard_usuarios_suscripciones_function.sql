-- Función para obtener datos agregados de usuarios, suscripciones y pagos para el dashboard admin

create or replace function public.admin_dashboard_usuarios_suscripciones()
returns table (
  id uuid,
  nombre text,
  email text,
  pais text,
  fecha_creacion timestamptz,
  last_login_ip text,
  plan text,
  status text,
  started_at timestamptz,
  current_period_end timestamptz,
  canceled_at timestamptz,
  payment_method text,
  monto_total_pagado numeric,
  fecha_ultimo_pago timestamptz
)
language sql
as $$
  select
    u.id,
    u.nombre,
    u.email,
    u.país,
    u.fecha_creacion,
    u.last_login_ip,
    s.plan,
    s.status,
    s.started_at,
    s.current_period_end,
    s.canceled_at,
    s.payment_method,
    coalesce(sum(p.monto), 0) as monto_total_pagado,
    max(p.fecha_pago) as fecha_ultimo_pago
  from public.usuarios u
  left join lateral (
    select *
    from public.subscriptions s2
    where s2.user_id = u.id
    order by s2.started_at desc
    limit 1
  ) s on true
  left join public.payments p on p.user_id = u.id
  group by
    u.id, u.nombre, u.email, u.país, u.fecha_creacion, u.last_login_ip,
    s.plan, s.status, s.started_at, s.current_period_end, s.canceled_at, s.payment_method
$$;

comment on function public.admin_dashboard_usuarios_suscripciones() is
'Devuelve datos agregados de usuarios, su suscripción más reciente y pagos totales para el dashboard admin.';
