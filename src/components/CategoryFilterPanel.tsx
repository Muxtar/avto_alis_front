"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronUp, ChevronDown } from "lucide-react";
import { API } from "@/lib/api";
import { parseCat, catToSlugs, buildCat, getSubs, getLeaves } from "@/lib/categories";
import { cn } from "@/lib/utils";

type Props = {
  category: string;                 // "Elektronika" və ya "Elektronika>Telefonlar"
  type?: string;
  minPrice: string; setMinPrice: (v: string) => void;
  maxPrice: string; setMaxPrice: (v: string) => void;
  city: string; setCity: (v: string) => void;
  brand: string; setBrand: (v: string) => void;
  condition: string; setCondition: (v: string) => void;
  onReset: () => void;
  activeCount: number;
};

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-card-border py-4">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between text-left">
        <span className="font-bold text-[15px]">{title}</span>
        {open ? <ChevronUp className="w-4 h-4 text-muted shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted shrink-0" />}
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}

export default function CategoryFilterPanel(p: Props) {
  const { main, sub, leaf } = parseCat(p.category);
  const [brands, setBrands] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [brandQuery, setBrandQuery] = useState("");

  useEffect(() => {
    const q = new URLSearchParams({ category: main || "" });
    if (p.type && p.type !== "all") q.set("type", p.type);
    fetch(`${API}/listings/filters?${q}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) { setBrands(d.brands || []); setCities(d.cities || []); } })
      .catch(() => {});
  }, [main, p.type]);

  const shownBrands = brands.filter((b) => b.toLowerCase().includes(brandQuery.toLowerCase()));
  const mainSlug = catToSlugs(main).join("/");
  const subSlug = sub ? catToSlugs(buildCat(main, sub)).join("/") : "";
  // Cari səviyyənin uşaqları — ana səhifədəysə alt kateqoriyalar, alt kateqoriyadaysa
  // alt-alt kateqoriyalar. Alt-alt seçilibsə qardaşları göstərilir (tez dəyişmək üçün).
  const children: { name: string; href: string; active: boolean }[] = sub
    ? getLeaves(main, sub).map((l) => ({
        name: l,
        href: `/elanlar/${catToSlugs(buildCat(main, sub, l)).join("/")}`,
        active: leaf === l,
      }))
    : getSubs(main).map((s2) => ({
        name: s2,
        href: `/elanlar/${catToSlugs(buildCat(main, s2)).join("/")}`,
        active: false,
      }));

  return (
    <div className="surface p-4 sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto">
      {/* Kateqoriya yolu */}
      <nav className="space-y-2 mb-4 text-[15px]">
        <Link href="/elanlar" className="flex items-center gap-1.5 text-foreground hover:text-primary transition-colors">
          <ChevronLeft className="w-4 h-4 shrink-0" /> Bütün kateqoriyalar
        </Link>
        {sub ? (
          <>
            <Link href={`/elanlar/${mainSlug}`} className="flex items-center gap-1.5 text-foreground hover:text-primary transition-colors">
              <ChevronLeft className="w-4 h-4 shrink-0" /> {main}
            </Link>
            {leaf ? (
              <>
                <Link href={`/elanlar/${subSlug}`} className="flex items-center gap-1.5 pl-5 text-foreground hover:text-primary transition-colors">
                  <ChevronLeft className="w-4 h-4 shrink-0" /> {sub}
                </Link>
                <p className="font-bold pl-10">{leaf}</p>
              </>
            ) : (
              <p className="font-bold pl-5">{sub}</p>
            )}
          </>
        ) : (
          <p className="font-bold pl-5">{main}</p>
        )}
      </nav>

      {/* Alt kateqoriyalar — bir səviyyə dərinə keçid (3 səviyyəli taksonomiya) */}
      {children.length > 0 && (
        <nav className="mb-4 border-t border-card-border pt-3 space-y-0.5 max-h-64 overflow-y-auto">
          <p className="text-xs font-semibold text-muted mb-1.5">{sub ? "Alt kateqoriyalar" : "Kateqoriyalar"}</p>
          {children.map((c) => (
            <Link key={c.name} href={c.href}
              className={cn("block py-1 text-sm transition-colors", c.active ? "text-primary font-semibold" : "text-foreground hover:text-primary")}>
              {c.name}
            </Link>
          ))}
        </nav>
      )}

      {/* Başlıq + sıfırla */}
      <div className="flex items-center justify-between pt-2">
        <span className="font-bold text-[15px]">Filtrlər</span>
        <button
          onClick={p.onReset}
          disabled={p.activeCount === 0}
          className={cn("text-sm transition-colors", p.activeCount ? "text-primary hover:underline" : "text-muted-foreground cursor-default")}
        >
          Sıfırla
        </button>
      </div>

      {/* Qiymət */}
      <Section title="Qiymət, AZN">
        <div className="grid grid-cols-2 gap-2">
          <input inputMode="numeric" value={p.minPrice} onChange={(e) => p.setMinPrice(e.target.value.replace(/\D/g, ""))} placeholder="min."
            className="w-full px-3 py-2.5 bg-input-bg border border-input-border text-sm focus:outline-none focus:border-primary" />
          <input inputMode="numeric" value={p.maxPrice} onChange={(e) => p.setMaxPrice(e.target.value.replace(/\D/g, ""))} placeholder="maks."
            className="w-full px-3 py-2.5 bg-input-bg border border-input-border text-sm focus:outline-none focus:border-primary" />
        </div>
      </Section>

      {/* Şəhər */}
      <Section title="Şəhər" defaultOpen={false}>
        <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
          {cities.length === 0 ? <p className="text-xs text-muted">Məlumat yoxdur</p> : cities.map((c) => (
            <label key={c} className="flex items-center gap-2.5 py-1 cursor-pointer group">
              <input type="radio" name="city" checked={p.city === c} onChange={() => p.setCity(p.city === c ? "" : c)}
                className="w-4 h-4 accent-primary shrink-0" />
              <span className="text-sm group-hover:text-primary transition-colors">{c}</span>
            </label>
          ))}
        </div>
        {p.city && <button onClick={() => p.setCity("")} className="mt-2 text-xs text-primary hover:underline">Şəhəri təmizlə</button>}
      </Section>

      {/* Marka */}
      {brands.length > 0 && (
        <Section title="Marka">
          <input value={brandQuery} onChange={(e) => setBrandQuery(e.target.value)} placeholder="Axtarış"
            className="w-full px-3 py-2.5 mb-3 bg-input-bg border border-input-border text-sm focus:outline-none focus:border-primary" />
          <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
            {shownBrands.length === 0 ? <p className="text-xs text-muted">Tapılmadı</p> : shownBrands.map((b) => (
              <label key={b} className="flex items-center gap-2.5 py-1 cursor-pointer group">
                <input type="radio" name="brand" checked={p.brand === b} onChange={() => p.setBrand(p.brand === b ? "" : b)}
                  className="w-4 h-4 accent-primary shrink-0" />
                <span className="text-sm group-hover:text-primary transition-colors">{b}</span>
              </label>
            ))}
          </div>
          {p.brand && <button onClick={() => p.setBrand("")} className="mt-2 text-xs text-primary hover:underline">Markanı təmizlə</button>}
        </Section>
      )}

      {/* Yeni? */}
      <Section title="Yeni?">
        <div className="flex flex-wrap gap-2">
          {[
            { v: "", l: "Vacib deyil" },
            { v: "NEW", l: "Bəli" },
            { v: "USED", l: "Xeyr" },
          ].map((o) => (
            <button key={o.l} onClick={() => p.setCondition(o.v)}
              className={cn(
                "px-4 py-2 text-sm font-medium transition-colors",
                p.condition === o.v ? "bg-primary text-white" : "bg-input-bg text-foreground hover:bg-primary/10"
              )}>
              {o.l}
            </button>
          ))}
        </div>
      </Section>
    </div>
  );
}
