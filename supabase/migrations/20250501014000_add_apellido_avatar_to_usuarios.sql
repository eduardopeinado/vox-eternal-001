-- Agrega el campo 'apellido' al perfil de usuario
ALTER TABLE public.usuarios
ADD COLUMN IF NOT EXISTS apellido text NULL;

-- Agrega el campo 'avatar_url' para la foto de perfil
ALTER TABLE public.usuarios
ADD COLUMN IF NOT EXISTS avatar_url text NULL;
