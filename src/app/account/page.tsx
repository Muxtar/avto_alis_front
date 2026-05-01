"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLanguage } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/Toast";
import { API, UPLOADS } from "@/lib/api";
import { TAXONOMY, buildCategoryPath, parseCategoryPath, getSubsFor, getPartsFor } from "@/lib/taxonomy";
import { AZ_CITIES, FUEL_TYPES, PAYMENT_TYPES } from "@/lib/cities";

const MAX_IMAGES = 5;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const DEFAULT_MAIN = TAXONOMY[0].name;
const DEFAULT_SUB = TAXONOMY[0].subs[0].name;
const DEFAULT_LEAF = TAXONOMY[0].subs[0].parts[0];
const DEFAULT_CATEGORY = buildCategoryPath(DEFAULT_MAIN, DEFAULT_SUB, DEFAULT_LEAF);

export default function AccountPage() {
  return (
    <Suspense fallback={<div className="min-h-[calc(100vh-64px)] flex items-center justify-center"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <AccountPageInner />
    </Suspense>
  );
}

function AccountPageInner() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { user, token, isLoggedIn, authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editIdParam = searchParams.get("edit");
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ title: "", description: "", price: "", category: DEFAULT_CATEGORY, type: "PRODUCT" as string, location: "", phone: "", condition: "NEW", brand: "", stock: "1", forVehicle: "", unit: "", unitValue: "", year: "", model: "", city: "", fuelType: "", paymentType: "" });
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn) { router.push("/"); return; }
    fetchListings();
  }, [isLoggedIn, authLoading]);

  const fetchListings = () => {
    setLoading(true);
    fetch(`${API}/me/listings`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setListings(d.listings || []))
      .catch(() => { toast(t('error'), 'error'); })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!editIdParam || listings.length === 0) return;
    const target = listings.find((l) => String(l.id) === editIdParam);
    if (target && editingId !== target.id) {
      handleEdit(target);
      const url = new URL(window.location.href);
      url.searchParams.delete("edit");
      window.history.replaceState({}, "", url.toString());
    }
  }, [editIdParam, listings]);

  const resetForm = () => {
    const defaultType = user?.type === "MECHANIC" ? "SERVICE" : "PRODUCT";
    setForm({ title: "", description: "", price: "", category: DEFAULT_CATEGORY, type: defaultType, location: "", phone: user?.phone || "", condition: "NEW", brand: "", stock: "1", forVehicle: "", unit: "", unitValue: "", year: "", model: "", city: "", fuelType: "", paymentType: "" });
    imagePreviews.forEach((url) => URL.revokeObjectURL(url));
    setImages([]);
    setImagePreviews([]);
    setExistingImages([]);
    setEditingId(null);
    setShowForm(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files || []);
    if (picked.length === 0) return;
    const totalAfter = images.length + existingImages.length + picked.length;
    if (totalAfter > MAX_IMAGES) {
      toast(`Maksimum ${MAX_IMAGES} şəkil əlavə edə bilərsiniz`, 'error');
      e.target.value = "";
      return;
    }
    const valid: File[] = [];
    for (const f of picked) {
      if (f.size > MAX_IMAGE_SIZE) {
        toast(`${f.name} 5 MB-dan böyükdür`, 'error');
        continue;
      }
      if (!/^image\/(jpeg|jpg|png|webp)$/i.test(f.type)) {
        toast(`${f.name} dəstəklənməyən formatdır (yalnız jpg, png, webp)`, 'error');
        continue;
      }
      valid.push(f);
    }
    if (valid.length === 0) { e.target.value = ""; return; }
    setImages((prev) => [...prev, ...valid]);
    setImagePreviews((prev) => [...prev, ...valid.map((f) => URL.createObjectURL(f))]);
    e.target.value = "";
  };

  const removeNewImage = (idx: number) => {
    URL.revokeObjectURL(imagePreviews[idx]);
    setImages((prev) => prev.filter((_, i) => i !== idx));
    setImagePreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  const removeExistingImage = (idx: number) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const canAddListing = !!user; // any logged-in user can post

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      images.forEach((file) => fd.append("images", file));
      if (editingId) {
        fd.append("existingImages", JSON.stringify(existingImages));
      }
      const url = editingId ? `${API}/me/listings/${editingId}` : `${API}/me/listings`;
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast(err.message || t('error'), 'error');
        return;
      }
      resetForm();
      fetchListings();
    } catch {
      toast(t('error'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (listing: any) => {
    setForm({
      title: listing.title, description: listing.description,
      price: String(listing.price), category: listing.category,
      type: listing.type, location: listing.location || "", phone: listing.phone || "",
      condition: listing.condition || "NEW", brand: listing.brand || "", stock: String(listing.stock || 1),
      forVehicle: listing.forVehicle || "", unit: listing.unit || "", unitValue: listing.unitValue ? String(listing.unitValue) : "",
      year: listing.year ? String(listing.year) : "",
      model: listing.model || "",
      city: listing.city || "",
      fuelType: listing.fuelType || "",
      paymentType: listing.paymentType || "",
    });
    imagePreviews.forEach((url) => URL.revokeObjectURL(url));
    setImages([]);
    setImagePreviews([]);
    setExistingImages(listing.images || []);
    setEditingId(listing.id);
    setShowForm(true);
    window.scrollTo(0, 0);
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t("confirmDeleteListing"))) return;
    await fetch(`${API}/me/listings/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    setListings(listings.filter((l) => l.id !== id));
  };

  if (authLoading || !isLoggedIn) return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const inputCls = "w-full px-4 py-3 bg-input-bg border border-input-border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/50 placeholder-muted-foreground text-foreground text-sm";

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">{t("myListings")}</h1>
          <p className="text-muted text-sm">{user?.name} - {user?.phone}</p>
        </div>
        {!showForm && canAddListing && (
          <button onClick={() => { resetForm(); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2.5 brand-gradient rounded-xl text-white text-sm font-semibold hover:brightness-110 transition-all shadow-md shadow-orange-500/25">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            {t("addListing")}
          </button>
        )}
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-card border border-card-border rounded-2xl p-5 sm:p-6 mb-6">
          <h2 className="font-semibold mb-4">{editingId ? t("editListing") : t("addListing")}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">{t("listingTitle")}</label>
                <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={t("listingTitle")} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">{t("listingPrice")}</label>
                <input required type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="0.00" className={inputCls} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">{t("listingDesc")}</label>
              <textarea required rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder={t("listingDesc")} className={inputCls + " resize-none"} />
            </div>
            {(() => {
              const { main, sub, leaf } = parseCategoryPath(form.category);
              const subs = getSubsFor(main);
              const parts = getPartsFor(main, sub);
              return (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Ana kateqoriya</label>
                    <select
                      value={main}
                      onChange={(e) => {
                        const newMain = e.target.value;
                        const newSubs = getSubsFor(newMain);
                        const newSub = newSubs[0]?.name || "";
                        const newLeaf = newSubs[0]?.parts[0] || "";
                        setForm({ ...form, category: buildCategoryPath(newMain, newSub, newLeaf) });
                      }}
                      className={inputCls}
                    >
                      {TAXONOMY.map((m) => <option key={m.name} value={m.name}>{m.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Alt kateqoriya</label>
                    <select
                      value={sub}
                      onChange={(e) => {
                        const newSub = e.target.value;
                        const newParts = getPartsFor(main, newSub);
                        const newLeaf = newParts[0] || "";
                        setForm({ ...form, category: buildCategoryPath(main, newSub, newLeaf) });
                      }}
                      className={inputCls}
                    >
                      {subs.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Hissə</label>
                    <select
                      value={leaf}
                      onChange={(e) => setForm({ ...form, category: buildCategoryPath(main, sub, e.target.value) })}
                      className={inputCls}
                    >
                      {parts.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>
              );
            })()}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">{t("listingType")}</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className={inputCls}
                >
                  <option value="PRODUCT">{t("product")}</option>
                  <option value="SERVICE">{t("service")}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">{t("listingLocation")}</label>
                <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder={t("listingLocation")} className={inputCls} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">{t("condition")}</label>
                <select value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })} className={inputCls}>
                  <option value="NEW">{t("conditionNew")}</option>
                  <option value="USED">{t("conditionUsed")}</option>
                  <option value="REFURBISHED">{t("conditionRefurbished")}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">{t("stock")}</label>
                <input type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} placeholder="1" className={inputCls} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">{t("brand")}</label>
                <input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} placeholder="BMW, Mercedes..." className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">{t("vehicleModel")}</label>
                <input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder={t("vehicleModelPlaceholder")} className={inputCls} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">{t("city")}</label>
              <select value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className={inputCls} required>
                <option value="">—</option>
                {AZ_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">{t("fuelType")}</label>
                <select value={form.fuelType} onChange={(e) => setForm({ ...form, fuelType: e.target.value })} className={inputCls}>
                  <option value="">—</option>
                  {FUEL_TYPES.map((f) => <option key={f.value} value={f.value}>{t(f.azKey)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">{t("paymentType")}</label>
                <select value={form.paymentType} onChange={(e) => setForm({ ...form, paymentType: e.target.value })} className={inputCls}>
                  <option value="">—</option>
                  {PAYMENT_TYPES.map((p) => <option key={p.value} value={p.value}>{t(p.azKey)}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">{t("forVehicle")}</label>
                <input value={form.forVehicle} onChange={(e) => setForm({ ...form, forVehicle: e.target.value })} placeholder={t("forVehiclePlaceholder")} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">{t("manufacturingYear")}</label>
                <input
                  type="number"
                  min="1900"
                  max={new Date().getFullYear() + 1}
                  value={form.year}
                  onChange={(e) => setForm({ ...form, year: e.target.value })}
                  placeholder={t("manufacturingYearPlaceholder")}
                  className={inputCls}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">{t("unit")}</label>
                <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className={inputCls}>
                  <option value="">{t("unitNone")}</option>
                  <option value="LITER">{t("unitLiter")}</option>
                  <option value="KG">{t("unitKg")}</option>
                  <option value="ML">{t("unitMl")}</option>
                  <option value="PIECE">{t("unitPiece")}</option>
                  <option value="METER">{t("unitMeter")}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">{t("unitValue")}</label>
                <input type="number" step="0.01" value={form.unitValue} onChange={(e) => setForm({ ...form, unitValue: e.target.value })} placeholder="5, 1, 0.5..." className={inputCls} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">{t("listingPhone")}</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+994..." className={inputCls} />
            </div>

            {/* Şəkillər */}
            {(() => {
              const totalCount = existingImages.length + images.length;
              return (
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Şəkillər <span className="text-muted text-xs">({totalCount}/{MAX_IMAGES} — maksimum 5 MB hər biri)</span>
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {existingImages.map((img, idx) => (
                      <div key={`exist-${idx}`} className="relative aspect-square bg-input-bg border border-input-border rounded-xl overflow-hidden group">
                        <img
                          src={img.startsWith('http') ? img : `${UPLOADS}/${img}`}
                          alt={`existing ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeExistingImage(idx)}
                          className="absolute top-1 right-1 w-6 h-6 bg-black/70 backdrop-blur-sm rounded-full text-white text-xs hover:bg-red-500 transition-colors flex items-center justify-center"
                          aria-label="Sil"
                        >
                          ✕
                        </button>
                        {idx === 0 && (
                          <span className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-orange-500/90 text-white text-[10px] font-semibold rounded">
                            Əsas
                          </span>
                        )}
                      </div>
                    ))}
                    {imagePreviews.map((url, idx) => (
                      <div key={`new-${idx}`} className="relative aspect-square bg-input-bg border border-input-border rounded-xl overflow-hidden group">
                        <img src={url} alt={`preview ${idx + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeNewImage(idx)}
                          className="absolute top-1 right-1 w-6 h-6 bg-black/70 backdrop-blur-sm rounded-full text-white text-xs hover:bg-red-500 transition-colors flex items-center justify-center"
                          aria-label="Sil"
                        >
                          ✕
                        </button>
                        {existingImages.length === 0 && idx === 0 && (
                          <span className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-orange-500/90 text-white text-[10px] font-semibold rounded">
                            Əsas
                          </span>
                        )}
                      </div>
                    ))}
                    {totalCount < MAX_IMAGES && (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="aspect-square border-2 border-dashed border-input-border rounded-xl flex flex-col items-center justify-center gap-1 text-muted hover:border-orange-500/60 hover:text-orange-500 hover:bg-orange-500/5 transition-all"
                      >
                        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                        </svg>
                        <span className="text-[11px] font-medium">Şəkil əlavə et</span>
                      </button>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    multiple
                    onChange={handleImagePick}
                    className="hidden"
                  />
                  <p className="text-xs text-muted mt-1.5">jpg, png, webp formatlarında, hər biri ən çox 5 MB</p>
                </div>
              );
            })()}

            <div className="flex gap-2">
              <button type="submit" disabled={submitting} className="px-6 py-2.5 brand-gradient rounded-xl text-white text-sm font-semibold hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                {submitting ? t("submitting") : t("saveListing")}
              </button>
              <button type="button" onClick={resetForm} disabled={submitting} className="px-6 py-2.5 bg-input-bg border border-input-border rounded-xl text-sm font-medium hover:opacity-80 transition-all disabled:opacity-50">
                {t("adminCancel")}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Listings Table */}
      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : listings.length === 0 ? (
        <div className="text-center py-16 bg-card border border-card-border rounded-2xl">
          <svg className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
          </svg>
          <p className="text-muted mb-2">{t("noListingsYet")}</p>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="text-orange-500 text-sm font-medium hover:text-orange-400 transition-colors">
            {t("createFirstListing")}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {listings.map((listing) => (
            <div key={listing.id} className="bg-card border border-card-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              {/* Image */}
              <div className="w-full sm:w-24 h-32 sm:h-24 shrink-0 bg-input-bg border border-input-border rounded-lg overflow-hidden flex items-center justify-center">
                {listing.images && listing.images.length > 0 ? (
                  <img
                    src={listing.images[0].startsWith('http') ? listing.images[0] : `${UPLOADS}/${listing.images[0]}`}
                    alt={listing.title}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <svg className="w-8 h-8 text-muted-foreground/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                  </svg>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${listing.type === 'SERVICE' ? 'bg-green-500/10 text-green-500' : 'bg-orange-500/10 text-orange-500'}`}>
                    {listing.type === 'SERVICE' ? t("service") : t("product")}
                  </span>
                  <span className="px-2 py-0.5 bg-input-bg border border-input-border rounded text-xs">{listing.category}</span>
                  {listing.year && (
                    <span className="px-2 py-0.5 bg-blue-500/10 text-blue-500 rounded text-xs">📅 {listing.year}</span>
                  )}
                  {listing.expiresAt && new Date(listing.expiresAt) <= new Date() && (
                    <span className="px-2 py-0.5 bg-red-500/10 text-red-500 rounded text-xs">{t("expiredBadge")}</span>
                  )}
                </div>
                <h3 className="font-medium truncate">{listing.title}</h3>
                <p className="text-muted text-xs truncate">{listing.description}</p>
              </div>

              {/* Price */}
              <div className="text-orange-500 font-bold text-lg shrink-0">{listing.price} AZN</div>

              {/* Actions */}
              <div className="flex gap-2 shrink-0">
                <button onClick={() => handleEdit(listing)}
                  className="flex items-center gap-1 px-3 py-2 bg-orange-500/10 text-orange-500 rounded-lg text-xs font-medium hover:bg-orange-500/20 transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  {t("adminEdit")}
                </button>
                <button onClick={() => handleDelete(listing.id)}
                  className="flex items-center gap-1 px-3 py-2 bg-red-500/10 text-red-500 rounded-lg text-xs font-medium hover:bg-red-500/20 transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  {t("adminDelete")}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
