// supabase/functions/create-stripe-checkout-session/index.ts
// Endpoint HTTP para crear una sesión de Stripe Checkout y devolver la URL de pago

const Stripe = require('stripe');

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

  const { priceId, customerEmail } = req.body;

  if (!priceId) {
    res.status(400).json({ error: 'Falta priceId' });
    return;
  }

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2025-03-31.basil',
  });

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: process.env.NEXT_PUBLIC_BASE_URL
        ? `${process.env.NEXT_PUBLIC_BASE_URL}/planes?success=1`
        : 'http://localhost:3000/planes?success=1',
      cancel_url: process.env.NEXT_PUBLIC_BASE_URL
        ? `${process.env.NEXT_PUBLIC_BASE_URL}/planes?canceled=1`
        : 'http://localhost:3000/planes?canceled=1',
      customer_email: customerEmail || undefined,
    });

    res.status(200).json({ url: session.url });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
