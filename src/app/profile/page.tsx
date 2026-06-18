"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/Toast";
import { API, UPLOADS } from "@/lib/api";
import { rotateImageFile } from "@/lib/rotateImage";
import LocationPicker from "@/components/LocationPickerWrapper";
import { SOCIAL_META } from "@/lib/social";
import SocialIcon from "@/components/SocialIcon";
import IdentityVerify from "@/components/IdentityVerify";
import { searchProfessions } from "@/lib/professions";

export default function ProfilePage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { user, token, isLoggedIn, authLoading, login } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [listingTab, setListingTab] = useState<"active" | "expired">("active");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({ name: "", profession: "" });
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [showIdentity, setShowIdentity] = useState(false);
  const [profList, setProfList] = useState<string[]>([]);
  const [showProfList, setShowProfList] = useState(false);

  // Vehicles state — iki-addımlı flow:
  //   1) extract: kullanıcı şəkilləri yükləyir, AI sahələri qaytarır
  //   2) save:    kullanıcı sahələri redaktə edir, "Yadda saxla"-ya basır
  type VehicleFormState = {
    id: number | null;
    brand: string;
    model: string;
    year: string;
    // Backend-ə artıq yüklənmiş fayl adları (extract-dən gəlir).
    passportImageFront: string | null;
    passportImageBack: string | null;
    // AI çıxarışı + redaktə edilmiş sahələr.
    registrationNumber: string;
    registrationDate: string;
    ownerName: string;
    ownerAddress: string;
    ownershipType: string;
    validUntil: string;
    cardSerial: string;
    vehicleType: string;
    engineNumber: string;
    bodyNumber: string;
    chassisNumber: string;
    color: string;
    maxMass: string;
    unloadedMass: string;
    seatCount: string;
    engineCapacity: string;
    issuedBy: string;
    specialMarks: string;
    aiRaw: any;
    aiVerified: boolean;
  };
  const emptyVehicleState: VehicleFormState = {
    id: null, brand: "", model: "", year: "",
    passportImageFront: null, passportImageBack: null,
    registrationNumber: "", registrationDate: "", ownerName: "", ownerAddress: "",
    ownershipType: "", validUntil: "", cardSerial: "", vehicleType: "",
    engineNumber: "", bodyNumber: "", chassisNumber: "", color: "",
    maxMass: "", unloadedMass: "", seatCount: "", engineCapacity: "",
    issuedBy: "", specialMarks: "", aiRaw: null, aiVerified: false,
  };
  const [vehicleForm, setVehicleForm] = useState<VehicleFormState>(emptyVehicleState);
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [extractLoading, setExtractLoading] = useState<"front" | "back" | "both" | null>(null);
  const [extractError, setExtractError] = useState<string | null>(null);
  // Lokal preview URL-ləri (kullanıcı upload-dan əvvəl seçdikdə brauzerdə göstərmək üçün)
  const [pendingFront, setPendingFront] = useState<{ file: File; preview: string } | null>(null);
  const [pendingBack, setPendingBack] = useState<{ file: File; preview: string } | null>(null);

  // Workplaces state
  const [workplaceForm, setWorkplaceForm] = useState<{ id: number | null; name: string; address: string }>({ id: null, name: "", address: "" });
  const [showWorkplaceForm, setShowWorkplaceForm] = useState(false);
  const [saved, setSaved] = useState(false);

  // Location (default seller location used to auto-fill new listings).
  const [locationDraft, setLocationDraft] = useState<{ city: string; address: string; latitude: number | null; longitude: number | null }>({
    city: "", address: "", latitude: null, longitude: null,
  });
  const [editingLocation, setEditingLocation] = useState(false);
  const [locationSaving, setLocationSaving] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [emailCodeSent, setEmailCodeSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [oauthProviders, setOauthProviders] = useState<string[]>([]); // OAuth aktiv platformalar
  const [socialPlatform, setSocialPlatform] = useState("instagram");
  const [socialUrl, setSocialUrl] = useState("");
  const [socialBusy, setSocialBusy] = useState(false);
  // ---- Peşə sənədləri ----
  const [credTitle, setCredTitle] = useState("");
  const [credFile, setCredFile] = useState<File | null>(null);
  const [credBusy, setCredBusy] = useState(false);

  const headers: any = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn) { router.push("/"); return; }
    Promise.all([
      fetch(`${API}/me`, { headers }).then((r) => r.json()),
      fetch(`${API}/me/listings`, { headers }).then((r) => r.json()),
    ]).then(([p, l]) => {
      setProfile(p.user);
      setEditData({ name: p.user.name, profession: p.user.profession || "" });
      setListings(l.listings || []);
      setLocationDraft({
        city: p.user.city || "",
        address: p.user.address || "",
        latitude: p.user.latitude ?? null,
        longitude: p.user.longitude ?? null,
      });
    }).catch(() => { toast(t('error'), 'error'); }).finally(() => setLoading(false));
  }, [isLoggedIn, authLoading]);

  const handleSave = async () => {
    const res = await fetch(`${API}/me`, { method: "PUT", headers, body: JSON.stringify({ name: editData.name, profession: editData.profession }) });
    const data = await res.json();
    if (data.success) {
      login(token!, data.user);
      await refreshProfile();
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  const refreshProfile = async () => {
    const res = await fetch(`${API}/me`, { headers }).then((r) => r.json());
    if (res.user) setProfile(res.user);
  };

  const handleAvatarUpload = async (file: File | null) => {
    if (!file) return;
    setAvatarBusy(true);
    try {
      const fd = new FormData();
      fd.append("avatar", file);
      const res = await fetch(`${API}/me/avatar`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd });
      const data = await res.json();
      if (res.ok && data.success) { login(token!, data.user); await refreshProfile(); }
      else toast(data.message || t("error"), "error");
    } catch { toast(t("error"), "error"); } finally { setAvatarBusy(false); }
  };

  const refreshListings = async () => {
    const res = await fetch(`${API}/me/listings`, { headers }).then((r) => r.json());
    setListings(res.listings || []);
  };

  // OAuth: konfiqurasiya olunmuş platformaları çək + callback qayıdışını idarə et.
  useEffect(() => {
    fetch(`${API}/social/oauth/providers`).then((r) => r.json()).then((d) => setOauthProviders(d.configured || [])).catch(() => {});
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    const s = sp.get("social");
    if (s === "connected") { toast("Sosial hesab təsdiqləndi ✓", "success"); refreshProfile(); window.history.replaceState({}, "", "/profile"); }
    else if (s === "error") { toast(sp.get("msg") || "Təsdiq alınmadı", "error"); window.history.replaceState({}, "", "/profile"); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDeleteListing = async (id: number) => {
    if (!confirm(t("confirmDeleteListing"))) return;
    const res = await fetch(`${API}/me/listings/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (data.success) {
      toast(t("profileUpdated"), "success");
      refreshListings();
      refreshProfile();
    } else {
      toast(data.message || t("error"), "error");
    }
  };

  const handleReactivateListing = async (id: number) => {
    const res = await fetch(`${API}/me/listings/${id}/reactivate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.success) {
      toast(t("listingReactivated"), "success");
      refreshListings();
    } else {
      toast(data.message || t("error"), "error");
    }
  };

  const isListingExpired = (l: any) => l.expiresAt && new Date(l.expiresAt) <= new Date();
  const activeListings = listings.filter((l) => !isListingExpired(l));
  const expiredListings = listings.filter((l) => isListingExpired(l));
  const visibleListings = listingTab === "active" ? activeListings : expiredListings;

  // ====== VEHICLES ======
  const startAddVehicle = () => {
    setVehicleForm({ ...emptyVehicleState });
    setPendingFront(null); setPendingBack(null); setExtractError(null);
    setShowVehicleForm(true);
  };
  const startEditVehicle = (v: any) => {
    setVehicleForm({
      id: v.id,
      brand: v.brand || "",
      model: v.model || "",
      year: v.year ? String(v.year) : "",
      passportImageFront: v.passportImageFront || null,
      passportImageBack: v.passportImageBack || null,
      registrationNumber: v.registrationNumber || "",
      registrationDate: v.registrationDate || "",
      ownerName: v.ownerName || "",
      ownerAddress: v.ownerAddress || "",
      ownershipType: v.ownershipType || "",
      validUntil: v.validUntil || "",
      cardSerial: v.cardSerial || "",
      vehicleType: v.vehicleType || "",
      engineNumber: v.engineNumber || "",
      bodyNumber: v.bodyNumber || "",
      chassisNumber: v.chassisNumber || "",
      color: v.color || "",
      maxMass: v.maxMass || "",
      unloadedMass: v.unloadedMass || "",
      seatCount: v.seatCount ? String(v.seatCount) : "",
      engineCapacity: v.engineCapacity || "",
      issuedBy: v.issuedBy || "",
      specialMarks: v.specialMarks || "",
      aiRaw: null,
      aiVerified: false,
    });
    setPendingFront(null); setPendingBack(null); setExtractError(null);
    setShowVehicleForm(true);
  };
  const cancelVehicleForm = () => {
    setShowVehicleForm(false);
    setVehicleForm({ ...emptyVehicleState });
    setPendingFront(null); setPendingBack(null); setExtractError(null);
  };

  // Hər iki şəkil seçildikdə avtomatik AI çağırışı.
  // Tək şəkil dəyişərkən sadəcə preview göstər, kullanıcı ikincisini də
  // seçəndə AI işə düşür.
  const tryRunExtract = async (frontFile: File | null, backFile: File | null) => {
    if (!frontFile || !backFile) return;
    setExtractLoading("both"); setExtractError(null);
    const fd = new FormData();
    fd.append("passportImageFront", frontFile);
    fd.append("passportImageBack", backFile);
    try {
      const res = await fetch(`${API}/me/vehicles/extract`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!data.success) {
        setExtractError(data.message || "Şəkillər oxunmadı");
        return;
      }
      const f = data.fields || {};
      // Texniki pasport rəsmi sənəddir — onun məzmunu kullanıcının manual
      // yazdığından üstündür. Pasportdan oxunan hər sahə formada üzərinə
      // yazılır; kullanıcı istəsə sonra redaktə edə bilər. Pasportda boş
      // qalan (AI null qaytaran) sahələrdə kullanıcının yazdığı saxlanılır.
      const overridden: string[] = [];
      const overrideStr = (key: string, fromAI: string | null | undefined, prev: string): string => {
        const v = (fromAI ?? "").toString().trim();
        if (v && v !== prev) overridden.push(key);
        return v || prev;
      };
      setVehicleForm((prev) => {
        const newBrand = overrideStr("Marka", f.brand, prev.brand);
        const newModel = overrideStr("Model", f.model, prev.model);
        const newYear = overrideStr("İl", f.year ? String(f.year) : null, prev.year);
        return {
          ...prev,
          passportImageFront: data.passportImageFront || prev.passportImageFront,
          passportImageBack: data.passportImageBack || prev.passportImageBack,
          brand: newBrand,
          model: newModel,
          year: newYear,
          registrationNumber: f.registrationNumber || prev.registrationNumber || "",
          registrationDate: f.registrationDate || prev.registrationDate || "",
          ownerName: f.ownerName || prev.ownerName || "",
          ownerAddress: f.ownerAddress || prev.ownerAddress || "",
          ownershipType: f.ownershipType || prev.ownershipType || "",
          validUntil: f.validUntil || prev.validUntil || "",
          cardSerial: f.cardSerial || prev.cardSerial || "",
          vehicleType: f.vehicleType || prev.vehicleType || "",
          engineNumber: f.engineNumber || prev.engineNumber || "",
          bodyNumber: f.bodyNumber || prev.bodyNumber || "",
          chassisNumber: f.chassisNumber || prev.chassisNumber || "",
          color: f.color || prev.color || "",
          maxMass: f.maxMass || prev.maxMass || "",
          unloadedMass: f.unloadedMass || prev.unloadedMass || "",
          seatCount: f.seatCount ? String(f.seatCount) : prev.seatCount || "",
          engineCapacity: f.engineCapacity || prev.engineCapacity || "",
          issuedBy: f.issuedBy || prev.issuedBy || "",
          specialMarks: f.specialMarks || prev.specialMarks || "",
          aiRaw: data.aiRaw,
          aiVerified: !!data.ok,
        };
      });
      // Marka/model/il dəyişikliyi varsa kullanıcıya bildiriş ver — bu sahələr
      // dropdown/select kimi başqa axında doldurulduğundan, dəyişiklik vacibdir.
      if (overridden.length > 0) {
        toast(`Pasportdakı dəyərə uyğunlaşdırıldı: ${overridden.join(", ")}`, "success");
      }
      if (!data.ok && data.error) {
        setExtractError(`AI xəbərdarlığı: ${data.error}. Sahələri əllə yoxlayın və düzəldin.`);
      }
    } catch (err: any) {
      setExtractError(err?.message || "Şəkil yüklənmədi");
    } finally {
      setExtractLoading(null);
    }
  };

  const onPickPassportFile = (side: "front" | "back", file: File | null) => {
    if (!file) {
      if (side === "front") setPendingFront(null);
      else setPendingBack(null);
      return;
    }
    const preview = URL.createObjectURL(file);
    if (side === "front") {
      setPendingFront({ file, preview });
      tryRunExtract(file, pendingBack?.file || null);
    } else {
      setPendingBack({ file, preview });
      tryRunExtract(pendingFront?.file || null, file);
    }
  };

  // Şəkili 90° fırlat: yeni File yaradılır, preview dəyişir, sonra avtomatik
  // yenidən extract çağırılır. Kullanıcı yan/tərs çəkilmiş şəkili düzəldə bilir.
  const rotatePending = async (side: "front" | "back", direction: "left" | "right") => {
    const cur = side === "front" ? pendingFront : pendingBack;
    if (!cur) return;
    setExtractError(null);
    try {
      const rotated = await rotateImageFile(cur.file, direction === "right" ? 90 : -90);
      const preview = URL.createObjectURL(rotated);
      const next = { file: rotated, preview };
      if (side === "front") {
        setPendingFront(next);
        if (pendingBack) tryRunExtract(rotated, pendingBack.file);
      } else {
        setPendingBack(next);
        if (pendingFront) tryRunExtract(pendingFront.file, rotated);
      }
    } catch (err: any) {
      setExtractError(err?.message || "Şəkil fırlatıla bilmədi");
    }
  };

  const submitVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleForm.brand || !vehicleForm.model || !vehicleForm.year) {
      toast('Marka, model və il tələb olunur', 'error'); return;
    }
    if (!vehicleForm.passportImageFront || !vehicleForm.passportImageBack) {
      toast('Əvvəlcə pasportun ön və arxa şəkillərini yükləyin', 'error'); return;
    }
    const url = vehicleForm.id ? `${API}/me/vehicles/${vehicleForm.id}` : `${API}/me/vehicles`;
    const method = vehicleForm.id ? 'PUT' : 'POST';
    const body = {
      brand: vehicleForm.brand,
      model: vehicleForm.model,
      year: vehicleForm.year,
      passportImageFront: vehicleForm.passportImageFront,
      passportImageBack: vehicleForm.passportImageBack,
      registrationNumber: vehicleForm.registrationNumber,
      registrationDate: vehicleForm.registrationDate,
      ownerName: vehicleForm.ownerName,
      ownerAddress: vehicleForm.ownerAddress,
      ownershipType: vehicleForm.ownershipType,
      validUntil: vehicleForm.validUntil,
      cardSerial: vehicleForm.cardSerial,
      vehicleType: vehicleForm.vehicleType,
      engineNumber: vehicleForm.engineNumber,
      bodyNumber: vehicleForm.bodyNumber,
      chassisNumber: vehicleForm.chassisNumber,
      color: vehicleForm.color,
      maxMass: vehicleForm.maxMass,
      unloadedMass: vehicleForm.unloadedMass,
      seatCount: vehicleForm.seatCount,
      engineCapacity: vehicleForm.engineCapacity,
      issuedBy: vehicleForm.issuedBy,
      specialMarks: vehicleForm.specialMarks,
      aiRaw: vehicleForm.aiRaw,
      aiVerified: vehicleForm.aiVerified,
    };
    const res = await fetch(url, { method, headers, body: JSON.stringify(body) });
    const data = await res.json();
    if (data.success) {
      toast(vehicleForm.id ? t('profileUpdated') : 'Avtomobil əlavə edildi', 'success');
      cancelVehicleForm();
      refreshProfile();
    } else {
      toast(data.message || t('error'), 'error');
    }
  };
  const deleteVehicle = async (id: number) => {
    if (!confirm('Avtomobili silmək istəyirsiniz?')) return;
    const res = await fetch(`${API}/me/vehicles/${id}`, { method: 'DELETE', headers });
    const data = await res.json();
    if (data.success) { toast(t('profileUpdated'), 'success'); refreshProfile(); }
    else toast(data.message || t('error'), 'error');
  };

  // ====== WORKPLACES ======
  const startAddWorkplace = () => { setWorkplaceForm({ id: null, name: "", address: "" }); setShowWorkplaceForm(true); };
  const startEditWorkplace = (w: any) => { setWorkplaceForm({ id: w.id, name: w.name, address: w.address }); setShowWorkplaceForm(true); };
  const cancelWorkplaceForm = () => { setShowWorkplaceForm(false); setWorkplaceForm({ id: null, name: "", address: "" }); };
  const submitWorkplace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workplaceForm.name || !workplaceForm.address) { toast(t('error'), 'error'); return; }
    const url = workplaceForm.id ? `${API}/me/workplaces/${workplaceForm.id}` : `${API}/me/workplaces`;
    const method = workplaceForm.id ? 'PUT' : 'POST';
    const res = await fetch(url, { method, headers, body: JSON.stringify({ name: workplaceForm.name, address: workplaceForm.address }) });
    const data = await res.json();
    if (data.success) {
      toast(t('profileUpdated'), 'success');
      cancelWorkplaceForm();
      refreshProfile();
    } else {
      toast(data.message || t('error'), 'error');
    }
  };
  const deleteWorkplace = async (id: number) => {
    if (!confirm('İş yerini silmək istəyirsiniz?')) return;
    const res = await fetch(`${API}/me/workplaces/${id}`, { method: 'DELETE', headers });
    const data = await res.json();
    if (data.success) { toast(t('profileUpdated'), 'success'); refreshProfile(); }
    else toast(data.message || t('error'), 'error');
  };

  const saveLocation = async () => {
    setLocationSaving(true);
    try {
      const res = await fetch(`${API}/me`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          city: locationDraft.city,
          address: locationDraft.address,
          latitude: locationDraft.latitude,
          longitude: locationDraft.longitude,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast(t("locationSaved"), "success");
        setEditingLocation(false);
        refreshProfile();
      } else {
        toast(data.message || t("error"), "error");
      }
    } catch {
      toast(t("error"), "error");
    } finally {
      setLocationSaving(false);
    }
  };

  const handleSendEmailCode = async () => {
    if (!emailInput) return;
    setEmailError("");
    setEmailLoading(true);
    try {
      const res = await fetch(`${API}/me/email/send-code`, { method: "POST", headers, body: JSON.stringify({ email: emailInput }) });
      const data = await res.json();
      if (data.success) {
        setEmailCodeSent(true);
        setVerificationCode(data.code);
      } else {
        setEmailError(data.message || t("error"));
      }
    } catch { setEmailError(t("error")); }
    finally { setEmailLoading(false); }
  };

  const handleVerifyEmail = async () => {
    if (!emailCode) return;
    setEmailError("");
    setEmailLoading(true);
    try {
      const res = await fetch(`${API}/me/email/verify`, { method: "POST", headers, body: JSON.stringify({ email: emailInput, code: emailCode }) });
      const data = await res.json();
      if (data.success) {
        setProfile(data.user);
        login(token!, data.user);
        setEmailVerified(true);
        setEmailCodeSent(false);
        setEmailCode("");
        setVerificationCode("");
        setTimeout(() => setEmailVerified(false), 3000);
      } else {
        setEmailError(data.message || t("error"));
      }
    } catch { setEmailError(t("error")); }
    finally { setEmailLoading(false); }
  };

  // ---- Sosial media hesabları ----
  const addSocial = async () => {
    if (!socialUrl.trim()) return;
    setSocialBusy(true);
    try {
      const res = await fetch(`${API}/me/social`, { method: "POST", headers, body: JSON.stringify({ platform: socialPlatform, url: socialUrl.trim() }) });
      const data = await res.json();
      if (res.ok && data.success) { setSocialUrl(""); await refreshProfile(); }
      else toast(data.message || t("error"), "error");
    } catch { toast(t("error"), "error"); } finally { setSocialBusy(false); }
  };
  const deleteSocial = async (id: number) => {
    try {
      await fetch(`${API}/me/social/${id}`, { method: "DELETE", headers });
      await refreshProfile();
    } catch { toast(t("error"), "error"); }
  };
  // OAuth ilə təsdiq ("hesabla daxil ol" — platforma özü təsdiqləyir).
  const connectOauth = async (platform: string) => {
    try {
      const res = await fetch(`${API}/me/social/oauth/${platform}/start`, { headers });
      const data = await res.json();
      if (res.ok && data.url) window.location.href = data.url;
      else toast(data.message || t("error"), "error");
    } catch { toast(t("error"), "error"); }
  };

  // ---- Peşə sənədləri (AI ad-soyad uyğunluğu) ----
  const uploadCredential = async () => {
    if (!credTitle.trim()) { toast("Sənədin başlığını yazın (məs. Diplom)", "error"); return; }
    if (!credFile) { toast("Sənəd şəkli seçin", "error"); return; }
    setCredBusy(true);
    try {
      const fd = new FormData();
      fd.append("title", credTitle.trim());
      fd.append("document", credFile);
      const res = await fetch(`${API}/me/credentials`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }, // FormData — Content-Type avtomatik
        body: fd,
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const m = data.document?.nameMatch;
        toast(m ? "Sənəd yükləndi — AI ad-soyadı uyğun tapdı ✓" : "Sənəd yükləndi — AI yoxlaması tamamlandı", m ? "success" : "info");
        setCredTitle(""); setCredFile(null); await refreshProfile();
      } else toast(data.message || t("error"), "error");
    } catch { toast(t("error"), "error"); } finally { setCredBusy(false); }
  };
  const deleteCredential = async (id: number) => {
    try {
      await fetch(`${API}/me/credentials/${id}`, { method: "DELETE", headers });
      await refreshProfile();
    } catch { toast(t("error"), "error"); }
  };

  const typeLabel = (type: string) =>
    type === "MECHANIC" ? t("tabMechanic") : type === "PARTS_SELLER" ? t("tabPartsSeller") : t("tabCarOwner");
  const typeColor = (type: string) =>
    type === "MECHANIC" ? "from-green-500 to-emerald-600" : type === "PARTS_SELLER" ? "from-purple-500 to-violet-600" : "from-blue-500 to-blue-600";

  if (authLoading || loading || !profile) {
    return <div className="min-h-[calc(100vh-64px)] flex items-center justify-center"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const memberDate = new Date(profile.createdAt).toLocaleDateString("az-AZ", { year: "numeric", month: "long", day: "numeric" });

  const inputCls = "w-full px-4 py-3 bg-input-bg border border-input-border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/50 placeholder-muted-foreground text-foreground text-sm";

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
      {/* Profile Card */}
      <div className="surface p-5 sm:p-7 mb-5">
        {saved && (
          <div className="mb-4 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-xl text-green-500 text-sm text-center">
            {t("profileUpdated")}
          </div>
        )}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
          {/* Avatar — Facebook üslubu: böyük şəkil + dəyişmə düyməsi */}
          <div className="relative w-36 h-36 sm:w-40 sm:h-40 shrink-0">
            {profile.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`${UPLOADS}/${profile.avatar}`} alt={profile.name} className="w-full h-full object-cover rounded-full shadow-xl ring-4 ring-card" />
            ) : (
              <div className={`w-full h-full bg-gradient-to-br ${typeColor(profile.type)} rounded-full flex items-center justify-center text-white font-bold text-4xl sm:text-5xl shadow-xl ring-4 ring-card`}>
                {profile.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
              </div>
            )}
            <label className="absolute bottom-1.5 right-1.5 w-11 h-11 bg-orange-500 rounded-full flex items-center justify-center cursor-pointer shadow-md border-2 border-card hover:bg-orange-600 transition-colors" title="Şəkli dəyiş">
              {avatarBusy ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" /></svg>
              )}
              <input type="file" accept="image/*" className="hidden" disabled={avatarBusy} onChange={(e) => handleAvatarUpload(e.target.files?.[0] || null)} />
            </label>
          </div>

          {/* Info */}
          <div className="flex-1 w-full">
            {editing ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">{t("fullName")}</label>
                  <input value={editData.name} onChange={(e) => setEditData({ ...editData, name: e.target.value })} placeholder="Ad Soyad" className={inputCls} />
                </div>
                <div className="relative">
                  <label className="block text-xs font-medium text-muted mb-1">{t("profession") || "Məslək"}</label>
                  <input
                    value={editData.profession}
                    onChange={(e) => { const v = e.target.value; setEditData({ ...editData, profession: v }); setProfList(searchProfessions(v)); setShowProfList(true); }}
                    onFocus={() => { if (editData.profession.trim()) { setProfList(searchProfessions(editData.profession)); setShowProfList(true); } }}
                    onBlur={() => setTimeout(() => setShowProfList(false), 150)}
                    placeholder={t("professionPlaceholder") || "Məs: Həkim, Mühəndis, Satıcı"}
                    className={inputCls}
                    autoComplete="off"
                  />
                  {showProfList && profList.length > 0 && (
                    <ul className="absolute z-20 left-0 right-0 mt-1 bg-card border border-input-border rounded-xl shadow-lg overflow-hidden max-h-56 overflow-y-auto">
                      {profList.map((p) => (
                        <li key={p}>
                          <button type="button" onMouseDown={(e) => { e.preventDefault(); setEditData((d) => ({ ...d, profession: p })); setShowProfList(false); }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-orange-500/10 transition-colors">{p}</button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">{t("phone")}</label>
                  <input value={profile.phone} disabled className={inputCls + " opacity-60 cursor-not-allowed"} />
                  <p className="text-[11px] text-muted mt-1">Telefon nömrəsi dəyişdirilə bilməz</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleSave} className="px-5 py-2 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl text-white text-sm font-medium">{t("adminSave")}</button>
                  <button onClick={() => setEditing(false)} className="px-5 py-2 bg-input-bg border border-input-border rounded-xl text-sm">{t("adminCancel")}</button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mb-2">
                  <h1 className="text-2xl sm:text-2xl font-bold">{profile.name}</h1>
                  <span className={`px-3 py-1 bg-gradient-to-r ${typeColor(profile.type)} rounded-lg text-xs font-medium text-white`}>
                    {typeLabel(profile.type)}
                  </span>
                  {profile.verified && <span className="px-2 py-0.5 bg-green-500/10 text-green-500 border border-green-500/20 rounded text-xs">{t("adminVerified")}</span>}
                </div>
                <div className="flex flex-wrap justify-center sm:justify-start gap-x-5 gap-y-1 text-sm text-muted mb-3">
                  <span className="flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
                    {profile.phone}
                  </span>
                  {profile.email && (
                    <span className="flex items-center gap-1.5">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
                      {profile.email}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>
                    {t("memberSince")}: {memberDate}
                  </span>
                  {profile.profession && (
                    <span className="flex items-center gap-1.5">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" /></svg>
                      {profile.profession}
                    </span>
                  )}
                </div>
                <button onClick={() => { setEditData({ name: profile.name, profession: profile.profession || "" }); setEditing(true); }} className="flex items-center gap-1.5 px-4 py-2 mx-auto sm:mx-0 bg-orange-500/10 text-orange-500 rounded-xl text-sm font-medium hover:bg-orange-500/20 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  {t("editProfile")}
                </button>
              </>
            )}
          </div>

          {/* Stats */}
          <div className="flex gap-6 shrink-0">
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-500">{profile._count?.listings || 0}</p>
              <p className="text-xs text-muted">{t("totalListings")}</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-400">{(profile._count?.sentMessages || 0) + (profile._count?.receivedMessages || 0)}</p>
              <p className="text-xs text-muted">{t("messages")}</p>
            </div>
          </div>
        </div>

      </div>

      {/* Kimlik təsdiqi (şəxsiyyət vəsiqəsi + üz tanıma) */}
      <div className="surface p-5 sm:p-7 mb-5">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <h2 className="text-lg font-semibold flex items-center gap-2">🪪 Kimlik təsdiqi</h2>
          {(() => {
            const s = profile.idVerifyStatus;
            const cls = s === "APPROVED" ? "bg-green-500/10 text-green-500" : s === "REJECTED" ? "bg-red-500/10 text-red-500" : s === "PENDING" ? "bg-amber-500/10 text-amber-500" : "bg-input-bg text-muted";
            const label = s === "APPROVED" ? "✓ Təsdiqlənib" : s === "REJECTED" ? "Rədd edildi" : s === "PENDING" ? "Yoxlanılır" : "Təsdiqlənməyib";
            return <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${cls}`}>{label}</span>;
          })()}
        </div>
        <p className="text-xs text-muted mb-3">Şəxsiyyət vəsiqəsi şəkli + selfie. <b>AI vəsiqədəki ad-soyadı və üzü selfie ilə yoxlayır</b>, admin son təsdiqi verir.</p>
        {(profile.idCardImage || profile.selfieImage) && !showIdentity && (
          <div className="flex gap-3 mb-3">
            {profile.idCardImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`${UPLOADS}/${profile.idCardImage}`} alt="kimlik" className="w-28 h-20 object-cover rounded-lg border border-input-border" />
            )}
            {profile.selfieImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`${UPLOADS}/${profile.selfieImage}`} alt="selfie" className="w-20 h-20 object-cover rounded-lg border border-input-border" />
            )}
          </div>
        )}
        {/* AI doğrulama nəticəsi */}
        {(profile.idAiNameMatch !== null && profile.idAiNameMatch !== undefined || profile.idAiFaceMatch !== null && profile.idAiFaceMatch !== undefined || profile.idAiReason) && !showIdentity && (
          <div className="mb-3 p-3 bg-input-bg border border-input-border rounded-xl">
            <p className="text-[11px] font-semibold text-muted mb-1.5">🤖 AI yoxlaması</p>
            <div className="flex flex-wrap gap-2">
              {(profile.idAiNameMatch !== null && profile.idAiNameMatch !== undefined) && (
                <span className={`px-2 py-0.5 rounded-md text-[11px] font-medium ${profile.idAiNameMatch ? "bg-green-500/10 text-green-500" : "bg-amber-500/10 text-amber-500"}`}>
                  {profile.idAiNameMatch ? "✓ Ad-soyad uyğundur" : "⚠ Ad-soyad uyğun deyil"}
                  {typeof profile.idAiNameScore === "number" ? ` (${Math.round(profile.idAiNameScore * 100)}%)` : ""}
                </span>
              )}
              {(profile.idAiFaceMatch !== null && profile.idAiFaceMatch !== undefined) && (
                <span className={`px-2 py-0.5 rounded-md text-[11px] font-medium ${profile.idAiFaceMatch ? "bg-green-500/10 text-green-500" : "bg-amber-500/10 text-amber-500"}`}>
                  {profile.idAiFaceMatch ? "✓ Üz uyğundur" : "⚠ Üz uyğun deyil"}
                  {typeof profile.idAiFaceScore === "number" ? ` (${Math.round(profile.idAiFaceScore * 100)}%)` : ""}
                </span>
              )}
            </div>
            {profile.idAiReason && <p className="text-[11px] text-muted mt-1.5 leading-snug">{profile.idAiReason}</p>}
          </div>
        )}
        {showIdentity ? (
          <IdentityVerify token={token} onDone={() => { setShowIdentity(false); refreshProfile(); }} />
        ) : (
          <button onClick={() => setShowIdentity(true)} className="px-4 py-2.5 bg-orange-500/10 text-orange-500 rounded-xl text-sm font-semibold hover:bg-orange-500/20 transition-colors">
            {profile.idVerifyStatus ? "Kimliyi yenidən təsdiqlə" : "Kimliyi təsdiqlə"}
          </button>
        )}
      </div>

      {/* Peşə sənədləri (diplom / sertifikat / lisenziya) — AI ad-soyad uyğunluğunu yoxlayır */}
      <div className="surface p-5 sm:p-7 mb-5">
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-1">🎓 Peşə sənədləri</h2>
        <p className="text-xs text-muted mb-4">
          Diplom, sertifikat və ya lisenziyanızı yükləyin. <b>AI sənəddəki ad-soyadın sizin ad-soyadınızla
          ({profile.name || "—"}) uyğun olduğunu yoxlayır.</b> Bir neçə sənəd əlavə edə bilərsiniz.
        </p>

        {/* Mövcud sənədlər */}
        {profile.professionDocuments?.length > 0 && (
          <div className="space-y-2.5 mb-4">
            {profile.professionDocuments.map((d: any) => {
              const score = typeof d.nameMatchScore === "number" ? Math.round(d.nameMatchScore * 100) : null;
              const matchCls = d.nameMatch ? "bg-green-500/10 text-green-500" : "bg-amber-500/10 text-amber-500";
              const matchLabel = d.nameMatch ? `✓ Ad-soyad uyğundur${score !== null ? ` (${score}%)` : ""}` : `⚠ Ad-soyad uyğun deyil${score !== null ? ` (${score}%)` : ""}`;
              const stCls = d.status === "APPROVED" ? "bg-green-500/10 text-green-500" : d.status === "REJECTED" ? "bg-red-500/10 text-red-500" : "bg-amber-500/10 text-amber-500";
              const stLabel = d.status === "APPROVED" ? "Təsdiqlənib" : d.status === "REJECTED" ? "Rədd edildi" : "Yoxlanılır";
              return (
                <div key={d.id} className="flex gap-3 items-start bg-input-bg border border-input-border rounded-xl p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`${UPLOADS}/${d.image}`} alt={d.title} className="w-16 h-16 object-cover rounded-lg border border-input-border shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold truncate">{d.title}</p>
                      {d.documentType && <span className="text-[11px] text-muted">· {d.documentType}</span>}
                      <span className={`px-2 py-0.5 rounded-md text-[11px] font-medium ${stCls}`}>{stLabel}</span>
                    </div>
                    {d.holderName && <p className="text-[11px] text-muted mt-0.5">Sənəddə: {d.holderName}</p>}
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded-md text-[11px] font-medium ${matchCls}`}>{matchLabel}</span>
                    {d.aiReason && <p className="text-[11px] text-muted mt-1 leading-snug">{d.aiReason}</p>}
                  </div>
                  <button onClick={() => deleteCredential(d.id)} className="text-muted hover:text-red-500 text-xs shrink-0" title="Sil">✕</button>
                </div>
              );
            })}
          </div>
        )}

        {/* Yeni sənəd əlavə et */}
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={credTitle}
            onChange={(e) => setCredTitle(e.target.value)}
            placeholder="Başlıq (məs. Diplom, Həkimlik lisenziyası)"
            className={`${inputCls} sm:flex-1`}
          />
          <label className="px-4 py-3 bg-input-bg border border-input-border rounded-xl text-sm cursor-pointer text-center hover:bg-orange-500/5 transition-colors">
            <span className="text-muted">{credFile ? `📎 ${credFile.name.slice(0, 22)}` : "📷 Şəkil seç"}</span>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => setCredFile(e.target.files?.[0] || null)} />
          </label>
          <button
            onClick={uploadCredential}
            disabled={credBusy}
            className="px-5 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50 whitespace-nowrap"
          >
            {credBusy ? "AI yoxlayır…" : "Yüklə və yoxla"}
          </button>
        </div>
      </div>

      {/* My location — default seller location, auto-fills new listings */}
      <div className="surface p-5 sm:p-7 mb-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold flex items-center gap-2">
            <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
            </svg>
            {t('myLocation')}
          </h2>
          {!editingLocation && (
            <button
              onClick={() => setEditingLocation(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/10 text-orange-500 rounded-lg text-xs font-medium hover:bg-orange-500/20 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              {profile.city || profile.latitude ? t('changeLocation') : t('addLocation')}
            </button>
          )}
        </div>

        {editingLocation ? (
          <div className="space-y-3">
            <p className="text-xs text-muted">
              {t('myLocationDesc')}
            </p>
            <LocationPicker
              city={locationDraft.city}
              address={locationDraft.address}
              latitude={locationDraft.latitude}
              longitude={locationDraft.longitude}
              onChange={setLocationDraft}
              height="320px"
            />
            <div className="flex gap-2 pt-2">
              <button
                onClick={saveLocation}
                disabled={locationSaving}
                className="px-5 py-2 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl text-white text-sm font-medium disabled:opacity-50"
              >
                {locationSaving ? "..." : t('save')}
              </button>
              <button
                onClick={() => {
                  setEditingLocation(false);
                  setLocationDraft({
                    city: profile.city || "",
                    address: profile.address || "",
                    latitude: profile.latitude ?? null,
                    longitude: profile.longitude ?? null,
                  });
                }}
                className="px-5 py-2 bg-input-bg border border-input-border rounded-xl text-sm"
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        ) : profile.city || profile.address || profile.latitude ? (
          <div className="text-sm space-y-1">
            {profile.city && <p className="font-medium">📍 {profile.city}</p>}
            {profile.address && <p className="text-muted">{profile.address}</p>}
            {profile.latitude && profile.longitude && (
              <p className="text-[11px] text-muted">
                {t('locationPinPlaced')} ({profile.latitude.toFixed(4)}, {profile.longitude.toFixed(4)})
              </p>
            )}
          </div>
        ) : (
          <p className="text-muted text-sm text-center py-4">
            {t('locationNotSetYet')}
          </p>
        )}
      </div>

      {/* Vehicles section - only for CAR_OWNER */}
      {profile.type === "CAR_OWNER" && (
        <div className="surface p-5 sm:p-7 mb-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2">
              <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25" /></svg>
              Avtomobillərim ({profile.vehicles?.length || 0})
            </h2>
            {!showVehicleForm && (
              <button onClick={startAddVehicle} className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/10 text-orange-500 rounded-lg text-xs font-medium hover:bg-orange-500/20 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Avtomobil əlavə et
              </button>
            )}
          </div>

          {showVehicleForm && (
            <form onSubmit={submitVehicle} className="bg-input-bg/50 border border-input-border rounded-xl p-4 mb-4 space-y-4">
              {/* STEP 1 — şəkillər */}
              <div>
                <p className="text-xs font-medium text-muted mb-1">
                  1. Texniki pasportun şəkillərini yükləyin
                </p>
                <p className="text-[11px] text-muted-foreground mb-2">
                  Şəkil yan və ya tərs çəkilibsə, alt-da görünən <span className="text-orange-500 font-medium">"Sola fırlat" / "Sağa fırlat"</span> düymələri ilə düz vəziyyətə gətirin — AI o zaman daha düzgün oxuyacaq.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {(["front", "back"] as const).map((side) => {
                    const pending = side === "front" ? pendingFront : pendingBack;
                    const uploadedFilename = side === "front" ? vehicleForm.passportImageFront : vehicleForm.passportImageBack;
                    const previewSrc = pending?.preview
                      || (uploadedFilename ? `${UPLOADS}/${uploadedFilename}` : null);
                    const sideLabel = side === "front" ? "Ön hissə" : "Arxa hissə";
                    const pendingSlot = side === "front" ? pendingFront : pendingBack;
                    return (
                      <div key={side}>
                        <p className="text-[11px] text-muted-foreground mb-1">{sideLabel}</p>
                        {previewSrc ? (
                          <div>
                            <div className="relative">
                              <img src={previewSrc} alt={sideLabel} className="w-full h-36 object-contain rounded-xl border border-input-border bg-input-bg/40" />
                              <button
                                type="button"
                                onClick={() => onPickPassportFile(side, null)}
                                className="absolute top-1.5 right-1.5 p-1 bg-red-500/80 rounded-lg text-white text-xs"
                                title="Şəkili sil"
                              >×</button>
                            </div>
                            {/* Rotation kontrolu yalnız hələ yüklənməmiş (pending) şəkillər üçün */}
                            {pendingSlot && (
                              <div className="flex gap-1.5 mt-1.5">
                                <button
                                  type="button"
                                  onClick={() => rotatePending(side, "left")}
                                  className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 rounded-lg text-[11px] font-medium transition-colors"
                                  title="90° sola fırlat"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                  </svg>
                                  Sola fırlat
                                </button>
                                <button
                                  type="button"
                                  onClick={() => rotatePending(side, "right")}
                                  className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 rounded-lg text-[11px] font-medium transition-colors"
                                  title="90° sağa fırlat"
                                >
                                  Sağa fırlat
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10H11a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6" />
                                  </svg>
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <label className="flex flex-col items-center justify-center h-36 border-2 border-dashed border-input-border rounded-xl cursor-pointer hover:border-orange-500/30 text-xs text-muted bg-input-bg/30">
                            <span>{sideLabel} şəkli</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => onPickPassportFile(side, e.target.files?.[0] || null)}
                            />
                          </label>
                        )}
                      </div>
                    );
                  })}
                </div>
                {extractLoading === "both" && (
                  <p className="text-[11px] text-orange-500 mt-2 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                      <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" />
                    </svg>
                    AI şəkilləri oxuyur, gözləyin...
                  </p>
                )}
                {extractError && (
                  <p className="text-[11px] text-red-500 mt-2">{extractError}</p>
                )}
                {vehicleForm.aiVerified && !extractLoading && !extractError && (
                  <p className="text-[11px] text-green-500 mt-2">✓ AI sahələri oxudu — aşağıda yoxlayıb düzəldə bilərsiniz</p>
                )}
              </div>

              {/* STEP 2 — redaktə edilə bilən sahələr */}
              <div>
                <p className="text-xs font-medium text-muted mb-2">
                  2. Sahələri yoxlayın və lazım olarsa düzəldin, sonra yadda saxlayın
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input value={vehicleForm.brand} onChange={(e) => setVehicleForm({ ...vehicleForm, brand: e.target.value })} placeholder="Marka (D)" className={inputCls} required />
                  <input value={vehicleForm.model} onChange={(e) => setVehicleForm({ ...vehicleForm, model: e.target.value })} placeholder="Model (D.2)" className={inputCls} required />
                  <input type="number" min="1900" max={new Date().getFullYear() + 1} value={vehicleForm.year} onChange={(e) => setVehicleForm({ ...vehicleForm, year: e.target.value })} placeholder="İl (B.2)" className={inputCls} required />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                  <input value={vehicleForm.registrationNumber} onChange={(e) => setVehicleForm({ ...vehicleForm, registrationNumber: e.target.value })} placeholder="A — Qeydiyyat nişanı (77NP518)" className={inputCls} />
                  <input value={vehicleForm.registrationDate} onChange={(e) => setVehicleForm({ ...vehicleForm, registrationDate: e.target.value })} placeholder="B.1 — Qeydiyyat tarixi" className={inputCls} />
                  <input value={vehicleForm.ownerName} onChange={(e) => setVehicleForm({ ...vehicleForm, ownerName: e.target.value })} placeholder="C.1 — Mülkiyyətçi" className={inputCls} />
                  <input value={vehicleForm.ownerAddress} onChange={(e) => setVehicleForm({ ...vehicleForm, ownerAddress: e.target.value })} placeholder="C.2 — Ünvan" className={inputCls} />
                  <input value={vehicleForm.ownershipType} onChange={(e) => setVehicleForm({ ...vehicleForm, ownershipType: e.target.value })} placeholder="C.3 — Mülkiyyət növü" className={inputCls} />
                  <input value={vehicleForm.vehicleType} onChange={(e) => setVehicleForm({ ...vehicleForm, vehicleType: e.target.value })} placeholder="D.3 — Tip (MİNİK)" className={inputCls} />
                  <input value={vehicleForm.engineNumber} onChange={(e) => setVehicleForm({ ...vehicleForm, engineNumber: e.target.value })} placeholder="E.1 — Mühərrik nömrəsi" className={inputCls} />
                  <input value={vehicleForm.bodyNumber} onChange={(e) => setVehicleForm({ ...vehicleForm, bodyNumber: e.target.value })} placeholder="E.2 — Ban / VIN" className={inputCls} />
                  <input value={vehicleForm.chassisNumber} onChange={(e) => setVehicleForm({ ...vehicleForm, chassisNumber: e.target.value })} placeholder="E.3 — Şassi nömrəsi" className={inputCls} />
                  <input value={vehicleForm.color} onChange={(e) => setVehicleForm({ ...vehicleForm, color: e.target.value })} placeholder="E.4 — Rəng" className={inputCls} />
                  <input value={vehicleForm.maxMass} onChange={(e) => setVehicleForm({ ...vehicleForm, maxMass: e.target.value })} placeholder="F.1 — Maks. kütlə" className={inputCls} />
                  <input value={vehicleForm.unloadedMass} onChange={(e) => setVehicleForm({ ...vehicleForm, unloadedMass: e.target.value })} placeholder="F.2 — Yüksüz kütlə" className={inputCls} />
                  <input type="number" min="1" max="20" value={vehicleForm.seatCount} onChange={(e) => setVehicleForm({ ...vehicleForm, seatCount: e.target.value })} placeholder="F.3 — Oturacaq sayı" className={inputCls} />
                  <input value={vehicleForm.engineCapacity} onChange={(e) => setVehicleForm({ ...vehicleForm, engineCapacity: e.target.value })} placeholder="G — Mühərrik həcmi (sm³)" className={inputCls} />
                  <input value={vehicleForm.validUntil} onChange={(e) => setVehicleForm({ ...vehicleForm, validUntil: e.target.value })} placeholder="H — Etibarlıdır" className={inputCls} />
                  <input value={vehicleForm.cardSerial} onChange={(e) => setVehicleForm({ ...vehicleForm, cardSerial: e.target.value })} placeholder="Kart seriyası (BB667834)" className={inputCls} />
                  <input value={vehicleForm.issuedBy} onChange={(e) => setVehicleForm({ ...vehicleForm, issuedBy: e.target.value })} placeholder="Verilib" className={inputCls} />
                  <input value={vehicleForm.specialMarks} onChange={(e) => setVehicleForm({ ...vehicleForm, specialMarks: e.target.value })} placeholder="Xüsusi qeydlər" className={inputCls} />
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-input-border/50">
                <button
                  type="submit"
                  disabled={!vehicleForm.passportImageFront || !vehicleForm.passportImageBack || extractLoading !== null}
                  className="px-5 py-2 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {vehicleForm.id ? t("adminSave") : "Yadda saxla"}
                </button>
                <button type="button" onClick={cancelVehicleForm} className="px-5 py-2 bg-input-bg border border-input-border rounded-xl text-sm">{t("adminCancel")}</button>
              </div>
            </form>
          )}

          {!profile.vehicles?.length && !showVehicleForm ? (
            <p className="text-muted text-sm text-center py-4">Hələ avtomobil əlavə etməmisiniz.</p>
          ) : (
            <div className="space-y-2">
              {profile.vehicles?.map((v: any) => {
                const passportRows = ([
                  ['A — Qeydiyyat nişanı', v.registrationNumber],
                  ['B.1 — Qeydiyyat tarixi', v.registrationDate],
                  ['B.2 — İstehsal ili', v.manufactureYear],
                  ['C.1 — Mülkiyyətçi', v.ownerName],
                  ['C.2 — Ünvan', v.ownerAddress],
                  ['C.3 — Mülkiyyət növü', v.ownershipType],
                  ['D.3 — Tip', v.vehicleType],
                  ['E.1 — Mühərrik №', v.engineNumber],
                  ['E.2 — Ban / VIN', v.bodyNumber],
                  ['E.3 — Şassi №', v.chassisNumber],
                  ['E.4 — Rəng', v.color],
                  ['F.1 — Maks. kütlə', v.maxMass],
                  ['F.2 — Yüksüz kütlə', v.unloadedMass],
                  ['F.3 — Oturacaq sayı', v.seatCount],
                  ['G — Mühərrik həcmi', v.engineCapacity],
                  ['H — Etibarlıdır', v.validUntil],
                  ['Verilib', v.issuedBy],
                  ['Kart seriyası', v.cardSerial],
                ] as Array<[string, string | number | null | undefined]>).filter(([, val]) => val !== null && val !== undefined && val !== '');
                return (
                  <div key={v.id} className="p-3 bg-input-bg/40 border border-input-border/60 rounded-xl">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center shrink-0">
                          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25" /></svg>
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{v.brand} {v.model}</p>
                          <p className="text-muted text-xs">📅 {v.year}{v.registrationNumber ? ` · 🚗 ${v.registrationNumber}` : ''}</p>
                        </div>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <button onClick={() => startEditVehicle(v)} className="p-2 bg-orange-500/10 text-orange-500 rounded-lg hover:bg-orange-500/20 transition-colors" title={t("adminEdit")}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button onClick={() => deleteVehicle(v.id)} className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors" title={t("adminDelete")}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </div>
                    {passportRows.length > 0 && (
                      <details className="mt-2">
                        <summary className="text-xs text-orange-500 cursor-pointer hover:text-orange-400">
                          Texniki pasport sahələri ({passportRows.length})
                        </summary>
                        <dl className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                          {passportRows.map(([label, val]) => (
                            <div key={label} className="flex justify-between gap-2 border-b border-input-border/30 py-1">
                              <dt className="text-muted shrink-0">{label}</dt>
                              <dd className="text-foreground text-right truncate">{String(val)}</dd>
                            </div>
                          ))}
                        </dl>
                      </details>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Workplaces section - for MECHANIC and PARTS_SELLER */}
      {(profile.type === "MECHANIC" || profile.type === "PARTS_SELLER") && (
        <div className="surface p-5 sm:p-7 mb-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2">
              <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
              {t("workplaces")} ({profile.workplaces?.length || 0})
            </h2>
            {!showWorkplaceForm && (
              <button onClick={startAddWorkplace} className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/10 text-orange-500 rounded-lg text-xs font-medium hover:bg-orange-500/20 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                {t("addWorkplace")}
              </button>
            )}
          </div>

          {showWorkplaceForm && (
            <form onSubmit={submitWorkplace} className="bg-input-bg/50 border border-input-border rounded-xl p-4 mb-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input value={workplaceForm.name} onChange={(e) => setWorkplaceForm({ ...workplaceForm, name: e.target.value })} placeholder="İş yerinin adı" className={inputCls} required />
                <input value={workplaceForm.address} onChange={(e) => setWorkplaceForm({ ...workplaceForm, address: e.target.value })} placeholder="Ünvan" className={inputCls} required />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="px-5 py-2 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl text-white text-sm font-medium">{workplaceForm.id ? t("adminSave") : "Əlavə et"}</button>
                <button type="button" onClick={cancelWorkplaceForm} className="px-5 py-2 bg-input-bg border border-input-border rounded-xl text-sm">{t("adminCancel")}</button>
              </div>
            </form>
          )}

          {!profile.workplaces?.length && !showWorkplaceForm ? (
            <p className="text-muted text-sm text-center py-4">Hələ iş yeri əlavə etməmisiniz.</p>
          ) : (
            <div className="space-y-2">
              {profile.workplaces?.map((w: any) => (
                <div key={w.id} className="flex items-center justify-between gap-3 p-3 bg-input-bg/40 border border-input-border/60 rounded-xl">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{w.name}</p>
                      <p className="text-muted text-xs truncate">{w.address}</p>
                    </div>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={() => startEditWorkplace(w)} className="p-2 bg-orange-500/10 text-orange-500 rounded-lg hover:bg-orange-500/20 transition-colors" title={t("adminEdit")}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <button onClick={() => deleteWorkplace(w.id)} className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors" title={t("adminDelete")}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Email Verification */}
      <div className="surface p-5 sm:p-7 mb-5">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
          {t("emailSection")}
        </h2>

        {emailVerified && (
          <div className="mb-4 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-xl text-green-500 text-sm text-center">
            {t("emailVerified")}
          </div>
        )}
        {emailError && (
          <div className="mb-4 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm text-center">{emailError}</div>
        )}

        {profile.email ? (
          <div className="flex items-center gap-2 mb-4">
            <span className="px-3 py-1.5 bg-green-500/10 text-green-500 border border-green-500/20 rounded-lg text-sm">{profile.email}</span>
            <span className="text-xs text-muted">{t("emailConfirmed")}</span>
          </div>
        ) : null}

        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="email"
              value={emailInput}
              onChange={(e) => { setEmailInput(e.target.value); setEmailCodeSent(false); setEmailError(""); }}
              placeholder={t("emailPlaceholder")}
              className={inputCls + " flex-1"}
            />
            <button
              onClick={handleSendEmailCode}
              disabled={emailLoading || !emailInput}
              className="px-4 py-3 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl text-white text-sm font-medium whitespace-nowrap disabled:opacity-50"
            >
              {emailLoading ? "..." : t("emailSendCode")}
            </button>
          </div>

          {emailCodeSent && (
            <>
              {process.env.NODE_ENV === 'development' && verificationCode && (
                <div className="px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-500 text-sm text-center">
                  {t("testModeLabel")}: <strong>{verificationCode}</strong>
                </div>
              )}
              <div className="flex gap-2">
                <input
                  value={emailCode}
                  onChange={(e) => setEmailCode(e.target.value)}
                  placeholder={t("emailCodePlaceholder")}
                  maxLength={6}
                  className={inputCls + " flex-1"}
                />
                <button
                  onClick={handleVerifyEmail}
                  disabled={emailLoading || !emailCode}
                  className="px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl text-white text-sm font-medium whitespace-nowrap disabled:opacity-50"
                >
                  {emailLoading ? "..." : t("emailVerify")}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Sosial media hesabları */}
      <div className="surface p-5 sm:p-7 mb-5">
        <h2 className="text-lg font-semibold mb-1">Sosial media</h2>
        <p className="text-xs text-muted mb-4">Hesabınızla daxil olun — platforma təsdiqindən sonra profilinizdə “✓” ilə görünəcək.</p>

        {(profile.socialLinks?.length > 0) && (
          <div className="space-y-2 mb-4">
            {profile.socialLinks.map((s: any) => {
              const meta = SOCIAL_META[s.platform] || { label: s.platform, icon: "🔗" };
              return (
                <div key={s.id} className="flex items-center gap-2 bg-input-bg border border-input-border rounded-xl px-3 py-2">
                  <SocialIcon platform={s.platform} className="w-5 h-5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium flex items-center gap-1.5">
                      {meta.label}
                      {s.verified
                        ? <span className="text-[11px] text-green-500 font-semibold">✓ təsdiqlənib</span>
                        : <span className="text-[11px] text-amber-500">gözləyir</span>}
                    </p>
                    <a href={s.url} target="_blank" rel="noreferrer" className="text-xs text-muted truncate block hover:text-orange-500">{s.url}</a>
                  </div>
                  <button onClick={() => deleteSocial(s.id)} className="text-red-500 text-xs shrink-0">Sil</button>
                </div>
              );
            })}
          </div>
        )}

        {/* Ən güclü: OAuth ilə "hesabla təsdiqlə" */}
        <div className="mb-4">
          <p className="text-xs font-semibold text-muted mb-2">Hesabla təsdiqlə <span className="text-green-500">(ən etibarlı)</span></p>
          <div className="flex flex-wrap gap-2">
            {["instagram", "facebook", "tiktok"].map((p) => {
              const on = oauthProviders.includes(p);
              return (
                <button key={p} onClick={() => connectOauth(p)} disabled={!on}
                  title={on ? "" : "Bu platforma üçün OAuth hələ konfiqurasiya olunmayıb"}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-input-border text-sm font-medium hover:border-orange-500/50 disabled:opacity-40 disabled:cursor-not-allowed">
                  <SocialIcon platform={p} className="w-5 h-5" />
                  {SOCIAL_META[p].label} ilə
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-muted mt-1.5">{oauthProviders.length > 0 ? "Hesabla daxil olduqda link platforma tərəfindən təsdiqlənir." : "Hesabla təsdiq hələ aktiv deyil (platforma açarları qoyulmayıb). Aşağıdan əl ilə əlavə edin."}</p>
        </div>

        {/* Əl ilə link əlavə et (admin təsdiqi) — açarsız işlək yol */}
        <p className="text-xs font-semibold text-muted mb-2">Link əlavə et <span className="text-amber-500">(admin təsdiqi)</span></p>
        <div className="flex flex-col sm:flex-row gap-2">
          <select value={socialPlatform} onChange={(e) => setSocialPlatform(e.target.value)} className="px-3 py-2.5 bg-input-bg border border-input-border rounded-xl text-sm text-foreground sm:w-40">
            {Object.entries(SOCIAL_META).map(([k, m]) => <option key={k} value={k}>{m.icon} {m.label}</option>)}
          </select>
          <input value={socialUrl} onChange={(e) => setSocialUrl(e.target.value)} placeholder="https://instagram.com/istifadeci" className="flex-1 px-3 py-2.5 bg-input-bg border border-input-border rounded-xl text-sm text-foreground" />
          <button onClick={addSocial} disabled={socialBusy || !socialUrl.trim()} className="px-4 py-2.5 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50">{socialBusy ? "..." : "Əlavə et"}</button>
        </div>
      </div>

      {/* My Listings */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">{t("myListings")} ({listings.length})</h2>
        <Link href="/account" className="text-sm text-orange-500 hover:text-orange-400 transition-colors">{t("addListing")} &rarr;</Link>
      </div>

      {/* Tabs: Active / Expired */}
      <div className="flex gap-1 bg-input-bg border border-input-border rounded-xl p-1 mb-4 w-fit">
        <button
          onClick={() => setListingTab("active")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${listingTab === "active" ? "bg-orange-500 text-white shadow-sm" : "text-muted hover:text-foreground"}`}
        >
          {t("activeListings")} ({activeListings.length})
        </button>
        <button
          onClick={() => setListingTab("expired")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${listingTab === "expired" ? "bg-orange-500 text-white shadow-sm" : "text-muted hover:text-foreground"}`}
        >
          {t("expiredListings")} ({expiredListings.length})
        </button>
      </div>

      {visibleListings.length === 0 ? (
        <div className="text-center py-12 surface text-muted">
          {listingTab === "active" ? (
            <>
              <p>{t("noListingsYet")}</p>
              <Link href="/account" className="text-orange-500 text-sm mt-2 inline-block">{t("createFirstListing")}</Link>
            </>
          ) : (
            <p>{t("noExpiredListings")}</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {visibleListings.map((l) => {
            const expired = isListingExpired(l);
            const cardInner = (
              <>
                <div className="aspect-[4/3] bg-input-bg overflow-hidden relative">
                  {l.images && l.images.length > 0 ? (
                    <img
                      src={l.images[0].startsWith("http") ? l.images[0] : `${UPLOADS}/${l.images[0]}`}
                      alt={l.title}
                      loading="lazy"
                      className={`w-full h-full object-cover transition-transform duration-500 ease-out ${expired ? "opacity-50 grayscale" : "group-hover:scale-110"}`}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-12 h-12 text-muted-foreground/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                      </svg>
                    </div>
                  )}
                  <div className="absolute top-2 left-2 flex flex-col gap-1.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold backdrop-blur-md shadow-sm ${l.type === "SERVICE" ? "bg-emerald-500/95 text-white" : "bg-orange-500/95 text-white"}`}>
                      {l.type === "SERVICE" ? t("service") : t("product")}
                    </span>
                    {expired && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/95 text-white backdrop-blur-md shadow-sm">
                        {t("expiredBadge")}
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-3 flex-1 flex flex-col">
                  <span className="px-1.5 py-0.5 bg-input-bg border border-input-border rounded text-[10px] w-fit mb-1.5 truncate max-w-full">{l.category}</span>
                  <h3 className="font-medium text-sm truncate">{l.title}</h3>
                  <div className="flex items-center justify-between mt-1.5 mb-2">
                    <span className="text-orange-500 font-bold text-sm">{l.price} AZN</span>
                    <div className="flex items-center gap-2 text-muted text-[10px]">
                      <span className="flex items-center gap-0.5">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        {l.viewCount}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                        {l._count?.comments || 0}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1.5 mt-auto">
                    {expired ? (
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleReactivateListing(l.id); }}
                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-green-500/10 text-green-500 rounded-lg text-xs font-medium hover:bg-green-500/20 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        {t("reactivate")}
                      </button>
                    ) : (
                      <Link
                        href={`/account?edit=${l.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-orange-500/10 text-orange-500 rounded-lg text-xs font-medium hover:bg-orange-500/20 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        {t("adminEdit")}
                      </Link>
                    )}
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteListing(l.id); }}
                      className="flex items-center justify-center px-2 py-1.5 bg-red-500/10 text-red-500 rounded-lg text-xs font-medium hover:bg-red-500/20 transition-colors"
                      title={t("adminDelete")}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
              </>
            );
            return expired ? (
              <div key={l.id} className="bg-card border border-card-border rounded-xl overflow-hidden flex flex-col">
                {cardInner}
              </div>
            ) : (
              <Link
                key={l.id}
                href={`/marketplace/${l.id}`}
                className="bg-card border border-card-border rounded-xl overflow-hidden flex flex-col group hover:border-orange-500/30 transition-colors"
              >
                {cardInner}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
