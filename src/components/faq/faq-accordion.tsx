"use client";

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface FaqItemProps {
  question: string;
  answer: string;
}

const FaqItem: React.FC<FaqItemProps> = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-gray-200">
      <button
        className="flex justify-between items-center w-full py-4 text-left font-sans font-semibold text-azul-profundo hover:text-dorado-claro transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{question}</span>
        <ChevronDown 
          className={`w-5 h-5 transform transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
          strokeWidth={2}
        />
      </button>
      {/* Contenido colapsable */}
      <div 
        className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <p className="pt-1 pb-4 text-azul-profundo/90 font-sans text-sm">
          {answer}
        </p>
      </div>
    </div>
  );
};

interface FaqAccordionProps {
  items: FaqItemProps[];
}

const FaqAccordion: React.FC<FaqAccordionProps> = ({ items }) => {
  return (
    <section className="py-16 px-4 sm:px-8 bg-white">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-bold font-serif text-azul-profundo text-center mb-10">
          Preguntas Frecuentes
        </h2>
        <div className="space-y-2">
          {items.map((item, index) => (
            <FaqItem key={index} question={item.question} answer={item.answer} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FaqAccordion; 