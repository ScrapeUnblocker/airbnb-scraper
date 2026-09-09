// Basic example: search Airbnb for a destination and print clean JSON records.
//
//   SCRAPEUNBLOCKER_KEY=your_key node examples/search-json.js "San Francisco, CA"
//
// Get a key at:
// https://scrapeunblocker.com/?utm_source=github&utm_medium=integration&utm_campaign=example-repos

import { AirbnbScraper } from "../src/index.js";

const location = process.argv[2] ?? "San Francisco, CA";

const scraper = new AirbnbScraper({ country: "US" });
const stays = await scraper.search(location, { pages: 1 });

console.log(`Found ${stays.length} stays in "${location}":\n`);
for (const s of stays.slice(0, 10)) {
  const price = s.price !== null ? `${s.currency ?? "$"}${s.price}` : "n/a";
  const rating = s.rating !== null ? `${s.rating}★ (${s.reviews ?? 0})` : "new";
  console.log(`- ${s.title}\n    ${s.name ?? "?"} | ${price} | ${rating}\n    ${s.url}`);
}
