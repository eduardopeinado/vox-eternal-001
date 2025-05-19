-- Agrega campos para mejoras IA a la tabla recuerdos
ALTER TABLE recuerdos
  ADD COLUMN url_mejorado text,
  ADD COLUMN tipo_mejora_ia text,
  ADD COLUMN fecha_mejora_ia timestamp with time zone;

-- Crea tabla de auditoría para mejoras IA
CREATE TABLE mejoras_ia_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  recuerdo_id uuid REFERENCES recuerdos(id) ON DELETE SET NULL,
  tipo text NOT NULL, -- 'foto', 'audio', 'video'
  fecha timestamp with time zone NOT NULL DEFAULT now(),
  resultado text, -- 'aceptada', 'descartada', 'error'
  url_antes text,
  url_despues text
);
