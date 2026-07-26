"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLanguage } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/Toast";
import { API, imgUrl } from "@/lib/api";
import { CATEGORIES, getSubs, buildCat, parseCat, isServiceCat, getListingFields, getCategoryAttrs, getCat } from "@/lib/categories";
import { AZ_CITIES, FUEL_TYPES, PAYMENT_TYPES } from "@/lib/cities";
import { MANUFACTURING_COUNTRIES } from "@/lib/countries";
import LocationPicker from "@/components/LocationPickerWrapper";
import QRShare from "@/components/QRShare";

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
  const [allowSelfDelivery, setAllowSelfDelivery] = useState(false); // satıcı özü də çatdıra bilər (Yango + götürmə həmişə var)
  const [selfDeliveryNote, setSelfDeliveryNote] = useState(""); // satıcı çatdırma qeydi/qiyməti
  const [pickupOnly, setPickupOnly] = useState(false); // yalnız alıcı gəlib götürsün (Yango + satıcı çatdırması bağlı)
  // Elana özəl konum (VÖEN-siz elanlar üçün — hər elanın öz xəritə nöqtəsi ola bilər).
  const [listingLat, setListingLat] = useState<number | null>(null);
  const [listingLng, setListingLng] = useState<number | null>(null);
  const [weightKg, setWeightKg] = useState(""); // məhsulun çəkisi (kq) — Yango 50 kq limiti üçün
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
  const cameraInputRef = useRef<HTMLInputElement>(null); // kamera ilə anında çəkmək üçün
  // User's saved default location — auto-fills city/location in new listings.
  const [myLocation, setMyLocation] = useState<{ city: string; address: string }>({ city: "", address: "" });
  // Təsdiqlənmiş biznes obyektləri — elan kartla satıla bilsin deyə seçilir.
  const [bizObjects, setBizObjects] = useState<{ id: number; label: string }[]>([]);
  // Təsdiqlənmiş, amma hələ obyekti olmayan bizneslər — "obyekt əlavə et" yönləndirməsi üçün.
  const [approvedBizNoObj, setApprovedBizNoObj] = useState<{ id: number; name: string }[]>([]);
  // Təsdiqlənmiş + obyekti olan bizneslər (biznes → obyekt iki addımlı seçim üçün).
  const [bizList, setBizList] = useState<{ id: number; name: string; objects: { id: number; name: string }[] }[]>([]);
  const [bizLoading, setBizLoading] = useState(true); // /me/businesses yüklənənə qədər (görünüm sabit olsun)
  const [selectedBizId, setSelectedBizId] = useState<number | null>(null);
  const [selectedObjectId, setSelectedObjectId] = useState<string>("");
  // ?new=1 sorğusunun təkrar emalının qarşısını alır (bax: aşağıdakı effekt).
  const handledNewRef = useRef<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn) { router.push("/"); return; }
    fetchListings();
    fetch(`${API}/me/businesses`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        const opts: { id: number; label: string }[] = [];
        const noObj: { id: number; name: string }[] = [];
        const list: { id: number; name: string; objects: { id: number; name: string }[] }[] = [];
        (d.businesses || []).filter((b: any) => b.status === "APPROVED").forEach((b: any) => {
          const objs = (b.objects || []).map((o: any) => ({ id: o.id, name: o.name }));
          if (objs.length === 0) noObj.push({ id: b.id, name: b.name });
          else list.push({ id: b.id, name: b.name, objects: objs });
          objs.forEach((o: any) => opts.push({ id: o.id, label: `${b.name} — ${o.name}` }));
        });
        setBizObjects(opts);
        setApprovedBizNoObj(noObj);
        setBizList(list);
      })
      .catch(() => undefined)
      .finally(() => setBizLoading(false));
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
    if (newParam !== "1" || authLoading || !isLoggedIn) return;
    // Eyni sorğunu iki dəfə emal etməyək (replaceState searchParams-ı
    // yeniləmədiyi üçün effekt təkrar işləyə bilər).
    const token = `${newParam}:${modeParam || ""}`;
    if (handledNewRef.current === token) return;
    handledNewRef.current = token;

    // ƏVVƏL "!showForm" şərti vardı: forma artıq açıqsa menyudan başqa
    // rejim seçmək (VÖEN → VÖEN-siz) işləmirdi, istifadəçi ana səhifəyə
    // qayıtmalı olurdu. İndi rejim dəyişikliyi həmişə tətbiq olunur.
    resetForm();
    setShowForm(true);
    // Menyudan VÖEN/VÖEN-siz seçilibsə birbaşa o rejimə keç (seçim ekranını ötür).
    if (modeParam === "voen" || modeParam === "novoen") setListingMode(modeParam);
    const url = new URL(window.location.href);
    url.searchParams.delete("new");
    url.searchParams.delete("mode");
    window.history.replaceState({}, "", url.toString());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newParam, modeParam, authLoading, isLoggedIn]);

  const resetForm = () => {
    const defaultType = user?.type === "MECHANIC" ? "SERVICE" : "PRODUCT";
    setForm({ title: "", description: "", price: "", category: DEFAULT_CATEGORY, type: defaultType, location: myLocation.address, phone: user?.phone || "", condition: "NEW", brand: "", country: "", stock: "1", forVehicle: "", unit: "", unitValue: "", year: "", model: "", city: myLocation.city, fuelType: "", paymentType: "" });
    setBarter(false); setForRent(false);
    setBookable(false); setBookingType("RESERVATION"); setMaxGuests(""); setOpenTime(""); setCloseTime("");
    setAllowSelfDelivery(false); setWeightKg("");
    setPickupOnly(false); setListingLat(null); setListingLng(null);
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
      if (listingMode === "voen") { fd.append("pickupOnly", String(pickupOnly)); fd.append("allowSelfDelivery", String(!pickupOnly && allowSelfDelivery)); if (!pickupOnly && allowSelfDelivery) fd.append("selfDeliveryNote", selfDeliveryNote); }
      if (weightKg) fd.append("weightKg", weightKg);
      // Biznes obyekti YALNIZ VÖEN-li elanda göndərilir — VÖEN-siz (fərdi) elan biznesə bağlanmır.
      if (listingMode === "voen" && selectedObjectId) fd.append("businessObjectId", selectedObjectId);
      // VÖEN-siz elanlarda elana özəl konum göndərilir (seçilibsə). VÖEN elanlarda konum obyektdən gəlir.
      if (listingMode !== "voen") {
        fd.append("latitude", listingLat != null ? String(listingLat) : "");
        fd.append("longitude", listingLng != null ? String(listingLng) : "");
      }
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
      // Yeni elan admin təsdiqini gözləyir — istifadəçi bunu bilməlidir.
      if (!editingId) toast("Elan göndərildi. Admin təsdiqindən sonra saytda görünəcək (gözləmədə).", "success");
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
    setAllowSelfDelivery(!!listing.allowSelfDelivery);
    setSelfDeliveryNote(listing.selfDeliveryNote || "");
    setPickupOnly(!!listing.pickupOnly);
    setListingLat(listing.latitude != null ? Number(listing.latitude) : null);
    setListingLng(listing.longitude != null ? Number(listing.longitude) : null);
    setWeightKg(listing.weightKg != null ? String(listing.weightKg) : "");
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

  // Vaxtı bitmiş (və ya bitməyə yaxın) elanı yenilə — müddəti +20 gün uzadır.
  const [renewingId, setRenewingId] = useState<number | null>(null);
  const handleRenew = async (id: number) => {
    setRenewingId(id);
    try {
      const res = await fetch(`${API}/me/listings/${id}/reactivate`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok && data.success) {
        setListings(listings.map((l) => (l.id === id ? { ...l, expiresAt: data.listing.expiresAt } : l)));
        toast("Elan yeniləndi — 20 gün daha aktivdir ✓", "success");
      } else toast(data.message || t("error"), "error");
    } catch { toast(t("error"), "error"); } finally { setRenewingId(null); }
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
        <div className="flex items-center gap-2 min-w-0">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold">{t("myListings")}</h1>
            <p className="text-muted text-sm truncate">{user?.name} - {user?.phone}</p>
          </div>
          {user?.id && (
            <QRShare path={`/seller/${user.id}`} title={user.name} subtitle="Profil" compact className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-xl bg-input-bg border border-input-border text-muted hover:text-orange-500 hover:border-orange-500/50 transition-all" />
          )}
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
              <button type="button" onClick={() => { setListingMode("novoen"); setSelectedObjectId(""); }} className={cardCls}>
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
              <h2 className="font-semibold">Biznes və obyekt seç</h2>
              <button type="button" onClick={() => { setSelectedBizId(null); setListingMode(""); }} className="text-sm text-muted hover:text-foreground">← Geri</button>
            </div>
            {bizLoading ? (
              <div className="flex items-center gap-2 text-muted text-sm py-8 justify-center">
                <span className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /> Yüklənir…
              </div>
            ) : (
              <div className="space-y-2">
                {bizList.length > 0 ? (
                <>
                <p className="text-xs text-muted mb-1">Bizneslərim — birinə toxun, obyektləri açılsın, obyektin qarşısındakı «Ürün əlavə et» ilə elanı ona qoy.</p>
                {bizList.map((b) => (
                  <div key={b.id} className="rounded-2xl border border-input-border overflow-hidden">
                    <div className="flex items-center gap-2 p-3 bg-input-bg/40">
                      <button type="button" onClick={() => setSelectedBizId(selectedBizId === b.id ? null : b.id)} className="flex-1 flex items-center gap-2 text-left min-w-0">
                        <span className="text-lg shrink-0">🏢</span>
                        <div className="min-w-0"><p className="font-semibold text-sm truncate">{b.name}</p><p className="text-[11px] text-muted">{b.objects.length} obyekt</p></div>
                      </button>
                      <a href="/business" title="Biznesi redaktə et" className="text-muted hover:text-orange-500 text-sm shrink-0">✏️</a>
                      <span className="text-muted text-xs w-4 text-center shrink-0">{selectedBizId === b.id ? "▲" : "▼"}</span>
                    </div>
                    {selectedBizId === b.id && (
                      <div className="p-2 space-y-1.5 border-t border-input-border bg-card">
                        {b.objects.map((o) => (
                          <div key={o.id} className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-input-border">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-base shrink-0">🏪</span>
                              <p className="font-medium text-sm truncate">{o.name} <span className="text-[10px] text-muted">№{o.id}</span></p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <a href="/business" title="Obyekti redaktə et" className="text-muted hover:text-orange-500 text-sm">✏️</a>
                              <button type="button" onClick={() => setSelectedObjectId(String(o.id))} className="px-3 py-1.5 bg-orange-500 text-white rounded-lg text-xs font-semibold whitespace-nowrap">＋ Ürün əlavə et</button>
                            </div>
                          </div>
                        ))}
                        <a href="/business" className="block text-center text-xs text-orange-500 py-1.5 hover:text-orange-400">＋ Bu biznesə yeni obyekt əlavə et</a>
                      </div>
                    )}
                  </div>
                ))}
                </>
                ) : approvedBizNoObj.length > 0 ? (
                // Biznes TƏSDİQLƏNİB, amma hələ obyekti yoxdur — obyekt əlavə etməyə yönləndir.
                <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                  <p className="font-semibold text-sm text-green-600">✓ Biznesiniz təsdiqlənib{approvedBizNoObj.length === 1 ? `: ${approvedBizNoObj[0].name}` : ""}</p>
                  <p className="text-xs text-muted mt-0.5">VÖEN ilə satış üçün bu biznesə ən azı bir <b>obyekt (mağaza / filial)</b> əlavə etməlisiniz. Elan həmişə bir obyektə bağlı satılır.</p>
                  <a href="/business" className="inline-flex items-center gap-1 mt-2 px-3 py-1.5 bg-orange-500 text-white rounded-lg text-xs font-semibold hover:bg-orange-600">＋ Obyekt əlavə et →</a>
                </div>
                ) : (
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                  <p className="font-semibold text-sm">Təsdiqlənmiş biznesiniz yoxdur</p>
                  <p className="text-xs text-muted mt-0.5">VÖEN-li elan (kartla ödəniş) üçün əvvəlcə biznes (VÖEN) əlavə edin, admin təsdiqindən sonra ona obyekt bağlayın.</p>
                </div>
                )}

                {/* HƏMİŞƏ görünür: yeni biznes (VÖEN) əlavə et — biznes olsa belə */}
                <a href="/business" className="w-full text-left p-4 rounded-2xl border border-dashed border-orange-500/40 hover:bg-orange-500/5 transition-all flex items-center gap-3">
                  <div className="text-xl shrink-0">🏢➕</div>
                  <div>
                    <p className="font-semibold text-sm text-orange-500">Yeni biznes (VÖEN) əlavə et</p>
                    <p className="text-[11px] text-muted">Başqa şirkət/VÖEN əlavə et — admin təsdiqindən sonra ona obyekt və məhsul bağlaya bilərsiniz.</p>
                  </div>
                </a>
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
          <h2 className="font-semibold mb-4">{editingId ? t("editListing") : (listingMode === "voen" ? "Elan məlumatları — VÖEN ilə" : "Elan məlumatları — VÖEN-siz")}</h2>
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
              // Məhsul/Xidmət artıq əvvəlki addımda seçilib — burada təkrar tip
              // seçimi yoxdur. Xidmət isə ana kateqoriya "Xidmətlər"-dir (dəyişmir),
              // yalnız alt kateqoriya seçilir. Məhsul üçün yalnız məhsul
              // kateqoriyaları göstərilir (səhvən xidmətə keçmək olmur).
              const isService = form.type === "SERVICE";
              const mainOptions = isService
                ? CATEGORIES.filter((c) => c.service)
                : CATEGORIES.filter((c) => !c.service);
              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {!isService && (
                    <div>
                      <label className="block text-sm font-medium mb-1.5">{t("mainCategory") || "Ana kateqoriya"}</label>
                      <select
                        value={main}
                        onChange={(e) => {
                          const newMain = e.target.value;
                          // Ana kateqoriya dəyişəndə alt kateqoriya BOŞ qalır —
                          // avtomatik yanlış alt seçilməsin (məs. Turizm → Restoran
                          // əvəzinə istifadəçi özü Otel seçsin). Alt seçim məcburidir.
                          setForm({ ...form, category: newMain, type: isServiceCat(newMain) ? "SERVICE" : "PRODUCT" });
                          setAttrs({}); // yeni kateqoriya → atributları sıfırla
                        }}
                        className={inputCls}
                      >
                        {mainOptions.map((m) => <option key={m.name} value={m.name}>{m.name}</option>)}
                      </select>
                    </div>
                  )}
                  <div className={isService ? "sm:col-span-2" : ""}>
                    <label className="block text-sm font-medium mb-1.5">{t("subCategory") || "Alt kateqoriya"}</label>
                    <select
                      required
                      value={sub}
                      onChange={(e) => setForm({ ...form, category: buildCat(main, e.target.value) })}
                      className={inputCls}
                    >
                      <option value="">— {t("subCategory") || "Alt kateqoriya"} seçin —</option>
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
            {/* Məhsul/Xidmət tipi əvvəlki addımda (Addım 2) seçilir — burada təkrar
                seçim legv edildi (istifadəçi tələbi). Tip ana kateqoriyaya görə
                onsuz da düzgün saxlanılır. */}
            {listingMode === "voen" ? (
              // VÖEN elan obyektə bağlıdır — şəhər/ünvan obyektdən gəlir, ayrıca soruşulmur.
              <div className="p-3 bg-input-bg/50 border border-input-border rounded-xl text-xs text-muted flex items-start gap-2">
                <span className="text-base leading-none">📍</span>
                <span>Konum seçdiyiniz obyektdən (mağaza/filial) götürülür — məhsul obyektin ünvanında göstəriləcək. Şəhər/ünvan ayrıca daxil etməyə ehtiyac yoxdur.</span>
              </div>
            ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium mb-1.5">{t("listingLocation")}</label>
                <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder={t("listingLocation")} className={inputCls} />
                {myLocation.address && form.location === myLocation.address && (
                  <p className="text-[11px] text-muted mt-1">{t('locationFromProfile')}</p>
                )}
              </div>
            </div>
            )}
            {/* VÖEN-siz elanlar üçün elana özəl xəritə konumu — hər elanın öz yeri ola bilər (məs. ayrı-ayrı mənzil/ev) */}
            {listingMode !== "voen" && (
              <div>
                <label className="block text-sm font-medium mb-1.5">📍 Bu elanın yeri (xəritədən)</label>
                <p className="text-[11px] text-muted mb-1.5">Hər elan üçün ayrıca konum seçə bilərsiniz — məs. fərqli mənzil/ev satırsınızsa.</p>
                <LocationPicker
                  city={form.city}
                  address={form.location}
                  latitude={listingLat}
                  longitude={listingLng}
                  onChange={(n: any) => {
                    setForm((f) => ({ ...f, city: n.city || f.city, location: n.address || f.location }));
                    setListingLat(n.latitude ?? null);
                    setListingLng(n.longitude ?? null);
                  }}
                  height="220px"
                />
              </div>
            )}
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
            {listingMode !== "voen" && (
            <div>
              <label className="block text-sm font-medium mb-1.5">{t("city")}</label>
              <select value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className={inputCls} required>
                <option value="">—</option>
                {AZ_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            )}
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

            {/* Çatdırılma seçimləri — yalnız VÖEN (obyektə bağlı) elanlarda */}
            {listingMode === "voen" && form.type !== "SERVICE" && (
              <div>
                <label className="block text-sm font-medium mb-1.5">Çatdırılma</label>
                <div className="px-4 py-3 rounded-xl border border-input-border bg-input-bg/50 space-y-2 text-sm">
                  {/* Yalnız götürmə — Yango + satıcı çatdırması bağlanır (məs. avtomobil) */}
                  <label className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-all ${pickupOnly ? "border-orange-500/50 bg-orange-500/5" : "border-input-border bg-input-bg"}`}>
                    <input type="checkbox" checked={pickupOnly} onChange={(e) => setPickupOnly(e.target.checked)} className="w-4 h-4 accent-orange-500" />
                    <span>
                      <span className="block text-sm font-medium">🏠 Yalnız alıcı gəlib götürsün</span>
                      <span className="block text-[11px] text-muted">Yango kuryer və satıcı çatdırması bağlanır — məhsulu yalnız alıcı özü götürür (məs. avtomobil, iri əşya)</span>
                    </span>
                  </label>
                  {pickupOnly ? (
                    <p className="text-[11px] text-muted px-1">🏠 Bu məhsul yalnız <b>götürmə</b> ilə satılır. Alıcı sizinlə razılaşıb məhsulu özü götürür — heç bir kuryer yoxdur.</p>
                  ) : (
                  <>
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1">Məhsulun çəkisi (kq) — 1 ədəd</label>
                    <input type="number" min={0} step="0.1" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} placeholder="məs. 2.5" className={inputCls} />
                    <p className="text-[11px] text-muted mt-1">⚖️ Yango yük limiti <b>50 kq</b>. Bundan ağır məhsullarda Yango avtomatik bağlanır.</p>
                  </div>
                  {Number(weightKg) > 50 && (
                    <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-[12px] text-red-600">
                      ⚠️ Çəki <b>50 kq-dan çoxdur</b> — bu məhsulda <b>Yango kuryer işləməyəcək</b>. Alıcı yalnız «🏪 mağazadan götürmə» və ya «🚗 satıcı özü çatdırır» seçə biləcək.
                    </div>
                  )}
                  {/* Yango ilə daşına bilməyən məhsullar */}
                  <details className="text-[12px] rounded-lg bg-amber-500/5 border border-amber-500/20 px-3 py-2">
                    <summary className="cursor-pointer text-amber-600 font-medium select-none">🚫 Yango ilə daşına bilməyən məhsullar</summary>
                    <ul className="list-disc ml-5 mt-1.5 text-[11px] text-muted space-y-0.5">
                      <li>50 kq-dan yuxarı yük (piyada və ekspres tarifləri üçün)</li>
                      <li>Resepsiz (resept tələb olunmayan) dərmanlar</li>
                      <li>Kimyəvi maddələr</li>
                      <li>Nağd pul</li>
                      <li>Zibil (tullantı)</li>
                      <li>Xüsusi yanaşma/baxım tələb edən tibbi avadanlıqlar</li>
                      <li>Azərbaycanda daşınması qadağan olunmuş bütün məhsullar</li>
                    </ul>
                    <p className="text-[10px] text-muted mt-1.5">Məhsulunuz bunlardan biridirsə, Yango kuryeri seçməyin — «mağazadan götürmə» və ya «satıcı özü çatdırır» istifadə edin.</p>
                  </details>
                  <p className="text-muted text-[12px]">Alıcı checkout-da seçəcək. Standart variantlar: 🛵 <b className="text-foreground">Yango kuryer</b> və 🏪 <b className="text-foreground">mağazadan götürmə</b> həmişə mövcuddur.</p>
                  <label className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-all ${allowSelfDelivery ? "border-orange-500/50 bg-orange-500/5" : "border-input-border bg-input-bg"}`}>
                    <input type="checkbox" checked={allowSelfDelivery} onChange={(e) => setAllowSelfDelivery(e.target.checked)} className="w-4 h-4 accent-orange-500" />
                    <span>
                      <span className="block text-sm font-medium">🚗 Mən özüm də çatdıra bilərəm</span>
                      <span className="block text-[11px] text-muted">Alıcıya əlavə variant: satıcı özü çatdırır</span>
                    </span>
                  </label>
                  {allowSelfDelivery && (
                    <div>
                      <label className="block text-xs font-medium text-muted mb-1">Öz çatdırılmanız üçün qeyd / qiymət</label>
                      <textarea value={selfDeliveryNote} onChange={(e) => setSelfDeliveryNote(e.target.value)} rows={2}
                        placeholder="məs. Şəhər içi 10 AZN, şəhərdən kənar 20 AZN. 1-2 gün ərzində çatdırıram." className={`${inputCls} resize-none`} />
                      <p className="text-[10px] text-muted mt-1">Alıcı «satıcı özü çatdırır» seçəndə bu qeyd ona göstərilir.</p>
                    </div>
                  )}
                  </>
                  )}
                </div>
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
                          src={img.startsWith('http') ? img : `${imgUrl(img)}`}
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
                      <>
                        <button type="button" onClick={() => fileInputRef.current?.click()}
                          className="aspect-square border-2 border-dashed border-input-border rounded-xl flex flex-col items-center justify-center gap-1 text-muted hover:border-orange-500/60 hover:text-orange-500 hover:bg-orange-500/5 transition-all">
                          <span className="text-2xl">🖼️</span>
                          <span className="text-[11px] font-medium">Qalereya</span>
                        </button>
                        <button type="button" onClick={() => cameraInputRef.current?.click()}
                          className="aspect-square border-2 border-dashed border-input-border rounded-xl flex flex-col items-center justify-center gap-1 text-muted hover:border-orange-500/60 hover:text-orange-500 hover:bg-orange-500/5 transition-all">
                          <span className="text-2xl">📷</span>
                          <span className="text-[11px] font-medium">Kamera ilə çək</span>
                        </button>
                      </>
                    )}
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" multiple onChange={handleImagePick} className="hidden" />
                  <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleImagePick} className="hidden" />
                  <p className="text-xs text-muted mt-1.5">🖼️ qalereyadan seçin və ya 📷 kamera ilə anında çəkin · hər biri ən çox 5 MB</p>
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
                    src={listing.images[0].startsWith('http') ? listing.images[0] : `${imgUrl(listing.images[0])}`}
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
                {/* Vaxtı bitibsə / bitməyə yaxındırsa — Yenilə */}
                {listing.expiresAt && new Date(listing.expiresAt).getTime() <= Date.now() + 24 * 60 * 60 * 1000 && (
                  <button onClick={() => handleRenew(listing.id)} disabled={renewingId === listing.id}
                    className="flex items-center gap-1 px-3 py-2 bg-green-500/10 text-green-600 rounded-lg text-xs font-semibold hover:bg-green-500/20 transition-colors disabled:opacity-50">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    {renewingId === listing.id ? "..." : "Yenilə"}
                  </button>
                )}
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
