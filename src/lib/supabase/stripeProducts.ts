// src/lib/supabase/stripeProducts.ts
// IDs generados automáticamente por el script de sandbox/scripts/create-stripe-products.ts
// Mantén este archivo actualizado si cambian los productos/precios en Stripe.

export const STRIPE_PRODUCTS = {
  FREE: {
    productId: 'prod_SBZifeyG0bYbbF',
    priceId: null, // Gratis, no requiere priceId
  },
  BASIC: {
    productId: 'prod_SBZiICLtm0nxUU',
    priceId: 'price_1RHCYmRWwTOZZQ23IteuA23H',
  },
  PREMIUM: {
    productId: 'prod_SBZiDKFnP8mOu4',
    priceId: 'price_1RHCYmRWwTOZZQ237zGh5M3j',
  },
  LIFETIME: {
    productId: 'prod_SBZiPoA1n5jbJ6',
    priceId: 'price_1RHCYnRWwTOZZQ23qB2Akr6R',
  },
} as const;
