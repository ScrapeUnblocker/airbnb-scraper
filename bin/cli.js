#!/usr/bin/env node
import { writeFile } from "node:fs/promises";
import { argv } from "node:process";
import { parseArgs } from "node:util";
import { pathToFileURL } from "node:url";

import { AirbnbScraper } from "../src/scraper.js";
import { toCsv } from "../src/csv.js";
import { isAirbnbUrl } from "../src/urls.js";

const USAGE = `airbnb-scraper - scrape Airbnb search results as clean JSON

Usage:
  airbnb-scraper <location> [options]
  airbnb-scraper --url <airbnb-search-url> [options]

Options:
  --url <url>        Scrape a specific Airbnb search URL instead of a location
  --checkin <date>   Check-in date, YYYY-MM-DD (location search only)
  --checkout <date>  Check-out date, YYYY-MM-DD (location search only)
  --adults <n>       Number of adult guests (location search only)
  --pages <n>        Number of result pages to collect (default: 1)
  --country <cc>     Proxy country ISO code (default: US)
  --format <fmt>     Output format: json | csv (default: json)
  --out <file>       Write output to a file instead of stdout
  --pretty           Pretty-print JSON output
  -h, --help         Show this help

Environment:
  SCRAPEUNBLOCKER_KEY  Your ScrapeUnblocker API key (required)

Examples:
  airbnb-scraper "San Francisco, CA" --pages 2
  airbnb-scraper "Paris" --checkin 2027-05-01 --checkout 2027-05-05 --adults 2
  airbnb-scraper "Austin, TX" --format csv --out austin.csv
  airbnb-scraper --url "https://www.airbnb.com/s/homes?query=Rome" --pretty

Docs: https://docs.scrapeunblocker.com/?utm_source=github&utm_medium=integration&utm_campaign=example-repos
`;

/**
 * Parse argv into a normalised options object. Exported for unit testing.
 * @param {string[]} argv process.argv.slice(2)
 * @returns {{ help: boolean, location: string|null, values: object }}
 */
export function parseCliArgs(argv) {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      url: { type: "string" },
      checkin: { type: "string" },
      checkout: { type: "string" },
      adults: { type: "string" },
      pages: { type: "string", default: "1" },
      country: { type: "string", default: "US" },
      format: { type: "string", default: "json" },
      out: { type: "string" },
      pretty: { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
  });
  return { help: values.help, location: positionals[0] ?? null, values };
}

/**
 * Serialise records for output in the requested format.
 * @param {object[]} records
 * @param {{ format: string, pretty: boolean }} opts
 * @returns {string}
 */
export function render(records, { format, pretty }) {
  if (format === "csv") return toCsv(records);
  if (format !== "json") {
    throw new Error(`unknown --format "${format}" (expected json or csv)`);
  }
  return JSON.stringify(records, null, pretty ? 2 : 0);
}

async function main() {
  const { help, location, values } = parseCliArgs(process.argv.slice(2));

  if (help || (!location && !values.url)) {
    process.stdout.write(USAGE);
    process.exit(help ? 0 : 1);
  }

  if (!process.env.SCRAPEUNBLOCKER_KEY) {
    process.stderr.write(
      "error: SCRAPEUNBLOCKER_KEY is not set. Get a key at " +
        "https://scrapeunblocker.com/?utm_source=github&utm_medium=integration&utm_campaign=example-repos\n",
    );
    process.exit(2);
  }

  const pages = Number.parseInt(values.pages, 10);
  if (!Number.isInteger(pages) || pages < 1) {
    process.stderr.write(`error: --pages must be a positive integer\n`);
    process.exit(2);
  }

  let adults;
  if (values.adults !== undefined) {
    adults = Number.parseInt(values.adults, 10);
    if (!Number.isInteger(adults) || adults < 1) {
      process.stderr.write(`error: --adults must be a positive integer\n`);
      process.exit(2);
    }
  }

  const scraper = new AirbnbScraper({ country: values.country });

  let records;
  if (values.url) {
    if (!isAirbnbUrl(values.url)) {
      process.stderr.write(`error: --url must be an airbnb.com URL\n`);
      process.exit(2);
    }
    records = await scraper.collect(values.url, {
      pages,
      country: values.country,
    });
  } else {
    records = await scraper.search(location, {
      pages,
      country: values.country,
      checkin: values.checkin,
      checkout: values.checkout,
      adults,
    });
  }

  const output = render(records, {
    format: values.format,
    pretty: values.pretty,
  });

  if (values.out) {
    await writeFile(values.out, output + "\n");
    process.stderr.write(
      `wrote ${records.length} record(s) to ${values.out}\n`,
    );
  } else {
    process.stdout.write(output + "\n");
  }
}

// Only run when invoked as the entry point, not when imported by tests.
if (argv[1] && import.meta.url === pathToFileURL(argv[1]).href) {
  main().catch((err) => {
    process.stderr.write(`error: ${err.message}\n`);
    process.exit(1);
  });
}
