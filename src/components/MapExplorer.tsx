'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Link from 'next/link';
import { API } from '@/lib/api';

if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
}

// Obyekt (mağaza/biznes) ikonu — narıncı, ev/mağaza işarəsi.
const objectIcon = L.divIcon({
  className: 'map-explorer-pin',
  html: `<div style="background:#f97316;width:34px;height:34px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 4px 10px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
    <span style="transform:rotate(45deg);font-size:15px;line-height:1;">🏪</span>
  </div>`,
  iconSize: [34, 34],
  iconAnchor: [17, 34],
  popupAnchor: [0, -32],
});

// İstifadəçi ikonu — yaşıl dairə, şəxs işarəsi.
const userIcon = L.divIcon({
  className: 'map-explorer-pin',
  html: `<div style="background:#16a34a;width:32px;height:32px;border-radius:50%;border:3px solid white;box-shadow:0 4px 10px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
    <span style="font-size:15px;line-height:1;">👤</span>
  </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -30],
});

// Axtarılan yer (küçə/şəhər/məkan) ikonu — mavi nişan.
const placeIcon = L.divIcon({
  className: 'map-explorer-pin',
  html: `<div style="background:#2F6BFF;width:34px;height:34px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 4px 10px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;">
    <span style="transform:rotate(45deg);font-size:15px;line-height:1;">📍</span>
  </div>`,
  iconSize: [34, 34],
  iconAnchor: [17, 34],
  popupAnchor: [0, -32],
});

// İstifadəçinin canlı yeri — mavi nöqtə (pulsing).
const myLocIcon = L.divIcon({
  className: 'map-explorer-pin',
  html: `<div style="width:20px;height:20px;background:#2563eb;border:3px solid white;border-radius:50%;box-shadow:0 0 0 6px rgba(37,99,235,0.25);"></div>`,
  iconSize: [20, 20], iconAnchor: [10, 10],
});

const AZ_CENTER: [number, number] = [40.3, 47.7];
const AZ_ZOOM = 7;

interface ObjectPoint {
  id: number; name: string; latitude: number; longitude: number;
  city?: string; address?: string; activityAreas?: string[]; businessId?: number; listingCount?: number;
}
interface UserPoint {
  id: number; name: string; type?: string; latitude: number; longitude: number;
  city?: string; avatar?: string; profession?: string; listingCount?: number;
}
// Nominatim (OpenStreetMap) yer nəticəsi — küçə/şəhər/rayon/məkan.
interface PlaceResult {
  kind: 'place';
  name: string;
  sub: string;
  typeLabel: string;
  lat: number;
  lng: number;
  bounds: [[number, number], [number, number]]; // [[south, west], [north, east]]
}
interface SelectedPlace extends PlaceResult {
  objects: ObjectPoint[];
  users: UserPoint[];
}

// Nominatim class/type → Azərbaycanca etiket.
function placeTypeLabel(cls: string, type: string): string {
  if (cls === 'highway') return 'Küçə';
  if (cls === 'place') {
    if (type === 'city' || type === 'town') return 'Şəhər';
    if (type === 'village' || type === 'hamlet') return 'Kənd';
    if (type === 'suburb' || type === 'quarter' || type === 'neighbourhood') return 'Qəsəbə';
    return 'Yer';
  }
  if (cls === 'boundary') return 'Rayon';
  if (cls === 'amenity' || cls === 'shop' || cls === 'tourism' || cls === 'leisure') return 'Məkan';
  if (cls === 'building') return 'Bina';
  return 'Yer';
}

function Recenter({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => { map.setView(center, zoom); }, [center, zoom, map]);
  return null;
}
// Seçilmiş yerin sərhədlərinə uyğunlaşdır (küçə boyu görünüş).
function FitBounds({ bounds }: { bounds: [[number, number], [number, number]] | null }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) map.fitBounds(L.latLngBounds(bounds), { padding: [40, 40], maxZoom: 17 });
  }, [bounds, map]);
  return null;
}

export default function MapExplorer({ height = '70vh' }: { height?: string }) {
  const [objects, setObjects] = useState<ObjectPoint[]>([]);
  const [users, setUsers] = useState<UserPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [center, setCenter] = useState<[number, number]>(AZ_CENTER);
  const [zoom, setZoom] = useState(AZ_ZOOM);
  const [places, setPlaces] = useState<PlaceResult[]>([]);
  const [searchingPlaces, setSearchingPlaces] = useState(false);
  const [selected, setSelected] = useState<SelectedPlace | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [myLoc, setMyLoc] = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(false);
  const geocodeTimer = useRef<any>(null);

  // Canlı yer — GPS ilə istifadəçinin cari konumunu tap və xəritədə göstər.
  const useMyLocation = () => {
    if (!navigator.geolocation) { alert('Cihaz konumu dəstəkləmir'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { const p: [number, number] = [pos.coords.latitude, pos.coords.longitude]; setMyLoc(p); setCenter(p); setZoom(15); setLocating(false); },
      () => { setLocating(false); alert('Yerinizi tapmaq mümkün olmadı — brauzerdə konum icazəsini yoxlayın.'); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  useEffect(() => {
    fetch(`${API}/map/points`)
      .then((r) => r.json())
      .then((d) => {
        setObjects((d.objects || []).filter((o: ObjectPoint) => o.latitude != null && o.longitude != null));
        setUsers((d.users || []).filter((u: UserPoint) => u.latitude != null && u.longitude != null));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // ── Nominatim: bütün Azərbaycan üzrə küçə/şəhər/məkan axtarışı (debounce) ──
  useEffect(() => {
    const q = query.trim();
    if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
    if (q.length < 3) { setPlaces([]); setSearchingPlaces(false); return; }
    setSearchingPlaces(true);
    geocodeTimer.current = setTimeout(async () => {
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&countrycodes=az&accept-language=az&addressdetails=0&limit=6&q=${encodeURIComponent(q)}`;
        const r = await fetch(url);
        const data = await r.json();
        const out: PlaceResult[] = (Array.isArray(data) ? data : []).map((p: any) => {
          const parts = String(p.display_name || '').split(',').map((s: string) => s.trim());
          const bb = (p.boundingbox || []).map(Number); // [south, north, west, east]
          return {
            kind: 'place' as const,
            name: parts[0] || p.display_name,
            sub: parts.slice(1, 4).join(', '),
            typeLabel: placeTypeLabel(String(p.class || ''), String(p.type || '')),
            lat: parseFloat(p.lat),
            lng: parseFloat(p.lon),
            bounds: [[bb[0], bb[2]], [bb[1], bb[3]]] as [[number, number], [number, number]],
          };
        }).filter((p: PlaceResult) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
        setPlaces(out);
      } catch {
        setPlaces([]);
      } finally {
        setSearchingPlaces(false);
      }
    }, 450);
    return () => { if (geocodeTimer.current) clearTimeout(geocodeTimer.current); };
  }, [query]);

  // Lokal nəticələr (obyekt + istifadəçi adı üzrə).
  const localResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [] as Array<{ kind: 'object' | 'user'; id: number; name: string; sub?: string; lat: number; lng: number }>;
    const out: Array<{ kind: 'object' | 'user'; id: number; name: string; sub?: string; lat: number; lng: number }> = [];
    for (const o of objects) {
      if (o.name.toLowerCase().includes(q) || (o.address || '').toLowerCase().includes(q)) out.push({ kind: 'object', id: o.id, name: o.name, sub: o.city || o.address, lat: o.latitude, lng: o.longitude });
    }
    for (const u of users) {
      if (u.name.toLowerCase().includes(q) || (u.profession || '').toLowerCase().includes(q)) out.push({ kind: 'user', id: u.id, name: u.name, sub: u.profession || u.city, lat: u.latitude, lng: u.longitude });
    }
    return out.slice(0, 5);
  }, [query, objects, users]);

  const focus = (lat: number, lng: number) => { setCenter([lat, lng]); setZoom(16); setShowDropdown(false); };

  // Yer seçiləndə: xəritəni ora uyğunlaşdır + ərazidəki obyekt/istifadəçiləri tap.
  const selectPlace = (p: PlaceResult) => {
    // Kiçik bbox-ları (küçə xətti) ~400m bufferlə genişlət ki, kənar obyektlər də düşsün.
    const buf = 0.004;
    const south = Math.min(p.bounds[0][0], p.bounds[1][0]) - buf;
    const north = Math.max(p.bounds[0][0], p.bounds[1][0]) + buf;
    const west = Math.min(p.bounds[0][1], p.bounds[1][1]) - buf;
    const east = Math.max(p.bounds[0][1], p.bounds[1][1]) + buf;
    const inBox = (lat: number, lng: number) => lat >= south && lat <= north && lng >= west && lng <= east;
    setSelected({
      ...p,
      bounds: [[south, west], [north, east]],
      objects: objects.filter((o) => inBox(o.latitude, o.longitude)),
      users: users.filter((u) => inBox(u.latitude, u.longitude)),
    });
    setShowDropdown(false);
  };

  const clearSelection = () => { setSelected(null); setQuery(''); };

  return (
    <div className="relative" style={{ height }}>
      {/* Axtarış qutusu — xəritənin üstündə */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] w-[92%] max-w-md">
        <div className="relative">
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setShowDropdown(true); }}
            onFocus={() => setShowDropdown(true)}
            placeholder="Küçə, şəhər, obyekt, istifadəçi axtar…"
            className="w-full px-4 py-2.5 pr-10 bg-card border border-input-border rounded-xl shadow-lg focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-foreground text-sm"
          />
          {query ? (
            <button onClick={clearSelection} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground text-lg leading-none">×</button>
          ) : (
            <svg className="w-5 h-5 text-muted absolute right-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
          )}
        </div>

        {/* Nəticələr: lokal (obyekt/istifadəçi) + yerlər (küçə/şəhər/məkan) */}
        {showDropdown && query.trim().length >= 2 && (
          <div className="mt-1.5 bg-card border border-input-border rounded-xl shadow-lg overflow-hidden max-h-80 overflow-y-auto">
            {localResults.map((r) => (
              <button
                key={`${r.kind}-${r.id}`}
                onClick={() => focus(r.lat, r.lng)}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-input-bg transition-colors text-left border-b border-input-border/50"
              >
                <span className="text-base shrink-0">{r.kind === 'object' ? '🏪' : '👤'}</span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium truncate">{r.name}</span>
                  {r.sub && <span className="block text-[11px] text-muted truncate">{r.sub}</span>}
                </span>
                <span className="text-[11px] text-orange-500 font-semibold shrink-0">{r.kind === 'object' ? 'Obyekt' : 'İstifadəçi'}</span>
              </button>
            ))}
            {places.map((p, i) => (
              <button
                key={`p-${i}`}
                onClick={() => selectPlace(p)}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-input-bg transition-colors text-left border-b border-input-border/50 last:border-0"
              >
                <span className="text-base shrink-0">📍</span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium truncate">{p.name}</span>
                  {p.sub && <span className="block text-[11px] text-muted truncate">{p.sub}</span>}
                </span>
                <span className="text-[11px] text-blue-500 font-semibold shrink-0">{p.typeLabel}</span>
              </button>
            ))}
            {searchingPlaces && <p className="px-4 py-2.5 text-xs text-muted">Xəritədə axtarılır…</p>}
            {!searchingPlaces && localResults.length === 0 && places.length === 0 && (
              <p className="px-4 py-3 text-sm text-muted">Tapılmadı</p>
            )}
          </div>
        )}

        {/* Seçilmiş ərazi paneli — bu küçə/şəhərdəki obyektlər */}
        {selected && !showDropdown && (
          <div className="mt-1.5 bg-card border border-input-border rounded-xl shadow-lg overflow-hidden">
            <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-input-border/50 bg-input-bg/40">
              <p className="text-sm font-semibold truncate">📍 {selected.name} <span className="text-[11px] text-blue-500 font-semibold">· {selected.typeLabel}</span></p>
              <button onClick={clearSelection} className="text-muted hover:text-foreground text-lg leading-none shrink-0 ml-2">×</button>
            </div>
            <div className="max-h-56 overflow-y-auto">
              {selected.objects.length === 0 && selected.users.length === 0 ? (
                <p className="px-4 py-3 text-xs text-muted">Bu ərazidə hələ qeydiyyatlı obyekt yoxdur.</p>
              ) : (
                <>
                  <p className="px-3.5 pt-2 pb-1 text-[11px] text-muted">Bu ərazidə: {selected.objects.length} obyekt{selected.users.length ? `, ${selected.users.length} istifadəçi` : ''}</p>
                  {selected.objects.map((o) => (
                    <button key={`so-${o.id}`} onClick={() => focus(o.latitude, o.longitude)}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-input-bg transition-colors text-left border-b border-input-border/40 last:border-0">
                      <span className="shrink-0">🏪</span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-medium truncate">{o.name}</span>
                        {(o.address || o.city) && <span className="block text-[11px] text-muted truncate">{o.address || o.city}</span>}
                      </span>
                      <Link href={`/object/${o.id}`} onClick={(e) => e.stopPropagation()} className="text-[11px] text-orange-500 font-semibold shrink-0 hover:underline">Aç →</Link>
                    </button>
                  ))}
                  {selected.users.map((u) => (
                    <button key={`su-${u.id}`} onClick={() => focus(u.latitude, u.longitude)}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-input-bg transition-colors text-left border-b border-input-border/40 last:border-0">
                      <span className="shrink-0">👤</span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-medium truncate">{u.name}</span>
                        {(u.profession || u.city) && <span className="block text-[11px] text-muted truncate">{u.profession || u.city}</span>}
                      </span>
                      <Link href={`/seller/${u.id}`} onClick={(e) => e.stopPropagation()} className="text-[11px] text-green-600 font-semibold shrink-0 hover:underline">Aç →</Link>
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Lejend */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-card/95 border border-input-border rounded-lg px-3 py-2 shadow-lg text-[11px] space-y-1">
        <div className="flex items-center gap-1.5"><span>🏪</span> Biznes obyekti</div>
        <div className="flex items-center gap-1.5"><span>👤</span> İstifadəçi</div>
        <div className="flex items-center gap-1.5"><span>📍</span> Axtarılan yer</div>
      </div>

      {/* Mənim yerim (canlı GPS konum) */}
      <button onClick={useMyLocation} disabled={locating} title="Mənim yerim"
        className="absolute bottom-3 right-3 z-[1000] bg-card border border-input-border rounded-xl px-3 py-2 shadow-lg text-xs font-semibold hover:bg-orange-500/10 disabled:opacity-50 flex items-center gap-1.5">
        📍 {locating ? '...' : 'Mənim yerim'}
      </button>

      {loading && (
        <div className="absolute inset-0 z-[1001] flex items-center justify-center bg-card/40">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      <div style={{ height: '100%', borderRadius: 12, overflow: 'hidden' }} className="border border-input-border">
        <MapContainer center={AZ_CENTER} zoom={AZ_ZOOM} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
          <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Recenter center={center} zoom={zoom} />
          <FitBounds bounds={selected ? selected.bounds : null} />

          {/* İstifadəçinin canlı yeri */}
          {myLoc && (
            <Marker position={myLoc} icon={myLocIcon}>
              <Popup>📍 Siz buradasınız</Popup>
            </Marker>
          )}

          {/* Axtarılan yerin nişanı */}
          {selected && (
            <Marker position={[selected.lat, selected.lng]} icon={placeIcon}>
              <Popup>
                <div style={{ minWidth: 150 }}>
                  <p style={{ fontWeight: 700, margin: '0 0 2px' }}>📍 {selected.name}</p>
                  <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>{selected.typeLabel}{selected.sub ? ` · ${selected.sub}` : ''}</p>
                </div>
              </Popup>
            </Marker>
          )}

          {objects.map((o) => (
            <Marker key={`o-${o.id}`} position={[o.latitude, o.longitude]} icon={objectIcon}>
              <Popup>
                <div style={{ minWidth: 160 }}>
                  <p style={{ fontWeight: 700, margin: '0 0 2px' }}>🏪 {o.name}</p>
                  {(o.city || o.address) && <p style={{ margin: '0 0 4px', fontSize: 12, color: '#6b7280' }}>{[o.city, o.address].filter(Boolean).join(', ')}</p>}
                  {typeof o.listingCount === 'number' && <p style={{ margin: '0 0 6px', fontSize: 12 }}>{o.listingCount} elan</p>}
                  <Link href={`/object/${o.id}`} style={{ color: '#f97316', fontWeight: 600, fontSize: 13 }}>Obyektin məhsulları →</Link>
                </div>
              </Popup>
            </Marker>
          ))}

          {users.map((u) => (
            <Marker key={`u-${u.id}`} position={[u.latitude, u.longitude]} icon={userIcon}>
              <Popup>
                <div style={{ minWidth: 160 }}>
                  <p style={{ fontWeight: 700, margin: '0 0 2px' }}>👤 {u.name}</p>
                  {(u.profession || u.city) && <p style={{ margin: '0 0 4px', fontSize: 12, color: '#6b7280' }}>{[u.profession, u.city].filter(Boolean).join(' · ')}</p>}
                  {typeof u.listingCount === 'number' && <p style={{ margin: '0 0 6px', fontSize: 12 }}>{u.listingCount} elan</p>}
                  <Link href={`/seller/${u.id}`} style={{ color: '#16a34a', fontWeight: 600, fontSize: 13 }}>Profilə bax →</Link>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
