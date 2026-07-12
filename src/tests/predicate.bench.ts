import { bench, describe } from "vitest";
import { toPredicate } from "../run.js";
import { einsteinExpr, einsteinSolution } from "../testing/einstein.js";
import { zebraOneExpr, zebraOneSolution } from "../testing/zebra-1.js";
import { zebraTwoExpr, zebraTwoSolution } from "../testing/zebra-2.js";
import { zebraThreeExpr, zebraThreeSolution } from "../testing/zebra-3.js";

type BenchCase = {
  readonly name: string;
  readonly predicate: (env: never) => boolean;
  readonly solution: never;
};

const cases: readonly BenchCase[] = [
  {
    name: "zebra-1",
    predicate: toPredicate(zebraOneExpr) as (env: never) => boolean,
    solution: zebraOneSolution as never,
  },
  {
    name: "zebra-2",
    predicate: toPredicate(zebraTwoExpr) as (env: never) => boolean,
    solution: zebraTwoSolution as never,
  },
  {
    name: "zebra-3",
    predicate: toPredicate(zebraThreeExpr) as (env: never) => boolean,
    solution: zebraThreeSolution as never,
  },
  {
    name: "einstein",
    predicate: toPredicate(einsteinExpr) as (env: never) => boolean,
    solution: einsteinSolution as never,
  },
];

describe("toPredicate", () => {
  for (const { name, predicate, solution } of cases) {
    bench(name, () => {
      predicate(solution);
    });
  }
});
