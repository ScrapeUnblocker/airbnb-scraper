import assert from "node:assert/strict";
import { test } from "node:test";

import { parseCliArgs, render } from "../bin/cli.js";

test("parseCliArgs reads a positional location and defaults", () => {
  const { location, values, help } = parseCliArgs(["San Francisco, CA"]);
  assert.equal(location, "San Francisco, CA");
  assert.equal(values.pages, "1");
  assert.equal(values.country, "US");
  assert.equal(values.format, "json");
  assert.equal(help, false);
});

test("parseCliArgs reads flags", () => {
  const { values } = parseCliArgs([
    "Paris",
    "--checkin",
    "2026-10-01",
    "--checkout",
    "2026-10-05",
    "--adults",
    "2",
    "--pages",
    "3",
    "--format",
    "csv",
    "--pretty",
  ]);
  assert.equal(values.checkin, "2026-10-01");
  assert.equal(values.checkout, "2026-10-05");
  assert.equal(values.adults, "2");
  assert.equal(values.pages, "3");
  assert.equal(values.format, "csv");
  assert.equal(values.pretty, true);
});

test("parseCliArgs supports -h", () => {
  assert.equal(parseCliArgs(["-h"]).help, true);
});

const RECORDS = [{ title: "Room in NYC", name: "Cozy room", price: 200, currency: "USD" }];

test("render emits compact JSON by default", () => {
  const out = render(RECORDS, { format: "json", pretty: false });
  assert.equal(out, JSON.stringify(RECORDS));
});

test("render emits pretty JSON when asked", () => {
  const out = render(RECORDS, { format: "json", pretty: true });
  assert.match(out, /\n {4}"title": "Room in NYC"/);
});

test("render emits CSV", () => {
  const out = render(RECORDS, { format: "csv", pretty: false });
  assert.match(out.split("\n")[0], /^title,name,listingId,/);
});

test("render rejects an unknown format", () => {
  assert.throws(() => render(RECORDS, { format: "xml" }), /unknown --format/);
});
