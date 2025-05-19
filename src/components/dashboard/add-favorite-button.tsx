'use client';

import React from 'react';
// Removed Button import as its source is unclear
import { PlusCircle } from 'lucide-react';

// Define props for the component
interface AddFavoriteButtonProps {
  onOpenModal: () => void; // Function to call when button is clicked
}

export default function AddFavoriteButton({ onOpenModal }: AddFavoriteButtonProps) {

  // Removed the internal handleClick, we'll use the passed prop directly

  // Use a standard HTML button with Tailwind classes for styling
  return (
    <button
      onClick={onOpenModal} // Call the passed function on click
      className="inline-flex items-center justify-center rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-gray-50 shadow transition-colors hover:bg-gray-900/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-950 disabled:pointer-events-none disabled:opacity-50 dark:bg-gray-50 dark:text-gray-900 dark:hover:bg-gray-50/90 dark:focus-visible:ring-gray-300"
    >
      <PlusCircle className="mr-2 h-4 w-4" />
      Añadir Nuevo Favorito
    </button>
  );
}
