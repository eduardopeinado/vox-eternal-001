'use client';
import { useRouter } from 'next/navigation';
import { RotateCcw } from 'lucide-react';

export default function RestartOnboardingButton() {
  const router = useRouter();

  const handleRestart = () => {
    router.push('/dashboard');
    setTimeout(() => {
      window.dispatchEvent(new Event('restartOnboarding'));
    }, 400);
  };

  return (
    <>
      <button
        onClick={handleRestart}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-verde-agua text-azul-profundo font-sans font-medium hover:bg-[#4fbfae] transition-colors"
        aria-label="Reiniciar guía interactiva"
      >
        <RotateCcw size={18} />
        <span>Tour de la página</span>
      </button>
      <p className="text-sm text-gris-calido mt-1">
        Vuelve a recorrer las funciones principales del Dashboard.
      </p>
    </>
  );
}