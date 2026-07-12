import { bench, describe } from "vitest";
import { toPredicate } from "../run.js";
import { einsteinExpr, einsteinSolution } from "../testing/einstein.js";
import { zebraOneExpr, zebraOneSolution } from "../testing/zebra-1.js";
import { zebraTwoExpr, zebraTwoSolution } from "../testing/zebra-2.js";
import { zebraThreeExpr, zebraThreeSolution } from "../testing/zebra-3.js";

type BenchCase = {
  readonly name: string;
  readonly fast: (env: never) => boolean;
  readonly safe: (env: never) => boolean;
  readonly solution: never;
};

const cases: readonly BenchCase[] = [
  {
    name: "zebra-1",
    fast: toPredicate(zebraOneExpr, { mode: "fast" }) as (env: never) => boolean,
    safe: toPredicate(zebraOneExpr, { mode: "safe" }) as (env: never) => boolean,
    solution: zebraOneSolution as never,
  },
  {
    name: "zebra-2",
    fast: toPredicate(zebraTwoExpr, { mode: "fast" }) as (env: never) => boolean,
    safe: toPredicate(zebraTwoExpr, { mode: "safe" }) as (env: never) => boolean,
    solution: zebraTwoSolution as never,
  },
  {
    name: "zebra-3",
    fast: toPredicate(zebraThreeExpr, { mode: "fast" }) as (env: never) => boolean,
    safe: toPredicate(zebraThreeExpr, { mode: "safe" }) as (env: never) => boolean,
    solution: zebraThreeSolution as never,
  },
  {
    name: "einstein",
    fast: toPredicate(einsteinExpr, { mode: "fast" }) as (env: never) => boolean,
    safe: toPredicate(einsteinExpr, { mode: "safe" }) as (env: never) => boolean,
    solution: einsteinSolution as never,
  },
];

describe("toPredicate", () => {
  for (const { name, fast, safe, solution } of cases) {
    bench(`${name} (fast)`, () => {
      fast(solution);
    });

    bench(`${name} (safe)`, () => {
      safe(solution);
    });
  }
});
