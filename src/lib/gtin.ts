// Ştrix-kod (GTIN) yoxlaması — backend services/gtin.ts ilə eyni qayda.
export function normalizeGtin(raw: string | null | undefined): string | null {
  const d = String(raw || "").replace(/\D/g, "");
  if (![8, 12, 13, 14].includes(d.length)) return null;
  const body = d.slice(0, -1).split("").map(Number);
  let sum = 0;
  for (let i = body.length - 1, w = 3; i >= 0; i--, w = w === 3 ? 1 : 3) sum += body[i] * w;
  return (10 - (sum % 10)) % 10 === Number(d[d.length - 1]) ? d : null;
}
