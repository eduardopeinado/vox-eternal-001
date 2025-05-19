import Image from "next/image";
// Quitar iconos de lucide-react si ya no se usan aquí
// import { Camera, AudioWaveform, Video, Hourglass } from 'lucide-react';
import FeatureBubbles from "@/components/home/feature-bubbles"; // 1. Importar el nuevo componente

function HeroSection() {
  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center p-8 pt-24 sm:p-24 bg-gradient-to-br from-celeste-cielo to-dorado-claro overflow-hidden">
      <div className="text-center max-w-2xl relative z-10">
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold font-serif text-blanco-hueso mb-6 shadow-sm">
          Tu voz. Tus recuerdos. Para siempre.
        </h1>
        <p className="text-lg sm:text-xl text-blanco-hueso opacity-90 mb-8 font-sans shadow-sm">
          Inmortaliza tus memorias y mensajes para el futuro con cápsulas digitales personalizadas.
        </p>
        <button
          className="bg-dorado-claro text-azul-profundo hover:bg-opacity-90 font-semibold py-3 px-8 rounded-lg transition duration-300 ease-in-out text-lg shadow-md"
        >
          Crear mi cápsula gratuita
        </button>
      </div>
    </section>
  );
}

function ExplanationSection() {
  // 2. Ya no necesitamos la data estática de features aquí
  /*
  const features = [
    {
      icon: Camera,
      title: "Fotos",
    },
    // ... etc
  ];
  */

  return (
    <section className="py-16 px-8 sm:py-20 sm:px-16 bg-blanco-hueso">
      {/* 3. Reemplazar el contenido anterior con el componente de burbujas */}
      <FeatureBubbles />
    </section>
  );
}

export default function Home() {
  return (
    <main>
      <HeroSection />
      <ExplanationSection />
      {/* <PricingTable /> */}{/* 2. Quitar componente */}
      {/* Aquí añadiremos la sección Productos Físicos, etc. */}
    </main>
  );
}
