// URL helpers for Airbnb stay search pages.

const SEARCH_BASE = "https://www.airbnb.com/s/homes";
const ROOM_BASE = "https://www.airbnb.com/rooms/";

/**
 * @typedef {object} SearchParams
 * @property {string} [checkin]  ISO date (YYYY-MM-DD) for the check-in day
 * @property {string} [checkout] ISO date (YYYY-MM-DD) for the check-out day
 * @property {number} [adults]   number of adult guests
 */

/**
 * Build an Airbnb search URL from a free-text destination.
 * Example: "New York, NY" -> https://www.airbnb.com/s/homes?query=New%20York%2C%20NY
 *
 * The `?query=` form accepts any human destination string, so callers don't
 * have to know Airbnb's internal location slugs.
 * @param {string} location e.g. "San Francisco, CA" or "Paris"
 * @param {SearchParams} [params]
 * @returns {string}
 */
export function searchUrl(location, params = {}) {
  const q = String(location ?? "").trim();
  if (q === "") throw new Error("search location must not be empty");

  const url = new URL(SEARCH_BASE);
  url.searchParams.set("query", q);
  if (params.checkin) url.searchParams.set("checkin", params.checkin);
  if (params.checkout) url.searchParams.set("checkout", params.checkout);
  if (params.adults !== undefined && params.adults !== null) {
    url.searchParams.set("adults", String(params.adults));
  }
  return url.toString();
}

/**
 * Read the current `items_offset` pagination cursor from an Airbnb URL.
 * @param {string} url
 * @returns {number} the offset, or 0 when absent/invalid
 */
export function readItemsOffset(url) {
  try {
    const raw = new URL(url).searchParams.get("items_offset");
    const n = Number.parseInt(raw ?? "", 10);
    return Number.isInteger(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

/**
 * Return a copy of an Airbnb URL with `items_offset` set to `offset`.
 * Airbnb paginates search results by this offset rather than a page number,
 * and the parsed payload never carries a `next_page` link, so we drive
 * pagination ourselves.
 * @param {string} url
 * @param {number} offset
 * @returns {string}
 */
export function withItemsOffset(url, offset) {
  const u = new URL(url);
  if (!offset || offset <= 0) {
    u.searchParams.delete("items_offset");
  } else {
    u.searchParams.set("items_offset", String(offset));
  }
  return u.toString();
}

/**
 * Build a canonical Airbnb room URL from a numeric listing id.
 * @param {string|number|null} listingId
 * @returns {string|null}
 */
export function roomUrl(listingId) {
  if (listingId === null || listingId === undefined) return null;
  const id = String(listingId).trim();
  return /^\d+$/.test(id) ? ROOM_BASE + id : null;
}

/**
 * Basic sanity check that a URL points at airbnb.com. We only ever fetch
 * Airbnb pages, so this guards against accidental misuse.
 * @param {string} url
 * @returns {boolean}
 */
export function isAirbnbUrl(url) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === "airbnb.com" || host.endsWith(".airbnb.com");
  } catch {
    return false;
  }
}
