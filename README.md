# Airbnb Scraper

[![CI](https://github.com/ScrapeUnblocker/airbnb-scraper/actions/workflows/ci.yml/badge.svg)](https://github.com/ScrapeUnblocker/airbnb-scraper/actions/workflows/ci.yml)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Scrape [Airbnb](https://www.airbnb.com) search results as clean, structured JSON — listing title, name, rating, review count, nightly/total price, currency, discount, badge (Superhost / Guest favorite), stay dates, room URL and image — with multi-page collection and CSV export.

Airbnb renders its stay grid from heavily obfuscated JSON and fronts it with bot protection, so a plain `fetch()` gets you a challenge page instead of listings. This library routes every request through the **[ScrapeUnblocker](https://scrapeunblocker.com/?utm_source=github&utm_medium=integration&utm_campaign=example-repos) `getPageSource` `parsed_data` API**, which renders the page and returns AI-parsed structured data — so you get a tidy list of stays, not raw HTML to wrangle.

> **Powered by ScrapeUnblocker** — the unblocking + parsing runs server-side, so this repo stays a thin, readable client.

## Features

- 🏝️ **Search to JSON** — turn any destination into a clean list of stay records.
- 🏷️ **The fields you actually want** — title, name, rating, reviews, price, original price, currency, discount %, badge, check-in/out, room URL, image.
- 🔢 **Numbers as numbers** — `"4.9 (186)"` becomes `rating: 4.9` + `reviews: 186`; base64 listing GIDs become clean `/rooms/<id>` links.
- 📄 **Multi-page** — advances Airbnb's `items_offset` cursor and de-duplicates by listing id.
- 🧾 **CSV export** — one flag to write a spreadsheet-ready file.
- 🌍 **Country targeting** — set the proxy country for localized pricing/currency.
- 🧰 **CLI _and_ library** — script it from the terminal or import the class.
- ✅ **No API surface guesswork** — built on the official [`scrapeunblocker`](https://www.npmjs.com/package/scrapeunblocker) npm SDK, with mocked unit tests and CI.

## Install

```bash
git clone https://github.com/ScrapeUnblocker/airbnb-scraper.git
cd airbnb-scraper
npm install
```

Requires **Node.js 18+**. Then set your API key ([get one here](https://scrapeunblocker.com/?utm_source=github&utm_medium=integration&utm_campaign=example-repos)):

```bash
cp .env.example .env
# edit .env and set SCRAPEUNBLOCKER_KEY=...
export SCRAPEUNBLOCKER_KEY="your_key_here"
```

The SDK reads the key from the `SCRAPEUNBLOCKER_KEY` environment variable.

## CLI usage

```bash
# Search a destination and print JSON to stdout
node bin/cli.js "San Francisco, CA"

# Collect two pages and pretty-print
node bin/cli.js "San Francisco, CA" --pages 2 --pretty

# Add dates and guest count
node bin/cli.js "Paris" --checkin 2026-10-01 --checkout 2026-10-05 --adults 2

# Export to CSV
node bin/cli.js "Austin, TX" --format csv --out austin.csv

# Scrape a specific Airbnb search URL, targeting the US
node bin/cli.js --url "https://www.airbnb.com/s/homes?query=Rome" --country US
```

If you `npm install -g .` (or install from a published package), the same command is available as `airbnb-scraper`.

```
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
```

## Library usage

```js
import { AirbnbScraper } from "airbnb-scraper";

const scraper = new AirbnbScraper({ country: "US" });

// Search (collect 2 pages of results)
const stays = await scraper.search("San Francisco, CA", { pages: 2 });
console.log(stays.length, "stays");
console.log(stays[0]);

// With dates and guests
const dated = await scraper.search("Paris", {
  checkin: "2026-10-01",
  checkout: "2026-10-05",
  adults: 2,
});

// Or start from any Airbnb search URL
const fromUrl = await scraper.collect(
  "https://www.airbnb.com/s/homes?query=Rome",
  { pages: 1 },
);
```

### Example output

```json
[
  {
    "title": "Apartment in Inner Richmond",
    "name": "King bed near Golden Gate Park",
    "listingId": "1412525448669004203",
    "rating": 4.96,
    "reviews": 450,
    "price": 905,
    "originalPrice": 1019,
    "currency": "USD",
    "discountPct": 11,
    "badge": "Guest favorite",
    "checkin": "2026-09-09",
    "checkout": "2026-09-14",
    "url": "https://www.airbnb.com/rooms/1412525448669004203",
    "image": "https://a0.muscache.com/im/pictures/hosting/....jpeg"
  }
]
```

> `price` is the stay price Airbnb shows for the dates in the search (a total for
> the selected range, or an estimate when no dates are given). `originalPrice`
> and `discountPct` are present only when Airbnb shows a struck-through price.
> `rating`/`reviews` are `null` for brand-new listings.

## How it works

`getParsed(url)` in the [`scrapeunblocker`](https://www.npmjs.com/package/scrapeunblocker) SDK calls the `getPageSource` endpoint with `parsed_data` enabled. For an Airbnb search it returns a `search_list` payload shaped like:

```jsonc
{ "pageType": "search_list", "data": { "items": [ /* ... */ ], "total": 20, "next_page": null } }
```

This library:

1. Builds the search URL (`https://www.airbnb.com/s/homes?query=<destination>`) or takes one you provide.
2. Calls `getParsed()` for each page.
3. Normalises each item into a clean record — rating/review split, base64 listing id decoded to a `/rooms/<id>` URL, prices coerced to numbers, discount computed. It reads both of Airbnb's parsed field namings (the `?query=` form and the `/s/<location>/homes` form).
4. Advances the `items_offset` cursor and de-duplicates by listing id until it has collected `pages` pages (Airbnb never returns a `next_page` link).

## Project layout

```
airbnb-scraper/
├── bin/
│   └── cli.js            # command-line interface (node:util parseArgs)
├── src/
│   ├── index.js          # public exports
│   ├── scraper.js        # AirbnbScraper class (fetch + paginate)
│   ├── shape.js          # raw parsed_data -> clean records
│   ├── urls.js           # search-URL builder, offset cursor, host guard
│   └── csv.js            # dependency-free CSV serialiser
├── examples/
│   ├── search-json.js    # search and print
│   ├── search-csv.js     # export multiple pages to CSV
│   └── price-summary.js  # min/max/avg + top-rated stay
├── test/                 # node:test unit tests (SDK mocked, no API credit)
└── .github/workflows/ci.yml
```

## Development

```bash
npm install
npm test        # run the mocked unit tests
npm run lint    # eslint
npm run format  # eslint --fix
```

The tests inject a fake client into `AirbnbScraper`, so they run fully offline and never spend API credit.

## Links

- 🌐 [ScrapeUnblocker](https://scrapeunblocker.com/?utm_source=github&utm_medium=integration&utm_campaign=example-repos)
- 📚 [API documentation](https://docs.scrapeunblocker.com/?utm_source=github&utm_medium=integration&utm_campaign=example-repos)
- 📦 [`scrapeunblocker` on npm](https://www.npmjs.com/package/scrapeunblocker)

## Legal

This is an educational example. Scrape responsibly: respect Airbnb's Terms of Service and `robots.txt`, collect only public data, and follow the laws that apply to you.

## License

[MIT](LICENSE) © 2026 ScrapeUnblocker
