import { MapContainer, TileLayer, Marker, Popup, useMap, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import { useEffect, useState } from 'react';
import { useTheme } from './ThemeProvider';

// Fix default icon issue in Leaflet
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom marker icon
const customIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `<div class="w-6 h-6 bg-blue-500 rounded-full border-4 border-white shadow-lg flex items-center justify-center animate-pulse">
          <div class="w-1.5 h-1.5 bg-white rounded-full"></div>
        </div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

interface InteractiveMapProps {
  center: [number, number];
  countryName: string;
  capital: string;
  isoCode?: string | null;
  mini?: boolean;
}

function ChangeView({ center, mini }: { center: [number, number], mini?: boolean }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, mini ? 4 : 5);
  }, [center, map, mini]);
  return null;
}

export default function InteractiveMap({ center, countryName, capital, isoCode, mini = false }: InteractiveMapProps) {
  const { theme } = useTheme();
  const [geoJson, setGeoJson] = useState<any>(null);

  useEffect(() => {
    if (!countryName || mini) return;

    const fetchGeoJson = async () => {
      try {
        // Use isoCode if available for more reliable country lookup
        const query = isoCode ? `country=${isoCode}` : `q=${encodeURIComponent(countryName)}`;
        const response = await fetch(`https://nominatim.openstreetmap.org/search?${query}&polygon_geojson=1&format=json&limit=1&featuretype=country`);
        
        if (!response.ok) {
          if (response.status === 429) {
            console.warn("Nominatim API rate limit reached. Country boundaries will not be displayed.");
          }
          return;
        }

        const data = await response.json();
        if (data && data[0] && data[0].geojson) {
          setGeoJson(data[0].geojson);
        }
      } catch (error) {
        // Gracefully handle fetch failures (e.g. CORS, network issues)
        // We log as a warning because the map still works without boundaries
        console.warn("Optional country boundaries could not be loaded:", error);
      }
    };

    fetchGeoJson();
  }, [countryName, isoCode, mini]);

  const tileUrl = theme === 'dark' 
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

  return (
    <div className={`w-full h-full ${!mini ? 'rounded-2xl border border-gray-100 dark:border-gray-800 shadow-inner' : ''} overflow-hidden`}>
      <MapContainer 
        center={center} 
        zoom={mini ? 4 : 5} 
        scrollWheelZoom={false} 
        dragging={!mini}
        zoomControl={!mini}
        doubleClickZoom={!mini}
        touchZoom={!mini}
        style={{ height: '100%', width: '100%' }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
          url={tileUrl}
        />
        
        {geoJson && (
          <GeoJSON 
            data={geoJson} 
            style={{
              color: theme === 'dark' ? '#3b82f6' : '#2563eb',
              weight: 3,
              opacity: 0.6,
              fillColor: theme === 'dark' ? '#3b82f6' : '#2563eb',
              fillOpacity: 0.1
            }}
          />
        )}

        <Marker position={center} icon={customIcon}>
          {!mini && (
            <Popup className="custom-popup">
              <div className="p-1">
                <h4 className="font-black uppercase tracking-tighter text-blue-600 dark:text-blue-400 text-sm">{countryName}</h4>
                <div className="flex items-center gap-1.5 mt-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">Capital: {capital}</p>
                </div>
              </div>
            </Popup>
          )}
        </Marker>
        <ChangeView center={center} mini={mini} />
      </MapContainer>
    </div>
  );
}
