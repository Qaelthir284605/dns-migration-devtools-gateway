import test from "node:test";
import assert from "node:assert/strict";
import { chooseCutover } from "./migration_entry.ts";

test("a TXT verification record makes the migration ready for cutover", () => {
  assert.equal(
    chooseCutover([{ record_type: "TXT", name: "_migration", content: "devtools-gateway" }], "_migration", "devtools-gateway"),
    "ready"
  );
  assert.equal(
    chooseCutover([{ record_type: "TXT", name: "_migration", content: "other-content" }], "_migration", "devtools-gateway"),
    "review"
  );
  assert.equal(
    chooseCutover([{ record_type: "A", name: "www", content: "192.0.2.1" }], "_migration", "devtools-gateway"),
    "review"
  );
});
