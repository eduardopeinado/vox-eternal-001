-- Crea una función segura para obtener la distribución de usuarios únicos por plan activo
create or replace function public.usuarios_por_plan_activo()
returns table(plan text, cantidad integer)
language sql
as $$
  select plan, count(distinct user_id) as cantidad
  from subscriptions
  where status = 'active'
  group by plan
$$;

-- Da permisos de ejecución a los roles públicos
grant execute on function public.usuarios_por_plan_activo() to anon, authenticated;
