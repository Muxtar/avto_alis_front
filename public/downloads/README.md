# Kassa SQL — desktop installer-ləri

Navbar-dakı "Kassa SQL Yüklə" dropdown-u bu fayllara işarə edir:

| Platforma | Fayl | Vəziyyət |
| --- | --- | --- |
| macOS (Apple Silicon) | `AvtoBazar-Kassa-mac.dmg` | ✅ hazırdır |
| Windows | `AvtoBazar-Kassa-win.exe` | ⏳ build et və bura qoy |
| Linux | `AvtoBazar-Kassa-linux.AppImage` | ⏳ build et və bura qoy |

## Yenidən build / yeniləmə (macOS)

```bash
cd kassa_sql
export CSC_IDENTITY_AUTO_DISCOVERY=false   # kod imzalamanı söndür
npm run dist                               # electron-builder → kassa_sql/dist/
cp "dist/AvtoBazar Kassa-0.1.0-arm64.dmg" "../frontend/public/downloads/AvtoBazar-Kassa-mac.dmg"
```

## Windows / Linux installer əlavə etdikdən sonra

Fayl(lar)ı bu qovluğa qoyandan sonra `frontend/src/components/Navbar.tsx`-də
müvafiq `<div ... opacity-50>` bloku `<a href download>` ilə əvəz et və
`comingSoon` yerinə uyğun uzantını yaz.

> Qeyd: DMG ~197 MB-dır. Vercel/git üçün böyükdür — production-da bu faylları
> ayrıca obyekt-storage (S3 / R2 / Railway volume) və ya GitHub Releases-də host
> edib linki ora yönəltmək daha yaxşıdır.
