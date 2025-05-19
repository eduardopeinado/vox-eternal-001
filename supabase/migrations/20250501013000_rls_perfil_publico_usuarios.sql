-- Permitir que cualquier usuario autenticado lea cualquier perfil
create policy "Cualquier usuario autenticado puede leer perfiles"
on public.usuarios
for select
using (auth.role() = 'authenticated');

-- Permitir que solo el usuario dueño actualice su propio perfil
create policy "Solo el usuario puede actualizar su perfil"
on public.usuarios
for update
using (auth.uid() = id);
