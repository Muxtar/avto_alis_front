"use client";
/* ──────────────────────────────────────────────────────────────────────────
   Kateqoriya "mega menyu" — birmarket.az üslubu.

   • Sol reyd (rail) — ana kateqoriyalar.
   • Ana kateqoriyanın ÜZƏRİNƏ gələndə SAĞDA panel açılır (alt kateqoriyalar).
   • Alt kateqoriyanın üzərinə gələndə həmin panelin SAĞINDA 3-cü sütun açılır
     (alt-alt kateqoriyalar) — taksonomiya artıq 3 səviyyəlidir.
   • Menyu açıq olanda arxa fon bulanıqlaşır (backdrop-blur) — fokus menyudadır.

   Menyu iki yerdə işlədilir:
     variant="landing"  → ana səhifə hero blokundakı sol sütun
     variant="dropdown" → header-dəki "Kataloq" düyməsinin menyusu
   Telefonda hover yoxdur → akkordeon (ana → alt → alt-alt).
   ────────────────────────────────────────────────────────────────────────── */
import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { CATEGORIES, catToSlugs, buildCat, parseCat, type MainCategory, type SubCategory } from "@/lib/categories";
import CategoryIcon, { SubCategoryIcon } from "@/components/CategoryIcon";

const SUB_COL = 292;  // alt kateqoriya sütununun eni (px)
const LEAF_COL = 268; // alt-alt sütununun eni (px)
const GAP = 8;        // ekran kənarından minimal boşluq

type Anchor = { top: number; left: number; height: number };

export default function CategoryMegaMenu({
  variant = "landing",
  fill = false,
  selectedCategory = null,
  onNavigate,
}: {
  variant?: "landing" | "dropdown";
  fill?: boolean;
  selectedCategory?: string | null;
  onNavigate?: () => void;
}) {
  const railRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [openMain, setOpenMain] = useState<MainCategory | null>(null);
  const [openSub, setOpenSub] = useState<SubCategory | null>(null);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  // Telefon (hover yoxdur) — akkordeon açılışları
  const [expMain, setExpMain] = useState<string | null>(null);
  const [expSub, setExpSub] = useState<string | null>(null);

  const sel = parseCat(selectedCategory || "");

  const clearTimer = () => { if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; } };
  const close = useCallback(() => { clearTimer(); setOpenMain(null); setOpenSub(null); setAnchor(null); }, []);
  const closeSoon = () => { clearTimer(); closeTimer.current = setTimeout(close, 160); };

  // Ana kateqoriyanın üzərinə gələndə paneli reydin sağına bağla.
  // Yalnız masaüstündə: telefonda "hover" toxunuşdan yaranır — panel `hidden lg:flex`
  // olduğu üçün görünmür, amma arxa fon bulanıqlığı işə düşürdü (səhv görünüş).
  const openAt = (c: MainCategory) => {
    if (typeof window === "undefined" || !window.matchMedia("(min-width: 1024px)").matches) return;
    clearTimer();
    const r = railRef.current?.getBoundingClientRect();
    if (r) setAnchor({ top: r.top, left: r.right, height: r.height });
    setOpenMain(c);
    setOpenSub(null);
  };

  // Scroll/resize/Escape → menyunu bağla (fixed panel yerində "ilişib" qalmasın).
  useEffect(() => {
    if (!openMain) return;
    const onScroll = () => close();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("keydown", onKey);
    };
  }, [openMain, close]);

  useEffect(() => () => clearTimer(), []);

  const go = () => { close(); onNavigate?.(); };

  const isLanding = variant === "landing";
  const leaves = openSub?.subs || [];
  const panelW = SUB_COL + (leaves.length ? LEAF_COL : 0);

  // Panelin yerləşməsi və HÜNDÜRLÜYÜ.
  // Panel reyddən UZUN OLMUR — alt/alt-alt siyahılar sığmayanda sütunun
  // içində scroll olunur (əvvəl panel aşağı uzanıb səhifəni örtürdü).
  let panelLeft = anchor?.left ?? 0;
  let panelTop = anchor?.top ?? 0;
  let panelH = anchor?.height ?? 0;
  if (typeof window !== "undefined" && anchor) {
    panelLeft = Math.max(GAP, Math.min(panelLeft, window.innerWidth - panelW - GAP));
    panelH = Math.min(Math.max(anchor.height, 260), window.innerHeight - GAP * 2);
    panelTop = Math.max(GAP, Math.min(panelTop, window.innerHeight - panelH - GAP));
  }

  return (
    <>
      {/* Arxa fon bulanıqlığı — bütün səhifənin üstündə (header-in altında qalır). */}
      {openMain && typeof document !== "undefined" && createPortal(
        <div
          aria-hidden
          className="fixed inset-0 z-[45] pointer-events-none transition-opacity duration-150"
          style={{ background: "rgba(15,23,42,.28)", backdropFilter: "blur(3px)", WebkitBackdropFilter: "blur(3px)" }}
        />,
        document.body,
      )}

      <div
        ref={railRef}
        onMouseLeave={closeSoon}
        style={{
          zIndex: openMain ? 46 : undefined,
          ...(isLanding ? { background: "var(--landing-tile)", borderColor: "var(--landing-line)" } : {}),
        }}
        className={
          isLanding
            ? (fill ? "absolute inset-0 flex flex-col border" : "sticky top-20 z-30 flex flex-col border shadow-sm")
            : "relative flex flex-col"
        }
      >
        {/* Başlıq zolağı */}
        <div
          className={`shrink-0 flex items-center gap-2 text-white font-bold tracking-wide ${isLanding ? "px-3.5 py-2 text-[12.5px]" : "px-4 py-2.5 text-[13px]"}`}
          style={{ background: "var(--nav-dark)" }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          Kateqoriyalar
        </div>

        {/* Ana kateqoriyalar */}
        <nav className={isLanding ? (fill ? "flex-1 min-h-0 overflow-y-auto" : "max-h-[62vh] overflow-y-auto") : "max-h-[70vh] sm:max-h-[72vh] overflow-y-auto"}>
          {CATEGORIES.map((c) => {
            const active = sel.main === c.name;
            const hot = openMain?.name === c.name;
            const hasSubs = c.subs.length > 0;
            const expanded = expMain === c.name;
            return (
              <div key={c.name}>
                <div
                  onMouseEnter={() => { if (hasSubs) openAt(c); else close(); }}
                  className={`group/c relative flex items-center gap-3 transition-colors ${isLanding ? "px-3.5 py-2 text-[13px]" : "px-4 py-2.5 text-sm"} ${active || hot ? "text-[var(--brand-to)]" : "text-foreground"} ${hot ? "bg-[var(--brand-soft)]" : "hover:bg-[var(--brand-soft)]"}`}
                >
                  {(active || hot) && <span className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: "var(--brand-to)" }} />}
                  <Link href={`/elanlar/${catToSlugs(c.name).join("/")}`} onClick={go} className="flex items-center gap-3 min-w-0 flex-1">
                    <span className={`${isLanding ? "w-6 h-6" : "w-8 h-8 rounded-lg bg-input-bg group-hover/c:bg-[var(--brand-to)] group-hover/c:text-white"} flex items-center justify-center shrink-0 transition-colors ${active || hot ? "text-[var(--brand-to)]" : "text-muted"}`}>
                      <CategoryIcon name={c.name} className="w-[18px] h-[18px]" />
                    </span>
                    <span className={`flex-1 line-clamp-2 font-medium ${active ? "font-semibold" : ""} group-hover/c:text-[var(--brand-to)]`}>{c.name}</span>
                  </Link>
                  {hasSubs && (
                    <>
                      {/* Telefon: ox akkordeonu açır */}
                      <button
                        type="button" aria-label="Alt kateqoriyalar" aria-expanded={expanded}
                        onClick={() => { setExpMain(expanded ? null : c.name); setExpSub(null); }}
                        className="lg:hidden shrink-0 -mr-1 p-1.5 rounded-lg hover:bg-[var(--brand-soft)]"
                      >
                        <svg className={`w-4 h-4 text-muted transition-transform ${expanded ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      </button>
                      {/* Masaüstü: yalnız göstərici ox */}
                      <svg className={`hidden lg:block w-2.5 h-2.5 shrink-0 transition-all ${hot ? "text-[var(--brand-to)] translate-x-0.5" : "text-[#bdbfcd] group-hover/c:text-[var(--brand-to)]"}`} viewBox="0 0 9 6" fill="currentColor" style={{ transform: "rotate(270deg)" }}>
                        <path fillRule="evenodd" clipRule="evenodd" d="M7.06 0L4 3.05333L0.94 0L0 0.94L4 4.94L8 0.94L7.06 0Z" />
                      </svg>
                    </>
                  )}
                </div>

                {/* ── TELEFON akkordeonu: alt və alt-alt kateqoriyalar ── */}
                {hasSubs && expanded && (
                  <div className="lg:hidden bg-input-bg/40 border-y border-card-border">
                    <Link href={`/elanlar/${catToSlugs(c.name).join("/")}`} onClick={go}
                      className="block pl-14 pr-4 py-2 text-[13px] font-bold text-[var(--brand-to)]">
                      Hamısına bax →
                    </Link>
                    {c.subs.map((sub) => {
                      const subExpanded = expSub === sub.name;
                      const hasLeaf = !!sub.subs?.length;
                      return (
                        <div key={sub.name}>
                          <div className="flex items-center gap-2.5 pl-14 pr-2 py-2 text-[13px] text-foreground">
                            <Link href={`/elanlar/${catToSlugs(buildCat(c.name, sub.name)).join("/")}`} onClick={go}
                              className="flex items-center gap-2.5 min-w-0 flex-1">
                              <SubCategoryIcon name={sub.name} parent={c.name} className="w-4 h-4 shrink-0 text-muted" />
                              <span className="truncate">{sub.name}</span>
                            </Link>
                            {hasLeaf && (
                              <button type="button" aria-label="Alt-alt kateqoriyalar" aria-expanded={subExpanded}
                                onClick={() => setExpSub(subExpanded ? null : sub.name)}
                                className="shrink-0 p-1.5 rounded-lg hover:bg-[var(--brand-soft)]">
                                <svg className={`w-3.5 h-3.5 text-muted transition-transform ${subExpanded ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                              </button>
                            )}
                          </div>
                          {hasLeaf && subExpanded && (
                            <div className="pb-1">
                              {sub.subs!.map((leaf) => (
                                <Link key={leaf.name} href={`/elanlar/${catToSlugs(buildCat(c.name, sub.name, leaf.name)).join("/")}`} onClick={go}
                                  className="block pl-[4.75rem] pr-4 py-1.5 text-[12.5px] text-muted hover:text-[var(--brand-to)]">
                                  {leaf.name}
                                </Link>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Alt zolaq */}
        <Link href="/elanlar" onClick={go}
          style={isLanding ? { borderColor: "var(--landing-line)" } : undefined}
          className={`shrink-0 flex items-center gap-2 border-t font-bold text-[var(--brand-to)] hover:bg-[var(--brand-soft)] transition-colors ${isLanding ? "px-3.5 py-2.5 text-[12.5px]" : "px-4 py-3 text-sm border-card-border"}`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          Bütün kateqoriyalar
        </Link>

        {/* ── MASAÜSTÜ: sağa açılan panel (alt + alt-alt sütunları) ── */}
        {openMain && anchor && (
          <div
            onMouseEnter={clearTimer}
            onMouseLeave={closeSoon}
            style={{ position: "fixed", top: panelTop, left: panelLeft, width: panelW, height: panelH }}
            className="hidden lg:flex z-[47] bg-card text-foreground border border-card-border shadow-2xl animate-fade-in"
          >
            {/* Sütun 1 — alt kateqoriyalar */}
            <div className="flex flex-col min-h-0" style={{ width: SUB_COL }}>
              <div className="sticky top-0 z-10 flex items-center gap-2 px-4 py-2.5 text-white text-[13px] font-bold tracking-wide shrink-0" style={{ background: "var(--nav-dark)" }}>
                <CategoryIcon name={openMain.name} className="w-[18px] h-[18px] shrink-0" />
                <span className="truncate">{openMain.name}</span>
              </div>
              <Link href={`/elanlar/${catToSlugs(openMain.name).join("/")}`} onClick={go}
                className="shrink-0 flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b border-card-border text-[var(--brand-to)] hover:bg-[var(--brand-soft)] transition-colors">
                Hamısına bax →
              </Link>
              <div className="flex-1 min-h-0 overflow-y-auto py-1">
                {openMain.subs.map((sub) => {
                  const hasLeaf = !!sub.subs?.length;
                  const hot = openSub?.name === sub.name;
                  const activeSub = sel.main === openMain.name && sel.sub === sub.name;
                  return (
                    <Link
                      key={sub.name}
                      href={`/elanlar/${catToSlugs(buildCat(openMain.name, sub.name)).join("/")}`}
                      onClick={go}
                      onMouseEnter={() => setOpenSub(hasLeaf ? sub : null)}
                      className={`group/sub flex items-center gap-3 px-4 py-2 text-[13.5px] transition-colors ${hot || activeSub ? "bg-[var(--brand-soft)] text-[var(--brand-to)]" : "text-foreground hover:bg-[var(--brand-soft)] hover:text-[var(--brand-to)]"}`}
                    >
                      <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${hot ? "bg-[var(--brand-to)] text-white" : "bg-input-bg text-muted group-hover/sub:bg-[var(--brand-to)] group-hover/sub:text-white"}`}>
                        <SubCategoryIcon name={sub.name} parent={openMain.name} className="w-[17px] h-[17px]" />
                      </span>
                      <span className="flex-1 line-clamp-2 font-medium leading-tight">{sub.name}</span>
                      {hasLeaf && (
                        <svg className={`w-2.5 h-2.5 shrink-0 ${hot ? "text-[var(--brand-to)]" : "text-[#bdbfcd] group-hover/sub:text-[var(--brand-to)]"}`} viewBox="0 0 9 6" fill="currentColor" style={{ transform: "rotate(270deg)" }}>
                          <path fillRule="evenodd" clipRule="evenodd" d="M7.06 0L4 3.05333L0.94 0L0 0.94L4 4.94L8 0.94L7.06 0Z" />
                        </svg>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Sütun 2 — alt-alt kateqoriyalar (yalnız varsa) */}
            {!!leaves.length && openSub && (
              <div className="flex flex-col min-h-0 border-l border-card-border bg-[var(--landing-bg)]" style={{ width: LEAF_COL }}>
                <Link href={`/elanlar/${catToSlugs(buildCat(openMain.name, openSub.name)).join("/")}`} onClick={go}
                  className="shrink-0 flex items-center gap-2 px-4 py-2.5 border-b border-card-border text-[13px] font-bold text-foreground hover:text-[var(--brand-to)] transition-colors">
                  <SubCategoryIcon name={openSub.name} parent={openMain.name} className="w-[17px] h-[17px] shrink-0 text-[var(--brand-to)]" />
                  <span className="truncate">{openSub.name}</span>
                </Link>
                <div className="flex-1 min-h-0 overflow-y-auto py-1.5">
                  {leaves.map((leaf) => (
                    <Link key={leaf.name} href={`/elanlar/${catToSlugs(buildCat(openMain.name, openSub.name, leaf.name)).join("/")}`} onClick={go}
                      className={`block px-4 py-[7px] text-[13px] leading-snug transition-colors ${sel.leaf === leaf.name && sel.sub === openSub.name ? "text-[var(--brand-to)] font-semibold" : "text-foreground/85 hover:text-[var(--brand-to)]"}`}>
                      {leaf.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
