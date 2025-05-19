-- Constraint para evitar duplicados de suscripción gratuita activa por usuario
ALTER TABLE public.subscriptions
ADD CONSTRAINT unique_active_free_subscription_per_user
UNIQUE (user_id, plan, status);

-- Trigger: al insertar un usuario, crear suscripción gratuita si no existe
CREATE OR REPLACE FUNCTION create_free_subscription_on_user_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = NEW.id AND plan = 'Gratis' AND status = 'active'
  ) THEN
    INSERT INTO public.subscriptions (
      user_id, plan, status, started_at, created_at, updated_at
    ) VALUES (
      NEW.id, 'Gratis', 'active', now(), now(), now()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_create_free_subscription ON public.usuarios;

CREATE TRIGGER trigger_create_free_subscription
AFTER INSERT ON public.usuarios
FOR EACH ROW
EXECUTE FUNCTION create_free_subscription_on_user_insert();
