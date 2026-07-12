import { describe, expect, it } from "vitest";
import { toPredicate } from "../run.js";
import { einsteinExpr, einsteinSolution } from "../testing/einstein.js";
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
});
