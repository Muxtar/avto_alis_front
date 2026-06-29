"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLanguage } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/Toast";
import { API, UPLOADS } from "@/lib/api";
import { CATEGORIES, getSubs, buildCat, parseCat, isServiceCat, getListingFields, getCategoryAttrs, getCat } from "@/lib/categories";
import { AZ_CITIES, FUEL_TYPES, PAYMENT_TYPES } from "@/lib/cities";
import { MANUFACTURING_COUNTRIES } from "@/lib/countries";

const MAX_IMAGES = 5;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const DEFAULT_MAIN = CATEGORIES[0].name;
const DEFAULT_CATEGORY = buildCat(DEFAULT_MAIN, CATEGORIES[0].subs[0].name);
const SERVICE_CATEGORY = buildCat("Xidmətlər", getSubs("Xidmətlər")[0] || "");
const KASSA_RELEASE = "https://github.com/Muxtar/kassa_sql/releases/download/kassa-v0.1.0";

export default function AccountPage() {
  return (
    <Suspense fallback={<div className="min-h-[calc(100vh-64px)] flex items-center justify-center"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <AccountPageInner />
    </Suspense>
  );
}

function AccountPageInner() {
  const { t, locale } = useLanguage();
  const { toast } = useToast();
  const { user, token, isLoggedIn, authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editIdParam = searchParams.get("edit");
  const newParam = searchParams.get("new");
  const modeParam = searchParams.get("mode"); // voen | novoen (menyudan)
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [listingMode, setListingMode] = useState<"" | "voen" | "novoen">(""); // VÖEN ilə / VÖEN-siz
  const [listingKind, setListingKind] = useState<"" | "product" | "service" | "product-form">(""); // Məhsul / Xidmət sihirbazı
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ title: "", description: "", price: "", category: DEFAULT_CATEGORY, type: "PRODUCT" as string, location: "", phone: "", condition: "NEW", brand: "", country: "", stock: "1", forVehicle: "", unit: "", unitValue: "", year: "", model: "", city: "", fuelType: "", paymentType: "" });
  const [barter, setBarter] = useState(false);   // dəyiş-düş qəbul olunur
  const [forRent, setForRent] = useState(false); // satış yox, icarə/kirayə
  const [deliveryMethod, setDeliveryMethod] = useState<"COURIER" | "SELF">("COURIER"); // VÖEN elanda çatdırılma: kuryer (Yango) / satıcı özü
  const [bookable, setBookable] = useState(false); // bron/rezervasiya açıq
  const [bookingType, setBookingType] = useState<"RESERVATION" | "STAY">("RESERVATION");
  const [maxGuests, setMaxGuests] = useState("");
  const [openTime, setOpenTime] = useState("");
  const [closeTime, setCloseTime] = useState("");
  const [attrs, setAttrs] = useState<Record<string, string>>({}); // kateqoriyaya xüsusi sahələr
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // User's saved default location — auto-fills city/location in new listings.
  const [myLocation, setMyLocation] = useState<{ city: string; address: string }>({ city: "", address: "" });
  // Təsdiqlənmiş biznes obyektləri — elan kartla satıla bilsin deyə seçilir.
  const [bizObjects, setBizObjects] = useState<{ id: number; label: string }[]>([]);
  const [selectedObjectId, setSelectedObjectId] = useState<string>("");

  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn) { router.push("/"); return; }
    fetchListings();
    fetch(`${API}/me/businesses`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        const opts: { id: number; label: string }[] = [];
        (d.businesses || []).filter((b: any) => b.status === "APPROVED").forEach((b: any) => {
          (b.objects || []).forEach((o: any) => opts.push({ id: o.id, label: `${b.name} — ${o.name}` }));
        });
        setBizObjects(opts);
      })
      .catch(() => undefined);
    fetch(`${API}/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        if (d.user) {
          setMyLocation({ city: d.user.city || "", address: d.user.address || "" });
        }
      })
      .catch(() => undefined);
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

  // Auto-open the form when arriving with ?new=1 (e.g. from the mobile
  // bottom-nav "+" — there's no inline header button on mobile).
  useEffect(() => {
    if (newParam === "1" && !showForm && !authLoading && isLoggedIn) {
      resetForm();
      setShowForm(true);
      // Menyudan VÖEN/VÖEN-siz seçilibsə birbaşa o rejimə keç (seçim ekranını ötür).
      if (modeParam === "voen" || modeParam === "novoen") setListingMode(modeParam);
      const url = new URL(window.location.href);
      url.searchParams.delete("new");
      url.searchParams.delete("mode");
      window.history.replaceState({}, "", url.toString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newParam, authLoading, isLoggedIn]);

  const resetForm = () => {
    const defaultType = user?.type === "MECHANIC" ? "SERVICE" : "PRODUCT";
    setForm({ title: "", description: "", price: "", category: DEFAULT_CATEGORY, type: defaultType, location: myLocation.address, phone: user?.phone || "", condition: "NEW", brand: "", country: "", stock: "1", forVehicle: "", unit: "", unitValue: "", year: "", model: "", city: myLocation.city, fuelType: "", paymentType: "" });
    setBarter(false); setForRent(false);
    setBookable(false); setBookingType("RESERVATION"); setMaxGuests(""); setOpenTime(""); setCloseTime("");
    setDeliveryMethod("COURIER");
    setAttrs({});
    imagePreviews.forEach((url) => URL.revokeObjectURL(url));
    setImages([]);
    setImagePreviews([]);
    setExistingImages([]);
    setEditingId(null);
    setShowForm(false);
    setListingMode("");
    setListingKind("");
    setSelectedObjectId("");
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
    // VÖEN-li elan üçün biznes obyekti mütləqdir (kartla satış obyekt üzərindən).
    if (listingMode === "voen" && !selectedObjectId) {
      toast("VÖEN-li elan üçün biznes obyekti seçin", "error");
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      // Kateqoriyaya xüsusi sahələr (yalnız bu kateqoriyaya aid, boş olmayanlar).
      const validKeys = getCategoryAttrs(parseCat(form.category).main).map((a) => a.key);
      const cleanAttrs = Object.fromEntries(Object.entries(attrs).filter(([k, v]) => validKeys.includes(k) && String(v).trim() !== ""));
      fd.append("attributes", JSON.stringify(cleanAttrs));
      fd.append("barter", String(barter));
      fd.append("forRent", String(forRent));
      fd.append("bookable", String(bookable));
      if (bookable) {
        fd.append("bookingType", bookingType);
        if (maxGuests) fd.append("maxGuests", maxGuests);
        if (bookingType === "RESERVATION") {
          if (openTime) fd.append("openTime", openTime);
          if (closeTime) fd.append("closeTime", closeTime);
        }
      }
      fd.append("listingMode", listingMode || "novoen");
      if (listingMode === "voen") fd.append("deliveryMethod", deliveryMethod);
      if (selectedObjectId) fd.append("businessObjectId", selectedObjectId);
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
      condition: listing.condition || "NEW", brand: listing.brand || "",
      country: listing.country || "",
      stock: String(listing.stock || 1),
      forVehicle: listing.forVehicle || "", unit: listing.unit || "", unitValue: listing.unitValue ? String(listing.unitValue) : "",
      year: listing.year ? String(listing.year) : "",
      model: listing.model || "",
      city: listing.city || "",
      fuelType: listing.fuelType || "",
      paymentType: listing.paymentType || "",
    });
    setBarter(!!listing.barter); setForRent(!!listing.forRent);
    setBookable(!!listing.bookable);
    setBookingType(listing.bookingType === "STAY" ? "STAY" : "RESERVATION");
    setMaxGuests(listing.maxGuests != null ? String(listing.maxGuests) : "");
    setOpenTime(listing.openTime || ""); setCloseTime(listing.closeTime || "");
    // Kateqoriyaya xüsusi sahələri yüklə (string-ə çevir).
    const la = listing.attributes && typeof listing.attributes === "object" ? listing.attributes : {};
    setAttrs(Object.fromEntries(Object.entries(la).map(([k, v]) => [k, String(v ?? "")])));
    imagePreviews.forEach((url) => URL.revokeObjectURL(url));
    setImages([]);
    setImagePreviews([]);
    setExistingImages(listing.images || []);
    // Redaktədə rejimi mövcud elana görə təyin et (biznes obyekti varsa VÖEN-li).
    setListingMode(listing.businessId ? "voen" : "novoen");
    setDeliveryMethod(listing.deliveryMethod === "SELF" ? "SELF" : "COURIER");
    setListingKind(listing.type === "SERVICE" ? "service" : "product-form");
    setSelectedObjectId(listing.businessObjectId ? String(listing.businessObjectId) : "");
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

  // Seçilmiş kateqoriyaya uyğun göstəriləcək sahələr (xidmətdə heç biri).
  const catFields = form.type === "SERVICE" ? [] : getListingFields(parseCat(form.category).main);
  const showField = (f: string) => catFields.includes(f as any);

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
            className="hidden md:flex items-center gap-2 px-4 py-2.5 brand-gradient rounded-xl text-white text-sm font-semibold hover:brightness-110 transition-all shadow-md shadow-orange-500/25">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            {t("addListing")}
          </button>
        )}
      </div>

      {(() => {
        const cardCls = "text-left p-4 rounded-2xl border border-input-border hover:border-orange-500/60 hover:bg-orange-500/5 transition-all";
        // Addım 1 — VÖEN / VÖEN-siz
        if (showForm && !listingMode && !editingId) return (
          <div className="surface p-5 sm:p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">VÖEN ilə, yoxsa VÖEN-siz?</h2>
              <button type="button" onClick={resetForm} className="text-sm text-muted hover:text-foreground">{t("adminCancel") || "Bağla"}</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button type="button" onClick={() => setListingMode("voen")} className={cardCls}>
                <div className="text-2xl mb-2">🏢</div>
                <p className="font-semibold text-sm">VÖEN ilə (biznes)</p>
                <p className="text-xs text-muted mt-1">Kartla ödəniş, saytdan sifariş. Biznes və ona bağlı obyekt tələb olunur.</p>
              </button>
              <button type="button" onClick={() => setListingMode("novoen")} className={cardCls}>
                <div className="text-2xl mb-2">👤</div>
                <p className="font-semibold text-sm">VÖEN-siz (fərdi)</p>
                <p className="text-xs text-muted mt-1">Sayt üzərindən ödəniş yox — alıcı ilə birbaşa əlaqə.</p>
              </button>
            </div>
          </div>
        );
        // Addım 1.5 — VÖEN üçün biznes + obyekt seçimi (Məhsul/Xidmətdən əvvəl)
        if (showForm && listingMode === "voen" && !selectedObjectId && !editingId) return (
          <div className="surface p-5 sm:p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Hansı biznes və obyekt?</h2>
              <button type="button" onClick={() => setListingMode("")} className="text-sm text-muted hover:text-foreground">← Geri</button>
            </div>
            {bizObjects.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs text-muted mb-2">Elan bu obyekt üzərindən satılacaq və kartla alına biləcək.</p>
                {bizObjects.map((o) => (
                  <button key={o.id} type="button" onClick={() => setSelectedObjectId(String(o.id))} className="w-full text-left p-4 rounded-2xl border border-input-border hover:border-orange-500/60 hover:bg-orange-500/5 transition-all flex items-center gap-3">
                    <div className="text-xl">🏢</div>
                    <p className="font-semibold text-sm">{o.label}</p>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                <p className="font-semibold text-sm">Təsdiqlənmiş biznes obyektiniz yoxdur</p>
                <p className="text-xs text-muted mt-0.5">VÖEN-li elan üçün əvvəlcə biznes əlavə edin, ona obyekt bağlayın və admin təsdiqini gözləyin.</p>
                <a href="/business" className="inline-block mt-2 text-sm text-orange-500 font-semibold hover:text-orange-400">Biznes əlavə et →</a>
              </div>
            )}
          </div>
        );
        // Addım 2 — Məhsul / Xidmət
        if (showForm && listingMode && !listingKind && !editingId) return (
          <div className="surface p-5 sm:p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Məhsul, yoxsa xidmət?</h2>
              <button type="button" onClick={() => { if (listingMode === "voen") setSelectedObjectId(""); else setListingMode(""); }} className="text-sm text-muted hover:text-foreground">← Geri</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button type="button" onClick={() => { setListingKind("product"); setForm((f) => ({ ...f, type: "PRODUCT", category: DEFAULT_CATEGORY })); }} className={cardCls}>
                <div className="text-2xl mb-2">📦</div>
                <p className="font-semibold text-sm">Məhsul</p>
                <p className="text-xs text-muted mt-1">Tək elan, Excel və ya Kassa SQL ilə.</p>
              </button>
              <button type="button" onClick={() => { setListingKind("service"); setForm((f) => ({ ...f, type: "SERVICE", category: SERVICE_CATEGORY })); }} className={cardCls}>
                <div className="text-2xl mb-2">🛠️</div>
                <p className="font-semibold text-sm">Xidmət</p>
                <p className="text-xs text-muted mt-1">Birbaşa elan formasına keçir.</p>
              </button>
            </div>
          </div>
        );
        // Addım 3 — Məhsul üçün: Tək elan / Excel / Kassa SQL
        if (showForm && listingMode && listingKind === "product" && !editingId) return (
          <div className="surface p-5 sm:p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Məhsulu necə əlavə edəcəksiniz?</h2>
              <button type="button" onClick={() => setListingKind("")} className="text-sm text-muted hover:text-foreground">← Geri</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button type="button" onClick={() => setListingKind("product-form")} className={cardCls}>
                <div className="text-2xl mb-2">📝</div>
                <p className="font-semibold text-sm">Tək elan (form)</p>
                <p className="text-xs text-muted mt-1">Bir məhsul əlavə et.</p>
              </button>
              <button type="button" onClick={() => router.push(`/account/import?mode=${listingMode}${selectedObjectId ? `&obj=${selectedObjectId}` : ""}`)} className={cardCls}>
                <div className="text-2xl mb-2">📊</div>
                <p className="font-semibold text-sm">Excel ilə əlavə et</p>
                <p className="text-xs text-muted mt-1">Toplu elan yüklə.</p>
              </button>
              <div className="p-4 rounded-2xl border border-input-border">
                <div className="text-2xl mb-2">🖥️</div>
                <p className="font-semibold text-sm">Kassa SQL ilə yüklə</p>
                <div className="flex flex-col gap-1.5 mt-2 text-xs">
                  <a href={`${KASSA_RELEASE}/AvtoBazar-Kassa-0.1.0-mac.dmg`} className="text-orange-500 hover:underline"> macOS (.dmg)</a>
                  <a href={`${KASSA_RELEASE}/AvtoBazar-Kassa-0.1.0-win.exe`} className="text-orange-500 hover:underline">🪟 Windows (.exe)</a>
                  <a href={`${KASSA_RELEASE}/AvtoBazar-Kassa-0.1.0-linux.AppImage`} className="text-orange-500 hover:underline">🐧 Linux (.AppImage)</a>
                </div>
              </div>
            </div>
          </div>
        );
        return null;
      })()}

      {/* Add/Edit Form */}
      {showForm && (editingId || listingKind === "service" || listingKind === "product-form") && (
        <div className="surface p-5 sm:p-6 mb-6">
          <h2 className="font-semibold mb-4">{editingId ? t("editListing") : (listingMode === "voen" ? "Yeni elan — VÖEN ilə" : "Yeni elan — VÖEN-siz")}</h2>
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
              const { main, sub } = parseCat(form.category);
              const subs = getSubs(main);
              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">{t("mainCategory") || "Ana kateqoriya"}</label>
                    <select
                      value={main}
                      onChange={(e) => {
                        const newMain = e.target.value;
                        const newSub = getSubs(newMain)[0] || "";
                        // Xidmət kateqoriyası → SERVICE; digər kateqoriyalar → PRODUCT
                        // (xidmətdən məhsula keçəndə tip düzgün sıfırlansın).
                        const nextType = isServiceCat(newMain) ? "SERVICE" : "PRODUCT";
                        setForm({ ...form, category: buildCat(newMain, newSub), type: nextType });
                        setAttrs({}); // yeni kateqoriya → atributları sıfırla
                      }}
                      className={inputCls}
                    >
                      {CATEGORIES.map((m) => <option key={m.name} value={m.name}>{m.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">{t("subCategory") || "Alt kateqoriya"}</label>
                    <select
                      value={sub}
                      onChange={(e) => setForm({ ...form, category: buildCat(main, e.target.value) })}
                      className={inputCls}
                    >
                      {subs.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              );
            })()}
            {/* Kateqoriyaya xüsusi sahələr (tap.az üslubu) */}
            {(() => {
              const catAttrs = form.type === "SERVICE" ? [] : getCategoryAttrs(parseCat(form.category).main);
              if (!catAttrs.length) return null;
              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {catAttrs.map((a) => (
                    <div key={a.key}>
                      <label className="block text-sm font-medium mb-1.5">{a.label}{a.suffix ? ` (${a.suffix})` : ""}</label>
                      {a.type === "select" ? (
                        <select value={attrs[a.key] || ""} onChange={(e) => setAttrs({ ...attrs, [a.key]: e.target.value })} className={inputCls}>
                          <option value="">—</option>
                          {a.options!.map((o) => <option key={o} value={o}>{o}</option>)}
                        </select>
                      ) : (
                        <input type={a.type === "number" ? "number" : "text"} value={attrs[a.key] || ""} onChange={(e) => setAttrs({ ...attrs, [a.key]: e.target.value })} placeholder={a.label} className={inputCls} />
                      )}
                    </div>
                  ))}
                </div>
              );
            })()}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {!isServiceCat(parseCat(form.category).main) && (
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
              )}
              <div>
                <label className="block text-sm font-medium mb-1.5">{t("listingLocation")}</label>
                <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder={t("listingLocation")} className={inputCls} />
                {myLocation.address && form.location === myLocation.address && (
                  <p className="text-[11px] text-muted mt-1">{t('locationFromProfile')}</p>
                )}
              </div>
            </div>
            {(showField("condition") || showField("stock")) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {showField("condition") && (
              <div>
                <label className="block text-sm font-medium mb-1.5">{t("condition")}</label>
                <select value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })} className={inputCls}>
                  <option value="NEW">{t("conditionNew")}</option>
                  <option value="USED">{t("conditionUsed")}</option>
                  <option value="REFURBISHED">{t("conditionRefurbished")}</option>
                </select>
              </div>
              )}
              {showField("stock") && (
              <div>
                <label className="block text-sm font-medium mb-1.5">{t("stock")}</label>
                <input type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} placeholder="1" className={inputCls} />
              </div>
              )}
            </div>
            )}
            {(showField("brand") || showField("country")) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {showField("brand") && (
              <div>
                <label className="block text-sm font-medium mb-1.5">{t("brand")}</label>
                <input
                  value={form.brand}
                  onChange={(e) => setForm({ ...form, brand: e.target.value })}
                  placeholder={t("brandPlaceholderGeneral") || "Məs: Apple, Samsung, Bosch, Nike"}
                  className={inputCls}
                />
              </div>
              )}
              {showField("country") && (
              <div>
                <label className="block text-sm font-medium mb-1.5">{t("countryOfOrigin")}</label>
                <select
                  value={form.country}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                  className={inputCls}
                >
                  <option value="">—</option>
                  {MANUFACTURING_COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {locale === "ru" ? c.ru : locale === "en" ? c.en : c.az}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-muted mt-1">{t("countryOfOriginHint")}</p>
              </div>
              )}
            </div>
            )}
            {showField("model") && (
              <div>
                <label className="block text-sm font-medium mb-1.5">{t("vehicleModel")}</label>
                <input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder={t("vehicleModelPlaceholder")} className={inputCls} />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1.5">{t("city")}</label>
              <select value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className={inputCls} required>
                <option value="">—</option>
                {AZ_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {(showField("fuel") || form.type !== "SERVICE") && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {showField("fuel") && (
                <div>
                  <label className="block text-sm font-medium mb-1.5">{t("fuelType")}</label>
                  <select value={form.fuelType} onChange={(e) => setForm({ ...form, fuelType: e.target.value })} className={inputCls}>
                    <option value="">—</option>
                    {FUEL_TYPES.map((f) => <option key={f.value} value={f.value}>{t(f.azKey)}</option>)}
                  </select>
                </div>
              )}
              {form.type !== "SERVICE" && (
              <div>
                <label className="block text-sm font-medium mb-1.5">{t("paymentType")}</label>
                <select value={form.paymentType} onChange={(e) => setForm({ ...form, paymentType: e.target.value })} className={inputCls}>
                  <option value="">—</option>
                  {PAYMENT_TYPES.map((p) => <option key={p.value} value={p.value}>{t(p.azKey)}</option>)}
                </select>
              </div>
              )}
            </div>
            )}

            {/* Çatdırılma metodu — yalnız VÖEN (obyektə bağlı) elanlarda */}
            {listingMode === "voen" && form.type !== "SERVICE" && (
              <div>
                <label className="block text-sm font-medium mb-1.5">Çatdırılma metodu</label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setDeliveryMethod("COURIER")}
                    className={`px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${deliveryMethod === "COURIER" ? "border-orange-500 bg-orange-500/10 text-orange-500" : "border-input-border bg-input-bg text-foreground"}`}>
                    🛵 Kuryer (Yango)<span className="block text-[10px] text-muted font-normal">kuryer çatdırır</span>
                  </button>
                  <button type="button" onClick={() => setDeliveryMethod("SELF")}
                    className={`px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${deliveryMethod === "SELF" ? "border-orange-500 bg-orange-500/10 text-orange-500" : "border-input-border bg-input-bg text-foreground"}`}>
                    🚗 Özüm çatdırıram<span className="block text-[10px] text-muted font-normal">satıcı özü çatdırır</span>
                  </button>
                </div>
                <p className="text-[11px] text-muted mt-1.5">Alıcı həmçinin məhsulu obyektdən özü götürə bilər (checkout-da seçim olur).</p>
              </div>
            )}

            {/* Barter + İcarə seçimləri */}
            {form.type !== "SERVICE" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all ${barter ? "border-orange-500/50 bg-orange-500/5" : "border-input-border bg-input-bg hover:border-orange-500/30"}`}>
                <input type="checkbox" checked={barter} onChange={(e) => setBarter(e.target.checked)} className="w-4 h-4 accent-orange-500" />
                <span>
                  <span className="block text-sm font-medium">🔄 Barter (dəyiş-düş)</span>
                  <span className="block text-[11px] text-muted">Pula yox, dəyişməyə də razıyam</span>
                </span>
              </label>
              <label className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all ${forRent ? "border-orange-500/50 bg-orange-500/5" : "border-input-border bg-input-bg hover:border-orange-500/30"}`}>
                <input type="checkbox" checked={forRent} onChange={(e) => setForRent(e.target.checked)} className="w-4 h-4 accent-orange-500" />
                <span>
                  <span className="block text-sm font-medium">🔑 İcarəyə verilir</span>
                  <span className="block text-[11px] text-muted">Satış yox — kirayə/icarə</span>
                </span>
              </label>
            </div>
            )}

            {/* Bron / rezervasiya seçimi — restoran, otel, məkan və s. */}
            <div>
              <label className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all ${bookable ? "border-orange-500/50 bg-orange-500/5" : "border-input-border bg-input-bg hover:border-orange-500/30"}`}>
                <input type="checkbox" checked={bookable} onChange={(e) => setBookable(e.target.checked)} className="w-4 h-4 accent-orange-500" />
                <span>
                  <span className="block text-sm font-medium">📅 Bron edilə bilən</span>
                  <span className="block text-[11px] text-muted">Restoran, otel, bağ evi, məkan və s. — müştərilər tarix seçib bron edə bilsin</span>
                </span>
              </label>
              {getCat(parseCat(form.category).main)?.bookable && !bookable && (
                <p className="text-[11px] text-orange-500 mt-1.5 pl-1">💡 Bu kateqoriya bron üçün uyğundur — bron seçimini aktiv edin.</p>
              )}

              {bookable && (
                <div className="mt-3 p-4 rounded-xl border border-input-border bg-input-bg/50 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1.5">Bron tipi</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => setBookingType("RESERVATION")}
                        className={`px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${bookingType === "RESERVATION" ? "border-orange-500 bg-orange-500/10 text-orange-500" : "border-input-border bg-input-bg text-foreground"}`}>
                        🍽️ Rezervasiya<span className="block text-[10px] text-muted font-normal">tarix + saat (restoran/məkan)</span>
                      </button>
                      <button type="button" onClick={() => setBookingType("STAY")}
                        className={`px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${bookingType === "STAY" ? "border-orange-500 bg-orange-500/10 text-orange-500" : "border-input-border bg-input-bg text-foreground"}`}>
                        🏨 Gecələmə<span className="block text-[10px] text-muted font-normal">giriş–çıxış (otel/bağ evi)</span>
                      </button>
                    </div>
                    {bookingType === "STAY" && <p className="text-[11px] text-muted mt-1.5">Qiymət bir gecə üçün nəzərdə tutulur.</p>}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-muted mb-1.5">Maks. qonaq sayı</label>
                      <input type="number" min={1} value={maxGuests} onChange={(e) => setMaxGuests(e.target.value)} placeholder="məs. 4" className={inputCls} />
                    </div>
                    {bookingType === "RESERVATION" && (
                      <>
                        <div>
                          <label className="block text-xs font-medium text-muted mb-1.5">Açılış saatı</label>
                          <input type="time" value={openTime} onChange={(e) => setOpenTime(e.target.value)} className={inputCls} />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-muted mb-1.5">Bağlanış saatı</label>
                          <input type="time" value={closeTime} onChange={(e) => setCloseTime(e.target.value)} className={inputCls} />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {(showField("forVehicle") || showField("year")) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {showField("forVehicle") && (
              <div>
                <label className="block text-sm font-medium mb-1.5">{t("forVehicle")}</label>
                <input value={form.forVehicle} onChange={(e) => setForm({ ...form, forVehicle: e.target.value })} placeholder={t("forVehiclePlaceholder")} className={inputCls} />
              </div>
              )}
              {showField("year") && (
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
              )}
            </div>
            )}
            {showField("unit") && (
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
            )}
            <div>
              <label className="block text-sm font-medium mb-1.5">{t("listingPhone")}</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+994..." className={inputCls} />
            </div>

            {/* Biznes obyekti — VÖEN-li elanda (kartla satış obyekt üzərindən) */}
            {listingMode === "voen" && (
              editingId ? (
                // Redaktədə obyekti dəyişmək mümkün olsun.
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Biznes obyekti <span className="text-orange-500">*</span>
                  </label>
                  <select value={selectedObjectId} onChange={(e) => setSelectedObjectId(e.target.value)} className={inputCls} required>
                    <option value="">— Obyekt seçin —</option>
                    {bizObjects.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                  </select>
                  <p className="text-[11px] text-muted mt-1">Məhsul bu obyekt üzərindən satılacaq və kartla alına biləcək.</p>
                </div>
              ) : (
                // Yaratmada obyekt əvvəlki addımda seçilib — təsdiq olaraq göstər.
                <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-xl flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] text-muted">Biznes obyekti</p>
                    <p className="font-semibold text-sm truncate">{bizObjects.find((o) => String(o.id) === selectedObjectId)?.label || "—"}</p>
                  </div>
                  <button type="button" onClick={() => { setSelectedObjectId(""); setListingKind(""); }} className="text-xs text-orange-500 font-semibold shrink-0 hover:text-orange-400">Dəyiş</button>
                </div>
              )
            )}

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
        <div className="text-center py-16 surface">
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
            <div key={listing.id} className="surface p-4 flex flex-col sm:flex-row sm:items-center gap-3">
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
