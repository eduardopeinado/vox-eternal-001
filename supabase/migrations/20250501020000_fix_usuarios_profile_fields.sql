-- Limpieza y estandarización de la tabla usuarios para el flujo de perfil

-- 1. Eliminar campo duplicado de país con tilde
ALTER TABLE public.usuarios DROP COLUMN IF EXISTS "país";

-- 2. Eliminar campo de fecha de creación sin tz (obsoleto)
ALTER TABLE public.usuarios DROP COLUMN IF EXISTS "fecha_creación";

-- 3. Agregar campo bio si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='usuarios' AND column_name='bio'
  ) THEN
    ALTER TABLE public.usuarios ADD COLUMN bio text;
  END IF;
END$$;

-- 4. Agregar campo plan si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='usuarios' AND column_name='plan'
  ) THEN
    ALTER TABLE public.usuarios ADD COLUMN plan text;
  END IF;
END$$;

-- 5. (Opcional) Renombrar fecha_creacion a created_at y agregar updated_at si no existen
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='usuarios' AND column_name='fecha_creacion'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='usuarios' AND column_name='created_at'
  ) THEN
    ALTER TABLE public.usuarios RENAME COLUMN fecha_creacion TO created_at;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='usuarios' AND column_name='updated_at'
  ) THEN
    ALTER TABLE public.usuarios ADD COLUMN updated_at timestamptz DEFAULT now() NOT NULL;
  END IF;
END$$;

-- 6. Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION public.set_updated_at_usuarios()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_usuarios ON public.usuarios;

CREATE TRIGGER set_updated_at_usuarios
BEFORE UPDATE ON public.usuarios
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at_usuarios();
