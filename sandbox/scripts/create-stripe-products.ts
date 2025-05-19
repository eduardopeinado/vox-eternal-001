// sandbox/scripts/create-stripe-products.ts
const Stripe = require('stripe');
const dotenv = require('dotenv');

dotenv.config();

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  console.error('Falta STRIPE_SECRET_KEY en el .env');
  process.exit(1);
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2025-03-31.basil',
});

async function main() {
  // 1. Producto Gratis (solo referencia, sin precio)
  const freeProduct = await stripe.products.create({
    name: 'Gratis',
    description: 'Plan gratuito de Vox Eternal',
  });

  // 2. Producto Básico (mensual)
  const basicProduct = await stripe.products.create({
    name: 'Básico',
    description: 'Plan básico mensual de Vox Eternal',
  });
  const basicPrice = await stripe.prices.create({
    product: basicProduct.id,
    unit_amount: 500, // $5.00 USD
    currency: 'usd',
    recurring: { interval: 'month' },
  });

  // 3. Producto Premium (mensual)
  const premiumProduct = await stripe.products.create({
    name: 'Premium',
    description: 'Plan premium mensual de Vox Eternal',
  });
  const premiumPrice = await stripe.prices.create({
    product: premiumProduct.id,
    unit_amount: 1500, // $15.00 USD
    currency: 'usd',
    recurring: { interval: 'month' },
  });

  // 4. Producto Vitalicio (único)
  const lifetimeProduct = await stripe.products.create({
    name: 'Vitalicio',
    description: 'Acceso vitalicio a Vox Eternal',
  });
  const lifetimePrice = await stripe.prices.create({
    product: lifetimeProduct.id,
    unit_amount: 9900, // $99.00 USD
    currency: 'usd',
  });

  // Imprimir resultados
  console.log('\n=== Productos y precios creados en Stripe ===');
  console.log('FREE:', { productId: freeProduct.id, priceId: null });
  console.log('BASIC:', { productId: basicProduct.id, priceId: basicPrice.id });
  console.log('PREMIUM:', { productId: premiumProduct.id, priceId: premiumPrice.id });
  console.log('LIFETIME:', { productId: lifetimeProduct.id, priceId: lifetimePrice.id });
  console.log('\nCopia estos IDs en tu archivo de configuración para la integración.');
}

main().catch((err) => {
  console.error('Error creando productos/precios en Stripe:', err);
  process.exit(1);
});
