import assert from "node:assert/strict";
import { test } from "node:test";

import { COLUMNS, toCsv } from "../src/csv.js";

test("toCsv writes a header row and one row per record", () => {
  const csv = toCsv([
    { title: "Room in NYC", name: "Cozy room", price: 200, currency: "USD" },
  ]);
  const lines = csv.split("\n");
  assert.equal(lines[0], COLUMNS.join(","));
  assert.equal(lines.length, 2);
  assert.match(lines[1], /^Room in NYC,Cozy room,/);
});

test("toCsv quotes fields containing commas, quotes and newlines", () => {
  const csv = toCsv([{ title: 'Loft, "PRO"', name: "line1\nline2" }]);
  const row = csv.split("\n").slice(1).join("\n");
  assert.match(row, /"Loft, ""PRO"""/);
  assert.match(row, /"line1\nline2"/);
});

test("toCsv renders null and missing values as empty cells", () => {
  const csv = toCsv([{ title: "X", price: null }]);
  const row = csv.split("\n")[1];
  assert.equal(row.startsWith("X,"), true);
});
