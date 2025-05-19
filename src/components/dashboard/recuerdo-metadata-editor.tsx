import React, { useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { RotateCw, Save, X, Check } from "lucide-react";

if (typeof window !== "undefined") {
  // Usar rutas absolutas desde /public/leaflet/
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "/leaflet/marker-icon-2x.png",
    iconUrl: "/leaflet/marker-icon.png",
    shadowUrl: "/leaflet/marker-shadow.png",
  });
}

interface RecuerdoMetadataEditorProps {
  recuerdoId: string;
  fecha_real: string | null;
  latitud: number | null;
  longitud: number | null;
  isPortada?: boolean;
  onSetPortada?: () => void;
  onSave: (data: { fecha_real: string | null; latitud: number | null; longitud: number | null }) => void;
  onCancel: () => void;
}

const RecuerdoMetadataEditor: React.FC<RecuerdoMetadataEditorProps> = ({
  recuerdoId,
  fecha_real,
  latitud,
  longitud,
  isPortada = false,
  onSetPortada,
  onSave,
  onCancel,
}) => {
  const [date, setDate] = useState<string>(fecha_real ? fecha_real.substring(0, 10) : "");
  const [position, setPosition] = useState<[number, number]>([
    latitud ?? 0,
    longitud ?? 0,
  ]);

  // Manejador de click en el mapa
  function LocationMarker() {
    useMapEvents({
      click(e) {
        setPosition([e.latlng.lat, e.latlng.lng]);
      },
    });
    return (
      <Marker position={position}>
        <Popup>
          Arrastra el pin o haz click en el mapa para ajustar la ubicación.
        </Popup>
      </Marker>
    );
  }

  // Limpieza del mapa al desmontar (workaround para errores de doble inicialización)
  function LocationEventsCleanup() {
    const map = useMap();
    React.useEffect(() => {
      return () => {
        map.remove();
      };
    }, [map]);
    return null;
  }

  return (
    <div className="w-full flex flex-col gap-3 p-2">
      <div className="flex justify-between items-center">
        <span className="text-xs text-azul-profundo font-semibold">Editar datos</span>
      </div>
      <label className="text-xs text-gray-700">Fecha real:</label>
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="w-full px-2 py-1 border border-gray-200 rounded text-xs"
      />
      <label className="text-xs text-gray-700 mt-2">Ubicación:</label>
      <div className="w-full h-80 sm:h-[420px] md:h-[600px] lg:h-[700px] rounded border border-gray-200 overflow-hidden">
        <MapContainer
          key={`map-${recuerdoId}`}
          center={position}
          zoom={latitud && longitud ? 13 : 2}
          style={{ width: "100%", height: "100%" }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationMarker />
          <LocationEventsCleanup />
        </MapContainer>
      </div>
      <div className="flex items-center gap-2 mt-2">
        {onSetPortada && (
          <button
            type="button"
            onClick={onSetPortada}
            className={`flex items-center px-2 py-1 rounded text-xs font-medium border ${
              isPortada
                ? "bg-dorado-claro text-azul-profundo border-dorado-claro"
                : "bg-white text-gray-500 border-gray-200 hover:bg-dorado-claro/20"
            } transition-colors`}
          >
            {isPortada ? <Check size={14} className="mr-1" /> : null}
            {isPortada ? "Portada actual" : "Usar como portada"}
          </button>
        )}
        <button
          onClick={() => onSave({ fecha_real: date, latitud: position[0], longitud: position[1] })}
          className="flex items-center justify-center px-3 py-1 bg-dorado-claro text-azul-profundo rounded-md text-xs font-medium hover:bg-opacity-90 transition-colors"
        >
          <Save size={14} className="mr-1" />
          Guardar cambios
        </button>
      </div>
    </div>
  );
};

export default RecuerdoMetadataEditor;
