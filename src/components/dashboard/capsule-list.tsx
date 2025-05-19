'use client';

import React, { useState, useEffect } from 'react';
import { supabase, getStoragePublicUrl } from '@/lib/supabase/client';
import CapsuleCard from './capsule-card';
import ShareModal from './share-modal';
import { ArrowDownAZ, ArrowDownUp, CalendarClock, Grid2X2, ListFilter, Loader2, Search, XCircle } from 'lucide-react';

// Type moved to DashboardPage, import if needed elsewhere or define locally if only here
// For now, assume DashboardPage defines and passes the correct type
import type { CapsulaData } from '@/app/dashboard/page'; // Import the type from parent

// Define a simpler type for the capsule being shared
type CapsuleForShare = {
  id: string;
  titulo: string;
} | null;

// Type for the RPC result (keep if RPC is still used, maybe move type)
// type RecuerdoCounts = {
//   capsula_id: string;
//   foto_count: number;
//   audio_count: number;
//   video_count: number;
// };

type SortOption = 'date-desc' | 'date-asc' | 'title-asc' | 'title-desc';

// --- Updated Props ---
interface CapsuleListProps {
  capsules: CapsulaData[]; // Receive capsules directly
  isLoading: boolean; // Receive loading state
  onCapsuleClick: (id: string) => void;
  onPinCapsule?: (id: string) => void;
  onDeleteCapsule?: (id: string) => void;
  onShareCapsule?: (id: string, title: string) => void; // Pass title too for modal
  onUpdateCapsuleDetails?: (id: string, updates: { titulo?: string; descripcion?: string | null }) => Promise<void>;
  onHideCapsule?: () => void; // For hiding visible capsules
  onUnhideCapsule?: (capsuleId: string) => Promise<void>; // For unhiding hidden capsules
  isHiddenList?: boolean; // To know which list context we are in
}

const CapsuleList: React.FC<CapsuleListProps> = ({
  capsules, // Use prop
  isLoading, // Use prop
  onCapsuleClick,
  onPinCapsule,
  onDeleteCapsule,
  onShareCapsule,
  onUpdateCapsuleDetails,
  onHideCapsule,
  onUnhideCapsule, // Destructure the new prop
  isHiddenList = false,
}) => {
  // Remove internal state for capsules, loading, error
  // const [capsulas, setCapsulas] = useState<Capsula[]>([]);
  // const [loading, setLoading] = useState(true);
  // const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('date-desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSortMenu, setShowSortMenu] = useState(false);
  // Share modal state remains here for now, but could be lifted up
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [selectedCapsuleForShare, setSelectedCapsuleForShare] = useState<CapsuleForShare>(null);

  const sortMenuRef = React.useRef<HTMLDivElement>(null);

  // --- REMOVE fetchCapsulas function and related useEffect ---
  // const fetchCapsulas = async () => { ... };
  // useEffect(() => { fetchCapsulas(); }, [refreshTrigger]);

  // Efecto para cerrar el menú de ordenamiento al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(event.target as Node)) {
        setShowSortMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Aplicar filtros y ordenamiento
  const filteredAndSortedCapsulas = React.useMemo(() => {
    // Primero filtrar por búsqueda
    let filtered = capsules; // Use prop 'capsules'
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      // Add type annotation for 'capsula'
      filtered = capsules.filter((capsula: CapsulaData) => 
        capsula.titulo.toLowerCase().includes(query)
      );
    }
    
    // Luego ordenar - Primero por ancladas y después por el criterio seleccionado
    return [...filtered].sort((a, b) => {
      // Primero colocar las ancladas
      if (a.anclada && !b.anclada) return -1;
      if (!a.anclada && b.anclada) return 1;
      
      // Si ambas tienen el mismo estado de anclaje, ordenar según criterio
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.fecha_creacion).getTime() - new Date(a.fecha_creacion).getTime();
        case 'date-asc':
          return new Date(a.fecha_creacion).getTime() - new Date(b.fecha_creacion).getTime();
        case 'title-asc':
          return a.titulo.localeCompare(b.titulo);
        case 'title-desc':
          return b.titulo.localeCompare(a.titulo);
        default:
          return 0;
      }
    });
  }, [capsules, searchQuery, sortBy]); // Depend on 'capsules' prop

  const handleRefresh = () => {
    // fetchCapsulas was removed, refresh is handled by parent via refreshDashboardData
    console.warn("[CapsuleList] handleRefresh called, but data fetching moved to parent.");
    // If parent needs notification: call a prop like onRefreshRequest?.();
  };

  // --- Share Modal Handlers ---
  // Keep share modal logic here for now
  const handleOpenShareModal = (capsuleId: string, capsuleTitle: string) => {
    setSelectedCapsuleForShare({ id: capsuleId, titulo: capsuleTitle });
    setIsShareModalOpen(true);
  };

  const handleCloseShareModal = () => {
    setIsShareModalOpen(false);
    setSelectedCapsuleForShare(null);
  };
  // --- End Share Modal Handlers ---

  return (
    <div className="space-y-4">
      {/* Barra de opciones (búsqueda y filtros) - Keep UI */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Búsqueda */}
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar cápsulas..."
            className="w-full pl-10 pr-10 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-dorado-claro focus:border-dorado-claro"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <XCircle size={18} />
            </button>
          )}
        </div>

        {/* Menú de ordenamiento */}
        <div className="relative" ref={sortMenuRef}>
          <button
            onClick={() => setShowSortMenu(!showSortMenu)}
            className="flex items-center px-3 py-2 border border-gray-200 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-dorado-claro focus:border-dorado-claro whitespace-nowrap"
          >
            <ArrowDownUp size={18} className="mr-2" />
            <span className="text-sm">Ordenar</span>
          </button>

          {showSortMenu && (
            <div className="absolute right-0 mt-1 w-48 rounded-md shadow-lg bg-white z-10 py-1 border border-gray-100">
              <button
                className={`flex items-center px-4 py-2 text-sm w-full text-left ${sortBy === 'date-desc' ? 'bg-gray-100 text-azul-profundo' : 'text-gray-700 hover:bg-gray-50'}`}
                onClick={() => { setSortBy('date-desc'); setShowSortMenu(false); }}
              >
                <CalendarClock size={14} className="mr-2" /> Más recientes primero
              </button>
              <button
                className={`flex items-center px-4 py-2 text-sm w-full text-left ${sortBy === 'date-asc' ? 'bg-gray-100 text-azul-profundo' : 'text-gray-700 hover:bg-gray-50'}`}
                onClick={() => { setSortBy('date-asc'); setShowSortMenu(false); }}
              >
                <CalendarClock size={14} className="mr-2" /> Más antiguos primero
              </button>
              <button
                className={`flex items-center px-4 py-2 text-sm w-full text-left ${sortBy === 'title-asc' ? 'bg-gray-100 text-azul-profundo' : 'text-gray-700 hover:bg-gray-50'}`}
                onClick={() => { setSortBy('title-asc'); setShowSortMenu(false); }}
              >
                <ArrowDownAZ size={14} className="mr-2" /> Título A-Z
              </button>
              <button
                className={`flex items-center px-4 py-2 text-sm w-full text-left ${sortBy === 'title-desc' ? 'bg-gray-100 text-azul-profundo' : 'text-gray-700 hover:bg-gray-50'}`}
                onClick={() => { setSortBy('title-desc'); setShowSortMenu(false); }}
              >
                <ArrowDownAZ size={14} className="mr-2 rotate-180" /> Título Z-A
              </button>
            </div>
          )}
        </div>

        {/* Botón de actualizar (ahora solo visual o llama a prop) */}
        <button
          onClick={handleRefresh}
          className="flex items-center px-3 py-2 border border-gray-200 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-dorado-claro focus:border-dorado-claro whitespace-nowrap"
          disabled={isLoading} // Use isLoading prop
        >
          {isLoading ? ( // Use isLoading prop
            <Loader2 size={18} className="mr-2 animate-spin" />
          ) : (
            <Grid2X2 size={18} className="mr-2" />
          )}
          <span className="text-sm">Actualizar</span>
        </button>
      </div>

      {/* Mensajes de estado (usando isLoading prop) */}
      {isLoading && capsules.length === 0 && ( // Use isLoading prop and 'capsules' prop
        <div className="py-12 flex flex-col items-center justify-center text-gray-500">
          <Loader2 className="w-8 h-8 mb-4 animate-spin" />
          <p>Cargando cápsulas...</p>
        </div>
      )}

      {/* Remove internal error state display */}
      {/* {error && ( ... )} */}

      {!isLoading && filteredAndSortedCapsulas.length === 0 && ( // Use isLoading prop
        <div className="py-12 flex flex-col items-center justify-center text-gray-500">
          {searchQuery ? (
            <>
              <Search className="w-8 h-8 mb-4 opacity-50" />
              <p>No se encontraron cápsulas con "{searchQuery}"</p>
              <button
                onClick={() => setSearchQuery('')}
                className="mt-2 text-sm font-medium text-dorado-claro hover:underline"
              >
                Mostrar todas las cápsulas
              </button>
            </>
          ) : (
             // Adjust empty state message based on context (e.g., isHiddenList)
             isHiddenList ? (
                 <>
                     <ListFilter className="w-8 h-8 mb-4 opacity-50" />
                     <p>No tienes cápsulas ocultas.</p>
                 </>
             ) : (
                 <>
                     <ListFilter className="w-8 h-8 mb-4 opacity-50" />
                     <p>No tienes ninguna cápsula visible.</p>
                     <p className="text-sm mt-1">Crea tu primera cápsula para comenzar.</p>
                 </>
             )
          )}
        </div>
      )}

      {/* Lista de cápsulas (renderiza desde filteredAndSortedCapsulas) */}
      {filteredAndSortedCapsulas.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAndSortedCapsulas.map(capsula => {
            return (
            <CapsuleCard
              key={capsula.id}
              id={capsula.id}
              titulo={capsula.titulo}
              descripcion={capsula.descripcion}
              fecha_creacion={capsula.fecha_creacion}
              portada_url={capsula.portada_url}
              anclada={capsula.anclada}
              is_owner={capsula.is_owner}
              contadores={capsula.contadores}
              onClick={onCapsuleClick}
              onPin={onPinCapsule}
              onDelete={onDeleteCapsule}
              onShare={handleOpenShareModal} // Pass modal opener
              onUpdateDetails={onUpdateCapsuleDetails}
              onHide={onHideCapsule} // Pass hide handler
              onUnhide={onUnhideCapsule} // Pass unhide handler
              isHiddenList={isHiddenList} // Pass context flag
              primer_video_url={capsula.primer_video_url} // Pass the new prop
            />
            );
          })}
        </div>
      )}

      {/* Share Modal Component */}
      {isShareModalOpen && selectedCapsuleForShare && (
        <ShareModal
          capsuleId={selectedCapsuleForShare.id}
          capsuleTitle={selectedCapsuleForShare.titulo}
          onClose={handleCloseShareModal}
        />
      )}
    </div>
  );
};

export default CapsuleList;
