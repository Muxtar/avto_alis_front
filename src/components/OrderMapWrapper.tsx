'use client';
import dynamic from 'next/dynamic';

// Leaflet window gerektirdigi icin SSR disable
const OrderMap = dynamic(() => import('./OrderMap'), {
  ssr: false,
  loading: () => (
    <div style={{ height: '400px', borderRadius: 12 }} className="bg-input-bg flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

export default OrderMap;
