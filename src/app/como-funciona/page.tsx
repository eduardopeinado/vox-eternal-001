import React from 'react';
import Image from 'next/image'; // 1. Importar Image
// 1. Quitar import de StepBlock y datos anteriores
// import StepBlock from '@/components/how-it-works/step-block'; 
// Importar iconos necesarios (placeholders)
import { ArrowRight } from 'lucide-react';
import HowCta from '@/components/how-it-works/how-cta'; // Importar el nuevo CTA

// Quitar stepsData anterior

export default function ComoFuncionaPage() {
  return (
    <main className="bg-blanco-hueso min-h-full">
      <section className="py-16 px-4 sm:px-8">
        <div className="max-w-5xl mx-auto">
          {/* 1. Título y Subtítulo */}
          <h1 className="text-4xl sm:text-5xl font-bold font-serif text-azul-profundo text-center mb-4">
            Cómo funciona Vox Eternal
          </h1>
          <p className="text-lg font-sans text-azul-profundo/90 text-center mb-12 max-w-2xl mx-auto">
            En solo tres pasos puedes preservar lo más valioso: tus recuerdos.
          </p>

          {/* 2. Reemplazar Placeholder con Imagen */}
          <div className="mb-16 text-center">
            <Image 
              src="/Pasos-como-funciona.svg" // 1. Cambiar a .svg
              alt="Flujo de pasos de Vox Eternal" 
              width={800} // Mantener dimensiones (ajustar si conoces las reales)
              height={500} // Mantener dimensiones (ajustar si conoces las reales)
              className="rounded-lg mx-auto w-full md:w-[50%]"
              // priority // <- Comentado/quitado
            />
          </div>

          {/* 3. Secciones de Texto Explicativo */}
          <div className="space-y-12 max-w-3xl mx-auto">
            {/* Paso 1 */}
            <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-100">
              <div className="flex items-start space-x-4">
                <Image 
                  src="/ic-crea-cuenta.svg" 
                  alt="Icono crear cuenta" 
                  width={32} 
                  height={32} 
                  className="mt-1 flex-shrink-0"
                />
                <div>
                  <h2 className="text-2xl font-semibold font-serif text-azul-profundo mb-2">Paso 1 – Crea tu cuenta</h2>
                  <p className="font-sans text-azul-profundo/90 mb-3">Solo necesitas tu correo o tu cuenta de Google. Es rápido y gratuito.</p>
                  <p className="font-sans text-dorado-claro font-medium flex items-center">
                    <ArrowRight className="w-4 h-4 mr-1" /> ¡Tu legado empieza aquí!
                  </p>
                </div>
              </div>
            </div>

            {/* Paso 2 */}
            <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-100">
              <div className="flex items-start space-x-4">
                <Image 
                  src="/ic-sube-memoria.svg" 
                  alt="Icono subir memoria"
                  width={32} 
                  height={32} 
                  className="mt-1 flex-shrink-0"
                />
                <div>
                  <h2 className="text-2xl font-semibold font-serif text-azul-profundo mb-2">Paso 2 – Sube tus recuerdos</h2>
                  <p className="font-sans text-azul-profundo/90 mb-3">Elige tus mejores fotos, audios o videos. Nosotros los mejoramos con inteligencia artificial ✨.</p>
                </div>
              </div>
            </div>

            {/* Paso 3 + Subpasos */}
            <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-100">
              <h2 className="text-2xl font-semibold font-serif text-azul-profundo mb-6 text-center md:text-left">Paso 3 – Elige qué hacer con tus recuerdos</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* 3.1 */}
                <div className="text-center md:text-left p-4 border border-celeste-cielo/50 rounded-md bg-celeste-cielo/10">
                  <Image 
                    src="/ic-mensaje-futuro.svg" 
                    alt="Icono mensaje futuro"
                    width={32} 
                    height={32} 
                    className="mx-auto md:mx-0 mb-3"
                  />
                  <h3 className="font-semibold font-sans text-azul-profundo mb-1">Programa un mensaje al futuro</h3>
                  <p className="text-sm font-sans text-azul-profundo/80">Elige una fecha especial. Nosotros lo entregamos cuando llegue el momento.</p>
                </div>
                {/* 3.2 */}
                <div className="text-center md:text-left p-4 border border-celeste-cielo/50 rounded-md bg-celeste-cielo/10">
                  <Image 
                    src="/ic-comparte.svg" 
                    alt="Icono compartir"
                    width={32} 
                    height={32} 
                    className="mx-auto md:mx-0 mb-3"
                   />
                  <h3 className="font-semibold font-sans text-azul-profundo mb-1">Comparte tu cápsula con otros</h3>
                  <p className="text-sm font-sans text-azul-profundo/80">Tus seres queridos pueden verla y también subir sus recuerdos. Sin borrar nada.</p>
                </div>
                {/* 3.3 */}
                <div className="text-center md:text-left p-4 border border-celeste-cielo/50 rounded-md bg-celeste-cielo/10">
                  <Image 
                    src="/ic-revive.svg" 
                    alt="Icono revivir recuerdos"
                    width={32} 
                    height={32} 
                    className="mx-auto md:mx-0 mb-3"
                  />
                  <h3 className="font-semibold font-sans text-azul-profundo mb-1">Escucha y revive tus recuerdos</h3>
                  <p className="text-sm font-sans text-azul-profundo/80">Tus fotos, audios y videos estarán siempre contigo, donde estés.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* 4. Llamada a la Acción Final */}
      <HowCta />

    </main>
  );
} 