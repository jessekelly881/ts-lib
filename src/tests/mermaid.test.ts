import { describe, expect, it } from "vitest";
import { toMermaid } from "../mermaid.js";
import { zebraOneExpr } from "../testing/zebra-1.js";
import { zebraTwoExpr } from "../testing/zebra-2.js";
import { zebraThreeExpr } from "../testing/zebra-3.js";

const cases = [
  ["zebra-1", zebraOneExpr, "./__snapshots__/zebra-1.mmd"],
  ["zebra-2", zebraTwoExpr, "./__snapshots__/zebra-2.mmd"],
  ["zebra-3", zebraThreeExpr, "./__snapshots__/zebra-3.mmd"],
] as const;

describe("toMermaid", () => {
  it.each(cases)("renders %s", async (_name, expr, snapshotPath) => {
    await expect(toMermaid(expr)).toMatchFileSnapshot(snapshotPath);
  });
});
