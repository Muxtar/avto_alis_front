# Kassa SQL — desktop installer placeholder

Navbar-dakı "Kassa SQL Yüklə" düyməsi `/downloads/kassa-sql-setup.zip` faylına işarə edir. Hazırda fayl mövcud deyil — `kassa_sql/` qovluğunda `npm run dist` icra edib yaranan installer-i (DMG / EXE / AppImage) bura kopyalamaq kifayətdir:

```bash
cd kassa_sql
npm run dist
# DMG/EXE/AppImage yaradılır → dist/ qovluğunda
# Onu zip-ə qoy və bura at:
cp "dist/AvtoBazar Kassa-0.1.0.dmg" "../frontend/public/downloads/kassa-sql-setup.zip"
```

Frontend `public/` qovluğunun məzmunu deploy zamanı `https://<domain>/` köküdür, yəni fayl `/downloads/kassa-sql-setup.zip` URL-i ilə birbaşa endirilə bilər.
