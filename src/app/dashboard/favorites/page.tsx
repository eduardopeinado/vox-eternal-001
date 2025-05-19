'use client'; // Need client-side state for modal

import React, { useState, useCallback } from 'react'; // Import useState and useCallback
import FavoritesList from '@/components/dashboard/favorites-list';
import AddFavoriteButton from '@/components/dashboard/add-favorite-button';
import AddFavoriteModal from '@/components/dashboard/add-favorite-modal';
import RecordingModal from '@/components/dashboard/recording-modal'; // Import the RecordingModal
// Removed incorrect Button import
import { Mic, Video } from 'lucide-react'; // Import icons

export default function FavoritesPage() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false); // Renamed state for clarity
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false); // State for recording modal
  const [recordType, setRecordType] = useState<'audio' | 'video' | null>(null); // To know what to record
  const [refreshKey, setRefreshKey] = useState(0); // State to trigger list refresh

  const openAddModal = useCallback(() => setIsAddModalOpen(true), []);
  const closeAddModal = useCallback(() => setIsAddModalOpen(false), []);

  const openRecordModal = useCallback((type: 'audio' | 'video') => {
      setRecordType(type);
      setIsRecordModalOpen(true);
  }, []);
  const closeRecordModal = useCallback(() => {
      setIsRecordModalOpen(false);
      setRecordType(null);
  }, []);


  // Callback to refresh the list after a favorite is added (from either modal)
  const handleFavoriteAdded = useCallback(() => {
    setRefreshKey(prevKey => prevKey + 1); // Increment key to force re-render/re-fetch in FavoritesList
  }, []);


  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-white">
        Audios y Videos Favoritos
      </h1>

      {/* Action Buttons: Add, Record Audio, Record Video */}
      <div className="mb-6 flex justify-end space-x-3">
         {/* TODO: Replace with actual Button component if found, or use styled HTML button */}
         <button
            onClick={() => openRecordModal('audio')}
            className="inline-flex items-center justify-center rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white shadow transition-colors hover:bg-green-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-green-700 disabled:pointer-events-none disabled:opacity-50"
         >
             <Mic className="mr-2 h-4 w-4" /> Grabar Audio
         </button>
          <button
            onClick={() => openRecordModal('video')}
            className="inline-flex items-center justify-center rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white shadow transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-700 disabled:pointer-events-none disabled:opacity-50"
         >
             <Video className="mr-2 h-4 w-4" /> Grabar Video
         </button>
         <AddFavoriteButton onOpenModal={openAddModal} /> {/* Pass handler to button */}
      </div>

      {/* Component to fetch and display the list - pass key for refresh */}
      <FavoritesList key={refreshKey} />

      {/* Add Favorite Modal component - controlled by state */}
      <AddFavoriteModal
        isOpen={isAddModalOpen}
        onClose={closeAddModal}
        onFavoriteAdded={handleFavoriteAdded}
      />

      {/* Recording Modal component - controlled by state */}
      <RecordingModal
        isOpen={isRecordModalOpen}
        recordType={recordType}
        onClose={closeRecordModal}
        onRecordingComplete={handleFavoriteAdded} // Re-use the same refresh callback
      />

    </div>
  );
}
