import assert from "node:assert/strict";
import { test } from "node:test";
import { createTranslator, dictionaries } from "../dictionaries";
import { designEn, designHi } from "../design";

test("design strings have matching English and Hindi keys",() => {
  assert.deepEqual(Object.keys(designEn).sort(),Object.keys(designHi).sort());
  assert.deepEqual(Object.keys(dictionaries.en).sort(),Object.keys(dictionaries.hi).sort());
});

test("cinematic copy and accessible navigation are translated",() => {
  const en = createTranslator("en");
  const hi = createTranslator("hi");
  assert.equal(en("design.heroLine1"),"BE PRESENT.");
  assert.equal(hi("design.heroLine1"),"आज उपस्थित।");
  assert.equal(en("design.langSwitch"),"Switch language");
  assert.equal(hi("design.langSwitch"),"भाषा बदलें");
});

test("design sample interpolations still use the shared translator",() => {
  const t = createTranslator("en");
  assert.equal(t("home.safeSkips",{ count: 6 }),"6 safe skips");
  assert.equal(t("attendance.threshold",{ pct: 75 }),"Threshold 75%");
});
