// Export multi-page Airbnb search results to a CSV file.
//
//   SCRAPEUNBLOCKER_KEY=your_key node examples/search-csv.js "Austin, TX" 2 out.csv
//
// Get a key at:
// https://scrapeunblocker.com/?utm_source=github&utm_medium=integration&utm_campaign=example-repos

import { writeFile } from "node:fs/promises";

import { AirbnbScraper, toCsv } from "../src/index.js";

const location = process.argv[2] ?? "Austin, TX";
const pages = Number.parseInt(process.argv[3] ?? "2", 10);
const outFile = process.argv[4] ?? "airbnb.csv";

const scraper = new AirbnbScraper({ country: "US" });
const stays = await scraper.search(location, { pages });

await writeFile(outFile, toCsv(stays) + "\n");
console.log(`Wrote ${stays.length} stays to ${outFile}`);
