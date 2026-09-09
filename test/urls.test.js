import assert from "node:assert/strict";
import { test } from "node:test";

import {
  isAirbnbUrl,
  readItemsOffset,
  roomUrl,
  searchUrl,
  withItemsOffset,
} from "../src/urls.js";

test("searchUrl builds a ?query= search URL", () => {
  const u = new URL(searchUrl("New York, NY"));
  assert.equal(u.origin + u.pathname, "https://www.airbnb.com/s/homes");
  assert.equal(u.searchParams.get("query"), "New York, NY");
});

test("searchUrl adds optional stay params", () => {
  const u = new URL(
    searchUrl("Lisbon", { checkin: "2026-05-01", checkout: "2026-05-04", adults: 3 }),
  );
  assert.equal(u.searchParams.get("checkin"), "2026-05-01");
  assert.equal(u.searchParams.get("checkout"), "2026-05-04");
  assert.equal(u.searchParams.get("adults"), "3");
});

test("searchUrl rejects an empty location", () => {
  assert.throws(() => searchUrl("  "), /must not be empty/);
});

test("withItemsOffset sets and clears the cursor", () => {
  const base = "https://www.airbnb.com/s/homes?query=Rome";
  assert.equal(
    new URL(withItemsOffset(base, 18)).searchParams.get("items_offset"),
    "18",
  );
  // offset 0 removes the param entirely
  assert.equal(
    new URL(withItemsOffset(base + "&items_offset=36", 0)).searchParams.get("items_offset"),
    null,
  );
});

test("readItemsOffset reads the cursor or defaults to 0", () => {
  assert.equal(readItemsOffset("https://www.airbnb.com/s/homes?items_offset=36"), 36);
  assert.equal(readItemsOffset("https://www.airbnb.com/s/homes?query=Rome"), 0);
  assert.equal(readItemsOffset("not a url"), 0);
});

test("roomUrl builds a canonical room link from a numeric id", () => {
  assert.equal(roomUrl("12171671"), "https://www.airbnb.com/rooms/12171671");
  assert.equal(roomUrl(12171671), "https://www.airbnb.com/rooms/12171671");
  assert.equal(roomUrl("not-numeric"), null);
  assert.equal(roomUrl(null), null);
});

test("isAirbnbUrl only accepts airbnb.com hosts", () => {
  assert.equal(isAirbnbUrl("https://www.airbnb.com/s/homes?query=x"), true);
  assert.equal(isAirbnbUrl("https://airbnb.com/rooms/1"), true);
  assert.equal(isAirbnbUrl("https://example.com/s/homes"), false);
  assert.equal(isAirbnbUrl("not a url"), false);
});
