-- Agrega el campo 'rol' a la tabla usuarios para control de acceso admin

alter table public.usuarios
add column if not exists rol text not null default 'user' check (rol in ('user', 'admin'));

comment on column public.usuarios.rol is 'Rol del usuario: user (por defecto) o admin. Controla acceso a paneles especiales.';
