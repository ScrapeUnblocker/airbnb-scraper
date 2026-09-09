import { ScrapeUnblockerClient } from "scrapeunblocker";

import { shapePage } from "./shape.js";
import { isAirbnbUrl, readItemsOffset, searchUrl, withItemsOffset } from "./urls.js";

/**
 * @typedef {object} ScrapeOptions
 * @property {number} [pages]   how many result pages to collect (default 1)
 * @property {string} [country] proxy country ISO code (default "US")
 */

// Airbnb typically returns ~18-20 cards per page. When a page comes back empty
// we fall back to this step so pagination still advances.
const DEFAULT_PAGE_STEP = 18;

/**
 * High-level Airbnb scraper built on the ScrapeUnblocker getPageSource
 * parsed_data API. Handles URL building, `items_offset` pagination and record
 * shaping so callers get clean JSON back.
 */
export class AirbnbScraper {
  /**
   * @param {object} [options]
   * @param {string} [options.apiKey]  overrides the SCRAPEUNBLOCKER_KEY env var
   * @param {ScrapeUnblockerClient} [options.client] inject a pre-built client (tests)
   * @param {string} [options.country] default proxy country for every request
   */
  constructor(options = {}) {
    const { apiKey, client, country = "US" } = options;
    // The SDK already retries transient failures (429/502/503/504) with
    // exponential backoff, so we lean on it rather than reinventing retries.
    this.client = client ?? new ScrapeUnblockerClient(apiKey ? { apiKey } : {});
    this.country = country;
  }

  /**
   * Fetch and shape a single Airbnb search URL.
   * @param {string} url an Airbnb search or listing URL
   * @param {{ country?: string }} [options]
   * @returns {Promise<{ items: object[], total: number|null, nextPage: string|null }>}
   */
  async fetchPage(url, options = {}) {
    if (!isAirbnbUrl(url)) {
      throw new Error(`refusing to fetch non-Airbnb URL: ${url}`);
    }
    const country = options.country ?? this.country;
    const res = await this.client.getParsed(url, { proxyCountry: country });
    return shapePage(res?.data ?? {});
  }

  /**
   * Search Airbnb for a destination and collect one or more pages of stays.
   * @param {string} location free-text destination, e.g. "Austin, TX"
   * @param {ScrapeOptions & import("./urls.js").SearchParams} [options]
   * @returns {Promise<object[]>} flattened list of clean listing records
   */
  async search(location, options = {}) {
    const { pages, country, ...searchParams } = options;
    return this.collect(searchUrl(location, searchParams), { pages, country });
  }

  /**
   * Collect results starting from an arbitrary Airbnb search URL, advancing the
   * `items_offset` cursor between pages. Airbnb never returns a `next_page`
   * link and can repeat listings across offsets, so we de-duplicate by listing
   * id and stop as soon as a page adds nothing new.
   * @param {string} startUrl
   * @param {ScrapeOptions} [options]
   * @returns {Promise<object[]>}
   */
  async collect(startUrl, options = {}) {
    const pages = Math.max(1, Number(options.pages ?? 1));
    const country = options.country ?? this.country;

    const results = [];
    const seen = new Set();
    let offset = readItemsOffset(startUrl);

    for (let page = 0; page < pages; page += 1) {
      const url = withItemsOffset(startUrl, offset);
      const { items } = await this.fetchPage(url, { country });
      if (items.length === 0) break;

      let added = 0;
      for (const item of items) {
        const key = item.listingId ?? `${item.title}|${item.name}`;
        if (seen.has(key)) continue;
        seen.add(key);
        results.push(item);
        added += 1;
      }
      // Every listing repeated - the cursor has run past the last page.
      if (added === 0) break;

      offset += items.length || DEFAULT_PAGE_STEP;
    }
    return results;
  }
}
