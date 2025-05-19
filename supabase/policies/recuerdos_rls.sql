-- Policy para permitir que el rol de servicio (service_role) actualice los campos de mejora IA en recuerdos

-- Permitir UPDATE a cualquier fila si el rol es service_role (Edge Functions)
CREATE POLICY service_update_mejora_ia ON public.recuerdos
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- (Opcional) Permitir SELECT a service_role para debugging
CREATE POLICY service_select_recuerdos ON public.recuerdos
  FOR SELECT
  TO service_role
  USING (true);
