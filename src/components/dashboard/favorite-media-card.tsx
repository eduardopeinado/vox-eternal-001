"use client";

import React from "react";
import { PlayCircle, QrCode, FileAudio, FileVideo, Image } from "lucide-react";

interface FavoriteMediaCardProps {
  title: string;
  capsuleName?: string;
  mediaType: "audio" | "video";
  thumbnailUrl?: string | null;
  onPlay: () => void;
  onShowQR: () => void;
}

const FavoriteMediaCard: React.FC<FavoriteMediaCardProps> = ({
  title,
  capsuleName,
  mediaType,
  thumbnailUrl,
  onPlay,
  onShowQR,
}) => {
  return (
    <div className="flex flex-col items-center bg-white rounded-lg shadow-sm border border-gray-100 p-2 w-[140px] min-w-[140px] max-w-[160px]">
      {/* Imagen o ícono */}
      <div className="w-24 h-24 bg-gray-100 rounded-md flex items-center justify-center overflow-hidden mb-2">
        {mediaType === "video" && thumbnailUrl ? (
          <video
            src={thumbnailUrl}
            preload="metadata"
            muted
            playsInline
            controls={false}
            className="w-full h-full object-cover"
          />
        ) : thumbnailUrl ? (
          <ImgWithFallback
            src={thumbnailUrl}
            alt={title}
            className="w-full h-full object-cover"
          />
        ) : mediaType === "audio" ? (
          <FileAudio className="w-10 h-10 text-azul-profundo/60" />
        ) : mediaType === "video" ? (
          <FileVideo className="w-10 h-10 text-azul-profundo/60" />
        ) : (
          <Image className="w-10 h-10 text-gray-300" />
        )}
      </div>
      {/* Título */}
      <div className="w-full text-xs font-medium text-azul-profundo text-center truncate mb-1" title={title}>
        {title}
      </div>
      {/* Nombre de cápsula */}
      {capsuleName && (
        <div className="w-full text-[11px] text-gray-500 text-center truncate mb-2" title={capsuleName}>
          {capsuleName}
        </div>
      )}
      {/* Acciones */}
      <div className="flex justify-center gap-2 w-full mt-auto">
        <button
          onClick={onPlay}
          className="p-1 rounded-full hover:bg-celeste-cielo/30 transition-colors"
          aria-label="Reproducir"
        >
          <PlayCircle className="w-6 h-6 text-azul-profundo" />
        </button>
        <button
          onClick={onShowQR}
          className="p-1 rounded-full hover:bg-dorado-claro/20 transition-colors"
          aria-label="Mostrar QR"
        >
          <QrCode className="w-6 h-6 text-dorado-claro" />
        </button>
      </div>
    </div>
  );
};

/**
 * Imagen con fallback visual si falla la carga.
 */
const ImgWithFallback: React.FC<React.ImgHTMLAttributes<HTMLImageElement>> = ({
  src,
  alt,
  ...props
}) => {
  const [error, setError] = React.useState(false);
  if (error || !src) {
    return (
      <span className="flex items-center justify-center w-full h-full bg-gray-100">
        <Image className="w-10 h-10 text-gray-300" aria-label="Imagen no disponible" />
      </span>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      onError={() => setError(true)}
      {...props}
    />
  );
};

export default FavoriteMediaCard;
