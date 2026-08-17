// Chat üçün ikon dəsti — nazik xətli (stroke) SVG-lər.
//
// Əvvəl hər yerdə emoji vardı (💬 👥 👤 🏢 ➕). Emoji hər əməliyyat sistemində
// fərqli çəkilir, rəngi mətnin rənginə tabe olmur və interfeys "kobud" görünür.
// Bu ikonlar `currentColor` ilə işləyir: aktiv/passiv vəziyyətdə mətnlə eyni
// rəngi alır və ölçüsü bir yerdən idarə olunur.

type P = { className?: string };
const base = "w-4 h-4 shrink-0";
const S = ({ className, children }: P & { children: React.ReactNode }) => (
  <svg className={className || base} fill="none" stroke="currentColor" strokeWidth={1.7}
    strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
    {children}
  </svg>
);

export const Ico = {
  Chat: (p: P) => <S {...p}><path d="M8 10.5h8M8 14h5M21 12a8.5 8.5 0 0 1-12.4 7.6L3 21l1.4-5.1A8.5 8.5 0 1 1 21 12Z" /></S>,
  Users: (p: P) => <S {...p}><path d="M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM22 19v-1a4 4 0 0 0-3-3.9M16 4.1a4 4 0 0 1 0 7.8" /></S>,
  User: (p: P) => <S {...p}><path d="M19 20v-1a5 5 0 0 0-5-5h-4a5 5 0 0 0-5 5v1M12 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" /></S>,
  Store: (p: P) => <S {...p}><path d="M4 9.5V20h16V9.5M3 9.5 4.6 4.8A1.2 1.2 0 0 1 5.7 4h12.6a1.2 1.2 0 0 1 1.1.8L21 9.5a2.5 2.5 0 0 1-4.5 1.6 2.5 2.5 0 0 1-4.5 0 2.5 2.5 0 0 1-4.5 0A2.5 2.5 0 0 1 3 9.5ZM10 20v-5h4v5" /></S>,
  Plus: (p: P) => <S {...p}><path d="M12 5v14M5 12h14" /></S>,
  Search: (p: P) => <S {...p}><path d="m21 21-4.3-4.3M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z" /></S>,
  Close: (p: P) => <S {...p}><path d="M18 6 6 18M6 6l12 12" /></S>,
  Info: (p: P) => <S {...p}><path d="M12 16v-5M12 8h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></S>,
  Phone: (p: P) => <S {...p}><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z" /></S>,
  Video: (p: P) => <S {...p}><path d="m22 8-6 4 6 4V8ZM14 6H4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2Z" /></S>,
  Block: (p: P) => <S {...p}><path d="M4.9 4.9 19.1 19.1M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></S>,
  Trash: (p: P) => <S {...p}><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-.9 13a2 2 0 0 1-2 1.9H7.9a2 2 0 0 1-2-1.9L5 6M10 11v6M14 11v6" /></S>,
  Tag: (p: P) => <S {...p}><path d="M7.5 7.5h.01M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0l-7.2-7.2A2 2 0 0 1 2.8 12V4.8A2 2 0 0 1 4.8 2.8H12a2 2 0 0 1 1.4.6l7.2 7.2a2 2 0 0 1 0 2.8Z" /></S>,
  Globe: (p: P) => <S {...p}><path d="M2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20ZM21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></S>,
};

export default Ico;
