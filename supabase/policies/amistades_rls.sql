-- Policies RLS para la tabla amistades

-- Habilitar RLS en la tabla amistades
ALTER TABLE public.amistades ENABLE ROW LEVEL SECURITY;

-- Policy para que un usuario pueda ver solo las relaciones donde es parte (usuario_id o amigo_id)
CREATE POLICY select_amistades ON public.amistades
  FOR SELECT
  USING (
    usuario_id = auth.uid() OR amigo_id = auth.uid()
  );

-- Policy para que un usuario pueda insertar solicitudes de amistad donde usuario_id = auth.uid()
CREATE POLICY insert_amistades ON public.amistades
  FOR INSERT
  WITH CHECK (
    usuario_id = auth.uid()
  );

-- Policy para que un usuario pueda actualizar relaciones donde es parte
CREATE POLICY update_amistades ON public.amistades
  FOR UPDATE
  USING (
    usuario_id = auth.uid() OR amigo_id = auth.uid()
  )
  WITH CHECK (
    usuario_id = auth.uid() OR amigo_id = auth.uid()
  );

-- Policy para que un usuario pueda eliminar relaciones donde es parte
CREATE POLICY delete_amistades ON public.amistades
  FOR DELETE
  USING (
    usuario_id = auth.uid() OR amigo_id = auth.uid()
  );

-- Policies RLS para la tabla usuarios

ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

-- Policy para que un usuario pueda modificar solo su propio perfil
CREATE POLICY update_usuarios ON public.usuarios
  FOR UPDATE
  USING (
    id = auth.uid()
  )
  WITH CHECK (
    id = auth.uid()
  );

-- Policy para que un usuario pueda ver su perfil y perfiles de amigos aceptados
CREATE POLICY select_usuarios ON public.usuarios
  FOR SELECT
  USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.amistades a
      WHERE (
        (a.usuario_id = auth.uid() AND a.amigo_id = usuarios.id)
        OR (a.amigo_id = auth.uid() AND a.usuario_id = usuarios.id)
      )
      AND a.estado = 'aceptado'
    )
  );
