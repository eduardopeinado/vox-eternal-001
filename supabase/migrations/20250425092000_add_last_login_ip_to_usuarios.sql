-- Agrega campo para guardar la última IP de acceso del usuario

alter table public.usuarios
add column if not exists last_login_ip text null;

comment on column public.usuarios.last_login_ip is 'Última IP de acceso del usuario. Se actualiza en cada login.';
