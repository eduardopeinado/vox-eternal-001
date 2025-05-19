-- Agrega el campo 'bio' (biografía) al perfil de usuario
ALTER TABLE public.usuarios
ADD COLUMN bio text NULL;
