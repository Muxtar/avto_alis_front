'use client';
import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { AZ_CITIES } from '@/lib/cities';
import { useLanguage } from '@/lib/LanguageContext';

if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
}

const pinIcon = L.divIcon({
  className: 'location-picker-pin',
  html: `<div style="background:#f97316;width:36px;height:36px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 4px 10px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
    <div style="width:12px;height:12px;background:white;border-radius:50%;transform:rotate(45deg);"></div>
  </div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
});

// Approximate centers for each AZ city — used to recenter the map when the
// user picks a city from the dropdown without first clicking the map.
const CITY_CENTERS: Record<string, [number, number]> = {
  'Bakı': [40.4093, 49.8671],
  'Sumqayıt': [40.5897, 49.6686],
  'Gəncə': [40.6828, 46.3606],
  'Mingəçevir': [40.7700, 47.0500],
  'Lənkəran': [38.7529, 48.8475],
  'Şəki': [41.1919, 47.1706],
  'Yevlax': [40.6196, 47.1500],
  'Naxçıvan': [39.2089, 45.4122],
  'Şirvan': [39.9389, 48.9181],
  'Quba': [41.3614, 48.5256],
  'Xırdalan': [40.4500, 49.7547],
};

const DEFAULT_CENTER: [number, number] = [40.4093, 49.8671]; // Bakı

interface Props {
  city: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  onChange: (next: { city: string; address: string; latitude: number | null; longitude: number | null }) => void;
  height?: string;
}

// Recenter helper — fires when caller-controlled center changes from outside
// (e.g. user picks a new city from the dropdown).
function Recenter({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

// Click handler — drops a pin wherever the user clicks.
function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function LocationPicker({ city, address, latitude, longitude, onChange, height = '300px' }: Props) {
  const { t } = useLanguage();
  const [geoLoading, setGeoLoading] = useState(false);
  const [reverseLoading, setReverseLoading] = useState(false);
  // Ünvan/yer axtarışı (irəli geocoding) — Google Maps kimi yazıb xəritədə tap.
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  // Decide where to center the map: pin position > city center > Bakı.
  const initialCenter: [number, number] = latitude && longitude
    ? [latitude, longitude]
    : (city && CITY_CENTERS[city]) || DEFAULT_CENTER;
  const initialZoom = latitude && longitude ? 15 : (city ? 12 : 9);
  const [center, setCenter] = useState<[number, number]>(initialCenter);
  const [zoom, setZoom] = useState(initialZoom);

  const setPin = (lat: number, lng: number) => {
    onChange({ city, address, latitude: lat, longitude: lng });
  };

  const handleCityChange = (next: string) => {
    onChange({ city: next, address, latitude, longitude });
    const c = CITY_CENTERS[next];
    if (c) {
      setCenter(c);
      setZoom(12);
    }
  };

  const useMyLocationHandler = () => {
    if (!navigator.geolocation) {
      alert(t('geolocationNotSupported'));
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        onChange({ city, address, latitude: lat, longitude: lng });
        setCenter([lat, lng]);
        setZoom(16);
        setGeoLoading(false);
      },
      (err) => {
        setGeoLoading(false);
        alert(t('geolocationFailed') + ': ' + err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Reverse geocode using free Nominatim — fills the address field when the
  // user explicitly clicks "Doldur". Not auto-run on every pin drop because
  // Nominatim's usage policy caps to 1 req/sec and the user may not want it.
  const reverseGeocode = async () => {
    if (!latitude || !longitude) return;
    setReverseLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=az`,
        { headers: { 'User-Agent': 'avto-buy-sell/1.0' } }
      );
      const data = await res.json();
      const display = data.display_name as string | undefined;
      if (display) {
        onChange({ city, address: display, latitude, longitude });
      }
    } catch {
      // Silent — user can type the address manually.
    } finally {
      setReverseLoading(false);
    }
  };

  // İrəli geocoding — yer/ünvan adı yazıb xəritədə tapır (Nominatim, yalnız Azərbaycan).
  const doSearch = async () => {
    const q = searchQuery.trim();
    if (!q) return;
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&countrycodes=az&accept-language=az&limit=6&q=${encodeURIComponent(q)}`,
        { headers: { 'User-Agent': 'avto-buy-sell/1.0' } }
      );
      const data = await res.json();
      setResults(Array.isArray(data) ? data : []);
      if (Array.isArray(data) && data.length === 1) pickResult(data[0]);
    } catch { /* səssiz — istifadəçi xəritəyə klik edə bilər */ } finally { setSearching(false); }
  };
  const pickResult = (r: any) => {
    const lat = parseFloat(r.lat), lng = parseFloat(r.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    onChange({ city, address: r.display_name || address, latitude: lat, longitude: lng });
    setCenter([lat, lng]); setZoom(16); setResults([]); setSearchQuery(r.display_name?.split(',')[0] || searchQuery);
  };

  return (
    <div className="space-y-3">
      {/* Ünvan/yer axtarışı — yaz, xəritədə işarələsin */}
      <div className="relative">
        <div className="flex gap-2">
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); doSearch(); } }}
            placeholder="🔍 Ünvan və ya yer adı yaz (məs. 28 May metrosu, Nizami küç.)"
            className="flex-1 px-4 py-2.5 bg-input-bg border border-input-border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/50 placeholder-muted-foreground text-foreground text-sm"
          />
          <button type="button" onClick={doSearch} disabled={searching || !searchQuery.trim()}
            className="px-4 py-2.5 bg-orange-500/10 text-orange-500 rounded-xl text-sm font-medium disabled:opacity-50 whitespace-nowrap">
            {searching ? '…' : 'Axtar'}
          </button>
        </div>
        {results.length > 0 && (
          <div className="absolute z-[500] left-0 right-0 mt-1 bg-card border border-card-border rounded-xl shadow-lg max-h-52 overflow-y-auto">
            {results.map((r, i) => (
              <button key={i} type="button" onClick={() => pickResult(r)} className="w-full text-left px-3 py-2 text-xs hover:bg-input-bg border-b border-card-border/40 last:border-0">
                📍 {r.display_name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-medium text-muted mb-1">{t('cityLabel')}</label>
          <select
            value={city}
            onChange={(e) => handleCityChange(e.target.value)}
            className="w-full px-4 py-2.5 bg-input-bg border border-input-border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-foreground text-sm"
          >
            <option value="">{t('citySelect')}</option>
            {AZ_CITIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted mb-1">{t('streetAddressLabel')}</label>
          <input
            value={address}
            onChange={(e) => onChange({ city, address: e.target.value, latitude, longitude })}
            placeholder={t('addressPlaceholderShort')}
            className="w-full px-4 py-2.5 bg-input-bg border border-input-border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/50 placeholder-muted-foreground text-foreground text-sm"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={useMyLocationHandler}
          disabled={geoLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {geoLoading ? t('findingLocation') : t('useMyLocation')}
        </button>
        {latitude && longitude && (
          <>
            <button
              type="button"
              onClick={reverseGeocode}
              disabled={reverseLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
            >
              {reverseLoading ? t('fillingAddress') : t('fillAddressFromPin')}
            </button>
            <button
              type="button"
              onClick={() => onChange({ city, address, latitude: null, longitude: null })}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg text-xs font-medium transition-colors"
            >
              {t('removePin')}
            </button>
          </>
        )}
      </div>

      <p className="text-[11px] text-muted">
        {t('locationPickerHint')}
      </p>

      <div style={{ height, borderRadius: 12, overflow: 'hidden' }} className="border border-input-border">
        <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Recenter center={center} zoom={zoom} />
          <ClickHandler onPick={setPin} />
          {latitude && longitude && (
            <Marker position={[latitude, longitude]} icon={pinIcon} />
          )}
        </MapContainer>
      </div>

      {latitude && longitude && (
        <p className="text-[10px] text-muted">
          {t('coordinatesLabel')}: {latitude.toFixed(5)}, {longitude.toFixed(5)}
        </p>
      )}
    </div>
  );
}
