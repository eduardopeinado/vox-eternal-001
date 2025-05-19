'use client'; // This component needs client-side interactivity (state, effects)

import React, { useState, useEffect, useRef } from 'react'; // Added useRef
import { supabase, getStoragePublicUrl } from '@/lib/supabase/client'; // Import the exported instance AND the helper function
import Image from 'next/image';
import { AlertCircle, Loader2, QrCode, PlayCircle, Download, X as CloseIcon, FileAudio, Calendar } from 'lucide-react'; // Icons, added CloseIcon, FileAudio, and Calendar
import { QRCodeCanvas, QRCodeSVG } from 'qrcode.react'; // Import QR Code components
import { toast } from 'sonner'; // Import toast

// Define the structure of a favorite item based on the RPC return type
interface FavoriteItem {
  id: string;
  tipo: 'audio' | 'video';
  url_archivo: string;
  nombre_archivo: string | null;
  titulo_personalizado: string | null;
  descripcion: string | null;
  fecha_real: string | null; // Date string
  capsula_id: string;
  capsula_titulo: string | null;
  portada_url: string | null; // Capsule cover URL
}

// Props for the QR Modal
interface QrModalProps {
  item: FavoriteItem | null;
  onClose: () => void;
}

// Simple QR Modal Component
const QrModal: React.FC<QrModalProps> = ({ item, onClose }) => {
  if (!item) return null;

  const playUrl = `${window.location.origin}/play/${item.id}`;
  const qrCodeRef = useRef<HTMLDivElement>(null); // Ref for downloading

  const downloadQrCode = () => {
    const canvas = qrCodeRef.current?.querySelector('canvas');
    if (canvas) {
      const pngUrl = canvas
        .toDataURL("image/png")
        .replace("image/png", "image/octet-stream"); // Prompt download
      let downloadLink = document.createElement("a");
      downloadLink.href = pngUrl;
      downloadLink.download = `vox-eternal-qr-${item.titulo_personalizado || item.nombre_archivo || item.id}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    }
  };


  return (
     <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="relative p-6 bg-white dark:bg-gray-800 rounded-lg shadow-xl text-center" onClick={(e) => e.stopPropagation()}>
         <button
            onClick={onClose}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="Cerrar"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
          <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Código QR para:</h3>
          <p className="text-sm mb-4 text-gray-700 dark:text-gray-300 truncate" title={item.titulo_personalizado || item.nombre_archivo || 'Recuerdo'}>
             {item.titulo_personalizado || item.nombre_archivo || 'Recuerdo'}
          </p>
          <div ref={qrCodeRef} className="mb-4 inline-block p-2 border border-gray-300 rounded">
             <QRCodeCanvas value={playUrl} size={192} includeMargin={true} />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Escanea para reproducir</p>
          <button
             onClick={downloadQrCode}
             className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 px-4 py-2 w-full"
           >
             <Download className="mr-2 h-4 w-4" /> Descargar QR
           </button>
      </div>
    </div>
  );
};

// Simple Player Modal Component
const PlayerModal: React.FC<{ item: FavoriteItem | null; onClose: () => void }> = ({ item, onClose }) => {
  if (!item) return null;

  // Construct the full public URL for playback
  const getPlaybackUrl = (path: string | null): string => {
    if (!path) return '';
    // Check if it's already a full URL
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    // Otherwise, assume it's a relative path in the 'recuerdos' bucket
    // Note: Ensure 'capsules' is the correct bucket name. Based on upload logic in capsule detail page.
    // The function get_favoritos_usuario returns url_archivo which is the relative path within the bucket.
    return getStoragePublicUrl('capsules', path); // Corrected bucket name to 'capsules'
  };

  const playbackUrl = getPlaybackUrl(item.url_archivo);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="relative p-4 bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full mx-4" onClick={(e) => e.stopPropagation()}> {/* Increased max-w */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white z-10" // Ensure button is above video controls
          aria-label="Cerrar"
        >
          <CloseIcon className="h-6 w-6" />
        </button>
        <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white truncate pr-8" title={item.titulo_personalizado || item.nombre_archivo || 'Recuerdo'}> {/* Added pr-8 for close button space */}
          {item.titulo_personalizado || item.nombre_archivo || 'Recuerdo'}
        </h3>
        {item.tipo === 'audio' && playbackUrl && (
          <audio controls autoPlay className="w-full" src={playbackUrl}>
            Tu navegador no soporta audio HTML5.
          </audio>
        )}
        {item.tipo === 'video' && playbackUrl && (
          <video controls autoPlay className="w-full max-h-[80vh]" src={playbackUrl}> {/* Increased max-h */}
            Tu navegador no soporta video HTML5.
          </video>
        )}
        {!playbackUrl && (
            <p className="text-center text-red-500 py-4">Error: No se pudo obtener la URL del archivo.</p>
        )}
      </div>
    </div>
  );
};


export default function FavoritesList() {
  // No need to call createClient() here, just use the imported instance
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showQrModalForItem, setShowQrModalForItem] = useState<FavoriteItem | null>(null); // State for QR modal
  const [playingItem, setPlayingItem] = useState<FavoriteItem | null>(null); // State for player modal

  useEffect(() => {
    const fetchFavorites = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data, error: rpcError } = await supabase.rpc('get_favoritos_usuario');

        if (rpcError) {
          throw rpcError;
        }

        setFavorites(data || []);
      } catch (err: any) {
        console.error('Error fetching favorites:', err);
        setError(`Error al cargar favoritos: ${err.message || 'Error desconocido'}`);
        setFavorites([]); // Clear favorites on error
      } finally {
        setLoading(false);
      }
    };

    fetchFavorites();
  }, [supabase]); // Re-run if supabase client instance changes (though unlikely)

  const handlePlay = (item: FavoriteItem) => {
    setPlayingItem(item); // Set the item to be played in the modal
  };

  const handleShowQr = (item: FavoriteItem) => {
     setShowQrModalForItem(item); // Set the item to show QR modal for
  };

   const handleDownloadQr = (item: FavoriteItem) => {
     // Generate QR data URL directly for download
     const playUrl = `${window.location.origin}/play/${item.id}`;
     const canvas = document.createElement('canvas'); // Create temporary canvas
     const ctx = canvas.getContext('2d');

     // Use QRCodeCanvas to draw onto the temporary canvas
     // We need to render it somewhere temporarily to get the canvas instance
     // A better approach might be needed if this causes issues, but let's try
     const tempDiv = document.createElement('div');
     tempDiv.style.position = 'absolute';
     tempDiv.style.left = '-9999px'; // Hide it off-screen
     document.body.appendChild(tempDiv);

     // Render QR to the hidden div's canvas
     const qrInstance = React.createElement(QRCodeCanvas, { value: playUrl, size: 256, includeMargin: true, level: 'H' });
     // This part is tricky without ReactDOM.render, let's simplify
     // Alternative: Generate SVG and convert or just download SVG? Let's try direct data URL from canvas if possible

     // Simpler approach: Create a canvas, draw QR onto it using the library's logic if exposed, or use a different method.
     // Since qrcode.react doesn't easily expose drawing context, let's just use the modal's download logic.
     // We'll trigger the download from the modal itself, or replicate its logic here.
     // Replicating modal logic:
     const tempCanvas = document.createElement('canvas');
     // Need to render QRCodeCanvas to get its drawn state.
     // Let's stick to the modal download button for simplicity for now, or use a different QR library if direct generation is needed.
     // For now, let's just use the modal download logic directly here.

     const qrCanvas = document.createElement('canvas');
     // We need to render the QR code to get the canvas data.
     // Let's try rendering it hidden.
     const hiddenQrContainer = document.createElement('div');
     hiddenQrContainer.style.position = 'fixed';
     hiddenQrContainer.style.top = '-10000px';
     document.body.appendChild(hiddenQrContainer);

     // Temporarily render using React's internal methods (not ideal) or find another way.
     // Let's assume we can get the canvas data url directly (this might need adjustment based on library capabilities)

     // Re-attempting direct generation using a temporary render:
     // This requires ReactDOM which we don't import here.
     // Let's simplify: We already have the download logic in the modal.
     // We can just *show* the modal and let the user download from there.
     // OR, we replicate the download logic *exactly* as in the modal.

     // Replicating modal download logic:
     const downloadCanvas = document.createElement('canvas');
     // Need to render the QR to this canvas. Let's use the component's render prop if available, or draw manually.
     // Since direct drawing isn't straightforward, let's refine the goal:
     // The download button *outside* the modal should probably just *show* the modal.
     // The download button *inside* the modal works fine.
     // Let's change the external download button to just show the QR modal.

     // --- Revised Logic: External Download button now just opens the QR Modal ---
     setShowQrModalForItem(item); // Open the modal, user can download from there.
     toast.info("Abre el modal para descargar el QR."); // Inform user
   };
   // Removed the commented out block causing syntax errors

  if (loading) {
    return (
      <div className="flex justify-center items-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
        <span className="ml-2 text-gray-600 dark:text-gray-400">Cargando favoritos...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
        <strong className="font-bold mr-2">Error!</strong>
        <span className="block sm:inline">{error}</span>
      </div>
    );
  }

  if (favorites.length === 0) {
    return (
      <div className="text-center py-10 text-gray-500 dark:text-gray-400">
        <AlertCircle className="h-12 w-12 mx-auto mb-4" />
        <p>Aún no has marcado ningún audio o video como favorito.</p>
        <p>Puedes marcarlos desde la vista de cada cápsula.</p>
      </div>
    );
  }

  return (
    <> {/* Use Fragment to wrap list and modal */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {favorites.map((item) => {
          // Determinar la URL de la miniatura y el tipo
          const isVideo = item.tipo === 'video';
          const videoUrl = isVideo && item.url_archivo ? getStoragePublicUrl('capsules', item.url_archivo) : null;
          const coverUrl = item.portada_url ? getStoragePublicUrl('capsules', item.portada_url) : null;
          // const thumbnailUrl = videoUrl || coverUrl; // No longer needed

          // --- Restaurar Código Original con Correcciones ---
          return ( // Ensure this return is correctly structured
            <div key={item.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden transition-shadow duration-300 hover:shadow-lg flex flex-col">
              {/* Thumbnail Section: Video frame or Capsule Cover */}
              <div className="relative w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-md overflow-hidden mb-3 flex-shrink-0"> {/* Restored size and margin */}
                {isVideo && videoUrl ? (
                  <video
                    src={videoUrl ? `${videoUrl}#t=1` : undefined} // Añadido #t=1
                    className="w-full h-full object-cover"
                    preload="metadata"
                    muted
                  ></video>
                ) : coverUrl ? (
                  <Image
                    src={coverUrl}
                    alt={`Portada de ${item.capsula_titulo || 'cápsula'}`}
                    layout="fill"
                    objectFit="cover"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }} // Hide on error
                  />
                ) : (
                  // Placeholder if no video/cover URL
                  <div className="w-full h-full flex items-center justify-center">
                    {isVideo ? <PlayCircle className="w-10 h-10 text-gray-400" /> : <FileAudio className="w-10 h-10 text-gray-400" />}
                  </div>
                )}
              </div>
              <div className="p-4 flex-grow flex flex-col">
                <div className="flex-grow">
                  {/* Title: Applied text-azul-profundo */}
                  <h3 className="font-serif text-lg font-semibold text-azul-profundo mb-1 truncate" title={item.titulo_personalizado || item.nombre_archivo || 'Sin título'}>
                    {item.titulo_personalizado || item.nombre_archivo || 'Recuerdo sin título'}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                    En Cápsula: <span className="font-medium text-gray-700 dark:text-gray-300">{item.capsula_titulo || 'Sin título'}</span>
                  </p>
                  {item.descripcion && (
                    /* Description: Applied text-xs text-gray-600 */
                    <p className="text-xs text-gray-600 mb-3 line-clamp-2">
                      {item.descripcion}
                    </p>
                  )}
                  {item.fecha_real && (
                    /* Date: Applied text-xs text-gray-500, added flex items-center, Calendar icon, removed "Fecha: " */
                    <p className="text-xs text-gray-500 mb-3 flex items-center">
                      <Calendar size={14} className="mr-1" />
                      {new Date(item.fecha_real).toLocaleDateString()}
                    </p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex justify-between items-center border-t border-gray-200 dark:border-gray-700 pt-3 mt-auto">
                  <button
                    onClick={() => handlePlay(item)}
                    className="flex items-center text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                    title="Reproducir"
                  >
                    <PlayCircle className="h-5 w-5 mr-1" />
                    Reproducir
                  </button>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleShowQr(item)}
                      className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white transition-colors"
                      title="Mostrar/Descargar QR" // Updated tooltip
                    >
                      <QrCode className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Render QR Modal */}
      <QrModal item={showQrModalForItem} onClose={() => setShowQrModalForItem(null)} />

      {/* Render Player Modal */}
      <PlayerModal item={playingItem} onClose={() => setPlayingItem(null)} />
    </>
  );
}
