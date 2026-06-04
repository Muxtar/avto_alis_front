"use client";
import { useMemo, useState } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { brandNames } from "@/lib/vehicleData";
import { SELLER_CATEGORIES } from "@/lib/sellerCategories";

interface Props {
  brands: string[];
  allBrands: boolean;
  categories: string[]; // seçilmiş alt-hissə id-ləri
  onBrandsChange: (brands: string[]) => void;
  onAllBrandsChange: (all: boolean) => void;
  onCategoriesChange: (ids: string[]) => void;
}

// Usta / satıcının hansı markalarla və hansı hissə kateqoriyaları üzrə
// işlədiyini seçmək üçün UI. complete-profile (MECHANIC/PARTS_SELLER) içində.
export default function ServiceSpecialtyPicker({
  brands, allBrands, categories,
  onBrandsChange, onAllBrandsChange, onCategoriesChange,
}: Props) {
  const { t } = useLanguage();
  const [brandQuery, setBrandQuery] = useState("");
  const [openCat, setOpenCat] = useState<string | null>(null);

  const selected = useMemo(() => new Set(categories), [categories]);

  const filteredBrands = useMemo(() => {
    const q = brandQuery.trim().toLowerCase();
    return q ? brandNames.filter((b) => b.toLowerCase().includes(q)) : brandNames;
  }, [brandQuery]);

  const toggleBrand = (b: string) => {
    onBrandsChange(brands.includes(b) ? brands.filter((x) => x !== b) : [...brands, b]);
  };

  const togglePart = (partId: string) => {
    const next = new Set(selected);
    next.has(partId) ? next.delete(partId) : next.add(partId);
    onCategoriesChange([...next]);
  };

  const toggleWholeCategory = (catId: string) => {
    const cat = SELLER_CATEGORIES.find((c) => c.id === catId);
    if (!cat) return;
    const partIds = cat.parts.map((p) => p.id);
    const allOn = partIds.every((id) => selected.has(id));
    const next = new Set(selected);
    if (allOn) partIds.forEach((id) => next.delete(id));
    else partIds.forEach((id) => next.add(id));
    onCategoriesChange([...next]);
  };

  const countInCat = (catId: string) => {
    const cat = SELLER_CATEGORIES.find((c) => c.id === catId);
    if (!cat) return 0;
    return cat.parts.filter((p) => selected.has(p.id)).length;
  };

  const chip = "px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer select-none";

  return (
    <div className="space-y-6">
      {/* ===== Markalar ===== */}
      <div className="space-y-3">
        <div>
          <h3 className="text-base font-semibold">{t("serviceBrandsTitle")}</h3>
          <p className="text-xs text-muted">{t("serviceBrandsDesc")}</p>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={allBrands}
            onChange={(e) => onAllBrandsChange(e.target.checked)}
            className="w-4 h-4 accent-orange-500"
          />
          <span className="text-sm font-medium">{t("allBrands")}</span>
        </label>

        {!allBrands && (
          <div className="space-y-2">
            <input
              type="text"
              value={brandQuery}
              onChange={(e) => setBrandQuery(e.target.value)}
              placeholder={t("searchBrandPlaceholder")}
              className="w-full px-3 py-2 bg-input-bg border border-input-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 placeholder-muted-foreground text-foreground"
            />
            {brands.length > 0 && (
              <p className="text-xs text-muted">{t("selectedLabel")}: {brands.length}</p>
            )}
            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1">
              {filteredBrands.map((b) => {
                const on = brands.includes(b);
                return (
                  <button
                    type="button"
                    key={b}
                    onClick={() => toggleBrand(b)}
                    className={`${chip} ${on ? "bg-orange-500 border-orange-500 text-white" : "bg-input-bg border-input-border hover:border-orange-500/40 text-foreground"}`}
                  >
                    {b}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ===== İxtisas kateqoriyaları ===== */}
      <div className="space-y-3 pt-2 border-t border-input-border/40">
        <div>
          <h3 className="text-base font-semibold">{t("serviceCategoriesTitle")}</h3>
          <p className="text-xs text-muted">{t("serviceCategoriesDesc")}</p>
        </div>

        <div className="space-y-2">
          {SELLER_CATEGORIES.map((cat) => {
            const count = countInCat(cat.id);
            const total = cat.parts.length;
            const allOn = count === total;
            const open = openCat === cat.id;
            return (
              <div key={cat.id} className="border border-input-border/60 rounded-xl overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2.5 bg-input-bg/40">
                  <input
                    type="checkbox"
                    checked={allOn}
                    ref={(el) => { if (el) el.indeterminate = count > 0 && !allOn; }}
                    onChange={() => toggleWholeCategory(cat.id)}
                    className="w-4 h-4 accent-orange-500 shrink-0"
                  />
                  <button
                    type="button"
                    onClick={() => setOpenCat(open ? null : cat.id)}
                    className="flex-1 flex items-center justify-between text-left"
                  >
                    <span className="text-sm font-medium">
                      {cat.name}
                      {count > 0 && <span className="ml-2 text-xs text-orange-500">({count})</span>}
                    </span>
                    <svg className={`w-4 h-4 text-muted transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
                {open && (
                  <div className="flex flex-wrap gap-2 p-3">
                    {cat.parts.map((p) => {
                      const on = selected.has(p.id);
                      return (
                        <button
                          type="button"
                          key={p.id}
                          onClick={() => togglePart(p.id)}
                          className={`${chip} ${on ? "bg-orange-500 border-orange-500 text-white" : "bg-input-bg border-input-border hover:border-orange-500/40 text-foreground"}`}
                        >
                          {p.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
