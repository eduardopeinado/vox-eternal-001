import * as React from "react";
import Map, { Marker, NavigationControl, MapRef } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";

interface CapsuleLocationMapGLProps {
  lat: number;
  lng: number;
  onLocationChange: (lat: number, lng: number) => void;
}

const CapsuleLocationMapGL: React.FC<CapsuleLocationMapGLProps> = ({
  lat,
  lng,
  onLocationChange,
}) => {
  const mapRef = React.useRef<MapRef>(null);
  const [marker, setMarker] = React.useState<{ lat: number; lng: number }>({
    lat,
    lng,
  });

  // Sync marker with props
  React.useEffect(() => {
    setMarker({ lat, lng });
  }, [lat, lng]);

  // Cleanup: no es necesario con MapLibre, pero por claridad
  React.useEffect(() => {
    return () => {
      // Nada que limpiar, MapLibre maneja bien el desmontaje
    };
  }, []);

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <Map
        ref={mapRef}
        initialViewState={{
          longitude: marker.lng,
          latitude: marker.lat,
          zoom: marker.lat && marker.lng ? 13 : 2,
        }}
        mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
        style={{ width: "100%", height: "100%" }}
        onClick={(e) => {
          const { lngLat } = e;
          setMarker({ lat: lngLat.lat, lng: lngLat.lng });
          onLocationChange(lngLat.lat, lngLat.lng);
        }}
      >
        <Marker
          longitude={marker.lng}
          latitude={marker.lat}
          draggable
          onDragEnd={(e) => {
            setMarker({ lat: e.lngLat.lat, lng: e.lngLat.lng });
            onLocationChange(e.lngLat.lat, e.lngLat.lng);
          }}
        />
        <NavigationControl position="top-right" />
      </Map>
    </div>
  );
};

export default CapsuleLocationMapGL;
