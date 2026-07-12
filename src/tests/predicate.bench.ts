import { bench, describe } from "vitest";
import { toPredicate } from "../run.js";
import { zebraOneExpr, zebraOneSolution } from "../testing/zebra-1.js";
import { zebraTwoExpr, zebraTwoSolution } from "../testing/zebra-2.js";
import { zebraThreeExpr, zebraThreeSolution } from "../testing/zebra-3.js";
import { einsteinExpr, einsteinSolution } from "../testing/einstein.js";

const zebraOnePredicate = toPredicate(zebraOneExpr);
const zebraTwoPredicate = toPredicate(zebraTwoExpr);
const zebraThreePredicate = toPredicate(zebraThreeExpr);
const einsteinPredicate = toPredicate(einsteinExpr);

describe("toPredicate", () => {
  bench("zebra-1", () => {
    zebraOnePredicate(zebraOneSolution);
  });

  bench("zebra-2", () => {
    zebraTwoPredicate(zebraTwoSolution);
  });

  bench("zebra-3", () => {
    zebraThreePredicate(zebraThreeSolution);
  });

  bench("einstein", () => {
    einsteinPredicate(einsteinSolution);
  });
});
