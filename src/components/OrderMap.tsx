'use client';
import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Leaflet default icon fix for Next.js
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
}

// Farkli renkli iconlar
function makeIcon(color: string) {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="background:${color};width:32px;height:32px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;">
      <div style="width:10px;height:10px;background:white;border-radius:50%;"></div>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

const courierIcon = makeIcon('#f97316'); // orange
const buyerIcon = makeIcon('#22c55e');   // green
const sellerIcon = makeIcon('#3b82f6');  // blue

interface OrderMapProps {
  courierLat?: number | null;
  courierLng?: number | null;
  buyerLat?: number | null;
  buyerLng?: number | null;
  sellerLat?: number | null;
  sellerLng?: number | null;
  courierLabel?: string;
  buyerLabel?: string;
  sellerLabel?: string;
  height?: string;
}

// Haritayi butun noktalari gostermek icin auto-fit
function AutoFit({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 15);
    } else {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [points, map]);
  return null;
}

export default function OrderMap({
  courierLat, courierLng,
  buyerLat, buyerLng,
  sellerLat, sellerLng,
  courierLabel = 'Kuryer',
  buyerLabel = 'Alıcı',
  sellerLabel = 'Satıcı',
  height = '400px',
}: OrderMapProps) {
  const points: [number, number][] = [];
  if (courierLat && courierLng) points.push([courierLat, courierLng]);
  if (buyerLat && buyerLng) points.push([buyerLat, buyerLng]);
  if (sellerLat && sellerLng) points.push([sellerLat, sellerLng]);

  // Eger hic koordinat yoksa Baku merkezi
  const center: [number, number] = points[0] || [40.4093, 49.8671];

  // Kurye ile alici arasi cizgi
  const courierToBuyer: [number, number][] | null =
    courierLat && courierLng && buyerLat && buyerLng
      ? [[courierLat, courierLng], [buyerLat, buyerLng]]
      : null;

  return (
    <div style={{ height, borderRadius: 12, overflow: 'hidden' }}>
      <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <AutoFit points={points} />

        {sellerLat && sellerLng && (
          <Marker position={[sellerLat, sellerLng]} icon={sellerIcon}>
            <Popup>🏪 {sellerLabel}</Popup>
          </Marker>
        )}

        {buyerLat && buyerLng && (
          <Marker position={[buyerLat, buyerLng]} icon={buyerIcon}>
            <Popup>🏠 {buyerLabel}</Popup>
          </Marker>
        )}

        {courierLat && courierLng && (
          <Marker position={[courierLat, courierLng]} icon={courierIcon}>
            <Popup>🚴 {courierLabel}</Popup>
          </Marker>
        )}

        {courierToBuyer && (
          <Polyline positions={courierToBuyer} pathOptions={{ color: '#f97316', dashArray: '6 8', weight: 3 }} />
        )}
      </MapContainer>
    </div>
  );
}
