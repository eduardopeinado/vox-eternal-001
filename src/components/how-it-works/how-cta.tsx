import React from 'react';

const HowCta = () => {
  return (
    <section className="py-16 px-4 sm:px-8 bg-gradient-to-r from-celeste-cielo/50 via-dorado-claro/20 to-celeste-cielo/50">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl sm:text-4xl font-bold font-serif text-azul-profundo mb-6">
          ¿Estás listo para crear tu cápsula?
        </h2>
        <button
          className="bg-dorado-claro text-azul-profundo hover:shadow-lg hover:bg-opacity-95 transition-all duration-300 ease-in-out font-semibold py-3 px-8 rounded-lg text-lg shadow-md"
        >
          Crear mi cápsula gratuita
        </button>
      </div>
    </section>
  );
};

export default HowCta; 