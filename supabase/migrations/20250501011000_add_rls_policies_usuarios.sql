-- Permitir que cada usuario lea su propio perfil
create policy "Usuarios pueden leer su propio perfil"
on public.usuarios
for select
using (auth.uid() = id);

-- Permitir que cada usuario actualice su propio perfil
create policy "Usuarios pueden actualizar su propio perfil"
on public.usuarios
for update
using (auth.uid() = id);
