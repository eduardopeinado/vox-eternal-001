'use client';
// import '@reactour/tour/dist/style.css';
import { TourProvider, useTour } from '@reactour/tour';
import { useEffect, type ReactNode } from 'react';

interface Props {
  run: boolean;          // viene de showOnboarding
  steps: any[];
  onFinish: () => void;  // callback que actualiza Supabase y setShowOnboarding(false)
  children: ReactNode;
}

export default function OnboardingTour({ run, steps, onFinish, children }: Props) {
  return (
    <TourProvider
      steps={steps}
      maskClassName="bg-black/60"
      scrollSmooth
      inViewThreshold={0}
    >
      <AutoOpener run={run} steps={steps} onFinish={onFinish} />
      {children}
    </TourProvider>
  );
}

/* ————— helper ————— */
function AutoOpener({ run, steps, onFinish }: { run: boolean; steps: any[]; onFinish: () => void }) {
  const { setIsOpen, currentStep, steps: ctxSteps } = useTour();

  // ========= Abrir tour al inicio =========
  useEffect(() => {
    if (!run) return;
    openWhenReady();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run]);

  // ========= Listener global =========
  useEffect(() => {
    const restart = () => openWhenReady();
    window.addEventListener('restartOnboarding', restart);
    return () => window.removeEventListener('restartOnboarding', restart);
  }, []);

  // ========= Cerrar y llamar onFinish al terminar =========
  useEffect(() => {
    if (!ctxSteps.length) return;
    if (currentStep === ctxSteps.length - 1) {
      // último paso → al cerrar se llamará onFinish
      const closeHandler = () => {
        onFinish();
        window.removeEventListener('closeTour', closeHandler);
      };
      window.addEventListener('closeTour', closeHandler);
    }
  }, [currentStep, ctxSteps.length, onFinish]);

  /** Espera a que el primer selector exista y abre el tour */
  function openWhenReady() {
    const firstSel = steps.find(s => typeof s.selector === 'string')?.selector as string | undefined;
    if (!firstSel) { setIsOpen(true); return; }

    const poll = () => {
      if (document.querySelector(firstSel)) {
        setIsOpen(true);
      } else {
        setTimeout(poll, 200);
      }
    };
    poll();
  }

  return null;
}