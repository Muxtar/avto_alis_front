"use client";
import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { useToast } from "@/components/Toast";
import { API } from "@/lib/api";

export default function AdminDashboard() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [data, setData] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    fetch(`${API}/admin/dashboard`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then(setData)
      .catch(() => { toast(t('error'), 'error'); });
    fetch(`${API}/admin/analytics`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then(setAnalytics)
      .catch(() => {});
  }, []);

  if (!data) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>;

  const statCards = [
    { label: t("adminTotalUsers"), value: data.stats.totalUsers, color: "from-blue-500 to-blue-600", icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg> },
    { label: t("adminTotalListings"), value: data.stats.totalListings, color: "from-orange-500 to-red-600", icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg> },
    { label: t("adminTotalProducts"), value: data.stats.totalProducts, color: "from-green-500 to-emerald-600", icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" /></svg> },
    { label: t("adminTotalServices"), value: data.stats.totalServices, color: "from-purple-500 to-violet-600", icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75a4.5 4.5 0 01-4.884 4.484c-1.076-.091-2.264.071-2.95.904l-7.152 8.684a2.548 2.548 0 11-3.586-3.586l8.684-7.152c.833-.686.995-1.874.904-2.95a4.5 4.5 0 016.336-4.486l-3.276 3.276a3.004 3.004 0 002.25 2.25l3.276-3.276c.256.565.398 1.192.398 1.852z" /></svg> },
  ];

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold mb-6">{t("adminDashboard")}</h1>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
        {statCards.map((card, i) => (
          <div key={i} className="bg-card border border-card-border rounded-xl p-4 sm:p-5">
            <div className={`w-10 h-10 bg-gradient-to-br ${card.color} rounded-xl flex items-center justify-center text-white mb-3`}>{card.icon}</div>
            <p className="text-2xl sm:text-3xl font-bold">{card.value}</p>
            <p className="text-muted text-xs sm:text-sm mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Analytics */}
      {analytics && !analytics.message && (
        <div className="mb-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
            <div className="bg-card border border-card-border rounded-xl p-4">
              <p className="text-muted text-xs">{t("adminRevenue")}</p>
              <p className="text-2xl font-bold text-green-500">{(analytics.revenueTotal || 0).toFixed(0)} ₼</p>
            </div>
            <div className="bg-card border border-card-border rounded-xl p-4">
              <p className="text-muted text-xs">{t("adminDelivered")}</p>
              <p className="text-2xl font-bold">{analytics.deliveredCount}</p>
            </div>
            <div className="bg-card border border-card-border rounded-xl p-4">
              <p className="text-muted text-xs">{t("adminNewUsers30")}</p>
              <p className="text-2xl font-bold text-blue-500">{analytics.newUsers30}</p>
            </div>
            <div className="bg-card border border-card-border rounded-xl p-4">
              <p className="text-muted text-xs">{t("adminOpenIssues")}</p>
              <p className="text-2xl font-bold text-orange-500">{(analytics.pendingKyc || 0) + (analytics.openReturns || 0)}</p>
              <p className="text-[10px] text-muted mt-0.5">KYC {analytics.pendingKyc} · {t("adminReturns")} {analytics.openReturns} · Blok {analytics.blockedUsers}</p>
            </div>
          </div>

          {/* Orders by status */}
          {analytics.ordersByStatus?.length > 0 && (
            <div className="bg-card border border-card-border rounded-xl p-4 sm:p-5 mb-4">
              <h2 className="font-semibold mb-3 text-sm">{t("adminOrdersByStatus")}</h2>
              <div className="flex flex-wrap gap-2">
                {analytics.ordersByStatus.map((s: any) => (
                  <span key={s.status} className="px-3 py-1.5 bg-input-bg border border-input-border rounded-full text-xs font-medium">
                    {s.status} <span className="text-orange-500 ml-1">{s.count}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Daily revenue (last 30d) — sadə bar */}
          {analytics.daily?.length > 0 && (
            <div className="bg-card border border-card-border rounded-xl p-4 sm:p-5">
              <h2 className="font-semibold mb-3 text-sm">{t("adminDailyRevenue")}</h2>
              <div className="flex items-end gap-1 h-32">
                {(() => {
                  const max = Math.max(...analytics.daily.map((d: any) => d.revenue), 1);
                  return analytics.daily.map((d: any) => (
                    <div key={d.date} className="flex-1 flex flex-col items-center justify-end group" title={`${d.date}: ${d.revenue.toFixed(0)}₼ / ${d.orders} sifariş`}>
                      <div className="w-full bg-gradient-to-t from-orange-500 to-red-500 rounded-t" style={{ height: `${Math.max(2, (d.revenue / max) * 100)}%` }} />
                    </div>
                  ));
                })()}
              </div>
              <p className="text-[10px] text-muted mt-1 text-right">{t("adminLast30Days")}</p>
            </div>
          )}
        </div>
      )}

      {/* Category Distribution */}
      {data.categoryCounts?.length > 0 && (
        <div className="bg-card border border-card-border rounded-xl p-4 sm:p-5 mb-8">
          <h2 className="font-semibold mb-4">{t("adminCategory")}</h2>
          <div className="flex flex-wrap gap-2">
            {data.categoryCounts.map((c: any) => (
              <span key={c.category} className="px-3 py-1.5 bg-input-bg border border-input-border rounded-full text-xs font-medium">
                {c.category} <span className="text-orange-500 ml-1">{c.count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Users */}
        <div className="bg-card border border-card-border rounded-xl p-4 sm:p-5">
          <h2 className="font-semibold mb-4">{t("adminRecentUsers")}</h2>
          <div className="space-y-3">
            {data.recentUsers.map((u: any) => (
              <div key={u.id} className="flex items-center justify-between p-3 bg-input-bg/50 rounded-lg">
                <div>
                  <p className="font-medium text-sm">{u.name}</p>
                  <p className="text-muted text-xs">{u.phone}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs ${u.type === 'MECHANIC' ? 'bg-green-500/10 text-green-500' : u.type === 'PARTS_SELLER' ? 'bg-purple-500/10 text-purple-500' : 'bg-blue-500/10 text-blue-500'}`}>
                    {u.type === 'MECHANIC' ? 'Usta' : u.type === 'PARTS_SELLER' ? 'Satıcı' : 'Sahib'}
                  </span>
                  {u.verified && <span className="w-2 h-2 bg-green-500 rounded-full" />}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Listings */}
        <div className="bg-card border border-card-border rounded-xl p-4 sm:p-5">
          <h2 className="font-semibold mb-4">{t("adminRecentListings")}</h2>
          <div className="space-y-3">
            {data.recentListings.map((l: any) => (
              <div key={l.id} className="flex items-center justify-between p-3 bg-input-bg/50 rounded-lg">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{l.title}</p>
                  <p className="text-muted text-xs">{l.user?.name} - {l.category}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className="text-orange-500 font-bold text-sm">{l.price} AZN</span>
                  <span className={`px-2 py-0.5 rounded text-xs ${l.type === 'SERVICE' ? 'bg-green-500/10 text-green-500' : 'bg-orange-500/10 text-orange-500'}`}>
                    {l.type === 'SERVICE' ? 'X' : 'M'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
