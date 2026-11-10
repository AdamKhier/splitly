import { test } from "node:test";
import assert from "node:assert/strict";
import { split, splitEqual, splitExact, splitPercentage } from "../src/engine/split.ts";

test("equal split divides cleanly", () => {
  assert.deepEqual(splitEqual(1000, 4), [250, 250, 250, 250]);
  assert.deepEqual(splitEqual(0, 3), [0, 0, 0]);
  assert.deepEqual(splitEqual(500, 1), [500]);
});

test("equal split handles uneven remainder deterministically", () => {
  assert.deepEqual(splitEqual(1000, 3), [334, 333, 333]);
  assert.deepEqual(splitEqual(1000, 3), [334, 333, 333]);
  assert.deepEqual(splitEqual(7, 2), [4, 3]);
  assert.deepEqual(splitEqual(10, 6), [2, 2, 2, 2, 1, 1]);
});

test("equal split rejects invalid input", () => {
  assert.throws(() => splitEqual(100.5, 2), /integer/);
  assert.throws(() => splitEqual(100, 0), /positive/);
  assert.throws(() => splitEqual(-50, 2), /negative/);
});

test("exact split validates sum", () => {
  assert.deepEqual(splitExact(1000, [400, 400, 200]), [400, 400, 200]);
  assert.throws(() => splitExact(1000, [400, 400]), /sum to 800/);
  assert.throws(() => splitExact(1000, [1000, 1000]), /sum to 2000/);
  assert.throws(() => splitExact(1000, [-100, 1100]), /non-negative/);
});

test("percentage split keeps cents whole and total exact", () => {
  const shares = splitPercentage(10000, [50, 50]);
  assert.deepEqual(shares, [5000, 5000]);

  const thirds = splitPercentage(1000, [33.33, 33.33, 33.34]);
  assert.deepEqual(thirds, [333, 333, 334]);
  assert.equal(thirds.reduce((a, b) => a + b, 0), 1000);

  const tiny = splitPercentage(5, [33.33, 66.67]);
  assert.equal(tiny.reduce((a, b) => a + b, 0), 5);

  const noCents = splitPercentage(300, [50, 50]);
  assert.deepEqual(noCents, [150, 150]);
});

test("percentage split rejects out-of-range totals", () => {
  assert.throws(() => splitPercentage(1000, [50, 49]), /100%/);
  assert.throws(() => splitPercentage(1000, [100.01, 0]), /100%/);
  assert.throws(() => splitPercentage(1000, [-1, 101]), /non-negative/);
});

test("dispatch helper routes by type", () => {
  assert.deepEqual(split("equal", 1000, { count: 3 }), [334, 333, 333]);
  assert.deepEqual(split("exact", 1000, { exactShares: [700, 300] }), [700, 300]);
  assert.deepEqual(split("percentage", 1000, { percentages: [33.33, 66.67] }), [333, 667]);
});