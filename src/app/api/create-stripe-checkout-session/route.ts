// src/app/api/create-stripe-checkout-session/route.ts
// Endpoint API Route para Next.js App Router (compatible con /api/create-stripe-checkout-session)

import { NextRequest } from 'next/server';
import Stripe from 'stripe';

export async function POST(req: NextRequest) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY as string;

  if (!stripeSecretKey) {
    throw new Error('Falta STRIPE_SECRET_KEY en el entorno');
  }

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2025-03-31.basil',
  });

  try {
    const body = await req.json();
    const { priceId, customerEmail } = body;

    if (!priceId) {
      return new Response(JSON.stringify({ error: 'Falta priceId' }), { status: 400 });
    }

    if (!process.env.BASE_URL) {
      throw new Error('Falta BASE_URL en el entorno. No se puede crear la sesión de Stripe.');
    }
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.BASE_URL}/dashboard?success=1`,
      cancel_url: `${process.env.BASE_URL}/planes?canceled=1`,
      customer_email: customerEmail || undefined,
    });

    return new Response(JSON.stringify({ url: session.url }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
