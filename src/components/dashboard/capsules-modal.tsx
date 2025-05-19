"use client";

import React, { useState, useMemo } from "react";
import CapsuleList from "./capsule-list";
import { X } from "lucide-react";
import type { CapsulaData } from "@/app/dashboard/page";

interface CapsulesModalProps {
  capsules: CapsulaData[];
  isOpen: boolean;
  onClose: () => void;
  onCapsuleClick: (id: string) => void;
  onPinCapsule?: (id: string) => void;
  onDeleteCapsule?: (id: string) => void;
  onShareCapsule?: (id: string, title: string) => void;
  onUpdateCapsuleDetails?: (id: string, updates: { titulo?: string; descripcion?: string | null }) => Promise<void>;
  onHideCapsule?: () => void;
}

const CapsulesModal: React.FC<CapsulesModalProps> = ({
  capsules,
  isOpen,
  onClose,
  onCapsuleClick,
  onPinCapsule,
  onDeleteCapsule,
  onShareCapsule,
  onUpdateCapsuleDetails,
  onHideCapsule,
}) => {
  // Prevent scroll on body when modal is open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="relative w-full max-w-5xl h-[90vh] bg-white rounded-xl shadow-2xl flex flex-col p-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-serif font-bold text-azul-profundo">Todas tus cápsulas</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Cerrar"
          >
            <X size={24} />
          </button>
        </div>
        {/* Lista de cápsulas en grid con buscador */}
        <div className="flex-1 overflow-y-auto">
          <CapsuleList
            capsules={capsules}
            isLoading={false}
            onCapsuleClick={onCapsuleClick}
            onPinCapsule={onPinCapsule}
            onDeleteCapsule={onDeleteCapsule}
            onShareCapsule={onShareCapsule}
            onUpdateCapsuleDetails={onUpdateCapsuleDetails}
            onHideCapsule={onHideCapsule}
          />
        </div>
      </div>
    </div>
  );
};

export default CapsulesModal;
