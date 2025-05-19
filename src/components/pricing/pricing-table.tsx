// @ts-nocheck
"use client";
import React from "react";
import { Camera, AudioWaveform, Video, Hourglass, Sparkles, Check, MonitorUp } from "lucide-react";
import { STRIPE_PRODUCTS } from "../../lib/supabase/stripeProducts";
import { PLAN_FEATURES, PlanName } from "@/lib/planFeatures";

// Mapeo de iconos para las características
const featureIcons = {
  fotos: Camera,
  audios: AudioWaveform,
  videos: Video,
  recordatorios: Hourglass,
  mejorasIA: Sparkles,
  videos4K: MonitorUp,
};

const planOrder: PlanName[] = ["Gratis", "Básico", "Premium", "Vitalicio"];

const pricingPlans = planOrder.map((plan) => {
  const features = PLAN_FEATURES[plan];
  let priceId = null;
  let precio = "$0";
  let precioDetalle = "Siempre";
  let accentColor = "dorado-claro";
  let buttonTextColor = "text-azul-profundo";
  let borderColor = "border-dorado-claro";
  if (plan === "Básico") {
    priceId = STRIPE_PRODUCTS.BASIC.priceId;
    precio = "$4.99";
    precioDetalle = "/mes";
    accentColor = "celeste-cielo";
    buttonTextColor = "text-azul-profundo";
    borderColor = "border-celeste-cielo";
  }
  if (plan === "Premium") {
    priceId = STRIPE_PRODUCTS.PREMIUM.priceId;
    precio = "$9.99";
    precioDetalle = "/mes";
    accentColor = "azul-profundo";
    buttonTextColor = "text-blanco-hueso";
    borderColor = "border-azul-profundo";
  }
  if (plan === "Vitalicio") {
    priceId = STRIPE_PRODUCTS.LIFETIME.priceId;
    precio = "$99";
    precioDetalle = "Pago único";
    accentColor = "dorado-claro";
    buttonTextColor = "text-azul-profundo";
    borderColor = "border-dorado-claro";
  }
  return {
    plan,
    ...features,
    precio,
    precioDetalle,
    accentColor,
    buttonTextColor,
    borderColor,
    priceId,
  };
});

const PricingTable = () => {
  // Lógica de checkout Stripe
  const handleCheckout = async (priceId: string | null) => {
    if (!priceId) {
      window.location.href = "/login";
      return;
    }
    try {
      const res = await fetch("/api/create-stripe-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("Error al iniciar el pago: " + (data.error || "Desconocido"));
      }
    } catch (err) {
      alert("Error de red al conectar con Stripe");
    }
  };

  return (
    <section className="py-16 px-4 sm:px-8 bg-blanco-hueso">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-bold font-serif text-azul-profundo text-center mb-12">
          Planes Flexibles para Tus Recuerdos
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {pricingPlans.map((planData) => {
            const IconFotos = featureIcons.fotos;
            const IconAudios = featureIcons.audios;
            const IconVideos = featureIcons.videos;
            const IconRecordatorios = featureIcons.recordatorios;
            const IconMejorasIA = featureIcons.mejorasIA;
            const IconVideos4K = featureIcons.videos4K;

            // Estilo de botón: todos los planes usan borde y fondo acorde a la guía de estilos
            const buttonClass = `
              mt-6 w-full py-3 px-4 rounded font-semibold transition-opacity
              border-2 ${planData.borderColor} bg-${planData.accentColor} ${planData.buttonTextColor}
              hover:opacity-90
            `;

            return (
              <div
                key={planData.plan}
                className={`flex flex-col rounded-lg overflow-hidden shadow-lg border-2 ${planData.borderColor} bg-blanco-hueso transition-transform duration-300 hover:scale-[1.02]`}
              >
                <div
                  className={`p-6 text-center font-serif font-bold text-2xl bg-${planData.accentColor} ${planData.buttonTextColor}`}
                >
                  {planData.plan}
                </div>
                <div className="p-6 flex flex-col flex-grow">
                  <ul className="space-y-4 mb-8 flex-grow">
                    <li className="flex items-center">
                      <IconFotos className="w-5 h-5 mr-3 text-azul-profundo flex-shrink-0" strokeWidth={1.5} />
                      <span className="font-sans text-azul-profundo">
                        <strong className="font-semibold">{planData.fotos}</strong> Fotos
                      </span>
                    </li>
                    <li className="flex items-center">
                      <IconAudios className="w-5 h-5 mr-3 text-azul-profundo flex-shrink-0" strokeWidth={1.5} />
                      <span className="font-sans text-azul-profundo">
                        <strong className="font-semibold">{planData.audios}</strong> Audios
                      </span>
                    </li>
                    <li className="flex items-center">
                      <IconVideos className="w-5 h-5 mr-3 text-azul-profundo flex-shrink-0" strokeWidth={1.5} />
                      <span className="font-sans text-azul-profundo">
                        <strong className="font-semibold">{planData.videos}</strong> Videos
                      </span>
                    </li>
                    <li className="flex items-center">
                      <IconRecordatorios className="w-5 h-5 mr-3 text-azul-profundo flex-shrink-0" strokeWidth={1.5} />
                      <span className="font-sans text-azul-profundo">
                        <strong className="font-semibold">{planData.recordatorios}</strong> Recordatorios
                      </span>
                    </li>
                    <li className="flex items-center">
                      <IconMejorasIA className="w-5 h-5 mr-3 text-azul-profundo flex-shrink-0" strokeWidth={1.5} />
                      <span className="font-sans text-azul-profundo">
                        <strong className="font-semibold">
                          {planData.mejorasIA === "Ilimitado"
                            ? "Ilimitadas"
                            : `${planData.mejorasIA}`}
                        </strong>{" "}
                        mejoras IA <span className="text-xs opacity-70">(durante la vigencia del plan)</span>
                      </span>
                    </li>
                    <li className="flex items-center">
                      <IconVideos4K className="w-5 h-5 mr-3 text-azul-profundo flex-shrink-0" strokeWidth={1.5} />
                      <span className="font-sans text-azul-profundo">
                        {planData.videos4K ? (
                          <span>
                            <Check className="inline w-4 h-4 text-green-600 mr-1" /> Soporta videos 4K
                          </span>
                        ) : (
                          <span className="opacity-60">No soporta videos 4K</span>
                        )}
                      </span>
                    </li>
                    <li className="flex items-center">
                      <Video className="w-5 h-5 mr-3 text-azul-profundo flex-shrink-0" strokeWidth={1.5} />
                      <span className="font-sans text-azul-profundo">
                        Videos MP4 hasta{" "}
                        <strong className="font-semibold">{planData.tamanoMaxVideoMB}MB</strong>
                      </span>
                    </li>
                  </ul>
                  <div className="pt-4 text-center text-azul-profundo">
                    <span className="text-3xl font-bold font-sans">{planData.precio}</span>
                    <span className="text-sm font-sans block opacity-80">{planData.precioDetalle}</span>
                    <button
                      className={buttonClass}
                      onClick={() => handleCheckout(planData.priceId)}
                    >
                      {planData.plan === "Gratis" ? "Comenzar" : "Elegir Plan"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-8 text-center text-xs text-gray-600 max-w-2xl mx-auto">
          <p>
            <strong>Nota:</strong> El límite de mejoras IA es acumulativo durante la vigencia del plan. Solo se permiten videos en formato MP4. El tamaño máximo de video depende del plan. Para videos 4K, se requiere Premium o Vitalicio.
          </p>
        </div>
      </div>
    </section>
  );
};

export default PricingTable;
