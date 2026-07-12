import { describe, expect, it } from "vitest";
import { toMermaid } from "../mermaid.js";
import { zebraOneExpr } from "../testing/zebra-1.js";
import { zebraTwoExpr } from "../testing/zebra-2.js";
import { zebraThreeExpr } from "../testing/zebra-3.js";

const cases = [
  ["zebra-1", zebraOneExpr, "zebra-1"],
  ["zebra-2", zebraTwoExpr, "zebra-2"],
  ["zebra-3", zebraThreeExpr, "zebra-3"],
] as const;

describe("toMermaid", () => {
  it.each(cases)("renders %s flowchart", async (_name, expr, fileName) => {
    await expect(toMermaid(expr)).toMatchFileSnapshot(`./__snapshots__/${fileName}.mmd`);
  });

  it.each(cases)("renders %s mindmap", async (_name, expr, fileName) => {
    await expect(toMermaid(expr, { chart: "mindmap" })).toMatchFileSnapshot(
      `./__snapshots__/${fileName}.mindmap.mmd`,
    );
  });
});
