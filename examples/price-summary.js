// Compute a quick price summary (min / max / average and the top-rated stay)
// for an Airbnb destination - a small taste of what the clean records enable.
//
//   SCRAPEUNBLOCKER_KEY=your_key node examples/price-summary.js "Paris"
//
// Get a key at:
// https://scrapeunblocker.com/?utm_source=github&utm_medium=integration&utm_campaign=example-repos

import { AirbnbScraper } from "../src/index.js";

const location = process.argv[2] ?? "Paris";

const scraper = new AirbnbScraper({ country: "US" });
const stays = await scraper.search(location, { pages: 1 });

const priced = stays.filter((s) => typeof s.price === "number");
if (priced.length === 0) {
  console.log(`No priced stays found for "${location}".`);
  process.exit(0);
}

const prices = priced.map((s) => s.price);
const min = Math.min(...prices);
const max = Math.max(...prices);
const avg = prices.reduce((a, b) => a + b, 0) / prices.length;

console.log(`Price summary for "${location}" (${priced.length} priced stays):`);
console.log(`  min ${min} | avg ${avg.toFixed(0)} | max ${max}`);

const rated = stays.filter((s) => typeof s.rating === "number" && s.reviews);
if (rated.length > 0) {
  const best = rated.sort(
    (a, b) => b.rating - a.rating || b.reviews - a.reviews,
  )[0];
  console.log(
    `  top rated: ${best.title} - ${best.rating}★ (${best.reviews} reviews)\n    ${best.url}`,
  );
}
