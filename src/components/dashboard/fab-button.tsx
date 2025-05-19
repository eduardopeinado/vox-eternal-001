"use client"; // Necesario si la lógica onClick es más compleja o usa estado

import React from 'react';
import { Plus } from 'lucide-react';

interface FabButtonProps {
  onClick: () => void;
  disabled?: boolean; // Add disabled prop
}

const FabButton: React.FC<FabButtonProps> = ({ onClick, disabled = false }) => {
  return (
    <button
      id="tour-new-capsule"
      data-tour="fab-capsule-btn"
      onClick={onClick}
      disabled={disabled} // Apply disabled attribute
      aria-label="Crear nuevo recuerdo o cápsula"
      className={`fixed bottom-6 right-6 md:bottom-8 md:right-8 z-40 p-4 bg-dorado-claro text-azul-profundo rounded-full shadow-lg transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-dorado-claro focus:ring-offset-2 focus:ring-offset-blanco-hueso ${
        disabled
          ? 'opacity-50 cursor-not-allowed' // Styles for disabled state
          : 'hover:bg-opacity-90' // Styles for enabled state
      }`}
    >
      <Plus className="w-6 h-6" strokeWidth={2.5} />
    </button>
  );
};

export default FabButton;
