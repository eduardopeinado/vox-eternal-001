-- Fix robusto: no falla si la cápsula ya no existe
CREATE OR REPLACE FUNCTION notify_owner_on_contributor_delete()
RETURNS trigger AS $$
DECLARE
  owner_id uuid;
  capsule_title text;
  contributor_email text;
  notification_message text;
BEGIN
  -- Protección: si capsula_id es NULL, salir
  IF OLD.capsula_id IS NULL THEN
    RETURN OLD;
  END IF;

  -- Obtener el ID del propietario y título de la cápsula
  SELECT usuario_id, titulo INTO owner_id, capsule_title
  FROM public.capsulas
  WHERE id = OLD.capsula_id;

  -- Si no se encuentra la cápsula, salir sin error
  IF owner_id IS NULL THEN
    RETURN OLD;
  END IF;

  -- Obtener el email del contribuidor que se fue (desde auth.users)
  SELECT email INTO contributor_email
  FROM auth.users
  WHERE id = OLD.user_id;

  -- Construir el mensaje
  notification_message := format(
    'El usuario %s ha dejado de seguir tu cápsula "%s".',
    COALESCE(contributor_email, OLD.user_id::text),
    COALESCE(capsule_title, 'Sin Título')
  );

  -- Insertar la notificación para el propietario (si se encontró)
  INSERT INTO public.notificaciones (usuario_id, tipo, mensaje, metadata)
  VALUES (
    owner_id,
    'contribucion_eliminada',
    notification_message,
    jsonb_build_object(
      'capsula_id', OLD.capsula_id,
      'contributor_id', OLD.user_id
    )
  );

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;
