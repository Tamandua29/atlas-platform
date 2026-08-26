export type WarrantAttention =
  "active" | "expiring" | "expired" | "closed" | "unknown";

function normalize(value: string | null): string {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function asDate(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function classifyWarrantAttention(
  status: string | null,
  expiresAt: string | null,
  now = new Date(),
): WarrantAttention {
  const normalizedStatus = normalize(status);
  if (/cumprid|revog|cancel|encerr|baixad/.test(normalizedStatus))
    return "closed";
  if (/expir|vencid/.test(normalizedStatus)) return "expired";

  const expiry = asDate(expiresAt);
  if (expiry) {
    const remainingDays = (expiry.getTime() - now.getTime()) / 86_400_000;
    if (remainingDays < 0) return "expired";
    if (remainingDays <= 30) return "expiring";
  }

  if (/ativ|abert|pendente|vigente/.test(normalizedStatus)) return "active";
  return "unknown";
}
