import assert from "node:assert/strict";
import { test } from "node:test";

import {
  decodeListingId,
  discountPct,
  parseRating,
  pickCurrency,
  shapeItem,
  shapePage,
  toNumber,
} from "../src/shape.js";

test("toNumber handles numbers, strings, wrappers and junk", () => {
  assert.equal(toNumber(1674), 1674);
  assert.equal(toNumber("4.9"), 4.9);
  assert.equal(toNumber("1,549"), 1549);
  assert.equal(toNumber({ value: 869, currency: "USD" }), 869);
  assert.equal(toNumber("$1,222"), 1222);
  assert.equal(toNumber(null), null);
  assert.equal(toNumber(undefined), null);
  assert.equal(toNumber("New"), null);
});

test("pickCurrency reads the first available currency code", () => {
  assert.equal(pickCurrency({ value: 10, currency: "USD" }), "USD");
  assert.equal(pickCurrency(null, { value: 10, currency: "EUR" }), "EUR");
  assert.equal(pickCurrency({ value: 10, currency: null }, null), null);
  assert.equal(pickCurrency(10, "USD"), null);
});

test("parseRating splits '4.9 (186)' into rating and reviews", () => {
  assert.deepEqual(parseRating("4.9 (186)"), { rating: 4.9, reviews: 186 });
  assert.deepEqual(parseRating("4.57 (1549)"), { rating: 4.57, reviews: 1549 });
  assert.deepEqual(parseRating("5.0 (4)"), { rating: 5, reviews: 4 });
  assert.deepEqual(parseRating("New"), { rating: null, reviews: null });
  assert.deepEqual(parseRating(null), { rating: null, reviews: null });
});

test("decodeListingId decodes the base64 GID to a numeric id", () => {
  // "DemandStayListing:12171671"
  assert.equal(decodeListingId("RGVtYW5kU3RheUxpc3Rpbmc6MTIxNzE2NzE="), "12171671");
  assert.equal(decodeListingId("12345"), "12345");
  assert.equal(decodeListingId(""), null);
  assert.equal(decodeListingId(null), null);
});

test("discountPct computes a markdown or returns null", () => {
  assert.equal(discountPct(905, 1019), 11);
  assert.equal(discountPct(849, 1043), 19);
  assert.equal(discountPct(100, 100), null);
  assert.equal(discountPct(100, 90), null);
  assert.equal(discountPct(100, null), null);
});

// Path-form item (/s/<location>/homes): total_price / original_price /
// cover_photo_url / subtitle / avg_rating_a11y, and total_price may be null
// with the value only in price_accessibility_label.
const PATH_ITEM = {
  title: "Apartment in Inner Richmond",
  subtitle: "King bed near Golden Gate Park",
  listing_id: "RGVtYW5kU3RheUxpc3Rpbmc6MTQxMjUyNTQ0ODY2OTAwNDIwMw==",
  avg_rating: "4.96 (450)",
  avg_rating_a11y: "4.96 out of 5 average rating,  450 reviews",
  total_price: { value: 905, currency: "USD" },
  original_price: { value: 1019, currency: "USD" },
  price_accessibility_label: { value: 905, currency: "USD" },
  badge: "Guest favorite",
  cover_photo_url: "https://a0.muscache.com/im/pictures/hosting/x.jpeg",
  checkin: "2026-09-09",
  checkout: "2026-09-14",
};

// Query-form item (/s/homes?query=...): price (no original_price) / photo_url /
// listing_name / avg_rating_label.
const QUERY_ITEM = {
  title: "Room in New York",
  subtitle: "Free breakfast, 2 blocks from Penn Station",
  listing_name: "Individual Cubicle Room in NYC / Mixed Floor",
  listing_id: "RGVtYW5kU3RheUxpc3Rpbmc6MTIxNzE2NzE=",
  avg_rating: "4.57 (1549)",
  avg_rating_label: "4.57 out of 5 average rating,  1549 reviews",
  price: { value: 869, currency: "USD" },
  price_accessibility_label: { value: 869, currency: "USD" },
  badge: "Superhost",
  photo_url: "https://a0.muscache.com/im/pictures/hosting/y.jpeg",
  checkin: "2026-09-12",
  checkout: "2026-09-17",
  adults: 1,
};

test("shapeItem normalises the path-form shape (with discount)", () => {
  const rec = shapeItem(PATH_ITEM);
  assert.deepEqual(rec, {
    title: "Apartment in Inner Richmond",
    name: "King bed near Golden Gate Park",
    listingId: "1412525448669004203",
    rating: 4.96,
    reviews: 450,
    price: 905,
    originalPrice: 1019,
    currency: "USD",
    discountPct: 11,
    badge: "Guest favorite",
    checkin: "2026-09-09",
    checkout: "2026-09-14",
    url: "https://www.airbnb.com/rooms/1412525448669004203",
    image: "https://a0.muscache.com/im/pictures/hosting/x.jpeg",
  });
});

test("shapeItem normalises the query-form shape (listing_name + photo_url)", () => {
  const rec = shapeItem(QUERY_ITEM);
  assert.equal(rec.name, "Individual Cubicle Room in NYC / Mixed Floor");
  assert.equal(rec.listingId, "12171671");
  assert.equal(rec.url, "https://www.airbnb.com/rooms/12171671");
  assert.equal(rec.price, 869);
  assert.equal(rec.originalPrice, null);
  assert.equal(rec.discountPct, null);
  assert.equal(rec.image, "https://a0.muscache.com/im/pictures/hosting/y.jpeg");
  assert.equal(rec.reviews, 1549);
});

// Current query-form item: the parser now emits name / rating / image in place
// of listing_name / avg_rating / photo_url, and no badge.
const CURRENT_QUERY_ITEM = {
  title: "Room in Nob Hill",
  subtitle: "Modern Russian Hill room with a workspace",
  name: "Russian Hill Escape",
  property_id: null,
  rating: "4.97 (78)",
  rating_label: "4.97 out of 5 average rating, 78 reviews",
  price: { value: 122, currency: "USD" },
  neighborhood: "Nob Hill",
  checkin: "2026-11-14",
  checkout: "2026-11-15",
  image: "https://a0.muscache.com/im/pictures/hosting/z.jpeg",
  listing_id: "RGVtYW5kU3RheUxpc3Rpbmc6MTIxNzE2NzE=",
};

test("shapeItem normalises the current query-form shape (name + rating + image)", () => {
  const rec = shapeItem(CURRENT_QUERY_ITEM);
  assert.equal(rec.title, "Room in Nob Hill");
  assert.equal(rec.name, "Russian Hill Escape");
  assert.equal(rec.rating, 4.97);
  assert.equal(rec.reviews, 78);
  assert.equal(rec.price, 122);
  assert.equal(rec.currency, "USD");
  assert.equal(rec.badge, null);
  assert.equal(rec.image, "https://a0.muscache.com/im/pictures/hosting/z.jpeg");
  assert.equal(rec.url, "https://www.airbnb.com/rooms/12171671");
});

test("shapeItem falls back to price_accessibility_label when total_price is null", () => {
  const rec = shapeItem({
    ...PATH_ITEM,
    total_price: null,
    original_price: null,
    price_accessibility_label: { value: 1355, currency: "USD" },
  });
  assert.equal(rec.price, 1355);
  assert.equal(rec.currency, "USD");
  assert.equal(rec.originalPrice, null);
  assert.equal(rec.discountPct, null);
});

test("shapeItem handles a brand-new listing with no reviews", () => {
  const rec = shapeItem({ ...QUERY_ITEM, avg_rating: "New" });
  assert.equal(rec.rating, null);
  assert.equal(rec.reviews, null);
});

test("shapeItem tolerates a sparse item", () => {
  const rec = shapeItem({ title: "Mystery stay" });
  assert.equal(rec.title, "Mystery stay");
  assert.equal(rec.price, null);
  assert.equal(rec.listingId, null);
  assert.equal(rec.url, null);
});

test("shapePage flattens items and reads pagination", () => {
  const page = shapePage({ items: [PATH_ITEM, QUERY_ITEM], total: 20, next_page: null });
  assert.equal(page.items.length, 2);
  assert.equal(page.total, 20);
  assert.equal(page.nextPage, null);
});

test("shapePage handles an empty / malformed payload", () => {
  const page = shapePage({});
  assert.deepEqual(page.items, []);
  assert.equal(page.total, null);
  assert.equal(page.nextPage, null);
});
