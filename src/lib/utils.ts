import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function convertImageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function generateIdentifierFromName(
  value: string,
  separator: "_" | "-" = "_",
): string {
  const sep = separator === "-" ? "-" : "_";

  return value
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, sep)
    .replace(sep === "-" ? /-+/g : /_+/g, sep)
    .replace(sep === "-" ? /^-|-$/g : /^_|_$/g, "");
}

export function generateKeyFromName(value: string): string {
  return generateIdentifierFromName(value, "_");
}

export function generateSlugFromName(value: string): string {
  return generateIdentifierFromName(value, "-");
}
