import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { toPredicate } from "../run.js";
import { einsteinExpr, einsteinSolution } from "../testing/einstein.js";
import { exprArb } from "../testing/expr-arb.js";
import { zebraOneExpr, zebraOneSolution } from "../testing/zebra-1.js";
import { zebraTwoExpr, zebraTwoSolution } from "../testing/zebra-2.js";
import { zebraThreeExpr, zebraThreeSolution } from "../testing/zebra-3.js";

const cases = [
  ["zebra-1", zebraOneExpr, zebraOneSolution],
  ["zebra-2", zebraTwoExpr, zebraTwoSolution],
  ["zebra-3", zebraThreeExpr, zebraThreeSolution],
  ["einstein", einsteinExpr, einsteinSolution],
] as const;

describe("toPredicate", () => {
  it.each(cases)("returns true for %s solution", (_name, expr, solution) => {
    expect(toPredicate(expr as never)(solution as never)).toBe(true);
  });

  it.each(cases)("fast mode matches safe mode for %s", (_name, expr, solution) => {
    const fast = toPredicate(expr as never, { mode: "fast" })(solution as never);
    const safe = toPredicate(expr as never, { mode: "safe" })(solution as never);

    expect(fast).toBe(safe);
  });

  it("property: fast mode matches safe mode for any generated Expr", () => {
    fc.assert(
      fc.property(exprArb(), (expr) => {
        const fast = toPredicate(expr)({});
        const safe = toPredicate(expr, { mode: "safe" })({});

        expect(fast).toBe(safe);
      }),
      { numRuns: 500 },
    );
  });
});
