import { bench, describe } from "vitest";
import { toPredicate } from "../run.js";
import { zebraOneExpr, zebraOneSolution } from "../testing/zebra-1.js";

const predicate = toPredicate(zebraOneExpr);

describe("zebra-1 toPredicate", () => {
  bench("evaluate solution", () => {
    predicate(zebraOneSolution);
  });
});
