// supabase/functions/stripe-webhook/index.ts
// Webhook HTTP para recibir eventos de Stripe y sincronizar la tabla subscriptions

const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

// Para validar la firma del webhook
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    res.status(500).json({ error: 'Falta STRIPE_SECRET_KEY en el entorno' });
    return;
  }

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2025-03-31.basil',
  });

  // Inicializar cliente Supabase
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    res.status(500).json({ error: 'Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno' });
    return;
  }
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

  let event;

  // Validar la firma del webhook si se configuró el secret
  if (endpointSecret) {
    const sig = req.headers['stripe-signature'];
    try {
      event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
    } catch (err: any) {
      res.status(400).send(`Webhook signature verification failed: ${err.message}`);
      return;
    }
  } else {
    // Si no hay secret, aceptar el evento sin validar (solo para pruebas locales)
    event = req.body;
  }

  // Procesar el evento según el tipo
  switch (event.type) {
    case 'checkout.session.completed': {
      // Marcar suscripción como activa en Supabase
      const session = event.data.object;
      const stripeCustomerId = session.customer;
      const stripeSubscriptionId = session.subscription;
      const email = session.customer_email || (session.customer_details && session.customer_details.email);

      if (!email || !stripeSubscriptionId) {
        console.error('Faltan datos para crear la suscripción:', { email, stripeSubscriptionId });
        break;
      }

      // Obtener el nombre del plan desde line_items de Stripe
      let planNickname = null;
      try {
        // Necesitamos expandir los line_items de la sesión
        const sessionWithLineItems = await stripe.checkout.sessions.retrieve(session.id, {
          expand: ['line_items.data.price'],
        });
        if (
          sessionWithLineItems.line_items &&
          sessionWithLineItems.line_items.data &&
          sessionWithLineItems.line_items.data.length > 0
        ) {
          planNickname = sessionWithLineItems.line_items.data[0].price.nickname || null;
        }
      } catch (err) {
        console.error('Error obteniendo line_items de Stripe:', err);
      }

      // Buscar usuario por email
      const { data: user, error: userError } = await supabase
        .from('usuarios')
        .select('id')
        .eq('email', email)
        .single();

      if (userError || !user) {
        console.error('No se encontró el usuario en Supabase:', email, userError);
        break;
      }

      // Upsert en subscriptions
      const { error: subError } = await supabase
        .from('subscriptions')
        .upsert({
          user_id: user.id,
          stripe_customer_id: stripeCustomerId,
          stripe_subscription_id: stripeSubscriptionId,
          plan: planNickname,
          status: 'active',
          current_period_start: new Date().toISOString(),
          current_period_end: null, // Se puede actualizar con el evento de subscription.created/updated
        }, { onConflict: ['user_id'] });

      if (subError) {
        console.error('Error al crear/actualizar la suscripción:', subError);
      }
      break;
    }
    case 'invoice.paid': {
      // Renovación exitosa: actualizar periodo y estado
      const invoice = event.data.object;
      const stripeSubscriptionId = invoice.subscription;
      const periodStart = new Date(invoice.lines.data[0].period.start * 1000).toISOString();
      const periodEnd = new Date(invoice.lines.data[0].period.end * 1000).toISOString();

      const { error } = await supabase
        .from('subscriptions')
        .update({
          status: 'active',
          current_period_start: periodStart,
          current_period_end: periodEnd,
        })
        .eq('stripe_subscription_id', stripeSubscriptionId);

      if (error) {
        console.error('Error al actualizar suscripción (invoice.paid):', error);
      }
      break;
    }
    case 'invoice.payment_failed': {
      // Fallo de pago: marcar como past_due
      const invoice = event.data.object;
      const stripeSubscriptionId = invoice.subscription;

      const { error } = await supabase
        .from('subscriptions')
        .update({
          status: 'past_due',
        })
        .eq('stripe_subscription_id', stripeSubscriptionId);

      if (error) {
        console.error('Error al actualizar suscripción (payment_failed):', error);
      }
      break;
    }
    case 'customer.subscription.updated': {
      // Actualización de plan, fechas o estado
      const sub = event.data.object;
      const stripeSubscriptionId = sub.id;
      const periodStart = new Date(sub.current_period_start * 1000).toISOString();
      const periodEnd = new Date(sub.current_period_end * 1000).toISOString();

      const { error } = await supabase
        .from('subscriptions')
        .update({
          plan: sub.items.data[0]?.price.nickname || null,
          status: sub.status,
          current_period_start: periodStart,
          current_period_end: periodEnd,
        })
        .eq('stripe_subscription_id', stripeSubscriptionId);

      if (error) {
        console.error('Error al actualizar suscripción (subscription.updated):', error);
      }
      break;
    }
    case 'customer.subscription.deleted': {
      // Cancelación: marcar como canceled y registrar fecha de finalización
      const sub = event.data.object;
      const stripeSubscriptionId = sub.id;
      const periodEnd = new Date(sub.current_period_end * 1000).toISOString();

      const { error } = await supabase
        .from('subscriptions')
        .update({
          status: 'canceled',
          current_period_end: periodEnd,
        })
        .eq('stripe_subscription_id', stripeSubscriptionId);

      if (error) {
        console.error('Error al cancelar suscripción (subscription.deleted):', error);
      }
      break;
    }
    case 'customer.subscription.created': {
      // Alta directa (no vía checkout): crear o actualizar registro
      const sub = event.data.object;
      const stripeSubscriptionId = sub.id;
      const stripeCustomerId = sub.customer;
      const periodStart = new Date(sub.current_period_start * 1000).toISOString();
      const periodEnd = new Date(sub.current_period_end * 1000).toISOString();

      // Buscar usuario por stripe_customer_id
      const { data: user, error: userError } = await supabase
        .from('subscriptions')
        .select('user_id')
        .eq('stripe_customer_id', stripeCustomerId)
        .single();

      if (userError || !user) {
        console.error('No se encontró usuario para alta directa de suscripción:', stripeCustomerId, userError);
        break;
      }

      const { error } = await supabase
        .from('subscriptions')
        .update({
          stripe_subscription_id: stripeSubscriptionId,
          plan: sub.items.data[0]?.price.nickname || null,
          status: sub.status,
          current_period_start: periodStart,
          current_period_end: periodEnd,
        })
        .eq('user_id', user.user_id);

      if (error) {
        console.error('Error al crear/actualizar suscripción (subscription.created):', error);
      }
      break;
    }
    default:
      // Evento no relevante
      break;
  }

  res.status(200).json({ received: true });
}
