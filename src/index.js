/**
 * airbnb-scraper - scrape Airbnb search results as clean JSON via the
 * ScrapeUnblocker getPageSource parsed_data API.
 *
 * Powered by ScrapeUnblocker: https://scrapeunblocker.com/?utm_source=github&utm_medium=integration&utm_campaign=example-repos
 *
 * @module airbnb-scraper
 */

export { AirbnbScraper } from "./scraper.js";
export {
  shapeItem,
  shapePage,
  parseRating,
  decodeListingId,
  discountPct,
  toNumber,
  pickCurrency,
} from "./shape.js";
export {
  searchUrl,
  roomUrl,
  isAirbnbUrl,
  withItemsOffset,
  readItemsOffset,
} from "./urls.js";
export { toCsv, COLUMNS } from "./csv.js";

export const VERSION = "1.0.0";
