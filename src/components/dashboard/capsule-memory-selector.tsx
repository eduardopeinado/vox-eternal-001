"use client";

import React, { useState, useEffect } from 'react'; // Import useState, useEffect
import { Loader2, Image as ImageIcon, Mic, Video, FileText } from 'lucide-react';
import type { CapsulaWithRecuerdos, RecuerdoData } from '@/app/dashboard/reminders/new/page'; // Import the exported types
import { getStoragePublicUrl } from '@/lib/supabase/client'; // Import the helper function

// Helper to get appropriate icon based on recuerdo type
const getRecuerdoIcon = (tipo: string) => {
  switch (tipo) {
    case 'foto':
      return <ImageIcon className="w-4 h-4 text-gray-500" />;
    case 'audio':
      return <Mic className="w-4 h-4 text-gray-500" />;
    case 'video':
      return <Video className="w-4 h-4 text-gray-500" />;
    default:
      return <FileText className="w-4 h-4 text-gray-500" />;
  }
};

// Helper to get thumbnail URL or placeholder using Supabase public URL
// Returns an object indicating the type (image/video) and the URL
const getThumbnailInfo = (item: CapsulaWithRecuerdos | RecuerdoData): { type: 'image' | 'video' | null; url: string | null } => {
  if ('portada_url' in item) { // It's a Capsula
    if (item.portada_url) {
      return { type: 'image', url: getStoragePublicUrl('capsules', item.portada_url) };
    } else if (item.primer_video_url) { // Check for primer_video_url if no portada_url
      return { type: 'video', url: getStoragePublicUrl('capsules', item.primer_video_url) };
    }
  } else if ('url_archivo' in item) { // It's a Recuerdo
    if (item.url_archivo && item.tipo === 'foto') {
      return { type: 'image', url: getStoragePublicUrl('capsules', item.url_archivo) };
    } else if (item.url_archivo && item.tipo === 'video') {
      return { type: 'video', url: getStoragePublicUrl('capsules', item.url_archivo) };
    }
  }
  return { type: null, url: null }; // Return null if no valid URL can be generated
};

// Helper to get display title
const getItemTitle = (item: CapsulaWithRecuerdos | RecuerdoData): string => {
    if ('portada_url' in item) { // Capsula
        return item.titulo || `Cápsula ${item.id.substring(0, 6)}`;
    } else { // Recuerdo
        return item.titulo_personalizado || item.nombre_archivo || `Recuerdo ${item.id.substring(0, 6)}`;
    }
};


interface CapsuleMemorySelectorProps {
  capsules: CapsulaWithRecuerdos[];
  selectedCapsuleIds: Set<string>;
  selectedRecuerdoIds: Set<string>;
  onSelectionChange: (newSelectedCapsuleIds: Set<string>, newSelectedRecuerdoIds: Set<string>) => void;
  isLoading: boolean;
}

const CapsuleMemorySelector = ({
  capsules,
  selectedCapsuleIds,
  selectedRecuerdoIds,
  onSelectionChange,
  isLoading,
}: CapsuleMemorySelectorProps): JSX.Element => {

  const handleCapsuleToggle = (capsuleId: string) => {
    const newSelectedCapsuleIds = new Set(selectedCapsuleIds);
    const newSelectedRecuerdoIds = new Set(selectedRecuerdoIds);
    const capsule = capsules.find(c => c.id === capsuleId);
    if (!capsule) return;

    const capsuleRecuerdoIds = capsule.recuerdos.map((r: RecuerdoData) => r.id); // Added type for r

    if (newSelectedCapsuleIds.has(capsuleId)) {
      // Deselect capsule and all its recuerdos
      newSelectedCapsuleIds.delete(capsuleId);
      capsuleRecuerdoIds.forEach((id: string) => newSelectedRecuerdoIds.delete(id)); // Added type for id
    } else {
      // Select capsule and all its recuerdos
      newSelectedCapsuleIds.add(capsuleId);
      capsuleRecuerdoIds.forEach((id: string) => newSelectedRecuerdoIds.add(id)); // Added type for id
    }
    onSelectionChange(newSelectedCapsuleIds, newSelectedRecuerdoIds);
  };

  const handleRecuerdoToggle = (capsuleId: string, recuerdoId: string) => {
    const newSelectedCapsuleIds = new Set(selectedCapsuleIds);
    const newSelectedRecuerdoIds = new Set(selectedRecuerdoIds);
    const capsule = capsules.find(c => c.id === capsuleId);
    if (!capsule) return;

    // Toggle the specific recuerdo
    if (newSelectedRecuerdoIds.has(recuerdoId)) {
      newSelectedRecuerdoIds.delete(recuerdoId);
    } else {
      newSelectedRecuerdoIds.add(recuerdoId);
    }

    // Update capsule selection based on its recuerdos
    const allRecuerdosSelected = capsule.recuerdos.every((r: RecuerdoData) => newSelectedRecuerdoIds.has(r.id)); // Added type for r
    if (allRecuerdosSelected && capsule.recuerdos.length > 0) {
      newSelectedCapsuleIds.add(capsuleId); // Select capsule if all recuerdos are selected
    } else {
      newSelectedCapsuleIds.delete(capsuleId); // Deselect capsule if not all recuerdos are selected
    }

    onSelectionChange(newSelectedCapsuleIds, newSelectedRecuerdoIds);
  };

  if (isLoading) {
    return (
      <div className="border rounded-lg p-6 bg-white shadow-sm flex items-center justify-center h-80">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        <p className="ml-2 text-gray-500">Cargando cápsulas...</p>
      </div>
    );
  }

  if (capsules.length === 0) {
    return (
      <div className="border rounded-lg p-6 bg-white shadow-sm text-center">
        <p className="text-gray-600">No tienes cápsulas creadas.</p>
        {/* Optional: Add a link/button to create a capsule */}
      </div>
    );
  }

  return (
    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
      {capsules.map((capsule: CapsulaWithRecuerdos) => { // Added type for capsule
        const capsuleRecuerdoIds = capsule.recuerdos.map((r: RecuerdoData) => r.id); // Added type for r
        const selectedRecuerdosInCapsule = capsuleRecuerdoIds.filter((id: string) => selectedRecuerdoIds.has(id)); // Added type for id
        const isCapsuleSelected = selectedCapsuleIds.has(capsule.id);
        const isIndeterminate = !isCapsuleSelected && selectedRecuerdosInCapsule.length > 0;
        const [headerPortadaCargada, setHeaderPortadaCargada] = useState(true); // State for header image loading

        // Effect to reset loading state if the capsule's portada_url changes
        useEffect(() => {
          setHeaderPortadaCargada(true);
        }, [capsule.portada_url]);

        return (
          <div key={capsule.id} className="border rounded-lg bg-white shadow-sm overflow-hidden">
            {/* Capsule Header */}
            <div className="flex items-center justify-between p-3 bg-gray-50 border-b">
              <div className="flex items-center space-x-3 overflow-hidden">
                {/* Capsule Header Thumbnail - Updated Logic */}
                <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center flex-shrink-0 overflow-hidden"> {/* Container */}
                  {(() => {
                    const thumbInfo = getThumbnailInfo(capsule);
                    if (headerPortadaCargada && thumbInfo.url) {
                      if (thumbInfo.type === 'image') {
                        return (
                          <img
                            key={thumbInfo.url}
                            src={thumbInfo.url}
                            alt={`Portada de ${getItemTitle(capsule)}`}
                            className="w-full h-full object-cover rounded"
                            onError={() => setHeaderPortadaCargada(false)}
                            onLoad={() => setHeaderPortadaCargada(true)}
                          />
                        );
                      } else if (thumbInfo.type === 'video') {
                        return (
                          <video
                            key={thumbInfo.url}
                            src={`${thumbInfo.url}#t=1`}
                            className="w-full h-full object-cover rounded"
                            preload="metadata"
                            muted
                            playsInline
                            onError={() => setHeaderPortadaCargada(false)} // Handle video load error too
                            onLoadedData={() => setHeaderPortadaCargada(true)} // Use onLoadedData for video
                          />
                        );
                      }
                    }
                    // Placeholder Icon if no URL or loading failed
                    return <ImageIcon className="w-5 h-5 text-gray-400" />;
                  })()}
                </div>
                <span className="text-sm font-semibold truncate text-gray-800" title={getItemTitle(capsule)}>
                  {getItemTitle(capsule)}
                </span>
              </div>
              <input
                type="checkbox"
                checked={isCapsuleSelected}
                ref={(el: HTMLInputElement | null) => { // Corrected ref type and logic
                  if (el) {
                    el.indeterminate = isIndeterminate;
                  }
                }}
                onChange={() => handleCapsuleToggle(capsule.id)}
                className="form-checkbox h-5 w-5 text-teal-600 border-gray-300 rounded focus:ring-teal-500 cursor-pointer"
                aria-label={`Seleccionar toda la ${getItemTitle(capsule)}`}
              />
            </div>

            {/* Recuerdos List */}
            {capsule.recuerdos.length > 0 ? (
              <ul className="p-3 space-y-2 max-h-60 overflow-y-auto">
                {capsule.recuerdos.map((recuerdo: RecuerdoData) => { // Added type for recuerdo
                  const thumbInfo = getThumbnailInfo(recuerdo); // Use updated helper
                  return (
                  <li key={recuerdo.id} className="flex items-center justify-between p-2 border rounded-md bg-white hover:bg-gray-50 transition-colors">
                    <div className="flex items-center space-x-2 overflow-hidden">
                      {/* Logic for recuerdo thumbnail/icon */}
                      <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center flex-shrink-0 overflow-hidden"> {/* Added overflow-hidden */}
                        {thumbInfo.type === 'video' && thumbInfo.url ? (
                          <video
                            src={`${thumbInfo.url}#t=1`} // Use video tag with time fragment
                            className="w-full h-full object-cover"
                            preload="metadata"
                            muted
                            disablePictureInPicture // Optional: prevent PiP button
                            playsInline // Optional: for mobile
                          />
                        ) : thumbInfo.type === 'image' && thumbInfo.url ? (
                          <img
                            src={thumbInfo.url} // Use img tag for photos
                            alt={`Thumbnail de ${getItemTitle(recuerdo)}`}
                            className="w-full h-full object-cover" // Use w/h-full for consistency
                            onError={(e) => {
                              // Attempt to show icon if image fails
                              const parent = e.currentTarget.parentElement;
                              if (parent) {
                                parent.innerHTML = ''; // Clear img
                                const iconContainer = document.createElement('div');
                                iconContainer.className = "w-full h-full flex items-center justify-center";
                                // Re-render icon (requires React rendering context or manual SVG injection - simplified here)
                                // For simplicity, let's just hide the broken image or show a generic placeholder
                                e.currentTarget.style.display = 'none'; // Hide broken image
                                // Alternatively, show the icon directly:
                                // parent.appendChild(getRecuerdoIcon(recuerdo.tipo)); // This won't work directly here
                              }
                            }}
                          />
                        ) : (
                          // Fallback icon for other types or if URL is missing
                          getRecuerdoIcon(recuerdo.tipo)
                        )}
                      </div>
                      <span className="text-xs font-medium truncate text-gray-700" title={getItemTitle(recuerdo)}>
                        {getItemTitle(recuerdo)}
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={selectedRecuerdoIds.has(recuerdo.id)}
                      onChange={() => handleRecuerdoToggle(capsule.id, recuerdo.id)}
                      className="form-checkbox h-4 w-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500 cursor-pointer ml-2"
                      aria-label={`Seleccionar ${getItemTitle(recuerdo)}`}
                    />
                  </li>
                  ); // Added missing closing parenthesis
                })}
              </ul>
            ) : (
              <p className="p-3 text-xs text-center text-gray-500">Esta cápsula no tiene recuerdos.</p>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default CapsuleMemorySelector;
