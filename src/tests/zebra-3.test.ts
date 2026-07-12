import { expect, it } from "vitest";
import { createZ3Compiler, z3Sorts } from "../z3.js";
import { Houses, zebraThreeExpr } from "../testing/zebra-3.js";

it("zebra-3", async () => {
  const z3 = await createZ3Compiler(z3Sorts({ houses: Houses }));

  await expect(z3.findExample(zebraThreeExpr)).resolves.toMatchInlineSnapshot(`
    {
      "env": {
        "houses": {
          "0": {
            "animal": "Horses",
            "color": "Blue",
            "nationality": "British",
            "sport": "Swimming",
          },
          "1": {
            "animal": "Dolphins",
            "color": "Black",
            "nationality": "American",
            "sport": "Handball",
          },
          "2": {
            "animal": "Turtles",
            "color": "Red",
            "nationality": "Canadian",
            "sport": "Tennis",
          },
          "3": {
            "animal": "Butterflies",
            "color": "White",
            "nationality": "Irish",
            "sport": "Bowling",
          },
        },
      },
      "status": "sat",
    }
  `);
});
