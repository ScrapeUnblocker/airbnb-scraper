// Normalisation helpers that turn ScrapeUnblocker's raw parsed_data payload
// into clean, predictable Airbnb listing records.
//
// The getPageSource parsed_data API returns a `search_list` page as
// `{ items: [...], total, next_page }`. Airbnb's AI-parsed items come back in
// two slightly different field namings depending on the search URL form, and
// this shaper reads both:
//
//   - Path form  (/s/<location>/homes): total_price / original_price,
//     cover_photo_url, subtitle (the listing name), avg_rating_a11y.
//   - Query form (/s/homes?query=...):  price (no original_price),
//     photo_url,  listing_name,  subtitle (a tagline), avg_rating_label.
//
// A few fields always need tidying:
//   - prices arrive as `{ value, currency }` objects (sometimes null, with the
//     value mirrored into `price_accessibility_label`).
//   - `avg_rating` is a string like "4.9 (186)" or "New" - split into a numeric
//     rating and a review count.
//   - `listing_id` is a base64 GID (e.g. "DemandStayListing:12171671") - decode
//     it to the numeric id and build a clean room URL.

import { roomUrl } from "./urls.js";

/**
 * Pull a numeric value out of the shapes the API uses for money and counts:
 * a bare number, a numeric string, or a `{ value }` wrapper object.
 * @param {unknown} raw
 * @returns {number|null}
 */
export function toNumber(raw) {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "object") return toNumber(raw.value);
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  if (typeof raw === "string") {
    const cleaned = raw.replace(/[^0-9.]/g, "");
    if (cleaned === "") return null;
    const n = Number.parseFloat(cleaned);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * Read a currency code from the first `{ currency }` wrapper that has one.
 * @param {...unknown} candidates price wrapper objects, in priority order
 * @returns {string|null}
 */
export function pickCurrency(...candidates) {
  for (const c of candidates) {
    if (c && typeof c === "object" && typeof c.currency === "string") {
      const code = c.currency.trim();
      if (code !== "") return code;
    }
  }
  return null;
}

/**
 * Parse Airbnb's combined rating string, e.g. "4.9 (186)" -> rating 4.9 with
 * 186 reviews. "New" (a brand-new listing) and null both yield nulls.
 * @param {unknown} raw
 * @returns {{ rating: number|null, reviews: number|null }}
 */
export function parseRating(raw) {
  if (typeof raw !== "string") return { rating: null, reviews: null };
  const m = raw.match(/([\d.]+)\s*\(([\d,]+)\)/);
  if (m) {
    return { rating: toNumber(m[1]), reviews: toNumber(m[2]) };
  }
  // A bare number with no review count (rare) - keep the rating.
  const bare = raw.match(/^\s*([\d.]+)\s*$/);
  if (bare) return { rating: toNumber(bare[1]), reviews: null };
  return { rating: null, reviews: null };
}

/**
 * Decode Airbnb's base64 listing GID to its numeric id.
 * "RGVtYW5kU3RheUxpc3Rpbmc6MTIxNzE2NzE=" -> "12171671".
 * @param {unknown} raw
 * @returns {string|null}
 */
export function decodeListingId(raw) {
  if (typeof raw !== "string" || raw.trim() === "") return null;
  // Some ids are already the plain numeric form.
  if (/^\d+$/.test(raw.trim())) return raw.trim();
  let decoded;
  try {
    decoded = Buffer.from(raw, "base64").toString("utf8");
  } catch {
    return null;
  }
  const m = decoded.match(/(\d+)\s*$/);
  return m ? m[1] : null;
}

/**
 * Compute a whole-number discount percentage from a current and original
 * price, or null when there is no genuine markdown.
 * @param {number|null} price
 * @param {number|null} originalPrice
 * @returns {number|null}
 */
export function discountPct(price, originalPrice) {
  if (
    typeof price !== "number" ||
    typeof originalPrice !== "number" ||
    originalPrice <= 0 ||
    originalPrice <= price
  ) {
    return null;
  }
  return Math.round((1 - price / originalPrice) * 100);
}

/**
 * Shape a single raw parsed_data item into a clean listing record. Handles
 * both the path-form and query-form field namings (see the module comment).
 * @param {Record<string, unknown>} item
 * @returns {object|null}
 */
export function shapeItem(item) {
  if (!item || typeof item !== "object") return null;

  const listingId = decodeListingId(item.listing_id);

  // Prefer the explicit stay price; fall back to the accessibility label,
  // which mirrors the value even when `total_price`/`price` is null.
  const priceObj = item.total_price ?? item.price ?? item.price_accessibility_label;
  const price = toNumber(priceObj);
  const originalPrice = toNumber(item.original_price);

  const { rating, reviews } = parseRating(item.avg_rating);

  return {
    title: typeof item.title === "string" ? item.title : null,
    name:
      typeof item.listing_name === "string"
        ? item.listing_name
        : typeof item.subtitle === "string"
          ? item.subtitle
          : null,
    listingId,
    rating,
    reviews,
    price,
    originalPrice,
    currency: pickCurrency(
      item.total_price,
      item.price,
      item.price_accessibility_label,
      item.original_price,
    ),
    discountPct: discountPct(price, originalPrice),
    badge: typeof item.badge === "string" ? item.badge : null,
    checkin: typeof item.checkin === "string" ? item.checkin : null,
    checkout: typeof item.checkout === "string" ? item.checkout : null,
    url: roomUrl(listingId),
    image:
      typeof item.cover_photo_url === "string"
        ? item.cover_photo_url
        : typeof item.photo_url === "string"
          ? item.photo_url
          : null,
  };
}

/**
 * Shape a full parsed_data payload (the object under `data`) into a page of
 * clean records plus pagination metadata.
 * @param {Record<string, unknown>} data the `data` object from getParsed()
 * @returns {{ items: object[], total: number|null, nextPage: string|null }}
 */
export function shapePage(data) {
  const rawItems = Array.isArray(data?.items) ? data.items : [];
  const items = rawItems.map(shapeItem).filter(Boolean);
  const total = toNumber(data?.total);
  const nextPage =
    typeof data?.next_page === "string" && data.next_page.trim() !== ""
      ? data.next_page
      : null;
  return { items, total, nextPage };
}
