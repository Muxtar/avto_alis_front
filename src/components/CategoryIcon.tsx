import React from "react";

// Kateqoriyalar üçün vahid xətti (line) SVG ikon dəsti — emoji əvəzinə.
// Modern, monoxrom, brend rənginə uyğun. Tap.az/Umico-dan daha premium görünür.
const PATHS: Record<string, React.ReactNode> = {
  "Nəqliyyat": (<><path d="M5 11l1.6-4.2A2 2 0 0 1 8.5 5.5h7A2 2 0 0 1 17.4 6.8L19 11" /><rect x="3" y="11" width="18" height="6" rx="1.6" /><circle cx="7.5" cy="17" r="1.6" /><circle cx="16.5" cy="17" r="1.6" /></>),
  "Avtomobil ehtiyat hissələri": (<><circle cx="12" cy="12" r="3.2" /><path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6" /></>),
  "Daşınmaz əmlak": (<><path d="M4 11l8-6 8 6" /><path d="M6 9.5V19h12V9.5" /><path d="M10 19v-4.5h4V19" /></>),
  "Elektronika": (<><rect x="7" y="2.5" width="10" height="19" rx="2.2" /><path d="M11 18.5h2" /></>),
  "Məişət texnikası": (<><rect x="5" y="3" width="14" height="18" rx="2.2" /><circle cx="12" cy="13" r="3.8" /><path d="M8.5 6.2h.01M11 6.2h.01" /></>),
  "Ev və bağ": (<><path d="M5 11V8.5A2.5 2.5 0 0 1 7.5 6h9A2.5 2.5 0 0 1 19 8.5V11" /><path d="M3 14.5A2 2 0 0 1 5 12.5h0a2 2 0 0 1 2 2v1.5h10v-1.5a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2V19H3z" /><path d="M6 19v1.5M18 19v1.5" /></>),
  "Tikinti və təmir": (<><rect x="3" y="5.5" width="18" height="4.5" rx="1" /><rect x="3" y="14" width="18" height="4.5" rx="1" /><path d="M9 5.5V10M15 5.5V10M6 14v4.5M12 14v4.5M18 14v4.5" /></>),
  "Geyim və aksesuar": (<><path d="M9 4l3 2 3-2 5 3.5-2.2 3L15 9v11H9V9l-2.8 1.5L4 7.5z" /></>),
  "Gözəllik və sağlamlıq": (<><path d="M12 3l1.9 4.4L18.5 9l-4.6 1.6L12 15l-1.9-4.4L5.5 9l4.6-1.6z" /><path d="M18 14.5l.8 1.7 1.7.8-1.7.8-.8 1.7-.8-1.7-1.7-.8 1.7-.8z" /></>),
  "Uşaq aləmi": (<><circle cx="7.5" cy="6" r="2" /><circle cx="16.5" cy="6" r="2" /><circle cx="12" cy="13.5" r="6" /><path d="M10 12.5h.01M14 12.5h.01" /><path d="M10.3 16a2.5 2.5 0 0 0 3.4 0" /></>),
  "Hobbi və idman": (<><path d="M6.5 6.5l11 11" /><path d="M4.5 8.5L3 10a1.5 1.5 0 0 0 0 2.1l.9.9M19.5 15.5L21 14a1.5 1.5 0 0 0 0-2.1l-.9-.9" /><path d="M6 6L4.5 4.5M19.5 19.5L18 18" /></>),
  "Heyvanlar": (<><circle cx="8" cy="8.5" r="1.6" /><circle cx="16" cy="8.5" r="1.6" /><circle cx="5" cy="13" r="1.4" /><circle cx="19" cy="13" r="1.4" /><path d="M12 13c-2.4 0-4 1.7-4 3.4 0 1.5 1.6 2.6 4 2.6s4-1.1 4-2.6c0-1.7-1.6-3.4-4-3.4z" /></>),
  "Kənd təsərrüfatı": (<><path d="M12 21v-9" /><path d="M12 12c0-3.3 2.2-5.5 6.5-5.5C18.5 9.8 16.3 12 12 12z" /><path d="M12 14.5c0-3.3-2.2-5.5-6.5-5.5C5.5 12.3 7.7 14.5 12 14.5z" /></>),
  "İş elanları": (<><rect x="3" y="7" width="18" height="13" rx="2.2" /><path d="M8 7V5.4A2.4 2.4 0 0 1 10.4 3h3.2A2.4 2.4 0 0 1 16 5.4V7" /><path d="M3 12.5h18" /></>),
  "Xidmətlər": (<><path d="M14.6 6.3a3.6 3.6 0 0 0-4.9 4.6L3.8 16.8a1.6 1.6 0 0 0 0 2.3l1.1 1.1a1.6 1.6 0 0 0 2.3 0l5.9-5.9a3.6 3.6 0 0 0 4.6-4.9l-2.4 2.4-2.1-.4-.4-2.1z" /></>),
  "Digər": (<><rect x="3.5" y="3.5" width="7" height="7" rx="1.6" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.6" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.6" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.6" /></>),
};

export default function CategoryIcon({ name, className = "w-5 h-5" }: { name: string; className?: string }) {
  const path = PATHS[name] || (<><path d="M7 7h10v10H7z" /><path d="M7 12h10M12 7v10" /></>);
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      {path}
    </svg>
  );
}
