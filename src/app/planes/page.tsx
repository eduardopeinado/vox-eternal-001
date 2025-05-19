import React from 'react';
import PricingTable from "@/components/pricing/pricing-table";
import FaqAccordion from "@/components/faq/faq-accordion";
import CallToAction from "@/components/cta/call-to-action";

// Datos para el FAQ
const faqItems = [
  {
    question: "¿Qué es Vox Eternal?",
    answer: "Vox Eternal es una plataforma digital diseñada para ayudarte a preservar tus recuerdos más importantes (fotos, audios, videos) y enviar mensajes significativos al futuro, creando un legado digital perdurable."
  },
  {
    question: "¿Cómo puedo crear mi cápsula?",
    answer: "Es muy sencillo. Regístrate en nuestra plataforma (puedes empezar con el plan gratuito), crea una nueva cápsula, asígnale un nombre y comienza a subir tus archivos. También puedes programar mensajes futuros desde allí."
  },
  {
    question: "¿Puedo compartir mi cápsula con otros?",
    answer: "Sí, puedes generar un enlace único para compartir tu cápsula. Las personas con el enlace podrán ver el contenido y añadir sus propias fotos o comentarios, pero no podrán eliminar nada de lo que tú hayas guardado."
  },
  {
    question: "¿Qué diferencias hay entre los planes?",
    answer: "Los planes varían principalmente en la cantidad de almacenamiento disponible para fotos, audios y videos, así como en el número de recordatorios que puedes programar. El plan Vitalicio ofrece almacenamiento ilimitado con un único pago."
  },
  {
    question: "¿Qué garantía tengo sobre la privacidad de mis datos?",
    answer: "La privacidad y seguridad de tus recuerdos son nuestra máxima prioridad. Utilizamos encriptación y seguimos las mejores prácticas de seguridad para proteger tu información. Tus cápsulas son privadas a menos que decidas compartirlas explícitamente."
  }
];

export default function PlanesPage() {
  return (
    <main>
      {/* Puedes añadir contenido adicional específico de la página de planes aquí si lo deseas */}
      {/* Por ejemplo, un título diferente o texto introductorio */}
      <PricingTable />
      
      {/* 2. Sección FAQ */}
      <FaqAccordion items={faqItems} />
      
      {/* 3. Sección Call to Action */}
      <CallToAction />
    </main>
  );
} 