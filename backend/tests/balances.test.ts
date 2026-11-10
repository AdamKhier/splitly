import { test } from "node:test";
import assert from "node:assert/strict";
import { computeBalances } from "../src/engine/balances.ts";
import { simplifyDebts } from "../src/engine/simplify.ts";

const byId = (arr: { participantId: string }[]) =>
  arr
    .map((x) => x.participantId)
    .sort()
    .join(",");

test("simple two-person balances", () => {
  const r = computeBalances(
    [{ id: "e1", paidBy: "a", totalMinor: 3000, shares: { a: 1500, b: 1500 } }],
    [],
    { simplify: true },
  );
  const map = Object.fromEntries(r.individual.map((i) => [i.participantId, i.netMinor]));
  assert.equal(map.a, 1500);
  assert.equal(map.b, -1500);
  assert.deepEqual(r.flows, [{ from: "b", to: "a", amountMinor: 1500 }]);
});

test("three-way with one payer and settlements", () => {
  const expenses = [
    { id: "e1", paidBy: "a", totalMinor: 3000, shares: { a: 1000, b: 1000, c: 1000 } },
    { id: "e2", paidBy: "b", totalMinor: 6000, shares: { a: 2000, b: 2000, c: 2000 } },
  ];
  const settlements = [{ from: "c", to: "b", amountMinor: 2000 }];

  const simplified = computeBalances(expenses, settlements, { simplify: true });
  const net = Object.fromEntries(simplified.individual.map((i) => [i.participantId, i.netMinor]));
  assert.equal(net.a, 0);
  assert.equal(net.b, 1000);
  assert.equal(net.c, -1000);
  assert.deepEqual(simplified.flows, [{ from: "c", to: "b", amountMinor: 1000 }]);
  assert.equal(byId(simplified.individual), "a,b,c");

  const itemized = computeBalances(expenses, settlements, { simplify: false });
  const flows = itemized.flows.map((f) => `${f.from}>${f.to}:${f.amountMinor}`).sort();
  assert.deepEqual(flows, ["a>b:2000", "b>a:1000", "c>a:1000", "c>b:2000"]);
});

test("settler is not included when nobody moved money", () => {
  const r = computeBalances([], [], { simplify: true });
  assert.deepEqual(r.individual, []);
  assert.deepEqual(r.flows, []);
});

test("settlements adjust both parties", () => {
  const settlements = [{ from: "b", to: "a", amountMinor: 500 }];
  const r = computeBalances(
    [{ id: "e1", paidBy: "a", totalMinor: 1000, shares: { a: 500, b: 500 } }],
    settlements,
    { simplify: true },
  );
  const net = Object.fromEntries(r.individual.map((i) => [i.participantId, i.netMinor]));
  assert.equal(net.a, 0);
  assert.equal(net.b, 0);
  assert.deepEqual(r.flows, []);
});

test("simplify: two-way matches are obvious", () => {
  const flows = simplifyDebts({ a: 1000, b: -600, c: -400 });
  flows.sort((x, y) => x.from.localeCompare(y.from));
  assert.deepEqual(flows, [
    { from: "b", to: "a", amountMinor: 600 },
    { from: "c", to: "a", amountMinor: 400 },
  ]);
});

test("simplify: disconnected groups stay independent (2 transfers, not 3)", () => {
  const flows = simplifyDebts({ a: 500, b: -500, c: 500, d: -500 });
  assert.equal(flows.length, 2);
  const total = flows.reduce((s, f) => s + f.amountMinor, 0);
  assert.equal(total, 1000);
});

test("simplify: whatever it returns, applying flows must zero every balance", () => {
  const balances: Record<string, number> = {
    a: 2304, b: -1198, c: 5600, d: -871, e: -2350, f: 100, g: -3585,
  };
  const total = Object.values(balances).reduce((s, v) => s + v, 0);
  assert.equal(total, 0);
  assert.equal(simplifyDebts(balances).length <= Object.keys(balances).length - 1, true);
  const result = { ...balances };
  for (const f of simplifyDebts(balances)) {
    result[f.from] = (result[f.from] ?? 0) + f.amountMinor;
    result[f.to] = (result[f.to] ?? 0) - f.amountMinor;
  }
  for (const v of Object.values(result)) assert.equal(v, 0);
});

test("simplify: large groups fall back to greedy but still valid", () => {
  const balances: Record<string, number> = {};
  for (let i = 0; i < 29; i++) balances[`p${i}`] = i % 2 === 0 ? 100 + i : -(100 + i);
  const sum = Object.values(balances).reduce((s, v) => s + v, 0);
  balances.p29 = -sum; // make the group net exactly zero
  const total = Object.values(balances).reduce((s, v) => s + v, 0);
  assert.equal(total, 0);
  const flows = simplifyDebts(balances);
  const result = { ...balances };
  for (const f of flows) {
    result[f.from] = (result[f.from] ?? 0) + f.amountMinor;
    result[f.to] = (result[f.to] ?? 0) - f.amountMinor;
  }
  for (const v of Object.values(result)) assert.equal(v, 0);
});