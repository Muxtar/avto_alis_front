// Komponentlərdə birbaşa yazılmış AZ mətnlərini tapır və RU/EN lüğətində
// (src/lib/i18n/{ru,en}.json) olmayanları göstərir.
//
//   node scripts/i18n-extract.mjs            → tərcüməsiz mətnlərin siyahısı
//   node scripts/i18n-extract.mjs --json f   → onları f faylına yazır (tərcümə üçün)
//
// Tərcüməni lüğətə əlavə etmək: açar = AZ mətn (boşluqlar tək), dəyər = tərcümə.
// `${x}` olan template-lər `{0}`, `{1}` ilə yazılır: "{0} məhsul" → "{0} товаров".
import ts from "typescript";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const here = path.dirname(new URL(import.meta.url).pathname);
const front = path.resolve(here, "..");
const roots = [path.join(front, "src"), path.resolve(front, "../backend/src")].filter((p) => fs.existsSync(p));
const AZ = /[əğıöüşçƏĞİÖÜŞÇ]/;
const UIATTR = /^(placeholder|title|aria-label|alt|label)$/;
const UIPROP = /^(label|title|desc|description|placeholder|text|message|name|hint|subtitle|heading|note|tooltip|caption|empty|error|body|question|answer|short|long|cta|button|info|help|tip)/i;
const CSSISH = /\b(flex|px-|py-|text-|bg-|rounded|border-|grid|items-|w-|h-)/;
const SKIPFILE = /translations\.ts$|i18n|AI\.ts$|aiAgent|searchTerms|ocr|\/tools\//i;

const found = new Map();
const add = (s, f) => {
  s = s.replace(/\s+/g, " ").trim();
  if (!s || !/[A-Za-zƏəĞğİıÖöÜüŞşÇç]{2}/.test(s)) return;
  if (!found.has(s)) found.set(s, path.relative(front, f));
};

for (const root of roots) {
  const backend = root.includes(`${path.sep}backend${path.sep}`);
  const files = execSync(`find "${root}" \\( -name "*.ts" -o -name "*.tsx" \\)`).toString().trim().split("\n").filter((f) => f && !SKIPFILE.test(f));
  for (const f of files) {
    const sf = ts.createSourceFile(f, fs.readFileSync(f, "utf8"), ts.ScriptTarget.Latest, true, f.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const visit = (n) => {
      if (ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) return;
      if (ts.isJsxText(n)) add(n.text, f);
      else if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) {
        const s = n.text, p = n.parent;
        let ui = AZ.test(s);
        if (!ui && p) {
          if (ts.isJsxAttribute(p) && UIATTR.test(p.name.getText())) ui = true;
          else if (ts.isPropertyAssignment(p) && p.initializer === n && UIPROP.test(p.name.getText().replace(/["']/g, ""))) ui = true;
          else if (ts.isJsxExpression(p) || ts.isConditionalExpression(p) || (ts.isBinaryExpression(p) && /\|\||\?\?/.test(p.operatorToken.getText()))) ui = /^[A-ZƏĞİÖÜŞÇ]/.test(s) && /[a-zəğıöüşç]/.test(s);
        }
        if (backend && s.length > 220) ui = false;
        if (ui && !/^(https?:|\/|#|@|[a-z0-9_.-]+$|[a-z]+[A-Z]\w*$)/.test(s) && !CSSISH.test(s)) add(s, f);
      } else if (ts.isTemplateExpression(n)) {
        const s = n.head.text + n.templateSpans.map((sp, i) => `{${i}}` + sp.literal.text).join("");
        const lit = s.replace(/\{\d+\}/g, "");
        if (AZ.test(lit) && !CSSISH.test(lit) && !lit.startsWith("/")) add(s, f);
      }
      ts.forEachChild(n, visit);
    };
    visit(sf);
  }
}

const ru = JSON.parse(fs.readFileSync(path.join(front, "src/lib/i18n/ru.json"), "utf8"));
const skip = new Set(JSON.parse(fs.readFileSync(path.join(front, "src/lib/i18n/skip.json"), "utf8")));
const missing = [...found].filter(([s]) => !(s in ru) && !skip.has(s));
const out = process.argv.indexOf("--json");
if (out > 0) {
  fs.writeFileSync(process.argv[out + 1], JSON.stringify(missing.map(([s, f]) => ({ s, f })), null, 1));
  console.log(`${missing.length} tərcüməsiz mətn → ${process.argv[out + 1]}`);
} else {
  for (const [s, f] of missing) console.log(`${f}\t${s}`);
  console.log(`\n${found.size} mətn, ${missing.length} tərcüməsiz`);
}
