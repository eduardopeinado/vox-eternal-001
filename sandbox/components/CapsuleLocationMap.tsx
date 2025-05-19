import React, { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";

interface CapsuleLocationMapProps {
  lat: number;
  lng: number;
  onLocationChange: (lat: number, lng: number) => void;
}

const CapsuleLocationMap: React.FC<CapsuleLocationMapProps> = ({ lat, lng, onLocationChange }) => {
  // Componente para manejar clicks y mover el pin, y limpiar el mapa al desmontar
  function LocationEvents() {
    const map = useMap();

    useEffect(() => {
      return () => {
        map.remove();
      };
    }, [map]);

    useMapEvents({
      click(e) {
        onLocationChange(e.latlng.lat, e.latlng.lng);
      },
    });
    return null;
  }

  return (
    <MapContainer
      center={[lat, lng]}
      zoom={lat && lng ? 13 : 2}
      style={{ width: "100%", height: "100%" }}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={[lat, lng]}>
        <Popup>
          Arrastra el pin o haz click en el mapa para ajustar la ubicación.
        </Popup>
      </Marker>
      <LocationEvents />
    </MapContainer>
  );
};

export default CapsuleLocationMap;
