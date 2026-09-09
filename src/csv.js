// Tiny dependency-free CSV serialiser for the clean listing records.

const COLUMNS = [
  "title",
  "name",
  "listingId",
  "rating",
  "reviews",
  "price",
  "originalPrice",
  "currency",
  "discountPct",
  "badge",
  "checkin",
  "checkout",
  "url",
  "image",
];

/**
 * Quote a single CSV field per RFC 4180 (double up embedded quotes, wrap in
 * quotes when the value contains a comma, quote, or newline).
 * @param {unknown} value
 * @returns {string}
 */
function quote(value) {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * Serialise clean listing records to a CSV string with a fixed header.
 * @param {object[]} records
 * @param {string[]} [columns]
 * @returns {string}
 */
export function toCsv(records, columns = COLUMNS) {
  const lines = [columns.join(",")];
  for (const record of records) {
    lines.push(columns.map((col) => quote(record?.[col])).join(","));
  }
  return lines.join("\n");
}

export { COLUMNS };
