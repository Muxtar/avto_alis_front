'use client';
import dynamic from 'next/dynamic';

// Leaflet requires `window`, so we disable SSR for the picker.
const LocationPicker = dynamic(() => import('./LocationPicker'), {
  ssr: false,
  loading: () => (
    <div className="space-y-3">
      <div className="h-12 bg-input-bg rounded-xl animate-pulse" />
      <div style={{ height: '300px' }} className="bg-input-bg rounded-xl flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  ),
});

export default LocationPicker;
