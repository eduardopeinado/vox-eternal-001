import React from 'react';

const CallToAction = () => {
  return (
    <section className="py-20 px-4 sm:px-8 bg-gradient-to-r from-celeste-cielo via-dorado-claro/30 to-celeste-cielo">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl sm:text-4xl font-bold font-serif text-azul-profundo mb-6">
          ¿Listo para preservar tu legado?
        </h2>
        <p className="text-lg text-azul-profundo opacity-80 mb-8 font-sans">
          ¡Elige tu plan y empieza ahora a crear tu cápsula del tiempo!
        </p>
        <button
          className="bg-dorado-claro text-azul-profundo hover:bg-opacity-90 font-semibold py-3 px-8 rounded-lg transition duration-300 ease-in-out text-lg shadow-md"
        >
          Empieza Ahora
        </button>
      </div>
    </section>
  );
};

export default CallToAction; 