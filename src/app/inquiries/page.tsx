'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useLanguage } from '@/lib/LanguageContext';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';
import { API } from '@/lib/api';

interface Offer {
  id: number;
  price: number;
  message: string | null;
  status: string;
  createdAt: string;
  seller: { id: number; name: string; phone: string; type: string };
  listing?: { id: number; title: string; price: number; images: string[] } | null;
}

interface Inquiry {
  id: number;
  rawText: string;
  aiAnalysis: any;
  status: string;
  createdAt: string;
  offers: Offer[];
  buyer?: { id: number; name: string; phone: string; type: string };
  myOffer?: any;
  targetSellers?: any[];
}

export default function InquiriesPage() {
  const { user, token } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const router = useRouter();
  const [tab, setTab] = useState<'buying' | 'selling'>('buying');
  const [buyerInquiries, setBuyerInquiries] = useState<Inquiry[]>([]);
  const [sellerInquiries, setSellerInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [offerForms, setOfferForms] = useState<Record<number, { price: string; message: string }>>({});

  useEffect(() => {
    if (!token) { router.push('/'); return; }
    fetchData();
  }, [token, tab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (tab === 'buying') {
        const res = await fetch(`${API}/inquiries/my`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        setBuyerInquiries(data.inquiries || []);
      } else {
        const res = await fetch(`${API}/inquiries/received`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        setSellerInquiries(data.inquiries || []);
      }
    } catch { toast(t('error'), 'error'); }
    setLoading(false);
  };

  const acceptOffer = async (inquiryId: number, offerId: number) => {
    try {
      const res = await fetch(`${API}/inquiries/${inquiryId}/offers/${offerId}/accept`, {
        method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.success) fetchData();
      else toast(data.message, 'error');
    } catch { toast(t('error'), 'error'); }
  };

  const closeInquiry = async (inquiryId: number) => {
    if (!confirm(t('closeInquiryConfirm'))) return;
    try {
      const res = await fetch(`${API}/inquiries/${inquiryId}/close`, {
        method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.success) fetchData();
    } catch { toast(t('error'), 'error'); }
  };

  const submitOffer = async (inquiryId: number) => {
    const form = offerForms[inquiryId];
    if (!form?.price || parseFloat(form.price) <= 0) { toast(t('offerPrice'), 'error'); return; }
    try {
      const res = await fetch(`${API}/inquiries/${inquiryId}/offer`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ price: parseFloat(form.price), message: form.message || null }),
      });
      const data = await res.json();
      if (data.success) {
        setOfferForms(prev => { const n = { ...prev }; delete n[inquiryId]; return n; });
        fetchData();
      } else toast(data.message, 'error');
    } catch { toast(t('error'), 'error'); }
  };

  const withdrawOffer = async (offerId: number) => {
    try {
      const res = await fetch(`${API}/inquiries/offers/${offerId}/withdraw`, {
        method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.success) fetchData();
    } catch { toast(t('error'), 'error'); }
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      OPEN: 'bg-green-500/20 text-green-400', ACCEPTED: 'bg-blue-500/20 text-blue-400',
      CLOSED: 'bg-gray-500/20 text-gray-400', EXPIRED: 'bg-red-500/20 text-red-400',
      PENDING: 'bg-yellow-500/20 text-yellow-400', REJECTED: 'bg-red-500/20 text-red-400',
      WITHDRAWN: 'bg-gray-500/20 text-gray-400',
    };
    const labelKey: Record<string, string> = {
      OPEN: 'inquiryOpen', ACCEPTED: 'inquiryAccepted', CLOSED: 'inquiryClosed', EXPIRED: 'inquiryExpired',
      PENDING: 'offerPending', REJECTED: 'offerRejected', WITHDRAWN: 'offerWithdrawn',
    };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-500/20 text-gray-400'}`}>{t(labelKey[status] as any) || status}</span>;
  };

  const inputCls = 'bg-input-bg border border-input-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-orange-500';

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      <h1 className="text-2xl font-bold mb-6">{t('inquiries')}</h1>

      <div className="flex gap-2 mb-6">
        <button onClick={() => setTab('buying')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === 'buying' ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white' : 'bg-card border border-card-border text-muted hover:text-foreground'}`}>
          {t('myInquiries')}
        </button>
        <button onClick={() => setTab('selling')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === 'selling' ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white' : 'bg-card border border-card-border text-muted hover:text-foreground'}`}>
          {t('receivedInquiries')}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tab === 'buying' ? (
        buyerInquiries.length === 0 ? (
          <div className="text-center py-20 text-muted">
            <p className="text-lg mb-2">{t('noInquiries')}</p>
            <p className="text-sm">{t('noInquiriesDesc')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {buyerInquiries.map(inq => (
              <div key={inq.id} className="bg-card border border-card-border rounded-2xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{inq.rawText}</p>
                    {inq.aiAnalysis && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {inq.aiAnalysis.vehicleBrand && <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">{inq.aiAnalysis.vehicleBrand} {inq.aiAnalysis.vehicleModel || ''}</span>}
                        {inq.aiAnalysis.productType && <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full">{inq.aiAnalysis.productType}</span>}
                        {inq.aiAnalysis.category && <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">{inq.aiAnalysis.category}</span>}
                      </div>
                    )}
                    <p className="text-xs text-muted mt-1">{new Date(inq.createdAt).toLocaleDateString('az-AZ')}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {statusBadge(inq.status)}
                    {inq.status === 'OPEN' && (
                      <button onClick={() => closeInquiry(inq.id)} className="text-xs text-red-400 hover:text-red-300">{t('closeInquiry')}</button>
                    )}
                  </div>
                </div>

                {inq.offers.length > 0 ? (
                  <div className="space-y-2 mt-3 border-t border-card-border pt-3">
                    <p className="text-sm font-medium text-muted">{inq.offers.length} {t('offers')}:</p>
                    {inq.offers.map(offer => (
                      <div key={offer.id} className="flex items-center justify-between bg-input-bg border border-input-border rounded-xl p-3">
                        <div>
                          <p className="text-sm font-medium">{offer.seller.name}</p>
                          <p className="text-lg font-bold text-orange-500">{offer.price} AZN</p>
                          {offer.message && <p className="text-xs text-muted mt-0.5">{offer.message}</p>}
                          {offer.listing && <p className="text-xs text-blue-400 mt-0.5">{offer.listing.title}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          {statusBadge(offer.status)}
                          {offer.status === 'PENDING' && inq.status === 'OPEN' && (
                            <button onClick={() => acceptOffer(inq.id, offer.id)} className="bg-gradient-to-r from-orange-500 to-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-90">
                              {t('acceptOffer')}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted mt-2 border-t border-card-border pt-3">{t('noOffersYet')}</p>
                )}
              </div>
            ))}
          </div>
        )
      ) : (
        sellerInquiries.length === 0 ? (
          <div className="text-center py-20 text-muted">
            <p className="text-lg mb-2">{t('noReceivedInquiries')}</p>
            <p className="text-sm">{t('noReceivedInquiriesDesc')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sellerInquiries.map(inq => (
              <div key={inq.id} className="bg-card border border-card-border rounded-2xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <p className="text-xs text-muted">{t('buyer')}: {inq.buyer?.name}</p>
                    <p className="font-medium text-foreground mt-1">{inq.rawText}</p>
                    {inq.aiAnalysis && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {inq.aiAnalysis.vehicleBrand && <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">{inq.aiAnalysis.vehicleBrand} {inq.aiAnalysis.vehicleModel || ''}</span>}
                        {inq.aiAnalysis.productType && <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full">{inq.aiAnalysis.productType}</span>}
                        {inq.aiAnalysis.category && <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">{inq.aiAnalysis.category}</span>}
                      </div>
                    )}
                    <p className="text-xs text-muted mt-1">{new Date(inq.createdAt).toLocaleDateString('az-AZ')}</p>
                  </div>
                  {statusBadge(inq.status)}
                </div>

                {inq.myOffer ? (
                  <div className="bg-input-bg border border-input-border rounded-xl p-3 mt-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted">{t('yourOffer')}</p>
                        <p className="text-lg font-bold text-orange-500">{inq.myOffer.price} AZN</p>
                        {inq.myOffer.message && <p className="text-xs text-muted">{inq.myOffer.message}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        {statusBadge(inq.myOffer.status)}
                        {inq.myOffer.status === 'PENDING' && (
                          <button onClick={() => withdrawOffer(inq.myOffer.id)} className="text-xs text-red-400 hover:text-red-300">{t('withdrawOffer')}</button>
                        )}
                      </div>
                    </div>
                  </div>
                ) : inq.status === 'OPEN' ? (
                  <div className="bg-input-bg border border-input-border rounded-xl p-3 mt-2">
                    <p className="text-sm font-medium mb-2">{t('offerSubmitBtn')}</p>
                    <div className="flex gap-2">
                      <input type="number" placeholder={t('offerPrice')}
                        value={offerForms[inq.id]?.price || ''}
                        onChange={e => setOfferForms(prev => ({ ...prev, [inq.id]: { ...prev[inq.id], price: e.target.value, message: prev[inq.id]?.message || '' } }))}
                        className={`${inputCls} w-28`} />
                      <input type="text" placeholder={t('offerMessage')}
                        value={offerForms[inq.id]?.message || ''}
                        onChange={e => setOfferForms(prev => ({ ...prev, [inq.id]: { ...prev[inq.id], message: e.target.value, price: prev[inq.id]?.price || '' } }))}
                        className={`${inputCls} flex-1`} />
                      <button onClick={() => submitOffer(inq.id)}
                        className="bg-gradient-to-r from-orange-500 to-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90">
                        {t('submitOffer')}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
