"use client";

import React, { useState, useEffect } from "react";
import { supabase, getStoragePublicUrl } from "@/lib/supabase/client";
import FavoriteMediaCard from "./favorite-media-card";
import { Loader2 } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { toast } from "sonner";

// Estructura del favorito (idéntica a FavoritesList)
interface FavoriteItem {
  id: string;
  tipo: "audio" | "video";
  url_archivo: string;
  nombre_archivo: string | null;
  titulo_personalizado: string | null;
  descripcion: string | null;
  fecha_real: string | null;
  capsula_id: string;
  capsula_titulo: string | null;
  portada_url: string | null;
}

// QR Modal (idéntico a FavoritesList)
const QrModal: React.FC<{ item: FavoriteItem | null; onClose: () => void }> = ({
  item,
  onClose,
}) => {
  if (!item) return null;
  const playUrl = `${window.location.origin}/play/${item.id}`;
  const qrCodeRef = React.useRef<HTMLDivElement>(null);

  const downloadQrCode = () => {
    const canvas = qrCodeRef.current?.querySelector("canvas");
    if (canvas) {
      const pngUrl = canvas
        .toDataURL("image/png")
        .replace("image/png", "image/octet-stream");
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
      <div className="relative p-6 bg-white rounded-lg shadow-xl text-center" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
          aria-label="Cerrar"
        >
          ×
        </button>
        <h3 className="text-lg font-semibold mb-3 text-gray-900">Código QR para:</h3>
        <p className="text-sm mb-4 text-gray-700 truncate" title={item.titulo_personalizado || item.nombre_archivo || "Recuerdo"}>
          {item.titulo_personalizado || item.nombre_archivo || "Recuerdo"}
        </p>
        <div ref={qrCodeRef} className="mb-4 inline-block p-2 border border-gray-300 rounded">
          <QRCodeCanvas value={playUrl} size={192} includeMargin={true} />
        </div>
        <p className="text-xs text-gray-500 mb-4">Escanea para reproducir</p>
        <button
          onClick={downloadQrCode}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 w-full"
        >
          Descargar QR
        </button>
      </div>
    </div>
  );
};

// Player Modal (idéntico a FavoritesList)
const PlayerModal: React.FC<{ item: FavoriteItem | null; onClose: () => void }> = ({
  item,
  onClose,
}) => {
  if (!item) return null;

  const getPlaybackUrl = (path: string | null): string => {
    if (!path) return "";
    if (path.startsWith("http://") || path.startsWith("https://")) {
      return path;
    }
    return getStoragePublicUrl("capsules", path);
  };

  const playbackUrl = getPlaybackUrl(item.url_archivo);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="relative p-4 bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 z-10"
          aria-label="Cerrar"
        >
          ×
        </button>
        <h3 className="text-lg font-semibold mb-3 text-gray-900 truncate pr-8" title={item.titulo_personalizado || item.nombre_archivo || "Recuerdo"}>
          {item.titulo_personalizado || item.nombre_archivo || "Recuerdo"}
        </h3>
        {item.tipo === "audio" && playbackUrl && (
          <audio controls autoPlay className="w-full" src={playbackUrl}>
            Tu navegador no soporta audio HTML5.
          </audio>
        )}
        {item.tipo === "video" && playbackUrl && (
          <video controls autoPlay className="w-full max-h-[80vh]" src={playbackUrl}>
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

const FavoritesSlider: React.FC = () => {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showQrModalForItem, setShowQrModalForItem] = useState<FavoriteItem | null>(null);
  const [playingItem, setPlayingItem] = useState<FavoriteItem | null>(null);

  useEffect(() => {
    const fetchFavorites = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data, error: rpcError } = await supabase.rpc("get_favoritos_usuario");
        if (rpcError) throw rpcError;
        setFavorites(data || []);
      } catch (err: any) {
        setError(`Error al cargar favoritos: ${err.message || "Error desconocido"}`);
        setFavorites([]);
      } finally {
        setLoading(false);
      }
    };

    fetchFavorites();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
        <span className="ml-2 text-gray-600">Cargando favoritos...</span>
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
      <div className="text-center py-10 text-gray-500">
        <span className="block mb-2">Aún no has marcado ningún audio o video como favorito.</span>
        <span className="block text-xs">Puedes marcarlos desde la vista de cada cápsula.</span>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto scrollbar-hide scrollbar-thin scrollbar-thumb-dorado-claro/60 scrollbar-track-transparent">
        <div className="flex gap-4 pb-2">
          {favorites.map((item) => {
            // Determinar thumbnail
            const isVideo = item.tipo === "video";
            const videoUrl = isVideo && item.url_archivo ? getStoragePublicUrl("capsules", item.url_archivo) : null;
            const coverUrl = item.portada_url ? getStoragePublicUrl("capsules", item.portada_url) : null;
            const thumbnailUrl = isVideo && videoUrl ? `${videoUrl}#t=1` : coverUrl;

            return (
              <FavoriteMediaCard
                key={item.id}
                title={item.titulo_personalizado || item.nombre_archivo || "Recuerdo sin título"}
                capsuleName={item.capsula_titulo || undefined}
                mediaType={item.tipo}
                thumbnailUrl={thumbnailUrl}
                onPlay={() => setPlayingItem(item)}
                onShowQR={() => setShowQrModalForItem(item)}
              />
            );
          })}
        </div>
      </div>
      {/* Modals */}
      <QrModal item={showQrModalForItem} onClose={() => setShowQrModalForItem(null)} />
      <PlayerModal item={playingItem} onClose={() => setPlayingItem(null)} />
    </>
  );
};

export default FavoritesSlider;
