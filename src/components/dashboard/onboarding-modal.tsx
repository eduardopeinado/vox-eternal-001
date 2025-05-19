'use client';

import React from 'react';
import { X as CloseIcon, Info } from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const steps = [
  {
    title: '¡Bienvenido a Vox Eternal!',
    description: 'Aquí puedes guardar y revivir tus recuerdos más valiosos en audio, video y foto.',
  },
  {
    title: 'Crea tu primera cápsula',
    description: 'Haz clic en "Nueva" o arrastra archivos para crear una cápsula y empezar a guardar recuerdos.',
  },
  {
    title: 'Mejora tus audios con IA',
    description: 'Puedes mejorar la calidad de tus audios usando inteligencia artificial, según tu plan.',
  },
  {
    title: 'Marca favoritos',
    description: 'Accede rápido a tus audios y videos favoritos desde el dashboard.',
  },
  {
    title: 'Programa mensajes al futuro',
    description: 'Envía mensajes programados a tus seres queridos para fechas importantes.',
  },
];

export default function OnboardingModal({ isOpen, onClose }: OnboardingModalProps) {
  const [step, setStep] = React.useState(0);

  if (!isOpen) return null;

  const handleNext = () => {
    if (step < steps.length - 1) setStep(step + 1);
    else onClose();
  };

  const handlePrev = () => {
    if (step > 0) setStep(step - 1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" aria-modal="true" role="dialog">
      <div className="relative w-full max-w-md p-6 bg-white dark:bg-gray-900 rounded-lg shadow-xl flex flex-col items-center">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          aria-label="Cerrar"
        >
          <CloseIcon className="h-5 w-5" />
        </button>
        <Info className="h-8 w-8 text-blue-600 mb-2" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2 text-center">{steps[step].title}</h2>
        <p className="text-gray-700 dark:text-gray-300 mb-4 text-center">{steps[step].description}</p>
        <div className="flex justify-between items-center w-full mt-2">
          <button
            onClick={handlePrev}
            disabled={step === 0}
            className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-medium disabled:opacity-50"
          >
            Anterior
          </button>
          <span className="text-xs text-gray-500">{step + 1} / {steps.length}</span>
          <button
            onClick={handleNext}
            className="px-3 py-1 rounded bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
          >
            {step === steps.length - 1 ? '¡Listo!' : 'Siguiente'}
          </button>
        </div>
      </div>
    </div>
  );
}
