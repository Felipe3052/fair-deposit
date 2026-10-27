import { test } from "node:test";
import assert from "node:assert/strict";
import { ageFromInstalledYear, computeShareLine, computeShares, type Lifespan, type ShareInput } from "./fair-share.ts";

const lifespans: Lifespan[] = [
  { component: "carpet", years: 10, label: "Carpet" },
  { component: "wall_paint", years: 8, label: "Wall paint" },
];

const base: ShareInput = {
  claimId: "c1",
  claimDescription: "Replace carpet",
  claimedAmount: 1000,
  component: "carpet",
  findingClassifications: ["damage"],
  findingIds: ["f1"],
  ageYears: 6,
};

test("Schaden: Restwert-Anteil der Forderung (Beispiel Mieterverband: 6 von 10 Jahren → 40%)", () => {
  const line = computeShareLine(base, lifespans);
  assert.equal(line.status, "damage");
  assert.equal(line.residualShare, 0.4);
  assert.equal(line.tenantPays, 400);
});

test("Lebensdauer abgelaufen → nichts geschuldet", () => {
  const line = computeShareLine({ ...base, ageYears: 12 }, lifespans);
  assert.equal(line.residualShare, 0);
  assert.equal(line.tenantPays, 0);
});

test("nur normale Abnutzung → 0", () => {
  const line = computeShareLine({ ...base, findingClassifications: ["normal_wear"] }, lifespans);
  assert.equal(line.status, "normal_wear");
  assert.equal(line.tenantPays, 0);
});

test("Forderung ohne Befund → no_evidence, nicht berechnet", () => {
  const line = computeShareLine({ ...base, findingIds: [], findingClassifications: [] }, lifespans);
  assert.equal(line.status, "no_evidence");
  assert.equal(line.tenantPays, null);
});

test("Alter unbekannt / Bauteil unbekannt → offen", () => {
  assert.equal(computeShareLine({ ...base, ageYears: null }, lifespans).status, "age_unknown");
  assert.equal(computeShareLine({ ...base, component: "tiles" }, lifespans).status, "lifespan_unknown");
});

test("Summen und offene Positionen", () => {
  const { totals } = computeShares([
    base,
    { ...base, claimId: "c2", component: "wall_paint", claimedAmount: 600, ageYears: 2 },
    { ...base, claimId: "c3", claimedAmount: 200, ageYears: null },
    { ...base, claimId: "c4", claimedAmount: 300, findingIds: [], findingClassifications: [] },
  ], lifespans, "CHF");
  assert.equal(totals.claimed, 2100);
  assert.equal(totals.tenantPays, 400 + 450);
  assert.equal(totals.openLines, 1);
});

test("Variante vor Standardwert, Fallback auf Standard", () => {
  const withVariant: Lifespan[] = [...lifespans, { component: "carpet", variant: "needle_felt", years: 8, label: "Needle felt" }];
  assert.equal(computeShareLine({ ...base, variant: "needle_felt" }, withVariant).lifespanYears, 8);
  assert.equal(computeShareLine({ ...base, variant: "unknown" }, withVariant).lifespanYears, 10);
});

test("Alter aus Einbaujahr", () => {
  assert.equal(ageFromInstalledYear(2020, "2026-01-15"), 6);
  assert.equal(ageFromInstalledYear(2030, "2026-01-15"), 0);
});
