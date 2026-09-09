import assert from "node:assert/strict";
import { test } from "node:test";

import { AirbnbScraper } from "../src/scraper.js";

/**
 * A fake ScrapeUnblockerClient that returns canned parsed_data payloads and
 * records the URLs / options it was called with. No network, no API credit.
 */
function fakeClient(pages) {
  const calls = [];
  let i = 0;
  return {
    calls,
    async getParsed(url, options) {
      calls.push({ url, options });
      const page = pages[Math.min(i, pages.length - 1)];
      i += 1;
      return { pageType: "search_list", source: "test", data: page };
    },
  };
}

function item(id, extra = {}) {
  return {
    title: `Stay ${id}`,
    listing_name: `Listing ${id}`,
    listing_id: String(id),
    avg_rating: "4.9 (100)",
    price: { value: 200, currency: "USD" },
    ...extra,
  };
}

test("search builds the query URL and passes the proxy country", async () => {
  const client = fakeClient([{ items: [item(1)], next_page: null }]);
  const scraper = new AirbnbScraper({ client, country: "FR" });
  const rows = await scraper.search("Paris");

  assert.equal(rows.length, 1);
  assert.equal(rows[0].title, "Stay 1");
  assert.match(client.calls[0].url, /^https:\/\/www\.airbnb\.com\/s\/homes\?query=Paris/);
  assert.equal(client.calls[0].options.proxyCountry, "FR");
});

test("search threads checkin/checkout/adults into the URL", async () => {
  const client = fakeClient([{ items: [item(1)] }]);
  const scraper = new AirbnbScraper({ client });
  await scraper.search("Rome", { checkin: "2026-10-01", checkout: "2026-10-05", adults: 2 });

  const u = new URL(client.calls[0].url);
  assert.equal(u.searchParams.get("query"), "Rome");
  assert.equal(u.searchParams.get("checkin"), "2026-10-01");
  assert.equal(u.searchParams.get("checkout"), "2026-10-05");
  assert.equal(u.searchParams.get("adults"), "2");
});

test("collect advances items_offset and de-duplicates across pages", async () => {
  const client = fakeClient([
    { items: [item(1), item(2)] },
    { items: [item(2), item(3)] }, // item 2 repeats and must be dropped
  ]);
  const scraper = new AirbnbScraper({ client });
  const rows = await scraper.collect("https://www.airbnb.com/s/homes?query=X", {
    pages: 2,
  });

  assert.deepEqual(rows.map((r) => r.listingId), ["1", "2", "3"]);
  assert.equal(client.calls.length, 2);
  // Second call carries the offset advanced by the first page's item count.
  assert.equal(new URL(client.calls[1].url).searchParams.get("items_offset"), "2");
});

test("collect stops early when a page adds nothing new", async () => {
  const client = fakeClient([
    { items: [item(1)] },
    { items: [item(1)] }, // identical page -> no new listings -> stop
    { items: [item(9)] },
  ]);
  const scraper = new AirbnbScraper({ client });
  const rows = await scraper.collect("https://www.airbnb.com/s/homes?query=X", {
    pages: 5,
  });

  assert.equal(rows.length, 1);
  assert.equal(client.calls.length, 2);
});

test("collect stops on an empty page", async () => {
  const client = fakeClient([{ items: [item(1)] }, { items: [] }]);
  const scraper = new AirbnbScraper({ client });
  const rows = await scraper.collect("https://www.airbnb.com/s/homes?query=X", {
    pages: 5,
  });

  assert.equal(rows.length, 1);
  assert.equal(client.calls.length, 2);
});

test("fetchPage refuses a non-Airbnb URL", async () => {
  const client = fakeClient([{ items: [] }]);
  const scraper = new AirbnbScraper({ client });
  await assert.rejects(
    () => scraper.fetchPage("https://example.com/s/homes"),
    /non-Airbnb URL/,
  );
  assert.equal(client.calls.length, 0);
});

test("search rejects an empty location", async () => {
  const client = fakeClient([{ items: [] }]);
  const scraper = new AirbnbScraper({ client });
  await assert.rejects(() => scraper.search("   "), /must not be empty/);
});
