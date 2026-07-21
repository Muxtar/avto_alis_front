import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// shadcn/ui standart yardımçısı — şərti class-ları birləşdirir və Tailwind
// konfliktlərini həll edir (məs. "px-2 px-4" → "px-4").
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
