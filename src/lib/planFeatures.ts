// src/lib/planFeatures.ts

export type PlanName = 'Gratis' | 'Básico' | 'Premium' | 'Vitalicio';

export interface PlanFeatures {
  nombre: PlanName;
  mejorasIA: number | 'Ilimitado';
  videos: number | 'Ilimitado';
  videos4K: boolean;
  recordatorios: number | 'Ilimitado';
  fotos: number | 'Ilimitado';
  audios: number | 'Ilimitado';
  tamanoMaxVideoMB: number;
  formatosVideoPermitidos: string[];
  /** Límite total de almacenamiento por usuario en MB. 'Ilimitado' para sin restricción. */
  almacenamientoMaxMB: number | 'Ilimitado';
}

export const PLAN_FEATURES: Record<PlanName, PlanFeatures> = {
  Gratis: {
    nombre: 'Gratis',
    mejorasIA: 2,
    videos: 1,
    videos4K: false,
    recordatorios: 1,
    fotos: 5,
    audios: 2,
    tamanoMaxVideoMB: 30, // 30MB para gratis
    formatosVideoPermitidos: ['mp4'],
    almacenamientoMaxMB: 500, // 500MB para gratis
  },
  Básico: {
    nombre: 'Básico',
    mejorasIA: 20,
    videos: 5,
    videos4K: false,
    recordatorios: 5,
    fotos: 20,
    audios: 10,
    tamanoMaxVideoMB: 100, // 100MB para básico
    formatosVideoPermitidos: ['mp4'],
    almacenamientoMaxMB: 5000, // 5GB para básico
  },
  Premium: {
    nombre: 'Premium',
    mejorasIA: 150,
    videos: 25,
    videos4K: true,
    recordatorios: 20,
    fotos: 100,
    audios: 50,
    tamanoMaxVideoMB: 500, // 500MB para premium
    formatosVideoPermitidos: ['mp4'],
    almacenamientoMaxMB: 20000, // 20GB para premium
  },
  Vitalicio: {
    nombre: 'Vitalicio',
    mejorasIA: 'Ilimitado',
    videos: 'Ilimitado',
    videos4K: true,
    recordatorios: 'Ilimitado',
    fotos: 'Ilimitado',
    audios: 'Ilimitado',
    tamanoMaxVideoMB: 1000, // 1GB para vitalicio
    formatosVideoPermitidos: ['mp4'],
    almacenamientoMaxMB: 'Ilimitado', // Sin límite
  },
};

// Utilidades

export function getPlanFeatures(plan: PlanName): PlanFeatures {
  return PLAN_FEATURES[plan];
}

export function canUseMejoraIA(plan: PlanName, mejorasUsadas: number): boolean {
  const limite = PLAN_FEATURES[plan].mejorasIA;
  if (limite === 'Ilimitado') return true;
  return mejorasUsadas < limite;
}

export function canUploadVideo(plan: PlanName, sizeMB: number, format: string): boolean {
  const { tamanoMaxVideoMB, formatosVideoPermitidos } = PLAN_FEATURES[plan];
  return sizeMB <= tamanoMaxVideoMB && formatosVideoPermitidos.includes(format.toLowerCase());
}

/**
 * Solo claves de PlanFeatures que representan límites numéricos o 'Ilimitado'
 */
export type FeatureLimitKey = 'mejorasIA' | 'videos' | 'recordatorios' | 'fotos' | 'audios';

export function getLimit(plan: PlanName, feature: FeatureLimitKey): number | 'Ilimitado' {
  return PLAN_FEATURES[plan][feature];
}

export function isOverLimit(plan: PlanName, feature: FeatureLimitKey, currentCount: number): boolean {
  const limite = PLAN_FEATURES[plan][feature];
  if (limite === 'Ilimitado') return false;
  return currentCount >= (limite as number);
}

export function getUpgradeMessage(feature: string): string {
  switch (feature) {
    case 'mejorasIA':
      return 'Actualiza tu plan para obtener más mejoras por IA.';
    case 'videos':
      return 'Actualiza tu plan para subir más videos.';
    case 'videos4K':
      return 'Solo los planes Premium y Vitalicio permiten videos 4K.';
    case 'tamanoMaxVideoMB':
      return 'El tamaño máximo de video depende de tu plan. Actualiza para subir archivos más grandes.';
    default:
      return 'Actualiza tu plan para acceder a esta función.';
  }
}
