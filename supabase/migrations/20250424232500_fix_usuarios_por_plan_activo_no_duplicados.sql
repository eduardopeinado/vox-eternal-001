-- Corrige la función para evitar duplicados y filas con cantidad 0 para "free"
create or replace function public.usuarios_por_plan_activo()
returns table(plan text, cantidad integer)
language sql
as $$
  select plan, cantidad from (
    -- Usuarios con suscripción activa (planes pagos)
    select plan, count(distinct user_id) as cantidad
    from subscriptions
    where status = 'active'
    group by plan
    union
    -- Usuarios "free": los que no tienen ninguna suscripción activa
    select 'free' as plan, count(*) as cantidad
    from usuarios
    where id not in (
      select user_id from subscriptions where status = 'active'
    )
  ) as sub
  where cantidad > 0
$$;

grant execute on function public.usuarios_por_plan_activo() to anon, authenticated;
