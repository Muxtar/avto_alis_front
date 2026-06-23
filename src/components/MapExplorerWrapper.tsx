'use client';
import dynamic from 'next/dynamic';

const MapExplorer = dynamic(() => import('./MapExplorer'), {
  ssr: false,
  loading: () => (
    <div style={{ height: '70vh' }} className="bg-input-bg rounded-xl border border-input-border flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

export default MapExplorer;
