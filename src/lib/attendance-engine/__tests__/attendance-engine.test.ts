import assert from "node:assert/strict";
import { test } from "node:test";
import {
  countsFromRecords,
  evaluate,
  project,
  planLeave,
  classesToReach,
  statusEffect,
  type AttendanceRecordLike,
} from "../index";

const r = (status: AttendanceRecordLike["status"]): AttendanceRecordLike => ({ status });

test("no classes held shows no data instead of dividing by zero", () => {
  const result = evaluate({ attended: 0, total: 0 }, 75);
  assert.equal(result.pct, null);
  assert.equal(result.risk, "none");
  assert.equal(project({ attended: 0, total: 0 }, 75, 0, 0).pct, null);
});

test("cancelled and holiday classes never count in the denominator", () => {
  const counts = countsFromRecords([r("present"), r("absent"), r("cancelled"), r("holiday")]);
  assert.deepEqual(counts, { attended: 1, total: 2 });
  assert.equal(statusEffect("cancelled").countsInTotal, false);
  assert.equal(statusEffect("holiday").countsInTotal, false);
});

test("extra classes count as attended", () => {
  const counts = countsFromRecords([r("present"), r("extra"), r("absent")]);
  assert.deepEqual(counts, { attended: 2, total: 3 });
});

test("medical leave is configurable", () => {
  assert.deepEqual(countsFromRecords([r("medical")], { medicalCountsAttended: true }), {
    attended: 1,
    total: 1,
  });
  assert.deepEqual(countsFromRecords([r("medical")], { medicalCountsAttended: false }), {
    attended: 0,
    total: 0,
  });
});

test("exact minimum, below minimum and above minimum risk bands", () => {
  assert.equal(evaluate({ attended: 15, total: 20 }, 75).risk, "caution");
  assert.equal(evaluate({ attended: 14, total: 20 }, 75).risk, "danger");
  assert.equal(evaluate({ attended: 16, total: 20 }, 75).risk, "caution");
  assert.equal(evaluate({ attended: 19, total: 20 }, 75).risk, "safe");
  assert.equal(evaluate({ attended: 18, total: 20 }, 75).risk, "safe");
});

test("current percentage is deterministic", () => {
  assert.equal(evaluate({ attended: 17, total: 20 }, 75).pct, 85);
});

test("safe skips", () => {
  // 18/20 = 90%; each skip costs ~5%: can skip 4 to land on 18/24 = 75%
  assert.equal(evaluate({ attended: 18, total: 20 }, 75).safeSkips, 4);
  assert.equal(evaluate({ attended: 20, total: 20 }, 75).safeSkips, 6);
  assert.equal(evaluate({ attended: 10, total: 20 }, 75).safeSkips, 0);
});

test("recovery needed when below minimum", () => {
  // 10/20 = 50%; needs 22 more attended classes -> 32/42 = 76.1%
  assert.equal(evaluate({ attended: 10, total: 20 }, 75).recoveryNeeded, 20);
  assert.equal(evaluate({ attended: 18, total: 20 }, 75).recoveryNeeded, 0);
});

test("100% minimum makes recovery impossible but not broken", () => {
  const result = evaluate({ attended: 19, total: 20 }, 100);
  assert.equal(result.risk, "danger");
  assert.equal(result.recoveryImpossible, true);
  assert.equal(result.safeSkips, 0);
  assert.ok(Number.isFinite(result.pct as number));
});

test("what-if simulation skips and attends", () => {
  assert.equal(project({ attended: 18, total: 20 }, 75, 4, 0).pct, 75);
  assert.equal(project({ attended: 18, total: 20 }, 75, 0, 5).pct, 92);
  assert.equal(project({ attended: 10, total: 20 }, 75, 3, 0).meetsMinimum, false);
});

test("classes to reach target", () => {
  assert.equal(classesToReach({ attended: 14, total: 20 }, 75), 4);
  assert.equal(classesToReach({ attended: 20, total: 20 }, 75), 0);
});

test("leave planner is cumulative, not per class", () => {
  const plan = planLeave(
    { dbms: { attended: 18, total: 20 } },
    [
      { id: "2", subjectId: "dbms", date: "2026-01-06", startTime: "10:00" },
      { id: "1", subjectId: "dbms", date: "2026-01-05", startTime: "09:00" },
    ],
    75,
  );
  assert.equal(plan[0].total, 21);
  assert.equal(plan[1].total, 22);
  assert.equal(plan[1].projectedPct, (18 / 22) * 100);
  assert.equal(plan[0].verdict, "safe");
  assert.equal(plan[1].verdict, "safe");
});

test("leave planner flags do-not-skip classes", () => {
  const plan = planLeave(
    { os: { attended: 18, total: 22 } },
    [{ id: "a", subjectId: "os", date: "2026-01-05", startTime: "09:00" }],
    75,
  );
  assert.equal(plan[0].verdict, "risky");
  const worse = planLeave(
    { os: { attended: 10, total: 20 } },
    [{ id: "a", subjectId: "os", date: "2026-01-05", startTime: "09:00" }],
    75,
  );
  assert.equal(worse[0].verdict, "dont_skip");
});
