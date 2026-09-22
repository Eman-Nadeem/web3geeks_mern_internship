import { RESERVED_SLUGS, SLUG_REGEX } from "@/lib/constants";

export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, "-") // Replace spaces and underscores with -
    .replace(/[^\w-]+/g, "") // Remove all non-word chars
    .replace(/--+/g, "-") // Replace multiple - with single -
    .replace(/^-+/, "") // Trim - from start of text
    .replace(/-+$/, "") // Trim - from end of text
    .substring(0, 48);
}

export function isValidSlug(slug: string): boolean {
  if (slug.length < 3 || slug.length > 48) return false;
  if (!SLUG_REGEX.test(slug)) return false;
  if (RESERVED_SLUGS.includes(slug as (typeof RESERVED_SLUGS)[number])) return false;
  return true;
}
