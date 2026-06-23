'use client';
import { useEffect, useMemo, useState } from 'react';
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

function Recenter({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => { map.setView(center, zoom); }, [center, zoom, map]);
  return null;
}

export default function MapExplorer({ height = '70vh' }: { height?: string }) {
  const [objects, setObjects] = useState<ObjectPoint[]>([]);
  const [users, setUsers] = useState<UserPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [center, setCenter] = useState<[number, number]>(AZ_CENTER);
  const [zoom, setZoom] = useState(AZ_ZOOM);

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

  // Axtarış nəticələri (ad üzrə) — obyekt + istifadəçi birlikdə.
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [] as Array<{ kind: 'object' | 'user'; id: number; name: string; sub?: string; lat: number; lng: number }>;
    const out: Array<{ kind: 'object' | 'user'; id: number; name: string; sub?: string; lat: number; lng: number }> = [];
    for (const o of objects) {
      if (o.name.toLowerCase().includes(q)) out.push({ kind: 'object', id: o.id, name: o.name, sub: o.city || o.address, lat: o.latitude, lng: o.longitude });
    }
    for (const u of users) {
      if (u.name.toLowerCase().includes(q) || (u.profession || '').toLowerCase().includes(q)) out.push({ kind: 'user', id: u.id, name: u.name, sub: u.profession || u.city, lat: u.latitude, lng: u.longitude });
    }
    return out.slice(0, 8);
  }, [query, objects, users]);

  const focus = (lat: number, lng: number) => { setCenter([lat, lng]); setZoom(16); };

  return (
    <div className="relative" style={{ height }}>
      {/* Axtarış qutusu — xəritənin üstündə */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] w-[92%] max-w-md">
        <div className="relative">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Obyekt və ya istifadəçi adı axtar…"
            className="w-full px-4 py-2.5 pr-10 bg-card border border-input-border rounded-xl shadow-lg focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-foreground text-sm"
          />
          <svg className="w-5 h-5 text-muted absolute right-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
        </div>
        {query.trim() && (
          <div className="mt-1.5 bg-card border border-input-border rounded-xl shadow-lg overflow-hidden max-h-72 overflow-y-auto">
            {results.length === 0 ? (
              <p className="px-4 py-3 text-sm text-muted">Tapılmadı</p>
            ) : results.map((r) => (
              <button
                key={`${r.kind}-${r.id}`}
                onClick={() => { focus(r.lat, r.lng); }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-input-bg transition-colors text-left border-b border-input-border/50 last:border-0"
              >
                <span className="text-base shrink-0">{r.kind === 'object' ? '🏪' : '👤'}</span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium truncate">{r.name}</span>
                  {r.sub && <span className="block text-[11px] text-muted truncate">{r.sub}</span>}
                </span>
                <span className="text-[11px] text-orange-500 font-semibold shrink-0">{r.kind === 'object' ? 'Obyekt' : 'İstifadəçi'}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lejend */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-card/95 border border-input-border rounded-lg px-3 py-2 shadow-lg text-[11px] space-y-1">
        <div className="flex items-center gap-1.5"><span>🏪</span> Biznes obyekti</div>
        <div className="flex items-center gap-1.5"><span>👤</span> İstifadəçi</div>
      </div>

      {loading && (
        <div className="absolute inset-0 z-[1001] flex items-center justify-center bg-card/40">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      <div style={{ height: '100%', borderRadius: 12, overflow: 'hidden' }} className="border border-input-border">
        <MapContainer center={AZ_CENTER} zoom={AZ_ZOOM} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
          <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Recenter center={center} zoom={zoom} />

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
